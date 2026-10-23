# searchSDK for .NET

Server-side C# alpha targeting `net10.0`, tested with SDK 10.0.402. Uses `HttpClient` and `System.Text.Json` with no external runtime packages. The NuGet package ID is `SearchSdk`, version `0.1.0-alpha.1`. No package has been published by this work.

The package has three separate surfaces:

- `NormalizedProvider` and `SearchClient`: one-page web results, explicit capabilities, provenance, usage, warnings, attempts, retry and fallback.
- `GatewayClient`: application-owned gateway protocol v1 at an exact HTTPS URL, with request-scoped application token lookup. It never retries POSTs.
- Thirteen generated native clients: 493 named provider operations, typed wire models, provider-specific schemas, response modes and fixed origins. Native methods never retry, poll, paginate, reconnect, provision resources, or negotiate payments automatically.

## Normalized search

```csharp
using SearchSdk;

// Keep this key on your server. The SDK does not log or persist keys.
using var transport = new SearchTransport(new() {
    Timeout = TimeSpan.FromSeconds(10),
    MaxResponseBytes = 10 * 1024 * 1024,
    MaxConcurrency = 4
});
var exa = new NormalizedProvider("exa", serverHeldKey, transport);
var search = new SearchClient(exa);
var response = await search.SearchAsync(
    new SearchRequest("cancellation tokens", Limit: 3,
        IncludeDomains: ["learn.microsoft.com"]), cancellationToken);
foreach (var result in response.Results)
    Console.WriteLine($"{result.Title}: {result.Url}");
```

`SearchRequest` validates nonblank queries and limits 1–20 (default 5); it preserves query whitespace. Domain lists must contain ASCII hostnames with at least two labels, and are lowercased and deduplicated. Empty lists, URLs, ports, wildcards, overlapping include/exclude lists and invalid labels are rejected. `SearchRequest.FromJson` additionally rejects unknown request fields, wrong JSON types and explicit null options. Provider capability checks run across the entire configured fallback chain before dispatch.

| Normalized provider | Include / exclude maxima | Additional restrictions / scope |
| --- | --- | --- |
| Context | 100 / 100 | Query ≤500 UTF-16 units; requests at least 10 upstream results, caps output |
| TinyFish | 100 / 100 | One web page; no native count parameter |
| Exa | 1200 / 1200 | Auto web search, highlights |
| Tavily | 300 / 150 | Basic search; usage requested; no automatic advanced settings |
| Brave | 0 / 0 | Web results and extra snippets; no domain filters |
| Perplexity | 20 / 20 | Include/exclude mutually exclusive; Search API, not generated answers |
| Parallel | 200 / 200 | Include/exclude mutually exclusive; basic search and excerpts |
| Linkup | 100 / 50 | Text searchResults, fast depth; images disabled |
| You | 500 / 5000 | Include/exclude mutually exclusive; web section only |
| Serper | 0 / 0 | Google organic results; no domain filters |
| SerpAPI | 0 / 0 | Synchronous Google organic page; no paid auto-pagination |
| Firecrawl | 100 / 100 | Include/exclude mutually exclusive; query ≤500 UTF-16 units; web only |
| Valyu | 100 / 100 | Web sources only; native pricing is not an SDK estimate |
| SearXNG | 0 / 0 | Explicit trusted HTTPS instance with JSON enabled; one `/search` page |

The Context, TinyFish, Firecrawl and Valyu list ceilings include conservative SDK policy; they are not claims about undocumented native capacities. Unsupported normalized settings fail with `unsupported_option`. Provider scores retain native scales and are not comparable. Unknown usage is `null`. Every result has provider, source URL and retrieval time provenance. Validation covers every upstream result before the output ceiling is applied.

`ValyuSearchOptions` exposes max price, relevance threshold, response length (string or positive integer), fast mode, start/end dates and instructions. Pass it as `valyu:` when constructing the Valyu provider. `SearxngSearchOptions` exposes language, safe search, time range, categories and explicitly supplied reverse-proxy headers; pass it as `searxng:` with `searxngBaseUrl:`. Unsafe HTTP headers are rejected. `NormalizedProvider.SupportedProviders` and each instance's `Capabilities` expose the supported set.

## Deadlines, retries, fallback and batches

```csharp
var fallback = new NormalizedProvider("tavily", anotherServerKey, transport);
var resilient = new SearchClient(exa, [fallback], new SearchPolicy {
    Timeout = TimeSpan.FromSeconds(10),
    AttemptTimeout = TimeSpan.FromSeconds(3),
    Retries = 1,                       // explicit: may incur repeat billing
    RetryDelay = TimeSpan.FromMilliseconds(200),
    MaxConcurrency = 2
});
var outcomes = await resilient.SearchBatchAsync(
    [new("first"), new("second")], concurrency: 2,
    timeout: TimeSpan.FromSeconds(10), cancellationToken: cancellationToken);
foreach (var item in outcomes) {
    if (item.IsSuccess) Consume(item.Value!);
    else HandleSanitizedError(item.Error!.Code);
}
```

