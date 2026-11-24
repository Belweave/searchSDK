// The single code path that executes any provider spec: request building,
// response mapping and cost. No provider-specific code lives here.
import { SearchError } from "./errors.ts";
import { providers } from "./generated/registry.ts";
import type { NormalizedSearch } from "./policy.ts";
import { urlKey } from "./policy.ts";
import { validate } from "./schema.ts";
import { creditsToUsd, requestPrice, runSteps, StepUnsupported, toList, type StepContext } from "./steps.ts";
import type {
  ContentsEndpoint, Cost, EndpointBase, Field, Page, ProviderId, RequestIdRule,
  SearchEndpoint, SearchResult, Warning, WarningRule,
} from "./types.ts";

export type Kind = "search" | "contents";

export interface HttpRequest { method: "GET" | "POST"; url: string; headers: Record<string, string>; body?: string }

export function getPath(value: unknown, path: string): unknown {
  if (path === "$") return value;
  let v = value;
  for (const key of path.split(".")) {
    if (v === null || typeof v !== "object") return undefined;
    v = (v as Record<string, unknown>)[key];
  }
  return v;
}

function setPath(target: Record<string, unknown>, path: string, value: unknown): void {
  const keys = path.split(".");
  let o = target;
  for (const k of keys.slice(0, -1)) {
    if (o[k] === null || typeof o[k] !== "object" || Array.isArray(o[k])) o[k] = {};
    o = o[k] as Record<string, unknown>;
  }
  o[keys[keys.length - 1]!] = value;
}

const unsupported = (provider: ProviderId, field: string): never => {
  throw new SearchError("unsupported", { provider, field });
};

export function endpoint<K extends Kind>(provider: ProviderId, kind: K): K extends "search" ? SearchEndpoint : ContentsEndpoint {
  const ep = providers[provider][kind];
  if (!ep) unsupported(provider, kind);
  return ep as never;
}

/** Percent-encodes everything except RFC 3986 unreserved characters. */
const encode = (s: string) => encodeURIComponent(s).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);

/** Checks provider limits for a normalized request; failures are `unsupported` so fallback can skip the provider. */
export function checkLimits(provider: ProviderId, kind: Kind, input: Record<string, unknown>): void {
  if (kind === "search") {
    const ep = endpoint(provider, "search");
    const n = input as unknown as NormalizedSearch;
    if (n.maxResults > ep.limits.maxResults) unsupported(provider, "maxResults");
    if (ep.limits.maxQueryLength !== null && [...n.query].length > ep.limits.maxQueryLength) unsupported(provider, "query");
    if ((n.includeDomains?.length ?? 0) > ep.limits.maxIncludeDomains) unsupported(provider, "includeDomains");
    if ((n.excludeDomains?.length ?? 0) > ep.limits.maxExcludeDomains) unsupported(provider, "excludeDomains");
  } else {
    const ep = endpoint(provider, "contents");
    if ((input.urls as string[]).length > ep.limits.maxUrls) unsupported(provider, "urls");
  }
}

export function buildRequest(
  provider: ProviderId, kind: Kind, input: Record<string, unknown>, options: unknown, key: string, ctx: StepContext,
): HttpRequest {
  const spec = providers[provider];
  const ep: EndpointBase = endpoint(provider, kind);
  checkLimits(provider, kind, input);
  const out: Record<string, unknown> = structuredClone(ep.request.fixed ?? {});
  const mappedRoots = new Set<string>();
  for (const name of Object.keys(input)) {
    if (input[name] === undefined) continue;
    if (!(name in ep.request.params)) {
      if (name === "maxResults") continue; // the runtime truncates instead
      unsupported(provider, name);
    }
  }
  for (const [name, param] of Object.entries(ep.request.params)) {
    if (input[name] === undefined) continue;
    let value: unknown;
    try {
      value = runSteps(input[name], param.steps, "request", ctx);
    } catch (e) {
      if (e instanceof StepUnsupported) unsupported(provider, name);
      throw e;
    }
    if (value === null || value === undefined) continue;
    setPath(out, param.to, value);
    mappedRoots.add(param.to.split(".")[0]!);
  }
  if (options !== undefined) {
    if (options === null || typeof options !== "object" || Array.isArray(options)) throw new SearchError("invalid_request", { provider, field: "providerOptions" });
    for (const [name, value] of Object.entries(options as Record<string, unknown>)) {
      const schema = ep.providerOptions[name];
      const field = `providerOptions.${provider}.${name}`;
      if (value === undefined) continue;
      if (!schema || mappedRoots.has(name) || validate(value, schema).length) throw new SearchError("invalid_request", { provider, field });
      out[name] = value;
    }
  }
  const headers: Record<string, string> = { accept: "application/json" };
  let url = ep.request.url;
  let body: string | undefined;
  if (spec.auth.in === "header") headers[spec.auth.name] = (spec.auth.prefix ?? "") + key;
  if (ep.request.encoding === "json") {
    headers["content-type"] = "application/json";
    body = JSON.stringify(out);
  } else {
    const pairs: string[] = [];
    for (const [k, v] of Object.entries(out)) {
      if (typeof v !== "string" && typeof v !== "number" && typeof v !== "boolean") throw new SearchError("invalid_request", { provider, field: k });
      pairs.push(`${encode(k)}=${encode(String(v))}`);
    }
    if (spec.auth.in === "query") pairs.push(`${encode(spec.auth.name)}=${encode(key)}`);
    if (pairs.length) url += (url.includes("?") ? "&" : "?") + pairs.join("&");
  }
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
    if (typeof v === "string" && v.trim() !== "" && !("header" in rule && v.includes(","))) return v.trim();
  }
  return null;
}

