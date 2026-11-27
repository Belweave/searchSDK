// SYNTHETIC FIXTURES for the contents track. Nothing here is a real provider.
// Fixture providers are registry specs on the reserved `.invalid` domain, run
// through the real SDK with an injected fetch; the fixture web serves the
// URL set's pages to the harness. Fixture outputs say "fixture" everywhere.
import { rng, seedOf } from "../util/core.ts";
import { STRATA, type ContentsUrl, type Stratum } from "./config.ts";

export interface ContentsFixture {
  /** Probability that a returned page holds the answer. */
  hit: number;
  /** Probability of an HTTP 503. */
  status503?: number;
  /** Probability of a failed page (the provider reports it could not read the target). */
  failed?: number;
  /** Probability of an empty page. */
  empty?: number;
  /** Cannot render client-side pages or read PDFs: those come back without the answer. */
  plain?: boolean;
  price: number;
}

export const CONTENTS_FIXTURES: Record<string, ContentsFixture> = {
  "fx-render": { hit: 0.92, price: 0.002 },
  "fx-plain": { hit: 0.9, plain: true, price: 0.001 },
  "fx-flaky": { hit: 0.88, status503: 0.12, failed: 0.04, price: 0.001 },
  "fx-empty": { hit: 0, empty: 1, price: 0.001 },
};

export function contentsFixtureRegistry(fx: Record<string, ContentsFixture> = CONTENTS_FIXTURES): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [id, b] of Object.entries(fx)) {
    const pricing = { plan: "fixture", source: "https://fixture.invalid/pricing", retrievedOn: "2026-11-25", perRequestUsd: 0, extraBlock: { items: 1, usd: b.price } };
    out[id] = {
      formatVersion: 1, id, name: `Fixture ${id}`, specVersion: "2026-11-25",
      sources: [{ url: "https://fixture.invalid/docs", retrievedOn: "2026-11-25", covers: "synthetic fixture provider" }],
      auth: { in: "header", name: "x-fixture-key", env: ["FIXTURE_KEY"] },
      capabilities: { search: true, contents: true },
      index: { type: "unknown", note: "Synthetic fixture." },
      terms: { url: "https://fixture.invalid/terms", readOn: "2026-11-25", benchmarkPublication: "allowed", rawResponseStorage: "allowed" },
      errors: [], unverified: [],
      search: {
        verification: { status: "unverified" },
        request: { method: "POST", url: `https://fixture.invalid/${id}/search`, encoding: "json", params: { query: { to: "q" }, maxResults: { to: "n" } } },
        limits: { maxResults: 20, maxQueryLength: null, maxIncludeDomains: 0, maxExcludeDomains: 0 },
        dateBasis: "unknown",
        response: { results: "results", excerptKind: "description", fields: { url: "url", title: "title", excerpts: { path: "snippet", steps: [{ step: "to-list" }] } } },
        pricing: { ...pricing, extraBlock: undefined, perRequestUsd: b.price },
        rateLimits: [], providerOptions: {},
      },
      contents: {
        verification: { status: "unverified" },
        request: { method: "POST", url: `https://fixture.invalid/${id}/contents`, encoding: "json", params: { urls: { to: "urls" } } },
        limits: { maxUrls: 10 },
        contentFormat: "markdown",
        response: {
          pages: [
            { from: "results", status: "ok", fields: { url: "url", title: "title", content: "text" } },
            { from: "errors", optional: true, status: "failed", fields: { url: "url", errorCode: "error" } },
          ],
        },
        pricing, rateLimits: [], providerOptions: {},
      },
    };
  }
  return JSON.parse(JSON.stringify(out)) as Record<string, unknown>;
}

const FILLER = "The archive keeps a record of each entry with its history, its notes and its sources for later readers.";

/** The page text a fixture URL states: its answer inside an answer passage, with filler around it. */
export function fixturePage(u: ContentsUrl): string {
  const answer = u.answers[0] ?? "";
  return `${FILLER} ${FILLER}\n\nAbout this entry: the record names ${answer} as the answer to the question it settles. ${FILLER}\n\n${FILLER}`;
}

