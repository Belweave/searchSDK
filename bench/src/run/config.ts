// Method and run configuration. The method file fixes the conditions of a
// method version; a run file says what to run and how much it may spend.
import { join, resolve } from "node:path";
import { BENCH_DIR, readJson } from "../util/core.ts";

export interface Method {
  method: string;
  search: { maxResults: number; timeoutMs: number; maxRetries: number };
  /** The harness's own page fetcher (src/pages/fetcher.ts): never a ranked provider, and free. */
  pages: {
    fetcher: string; topK: number; timeoutMs: number; maxBytes: number; maxRedirects: number;
    maxInFlight: number; perHostIntervalMs: number; maxCrawlDelayMs: number;
    userAgent: string; robotsToken: string; maxStoredChars: number;
  };
  knownAnswer: { snippetTopK: number; pageTopK: number; navTopK: number };
  judge: { id: string; topK: number; passageMaxBytes: number; selfConsistencyShare: number; rubric: string };
  gate: { minHumanLabels: number; minJudgeHumanKappa: number; minSelfKappa: number };
  stats: { bootstrap: number; seed: number; confidence: number; minSeparation: number };
  reliability: { floor: number };
  /** unknownPriceUsd is reserved only when the SDK's cost bound is unknown; known bounds are reserved as they are. */
  budget: { monthlyCapUsd: number; unknownPriceUsd: number };
  pacing: { shareOfLimit: number; maxInFlightPerProvider: number; itemWindow: number; rateLimitPauseMs: number };
  routing: { minCellN: number; validDays: number };
}

/** Exact settings sent with a provider's searches under one profile. Empty means SDK defaults. */
export interface Settings {
  depth?: "fast" | "standard" | "deep";
  providerOptions?: Record<string, unknown>;
}

export type JudgePricing = "covered-by-plan" | "list-price";

export interface RunConfig {
  name: string;
  description?: string;
  providers: string[];
  /** Committed dataset files, relative to bench/. */
  datasets: string[];
  /** Private item files inside the local store (absolute, or relative to the store). */
  privateDatasets?: string[];
  /** Use at most this many items, drawn by seed within classes. */
  limit?: number | null;
  /** Item ids to leave out (for example the tuning subset). */
  excludeItems?: string[];
  passes: number;
  /** Profiles to run. "default" is always SDK defaults; others come from `settings`. */
  profiles: string[];
  /** Settings per profile and provider, for profiles other than "default". */
  settings?: Record<string, Record<string, Settings>>;
  /** Items left out of one profile's score (for example "tuned" leaves out the items it was tuned on). */
  profileExclude?: Record<string, string[]>;
  /** Search passes whose top URLs get fetched for the page check. Empty disables page fetching. */
  pagePasses: number[];
  /** Judge this many items (drawn by seed within classes), from pass 1. Zero disables judging; at least the item count judges every item. */
  judgeItems: number;
  /**
   * How judge calls are paid for. "covered-by-plan": a subscription covers them, so they reserve nothing,
   * the cap counts provider calls only, and any charge the judge reports halts the run. "list-price"
   * (the default): each call reserves its worst case at the judge's list price.
   */
  judgePricing?: JudgePricing;
  /** The most this run may spend, in USD. A live run must repeat it to confirm. */
  capUsd: number;
  /** Free credit per provider, in USD, which spend uses before the cash caps. */
  creditsUsd?: Record<string, number>;
  /** Rate-limit plan name per provider, matched against the registry's rateLimits; default is the most restrictive. */
  rateLimitPlans?: Record<string, string>;
  seed: number;
}

export const METHOD_PATH = join(BENCH_DIR, "config", "method.json");

export function loadMethod(path = METHOD_PATH): Method {
  return readJson<Method>(path);
}

export function loadRunConfig(path: string): RunConfig {
  const c = readJson<RunConfig>(resolve(path));
  const problems: string[] = [];
  if (!c.name || !/^[a-z0-9-]{1,40}$/.test(c.name)) problems.push("name: lowercase letters, digits and dashes");
  if (!Array.isArray(c.providers) || !c.providers.length) problems.push("providers: at least one");
  if (!Array.isArray(c.datasets)) problems.push("datasets: a list");
  if (!Number.isInteger(c.passes) || c.passes < 1 || c.passes > 5) problems.push("passes: 1 to 5");
  if (!Array.isArray(c.profiles) || !c.profiles.length) problems.push("profiles: at least one");
  for (const p of c.profiles ?? []) if (p !== "default" && !c.settings?.[p]) problems.push(`settings.${p}: missing`);
  if (!Array.isArray(c.pagePasses) || c.pagePasses.some((p) => !Number.isInteger(p) || p < 1 || p > c.passes)) problems.push("pagePasses: pass numbers");
  if (!Number.isInteger(c.judgeItems) || c.judgeItems < 0) problems.push("judgeItems: a whole number");
  if (c.judgePricing !== undefined && c.judgePricing !== "covered-by-plan" && c.judgePricing !== "list-price") problems.push("judgePricing: covered-by-plan or list-price");
  if (typeof c.capUsd !== "number" || !(c.capUsd > 0)) problems.push("capUsd: a positive number");
  if (!Number.isInteger(c.seed)) problems.push("seed: an integer");
  if (problems.length) throw new Error(`${path}:\n  ${problems.join("\n  ")}`);
  return c;
}
