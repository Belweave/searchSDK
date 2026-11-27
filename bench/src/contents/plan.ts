// The contents plan: which URLs, which calls, the most they can cost, and how
// long the slowest provider's pacing makes the run. Sends nothing.
import { paceFor, type Pace, type RateLimit } from "../run/pacer.ts";
import { costBound, type ProviderSpec } from "../sdk.ts";
import { canonical, sha256, usd } from "../util/core.ts";
import type { ContentsConfig, ContentsMethod, ContentsUrl, Stratum } from "./config.ts";
import { STRATA } from "./config.ts";

/** What one call on one URL reserves: the SDK's per-URL bound, scaled for a PDF's pages; and its credits. */
export interface UrlReservation { usd: number; boundUsd: number | null; credits: number | null; basis: string; requiresOverageOff: boolean }

/**
 * The same rule for every provider: the SDK's cost bound for one URL; for a PDF of N pages,
 * (1 + reservePerPage * N) times that, because a provider may bill per document page
 * (Firecrawl documents one credit per PDF page on top of the page). Credits scale the same way.
 */
export function urlReservation(spec: ProviderSpec, u: Pick<ContentsUrl, "stratum" | "build">, method: ContentsMethod): UrlReservation {
  const b = costBound(spec, "contents", { urls: 1 });
  const factor = u.build.pdfPages ? 1 + method.documents.reservePerPage * u.build.pdfPages : 1;
  const creditUsd = spec.contents!.pricing.creditUsd;
  const listUsd = spec.contents!.pricing.extraBlock?.usd ?? null;
  const perUrlCredits = creditUsd && listUsd !== null ? Math.ceil(listUsd / creditUsd - 1e-9) : null;
  if (b.usd === null) {
    return { usd: method.budget.unknownPriceUsd * factor, boundUsd: null, credits: perUrlCredits === null ? null : perUrlCredits * factor, basis: `no bound (${b.unknownBecause})`, requiresOverageOff: false };
  }
  return {
    usd: b.usd * factor, boundUsd: b.usd * factor, credits: perUrlCredits === null ? null : perUrlCredits * factor,
    basis: factor > 1 ? `bound x ${factor} (PDF, ${u.build.pdfPages} pages)` : b.requiresOverageOff ? "free allowance, overage off" : "bound",
    requiresOverageOff: b.requiresOverageOff === true,
  };
}

export interface ContentsProviderPlan {
  id: string;
  calls: number;
  maxUsd: number;
  /** The same worst case if the provider's bill does not grow with a PDF's pages (only the document factor removed). */
  perUrlMaxUsd: number;
  /** Credits planned, for credit-priced providers. */
  credits: number | null;
  perStratum: Record<string, { calls: number; maxUsd: number }>;
  pace: Pace;
  /** Seconds the provider's pacing alone needs for its calls (a lower bound on the run's length). */
  pacedSeconds: number;
  requiresOverageOff: boolean;
  warnings: string[];
}

export interface ContentsPlan {
  runName: string;
  method: string;
  urls: { total: number; strata: Record<string, number>; sha256: string; planned: boolean };
  passes: number;
  providers: ContentsProviderPlan[];
  calls: number;
  maxUsd: number;
  capUsd: number;
  /** The slowest provider's paced time, plus the harness's per-pass probe of every URL. */
  expectedSeconds: number;
  warnings: string[];
}

/** URLs for planning before the set is built: the quotas, with PDFs at the page cap (the worst case). */
export function plannedUrls(quotas: Record<Stratum, number>, pdfMaxPages: number): ContentsUrl[] {
  return STRATA.flatMap((s) => Array.from({ length: quotas[s] }, (_, k) => ({
    id: `cu-${s}-${String(k + 1).padStart(3, "0")}`, url: `https://planned.invalid/${s}/${k}`, stratum: s, origin: { kind: "source" as const },
    answers: ["planned"], answerPatterns: [], truth: "harness" as const,
    build: { on: "planned", httpStatus: 200, mime: s === "pdf" ? "application/pdf" : "text/html", chars: null, contentSha256: null, answerAt: null, ...(s === "pdf" ? { pdfPages: pdfMaxPages } : {}) },
  })));
}

