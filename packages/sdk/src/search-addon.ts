import { SearchError } from "./errors.js";
import { exactFields, validateRequest } from "./validation.js";
import type { SearchOptions, SearchProvider, SearchRequest } from "./types.js";

/** The bounded provider JSON, including fields omitted by normalization. Treat as untrusted data. */
export interface RawSearchResponse {
  provider: string;
  retrievedAt: string;
  data: Readonly<Record<string, unknown>>;
}

export function configuration(value: unknown, fields: readonly string[]): asserts value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new SearchError("configuration");
  exactFields(value, fields, "configuration");
}

export function addonRequest(input: SearchRequest, options: SearchOptions,
  capabilities: SearchProvider["capabilities"]) {
  const request = validateRequest(input);
  if (!options || typeof options !== "object" || Array.isArray(options)) throw new SearchError("invalid_request");
  exactFields(options, ["signal"]);
  if (options.signal !== undefined && !(options.signal instanceof AbortSignal)) throw new SearchError("invalid_request");
  if (options.signal?.aborted) throw new SearchError("aborted");
  if ((request.includeDomains || request.excludeDomains) && !capabilities.domainFilters ||
      (request.includeDomains?.length ?? 0) > capabilities.maxIncludeDomains ||
      (request.excludeDomains?.length ?? 0) > capabilities.maxExcludeDomains) throw new SearchError("unsupported_option");
  return request;
}
