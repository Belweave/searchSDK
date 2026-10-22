# Priority provider native API inventory

Research snapshot: **2026-10-22**. This inventory covers the public contracts verified in the official documentation for Exa, Tavily, Brave, Context.dev, and TinyFish. It records **203 HTTP method bindings** plus the Context Logo Link URL helper. Streaming variants of the same HTTP endpoint are separate named bindings. This is documentation research and fixture verification: **no provider credentials, live search calls, account-gate checks, payments, or live automation were used**.

The retained [operation catalog](../scripts/providers-a/operations.json) contains each native method's input/body/query/path type names and parameter names. The [provenance manifest](../scripts/providers-a/provenance.json) records official URLs, retrieval dates, original source hashes, retained artifact hashes, and transformations. The [offline generator](../scripts/providers-a/README.md) reproduces the five native modules and catalog without installing dependencies or accessing the network.

## Client contract

Factories are `createExaClient`, `createTavilyClient`, `createBraveClient`, `createContextClient`, and `createTinyfishClient`, exported from their respective `native-*.ts` modules. These explicit native clients supplement the existing normalized search adapters; this work does not change those adapters' request contracts.

Each HTTP method takes a provider-specific input with the documented wire locations: `{ body, query, path, headers, signal, timeoutMs }`. Document parsing uses `rawBody` for uploaded bytes. Each method returns `NativeResponse<T>` with native data and sanitized transport metadata. Native JSON fields are preserved at runtime, including fields unknown to the captured schema. The TypeScript response type is an assertion, not runtime validation of every provider response field.

```ts
const client = createContextClient({ apiKey: process.env.CONTEXT_DEV_API_KEY! });
const response = await client.search({
  body: {
    query: 'browser automation research',
    numResults: 20,
    markdownOptions: { enabled: true, includeLinks: true },
    highlightsOptions: { enabled: true, maxCharacters: 1500 },
    timeoutOpts: { milliseconds: 15000, behavior: 'return-partial' },
  },
  timeoutMs: 20000,
});
// Inspect response.data.partial and each result's content outcome.
```

Every client exposes a frozen `operations` map, also exported as `exaOperations`, `tavilyOperations`, `braveOperations`, `contextOperations`, or `tinyfishOperations`. Its descriptors are the descriptors actually used by the named methods: method, relative path, operation ID, response mode, retry declaration, and any fixed public protocol headers. They contain no credentials. The pure `contextLogoUrl`/`client.logoUrl` helper is excluded from the HTTP operations map.

The shared [transport contract](native-transport-contract.md) supplies total deadlines, cancellation, response limits, per-transport concurrency, and opt-in retries. These clients declare ordinary GET reads retryable; POST, PATCH, PUT, DELETE, and SSE bindings do not automatically replay. Retry configuration still defaults to zero. There is no automatic pagination, status polling, signed-URL download/upload, browser driving, webhook receiver, or stream reconnection. Long operations need an explicitly appropriate `timeoutMs`; the transport's default deadline is 10 seconds.

For SSE, `response.data` is `AsyncIterable<NativeSSEEvent>`. `event.data` remains wire text; consumers must interpret native terminal/error events and validate parsed payloads. Payload aliases describe the published schemas where available. A successful HTTP response may still contain per-page errors, a failed job, partial results, or an SSE pipeline error; those native fields are preserved instead of being silently discarded. Stream consumption does not retry or reconnect.

## Sources and provider semantics

### Context.dev

