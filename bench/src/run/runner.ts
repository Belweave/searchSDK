// Executes a planned run: searches through the SDK under fixed conditions,
// page fetches for the known-answer check, and judging. Every phase is
// resumable (finished work is read back from the run directory), checks the
// budget before every paid call, and writes response text only under raw/.
import { existsSync, readFileSync } from "node:fs";
import { performance } from "node:perf_hooks";
import type { Item } from "../dataset/items.ts";
import { selectPassage, type Judge, type JudgeVerdict, JudgeError } from "../judge/judge.ts";
import type { FetchedPage } from "../pages/fetcher.ts";
import { SearchError, type Attempt, type Client, type ProviderSpec, type SearchResponse } from "../sdk.ts";
import type { PageFetcher } from "../session.ts";
import { appendJsonl, readJsonl, rng, seedOf, sha256, shuffle, writeJson } from "../util/core.ts";
import type { Budget } from "./budget.ts";
import type { Method, RunConfig } from "./config.ts";
import { Pacer, realTimer, type Timer } from "./pacer.ts";
import { hasProfile, reusesDefault, scopeOf, settingsFor, type Plan } from "./plan.ts";
import { attemptsCredits, creditReservation, reservation } from "./pricing.ts";
import {
  judgePairIdOf, runPaths, urlKey, type AttemptRecord, type EventRecord, type JudgmentRecord, type Outcome, type PageRecord,
} from "./records.ts";

export interface RunContext {
  dir: string;
  config: RunConfig;
  method: Method;
  plan: Plan;
  items: Item[];
  registry: Readonly<Record<string, ProviderSpec>>;
  client: Client<string>;
  pageFetcher: PageFetcher;
  judge: Judge | null;
  /** A second, different-vendor judge that grades every pair once, as a blind cross-check. */
  checkJudge?: Judge | null;
  budget: Budget;
  timer?: Timer;
  log?: (line: string) => void;
  signal?: AbortSignal;
}

export type StopReason = "done" | "budget" | "overrun" | "aborted";

const OUTCOME_BY_CODE: Record<string, Outcome> = {
  rate_limit: "rate_limited", quota: "rate_limited",
  timeout: "timeout", attempt_timeout: "timeout",
  unavailable: "server_error", provider_error: "server_error",
  network: "network_error",
  invalid_response: "invalid_response", response_too_large: "invalid_response",
  auth: "setup_error", forbidden: "setup_error", configuration: "setup_error", invalid_request: "setup_error", unsupported: "setup_error",
  aborted: "aborted",
};

/** Sum of attempt costs that may be billed. Null when any of them has an unknown price. */
export function attemptsCost(attempts: readonly Attempt<string>[]): number | null {
  let total = 0;
  for (const a of attempts) {
    if (a.billed === "no") continue;
    if (a.cost.usd === null) return null;
    total += a.cost.usd;
  }
  return total;
}

function event(dir: string, e: Omit<EventRecord, "at">) {
  appendJsonl(runPaths(dir).events, { at: new Date().toISOString(), ...e });
}

async function pool<T>(items: readonly T[], width: number, stop: () => boolean, work: (t: T) => Promise<void>): Promise<void> {
  let next = 0;
  await Promise.all(Array.from({ length: Math.max(1, width) }, async () => {
    while (next < items.length && !stop()) await work(items[next++]!);
  }));
}

/**
 * The order providers are dispatched in for one item and pass: seeded by run,
 * item and pass, so no provider is systematically first. All of an item's
 * calls are dispatched together and run concurrently, each under its own pacer.
 */
export function providerOrder(config: RunConfig, itemId: string, pass: number): string[] {
  return shuffle(config.providers, rng(seedOf(config.seed, itemId, pass)));
}

