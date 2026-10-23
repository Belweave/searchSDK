import { SearchError } from "./errors.js";

export function now(): number {
  return typeof globalThis.performance?.now === "function" ? globalThis.performance.now() : Date.now();
}
/** Always race signal-ignoring work and recheck elapsed time after synchronous work. */
export function createScope(timeoutMs: number, parent?: AbortSignal) {
  const controller = new AbortController();
  const deadline = now() + timeoutMs;
  let failure: SearchError | undefined;
  let rejectStop!: (error: SearchError) => void;
  const stopped = new Promise<never>((_, reject) => { rejectStop = reject; });
  void stopped.catch(() => {});
  function stop(code: "aborted" | "timeout") {
    if (failure) return;
    failure = new SearchError(code);
    rejectStop(failure);
    controller.abort(); // Never propagate arbitrary user abort reasons.
  }
  const onAbort = () => stop("aborted");
  try {
    parent?.addEventListener("abort", onAbort, { once: true });
    if (parent?.aborted) onAbort();
  } catch { throw new SearchError("invalid_request"); }
  let timer: ReturnType<typeof setTimeout>;
  function tick() {
    const remaining = deadline - now();
    if (remaining <= 0) stop("timeout");
    else timer = setTimeout(tick, Math.max(1, Math.ceil(remaining)));
  }
  timer = setTimeout(tick, Math.max(1, Math.ceil(timeoutMs)));
  function check() {
    let parentAborted: boolean | undefined;
    try { parentAborted = parent?.aborted; } catch { throw new SearchError("invalid_request"); }
    if (parentAborted) onAbort();
    else if (now() >= deadline) stop("timeout");
    if (failure) throw failure;
  }
  return {
    signal: controller.signal,
    remaining: () => Math.max(1, Math.ceil(deadline - now())),
    check,
    async race<T>(run: () => T | PromiseLike<T>): Promise<T> {
      check();
      const work = Promise.resolve().then(() => { check(); return run(); });
      const result = await Promise.race([work, stopped]);
      check();
      return result;
    },
    close() {
      clearTimeout(timer);
      try { parent?.removeEventListener("abort", onAbort); } catch { /* Invalid custom signals cannot leak exception text. */ }
    },
  };
}
export type Scope = ReturnType<typeof createScope>;

/** Bounded FIFO with immediate removal of cancelled waiters. */
export function createSemaphore(limit: number) {
  let active = 0;
  const queue: Array<{ grant(): void; abort(): void; signal: AbortSignal }> = [];
  const release = () => {
    const next = queue.shift();
    if (next) next.grant();
    else active--;
  };
  return {
    acquire(signal: AbortSignal): Promise<() => void> {
      if (signal.aborted) return Promise.reject(new SearchError("aborted"));
      return new Promise((resolve, reject) => {
        let released = false;
        const grant = () => {
          signal.removeEventListener("abort", abort);
          resolve(() => { if (!released) { released = true; release(); } });
        };
        const abort = () => {
          const index = queue.indexOf(entry);
          if (index >= 0) queue.splice(index, 1);
          reject(new SearchError("aborted"));
        };
        const entry = { grant, abort, signal };
        if (active < limit) { active++; grant(); }
        else if (queue.length >= 1024) reject(new SearchError("unavailable"));
        else { queue.push(entry); signal.addEventListener("abort", abort, { once: true }); }
      });
    },
  };
}