The [current public OpenAPI](https://docs.context.dev/openapi.json) supplies 48 operations: search, Scrape Anything, map, crawl, structured extraction, sourced answers, raw-file parsing, brand retrieval/search, styleguide/fonts/classification, company search, person enrichment, news, asynchronous batches, monitor configuration/runs/changes/limits, webhook delivery inspection/retry, browser-profile listing, usage/history, logs, and feedback. Native output selection and browser/parser controls are exposed through typed Scrape Anything fields, including the prebuilt parser names declared by the schema.

GET query objects use bracket notation and arrays use comma serialization, matching the [official SDK query serializer](https://github.com/context-dot-dev/context-typescript-sdk/blob/main/src/internal/utils/query.ts). `/parse` sends file bytes directly with `application/octet-stream` by default, not a JSON or multipart wrapper. Its PDF range object and other query controls follow the [official parse implementation](https://github.com/context-dot-dev/context-typescript-sdk/blob/main/src/resources/parse.ts). Per-request `Content-Type` can identify the actual uploaded format. Native scrape, inline search content, and batch records keep each output's own success/error fields.

[Logo Link](https://docs.context.dev/brand/logo-link.md) is a separate public-client-ID product at `logos.context.dev`, supporting GET and HEAD. `contextLogoUrl(query)` and `client.logoUrl(query)` build direct image-embedding URLs without downloading images. `client.headLogo` inspects response headers and sends no bearer key to that separate host. The provider instructs users to embed the URL directly and not download, persist, or rehost the image; the client deliberately has no image-download method.

Access depends on the account, key scopes, and requested features. Zero data retention can require account enablement; browser actions can require a paid plan. Numeric limits and conditional output dependencies in the schema remain provider rules. Batch submission exposes its documented `Idempotency-Key` header without adding implicit retries. Webhook retry and secret rotation are explicit calls. Native successful responses can contain webhook secrets, retained request input, or personal/brand data; success data is not automatically redacted.

### TinyFish

The official [main](https://agent.tinyfish.ai/v1/openapi/main), [search](https://agent.tinyfish.ai/v1/openapi/search), [fetch](https://agent.tinyfish.ai/v1/openapi/fetch), [browser](https://agent.tinyfish.ai/v1/openapi/browser), [monitor](https://agent.tinyfish.ai/v1/openapi/monitor), and [research](https://agent.tinyfish.ai/v1/openapi/research) schemas supply 47 operations across four fixed hosts. Search exposes native purpose, web/news/research-paper selection, pagination, recency/date/year filters, thumbnails, domain strings, and JSON-encoded fetch controls. Fetch retains partial per-URL errors and conditional-request metadata. Browser APIs return connection details; the SDK does not connect to or drive the returned browser.

Automation supports synchronous completion, asynchronous dispatch, bulk dispatch, SSE progress, listing/getting/batch-getting runs, cancellation, step screenshots, and step HTML. Screenshots return bounded bytes; HTML returns text. Sync runs cannot be cancelled according to the [run endpoint documentation](https://docs.tinyfish.ai/api-reference/automation/run-browser-automation-synchronously.md). Profile setup/save/cancel/upload/domain-removal and vault connection/item/sync operations are distinct named methods; they do not run any login workflow automatically.

[Research](https://docs.tinyfish.ai/research-api/reference.md) is beta and must be enabled for the account. Accepted synchronous research requests always return SSE, including when the native `stream` field is false. That field controls synthesis deltas, so the SDK preserves its value in both synchronous and asynchronous research requests. Reattachment accepts `Last-Event-ID`; cursors and session/prior-run controls remain explicit. The public research spec does not publish exhaustive event-data schemas, so research events remain text with documented event names exported as `TinyfishResearchEventName`.

Wallet top-up is a documented, explicit, non-retried endpoint. The [MPP flow](https://docs.tinyfish.ai/api-reference/wallet/top-up-wallet-agent-paid.md) requires an initial 402 challenge and a subsequent payment authorization. Callers may supply an externally obtained `Payment-Authorization` header, but this SDK does not expose sanitized-error challenge headers, negotiate, sign, or authorize payments. A 202 pending payment remains a native pending result; the SDK does not pay again.

### Exa

The official [public API schema](https://exa.ai/docs/exa-spec.yaml) covers search, contents, answer, similar links, Agent runs/events/cancel/stop/delete, beta batches, search monitors, and Websets data/search/enrichment/item/import/monitor/webhook/event management. The separate [Team Management schema](https://exa.ai/docs/team-management-spec.yaml) adds six API-key management/usage operations. There are 74 named bindings including four explicit SSE variants.

Search and Answer have explicit JSON and stream methods. The stream variants set their documented negotiation controls. Search synthesis streaming requires `outputSchema`; its input type reflects that requirement. Agent streaming uses `Accept: text/event-stream`, and event replay accepts `Last-Event-ID`. JSON methods select `stream: false` where that field negotiates the HTTP response. The SDK does not silently start a second Agent run when a request fails.

The [Batch API](https://exa.ai/docs/reference/batches/create-a-batch.md) requires the public `Exa-Beta: batches-2026-06-06` token, supplied by the relevant operation descriptors. Eligibility and account limits remain provider-controlled. Agent Ultra/Connect, compliance features, monitors, and Websets may depend on account enablement, permissions, or separate limits. Returned signed import-upload and batch-result URLs are preserved but not automatically fetched; no API key is forwarded to their external hosts.

Websets endpoints use the path-level `https://api.exa.ai/websets` server declared in the schema. `getTeamInfo` follows the current [team-info reference](https://exa.ai/docs/websets/api/teams/get-team-info.md), which declares root `https://api.exa.ai/v0/teams/me`. This has fixture coverage, not a live routing check. The enrichment PATCH endpoint documents an empty 200; that method verifies an empty body and returns `data: null` without weakening other JSON-response validation.

Team Management uses `https://admin-api.exa.ai/team-management` and a separate `teamApiKey` option. Those methods fail locally if the service credential is absent. The admin transport is created lazily once and shares its configured concurrency limit across calls. Creation, update, deletion, and cancellation are explicit, non-retried operations. Search API-key authentication is not treated as proof that a caller can use administrative APIs.

### Tavily

The official [API index](https://docs.tavily.com/llms.txt) and per-endpoint embedded schemas supply Search, Extract, Crawl, Map, Research creation/status, Feedback, Usage, Logs, enterprise key generation/deactivation/info, and organization usage. Research has a separate named SSE variant. Native search options, extraction controls, files/output schemas, attribution headers, usage fields, and research source controls retain provider spelling and shape.

[Research streaming](https://docs.tavily.com/documentation/api-reference/endpoint/research-streaming.md) uses OpenAI-style chunks with tool-call/response, content, and source deltas. The endpoint's JSON schema does not describe those chunks; the exported payload alias incorporates the common fields from the official streaming guide. Unknown future event fields remain preserved at runtime. Creation/status calls do not poll automatically, and status response types include documented 200 and 202 variants.

[Keyless Search and Extract](https://docs.tavily.com/documentation/keyless.md) require explicit `{ accessMode: 'keyless' }` and send `X-Tavily-Access-Mode: keyless`; missing keys do not silently select that mode. Other ordinary Tavily methods require a configured API key. The optional project/session/human attribution headers are accepted per request. Logs use POST, not GET. Feedback is beta; Logs can require a paid plan; enterprise key-management/organization-usage operations require the relevant enterprise access.

[Key generation/deactivation](https://docs.tavily.com/documentation/enterprise/generate-keys.md) uses a separate fixed `api-key-generator.tavily.com` host. Deactivation without a body deactivates the credential in the Authorization header; bulk deactivation sends the generation `request_id`. Generated credentials in successful native responses are intentionally preserved, so callers must handle that data as sensitive.

The [x402 service](https://docs.tavily.com/documentation/machine-payments/x402.md) exposes separate `paidSearch` and `getPaymentPricing` bindings at `x402.tavily.com` without forwarding the ordinary API key. Pricing returns a bounded raw Response because no stable response schema is published in the guide. An external x402 client must acquire/sign the payment authorization. This SDK does not expose initial 402 challenge headers or the success receipt in its sanitized metadata, and does not negotiate or sign payments. These bindings have fixture coverage only.

### Brave

The official [reference index](https://api-dashboard.search.brave.com/llms.txt) lists LLM context, Answers, GET/POST web search, GET/POST news/video search, images, place search, local POIs, POI descriptions, rich callbacks, suggestions, and spellcheck. The retained inputs contain only the public structured `apiSpec` schema embedded in each reference page. No UI/session/anti-CSRF data is retained. Those schemas preserve nullability and named native models more accurately than the reference's Markdown tables.

GET and POST variants retain their distinct wire locations. GET web search serializes `result_filter` as one comma-delimited value per the [reference description](https://api-dashboard.search.brave.com/api-reference/web/search/get); the semantic array remains a JSON array in POST. Other array parameters retain their own encoding, including repeated Goggles. Geographic/version/cache headers are explicit serialized strings. Product-specific subscription keys and active account plans determine access; local/rich/Answers availability is not inferred from a successful web-search fixture.

[Answers](https://api-dashboard.search.brave.com/documentation/services/answers) has explicit JSON and SSE variants. The JSON response type includes the guide's `choices[].message.content`, while the stream type preserves native deltas. Citations/entities/research are streaming features; callers remain responsible for provider constraints. Rich callback keys and local POI identifiers are passed to their dedicated read operations without automatic follow-up calls.

## Boundaries and unavailable surfaces

- The inventory represents verified public contracts at the snapshot date. Schema/example inconsistencies and undocumented future changes remain possible. No claim of universal correctness, current account eligibility, or live-provider verification is made.
- JSON Schema constraints such as numeric/string/array limits, regex/format checks, `if`/`then`, `not`, and conditional mutual exclusion are not all expressible in the generated TypeScript. Retained schemas and comments contain the source constraints; the native clients do not pretend to validate every combination. Intentionally unconstrained provider data and user-defined JSON output remain explicit maps or `unknown`.
- Signed external uploads/downloads, CDP browser driving, webhook receiving/signature verification, payment negotiation/signing, and MCP/OAuth/CLI account setup are separate workflows. Returning their URLs/IDs or exposing their endpoint binding does not mean those workflows are implemented.
- Dashboard-only team/billing/account actions without a verified public endpoint are unavailable. No REST route was inferred from a UI action or resource name. Exa export event names do not establish an undocumented export-creation endpoint.
- Historical search-indexed Context pages for older brand AI/product endpoints and legacy Brave summarizer routes are not corroborated by the current canonical API indices/schemas reviewed here. They are not claimed as supported current endpoints or implemented as invented aliases. Current Context scrape/product/structured-extract and Brave Answers contracts are exposed under their documented routes.
- Fixture tests check SDK request/response/error/stream behavior, binary and raw uploads, credential separation, no-content responses, concurrency, and representative static typing. They do not contact providers or prove production schema conformance, result quality, performance, pricing, or reliability.

## Exact operation inventory

`Bearer` means `Authorization: Bearer <apiKey>`. `API key` names the provider-specific header. Every path parameter is encoded as a single segment by the shared transport. Response mode `empty` means an endpoint-specific empty body is verified and returned as null. The full input and response types are exported beside each client.

### Context.dev

| Native method | HTTP | Fixed endpoint | Authentication/access | Response | Official contract |
| --- | --- | --- | --- | --- | --- |
| `submitFeedback` | POST | `https://api.context.dev/v1/feedback` | Bearer | JSON | [Submit agent feedback](https://docs.context.dev/openapi.json) |
| `listLogs` | GET | `https://api.context.dev/v1/org/logs` | Bearer | JSON | [List request logs](https://docs.context.dev/openapi.json) |
| `getLog` | GET | `https://api.context.dev/v1/org/logs/{request_id}` | Bearer | JSON | [Retrieve a request log](https://docs.context.dev/openapi.json) |
| `listProfiles` | GET | `https://api.context.dev/v1/org/browser/profiles` | Bearer | JSON | [List browser profiles](https://docs.context.dev/openapi.json) |
| `getUsage` | GET | `https://api.context.dev/v1/org/usage` | Bearer | JSON | [Retrieve credit usage](https://docs.context.dev/openapi.json) |
| `getUsageHistory` | GET | `https://api.context.dev/v1/org/usage/history` | Bearer | JSON | [Retrieve usage history](https://docs.context.dev/openapi.json) |
| `listWebhookDeliveries` | POST | `https://api.context.dev/v1/webhooks/deliveries` | Bearer | JSON | [List webhook deliveries](https://docs.context.dev/openapi.json) |
| `getWebhookDelivery` | GET | `https://api.context.dev/v1/webhooks/deliveries/{delivery_id}` | Bearer | JSON | [Retrieve a webhook delivery](https://docs.context.dev/openapi.json) |
| `listWebhookDeliveryAttempts` | GET | `https://api.context.dev/v1/webhooks/deliveries/{delivery_id}/attempts` | Bearer | JSON | [List webhook delivery attempts](https://docs.context.dev/openapi.json) |
| `retryWebhookDelivery` | POST | `https://api.context.dev/v1/webhooks/deliveries/{delivery_id}/retry` | Bearer | JSON | [Retry a webhook delivery](https://docs.context.dev/openapi.json) |
| `scrape` | POST | `https://api.context.dev/v1/web/scrape` | Bearer | JSON | [Scrape Anything](https://docs.context.dev/openapi.json) |
| `searchNews` | POST | `https://api.context.dev/v1/news/search` | Bearer | JSON | [Search news](https://docs.context.dev/openapi.json) |
| `answers` | POST | `https://api.context.dev/v1/web/answers` | Bearer | JSON | [Answer a research task](https://docs.context.dev/openapi.json) |
| `parse` | POST | `https://api.context.dev/v1/parse` | Bearer | JSON | [Parse a file](https://docs.context.dev/openapi.json) |
| `map` | GET | `https://api.context.dev/v1/web/urls` | Bearer | JSON | [Map URLs](https://docs.context.dev/openapi.json) |
| `crawl` | POST | `https://api.context.dev/v1/web/crawl` | Bearer | JSON | [Crawl a website](https://docs.context.dev/openapi.json) |
| `extract` | POST | `https://api.context.dev/v1/web/extract` | Bearer | JSON | [Extract structured data](https://docs.context.dev/openapi.json) |
| `search` | POST | `https://api.context.dev/v1/web/search` | Bearer | JSON | [Search the web](https://docs.context.dev/openapi.json) |
| `enrichPerson` | POST | `https://api.context.dev/v1/people/enrich` | Bearer | JSON | [Enrich a person](https://docs.context.dev/openapi.json) |
| `retrieveBrand` | POST | `https://api.context.dev/v1/brand/retrieve` | Bearer | JSON | [Retrieve a brand](https://docs.context.dev/openapi.json) |
| `searchBrands` | GET | `https://api.context.dev/v1/brand/search` | Bearer | JSON | [Auto-complete Brand](https://docs.context.dev/openapi.json) |
| `styleguide` | GET | `https://api.context.dev/v1/web/styleguide` | Bearer | JSON | [Extract a styleguide](https://docs.context.dev/openapi.json) |
| `fonts` | GET | `https://api.context.dev/v1/web/fonts` | Bearer | JSON | [Extract fonts](https://docs.context.dev/openapi.json) |
| `classifyNaics` | GET | `https://api.context.dev/v1/web/naics` | Bearer | JSON | [Classify NAICS codes](https://docs.context.dev/openapi.json) |
| `classifySic` | GET | `https://api.context.dev/v1/web/sic` | Bearer | JSON | [Classify SIC codes](https://docs.context.dev/openapi.json) |
| `prefetch` | POST | `https://api.context.dev/v1/utility/prefetch` | Bearer | JSON | [Prefetch brand data](https://docs.context.dev/openapi.json) |
| `createMonitor` | POST | `https://api.context.dev/v1/monitors` | Bearer | JSON | [Create a monitor](https://docs.context.dev/openapi.json) |
| `listMonitors` | GET | `https://api.context.dev/v1/monitors` | Bearer | JSON | [List monitors](https://docs.context.dev/openapi.json) |
| `getMonitor` | GET | `https://api.context.dev/v1/monitors/{monitor_id}` | Bearer | JSON | [Retrieve a monitor](https://docs.context.dev/openapi.json) |
| `updateMonitor` | PATCH | `https://api.context.dev/v1/monitors/{monitor_id}` | Bearer | JSON | [Update a monitor](https://docs.context.dev/openapi.json) |
| `deleteMonitor` | DELETE | `https://api.context.dev/v1/monitors/{monitor_id}` | Bearer | JSON | [Delete a monitor](https://docs.context.dev/openapi.json) |
| `listMonitorRuns` | GET | `https://api.context.dev/v1/monitors/{monitor_id}/runs` | Bearer | JSON | [List monitor runs](https://docs.context.dev/openapi.json) |
| `getMonitorRun` | GET | `https://api.context.dev/v1/monitors/{monitor_id}/runs/{run_id}` | Bearer | JSON | [Retrieve a monitor run](https://docs.context.dev/openapi.json) |
| `listMonitorChanges` | GET | `https://api.context.dev/v1/monitors/{monitor_id}/changes` | Bearer | JSON | [List monitor changes](https://docs.context.dev/openapi.json) |
| `listAccountRuns` | GET | `https://api.context.dev/v1/monitors/runs` | Bearer | JSON | [List runs for all monitors](https://docs.context.dev/openapi.json) |
| `listMonitorCreditUsage` | GET | `https://api.context.dev/v1/monitors/credit-usage` | Bearer | JSON | [Retrieve monitor credit usage](https://docs.context.dev/openapi.json) |
| `getMonitorLimits` | GET | `https://api.context.dev/v1/monitors/limits` | Bearer | JSON | [Retrieve monitor limits](https://docs.context.dev/openapi.json) |
| `listChanges` | GET | `https://api.context.dev/v1/monitors/changes` | Bearer | JSON | [List changes for all monitors](https://docs.context.dev/openapi.json) |
| `getChange` | GET | `https://api.context.dev/v1/monitors/changes/{change_id}` | Bearer | JSON | [Retrieve a monitor change](https://docs.context.dev/openapi.json) |
| `runMonitorNow` | POST | `https://api.context.dev/v1/monitors/{monitor_id}/run` | Bearer | JSON | [Run a monitor now](https://docs.context.dev/openapi.json) |
| `rotateMonitorWebhookSecret` | POST | `https://api.context.dev/v1/monitors/{monitor_id}/webhook/rotate-secret` | Bearer | JSON | [Rotate a monitor webhook secret](https://docs.context.dev/openapi.json) |
| `submitBatch` | POST | `https://api.context.dev/v1/batch/submit` | Bearer | JSON | [Submit a batch](https://docs.context.dev/openapi.json) |
| `listBatches` | GET | `https://api.context.dev/v1/batch/list` | Bearer | JSON | [List batches](https://docs.context.dev/openapi.json) |
| `getBatch` | GET | `https://api.context.dev/v1/batch/{batch_id}` | Bearer | JSON | [Retrieve a batch](https://docs.context.dev/openapi.json) |
| `deleteBatch` | DELETE | `https://api.context.dev/v1/batch/{batch_id}` | Bearer | JSON | [Delete a batch](https://docs.context.dev/openapi.json) |
| `getBatchResults` | GET | `https://api.context.dev/v1/batch/{batch_id}/results` | Bearer | JSON | [List batch results](https://docs.context.dev/openapi.json) |
| `cancelBatch` | POST | `https://api.context.dev/v1/batch/{batch_id}/cancel` | Bearer | JSON | [Cancel a batch](https://docs.context.dev/openapi.json) |
| `searchCompanies` | POST | `https://api.context.dev/v1/company/search` | Bearer | JSON | [Search companies](https://docs.context.dev/openapi.json) |
| `logoUrl` | GET | `https://logos.context.dev/` | Public client ID; referring-domain restrictions | URL helper; no fetch | [Build direct image embedding URL; no download](https://docs.context.dev/brand/logo-link.md) |
| `headLogo` | HEAD | `https://logos.context.dev/` | Public client ID; referring-domain restrictions | raw Response | [Inspect public image headers](https://docs.context.dev/brand/logo-link.md) |

### TinyFish

| Native method | HTTP | Fixed endpoint | Authentication/access | Response | Official contract |
| --- | --- | --- | --- | --- | --- |
| `runSse` | POST | `https://agent.tinyfish.ai/v1/automation/run-sse` | X-API-Key | SSE | [Run browser automation with SSE streaming](https://agent.tinyfish.ai/v1/openapi/main) |
| `run` | POST | `https://agent.tinyfish.ai/v1/automation/run` | X-API-Key | JSON | [Run browser automation synchronously](https://agent.tinyfish.ai/v1/openapi/main) |
| `runAsync` | POST | `https://agent.tinyfish.ai/v1/automation/run-async` | X-API-Key | JSON | [Start automation asynchronously](https://agent.tinyfish.ai/v1/openapi/main) |
| `runBatch` | POST | `https://agent.tinyfish.ai/v1/automation/run-batch` | X-API-Key | JSON | [Start multiple automations asynchronously](https://agent.tinyfish.ai/v1/openapi/main) |
| `listRuns` | GET | `https://agent.tinyfish.ai/v1/runs` | X-API-Key | JSON | [List and search runs](https://agent.tinyfish.ai/v1/openapi/main) |
| `batchGetRuns` | POST | `https://agent.tinyfish.ai/v1/runs/batch` | X-API-Key | JSON | [Get multiple runs by IDs](https://agent.tinyfish.ai/v1/openapi/main) |
| `batchCancelRuns` | POST | `https://agent.tinyfish.ai/v1/runs/batch/cancel` | X-API-Key | JSON | [Cancel multiple runs by IDs](https://agent.tinyfish.ai/v1/openapi/main) |
| `getRunById` | GET | `https://agent.tinyfish.ai/v1/runs/{id}` | X-API-Key | JSON | [Get run by ID](https://agent.tinyfish.ai/v1/openapi/main) |
| `cancelRunById` | POST | `https://agent.tinyfish.ai/v1/runs/{id}/cancel` | X-API-Key | JSON | [Cancel run by ID](https://agent.tinyfish.ai/v1/openapi/main) |
| `getStepScreenshot` | GET | `https://agent.tinyfish.ai/v1/runs/{id}/steps/{stepId}/screenshot` | X-API-Key | bytes | [Get step screenshot](https://agent.tinyfish.ai/v1/openapi/main) |
| `getStepHtml` | GET | `https://agent.tinyfish.ai/v1/runs/{id}/steps/{stepId}/html` | X-API-Key | text | [Get step HTML snapshot](https://agent.tinyfish.ai/v1/openapi/main) |
| `listBrowserContextProfiles` | GET | `https://agent.tinyfish.ai/v1/profiles` | X-API-Key | JSON | [List Browser Context Profiles](https://agent.tinyfish.ai/v1/openapi/main) |
| `createBrowserContextProfile` | POST | `https://agent.tinyfish.ai/v1/profiles` | X-API-Key | JSON | [Create a Browser Context Profile](https://agent.tinyfish.ai/v1/openapi/main) |
| `getBrowserContextProfile` | GET | `https://agent.tinyfish.ai/v1/profiles/{profileId}` | X-API-Key | JSON | [Get a Browser Context Profile](https://agent.tinyfish.ai/v1/openapi/main) |
| `updateBrowserContextProfile` | PATCH | `https://agent.tinyfish.ai/v1/profiles/{profileId}` | X-API-Key | JSON | [Update a Browser Context Profile](https://agent.tinyfish.ai/v1/openapi/main) |
| `deleteBrowserContextProfile` | DELETE | `https://agent.tinyfish.ai/v1/profiles/{profileId}` | X-API-Key | JSON | [Delete a Browser Context Profile](https://agent.tinyfish.ai/v1/openapi/main) |
| `createBrowserContextProfileSetupSession` | POST | `https://agent.tinyfish.ai/v1/profiles/{profileId}/setup-session` | X-API-Key | JSON | [Create a profile setup session](https://agent.tinyfish.ai/v1/openapi/main) |
| `cancelBrowserContextProfileSetupSession` | POST | `https://agent.tinyfish.ai/v1/profiles/{profileId}/setup-session/cancel` | X-API-Key | JSON | [Cancel a profile setup session](https://agent.tinyfish.ai/v1/openapi/main) |
| `saveBrowserContextProfileSetupSession` | POST | `https://agent.tinyfish.ai/v1/profiles/{profileId}/save` | X-API-Key | JSON | [Save a profile setup session](https://agent.tinyfish.ai/v1/openapi/main) |
| `uploadBrowserContextProfileState` | POST | `https://agent.tinyfish.ai/v1/profiles/{profileId}/upload` | X-API-Key | JSON | [Upload Browser Context Profile state](https://agent.tinyfish.ai/v1/openapi/main) |
| `deleteBrowserContextProfileDomain` | DELETE | `https://agent.tinyfish.ai/v1/profiles/{profileId}/domains/{domain}` | X-API-Key | JSON | [Delete a saved profile domain](https://agent.tinyfish.ai/v1/openapi/main) |
| `connectVault` | POST | `https://agent.tinyfish.ai/v1/vault/connections` | X-API-Key | JSON | [Connect a vault provider](https://agent.tinyfish.ai/v1/openapi/main) |
| `listVaultConnections` | GET | `https://agent.tinyfish.ai/v1/vault/connections` | X-API-Key | JSON | [List vault connections](https://agent.tinyfish.ai/v1/openapi/main) |
| `disconnectVault` | DELETE | `https://agent.tinyfish.ai/v1/vault/connections/{connectionId}` | X-API-Key | JSON | [Disconnect a vault provider](https://agent.tinyfish.ai/v1/openapi/main) |
| `listVaultItems` | GET | `https://agent.tinyfish.ai/v1/vault/items` | X-API-Key | JSON | [List vault items](https://agent.tinyfish.ai/v1/openapi/main) |
| `syncVaultItems` | POST | `https://agent.tinyfish.ai/v1/vault/items/sync` | X-API-Key | JSON | [Sync vault items](https://agent.tinyfish.ai/v1/openapi/main) |
| `getWallet` | GET | `https://agent.tinyfish.ai/v1/wallet` | X-API-Key | JSON | [Get wallet](https://agent.tinyfish.ai/v1/openapi/main) |
| `topUpWallet` | POST | `https://agent.tinyfish.ai/v1/wallet/top-up` | X-API-Key | JSON | [Top up wallet (agent-paid)](https://agent.tinyfish.ai/v1/openapi/main) |
| `search` | GET | `https://api.search.tinyfish.ai/` | X-API-Key | JSON | [Search the web](https://agent.tinyfish.ai/v1/openapi/search) |
| `listSearchUsage` | GET | `https://api.search.tinyfish.ai/usage` | X-API-Key | JSON | [List search usage](https://agent.tinyfish.ai/v1/openapi/search) |
| `fetchUrls` | POST | `https://api.fetch.tinyfish.ai/` | X-API-Key | JSON | [Fetch and extract content from URLs](https://agent.tinyfish.ai/v1/openapi/fetch) |
| `listFetchUsage` | GET | `https://api.fetch.tinyfish.ai/usage` | X-API-Key | JSON | [List fetch usage](https://agent.tinyfish.ai/v1/openapi/fetch) |
| `createBrowserSession` | POST | `https://api.browser.tinyfish.ai/` | X-API-Key | JSON | [Create a remote browser session](https://agent.tinyfish.ai/v1/openapi/browser) |
| `listBrowserUsage` | GET | `https://api.browser.tinyfish.ai/usage` | X-API-Key | JSON | [List browser session usage](https://agent.tinyfish.ai/v1/openapi/browser) |
| `deleteBrowserSession` | DELETE | `https://api.browser.tinyfish.ai/{sessionId}` | X-API-Key | empty → null | [Terminate a browser session](https://agent.tinyfish.ai/v1/openapi/browser) |
| `createMonitor` | POST | `https://agent.tinyfish.ai/v1/monitors` | X-API-Key | JSON | [Create a Monitor](https://agent.tinyfish.ai/v1/openapi/monitor) |
| `listMonitors` | GET | `https://agent.tinyfish.ai/v1/monitors` | X-API-Key | JSON | [List Monitors](https://agent.tinyfish.ai/v1/openapi/monitor) |
| `getMonitor` | GET | `https://agent.tinyfish.ai/v1/monitors/{id}` | X-API-Key | JSON | [Get a Monitor](https://agent.tinyfish.ai/v1/openapi/monitor) |
| `updateMonitor` | PATCH | `https://agent.tinyfish.ai/v1/monitors/{id}` | X-API-Key | JSON | [Update a Monitor](https://agent.tinyfish.ai/v1/openapi/monitor) |
| `deleteMonitor` | DELETE | `https://agent.tinyfish.ai/v1/monitors/{id}` | X-API-Key | JSON | [Delete a Monitor](https://agent.tinyfish.ai/v1/openapi/monitor) |
| `runMonitor` | POST | `https://agent.tinyfish.ai/v1/monitors/{id}/runs` | X-API-Key | JSON | [Run a Monitor now](https://agent.tinyfish.ai/v1/openapi/monitor) |
| `runResearch` | POST | `https://agent.tinyfish.ai/v1/automation/run-research` | X-API-Key; account-enabled beta | SSE | [Run research with SSE streaming](https://agent.tinyfish.ai/v1/openapi/research) |
| `startResearchAsync` | POST | `https://agent.tinyfish.ai/v1/automation/run-research-async` | X-API-Key; account-enabled beta | JSON | [Start research asynchronously](https://agent.tinyfish.ai/v1/openapi/research) |
| `streamResearchEvents` | GET | `https://agent.tinyfish.ai/v1/research-run/{research_run_id}/events` | X-API-Key; account-enabled beta | SSE | [Attach to research progress](https://agent.tinyfish.ai/v1/openapi/research) |
| `listResearchRuns` | GET | `https://agent.tinyfish.ai/v1/research-run` | X-API-Key; account-enabled beta | JSON | [List research runs](https://agent.tinyfish.ai/v1/openapi/research) |
| `getResearchRun` | GET | `https://agent.tinyfish.ai/v1/research-run/{research_run_id}` | X-API-Key; account-enabled beta | JSON | [Get research run by ID](https://agent.tinyfish.ai/v1/openapi/research) |
| `cancelResearchRun` | POST | `https://agent.tinyfish.ai/v1/research-run/{research_run_id}/cancel` | X-API-Key; account-enabled beta | JSON | [Cancel research run by ID](https://agent.tinyfish.ai/v1/openapi/research) |

### Exa

| Native method | HTTP | Fixed endpoint | Authentication/access | Response | Official contract |
| --- | --- | --- | --- | --- | --- |
| `search` | POST | `https://api.exa.ai/search` | x-api-key | JSON | [Search](https://exa.ai/docs/exa-spec.yaml) |
| `searchStream` | POST | `https://api.exa.ai/search` | x-api-key | SSE | [Search](https://exa.ai/docs/exa-spec.yaml) |
| `getContents` | POST | `https://api.exa.ai/contents` | x-api-key | JSON | [Contents](https://exa.ai/docs/exa-spec.yaml) |
| `answer` | POST | `https://api.exa.ai/answer` | x-api-key | JSON | [Answer](https://exa.ai/docs/exa-spec.yaml) |
| `answerStream` | POST | `https://api.exa.ai/answer` | x-api-key | SSE | [Answer](https://exa.ai/docs/exa-spec.yaml) |
| `findSimilar` | POST | `https://api.exa.ai/findSimilar` | x-api-key | JSON | [Find similar links](https://exa.ai/docs/exa-spec.yaml) |
| `createMonitor` | POST | `https://api.exa.ai/monitors` | x-api-key | JSON | [Create a monitor](https://exa.ai/docs/exa-spec.yaml) |
| `listMonitors` | GET | `https://api.exa.ai/monitors` | x-api-key | JSON | [List monitors](https://exa.ai/docs/exa-spec.yaml) |
| `batchMonitors` | POST | `https://api.exa.ai/monitors/batch` | x-api-key | JSON | [Batch action on monitors](https://exa.ai/docs/exa-spec.yaml) |
| `getMonitor` | GET | `https://api.exa.ai/monitors/{id}` | x-api-key | JSON | [Get a monitor](https://exa.ai/docs/exa-spec.yaml) |
| `updateMonitor` | PATCH | `https://api.exa.ai/monitors/{id}` | x-api-key | JSON | [Update a monitor](https://exa.ai/docs/exa-spec.yaml) |
| `deleteMonitor` | DELETE | `https://api.exa.ai/monitors/{id}` | x-api-key | JSON | [Delete a monitor](https://exa.ai/docs/exa-spec.yaml) |
| `triggerMonitor` | POST | `https://api.exa.ai/monitors/{id}/trigger` | x-api-key | JSON | [Trigger a monitor](https://exa.ai/docs/exa-spec.yaml) |
| `listMonitorRuns` | GET | `https://api.exa.ai/monitors/{id}/runs` | x-api-key | JSON | [List runs](https://exa.ai/docs/exa-spec.yaml) |
| `getMonitorRun` | GET | `https://api.exa.ai/monitors/{id}/runs/{runId}` | x-api-key | JSON | [Get a run](https://exa.ai/docs/exa-spec.yaml) |
| `createAgentRun` | POST | `https://api.exa.ai/agent/runs` | x-api-key | JSON | [Create a run](https://exa.ai/docs/exa-spec.yaml) |
| `createAgentRunStream` | POST | `https://api.exa.ai/agent/runs` | x-api-key | SSE | [Create a run](https://exa.ai/docs/exa-spec.yaml) |
| `listAgentRuns` | GET | `https://api.exa.ai/agent/runs` | x-api-key | JSON | [List runs](https://exa.ai/docs/exa-spec.yaml) |
| `getAgentRun` | GET | `https://api.exa.ai/agent/runs/{id}` | x-api-key | JSON | [Get a run](https://exa.ai/docs/exa-spec.yaml) |
| `deleteAgentRun` | DELETE | `https://api.exa.ai/agent/runs/{id}` | x-api-key | JSON | [Delete a run](https://exa.ai/docs/exa-spec.yaml) |
| `cancelAgentRun` | POST | `https://api.exa.ai/agent/runs/{id}/cancel` | x-api-key | JSON | [Cancel a run](https://exa.ai/docs/exa-spec.yaml) |
| `stopAgentRun` | POST | `https://api.exa.ai/agent/runs/{id}/stop` | x-api-key | JSON | [Stop a run](https://exa.ai/docs/exa-spec.yaml) |
| `listAgentRunEvents` | GET | `https://api.exa.ai/agent/runs/{id}/events` | x-api-key | JSON | [List run events](https://exa.ai/docs/exa-spec.yaml) |
| `listAgentRunEventsStream` | GET | `https://api.exa.ai/agent/runs/{id}/events` | x-api-key | SSE | [List run events](https://exa.ai/docs/exa-spec.yaml) |
| `createBatch` | POST | `https://api.exa.ai/batches` | x-api-key; Batch beta header | JSON | [Create a batch](https://exa.ai/docs/exa-spec.yaml) |
| `listBatches` | GET | `https://api.exa.ai/batches` | x-api-key; Batch beta header | JSON | [List batches](https://exa.ai/docs/exa-spec.yaml) |
| `getBatch` | GET | `https://api.exa.ai/batches/{id}` | x-api-key; Batch beta header | JSON | [Get a batch](https://exa.ai/docs/exa-spec.yaml) |
| `deleteBatch` | DELETE | `https://api.exa.ai/batches/{id}` | x-api-key; Batch beta header | JSON | [Delete a batch](https://exa.ai/docs/exa-spec.yaml) |
| `cancelBatch` | POST | `https://api.exa.ai/batches/{id}/cancel` | x-api-key; Batch beta header | JSON | [Cancel a batch](https://exa.ai/docs/exa-spec.yaml) |
| `getTeamInfo` | GET | `https://api.exa.ai/v0/teams/me` | x-api-key | JSON | [Get team info](https://exa.ai/docs/exa-spec.yaml) |
| `createWebset` | POST | `https://api.exa.ai/websets/v0/websets` | x-api-key | JSON | [Create a Webset](https://exa.ai/docs/exa-spec.yaml) |
| `listWebsets` | GET | `https://api.exa.ai/websets/v0/websets` | x-api-key | JSON | [List all Websets](https://exa.ai/docs/exa-spec.yaml) |
| `getWebset` | GET | `https://api.exa.ai/websets/v0/websets/{id}` | x-api-key | JSON | [Get a Webset](https://exa.ai/docs/exa-spec.yaml) |
| `updateWebset` | POST | `https://api.exa.ai/websets/v0/websets/{id}` | x-api-key | JSON | [Update a Webset](https://exa.ai/docs/exa-spec.yaml) |
| `deleteWebset` | DELETE | `https://api.exa.ai/websets/v0/websets/{id}` | x-api-key | JSON | [Delete a Webset](https://exa.ai/docs/exa-spec.yaml) |
| `cancelWebset` | POST | `https://api.exa.ai/websets/v0/websets/{id}/cancel` | x-api-key | JSON | [Cancel a running Webset](https://exa.ai/docs/exa-spec.yaml) |
| `createWebsetSearch` | POST | `https://api.exa.ai/websets/v0/websets/{webset}/searches` | x-api-key | JSON | [Create a Search](https://exa.ai/docs/exa-spec.yaml) |
| `getWebsetSearch` | GET | `https://api.exa.ai/websets/v0/websets/{webset}/searches/{id}` | x-api-key | JSON | [Get a Search](https://exa.ai/docs/exa-spec.yaml) |
| `cancelWebsetSearch` | POST | `https://api.exa.ai/websets/v0/websets/{webset}/searches/{id}/cancel` | x-api-key | JSON | [Cancel a running Search](https://exa.ai/docs/exa-spec.yaml) |
| `createWebsetEnrichment` | POST | `https://api.exa.ai/websets/v0/websets/{webset}/enrichments` | x-api-key | JSON | [Create an Enrichment](https://exa.ai/docs/exa-spec.yaml) |
| `updateWebsetEnrichment` | PATCH | `https://api.exa.ai/websets/v0/websets/{webset}/enrichments/{id}` | x-api-key | empty → null | [Update an Enrichment](https://exa.ai/docs/exa-spec.yaml) |
| `getWebsetEnrichment` | GET | `https://api.exa.ai/websets/v0/websets/{webset}/enrichments/{id}` | x-api-key | JSON | [Get an Enrichment](https://exa.ai/docs/exa-spec.yaml) |
| `deleteWebsetEnrichment` | DELETE | `https://api.exa.ai/websets/v0/websets/{webset}/enrichments/{id}` | x-api-key | JSON | [Delete an Enrichment](https://exa.ai/docs/exa-spec.yaml) |
| `cancelWebsetEnrichment` | POST | `https://api.exa.ai/websets/v0/websets/{webset}/enrichments/{id}/cancel` | x-api-key | JSON | [Cancel a running Enrichment](https://exa.ai/docs/exa-spec.yaml) |
| `getWebsetItem` | GET | `https://api.exa.ai/websets/v0/websets/{webset}/items/{id}` | x-api-key | JSON | [Get an Item](https://exa.ai/docs/exa-spec.yaml) |
| `deleteWebsetItem` | DELETE | `https://api.exa.ai/websets/v0/websets/{webset}/items/{id}` | x-api-key | JSON | [Delete an Item](https://exa.ai/docs/exa-spec.yaml) |
| `listWebsetItems` | GET | `https://api.exa.ai/websets/v0/websets/{webset}/items` | x-api-key | JSON | [List all Items for a Webset](https://exa.ai/docs/exa-spec.yaml) |
| `previewWebset` | POST | `https://api.exa.ai/websets/v0/websets/preview` | x-api-key | JSON | [Preview a webset](https://exa.ai/docs/exa-spec.yaml) |
| `createWebsetMonitor` | POST | `https://api.exa.ai/websets/v0/monitors` | x-api-key | JSON | [Create a Monitor](https://exa.ai/docs/exa-spec.yaml) |
| `listWebsetMonitors` | GET | `https://api.exa.ai/websets/v0/monitors` | x-api-key | JSON | [List Monitors](https://exa.ai/docs/exa-spec.yaml) |
| `getWebsetMonitor` | GET | `https://api.exa.ai/websets/v0/monitors/{id}` | x-api-key | JSON | [Get Monitor](https://exa.ai/docs/exa-spec.yaml) |
| `updateWebsetMonitor` | PATCH | `https://api.exa.ai/websets/v0/monitors/{id}` | x-api-key | JSON | [Update Monitor](https://exa.ai/docs/exa-spec.yaml) |
| `deleteWebsetMonitor` | DELETE | `https://api.exa.ai/websets/v0/monitors/{id}` | x-api-key | JSON | [Delete Monitor](https://exa.ai/docs/exa-spec.yaml) |
| `listWebsetMonitorRuns` | GET | `https://api.exa.ai/websets/v0/monitors/{monitor}/runs` | x-api-key | JSON | [List Monitor Runs](https://exa.ai/docs/exa-spec.yaml) |
| `getWebsetMonitorRun` | GET | `https://api.exa.ai/websets/v0/monitors/{monitor}/runs/{id}` | x-api-key | JSON | [Get Monitor Run](https://exa.ai/docs/exa-spec.yaml) |
| `createImport` | POST | `https://api.exa.ai/websets/v0/imports` | x-api-key | JSON | [Create an Import](https://exa.ai/docs/exa-spec.yaml) |
| `listImports` | GET | `https://api.exa.ai/websets/v0/imports` | x-api-key | JSON | [List Imports](https://exa.ai/docs/exa-spec.yaml) |
| `getImport` | GET | `https://api.exa.ai/websets/v0/imports/{id}` | x-api-key | JSON | [Get Import](https://exa.ai/docs/exa-spec.yaml) |
| `updateImport` | PATCH | `https://api.exa.ai/websets/v0/imports/{id}` | x-api-key | JSON | [Update Import](https://exa.ai/docs/exa-spec.yaml) |
| `deleteImport` | DELETE | `https://api.exa.ai/websets/v0/imports/{id}` | x-api-key | JSON | [Delete Import](https://exa.ai/docs/exa-spec.yaml) |
| `createWebhook` | POST | `https://api.exa.ai/websets/v0/webhooks` | x-api-key | JSON | [Create a Webhook](https://exa.ai/docs/exa-spec.yaml) |
| `listWebhooks` | GET | `https://api.exa.ai/websets/v0/webhooks` | x-api-key | JSON | [List webhooks](https://exa.ai/docs/exa-spec.yaml) |
| `getWebhook` | GET | `https://api.exa.ai/websets/v0/webhooks/{id}` | x-api-key | JSON | [Get a Webhook](https://exa.ai/docs/exa-spec.yaml) |
| `updateWebhook` | PATCH | `https://api.exa.ai/websets/v0/webhooks/{id}` | x-api-key | JSON | [Update a Webhook](https://exa.ai/docs/exa-spec.yaml) |
| `deleteWebhook` | DELETE | `https://api.exa.ai/websets/v0/webhooks/{id}` | x-api-key | JSON | [Delete a Webhook](https://exa.ai/docs/exa-spec.yaml) |
| `listWebhookAttempts` | GET | `https://api.exa.ai/websets/v0/webhooks/{id}/attempts` | x-api-key | JSON | [List webhook attempts](https://exa.ai/docs/exa-spec.yaml) |
| `listEvents` | GET | `https://api.exa.ai/websets/v0/events` | x-api-key | JSON | [List all Events](https://exa.ai/docs/exa-spec.yaml) |
| `getEvent` | GET | `https://api.exa.ai/websets/v0/events/{id}` | x-api-key | JSON | [Get an Event](https://exa.ai/docs/exa-spec.yaml) |
| `createApiKey` | POST | `https://admin-api.exa.ai/team-management/api-keys` | x-api-key: separate teamApiKey | JSON | [Create API key](https://exa.ai/docs/team-management-spec.yaml) |
| `listApiKeys` | GET | `https://admin-api.exa.ai/team-management/api-keys` | x-api-key: separate teamApiKey | JSON | [List API keys](https://exa.ai/docs/team-management-spec.yaml) |
| `getApiKey` | GET | `https://admin-api.exa.ai/team-management/api-keys/{id}` | x-api-key: separate teamApiKey | JSON | [Get API key](https://exa.ai/docs/team-management-spec.yaml) |
| `updateApiKey` | PUT | `https://admin-api.exa.ai/team-management/api-keys/{id}` | x-api-key: separate teamApiKey | JSON | [Update API key](https://exa.ai/docs/team-management-spec.yaml) |
| `deleteApiKey` | DELETE | `https://admin-api.exa.ai/team-management/api-keys/{id}` | x-api-key: separate teamApiKey | JSON | [Delete API key](https://exa.ai/docs/team-management-spec.yaml) |
| `getApiKeyUsage` | GET | `https://admin-api.exa.ai/team-management/api-keys/{id}/usage` | x-api-key: separate teamApiKey | JSON | [Get API key usage](https://exa.ai/docs/team-management-spec.yaml) |

### Tavily

| Native method | HTTP | Fixed endpoint | Authentication/access | Response | Official contract |
| --- | --- | --- | --- | --- | --- |
| `crawl` | POST | `https://api.tavily.com/crawl` | Bearer | JSON | [Initiate a web crawl from a base URL](https://docs.tavily.com/documentation/api-reference/endpoint/crawl.md) |
| `deactivateKeys` | POST | `https://api-key-generator.tavily.com/deactivate-keys` | Bearer; Enterprise | JSON | [Deactivate API Keys](https://docs.tavily.com/documentation/enterprise/deactivate-keys.md) |
| `extract` | POST | `https://api.tavily.com/extract` | Bearer or explicit keyless header | JSON | [Retrieve raw web content from specified URLs](https://docs.tavily.com/documentation/api-reference/endpoint/extract.md) |
| `feedback` | POST | `https://api.tavily.com/feedback` | Bearer; beta | JSON | [Submit feedback on a search request or session](https://docs.tavily.com/documentation/api-reference/endpoint/feedback.md) |
| `generateKeys` | POST | `https://api-key-generator.tavily.com/generate-keys` | Bearer; Enterprise | JSON | [Generate API Keys](https://docs.tavily.com/documentation/enterprise/generate-keys.md) |
| `keyInfo` | GET | `https://api-key-generator.tavily.com/key-info` | Bearer; Enterprise | JSON | [Get Key Info](https://docs.tavily.com/documentation/enterprise/key-info.md) |
| `logs` | POST | `https://api.tavily.com/logs` | Bearer; paid-plan access | JSON | [Get usage logs for your API keys](https://docs.tavily.com/documentation/api-reference/endpoint/logs.md) |
| `map` | POST | `https://api.tavily.com/map` | Bearer | JSON | [Initiate a web mapping from a base URL](https://docs.tavily.com/documentation/api-reference/endpoint/map.md) |
| `orgUsage` | POST | `https://api.tavily.com/org-usage` | Bearer; Enterprise | JSON | [Get organization usage across all API keys](https://docs.tavily.com/documentation/enterprise/org-usage.md) |
| `getResearch` | GET | `https://api.tavily.com/research/{request_id}` | Bearer | JSON | [Get research task status and results](https://docs.tavily.com/documentation/api-reference/endpoint/research-get.md) |
| `research` | POST | `https://api.tavily.com/research` | Bearer | JSON | [Initiate a research task](https://docs.tavily.com/documentation/api-reference/endpoint/research.md) |
| `researchStream` | POST | `https://api.tavily.com/research` | Bearer | SSE | [Initiate a research task](https://docs.tavily.com/documentation/api-reference/endpoint/research.md) |
| `search` | POST | `https://api.tavily.com/search` | Bearer or explicit keyless header | JSON | [Search for data based on a query](https://docs.tavily.com/documentation/api-reference/endpoint/search.md) |
| `getUsage` | GET | `https://api.tavily.com/usage` | Bearer | JSON | [Get API key and account usage details](https://docs.tavily.com/documentation/api-reference/endpoint/usage.md) |
| `getPaymentPricing` | GET | `https://x402.tavily.com/.well-known/pricing` | Public pricing; no API key | raw Response | [Read machine-readable payment pricing; no published stable schema](https://docs.tavily.com/documentation/machine-payments/x402.md) |
| `paidSearch` | POST | `https://x402.tavily.com/search` | External PAYMENT-SIGNATURE; no API key | JSON | [Search using externally supplied payment authorization](https://docs.tavily.com/documentation/machine-payments/x402.md) |

### Brave

| Native method | HTTP | Fixed endpoint | Authentication/access | Response | Official contract |
| --- | --- | --- | --- | --- | --- |
| `llmContext` | GET | `https://api.search.brave.com/res/v1/llm/context` | X-Subscription-Token | JSON | [LLM Context — Web search API for AI agents](https://api-dashboard.search.brave.com/api-reference/ai/llm_context/get) |
| `llmContextPost` | POST | `https://api.search.brave.com/res/v1/llm/context` | X-Subscription-Token | JSON | [LLM Context — Web search API for AI agents](https://api-dashboard.search.brave.com/api-reference/ai/llm_context/post) |
| `answers` | POST | `https://api.search.brave.com/res/v1/chat/completions` | X-Subscription-Token | JSON | [Answers](https://api-dashboard.search.brave.com/api-reference/ai/answers) |
| `answersStream` | POST | `https://api.search.brave.com/res/v1/chat/completions` | X-Subscription-Token | SSE | [Answers](https://api-dashboard.search.brave.com/api-reference/ai/answers) |
| `search` | GET | `https://api.search.brave.com/res/v1/web/search` | X-Subscription-Token | JSON | [Search](https://api-dashboard.search.brave.com/api-reference/web/search/get) |
| `searchPost` | POST | `https://api.search.brave.com/res/v1/web/search` | X-Subscription-Token | JSON | [Search](https://api-dashboard.search.brave.com/api-reference/web/search/post) |
| `localPois` | GET | `https://api.search.brave.com/res/v1/local/pois` | X-Subscription-Token | JSON | [Local POIs](https://api-dashboard.search.brave.com/api-reference/web/local_pois) |
| `poiDescriptions` | GET | `https://api.search.brave.com/res/v1/local/descriptions` | X-Subscription-Token | JSON | [POI descriptions](https://api-dashboard.search.brave.com/api-reference/web/poi_descriptions) |
| `rich` | GET | `https://api.search.brave.com/res/v1/web/rich` | X-Subscription-Token | JSON | [Rich search](https://api-dashboard.search.brave.com/api-reference/web/rich_search) |
| `news` | GET | `https://api.search.brave.com/res/v1/news/search` | X-Subscription-Token | JSON | [News search](https://api-dashboard.search.brave.com/api-reference/news/news_search/get) |
| `newsPost` | POST | `https://api.search.brave.com/res/v1/news/search` | X-Subscription-Token | JSON | [News search](https://api-dashboard.search.brave.com/api-reference/news/news_search/post) |
| `videos` | GET | `https://api.search.brave.com/res/v1/videos/search` | X-Subscription-Token | JSON | [Video search](https://api-dashboard.search.brave.com/api-reference/videos/video_search/get) |
| `videosPost` | POST | `https://api.search.brave.com/res/v1/videos/search` | X-Subscription-Token | JSON | [Video search](https://api-dashboard.search.brave.com/api-reference/videos/video_search/post) |
| `images` | GET | `https://api.search.brave.com/res/v1/images/search` | X-Subscription-Token | JSON | [Image search](https://api-dashboard.search.brave.com/api-reference/images/image_search) |
| `places` | GET | `https://api.search.brave.com/res/v1/local/place_search` | X-Subscription-Token | JSON | [Place search](https://api-dashboard.search.brave.com/api-reference/web/place_search) |
| `suggest` | GET | `https://api.search.brave.com/res/v1/suggest/search` | X-Subscription-Token | JSON | [Suggestions](https://api-dashboard.search.brave.com/api-reference/other/suggestions) |
| `spellcheck` | GET | `https://api.search.brave.com/res/v1/spellcheck/search` | X-Subscription-Token | JSON | [Spell check](https://api-dashboard.search.brave.com/api-reference/other/spell_check) |
