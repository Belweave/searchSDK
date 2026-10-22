# Batch search

`web.searchBatch` runs multiple normalized search queries with bounded concurrency
and returns one outcome for every input, in input order. It uses the same provider,
explicit fallback chain, retries, cache, deduplication and client concurrency limit
as `web.search`.

```ts
import { createSearch } from '@belweave/search-sdk';
import { createMockProvider } from '@belweave/search-sdk/testing';

const sdk = createSearch({
  provider: createMockProvider(), // Deterministic fixtures; no provider calls.
  maxConcurrency: 4,
});

const outcomes = await sdk.web.searchBatch([
  { query: 'retrieval evaluation', limit: 5 },
  { query: 'search provenance', includeDomains: ['example.com'] },
], { concurrency: 2, timeoutMs: 15_000 });

for (const outcome of outcomes) {
  if (outcome.status === 'fulfilled') {
    console.log(outcome.index, outcome.value.results);
  } else {
    console.error(outcome.index, outcome.error.code, outcome.error.attempts);
  }
}
```

An outcome is either `{ index, status: 'fulfilled', value: SearchResponse }` or
`{ index, status: 'rejected', error: SearchError }`. Input indices are zero-based.
Responses and errors retain ordinary search provenance, usage and attempt metadata.
The SDK does not aggregate provider relevance scores or imply comparable usage units.

## Bounds and failures

A batch accepts at most 1,000 requests. `concurrency` defaults to 4 and accepts
integers from 1 through 64. `timeoutMs` defaults to the client's total search
budget and covers the entire batch, including queue time. Each dispatched search
also retains its own client `timeoutMs` and `attemptTimeoutMs` budgets. A client's
`maxConcurrency` is shared across batches and individual calls.

An invalid batch envelope or invalid batch options reject the batch promise with
`invalid_request` before any provider dispatch. An invalid individual request,
unsupported provider option, or provider failure produces a rejected outcome for
that input while other queries continue. An empty batch returns `[]`.

Inputs are copied and normalized before the first asynchronous wait. Changing the
caller-owned request array or domain filters after invocation does not change
queued searches. The same query can still cause multiple billable calls unless
in-flight deduplication or caching is explicitly enabled. Retry and fallback
policies can also add calls, just as with individual searches.

## Cancellation

Pass an `AbortSignal` to cancel active queries and prevent queued queries from
dispatching:

```ts
const controller = new AbortController();
const pending = sdk.web.searchBatch([
  { query: 'first query' },
  { query: 'second query' },
], { concurrency: 1, signal: controller.signal });
controller.abort();
const outcomes = await pending;
```

Cancellation and the batch deadline resolve the batch with per-item `aborted` or
`timeout` errors. Already completed outcomes remain available. An item that never
dispatched has an empty `attempts` array. Abort reasons and raw transport errors
are not copied into outcomes. Cancellation of a deduplicated batch subscriber
leaves independent subscribers running.

Cancellation stops SDK waiting and signals the transport. It cannot guarantee that
a remote provider stops work or avoids billing after a request was dispatched.

## Custom-provider response contract

Custom providers return the normalized `ProviderResponse` shape: `results`,
`usage` (or `null`), and `warnings`. The SDK checks result URLs, provenance,
optional text/highlight/score fields, nonnegative finite usage and warning codes.
Malformed successful responses fail with terminal `invalid_response`; they do not
trigger retries or fallback. Only fields defined by the normalized contract are
copied into public results. A rejected custom-provider promise with an ordinary
exception remains `provider_error`.
