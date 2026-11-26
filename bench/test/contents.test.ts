// The contents track on SYNTHETIC providers, URLs and pages. Every run here is
// a fixture run inside a temporary store; the network guard is active.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import type { Item } from "../src/dataset/items.ts";
import type { FetchedDocument, FetchedPage } from "../src/pages/fetcher.ts";
import { buildUrlSet, datasetCandidates, noteUrls, pickWithSiteCap, siteOf, type BuildIo, type Candidate } from "../src/contents/build.ts";
import { openContents, contentsOutputs } from "../src/contents/cli.ts";
import { loadContentsConfig, loadContentsMethod, urlSetProblems, type ContentsConfig, type UrlSpec } from "../src/contents/config.ts";
import { contentsFixtureFetch, fixtureUrlSet } from "../src/contents/fixtures.ts";
import { makeContentsPlan, plannedUrls, urlReservation } from "../src/contents/plan.ts";
import { contentsPaths, contentsProviderOrder, readContentsAttempts, readProbes, runContents, urlOrder } from "../src/contents/runner.ts";
import { answerPassage, completenessOf, scoreContents } from "../src/contents/score.ts";
import { leakCheck, sensitiveStrings } from "../src/publish/publish.ts";
import { registry, type ProviderSpec } from "../src/sdk.ts";
import { readJson } from "../src/util/core.ts";
import { item, tempStore } from "./helpers.ts";

const method = loadContentsMethod();
const reg = registry as unknown as Record<string, ProviderSpec>;
const config: ContentsConfig = { name: "contents-test", track: "contents", providers: ["fx-render", "fx-plain", "fx-flaky", "fx-empty"], urlSet: "datasets/contents/none.jsonl", urlSpec: "datasets/specs/contents-urls-0.1.0.json", passes: 3, capUsd: 5, seed: 11 };

async function fixtureRun(o: { urls?: ReturnType<typeof fixtureUrlSet>; gone?: Set<string>; calls?: string[] } = {}) {
  tempStore();
  const urls = o.urls ?? fixtureUrlSet(6);
  const calls: string[] = o.calls ?? [];
  const s = openContents({ config, mode: "fixture", urls, fetch: contentsFixtureFetch(urls, undefined, { calls, ...(o.gone ? { gone: o.gone } : {}) }) });
  const r = await runContents(s, 0);
  return { s, r, urls, calls, scores: scoreContents(s.dir, s) };
}

test("the committed configs load, and the plan counts calls, credits and spend before the set is built", () => {
  const c = loadContentsConfig(join(import.meta.dirname, "../config/contents-2026-12.json"));
  const spec = readJson<UrlSpec>(join(import.meta.dirname, "..", c.urlSpec));
  const urls = plannedUrls(spec.quotas, spec.pdfMaxPages);
  const plan = makeContentsPlan({ config: c, method, urls, planned: true, registry: reg });
  assert.equal(plan.urls.total, Object.values(spec.quotas).reduce((a, b) => a + b, 0));
  for (const p of plan.providers) assert.equal(p.calls, plan.urls.total * c.passes);
  assert.ok(plan.providers.find((p) => p.id === "firecrawl")!.credits! > plan.urls.total * c.passes, "PDFs reserve credits per page");
  assert.ok(plan.warnings.some((w) => /not built yet/.test(w)));
});

test("a PDF reserves (1 + pages) times the per-URL bound, the same rule for every provider", () => {
  const pdf = { stratum: "pdf" as const, build: { on: "x", httpStatus: 200, mime: "application/pdf", chars: null, contentSha256: null, answerAt: null, pdfPages: 8 } };
  const page = { stratum: "reference" as const, build: { ...pdf.build, mime: "text/html", pdfPages: undefined as never } };
  for (const id of ["exa", "context", "firecrawl", "tinyfish"]) {
    const a = urlReservation(reg[id]!, pdf, method);
    const b = urlReservation(reg[id]!, page, method);
    assert.ok(Math.abs(a.usd - b.usd * 9) < 1e-12, id);
  }
  assert.equal(urlReservation(reg.firecrawl!, pdf, method).credits, 9);
});

