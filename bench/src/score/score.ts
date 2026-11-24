// Scores a finished run from its run directory. Reads raw text locally to
// check answers; the Scores object it returns holds numbers, ids and URLs only.
import { existsSync, readFileSync } from "node:fs";
import type { Item } from "../dataset/items.ts";
import { textHasAnswer, urlMatches } from "../dataset/match.ts";
import type { Method, RunConfig } from "../run/config.ts";
import { hasProfile } from "../run/plan.ts";
import { pairIdOf, runPaths, SCORED_OUTCOMES, urlKey, type AttemptRecord, type HumanLabel, type JudgmentRecord, type PageRecord } from "../run/records.ts";
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
  reliability: Reliability;
  latencyMs: Latency;
  cost: CostSummary;
  /** Share of this provider's top URLs the harness's fetcher could not read (the same pages count as unreadable for everyone). */
  pageUnreadableRate: number | null;
  stale: { n: number; rate: number } | null;
  retest: { n: number; agreement: number; flipped: number; meanDelta: number; urlJaccard: number } | null;
  rank: RankRow | null;
  /** Per item (pass 1) known-answer scores, aligned with Scores.items; null where not scored. */
  perItem: (number | null)[];
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

export interface Scores {
  items: { id: string; class: string; split: string }[];
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

function cost(attempts: readonly AttemptRecord[], correctPass1: number, pass1: readonly AttemptRecord[]): CostSummary {
  const known = attempts.filter((a) => a.costUsd !== null);
  const total = known.reduce((s, a) => s + a.costUsd!, 0);
  const total1 = pass1.filter((a) => a.costUsd !== null).reduce((s, a) => s + a.costUsd!, 0);
  const count = (k: (a: AttemptRecord) => string) => attempts.reduce<Record<string, number>>((m, a) => ((m[k(a)] = (m[k(a)] ?? 0) + 1), m), {});
  const allKnown = known.length === attempts.length;
  return {
    attempts: attempts.length,
    totalUsd: round(total, 6),
    perQueryUsd: known.length ? round(total / known.length, 6) : null,
    perCorrectUsd: allKnown && correctPass1 > 0 ? round(total1 / correctPass1, 6) : null,
    known: allKnown,
    unknownAttempts: attempts.length - known.length,
    sources: count((a) => a.costSource),
    billed: count((a) => a.billed),
  };
}

/** nDCG@k for one ranked list of grades, against the ideal from the item's pooled grades. */
export function ndcg(grades: readonly number[], pool: readonly number[], k: number): number | null {
  const dcg = (g: readonly number[]) => g.slice(0, k).reduce((s, x, i) => s + (2 ** x - 1) / Math.log2(i + 2), 0);
  const ideal = dcg([...pool].sort((a, b) => b - a));
  if (ideal === 0) return null;
  return dcg(grades) / ideal;
}

export function scoreRun(dir: string, o: { config: RunConfig; method: Method; items: Item[]; judgeItemIds: string[] }): Scores {
  const { config, method } = o;
  const paths = runPaths(dir);
  const conf = method.stats.confidence;
  const attempts = readJsonl<AttemptRecord>(paths.attempts);
  // The last record for a key wins (a resumed aborted attempt is superseded).
  const byKey = new Map<string, AttemptRecord>();
  for (const a of attempts) byKey.set(a.key, a);
  const all = [...byKey.values()];
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

  // Judged pool: grades from repeat 0 per pair; repeats feed self-consistency.
  const judgments = readJsonl<JudgmentRecord>(paths.judgments);
  const grade0 = new Map<string, number>();
  const grade1 = new Map<string, number>();
  const judgedPairs = new Set<string>();
  const pageSourced = new Set<string>();
  for (const j of judgments) {
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
    const g = method.gate;
    const reasons: string[] = [];
    if (humanIds.length < g.minHumanLabels) reasons.push(`${humanIds.length} human labels, need ${g.minHumanLabels}`);
    if (!humanK || !(humanK.mean >= g.minJudgeHumanKappa)) reasons.push(`judge-human weighted kappa ${humanK ? humanK.mean.toFixed(2) : "n/a"} below ${g.minJudgeHumanKappa}`);
    if (!selfK || !(selfK.mean >= g.minSelfKappa)) reasons.push(`judge self-consistency kappa ${selfK ? selfK.mean.toFixed(2) : "n/a"} below ${g.minSelfKappa}`);
    agreement = {
      pairs: judgedPairs.size, judged: grade0.size, unresolved: judgedPairs.size - grade0.size,
      self: { n: selfIds.length, kappa: selfK },
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

  for (const profile of config.profiles) {
    const rows = new Map<string, { a1: Map<string, AttemptRecord>; per: Map<string, ReturnType<typeof knownAnswer>>; list: AttemptRecord[] }>();
    const runs = config.providers.filter((p) => hasProfile(config, profile, p));
    const exclude = new Set(config.profileExclude?.[profile] ?? []);
    const pItems = items.filter((i) => !exclude.has(i.id));
    for (const provider of runs) {
      const list = all.filter((a) => a.provider === provider && a.profile === profile);
      const a1 = new Map(list.filter((a) => a.pass === 1).map((a) => [a.itemId, a]));
      const per = new Map<string, ReturnType<typeof knownAnswer>>();
      for (const [id, a] of a1) {
        const item = items[index.get(id)!];
        if (!item || !SCORED.has(a.outcome)) continue;
        per.set(id, knownAnswer(item, a, readRaw<RawSearch>(paths.rawSearch(1, provider, profile, id)), pageText, method));
      }
      rows.set(provider, { a1, per, list });
    }
    // A provider scored on fewer than 90% of items is incomplete and left out of the ranking.
    const complete = runs.filter((p) => pItems.filter((i) => rows.get(p)!.per.has(i.id)).length >= 0.9 * pItems.length);
    const paired = pItems.filter((i) => complete.every((p) => rows.get(p)!.per.has(i.id)));
    pairedN[profile] = paired.length;
    droppedItems[profile] = pItems.length - paired.length;
    const ka: Record<string, number[]> = {};
    for (const p of complete) ka[p] = paired.map((i) => rows.get(p)!.per.get(i.id)!.score);
    const boot = pairedBootstrap(ka, method.stats.bootstrap, seedOf(method.stats.seed, profile), conf);

    // Judged nDCG@k on judged items, default profile only, where every pair in the pool has a grade.
    const judgedScores: Record<string, number[]> = {};
    const judgedItems: Item[] = [];
    if (profile === "default" && agreement) {
      const usableItems = paired.filter((i) => judgedSet.has(i.id)).filter((i) => {
        return complete.every((p) => {
          const a = rows.get(p)!.a1.get(i.id)!;
          return a.outcome !== "ok_nonempty" || a.urls.slice(0, method.judge.topK).every((u) => grade0.has(pairIdOf(i.id, urlKey(u))));
        });
      });
      for (const i of usableItems) {
        // The ideal ranking uses the best distinct (item, URL) pairs any provider returned.
        const distinct = new Map<string, number>();
        for (const p of complete) {
          const a = rows.get(p)!.a1.get(i.id)!;
          if (a.outcome === "ok_nonempty") for (const u of a.urls.slice(0, method.judge.topK)) distinct.set(pairIdOf(i.id, urlKey(u)), grade0.get(pairIdOf(i.id, urlKey(u)))!);
        }
        if (ndcg([], [...distinct.values()], method.judge.topK) === null) continue;
        judgedItems.push(i);
        for (const p of complete) {
          const a = rows.get(p)!.a1.get(i.id)!;
          const grades = a.outcome === "ok_nonempty" ? a.urls.slice(0, method.judge.topK).map((u) => grade0.get(pairIdOf(i.id, urlKey(u)))!) : [];
          (judgedScores[p] ??= []).push(ndcg(grades, [...distinct.values()], method.judge.topK)!);
        }
      }
    }
    const judgedBoot = Object.keys(judgedScores).length ? pairedBootstrap(judgedScores, method.stats.bootstrap, seedOf(method.stats.seed, "judged"), conf) : null;

    const inputs = complete.map((p) => {
      const r = reliability(rows.get(p)!.list, conf);
      return { id: p, quality: boot.each[p]!.mean, usableRate: r.usableRate, usableUpper: r.ci[1] };
    });
    const ranks = rank(inputs, boot, { floor: method.reliability.floor, minSeparation: method.stats.minSeparation });

    for (const provider of runs) {
      const { a1, per, list } = rows.get(provider)!;
      const isComplete = complete.includes(provider);
      const pass1 = list.filter((a) => a.pass === 1);
      const correct = [...per.values()].reduce((s, x) => s + x.score, 0);
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
        const raw = readRaw<RawSearch>(paths.rawSearch(1, provider, profile, i.id));
        const text = (raw?.results ?? []).map((r) => [r.title ?? "", ...r.excerpts].join(" ")).join("\n");
        if (i.superseded!.some((v) => new RegExp(`(?<![\\w.])v?${v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\w]|\\.\\d)`, "iu").test(text))) staleN++;
      }
      let rt: ProfileScore["retest"] = null;
      if (config.passes >= 2) {
        const a2 = new Map(list.filter((a) => a.pass === 2).map((a) => [a.itemId, a]));
        const ids = [...per.keys()].filter((id) => a2.has(id) && SCORED.has(a2.get(id)!.outcome));
        const s2 = ids.map((id) => knownAnswer(items[index.get(id)!]!, a2.get(id)!, readRaw<RawSearch>(paths.rawSearch(2, provider, profile, id)), pageText, method).score);
        const t = retest(ids.map((id) => per.get(id)!.score), s2);
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
        reliability: reliability(list, conf),
        latencyMs: latency(list, method.search.timeoutMs),
        cost: cost(list, correct, pass1),
        pageUnreadableRate: fetched.length ? round(fetched.filter((p) => p.status !== "ok").length / fetched.length) : null,
        stale: freshIds.length ? { n: freshIds.length, rate: round(staleN / freshIds.length) } : null,
        retest: rt,
        rank: ranks.find((r) => r.id === provider) ?? null,
        perItem: items.map((i) => per.get(i.id)?.score ?? null),
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
      const cRanks = rank(cInputs, cBoot, { floor: method.reliability.floor, minSeparation: method.stats.minSeparation });
      for (const p of complete) {
        const list = rows.get(p)!.list.filter((a) => cIds.has(a.itemId));
        const r = reliability(list, conf);
        const l = latency(list, method.search.timeoutMs);
        const correct = cKa[p]!.reduce((s, x) => s + x, 0);
        const c = cost(list, correct, list.filter((a) => a.pass === 1));
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
  return { items: items.map((i) => ({ id: i.id, class: i.class, split: i.split })), pages: pageSummary, pairedN, droppedItems, profiles, cells, agreement };
}
