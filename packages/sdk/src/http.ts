import { SearchError } from "./errors.js";
import { createScope } from "./reliability.js";
import type { AdapterOptions, FetchTransport, SearchErrorCode, SearchResult, SearchUsage } from "./types.js";
import { exactFields, optionalNumber, optionalString, optionalStrings, record, resultUrl } from "./validation.js";

export function adapterOptions(options: AdapterOptions): { apiKey: string; fetch: FetchTransport } {
  if (!options || typeof options !== "object" || Array.isArray(options)) throw new SearchError("configuration");
  exactFields(options, ["apiKey", "fetch"], "configuration");
  if (typeof options.apiKey !== "string" || !/^[\x21-\x7e]+$/.test(options.apiKey) ||
      options.fetch !== undefined && typeof options.fetch !== "function") throw new SearchError("configuration");
  const transport = options.fetch ?? globalThis.fetch;
  if (typeof transport !== "function") throw new SearchError("configuration");
  return { apiKey: options.apiKey, fetch: transport };
}

export function retryAfter(value: string | null): number | undefined {
  if (!value) return undefined;
  if (/^\d+(?:\.\d+)?$/.test(value.trim())) {
    const ms = Number(value) * 1000;
    return Number.isFinite(ms) ? ms : undefined;
  }
  const date = Date.parse(value);
  return Number.isFinite(date) ? Math.max(0, date - Date.now()) : undefined;
}
/** Fixed 10 MiB decoded JSON cap and 10s direct-call ceiling; caller signal can shorten it. */
export async function jsonRequest(transport: FetchTransport, url: string | URL, init: RequestInit): Promise<Record<string, unknown>> {
  const scope = createScope(10_000, init.signal ?? undefined);
  const maximum = 10 * 1024 * 1024;
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  const cancel = () => { try { void reader?.cancel().catch(() => {}); } catch { /* Best effort. */ } };
  scope.signal.addEventListener("abort", cancel, { once: true });
  try {
    let response: Response;
    try {
      response = await scope.race(Promise.resolve().then(() => {
        scope.check(); return transport(url, { ...init, signal: scope.signal, redirect: "error", credentials: "omit" });
      }).then(result => {
        try { scope.check(); } catch (cause) {
          try { void result.body?.cancel().catch(() => {}); } catch { /* Best effort. */ }
          throw cause;
        }
        return result;
      }));
    } catch { scope.check(); throw new SearchError("network"); }
    if (!response.ok) {
      const status = response.status;
      const code: SearchErrorCode = status === 401 || status === 403 || status === 402 || status === 432 || status === 433 ? "auth" :
        status === 429 ? "rate_limit" : status >= 500 && status <= 599 || status === 408 ? "unavailable" : "provider_error";
      const retryAfterMs = retryAfter(response.headers.get("retry-after"));
      try { void response.body?.cancel().catch(() => {}); } catch { /* Best effort. */ }
      throw new SearchError(code, { status, ...(retryAfterMs !== undefined ? { retryAfterMs } : {}) });
    }
    // Compatibility for legacy injected Response-like test transports without a byte stream.
    // Their own allocation cannot be bounded; materialized JSON is capped before consumption.
    if (!("body" in response)) {
      let body: unknown;
      try { body = await scope.race((response as unknown as { json(): Promise<unknown> }).json()); }
      catch (cause) { scope.check(); throw new SearchError(cause instanceof SyntaxError ? "invalid_response" : "network"); }
      let serialized: string | undefined;
      try { serialized = JSON.stringify(body); } catch { throw new SearchError("invalid_response"); }
      if (serialized === undefined || new TextEncoder().encode(serialized).byteLength > maximum) throw new SearchError("invalid_response");
      scope.check(); return record(body);
    }
    reader = response.body?.getReader();
    const length = response.headers.get("content-length");
    if (!response.headers.has("content-encoding") && length && /^\d+$/.test(length) && Number(length) > maximum) throw new SearchError("invalid_response");
    const decoder = new TextDecoder();
    let received = 0;
    const chunks: string[] = [];
    let fragments: string[] = [];
    while (reader) {
      let next: ReadableStreamReadResult<Uint8Array>;
      try { next = await scope.race(reader.read()); }
      catch { scope.check(); throw new SearchError("network"); }
      if (next.done) break;
      if (!(next.value instanceof Uint8Array)) throw new SearchError("invalid_response");
      received += next.value.byteLength;
      if (received > maximum) throw new SearchError("invalid_response");
      const fragment = decoder.decode(next.value, { stream: true });
      if (fragment) fragments.push(fragment);
      if (fragments.length >= 1024) { chunks.push(fragments.join("")); fragments = []; }
    }
    chunks.push(fragments.join(""), decoder.decode());
    const text = chunks.join("");
    scope.check();
    let body: unknown;
    try { body = JSON.parse(text); } catch { throw new SearchError("invalid_response"); }
    scope.check();
    return record(body);
  } finally { cancel(); scope.signal.removeEventListener("abort", cancel); scope.close(); }
}

export function mappedResult(value: unknown, provider: string, retrievedAt: string,
  fields: { snippet?: string; highlights?: string; score?: string }, requestId?: string): SearchResult {
  const row = record(value);
  const url = resultUrl(row.url);
  const title = optionalString(row.title);
  const snippet = fields.snippet ? optionalString(row[fields.snippet]) : undefined;
  const highlights = fields.highlights ? optionalStrings(row[fields.highlights]) : undefined;
  const score = fields.score ? optionalNumber(row[fields.score]) : undefined;
  return { url, ...(title !== undefined ? { title } : {}), ...(snippet !== undefined ? { snippet } : {}),
    ...(highlights !== undefined ? { highlights } : {}), ...(score !== undefined ? { score } : {}),
    provenance: { provider, sourceUrl: url, retrievedAt, ...(requestId ? { requestId } : {}) } };
}
export function results(value: unknown): unknown[] {
  if (!Array.isArray(value)) throw new SearchError("invalid_response");
  return value;
}
export function usage(value: unknown, field: string, unit: SearchUsage["unit"]): SearchUsage | null {
  if (value === undefined || value === null) return null;
  const amount = optionalNumber(record(value)[field]);
  if (amount === undefined) return null;
  if (amount < 0) throw new SearchError("invalid_response");
  return { unit, value: amount };
}
