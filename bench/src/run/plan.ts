// The plan: which items, which calls, and the most they can cost. Computed
// without any network access; `bench plan` prints it, and a live run shows it
// again and asks for confirmation before the first call.
import { join, resolve } from "node:path";
import { committedProblems, itemProblems, loadItems, type Item } from "../dataset/items.ts";
import type { Judge } from "../judge/judge.ts";
import { selectPassage } from "../judge/judge.ts";
import type { ProviderSpec } from "../sdk.ts";
import { BENCH_DIR, canonical, rng, seedOf, sha256, shuffle, storeDir, usd } from "../util/core.ts";
import type { JudgePricing, Method, RunConfig, Settings } from "./config.ts";
import { paceFor, type Pace, type RateLimit } from "./pacer.ts";
import { creditReservation, reservation, type Reservation } from "./pricing.ts";

export interface ProviderPlan {
  id: string;
  name: string;
  profiles: { profile: string; settings: Settings; reservation: Reservation; calls: number; maxUsd: number }[];
  pace: Pace;
  terms: { benchmarkPublication: string; rawResponseStorage: string } | null;
  /** Provider credits for credit-priced or limited providers: per search call, planned for this run, and the account limit. */
  credits: { perCall: number | null; planned: number | null; limit?: number; callLimit?: number; since?: string } | null;
  warnings: string[];
}

export interface Plan {
  runName: string;
  method: string;
  items: { id: string; split: Item["split"]; class: string }[];
  itemsSha256: string;
  judgeItemIds: string[];
  providers: ProviderPlan[];
  search: { calls: number; maxUsd: number };
  /** The harness's own fetcher: no provider, no spend, so it is not in the spend total. */
  pages: { fetcher: string; maxUrls: number; maxInFlight: number; perHostIntervalMs: number };
  /** maxUsd is 0 when the judge is covered by a plan; the cap then counts provider calls only. */
  judge: { id: string; pricing: JudgePricing; maxPairs: number; maxRepeats: number; perCallMaxUsd: number; maxUsd: number } | null;
  /** The cross-check judge grades every pair once (no repeats), under the same pricing. */
  checkJudge: { id: string; pricing: JudgePricing; maxPairs: number; perCallMaxUsd: number; maxUsd: number } | null;
  maxUsd: number;
  capUsd: number;
  warnings: string[];
}

export function settingsFor(config: RunConfig, profile: string, provider: string): Settings {
  return profile === "default" ? {} : (config.settings?.[profile]?.[provider] ?? {});
}

/** A profile other than "default" runs only for providers it gives settings for. */
export function hasProfile(config: RunConfig, profile: string, provider: string): boolean {
  return profile === "default" || config.settings?.[profile]?.[provider] !== undefined;
}

/** Seeded selection of `n` items, proportional within classes, so small runs keep the class mix. */
export function stratifiedSample(items: readonly Item[], n: number, seed: number): Item[] {
  if (n >= items.length) return [...items];
  const byClass = new Map<string, Item[]>();
  for (const i of items) byClass.set(i.class, [...(byClass.get(i.class) ?? []), i]);
  const classes = [...byClass.keys()].sort();
  const quota = new Map(classes.map((c) => [c, Math.floor((byClass.get(c)!.length * n) / items.length)]));
  let left = n - [...quota.values()].reduce((a, b) => a + b, 0);
  // Largest remainders take the leftover places, in a seeded order for equal remainders.
  for (const c of shuffle(classes, rng(seedOf(seed, "remainder"))).sort((a, b) =>
    ((byClass.get(b)!.length * n) / items.length % 1) - ((byClass.get(a)!.length * n) / items.length % 1))) {
    if (left-- <= 0) break;
    quota.set(c, quota.get(c)! + 1);
  }
  const out: Item[] = [];
  for (const c of classes) out.push(...shuffle(byClass.get(c)!, rng(seedOf(seed, "sample", c))).slice(0, quota.get(c)!));
  return out.sort((a, b) => a.id.localeCompare(b.id));
}

export function loadRunItems(config: RunConfig): Item[] {
  const items: Item[] = [];
  for (const f of config.datasets) items.push(...loadItems(resolve(BENCH_DIR, f)));
  for (const f of config.privateDatasets ?? []) items.push(...loadItems(resolve(storeDir(), f)));
  const problems = itemProblems(items);
  if (problems.length) throw new Error(`dataset problems:\n  ${problems.slice(0, 20).join("\n  ")}`);
  const excluded = new Set(config.excludeItems ?? []);
  const kept = items.filter((i) => !excluded.has(i.id));
  return config.limit ? stratifiedSample(kept, config.limit, config.seed) : kept;
}

