import type { SearchAttempt, SearchErrorCode } from "./types.js";

const messages: Record<SearchErrorCode, string> = {
  invalid_request: "Invalid search request.",
  unsupported_option: "The requested option is unsupported.",
  configuration: "Invalid search client configuration.",
  auth: "Gateway authentication or account authorization failed.",
  rate_limit: "Search rate limit reached.",
  network: "Search transport failed.",
  unavailable: "Search is temporarily unavailable.",
  attempt_timeout: "Search attempt exceeded its time budget.",
  timeout: "Search exceeded its total time budget.",
  aborted: "Search was cancelled.",
  invalid_response: "Gateway returned an invalid search response.",
  provider_error: "Gateway rejected the search request.",
};

/** SDK failures contain only public, validated metadata. No raw cause or body is attached. */
export class SearchError extends Error {
  readonly code: SearchErrorCode;
  readonly attempts: readonly SearchAttempt[];
  readonly status: number | undefined;
  readonly retryAfterMs: number | undefined;

  constructor(code: SearchErrorCode, details: {
    attempts?: readonly SearchAttempt[];
    status?: number;
    retryAfterMs?: number;
  } = {}) {
    super(messages[code]);
    this.name = "SearchError";
    this.code = code;
    this.attempts = Object.freeze((details.attempts ?? []).map(a => Object.freeze({ ...a })));
    this.status = details.status;
    this.retryAfterMs = details.retryAfterMs;
  }
}
