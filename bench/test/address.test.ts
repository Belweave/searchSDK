// DNS-aware address checks for the harness's own page fetcher. Every resolver
// and HTTP request here is injected; nothing leaves the process.
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { Readable } from "node:stream";
import { test } from "node:test";
import { gzipSync } from "node:zlib";
import { blockedAddress, blockedHost, BlockedAddressError, checkedLookup, pinnedFetch, resolvePublic, type Resolver } from "../src/pages/address.ts";
import { PlainFetcher, type FetcherOptions } from "../src/pages/fetcher.ts";

test("addresses: private, loopback, link-local, metadata and reserved ranges, IPv4 and IPv6", () => {
  const blocked = [
    "0.0.0.0", "10.0.0.1", "100.64.0.1", "127.0.0.1", "169.254.169.254", "172.16.0.1", "172.31.255.255", "192.0.0.1", "192.0.2.1",
    "192.168.1.1", "198.18.0.1", "198.51.100.7", "203.0.113.9", "224.0.0.1", "240.0.0.1", "255.255.255.255",
    "::", "::1", "fe80::1", "fe80::1%en0", "fec0::1", "fc00::1", "fd00:ec2::254", "ff02::1", "100::1", "2001:db8::1", "2001::1",
    // IPv4-mapped, -compatible and -translated forms of private IPv4 addresses
    "::ffff:127.0.0.1", "::ffff:7f00:1", "::ffff:a9fe:a9fe", "::ffff:10.1.2.3", "::7f00:1", "::127.0.0.1", "::ffff:0:a00:1",
    // NAT64 and 6to4 addresses that embed a private IPv4 address
    "64:ff9b::a00:1", "64:ff9b::192.168.0.1", "64:ff9b:1::1", "2002:c0a8:101::1", "2002:7f00:1::",
  ];
  for (const a of blocked) assert.equal(blockedAddress(a), true, a);
  const open = ["8.8.8.8", "1.1.1.1", "93.184.215.14", "2606:4700:4700::1111", "2a00:1450:4009:81f::200e", "::ffff:8.8.8.8", "64:ff9b::808:808", "2002:808:808::1"];
  for (const a of open) assert.equal(blockedAddress(a), false, a);
  assert.equal(blockedAddress("not an address"), true);
});

test("host names: local names and IP literals as URL hostnames, including IPv4-mapped IPv6", () => {
  for (const u of ["http://[::ffff:127.0.0.1]/", "http://[::7f00:1]/", "http://[fd00::1]/", "http://2130706433/", "http://0x7f.1/", "http://printer.local/", "http://metadata.google.internal/", "http://localhost./"]) {
    assert.equal(blockedHost(new URL(u).hostname), true, u);
  }
  for (const h of ["example.com", "en.wikipedia.org", "[2606:4700:4700::1111]"]) assert.equal(blockedHost(h), false, h);
});

const resolver = (table: Record<string, string[]>, seen: string[] = []): Resolver => async (h) => {
  seen.push(h);
  const list = table[h];
  if (!list) throw Object.assign(new Error(`ENOTFOUND ${h}`), { code: "ENOTFOUND" });
  return list.map((address) => ({ address, family: address.includes(":") ? 6 : 4 }));
};

test("resolution: a name is refused when any of its addresses is private", async () => {
  const r = resolver({ "good.example": ["93.184.215.14", "2606:4700::1"], "evil.example": ["93.184.215.14", "10.0.0.5"], "meta.example": ["::ffff:169.254.169.254"] });
  assert.deepEqual((await resolvePublic("good.example", r)).map((a) => a.address), ["93.184.215.14", "2606:4700::1"]);
  await assert.rejects(resolvePublic("evil.example", r), BlockedAddressError);
  await assert.rejects(resolvePublic("meta.example", r), BlockedAddressError);
  await assert.rejects(resolvePublic("[::1]", r), BlockedAddressError);
});

