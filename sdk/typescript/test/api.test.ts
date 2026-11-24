import assert from "node:assert/strict";
import net from "node:net";
import { test } from "node:test";
import { inspect } from "node:util";
import { createClient, registry, search, SearchError } from "../src/index.ts";

const ok = (body: unknown) => (async () => new Response(JSON.stringify(body), { status: 200 })) as typeof fetch;

test("the network guard blocks real calls", async () => {
  await assert.rejects(globalThis.fetch("https://example.com"), /blocked/);
  assert.throws(() => net.connect(443, "example.com"), /blocked/);
});

test("the top-level search reads the documented env var and uses the global fetch (blocked here)", async () => {
  process.env.EXA_API_KEY = "test-key-from-env";
  try {
    await assert.rejects(search("q", { provider: "exa" }), (e: unknown) => e instanceof SearchError && e.code === "network");
  } finally {
    delete process.env.EXA_API_KEY;
  }
});

test("four-line usage with an injected fetch", async () => {
  const client = createClient({ keys: { exa: "test-key" }, fetch: ok({ results: [{ url: "https://a.example/", title: "A" }] }) });
  const { results, cost, provider } = await client.search("hello", { provider: "exa" });
  assert.equal(provider, "exa");
  assert.equal(results[0]!.title, "A");
  assert.equal(cost.source, "computed");
});

test("keys never appear in responses, errors or the client", async () => {
  const key = "sk-test-secret-never-printed";
  const client = createClient({ keys: { exa: key }, fetch: ok({ results: [] }) });
  const res = await client.search("q", { provider: "exa" });
  for (const text of [JSON.stringify(res), inspect(client, { depth: 5 }), JSON.stringify(client)]) assert.ok(!text.includes(key));
  const failing = createClient({ keys: { exa: key }, fetch: (async () => new Response("{}", { status: 401 })) as typeof fetch });
  const err = await failing.search("q", { provider: "exa" }).catch((e) => e);
  for (const text of [String(err), JSON.stringify(err), err.stack, inspect(err, { depth: 5 })]) assert.ok(!text.includes(key));
});

test("caller keys are copied, not referenced", async () => {
  const keys: { exa?: string } = { exa: "test-key" };
  const client = createClient({ keys, fetch: ok({ results: [] }) });
  keys.exa = "bad key with spaces";
  await client.search("q", { provider: "exa" });
});

test("the registry is exported for routers and benchmarks", () => {
  assert.deepEqual(Object.keys(registry).sort(), ["context", "exa", "tavily", "tinyfish"]);
});
