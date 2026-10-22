import { SearchError } from "./errors.js";
import { backoff, createScope, positiveInteger } from "./reliability.js";

export type JSONValue = null | boolean | number | string | JSONValue[] | { [key: string]: JSONValue };
export type DurableState = "submitting" | "submitted" | "completed" | "failed";
export interface DurableCheckpoint {
  version: 1;
  revision: number;
  operation: string;
  /** Caller-owned opaque binding to inputs/account; never store credentials here. */
  inputFingerprint: string;
  state: DurableState;
  remoteId?: string;
  result?: JSONValue;
  updatedAt: string;
}
/** Implementations MUST provide atomic compare-and-set across all their writers. */
export interface CheckpointStore {
  load(key: string): Promise<DurableCheckpoint | null>;
  /** expectedRevision=null means create-if-absent. Store a defensive snapshot. */
  compareAndSet(key: string, expectedRevision: number | null, next: DurableCheckpoint): Promise<boolean>;
}
export type DurableErrorCode = "configuration" | "storage_failure" | "checkpoint_conflict" | "ambiguous_submission" |
  "poll_failed" | "remote_failed" | "poll_limit" | "aborted" | "timeout";
const messages: Record<DurableErrorCode, string> = {
  configuration: "Invalid durable operation configuration.",
  storage_failure: "Checkpoint storage failed; reconcile persisted state before continuing.",
  checkpoint_conflict: "Checkpoint changed or belongs to a different operation.",
  ambiguous_submission: "Submission may have reached the provider. Reconcile the remote operation; automatic resubmission is disabled.",
  poll_failed: "Reading remote operation status failed. The saved remote identifier can be resumed.",
  remote_failed: "The remote operation reported failure.",
  poll_limit: "This invocation reached its polling limit. Resume from the saved remote identifier.",
  aborted: "Durable operation was cancelled. Persisted state is retained.",
  timeout: "Durable operation exceeded its time budget. Persisted state is retained.",
};
export class DurableOperationError extends Error {
  readonly code: DurableErrorCode;
  /** Available if submission returned an identifier but checkpoint persistence failed. */
  readonly remoteId: string | undefined;
  constructor(code: DurableErrorCode, remoteId?: string) {
    super(messages[code]); this.name = "DurableOperationError"; this.code = code; this.remoteId = remoteId;
  }
}
function fail(code: DurableErrorCode = "configuration"): never { throw new DurableOperationError(code); }
export function validateCheckpointKey(key: string): void {
  if (typeof key !== "string" || !/^[a-zA-Z0-9_.:-]{1,200}$/.test(key)) fail();
}
function remoteId(value: unknown): asserts value is string {
  if (typeof value !== "string" || !/^[a-zA-Z0-9_.:/-]{1,512}$/.test(value)) fail();
}
function jsonSnapshot<T>(value: T): T {
  // Copy descriptor values once. Never execute getters or serialize caller-owned objects:
  // a second property read/toJSON call could change data after it was validated.
  const seen = new Set<object>();
  function snapshot(v: unknown): JSONValue {
    if (v === null || typeof v === "string" || typeof v === "boolean") return v;
    if (typeof v === "number" && Number.isFinite(v)) return v === 0 ? 0 : v;
    if (!v || typeof v !== "object" || seen.has(v)) return fail();
    const array = Array.isArray(v);
    const prototype = Object.getPrototypeOf(v);
    if (array ? prototype !== Array.prototype : prototype !== Object.prototype && prototype !== null) return fail();
    const descriptors = Object.getOwnPropertyDescriptors(v);
    const keys = Reflect.ownKeys(descriptors);
    if (keys.some(key => typeof key !== "string")) return fail();
    const descriptor = (key: string): PropertyDescriptor | undefined =>
      Object.getOwnPropertyDescriptor(descriptors, key)?.value as PropertyDescriptor | undefined;
    function data(key: string): unknown {
      const property = descriptor(key);
      if (!property || !("value" in property) || !property.enumerable) return fail();
      return property.value;
    }
    seen.add(v);
    try {
      if (array) {
        const length = descriptor("length");
        if (!length || !("value" in length) || !Number.isSafeInteger(length.value) || length.value < 0 ||
          keys.length !== length.value + 1) return fail();
        const result: JSONValue[] = [];
        for (let i = 0; i < length.value; i++) result.push(snapshot(data(String(i))));
        return result;
      }
      const result: { [key: string]: JSONValue } = {};
      for (const key of keys as string[]) {
        Object.defineProperty(result, key, { value: snapshot(data(key)), enumerable: true, writable: true, configurable: true });
      }
      return result;
    } finally { seen.delete(v); }
  }
  try { return snapshot(value) as T; }
  catch { return fail(); }
}
export function checkpointSnapshot(input: DurableCheckpoint): DurableCheckpoint {
  const value = jsonSnapshot(input);
  if (!value || typeof value !== "object" || Array.isArray(value) || value.version !== 1 ||
    !Number.isSafeInteger(value.revision) || value.revision < 1 ||
    typeof value.operation !== "string" || !/^[a-zA-Z0-9_.-]{1,128}$/.test(value.operation) ||
    typeof value.inputFingerprint !== "string" || !/^[a-zA-Z0-9_.:-]{1,256}$/.test(value.inputFingerprint) ||
    !["submitting", "submitted", "completed", "failed"].includes(value.state) ||
    typeof value.updatedAt !== "string" || !Number.isFinite(Date.parse(value.updatedAt)) ||
    Reflect.ownKeys(value).some(k => !["version", "revision", "operation", "inputFingerprint", "state", "remoteId", "result", "updatedAt"].includes(String(k)))) fail();
  if (value.state === "submitting") { if (value.remoteId !== undefined || Object.hasOwn(value, "result")) fail(); }
  else remoteId(value.remoteId);
  if (value.state === "completed") { if (!Object.hasOwn(value, "result")) fail(); }
  else if (Object.hasOwn(value, "result")) fail();
  return value;
}
/** Useful for tests only: this store does not survive process exit. */
export function createMemoryCheckpointStore(options: { maxEntries?: number } = {}): CheckpointStore {
  let maximum: number;
  try { maximum = positiveInteger(options.maxEntries, 1024, 100_000); } catch { return fail(); }
  const records = new Map<string, DurableCheckpoint>();
  return {
    async load(key) { validateCheckpointKey(key); const value = records.get(key); return value ? checkpointSnapshot(value) : null; },
    async compareAndSet(key, expected, next) {
      validateCheckpointKey(key); const snapshot = checkpointSnapshot(next);
      if (snapshot.revision !== (expected ?? 0) + 1) fail();
      if ((records.get(key)?.revision ?? null) !== expected) return false;
      if (!records.has(key) && records.size >= maximum) fail("storage_failure");
      records.set(key, snapshot); return true;
    },
  };
}
export type DurablePollResult<T extends JSONValue> = { state: "pending" } | { state: "completed"; value: T } | { state: "failed" };
export interface DurableOperationOptions<T extends JSONValue> {
  key: string;
  operation: string;
  inputFingerprint: string;
  store: CheckpointStore;
  /** One explicit submission, never retried by this primitive. */
  submit(options: { signal: AbortSignal }): Promise<{ remoteId: string }>;
  /** Must be a read-only status/result operation for the existing identifier. */
  poll(remoteId: string, options: { signal: AbortSignal }): Promise<DurablePollResult<T>>;
  signal?: AbortSignal;
  timeoutMs?: number;
  pollIntervalMs?: number;
  maxPolls?: number;
}
export interface DurableOperationResult<T extends JSONValue> {
  value: T;
  checkpoint: DurableCheckpoint;
  resumed: boolean;
}