Whole-call deadlines include concurrency queues, HTTP dispatch, decoded body reads and parsing. The gateway also includes application token lookup. Cancellation is accepted through `CancellationToken`; a caller cancellation becomes sanitized `aborted`, total deadline becomes `timeout`, and an explicit per-attempt deadline becomes `attempt_timeout`. Cooperative tokens are passed to handlers; waits also stop if an injected asynchronous handler ignores cancellation. No mechanism can stop synchronous application code that blocks before returning a task, or undo remote effects after cancellation.

The default decoded ceiling is 10 MiB, including decompressed responses; it is enforced while reading streams. The default request ceiling is also 10 MiB. `TransportOptions` configures both. Each transport has its own concurrency gate. `SearchClient` adds its whole-operation gate and budget. Batch concurrency is 1–64, defaults to 4, preserves input order and retains successful siblings. A whole-batch timeout includes undispatched items. Batch outcomes expose their original index, value or sanitized error.

Retries default to zero. Explicit retries use `RetryCodes` (default network, unavailable, rate_limit, attempt_timeout) and never shorten Retry-After. A fallback chain must be supplied explicitly; its eligible codes are controlled by `FallbackCodes`. Attempts and fallback warnings are retained. These policies do not promise exactly-once remote side effects. Successful-result caching and in-flight deduplication are not implemented in this alpha.

## Application gateway v1

```csharp
var gateway = new GatewayClient("https://application.example/exact-route", transport,
    async ct => await applicationTokenStore.GetShortLivedTokenAsync(ct));
var result = await gateway.SearchAsync(new("query"), cancellationToken);
```

The URL receives the exact POST route; no suffix is appended. URL credentials, fragments, query strings and non-HTTPS URLs are rejected. Tokens are per request and are not logged or persisted. Use application tokens in apps; provider keys belong on servers. A present `X-SearchSDK-Protocol` header must equal `1`. HTTP 200 success and the sanitized error envelopes are validated against the shared protocol. Result URLs must use HTTP(S) without credentials. Provenance and attempt timestamps must be valid RFC 3339 with four-digit years. Malformed successful payloads become `invalid_response`; malformed error envelopes use the documented HTTP-status mapping. Upstream error bodies and exception messages are never exposed.

## Native operations and models

```csharp
var tavily = new TavilyClient(serverHeldKey, transport);
var native = await tavily.SearchAsync(new TavilySearchInput {
    Body = new TavilySearchBody {
        Query = "cancellation tokens",
        MaxResults = 3,
        IncludeAnswer = NativeUnion<bool, string>.FromSecond("advanced")
    }
}, cancellationToken);
Console.WriteLine(native.Data.Query);
// native.Data.AdditionalProperties preserves provider additions.
```

Each operation has a generated input class with typed `Path`, `Query` and `Body` where schemas are known. JSON wire names use `JsonPropertyName`. Known object fields, nested objects, arrays and primitive types are generated; source-required members use `JsonRequired` during response deserialization. Source enums remain strings to accept future values. `NativeUnion<TFirst,TSecond>` preserves its original `Raw` JSON, supports typed `TryGetFirst`/`TryGetSecond` views, and nests for larger unions. A successful typed view does not prove exclusivity or full JSON Schema validity. Construct union inputs through `FromFirst`, `FromSecond`, or the explicit raw JSON constructor.

All open model objects preserve unknown fields through `AdditionalProperties`. Unconstrained schemas and recursive branches deeper than twelve schema traversals use `JsonElement`; no branch is fabricated. Object-level conditional/required alternatives retain their shared known properties. Native models are wire types, not a full JSON Schema validator: provider-specific ranges, formats, regexes, union discrimination and conditional required-field rules remain provider responsibilities. Basic request shape, required path/query/header/body presence, stream selection, credentials, headers, path escaping, request and response ceilings are enforced locally. Use the raw escape hatch when a provider evolves its schema:

```csharp
var raw = new NativeClient("exa", serverHeldKey, transport);
NativeResponse<JsonElement> response = await raw.CallAsync<JsonElement>("search",
    new NativeInput { Body = new { query = "query", type = "auto" } }, cancellationToken);
```

`NativeCatalog.Operations` records fixed origins, methods, paths, modes and official source URLs. The raw client still selects a named catalog operation; it does not accept arbitrary upstream URLs. No native surface is claimed for Valyu or SearXNG beyond their normalized adapters.

| Native client | Named operations |
| --- | ---: |
| `BraveClient` | 17 |
| `ContextClient` | 50 |
| `ExaClient` | 74 |
| `FirecrawlClient` | 57 |
| `LinkupClient` | 15 |
| `ParallelClient` | 39 |
| `PerplexityClient` | 35 |
| `SerpApiClient` | 13 |
| `SerperClient` | 26 |
| `TavilyClient` | 16 |
| `TinyfishClient` | 47 |
| `WondersearchClient` | 95 |
| `YouClient` | 9 |

