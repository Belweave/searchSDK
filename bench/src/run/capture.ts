// Keeps what a provider said when a call failed, for the run's local raw files
// only (never published). The SDK's errors carry a fixed message and no body,
// by design; this wraps the fetch the SDK uses and, per call, records the
// error body and identifying headers of a non-2xx reply, or the underlying
// cause of a failed connection. Request headers (and so keys) are never read.
import { AsyncLocalStorage } from "node:async_hooks";

export interface FailureDetail {
  /** Non-2xx replies, in order (one per SDK attempt). */
  replies: { status: number; statusText: string; headers: Record<string, string>; body: string; bodyTruncated: boolean }[];
  /** Connections that failed before a reply: the error and its cause chain. */
  errors: { name: string; message: string; cause: Record<string, string | number> | null }[];
}

const MAX_BODY_CHARS = 4_000;
const KEPT_HEADERS = /^(content-type|retry-after|server|date|via|cf-ray|x-request-id|request-id|x-amzn-requestid|x-amz-cf-id|x-cache|x-ratelimit-[a-z-]+|ratelimit[a-z-]*)$/;

const store = new AsyncLocalStorage<FailureDetail>();

export const emptyDetail = (): FailureDetail => ({ replies: [], errors: [] });

/** Runs `fn` with failure capture for the fetches it makes. */
export function withCapture<T>(detail: FailureDetail, fn: () => Promise<T>): Promise<T> {
  return store.run(detail, fn);
}

function causeOf(e: unknown): Record<string, string | number> | null {
  const c = (e as { cause?: unknown } | null)?.cause;
  if (!c || typeof c !== "object") return null;
  const out: Record<string, string | number> = {};
  for (const k of ["name", "code", "errno", "syscall", "hostname", "address", "port", "message"] as const) {
    const v = (c as Record<string, unknown>)[k];
    if (typeof v === "string" || typeof v === "number") out[k] = v;
  }
  return out;
}

export function capturingFetch(base: typeof fetch): typeof fetch {
  return async (input, init) => {
    const detail = store.getStore();
    let res: Response;
    try {
      res = await base(input, init);
    } catch (e) {
      detail?.errors.push({ name: (e as Error)?.name ?? "Error", message: String((e as Error)?.message ?? e), cause: causeOf(e) });
      throw e;
    }
    if (detail && !res.ok) {
      const headers: Record<string, string> = {};
      res.headers.forEach((v, k) => { if (KEPT_HEADERS.test(k.toLowerCase())) headers[k.toLowerCase()] = v; });
      let body = "";
      try { body = await res.clone().text(); } catch { body = "<unreadable>"; }
      detail.replies.push({ status: res.status, statusText: res.statusText, headers, body: body.slice(0, MAX_BODY_CHARS), bodyTruncated: body.length > MAX_BODY_CHARS });
    }
    return res;
  };
}
