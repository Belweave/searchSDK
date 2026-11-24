// The single code path that executes any provider spec: request building,
// response mapping and cost. No provider-specific code lives here.
import { SearchError } from "./errors.ts";
import { allHold, getPath, jsonEqual } from "./json.ts";
import type { NormalizedSearch } from "./policy.ts";
import { urlKey, wellFormed } from "./policy.ts";
import { validate } from "./schema.ts";
import { creditsToUsd, requestPrice, runSteps, StepUnsupported, toList, trimBlank, type StepContext } from "./steps.ts";
import type {
  ContentsEndpoint, Cost, EndpointBase, Field, Page, ProviderId, ProviderSpec, RequestIdRule,
  SearchEndpoint, SearchResult, Tier, Warning, WarningRule,
} from "./types.ts";

export type Kind = "search" | "contents";

export interface HttpRequest { method: "GET" | "POST"; url: string; headers: Record<string, string>; body?: string }

const own = (o: object, k: string) => Object.prototype.hasOwnProperty.call(o, k);
const isPlainObject = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === "object" && !Array.isArray(v);

/** Writes a value at a dotted path, creating objects on the way; anything that is not an object on the way is replaced by {}. */
function setPath(target: Record<string, unknown>, path: string, value: unknown): void {
  const keys = path.split(".");
  let o = target;
  for (const k of keys.slice(0, -1)) {
    if (!own(o, k) || !isPlainObject(o[k])) Object.defineProperty(o, k, { value: {}, enumerable: true, writable: true, configurable: true });
    o = o[k] as Record<string, unknown>;
  }
  Object.defineProperty(o, keys[keys.length - 1]!, { value, enumerable: true, writable: true, configurable: true });
}

const unsupported = (provider: ProviderId, field: string): never => {
  throw new SearchError("unsupported", { provider, field });
};

export function endpoint<K extends Kind>(spec: ProviderSpec, kind: K): K extends "search" ? SearchEndpoint : ContentsEndpoint {
  const ep = spec[kind];
  if (!ep) unsupported(spec.id as ProviderId, kind);
  return ep as never;
}

/** Percent-encodes everything except RFC 3986 unreserved characters. */
const encode = (s: string) => encodeURIComponent(s).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);

/** A scalar's query-string form: true/false, and ECMAScript Number-to-String for numbers. Anything else is null. */
function scalarText(v: unknown): string | null {
  if (typeof v === "string") return v;
  if (typeof v === "boolean") return v ? "true" : "false";
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  return null;
}

/** Checks provider limits for a normalized request; failures are `unsupported` so fallback can skip the provider. */
export function checkLimits(spec: ProviderSpec, kind: Kind, input: Record<string, unknown>): void {
  const provider = spec.id as ProviderId;
  if (kind === "search") {
    const { limits } = endpoint(spec, "search");
    const n = input as unknown as NormalizedSearch;
    const inc = n.includeDomains?.length ?? 0, exc = n.excludeDomains?.length ?? 0;
    if (n.maxResults > limits.maxResults) unsupported(provider, "maxResults");
    if (limits.maxQueryLength !== null && [...n.query].length > limits.maxQueryLength) unsupported(provider, "query");
    if (inc > limits.maxIncludeDomains) unsupported(provider, "includeDomains");
    if (exc > limits.maxExcludeDomains) unsupported(provider, "excludeDomains");
    if (limits.includeExcludeExclusive && inc > 0 && exc > 0) unsupported(provider, "excludeDomains");
    if (limits.maxTotalDomains !== undefined && inc + exc > limits.maxTotalDomains) unsupported(provider, "excludeDomains");
  } else {
    if ((input.urls as string[]).length > endpoint(spec, "contents").limits.maxUrls) unsupported(provider, "urls");
  }
}

