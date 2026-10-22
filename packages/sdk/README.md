# @belweave/search-sdk

TypeScript search and provider-native API clients by Belweave. Alpha
`0.1.0-alpha.0`, ESM, TypeScript declarations, zero runtime dependencies.
Use the patched Node version pinned in the repository's `.nvmrc` for development.
The package is not yet published to npm; APIs may change before a stable release.

[Documentation](https://searchsdk.dev/docs) · [Provider reference](https://searchsdk.dev/docs/providers) · [Playground](https://searchsdk.dev/playground)

## Install from source or a tarball

Build and pack from a checkout, using Node from `.nvmrc`:

```sh
git clone https://github.com/Belweave/searchSDK.git
cd searchSDK
nvm use
npm ci
npm run build:sdk
npm pack -w @belweave/search-sdk
```

In your server application, install the generated tarball:

```sh
npm install /path/to/belweave-search-sdk-0.1.0-alpha.0.tgz
```

The [alpha release](https://github.com/Belweave/searchSDK/releases/tag/v0.1.0-alpha.0)
provides the tarball and its SHA-256 checksum. Install the downloaded file in the
same way. An npm registry install command will follow package publication.

## Try it without credentials

```ts
import { createSearch } from '@belweave/search-sdk';
import { createMockProvider } from '@belweave/search-sdk/testing';

const search = createSearch({ provider: createMockProvider() });
const response = await search.web.search({ query: 'SQLite write concurrency', limit: 3 });
console.log(response.results, response.attempts);
```

The mock uses deterministic local fixtures and makes no outbound requests. The
following real-provider examples belong on a server and may incur charges.

## Search with Context, fall back to TinyFish

```ts
import { createSearch } from '@belweave/search-sdk';
import { context } from '@belweave/search-sdk/context';
import { tinyfish } from '@belweave/search-sdk/tinyfish';

const { web } = createSearch({
  provider: context({ apiKey: process.env.CONTEXT_API_KEY! }),
  fallback: [tinyfish({ apiKey: process.env.TINYFISH_API_KEY! })],
  timeoutMs: 10_000,
  attemptTimeoutMs: 4_000,
});

const response = await web.search({ query: 'SQLite write concurrency', limit: 5 });
console.log(response.results, response.attempts);
```

Keys stay on your server. Normalized adapters are available at `/context`,
`/tinyfish`, `/exa`, `/tavily`, `/brave`, `/perplexity`, `/parallel`, `/linkup`,
`/firecrawl`, `/you`, `/serper`, `/serpapi`, `/valyu`, and `/searxng`. Each returns
`SearchProvider`. The `valyu(ValyuOptions)` and `searxng(SearxngOptions)` factories
provide normalized search only; they have no provider-native client. SearXNG
requires an operator-selected instance with JSON search enabled. WonderSearch
searches your corpus and has its own native client. In total, the catalog has
fifteen providers, fourteen normalized adapters, and thirteen native clients.

The shared request contains `query`, `limit` (1–20, default 5), `includeDomains`,
and `excludeDomains`. Every configured fallback is checked for required
capabilities before any dispatch. Filters use hostnames; support, capacity, and
include/exclude exclusivity differ by provider. Results preserve native order,
text, relevance scales, source URLs, and retrieval provenance. Unknown usage is
`null`. Usage covers the winning operation, not total fallback/retry spend.

Context requests at least ten native hits before capping SDK output. TinyFish
and SerpAPI return one page; the SDK never invents a count or silently paginates.
See the [search reference](https://searchsdk.dev/docs/api/search) for exact limits.

## Valyu and SearXNG

```ts
import { valyu } from '@belweave/search-sdk/valyu';
import { searxng } from '@belweave/search-sdk/searxng';

const valyuSearch = createSearch({
  provider: valyu({
    apiKey: process.env.VALYU_API_KEY!,
    search: { fastMode: true, responseLength: 'short' },
  }),
});

const instanceSearch = createSearch({
  provider: searxng({
    baseUrl: process.env.SEARXNG_BASE_URL!,
    language: 'en',
    safeSearch: 1,
  }),
});
```

Valyu sends web-only requests; it does not enable proprietary datasets. Its
provider settings also include `maxPrice`, `relevanceThreshold`, `startDate`,
`endDate`, and `instructions`. Native billing values are preserved when reported.
SearXNG sends one form-encoded JSON search request to a trusted HTTPS instance,
without instance discovery or automatic pagination. The operator must enable
JSON output; engine support and access depend on the instance. SearXNG rejects
normalized domain filters and reports unknown usage as `null`.

Both factories also expose `provider.searchRaw(request, { signal })`, returning
`{ provider, retrievedAt, data }` with original provider JSON after consumed-field
validation. This is a direct adapter call: the `createSearch` orchestration
policies do not apply. Supply cancellation and handle private provider data
appropriately. These helpers are not full provider-native API clients.

## Explicit reliability policies

```ts
const client = createSearch({
  provider: context({ apiKey: process.env.CONTEXT_API_KEY! }),
  timeoutMs: 12_000,
  attemptTimeoutMs: 4_000,
  retry: { maxRetries: 2, baseDelayMs: 250, maxDelayMs: 2_000 },
  maxConcurrency: 4,
  cache: { ttlMs: 30_000, maxEntries: 100 },
  deduplicate: true,
});
```

Retries, result caching, and in-flight sharing are opt-in. Transient errors alone
are retryable; authentication, invalid data, and empty results do not trigger
fallback. Repeated requests may incur repeated billing. Queueing and backoff
share one total deadline. Each deduplicated caller can cancel independently.
Cache and shared responses are cloned, remain instance-scoped, and identify
reuse through `response.reuse`.

Pass `{ signal }` as the second argument to `web.search`. SDK deadlines settle
signal-ignoring transports, but cannot force their underlying I/O to stop.

## Search batches with bounded workers

```ts
const outcomes = await client.web.searchBatch([
  { query: 'SQLite write concurrency', limit: 3 },
  { query: 'PostgreSQL transaction isolation', limit: 3 },
], { concurrency: 4, timeoutMs: 10_000 });

for (const outcome of outcomes) {
  if (outcome.status === 'fulfilled') {
    console.log(outcome.index, outcome.value.results);
  } else {
    console.error(outcome.index, outcome.error.code);
  }
}
```

`web.searchBatch(requests, options?)` accepts up to 1,000 requests. Worker
concurrency defaults to 4 and accepts integers 1–64; the client's
`maxConcurrency` still bounds active searches. Outcomes preserve input order
with `{ index, status: 'fulfilled', value }` or
`{ index, status: 'rejected', error }`. An invalid item or provider failure does
not discard successful sibling results. Invalid batch configuration rejects the
whole call.

The batch `timeoutMs` defaults to the client's total timeout and includes queued
items. Pass a `signal` in the batch options to cancel the batch. Deadline or
cancellation errors are recorded for unfinished items, including those never
dispatched. Each dispatched item uses the client's normal fallback, retry,
cache, and deduplication policies; it can incur provider charges. This is client
orchestration, not a provider-native bulk endpoint.
See the [batch search guide](https://github.com/Belweave/searchSDK/blob/main/docs/batch-search.md)
for complete cancellation and partial-success examples.

## Preserve provider-native APIs

```ts
import { createContextClient } from '@belweave/search-sdk/native-context';

const contextAPI = createContextClient({ apiKey: process.env.CONTEXT_API_KEY! });
const response = await contextAPI.search({ body: { query: 'SQLite', numResults: 10 } });
console.log(response.data, response.metadata);
```

Thirteen providers have `native-<provider>` entry points: Context.dev, TinyFish,
Exa, Tavily, Brave, Perplexity, Parallel, Linkup, Firecrawl, You.com, Serper,
SerpAPI, and WonderSearch. Named methods expose
native search, extraction, crawl, generated answers, research, streaming, jobs,
and management operations where documented. Endpoint-specific input and response
types preserve native fields. `client.operations` lists implemented bindings.
Native JSON types are compile-time contracts, not runtime schema validators.

The transport uses fixed origins, blocked redirects, bounded bodies, sanitized
errors, deadlines, bounded concurrency, and opt-in replay-safe retries. SSE
consumers receive incremental events; streams never reconnect or replay
implicitly. Writes and job creation are not automatically retried. Account-gated
and private surfaces remain subject to provider access and documentation limits.

## Resume remote jobs

`/durable` exports `runDurableOperation`, an injectable atomic checkpoint store
contract, and explicit reconciliation helpers. `/durable-node` provides a local
disk store with exclusive locks, atomic rename, and fsync. Persisted remote IDs
can be resumed after process restart. Ambiguous submissions fail closed instead
of being automatically repeated. A stale disk lock requires operator recovery.
This is not a distributed queue or an exactly-once provider guarantee.

## Test without provider keys

```ts
import { createMockProvider } from '@belweave/search-sdk/testing';
const provider = createMockProvider();
const demo = createSearch({ provider });
await demo.web.search({ query: 'example' }); // deterministic local fixture
```

From a checkout: `npm ci`, then `npm run check`. Tests use compiled SDK output
with mocked providers and injected transports. Fixtures, declaration checks, and
official endpoint inventories validate SDK contracts; authenticated live-provider
verification and comparative benchmarks are still pending.

## License and security

[MIT](https://github.com/Belweave/searchSDK/blob/main/LICENSE). Provider services,
content, and third-party assets retain their own terms and licenses. See the
[security policy](https://github.com/Belweave/searchSDK/security/policy) for private
reporting and integration boundaries.
