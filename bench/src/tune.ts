// Tuning (METHOD §8): each provider's best setting within a price cap, as a
// second column beside the default headline, never in place of it.
//
// - The tuning split is its own seeded draw from separate dataset files. It
//   must not share an item id, a query, a Wikidata statement or a Wikidata
//   subject with any scored item (public, private or fresh); overlap fails.
// - Every provider gets the same budget: the default plus exactly
//   `maxCandidates` candidates from a published search space, on the same
//   split items and passes, under the same cost cap per call (the SDK's cost
//   bound). Candidates over the cap are excluded before any call.
// - Selection uses known-answer scores only and keeps the default unless a
//   candidate is clearly better. Cost only breaks an exact tie between clear
//   winners; it never enters a score.
// - The main run scores the chosen settings as a second condition ("tuned")
//   on a seeded subset of its own items, the same for every provider.
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import type { Item } from "./dataset/items.ts";
import { normalize } from "./dataset/match.ts";
import type { Method, RunConfig, Settings, TuningRule } from "./run/config.ts";
import { loadRunItems } from "./run/plan.ts";
import { creditReservation } from "./run/pricing.ts";
import { costBound, type ProviderSpec } from "./sdk.ts";
import type { Scores } from "./score/score.ts";
import { bootstrapMean, pairedBootstrap, wilson, type Interval } from "./score/stats.ts";
import { BENCH_DIR, canonical, readJson, round, seedOf, sha256, storeDir } from "./util/core.ts";
import { validate, type Schema } from "./util/schema.ts";

/** One provider's published search space: its candidates, and why every other documented option is left out. */
export interface TuningSpace {
  candidates: Settings[];
  /** Documented options (normalized or the provider's own) that are not candidates, each with the reason. */
  excluded: Record<string, string>;
}

export interface TuningConfig {
  schema: "tuning-spaces/1";
  name: string;
  /** The tuning split: committed files (relative to bench/) and/or files in the local store. Never the scored sets. */
  split: { datasets: string[]; storeDatasets?: string[]; seed: number };
  /** The most the tuning run may spend, in USD; confirmed like any live run. */
  capUsd: number;
  /** Normalized options left out for every provider, with the reason. */
  normalizedExcluded: Record<string, string>;
  spaces: Record<string, TuningSpace>;
}

export interface Candidate {
  profile: string;
  settings: Settings;
  boundUsd: number;
  credits: number | null;
}

export interface Rejected { provider: string; settings: Settings; reason: string }

/** Identity keys of the tuning split, kept in the selection so a later run can check it is disjoint from its items. */
export interface ItemKeys { ids: string[]; queries: string[]; statements: string[]; subjects: string[] }

/** One configuration's evidence on the tuning split. */
export interface Evidence {
  profile: string;
  settings: Settings;
  /** The SDK's cost bound per call (the price cap's measure), null when unbounded. */
  boundUsd: number | null;
  n: number;
  knownAnswer: Interval;
  /** This configuration minus the default, paired over the split items, with its 95% interval. Null for the default. */
  gain: Interval | null;
  usableRate: number;
  usableCi: [number, number];
  eligible: boolean;
  reason: string;
}

export interface Selection {
  schema: "tuning-selection/2";
  runId: string;
  mode: "live" | "fixture";
  method: string;
  createdAt: string;
  tuning: string;
  tuningConfigSha256: string;
  rule: TuningRule;
  split: { files: string[]; seed: number; n: number; itemsSha256: string; keys: ItemKeys };
  providers: Record<string, { chosen: string; settings: Settings; boundUsd: number | null; reason: string; evidence: Evidence[]; rejected: Rejected[] }>;
}

export const TUNING_PATH = resolve(BENCH_DIR, "config", "tuning.json");

