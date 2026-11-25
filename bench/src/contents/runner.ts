// Runs the contents track (METHOD-contents.md, Conditions). For each pass, the
// URLs go in a seeded order; for each URL the harness first probes the page
// itself (robots.txt obeyed), then every provider's default contents call for
// that URL is dispatched together, in a seeded provider order, each under its
// own pacer. Every call reserves its worst case in the shared ledger first.
// Records hold no page text; text lives under raw/ only.
import { performance } from "node:perf_hooks";
import { join } from "node:path";
import { textHasAnswer } from "../dataset/match.ts";
import { Budget } from "../run/budget.ts";
import { emptyDetail, withCapture } from "../run/capture.ts";
import type { Connectivity } from "../run/connectivity.ts";
import { paceFor, Pacer, realTimer, type RateLimit, type Timer } from "../run/pacer.ts";
import { attemptsCredits } from "../run/pricing.ts";
import { attemptsCost, OUTCOME_BY_CODE, pool } from "../run/runner.ts";
import type { Outcome } from "../run/records.ts";
import { SearchError, type Attempt, type Client, type ContentsResponse, type ProviderSpec } from "../sdk.ts";
import type { PageFetcher } from "../session.ts";
import { appendJsonl, readJsonl, rng, seedOf, sha256, shuffle, writeJson } from "../util/core.ts";
import { keyOf } from "./build.ts";
import type { ContentsConfig, ContentsMethod, ContentsUrl } from "./config.ts";
import { urlReservation } from "./plan.ts";

/** A contents call's outcome: the search taxonomy plus `page_failed` (a 2xx in which the provider reports the page failed). */
export type ContentsOutcome = Outcome | "page_failed";
export const CONTENTS_SCORED: readonly ContentsOutcome[] = ["ok_nonempty", "ok_empty", "page_failed", "rate_limited", "timeout", "server_error", "network_error", "invalid_response"];
const RETRIED: readonly ContentsOutcome[] = ["aborted", "local_network"];

export interface ContentsAttempt {
  key: string;
  pass: number;
  urlId: string;
  provider: string;
  startedAt: string;
  outcome: ContentsOutcome;
  code?: string;
  status?: number;
  durationMs: number;
  billed: string;
  costUsd: number | null;
  costSource: string;
  reservedUsd: number;
  credits?: number | null;
  /** The provider's page error code when it reported the page failed. */
  pageError?: string | null;
  contentChars: number;
  contentSha256: string | null;
  /** Whether the returned content (and title) holds the URL's known answer; null when nothing came back. */
  hasAnswer: boolean | null;
  requestId: string | null;
  warnings: string[];
  probeOnline?: boolean;
}

/** The harness's own read of a URL in a pass. */
export interface ProbeRecord {
  pass: number;
  urlId: string;
  /** The page answered 2xx to the harness and robots.txt allows it. */
  alive: boolean;
  reason?: string;
  httpStatus?: number;
  chars: number;
  contentSha256: string | null;
  /** For truth "harness": whether the harness text still holds the answer this pass; null otherwise. */
  truthHolds: boolean | null;
  at: string;
}

export function contentsPaths(dir: string) {
  return {
    dir,
    run: join(dir, "run.json"),
    attempts: join(dir, "contents-attempts.jsonl"),
    probes: join(dir, "probes.jsonl"),
    events: join(dir, "events.jsonl"),
    scores: join(dir, "scores.json"),
    publish: join(dir, "publish"),
    rawContent: (pass: number, provider: string, urlId: string) => join(dir, "raw", "contents", `p${pass}`, provider, `${urlId}.json`),
    rawProbe: (pass: number, urlId: string) => join(dir, "raw", "probes", `p${pass}`, `${urlId}.json`),
  };
}

/** The current record per key: the last one wins (a resumed retry supersedes what it retried). */
export function readContentsAttempts(path: string): ContentsAttempt[] {
  const m = new Map<string, ContentsAttempt>();
  for (const a of readJsonl<ContentsAttempt>(path)) m.set(a.key, a);
  return [...m.values()];
}

export function readProbes(path: string): ProbeRecord[] {
  const m = new Map<string, ProbeRecord>();
  for (const p of readJsonl<ProbeRecord>(path)) m.set(`${p.pass}|${p.urlId}`, p);
  return [...m.values()];
}

export interface ContentsContext {
  dir: string;
  config: ContentsConfig;
  method: ContentsMethod;
  urls: ContentsUrl[];
  registry: Readonly<Record<string, ProviderSpec>>;
  client: Client<string>;
  pageFetcher: PageFetcher;
  budget: Budget;
  timer?: Timer;
  log?: (line: string) => void;
  signal?: AbortSignal;
  connectivity?: Connectivity;
}

