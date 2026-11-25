import type { ContentsProviderOptions, ProviderId, SearchProviderOptions } from "./generated/registry.ts";

export type { ContentsProviderOptions, ProviderId, SearchProviderOptions };

export type ErrorCode =
  | "invalid_request" | "configuration" | "unsupported" | "auth" | "forbidden" | "quota"
  | "rate_limit" | "unavailable" | "provider_error" | "network" | "attempt_timeout"
  | "timeout" | "aborted" | "invalid_response" | "spec_mismatch" | "response_too_large";

export type Recency = "day" | "week" | "month" | "year";
export type Depth = "fast" | "standard" | "deep";

/** Time source. Tests inject a virtual clock; the default uses Date.now and setTimeout. */
export interface Clock {
  now(): number;
  setTimeout(callback: () => void, ms: number): unknown;
  clearTimeout(handle: unknown): void;
}

/**
 * Client settings. `Id` is the set of provider ids the client accepts: the
 * built-in ids by default, or the keys of a caller-supplied `registry`, which
 * TypeScript infers from it so custom ids need no casts.
 */
export interface ClientConfig<Id extends string = ProviderId> {
  /** Provider used when a call names none. */
  provider?: NoInfer<Id>;
  /** Providers tried, in order, after a fallback-eligible failure. */
  fallback?: readonly NoInfer<Id>[];
  /** API keys by provider. Missing keys are read from each provider's documented environment variables. */
  keys?: Partial<Record<NoInfer<Id>, string>>;
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
  /**
   * Opt-in hook called once per sent attempt with its redacted request, raw
   * status, headers and bounded body, and how the spec's paths resolved
   * (registry/policy.md, Diagnostics). Keys never appear. Errors it throws are ignored.
   */
  diagnostics?: (event: AttemptDiagnostics<NoInfer<Id>>) => void;
  /**
   * Provider specs to use instead of the built-in registry, keyed by id. They
   * are validated against the schema and copied, so later edits have no effect.
   */
  registry?: Readonly<Record<Id, unknown>>;
}

/** Typed provider options for built-in ids; plain option objects keyed by id for a custom registry. */
type OptionsFor<Id extends string, Typed> = [Id] extends [ProviderId] ? Typed : Partial<Record<Id, Readonly<Record<string, unknown>>>>;

interface CallOptions<Id extends string> {
  provider?: Id;
  fallback?: readonly Id[];
  timeoutMs?: number;
  attemptTimeoutMs?: number;
  maxRetries?: number;
  maxResponseBytes?: number;
  signal?: AbortSignal;
}

export interface SearchOptions<Id extends string = ProviderId> extends CallOptions<Id> {
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
  providerOptions?: OptionsFor<Id, SearchProviderOptions>;
}

export interface ContentsOptions<Id extends string = ProviderId> extends CallOptions<Id> {
  providerOptions?: OptionsFor<Id, ContentsProviderOptions>;
}

/** Where a cost came from. "none" means nothing is expected to be billed. */
export type CostSource = "reported" | "reported-credits" | "computed" | "unknown" | "none";

export interface Cost {
  /** USD, or null when the price is not known. */
  usd: number | null;
  /** False only for a provider-reported exact figure, or nothing sent. */
  estimated: boolean;
  source: CostSource;
  credits?: number;
}

/**
 * Whether an attempt was billed: "yes" when the provider answered with a 2xx,
 * "possible" when the request may have reached it without an answer, "no" when
 * nothing was sent or the provider answered with an error status.
 */
export type Billed = "yes" | "possible" | "no";

export interface Warning<Id extends string = ProviderId> {
  code: string;
  provider: Id;
  message?: string;
  count?: number;
}

