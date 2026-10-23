# searchSDK Java

Java server SDK with a Java 17 release target and **zero runtime dependencies**.
The package uses JDK `HttpClient`, immutable records, `CompletionStage`, and an
included strict JSON codec. Maven coordinates for this local alpha artifact are
`dev.belweave:search-sdk:0.1.0-alpha.0`. Nothing in this package publishes it.

Three separate surfaces are provided:

- `SearchClient` and `Providers`: normalized web search for all 14 reference adapters.
- Thirteen generated named clients with schema-backed wire models: 493 provider-native operations, including
  JSON, text, bytes, raw responses, incremental SSE and raw/multipart requests.
- `GatewayClient`: protocol v1 client for an exact application-owned HTTPS URL.

Provider credentials belong on application servers. The gateway client accepts
an application access token per request; do not pass provider keys to mobile or
browser applications. Credentials are retained only by explicitly configured
server clients or active request objects. There is no persistence or SDK logging.

## Build and verify

Run from the repository root, with an installed JDK 17 or newer and Python 3:

```sh
bash packages/java/scripts/verify.sh
```

The script checks generated output, compiles with `--release 17 -Xlint:all
-Werror`, runs the deterministic suite, builds binary/source JARs, and compiles
and executes `examples/Consumer.java` against **only the packed JAR**. It also
runs that consumer through the JAR's automatic Java module `dev.searchsdk`.
Compiler/runtime processor counts are bounded at two. All build output stays in
`packages/java/target/`, which is ignored. No Node dependencies are installed.

Maven 3.9+ is an alternative build entry point:

```sh
python3 -B packages/java/scripts/generate-native.py --check
mvn -T 2 -f packages/java/pom.xml verify
mvn -T 2 -f packages/java/pom.xml install
mvn -T 2 -f packages/java/examples/maven-consumer/pom.xml verify
```

`mvn test` runs the dependency-free test harness through the Ant plugin; no
JUnit dependency or paid service is required. `mvn verify` also checks the JAR
consumer. `bash packages/java/scripts/verify-maven.sh` runs this complete Maven path with
an isolated ignored `.local/m2` repository and two workers. The last command
resolves the **installed Maven artifact**, in a
separate Maven project with no source dependency on this SDK. `install` writes
to the local Maven repository, never to a remote registry. Use
`-Dmaven.repo.local=...` for an isolated package-local ignored repository.
`-DskipTests=true` explicitly skips tests and consumer execution.

Tests read the shared `sdk-contract/fixtures/{request-cases,providers,
search-success,search-errors}.json` directly, so stale package copies cannot hide
cross-language differences. The 24 shared provider cases compare capabilities,
exact HTTP requests and normalized mappings. Additional tests exercise all
493 native dispatch descriptors, independent native wire examples, cancellation,
deadlines, body ceilings, malformed JSON/results, sanitized errors, retry/fallback,
batch limits, incremental SSE and a real loopback `HttpClient` server.
Fixture/loopback coverage does **not** establish live provider correctness,
entitlement, billing behavior or availability. Tests make no live provider calls.

## Normalized search

```java
import dev.searchsdk.*;
import java.time.Duration;
import java.util.List;

SearchClient search = SearchClient.builder(
    Providers.tavily(System.getenv("TAVILY_API_KEY")))
    .timeout(Duration.ofSeconds(10))
    .attemptTimeout(Duration.ofSeconds(4))
    .maxConcurrency(8)
    .build();

search.search(new SearchRequest("Java structured concurrency", 5))
    .thenAccept(response -> {
        for (SearchResponse.Result result : response.results()) {
            System.out.println(result.url());
        }
    });
```

`SearchRequest(query)` defaults to five results; valid limits are integers 1–20.
The four-argument constructor accepts include/exclude domain lists. Lists are
ASCII hostnames, normalized to lowercase and deduplicated. Empty/overlapping
lists, URL schemes, paths, ports, wildcard domains, unknown JSON request fields,
and blank queries are rejected before dispatch. `SearchRequest.fromJson` and
`toJson` implement the gateway request shape. Input collections are snapshotted.

Every result carries the provider, original source URL, SDK retrieval time and
optional sanitized request ID. Scores are provider-native and not comparable
across providers. Unknown usage is `null`; no synthetic cost is invented. All
consumed normalized fields are validated, including rows beyond the caller's
output limit. Fewer results are valid. The client caps successful output to the
requested limit and never automatically paginates.

