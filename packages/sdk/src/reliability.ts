import { SearchError } from "./errors.js";
import type { RetryPolicy } from "./native-transport.js";

export function positiveInteger(value: number | undefined, fallback: number, maximum = 2_147_483_647): number {
  const result = value === undefined ? fallback : value;
  if (!Number.isInteger(result) || result < 1 || result > maximum) throw new SearchError("configuration");
  return result;
}
export interface ResolvedRetryPolicy { maxRetries: number; baseDelayMs: number; maxDelayMs: number }
export function retryPolicy(policy: RetryPolicy | undefined): ResolvedRetryPolicy {
  if (policy !== undefined && (!policy || typeof policy !== "object" || Array.isArray(policy) ||
    Reflect.ownKeys(policy).some(k => !["maxRetries", "baseDelayMs", "maxDelayMs"].includes(String(k))))) throw new SearchError("configuration");
  const maxRetries = policy?.maxRetries === undefined ? 0 : policy.maxRetries;
  if (!Number.isInteger(maxRetries) || maxRetries < 0 || maxRetries > 5) throw new SearchError("configuration");
  const baseDelayMs = positiveInteger(policy?.baseDelayMs, 250);
  const maxDelayMs = positiveInteger(policy?.maxDelayMs, 5000);
  if (maxDelayMs < baseDelayMs) throw new SearchError("configuration");
  return { maxRetries, baseDelayMs, maxDelayMs };
}
export const transientCodes = new Set(["network", "rate_limit", "unavailable", "attempt_timeout"]);
export function retryDelay(policy: ResolvedRetryPolicy, retryIndex: number, retryAfterMs?: number): number {
  // Equal jitter retains a positive lower bound and never shortens Retry-After.
  const cap = Math.min(policy.maxDelayMs, policy.baseDelayMs * 2 ** retryIndex);
  return Math.max(Math.ceil(cap / 2 + Math.random() * cap / 2), retryAfterMs ?? 0);
}

const scopeFailures = new WeakMap<AbortSignal, () => SearchError | undefined>();

/** One monotonic deadline with sanitised cancellation; also races signal-ignoring transports. */
export function createScope(timeoutMs: number, parent?: AbortSignal, timeoutCode: "timeout" | "attempt_timeout" = "timeout") {
  const controller = new AbortController();
  const deadline = performance.now() + timeoutMs;
  let error: SearchError | undefined;
  let rejectStop!: (error: SearchError) => void;
  const stopped = new Promise<never>((_, reject) => { rejectStop = reject; });
  // A scope can time out while a returned stream is not being consumed.
  void stopped.catch(() => {});
  const stop = (code: "aborted" | "timeout" | "attempt_timeout") => {
    if (error) return;
    error = new SearchError(code);
    rejectStop(error);
    controller.abort();
  };
  scopeFailures.set(controller.signal, () => error);
  const onAbort = () => {
    const inherited = parent ? scopeFailures.get(parent)?.() : undefined;
    stop(inherited?.code === "timeout" || inherited?.code === "attempt_timeout" ? inherited.code : "aborted");
  };
  parent?.addEventListener("abort", onAbort, { once: true });
  let timer: ReturnType<typeof setTimeout>;
  const tick = () => {
    const remaining = deadline - performance.now();
    if (remaining <= 0) stop(timeoutCode);
    else timer = setTimeout(tick, Math.max(1, Math.ceil(remaining)));
  };
  timer = setTimeout(tick, Math.max(1, Math.ceil(timeoutMs)));
  if (parent?.aborted) onAbort();
  function check() {
    if (parent?.aborted) onAbort();
    else if (performance.now() >= deadline) stop(timeoutCode);
    if (error) throw error;
  }
  return {
    signal: controller.signal,
    remaining: () => Math.max(0, deadline - performance.now()),
    check,
    async race<T>(promise: Promise<T>): Promise<T> {
      // The work promise may already be scheduled when an aborted scope checks.
      // Observe its eventual rejection even if check() stops us before Promise.race.
      void promise.catch(() => {});
      check();
      const result = await Promise.race([promise, stopped]);
      check();
      return result;
    },
    close() { clearTimeout(timer); parent?.removeEventListener("abort", onAbort); },
  };
}
export type OperationScope = ReturnType<typeof createScope>;
export async function backoff(scope: OperationScope, delayMs: number): Promise<void> {
  scope.check();
  if (delayMs >= scope.remaining()) throw new SearchError("timeout");
  let timer: ReturnType<typeof setTimeout> | undefined;
  try { await scope.race(new Promise<void>(resolve => { timer = setTimeout(resolve, delayMs); })); }
  finally { if (timer !== undefined) clearTimeout(timer); }
}

/** FIFO semaphore. Aborted queued entries are removed immediately. */
export function createSemaphore(limit: number, maxQueue = 1024) {
  let active = 0;
  const queue: Array<{ signal: AbortSignal; enter: () => void; abort: () => void }> = [];
  return {
    async acquire(signal: AbortSignal): Promise<() => void> {
      if (signal.aborted) throw new SearchError("aborted");
      if (active >= limit) {
        if (queue.length >= maxQueue) throw new SearchError("unavailable");
        await new Promise<void>((resolve, reject) => {
          const entry = { signal, enter: () => { signal.removeEventListener("abort", entry.abort); resolve(); },
            abort: () => {
              const index = queue.indexOf(entry);
              if (index >= 0) queue.splice(index, 1);
              reject(new SearchError("aborted"));
            } };
          queue.push(entry);
          signal.addEventListener("abort", entry.abort, { once: true });
        });
      } else active++;
      let released = false;
      return () => {
        if (released) return;
        released = true;
        const next = queue.shift();
        if (next) next.enter();
        else active--;
      };
    },
  };
}
