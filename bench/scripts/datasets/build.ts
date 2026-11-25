// Builds candidate items for a dataset spec from openly licensed sources.
//
//   node scripts/datasets/build.ts --spec datasets/specs/public-1.0.0.json [--today YYYY-MM-DD]
//
// Writes <store>/candidates/<name>-<version>.jsonl (the store is BENCH_STORE or
// <repo>/.local/bench). Review the candidates, write the review file, then run
// scripts/datasets/assemble.ts. Nothing here calls a search provider.
//
// Rules on top of each template's own:
// - candidates are taken in a seeded random order per template, never by how
//   providers do on them;
// - a subject (Wikidata entity, PEP, CVE, product, paper) is used once across
//   the spec and every set it excludes, so splits never share a subject;
// - at most `maxPerAnswer` items share a first answer, so no common answer
//   (a big city, a prolific author) dominates a class;
// - a candidate that fails item validation (answer in the query, short alias)
//   is skipped before sampling, so counts are met without hand edits.
import { join, resolve } from "node:path";
import { itemProblems, loadItems, type Item } from "../../src/dataset/items.ts";
import { normalize } from "../../src/dataset/match.ts";
import { buildFromWikidata } from "../../src/dataset/wikidata.ts";
import { BENCH_DIR, readJson, rng, seedOf, shuffle, storeDir, writeJsonl } from "../../src/util/core.ts";
import { NEW_TEMPLATES } from "./templates.ts";
import { SOURCE_TEMPLATES, type Candidate } from "./sources.ts";

export interface Spec {
  name: string;
  version: string;
  split: "public" | "private" | "fresh";
  seed: number;
  builtOn: string;
  /** Marks candidate ids so they never collide with earlier sets (for example "p1"). */
  idPrefix: string;
  /** Committed sets copied into this one unchanged, ahead of the new items. */
  carry?: string[];
  /** Sets whose queries and subjects this build must not reuse (paths relative to bench/, or `store:` paths in the local store). */
  exclude?: string[];
  maxPerAnswer?: number;
  /**
   * Also treat the Wikidata statement and the entity that holds it as used subjects, so two birthplace
   * items about one author never share a statement, within the set or across the sets it excludes.
   * (Added after public-1.0.0 was built; that spec leaves it off so its build stays reproducible.)
   */
  uniqueHolders?: boolean;
  templates: { id: string; count: number }[];
}

export const subjectOf = (i: Pick<Item, "source">): string => i.source.entity ?? `${i.source.name}:${(i.source.path ?? []).join("/")}`;
/** The subject, plus (with uniqueHolders) the statement and the entity holding it. */
export function subjectsOf(i: Pick<Item, "source">, uniqueHolders: boolean): string[] {
  const st = i.source.statement?.toLowerCase();
  return [subjectOf(i), ...(uniqueHolders && st ? [`st:${st}`, st.split(/[-$]/)[0]!.toUpperCase()] : [])];
}
const firstAnswer = (i: Pick<Item, "answers" | "answerPatterns" | "answerUrls">) => normalize(i.answers[0] ?? i.answerUrls[0] ?? i.answerPatterns[0] ?? "");

function args(): Record<string, string> {
  const a = process.argv.slice(2);
  const out: Record<string, string> = {};
  for (let i = 0; i < a.length; i += 2) out[a[i]!.replace(/^--/, "")] = a[i + 1]!;
  return out;
}

/**
 * Wikidata alias lists mix real variants with nicknames, misspellings and bare surnames that match unrelated
 * text ("Wood" for Grant Wood, "Pink City" for Los Angeles). Kept: the label; for a one-word label, one-word
 * variants and longer names that contain it; for a Han, kana or Hangul label, same-script variants and Latin
 * names of two or more words; for a longer label, aliases of two or more words that share a
 * word of four or more letters with it. At most eight.
 */
