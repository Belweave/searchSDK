// Shared policy: input validation, status mapping, retry timing and fallback
// eligibility. Every constant comes from registry/policy.json.
import { SearchError } from "./errors.ts";
import { policy, providers } from "./generated/registry.ts";
import { isBlank } from "./steps.ts";
import type { ErrorCode, ProviderId } from "./types.ts";

const ranges = (list: readonly (readonly string[])[]) => list.map(([a, b]) => [parseInt(a!, 16), parseInt(b!, 16)] as const);
const forbiddenRanges = ranges(policy.query.forbidden);
const inRanges = (cp: number, rs: readonly (readonly [number, number])[]) => rs.some(([a, b]) => cp >= a && cp <= b);
const isSurrogate = (cp: number) => cp >= 0xd800 && cp <= 0xdfff;

const invalid = (field: string): never => { throw new SearchError("invalid_request", { field }); };
const configuration = (field: string): never => { throw new SearchError("configuration", { field }); };

export const isProviderId = (id: unknown): id is ProviderId =>
  typeof id === "string" && Object.prototype.hasOwnProperty.call(providers, id);

/** Trims blank code points from both ends; rejects blank, forbidden, unpaired-surrogate and overlong queries. */
export function normalizeQuery(query: unknown): string {
  if (typeof query !== "string") return invalid("query");
  const cps = Array.from(query as string, (c) => c.codePointAt(0)!);
  let start = 0, end = cps.length;
  while (start < end && isBlank(cps[start]!)) start++;
  while (end > start && isBlank(cps[end - 1]!)) end--;
  if (start === end) return invalid("query");
  const kept = cps.slice(start, end);
  if (kept.some((cp) => isSurrogate(cp) || inRanges(cp, forbiddenRanges))) return invalid("query");
  if (kept.length > policy.query.maxCodePoints) return invalid("query");
  return String.fromCodePoint(...kept);
}

function integerIn(value: unknown, field: string, min: number, max: number): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < min || value > max) return invalid(field);
  return value as number;
}

const labelPattern = new RegExp(policy.domains.labelPattern);
function normalizeDomains(value: unknown, field: string): string[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) return invalid(field);
  const out: string[] = [];
  for (const d of value) {
    if (typeof d !== "string") return invalid(field);
    const host = d.replace(/[A-Z]+/g, (x) => x.toLowerCase());
    const labels = host.split(".");
    if (host.length > policy.domains.maxLength || labels.length < policy.domains.minLabels || !labels.every((l) => labelPattern.test(l))) return invalid(field);
    if (!out.includes(host)) out.push(host);
  }
  return out.length ? out : undefined;
}

function validDate(value: unknown, field: string): string | undefined {
  if (value === undefined) return undefined;
  const m = typeof value === "string" ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(value) : null;
  if (!m) return invalid(field);
  const y = +m![1]!, mo = +m![2]!, d = +m![3]!;
  const dim = [31, y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][mo - 1];
  if (y < 1 || dim === undefined || d < 1 || d > dim) return invalid(field);
  return value as string;
}

function oneOf<T extends string>(value: unknown, field: string, allowed: readonly T[]): T | undefined {
  if (value === undefined) return undefined;
  if (!allowed.includes(value as T)) return invalid(field);
  return value as T;
}

export interface NormalizedSearch {
  query: string;
  maxResults: number;
  includeDomains?: string[];
  excludeDomains?: string[];
  recency?: string;
  startDate?: string;
  endDate?: string;
  country?: string;
  language?: string;
  depth?: string;
}

const CALL_KEYS = ["provider", "fallback", "timeoutMs", "attemptTimeoutMs", "maxRetries", "maxResponseBytes", "signal", "providerOptions"];
const SEARCH_KEYS = [...CALL_KEYS, "maxResults", "includeDomains", "excludeDomains", "recency", "startDate", "endDate", "country", "language", "depth"];

/** Unknown option names are rejected rather than ignored. */
export function checkOptionKeys(kind: "search" | "contents", o: Record<string, unknown>): void {
  const allowed = kind === "search" ? SEARCH_KEYS : CALL_KEYS;
  for (const k of Object.keys(o)) if (o[k] !== undefined && !allowed.includes(k)) invalid(k);
}

export function normalizeSearch(query: unknown, o: Record<string, unknown>): NormalizedSearch {
  checkOptionKeys("search", o);
  const n: NormalizedSearch = { query: normalizeQuery(query), maxResults: policy.search.maxResults.default };
  if (o.maxResults !== undefined) n.maxResults = integerIn(o.maxResults, "maxResults", policy.search.maxResults.min, policy.search.maxResults.max);
  const inc = normalizeDomains(o.includeDomains, "includeDomains");
  const exc = normalizeDomains(o.excludeDomains, "excludeDomains");
  if (inc && exc && inc.some((d) => exc.includes(d))) invalid("excludeDomains");
  if (inc) n.includeDomains = inc;
  if (exc) n.excludeDomains = exc;
  const recency = oneOf(o.recency, "recency", Object.keys(policy.search.recencyDays));
  const start = validDate(o.startDate, "startDate");
  const end = validDate(o.endDate, "endDate");
  if (recency && (start || end)) invalid("recency");
  if (start && end && start > end) invalid("endDate");
  if (recency) n.recency = recency;
  if (start) n.startDate = start;
  if (end) n.endDate = end;
  if (o.country !== undefined) {
    if (typeof o.country !== "string" || !/^[A-Za-z]{2}$/.test(o.country)) invalid("country");
    n.country = (o.country as string).toUpperCase();
  }
  if (o.language !== undefined) {
    if (typeof o.language !== "string" || !/^[A-Za-z]{2}$/.test(o.language)) invalid("language");
    n.language = (o.language as string).toLowerCase();
  }
  const depth = oneOf(o.depth, "depth", ["fast", "standard", "deep"]);
  if (depth) n.depth = depth;
  return n;
}

