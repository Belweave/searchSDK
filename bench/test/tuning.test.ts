// The tuned column (METHOD §8): a separate, seeded tuning split that never
// overlaps the scored items; the same search-space size, items, passes and
// price cap for every provider; selection by known-answer score with a rule
// that keeps the default unless a candidate is clearly better; and the chosen
// setting scored in the main run as a second condition. Fixture runs only.
import { test } from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import type { Item } from "../src/dataset/items.ts";
import { fixtureRegistry } from "../src/fixtures.ts";
import { buildOutputs, loadSchema } from "../src/publish/publish.ts";
import { loadMethod, loadRunConfig, type Method, type RunConfig } from "../src/run/config.ts";
import { loadRunItems, makePlan } from "../src/run/plan.ts";
import { runPaths } from "../src/run/records.ts";
import { runPages, runSearch } from "../src/run/runner.ts";
import { registry as realRegistry, type ProviderSpec } from "../src/sdk.ts";
import { scoreRun } from "../src/score/score.ts";
import { openSession } from "../src/session.ts";
import {
  choose, eligibleCandidates, itemKeys, limitProblems, loadTuning, overlapProblems, resolveTuned, select, spaceProblems,
  tuningRunConfig, withTuned, withTunedWorstCase, type Arm, type TuningConfig,
} from "../src/tune.ts";
import { BENCH_DIR, readJsonl, writeJsonl } from "../src/util/core.ts";
import { validate } from "../src/util/schema.ts";
import { fixtureConfig, item, tempStore } from "./helpers.ts";

const method = loadMethod();
const REAL = realRegistry as unknown as Record<string, ProviderSpec>;
const FX = fixtureRegistry() as unknown as Record<string, ProviderSpec>;

function fxTuning(over: Partial<TuningConfig> = {}): TuningConfig {
  const both = { candidates: [{ providerOptions: { mode: "boosted" } }, { providerOptions: { mode: "plain" } }], excluded: {} };
  return {
    schema: "tuning-spaces/1", name: "tuning-fx",
    split: { datasets: [], storeDatasets: ["split.jsonl"], seed: 11 },
    capUsd: 5, normalizedExcluded: {},
    spaces: { "fx-strong": both, "fx-fair": both, "fx-unpriced": both },
    ...over,
  };
}

/** Writes a synthetic tuning split (public items, disjoint from the committed sets) into the temp store. */
function writeSplit(store: string, n = 20, prefix = "tun"): Item[] {
  const items = Array.from({ length: n }, (_, k) => item(`pub-${prefix}-${String(k).padStart(3, "0")}`, {
    query: `Synthetic tuning question number ${k} about ${prefix}?`,
    answers: [`Answer${prefix}${k}word`],
    class: (["fact.head", "fact.tail", "tech"] as const)[k % 3]!,
    source: { name: "wikidata", url: `https://www.wikidata.org/wiki/Q9${k}`, entity: `Q99${prefix.length}${k}`, statement: `stmt-${prefix}-${k}`, retrievedOn: "2026-11-24" },
  }));
  writeJsonl(join(store, "split.jsonl"), items);
  return items;
}

const arm = (profile: string, scores: (number | null)[], over: Partial<Arm> = {}): Arm => ({
  profile, settings: profile === "default" ? {} : { depth: "fast" }, boundUsd: 0.005, credits: null,
  perItem: scores, usable: scores.filter((x) => x !== null).length, attempts: scores.length, ...over,
});

// ---------- search spaces ----------

test("the published search spaces are complete, documented and the same size for every provider", () => {
  const t = loadTuning(join(BENCH_DIR, "config", "tuning.json"));
  for (const cfg of ["first.json", "pilot.json"]) {
    const run = loadRunConfig(join(BENCH_DIR, "config", cfg));
    assert.deepEqual(spaceProblems(t, REAL, method, run.providers), [], cfg);
    for (const p of run.providers) assert.equal(t.spaces[p]!.candidates.length, method.tuning.maxCandidates, `${cfg}: ${p}`);
  }
});

