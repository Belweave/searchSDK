// Shared policy: input validation, status mapping, retry timing and fallback
// eligibility. Every constant comes from registry/policy.json.
import { SearchError } from "./errors.ts";
import { policy } from "./generated/registry.ts";
import { getPath, jsonEqual } from "./json.ts";
import type { Registry } from "./registry.ts";
import { calendarDate, isBlank } from "./steps.ts";
import type { ErrorCode, ProviderId } from "./types.ts";

const ranges = (list: readonly (readonly string[])[]) => list.map(([a, b]) => [parseInt(a!, 16), parseInt(b!, 16)] as const);
const forbiddenRanges = ranges(policy.query.forbidden);
const inRanges = (cp: number, rs: readonly (readonly [number, number])[]) => rs.some(([a, b]) => cp >= a && cp <= b);
const isSurrogate = (cp: number) => cp >= 0xd800 && cp <= 0xdfff;

const invalid = (field: string): never => { throw new SearchError("invalid_request", { field }); };
const configuration = (field: string): never => { throw new SearchError("configuration", { field }); };

export const isProviderId = (registry: Registry, id: unknown): id is ProviderId =>
  typeof id === "string" && Object.prototype.hasOwnProperty.call(registry, id);

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
  if (!calendarDate(value)) return invalid(field);
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

const hex = (b: number) => "%" + b.toString(16).toUpperCase().padStart(2, "0");
const isUnreserved = (b: number) => (b >= 0x41 && b <= 0x5a) || (b >= 0x61 && b <= 0x7a) || (b >= 0x30 && b <= 0x39) || b === 0x2d || b === 0x2e || b === 0x5f || b === 0x7e;

/** Percent-encoding normal form: unreserved escapes decoded, other escapes upper-case, non-ASCII as UTF-8 escapes. */
function normalizeEscapes(s: string): string {
  let out = "";
  for (let i = 0; i < s.length;) {
    const m = /^%([0-9A-Fa-f]{2})/.exec(s.slice(i, i + 3));
    if (m) {
      const b = parseInt(m[1]!, 16);
      out += isUnreserved(b) ? String.fromCharCode(b) : hex(b);
      i += 3;
      continue;
    }
    const cp = s.codePointAt(i)!;
    const ch = String.fromCodePoint(cp);
    if (cp < 0x80) out += ch;
    else for (const b of new TextEncoder().encode(ch)) out += hex(b); // a lone surrogate encodes as U+FFFD
    i += ch.length;
  }
  return out;
}

/** RFC 3492 Punycode for one label (without the xn-- prefix). */
function punycode(label: string): string {
  const cps = Array.from(label, (c) => c.codePointAt(0)!);
  const base = 36, tMin = 1, tMax = 26, skew = 38, damp = 700;
  const digit = (d: number) => String.fromCharCode(d < 26 ? 97 + d : 22 + d);
  const adapt = (delta: number, points: number, first: boolean) => {
    delta = first ? Math.floor(delta / damp) : delta >> 1;
    delta += Math.floor(delta / points);
    let k = 0;
    for (; delta > ((base - tMin) * tMax) >> 1; k += base) delta = Math.floor(delta / (base - tMin));
    return k + Math.floor(((base - tMin + 1) * delta) / (delta + skew));
  };
  let out = cps.filter((c) => c < 0x80).map((c) => String.fromCharCode(c)).join("");
  const b = out.length;
  let h = b;
  if (b > 0) out += "-";
  let n = 128, delta = 0, bias = 72;
  while (h < cps.length) {
    const m = Math.min(...cps.filter((c) => c >= n));
    delta += (m - n) * (h + 1);
    n = m;
    for (const c of cps) {
      if (c < n) delta++;
      if (c === n) {
        let q = delta;
        for (let k = base; ; k += base) {
          const t = k <= bias ? tMin : k >= bias + tMax ? tMax : k - bias;
          if (q < t) break;
          out += digit(t + ((q - t) % (base - t)));
          q = Math.floor((q - t) / (base - t));
        }
        out += digit(q);
        bias = adapt(delta, h + 1, h === b);
        delta = 0;
        h++;
      }
    }
    delta++;
    n++;
  }
  return out;
}