test("every provider gets the same one-URL call, in a seeded order that differs by URL and pass", async () => {
  const { calls, urls } = await fixtureRun();
  const providerCalls = calls.filter((u) => u.includes("fixture.invalid"));
  assert.ok(providerCalls.length > 0);
  const firsts = new Set(urls.slice(0, 12).map((u) => contentsProviderOrder(config, u.id, 1)[0]));
  assert.ok(firsts.size > 1, "no provider is always first");
  assert.notDeepEqual(urlOrder(config, urls, 1).map((u) => u.id), urlOrder(config, urls, 2).map((u) => u.id));
});

test("a fixture run scores fidelity per stratum, ranks by fidelity within reliability bands, and records every call", async () => {
  const { s, scores, urls } = await fixtureRun();
  const attempts = readContentsAttempts(contentsPaths(s.dir).attempts);
  assert.equal(attempts.length, urls.length * 3 * 4);
  const by = Object.fromEntries(scores.providers.map((p) => [p.provider, p]));
  assert.equal(by["fx-empty"]!.reliability.usableRate, 0);
  assert.equal(by["fx-empty"]!.fidelity.mean, 0);
  assert.equal(by["fx-plain"]!.strata.js!.fidelity!.mean, 0, "a plain reader cannot render the js stratum");
  assert.equal(by["fx-plain"]!.strata.pdf!.fidelity!.mean, 0);
  assert.ok(by["fx-render"]!.strata.js!.fidelity!.mean > 0.5);
  assert.ok(by["fx-render"]!.rank!.position < by["fx-empty"]!.rank!.position);
  assert.ok(by["fx-empty"]!.rank!.reliable === false);
  assert.ok(by["fx-render"]!.completeness.passageRecall! > 0.9);
  assert.ok(by["fx-plain"]!.ownPool !== null);
});

test("a page that is down in a pass is unavailable for every provider: no calls, and it leaves the paired set", async () => {
  const urls = fixtureUrlSet(4);
  const gone = new Set([urls[0]!.url]);
  const { s, scores } = await fixtureRun({ urls, gone });
  const attempts = readContentsAttempts(contentsPaths(s.dir).attempts);
  assert.equal(attempts.filter((a) => a.urlId === urls[0]!.id).length, 0);
  assert.equal(readProbes(contentsPaths(s.dir).probes).filter((p) => p.urlId === urls[0]!.id && !p.alive).length, 3);
  assert.equal(scores.excluded.unavailable, 1);
  assert.equal(scores.pairedN + scores.excluded.unavailable + scores.excluded.truthLost + scores.excluded.unpaired, urls.length);
});

test("published outputs hold no page text and say fixture", async () => {
  const { s, scores, urls } = await fixtureRun();
  const meta = readJson<any>(contentsPaths(s.dir).run);
  const o = contentsOutputs(s.dir, meta, urls, scores);
  assert.equal(o.results.mode, "fixture");
  assert.equal(o.results.liveVerified, false);
  const serialized = [JSON.stringify(o.results), ...o.attempts.map((a) => JSON.stringify(a))].join("\n");
  const sensitive = sensitiveStrings(s.dir, []);
  assert.ok(sensitive.length > 0);
  assert.deepEqual(leakCheck(serialized, sensitive), []);
});

test("the cap stops the run before a call could pass it", async () => {
  tempStore();
  const urls = fixtureUrlSet(6);
  const s = openContents({ config: { ...config, capUsd: 0.01 }, mode: "fixture", urls, fetch: contentsFixtureFetch(urls) });
  assert.equal(await runContents(s, 0), "budget");
  assert.ok(s.budget.runCashUsd() <= 0.01 + 1e-9);
});

