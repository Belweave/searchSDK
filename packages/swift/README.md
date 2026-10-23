# SearchSDK for Swift

Alpha `0.1.0-alpha.1`. A dependency-free Swift Package Manager library for application-owned search gateways. The module and product are `SearchSDK`; the wire protocol is searchSDK application gateway v1. The MIT license is included in `LICENSE`.

Provider keys stay on your server. This client sends normalized search requests to the exact HTTPS endpoint you supply. It does not select providers, execute provider-native operations, or reproduce the server SDK's retry/fallback/cache policies. A gateway may report those policies through response attempts, warnings, and reuse metadata.

## Requirements and installation

Swift 6.0 or later, with Foundation and URLSession. Minimum deployment targets are iOS 16, macOS 13, tvOS 16, watchOS 9, and visionOS 1. Linux and Windows are not supported by this alpha. No external Swift packages or Node.js installation are required.

The repository-root `Package.swift` exposes the same library for Git repository dependencies; remote SwiftPM resolves the root manifest. In Xcode, add `https://github.com/Belweave/searchSDK.git` and select a reviewed revision that contains that manifest, then select the `SearchSDK` product. No released Swift package tag is claimed here. For an explicit revision dependency in your own manifest:

```swift
.package(name: "SearchSDK", url: "https://github.com/Belweave/searchSDK.git", revision: "<reviewed-commit-sha>")
```

Add `.product(name: "SearchSDK", package: "SearchSDK")` to your target dependencies. The package-local manifest remains available for development and self-contained source archives. For a local checkout, use `.package(name: "SearchSDK", path: "path/to/packages/swift")`. Root manifest integration and release tags are owned by the parent repository; this package has not been published independently.

```swift
import SearchSDK

let search = try SearchClient(
    endpoint: "https://your-application.example/search",
    applicationToken: {
        // Resolve a short-lived application token for every dispatched call.
        // Your application's authentication actor provides this method.
        try await applicationAuth.currentAccessToken()
    }
)
let request = try SearchRequest(
    query: "Swift concurrency",
    limit: 5,
    includeDomains: ["developer.apple.com"]
)
let response = try await search.search(request)
for result in response.results {
    print(result.url, result.provenance.provider)
}
```

The callback returns `String?`; return `nil` for a gateway without authentication. Nonempty tokens must use the bearer token character set (ASCII letters/digits plus `._~+/-` and optional trailing `=`). The callback runs per dispatched request, after acquiring client capacity. The SDK never stores the returned token in a cache or persistence layer, or logs it. The request necessarily holds it for its HTTP lifetime. Do not pass provider keys. App-owned token storage and HTTP diagnostics remain the application's responsibility.

## Requests and validated responses

`SearchRequest` is an immutable `Codable` value with a throwing initializer. Queries must be nonblank using the TypeScript reference’s ECMAScript whitespace semantics and otherwise retain their original text. Limits are integers from 1 through 20, defaulting to 5. Domain lists must be nonempty ASCII hostnames with at least two labels, no wildcard/scheme/path/port/trailing dot, at most 253 bytes and 63 bytes per label. Lists are lowercased and deduplicated in input order; overlapping include/exclude lists are rejected. JSON request decoding rejects unknown fields and explicit null options. Typed requests cannot express unsupported provider-native fields.

Success requires HTTP 200 and a complete normalized `SearchResponse`. Unknown fields are discarded rather than retained as raw provider data. `usage` is mandatory and nullable. All consumed URLs, provenance, request IDs, scores, usage, warning codes, attempt timestamps/durations/statuses, retry delays, and reuse values are validated. Attempts are capped at 1,024. Optional attempt metadata and reuse must be omitted rather than explicitly null; result text/score/request-ID fields accept null as absent, matching normalized server semantics. Timestamps use ISO 8601 internet date/time strings, with optional fractional seconds. Results must not exceed the request's limit. Credentials, whitespace, backslashes and control characters are prohibited in result/provenance HTTP(S) URLs. `X-SearchSDK-Protocol` may be absent or exactly `1`; other values are rejected. Only HTTP 200 is a valid success status.

`SearchError` exposes `code`, validated `attempts`, optional `status`, and optional `retryAfterMs`. It never includes an underlying exception, raw response body, request query, or headers. Description/debug description include only the code. Malformed success is `invalid_response`. Valid failure envelopes preserve sanitized protocol metadata. Without a valid envelope, 401/402/403/432/433 map to `auth`, 429 to `rate_limit`, 408/5xx to `unavailable`, and other statuses to `provider_error`. Network exceptions map to `network`, URLSession timeouts to `timeout`, and cancellation to `aborted`. An invalid or failed application token callback maps to `auth`.

## Deadlines, limits, cancellation and batches

Defaults: 10 seconds per call, 10 MiB of decoded response data, and 4 active calls per client. Configuration accepts a timeout greater than zero and at most 24 hours, response ceilings from 1 byte through 100 MiB, and concurrency from 1 through 64. Invalid configuration throws `configuration` before dispatch.

