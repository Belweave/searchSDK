// Scores a finished run from its run directory. Reads raw text locally to
// check answers; the Scores object it returns holds numbers, ids and URLs only.
import { existsSync, readFileSync } from "node:fs";
import type { Item } from "../dataset/items.ts";
import { textHasAnswer, urlMatches } from "../dataset/match.ts";
import type { Method, RunConfig } from "../run/config.ts";
import { hasProfile, reusesDefault, scopeOf } from "../run/plan.ts";
import { judgePairIdOf, readAttempts, runPaths, SCORED_OUTCOMES, urlKey, type AttemptRecord, type HumanLabel, type JudgmentRecord, type PageRecord } from "../run/records.ts";
import { readJsonl, round, seedOf } from "../util/core.ts";
import { rank, type RankRow } from "./rank.ts";
import { bootstrapMean, kappaInterval, mean, pairedBootstrap, quantile, retest, wilson, type Interval } from "./stats.ts";

export interface Reliability {
  attempts: number;
  usable: number;
  usableRate: number;
  ci: [number, number];
  rates: Record<string, number>;
}

export interface Latency { n: number; p50: number; p90: number; p95: number; censoredAtMs: number; timeouts: number }

export interface CostSummary {
  attempts: number;
  totalUsd: number;
  perQueryUsd: number | null;
  perCorrectUsd: number | null;
  /** False when any attempt's cost is unknown; the per-query figure then covers known attempts only. */
  known: boolean;
  unknownAttempts: number;
  sources: Record<string, number>;
  billed: Record<string, number>;
}

export interface ProfileScore {
  provider: string;
  profile: string;
  status: "scored" | "incomplete";
  n: number;
  knownAnswer: Interval;
  components: { snippet: number; page: number; nav: number | null };
  judged: (Interval & { n: number; pageShare: number }) | null;
  /** The same judged score under the check judge's grades (a different vendor), shown beside the primary's; never the rank. */
  judgedCheck: (Interval & { n: number }) | null;
  reliability: Reliability;
  latencyMs: Latency;
  cost: CostSummary;
  /** Share of this provider's top URLs the harness's fetcher could not read (the same pages count as unreadable for everyone). */
  pageUnreadableRate: number | null;
  stale: { n: number; rate: number } | null;
  retest: { n: number; agreement: number; flipped: number; meanDelta: number; urlJaccard: number } | null;
  /** Only the default profile is ranked; other conditions are shown beside it. */
  rank: RankRow | null;
  /**
   * For a condition other than default: the default's known-answer score on the same items and
   * passes, and the paired difference (this condition minus default) with its interval.
   */
  vsDefault?: { n: number; default: Interval; diff: Interval } | null;
  /** Per item known-answer scores (the mean over every pass), aligned with Scores.items; null where not scored. */
  perItem: (number | null)[];
  /** Per pass (index pass - 1), per item known-answer scores, aligned with Scores.items. */
  perItemPasses: (number | null)[][];
}

export interface ClassCell {
  provider: string;
  profile: string;
  class: string;
  n: number;
  knownAnswer: Interval;
  judged: Interval | null;
  reliability: { usableRate: number; ci: [number, number] };
  latencyMs: { p50: number; p90: number; p95: number };
  cost: { perQueryUsd: number | null; perCorrectUsd: number | null; known: boolean };
  group: number | null;
  flags: string[];
}

export interface JudgeAgreement {
  pairs: number;
  judged: number;
  unresolved: number;
  self: { n: number; kappa: Interval | null };
  /** The check judge against the primary on the same pairs (quadratic weighted kappa). */
  cross: { judge: string; n: number; kappa: Interval | null; exact: number | null } | null;
  human: { n: number; kappa: Interval | null; exact: number | null };
  publishJudged: boolean;
  gateReason: string;
}

/** The page check's reach: how many distinct top URLs were read, and why the rest were not. */
export interface PageSummary {
  urls: number;
  read: number;
  unreadable: number;
  unreadableRate: number | null;
  reasons: Record<string, number>;
}

/** How far apart in time the providers were queried for the same item and pass: max minus min start time. */
export interface TimingSpread {
  items: number;
  p50Ms: number;
  p95Ms: number;
  maxMs: number;
}

