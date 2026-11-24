// The real registry specs, driven with SYNTHETIC response bodies built from
// each spec's own response paths: the runner handles every provider's shape,
// costs follow the registry, and the pilot plan's arithmetic holds.
import assert from "node:assert/strict";
import { join } from "node:path";
import { test } from "node:test";
import { Budget } from "../src/run/budget.ts";
import { loadMethod, loadRunConfig } from "../src/run/config.ts";
import { loadRunItems, makePlan } from "../src/run/plan.ts";
import { runPaths, type AttemptRecord, type PageRecord } from "../src/run/records.ts";
import { runPages, runSearch } from "../src/run/runner.ts";
import { createJudge } from "../src/judge/judge.ts";
import { createClient, registry, type ProviderSpec } from "../src/sdk.ts";
import { pageFetcherFor } from "../src/session.ts";
import { BENCH_DIR, readJsonl } from "../src/util/core.ts";
import { tempStore } from "./helpers.ts";

const reg = registry as unknown as Record<string, ProviderSpec>;
const method = loadMethod();
const fieldPath = (f: unknown) => (typeof f === "string" ? f : (f as { path: string }).path);

function setPath(obj: Record<string, unknown>, path: string, value: unknown): void {
  const segs = path.split(".");
  let o = obj;
  for (const s of segs.slice(0, -1)) o = (o[s] ??= {}) as Record<string, unknown>;
  o[segs.at(-1)!] = value;
}

/** Synthetic provider bodies shaped by each spec's response paths. */
function synthFetch(calls: string[]): typeof fetch {
  return (async (input: unknown) => {
    const url = String(input);
    calls.push(url);
    const id = Object.keys(reg).find((k) => url.startsWith(reg[k]!.search?.request.url ?? "\0"));
    // Anything else is the synthetic web the harness's own page fetcher reads.
    if (!id) {
      if (url.endsWith("/robots.txt")) return new Response("User-agent: *\nDisallow: /private/\n", { status: 200 });
      return new Response(`<html><head><title>Synthetic</title></head><body><p>Synthetic page text for ${url}.</p></body></html>`, { status: 200, headers: { "content-type": "text/html" } });
    }
    const spec = reg[id]!;
    const body: Record<string, unknown> = {};
    {
      const f = spec.search!.response.fields;
      const rows = Array.from({ length: 3 }, (_, i) => {
        const r: Record<string, unknown> = {};
        setPath(r, fieldPath(f.url), `https://example.org/${id}/${i}`);
        if (f.title) setPath(r, fieldPath(f.title), `Synthetic ${i}`);
        if (f.excerpts) setPath(r, fieldPath(f.excerpts), "Synthetic snippet.");
        return r;
      });
      setPath(body, spec.search!.response.results, rows);
    }
    return new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });
  }) as typeof fetch;
}

