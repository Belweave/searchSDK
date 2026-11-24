// The harness's own page fetcher for the known-answer page check: a plain
// HTTP GET and text extraction, written here so no ranked provider fetches
// pages for its rivals. It costs nothing. It obeys robots.txt (RFC 9309),
// sends a generic identifying user agent with no contact details, follows a
// bounded number of redirects (each hop checked again), and stops at a byte
// and time limit. A page it cannot read is "unreadable" for every provider
// alike; the reason is recorded so the unreadable rate can be published.

export interface FetcherOptions {
  /** The fetch to use: globalThis.fetch live, a local fixture in tests. */
  fetch: typeof fetch;
  /** Sent as User-Agent. Generic and identifying; no personal or project contact details. */
  userAgent: string;
  /** The product token robots.txt groups are matched against. */
  robotsToken: string;
  /** Whole-page deadline, redirects and body included. */
  timeoutMs: number;
  /** Bytes of body read per page; the rest is not read. */
  maxBytes: number;
  maxRedirects: number;
  /** Largest Crawl-delay honoured, in ms; a longer one makes the host unreadable. */
  maxCrawlDelayMs: number;
}

export type UnreadableReason =
  | "blocked-url" | "robots" | "status" | "redirects" | "content-type" | "timeout" | "network" | "empty" | "aborted";

export type FetchedPage =
  | { status: "ok"; url: string; finalUrl: string; httpStatus: number; title: string | null; text: string; truncated: boolean }
  | { status: "unreadable"; url: string; reason: UnreadableReason; httpStatus?: number; detail?: string };

/** Parsed robots.txt rules for one origin, already narrowed to the groups that apply to us. */
export interface RobotsRules {
  /** "allow-all" when robots.txt is absent (4xx), "disallow-all" when it is unreachable (5xx, network, timeout). */
  mode: "rules" | "allow-all" | "disallow-all";
  rules: { allow: boolean; pattern: string }[];
  crawlDelayMs: number | null;
}

const TEXT_TYPES = new Set(["text/html", "application/xhtml+xml", "text/plain"]);
const ROBOTS_MAX_BYTES = 500 * 1024; // RFC 9309 2.5: parse at least 500 KiB

class Unreadable extends Error {
  readonly reason: UnreadableReason;
  readonly httpStatus: number | undefined;
  readonly detail: string | undefined;
  constructor(reason: UnreadableReason, httpStatus?: number, detail?: string) {
    super(reason);
    this.reason = reason;
    this.httpStatus = httpStatus;
    this.detail = detail;
  }
}

// ---- URL checks ----

/** Hosts the fetcher never contacts: loopback, private, link-local and unspecified addresses, and bare names. */
export function blockedHost(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (h === "localhost" || h.endsWith(".localhost") || !h.includes(".") && !h.includes(":")) return true;
  const v4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(h);
  if (v4) {
    const [a, b] = [Number(v4[1]), Number(v4[2])];
    return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
  }
  if (h.includes(":")) return h === "::" || h === "::1" || /^f[cd]/.test(h) || /^fe[89ab]/.test(h) || h.startsWith("::ffff:");
  return false;
}

function checkUrl(raw: string): URL {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    throw new Unreadable("blocked-url", undefined, "not a URL");
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") throw new Unreadable("blocked-url", undefined, "not http or https");
  if (u.username || u.password) throw new Unreadable("blocked-url", undefined, "credentials in URL");
  if (blockedHost(u.hostname)) throw new Unreadable("blocked-url", undefined, "local or private host");
  u.hash = "";
  return u;
}

// ---- robots.txt (RFC 9309) ----

/** Percent-encodes what a URL path would encode, so patterns and paths compare as octets. */
function normalizePath(s: string): string {
  return s.replace(/%[0-9a-fA-F]{2}/g, (m) => m.toUpperCase()).replace(/[^\x21-\x7e]/gu, (c) => encodeURIComponent(c));
}