export interface Attempt<Id extends string = ProviderId> {
  provider: Id;
  outcome: "ok" | "error" | "skipped";
  code?: ErrorCode;
  status?: number;
  /** Milliseconds from the start of the call. */
  startMs: number;
  durationMs: number;
  retryAfterMs?: number;
  billed: Billed;
  /** This attempt's own cost; for billed "possible", what it costs if it was billed. */
  cost: Cost;
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

interface ResponseBase<Id extends string> {
  provider: Id;
  cost: Cost;
  requestId: string | null;
  latencyMs: number;
  warnings: Warning<Id>[];
  attempts: Attempt<Id>[];
  /** The provider's parsed JSON body. */
  raw: unknown;
}

/** How one spec path resolved: `found` and `missing` count the items it was read from. */
export interface PathReport {
  /** What the path is for: `results`, `title`, `providerFields.id`, `pages.0.content`, `cost`, `requestId` and so on. */
  role: string;
  path: string;
  found: number;
  missing: number;
}

/** One sent attempt, for smoke checks and debugging specs (registry/policy.md, Diagnostics). */
export interface AttemptDiagnostics<Id extends string = ProviderId> {
  /** The attempt's position in `attempts`. */
  index: number;
  kind: "search" | "contents";
  attempt: Attempt<Id>;
  /** The request as sent, with the key replaced by "[redacted]". */
  request: { method: "GET" | "POST"; url: string; headers: Record<string, string>; body: string | null };
  /** Null when no status arrived. */
  response: {
    status: number;
    headers: Record<string, string>;
    /** UTF-8 text, key redacted, at most policy.diagnostics.maxBodyBytes bytes; null when the body was not read whole. */
    body: string | null;
    bodyBytes: number | null;
    bodyTruncated: boolean;
  } | null;
  /** For a 2xx JSON object: which spec paths resolved; otherwise empty. */
  paths: PathReport[];
}

export interface SearchResponse<Id extends string = ProviderId> extends ResponseBase<Id> { results: SearchResult[] }
export interface ContentsResponse<Id extends string = ProviderId> extends ResponseBase<Id> { pages: Page[] }

export interface Client<Id extends string = ProviderId> {
  search(query: string, options?: SearchOptions<Id>): Promise<SearchResponse<Id>>;
  contents(urls: string | readonly string[], options?: ContentsOptions<Id>): Promise<ContentsResponse<Id>>;
}

/**
 * The most one request can cost under the registry's documented prices
 * (registry/steps.md, Cost bound). `usd` is null when it cannot be bounded.
 */
export interface CostBound {
  usd: number | null;
  /** Why usd is null: a cost option makes the price unknown, the billed count is unbounded, or the price is not public. */
  unknownBecause?: "option" | "count" | "price";
  /** True when the bound holds only while paid use past the provider's free allowance stays off on the account. */
  requiresOverageOff?: true;
}

// ---- Registry shapes (mirror registry/schema/provider.schema.json) ----

export type Path = string;
export interface StepRef { step: string; separator?: string; table?: Record<string, string | number | boolean>; edge?: "start" | "end"; prefix?: string; format?: string }
export type Field = Path | { path: Path; steps?: StepRef[] };
export interface ParamSpec { to: Path; steps?: StepRef[]; append?: boolean }
export type ComposePart = { text: string } | { input: string; text?: string; steps?: StepRef[]; required?: boolean };
export interface ComposeSpec { to: Path; parts: ComposePart[] }
export interface RequestSpec {
  method: "GET" | "POST";
  url: string;
  encoding: "json" | "query";
  fixed?: Record<string, unknown>;
  locked?: Path[];
  params: Record<string, ParamSpec>;
  compose?: ComposeSpec[];
}
export type Predicate = { path: Path; not?: boolean } & ({ equals: unknown } | { in: unknown[] } | { range: [number, number] } | { present: boolean });
export type RequestIdRule = { path: Path } | { header: string };
export type WarningRule = { where: Predicate[]; code: string; messageField?: Path } | { listPath: Path; code: string; messageField?: Path };
export type Tier = "fast" | "standard" | "deep";
export type PerRequestUsd = number | null | { fast?: number | null; standard: number | null; deep?: number | null };
export type UsageUnit = "requests" | "urls" | "results" | "query-units";
export interface Allowance {
  limit: number; unit: UsageUnit; per: "day" | "month"; resetsAtUtc?: string; source: string;
  beyond: { billing: "automatic" | "opt-in"; perRequestUsd?: number | null; refusal?: string };
  note?: string;
}
export interface Pricing {
  plan: string; source: string; retrievedOn: string;
  creditUsd?: number;
  perRequestUsd: PerRequestUsd;
  includedItems?: number;
  extraBlock?: { items: number; usd: number };
  ceiling?: { perRequestUsd?: PerRequestUsd; extraBlockUsd?: number; note: string };
  allowance?: Allowance;
  costOptions?: Record<string, "unknown" | Record<string, Tier | null>>;
  note?: string;
}
export interface RateLimit {
  plan: string; limit: number; unit: UsageUnit;
  per: "second" | "minute" | "hour" | "day" | "month" | "concurrent";
  scope?: string; source?: string; note?: string;
}
export type Verification = { status: "unverified" } | { status: "verified"; on: string; runtimes: ("typescript" | "python")[]; note?: string };
export type ExcerptKind = "description" | "content-chunk" | "highlights" | "none";
export interface CostSpec { reported?: { path: Path; unit: "usd" | "credit"; isEstimate?: boolean } }
export interface EndpointBase {
  verification: Verification;
  request: RequestSpec;
  cost?: CostSpec;
  pricing: Pricing;
  rateLimits: RateLimit[];
  providerOptions: Record<string, JsonSchema>;
}
export interface SearchEndpoint extends EndpointBase {
  limits: {
    maxResults: number; maxQueryLength: number | null; maxIncludeDomains: number; maxExcludeDomains: number;
    maxTotalDomains?: number; includeExcludeExclusive?: boolean;
  };
  dateBasis: string;
  response: {
    results: Path;
    excerptKind: ExcerptKind;
    resultsOptional?: boolean;
    fields: { url: Field; title?: Field; excerpts?: Field; publishedAt?: Field; author?: Field };
    providerFields?: Record<string, Field>;
    requestId?: RequestIdRule[];
    warnings?: WarningRule[];
  };
}
export interface PageSource {
  from: Path;
  optional?: boolean;
  where?: Predicate[];
  status: "ok" | "failed";
  billable?: boolean;
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
  auth: { in: "header" | "query"; name: string; prefix?: string; env: string[]; keyInUrlReason?: string };
  errorCodePath?: Path;
  errors: ErrorRule[];
  search?: SearchEndpoint;
  contents?: ContentsEndpoint;
  [key: string]: unknown;
}
export type JsonSchema = { [key: string]: unknown };