test("completeness: the answer passage, page coverage and text not on the page", () => {
  const u = { answers: ["Zanzibar Quill"], answerPatterns: [] };
  const harness = "Intro words here and more. The novel was written by Zanzibar Quill in a small town. Footer menu links contact.";
  assert.match(answerPassage(harness, u, 30)!, /zanzibar quill/);
  const full = completenessOf(harness, "The novel was written by Zanzibar Quill in a small town.", u, method.completeness);
  assert.equal(full.passageRecall !== null && full.passageRecall > 0.5, true);
  assert.ok(full.pageCoverage! < 1);
  assert.equal(full.extraneous, 0);
  const noisy = completenessOf(harness, "Buy now and subscribe to our newsletter for great deals today", u, method.completeness);
  assert.equal(noisy.passageRecall, 0);
  assert.ok(noisy.extraneous! > 0.9);
});

test("review-note URLs lose the sentence's punctuation but keep balanced parentheses", () => {
  assert.deepEqual(noteUrls("Checked on https://en.wikipedia.org/wiki/Comoros. Also https://ro.wikipedia.org/wiki/T%C4%83nase_Scatiu_(film)."), ["https://en.wikipedia.org/wiki/Comoros", "https://ro.wikipedia.org/wiki/T%C4%83nase_Scatiu_(film)"]);
  assert.equal(siteOf("https://de.wikipedia.org/wiki/X"), "wikipedia.org");
  assert.equal(siteOf("https://www.bbc.co.uk/news"), "bbc.co.uk");
});

test("the site cap holds while other sites remain, then fills", () => {
  const xs = [...Array.from({ length: 8 }, (_, i) => ({ url: `https://en.wikipedia.org/wiki/${i}` })), { url: "https://a.example/1" }, { url: "https://b.example/1" }];
  const four = pickWithSiteCap(xs, 4, 0.5);
  assert.equal(four.filter((x) => siteOf(x.url) === "wikipedia.org").length, 2);
  assert.equal(pickWithSiteCap(xs, 10, 0.5).length, 10);
});

test("candidates come only from public and fresh items, never navigational or private ones", () => {
  const items: Item[] = [
    item("a", { review: { status: "agent-reviewed", on: "2026-11-25", note: "Found on https://en.wikipedia.org/wiki/A." } }),
    item("p", { split: "private", review: { status: "agent-reviewed", on: "2026-11-25", note: "Found on https://en.wikipedia.org/wiki/Secret." } }),
    item("k", { source: { name: "cisa-kev", url: "https://www.cve.org/CVERecord?id=CVE-2025-0001", path: ["CVE-2025-0001"], retrievedOn: "2026-11-25" } }),
    item("x", { source: { name: "arxiv", url: "https://arxiv.org/abs/2610.00001", path: ["2610.00001"], retrievedOn: "2026-11-25" } }),
  ];
  const c = datasetCandidates(items);
  assert.ok(!c.some((x) => x.url.includes("Secret")));
  assert.deepEqual(c.map((x) => x.kind).sort(), ["html", "html", "js", "pdf"]);
});