test("a space with an undocumented option, an empty candidate, a duplicate or too many candidates is refused", () => {
  const base = loadTuning(join(BENCH_DIR, "config", "tuning.json"));
  const bad = (exa: TuningConfig["spaces"][string]) => spaceProblems({ ...base, spaces: { ...base.spaces, exa } }, REAL, method, ["exa"]).join("\n");
  const excluded = base.spaces.exa!.excluded;
  assert.match(bad({ candidates: [{ depth: "fast" }, { providerOptions: { notAnOption: 1 } }], excluded }), /notAnOption.*not a documented/);
  assert.match(bad({ candidates: [{ depth: "fast" }, {}], excluded }), /empty candidate/);
  assert.match(bad({ candidates: [{ depth: "fast" }, { depth: "fast" }], excluded }), /duplicate/);
  assert.match(bad({ candidates: [{ depth: "fast" }, { depth: "deep" }, { country: "US" }], excluded }), /at most 2/);
  assert.match(bad({ candidates: [{ depth: "fast" }], excluded }), /exactly 2/);
  assert.match(bad({ candidates: [{ depth: "fast" }, { depth: "standard" }], excluded }), /standard is the default/);
  assert.match(bad({ candidates: [{ depth: "fast" }, { providerOptions: { category: "not-a-category" } }], excluded }), /category.*not in enum/);
  // Every documented option is either a candidate or excluded with a published reason.
  const { category: _drop, ...rest } = excluded;
  assert.match(bad({ candidates: [{ depth: "fast" }, { depth: "deep" }], excluded: rest }), /category: documented but neither a candidate nor excluded/);
});

test("candidates above the per-call price cap, or without a cost bound, are excluded before any call", () => {
  const t = fxTuning();
  const { candidates, rejected } = eligibleCandidates(t, FX, { ...method, tuning: { ...method.tuning, maxCostPerCallUsd: 0.003 } }, ["fx-strong", "fx-fair", "fx-unpriced"]);
  // fx-strong lists at $0.005 a call: above a $0.003 cap. fx-unpriced has no public price.
  assert.deepEqual(candidates["fx-strong"], []);
  assert.equal(candidates["fx-fair"]!.length, 2);
  assert.deepEqual(candidates["fx-unpriced"], []);
  assert.ok(rejected.some((r) => r.provider === "fx-strong" && /above the cap/.test(r.reason)));
  assert.ok(rejected.some((r) => r.provider === "fx-unpriced" && /price not public/.test(r.reason)));
});

test("the real spaces fit the price cap with the SDK's cost bound", () => {
  const t = loadTuning(join(BENCH_DIR, "config", "tuning.json"));
  const run = loadRunConfig(join(BENCH_DIR, "config", "first.json"));
  const { candidates, rejected } = eligibleCandidates(t, REAL, method, run.providers);
  assert.deepEqual(rejected, []);
  for (const p of run.providers) for (const c of candidates[p]!) assert.ok(c.boundUsd !== null && c.boundUsd <= method.tuning.maxCostPerCallUsd, p);
});

// ---------- the split ----------

test("the tuning split is checked against every scored item by id, query, Wikidata statement and subject", () => {
  const scored = [
    item("pub-a", { query: "What is the capital of Atlantis?", source: { name: "wikidata", url: "u", entity: "Q1", statement: "s1", retrievedOn: "2026-11-24" } }),
    item("fresh-b", { split: "fresh", class: "fresh", query: "Latest version of Foo?", source: { name: "wikidata", url: "u", entity: "Q2", statement: "s2", retrievedOn: "2026-11-24" } }),
  ];
  const t = (over: Partial<Item>) => itemKeys([item("pub-t", { query: "Something else entirely?", source: { name: "wikidata", url: "u", entity: "Q9", statement: "s9", retrievedOn: "2026-11-24" }, ...over })]);
  assert.deepEqual(overlapProblems(t({}), scored), []);
  assert.match(overlapProblems(t({ id: "pub-a" }), scored).join(), /same id pub-a/);
  assert.match(overlapProblems(t({ query: "what is the CAPITAL of Atlantis" }), scored).join(), /same query/);
  assert.match(overlapProblems(t({ source: { name: "wikidata", url: "u", entity: "Q8", statement: "s2", retrievedOn: "2026-11-24" } }), scored).join(), /same Wikidata statement/);
  // The same subject asked in another language or through another property still leaks it.
  assert.match(overlapProblems(t({ source: { name: "wikidata", url: "u", entity: "Q1", statement: "s7", retrievedOn: "2026-11-24" } }), scored).join(), /same Wikidata subject Q1/);
});

test("tuning refuses a split that overlaps the run's scored sets", () => {
  const store = tempStore();
  const scored = loadRunItems(fixtureConfig());
  writeJsonl(join(store, "split.jsonl"), [scored[0]!, ...writeSplit(store, 5)]);
  assert.throws(() => tuningRunConfig(fxTuning(), fixtureConfig({ providers: ["fx-strong", "fx-fair"] }), FX, method), /overlaps the scored items.*same id/s);
});