export interface Scores {
  items: { id: string; class: string; split: string }[];
  timing: TimingSpread;
  pages: PageSummary;
  pairedN: Record<string, number>;
  droppedItems: Record<string, number>;
  profiles: ProfileScore[];
  cells: ClassCell[];
  agreement: JudgeAgreement | null;
}

interface RawSearch { results: { url: string; title: string | null; excerpts: string[] }[] }

function readRaw<T>(path: string): T | null {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8")) as T;
  } catch {
    return null;
  }
}

const SCORED = new Set<string>(SCORED_OUTCOMES);

/** Known-answer score of one attempt: answer in the top snippets or on a fetched top page; nav by official host. */
export function knownAnswer(item: Item, a: AttemptRecord, raw: RawSearch | null, pageText: (url: string) => string | null, method: Method): { score: number; snippet: number; page: number } {
  if (a.outcome !== "ok_nonempty") return { score: 0, snippet: 0, page: 0 };
  if (item.class === "nav") {
    const hit = a.urls.slice(0, method.knownAnswer.navTopK).some((u) => urlMatches(u, item.answerUrls)) ? 1 : 0;
    return { score: hit, snippet: hit, page: 0 };
  }
  const results = raw?.results ?? [];
  const snippet = results.slice(0, method.knownAnswer.snippetTopK).some((r) => textHasAnswer([r.title ?? "", ...r.excerpts].join("\n"), item)) ? 1 : 0;
  const page = a.urls.slice(0, method.knownAnswer.pageTopK).some((u) => {
    const t = pageText(u);
    return t !== null && textHasAnswer(t, item);
  }) ? 1 : 0;
  return { score: snippet || page ? 1 : 0, snippet, page };
}

function latency(attempts: readonly AttemptRecord[], timeoutMs: number): Latency {
  const xs: number[] = [];
  let timeouts = 0;
  for (const a of attempts) {
    if (a.outcome === "ok_nonempty" || a.outcome === "ok_empty") xs.push(a.durationMs);
    else if (a.outcome === "timeout") { xs.push(timeoutMs); timeouts++; }
  }
  return { n: xs.length, p50: round(quantile(xs, 0.5), 0), p90: round(quantile(xs, 0.9), 0), p95: round(quantile(xs, 0.95), 0), censoredAtMs: timeoutMs, timeouts };
}

function reliability(attempts: readonly AttemptRecord[], confidence: number): Reliability {
  const scored = attempts.filter((a) => SCORED.has(a.outcome));
  const usable = scored.filter((a) => a.outcome === "ok_nonempty").length;
  const rates: Record<string, number> = {};
  for (const o of SCORED_OUTCOMES) rates[o] = scored.length ? round(scored.filter((a) => a.outcome === o).length / scored.length) : 0;
  return { attempts: scored.length, usable, usableRate: scored.length ? usable / scored.length : 0, ci: wilson(usable, scored.length, confidence), rates };
}

/** `correct` counts correct answers over every pass, so cost per correct answer divides all spend by all correct answers. */
function cost(attempts: readonly AttemptRecord[], correct: number): CostSummary {
  const known = attempts.filter((a) => a.costUsd !== null);
  const total = known.reduce((s, a) => s + a.costUsd!, 0);
  const count = (k: (a: AttemptRecord) => string) => attempts.reduce<Record<string, number>>((m, a) => ((m[k(a)] = (m[k(a)] ?? 0) + 1), m), {});
  const allKnown = known.length === attempts.length;
  return {
    attempts: attempts.length,
    totalUsd: round(total, 6),
    perQueryUsd: known.length ? round(total / known.length, 6) : null,
    perCorrectUsd: allKnown && correct > 0 ? round(total / correct, 6) : null,
    known: allKnown,
    unknownAttempts: attempts.length - known.length,
    sources: count((a) => a.costSource),
    billed: count((a) => a.billed),
  };
}

/** For each item and pass with two or more calls, the time between the first and the last provider's start. */
export function timingSpread(attempts: readonly AttemptRecord[]): TimingSpread {
  const starts = new Map<string, number[]>();
  for (const a of attempts) {
    const t = Date.parse(a.startedAt);
    if (!Number.isFinite(t)) continue;
    const k = `${a.pass}|${a.itemId}`;
    starts.set(k, [...(starts.get(k) ?? []), t]);
  }
  const spreads = [...starts.values()].filter((xs) => xs.length > 1).map((xs) => Math.max(...xs) - Math.min(...xs));
  if (!spreads.length) return { items: 0, p50Ms: 0, p95Ms: 0, maxMs: 0 };
  return { items: spreads.length, p50Ms: round(quantile(spreads, 0.5), 0), p95Ms: round(quantile(spreads, 0.95), 0), maxMs: Math.max(...spreads) };
}

