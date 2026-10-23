# searchSDK for C

C11 alpha, version `0.1.0-alpha.1`, public ABI version 1. This package provides
normalized search, provider-native operations, and an application gateway client.
Provider calls belong in trusted server processes. Browser and device clients
should call an application-owned gateway using an application token.

The core has no third-party runtime dependencies: it uses the C library and POSIX
clocks, locales, and threads. The optional HTTPS adapter uses system libcurl
7.85 or newer with TLS verification enabled. This package does not alter the
TypeScript SDK's zero-runtime-dependency contract.

## Build, install, and consume

From the repository root (Node is not required by this C package):

```sh
xcodebuild -version  # on macOS: verify the selected Apple toolchain
cmake -S packages/c -B packages/c/localbuild/release \
  -DCMAKE_BUILD_TYPE=Release -DSEARCHSDK_TESTS=OFF \
  -DCMAKE_INSTALL_PREFIX="$PWD/packages/c/localbuild/prefix"
cmake --build packages/c/localbuild/release -j2
cmake --install packages/c/localbuild/release
```

CMake consumers use `find_package(searchsdk 0.1 CONFIG REQUIRED)` and link
`searchsdk::searchsdk`. Link `searchsdk::curl` to include the optional transport;
it brings in the core and `CURL::libcurl`. Set `SEARCHSDK_CURL=OFF` for a core-only
build. `BUILD_SHARED_LIBS=ON` selects shared libraries. Headers are in
`<searchsdk/searchsdk.h>`, `<searchsdk/native.h>`, and `<searchsdk/curl.h>`.

The installed pkg-config packages are `searchsdk` and `searchsdk-curl`:

```sh
export PKG_CONFIG_PATH="$PWD/packages/c/localbuild/prefix/lib/pkgconfig"
cc application.c $(pkg-config --cflags --libs --static searchsdk-curl)
```

`examples/consumer.c` is a runnable, offline consumer of installed artifacts. It
exercises gateway serialization, shared request cases, ownership after client
freeing, and generated operation descriptors. It uses no internal headers.
`packages/c/scripts/verify-package.sh` builds, installs, runs that consumer,
creates a CPack `.tar.gz`, extracts it, and builds/runs the consumer again against
the extracted distribution. It also checks pkg-config linkage when available.
Each run uses a fresh ignored `packages/c/localbuild/package-check.XXXXXX/`
directory so stale CMake/CPack artifacts cannot affect later runs. The verified
archive path is printed at the end. No package is published.

## API and ownership

The public header is the normative API reference. Every entry point has C linkage
when included from C++. Initializers set the versioned structures' `struct_size`;
do not construct a partially initialized config or call-options structure.
ABI 1 uses fixed public layouts; future incompatible layouts require a new ABI.
Opaque handles keep implementation details outside wrappers and applications.

* `ssk_client_new` copies its provider/gateway URL and provider-settings JSON.
  The transport function and its context are borrowed until the client is freed.
* Every call borrows its input JSON, optional raw bytes, options, credential, and
  cancellation handle until the synchronous call returns. Credentials are
  request-scoped, never saved in clients, written to disk, or logged by the SDK.
* `ssk_response_free`, `ssk_error_free`, `ssk_json_free`, and `ssk_cancel_free`
  each free the corresponding owned object. `ssk_free` frees strings returned by
  `ssk_json_encode`. Do not use `free` on a borrowed string or JSON child.
* Response JSON, raw bytes, and header accessors return borrowed pointers valid
  until response freeing. Responses/errors are independent of the client and may
  outlive it. JSON children/strings live until the JSON root is freed.
* `ssk_json_size` counts array elements or object members. Strings have an
  explicit byte-length accessor; general JSON strings preserve embedded NUL.
  Consumed protocol strings reject embedded NUL. Missing/wrong-type accessors
  return NULL, zero, -1 (`type`), or NaN (`number`) as documented by their types.
* Operation descriptors, provider capabilities, error names, and static error
  messages have process lifetime. Use only catalog-owned operation pointers.
* Output pointers are cleared at entry. Error output may be NULL. Allocation
  failure returns `configuration`; under allocation failure the error object may
  also be NULL. A successful empty batch returns a NULL outcome array.

