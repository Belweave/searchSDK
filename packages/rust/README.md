# searchsdk for Rust

A Rust server SDK for normalized search, provider-native API operations, and the
application gateway protocol v1. This is alpha source; no package is published by
these build commands. Rust and Cargo 1.98 are the declared and tested minimum.
The crate uses Tokio, Reqwest with rustls, and Serde. It has no JavaScript runtime,
Node bridge, website, or runtime code generation dependency.

Keep direct provider credentials on an application server. Mobile and browser
applications should call an application-owned gateway with short-lived application
tokens. Supply credentials explicitly; the SDK does not discover environment keys,
read credential files, persist tokens, or log requests or provider responses.

```toml
[dependencies]
searchsdk = { path = "packages/rust" }
tokio = { version = "=1.53.1", features = ["rt", "macros"] }
```

```rust,no_run
use searchsdk::{Provider, ProviderId, SearchClient, SearchRequest, CallOptions};

# async fn run(server_key: String) -> searchsdk::Result<()> {
let provider = Provider::new(ProviderId::Exa, server_key)?;
let client = SearchClient::new(provider)?;
let response = client.search(SearchRequest::new("Rust search SDK"), CallOptions::default()).await?;
for result in response.results {
    println!("{}", result.url);
}
# Ok(()) }
```

`SearchRequest` preserves query whitespace, rejects blank queries, defaults to 5
results, and accepts a limit from 1 to 20. Domain lists require ASCII hostnames,
normalize case, deduplicate, and reject overlap. `SearchRequest::from_json` also
rejects unknown fields and explicit null options. Each result carries provider,
source URL, and RFC 3339 retrieval time. Usage is optional rather than estimated.
Scores retain provider meaning and are not comparable across providers.

## Normalized support

All 14 adapters send one request/page and expose only the following conservative
subset. Native clients are a separate surface; normalized support does not imply
support for every provider feature.

| Provider | Normalized surface | Include / exclude domain ceilings | Policy |
| --- | --- | --- | --- |
| Context | Web search | 100 / 100 | Query ≤500 UTF-16 units; requests at least 10, truncates output |
| Exa | Auto web search with highlights | 1200 / 1200 | Native scores and USD usage |
| Tavily | Basic web search | 300 / 150 | Restrictive include mode; credits when supplied |
| Brave | Web results | Unsupported | Extra snippets; no synthesized site operators |
| Parallel | Basic search | 200 / 200 | Include and exclude are mutually exclusive |
| Perplexity | Search API web results | 20 / 20 | Include and exclude are mutually exclusive; excludes use provider syntax |
| Linkup | Fast searchResults, text only | 100 / 50 | Images disabled; non-text rows rejected |
| You | Web section | 500 / 5000 | Include and exclude are mutually exclusive; news-only responses yield zero web hits |
| Firecrawl | v2 web search | 100 / 100 | Include and exclude mutually exclusive; query ≤500 UTF-16 units |
| Valyu | Web dataset only | 100 / 100 | Typed instance settings; raw JSON available with `search_raw` |
| TinyFish | One web search page | 100 / 100 | No native count parameter; truncates output |
| Serper | Organic search results | Unsupported | Credits when supplied |
| SerpAPI | Synchronous Google organic results | Unsupported | Only the documented fully-empty success diagnostic is accepted |
| SearXNG | One JSON general-search page | Unsupported | Trusted operator-selected HTTPS instance; explicit settings and proxy headers |

`Provider::searxng` accepts an HTTPS instance URL and `SearxngSettings` (language,
safe search, time range, categories, explicit reverse-proxy headers).
`Provider::with_valyu_settings` supports price, relevance threshold, response
length, fast mode, dates, and instructions. The 100-domain limits for Valyu,
TinyFish and Firecrawl are conservative SDK policies, not provider guarantees.

## Native clients

Each module has a named client, named request input, and schema-derived wire
structs, enums, and aliases. Request/response JSON preserves provider field names.
Optional members use `Option`; required members are typed fields. Nested `Option`
preserves the difference between absent and explicitly null native fields. Referenced
schemas are boxed to support recursive shapes. Defaults help construct requests;
they do not assert that empty/default values meet every provider constraint.