export type ContentsStop = "done" | "budget" | "overrun" | "aborted";

/** The provider order for one URL and pass: seeded, so no provider is systematically first. */
export function contentsProviderOrder(config: ContentsConfig, urlId: string, pass: number): string[] {
  return shuffle(config.providers, rng(seedOf(config.seed, "contents", urlId, pass)));
}

/** The URL order of a pass. */
export function urlOrder(config: ContentsConfig, urls: readonly ContentsUrl[], pass: number): ContentsUrl[] {
  return shuffle(urls, rng(seedOf(config.seed, "contents-order", pass)));
}

/** Holds per-host spacing for the harness probe (one request per host at a time, at least `ms` apart). */
class HostGate {
  private readonly next = new Map<string, number>();
  private readonly busy = new Map<string, Promise<void>>();
  private readonly timer: Timer;
  constructor(timer: Timer) { this.timer = timer; }
  async run<T>(host: string, ms: number, fn: () => Promise<T>): Promise<T> {
    while (this.busy.has(host)) await this.busy.get(host);
    let done!: () => void;
    this.busy.set(host, new Promise<void>((r) => (done = r)));
    try {
      const wait = (this.next.get(host) ?? 0) - this.timer.now();
      if (wait > 0) await this.timer.sleep(wait);
      return await fn();
    } finally {
      this.next.set(host, this.timer.now() + ms);
      this.busy.delete(host);
      done();
    }
  }
}

const hostOf = (url: string) => { try { return new URL(url).host.toLowerCase(); } catch { return url; } };

