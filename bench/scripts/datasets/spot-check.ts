// Draws the owner's spot-check list: a seeded 10% sample (at least 3) of each
// split, stratified by class so every class is seen.
//
//   node scripts/datasets/spot-check.ts --seed 20261125 --out datasets/review/spot-check-2026-12.json \
//     --public datasets/public/public-1.0.0.jsonl --fresh datasets/fresh/fresh-2026-12.jsonl \
//     --tuning datasets/public/tuning-0.1.0.jsonl --private private/private-1.0.0.jsonl
//
// Public, fresh and tuning entries carry the full item so the owner can check
// it against its source. Private entries carry only the opaque id, class and
// published hash; the full private entries go to <store>/private/spot-check-*.json.
import { basename, join, resolve } from "node:path";
import { itemHash, loadItems, type Item } from "../../src/dataset/items.ts";
import { BENCH_DIR, rng, seedOf, shuffle, storeDir, writeJson } from "../../src/util/core.ts";

const a = process.argv.slice(2);
const flag = (k: string): string | undefined => (a.includes(`--${k}`) ? a[a.indexOf(`--${k}`) + 1] : undefined);

export function sample(items: readonly Item[], seed: number, label: string, share = 0.1): Item[] {
  const want = Math.max(3, Math.ceil(items.length * share));
  const byClass = new Map<string, Item[]>();
  for (const i of [...items].sort((x, y) => x.id.localeCompare(y.id))) byClass.set(i.class, [...(byClass.get(i.class) ?? []), i]);
  const queues = [...byClass.keys()].sort().map((c) => shuffle(byClass.get(c)!, rng(seedOf(seed, label, c))));
  const out: Item[] = [];
  // Round-robin over classes, in seeded order within each.
  for (let k = 0; out.length < want; k++) {
    let added = false;
    for (const q of queues) if (q[k] && out.length < want) { out.push(q[k]!); added = true; }
    if (!added) break;
  }
  return out;
}

const view = (i: Item) => ({
  id: i.id, class: i.class, lang: i.lang, query: i.query,
  answers: i.answers, answerPatterns: i.answerPatterns, answerUrls: i.answerUrls,
  source: i.source.url, review: i.review.status, ownerCheck: null as null | "ok" | "wrong" | "ambiguous", ownerNote: "",
});

function main(): void {
  const seed = Number(flag("seed") ?? 20261125);
  const out: Record<string, unknown> = {
    note: "Seeded 10% sample per split, round-robin across classes. Set ownerCheck to ok, wrong or ambiguous after checking each answer against its source.",
    seed, drawnOn: new Date().toISOString().slice(0, 10), splits: {},
  };
  const splits = out.splits as Record<string, unknown>;
  for (const split of ["public", "fresh", "tuning"]) {
    const f = flag(split);
    if (!f) continue;
    const items = loadItems(resolve(BENCH_DIR, f));
    splits[split] = { file: f, of: items.length, items: sample(items, seed, split).map(view) };
  }
  const pf = flag("private");
  if (pf) {
    const items = loadItems(resolve(storeDir(), pf));
    const picked = sample(items, seed, "private");
    splits.private = { file: `<store>/${pf}`, of: items.length, items: picked.map((i) => ({ id: i.id, class: i.class, hash: itemHash(i), ownerCheck: null, ownerNote: "" })) };
    const local = join(storeDir(), "private", `spot-check-${basename(pf, ".jsonl")}.json`);
    writeJson(local, { seed, items: picked.map(view) });
    console.log(`private spot-check (full items, local only): ${local}`);
  }
  writeJson(resolve(BENCH_DIR, flag("out") ?? "datasets/review/spot-check.json"), out);
  console.log(`spot-check list: ${flag("out")}`);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
