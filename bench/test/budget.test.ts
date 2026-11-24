// The spend guard and price arithmetic.
import assert from "node:assert/strict";
import { join } from "node:path";
import { test } from "node:test";
import { Budget } from "../src/run/budget.ts";
import { loadMethod } from "../src/run/config.ts";
import { paceFor, Pacer } from "../src/run/pacer.ts";
import { reservation } from "../src/run/pricing.ts";
import { costBound, registry, type ProviderSpec } from "../src/sdk.ts";
import { tempStore } from "./helpers.ts";

const reg = registry as unknown as Record<string, ProviderSpec>;
const method = loadMethod();
const NOV = Date.parse("2026-11-24T12:00:00Z");

test("a reservation that could pass the run cap is refused, and spend never exceeds it", () => {
  const ledger = join(tempStore(), "ledger.jsonl");
  const b = new Budget({ ledgerPath: ledger, runId: "r1", runCapUsd: 1, monthlyCapUsd: 100, now: () => NOV });
  let held = 0;
  for (;;) {
    const h = b.reserve("exa", "search", 0.3);
    if (!h) break;
    held++;
    b.commit(h, 0.3);
  }
  assert.equal(held, 3);
  assert.ok(b.runCashUsd() <= 1);
  // A smaller call still fits under the cap.
  const h = b.reserve("exa", "search", 0.1);
  assert.ok(h);
  b.commit(h, 0.05);
  assert.ok(Math.abs(b.runCashUsd() - 0.95) < 1e-12);
});

test("an unknown actual cost keeps the reservation; an overrun halts", () => {
  const b = new Budget({ ledgerPath: join(tempStore(), "l.jsonl"), runId: "r", runCapUsd: 10, monthlyCapUsd: 100, now: () => NOV });
  const h1 = b.reserve("tinyfish", "search", 0.05)!;
  b.commit(h1, null);
  assert.equal(b.runCashUsd(), 0.05);
  const h2 = b.reserve("exa", "search", 0.01)!;
  assert.equal(b.commit(h2, 0.02), true);
  assert.match(b.halted!, /above its reservation/);
  assert.equal(b.reserve("exa", "search", 0.001), null);
});

test("the monthly cap spans runs, and crashed reservations count in full", () => {
  const ledger = join(tempStore(), "ledger.jsonl");
  const a = new Budget({ ledgerPath: ledger, runId: "a", runCapUsd: 80, monthlyCapUsd: 100, now: () => NOV });
  for (let i = 0; i < 7; i++) a.commit(a.reserve("exa", "search", 10)!, 10);
  a.reserve("exa", "search", 5); // never committed: a crash mid-call
  const b = new Budget({ ledgerPath: ledger, runId: "b", runCapUsd: 80, monthlyCapUsd: 100, now: () => NOV });
  assert.equal(b.monthCashUsd(), 75);
  assert.equal(b.runCashUsd(), 0);
  assert.equal(b.reserve("exa", "search", 26), null);
  assert.ok(b.reserve("exa", "search", 25));
  // A new month starts from zero.
  const dec = new Budget({ ledgerPath: ledger, runId: "c", runCapUsd: 80, monthlyCapUsd: 100, now: () => Date.parse("2026-12-01T00:00:00Z") });
  assert.equal(dec.monthCashUsd(), 0);
});

test("a resumed run keeps counting its own earlier spend against its cap", () => {
  const ledger = join(tempStore(), "ledger.jsonl");
  const first = new Budget({ ledgerPath: ledger, runId: "r", runCapUsd: 10, monthlyCapUsd: 100, now: () => NOV });
  first.commit(first.reserve("exa", "search", 8)!, 8);
  const again = new Budget({ ledgerPath: ledger, runId: "r", runCapUsd: 10, monthlyCapUsd: 100, now: () => NOV });
  assert.equal(again.runCashUsd(), 8);
  assert.equal(again.reserve("exa", "search", 3), null);
});

test("declared credits are spent before cash", () => {
  const b = new Budget({ ledgerPath: join(tempStore(), "l.jsonl"), runId: "r", runCapUsd: 1, monthlyCapUsd: 100, creditsUsd: { "judge:k": 5 }, now: () => NOV });
  for (let i = 0; i < 4; i++) b.commit(b.reserve("judge:k", "judge", 1)!, 1);
  assert.equal(b.runCashUsd(), 0);
  assert.equal(b.runGrossUsd(), 4);
  b.commit(b.reserve("judge:k", "judge", 1.5)!, 1.5);
  assert.equal(b.runCashUsd(), 0.5);
  assert.equal(b.reserve("judge:k", "judge", 0.6), null);
});

