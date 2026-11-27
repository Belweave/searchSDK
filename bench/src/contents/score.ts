// Scores a contents run (METHOD-contents.md, Scores). Reads local raw text to
// measure completeness; the object it returns holds numbers and ids only.
import { existsSync, readFileSync } from "node:fs";
import { normalize, textHasAnswer } from "../dataset/match.ts";
import { LOCAL_OUTAGE_WINDOW_MS } from "../run/records.ts";
import { rank, type RankRow } from "../score/rank.ts";
import { mean, pairedBootstrap, quantile, wilson, type Interval } from "../score/stats.ts";
import { round } from "../util/core.ts";
import { answerOffset, keyOf } from "./build.ts";
import { STRATA, type ContentsConfig, type ContentsMethod, type ContentsUrl } from "./config.ts";
import { CONTENTS_SCORED, contentsPaths, readContentsAttempts, readProbes, type ContentsAttempt, type ContentsOutcome } from "./runner.ts";

export interface ContentsProviderScore {
  provider: string;
  status: "scored" | "incomplete";
  /** Paired URLs scored for fidelity. */
  n: number;
  fidelity: Interval;
  reliability: { attempts: number; usable: number; usableRate: number; ci: [number, number]; rates: Record<string, number> };
  latencyMs: { n: number; p50: number; p90: number; p95: number; censoredAtMs: number; timeouts: number };
  cost: { attempts: number; totalUsd: number; perPageUsd: number | null; perCorrectUsd: number | null; known: boolean; sources: Record<string, number> };
  completeness: { n: number; passageRecall: number | null; pageCoverage: number | null; extraneous: number | null; lengthRatio: number | null };
  strata: Record<string, { n: number; fidelity: Interval | null; tooSmall: boolean; usableRate: number; group: number | null }>;
  /** Pooled URLs only: fidelity on pages pooled from this provider's own search results, and on the others'. */
  ownPool: { own: { n: number; fidelity: number | null }; others: { n: number; fidelity: number | null } } | null;
  retest: { n: number; flipped: number } | null;
  rank: RankRow | null;
  perUrl: (number | null)[];
}

export interface ContentsScores {
  urls: { id: string; stratum: string }[];
  pairedN: number;
  excluded: { unavailable: number; truthLost: number; unpaired: number };
  timing: { urls: number; p50Ms: number; p95Ms: number; maxMs: number };
  providers: ContentsProviderScore[];
}

/** A network failure shared with another provider within the outage window is ours, not the provider's (METHOD §4). */
export function reclassifyContents(attempts: readonly ContentsAttempt[]): ContentsAttempt[] {
  const net = attempts.filter((a) => a.outcome === "network_error").map((a) => ({ a, t: Date.parse(a.startedAt) }));
  return attempts.map((a) => {
    if (a.outcome !== "network_error") return a;
    if (a.probeOnline === false) return { ...a, outcome: "local_network" as ContentsOutcome };
    const t = Date.parse(a.startedAt);
    return net.some((o) => o.a.provider !== a.provider && Math.abs(o.t - t) <= LOCAL_OUTAGE_WINDOW_MS) ? { ...a, outcome: "local_network" as ContentsOutcome } : a;
  });
}

const SCORED = new Set<string>(CONTENTS_SCORED);

/** Word shingles of a normalized text. */
export function shingles(text: string, k: number): Set<string> {
  const w = normalize(text).split(" ").filter(Boolean);
  const out = new Set<string>();
  for (let i = 0; i + k <= w.length; i++) out.add(w.slice(i, i + k).join(" "));
  if (w.length && w.length < k) out.add(w.join(" "));
  return out;
}

/** Provider text as words: Markdown link targets, image syntax and bare URLs removed (they are not page text). */
export function providerWords(content: string): string {
  return content.replace(/!\[[^\]]*\]\([^)]*\)/g, " ").replace(/\]\([^)]*\)/g, "]").replace(/https?:\/\/\S+/g, " ");
}

