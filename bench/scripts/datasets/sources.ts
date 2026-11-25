// Item templates over openly licensed sources other than Wikidata, plus the
// Wikidata freshness templates. Each turns a public record into candidate
// items; nothing here calls a search provider or looks at search results.
//
// Sources and licences (checked 2026-11-25):
//   pep             peps.python.org/api/peps.json  each PEP: "placed in the public domain or under the CC0-1.0-Universal license"
//   cisa-kev        CISA Known Exploited Vulnerabilities catalog  CC0-1.0 (cisagov/kev-data LICENSE)
//   endoflife-date  endoflife.date/api/v1/products/full  MIT (endoflife-date/endoflife.date LICENSE)
//   arxiv           export.arxiv.org/api  descriptive metadata under CC0-1.0 (arXiv API terms of use)
//   wikidata        query.wikidata.org  CC0-1.0
import { addDays } from "../../src/util/core.ts";
import type { Item, QueryClass } from "../../src/dataset/items.ts";
import { aliasesFor, freshItemsFromRows, TEMPLATES, WIKIDATA_SPARQL, type Template } from "../../src/dataset/wikidata.ts";

export type Candidate = Omit<Item, "id">;
export const UA = "open-benchmark-dataset-builder/1.0 (generic client)";
const BUILDER_VERSION = "1.0.0";

export interface SourceContext {
  today: string;
  fetch: typeof globalThis.fetch;
  log: (line: string) => void;
}

export interface SourceTemplate {
  id: string;
  class: QueryClass;
  /** Candidates in a stable order (the caller shuffles by seed). `key` names the subject, so no subject is used twice. */
  candidates(ctx: SourceContext, split: "public" | "fresh"): Promise<(Candidate & { subject: string })[]>;
}

async function getJson<T>(ctx: SourceContext, url: string, init: RequestInit = {}): Promise<T> {
  for (let tries = 0; ; tries++) {
    const res = await ctx.fetch(url, { ...init, headers: { "user-agent": UA, accept: "application/json", ...(init.headers ?? {}) } });
    if (res.ok) return (await res.json()) as T;
    if (tries >= 5 || ![429, 500, 502, 503, 504].includes(res.status)) throw new Error(`${url} returned ${res.status}`);
    const after = Number(res.headers.get("retry-after"));
    await new Promise((r) => setTimeout(r, Number.isFinite(after) && after > 0 ? after * 1000 : 10_000 * (tries + 1)));
  }
}

async function getText(ctx: SourceContext, url: string): Promise<string> {
  for (let tries = 0; ; tries++) {
    const res = await ctx.fetch(url, { headers: { "user-agent": UA } });
    if (res.ok) return res.text();
    if (tries >= 3 || ![429, 500, 502, 503, 504].includes(res.status)) throw new Error(`${url} returned ${res.status}`);
    await new Promise((r) => setTimeout(r, 5000 * (tries + 1)));
  }
}

