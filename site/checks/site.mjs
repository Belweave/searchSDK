// Crawl a running searchSDK site and check every page.
//   node checks/site.mjs http://localhost:3210
// Fails (exit 1) on: broken internal links, missing or out-of-range titles and descriptions,
// pages or regions over their word cap, sample data without its label or outside a labelled
// region, pending placeholder data that differs between providers, banned words, misspelt
// product name, repeated disclaimers, missing trademark line, third-party resources, analytics
// that is not first party (a PostHog host in a page, a CSP that allows another origin, robots.txt
// not disallowing /ingest/),
// credential-like strings, provider logos without a reserved box, alt text, SVG type or a
// recorded source, and stubs that answer anything but 501. Brand rules
// (brand/GUIDELINES.md): the name spelt searchSDK everywhere a reader or a crawler sees it; every
// page carries the lockup at or above its minimum size, drawn only with the brand's own paths and
// colours; no provider logo taller than searchSDK's mark; at most one apricot primary key per
// section; the favicon, icons, manifest and social images present and served.
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  BASE_JSON_LD,
  ANALYTICS,
  BANNED_PATTERNS,
  BANNED_WORDS,
  DESCRIPTION_RANGE,
  MARK_MIN_PX,
  MARKDOWN_PAGES,
  NAME,
  NAME_PATTERN,
  ONCE_ONLY,
  PAGE_CAPS,
  REQUIRED_FILES,
  REQUIRED_HEAD,
  REQUIRED_JSON_LD,
  REQUIRED_ON_EVERY_PAGE,
  SAMPLE_LABEL,
  STUBS,
  TITLE_RANGE,
} from "./config.mjs";
import { attr, byTag, contentRoot, countWords, findAll, findFirst, hasAttr, parseHtml, textNodes, textParts, walk } from "./html.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export async function checkSite(base, { log = console.log } = {}) {
  const origin = new URL(base).origin;
  const failures = [];
  const fail = (where, message) => failures.push(`${where}: ${message}`);
  const pages = new Map(); // path -> { status, type, body }
  const linkedFrom = new Map(); // path -> first referrer

  async function get(p, init) {
    const res = await fetch(new URL(p, origin), { redirect: "manual", ...init });
    return { status: res.status, type: res.headers.get("content-type") ?? "", body: await res.text(), headers: res.headers };
  }

  // Seed from the sitemap, the required files and the home page, then follow every internal link.
  const queue = ["/", ...REQUIRED_FILES];
  const sitemap = await get("/sitemap.xml");
  const siteOrigins = new Set([origin]);
  for (const m of sitemap.body.matchAll(/<loc>([^<]+)<\/loc>/g)) {
    const u = new URL(m[1]);
    siteOrigins.add(u.origin); // the canonical domain maps onto the server under test
    queue.push(u.pathname);
  }
  const sitemapPaths = new Set(queue.slice(1 + REQUIRED_FILES.length));
  const canonicalOrigin = [...siteOrigins].find((o) => o !== origin) ?? origin;
  for (const m of sitemap.body.matchAll(/<url>([\s\S]*?)<\/url>/g)) {
    const lastmod = m[1].match(/<lastmod>([^<]+)<\/lastmod>/)?.[1];
    if (lastmod && Number.isNaN(Date.parse(lastmod))) fail("/sitemap.xml", `lastmod "${lastmod}" is not a date`);
  }
  if (!/^https:\/\/[^/]+$/.test(canonicalOrigin) || /\/\/www\./.test(canonicalOrigin)) fail("/sitemap.xml", `canonical origin ${canonicalOrigin} is not https without www`);
  const robots = await get("/robots.txt");
  if (!robots.body.includes(`Sitemap: ${canonicalOrigin}/sitemap.xml`)) fail("/robots.txt", "does not point at the canonical sitemap");
  // Each group that disallows /api/ also disallows the analytics proxy.
  const count = (re) => (robots.body.match(re) ?? []).length;
  const ingestRules = count(new RegExp(`^Disallow: ${ANALYTICS.proxyPath}$`, "gim"));
  if (!ingestRules || ingestRules !== count(/^Disallow: \/api\/$/gim)) fail("/robots.txt", `does not disallow ${ANALYTICS.proxyPath} in every group`);

  // Content Security Policy: scripts and connections stay on this origin (analytics included).
  const home = await get("/");
  const csp = home.headers.get("content-security-policy") ?? "";
  for (const directive of ANALYTICS.cspSelfOnly) {
    const value = csp.split(";").map((d) => d.trim()).find((d) => d.startsWith(`${directive} `));
    if (!value) fail("/", `CSP has no ${directive}`);
    else if (/https?:|\*/.test(value)) fail("/", `CSP ${directive} allows another origin: ${value}`);
  }

  const toLocal = (href, from) => {
    if (!href || href.startsWith("#") || /^(mailto|tel|javascript):/i.test(href)) return null;
    const u = new URL(href, new URL(from, origin));
    if (!siteOrigins.has(u.origin)) return null;
    if (u.pathname.startsWith(ANALYTICS.proxyPath)) return null; // the analytics proxy reaches PostHog
    return u.pathname;
  };

  while (queue.length) {
    const p = queue.shift();
    if (pages.has(p)) continue;
    const res = await get(p);
    pages.set(p, res);
    if (res.status !== 200) {
      fail(p, `returned ${res.status}${linkedFrom.has(p) ? ` (linked from ${linkedFrom.get(p)})` : ""}`);
      continue;
    }
    if (!res.type.includes("text/html")) continue;
    const doc = parseHtml(res.body);
    for (const a of findAll(doc, (n) => n.tagName === "a" || (n.tagName === "link" && attr(n, "rel") !== "preload"))) {
      const local = toLocal(attr(a, "href"), p);
      if (local === null || local.startsWith("/_next/")) continue;
      if (!linkedFrom.has(local)) linkedFrom.set(local, p);
      if (!pages.has(local)) queue.push(local);
    }
  }

  // Strings from sample files that would identify sample data if they leaked outside a region.
  const sampleStrings = await sampleFingerprints();
  // Pending placeholders must treat every provider the same.
  for (const problem of await pendingProblems()) fail("data", problem);

  const brandShapes = await brandSvgParts();
  const headAssets = new Set();
  const report = [];
  const onceCounts = ONCE_ONLY.map(() => []);
  const brandFiles = new Set();
  const brandFolders = new Set();

  for (const [p, page] of pages) {
    if (page.status !== 200 || !page.type.includes("text/html")) continue;
    const doc = parseHtml(page.body);
    const head = findFirst(doc, byTag("head"));

    // Title and description.
    const title = findFirst(head, byTag("title"))?.childNodes?.[0]?.value?.trim() ?? "";
    const description = attr(findFirst(head, (n) => n.tagName === "meta" && attr(n, "name") === "description") ?? {}, "content") ?? "";
    if (!title) fail(p, "missing <title>");
    else if (title.length < TITLE_RANGE[0] || title.length > TITLE_RANGE[1]) fail(p, `title is ${title.length} characters (${TITLE_RANGE.join("–")}): "${title}"`);
    if (!description) fail(p, "missing meta description");
    else if (description.length < DESCRIPTION_RANGE[0] || description.length > DESCRIPTION_RANGE[1]) fail(p, `description is ${description.length} characters (${DESCRIPTION_RANGE.join("–")})`);
    if (!attr(findFirst(doc, byTag("html")), "lang")) fail(p, "missing <html lang>");
    if (findAll(doc, byTag("h1")).length !== 1) fail(p, `has ${findAll(doc, byTag("h1")).length} <h1> elements; expected 1`);

    // Skip link: first focusable element, pointing at an element that exists.
    const firstLink = findFirst(findFirst(doc, byTag("body")), (n) => n.tagName === "a" || n.tagName === "button");
    const skipTarget = attr(firstLink ?? {}, "href")?.slice(1);
    if (!skipTarget || !findFirst(doc, (n) => attr(n, "id") === skipTarget)) fail(p, "first focusable element is not a working skip link");

    // Word caps.
    const root = contentRoot(doc);
    if (!root) {
      fail(p, "no <main> or docs article to count");
      continue;
    }
    const parts = textParts(root);
    const words = countWords(parts.copy);
    const dataWords = countWords(parts.data);
    const cap = PAGE_CAPS.find((c) => c.match(p));
    if (words > cap.cap) fail(p, `${words} visible words; the ${cap.name} cap is ${cap.cap}`);
    const regions = [];
    for (const region of findAll(root, (n) => hasAttr(n, "data-cap"))) {
      const n = countWords(textParts(region).copy);
      const regionCap = Number(attr(region, "data-cap"));
      const name = attr(region, "data-cap-name") ?? "region";
      regions.push(`${name} ${n}/${regionCap}`);
      if (n > regionCap) fail(p, `${name} has ${n} visible words; its cap is ${regionCap}`);
    }

    // Sample data: every region labelled, nothing from a sample file outside a region.
    const sampleRegions = findAll(doc, (n) => hasAttr(n, "data-sample"));
    for (const region of sampleRegions) {
      const label = findFirst(region, (n) => hasAttr(n, "data-sample-label"));
      const labelText = label ? textNodes(label).map((t) => t.text).join(" ") : "";
      if (!SAMPLE_LABEL.re.test(labelText)) fail(p, `a sample data region has no visible label saying “${SAMPLE_LABEL.says}”`);
    }
    const outside = textNodes(findFirst(doc, byTag("body")))
      .filter((t) => !t.inSample)
      .map((t) => t.text)
      .join(" ");
    for (const s of sampleStrings) {
      if (outside.includes(s)) fail(p, `sample data outside a labelled region: “${s}”`);
    }

    // Copy rules on visible prose (code and chrome excluded).
    const prose = parts.copy;
    for (const word of BANNED_WORDS) {
      if (new RegExp(`\\b${word.replace(/[-\s]/g, "[-\\s]")}\\b`, "i").test(prose)) fail(p, `uses “${word}”`);
    }
    // The name: visible text outside code (copy and data), head text, alt text and labels.
    const metaText = findAll(head, (n) => n.tagName === "meta" && /^(og|twitter):(title|description|site_name|image:alt)$/.test(attr(n, "property") ?? attr(n, "name") ?? "")).map((n) => attr(n, "content") ?? "");
    const labels = findAll(doc, (n) => n.tagName && (attr(n, "alt") !== undefined || attr(n, "aria-label") !== undefined || attr(n, "title") !== undefined)).flatMap((n) => [attr(n, "alt"), attr(n, "aria-label"), attr(n, "title")].filter(Boolean));
    for (const text of [prose, parts.data, title, description, ...metaText, ...labels]) {
      for (const m of text.matchAll(NAME_PATTERN)) {
        // A domain, path or package specifier (searchsdk.dev, /searchsdk-0.0.0.tgz) is an address, not the name.
        const before = text[m.index - 1] ?? "";
        const after = text[m.index + m[0].length] ?? "";
        if (/[./@-]/.test(before) || /[./-]/.test(after)) continue;
        if (m[0] !== NAME) fail(p, `writes the name as “${m[0]}”; it is always ${NAME}`);
      }
    }

    // searchSDK's mark: the lockup on every page at or above its minimum; every drawn mark at or
    // above its own; only the brand files' own paths and colours (never redrawn or recoloured).
    const lockups = findAll(doc, (n) => /\bssdk-lockup\b/.test(attr(n, "class") ?? ""));
    if (!lockups.length) fail(p, "no searchSDK lockup (components/brand/searchsdk.tsx)");
    const lockupPx = Math.max(0, ...lockups.map((n) => Number(attr(n, "data-mark-px"))));
    for (const n of lockups) if (!(Number(attr(n, "data-mark-px")) >= MARK_MIN_PX.lockup)) fail(p, `lockup mark is ${attr(n, "data-mark-px")}px; the minimum is ${MARK_MIN_PX.lockup}px`);
    for (const n of findAll(doc, (n) => /\bssdk-markbox\b/.test(attr(n, "class") ?? ""))) {
      if (!(Number(attr(n, "data-mark-px")) >= MARK_MIN_PX.mark)) fail(p, `mark is ${attr(n, "data-mark-px")}px; the minimum is ${MARK_MIN_PX.mark}px`);
    }
    for (const svg of findAll(doc, (n) => n.tagName === "svg" && /\bssdk-svg\b/.test(attr(n, "class") ?? ""))) {
      for (const path of findAll(svg, byTag("path"))) {
        if (!brandShapes.paths.has(attr(path, "d"))) fail(p, "searchSDK's mark has a path that is not in the brand's files (redrawn)");
        const fill = attr(path, "fill");
        if (fill && !brandShapes.fills.has(fill.toUpperCase())) fail(p, `searchSDK's mark is filled ${fill}, not a brand colour (recoloured)`);
      }
    }

    // Provider logos are never set taller than searchSDK's mark (nominal height, data-size).
    if (lockupPx) {
      for (const n of findAll(doc, (n) => attr(n, "data-size") !== undefined && /\b(brand-img|brand-monogram)\b/.test(attr(n, "class") ?? ""))) {
        if (Number(attr(n, "data-size")) > lockupPx) fail(p, `a provider logo is ${attr(n, "data-size")}px tall, taller than searchSDK's ${lockupPx}px mark`);
      }
    }

    // One apricot primary action per view: at most one key-beam in any section.
    const beams = findAll(doc, (n) => /\bkey-beam\b/.test(attr(n, "class") ?? ""));
    const sectionOf = (key) => {
      let owner = null;
      walk(doc, (n, ancestors) => {
        if (n === key) owner = [...ancestors].reverse().find((a) => a.tagName === "section" || a.tagName === "main" || a.tagName === "header") ?? null;
      });
      return owner;
    };
    const perSection = new Map();
    for (const b of beams) {
      const owner = sectionOf(b);
      perSection.set(owner, (perSection.get(owner) ?? 0) + 1);
    }
    for (const count of perSection.values()) if (count > 1) fail(p, `${count} apricot primary keys (key-beam) in one section; the brand allows one per view`);

    // Icons, manifest and social images from brand/dist.
    for (const req of REQUIRED_HEAD) {
      const node = findFirst(head, (n) => req.test(n, attr));
      if (!node) fail(p, `missing ${req.name} in <head>`);
      else headAssets.add(attr(node, "href") ?? attr(node, "content"));
    }
    ONCE_ONLY.forEach((rule, i) => {
      if (rule.phrase.test(prose)) onceCounts[i].push(p);
    });
    const allText = textNodes(findFirst(doc, byTag("body"))).map((t) => t.text).join(" ");
    for (const re of REQUIRED_ON_EVERY_PAGE) if (!re.test(allText)) fail(p, `missing required text ${re}`);

    // Resources: nothing loaded from another origin.
    for (const n of findAll(doc, (n) => ["script", "img", "iframe", "source", "video", "audio"].includes(n.tagName) || (n.tagName === "link" && attr(n, "rel") === "stylesheet"))) {
      const src = attr(n, "src") ?? attr(n, "href");
      if (src && /^(https?:)?\/\//.test(src) && !siteOrigins.has(new URL(src, origin).origin)) fail(p, `loads ${src} from another origin`);
    }

    // Provider logos: the providers' own files from public/providers/, each with a reserved box
    // (width and height) and an alt attribute, and its folder recorded in SOURCES.md.
    for (const img of findAll(doc, byTag("img"))) {
      const src = attr(img, "src") ?? "";
      const m = src.match(/^\/providers\/([a-z0-9-]+)\/[^/]+\.svg$/);
      if (!m) continue;
      if (!attr(img, "width") || !attr(img, "height")) fail(p, `provider logo ${src} has no width and height (layout shift)`);
      if (attr(img, "alt") === undefined) fail(p, `provider logo ${src} has no alt attribute`);
      brandFiles.add(src);
      brandFolders.add(m[1]);
    }

    // Indexable HTML pages belong in the sitemap.
    const noindex = /noindex/i.test(attr(findFirst(head, (n) => n.tagName === "meta" && attr(n, "name") === "robots") ?? {}, "content") ?? "");
    if (!noindex && !sitemapPaths.has(p)) fail(p, "indexable page missing from the sitemap");

    // Search: one canonical URL on the canonical host, naming this page, and og:url agreeing.
    if (!noindex) {
      const canonical = attr(findFirst(head, (n) => n.tagName === "link" && attr(n, "rel") === "canonical") ?? {}, "href");
      // The home page's canonical may drop its trailing slash: https://host and https://host/ are one URL.
      const expected = p === "/" ? [canonicalOrigin, `${canonicalOrigin}/`] : [`${canonicalOrigin}${p}`];
      if (!canonical) fail(p, "missing <link rel=canonical>");
      else if (!expected.includes(canonical)) fail(p, `canonical is ${canonical}; expected ${expected.at(-1)}`);
      const ogUrl = attr(findFirst(head, (n) => n.tagName === "meta" && attr(n, "property") === "og:url") ?? {}, "content");
      if (canonical && ogUrl !== canonical) fail(p, `og:url ${ogUrl} differs from the canonical URL`);
    }

    // Agents: the Markdown copy, linked from <head> (the crawl above fetched it).
    if (MARKDOWN_PAGES(p)) {
      const alt = attr(findFirst(head, (n) => n.tagName === "link" && attr(n, "rel") === "alternate" && attr(n, "type") === "text/markdown") ?? {}, "href");
      const local = alt ? toLocal(alt, p) : null;
      if (!local) fail(p, "no <link rel=alternate type=text/markdown>");
      else {
        const md = pages.get(local) ?? (await get(local));
        if (md.status !== 200 || !md.type.includes("text/markdown")) fail(local, `Markdown copy answered ${md.status} ${md.type}`);
      }
    }

    // Structured data: every JSON-LD block parses; each page has the base entities and its own types; a
    // FAQPage asks only questions the page shows as headings.
    const ldTypes = new Set();
    const ldNodes = [];
    for (const script of findAll(doc, (n) => n.tagName === "script" && attr(n, "type") === "application/ld+json")) {
      const text = script.childNodes?.map((c) => c.value ?? "").join("") ?? "";
      let json;
      try {
        json = JSON.parse(text);
      } catch (e) {
        fail(p, `JSON-LD does not parse: ${e.message}`);
        continue;
      }
      if (json["@context"] !== "https://schema.org") fail(p, `JSON-LD @context is ${json["@context"]}`);
      for (const node of json["@graph"] ?? [json]) {
        ldNodes.push(node);
        ldTypes.add(node["@type"]);
      }
    }
    if (!noindex) {
      const required = [...BASE_JSON_LD, ...REQUIRED_JSON_LD.filter((r) => r.match(p)).flatMap((r) => r.types)];
      for (const type of required) if (!ldTypes.has(type)) fail(p, `JSON-LD has no ${type}`);
    }
    // A heading's own text, without the copy-link button Fumadocs puts beside it.
    const headingText = (h) => {
      const out = [];
      walk(h, (n) => (n.tagName === "button" || n.tagName === "svg" ? false : (n.nodeName === "#text" && out.push(n.value), true)));
      return out.join("").replace(/\s+/g, " ").trim();
    };
    const headings = new Set(findAll(root, (n) => /^h[2-3]$/.test(n.tagName)).map(headingText));
    for (const node of ldNodes.filter((n) => n["@type"] === "FAQPage")) {
      for (const q of node.mainEntity ?? []) {
        if (!headings.has(q.name)) fail(p, `FAQPage question “${q.name}” is not a heading on the page`);
        if (!q.acceptedAnswer?.text) fail(p, `FAQPage question “${q.name}” has no answer`);
      }
    }
    for (const node of ldNodes.filter((n) => n["@type"] === "BreadcrumbList")) {
      for (const item of node.itemListElement ?? []) {
        const local = toLocal(item.item, p);
        if (!local || !pages.has(local)) fail(p, `breadcrumb ${item.item} is not a crawled page`);
      }
    }

    report.push({ path: p, words, cap: cap.cap, dataWords, regions, sample: sampleRegions.length });
  }

  ONCE_ONLY.forEach((rule, i) => {
    if (onceCounts[i].length > rule.pages) fail("site", `${rule.phrase} appears on ${onceCounts[i].length} pages (${onceCounts[i].join(", ")}); say it once`);
  });

  // Every body served: banned patterns.
  for (const [p, page] of pages) {
    for (const { name, re } of BANNED_PATTERNS) {
      const m = page.body.match(re);
      if (m) fail(p, `contains a ${name}: “${m[0].slice(0, 40)}”`);
    }
  }

  // Every provider logo a page uses is served from this site as SVG, and its source is recorded.
  const sources = await readFile(path.join(ROOT, "public", "providers", "SOURCES.md"), "utf8").catch(() => "");
  if (brandFiles.size && !sources) fail("public/providers/SOURCES.md", "missing: provider logos need their sources recorded");
  for (const id of brandFolders) {
    if (!sources.includes(`(\`${id}\`)`)) fail("public/providers/SOURCES.md", `no section for provider folder "${id}" (a heading ending in (\`${id}\`))`);
  }
  for (const src of brandFiles) {
    const res = await get(src);
    if (res.status !== 200) fail(src, `provider logo returned ${res.status}`);
    else if (!res.type.includes("image/svg+xml")) fail(src, `provider logo served as ${res.type}`);
    else if (/<script|\son[a-z]+\s*=|javascript:/i.test(res.body)) fail(src, "provider logo contains script");
  }
  log(`provider logos checked (${brandFiles.size} files, ${brandFolders.size} providers)`);

  // Every icon, manifest and social image the heads point at is served.
  for (const href of headAssets) {
    const local = toLocal(href, "/");
    if (!local) {
      fail(href, "brand asset is not served from this site");
      continue;
    }
    // The canonical domain maps onto the server under test: only localhost is ever asked.
    const res = await get(local + (new URL(href, origin).search ?? ""));
    if (res.status !== 200) fail(local, `brand asset returned ${res.status}`);
  }
  log(`brand assets in <head> checked (${headAssets.size} URLs)`);

  // Stubs answer 501, and the 404 page is a 404.
  for (const stub of STUBS) {
    const res = await get(stub.path, { method: stub.method });
    if (res.status !== 501) fail(`${stub.method} ${stub.path}`, `stub returned ${res.status}; expected 501`);
  }
  const missing = await get("/this-page-does-not-exist");
  if (missing.status !== 404) fail("/this-page-does-not-exist", `returned ${missing.status}; expected 404`);

  log(`crawled ${pages.size} URLs (${report.length} HTML pages)`);
  log("");
  log("words  cap  data  sample  page");
  for (const r of report.sort((a, b) => a.path.localeCompare(b.path))) {
    log(`${String(r.words).padStart(5)} ${String(r.cap).padStart(4)} ${String(r.dataWords).padStart(5)}  ${r.sample ? "yes   " : "      "}  ${r.path}${r.regions.length ? `  [${r.regions.join(", ")}]` : ""}`);
  }
  return { failures, report };
}

