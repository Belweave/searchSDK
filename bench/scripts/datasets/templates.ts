// Wikidata templates added for public-1.0.0 and private-1.0.0, beside the seed
// templates in src/dataset/wikidata.ts. Same rules: a fixed, published SPARQL
// query per template; one current value for the asked property; candidates
// drawn at random by seed, never by how providers do on them. Every template
// varies the subject domain (art, business, music, architecture, software,
// public bodies) so no class rests on one kind of fact.
import { alts, group, head, label, TEMPLATES, type Template } from "../../src/dataset/wikidata.ts";
import type { QueryClass } from "../../src/dataset/items.ts";

type Row = Record<string, string>;
const yr = (y: string | undefined) => (y ? ` (${y})` : "");

/** A subject and its single value for `prop`; `where` binds ?s from a bounded set. `human` requires ?o to be a person. */
function single(id: string, cls: QueryClass, lang: string, prop: string, where: string, ask: (r: Row) => string | null, o: { human?: boolean; current?: boolean } = {}): Template {
  return {
    id, class: cls, lang, property: prop,
    sparql: () => `${head}
  ${where}
  ?s p:${prop} ?st . ?st ps:${prop} ?o .${o.current ? " FILTER NOT EXISTS { ?st pq:P582 [] }" : ""}${o.human ? " ?o wdt:P31 wd:Q5 ." : ""}
  OPTIONAL { ?s wdt:P577 ?date . BIND(STR(YEAR(?date)) AS ?year) }
  OPTIONAL { ?s wdt:P571 ?inc . BIND(STR(YEAR(?inc)) AS ?year) }
  ${alts("o", lang)}
  ${label(lang)}
} ${group}`,
    question: ask,
  };
}

/** Second hop: the birthplace (P19) of the subject's single `prop` value, which must be a person. */
function birthplace(id: string, prop: string, where: string, ask: (r: Row) => string): Template {
  return {
    id, class: "multihop", lang: "en", property: `${prop}/P19`,
    sparql: () => `${head}
  ${where}
  ?s wdt:${prop} ?d . ?d wdt:P31 wd:Q5 . ?d p:P19 ?st . ?st ps:P19 ?o .
  OPTIONAL { ?s wdt:P577 ?date . BIND(STR(YEAR(?date)) AS ?year) }
  OPTIONAL { ?s wdt:P571 ?inc . BIND(STR(YEAR(?inc)) AS ?year) }
  ${alts("o", "en")}
  ${label("en")}
} ${group}`,
    question: ask,
  };
}

/** Official website (P856). Only root URLs on a host of the subject's own, so any page on that host is the official site. */
function website(id: string, where: string, ask: (name: string) => string): Template {
  return {
    id, class: "nav", lang: "en", property: "P856",
    sparql: () => `SELECT ?s ?sLabel ?o ?st ?sl WHERE {
  ${where}
  ?s p:P856 ?st . ?st ps:P856 ?o . FILTER NOT EXISTS { ?st pq:P582 [] }
  ${label("en")}
}`,
    question: (r) => ask(r.sLabel!),
    accept: (r) => rootUrl(r.o!),
  };
}

/** Hosts shared by many unrelated owners: a match on them proves nothing. */
const SHARED_HOSTS = /(^|\.)(github\.com|gitlab\.com|sourceforge\.net|bitbucket\.org|google\.com|facebook\.com|twitter\.com|x\.com|wikipedia\.org|wordpress\.com|blogspot\.com|gov\.uk|europa\.eu|un\.org|canada\.ca|gouv\.fr|bund\.de|admin\.ch|gov\.au|govt\.nz|usa\.gov)$/i;
export function rootUrl(url: string): boolean {
  try {
    const u = new URL(url);
    if (!/^https?:$/.test(u.protocol) || u.search || u.hash) return false;
    if (SHARED_HOSTS.test(u.hostname)) return false;
    return /^\/?((en|en-us|en-gb|english|home|index\.html?)\/?)?$/i.test(u.pathname);
  } catch {
    return false;
  }
}

