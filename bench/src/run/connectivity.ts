// Tells our own connection failing apart from a provider's. After a network
// failure the runner asks whether this machine can reach the internet at all:
// a TCP connect to two public anycast resolvers that no ranked provider runs,
// plus a DNS lookup. Offline means the failure was ours, not the provider's.
import { lookup } from "node:dns/promises";
import { connect } from "node:net";

/** Resolves true when this machine reaches the internet. */
export type Connectivity = () => Promise<boolean>;

const PROBE_HOSTS = ["1.1.1.1", "9.9.9.9"] as const;
const PROBE_NAME = "example.com";
const PROBE_TIMEOUT_MS = 3_000;

function tcp(host: string, timeoutMs: number): Promise<boolean> {
  return new Promise((resolve) => {
    const s = connect({ host, port: 443 });
    const done = (ok: boolean) => { s.destroy(); resolve(ok); };
    s.setTimeout(timeoutMs, () => done(false));
    s.once("connect", () => done(true));
    s.once("error", () => done(false));
  });
}

async function dns(name: string, timeoutMs: number): Promise<boolean> {
  let t: NodeJS.Timeout | undefined;
  const timeout = new Promise<boolean>((r) => { t = setTimeout(() => r(false), timeoutMs); });
  try {
    return await Promise.race([lookup(name).then(() => true, () => false), timeout]);
  } finally {
    clearTimeout(t);
  }
}

export const liveConnectivity: Connectivity = async () => {
  const [reach, named] = await Promise.all([
    Promise.all(PROBE_HOSTS.map((h) => tcp(h, PROBE_TIMEOUT_MS))).then((r) => r.some(Boolean)),
    dns(PROBE_NAME, PROBE_TIMEOUT_MS),
  ]);
  return reach && named;
};
