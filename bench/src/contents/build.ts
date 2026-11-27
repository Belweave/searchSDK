// Builds the contents track's URL set (METHOD-contents.md, URL set). No ranked
// provider is called and no provider's page text is read: candidates come
// from the committed datasets (answer pages, the cross-check's second
// sources, KEV records, arXiv papers) and from pages the harness's own
// fetcher read in finished search runs, pooled equally across providers.
// Every candidate is read again by the harness fetcher (robots.txt obeyed);
// ground truth is the dataset's answer, confirmed in the harness's own text
// where the harness can read the page as text.
import { join } from "node:path";
import type { Item } from "../dataset/items.ts";
import { normalize, textHasAnswer, type AnswerKey } from "../dataset/match.ts";
import type { FetchedDocument, FetchedPage } from "../pages/fetcher.ts";
import { readAttempts, runPaths, urlKey, type PageRecord } from "../run/records.ts";
import { readJson, readJsonl, rng, seedOf, sha256, shuffle } from "../util/core.ts";
import type { ContentsUrl, Stratum, UrlSpec } from "./config.ts";

/** A URL that may enter the set, before the harness reads it. */
export interface Candidate {
  url: string;
  kind: "html" | "js" | "pdf";
  origin: ContentsUrl["origin"];
  answers: string[];
  answerPatterns: string[];
  /** Always empty: no candidate is a navigational item. Present so a candidate is an answer key. */
  answerUrls?: string[];
  /** For a PDF: the page count its source metadata states (an arXiv comment such as "12 pages"), if any. */
  statedPages?: number;
}

/** The answer key of a candidate, for the shared matcher. */
export const keyOf = (c: { answers: string[]; answerPatterns: string[] }): AnswerKey => ({ answers: c.answers, answerPatterns: c.answerPatterns, answerUrls: [] });

export interface Dropped { url: string; why: string }

/** What the builder needs from the outside world; tests pass fixtures. */
export interface BuildIo {
  readPage(url: string): Promise<FetchedPage>;
  readDocument(url: string): Promise<FetchedDocument>;
  /** Extra js candidates (KEV records whose answer the CVE record states); [] when spec.extra.kev is 0. */
  kevCandidates(n: number, exclude: Set<string>): Promise<Candidate[]>;
  /** Extra js candidates on a second site (ORCID profiles, named by the profile's own public record); [] when spec.extra.orcid is 0 or absent. */
  orcidCandidates?(n: number, exclude: Set<string>): Promise<Candidate[]>;
  /** Extra pdf candidates (arXiv papers); [] when spec.extra.arxiv.count is 0. */
  arxivCandidates(n: number, exclude: Set<string>): Promise<Candidate[]>;
  log(line: string): void;
}