/** The groups for `token` (case-insensitive product token match), else the `*` groups, merged. */
export function parseRobots(text: string, token: string): RobotsRules {
  type Group = { agents: string[]; rules: { allow: boolean; pattern: string }[]; delay: number | null };
  const groups: Group[] = [];
  let current: Group | null = null;
  let lastWasAgent = false;
  for (const rawLine of text.split(/\r\n|\r|\n/)) {
    const line = rawLine.replace(/#.*$/, "").trim();
    const m = /^([A-Za-z-]+)\s*:\s*(.*)$/.exec(line);
    if (!m) continue;
    const key = m[1]!.toLowerCase();
    const value = m[2]!.trim();
    if (key === "user-agent") {
      if (!lastWasAgent || !current) groups.push((current = { agents: [], rules: [], delay: null }));
      current.agents.push(value.split(/[/\s]/)[0]!.toLowerCase());
      lastWasAgent = true;
      continue;
    }
    lastWasAgent = false;
    if (!current) continue;
    if (key === "allow" || key === "disallow") {
      if (value === "") continue; // an empty rule matches nothing
      current.rules.push({ allow: key === "allow", pattern: normalizePath(value) });
    } else if (key === "crawl-delay") {
      const s = Number(value);
      if (Number.isFinite(s) && s >= 0) current.delay = Math.max(current.delay ?? 0, s * 1000);
    }
  }
  const own = groups.filter((g) => g.agents.includes(token.toLowerCase()));
  const use = own.length ? own : groups.filter((g) => g.agents.includes("*"));
  const delays = use.map((g) => g.delay).filter((d): d is number => d !== null);
  return { mode: "rules", rules: use.flatMap((g) => g.rules), crawlDelayMs: delays.length ? Math.max(...delays) : null };
}

/** Whether a robots pattern (with `*` and a trailing `$`) matches the start of a path. */
function patternMatches(pattern: string, path: string): boolean {
  const anchored = pattern.endsWith("$");
  const parts = (anchored ? pattern.slice(0, -1) : pattern).split("*");
  if (!path.startsWith(parts[0]!)) return false;
  let at = parts[0]!.length;
  for (let i = 1; i < parts.length; i++) {
    const part = parts[i]!;
    if (i === parts.length - 1 && anchored) return path.length - part.length >= at && path.endsWith(part);
    const found = path.indexOf(part, at);
    if (found < 0) return false;
    at = found + part.length;
  }
  return !anchored || at === path.length;
}

/** RFC 9309 2.2.2: the longest matching rule wins; on a tie, allow wins. /robots.txt is always allowed. */
export function robotsAllows(rules: RobotsRules, pathAndQuery: string): boolean {
  if (rules.mode === "allow-all") return true;
  if (rules.mode === "disallow-all") return false;
  const path = normalizePath(pathAndQuery);
  if (path === "/robots.txt") return true;
  let best: { allow: boolean; length: number } | null = null;
  for (const r of rules.rules) {
    if (!patternMatches(r.pattern, path)) continue;
    const length = r.pattern.length;
    if (!best || length > best.length || (length === best.length && r.allow)) best = { allow: r.allow, length };
  }
  return best ? best.allow : true;
}

// ---- Text extraction ----

const LATIN1 = "nbsp iexcl cent pound curren yen brvbar sect uml copy ordf laquo not shy reg macr deg plusmn sup2 sup3 acute micro para middot cedil sup1 ordm raquo frac14 frac12 frac34 iquest Agrave Aacute Acirc Atilde Auml Aring AElig Ccedil Egrave Eacute Ecirc Euml Igrave Iacute Icirc Iuml ETH Ntilde Ograve Oacute Ocirc Otilde Ouml times Oslash Ugrave Uacute Ucirc Uuml Yacute THORN szlig agrave aacute acirc atilde auml aring aelig ccedil egrave eacute ecirc euml igrave iacute icirc iuml eth ntilde ograve oacute ocirc otilde ouml divide oslash ugrave uacute ucirc uuml yacute thorn yuml".split(" ");
const ENTITIES: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'",
  ndash: "–", mdash: "—", hellip: "…", lsquo: "‘", rsquo: "’", sbquo: "‚", ldquo: "“", rdquo: "”", bdquo: "„",
  bull: "•", euro: "€", trade: "™", ensp: " ", emsp: " ", thinsp: " ", zwnj: "‌", zwj: "‍", minus: "−",
  ...Object.fromEntries(LATIN1.map((n, i) => [n, String.fromCodePoint(160 + i)])),
};

export function decodeEntities(s: string): string {
  return s.replace(/&(#[xX][0-9a-fA-F]{1,8}|#[0-9]{1,8}|[A-Za-z][A-Za-z0-9]{1,31});?/g, (m, body: string) => {
    if (body[0] === "#") {
      const cp = body[1] === "x" || body[1] === "X" ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
      return cp > 0 && cp <= 0x10ffff && !(cp >= 0xd800 && cp <= 0xdfff) ? String.fromCodePoint(cp) : "�";
    }
    return Object.prototype.hasOwnProperty.call(ENTITIES, body) ? ENTITIES[body]! : m;
  });
}

