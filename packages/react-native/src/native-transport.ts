import { SearchError } from "./errors.js";
import { createTrustedFetchTransport } from "./transport.js";
import type { FetchTransport } from "./transport.js";

export interface NativeGatewayModule {
  request(id: string, endpoint: string, headers: Record<string, string>, body: string,
    maxBytes: number, timeoutMs: number): Promise<{
      status: number; headers: Record<string, string>; url: string; bodyBase64: string;
    }>;
  cancel(id: string): void;
}
let sequence = 0;
const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
function decodeBase64(value: string, maximum: number): Uint8Array {
  if (typeof value !== "string" || value.length % 4 !== 0 || value.length > Math.ceil(maximum / 3) * 4) throw new SearchError("invalid_response");
  const padding = value.endsWith("==") ? 2 : value.endsWith("=") ? 1 : 0;
  const length = value.length / 4 * 3 - padding;
  if (length > maximum) throw new SearchError("invalid_response");
  for (let i = 0; i < value.length - padding; i++) {
    if (alphabet.indexOf(value[i]!) < 0) throw new SearchError("invalid_response");
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (let i = 0; i < value.length; i += 4) {
    const bits = (alphabet.indexOf(value[i]!) << 18) | (alphabet.indexOf(value[i + 1]!) << 12) |
      (Math.max(0, alphabet.indexOf(value[i + 2]!)) << 6) | Math.max(0, alphabet.indexOf(value[i + 3]!));
    if (offset < length) bytes[offset++] = bits >> 16;
    if (offset < length) bytes[offset++] = bits >> 8;
    if (offset < length) bytes[offset++] = bits;
  }
  return bytes;
}

/** Internal native module binding, independent of the React import for deterministic tests. */
export function createNativeTransport(module: NativeGatewayModule | undefined): FetchTransport {
  if (!module || typeof module.request !== "function" || typeof module.cancel !== "function") throw new SearchError("configuration");
  return createTrustedFetchTransport(async (endpoint, init) => {
    const id = `${Date.now()}-${sequence++}`;
    const cancel = () => { try { module.cancel(id); } catch { /* Best effort; JS deadline still wins. */ } };
    if (init.signal.aborted) throw new SearchError("aborted");
    init.signal.addEventListener("abort", cancel, { once: true });
    try {
      let response: Awaited<ReturnType<NativeGatewayModule["request"]>>;
      try { response = await module.request(id, endpoint, init.headers, init.body, init.maxResponseBytes, init.timeoutMs); }
      catch (error) {
        if (init.signal.aborted) throw new SearchError("aborted");
        const code = error && typeof error === "object" ? (error as { code?: unknown }).code : undefined;
        throw new SearchError(code === "SEARCHSDK_LIMIT" || code === "SEARCHSDK_INVALID_RESPONSE" ? "invalid_response" :
          code === "SEARCHSDK_TIMEOUT" ? "timeout" : code === "SEARCHSDK_UNAVAILABLE" ? "unavailable" : "network");
      }
      if (init.signal.aborted) throw new SearchError("aborted");
      if (!response || !response.headers || typeof response.headers !== "object") throw new SearchError("invalid_response");
      const headers = Object.create(null) as Record<string, string>;
      for (const [name, value] of Object.entries(response.headers)) {
        if (typeof value !== "string") throw new SearchError("invalid_response");
        headers[name.toLowerCase()] = value;
      }
      const bytes = decodeBase64(response.bodyBase64, init.maxResponseBytes);
      return { status: response.status, url: response.url, headers: { get: name => headers[name.toLowerCase()] ?? null },
        readBoundedBody: async () => bytes };
    } finally { init.signal.removeEventListener("abort", cancel); }
  }, { rejectsRedirects: true, omitsCredentials: true });
}