export function buildRequest(
  spec: ProviderSpec, kind: Kind, input: Record<string, unknown>, options: unknown, key: string, ctx: StepContext,
): HttpRequest {
  const provider = spec.id as ProviderId;
  const ep: EndpointBase = endpoint(spec, kind);
  checkLimits(spec, kind, input);
  const out: Record<string, unknown> = structuredClone(ep.request.fixed ?? {});
  const mappedRoots = new Map<string, string>(); // top-level key -> the normalized input that wrote it
  const composed = new Set((ep.request.compose ?? []).flatMap((c) => c.parts.flatMap((p) => ("input" in p ? [p.input] : []))));
  for (const name of Object.keys(input)) {
    if (input[name] === undefined || own(ep.request.params, name) || composed.has(name)) continue;
    if (name === "maxResults") continue; // the runtime truncates instead
    unsupported(provider, name);
  }
  const step = (name: string, value: unknown, steps: Parameters<typeof runSteps>[1]) => {
    try {
      return runSteps(value, steps, "request", ctx);
    } catch (e) {
      if (e instanceof StepUnsupported) unsupported(provider, name);
      throw e;
    }
  };
  for (const [name, param] of Object.entries(ep.request.params)) {
    if (input[name] === undefined) continue;
    const value = step(name, input[name], param.steps);
    if (value === null || value === undefined) continue;
    if (param.append) {
      const prev = getPath(out, param.to);
      setPath(out, param.to, [...(Array.isArray(prev) ? prev : []), ...(Array.isArray(value) ? value : [value])]);
    } else setPath(out, param.to, value);
    mappedRoots.set(param.to.split(".")[0]!, name);
  }
  for (const c of ep.request.compose ?? []) {
    if (!c.parts.some((p) => "input" in p && input[p.input] !== undefined)) continue;
    let text = "";
    for (const part of c.parts) {
      if (!("input" in part)) { text += part.text; continue; }
      if (input[part.input] === undefined) {
        if (part.required) unsupported(provider, part.input);
        continue;
      }
      const s = scalarText(step(part.input, input[part.input], part.steps));
      if (s === null) unsupported(provider, part.input);
      text += (part.text ?? "") + s;
    }
    setPath(out, c.to, text);
    const firstSet = c.parts.find((p) => "input" in p && input[p.input] !== undefined) as { input: string };
    mappedRoots.set(c.to.split(".")[0]!, firstSet.input);
  }
  if (options !== undefined) {
    if (!isPlainObject(options)) throw new SearchError("invalid_request", { provider, field: `providerOptions.${provider}` });
    for (const [name, value] of Object.entries(options)) {
      const field = `providerOptions.${provider}.${name}`;
      if (value === undefined) continue;
      const schema = own(ep.providerOptions, name) ? ep.providerOptions[name] : undefined;
      const scalarOnly = ep.request.encoding === "query" && scalarText(value) === null;
      if (!schema || mappedRoots.has(name) || !wellFormed(value) || scalarOnly || validate(value, schema).length) {
        throw new SearchError("invalid_request", { provider, field });
      }
      Object.defineProperty(out, name, { value, enumerable: true, writable: true, configurable: true }); // keeps a replaced key's place
    }
    for (const path of ep.request.locked ?? []) {
      if (!jsonEqual(getPath(out, path), getPath(ep.request.fixed ?? {}, path))) {
        throw new SearchError("invalid_request", { provider, field: `providerOptions.${provider}.${path.split(".")[0]}` });
      }
    }
  }
  const headers: Record<string, string> = { accept: "application/json" };
  let url = ep.request.url;
  let body: string | undefined;
  const pairs: string[] = [];
  if (spec.auth.in === "header") headers[spec.auth.name] = (spec.auth.prefix ?? "") + key;
  if (ep.request.encoding === "json") {
    headers["content-type"] = "application/json";
    body = JSON.stringify(out);
  } else {
    for (const [k, v] of Object.entries(out)) {
      const s = scalarText(v);
      // Fixed values and provider options are checked earlier, so only a param can write a list or object here.
      if (s === null) throw new SearchError("unsupported", { provider, field: mappedRoots.get(k) ?? k });
      pairs.push(`${encode(k)}=${encode(s)}`);
    }
  }
  if (spec.auth.in === "query") pairs.push(`${encode(spec.auth.name)}=${encode(key)}`);
  if (pairs.length) url += (url.includes("?") ? "&" : "?") + pairs.join("&");
  const req: HttpRequest = { method: ep.request.method, url, headers };
  if (body !== undefined && ep.request.method !== "GET") req.body = body;
  return req;
}

function field(row: unknown, f: Field | undefined, ctx: StepContext): unknown {
  if (f === undefined) return undefined;
  if (typeof f === "string") return getPath(row, f);
  return runSteps(getPath(row, f.path), f.steps, "response", ctx);
}

