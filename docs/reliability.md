# Reliability and resumable operations

SDK alpha. These guarantees describe local SDK control flow, tested with deterministic transports and temporary files. They do not establish live provider correctness, provider idempotency, a billing guarantee, or exactly-once remote execution. No live credentials were used.

## Normalized search defaults

`createSearch({ provider })` performs one attempt against that provider. Retries, cache, and in-flight deduplication are **off by default**. Fallback is explicit. Search timeouts default to 10 seconds total; `attemptTimeoutMs` defaults to that total budget. Supported filters are checked against every provider in the fallback chain before dispatch, including providers that cannot combine include/exclude filters.

```ts
import { createSearch } from '@belweave/search-sdk';
import { exa } from '@belweave/search-sdk/exa';

const search = createSearch({
  provider: exa({ apiKey: process.env.EXA_API_KEY! }),
  timeoutMs: 8_000,
  attemptTimeoutMs: 3_000,
  retry: { maxRetries: 2, baseDelayMs: 250, maxDelayMs: 2_000 },
  maxConcurrency: 4,
  cache: { ttlMs: 15_000, maxEntries: 100 },
  deduplicate: true,
});
const result = await search.web.search({ query: 'typed search SDK' }, { signal });
```

This example opts into all four controls. Keep keys on the server. Repeated read-only searches may incur repeated billing.

## Retries, deadlines, and concurrency

- `retry.maxRetries` is **additional attempts per provider**, integer 0–5. Exhaust retries before advancing through an explicit fallback chain. Every dispatch appears in `SearchResponse.attempts`. A retry on the same provider does not emit `fallback_used`.
- Only `network`, `rate_limit`, `unavailable`, and `attempt_timeout` errors are retry candidates. Authentication/account, invalid request/response, and other provider rejections are terminal. Empty successful results remain successful.
- Exponential backoff uses equal jitter from half the calculated delay to its full value, capped by `maxDelayMs`. `Retry-After`, when valid, is a lower bound and is never shortened by the cap. If that delay cannot fit in the remaining total budget, the SDK returns `timeout` without issuing an early retry. The retry index restarts for the next provider.
- A monotonic total deadline covers queueing, all attempts, backoff, parsing, and successful cache/dedup snapshots. Caller cancellation takes precedence when observed. Synchronous JavaScript cannot be preempted: CPU-bound providers, JSON parsing, and cloning may occupy the event loop beyond the deadline, but checks after that work reject late success.
- `maxConcurrency` optionally limits active search **operations per client instance**, including retry/backoff time. Native transports independently default to eight slots. Each FIFO queue is capped at 1,024 waiting operations; saturation returns `unavailable`. Queued cancellation removes the waiter. Queue time consumes the total deadline.
- Timers and abort listeners are removed when an SDK operation finishes. A returned SSE stream keeps its scope until completion, explicit iterator close, cancellation, or the deadline. Cleanup is best effort and does not await an uncooperative body's cancellation promise.

Cancellation asks a cooperating transport to stop and also stops waiting on transports that ignore the signal. It cannot revoke remote execution, prove the remote request was never received, or guarantee a remote connection has ended before another SDK slot is used. A late HTTP response is cancelled when it eventually arrives. A transport promise that never settles may retain its own resources; custom transports must cooperate for physical resource bounds. No automatic circuit breaker or provider-global quota coordination is included.

Avoid stacking retries at multiple layers. Normalized search uses its own `retry` policy; the built-in normalized adapters do not silently add native transport retries. If a custom provider retries internally, the outer attempt history cannot enumerate those internal calls.

## Successful-result reuse

Caches and deduplication belong to a single `createSearch` instance, so separate credential/tenant clients do not share entries. Use a separate instance when credentials or tenant change; mutating credentials underneath a custom provider breaks that application boundary.

Cache stores only successful responses, uses a monotonic TTL, and bounds entries with LRU eviction. Hits do not extend the TTL. The first caller receives normal output; later hits have `reuse: 'cache'`. Results, provenance retrieval timestamps, and attempts describe the stored operation; a hit does not fabricate a new retrieval or remote attempt. Cloned snapshots prevent callers from mutating future cache hits. Entry count is bounded, not total cache bytes. Choose a small TTL/count for large results. There is no persistent cache, invalidation API, or semantic cross-provider cache.