/** Every path outline and fill in the brand's SVG files the site draws from (assets/brand/). */
async function brandSvgParts() {
  const dir = path.join(ROOT, "assets", "brand");
  const paths = new Set();
  const fills = new Set();
  for (const file of await readdir(dir)) {
    if (!file.endsWith(".svg")) continue;
    const svg = await readFile(path.join(dir, file), "utf8");
    for (const m of svg.matchAll(/\sd="([^"]+)"/g)) paths.add(m[1]);
    for (const m of svg.matchAll(/\sfill="(#[0-9A-Fa-f]{3,8})"/g)) fills.add(m[1].toUpperCase());
  }
  return { paths, fills };
}

/** Distinctive strings (three words or more, or URLs) from every data/*.sample.json file. */
async function sampleFingerprints() {
  const dir = path.join(ROOT, "data");
  const out = new Set();
  for (const file of await readdir(dir)) {
    if (!file.endsWith(".sample.json")) continue;
    const json = JSON.parse(await readFile(path.join(dir, file), "utf8"));
    const visit = (v, key) => {
      if (typeof v === "string") {
        // The file's own label is meant to show; notes are never rendered; URLs show as hosts or link targets.
        if (v === json.label || key === "note" || /^https?:\/\//.test(v)) return;
        if (v.split(/\s+/).length >= 3) out.add(v);
      } else if (Array.isArray(v)) v.forEach((x) => visit(x, key));
      else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) visit(x, k);
    };
    visit(json);
  }
  return [...out];
}

