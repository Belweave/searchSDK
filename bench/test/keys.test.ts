// Key checks and the explicit "not judged" choice. Synthetic key values only;
// the tests assert that no value, or anything derived from one, is printed.
import assert from "node:assert/strict";
import { chmodSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { createJudge } from "../src/judge/judge.ts";
import { keyReport, keysFileReport, withoutJudging } from "../src/keys.ts";
import { loadMethod, loadRunConfig } from "../src/run/config.ts";
import { formatPlan, loadRunItems, makePlan } from "../src/run/plan.ts";
import { liveGuards } from "../src/session.ts";
import { registry, type ProviderSpec } from "../src/sdk.ts";
import { tempStore } from "./helpers.ts";

const method = loadMethod();
const reg = registry as unknown as Record<string, ProviderSpec>;
const first = () => loadRunConfig("config/first.json");
const SECRETS = { EXA_API_KEY: "exa-SECRET-1111", FIRECRAWL_API_KEY: "fc-SECRET-22", MORPH_API_KEY: "morph-SECRET-333" };

test("the first-run config: four providers, three passes, every pass paged, both judges, Firecrawl held to 800 credits", () => {
  const c = first();
  assert.deepEqual(c.providers, ["exa", "context", "firecrawl", "tinyfish"]);
  assert.equal(c.passes, 3);
  assert.deepEqual(c.pagePasses, [1, 2, 3]);
  assert.equal(c.judgePricing, "covered-by-plan");
  assert.ok(c.providerLimits!.firecrawl!.credits! <= 800);
  const items = loadRunItems(c);
  assert.equal(items.length, 96);
  const judge = createJudge(method.judge.id, method.judge.rubric, { fetch, env: {} });
  const plan = makePlan({ config: c, method, items, registry: reg, judge });
  assert.equal(plan.judge!.pricing, "covered-by-plan");
  assert.ok(plan.maxUsd <= c.capUsd, "the worst case fits under the cap");
  assert.ok(c.capUsd <= plan.maxUsd * 1.5, "with modest headroom only");
  assert.ok(plan.providers.find((p) => p.id === "firecrawl")!.credits!.planned! <= c.providerLimits!.firecrawl!.credits! - 30, "room for smoke checks and resumed calls");
});

test("bench keys names each needed variable as present or missing, and never prints a value", () => {
  const r = keyReport(first(), method, reg, SECRETS, { noJudge: false });
  assert.equal(r.ok, false);
  assert.deepEqual(r.missing, ["CONTEXT_DEV_API_KEY", "TINYFISH_API_KEY"]);
  for (const v of Object.values(SECRETS)) {
    assert.ok(!r.text.includes(v), "no value");
    assert.ok(!r.text.includes(String(v.length)), "no length");
  }
  assert.match(r.text, /exa\s+EXA_API_KEY\s+present/);
  assert.match(r.text, /context\s+CONTEXT_DEV_API_KEY\s+missing/);
  assert.match(r.text, /judges\s+MORPH_API_KEY\s+present/);
  assert.match(r.text, /BENCH_ALLOW_LIVE\s+not set/);
  const all = { ...SECRETS, CONTEXT_DEV_API_KEY: "c-SECRET", TINYFISH_API_KEY: "t-SECRET" };
  assert.equal(keyReport(first(), method, reg, all, { noJudge: false }).ok, true);
  const noMorph = keyReport(first(), method, reg, { ...all, MORPH_API_KEY: "" }, { noJudge: false });
  assert.equal(noMorph.ok, false);
  assert.match(noMorph.text, /--no-judge/);
  const notJudged = keyReport(first(), method, reg, { ...all, MORPH_API_KEY: "" }, { noJudge: true });
  assert.equal(notJudged.ok, true);
  assert.match(notJudged.text, /judges\s+MORPH_API_KEY\s+not needed \(--no-judge/);
});

test("the keys file check reports its permissions without reading it", () => {
  const store = tempStore();
  const path = join(store, "keys.env");
  writeFileSync(path, "EXA_API_KEY=exa-SECRET-1111\n");
  chmodSync(path, 0o644);
  const loose = keysFileReport(path);
  assert.match(loose, /mode 644.*chmod 600/);
  chmodSync(path, 0o600);
  assert.match(keysFileReport(path), /mode 600/);
  assert.ok(!keysFileReport(path).includes("SECRET"));
  assert.match(keysFileReport(join(store, "absent.env")), /not found/);
});

test("--no-judge is an explicit choice: no judge key needed, nothing judged, and the run is named as not judged", () => {
  const c = withoutJudging(first());
  assert.equal(c.judgeItems, 0);
  assert.equal(c.name, "first-notjudged");
  assert.match(c.description ?? "", /NOT JUDGED/);
  const env = { ...SECRETS, CONTEXT_DEV_API_KEY: "c", TINYFISH_API_KEY: "t", BENCH_ALLOW_LIVE: "1" };
  const guards = (config: typeof c) => liveGuards({ env: { ...env, MORPH_API_KEY: "" }, registry: reg, config, method, judgeKeyEnv: config.judgeItems ? "MORPH_API_KEY" : null });
  assert.match(guards(first()).join(), /MORPH_API_KEY is not set.*--no-judge/);
  assert.deepEqual(guards(c), []);
  const plan = makePlan({ config: c, method, items: loadRunItems(c), registry: reg, judge: null });
  assert.match(formatPlan(plan, { mode: "live", monthlyCapUsd: 100 }), /judges: off \(--no-judge\): known-answer scoring only; results are marked not judged/);
});
