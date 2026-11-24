// Drives the platform fetch (undici on Node) against a loopback server, so the
// body-read failure paths are exercised by a real transport, not the harness.
import { loopbackFetch } from "./guard.ts";
import assert from "node:assert/strict";
import http from "node:http";
import { after, before, test } from "node:test";
import { createClient, SearchError } from "../src/index.ts";

let server: http.Server;
let origin = "";

before(async () => {
  server = http.createServer((req, res) => {
    if (req.url?.startsWith("/whole")) {
      res.writeHead(200, { "content-type": "application/json" });
      res.end('{"results":[{"url":"https://a.example/","title":"A"}]}');
      return;
    }
    res.writeHead(200, { "content-type": "application/json" });
    res.write('{"results":['); // then stall
    if (req.url?.startsWith("/reset")) setTimeout(() => req.socket.destroy(), 30);
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  origin = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
});

after(() => { server.closeAllConnections(); server.close(); });

/** Sends Exa's request to the loopback server instead, at the given path. */
const client = (path: string) => createClient({
  keys: { exa: "test-key" },
  fetch: ((url: string, init: RequestInit) => loopbackFetch(url.replace("https://api.exa.ai/search", origin + path), init)) as typeof fetch,
});

const failsWith = (code: string, status?: number) => (e: unknown) => {
  assert.ok(e instanceof SearchError, `expected SearchError, got ${String(e)}`);
  assert.equal(e.code, code);
  assert.equal(e.attempts.length, 1);
  assert.equal(e.attempts[0]!.code, code);
  if (status !== undefined) assert.equal(e.attempts[0]!.status, status);
  return true;
};

test("real fetch: a complete response is mapped", async () => {
  const res = await client("/whole").search("q", { provider: "exa" });
  assert.equal(res.results[0]!.url, "https://a.example/");
});

test("real fetch: the call deadline during a stalled 2xx body is a timeout SearchError", async () => {
  await assert.rejects(client("/stall").search("q", { provider: "exa", timeoutMs: 150 }), failsWith("timeout", 200));
});

test("real fetch: the attempt deadline during a stalled 2xx body is an attempt_timeout SearchError", async () => {
  await assert.rejects(client("/stall").search("q", { provider: "exa", timeoutMs: 5000, attemptTimeoutMs: 150 }), failsWith("attempt_timeout", 200));
});

test("real fetch: cancellation during a 2xx body is an aborted SearchError", async () => {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), 100);
  await assert.rejects(client("/stall").search("q", { provider: "exa", signal: controller.signal, timeoutMs: 5000 }), failsWith("aborted", 200));
});

test("real fetch: a connection reset during a 2xx body is a network SearchError, billed yes", async () => {
  await assert.rejects(client("/reset").search("q", { provider: "exa", timeoutMs: 5000 }), (e: unknown) => {
    failsWith("network", 200)(e);
    assert.equal((e as SearchError).attempts[0]!.billed, "yes");
    return true;
  });
});