/** Resume only a saved remote identifier; an ambiguous submission is never silently replayed. */
export async function runDurableOperation<T extends JSONValue>(options: DurableOperationOptions<T>): Promise<DurableOperationResult<T>> {
  if (!options || typeof options !== "object") fail();
  const { key, operation, inputFingerprint, store, submit, poll, signal, timeoutMs: timeout,
    pollIntervalMs: interval, maxPolls: maximum } = options;
  if (!store || typeof store.load !== "function" || typeof store.compareAndSet !== "function" ||
    typeof submit !== "function" || typeof poll !== "function" || signal !== undefined && !(signal instanceof AbortSignal)) fail();
  // Bind this invocation before any await. Caller mutation must never move a claim,
  // submission or reconciliation onto another checkpoint key/store. Capture declared
  // properties explicitly so class getters and non-enumerable options are retained.
  options = { key, operation, inputFingerprint,
    store: { load: store.load.bind(store), compareAndSet: store.compareAndSet.bind(store) },
    submit: submit.bind(options), poll: poll.bind(options), ...(signal !== undefined ? { signal } : {}) };
  validateCheckpointKey(options.key);
  let timeoutMs: number, pollIntervalMs: number, maxPolls: number;
  try {
    timeoutMs = positiveInteger(timeout, 30_000);
    pollIntervalMs = positiveInteger(interval, 1000);
    maxPolls = positiveInteger(maximum, 100, 10_000);
  } catch { return fail(); }
  const binding: DurableCheckpoint = checkpointSnapshot({ version: 1, revision: 1, operation: options.operation,
    inputFingerprint: options.inputFingerprint, state: "submitting", updatedAt: new Date().toISOString() });
  const scope = createScope(timeoutMs, options.signal);
  async function storage<R>(run: () => Promise<R>): Promise<R> {
    try { scope.check(); return await scope.race(Promise.resolve().then(run)); }
    catch (cause) { if (cause instanceof SearchError) throw cause; throw new DurableOperationError("storage_failure"); }
  }
  let checkpoint: DurableCheckpoint | null = null;
  let knownId: string | undefined;
  try {
    checkpoint = await storage(() => options.store.load(options.key));
    const resumed = checkpoint !== null;
    if (!checkpoint) {
      const claimed = await storage(() => options.store.compareAndSet(options.key, null, binding));
      if (!claimed) throw new DurableOperationError("checkpoint_conflict");
      checkpoint = binding;
      // Persist intent before dispatch. A crash anywhere after this point fails closed on restart.
      let submission: { remoteId: string };
      try {
        scope.check();
        submission = await scope.race(Promise.resolve().then(() => { scope.check(); return options.submit({ signal: scope.signal }); }));
        remoteId(submission?.remoteId); knownId = submission.remoteId;
      } catch { throw new DurableOperationError("ambiguous_submission"); }
      const submitted = checkpointSnapshot({ ...checkpoint, revision: checkpoint.revision + 1, state: "submitted", remoteId: knownId,
        updatedAt: new Date().toISOString() });
      if (!await storage(() => options.store.compareAndSet(options.key, checkpoint!.revision, submitted))) throw new DurableOperationError("checkpoint_conflict", knownId);
      checkpoint = submitted;
    }
    checkpoint = checkpointSnapshot(checkpoint);
    scope.check();
    if (checkpoint.operation !== binding.operation || checkpoint.inputFingerprint !== binding.inputFingerprint) fail("checkpoint_conflict");
    if (checkpoint.state === "submitting") fail("ambiguous_submission");
    if (checkpoint.state === "failed") fail("remote_failed");
    if (checkpoint.state === "completed") {
      const value = jsonSnapshot(checkpoint.result) as T;
      scope.check(); return { value, checkpoint, resumed };
    }
    knownId = checkpoint.remoteId!;
    for (let index = 0; index < maxPolls; index++) {
      let status: DurablePollResult<T>;
      try {
        scope.check(); status = await scope.race(Promise.resolve().then(() => { scope.check(); return options.poll(knownId!, { signal: scope.signal }); }));
      } catch (cause) { if (cause instanceof SearchError) throw cause; throw new DurableOperationError("poll_failed"); }
      if (!status || !["pending", "completed", "failed"].includes(status.state)) fail("poll_failed");
      if (status.state !== "pending") {
        let next: DurableCheckpoint;
        try { next = checkpointSnapshot({ ...checkpoint, revision: checkpoint.revision + 1, state: status.state,
          ...(status.state === "completed" ? { result: status.value } : {}), updatedAt: new Date().toISOString() }); }
        catch { return fail("poll_failed"); }
        if (!await storage(() => options.store.compareAndSet(options.key, checkpoint!.revision, next))) fail("checkpoint_conflict");
        if (status.state === "failed") fail("remote_failed");
        const value = jsonSnapshot(next.result) as T;
        scope.check(); return { value, checkpoint: next, resumed };
      }
      if (index + 1 < maxPolls) await backoff(scope, pollIntervalMs);
    }
    return fail("poll_limit");
  } catch (cause) {
    if (cause instanceof DurableOperationError) {
      if (knownId && cause.remoteId === undefined && ["storage_failure", "checkpoint_conflict"].includes(cause.code)) throw new DurableOperationError(cause.code, knownId);
      throw cause;
    }
    if (cause instanceof SearchError && ["aborted", "timeout"].includes(cause.code)) throw new DurableOperationError(cause.code as "aborted" | "timeout", knownId);
    throw new DurableOperationError("storage_failure", knownId);
  } finally { scope.close(); }
}