test("every registry provider runs through the SDK with costs from the registry", async () => {
  tempStore();
  const providers = Object.keys(reg).filter((id) => reg[id]!.search).sort();
  assert.deepEqual(providers, ["brave", "context", "exa", "firecrawl", "perplexity", "tavily", "tinyfish"]);
  const config = { name: "synthetic-real-specs", providers, datasets: ["datasets/public/seed-0.1.0.jsonl"], limit: 6, passes: 1, profiles: ["default"], pagePasses: [1], judgeItems: 0, capUsd: 5, seed: 1 };
  const items = loadRunItems(config);
  const plan = makePlan({ config, method, items, registry: reg, judge: null, checkCommitted: false });
  // Real pacing would take minutes (Context allows 10 requests a minute); the arithmetic is tested elsewhere.
  for (const p of plan.providers) p.pace = { intervalMs: 0, maxInFlight: 2, perDay: null, basis: [] };
  const quick = { ...method, pages: { ...method.pages, perHostIntervalMs: 0 } };
  const dir = join(process.env.BENCH_STORE!, "runs", "real-specs");
  const calls: string[] = [];
  const keys = Object.fromEntries(Object.keys(reg).map((k) => [k, "synthetic-key"]));
  const ctx = {
    dir, config, method: quick, plan, items, registry: reg, judge: null,
    client: createClient<string>({ keys, fetch: synthFetch(calls) }),
    pageFetcher: pageFetcherFor(quick, synthFetch(calls)),
    budget: new Budget({ ledgerPath: join(dir, "ledger.jsonl"), runId: "real-specs", runCapUsd: 5, monthlyCapUsd: 100 }),
  };
  assert.equal(await runSearch(ctx), "done");
  const attempts = readJsonl<AttemptRecord>(runPaths(dir).attempts);
  assert.equal(attempts.length, providers.length * items.length);
  for (const a of attempts) assert.equal(a.outcome, "ok_nonempty", `${a.provider}: ${a.outcome} ${a.code ?? ""}`);
  const cost = (p: string) => attempts.find((a) => a.provider === p)!;
  assert.equal(cost("brave").costUsd, 0.005);
  assert.equal(cost("exa").costUsd, 0.007);
  // TinyFish is a documented $0.00 inside its free allowance.
  assert.equal(cost("tinyfish").costUsd, 0);
  assert.equal(cost("tinyfish").costSource, "computed");
  // Three results: Context bills one 10-result block; Firecrawl 2 credits.
  assert.equal(cost("context").costUsd, 0.002);
  assert.equal(cost("firecrawl").costUsd, 0.0076);
  assert.equal(await runPages(ctx), "done");
  const pages = readJsonl<PageRecord>(runPaths(dir).pages);
  assert.ok(pages.length > 0);
  assert.ok(pages.every((p) => p.status === "ok"), "every synthetic page is readable");
  // Pages come from the harness's own fetcher: no provider's contents endpoint is called.
  for (const id of Object.keys(reg)) {
    const contentsUrl = reg[id]!.contents?.request.url;
    if (contentsUrl) assert.ok(!calls.some((u) => u.startsWith(contentsUrl)), id);
  }
  assert.ok(calls.some((u) => u === "https://example.org/robots.txt"));
});

test("the pilot plan stays under $50, counts provider calls only, and its arithmetic adds up", () => {
  const config = loadRunConfig(join(BENCH_DIR, "config", "pilot.json"));
  const items = loadRunItems(config);
  const judge = createJudge(method.judge.id, method.judge.rubric, { fetch: (() => Promise.reject(new Error("no calls"))) as typeof fetch, env: {} });
  const plan = makePlan({ config, method, items, registry: reg, judge });
  assert.ok(plan.maxUsd < 50, `pilot worst case ${plan.maxUsd}`);
  assert.ok(plan.maxUsd <= config.capUsd);
  const search = plan.providers.flatMap((p) => p.profiles).reduce((s, x) => s + x.calls * x.reservation.usd, 0);
  assert.ok(Math.abs(search - plan.search.maxUsd) < 1e-9);
  assert.equal(plan.pages.maxUrls, config.pagePasses.length * items.length * config.providers.length * method.pages.topK);
  // The judge is covered by the owner's plan, and pages cost nothing: the spend is search calls alone.
  assert.equal(config.judgePricing, "covered-by-plan");
  assert.equal(plan.judge!.maxUsd, 0);
  assert.ok(Math.abs(plan.maxUsd - plan.search.maxUsd) < 1e-9);
  // Every item is judged.
  assert.equal(plan.judgeItemIds.length, items.length);
  assert.equal(plan.judge!.maxPairs, items.length * config.providers.length * method.judge.topK);
  // No reservation guesses a margin: each equals the SDK's cost bound.
  for (const p of plan.providers) for (const x of p.profiles) assert.equal(x.reservation.usd, x.reservation.boundUsd, p.id);
  // Under list-price judging the judge's worst case counts against the cap again.
  const listPriced = makePlan({ config: { ...config, judgePricing: "list-price" }, method, items, registry: reg, judge });
  assert.ok(listPriced.judge!.maxUsd > 0);
  assert.ok(Math.abs(listPriced.maxUsd - (listPriced.search.maxUsd + listPriced.judge!.maxUsd)) < 1e-9);
});
