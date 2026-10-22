import { SearchError } from "./errors.js";
import { retryAfter } from "./http.js";
import { exactFields } from "./validation.js";
import { backoff, createScope, createSemaphore, positiveInteger, retryDelay, retryPolicy, transientCodes } from "./reliability.js";
import type { OperationScope } from "./reliability.js";
import type { FetchTransport } from "./types.js";

export interface RetryPolicy {
  /** Additional attempts, 0–5. Default 0 (opt in). */
  maxRetries?: number;
  /** Exponential backoff starting delay; default 250 ms. */
  baseDelayMs?: number;
  /** Backoff ceiling; default 5,000 ms. Retry-After is never shortened. */
  maxDelayMs?: number;
}
export interface NativeOperation {
  /** Static operation identifier: never include user inputs or secrets. */
  id: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD";
  /** Relative to baseUrl's path; supports encoded {name} substitutions from input.path. */
  path: string;
  /** Explicit read-only/replay-safe declaration. Defaults false, including GET. */
  retryable?: boolean;
  response?: "json" | "text" | "sse" | "bytes" | "raw";
  headers?: Readonly<Record<string, string>>;
}
export interface NativeRequestInput {
  path?: Readonly<Record<string, string | number>>;
  query?: Readonly<Record<string, string | number | boolean | readonly (string | number | boolean)[] | null | undefined>>;
  /** JSON-serialized body; mutually exclusive with rawBody. */
  body?: unknown;
  /** FormData, Blob, bytes, or string. Caller sets content type when appropriate. */
  rawBody?: BodyInit;
  /** Cannot override any header configured in NativeTransportConfig.headers. */
  headers?: Readonly<Record<string, string>>;
  signal?: AbortSignal;
  /** Whole operation (queue, retries, parsing, and stream lifetime), milliseconds. */
  timeoutMs?: number;
}
export interface NativeAttempt {
  attempt: number;
  durationMs: number;
  outcome: "success" | "error";
  status?: number;
  code?: string;
}
export interface NativeMetadata {
  provider: string;
  operation: string;
  status: number;
  /** Sanitized allowlisted provider request identifier, when present. */
  requestId?: string;
  attempts: readonly NativeAttempt[];
}
export interface NativeResponse<T> { data: T; metadata: NativeMetadata }
export interface NativeSSEEvent {
  event?: string;
  data: string;
  id?: string;
  retry?: number;
}
export interface NativeTransportConfig {
  provider: string;
  /** Fixed HTTPS origin + optional base path, with no credentials/query/fragment. */
  baseUrl: string;
  /** Secret/auth headers belong here. Never included in SDK error metadata. */
  headers?: Readonly<Record<string, string>>;
  fetch?: FetchTransport;
  timeoutMs?: number;
  retry?: RetryPolicy;
  /** Total decoded response bytes, including SSE. Default 10 MiB. */
  maxResponseBytes?: number;
  /** Per transport instance. Default 8; queue shares total deadline. */
  maxConcurrency?: number;
}
export interface NativeTransport {
  request<T = unknown>(operation: NativeOperation & { response: "sse" }, input?: NativeRequestInput): Promise<NativeResponse<AsyncIterable<NativeSSEEvent>>>;
  request<T = unknown>(operation: NativeOperation & { response: "bytes" }, input?: NativeRequestInput): Promise<NativeResponse<Uint8Array>>;
  /** Raw responses are buffered and bounded first; not an unbounded streaming escape hatch. */
  request<T = unknown>(operation: NativeOperation & { response: "raw" }, input?: NativeRequestInput): Promise<NativeResponse<Response>>;
  request<T = unknown>(operation: NativeOperation, input?: NativeRequestInput): Promise<NativeResponse<T>>;
}

