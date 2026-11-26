// Blocks real network use in tests. Every test file imports this module first,
// so the guard holds however the tests are started (npm test, node --test,
// or a single file). Only connections to the loopback address 127.0.0.1 are
// allowed, for the test that drives the real fetch against a local server.
import dgram from "node:dgram";
import dns from "node:dns";
import net from "node:net";

const blocked = (what: string) => () => {
  throw new Error(`Network access is blocked in tests (${what}). Inject fetch instead.`);
};
const LOOPBACK = "127.0.0.1";
const installed = Symbol.for("searchsdk.test.networkGuard");
const g = globalThis as Record<symbol, unknown>;

/** The platform fetch, usable only against 127.0.0.1 because sockets are restricted below. */
export const loopbackFetch: typeof globalThis.fetch = (g[installed] as typeof fetch | undefined) ?? globalThis.fetch.bind(globalThis);

if (!g[installed]) {
  g[installed] = loopbackFetch;
  globalThis.fetch = ((input: unknown) => {
    const url = String(input instanceof Request ? input.url : input);
    return Promise.reject(new Error(`Network access is blocked in tests (fetch ${url}). Inject fetch instead.`));
  }) as typeof fetch;

  const connect = net.Socket.prototype.connect;
  net.Socket.prototype.connect = function (this: net.Socket, ...args: unknown[]) {
    // net.connect passes its normalized arguments as one array.
    const a = Array.isArray(args[0]) ? (args[0] as unknown[]) : args;
    const first = a[0];
    const host = first !== null && typeof first === "object"
      ? (first as { host?: unknown; path?: unknown }).path === undefined ? (first as { host?: unknown }).host : undefined
      : typeof a[1] === "string" ? a[1] : undefined;
    if (host !== LOOPBACK) blocked(`net.Socket.connect ${String(host)}`)();
    return (connect as (...x: unknown[]) => net.Socket).apply(this, args);
  } as never;

  for (const target of [dns, dns.promises, dns.Resolver.prototype, dns.promises.Resolver.prototype] as Record<string, unknown>[]) {
    for (const name of Object.keys(target).concat(Object.getOwnPropertyNames(target))) {
      const original = target[name];
      if (!/^(lookup|lookupService|resolve|reverse)/.test(name) || typeof original !== "function") continue;
      // Binding a server to 127.0.0.1 looks the literal up; nothing else may resolve.
      target[name] = name === "lookup"
        ? function (this: unknown, host: unknown, ...rest: unknown[]) {
          if (host !== LOOPBACK) blocked(`dns.lookup ${String(host)}`)();
          return (original as (...x: unknown[]) => unknown).call(this, host, ...rest);
        }
        : blocked(`dns.${name}`);
    }
  }
  dgram.createSocket = blocked("dgram.createSocket") as never;
  if ("WebSocket" in globalThis) (globalThis as Record<string, unknown>).WebSocket = blocked("WebSocket");
}