```rust,no_run
use searchsdk::{native::{ExaClient, exa::{ExaSearchInput, ExaSchemaSearchRequest}}, CallOptions};
# async fn run(server_key: String) -> searchsdk::Result<()> {
let client = ExaClient::new(server_key)?;
let request = ExaSearchInput {
    body: Box::new(ExaSchemaSearchRequest { query: "Rust async".into(), ..Default::default() }),
    ..Default::default()
};
let response = client.search(&request, CallOptions::default()).await?;
assert_eq!(response.metadata.provider, "exa");
# Ok(()) }
```

| Module / client | Named operations |
| --- | ---: |
| `context::ContextClient` | 50 |
| `exa::ExaClient` | 74 |
| `tavily::TavilyClient` | 16 |
| `brave::BraveClient` | 17 |
| `tinyfish::TinyfishClient` | 47 |
| `perplexity::PerplexityClient` | 35 |
| `parallel::ParallelClient` | 39 |
| `linkup::LinkupClient` | 15 |
| `firecrawl::FirecrawlClient` | 57 |
| `you::YouClient` | 9 |
| `wondersearch::WonderSearchClient` | 95 |
| `serper::SerperClient` | 26 |
| `serpapi::SerpApiClient` | 13 |
| **Total** | **493** |

The total includes Context's local `logo_url` builder, `head_logo`, Tavily's two
payment bindings, and SerpAPI endpoint conveniences. It does not count individual
SerpAPI engines as independently verified adapters. WonderSearch searches an
uploaded corpus, and is native-only. Valyu and SearXNG have no retained native
operation catalogs and are normalized-only.

`retained/operations.json` contains exact methods, paths, fixed base origins,
response modes, and official sources. `OPERATIONS` in each module exposes static
binding metadata. Method names use Rust snake case; wire fields retain the source
names using Serde renames. Extra native object fields survive in `extra` maps;
unknown string enum values and evolving/unrepresentable unions have explicit
`Unknown` variants. Known response structures reject wrong field types and missing
required members. Unknown union branches preserve raw JSON conservatively.

Native models are wire representations, **not full JSON Schema validators**.
Some provider constraints (regex, conditional schemas, composition exclusivity,
formats, cross-field rules) remain documented in the retained originals. Complex
intersections merge representable object fields; unrepresentable intersections
retain a JSON escape hatch. The SDK does not invent stable structure for schemas
that declare arbitrary JSON. Native data may contain provider-returned account
credentials or personal data; handle and log it accordingly.

JSON, UTF-8 text, decoded bytes, and bounded raw responses are supported. Multipart
and arbitrary byte uploads use `RawBody` and `MultipartPart`; Reqwest supplies the
multipart boundary. SSE operations return `SseStream`: call `next().await` to read
an event, and drop the stream to close it. SSE supports chunked UTF-8, BOM, LF/CRLF,
multiline data, event/id/retry fields, and ignores incomplete final events. It
never reconnects or replays. Event payload JSON can be deserialized explicitly.

Context `logo_url` builds a public embedding URL without fetching an image.
`head_logo` inspects headers without downloading the image; provider keys are not
sent to the logo host. Respect the provider's prohibition on downloading,
persisting, or rehosting Logo Link images. Exa admin methods require a separately
supplied team key via `with_team_api_key`; the search key is never substituted.
Tavily `keyless` explicitly supports Search and Extract only. `paid_search` sends
an external `PAYMENT-SIGNATURE` to `https://x402.tavily.com` without an API key.
This SDK does not sign, negotiate, authorize, or pay for payments.

## Deadlines, cancellation, retry, fallback, and batching

`ClientConfig` defaults to a whole-call 10-second deadline, a 10 MiB decoded-byte
ceiling, 8 active calls, and zero retries. Configurations reject zero limits and
invalid ranges. `CallOptions` supplies an optional timeout and a
`CancellationToken`. Queue time, provider attempts, backoff, body reads and JSON
parsing count toward the deadline. SSE retains the deadline and concurrency permit
for its stream lifetime. Dropping a future or stream releases local resources;
cancellation cannot undo a remote side effect already accepted by a provider.

Normalized adapter construction rejects nonzero adapter-level retries; configure
retries on `SearchClient`. Its response ceiling also bounds each adapter, keeping
a stricter adapter ceiling when configured.

`SearchClient::with_fallback` takes an explicit ordered chain, explicit retry
policy, and optional attempt timeout. The full chain is capability-checked before
dispatch. Only network, rate-limit, unavailable and attempt-timeout errors can
retry or fall back. Auth, invalid requests, malformed responses and unsupported
options are terminal. Attempt metadata and `fallback_used` warnings are retained.
Retries may incur repeated billing. There is no exactly-once side-effect claim.