export function loadTuning(path: string = TUNING_PATH): TuningConfig {
  const t = readJson<TuningConfig>(resolve(path));
  const problems: string[] = [];
  if (t.schema !== "tuning-spaces/1") problems.push("schema: tuning-spaces/1");
  if (!t.name || !/^[a-z0-9-]{1,40}$/.test(t.name)) problems.push("name: lowercase letters, digits and dashes");
  if (!t.split || !Array.isArray(t.split.datasets) || !Number.isInteger(t.split.seed)) problems.push("split: { datasets, storeDatasets?, seed }");
  if (!(typeof t.capUsd === "number" && t.capUsd > 0)) problems.push("capUsd: a positive number");
  if (!t.spaces || typeof t.spaces !== "object") problems.push("spaces: per provider");
  if (problems.length) throw new Error(`${path}:\n  ${problems.join("\n  ")}`);
  return t;
}

const settingsKeys = (s: Settings): string[] => [...(s.depth ? ["depth"] : []), ...(s.country ? ["country"] : []), ...Object.keys(s.providerOptions ?? {})];
const label = (s: Settings): string => (settingsKeys(s).length ? canonical(s) : "default");

/** Everything wrong with the spaces for these providers; empty when they are complete, documented and equal in size. */
export function spaceProblems(t: TuningConfig, registry: Readonly<Record<string, ProviderSpec>>, method: Method, providers: readonly string[]): string[] {
  const out: string[] = [];
  const k = method.tuning.maxCandidates;
  for (const p of providers) {
    const spec = registry[p];
    const space = t.spaces[p];
    if (!spec?.search) { out.push(`${p}: not a registry provider with search`); continue; }
    if (!space) { out.push(`${p}: no search space in the tuning config`); continue; }
    const params = spec.search.request.params as Record<string, { steps?: { step: string; table?: Record<string, unknown> }[] }>;
    const options = spec.search.providerOptions as Record<string, Schema>;
    if (space.candidates.length > k) out.push(`${p}: at most ${k} candidates`);
    else if (space.candidates.length !== k) out.push(`${p}: exactly ${k} candidates, the same number for every provider`);
    const seen = new Set<string>();
    for (const c of space.candidates) {
      const keys = settingsKeys(c);
      if (!keys.length) { out.push(`${p}: an empty candidate is the default`); continue; }
      const id = canonical(c);
      if (seen.has(id)) out.push(`${p}: duplicate candidate ${id}`);
      seen.add(id);
      for (const key of Object.keys(c)) if (!["depth", "country", "providerOptions"].includes(key)) out.push(`${p}: ${key} is not a tunable setting (depth, country or providerOptions)`);
      if (c.depth !== undefined) {
        const table = params.depth?.steps?.find((s) => s.step === "map-value")?.table;
        if (!params.depth) out.push(`${p}: depth is not a documented parameter`);
        else if (c.depth === "standard") out.push(`${p}: depth standard is the default; it is not a candidate`);
        else if (table && !(c.depth in table)) out.push(`${p}: depth ${c.depth} is not mapped by the spec`);
      }
      if (c.country !== undefined) {
        if (!params.country) out.push(`${p}: country is not a documented parameter`);
        else if (!/^[A-Z]{2}$/.test(c.country)) out.push(`${p}: country must be ISO 3166-1 alpha-2 in capitals`);
      }
      for (const [key, value] of Object.entries(c.providerOptions ?? {})) {
        if (!Object.prototype.hasOwnProperty.call(options, key)) { out.push(`${p}: ${key} is not a documented provider option`); continue; }
        for (const e of validate(value, options[key]!)) out.push(`${p}: ${key}: ${e.replace(/^\/: /, "")}`);
      }
    }
    // Every documented option is accounted for: a candidate, or excluded with a published reason.
    const used = new Set(space.candidates.flatMap(settingsKeys));
    const documented = [...Object.keys(params).filter((x) => x !== "query" && x !== "maxResults"), ...Object.keys(options)];
    for (const key of documented) {
      if (!used.has(key) && !space.excluded[key] && !t.normalizedExcluded[key]) out.push(`${p}: ${key}: documented but neither a candidate nor excluded with a reason`);
    }
    for (const key of Object.keys(space.excluded)) if (!documented.includes(key)) out.push(`${p}: excluded ${key} is not a documented option`);
  }
  return out;
}

