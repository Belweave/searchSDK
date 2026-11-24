// Record shapes in a run directory. Attempt, page and judgment records hold
// no response text: text lives only under raw/, which is never published.
import { join } from "node:path";
import { sha256 } from "../util/core.ts";

export type Outcome =
  | "ok_nonempty" | "ok_empty" | "rate_limited" | "timeout" | "server_error" | "network_error" | "invalid_response"
  /** Our configuration is wrong (key, request, unsupported option): not scored, the provider is stopped. */
  | "setup_error"
  /** The run was interrupted: not scored, retried on resume. */
  | "aborted"
  /** A harness bug, not the provider's fault: not scored. */
  | "harness_error";

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
  resultCount: number;
  /** Result URLs in rank order (at most maxResults). */
  urls: string[];
  /** sha256 of each result's title and excerpts, for audit without publishing text. */
  resultHashes: string[];
  requestId: string | null;
  warnings: string[];
}

export interface PageRecord {
  urlKey: string;
  url: string;
  status: "ok" | "failed" | "error";
  code?: string;
  contentSha256: string | null;
  contentChars: number;
  costUsd: number | null;
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

/** A conservative URL key for de-duplicating pages: lowercased host, no fragment, no trailing slash. */
export function urlKey(url: string): string {
  try {
    const u = new URL(url);
    u.hash = "";
    u.hostname = u.hostname.toLowerCase();
    let s = u.toString();
    if (s.endsWith("/") && u.pathname !== "/") s = s.slice(0, -1);
    return s;
  } catch {
    return url;
  }
}

export const pairIdOf = (itemId: string, key: string) => sha256(`${itemId}\n${key}`).slice(0, 20);

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
    rawJudge: (pairId: string, repeat: number) => join(dir, "raw", "judge", `${pairId}-${repeat}.json`),
  };
}
