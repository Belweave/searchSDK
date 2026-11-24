// Executes a planned run: searches through the SDK under fixed conditions,
// page fetches for the known-answer check, and judging. Every phase is
// resumable (finished work is read back from the run directory), checks the
// budget before every paid call, and writes response text only under raw/.
import { existsSync, readFileSync } from "node:fs";
import { performance } from "node:perf_hooks";
import type { Item } from "../dataset/items.ts";
import { selectPassage, type Judge, type JudgeVerdict, JudgeError } from "../judge/judge.ts";
import { SearchError, type Attempt, type Client, type ProviderSpec, type SearchResponse } from "../sdk.ts";
import { appendJsonl, readJsonl, rng, seedOf, sha256, shuffle, writeJson } from "../util/core.ts";
import type { Budget } from "./budget.ts";
import type { Method, RunConfig } from "./config.ts";
import { Pacer, realTimer, type Timer } from "./pacer.ts";
import { hasProfile, settingsFor, type Plan } from "./plan.ts";
import { reservation } from "./pricing.ts";
import {
  pairIdOf, runPaths, urlKey, type AttemptRecord, type EventRecord, type JudgmentRecord, type Outcome, type PageRecord,
} from "./records.ts";

export interface RunContext {
  dir: string;
  config: RunConfig;
  method: Method;
  plan: Plan;
  items: Item[];
  registry: Readonly<Record<string, ProviderSpec>>;
  client: Client;
  judge: Judge | null;
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
export function attemptsCost(attempts: readonly Attempt[]): number | null {
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
  let stop: StopReason | null = null;
  const halt = (r: StopReason) => { stop ??= r; };

  for (let pass = 1; pass <= config.passes && !stop; pass++) {
    const order = shuffle(ctx.items, rng(seedOf(config.seed, "order", pass)));
    await pool(order, method.pacing.itemWindow, () => stop !== null || !!ctx.signal?.aborted, async (item) => {
      const units = shuffle(config.providers.flatMap((provider) => config.profiles.filter((profile) => hasProfile(config, profile, provider)).map((profile) => ({ provider, profile }))), rng(seedOf(config.seed, item.id, pass)));
      await Promise.all(units.map(async ({ provider, profile }) => {
        const key = `s|${pass}|${item.id}|${provider}|${profile}`;
        if (done.has(key) || disabled.has(provider) || stop) return;
        if (ctx.signal?.aborted) return halt("aborted");
        const spec = registry[provider]!;
        const settings = settingsFor(config, profile, provider);
        const res = reservation(spec, "search", method.search.maxResults, settings, method);
        const hold = budget.reserve(provider, "search", res.usd);
        if (!hold) return halt(budget.halted ? "overrun" : "budget");
        const release = await pacers.get(provider)!.acquire();
        const startedAt = new Date().toISOString();
        const t0 = performance.now();
        let response: SearchResponse | null = null;
        let error: unknown = null;
        try {
          response = await client.search(item.query, {
            provider: provider as never,
            fallback: [],
            maxResults: method.search.maxResults,
            timeoutMs: method.search.timeoutMs,
            maxRetries: method.search.maxRetries,
            ...(settings.depth ? { depth: settings.depth } : {}),
            ...(settings.providerOptions ? { providerOptions: { [provider]: settings.providerOptions } as never } : {}),
            ...(ctx.signal ? { signal: ctx.signal } : {}),
          });
        } catch (e) {
          error = e;
        } finally {
          release();
        }
        const durationMs = performance.now() - t0;
        const attempts: Attempt[] = response?.attempts ?? (error instanceof SearchError ? error.attempts : []);
        const sent = attempts.filter((a) => a.outcome !== "skipped");
        const last = sent[sent.length - 1];
        let outcome: Outcome;
        let code: string | undefined;
        if (response) outcome = response.results.length ? "ok_nonempty" : "ok_empty";
        else if (error instanceof SearchError) { code = error.code; outcome = OUTCOME_BY_CODE[error.code] ?? "harness_error"; }
        else { outcome = "harness_error"; code = error instanceof Error ? error.name : "unknown"; }
        // Nothing sent (validation or a skipped provider) costs nothing; otherwise the SDK's per-attempt costs.
        const cost = sent.length ? attemptsCost(sent) : 0;
        if (budget.commit(hold, cost)) halt("overrun");
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

/** Page phase: fetch each target once through the SDK's contents call on the fixed reference fetcher. */
export async function runPages(ctx: RunContext): Promise<StopReason> {
  const { method, budget, client, registry, dir } = ctx;
  if (!ctx.config.pagePasses.length) return "done";
  const paths = runPaths(dir);
  const fetcher = method.pages.fetcher;
  const spec = registry[fetcher]!;
  const done = new Set(readJsonl<PageRecord>(paths.pages).filter((p) => p.code !== "aborted").map((p) => p.urlKey));
  const targets = [...pageTargets(readJsonl<AttemptRecord>(paths.attempts), ctx.config, method.pages.topK)].filter(([k]) => !done.has(k));
  const pacer = new Pacer(ctx.plan.pages.pace, ctx.timer ?? realTimer);
  let stop: StopReason | null = null;
  await pool(targets, ctx.plan.pages.pace.maxInFlight, () => stop !== null || !!ctx.signal?.aborted, async ([key, url]) => {
    const res = reservation(spec, "contents", 1, {}, method);
    const hold = budget.reserve(fetcher, "contents", res.usd);
    if (!hold) { stop ??= budget.halted ? "overrun" : "budget"; return; }
    const release = await pacer.acquire();
    const t0 = performance.now();
    let rec: PageRecord;
    let text: string | null = null;
    let title: string | null = null;
    try {
      const r = await client.contents(url, { provider: fetcher as never, timeoutMs: method.pages.timeoutMs, maxRetries: 0, fallback: [], ...(ctx.signal ? { signal: ctx.signal } : {}) });
      const page = r.pages[0];
      text = page?.status === "ok" ? (page.content ?? "") : null;
      title = page?.title ?? null;
      const cost = attemptsCost(r.attempts.filter((a) => a.outcome !== "skipped"));
      if (budget.commit(hold, cost)) stop ??= "overrun";
      rec = {
        urlKey: key, url, status: page?.status === "ok" ? "ok" : "failed", ...(page?.error?.code ? { code: page.error.code } : {}),
        contentSha256: text === null ? null : sha256(text), contentChars: text?.length ?? 0, costUsd: cost, durationMs: Math.round(performance.now() - t0),
      };
    } catch (e) {
      const sent = e instanceof SearchError ? e.attempts.filter((a) => a.outcome !== "skipped") : [];
      const cost = sent.length ? attemptsCost(sent) : 0;
      if (budget.commit(hold, cost)) stop ??= "overrun";
      const code = e instanceof SearchError ? e.code : "harness_error";
      rec = { urlKey: key, url, status: "error", code, contentSha256: null, contentChars: 0, costUsd: cost, durationMs: Math.round(performance.now() - t0) };
      if (code === "aborted") stop ??= "aborted";
    } finally {
      release();
    }
    if (text !== null) writeJson(paths.rawPage(key), { url, title, content: text.slice(0, method.pages.maxStoredChars) }, 0o600);
    appendJsonl(paths.pages, rec);
  });
  return stop ?? "done";
}

export interface JudgePair {
  pairId: string;
  itemId: string;
  urlKey: string;
  url: string;
  title: string | null;
  excerpts: string[];
}

/** The pooled (item, URL) pairs to judge: top K of every provider's pass-1 default-profile results on the judged items. */
export function judgePairs(ctx: Pick<RunContext, "dir" | "plan" | "method">): JudgePair[] {
  const paths = runPaths(ctx.dir);
  const judged = new Set(ctx.plan.judgeItemIds);
  const pairs = new Map<string, JudgePair>();
  for (const a of readJsonl<AttemptRecord>(paths.attempts)) {
    if (a.pass !== 1 || a.profile !== "default" || a.outcome !== "ok_nonempty" || !judged.has(a.itemId)) continue;
    const raw = readRawSearch(paths.rawSearch(a.pass, a.provider, a.profile, a.itemId));
    for (const [i, u] of a.urls.slice(0, ctx.method.judge.topK).entries()) {
      const key = urlKey(u);
      const pairId = pairIdOf(a.itemId, key);
      if (pairs.has(pairId)) continue;
      const r = raw?.results?.[i];
      pairs.set(pairId, { pairId, itemId: a.itemId, urlKey: key, url: u, title: r?.title ?? null, excerpts: r?.excerpts ?? [] });
    }
  }
  return [...pairs.values()].sort((a, b) => a.pairId.localeCompare(b.pairId));
}

function readRawSearch(path: string): { results?: { title: string | null; excerpts: string[] }[] } | null {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

/** The passage for a pair: the fetched page when there is one, else the result's own title and excerpts. */
export function passageFor(dir: string, pair: JudgePair, query: string, maxBytes: number): { passage: string; source: "page" | "snippet" } {
  const p = runPaths(dir).rawPage(pair.urlKey);
  if (existsSync(p)) {
    const page = JSON.parse(readFileSync(p, "utf8")) as { content: string };
    if (page.content.trim()) return { passage: selectPassage(page.content, query, maxBytes), source: "page" };
  }
  return { passage: selectPassage([pair.title ?? "", ...pair.excerpts].join("\n\n"), query, maxBytes), source: "snippet" };
}

/** Judge phase: every pair once, a seeded share twice for self-consistency, in a seeded order, blind to provider. */
export async function runJudge(ctx: RunContext): Promise<StopReason> {
  const { judge, budget, dir, method } = ctx;
  if (!judge || !ctx.plan.judgeItemIds.length) return "done";
  const paths = runPaths(dir);
  const items = new Map(ctx.items.map((i) => [i.id, i]));
  const pairs = judgePairs(ctx);
  const repeatIds = new Set(shuffle(pairs.map((p) => p.pairId), rng(seedOf(ctx.config.seed, "repeat"))).slice(0, Math.ceil(pairs.length * method.judge.selfConsistencyShare)));
  const tasks = shuffle(pairs.flatMap((p) => (repeatIds.has(p.pairId) ? [{ p, repeat: 0 }, { p, repeat: 1 }] : [{ p, repeat: 0 }])), rng(seedOf(ctx.config.seed, "judge-order")));
  const done = new Set(readJsonl<JudgmentRecord>(paths.judgments).filter((j) => j.grade !== null).map((j) => `${j.pairId}|${j.repeat}`));
  const timer = ctx.timer ?? realTimer;
  const account = `judge:${judge.info.id}`;
  let failures = 0;
  for (const { p, repeat } of tasks) {
    if (done.has(`${p.pairId}|${repeat}`)) continue;
    if (ctx.signal?.aborted) return "aborted";
    const item = items.get(p.itemId)!;
    const { passage, source } = passageFor(dir, p, item.query, method.judge.passageMaxBytes);
    const input = { query: item.query, url: p.url, title: p.title, passage };
    const hold = budget.reserve(account, "judge", judge.maxCallCostUsd(input));
    if (!hold) return budget.halted ? "overrun" : "budget";
    let verdict: JudgeVerdict | null = null;
    let err: string | undefined;
    let wait = 0;
    try {
      verdict = await judge.grade(input, ctx.signal);
    } catch (e) {
      err = e instanceof JudgeError ? e.message : e instanceof Error ? e.name : "error";
      if (e instanceof JudgeError && e.status === 429) wait = e.retryAfterMs ?? method.pacing.rateLimitPauseMs;
      failures++;
    }
    // A failed call may still have been billed; with no usage reported, the reservation stands.
    if (budget.commit(hold, verdict ? verdict.costUsd : null)) return "overrun";
    const rec: JudgmentRecord = {
      pairId: p.pairId, itemId: p.itemId, urlKey: p.urlKey, repeat, judge: judge.info.id, passageSource: source,
      grade: verdict?.grade ?? null, ...(err ? { error: err } : {}),
      inputTokens: verdict?.inputTokens ?? null, outputTokens: verdict?.outputTokens ?? null, costUsd: verdict?.costUsd ?? null,
      rationaleSha256: verdict ? sha256(verdict.rationale) : null, at: new Date().toISOString(),
    };
    if (verdict) writeJson(paths.rawJudge(p.pairId, repeat), { rationale: verdict.rationale, model: verdict.model, raw: verdict.raw }, 0o600);
    appendJsonl(paths.judgments, rec);
    if (failures >= 20 && failures > tasks.length * 0.2) {
      event(dir, { event: "judge-stopped", detail: `${failures} failed calls` });
      return "done";
    }
    const cool = Math.max(wait, judge.cooldownMs(verdict, input));
    if (cool > 0) await timer.sleep(cool);
  }
  return "done";
}