test("every provider gets the same split, items and passes; limits carry over from the run", () => {
  const store = tempStore();
  writeSplit(store);
  const run = fixtureConfig({ providers: ["fx-strong", "fx-fair"], providerLimits: { "fx-fair": { calls: 500, since: "2026-11-25" } } });
  const { config } = tuningRunConfig(fxTuning(), run, FX, method);
  assert.equal(config.limit, method.tuning.splitItems);
  assert.equal(config.passes, method.tuning.passes);
  assert.equal(config.judgeItems, 0, "judges are off for tuning");
  assert.deepEqual(config.providerLimits, run.providerLimits);
  assert.deepEqual(config.profiles, ["default", "t1", "t2"]);
  const plan = makePlan({ config, method, items: loadRunItems(config), registry: FX, judge: null, checkCommitted: false });
  const calls = plan.providers.map((p) => p.profiles.reduce((a, x) => a + x.calls, 0));
  assert.deepEqual(calls, [3 * method.tuning.splitItems, 3 * method.tuning.splitItems]);
});

// ---------- selection ----------

test("selection keeps the default unless a candidate is clearly better: at least 6 points and an interval above zero", () => {
  const n = 16;
  const d = Array.from({ length: n }, (_, i) => (i < 8 ? 1 : 0));
  // One more item right: 6.25 points, but a paired interval that reaches zero.
  const small = choose("p", [arm("default", d), arm("t1", d.map((x, i) => (i === 8 ? 1 : x)))], method);
  assert.equal(small.chosen, "default");
  assert.match(small.reason, /no candidate is clearly better/);
  // Four more right and none lost: clear.
  const big = choose("p", [arm("default", d), arm("t1", d.map((x, i) => (i >= 8 && i < 12 ? 1 : x)))], method);
  assert.equal(big.chosen, "t1");
  const t1 = big.evidence.find((e) => e.profile === "t1")!;
  assert.ok(t1.gain!.mean >= 0.06 && t1.gain!.lo > 0);
});

test("cost never makes a candidate win; it only breaks an exact tie between clear winners", () => {
  const d = Array.from({ length: 16 }, (_, i) => (i < 8 ? 1 : 0));
  const better = d.map((x, i) => (i >= 8 && i < 13 ? 1 : x));
  // Equal scores to the default, cheaper: the default stays.
  const cheap = choose("p", [arm("default", d, { boundUsd: 0.007 }), arm("t1", d, { boundUsd: 0.001 })], method);
  assert.equal(cheap.chosen, "default");
  // Two clear winners with the same score: the cheaper bound wins the tie.
  const tie = choose("p", [arm("default", d), arm("t1", better, { boundUsd: 0.015 }), arm("t2", better, { boundUsd: 0.004 })], method);
  assert.equal(tie.chosen, "t2");
  // A higher score beats a cheaper one.
  const best = choose("p", [arm("default", d), arm("t1", better.map((x, i) => (i === 13 ? 1 : x)), { boundUsd: 0.015 }), arm("t2", better, { boundUsd: 0.004 })], method);
  assert.equal(best.chosen, "t1");
});

test("an incomplete or unreliable candidate cannot win", () => {
  const d = Array.from({ length: 16 }, (_, i) => (i < 4 ? 1 : 0));
  const all = d.map(() => 1);
  const gaps = choose("p", [arm("default", d), arm("t1", all.map((x, i) => (i === 3 ? null : x)))], method);
  assert.equal(gaps.chosen, "default");
  assert.match(gaps.evidence.find((e) => e.profile === "t1")!.reason, /not scored on every/);
  const flaky = choose("p", [arm("default", d), arm("t1", all, { usable: 10, attempts: 16 })], method);
  assert.equal(flaky.chosen, "default");
  assert.match(flaky.evidence.find((e) => e.profile === "t1")!.reason, /unreliable/);
});

// ---------- the tuned condition in the main run ----------

test("a selection is refused when its split overlaps the run, when made under another method, or when a provider is missing", () => {
  const store = tempStore();
  writeSplit(store);
  const run = fixtureConfig({ providers: ["fx-strong", "fx-fair"] });
  const sel = { schema: "tuning-selection/2", method: method.method, split: { keys: itemKeys(loadRunItems(run).slice(0, 1)) }, providers: { "fx-strong": { settings: {} }, "fx-fair": { settings: {} } } } as never;
  assert.throws(() => withTuned(run, sel, method), /overlaps the scored items/);
  const ok = { schema: "tuning-selection/2", method: method.method, split: { keys: itemKeys(readJsonl<Item>(join(store, "split.jsonl"))) }, providers: { "fx-strong": { settings: {} } } } as never;
  assert.throws(() => withTuned(run, ok, method), /no selection for fx-fair/);
  assert.throws(() => withTuned(run, { ...(ok as object), method: "0.0.1" } as never, method), /method 0\.0\.1/);
});

