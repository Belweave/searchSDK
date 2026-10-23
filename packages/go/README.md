# searchSDK for Go (alpha)

Standard-library-only, server-side search SDK. Module:
`github.com/Belweave/searchSDK/packages/go`. Import name: `searchsdk`.
Minimum Go: **1.23.0**. Development verification uses installed **Go 1.27.3**.
There are no runtime or development Go module dependencies.

This package has three distinct APIs:

- `NewAdapter` and `New`: normalized web results from 14 providers, with mandatory
  provenance and a conservative, explicit capability matrix.
- Generated native clients: 493 retained bindings across 13 providers, preserving
  provider request fields, response data, endpoint families, and source URLs.
- `NewGateway`: application gateway protocol v1 for mobile/browser-facing code.
  Provider calls and provider keys must stay on servers. This client takes a
  short-lived application token per request, never a provider key.

## Normalized search

```go
provider, err := searchsdk.NewAdapter("exa", searchsdk.AdapterOptions{
    APIKey: os.Getenv("EXA_API_KEY"), // server only
})
if err != nil { return err }
client, err := searchsdk.New(searchsdk.Config{Provider: provider})
if err != nil { return err }
ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
defer cancel()
response, err := client.Search(ctx, searchsdk.Request{
    Query: "search SDK", Limit: 5, IncludeDomains: []string{"example.org"},
})
```

`Request.Limit == 0` means 5 for the typed Go API; explicit JSON zero and null
are rejected by `ParseRequest`. Use `ParseRequest` at untrusted JSON boundaries:
unknown fields are rejected. Queries are preserved, must be nonblank, and must
be valid UTF-8. Limits are 1–20. Domain lists contain ASCII hostnames, are
lowercased and deduplicated, and cannot overlap. A non-nil empty list is invalid.

Results expose URL, optional title/snippet/highlights/score, and mandatory
provider, source URL, retrieval timestamp and optional provider request ID.
Unknown usage is nil/JSON null; scores remain provider-native and are not
comparable across providers. A result ceiling does not imply a provider will
return that many hits. One request/page is dispatched; no implicit pagination.

| Normalized provider | Include / exclude maxima | Both lists together | Query ceiling (UTF-16 units) | Supported surface |
| --- | ---: | :---: | ---: | --- |
| context | 100 / 100 | yes | 500 | Web search; asks for at least 10, caps normalized output |
| tinyfish | 100 / 100 | yes | — | One web page; no invented count parameter |
| exa | 1200 / 1200 | yes | — | Auto search, highlights |
| tavily | 300 / 150 | yes | — | Basic search, restrictive include mode, usage |
| brave | 0 / 0 | no filters | — | Web search and extra snippets |
| perplexity | 20 / 20 | no | — | Search API web results, not generated answers |
| parallel | 200 / 200 | no | — | Basic search; source policy, excerpts |
| linkup | 100 / 50 | yes | — | Fast text searchResults; images disabled |
| firecrawl | 100 / 100 | no | 500 | v2 web source, highlights disabled |
| you | 500 / 5000 | no | — | Web section and snippets only |
| serper | 0 / 0 | no filters | — | Organic search results |
| serpapi | 0 / 0 | no filters | — | Synchronous Google organic page |
| valyu | 100 / 100 | yes | — | Web-only search; optional typed search settings |
| searxng | 0 / 0 | no filters | — | One JSON page from an explicitly selected HTTPS instance |

Some maxima are conservative SDK policies rather than provider-published limits
(TinyFish, Firecrawl, Valyu, and the documented alpha subset). Unsupported options
are rejected before dispatch across the entire fallback chain. WonderSearch is
corpus-native only; it is not advertised as a normalized web provider.

`AdapterOptions.Valyu` exposes max price, relevance threshold, response length,
fast mode, dates and instructions. `AdapterOptions.SearxNG` requires `BaseURL`;
it supports reverse-proxy headers, language, safe search, time range and
categories. An instance must have JSON enabled. No instance discovery or query
operator synthesis is performed. Normalized adapters do not expose raw-provider
add-on methods; use the retained native clients where one exists.

## Cancellation, retries, fallback and batches

Defaults: a 10-second whole-call deadline, a 10 MiB decoded response cap, and at
most 8 active operations per client/HTTP adapter. `HTTPOptions` configures the
transport cap/deadline/concurrency; `Config` configures normalized orchestration.
The earlier caller deadline always wins. `AttemptTimeout` bounds each provider
attempt, including transport and normalization. Queue time and retry backoff
count toward the whole-call budget. Custom `Provider` and `RoundTripper`
implementations must honor `context.Context`; the SDK does not create detached
workers to conceal an implementation that ignores cancellation.

Retries and fallback are off by default. A `RetryPolicy` permits at most five
additional attempts per provider. Only network, unavailable, rate-limit and
attempt-timeout errors are eligible. Exponential delays honor Retry-After without
shortening it. Explicit `Fallback` is tried after exhausted eligible failures;
auth, malformed responses and other terminal errors do not trigger fallback.
Repeated requests can incur repeated billing; no exactly-once remote guarantee is
made. Cache and in-flight deduplication are intentionally absent in this alpha.