/** URLs in a review note, without the sentence's trailing punctuation or an unbalanced closing parenthesis. */
export function noteUrls(note: string): string[] {
  const out: string[] = [];
  for (const m of note.matchAll(/https?:\/\/[^\s<>"']+/g)) {
    let u = m[0].replace(/[.,;:]+$/, "");
    while (u.endsWith(")") && (u.match(/\(/g)?.length ?? 0) < (u.match(/\)/g)?.length ?? 0)) u = u.slice(0, -1).replace(/[.,;:]+$/, "");
    out.push(u);
  }
  return out;
}

const key = (i: Item): AnswerKey => ({ answers: i.answers, answerPatterns: i.answerPatterns, answerUrls: [] });

/** Candidates from committed item sets: cross-check pages, CVE records, arXiv abstracts and PDFs, release and PEP pages. */
export function datasetCandidates(items: readonly Item[]): Candidate[] {
  const out: Candidate[] = [];
  for (const i of items) {
    if (i.split === "private" || i.class === "nav") continue;
    const base = { answers: [...i.answers], answerPatterns: [...i.answerPatterns] };
    if (!base.answers.length && !base.answerPatterns.length) continue;
    for (const u of noteUrls(i.review.note ?? "")) {
      out.push({ url: u, kind: /^https:\/\/www\.cve\.org\/CVERecord\?id=/.test(u) ? "js" : "html", origin: { kind: "crosscheck", itemId: i.id }, ...base });
    }
    const s = i.source;
    if (s.name === "cisa-kev") out.push({ url: s.url, kind: "js", origin: { kind: "source", itemId: i.id }, ...base });
    if (s.name === "pep" || s.name === "endoflife-date") out.push({ url: s.url, kind: "html", origin: { kind: "source", itemId: i.id }, ...base });
    if (s.name === "arxiv" && s.path?.[0]) {
      out.push({ url: `https://arxiv.org/abs/${s.path[0]}`, kind: "html", origin: { kind: "source", itemId: i.id }, ...base });
      out.push({ url: `https://arxiv.org/pdf/${s.path[0]}`, kind: "pdf", origin: { kind: "arxiv", itemId: i.id }, ...base });
    }
  }
  // One candidate per URL: the first item that names it.
  const seen = new Set<string>();
  return out.filter((c) => (seen.has(urlKey(c.url)) ? false : (seen.add(urlKey(c.url)), true)));
}

/**
 * Pooled candidates, per provider: its own top-3 result pages in finished search runs that the
 * harness read and whose harness text holds the item's answer. Public and fresh items only.
 */
export function poolCandidates(storeRunsDir: string, runIds: readonly string[], items: readonly Item[], providers: readonly string[], topK = 3): Map<string, (Candidate & { text: string })[]> {
  const byId = new Map(items.filter((i) => i.split !== "private" && i.class !== "nav").map((i) => [i.id, i]));
  const out = new Map(providers.map((p) => [p, [] as (Candidate & { text: string })[]]));
  for (const runId of runIds) {
    const paths = runPaths(join(storeRunsDir, runId));
    const read = new Map<string, PageRecord>();
    for (const p of readJsonl<PageRecord>(paths.pages)) read.set(p.urlKey, p);
    for (const a of readAttempts(paths.attempts)) {
      const item = byId.get(a.itemId);
      if (!item || a.outcome !== "ok_nonempty" || a.profile !== "default" || !out.has(a.provider)) continue;
      for (const u of a.urls.slice(0, topK)) {
        const k = urlKey(u);
        if (read.get(k)?.status !== "ok") continue;
        let text = "";
        try { text = readJson<{ content?: string }>(paths.rawPage(k)).content ?? ""; } catch { continue; }
        if (!textHasAnswer(text, key(item))) continue;
        out.get(a.provider)!.push({ url: u, kind: "html", origin: { kind: "pool", itemId: item.id, provider: a.provider, runId }, answers: [...item.answers], answerPatterns: [...item.answerPatterns], text });
      }
    }
  }
  return out;
}

/** The site a URL belongs to, for the per-site cap: the host without "www.", cut to its last two labels (three under a two-letter second level such as co.uk). */
export function siteOf(url: string): string {
  let h: string;
  try { h = new URL(url).hostname.toLowerCase().replace(/^www\./, ""); } catch { return url; }
  const parts = h.split(".");
  const n = parts.length >= 3 && parts[parts.length - 2]!.length <= 3 && parts[parts.length - 1]!.length === 2 ? 3 : 2;
  return parts.slice(-n).join(".");
}

/**
 * Picks up to `n` from an already seeded order, at most `share` of n from one site while others remain;
 * once only capped sites are left, it fills from them.
 */
export function pickWithSiteCap<T extends { url: string }>(ordered: readonly T[], n: number, share: number): T[] {
  const cap = Math.max(1, Math.floor(n * share));
  const per = new Map<string, number>();
  const out: T[] = [];
  const rest: T[] = [];
  for (const c of ordered) {
    if (out.length >= n) break;
    const s = siteOf(c.url);
    if ((per.get(s) ?? 0) >= cap) { rest.push(c); continue; }
    per.set(s, (per.get(s) ?? 0) + 1);
    out.push(c);
  }
  for (const c of rest) { if (out.length >= n) break; out.push(c); }
  return out;
}

/** Where the first answer match starts in the normalized text, or null. */
export function answerOffset(text: string, k: AnswerKey): number | null {
  if (!textHasAnswer(text, k)) return null;
  const n = normalize(text);
  let best: number | null = null;
  for (const a of k.answers) {
    const i = ` ${n} `.indexOf(` ${normalize(a)} `);
    if (i >= 0 && (best === null || i < best)) best = i;
  }
  if (best === null) {
    const nfc = text.normalize("NFKC");
    for (const p of k.answerPatterns) {
      const m = new RegExp(p, "iu").exec(nfc);
      if (m && (best === null || m.index < best)) best = m.index;
    }
  }
  return best ?? 0;
}

export interface BuildResult { urls: ContentsUrl[]; dropped: Dropped[]; short: Partial<Record<Stratum, number>> }

/** Builds the set. Reads candidates in a seeded order and stops reading a stratum once it is full. */
export async function buildUrlSet(spec: UrlSpec, items: readonly Item[], pools: Map<string, (Candidate & { text: string })[]>, io: BuildIo, today: string): Promise<BuildResult> {
  const dropped: Dropped[] = [];
  const taken = new Set<string>();
  const picked: Record<Stratum, ContentsUrl[]> = { reference: [], pooled: [], long: [], js: [], pdf: [] };
  const order = <T>(xs: readonly T[], tag: string) => shuffle(xs, rng(seedOf(spec.seed, tag)));
  const cands = datasetCandidates(items);
  for (const c of cands) taken.add(urlKey(c.url));
  const extraJs = [
    ...(spec.extra.kev ? await io.kevCandidates(spec.extra.kev, new Set(taken)) : []),
    ...(spec.extra.orcid && io.orcidCandidates ? await io.orcidCandidates(spec.extra.orcid, new Set(taken)) : []),
  ];
  const extraPdf = spec.extra.arxiv.count ? await io.arxivCandidates(spec.extra.arxiv.count, new Set(taken)) : [];
  taken.clear();

  const record = (c: Candidate, stratum: Stratum, page: { httpStatus: number; mime: string; text?: string | null; pdfPages?: number }, truth: ContentsUrl["truth"]): ContentsUrl => ({
    id: "", url: c.url, stratum, origin: c.origin, answers: c.answers, answerPatterns: c.answerPatterns, truth,
    build: {
      on: today, httpStatus: page.httpStatus, mime: page.mime,
      chars: page.text ? page.text.length : null, contentSha256: page.text ? sha256(page.text) : null,
      answerAt: page.text && truth === "harness" ? answerOffset(page.text, keyOf(c)) : null,
      ...(page.pdfPages !== undefined ? { pdfPages: page.pdfPages } : {}),
    },
  });

  // HTML pages from the datasets: long or reference by the harness's text length. Read in one seeded order, so the
  // site cap and the stop rule apply to the order and never to how a page reads.
  const html = order(cands.filter((c) => c.kind === "html"), "html");
  const ok: { c: Candidate; page: Extract<FetchedPage, { status: "ok" }> }[] = [];
  const need = (s: Stratum) => spec.quotas[s] - picked[s].length;
  const readHtml = async (list: readonly Candidate[]) => {
    for (const c of list) {
      const k = urlKey(c.url);
      if (taken.has(k)) continue;
      const page = await io.readPage(c.url);
      if (page.status !== "ok") { dropped.push({ url: c.url, why: `unreadable (${page.reason})` }); continue; }
      if (!textHasAnswer(page.text, keyOf(c))) { dropped.push({ url: c.url, why: "the harness text does not hold the answer" }); continue; }
      taken.add(k);
      ok.push({ c, page });
    }
  };
  await readHtml(html);
  const longs = ok.filter((x) => x.page.text.length >= spec.longMinChars);
  const refs = ok.filter((x) => x.page.text.length < spec.longMinChars);
  const asUrl = (x: (typeof ok)[number]) => ({ url: x.c.url, x });
  for (const [s, list] of [["long", longs], ["reference", refs]] as const) {
    for (const { x } of pickWithSiteCap(list.map(asUrl), spec.quotas[s], spec.maxSiteShare)) {
      picked[s].push(record(x.c, s, { httpStatus: x.page.httpStatus, mime: "text/html", text: x.page.text }, "harness"));
    }
  }

  // Client-rendered pages: alive for the harness (2xx) but without the answer in its title or text; the cited record states it.
  // Two passes in one seeded order: first no site past its cap; then, if the stratum is not full, the deferred ones fill it.
  const jsOrder = order([...cands.filter((c) => c.kind === "js"), ...extraJs], "js");
  const jsCap = Math.max(1, Math.floor(spec.quotas.js * spec.maxSiteShare));
  const perSite = new Map<string, number>();
  const tryJs = async (c: Candidate) => {
    const k = urlKey(c.url);
    if (taken.has(k)) return;
    const page = await io.readPage(c.url);
    const status = page.httpStatus;
    const alive = page.status === "ok" || ((page.reason === "empty" || page.reason === "content-type") && status !== undefined && status >= 200 && status < 300);
    if (!alive) { dropped.push({ url: c.url, why: `unreadable (${page.status === "unreadable" ? page.reason : "?"})` }); return; }
    if (page.status === "ok" && textHasAnswer(`${page.title ?? ""}\n${page.text}`, keyOf(c))) { dropped.push({ url: c.url, why: "a plain GET already shows the answer (not client-rendered)" }); return; }
    taken.add(k);
    perSite.set(siteOf(c.url), (perSite.get(siteOf(c.url)) ?? 0) + 1);
    picked.js.push(record(c, "js", { httpStatus: status!, mime: "text/html", text: page.status === "ok" ? page.text : null }, "source"));
  };
  const deferred: Candidate[] = [];
  for (const c of jsOrder) {
    if (need("js") <= 0) break;
    if ((perSite.get(siteOf(c.url)) ?? 0) >= jsCap) { deferred.push(c); continue; }
    await tryJs(c);
  }
  for (const c of deferred) {
    if (need("js") <= 0) break;
    await tryJs(c);
  }

  // PDFs: read whole (within the byte limit) to count pages; long documents are left out.
  const pdf = order([...cands.filter((c) => c.kind === "pdf"), ...extraPdf], "pdf");
  for (const c of pdf) {
    if (need("pdf") <= 0) break;
    const k = urlKey(c.url);
    if (taken.has(k)) continue;
    // A paper whose metadata already states more pages than the cap is not downloaded at all.
    if (c.statedPages !== undefined && c.statedPages > spec.pdfMaxPages) { dropped.push({ url: c.url, why: `its arXiv comment states ${c.statedPages} pages, above ${spec.pdfMaxPages}` }); continue; }
    const doc = await io.readDocument(c.url);
    if (doc.status !== "ok") { dropped.push({ url: c.url, why: `unreadable (${doc.reason})` }); continue; }
    if (doc.pages === null) { dropped.push({ url: c.url, why: doc.truncated ? "larger than the byte limit" : "page count unreadable" }); continue; }
    if (doc.pages > spec.pdfMaxPages) { dropped.push({ url: c.url, why: `${doc.pages} pages, above ${spec.pdfMaxPages}` }); continue; }
    taken.add(k);
    picked.pdf.push(record(c, "pdf", { httpStatus: doc.httpStatus, mime: doc.mime, pdfPages: doc.pages }, "source"));
  }

  // Pooled: round robin over providers in a seeded order, the same number from each.
  // A provider without a finished run leaves the stratum empty: pooling from some providers only would favour them.
  const missing = spec.pooledProviders.filter((p) => !(pools.get(p)?.length));
  const providers = missing.length ? [] : order(spec.pooledProviders, "pool-providers");
  const per = providers.length ? Math.floor(spec.quotas.pooled / providers.length) : 0;
  const queues = new Map(providers.map((p) => [p, order(pools.get(p) ?? [], `pool:${p}`)]));
  const got = new Map(providers.map((p) => [p, 0]));
  for (let progress = true; progress;) {
    progress = false;
    for (const p of providers) {
      if (got.get(p)! >= per) continue;
      const q = queues.get(p)!;
      while (q.length) {
        const c = q.shift()!;
        const k = urlKey(c.url);
        if (taken.has(k)) continue;
        const page = await io.readPage(c.url);
        if (page.status !== "ok" || !textHasAnswer(page.text, keyOf(c))) { dropped.push({ url: c.url, why: page.status !== "ok" ? `unreadable (${page.reason})` : "the harness text no longer holds the answer" }); continue; }
        taken.add(k);
        const { text: _text, ...cand } = c;
        picked.pooled.push(record(cand, "pooled", { httpStatus: page.httpStatus, mime: "text/html", text: page.text }, "harness"));
        got.set(p, got.get(p)! + 1);
        progress = true;
        break;
      }
    }
  }
  // Equal counts: when one provider's candidates run out, every provider keeps only as many as it.
  const least = providers.length ? Math.min(...providers.map((p) => got.get(p)!)) : 0;
  const kept = new Map(providers.map((p) => [p, 0]));
  picked.pooled = picked.pooled.filter((u) => {
    const p = u.origin.provider!;
    if (kept.get(p)! >= least) { dropped.push({ url: u.url, why: `pooled from ${p} beyond the ${least} every provider could give` }); return false; }
    kept.set(p, kept.get(p)! + 1);
    return true;
  });
  const short: Partial<Record<Stratum, number>> = {};
  for (const s of Object.keys(picked) as Stratum[]) if (picked[s].length < spec.quotas[s]) short[s] = spec.quotas[s] - picked[s].length;
  if (missing.length) io.log(`pooled: no harness-read answer pages yet for ${missing.join(", ")}; the pooled stratum stays empty until their runs finish`);
  const urls: ContentsUrl[] = [];
  for (const s of Object.keys(picked) as Stratum[]) picked[s].forEach((u, i) => urls.push({ ...u, id: `cu-${s}-${String(i + 1).padStart(3, "0")}` }));
  return { urls, dropped, short };
}
