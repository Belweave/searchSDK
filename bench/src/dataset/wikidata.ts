// Builds known-answer and freshness items from Wikidata (CC0-1.0) with fixed,
// published SPARQL templates. Candidates are chosen at random within each
// template by seed, never by how providers perform on them. Only entities with
// exactly one current value for the asked property are used, so every item has
// one verifiable answer, and the statement it came from is recorded.
import { addDays, rng, seedOf, shuffle } from "../util/core.ts";
import type { Item, QueryClass } from "./items.ts";

export const WIKIDATA_SPARQL = "https://query.wikidata.org/sparql";
const ENTITY = "http://www.wikidata.org/entity/";
const STATEMENT = "http://www.wikidata.org/entity/statement/";
export const BUILDER_VERSION = "1.0.0";

type Row = Record<string, string>;

export interface Template {
  id: string;
  class: QueryClass;
  lang: string;
  property: string;
  /** SPARQL returning one row per (subject, answer) with ?s ?sLabel ?o ?oLabel ?st and optional ?alts ?year ?sl ?extra. */
  sparql(today: string): string;
  question(row: Row): string | null;
  /** Optional extra validation of a candidate. */
  accept?(row: Row): boolean;
  /** Fresh items: days until the answer is presumed stale. */
  expiresInDays?: number;
}

const label = (lang: string) => `SERVICE wikibase:label { bd:serviceParam wikibase:language "${lang}". }`;
const alts = (v: string, lang: string) => `OPTIONAL { ?${v} skos:altLabel ?alt . FILTER(LANG(?alt) = "${lang}") }`;
const group = "GROUP BY ?s ?sLabel ?o ?oLabel ?st ?sl ?year ?extra";
const head = `SELECT ?s ?sLabel ?o ?oLabel ?st ?sl ?year ?extra (GROUP_CONCAT(DISTINCT ?alt; separator="|") AS ?alts) WHERE {`;

function capital(id: string, cls: QueryClass, lang: string, minSl: number, maxSl: number, ask: (country: string) => string): Template {
  return {
    id, class: cls, lang, property: "P36",
    sparql: () => `${head}
  ?s wdt:P31 wd:Q3624078 ; wikibase:sitelinks ?sl . FILTER(?sl >= ${minSl} && ?sl <= ${maxSl})
  FILTER NOT EXISTS { ?s wdt:P576 [] }
  ?s p:P36 ?st . ?st ps:P36 ?o . FILTER NOT EXISTS { ?st pq:P582 [] }
  ${alts("o", lang)}
  ${label(lang)}
} ${group}`,
    question: (r) => ask(r.sLabel!),
  };
}

/** A work and its single creator; `where` binds ?s (the work) from a bounded set, so the query stays fast. */
function creator(id: string, cls: QueryClass, prop: string, where: string, ask: (title: string, year: string | undefined) => string): Template {
  return {
    id, class: cls, lang: "en", property: prop,
    sparql: () => `${head}
  ${where}
  ?s p:${prop} ?st . ?st ps:${prop} ?o .
  OPTIONAL { ?s wdt:P577 ?date . BIND(STR(YEAR(?date)) AS ?year) }
  ${alts("o", "en")}
  ${label("en")}
} ${group}`,
    question: (r) => ask(r.sLabel!, r.year),
  };
}

/** Second hop: the birthplace of the work's single creator. */
function birthplace(id: string, prop: string, where: string, ask: (title: string, year: string | undefined) => string): Template {
  return {
    id, class: "multihop", lang: "en", property: `${prop}/P19`,
    sparql: () => `${head}
  ${where}
  ?s wdt:${prop} ?d . ?d p:P19 ?st . ?st ps:P19 ?o .
  OPTIONAL { ?s wdt:P577 ?date . BIND(STR(YEAR(?date)) AS ?year) }
  ${alts("o", "en")}
  ${label("en")}
} ${group}`,
    question: (r) => ask(r.sLabel!, r.year),
  };
}

