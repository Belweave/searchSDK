// Dataset items: the type, loading, validation, versioned manifest and the
// public/private split. Private items live only in the local store; the
// repository holds their salted hashes.
import { randomBytes } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { BENCH_DIR, canonical, readJson, readJsonl, REPO_DIR, sha256, storeDir, writeJson, writeJsonl } from "../util/core.ts";
import { validate, type Schema } from "../util/schema.ts";
import { containsAlias, normalize } from "./match.ts";

export const QUERY_CLASSES = ["fact.head", "fact.tail", "multihop", "tech", "nav", "nonen", "fresh"] as const;
export type QueryClass = (typeof QUERY_CLASSES)[number];

/** Openly licensed sources items may be built from; each source's licence is recorded per item and in METHOD.md. */
export type SourceName = "wikidata" | "pep" | "cisa-kev" | "endoflife-date" | "arxiv";
export type Licence = "CC0-1.0" | "MIT";

export interface Item {
  id: string;
  split: "public" | "private" | "fresh";
  class: QueryClass;
  lang: string;
  query: string;
  answers: string[];
  answerPatterns: string[];
  answerUrls: string[];
  superseded?: string[];
  source: { name: SourceName; url: string; entity?: string; path?: string[]; statement?: string; retrievedOn: string };
  licence: Licence;
  asOf: string;
  expires?: string;
  builder: { template: string; version: string };
  review: { status: "builder-checked" | "agent-reviewed" | "human-verified"; on: string; note?: string };
  nonce?: string;
}

export const ITEM_SCHEMA = readJson<Schema>(join(BENCH_DIR, "schemas", "item-1.schema.json"));
export const MANIFEST_PATH = join(BENCH_DIR, "datasets", "manifest.json");
export const PRIVATE_MANIFEST_PATH = join(BENCH_DIR, "datasets", "private-manifest.json");

/** The opaque, published identity of an item: sha256 over its canonical JSON (including a private item's nonce). */
export function itemHash(item: Item): string {
  return sha256(canonical(item));
}

/** Every problem with a list of items; empty when valid. `committed` adds the rules for files in the repository. */
export function itemProblems(items: readonly Item[], { committed = false } = {}): string[] {
  const out: string[] = [];
  const ids = new Set<string>();
  const queries = new Set<string>();
  for (const [i, item] of items.entries()) {
    const at = `${(item as { id?: unknown }).id ?? `#${i}`}`;
    for (const e of validate(item, ITEM_SCHEMA)) out.push(`${at}: ${e}`);
    if (typeof item.id !== "string") continue;
    if (ids.has(item.id)) out.push(`${at}: duplicate id`);
    ids.add(item.id);
    const q = normalize(item.query ?? "");
    if (queries.has(q)) out.push(`${at}: duplicate query`);
    queries.add(q);
    if (committed && item.split === "private") out.push(`${at}: private items must never be committed`);
    if (committed && item.nonce !== undefined) out.push(`${at}: a nonce marks a private item; never commit it`);
    if (item.split === "private" && !item.nonce) out.push(`${at}: private items need a nonce`);
    const prefix = { public: "pub-", private: "priv-", fresh: "fresh-" }[item.split];
    if (prefix && !item.id.startsWith(prefix)) out.push(`${at}: id must start with ${prefix}`);
    const scorable = (item.answers ?? []).some((a) => normalize(a).length > 0) || (item.answerPatterns ?? []).length > 0 || (item.answerUrls ?? []).length > 0;
    if (!scorable) out.push(`${at}: no usable answer, pattern or URL`);
    if (item.class === "nav" && !(item.answerUrls?.length)) out.push(`${at}: nav items need answerUrls`);
    if (item.class !== "nav" && item.answerUrls?.length) out.push(`${at}: only nav items use answerUrls`);
    if ((item.class === "fresh") !== (item.split === "fresh")) out.push(`${at}: fresh items and the fresh split go together`);
    if (item.class === "fresh" && !item.expires) out.push(`${at}: fresh items need expires`);
    for (const p of item.answerPatterns ?? []) {
      try {
        new RegExp(p, "iu");
      } catch {
        out.push(`${at}: pattern does not compile: ${p}`);
      }
    }
    for (const a of item.answers ?? []) {
      // A one- or two-character Latin alias matches too much text to be evidence of an answer.
      if (/^[\p{Script=Latin}\d ]+$/u.test(a) && normalize(a).replace(/ /g, "").length < 3) out.push(`${at}: alias too short to match reliably: ${a}`);
    }
    if (item.query && /[\u0000-\u001f\u007f]/.test(item.query)) out.push(`${at}: control character in query`);
    // An answer the query already contains would be "found" in any result that echoes the query.
    const nq = normalize(item.query ?? "");
    for (const a of item.answers ?? []) if (normalize(a) && containsAlias(nq, a)) out.push(`${at}: the query contains the answer ${a}`);
  }
  return out;
}

export function loadItems(path: string): Item[] {
  return readJsonl<Item>(resolve(path));
}

