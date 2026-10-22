import { SearchError } from "./errors.js";
import type { ProviderResponse, SearchRequest, SearchWarning, ValidatedSearchRequest } from "./types.js";

export function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new SearchError("invalid_response");
  return value as Record<string, unknown>;
}
export function optionalString(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string") throw new SearchError("invalid_response");
  return value;
}
export function optionalNumber(value: unknown): number | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "number" || !Number.isFinite(value)) throw new SearchError("invalid_response");
  return value;
}
export function optionalStrings(value: unknown): string[] | undefined {
  if (value === undefined || value === null) return undefined;
  if (!Array.isArray(value) || ![...value].every(v => typeof v === "string")) throw new SearchError("invalid_response");
  return [...value];
}
export function resultUrl(value: unknown): string {
  if (typeof value !== "string" || !/^https?:\/\/[^/\\]/i.test(value) || /[\s\u0000-\u0020\u007f-\u009f\\]/u.test(value)) {
    throw new SearchError("invalid_response");
  }
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) throw new Error();
    return value;
  } catch { throw new SearchError("invalid_response"); }
}
export function requestId(value: unknown): string | undefined {
  const id = optionalString(value);
  if (id !== undefined && (!/^[a-zA-Z0-9_.:/-]{1,256}$/.test(id))) throw new SearchError("invalid_response");
  return id;
}
export function exactFields(value: object, allowed: readonly string[], code: "invalid_request" | "configuration" = "invalid_request"): void {
  if (Reflect.ownKeys(value).some(key => typeof key !== "string" || !allowed.includes(key))) throw new SearchError(code);
}
function domains(value: unknown): readonly string[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || !value.length || ![...value].every(domain => {
    if (typeof domain !== "string" || domain.length > 253) return false;
    return domain.split(".").length >= 2 && domain.split(".").every(label =>
      /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(label));
  })) throw new SearchError("invalid_request");
  return Object.freeze([...new Set(value.map(d => d.toLowerCase()))]);
}
export function validateRequest(input: SearchRequest): ValidatedSearchRequest {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
  exactFields(input, ["query", "limit", "includeDomains", "excludeDomains"]);
  if (typeof input.query !== "string" || !input.query.trim()) throw new SearchError("invalid_request");
  const limit = input.limit ?? 5;
  if (!Number.isInteger(limit) || limit < 1 || limit > 20 || input.limit === null) throw new SearchError("invalid_request");
  const includeDomains = domains(input.includeDomains);
  const excludeDomains = domains(input.excludeDomains);
  if (includeDomains?.some(d => excludeDomains?.includes(d))) throw new SearchError("invalid_request");
  return Object.freeze({ query: input.query, limit,
    ...(includeDomains ? { includeDomains } : {}), ...(excludeDomains ? { excludeDomains } : {}) });
}

/** Enforce the normalized contract even for custom providers; copy only public fields. */
export function validateProviderResponse(value: unknown): ProviderResponse {
  try {
    const { results, usage, warnings } = record(value);
    if (!Array.isArray(results) || !Array.isArray(warnings)) throw new SearchError("invalid_response");
    const normalizedResults = Array.from(results, value => {
      const row = record(value);
      const url = resultUrl(row.url);
      const title = optionalString(row.title);
      const snippet = optionalString(row.snippet);
      const highlights = optionalStrings(row.highlights);
      const score = optionalNumber(row.score);
      const source = record(row.provenance);
      const provider = source.provider;
      const sourceUrl = resultUrl(source.sourceUrl);
      const retrievedAt = source.retrievedAt;
      const id = requestId(source.requestId);
      if (typeof provider !== "string" || !/^[a-zA-Z0-9_-]{1,64}$/.test(provider) ||
        typeof retrievedAt !== "string" || !Number.isFinite(Date.parse(retrievedAt))) throw new SearchError("invalid_response");
      return { url, ...(title !== undefined ? { title } : {}), ...(snippet !== undefined ? { snippet } : {}),
        ...(highlights !== undefined ? { highlights } : {}), ...(score !== undefined ? { score } : {}),
        provenance: { provider, sourceUrl, retrievedAt, ...(id !== undefined ? { requestId: id } : {}) } };
    });
    let normalizedUsage: ProviderResponse["usage"] = null;
    if (usage !== null) {
      const { unit, value } = record(usage);
      if ((unit !== "usd" && unit !== "credits") || typeof value !== "number" || !Number.isFinite(value) || value < 0) throw new SearchError("invalid_response");
      normalizedUsage = { unit, value };
    }
    const normalizedWarnings = Array.from(warnings, value => {
      const { code, provider } = record(value);
      if ((code !== "fallback_used" && code !== "provider_warning") ||
        typeof provider !== "string" || !/^[a-zA-Z0-9_-]{1,64}$/.test(provider)) throw new SearchError("invalid_response");
      return { code, provider } as SearchWarning;
    });
    return { results: normalizedResults, usage: normalizedUsage, warnings: normalizedWarnings };
  } catch { throw new SearchError("invalid_response"); }
}
