import { SearchError } from "./errors.js";
import { exactFields, validateProviderResponse, validateRequest } from "./validation.js";
import { backoff, createScope, createSemaphore, positiveInteger, retryDelay, retryPolicy, transientCodes } from "./reliability.js";
import type { ProviderResponse, SearchAttempt, SearchBatchOptions, SearchBatchResult, SearchConfig, SearchOptions, SearchProvider, SearchRequest, SearchResponse, ValidatedSearchRequest } from "./types.js";
export { SearchError } from "./errors.js";
export { createNativeTransport } from "./native-transport.js";
export type { NativeOperation, NativeRequestInput, NativeResponse, NativeMetadata, NativeAttempt, NativeSSEEvent, NativeTransport, NativeTransportConfig, RetryPolicy } from "./native-transport.js";
export type * from "./types.js";

function checkProvider(provider: SearchProvider): void {
  if (!provider || typeof provider.id !== "string" || !/^[a-zA-Z0-9_-]{1,64}$/.test(provider.id) || typeof provider.search !== "function" ||
      !provider.capabilities || typeof provider.capabilities.domainFilters !== "boolean" ||
      provider.capabilities.mutuallyExclusiveDomainFilters !== undefined && typeof provider.capabilities.mutuallyExclusiveDomainFilters !== "boolean" ||
      !Number.isInteger(provider.capabilities.maxIncludeDomains) || provider.capabilities.maxIncludeDomains < 0 ||
      !Number.isInteger(provider.capabilities.maxExcludeDomains) || provider.capabilities.maxExcludeDomains < 0 ||
      provider.capabilities.maxQueryLength !== undefined &&
        (!Number.isInteger(provider.capabilities.maxQueryLength) || provider.capabilities.maxQueryLength < 1)) throw new SearchError("configuration");
}

/** Race even providers that ignore signal; always release our timer/listener. */
async function bounded<T>(run: (signal: AbortSignal) => Promise<T>, signal: AbortSignal,
  budget: number, timeoutCode: "timeout" | "attempt_timeout"): Promise<T> {
  const scope = createScope(budget, signal, timeoutCode);
  try { return await scope.race(Promise.resolve().then(() => { scope.check(); return run(scope.signal); })); }
  finally { scope.close(); }
}