| Normalized provider | Include / exclude domains | Constraints and supported subset |
| --- | --- | --- |
| Tavily | 300 / 150 | Basic web search; explicit domain restriction; no answer or raw content |
| Exa | 1200 / 1200 | Auto search with highlights |
| Brave | Unsupported | Web section, description and extra snippets; legitimate missing-web response supported |
| Context | 100 / 100 | Web search, query ≤500 UTF-16 units; requests at least 10 upstream hits |
| TinyFish | 100 / 100 | Web search, one page; no invented upstream count parameter |
| Firecrawl | 100 / 100 | Web source only, filters mutually exclusive, query ≤500 UTF-16 units |
| You | 500 / 5000 | Web section/snippets only, filters mutually exclusive; news-only response yields no web results |
| Perplexity | 20 / 20 | Search API web results, filters mutually exclusive; no generated answers |
| Serper | Unsupported | Search endpoint organic results |
| SerpAPI | Unsupported | Synchronous Google organic results, one page; documented fully-empty success supported |
| Linkup | 100 / 50 | Fast `searchResults`, text only, images disabled |
| Parallel | 200 / 200 | Basic search with `advanced_settings.source_policy`, filters mutually exclusive |
| Valyu | 100 / 100 | Web dataset only; no proprietary dataset access |
| SearXNG | Unsupported | One JSON `/search` page from an explicitly chosen instance |

Some domain-list maxima are conservative SDK policies retained from the
TypeScript reference. Unsupported filter combinations and query lengths are
checked across the **entire configured fallback chain** before any provider
runs. Domain operators are never synthesized to imitate unavailable filters.

`Providers.valyu(key, ValyuSettings, transport)` additionally supports max price,
relevance threshold, response length, fast mode, date range and instructions.
`Providers.searxng(SearxngOptions, transport)` supports trusted HTTPS instance
base paths, validated proxy auth headers, language, safe search, time range and
categories. `Providers.searxng(baseUrl)` uses the standard configuration.
`Providers.direct(id,key,transport)` and each named provider factory permit
trusted transport injection. No instance discovery or key persistence occurs.

## Retry, fallback, cancellation and batch

Retries and fallback are explicit and disabled by default:

```java
SearchClient search = SearchClient.builder(Providers.exa(exaKey))
    .fallback(Providers.tavily(tavilyKey))
    .retry(new RetryPolicy(1, 250, 5000))
    .build();

CancellationToken token = new CancellationToken();
var pending = search.search(new SearchRequest("query"), token);
token.cancel();
```

The retry policy gives additional attempts per provider (0–5). Exponential
backoff never shortens a valid `Retry-After` delay. Only network, unavailable,
rate-limit and attempt-timeout failures are eligible for normalized retries or
fallback. Authentication, malformed output, invalid requests and other terminal
errors do not trigger alternate paid calls. Retrying search can repeat remote
work and billing. Cancellation cannot undo a remote operation; exactly-once
side effects are not promised.

The default whole-call deadline is 10 seconds, including the client queue,
retries, fallback, parsing and validation. Attempt deadlines are additionally
bounded by the remaining whole-call budget. Time is measured monotonically.
Configured durations must be positive and at most one day. Cancellation tokens
produce sanitized `aborted` errors. Cancelling a returned `CompletableFuture`
uses normal Java future cancellation and also stops the SDK scope.

Custom provider/transport invocation is dispatched through two daemon workers
and a bounded queue. An implementation that ignores its context is raced and
its caller can finish on time; Java cannot forcibly interrupt arbitrary user
code. Custom implementations should honor `RequestContext.cancellation()` and
`check()`. The SDK always removes timer/listener registrations when scopes finish.

```java
var outcomes = search.searchBatch(
    List.of(new SearchRequest("one"), new SearchRequest("two")),
    4, Duration.ofSeconds(10), token);
```

Batches contain at most 1,000 items, use 1–64 workers (default 4), preserve input
order and return an outcome per item. Item failure preserves successful siblings.
Both batch deadlines and cancellation include items still queued. The client's
active-call limit still applies. Successful outcomes expose `value()`; failures
expose `error()`. The Java alpha does not implement TypeScript's optional cache,
inflight deduplication or durable-operation extensions.

## Gateway protocol v1

```java
GatewayClient gateway = new GatewayClient("https://app.example/search");
var result = gateway.search(new SearchRequest("query"), shortLivedAppToken, token);
```

