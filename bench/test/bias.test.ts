// Bias controls: every provider is asked the same thing under the same
// conditions, and nothing about one provider (its name, its text, its timing
// or its cost) can move another provider's score. Hand-built run directories
// and SYNTHETIC fixture providers only; no request leaves the process.
import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import type { Item } from "../src/dataset/items.ts";
import { userMessage, type Judge, type JudgeInput } from "../src/judge/judge.ts";
import type { FetchedPage } from "../src/pages/fetcher.ts";
import { Budget } from "../src/run/budget.ts";
import { loadMethod, loadRunConfig, type RunConfig } from "../src/run/config.ts";
import type { Plan } from "../src/run/plan.ts";
import { runPaths, urlKey, type AttemptRecord, type PageRecord } from "../src/run/records.ts";
import { providerOrder, runJudge, runPages, runSearch, type RunContext } from "../src/run/runner.ts";
import { scoreRun } from "../src/score/score.ts";
import { openSession } from "../src/session.ts";
import { appendJsonl, readJsonl, writeJson } from "../src/util/core.ts";
import { fixtureConfig, item, tempStore } from "./helpers.ts";

const method = loadMethod();

function config(over: Partial<RunConfig> = {}): RunConfig {
  return { name: "bias", providers: ["pa", "pb"], datasets: [], passes: 1, profiles: ["default"], pagePasses: [1], judgeItems: 1, judgePricing: "covered-by-plan", capUsd: 1, seed: 11, ...over };
}

function attempt(provider: string, pass: number, itemId: string, urls: string[], startedAt = "2026-11-25T10:00:00.000Z"): AttemptRecord {
  return {
    key: `s|${pass}|${itemId}|${provider}|default`, pass, itemId, provider, profile: "default", startedAt, outcome: urls.length ? "ok_nonempty" : "ok_empty",
    durationMs: 900, billed: "yes", costUsd: 0.001, costSource: "computed", costEstimated: true, reservedUsd: 0.002, resultCount: urls.length,
    urls, resultHashes: urls.map(() => "h"), requestId: null, warnings: [],
  };
}

/** A run directory where two providers return the same URL with their own titles and excerpts. */
function sharedUrlRun(o: { readable: boolean; order: string[] }) {
  const store = tempStore();
  const dir = join(store, "runs", "bias");
  const paths = runPaths(dir);
  const it = item("i1", { query: "Who wrote the Zanzibar ledger?" });
  const url = "https://shared.example/ledger";
  for (const p of o.order) {
    appendJsonl(paths.attempts, attempt(p, 1, "i1", [url]));
    writeJson(paths.rawSearch(1, p, "default", "i1"), { results: [{ rank: 1, url, title: `Title from ${p}`, excerpts: [`excerpt written by ${p}`], publishedAt: null }] });
  }
  const key = urlKey(url);
  if (o.readable) {
    appendJsonl(paths.pages, { urlKey: key, url, status: "ok", httpStatus: 200, finalUrl: url, contentSha256: "x", contentChars: 40, durationMs: 5 } satisfies PageRecord);
    writeJson(paths.rawPage(key), { url, finalUrl: url, title: "Title the harness read", content: "The page the harness fetched itself." });
  } else {
    appendJsonl(paths.pages, { urlKey: key, url, status: "unreadable", reason: "status", httpStatus: 403, contentSha256: null, contentChars: 0, durationMs: 5 } satisfies PageRecord);
  }
  return { dir, items: [it] };
}

/** A judge that records what it is shown and grades excerpts by their author, so a leak between providers shows up in the scores. */
function recordingJudge(seen: JudgeInput[], id = "rec-judge"): Judge {
  return {
    info: { id, label: "recording", model: "none", rubric: "rubric/relevance-1.0.0.md", rubricSha256: "x", promptSha256: "x", params: {} },
    maxCallCostUsd: () => 0, cooldownMs: () => 0,
    async grade(input) {
      seen.push(input);
      const grade = input.passage.includes("by pa") ? 3 : input.passage.includes("by pb") ? 0 : 2;
      return { grade, rationale: "r", inputTokens: 1, outputTokens: 1, costUsd: 0, chargedUsd: null, model: "none", raw: {} };
    },
  };
}