```go
client, err := searchsdk.New(searchsdk.Config{
    Provider: primary, Fallback: []searchsdk.Provider{secondary},
    Timeout: 5*time.Second, AttemptTimeout: 2*time.Second,
    Retry: searchsdk.RetryPolicy{MaxRetries: 1}, // explicit billing decision
    MaxConcurrency: 2,
})
outcomes, err := searchsdk.SearchBatch(ctx, client, []searchsdk.Request{
    {Query: "one"}, {Query: "two"},
}, searchsdk.BatchOptions{Concurrency: 2})
```

Batch outcomes preserve input order and contain either `Value` or sanitized
`Error`. Failed siblings do not discard successful results. Batch workers are
bounded to 1–64; the default is 4. Batch timeout defaults to the client timeout
(or 10 seconds for a custom `Searcher`). Authentication for batched gateway
requests can be supplied through an application-defined `Searcher` wrapper that
calls `SearchWithToken` per request.

Use `errors.As(err, &sdkError)` with `var sdkError *searchsdk.Error`. Only stable
codes, numeric status/retry metadata, and sanitized normalized attempt metadata
are exposed. SDK errors do not wrap upstream error text, URLs, credentials,
request queries or response bodies. Returned native payloads remain provider
data, so applications should apply their own data/logging policy to them.

## Gateway protocol v1

```go
gateway, err := searchsdk.NewGateway("https://app.example/api/search", searchsdk.HTTPOptions{})
if err != nil { return err }
response, err := gateway.SearchWithToken(ctx, searchsdk.Request{Query: "search"}, appToken)
```

The endpoint is used exactly, without a path suffix. Credentials, fragments,
queries and non-HTTPS endpoints are rejected. Requests are JSON POSTs. Tokens are
not stored by the client. Redirects are never followed, including same-origin
redirects, and no cookie jar or ambient authentication is used. An injected
transport is trusted application code and must preserve that policy.

Success requires HTTP 200 and a validated normalized response. A missing
`X-SearchSDK-Protocol` header is accepted; any present version other than `1` is
rejected. Provenance, usage, warnings, attempt metadata, URLs, numeric values and
optional reuse are checked. Failure envelopes consume only sanitized contract
fields; malformed envelopes fall back to status-based codes. Gateway POSTs are
never retried. Backend retry/fallback decisions belong to the application.

## Native clients

Construct `NewContextClient`, `NewTinyFishClient`, `NewExaClient`,
`NewTavilyClient`, `NewBraveClient`, `NewPerplexityClient`, `NewParallelClient`,
`NewLinkupClient`, `NewFirecrawlClient`, `NewYouClient`, `NewSerperClient`,
`NewSerpAPIClient`, or `NewWonderSearchClient` with `NativeOptions`. Every client
exposes named operations, `Operations()` for discovery, and `Call` for open native
inputs. The catalog covers all retained bindings, not every possible undocumented
provider endpoint or every engine-specific SerpAPI schema.

| Native provider | Retained bindings |
| --- | ---: |
| context | 50 |
| tinyfish | 47 |
| exa | 74 |
| tavily | 16 |
| brave | 17 |
| perplexity | 35 |
| parallel | 39 |
| linkup | 15 |
| firecrawl | 57 |
| you | 9 |
| serper | 26 |
| serpapi | 13 |
| wondersearch | 95 |
| **Total** | **493** |

```go
native, err := searchsdk.NewExaClient(searchsdk.NativeOptions{APIKey: serverKey})
if err != nil { return err }
result, err := native.Search(ctx, searchsdk.ExaSearchInput{
    Body: &searchsdk.ExaSearchBody{Query: "search SDK"},
})
// result.Data is the generated wire representation; result.Raw preserves the
// complete JSON, including fields unknown to this snapshot.
```

Bodies, paths, queries, response structures and native header parameters are
schema-derived where a useful Go structure exists. Optional scalar fields use
pointers (`searchsdk.Ptr(false)` preserves an explicit false). Schemas with unions
use `json.RawMessage` and generated `VariantN` types where available; `JSON(value)`
encodes a selected variant. Native JSON types are transport assertions, not full
runtime JSON Schema validation: ranges, enums, conditional rules and open-object
extensions remain the caller/provider's responsibility. For explicit nulls or
additional fields outside a typed structure, use `Call` with maps or raw JSON.
All JSON responses preserve original bytes in `Raw` / `NativeResult.Data`.

```go
result, err := native.Call(ctx, "search", searchsdk.NativeInput{
    Body: map[string]any{"query": "search SDK", "numResults": 3},
})
```

Typed inputs offer `ExtraQuery`, typed `Query`/`Path` where applicable,
`HeaderParameters` for documented headers, and ordinary `http.Header` for
supplemental headers. Typed parameters take precedence. Query arrays repeat
unless the retained source declares comma encoding (including Context arrays);
deep object values use bracket notation. Path substitutions are escaped as single
segments. Missing/extra paths, dot segments, invalid header values, cookie headers
and credential overrides are rejected. All origins/base paths are pinned by the
retained operation; arbitrary-URL requests are not exposed.