Clients and responses are immutable after calls return. Multiple threads may use
one client if its transport context is thread safe. No call may race a free of
its client, inputs, response, JSON, or transport context. Cancellation uses a C11
atomic flag: any thread can trigger it. It has no reset; create another token for
another cancellation lifetime. Keep it alive until all observing calls return.
SSE callbacks run on the thread executing the transport write. Callback arguments
are borrowed for that callback only. Do not free the client/cancellation token or
reenter the same mutable transport context from a callback.

## Normalized search

```c
#include <searchsdk/searchsdk.h>
#include <searchsdk/curl.h>
#include <curl/curl.h>

/* In a server process; key is acquired by the application, never embedded here. */
ssk_code search_example(const char *key) {
    ssk_config config;
    ssk_config_init(&config);
    config.provider = "exa";
    config.transport = ssk_curl_transport;
    ssk_client *client = NULL;
    ssk_error *error = NULL;
    ssk_code code = ssk_client_new(&config, &client, &error);
    ssk_response *response = NULL;
    if (code == SSK_OK) {
        ssk_call_options options;
        ssk_call_options_init(&options);
        options.credential = key;
        code = ssk_search(client, "{\"query\":\"C11 ownership\",\"limit\":3}",
                          &options, &response, &error);
        /* Inspect ssk_response_json(response) on success. */
    }
    ssk_response_free(response);
    ssk_error_free(error);
    ssk_client_free(client);
    return code;
}
/* Application startup: curl_global_init(CURL_GLOBAL_DEFAULT) before threads.
 * Application shutdown: curl_global_cleanup() after every curl call finishes. */
```

`ssk_request_normalize` validates the shared request JSON shape: nonblank query,
integer limit 1–20 (default 5), nonempty ASCII hostname arrays, lowercase domain
normalization, deduplication, and no overlapping include/exclude domains. Unknown
request fields are rejected. Queries are preserved, including their whitespace.
Provider capabilities are enforced before dispatch; domain operators are never
silently synthesized into a query. The output ceiling applies to normalized
results. Every upstream row is validated before the final result list is sliced.

All 14 normalized adapters are supported, with these explicit SDK limits:

| Provider | Include / exclude maximum | Both lists | Normalized subset |
| --- | --- | --- | --- |
| Exa | 1200 / 1200 | Yes | Auto search with highlights, native score, USD usage |
| Tavily | 300 / 150 | Yes | Basic web search, restrictive includes, credit usage |
| Brave | Unsupported | — | Web results, descriptions and extra snippets |
| Context | 100 / 100 | Yes | Web search; query ceiling 500 UTF-16 units; native minimum 10 |
| TinyFish | 100 / 100 | Yes | First web-search page; no invented count parameter |
| Firecrawl | 100 / 100 | No | Web search; query ceiling 500 UTF-16 units; credit usage |
| Parallel | 200 / 200 | No | Basic web search with excerpts |
| Perplexity | 20 / 20 | No | Search API web results, separate from generated answers |
| Serper | Unsupported | — | Google organic results and credit usage |
| SerpAPI | Unsupported | — | Synchronous Google organic results; one page |
| You | 500 / 5000 | No | Web section; description/snippet fallback; excludes news hits |
| Linkup | 100 / 50 | Yes | Fast text searchResults; no media or structured answers |
| Valyu | 100 / 100 | Yes | Web only; native relevance score and USD deduction |
| SearXNG | Unsupported | — | Operator-selected HTTPS instance, first general JSON page |

Some limits are conservative SDK policies, as in the TypeScript reference.
Results preserve HTTP(S) URL, optional title/snippet/highlights/score, and mandatory
provider/source URL/retrieval-time provenance. Provider request IDs, usage, and
warnings are validated and retained when supported. Unknown usage is JSON null.
Retrieval time is the SDK's UTC clock, not publication time. `retrieved_at` can
supply a validated RFC3339 timestamp for deterministic fixtures.

`provider_options_json` accepts settings for these two normalized adapters only:

* Valyu: `maxPrice` (positive), `relevanceThreshold` (0–1), `responseLength`
  (`short`, `medium`, `large`, `max`, or a positive safe integer), `fastMode`
  (boolean), `startDate`/`endDate` (valid ordered YYYY-MM-DD), and nonblank
  `instructions` (at most 500 UTF-16 units). These retain provider-native meaning.
