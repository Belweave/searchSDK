# @belweave/search-sdk-expo

Alpha Expo integration for the searchSDK **application gateway** client. It
provides `createExpoSearchClient`, selects Expo streaming fetch on web and the
sibling's secure native transport on iOS/Android, and delegates protocol
validation, deadlines, cancellation, concurrency, and decoded response limits to
`@belweave/search-sdk-react-native`. Native use requires an Expo development or
production build with the sibling native module linked; stock Expo Go is not
supported by the default native transport.

This package has no direct provider adapters or provider-native endpoints. Those
are server-side surfaces in the TypeScript SDK. No provider operations are
generated or duplicated here; retained schema sources and attribution remain in
`scripts/providers-a` and `scripts/providers-b` in the repository.

## Installation

In an existing Expo SDK 55–57 application, install matching alpha versions:

```sh
npx expo install expo
npm install @belweave/search-sdk-expo@0.1.0-alpha.0 @belweave/search-sdk-react-native@0.1.0-alpha.0
```

These commands apply once the alpha packages are available from your configured
registry; during repository development, use the locally packed tarballs. Expo
and the React Native client are peers. Expo is marked optional in npm metadata
so unrelated workspace checks do not install the native toolchain; an Expo
application consuming this adapter must explicitly install Expo. The adapter uses
the React Native peer's autolinked native module; it adds no native code of its own,
config plugin, React hooks, persistence library, or global polyfill. Its ESM
exports include `types`, `react-native`, `browser`, `import`, and `default`;
`main`, `module`, and `react-native` also support Metro's legacy package lookup.
The `react-native` condition selects a separate native entry, which resolves the
sibling's corresponding native entry. Build the native app with `npx expo run:ios`,
`npx expo run:android`, or your existing EAS development/production build workflow
after installing the peer. Installing it in Expo Go does not add native modules.
The `browser` condition precedes `react-native`, as required when
[Metro asserts both conditions for web](https://metrobundler.dev/docs/configuration/#unstable_conditionsbyplatform).
Expo's [autolinking documentation](https://docs.expo.dev/modules/autolinking/)
describes native dependency discovery; use your application's normal Expo build
workflow after adding the native peer.

## Usage

```ts
import { createExpoSearchClient, SearchError } from '@belweave/search-sdk-expo';

const client = createExpoSearchClient({
  endpoint: 'https://your-app.example/api/search',
  // Your application's session callback; never return a provider API key.
  accessToken: () => session.getAccessToken(),
  timeoutMs: 10_000,
  maxResponseBytes: 1024 * 1024,
  maxConcurrency: 2,
});

const controller = new AbortController();
try {
  const response = await client.web.search({
    query: 'Expo streaming fetch',
    limit: 5,
    includeDomains: ['docs.expo.dev'],
  }, { signal: controller.signal });
  // response.results retain provider/source URL/retrieval provenance.
} catch (error) {
  if (error instanceof SearchError) showErrorCode(error.code);
}
// Call controller.abort() on cancellation or screen unmount.
```

`session` and `showErrorCode` belong to the consuming application. Authentication
is optional: omit `accessToken` for an application gateway that needs no token.
The [Expo app example](examples/app/App.tsx) shows a complete screen with explicit
search/cancel actions, unmount cleanup, and protection against stale UI updates.

```ts
const outcomes = await client.web.searchBatch(
  [{ query: 'first' }, { query: 'second', excludeDomains: ['example.com'] }],
  { concurrency: 2, timeoutMs: 5_000, signal: controller.signal },
);
for (const outcome of outcomes) {
  if (outcome.status === 'fulfilled') useResults(outcome.value.results);
  else showErrorCode(outcome.error.code);
}
```

Batch outcomes retain input order and an `index`. An individual failure leaves
successful siblings available. The batch deadline includes queued work; the
client's concurrency ceiling also applies. There are no automatic POST retries,
fallbacks, or exactly-once delivery guarantees. Provider retry/fallback policy
belongs to the application-owned server.

## Gateway and limits

The exact configured HTTPS URL receives JSON `POST` requests; the adapter adds no
path suffix. Credentials in the URL, query strings, fragments, HTTP endpoints,
unknown configuration/request fields, and overlapping include/exclude filters
are rejected. Queries must be nonblank, limits are integers 1–20 (default 5), and
domain filters contain nonempty arrays of ASCII hostnames, lowercased and
deduplicated.

The server implements [application gateway protocol v1](../../sdk-contract/README.md).
It returns HTTP 200 with a normalized `SearchResponse`: `provider`, `results`,
`usage` (`null` when unknown), `warnings`, `attempts`, and optional `reuse`.
Every result requires provenance. A present `X-SearchSDK-Protocol` header must
equal `1`. Non-2xx failures use the sanitized protocol error envelope; malformed
error envelopes fall back to status-based codes. Successful responses with
invalid JSON, schema, URLs, provenance, or metadata reject as `invalid_response`.

| Option | Default | Meaning |
| --- | --- | --- |
| `endpoint` | Required | Exact application-owned HTTPS gateway URL |
| `accessToken` | None | Callback returning the current application bearer token |
| `timeoutMs` | 10,000 | Whole-call budget including queue, token lookup and body read |
| `maxResponseBytes` | 10 MiB | Decoded response byte ceiling, enforced while reading |
| `maxConcurrency` | 4 | Per-client active operation ceiling, 1–64 |
| `fetch` | Expo fetch on web; sibling native module on iOS/Android | Explicit trusted transport override |

`search` accepts `{ signal }`. `searchBatch` additionally accepts `concurrency`
(default 4, 1–64) and `timeoutMs` (default client deadline), and at most 1,000
requests. The shared client bounds its pending operation queue to 1,024 entries.
Options and returned type aliases come directly from the sibling client;
`SearchError` is the same class instance exported by that package.

The SDK requests `redirect: 'error'` and `credentials: 'omit'`. Web delegates
these modes to standard browser fetch through Expo. Native uses the sibling's
transport with redirects disabled and isolated credential/cookie handling; it
does not use Expo fetch's shared native session. Tokens are acquired per
dispatched request, never cached, logged or written to device storage. Exceptions
exclude raw transport errors, response bodies and cancellation reasons. The SDK
does retain the application-supplied token callback as client configuration;
the application owns its callback's storage and refresh policy.

The byte ceiling bounds the decoded bytes consumed by the client before JSON
parsing; the native bridge also applies a bound before returning its body to JS.
It is not a claim that operating-system networking layers allocate at most that
many bytes. Cancellation settles SDK work promptly
even if a transport ignores its signal; stopping already transmitted remote work
is best effort. Mobile OS suspension may defer JavaScript timers; this is a
foreground client, not a background execution guarantee.

## Compatibility

Expo's official versioned references document named `expo/fetch` imports and
streaming readers for [SDK 55](https://docs.expo.dev/versions/v55.0.0/sdk/expo/),
[SDK 56](https://docs.expo.dev/versions/v56.0.0/sdk/expo/) and
[SDK 57](https://docs.expo.dev/versions/v57.0.0/sdk/expo/).
The SDK 56/57 references also document Expo fetch as the native global default
and the `EXPO_PUBLIC_USE_RN_FETCH=1` opt-out. The web entry uses the named import.
The native entry uses the sibling native module, independent of that flag; it
does not depend on the ambient native fetch.

| Target | Package policy | Verification scope |
| --- | --- | --- |
| Expo SDK 55–57 development/production builds on iOS/Android | Sibling native module must be autolinked | Expo 57.0.31 / RN 0.86.3 release apps exercised the packed Expo native entry on iOS 27.0 and Android 16; SDK 55/56 have source/type checks only |
| Stock Expo Go on iOS/Android | Default native transport unsupported; missing module rejects `configuration` | Explicit missing-module test; no silent Expo/global fetch fallback |
| Expo web, SDK 55–57 | Same public client; application gateway must satisfy browser CORS | Packed consumers checked against each official Expo version; real Expo 57 Metro web bundle executed in a browser with deterministic streaming responses |
| Metro ESM/package exports | Built JavaScript and declaration entry points; no Node runtime imports | Actual Expo 57 consumer exports for web/iOS/Android, plus TypeScript Bundler and dual browser/native condition checks |
| Bare React Native | Use the sibling package and a verified transport | Outside the Expo adapter's runtime scope |
| Expo SDK ≤54 or ≥58, tvOS, alternate engines | Outside this alpha's peer range or verification scope | Not claimed |
| Direct provider or native provider API calls | Unsupported in application clients | No provider credentials or generated provider endpoints exposed |

Native source review supplements the API references: Expo
[Android request construction](https://github.com/expo/expo/blob/sdk-57/packages/expo/android/src/main/java/expo/modules/fetch/NativeRequest.kt)
disables redirects and cookies for the corresponding request modes; its
[iOS request construction](https://github.com/expo/expo/blob/sdk-57/packages/expo/ios/Fetch/ExpoURLSessionTask.swift)
and [redirect handling](https://github.com/expo/expo/blob/sdk-57/packages/expo/ios/Fetch/NativeResponse.swift)
implement redirect rejection and cookie omission. However, the upstream
[iOS session factory](https://github.com/expo/expo/blob/sdk-57/packages/expo/ios/Fetch/ExpoFetchModule.swift)
uses `URLSessionConfiguration.default` without disabling URL credential storage.
Apple documents that [default sessions use shared credential storage](https://developer.apple.com/documentation/foundation/urlsessionconfiguration/urlcredentialstorage).
Cookie omission alone therefore does not establish complete ambient HTTP
credential isolation. The native entry deliberately selects the secure sibling
transport instead of attesting that unsupported guarantee.

Run `npm run prepare:reference -w @belweave/search-sdk-expo`, then
`npm run check:expo-source -w @belweave/search-sdk-expo`. Preparation downloads
exact official Expo 55.0.0, 56.0.0, and 57.0.31 source archives, verifies pinned
SHA-512 integrity, and extracts them under `.local/`; it installs no native
dependencies and executes no downloaded package scripts. The check verifies
redirect rejection and cookie omission in both platform sources and records
source SHA-256 hashes, version, npm provenance and the credential-storage gap in
`.local/expo-source-checks.json`. It does not execute a native runtime. This
package bundles no Expo source.

## Transport overrides

Tests or applications can override `fetch` with a transport created by the
sibling's exported `createTrustedFetchTransport`. This is an explicit trust
declaration, not a wrapper that makes an unsafe transport secure:

```ts
import { createExpoSearchClient, createTrustedFetchTransport } from '@belweave/search-sdk-expo';

const transport = createTrustedFetchTransport(verifiedFetchImplementation, {
  rejectsRedirects: true,
  omitsCredentials: true,
});
const client = createExpoSearchClient({ endpoint, fetch: transport });
```

Only attest after verifying those guarantees on every target platform. An override
must provide a readable byte stream or the sibling's bounded native-body bridge,
respect cancellation, and reject redirects before sending a second request.
There is no fallback to unbounded `text()`/`arrayBuffer()` buffering. A plain React
Native global fetch is not a verified substitute. The defaults need no application attestation: the web entry uses the official
Expo web fetch implementation; the native entry uses the sibling's transport.
A trusted override is also allowed when a custom development client supplies a
separately verified transport.

## Development and verification

Use the repository's Node 24.22.1 and parent-managed dependencies. Build the React
Native sibling first. From the repository root:

```sh
export PATH="$HOME/.nvm/versions/node/v24.22.1/bin:$PATH"
npm run build -w @belweave/search-sdk-expo
npm test -w @belweave/search-sdk-expo
npm run prepare:reference -w @belweave/search-sdk-expo
npm run test:package -w @belweave/search-sdk-expo
npm run check:expo-types -w @belweave/search-sdk-expo
npm run check:expo-source -w @belweave/search-sdk-expo
# All of the above, including preparation, can also run together:
npm run check -w @belweave/search-sdk-expo
```

Web tests substitute the `expo/fetch` module boundary and execute the actual
React Native client. Native-entry tests run the sibling's actual native bridge
JS with a deterministic React Native module registry. They exercise transport selection, strict options,
normalization, token handling, cancellation, deadlines, streaming byte limits,
malformed/error responses, redirects and bounded batch outcomes. They never
contact a provider.

The packaged-consumer check packs and extracts both real SDK artifacts into an
isolated `.local/consumer-*` directory, executes the official Expo web fetch
source with deterministic global fetch responses, and checks NodeNext and
Metro-style TypeScript consumers. A second runtime consumer resolves the actual
`react-native` export conditions and executes the packed sibling's native bridge
with a deterministic native-module boundary. It uses installed Expo or `EXPO_PACKAGE_DIR`
pointing to an official unpacked Expo tarball, and performs no dependency install
or native build. Temporary files remain ignored under this package's `.local/`.
The sibling package's [native application harness](../react-native/test/native-app/README.md)
also built real CocoaPods/Gradle release apps from packed SDKs and exercised this
Expo native entry against a local TLS gateway. All nine harness cases passed on
iOS 27.0 Simulator and Android 16 Emulator: provenance, Expo entry resolution,
redirect rejection, gzip limits, sanitized auth errors, protocol negotiation,
cancellation, deadlines, batches and cookie isolation. This does not establish
physical-device behavior or runtime compatibility with SDK 55/56.

An actual Expo/Metro consumer check is available separately:

```sh
npm run test:metro -w @belweave/search-sdk-expo
```

This opt-in command creates `.local/metro-*`, packs both SDKs, installs those
artifacts and locked official Expo 57.0.31/React Native 0.86.3 dependencies there,
then runs sequential web, iOS and Android Metro exports with `--max-workers 2`.
The checked-in native consumer lock fixes transitive framework packages; only
the two freshly packed local SDK hashes change. `npm ci` may download npm packages; the exports run with
`EXPO_OFFLINE=1`, `CI=1` and telemetry disabled. Native exports use `--no-bytecode`;
they compile JavaScript only and do not invoke Xcode/Gradle or prove native bridge
execution. No package is published. Logs and the consumer lockfile stay ignored
under `.local/`; `.local/metro-verification.json` records the result.

Serve the exported web app with:

```sh
node packages/expo/test/metro-app/serve.mjs /absolute/path/to/consumer/dist-web
```

Open its printed loopback address. The fixture app uses the real Expo web fetch
entry with a deterministic global fetch boundary, rejects all external fetches,
and reports `PASS: 5 browser assertions; 6 deterministic requests`. It verifies
streamed provenance, ordered batch/error outcomes, cancellation, decoded byte
limits and absence of retries. Local browser execution passed. Native fixture
screens never dispatch network requests.

Building the optional Expo peer
does not require installing its entire toolchain: a private, non-shipped fetch
declaration is used for the workspace build. Compatibility checks against
unmodified official Expo declarations exclude that build-only declaration.
The source/type scripts also accept one or more unpacked Expo package directories
as positional arguments. Local compatibility checks covered official Expo
55.0.0, 56.0.0 and 57.0.31 tarballs. The example was separately type-checked against
React Native 0.86.3 and React 19 declarations; it was not rendered on a device.

MIT license; see [LICENSE](LICENSE). Expo and provider names retain their owners'
trademarks. No provider keys belong in `EXPO_PUBLIC_*` variables or app bundles.