export interface ManifestEntry {
  name: string;
  version: string;
  file: string;
  sha256: string;
  count: number;
  classes: Record<string, number>;
  licences: Record<string, number>;
}

export function describeFile(name: string, version: string, file: string): ManifestEntry {
  const abs = resolve(BENCH_DIR, file);
  const items = loadItems(abs);
  const count = (key: (i: Item) => string) => items.reduce<Record<string, number>>((m, i) => ((m[key(i)] = (m[key(i)] ?? 0) + 1), m), {});
  return {
    name, version, file: relative(BENCH_DIR, abs), sha256: sha256(readFileSync(abs)), count: items.length,
    classes: count((i) => i.class), licences: count((i) => i.licence),
  };
}

/** Committed dataset files must match the manifest byte for byte: editing a set means bumping its version. */
export function manifestProblems(): string[] {
  const out: string[] = [];
  if (!existsSync(MANIFEST_PATH)) return ["datasets/manifest.json is missing"];
  const manifest = readJson<{ datasets: ManifestEntry[] }>(MANIFEST_PATH);
  const listed = new Set<string>();
  for (const entry of manifest.datasets) {
    listed.add(entry.file);
    const abs = resolve(BENCH_DIR, entry.file);
    if (!existsSync(abs)) { out.push(`${entry.file}: listed but missing`); continue; }
    const actual = describeFile(entry.name, entry.version, entry.file);
    if (actual.sha256 !== entry.sha256) out.push(`${entry.file}: content changed without a new version (sha256 differs)`);
    if (actual.count !== entry.count) out.push(`${entry.file}: count ${actual.count} != manifest ${entry.count}`);
  }
  for (const dir of ["public", "fresh"]) {
    const abs = join(BENCH_DIR, "datasets", dir);
    if (!existsSync(abs)) continue;
    for (const f of readdirSync(abs)) {
      const file = `datasets/${dir}/${f}`;
      if (f.endsWith(".jsonl") && !listed.has(file)) out.push(`${file}: not listed in datasets/manifest.json`);
    }
  }
  return out;
}

/** Every committed dataset, validated as committed files. */
export function committedProblems(): string[] {
  const out = [...manifestProblems()];
  const manifest = existsSync(MANIFEST_PATH) ? readJson<{ datasets: ManifestEntry[] }>(MANIFEST_PATH) : { datasets: [] };
  const all: Item[] = [];
  for (const entry of manifest.datasets) {
    const abs = resolve(BENCH_DIR, entry.file);
    if (!existsSync(abs)) continue;
    const items = loadItems(abs);
    out.push(...itemProblems(items, { committed: true }).map((e) => `${entry.file}: ${e}`));
    all.push(...items);
  }
  // A later version of a set may carry an item forward unchanged; the same id with different content is an error.
  const ids = new Map<string, string>();
  for (const i of all) {
    const c = canonical(i);
    if (ids.has(i.id) && ids.get(i.id) !== c) out.push(`id ${i.id} appears in more than one committed set with different content`);
    ids.set(i.id, c);
  }
  if (existsSync(PRIVATE_MANIFEST_PATH)) {
    const pm = readJson<{ hashes: { hash: string }[] }>(PRIVATE_MANIFEST_PATH);
    for (const h of pm.hashes) if (!/^[0-9a-f]{64}$/.test(h.hash)) out.push(`private-manifest: malformed hash`);
  }
  return out;
}

// ---- Private split ----

export function privateDir(): string {
  return join(storeDir(), "private");
}

/**
 * Turns candidate items into private items: new opaque ids and a random nonce
 * each. Writes them to the local store only and returns the manifest entries
 * (hash and class) that may be committed.
 */
export function makePrivate(items: readonly Item[], version: string, outFile = join(privateDir(), `private-${version}.jsonl`)): { file: string; hashes: { hash: string; class: QueryClass }[] } {
  const rel = relative(REPO_DIR, resolve(outFile));
  if (!rel.startsWith(".local") && !resolve(outFile).startsWith(storeDir())) throw new Error("private items may only be written inside the local store");
  const priv = items.map((i) => {
    const nonce = randomBytes(16).toString("hex");
    const p: Item = { ...i, split: "private", id: `priv-${sha256(nonce).slice(0, 12)}`, nonce };
    return p;
  });
  const problems = itemProblems(priv);
  if (problems.length) throw new Error(problems.join("\n"));
  writeJsonl(outFile, priv);
  return { file: outFile, hashes: priv.map((p) => ({ hash: itemHash(p), class: p.class })) };
}

export function writePrivateManifest(version: string, hashes: { hash: string; class: QueryClass }[], createdOn: string): void {
  writeJson(PRIVATE_MANIFEST_PATH, {
    schema: "private-manifest/1",
    version,
    createdOn,
    note: "Salted sha256 of each private item's canonical JSON. Items are revealed with their nonces when retired, so anyone can check them.",
    count: hashes.length,
    hashes,
  });
}
