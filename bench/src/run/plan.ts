// The plan: which items, which calls, and the most they can cost. Computed
// without any network access; `bench plan` prints it, and a live run shows it
// again and asks for confirmation before the first call.
import { join, resolve } from "node:path";
import { committedProblems, itemProblems, loadItems, type Item } from "../dataset/items.ts";
import type { Judge } from "../judge/judge.ts";
import { selectPassage } from "../judge/judge.ts";
import type { ProviderSpec } from "../sdk.ts";
import { BENCH_DIR, canonical, rng, seedOf, sha256, shuffle, storeDir, usd } from "../util/core.ts";
import type { Method, RunConfig, Settings } from "./config.ts";
import { paceFor, type Pace, type RateLimit } from "./pacer.ts";
import { reservation, type Reservation } from "./pricing.ts";

export interface ProviderPlan {
  id: string;
  name: string;
  profiles: { profile: string; settings: Settings; reservation: Reservation; calls: number; maxUsd: number }[];
  pace: Pace;
  terms: { benchmarkPublication: string; rawResponseStorage: string } | null;
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
  pages: { fetcher: string; maxUrls: number; reservation: Reservation; maxUsd: number; pace: Pace };
  judge: { id: string; maxPairs: number; maxRepeats: number; perCallMaxUsd: number; maxUsd: number } | null;
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
    const pace = paceFor(spec.search.rateLimits as RateLimit[], config.rateLimitPlans?.[id], method.pacing.shareOfLimit, method.pacing.maxInFlightPerProvider);
    const pw: string[] = [];
    const profiles = config.profiles.filter((profile) => hasProfile(config, profile, id)).map((profile) => {
      const settings = settingsFor(config, profile, id);
      if (settings.depth && !spec.search!.request.params.depth) throw new Error(`${id} (${profile}): depth is set but the provider has no depth parameter`);
      for (const k of Object.keys(settings.providerOptions ?? {})) {
        if (!Object.prototype.hasOwnProperty.call(spec.search!.providerOptions, k)) throw new Error(`${id} (${profile}): ${k} is not a documented provider option`);
      }
      const r = reservation(spec, "search", method.search.maxResults, settings, method);
      const calls = items.length * config.passes;
      if (r.listUsd === null) pw.push(`${profile}: price not public, reserving the worst case ${usd(r.usd, 4)} per call`);
      return { profile, settings, reservation: r, calls, maxUsd: calls * r.usd };
    });
    const perDayCalls = profiles.reduce((a, p) => a + p.calls, 0);
    if (pace.perDay !== null && perDayCalls > pace.perDay) pw.push(`plans ${perDayCalls} calls, above half the documented daily limit (${pace.perDay}); split the run across days`);
    const terms = (spec as { terms?: { benchmarkPublication: string; rawResponseStorage: string } }).terms ?? null;
    if (terms && (terms.benchmarkPublication === "restricted" || terms.rawResponseStorage === "restricted")) {
      pw.push(`terms restrict benchmarking or storing results (publication: ${terms.benchmarkPublication}, storage: ${terms.rawResponseStorage}); owner decided to publish regardless`);
    }
    for (const p of profiles) { searchCalls += p.calls; searchUsd += p.maxUsd; }
    providers.push({ id, name: spec.name, profiles, pace, terms, warnings: pw });
  }

  const fetcherSpec = registry[method.pages.fetcher];
  if (config.pagePasses.length && !fetcherSpec?.contents) throw new Error(`page fetcher ${method.pages.fetcher} has no contents endpoint`);
  const pageRes = fetcherSpec?.contents
    ? reservation(fetcherSpec, "contents", 1, {}, method)
    : { usd: 0, listUsd: 0, basis: "no fetcher" };
  // Worst case: every search in a page pass returns a full list and no URL repeats.
  const units = config.providers.reduce((n, p) => n + config.profiles.filter((x) => hasProfile(config, x, p)).length, 0);
  const maxUrls = config.pagePasses.length * items.length * units * method.pages.topK;
  const pagePace = fetcherSpec?.contents
    ? paceFor(fetcherSpec.contents.rateLimits as RateLimit[], config.rateLimitPlans?.[method.pages.fetcher], method.pacing.shareOfLimit, method.pacing.maxInFlightPerProvider)
    : { intervalMs: 0, maxInFlight: 1, perDay: null, basis: [] };
  if (pagePace.perDay !== null && maxUrls > pagePace.perDay) warnings.push(`page fetcher: up to ${maxUrls} fetches, above half its daily limit (${pagePace.perDay})`);

  const judgeItems = config.judgeItems > 0 ? stratifiedSample(items, config.judgeItems, seedOf(config.seed, "judge")) : [];
  let judge: Plan["judge"] = null;
  if (judgeItems.length) {
    if (!o.judge) throw new Error("judgeItems is set but no judge is configured");
    const maxPairs = judgeItems.length * config.providers.length * method.judge.topK;
    const maxRepeats = Math.ceil(maxPairs * method.judge.selfConsistencyShare);
    // The longest possible input: the longest judged query, a full passage, a 300-byte URL and a 200-byte title.
    const longest = judgeItems.reduce((a, b) => (Buffer.byteLength(b.query) > Buffer.byteLength(a.query) ? b : a));
    const perCall = o.judge.maxCallCostUsd({
      query: longest.query, url: `https://${"x".repeat(292)}`, title: "x".repeat(200),
      passage: selectPassage("\u{10FFFF}".repeat(method.judge.passageMaxBytes), longest.query, method.judge.passageMaxBytes),
    });
    judge = { id: o.judge.info.id, maxPairs, maxRepeats, perCallMaxUsd: perCall, maxUsd: (maxPairs + maxRepeats) * perCall };
  }
  const maxUsd = searchUsd + maxUrls * pageRes.usd + (judge?.maxUsd ?? 0);
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
    pages: { fetcher: method.pages.fetcher, maxUrls, reservation: pageRes, maxUsd: maxUrls * pageRes.usd, pace: pagePace },
    judge,
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