const UNBOUNDED = { price: "price not public", option: "an option makes the price unknown", count: "the billed count is unbounded" } as const;

/** Candidates the price cap admits, per provider, with profile names t1..tK; the rest are rejected before any call. */
export function eligibleCandidates(t: TuningConfig, registry: Readonly<Record<string, ProviderSpec>>, method: Method, providers: readonly string[]): { candidates: Record<string, Candidate[]>; rejected: Rejected[] } {
  const candidates: Record<string, Candidate[]> = {};
  const rejected: Rejected[] = [];
  const cap = method.tuning.maxCostPerCallUsd;
  for (const p of providers) {
    candidates[p] = [];
    const spec = registry[p];
    (t.spaces[p]?.candidates ?? []).forEach((s, k) => {
      if (!spec?.search) { rejected.push({ provider: p, settings: s, reason: "no search endpoint" }); return; }
      const b = costBound(spec, "search", { maxResults: method.search.maxResults, ...(s.depth ? { depth: s.depth } : {}), ...(s.providerOptions ? { providerOptions: s.providerOptions } : {}) });
      if (b.usd === null) { rejected.push({ provider: p, settings: s, reason: UNBOUNDED[b.unknownBecause ?? "price"] }); return; }
      if (b.usd > cap + 1e-12) { rejected.push({ provider: p, settings: s, reason: `cost bound $${b.usd} per call is above the cap $${cap}` }); return; }
      candidates[p]!.push({ profile: `t${k + 1}`, settings: s, boundUsd: b.usd, credits: creditReservation(spec, "search", method.search.maxResults, s) });
    });
  }
  return { candidates, rejected };
}

// ---------- the split and its disjointness ----------

export function itemKeys(items: readonly Item[]): ItemKeys {
  const uniq = (xs: (string | undefined)[]) => [...new Set(xs.filter((x): x is string => !!x))].sort();
  return {
    ids: uniq(items.map((i) => i.id)),
    queries: uniq(items.map((i) => sha256(normalize(i.query)))),
    statements: uniq(items.map((i) => i.source.statement)),
    subjects: uniq(items.map((i) => i.source.entity)),
  };
}

/** Every way the tuning split touches a scored item: same id, same normalized query, same Wikidata statement or subject. */
export function overlapProblems(keys: ItemKeys, scored: readonly Item[]): string[] {
  const ids = new Set(keys.ids), queries = new Set(keys.queries), statements = new Set(keys.statements), subjects = new Set(keys.subjects);
  const out: string[] = [];
  for (const i of scored) {
    const ref = i.split === "private" ? `a private item (sha256:${sha256(canonical(i)).slice(0, 12)})` : i.id;
    if (ids.has(i.id)) out.push(`same id ${i.id}`);
    else if (queries.has(sha256(normalize(i.query)))) out.push(`same query as ${ref}`);
    else if (i.source.statement && statements.has(i.source.statement)) out.push(`same Wikidata statement as ${ref}`);
    else if (i.source.entity && subjects.has(i.source.entity)) out.push(`same Wikidata subject ${i.split === "private" ? "(private)" : i.source.entity} as ${ref}`);
  }
  return out;
}

/** Every item a run could score: all of its dataset files, before any limit or exclusion. */
export function scoredUniverse(run: RunConfig): Item[] {
  const { limit: _limit, excludeItems: _ex, ...rest } = run;
  return loadRunItems({ ...rest, limit: null, excludeItems: [] });
}

function assertDisjoint(keys: ItemKeys, run: RunConfig): void {
  const problems = overlapProblems(keys, scoredUniverse(run));
  if (problems.length) throw new Error(`the tuning split overlaps the scored items of run ${run.name} (${problems.length}):\n  ${problems.slice(0, 20).join("\n  ")}\nUse a split built apart from the scored sets.`);
}

/** The split's files exist (committed or in the store). */
export function splitMissing(t: TuningConfig): string[] {
  return [
    ...t.split.datasets.filter((f) => !existsSync(resolve(BENCH_DIR, f))),
    ...(t.split.storeDatasets ?? []).filter((f) => !existsSync(resolve(storeDir(), f))).map((f) => `${f} (in the store)`),
  ];
}

