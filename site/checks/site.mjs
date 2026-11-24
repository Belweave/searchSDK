// Crawl a running searchSDK site and check every page.
//   node checks/site.mjs http://localhost:3210
// Fails (exit 1) on: broken internal links, missing or out-of-range titles and descriptions,
// pages or regions over their word cap, sample data without its label or outside a labelled
// region, banned words, misspelt product name, repeated disclaimers, missing trademark line,
// third-party resources, credential-like strings, provider logos without a reserved box, alt text,
// SVG type or a recorded source, and stubs that answer anything but 501.
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  BANNED_PATTERNS,
  BANNED_WORDS,
  DESCRIPTION_RANGE,
  NAME_MISSPELLINGS,
  ONCE_ONLY,
  PAGE_CAPS,
  REQUIRED_FILES,
  REQUIRED_ON_EVERY_PAGE,
  STUBS,
  TITLE_RANGE,
} from "./config.mjs";
import { attr, byTag, contentRoot, countWords, findAll, findFirst, hasAttr, parseHtml, textNodes, textParts } from "./html.mjs";

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

  const toLocal = (href, from) => {
    if (!href || href.startsWith("#") || /^(mailto|tel|javascript):/i.test(href)) return null;
    const u = new URL(href, new URL(from, origin));
    if (!siteOrigins.has(u.origin)) return null;
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
      if (!/sample/i.test(labelText)) fail(p, "a sample data region has no visible label containing “sample”");
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
    const misspelt = prose.match(NAME_MISSPELLINGS) ?? `${title} ${description}`.match(NAME_MISSPELLINGS);
    if (misspelt) fail(p, `writes the name as “${misspelt[0]}”; it is always searchSDK`);
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
  log(`provider logos ok (${brandFiles.size} files, ${brandFolders.size} providers)`);

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
