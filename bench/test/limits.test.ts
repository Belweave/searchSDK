// Per-provider credit and call limits: a provider with a hard account limit
// (Firecrawl's remaining credits) stops before the limit, while the others
// carry on. The limit spans every run and smoke check in the ledger. SYNTHETIC
// fixture providers and an offline plan only.
import assert from "node:assert/strict";
import { join } from "node:path";
import { test } from "node:test";
import { Budget, poolUsage } from "../src/run/budget.ts";
import { loadMethod } from "../src/run/config.ts";
import { formatPlan, loadRunItems, makePlan } from "../src/run/plan.ts";
import { creditReservation } from "../src/run/pricing.ts";
import { runPaths, type AttemptRecord, type EventRecord } from "../src/run/records.ts";
import { runSearch } from "../src/run/runner.ts";
import { openSession } from "../src/session.ts";
import { registry, type ProviderSpec } from "../src/sdk.ts";
import { readJsonl } from "../src/util/core.ts";
import { fixtureConfig, tempStore } from "./helpers.ts";

const method = loadMethod();
const reg = registry as unknown as Record<string, ProviderSpec>;

test("credits per call come from the registry's credit pricing", () => {
  assert.equal(creditReservation(reg.firecrawl!, "search", 10, {}), 2, "2 credits per 10 results");
  assert.equal(creditReservation(reg.firecrawl!, "search", 11, {}), 4);
  assert.equal(creditReservation(reg.firecrawl!, "contents", 1, {}), 1, "1 credit per scraped page");
  assert.equal(creditReservation(reg.context!, "search", 10, {}), 1);
  assert.equal(creditReservation(reg.exa!, "search", 10, {}), null, "priced in dollars, not credits");
});

test("a provider limit refuses the call that would pass it, across runs, and actual credits replace reservations", () => {
  const store = tempStore();
  const ledgerPath = join(store, "ledger.jsonl");
  const limits = { firecrawl: { credits: 7, since: "2026-11-01" } };
  const now = () => Date.parse("2026-11-25T12:00:00Z");
  const smoke = new Budget({ ledgerPath, runId: "smoke", runCapUsd: 1, monthlyCapUsd: 100, providerLimits: limits, now });
  const h = smoke.reserve("firecrawl", "search", 0.01, 2)!;
  smoke.commit(h, 0.0076, 2);
  const c = smoke.reserve("firecrawl", "contents", 0.005, 1)!;
  smoke.commit(c, null, null); // unknown actual: the reservation stands
  assert.deepEqual(poolUsage(ledgerPath, "firecrawl", "2026-11-01"), { credits: 3, calls: 2 });
  const run = new Budget({ ledgerPath, runId: "run", runCapUsd: 1, monthlyCapUsd: 100, providerLimits: limits, now });
  assert.equal(run.providerRefusal("firecrawl", 2), null);
  const a = run.reserve("firecrawl", "search", 0.01, 2)!;
  assert.equal(run.providerRefusal("firecrawl", 2), null, "3 + 2 open + 2 = 7, at the limit");
  const b = run.reserve("firecrawl", "search", 0.01, 2)!;
  assert.match(run.providerRefusal("firecrawl", 2) ?? "", /firecrawl: 7 of 7 credits/);
  run.commit(a, 0.0038, 1); // the provider reported 1 credit: 1 of the 2 reserved comes back
  assert.match(run.providerRefusal("firecrawl", 2) ?? "", /limit/);
  assert.equal(run.providerRefusal("firecrawl", 1), null);
  run.commit(b, 0.0076, 2);
  assert.equal(run.providerRefusal("exa", 5), null, "no limit, no refusal");
  // Credits used before `since` do not count.
  assert.deepEqual(poolUsage(ledgerPath, "firecrawl", "2026-12-01"), { credits: 0, calls: 0 });
});

test("a call limit stops only that provider; the others finish the run", async () => {
  tempStore();
  const s = openSession({ config: fixtureConfig({ judgeItems: 0, limit: 20, providerLimits: { "fx-fair": { calls: 5 } } }), mode: "fixture" });
  assert.equal(await runSearch(s), "done");
  const attempts = readJsonl<AttemptRecord>(runPaths(s.dir).attempts);
  const count = (p: string) => attempts.filter((a) => a.provider === p).length;
  assert.equal(count("fx-fair"), 5);
  assert.equal(count("fx-strong"), 20);
  const events = readJsonl<EventRecord>(runPaths(s.dir).events);
  assert.ok(events.some((e) => e.event === "provider-stopped" && e.provider === "fx-fair" && /limit/.test(e.detail ?? "")));
});

test("the plan shows each limited provider's credits and warns when a run cannot fit", () => {
  const base = { ...fixtureConfig(), providers: ["exa", "context", "firecrawl", "tinyfish"], passes: 3, pagePasses: [1, 2, 3], judgeItems: 0 };
  const items = loadRunItems(base);
  const fits = makePlan({ config: { ...base, providerLimits: { firecrawl: { credits: 800, since: "2026-11-25" } } }, method, items, registry: reg, judge: null });
  const fc = fits.providers.find((p) => p.id === "firecrawl")!;
  assert.deepEqual(fc.credits, { perCall: 2, planned: 576, limit: 800, since: "2026-11-25" });
  assert.match(formatPlan(fits, { mode: "live", monthlyCapUsd: 100, creditsUsed: { firecrawl: 7 } }), /firecrawl\s+2 per call x 288 calls = 576 credits; limit 800 since 2026-11-25, 7 used, 217 to spare/);
  const tight = makePlan({ config: { ...base, providerLimits: { firecrawl: { credits: 500 } } }, method, items, registry: reg, judge: null });
  assert.ok(tight.providers.find((p) => p.id === "firecrawl")!.warnings.some((w) => /576 credits.*limit of 500/.test(w)));
  assert.throws(() => makePlan({ config: { ...base, providerLimits: { exa: { credits: 10 } } }, method, items, registry: reg, judge: null }), /exa.*credit/);
});
