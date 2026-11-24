// Preloaded with --import: any real network use during tests throws.
import dns from "node:dns";
import net from "node:net";

const blocked = (what: string) => () => {
  throw new Error(`Network access is blocked in tests (${what}). Inject fetch instead.`);
};

globalThis.fetch = (() => Promise.reject(new Error("Network access is blocked in tests (fetch). Inject fetch instead."))) as typeof fetch;
net.Socket.prototype.connect = blocked("net.Socket.connect") as never;
dns.lookup = blocked("dns.lookup") as never;
dns.promises.lookup = blocked("dns.promises.lookup") as never;
if ("WebSocket" in globalThis) (globalThis as Record<string, unknown>).WebSocket = blocked("WebSocket");
