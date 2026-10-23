# searchSDK for C++

C++17 alpha facade over the sibling searchSDK C11 ABI. The core uses the C/C++
standard libraries and system threading only. It does not copy or vendor the C
implementation. Network I/O uses an injected transport or the optional system
libcurl adapter. Version: `0.1.0-alpha.1`; MIT license copied from the repository.

## Build and consume

From the repository root, with CMake 3.20+ and a C11/C++17 toolchain (generation
needs Python 3.9+; the full archive verifier needs Python 3.12+):

```sh
export PATH="$HOME/.nvm/versions/node/v24.22.1/bin:$PATH"
cmake -S packages/cpp -B .local/cpp/build -DCMAKE_BUILD_TYPE=Release
cmake --build .local/cpp/build --parallel 2
ctest --test-dir .local/cpp/build --output-on-failure
cmake --install .local/cpp/build --prefix "$PWD/.local/cpp/install"
cmake -S packages/cpp/examples -B .local/cpp/consumer \
  -DCMAKE_PREFIX_PATH="$PWD/.local/cpp/install"
cmake --build .local/cpp/consumer --parallel 2
ctest --test-dir .local/cpp/consumer --output-on-failure
```

`find_package(searchsdk_cpp 0.1 CONFIG REQUIRED)` exports `searchsdk::cpp`.
The transitive C target is `searchsdk::searchsdk`. The default build composes
`../c` in a private binary directory and installs both packages. To use an already
installed C library, configure `SEARCHSDK_CPP_USE_INSTALLED_C=ON` and supply
`CMAKE_PREFIX_PATH`. An enclosing CMake project can add C first, then C++; the
facade reuses an existing `searchsdk::searchsdk` target. C and C++ libraries must
use compatible compilers, runtime libraries, architecture and sanitizer settings.

`SEARCHSDK_CPP_CURL=ON` also builds/exports `searchsdk::cpp_curl`, requiring the C
package's `searchsdk::curl` target and libcurl 7.85+. Include `searchsdk/curl.hpp`
and assign `config.transport=searchsdk::curl_transport()`. Each returned transport
keeps libcurl global initialization alive through its client copies. Configure it
before application worker threads begin, and destroy clients after joining their
calls. The C adapter uses fresh handles, TLS verification, HTTPS only, no
redirects, no implicit retries, and no ambient proxy/netrc/cookie credentials.
`CurlOptions::ca_bundle` optionally supplies an owned PEM trust-bundle path; TLS
verification remains enabled. The default uses system trust.

## Typed normalized search

```cpp
#include <searchsdk/searchsdk.hpp>
#include <searchsdk/curl.hpp> // optional searchsdk::cpp_curl target

searchsdk::Config config;
config.provider="exa";
config.transport=searchsdk::curl_transport();
searchsdk::Client client(std::move(config));
searchsdk::SearchRequest request{"public technical documentation", 5};
request.include_domains=std::vector<std::string>{"example.org"};
searchsdk::CallOptions call;
call.credential=provider_key_from_request; // server-side, per call
call.cancellation=searchsdk::Cancellation{};
auto result=client.search(request,call);
for (const auto& hit:result.results) {
    use(hit.url,hit.provenance.source_url,hit.provenance.retrieved_at);
}
```

All 14 normalized adapters are available: Context, TinyFish, Exa, Tavily, Brave,
Perplexity, Parallel, Linkup, Firecrawl, You, Serper, SerpAPI, Valyu and SearXNG.
Use lowercase provider IDs (`tinyfish`, `serpapi`, `searxng`). `Client::providers()`
returns supported domain filtering, mutual exclusion, domain capacities and UTF-16
query ceilings. Unsupported filters are rejected before I/O. Normalized requests
support `query`, `limit` 1–20 (default 5), and hostname include/exclude lists.
`Client::normalize(Json)` also validates unknown fields, domains and overlaps.
Results own optional title/snippet/highlights/score, mandatory provenance, usage
(unknown is `std::nullopt`), warnings, attempts and optional reuse metadata.

`Config::provider_options` accepts C-supported settings: SearXNG `baseUrl` (HTTPS,
required), `headers`, `language`, `safeSearch`, `timeRange`, `categories`; Valyu
`maxPrice`, `relevanceThreshold`, `responseLength`, `fastMode`, `startDate`,
`endDate`, `instructions`. Other adapters reject provider options. These options
do not expand the normalized request surface into provider-native APIs.

For application gateway protocol 1, set `gateway_url` to the exact application
HTTPS endpoint instead of `provider`. Supply a short-lived application token in
`CallOptions::credential`; provider keys belong on the application server. URL
credentials, query strings and fragments are rejected. The facade delegates wire
validation, protocol version checks and sanitized gateway error mapping to C.

