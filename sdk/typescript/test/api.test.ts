import "./guard.ts";
import assert from "node:assert/strict";
import dgram from "node:dgram";
import dns from "node:dns";
import { readdirSync } from "node:fs";
import net from "node:net";
import { test } from "node:test";
import { inspect } from "node:util";
import { createClient, policy, registry, search, SearchError } from "../src/index.ts";

const ok = (body: unknown) => (async () => new Response(JSON.stringify(body), { status: 200 })) as typeof fetch;
const specFiles = readdirSync(new URL("../../../registry/providers/", import.meta.url)).filter((f) => f.endsWith(".json")).map((f) => f.slice(0, -5)).sort();

test("the network guard blocks real calls", async () => {
  await assert.rejects(globalThis.fetch("https://example.com"), /blocked/);
  assert.throws(() => net.connect(443, "example.com"), /blocked/);
  assert.throws(() => net.connect({ host: "93.184.215.14", port: 443 }), /blocked/);
  assert.throws(() => dns.lookup("example.com", () => {}), /blocked/);
  assert.throws(() => dns.resolve4("example.com", () => {}), /blocked/);
  assert.throws(() => new dns.Resolver().resolve4("example.com", () => {}), /blocked/);
  assert.throws(() => dgram.createSocket("udp4"), /blocked/);
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

test("the registry is exported for routers and benchmarks, one entry per spec file", () => {
  assert.deepEqual(Object.keys(registry).sort(), specFiles);
});

test("the exported registry and policy cannot be changed at runtime", () => {
  const exa = registry.exa as any;
  assert.throws(() => { exa.search.request.url = "https://attacker.example/collect"; }, TypeError);
  assert.throws(() => { exa.search.request.fixed.type = "deep"; }, TypeError);
  assert.throws(() => { exa.auth.name = "x"; }, TypeError);
  assert.throws(() => { (registry as any).evil = exa; }, TypeError);
  assert.throws(() => { (policy as any).retry.maxRetries = 99; }, TypeError);
  assert.throws(() => { (policy as any).fallbackOn.push("auth"); }, TypeError);
  assert.equal(registry.exa.search!.request.url, "https://api.exa.ai/search");
});

test("a client copies a custom registry, so later edits by other code have no effect", async () => {
  const custom = structuredClone({ exa: registry.exa }) as any;
  const urls: string[] = [];
  const client = createClient({ registry: custom, keys: { exa: "k" }, fetch: (async (url: string) => { urls.push(url); return new Response('{"results":[]}'); }) as typeof fetch });
  custom.exa.search.request.url = "https://attacker.example/collect";
  await client.search("q", { provider: "exa" });
  assert.deepEqual(urls, ["https://api.exa.ai/search"]);
});

test("a custom registry's ids are the client's provider ids, with no casts", async () => {
  const mine = { ...structuredClone(registry.exa), id: "mine" };
  const client = createClient({
    registry: { mine }, keys: { mine: "k" }, fallback: ["mine"],
    fetch: (async () => new Response('{"results":[]}')) as typeof fetch,
  });
  const response = await client.search("q", { provider: "mine", providerOptions: { mine: { type: "fast" } } });
  const id: "mine" = response.provider;
  assert.equal(id, "mine");
  // @ts-expect-error built-in ids are not in this client's registry
  await assert.rejects(client.search("q", { provider: "exa" }), (e: unknown) => e instanceof SearchError && e.code === "configuration" && e.field === "provider");
});

test("a custom registry is validated against the schema", () => {
  const bad = structuredClone({ exa: registry.exa }) as any;
  bad.exa.search.request.url = "http://insecure.example/search";
  assert.throws(() => createClient({ registry: bad }), (e: unknown) => e instanceof SearchError && e.code === "configuration" && e.field === "registry");
  const mismatched = { other: structuredClone(registry.exa) };
  assert.throws(() => createClient({ registry: mismatched }), (e: unknown) => e instanceof SearchError && e.code === "configuration");
});

test("a signal that is not an AbortSignal is rejected before anything is sent", async () => {
  let sent = 0;
  const client = createClient({ keys: { exa: "k" }, fetch: (async () => { sent++; return new Response('{"results":[]}'); }) as typeof fetch });
  for (const signal of [{}, { aborted: false }, "x", null]) {
    await assert.rejects(client.search("q", { provider: "exa", signal: signal as never }), (e: unknown) => e instanceof SearchError && e.code === "invalid_request" && e.field === "signal");
  }
  assert.equal(sent, 0);
});

test("provider options must be JSON that survives the trip: NaN and Infinity are refused, not sent as null", async () => {
  let sent = 0;
  const client = createClient({ keys: { exa: "k" }, fetch: (async () => { sent++; return new Response('{"results":[]}'); }) as typeof fetch });
  for (const bad of [Number.NaN, Number.POSITIVE_INFINITY, { deep: [Number.NEGATIVE_INFINITY] }]) {
    await assert.rejects(client.search("q", { provider: "exa", providerOptions: { exa: { contents: bad as never } } }),
      (e: unknown) => e instanceof SearchError && e.code === "invalid_request" && e.field === "providerOptions.exa.contents");
  }
  assert.equal(sent, 0);
});

test("a fetch that throws synchronously is a network error", async () => {
  const client = createClient({ keys: { exa: "k" }, fetch: (() => { throw new TypeError("boom"); }) as typeof fetch });
  await assert.rejects(client.search("q", { provider: "exa" }), (e: unknown) => e instanceof SearchError && e.code === "network");
});

test("concurrent calls on one client keep their own attempts", async () => {
  let n = 0;
  const client = createClient({ keys: { exa: "k" }, fetch: (async () => new Response(JSON.stringify({ results: [], requestId: `r${++n}` }))) as typeof fetch });
  const [a, b] = await Promise.all([client.search("a", { provider: "exa" }), client.search("b", { provider: "exa" })]);
  assert.equal(a.attempts.length, 1);
  assert.equal(b.attempts.length, 1);
  assert.notEqual(a.requestId, b.requestId);
});

test("client settings are checked when the client is created, not at its first call", () => {
  const code = (config: Parameters<typeof createClient>[0]) => {
    try { createClient(config as never); return null; } catch (e) { return e instanceof SearchError ? [e.code, e.field] : e; }
  };
  assert.deepEqual(code({ provider: "nope" as never }), ["configuration", "provider"]);
  assert.deepEqual(code({ provider: "toString" as never }), ["configuration", "provider"]);
  assert.deepEqual(code({ provider: "exa", fallback: ["nope" as never] }), ["configuration", "fallback"]);
  assert.deepEqual(code({ fallback: "exa" as never }), ["configuration", "fallback"]);
  assert.deepEqual(code({ timeoutMs: 0 }), ["invalid_request", "timeoutMs"]);
  assert.deepEqual(code({ maxRetries: 9 }), ["invalid_request", "maxRetries"]);
  assert.deepEqual(code({ maxResponseBytes: 1 }), ["invalid_request", "maxResponseBytes"]);
  // Policy order: call settings first, then provider, then fallback.
  assert.deepEqual(code({ provider: "nope" as never, timeoutMs: 0 }), ["invalid_request", "timeoutMs"]);
  assert.equal(code({}), null);
  assert.equal(code({ provider: "exa", fallback: ["tavily"], timeoutMs: 1000 }), null);
  assert.equal(code({ fallback: ["tavily"] }), null);
  const mine = { ...structuredClone(registry.exa), id: "mine" };
  assert.equal(code({ registry: { mine }, provider: "mine" } as never), null);
  assert.deepEqual(code({ registry: { mine }, provider: "exa" } as never), ["configuration", "provider"]);
});