export function makePlan(o: {
  config: RunConfig;
  method: Method;
  items: Item[];
  registry: Readonly<Record<string, ProviderSpec>>;
  judge: Judge | null;
  checkJudge?: Judge | null;
  checkCommitted?: boolean;
}): Plan {
  const { config, method, items, registry } = o;
  const warnings: string[] = [];
  if (o.checkCommitted !== false) for (const p of committedProblems()) warnings.push(`dataset: ${p}`);
  const providers: ProviderPlan[] = [];
  let searchCalls = 0;
  let searchUsd = 0;
  for (const id of config.providers) {
    const spec = registry[id];
    if (!spec) throw new Error(`provider ${id} is not in the registry`);
    if (!spec.search) throw new Error(`provider ${id} has no search endpoint`);
    const pace = paceFor(spec.search.rateLimits as RateLimit[], config.rateLimitPlans?.[id], method.pacing.shareOfLimit, method.pacing.maxInFlightPerProvider, { results: method.search.maxResults });
    const pw: string[] = [];
    const profiles = config.profiles.filter((profile) => hasProfile(config, profile, id)).map((profile) => {
      const settings = settingsFor(config, profile, id);
      if (settings.depth && !spec.search!.request.params.depth) throw new Error(`${id} (${profile}): depth is set but the provider has no depth parameter`);
      for (const k of Object.keys(settings.providerOptions ?? {})) {
        if (!Object.prototype.hasOwnProperty.call(spec.search!.providerOptions, k)) throw new Error(`${id} (${profile}): ${k} is not a documented provider option`);
      }
      const r = reservation(spec, "search", method.search.maxResults, settings, method);
      const calls = items.length * config.passes;
      if (r.boundUsd === null) pw.push(`${profile}: the SDK cannot bound this call's cost (${r.basis}), reserving ${usd(r.usd, 4)} per call`);
      if (r.requiresOverageOff) pw.push(`${profile}: free within its allowance; the ${usd(r.usd, 4)} bound holds only while paid use past the allowance is off on the account`);
      return { profile, settings, reservation: r, calls, maxUsd: calls * r.usd };
    });
    const perDayCalls = profiles.reduce((a, p) => a + p.calls, 0);
    if (pace.perDay !== null && perDayCalls > pace.perDay) pw.push(`plans ${perDayCalls} calls, above half the documented daily limit (${pace.perDay}); split the run across days`);
    const allowance = spec.search.pricing.allowance;
    if (allowance && allowance.unit === "requests" && perDayCalls > allowance.limit) {
      pw.push(`plans ${perDayCalls} calls, above the free allowance of ${allowance.limit} per ${allowance.per}; past it calls are ${allowance.beyond.billing === "opt-in" ? "refused unless paid use is on" : "billed"}`);
    }
    const limit = config.providerLimits?.[id];
    const perCall = profiles.length ? creditReservation(spec, "search", method.search.maxResults, profiles[0]!.settings) : null;
    if (limit?.credits !== undefined && profiles.some((p) => creditReservation(spec, "search", method.search.maxResults, p.settings) === null)) {
      throw new Error(`${id}: providerLimits sets a credit limit, but ${id} is not priced in credits (or an option makes its credits unknown)`);
    }
    const planned = perCall === null ? null : profiles.reduce((a, p) => a + p.calls * creditReservation(spec, "search", method.search.maxResults, p.settings)!, 0);
    const since = limit?.since ? ` since ${limit.since}` : "";
    if (limit?.credits !== undefined && planned !== null && planned > limit.credits) pw.push(`plans ${planned} credits, above its limit of ${limit.credits}${since}; it stops when the limit is reached and the others continue`);
    if (limit?.calls !== undefined && perDayCalls > limit.calls) pw.push(`plans ${perDayCalls} calls, above its limit of ${limit.calls} calls${since}; it stops when the limit is reached and the others continue`);
    const credits: ProviderPlan["credits"] = perCall === null && !limit ? null : {
      perCall, planned,
      ...(limit?.credits !== undefined ? { limit: limit.credits } : {}),
      ...(limit?.calls !== undefined ? { callLimit: limit.calls } : {}),
      ...(limit?.since ? { since: limit.since } : {}),
    };
    const terms = (spec as { terms?: { benchmarkPublication: string; rawResponseStorage: string } }).terms ?? null;
    if (terms && (terms.benchmarkPublication === "restricted" || terms.rawResponseStorage === "restricted")) {
      pw.push(`terms restrict benchmarking or storing results (publication: ${terms.benchmarkPublication}, storage: ${terms.rawResponseStorage}); owner decided to publish regardless`);
    }
    for (const p of profiles) { searchCalls += p.calls; searchUsd += p.maxUsd; }
    providers.push({ id, name: spec.name, profiles, pace, terms, credits, warnings: pw });
  }

  // Worst case: every search in a page pass returns a full list and no URL repeats.
  const units = config.providers.reduce((n, p) => n + config.profiles.filter((x) => hasProfile(config, x, p)).length, 0);
  const maxUrls = config.pagePasses.length * items.length * units * method.pages.topK;

  const judgeItems = config.judgeItems > 0 ? stratifiedSample(items, config.judgeItems, seedOf(config.seed, "judge")) : [];
  let judge: Plan["judge"] = null;
  let checkJudge: Plan["checkJudge"] = null;
  if (judgeItems.length) {
    if (!o.judge) throw new Error("judgeItems is set but no judge is configured");
    const pricing: JudgePricing = config.judgePricing ?? "list-price";
    const maxPairs = judgeItems.length * config.providers.length * method.judge.topK;
    const maxRepeats = Math.ceil(maxPairs * method.judge.selfConsistencyShare);
    // The longest possible input: the longest judged query, a full passage, a 300-byte URL and a 200-byte title.
    const longest = judgeItems.reduce((a, b) => (Buffer.byteLength(b.query) > Buffer.byteLength(a.query) ? b : a));
    const worst = {
      query: longest.query, url: `https://${"x".repeat(292)}`, title: "x".repeat(200),
      passage: selectPassage("\u{10FFFF}".repeat(method.judge.passageMaxBytes), longest.query, method.judge.passageMaxBytes),
    };
    const perCall = o.judge.maxCallCostUsd(worst);
    const covered = pricing === "covered-by-plan";
    judge = { id: o.judge.info.id, pricing, maxPairs, maxRepeats, perCallMaxUsd: covered ? 0 : perCall, maxUsd: covered ? 0 : (maxPairs + maxRepeats) * perCall };
    if (o.checkJudge) {
      const perCheck = o.checkJudge.maxCallCostUsd(worst);
      checkJudge = { id: o.checkJudge.info.id, pricing, maxPairs, perCallMaxUsd: covered ? 0 : perCheck, maxUsd: covered ? 0 : maxPairs * perCheck };
    }
  }
  const maxUsd = searchUsd + (judge?.maxUsd ?? 0) + (checkJudge?.maxUsd ?? 0);
  if (maxUsd > config.capUsd) warnings.push(`the worst case (${usd(maxUsd)}) exceeds the cap (${usd(config.capUsd)}); the run stops when the cap is reached`);
  if (config.capUsd > method.budget.monthlyCapUsd) warnings.push(`the run cap is above the monthly cap (${usd(method.budget.monthlyCapUsd)}); the monthly cap applies`);
  return {
    runName: config.name,
    method: method.method,
    items: items.map((i) => ({ id: i.id, split: i.split, class: i.class })),
    itemsSha256: sha256(canonical(items)),
    judgeItemIds: judgeItems.map((i) => i.id),
    providers,
    search: { calls: searchCalls, maxUsd: searchUsd },
    pages: { fetcher: method.pages.fetcher, maxUrls, maxInFlight: method.pages.maxInFlight, perHostIntervalMs: method.pages.perHostIntervalMs },
    judge,
    checkJudge,
    maxUsd,
    capUsd: config.capUsd,
    warnings,
  };
}

