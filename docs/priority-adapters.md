# Priority adapter mapping: Context.dev and TinyFish

Verified against current official documentation on 2026-10-22. Both expose a dedicated web-search API, so both adapters are implemented. Verification used documentation and injected HTTP fixtures, without API keys or live provider calls. This is protocol/fixture validation, not live provider verification. Package version remains `0.1.0-alpha.0`.

## Imports and server example

```ts
import { createSearch } from '@belweave/search-sdk';
import { context } from '@belweave/search-sdk/context';
import { tinyfish } from '@belweave/search-sdk/tinyfish';

const client = createSearch({
  provider: context({ apiKey: serverSecrets.context }),
  fallback: [tinyfish({ apiKey: serverSecrets.tinyfish })],
  timeoutMs: 10_000,
  attemptTimeoutMs: 4_000,
});
const response = await client.web.search({
  query: 'TypeScript release notes',
  limit: 5,
  includeDomains: ['typescriptlang.org', 'github.com'],
  excludeDomains: ['excluded.github.com'],
}, { signal: requestAbortSignal });
```

Factories return `SearchProvider` with IDs `context` and `tinyfish`. Each accepts `{ apiKey, fetch? }` using the existing `AdapterOptions`/`FetchTransport` contract. They read no environment variables. The example assumes application-owned server secrets and an `AbortSignal` supplied by the caller. Neither factory is added to the root export; use its explicit subpath. Both appear in the package export map with declarations and ESM entry points.

## Context.dev protocol

