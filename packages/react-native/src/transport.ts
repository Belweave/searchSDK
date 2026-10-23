import { SearchError } from "./errors.js";

/** Deliberately small structural interfaces: no Node, React or DOM Response dependency. */
export interface FetchRequestInit {
  method: "POST";
  headers: Record<string, string>;
  body: string;
  signal: AbortSignal;
  redirect: "error";
  credentials: "omit";
  cache: "no-store";
  /** Decoded byte ceiling, also enforced inside the built-in native bridge. */
  maxResponseBytes: number;
  /** Remaining whole-call budget for native socket/resource deadlines. */
  timeoutMs: number;
}
export interface ByteReader {
  read(): Promise<{ done: boolean; value?: Uint8Array }>;
  cancel(): Promise<unknown>;
  releaseLock?(): void;
}
export interface FetchResponse {
  status: number;
  headers: { get(name: string): string | null };
  url?: string;
  redirected?: boolean;
  type?: string;
  body?: { getReader(): ByteReader; cancel?(): Promise<unknown> } | null;
  /**
   * Native bridge alternative when readable byte streams are unavailable.
   * The bridge MUST enforce maxBytes on decoded bytes BEFORE buffering, and honor
   * signal. A text()/arrayBuffer() wrapper followed by a size check is NOT sufficient.
   */
  readBoundedBody?(maxBytes: number, signal: AbortSignal): Promise<Uint8Array>;
  /** Best-effort disposal for native bridge responses without a body stream. */
  cancelBody?(): Promise<unknown>;
}
export type FetchImplementation = (input: string, init: FetchRequestInit) => Promise<FetchResponse>;
declare const trustedTransport: unique symbol;
export type FetchTransport = FetchImplementation & { readonly [trustedTransport]: true };
export interface TransportGuarantees {
  /** All redirects are rejected before any subsequent request is sent. */
  rejectsRedirects: true;
  /** No ambient cookies, HTTP authentication or persisted credentials are sent/stored. */
  omitsCredentials: true;
}
const trusted = new WeakSet<FetchImplementation>();

/**
 * Explicit application-owned trust boundary, NOT a security adapter/polyfill.
 * Only attest after verifying the supplied implementation meets both guarantees
 * on every target platform. Bare React Native fetch is not a verified transport.
 */
export function createTrustedFetchTransport(implementation: FetchImplementation, guarantees: TransportGuarantees): FetchTransport {
  try {
    if (typeof implementation !== "function" || !guarantees ||
      guarantees.rejectsRedirects !== true || guarantees.omitsCredentials !== true ||
      Reflect.ownKeys(guarantees).some(k => k !== "rejectsRedirects" && k !== "omitsCredentials")) {
      throw new Error();
    }
    const wrapped: FetchImplementation = (input, init) => implementation(input, init);
    trusted.add(wrapped);
    return wrapped as FetchTransport;
  } catch { throw new SearchError("configuration"); }
}

export function isTrustedTransport(value: unknown): value is FetchTransport {
  return typeof value === "function" && trusted.has(value as FetchImplementation);
}

export function disposeResponse(response: FetchResponse): void {
  try { void Promise.resolve(response.body?.cancel?.()).catch(() => {}); } catch { /* Best effort. */ }
  try { void Promise.resolve(response.cancelBody?.()).catch(() => {}); } catch { /* Best effort. */ }
}
