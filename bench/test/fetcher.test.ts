// The harness's own page fetcher against a LOCAL fixture web: robots.txt,
// redirects, limits, charsets and text extraction. No request leaves the process.
import assert from "node:assert/strict";
import { test } from "node:test";
import { blockedHost, decodeEntities, htmlToText, parseRobots, PlainFetcher, robotsAllows, type FetcherOptions } from "../src/pages/fetcher.ts";
import { loadMethod } from "../src/run/config.ts";
import { pageFetcherFor } from "../src/session.ts";

type Route = (init: RequestInit) => Response | Promise<Response>;

/** A fixture web: URL to response. Unknown URLs are 404. Records every request. */
function web(routes: Record<string, Route | string>, seen: { url: string; headers: Record<string, string> }[] = []): typeof fetch {
  return (async (input: unknown, init: RequestInit = {}) => {
    const url = String(input);
    seen.push({ url, headers: (init.headers ?? {}) as Record<string, string> });
    const r = routes[url];
    if (r === undefined) return new Response("missing", { status: 404 });
    if (typeof r === "string") return new Response(r, { status: 200, headers: { "content-type": "text/html; charset=utf-8" } });
    return r(init);
  }) as typeof fetch;
}

const options = (fetchFn: typeof fetch, over: Partial<FetcherOptions> = {}): FetcherOptions => ({
  fetch: fetchFn, userAgent: "TestFetcher/1.0", robotsToken: "TestFetcher", timeoutMs: 2000, maxBytes: 1 << 20, maxRedirects: 5, maxCrawlDelayMs: 30_000, ...over,
});

const page = (body: string) => `<!doctype html><html><head><title>A page</title><style>p{color:red}</style></head><body><p>${body}</p></body></html>`;

test("robots.txt: our own group wins over *, the longest rule wins, and allow wins a tie (RFC 9309)", () => {
  const rules = parseRobots([
    "User-agent: *", "Disallow: /", "",
    "User-agent: OtherBot", "User-agent: testfetcher/2.0", "Disallow: /private", "Allow: /private/open", "Disallow: /*.pdf$", "Allow: /tie", "Disallow: /tie",
    "Crawl-delay: 2",
  ].join("\n"), "TestFetcher");
  assert.equal(robotsAllows(rules, "/public"), true);
  assert.equal(robotsAllows(rules, "/private/x"), false);
  assert.equal(robotsAllows(rules, "/private/open/x"), true);
  assert.equal(robotsAllows(rules, "/doc.pdf"), false);
  assert.equal(robotsAllows(rules, "/doc.pdf?x=1"), true);
  assert.equal(robotsAllows(rules, "/tie"), true);
  assert.equal(robotsAllows(rules, "/robots.txt"), true);
  assert.equal(rules.crawlDelayMs, 2000);
  const star = parseRobots("User-agent: *\nDisallow: /a\n# Disallow: /b\nDisallow:\n", "TestFetcher");
  assert.equal(robotsAllows(star, "/a/1"), false);
  assert.equal(robotsAllows(star, "/b"), true);
  assert.equal(robotsAllows(parseRobots("", "TestFetcher"), "/anything"), true);
});

test("text extraction drops scripts, styles and markup and decodes entities", () => {
  const { title, text } = htmlToText(`<html><head><title>T &amp; U</title><script>var x = "<p>no</p>";</script></head>
    <body><!-- hidden --><nav>Menu</nav><h1>Heading</h1><p>Caf&eacute; &mdash; 3 &lt; 4 &#x1F600; &#0;</p><table><tr><td>a</td><td>b</td></tr></table>
    <svg><text>vector</text></svg><p>x < y and <b>bold</b></p></body></html>`);
  assert.equal(title, "T & U");
  assert.ok(!text.includes("no</p>") && !text.includes("var x") && !text.includes("hidden") && !text.includes("vector"));
  assert.match(text, /Heading\n+Café — 3 < 4 😀 �/);
  assert.match(text, /a b/);
  assert.match(text, /x < y and bold/);
  assert.equal(decodeEntities("&nbsp;&yuml;&unknown;&#65;"), "\u00a0\u00ff&unknown;A");
});

test("a readable page: robots.txt checked once per host, a generic user agent, no contact details", async () => {
  const seen: { url: string; headers: Record<string, string> }[] = [];
  const f = new PlainFetcher(options(web({ "https://site.example/robots.txt": "User-agent: *\nAllow: /", "https://site.example/a": page("Answer here"), "https://site.example/b": page("Second") }, seen)));
  const a = await f.fetchPage("https://site.example/a#frag");
  assert.equal(a.status, "ok");
  assert.equal(a.status === "ok" && a.text, "Answer here");
  assert.equal(a.status === "ok" && a.title, "A page");
  await f.fetchPage("https://site.example/b");
  assert.deepEqual(seen.map((s) => s.url), ["https://site.example/robots.txt", "https://site.example/a", "https://site.example/b"]);
  const method = loadMethod();
  const live = pageFetcherFor(method, web({}, seen));
  await live.fetchPage("https://other.example/");
  const ua = seen.at(-1)!.headers["user-agent"]!;
  assert.equal(ua, method.pages.userAgent);
  assert.ok(ua.includes(method.pages.robotsToken));
  assert.ok(!/@|https?:|www\.|searchsdk|belweave/i.test(ua), `user agent carries no contact details: ${ua}`);
});

