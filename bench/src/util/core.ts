// Small shared helpers: hashing, canonical JSON, a seeded PRNG, JSONL files,
// dates and paths. No dependencies.
import { createHash } from "node:crypto";
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const BENCH_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
export const REPO_DIR = resolve(BENCH_DIR, "..");

/** The git-ignored local store for raw responses, page text, labels, ledgers and private items. */
export function storeDir(): string {
  return resolve(process.env.BENCH_STORE ?? join(REPO_DIR, ".local", "bench"));
}

export function sha256(text: string | Uint8Array): string {
  return createHash("sha256").update(text).digest("hex");
}

/** JSON with object keys sorted at every level, so equal values hash equally. */
export function canonical(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  const o = value as Record<string, unknown>;
  return `{${Object.keys(o).filter((k) => o[k] !== undefined).sort().map((k) => `${JSON.stringify(k)}:${canonical(o[k])}`).join(",")}}`;
}

/** Deterministic PRNG (mulberry32) returning floats in [0, 1). */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A 32-bit seed derived from any strings, for per-item determinism. */
export function seedOf(...parts: (string | number)[]): number {
  return parseInt(sha256(parts.join("\u0000")).slice(0, 8), 16);
}

export function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

export function readJson<T = unknown>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

export function writeJson(path: string, value: unknown, mode = 0o644): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, { mode });
}

export function readJsonl<T = unknown>(path: string): T[] {
  if (!existsSync(path)) return [];
  const out: T[] = [];
  for (const line of readFileSync(path, "utf8").split("\n")) {
    if (!line.trim()) continue;
    try {
      out.push(JSON.parse(line) as T);
    } catch {
      // A torn last line from an interrupted write is ignored; earlier lines stay valid.
    }
  }
  return out;
}

export function appendJsonl(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  appendFileSync(path, `${JSON.stringify(value)}\n`, { mode: 0o600 });
}

export function writeJsonl(path: string, values: readonly unknown[]): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, values.map((v) => `${JSON.stringify(v)}\n`).join(""));
}

export function isoDate(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export function monthOf(ms: number): string {
  return new Date(ms).toISOString().slice(0, 7);
}

export function addDays(date: string, days: number): string {
  return isoDate(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000);
}

export const round = (x: number, digits = 4): number => Math.round(x * 10 ** digits) / 10 ** digits;

export function usd(x: number | null, digits = 2): string {
  return x === null ? "unknown" : `$${x.toFixed(digits)}`;
}