/**
 * The tuning run: the run's providers and account limits, the split (seeded, class-stratified),
 * one profile per candidate slot, the method's passes, no judging. Refuses an overlapping split.
 */
export function tuningRunConfig(t: TuningConfig, run: RunConfig, registry: Readonly<Record<string, ProviderSpec>>, method: Method): { config: RunConfig; rejected: Rejected[]; candidates: Record<string, Candidate[]> } {
  const problems = spaceProblems(t, registry, method, run.providers);
  if (problems.length) throw new Error(`tuning spaces:\n  ${problems.join("\n  ")}`);
  const { candidates, rejected } = eligibleCandidates(t, registry, method, run.providers);
  const settings: Record<string, Record<string, Settings>> = {};
  for (const [p, cs] of Object.entries(candidates)) for (const c of cs) (settings[c.profile] ??= {})[p] = c.settings;
  const passes = method.tuning.passes;
  const config: RunConfig = {
    name: t.name, description: `Tuning split for ${run.name}: default and up to ${method.tuning.maxCandidates} candidates per provider, known-answer scores only.`,
    providers: run.providers, datasets: t.split.datasets, ...(t.split.storeDatasets?.length ? { privateDatasets: t.split.storeDatasets } : {}),
    limit: method.tuning.splitItems, passes,
    profiles: ["default", ...Array.from({ length: method.tuning.maxCandidates }, (_, k) => `t${k + 1}`).filter((x) => settings[x])],
    settings, pagePasses: Array.from({ length: passes }, (_, k) => k + 1), judgeItems: 0, capUsd: t.capUsd, seed: t.split.seed,
    ...(run.providerLimits ? { providerLimits: run.providerLimits } : {}),
    ...(run.creditsUsd ? { creditsUsd: run.creditsUsd } : {}),
    ...(run.rateLimitPlans ? { rateLimitPlans: run.rateLimitPlans } : {}),
  };
  if (!splitMissing(t).length) {
    // Every item in the split files is checked, not only the drawn ones: a different draw must not leak either.
    const whole = scoredUniverse(config);
    assertDisjoint(itemKeys(whole), run);
    if (whole.length < method.tuning.splitItems) throw new Error(`the tuning split has ${whole.length} items; the method draws ${method.tuning.splitItems}`);
  }
  return { config, rejected, candidates };
}

// ---------- selection ----------

/** One configuration on the tuning split, for the selection rule. perItem is aligned with the split items; null is unscored. */
export interface Arm {
  profile: string;
  settings: Settings;
  boundUsd: number | null;
  credits: number | null;
  perItem: (number | null)[];
  usable: number;
  attempts: number;
}

/**
 * The selection rule. A candidate is eligible when it was scored on every split item and its
 * usable-response rate is not confidently below the floor. It beats the default only when its gain
 * is at least `minGain` and (with `requireSeparation`) the 95% paired interval of the gain is above
 * zero. Among clear winners the higher score wins; an exact tie goes to the lower cost bound, then
 * to the order in the space. Otherwise the default is kept.
 */