export function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** A version as a whole token: not part of a longer version such as 1.2.30 or 11.2.3. */
export const versionPattern = (v: string) => `(?<![\\w.])v?${escapeRegex(v)}(?![\\w]|\\.\\d)`;

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
/** 2026-11-25 as "25 November 2026". */
export function longDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[m! - 1]} ${y}`;
}

const review = (on: string, note?: string) => ({ status: "builder-checked" as const, on, ...(note ? { note } : {}) });

// ---- PEPs (tech) ----

export const pepAuthor: SourceTemplate = {
  id: "pep-author", class: "tech",
  async candidates(ctx) {
    const peps = await getJson<Record<string, { number: number; title: string; author_names: string[]; status: string; type: string; url: string }>>(ctx, "https://peps.python.org/api/peps.json");
    return Object.values(peps)
      // Accepted or final technical PEPs with one or two authors, so the answer set is small and every name in it is right.
      .filter((p) => p.type === "Standards Track" && ["Final", "Accepted"].includes(p.status) && p.author_names.length >= 1 && p.author_names.length <= 2)
      .sort((a, b) => a.number - b.number)
      .map((p) => ({
        subject: `pep:${p.number}`,
        split: "public" as const, class: "tech" as const, lang: "en",
        query: `Who wrote PEP ${p.number}, "${p.title}"?`,
        answers: p.author_names, answerPatterns: [], answerUrls: [],
        source: { name: "pep" as const, url: p.url, path: [`PEP-${String(p.number).padStart(4, "0")}`], retrievedOn: ctx.today },
        licence: "CC0-1.0" as const, asOf: ctx.today,
        builder: { template: "pep-author", version: BUILDER_VERSION }, review: review(ctx.today),
      }));
  },
};

// ---- CISA KEV (tech, and fresh) ----

interface Kev { cveID: string; vendorProject: string; product: string; dateAdded: string }
/** Product names that alone would match a great deal of unrelated text. */
const GENERIC_PRODUCT = /^(multiple products?|windows|office|chrome|android|ios|macos|linux|kernel|firmware|server|router|browser)$/i;

/**
 * KEV product strings carry catalog wording that pages rarely repeat ("WF2419 Devices", "Exchange Server (ESP)")
 * and often generic words ("Core", "Media Server"). Answers: vendor and product together (without a parenthetical
 * or a trailing generic word); the product alone only when it is one distinctive word (FortiOS, PAN-OS); the
 * parenthetical when it is a name of four or more characters. Products joined with "and" are left to the reviewer.
 */
const GENERIC_WORD = /^(core|server|client|agent|gateway|portal|manager|console|platform|suite|framework|plugin|module|library|service|services|system|application|app|router|switch|firewall|kernel|engine|studio|cloud|edge|hub|connect|support|commerce)$/i;
export function kevAnswers(vendor: string, product: string): string[] {
  const paren = /\(([^)]+)\)/.exec(product)?.[1]?.trim();
  const clean = product.replace(/\([^)]*\)/g, " ").replace(/\b(devices?|software|ui|products?|component)\s*$/i, "").replace(/\s+/g, " ").trim();
  const v = vendor.replace(/\([^)]*\)/g, " ").replace(/\s+/g, " ").trim();
  const out = [clean.toLowerCase().startsWith(v.toLowerCase()) ? clean : `${v} ${clean}`];
  if (!/\s/.test(clean) && !GENERIC_WORD.test(clean)) out.push(clean);
  if (paren && paren.replace(/[^\p{L}\d]/gu, "").length >= 4) out.push(paren);
  return [...new Set(out.filter((x) => x.replace(/[^\p{L}\d]/gu, "").length >= 3))];
}

function kevItems(ctx: SourceContext, vulns: Kev[], template: string, split: "public" | "fresh", cls: QueryClass): (Candidate & { subject: string })[] {
  return vulns
    .filter((v) => !GENERIC_PRODUCT.test(v.product.trim()) && v.product.trim().toLowerCase() !== v.vendorProject.trim().toLowerCase())
    .sort((a, b) => a.cveID.localeCompare(b.cveID))
    .map((v) => ({
      subject: v.cveID,
      split, class: cls, lang: "en",
      query: `Which product is affected by ${v.cveID}?`,
      answers: kevAnswers(v.vendorProject, v.product), answerPatterns: [], answerUrls: [],
      source: { name: "cisa-kev" as const, url: `https://www.cve.org/CVERecord?id=${v.cveID}`, path: [v.cveID], retrievedOn: ctx.today },
      licence: "CC0-1.0" as const, asOf: ctx.today,
      ...(split === "fresh" ? { expires: addDays(ctx.today, 30) } : {}),
      builder: { template, version: BUILDER_VERSION },
      review: review(ctx.today, `added to the KEV catalog ${v.dateAdded}`),
    }));
}

async function kevCatalog(ctx: SourceContext): Promise<Kev[]> {
  return (await getJson<{ vulnerabilities: Kev[] }>(ctx, "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json")).vulnerabilities;
}