Native retry requires both an explicit retry policy and a catalog-declared
read-only operation. Mutating methods, search-producing SerpAPI GETs, and streams
never retry automatically. Reqwest's own protocol retry behavior is disabled.
Retry-After is a minimum delay even when it exceeds the configured backoff cap;
the whole-call deadline still wins. Stream body errors and malformed bodies never
trigger replay.

`search_batch` dispatches up to 1,000 individual requests with a caller-selected
concurrency from 1 to 64. It returns ordered `Vec<Result<SearchResponse>>`; failures
do not discard successful siblings. The whole-batch deadline includes queued
items, and the client concurrency bound remains in force. Cache, in-flight
coalescing, durable job storage, autonomous polling and automatic pagination are
not implemented in this alpha; those behaviors are never enabled implicitly.

## Application gateway v1

`Gateway::new("https://application.example/exact-endpoint")` POSTs normalized JSON
to that exact URL. `search` accepts an optional short-lived application token for
that request. `X-SearchSDK-Protocol` may be absent or `1`; any other value is rejected.
A successful reply must be HTTP 200 with a fully validated normalized response.
Error envelopes expose only contract codes, attempts and sanitized numeric HTTP
metadata. Malformed error envelopes use the contract's HTTP status mapping.
Gateway POSTs never retry, and a nonzero gateway retry configuration is rejected.

HTTPS endpoints reject userinfo, query strings and fragments. Native origins are
fixed by the catalog. Credentials cannot be overridden by request headers or
secret query parameters. Redirects and Reqwest ambient proxy discovery are
disabled, cookies are not enabled, and external exception strings and upstream
bodies never enter SDK errors. Injected `Transport` implementations are trusted:
they must supply decoded byte streams, respect redirect isolation, and avoid
logging secrets. The SDK races them against cancellation/deadlines regardless.

## Deterministic verification and packaging

Run from the repository root with Rust 1.98, `rustfmt`, Clippy, and Python 3.12+
installed. These Rust commands do not require Node packages.

```sh
export CARGO_BUILD_JOBS=2
export CARGO_TARGET_DIR="$PWD/packages/rust/.local/target"
python3 -B packages/rust/scripts/generate.py --check
cargo fmt --manifest-path packages/rust/Cargo.toml --check
cargo test --locked --manifest-path packages/rust/Cargo.toml
cargo clippy --locked --manifest-path packages/rust/Cargo.toml --all-targets -- -D warnings
cargo run --locked --manifest-path packages/rust/Cargo.toml --example consumer
python3 packages/rust/scripts/verify-package.py
```

`verify-package.py` runs `cargo package --allow-dirty --locked` with Cargo's package
verification enabled, extracts the resulting `.crate`, and builds/runs a separate
consumer that resolves only the extracted crate. It verifies the resolved package
path. All build, scratch, package and consumer output lives under `.local/`.
`examples/consumer.rs` runs synthetic gateway and native searches without network.

The tests consume packaged copies of all shared `sdk-contract/fixtures` files;
the generator/check command verifies these copies against the root originals.
All 24 normalized wire cases are checked against independently produced TS
fixtures. Additional tests cover invalid responses, cancellation, deadlines,
limits, retries, fallback, batching, credential non-disclosure, real loopback HTTP,
redirect isolation, gzip decoding, multipart and SSE. A generated test invokes
every retained native binding against a synthetic transport. These establish SDK
behavior and reference consistency; **they do not establish live compatibility**,
provider availability, account access, plan entitlements, or correctness of every
provider schema. No test calls a paid provider or creates remote infrastructure.

Regenerate with `python3 -B packages/rust/scripts/generate.py`. This uses only
Python's standard library and the installed `rustfmt`, reads retained root source
tables/snapshots plus the maintained TS SerpAPI source, and writes only this
package. It verifies source digests and emits deterministic source plus
`SOURCES.json`. `retained/original/` preserves original public schemas and
provenance byte-for-byte; converted documents retain source identity. Do not edit
generated Rust directly. Review changes in the original schema/catalog first.
The package's source license is copied from the root MIT license. Provider schemas,
content, names and trademarks remain attributable to their respective owners.