/** The answer-bearing passage of the harness text: `chars` on either side of the first answer, in normalized text. */
export function answerPassage(harnessText: string, u: Pick<ContentsUrl, "answers" | "answerPatterns">, chars: number): string | null {
  const k = keyOf(u);
  if (!textHasAnswer(harnessText, k)) return null;
  const n = normalize(harnessText);
  let at = answerOffset(harnessText, k) ?? 0;
  if (!u.answers.some((a) => n.includes(normalize(a)))) {
    // A pattern matched the raw text: find the same words in the normalized text.
    const m = u.answerPatterns.map((p) => new RegExp(p, "iu").exec(harnessText.normalize("NFKC"))).find(Boolean);
    at = m ? Math.max(0, n.indexOf(normalize(m[0]))) : 0;
  }
  return n.slice(Math.max(0, at - chars), at + chars).replace(/^\S*\s/, "").replace(/\s\S*$/, "");
}

export function completenessOf(harnessText: string, content: string, u: Pick<ContentsUrl, "answers" | "answerPatterns">, m: ContentsMethod["completeness"]) {
  const H = shingles(harnessText, m.shingleWords);
  const P = shingles(providerWords(content), m.shingleWords);
  const passage = answerPassage(harnessText, u, m.passageChars);
  const S = passage ? shingles(passage, m.shingleWords) : new Set<string>();
  let inter = 0;
  for (const s of H) if (P.has(s)) inter++;
  let sp = 0;
  for (const s of S) if (P.has(s)) sp++;
  let extra = 0;
  for (const s of P) if (!H.has(s)) extra++;
  return {
    passageRecall: S.size ? sp / S.size : null,
    pageCoverage: H.size ? inter / H.size : null,
    extraneous: P.size ? extra / P.size : null,
    lengthRatio: harnessText.length ? content.length / harnessText.length : null,
  };
}

function readText(path: string, field: "text" | "content"): string | null {
  if (!existsSync(path)) return null;
  try { return (JSON.parse(readFileSync(path, "utf8")) as Record<string, string>)[field] ?? null; } catch { return null; }
}

const avg = (xs: (number | null)[]) => { const v = xs.filter((x): x is number => x !== null); return v.length ? round(mean(v)) : null; };

