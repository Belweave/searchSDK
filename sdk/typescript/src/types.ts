import type { ContentsProviderOptions, ProviderId, SearchProviderOptions } from "./generated/registry.ts";

export type { ContentsProviderOptions, ProviderId, SearchProviderOptions };

export type ErrorCode =
  | "invalid_request" | "configuration" | "unsupported" | "auth" | "forbidden" | "quota"
  | "rate_limit" | "unavailable" | "provider_error" | "network" | "attempt_timeout"
  | "timeout" | "aborted" | "invalid_response" | "response_too_large";

export type Recency = "day" | "week" | "month" | "year";
export type Depth = "fast" | "standard" | "deep";

/** Time source. Tests inject a virtual clock; the default uses Date.now and setTimeout. */
export interface Clock {
  now(): number;
  setTimeout(callback: () => void, ms: number): unknown;
  clearTimeout(handle: unknown): void;
}

export interface ClientConfig {
  /** Provider used when a call names none. */
  provider?: ProviderId;
  /** Providers tried, in order, after a fallback-eligible failure. */
  fallback?: readonly ProviderId[];
  /** API keys by provider. Missing keys are read from each provider's documented environment variables. */
  keys?: Partial<Record<ProviderId, string>>;
  /** Environment to read keys from instead of process.env (for example Worker bindings). */
  env?: Readonly<Record<string, string | undefined>>;
  timeoutMs?: number;
  attemptTimeoutMs?: number;
  maxRetries?: number;
  maxResponseBytes?: number;
  fetch?: typeof globalThis.fetch;
  clock?: Clock;
  /** Uniform random source in [0, 1) for retry jitter. */
  random?: () => number;
}

interface CallOptions {
  provider?: ProviderId;
  fallback?: readonly ProviderId[];
  timeoutMs?: number;
  attemptTimeoutMs?: number;
  maxRetries?: number;
  maxResponseBytes?: number;
  signal?: AbortSignal;
}

export interface SearchOptions extends CallOptions {
  maxResults?: number;
  includeDomains?: readonly string[];
  excludeDomains?: readonly string[];
  recency?: Recency;
  /** Inclusive YYYY-MM-DD, by publication date. */
  startDate?: string;
  /** Inclusive YYYY-MM-DD, by publication date. */
  endDate?: string;
  /** ISO 3166-1 alpha-2. */
  country?: string;
  /** ISO 639-1. */
  language?: string;
  depth?: Depth;
  providerOptions?: SearchProviderOptions;
}

export interface ContentsOptions extends CallOptions {
  providerOptions?: ContentsProviderOptions;
}

export interface Cost {
  usd: number | null;
  estimated: boolean;
  source: "reported" | "reported-credits" | "computed" | "unknown";
  credits?: number;
}

export interface Warning {
  code: string;
  provider: ProviderId;
  message?: string;
  count?: number;
}

export interface Attempt {
  provider: ProviderId;
  outcome: "ok" | "error" | "skipped";
  code?: ErrorCode;
  status?: number;
  /** Milliseconds from the start of the call. */
  startMs: number;
  durationMs: number;
  retryAfterMs?: number;
}

export interface SearchResult {
  url: string;
  title: string | null;
  excerpts: string[];
  publishedAt: string | null;
  author: string | null;
  rank: number;
  /** Provider-scoped values such as scores. Not comparable across providers. */
  providerFields: Record<string, unknown>;
}

export interface Page {
  url: string;
  status: "ok" | "failed";
  finalUrl: string | null;
  title: string | null;
  content: string | null;
  publishedAt: string | null;
  author: string | null;
  error: { code: string | null; message: string | null } | null;
}

interface ResponseBase {
  provider: ProviderId;
  cost: Cost;
  requestId: string | null;
  latencyMs: number;
  warnings: Warning[];
  attempts: Attempt[];
  /** The provider's parsed JSON body. */
  raw: unknown;
}

export interface SearchResponse extends ResponseBase { results: SearchResult[] }
export interface ContentsResponse extends ResponseBase { pages: Page[] }

export interface Client {
  search(query: string, options?: SearchOptions): Promise<SearchResponse>;
  contents(urls: string | readonly string[], options?: ContentsOptions): Promise<ContentsResponse>;
}

// ---- Registry shapes (mirror registry/schema/provider.schema.json) ----

export type Path = string;
export interface StepRef { step: string; separator?: string; table?: Record<string, string | number | boolean>; edge?: "start" | "end" }
export type Field = Path | { path: Path; steps?: StepRef[] };
export interface ParamSpec { to: Path; steps?: StepRef[] }
export interface RequestSpec {
  method: "GET" | "POST";
  url: string;
  encoding: "json" | "query";
  fixed?: Record<string, unknown>;
  params: Record<string, ParamSpec>;
}
export type RequestIdRule = { path: Path } | { header: string };
export type WarningRule = { ifPath: Path; equals: unknown; code: string } | { listPath: Path; code: string; messageField?: Path };
export interface Pricing {
  plan: string; source: string; retrievedOn: string;
  creditUsd?: number;
  perRequestUsd: number | { fast?: number; standard: number; deep?: number };
  includedItems?: number;
  extraBlock?: { items: number; usd: number };
  note?: string;
}
export interface CostSpec { reported?: { path: Path; unit: "usd" | "credit"; isEstimate?: boolean } }
export interface EndpointBase {
  request: RequestSpec;
  cost?: CostSpec;
  pricing: Pricing;
  rateLimits: unknown[];
  providerOptions: Record<string, JsonSchema>;
}
export interface SearchEndpoint extends EndpointBase {
  limits: { maxResults: number; maxQueryLength: number | null; maxIncludeDomains: number; maxExcludeDomains: number };
  dateBasis: string;
  response: {
    results: Path;
    fields: { url: Field; title?: Field; excerpts?: Field; publishedAt?: Field; author?: Field };
    providerFields?: Record<string, Field>;
    requestId?: RequestIdRule[];
    warnings?: WarningRule[];
  };
}
export interface PageSource {
  from: Path;
  where?: { path: Path; equals: unknown };
  status: "ok" | "failed";
  fields: Partial<Record<"url" | "finalUrl" | "title" | "content" | "publishedAt" | "author" | "errorCode" | "errorMessage", Field>> & { url: Field };
}
export interface ContentsEndpoint extends EndpointBase {
  limits: { maxUrls: number };
  contentFormat: string;
  response: { pages: PageSource[]; requestId?: RequestIdRule[]; warnings?: WarningRule[] };
}
export interface ErrorRule { status: number; bodyPath?: Path; equals?: unknown; code: string }
export interface ProviderSpec {
  id: string;
  name: string;
  auth: { in: "header" | "query"; name: string; prefix?: string; env: string[] };
  errorCodePath?: Path;
  errors: ErrorRule[];
  search?: SearchEndpoint;
  contents?: ContentsEndpoint;
  [key: string]: unknown;
}
export type JsonSchema = { [key: string]: unknown };
