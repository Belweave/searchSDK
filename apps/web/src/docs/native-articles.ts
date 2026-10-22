import type { DocArticle } from "./model.js";
import { callout, code, links, list, paragraph as p, section as s, table } from "./model.js";

export const nativeArticles: readonly DocArticle[] = [
  {
    slug: "api/native-transport", title: "Provider-native transport", group: "API reference", description: "Use fixed-origin operations with typed inputs, bounded responses, explicit retries, and sanitized metadata.", keywords: ["createNativeTransport", "NativeResponse", "rawBody", "SSE", "metadata"],
    sections: [
      s("choose-client", "Start with a provider client", p("Provider client factories bind supported operations to fixed origins and authentication. Use their typed methods for actual provider work. `createNativeTransport` is the lower-level primitive used by those clients; it does not discover endpoints or validate provider JSON schemas."), code("native-search.ts · server", `import { createContextClient } from '@belweave/search-sdk/native-context';

const apiKey = process.env.CONTEXT_API_KEY;
if (!apiKey) throw new Error('CONTEXT_API_KEY is required');

const client = createContextClient({ apiKey, maxConcurrency: 4 });
const response = await client.search({
  body: { query: 'SQLite write concurrency', numResults: 10 },
  timeoutMs: 8_000,
});
console.log(response.data.results);
console.log(response.metadata.status, response.metadata.attempts);`)),
      s("operation", "Operation and input", table(["Operation descriptor", "Behavior"], [["`id`", "Static operation name; never put user input or secrets in it."], ["`method`", "GET, POST, PUT, PATCH, DELETE, or HEAD."], ["`path`", "Relative to the fixed base path; `{name}` placeholders use input.path."], ["`retryable`", "Explicit replay eligibility. Defaults false, even for GET."], ["`response`", "json by default; text, bytes, raw, or sse."]]), table(["Request input", "Behavior"], [["`path`", "Placeholder values encoded as single path segments; do not pre-encode IDs."], ["`query`", "Scalar values or repeated arrays; null and undefined omitted."], ["`body`", "JSON serialized; cannot coexist with rawBody."], ["`rawBody`", "Fetch BodyInit, including FormData. Streaming request bodies are unsupported."], ["`headers`", "Non-auth endpoint headers; configured headers cannot be overridden."], ["`signal`, `timeoutMs`", "Cancellation and complete-operation deadline."]])),
      s("response", "Data and metadata", code("TypeScript · shape", `interface NativeResponse<T> {
  data: T;
  metadata: {
    provider: string;
    operation: string;
    status: number;
    requestId?: string;
    attempts: readonly {
      attempt: number;
      durationMs: number;
      outcome: 'success' | 'error';
      status?: number;
      code?: string;
    }[];
  };
}`), p("Metadata omits URLs, queries, request input, credentials, provider error bodies, and arbitrary headers. Successful `data` is native provider data and may itself contain sensitive fields. Generic response types are compile-time assertions, not runtime provider schema checks.")),
      s("bounds", "Limits and credentials", table(["Setting", "Default / boundary"], [["`timeoutMs`", "10,000 ms, including queue, backoff, fetch, response parsing, and stream lifetime."], ["`maxConcurrency`", "8 per transport instance; 1–1,024 when configured. Queue shares the deadline."], ["`maxResponseBytes`", "10 MiB of decoded response bytes, including streaming data."], ["`retry.maxRetries`", "0; retries require both opt-in policy and operation eligibility."]]), p("The base URL must be HTTPS and has no credentials, query, or fragment. Operation input cannot change origin or replace configured authentication. Raw responses are buffered under the size cap. Let Fetch set the multipart boundary for FormData."), p("The response cap is not a process-memory limit: decoded strings and parsed objects require additional memory. Uploads are materialized before dispatch and do not have an SDK upload-size cap; bound them in your application.")),
      s("responses", "Response modes", table(["Mode", "Returned data"], [["`json`", "Parsed native JSON. Empty 204/205 or HEAD becomes null."], ["`text`", "Decoded text."], ["`bytes`", "Uint8Array."], ["`raw`", "A buffered, bounded Response."], ["`sse`", "AsyncIterable<NativeSSEEvent>; incremental and single-consumer."]]), links({ label: "Streaming event behavior", href: "/docs/guides/streaming" }, { label: "Retry eligibility", href: "/docs/reliability/retries" }, { label: "Provider operation inventories", href: "/docs/providers" })),
    ],
  },
  {
    slug: "guides/streaming", title: "Consume native streams", group: "Guides", description: "Read incremental SSE events with an explicit lifetime and provider-specific event interpretation.", keywords: ["NativeSSEEvent", "AsyncIterable", "stream"],
    sections: [
      s("events", "Events are native data", code("consume.ts · shared stream consumer", `import type { NativeSSEEvent } from '@belweave/search-sdk';

export async function consume(events: AsyncIterable<NativeSSEEvent>) {
  for await (const event of events) {
    console.log(event.event, event.id, event.data);
    // Interpret data and terminal/error events using the provider contract.
    // Do not assume every event is JSON or that HTTP 200 means job success.
  }
}`), p("An SSE operation resolves to `{ data, metadata }` after response headers. Iterate `response.data` exactly once. `event.data` is a string; `event`, `id`, and `retry` may be present. The parser handles split UTF-8 and CR/LF boundaries, but provider event schemas still require interpretation.")),
      s("lifetime", "Own the stream lifetime", list("Pass an AbortSignal to the operation and abort it when the consumer is done.", "Breaking a for-await loop cancels the response body.", "The operation deadline covers the full stream lifetime, including periods when your consumer is idle.", "Response-byte limits apply to the stream as a whole, rather than restarting for each event.")),
      s("replay", "No automatic reconnect or replay", callout("Avoid duplicate remote work", "Once streaming headers are returned, stream consumption is not automatically retried. A disconnect can leave a remote job running. Save job IDs when the provider exposes them and reconcile through documented read operations.", "caution"), p("The SSE retry field is preserved as event data. It does not enable EventSource reconnect behavior. An incomplete final event is discarded under the parser's SSE framing rules. Metadata attempts describe connection setup; later iteration errors do not become new HTTP attempts."), links({ label: "Native transport reference", href: "/docs/api/native-transport" }, { label: "Durable job coordination", href: "/docs/guides/durable-operations" })),
    ],
  },
  {
    slug: "reliability/retries", title: "Retry policy", group: "Reliability", description: "Opt into bounded retries for transient failures while preserving the complete call deadline.", keywords: ["RetryPolicy", "Retry-After", "backoff", "maxRetries"],
    sections: [
      s("normalized", "Normalized search retries", code("retry.ts · fixture", `import { createSearch } from '@belweave/search-sdk';
import { createMockProvider } from '@belweave/search-sdk/testing';

const provider = createMockProvider({ outcomes: [
  { type: 'error', code: 'rate_limit', retryAfterMs: 10 },
  { type: 'success' },
] });
const client = createSearch({
  provider,
  timeoutMs: 5_000,
  retry: { maxRetries: 1, baseDelayMs: 25, maxDelayMs: 200 },
});
const response = await client.web.search({ query: 'SQLite concurrency' });
console.log(response.attempts.length); // 2, same provider; no fallback_used
`), p("Additional attempts occur per provider before moving to an explicit fallback. Transient categories are `network`, `rate_limit`, `unavailable`, and `attempt_timeout`. Terminal validation, auth, caller cancellation, and total-deadline failures are not retried.")),
      s("configuration", "Backoff settings", table(["Setting", "Contract"], [["`maxRetries`", "Additional attempts, integer 0–5; default 0."], ["`baseDelayMs`", "Positive integer starting delay; default 250."], ["`maxDelayMs`", "Positive integer exponential cap; default 5,000; at least baseDelayMs."]]), p("Backoff uses jitter and never shortens a parsed Retry-After value. If the required delay cannot fit inside the remaining deadline, the operation fails with timeout instead of retrying early. Retrying can repeat billable work.")),
      s("native", "Native operations require eligibility too", p("A native transport retry policy alone does not make every operation replayable. The operation must explicitly declare `retryable: true`; the default is false, including for GET. Provider create/write/delete methods remain non-retrying unless their static mapping deliberately declares otherwise. There is no claim of provider idempotency."), p("Native retry categories are transport errors and HTTP 429, 408, or 5xx. Malformed JSON, authentication failures, and stream consumption are not retried."), links({ label: "Fallback remains separate", href: "/docs/reliability/fallback" }, { label: "Native operation inventory", href: "/docs/providers" })),
    ],
  },
  {
    slug: "reliability/caching", title: "Cache and share requests", group: "Reliability", description: "Reuse successful normalized responses locally with explicit TTL, capacity, and independent caller cancellation.", keywords: ["deduplicate", "cache", "reuse", "inflight", "maxEntries"],
    sections: [
      s("configure", "Configure reuse explicitly", code("reuse.ts · fixture", `import { createSearch } from '@belweave/search-sdk';
import { createMockProvider } from '@belweave/search-sdk/testing';

const client = createSearch({
  provider: createMockProvider(),
  cache: { ttlMs: 30_000, maxEntries: 100 },
  deduplicate: true,
  maxConcurrency: 4,
});
const request = { query: 'SQLite concurrency', limit: 5 };
await client.web.search(request);
const reused = await client.web.search(request);
console.log(reused.reuse); // cache
`)),
      s("cache", "Successful-result cache", p("The cache is per client and in memory. Only successful responses are stored; errors are not. TTL starts at insertion and cache hits do not extend it. Capacity defaults to 100 entries and uses least-recently-used eviction. Stored and returned responses are defensive snapshots. Entry count is bounded, not total bytes; there is no persistent cache or invalidation API."), p("Keys reflect the normalized request. Domain lists are sorted for equivalence without rewriting the query. The cached response keeps its original retrieval time, attempt trace, and usage; it does not represent a fresh provider call or fresh charge. Reuse is labeled `reuse: 'cache'`.")),
      s("inflight", "Identical in-flight searches", p("With `deduplicate: true`, matching active requests share one execution and each subscriber receives a response snapshot. Joined subscribers receive `reuse: 'inflight'`. Each caller can cancel independently; the shared operation is aborted when no subscribers remain."), callout("Shared execution has one upstream lifetime", "A later subscriber joins the existing operation and its existing deadline. Joining does not restart or extend upstream work. Your cache and sharing scope should match your application's data-isolation boundary.")),
      s("concurrency", "Bound active operations", p("Normalized `maxConcurrency` is optional and has no active-operation limit when omitted. When configured, it bounds active SDK operations, including retry/backoff time, and queue time counts toward the caller's total deadline. Native transports separately default to eight active operations per transport instance. FIFO queues allow up to 1,024 waiting operations, then return unavailable."), links({ label: "Deadline behavior", href: "/docs/reliability/timeouts" }, { label: "Usage on reused responses", href: "/docs/reliability/usage" })),
    ],
  },
  {
    slug: "guides/durable-operations", title: "Resume durable operations", group: "Guides", description: "Persist a remote identifier and resume read-only polling without silently submitting duplicate work.", keywords: ["runDurableOperation", "checkpoint", "compareAndSet", "ambiguous_submission"],
    sections: [
      s("lifecycle", "Persist intent, then the remote ID", p("`runDurableOperation` coordinates an application-supplied submit callback and read-only poll callback. It saves a submitting intent before dispatch, saves the returned remote ID, and resumes that same ID on later invocations. It is not a managed background worker or a provider-specific job adapter."), code("durable.ts · fixture", `import {
  createMemoryCheckpointStore, runDurableOperation,
} from '@belweave/search-sdk/durable';

const store = createMemoryCheckpointStore(); // Tests only; not disk persistence
const options = {
  key: 'example-job',
  operation: 'example.fixture',
  inputFingerprint: 'fixture-v1',
  store,
  submit: async () => ({ remoteId: 'fixture-job-1' }),
  poll: async () => ({ state: 'completed' as const, value: { ok: true } }),
};
const first = await runDurableOperation(options);
const resumed = await runDurableOperation(options);
console.log(first.value, resumed.resumed); // { ok: true }, true
`)),
      s("store", "Choose a checkpoint store", table(["Store", "Boundary"], [["`createMemoryCheckpointStore()`", "Process-local tests; does not survive exit."], ["`createFileCheckpointStore({ directory })`", "Explicit Node-only subpath /durable-node; pre-existing absolute private local directory."], ["Custom CheckpointStore", "Must implement atomic compareAndSet across every writer and defensive snapshots."]]), p("The local file store uses exclusive per-key locks, atomic rename, and file/directory fsync. A crashed writer's lock is not stolen automatically. Stop writers and reconcile before removing stale locks. It is designed for trusted local filesystems, not distributed consensus.")),
      s("reconcile", "Fail closed on ambiguous submission", callout("No automatic resubmission", "A crash or failure after submission intent may leave remote work running without a saved identifier. The coordinator returns ambiguous_submission and refuses to submit again. Cancellation or deadline expiry during submission is also ambiguous. Reconcile with the provider before continuing.", "caution"), p("`operation` and `inputFingerprint` bind a checkpoint to the caller's intended work. Fingerprints and keys must be opaque and secret-free. Result checkpoints are JSON snapshots; they can contain sensitive provider data, so control storage access and retention."), p("After independently verifying the remote job belongs to the saved intent, call `attachDurableRemoteId({ store, key, operation, inputFingerprint, remoteId })`. It requires the matching submitting checkpoint and uses compare-and-set to attach the identifier. A later run can resume read-only polling. The helper cannot independently verify provider ownership.")),
      s("bounds", "Bound each invocation", p("Defaults are a 30-second invocation deadline, one-second poll interval, and 100 polls. Cancellation or deadline expiry while polling and poll-limit failure retain the saved remote identifier for later resumption. Submission interruption instead requires ambiguity reconciliation. Polling is explicit, bounded, and separate from remote cancellation."), links({ label: "Durable API and errors", href: "/docs/api/durable" })),
    ],
  },
  {
    slug: "api/durable", title: "Durable operation reference", group: "API reference", description: "Checkpoint states, storage requirements, and reconciliation errors for resumable remote work.",
    sections: [
      s("options", "Options", table(["Field", "Contract"], [["`key`", "Checkpoint key, 1–200 letters/digits/underscore/dot/colon/hyphen."], ["`operation`", "Static operation identity, 1–128 allowed identifier characters."], ["`inputFingerprint`", "Caller-owned opaque input/account binding; never a credential."], ["`store`", "CheckpointStore with load and atomic compareAndSet."], ["`submit({ signal })`", "One explicit submission returning `{ remoteId }`."], ["`poll(remoteId, { signal })`", "Read-only status; pending, completed with value, or failed."], ["`timeoutMs`, `pollIntervalMs`, `maxPolls`", "Positive integer invocation limits; 30,000 / 1,000 / 100 defaults."], ["`signal`", "Optional caller cancellation."]])),
      s("states", "Checkpoint states", list("`submitting`: intent persisted; an unknown outcome requires reconciliation.", "`submitted`: saved remote ID; safe to resume read-only polling.", "`completed`: JSON result stored and returned on resume.", "`failed`: remote failure retained; no automatic resubmission."), p("A checkpoint has version 1, a monotonically advancing revision, operation/input binding, and an updatedAt timestamp. Remote IDs are present after submission. Results are present only when completed.")),
      s("attach", "Explicit remote-ID reconciliation", p("Import `attachDurableRemoteId` from `@belweave/search-sdk/durable`. Supply `store`, `key`, `operation`, `inputFingerprint`, and a verified `remoteId`. The helper accepts only a matching submitting checkpoint, atomically advances its revision to submitted, and returns that checkpoint. Missing, mismatched, or concurrently changed state returns checkpoint_conflict."), callout("Caller verification is required", "Confirm the remote job belongs to this exact operation, account, and input before attaching it. This helper provides local checkpoint consistency; it does not verify remote identity or guarantee exactly-once execution.")),
      s("errors", "DurableOperationError", table(["Code", "Action"], [["`configuration`", "Correct invalid options, identifiers, or checkpoint values."], ["`storage_failure`", "Reconcile persisted state before continuing."], ["`checkpoint_conflict`", "Another writer or a different input binding owns the checkpoint."], ["`ambiguous_submission`", "Remote work may exist; do not automatically submit again."], ["`poll_failed`", "Read failed; resume using the saved remote identifier."], ["`remote_failed`", "Provider reported a terminal failure."], ["`poll_limit`", "Resume the saved job in a later bounded invocation."], ["`aborted`, `timeout`", "Persisted state remains; these do not cancel the remote job."]]), p("A remoteId can be exposed on the durable error when submission returned an ID but checkpoint persistence failed. Preserve it for reconciliation. Error messages omit raw storage and provider error details.")),
    ],
  },
];
