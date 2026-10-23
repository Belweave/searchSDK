# Native application runtime fixture

These files exercise the **default autolinked native module** from an installed
packed SDK in a real React Native application. They do not inject a fetch
transport. The fixture server binds only loopback and uses synthetic data and
an application-token fixture, never a provider key or provider endpoint.

For an isolated Expo 57 / React Native 0.86.3 consumer:

1. From the repository root, run `npm run build:mobile`, then
   `node packages/react-native/scripts/prepare-native-consumer.mjs`. This packs
   both SDKs, installs them in a fresh `.local/locked-native-consumer-*` directory
   with `npm ci`, and copies this harness. `consumer-lock.json` fixes every
   framework/transitive dependency; the script updates only the local SDK archive
   hashes and rejects changed SDK dependency metadata. The resulting app path is
   also in `.local/latest-native-consumer.json`. Keep all dependencies, generated native
   projects and build products under the package `.local/` directory. Do not
   modify installed SDK code; repack and reinstall any SDK changes.
2. Generate a short-lived localhost TLS test certificate/key in
   `.local/native-tls/{cert,key}.pem`, with `DNS:localhost` and `IP:127.0.0.1`
   Subject Alternative Names. Trust that certificate only in the dedicated
   verification simulator (`xcrun simctl keychain <dedicated-uuid> add-root-cert
   <cert-path>`). Do not change system trust or SDK certificate verification.
3. Run `NATIVE_FIXTURE_SCRATCH=<absolute-package-path>/.local node
   test/native-app/fixture-server.mjs`. The synthetic gateway listens at
   `https://127.0.0.1:19443`.
4. Run Expo prebuild and CocoaPods from the isolated consumer. On iOS 27, the
   Expo 57 template needs a scene lifecycle before it can launch. Run
   `node test/native-app/prepare-ios-scene.mjs
   <consumer>/ios/SearchSDKNativeVerification` against **only the dedicated
   generated fixture app**. This attaches the template's existing React root
   window to a UIWindowScene and adds its scene manifest; no SDK or networking
   policy changes are involved. Build Release for
   a generic simulator destination, with `xcodebuild -jobs 2`, an explicit
   `.local/` derived-data directory and `EXTRA_PACKAGER_ARGS='--max-workers 2'`.
   Install and launch only on the dedicated verification simulator.
5. The application reports assertions through its UI and writes
   `.local/native-runtime-report.json` via the local fixture server. Verify
   `passed: true`, passed cases, zero redirect-sink requests, zero cookies,
   zero incorrect authorization headers, and normalized domain filters.

Cases cover normalized success/provenance, credential-preserving redirect
rejection before a second request, decoded gzip limits, sanitized auth errors,
protocol negotiation, native abort, whole-call deadlines, ordered batches and
cookie isolation. The HTTP server never logs request bodies or headers.

The harness also checks the packed Expo native entry point. All nine cases have
passed in release apps on the iOS simulator and Android emulator.

For Android, use the same isolated installed consumer and certificate, run Expo
prebuild for Android, and prepare **only that generated fixture application**:

```sh
node test/native-app/prepare-android.mjs <isolated-consumer> <fixture-cert.pem>
adb -s <explicit-serial> reverse tcp:19443 tcp:19443
```

The fixture app's domain-specific network policy trusts the local test CA only
for `127.0.0.1`. It does not alter SDK certificate verification or system trust.
Build the consumer's release APK with JDK 21, SDK 36, `--max-workers=2`,
`-PreactNativeArchitectures=arm64-v8a`, `CMAKE_BUILD_PARALLEL_LEVEL=2`, and an
explicit bounded Gradle heap. Install and launch on the one selected emulator.
Reports are written to `.local/native-runtime-android-report.json` and the
generic `native-runtime-report.json`; iOS uses `native-runtime-ios-report.json`.
Remove only this fixture's adb reverse rule after verification.
