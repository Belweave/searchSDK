# searchSDK for Python

Python 3.11+ package `searchsdk`, version `0.1.0a0`. No runtime dependencies.
Direct server-side normalized adapters, provider-native clients, and an
application gateway client are separate APIs. This package does not execute
providers through the public documentation MCP endpoint.

## Normalized search

```python
import os
from searchsdk import SearchClient, SearchRequest, RetryPolicy, exa, tavily

client = SearchClient(
    exa(os.environ["EXA_API_KEY"]),
    fallback=[tavily(os.environ["TAVILY_API_KEY"])],
    timeout_ms=10_000,
    attempt_timeout_ms=4_000,
    max_concurrency=4,
    # Optional; repeated searches can incur repeated charges.
    retry=RetryPolicy(max_retries=1),
)
response = client.search(SearchRequest("Python search libraries", limit=3))
for result in response.results:
    print(result.url, result.provenance.provider)
```

`search` accepts `SearchRequest`, a query string, or the shared camelCase request
mapping. Dataclass fields and Python options use snake_case; `to_dict()` emits
the shared camelCase JSON contract. Queries are preserved verbatim. Limits are
1–20, default 5. Domains are ASCII hostnames, lowercased and deduplicated;
empty lists, overlaps, and unknown request fields are rejected.

All fallback capabilities are checked **before** any dispatch. Providers return
fewer results when appropriate. Every consumed result is validated before
truncation; results are never padded and domain filtering is never synthesized
through query operators. Unknown usage is `None`, rather than a cost estimate.
Provenance contains the SDK retrieval time and a validated provider request ID
when available. Provider relevance scores are not comparable across providers.

| Adapter | Include / exclude domains | Restrictions / normalized subset |
| --- | --- | --- |
| `exa` | 1200 / 1200 | Auto search with highlights |
| `tavily` | 300 / 150 | Basic web search; usage requested |
| `brave` | Unsupported | Web section, description and extra snippets |
| `context` | 100 / 100 | 500 UTF-16 units; requests at least ten, caps output |
| `tinyfish` | 100 / 100 | One web page; no invented count parameter |
| `perplexity` | 20 / 20 | Web Search API; include/exclude mutually exclusive |
| `parallel` | 200 / 200 | Basic search, excerpts; filters mutually exclusive |
| `linkup` | 100 / 50 | Fast `searchResults`, text only |
| `firecrawl` | 100 / 100 | Web source; 500 UTF-16 units; filters exclusive |
| `you` | 500 / 5000 | Web section and snippets; filters exclusive |
| `serper` | Unsupported | Organic search results |
| `serpapi` | Unsupported | Synchronous Google organic page; no `num` parameter |
| `valyu` | 100 / 100 | Web only, no proprietary datasets |
| `searxng` | Unsupported | One JSON page from an operator-selected instance |

Context, TinyFish, Firecrawl and Valyu domain maxima are conservative SDK
policies where upstream maxima are undocumented. No adapter auto-paginates.
WonderSearch operates on uploaded corpus passages and is native-only.

Valyu accepts a captured `search` mapping with `max_price`,
`relevance_threshold`, `response_length`, `fast_mode`, `start_date`, `end_date`
and `instructions`. Dates use the validated `YYYY-MM-DD` subset. SearXNG accepts
an HTTPS `base_url`, optional reverse-proxy `headers`, `language`, `safe_search`
(0/1/2), `time_range` (day/month/year), and `categories`. JSON output must be
enabled by the instance operator. Both adapters expose bounded `search_raw()`;
raw success data retains upstream fields and must be handled as application data.

## Reliability, concurrency and asyncio

```python
from searchsdk import CancellationToken

cancel = CancellationToken()
response = client.search("query", cancellation=cancel)
# Another thread may call cancel.cancel(). Cancellation has no public reason.

# In an asyncio application:
response = await client.search_async("query")
outcomes = await client.search_batch_async(
    ["first query", {"query": "second query", "limit": 2}],
    concurrency=2, timeout_ms=10_000,
)
```

The monotonic whole-call deadline includes queueing, attempts, backoff, reading,
and parsing. Default: ten seconds. Per-attempt deadlines can shorten it. Only
`network`, `rate_limit`, `unavailable`, and `attempt_timeout` permit explicit
fallback or opt-in retries; authentication, malformed responses, and provider
errors are terminal. Retry-After is never shortened. Defaults do not retry.
Retries and fallback may create repeated remote side effects or charges; there
is no exactly-once guarantee.