const str = (v: unknown): string | null => (typeof v === "string" ? v : null);
/** Like str, but a blank string (policy blank set) becomes null. */
const text = (v: unknown): string | null => (typeof v === "string" && toList(v).length ? v : null);
const httpUrl = (v: unknown): v is string => typeof v === "string" && /^https?:\/\/[^\s/?#]+/i.test(v);

function requestId(rules: RequestIdRule[] | undefined, body: unknown, headers: Headers): string | null {
  for (const rule of rules ?? []) {
    const v = "path" in rule ? getPath(body, rule.path) : headers.get(rule.header);
    if (typeof v !== "string" || ("header" in rule && v.includes(","))) continue;
    const trimmed = trimBlank(v); // policy blank code points, not String.prototype.trim's set
    if (trimmed !== "") return trimmed;
  }
  return null;
}

function warnings(provider: ProviderId, rules: WarningRule[] | undefined, body: unknown): Warning[] {
  const out: Warning[] = [];
  const add = (code: string, from: unknown, messageField: string | undefined) => {
    const w: Warning = { code, provider };
    const message = messageField ? text(getPath(from, messageField)) : null;
    if (message !== null) w.message = message;
    out.push(w);
  };
  for (const rule of rules ?? []) {
    if ("where" in rule) {
      if (allHold(body, rule.where)) add(rule.code, body, rule.messageField);
    } else {
      const list = getPath(body, rule.listPath);
      if (Array.isArray(list)) for (const item of list) add(rule.code, item, rule.messageField);
    }
  }
  return out;
}

const UNKNOWN: Cost = { usd: null, estimated: true, source: "unknown" };

/**
 * The tier a request is priced at: the normalized depth, unless a provider
 * option listed in pricing.costOptions decides it. Returns null when an
 * option makes the price unknown.
 */
export function pricedTier(ep: EndpointBase, depth: string | undefined, options: unknown): string | null {
  let tier: string = depth ?? "standard";
  const costOptions = ep.pricing.costOptions ?? {};
  if (!isPlainObject(options)) return tier;
  for (const [name, value] of Object.entries(options)) {
    if (value === undefined || !own(costOptions, name)) continue;
    const effect = costOptions[name]!;
    if (effect === "unknown") return null;
    const t = typeof value === "string" && own(effect, value) ? effect[value] : null;
    if (t === null || t === undefined) return null;
    tier = t;
  }
  return tier;
}

/** The cost the computed price gives for `count` items. */
export function computedCost(ep: EndpointBase, count: number, depth: string | undefined, options: unknown): Cost {
  const tier = pricedTier(ep, depth, options);
  const usd = tier === null ? null : requestPrice(count, ep.pricing, tier as Tier);
  return usd === null ? UNKNOWN : { usd, estimated: true, source: "computed" };
}

/** A reported cost from the body, or null when the body reports none that is usable. */
export function reportedCost(ep: EndpointBase, body: unknown): Cost | null {
  const reported = ep.cost?.reported;
  if (!reported) return null;
  const v = getPath(body, reported.path);
  if (typeof v !== "number" || !Number.isFinite(v) || v < 0) return null;
  if (reported.unit === "usd") return { usd: v, estimated: reported.isEstimate ?? false, source: "reported" };
  const usd = creditsToUsd(v, ep.pricing.creditUsd);
  return usd === null ? null : { usd, estimated: true, source: "reported-credits", credits: v };
}

/** Request context the mapping needs beyond the body. */
export interface MapContext extends StepContext { options: unknown }

export interface Mapped<T> { items: T; cost: Cost; requestId: string | null; warnings: Warning[] }

const invalid = (provider: ProviderId, body: unknown): never => { throw new SearchError("invalid_response", { provider, raw: body }); };

export function mapSearch(spec: ProviderSpec, input: NormalizedSearch, body: unknown, headers: Headers, ctx: MapContext): Mapped<SearchResult[]> {
  const provider = spec.id as ProviderId;
  const ep = endpoint(spec, "search");
  if (!isPlainObject(body)) invalid(provider, body);
  const found = getPath(body, ep.response.results);
  const rows = (found === undefined || found === null) && ep.response.resultsOptional ? [] : found;
  if (!Array.isArray(rows)) return invalid(provider, body);
  const f = ep.response.fields;
  const results: SearchResult[] = [];
  let dropped = 0;
  for (const row of rows) {
    if (results.length >= input.maxResults) break;
    const url = field(row, f.url, ctx);
    if (!httpUrl(url)) { dropped++; continue; }
    const providerFields: Record<string, unknown> = {};
    for (const [name, pf] of Object.entries(ep.response.providerFields ?? {})) {
      const v = field(row, pf, ctx);
      if (v !== undefined && v !== null) providerFields[name] = v;
    }
    const excerpts = f.excerpts === undefined ? [] : field(row, f.excerpts, ctx);
    results.push({
      url,
      title: text(field(row, f.title, ctx)),
      excerpts: Array.isArray(excerpts) ? excerpts.filter((e): e is string => typeof e === "string") : [],
      publishedAt: str(field(row, f.publishedAt, ctx)),
      author: text(field(row, f.author, ctx)),
      rank: results.length + 1,
      providerFields,
    });
  }
  const warns = warnings(provider, ep.response.warnings, body);
  if (dropped) warns.push({ code: "invalid_rows_dropped", provider, count: dropped });
  const cost = reportedCost(ep, body) ?? computedCost(ep, rows.length, input.depth, ctx.options);
  return { items: results, cost, requestId: requestId(ep.response.requestId, body, headers), warnings: warns };
}

export function mapContents(spec: ProviderSpec, urls: string[], body: unknown, headers: Headers, ctx: MapContext): Mapped<Page[]> {
  const provider = spec.id as ProviderId;
  const ep = endpoint(spec, "contents");
  if (!isPlainObject(body)) invalid(provider, body);
  const candidates: { key: string; page: Page; billable: boolean }[] = [];
  for (const source of ep.response.pages) {
    const raw = source.from === "$" ? body : getPath(body, source.from);
    const list = source.from === "$" ? [raw] : (raw === undefined || raw === null) && source.optional ? [] : raw;
    if (!Array.isArray(list)) return invalid(provider, body);
    for (const item of list) {
      if (!allHold(item, source.where)) continue;
      const url = field(item, source.fields.url, ctx);
      if (typeof url !== "string") continue;
      const f = source.fields;
      const ok = source.status === "ok";
      candidates.push({
        key: urlKey(url),
        billable: ok || source.billable === true,
        page: {
          url,
          status: source.status,
          finalUrl: text(field(item, f.finalUrl, ctx)),
          title: text(field(item, f.title, ctx)),
          content: ok ? str(field(item, f.content, ctx)) : null,
          publishedAt: str(field(item, f.publishedAt, ctx)),
          author: text(field(item, f.author, ctx)),
          error: ok ? null : { code: text(field(item, f.errorCode, ctx)), message: text(field(item, f.errorMessage, ctx)) },
        },
      });
    }
  }
  const billableCount = candidates.filter((c) => c.billable).length;
  const pages: Page[] = urls.map((url) => {
    const i = candidates.findIndex((c) => c.key === urlKey(url));
    if (i < 0) return { url, status: "failed", finalUrl: null, title: null, content: null, publishedAt: null, author: null, error: { code: "missing", message: null } };
    const [hit] = candidates.splice(i, 1);
    return { ...hit!.page, url };
  });
  const warns = warnings(provider, ep.response.warnings, body);
  if (candidates.length) warns.push({ code: "unmatched_pages", provider, count: candidates.length });
  const cost = reportedCost(ep, body) ?? computedCost(ep, billableCount, undefined, ctx.options);
  return { items: pages, cost, requestId: requestId(ep.response.requestId, body, headers), warnings: warns };
}

/**
 * The cost of an attempt that produced no mapped response: a reported cost
 * from the body when there is one, otherwise the computed price for the
 * requested count (results asked for, or URLs sent).
 */
export function attemptCost(spec: ProviderSpec, kind: Kind, input: Record<string, unknown>, body: unknown, options: unknown): Cost {
  const ep: EndpointBase = endpoint(spec, kind);
  const reported = body === undefined ? null : reportedCost(ep, body);
  if (reported) return reported;
  const count = kind === "search" ? (input.maxResults as number) : (input.urls as string[]).length;
  return computedCost(ep, count, kind === "search" ? (input.depth as string | undefined) : undefined, options);
}