export function choose(provider: string, arms: readonly Arm[], method: Method): { chosen: string; reason: string; evidence: Evidence[] } {
  const rule = method.tuning;
  const conf = method.stats.confidence;
  const def = arms.find((a) => a.profile === "default");
  if (!def) throw new Error(`${provider}: no default on the tuning split`);
  const scoredIdx = def.perItem.flatMap((x, k) => (x === null ? [] : [k]));
  const ivl = (xs: number[], ...seed: (string | number)[]) => (xs.length ? bootstrapMean(xs, method.stats.bootstrap, seedOf(method.stats.seed, "tune", provider, ...seed), conf) : { mean: NaN, lo: NaN, hi: NaN });
  const defComplete = scoredIdx.length === def.perItem.length;
  const evidence: Evidence[] = arms.map((a) => {
    const ci = wilson(a.usable, a.attempts, conf);
    const own = a.perItem.filter((x): x is number => x !== null);
    const base = { profile: a.profile, settings: a.settings, boundUsd: a.boundUsd, n: own.length, knownAnswer: ivl(own, a.profile), usableRate: a.attempts ? a.usable / a.attempts : 0, usableCi: ci };
    if (a.profile === "default") return { ...base, gain: null, eligible: true, reason: defComplete ? "the default" : `the default was scored on ${scoredIdx.length} of ${def.perItem.length} split items` };
    const complete = a.perItem.every((x) => x !== null) && defComplete;
    const ids = scoredIdx.filter((k) => a.perItem[k] !== null);
    const gain = ids.length ? pairedBootstrap({ c: ids.map((k) => a.perItem[k]!), d: ids.map((k) => def.perItem[k]!) }, method.stats.bootstrap, seedOf(method.stats.seed, "tune", provider, a.profile, "gain"), conf).diff.c!.d! : null;
    if (!complete) return { ...base, gain, eligible: false, reason: "not scored on every split item (with its default), so it cannot be compared" };
    if (ci[1] < method.reliability.floor) return { ...base, gain, eligible: false, reason: `unreliable: usable-response interval below the ${method.reliability.floor} floor` };
    const clear = gain!.mean >= rule.minGain - 1e-9 && (!rule.requireSeparation || gain!.lo > 0);
    return { ...base, gain, eligible: clear, reason: clear ? "clearly better than the default" : `gain ${round(gain!.mean, 3)} [${round(gain!.lo, 3)}, ${round(gain!.hi, 3)}]: not clearly better` };
  });
  const order = new Map(arms.map((a, k) => [a.profile, k]));
  const winners = evidence.filter((e) => e.profile !== "default" && e.eligible).sort((a, b) =>
    b.knownAnswer.mean - a.knownAnswer.mean || (a.boundUsd ?? Infinity) - (b.boundUsd ?? Infinity) || order.get(a.profile)! - order.get(b.profile)!);
  const why = `gain of at least ${rule.minGain}${rule.requireSeparation ? " with a 95% interval above zero" : ""}`;
  if (!winners.length) return { chosen: "default", reason: `kept the default: no candidate is clearly better (${why})`, evidence };
  const w = winners[0]!;
  return { chosen: w.profile, reason: `${w.profile} ${label(w.settings)}: ${why}${winners.length > 1 ? `; best of ${winners.length} clear candidates` : ""}`, evidence };
}

/** The selection file from a finished tuning run. */
export function select(o: {
  runId: string; mode: "live" | "fixture"; tuning: TuningConfig; tuningPath?: string; tuningConfigSha256: string; config: RunConfig; scores: Scores;
  registry: Readonly<Record<string, ProviderSpec>>; method: Method; rejected: Rejected[]; items: Item[];
}): Selection {
  const { config, scores, method } = o;
  const { candidates } = eligibleCandidates(o.tuning, o.registry, method, config.providers);
  const providers: Selection["providers"] = {};
  for (const p of config.providers) {
    const spec = o.registry[p]!;
    const defBound = costBound(spec, "search", { maxResults: method.search.maxResults }).usd;
    const arms: Arm[] = [];
    for (const profile of config.profiles) {
      const ps = scores.profiles.find((x) => x.provider === p && x.profile === profile);
      const c = candidates[p]!.find((x) => x.profile === profile);
      if (profile !== "default" && !c) continue;
      arms.push({
        profile, settings: c?.settings ?? {}, boundUsd: c ? c.boundUsd : defBound, credits: c?.credits ?? creditReservation(spec, "search", method.search.maxResults, {}),
        perItem: ps ? ps.perItem : scores.items.map(() => null), usable: ps?.reliability.usable ?? 0, attempts: ps?.reliability.attempts ?? 0,
      });
    }
    const r = choose(p, arms, method);
    const chosen = arms.find((a) => a.profile === r.chosen)!;
    providers[p] = { chosen: r.chosen, settings: chosen.settings, boundUsd: chosen.boundUsd, reason: r.reason, evidence: r.evidence, rejected: o.rejected.filter((x) => x.provider === p) };
  }
  return {
    schema: "tuning-selection/2", runId: o.runId, mode: o.mode, method: method.method, createdAt: new Date().toISOString(),
    tuning: o.tuningPath ?? "config/tuning.json", tuningConfigSha256: o.tuningConfigSha256, rule: method.tuning,
    split: {
      files: [...o.tuning.split.datasets, ...(o.tuning.split.storeDatasets ?? []).map((f) => `store:${f}`)], seed: o.tuning.split.seed,
      n: o.items.length, itemsSha256: sha256(canonical(o.items)), keys: itemKeys(o.items),
    },
    providers,
  };
}