Batches accept at most 1,000 items, concurrency 1–64 (default 4), and return
ordered `BatchResult` objects with `status`, `value`, or `error`. One failure
does not discard siblings. Batch deadlines and cancellation cover queued items.
A client also bounds active worker attempts, including timed-out workers that
have not exited. Standard HTTPS responses have a ten MiB decoded ceiling.
Gzip and zlib deflate are decoded with bounded output; compressed input is capped
as well. Unknown encodings and malformed JSON are rejected.

Async methods use standard-library threads and do not block the event loop.
Cancelling an asyncio task propagates cancellation and preserves
`asyncio.CancelledError`. Caller wait time is bounded even if a custom provider
ignores cancellation. Python cannot forcibly stop such a provider or interrupt
all OS DNS behavior: an uncooperative daemon worker retains its concurrency
permit until it exits. The built-in transport closes connections on cancellation,
never follows redirects, and performs no cookie/proxy discovery or automatic
HTTP retries. Injected transports must honor the same security requirements.

This Python alpha does not implement TypeScript's optional successful-result
cache, in-flight deduplication, or durable workflow store. These options are not
accepted or silently simulated.

## Application gateway v1

```python
from searchsdk import GatewayClient

# Exact application-owned HTTPS URL; no automatic suffix.
gateway = GatewayClient("https://app.example.com/search")
response = gateway.search("query", token="short-lived-application-token")
```

Supply application tokens per request; do not embed provider keys in application
clients. Tokens are not persisted or logged. URL credentials, fragments, query
strings and non-HTTPS endpoints are rejected. The client sends a normalized JSON
POST and validates success responses, provenance, usage, warnings, and attempts.
`X-SearchSDK-Protocol` may be absent or `1`; other versions fail. Gateway POSTs
are never retried. Gateway errors use sanitized shared error codes; malformed
error envelopes fall back to HTTP status mapping. `search_async`, `search_batch`,
and `search_batch_async` are available with the same deadline rules. A batch can
supply `token=` as a request-scoped option for that batch.

## Provider-native APIs

```python
from searchsdk import ExaClient, AsyncExaClient, FirecrawlClient, MultipartBody, NativeFile

native = ExaClient(os.environ["EXA_API_KEY"])
response = native.search(body={"query": "Python", "numResults": 2})
print(response.data["results"])

# Multipart content is supplied explicitly; the SDK never opens file paths.
firecrawl_native = FirecrawlClient(os.environ["FIRECRAWL_API_KEY"])
parsed = firecrawl_native.parse_file(raw_body=MultipartBody({
    "file": NativeFile("document.txt", b"Synthetic document", "text/plain"),
}))

async_native = AsyncExaClient(os.environ["EXA_API_KEY"])
response = await async_native.search(body={"query": "Python"})
```

There are **493 retained catalog operations**, all exposed as generated named
methods in both synchronous and asynchronous classes. Class names are
`BraveClient`, `ContextClient`, `ExaClient`, `FirecrawlClient`, `LinkupClient`,
`ParallelClient`, `PerplexityClient`, `SerpapiClient`, `SerperClient`,
`TavilyClient`, `TinyfishClient`, `WondersearchClient`, and `YouClient`; prefix
`Async` for async versions. Method names use snake_case. Original operation names
remain available through `request("originalName", ...)` and `operations`.

| Native provider | Retained operations |
| --- | ---: |
| Brave | 17 |
| Context | 50 |
| Exa | 74 |
| Firecrawl | 57 |
| Linkup | 15 |
| Parallel | 39 |
| Perplexity | 35 |
| SerpAPI | 13 |
| Serper | 26 |
| Tavily | 16 |
| TinyFish | 47 |
| WonderSearch | 95 |
| You | 9 |

Named signatures reference generated `TypedDict` request/response types in
`searchsdk.native_types`. Required path, query, body and documented header groups
are visible in signatures. These are static wire types, **not** runtime JSON
Schema validation. JSON native data preserves provider field names, extra fields,
arrays, and unknown shapes. Python has no general intersection type: known
object `allOf` fields are merged conservatively; non-object intersections remain
`Any`. Engine-specific SerpAPI payloads have no retained complete schema and
remain unconstrained. Use `client.schema("search")` to inspect original operation
schemas, references, full retained source document, and official source URL.
Numeric ranges, patterns, conditional schema rules, and provider access gates
remain provider responsibilities. The generic `NativeClient.request` escape hatch
accepts forward-compatible provider payloads and headers after transport safety
validation; it does not add arbitrary hosts or arbitrary endpoint paths.