* SearXNG: required `baseUrl` (HTTPS, optional base path, no query/fragment/userinfo),
  optional reverse-proxy `headers`, `language`, `safeSearch` (0–2), `timeRange`
  (`day`, `month`, `year`), and 1–20 `categories`. The SDK appends `/search`.
  Host/cookie/hop-by-hop/content-type/accept headers cannot be overridden.

For example: `{"baseUrl":"https://search.example.org/base","safeSearch":1}`.
Other providers reject nonempty provider settings. Specialized TypeScript raw
search helpers, caching, deduplication, custom normalized adapters, and durable
job orchestration are outside this C alpha. Native responses retain raw provider
fields; normalized calls intentionally return the supported common subset.

## Deadlines, cancellation, retries, fallback, and batches

The default whole-call deadline is 10 seconds, including parsing and retries.
`attempt_timeout_ms` can shorten an individual normalized attempt. Call options
can shorten or replace the client whole-call timeout. Deadlines use a monotonic
clock; durations are not affected by changes to wall time. Cancellation wins when
both cancellation and timeout are observed. `attempt_timeout` differs from the
whole-call `timeout` error.

Decoded responses default to a 10 MiB ceiling. The configured ceiling may be
lowered; this alpha deliberately caps it at 10 MiB. JSON inputs/raw request bodies
also have a 10 MiB ceiling. JSON has a 64-level nesting bound and 262144-node bound.
Response headers have 64 unique names, 65536 aggregate bytes, and per-field
bounds. Oversize or malformed responses return `invalid_response`.

Retries default to zero. `max_retries` explicitly enables up to 8 extra
**normalized read-only** attempts. Transient network, rate-limit, unavailable, and
attempt-timeout errors are eligible. Backoff starts at `retry_delay_ms` (default
100), doubles to 5000 ms, and never shortens a parsed Retry-After delay. A delay
that exhausts the remaining call budget returns timeout without another call.
Retries can incur repeated billing. There is no exactly-once remote guarantee.
Native requests, including native POST searches and mutations, are never replayed
automatically, even if the client has a normalized retry policy. Gateway POSTs
are never retried and gateway configuration rejects a retry policy.

`ssk_search_chain` is an explicit provider fallback API. It validates the request
against every provider's capabilities before any dispatch. It uses the first
client/call's whole-call budget, tries configured providers only for transient
failures, retains all attempts, and adds `fallback_used` when a later provider
succeeds. Auth, validation, malformed-response, and ordinary provider errors are
terminal. Pass one initialized call-options structure per provider to supply
separate request-scoped credentials. Gateways cannot join a provider chain.

`ssk_search_batch` dispatches independent calls with 1–64 workers and returns
ordered outcomes. Each error is local to that item; successful siblings survive.
The entire batch has one deadline, so queue time consumes its budget. The alpha
accepts at most 4096 inputs per batch. Worker creation failure reduces parallelism;
the caller thread continues processing. All workers are joined before returning.
Free the result array with `ssk_batch_free`. Across unrelated calls there is no
implicit global scheduler; the application controls its overall concurrency.

## Application gateway protocol 1

Set `gateway_url` instead of `provider`. It is the exact application-owned HTTPS
URL; no path is appended. URL credentials, query strings, fragments, whitespace,
and backslashes are rejected. `options.credential` is an optional application
access token sent as `Authorization: Bearer …`; it is never a provider key.
The client posts the normalized request with `Content-Type: application/json`.
It accepts an absent `X-SearchSDK-Protocol`, accepts `1`, and rejects other values.

HTTP 200 must contain the complete shared SearchResponse. Consumed fields,
including provenance, URLs, finite numbers, usage, warnings, reuse, and attempts,
are validated. Protocol timestamps must be RFC3339; arbitrary Date.parse-style
strings accepted by JavaScript are deliberately not accepted by this C parser.
Malformed successful responses produce `invalid_response`. A valid gateway error
envelope supplies an allowed error code, sanitized attempts, optional status and
retry delay. Unknown error-envelope fields are discarded. Missing/malformed
error envelopes map 401/402/403/432/433 to auth, 429 to rate_limit, 408/5xx to
unavailable, and other non-2xx statuses to provider_error. Error APIs expose static
messages and sanitized metadata only, never upstream bodies, queries, exception
text, request URLs, or authorization headers.

## Provider-native operations

