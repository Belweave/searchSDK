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
  /** id: the primary judge, whose grades are the judged score. checkId: a second judge from another vendor, a blind cross-check. */
  judge: { id: string; checkId?: string; topK: number; passageMaxBytes: number; selfConsistencyShare: number; rubric: string };
  gate: { minHumanLabels: number; minJudgeHumanKappa: number; minSelfKappa: number; minCrossKappa?: number };
  stats: { bootstrap: number; seed: number; confidence: number; minSeparation: number };
  reliability: { floor: number };
  /** unknownPriceUsd is reserved only when the SDK's cost bound is unknown; known bounds are reserved as they are. */
  budget: { monthlyCapUsd: number; unknownPriceUsd: number };
  pacing: { shareOfLimit: number; maxInFlightPerProvider: number; itemWindow: number; rateLimitPauseMs: number };
  routing: { minCellN: number; validDays: number };
  /** The tuned column (METHOD §8): the same split size, passes, search-space size and price cap for every provider. */
  tuning: TuningRule;
}

export interface TuningRule {
  /** Items drawn by seed from the tuning split, which never overlaps the scored items. */
  splitItems: number;
  /** Passes over the split, for default and every candidate alike. */
  passes: number;
  /** Candidates per provider besides its default: every space has exactly this many. */
  maxCandidates: number;
  /** The SDK's cost bound per call must be at most this, for every candidate; others are excluded before any call. */
  maxCostPerCallUsd: number;
  /** A candidate beats the default only by at least this much known-answer score... */
  minGain: number;
  /** ...and, when true, with a 95% paired-bootstrap interval of the gain above zero. */
  requireSeparation: boolean;
  /** Selection uses known-answer scores only; judges are off for tuning in this method version. */
  judged: false;
  /** The tuned condition in the main run: a seeded subset of this many scored items, the same for every provider... */
  conditionItems: number;
  /** ...on these passes. */
  conditionPasses: number[];
}

/** Exact settings sent with a provider's searches under one profile. Empty means SDK defaults. */
export interface Settings {
  depth?: "fast" | "standard" | "deep";
  /** The SDK's normalized country option (ISO 3166-1 alpha-2). */
  country?: string;
  providerOptions?: Record<string, unknown>;
}

/** Where a run's tuned profile came from: a selection made on the tuning split, or the plan's worst case before one exists. */
export type TunedSource =
  | { status: "worst-case"; tuning: string }
  | { status: "selected"; tuning: string; selection: import("../tune.ts").Selection; selectionSha256: string };

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
  /** Items left out of one profile's score. */
  profileExclude?: Record<string, string[]>;
  /**
   * Runs a profile on part of the run only: a seeded, class-stratified subset of `items` items
   * (the same for every provider) and the listed passes. Unscoped profiles run every item and pass.
   */
  profileScope?: Record<string, { items?: number; passes?: number[] }>;
  /**
   * The tuned condition (METHOD §8): the path of the tuning spaces file. A run that sets it needs a
   * selection (--tuned) or an explicit --no-tuned; the plan shows the worst case before selection.
   */
  tuning?: string;
  /** Filled by --tuned (or by the plan's worst case): where the "tuned" profile's settings came from. */
  tuned?: TunedSource;
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
  /** Set by --no-judge: the owner chose to run without judging; every output says "not judged". */
  notJudged?: boolean;
  /** The most this run may spend, in USD. A live run must repeat it to confirm. */
  capUsd: number;
  /** Free credit per provider, in USD, which spend uses before the cash caps. */
  creditsUsd?: Record<string, number>;
  /**
   * Hard per-provider account limits, in provider credits and/or calls, counted in the
   * month-wide ledger across every run and smoke check since `since`. When the next call
   * could pass a limit, that provider stops; the others carry on. The USD caps still apply.
   */
  providerLimits?: Record<string, { credits?: number; calls?: number; since?: string }>;
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
  // Every pass is scored, so the page check covers every pass or none: a pass without pages would score on snippets alone.
  else if (c.pagePasses.length && new Set(c.pagePasses).size !== c.passes) problems.push("pagePasses: every pass (1 to passes) or none");
  if (!Number.isInteger(c.judgeItems) || c.judgeItems < 0) problems.push("judgeItems: a whole number");
  if (c.judgePricing !== undefined && c.judgePricing !== "covered-by-plan" && c.judgePricing !== "list-price") problems.push("judgePricing: covered-by-plan or list-price");
  if (typeof c.capUsd !== "number" || !(c.capUsd > 0)) problems.push("capUsd: a positive number");
  if (!Number.isInteger(c.seed)) problems.push("seed: an integer");
  for (const [name, sc] of Object.entries(c.profileScope ?? {})) {
    if (sc.items !== undefined && !(Number.isInteger(sc.items) && sc.items > 0)) problems.push(`profileScope.${name}.items: a positive whole number`);
    if (sc.passes !== undefined && (!Array.isArray(sc.passes) || !sc.passes.length || sc.passes.some((p) => !Number.isInteger(p) || p < 1 || p > c.passes))) problems.push(`profileScope.${name}.passes: pass numbers`);
  }
  if (c.tuning !== undefined && typeof c.tuning !== "string") problems.push("tuning: the path of the tuning spaces file");
  for (const [id, l] of Object.entries(c.providerLimits ?? {})) {
    if (l.credits !== undefined && !(Number.isFinite(l.credits) && l.credits > 0)) problems.push(`providerLimits.${id}.credits: a positive number`);
    if (l.calls !== undefined && !(Number.isInteger(l.calls) && l.calls > 0)) problems.push(`providerLimits.${id}.calls: a positive whole number`);
    if (l.since !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(l.since)) problems.push(`providerLimits.${id}.since: YYYY-MM-DD`);
    if (l.credits === undefined && l.calls === undefined) problems.push(`providerLimits.${id}: credits or calls`);
  }
  if (problems.length) throw new Error(`${path}:\n  ${problems.join("\n  ")}`);
  return c;
}
