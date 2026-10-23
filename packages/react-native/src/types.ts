import type { SearchError } from "./errors.js";
import type { FetchTransport } from "./transport.js";

/** Application gateway protocol v1; matches the reference normalized SDK. */
export interface SearchRequest {
  query: string;
  /** Output ceiling, 1–20. Defaults to 5. */
  limit?: number;
  /** ASCII hostnames only; normalized to lowercase and deduplicated. */
  includeDomains?: readonly string[];
  excludeDomains?: readonly string[];
}
export interface ValidatedSearchRequest extends SearchRequest { limit: number }
export interface SearchOptions { signal?: AbortSignal }
export interface SearchBatchOptions extends SearchOptions {
  /** Workers per batch, 1–64, default 4. Client maxConcurrency also applies. */
  concurrency?: number;
  /** Whole batch, including queued items. Defaults to the client timeout. */
  timeoutMs?: number;
}
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
  retryAfterMs?: number;
}
export interface SearchResult {
  url: string;
  title?: string;
  snippet?: string;
  highlights?: readonly string[];
  /** Provider-native score; not comparable across providers. */
  score?: number;
  provenance: {
    provider: string;
    sourceUrl: string;
    /** Retrieval time, not publication time. */
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
  reuse?: "cache" | "inflight";
}
export interface SearchClientOptions {
  /** Exact HTTPS URL. No credentials, query string, fragment, or path suffixing. */
  endpoint: string;
  /** Short-lived application token, resolved once per dispatched request. Never a provider key. */
  accessToken?: () => string | Promise<string>;
  /** Whole-call deadline, including queueing, token acquisition, body read and validation. Default 10,000. */
  timeoutMs?: number;
  /** Maximum decoded response bytes. Default 10 MiB. */
  maxResponseBytes?: number;
  /** Active operations per client, 1–64. Default 4; queue capacity is 1,024. */
  maxConcurrency?: number;
  /** Advanced injection. Metro defaults to the built-in native module; portable ESM requires trusted injection. */
  fetch?: FetchTransport;
}
export interface SearchClient {
  web: {
    search(request: SearchRequest, options?: SearchOptions): Promise<SearchResponse>;
    /** Up to 1,000 inputs. Invalid items become individual rejected outcomes. */
    searchBatch(requests: readonly SearchRequest[], options?: SearchBatchOptions): Promise<readonly SearchBatchResult[]>;
  };
}
