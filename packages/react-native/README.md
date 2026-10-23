# @belweave/search-sdk-react-native

Alpha React Native client for an application-owned searchSDK protocol v1 HTTPS
gateway. The package has no JavaScript runtime dependencies. It includes an
autolinked iOS URLSession module and Android OkHttp module; no Expo integration,
provider keys, or consumer-written transport is required for bare React Native.

## Install and call

This alpha is available from source and local npm tarballs; public registry
publication is not established. From a checkout containing this package, using
the Node version in `.nvmrc`:

```sh
npm ci
npm run build -w @belweave/search-sdk-react-native
mkdir -p .local/releases/mobile
npm pack -w @belweave/search-sdk-react-native --pack-destination .local/releases/mobile
```

In your React Native application, install the generated archive and iOS pods:

```sh
npm install /path/to/searchSDK/.local/releases/mobile/belweave-search-sdk-react-native-0.1.0-alpha.0.tgz
cd ios && bundle exec pod install
```

Rebuild the application after installation. Metro selects the `react-native`
export automatically. Android autolinking registers `SearchSDKPackage`; iOS
autolinking installs `SearchSDKReactNative.podspec`. A missing native module fails
with `SearchError` code `configuration`; there is no fallback to native fetch.

```ts
import { createSearchClient, SearchError } from '@belweave/search-sdk-react-native';

const search = createSearchClient({
  endpoint: 'https://api.example.com/search', // Exact URL; no suffix is appended.
  accessToken: () => session.getShortLivedApplicationToken(),
  timeoutMs: 10_000,
  maxResponseBytes: 10 * 1024 * 1024,
  maxConcurrency: 4,
});

const controller = new AbortController();
try {
  const response = await search.web.search({
    query: 'cancellation semantics',
    limit: 5,
    includeDomains: ['example.org'],
  }, { signal: controller.signal });
  // response.results contains validated provenance; unknown usage is null.
} catch (error) {
  if (error instanceof SearchError) handleSearchError(error.code);
}
// On unmount or when a query is superseded: controller.abort().
```

`session` and `handleSearchError` above belong to the application. See
[`examples/consumer.ts`](examples/consumer.ts) for a typed consumer with explicit
application dependencies. This SDK does not own React component state or lifecycle.

## Scope and gateway protocol

The public API is `createSearchClient(options).web.search(request, options?)`
and `.web.searchBatch(requests, options?)`. Normalized request/response, result,
provenance, usage, warning, attempt, batch and error types are exported.

This is a gateway client, not a server-side provider adapter or provider-native
SDK. All provider selection, billing credentials, retries, fallback policies,
and native provider operations belong on the application server. No provider
operations are generated here; retained provider source tables and attribution
remain in `scripts/providers-a` and `scripts/providers-b` in the repository.
This package does not claim their native capability coverage.

The gateway accepts an individual `POST` with the normalized request as JSON.
The default result limit is 5; accepted integer limits are 1–20. Queries must be
nonblank and are preserved verbatim. Domain lists must be nonempty arrays of
ASCII hostnames with at least two labels, without URLs, ports, trailing dots,
or wildcards. Lists are lowercased and deduplicated; overlapping include/exclude
lists are invalid. Unknown request and option fields fail before dispatch.

Only HTTPS endpoints without user information, query strings, fragments,
whitespace, or backslashes are accepted. The exact supplied URL is used. A token
callback is invoked once for each dispatched operation, after acquiring the
client concurrency slot. Tokens must use the RFC 6750 bearer token character set.
They must be short-lived **application** credentials, never provider keys. The
SDK does not persist tokens or log requests/responses. Application transports,
device instrumentation, and application code must preserve this property.

HTTP 200 must contain `provider`, `results`, `usage`, `warnings`, `attempts`, and
optional `reuse`. `X-SearchSDK-Protocol: 1` is accepted; an absent version header
is accepted, and other values are rejected. All consumed fields are validated.
Unknown response fields are discarded. Result/provenance URLs must be HTTP(S)
without credentials. Numeric metadata must be finite; durations, costs, and
retry delays must be nonnegative. Extra results are validated and then capped
to the requested limit. Unknown usage must be `null`.