/** nDCG@k for one ranked list of grades, against the ideal from the item's pooled grades. */
export function ndcg(grades: readonly number[], pool: readonly number[], k: number): number | null {
  const dcg = (g: readonly number[]) => g.slice(0, k).reduce((s, x, i) => s + (2 ** x - 1) / Math.log2(i + 2), 0);
  const ideal = dcg([...pool].sort((a, b) => b - a));
  if (ideal === 0) return null;
  return dcg(grades) / ideal;
}

export function scoreRun(dir: string, o: { config: RunConfig; method: Method; items: Item[]; judgeItemIds: string[]; judges?: { primary: string | null; check: string | null } }): Scores {
  const { config, method } = o;
  const paths = runPaths(dir);
  const conf = method.stats.confidence;
  // The last record for a key wins (a resumed retry supersedes an aborted or local-outage attempt).
  const all = readAttempts(paths.attempts);
  const pages = new Map<string, PageRecord>();
  for (const p of readJsonl<PageRecord>(paths.pages)) pages.set(p.urlKey, p);
  const pageCache = new Map<string, string | null>();
  const pageText = (url: string): string | null => {
    const key = urlKey(url);
    if (!pageCache.has(key)) {
      const rec = pages.get(key);
      pageCache.set(key, rec?.status === "ok" ? (readRaw<{ content: string }>(paths.rawPage(key))?.content ?? null) : null);
    }
    return pageCache.get(key)!;
  };
  const items = o.items;
  const index = new Map(items.map((i, k) => [i.id, k]));
  const readKeys = new Set([...pages.values()].filter((p) => p.status === "ok").map((p) => p.urlKey));
  // The judged pair of one provider's result: shared when the harness read the page, the provider's own otherwise.
  const pairOf = (itemId: string, url: string, provider: string) => judgePairIdOf(itemId, urlKey(url), provider, readKeys.has(urlKey(url)));
  const noPages = (): string | null => null;

  // Judged pool: the primary judge's grades from repeat 0 per pair; its repeats feed self-consistency.
  // The check judge's grades feed cross-judge agreement and a judged score shown beside the primary's.
  const meta = readRaw<{ judge?: { id: string } | null; checkJudge?: { id: string } | null }>(paths.run);
  const primaryId = o.judges ? o.judges.primary : (meta?.judge?.id ?? null);
  const checkId = o.judges ? o.judges.check : (meta?.checkJudge?.id ?? null);
  const judgments = readJsonl<JudgmentRecord>(paths.judgments);
  const grade0 = new Map<string, number>();
  const grade1 = new Map<string, number>();
  const gradeCheck = new Map<string, number>();
  const judgedPairs = new Set<string>();
  const pageSourced = new Set<string>();
  for (const j of judgments) {
    if (checkId !== null && j.judge === checkId) {
      if (j.grade !== null && j.repeat === 0) gradeCheck.set(j.pairId, j.grade);
      continue;
    }
    if (primaryId !== null && j.judge !== primaryId) continue;
    judgedPairs.add(j.pairId);
    if (j.grade === null) continue;
    (j.repeat === 0 ? grade0 : grade1).set(j.pairId, j.grade);
    if (j.passageSource === "page") pageSourced.add(j.pairId);
  }
  const labels = readJsonl<HumanLabel>(paths.labels).filter((l) => l.grade !== null);
  const human = new Map(labels.map((l) => [l.pairId, l.grade!]));
  let agreement: JudgeAgreement | null = null;
  if (o.judgeItemIds.length) {
    const selfIds = [...grade1.keys()].filter((k) => grade0.has(k));
    const humanIds = [...human.keys()].filter((k) => grade0.has(k));
    const selfK = selfIds.length >= 2 ? kappaInterval(selfIds.map((k) => grade0.get(k)!), selfIds.map((k) => grade1.get(k)!), method.stats.bootstrap, seedOf(method.stats.seed, "self"), conf) : null;
    const humanK = humanIds.length >= 2 ? kappaInterval(humanIds.map((k) => grade0.get(k)!), humanIds.map((k) => human.get(k)!), method.stats.bootstrap, seedOf(method.stats.seed, "human"), conf) : null;
    const crossIds = [...gradeCheck.keys()].filter((k) => grade0.has(k));
    const crossK = crossIds.length >= 2 ? kappaInterval(crossIds.map((k) => grade0.get(k)!), crossIds.map((k) => gradeCheck.get(k)!), method.stats.bootstrap, seedOf(method.stats.seed, "cross"), conf) : null;
    const g = method.gate;
    const reasons: string[] = [];
    if (humanIds.length < g.minHumanLabels) reasons.push(`${humanIds.length} human labels, need ${g.minHumanLabels}`);
    if (!humanK || !(humanK.mean >= g.minJudgeHumanKappa)) reasons.push(`judge-human weighted kappa ${humanK ? humanK.mean.toFixed(2) : "n/a"} below ${g.minJudgeHumanKappa}`);
    if (!selfK || !(selfK.mean >= g.minSelfKappa)) reasons.push(`judge self-consistency kappa ${selfK ? selfK.mean.toFixed(2) : "n/a"} below ${g.minSelfKappa}`);
    if (checkId !== null && g.minCrossKappa !== undefined && (!crossK || !(crossK.mean >= g.minCrossKappa))) {
      reasons.push(`cross-judge weighted kappa ${crossK ? crossK.mean.toFixed(2) : "n/a"} (${checkId}) below ${g.minCrossKappa}`);
    }
    agreement = {
      pairs: judgedPairs.size, judged: grade0.size, unresolved: judgedPairs.size - grade0.size,
      self: { n: selfIds.length, kappa: selfK },
      cross: checkId === null ? null : { judge: checkId, n: crossIds.length, kappa: crossK, exact: crossIds.length ? crossIds.filter((k) => grade0.get(k) === gradeCheck.get(k)).length / crossIds.length : null },
      human: { n: humanIds.length, kappa: humanK, exact: humanIds.length ? humanIds.filter((k) => grade0.get(k) === human.get(k)).length / humanIds.length : null },
      publishJudged: reasons.length === 0,
      gateReason: reasons.length ? reasons.join("; ") : "passed",
    };
  }

  const judgedSet = new Set(o.judgeItemIds);
  const profiles: ProfileScore[] = [];
  const pairedN: Record<string, number> = {};
  const droppedItems: Record<string, number> = {};
  const cells: ClassCell[] = [];

  type Row = { a1: Map<string, AttemptRecord>; per: Map<string, ReturnType<typeof knownAnswer>>; passes: Map<string, number[]>; list: AttemptRecord[] };
  /** One provider's known-answer scores under a profile, on a scope's items and passes. Reused default calls are read from "default". */
  const rowFor = (provider: string, source: string, scopeIds: Set<string>, scopePasses: number[]): Row => {
    const list = all.filter((a) => a.provider === provider && a.profile === source && scopePasses.includes(a.pass) && scopeIds.has(a.itemId));
    const byPass = scopePasses.map((pass) => new Map(list.filter((a) => a.pass === pass).map((a) => [a.itemId, a])));
    const a1 = byPass[0]!;
    // An item counts only when every pass scored it; its score is the mean over the passes.
    const per = new Map<string, ReturnType<typeof knownAnswer>>();
    const passes = new Map<string, number[]>();
    for (const id of a1.keys()) {
      const item = items[index.get(id)!];
      if (!item) continue;
      const each: ReturnType<typeof knownAnswer>[] = [];
      for (const [k, m] of byPass.entries()) {
        const a = m.get(id);
        if (!a || !SCORED.has(a.outcome)) break;
        const pass = scopePasses[k]!;
        each.push(knownAnswer(item, a, readRaw<RawSearch>(paths.rawSearch(pass, provider, source, id)), config.pagePasses.includes(pass) ? pageText : noPages, method));
      }
      if (each.length !== scopePasses.length) continue;
      per.set(id, { score: mean(each.map((x) => x.score)), snippet: mean(each.map((x) => x.snippet)), page: mean(each.map((x) => x.page)) });
      passes.set(id, each.map((x) => x.score));
    }
    return { a1, per, passes, list };
  };

  for (const profile of config.profiles) {
    const rows = new Map<string, Row>();
    const runs = config.providers.filter((p) => hasProfile(config, profile, p));
    const exclude = new Set(config.profileExclude?.[profile] ?? []);
    const scope = scopeOf(config, profile, items);
    const scopeIds = new Set(scope.items.map((i) => i.id));
    const pItems = scope.items.filter((i) => !exclude.has(i.id));
    for (const provider of runs) rows.set(provider, rowFor(provider, reusesDefault(config, profile, provider) ? "default" : profile, scopeIds, scope.passes));
    // A provider scored on fewer than 90% of items is incomplete and left out of the ranking.
    const complete = runs.filter((p) => pItems.filter((i) => rows.get(p)!.per.has(i.id)).length >= 0.9 * pItems.length);
    const paired = pItems.filter((i) => complete.every((p) => rows.get(p)!.per.has(i.id)));
    pairedN[profile] = paired.length;
    droppedItems[profile] = pItems.length - paired.length;
    const ka: Record<string, number[]> = {};
    for (const p of complete) ka[p] = paired.map((i) => rows.get(p)!.per.get(i.id)!.score);
    const boot = pairedBootstrap(ka, method.stats.bootstrap, seedOf(method.stats.seed, profile), conf);

    // Judged nDCG@k on judged items, default profile only, where every pair in the pool has a grade from that judge.
    const judgedUnder = (grades: Map<string, number>) => {
      const scores: Record<string, number[]> = {};
      const used: Item[] = [];
      if (profile !== "default" || !agreement) return { scores, used };
      const usableItems = paired.filter((i) => judgedSet.has(i.id)).filter((i) => {
        return complete.every((p) => {
          const a = rows.get(p)!.a1.get(i.id)!;
          return a.outcome !== "ok_nonempty" || a.urls.slice(0, method.judge.topK).every((u) => grades.has(pairOf(i.id, u, p)));
        });
      });
      for (const i of usableItems) {
        // The ideal ranking uses the best distinct URLs any provider returned (a URL judged on several snippets counts once, at its best grade).
        const distinct = new Map<string, number>();
        for (const p of complete) {
          const a = rows.get(p)!.a1.get(i.id)!;
          if (a.outcome === "ok_nonempty") for (const u of a.urls.slice(0, method.judge.topK)) distinct.set(urlKey(u), Math.max(distinct.get(urlKey(u)) ?? 0, grades.get(pairOf(i.id, u, p))!));
        }
        if (ndcg([], [...distinct.values()], method.judge.topK) === null) continue;
        used.push(i);
        for (const p of complete) {
          const a = rows.get(p)!.a1.get(i.id)!;
          const g = a.outcome === "ok_nonempty" ? a.urls.slice(0, method.judge.topK).map((u) => grades.get(pairOf(i.id, u, p))!) : [];
          (scores[p] ??= []).push(ndcg(g, [...distinct.values()], method.judge.topK)!);
        }
      }
      return { scores, used };
    };
    const { scores: judgedScores, used: judgedItems } = judgedUnder(grade0);
    const judgedBoot = Object.keys(judgedScores).length ? pairedBootstrap(judgedScores, method.stats.bootstrap, seedOf(method.stats.seed, "judged"), conf) : null;
    const { scores: checkScores } = checkId !== null ? judgedUnder(gradeCheck) : { scores: {} as Record<string, number[]> };
    const checkBoot = Object.keys(checkScores).length ? pairedBootstrap(checkScores, method.stats.bootstrap, seedOf(method.stats.seed, "judged-check"), conf) : null;

    const inputs = complete.map((p) => {
      const r = reliability(rows.get(p)!.list, conf);
      return { id: p, quality: boot.each[p]!.mean, usableRate: r.usableRate, usableUpper: r.ci[1] };
    });
    // Only the default profile is ranked: the headline. Other conditions are shown beside it, never ranked.
    const ranks = profile === "default" ? rank(inputs, boot, { floor: method.reliability.floor, minSeparation: method.stats.minSeparation }) : [];
    // A condition other than default is compared with the default on its own items and passes.
    const matched = new Map<string, NonNullable<ProfileScore["vsDefault"]>>();
    if (profile !== "default" && config.profiles.includes("default")) {
      for (const p of complete) {
        const d = rowFor(p, "default", scopeIds, scope.passes);
        const ids = paired.filter((i) => d.per.has(i.id)).map((i) => i.id);
        if (!ids.length) continue;
        const b = pairedBootstrap({ condition: ids.map((id) => rows.get(p)!.per.get(id)!.score), default: ids.map((id) => d.per.get(id)!.score) }, method.stats.bootstrap, seedOf(method.stats.seed, profile, p, "vs-default"), conf);
        matched.set(p, { n: ids.length, default: b.each.default!, diff: b.diff.condition!.default! });
      }
    }

    for (const provider of runs) {
      const { a1, per, passes, list } = rows.get(provider)!;
      const isComplete = complete.includes(provider);
      const pass1 = list.filter((a) => a.pass === scope.passes[0]);
      const correct = [...per.values()].reduce((s, x) => s + x.score, 0) * scope.passes.length;
      const comp = [...per.entries()];
      const nonNav = comp.filter(([id]) => items[index.get(id)!]!.class !== "nav");
      const navs = comp.filter(([id]) => items[index.get(id)!]!.class === "nav");
      // Unreadable pages among this provider's top URLs: shows whether the page check reached its results as often as others'.
      const tops = pass1.filter((a) => a.outcome === "ok_nonempty").flatMap((a) => a.urls.slice(0, method.pages.topK));
      const fetched = tops.map((u) => pages.get(urlKey(u))).filter((x): x is PageRecord => !!x);
      // Freshness: results show only a superseded version and not the current one.
      const freshIds = items.filter((i) => i.class === "fresh" && i.superseded?.length && per.has(i.id));
      let staleN = 0;
      for (const i of freshIds) {
        if (per.get(i.id)!.score === 1) continue;
        const raw = readRaw<RawSearch>(paths.rawSearch(scope.passes[0]!, provider, reusesDefault(config, profile, provider) ? "default" : profile, i.id));
        const text = (raw?.results ?? []).map((r) => [r.title ?? "", ...r.excerpts].join(" ")).join("\n");
        if (i.superseded!.some((v) => new RegExp(`(?<![\\w.])v?${v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\w]|\\.\\d)`, "iu").test(text))) staleN++;
      }
      let rt: ProfileScore["retest"] = null;
      if (scope.passes.length >= 2) {
        const a2 = new Map(list.filter((a) => a.pass === scope.passes[1]).map((a) => [a.itemId, a]));
        const ids = [...per.keys()].filter((id) => a2.has(id) && SCORED.has(a2.get(id)!.outcome));
        const t = retest(ids.map((id) => passes.get(id)![0]!), ids.map((id) => passes.get(id)![1]!));
        const jac = ids.map((id) => {
          const x = new Set(a1.get(id)!.urls.map(urlKey));
          const y = new Set(a2.get(id)!.urls.map(urlKey));
          const inter = [...x].filter((u) => y.has(u)).length;
          const uni = new Set([...x, ...y]).size;
          return uni ? inter / uni : 1;
        });
        rt = { ...t, agreement: round(t.agreement), flipped: round(t.flipped), meanDelta: round(t.meanDelta), urlJaccard: round(mean(jac)) };
      }
      const jb = judgedBoot?.each[provider];
      profiles.push({
        provider, profile, status: isComplete ? "scored" : "incomplete",
        n: isComplete ? paired.length : per.size,
        knownAnswer: isComplete ? boot.each[provider]! : bootstrapMean([...per.values()].map((x) => x.score), method.stats.bootstrap, seedOf(method.stats.seed, provider), conf),
        components: {
          snippet: round(mean(nonNav.map(([, x]) => x.snippet))),
          page: round(mean(nonNav.map(([, x]) => x.page))),
          nav: navs.length ? round(mean(navs.map(([, x]) => x.score))) : null,
        },
        judged: jb ? { ...jb, n: judgedScores[provider]!.length, pageShare: 0 } : null,
        judgedCheck: checkBoot?.each[provider] ? { ...checkBoot.each[provider]!, n: checkScores[provider]!.length } : null,
        reliability: reliability(list, conf),
        latencyMs: latency(list, method.search.timeoutMs),
        cost: cost(list, correct),
        pageUnreadableRate: fetched.length ? round(fetched.filter((p) => p.status !== "ok").length / fetched.length) : null,
        stale: freshIds.length ? { n: freshIds.length, rate: round(staleN / freshIds.length) } : null,
        retest: rt,
        rank: ranks.find((r) => r.id === provider) ?? null,
        ...(profile !== "default" ? { vsDefault: matched.get(provider) ?? null } : {}),
        perItem: items.map((i) => per.get(i.id)?.score ?? null),
        perItemPasses: Array.from({ length: config.passes }, (_, k) => {
          const at = scope.passes.indexOf(k + 1);
          return items.map((i) => (at < 0 ? null : (passes.get(i.id)?.[at] ?? null)));
        }),
      });
    }
    // Share of judged pairs whose passage came from the fetched page rather than the provider's snippet.
    if (profile === "default" && judgedBoot) {
      const share = grade0.size ? [...grade0.keys()].filter((k) => pageSourced.has(k)).length / grade0.size : 0;
      for (const ps of profiles) if (ps.profile === "default" && ps.judged) ps.judged.pageShare = round(share);
    }

    // Routing cells: per class, the same scores on the class's items, with a tie group within the class.
    for (const cls of [...new Set(paired.map((i) => i.class))].sort()) {
      const cItems = paired.filter((i) => i.class === cls);
      const cKa: Record<string, number[]> = {};
      for (const p of complete) cKa[p] = cItems.map((i) => rows.get(p)!.per.get(i.id)!.score);
      const cBoot = pairedBootstrap(cKa, method.stats.bootstrap, seedOf(method.stats.seed, profile, cls), conf);
      const cIds = new Set(cItems.map((i) => i.id));
      const cInputs = complete.map((p) => {
        const r = reliability(rows.get(p)!.list.filter((a) => cIds.has(a.itemId)), conf);
        return { id: p, quality: cBoot.each[p]!.mean, usableRate: r.usableRate, usableUpper: r.ci[1] };
      });
      const cRanks = profile === "default" ? rank(cInputs, cBoot, { floor: method.reliability.floor, minSeparation: method.stats.minSeparation }) : [];
      for (const p of complete) {
        const list = rows.get(p)!.list.filter((a) => cIds.has(a.itemId));
        const r = reliability(list, conf);
        const l = latency(list, method.search.timeoutMs);
        const correct = cKa[p]!.reduce((s, x) => s + x, 0) * scope.passes.length;
        const c = cost(list, correct);
        const jv = judgedScores[p] ? judgedScores[p]!.filter((_, k) => judgedItems[k]!.class === cls) : [];
        const js = jv.length ? bootstrapMean(jv, method.stats.bootstrap, seedOf(method.stats.seed, "judged", p, cls), conf) : null;
        const flags: string[] = [];
        if (cItems.length < method.routing.minCellN) flags.push("insufficient-n");
        if (r.ci[1] < method.reliability.floor) flags.push("unreliable");
        if (!c.known) flags.push("cost-unknown");
        cells.push({
          provider: p, profile, class: cls, n: cItems.length, knownAnswer: cBoot.each[p]!, judged: js,
          reliability: { usableRate: round(r.usableRate), ci: [round(r.ci[0]), round(r.ci[1])] },
          latencyMs: { p50: l.p50, p90: l.p90, p95: l.p95 },
          cost: { perQueryUsd: c.perQueryUsd, perCorrectUsd: c.perCorrectUsd, known: c.known },
          group: cRanks.find((x) => x.id === p)?.group ?? null, flags,
        });
      }
    }
  }
  const reasons: Record<string, number> = {};
  for (const p of pages.values()) if (p.status !== "ok") reasons[p.reason ?? "unknown"] = (reasons[p.reason ?? "unknown"] ?? 0) + 1;
  const unreadable = Object.values(reasons).reduce((a, b) => a + b, 0);
  const pageSummary: PageSummary = { urls: pages.size, read: pages.size - unreadable, unreadable, unreadableRate: pages.size ? round(unreadable / pages.size) : null, reasons };
  return { items: items.map((i) => ({ id: i.id, class: i.class, split: i.split })), timing: timingSpread(all), pages: pageSummary, pairedN, droppedItems, profiles, cells, agreement };
}
