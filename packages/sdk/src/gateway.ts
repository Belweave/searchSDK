import { SearchError } from "./errors.js";
import { createScope, positiveInteger } from "./reliability.js";
import type { OperationScope } from "./reliability.js";
import type { SearchAttempt, SearchErrorCode, SearchOptions, SearchRequest, SearchResponse } from "./types.js";
import { exactFields, record, validateProviderResponse, validateRequest } from "./validation.js";

/** Application-owned authorization. Provider credentials remain in the server client. */
export interface GatewayAuthorization {
  readonly url: string;
  readonly method: string;
  readonly headers: Headers;
  readonly signal: AbortSignal;
}
export interface SearchGatewayConfig {
  search: { web: { search(request: SearchRequest, options?: SearchOptions): Promise<SearchResponse> } };
  /** Required: validate application credentials and enforce your per-user access policy. */
  authorize(request: GatewayAuthorization): boolean | Promise<boolean>;
  /** Whole HTTP operation, including authorization and body reading. Default 10 seconds. */
  timeoutMs?: number;
  maxRequestBytes?: number;
  maxResponseBytes?: number;
  /** Maximum active handlers; overload is rejected immediately. Default 32. */
  maxConcurrency?: number;
  /** Explicit browser origins. An Origin header is rejected unless listed here. */
  allowedOrigins?: readonly string[];
}

const codes = new Set<SearchErrorCode>(["invalid_request", "unsupported_option", "configuration", "auth", "rate_limit",
  "network", "unavailable", "attempt_timeout", "timeout", "aborted", "invalid_response", "provider_error"]);
const identifier = /^[a-zA-Z0-9_-]{1,64}$/;
function validStatus(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 100 && value <= 599;
}
function duration(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}
function wireTimestamp(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime()) || date.getUTCFullYear() < 1 || date.getUTCFullYear() > 9999) {
    throw new SearchError("invalid_response");
  }
  return date.toISOString();
}
function attempts(value: unknown): SearchAttempt[] {
  if (!Array.isArray(value) || value.length > 1024) throw new SearchError("invalid_response");
  return value.map(item => {
    const row = record(item);
    if (typeof row.provider !== "string" || !identifier.test(row.provider) || typeof row.startedAt !== "string" ||
        !Number.isFinite(Date.parse(row.startedAt)) || !duration(row.durationMs) ||
        row.outcome !== "success" && row.outcome !== "error" ||
        row.code !== undefined && !codes.has(row.code as SearchErrorCode) ||
        row.status !== undefined && !validStatus(row.status) ||
        row.retryAfterMs !== undefined && !duration(row.retryAfterMs)) throw new SearchError("invalid_response");
    return { provider: row.provider, startedAt: wireTimestamp(row.startedAt), durationMs: row.durationMs, outcome: row.outcome,
      ...(row.code !== undefined ? { code: row.code as SearchErrorCode } : {}),
      ...(row.status !== undefined ? { status: row.status as number } : {}),
      ...(row.retryAfterMs !== undefined ? { retryAfterMs: row.retryAfterMs as number } : {}) };
  });
}
function normalized(value: unknown): SearchResponse {
  const row = record(value);
  if (typeof row.provider !== "string" || !identifier.test(row.provider) ||
      row.reuse !== undefined && row.reuse !== "cache" && row.reuse !== "inflight") throw new SearchError("invalid_response");
  const response = validateProviderResponse(row);
  response.results = response.results.map(result => ({ ...result,
    provenance: { ...result.provenance, retrievedAt: wireTimestamp(result.provenance.retrievedAt) } }));
  return { ...response, provider: row.provider, attempts: attempts(row.attempts),
    ...(row.reuse !== undefined ? { reuse: row.reuse } : {}) };
}
function errorBody(cause: unknown): { error: { code: SearchErrorCode; attempts: SearchAttempt[]; status?: number; retryAfterMs?: number } } {
  if (!(cause instanceof SearchError) || !codes.has(cause.code)) return { error: { code: "unavailable", attempts: [] } };
  let safeAttempts: SearchAttempt[] = [];
  try { safeAttempts = attempts(cause.attempts); } catch { /* Never expose malformed custom metadata. */ }
  return { error: { code: cause.code, attempts: safeAttempts,
    ...(validStatus(cause.status) ? { status: cause.status } : {}),
    ...(duration(cause.retryAfterMs) ? { retryAfterMs: cause.retryAfterMs } : {}) } };
}
function statusFor(code: SearchErrorCode): number {
  if (code === "invalid_request" || code === "unsupported_option") return 400;
  if (code === "auth") return 401;
  if (code === "rate_limit") return 429;
  if (code === "timeout" || code === "attempt_timeout") return 504;
  if (code === "aborted") return 499;
  if (code === "configuration" || code === "unavailable") return 503;
  return 502;
}
function discard(request: Request): void {
  try { void request.body?.cancel().catch(() => {}); } catch { /* Do not await untrusted cleanup. */ }
}
async function readRequest(request: Request, scope: OperationScope, maximum: number): Promise<SearchRequest> {
  const length = request.headers.get("content-length");
  if (length !== null && (!/^\d+$/.test(length) || Number(length) > maximum)) throw new SearchError("invalid_request");
  const reader = request.body?.getReader();
  if (!reader) throw new SearchError("invalid_request");
  const cancel = () => { try { void reader.cancel().catch(() => {}); } catch { /* Best effort. */ } };
  scope.signal.addEventListener("abort", cancel, { once: true });
  try {
    const decoder = new TextDecoder("utf-8", { fatal: true });
    const parts: string[] = [];
    let received = 0;
    for (;;) {
      const next = await scope.race(reader.read());
      if (next.done) break;
      if (!(next.value instanceof Uint8Array)) throw new SearchError("invalid_request");
      received += next.value.byteLength;
      if (received > maximum) throw new SearchError("invalid_request");
      parts.push(decoder.decode(next.value, { stream: true }));
    }
    parts.push(decoder.decode());
    scope.check();
    const result = validateRequest(JSON.parse(parts.join("")) as SearchRequest);
    scope.check();
    return result;
  } catch (cause) {
    scope.check();
    throw cause instanceof SearchError ? cause : new SearchError("invalid_request");
  } finally { scope.signal.removeEventListener("abort", cancel); cancel(); }
}