The endpoint is exact, with no automatic path suffix, URL credentials, query
string or fragment. HTTPS is required. The client sends a JSON POST and an
optional per-call bearer token. It never retries that POST. HTTP 200 responses
are fully validated; a present `X-SearchSDK-Protocol` header must equal `1`.
Missing/malformed error envelopes use the protocol's HTTP status mapping.
Upstream bodies, exception messages, raw headers, queries and credentials never
appear in SDK error messages or error metadata. Gateway batch helpers have the
same ordered outcome semantics as normalized search.

## Named native provider clients

The generated classes are `BraveClient`, `ContextClient`, `ExaClient`,
`FirecrawlClient`, `LinkupClient`, `ParallelClient`, `PerplexityClient`,
`SerpApiClient`, `SerperClient`, `TavilyClient`, `TinyfishClient`,
`WonderSearchClient` and `YouClient`. They expose all retained named operations,
mode-specific return types, and convenience overloads with typed string path
parameters. Their `operations()` descriptors expose official source attribution,
required query/header names, response modes and retry declarations.

```java
ExaClient exa = new ExaClient(exaKey);
ExaModels.SearchRequest body = ExaModels.SearchRequest.builder("native search")
    .numResults(3)
    .build();
var nativeResult = exa.search(body);
nativeResult.thenAccept(value -> {
    String title = value.data().results().get(0).title();
    String url = value.data().results().get(0).url();
});

NativeClient engine = NativeClient.builder("context", contextKey)
    .timeout(Duration.ofSeconds(15))
    .maxResponseBytes(10 * 1024 * 1024)
    .maxRequestBytes(10 * 1024 * 1024)
    .maxConcurrency(8)
    .build();
var log = new ContextClient(engine).getLog("request-id", NativeInput.empty());
```

Generated `*Models` classes provide schema-backed fields, immutable values and
builders for retained component schemas, nested objects, arrays and maps. All
493 operations also expose typed `*Input` builders with discoverable required
path/query/header/body groups. Required primitive/body fields have typed setters;
missing mandatory fields/groups fail before dispatch. Primitive getters return
`String`, `Boolean`, `Long` or `Double`; optional/nullable values remain nullable.
Enum strings retain future values rather than mapping them to an invented enum
case. Builders and getters preserve absent versus explicit-null fields through
`hasField` and `toJson`.

Object unions expose a conservative merged typed view plus `asVariantN` views.
Mixed object/array/scalar unions use typed `ofVariantN` factories and `asVariantN`
accessors, retaining the exact original representation and unknown future
variants. Unknown additional fields survive nested round trips through
`additionalFields()` and `additionalField(...)`. These APIs avoid casts for
known search request/response fields; the packed and Maven consumers compile
and execute that use case.

A schema that deliberately leaves a value unconstrained uses `WireValue` and
its explicit typed views. Getters validate consumed field types; these models do
not implement every JSON Schema rule (ranges, regexes, conditionals, exclusive
union selection, or provider entitlement). Native requests retain their original
provider semantics rather than being normalized into web results.
`NativeClient.execute` and the `NativeInput` overloads remain explicit generic
escape hatches. No automatic pagination, polling, stream reconnection or task
execution occurs. Valyu and SearXNG have normalized adapters but no invented
native catalogs. WonderSearch is a native corpus API and is not advertised as
open-web search.

Native retries require both an explicit policy and a generated read/replay-safe
operation declaration. Writes and SerpAPI search calls are never automatically
retried. SSE retries stop once headers are accepted. Exa team administration
requires the separate `teamApiKey` builder option; a regular search key is never
silently reused for those operations. Endpoint-specific access and account plans
remain provider controlled.

Native query values support scalar values, repeated arrays, retained comma-list
conventions and bracket-encoded deep objects. Path substitutions are encoded as
one segment; empty/dot IDs and unknown/missing placeholders are rejected.
Authentication headers cannot be overridden through per-operation headers.
JSON, raw bytes and multipart bodies are mutually exclusive. Requests default
to a 10 MiB cap, including multipart framing. Caller-supplied raw multipart bytes
must include their own valid boundary in `Content-Type`.

```java
MultipartBody upload = new MultipartBody(List.of(
    new MultipartBody.Part("image", "fixture.png", "image/png", imageBytes)));
var uploaded = new SerpApiClient(serpApiKey).uploadImage(
    NativeInput.builder().multipart(upload).build());
```

