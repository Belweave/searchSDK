// End to end on SYNTHETIC fixture providers and a SYNTHETIC judge: plan,
// search, pages, judge, human check, scoring, ranking and publication.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { fixtureFetch } from "../src/fixtures.ts";
import { labelSession } from "../src/human.ts";
import { buildOutputs, leakCheck, sensitiveStrings, writeOutputs } from "../src/publish/publish.ts";
import { runPaths, type AttemptRecord } from "../src/run/records.ts";
import { runJudge, runPages, runSearch } from "../src/run/runner.ts";
import { scoreRun } from "../src/score/score.ts";
import { openSession } from "../src/session.ts";
import { readJson, readJsonl } from "../src/util/core.ts";
import { fixtureConfig, tempStore } from "./helpers.ts";

async function fullRun(over = {}) {
  tempStore();
  const s = openSession({ config: fixtureConfig(over), mode: "fixture" });
  assert.equal(await runSearch(s), "done");
  assert.equal(await runPages(s), "done");
  assert.equal(await runJudge(s), "done");
  return s;
}

test("fixture run end to end: an always-empty provider ranks last, not first", async () => {
  const s = await fullRun();
  const scores = scoreRun(s.dir, { config: s.config, method: s.method, items: s.items, judgeItemIds: s.plan.judgeItemIds });
  const by = (id: string) => scores.profiles.find((p) => p.provider === id)!;
  // The v1 benchmark counted empty responses as successes; here they are failures with zero quality.
  assert.equal(by("fx-empty").knownAnswer.mean, 0);
  assert.equal(by("fx-empty").reliability.usableRate, 0);
  assert.equal(by("fx-empty").rank!.reliable, false);
  const last = Math.max(...scores.profiles.map((p) => p.rank!.position));
  assert.equal(by("fx-empty").rank!.position, last);
  assert.ok(by("fx-empty").rank!.group > by("fx-strong").rank!.group);
  // The strong provider leads; the flaky one is marked unreliable and ranked below every dependable provider.
  assert.equal(by("fx-strong").rank!.group, 1);
  assert.equal(by("fx-flaky").rank!.reliable, false);
  for (const p of scores.profiles.filter((x) => x.rank!.reliable)) assert.ok(p.rank!.position < by("fx-flaky").rank!.position);
  // Failures score zero: the flaky provider's quality counts its 503s and 429s as misses.
  assert.ok(by("fx-flaky").reliability.rates.server_error! > 0);
  // Unknown prices are never reported as free.
  assert.equal(by("fx-unpriced").cost.known, false);
  // Every scored attempt is in the ledger, and the run spent no more than its cap.
  assert.ok(s.budget.runCashUsd() <= s.config.capUsd);
});

test("fixture run publishes schema-valid outputs with no response text, marked as fixture", async () => {
  const s = await fullRun();
  const io = { ask: async () => "2", say: () => {} };
  await labelSession({ dir: s.dir, config: s.config, method: s.method, plan: s.plan, items: s.items, target: 30, labeller: "test", io });
  const scores = scoreRun(s.dir, { config: s.config, method: s.method, items: s.items, judgeItemIds: s.plan.judgeItemIds });
  assert.ok(scores.agreement);
  assert.equal(scores.agreement.human.n, 30);
  // 30 labels is below the 100 the gate needs, so judged scores are withheld.
  assert.equal(scores.agreement.publishJudged, false);
  const ctx = { dir: s.dir, mode: "fixture" as const, runId: s.runId, config: s.config, method: s.method, items: s.items, registry: s.registry, judge: s.judge!.info, scores, startedAt: s.createdAt, finishedAt: new Date().toISOString() };
  const { files } = writeOutputs(ctx, join(s.dir, "publish"));
  const results = readJson<{ mode: string; liveVerified: boolean; providers: { judged: unknown }[] }>(files[0]!);
  assert.equal(results.mode, "fixture");
  assert.equal(results.liveVerified, false);
  assert.ok(results.providers.every((p) => p.judged === null));
  const lb = readJson<{ mode: string; providers: { id: string }[] }>(files[2]!);
  assert.equal(lb.mode, "fixture");
  assert.equal(lb.providers.at(-1)!.id, "fx-empty");
  // No stored excerpt, page text or judge rationale appears in any published file.
  const all = files.map((f) => readFileSync(f, "utf8")).join("\n");
  assert.ok(!all.includes("Synthetic snippet"));
  assert.ok(!all.includes("Synthetic page"));
  assert.deepEqual(leakCheck(all, sensitiveStrings(s.dir, s.items)), []);
});