The monotonic whole-call deadline includes the client queue, token lookup, HTTP transfer and JSON parsing/validation. Cancel the caller's Swift `Task` to abort. A deadline/cancellation resolves promptly even if a token callback ignores cancellation; a late callback cannot dispatch HTTP. Such callbacks must cooperate with cancellation to reclaim their own work. Synchronous Foundation JSON parsing already in progress cannot be interrupted; its result is discarded after deadline/cancellation. CPU and temporary decoder allocations can outlive caller completion briefly. The response ceiling bounds decoded wire bytes and the transport accumulator, not all Foundation allocations or a single incoming URLSession chunk.

The URLSession transport reads chunks incrementally and cancels when the next chunk would exceed the byte ceiling, for both success and error bodies. It uses an ephemeral session with no URL cache, cookie storage, or credential storage. All redirects are rejected before following them, including same-origin redirects; application tokens never travel to a redirect target. Each call creates and invalidates its own session. No automatic retries are performed by SearchSDK; network stacks and remote systems cannot guarantee exactly-once effects.

```swift
let outcomes = try await search.searchBatch(
    [try SearchRequest(query: "one"), try SearchRequest(query: "two")],
    concurrency: 2,
    timeout: 10
)
for item in outcomes {
    switch item.result {
    case .success(let response): print(item.index, response.results.count)
    case .failure(let error): print(item.index, error.code.rawValue)
    }
}
```

Batches accept up to 1,000 inputs and 1–64 workers. The client concurrency bound applies across simultaneous calls and batches. Outcomes retain input order and indexes; dispatch/completion order may differ. One failed item leaves successful siblings intact. Batch timeout covers queued items and defaults to the client's timeout; each dispatched item is additionally bounded by the client's per-call timeout. Cancellation produces `aborted` per unfinished item; expiry produces `timeout`. Completed successes remain successful. Invalid batch options throw `invalid_request`; an empty batch returns an empty array. Requests are validated before constructing the input array.

`GatewayTransport` is a public injection point for deterministic fixtures. Custom transports are trusted application code: they must enforce incremental limits, honor task cancellation and reject redirects. The client independently checks the final body size, protocol and decoded fields, and enforces its own whole-call deadline. Custom transports must not log credentials or requests.

## Examples and verification

Run these commands from the repository root; builds use bounded concurrency and disk storage:

```sh
xcodebuild -version
python3 packages/swift/Scripts/sync-fixtures.py --check
swift test --package-path packages/swift --scratch-path .local/swift-build --jobs 2
swift run --package-path packages/swift/Examples/Consumer --scratch-path .local/swift-example --jobs 2 SearchSDKConsumer
sh packages/swift/Scripts/verify-consumer.sh .local/swift-consumer
```

The consumer defaults to an injected deterministic gateway. `verify-consumer.sh` creates a deterministic source `.tar.gz`, extracts it under the supplied storage directory, and builds/runs a release-optimized separate consumer against the extracted SPM dependency. It does not use the checkout library during that build. `python3 packages/swift/Scripts/pack.py --output .local/SearchSDK.tar.gz` creates the artifact independently. Archive entries omit local paths, ownership, timestamps and build caches.

For manual application integration only, set `SEARCHSDK_GATEWAY_URL` to your exact HTTPS endpoint and optionally `SEARCHSDK_APPLICATION_TOKEN` to a short-lived application token, then add `--live` after `SearchSDKConsumer` in the `swift run` command. This explicitly calls your gateway and may incur backend charges. Automated verification never uses `--live`.

The `Fixtures/request-cases.json`, `search-success.json`, and `search-errors.json` resources are byte-for-byte copies of `sdk-contract/fixtures` in the repository. `Scripts/sync-fixtures.py --check` fails on drift or missing retained sources; run the script without `--check` to refresh copies. The installed package tests use these retained copies without requiring the repository. `success.json` is an additional synthetic fixture. No provider-native files are generated here, so no provider operation generator or provider-schema snapshot is shipped. Provider operation sources and attribution remain in `scripts/providers-a` and `scripts/providers-b` for server SDKs.

Deterministic tests cover shared request/error/success fixtures, URLProtocol incremental reads and redirects, token non-disclosure, malformed payloads, cancellation, queue-inclusive deadlines, noncooperative callbacks, bounded batches and sibling outcomes. They establish gateway behavior only. Live provider correctness, physical-device operation, backend authentication policy, durable jobs, cache/deduplication, provider-native calls, and retry/fallback execution are outside this package's scope.

## Recorded Apple platform verification

Verified with Xcode 27.1 (27A9275), Apple Swift 6.4 in Swift 6 language mode, on macOS 27.0.1. The deterministic test suite runs on macOS and the iPhone Duo simulator with iOS 27.1. Generic simulator library builds also pass for tvOS, watchOS, and visionOS. Their minimum deployment targets are compile-time declarations; no minimum-version runtime or physical device was exercised. The repository-root manifest is integrated and verified separately by the parent project.