function ctx(dir: string, items: Item[], judge: Judge, c = config()): RunContext {
  const budget = new Budget({ ledgerPath: join(dir, "ledger.jsonl"), runId: "bias", runCapUsd: c.capUsd, monthlyCapUsd: 100 });
  // No self-consistency repeats here, so each judge call is one distinct pair.
  const m = { ...method, judge: { ...method.judge, selfConsistencyShare: 0 } };
  return { dir, config: c, method: m, plan: { judgeItemIds: items.map((i) => i.id) } as Plan, items, registry: {}, client: null as never, pageFetcher: null as never, judge, budget };
}

test("a read page is judged under the title the harness read, never a provider's title", async () => {
  const { dir, items } = sharedUrlRun({ readable: true, order: ["pa", "pb"] });
  const seen: JudgeInput[] = [];
  assert.equal(await runJudge(ctx(dir, items, recordingJudge(seen))), "done");
  assert.equal(seen.length, 1, "one shared URL with a readable page is judged once");
  assert.equal(seen[0]!.title, "Title the harness read");
  assert.equal(seen[0]!.passage, "The page the harness fetched itself.");
  assert.ok(!/\bp[ab]\b/.test(userMessage(seen[0]!)), "no provider text or id reaches the judge");
});

test("an unreadable page is judged on each provider's own snippet, so one provider's text cannot grade another", async () => {
  const scores: Record<string, number>[] = [];
  for (const order of [["pa", "pb"], ["pb", "pa"]]) {
    const { dir, items } = sharedUrlRun({ readable: false, order });
    const seen: JudgeInput[] = [];
    await runJudge(ctx(dir, items, recordingJudge(seen)));
    assert.equal(seen.length, 2, "each provider's snippet is a pair of its own");
    assert.deepEqual(seen.map((s) => s.title).sort(), ["Title from pa", "Title from pb"]);
    const s = scoreRun(dir, { config: config(), method, items, judgeItemIds: ["i1"] });
    scores.push(Object.fromEntries(s.profiles.map((p) => [p.provider, p.judged!.mean])));
  }
  assert.deepEqual(scores[0], { pa: 1, pb: 0 });
  assert.deepEqual(scores[1], scores[0], "the order providers finished in does not change anyone's judged score");
});

test("the judge sees result URLs without tracking parameters that could name a provider", () => {
  const m = JSON.parse(userMessage({ query: "q", url: "https://x.example/a?utm_source=exa&id=5&UTM_Medium=api#frag", title: null, passage: "p" })) as { url: string };
  assert.equal(m.url, "https://x.example/a?id=5");
});

test("pages are read in a seeded order, not grouped by the provider that returned them", async () => {
  const orders: string[][] = [];
  for (let run = 0; run < 2; run++) {
    const store = tempStore();
    const dir = join(store, "runs", "pages");
    const urls = (p: string) => Array.from({ length: 3 }, (_, k) => `https://${p}-${k}.example/x`);
    for (const p of ["pa", "pb", "pc"]) appendJsonl(runPaths(dir).attempts, attempt(p, 1, "i1", urls(p)));
    const fetched: string[] = [];
    const pageFetcher = {
      crawlDelayMs: async () => 0,
      fetchPage: async (url: string): Promise<FetchedPage> => { fetched.push(url); return { status: "unreadable", url, reason: "status", httpStatus: 404 }; },
    };
    const c = config({ providers: ["pa", "pb", "pc"] });
    await runPages({ ...ctx(dir, [item("i1")], recordingJudge([]), c), method: { ...method, pages: { ...method.pages, maxInFlight: 1, perHostIntervalMs: 0 } }, pageFetcher });
    orders.push(fetched);
  }
  const insertion = ["pa", "pb", "pc"].flatMap((p) => Array.from({ length: 3 }, (_, k) => `https://${p}-${k}.example/x`));
  assert.notDeepEqual(orders[0], insertion);
  assert.deepEqual(orders[0], orders[1], "the order is seeded, so reruns read in the same order");
});

test("with several passes, an item's known-answer score is its mean over every pass", () => {
  const store = tempStore();
  const dir = join(store, "runs", "passes");
  const paths = runPaths(dir);
  const it = item("i1");
  const hit = { rank: 1, url: "https://a.example/x", title: "Zanzibar Quill wrote it", excerpts: [], publishedAt: null };
  const miss = { ...hit, title: "nothing here" };
  for (const p of ["pa", "pb"]) {
    for (const pass of [1, 2]) {
      appendJsonl(paths.attempts, attempt(p, pass, "i1", ["https://a.example/x"]));
      writeJson(paths.rawSearch(pass, p, "default", "i1"), { results: [p === "pa" && pass === 2 ? miss : hit] });
    }
  }
  const c = config({ passes: 2, pagePasses: [1, 2], judgeItems: 0 });
  const s = scoreRun(dir, { config: c, method, items: [it], judgeItemIds: [] });
  const by = Object.fromEntries(s.profiles.map((p) => [p.provider, p.knownAnswer.mean]));
  assert.deepEqual(by, { pa: 0.5, pb: 1 });
});