Non-2xx responses may contain `{"error":{"code":"auth","attempts":[]}}`,
with optional sanitized `status` and `retryAfterMs`. Recognized error codes and
validated attempt metadata are preserved; other fields are discarded. For
missing/malformed envelopes, 401/402/403/432/433 map to `auth`, 429 to `rate_limit`,
408 and 5xx to `unavailable`, and other statuses to `provider_error`. Unexpected
2xx responses and malformed successful payloads are `invalid_response`.
Redirects are rejected by the native transport as `invalid_response` before
any subsequent request. SDK errors contain fixed messages and public metadata;
no raw upstream body, exception, abort reason or authorization header is attached.
Attempt strings containing the current query or token are removed from errors.

## Bounds, cancellation and batches

`timeoutMs` defaults to 10 seconds and covers queueing, token acquisition,
transport, body decoding, JSON parsing and validation. JavaScript races work
that ignores cancellation and rechecks elapsed time after synchronous parsing.
Native calls also have a resource/call deadline. Timers are subject to the
platform event loop and application suspension; elapsed deadlines are rechecked
when execution resumes. `AbortController`, `URL`, and timers must be available;
the SDK needs neither Node APIs nor a `TextDecoder` polyfill.

`maxResponseBytes` defaults to 10 MiB of decoded bytes. iOS checks every decoded
URLSession delegate chunk before appending; Android checks the decoded OkHttp
stream before writing to its accumulator, including transparent gzip decoding.
No SDK accumulator exceeds the limit. The native networking stack may allocate
an individual chunk independently. The legacy bridge transfers the bounded body
as Base64, so bridge copies, Base64 expansion and parsed JSON add bounded memory
overhead; the byte limit is not a total application-memory ceiling.

Client `maxConcurrency` is 1–64 (default 4), with a FIFO queue capped at 1,024.
Android uses a dedicated dispatcher with two simultaneous native HTTP calls.
The whole-call timeout includes queued time. Cancelled waiters are removed
immediately. Aborting cancels the native call/socket; it cannot undo a POST that
already reached the gateway. The SDK never retries a gateway POST and does not
promise exactly-once remote side effects.

```ts
const outcomes = await search.web.searchBatch([
  { query: 'first' },
  { query: 'second', excludeDomains: ['example.org'] },
], { concurrency: 2, timeoutMs: 15_000, signal: controller.signal });
```

Batches accept at most 1,000 requests, snapshot all inputs before awaiting, and
return ordered `{index,status:'fulfilled',value}` or
`{index,status:'rejected',error}` outcomes. Invalid items, cancellations, deadlines
and gateway failures do not discard completed siblings. Concurrency is 1–64,
default 4, additionally constrained by the client limit. The batch timeout
covers all queued items and defaults to the client timeout; each dispatched item
also retains the client whole-call timeout. Invalid batch-level options reject
the batch. Empty batches return `[]`.

## Native security and advanced transports

The built-in module uses ephemeral URLSession without cookies, credential store,
cache, or redirects on iOS, and a dedicated OkHttp client with `NO_COOKIES`,
`Authenticator.NONE`, no cache, disabled redirects and disabled connection retry
on Android. It uses normal operating-system TLS certificate verification. It
does not weaken ATS, certificate trust, or application networking policy.