test("a run whose config asks for the tuned condition needs a selection or an explicit --no-tuned", () => {
  const run = loadRunConfig(join(BENCH_DIR, "config", "first.json"));
  assert.ok(run.tuning, "first.json includes the tuned condition");
  assert.throws(() => resolveTuned(run, { registry: REAL, method, forPlan: false }), /--tuned <selection.json>.*--no-tuned/s);
  const headline = resolveTuned(run, { registry: REAL, method, forPlan: false, noTuned: true });
  assert.deepEqual(headline.profiles, ["default"]);
  // The plan, before any selection, shows the dearest candidate of each space as the worst case.
  const worst = resolveTuned(run, { registry: REAL, method, forPlan: true });
  assert.equal(worst.tuned?.status, "worst-case");
  assert.deepEqual(worst.settings!.tuned!.exa, { depth: "deep" });
});

test("the first run's plan fits Firecrawl's 800 credits with tuning and the tuned condition, with room left", () => {
  const run = loadRunConfig(join(BENCH_DIR, "config", "first.json"));
  const t = loadTuning(join(BENCH_DIR, "config", "tuning.json"));
  const main = withTunedWorstCase(run, t, REAL, method);
  const items = loadRunItems(main);
  // Provider spend only; judging is covered by the Morph plan and draws no provider credits.
  const plan = makePlan({ config: { ...main, judgeItems: 0 }, method, items, registry: REAL, judge: null, checkCommitted: false });
  const fc = plan.providers.find((p) => p.id === "firecrawl")!;
  const tunedCalls = fc.profiles.find((x) => x.profile === "tuned")!.calls;
  assert.equal(tunedCalls, method.tuning.conditionItems * method.tuning.conditionPasses.length);
  const tuningCalls = (1 + method.tuning.maxCandidates) * method.tuning.splitItems * method.tuning.passes;
  const smoke = 5;
  const total = smoke + fc.credits!.planned! + 2 * tuningCalls;
  assert.ok(total <= 800 - 40, `firecrawl would use ${total} of 800 credits`);
  // Every provider's tuned condition is the same size.
  for (const p of plan.providers) assert.equal(p.profiles.find((x) => x.profile === "tuned")!.calls, tunedCalls, p.id);
  assert.ok(plan.maxUsd <= run.capUsd, `worst case ${plan.maxUsd} within the cap ${run.capUsd}`);
});

test("tuning is refused when it would leave a limited provider without room for the main run", () => {
  const problems = limitProblems({ limits: { firecrawl: { credits: 800, since: "2026-11-25" } }, used: { firecrawl: 5 }, tuning: { firecrawl: 96 }, main: { firecrawl: 640 } });
  assert.deepEqual(problems, []);
  const over = limitProblems({ limits: { firecrawl: { credits: 800 } }, used: { firecrawl: 100 }, tuning: { firecrawl: 96 }, main: { firecrawl: 640 } });
  assert.match(over.join(), /firecrawl: 100 used \+ 96 tuning \+ 640 main run = 836, above its limit of 800/);
});