/** The hash that pins a resumed run to the same plan (spend figures excluded, so a cap can be raised). */
export function planHash(plan: Plan, config: RunConfig): string {
  return sha256(canonical({
    items: plan.itemsSha256, judge: plan.judgeItemIds, method: plan.method,
    providers: plan.providers.map((p) => ({ id: p.id, profiles: p.profiles.map((x) => ({ profile: x.profile, settings: x.settings })) })),
    passes: config.passes, pagePasses: config.pagePasses, seed: config.seed,
  }));
}

const pad = (s: string, n: number) => s.padEnd(n);
const lpad = (s: string, n: number) => s.padStart(n);
const money = (x: number, d = 2) => `$${x.toFixed(d)}`;

export function formatPlan(plan: Plan, extra: { mode: string; monthCashUsd?: number; monthlyCapUsd: number; credits?: Record<string, number>; creditsUsed?: Record<string, number> }): string {
  const L: string[] = [];
  const counts = plan.items.reduce<Record<string, number>>((m, i) => ((m[i.class] = (m[i.class] ?? 0) + 1), m), {});
  L.push(`searchSDK Benchmarks spend plan (dry run: nothing is sent)`);
  L.push(`run ${plan.runName}, method ${plan.method}, mode ${extra.mode}`);
  L.push(`${plan.items.length} items: ${Object.entries(counts).map(([c, n]) => `${c} ${n}`).join(", ")}`);
  L.push("");
  L.push(`${pad("search", 26)}${lpad("calls", 7)}  ${pad("reserve per call (SDK cost bound)", 36)}${lpad("max", 9)}`);
  for (const p of plan.providers) {
    for (const x of p.profiles) {
      L.push(`${pad(`${p.id} (${x.profile})`, 26)}${lpad(String(x.calls), 7)}  ${pad(`${money(x.reservation.usd, 4)} = ${x.reservation.basis}`, 36)}${lpad(money(x.maxUsd), 9)}`);
    }
  }
  L.push(`${pad("search subtotal", 26)}${lpad(String(plan.search.calls), 7)}  ${pad("", 36)}${lpad(money(plan.search.maxUsd), 9)}`);
  const credited = plan.providers.filter((p) => p.credits);
  if (credited.length) {
    L.push("");
    L.push("provider credits (the provider's own units; limits count every run and smoke check in the ledger):");
    for (const p of credited) {
      const c = p.credits!;
      const calls = p.profiles.reduce((a, x) => a + x.calls, 0);
      const used = extra.creditsUsed?.[p.id];
      const head = c.perCall === null ? `${calls} calls (not priced in credits)` : `${c.perCall} per call x ${calls} calls = ${c.planned} credits`;
      const lim = c.limit !== undefined
        ? `; limit ${c.limit}${c.since ? ` since ${c.since}` : ""}${used !== undefined ? `, ${used} used, ${c.limit - used - (c.planned ?? 0)} to spare` : ""}`
        : c.callLimit !== undefined ? `; limit ${c.callLimit} calls${c.since ? ` since ${c.since}` : ""}` : "";
      L.push(`  ${pad(p.id, 10)}${head}${lim}`);
    }
  }
  if (plan.judge?.pricing === "list-price") {
    const j = plan.judge;
    L.push("");
    L.push(`judge ${j.id}: (${j.maxPairs} pairs + ${j.maxRepeats} repeats) x ${money(j.perCallMaxUsd, 4)} max per call${lpad(money(j.maxUsd), 9)}`);
    const c = plan.checkJudge;
    if (c) L.push(`check judge ${c.id}: ${c.maxPairs} pairs x ${money(c.perCallMaxUsd, 4)} max per call${lpad(money(c.maxUsd), 9)}`);
  }
  L.push("");
  L.push("not charged (outside the spend total):");
  const pg = plan.pages;
  L.push(pg.maxUrls ? `  pages: at most ${pg.maxUrls} URLs through the harness's own fetcher (${pg.fetcher}; no provider, ${pg.maxInFlight} in flight, ${pg.perHostIntervalMs} ms between calls to one host)` : "  pages: off");
  if (plan.judge?.pricing === "covered-by-plan") {
    const j = plan.judge;
    L.push(`  judge ${j.id}: ${j.maxPairs} pairs + ${j.maxRepeats} repeats, covered by plan; any charge the judge reports halts the run`);
    const c = plan.checkJudge;
    if (c) L.push(`  check judge ${c.id}: ${c.maxPairs} pairs, covered by plan; same halt rule`);
  } else if (!plan.judge) L.push("  judge: off");
  L.push("");
  L.push(`maximum possible spend ${money(plan.maxUsd)}; run cap ${money(plan.capUsd)}; monthly cap ${money(extra.monthlyCapUsd)}${extra.monthCashUsd !== undefined ? ` (${money(extra.monthCashUsd)} already spent this month)` : ""}`);
  if (extra.credits && Object.keys(extra.credits).length) L.push(`declared credits: ${Object.entries(extra.credits).map(([k, v]) => `${k} ${money(v)}`).join(", ")}`);
  L.push(`pacing: ${plan.providers.map((p) => `${p.id} ${p.pace.intervalMs} ms/${p.pace.maxInFlight} in flight`).join("; ")}`);
  const w = [...plan.warnings, ...plan.providers.flatMap((p) => p.warnings.map((x) => `${p.id}: ${x}`))];
  if (w.length) {
    L.push("");
    L.push("notes:");
    for (const x of w) L.push(`  - ${x}`);
  }
  return L.join("\n");
}

export const runsDir = () => join(storeDir(), "runs");