/** Explicit reconciliation only: caller must verify the remote identifier belongs to this intent. */
export async function attachDurableRemoteId(options: {
  store: CheckpointStore; key: string; operation: string; inputFingerprint: string; remoteId: string;
}): Promise<DurableCheckpoint> {
  if (!options || typeof options !== "object") fail();
  const { key, operation, inputFingerprint, remoteId: id, store } = options;
  if (!store || typeof store.load !== "function" || typeof store.compareAndSet !== "function") fail();
  options = { key, operation, inputFingerprint, remoteId: id,
    store: { load: store.load.bind(store), compareAndSet: store.compareAndSet.bind(store) } };
  validateCheckpointKey(options.key); remoteId(options.remoteId);
  try {
    const existing = await options.store.load(options.key);
    if (!existing) fail("checkpoint_conflict");
    const current = checkpointSnapshot(existing);
    if (current.state !== "submitting" || current.operation !== options.operation || current.inputFingerprint !== options.inputFingerprint) fail("checkpoint_conflict");
    const next = checkpointSnapshot({ ...current, state: "submitted", remoteId: options.remoteId, revision: current.revision + 1, updatedAt: new Date().toISOString() });
    if (!await options.store.compareAndSet(options.key, current.revision, next)) fail("checkpoint_conflict");
    return next;
  } catch (cause) { if (cause instanceof DurableOperationError) throw cause; return fail("storage_failure"); }
}
