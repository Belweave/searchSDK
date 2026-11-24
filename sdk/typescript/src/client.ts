// Orchestration: provider chain, retries, deadlines and fallback around the engine.
import { buildRequest, getPath, mapContents, mapSearch, type Kind } from "./engine.ts";
import { SearchError, type SearchErrorDetails } from "./errors.ts";
import { providers } from "./generated/registry.ts";
import {
  backoffMs, callSettings, checkOptionKeys, fallsBack, isTransient, maxRetryAfterMs, normalizeSearch, normalizeUrls,
  providerChain, retryAfterMs, statusCode, type NormalizedSearch,
} from "./policy.ts";
import { send, sleep, systemClock } from "./transport.ts";
import type {
  Attempt, Client, ClientConfig, ContentsOptions, ContentsResponse, ProviderId,
  SearchOptions, SearchResponse, Warning,
} from "./types.ts";

function readEnv(name: string, env: ClientConfig["env"]): string | undefined {
  if (env) return env[name];
  try {
    const v = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.[name];
    if (typeof v === "string") return v;
  } catch {}
  try {
    const v = (globalThis as { Deno?: { env?: { get(n: string): string | undefined } } }).Deno?.env?.get(name);
    if (typeof v === "string") return v;
  } catch {}
  return undefined;
}

function resolveKey(id: ProviderId, config: ClientConfig): string {
  let key = config.keys?.[id];
  if (key === undefined) for (const name of providers[id].auth.env) if ((key = readEnv(name, config.env)) !== undefined && key !== "") break;
  if (typeof key !== "string" || !/^[\x21-\x7e]{1,512}$/.test(key)) throw new SearchError("configuration", { provider: id, field: "keys" });
  return key;
}

export function createClient(config: ClientConfig = {}): Client {
  const cfg: ClientConfig = config.keys ? { ...config, keys: { ...config.keys } } : { ...config };
  const clock = cfg.clock ?? systemClock;
  const random = cfg.random ?? Math.random;

  async function call(kind: Kind, input: Record<string, unknown>, options: Record<string, unknown>): Promise<SearchResponse | ContentsResponse> {
    const t0 = clock.now();
    const settings = callSettings(kind, options, cfg as Record<string, unknown>);
    const chain = providerChain(options, cfg as Record<string, unknown>);
    const keys = new Map(chain.map((id) => [id, resolveKey(id, cfg)] as const));
    const signal = options.signal as AbortSignal | undefined;
    const providerOptions = options.providerOptions as Record<string, unknown> | undefined;
    if (providerOptions !== undefined && (providerOptions === null || typeof providerOptions !== "object" || !Object.keys(providerOptions).every((k) => k in providers))) {
      throw new SearchError("configuration", { field: "providerOptions" });
    }
    const deadline = t0 + settings.timeoutMs;
    const attempts: Attempt[] = [];
    const fail = (e: SearchError): never => { e.attempts = attempts; throw e; };
    let last: SearchError | null = null;

    for (const provider of chain) {
      if (signal?.aborted) fail(new SearchError("aborted", { provider }));
      let req;
      try {
        if (!providers[provider][kind]) throw new SearchError("unsupported", { provider, field: kind });
        req = buildRequest(provider, kind, input, providerOptions?.[provider], keys.get(provider)!, { now: clock.now() });
      } catch (e) {
        if (!(e instanceof SearchError)) throw e;
        if (e.code !== "unsupported") fail(e);
        attempts.push({ provider, outcome: "skipped", code: "unsupported", startMs: clock.now() - t0, durationMs: 0 });
        last = e;
        continue;
      }
      for (let retry = 0; ; retry++) {
        const start = clock.now();
        if (start >= deadline) fail(new SearchError("timeout", { provider }));
        const attempt: Attempt = { provider, outcome: "error", startMs: start - t0, durationMs: 0 };
        attempts.push(attempt);
        let err: SearchError;
        let replied = false;
        try {
          const reply = await send(cfg.fetch ?? globalThis.fetch, req, {
            provider, clock, callDeadline: deadline, attemptDeadline: start + settings.attemptTimeoutMs, signal, maxBytes: settings.maxResponseBytes,
          });
          attempt.durationMs = clock.now() - start;
          attempt.status = reply.status;
          if (reply.status >= 200 && reply.status < 300) {
            replied = true;
            const ctx = { now: clock.now() };
            const mapped = kind === "search"
              ? mapSearch(provider, input as unknown as NormalizedSearch, reply.body, reply.headers, ctx)
              : mapContents(provider, input.urls as string[], reply.body, reply.headers, ctx);
            const warnings: Warning[] = provider === chain[0] ? mapped.warnings : [{ code: "fallback_used", provider }, ...mapped.warnings];
            attempt.outcome = "ok";
            const base = { provider, cost: mapped.cost, requestId: mapped.requestId, latencyMs: clock.now() - t0, warnings, attempts, raw: reply.body };
            return kind === "search" ? { ...base, results: mapped.items } as SearchResponse : { ...base, pages: mapped.items } as ContentsResponse;
          }
          const code = statusCode(provider, reply.status, reply.body);
          const details: SearchErrorDetails = { provider, status: reply.status };
          const pc = providers[provider].errorCodePath ? getPath(reply.body, providers[provider].errorCodePath!) : undefined;
          if (typeof pc === "string") details.providerCode = pc;
          const ra = retryAfterMs(reply.headers.get("retry-after"), clock.now());
          if (ra !== null) { details.retryAfterMs = ra; attempt.retryAfterMs = ra; }
          err = new SearchError(code, details);
        } catch (e) {
          if (!(e instanceof SearchError)) throw e;
          err = e;
          if (e.status !== undefined) attempt.status = e.status;
          if (replied) { attempt.code = e.code; fail(e); } // mapping failed after a paid reply: never resend
          attempt.durationMs = clock.now() - start;
        }
        attempt.code = err.code;
        last = err;
        if (err.code === "aborted" || err.code === "timeout") fail(err);
        if (!isTransient(err.code) || retry >= settings.maxRetries) break;
        if ((err.retryAfterMs ?? 0) > maxRetryAfterMs) break;
        const delay = backoffMs(retry, random(), err.retryAfterMs ?? null);
        if (clock.now() + delay >= deadline) break;
        try { await sleep(delay, clock, signal); } catch (e) { fail(e as SearchError); }
      }
      if (!fallsBack(last!.code)) fail(last!);
    }
    return fail(last ?? new SearchError("unsupported"));
  }

  return {
    search(query, options: SearchOptions = {}) {
      return (async () => {
        const o = options as Record<string, unknown>;
        const input = normalizeSearch(query, o) as unknown as Record<string, unknown>;
        return call("search", input, o) as Promise<SearchResponse>;
      })();
    },
    contents(urls, options: ContentsOptions = {}) {
      return (async () => {
        const o = options as Record<string, unknown>;
        checkOptionKeys("contents", o);
        return call("contents", { urls: normalizeUrls(urls) }, o) as Promise<ContentsResponse>;
      })();
    },
  };
}