/** Public: entries added before 2026, so the answer is long settled. */
export const kevProduct: SourceTemplate = {
  id: "kev-product", class: "tech",
  async candidates(ctx) {
    return kevItems(ctx, (await kevCatalog(ctx)).filter((v) => v.dateAdded < "2026-01-01"), "kev-product", "public", "tech");
  },
};

/** Fresh: CVEs of this year added to the catalog in the last 45 days. */
export const kevRecent: SourceTemplate = {
  id: "kev-recent", class: "fresh",
  async candidates(ctx) {
    const from = addDays(ctx.today, -45);
    const year = ctx.today.slice(0, 4);
    const recent = (await kevCatalog(ctx)).filter((v) => v.dateAdded >= from && v.dateAdded < ctx.today && v.cveID.startsWith(`CVE-${year}-`));
    return kevItems(ctx, recent, "kev-recent", "fresh", "fresh");
  },
};

// ---- endoflife.date (fresh) ----

interface EolRelease { name: string; isEol: boolean; latest?: { name: string; date: string } | null }
interface EolProduct { name: string; label: string; links?: { html?: string }; releases: EolRelease[] }

/** The latest patch of a maintained release line, released in the last 45 days, asked "as of" the build date so it cannot go stale. */
export const eolRelease: SourceTemplate = {
  id: "eol-release", class: "fresh",
  async candidates(ctx) {
    const from = addDays(ctx.today, -45);
    const products = (await getJson<{ result: EolProduct[] }>(ctx, "https://endoflife.date/api/v1/products/full")).result;
    const out: (Candidate & { subject: string })[] = [];
    for (const p of [...products].sort((a, b) => a.name.localeCompare(b.name))) {
      const lines = p.releases.filter((r) => !r.isEol && r.latest && r.latest.date >= from && r.latest.date < ctx.today
        && /^\d+(\.\d+){1,3}$/.test(r.latest.name) && r.latest.name !== r.name && r.latest.name.startsWith(`${r.name}.`));
      // One line per product: the most recently patched, then the highest.
      const r = lines.sort((a, b) => b.latest!.date.localeCompare(a.latest!.date) || b.name.localeCompare(a.name, undefined, { numeric: true }))[0];
      if (!r) continue;
      const others = p.releases.filter((x) => x !== r && !x.isEol && x.latest?.date === r.latest!.date);
      out.push({
        subject: `eol:${p.name}`,
        split: "fresh", class: "fresh", lang: "en",
        query: `What was the latest ${p.label} ${r.name} release as of ${longDate(ctx.today)}?`,
        answers: [], answerPatterns: [versionPattern(r.latest!.name)], answerUrls: [],
        source: { name: "endoflife-date", url: p.links?.html ?? `https://endoflife.date/${p.name}`, path: [`${p.name}:${r.name}`], retrievedOn: ctx.today },
        licence: "MIT", asOf: ctx.today, expires: addDays(ctx.today, 30),
        builder: { template: "eol-release", version: BUILDER_VERSION },
        review: review(ctx.today, `released ${r.latest!.date} per endoflife.date${others.length ? `; ${others.length} other lines patched the same day` : ""}`),
      });
    }
    return out;
  },
};

// ---- arXiv (fresh) ----

const ARXIV_GROUPS = ["cs", "math", "physics", "astro-ph", "cond-mat", "q-bio", "q-fin", "stat", "econ", "eess"];

function decodeXml(s: string): string {
  return s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
}