/** Comparison key for URLs: lowercase scheme and host, drop default port, empty path becomes "/". */
export function urlKey(url: string): string {
  const m = /^([A-Za-z][A-Za-z0-9+.-]*):\/\/([^/?#]*)(.*)$/s.exec(url);
  if (!m) return url;
  const scheme = m[1]!.toLowerCase();
  let host = m[2]!.toLowerCase();
  if ((scheme === "http" && host.endsWith(":80")) || (scheme === "https" && host.endsWith(":443"))) host = host.slice(0, host.lastIndexOf(":"));
  const rest = m[3]!;
  return `${scheme}://${host}${rest === "" || rest[0] === "?" || rest[0] === "#" ? "/" + rest : rest}`;
}

export function normalizeUrls(urls: unknown): string[] {
  const list = typeof urls === "string" ? [urls] : urls;
  if (!Array.isArray(list) || list.length < 1 || list.length > policy.contents.maxUrls) return invalid("urls");
  const keys = new Set<string>();
  for (const u of list as unknown[]) {
    if (typeof u !== "string" || u.length > policy.contents.maxUrlLength) return invalid("urls");
    for (const ch of u) {
      const cp = ch.codePointAt(0)!;
      if (cp <= 0x20 || cp === 0x7f || isBlank(cp) || inRanges(cp, forbiddenRanges) || isSurrogate(cp)) return invalid("urls");
    }
    const m = /^https?:\/\/([^/?#]+)/i.exec(u);
    if (!m || m[1]!.includes("@")) return invalid("urls");
    const key = urlKey(u);
    if (keys.has(key)) return invalid("urls");
    keys.add(key);
  }
  return [...(list as string[])];
}

export interface CallSettings { timeoutMs: number; attemptTimeoutMs: number; maxRetries: number; maxResponseBytes: number }

export function callSettings(kind: "search" | "contents", o: Record<string, unknown>, c: Record<string, unknown>): CallSettings {
  const pick = (k: string) => (o[k] !== undefined ? o[k] : c[k]);
  const t = policy.timeouts, b = policy.responseBytes;
  const timeoutMs = pick("timeoutMs") === undefined ? t.defaultMs : integerIn(pick("timeoutMs"), "timeoutMs", t.minMs, t.maxMs);
  const attemptTimeoutMs = pick("attemptTimeoutMs") === undefined ? timeoutMs : integerIn(pick("attemptTimeoutMs"), "attemptTimeoutMs", t.minMs, t.maxMs);
  const maxRetries = pick("maxRetries") === undefined ? policy.retry.defaultMaxRetries : integerIn(pick("maxRetries"), "maxRetries", 0, policy.retry.maxRetries);
  const maxResponseBytes = pick("maxResponseBytes") === undefined ? b[kind] : integerIn(pick("maxResponseBytes"), "maxResponseBytes", b.min, b.max);
  return { timeoutMs, attemptTimeoutMs, maxRetries, maxResponseBytes };
}

export function providerChain(o: Record<string, unknown>, c: Record<string, unknown>): ProviderId[] {
  const primary = o.provider ?? c.provider;
  if (primary === undefined) return configuration("provider");
  if (!isProviderId(primary)) return configuration("provider");
  const fallback = o.fallback ?? c.fallback ?? [];
  if (!Array.isArray(fallback) || !fallback.every(isProviderId)) return configuration("fallback");
  return [...new Set([primary as ProviderId, ...(fallback as ProviderId[])])]; // a provider is tried once
}

/** Maps an HTTP status to an error code, provider rules first. */
export function statusCode(provider: ProviderId, status: number, body: unknown): ErrorCode {
  const getPath = (v: unknown, path: string) => path.split(".").reduce<unknown>((o, k) => (o !== null && typeof o === "object" ? (o as Record<string, unknown>)[k] : undefined), v);
  for (const r of providers[provider].errors) {
    if (r.status === status && (r.bodyPath === undefined || getPath(body, r.bodyPath) === r.equals)) return r.code as ErrorCode;
  }
  for (const r of policy.status) {
    if ("status" in r ? r.status === status : status >= r.range[0] && status <= r.range[1]) return r.code as ErrorCode;
  }
  return policy.statusDefault as ErrorCode;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** Retry-After as delta-seconds or IMF-fixdate. Duplicate or malformed values are ignored (null). */
export function retryAfterMs(header: string | null, now: number): number | null {
  if (header === null) return null;
  const v = header.trim();
  if (/^\d{1,9}$/.test(v)) return Number(v) * 1000;
  const m = /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun), (\d{2}) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) (\d{4}) (\d{2}):(\d{2}):(\d{2}) GMT$/.exec(v);
  if (!m) return null;
  const t = Date.UTC(+m[4]!, MONTHS.indexOf(m[3]!), +m[2]!, +m[5]!, +m[6]!, +m[7]!);
  return Number.isNaN(t) ? null : Math.max(0, t - now);
}

/** Equal-jitter exponential backoff; never shorter than Retry-After. */
export function backoffMs(retryIndex: number, random: number, retryAfter: number | null): number {
  const exp = Math.min(policy.retry.maxDelayMs, policy.retry.baseDelayMs * 2 ** retryIndex);
  const delay = Math.floor(exp / 2 + random * (exp / 2));
  return Math.max(delay, retryAfter ?? 0);
}

export const isTransient = (code: ErrorCode) => (policy.transient as readonly string[]).includes(code);
export const fallsBack = (code: ErrorCode) => (policy.fallbackOn as readonly string[]).includes(code);
export const maxRetryAfterMs = policy.retry.maxRetryAfterMs;
