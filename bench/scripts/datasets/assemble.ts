// Turns reviewed candidates into a dataset.
//
//   node scripts/datasets/assemble.ts --spec datasets/specs/public-1.0.0.json
//   node scripts/datasets/assemble.ts --spec <store>/private/specs/private-1.0.0.json
//
// Public, fresh and tuning sets: carried sets first (unchanged), then the
// candidates after the committed review file (datasets/review/<name>-<version>.json);
// written to datasets/<public|fresh>/ and listed in datasets/manifest.json.
//
// Private sets: the review file lives next to the spec in the local store, and
// the result goes through `makePrivate` (new opaque ids and nonces) into
// <store>/private/; only the hashes reach datasets/private-manifest.json.
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { describeFile, itemProblems, loadItems, makePrivate, MANIFEST_PATH, writePrivateManifest, type Item } from "../../src/dataset/items.ts";
import { applyReview, type Review } from "../../src/dataset/review.ts";
import { BENCH_DIR, readJson, storeDir, writeJson, writeJsonl } from "../../src/util/core.ts";
import { loadSet, type Spec } from "./build.ts";

const a = process.argv.slice(2);
const flag = (k: string): string | undefined => (a.includes(`--${k}`) ? a[a.indexOf(`--${k}`) + 1] : undefined);

function main(): void {
  if (process.env.BENCH_TEST) throw new Error("not in tests");
  const specPath = resolve(flag("spec") ?? "");
  const spec = readJson<Spec>(specPath);
  const cands = loadItems(join(storeDir(), "candidates", `${spec.name}-${spec.version}.jsonl`));
  const reviewPath = spec.split === "private" ? join(dirname(specPath), `${spec.name}-${spec.version}.review.json`) : join(BENCH_DIR, "datasets", "review", `${spec.name}-${spec.version}.json`);
  const review = readJson<Review>(reviewPath);
  const reviewed = applyReview(cands, review, spec.split === "fresh" ? "fresh" : "pub");
  const items: Item[] = [...(spec.carry ?? []).flatMap(loadSet), ...reviewed];

  if (spec.split === "private") {
    const problems = itemProblems(items);
    if (problems.length) throw new Error(`reviewed set has problems:\n  ${problems.join("\n  ")}`);
    const { file, hashes } = makePrivate(items, spec.version);
    writePrivateManifest(`${spec.name}-${spec.version}`, hashes, spec.builtOn);
    console.log(`${hashes.length} private items in ${file} (local only); hashes in datasets/private-manifest.json`);
    return;
  }
  const problems = itemProblems(items, { committed: true });
  if (problems.length) throw new Error(`reviewed set has problems:\n  ${problems.join("\n  ")}`);
  const file = `datasets/${spec.split === "fresh" ? "fresh" : "public"}/${spec.name}-${spec.version}.jsonl`;
  writeJsonl(join(BENCH_DIR, file), items);
  const m = existsSync(MANIFEST_PATH) ? readJson<{ schema: string; datasets: ReturnType<typeof describeFile>[] }>(MANIFEST_PATH) : { schema: "dataset-manifest/1", datasets: [] };
  m.datasets = [...m.datasets.filter((d) => d.file !== file), describeFile(spec.name, spec.version, file)].sort((x, y) => x.file.localeCompare(y.file));
  writeJson(MANIFEST_PATH, m);
  const byClass = items.reduce<Record<string, number>>((acc, i) => ((acc[i.class] = (acc[i.class] ?? 0) + 1), acc), {});
  console.log(`${items.length} items in ${file}; manifest updated; ${JSON.stringify(byClass)}`);
}

main();