With `deduplicate: true`, identical normalized requests within that instance share one in-flight search. Domain filter order is canonicalized; query text and limit remain part of the identity. Later subscribers receive `reuse: 'inflight'`. Each subscriber has independent cancellation and a cloned result. Cancelling one subscriber leaves other subscribers running. When the last leaves, the SDK aborts the shared operation and removes it before accepting a replacement. A shared operation retains the first subscriber's execution deadline; later subscribers cannot extend it. The map is capped at 1,024 distinct active keys. Failed operations never populate the cache.

## Native HTTP transport

The full interfaces and examples are in [native-transport-contract.md](native-transport-contract.md). Provider wrappers supply documented endpoint operations; the transport does not invent provider contracts.

`createNativeTransport` fixes an HTTPS origin and optional base path when configured. Encoded `{name}` path substitutions stay in one segment. Query arrays become repeated keys. JSON and finite `BodyInit` uploads are supported; request bytes are materialized before dispatch so a permitted retry does not reread a mutated upload. Streaming request bodies are unsupported. Upload materialization itself has no size cap; keep uploads bounded in the application. Configured headers, including credentials, cannot be overridden through operation/request headers. Redirects are rejected, and native Fetch requests omit ambient cookies.

Native retries require both a nonzero config retry policy and `operation.retryable: true`; even GET defaults to no retry. Endpoint wrappers must mark side-effecting create/update/delete operations non-retryable. Declaring a POST search replay-safe means repeating that search is acceptable to the caller; it does not establish provider idempotency or prevent repeated billing. No idempotency key is invented or silently injected.

`NativeResponse<T>` contains provider data and metadata with provider, static operation ID, status, sanitized request ID when available, and HTTP attempt history. JSON generic types do not validate a response schema at runtime. Normalized adapters validate fields they consume. SDK `SearchError` objects exclude raw transport messages, provider error bodies, URLs, queries, auth headers, and abort reasons. Successful provider data, raw response headers, and supplied application identifiers may contain sensitive information; applications control their logging.

Native `maxResponseBytes` defaults to **10 MiB of decoded bytes**, counted incrementally. Buffered JSON/text/bytes/raw responses and the entire SSE stream use that cap. `raw` returns a newly buffered `Response`; it does not preserve the original URL or provide unbounded streaming. `Content-Length` can reject early only when `Content-Encoding` is absent; decoded bytes remain the actual limit. Each Fetch chunk is allocated by the transport before the SDK can count it, and parsed objects/strings require additional memory. This is not a process memory cap.

Built-in normalized HTTP adapters also enforce a fixed 10 MiB decoded JSON limit and a 10-second direct-call ceiling, shortened by the passed signal. For backward compatibility, custom Response-like transports exposing only `json()` remain supported: their own materialization cannot be bounded incrementally; the SDK bounds waiting and checks serialized size after materialization. Prefer real Fetch `Response` objects for byte-level enforcement.

## SSE boundaries

SSE parsing is incremental UTF-8, handles split CR/LF/CRLF boundaries, multiline data, comments, event types, IDs, and numeric retry fields. Each incoming character is scanned once, with line fragments joined at line boundaries. Events require a blank-line delimiter; incomplete final events are discarded. JSON within `data` is not automatically parsed. Provider wrappers/callers interpret terminal and error events.

There is one iterator per stream. Consumer `break`, `return()`, or `throw()` cancels the reader and releases its slot, including before the first `next()` and while a read is pending. Caller cancellation and the total deadline bound reads. A stream never reconnects or replays automatically after response headers are returned. `metadata.attempts` covers connection setup; errors during later consumption are raised by iteration and do not rewrite that metadata as a new HTTP attempt. An unused stream retains its slot until its deadline unless the caller obtains and closes its iterator. Prefer prompt consumption and an appropriate timeout.

## Durable submission and status reads