Multipart fields/filenames/content types are validated, bytes are snapshotted,
and framing cannot exceed the request cap. SerpAPI's image upload injects the
configured key into a new multipart body and rejects alternate key fields.
The SDK does not read local files or stream unbounded upload sources.

### Incremental SSE

```java
var response = new TavilyClient(tavilyKey).researchStream(
    NativeInput.builder().body(java.util.Map.of("input", "research topic")).build());
response.thenAccept(value -> {
    NativeEventStream events = value.data();
    // Subscribe once using Flow.Subscriber<NativeEventStream.Event>.
    // Request events with Flow.Subscription.request(n).
    // Close events when abandoning the operation.
});
```

`NativeEventStream` is a single-subscriber `Flow.Publisher` and `AutoCloseable`.
It incrementally handles split UTF-8, BOM, CR/LF/CRLF, comments, multiline data,
empty IDs, event names and retry hints. Backpressure controls body consumption;
all bytes across the stream count toward the response cap. The deadline includes
stream lifetime, even if no subscriber attaches. Subscriber cancellation/close,
malformed encoding, oversize data and deadlines release the body and concurrency
permit. EOF does not dispatch an unterminated event. Event data remains a string;
provider-specific terminal/error events must be interpreted by the application.
Transport metadata marks header acceptance; it does not claim a completed remote
research job. No reconnect, replay or exactly-once delivery is promised.

### Retained supplemental bindings

`ContextLogo.url(new ContextLogo.Query(publicClientId,domain,theme,type))` builds
a direct embedding URL without an API key or network request. `ContextClient`
also exposes `logoUrl` and `headLogo`; HEAD never forwards its provider key to
the logo host. Images must not be downloaded, persisted or rehosted.

`TavilyClient.getPaymentPricing` and `paidSearch` use the fixed x402 host with no
provider-key forwarding. Supply an externally obtained `PAYMENT-SIGNATURE` in
`NativeInput.header` when authorized. Paid search only permits advanced depth
when depth is present. The SDK does not sign payments, acquire authorization,
negotiate challenges, or automatically retry payment-authorized POSTs. Explicit
Tavily keyless search is available through `NativeClient.Builder.tavilyKeyless`.

## Transport and error boundaries

The default transport never follows redirects, explicitly selects direct
connections, and has no cookie handler or HTTP authenticator. JVM-global proxy
selectors, cookie handlers and authenticators are not inherited. It explicitly requests identity encoding and rejects other
content encodings instead of decompressing them without a bound. The default
response ceiling is 10 MiB, counted while reading. Strict UTF-8 JSON rejects
malformed input, duplicate object keys, invalid escapes/surrogates, trailing data,
non-finite numbers and excessive nesting. Native text also requires valid UTF-8;
bytes/raw modes preserve bounded bytes. Empty 204/HEAD JSON responses are `null`.

`SearchException` exposes only a code, sanitized status/retry delay, and immutable
attempts. Codes match `SearchErrorCode` from the shared protocol. Native success
data and explicitly requested raw responses may contain provider-sensitive
fields; applications must handle those according to their own policies.
Injected transports are trusted code and must honor the request context. A
buffered injection cannot undo allocations it made before returning; the SDK
still rejects returned bodies exceeding the configured cap.

## Reproducible generation and attribution

```sh
python3 -B packages/java/scripts/generate-native.py
python3 -B packages/java/scripts/generate-native.py --check
```

The generator writes only this package's catalog, thirteen named client classes
and schema-backed model classes. It reads `scripts/providers-a/operations.json`, the provider B operation
tables, retained schemas and supplemental tables. SerpAPI has no retained public
OpenAPI schema; its attributed derived wire schema is kept in
`scripts/serpapi-wire-schema.json` and checks the retained TypeScript interface
digest to force review when that reference changes. It verifies upstream manifest
artifact digests and records relative input paths plus SHA-256 hashes. No network,
external Python dependency, schema refresh, or TypeScript regeneration is needed.
`--check` compares every generated file without writing. The SDK JAR includes the
catalog resource, MIT `LICENSE` and `NOTICE.md`; provider ownership/attribution
is retained. The generators and tests stay separate from the runtime artifact.

The release target is Java 17. Local verification passed on JDK 17.0.21, 21.0.13,
25 and 27. The JDK 17 and 21 runs include the full deterministic suite, packed
classpath/module consumers, and a separately installed Maven consumer.
Live-provider behavior, provider account
permissions and commercial publication remain outside deterministic verification.