Native response modes are JSON, UTF-8 text, bytes, buffered `RawResponse`, and
`SSEStream`. Native request bodies may be JSON, bounded bytes, or bounded
`MultipartBody` fields/files. Default request and response ceilings are each ten
MiB; native clients accept `max_request_bytes` and `max_response_bytes`. Native
metadata contains status, sanitized request ID and attempts; upstream error
bodies and exception messages are never included in SDK errors. Raw and native
success data may themselves contain sensitive provider fields: do not log them
indiscriminately. Header and credential overrides, path traversal, and redirects
are rejected. Exa team management requires a separate `team_api_key`. Native
retries are opt-in and restricted to catalog-declared replay-safe reads; paid
SerpAPI searches, POSTs, and streams are never retried automatically.

```python
# SSE is incremental and supports sync and async iteration.
with native.answer_stream(body={"query": "Python"}).data as stream:
    for event in stream:
        print(event.event, event.data)  # data stays text; no implicit JSON parse
```

Streams retain the whole-operation deadline and byte ceiling through consumption,
close on deadline/cancellation, preserve SSE IDs, comments, multiline data and
retry hints, and discard incomplete final events. Use `with`, `async with`, or
`close()` on early exit. No auto-reconnection, polling or stream retry occurs.
Native stream metadata describes receipt of headers; subsequent consumption
errors surface from the iterator.

Context `logo_url(query={"publicClientId": ..., "domain": ...})` returns a URL
inside `NativeResponse` without downloading image data; `head_logo` inspects
headers only. Follow provider restrictions on image storage/rehosting. Tavily
`access_mode="keyless"` permits Search/Extract only when no key is supplied.
`get_payment_pricing` and `paid_search` bind retained x402 endpoints without adding
the provider key. Pass externally acquired `PAYMENT-SIGNATURE` headers explicitly;
the SDK never signs payments, negotiates challenges, or creates authorization.

## Offline verification and regeneration

From the repository root, using a Python 3.11+ interpreter:

```sh
PYTHONPATH=packages/python/src python3 -B -m unittest discover -s packages/python/tests -v
python3 -B packages/python/scripts/sync_fixtures.py --check
python3 -B packages/python/scripts/generate_native.py --check
```

The native generator reads retained `scripts/providers-a` operation tables and
schemas, the A Brave conversion, and `scripts/providers-b` catalogs and snapshots.
Known SerpAPI interface fields additionally derive from the retained TypeScript
`packages/sdk/src/native-serpapi.ts` reference, whose source and hash are retained.
It writes only package-local `catalog.json`, `native_clients.py`, and
`native_types.py`; omit `--check` to regenerate. Source attribution, snapshot date,
input SHA-256 hashes, and original provider schema documents ship in the package.
No network access is needed. `sync_fixtures.py` copies shared request/gateway and
24 normalized provider cases into package tests; `--check` detects divergence.
Regeneration checks require the repository's retained inputs, not just an sdist.

Build and verify installed wheel and sdist consumers (build tools are development
requirements, not package runtime dependencies):

```sh
python3 -m venv packages/python/.build/verify
packages/python/.build/verify/bin/python -m pip install -r packages/python/requirements-dev.txt
packages/python/.build/verify/bin/python packages/python/scripts/verify.py
```

`scripts/verify.py` is the CI entrypoint for Python 3.11 and 3.15. It checks
generator/fixture synchronization, Ruff, mypy, positive and negative typed
consumers, unittests, wheel/sdist builds and both installed consumers. Verification
tool versions and their transitive dependencies are pinned in
`requirements-dev.txt`.

`examples/offline_consumer.py` exercises normalized, gateway, native multipart and
async streaming against injected deterministic fixtures. Tests also cover all
493 native bindings, independent native wire cases, cancellation/deadline races,
limits, malformed data, failures and credential non-disclosure. Fixture coverage
and local package-consumer checks do not establish live provider correctness.
No automated verification calls a provider, publishes a package, or creates remote
infrastructure. All generated build artifacts stay in ignored package storage.
