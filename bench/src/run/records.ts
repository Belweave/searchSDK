// Record shapes in a run directory. Attempt, page and judgment records hold
// no response text: text lives only under raw/, which is never published.
import { join } from "node:path";
import type { UnreadableReason } from "../pages/fetcher.ts";
import { urlKey } from "../sdk.ts";
import { readJsonl, sha256 } from "../util/core.ts";

/** URL identity for de-duplicating pages and judged pairs: the SDK's own URL key (registry/policy.md). */
export { urlKey };

export type Outcome =
  | "ok_nonempty" | "ok_empty" | "rate_limited" | "timeout" | "server_error" | "network_error" | "invalid_response"
  /** Our configuration is wrong (key, request, unsupported option): not scored, the provider is stopped. */
  | "setup_error"
  /** The run was interrupted: not scored, retried on resume. */
  | "aborted"
  /** A harness bug, not the provider's fault: not scored. */
  | "harness_error"
  /** Our own connection was down (section 4): not scored, retried on resume. */
  | "local_network";

export const SCORED_OUTCOMES: readonly Outcome[] = ["ok_nonempty", "ok_empty", "rate_limited", "timeout", "server_error", "network_error", "invalid_response"];

export interface AttemptRecord {
  key: string;
  pass: number;
  itemId: string;
  provider: string;
  profile: string;
  startedAt: string;
  outcome: Outcome;
  code?: string;
  status?: number;
  /** Wall-clock milliseconds around the SDK call (monotonic). */
  durationMs: number;
  /** Billing of the single attempt the SDK made: yes, possible or no. */
  billed: string;
  costUsd: number | null;
  costSource: string;
  costEstimated: boolean;
  reservedUsd: number;
  /** Provider credits used, for providers priced in credits; null when unknown (the reservation was kept). */
  credits?: number | null;
  resultCount: number;
  /** Result URLs in rank order (at most maxResults). */
  urls: string[];
  /** sha256 of each result's title and excerpts, for audit without publishing text. */
  resultHashes: string[];
  requestId: string | null;
  warnings: string[];
  /** Whether the connectivity probe reached the internet after a network failure; absent when no probe ran. */
  probeOnline?: boolean;
}

/** Outcomes that are not the provider's: retried when the run resumes. */
export const RETRIED_OUTCOMES: readonly Outcome[] = ["aborted", "local_network"];

/** Two network failures of different providers starting this close together mean our own connection failed. */
export const LOCAL_OUTAGE_WINDOW_MS = 10_000;

/**
 * Reclassifies network failures that were our own connection's (section 4).
 * A network_error is local when the probe found us offline, or when a
 * different provider also had a network_error starting within
 * LOCAL_OUTAGE_WINDOW_MS: two independent services failing to connect in the
 * same seconds points at our side, even when the connection was back by the
 * time the probe ran. A provider's lone network_error stays the provider's.
 */
export function reclassifyLocalOutages(attempts: readonly AttemptRecord[]): AttemptRecord[] {
  const net = attempts.filter((a) => a.outcome === "network_error").map((a) => ({ a, t: Date.parse(a.startedAt) }));
  return attempts.map((a) => {
    if (a.outcome !== "network_error") return a;
    if (a.probeOnline === false) return { ...a, outcome: "local_network" };
    const t = Date.parse(a.startedAt);
    const local = net.some((o) => o.a.provider !== a.provider && Math.abs(o.t - t) <= LOCAL_OUTAGE_WINDOW_MS);
    return local ? { ...a, outcome: "local_network", code: a.code ?? "network" } : a;
  });
}

/** Every attempt record, local outages reclassified, in file order (superseded records included). */
export function readAttemptLog(path: string): AttemptRecord[] {
  return reclassifyLocalOutages(readJsonl<AttemptRecord>(path));
}

/** The current attempt for each key: the last record wins (a resumed retry supersedes what it retried). */
export function readAttempts(path: string): AttemptRecord[] {
  const byKey = new Map<string, AttemptRecord>();
  for (const a of readAttemptLog(path)) byKey.set(a.key, a);
  return [...byKey.values()];
}

/** One page read by the harness's own fetcher. Unreadable pages count the same for every provider that returned them. */
export interface PageRecord {
  urlKey: string;
  url: string;
  status: "ok" | "unreadable";
  reason?: UnreadableReason;
  httpStatus?: number;
  finalUrl?: string;
  /** The body was longer than pages.maxBytes; the first part was read. */
  truncated?: boolean;
  contentSha256: string | null;
  contentChars: number;
  durationMs: number;
}

export interface JudgmentRecord {
  pairId: string;
  itemId: string;
  urlKey: string;
  repeat: number;
  judge: string;
  passageSource: "page" | "snippet";
  grade: 0 | 1 | 2 | 3 | null;
  error?: string;
  inputTokens: number | null;
  outputTokens: number | null;
  costUsd: number | null;
  rationaleSha256: string | null;
  at: string;
}

export interface HumanLabel {
  pairId: string;
  grade: 0 | 1 | 2 | 3 | null;
  labeller: string;
  at: string;
}

export interface EventRecord {
  at: string;
  event: string;
  detail?: string;
  provider?: string;
}

export const pairIdOf = (itemId: string, key: string) => sha256(`${itemId}\n${key}`).slice(0, 20);

/**
 * The judged pair a provider's result belongs to. When the harness read the
 * page, every provider that returned the URL shares one pair, judged on the
 * harness's own text. When it could not, the judge sees the result's own
 * title and excerpts, so each provider gets a pair of its own: one provider's
 * snippet never grades another provider's result.
 */
export const judgePairIdOf = (itemId: string, key: string, provider: string, pageRead: boolean) =>
  pageRead ? pairIdOf(itemId, key) : sha256(`${itemId}\n${key}\n${provider}`).slice(0, 20);

export function runPaths(dir: string) {
  return {
    dir,
    run: join(dir, "run.json"),
    attempts: join(dir, "attempts.jsonl"),
    pages: join(dir, "pages.jsonl"),
    judgments: join(dir, "judgments.jsonl"),
    labels: join(dir, "human-labels.jsonl"),
    events: join(dir, "events.jsonl"),
    scores: join(dir, "scores.json"),
    publish: join(dir, "publish"),
    rawSearch: (pass: number, provider: string, profile: string, itemId: string) => join(dir, "raw", "search", `p${pass}`, provider, profile, `${itemId}.json`),
    rawPage: (key: string) => join(dir, "raw", "pages", `${sha256(key).slice(0, 32)}.json`),
    /** The primary judge's raw replies keep their original names; a check judge's carry its id. */
    rawJudge: (pairId: string, repeat: number, judge: string | null = null) => join(dir, "raw", "judge", judge ? `${pairId}-${repeat}-${judge.replace(/[^a-z0-9.-]/gi, "_")}.json` : `${pairId}-${repeat}.json`),
  };
}
