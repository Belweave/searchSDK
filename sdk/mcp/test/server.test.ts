// In-process and stdio tests with fixture responses only. The guard (test/guard.ts) fails any
// real network use, so no provider is ever called and nothing is billed.
import assert from "node:assert/strict";
import { test } from "node:test";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Client, InMemoryTransport } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import { createLocalServer, type LocalServerOptions } from "../src/server.ts";

const KEY = "test-key-7f3a9c1e";
const HERE = path.dirname(fileURLToPath(import.meta.url));

type Sent = { url: string; method: string; headers: Headers; body: unknown };

/** A fetch that answers from fixtures and records what was sent. */
function fixtureFetch(sent: Sent[]): typeof fetch {
  return (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = input instanceof Request ? input.url : String(input);
    sent.push({ url, method: init?.method ?? "GET", headers: new Headers(init?.headers), body: init?.body ? JSON.parse(String(init.body)) : null });
    if (url === "https://api.exa.ai/search") {
      return Response.json({
        requestId: "req-fixture-1",
        results: [
          { id: "a", url: "https://sqlite.org/wal.html", title: "Write-Ahead Logging", highlights: ["WAL mode lets readers run with a writer."], publishedDate: "2026-01-02T00:00:00.000Z", author: null },
          { id: "b", url: "https://example.com/wal", title: "WAL notes", highlights: [], publishedDate: null, author: "A. Writer" },
        ],
        costDollars: { total: 0.007 },
      });
    }
    if (url === "https://api.exa.ai/contents") {
      return Response.json({ requestId: "req-fixture-2", results: [{ url: "https://sqlite.org/wal.html", title: "Write-Ahead Logging", text: "x".repeat(5000) }], costDollars: { total: 0.001 } });
    }
    return new Response("{}", { status: 404 });
  }) as typeof fetch;
}

async function connect(options: LocalServerOptions) {
  const server = createLocalServer(options);
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
  await server.connect(serverSide);
  const client = new Client({ name: "test", version: "0.0.0" });
  await client.connect(clientSide);
  return client;
}

