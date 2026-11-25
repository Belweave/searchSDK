// Checks each candidate's answer against a second, independent public source,
// to support the reviewer. It never calls a search provider.
//
//   node scripts/datasets/crosscheck.ts --in <candidates.jsonl> --out <report.json>
//
// - Wikidata items: the answer must appear in the Wikipedia article of the
//   entity holding the statement (the work for one hop; the creator for a
//   birthplace), in the item's language, else English, else any language.
// - CISA KEV items: the answer must appear in the CVE record (cve.org).
// - endoflife.date items: the version must appear on the release page the
//   record links to.
// - PEP and arXiv items: their source is the authority (the PEP itself, the
//   paper's own abstract page), so the report says so.
//
// The report goes to the local store; it feeds the committed review file.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Item } from "../../src/dataset/items.ts";
import { textHasAnswer } from "../../src/dataset/match.ts";
import { readJsonl, writeJson } from "../../src/util/core.ts";
import { UA } from "./sources.ts";
import { WIKIDATA_SPARQL } from "../../src/dataset/wikidata.ts";

type Check = { ok: boolean | null; where: string; note?: string };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function get(url: string, accept = "application/json"): Promise<Response | null> {
  for (let tries = 0; tries < 4; tries++) {
    try {
      const res = await fetch(url, { headers: { "user-agent": UA, accept }, signal: AbortSignal.timeout(30_000) });
      if (res.ok || ![429, 500, 502, 503, 504].includes(res.status)) return res;
    } catch { /* retry */ }
    await sleep(3000 * (tries + 1));
  }
  return null;
}

function stripHtml(html: string): string {
  return html.replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&quot;/g, '"');
}

