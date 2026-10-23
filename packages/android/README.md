# searchSDK Android (alpha)

Native Kotlin Android client for **application gateway protocol v1**. The SDK posts
normalized search requests to your application's exact HTTPS URL. It does not call
search providers, ship provider API keys, or implement provider-native endpoints.

The distributable is an Android AAR, not a JVM-only artifact. Local publication
coordinates are `dev.searchsdk:searchsdk-android:0.1.0-alpha.1`; these coordinates
are not a claim of publication to Maven Central. The AAR includes its MIT license;
Maven POM/Gradle module metadata declares runtime dependencies and a sources JAR.

## Use

Add the local verification repository or your own internal Maven repository, then:

```kotlin
dependencies {
    implementation("dev.searchsdk:searchsdk-android:0.1.0-alpha.1")
}
```

Create a client owned by your application component. The callback fetches a fresh,
short-lived **application access token** for every dispatched request. A missing
token omits Authorization. Never put provider keys in a mobile application.

```kotlin
import dev.searchsdk.android.*

val client = SearchClient(
    endpoint = "https://your-application.example/search",
    accessToken = { applicationSession.currentAccessToken() }, // suspend callback
    timeoutMs = 10_000,
    maxResponseBytes = 10 * 1024 * 1024,
    maxConcurrency = 4,
)

// From your application's lifecycle-owned coroutine scope:
val response = client.search(
    SearchRequest("Kotlin coroutines", limit = 5, includeDomains = listOf("kotlinlang.org"))
)
for (result in response.results) {
    val source = result.provenance.sourceUrl
    // Render result.title, result.url, and its provenance in your application.
}

// Ordered, bounded per-item outcomes; failures preserve successful siblings.
val outcomes = client.searchBatch(
    listOf(SearchRequest("one"), SearchRequest("two")),
    concurrency = 2,
    timeoutMs = 8_000,
)
client.close() // Close when the owning component is finished; not after every UI update.
```

See [`consumer/`](consumer/) for a separately compiled Android module using the
published local AAR, including an executable installed-artifact test.

## Behavior and scope

| Surface | Support |
| --- | --- |
| Normalized gateway search | `query`, `limit` 1–20 (default 5), include/exclude hostnames |
| Domain handling | ASCII DNS hostnames with at least two labels; lowercase, deduplicate, reject overlap |
| Response | Typed results, mandatory provenance, nullable usage, warnings, attempts, optional reuse |
| Whole-call deadline | 10 seconds default; validation, client queue, token callback, HTTP, decoded body and JSON validation |
| Batches | At most 1,000 items; concurrency 1–64, default 4, also bounded by client concurrency |
| Cancellation | Coroutine cancellation cancels the default HTTP exchange; cancellation remains `CancellationException` |
| Decoded response limit | 10 MiB default, configurable 1 byte–100 MiB; identity and gzip supported |
| Authentication | Optional per-dispatch suspend callback; bearer token is kept only for the active call |
| Provider-native operations | Unsupported; keep them on the application server |
| Local retries/fallback/cache | Unsupported; backend policy stays explicit |
| Device verification | Installed AAR exercised on Android 16 emulator with a local HTTPS fixture |

Only HTTP 200 is a success. A present `X-SearchSDK-Protocol` must equal `1`;
absence is accepted. Duplicate protocol headers are rejected. Redirects are never
followed, including same-origin redirects. The SDK does not append a route, retry
a POST, log requests, write credentials to disk, or expose upstream error bodies.
The owned OkHttp client is independent of process-global CookieHandler and
Authenticator state and HTTP authentication caches. It explicitly disables cookie
storage, server/proxy authentication, system proxy selection, HTTP caching,
redirects and transport retries. Request bodies are one-shot to prevent status-
driven replays such as HTTP 503 with Retry-After: 0. No process globals are changed
by the SDK. Enterprise proxies require an application-supplied transport that
preserves the same credential and redirect boundaries.
It rejects URL credentials, fragments, query strings, and non-HTTPS gateway URLs.

`SearchException` exposes a closed `SearchErrorCode` plus validated attempts,
optional status and retry delay. Messages are fixed and original transport/token
exceptions are discarded. Malformed error envelopes use the contract's HTTP
status mapping. Malformed successes, invalid UTF-8/JSON, duplicate JSON keys,
non-finite numbers, nesting deeper than 64 levels, invalid URLs/provenance and excess results are rejected.
Unknown response fields are ignored rather than surfaced. A typed request cannot
express arbitrary unknown request fields or a string-valued limit.

The whole-batch deadline includes validation and queued items. Its expiry retains
already completed outcomes and fills remaining positions with `TIMEOUT` failures.
External cancellation cancels the batch and throws `CancellationException`, as
expected by structured concurrency. Item failures do not cancel their siblings.
An item's timeout starts when its batch worker runs, before waiting for the
client's shared concurrency permit. Batch input lists are copied before the first
suspension. The application should not concurrently mutate a list during that copy.

