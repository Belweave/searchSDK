// Statistics and ranking on constructed data with known answers.
import assert from "node:assert/strict";
import { test } from "node:test";
import { rank } from "../src/score/rank.ts";
import { ndcg } from "../src/score/score.ts";
import { kappaInterval, mean, pairedBootstrap, quantile, retest, weightedKappa, wilson, zFor } from "../src/score/stats.ts";
import { rng } from "../src/util/core.ts";

const close = (a: number, b: number, eps = 1e-3) => assert.ok(Math.abs(a - b) <= eps, `${a} != ${b}`);

test("normal quantile and Wilson interval match published values", () => {
  close(zFor(0.95), 1.959964, 1e-6);
  close(zFor(0.9), 1.644854, 1e-6);
  // Wilson 95% for 81/263 (Newcombe 1998, example): 0.2553 to 0.3662.
  const [lo, hi] = wilson(81, 263);
  close(lo, 0.2553, 5e-4);
  close(hi, 0.3662, 5e-4);
  assert.deepEqual(wilson(0, 0), [0, 1]);
  const [l0, h0] = wilson(0, 400);
  assert.equal(l0, 0);
  assert.ok(h0 < 0.01);
});

test("type-7 quantiles", () => {
  assert.equal(quantile([1, 2, 3, 4], 0.5), 2.5);
  assert.equal(quantile([10], 0.95), 10);
  close(quantile([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 0.9), 9.1, 1e-9);
  assert.ok(Number.isNaN(quantile([], 0.5)));
});

test("paired bootstrap: identical providers differ by zero; disjoint ones by exactly one", () => {
  const n = 200;
  const r = rng(1);
  const a = Array.from({ length: n }, () => (r() < 0.6 ? 1 : 0));
  const b1 = pairedBootstrap({ a, b: [...a] }, 1000, 3);
  assert.equal(b1.diff.a!.b!.mean, 0);
  assert.equal(b1.diff.a!.b!.lo, 0);
  assert.equal(b1.diff.a!.b!.hi, 0);
  const b2 = pairedBootstrap({ one: Array(n).fill(1), zero: Array(n).fill(0) }, 500, 3);
  assert.equal(b2.diff.one!.zero!.lo, 1);
  assert.equal(b2.each.zero!.hi, 0);
});

test("paired bootstrap interval width matches the binomial standard error", () => {
  const n = 400;
  const r = rng(11);
  const x = Array.from({ length: n }, () => (r() < 0.75 ? 1 : 0));
  const p = mean(x);
  const b = pairedBootstrap({ x }, 4000, 5).each.x!;
  const half = (b.hi - b.lo) / 2;
  const expected = 1.96 * Math.sqrt((p * (1 - p)) / n);
  assert.ok(Math.abs(half - expected) < 0.006, `half-width ${half} vs ${expected}`);
});

test("pairing shrinks the interval of a difference when items are correlated", () => {
  const n = 300;
  const r = rng(21);
  const easy = Array.from({ length: n }, () => r() < 0.5);
  // Both providers get the easy items and differ on 6% of the rest.
  const a = easy.map((e) => (e ? 1 : r() < 0.3 ? 1 : 0));
  const b = a.map((v, i) => (v === 0 && !easy[i] && r() < 0.12 ? 1 : v));
  const d = pairedBootstrap({ a, b }, 3000, 9).diff.b!.a!;
  assert.ok(d.lo > 0, "b is separably better: every discordant item favours b");
  assert.ok(d.hi - d.lo < 0.06);
});

test("quadratic weighted kappa: perfect, chance and a known table", () => {
  assert.equal(weightedKappa([0, 1, 2, 3], [0, 1, 2, 3]), 1);
  assert.ok(weightedKappa([0, 3, 0, 3], [3, 0, 3, 0]) < 0);
  // Constant raters agree perfectly; kappa is defined as 1 here.
  assert.equal(weightedKappa([2, 2, 2], [2, 2, 2]), 1);
  // By hand: observed weighted disagreement (2/9)/5 = 2/45; expected 64/225; kappa = 1 - (2/45)/(64/225) = 0.84375.
  close(weightedKappa([0, 1, 2, 3, 3], [0, 1, 1, 3, 2]), 0.84375, 1e-12);
  const k = kappaInterval([0, 1, 2, 3, 3, 2, 1, 0], [0, 1, 2, 3, 3, 2, 1, 0], 200, 1);
  assert.equal(k.mean, 1);
});

test("nDCG against the pooled ideal", () => {
  assert.equal(ndcg([3, 2, 0], [3, 2, 0], 3), 1);
  assert.equal(ndcg([], [3, 1], 3), 0);
  assert.equal(ndcg([0, 0, 0], [0, 0, 0], 3), null);
  close(ndcg([0, 3, 0], [3], 3)!, 1 / Math.log2(3), 1e-12);
});

test("test-retest agreement", () => {
  assert.deepEqual(retest([1, 0, 1, 1], [1, 1, 1, 0]), { n: 4, agreement: 0.5, flipped: 0.5, meanDelta: 0 });
});

test("ranking: providers within the minimum separation tie; separable ones do not", () => {
  const n = 400;
  const r = rng(4);
  const base = Array.from({ length: n }, () => (r() < 0.7 ? 1 : 0));
  // b equals a on all but 8 items (2 points); c is 20 points lower.
  const a = base;
  const b = base.map((v, i) => (i < 8 ? 0 : v));
  const c = base.map((v, i) => (i < 80 ? 0 : v));
  const boot = pairedBootstrap({ a, b, c }, 2000, 2);
  const rows = [
    { id: "a", quality: mean(a), usableRate: 1, usableUpper: 1 },
    { id: "b", quality: mean(b), usableRate: 1, usableUpper: 1 },
    { id: "c", quality: mean(c), usableRate: 1, usableUpper: 1 },
  ];
  const out = rank(rows, boot, { floor: 0.95, minSeparation: 0.06 });
  const g = Object.fromEntries(out.map((x) => [x.id, x]));
  // a and b differ significantly (every discordant item favours a) but by less than 6 points: tied.
  assert.ok(boot.diff.a!.b!.lo > 0);
  assert.equal(g.a!.group, g.b!.group);
  assert.equal(g.a!.tied, true);
  assert.ok(g.c!.group > g.a!.group);
});

test("ranking: an unreliable provider ranks below dependable ones even with higher quality", () => {
  const n = 300;
  const hi = Array(n).fill(1);
  const lo = Array.from({ length: n }, (_, i) => (i % 2 ? 1 : 0));
  const boot = pairedBootstrap({ flaky: hi, steady: lo, empty: Array(n).fill(0) }, 500, 1);
  const out = rank([
    { id: "flaky", quality: 1, usableRate: 0.8, usableUpper: 0.84 },
    { id: "steady", quality: 0.5, usableRate: 0.99, usableUpper: 1 },
    { id: "empty", quality: 0, usableRate: 0, usableUpper: 0.01 },
  ], boot, { floor: 0.95, minSeparation: 0.06 });
  assert.deepEqual(out.map((x) => x.id), ["steady", "flaky", "empty"]);
  assert.equal(out[0]!.reliable, true);
  assert.equal(out[1]!.reliable, false);
});
