import { SearchError } from "./errors.js";
import type { SearchAttempt, SearchErrorCode, SearchResponse, SearchResult, SearchUsage, SearchWarning, ValidatedSearchRequest } from "./types.js";

export const errorCodes: readonly SearchErrorCode[] = ["invalid_request", "unsupported_option", "configuration", "auth", "rate_limit", "network", "unavailable", "attempt_timeout", "timeout", "aborted", "invalid_response", "provider_error"];
type InputCode = "invalid_request" | "configuration";
export function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new SearchError("invalid_response");
  return value as Record<string, unknown>;
}
/** Snapshot input data before any await; reject accessors, symbols and unsupported fields. */
export function inputFields(value: unknown, allowed: readonly string[], code: InputCode): Record<string, unknown> {
  try {
    if (!value || typeof value !== "object" || Array.isArray(value) ||
      ![Object.prototype, null].includes(Object.getPrototypeOf(value))) throw new Error();
    const result: Record<string, unknown> = Object.create(null);
    for (const key of Reflect.ownKeys(value)) {
      if (typeof key !== "string" || !allowed.includes(key)) throw new Error();
      const descriptor = Object.getOwnPropertyDescriptor(value, key)!;
      if (!("value" in descriptor)) throw new Error();
      result[key] = descriptor.value;
    }
    return result;
  } catch { throw new SearchError(code); }
}
export function positiveInteger(value: unknown, fallback: number, maximum = 2_147_483_647, code: InputCode = "configuration"): number {
  const result = value === undefined ? fallback : value;
  if (typeof result !== "number" || !Number.isInteger(result) || result < 1 || result > maximum) throw new SearchError(code);
  return result;
}
export function validateSignal(value: unknown): AbortSignal | undefined {
  if (value === undefined) return undefined;
  try {
    // Structural to accept platform-native/cross-realm AbortSignals without relying
    // on a globally constructible AbortSignal class in React Native.
    const signal = value as AbortSignal;
    if (!signal || typeof signal.aborted !== "boolean" || typeof signal.addEventListener !== "function" ||
      typeof signal.removeEventListener !== "function") throw new Error();
    return signal;
  } catch { throw new SearchError("invalid_request"); }
}
function domains(value: unknown): readonly string[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.length === 0) throw new Error();
  const result = Array.from(value, domain => {
    if (typeof domain !== "string" || domain.length > 253 || domain.split(".").length < 2 ||
      !domain.split(".").every(label => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(label))) throw new Error();
    return domain.toLowerCase();
  });
  return Object.freeze([...new Set(result)]);
}
export function validateRequest(value: unknown): ValidatedSearchRequest {
  try {
    const input = inputFields(value, ["query", "limit", "includeDomains", "excludeDomains"], "invalid_request");
    if (typeof input.query !== "string" || !input.query.trim()) throw new Error();
    const limit = positiveInteger(input.limit, 5, 20, "invalid_request");
    const includeDomains = domains(input.includeDomains), excludeDomains = domains(input.excludeDomains);
    if (includeDomains?.some(d => excludeDomains?.includes(d))) throw new Error();
    return Object.freeze({ query: input.query, limit,
      ...(includeDomains ? { includeDomains } : {}), ...(excludeDomains ? { excludeDomains } : {}) });
  } catch { throw new SearchError("invalid_request"); }
}
export function endpointUrl(value: unknown): string {
  try {
    if (typeof value !== "string" || !/^https:\/\/[^/\\]/i.test(value) || /[\s\u0000-\u0020\u007f-\u009f\\?#]/u.test(value)) throw new Error();
    const url = new URL(value);
    if (url.protocol !== "https:" || !url.hostname || url.username || url.password || /@/.test(value.slice(8).split("/")[0]!)) throw new Error();
    return value;
  } catch { throw new SearchError("configuration"); }
}
function resultUrl(value: unknown): string {
  if (typeof value !== "string" || !/^https?:\/\/[^/\\]/i.test(value) || /[\s\u0000-\u0020\u007f-\u009f\\]/u.test(value)) throw new Error();
  const url = new URL(value);
  if (!["http:", "https:"].includes(url.protocol) || !url.hostname || url.username || url.password || /@/.test(value.split("/")[2]!)) throw new Error();
  return value;
}
function providerId(value: unknown): string {
  if (typeof value !== "string" || !/^[a-zA-Z0-9_-]{1,64}$/.test(value)) throw new Error();
  return value;
}
function timestamp(value: unknown): string {
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) throw new Error();
  return value;
}
function finite(value: unknown, nonnegative = false): number {
  if (typeof value !== "number" || !Number.isFinite(value) || nonnegative && value < 0) throw new Error();
  return value;
}
function optionalString(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string") throw new Error();
  return value;
}
function httpStatus(value: unknown): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 100 || value > 599) throw new Error();
  return value;
}
export function validateAttempts(value: unknown): SearchAttempt[] {
  if (!Array.isArray(value)) throw new Error();
  return Array.from(value, item => {
    const row = record(item);
    const provider = providerId(row.provider);
    // Canonicalize error metadata so untrusted date text cannot escape in errors.
    const startedAt = new Date(timestamp(row.startedAt)).toISOString();
    const durationMs = finite(row.durationMs, true);
    if (row.outcome !== "success" && row.outcome !== "error" ||
      row.code !== undefined && !errorCodes.includes(row.code as SearchErrorCode)) throw new Error();
    return { provider, startedAt, durationMs, outcome: row.outcome,
      ...(row.code === undefined ? {} : { code: row.code as SearchErrorCode }),
      ...(row.status === undefined ? {} : { status: httpStatus(row.status) }),
      ...(row.retryAfterMs === undefined ? {} : { retryAfterMs: finite(row.retryAfterMs, true) }) };
  });
}
export function validateResponse(value: unknown, limit: number): SearchResponse {
  try {
    const root = record(value), provider = providerId(root.provider);
    if (!Array.isArray(root.results) || !Array.isArray(root.warnings)) throw new Error();
    const results = Array.from(root.results, item => {
      const row = record(item), source = record(row.provenance);
      const url = resultUrl(row.url), title = optionalString(row.title), snippet = optionalString(row.snippet);
      let highlights: string[] | undefined;
      if (row.highlights !== undefined && row.highlights !== null) {
        if (!Array.isArray(row.highlights)) throw new Error();
        highlights = Array.from(row.highlights, h => { if (typeof h !== "string") throw new Error(); return h; });
      }
      const score = row.score === undefined || row.score === null ? undefined : finite(row.score);
      const requestId = optionalString(source.requestId);
      if (requestId !== undefined && !/^[a-zA-Z0-9_.:/-]{1,256}$/.test(requestId)) throw new Error();
      return { url, ...(title === undefined ? {} : { title }), ...(snippet === undefined ? {} : { snippet }),
        ...(highlights === undefined ? {} : { highlights }), ...(score === undefined ? {} : { score }),
        provenance: { provider: providerId(source.provider), sourceUrl: resultUrl(source.sourceUrl),
          retrievedAt: timestamp(source.retrievedAt), ...(requestId === undefined ? {} : { requestId }) } } satisfies SearchResult;
    });
    let usage: SearchUsage | null = null;
    if (root.usage !== null) {
      const row = record(root.usage);
      if (row.unit !== "usd" && row.unit !== "credits") throw new Error();
      usage = { unit: row.unit, value: finite(row.value, true) };
    }
    const warnings: SearchWarning[] = Array.from(root.warnings, item => {
      const row = record(item);
      if (row.code !== "fallback_used" && row.code !== "provider_warning") throw new Error();
      return { code: row.code, provider: providerId(row.provider) };
    });
    const attempts = validateAttempts(root.attempts);
    if (root.reuse !== undefined && root.reuse !== "cache" && root.reuse !== "inflight") throw new Error();
    return { provider, results: results.slice(0, limit), usage, warnings, attempts,
      ...(root.reuse === undefined ? {} : { reuse: root.reuse }) };
  } catch { throw new SearchError("invalid_response"); }
}
export function gatewayError(value: unknown, status: number, privateValues: readonly string[]): SearchError {
  const fallback: SearchErrorCode = [401, 402, 403, 432, 433].includes(status) ? "auth" : status === 429 ? "rate_limit" :
    status === 408 || status >= 500 ? "unavailable" : "provider_error";
  try {
    const row = record(record(value).error);
    if (!errorCodes.includes(row.code as SearchErrorCode)) throw new Error();
    const secrets = privateValues.flatMap(value => [value.toLowerCase(), value.trim().toLowerCase()]).filter(Boolean);
    const attempts = validateAttempts(row.attempts).filter(a =>
      !secrets.some(secret => a.provider.toLowerCase().includes(secret) || a.startedAt.toLowerCase().includes(secret)));
    const sanitizedStatus = row.status === undefined ? status : httpStatus(row.status);
    const retryAfterMs = row.retryAfterMs === undefined ? undefined : finite(row.retryAfterMs, true);
    return new SearchError(row.code as SearchErrorCode, { attempts, status: sanitizedStatus,
      ...(retryAfterMs === undefined ? {} : { retryAfterMs }) });
  } catch { return new SearchError(fallback, { status }); }
}
