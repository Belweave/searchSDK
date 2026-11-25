// Two judges from different vendors: the primary (Kimi K3.1 Pro) and a check
// judge (DeepSeek V4.1 Flash), both through Morph, both blind, same rubric.
// SYNTHETIC chat endpoints and fixture judges only; nothing leaves the process.
import assert from "node:assert/strict";
import { test } from "node:test";
import { fixtureJudge } from "../src/fixtures.ts";
import { createJudge, loadJudgeConfig, type Judge } from "../src/judge/judge.ts";
import { loadMethod } from "../src/run/config.ts";
import { formatPlan, loadRunItems, makePlan } from "../src/run/plan.ts";
import { runPaths, type JudgmentRecord } from "../src/run/records.ts";
import { runJudge, runPages, runSearch } from "../src/run/runner.ts";
import { scoreRun } from "../src/score/score.ts";
import { openSession } from "../src/session.ts";
import { registry } from "../src/sdk.ts";
import { readJsonl } from "../src/util/core.ts";
import { fixtureConfig, tempStore } from "./helpers.ts";

const method = loadMethod();

test("the method names a check judge from a different vendor than the primary", () => {
  assert.equal(method.judge.id, "morph-kimi-k3.1-pro");
  assert.equal(method.judge.checkId, "morph-deepseek-v4.1-flash");
  const primary = loadJudgeConfig(method.judge.id);
  const check = loadJudgeConfig(method.judge.checkId!);
  assert.equal(check.model, "morph-dsv41flash");
  assert.notEqual(check.model, "morph-dsv41flash-abliterated");
  assert.equal(check.keyEnv, primary.keyEnv);
  assert.equal(typeof method.gate.minCrossKappa, "number");
});

test("the check judge sends the same rubric and message, with its own model and no sampling parameters", async () => {
  const bodies: Record<string, unknown>[] = [];
  const fake = (async (_u: unknown, init?: RequestInit) => {
    bodies.push(JSON.parse(String(init?.body)));
    return new Response(JSON.stringify({ choices: [{ message: { content: '{"rationale":"r","grade":2}' } }], usage: { prompt_tokens: 10, completion_tokens: 5 } }), { status: 200 });
  }) as typeof fetch;
  const input = { query: "q", url: "https://x.example/", title: "t", passage: "p" };
  const a = createJudge(method.judge.id, method.judge.rubric, { fetch: fake, env: { MORPH_API_KEY: "k" } });
  const b = createJudge(method.judge.checkId!, method.judge.rubric, { fetch: fake, env: { MORPH_API_KEY: "k" } });
  await a.grade(input);
  await b.grade(input);
  assert.equal(bodies[1]!.model, "morph-dsv41flash");
  assert.deepEqual(bodies[1]!.messages, bodies[0]!.messages, "same system rubric and same blind user message");
  assert.ok(!("temperature" in bodies[1]!) && !("top_p" in bodies[1]!));
  assert.equal(a.info.rubricSha256, b.info.rubricSha256);
});

function alwaysZero(id: string): Judge {
  const base = fixtureJudge([], 0, id);
  return { ...base, grade: async (i) => ({ ...(await base.grade(i)), grade: 0 }) };
}

test("both judges grade every pair; only the primary repeats; cross-judge kappa is reported and gates publication", async () => {
  tempStore();
  const s = openSession({ config: fixtureConfig({ judgeItems: 8 }), mode: "fixture", checkJudge: alwaysZero("disagreeing-check") });
  assert.equal(await runSearch(s), "done");
  assert.equal(await runPages(s), "done");
  assert.equal(await runJudge(s), "done");
  const js = readJsonl<JudgmentRecord>(runPaths(s.dir).judgments);
  const primary = js.filter((j) => j.judge === s.judge!.info.id);
  const check = js.filter((j) => j.judge === "disagreeing-check");
  assert.ok(primary.some((j) => j.repeat === 1), "the primary repeats a share for self-consistency");
  assert.ok(check.every((j) => j.repeat === 0), "the check judge grades each pair once");
  assert.deepEqual(new Set(check.map((j) => j.pairId)), new Set(primary.filter((j) => j.repeat === 0).map((j) => j.pairId)));
  const scores = scoreRun(s.dir, { config: s.config, method: s.method, items: s.items, judgeItemIds: s.plan.judgeItemIds });
  const a = scores.agreement!;
  assert.equal(a.cross!.judge, "disagreeing-check");
  assert.equal(a.cross!.n, a.judged);
  assert.match(a.gateReason, /cross-judge/);
  // The primary's grades decide the judged score. Under a check judge that finds nothing relevant, no item has an ideal, so it has no score.
  const strong = scores.profiles.find((p) => p.provider === "fx-strong")!;
  assert.ok(strong.judged!.mean > 0);
  assert.equal(strong.judgedCheck, null);
});

test("a check judge that mostly agrees passes the cross-judge gate condition and scores beside the primary", async () => {
  tempStore();
  const s = openSession({ config: fixtureConfig({ judgeItems: 12 }), mode: "fixture" });
  assert.equal(s.checkJudge!.info.id, "fixture-check-judge");
  await runSearch(s);
  await runPages(s);
  await runJudge(s);
  const scores = scoreRun(s.dir, { config: s.config, method: s.method, items: s.items, judgeItemIds: s.plan.judgeItemIds });
  assert.ok(scores.agreement!.cross!.kappa!.mean >= s.method.gate.minCrossKappa!);
  assert.doesNotMatch(scores.agreement!.gateReason, /cross-judge/);
  const strong = scores.profiles.find((p) => p.provider === "fx-strong")!;
  assert.ok(strong.judgedCheck && strong.judgedCheck.n > 0);
});

test("the plan lists both judges and what each will grade", () => {
  const config = { ...fixtureConfig(), providers: ["exa", "context"], judgeItems: 96, judgePricing: "covered-by-plan" as const };
  const items = loadRunItems(config);
  const judge = createJudge(method.judge.id, method.judge.rubric, { fetch: fetch, env: {} });
  const checkJudge = createJudge(method.judge.checkId!, method.judge.rubric, { fetch: fetch, env: {} });
  const plan = makePlan({ config, method, items, registry: registry as never, judge, checkJudge });
  assert.equal(plan.checkJudge!.id, "morph-deepseek-v4.1-flash");
  assert.equal(plan.checkJudge!.maxPairs, plan.judge!.maxPairs);
  assert.match(formatPlan(plan, { mode: "live", monthlyCapUsd: 100 }), /morph-deepseek-v4\.1-flash: \d+ pairs, covered by plan/);
});

test("judge pacing counts the call's own time: the cooldown runs from the call's start, not after it", async () => {
  tempStore();
  let t = 0;
  const sleeps: number[] = [];
  const timer = { now: () => t, sleep: async (ms: number) => { sleeps.push(ms); t += ms; } };
  const base = fixtureJudge([], 0, "slow-judge");
  const judge: Judge = { ...base, cooldownMs: () => 10_000, grade: async (i) => { t += 4_000; return base.grade(i); } };
  const s = openSession({ config: fixtureConfig({ judgeItems: 3 }), mode: "fixture", judge, checkJudge: null });
  await runSearch(s);
  await runPages(s);
  assert.equal(await runJudge({ ...s, timer }), "done");
  assert.ok(sleeps.length > 3);
  assert.ok(sleeps.every((ms) => ms === 6_000), `slept ${[...new Set(sleeps)].join(", ")} ms`);
});