export function scoreContents(dir: string, o: { config: ContentsConfig; method: ContentsMethod; urls: ContentsUrl[] }): ContentsScores {
  const { config, method, urls } = o;
  const paths = contentsPaths(dir);
  const attempts = reclassifyContents(readContentsAttempts(paths.attempts));
  const probes = new Map(readProbes(paths.probes).map((p) => [`${p.pass}|${p.urlId}`, p]));
  const byKey = new Map(attempts.map((a) => [`${a.pass}|${a.urlId}|${a.provider}`, a]));
  const passes = Array.from({ length: config.passes }, (_, k) => k + 1);
  let unavailable = 0;
  let truthLost = 0;
  let unpaired = 0;
  // A URL is scored for fidelity only when, in every pass, the page was there, still stated the answer
  // (where the harness can read it), and every provider has a scored attempt.
  const paired: ContentsUrl[] = [];
  for (const u of urls) {
    const ps = passes.map((p) => probes.get(`${p}|${u.id}`));
    if (ps.some((p) => !p || !p.alive)) { unavailable++; continue; }
    if (u.truth === "harness" && ps.some((p) => p!.truthHolds === false)) { truthLost++; continue; }
    if (!passes.every((p) => config.providers.every((id) => SCORED.has(byKey.get(`${p}|${u.id}|${id}`)?.outcome ?? "")))) { unpaired++; continue; }
    paired.push(u);
  }
  const value = (a: ContentsAttempt | undefined) => (a && a.outcome === "ok_nonempty" && a.hasAnswer ? 1 : 0);
  const perUrl = (id: string, list: readonly ContentsUrl[]) => list.map((u) => mean(passes.map((p) => value(byKey.get(`${p}|${u.id}|${id}`)))));
  const boot = pairedBootstrap(Object.fromEntries(config.providers.map((id) => [id, perUrl(id, paired)])), method.stats.bootstrap, method.stats.seed, method.stats.confidence);
  const stratumBoot = Object.fromEntries(STRATA.map((s) => {
    const list = paired.filter((u) => u.stratum === s);
    return [s, { list, boot: list.length ? pairedBootstrap(Object.fromEntries(config.providers.map((id) => [id, perUrl(id, list)])), method.stats.bootstrap, method.stats.seed, method.stats.confidence) : null }];
  }));
  const pairedIds = new Set(paired.map((u) => u.id));
  const urlById = new Map(urls.map((u) => [u.id, u]));
  const providers: ContentsProviderScore[] = config.providers.map((id) => {
    const mine = attempts.filter((a) => a.provider === id);
    const scored = mine.filter((a) => SCORED.has(a.outcome));
    const usable = scored.filter((a) => a.outcome === "ok_nonempty").length;
    const rates: Record<string, number> = {};
    for (const x of CONTENTS_SCORED) rates[x] = scored.length ? round(scored.filter((a) => a.outcome === x).length / scored.length) : 0;
    const lat: number[] = [];
    let timeouts = 0;
    for (const a of scored) {
      if (a.outcome === "ok_nonempty" || a.outcome === "ok_empty" || a.outcome === "page_failed") lat.push(a.durationMs);
      else if (a.outcome === "timeout") { lat.push(method.call.timeoutMs); timeouts++; }
    }
    const known = scored.filter((a) => a.costUsd !== null);
    const total = known.reduce((s, a) => s + a.costUsd!, 0);
    const correct = scored.filter((a) => value(a) === 1).length;
    // Completeness: successful calls on pages the harness read as text, of at least minHarnessChars.
    const comp = scored.filter((a) => a.outcome === "ok_nonempty" && urlById.get(a.urlId)?.truth === "harness").flatMap((a) => {
      const h = readText(paths.rawProbe(a.pass, a.urlId), "text");
      const c = readText(paths.rawContent(a.pass, id, a.urlId), "content");
      if (!h || h.length < method.completeness.minHarnessChars || c === null) return [];
      return [completenessOf(h, c, urlById.get(a.urlId)!, method.completeness)];
    });
    const strata: ContentsProviderScore["strata"] = {};
    for (const s of STRATA) {
      const { list, boot: b } = stratumBoot[s]!;
      const sc = scored.filter((a) => urlById.get(a.urlId)?.stratum === s);
      strata[s] = { n: list.length, fidelity: b ? b.each[id]! : null, tooSmall: list.length < method.reporting.minStratumN, usableRate: sc.length ? round(sc.filter((a) => a.outcome === "ok_nonempty").length / sc.length) : 0, group: null };
    }
    const pooled = paired.filter((u) => u.stratum === "pooled");
    const own = pooled.filter((u) => u.origin.provider === id);
    const others = pooled.filter((u) => u.origin.provider !== id);
    const p1 = paired.map((u) => value(byKey.get(`1|${u.id}|${id}`)));
    const p2 = paired.map((u) => value(byKey.get(`2|${u.id}|${id}`)));
    return {
      provider: id, status: paired.length && config.providers.length ? "scored" : "incomplete", n: paired.length,
      fidelity: boot.each[id] ?? { mean: NaN, lo: NaN, hi: NaN },
      reliability: { attempts: scored.length, usable, usableRate: scored.length ? usable / scored.length : 0, ci: wilson(usable, scored.length, method.stats.confidence), rates },
      latencyMs: { n: lat.length, p50: round(quantile(lat, 0.5), 0), p90: round(quantile(lat, 0.9), 0), p95: round(quantile(lat, 0.95), 0), censoredAtMs: method.call.timeoutMs, timeouts },
      cost: {
        attempts: scored.length, totalUsd: round(total, 6), perPageUsd: known.length ? round(total / known.length, 6) : null,
        perCorrectUsd: known.length === scored.length && correct ? round(total / correct, 6) : null, known: known.length === scored.length,
        sources: scored.reduce<Record<string, number>>((m, a) => ((m[a.costSource] = (m[a.costSource] ?? 0) + 1), m), {}),
      },
      completeness: { n: comp.length, passageRecall: avg(comp.map((c) => c.passageRecall)), pageCoverage: avg(comp.map((c) => c.pageCoverage)), extraneous: avg(comp.map((c) => c.extraneous)), lengthRatio: comp.length ? round(quantile(comp.map((c) => c.lengthRatio ?? 0), 0.5)) : null },
      strata,
      ownPool: pooled.length ? {
        own: { n: own.length, fidelity: own.length ? round(mean(perUrl(id, own))) : null },
        others: { n: others.length, fidelity: others.length ? round(mean(perUrl(id, others))) : null },
      } : null,
      retest: config.passes >= 2 && paired.length ? { n: paired.length, flipped: round(p1.filter((x, i) => x !== p2[i]).length / paired.length) } : null,
      rank: null,
      perUrl: urls.map((u) => (pairedIds.has(u.id) ? mean(passes.map((p) => value(byKey.get(`${p}|${u.id}|${id}`)))) : null)),
    };
  });
  // Rank: fidelity, within reliability bands, ties by separation (METHOD §9). Cost and latency never move a rank.
  const rows = providers.filter((p) => p.status === "scored").map((p) => ({ id: p.provider, quality: p.fidelity.mean, usableRate: p.reliability.usableRate, usableUpper: p.reliability.ci[1] }));
  for (const r of rank(rows, boot, { floor: method.reliability.floor, minSeparation: method.stats.minSeparation })) providers.find((p) => p.provider === r.id)!.rank = r;
  for (const s of STRATA) {
    const b = stratumBoot[s]!.boot;
    if (!b || stratumBoot[s]!.list.length < method.reporting.minStratumN) continue;
    const rr = rank(providers.map((p) => ({ id: p.provider, quality: p.strata[s]!.fidelity!.mean, usableRate: p.strata[s]!.usableRate, usableUpper: 1 })), b, { floor: 0, minSeparation: method.stats.minSeparation });
    for (const r of rr) providers.find((p) => p.provider === r.id)!.strata[s]!.group = r.group;
  }
  const starts = new Map<string, number[]>();
  for (const a of attempts) { const t = Date.parse(a.startedAt); if (Number.isFinite(t)) starts.set(`${a.pass}|${a.urlId}`, [...(starts.get(`${a.pass}|${a.urlId}`) ?? []), t]); }
  const spreads = [...starts.values()].filter((x) => x.length > 1).map((x) => Math.max(...x) - Math.min(...x));
  return {
    urls: urls.map((u) => ({ id: u.id, stratum: u.stratum })), pairedN: paired.length, excluded: { unavailable, truthLost, unpaired },
    timing: spreads.length ? { urls: spreads.length, p50Ms: round(quantile(spreads, 0.5), 0), p95Ms: round(quantile(spreads, 0.95), 0), maxMs: Math.max(...spreads) } : { urls: 0, p50Ms: 0, p95Ms: 0, maxMs: 0 },
    providers,
  };
}

