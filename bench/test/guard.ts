// Fails any real network use in bench tests. Loaded with --import before every
// test file, so no test can reach a provider, a judge or Wikidata. Tests inject
// fixture fetch functions instead. The guard also sets BENCH_TEST so the CLI
// refuses live mode if a test ever tries it.
import dgram from "node:dgram";
import dns from "node:dns";
import http from "node:http";
import https from "node:https";
import net from "node:net";
import tls from "node:tls";

const blocked = (what: string) => (): never => {
  throw new Error(`Network access is blocked in bench tests (${what}). Inject a fixture fetch instead.`);
};
const installed = Symbol.for("searchsdk.bench.networkGuard");
const g = globalThis as Record<symbol, unknown>;

if (!g[installed]) {
  g[installed] = true;
  process.env.BENCH_TEST = "1";
  globalThis.fetch = ((input: unknown) => {
    const url = String(input instanceof Request ? input.url : input);
    return Promise.reject(new Error(`Network access is blocked in bench tests (fetch ${url}). Inject a fixture fetch instead.`));
  }) as typeof fetch;
  net.Socket.prototype.connect = blocked("net.Socket.connect") as never;
  net.connect = blocked("net.connect") as never;
  net.createConnection = blocked("net.createConnection") as never;
  tls.connect = blocked("tls.connect") as never;
  http.request = blocked("http.request") as never;
  http.get = blocked("http.get") as never;
  https.request = blocked("https.request") as never;
  https.get = blocked("https.get") as never;
  for (const target of [dns, dns.promises] as unknown as Record<string, unknown>[]) {
    for (const name of Object.keys(target)) {
      if (/^(lookup|resolve|reverse)/.test(name) && typeof target[name] === "function") target[name] = blocked(`dns.${name}`);
    }
  }
  dgram.createSocket = blocked("dgram.createSocket") as never;
  if ("WebSocket" in globalThis) (globalThis as Record<string, unknown>).WebSocket = blocked("WebSocket");
}