An access-token callback must suspend cooperatively and avoid blocking its calling
thread. Applications own their session storage and coroutine scopes. Cancelling a
client call cannot promise exactly-once remote execution or undo an accepted POST.
`close()` rejects new work and cancels active calls of the owned default
transport; it does not close application-supplied transports or cancel an
application callback currently running. A reused application-supplied transport is
owned and closed by the application.

## Platform and dependencies

Android API 26+, compile SDK 36, Java bytecode target 8. Tested build toolchain:
JDK 21, Gradle 8.13, Android Gradle Plugin 8.13.2, Kotlin 2.4.20, installed Build
Tools 36.0.0. Gradle currently emits Kotlin's forward-looking deprecation warning
for Gradle 8.13; this pinned combination builds successfully. No Apple build runs.

The strict JSON/protocol code uses JDK/Android APIs only and does not depend on
any serialization framework or the separate Java SDK. Transport integration is
isolated in `OkHttpTransport.kt`. It uses `com.squareup.okhttp3:okhttp:5.4.0` with
its Android variant, Okio 3.17.0 and AndroidX annotation/startup dependencies.
The AAR also requires Kotlin stdlib and `kotlinx-coroutines-core:1.11.0`, declared
in metadata. Consuming builds must enable `android.useAndroidX=true`. These
platform integrations are intentional, not a zero-dependency claim. Main-thread dispatch support (`kotlinx-coroutines-android`) and any
AndroidX lifecycle integration belong to the consuming app. HTTP blocking work
runs on a private bounded worker pool, while JSON work uses `Dispatchers.Default`.
There is no independently packaged zero-dependency JVM core in this alpha.

`GatewayTransport` is injectable for deterministic tests or application networking
integration. `GatewayRequest` provides the exact endpoint, serialized request,
optional application bearer token, remaining timeout and decoded byte ceiling.
A custom transport must suspend cooperatively, enforce streaming/decompression
limits, and disable redirects. The client additionally checks returned byte size,
protocol, status and the full consumed JSON model. Custom transports must never
log the token or query. `GatewayRequest`, `GatewayResponse` and `SearchRequest`
have redacted `toString()` implementations.

## Build and deterministic verification

From this directory, set `JAVA_HOME` to an installed JDK 21 and `ANDROID_HOME` to
an installed Android SDK containing platform 36 and Build Tools 36.0.0. No npm
install or root workspace changes are needed. If invoking Node for repository
integration, use the version required by the root `.nvmrc` (24.22.1).

```sh
./gradlew testReleaseUnitTest assembleRelease lintRelease \
  publishReleasePublicationToVerificationRepository --no-daemon --max-workers=2
./gradlew -p consumer testReleaseUnitTest assembleRelease --no-daemon --max-workers=2
```

With an already booted emulator or test device, verify the installed AAR's actual
HTTPS transport, ordered batches, redirect rejection, decoded gzip/body ceilings,
deadlines and socket cancellation:

```sh
python3 -B scripts/verify-device.py --serial emulator-5554
```

Use the explicit serial shown by `adb devices`. This requires OpenSSL and generates
a short-lived local certificate and private key under `consumer/.local/`. Only the
instrumentation APK trusts that certificate, through its own network security
configuration; the production AAR's trust behavior is unchanged. The script uses
`adb reverse`, installs the test APK, and removes its reverse mapping and private
key on exit. The fixture records route counts, never request content or tokens.
Three instrumentation tests passed locally on an Android 16 emulator. Minimum-API
device behavior and physical devices have not been verified.

Heap limits, two Gradle workers, in-process Kotlin compilation, and serial unit
tests are configured in `gradle.properties`. Build and report output stays under
ignored `build/` and `.gradle/` directories. The standard Gradle wrapper includes
the official Gradle 8.13 distribution SHA-256. The local publication task writes
only `build/repository`; it does not publish externally.

Artifacts:

- `build/outputs/aar/searchsdk-android-release.aar`
- `build/repository/dev/searchsdk/searchsdk-android/0.1.0-alpha.1/`
- `build/reports/tests/testReleaseUnitTest/index.html`

Tests read `../../sdk-contract/fixtures/{request-cases,search-success,search-errors}.json`
directly as test resources. This avoids copied fixture drift. Kotlin-inexpressible
request cases are explicitly listed by name in conformance tests. Further tests
cover malformed JSON/UTF-8/fields, deadlines, cancellation, credential redaction,
bounded batches, gzip decoding, limits and real loopback HTTP sockets. Adversarial
tests install global CookieHandler/Authenticator instances, verify their isolation,
and restore those globals after testing. Production
HTTPS endpoint validation remains enabled; only test-injected target mappings
route requests to loopback. Tests perform no live provider calls and establish no
live provider correctness. The separate instrumentation check establishes behavior
on the tested emulator only.

This gateway-only package contains no generated provider operations. Provider
schemas, operation attribution and reproducible generation remain in the root
`scripts/providers-a` and `scripts/providers-b`; no catalog is copied or advertised
as implemented here. Provider-native access and backend fallback/retry policies
remain server responsibilities.
