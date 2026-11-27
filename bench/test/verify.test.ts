// Live conformance (bench verify) against SYNTHETIC replies: the real SDK and
// the real Firecrawl spec and vectors, with an injected fetch that answers
// each replay with the vector's own synthetic body. No request leaves the process.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { Budget } from "../src/run/budget.ts";
import { loadMethod } from "../src/run/config.ts";
import { createClient, registry, SearchError, type ProviderSpec } from "../src/sdk.ts";
import { REPO_DIR } from "../src/util/core.ts";
import { checkReplay, classifyCase, publicSummary, runVerify, type DiagEvent, type Executor, type LiveOverride, type LiveOutcome, type VectorCase } from "../src/verify/verify.ts";
import { tempStore } from "./helpers.ts";

const method = loadMethod();
const spec = (registry as unknown as Record<string, ProviderSpec>).firecrawl!;
const vectors = JSON.parse(readFileSync(join(REPO_DIR, "registry/conformance/providers/firecrawl.json"), "utf8")).cases as VectorCase[];
const overrides = JSON.parse(readFileSync(join(REPO_DIR, "registry/conformance/live/overrides.json"), "utf8")).providers.firecrawl as Record<string, LiveOverride>;
const SECRET = "SECRETKEY-fc-verify-01";

/** Answers each call with the synthetic body of the vector it replays (optionally altered). */
function fakeExecutor(alter: (name: string, body: unknown) => unknown = (_n, b) => b, seen: string[] = []): Executor {
  return async (_runtime, call) => {
    const c = vectors.find((v) => {
      const cls = classifyCase(v, overrides[v.name] ?? null);
      return cls.kind === "replay" && JSON.stringify(cls.call) === JSON.stringify(call);
    })!;
    const diagnostics: DiagEvent[] = [];
    const client = createClient<string>({
      keys: { firecrawl: SECRET },
      diagnostics: (e) => diagnostics.push(e as unknown as DiagEvent),
      fetch: (async (input: unknown) => {
        seen.push(String(input));
        // A live page reports the URL it was asked for: the override's, where there is one.
        const cls = classifyCase(c, overrides[c.name] ?? null);
        let text = JSON.stringify(alter(c.name, c.responses![0]!.body));
        if (cls.kind === "replay") for (const [from, to] of cls.substitutions) text = text.split(JSON.stringify(from)).join(JSON.stringify(to));
        return new Response(text, { status: c.responses![0]!.status ?? 200, headers: { "content-type": "application/json" } });
      }) as typeof fetch,
    });
    try {
      const r = call.call === "search" ? await client.search(call.query!, call.options as never) : await client.contents(call.urls!, call.options as never);
      return { response: JSON.parse(JSON.stringify(r)), error: null, diagnostics } as LiveOutcome;
    } catch (e) {
      if (e instanceof SearchError) return { response: null, error: { code: e.code, status: e.status ?? null, providerCode: e.providerCode ?? null }, diagnostics };
      throw e;
    }
  };
}

function budget(store: string, cap = 0.5) {
  return new Budget({ ledgerPath: join(store, "ledger.jsonl"), runId: "verify-t", runCapUsd: cap, monthlyCapUsd: 100 });
}

test("vectors are classed as local, scripted failure or replay", () => {
  const kinds = Object.fromEntries(vectors.map((v) => [v.name, classifyCase(v, overrides[v.name] ?? null).kind]));
  assert.equal(kinds["402 is quota"], "scripted-failure");
  assert.equal(kinds["500 keeps the provider code"], "scripted-failure");
  assert.equal(kinds["two URLs exceed the one-URL scrape and nothing is sent"], "local");
  assert.equal(Object.values(kinds).filter((k) => k === "replay").length, 7);
});

test("an override replaces the input and the expected request alike", () => {
  const c = vectors.find((v) => v.name.startsWith("scrape maps one URL"))!;
  const cls = classifyCase(c, overrides[c.name]!);
  assert.ok(cls.kind === "replay");
  assert.deepEqual(cls.call.urls, ["https://example.com/"]);
  assert.deepEqual(cls.substitutions, [["https://example.com/page", "https://example.com/"]]);
});

test("replaying the synthetic bodies verifies both endpoints, sends no key, and stays in budget", async () => {
  const store = tempStore();
  const seen: string[] = [];
  const r = await runVerify({ mode: "fixture", spec, vectors, overrides, kinds: ["search", "contents"], runtimes: ["typescript", "python"], execute: fakeExecutor(undefined, seen), budget: budget(store), method, maxCredits: 200, intervalMs: 0 });
  for (const e of r.endpoints) assert.ok(e.verified, `${e.kind}: ${JSON.stringify(e.cases.flatMap((c) => c.runs.flatMap((x) => x.checks.filter((k) => !k.ok))))}`);
  assert.equal(seen.length, 14);
  assert.ok(!JSON.stringify(publicSummary(r)).includes(SECRET));
  assert.ok(!readFileSync(join(store, "ledger.jsonl"), "utf8").includes(SECRET));
});

test("a body that lost a mapped field is not verified", async () => {
  const store = tempStore();
  const strip = (_n: string, b: unknown) => {
    const body = JSON.parse(JSON.stringify(b));
    if (body?.data?.metadata) delete body.data.metadata.sourceURL;
    return body;
  };
  const r = await runVerify({ mode: "fixture", spec, vectors, overrides, kinds: ["contents"], runtimes: ["typescript"], execute: fakeExecutor(strip), budget: budget(store), method, maxCredits: 200, intervalMs: 0 });
  assert.equal(r.endpoints[0]!.verified, false);
});

test("a wrong page status fails the replay; an empty result list is only a note", () => {
  const c = vectors.find((v) => v.name.startsWith("a target 404"))!;
  const cls = classifyCase(c, null);
  assert.ok(cls.kind === "replay");
  const ok: LiveOutcome = { response: { pages: [{ status: "ok", error: null }], cost: { source: "computed" }, attempts: [] }, error: null, diagnostics: [{ attempt: {} as never, request: { method: "POST", url: "u", headers: {}, body: "{}" }, response: { status: 200, headers: {}, body: "{}" }, paths: [] }] };
  assert.ok(checkReplay(spec, c, cls, ok).some((k) => k.name === "page statuses" && !k.ok));
  const s = vectors.find((v) => v.name.startsWith("search maps every"))!;
  const scls = classifyCase(s, null);
  assert.ok(scls.kind === "replay");
  const empty: LiveOutcome = { response: { results: [], cost: { source: "reported-credits" }, requestId: "x", attempts: [] }, error: null, diagnostics: [{ attempt: {} as never, request: { method: "POST", url: "u", headers: {}, body: "{}" }, response: { status: 200, headers: {}, body: "{}" }, paths: [] }] };
  const note = checkReplay(spec, s, scls, empty).find((k) => k.name === "results returned")!;
  assert.equal(note.ok, false);
  assert.equal(note.soft, true);
});

test("the credit limit and the cap stop the session before a call could pass them", async () => {
  const store = tempStore();
  const r = await runVerify({ mode: "fixture", spec, vectors, overrides, kinds: ["search"], runtimes: ["typescript", "python"], execute: fakeExecutor(), budget: budget(store), method, maxCredits: 5, intervalMs: 0 });
  assert.match(r.endpoints[0]!.stopped ?? "", /credit limit/);
  assert.equal(r.endpoints[0]!.verified, false);
  assert.ok(r.credits <= 5);
});
