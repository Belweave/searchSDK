// One HTTP attempt over standard fetch: deadline, cancellation, no redirects,
// and a byte ceiling enforced while streaming.
import { SearchError } from "./errors.ts";
import type { HttpRequest } from "./engine.ts";
import type { Clock, ErrorCode, ProviderId } from "./types.ts";

export const systemClock: Clock = {
  now: () => Date.now(),
  setTimeout: (callback, ms) => setTimeout(callback, ms),
  clearTimeout: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
};

export interface Reply { status: number; headers: Headers; body: unknown }

export interface SendOptions {
  provider: ProviderId;
  clock: Clock;
  callDeadline: number;
  attemptDeadline: number;
  signal: AbortSignal | undefined;
  maxBytes: number;
}

/**
 * Reads the body up to maxBytes. Any failure becomes a SearchError carrying
 * the status: the deadline or abort reason when one fired, otherwise
 * `network` (the connection failed while the body was arriving).
 */
async function readBytes(res: Response, maxBytes: number, stopped: Promise<never>, provider: ProviderId, reason: () => ErrorCode | null): Promise<Uint8Array> {
  const status = res.status;
  const length = res.headers.get("content-length");
  if (length !== null && /^\d+$/.test(length.trim()) && Number(length.trim()) > maxBytes) {
    res.body?.cancel().catch(() => {});
    throw new SearchError("response_too_large", { provider, status });
  }
  if (!res.body) return new Uint8Array(0);
  const chunks: Uint8Array[] = [];
  let total = 0;
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  try {
    reader = res.body.getReader();
    for (;;) {
      const { done, value } = await Promise.race([reader.read(), stopped]);
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) throw new SearchError("response_too_large", { provider, status });
      chunks.push(value);
    }
  } catch (e) {
    reader?.cancel().catch(() => {});
    if (e instanceof SearchError && e.code === "response_too_large") throw e;
    throw new SearchError(reason() ?? (e instanceof SearchError ? e.code : "network"), { provider, status });
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) { out.set(c, offset); offset += c.byteLength; }
  return out;
}

function parseJson(bytes: Uint8Array): unknown {
  return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
}

export async function send(fetchFn: typeof globalThis.fetch, req: HttpRequest, o: SendOptions): Promise<Reply> {
  const { provider, clock } = o;
  const controller = new AbortController();
  let reason: ErrorCode | null = null;
  let reject!: (e: SearchError) => void;
  const stopped = new Promise<never>((_, r) => { reject = r; });
  stopped.catch(() => {});
  const stop = (code: ErrorCode) => {
    if (reason) return;
    reason = code;
    reject(new SearchError(code, { provider }));
    controller.abort();
  };
  const end = Math.min(o.callDeadline, o.attemptDeadline);
  const timer = clock.setTimeout(() => stop(end >= o.callDeadline ? "timeout" : "attempt_timeout"), Math.max(0, end - clock.now()));
  const onAbort = () => stop("aborted");
  if (o.signal?.aborted) onAbort();
  else o.signal?.addEventListener("abort", onAbort, { once: true });
  try {
    let res: Response;
    try {
      const init: RequestInit = { method: req.method, headers: req.headers, signal: controller.signal, redirect: "manual" };
      if (req.body !== undefined) init.body = req.body;
      res = await Promise.race([fetchFn.call(globalThis, req.url, init), stopped]); // unbound fetch throws on Workers and in browsers
    } catch (e) {
      if (e instanceof SearchError) throw e;
      throw new SearchError(reason ?? "network", { provider });
    }
    const ok = res.status >= 200 && res.status < 300;
    if (!ok) {
      // The status decides the error. A body that is too large or breaks off is ignored, unless the call was stopped.
      let body: unknown;
      try { body = parseJson(await readBytes(res, o.maxBytes, stopped, provider, () => reason)); } catch {
        if (reason) throw new SearchError(reason, { provider, status: res.status });
      }
      return { status: res.status, headers: res.headers, body };
    }
    const bytes = await readBytes(res, o.maxBytes, stopped, provider, () => reason);
    try {
      return { status: res.status, headers: res.headers, body: parseJson(bytes) };
    } catch {
      throw new SearchError("invalid_response", { provider, status: res.status });
    }
  } finally {
    clock.clearTimeout(timer);
    o.signal?.removeEventListener("abort", onAbort);
  }
}

/** Waits on the injected clock; rejects with `aborted` if the signal fires. */
export function sleep(ms: number, clock: Clock, signal: AbortSignal | undefined): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new SearchError("aborted"));
    const onAbort = () => { clock.clearTimeout(handle); reject(new SearchError("aborted")); };
    const handle = clock.setTimeout(() => { signal?.removeEventListener("abort", onAbort); resolve(); }, ms);
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}
