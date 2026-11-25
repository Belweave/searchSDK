// The contents track (METHOD-contents.md): its method file, run config and
// URL set. The method fixes the conditions of a version; a run config says
// which providers, which URL set, how many passes and how much may be spent.
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { BENCH_DIR, readJson, readJsonl, sha256 } from "../util/core.ts";
import { readFileSync } from "node:fs";

export const STRATA = ["reference", "pooled", "long", "js", "pdf"] as const;
export type Stratum = (typeof STRATA)[number];

export interface ContentsMethod {
  method: string;
  /** One default contents call per URL: one URL per call for every provider, the same deadline, no retries, no fallback, no options. */
  call: { timeoutMs: number; maxRetries: number; urlsPerCall: 1 };
  /** The fields of the returned page the known answer is looked for in. */
  match: { fields: ("content" | "title")[] };
  /** Completeness and noise against the harness's own text (word shingles). */
  completeness: { shingleWords: number; passageChars: number; minHarnessChars: number };
  /** PDFs: a call on a document of N pages reserves (1 + reservePerPage * N) times the SDK's per-URL bound, for every provider. */
  documents: { reservePerPage: number };
  /** A stratum below this many paired URLs is published as "too small", never as a score. */
  reporting: { minStratumN: number };
  stats: { bootstrap: number; seed: number; confidence: number; minSeparation: number };
  reliability: { floor: number };
  budget: { monthlyCapUsd: number; unknownPriceUsd: number };
  pacing: { shareOfLimit: number; maxInFlightPerProvider: number; itemWindow: number; rateLimitPauseMs: number };
}

export const CONTENTS_METHOD_PATH = join(BENCH_DIR, "config", "contents-method.json");
export const loadContentsMethod = (path = CONTENTS_METHOD_PATH) => readJson<ContentsMethod>(path);

export interface ContentsConfig {
  name: string;
  description?: string;
  /** Always "contents": a search run config is refused by the contents commands, and the other way round. */
  track: "contents";
  providers: string[];
  /** The committed URL set (relative to bench/), and the builder spec that makes it. */
  urlSet: string;
  urlSpec: string;
  passes: number;
  capUsd: number;
  creditsUsd?: Record<string, number>;
  providerLimits?: Record<string, { credits?: number; calls?: number; since?: string }>;
  rateLimitPlans?: Record<string, string>;
  seed: number;
}

export function loadContentsConfig(path: string): ContentsConfig {
  const c = readJson<ContentsConfig>(resolve(path));
  const problems: string[] = [];
  if (c.track !== "contents") problems.push('track: "contents"');
  if (!c.name || !/^[a-z0-9-]{1,40}$/.test(c.name)) problems.push("name: lowercase letters, digits and dashes");
  if (!Array.isArray(c.providers) || !c.providers.length) problems.push("providers: at least one");
  if (typeof c.urlSet !== "string" || typeof c.urlSpec !== "string") problems.push("urlSet and urlSpec: paths");
  if (!Number.isInteger(c.passes) || c.passes < 1 || c.passes > 5) problems.push("passes: 1 to 5");
  if (typeof c.capUsd !== "number" || !(c.capUsd > 0)) problems.push("capUsd: a positive number");
  if (!Number.isInteger(c.seed)) problems.push("seed: an integer");
  if (problems.length) throw new Error(`${path}:\n  ${problems.join("\n  ")}`);
  return c;
}

/** One URL of the set. Public data only: URLs and answer keys from public sets; never a private item. */
export interface ContentsUrl {
  id: string;
  url: string;
  stratum: Stratum;
  /** Where the URL came from. `pool` URLs were read by the harness in a search run, from `provider`'s top results. */
  origin: { kind: "crosscheck" | "source" | "kev" | "arxiv" | "pool"; itemId?: string; provider?: string; runId?: string; subject?: string };
  answers: string[];
  answerPatterns: string[];
  /**
   * harness: the harness's own text of the page contained the answer at build time (and is checked again every pass).
   * source: the page is the cited source of the answer (a CVE record, the paper itself); the harness cannot read it as text.
   */
  truth: "harness" | "source";
  build: { on: string; httpStatus: number; mime: string; chars: number | null; contentSha256: string | null; answerAt: number | null; pdfPages?: number };
}

/** The builder spec: what the set is made from and how much of each stratum. */
export interface UrlSpec {
  name: string;
  version: string;
  seed: number;
  builtOn?: string;
  /** Committed item sets whose answer pages and cross-check pages are candidates. */
  datasets: string[];
  /** Completed search runs (in the store) whose harness-read pages are pooled; public and fresh items only. */
  runs: string[];
  quotas: Record<Stratum, number>;
  /** Pooled URLs: the same number from each provider's own top results, de-duplicated. */
  pooledProviders: string[];
  /** HTML pages whose harness text is at least this long go to the long stratum. */
  longMinChars: number;
  /** PDFs of more pages than this are left out (they cost per page at some providers). */
  pdfMaxPages: number;
  /** No more than this share of one stratum from one site (registrable domain), while other candidates remain. */
  maxSiteShare: number;
  /** Extra candidates beyond the datasets: KEV entries for the js stratum, arXiv papers for the pdf stratum. */
  extra: { kev: number; arxiv: { count: number; windowDays: [number, number] } };
}

export const CONTENTS_MANIFEST = join(BENCH_DIR, "datasets", "contents", "manifest.json");

export interface UrlSetManifestEntry { file: string; name: string; version: string; sha256: string; count: number; strata: Record<string, number>; builtOn: string; spec: string }

export function loadUrlSet(path: string): ContentsUrl[] {
  return readJsonl<ContentsUrl>(resolve(BENCH_DIR, path));
}

export const urlSetExists = (path: string) => existsSync(resolve(BENCH_DIR, path));

export function fileSha256(path: string): string {
  return sha256(readFileSync(resolve(BENCH_DIR, path)));
}

/** Problems with a URL set; empty when valid. */
export function urlSetProblems(urls: readonly ContentsUrl[]): string[] {
  const out: string[] = [];
  const ids = new Set<string>();
  const seen = new Set<string>();
  for (const u of urls) {
    if (!/^cu-[a-z]+-\d{3}$/.test(u.id)) out.push(`${u.id}: id cu-<stratum>-NNN`);
    if (ids.has(u.id)) out.push(`${u.id}: duplicate id`);
    ids.add(u.id);
    if (!STRATA.includes(u.stratum)) out.push(`${u.id}: unknown stratum ${u.stratum}`);
    if (!/^https?:\/\//.test(u.url)) out.push(`${u.id}: not an http(s) URL`);
    const key = u.url.replace(/#.*$/, "");
    if (seen.has(key)) out.push(`${u.id}: duplicate URL`);
    seen.add(key);
    if (!u.answers.length && !u.answerPatterns.length) out.push(`${u.id}: no answer key`);
    if (u.stratum === "pdf" && !(u.build.pdfPages! > 0)) out.push(`${u.id}: a PDF needs its page count`);
    if (u.truth === "harness" && u.build.answerAt === null) out.push(`${u.id}: truth "harness" but the answer was not found in the harness text`);
    if (u.origin.kind === "pool" && !u.origin.provider) out.push(`${u.id}: pooled URL without its provider`);
  }
  return out;
}