function object(value: unknown, code: "configuration" | "invalid_request"): void {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new SearchError(code);
}
function headerRecord(value: Readonly<Record<string, string>> | undefined, code: "configuration" | "invalid_request"): Headers {
  if (value === undefined) return new Headers();
  object(value, code);
  try {
    if (Object.entries(value).some(([name, v]) => typeof v !== "string" || /[\r\n\0]/.test(v) ||
      ["host", "cookie", "connection", "content-length", "transfer-encoding"].includes(name.toLowerCase()))) throw new Error();
    return new Headers(value);
  } catch { throw new SearchError(code); }
}
function addHeaders(target: Headers, source: Readonly<Record<string, string>> | undefined, protectedHeaders: Headers) {
  for (const [key, value] of headerRecord(source, "invalid_request")) {
    if (protectedHeaders.has(key)) throw new SearchError("invalid_request");
    target.set(key, value);
  }
}
function makeUrl(base: URL, operation: NativeOperation, input: NativeRequestInput): URL {
  if (typeof operation.path !== "string" || !operation.path.startsWith("/") || operation.path.startsWith("//") ||
    /[?#\\\s\u0000-\u001f\u007f]/.test(operation.path)) throw new SearchError("invalid_request");
  if (input.path !== undefined) object(input.path, "invalid_request");
  const names = new Set<string>();
  const path = operation.path.replace(/\{([a-zA-Z][a-zA-Z0-9_]*)\}/g, (_, key: string) => {
    names.add(key);
    const value = input.path?.[key];
    if (!(typeof value === "string" || typeof value === "number" && Number.isFinite(value)) ||
      String(value).length === 0 || [".", ".."].includes(String(value))) throw new SearchError("invalid_request");
    return encodeURIComponent(String(value));
  });
  if (/[{}]/.test(path) || Object.keys(input.path ?? {}).some(k => !names.has(k)) ||
    path.split("/").some(segment => /^(?:\.|%2e){1,2}$/i.test(segment))) throw new SearchError("invalid_request");
  let url: URL;
  try { url = new URL(base.href.replace(/\/$/, "") + path); }
  catch { throw new SearchError("invalid_request"); }
  if (url.origin !== base.origin || !url.pathname.startsWith(base.pathname.replace(/\/$/, "") + "/")) throw new SearchError("invalid_request");
  if (input.query !== undefined) {
    object(input.query, "invalid_request");
    for (const [key, value] of Object.entries(input.query)) {
      if (value === null || value === undefined) continue;
      for (const v of Array.isArray(value) ? value : [value]) {
        if (!["string", "number", "boolean"].includes(typeof v) || typeof v === "number" && !Number.isFinite(v)) throw new SearchError("invalid_request");
        url.searchParams.append(key, String(v));
      }
    }
  }
  return url;
}
function httpError(response: Response): SearchError {
  const status = response.status;
  const code = [401, 402, 403, 432, 433].includes(status) ? "auth" : status === 429 ? "rate_limit" :
    status === 408 || status >= 500 && status <= 599 ? "unavailable" : "provider_error";
  const delay = retryAfter(response.headers.get("retry-after"));
  return new SearchError(code, { status, ...(delay !== undefined ? { retryAfterMs: delay } : {}) });
}
function discard(body: ReadableStream<Uint8Array> | null) {
  try { void body?.cancel().catch(() => {}); } catch { /* Best effort; never await untrusted cleanup. */ }
}
function sanitize(cause: unknown, scope: OperationScope): SearchError {
  scope.check();
  return cause instanceof SearchError ? cause : new SearchError("network");
}
function responseReader(response: Response, scope: OperationScope, maximum: number) {
  const length = response.headers.get("content-length");
  // This is only a fast rejection: decoded bytes are counted independently below.
  if (!response.headers.has("content-encoding") && length && /^\d+$/.test(length) && Number(length) > maximum) {
    discard(response.body);
    throw new SearchError("invalid_response");
  }
  const reader = response.body?.getReader();
  let received = 0;
  let closed = false;
  function close() {
    if (closed) return;
    closed = true;
    try { void reader?.cancel().catch(() => {}); } catch { /* Best effort. */ }
    scope.signal.removeEventListener("abort", close);
  }
  scope.signal.addEventListener("abort", close, { once: true });
  return {
    close,
    async read(): Promise<ReadableStreamReadResult<Uint8Array>> {
      scope.check();
      if (!reader) return { done: true, value: undefined };
      try {
        const next = await scope.race(reader.read());
        if (!next.done) {
          if (!(next.value instanceof Uint8Array)) throw new SearchError("invalid_response");
          received += next.value.byteLength;
          if (received > maximum) throw new SearchError("invalid_response");
        }
        return next;
      } catch (cause) { throw sanitize(cause, scope); }
    },
  };
}
async function readBytes(response: Response, scope: OperationScope, maximum: number): Promise<Uint8Array<ArrayBuffer>> {
  const reader = responseReader(response, scope, maximum);
  // Grow one owned buffer rather than retaining one object per network chunk.
  // Tiny chunks cannot amplify the decoded-byte cap into millions of live objects.
  let bytes = new Uint8Array(0);
  let length = 0;
  try {
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      const required = length + next.value.byteLength;
      if (required > bytes.byteLength) {
        const grown = new Uint8Array(Math.min(maximum, Math.max(required, 1024, bytes.byteLength * 2)));
        grown.set(bytes); bytes = grown;
      }
      bytes.set(next.value, length);
      length = required;
    }
    return bytes.byteLength === length ? bytes : bytes.slice(0, length);
  } finally { reader.close(); }
}

/** One subscription only. Explicitly no EventSource reconnect/replay behaviour. */
function sse(response: Response, scope: OperationScope, maximum: number, finish: () => void): AsyncIterable<NativeSSEEvent> {
  if (response.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase() !== "text/event-stream") {
    discard(response.body);
    throw new SearchError("invalid_response");
  }
  const reader = responseReader(response, scope, maximum);
  let used = false;
  const close = () => { reader.close(); finish(); };
  scope.signal.addEventListener("abort", close, { once: true });
  return { [Symbol.asyncIterator]() {
    if (used) throw new SearchError("invalid_request");
    used = true;
    const generator = (async function* () {
      const decoder = new TextDecoder();
      let fragments: string[] = [];
      let pendingFragments: string[] = [];
      function append(fragment: string) {
        if (!fragment) return;
        pendingFragments.push(fragment);
        if (pendingFragments.length >= 1024) {
          fragments.push(pendingFragments.join("")); pendingFragments = [];
        }
      }
      let skipLF = false;
      let data: string[] = [];
      let event: string | undefined;
      let lastId: string | undefined;
      let retry: number | undefined;
      function line(value: string): NativeSSEEvent | undefined {
        if (value === "") {
          const output = data.length ? { data: data.join("\n"), ...(event ? { event } : {}),
            ...(lastId !== undefined ? { id: lastId } : {}), ...(retry !== undefined ? { retry } : {}) } : undefined;
          data = []; event = undefined; retry = undefined;
          return output;
        }
        if (value.startsWith(":")) return;
        const colon = value.indexOf(":");
        const name = colon < 0 ? value : value.slice(0, colon);
        let field = colon < 0 ? "" : value.slice(colon + 1);
        if (field.startsWith(" ")) field = field.slice(1);
        if (name === "data") data.push(field);
        else if (name === "event") event = field;
        else if (name === "id" && !field.includes("\0")) lastId = field;
        else if (name === "retry" && /^\d+$/.test(field) && Number.isSafeInteger(Number(field))) retry = Number(field);
        return;
      }
      try {
        while (true) {
          scope.check();
          const next = await reader.read();
          const chunk = next.done ? decoder.decode() : decoder.decode(next.value, { stream: true });
          let start = 0;
          for (let i = 0; i < chunk.length; i++) {
            const char = chunk[i];
            if (skipLF) {
              skipLF = false;
              if (char === "\n") { start = i + 1; continue; }
            }
            if (char !== "\r" && char !== "\n") continue;
            append(chunk.slice(start, i));
            const output = line(fragments.join("") + pendingFragments.join(""));
            fragments = []; pendingFragments = [];
            skipLF = char === "\r";
            start = i + 1;
            if (output) { scope.check(); yield output; }
          }
          // Scan each character once; compact tiny fragments in bounded-size groups.
          if (start < chunk.length) append(chunk.slice(start));
          if (next.done) break; // Incomplete final events are discarded per the SSE standard.
        }
      } catch (cause) { throw sanitize(cause, scope); }
      finally { scope.signal.removeEventListener("abort", close); close(); }
    })();
    let returned = false;
    let resolveReturn!: (value: IteratorResult<NativeSSEEvent>) => void;
    const returnedResult = new Promise<IteratorResult<NativeSSEEvent>>(resolve => { resolveReturn = resolve; });
    const terminate = () => {
      if (returned) return;
      returned = true;
      scope.signal.removeEventListener("abort", close);
      close(); // Must run even before generator.next() or while a next() is pending.
      resolveReturn({ done: true, value: undefined });
      void generator.return(undefined).catch(() => {});
    };
    return {
      next: () => returned ? Promise.resolve({ done: true as const, value: undefined }) : Promise.race([generator.next(), returnedResult]),
      return: async () => { terminate(); return { done: true as const, value: undefined }; },
      throw: async () => { terminate(); throw new SearchError("aborted"); },
    };
  } };
}

export function createNativeTransport(config: NativeTransportConfig): NativeTransport {
  object(config, "configuration");
  exactFields(config, ["provider", "baseUrl", "headers", "fetch", "timeoutMs", "retry", "maxResponseBytes", "maxConcurrency"], "configuration");
  if (typeof config.provider !== "string" || !/^[a-zA-Z0-9_-]{1,64}$/.test(config.provider) || typeof config.baseUrl !== "string" ||
    config.fetch !== undefined && typeof config.fetch !== "function") throw new SearchError("configuration");
  let base: URL;
  try {
    base = new URL(config.baseUrl);
    if (base.protocol !== "https:" || base.username || base.password || base.search || base.hash ||
      /[\\\s\u0000-\u001f\u007f]/.test(config.baseUrl)) throw new Error();
  } catch { throw new SearchError("configuration"); }
  const provider = config.provider;
  const protectedHeaders = headerRecord(config.headers, "configuration");
  const fetcher = config.fetch ?? globalThis.fetch;
  if (typeof fetcher !== "function") throw new SearchError("configuration");
  const timeout = positiveInteger(config.timeoutMs, 10_000);
  const maximum = positiveInteger(config.maxResponseBytes, 10 * 1024 * 1024);
  const retry = retryPolicy(config.retry);
  const semaphore = createSemaphore(positiveInteger(config.maxConcurrency, 8, 1024));

  async function request(operation: NativeOperation, input: NativeRequestInput = {}): Promise<NativeResponse<unknown>> {
    object(operation, "invalid_request"); object(input, "invalid_request");
    exactFields(operation, ["id", "method", "path", "retryable", "response", "headers"]);
    exactFields(input, ["path", "query", "body", "rawBody", "headers", "signal", "timeoutMs"]);
    if (typeof operation.id !== "string" || !/^[a-zA-Z0-9_.-]{1,128}$/.test(operation.id) ||
      !["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD"].includes(operation.method) ||
      operation.retryable !== undefined && typeof operation.retryable !== "boolean" ||
      operation.response !== undefined && !["json", "text", "sse", "bytes", "raw"].includes(operation.response) ||
      input.signal !== undefined && !(input.signal instanceof AbortSignal) ||
      input.body !== undefined && input.rawBody !== undefined ||
      (operation.method === "GET" || operation.method === "HEAD") && (input.body !== undefined || input.rawBody !== undefined)) throw new SearchError("invalid_request");
    let requestTimeout = timeout;
    try { requestTimeout = positiveInteger(input.timeoutMs, timeout); }
    catch { throw new SearchError("invalid_request"); }
    const url = makeUrl(base, operation, input);
    const headers = new Headers(protectedHeaders);
    addHeaders(headers, operation.headers, protectedHeaders); addHeaders(headers, input.headers, protectedHeaders);
    const responseType = operation.response ?? "json";
    const method = operation.method;
    const operationId = operation.id;
    const canRetry = operation.retryable === true;
    const scope = createScope(requestTimeout, input.signal);
    let body: BodyInit | undefined;
    try {
      scope.check();
      if (input.body !== undefined) {
        body = JSON.stringify(input.body);
        if (body === undefined) throw new Error();
        if (!headers.has("content-type")) headers.set("content-type", "application/json");
      } else if (input.rawBody !== undefined) {
        // Streaming request bodies cannot be safely replayed and are not supported.
        if (!(typeof input.rawBody === "string" || input.rawBody instanceof Blob || input.rawBody instanceof FormData ||
          input.rawBody instanceof URLSearchParams || input.rawBody instanceof ArrayBuffer || ArrayBuffer.isView(input.rawBody))) throw new Error();
        body = input.rawBody;
      }
      if (!headers.has("accept")) headers.set("accept", responseType === "sse" ? "text/event-stream" : responseType === "json" ? "application/json" : "*/*");
      // Snapshot replayable body bytes/FormData before the first attempt. Prevent mutation between retries.
      if (body !== undefined) {
        const serialized = new Request(url, { method, headers, body });
        body = await scope.race(serialized.arrayBuffer());
        const contentType = serialized.headers.get("content-type");
        if (contentType) headers.set("content-type", contentType);
      }
    } catch (cause) {
      scope.close();
      scope.check();
      throw cause instanceof SearchError ? cause : new SearchError("invalid_request");
    }
    let release: (() => void) | undefined;
    let finished = false;
    let streaming = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      release?.(); scope.close();
    };
    const attempts: NativeAttempt[] = [];
    try {
      release = await semaphore.acquire(scope.signal);
      for (let index = 0; ; index++) {
        scope.check();
        const start = performance.now();
        let status: number | undefined;
        try {
          const response = await scope.race(Promise.resolve().then(() => {
            scope.check();
            return fetcher(url.href, { method, headers: new Headers(headers), ...(body !== undefined ? { body } : {}), signal: scope.signal, redirect: "error", credentials: "omit" });
          }).then(response => {
            // A signal-ignoring transport may resolve after the caller has stopped waiting.
            try { scope.check(); } catch (cause) { discard(response.body); throw cause; }
            return response;
          }));
          status = response.status;
          if (!response.ok) { discard(response.body); throw httpError(response); }
          const id = response.headers.get("x-request-id") ?? response.headers.get("request-id");
          const metadata: NativeMetadata = { provider, operation: operationId, status,
            ...(id && /^[a-zA-Z0-9_.:/-]{1,256}$/.test(id) ? { requestId: id } : {}), attempts: [] };
          let data: unknown;
          if (responseType === "sse") data = sse(response, scope, maximum, finish);
          else {
            const bytes = await readBytes(response, scope, maximum);
            scope.check();
            if (responseType === "bytes") data = bytes;
            else if (responseType === "raw") data = new Response(method === "HEAD" || [204, 205].includes(status) ? null : bytes, { status, headers: response.headers });
            else {
              const text = new TextDecoder().decode(bytes);
              if (responseType === "text") data = text;
              else {
                try { data = text.length === 0 && (status === 204 || status === 205 || method === "HEAD") ? null : JSON.parse(text); }
                catch { throw new SearchError("invalid_response"); }
              }
            }
          }
          // Decoding/parsing/response assembly is synchronous and cannot be interrupted.
          // Reject a late result before recording or returning a successful attempt.
          scope.check();
          attempts.push({ attempt: index + 1, durationMs: performance.now() - start, outcome: "success", status });
          metadata.attempts = Object.freeze(attempts.map(a => Object.freeze({ ...a })));
          if (responseType === "sse") streaming = true;
          return { data, metadata: Object.freeze(metadata) };
        } catch (cause) {
          const error = sanitize(cause, scope);
          attempts.push({ attempt: index + 1, durationMs: performance.now() - start, outcome: "error", code: error.code,
            ...(status !== undefined ? { status } : {}) });
          if (!canRetry || index >= retry.maxRetries || !transientCodes.has(error.code)) throw error;
          await backoff(scope, retryDelay(retry, index, error.retryAfterMs));
        }
      }
    } catch (cause) { throw sanitize(cause, scope); }
    finally { if (!streaming) finish(); }
  }
  return { request } as NativeTransport;
}