/** A synthetic URL set: `per` URLs in each stratum on the reserved .example domain, pooled ones from the given providers. */
export function fixtureUrlSet(per: number, poolFrom: readonly string[] = ["fx-render", "fx-plain"]): ContentsUrl[] {
  const out: ContentsUrl[] = [];
  for (const s of STRATA) {
    for (let k = 0; k < per; k++) {
      const id = `cu-${s}-${String(k + 1).padStart(3, "0")}`;
      const answer = `Quillon ${s} ${k + 1}`;
      out.push({
        id, url: `https://${s}.example/${id}`, stratum: s as Stratum,
        origin: s === "pooled" ? { kind: "pool", provider: poolFrom[k % poolFrom.length]!, itemId: `item-${k}` } : { kind: s === "pdf" ? "arxiv" : s === "js" ? "kev" : "crosscheck", itemId: `item-${k}` },
        answers: [answer], answerPatterns: [], truth: s === "js" || s === "pdf" ? "source" : "harness",
        build: { on: "2026-11-25", httpStatus: 200, mime: s === "pdf" ? "application/pdf" : "text/html", chars: null, contentSha256: null, answerAt: s === "js" || s === "pdf" ? null : 0, ...(s === "pdf" ? { pdfPages: 3 } : {}) },
      });
    }
  }
  return out;
}

/**
 * The injected fetch: provider calls on fixture.invalid, and the fixture web for the harness.
 * Pages in the js stratum carry their text in a script (a plain GET sees none of it); PDFs are application/pdf.
 * `gone` URLs answer 404 to everyone. Deterministic per (provider, URL, call number).
 */
export function contentsFixtureFetch(urls: readonly ContentsUrl[], fx: Record<string, ContentsFixture> = CONTENTS_FIXTURES, opts: { calls?: string[]; gone?: Set<string> } = {}): typeof fetch {
  const byUrl = new Map(urls.map((u) => [u.url, u]));
  const counter = new Map<string, number>();
  const json = (status: number, value: unknown) => new Response(JSON.stringify(value), { status, headers: { "content-type": "application/json" } });
  return (async (input: unknown, init?: RequestInit) => {
    const url = String(input instanceof Request ? input.url : input);
    opts.calls?.push(url);
    const m = /^https:\/\/fixture\.invalid\/([a-z0-9-]+)\/contents$/.exec(url);
    if (!m) {
      if (/\/robots\.txt$/.test(url)) return new Response("not found", { status: 404 });
      const u = byUrl.get(url);
      if (!u || opts.gone?.has(url)) return new Response("gone", { status: 404 });
      if (u.stratum === "pdf") return new Response(new Uint8Array([37, 80, 68, 70, 45]), { status: 200, headers: { "content-type": "application/pdf" } });
      if (u.stratum === "js") return new Response(`<!doctype html><html><head><title>Record</title></head><body><div id="root"></div><script>window.__DATA__=${JSON.stringify(fixturePage(u))}</script></body></html>`, { status: 200, headers: { "content-type": "text/html" } });
      return new Response(`<!doctype html><html><head><title>Entry</title></head><body><main><p>${fixturePage(u).replace(/\n\n/g, "</p><p>")}</p></main></body></html>`, { status: 200, headers: { "content-type": "text/html; charset=utf-8" } });
    }
    const id = m[1]!;
    const b = fx[id];
    const body = JSON.parse(String(init?.body ?? "{}")) as { urls?: string[] };
    const target = body.urls?.[0] ?? "";
    const u = byUrl.get(target);
    if (!b || !u) return json(200, { results: [], errors: [{ url: target, error: "unknown" }] });
    const n = (counter.get(`${id}|${target}`) ?? 0) + 1;
    counter.set(`${id}|${target}`, n);
    const r = rng(seedOf("contents-fixture", id, u.id, n));
    const roll = r();
    if (roll < (b.status503 ?? 0)) return json(503, { error: "synthetic outage" });
    if (opts.gone?.has(target) || roll < (b.status503 ?? 0) + (b.failed ?? 0)) return json(200, { results: [], errors: [{ url: target, error: "target_http_error" }] });
    if (r() < (b.empty ?? 0)) return json(200, { results: [{ url: target, title: null, text: "" }] });
    const blind = b.plain && (u.stratum === "js" || u.stratum === "pdf");
    const hit = !blind && r() < b.hit;
    const text = hit ? fixturePage(u) : `${FILLER}\n\n${FILLER}`;
    return json(200, { results: [{ url: target, title: "Entry", text }] });
  }) as typeof fetch;
}
