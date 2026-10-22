# Provider surfaces B: contracts, coverage and limits

Reviewed **2026-10-22** against current official public documentation. This work
adds seven normalized web-search adapters and eight separate native clients.
WonderSearch is corpus retrieval; it does not implement `SearchProvider`.
No provider keys, authenticated requests, paid calls, ingestion, or live provider
verification were used. Fixtures verify SDK behavior against retained contracts.
They do not establish endpoint availability, search quality, billing correctness,
or universal compatibility.

## Entry points and method discovery

Normalized factories are `perplexity`, `parallel`, `linkup`, `firecrawl`, `you`,
`serper`, and `serpapi`. Import them from their provider subpaths. Native factories
are `createPerplexityClient`, `createParallelClient`, `createLinkupClient`,
`createFirecrawlClient`, `createYouClient`, `createSerperClient`,
`createSerpApiClient`, and `createWonderSearchClient`, from `native-<provider>`.
WonderSearch's provider subpath only re-exports its corpus client factory.

Native operations are named methods. Every method accepts endpoint-specific
`{ body, query, path, headers, signal, timeoutMs }` input, using only the fields
applicable to that endpoint. Multipart and byte uploads use `rawBody` instead of
`body`. Exported `*Body`, `*Query`, `*Path`, `*Headers`, `*Input`, and `*Response`
aliases expose the documented shapes where applicable. Shared native schemas
are namespaced to prevent collisions. Each client exposes a frozen `operations`
catalog; matching JSON catalogs are retained in
[`scripts/providers-b/catalogs`](../scripts/providers-b/catalogs).

```ts
import { createPerplexityClient } from '@belweave/search-sdk/native-perplexity';

const client = createPerplexityClient({ apiKey: process.env.PERPLEXITY_API_KEY! });
const response = await client.search({ body: { query: 'example', max_results: 3 } });
console.log(response.data.results); // provider-native result shape
console.log(response.metadata.status); // SDK transport metadata
```

Native methods return `{ data, metadata }`. JSON data is preserved, including
unknown fields, job IDs, citations, partial failures, decimal strings, and native
usage. Types are static contracts, **not runtime JSON Schema validation**.
The clients check required endpoint input containers/parameters and rely on the
shared bounded transport; normalized adapters separately validate every consumed
result before truncation. Native success data can contain provider error objects,
account details, generated API tokens, signed URLs, or credentials. Do not log
whole native responses by default. Transport errors discard provider-controlled
messages and never include credentials or request URLs.

See the [shared transport contract](native-transport-contract.md) for deadlines,
body caps, concurrency, cancellation, raw responses and retry semantics. Native
retries default off. Writes and job creation are not marked retryable. SSE methods
return `AsyncIterable<NativeSSEEvent>` and never replay/reconnect automatically.
An SSE event's `data` remains a string, including error and terminal events;
callers interpret each provider's event schema. Background operations return IDs;
there is no implicit polling or cancellation of the remote job when a local
request is aborted. Signed download/transfer URLs are returned for caller use;
the clients never follow them with API credentials.

## Normalized search

| Provider | Exact request and mapping | Preflight policy and scope |
| --- | --- | --- |
| Perplexity | `POST https://api.perplexity.ai/search`, Bearer auth; one `query`, `search_type: web`, `max_results`. Maps `results[].url/title/snippet` and response `id`. | Up to 20 domains in either include or exclude mode. Exclusions become minus-prefixed `search_domain_filter` entries. Both modes together are rejected before any fallback dispatch. No generated Agent/Sonar answer is mapped as a source result. |
| Parallel | `POST https://api.parallel.ai/v1/search`, `x-api-key`; `search_queries: [query]`, `mode: basic`, `advanced_settings.max_results`. Maps `excerpts` to highlights and `search_id` to provenance. | `advanced_settings.source_policy` provides native filters, up to 200 entries per list. Both lists together are rejected because include policy takes precedence over exclusions. No synthetic `objective`, rank score, or undocumented top-level count field. |
| Linkup | `POST https://api.linkup.so/v1/search`, Bearer auth; `q`, `depth: fast`, `outputType: searchResults`, `maxResults`, `includeImages: false`. Maps URL/name/content. | Includes: 100. Excludes: 50. Both lists can be supplied. Image rows are rejected rather than relabeled. `sourcedAnswer` and `structured` stay native. |
| Firecrawl | `POST https://api.firecrawl.dev/v2/search`, Bearer auth; explicit web source, `limit`, `highlights: false`. Requires `success: true`; maps `data.web[].url/title/description`, `id`, reported integer `creditsUsed`, and a sanitized warning. | Query ceiling: 500 UTF-16 code units. Native include/exclude filters are mutually exclusive. Each list has a conservative SDK limit of 100 because the current schema publishes no list maximum. No scraping or image/news/tool flattening is enabled. |
| You | `POST https://ydc-index.io/v1/search`, `X-API-Key`; `query`, `count`, no extraction. Maps `results.web`, description or joined keyword snippets, and `metadata.search_uuid`. | Includes: 500. Excludes: 5,000. Both modes together are rejected. News-only classification yields an empty web result set; news and knowledge are never relabeled. Keyword snippets are not reported as provider highlights. |
| Serper | `POST https://google.serper.dev/search`, `X-API-KEY`; `q`, `num`. Maps `organic[].link/title/snippet`, plus reported credits. | Native structured include/exclude filters are not documented for this surface, so both SDK filter options are rejected. The query is never rewritten with `site:` operators. |
| SerpAPI | Synchronous `GET https://serpapi.com/search.json`, `engine=google`, `q`, server-side `api_key`. Maps organic results only after metadata status is `Success`; accepts the narrowly documented no-match diagnostic as empty success. | One page only, with output capped locally. The current Google reference does not document `num`; no count parameter or automatic paid pagination is invented. Domain filters are unsupported. Queued/processing/error responses cannot become normalized web success. |