test("a reservation is the SDK's cost bound, with no margin added", () => {
  const r = (id: string, s = {}, n = 10) => reservation(reg[id]!, "search", n, s, method);
  assert.equal(r("exa").usd, 0.007);
  assert.equal(r("exa", { depth: "deep" }).usd, 0.015); // top of Exa's published $12-15 range
  assert.equal(r("exa", {}, 12).usd, 0.007 + 2 * 0.001);
  assert.equal(r("tavily", { depth: "deep" }).usd, 0.016);
  assert.equal(r("context").usd, 0.003); // Developer overage rate
  assert.equal(r("context", {}, 11).usd, 0.006);
  assert.equal(r("firecrawl").usd, 0.01); // Hobby extra credits
  assert.equal(r("brave").usd, 0.005);
  assert.equal(r("perplexity", { depth: "fast" }).usd, 0.001);
  const tf = r("tinyfish");
  assert.equal(tf.usd, 0);
  assert.equal(tf.requiresOverageOff, true);
  for (const id of Object.keys(reg)) {
    const b = costBound(reg[id]!, "search", { maxResults: 10 });
    assert.equal(r(id).usd, b.usd ?? method.budget.unknownPriceUsd, id);
  }
});

test("a call the SDK cannot bound reserves the configured worst case, above every known bound", () => {
  const r = reservation(reg.exa!, "search", 10, { providerOptions: { contents: { text: true } } }, method);
  assert.equal(r.boundUsd, null);
  assert.equal(r.usd, method.budget.unknownPriceUsd);
  for (const id of Object.keys(reg)) {
    const known = reservation(reg[id]!, "search", 10, reg[id]!.search!.request.params.depth ? { depth: "deep" } : {}, method);
    if (known.boundUsd !== null) assert.ok(known.usd <= r.usd, id);
  }
});

test("pacing keeps to half the strictest documented limit", () => {
  const p = paceFor(reg.context!.search!.rateLimits as never, undefined, 0.5, 2);
  assert.equal(p.intervalMs, 12000); // 10 per minute at half rate
  assert.equal(p.maxInFlight, 1); // 2 concurrent at half
  const dev = paceFor(reg.context!.search!.rateLimits as never, "Developer", 0.5, 2);
  assert.equal(dev.intervalMs, 0);
  assert.equal(dev.maxInFlight, 2);
  const tf = paceFor(reg.tinyfish!.search!.rateLimits as never, undefined, 0.5, 2);
  assert.equal(tf.perDay, null); // the 12,000-a-day free allowance is pricing data, checked by the planner
  assert.equal(tf.intervalMs, 14400); // 500 per hour at half rate is stricter than 30 per minute
});

test("pacing counts each limit in its own unit", () => {
  // 150 URLs a minute at half rate, 10 URLs per call: 7.5 calls a minute.
  assert.equal(paceFor(reg.tinyfish!.contents!.rateLimits as never, undefined, 0.5, 2, { urls: 10 }).intervalMs, 8000);
  // Perplexity counts query units, one per search call: 25 a second at half rate.
  assert.equal(paceFor(reg.perplexity!.search!.rateLimits as never, undefined, 0.5, 2, { results: 10 }).intervalMs, 40);
  // A limit on results is divided by the results each call asks for.
  assert.equal(paceFor([{ plan: "x", limit: 100, unit: "results", per: "second" }], undefined, 0.5, 2, { results: 10 }).intervalMs, 200);
});

test("the pacer spaces request starts and honours pauses", async () => {
  let t = 0;
  const starts: number[] = [];
  const timer = { now: () => t, sleep: async (ms: number) => { t += ms; } };
  const pacer = new Pacer({ intervalMs: 100, maxInFlight: 1, perDay: null, basis: [] }, timer);
  for (let i = 0; i < 3; i++) {
    const release = await pacer.acquire();
    starts.push(t);
    release();
  }
  assert.deepEqual(starts, [0, 100, 200]);
  pacer.pause(1000);
  const release = await pacer.acquire();
  assert.equal(t, 1200);
  release();
});