// Bounded subject sets.
// Paintings are bounded by collection: eleven large museums, and eight national galleries of smaller countries.
const BIG_MUSEUMS = "wd:Q19675 wd:Q160236 wd:Q190804 wd:Q160112 wd:Q180788 wd:Q51252 wd:Q132783 wd:Q188740 wd:Q239303 wd:Q23402 wd:Q95569";
const SMALL_MUSEUMS = "wd:Q842858 wd:Q153306 wd:Q754507 wd:Q861252 wd:Q252071 wd:Q671384 wd:Q3330707 wd:Q2983474";
const PAINTING = (museums: string, lo: number, hi: number) => `VALUES ?m { ${museums} }
  ?s wdt:P195 ?m ; wdt:P31 wd:Q3305213 ; wikibase:sitelinks ?sl . FILTER(?sl >= ${lo} && ?sl <= ${hi})`;
/** Generic painting titles name many works; they are not one subject. */
const GENERIC_TITLE = /^(untitled|portrait|self-portrait|landscape|still life|study|sketch|head of|bust of|man |woman |girl |boy |a |an |the |agony|epiphany|adoration|annunciation|crucifixion|madonna|virgin|saint|st\.? |holy family|lamentation|piet|nativity|christ|deposition|resurrection|altarpiece|triptych|flowers|interior|view of)/i;
const COMPANY = "?s wdt:P31 wd:Q891723 ; wikibase:sitelinks ?sl . FILTER(?sl >= 60)";
const OPERA = "?s wdt:P31 wd:Q1344 ; wikibase:sitelinks ?sl . FILTER(?sl >= 2 && ?sl <= 4)";
const BUILDING = (lo: number, hi: number) => `?s wdt:P31 wd:Q41176 ; wikibase:sitelinks ?sl . FILTER(?sl >= ${lo} && ?sl <= ${hi})`;
const SKYSCRAPER = "?s wdt:P31 wd:Q11303 ; wikibase:sitelinks ?sl . FILTER(?sl >= 2 && ?sl <= 5)";
const SMALL_FILM = `VALUES ?c { wd:Q191 wd:Q189 wd:Q215 wd:Q77 wd:Q211 wd:Q37 wd:Q224 wd:Q218 }
  ?s wdt:P495 ?c ; wdt:P31 wd:Q11424 ; wikibase:sitelinks ?sl . FILTER(?sl >= 2 && ?sl <= 6)`;
const FILE_FORMAT = "?s wdt:P31 wd:Q235557 ; wikibase:sitelinks ?sl . FILTER(?sl >= 8)";
const BEST_PICTURE = "?s wdt:P166 wd:Q102427 ; wikibase:sitelinks ?sl .";
const NOBEL_WORK = "?a wdt:P166 wd:Q37922 ; wdt:P800 ?s . ?s wdt:P50 ?a ; wikibase:sitelinks ?sl .";
// Films that won the top prize at the Academy Awards, Cannes, Venice or Berlin.
const PRIZE_FILM = "VALUES ?aw { wd:Q102427 wd:Q179808 wd:Q209459 wd:Q154590 } ?s wdt:P166 ?aw ; wdt:P31 wd:Q11424 ; wikibase:sitelinks ?sl .";

