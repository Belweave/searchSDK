import type { CodeLanguage } from "./docs/model.js";

/** Public alpha capabilities, checked against each package's metadata and README. */
export interface SdkEntry {
  id: string;
  name: string;
  target: "server" | "app";
  directory: string;
  packageName: string;
  version: string;
  runtime: string;
  surface: string;
  install: string;
  installLanguage?: CodeLanguage;
  installNote: string;
  example: string;
  language: CodeLanguage;
  filename: string;
  exampleNote: string;
  verify: string;
  verified: string;
  limits: readonly string[];
}

export const sdkSourceUrl = "https://github.com/Belweave/searchSDK";
export const sourceCheckout = `git clone https://github.com/Belweave/searchSDK.git
cd searchSDK
# Record this revision with your application's dependency lock.
git rev-parse HEAD`;
export const sdkHref = (id: string) => `/docs/sdks/${id}`;
export const sdkReadme = (sdk: Pick<SdkEntry, "directory">) => `${sdkSourceUrl}/tree/main/packages/${sdk.directory}#readme`;
const serverSurface = "14 normalized web-search adapters and 493 retained native bindings across 13 providers";
const gatewaySurface = "Normalized search through your application's HTTPS gateway";

export const sdks: readonly SdkEntry[] = [
  {
    id: "typescript", name: "TypeScript / JavaScript", target: "server", directory: "sdk",
    packageName: "@belweave/search-sdk", version: "0.1.0-alpha.0", runtime: "Node 24.22.1+ within Node 24, or Node 26.12.1+ within Node 26",
    surface: `${serverSurface}; application gateway server`,
    install: `nvm use
npm ci
npm run build:sdk
npm pack -w @belweave/search-sdk

# In your application, install the generated artifact:
npm install /absolute/path/searchSDK/belweave-search-sdk-0.1.0-alpha.0.tgz`,
    installNote: "Use the repository's .nvmrc. The package is ESM with declarations and no runtime dependencies. Build from the current revision to include the gateway export; the alpha version alone does not identify its contents.",
    example: `import { createSearch } from '@belweave/search-sdk';
import { exa } from '@belweave/search-sdk/exa';

const apiKey = process.env.EXA_API_KEY;
if (!apiKey) throw new Error('EXA_API_KEY is required');

const search = createSearch({
  provider: exa({ apiKey }),
  timeoutMs: 10_000,
});
const response = await search.web.search({
  query: 'SQLite write concurrency', limit: 3,
});
console.log(response.results, response.attempts);`,
    language: "typescript", filename: "search.mjs",
    exampleNote: "Set EXA_API_KEY in your server environment and run node search.mjs. This is plain ESM JavaScript; TypeScript projects use the same imports. A real request can incur provider charges.",
    verify: "npm run check", verified: "SDK and gateway tests, shared fixtures, static documentation and extracted npm consumers.",
    limits: ["The optional cache, in-flight request sharing and durable workflows are TypeScript APIs, not a promise of parity in every language.", "Provider keys and execution stay on the server; browser applications use their own authenticated server route."],
  },
  {
    id: "python", name: "Python", target: "server", directory: "python", packageName: "searchsdk", version: "0.1.0a0", runtime: "Python 3.11+",
    surface: `${serverSurface}; gateway client`,
    install: `python3 -m venv .venv
.venv/bin/python -m pip install ./packages/python`,
    installNote: "Run from the source checkout. pip builds and installs the local Python package. Its build tools are separate from the dependency-free package runtime. Use this virtual environment for the example.",
    example: `import os
from searchsdk import SearchClient, SearchRequest, exa

search = SearchClient(
    exa(os.environ["EXA_API_KEY"]),
    timeout_ms=10_000,
)
response = search.search(SearchRequest(
    "SQLite write concurrency", limit=3,
))
for result in response.results:
    print(result.url, result.provenance.provider)`,
    language: "python", filename: "search.py",
    exampleNote: "Set EXA_API_KEY in the server environment, then run .venv/bin/python search.py. Async search and batches are also available. A real request can incur provider charges.",
    verify: `python3 -m venv packages/python/.build/verify
packages/python/.build/verify/bin/python -m pip install -r packages/python/requirements-dev.txt
packages/python/.build/verify/bin/python packages/python/scripts/verify.py`,
    verified: "Python 3.11 and 3.15, generated types, fixtures, wheel and source-distribution consumers.",
    limits: ["No successful-result cache, in-flight deduplication or durable workflow store in this alpha.", "Async methods use standard-library workers. Cancellation cannot forcibly terminate custom providers that ignore it."],
  },
  {
    id: "go", name: "Go", target: "server", directory: "go", packageName: "github.com/Belweave/searchSDK/packages/go", version: "0.1.0-alpha.1", runtime: "Go 1.23+",
    surface: `${serverSurface}; gateway client`,
    install: `# In your application's existing Go module, for a local checkout:
go mod edit -require=github.com/Belweave/searchSDK/packages/go@v0.0.0
go mod edit -replace=github.com/Belweave/searchSDK/packages/go=/absolute/path/searchSDK/packages/go
go mod tidy`,
    installNote: "Add the import shown below before go mod tidy. This local replace is a development installation, not a published module version. Future release tags must use the packages/go/v prefix. The module uses only the standard library.",
    example: `package main

import (
    "context"
    "fmt"
    "log"
    "os"
    "time"
    searchsdk "github.com/Belweave/searchSDK/packages/go"
)

func main() {
    provider, err := searchsdk.NewAdapter("exa", searchsdk.AdapterOptions{
        APIKey: os.Getenv("EXA_API_KEY"),
    })
    if err != nil { log.Fatal(err) }
    search, err := searchsdk.New(searchsdk.Config{Provider: provider})
    if err != nil { log.Fatal(err) }
    ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
    defer cancel()
    response, err := search.Search(ctx, searchsdk.Request{
        Query: "SQLite write concurrency", Limit: 3,
    })
    if err != nil { log.Fatal(err) }
    fmt.Println(response.Results)
}`,
    language: "go", filename: "main.go",
    exampleNote: "Set EXA_API_KEY on your server and run go run . from the application module. Keep context cancellation tied to the incoming request in a service.",
    verify: `go -C packages/go test -race -p 2 ./...
go -C packages/go vet -p 2 ./...
python3 -B packages/go/internal/verify_consumer.py`,
    verified: "Go 1.23 and 1.27 race checks and an external consumer resolving a local module-proxy ZIP without replace.",
    limits: ["No cache, deduplication or automatic side-effect recovery.", "Custom providers and RoundTrippers must honor context.Context; the SDK does not hide uncooperative work in detached workers."],
  },
  {
    id: "java", name: "Java", target: "server", directory: "java", packageName: "dev.belweave:search-sdk", version: "0.1.0-alpha.0", runtime: "Java 17+",
    surface: `${serverSurface}; gateway client`,
    install: `mvn -T 2 -f packages/java/pom.xml install

# Add this dependency to your application's pom.xml:
# groupId: dev.belweave
# artifactId: search-sdk
# version: 0.1.0-alpha.0`,
    installNote: "Maven install writes to your local Maven repository. It does not publish to Maven Central. The JAR's automatic module is dev.searchsdk, and it has no runtime dependencies. Use Maven 3.9+ and JDK 17+.",
    example: `import dev.searchsdk.*;
import java.time.Duration;

public class SearchExample {
    public static void main(String[] args) {
        var search = SearchClient.builder(
            Providers.exa(System.getenv("EXA_API_KEY")))
            .timeout(Duration.ofSeconds(10))
            .build();
        var response = search.search(new SearchRequest(
            "SQLite write concurrency", 3
        )).toCompletableFuture().join();
        for (var result : response.results()) {
            System.out.println(result.url());
        }
    }
}`,
    language: "java", filename: "SearchExample.java",
    exampleNote: "Add the local Maven dependency, set EXA_API_KEY in the server environment and run this class with that dependency on the classpath. The service API returns CompletionStage.",
    verify: `bash packages/java/scripts/verify.sh
bash packages/java/scripts/verify-maven.sh`,
    verified: "JDK 17, 21, 25 and 27; packed classpath/module consumers and a separate Maven consumer.",
    limits: ["Compressed HTTP responses are rejected by this alpha transport.", "Native wire models do not enforce every JSON Schema constraint or establish provider account entitlement."],
  },
  {
    id: "rust", name: "Rust", target: "server", directory: "rust", packageName: "searchsdk", version: "0.1.0-alpha.1", runtime: "Rust / Cargo 1.98+",
    surface: `${serverSurface}; gateway client`,
    install: `[dependencies]
searchsdk = { path = "/absolute/path/searchSDK/packages/rust" }
tokio = { version = "=1.53.1", features = ["rt", "macros"] }`, installLanguage: "toml",
    installNote: "Add these entries to your application's Cargo.toml. This uses the source checkout, not a crates.io release. The SDK uses Tokio, Reqwest with rustls, and Serde; retain Cargo.lock.",
    example: `use searchsdk::{Provider, ProviderId, SearchClient, SearchRequest, CallOptions};

#[tokio::main(flavor = "current_thread")]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let key = std::env::var("EXA_API_KEY")?;
    let search = SearchClient::new(Provider::new(ProviderId::Exa, key)?)?;
    let response = search.search(
        SearchRequest::new("SQLite write concurrency"),
        CallOptions::default(),
    ).await?;
    for result in response.results {
        println!("{}", result.url);
    }
    Ok(())
}`,
    language: "rust", filename: "src/main.rs",
    exampleNote: "Set EXA_API_KEY on the server, then cargo run. This request uses the default result limit of five; no network request runs during compilation.",
    verify: `cargo test --manifest-path packages/rust/Cargo.toml --locked -j 2
cargo clippy --manifest-path packages/rust/Cargo.toml --locked -j 2 -- -D warnings
cargo package --manifest-path packages/rust/Cargo.toml --locked`,
    verified: "534 tests, formatting, Clippy, Cargo packaging and a consumer built from the extracted crate.",
    limits: ["Native schema models preserve provider fields but are not an exhaustive runtime JSON Schema validator.", "Keep provider execution on servers; a Cargo build does not establish mobile, browser or WebAssembly support."],
  },
  {
    id: "dotnet", name: "C# / .NET", target: "server", directory: "dotnet", packageName: "SearchSdk", version: "0.1.0-alpha.1", runtime: ".NET 10",
    surface: `${serverSurface}; gateway client`,
    install: `dotnet pack packages/dotnet/src/SearchSdk/SearchSdk.csproj -c Release -o .local/nuget /m:2

# In your .NET 10 application:
dotnet add package SearchSdk --version 0.1.0-alpha.1 --source /absolute/path/searchSDK/.local/nuget`,
    installNote: "This creates and consumes a local NuGet artifact. No public NuGet release is assumed. The SDK uses HttpClient and System.Text.Json with no runtime NuGet dependencies.",
    example: `using SearchSdk;

var key = Environment.GetEnvironmentVariable("EXA_API_KEY")
    ?? throw new InvalidOperationException("EXA_API_KEY is required");
using var transport = new SearchTransport(new() {
    Timeout = TimeSpan.FromSeconds(10)
});
var search = new SearchClient(new NormalizedProvider("exa", key, transport));
var response = await search.SearchAsync(
    new SearchRequest("SQLite write concurrency", Limit: 3),
    CancellationToken.None);
foreach (var result in response.Results)
    Console.WriteLine(result.Url);`,
    language: "csharp", filename: "Program.cs",
    exampleNote: "Set EXA_API_KEY on your server and run dotnet run. In a service, pass the request's CancellationToken instead of CancellationToken.None. The caller owns the transport lifetime.",
    verify: "packages/dotnet/scripts/verify.sh",
    verified: "Locked .NET 10 Release build, 5,126 assertions and a fresh consumer installed from the NuGet artifact.",
    limits: ["NativeAOT and trimming are unverified. Only net10.0 is targeted.", "No successful-result cache or in-flight deduplication in this alpha."],
  },
  {
    id: "c", name: "C", target: "server", directory: "c", packageName: "searchsdk::searchsdk / searchsdk::curl", version: "0.1.0-alpha.1", runtime: "C11 / POSIX; libcurl 7.85+ for HTTPS",
    surface: `${serverSurface}; gateway client`,
    install: `cmake -S packages/c -B .local/c-build -DCMAKE_BUILD_TYPE=Release -DSEARCHSDK_TESTS=OFF
cmake --build .local/c-build --parallel 2
cmake --install .local/c-build --prefix "$PWD/.local/c-install"`,
    installNote: "Use find_package(searchsdk 0.1 CONFIG REQUIRED) and link searchsdk::curl for HTTPS. Point CMAKE_PREFIX_PATH at the installation prefix. The POSIX core can also use an injected transport; Windows is unsupported.",
    example: String.raw`#include <searchsdk/searchsdk.h>
#include <searchsdk/curl.h>

/* Call after curl_global_init; caller supplies a server-held key. */
ssk_code search_example(const char *key) {
    ssk_config config;
    ssk_config_init(&config);
    config.provider = "exa";
    config.transport = ssk_curl_transport;
    ssk_client *client = NULL;
    ssk_error *error = NULL;
    ssk_response *response = NULL;
    ssk_code code = ssk_client_new(&config, &client, &error);
    if (code == SSK_OK) {
        ssk_call_options call;
        ssk_call_options_init(&call);
        call.credential = key;
        code = ssk_search(client,
            "{\"query\":\"SQLite write concurrency\",\"limit\":3}",
            &call, &response, &error);
        /* On success, consume ssk_response_json(response) here. */
    }
    ssk_response_free(response);
    ssk_error_free(error);
    ssk_client_free(client);
    return code;
}`,
    language: "c", filename: "search.c",
    exampleNote: "This is a function for your server application. Initialize libcurl with curl_global_init(CURL_GLOBAL_DEFAULT) before worker threads, then call curl_global_cleanup after all calls finish. Response views are borrowed until the response is freed.",
    verify: "sh packages/c/scripts/verify-package.sh",
    verified: "Core assertions, ASan/UBSan, local TLS and installed/extracted-archive consumers; platform CI covers macOS and Linux.",
    limits: ["C11/POSIX, not a Windows portability claim. ABI version 1 has explicit ownership rules.", "No hidden executor: synchronous calls and streaming callbacks run on the caller's thread."],
  },
  {
    id: "cpp", name: "C++", target: "server", directory: "cpp", packageName: "searchsdk::cpp / searchsdk::cpp_curl", version: "0.1.0-alpha.1", runtime: "C++17 over the C11 / POSIX ABI",
    surface: `Typed RAII facade over the C SDK: ${serverSurface}; gateway client`,
    install: `cmake -S packages/cpp -B .local/cpp-build -DCMAKE_BUILD_TYPE=Release -DSEARCHSDK_CPP_CURL=ON
cmake --build .local/cpp-build --parallel 2
cmake --install .local/cpp-build --prefix "$PWD/.local/cpp-install"`,
    installNote: "Use find_package(searchsdk_cpp 0.1 CONFIG REQUIRED) and link searchsdk::cpp_curl. The default build includes the sibling C library; C and C++ compiler, architecture and runtime settings must be compatible.",
    example: `#include <searchsdk/searchsdk.hpp>
#include <searchsdk/curl.hpp>
#include <iostream>

void search_example(const std::string& server_key) {
    searchsdk::Config config;
    config.provider = "exa";
    config.transport = searchsdk::curl_transport();
    searchsdk::Client search(std::move(config));
    searchsdk::CallOptions call;
    call.credential = server_key;
    const auto response = search.search(
        searchsdk::SearchRequest{"SQLite write concurrency", 3}, call);
    for (const auto& result : response.results)
        std::cout << result.url << '\\n';
}`,
    language: "cpp", filename: "search.cpp",
    exampleNote: "Call from your server application with an application-supplied provider key. Configure the curl transport before starting worker threads, and destroy clients after joining their calls. Results own their data.",
    verify: `cmake -S packages/cpp -B .local/cpp-check -DCMAKE_BUILD_TYPE=Release
cmake --build .local/cpp-check --parallel 2
ctest --test-dir .local/cpp-check --output-on-failure`,
    verified: "Typed wire models, sanitizers, local TLS and consumers using installed C and relocated CPack archives.",
    limits: ["A C++17 facade over the C ABI, not an independent Windows transport.", "Synchronous API and owning stream callbacks; no hidden async executor."],
  },
  {
    id: "swift", name: "Swift", target: "app", directory: "swift", packageName: "SearchSDK", version: "0.1.0-alpha.1", runtime: "Swift 6 · iOS 16+ · macOS 13+ · tvOS 16+ · watchOS 9+ · visionOS 1+",
    surface: gatewaySurface,
    install: `// In Package.swift, add the local checkout as a dependency:
.package(name: "SearchSDK", path: "/absolute/path/searchSDK")

// In your target's dependencies:
.product(name: "SearchSDK", package: "SearchSDK")`, installLanguage: "swift",
    installNote: "The repository-root SwiftPM manifest exposes SearchSDK. Xcode can also consume the Git repository at a reviewed revision containing that manifest. No release tag is assumed; Linux and Windows are unsupported.",
    example: `import SearchSDK

func searchExample(
    endpoint: String,
    applicationToken: @escaping @Sendable () async throws -> String?
) async throws {
    let search = try SearchClient(
        endpoint: endpoint,
        applicationToken: applicationToken
    )
    let response = try await search.search(
        SearchRequest(query: "SQLite write concurrency", limit: 3)
    )
    for result in response.results {
        print(result.url, result.provenance.provider)
    }
}`,
    language: "swift", filename: "SearchExample.swift",
    exampleNote: "Pass your exact application-owned HTTPS endpoint and a callback that resolves the current application token. Provider selection and provider keys belong on that server. Cancel the caller's Task to cancel search.",
    verify: `xcodebuild -version
swift test --package-path packages/swift --scratch-path .local/swift-build --jobs 2
sh packages/swift/Scripts/verify-consumer.sh .local/swift-consumer`,
    verified: "29 tests on macOS and an iOS simulator; tvOS, watchOS and visionOS simulator builds; extracted SwiftPM consumer.",
    limits: ["Gateway search only. No provider-native operations or client-side provider retry/fallback/cache policy.", "Physical devices and every minimum OS runtime are not covered by the local verification."],
  },
  {
    id: "android", name: "Android / Kotlin", target: "app", directory: "android", packageName: "dev.searchsdk:searchsdk-android", version: "0.1.0-alpha.1", runtime: "Android API 26+",
    surface: gatewaySurface,
    install: `cd packages/android
./gradlew publishReleasePublicationToVerificationRepository --no-daemon --max-workers=2`,
    installNote: "Use JDK 21 and Android SDK 36 for the build. Add the generated packages/android/build/repository as a Maven repository in your app, then implementation(\"dev.searchsdk:searchsdk-android:0.1.0-alpha.1\"). This is a local AAR with explicit coroutine and OkHttp dependencies, not a Maven Central release.",
    example: `import dev.searchsdk.android.SearchClient
import dev.searchsdk.android.SearchRequest

suspend fun searchExample(
    endpoint: String,
    applicationToken: suspend () -> String?
) {
    val search = SearchClient(endpoint = endpoint, accessToken = applicationToken)
    try {
        val response = search.search(
            SearchRequest("SQLite write concurrency", limit = 3)
        )
        for (result in response.results) println(result.url)
    } finally {
        search.close()
    }
}`,
    language: "kotlin", filename: "SearchExample.kt",
    exampleNote: "Invoke from an application-owned coroutine with your exact HTTPS endpoint and application-token callback. In a UI, reuse a client for its owning component's lifetime and close it when that component is finished.",
    verify: `cd packages/android
./gradlew testReleaseUnitTest assembleRelease lintRelease publishReleasePublicationToVerificationRepository --no-daemon --max-workers=2
./gradlew -p consumer testReleaseUnitTest assembleRelease --no-daemon --max-workers=2`,
    verified: "29 SDK tests, installed AAR/Maven consumer and three HTTPS instrumentation cases on an Android 16 emulator.",
    limits: ["Gateway only; retries, fallback and provider-native operations remain on the server.", "Minimum-API and physical-device runtime coverage are not claimed. Coroutine cancellation follows Kotlin's structured concurrency."],
  },
  {
    id: "react-native", name: "React Native", target: "app", directory: "react-native", packageName: "@belweave/search-sdk-react-native", version: "0.1.0-alpha.0", runtime: "React Native · iOS 15.1+ · Android API 24+",
    surface: gatewaySurface,
    install: `nvm use
npm ci
npm run build -w @belweave/search-sdk-react-native
npm pack -w @belweave/search-sdk-react-native

# In your React Native app:
npm install /absolute/path/searchSDK/belweave-search-sdk-react-native-0.1.0-alpha.0.tgz
# Then install iOS pods and rebuild the native app.`,
    installNote: "The npm artifact includes autolinked URLSession and OkHttp bridges. In your app's ios directory, run bundle exec pod install. JavaScript-only reloads do not install native modules. Broader declared peer compatibility is not a complete runtime test matrix.",
    example: `import { createSearchClient } from '@belweave/search-sdk-react-native';

export async function searchExample(
  endpoint: string,
  accessToken: () => Promise<string>,
  signal: AbortSignal,
) {
  const search = createSearchClient({ endpoint, accessToken, timeoutMs: 10_000 });
  return search.web.search({
    query: 'SQLite write concurrency', limit: 3,
  }, { signal });
}`,
    language: "typescript", filename: "search.ts",
    exampleNote: "Your app supplies an HTTPS gateway URL, its session callback and an AbortSignal tied to screen lifecycle. The callback returns an application token, never a provider key. Reuse the configured client in a real service module.",
    verify: `npm run test:mobile
npm run test:package -w @belweave/search-sdk-react-native`,
    verified: "187 JavaScript tests, native transport tests and nine installed release-app cases each on iOS and Android with React Native 0.86.3.",
    limits: ["No direct providers or automatic gateway POST retries.", "A compiled native bridge is required. Ambient native fetch is not used as an insecure fallback."],
  },
  {
    id: "expo", name: "Expo", target: "app", directory: "expo", packageName: "@belweave/search-sdk-expo", version: "0.1.0-alpha.0", runtime: "Expo SDK 55–57 · native development builds and web",
    surface: gatewaySurface,
    install: `nvm use
npm ci
npm run build:mobile
npm pack -w @belweave/search-sdk-react-native
npm pack -w @belweave/search-sdk-expo

# In your existing Expo 55–57 app, install both local artifacts:
npm install /absolute/path/searchSDK/belweave-search-sdk-react-native-0.1.0-alpha.0.tgz /absolute/path/searchSDK/belweave-search-sdk-expo-0.1.0-alpha.0.tgz
# Rebuild with expo run:ios, expo run:android, or your EAS workflow.`,
    installNote: "Expo is an explicit application peer. Native apps use the sibling React Native bridge; Expo Go cannot load it. The web entry uses Expo streaming fetch and requires your gateway's browser CORS allowlist.",
    example: `import { createExpoSearchClient } from '@belweave/search-sdk-expo';

export async function searchExample(
  endpoint: string,
  accessToken: () => Promise<string>,
  signal: AbortSignal,
) {
  const search = createExpoSearchClient({ endpoint, accessToken, timeoutMs: 10_000 });
  return search.web.search({
    query: 'SQLite write concurrency', limit: 3,
  }, { signal });
}`,
    language: "typescript", filename: "search.ts",
    exampleNote: "Pass your application's HTTPS gateway, session callback and cancellation signal. Provider keys remain server-side. Native use requires a development or production build containing the bridge.",
    verify: "npm run test:mobile && npm run test:mobile:package",
    verified: "Source/type compatibility for Expo 55, 56 and 57; Metro web/iOS/Android exports and native runtime coverage for Expo 57 only.",
    limits: ["Stock Expo Go is unsupported on native platforms.", "Expo 55/56 native runtime behavior is unverified; source/type checks are narrower evidence."],
  },
];