test("publication refuses output that contains stored response text", async () => {
  const s = await fullRun({ judgeItems: 0 });
  const scores = scoreRun(s.dir, { config: s.config, method: s.method, items: s.items, judgeItemIds: [] });
  const ctx = { dir: s.dir, mode: "fixture" as const, runId: s.runId, config: s.config, method: s.method, items: s.items, registry: s.registry, judge: null, scores, startedAt: s.createdAt, finishedAt: new Date().toISOString() };
  const o = buildOutputs(ctx);
  const sensitive = sensitiveStrings(s.dir, s.items);
  assert.ok(sensitive.length > 0);
  const leaked = JSON.stringify({ ...o.results, note: sensitive[0] });
  assert.equal(leakCheck(leaked, sensitive).length > 0, true);
});

test("the spend cap stops the run before it is exceeded", async () => {
  tempStore();
  const calls: string[] = [];
  const config = fixtureConfig({ capUsd: 0.05, judgeItems: 0 });
  const base = openSession({ config, mode: "fixture" });
  const s = openSession({ config, mode: "fixture", runId: base.runId, fetch: fixtureFetch(base.items, undefined, { calls }) });
  assert.ok(s.plan.maxUsd > config.capUsd);
  const r = await runSearch(s);
  assert.equal(r, "budget");
  assert.ok(s.budget.runCashUsd() <= config.capUsd + 1e-12, `spent ${s.budget.runCashUsd()}`);
  const attempts = readJsonl<AttemptRecord>(runPaths(s.dir).attempts);
  assert.ok(attempts.length > 0 && attempts.length < s.plan.search.calls);
  // Every request that left the harness has an attempt record: nothing was sent without a reservation.
  assert.equal(calls.length, attempts.length);
});

test("an interrupted run resumes without repeating finished calls", async () => {
  tempStore();
  const config = fixtureConfig({ judgeItems: 0, pagePasses: [] });
  const calls: string[] = [];
  const first = openSession({ config, mode: "fixture" });
  const ac = new AbortController();
  const counting = fixtureFetch(first.items, undefined, { calls });
  const stopAfter = 40;
  const interrupted = openSession({ config, mode: "fixture", runId: first.runId, fetch: ((u: unknown, i?: RequestInit) => {
    if (calls.length >= stopAfter) ac.abort();
    return counting(u as string, i);
  }) as typeof fetch });
  const r1 = await runSearch({ ...interrupted, signal: ac.signal });
  assert.equal(r1, "aborted");
  const before = readJsonl<AttemptRecord>(runPaths(first.dir).attempts).filter((a) => a.outcome !== "aborted").length;
  assert.ok(before > 0 && before < first.plan.search.calls);
  const resumed = openSession({ config, mode: "fixture", runId: first.runId, fetch: counting });
  assert.equal(await runSearch(resumed), "done");
  const all = readJsonl<AttemptRecord>(runPaths(first.dir).attempts).filter((a) => a.outcome !== "aborted");
  const keys = new Set(all.map((a) => a.key));
  assert.equal(keys.size, all.length, "no key recorded twice");
  assert.equal(keys.size, first.plan.search.calls);
});

test("a resumed run refuses a changed plan", async () => {
  tempStore();
  const s = openSession({ config: fixtureConfig({ judgeItems: 0 }), mode: "fixture" });
  assert.throws(() => openSession({ config: fixtureConfig({ judgeItems: 0, seed: 8 }), mode: "fixture", runId: s.runId }), /planned differently/);
});

test("two passes give a test-retest measurement", async () => {
  const s = await fullRun({ passes: 2, pagePasses: [1, 2], judgeItems: 0 });
  const scores = scoreRun(s.dir, { config: s.config, method: s.method, items: s.items, judgeItemIds: [] });
  const strong = scores.profiles.find((p) => p.provider === "fx-strong")!;
  assert.ok(strong.retest);
  assert.ok(strong.retest.n > 50);
  assert.ok(strong.retest.agreement > 0 && strong.retest.agreement <= 1);
});