The adapter sends `POST https://api.context.dev/v1/web/search`, Bearer authorization and JSON `{ query, numResults, includeDomains?, excludeDomains? }`. The reference specifies a query ceiling of 500 characters and 100 domains per list. `description` maps to `snippet`; `request_id` maps to provenance. The string-valued `relevance` is not converted to a numeric score. [Search reference](https://docs.context.dev/api-reference/web-scraping/search).

There is an official documentation discrepancy: the reference permits `numResults` 1–100, while the overview says 10–100. The adapter uses `Math.max(10, limit)`, which satisfies both documents, and the orchestrator truncates to the requested SDK limit (1–20, default 5). It can receive fewer hits; no exact-count guarantee is made. No cursor or pagination parameter is documented for this endpoint. [Search overview](https://docs.context.dev/search/overview).

An illustrative injected response is:

```json
{
  "results": [{
    "url": "https://example.com/source",
    "title": "A source",
    "description": "Native search description",
    "relevance": "high"
  }],
  "request_id": "3f1c2a6e-8b4d-4c1e-9f0a-2d7b5e6c8a91",
  "key_metadata": { "credits_consumed": 1 },
  "partial": false
}
```

`key_metadata.credits_consumed` becomes credit usage, including an explicit zero; missing usage stays `null`. This is request-reported usage, not an estimate from the output count. Context prices search per ten returned results, rounded up. Requesting ten for an SDK limit below ten can bill for results the SDK trims. [Credits and pricing](https://docs.context.dev/account/credits).

The adapter omits optional Markdown/highlight extraction. Those require explicit enabling and can add charges. Per-result `markdown.code` or `highlights.code` failures do not invalidate usable URL/title/description fields; these unrequested content fields are ignored. [Result content](https://docs.context.dev/search/page-content). A `partial: true` response produces the fixed SDK `provider_warning` code, including an empty partial collection; a non-boolean supplied `partial` rejects as `invalid_response`. Raw provider messages never become warnings. Context documents `partial` for its opt-in `timeoutOpts.behavior=return-partial` mode. This adapter does not request that mode or translate SDK timeouts into a provider deadline; handling a returned flag does not promise partial results when a caller aborts or the SDK deadline expires. [Search reference](https://docs.context.dev/api-reference/web-scraping/search).

Keys are managed at the Context dashboard; restricted direct data access uses `data:execute`. Supply the key from your server secret store. [API keys](https://docs.context.dev/account/api-keys).

## TinyFish protocol

The adapter sends `GET https://api.search.tinyfish.ai` with `X-API-Key` and URL-encoded `query`, `domain_type=web`, `page=0`, plus optional CSV `include_domains` and `exclude_domains`. The official search overview distinguishes ranked search from Agent and Browser execution. [Search overview](https://docs.tinyfish.ai/search-api/overview). Create a REST API key at `agent.tinyfish.ai/api-keys`; the authentication guide specifies the `X-API-Key` header. [Authentication](https://docs.tinyfish.ai/authentication).

TinyFish documents pages 0–10, without a count parameter, page-size guarantee, query-length ceiling or domain-list maximum. This adapter fetches one first page. `limit` caps SDK output and never becomes an invented request parameter; a requested 20 may return fewer. `title`, `snippet` and `url` map directly. `position` is not treated as a score. There is no documented per-response charge or request-ID field to map, so usage stays `null` and provenance omits `requestId`. The reference currently documents 30 requests/minute per key and 12,000 free search requests/day resetting at 00:00 UTC; these are provider policies, not guarantees enforced by the SDK. [Search reference](https://docs.tinyfish.ai/search-api/reference).

The native `total_results`, `page` and query echo are intentionally omitted from the portable SDK response, which has no pagination or provider-metadata field. The reference describes `total_results` as the number returned, rather than a corpus-wide match estimate; official examples show two illustrative rows with `total_results: 10`. It is not used to pad, truncate, reject, infer a next page, or initiate another billable request. Consumers needing native totals or pagination must use the provider API directly. `response.results.length` is the actual SDK output count. [Search reference](https://docs.tinyfish.ai/search-api/reference), [Search examples](https://docs.tinyfish.ai/search-api/examples).

The adapter omits location and language, so TinyFish's documented defaults of US and English apply; the SDK makes no locale-neutral result guarantee. [Search reference](https://docs.tinyfish.ai/search-api/reference).

Illustrative injected response:

```json
{
  "query": "TypeScript release notes",
  "results": [{
    "position": 1,
    "site_name": "example.com",
    "title": "A source",
    "snippet": "Native search snippet",
    "url": "https://example.com/source"
  }],
  "total_results": 1,
  "page": 0
}
```

Native domain lists use comma-separated hostnames and avoid rewriting the query with `site:` operators. [Search examples](https://docs.tinyfish.ai/search-api/examples). The adapter applies a **local SDK policy of 100 domains per list**. This is deliberately conservative and is **not a verified TinyFish native maximum**. Its capability numbers describe what this adapter accepts.

## Filtering and preflight

Context documents an allowlist and blocklist; restrictive filters can reduce result count. [Filter results](https://docs.context.dev/search/filters). Both adapters forward normalized hostnames to native filters without client-side filtering, reranking or deduplication. Their reviewed docs do not explicitly settle root-domain versus subdomain matching; do not promise exact-host matching, root/subdomain overlap precedence, or exclusion precedence beyond provider-native behavior. Identical normalized hosts in both lists remain an SDK `invalid_request`.

The orchestrator checks every provider's domain capacity before dispatch. Context also declares the new optional `capabilities.maxQueryLength: 500`; chain-wide preflight rejects larger queries with `unsupported_option`, even if Context is only a fallback. The SDK measures this conservatively in UTF-16 code units. Existing custom providers may omit the property; a supplied value must be a positive integer. No new global query limit applies to other providers. This addition prevents a known native limit from being discovered only after a paid primary attempt.

Unknown request fields remain invalid, including pagination, freshness, purpose, location and extraction settings. Such provider options are not exposed by this alpha. Native transport/request constraints not published in the reviewed docs remain unverified.

## Shared behavior and validation

Both adapters reuse fixed endpoints, injected fetch, `redirect: 'error'`, status classification, safe result URL validation, secret-free errors and SDK-generated provenance timestamps. Every consumed result is validated before truncation. Unknown response fields are ignored; unconsumed provider metadata is not promoted into SDK claims.

Explicit fallback remains available for HTTP 429, HTTP 408/5xx, network failure and per-attempt timeout. HTTP 401/402/403, malformed JSON/schema and invalid result URLs are terminal. Empty results succeed without fallback. JSON parsing shares the total deadline, ignored transports cannot hold the SDK promise open, and caller cancellation prevents fallback. HTTP 402 remains `auth` under the existing account-authorization category; no error taxonomy change was made.

Validation on Node `v24.22.1`:

- `npm run build -w packages/sdk` passed.
- `npm test -w packages/sdk` passed: **112 tests**, including all original 71 and 41 adapter tests in `packages/sdk/test/priority-adapters.test.mjs`; runner concurrency is 1.
- New fixtures cover exact request mapping, native filters, boundary capacities, chain-wide query preflight, invalid request/configuration/response fields, unsafe URLs, validation beyond the output limit, absent/zero usage, partial warning, secret redaction, empty results, explicit cross-provider fallback, abort cleanup, total deadlines and attempt timeouts.
- Packed consumer validation checks all package subpaths and compiles TypeScript against the extracted tarball without installing dependencies.

Independent review round 1 found no material runtime mapping, fallback or cancellation defect after checking the official request/response references, search examples, content outcomes, filters and billing documentation. Review added regression coverage for TinyFish's illustrative total/page metadata, Context's per-result extraction failures and empty partial collections, and HTTP 408/500 fallback for both adapters. The count ceiling, omitted TinyFish metadata and defaults, and Context partial-mode limitations are now explicit in this guide. The package build and all 112 tests were rerun locally on Node 24.22.1; packed validation above was reported by the implementer, not independently repeated in this round.

No version change, dependency installation, commit, push, deployment or paid API call belongs to this change. The main SDK guide and website include both adapters and their documented limitations.