WonderSearch operates on uploaded corpus passages, not open-web normalized search. Exa team-management operations require the separate `teamApiKey` constructor argument. Account features and administrative operations depend on provider access and permissions. The SDK does not sign up accounts or hide native mutations behind normalized calls.

JSON operations return `NativeResponse<T>`; text returns string, binary/empty returns byte arrays, and raw returns bounded `RawResponse` with status, headers and bytes. Native success data and headers can themselves contain sensitive provider data; applications must choose what they log. Multipart inputs accept at most 128 materialized `MultipartPart` values. All parts and encoded overhead count toward the request ceiling. SerpAPI image uploads append the configured key without modifying the caller's parts, and reject an alternate key field.

SSE methods return `IAsyncEnumerable<ServerSentEvent>`. Dispatch and the total deadline start when enumeration begins. Only one enumeration is allowed per returned sequence, and no reconnection or replay occurs. Events are decoded incrementally across UTF-8 chunk boundaries; multiline data, CR/LF framing, IDs, event names, comments and retry hints are supported. An incomplete final event is discarded. Retry hints are data, not reconnect instructions. Total stream bytes are bounded, MIME must be `text/event-stream`, and early enumeration disposal closes the response and releases concurrency.

`ContextClient.LogoUrl` builds a public embedding URL without downloading an image; `HeadLogoAsync` inspects public headers without a provider key. Respect Context's restrictions on downloading, persisting and rehosting Logo Link images. `TavilyClient.GetPaymentPricingAsync` returns bounded raw pricing metadata; `PaidSearchAsync` forwards externally obtained `PAYMENT-SIGNATURE` (or legacy `X-PAYMENT`) to the isolated x402 host and requires an external payment header. It never signs, negotiates, authorizes, or retries charges; explicit search depth must be advanced. Ordinary Tavily calls may use the provider's keyless mode when the key is null.

## HTTP isolation and lifetime

Reuse one `SearchTransport` per bounded workload and dispose it when work has stopped. The default owned `SocketsHttpHandler` disables redirects, proxies, cookies, preauthentication and ambient credentials; automatic decompression is enabled. Only explicitly configured credentials are added to fixed provider origins. Native caller headers cannot override authentication or HTTP framing. Redirect responses are terminal and never forward credentials.

For deterministic tests or an application-managed network stack, inject an `HttpMessageHandler`. This is a trusted boundary: the application must disable redirects, ambient credentials, cookies and proxies in that handler. The transport owns and disposes the supplied handler. Do not share that handler with another client. Neither `GatewayClient` nor provider instances own the transport.

## Build, test and pack

From the repository root, with a .NET 10 SDK and the Node version in `.nvmrc`
available on PATH:

```sh
dotnet --version
node --version
packages/dotnet/scripts/verify.sh
```

On Linux/CI, select the Node version in `.nvmrc` and install a .NET 10 SDK on PATH, then run the same script. `NODE` and `DOTNET` may specify executable overrides. The generator resolves Node from `NODE` or `PATH`; it contains no machine-specific executable path. No npm install is required for this package's dependency-free generator.

`verify.sh` runs deterministic generation check mode, locked restore with cleared external package sources, Release build with `/m:2`, the no-package console test harness, `dotnet pack`, metadata/license/README/XML-doc checks, and an installed consumer from the actual `.nupkg` in a new isolated local feed and cache. Its first fresh-consumer restore records that exact artifact's content hash; it then repeats restore in locked mode before build/run. The consumer has a `PackageReference` and no `ProjectReference`. The script preserves its artifact directory under `.local/verify.*` for inspection. SDK/runtime packs must already be installed; verification does not install workloads or contact providers. CLI state, caches and scratch artifacts stay under this package's ignored `.local/` directory; build outputs are ignored `bin/obj` directories.

Regenerate explicitly with `python3 -B packages/dotnet/scripts/generate.py`; verify with `--check`. [SOURCES.md](SOURCES.md) and `native-manifest.json` retain artifact hashes and official attribution. Tests directly consume all shared fixtures from `sdk-contract/fixtures`, including all 24 provider cases, gateway success/error fixtures and request validation cases. The deterministic harness also checks all 493 operation identities and dispatches each HTTP operation against injected fixtures, plus representative typed model/union decoding, credential non-disclosure, deadlines, cancellation, response limits, batches, retry/fallback, multipart, SSE and real loopback HTTP with gzip/redirect behavior.

Tests do not establish live provider compatibility or account access. No live provider call, external infrastructure, publishing or deployment is part of verification. NativeAOT and trimming have not been verified; reflection-based `System.Text.Json` and union converters are used, so no trim/AOT compatibility claim is made. The distributable targets .NET 10 only; no other framework target has been verified.
