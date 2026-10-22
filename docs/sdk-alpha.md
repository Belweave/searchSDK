# SDK integration guide

The SDK provides fourteen normalized web-search adapters across fifteen providers, thirteen provider-native clients, opt-in reliability policies, durable checkpoints, and deterministic testing mocks. The package is not yet published to npm; build and install a local tarball using the [installation guide](https://searchsdk.dev/docs/installation).

`@belweave/search-sdk` version `0.1.0-alpha.0` is ESM with declarations and zero runtime dependencies. Server adapters target Node 24+; browser demos use the mock. Keep real provider keys on a server. Do not place them in public environment variables or the static site bundle.

## Exports

| Import | Exports |
| --- | --- |
| `@belweave/search-sdk` | `createSearch`, `SearchError`, public TypeScript types |
| `@belweave/search-sdk/exa` | `exa({ apiKey, fetch? })` |
| `@belweave/search-sdk/tavily` | `tavily({ apiKey, fetch? })` |
| `@belweave/search-sdk/brave` | `brave({ apiKey, fetch? })` |
| `@belweave/search-sdk/context` | `context({ apiKey, fetch? })` |
| `@belweave/search-sdk/tinyfish` | `tinyfish({ apiKey, fetch? })` |
| `@belweave/search-sdk/{perplexity,parallel,linkup,firecrawl,you,serper,serpapi}` | Corresponding normalized adapter factory |
| `@belweave/search-sdk/valyu` | `valyu(ValyuOptions)`, web-only search settings and raw JSON access |
| `@belweave/search-sdk/searxng` | `searxng(SearxngOptions)`, operator-selected JSON instance and raw access |
| `@belweave/search-sdk/native-<provider>` | Typed native client for each of the thirteen providers |
| `@belweave/search-sdk/native-transport` | Bounded native HTTP/SSE transport and types |
| `@belweave/search-sdk/durable` | Resumable operation, checkpoint types, memory store, reconciliation |
| `@belweave/search-sdk/durable-node` | Private local disk checkpoint store |
| `@belweave/search-sdk/testing` | `createMockProvider`, mock TypeScript types |

All fourteen normalized adapter factories return `SearchProvider`. `fetch` accepts a `(string | URL, RequestInit?) => Promise<Response>` transport for tests or server networking policy. Hosted provider endpoint URLs are fixed; SearXNG requires an explicit trusted HTTPS instance. Every request uses `redirect: 'error'`. There is no environment access or logging inside the SDK.

## Bounded query batches

`client.web.searchBatch(requests, { concurrency?, timeoutMs?, signal? })`
runs up to 1,000 normalized requests through bounded workers (default 4, maximum
64). Outcomes retain input order and carry `{ index, status: 'fulfilled', value }`
or `{ index, status: 'rejected', error }`. Per-item failure preserves successful
siblings; invalid batch options reject the batch promise.

The batch deadline includes queued work and defaults to the client's total
budget. Cancellation or expiry prevents further dispatch and marks unfinished
items aborted or timed out. Individual search and attempt budgets still apply.
Client maxConcurrency remains a shared bound; this is local query orchestration,
not a remote provider batch operation or an assurance of reduced charges.

See the [batch reference and runnable fixture](https://searchsdk.dev/docs/api/search-batch).

## Additional search integrations

[Valyu](https://searchsdk.dev/docs/providers/valyu) uses `valyu({ apiKey, search? })`
from `/valyu`. It explicitly selects web-only search. Typed settings include
`maxPrice`, `relevanceThreshold`, `responseLength`, `fastMode`, dates, and ranking
instructions. Content, native relevance, request identity, and reported USD usage
map into normalized fields. Domain lists allow 100 hostnames per side under SDK
policy; this is not a verified native maximum.

[SearXNG](https://searchsdk.dev/docs/providers/searxng) uses
`searxng({ baseUrl, headers?, language?, safeSearch?, timeRange?, categories?, fetch? })`
from `/searxng`. Choose a trusted HTTPS instance on the server; JSON output must
be enabled by its operator. It sends a form-encoded POST to `/search`, reads one
page, and does not support normalized domain filters. Its reported usage remains
unknown. It does not discover instances or invent an API key contract.

Both adapters expose `searchRaw(request, { signal? })` returning
`{ provider, retrievedAt, data }`. Raw JSON retains provider-specific fields and
must be validated as untrusted data. Direct calls bypass the `createSearch`
retry, cache, fallback, and deadline policies; supply caller-owned cancellation.
The HTTP transport retains its own resource bounds. Neither adapter adds a generated provider-native client.

## Search contract

```ts
import { createSearch } from '@belweave/search-sdk';
import { exa } from '@belweave/search-sdk/exa';
import { tavily } from '@belweave/search-sdk/tavily';

const client = createSearch({
  provider: exa({ apiKey: serverSecrets.exa }),
  fallback: [tavily({ apiKey: serverSecrets.tavily })], // optional; no implicit fallback
  timeoutMs: 10_000,       // default total call budget
  attemptTimeoutMs: 4_000, // default total call budget; never extends total deadline
});

const controller = new AbortController();
const response = await client.web.search({
  query: 'web search APIs',
  limit: 5,
  includeDomains: ['example.com'],
  excludeDomains: ['excluded.example.com'],
}, { signal: controller.signal });
```

`query` must be a nonblank string and is forwarded unchanged. `limit` defaults to 5; valid values are integers 1–20. Unknown request/config/options fields are rejected to prevent silently ignored options. Time budgets must be integer milliseconds between 1 and 2,147,483,647.

Domain filters accept nonempty arrays of ASCII hostnames, including punycode. Schemes, paths, wildcards and ports are rejected. Hostnames are lowercased and deduplicated; an identical hostname in both lists is rejected. Provider-native subdomain matching applies. There is no rewriting to `site:` operators or client-side filtering in real adapters.

Before any dispatch, **every possible provider** is checked for filter support and capacity. Exa accepts up to 1,200 entries per list; Tavily up to 300 include and 150 exclude entries. Brave rejects either domain option in this alpha, even when configured only as a fallback. Use a separate unfiltered client if Brave is required. Context.dev supports 100 include and 100 exclude domains. TinyFish accepts 100 of each under a conservative SDK policy; its native maximum is not documented. Both use provider-native hostname matching without promising exact root/subdomain behavior.

Context.dev declares `capabilities.maxQueryLength: 500` (UTF-16 code units), checked across the entire fallback chain before dispatch. Other providers may omit this optional capability. A request that exceeds a configured provider's ceiling rejects with `unsupported_option`.

`limit` is an output ceiling, not a guaranteed result count. Context.dev requests at least 10 native results because its official reference and overview disagree on the minimum, then the SDK trims; provider-reported credits can include those trimmed hits. TinyFish requests only page 0 because it documents no count parameter. Neither silently paginates.

The resolved shape is:

```ts
interface SearchResponse {
  provider: string; // winner
  results: readonly {
    url: string;
    title?: string;
    snippet?: string;
    highlights?: readonly string[];
    score?: number; // native; not comparable between providers
    provenance: {
      provider: string;
      sourceUrl: string;
      retrievedAt: string; // SDK retrieval time, ISO 8601; not publication time
      requestId?: string;
    };
  }[];
  attempts: readonly {
    provider: string;
    startedAt: string;
    durationMs: number;
    outcome: 'success' | 'error';
    code?: SearchErrorCode;
    status?: number;
    retryAfterMs?: number;
  }[];
  warnings: readonly { code: 'fallback_used' | 'provider_warning'; provider: string }[];
  usage: { unit: 'usd' | 'credits'; value: number } | null;
}
```

Result URLs must begin with `http://` or `https://`, with no embedded credentials, backslashes or whitespace/control characters. Consumed response fields are validated. A malformed result or invalid consumed metadata rejects the response; the SDK does not silently drop it. Unknown provider response fields are ignored. Results are capped to the requested limit without reranking or deduplication. Titles, snippets and highlights are untrusted provider text; React text children are suitable for display. Do not inject them as HTML. The URL check is for link safety and is not an SSRF policy for future server fetches.

Custom `SearchProvider` implementations must return the declared response shape and provide truthful provenance and capabilities. The orchestrator validates normalized result URLs, provenance fields, optional text/score/highlights, usage, and warning codes, and copies only public fields. Invalid successful responses fail with terminal `invalid_response`. This structural validation cannot establish the truth of source attribution; custom implementations remain trusted application code.

`usage` reports only provider-supplied usage from the winning response. It is `null` if absent, never an estimated zero. It does not estimate failed-attempt charges or total fallback spend. Warnings use SDK codes and do not forward raw provider messages. Exa warnings/notices produce `provider_warning`.

## Errors and fallback

`SearchError` exposes `code`, `attempts`, optional `status` and optional `retryAfterMs`. Its message is fixed by code; raw transport messages, abort reasons, provider error bodies and keys are excluded. Configuration errors can be thrown synchronously by factory functions; search validation errors reject the returned promise.

| Code | Explicit fallback? | Meaning |
| --- | --- | --- |
| `rate_limit` | Yes | HTTP 429 |
| `network` | Yes | Transport rejected, including blocked redirects |
| `unavailable` | Yes | HTTP 408 or 5xx |
| `attempt_timeout` | Yes | Per-attempt budget elapsed while total time remains |
| `timeout` | No | One total deadline elapsed |
| `aborted` | No | Caller cancelled |
| `auth` | No | HTTP 401/402/403 or Tavily account-limit 432/433 |
| `invalid_request` | No | Invalid/unknown request or call options |
| `unsupported_option` | No | A configured provider cannot meet required filters |
| `configuration` | No | Invalid client/provider setup or exhausted mock outcomes |
| `invalid_response` | No | Invalid JSON, schema or result URL |
| `provider_error` | No | Other rejected HTTP requests or custom provider exceptions |

Each configured provider ID appears at most once in a chain; duplicate IDs are rejected. Same-provider retries are opt-in and happen before fallback. There are no hedged requests or fallback after empty results. If all attempts fail, the error uses the final failure code and contains the full trace. `Retry-After` seconds or HTTP dates become a parsed delay; retry policy never shortens it. No raw header is forwarded.

The monotonic total deadline includes attempts and JSON parsing. Caller cancellation aborts the current attempt and prevents fallback. The SDK settles even when a custom provider/transport ignores its signal, and cleans up its own listeners/timers. HTTP error-body cancellation is best effort and cannot delay status classification or change fallback eligibility. Ignoring transports may continue their underlying I/O; use a transport that honors `AbortSignal` for resource cancellation. JavaScript execution must yield for timers to run; after provider work settles, elapsed budgets take precedence over late successes or failures.

## Key-free demo and tests

```ts
import { createSearch } from '@belweave/search-sdk';
import { createMockProvider } from '@belweave/search-sdk/testing';

const primary = createMockProvider({
  id: 'demo-primary',
  outcomes: [{ type: 'error', code: 'rate_limit', retryAfterMs: 2_000, delayMs: 250 }],
});
const backup = createMockProvider({ id: 'demo-backup', delayMs: 150 });
const demo = createSearch({ provider: primary, fallback: [backup] });
const response = await demo.web.search({ query: 'search interfaces' });
```

`createMockProvider()` returns three fixed example-domain results and `usage: null`; it performs no outbound requests. It implements include/exclude hostname filtering and result limits. Its `calls` property is a snapshot of invocation records `{ request, signal }`. Each instance owns its records and outcomes. Concurrent calls reserve outcomes in invocation order, independently of delay completion order.

When `outcomes` is supplied, each entry is consumed once; exhaustion returns `configuration`. A success outcome supports `{ type: 'success', results?, usage?, delayMs? }`; an error supports `{ type: 'error', code, status?, retryAfterMs?, delayMs? }`. Success fixtures omit provenance, which the mock adds. Fixture URLs and consumed result fields receive the same validation as real adapter results, before filtering or limiting. Recreate a queued mock per interactive run when repeatable scenarios are desired. Without `outcomes`, default success repeats indefinitely. Delays can be set per instance or overridden per outcome. Retrieval and attempt timestamps reflect the actual call clock.

From the root workspace run `npm run build -w packages/sdk`, then `npm test -w packages/sdk`. Tests import the compiled package and all adapter and testing subpath exports. They use Node's built-in test runner with concurrency 1, mock outcomes and injected fetch responses. No environment keys or paid live requests are used.

## Provider mappings verified on 2026-10-22

Exa uses POST `/search`, `x-api-key`, `type: 'auto'`, `numResults`, native domain filters and `contents.highlights: true`. Highlight arrays remain highlights; optional native score is preserved. `requestId` and `costDollars.total` become provenance and USD usage. [Official Exa Search reference](https://exa.ai/docs/reference/search).

Tavily uses POST `/search`, Bearer auth, `search_depth: 'basic'`, `max_results`, `include_usage: true`, and native domain filters with explicit `include_domains_mode: 'restrict'`. Automatic parameter selection, generated answers and raw content are disabled. `content` remains a snippet; `score`, `request_id` and `usage.credits` remain native. [Official Tavily Search reference](https://docs.tavily.com/documentation/api-reference/endpoint/search).

Brave uses GET `/res/v1/web/search` with `q`, `count`, `extra_snippets: true` and `X-Subscription-Token`. It reads `web.results`, maps `description` to snippet and `extra_snippets` to highlights. A valid `query.original` without a `web` section is treated as no web hits. Billing usage is unknown. [Official Brave Web Search reference](https://api-dashboard.search.brave.com/app/documentation/web-search/get-started).

Context.dev uses Bearer-authenticated POST `/v1/web/search`, native filters, and plain result descriptions. It maps `request_id` into provenance, `key_metadata.credits_consumed` into credit usage, and `partial: true` into a fixed provider warning. Optional page extraction is not requested. [Official Context Search reference](https://docs.context.dev/api-reference/web-scraping/search).

TinyFish uses GET `https://api.search.tinyfish.ai` with `X-API-Key`, `query`, `domain_type=web`, `page=0`, and optional CSV domain lists. It maps titles, URLs, and snippets in returned order. Position is not a relevance score; unreported usage is `null`. [Official TinyFish Search reference](https://docs.tinyfish.ai/search-api/reference).

See [priority adapter details](priority-adapters.md) for verified protocol examples, billing/capability caveats, and fixture validation. The [complete provider catalog](provider-catalog.md) distinguishes fourteen normalized web adapters, thirteen native clients, and the WonderSearch corpus boundary. Expanded native inventories are in [group A](https://searchsdk.dev/docs/providers/context) and [group B](https://searchsdk.dev/docs/providers/perplexity).

Search snippets/highlights are provider search response material. Extraction, streaming, native pagination parameters, generated answers, research, and management operations belong to provider-native clients, not the normalized source-result shape. Cross-provider score normalization is not provided.

## Expanded search policies

```ts
const client = createSearch({
  provider: context({ apiKey: serverSecrets.context }),
  timeoutMs: 12_000,
  attemptTimeoutMs: 4_000,
  retry: { maxRetries: 2, baseDelayMs: 250, maxDelayMs: 2_000 },
  maxConcurrency: 4,
  cache: { ttlMs: 30_000, maxEntries: 100 },
  deduplicate: true,
});
```

Retries, successful-result caching, and identical in-flight sharing are opt-in. Retry attempts can incur additional billing. The total deadline includes queueing, backoff, response processing, and snapshots. Caches are bounded, per client, and do not store failures. Returned reuse is labeled `reuse: 'cache' | 'inflight'`; reused attempt timestamps describe the original operation. Each deduplicated caller has independent cancellation. Results are cloned to prevent callers mutating shared cached state.

Normalized native domain capabilities also include `mutuallyExclusiveDomainFilters`. Perplexity, Parallel, Firecrawl, and You reject simultaneous include/exclude modes before dispatch. Serper and SerpAPI do not implement normalized domain filters. See each [provider reference](https://searchsdk.dev/docs/providers) for exact capacities and count behavior.

## Provider-native APIs

```ts
import { createContextClient } from '@belweave/search-sdk/native-context';
const contextAPI = createContextClient({ apiKey: serverSecrets.context });
const response = await contextAPI.search({ body: { query: 'SQLite', numResults: 10 } });
console.log(response.data, response.metadata.status);
```

Native clients expose named endpoint-specific methods with applicable `body`, `query`, `path`, `headers`, `rawBody`, `signal`, and `timeoutMs` arguments. Static types preserve native fields; they are not runtime JSON Schema validation. Unknown success fields remain intact. `client.operations` exposes implemented bindings. Fixed hosts, redirect rejection, bounded decoded response size, per-instance concurrency, redacted errors, and total deadlines apply. JSON/text/bytes/raw/SSE responses retain their appropriate shapes.

Retries default off and additionally require a replay-safe operation descriptor. Writes and creates are not automatically retried. SSE is incremental, supports cancellation, and does not reconnect or replay. Local cancellation does not imply a remote job was cancelled. Account-gated, beta, engine-specific, and payment negotiation limitations are recorded in provider references; no paid or authenticated live verification is claimed.

## Durable remote work

`runDurableOperation` from `/durable` stores submission intent before calling a provider, persists returned remote IDs, and resumes read-only status polling. The `/durable-node` file store uses a pre-existing private directory, exclusive per-key locks, atomic replacement, and fsync. Tests cover process restart and competing processes.

An uncertain submission outcome becomes `ambiguous_submission`; it is never silently retried. `attachDurableRemoteId` permits deliberate reconciliation once the actual remote job is identified. A stale lock requires operator recovery after writers stop. This is not a distributed scheduler or an exactly-once provider guarantee. Read the [reliability guide](https://searchsdk.dev/docs/guides/durable-operations) before use.
