// `bench contents ...`: plan, run, score, publish, build and validate the contents track.
import { existsSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { createInterface } from "node:readline/promises";
import { loadItems, type Item } from "../dataset/items.ts";
import { textHasAnswer } from "../dataset/match.ts";
import { leakCheck, sensitiveStrings } from "../publish/publish.ts";
import { Budget, poolUsage } from "../run/budget.ts";
import { capturingFetch } from "../run/capture.ts";
import { loadMethod } from "../run/config.ts";
import { liveConnectivity } from "../run/connectivity.ts";
import { runsDir } from "../run/plan.ts";
import { createClient, registry as builtInRegistry, urlKey, type ProviderSpec } from "../sdk.ts";
import { ledgerPath, liveGuards, livePageFetcher, pageFetcherFor } from "../session.ts";
import { addDays, BENCH_DIR, isoDate, readJson, readJsonl, rng, seedOf, shuffle, storeDir, usd, writeJson, writeJsonl } from "../util/core.ts";
import { arxivFirstAuthor, kevProduct, type SourceContext } from "../../scripts/datasets/sources.ts";
import { buildUrlSet, keyOf, poolCandidates, type BuildIo, type Candidate } from "./build.ts";
import {
  CONTENTS_MANIFEST, fileSha256, loadContentsConfig, loadContentsMethod, loadUrlSet, urlSetExists, urlSetProblems,
  type ContentsConfig, type ContentsUrl, type UrlSetManifestEntry, type UrlSpec,
} from "./config.ts";
import { contentsFixtureFetch, contentsFixtureRegistry, CONTENTS_FIXTURES, fixtureUrlSet } from "./fixtures.ts";
import { contentsPlanHash, formatContentsPlan, makeContentsPlan, plannedUrls, type ContentsPlan } from "./plan.ts";
import { contentsPaths, readContentsAttempts, runContents, type ContentsContext } from "./runner.ts";
import { formatContentsScores, scoreContents, type ContentsScores } from "./score.ts";

type Flags = Record<string, string | true>;
const str = (f: Flags, k: string) => (typeof f[k] === "string" ? (f[k] as string) : undefined);
const need = (f: Flags, k: string) => { const v = str(f, k); if (!v) throw new Error(`--${k} is required`); return v; };
const reg = () => builtInRegistry as unknown as Record<string, ProviderSpec>;

/** The URLs a config runs on: the committed set, or (before it is built) the builder's quotas. */
export function urlsFor(config: ContentsConfig): { urls: ContentsUrl[]; planned: boolean } {
  if (urlSetExists(config.urlSet)) {
    const urls = loadUrlSet(config.urlSet);
    const problems = urlSetProblems(urls);
    if (problems.length) throw new Error(`${config.urlSet}:\n  ${problems.slice(0, 20).join("\n  ")}`);
    return { urls, planned: false };
  }
  const spec = readJson<UrlSpec>(resolve(BENCH_DIR, config.urlSpec));
  return { urls: plannedUrls(spec.quotas, spec.pdfMaxPages), planned: true };
}

function creditsUsed(config: ContentsConfig): Record<string, number> {
  return Object.fromEntries(Object.entries(config.providerLimits ?? {}).map(([id, l]) => [id, poolUsage(ledgerPath(), id, l.since).credits]));
}

async function confirm(cap: number, f: Flags): Promise<boolean> {
  const given = str(f, "confirm-spend");
  if (given !== undefined) return Number(given) === cap;
  if (!process.stdin.isTTY) return false;
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const a = await rl.question(`Type the cap (${cap}) to start: `);
  rl.close();
  return Number(a.trim()) === cap;
}

interface ContentsRunMeta { runId: string; mode: "live" | "fixture"; track: "contents"; config: ContentsConfig; method: ReturnType<typeof loadContentsMethod>; planHash: string; urlSetSha256: string | null; createdAt: string }

/** Opens a contents run, new or resumed, in live or fixture mode. */
export function openContents(o: { config: ContentsConfig; mode: "live" | "fixture"; runId?: string; urls?: ContentsUrl[]; fetch?: typeof fetch; env?: Record<string, string | undefined>; ledger?: string }): ContentsContext & { runId: string; mode: "live" | "fixture"; plan: ContentsPlan } {
  let config = o.config;
  let method = loadContentsMethod();
  const searchMethod = loadMethod();
  let urls: ContentsUrl[];
  let registry: Record<string, ProviderSpec>;
  let client;
  let pageFetcher;
  if (o.mode === "fixture") {
    // Fixture mode swaps in synthetic providers, a synthetic URL set and a synthetic web; nothing real is called.
    urls = o.urls ?? fixtureUrlSet(8);
    config = { ...config, providers: Object.keys(CONTENTS_FIXTURES) };
    const r = contentsFixtureRegistry();
    registry = r as unknown as Record<string, ProviderSpec>;
    const fx = o.fetch ?? contentsFixtureFetch(urls);
    client = createClient<string>({ registry: r as never, keys: Object.fromEntries(Object.keys(r).map((k) => [k, "fixture-key"])), fetch: fx });
    pageFetcher = pageFetcherFor({ ...searchMethod, pages: { ...searchMethod.pages, perHostIntervalMs: 0 } }, fx);
    method = { ...method, pacing: { ...method.pacing, rateLimitPauseMs: 0 } };
  } else {
    const u = urlsFor(config);
    if (u.planned) throw new Error(`the URL set ${config.urlSet} is not built yet: run bench contents build --spec ${config.urlSpec}`);
    urls = u.urls;
    registry = reg();
    client = createClient<string>({ env: o.env ?? process.env, fetch: capturingFetch(globalThis.fetch) });
    pageFetcher = livePageFetcher(searchMethod);
  }
  const plan = makeContentsPlan({ config, method, urls, planned: false, registry });
  const hash = contentsPlanHash(plan, config);
  const createdAt = new Date().toISOString();
  let runId = o.runId;
  if (runId) {
    const meta = readJson<ContentsRunMeta>(contentsPaths(join(runsDir(), runId)).run);
    if (meta.planHash !== hash) throw new Error(`run ${runId} was planned differently; start a new run`);
    if (meta.mode !== o.mode) throw new Error(`run ${runId} is a ${meta.mode} run`);
  } else runId = `${config.name}-${createdAt.replace(/[-:]/g, "").replace(/\..*$/, "").replace("T", "-")}${o.mode === "fixture" ? "-fixture" : ""}`;
  const dir = join(runsDir(), runId);
  if (!o.runId) writeJson(contentsPaths(dir).run, { runId, mode: o.mode, track: "contents", config, method, planHash: hash, urlSetSha256: o.mode === "live" ? fileSha256(config.urlSet) : null, createdAt } satisfies ContentsRunMeta, 0o600);
  if (o.mode === "fixture") writeJsonl(join(dir, "fixture-urls.jsonl"), urls);
  const budget = new Budget({
    ledgerPath: o.ledger ?? (o.mode === "fixture" ? join(dir, "fixture-ledger.jsonl") : ledgerPath()), runId,
    runCapUsd: config.capUsd, monthlyCapUsd: method.budget.monthlyCapUsd,
    ...(config.creditsUsd ? { creditsUsd: config.creditsUsd } : {}), ...(config.providerLimits ? { providerLimits: config.providerLimits } : {}),
  });
  return { runId, mode: o.mode, dir, config, method, urls, registry, client, pageFetcher, budget, plan, ...(o.mode === "live" ? { connectivity: liveConnectivity } : {}) };
}

/** Published outputs: scores, URL ids and URLs, counts and costs; never page text. */
export function contentsOutputs(dir: string, meta: ContentsRunMeta, urls: ContentsUrl[], scores: ContentsScores) {
  const attempts = readContentsAttempts(contentsPaths(dir).attempts).map(({ requestId: _r, ...a }) => a);
  const results = {
    schema: "contents-results/1", mode: meta.mode, liveVerified: meta.mode === "live", runId: meta.runId, method: meta.method.method,
    config: { name: meta.config.name, providers: meta.config.providers, passes: meta.config.passes, seed: meta.config.seed, urlSet: meta.config.urlSet, urlSetSha256: meta.urlSetSha256 },
    registry: Object.fromEntries(meta.config.providers.map((p) => [p, reg()[p] ? { specVersion: reg()[p]!.specVersion, verification: reg()[p]!.contents?.verification ?? null } : null])),
    urls: urls.map((u) => ({ id: u.id, stratum: u.stratum, url: u.url, origin: u.origin.kind, pooledFrom: u.origin.provider ?? null, truth: u.truth })),
    scores,
  };
  return { results, attempts };
}

export async function contentsCommand(sub: string | undefined, flags: Flags): Promise<void> {
  if (sub === "plan") {
    const base = loadContentsConfig(need(flags, "config"));
    // --url-set prices another set (a provisional build in the store) without changing the config.
    const config = str(flags, "url-set") ? { ...base, urlSet: resolve(str(flags, "url-set")!) } : base;
    const method = loadContentsMethod();
    const { urls, planned } = urlsFor(config);
    const plan = makeContentsPlan({ config, method, urls, planned, registry: reg() });
    const text = formatContentsPlan(plan, { monthlyCapUsd: method.budget.monthlyCapUsd, ...(config.creditsUsd ? { credits: config.creditsUsd } : {}), creditsUsed: creditsUsed(config) });
    if (flags.quiet !== true) console.log(text);
    if (plan.maxUsd > method.budget.monthlyCapUsd && flags.quiet === true) throw new Error("contents plan exceeds the monthly cap");
    return;
  }
  if (sub === "run") {
    const config = loadContentsConfig(need(flags, "config"));
    const live = flags.live === true;
    const resume = str(flags, "resume");
    if (live) {
      const method = loadContentsMethod();
      const problems = liveGuards({ env: process.env, registry: reg(), config: { providers: config.providers, judgeItems: 0 } as never, method: loadMethod(), judgeKeyEnv: null });
      if (problems.length) throw new Error(`live run refused:\n  ${problems.join("\n  ")}`);
      const { urls, planned } = urlsFor(config);
      if (planned) throw new Error(`the URL set ${config.urlSet} is not built yet`);
      const plan = makeContentsPlan({ config, method, urls, planned, registry: reg() });
      console.log(formatContentsPlan(plan, { monthlyCapUsd: method.budget.monthlyCapUsd, ...(config.creditsUsd ? { credits: config.creditsUsd } : {}), creditsUsed: creditsUsed(config) }));
      if (!(await confirm(config.capUsd, flags))) throw new Error(`not confirmed: pass --confirm-spend ${config.capUsd} to accept the cap`);
    } else console.error("FIXTURE mode: synthetic providers, URLs and pages. Add --live for real providers.");
    const s = openContents({ config, mode: live ? "live" : "fixture", ...(resume ? { runId: resume } : {}) });
    const ac = new AbortController();
    const onSignal = () => { console.error(`\nstopping; resume with --resume ${s.runId}`); ac.abort(); };
    process.once("SIGINT", onSignal);
    console.error(`run ${s.runId} (${s.mode}) in ${s.dir}`);
    const r = await runContents({ ...s, signal: ac.signal, log: (l) => console.error(l) }, loadMethod().pages.perHostIntervalMs * (live ? 1 : 0));
    process.removeListener("SIGINT", onSignal);
    const scores = scoreContents(s.dir, s);
    writeJson(contentsPaths(s.dir).scores, scores, 0o600);
    console.log(formatContentsScores(scores));
    console.log(`\n${r}; spent ${usd(s.budget.runCashUsd(), 4)} cash of the ${usd(s.config.capUsd)} cap${s.mode === "fixture" ? "\nFIXTURE run: synthetic providers; never present these as live results." : ""}`);
    if (r !== "done") process.exitCode = 2;
    return;
  }
  if (sub === "score" || sub === "publish") {
    const runId = need(flags, "run");
    const dir = join(runsDir(), runId);
    const meta = readJson<ContentsRunMeta>(contentsPaths(dir).run);
    const urls = meta.mode === "fixture" ? loadItemsJsonl(join(dir, "fixture-urls.jsonl")) : loadUrlSet(meta.config.urlSet);
    const scores = scoreContents(dir, { config: meta.config, method: meta.method, urls });
    if (sub === "score") { console.log(formatContentsScores(scores)); return; }
    const o = contentsOutputs(dir, meta, urls, scores);
    const serialized = [JSON.stringify(o.results), ...o.attempts.map((a) => JSON.stringify(a))].join("\n");
    const leaks = leakCheck(serialized, sensitiveStrings(dir, []));
    if (leaks.length) throw new Error(`refusing to publish: ${leaks.length} stored page strings found in the output`);
    const out = resolve(str(flags, "out") ?? contentsPaths(dir).publish);
    writeJson(join(out, "contents-results.json"), o.results);
    writeJsonl(join(out, "contents-attempts.jsonl"), o.attempts);
    console.log(`wrote ${join(out, "contents-results.json")} and contents-attempts.jsonl${meta.mode === "fixture" ? "\nFIXTURE run: never present as live results." : ""}`);
    return;
  }
  if (sub === "validate") {
    const config = str(flags, "config") ? loadContentsConfig(need(flags, "config")) : null;
    const m = existsSync(CONTENTS_MANIFEST) ? readJson<{ sets: UrlSetManifestEntry[] }>(CONTENTS_MANIFEST) : { sets: [] };
    for (const e of m.sets) {
      const urls = loadUrlSet(e.file);
      const problems = urlSetProblems(urls);
      if (fileSha256(e.file) !== e.sha256) problems.push("content changed without a new version (sha256 differs)");
      if (problems.length) throw new Error(`${e.file}:\n  ${problems.join("\n  ")}`);
    }
    console.log(`contents URL sets valid: ${m.sets.map((e) => `${e.file} (${e.count})`).join(", ") || "none built yet"}${config ? `; ${config.name} uses ${config.urlSet}${urlSetExists(config.urlSet) ? "" : " (not built yet)"}` : ""}`);
    return;
  }
  if (sub === "build") {
    if (process.env.BENCH_TEST) throw new Error("contents build reads the web; not in tests");
    const specPath = need(flags, "spec");
    const spec = readJson<UrlSpec>(resolve(specPath));
    const today = str(flags, "today") ?? spec.builtOn ?? isoDate(Date.now());
    const items: Item[] = spec.datasets.flatMap((f) => loadItems(resolve(BENCH_DIR, f)));
    const pools = poolCandidates(runsDir(), spec.runs, items, spec.pooledProviders);
    const io = liveBuildIo(spec, today);
    const r = await buildUrlSet(spec, items, pools, io, today);
    const file = `datasets/contents/${spec.name}-${spec.version}.jsonl`;
    const out = flags.provisional === true ? join(storeDir(), "contents", `${spec.name}-${spec.version}-provisional.jsonl`) : resolve(BENCH_DIR, file);
    writeJsonl(out, r.urls);
    const strata: Record<string, number> = {};
    for (const u of r.urls) strata[u.stratum] = (strata[u.stratum] ?? 0) + 1;
    const report = { spec: relative(BENCH_DIR, resolve(specPath)), builtOn: today, strata, short: r.short, dropped: r.dropped };
    if (flags.provisional === true) {
      writeJson(join(storeDir(), "contents", `${spec.name}-${spec.version}-provisional-report.json`), report);
      console.log(`provisional set (not committed): ${out}`);
    } else {
      writeJson(resolve(BENCH_DIR, `datasets/contents/${spec.name}-${spec.version}-build.json`), report);
      const m = existsSync(CONTENTS_MANIFEST) ? readJson<{ schema: string; sets: UrlSetManifestEntry[] }>(CONTENTS_MANIFEST) : { schema: "contents-manifest/1", sets: [] };
      m.sets = [...m.sets.filter((e) => e.file !== file), { file, name: spec.name, version: spec.version, sha256: fileSha256(file), count: r.urls.length, strata, builtOn: today, spec: report.spec }];
      writeJson(CONTENTS_MANIFEST, m);
    }
    console.log(`${r.urls.length} URLs: ${Object.entries(strata).map(([s, n]) => `${s} ${n}`).join(", ")}; ${r.dropped.length} candidates dropped${Object.keys(r.short).length ? `; short of quota: ${Object.entries(r.short).map(([s, n]) => `${s} ${n}`).join(", ")}` : ""}`);
    return;
  }
  throw new Error("contents: plan | run | score | publish | build | validate");
}

function loadItemsJsonl(path: string): ContentsUrl[] {
  return readJsonl<ContentsUrl>(path);
}

/** The builder's network side: the harness fetcher one request at a time per host, KEV and CVE records, arXiv metadata. */
export function liveBuildIo(spec: UrlSpec, today: string): BuildIo {
  const method = loadMethod();
  const fetcher = livePageFetcher(method) as ReturnType<typeof livePageFetcher> & { fetchDocument(url: string, signal?: AbortSignal, maxBytes?: number): Promise<import("../pages/fetcher.ts").FetchedDocument>; fetchJsonText(url: string): Promise<import("../pages/fetcher.ts").FetchedPage> };
  const last = new Map<string, number>();
  const paced = async <T>(url: string, fn: () => Promise<T>): Promise<T> => {
    const host = (() => { try { return new URL(url).host; } catch { return url; } })();
    const gap = Math.max(method.pages.perHostIntervalMs, await fetcher.crawlDelayMs(url));
    const wait = (last.get(host) ?? 0) + gap - Date.now();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    try { return await fn(); } finally { last.set(host, Date.now()); }
  };
  const ctx: SourceContext = { today, fetch: globalThis.fetch, log: (l) => console.error(l) };
  return {
    readPage: (url) => paced(url, () => fetcher.fetchPage(url)),
    // Whole documents are read to count their pages: up to 25 MiB, beyond the page check's limit.
    readDocument: (url) => paced(url, () => fetcher.fetchDocument(url, undefined, 25 * 1024 * 1024)),
    log: (l) => console.error(l),
    async kevCandidates(n, exclude) {
      const all = await kevProduct.candidates(ctx, "public");
      const out: Candidate[] = [];
      for (const c of shuffle(all, rng(seedOf(spec.seed, "kev")))) {
        if (out.length >= n) break;
        if (exclude.has(urlKey(c.source.url))) continue;
        // The CVE record must state the answer the page will show: its CNA container's products and descriptions.
        const id = c.source.path![0]!;
        const res = await globalThis.fetch(`https://cveawg.mitre.org/api/cve/${id}`, { headers: { accept: "application/json", "user-agent": "open-benchmark-dataset-builder/1.0 (generic client)" } });
        await new Promise((r) => setTimeout(r, 1000));
        if (!res.ok) continue;
        const cna = ((await res.json()) as { containers?: { cna?: { affected?: unknown; descriptions?: unknown } } }).containers?.cna;
        if (!cna || !textHasAnswer(JSON.stringify([cna.affected, cna.descriptions]), keyOf(c))) continue;
        out.push({ url: c.source.url, kind: "js", origin: { kind: "kev", subject: id }, answers: c.answers, answerPatterns: c.answerPatterns });
      }
      return out;
    },
    async arxivCandidates(n, exclude) {
      // The fresh template's 35-day window, moved back so these papers share nothing with the fresh set.
      const [, far] = spec.extra.arxiv.windowDays;
      const all = await arxivFirstAuthor.candidates({ ...ctx, today: addDays(today, -(far - 40)) }, "fresh");
      const picked = shuffle(all.filter((c) => !exclude.has(urlKey(`https://arxiv.org/pdf/${c.source.path![0]}`))), rng(seedOf(spec.seed, "arxiv"))).slice(0, n);
      // The papers' own comments ("12 pages, 5 figures"), from the arXiv API in batches, so long papers are never downloaded.
      const stated = new Map<string, number>();
      for (let i = 0; i < picked.length; i += 100) {
        const ids = picked.slice(i, i + 100).map((c) => c.source.path![0]!);
        const res = await globalThis.fetch(`https://export.arxiv.org/api/query?id_list=${ids.join(",")}&max_results=100`, { headers: { "user-agent": "open-benchmark-dataset-builder/1.0 (generic client)" } });
        await new Promise((r) => setTimeout(r, 3500)); // arXiv asks for one request every three seconds.
        if (!res.ok) continue;
        for (const entry of (await res.text()).split("<entry>").slice(1)) {
          const id = /<id>https?:\/\/arxiv\.org\/abs\/([^<]+?)(v\d+)?<\/id>/.exec(entry)?.[1];
          const pages = /<arxiv:comment[^>]*>[^<]*?(\d+)\s*pages?/i.exec(entry)?.[1];
          if (id && pages) stated.set(id, Number(pages));
        }
      }
      return picked.map((c) => {
        const id = c.source.path![0]!;
        return { url: `https://arxiv.org/pdf/${id}`, kind: "pdf" as const, origin: { kind: "arxiv" as const, subject: id }, answers: c.answers, answerPatterns: c.answerPatterns, ...(stated.has(id) ? { statedPages: stated.get(id)! } : {}) };
      });
    },
    async orcidCandidates(n, exclude) {
      // Notable researchers (Nobel laureates in physics, chemistry, medicine or economics, and Fellows of the Royal Society, with an
      // ORCID iD on Wikidata), in a seeded order. The answer is the
      // name the profile's own public record gives (orcid.org/<id>/person.json, the data the client-rendered page shows), read by
      // the harness fetcher under robots.txt; Wikidata only picks the profiles.
      const q = "SELECT DISTINCT ?p ?orcid WHERE { VALUES ?award { wd:Q38104 wd:Q44585 wd:Q80061 wd:Q47170 wd:Q15631401 } ?p wdt:P166 ?award; wdt:P496 ?orcid. }";
      const res = await globalThis.fetch(`https://query.wikidata.org/sparql?query=${encodeURIComponent(q)}`, { headers: { accept: "application/sparql-results+json", "user-agent": "open-benchmark-dataset-builder/1.0 (generic client)" } });
      if (!res.ok) throw new Error(`Wikidata answered ${res.status}`);
      const rows = ((await res.json()) as { results: { bindings: { p: { value: string }; orcid: { value: string } }[] } }).results.bindings
        .map((b) => ({ q: b.p.value.replace(/^.*\//, ""), orcid: b.orcid.value }))
        .filter((r) => /^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/.test(r.orcid))
        .sort((a, b) => a.orcid.localeCompare(b.orcid));
      const seen = new Set<string>();
      const out: Candidate[] = [];
      for (const r of shuffle(rows, rng(seedOf(spec.seed, "orcid")))) {
        if (out.length >= n) break;
        const url = `https://orcid.org/${r.orcid}`;
        if (seen.has(r.orcid) || exclude.has(urlKey(url))) continue;
        seen.add(r.orcid);
        const rec = await paced(url, () => fetcher.fetchJsonText(`${url}/person.json`));
        if (rec.status !== "ok") continue;
        let name = "";
        try { name = String((JSON.parse(rec.text) as { displayName?: unknown }).displayName ?? "").trim(); } catch { continue; }
        // A full name of at least two words and five letters, so it cannot match unrelated text.
        if (name.split(/\s+/).length < 2 || name.replace(/[^\p{L}]/gu, "").length < 5) continue;
        out.push({ url, kind: "js", origin: { kind: "orcid", subject: r.q }, answers: [name], answerPatterns: [] });
      }
      return out;
    },
  };
}

