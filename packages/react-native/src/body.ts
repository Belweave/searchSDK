import { SearchError } from "./errors.js";
import type { Scope } from "./lifecycle.js";
import type { ByteReader, FetchResponse } from "./transport.js";

/** Strict UTF-8 decoding without requiring TextDecoder on Hermes. */
function decodeUtf8(bytes: Uint8Array, scope: Scope): string {
  const parts: string[] = [];
  const units: number[] = [];
  let index = 0;
  while (index < bytes.length) {
    const lead = bytes[index++]!;
    let cp: number, remaining: number, minimum: number;
    if (lead < 0x80) { cp = lead; remaining = 0; minimum = 0; }
    else if (lead >= 0xc2 && lead <= 0xdf) { cp = lead & 0x1f; remaining = 1; minimum = 0x80; }
    else if (lead >= 0xe0 && lead <= 0xef) { cp = lead & 0x0f; remaining = 2; minimum = 0x800; }
    else if (lead >= 0xf0 && lead <= 0xf4) { cp = lead & 7; remaining = 3; minimum = 0x10000; }
    else throw new SearchError("invalid_response");
    for (let i = 0; i < remaining; i++) {
      const continuation = bytes[index++];
      if (continuation === undefined || (continuation & 0xc0) !== 0x80) throw new SearchError("invalid_response");
      cp = (cp << 6) | (continuation & 0x3f);
    }
    if (cp < minimum || cp > 0x10ffff || cp >= 0xd800 && cp <= 0xdfff) throw new SearchError("invalid_response");
    if (cp <= 0xffff) units.push(cp);
    else { cp -= 0x10000; units.push(0xd800 + (cp >> 10), 0xdc00 + (cp & 0x3ff)); }
    if (units.length >= 4096) { parts.push(String.fromCharCode(...units)); units.length = 0; scope.check(); }
  }
  parts.push(String.fromCharCode(...units));
  const result = parts.join("");
  return result.charCodeAt(0) === 0xfeff ? result.slice(1) : result;
}

export async function readJson(response: FetchResponse, maximum: number, scope: Scope): Promise<unknown> {
  let reader: ByteReader | undefined;
  const cancel = () => { try { void Promise.resolve(reader?.cancel()).catch(() => {}); } catch { /* Best effort. */ } };
  scope.signal.addEventListener("abort", cancel, { once: true });
  try {
    const length = response.headers.get("content-length");
    if (!response.headers.get("content-encoding") && length && /^\d+$/.test(length) && Number(length) > maximum) throw new SearchError("invalid_response");
    let bytes: Uint8Array;
    if (response.body && typeof response.body.getReader === "function") {
      reader = response.body.getReader();
      let buffer = new Uint8Array(Math.min(maximum, 8192));
      let received = 0;
      for (;;) {
        let chunk: Awaited<ReturnType<ByteReader["read"]>>;
        try { chunk = await scope.race(() => reader!.read()); }
        catch { scope.check(); throw new SearchError("network"); }
        if (!chunk || typeof chunk.done !== "boolean") throw new SearchError("invalid_response");
        if (chunk.done) break;
        if (!(chunk.value instanceof Uint8Array) || chunk.value.byteLength > maximum - received) throw new SearchError("invalid_response");
        const required = received + chunk.value.byteLength;
        if (required > buffer.byteLength) {
          const expanded = new Uint8Array(Math.min(maximum, Math.max(required, buffer.byteLength * 2)));
          expanded.set(buffer.subarray(0, received)); buffer = expanded;
        }
        buffer.set(chunk.value, received); received = required;
      }
      bytes = buffer.subarray(0, received);
    } else if (typeof response.readBoundedBody === "function") {
      try { bytes = await scope.race(() => response.readBoundedBody!(maximum, scope.signal)); }
      catch { scope.check(); throw new SearchError("invalid_response"); }
      if (!(bytes instanceof Uint8Array) || bytes.byteLength > maximum) throw new SearchError("invalid_response");
    } else if (response.body === null) {
      bytes = new Uint8Array();
    } else {
      // No text/json/arrayBuffer fallback: their allocation is already unbounded.
      throw new SearchError("unsupported_option");
    }
    scope.check();
    const text = decodeUtf8(bytes, scope);
    let value: unknown;
    try { value = JSON.parse(text); } catch { throw new SearchError("invalid_response"); }
    scope.check();
    return value;
  } finally {
    cancel();
    try { reader?.releaseLock?.(); } catch { /* Pending reads can retain their lock until cancellation completes. */ }
    scope.signal.removeEventListener("abort", cancel);
  }
}
