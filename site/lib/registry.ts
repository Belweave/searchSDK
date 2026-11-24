import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

/**
 * The provider registry loader: the only module that reads registry data. At build time it reads
 * every spec in ../registry/providers/*.json, checks the parts the site renders, and turns each into
 * a Provider view. Pages import from here, never from the JSON. A new spec file is a new provider
 * on every page with no page edits.
 *
 * The runtimes validate specs against registry/schema/provider.schema.json; this loader checks only
 * what the site needs and fails the build with the file and field when a spec does not fit.
 */

export const REGISTRY_DIR = path.join(process.cwd(), "..", "registry", "providers");

/**
 * Provider ids whose conformance vectors have passed against the live API. None has
 * (registry/README.md, "Versions"). Add an id only when that is true.
 */
const LIVE_VERIFIED: ReadonlySet<string> = new Set<string>();

// ---- Hues ----

/**
 * A provider's hue is a token in styles/tokens.css. Providers with a brand colour have their own
 * token (`--hue-<id>`, derived from that colour); any other provider takes the next free fallback
 * slot (`--hue-1` to `--hue-4`), so a new registry file never breaks the build.
 */
export type HueToken = `--hue-${string}`;

const OWN_HUES: ReadonlySet<string> = new Set(["brave", "context", "exa", "firecrawl", "perplexity", "tavily", "tinyfish"]);
const FALLBACK_SLOTS = 4;

/** The CSS value for a hue token. */
export function hueVar(token: HueToken): string {
  return `var(${token})`;
}

// ---- View model ----

/** One displayed fact. `unverified` holds the spec's reasons when it marks this fact unverified. */
export type Row = { label: string; value: string; pointer: string; unverified: string[] };

export type CostSource = "reported" | "reported-credits" | "computed" | "unknown";

export type Endpoint = {
  kind: "search" | "contents";
  /** searchSDK request options and whether this provider honours each. */
  options: Row[];
  /** Normalized result (search) or page (contents) fields and whether the provider fills each. */
  fields: Row[];
  /** Provider-scoped fields kept in `providerFields` (search only). */
  providerFields: string[];
  /** Names accepted under `providerOptions`. */
  providerOptions: string[];
  limits: Row[];
  cost: { source: CostSource; row: Row };
  pricing: { plan: string; source: string; retrievedOn: string; rows: Row[]; note: string | null };
  /** A short price for tables, in the spec's own unit. */
  priceSummary: Row;
  rateLimits: Row[];
  wire: Wire;
  /** List price numbers at the standard tier, for worked examples. */
  price: Price;
};

/** A list price: per request, plus a block price per N items beyond those included. null = unknown. */
export type Price = { perRequestUsd: number | null; block: { items: number; usd: number } | null; includedItems: number };

/** What one request returning `items` items costs at list price, or null when unknown. */
export function listPriceUsd(price: Price, items: number): number | null {
  if (price.perRequestUsd === null) return null;
  const extra = Math.max(0, items - price.includedItems);
  const blocks = price.block ? Math.ceil(extra / price.block.items) : 0;
  return price.perRequestUsd + blocks * (price.block?.usd ?? 0);
}

export type Source = { url: string; retrievedOn: string; covers: string };

/**
 * What a call looks like on the wire, read from the spec: method, URL, where the key goes (the
 * header or parameter name, never a value), fixed body fields, where searchSDK's own inputs land,
 * and where the normalized fields are read from in the provider's response.
 */
export type Wire = {
  method: "GET" | "POST";
  url: string;
  encoding: "json" | "query";
  auth: { in: string; name: string; prefix: string | null; env: string };
  fixed: Record<string, unknown>;
  /** searchSDK input name → provider parameter path (query, maxResults, urls). */
  params: Record<string, string>;
  /** Path of the result or page list in the response ("$" for the root). */
  list: string;
  /** Normalized field → provider path in each listed item. */
  fields: Record<string, string>;
  /** Normalized fields the provider returns as a list (the spec applies to-list). */
  listFields: string[];
  /** Where a reported cost is read, or null; creditUsd when the spec states a credit's price. */
  cost: { path: string; unit: "usd" | "credit"; creditUsd: number | null } | null;
};
export type UnverifiedEntry = { pointer: string; label: string; reason: string };