test("the builder: answer-checked pages, client-rendered records, short PDFs, and the same number pooled from each provider", async () => {
  const items: Item[] = Array.from({ length: 6 }, (_, k) => item(`w${k}`, { answers: [`Answer ${k}`], review: { status: "agent-reviewed", on: "2026-11-25", note: `See https://site${k}.example/page-${k}.` } }));
  items.push(item("pdf1", { answers: ["Ada Short"], source: { name: "arxiv", url: "https://arxiv.org/abs/1", path: ["1"], retrievedOn: "2026-11-25" } }));
  items.push(item("pdf2", { answers: ["Bo Long"], source: { name: "arxiv", url: "https://arxiv.org/abs/2", path: ["2"], retrievedOn: "2026-11-25" } }));
  const answerOf = (url: string) => items.find((i) => url.includes(i.id) || url.endsWith(`page-${i.id.slice(1)}`))?.answers[0];
  const io: BuildIo = {
    async readPage(url): Promise<FetchedPage> {
      if (url.includes("cve.org")) return { status: "unreadable", url, reason: "empty", httpStatus: 200 };
      if (url.includes("site5")) return { status: "unreadable", url, reason: "robots" };
      const a = answerOf(url) ?? (url.includes("pool") ? "Pooled Answer" : "");
      return { status: "ok", url, finalUrl: url, httpStatus: 200, title: "t", text: `${"long text ".repeat(url.includes("site0") ? 6000 : 10)} ${a}`, truncated: false };
    },
    async readDocument(url): Promise<FetchedDocument> {
      return { status: "ok", url, finalUrl: url, httpStatus: 200, mime: "application/pdf", bytes: 100, truncated: false, pages: url.endsWith("/1") ? 6 : 40 };
    },
    async kevCandidates() { return [{ url: "https://www.cve.org/CVERecord?id=CVE-2025-9", kind: "js", origin: { kind: "kev", subject: "CVE-2025-9" }, answers: ["Widget Server"], answerPatterns: [] } as Candidate]; },
    async arxivCandidates() { return []; },
    log() {},
  };
  const pool = (p: string, n: number) => Array.from({ length: n }, (_, k) => ({ url: `https://pool-${p}.example/${k}`, kind: "html" as const, origin: { kind: "pool" as const, provider: p, itemId: "w1" }, answers: ["Pooled Answer"], answerPatterns: [], text: "" }));
  const pools = new Map([["a", pool("a", 5)], ["b", pool("b", 2)]]);
  const spec: UrlSpec = { name: "t", version: "0", seed: 3, datasets: [], runs: [], quotas: { reference: 10, pooled: 10, long: 10, js: 5, pdf: 5 }, pooledProviders: ["a", "b"], longMinChars: 50_000, pdfMaxPages: 10, maxSiteShare: 0.5, extra: { kev: 1, arxiv: { count: 0, windowDays: [60, 95] } } };
  const r = await buildUrlSet(spec, items, pools, io, "2026-11-26");
  assert.deepEqual(urlSetProblems(r.urls), []);
  const by = (s: string) => r.urls.filter((u) => u.stratum === s);
  assert.equal(by("long").length, 1);
  assert.equal(by("reference").length, 4, "site5 is disallowed by robots.txt");
  assert.equal(by("js").length, 1);
  assert.deepEqual(by("pdf").map((u) => u.build.pdfPages), [6]);
  assert.equal(by("pooled").filter((u) => u.origin.provider === "a").length, 2);
  assert.equal(by("pooled").filter((u) => u.origin.provider === "b").length, 2);
  assert.ok(r.dropped.some((d) => /robots/.test(d.why)));
  // A provider without pooled candidates leaves the stratum empty rather than favouring the others.
  const r2 = await buildUrlSet(spec, items, new Map([["a", pool("a", 5)], ["b", []]]), io, "2026-11-26");
  assert.equal(r2.urls.filter((u) => u.stratum === "pooled").length, 0);
});

test("contents tests run behind the network guard", () => {
  assert.equal(process.env.BENCH_TEST, "1");
  assert.match(readFileSync(join(import.meta.dirname, "../package.json"), "utf8"), /--import \.\/test\/guard\.ts/);
});

test("the PDF page count reads page trees inside compressed object streams, and skips endstream", async () => {
  const { deflateSync } = await import("node:zlib");
  const { pdfPageCount } = await import("../src/pages/fetcher.ts");
  const img = deflateSync(Buffer.from("not a page tree"));
  const objstm = deflateSync(Buffer.from("<< /Type /Font /Widths 1 0 R >>\n<< /Count 6 /Kids [ 1 0 R ] /Parent 9 0 R /Type /Pages >>\n<< /Count 11 /Kids [ 2 0 R 3 0 R ] /Type /Pages >>\n<< /Count -3 /Type /Outlines >>"));
  const pdf = Buffer.concat([Buffer.from("%PDF-1.7\n1 0 obj\n<< /Length 5 >>\nstream\n"), img, Buffer.from("\nendstream\nendobj\n2 0 obj\n<< /Type /ObjStm /Filter /FlateDecode >>\nstream\n"), objstm, Buffer.from("\r\nendstream\nendobj\n%%EOF")]);
  assert.equal(pdfPageCount(pdf), 11);
  assert.equal(pdfPageCount(Buffer.from("<html>not a pdf</html>")), null);
});
