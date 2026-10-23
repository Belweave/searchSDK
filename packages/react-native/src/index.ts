import { readJson } from "./body.js";
import { SearchError } from "./errors.js";
import { createScope, createSemaphore, now } from "./lifecycle.js";
import type { Scope } from "./lifecycle.js";
import { disposeResponse, isTrustedTransport } from "./transport.js";
import type { FetchResponse } from "./transport.js";
import { endpointUrl, gatewayError, inputFields, positiveInteger, validateRequest, validateResponse, validateSignal } from "./validation.js";
import type { SearchBatchOptions, SearchBatchResult, SearchClient, SearchClientOptions, SearchOptions, SearchRequest, SearchResponse, ValidatedSearchRequest } from "./types.js";

export { SearchError } from "./errors.js";
export { createTrustedFetchTransport } from "./transport.js";
export type { ByteReader, FetchImplementation, FetchRequestInit, FetchResponse, FetchTransport, TransportGuarantees } from "./transport.js";
export type * from "./types.js";

export function createSearchClient(options: SearchClientOptions): SearchClient {
  const config = inputFields(options, ["endpoint", "accessToken", "timeoutMs", "maxResponseBytes", "maxConcurrency", "fetch"], "configuration");
  const endpoint = endpointUrl(config.endpoint);
  const fetch = config.fetch, accessToken = config.accessToken;
  if (!isTrustedTransport(fetch) || accessToken !== undefined && typeof accessToken !== "function" ||
    typeof globalThis.AbortController !== "function" || typeof globalThis.URL !== "function") throw new SearchError("configuration");
  const transport = fetch;
  const getToken = accessToken as (() => string | Promise<string>) | undefined;
  const timeoutMs = positiveInteger(config.timeoutMs, 10_000);
  const maximum = positiveInteger(config.maxResponseBytes, 10 * 1024 * 1024);
  const semaphore = createSemaphore(positiveInteger(config.maxConcurrency, 4, 64));

  async function execute(request: ValidatedSearchRequest, signal: AbortSignal | undefined, started: number, batch?: Scope): Promise<SearchResponse> {
    const scope = createScope(Math.max(0, timeoutMs - (now() - started)), signal);
    let release: (() => void) | undefined;
    let response: FetchResponse | undefined;
    let token: string | undefined;
    try {
      batch?.check(); scope.check();
      release = await semaphore.acquire(scope.signal);
      batch?.check(); scope.check();
      if (getToken !== undefined) {
        let value: unknown;
        try { value = await scope.race(() => getToken()); }
        catch { scope.check(); throw new SearchError("auth"); }
        if (typeof value !== "string" || !/^[A-Za-z0-9\-._~+/]+=*$/.test(value)) throw new SearchError("auth");
        token = value;
      }
      const headers: Record<string, string> = { "Content-Type": "application/json", Accept: "application/json" };
      if (token !== undefined) headers.Authorization = `Bearer ${token}`;
      try {
        response = await scope.race(() => Promise.resolve(transport(endpoint, {
          method: "POST", headers, body: JSON.stringify(request), signal: scope.signal,
          redirect: "error", credentials: "omit", cache: "no-store", maxResponseBytes: maximum, timeoutMs: scope.remaining(),
        })).then(result => {
          try { scope.check(); } catch (error) { disposeResponse(result); throw error; }
          return result;
        }));
      } catch (error) {
        scope.check();
        // Preserve only a recognized code, never external exception metadata.
        if (error instanceof SearchError && ["invalid_response", "timeout", "aborted", "unavailable"].includes(error.code)) throw new SearchError(error.code);
        throw new SearchError("network");
      }
      if (!response || !Number.isInteger(response.status) || response.status < 100 || response.status > 599 ||
        !response.headers || typeof response.headers.get !== "function" || response.redirected === true ||
        response.type === "opaqueredirect" || response.type === "opaque" ||
        response.url !== undefined && response.url !== "" && new URL(response.url).href !== new URL(endpoint).href) {
        throw new SearchError("invalid_response");
      }
      const protocol = response.headers.get("x-searchsdk-protocol");
      if (protocol !== null && protocol !== "1") throw new SearchError("invalid_response");
      let body: unknown;
      try { body = await readJson(response, maximum, scope); }
      catch (error) {
        scope.check();
        // Malformed error bodies retain the status mapping. Inability to enforce
        // a byte cap remains an explicit unsupported_option failure.
        if (response.status < 200 || response.status >= 300) {
          if (error instanceof SearchError && error.code === "invalid_response") throw gatewayError(undefined, response.status, []);
        }
        throw error;
      }
      if (response.status !== 200) {
        if (response.status >= 200 && response.status < 300) throw new SearchError("invalid_response");
        throw gatewayError(body, response.status, token === undefined ? [request.query] : [request.query, token]);
      }
      const result = validateResponse(body, request.limit);
      batch?.check(); scope.check();
      return result;
    } catch (error) {
      batch?.check(); scope.check();
      if (error instanceof SearchError) throw error;
      throw new SearchError("invalid_response");
    } finally {
      token = undefined;
      if (response) disposeResponse(response);
      release?.(); scope.close();
    }
  }

  async function search(request: SearchRequest, options: SearchOptions = {}): Promise<SearchResponse> {
    const started = now();
    const validated = validateRequest(request);
    const fields = inputFields(options, ["signal"], "invalid_request");
    const signal = validateSignal(fields.signal);
    return execute(validated, signal, started);
  }
  async function searchBatch(inputs: readonly SearchRequest[], options: SearchBatchOptions = {}): Promise<readonly SearchBatchResult[]> {
    const started = now();
    let count: number;
    try {
      if (!Array.isArray(inputs) || inputs.length > 1000) throw new Error();
      count = inputs.length;
    } catch { throw new SearchError("invalid_request"); }
    const fields = inputFields(options, ["signal", "concurrency", "timeoutMs"], "invalid_request");
    const signal = validateSignal(fields.signal);
    const concurrency = positiveInteger(fields.concurrency, 4, 64, "invalid_request");
    const budget = positiveInteger(fields.timeoutMs, timeoutMs, 2_147_483_647, "invalid_request");
    const scope = createScope(Math.max(0, budget - (now() - started)), signal);
    const controllers: AbortController[] = [];
    const abortWorkers = () => { for (const controller of controllers) controller.abort(); };
    scope.signal.addEventListener("abort", abortWorkers, { once: true });
    const outcomes: SearchBatchResult[] = [];
    try {
      const requests = Array.from({ length: count }, (_, index) => {
        try { return validateRequest(inputs[index]); } catch { return new SearchError("invalid_request"); }
      });
      let cursor = 0;
      async function worker(controller: AbortController) {
        while (cursor < requests.length) {
          const index = cursor++, request = requests[index]!;
          try {
            scope.check();
            if (request instanceof SearchError) throw request;
            const value = await execute(request, controller.signal, now(), scope);
            scope.check(); outcomes[index] = { index, status: "fulfilled", value };
          } catch (error) {
            let failure = error instanceof SearchError ? error : new SearchError("invalid_response");
            try { scope.check(); } catch (stopped) { failure = stopped as SearchError; }
            outcomes[index] = { index, status: "rejected", error: failure };
          }
        }
      }
      await Promise.all(Array.from({ length: Math.min(concurrency, requests.length) }, () => {
        const controller = new AbortController(); controllers.push(controller);
        return worker(controller);
      }));
      return outcomes;
    } finally { scope.signal.removeEventListener("abort", abortWorkers); scope.close(); }
  }
  return { web: { search, searchBatch } };
}