function warnings(provider: ProviderId, rules: WarningRule[] | undefined, body: unknown): Warning[] {
  const out: Warning[] = [];
  for (const rule of rules ?? []) {
    if ("ifPath" in rule) {
      if (getPath(body, rule.ifPath) === rule.equals) out.push({ code: rule.code, provider });
    } else {
      const list = getPath(body, rule.listPath);
      if (!Array.isArray(list)) continue;
      for (const item of list) {
        const w: Warning = { code: rule.code, provider };
        const message = rule.messageField ? str(getPath(item, rule.messageField)) : null;
        if (message !== null) w.message = message;
        out.push(w);
      }
    }
  }
  return out;
}

function cost(ep: EndpointBase, body: unknown, count: number, tier: string | null): Cost {
  const reported = ep.cost?.reported;
  if (reported) {
    const v = getPath(body, reported.path);
    if (typeof v === "number" && Number.isFinite(v) && v >= 0) {
      if (reported.unit === "usd") return { usd: v, estimated: reported.isEstimate ?? false, source: "reported" };
      const usd = creditsToUsd(v, ep.pricing.creditUsd);
      if (usd !== null) return { usd, estimated: true, source: "reported-credits", credits: v };
    }
  }
  const usd = requestPrice(count, ep.pricing, tier);
  return usd === null ? { usd: null, estimated: true, source: "unknown" } : { usd, estimated: true, source: "computed" };
}

export interface Mapped<T> { items: T; cost: Cost; requestId: string | null; warnings: Warning[] }

export function mapSearch(provider: ProviderId, input: NormalizedSearch, body: unknown, headers: Headers, ctx: StepContext): Mapped<SearchResult[]> {
  const ep = endpoint(provider, "search");
  const rows = getPath(body, ep.response.results);
  if (!Array.isArray(rows)) throw new SearchError("invalid_response", { provider, raw: body });
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
  return { items: results, cost: cost(ep, body, rows.length, input.depth ?? null), requestId: requestId(ep.response.requestId, body, headers), warnings: warns };
}

export function mapContents(provider: ProviderId, urls: string[], body: unknown, headers: Headers, ctx: StepContext): Mapped<Page[]> {
  const ep = endpoint(provider, "contents");
  const candidates: { key: string; page: Page }[] = [];
  for (const source of ep.response.pages) {
    const raw = getPath(body, source.from);
    const list = source.from === "$" ? [raw] : raw === undefined || raw === null ? [] : raw;
    if (!Array.isArray(list)) throw new SearchError("invalid_response", { provider, raw: body });
    for (const item of list) {
      if (source.where && getPath(item, source.where.path) !== source.where.equals) continue;
      const url = field(item, source.fields.url, ctx);
      if (typeof url !== "string") continue;
      const f = source.fields;
      const ok = source.status === "ok";
      candidates.push({
        key: urlKey(url),
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
  const pages: Page[] = urls.map((url) => {
    const i = candidates.findIndex((c) => c.key === urlKey(url));
    if (i < 0) return { url, status: "failed", finalUrl: null, title: null, content: null, publishedAt: null, author: null, error: { code: "missing", message: null } };
    const [hit] = candidates.splice(i, 1);
    return { ...hit!.page, url };
  });
  const warns = warnings(provider, ep.response.warnings, body);
  if (candidates.length) warns.push({ code: "unmatched_pages", provider, count: candidates.length });
  const okCount = pages.filter((p) => p.status === "ok").length;
  return { items: pages, cost: cost(ep, body, okCount, null), requestId: requestId(ep.response.requestId, body, headers), warnings: warns };
}
