// Statistics: means, Wilson intervals, quantiles, the paired bootstrap,
// weighted kappa and test-retest agreement. Deterministic given a seed.
import { rng } from "../util/core.ts";

export const mean = (xs: readonly number[]): number => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);

/** Two-sided normal quantile for a confidence level (0.95 gives 1.959964). */
export function zFor(confidence: number): number {
  // Acklam's inverse normal approximation; accurate to about 1e-9.
  const p = 1 - (1 - confidence) / 2;
  const a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239];
  const b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572];
  const c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416];
  const q = p < 0.5 ? p : 1 - p;
  let x: number;
  if (q < 0.02425) {
    const t = Math.sqrt(-2 * Math.log(q));
    x = (((((c[0]! * t + c[1]!) * t + c[2]!) * t + c[3]!) * t + c[4]!) * t + c[5]!) / ((((d[0]! * t + d[1]!) * t + d[2]!) * t + d[3]!) * t + 1);
  } else {
    const t = q - 0.5;
    const r = t * t;
    x = ((((((a[0]! * r + a[1]!) * r + a[2]!) * r + a[3]!) * r + a[4]!) * r + a[5]!) * t) / (((((b[0]! * r + b[1]!) * r + b[2]!) * r + b[3]!) * r + b[4]!) * r + 1);
  }
  return p < 0.5 ? x : -x;
}

/** Wilson score interval for k successes in n trials. */
export function wilson(k: number, n: number, confidence = 0.95): [number, number] {
  if (n === 0) return [0, 1];
  const z = zFor(confidence);
  const p = k / n;
  const den = 1 + (z * z) / n;
  const centre = (p + (z * z) / (2 * n)) / den;
  const half = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / den;
  return [Math.max(0, centre - half), Math.min(1, centre + half)];
}

/** Linear-interpolation quantile (type 7) of unsorted values; NaN when empty. */
export function quantile(values: readonly number[], q: number): number {
  if (!values.length) return NaN;
  const s = [...values].sort((a, b) => a - b);
  const h = (s.length - 1) * q;
  const lo = Math.floor(h);
  const hi = Math.ceil(h);
  return s[lo]! + (h - lo) * (s[hi]! - s[lo]!);
}

export interface Interval { mean: number; lo: number; hi: number }

export interface PairedBootstrap {
  providers: string[];
  n: number;
  /** Per provider: point estimate and percentile interval. */
  each: Record<string, Interval>;
  /** diff[a][b]: mean(a) - mean(b), with its percentile interval. */
  diff: Record<string, Record<string, Interval>>;
}

/**
 * Paired bootstrap over items. `scores[p][i]` is provider p's score on item i;
 * every provider must have a score for every item (pairing). Each replicate
 * draws n item indices with replacement and recomputes every provider's mean,
 * so differences keep the item-level correlation.
 */
export function pairedBootstrap(scores: Record<string, readonly number[]>, replicates: number, seed: number, confidence = 0.95): PairedBootstrap {
  const providers = Object.keys(scores).sort();
  const n = providers.length ? scores[providers[0]!]!.length : 0;
  for (const p of providers) if (scores[p]!.length !== n) throw new Error("paired bootstrap needs the same items for every provider");
  const random = rng(seed);
  const reps = providers.map(() => new Float64Array(replicates));
  for (let b = 0; b < replicates; b++) {
    const sums = new Float64Array(providers.length);
    for (let j = 0; j < n; j++) {
      const i = Math.floor(random() * n);
      for (let k = 0; k < providers.length; k++) sums[k]! += scores[providers[k]!]![i]!;
    }
    for (let k = 0; k < providers.length; k++) reps[k]![b] = n ? sums[k]! / n : NaN;
  }
  const alpha = (1 - confidence) / 2;
  const interval = (xs: ArrayLike<number>, point: number): Interval => {
    const arr = Array.from(xs);
    return { mean: point, lo: quantile(arr, alpha), hi: quantile(arr, 1 - alpha) };
  };
  const each: Record<string, Interval> = {};
  const diff: Record<string, Record<string, Interval>> = {};
  providers.forEach((p, k) => (each[p] = interval(reps[k]!, mean(scores[p]!))));
  providers.forEach((a, ka) => {
    diff[a] = {};
    providers.forEach((b, kb) => {
      if (a === b) return;
      const d = new Float64Array(replicates);
      for (let r = 0; r < replicates; r++) d[r] = reps[ka]![r]! - reps[kb]![r]!;
      diff[a]![b] = interval(d, mean(scores[a]!) - mean(scores[b]!));
    });
  });
  return { providers, n, each, diff };
}

/** Percentile bootstrap interval of a mean (unpaired, one sample). */
export function bootstrapMean(values: readonly number[], replicates: number, seed: number, confidence = 0.95): Interval {
  if (!values.length) return { mean: NaN, lo: NaN, hi: NaN };
  return pairedBootstrap({ x: values }, replicates, seed, confidence).each.x!;
}

/** Cohen's kappa with quadratic weights for ordinal grades 0..k-1. NaN when undefined. */
export function weightedKappa(a: readonly number[], b: readonly number[], categories = 4): number {
  const n = a.length;
  if (n === 0 || n !== b.length) return NaN;
  const obs = Array.from({ length: categories }, () => new Array<number>(categories).fill(0));
  const ra = new Array<number>(categories).fill(0);
  const rb = new Array<number>(categories).fill(0);
  for (let i = 0; i < n; i++) {
    obs[a[i]!]![b[i]!]!++;
    ra[a[i]!]!++;
    rb[b[i]!]!++;
  }
  let num = 0;
  let den = 0;
  const w = (i: number, j: number) => ((i - j) * (i - j)) / ((categories - 1) * (categories - 1));
  for (let i = 0; i < categories; i++) {
    for (let j = 0; j < categories; j++) {
      num += w(i, j) * obs[i]![j]! / n;
      den += w(i, j) * (ra[i]! * rb[j]!) / (n * n);
    }
  }
  return den === 0 ? (num === 0 ? 1 : NaN) : 1 - num / den;
}

/** Weighted kappa with a percentile bootstrap interval over the paired labels. */
export function kappaInterval(a: readonly number[], b: readonly number[], replicates: number, seed: number, confidence = 0.95): Interval {
  const point = weightedKappa(a, b);
  const random = rng(seed);
  const reps: number[] = [];
  for (let r = 0; r < replicates; r++) {
    const ia: number[] = [];
    const ib: number[] = [];
    for (let j = 0; j < a.length; j++) {
      const i = Math.floor(random() * a.length);
      ia.push(a[i]!);
      ib.push(b[i]!);
    }
    const k = weightedKappa(ia, ib);
    if (!Number.isNaN(k)) reps.push(k);
  }
  const alpha = (1 - confidence) / 2;
  return { mean: point, lo: quantile(reps, alpha), hi: quantile(reps, 1 - alpha) };
}

/** Test-retest for binary scores across two passes: agreement and the share of items whose score changed. */
export function retest(a: readonly number[], b: readonly number[]): { n: number; agreement: number; flipped: number; meanDelta: number } {
  const n = Math.min(a.length, b.length);
  let same = 0;
  for (let i = 0; i < n; i++) if (a[i] === b[i]) same++;
  return { n, agreement: n ? same / n : NaN, flipped: n ? 1 - same / n : NaN, meanDelta: mean(b.slice(0, n)) - mean(a.slice(0, n)) };
}