/** Search phase: every pass, item, provider and profile once, in a seeded order. */
export async function runSearch(ctx: RunContext): Promise<StopReason> {
  const { config, method, budget, client, registry, dir } = ctx;
  const timer = ctx.timer ?? realTimer;
  const paths = runPaths(dir);
  const previous = readJsonl<AttemptRecord>(paths.attempts);
  const done = new Set(previous.filter((a) => a.outcome !== "aborted").map((a) => a.key));
  const disabled = new Map<string, string>();
  for (const a of previous) if (a.outcome === "setup_error") disabled.set(a.provider, a.code ?? "setup");
  const pacers = new Map(ctx.plan.providers.map((p) => [p.id, new Pacer(p.pace, timer)]));
  // A scoped profile (the tuned condition) runs on its seeded subset and passes only, for every provider alike.
  const scopes = new Map(config.profiles.map((p) => {
    const sc = scopeOf(config, p, ctx.items);
    return [p, { ids: new Set(sc.items.map((i) => i.id)), passes: new Set(sc.passes) }];
  }));
  const runs = (profile: string, provider: string, itemId: string, pass: number) => {
    const sc = scopes.get(profile)!;
    return hasProfile(config, profile, provider) && !reusesDefault(config, profile, provider) && sc.passes.has(pass) && sc.ids.has(itemId);
  };
  let stop: StopReason | null = null;
  const halt = (r: StopReason) => { stop ??= r; };

  for (let pass = 1; pass <= config.passes && !stop; pass++) {
    const order = shuffle(ctx.items, rng(seedOf(config.seed, "order", pass)));
    await pool(order, method.pacing.itemWindow, () => stop !== null || !!ctx.signal?.aborted, async (item) => {
      const order = providerOrder(config, item.id, pass);
      const units = order.flatMap((provider) => config.profiles.filter((profile) => runs(profile, provider, item.id, pass)).map((profile) => ({ provider, profile })));
      await Promise.all(units.map(async ({ provider, profile }) => {
        const key = `s|${pass}|${item.id}|${provider}|${profile}`;
        if (done.has(key) || disabled.has(provider) || stop) return;
        if (ctx.signal?.aborted) return halt("aborted");
        const spec = registry[provider]!;
        const settings = settingsFor(config, profile, provider);
        const res = reservation(spec, "search", method.search.maxResults, settings, method);
        const credits = creditReservation(spec, "search", method.search.maxResults, settings);
        // A provider's own account limit (credits or calls) stops that provider alone, before the call that could pass it.
        const refusal = budget.providerRefusal(provider, credits);
        if (refusal) {
          if (!disabled.has(provider)) {
            disabled.set(provider, "limit");
            event(dir, { event: "provider-stopped", provider, detail: `${refusal}; the other providers continue` });
            ctx.log?.(`${refusal}; stopping ${provider}, the other providers continue`);
          }
          return;
        }
        const hold = budget.reserve(provider, "search", res.usd, credits);
        if (!hold) return halt(budget.halted ? "overrun" : "budget");
        const release = await pacers.get(provider)!.acquire();
        const startedAt = new Date().toISOString();
        const t0 = performance.now();
        let response: SearchResponse<string> | null = null;
        let error: unknown = null;
        try {
          response = await client.search(item.query, {
            provider,
            fallback: [],
            maxResults: method.search.maxResults,
            timeoutMs: method.search.timeoutMs,
            maxRetries: method.search.maxRetries,
            ...(settings.depth ? { depth: settings.depth } : {}),
            ...(settings.country ? { country: settings.country } : {}),
            ...(settings.providerOptions ? { providerOptions: { [provider]: settings.providerOptions } } : {}),
            ...(ctx.signal ? { signal: ctx.signal } : {}),
          });
        } catch (e) {
          error = e;
        } finally {
          release();
        }
        const durationMs = performance.now() - t0;
        const attempts: Attempt<string>[] = response?.attempts ?? (error instanceof SearchError ? error.attempts : []);
        const sent = attempts.filter((a) => a.outcome !== "skipped");
        const last = sent[sent.length - 1];
        let outcome: Outcome;
        let code: string | undefined;
        if (response) outcome = response.results.length ? "ok_nonempty" : "ok_empty";
        else if (error instanceof SearchError) { code = error.code; outcome = OUTCOME_BY_CODE[error.code] ?? "harness_error"; }
        else { outcome = "harness_error"; code = error instanceof Error ? error.name : "unknown"; }
        // Nothing sent (validation or a skipped provider) costs nothing; otherwise the SDK's per-attempt costs.
        const cost = sent.length ? attemptsCost(sent) : 0;
        const creditsUsed = credits === null ? null : sent.length ? attemptsCredits(spec, "search", sent) : 0;
        if (budget.commit(hold, cost, creditsUsed)) halt("overrun");
        const results = response?.results ?? [];
        const rec: AttemptRecord = {
          key, pass, itemId: item.id, provider, profile, startedAt, outcome,
          ...(code ? { code } : {}),
          ...(last?.status !== undefined ? { status: last.status } : {}),
          durationMs: Math.round(durationMs),
          billed: last?.billed ?? "no",
          costUsd: cost,
          costSource: last?.cost.source ?? "none",
          costEstimated: last?.cost.estimated ?? false,
          reservedUsd: res.usd,
          ...(credits !== null ? { credits: creditsUsed } : {}),
          resultCount: results.length,
          urls: results.map((r) => r.url),
          resultHashes: results.map((r) => sha256(JSON.stringify([r.title, r.excerpts]))),
          requestId: response?.requestId ?? null,
          warnings: (response?.warnings ?? []).map((w) => w.code),
        };
        writeJson(paths.rawSearch(pass, provider, profile, item.id), {
          key, query: item.query, outcome, code: code ?? null,
          results: results.map((r) => ({ rank: r.rank, url: r.url, title: r.title, excerpts: r.excerpts, publishedAt: r.publishedAt })),
          raw: response?.raw ?? (error instanceof SearchError ? (error.raw ?? null) : null),
        }, 0o600);
        appendJsonl(paths.attempts, rec);
        done.add(key);
        if (outcome === "rate_limited") pacers.get(provider)!.pause(last?.retryAfterMs ?? method.pacing.rateLimitPauseMs);
        if (outcome === "setup_error" && !disabled.has(provider)) {
          disabled.set(provider, code ?? "setup");
          event(dir, { event: "provider-stopped", provider, detail: `setup error ${code}; fix the configuration and resume` });
          ctx.log?.(`${provider}: stopped after a setup error (${code}); fix it and resume the run`);
        }
        if (outcome === "aborted") halt("aborted");
      }));
    });
  }
  if (stop) event(dir, { event: "search-stopped", detail: stop });
  return stop ?? "done";
}