test("the connect-time lookup returns only checked addresses, in both callback forms", async () => {
  const lookup = checkedLookup(resolver({ "good.example": ["93.184.215.14", "2606:4700::1"], "evil.example": ["10.0.0.5"] }));
  const all = await new Promise<unknown>((ok, no) => lookup("good.example", { all: true }, (e, a) => (e ? no(e) : ok(a))));
  assert.deepEqual(all, [{ address: "93.184.215.14", family: 4 }, { address: "2606:4700::1", family: 6 }]);
  const one = await new Promise<unknown[]>((ok, no) => lookup("good.example", { family: 6 }, (e, a, f) => (e ? no(e) : ok([a, f]))));
  assert.deepEqual(one, ["2606:4700::1", 6]);
  await assert.rejects(new Promise((ok, no) => lookup("evil.example", {}, (e, a) => (e ? no(e) : ok(a)))), BlockedAddressError);
});

/** A fake node:http request function: resolves through the lookup it is given, as a socket would, then answers. */
function fakeRequest(answer: { status: number; headers: Record<string, string>; body: Buffer }, seen: { host: string; addresses?: unknown }[]) {
  return ((url: URL, opts: { lookup: (h: string, o: object, cb: (e: Error | null, a?: unknown) => void) => void }, cb: (res: unknown) => void) => {
    const req = new EventEmitter() as EventEmitter & { end(): void; destroy(): void };
    req.destroy = () => {};
    req.end = () => {
      opts.lookup(url.hostname, { all: true }, (e, addresses) => {
        seen.push({ host: url.hostname, addresses });
        if (e) return void req.emit("error", e);
        const res = Object.assign(Readable.from([answer.body]), { statusCode: answer.status, statusMessage: "OK", headers: answer.headers });
        cb(res);
      });
    };
    return req;
  }) as never;
}

test("pinned fetch connects only through the checked lookup and decodes the body", async () => {
  const seen: { host: string; addresses?: unknown }[] = [];
  const r = resolver({ "good.example": ["93.184.215.14"], "rebind.example": ["127.0.0.1"] });
  const request = fakeRequest({ status: 200, headers: { "content-type": "text/plain", "content-encoding": "gzip" }, body: gzipSync("hello page") }, seen);
  const f = pinnedFetch({ resolve: r, request: { "http:": request, "https:": request } });
  const res = await f("https://good.example/a", { headers: { "user-agent": "T" } });
  assert.equal(res.status, 200);
  assert.equal(await res.text(), "hello page");
  assert.equal(res.headers.get("content-encoding"), null);
  assert.deepEqual(seen[0], { host: "good.example", addresses: [{ address: "93.184.215.14", family: 4 }] });
  await assert.rejects(f("http://rebind.example/"), BlockedAddressError);
});

const options = (fetchFn: typeof fetch, over: Partial<FetcherOptions> = {}): FetcherOptions => ({
  fetch: fetchFn, userAgent: "TestFetcher/1.0", robotsToken: "TestFetcher", timeoutMs: 2000, maxBytes: 1 << 20, maxRedirects: 5, maxCrawlDelayMs: 30_000, ...over,
});

test("the page fetcher resolves every hop first: a name or redirect onto a private address is never contacted", async () => {
  const contacted: string[] = [];
  const web = (async (input: unknown) => {
    const url = String(input);
    contacted.push(url);
    if (url === "https://good.example/robots.txt") return new Response("", { status: 404 });
    if (url === "https://good.example/hop") return new Response(null, { status: 302, headers: { location: "https://evil.example/secret" } });
    if (url === "https://good.example/page") return new Response("<p>fine</p>", { status: 200, headers: { "content-type": "text/html" } });
    return new Response("should not be reached", { status: 200, headers: { "content-type": "text/html" } });
  }) as typeof fetch;
  const f = new PlainFetcher(options(web, { resolve: resolver({ "good.example": ["93.184.215.14"], "evil.example": ["93.184.215.14", "fd00::1"], "mapped.example": ["::ffff:10.0.0.1"] }) }));
  assert.equal((await f.fetchPage("https://good.example/page")).status, "ok");
  for (const u of ["https://evil.example/x", "https://mapped.example/", "https://good.example/hop"]) {
    const p = await f.fetchPage(u);
    assert.equal(p.status === "unreadable" && p.reason, "blocked-url", u);
  }
  assert.ok(contacted.every((u) => u.startsWith("https://good.example/")), contacted.join(" "));
});