export async function runContents(ctx: ContentsContext, perHostIntervalMs: number): Promise<ContentsStop> {
  const { config, method, budget, client, registry, dir } = ctx;
  const timer = ctx.timer ?? realTimer;
  const paths = contentsPaths(dir);
  const previous = readContentsAttempts(paths.attempts);
  const done = new Set(previous.filter((a) => !RETRIED.includes(a.outcome)).map((a) => a.key));
  const probed = new Map(readProbes(paths.probes).map((p) => [`${p.pass}|${p.urlId}`, p]));
  const disabled = new Set(previous.filter((a) => a.outcome === "setup_error").map((a) => a.provider));
  const pacers = new Map(config.providers.map((id) => [id, new Pacer(paceFor(registry[id]!.contents!.rateLimits as RateLimit[], config.rateLimitPlans?.[id], method.pacing.shareOfLimit, method.pacing.maxInFlightPerProvider, { urls: 1 }), timer)]));
  const gate = new HostGate(timer);
  let stop: ContentsStop | null = null;
  const halt = (r: ContentsStop) => { stop ??= r; };
  for (let pass = 1; pass <= config.passes && !stop; pass++) {
    await pool(urlOrder(config, ctx.urls, pass), method.pacing.itemWindow, () => stop !== null || !!ctx.signal?.aborted, async (u) => {
      // 1. The harness's own probe, once per URL and pass: is the page there, may it be read, does it still state the answer?
      let probe = probed.get(`${pass}|${u.id}`);
      if (!probe) {
        const delay = Math.max(perHostIntervalMs, await ctx.pageFetcher.crawlDelayMs(u.url));
        const page = await gate.run(hostOf(u.url), delay, () => ctx.pageFetcher.fetchPage(u.url, ctx.signal));
        if (page.status === "unreadable" && page.reason === "aborted") return halt("aborted");
        const status = page.httpStatus;
        const alive = page.status === "ok" || ((page.reason === "content-type" || page.reason === "empty") && status !== undefined && status >= 200 && status < 300);
        const text = page.status === "ok" ? page.text : "";
        probe = {
          pass, urlId: u.id, alive, ...(page.status === "unreadable" ? { reason: page.reason } : {}), ...(status !== undefined ? { httpStatus: status } : {}),
          chars: text.length, contentSha256: text ? sha256(text) : null,
          truthHolds: u.truth === "harness" ? (alive && textHasAnswer(text, keyOf(u))) : null, at: new Date().toISOString(),
        };
        if (text) writeJson(paths.rawProbe(pass, u.id), { url: u.url, text }, 0o600);
        appendJsonl(paths.probes, probe);
        probed.set(`${pass}|${u.id}`, probe);
      }
      // A page that is down or disallowed this pass is unavailable for every provider: no calls, nobody scored.
      if (!probe.alive) return;
      // 2. Every provider's call for the URL, dispatched together.
      await Promise.all(contentsProviderOrder(config, u.id, pass).map(async (provider) => {
        const key = `c|${pass}|${u.id}|${provider}`;
        if (done.has(key) || disabled.has(provider) || stop) return;
        if (ctx.signal?.aborted) return halt("aborted");
        const spec = registry[provider]!;
        const res = urlReservation(spec, u, method);
        const credits = spec.contents!.pricing.creditUsd ? res.credits : null;
        const refusal = budget.providerRefusal(provider, credits);
        if (refusal) {
          if (!disabled.has(provider)) { disabled.add(provider); appendJsonl(paths.events, { at: new Date().toISOString(), event: "provider-stopped", provider, detail: refusal }); ctx.log?.(`${refusal}; stopping ${provider}`); }
          return;
        }
        const hold = budget.reserve(provider, "contents", res.usd, credits);
        if (!hold) return halt(budget.halted ? "overrun" : "budget");
        const release = await pacers.get(provider)!.acquire();
        const startedAt = new Date().toISOString();
        const t0 = performance.now();
        let response: ContentsResponse<string> | null = null;
        let error: unknown = null;
        const failure = emptyDetail();
        try {
          response = await withCapture(failure, () => client.contents([u.url], {
            provider, fallback: [], timeoutMs: method.call.timeoutMs, maxRetries: method.call.maxRetries, ...(ctx.signal ? { signal: ctx.signal } : {}),
          }));
        } catch (e) {
          error = e;
        } finally {
          release();
        }
        const durationMs = Math.round(performance.now() - t0);
        const attempts: Attempt<string>[] = response?.attempts ?? (error instanceof SearchError ? error.attempts : []);
        const sent = attempts.filter((a) => a.outcome !== "skipped");
        const last = sent[sent.length - 1];
        const page = response?.pages[0];
        let outcome: ContentsOutcome;
        let code: string | undefined;
        if (response) {
          if (page?.status === "ok") outcome = page.content && /[\p{L}\p{N}]/u.test(page.content) ? "ok_nonempty" : "ok_empty";
          else { outcome = "page_failed"; code = page?.error?.code ?? "failed"; }
        } else if (error instanceof SearchError) { code = error.code; outcome = OUTCOME_BY_CODE[error.code] ?? "harness_error"; }
        else { outcome = "harness_error"; code = error instanceof Error ? error.name : "unknown"; }
        let probeOnline: boolean | undefined;
        if (outcome === "network_error" && ctx.connectivity) {
          probeOnline = await ctx.connectivity();
          if (!probeOnline) outcome = "local_network";
        }
        const cost = sent.length ? attemptsCost(sent) : 0;
        const used = credits === null ? null : sent.length ? attemptsCredits(spec, "contents", sent) : 0;
        if (budget.commit(hold, cost, used)) halt("overrun");
        const content = page?.status === "ok" ? (page.content ?? "") : "";
        const text = method.match.fields.map((f) => (f === "content" ? content : (page?.title ?? ""))).join("\n");
        const rec: ContentsAttempt = {
          key, pass, urlId: u.id, provider, startedAt, outcome, ...(code ? { code } : {}), ...(last?.status !== undefined ? { status: last.status } : {}),
          durationMs, billed: last?.billed ?? "no", costUsd: cost, costSource: last?.cost.source ?? "none", reservedUsd: res.usd,
          ...(credits !== null ? { credits: used } : {}),
          ...(outcome === "page_failed" ? { pageError: page?.error?.code ?? null } : {}),
          contentChars: content.length, contentSha256: content ? sha256(content) : null,
          hasAnswer: outcome === "ok_nonempty" ? textHasAnswer(text, keyOf(u)) : null,
          requestId: response?.requestId ?? null, warnings: (response?.warnings ?? []).map((w) => w.code),
          ...(probeOnline !== undefined ? { probeOnline } : {}),
        };
        writeJson(paths.rawContent(pass, provider, u.id), {
          key, url: u.url, outcome, code: code ?? null, title: page?.title ?? null, content, finalUrl: page?.finalUrl ?? null,
          ...(response ? {} : { failure: { message: error instanceof Error ? error.message : String(error), ...failure } }),
        }, 0o600);
        appendJsonl(paths.attempts, rec);
        if (outcome === "local_network") return;
        done.add(key);
        if (outcome === "rate_limited") pacers.get(provider)!.pause(last?.retryAfterMs ?? method.pacing.rateLimitPauseMs);
        if (outcome === "setup_error" && !disabled.has(provider)) {
          disabled.add(provider);
          appendJsonl(paths.events, { at: new Date().toISOString(), event: "provider-stopped", provider, detail: `setup error ${code}` });
          ctx.log?.(`${provider}: stopped after a setup error (${code}); fix it and resume`);
        }
        if (outcome === "aborted") halt("aborted");
      }));
    });
  }
  return stop ?? "done";
}