/** Fetch-compatible, framework-independent server handler for gateway protocol v1.
 * Mount it at an exact application route. It never accepts provider selection,
 * credentials, arbitrary upstream URLs, or native operations from the request.
 */
export function createSearchGateway(config: SearchGatewayConfig): (request: Request) => Promise<Response> {
  if (!config || typeof config !== "object" || Array.isArray(config)) throw new SearchError("configuration");
  exactFields(config, ["search", "authorize", "timeoutMs", "maxRequestBytes", "maxResponseBytes", "maxConcurrency", "allowedOrigins"], "configuration");
  if (typeof config.search?.web?.search !== "function" || typeof config.authorize !== "function") throw new SearchError("configuration");
  const search = config.search.web.search.bind(config.search.web);
  const authorize = config.authorize;
  const timeoutMs = positiveInteger(config.timeoutMs, 10_000);
  const maxRequestBytes = positiveInteger(config.maxRequestBytes, 64 * 1024, 10 * 1024 * 1024);
  const maxResponseBytes = positiveInteger(config.maxResponseBytes, 10 * 1024 * 1024, 100 * 1024 * 1024);
  // Error envelopes must fit even when the application chooses a small body cap.
  if (maxResponseBytes < 128) throw new SearchError("configuration");
  const maxConcurrency = positiveInteger(config.maxConcurrency, 32, 1024);
  if (config.allowedOrigins !== undefined && !Array.isArray(config.allowedOrigins)) throw new SearchError("configuration");
  const origins = new Set(config.allowedOrigins ?? []);
  for (const origin of origins) {
    try {
      const parsed = new URL(origin);
      if (parsed.protocol !== "https:" || parsed.origin !== origin || parsed.username || parsed.password) throw new Error();
    } catch { throw new SearchError("configuration"); }
  }
  let active = 0;
  return async function handle(request: Request): Promise<Response> {
    if (!(request instanceof Request)) throw new SearchError("invalid_request");
    const origin = request.headers.get("origin");
    const originAllowed = origin !== null && origins.has(origin);
    function send(body: unknown, status: number, extra?: Record<string, string>): Response {
      let text = JSON.stringify(body);
      if (new TextEncoder().encode(text).byteLength > maxResponseBytes) {
        status = 502;
        text = '{"error":{"code":"invalid_response","attempts":[]}}';
      }
      return new Response(text, { status, headers: { "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store", "x-content-type-options": "nosniff", "x-searchsdk-protocol": "1",
        "vary": "Origin", ...(originAllowed ? { "access-control-allow-origin": origin!,
          "access-control-expose-headers": "X-SearchSDK-Protocol" } : {}), ...extra } });
    }
    function reject(code: SearchErrorCode, status: number, extra?: Record<string, string>): Response {
      discard(request);
      return send({ error: { code, attempts: [] } }, status, extra);
    }
    if (origin !== null && !originAllowed) return reject("auth", 403);
    if (request.method === "OPTIONS" && originAllowed) {
      const requested = request.headers.get("access-control-request-headers")?.split(",").map(s => s.trim().toLowerCase()) ?? [];
      if (request.headers.get("access-control-request-method") !== "POST" ||
          requested.some(name => !["authorization", "content-type"].includes(name))) return reject("invalid_request", 400);
      discard(request);
      const headers = send({}, 200, { "access-control-allow-methods": "POST", "access-control-allow-headers": "Authorization, Content-Type" }).headers;
      return new Response(null, { status: 204, headers });
    }
    if (request.method !== "POST") return reject("invalid_request", 405, { allow: "POST" });
    if (!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(request.headers.get("content-type") ?? "") ||
        request.headers.has("content-encoding") && request.headers.get("content-encoding") !== "identity") return reject("invalid_request", 415);
    if (active >= maxConcurrency) return reject("rate_limit", 429);
    active++;
    const scope = createScope(timeoutMs, request.signal);
    try {
      const permitted = await scope.race(Promise.resolve().then(() => {
        scope.check();
        return authorize({ url: request.url, method: request.method, headers: new Headers(request.headers), signal: scope.signal });
      }));
      if (permitted !== true) return reject("auth", 401);
      const input = await readRequest(request, scope, maxRequestBytes);
      const value = await scope.race(Promise.resolve().then(() => { scope.check(); return search(input, { signal: scope.signal }); }));
      const output = normalized(value);
      output.results = output.results.slice(0, input.limit ?? 5);
      scope.check();
      const response = send(output, 200);
      scope.check();
      return response;
    } catch (cause) {
      try { scope.check(); } catch (stopped) { cause = stopped; }
      const body = errorBody(cause);
      return send(body, statusFor(body.error.code));
    } finally { scope.close(); active--; discard(request); }
  };
}