/** The URLs whose pages the known-answer check reads: top K of each page-pass search, de-duplicated. */
export function pageTargets(attempts: readonly AttemptRecord[], config: RunConfig, topK: number): Map<string, string> {
  const out = new Map<string, string>();
  for (const a of attempts) {
    if (!config.pagePasses.includes(a.pass) || a.outcome !== "ok_nonempty") continue;
    for (const u of a.urls.slice(0, topK)) if (!out.has(urlKey(u))) out.set(urlKey(u), u);
  }
  return out;
}

/** Spaces calls to one host: one at a time, at least `intervalMs` (or the host's Crawl-delay) apart. */
export class HostPacer {
  private readonly next = new Map<string, number>();
  private readonly busy = new Map<string, Promise<void>>();
  private readonly timer: Timer;
  constructor(timer: Timer) {
    this.timer = timer;
  }
  async acquire(host: string, intervalMs: number): Promise<() => void> {
    while (this.busy.has(host)) await this.busy.get(host);
    let done!: () => void;
    this.busy.set(host, new Promise<void>((r) => (done = r)));
    const wait = (this.next.get(host) ?? 0) - this.timer.now();
    if (wait > 0) await this.timer.sleep(wait);
    return () => {
      this.next.set(host, this.timer.now() + intervalMs);
      this.busy.delete(host);
      done();
    };
  }
}

const hostOf = (url: string): string => {
  try {
    return new URL(url).host.toLowerCase();
  } catch {
    return url;
  }
};

/**
 * Page phase: the harness's own fetcher reads each target once. It is no
 * ranked provider and costs nothing, so no spend is reserved. A page it
 * cannot read counts as unreadable for every provider that returned it.
 */
export async function runPages(ctx: RunContext): Promise<StopReason> {
  const { method, dir } = ctx;
  if (!ctx.config.pagePasses.length) return "done";
  const paths = runPaths(dir);
  const done = new Set(readJsonl<PageRecord>(paths.pages).filter((p) => p.reason !== "aborted").map((p) => p.urlKey));
  // A seeded order, so when a page is read does not depend on which provider returned it first.
  const targets = shuffle([...pageTargets(readJsonl<AttemptRecord>(paths.attempts), ctx.config, method.pages.topK)].filter(([k]) => !done.has(k)), rng(seedOf(ctx.config.seed, "pages")));
  const hosts = new HostPacer(ctx.timer ?? realTimer);
  let stop: StopReason | null = null;
  await pool(targets, method.pages.maxInFlight, () => stop !== null || !!ctx.signal?.aborted, async ([key, url]) => {
    const delay = Math.max(method.pages.perHostIntervalMs, await ctx.pageFetcher.crawlDelayMs(url));
    const release = await hosts.acquire(hostOf(url), delay);
    const t0 = performance.now();
    let page: FetchedPage;
    try {
      page = await ctx.pageFetcher.fetchPage(url, ctx.signal);
    } finally {
      release();
    }
    const durationMs = Math.round(performance.now() - t0);
    let rec: PageRecord;
    if (page.status === "ok") {
      rec = {
        urlKey: key, url, status: "ok", httpStatus: page.httpStatus, finalUrl: page.finalUrl, ...(page.truncated ? { truncated: true } : {}),
        contentSha256: sha256(page.text), contentChars: page.text.length, durationMs,
      };
      writeJson(paths.rawPage(key), { url, finalUrl: page.finalUrl, title: page.title, content: page.text.slice(0, method.pages.maxStoredChars) }, 0o600);
    } else {
      rec = { urlKey: key, url, status: "unreadable", reason: page.reason, ...(page.httpStatus !== undefined ? { httpStatus: page.httpStatus } : {}), contentSha256: null, contentChars: 0, durationMs };
      if (page.reason === "aborted") stop ??= "aborted";
    }
    appendJsonl(paths.pages, rec);
  });
  return stop ?? "done";
}