export function makeContentsPlan(o: { config: ContentsConfig; method: ContentsMethod; urls: ContentsUrl[]; planned: boolean; registry: Readonly<Record<string, ProviderSpec>> }): ContentsPlan {
  const { config, method, urls, registry } = o;
  const strata: Record<string, number> = {};
  for (const u of urls) strata[u.stratum] = (strata[u.stratum] ?? 0) + 1;
  const providers: ContentsProviderPlan[] = [];
  const warnings: string[] = [];
  for (const id of config.providers) {
    const spec = registry[id];
    if (!spec?.contents) throw new Error(`provider ${id} has no contents endpoint`);
    const pace = paceFor(spec.contents.rateLimits as RateLimit[], config.rateLimitPlans?.[id], method.pacing.shareOfLimit, method.pacing.maxInFlightPerProvider, { urls: 1 });
    const per: Record<string, { calls: number; maxUsd: number }> = {};
    let maxUsd = 0;
    let perUrlMaxUsd = 0;
    let credits: number | null = 0;
    let overage = false;
    for (const u of urls) {
      const r = urlReservation(spec, u, method);
      const cell = (per[u.stratum] ??= { calls: 0, maxUsd: 0 });
      cell.calls += config.passes;
      cell.maxUsd += r.usd * config.passes;
      maxUsd += r.usd * config.passes;
      perUrlMaxUsd += urlReservation(spec, { stratum: u.stratum, build: { ...u.build, pdfPages: 0 } }, method).usd * config.passes;
      credits = credits === null || r.credits === null ? null : credits + r.credits * config.passes;
      overage ||= r.requiresOverageOff;
    }
    const calls = urls.length * config.passes;
    const pw: string[] = [];
    // A provider with no documented rate leans on its in-flight cap; assume three seconds a call.
    const pacedSeconds = Math.ceil((calls * Math.max(pace.intervalMs, 3000 / Math.max(1, pace.maxInFlight))) / 1000);
    if (pace.perDay !== null && calls > pace.perDay) pw.push(`plans ${calls} calls, above half the documented daily limit (${pace.perDay}); split the passes across UTC days`);
    const allowance = spec.contents.pricing.allowance;
    if (allowance && (allowance.unit === "urls" || allowance.unit === "requests") && allowance.per === "day") {
      const perPass = urls.length;
      if (calls > allowance.limit) pw.push(`plans ${calls} URLs, above the free allowance of ${allowance.limit} a day; run at most ${Math.floor(allowance.limit / perPass)} passes per UTC day (past it calls are ${allowance.beyond.billing === "opt-in" ? "refused unless paid use is on" : "billed"})`);
      else pw.push(`plans ${calls} URLs within the free allowance of ${allowance.limit} a day, if nothing else uses it that day`);
    }
    if (overage) pw.push("free within its allowance; its bound holds only while paid use (wallet spending) past the allowance is off on the account");
    const limit = config.providerLimits?.[id];
    if (limit?.credits !== undefined && credits !== null && credits > limit.credits) pw.push(`plans ${credits} credits, above its limit of ${limit.credits}; it stops at the limit and the others continue`);
    const terms = (spec as { terms?: { benchmarkPublication: string; rawResponseStorage: string } }).terms;
    if (terms && (terms.benchmarkPublication === "restricted" || terms.rawResponseStorage === "restricted")) pw.push(`terms restrict benchmarking or storing results`);
    providers.push({ id, calls, maxUsd, perUrlMaxUsd, credits: spec.contents.pricing.creditUsd ? credits : null, perStratum: per, pace, pacedSeconds, requiresOverageOff: overage, warnings: pw });
  }
  const total = providers.reduce((a, p) => a + p.maxUsd, 0);
  if (total > config.capUsd) warnings.push(`the worst case (${usd(total)}) exceeds the cap (${usd(config.capUsd)}); the run stops when the cap is reached`);
  if (config.capUsd > method.budget.monthlyCapUsd) warnings.push(`the run cap is above the monthly cap (${usd(method.budget.monthlyCapUsd)})`);
  if (o.planned) warnings.push("the URL set is not built yet: counts are the builder's quotas and every PDF is planned at the page cap (the worst case)");
  for (const [s, n] of Object.entries(strata)) if (n < method.reporting.minStratumN) warnings.push(`stratum ${s} has ${n} URLs, below ${method.reporting.minStratumN}: it is run but published as too small`);
  // The harness probes each URL once per pass before dispatching; one request per host at a time.
  const byHost = new Map<string, number>();
  for (const u of urls) { const h = (() => { try { return new URL(u.url).host; } catch { return u.url; } })(); byHost.set(h, (byHost.get(h) ?? 0) + 1); }
  const probeSeconds = Math.max(0, ...[...byHost.values()]) * config.passes * 2;
  return {
    runName: config.name, method: method.method,
    urls: { total: urls.length, strata, sha256: sha256(canonical(urls.map((u) => [u.id, u.url]))), planned: o.planned },
    passes: config.passes, providers,
    calls: providers.reduce((a, p) => a + p.calls, 0), maxUsd: total, capUsd: config.capUsd,
    expectedSeconds: Math.max(probeSeconds, ...providers.map((p) => p.pacedSeconds)),
    warnings,
  };
}