/**
 * A data/*.sample.json file marked `pending` holds placeholders until results are published. It may
 * not favour any provider: every benchmark row is identical, and in every stage preset each lane
 * has the same timing, cost and results and no attempt fails.
 */
async function pendingProblems() {
  const dir = path.join(ROOT, "data");
  const problems = [];
  const same = (values) => values.every((v) => JSON.stringify(v) === JSON.stringify(values[0]));
  for (const file of await readdir(dir)) {
    if (!file.endsWith(".sample.json")) continue;
    const json = JSON.parse(await readFile(path.join(dir, file), "utf8"));
    if (json.pending !== true) continue;
    if (json.rows && !same(Object.values(json.rows))) problems.push(`${file} is pending but its rows differ between providers`);
    for (const preset of json.presets ?? []) {
      if (preset.fails) problems.push(`${file} is pending but preset "${preset.id}" has a failing provider`);
      if (!same(Object.values(preset.lanes ?? {}))) problems.push(`${file} is pending but preset "${preset.id}" has lanes that differ between providers`);
    }
    if (json.fallback) problems.push(`${file} is pending but names a fallback provider`);
  }
  return problems;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const base = process.argv[2];
  if (!base) {
    console.error("usage: node checks/site.mjs <base-url>");
    process.exit(2);
  }
  const { failures } = await checkSite(base);
  if (failures.length) {
    console.error(`\n${failures.length} failure(s):`);
    for (const f of failures) console.error(`  ✗ ${f}`);
    process.exit(1);
  }
  console.log("\nsite ok");
}