`@belweave/search-sdk/durable` supplies a small opt-in checkpoint protocol. It is separate from normal search/cache and accepts an injectable `CheckpointStore`:

```ts
interface CheckpointStore {
  load(key: string): Promise<DurableCheckpoint | null>;
  compareAndSet(
    key: string,
    expectedRevision: number | null,
    next: DurableCheckpoint,
  ): Promise<boolean>;
}
```

A store must implement atomic compare-and-set across **all of its writers**, store defensive snapshots, and preserve records across restart if it claims persistence. `createMemoryCheckpointStore({ maxEntries: 1024 })` is bounded test storage and loses everything on process exit. An application using it has no crash durability.

`runDurableOperation` binds a key to a static operation name and caller-supplied input/account fingerprint. Use a non-secret stable fingerprint of tenant/account, operation version, and all meaningful inputs. Do not reuse a key with different inputs, change credentials to another account under the same binding, or persist API keys as fingerprints. The primitive cannot independently verify a provider account or identifier.

The protocol is deliberately conservative:

1. Atomically create a `submitting` checkpoint **before** dispatching a single submission callback. Submission is never retried by this primitive.
2. If submission returns a remote ID, atomically persist `submitted` with that ID before polling.
3. Poll only that existing ID using a read-only callback. Save `completed` with a JSON snapshot of its result, or `failed` on an explicit remote failure.
4. On a subsequent invocation, a completed checkpoint returns its saved snapshot; a submitted checkpoint resumes status/result reads without resubmitting. A `submitting` checkpoint raises `ambiguous_submission` and never calls submit again.

Snapshots copy own data-property descriptors into inert JSON data in one pass. Accessors, non-enumerable properties (including hidden `toJSON` hooks), symbol keys, non-plain objects, extra array properties, sparse arrays, cycles, undefined values, functions, and non-finite numbers are rejected. Getters and caller `toJSON` hooks are not executed. Finite negative zero is canonicalized to JSON's zero. Invalid completed poll data raises `poll_failed` while retaining the submitted remote ID for a later status read.

A crash before dispatch, during dispatch, after the provider accepted the request, or between remote acceptance and checkpointing can all leave `submitting`. The record cannot tell those cases apart. No exactly-once claim is possible here. Do not automatically delete such a record or call submit under a fresh key. Reconcile with the provider first. When a verified remote ID is available, `attachDurableRemoteId` explicitly attaches it to the matching `submitting` intent using CAS; later invocations can resume reads. If checkpoint persistence fails after an ID was returned, `DurableOperationError.remoteId` exposes the validated ID for that reconciliation.

Cancellation/timeout during submission is classified `ambiguous_submission`, because the remote side effect may already exist. Cancellation/timeout while reading status preserves the submitted ID. A thrown poll callback raises `poll_failed`, preserving resumability; there is no automatic poll-error retry. Pending polls use fixed `pollIntervalMs` (default 1,000), `maxPolls` per invocation (default 100, maximum 10,000), and total `timeoutMs` (default 30,000). Reaching a limit retains the checkpoint. Concurrent pollers may repeat safe reads; a losing terminal CAS raises `checkpoint_conflict` instead of overwriting the winner. This is not a worker scheduler, remote cancellation API, automatic recovery daemon, or distributed lease system.

## Disk-backed checkpoint setup

`@belweave/search-sdk/durable-node` exports `createFileCheckpointStore`. It dynamically loads Node filesystem builtins only when invoked; the injectable durable primitive does not depend on Node filesystem APIs.

Provision a private local directory **before accepting jobs**. For example:

```sh
mkdir -p "$HOME/.local/state/searchsdk/checkpoints"
chmod 700 "$HOME/.local/state/searchsdk/checkpoints"
```

The factory requires an absolute, pre-existing directory with no group/other permissions. Directory provisioning and the durability of its ancestor entries are the application's responsibility. Use storage intended to survive restart, not ephemeral deployment storage. Exclude checkpoints from source control and apply appropriate backup/retention controls because completed results may be sensitive.