/** The hash that pins a resumed run to the same plan (spend excluded). */
export function contentsPlanHash(plan: ContentsPlan, config: ContentsConfig): string {
  return sha256(canonical({ urls: plan.urls.sha256, method: plan.method, providers: config.providers, passes: config.passes, seed: config.seed }));
}

const money = (x: number, d = 2) => `$${x.toFixed(d)}`;
const hours = (s: number) => (s >= 3600 ? `${(s / 3600).toFixed(1)} h` : `${Math.ceil(s / 60)} min`);

export function formatContentsPlan(p: ContentsPlan, extra: { monthlyCapUsd: number; credits?: Record<string, number>; creditsUsed?: Record<string, number> }): string {
  const L: string[] = [];
  L.push("searchSDK Benchmarks contents plan (dry run: nothing is sent)");
  L.push(`run ${p.runName}, method ${p.method}`);
  L.push(`${p.urls.total} URLs${p.urls.planned ? " (planned from quotas; the set is not built yet)" : ""}: ${Object.entries(p.urls.strata).map(([s, n]) => `${s} ${n}`).join(", ")}; ${p.passes} passes; one URL per call`);
  L.push("");
  L.push(`${"provider".padEnd(11)}${"calls".padStart(7)}  ${"credits".padStart(8)}  ${"max $".padStart(8)}  ${"cash $".padStart(8)}  ${"per-URL $".padStart(9)}  pacing                         by stratum (max $)`);
  let cash = 0;
  for (const x of p.providers) {
    const credit = extra.credits?.[x.id] ?? 0;
    const c = Math.max(0, x.maxUsd - credit);
    cash += c;
    const pace = `${x.pace.intervalMs} ms/${x.pace.maxInFlight} in flight, ~${hours(x.pacedSeconds)}`;
    L.push(`${x.id.padEnd(11)}${String(x.calls).padStart(7)}  ${(x.credits === null ? "-" : String(x.credits)).padStart(8)}  ${money(x.maxUsd).padStart(8)}  ${money(c).padStart(8)}  ${money(x.perUrlMaxUsd).padStart(9)}  ${pace.padEnd(31)}${Object.entries(x.perStratum).map(([s, v]) => `${s} ${money(v.maxUsd)}`).join(", ")}`);
  }
  L.push(`${"total".padEnd(11)}${String(p.calls).padStart(7)}  ${"".padStart(8)}  ${money(p.maxUsd).padStart(8)}  ${money(cash).padStart(8)}  ${money(p.providers.reduce((a, x) => a + x.perUrlMaxUsd, 0)).padStart(9)}`);
  L.push("max $: every call at its reservation (the SDK's cost bound; PDFs scaled by 1 + their pages, the same for everyone). per-URL $: the same without the PDF factor, which holds for a provider whose bill does not grow with a document's pages.");
  L.push("");
  L.push(`maximum possible spend ${money(p.maxUsd)} (cash beyond declared credits ${money(cash)}); run cap ${money(p.capUsd)}; monthly cap ${money(extra.monthlyCapUsd)}`);
  if (extra.credits && Object.keys(extra.credits).length) L.push(`declared credits: ${Object.entries(extra.credits).map(([k, v]) => `${k} ${money(v)}`).join(", ")}`);
  if (extra.creditsUsed && Object.keys(extra.creditsUsed).length) L.push(`credits already used under provider limits: ${Object.entries(extra.creditsUsed).map(([k, v]) => `${k} ${v}`).join(", ")}`);
  L.push(`expected duration: about ${hours(p.expectedSeconds)} (the slowest provider's pacing; all providers run at once)`);
  L.push("not charged: the harness's own probe of every URL once per pass (robots.txt obeyed, one request per host at a time)");
  const w = [...p.warnings, ...p.providers.flatMap((x) => x.warnings.map((m) => `${x.id}: ${m}`))];
  if (w.length) { L.push("", "notes:"); for (const m of w) L.push(`  - ${m}`); }
  return L.join("\n");
}