Raw/multipart operations take `RawBody []byte`; build multipart data with
`mime/multipart` and pass its exact boundary in Content-Type. SerpAPI image upload
adds its factory API key to a copied multipart body and rejects caller-supplied
`api_key` fields. Serper GET operations pin `apiKey` in the query; SerpAPI pins its
own `api_key` and engine aliases. Exa administration calls require the separate
`TeamAPIKey`, which is never forwarded to the public search host.

JSON, text, byte, buffered raw/header and SSE responses are supported. SSE returns
`*SSEStream`; call `Next()` until `io.EOF`, and always `Close()` on early exit.
Lifetime, decoded bytes and active connection slots remain bounded even when a
stream is never consumed. Cancellation closes a blocked reader. SSE preserves
multi-line data, event IDs and retry metadata; it does not reconnect or replay.
Only identity/gzip content encodings are supported; unsupported encodings fail.

Native retries require both an explicit client `RetryPolicy` and the retained
operation's `Retryable` declaration. Mutating operations are not replayed.
SerpAPI billed search GETs and pixel-position operations retain their conservative
nonretryable declarations. SSE never retries after establishment. There is no
automatic pagination, polling, arbitrary URL upload/download or payment signing.

Supplemental Context `LogoUrl` constructs an embedding URL without fetching;
`HeadLogo` inspects public headers without sending the API key. Provider usage
rules prohibit downloading, persisting or rehosting Logo Link images. Tavily
supports explicit `AccessMode: "keyless"` for Search/Extract only, plus externally
authorized `PaidSearch` and `GetPaymentPricing` on the separate x402 host. Supply
an externally obtained PAYMENT-SIGNATURE when needed; the SDK never signs a
payment or automatically handles/replays a challenge.

## Reproducibility, testing and module consumption

From the repository root (no npm install or live keys required):

```sh
export PATH="$HOME/.nvm/versions/node/v24.22.1/bin:$PATH"
export GOMAXPROCS=2
export GOCACHE="$PWD/packages/go/.local/cache"
export GOMODCACHE="$PWD/packages/go/.local/mod"
export GOTMPDIR="$PWD/packages/go/.local/tmp"
mkdir -p "$GOTMPDIR"
go version
python3 -B packages/go/internal/generate/generate.py --check
go -C packages/go test -race -p 2 ./...
go -C packages/go vet -p 2 ./...
go -C packages/go build -p 2 ./...
python3 -B packages/go/internal/verify_consumer.py
```

Regenerate with `go -C packages/go generate` or the Python generator without
`--check`. Generation needs Python 3 and the retained monorepo source directories.
It verifies source digests, evaluates the existing source emitters using an
in-memory write overlay, and writes only this package. No upstream source,
TypeScript output, shared contract or catalog is modified. `--check` compares
expected outputs without writing. Generated files carry source URLs; the shipped
`native_sources.json` records exact input digests. See `NOTICE.md`.

Tests consume packaged copies of the shared contract fixtures and compare them
byte-for-byte with monorepo originals when available. Coverage includes all 24
normalized golden wires, all 493 native dispatch bindings, request/gateway error
fixtures, malformed responses/encoding, capability preflight, deadlines,
cancellation, bounded concurrency, retry/fallback, gzip caps, path/header safety,
credential non-disclosure, multipart and SSE cleanup. Actual TLS loopback tests
exercise net/http behavior. Fixtures do not establish live provider conformance.
No test invokes a paid provider or creates infrastructure.

`verify_consumer.py` builds a local Go module proxy zip under `.local`, downloads
it into an isolated module cache, and runs an external consumer and the installed
package tests with no `replace` directive and no network. It verifies that Go
resolved the downloaded artifact rather than the checkout. Its synthetic local
version is not a release. Run `go -C packages/go run ./examples/fixture` for the
standalone deterministic example.

This is a subdirectory module. When a release is deliberately prepared by the
repository owner, a module version `v0.1.0-alpha.1` uses the Git tag
`packages/go/v0.1.0-alpha.1` (including the subdirectory prefix), then consumers
can request `github.com/Belweave/searchSDK/packages/go@v0.1.0-alpha.1`. No tag,
publication or availability of that version is implied by this alpha source.
For an unpublished local checkout, a consumer may temporarily use a Go workspace
or a local replace; the verification above intentionally tests a real module zip.

## Remaining boundaries

No live provider verification, cache/deduplication, full JSON Schema validator,
provider-side signing, automatic side-effect recovery, or generated native Valyu/
SearXNG catalog is claimed. Valyu and SearXNG have complete supported normalized
adapters; their wider APIs are outside the 13 retained native catalogs. Large
raw requests are caller-buffered rather than streaming uploads. Custom provider
or transport code must honor cancellation and avoid recording credentials.