export function formatContentsScores(s: ContentsScores): string {
  const f = (x: number | null | undefined) => (x === null || x === undefined || !Number.isFinite(x) ? "  - " : x.toFixed(2));
  const L = [`${s.pairedN} paired URLs (unavailable ${s.excluded.unavailable}, answer gone from the page ${s.excluded.truthLost}, unpaired ${s.excluded.unpaired})`];
  L.push("group  provider     fidelity [95% CI]     usable  p50 ms  $/page    passage  coverage  extraneous");
  for (const p of [...s.providers].sort((a, b) => (a.rank?.position ?? 99) - (b.rank?.position ?? 99))) {
    const g = p.rank ? `${p.rank.group}${p.rank.tied ? "=" : " "}${p.rank.reliable ? " " : "!"}` : "n/a";
    L.push(`${g.padEnd(6)} ${p.provider.padEnd(12)} ${f(p.fidelity.mean)} [${f(p.fidelity.lo)}, ${f(p.fidelity.hi)}]   ${f(p.reliability.usableRate)}  ${String(p.latencyMs.p50).padStart(6)}  ${p.cost.perPageUsd === null ? "unknown" : p.cost.perPageUsd.toFixed(4)}    ${f(p.completeness.passageRecall)}     ${f(p.completeness.pageCoverage)}      ${f(p.completeness.extraneous)}`);
  }
  for (const st of STRATA) {
    const cells = s.providers.map((p) => p.strata[st]!).filter(Boolean);
    if (!cells[0]?.n) continue;
    L.push(`  ${st.padEnd(10)} n ${cells[0].n}${cells[0].tooSmall ? " (too small to publish)" : ""}: ${s.providers.map((p) => `${p.provider} ${f(p.strata[st]!.fidelity?.mean)}`).join(", ")}`);
  }
  return L.join("\n");
}