test("robots.txt rules, absence and unreachability decide what is read", async () => {
  const f = new PlainFetcher(options(web({
    "https://deny.example/robots.txt": "User-agent: *\nDisallow: /",
    "https://deny.example/a": page("never fetched"),
    "https://gone.example/a": page("readable without robots.txt"),
    "https://down.example/robots.txt": () => new Response("oops", { status: 503 }),
    "https://down.example/a": page("never fetched"),
    "https://slow.example/robots.txt": () => new Response("x", { status: 429 }),
  })));
  assert.deepEqual(await f.fetchPage("https://deny.example/a"), { status: "unreadable", url: "https://deny.example/a", reason: "robots", detail: "rules" });
  assert.equal((await f.fetchPage("https://gone.example/a")).status, "ok");
  assert.equal((await f.fetchPage("https://down.example/a")).status === "unreadable", true);
  const down = await f.fetchPage("https://down.example/a");
  assert.equal(down.status === "unreadable" && down.reason, "robots");
  const slow = await f.fetchPage("https://slow.example/a");
  assert.equal(slow.status === "unreadable" && slow.reason, "robots");
});

test("redirects are followed a bounded number of times, each hop checked again", async () => {
  const redirect = (to: string) => () => new Response(null, { status: 301, headers: { location: to } });
  const f = new PlainFetcher(options(web({
    "https://a.example/start": redirect("/next"),
    "https://a.example/next": redirect("https://b.example/end"),
    "https://b.example/robots.txt": "User-agent: *\nDisallow: /end",
    "https://a.example/ok": redirect("/final"),
    "https://a.example/final": page("arrived"),
    "https://a.example/loop": redirect("/loop"),
    "https://a.example/local": redirect("http://127.0.0.1/admin"),
  }), { maxRedirects: 3 }));
  const blocked = await f.fetchPage("https://a.example/start");
  assert.equal(blocked.status === "unreadable" && blocked.reason, "robots");
  const ok = await f.fetchPage("https://a.example/ok");
  assert.equal(ok.status === "ok" && ok.finalUrl, "https://a.example/final");
  const loop = await f.fetchPage("https://a.example/loop");
  assert.equal(loop.status === "unreadable" && loop.reason, "redirects");
  const local = await f.fetchPage("https://a.example/local");
  assert.equal(local.status === "unreadable" && local.reason, "blocked-url");
});

test("status, content type, size and time limits make a page unreadable or truncated", async () => {
  const f = new PlainFetcher(options(web({
    "https://x.example/404": () => new Response("no", { status: 404 }),
    "https://x.example/pdf": () => new Response("%PDF", { status: 200, headers: { "content-type": "application/pdf" } }),
    "https://x.example/empty": page(" "),
    "https://x.example/big": page("start " + "word ".repeat(5000) + " end"),
    "https://x.example/plain": () => new Response("Plain answer text", { status: 200, headers: { "content-type": "text/plain" } }),
    "https://x.example/hang": (init) => new Promise((_, reject) => init.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")))),
  }), { maxBytes: 2048, timeoutMs: 100 }));
  const reason = async (u: string) => { const p = await f.fetchPage(u); return p.status === "unreadable" ? [p.reason, p.httpStatus] : ["ok"]; };
  assert.deepEqual(await reason("https://x.example/404"), ["status", 404]);
  assert.deepEqual(await reason("https://x.example/pdf"), ["content-type", 200]);
  assert.deepEqual(await reason("https://x.example/empty"), ["empty", 200]);
  assert.deepEqual(await reason("https://x.example/hang"), ["timeout", undefined]);
  const big = await f.fetchPage("https://x.example/big");
  assert.ok(big.status === "ok" && big.truncated && big.text.startsWith("start") && !big.text.includes("end"));
  const plain = await f.fetchPage("https://x.example/plain");
  assert.ok(plain.status === "ok" && plain.text === "Plain answer text" && plain.title === null);
  const net = new PlainFetcher(options((async () => { throw new TypeError("fetch failed"); }) as typeof fetch));
  const n = await net.fetchPage("https://y.example/");
  assert.equal(n.status === "unreadable" && n.reason, "robots"); // robots.txt unreachable: complete disallow
});

test("the declared or sniffed charset decodes the body", async () => {
  const latin1 = new Uint8Array([...Buffer.from("<html><head><meta charset=\"windows-1252\"></head><body><p>Caf"), 0xe9, ...Buffer.from(" \u0080</p></body></html>", "latin1")]);
  const f = new PlainFetcher(options(web({
    "https://c.example/meta": () => new Response(latin1, { status: 200, headers: { "content-type": "text/html" } }),
    "https://c.example/header": () => new Response(new Uint8Array([0x43, 0x61, 0x66, 0xe9]), { status: 200, headers: { "content-type": "text/plain; charset=iso-8859-1" } }),
  })));
  const meta = await f.fetchPage("https://c.example/meta");
  assert.ok(meta.status === "ok" && meta.text === "Café €", meta.status === "ok" ? meta.text : meta.reason);
  const header = await f.fetchPage("https://c.example/header");
  assert.ok(header.status === "ok" && header.text === "Café");
});

test("URLs the fetcher refuses: local, private and non-web addresses", async () => {
  for (const h of ["localhost", "127.0.0.1", "10.1.2.3", "192.168.0.1", "172.20.0.1", "169.254.1.1", "[::1]", "intranet"]) assert.ok(blockedHost(h), h);
  for (const h of ["example.com", "8.8.8.8", "a.b.example"]) assert.ok(!blockedHost(h), h);
  const f = new PlainFetcher(options(web({})));
  for (const u of ["ftp://example.com/x", "https://user:pw@example.com/", "not a url", "http://localhost/"]) {
    const p = await f.fetchPage(u);
    assert.equal(p.status === "unreadable" && p.reason, "blocked-url", u);
  }
});