// ---------- the tuned condition in the main run ----------

function withScope(run: RunConfig, method: Method, tuned: Record<string, Settings>, source: NonNullable<RunConfig["tuned"]>): RunConfig {
  return {
    ...run,
    profiles: [...new Set([...run.profiles, "tuned"])],
    settings: { ...(run.settings ?? {}), tuned },
    profileScope: { ...(run.profileScope ?? {}), tuned: { items: method.tuning.conditionItems, passes: method.tuning.conditionPasses.filter((p) => p <= run.passes) } },
    tuned: source,
  };
}

/** Adds the tuned condition from a selection. Refuses a selection from another method, one missing a provider, or a split that overlaps this run. */
export function withTuned(run: RunConfig, sel: Selection, method: Method): RunConfig {
  if (sel.method !== method.method) throw new Error(`the selection was made under method ${sel.method}; this is method ${method.method}. Tune again.`);
  const missing = run.providers.filter((p) => !sel.providers[p]);
  if (missing.length) throw new Error(`no selection for ${missing.join(", ")}: tune every provider of the run on the same split`);
  assertDisjoint(sel.split.keys, run);
  const tuned = Object.fromEntries(run.providers.map((p) => [p, sel.providers[p]!.settings]));
  return withScope(run, method, tuned, { status: "selected", tuning: sel.tuning, selection: sel, selectionSha256: sha256(canonical(sel)) });
}

/** The plan before any selection: each provider's dearest admitted candidate (by cost bound, then credits), the worst case. */
export function withTunedWorstCase(run: RunConfig, t: TuningConfig, registry: Readonly<Record<string, ProviderSpec>>, method: Method): RunConfig {
  const { candidates } = eligibleCandidates(t, registry, method, run.providers);
  const tuned = Object.fromEntries(run.providers.map((p) => {
    const dearest = [...candidates[p]!].sort((a, b) => b.boundUsd - a.boundUsd || (b.credits ?? 0) - (a.credits ?? 0))[0];
    return [p, dearest?.settings ?? {}];
  }));
  return withScope(run, method, tuned, { status: "worst-case", tuning: run.tuning ?? "config/tuning.json" });
}

/**
 * What a run does about the tuned condition. A config that names a tuning file needs a selection,
 * or an explicit --no-tuned; the plan alone may show the worst case before a selection exists.
 */
export function resolveTuned(run: RunConfig, o: { selection?: Selection; noTuned?: boolean; forPlan: boolean; registry: Readonly<Record<string, ProviderSpec>>; method: Method }): RunConfig {
  if (o.noTuned) {
    const { tuning: _t, ...rest } = run;
    return rest;
  }
  if (o.selection) return withTuned(run, o.selection, o.method);
  if (!run.tuning) return run;
  if (o.forPlan) return withTunedWorstCase(run, loadTuning(resolve(BENCH_DIR, run.tuning)), o.registry, o.method);
  throw new Error(`${run.name} includes the tuned condition: run \`tune\` first and pass --tuned <selection.json>, or pass --no-tuned for the headline only`);
}

// ---------- account limits across smoke, tuning and the main run ----------

/**
 * A tuning run must leave room for the main run: for each provider with a credit or call limit,
 * what the ledger already holds plus tuning plus the main run (with its tuned condition) must fit.
 */