export const NEW_TEMPLATES: Template[] = [
  // fact.head: popular subjects (many sitelinks).
  single("painting-artist-head", "fact.head", "en", "P170", PAINTING(BIG_MUSEUMS, 25, 100000), (r) => `Who painted ${r.sLabel}${yr(r.year)}?`, { human: true }),
  single("company-headquarters", "fact.head", "en", "P159", COMPANY, (r) => `In which city is the company ${r.sLabel} headquartered?`, { current: true }),
  // fact.tail: obscure subjects (few sitelinks).
  { ...single("painting-artist-tail", "fact.tail", "en", "P170", PAINTING(SMALL_MUSEUMS, 1, 3), (r) => (r.year ? `Who painted ${r.sLabel} (${r.year})?` : null), { human: true }), accept: (r) => !GENERIC_TITLE.test(r.sLabel!) },
  single("opera-composer-tail", "fact.tail", "en", "P86", OPERA, (r) => `Who composed the opera ${r.sLabel}${yr(r.year)}?`, { human: true }),
  single("building-architect-tail", "fact.tail", "en", "P84", SKYSCRAPER, (r) => `Who was the architect of ${r.sLabel}${yr(r.year)}?`, { human: true }),
  // multihop: an attribute of a work's creator.
  birthplace("painting-artist-birthplace", "P170", PAINTING(`${BIG_MUSEUMS} ${SMALL_MUSEUMS}`, 8, 100000), (r) => `In which city was the painter of ${r.sLabel}${yr(r.year)} born?`),
  birthplace("small-film-director-birthplace", "P57", SMALL_FILM, (r) => `In which town or city was the director of the film ${r.sLabel}${yr(r.year)} born?`),
  birthplace("building-architect-birthplace", "P84", BUILDING(5, 100000), (r) => `Where was the architect of ${r.sLabel}${yr(r.year)} born?`),
  // tech.
  single("file-format-developer", "tech", "en", "P178", FILE_FORMAT, (r) => `Which organization or person developed the ${/format/i.test(r.sLabel!) ? r.sLabel : `${r.sLabel} file format`}?`),
  // nav: official sites of different kinds of owner.
  website("software-website", "VALUES ?k { wd:Q9143 wd:Q341 wd:Q1130645 wd:Q218616 wd:Q7397 } ?s wdt:P31 ?k ; wikibase:sitelinks ?sl . FILTER(?sl >= 20)", (n) => `Official website of ${n}`),
  website("agency-website", "?s wdt:P31 wd:Q327333 ; wikibase:sitelinks ?sl . FILTER(?sl >= 15)", (n) => `Official website of ${n}`),
  website("intl-org-website", "?s wdt:P31 wd:Q484652 ; wikibase:sitelinks ?sl . FILTER(?sl >= 25)", (n) => `Official website of ${n}`),
  website("museum-website", "?s wdt:P31 wd:Q33506 ; wikibase:sitelinks ?sl . FILTER(?sl >= 30)", (n) => `Official website of ${n}`),
  // nonen: works and films asked and answered in another language (Latin, Cyrillic and Han scripts).
  single("work-author-fr", "nonen", "fr", "P50", NOBEL_WORK, (r) => `Qui est l'auteur de « ${r.sLabel} »${yr(r.year)} ?`),
  single("work-author-ru", "nonen", "ru", "P50", NOBEL_WORK, (r) => `Кто автор произведения «${r.sLabel}»${yr(r.year)}?`),
  single("film-director-it", "nonen", "it", "P57", PRIZE_FILM, (r) => `Chi ha diretto il film ${r.sLabel}${yr(r.year)}?`),
  single("film-director-pt", "nonen", "pt", "P57", PRIZE_FILM, (r) => `Quem dirigiu o filme ${r.sLabel}${yr(r.year)}?`),
  single("film-director-zh", "nonen", "zh", "P57", PRIZE_FILM, (r) => `电影《${r.sLabel}》${r.year ? `（${r.year}年）` : ""}的导演是谁？`),
  single("painting-artist-de", "nonen", "de", "P170", PAINTING(BIG_MUSEUMS, 20, 100000), (r) => `Wer hat das Gemälde ${r.sLabel}${yr(r.year)} gemalt?`, { human: true }),
  // Seed templates keep their own definitions.
  ...TEMPLATES.filter((t) => t.class !== "fresh"),
];

// Expose the bounded sets the fresh builder reuses.
export { BEST_PICTURE, NOBEL_WORK };