```ts
import { createFileCheckpointStore } from '@belweave/search-sdk/durable-node';
import { runDurableOperation } from '@belweave/search-sdk/durable';

const store = await createFileCheckpointStore({
  directory: '/absolute/private/searchsdk-checkpoints',
  maxBytes: 1024 * 1024,
});

// submitOnce and readExistingJob are application bridges to a documented provider client.
const completed = await runDurableOperation({
  key: 'tenant-a:report-2026-10-22',
  operation: 'myapp.report.v1',
  inputFingerprint: 'sha256-of-account-and-request',
  store,
  submit: async ({ signal }) => ({ remoteId: await submitOnce(signal) }),
  poll: async (remoteId, { signal }) => readExistingJob(remoteId, signal),
  timeoutMs: 30_000,
  pollIntervalMs: 1_000,
  maxPolls: 20,
});
// readExistingJob returns { state: 'pending' }, { state: 'failed' },
// or { state: 'completed', value: JSON-compatible-data }.
```

Each key maps to a SHA-256-named JSON file; the disk store bounds each record to 1 MiB by default. It creates files with mode 0600, uses an exclusive per-key `.lock`, rechecks revision under that lock, writes/syncs a temporary file, renames it over the checkpoint, and syncs the containing directory. Lock removal is also followed by directory sync. Readers see the previous or new complete checkpoint on a local filesystem that provides atomic rename. Storage failures are reported without raw filesystem paths/messages; a failure after rename may still have committed, so reload/reconcile before acting.

A crashed process may leave `.lock` and temporary files. **Locks are never expired, stolen, or deleted automatically.** A blocked writer gets `checkpoint_conflict`. Recovery requires stopping all writers for that directory, inspecting the JSON checkpoint and provider state, then removing only the confirmed abandoned lock/temp files. Never remove a lock while its writer might still run. Keep a `submitting` checkpoint until its remote outcome is reconciled, regardless of lock cleanup.

The disk implementation targets a trusted private local directory on a filesystem with suitable exclusive-create, atomic-rename, and fsync behavior. It does not defend against a malicious same-user process changing symlinks/files, coordinate across hosts/NFS/object stores, guarantee hardware power-loss behavior, encrypt results, or prune retained records. Disk/history growth must be managed by the application. Store adapters that coordinate across hosts should implement the CAS contract using a database transaction rather than copying these local lock files.

## Verification and source basis

Core tests cover default behavior, retry gating, terminal errors, Retry-After, total/attempt budgets, queue cancellation/release, independent dedup subscribers, TTL/LRU and snapshot isolation, whole-chain filters, decoded body caps, split UTF-8/SSE fragmentation and early/pending iterator close, late response disposal, durable ambiguous submission, explicit reconciliation, concurrent CAS, corruption/size/permission/lock failures, and resuming a saved remote ID in a separate Node process. These are fixture tests; they do not exercise live providers, real power loss, NFS, cross-host concurrency, or remote idempotency.

Official references consulted 2026-10-22:

- [RFC 9110: Retry-After](https://www.rfc-editor.org/rfc/rfc9110.html#name-retry-after) and [idempotent methods](https://www.rfc-editor.org/rfc/rfc9110.html#name-idempotent-methods) inform the retry boundaries; method names alone do not establish endpoint replay safety.
- [WHATWG Fetch](https://fetch.spec.whatwg.org/) defines request/response bodies, abort, and redirect behavior. Application cancellation cannot prove the server did not execute a request.
- [WHATWG SSE parsing](https://html.spec.whatwg.org/multipage/server-sent-events.html#parsing-an-event-stream) defines line/data/id/event handling. The SDK intentionally does not implement EventSource reconnection.
- [Node 24 filesystem API](https://nodejs.org/docs/latest-v24.x/api/fs.html), including [filehandle.sync](https://nodejs.org/docs/latest-v24.x/api/fs.html#filehandlesync), [rename](https://nodejs.org/docs/latest-v24.x/api/fs.html#fspromisesrenameoldpath-newpath), and [exclusive file flags](https://nodejs.org/docs/latest-v24.x/api/fs.html#file-system-flags), underlies the local store. Those APIs do not establish a distributed or hardware-independent durability guarantee.
