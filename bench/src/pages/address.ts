// Address checks and a pinned HTTP transport for the harness's own page
// fetcher. A host name is resolved before anything is sent; the name is
// refused when ANY of its addresses is loopback, private, link-local,
// metadata, multicast or otherwise reserved (IPv4 and IPv6, including IPv4
// embedded in IPv6). The transport then connects through the same check, so
// the socket only ever reaches an address that passed it: a name that
// re-resolves to a private address between check and connect (DNS
// rebinding) is refused at connect time too. Every redirect hop is a new
// request and goes through both checks again.
import dns from "node:dns";
import http from "node:http";
import https from "node:https";
import net from "node:net";
import { pipeline, Readable } from "node:stream";
import zlib from "node:zlib";

export type ResolvedAddress = { address: string; family: number };
export type Resolver = (hostname: string) => Promise<ResolvedAddress[]>;

/** The system resolver (getaddrinfo), every address, in the resolver's order. */
export const systemResolver: Resolver = (hostname) => dns.promises.lookup(hostname, { all: true, verbatim: true });

export class BlockedAddressError extends Error {
  constructor(host: string) {
    super(`${host} is or resolves to a local, private or reserved address`);
    this.name = "BlockedAddressError";
  }
}

export const isBlockedAddressError = (e: unknown): boolean => e instanceof BlockedAddressError || (e instanceof Error && e.name === "BlockedAddressError");

function v4Bytes(s: string): number[] | null {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(s);
  if (!m) return null;
  const b = m.slice(1).map(Number);
  return b.every((x) => x <= 255) ? b : null;
}

function v4Blocked([a, b, c]: number[]): boolean {
  return a === 0 || a === 10 || a === 127 || a! >= 224 // this network, private, loopback, multicast and reserved (incl. broadcast)
    || (a === 100 && b! >= 64 && b! <= 127) // carrier-grade NAT
    || (a === 169 && b === 254) // link-local, cloud metadata
    || (a === 172 && b! >= 16 && b! <= 31) || (a === 192 && b === 168) // private
    || (a === 192 && b === 0 && (c === 0 || c === 2)) || (a === 192 && b === 88 && c === 99) // IETF, TEST-NET-1, 6to4 relay
    || (a === 198 && (b === 18 || b === 19)) || (a === 198 && b === 51 && c === 100) || (a === 203 && b === 0 && c === 113); // benchmarking, TEST-NET-2/3
}

function v6Bytes(s: string): number[] | null {
  if (!net.isIPv6(s)) return null;
  let str = s;
  let tail: number[] | null = null;
  const dotted = /(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/.exec(str);
  if (dotted) {
    tail = v4Bytes(dotted[1]!);
    if (!tail) return null;
    str = `${str.slice(0, -dotted[1]!.length)}0:0`;
  }
  const halves = str.split("::");
  const groups = (x: string) => (x === "" ? [] : x.split(":").map((h) => parseInt(h, 16)));
  const head = groups(halves[0]!);
  const rest = halves.length === 2 ? groups(halves[1]!) : [];
  const all = [...head, ...Array(8 - head.length - rest.length).fill(0), ...rest];
  const bytes = all.flatMap((g) => [g >> 8, g & 255]);
  if (tail) bytes.splice(12, 4, ...tail);
  return bytes.length === 16 ? bytes : null;
}

function v6Blocked(b: number[]): boolean {
  const zero = (from: number, to: number) => b.slice(from, to).every((x) => x === 0);
  if (zero(0, 12)) return true; // ::, ::1 and the deprecated IPv4-compatible ::a.b.c.d
  if (zero(0, 10) && b[10] === 0xff && b[11] === 0xff) return v4Blocked(b.slice(12)); // IPv4-mapped ::ffff:a.b.c.d
  if (zero(0, 8) && b[8] === 0xff && b[9] === 0xff && zero(10, 12)) return v4Blocked(b.slice(12)); // IPv4-translated ::ffff:0:a.b.c.d
  if (b[0] === 0x00 && b[1] === 0x64 && b[2] === 0xff && b[3] === 0x9b) {
    if (zero(4, 12)) return v4Blocked(b.slice(12)); // NAT64 well-known prefix 64:ff9b::/96
    if (b[4] === 0x00 && b[5] === 0x01) return true; // local-use NAT64 64:ff9b:1::/48
  }
  if (b[0] === 0x20 && b[1] === 0x02) return v4Blocked(b.slice(2, 6)); // 6to4 2002:a.b.c.d::/48
  if (b[0] === 0x20 && b[1] === 0x01 && b[2] === 0x00 && b[3] === 0x00) return true; // Teredo 2001::/32 (embedded address obfuscated)
  if (b[0] === 0x20 && b[1] === 0x01 && b[2] === 0x0d && b[3] === 0xb8) return true; // documentation 2001:db8::/32
  if (b[0] === 0x01 && zero(1, 8)) return true; // discard-only 100::/64
  if ((b[0]! & 0xfe) === 0xfc) return true; // unique local fc00::/7 (incl. fd00:ec2::254 metadata)
  if (b[0] === 0xfe && (b[1]! & 0xc0) >= 0x80) return true; // link-local fe80::/10 and site-local fec0::/10
  return b[0] === 0xff; // multicast
}

/** True for any address the fetcher must not contact. Unparsable input counts as blocked. */
export function blockedAddress(address: string): boolean {
  const a = address.replace(/^\[|\]$/g, "").replace(/%.*$/, "");
  const v4 = v4Bytes(a);
  if (v4) return v4Blocked(v4);
  const v6 = v6Bytes(a);
  return v6 ? v6Blocked(v6) : true;
}

const LOCAL_SUFFIXES = [".localhost", ".local", ".internal", ".localdomain", ".home.arpa", ".lan", ".intranet"];

/**
 * A URL hostname (WHATWG-normalized, so 2130706433 and 0x7f.1 arrive as
 * 127.0.0.1) the fetcher refuses without resolving: an IP literal in a
 * blocked range, a local name, or a bare single-label name.
 */
export function blockedHost(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/^\[|\]$/g, "").replace(/\.$/, "");
  if (net.isIP(h.replace(/%.*$/, ""))) return blockedAddress(h);
  if (h === "localhost" || LOCAL_SUFFIXES.some((s) => h.endsWith(s))) return true;
  return !h.includes(".");
}