// Bounded sets. Head: Best Picture winners; works listed as a Nobel literature laureate's notable work.
// Tail: films from eight smaller film industries and literary works in seven smaller languages, 2 to 6 sitelinks.
const BEST_PICTURE = "?s wdt:P166 wd:Q102427 ; wikibase:sitelinks ?sl .";
const NOBEL_WORK = "?a wdt:P166 wd:Q37922 ; wdt:P800 ?s . ?s wdt:P50 ?a ; wikibase:sitelinks ?sl .";
const SMALL_FILM = `VALUES ?c { wd:Q191 wd:Q189 wd:Q215 wd:Q77 wd:Q211 wd:Q37 wd:Q224 wd:Q218 }
  ?s wdt:P495 ?c ; wdt:P31 wd:Q11424 ; wikibase:sitelinks ?sl . FILTER(?sl >= 2 && ?sl <= 6)`;
const SMALL_WORK = `VALUES ?l { wd:Q9072 wd:Q294 wd:Q9063 wd:Q9078 wd:Q9083 wd:Q9035 wd:Q9043 }
  ?s wdt:P31 wd:Q7725634 ; wdt:P407 ?l ; wikibase:sitelinks ?sl . FILTER(?sl >= 2 && ?sl <= 5)`;
const yr = (y: string | undefined) => (y ? ` (${y})` : "");

export const TEMPLATES: Template[] = [
  capital("capital-en-head", "fact.head", "en", 220, 100000, (c) => `What is the capital city of ${c}?`),
  creator("nobel-work-author", "fact.head", "P50", NOBEL_WORK, (t, y) => `Who wrote ${t}${yr(y)}?`),
  creator("best-picture-director", "fact.head", "P57", BEST_PICTURE, (t, y) => `Who directed the film ${t}${yr(y)}?`),
  creator("small-language-work-author", "fact.tail", "P50", SMALL_WORK, (t, y) => `Who is the author of ${t}${yr(y)}?`),
  creator("small-industry-film-director", "fact.tail", "P57", SMALL_FILM, (t, y) => `Who directed the film ${t}${yr(y)}?`),
  birthplace("best-picture-director-birthplace", "P57", BEST_PICTURE, (t, y) => `In which city was the director of the film ${t}${yr(y)} born?`),
  birthplace("nobel-work-author-birthplace", "P50", NOBEL_WORK, (t, y) => `Where was the author of ${t}${yr(y)} born?`),
  {
    id: "language-designer", class: "tech", lang: "en", property: "P287",
    sparql: () => `${head}
  ?s wdt:P31 wd:Q9143 ; wikibase:sitelinks ?sl . FILTER(?sl >= 15)
  ?s p:P287 ?st . ?st ps:P287 ?o . ?o wdt:P31 wd:Q5 .
  ${alts("o", "en")}
  ${label("en")}
} ${group}`,
    question: (r) => (/programming language/i.test(r.sLabel!) ? `Who designed ${r.sLabel}?` : `Who designed the ${r.sLabel} programming language?`),
  },
  {
    id: "software-developer", class: "tech", lang: "en", property: "P178",
    sparql: () => `${head}
  VALUES ?k { wd:Q341 wd:Q7397 wd:Q1130645 wd:Q9135 wd:Q218616 }
  ?s wdt:P31 ?k ; wikibase:sitelinks ?sl . FILTER(?sl >= 25)
  ?s p:P178 ?st . ?st ps:P178 ?o .
  ${alts("o", "en")}
  ${label("en")}
} ${group}`,
    question: (r) => `Which organization or person develops the software ${r.sLabel}?`,
  },
  {
    id: "university-website", class: "nav", lang: "en", property: "P856",
    sparql: () => `SELECT ?s ?sLabel ?o ?st ?sl WHERE {
  ?s wdt:P31 wd:Q3918 ; wikibase:sitelinks ?sl . FILTER(?sl >= 40)
  ?s p:P856 ?st . ?st ps:P856 ?o . FILTER NOT EXISTS { ?st pq:P582 [] }
  ${label("en")}
}`,
    question: (r) => `Official website of ${r.sLabel}`,
  },
  capital("capital-fr", "nonen", "fr", 0, 100000, (c) => `${c} : quelle est sa capitale ?`),
  capital("capital-de", "nonen", "de", 0, 100000, (c) => `Was ist die Hauptstadt von ${c}?`),
  capital("capital-es", "nonen", "es", 0, 100000, (c) => `¿Cuál es la capital de ${c}?`),
  capital("capital-ja", "nonen", "ja", 0, 100000, (c) => `${c}の首都はどこですか？`),
  {
    id: "software-latest-version", class: "fresh", lang: "en", property: "P348", expiresInDays: 30,
    sparql: (today) => `SELECT ?s ?sLabel ?o ?st ?sl ?extra WHERE {
  VALUES ?k { wd:Q341 wd:Q7397 wd:Q9143 wd:Q218616 wd:Q1130645 wd:Q166142 wd:Q131093 wd:Q1639024 wd:Q9135 wd:Q19541 wd:Q178285 }
  ?s wdt:P31 ?k ; wikibase:sitelinks ?sl . FILTER(?sl >= 8)
  ?s p:P348 ?st . ?st ps:P348 ?o ; pq:P577 ?date ; pq:P548 wd:Q2804309 .
  FILTER(?date >= "${addDays(today, -45)}T00:00:00Z"^^xsd:dateTime && ?date <= "${today}T00:00:00Z"^^xsd:dateTime)
  BIND(STR(?date) AS ?extra)
  ${label("en")}
}`,
    question: (r) => `What is the latest stable version of ${r.sLabel}?`,
    accept: (r) => /^\d+(\.\d+){1,3}$/.test(r.o!),
  },
];

