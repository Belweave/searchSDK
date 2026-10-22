import { adapterOptions, jsonRequest, mappedResult, results } from "./http.js";
import { requestId } from "./validation.js";
import { SearchError } from "./errors.js";
import type { AdapterOptions, SearchProvider } from "./types.js";

export function parallel(options: AdapterOptions): SearchProvider {
  const { apiKey, fetch } = adapterOptions(options);
  return Object.freeze({ id: "parallel", capabilities: Object.freeze({ domainFilters: true,
    maxIncludeDomains: 200, maxExcludeDomains: 200, mutuallyExclusiveDomainFilters: true }),
    async search(request, { signal }) {
      const body = await jsonRequest(fetch, "https://api.parallel.ai/v1/search", { method: "POST", signal,
        headers: { "Content-Type": "application/json", "x-api-key": apiKey },
        body: JSON.stringify({ search_queries: [request.query], mode: "basic", advanced_settings: {
          max_results: request.limit,
          ...(request.includeDomains || request.excludeDomains ? { source_policy: {
            ...(request.includeDomains ? { include_domains: request.includeDomains } : {}),
            ...(request.excludeDomains ? { exclude_domains: request.excludeDomains } : {}) } } : {}) } }) });
      const id = requestId(body.search_id);
      if (body.warnings !== undefined && body.warnings !== null && !Array.isArray(body.warnings)) throw new SearchError("invalid_response");
      const retrievedAt = new Date().toISOString();
      return { results: results(body.results).map(row => mappedResult(row, "parallel", retrievedAt, { highlights: "excerpts" }, id)),
        usage: null, warnings: Array.isArray(body.warnings) && body.warnings.length
          ? [{ code: "provider_warning" as const, provider: "parallel" }] : [] };
    } } satisfies SearchProvider);
}
