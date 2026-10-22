# Provider catalog

Reviewed 2026-10-22. searchSDK implements **fourteen normalized web-search
adapters and thirteen provider-native clients across fifteen providers**. Context.dev and TinyFish are
the priority integrations. WonderSearch.ai and WonderSearch.com are the same
corpus product, not an open-web adapter.

These are documentation-backed implementation claims. All checks use fixtures;
no authenticated live-provider behavior, billing, availability, or search quality
is claimed. Account-gated and private APIs remain subject to provider access.

| Provider | Normalized search | Provider-native surfaces | Reference |
| --- | --- | --- | --- |
| Context.dev | Descriptions, domain filters, reported credits | Search, scrape, crawl, parse, branding, logo links, batches, monitors, usage | [SDK reference](https://searchsdk.dev/docs/providers/context) · [Official search](https://docs.context.dev/api-reference/web-scraping/search) |
| TinyFish | Ranked web results, first page, native domain filters | Search, fetch, agents, browser sessions, research, monitors, profiles | [SDK reference](https://searchsdk.dev/docs/providers/tinyfish) · [Official docs](https://docs.tinyfish.ai/) |
| Exa | Ranked sources, highlights, native scores, USD usage | Search, contents, answers, research, agents, batches, monitors, Websets, management | [SDK reference](https://searchsdk.dev/docs/providers/exa) · [Official reference](https://exa.ai/docs/reference/search) |
| Tavily | Basic web search, native filters and credit usage | Search, extract, crawl, map, research, streaming, usage, scoped key helpers | [SDK reference](https://searchsdk.dev/docs/providers/tavily) · [Official reference](https://docs.tavily.com/documentation/api-reference/endpoint/search) |
| Brave | Web results and extra snippets | Web/image/video/news and other verticals, suggestions, LLM Context, answers, enrichment | [SDK reference](https://searchsdk.dev/docs/providers/brave) · [Official docs](https://api-dashboard.search.brave.com/app/documentation) |
| Perplexity | Search API sources, native domain modes | Sonar, Agent, embeddings, skills, decisions, models, analytics, orchestration, tokens | [SDK reference](https://searchsdk.dev/docs/providers/perplexity) · [Official schema](https://docs.perplexity.ai/openapi.json) |
| Parallel | Search excerpts and source policy | Search, extract, Tasks, Task Groups, FindAll, monitors, memory, Chat, Responses | [SDK reference](https://searchsdk.dev/docs/providers/parallel) · [Official schema](https://docs.parallel.ai/public-openapi.json) |
| Linkup | Search results with URL/name/content | Search, fetch, research, tasks, extraction, credits, published Responses/Rewind operations | [SDK reference](https://searchsdk.dev/docs/providers/linkup) · [Official schema](https://api.linkup.so/v1/openapi.json) |
| Firecrawl | Web sources, native filters, reported credits | Scrape, parse, crawl, map, extract, agents, monitors, interaction, usage and management | [SDK reference](https://searchsdk.dev/docs/providers/firecrawl) · [Official schema](https://docs.firecrawl.dev/api-reference/v2-openapi.json) |
| You.com | Web sources, snippets and search identity | Search, contents, answers, research, finance research, images, account balance | [SDK reference](https://searchsdk.dev/docs/providers/you) · [Official search](https://you.com/docs/api-reference/search/v1-search) |
| Serper | Organic Google web results and reported credits | Google verticals, batches, GET/POST variants, webpage scraping | [SDK reference](https://searchsdk.dev/docs/providers/serper) · [Official playground](https://serper.dev/playground) |
| SerpAPI | Synchronous Google organic results, one page | Parameterized engine gateway, output formats, archives, locations, account, upload, Extract | [SDK reference](https://searchsdk.dev/docs/providers/serpapi) · [Official search](https://serpapi.com/search-api) |
| Valyu | Web-only content snippets, relevance, reported USD usage; typed settings and raw JSON | No generated native client | [SDK reference](https://searchsdk.dev/docs/providers/valyu) · [Official search](https://docs.valyu.ai/api-reference/endpoint/search) |
| SearXNG | One JSON search page from an operator-selected HTTPS instance; raw JSON | No generated native client | [SDK reference](https://searchsdk.dev/docs/providers/searxng) · [Official Search API](https://docs.searxng.org/dev/search_api.html) |
| WonderSearch | Not a normalized web adapter | Corpus passages, access, content, uploads, ingestion, storage, usage and billing | [SDK reference](https://searchsdk.dev/docs/providers/wondersearch) · [Official search](https://docs.evokoa.com/wondersearch/reference/search-api) |

## What “coverage” means

A normalized adapter maps one tightly scoped web-search operation into
`SearchResponse`. It validates consumed result fields and preserves provider
order, source identity, and native usage. A provider-native client exposes named
methods and endpoint-specific static types while preserving the native response.
Generated types are not runtime response-schema validation.

The native operation inventory is published inside each SDK provider reference.
It separates HTTP operations, streaming variants, and helpers. A parameterized
SerpAPI engine gateway is not a claim that hundreds of engines are individually
typed and live-tested. Beta and organization-only endpoints may reject requests
without corresponding account access. Unsupported automatic payment negotiation,
legacy contracts, and signed-transfer boundaries are explicit in the references.

Hosted provider adapters use fixed service origins and explicit server credentials.
SearXNG uses an explicitly configured HTTPS instance and optional server-owned
reverse-proxy authentication headers; it has no standard search API key. The SDK
never follows a signed transfer URL with the provider key. Mutating operations
and job creation are not retried implicitly. Provider-required idempotency headers
remain caller-controlled; the SDK does not invent exactly-once guarantees.

## Priority search boundaries

Context requests at least ten native results because two official documents
disagree on the minimum. The SDK caps returned results locally; trimmed results
can still affect reported credits. Optional page content remains a native API
choice. Partial results produce a sanitized warning.

TinyFish normalized search uses page zero without an invented result-count
parameter. Its total/page metadata and browser automation are separate native
surfaces. Unknown usage remains unknown. Neither integration claims unlimited
free access or a guaranteed number of results.

## Additional normalized adapters

Valyu explicitly selects web search rather than the API's broader dataset search.
Its adapter accepts typed per-instance search settings and exposes `searchRaw`
for original JSON fields. It maps reported request USD usage without estimating
charges. Domain filters allow 100 hosts per list under conservative SDK policy.

SearXNG requires a trusted operator-selected HTTPS base URL. The instance must
have JSON output enabled; many public instances disable it. The adapter reads
one page and does not advertise domain filters or discover public instances.
Engine attribution and partial-engine details remain available through raw JSON.

Neither integration adds a generated provider-native client. Direct adapter
`searchRaw` calls require caller-owned cancellation and do not apply the
`createSearch` retry, cache, fallback, or deadline policy.

## Verification and comparisons

Source snapshots and deterministic generators are retained in the
repository. Runtime fixtures exercise request shape, validation, retries,
cancellation, streaming, and failure behavior. Independent reviews add regression
tests for discovered faults. Live conformance still needs provider credentials.

[Benchmarks](https://searchsdk.dev/benchmarks) are in development. No latency,
quality, cost, or availability rankings are published. The proposed methodology
separates task families and requires dated configurations, sample sizes, errors,
uncertainty, and funding disclosures.