export function createSearch(config: SearchConfig): { web: {
  search(request: SearchRequest, options?: SearchOptions): Promise<SearchResponse>;
  /** Up to 1,000 queries; bounded workers and ordered per-item outcomes. */
  searchBatch(requests: readonly SearchRequest[], options?: SearchBatchOptions): Promise<readonly SearchBatchResult[]>;
} } {
  if (!config || typeof config !== "object" || Array.isArray(config)) throw new SearchError("configuration");
  exactFields(config, ["provider", "fallback", "timeoutMs", "attemptTimeoutMs", "retry", "maxConcurrency", "cache", "deduplicate"], "configuration");
  if (config.fallback !== undefined && !Array.isArray(config.fallback) ||
    config.deduplicate !== undefined && typeof config.deduplicate !== "boolean") throw new SearchError("configuration");
  const providers = [config.provider, ...(config.fallback ?? [])];
  providers.forEach(checkProvider);
  if (new Set(providers.map(p => p.id)).size !== providers.length) throw new SearchError("configuration");
  const timeoutMs = positiveInteger(config.timeoutMs, 10_000);
  const attemptTimeoutMs = positiveInteger(config.attemptTimeoutMs, timeoutMs);
  const retry = retryPolicy(config.retry);
  const semaphore = config.maxConcurrency === undefined ? undefined : createSemaphore(positiveInteger(config.maxConcurrency, 8, 1024));
  let cacheTtl = 0;
  let cacheLimit = 100;
  if (config.cache !== undefined) {
    if (!config.cache || typeof config.cache !== "object" || Array.isArray(config.cache)) throw new SearchError("configuration");
    exactFields(config.cache, ["ttlMs", "maxEntries"], "configuration");
    cacheTtl = positiveInteger(config.cache.ttlMs, 0);
    cacheLimit = positiveInteger(config.cache.maxEntries, 100, 100_000);
  }
  const deduplicate = config.deduplicate === true;
  const cache = new Map<string, { expires: number; response: SearchResponse }>();
  interface Inflight { promise: Promise<SearchResponse>; controller: AbortController; subscribers: number }
  const inflight = new Map<string, Inflight>();
  function checkCaller(signal: AbortSignal | undefined, deadline: number, response?: SearchResponse) {
    if (signal?.aborted) throw new SearchError("aborted", { attempts: response?.attempts ?? [] });
    if (performance.now() >= deadline) throw new SearchError("timeout", { attempts: response?.attempts ?? [] });
  }
  function copy(response: SearchResponse, deadline: number, signal?: AbortSignal): SearchResponse {
    let result: SearchResponse;
    try { result = structuredClone(response); }
    catch { checkCaller(signal, deadline, response); throw new SearchError("invalid_response"); }
    checkCaller(signal, deadline, response);
    return result;
  }
  function store(key: string, response: SearchResponse, deadline: number, signal?: AbortSignal) {
    checkCaller(signal, deadline, response);
    if (!cacheTtl) return;
    const snapshot = copy(response, deadline, signal);
    const now = performance.now();
    for (const [storedKey, entry] of cache) if (entry.expires <= now) cache.delete(storedKey);
    cache.delete(key);
    while (cache.size >= cacheLimit) cache.delete(cache.keys().next().value!);
    cache.set(key, { expires: now + cacheTtl, response: snapshot });
  }

  async function execute(request: ValidatedSearchRequest, signal: AbortSignal | undefined, deadline: number): Promise<SearchResponse> {
    const attempts: SearchAttempt[] = [];
    const scope = createScope(Math.max(1, deadline - performance.now()), signal);
    let release: (() => void) | undefined;
    try {
      if (semaphore) release = await semaphore.acquire(scope.signal);
      scope.check();
      for (let providerIndex = 0; providerIndex < providers.length; providerIndex++) {
        const provider = providers[providerIndex]!;
        for (let retryIndex = 0; ; retryIndex++) {
          scope.check();
          const remaining = deadline - performance.now();
          if (remaining <= 0) throw new SearchError("timeout", { attempts });
          const start = performance.now();
          const startedAt = new Date().toISOString();
          const timeoutCode = remaining <= attemptTimeoutMs ? "timeout" : "attempt_timeout";
          try {
            const response = validateProviderResponse(await bounded<ProviderResponse>(s => provider.search(request, { signal: s }), scope.signal,
              Math.min(remaining, attemptTimeoutMs), timeoutCode));
            scope.check();
            if (performance.now() >= deadline) throw new SearchError("timeout");
            if (performance.now() - start >= attemptTimeoutMs) throw new SearchError("attempt_timeout");
            const result: SearchResponse = { ...response, results: response.results.slice(0, request.limit), provider: provider.id,
              attempts, warnings: [...response.warnings,
                ...(providerIndex > 0 ? [{ code: "fallback_used" as const, provider: provider.id }] : [])] };
            scope.check();
            if (performance.now() >= deadline) throw new SearchError("timeout");
            if (performance.now() - start >= attemptTimeoutMs) throw new SearchError("attempt_timeout");
            attempts.push({ provider: provider.id, startedAt, durationMs: performance.now() - start, outcome: "success" });
            return result;
          } catch (cause) {
            // Timers cannot fire during CPU-bound provider code. Preserve elapsed-time precedence.
            const now = performance.now();
            const error = signal?.aborted ? new SearchError("aborted") :
              now >= deadline ? new SearchError("timeout") :
              now - start >= attemptTimeoutMs ? new SearchError("attempt_timeout") :
              cause instanceof SearchError ? cause : new SearchError("provider_error");
            attempts.push({ provider: provider.id, startedAt, durationMs: now - start, outcome: "error", code: error.code,
              ...(error.status !== undefined ? { status: error.status } : {}),
              ...(error.retryAfterMs !== undefined ? { retryAfterMs: error.retryAfterMs } : {}) });
            if (transientCodes.has(error.code) && retryIndex < retry.maxRetries) {
              await backoff(scope, retryDelay(retry, retryIndex, error.retryAfterMs));
              continue;
            }
            if (!transientCodes.has(error.code) || providerIndex === providers.length - 1) {
              throw new SearchError(error.code, { attempts,
                ...(error.status !== undefined ? { status: error.status } : {}),
                ...(error.retryAfterMs !== undefined ? { retryAfterMs: error.retryAfterMs } : {}) });
            }
            break;
          }
        }
      }
      throw new SearchError("configuration");
    } catch (cause) {
      const error = signal?.aborted ? new SearchError("aborted") : performance.now() >= deadline ? new SearchError("timeout") :
        cause instanceof SearchError ? cause : new SearchError("provider_error");
      throw new SearchError(error.code, { attempts,
        ...(error.status !== undefined ? { status: error.status } : {}),
        ...(error.retryAfterMs !== undefined ? { retryAfterMs: error.retryAfterMs } : {}) });
    } finally { release?.(); scope.close(); }
  }

  async function search(input: SearchRequest, options: SearchOptions = {}): Promise<SearchResponse> {
    const deadline = performance.now() + timeoutMs;
    const request = validateRequest(input);
    if (!options || typeof options !== "object" || Array.isArray(options)) throw new SearchError("invalid_request");
    exactFields(options, ["signal"]);
    const signal = options.signal;
    if (signal !== undefined && !(signal instanceof AbortSignal)) throw new SearchError("invalid_request");
    for (const { capabilities: c } of providers) {
      if (c.mutuallyExclusiveDomainFilters && request.includeDomains && request.excludeDomains ||
          (request.includeDomains || request.excludeDomains) && !c.domainFilters ||
          (request.includeDomains?.length ?? 0) > c.maxIncludeDomains ||
          (request.excludeDomains?.length ?? 0) > c.maxExcludeDomains ||
          c.maxQueryLength !== undefined && request.query.length > c.maxQueryLength) throw new SearchError("unsupported_option");
    }
    if (signal?.aborted) throw new SearchError("aborted");
    if (!cacheTtl && !deduplicate) return execute(request, signal, deadline);
    const key = JSON.stringify({ ...request, ...(request.includeDomains ? { includeDomains: [...request.includeDomains].sort() } : {}),
      ...(request.excludeDomains ? { excludeDomains: [...request.excludeDomains].sort() } : {}) });
    const cached = cache.get(key);
    if (cached && cached.expires > performance.now()) {
      cache.delete(key); cache.set(key, cached); // LRU; hits never extend the TTL.
      return { ...copy(cached.response, deadline, signal), reuse: "cache" };
    }
    cache.delete(key);
    if (!deduplicate) {
      const result = await execute(request, signal, deadline);
      store(key, result, deadline, signal);
      return result;
    }
    let entry = inflight.get(key);
    const shared = entry !== undefined;
    if (!entry) {
      if (inflight.size >= 1024) throw new SearchError("unavailable");
      const controller = new AbortController();
      const created: Inflight = { controller, subscribers: 0, promise: Promise.resolve().then(async () => {
        const result = await execute(request, controller.signal, deadline);
        if (!controller.signal.aborted) store(key, result, deadline, controller.signal);
        return result;
      }) };
      entry = created;
      inflight.set(key, created);
      void created.promise.finally(() => { if (inflight.get(key) === created) inflight.delete(key); }).catch(() => {});
    }
    entry.subscribers++;
    const waiting = createScope(Math.max(1, deadline - performance.now()), signal);
    try {
      const result = copy(await waiting.race(entry.promise), deadline, signal);
      return shared ? { ...result, reuse: "inflight" } : result;
    } finally {
      waiting.close();
      entry.subscribers--;
      if (entry.subscribers === 0) {
        if (inflight.get(key) === entry) inflight.delete(key);
        entry.controller.abort();
      }
    }
  }

  async function searchBatch(inputs: readonly SearchRequest[], options: SearchBatchOptions = {}): Promise<readonly SearchBatchResult[]> {
    if (!Array.isArray(inputs) || inputs.length > 1000 || !options || typeof options !== "object" || Array.isArray(options)) throw new SearchError("invalid_request");
    exactFields(options, ["signal", "concurrency", "timeoutMs"]);
    const signal = options.signal;
    if (signal !== undefined && !(signal instanceof AbortSignal)) throw new SearchError("invalid_request");
    let concurrency: number, budget: number;
    try {
      concurrency = positiveInteger(options.concurrency, 4, 64);
      budget = positiveInteger(options.timeoutMs, timeoutMs);
    } catch { throw new SearchError("invalid_request"); }
    const scope = createScope(budget, signal);
    const outcomes: SearchBatchResult[] = [];
    // One listener on the batch signal; each worker owns a separate caller signal.
    const controllers: AbortController[] = [];
    const abortWorkers = () => { for (const controller of controllers) controller.abort(); };
    scope.signal.addEventListener("abort", abortWorkers, { once: true });
    try {
      // Snapshot all inputs before the first await so queued items cannot change identity.
      const requests = Array.from(inputs, input => {
        try { return validateRequest(input); }
        catch { return new SearchError("invalid_request"); }
      });
      let next = 0;
      async function worker(controller: AbortController) {
        while (next < requests.length) {
          const index = next++;
          const request = requests[index]!;
          try {
            // Cancellation/deadline also applies to items that have never dispatched.
            scope.check();
            if (request instanceof SearchError) throw request;
            const value = await search(request, { signal: controller.signal });
            scope.check();
            outcomes[index] = { index, status: "fulfilled", value };
          } catch (cause) {
            let error = cause instanceof SearchError ? cause : new SearchError("provider_error");
            try { scope.check(); }
            catch (stopped) {
              error = new SearchError((stopped as SearchError).code, { attempts: error.attempts });
            }
            outcomes[index] = { index, status: "rejected", error };
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