## Schema-derived provider-native APIs

```cpp
#include <searchsdk/native.hpp>

searchsdk::native::Exa exa(client);
searchsdk::native::ExaSearchBody body;
body.query="public technical documentation";
body.numResults=std::int64_t{3};
body.includeDomains=std::vector<std::string>{"example.org"};
searchsdk::native::ExaSearchInput input;
input.body=std::move(body);
auto response=exa.search(input,call);
// response.data is ExaSearchResponse, with typed result fields.
for (const auto& hit:response.data.results) use(hit.title,hit.url);
auto request_id=response.data.requestId; // optional<string>
auto native_bytes=response.raw.bytes();
```

All **493** retained operations have a generated named method on one of 13 native
classes: `Brave`, `Context`, `Exa`, `Firecrawl`, `Linkup`, `Parallel`, `Perplexity`,
`SerpApi`, `Serper`, `Tavily`, `TinyFish`, `WonderSearch`, `You`. Valyu and SearXNG
have normalized adapters; they have no native inventory in these retained tables.
The generated headers contain schema structs and 426 typed JSON response
bindings. The exact struct count, inventory, official source URLs and retained input
SHA-256 digests are in `native-manifest.json`.

Each `ProviderOperationInput` exposes typed `path`, `query`, `headers`, `body` or
owned `raw_body` as supported by its schema. Required sections/fields are direct
members; optional fields use `std::optional`. Assign the required values before
dispatch, for example `ExaGetWebsetInput request; request.path.id="id";`.
Generated types preserve provider wire field names; C++ keywords gain `_`.
Structs support `.json()` and `::from_json(Json)`. A typed JSON method returns
`wire::Result<ProviderOperationResponse>` with `.data` and owning `.raw` response.

`wire::Nullable<T>` preserves explicit JSON null. For example, an optional nullable
string is `optional<Nullable<string>>`: disengaged means absent, engaged with
`value==nullopt` means null, and an engaged inner value means a string. Primitive
values can be assigned directly to these optional nullable fields.

Codecs validate consumed JSON kinds and required fields; integers use signed
64-bit storage and reject values outside ±(2^53−1), matching the C JSON engine's
exact integer range. Native fields with mixed or unconstrained schemas use owning
`Json`. Compatible object unions project shared required fields and optional
variant fields; ambiguous fields and recursive edges fall back to `Json`.
Unknown object fields are retained in `extra_fields` even for closed upstream
schemas, and survive round trips. Inserting an `extra_fields` key that collides
with a declared field is rejected. Enums remain wire strings, with allowed values
in generated comments. Formats, numeric ranges, patterns, cross-field constraints
and union membership are not complete runtime JSON Schema validation. Consult the
retained schemas for those provider requirements.

Every named method also accepts `NativeInput`, returning owning `NativeResponse`:

```cpp
searchsdk::NativeInput raw;
raw.parameters=searchsdk::Json::parse(R"({"body":{"query":"native search"}})");
auto response=exa.search(raw,call); // explicit generic escape hatch
auto optional_json=response.json();
```

The native envelope is `path`, `query`, `headers`, `body`, plus explicit Tavily
`accessMode` where supported. `Client::native(name,input,call)` is also available.
Fixed hosts, credential destinations, path encoding, query encoding and stream
variants come from C's generated descriptors. Supplying unknown operations,
unsupported encodings, protected headers, or incompatible body modes is rejected.
The current C wire encoder supports scalar query parameters and flat scalar
arrays. Nested/deepObject query values and cookie parameters are unsupported and
rejected; generated schema fields retain their source types so this limitation
remains explicit at dispatch. Operation coverage does not imply every optional
upstream parameter encoding is implemented.
Provider JSON results retain native shapes; they are separate from normalized
search results. A successful generic native call does not assert JSON Schema
conformance. No native operation is retried, including GETs and POST search.

Bytes, text, empty responses and raw response headers remain available through
`NativeResponse`. Multipart input is caller-encoded owned bytes with an explicit
Content-Type/boundary in `extra_headers`; C preserves bytes and handles SerpAPI's
documented credential form field. SSE operations return bounded collected data,
without holding a live socket after return. `.events()` and `.for_each_sse()` return owning event,
data, id and retry values. Returning false stops iteration; a caller exception is
re-thrown safely after the C callback unwinds. No reconnect/replay is attempted.
Context `logoUrl` constructs UTF-8 URL bytes locally; `headLogo` makes HEAD only.
Tavily `paidSearch` accepts external PAYMENT-SIGNATURE authorization; payment
signing/negotiation is outside this SDK. Exa admin operations use that call's team
credential.