`native.h` exposes 493 generated operation-specific descriptor accessors, such as
`ssk_op_context_headLogo()` and `ssk_op_parallel_createTaskRun()`. They preserve the
retained source's operation spelling. `ssk_operation_at` enumerates the catalog;
`ssk_operation_find(provider, name)` looks up one descriptor. Each descriptor
includes its fixed HTTPS host/base path, method, route, response mode, official
source URL, and machine-readable parameter/body metadata. An arbitrary copied or
caller-created descriptor cannot select another credential destination.

Call `ssk_native_call(client, operation, input_json, raw, raw_size, options, …)`.
Input JSON accepts only `path`, `query`, `headers`, `body`, and `accessMode`:

```c
const ssk_operation *operation = ssk_op_exa_search();
ssk_code code = ssk_native_call(client, operation,
    "{\"body\":{\"query\":\"C11\",\"numResults\":3}}",
    NULL, 0, &options, &response, &error);
```

Native JSON bodies/results preserve provider-native data; they are not normalized
search results. The C API does not claim full JSON Schema validation or generated
C structs for each provider schema. It checks parameter containers, required
parameters/body, primitive declared parameter types/enums, and transport safety.
Ranges, conditional schemas, payload semantics, and provider-specific access
requirements remain provider responsibilities. Inspect the retained schema before
using an operation; a descriptor is not a guarantee of account access.

Path segments are encoded independently. Missing/empty path arguments, dot
segments, unknown path keys, and control characters are rejected. Query scalars
use percent encoding; arrays repeat parameters or use commas when retained source
metadata requires that. One-level object query values use bracket notation as in
the TypeScript A adapters; deeper objects are explicitly unsupported. Unknown
query names are rejected except SerpAPI's documented engine-specific open query.
Header injection and overrides of credential/host/cookie/hop-by-hop/origin headers
are rejected. Serper GET and SerpAPI query credentials are pinned by the SDK.
Exa administration calls take the administration/team key as that call's
credential; ordinary Exa keys are not silently forwarded between hosts.

Every retained response mode is implemented:

* JSON: validated UTF-8 and bounded strict JSON, available through JSON accessors.
  A successful 204/205/HEAD without content yields JSON null.
* Text: bounded validated UTF-8, available as response bytes plus length.
* Bytes/raw: bounded binary data; raw responses also expose status and headers.
* Empty: requires an empty response; returns JSON null.
* SSE: bounded UTF-8 data with event/data/id/retry parsing. `ssk_response_sse`
  parses collected response bytes. `ssk_native_stream` delivers callbacks as
  transport chunks arrive, including chunks splitting lines/UTF-8 characters.
  Multiline data, CR/LF/CRLF, comments, BOM, persistent IDs/retry delays, empty
  fields, and incomplete terminal events follow the SSE event framing rules.
  No reconnect, polling, or replay is performed. A callback may have received
  valid events before a later deadline, invalid byte sequence, or transport error.
* Raw multipart/bytes request bodies: caller supplies the encoded bytes and, for
  multipart, the full Content-Type including boundary. JSON and raw bodies cannot
  be combined. SerpAPI image upload adds its credential form part and rejects a
  caller-supplied credential part; the caller supplies the image part.

Context `logoUrl` returns direct embedding URL bytes without I/O. `headLogo` sends
HEAD and exposes response headers without downloading image bytes. This honors
the provider's prohibition on downloading, persisting, or rehosting Logo Link
images. Neither operation sends a provider credential to the public logo host.

Tavily search/extract can explicitly select `{"accessMode":"keyless",…}` with
no credential; the access-mode header is set by the SDK. Other keyless operations
are rejected. `getPaymentPricing` exposes the documented public x402 host as a
bounded raw response. `paidSearch` accepts an external `PAYMENT-SIGNATURE` header
and advanced-search body. It never signs payments, handles challenges, pays,
retries, or sends the ordinary Tavily key to the payment host.

## Transport contract

`ssk_transport_fn` is synchronous and receives borrowed request fields and a
bounded sink. It must honor `ssk_http_check`, send only the exact selected URL,
reject redirects, omit ambient credentials/cookies, and perform no automatic
retries. It reports status/headers/body through the sink. The sink enforces decoded
byte/header limits and observes cancellation/deadlines. The SDK rejects a late
result from a transport that ignores the deadline, but cannot interrupt an
arbitrary blocking user callback. A blocking injected transport must implement
its own cancellation/deadline enforcement; the SDK never detaches unsafe workers
that continue accessing borrowed inputs.

