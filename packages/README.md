# SDK packages

This is the technical entry point for the SDK implementations in this repository.
Package versions are independent alpha versions. Source and locally built artifacts
do not imply availability in a public package registry.

| Package | Target and installation format | Supported surface |
| --- | --- | --- |
| [TypeScript](sdk/README.md) | Node.js; npm | Normalized adapters, native clients, gateway server |
| [Swift](swift/README.md) | Swift 6; iOS 16+, macOS 13+, tvOS 16+, watchOS 9+, visionOS 1+; SwiftPM | Gateway client |
| [Android](android/README.md) | Kotlin; Android API 26+; Maven AAR | Gateway client |
| [React Native](react-native/README.md) | React Native; npm with iOS/Android native bridges | Gateway client |
| [Expo](expo/README.md) | Expo; npm, native development build or web | Gateway client |
| [Python](python/README.md) | Python 3.11+; wheel and source distribution | Normalized adapters, native clients, gateway client |
| [C](c/README.md) | C11 and POSIX; CMake, pkg-config | Normalized adapters, native clients, gateway client |
| [C++](cpp/README.md) | C++17 over the C ABI; CMake, pkg-config | Typed C++ facade for the C package |
| [Java](java/README.md) | Java 17+; Maven JAR and automatic module | Normalized adapters, native clients, gateway client |
| [Go](go/README.md) | Go 1.23+; Go module | Normalized adapters, native clients, gateway client |
| [Rust](rust/README.md) | Rust 1.98+; Cargo crate | Normalized adapters, native clients, gateway client |
| [.NET](dotnet/README.md) | .NET 10; NuGet | Normalized adapters, native clients, gateway client |

The root [Package.swift](../Package.swift) allows SwiftPM to consume this Git
repository directly. The Go module lives at
`github.com/Belweave/searchSDK/packages/go`; a release tag must include the
`packages/go/` prefix. Follow each package's README for exact local artifact
installation, toolchains, dependencies, and platform verification boundaries.

## Provider and gateway boundaries

Server packages implement 14 normalized web-search adapters. Their native clients
cover 493 retained operation bindings across 13 providers. These are separate
surfaces: provider-native APIs preserve provider-specific inputs and outputs;
normalized adapters expose the documented common subset. The binding count is
not a claim about all possible upstream endpoints. Valyu and SearXNG have
normalized adapters; WonderSearch has a native client.

Mobile packages send normalized requests to an application-owned HTTPS gateway.
Provider credentials and provider execution stay on the server. Application
tokens are supplied per request and are not persisted by the SDK. The
[gateway protocol](../sdk-contract/README.md) defines shared requests, responses,
sanitized errors, provenance, cancellation, deadlines, and response ceilings.
The TypeScript [gateway handler](sdk/GATEWAY.md) provides a server implementation
with an application-supplied authorization callback.

Native Expo usage requires a development build containing the React Native
bridge. Expo Go does not include that bridge. The Expo README distinguishes
source/type compatibility checks from installed native runtime verification.

## Verification and source regeneration

Use the pinned Node version in `.nvmrc` and `npm ci` for repository tooling.
`npm run check` verifies the TypeScript SDK, website, shared contracts, React
Native and Expo JavaScript packages, and their packed consumers. Native language
builds have their own toolchains and verification commands in each package's
README. The [SDK workflow](../.github/workflows/sdk-variants.yml) runs those
independent checks with bounded build concurrency.

Native clients derive from the retained public source tables and schemas under
`scripts/providers-a` and `scripts/providers-b`. Each implementation records its
sources and provides a regeneration check. [Shared fixtures](../sdk-contract/fixtures)
cover request validation, gateway envelopes, and normalized provider wires.
Installed-consumer checks exercise the actual wheel, module zip, JAR, AAR,
crate, NuGet, npm, SwiftPM, or CMake artifact instead of importing checkout
internals. See the package README for its precise checks.

Tests use synthetic fixtures and local loopback servers. They make no paid
provider calls and do not establish live-provider verification. Retry, fallback,
streaming, schema-validation, and platform support boundaries are documented per
package; there is no blanket claim of identical behavior across languages.

## Releases

Verification and packaging commands prepare local artifacts only. No command in
the verification workflow publishes a package, creates a release tag, deploys a
site, or provisions remote infrastructure. Registry ownership, package names,
signing, credentials, and release versions must be configured deliberately before
a first public release. The existing TypeScript package remains independent of
the website and has no runtime dependencies.