export interface JudgePair {
  pairId: string;
  itemId: string;
  urlKey: string;
  url: string;
  /** "page": the harness read the page and the judge sees its text and title. "snippet": it could not, and the judge sees this provider's own title and excerpts. */
  source: "page" | "snippet";
  /** Bookkeeping for snippet pairs only; never sent to the judge. */
  provider: string | null;
  title: string | null;
  excerpts: string[];
}

/** URL keys whose page the harness's own fetcher read. */
export function readPages(dir: string): Set<string> {
  const out = new Set<string>();
  for (const p of readJsonl<PageRecord>(runPaths(dir).pages)) {
    if (p.status === "ok") out.add(p.urlKey);
    else out.delete(p.urlKey);
  }
  return out;
}

/**
 * The (item, URL) pairs to judge: top K of every provider's pass-1 default-profile results on the judged items.
 * Read pages are shared by every provider that returned them; unreadable ones become one pair per provider.
 */
export function judgePairs(ctx: Pick<RunContext, "dir" | "plan" | "method">): JudgePair[] {
  const paths = runPaths(ctx.dir);
  const judged = new Set(ctx.plan.judgeItemIds);
  const read = readPages(ctx.dir);
  const pairs = new Map<string, JudgePair>();
  for (const a of readJsonl<AttemptRecord>(paths.attempts)) {
    if (a.pass !== 1 || a.profile !== "default" || a.outcome !== "ok_nonempty" || !judged.has(a.itemId)) continue;
    const raw = readRawSearch(paths.rawSearch(a.pass, a.provider, a.profile, a.itemId));
    for (const [i, u] of a.urls.slice(0, ctx.method.judge.topK).entries()) {
      const key = urlKey(u);
      const pageRead = read.has(key);
      const pairId = judgePairIdOf(a.itemId, key, a.provider, pageRead);
      if (pairs.has(pairId)) continue;
      if (pageRead) {
        const page = readJsonFile<{ title?: string | null }>(paths.rawPage(key));
        pairs.set(pairId, { pairId, itemId: a.itemId, urlKey: key, url: u, source: "page", provider: null, title: page?.title ?? null, excerpts: [] });
      } else {
        const r = raw?.results?.[i];
        pairs.set(pairId, { pairId, itemId: a.itemId, urlKey: key, url: u, source: "snippet", provider: a.provider, title: r?.title ?? null, excerpts: r?.excerpts ?? [] });
      }
    }
  }
  return [...pairs.values()].sort((a, b) => a.pairId.localeCompare(b.pairId));
}

function readJsonFile<T>(path: string): T | null {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8")) as T;
  } catch {
    return null;
  }
}

function readRawSearch(path: string): { results?: { title: string | null; excerpts: string[] }[] } | null {
  return readJsonFile(path);
}

/** The passage for a pair: the harness's fetched page, or for an unreadable page the provider's own title and excerpts. */
export function passageFor(dir: string, pair: JudgePair, query: string, maxBytes: number): { passage: string; source: "page" | "snippet" } {
  if (pair.source === "page") {
    const page = readJsonFile<{ content?: string }>(runPaths(dir).rawPage(pair.urlKey));
    return { passage: selectPassage(page?.content ?? "", query, maxBytes), source: "page" };
  }
  return { passage: selectPassage([pair.title ?? "", ...pair.excerpts].join("\n\n"), query, maxBytes), source: "snippet" };
}

/**
 * Judge phase: the primary judge grades every pair once and a seeded share twice
 * (self-consistency); the check judge grades every pair once. Both run at the
 * same time, each paced to its own limits, each in its own seeded order, both
 * blind to provider.
 */
export async function runJudge(ctx: RunContext): Promise<StopReason> {
  if (!ctx.judge || !ctx.plan.judgeItemIds.length) return "done";
  const pairs = judgePairs(ctx);
  const loops = [judgeLoop(ctx, ctx.judge, pairs, true), ...(ctx.checkJudge ? [judgeLoop(ctx, ctx.checkJudge, pairs, false)] : [])];
  const results = await Promise.all(loops);
  for (const r of ["overrun", "budget", "aborted"] as const) if (results.includes(r)) return r;
  return "done";
}