/** Wikipedia article titles per language for each entity, via the query service (the action API throttles unnamed clients). */
async function sitelinks(qids: string[]): Promise<Map<string, Record<string, string>>> {
  const out = new Map<string, Record<string, string>>();
  for (let i = 0; i < qids.length; i += 40) {
    const query = `SELECT ?q ?site ?title WHERE { VALUES ?q { ${qids.slice(i, i + 40).map((q) => `wd:${q}`).join(" ")} }
  ?a schema:about ?q ; schema:isPartOf ?site ; schema:name ?title . FILTER(CONTAINS(STR(?site), "wikipedia.org")) }`;
    let res: Response | null = null;
    for (let t = 0; t < 4 && !res?.ok; t++) {
      if (t) await sleep(5000 * t);
      res = await fetch(WIKIDATA_SPARQL, { method: "POST", headers: { "user-agent": UA, accept: "application/sparql-results+json", "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ query }).toString() });
    }
    if (!res?.ok) throw new Error(`query service returned ${res?.status}`);
    const body = (await res.json()) as { results: { bindings: Record<string, { value: string }>[] } };
    for (const b of body.results.bindings) {
      const q = b.q!.value.replace("http://www.wikidata.org/entity/", "");
      const lang = /^https:\/\/([^.]+)\./.exec(b.site!.value)?.[1];
      if (lang) out.set(q, { ...(out.get(q) ?? {}), [lang]: b.title!.value });
    }
  }
  return out;
}

/** The rendered article (infobox values included), as text. */
async function wikipediaText(lang: string, title: string): Promise<string | null> {
  const res = await get(`https://${lang}.wikipedia.org/api/rest_v1/page/html/${encodeURIComponent(title.replace(/ /g, "_"))}`, "text/html");
  return res?.ok ? stripHtml(await res.text()) : null;
}

async function checkWikidata(items: Item[]): Promise<Map<string, Check>> {
  const holder = (i: Item) => (i.source.statement ? i.source.statement.split(/[-$]/)[0]!.toUpperCase() : i.source.entity!);
  const links = await sitelinks([...new Set(items.map(holder))]);
  const out = new Map<string, Check>();
  for (const i of items) {
    const q = holder(i);
    const sl = links.get(q) ?? {};
    const langs = [...new Set([i.lang, "en", ...Object.keys(sl)])].filter((l) => sl[l]).slice(0, 3);
    let found: Check = { ok: langs.length ? false : null, where: langs.length ? `${langs.map((l) => `${l}.wikipedia.org/wiki/${sl[l]}`).join(", ")}` : `no Wikipedia article for ${q}` };
    let unavailable = 0;
    for (const l of langs) {
      const text = await wikipediaText(l, sl[l]!);
      await sleep(1500); // Wikimedia throttles unnamed clients; stay well under its limit.
      if (text === null) { unavailable++; continue; }
      if (textHasAnswer(text, i)) { found = { ok: true, where: `https://${l}.wikipedia.org/wiki/${encodeURIComponent(sl[l]!.replace(/ /g, "_"))}` }; break; }
    }
    if (found.ok === false && unavailable === langs.length) found = { ok: null, where: found.where, note: "articles unavailable (rate limited)" };
    out.set(i.id, found);
    if (out.size % 20 === 0) console.error(`  wikipedia: ${out.size}/${items.length}`);
  }
  return out;
}

async function checkKev(i: Item): Promise<Check> {
  const cve = i.source.path?.[0] ?? "";
  const res = await get(`https://cveawg.mitre.org/api/cve/${cve}`);
  if (!res?.ok) return { ok: null, where: `cve.org record ${cve} unavailable` };
  const text = JSON.stringify(await res.json());
  return { ok: textHasAnswer(text, i), where: `https://www.cve.org/CVERecord?id=${cve}` };
}

async function checkEol(i: Item, links: Map<string, string>): Promise<Check> {
  const link = links.get(i.source.path?.[0] ?? "");
  if (!link) return { ok: null, where: "no release link in the endoflife.date record" };
  const res = await get(link, "text/html");
  if (!res?.ok) return { ok: null, where: `${link} unavailable (${res?.status ?? "network"})` };
  return { ok: textHasAnswer(stripHtml(await res.text()), i), where: link };
}

async function main(): Promise<void> {
  if (process.env.BENCH_TEST) throw new Error("crosscheck fetches public sources; not in tests");
  const a = process.argv.slice(2);
  const flag = (k: string) => a[a.indexOf(`--${k}`) + 1]!;
  // --recheck keeps confirmed entries of an earlier report and checks only the rest.
  const previous: Record<string, Check> = a.includes("--recheck") ? JSON.parse(readFileSync(resolve(flag("out")), "utf8")) : {};
  const items = readJsonl<Item>(resolve(flag("in"))).filter((i) => previous[i.id]?.ok !== true);
  const report: Record<string, Check> = { ...previous };
  const wd = items.filter((i) => i.source.name === "wikidata" && i.class !== "nav");
  const done = new Set<string>();
  for (const [k, v] of await checkWikidata(wd)) { report[k] = v; done.add(k); }
  let eolLinks = new Map<string, string>();
  if (items.some((i) => i.source.name === "endoflife-date")) {
    const full = JSON.parse(readFileSync(resolve(flag("eol")), "utf8")) as { result: { name: string; releases: { name: string; latest?: { link?: string } | null }[] }[] };
    eolLinks = new Map(full.result.flatMap((p) => p.releases.map((r) => [`${p.name}:${r.name}`, r.latest?.link ?? ""] as [string, string])));
  }
  for (const i of items) {
    if (done.has(i.id)) continue;
    if (i.class === "nav") report[i.id] = { ok: null, where: i.answerUrls[0]!, note: "official website from Wikidata P856; host checked by the reviewer" };
    else if (i.source.name === "cisa-kev") report[i.id] = await checkKev(i);
    else if (i.source.name === "endoflife-date") report[i.id] = await checkEol(i, eolLinks);
    else if (i.source.name === "pep" || i.source.name === "arxiv") report[i.id] = { ok: null, where: i.source.url, note: "the source is the authority" };
    else report[i.id] = { ok: null, where: i.source.url, note: "no second source" };
  }
  writeJson(resolve(flag("out")), report);
  const n = (v: boolean | null) => Object.values(report).filter((r) => r.ok === v).length;
  console.log(`${Object.keys(report).length} items: ${n(true)} confirmed, ${n(false)} not found, ${n(null)} not checkable`);
}

main().catch((e: unknown) => { console.error(e instanceof Error ? e.message : String(e)); process.exitCode = 1; });