export function formatPlan(plan: Plan, extra: { mode: string; monthCashUsd?: number; monthlyCapUsd: number; credits?: Record<string, number> }): string {
  const L: string[] = [];
  const counts = plan.items.reduce<Record<string, number>>((m, i) => ((m[i.class] = (m[i.class] ?? 0) + 1), m), {});
  L.push(`searchSDK Benchmarks spend plan (dry run: nothing is sent)`);
  L.push(`run ${plan.runName}, method ${plan.method}, mode ${extra.mode}`);
  L.push(`${plan.items.length} items: ${Object.entries(counts).map(([c, n]) => `${c} ${n}`).join(", ")}`);
  L.push("");
  L.push(`${pad("search", 26)}${lpad("calls", 7)}  ${pad("reserve per call", 30)}${lpad("max", 9)}`);
  for (const p of plan.providers) {
    for (const x of p.profiles) {
      L.push(`${pad(`${p.id} (${x.profile})`, 26)}${lpad(String(x.calls), 7)}  ${pad(`${money(x.reservation.usd, 4)} = ${x.reservation.basis}`, 30)}${lpad(money(x.maxUsd), 9)}`);
    }
  }
  L.push(`${pad("search subtotal", 26)}${lpad(String(plan.search.calls), 7)}  ${pad("", 30)}${lpad(money(plan.search.maxUsd), 9)}`);
  L.push("");
  const pg = plan.pages;
  L.push(`pages via ${pg.fetcher}: at most ${pg.maxUrls} URLs x ${money(pg.reservation.usd, 4)} (${pg.reservation.basis})${lpad(money(pg.maxUsd), 9)}`);
  if (plan.judge) {
    const j = plan.judge;
    L.push(`judge ${j.id}: (${j.maxPairs} pairs + ${j.maxRepeats} repeats) x ${money(j.perCallMaxUsd, 4)} max per call${lpad(money(j.maxUsd), 9)}`);
  } else L.push("judge: off");
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
