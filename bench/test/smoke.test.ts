// The smoke check against SYNTHETIC recorded-shape responses for the four
// first-run providers, through the real SDK and the real registry specs. No
// request leaves the process; these results verify the harness, not the specs.
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { Budget, poolUsage } from "../src/run/budget.ts";
import { loadMethod } from "../src/run/config.ts";
import { createClient, registry, type ProviderSpec } from "../src/sdk.ts";
import { formatSmoke, runSmoke, smokePlan } from "../src/smoke.ts";
import { SHAPES, shapeFetch, type FixtureShapes } from "../src/smoke-fixtures.ts";
import { tempStore } from "./helpers.ts";

const method = loadMethod();
const reg = registry as unknown as Record<string, ProviderSpec>;
const PROVIDERS = ["exa", "context", "firecrawl", "tinyfish"];
const KEYS = { exa: "SECRETKEY-exa-000001", context: "SECRETKEY-ctx-000002", firecrawl: "SECRETKEY-fc-0000003", tinyfish: "SECRETKEY-tf-0000004" };

async function smoke(shapes: FixtureShapes = SHAPES, searches = 2) {
  const store = tempStore();
  const dir = join(store, "smoke", "t");
  const seen: { url: string; authSent: boolean }[] = [];
  const client = createClient<string>({ keys: KEYS, fetch: shapeFetch(shapes, seen) });
  const ledgerPath = join(store, "ledger.jsonl");
  const budget = new Budget({ ledgerPath, runId: "smoke-t", runCapUsd: 0.1, monthlyCapUsd: 100, providerLimits: { firecrawl: { credits: 800, since: "2026-11-25" } } });
  const report = await runSmoke({ mode: "fixture", providers: PROVIDERS, registry: reg, client, budget, method, dir, searches });
  return { report, dir, seen, ledgerPath, text: formatSmoke(report) };
}

test("the smoke plan is a few cents, with Firecrawl's credits counted", () => {
  const p = smokePlan(reg, PROVIDERS, 2, method);
  assert.ok(Math.abs(p.maxUsd - 0.049) < 1e-9, String(p.maxUsd));
  assert.deepEqual(p.credits, { context: 3, firecrawl: 5 });
  assert.ok(smokePlan(reg, PROVIDERS, 3, method).maxUsd <= 0.1);
});

test("documented shapes: every provider answers 2 searches and 1 contents call, and every mapped path is found", async () => {
  const { report, seen, ledgerPath, text } = await smoke();
  assert.equal(report.calls.length, 12);
  for (const c of report.calls) {
    assert.equal(c.outcome, "ok", `${c.provider} ${c.kind} ${c.n}`);
    assert.equal(c.status, 200);
  }
  assert.ok(seen.every((s) => s.authSent), "each call carries its provider's auth header");
  const exa = report.calls.find((c) => c.provider === "exa" && c.kind === "search")!;
  const f = (name: string) => exa.fields.find((x) => x.field === name)!;
  assert.deepEqual([f("search.response.fields.publishedAt").path, f("search.response.fields.publishedAt").present, f("search.response.fields.publishedAt").of], ["publishedDate", 5, 10]);
  assert.equal(f("search.cost.reported").present, 1);
  assert.equal(exa.cost.source, "reported");
  assert.ok(exa.cost.usd! <= exa.cost.boundUsd!);
  assert.deepEqual(report.problems.filter((p) => p.severity !== "note"), []);
  // TinyFish documents no request id; the spec's header rule finds none in these shapes, which is reported as a note.
  assert.ok(report.problems.some((p) => p.provider === "tinyfish" && p.where === "search.response.requestId"));
  // Firecrawl's smoke credits count against its limit: 2 searches x 2 credits and 1 scrape.
  assert.deepEqual(poolUsage(ledgerPath, "firecrawl", "2026-11-25"), { credits: 5, calls: 3 });
  assert.match(text, /FIXTURE: synthetic recorded-shape responses, not a live check/);
  assert.match(text, /firecrawl\s+search: results \(data\.web\) 2\/2; fields\.url \(url\) 20\/20/);
});

test("a wrong spec path is named, with the field, the path and the counts", async () => {
  const shapes: FixtureShapes = {
    ...SHAPES,
    "api.exa.ai/search": (req) => {
      const r = SHAPES["api.exa.ai/search"]!(req);
      const body = r.body as { results: Record<string, unknown>[] };
      return { ...r, body: { ...body, results: body.results.map(({ highlights, publishedDate, ...rest }) => ({ ...rest, snippets: highlights, published_date: publishedDate })) } };
    },
    "api.firecrawl.dev/v2/search": (req) => {
      const r = SHAPES["api.firecrawl.dev/v2/search"]!(req);
      return { ...r, body: { ...(r.body as object), data: { results: (r.body as { data: { web: unknown[] } }).data.web } } };
    },
    "api.context.dev/v1/web/search": () => ({ status: 401, body: { message: "bad key", error_code: "UNAUTHORIZED" } }),
  };
  const { report, text } = await smoke(shapes);
  const msg = (p: string) => report.problems.filter((x) => x.provider === p).map((x) => `${x.severity} ${x.where}: ${x.message}`).join("\n");
  assert.match(msg("exa"), /error search\.response\.fields\.excerpts \("highlights"\): present in 0 of 20/);
  assert.match(msg("exa"), /warn search\.response\.fields\.publishedAt \("publishedDate"\): present in 0 of 20/);
  assert.match(msg("firecrawl"), /search\.response\.results \("data\.web"\): present in 0 of 2/);
  assert.match(msg("context"), /error search 1: auth \(HTTP 401, provider code UNAUTHORIZED\)/);
  assert.match(text, /problems \(error: fix before the full run/);
});

test("a cost above the spec's bound is an error and stops further paid calls", async () => {
  const shapes: FixtureShapes = {
    ...SHAPES,
    "api.exa.ai/search": (req) => {
      const r = SHAPES["api.exa.ai/search"]!(req);
      return { ...r, body: { ...(r.body as object), costDollars: { total: 0.05 } } };
    },
  };
  const { report } = await smoke(shapes);
  assert.ok(report.problems.some((p) => p.provider === "exa" && p.severity === "error" && /above the spec's bound/.test(p.message)));
  assert.equal(report.calls.filter((c) => c.provider === "exa").length, 1, "nothing more is sent after an overrun");
});

test("no key, and nothing derived from one, reaches the output, the report or the raw files; raw files are private", async () => {
  const { dir, text } = await smoke();
  const files = readdirSync(dir);
  assert.ok(files.includes("report.json") && files.includes("exa-search-1.json"));
  for (const f of files) {
    const body = readFileSync(join(dir, f), "utf8");
    for (const k of Object.values(KEYS)) assert.ok(!body.includes(k) && !body.includes(k.slice(-6)), `${f} holds no key`);
    assert.equal(statSync(join(dir, f)).mode & 0o077, 0, `${f} is readable by its owner only`);
  }
  for (const k of Object.values(KEYS)) assert.ok(!text.includes(k.slice(-6)));
  const report = readFileSync(join(dir, "report.json"), "utf8");
  assert.ok(!report.includes("Synthetic Exa result"), "the report holds paths and counts, not response text");
});