async function judgeLoop(ctx: RunContext, judge: Judge, pairs: JudgePair[], primary: boolean): Promise<StopReason> {
  const { budget, dir, method } = ctx;
  const paths = runPaths(dir);
  const items = new Map(ctx.items.map((i) => [i.id, i]));
  const repeatIds = primary ? new Set(shuffle(pairs.map((p) => p.pairId), rng(seedOf(ctx.config.seed, "repeat"))).slice(0, Math.ceil(pairs.length * method.judge.selfConsistencyShare))) : new Set<string>();
  const orderSeed = primary ? seedOf(ctx.config.seed, "judge-order") : seedOf(ctx.config.seed, "judge-order", judge.info.id);
  const tasks = shuffle(pairs.flatMap((p) => (repeatIds.has(p.pairId) ? [{ p, repeat: 0 }, { p, repeat: 1 }] : [{ p, repeat: 0 }])), rng(orderSeed));
  const done = new Set(readJsonl<JudgmentRecord>(paths.judgments).filter((j) => j.grade !== null && j.judge === judge.info.id).map((j) => `${j.pairId}|${j.repeat}`));
  const timer = ctx.timer ?? realTimer;
  const account = `judge:${judge.info.id}`;
  // Covered by a plan: nothing is reserved, and any charge the judge reports halts the run.
  const covered = (ctx.config.judgePricing ?? "list-price") === "covered-by-plan";
  let failures = 0;
  for (const { p, repeat } of tasks) {
    if (done.has(`${p.pairId}|${repeat}`)) continue;
    if (ctx.signal?.aborted) return "aborted";
    const item = items.get(p.itemId)!;
    const { passage, source } = passageFor(dir, p, item.query, method.judge.passageMaxBytes);
    const input = { query: item.query, url: p.url, title: p.title, passage };
    const hold = budget.reserve(account, "judge", covered ? 0 : judge.maxCallCostUsd(input));
    if (!hold) return budget.halted ? "overrun" : "budget";
    let verdict: JudgeVerdict | null = null;
    let err: string | undefined;
    let wait = 0;
    const startedAt = timer.now();
    try {
      verdict = await judge.grade(input, ctx.signal);
    } catch (e) {
      err = e instanceof JudgeError ? e.message : e instanceof Error ? e.name : "error";
      if (e instanceof JudgeError && e.status === 429) wait = e.retryAfterMs ?? method.pacing.rateLimitPauseMs;
      failures++;
      if (covered && e instanceof JudgeError && e.status === 402) {
        budget.commit(hold, 0);
        budget.halt(`judge ${judge.info.id} answered 402 (payment required) although the config says it is covered by plan`);
        return "overrun";
      }
    }
    if (covered) {
      // Any reported charge means the plan does not cover this key: stop before spending more.
      if (budget.commit(hold, verdict?.chargedUsd ?? 0)) return "overrun";
    } else if (budget.commit(hold, verdict ? (verdict.chargedUsd ?? verdict.costUsd) : null)) return "overrun";
    // A failed list-price call may still have been billed; with no usage reported, the reservation stands.
    const rec: JudgmentRecord = {
      pairId: p.pairId, itemId: p.itemId, urlKey: p.urlKey, repeat, judge: judge.info.id, passageSource: source,
      grade: verdict?.grade ?? null, ...(err ? { error: err } : {}),
      inputTokens: verdict?.inputTokens ?? null, outputTokens: verdict?.outputTokens ?? null,
      costUsd: verdict ? (covered ? (verdict.chargedUsd ?? 0) : (verdict.chargedUsd ?? verdict.costUsd)) : null,
      rationaleSha256: verdict ? sha256(verdict.rationale) : null, at: new Date().toISOString(),
    };
    if (verdict) writeJson(paths.rawJudge(p.pairId, repeat, primary ? null : judge.info.id), { rationale: verdict.rationale, model: verdict.model, raw: verdict.raw }, 0o600);
    appendJsonl(paths.judgments, rec);
    if (failures >= 20 && failures > tasks.length * 0.2) {
      event(dir, { event: "judge-stopped", detail: `${judge.info.id}: ${failures} failed calls` });
      return "done";
    }
    // The token-rate cooldown runs from the call's start, so the call's own time counts towards it; a 429's Retry-After is waited in full.
    const cool = Math.max(wait, judge.cooldownMs(verdict, input) - (timer.now() - startedAt));
    if (cool > 0) await timer.sleep(cool);
    if (budget.halted) return "overrun";
  }
  return "done";
}
