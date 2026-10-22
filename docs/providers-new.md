# Valyu and SearXNG search adapters

These adapters expose normalized web search through separate package imports.
They use documented APIs and synthetic contract tests. No live account or
instance verification has been performed, and no benchmark results are implied.

```ts
import { createSearch } from '@belweave/search-sdk';
import { valyu } from '@belweave/search-sdk/valyu';
import { searxng } from '@belweave/search-sdk/searxng';

const hosted = createSearch({
  provider: valyu({ apiKey: process.env.VALYU_API_KEY! }),
});
const response = await hosted.web.search({
  query: 'HTTP caching reference',
  limit: 5,
  includeDomains: ['developer.mozilla.org'],
});

const selfHosted = createSearch({
  provider: searxng({
    baseUrl: 'https://search.example.org',
    language: 'en',
    safeSearch: 1,
  }),
});
```

Run credential-bearing code on your server. The SearXNG URL above is an
illustrative operator-controlled instance, not a public service supplied by this
SDK.

## Exact coverage

| Provider ID / import | Implemented operation | Normalized fields | Deliberate limits |
| --- | --- | --- | --- |
| `valyu` / `/valyu` | One `POST https://api.valyu.ai/v1/search`, always `search_type: "web"`, `X-API-Key` auth | URL, title, `content` as snippet, native `relevance_score`, transaction ID as provenance request ID, `total_deduction_dollars` as USD usage | Standard 1–20 results; no proprietary datasets, news-only mode, strict dataset scope, extraction, answers, research jobs or native-client inventory |
| `searxng` / `/searxng` | One form-encoded `POST /search` on an explicitly configured HTTPS instance; `format=json`, `pageno=1`, default `categories=general` | URL, title, `content` as snippet, native `score`, SDK retrieval provenance | One page; no instance discovery, automatic pagination, universal API key, cost estimate or cross-engine domain-filter guarantee |

Scores remain provider-native and cannot be compared directly between these
providers. Both adapters cap normalized results to the requested limit; fewer or
zero results are valid. Neither fills a short response by issuing extra requests.

## Valyu settings

`valyu(options: ValyuOptions)` accepts `apiKey`, an optional injected `fetch`,
and an optional `search: ValyuSearchOptions` object. Settings are captured when
the provider is created; requests still supply their own query, result ceiling
and domain lists.

| Setting | Supported values / mapping |
| --- | --- |
| `maxPrice` | Finite positive number → `max_price`, passed in provider-native units. The SDK does not convert this request budget into USD. Consult current provider pricing before choosing it. |
| `relevanceThreshold` | Number from 0 through 1 → `relevance_threshold` |
| `responseLength` | `short`, `medium`, `large`, `max`, or a positive safe integer → `response_length`; the SDK response-byte cap still applies |
| `fastMode` | Boolean → `fast_mode`; Valyu documents that instructions are ignored in fast mode |
| `startDate`, `endDate` | Valid `YYYY-MM-DD` dates → `start_date`, `end_date`; start must not exceed end. Other native date formats and historical-cache modes are outside this adapter's coverage. |
| `instructions` | Nonblank string of up to 500 UTF-16 code units → `instructions` |

Normalized `includeDomains` and `excludeDomains` map to `included_sources` and
`excluded_sources`. Both lists may be supplied together. The limit of 100 unique
hostnames per list is an SDK policy, not a documented Valyu maximum. Dataset
identifiers, URLs, source presets and saved collections are outside these
normalized hostname filters.

Usage is the returned `total_deduction_dollars`, including zero. Missing usage
stays `null`; the SDK never estimates a bill from result count or request budget.
A successful response with a nonempty `error` warning or `warnings` list produces
a generic `provider_warning`, preserving usable results. A `success: false`
response raises a sanitized `provider_error`.

## SearXNG configuration