export function limitProblems(o: { limits: Record<string, { credits?: number; calls?: number; since?: string }>; used: Record<string, number>; tuning: Record<string, number>; main: Record<string, number>; unit?: "credits" | "calls" }): string[] {
  const out: string[] = [];
  const unit = o.unit ?? "credits";
  for (const [p, l] of Object.entries(o.limits)) {
    const limit = l[unit];
    if (limit === undefined) continue;
    const used = o.used[p] ?? 0, tuning = o.tuning[p] ?? 0, main = o.main[p] ?? 0;
    const total = used + tuning + main;
    if (total > limit) out.push(`${p}: ${used} used + ${tuning} tuning + ${main} main run = ${total}, above its limit of ${limit}${unit === "calls" ? " calls" : ""}${l.since ? ` since ${l.since}` : ""}`);
  }
  return out;
}

/** The spend table a tuning plan prints: per provider, tuning calls and credits, the main run, and what is left under each limit. */
export function formatTuningPlan(o: {
  method: Method; split: { files: string[]; missing: string[] };
  rows: { id: string; configs: number; calls: number; maxUsd: number; credits: number | null; mainCalls: number; mainCredits: number | null; tunedCalls: number; tunedCredits: number | null; used: number | null; limit: number | null }[];
  maxUsd: number; capUsd: number; candidates: Record<string, Candidate[]>; rejected: Rejected[];
}): string {
  const r = o.method.tuning;
  const L: string[] = [];
  L.push("searchSDK Benchmarks tuning plan (dry run: nothing is sent)");
  L.push(`split: ${r.splitItems} items drawn by seed from ${o.split.files.join(", ")}${o.split.missing.length ? `  [NOT BUILT YET: ${o.split.missing.join(", ")}]` : ""}`);
  L.push(`every provider: default + ${r.maxCandidates} candidates, ${r.passes} pass, known-answer only (judges off), cost bound at most $${r.maxCostPerCallUsd} per call`);
  L.push(`selection: a candidate replaces the default only with a gain of at least ${r.minGain}${r.requireSeparation ? " and a 95% paired interval above zero" : ""}`);
  L.push(`tuned condition in the main run: ${r.conditionItems} seeded items, pass ${r.conditionPasses.join(", ")}, the same for every provider`);
  L.push("");
  L.push("candidates (SDK cost bound per call):");
  for (const [p, cs] of Object.entries(o.candidates)) L.push(`  ${p.padEnd(10)} ${cs.map((c) => `${c.profile} ${label(c.settings)} $${c.boundUsd}`).join("; ") || "none"}`);
  for (const x of o.rejected) L.push(`  ${x.provider.padEnd(10)} rejected ${label(x.settings)}: ${x.reason}`);
  L.push("");
  L.push(`${"provider".padEnd(11)}${"tuning calls".padStart(13)}${"max $".padStart(9)}${"credits".padStart(9)} | ${"main calls".padStart(10)}${"of which tuned".padStart(15)}${"credits".padStart(9)} | ${"used".padStart(6)}${"limit".padStart(7)}${"left".padStart(7)}`);
  for (const x of o.rows) {
    const cr = (v: number | null) => (v === null ? "-" : String(v));
    const left = x.limit === null ? "-" : String(x.limit - (x.used ?? 0) - (x.credits ?? 0) - (x.mainCredits ?? 0));
    L.push(`${x.id.padEnd(11)}${`${x.configs} x ${x.calls / x.configs}`.padStart(13)}${`$${x.maxUsd.toFixed(2)}`.padStart(9)}${cr(x.credits).padStart(9)} | ${String(x.mainCalls).padStart(10)}${`${x.tunedCalls} (${cr(x.tunedCredits)} cr)`.padStart(15)}${cr(x.mainCredits).padStart(9)} | ${cr(x.used).padStart(6)}${cr(x.limit).padStart(7)}${left.padStart(7)}`);
  }
  L.push("");
  L.push(`tuning: maximum possible spend $${o.maxUsd.toFixed(2)}; tuning cap $${o.capUsd.toFixed(2)}`);
  L.push("main run calls and credits include the tuned condition at its worst case (each provider's dearest candidate); a provider whose selection keeps its default sends no tuned calls.");
  return L.join("\n");
}