const strip = (v: string | undefined, prefix: string) => (v?.startsWith(prefix) ? v.slice(prefix.length) : v);
const isQid = (s: string | undefined) => !s || /^Q\d+$/.test(s);

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function aliasesFor(labelText: string, altText: string | undefined): string[] {
  const out = [labelText];
  for (const a of (altText ?? "").split("|")) {
    const t = a.trim();
    // Short or lowercase-only Latin aliases ("nyc", "pm") match unrelated text; keep names only.
    if (!t || out.includes(t)) continue;
    if (/^[\p{Script=Latin}\d .'-]+$/u.test(t) && (t.replace(/[^\p{L}\d]/gu, "").length < 4 || t === t.toLowerCase())) continue;
    out.push(t);
  }
  return out.slice(0, 12);
}

/** Turns one template's rows into candidate items. Subjects with more than one value are dropped. */
export function itemsFromRows(t: Template, rows: Row[], today: string): Omit<Item, "id">[] {
  const bySubject = new Map<string, Row[]>();
  for (const r of rows) {
    const s = strip(r.s, ENTITY)!;
    bySubject.set(s, [...(bySubject.get(s) ?? []), r]);
  }
  const out: Omit<Item, "id">[] = [];
  for (const [s, rs] of bySubject) {
    const values = new Set(rs.map((r) => r.o));
    const titles = new Set(rs.map((r) => r.extra ?? r.sLabel));
    if (values.size !== 1 || titles.size !== 1) continue;
    // Works list several publication dates (one per country); the question names the earliest year.
    const years = rs.map((x) => x.year).filter((y): y is string => !!y && /^\d{3,4}$/.test(y)).sort();
    const r: Row = { ...rs[0]!, ...(years.length ? { year: years[0]! } : {}) };
    if (isQid(r.sLabel)) continue;
    if (t.accept && !t.accept(r)) continue;
    if (t.class === "fresh") {
      // The newest stable version only, and only when no other stable version shares its date.
      continue;
    }
    const query = t.question(r);
    if (!query) continue;
    const base = {
      split: "public" as const, class: t.class, lang: t.lang, query,
      source: {
        name: "wikidata" as const, url: `https://www.wikidata.org/wiki/${s}#${t.property.split("/")[0]}`, entity: s,
        path: t.property.split("/"), statement: strip(r.st, STATEMENT)!, retrievedOn: today,
      },
      licence: "CC0-1.0" as const, asOf: today,
      builder: { template: t.id, version: BUILDER_VERSION },
      review: { status: "builder-checked" as const, on: today },
    };
    if (t.class === "nav") {
      const url = r.o!;
      if (!/^https?:\/\/[^\s/]+/.test(url)) continue;
      out.push({ ...base, answers: [], answerPatterns: [], answerUrls: [url] });
      continue;
    }
    if (isQid(r.oLabel)) continue;
    out.push({ ...base, answers: aliasesFor(r.oLabel!, r.alts), answerPatterns: [], answerUrls: [] });
  }
  return out;
}

/** Freshness: per software, the newest stable version released in the window, when it is unique on its date. */
export function freshItemsFromRows(t: Template, rows: Row[], today: string): Omit<Item, "id">[] {
  const bySubject = new Map<string, Row[]>();
  for (const r of rows) {
    if (t.accept && !t.accept(r)) continue;
    const s = strip(r.s, ENTITY)!;
    bySubject.set(s, [...(bySubject.get(s) ?? []), r]);
  }
  const out: Omit<Item, "id">[] = [];
  for (const [s, rs] of bySubject) {
    if (isQid(rs[0]!.sLabel)) continue;
    const newest = rs.reduce((m, r) => (r.extra! > m ? r.extra! : m), "");
    const top = [...new Set(rs.filter((r) => r.extra === newest).map((r) => r.o!))];
    if (top.length !== 1) continue;
    const version = top[0]!;
    const older = [...new Set(rs.filter((r) => r.extra! < newest).map((r) => r.o!))].filter((v) => v !== version);
    const r = rs.find((x) => x.o === version && x.extra === newest)!;
    const query = t.question(r);
    if (!query) continue;
    out.push({
      split: "fresh", class: "fresh", lang: "en", query,
      answers: [],
      // The version as a whole token: not part of a longer version such as 1.2.30 or 11.2.3.
      answerPatterns: [`(?<![\\w.])v?${escapeRegex(version)}(?![\\w]|\\.\\d)`],
      answerUrls: [],
      superseded: older.slice(0, 10),
      source: { name: "wikidata", url: `https://www.wikidata.org/wiki/${s}#P348`, entity: s, path: ["P348"], statement: strip(r.st, STATEMENT)!, retrievedOn: today },
      licence: "CC0-1.0", asOf: today, expires: addDays(today, t.expiresInDays ?? 30),
      builder: { template: t.id, version: BUILDER_VERSION },
      review: { status: "builder-checked", on: today, note: `released ${newest.slice(0, 10)} per Wikidata` },
    });
  }
  return out;
}

export interface BuildOptions {
  templates: { id: string; count: number }[];
  seed: number;
  today: string;
  fetch: typeof globalThis.fetch;
  idPrefix: string;
  /** Normalized queries already used elsewhere, so sets never overlap. */
  exclude?: Set<string>;
  log?: (line: string) => void;
}

/** Runs each template once against the Wikidata Query Service and samples items from its candidates. */
export async function buildFromWikidata(o: BuildOptions): Promise<Item[]> {
  const items: Item[] = [];
  const used = new Set(o.exclude ?? []);
  const entities = new Set<string>();
  for (const want of o.templates) {
    const t = TEMPLATES.find((x) => x.id === want.id);
    if (!t) throw new Error(`unknown template ${want.id}`);
    let res: Response | null = null;
    for (let tries = 0; tries < 4; tries++) {
      res = await o.fetch(`${WIKIDATA_SPARQL}?query=${encodeURIComponent(t.sparql(o.today))}`, {
        headers: { accept: "application/sparql-results+json", "user-agent": "open-benchmark-dataset-builder/1.0 (generic client)" },
      });
      if (res.ok || ![429, 500, 502, 503, 504].includes(res.status)) break;
      await new Promise((r) => setTimeout(r, 5000 * (tries + 1)));
    }
    if (!res?.ok) throw new Error(`Wikidata returned ${res?.status} for template ${t.id}`);
    const body = (await res.json()) as { results: { bindings: Record<string, { value: string }>[] } };
    const rows = body.results.bindings.map((b) => Object.fromEntries(Object.entries(b).map(([k, v]) => [k, v.value])));
    const candidates = t.class === "fresh" ? freshItemsFromRows(t, rows, o.today) : itemsFromRows(t, rows, o.today);
    const picked: Omit<Item, "id">[] = [];
    for (const c of shuffle(candidates.sort((a, b) => a.source.entity!.localeCompare(b.source.entity!)), rng(seedOf(o.seed, t.id)))) {
      if (picked.length >= want.count) break;
      const key = c.query.toLowerCase();
      const entity = `${c.source.entity}:${t.property}`;
      if (used.has(key) || entities.has(entity)) continue;
      used.add(key);
      entities.add(entity);
      picked.push(c);
    }
    o.log?.(`${t.id}: ${rows.length} rows, ${candidates.length} candidates, ${picked.length} picked`);
    for (const c of picked) items.push({ id: `${o.idPrefix}-${t.id}-${String(items.filter((i) => i.builder.template === t.id).length + 1).padStart(3, "0")}`.slice(0, 60), ...c } as Item);
  }
  return items;
}
