import { SearchError } from "./errors.js";
import { adapterOptions, jsonRequest, mappedResult, results, usage } from "./http.js";
import { addonRequest, configuration } from "./search-addon.js";
import { optionalString, optionalStrings, requestId } from "./validation.js";
import type { AdapterOptions, ProviderResponse, SearchOptions, SearchProvider, SearchRequest } from "./types.js";
import type { RawSearchResponse } from "./search-addon.js";
export type { RawSearchResponse } from "./search-addon.js";

/** Supported web-search settings, fixed for this provider instance. No proprietary dataset access. */
export interface ValyuSearchOptions {
  /** Provider-native request budget. Passed unchanged; not an SDK USD estimate. */
  maxPrice?: number;
  relevanceThreshold?: number;
  responseLength?: "short" | "medium" | "large" | "max" | number;
  fastMode?: boolean;
  /** This adapter supports the documented YYYY-MM-DD date subset. */
  startDate?: string;
  endDate?: string;
  instructions?: string;
}
export interface ValyuOptions extends AdapterOptions { search?: ValyuSearchOptions }
export interface ValyuProvider extends SearchProvider {
  /** Same web request and validation as search; retains original JSON, source, dates and prices. */
  searchRaw(request: SearchRequest, options?: SearchOptions): Promise<RawSearchResponse>;
}

function settings(options: ValyuSearchOptions | undefined): Record<string, unknown> {
  if (options === undefined) return {};
  configuration(options, ["maxPrice", "relevanceThreshold", "responseLength", "fastMode", "startDate", "endDate", "instructions"]);
  const invalid = () => { throw new SearchError("configuration"); };
  const { maxPrice, relevanceThreshold, responseLength, fastMode, startDate, endDate, instructions } = options;
  if (maxPrice !== undefined && (typeof maxPrice !== "number" || !Number.isFinite(maxPrice) || maxPrice <= 0)) invalid();
  if (relevanceThreshold !== undefined && (typeof relevanceThreshold !== "number" || !Number.isFinite(relevanceThreshold) || relevanceThreshold < 0 || relevanceThreshold > 1)) invalid();
  if (responseLength !== undefined && !(typeof responseLength === "string" && ["short", "medium", "large", "max"].includes(responseLength) ||
      typeof responseLength === "number" && Number.isSafeInteger(responseLength) && responseLength > 0)) invalid();
  if (fastMode !== undefined && typeof fastMode !== "boolean") invalid();
  for (const date of [startDate, endDate]) {
    if (date !== undefined && (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
        !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date)) invalid();
  }
  if (typeof startDate === "string" && typeof endDate === "string" && startDate > endDate) invalid();
  if (instructions !== undefined && (typeof instructions !== "string" || !instructions.trim() || instructions.length > 500)) invalid();
  return { ...(maxPrice !== undefined ? { max_price: maxPrice } : {}),
    ...(relevanceThreshold !== undefined ? { relevance_threshold: relevanceThreshold } : {}),
    ...(responseLength !== undefined ? { response_length: responseLength } : {}),
    ...(fastMode !== undefined ? { fast_mode: fastMode } : {}),
    ...(startDate !== undefined ? { start_date: startDate } : {}), ...(endDate !== undefined ? { end_date: endDate } : {}),
    ...(instructions !== undefined ? { instructions } : {}) };
}

/** Valyu POST /v1/search, explicitly web only. One request; no implicit paid pagination. */
export function valyu(options: ValyuOptions): ValyuProvider {
  configuration(options, ["apiKey", "fetch", "search"]);
  const { apiKey, fetch } = adapterOptions({ apiKey: options.apiKey, ...(options.fetch ? { fetch: options.fetch } : {}) });
  if (options.fetch !== undefined && typeof options.fetch !== "function") throw new SearchError("configuration");
  const search = settings(options.search);
  // Conservative SDK policy; the native documentation does not publish domain-list maxima.
  const capabilities = Object.freeze({ domainFilters: true, maxIncludeDomains: 100, maxExcludeDomains: 100 });
  async function run(input: SearchRequest, options: SearchOptions): Promise<{ raw: RawSearchResponse; normalized: ProviderResponse }> {
    const request = addonRequest(input, options, capabilities);
    const data = await jsonRequest(fetch, "https://api.valyu.ai/v1/search", {
      method: "POST", ...(options.signal ? { signal: options.signal } : {}),
      headers: { Accept: "application/json", "Content-Type": "application/json", "X-API-Key": apiKey },
      body: JSON.stringify({ ...search, query: request.query, search_type: "web", max_num_results: request.limit,
        ...(request.includeDomains ? { included_sources: request.includeDomains } : {}),
        ...(request.excludeDomains ? { excluded_sources: request.excludeDomains } : {}) }) });
    if (typeof data.success !== "boolean") throw new SearchError("invalid_response");
    if (!data.success) throw new SearchError("provider_error");
    const id = requestId(data.tx_id);
    const warning = optionalString(data.error);
    const warnings = optionalStrings(data.warnings);
    const retrievedAt = new Date().toISOString();
    const normalized = { results: results(data.results).map(row => mappedResult(row, "valyu", retrievedAt,
      { snippet: "content", score: "relevance_score" }, id)).slice(0, request.limit),
      usage: usage(data, "total_deduction_dollars", "usd"),
      warnings: warning || warnings?.length ? [{ code: "provider_warning" as const, provider: "valyu" }] : [] };
    return { raw: { provider: "valyu", retrievedAt, data }, normalized };
  }
  return Object.freeze({ id: "valyu", capabilities,
    async search(request, options) { return (await run(request, options)).normalized; },
    async searchRaw(request, options = {}) { return (await run(request, options)).raw; } } satisfies ValyuProvider);
}