export function pruneAliases(answers: readonly string[]): string[] {
  const [label, ...rest] = answers;
  if (!label) return [];
  const words = (s: string) => normalize(s).split(" ").filter(Boolean);
  const lw = words(label);
  const keep = [label];
  // Han, kana and Hangul names are split by "·" rather than spaces, and come in several scripts (simplified,
  // traditional); keep their same-script variants and full Latin names.
  const unspaced = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u.test(label);
  for (const a of rest) {
    const aw = words(a);
    if (!aw.length || keep.some((k) => normalize(k) === normalize(a))) continue;
    const ok = unspaced
      ? /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u.test(a) || aw.length >= 2
      : lw.length === 1
      ? aw.length === 1 || aw.includes(lw[0]!)
      : aw.length >= 2 && aw.some((w) => w.length >= 4 && lw.includes(w));
    if (ok) keep.push(a);
  }
  return keep.slice(0, 8);
}

/** A committed set (relative to bench/), or a local-store set written as `store:<path>` (for example `store:private/private-1.0.0.jsonl`). */
export const loadSet = (p: string): Item[] => loadItems(p.startsWith("store:") ? resolve(storeDir(), p.slice(6)) : resolve(BENCH_DIR, p));

async function main(): Promise<void> {
  if (process.env.BENCH_TEST) throw new Error("dataset builds fetch public sources; not in tests");
  const f = args();
  const specPath = resolve(f.spec ?? "");
  const spec = readJson<Spec>(specPath);
  const today = f.today ?? spec.builtOn;
  const log = (l: string) => console.error(l);
  const ctx = { today, fetch: globalThis.fetch, log };

  const usedQueries = new Set<string>();
  const usedSubjects = new Set<string>();
  const answerCount = new Map<string, number>();
  for (const p of [...(spec.exclude ?? []), ...(spec.carry ?? [])]) {
    for (const i of loadSet(p)) { usedQueries.add(normalize(i.query)); for (const k of subjectsOf(i, !!spec.uniqueHolders)) usedSubjects.add(k); }
  }
  for (const p of spec.carry ?? []) for (const i of loadSet(p)) answerCount.set(firstAnswer(i), (answerCount.get(firstAnswer(i)) ?? 0) + 1);
  const maxPerAnswer = spec.maxPerAnswer ?? 2;

  const out: Item[] = [];
  for (const want of spec.templates) {
    let ordered: Candidate[];
    const source = SOURCE_TEMPLATES.find((t) => t.id === want.id);
    if (source) {
      const cands = await source.candidates(ctx, spec.split === "fresh" ? "fresh" : "public");
      ordered = shuffle(cands, rng(seedOf(spec.seed, want.id))).map(({ subject: _s, ...c }) => c);
    } else {
      // The Wikidata builder returns every candidate, in its seeded order, when asked for more than exist.
      ordered = (await buildFromWikidata({ templates: [{ id: want.id, count: 1_000_000 }], seed: spec.seed, today, fetch: globalThis.fetch, idPrefix: "x", catalog: NEW_TEMPLATES, log }))
        .map((c) => ({ ...c, answers: pruneAliases(c.answers) }));
    }
    let picked = 0, invalid = 0, reused = 0, crowded = 0;
    for (const c of ordered) {
      if (picked >= want.count) break;
      const probe = { ...c, id: c.split === "fresh" ? "fresh-probe" : "pub-probe", split: c.split === "fresh" ? "fresh" : "public" } as Item;
      if (itemProblems([probe]).length) { invalid++; continue; }
      const q = normalize(c.query);
      const ks = subjectsOf(c, !!spec.uniqueHolders);
      if (usedQueries.has(q) || ks.some((k) => usedSubjects.has(k))) { reused++; continue; }
      const a = firstAnswer(c);
      if ((answerCount.get(a) ?? 0) >= maxPerAnswer) { crowded++; continue; }
      usedQueries.add(q); for (const k of ks) usedSubjects.add(k); answerCount.set(a, (answerCount.get(a) ?? 0) + 1);
      picked++;
      out.push({ ...c, id: `cand-${spec.idPrefix}-${want.id}-${String(picked).padStart(3, "0")}` } as Item);
    }
    log(`${want.id}: ${ordered.length} candidates, ${picked}/${want.count} picked (skipped ${invalid} invalid, ${reused} reused, ${crowded} crowded answers)`);
  }
  const file = join(storeDir(), "candidates", `${spec.name}-${spec.version}.jsonl`);
  writeJsonl(file, out);
  console.log(`${out.length} candidates in ${file}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e: unknown) => { console.error(e instanceof Error ? e.message : String(e)); process.exitCode = 1; });
}