test("speaks the 2026-07-28 revision over stdio, and 2025-11-25 for older clients", async () => {
  for (const [mode, expected] of [[{ pin: "2026-07-28" }, "2026-07-28"], ["legacy", "2025-11-25"]] as const) {
    const transport = new StdioClientTransport({ command: process.execPath, args: [path.join(HERE, "..", "src", "cli.ts")], env: { PATH: process.env.PATH ?? "" } });
    const client = new Client({ name: "era-test", version: "0.0.0" });
    client.setVersionNegotiation({ mode });
    await client.connect(transport);
    try {
      assert.equal(client.getNegotiatedProtocolVersion(), expected);
      const doc = textOf(await client.callTool({ name: "get_doc", arguments: { path: "mcp" } }));
      assert.match(doc, /^# MCP server/);
    } finally {
      await client.close();
    }
  }
});

const textOf = (r: { content?: unknown }) => ((r.content as { type: string; text?: string }[]) ?? []).map((c) => c.text ?? "").join("\n");

test("lists the docs, registry, search and contents tools, resources and prompts", async () => {
  const client = await connect({ env: {} });
  const tools = (await client.listTools()).tools.map((t) => t.name).sort();
  assert.deepEqual(tools, ["contents", "estimate_cost", "get_doc", "get_example", "get_provider", "list_providers", "search", "search_docs", "validate_options"]);
  const resources = (await client.listResources()).resources.map((r) => r.uri);
  assert.ok(resources.includes("searchsdk://docs/guides/fallback"));
  assert.ok(resources.includes("searchsdk://providers/exa"));
  assert.ok(resources.includes("searchsdk://skill/SKILL.md"));
  const prompts = (await client.listPrompts()).prompts.map((p) => p.name).sort();
  assert.deepEqual(prompts, ["choose-provider", "integrate-searchsdk"]);
  assert.match(client.getInstructions() ?? "", /Keys found for: none/);
});

test("docs tools search, read and find examples", async () => {
  const client = await connect({ env: {} });
  const hits = textOf(await client.callTool({ name: "search_docs", arguments: { query: "fallback rate limit retry" } }));
  assert.match(hits, /https:\/\/searchsdk\.dev\/docs\/guides\/fallback/);
  const doc = textOf(await client.callTool({ name: "get_doc", arguments: { path: "guides/fallback" } }));
  assert.match(doc, /^# Fallback and retries/);
  const missing = await client.callTool({ name: "get_doc", arguments: { path: "nope" } });
  assert.equal(missing.isError, true);
  const example = textOf(await client.callTool({ name: "get_example", arguments: { task: "Vercel AI SDK tool" } }));
  assert.match(example, /from "ai"/);
  const read = await client.readResource({ uri: "searchsdk://docs/mcp" });
  assert.match(String((read.contents[0] as { text?: string }).text), /MCP server/);
});

test("registry tools are pure and honest about verification", async () => {
  const client = await connect({ env: {} });
  const list = textOf(await client.callTool({ name: "list_providers", arguments: {} }));
  assert.match(list, /\| exa \| Exa \| unverified \| unverified \| EXA_API_KEY \|/);
  const exa = JSON.parse(textOf(await client.callTool({ name: "get_provider", arguments: { id: "exa" } })));
  assert.match(exa.search.verification, /^unverified/);
  assert.equal(exa.search.options.startDate, "yes");
  const cost = JSON.parse(textOf(await client.callTool({ name: "estimate_cost", arguments: { provider: "exa", maxResults: 10 } })));
  assert.equal(typeof cost.costBound.usd, "number");
  assert.equal(cost.listPrice.count, 10);
  const ok = JSON.parse(textOf(await client.callTool({ name: "validate_options", arguments: { provider: "exa", options: { recency: "week", maxResults: 20 } } })));
  assert.equal(ok.supported, true);
  assert.equal(ok.wouldSend.url, "https://api.exa.ai/search");
  assert.doesNotMatch(JSON.stringify(ok), /validate-only-placeholder/);
  const no = JSON.parse(textOf(await client.callTool({ name: "validate_options", arguments: { provider: "brave", options: { startDate: "2026-01-01" } } })));
  assert.deepEqual([no.supported, no.code], [false, "unsupported"]);
  const bad = JSON.parse(textOf(await client.callTool({ name: "validate_options", arguments: { provider: "exa", options: { numResults: 5 } } })));
  assert.deepEqual([bad.supported, bad.code, bad.field], [false, "invalid_request", "numResults"]);
});

test("search runs through the SDK with the key from env, and never returns the key", async () => {
  const sent: Sent[] = [];
  const client = await connect({ env: { EXA_API_KEY: KEY }, fetch: fixtureFetch(sent) });
  const result = await client.callTool({ name: "search", arguments: { query: "sqlite wal mode", maxResults: 5 } });
  const text = textOf(result);
  assert.equal(result.isError, undefined);
  assert.equal(sent.length, 1);
  assert.equal(sent[0]!.headers.get("x-api-key"), KEY);
  assert.equal((sent[0]!.body as { numResults: number }).numResults, 5);
  const body = JSON.parse(text);
  assert.equal(body.provider, "exa");
  assert.equal(body.results[0].title, "Write-Ahead Logging");
  assert.equal(body.cost.usd, 0.007);
  assert.equal(body.attempts.length, 1);
  assert.ok(!text.includes(KEY));
});

test("contents cuts long pages and reports it", async () => {
  const sent: Sent[] = [];
  const client = await connect({ env: { EXA_API_KEY: KEY }, fetch: fixtureFetch(sent) });
  const body = JSON.parse(textOf(await client.callTool({ name: "contents", arguments: { urls: ["https://sqlite.org/wal.html"], maxChars: 1000 } })));
  assert.equal(body.pages[0].status, "ok");
  assert.equal(body.pages[0].content.length, 1000);
  assert.equal(body.pages[0].truncated, true);
  assert.equal(body.pages[0].contentChars, 5000);
});

test("a missing key is a configuration error with a hint, and nothing is sent", async () => {
  const sent: Sent[] = [];
  const client = await connect({ env: {}, fetch: fixtureFetch(sent) });
  const result = await client.callTool({ name: "search", arguments: { query: "x", provider: "tavily" } });
  assert.equal(result.isError, true);
  const body = JSON.parse(textOf(result));
  assert.equal(body.error.code, "configuration");
  assert.match(body.error.hint, /TAVILY_API_KEY/);
  assert.equal(sent.length, 0);
  const none = JSON.parse(textOf(await client.callTool({ name: "search", arguments: { query: "x" } })));
  assert.equal(none.error.field, "provider");
});

test("a bad SEARCHSDK_ setting stops the server at start", () => {
  assert.throws(() => createLocalServer({ env: { SEARCHSDK_PROVIDER: "nope" } }), /unknown provider "nope"/);
  assert.throws(() => createLocalServer({ env: { SEARCHSDK_MAX_RETRIES: "9" } }), /SEARCHSDK_MAX_RETRIES/);
});

test("the stdio binary initializes, lists tools and keeps keys out of every output", async () => {
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [path.join(HERE, "..", "src", "cli.ts")],
    env: { PATH: process.env.PATH ?? "", EXA_API_KEY: KEY },
    stderr: "pipe",
  });
  let stderr = "";
  transport.stderr?.on("data", (d: Buffer) => (stderr += d.toString()));
  const client = new Client({ name: "stdio-test", version: "0.0.0" });
  await client.connect(transport);
  try {
    assert.equal(client.getServerVersion()?.name, "searchsdk");
    const tools = (await client.listTools()).tools.map((t) => t.name);
    assert.ok(tools.includes("search") && tools.includes("search_docs"));
    const list = textOf(await client.callTool({ name: "list_providers", arguments: {} }));
    assert.ok(!list.includes(KEY));
    assert.match(client.getInstructions() ?? "", /Keys found for: exa/);
    assert.ok(!(client.getInstructions() ?? "").includes(KEY));
  } finally {
    await client.close();
  }
  assert.ok(!stderr.includes(KEY));
});