export type Provider = {
  id: string;
  name: string;
  hue: HueToken;
  /** The date the spec's facts were last read from the provider's docs. */
  specVersion: string;
  /** Environment variables the runtimes read the key from, in order. */
  env: string[];
  liveVerified: boolean;
  sources: Source[];
  search: Endpoint | null;
  contents: Endpoint | null;
  unverified: UnverifiedEntry[];
};

export type Registry = { providers: Provider[]; liveVerified: number };

// ---- Reading and checking ----

type Json = Record<string, unknown>;

class SpecError extends Error {
  constructor(file: string, where: string, message: string) {
    super(`registry/providers/${file} ${where}: ${message}`);
  }
}

function isObject(v: unknown): v is Json {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function makeReader(file: string) {
  const fail = (where: string, message: string): never => {
    throw new SpecError(file, where, message);
  };
  return {
    fail,
    obj(v: unknown, where: string): Json {
      return isObject(v) ? v : fail(where, "must be an object");
    },
    str(v: unknown, where: string): string {
      return typeof v === "string" && v.trim() ? v : fail(where, "must be a non-empty string");
    },
    date(v: unknown, where: string): string {
      return typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : fail(where, "must be a YYYY-MM-DD date");
    },
    url(v: unknown, where: string): string {
      return typeof v === "string" && /^https:\/\/\S+$/.test(v) ? v : fail(where, "must be an https URL");
    },
    arr(v: unknown, where: string): unknown[] {
      return Array.isArray(v) ? v : fail(where, "must be an array");
    },
    num(v: unknown, where: string, nullable = false): number | null {
      if (nullable && v === null) return null;
      return typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : fail(where, nullable ? "must be a number ≥ 0 or null" : "must be a number ≥ 0");
    },
  };
}

type Reader = ReturnType<typeof makeReader>;

/** A displayed fact at `fact` is covered by an unverified entry at `entry` when the entry is it or contains it. */
function covers(entry: string, fact: string): boolean {
  return fact === entry || fact.startsWith(`${entry}/`);
}

const SEARCH_OPTIONS = ["maxResults", "includeDomains", "excludeDomains", "recency", "startDate", "endDate", "country", "language", "depth"] as const;
const SEARCH_FIELDS = ["url", "title", "excerpts", "publishedAt", "author"] as const;
const PAGE_FIELDS = ["url", "finalUrl", "title", "content", "publishedAt", "author", "errorCode", "errorMessage"] as const;

/** USD with cents, and more places only when the price needs them ($7.00, $0.10, $0.0038). */
const usd = (v: number) => {
  if (v >= 1 || v === 0) return `$${v.toFixed(2)}`;
  const [whole, frac = ""] = String(Number(v.toPrecision(4))).split(".");
  return `$${whole}.${frac.padEnd(2, "0")}`;
};
const per1k = (v: number, unit: string) => `${usd(v * 1000)} per 1,000 ${unit}`;
const plural = (n: number, one: string, many: string) => (n === 1 ? one : `${n.toLocaleString("en-US")} ${many}`);

function endpoint(r: Reader, spec: Json, kind: "search" | "contents", mark: (pointer: string) => string[]): Endpoint {
  const base = `/${kind}`;
  const ep = r.obj(spec[kind], kind);
  const request = r.obj(ep.request, `${kind}.request`);
  const params = r.obj(request.params, `${kind}.request.params`);
  const compose = request.compose === undefined ? [] : r.arr(request.compose, `${kind}.request.compose`);
  const limits = r.obj(ep.limits, `${kind}.limits`);
  const response = r.obj(ep.response, `${kind}.response`);
  const pricing = r.obj(ep.pricing, `${kind}.pricing`);
  const row = (label: string, value: string, pointer: string): Row => ({ label, value, pointer, unverified: mark(pointer) });
  const items = kind === "search" ? "results" : "pages";

  // Request options.
  const options: Row[] = [];
  if (kind === "search") {
    const composed = new Map<string, number>();
    compose.forEach((c, i) => {
      for (const part of r.arr(r.obj(c, `${kind}.request.compose.${i}`).parts, `${kind}.request.compose.${i}.parts`)) {
        if (isObject(part) && typeof part.input === "string") composed.set(part.input, i);
      }
    });
    for (const name of SEARCH_OPTIONS) {
      if (name in params) options.push(row(name, "Yes", `${base}/request/params/${name}`));
      else if (composed.has(name)) options.push(row(name, "Yes", `${base}/request/compose/${composed.get(name)}`));
      else if (name === "maxResults") options.push(row(name, "Trimmed by searchSDK", `${base}/limits/maxResults`));
      else options.push(row(name, "No", `${base}/request/params/${name}`));
    }
  } else {
    if (!("urls" in params)) r.fail(`${kind}.request.params`, "must map urls");
    options.push(row("urls", "Yes", `${base}/request/params/urls`));
  }

  // Result or page fields.
  const fields: Row[] = [];
  if (kind === "search") {
    r.str(response.results, `${kind}.response.results`);
    const f = r.obj(response.fields, `${kind}.response.fields`);
    if (!("url" in f)) r.fail(`${kind}.response.fields`, "must map url");
    for (const name of SEARCH_FIELDS) fields.push(row(name, name in f ? "Yes" : "No", `${base}/response/fields/${name}`));
  } else {
    const sources = r.arr(response.pages, `${kind}.response.pages`).map((s, i) => r.obj(s, `${kind}.response.pages.${i}`));
    if (!sources.length) r.fail(`${kind}.response.pages`, "needs at least one source");
    for (const name of PAGE_FIELDS) {
      const i = sources.findIndex((s) => isObject(s.fields) && name in s.fields);
      fields.push(row(name, i >= 0 ? "Yes" : "No", i >= 0 ? `${base}/response/pages/${i}/fields/${name}` : `${base}/response/pages`));
    }
  }
  const providerFields = kind === "search" && isObject(response.providerFields) ? Object.keys(response.providerFields) : [];
  const providerOptions = Object.keys(r.obj(ep.providerOptions, `${kind}.providerOptions`));

  // Limits.
  const limitRows: Row[] = [];
  const lim = (name: string, label: string, format: (n: number | null) => string, nullable = false) => {
    if (!(name in limits)) return;
    limitRows.push(row(label, format(r.num(limits[name], `${kind}.limits.${name}`, nullable)), `${base}/limits/${name}`));
  };
  if (kind === "search") {
    lim("maxResults", "Results per query", (n) => String(n));
    lim("maxQueryLength", "Query length", (n) => (n === null ? "Not stated" : n.toLocaleString("en-US")), true);
    lim("maxIncludeDomains", "Included domains", (n) => (n === 0 ? "None" : n!.toLocaleString("en-US")));
    lim("maxExcludeDomains", "Excluded domains", (n) => (n === 0 ? "None" : n!.toLocaleString("en-US")));
    lim("maxTotalDomains", "Domains combined", (n) => n!.toLocaleString("en-US"));
    if (limits.includeExcludeExclusive === true) limitRows.push(row("Include and exclude together", "No", `${base}/limits/includeExcludeExclusive`));
  } else {
    lim("maxUrls", "URLs per request", (n) => String(n));
  }
  if (kind === "search") limitRows.push(row("Date filter basis", String(r.str(ep.dateBasis, `${kind}.dateBasis`)).replace(/-/g, " "), `${base}/dateBasis`));
  else limitRows.push(row("Content format", r.str(ep.contentFormat, `${kind}.contentFormat`), `${base}/contentFormat`));

  // Pricing.
  const p = (name: string) => `${base}/pricing/${name}`;
  const plan = r.str(pricing.plan, `${kind}.pricing.plan`);
  const pricingSource = r.url(pricing.source, `${kind}.pricing.source`);
  const retrievedOn = r.date(pricing.retrievedOn, `${kind}.pricing.retrievedOn`);
  const perRequest = pricing.perRequestUsd;
  const tiers: [string, number | null][] =
    perRequest === null || typeof perRequest === "number"
      ? [["standard", r.num(perRequest, `${kind}.pricing.perRequestUsd`, true)]]
      : Object.entries(r.obj(perRequest, `${kind}.pricing.perRequestUsd`)).map(([t, v]) => [t, r.num(v, `${kind}.pricing.perRequestUsd.${t}`, true)]);
  if (!tiers.some(([t]) => t === "standard")) r.fail(`${kind}.pricing.perRequestUsd`, "needs a standard tier");
  const block = pricing.extraBlock === undefined ? null : r.obj(pricing.extraBlock, `${kind}.pricing.extraBlock`);
  const blockItems = block ? (r.num(block.items, `${kind}.pricing.extraBlock.items`) as number) : 0;
  const blockUsd = block ? (r.num(block.usd, `${kind}.pricing.extraBlock.usd`) as number) : 0;
  const included = pricing.includedItems === undefined ? null : r.num(pricing.includedItems, `${kind}.pricing.includedItems`);
  const creditUsd = pricing.creditUsd === undefined ? null : r.num(pricing.creditUsd, `${kind}.pricing.creditUsd`);

  const pricingRows: Row[] = [row("Plan", plan, p("plan"))];
  const tiered = tiers.length > 1;
  for (const [tier, v] of tiers) {
    if (v === 0 && block) continue; // priced by item only
    const label = tiered ? `Per request (${tier})` : "Per request";
    pricingRows.push(row(label, v === null ? "Unknown" : per1k(v, "requests"), tiered ? p(`perRequestUsd/${tier}`) : p("perRequestUsd")));
  }
  if (included !== null) pricingRows.push(row("Included", `${included} ${items}`, p("includedItems")));
  const blockUnit = `${included !== null ? "extra " : ""}${blockItems === 1 ? items.slice(0, -1) : items}`;
  if (block) pricingRows.push(row(`Per ${blockItems === 1 ? "" : `${blockItems} `}${blockUnit}`, usd(blockUsd), p("extraBlock")));
  if (creditUsd !== null) pricingRows.push(row("Credit", usd(creditUsd), p("creditUsd")));
  const costOptions = pricing.costOptions === undefined ? [] : Object.keys(r.obj(pricing.costOptions, `${kind}.pricing.costOptions`));
  if (costOptions.length) pricingRows.push(row("Price-changing options", costOptions.join(", "), p("costOptions")));
  const note = typeof pricing.note === "string" && pricing.note.trim() ? pricing.note : null;

  const standard = tiers.find(([t]) => t === "standard")![1];
  const summaryValue =
    standard === null
      ? "Unknown"
      : standard === 0 && block
        ? `${usd(blockUsd)} per ${plural(blockItems, items.slice(0, -1), items)}`
        : per1k(standard, "requests");
  const priceSummary = row(tiered ? "Standard" : "Price", summaryValue, tiered ? p("perRequestUsd/standard") : p("perRequestUsd"));

  // Where the cost in each response comes from (registry/steps.md, "Cost").
  const reported = isObject(ep.cost) && isObject(ep.cost.reported) ? ep.cost.reported : null;
  let cost: Endpoint["cost"];
  if (reported) {
    const unit = reported.unit;
    if (unit !== "usd" && unit !== "credit") r.fail(`${kind}.cost.reported.unit`, "must be usd or credit");
    const value =
      unit === "usd"
        ? reported.isEstimate === true
          ? "Reported by the API, in USD, as an estimate"
          : "Reported by the API, in USD"
        : creditUsd === null
          ? "Reported by the API, in credits"
          : `Reported by the API, in credits at ${usd(creditUsd)} each`;
    cost = { source: unit === "usd" ? "reported" : "reported-credits", row: row("Cost", value, `${base}/cost/reported`) };
  } else if (standard === null) {
    cost = { source: "unknown", row: row("Cost", "Unknown: no public price", p("perRequestUsd")) };
  } else {
    cost = { source: "computed", row: row("Cost", "Computed from list prices", p("perRequestUsd")) };
  }

  const rateLimits = r.arr(ep.rateLimits, `${kind}.rateLimits`).map((x, i) => {
    const rl = r.obj(x, `${kind}.rateLimits.${i}`);
    const limit = (r.num(rl.limit, `${kind}.rateLimits.${i}.limit`) as number).toLocaleString("en-US");
    const per = r.str(rl.per, `${kind}.rateLimits.${i}.per`);
    const scope = typeof rl.scope === "string" ? `, per ${rl.scope}` : "";
    const extra = typeof rl.note === "string" ? ` (${rl.note})` : "";
    return row(r.str(rl.plan, `${kind}.rateLimits.${i}.plan`), `${per === "concurrent" ? `${limit} concurrent` : `${limit} per ${per}`}${scope}${extra}`, `${base}/rateLimits/${i}`);
  });

  const auth = r.obj(spec.auth, "auth");
  const fieldPath = (v: unknown) => (typeof v === "string" ? v : isObject(v) && typeof v.path === "string" ? v.path : null);
  const listSource = kind === "search" ? { list: String(response.results), fields: r.obj(response.fields, `${kind}.response.fields`) } : (() => {
    const first = r.obj(r.arr(response.pages, `${kind}.response.pages`)[0], `${kind}.response.pages.0`);
    return { list: typeof first.from === "string" ? first.from : "$", fields: isObject(first.fields) ? first.fields : {} };
  })();
  const wire: Wire = {
    method: request.method === "GET" ? "GET" : "POST",
    url: r.url(request.url, `${kind}.request.url`),
    encoding: request.encoding === "query" ? "query" : "json",
    auth: {
      in: r.str(auth.in, "auth.in"),
      name: r.str(auth.name, "auth.name"),
      prefix: typeof auth.prefix === "string" ? auth.prefix : null,
      env: r.str(r.arr(auth.env, "auth.env")[0], "auth.env.0"),
    },
    fixed: isObject(request.fixed) ? request.fixed : {},
    params: Object.fromEntries(
      Object.entries(params).flatMap(([name, v]) => (isObject(v) && typeof v.to === "string" ? [[name, v.to]] : [])),
    ),
    list: listSource.list,
    fields: Object.fromEntries(Object.entries(listSource.fields).flatMap(([name, v]) => {
      const fp = fieldPath(v);
      return fp ? [[name, fp]] : [];
    })),
    listFields: Object.entries(listSource.fields).flatMap(([name, v]) =>
      isObject(v) && Array.isArray(v.steps) && v.steps.some((st) => isObject(st) && st.step === "to-list") ? [name] : [],
    ),
    cost:
      reported && typeof reported.path === "string" && (reported.unit === "usd" || reported.unit === "credit")
        ? { path: reported.path, unit: reported.unit, creditUsd: creditUsd }
        : null,
  };

  return {
    kind,
    wire,
    price: { perRequestUsd: standard, block: block ? { items: blockItems, usd: blockUsd } : null, includedItems: included ?? 0 },
    options,
    fields,
    providerFields,
    providerOptions,
    limits: limitRows,
    cost,
    pricing: { plan, source: pricingSource, retrievedOn, rows: pricingRows, note },
    priceSummary,
    rateLimits,
  };
}

/** A readable name for a JSON pointer into a spec. */
function pointerLabel(pointer: string): string {
  const [kind, ...rest] = pointer.split("/").slice(1);
  const scope = kind === "search" ? "Search" : kind === "contents" ? "Contents" : null;
  if (!scope) return kind === "terms" ? "Terms" : kind === "index" ? "Index" : kind === "errors" ? "Error mapping" : (kind ?? pointer);
  const [section, a, b, c, d] = rest;
  const what = (() => {
    if (section === "request" && a === "params" && b) return `option ${b}`;
    if (section === "request" && a === "compose") return "date options";
    if (section === "request" && a === "fixed" && b) return `fixed request field ${b}`;
    if (section === "response" && a === "fields" && b) return `field ${b}`;
    if (section === "response" && a === "pages" && b !== undefined) return c === "fields" && d ? `page field ${d}` : "page mapping";
    if (section === "response" && a === "results") return "result list";
    if (section === "response" && a === "resultsOptional") return "empty result handling";
    if (section === "limits" && a) return `limit ${a}`;
    if (section === "pricing" && a) return `price ${[a, b].filter(Boolean).join(" ")}`;
    if (section === "cost") return "reported cost";
    if (section === "rateLimits") return "rate limits";
    if (section === "dateBasis") return "date filter basis";
    if (section === "contentFormat") return "content format";
    return [section, a].filter(Boolean).join(" ");
  })();
  return `${scope}: ${what}`;
}

function toProvider(file: string, spec: unknown, next: () => HueToken): Provider {
  const r = makeReader(file);
  const s = r.obj(spec, "spec");
  const id = r.str(s.id, "id");
  if (!/^[a-z][a-z0-9-]{0,31}$/.test(id)) r.fail("id", "must be lowercase letters, digits and dashes");
  if (`${id}.json` !== file) r.fail("id", `must match the file name (${id}.json)`);
  if (s.formatVersion !== 1) r.fail("formatVersion", "must be 1; the site reads format version 1 only");

  const unverified = r.arr(s.unverified, "unverified").map((u, i) => {
    const entry = r.obj(u, `unverified.${i}`);
    const pointer = r.str(entry.pointer, `unverified.${i}.pointer`);
    if (!pointer.startsWith("/")) r.fail(`unverified.${i}.pointer`, "must start with /");
    return { pointer, label: pointerLabel(pointer), reason: r.str(entry.reason, `unverified.${i}.reason`) };
  });
  const mark = (pointer: string) => unverified.filter((u) => covers(u.pointer, pointer)).map((u) => u.reason);

  const caps = r.obj(s.capabilities, "capabilities");
  const has = (kind: "search" | "contents") => {
    if (typeof caps[kind] !== "boolean") r.fail(`capabilities.${kind}`, "must be true or false");
    if (caps[kind] !== (s[kind] !== undefined)) r.fail(`capabilities.${kind}`, `says ${caps[kind]} but the ${kind} endpoint is ${s[kind] === undefined ? "absent" : "present"}`);
    return caps[kind] === true;
  };

  const hue: HueToken = OWN_HUES.has(id) ? `--hue-${id}` : next();

  return {
    id,
    name: r.str(s.name, "name"),
    hue,
    specVersion: r.date(s.specVersion, "specVersion"),
    env: r.arr(r.obj(s.auth, "auth").env, "auth.env").map((v, i) => r.str(v, `auth.env.${i}`)),
    liveVerified: LIVE_VERIFIED.has(id),
    sources: r.arr(s.sources, "sources").map((x, i) => {
      const src = r.obj(x, `sources.${i}`);
      return { url: r.url(src.url, `sources.${i}.url`), retrievedOn: r.date(src.retrievedOn, `sources.${i}.retrievedOn`), covers: r.str(src.covers, `sources.${i}.covers`) };
    }),
    search: has("search") ? endpoint(r, s, "search", mark) : null,
    contents: has("contents") ? endpoint(r, s, "contents", mark) : null,
    unverified,
  };
}

function load(): Registry {
  let files: string[];
  try {
    files = readdirSync(REGISTRY_DIR).filter((f) => f.endsWith(".json")).sort();
  } catch {
    throw new Error(`No provider registry at ${REGISTRY_DIR}. The site reads ../registry/providers/*.json.`);
  }
  if (!files.length) throw new Error(`${REGISTRY_DIR} has no provider specs.`);
  // Providers without a hue of their own share the fallback slots in file order; slots repeat past four.
  let slot = 0;
  const next = (): HueToken => `--hue-${(slot++ % FALLBACK_SLOTS) + 1}`;
  const providers = files
    .map((file) => toProvider(file, JSON.parse(readFileSync(path.join(REGISTRY_DIR, file), "utf8")), next))
    .sort((a, b) => a.name.localeCompare(b.name, "en"));
  return { providers, liveVerified: providers.filter((p) => p.liveVerified).length };
}

const registry = load();

/** How many conformance cases the registry holds for a provider (registry/conformance/providers/<id>.json), or 0. */
export function conformanceCases(id: string): number {
  try {
    const file = JSON.parse(readFileSync(path.join(REGISTRY_DIR, "..", "conformance", "providers", `${id}.json`), "utf8")) as unknown;
    return isObject(file) && Array.isArray(file.cases) ? file.cases.length : 0;
  } catch {
    return 0;
  }
}

export function getRegistry(): Registry {
  return registry;
}

export function getProvider(id: string): Provider | undefined {
  return registry.providers.find((p) => p.id === id);
}

export function providerName(id: string): string {
  return getProvider(id)?.name ?? id;
}

export function providerHue(id: string): string {
  const provider = getProvider(id);
  return provider ? hueVar(provider.hue) : "var(--fg-subtle)";
}

/** The one status statement for a provider. A fact about verification, not a sample label. */
export function statusLine(p: Provider): string {
  return p.liveVerified
    ? `Verified against the live API. Spec read ${p.specVersion}.`
    : `Not verified against the live API yet. Mapped from ${p.name}'s public docs, read ${p.specVersion}.`;
}

/** The one status statement for the whole registry. */
export function registryStatusLine(r: Registry): string {
  if (r.liveVerified === 0) return "None of these providers is verified against the live API yet. Each is mapped from its public docs.";
  if (r.liveVerified === r.providers.length) return "Every provider here is verified against the live API.";
  return `${r.liveVerified} of ${r.providers.length} providers are verified against the live API.`;
}
