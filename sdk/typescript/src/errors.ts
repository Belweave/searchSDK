import { policy } from "./generated/registry.ts";
import type { Attempt, ErrorCode, ProviderId } from "./types.ts";

export interface SearchErrorDetails {
  provider?: ProviderId;
  status?: number;
  /** Machine-readable code sent by the provider, if any. */
  providerCode?: string;
  retryAfterMs?: number;
  /** The request field that failed validation. */
  field?: string;
  attempts?: Attempt[];
  /** Parsed body of a successful response that could not be mapped. */
  raw?: unknown;
}

/** The only error the SDK throws. Messages are fixed per code and never include keys or bodies. */
export class SearchError extends Error {
  readonly code: ErrorCode;
  readonly provider?: ProviderId;
  readonly status?: number;
  readonly providerCode?: string;
  readonly retryAfterMs?: number;
  readonly field?: string;
  attempts: Attempt[];
  readonly raw?: unknown;

  constructor(code: ErrorCode, details: SearchErrorDetails = {}) {
    super(policy.errors[code]);
    this.name = "SearchError";
    this.code = code;
    if (details.provider !== undefined) this.provider = details.provider;
    if (details.status !== undefined) this.status = details.status;
    if (details.providerCode !== undefined) this.providerCode = details.providerCode;
    if (details.retryAfterMs !== undefined) this.retryAfterMs = details.retryAfterMs;
    if (details.field !== undefined) this.field = details.field;
    if (details.raw !== undefined) this.raw = details.raw;
    this.attempts = details.attempts ?? [];
  }
}