React Native documents limitations with `redirect:manual` and
`credentials:omit` in its [networking documentation](https://reactnative.dev/docs/network).
The package therefore does not use ambient `globalThis.fetch` as a mobile
transport. `createTrustedFetchTransport` is an advanced explicit trust boundary,
not a redirect or cookie polyfill:

```ts
import { createTrustedFetchTransport } from '@belweave/search-sdk-react-native';
const transport = createTrustedFetchTransport(verifiedImplementation, {
  rejectsRedirects: true,
  omitsCredentials: true,
});
const injected = createSearchClient({ endpoint, fetch: transport });
```

The application must verify these guarantees before attesting. Fetch receives
`redirect:'error'`, `credentials:'omit'`, `cache:'no-store'`, the abort signal,
remaining `timeoutMs`, and `maxResponseBytes`. It returns a structural
`FetchResponse`, using a `body.getReader()` decoded byte stream or
`readBoundedBody(maxBytes, signal)` implemented by a bridge that enforces the cap
**before** buffering. A `text()`, `json()` or `arrayBuffer()` call followed by a
size check is not sufficient. Text-only responses fail as `unsupported_option`;
there is no silent unbounded allocation fallback. Response redirect/URL checks
are defense in depth: checking after an unsafe redirect cannot undo disclosure.

The portable ESM entry point (for Node-based deterministic tests or non-Metro
tooling) requires explicit trusted injection. React Native/Metro selects the
native entry point through both the export map and `react-native` package field.

## Support and verification

| Surface | Implemented support | Verification |
| --- | --- | --- |
| JavaScript core | ES2022, structural AbortSignal, strict UTF-8 | Shared conformance fixtures; deterministic injected transports |
| iOS | iOS 15.1+, URLSession, CocoaPods autolinking | Nine Foundation tests, actual CocoaPods release app build, nine native runtime cases on a dedicated iOS 27.0 simulator |
| Android | API 24+, Java 11, OkHttp, Gradle autolinking | Eight HTTPS MockWebServer tests, actual release APK build, nine native runtime cases on Android 16 |
| React Native | Legacy NativeModules with architecture interop | Packed SDK in Expo 57.0.31 / RN 0.86.3 / Hermes release apps, new architecture, actual native network requests on iOS and Android |
| Expo Go | Custom native modules unavailable | Unsupported; use a native development build instead |
| Provider-native calls | None | Deliberately outside this package |

No live provider correctness is claimed. Tests use synthetic JSON and local TLS
fixtures, never provider credentials, paid calls or remote infrastructure.
The package includes no hooks, provider-native clients, cache, retries, persistent
jobs, direct arbitrary URL fetching, or MCP execution. Unsupported fields are
rejected instead of emulated.

From the repository, use Node `~/.nvm/versions/node/v24.22.1/bin/node` via PATH,
with the parent's existing dependency installation:

```sh
node node_modules/typescript/bin/tsc -p packages/react-native/tsconfig.json
node --test --test-concurrency=1 packages/react-native/test/*.test.mjs
node packages/react-native/scripts/verify-package.mjs
swift test --package-path packages/react-native --scratch-path packages/react-native/.local/swift-build --jobs 2
REACT_NATIVE_SOURCE_PATH=/path/to/actual/react-native node packages/react-native/scripts/verify-ios-bridge.mjs
GRADLE_BIN=/path/to/gradle-8.13/bin/gradle JAVA_HOME=/path/to/jdk21 ANDROID_HOME=/path/to/android-sdk node packages/react-native/scripts/verify-android.mjs
```

`node packages/react-native/scripts/prepare-reference.mjs` retrieves the exact
official React Native 0.86.3 archive, verifies its SHA-512 integrity, and extracts
headers to `packages/react-native/.local/upstream/package` for the bridge check.
It runs no package scripts and installs no runtime dependencies.

The package verification script packs the distributable, extracts it into an
isolated installed consumer, typechecks the example and public exports, runs
the core and React Native export branches with deterministic bridge fixtures,
and checks native metadata is present. It does not install or modify workspace
dependencies. Build/test scratch stays under `.local/` and `dist/`.

The reproducible [`test/native-app`](test/native-app/README.md) harness uses the
default native module in an installed packed consumer against a loopback TLS
gateway. It verifies success/provenance, redirects, gzip limits, sanitized auth
errors, protocol versions, cancellation, deadlines, batches and cookie isolation.
Both platforms passed all nine cases, including the Expo native-entry check.
Both observed zero redirect-sink requests and zero
ambient cookies; Android also verified both hanging sockets closed after abort
and deadline. These local fixtures do not establish provider correctness,
physical-device behavior, or compatibility with untested framework versions.

License: MIT, copied from the repository root. React Native and provider marks
belong to their respective owners.
