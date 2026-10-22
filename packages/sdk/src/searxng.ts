import { SearchError } from "./errors.js";
import { jsonRequest, mappedResult, results } from "./http.js";
import { addonRequest, configuration } from "./search-addon.js";
import type { FetchTransport, ProviderResponse, SearchOptions, SearchProvider, SearchRequest } from "./types.js";
import type { RawSearchResponse } from "./search-addon.js";
export type { RawSearchResponse } from "./search-addon.js";

export interface SearxngOptions {
  /** Trusted operator-selected HTTPS instance, optionally with a base path. JSON must be enabled. */
  baseUrl: string;
  fetch?: FetchTransport;
  /** Optional reverse-proxy authentication headers. SearXNG has no standard search API key. */
  headers?: Readonly<Record<string, string>>;
  language?: string;
  safeSearch?: 0 | 1 | 2;
  timeRange?: "day" | "month" | "year";
  /** Instance-specific category names. General search is requested by default. */
  categories?: readonly string[];
}
export interface SearxngProvider extends SearchProvider {
  /** Retains engine attribution, dates, suggestions and unresponsive-engine details. */
  searchRaw(request: SearchRequest, options?: SearchOptions): Promise<RawSearchResponse>;
}

function endpoint(value: string): string {
  try {
    if (typeof value !== "string" || !/^https:\/\//i.test(value) || /[\s\\\u0000-\u001f\u007f]/.test(value)) throw new Error();
    const base = new URL(value);
    if (base.protocol !== "https:" || base.username || base.password || base.search || base.hash || /[?#]/.test(value)) throw new Error();
    return base.href.replace(/\/+$/, "") + "/search";
  } catch { throw new SearchError("configuration"); }
}

function headers(input: SearxngOptions["headers"]): Readonly<Record<string, string>> {
  const result = new Headers({ Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" });
  if (input !== undefined) {
    if (!input || typeof input !== "object" || Array.isArray(input) || Reflect.ownKeys(input).length > 32) throw new SearchError("configuration");
    try {
      for (const key of Reflect.ownKeys(input)) {
        if (typeof key !== "string") throw new Error();
        const value = input[key];
        if (typeof value !== "string" || value.length > 8192 || /[\r\n\0]/.test(value) ||
          ["host", "cookie", "connection", "content-length", "transfer-encoding", "accept", "content-type"].includes(key.toLowerCase())) throw new Error();
        result.set(key, value);
      }
    } catch { throw new SearchError("configuration"); }
  }
  return Object.freeze(Object.fromEntries(result));
}

/** One JSON /search page from an explicitly selected SearXNG instance. No instance discovery. */
export function searxng(options: SearxngOptions): SearxngProvider {
  configuration(options, ["baseUrl", "fetch", "headers", "language", "safeSearch", "timeRange", "categories"]);
  const url = endpoint(options.baseUrl);
  const fetch = options.fetch ?? globalThis.fetch;
  if (typeof fetch !== "function" || options.fetch !== undefined && typeof options.fetch !== "function") throw new SearchError("configuration");
  const auth = headers(options.headers);
  const parameters = new URLSearchParams({ format: "json", pageno: "1" });
  if (options.language !== undefined) {
    if (typeof options.language !== "string" || !/^[a-zA-Z][a-zA-Z0-9_-]{0,34}$/.test(options.language)) throw new SearchError("configuration");
    parameters.set("language", options.language);
  }
  if (options.safeSearch !== undefined) {
    if (![0, 1, 2].includes(options.safeSearch)) throw new SearchError("configuration");
    parameters.set("safesearch", String(options.safeSearch));
  }
  if (options.timeRange !== undefined) {
    if (!["day", "month", "year"].includes(options.timeRange)) throw new SearchError("configuration");
    parameters.set("time_range", options.timeRange);
  }
  const categories = options.categories === undefined ? ["general"] : options.categories;
  if (!Array.isArray(categories) || !categories.length || categories.length > 20 ||
      ![...categories].every(value => typeof value === "string" && /^[a-zA-Z][a-zA-Z0-9 _-]{0,63}$/.test(value))) throw new SearchError("configuration");
  parameters.set("categories", categories.join(","));
  // Query operators are engine-dependent, so no domain-filter support is advertised or synthesized.
  const capabilities = Object.freeze({ domainFilters: false, maxIncludeDomains: 0, maxExcludeDomains: 0 });
  async function run(input: SearchRequest, options: SearchOptions): Promise<{ raw: RawSearchResponse; normalized: ProviderResponse }> {
    const request = addonRequest(input, options, capabilities);
    const form = new URLSearchParams(parameters);
    form.set("q", request.query);
    const data = await jsonRequest(fetch, url, { method: "POST", ...(options.signal ? { signal: options.signal } : {}),
      headers: auth, body: form.toString() });
    if (data.error !== undefined) throw new SearchError("provider_error");
    if (data.unresponsive_engines !== undefined && !Array.isArray(data.unresponsive_engines)) throw new SearchError("invalid_response");
    const retrievedAt = new Date().toISOString();
    const normalized = { results: results(data.results).map(row => mappedResult(row, "searxng", retrievedAt,
      { snippet: "content", score: "score" })).slice(0, request.limit), usage: null,
      warnings: Array.isArray(data.unresponsive_engines) && data.unresponsive_engines.length ?
        [{ code: "provider_warning" as const, provider: "searxng" }] : [] };
    return { raw: { provider: "searxng", retrievedAt, data }, normalized };
  }
  return Object.freeze({ id: "searxng", capabilities,
    async search(request, options) { return (await run(request, options)).normalized; },
    async searchRaw(request, options = {}) { return (await run(request, options)).raw; } } satisfies SearxngProvider);
}
