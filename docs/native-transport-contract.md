# Native transport contract

Stable shared interfaces are in `packages/sdk/src/native-transport.ts`. Provider clients should import `createNativeTransport`, `NativeOperation`, `NativeRequestInput`, `NativeResponse`, and `NativeTransportConfig` from `./native-transport.js`. All imports use `.js` specifiers. Factory implementation is available in that module.

```ts
const transport = createNativeTransport({
  provider: 'example', baseUrl: 'https://api.example.com/v1',
  headers: { Authorization: `Bearer ${apiKey}` }, fetch,
  retry: { maxRetries: 2 },
});
const result = await transport.request<{ id: string }>({
  id: 'jobs.get', method: 'GET', path: '/jobs/{id}', retryable: true,
}, { path: { id: jobId }, query: { include: ['result', 'usage'] }, signal });
// result.data.id; result.metadata.status / requestId / attempts
const stream = await transport.request({
  id: 'events', method: 'GET', path: '/jobs/{id}/events', response: 'sse',
}, { path: { id: jobId }, signal });
for await (const event of stream.data) { /* event.data is a string; parse per provider */ }
```

- `baseUrl` is fixed HTTPS, optional base path retained. Operation paths start `/`, are relative to that base path, and cannot change origin. `{name}` substitutions come from `input.path` and are encoded as one segment. Reject empty/dot path segments and unknown/missing placeholders; do not pre-encode IDs.
- `input.query` supports string/number/boolean, repeated arrays, null/undefined omitted. `input.body` is JSON; `input.rawBody` is `BodyInit` for multipart/FormData/upload. They are mutually exclusive. No streaming request body/retry support is promised.
- `operation.headers` and `input.headers` provide non-auth endpoint headers. Neither can override a config header (case insensitive). Use a separate configured transport when an endpoint needs different authentication. FormData receives Fetch's boundary automatically; do not manually set multipart content type.
- Response defaults to `json` (including `null` for empty 204/HEAD), with `text`, `bytes` (`Uint8Array`), `raw` (`Response`, buffered and bounded), and `sse` (`AsyncIterable<NativeSSEEvent>`) options. Generic JSON type is an assertion, **not runtime provider schema validation**. Provider code must validate normalized outputs.
- SSE is incremental, preserves event/data/id/retry, supports split UTF-8 and CR/LF boundaries, and never reconnects or replays after headers are returned. Consumer break cancels the body; the total deadline includes stream lifetime. Provider code interprets terminal/error events. No automatic polling: call status/read methods explicitly with the saved job ID.
- Retries are opt in at config (`retry.maxRetries`, 0–5, default 0), and **also** require `operation.retryable: true`. Write/create/delete operations use `false`/omitted. Read-only POST search may explicitly use true; repeat billing is possible. No provider idempotency claims. Network/429/408/5xx only, bounded exponential jitter, Retry-After respected or deadline failure without early retry. No retry of malformed JSON/schema errors, auth errors, or stream consumption.
- `timeoutMs` includes queue/backoff/fetch/body/stream. Default 10s; override input timeout per operation. Concurrency defaults 8 per transport; total body cap defaults 10 MiB, configurable. Raw responses are buffered under the cap.
- `NativeResponse` is `{ data, metadata: { provider, operation, status, requestId?, attempts } }`. No URL, query, input, auth, provider error body, or arbitrary headers are exposed by transport metadata/errors. Existing `SearchError` categories are reused. Success data is provider data and may itself contain sensitive fields.

Fixtures validate SDK behavior only; live provider behavior and endpoint idempotency remain unverified without credentials. Provider researchers must cite official endpoint documentation in their research files.

See [reliability.md](reliability.md) for tested guarantees, cache/dedup behavior, deadline limitations, streaming cleanup, and the separate durable checkpoint protocol.