// Not "head": its end tag is optional. The title is returned on its own.
const SKIP = ["title", "script", "style", "noscript", "template", "svg", "math", "iframe", "object", "canvas", "select", "textarea"];
const BLOCK = /^(p|div|br|li|ul|ol|h[1-6]|tr|table|thead|tbody|section|article|header|footer|nav|aside|main|blockquote|pre|dd|dt|dl|figure|figcaption|hr|form|fieldset|address|details|summary|caption)$/;

/** Visible text of an HTML document: no scripts, styles or markup; block boundaries become line breaks. */
export function htmlToText(html: string): { title: string | null; text: string } {
  const titleMatch = /<title\b[^>]*>([\s\S]*?)<\/title\s*>/i.exec(html.slice(0, 200_000));
  const title = titleMatch ? decodeEntities(titleMatch[1]!).replace(/\s+/g, " ").trim() || null : null;
  let out = "";
  let i = 0;
  const lower = html.toLowerCase();
  while (i < html.length) {
    const lt = html.indexOf("<", i);
    if (lt < 0) { out += html.slice(i); break; }
    out += html.slice(i, lt);
    if (lower.startsWith("<!--", lt)) {
      const end = html.indexOf("-->", lt + 4);
      i = end < 0 ? html.length : end + 3;
      continue;
    }
    const tag = /^<\/?([a-zA-Z][a-zA-Z0-9-]*)\b/.exec(html.slice(lt, lt + 40));
    if (!tag) {
      if (/^<[!?]/.test(html.slice(lt, lt + 2))) {
        const end = html.indexOf(">", lt);
        i = end < 0 ? html.length : end + 1;
      } else { out += "<"; i = lt + 1; }
      continue;
    }
    const end = html.indexOf(">", lt);
    if (end < 0) break;
    const name = tag[1]!.toLowerCase();
    const closing = html[lt + 1] === "/";
    i = end + 1;
    if (!closing && SKIP.includes(name) && html[end - 1] !== "/") {
      const close = lower.indexOf(`</${name}`, i);
      i = close < 0 ? html.length : (html.indexOf(">", close) + 1 || html.length);
      out += " ";
      continue;
    }
    out += BLOCK.test(name) ? "\n" : name === "td" || name === "th" ? " " : "";
  }
  const text = decodeEntities(out)
    .split("\n")
    .map((l) => l.replace(/[\t\f\v  ]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return { title, text };
}

// ---- Bodies and charsets ----

function charsetOf(contentType: string | null, head: Uint8Array): string {
  const fromHeader = contentType && /charset\s*=\s*"?([\w.:-]+)/i.exec(contentType)?.[1];
  if (fromHeader) return fromHeader;
  if (head[0] === 0xef && head[1] === 0xbb && head[2] === 0xbf) return "utf-8";
  if (head[0] === 0xfe && head[1] === 0xff) return "utf-16be";
  if (head[0] === 0xff && head[1] === 0xfe) return "utf-16le";
  const sniff = new TextDecoder("latin1").decode(head.subarray(0, 4096));
  return /<meta[^>]+charset\s*=\s*["']?\s*([\w.:-]+)/i.exec(sniff)?.[1] ?? "utf-8";
}

function decode(bytes: Uint8Array, charset: string): string {
  try {
    return new TextDecoder(charset).decode(bytes);
  } catch {
    return new TextDecoder("utf-8").decode(bytes);
  }
}

/** Reads at most `max` bytes of a body, then cancels the rest. */
async function readCapped(res: Response, max: number): Promise<{ bytes: Uint8Array; truncated: boolean }> {
  if (!res.body) return { bytes: new Uint8Array(), truncated: false };
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  let truncated = false;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (size + value.byteLength > max) {
      chunks.push(value.subarray(0, max - size));
      size = max;
      truncated = true;
      await reader.cancel().catch(() => {});
      break;
    }
    chunks.push(value);
    size += value.byteLength;
  }
  const bytes = new Uint8Array(size);
  let at = 0;
  for (const c of chunks) { bytes.set(c, at); at += c.byteLength; }
  return { bytes, truncated };
}

// ---- The fetcher ----

export class PlainFetcher {
  private readonly o: FetcherOptions;
  private readonly robots = new Map<string, Promise<RobotsRules>>();

  constructor(o: FetcherOptions) {
    this.o = o;
  }

  private get(url: URL, signal: AbortSignal): Promise<Response> {
    return this.o.fetch(url.href, {
      method: "GET",
      redirect: "manual",
      signal,
      headers: { "user-agent": this.o.userAgent, accept: "text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.1" },
    });
  }

  /** The robots rules for an origin, fetched once per run under their own deadline, so one slow page cannot decide them. */
  rulesFor(origin: string): Promise<RobotsRules> {
    let p = this.robots.get(origin);
    if (!p) {
      p = this.loadRobots(origin, AbortSignal.timeout(this.o.timeoutMs));
      this.robots.set(origin, p);
    }
    return p;
  }

  private async loadRobots(origin: string, signal: AbortSignal): Promise<RobotsRules> {
    const disallow: RobotsRules = { mode: "disallow-all", rules: [], crawlDelayMs: null };
    let url = new URL("/robots.txt", origin);
    try {
      for (let hop = 0; hop <= 5; hop++) {
        const res = await this.get(url, signal);
        if (res.status >= 300 && res.status < 400) {
          await res.body?.cancel().catch(() => {});
          const loc = res.headers.get("location");
          if (!loc) return disallow;
          url = checkUrl(new URL(loc, url).href);
          continue;
        }
        if (res.status === 429 || res.status >= 500) { await res.body?.cancel().catch(() => {}); return disallow; }
        if (res.status >= 400) { await res.body?.cancel().catch(() => {}); return { mode: "allow-all", rules: [], crawlDelayMs: null }; }
        const { bytes } = await readCapped(res, ROBOTS_MAX_BYTES);
        return parseRobots(new TextDecoder("utf-8").decode(bytes), this.o.robotsToken);
      }
      return disallow;
    } catch {
      // Unreachable robots.txt: assume complete disallow (RFC 9309 2.3.1.4).
      return disallow;
    }
  }

  /** Crawl-delay for a URL's origin once its robots.txt has been read, or 0. */
  async crawlDelayMs(url: string): Promise<number> {
    try {
      const u = checkUrl(url);
      const rules = await this.rulesFor(u.origin);
      return rules.crawlDelayMs ?? 0;
    } catch {
      return 0;
    }
  }

  async fetchPage(url: string, outer?: AbortSignal): Promise<FetchedPage> {
    const deadline = AbortSignal.timeout(this.o.timeoutMs);
    const signal = outer ? AbortSignal.any([outer, deadline]) : deadline;
    try {
      let target = checkUrl(url);
      for (let hop = 0; ; hop++) {
        const rules = await this.rulesFor(target.origin);
        if (!robotsAllows(rules, target.pathname + target.search)) throw new Unreadable("robots", undefined, rules.mode);
        if ((rules.crawlDelayMs ?? 0) > this.o.maxCrawlDelayMs) throw new Unreadable("robots", undefined, "crawl-delay too long");
        const res = await this.get(target, signal);
        if (res.status >= 300 && res.status < 400) {
          await res.body?.cancel().catch(() => {});
          const loc = res.headers.get("location");
          if (!loc) throw new Unreadable("status", res.status, "redirect without location");
          if (hop >= this.o.maxRedirects) throw new Unreadable("redirects", res.status);
          target = checkUrl(new URL(loc, target).href);
          continue;
        }
        if (res.status < 200 || res.status >= 300) {
          await res.body?.cancel().catch(() => {});
          throw new Unreadable("status", res.status);
        }
        const contentType = res.headers.get("content-type");
        const mime = (contentType ?? "text/html").split(";")[0]!.trim().toLowerCase();
        if (!TEXT_TYPES.has(mime)) {
          await res.body?.cancel().catch(() => {});
          throw new Unreadable("content-type", res.status, mime);
        }
        const { bytes, truncated } = await readCapped(res, this.o.maxBytes);
        const body = decode(bytes, charsetOf(contentType, bytes));
        const { title, text } = mime === "text/plain" ? { title: null, text: body.trim() } : htmlToText(body);
        if (!/[\p{L}\p{N}]/u.test(text)) throw new Unreadable("empty", res.status);
        return { status: "ok", url, finalUrl: target.href, httpStatus: res.status, title, text, truncated };
      }
    } catch (e) {
      if (e instanceof Unreadable) return { status: "unreadable", url, reason: e.reason, ...(e.httpStatus !== undefined ? { httpStatus: e.httpStatus } : {}), ...(e.detail ? { detail: e.detail } : {}) };
      if (outer?.aborted) return { status: "unreadable", url, reason: "aborted" };
      if (deadline.aborted) return { status: "unreadable", url, reason: "timeout" };
      return { status: "unreadable", url, reason: "network", detail: e instanceof Error ? e.name : "error" };
    }
  }
}