`searxng(options: SearxngOptions)` requires a trusted, operator-selected `baseUrl`.
It accepts an HTTPS origin with an optional base path: `https://host/prefix/`
dispatches to `https://host/prefix/search`. Credentials in URLs, query strings,
fragments, whitespace and backslashes are rejected. Configure the URL on your
server rather than accepting arbitrary user-selected endpoints.

Optional settings are `fetch`, `language`, `safeSearch: 0 | 1 | 2`,
`timeRange: "day" | "month" | "year"`, and `categories: readonly string[]`.
These map directly to the documented form fields. Category names depend on the
instance. Language, time-range and safe-search support depend on its configured
engines; setting them is not proof every engine applies them.

An optional `headers: Readonly<Record<string, string>>` supplies authentication
for an operator's reverse proxy, for example an `Authorization` header. SearXNG
does not define a standard search API key. Headers are captured at construction;
request-framing, cookie and format-override headers are rejected. No browser
cookie collection or automatic login is performed.

The instance must enable JSON under its `search.formats` settings. Many public
instances disable JSON and return HTTP 403, which the shared transport reports
as `auth` (authorization failure). This may indicate instance policy rather than
an incorrect credential. There is no automatic instance substitution.

Domain filters are rejected before dispatch. The SDK does not append `site:`
operators because support varies by engine. Caller-written query syntax is
preserved. Unresponsive engines produce a generic warning while usable rows
remain available. Empty results, including an all-engine failure with a warning,
do not trigger implicit fallback. Usage is always `null`.

## Raw response and transport contract

Both factories return a `SearchProvider` with an additional method:

```ts
const provider = valyu({ apiKey: process.env.VALYU_API_KEY! });
const raw = await provider.searchRaw({ query: 'HTTP caching reference', limit: 5 });
// raw.provider, raw.retrievedAt, raw.data
```

`searchRaw` makes a new request; it does not retrieve a previously normalized
response. Its `RawSearchResponse.data` is a `Readonly<Record<string, unknown>>`
containing the original parsed JSON after search-contract validation. Additional
provider fields are retained without claiming complete native response typing.
For Valyu this preserves source attribution, publication dates, per-result
prices and source warnings when returned. For SearXNG it preserves engine
attribution, dates, suggestions, answers and unresponsive-engine details when
returned. Raw arrays retain the received rows; the requested limit is an output
ceiling for normalized results. Unknown native fields remain untrusted data.

Both raw and normalized paths validate requests before dispatch and share the
existing JSON transport: 10 MiB decoded-response ceiling, 10-second direct-call
deadline, caller cancellation, redirect rejection and sanitized errors. A
provided `AbortSignal` can shorten the deadline. An injected fetch should return
a standard streaming `Response` to preserve byte-allocation bounds. The legacy
materialized JSON transport compatibility path can only check size after that
transport has allocated its object.

Use `createSearch` for explicit fallback, retry, concurrency, caching and
deduplication policies. Those policies do not apply automatically to
`searchRaw`. Retrying hosted searches can issue another billable request.

## Official references

- [Valyu Search reference](https://docs.valyu.ai/api-reference/endpoint/search): endpoint, authentication, request controls, source filtering, response fields and warnings.
- [Valyu official JavaScript SDK](https://github.com/valyuAI/valyu-js): a separate upstream client for operations outside this adapter's scope.
- [SearXNG Search API](https://docs.searxng.org/dev/search_api.html): form requests, JSON enablement and engine-dependent controls.
- [SearXNG JSON serializer](https://github.com/searxng/searxng/blob/master/searx/webutils.py): result and engine-health envelope.
- [SearXNG search handler](https://github.com/searxng/searxng/blob/master/searx/webapp.py): `/search` routing, JSON format restrictions and error envelopes.

The contract tests use synthetic documented-shape responses and injected
transports. They cover wire fields, hostile result URLs, malformed payloads,
usage, auth failures, rate limits, cancellation, response bounds, configuration
snapshots, raw metadata and direct-call preflight validation. They establish
SDK behavior against those fixtures, not live availability, account permissions
or engine coverage.
