// Orchestration: provider chain, keys, retries, deadlines, fallback and
// per-attempt billing around the engine.
import { attemptCost, buildRequest, mapContents, mapSearch, type Kind } from "./engine.ts";
import { SearchError, type SearchErrorDetails } from "./errors.ts";
import { policy } from "./generated/registry.ts";
import { getPath } from "./json.ts";
import {
  backoffMs, callSettings, checkOptionKeys, fallsBack, isTransient, maxRetryAfterMs, normalizeSearch, normalizeUrls,
  providerChain, retryAfterMs, statusCode, type NormalizedSearch,
} from "./policy.ts";
import { builtInRegistry, loadRegistry, type Registry } from "./registry.ts";
import { send, sleep, systemClock } from "./transport.ts";
import type {
  Attempt, Billed, Client, ClientConfig, ContentsOptions, ContentsResponse, Cost, ErrorCode, ProviderId,
  SearchOptions, SearchResponse, Warning,
} from "./types.ts";

const own = (o: object, k: string) => Object.prototype.hasOwnProperty.call(o, k);
const NOT_SENT: Cost = { usd: 0, estimated: false, source: "none" };
const REJECTED: Cost = { usd: 0, estimated: true, source: "none" };

function readEnv(name: string, env: ClientConfig["env"]): string | undefined {
  if (env) return own(env, name) ? env[name] : undefined;
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

/** The provider's key from config or its documented environment variables, or null when there is no usable key. */
function findKey(registry: Registry, id: ProviderId, config: ClientConfig): string | null {
  const keys = config.keys as Record<string, string | undefined> | undefined;
  let key = keys && own(keys, id) ? keys[id] : undefined;
  if (key === undefined) for (const name of registry[id]!.auth.env) if ((key = readEnv(name, config.env)) !== undefined && key !== "") break;
  return typeof key === "string" && /^[\x21-\x7e]{1,512}$/.test(key) ? key : null;
}

/** policy.billing: a status decides; with no status, the code says whether the request may have been billed. */
function billedFor(status: number | undefined, code: ErrorCode): Billed {
  const b = policy.billing;
  if (status !== undefined) return (status >= 200 && status < 300 ? b.success : b.errorStatus) as Billed;
  return (b.possible as readonly string[]).includes(code) ? "possible" : (b.notSent as Billed);
}

/**
 * A client for the built-in registry, or for `config.registry`, whose keys then
 * become the accepted provider ids (inferred, so custom ids need no casts).
 */
export function createClient<Id extends string = ProviderId>(config: ClientConfig<Id> = {}): Client<Id> {
  return create(config as unknown as ClientConfig) as unknown as Client<Id>;
}

function create(config: ClientConfig): Client {
  const registry = config.registry === undefined ? builtInRegistry : loadRegistry(config.registry);
  const cfg: ClientConfig = config.keys ? { ...config, keys: { ...config.keys } } : { ...config };
  delete cfg.registry;
  const clock = cfg.clock ?? systemClock;
  const random = cfg.random ?? Math.random;

  async function call(kind: Kind, input: Record<string, unknown>, options: Record<string, unknown>): Promise<SearchResponse | ContentsResponse> {
    const t0 = clock.now();
    const settings = callSettings(kind, options, cfg as Record<string, unknown>);
    const chain = providerChain(registry, options, cfg as Record<string, unknown>);
    const providerOptions = options.providerOptions as Record<string, unknown> | undefined;
    if (providerOptions !== undefined && (providerOptions === null || typeof providerOptions !== "object" || Array.isArray(providerOptions)
      || !Object.keys(providerOptions).every((k) => own(registry, k)))) {
      throw new SearchError("configuration", { field: "providerOptions" });
    }
    const keys = new Map(chain.map((id) => [id, findKey(registry, id, cfg)] as const));
    if (keys.get(chain[0]!) === null) throw new SearchError("configuration", { provider: chain[0]!, field: "keys" });
    const keyWarnings: Warning[] = chain.slice(1).filter((id) => keys.get(id) === null).map((provider) => ({ code: "fallback_key_missing", provider }));
    const { signal } = settings;
    const deadline = t0 + settings.timeoutMs;
    const attempts: Attempt[] = [];
    const fail = (e: SearchError): never => { e.attempts = attempts; throw e; };
    let lastSent: SearchError | null = null;
    let lastSkip: SearchError | null = null;
    const skip = (provider: ProviderId, e: SearchError) => {
      attempts.push({ provider, outcome: "skipped", code: e.code, startMs: clock.now() - t0, durationMs: 0, billed: "no", cost: NOT_SENT });
      lastSkip = e;
    };

    for (const provider of chain) {
      if (signal?.aborted) fail(new SearchError("aborted", { provider }));
      const spec = registry[provider]!;
      const key = keys.get(provider)!;
      if (key === null) { skip(provider, new SearchError("configuration", { provider, field: "keys" })); continue; }
      const po = providerOptions && own(providerOptions, provider) ? providerOptions[provider] : undefined;
      let req;
      try {
        if (!spec[kind]) throw new SearchError("unsupported", { provider, field: kind });
        req = buildRequest(spec, kind, input, po, key, { now: clock.now() });
      } catch (e) {
        if (!(e instanceof SearchError)) throw e;
        if (e.code !== "unsupported") fail(e);
        skip(provider, e);
        continue;
      }
      for (let retry = 0; ; retry++) {
        const start = clock.now();
        if (start >= deadline) fail(new SearchError("timeout", { provider }));
        const attempt: Attempt = { provider, outcome: "error", startMs: start - t0, durationMs: 0, billed: "no", cost: NOT_SENT };
        attempts.push(attempt);
        let err: SearchError;
        let body: unknown;
        try {
          const reply = await send(cfg.fetch ?? globalThis.fetch, req, {
            provider, clock, callDeadline: deadline, attemptDeadline: start + settings.attemptTimeoutMs, signal, maxBytes: settings.maxResponseBytes,
          });
          attempt.durationMs = clock.now() - start;
          attempt.status = reply.status;
          body = reply.body;
          if (reply.status >= 200 && reply.status < 300) {
            const ctx = { now: clock.now(), options: po };
            let mapped;
            try {
              mapped = kind === "search"
                ? mapSearch(spec, input as unknown as NormalizedSearch, reply.body, reply.headers, ctx)
                : mapContents(spec, input.urls as string[], reply.body, reply.headers, ctx);
            } catch {
              // A paid reply that cannot be mapped is never resent; the body is kept for the caller.
              throw new SearchError("invalid_response", { provider, status: reply.status, raw: reply.body });
            }
            attempt.outcome = "ok";
            attempt.billed = billedFor(reply.status, "invalid_response");
            attempt.cost = mapped.cost;
            const warnings: Warning[] = [...(provider === chain[0] ? [] : [{ code: "fallback_used", provider }]), ...keyWarnings, ...mapped.warnings];
            const base = { provider, cost: mapped.cost, requestId: mapped.requestId, latencyMs: clock.now() - t0, warnings, attempts, raw: reply.body };
            return kind === "search" ? { ...base, results: mapped.items } as SearchResponse : { ...base, pages: mapped.items } as ContentsResponse;
          }
          const code = statusCode(registry, provider, reply.status, reply.body);
          const details: SearchErrorDetails = { provider, status: reply.status };
          const pc = spec.errorCodePath ? getPath(reply.body, spec.errorCodePath) : undefined;
          if (typeof pc === "string") details.providerCode = pc;
          const ra = retryAfterMs(reply.headers.get("retry-after"), clock.now());
          if (ra !== null) { details.retryAfterMs = ra; attempt.retryAfterMs = ra; }
          err = new SearchError(code, details);
        } catch (e) {
          if (!(e instanceof SearchError)) throw e;
          err = e;
          if (e.status !== undefined) attempt.status = e.status;
          if (e.raw !== undefined) body = e.raw;
          attempt.durationMs = clock.now() - start;
        }
        attempt.code = err.code;
        attempt.billed = billedFor(attempt.status, err.code);
        attempt.cost = attempt.billed === "no" ? REJECTED : attemptCost(spec, kind, input, body, po);
        lastSent = err;
        if (err.code === "aborted" || err.code === "timeout") fail(err);
        if (!isTransient(err.code) || retry >= settings.maxRetries) break;
        if ((err.retryAfterMs ?? 0) > maxRetryAfterMs) break;
        const delay = backoffMs(retry, random(), err.retryAfterMs ?? null);
        if (clock.now() + delay >= deadline) break;
        try { await sleep(delay, clock, signal); } catch (e) { fail(e as SearchError); }
      }
      if (!fallsBack(lastSent!.code)) fail(lastSent!);
    }
    return fail(lastSent ?? lastSkip ?? new SearchError("unsupported"));
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