/**
 * Comparison key for URLs (registry/policy.md, URL key): lowercase scheme and
 * host, punycode for non-ASCII host labels, no default port, percent-encoding
 * in normal form, no fragment, an empty path as "/", and one trailing slash
 * dropped from any longer path.
 */
export function urlKey(url: string): string {
  const m = /^([A-Za-z][A-Za-z0-9+.-]*):\/\/([^/?#]*)([^#]*)/s.exec(url);
  if (!m) return url;
  const scheme = m[1]!.toLowerCase();
  let authority = m[2]!;
  const port = /:(\d+)$/.exec(authority);
  let portPart = "";
  if (port) {
    authority = authority.slice(0, port.index);
    if (!((scheme === "http" && port[1] === "80") || (scheme === "https" && port[1] === "443"))) portPart = port[0];
  }
  const host = authority.split(".").map((label) => {
    const lower = label.replace(/[A-Z]+/g, (x) => x.toLowerCase());
    return /[^\x00-\x7f]/.test(lower) ? "xn--" + punycode(lower.toLowerCase()) : lower;
  }).join(".");
  const rest = normalizeEscapes(m[3]!);
  const q = rest.indexOf("?");
  let path = q < 0 ? rest : rest.slice(0, q);
  const query = q < 0 ? "" : rest.slice(q);
  if (path === "") path = "/";
  else if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);
  return `${scheme}://${host}${portPart}${path}${query}`;
}

export function normalizeUrls(urls: unknown): string[] {
  const list = typeof urls === "string" ? [urls] : urls;
  if (!Array.isArray(list) || list.length < 1 || list.length > policy.contents.maxUrls) return invalid("urls");
  const keys = new Set<string>();
  for (const u of list as unknown[]) {
    if (typeof u !== "string" || [...u].length > policy.contents.maxUrlLength) return invalid("urls"); // code points, not UTF-16 units
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

export interface CallSettings { timeoutMs: number; attemptTimeoutMs: number; maxRetries: number; maxResponseBytes: number; signal: AbortSignal | undefined }

/** An AbortSignal, or anything shaped like one (other realms, polyfills). */
function isSignal(s: unknown): boolean {
  if (s === null || typeof s !== "object") return false;
  const o = s as Record<string, unknown>;
  return typeof o.aborted === "boolean" && typeof o.addEventListener === "function" && typeof o.removeEventListener === "function";
}

export function callSettings(kind: "search" | "contents", o: Record<string, unknown>, c: Record<string, unknown>): CallSettings {
  const pick = (k: string) => (o[k] !== undefined ? o[k] : c[k]);
  const t = policy.timeouts, b = policy.responseBytes;
  const timeoutMs = pick("timeoutMs") === undefined ? t.defaultMs : integerIn(pick("timeoutMs"), "timeoutMs", t.minMs, t.maxMs);
  const attemptTimeoutMs = pick("attemptTimeoutMs") === undefined ? timeoutMs : integerIn(pick("attemptTimeoutMs"), "attemptTimeoutMs", t.minMs, t.maxMs);
  const maxRetries = pick("maxRetries") === undefined ? policy.retry.defaultMaxRetries : integerIn(pick("maxRetries"), "maxRetries", 0, policy.retry.maxRetries);
  const maxResponseBytes = pick("maxResponseBytes") === undefined ? b[kind] : integerIn(pick("maxResponseBytes"), "maxResponseBytes", b.min, b.max);
  const signal = o.signal;
  if (signal !== undefined && !isSignal(signal)) invalid("signal");
  return { timeoutMs, attemptTimeoutMs, maxRetries, maxResponseBytes, signal: signal as AbortSignal | undefined };
}

/**
 * Checks client-level settings when the client is created, in policy order:
 * call settings, then provider, then fallback. Both are optional here; a call
 * may still name its own provider.
 */
export function checkClientConfig(registry: Registry, c: Record<string, unknown>): void {
  callSettings("search", {}, c);
  if (c.provider !== undefined && !isProviderId(registry, c.provider)) configuration("provider");
  if (c.fallback !== undefined && (!Array.isArray(c.fallback) || !c.fallback.every((id) => isProviderId(registry, id)))) configuration("fallback");
  if (c.diagnostics !== undefined && typeof c.diagnostics !== "function") configuration("diagnostics");
}

export function providerChain(registry: Registry, o: Record<string, unknown>, c: Record<string, unknown>): ProviderId[] {
  const primary = o.provider ?? c.provider;
  if (primary === undefined) return configuration("provider");
  if (!isProviderId(registry, primary)) return configuration("provider");
  const fallback = o.fallback ?? c.fallback ?? [];
  if (!Array.isArray(fallback) || !fallback.every((id) => isProviderId(registry, id))) return configuration("fallback");
  return [...new Set([primary as ProviderId, ...(fallback as ProviderId[])])]; // a provider is tried once
}

/** Maps an HTTP status to an error code, provider rules first. bodyPath rules compare with JSON equality. */
export function statusCode(registry: Registry, provider: ProviderId, status: number, body: unknown): ErrorCode {
  for (const r of registry[provider]!.errors) {
    if (r.status !== status) continue;
    if (r.bodyPath === undefined) return r.code as ErrorCode;
    const v = getPath(body, r.bodyPath);
    if (v !== undefined && jsonEqual(v, r.equals)) return r.code as ErrorCode;
  }
  for (const r of policy.status) {
    if ("status" in r ? r.status === status : status >= r.range[0] && status <= r.range[1]) return r.code as ErrorCode;
  }
  return policy.statusDefault as ErrorCode;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** Retry-After as delta-seconds or an IMF-fixdate naming a real date and time. Duplicate or malformed values are ignored (null). */
export function retryAfterMs(header: string | null, now: number): number | null {
  if (header === null) return null;
  const v = header.replace(/^[ \t]+|[ \t]+$/g, ""); // HTTP whitespace only; String.prototype.trim also removes U+00A0
  if (/^\d{1,9}$/.test(v)) return Number(v) * 1000;
  const m = /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun), (\d{2}) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) (\d{4}) (\d{2}):(\d{2}):(\d{2}) GMT$/.exec(v);
  if (!m) return null;
  const [y, mo, d, h, mi, s] = [+m[4]!, MONTHS.indexOf(m[3]!) + 1, +m[2]!, +m[5]!, +m[6]!, +m[7]!];
  if (!calendarDate(`${m[4]}-${String(mo).padStart(2, "0")}-${m[2]}`) || h > 23 || mi > 59 || s > 59) return null; // Date.UTC would roll 31 Feb over to March
  return Math.max(0, Date.UTC(y, mo - 1, d, h, mi, s) - now);
}

/** Equal-jitter exponential backoff; never shorter than Retry-After. */
export function backoffMs(retryIndex: number, random: number, retryAfter: number | null): number {
  const exp = Math.min(policy.retry.maxDelayMs, policy.retry.baseDelayMs * 2 ** retryIndex);
  const delay = Math.floor(exp / 2 + random * (exp / 2));
  return Math.max(delay, retryAfter ?? 0);
}

/**
 * JSON that survives the trip: no unpaired surrogate (it cannot be sent as UTF-8) and no NaN or
 * Infinity (JSON.stringify would silently send null). Arrays and objects are checked deeply, keys included.
 */
export function wellFormed(v: unknown): boolean {
  if (typeof v === "number") return Number.isFinite(v);
  if (typeof v === "string") return !/[\uD800-\uDFFF]/u.test(v);
  if (Array.isArray(v)) return v.every(wellFormed);
  if (v !== null && typeof v === "object") return Object.entries(v).every(([k, x]) => wellFormed(k) && wellFormed(x));
  return true;
}

export const isTransient = (code: ErrorCode) => (policy.transient as readonly string[]).includes(code);
export const fallsBack = (code: ErrorCode) => (policy.fallbackOn as readonly string[]).includes(code);
export const maxRetryAfterMs = policy.retry.maxRetryAfterMs;