For incremental SSE, pass an owning-event callback to the named stream method,
for example `exa.answerStream(input, [](SseEvent e) { consume(e.data); return true; }, call)`.
`Client::stream` provides the generic equivalent. Events arrive synchronously as
transport chunks are written, before the call returns. The same decoded-byte
ceiling and whole-call deadline apply. Returning false aborts with `Code::aborted`;
callback exceptions are rethrown only after the C call unwinds. A later transport
or decode failure can occur after earlier events have been observed. There is no
reconnect or replay. Event payload strings remain provider-native; parse `.data`
explicitly as JSON where that event's provider schema defines JSON.

## Ownership, cancellation and concurrency

`Client` copies share immutable state and an owned transport closure. `Json` is an
immutable shared document; child views retain their root even after the original
response is destroyed. Results, errors, native bytes and SSE events are owning
values. Moved-from clients reject operations; moved-from JSON is null. There are
no public raw-pointer ownership transfers or retained borrowed C response values.

`Cancellation` copies share a thread-safe token. Place one in `CallOptions` and
call `.cancel()` from the controlling thread. Pre-cancellation prevents dispatch.
The default whole-call deadline is 10 seconds; `Config::timeout` and per-call
`CallOptions::timeout` override it. Typed native encoding/decoding shares that
deadline. Limits default to 10 MiB decoded response bytes and may be reduced;
the C engine rejects ceilings above 10 MiB. Per-attempt budgets and opt-in
normalized retries use `attempt_timeout`, `max_retries` (0 default, maximum 8), and
`retry_delay`; Retry-After is never shortened. Repeated remote reads can be billed
again; cancellation does not promise rollback or exactly-once side effects.

`Client::fallback(clients,request,per_client_options)` is explicit, checks the
entire chain's capabilities before dispatch and shares the first client's whole
call budget. Only transient failures advance the chain. Gateways cannot be used
in a fallback chain. `batch(requests,concurrency,options)` accepts concurrency
1–64, with a single batch deadline including queue time and ordered
`variant<SearchResponse,Error>` outcomes. The C engine caps batches at 4,096
items. Failed items preserve successful siblings; worker threads join before the
call returns.

APIs are synchronous; there are no detached threads, hidden executors or async
futures. Applications can submit copied clients/options to their own bounded,
joined executor and retain a cancellation token. A shared custom transport must
be thread-safe for concurrent search or batch use. Do not destroy or mutate the
same client/options object concurrently with a call that uses it.

An injected `Transport` receives an owning `HttpRequest` and copyable
`ResponseWriter`. It must enforce HTTPS/TLS, no credential-bearing redirects,
deadlines, cancellation and decoded-byte bounds while reading. Check
`request.check()` during I/O, write response status/headers, then feed bounded
chunks to the writer. Do not allocate an unbounded body before calling the
writer. Callback exceptions become sanitized network errors. Retained writer
copies reject use after the callback returns; retained request copies report
`aborted`. Transport snapshots contain the per-call wire credentials: never log
or persist them. Per-call credentials are never stored on a Client, and public errors
contain only sanitized code/status/retry/attempt metadata. Strings in externally
owned request/transport copies have normal C++ allocation lifetimes, not a
secure-memory zeroization guarantee.

## Reproducibility and verification

```sh
python3 -B packages/cpp/scripts/generate.py
python3 -B packages/cpp/scripts/generate.py --check
python3 -B packages/cpp/scripts/verify.py
python3 -B packages/cpp/scripts/verify.py --sanitizers
python3 -B packages/cpp/scripts/verify.py --curl
python3 -B packages/cpp/scripts/verify.py --libdir lib/searchsdk-multiarch
```

Generation reads only retained source tables, schemas and provenance in
`scripts/providers-a` and `scripts/providers-b`, verifies retained artifact
digests, writes only this package and requires no network/dependencies. C's
catalog has its own independent generator/check. Verification uses isolated
`.local/cpp` build/install/archive directories and at most two build jobs. It
tests shared request/success/error/provider fixtures directly, all named native
dispatches, typed Exa fields, null/unknown fields, lifetime/copy/move, errors,
credential nondisclosure, cancellation, limits, fallback and bounded batch calls.
It builds an independent consumer from an extracted CPack archive, then rebuilds
the facade against the installed C target. The archive includes the C dependency
when composed from sibling source. An installed-C build's archive requires that
dependency to be installed separately. No automated check calls a provider;
passing synthetic fixtures does not establish live endpoint compatibility.

Remaining boundaries: no live provider verification; no full JSON Schema
validator; no native schema where retained sources provide none; no cache,
in-flight deduplication, durable workflows, or background async/socket APIs. Those
features are not implied by normalized/native operation coverage.