test("end to end: tune on the split, then score the tuned condition on a seeded subset of the run's items, beside the default", async () => {
  const store = tempStore();
  writeSplit(store);
  const providers = ["fx-strong", "fx-fair", "fx-unpriced"];
  const run = fixtureConfig({ providers, judgeItems: 0, passes: 2, pagePasses: [1, 2] });
  const t = fxTuning();
  // Tuning run.
  const { config: tc, rejected } = tuningRunConfig(t, run, FX, method);
  const ts = openSession({ config: tc, mode: "fixture" });
  assert.equal(await runSearch(ts), "done");
  assert.equal(await runPages(ts), "done");
  const tScores = scoreRun(ts.dir, { config: ts.config, method: ts.method, items: ts.items, judgeItemIds: [] });
  const sel = select({ runId: ts.runId, mode: "fixture", tuning: t, tuningConfigSha256: "x", config: ts.config, scores: tScores, registry: ts.registry, method: ts.method, rejected, items: ts.items });
  assert.deepEqual(Object.keys(sel.providers).sort(), providers.slice().sort());
  assert.equal(sel.split.n, method.tuning.splitItems);
  // The boosted fixture mode lifts the hit rate a lot, so it wins for the priced providers; fx-unpriced has no candidates.
  assert.equal(sel.providers["fx-fair"]!.chosen, "t1");
  assert.deepEqual(sel.providers["fx-fair"]!.settings, { providerOptions: { mode: "boosted" } });
  assert.equal(sel.providers["fx-unpriced"]!.chosen, "default");
  for (const p of providers) assert.equal(sel.providers[p]!.evidence.find((e) => e.profile === "default")!.n, method.tuning.splitItems);

  // Main run with the tuned condition.
  const main = withTuned(run, sel, method);
  const s = openSession({ config: main, mode: "fixture" });
  const tunedCalls = (id: string) => s.plan.providers.find((p) => p.id === id)!.profiles.find((x) => x.profile === "tuned")?.calls;
  assert.equal(tunedCalls("fx-fair"), method.tuning.conditionItems);
  assert.equal(tunedCalls("fx-unpriced"), 0, "a provider whose choice is its default reuses its default calls");
  assert.equal(await runSearch(s), "done");
  assert.equal(await runPages(s), "done");
  const attempts = readJsonl<{ profile: string; provider: string; pass: number; itemId: string }>(runPaths(s.dir).attempts);
  const tuned = attempts.filter((a) => a.profile === "tuned");
  assert.ok(tuned.every((a) => a.pass === 1), "the tuned condition runs on pass 1 only");
  assert.equal(new Set(tuned.map((a) => a.itemId)).size, method.tuning.conditionItems);
  assert.ok(!tuned.some((a) => a.provider === "fx-unpriced"));
  // The same seeded subset for every provider that sends tuned calls; the others are scored on it from their default calls.
  const subset = (p: string) => tuned.filter((a) => a.provider === p).map((a) => a.itemId).sort().join();
  assert.equal(subset("fx-fair"), [...s.plan.scopes.tuned!.items].sort().join());
  if (sel.providers["fx-strong"]!.chosen !== "default") assert.equal(subset("fx-strong"), subset("fx-fair"));

  const scores = scoreRun(s.dir, { config: s.config, method: s.method, items: s.items, judgeItemIds: [] });
  const fair = scores.profiles.find((p) => p.provider === "fx-fair" && p.profile === "tuned")!;
  assert.equal(fair.n, method.tuning.conditionItems);
  assert.equal(fair.rank, null, "the tuned condition is never ranked");
  assert.ok(fair.vsDefault && fair.vsDefault.n === method.tuning.conditionItems);
  const unpriced = scores.profiles.find((p) => p.provider === "fx-unpriced" && p.profile === "tuned")!;
  assert.equal(unpriced.knownAnswer.mean, unpriced.vsDefault!.default.mean, "reused default calls score the same as the matched default");
  assert.ok(scores.profiles.filter((p) => p.profile === "default").every((p) => p.rank !== null));

  // Published outputs: default and tuned side by side, settings, cost bound against the cap, and the evidence.
  const out = buildOutputs({
    dir: s.dir, mode: "fixture", runId: s.runId, config: s.config, method: s.method, items: s.items, registry: s.registry,
    judge: null, checkJudge: null, scores, startedAt: s.createdAt, finishedAt: new Date().toISOString(),
  });
  assert.deepEqual(validate(out.results, loadSchema("results-1")), []);
  assert.deepEqual(validate(out.leaderboard, loadSchema("leaderboard-1")), []);
  const row = out.results.tuning!.providers.find((p) => p.provider === "fx-fair")!;
  assert.deepEqual(row.settings, { providerOptions: { mode: "boosted" } });
  assert.equal(row.capUsd, method.tuning.maxCostPerCallUsd);
  assert.ok(row.costBoundUsd !== null && row.costBoundUsd <= row.capUsd);
  assert.equal(row.default!.n, scores.profiles.find((p) => p.provider === "fx-fair" && p.profile === "default")!.n);
  assert.equal(row.tuned!.n, method.tuning.conditionItems);
  assert.deepEqual(row.evidence.map((e) => e.profile), ["default", "t1", "t2"]);
  assert.ok(row.evidence.every((e) => e.knownAnswer?.ci95.length === 2));
  const lb = out.leaderboard.providers.find((p) => p.id === "fx-fair")!;
  assert.deepEqual(lb.knownAnswer, out.results.providers.find((p) => p.provider === "fx-fair" && p.profile === "default")!.knownAnswer, "the headline stays the default");
  assert.ok(lb.tuned);
});