Unknown normalized usage remains `null`; prices are not inferred from marketing
or fixture counts. SerpAPI/Serper positions are not relevance scores. Normalized
provenance is created by the SDK, not copied from provider-controlled fields.

Official search/filter sources:
[Perplexity search](https://docs.perplexity.ai/api-reference/search-post),
[Perplexity domain modes](https://docs.perplexity.ai/docs/search/filters/domain-filter),
[Parallel search](https://docs.parallel.ai/api-reference/search/search),
[Parallel advanced settings](https://docs.parallel.ai/search/advanced-search-settings),
[Linkup search](https://docs.linkup.so/pages/documentation/endpoints/search/reference),
[Linkup source filtering](https://docs.linkup.so/pages/documentation/tutorials/filtering),
[Firecrawl v2 specification](https://docs.firecrawl.dev/api-reference/v2-openapi.json),
[You Web Search specification](https://you.com/docs/openapi/web-search.json),
[Serper public examples](https://serper.dev/),
[Serper official playground](https://serper.dev/playground), and
[SerpAPI Google reference](https://serpapi.com/search-api).

## Native coverage and counting

The counts below distinguish HTTP operations from convenience methods and output
variants. They are inventory counts, not independent live checks for every
operation. SerpAPI's parameterized engine gateway represents many engines; the
SDK does not claim each engine's complete schema or behavior was individually
implemented or tested.

| Client | Implemented scope | Count and evidence boundary |
| --- | --- | --- |
| Perplexity | Search; Sonar chat/async create/list/get; Agent create/retrieve/cancel and files; standard/contextualized embeddings; Decisions; skills create/read/update/delete/revisions/download URL; models; organization analytics v1/v2; Orchestrator chat/responses/messages/models; token generation/revocation. | 30 documented HTTP operations, 35 named methods including five streaming variants. The core OpenAPI and seven endpoint-specific YAML schemas are pinned. |
| Parallel | Web/image search; extract; Tasks and Task Groups including input/result/events; FindAll ingest/entity search/create/status/cancel/enrich/events/extend/result/schema; monitors create/list/stats/read/cancel/events/trigger/update; memory clear/evict/retrieve; Chat and Responses. | 37 documented HTTP operations, 39 named methods including JSON/SSE variants. Beta paths and optional `parallel-beta` values remain explicit. |
| Linkup | Search, fetch, research create/list/get, tasks create/list/get, closed-beta extract create/list/get, credit balance; published-schema Responses and Rewind search/fetch. | 15 operations. The additional Responses/Rewind paths are present in the published OpenAPI even though the general documentation index does not provide a corresponding full guide. Availability is unverified. |
| Firecrawl | Search; scrape/status; scrape interaction; parse/formats; batch scrape/status/cancel/errors; crawl/status/cancel/errors/active/parameter preview; map; extract/status; agents list/create/status/cancel/trace/snapshots; monitors CRUD/run/checks; interact session create/list/execute/delete; credit/token usage and history; queue/activity; feedback; support agent/docs; papers/developer/government search; threat-protection policy read/update. | 57 operations from the current v2 specification. Native beta, enterprise, access-gated, and account-dependent behavior remains provider-controlled. |
| You | Search, contents, answer, research create/status/stream, finance research, account balance, images. | Nine operations across seven official specifications. Search/contents use `ydc-index.io`; the other APIs use `api.you.com`. All seven current specs explicitly use `X-API-Key`, including billing. Billing balance remains native cents. |
| Serper | Google search, images, videos, places, maps, reviews, news, shopping, scholar, patents, autocomplete, Lens; webpage scraping. Google methods accept the documented batch-array form and offer GET counterparts. | 13 public endpoint families, 26 named methods: 12 Google POST/GET pairs plus scrape POST/GET. Public response examples are incomplete; unknown fields remain intact. Scrape's native response is deliberately open because no complete public response schema was obtained. |
| SerpAPI | Engine gateway JSON/HTML/Markdown, explicit Google helper, Pixel Position, saved-search JSON/HTML/Pixel Position, locations, account, multipart image upload, typed Extract engine including scrape/map/crawl. | Seven endpoint families, ten wire catalog entries, 13 named methods including engine/output helpers. Engine-specific parameters use their exact native scalar names through a typed common query plus extension fields. This is not hundreds of independently typed/tested engine adapters. |
| WonderSearch | Corpus search and passage snapshots/capabilities; account bootstrap/me; organizations/workspaces/members/invitations/API keys/overview/usage; drives/folders/documents/defaults/context; upload prepare/status/proxy bytes/transfer/complete/batches/capabilities; ingestion operations/metrics; enabled-only bulk imports/chunks/recovery; billing limits/usage/wallet/activity/purchases/invoices/portal/auto-topup; workspace storage quotes/changes. | 89 documented method/path operations, plus six raw read helpers to obtain response ETags: 95 methods. Derived from the official endpoint tables and retained prose. Own-corpus retrieval only. |

### Perplexity sources and special cases

The [current core OpenAPI](https://docs.perplexity.ai/openapi.json) explicitly
uses `/v1/sonar`, `/v1/async/sonar`, `/v1/agent`, `/v1/skills`, `/v1/decisions`,
and `/v1/analytics/computer/usage` / `/v2/analytics/computer/usage`.
Agent responses can run in background mode and deliver files. The separate
[skill download operation](https://docs.perplexity.ai/api-reference/skills-download-get)
returns JSON containing a short-lived bundle URL; it is not the ZIP bytes.
Agent file content is bytes. Skill create/update use multipart `file`.

The [Orchestrator chat](https://docs.perplexity.ai/api-reference/gateway-chat-completions-post),
[Responses](https://docs.perplexity.ai/api-reference/gateway-responses-post),
[Messages](https://docs.perplexity.ai/api-reference/gateway-messages-post),
[model list](https://docs.perplexity.ai/api-reference/gateway-models-get), and
[model read](https://docs.perplexity.ai/api-reference/gateway-model-get) references
provide their own schemas and `/router/v1/*` paths. Model IDs with slashes are
passed as one encoded path value, not concatenated unescaped.

[Generate Auth Token](https://docs.perplexity.ai/api-reference/generate-auth-token-post)
and [Revoke Auth Token](https://docs.perplexity.ai/api-reference/revoke-auth-token-post)
are documented at `/generate_auth_token` and `/revoke_auth_token`. The latter
specifies empty HTTP 200: the client reads only that endpoint as text, requires
an empty body, and returns `data: null`. Shared JSON validation is unchanged.

Skills, analytics, token management, particular model access and background/file
features can require account/project/organization privileges. An organization
analytics key is distinct from ordinary search access; instantiate a client with
the appropriate credential. Older SDK browser APIs and earlier response routes
were not invented from old examples where no current complete contract appeared
in the reviewed public schema/index.

### Parallel sources and special cases

The [published specification](https://docs.parallel.ai/public-openapi.json) is the
source for every method/path. The [documentation index](https://docs.parallel.ai/llms.txt)
also links [Tasks](https://docs.parallel.ai/task-api/guides/execute-task-run),
[Task Groups](https://docs.parallel.ai/task-api/group-api),
[FindAll](https://docs.parallel.ai/findall-api/findall-quickstart),
[Monitor](https://docs.parallel.ai/monitor-api/monitor-quickstart), and
[Responses](https://docs.parallel.ai/responses-api/responses-quickstart).

FindAll, memory and Chat retain their documented beta paths. Optional
`parallel-beta: null` is omitted from wire headers rather than serialized as
`"null"`. Events and streamed group runs are SSE; task results are explicit reads,
which can block server-side and still obey the caller's SDK deadline. Normalized
search uses current `advanced_settings`, not a fabricated legacy request.

### Linkup sources and special cases

The [official OpenAPI](https://api.linkup.so/v1/openapi.json) supplies all 15
operations. Public descriptions explain [search](https://docs.linkup.so/pages/documentation/endpoints/search/overview),
[fetch](https://docs.linkup.so/pages/documentation/endpoints/fetch/overview),
[research](https://docs.linkup.so/pages/documentation/endpoints/research/overview),
[tasks](https://docs.linkup.so/pages/documentation/endpoints/tasks/overview), and
[extract](https://docs.linkup.so/pages/documentation/endpoints/extract/overview).
Extract is explicitly **closed beta**. Research/tasks/extract have separate
create/list/get methods; jobs are not automatically polled. Tasks take a JSON
array, not an invented `{inputs: ...}` envelope. Research uses `q` and
`outputType`, not `question`. Search depth includes `flash`, `fast`, `standard`,
and `deep`; availability of flash and the OpenAPI-only Rewind/Responses surfaces
must be checked with the provider for the relevant account. Where overview prose
and the complete schema differ about HTTP method, this client pins the schema's
POST operations rather than guessing an additional GET contract.

### Firecrawl sources and special cases

The [official v2 specification](https://docs.firecrawl.dev/api-reference/v2-openapi.json)
was downloaded directly; it contains the operation inventory above. The
[documentation index](https://docs.firecrawl.dev/llms.txt) and
[advanced guide](https://docs.firecrawl.dev/advanced-scraping-guide) describe
scrape, search, map, crawl, batches and agent interactions. No v1 `data[]` search
layout is silently mixed into normalized v2 `data.web`.

`parseFile` takes FormData, and the shared transport serializes its actual
boundary. Interact and scrape-associated interaction remain distinct APIs.
Enterprise threat protection, retained usage/activity, monitoring, agent features,
research/developer/government indexes, support features, Alexandria/tool sources,
and account policy can have access restrictions. The schema describes Alexandria
as requiring enabled team access; native data is preserved without pretending
that a discovered tool is an ordinary web result. Native methods do not follow
returned pagination URLs with credentials.

### You sources and special cases

The official [spec index](https://you.com/docs/openapi.json) links all seven current
specifications: [Web Search](https://you.com/docs/openapi/web-search.json),
[Contents](https://you.com/docs/openapi/contents.json),
[Answer](https://you.com/docs/openapi/answer.json),
[Research](https://you.com/docs/openapi/research.json),
[Finance Research](https://you.com/docs/openapi/finance-research.json),
[Billing](https://you.com/docs/openapi/billing.json), and
[Images](https://you.com/docs/openapi/images.json).
Research's background task status and stream paths are explicit. Finance research
is separate from general research. Native source controls, output schemas,
extraction, knowledge, news, citations and billing data are not collapsed into
normalized web results. The search overview acknowledges legacy GET support,
but its current complete specification documents POST only; no incomplete legacy
GET parameter contract is asserted by this client. Account scope and licensed
knowledge/finance availability remain provider-controlled.

### Serper sources and evidence limits

The [public homepage](https://serper.dev/) exposes category result examples.
The [official playground](https://serper.dev/playground) loads a public code
snippet generator. Its retained request serializer and current public category
list establish exact POST endpoints, `X-API-KEY`, optional GET `apiKey`, body
fields, batch arrays, and `https://scrape.serper.dev/` for webpage extraction.
The source bundle URL/hash is recorded in the provenance manifest; only the
public request-generation excerpt is retained, not account data or internal
routes. This is public shipped UI evidence, not an authenticated API test.

Public request schema/detail is thinner than the other providers. There is no
claimed account-management API, long-running job API, research agent API, or
native structured domain filter. The shipped UI also references internal or
allowlisted Product Reviews, Maps Autocomplete, Search Full, Search + Scrape,
and Bing variants. These are **not implemented or advertised as supported**:
no complete public contract/account entitlement was available. No internal
account IDs, user records, or unofficial endpoint guesses are used.

### SerpAPI sources and engine boundary

The official [error guide](https://www.serpapi.com/blog/fix-serpapi-errors-guide/)
(April 30, 2026; reviewed October 22) documents a Google no-match response with
`status: Success`, numeric `total_results: 0`, state `Fully empty`, and the exact
diagnostic `Google hasn't returned any results for this query.` The normalized
adapter accepts only that combination with absent or empty organic rows, returning
an empty successful search without fallback. Other diagnostics, contradictory or
malformed rows, invalid metadata, and non-success statuses retain their errors.
This adapter is handwritten; native clients and their generators are unchanged.

The [Google/engine gateway reference](https://serpapi.com/search-api),
[Search Archive](https://serpapi.com/search-archive-api),
[Locations](https://serpapi.com/locations-api),
[Account](https://serpapi.com/account-api),
[Image upload](https://serpapi.com/image-api),
[Pixel Position](https://serpapi.com/pixel-position-api), and
[Extract](https://serpapi.com/extract-api) pin the implemented endpoint families.

`search` accepts an explicit `engine` and preserves its native output; common
fields are typed while engine-specific parameters stay named scalar extensions.
HTML/Markdown have separate methods so non-JSON output cannot be accidentally
parsed as JSON. `async: true` submissions require saved-search reads; there is no
hidden polling. `async` and `no_cache` together are rejected. Credentials are
injected after query construction and cannot be replaced by `api_key` input.
Locations are unauthenticated; image upload clones caller FormData and inserts
its protected `api_key` form field. Extract types include documented `mode`,
`max_pages`, `max_depth`, sitemap/subdomain controls and content filters.

There is no per-engine claim for the hundreds of Google/other-engine verticals,
engine-specific result schemas, feature entitlements, or image expiry/live
availability. Those remain the caller's responsibility against each engine's
reference. Pixel Position is documented for Google Search/Ads, not every engine.
The native account response may return the account's key; response preservation
does not mean that field is safe to print.

### WonderSearch sources and corpus boundary

Official [authentication](https://docs.evokoa.com/wondersearch/reference/authentication)
sets the API base URL to `https://api.wondersearch.ai`. The
[search/passage](https://docs.evokoa.com/wondersearch/reference/search-api),
[access](https://docs.evokoa.com/wondersearch/reference/access-api),
[content](https://docs.evokoa.com/wondersearch/reference/content-api),
[uploads](https://docs.evokoa.com/wondersearch/reference/uploads-api),
[usage/billing](https://docs.evokoa.com/wondersearch/reference/usage-and-billing-api),
and [limits](https://docs.evokoa.com/wondersearch/reference/limits) pages were read
directly over public HTTPS after some web-reader fetches failed. Extracted tables,
relevant prose, official URLs and original HTML hashes are retained.

Corpus search returns up to ten results, one passage per document by default.
Deprecated `limit`/`model` fields are not invented as working output controls.
Queries use `query`, optional effort/folder/degradation/grouping/timeout controls,
and mandatory caller-provided `Idempotency-Key`. Results retain document/revision/
passage/row IDs, text offsets, metadata, effort notices, warnings and exact USD
cost strings. Passage reads require a matching `index_snapshot_id`; obtain and
retain the appropriate drive snapshot and source revision rather than building
fake web URLs.

Raw read helpers expose response ETags for `If-Match` updates. Upload-content
bytes use `application/octet-stream`; source downloads return bytes. Direct
transfers and import chunk uploads return signed destinations for caller handling;
there is no generic authenticated arbitrary-URL fetch. Import chunk binary
assembly is not implemented. Chunk declaration/acknowledgement/seal/recover/close/
retry are direct API methods, not a durable ingestion engine. Imports require
enabled organization access and can return 404/maintenance errors. Text/file
readiness and publication require explicit operation/status checks.

Management and billing require authorized user roles; a workspace Search Only
key does not grant organization administration. Payment/checkout/portal routes
are typed native requests only: no payments were initiated. Deprecated
`/billing/subscription` aliases are mentioned without a full enumerated route
contract in the source, so no additional guessed aliases were generated. MCP,
OAuth browser sign-in, CLI workflows, and external signed transfers are not
represented as invented REST endpoints.

## Reproducibility and validation

[`scripts/providers-b/README.md`](../scripts/providers-b/README.md) explains the
standard-library-only regeneration commands and source handling.
[`provenance.json`](../scripts/providers-b/provenance.json) records 29 public source
snapshots and SHA-256 identities. Original public OpenAPI snapshots are retained;
WonderSearch/Serper additionally retain clearly labeled derived schemas.
`native-serpapi.ts` and normalized adapters are hand-maintained.

The new fixture suites are
[`expanded-search.test.mjs`](../packages/sdk/test/expanded-search.test.mjs) and
[`provider-native-b.test.mjs`](../packages/sdk/test/provider-native-b.test.mjs).
They independently pin representative wire contracts, preserve unknown native
response fields, test auth and safe errors, reject malformed normalized rows,
exercise chain-wide filter preflight, check multipart serialization, stream
variants, snapshot/idempotency/version headers, and verify deadlines and aborts.
The suites are not generated from the same operation catalogs they verify.

Native response declarations deliberately preserve provider-native optionality.
Where a provider leaves a field or management response unspecified, the SDK keeps
it open/unknown rather than fabricating a schema. Full per-field runtime native
validation, authenticated availability, paid billing behavior, every engine's
response variant, real ingestion recovery, and live retrieval relevance remain
unverified. The package is an alpha; these additions do not change its
publication or deployment status.

## Exact native operation catalog

The tables below are generated inventory documentation. Output/stream/raw helpers
are labeled separately from new HTTP surface area. Read/write semantics and
request aliases are available next to each method in its module.

### Perplexity

| Method | HTTP contract | Output |
| --- | --- | --- |
| `chatCompletions` | `POST /v1/sonar` | json |
| `chatCompletionsStream` | `POST /v1/sonar` | sse |
| `search` | `POST /search` | json |
| `createEmbeddings` | `POST /v1/embeddings` | json |
| `createContextualizedEmbeddings` | `POST /v1/contextualizedembeddings` | json |
| `getAsyncChatCompletion` | `GET /v1/async/sonar/{api_request}` | json |
| `listAsyncChatCompletions` | `GET /v1/async/sonar` | json |
| `createAsyncChatCompletion` | `POST /v1/async/sonar` | json |
| `createAgent` | `POST /v1/agent` | json |
| `createAgentStream` | `POST /v1/agent` | sse |
| `retrieveAgent` | `GET /v1/agent/{id}` | json |
| `listAgentFiles` | `GET /v1/agent/{id}/files` | json |
| `downloadAgentFile` | `GET /v1/agent/{id}/files/{file_id}/content` | bytes |
| `cancelAgentResponse` | `POST /v1/agent/{id}/cancel` | json |
| `listModels` | `GET /v1/models` | json |
| `getComputerUsageAnalytics` | `GET /v1/analytics/computer/usage` | json |
| `getComputerUsageAnalyticsV2` | `GET /v2/analytics/computer/usage` | json |
| `listSkills` | `GET /v1/skills` | json |
| `createSkill` | `POST /v1/skills` | json |
| `getSkill` | `GET /v1/skills/{skill_id}` | json |
| `updateSkill` | `PUT /v1/skills/{skill_id}` | json |
| `deleteSkill` | `DELETE /v1/skills/{skill_id}` | json |
| `listSkillRevisions` | `GET /v1/skills/{skill_id}/revisions` | json |
| `downloadSkill` | `GET /v1/skills/{skill_id}/download` | json |
| `answerQuestions` | `POST /v1/decisions` | json |
| `routerChatCompletions` | `POST /router/v1/chat/completions` | json |
| `routerChatCompletionsStream` | `POST /router/v1/chat/completions` | sse |
| `routerResponses` | `POST /router/v1/responses` | json |
| `routerResponsesStream` | `POST /router/v1/responses` | sse |
| `routerMessages` | `POST /router/v1/messages` | json |
| `routerMessagesStream` | `POST /router/v1/messages` | sse |
| `listRouterModels` | `GET /router/v1/models` | json |
| `getRouterModel` | `GET /router/v1/models/{model}` | json |
| `generateAuthToken` | `POST /generate_auth_token` | json |
| `revokeAuthToken` | `POST /revoke_auth_token` | text |

### Parallel

| Method | HTTP contract | Output |
| --- | --- | --- |
| `search` | `POST /v1/search` | json |
| `imageSearch` | `POST /v1/images/search` | json |
| `extract` | `POST /v1/extract` | json |
| `createTaskGroup` | `POST /v1/tasks/groups` | json |
| `retrieveTaskGroup` | `GET /v1/tasks/groups/{taskgroup_id}` | json |
| `streamTaskGroupEvents` | `GET /v1/tasks/groups/{taskgroup_id}/events` | sse |
| `addRunsToTaskGroup` | `POST /v1/tasks/groups/{taskgroup_id}/runs` | json |
| `fetchTaskGroupRuns` | `GET /v1/tasks/groups/{taskgroup_id}/runs` | sse |
| `retrieveTaskGroupRun` | `GET /v1/tasks/groups/{taskgroup_id}/runs/{run_id}` | json |
| `createTaskRun` | `POST /v1/tasks/runs` | json |
| `retrieveTaskRun` | `GET /v1/tasks/runs/{run_id}` | json |
| `streamTaskRunEvents` | `GET /v1/tasks/runs/{run_id}/events` | sse |
| `retrieveTaskRunInput` | `GET /v1/tasks/runs/{run_id}/input` | json |
| `retrieveTaskRunResult` | `GET /v1/tasks/runs/{run_id}/result` | json |
| `fastEntitySearch` | `POST /v1beta/findall/entity-search` | json |
| `ingestFindAllRun` | `POST /v1beta/findall/ingest` | json |
| `createFindAllRun` | `POST /v1beta/findall/runs` | json |
| `retrieveFindAllRunStatus` | `GET /v1beta/findall/runs/{findall_id}` | json |
| `cancelFindAllRun` | `POST /v1beta/findall/runs/{findall_id}/cancel` | json |
| `addEnrichmentToFindAllRun` | `POST /v1beta/findall/runs/{findall_id}/enrich` | json |
| `streamFindAllEvents` | `GET /v1beta/findall/runs/{findall_id}/events` | sse |
| `extendFindAllRun` | `POST /v1beta/findall/runs/{findall_id}/extend` | json |
| `findAllRunResult` | `GET /v1beta/findall/runs/{findall_id}/result` | json |
| `getFindAllRunSchema` | `GET /v1beta/findall/runs/{findall_id}/schema` | json |
| `createMonitor` | `POST /v1/monitors` | json |
| `listMonitors` | `GET /v1/monitors` | json |
| `monitorStats` | `GET /v1/monitors/stats` | json |
| `retrieveMonitor` | `GET /v1/monitors/{monitor_id}` | json |
| `cancelMonitor` | `POST /v1/monitors/{monitor_id}/cancel` | json |
| `listMonitorEvents` | `GET /v1/monitors/{monitor_id}/events` | json |
| `triggerMonitorRun` | `POST /v1/monitors/{monitor_id}/trigger` | json |
| `updateMonitor` | `POST /v1/monitors/{monitor_id}/update` | json |
| `clearMemory` | `POST /v1beta/memory/clear` | json |
| `evictFromMemory` | `POST /v1beta/memory/evict` | json |
| `retrieveMemory` | `POST /v1beta/memory/retrieve` | json |
| `chatCompletions` | `POST /v1beta/chat/completions` | json |
| `chatCompletionsStream` | `POST /v1beta/chat/completions` | sse |
| `createResponse` | `POST /v1/responses` | json |
| `createResponseStream` | `POST /v1/responses` | sse |

### Linkup

| Method | HTTP contract | Output |
| --- | --- | --- |
| `balance` | `GET /v1/credits/balance` | json |
| `createExtract` | `POST /v1/extract` | json |
| `listExtract` | `GET /v1/extract` | json |
| `getExtract` | `GET /v1/extract/{id}` | json |
| `fetchPage` | `POST /v1/fetch` | json |
| `search` | `POST /v1/search` | json |
| `createTasks` | `POST /v1/tasks` | json |
| `listTasks` | `GET /v1/tasks` | json |
| `getTask` | `GET /v1/tasks/{id}` | json |
| `responses` | `POST /v1/responses` | json |
| `createResearch` | `POST /v1/research` | json |
| `listResearch` | `GET /v1/research` | json |
| `getResearch` | `GET /v1/research/{id}` | json |
| `rewindSearch` | `POST /v1/rewind/search` | json |
| `rewindFetch` | `POST /v1/rewind/fetch` | json |

### Firecrawl

| Method | HTTP contract | Output |
| --- | --- | --- |
| `createMonitor` | `POST /monitor` | json |
| `listMonitors` | `GET /monitor` | json |
| `getMonitor` | `GET /monitor/{monitorId}` | json |
| `updateMonitor` | `PATCH /monitor/{monitorId}` | json |
| `deleteMonitor` | `DELETE /monitor/{monitorId}` | json |
| `runMonitor` | `POST /monitor/{monitorId}/run` | json |
| `listMonitorChecks` | `GET /monitor/{monitorId}/checks` | json |
| `getMonitorCheck` | `GET /monitor/{monitorId}/checks/{checkId}` | json |
| `scrape` | `POST /scrape` | json |
| `interactWithScrapeBrowserSession` | `POST /scrape/{jobId}/interact` | json |
| `stopInteractiveScrapeBrowserSession` | `DELETE /scrape/{jobId}/interact` | json |
| `parseFile` | `POST /parse` | json |
| `getParseFormats` | `GET /parse/formats` | json |
| `batchScrape` | `POST /batch/scrape` | json |
| `getBatchScrapeStatus` | `GET /batch/scrape/{id}` | json |
| `cancelBatchScrape` | `DELETE /batch/scrape/{id}` | json |
| `getBatchScrapeErrors` | `GET /batch/scrape/{id}/errors` | json |
| `getCrawlStatus` | `GET /crawl/{id}` | json |
| `cancelCrawl` | `DELETE /crawl/{id}` | json |
| `getCrawlErrors` | `GET /crawl/{id}/errors` | json |
| `crawl` | `POST /crawl` | json |
| `crawlParamsPreview` | `POST /crawl/params-preview` | json |
| `map` | `POST /map` | json |
| `extract` | `POST /extract` | json |
| `getExtractStatus` | `GET /extract/{id}` | json |
| `listAgents` | `GET /agent` | json |
| `startAgent` | `POST /agent` | json |
| `getAgentStatus` | `GET /agent/{jobId}` | json |
| `cancelAgent` | `DELETE /agent/{jobId}` | json |
| `getAgentTrace` | `GET /agent/{jobId}/trace` | json |
| `getAgentSnapshot` | `GET /agent/{jobId}/snapshots/{snapshotId}` | json |
| `getActiveCrawls` | `GET /crawl/active` | json |
| `getCreditUsage` | `GET /team/credit-usage` | json |
| `getHistoricalCreditUsage` | `GET /team/credit-usage/historical` | json |
| `getTokenUsage` | `GET /team/token-usage` | json |
| `getHistoricalTokenUsage` | `GET /team/token-usage/historical` | json |
| `getQueueStatus` | `GET /team/queue-status` | json |
| `getActivity` | `GET /team/activity` | json |
| `search` | `POST /search` | json |
| `createBrowserSession` | `POST /interact` | json |
| `listBrowserSessions` | `GET /interact` | json |
| `executeBrowserCode` | `POST /interact/{sessionId}/execute` | json |
| `deleteBrowserSession` | `DELETE /interact/{sessionId}` | json |
| `getScrapeStatus` | `GET /scrape/{jobId}` | json |
| `submitSearchFeedback` | `POST /search/{jobId}/feedback` | json |
| `askSupportAgent` | `POST /support/ask` | json |
| `searchSupportDocs` | `POST /support/docs-search` | json |
| `researchSearchPapers` | `GET /search/research/papers` | json |
| `researchGetPaper` | `GET /search/research/papers/{id}` | json |
| `researchRelatedPapers` | `GET /search/research/papers/{id}/similar` | json |
| `developerSearch` | `GET /search/developer` | json |
| `developerSearchPost` | `POST /search/developer` | json |
| `govSearch` | `GET /search/gov` | json |
| `govSearchPost` | `POST /search/gov` | json |
| `submitEndpointFeedback` | `POST /feedback` | json |
| `getThreatProtection` | `GET /team/threat-protection` | json |
| `updateThreatProtection` | `PUT /team/threat-protection` | json |

### You.com

| Method | HTTP contract | Output |
| --- | --- | --- |
| `search` | `POST /v1/search` | json |
| `contents` | `POST /v1/contents` | json |
| `answer` | `POST /v1/answer` | json |
| `research` | `POST /v1/research` | json |
| `getResearchTask` | `GET /v1/research/{task_id}` | json |
| `streamResearchTask` | `GET /v1/research/{task_id}/stream` | sse |
| `financeResearch` | `POST /v1/finance_research` | json |
| `getAccountBalance` | `GET /v1/billing/account_balance` | json |
| `images` | `GET /v1/images` | json |

### Serper

| Method | HTTP contract | Output |
| --- | --- | --- |
| `search` | `POST /search` | json |
| `searchGet` | `GET /search` | json |
| `images` | `POST /images` | json |
| `imagesGet` | `GET /images` | json |
| `videos` | `POST /videos` | json |
| `videosGet` | `GET /videos` | json |
| `places` | `POST /places` | json |
| `placesGet` | `GET /places` | json |
| `maps` | `POST /maps` | json |
| `mapsGet` | `GET /maps` | json |
| `reviews` | `POST /reviews` | json |
| `reviewsGet` | `GET /reviews` | json |
| `news` | `POST /news` | json |
| `newsGet` | `GET /news` | json |
| `shopping` | `POST /shopping` | json |
| `shoppingGet` | `GET /shopping` | json |
| `scholar` | `POST /scholar` | json |
| `scholarGet` | `GET /scholar` | json |
| `patents` | `POST /patents` | json |
| `patentsGet` | `GET /patents` | json |
| `autocomplete` | `POST /autocomplete` | json |
| `autocompleteGet` | `GET /autocomplete` | json |
| `lens` | `POST /lens` | json |
| `lensGet` | `GET /lens` | json |
| `scrape` | `POST /` | json |
| `scrapeGet` | `GET /` | json |

### SerpAPI

| Method | HTTP contract | Output |
| --- | --- | --- |
| `search` | `GET /search.json` | json |
| `searchHtml` | `GET /search.html` | text |
| `searchMarkdown` | `GET /search.md` | text |
| `searchPixelPositions` | `GET /search.json_with_pixel_position` | json |
| `getSearch` | `GET /searches/{search_id}.json` | json |
| `getSearchHtml` | `GET /searches/{search_id}.html` | text |
| `getSearchPixelPositions` | `GET /searches/{search_id}.json_with_pixel_position` | json |
| `locations` | `GET /locations.json` | json |
| `account` | `GET /account.json` | json |
| `uploadImage` | `POST /image` | json |
| `google` | `GET /search.json` | json (helper for `search`) |
| `extract` | `GET /search.json` | json (helper for `search`) |
| `extractMarkdown` | `GET /search.md` | text (helper for `searchMarkdown`) |

### WonderSearch

| Method | HTTP contract | Output |
| --- | --- | --- |
| `searchDrive` | `POST /v1/drives/{drive_id}/search` | json |
| `getPassage` | `GET /v1/drives/{drive_id}/passages/{passage_id}` | json |
| `getCapabilities` | `GET /v1/workspaces/{workspace_id}/capabilities` | json |
| `searchWorkspace` | `POST /v1/workspaces/{workspace_id}/search` | json |
| `bootstrapAccount` | `POST /v1/account/bootstrap` | json |
| `getMe` | `GET /v1/me` | json |
| `listOrganizations` | `GET /v1/organizations` | json |
| `getOrganization` | `GET /v1/organizations/{organization_id}` | json |
| `getOrganizationRaw` | `GET /v1/organizations/{organization_id}` | raw |
| `updateOrganization` | `PATCH /v1/organizations/{organization_id}` | json |
| `listOrganizationMembers` | `GET /v1/organizations/{organization_id}/members` | json |
| `updateOrganizationMember` | `PATCH /v1/organizations/{organization_id}/members/{user_id}` | json |
| `deleteOrganizationMember` | `DELETE /v1/organizations/{organization_id}/members/{user_id}` | json |
| `listOrganizationWorkspaces` | `GET /v1/organizations/{organization_id}/workspaces` | json |
| `createOrganizationWorkspace` | `POST /v1/organizations/{organization_id}/workspaces` | json |
| `getWorkspace` | `GET /v1/workspaces/{workspace_id}` | json |
| `getWorkspaceRaw` | `GET /v1/workspaces/{workspace_id}` | raw |
| `updateWorkspace` | `PATCH /v1/workspaces/{workspace_id}` | json |
| `listWorkspaceInheritedMembers` | `GET /v1/workspaces/{workspace_id}/inherited-members` | json |
| `listWorkspaceMembers` | `GET /v1/workspaces/{workspace_id}/members` | json |
| `createWorkspaceMember` | `POST /v1/workspaces/{workspace_id}/members` | json |
| `updateWorkspaceMember` | `PATCH /v1/workspaces/{workspace_id}/members/{user_id}` | json |
| `deleteWorkspaceMember` | `DELETE /v1/workspaces/{workspace_id}/members/{user_id}` | json |
| `listOrganizationInvitations` | `GET /v1/organizations/{organization_id}/invitations` | json |
| `createOrganizationInvitation` | `POST /v1/organizations/{organization_id}/invitations` | json |
| `getOrganizationInvitation` | `GET /v1/organizations/{organization_id}/invitations/{invitation_id}` | json |
| `getOrganizationInvitationRaw` | `GET /v1/organizations/{organization_id}/invitations/{invitation_id}` | raw |
| `deleteOrganizationInvitation` | `DELETE /v1/organizations/{organization_id}/invitations/{invitation_id}` | json |
| `resendOrganizationInvitation` | `POST /v1/organizations/{organization_id}/invitations/{invitation_id}/resend` | json |
| `previewInvitation` | `POST /v1/invitations/preview` | json |
| `acceptInvitation` | `POST /v1/invitations/accept` | json |
| `listWorkspaceApiKeys` | `GET /v1/workspaces/{workspace_id}/api-keys` | json |
| `createWorkspaceApiKey` | `POST /v1/workspaces/{workspace_id}/api-keys` | json |
| `deleteWorkspaceApiKey` | `DELETE /v1/workspaces/{workspace_id}/api-keys/{key_id}` | json |
| `getWorkspaceOverview` | `GET /v1/workspaces/{workspace_id}/overview` | json |
| `getOrganizationUsage` | `GET /v1/organizations/{organization_id}/usage` | json |
| `listWorkspaceDrives` | `GET /v1/workspaces/{workspace_id}/drives` | json |
| `createWorkspaceDrive` | `POST /v1/workspaces/{workspace_id}/drives` | json |
| `getDrive` | `GET /v1/drives/{drive_id}` | json |
| `getDriveRaw` | `GET /v1/drives/{drive_id}` | raw |
| `updateDrive` | `PATCH /v1/drives/{drive_id}` | json |
| `deleteDrive` | `DELETE /v1/drives/{drive_id}` | json |
| `listDriveFolders` | `GET /v1/drives/{drive_id}/folders` | json |
| `createDriveFolder` | `POST /v1/drives/{drive_id}/folders` | json |
| `getDriveFolder` | `GET /v1/drives/{drive_id}/folders/{folder_id}` | json |
| `getDriveFolderRaw` | `GET /v1/drives/{drive_id}/folders/{folder_id}` | raw |
| `updateDriveFolder` | `PATCH /v1/drives/{drive_id}/folders/{folder_id}` | json |
| `deleteDriveFolder` | `DELETE /v1/drives/{drive_id}/folders/{folder_id}` | json |
| `createDriveDocument` | `POST /v1/drives/{drive_id}/documents` | json |
| `listDriveDocuments` | `GET /v1/drives/{drive_id}/documents` | json |
| `getDriveDocument` | `GET /v1/drives/{drive_id}/documents/{document_id}` | json |
| `replaceDocument` | `PUT /v1/drives/{drive_id}/documents/{document_id}` | json |
| `deleteDriveDocument` | `DELETE /v1/drives/{drive_id}/documents/{document_id}` | json |
| `getDriveDocumentSource` | `GET /v1/drives/{drive_id}/documents/{document_id}/source` | bytes |
| `getWorkspaceDefaultDrive` | `GET /v1/workspaces/{workspace_id}/default-drive` | json |
| `getWorkspaceDefaultDriveRaw` | `GET /v1/workspaces/{workspace_id}/default-drive` | raw |
| `setDefaultDrive` | `PUT /v1/workspaces/{workspace_id}/default-drive` | json |
| `getSdkContext` | `GET /v1/sdk/context` | json |
| `getDriveUploadCapabilities` | `GET /v1/drives/{drive_id}/uploads/capabilities` | json |
| `createUploadBatch` | `POST /v1/drives/{drive_id}/uploads/batch` | json |
| `completeUploadBatch` | `POST /v1/drives/{drive_id}/uploads/batch/complete` | json |
| `getUploadBatchStatus` | `POST /v1/drives/{drive_id}/uploads/batch/status` | json |
| `createDriveUpload` | `POST /v1/drives/{drive_id}/uploads` | json |
| `getDriveUpload` | `GET /v1/drives/{drive_id}/uploads/{upload_id}` | json |
| `uploadContent` | `PUT /v1/drives/{drive_id}/uploads/{upload_id}/content` | json |
| `createUploadTransfer` | `POST /v1/drives/{drive_id}/uploads/{upload_id}/transfer` | json |
| `completeUpload` | `POST /v1/drives/{drive_id}/uploads/{upload_id}/complete` | json |
| `getWorkspaceOperation` | `GET /v1/workspaces/{workspace_id}/operations/{operation_id}` | json |
| `createImport` | `PUT /v1/drives/{drive_id}/imports/{import_id}` | json |
| `getImport` | `GET /v1/drives/{drive_id}/imports/{import_id}` | json |
| `declareImportChunks` | `POST /v1/drives/{drive_id}/imports/{import_id}/chunks` | json |
| `acknowledgeImportChunk` | `POST /v1/drives/{drive_id}/imports/{import_id}/chunks/{sequence}/acknowledge` | json |
| `sealImport` | `POST /v1/drives/{drive_id}/imports/{import_id}/seal` | json |
| `getIngestionMetrics` | `GET /v1/drives/{drive_id}/ingestion-metrics` | json |
| `getOrganizationBilling` | `GET /v1/organizations/{organization_id}/billing` | json |
| `setBillingLimits` | `POST /v1/organizations/{organization_id}/billing/limits` | json |
| `getOrganizationBillingLimits` | `GET /v1/organizations/{organization_id}/billing/limits` | json |
| `getOrganizationBillingUsage` | `GET /v1/organizations/{organization_id}/billing/usage` | json |
| `createBillingPortal` | `POST /v1/organizations/{organization_id}/billing/portal` | json |
| `getOrganizationBillingWallet` | `GET /v1/organizations/{organization_id}/billing/wallet` | json |
| `getOrganizationBillingActivity` | `GET /v1/organizations/{organization_id}/billing/activity` | json |
| `createOrganizationBillingPurchase` | `POST /v1/organizations/{organization_id}/billing/purchases` | json |
| `getOrganizationBillingPurchase` | `GET /v1/organizations/{organization_id}/billing/purchases/{purchase_id}` | json |
| `listOrganizationBillingInvoices` | `GET /v1/organizations/{organization_id}/billing/invoices` | json |
| `getWorkspaceStorage` | `GET /v1/workspaces/{workspace_id}/storage` | json |
| `setWorkspaceStorage` | `POST /v1/workspaces/{workspace_id}/storage` | json |
| `quoteWorkspaceStorage` | `POST /v1/workspaces/{workspace_id}/storage/quote` | json |
| `closeImport` | `POST /v1/drives/{drive_id}/imports/{import_id}/close` | json |
| `recoverImport` | `POST /v1/drives/{drive_id}/imports/{import_id}/recover` | json |
| `retryImportOperation` | `POST /v1/drives/{drive_id}/imports/{import_id}/operations/{operation_id}/retry` | json |
| `getAutoTopup` | `GET /v1/organizations/{organization_id}/billing/auto-topup` | json |
| `checkoutAutoTopup` | `POST /v1/organizations/{organization_id}/billing/auto-topup/checkout` | json |
| `amountAutoTopup` | `POST /v1/organizations/{organization_id}/billing/auto-topup/amount` | json |
| `cancelAutoTopup` | `POST /v1/organizations/{organization_id}/billing/auto-topup/cancel` | json |
| `resumeAutoTopup` | `POST /v1/organizations/{organization_id}/billing/auto-topup/resume` | json |