/** The first author of a paper first posted in the window (5 to 40 days ago, so it has had time to be indexed), across ten subject groups. */
export const arxivFirstAuthor: SourceTemplate = {
  id: "arxiv-first-author", class: "fresh",
  async candidates(ctx) {
    const from = addDays(ctx.today, -40).replace(/-/g, "");
    const to = addDays(ctx.today, -5).replace(/-/g, "");
    const out: (Candidate & { subject: string })[] = [];
    for (const g of ARXIV_GROUPS) {
      const q = `cat:${g === "cs" || g === "math" || g === "q-bio" || g === "q-fin" || g === "stat" || g === "econ" || g === "eess" ? `${g}.*` : g === "physics" ? "physics.*" : g === "cond-mat" ? "cond-mat.*" : g} AND submittedDate:[${from}0000 TO ${to}2359]`;
      const xml = await getText(ctx, `https://export.arxiv.org/api/query?search_query=${encodeURIComponent(q)}&sortBy=submittedDate&sortOrder=ascending&max_results=60`);
      await new Promise((r) => setTimeout(r, 3500)); // arXiv asks for one request every three seconds.
      for (const entry of xml.split("<entry>").slice(1)) {
        const id = /<id>https?:\/\/arxiv\.org\/abs\/([^<]+?)(v\d+)?<\/id>/.exec(entry)?.[1];
        const version = /<id>[^<]*?(v\d+)<\/id>/.exec(entry)?.[1];
        const title = decodeXml(/<title>([\s\S]*?)<\/title>/.exec(entry)?.[1] ?? "");
        const author = decodeXml(/<author>\s*<name>([\s\S]*?)<\/name>/.exec(entry)?.[1] ?? "");
        const published = /<published>([^<]+)<\/published>/.exec(entry)?.[1]?.slice(0, 10);
        // First versions only; titles long enough to name one paper; no TeX; a full name of at least two words.
        if (!id || version !== "v1" || !published || title.split(" ").length < 6 || /[$\\{}^_]/.test(title) || author.split(" ").length < 2) continue;
        out.push({
          subject: `arxiv:${id}`,
          split: "fresh", class: "fresh", lang: "en",
          query: `Who is the first author of the arXiv paper "${title}"?`,
          answers: [author], answerPatterns: [], answerUrls: [],
          source: { name: "arxiv", url: `https://arxiv.org/abs/${id}`, path: [id], retrievedOn: ctx.today },
          licence: "CC0-1.0", asOf: ctx.today, expires: addDays(ctx.today, 30),
          builder: { template: "arxiv-first-author", version: BUILDER_VERSION },
          review: review(ctx.today, `first posted ${published} (${g})`),
        });
      }
    }
    return out.sort((a, b) => a.subject.localeCompare(b.subject));
  },
};

// ---- Wikidata freshness ----

async function sparql(ctx: SourceContext, query: string): Promise<Record<string, string>[]> {
  const body = await getJson<{ results: { bindings: Record<string, { value: string }>[] } }>(ctx, WIKIDATA_SPARQL, {
    method: "POST", headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/sparql-results+json" },
    body: new URLSearchParams({ query }).toString(),
  });
  return body.results.bindings.map((b) => Object.fromEntries(Object.entries(b).map(([k, v]) => [k, v.value])));
}

/** The latest stable version of a piece of software (Wikidata P348), asked "as of" the build date so it cannot go stale. */
export const softwareVersionAsOf: SourceTemplate = {
  id: "software-version-asof", class: "fresh",
  async candidates(ctx) {
    const base = TEMPLATES.find((t) => t.id === "software-latest-version")!;
    const t: Template = { ...base, id: "software-version-asof", question: (r) => `What was the latest stable version of ${r.sLabel} as of ${longDate(ctx.today)}?` };
    const rows = await sparql(ctx, t.sparql(ctx.today));
    return freshItemsFromRows(t, rows, ctx.today).map((c) => ({ ...c, subject: c.source.entity!, builder: { template: t.id, version: BUILDER_VERSION } }))
      .sort((a, b) => a.subject.localeCompare(b.subject));
  },
};

/**
 * Who won an event that ended in the last 45 days (Wikidata P1346 winner, or P991 successful candidate for elections).
 * Recent events are found with Wikidata's own search (haswbstatement), then checked by SPARQL: the date is in the
 * window and there is exactly one winner, a person.
 */