`ssk_curl_transport` uses a fresh easy handle per call, HTTPS-only protocols,
mandatory peer/hostname verification, explicit headers, no redirects, no automatic
referer, no environment proxy, no netrc, no cookies, and no implicit HTTP auth.
libcurl handles compression, streaming I/O, TLS, and connection establishment.
The sink bounds decoded data, including gzip expansion. Timeout/progress hooks
honor the whole-call deadline and cancellation. `curl_global_init`/cleanup are
application-owned; initialize before starting threads and clean up after joining
them. DNS cancellation latency is subject to the installed libcurl resolver.

Transport context can be NULL for system trust, or point to initialized
`ssk_curl_options` with an explicit PEM `ca_bundle` for application-selected trust.
There is no insecure TLS option. The CA path is borrowed; do not mutate/free it
during active calls. Private test certificates are generated only inside ignored
local build storage. Custom transport functions remain an application trust
boundary and must not log request data.

## Reproducibility, tests, attribution, and alpha limits

```sh
python3 -B packages/c/scripts/generate.py
python3 -B packages/c/scripts/generate.py --check
cmake -S packages/c -B packages/c/localbuild/asan \
  -DCMAKE_BUILD_TYPE=Debug -DSEARCHSDK_SANITIZERS=ON
cmake --build packages/c/localbuild/asan -j2
ASAN_OPTIONS=detect_stack_use_after_return=1 UBSAN_OPTIONS=halt_on_error=1 \
  ctest --test-dir packages/c/localbuild/asan --output-on-failure -j2
packages/c/scripts/verify-package.sh
```

The generator reads `scripts/providers-a/operations.json`, provider B catalogs,
retained schemas, and both provenance manifests. It verifies manifest digests,
never runs another emitter, performs no downloads, and writes only this package.
`operations.json` retains the full operation metadata/source attribution;
`sources.json` records input SHA-256 hashes. Generated C and headers are marked.
The catalog includes 204 A operations and 289 B operations, including aliases and
supplemental logo/x402 operations. SerpAPI catalogs endpoint families rather than
claiming independent verification of every search engine. Provider schemas,
trademarks, and official source documentation retain their owners' attribution.
The JSON codec is handwritten; no third-party parser or parser license is bundled.
The package's MIT LICENSE is copied from the repository root. libcurl is a system
library with its own upstream license; it is not vendored into this package.

The deterministic suite consumes all 24 shared normalized provider golden cases,
request-cases.json, search-success.json, and search-errors.json. It checks native
catalog dispatch/modes for all 493 operations and independent encoding vectors.
It tests malformed/truncated/deep/oversized JSON, malformed UTF-8 and escapes,
parser fuzz inputs, cancellation/deadlines, byte limits, safe retries/fallback,
credential non-disclosure, ordered bounded batches, and ownership. Loopback HTTPS
checks exact authenticated POSTs, TLS trust rejection, redirects, chunking, gzip,
expansion caps, errors, timeouts, and cancellation. These are fixtures and local
transport checks, not live provider verification. No test makes paid calls or
creates remote infrastructure.

Locally verified platform: macOS arm64, Xcode 27.1 / build 27A9275, Apple Clang 21,
CMake, and system libcurl 8.7.1. POSIX/Linux paths are provided but have not been
verified in this task. The Linux implementation uses glibc/musl locale APIs (`newlocale`, `strtod_l`,
`uselocale`), pthreads, `clock_gettime`, `gmtime_r`, `strptime`, `timegm`, and
`inet_pton`; use a modern POSIX toolchain (Ubuntu CI can install `build-essential`,
`cmake`, `libcurl4-openssl-dev`, `pkg-config`, `python3`, and `openssl`). Python 3
and the OpenSSL CLI are verification tools, not SDK runtime dependencies. Static
libcurl linkage additionally needs its platform-specific dependency libraries.
Windows, freestanding C, provider-schema typed structs,
request-body streaming, automatic pagination, remote task polling, persistent
SSE reconnects, payment signing, and live account entitlement verification are
outside this alpha. Native account mutations are exposed deliberately; completion
of a transport call does not promise exactly-once side effects.
