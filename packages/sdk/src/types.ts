import type { SearchError } from "./errors.js";
import type { RetryPolicy } from "./native-transport.js";
export interface SearchRequest {
  query: string;
  /** Output ceiling (1–20; default 5). Providers may return fewer results. */
  limit?: number;
  /** Hostnames only; no schemes, paths, ports or wildcards in the alpha. */
  includeDomains?: readonly string[];
  excludeDomains?: readonly string[];
}

export interface ValidatedSearchRequest extends SearchRequest { limit: number }
export interface SearchOptions { signal?: AbortSignal }
export interface SearchBatchOptions extends SearchOptions {
  /** Active queries per batch, 1–64. Default 4; client maxConcurrency still applies. */
  concurrency?: number;
  /** Whole batch, including queued items. Defaults to the client's timeoutMs. */
  timeoutMs?: number;
}
/** Ordered outcome for one input; failures never discard successful sibling results. */
export type SearchBatchResult =
  | { index: number; status: "fulfilled"; value: SearchResponse }
  | { index: number; status: "rejected"; error: SearchError };
export type SearchErrorCode =
  | "invalid_request" | "unsupported_option" | "configuration" | "auth"
  | "rate_limit" | "network" | "unavailable" | "attempt_timeout"
  | "timeout" | "aborted" | "invalid_response" | "provider_error";

export interface SearchAttempt {
  provider: string;
  startedAt: string;
  durationMs: number;
  outcome: "success" | "error";
  code?: SearchErrorCode;
  status?: number;
  /** Parsed Retry-After delay; opt-in retry policies never shorten it. */
  retryAfterMs?: number;
}

export interface SearchResult {
  url: string;
  title?: string;
  snippet?: string;
  highlights?: readonly string[];
  /** Provider-native relevance; not comparable across providers. */
  score?: number;
  provenance: {
    provider: string;
    sourceUrl: string;
    /** SDK retrieval time, not publication time. */
    retrievedAt: string;
    requestId?: string;
  };
}

export interface SearchUsage { unit: "usd" | "credits"; value: number }
export interface SearchWarning { code: "fallback_used" | "provider_warning"; provider: string }
export interface ProviderResponse {
  results: readonly SearchResult[];
  usage: SearchUsage | null;
  warnings: readonly SearchWarning[];
}
export interface SearchResponse extends ProviderResponse {
  provider: string;
  attempts: readonly SearchAttempt[];
  /** Present only when this response reused an earlier successful operation. */
  reuse?: "cache" | "inflight";
}

/** Custom providers must enforce these capabilities and honor signal where possible. */
export interface SearchProvider {
  readonly id: string;
  readonly capabilities: {
    readonly domainFilters: boolean;
    /** Reject simultaneous include/exclude before any provider dispatches. */
    readonly mutuallyExclusiveDomainFilters?: boolean;
    /** SDK-supported capacities; may be conservative when native limits are undocumented. */
    readonly maxIncludeDomains: number;
    readonly maxExcludeDomains: number;
    /** Optional provider query ceiling in UTF-16 code units; checked across the chain. */
    readonly maxQueryLength?: number;
  };
  search(request: ValidatedSearchRequest, options: { signal: AbortSignal }): Promise<ProviderResponse>;
}

export interface SearchConfig {
  provider: SearchProvider;
  fallback?: readonly SearchProvider[];
  /** Whole call, including all attempts and JSON parsing. Default 10,000. */
  timeoutMs?: number;
  /** Each attempt, still bounded by timeoutMs. Default: whole-call budget. */
  attemptTimeoutMs?: number;
  /** Opt-in additional attempts per provider, before explicit fallback. May incur repeated billing. */
  retry?: RetryPolicy;
  /** Optional bound on active SDK search operations (queue counts toward timeoutMs). */
  maxConcurrency?: number;
  /** Opt-in per-client successful-result cache; no errors stored. */
  cache?: { ttlMs: number; maxEntries?: number };
  /** Opt-in sharing of identical in-flight searches, with independent caller cancellation. */
  deduplicate?: boolean;
}

export type FetchTransport = (input: string | URL, init?: RequestInit) => Promise<Response>;
export interface AdapterOptions { apiKey: string; fetch?: FetchTransport }