export const eventWinner: SourceTemplate = {
  id: "event-winner", class: "fresh",
  async candidates(ctx) {
    const year = ctx.today.slice(0, 4);
    const from = addDays(ctx.today, -45);
    const qids = new Set<string>();
    for (const prop of ["P1346", "P991"]) {
      for (let offset = 0; offset < 10000; offset += 500) {
        const url = `https://www.wikidata.org/w/api.php?action=query&list=search&format=json&srlimit=500&sroffset=${offset}&srsearch=${encodeURIComponent(`haswbstatement:${prop} ${year}`)}`;
        const r = await getJson<{ query: { search: { title: string }[] }; continue?: unknown }>(ctx, url);
        for (const s of r.query.search) if (/^Q\d+$/.test(s.title)) qids.add(s.title);
        if (!r.continue) break;
        await new Promise((res) => setTimeout(res, 2000));
      }
    }
    ctx.log(`event-winner: ${qids.size} items with a winner and "${year}" in their text`);
    const rows: Record<string, string>[] = [];
    const list = [...qids].sort();
    for (let i = 0; i < list.length; i += 400) {
      rows.push(...(await sparql(ctx, `SELECT ?s ?sLabel ?o ?oLabel ?st ?d (GROUP_CONCAT(DISTINCT ?alt; separator="|") AS ?alts) WHERE {
  VALUES ?s { ${list.slice(i, i + 400).map((q) => `wd:${q}`).join(" ")} }
  { ?s p:P1346 ?st . ?st ps:P1346 ?o . } UNION { ?s p:P991 ?st . ?st ps:P991 ?o . }
  ?o wdt:P31 wd:Q5 .
  { ?s wdt:P585 ?d } UNION { ?s wdt:P582 ?d }
  FILTER(?d >= "${from}T00:00:00Z"^^xsd:dateTime && ?d < "${ctx.today}T00:00:00Z"^^xsd:dateTime)
  OPTIONAL { ?o skos:altLabel ?alt . FILTER(LANG(?alt) = "en") }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
} GROUP BY ?s ?sLabel ?o ?oLabel ?st ?d`)));
    }
    const bySubject = new Map<string, Record<string, string>[]>();
    for (const r of rows) {
      const s = r.s!.replace("http://www.wikidata.org/entity/", "");
      bySubject.set(s, [...(bySubject.get(s) ?? []), r]);
    }
    const out: (Candidate & { subject: string })[] = [];
    for (const [s, rs] of [...bySubject].sort((a, b) => a[0].localeCompare(b[0]))) {
      if (new Set(rs.map((r) => r.o)).size !== 1) continue; // one winner only
      const r = rs[0]!;
      if (/^Q\d+$/.test(r.sLabel!) || /^Q\d+$/.test(r.oLabel!) || !r.sLabel!.includes(year)) continue;
      const prop = r.st!.includes("P991") ? "P991" : "P1346";
      out.push({
        subject: s,
        split: "fresh", class: "fresh", lang: "en",
        query: `Who won the ${r.sLabel}?`,
        answers: aliasesFor(r.oLabel!, r.alts), answerPatterns: [], answerUrls: [],
        source: { name: "wikidata", url: `https://www.wikidata.org/wiki/${s}`, entity: s, path: [prop], statement: r.st!.replace("http://www.wikidata.org/entity/statement/", ""), retrievedOn: ctx.today },
        licence: "CC0-1.0", asOf: ctx.today, expires: addDays(ctx.today, 30),
        builder: { template: "event-winner", version: BUILDER_VERSION },
        review: review(ctx.today, `event dated ${r.d!.slice(0, 10)} per Wikidata`),
      });
    }
    return out;
  },
};

export const SOURCE_TEMPLATES: SourceTemplate[] = [pepAuthor, kevProduct, kevRecent, eolRelease, arxivFirstAuthor, softwareVersionAsOf, eventWinner];