test("the page check must cover every pass or none, so later passes are not scored on fewer pages", () => {
  const store = tempStore();
  const path = join(store, "run.json");
  writeFileSync(path, JSON.stringify(config({ passes: 3, pagePasses: [1] })));
  assert.throws(() => loadRunConfig(path), /pagePasses/);
  writeFileSync(path, JSON.stringify(config({ passes: 3, pagePasses: [1, 2, 3] })));
  assert.equal(loadRunConfig(path).passes, 3);
});

test("scores report how far apart in time the providers were queried for the same item", () => {
  const store = tempStore();
  const dir = join(store, "runs", "skew");
  const paths = runPaths(dir);
  appendJsonl(paths.attempts, attempt("pa", 1, "i1", [], "2026-11-25T10:00:00.000Z"));
  appendJsonl(paths.attempts, attempt("pb", 1, "i1", [], "2026-11-25T10:00:01.500Z"));
  appendJsonl(paths.attempts, attempt("pa", 1, "i2", [], "2026-11-25T10:01:00.000Z"));
  appendJsonl(paths.attempts, attempt("pb", 1, "i2", [], "2026-11-25T10:01:00.300Z"));
  const s = scoreRun(dir, { config: config({ judgeItems: 0 }), method, items: [item("i1"), item("i2")], judgeItemIds: [] });
  assert.deepEqual(s.timing, { items: 2, p50Ms: 900, p95Ms: 1440, maxMs: 1500 });
});

test("every provider gets the same query, result count, deadline and retries, in a seeded order per item and pass", async () => {
  tempStore();
  const s = openSession({ config: fixtureConfig({ limit: 12, passes: 2, pagePasses: [1, 2], judgeItems: 0 }), mode: "fixture" });
  const calls: { provider: string; query: string; options: Record<string, unknown> }[] = [];
  const real = s.client.search.bind(s.client);
  s.client = { ...s.client, search: (query, options = {}) => { calls.push({ provider: options.provider!, query, options: { ...options } }); return real(query, options); } };
  assert.equal(await runSearch(s), "done");
  const byQuery = new Map<string, typeof calls>();
  for (const c of calls) byQuery.set(c.query, [...(byQuery.get(c.query) ?? []), c]);
  for (const list of byQuery.values()) {
    assert.equal(list.length, s.config.providers.length * 2);
    for (const c of list) {
      const { provider: _p, signal: _s, ...rest } = c.options;
      assert.deepEqual(rest, { fallback: [], maxResults: method.search.maxResults, timeoutMs: method.search.timeoutMs, maxRetries: method.search.maxRetries });
    }
  }
  const firsts = new Set(s.items.map((i) => providerOrder(s.config, i.id, 1)[0]));
  assert.ok(firsts.size >= 3, "different providers go first on different items");
  assert.deepEqual(providerOrder(s.config, s.items[0]!.id, 1), providerOrder(s.config, s.items[0]!.id, 1));
  assert.notDeepEqual(s.items.map((i) => providerOrder(s.config, i.id, 1).join()), s.items.map((i) => providerOrder(s.config, i.id, 2).join()));
});

test("cost never moves a rank", async () => {
  tempStore();
  const s = openSession({ config: fixtureConfig({ judgeItems: 0 }), mode: "fixture" });
  await runSearch(s);
  await runPages(s);
  const before = scoreRun(s.dir, { config: s.config, method: s.method, items: s.items, judgeItemIds: [] });
  const paths = runPaths(s.dir);
  const repriced = readJsonl<AttemptRecord>(paths.attempts).map((a) => ({ ...a, costUsd: a.provider === "fx-strong" ? 9 : 0 }));
  writeFileSync(paths.attempts, repriced.map((a) => `${JSON.stringify(a)}\n`).join(""));
  const after = scoreRun(s.dir, { config: s.config, method: s.method, items: s.items, judgeItemIds: [] });
  const ranks = (x: typeof before) => x.profiles.map((p) => [p.provider, p.rank?.position, p.rank?.group]);
  assert.deepEqual(ranks(after), ranks(before));
});