/** Resolves a host and returns its addresses, or throws BlockedAddressError when the host or any address is blocked. */
export async function resolvePublic(hostname: string, resolve: Resolver): Promise<ResolvedAddress[]> {
  const h = hostname.replace(/^\[|\]$/g, "");
  if (blockedHost(h)) throw new BlockedAddressError(h);
  const ip = net.isIP(h);
  if (ip) return [{ address: h, family: ip }];
  const list = await resolve(h);
  if (!list.length) throw Object.assign(new Error(`no address for ${h}`), { code: "ENOTFOUND" });
  if (list.some((a) => blockedAddress(a.address))) throw new BlockedAddressError(h);
  return list.map((a) => ({ address: a.address, family: a.family === 6 ? 6 : 4 }));
}

type LookupCallback = (err: Error | null, address?: string | ResolvedAddress[], family?: number) => void;

/** A node `lookup` for sockets: resolves, checks every address, and hands the socket only checked ones. */
export function checkedLookup(resolve: Resolver) {
  return (hostname: string, options: { all?: boolean; family?: number | string } | number, callback: LookupCallback): void => {
    const o = typeof options === "object" && options !== null ? options : { family: options };
    const fam = o.family === "IPv4" ? 4 : o.family === "IPv6" ? 6 : Number(o.family) || 0;
    resolvePublic(hostname, resolve).then((all) => {
      const list = fam === 4 || fam === 6 ? all.filter((a) => a.family === fam) : all;
      if (!list.length) return callback(Object.assign(new Error(`no IPv${fam} address for ${hostname}`), { code: "ENOTFOUND" }));
      if (o.all) callback(null, list);
      else callback(null, list[0]!.address, list[0]!.family);
    }, (e: Error) => callback(e));
  };
}

type RequestFn = (url: URL, options: http.RequestOptions, callback: (res: http.IncomingMessage) => void) => http.ClientRequest;

function plainHeaders(h: HeadersInit | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  new Headers(h ?? {}).forEach((v, k) => { out[k] = v; });
  return out;
}

const NULL_BODY = new Set([101, 204, 205, 304]);

/**
 * A fetch for plain GETs over node:http(s) whose sockets connect only to
 * addresses `checkedLookup` approved. Redirects are returned, not followed.
 * gzip, deflate and br bodies are decoded; the caller still caps the bytes it reads.
 */
export function pinnedFetch(o: { resolve?: Resolver; request?: { "http:": RequestFn; "https:": RequestFn } } = {}): typeof fetch {
  const lookup = checkedLookup(o.resolve ?? systemResolver);
  const request = o.request ?? { "http:": http.request as unknown as RequestFn, "https:": https.request as unknown as RequestFn };
  return (async (input: string | URL | Request, init: RequestInit = {}) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    if (url.protocol !== "http:" && url.protocol !== "https:") throw new TypeError("pinned fetch: http or https only");
    if (blockedHost(url.hostname)) throw new BlockedAddressError(url.hostname);
    const headers = { "accept-encoding": "gzip, deflate, br", ...plainHeaders(init.headers) };
    const method = init.method ?? "GET";
    return new Promise<Response>((resolve, reject) => {
      const req = request[url.protocol as "http:" | "https:"](url, {
        method, headers, lookup: lookup as never, agent: false, ...(init.signal ? { signal: init.signal } : {}),
      }, (res) => {
        const status = res.statusCode ?? 0;
        if (status < 200 || status > 599) { res.destroy(); return reject(new Error(`unexpected status ${status}`)); }
        const h = new Headers();
        for (const [k, v] of Object.entries(res.headers)) for (const x of Array.isArray(v) ? v : v === undefined ? [] : [v]) { try { h.append(k, x); } catch { /* invalid header value */ } }
        if (NULL_BODY.has(status) || method === "HEAD") {
          res.resume();
          return resolve(new Response(null, { status, headers: h }));
        }
        const enc = (h.get("content-encoding") ?? "").trim().toLowerCase();
        const decoder = enc === "gzip" || enc === "x-gzip" ? zlib.createGunzip() : enc === "deflate" ? zlib.createInflate() : enc === "br" ? zlib.createBrotliDecompress() : null;
        let body: Readable = res;
        if (decoder) {
          body = pipeline(res, decoder, () => {});
          h.delete("content-encoding");
          h.delete("content-length");
        }
        resolve(new Response(Readable.toWeb(body) as ReadableStream<Uint8Array>, { status, headers: h }));
      });
      req.on("error", reject);
      req.end();
    });
  }) as typeof fetch;
}
