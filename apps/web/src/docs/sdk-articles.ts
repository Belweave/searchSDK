import { sdks, sdkHref, sdkReadme, sdkSourceUrl, sourceCheckout } from "../sdk-catalog.js";
import type { DocArticle } from "./model.js";
import { callout, code, links, list, paragraph as p, section as s, table } from "./model.js";

const choices = (target: "server" | "app") => links(...sdks.filter(sdk => sdk.target === target).map(sdk => ({
  label: sdk.name, href: sdkHref(sdk.id), description: `${sdk.runtime}. ${sdk.target === "server" ? "Direct provider APIs." : "Application gateway client."}`,
})));
const availability = "All twelve SDKs are alpha source packages. Install from a reviewed checkout or its locally built artifacts. Package names and versions describe those artifacts; they do not establish availability in npm, PyPI, Maven Central, crates.io, NuGet or a release tag. Alpha APIs may change. Record the source revision and retain your application's dependency lock.";

export const sdkArticles: readonly DocArticle[] = [
  {
    slug: "sdks", title: "Choose your SDK", label: "Choose your SDK", group: "Get started",
    description: "Search from your server, browser or mobile app. Choose one of twelve SDKs and see exactly which surface it supports.",
    keywords: ["languages", "platforms", "install", "Python", "Swift", "iOS", "Android", "Kotlin", "React Native", "Expo", "Go", "Java", "Rust", "C++", "C#", ".NET", "JavaScript"],
    sections: [
      s("server-sdks", "Server SDKs", p("Use direct provider adapters for normalized web results, or a separate native client for provider-specific operations. The server SDKs cover 14 normalized adapters and 493 retained native operation bindings across 13 providers. Provider credentials stay in your server process."), choices("server")),
      s("app-sdks", "App SDKs", p("Swift, Android, React Native and Expo send normalized requests to your application's HTTPS gateway. They preserve sources, attempt metadata, deadlines and cancellation while keeping provider keys off the device. Expo also has a browser entry. Provider choice, fallback and native operations remain server-side."), choices("app"), links({ label: "Build your application gateway", href: "/docs/guides/application-gateway", description: "Connect an app SDK to a server with explicit authorization." })),
      s("availability", "Alpha availability", p(availability), code("Get the source", sourceCheckout, "bash"), p("Follow the selected SDK's installation guide next. Each language uses its own toolchain; Node is required for the TypeScript/mobile JavaScript packages and repository tooling, not every SDK runtime.")),
      s("shared-contract", "Shared contract, explicit differences", table(["Surface", "What you can rely on"], [["Normalized search", "A bounded query/result contract, source provenance, provider order, explicit capabilities and sanitized errors."], ["Native clients", "Provider-specific operation and wire models from retained public source tables and schemas. These bindings are not every upstream endpoint."], ["App gateway", "Application-owned HTTPS, request-scoped application tokens, validated normalized responses and no automatic POST retries."], ["Language policy", "Read the selected SDK's guide for async style, streaming, retry limits, caching and platform coverage. APIs and policies are not identical across languages."]]), p("Valyu and SearXNG have normalized adapters; WonderSearch is native corpus retrieval. Use the provider catalog to choose a supported operation. Custom server adapters are the extension point for a provider that is not in the built-in set."), links({ label: "Provider capabilities", href: "/docs/providers" }, { label: "Extend provider support", href: "/docs/api/providers#trust" })),
      s("verification", "What has been verified", p("Each package includes deterministic tests and a consumer that uses its built artifact. The guides distinguish executed runtime checks from source/type or compilation checks. Fixtures and local HTTPS servers do not establish live provider availability, account access, pricing or retrieval quality."), links({ label: "Package verification and platform details", href: `${sdkSourceUrl}/tree/main/packages#readme` }, { label: "Verification limits", href: "/docs/reliability/verification" })),
    ],
  },
  {
    slug: "installation", title: "Install an SDK", label: "Installation", group: "Get started",
    description: "Choose a language, install from source or a local artifact, and keep provider execution on your server.",
    sections: [
      s("install", "Choose a package", p(availability), table(["Language / platform", "Package", "Installation guide"], sdks.map(sdk => [sdk.name, `\`${sdk.packageName}\``, `[Install ${sdk.name}](${sdkHref(sdk.id)})`]))),
      s("requirements", "Use the matching toolchain", p("Start with the language guide's minimum runtime and dependency requirements. The TypeScript SDK is ESM and dependency-free at runtime. Other packages have their own dependency contracts: for example, Rust uses Tokio/Reqwest/Serde and Android uses coroutines/OkHttp. A zero-dependency claim for one SDK does not apply to all of them.")),
      s("server-credentials", "Configure credentials at the right boundary", p("Direct provider credentials belong in server secret configuration. Mobile and browser applications use your own authenticated gateway with application tokens. Never put a provider key in a client bundle, device storage, chat or logs."), links({ label: "TypeScript server environment setup", href: "/docs/sdks/typescript#server-credentials" }, { label: "Application gateway setup", href: "/docs/guides/application-gateway" })),
      s("pack-locally", "Build from a reviewed checkout", code("Source checkout", sourceCheckout, "bash"), p("Use the selected language's packaging command. Building an archive, installing it locally, pushing a Git commit, deploying the website and publishing a registry package are separate operations.")),
    ],
  },
  ...sdks.filter(sdk => sdk.id !== "typescript").map((sdk): DocArticle => ({
    slug: `sdks/${sdk.id}`, title: `searchSDK for ${sdk.name}`, label: sdk.name, group: "SDKs",
    description: `${sdk.runtime}. ${sdk.surface}.`, keywords: [sdk.id, sdk.packageName, "install", "quickstart", "alpha", ...(sdk.id === "swift" ? ["iOS", "macOS", "watchOS", "tvOS", "visionOS"] : [])],
    sections: [
      s("install", "Install from source", p(`Package: \`${sdk.packageName}\`, version \`${sdk.version}\`. This is an alpha source/local-artifact installation. No public registry release or release tag is assumed.`), code("Get the source", sourceCheckout, "bash"), code(sdk.installLanguage && sdk.installLanguage !== "bash" ? "Application dependency configuration" : "Build or install the local package", sdk.install, sdk.installLanguage ?? "bash"), p(sdk.installNote)),
      s("first-search", sdk.target === "app" ? "Call your application gateway" : "Make a server-side search", ...(sdk.target === "app" ? [p("First deploy an [application-owned gateway](/docs/guides/application-gateway). searchsdk.dev hosts a demonstration playground and documentation MCP service; neither is an application gateway for these SDKs.")] : [p("Set provider keys in your application's server environment or secret store. The example below makes a real provider request when invoked and can incur charges. Use the package's fixture consumer for a key-free check.")]), code(sdk.filename, sdk.example, sdk.language), p(sdk.exampleNote)),
      s("scope", "Supported surface and limits", p(sdk.surface + "."), list(...sdk.limits), p("Preserve result order, provider-native scores and source provenance. Unknown usage is not zero cost. Cancellation and deadlines cannot undo a request already accepted by a remote system or guarantee exactly-once effects.")),
      s("verify", "Verify without provider keys", code("Repository checkout · local checks", sdk.verify, "bash"), p(sdk.verified), p("These are deterministic contract and artifact checks. They do not establish live-provider or account-entitlement verification. Read the package README for precise commands, dependencies and runtime coverage.")),
      s("next", "Continue in your language", links({ label: `${sdk.name} package reference`, href: sdkReadme(sdk), description: "Complete API, errors, streaming, packaging and platform boundaries." }, { label: "Compare SDKs", href: "/docs/sdks" }, ...(sdk.target === "app" ? [{ label: "Gateway protocol and authorization", href: "/docs/guides/application-gateway" }] : [{ label: "Choose a provider", href: "/docs/providers" }]))),
    ],
  })),
  {
    slug: "guides/application-gateway", title: "Connect an app to search", label: "Application gateway", group: "Guides",
    description: "Keep provider keys and search policy on your server while Swift, Android, React Native, Expo and other clients use one normalized HTTPS contract.",
    keywords: ["gateway", "mobile", "browser", "authorization", "protocol", "application token", "CORS"],
    sections: [
      s("architecture", "Your app, your server, your provider", p("The app sends a query and optional normalized filters to the exact HTTPS URL you configure. Your server authenticates the caller, chooses the provider and fallback policy, and returns results with provenance and attempt metadata. The app sends an application token; it never needs a provider key."), list("App: owns session refresh, UI state and cancellation.", "Gateway: owns authorization, per-user access and spending controls, browser origin policy and bounded requests.", "Provider SDK: owns the configured search calls and explicit reliability policy.")),
      s("server", "Create the server handler", p("Build the current [TypeScript artifact](/docs/sdks/typescript) to use `@belweave/search-sdk/gateway`. Mount the returned Fetch-compatible handler at an exact route in your framework. This example makes application authorization a required dependency."), code("search-gateway.ts · server", `import { createSearch } from '@belweave/search-sdk';
import { createSearchGateway } from '@belweave/search-sdk/gateway';
import { exa } from '@belweave/search-sdk/exa';

export function makeSearchHandler(
  providerKey: string,
  authorizeApplication: (authorization: string | null, signal: AbortSignal) => Promise<boolean>,
) {
  return createSearchGateway({
    search: createSearch({ provider: exa({ apiKey: providerKey }) }),
    authorize: ({ headers, signal }) =>
      authorizeApplication(headers.get('authorization'), signal),
    allowedOrigins: ['https://app.example.com'],
    timeoutMs: 10_000,
    maxConcurrency: 32,
  });
}`), p("Implement authorizeApplication with your existing session or access-token verifier. Authorization runs before body reading and provider dispatch. A callback that always returns true is appropriate only for an intentionally public or separately protected route. The SDK does not issue tokens or create an identity service.")),
      s("app", "Connect your app SDK", choices("app"), p("Supply the exact HTTPS route and a callback for a fresh application token. No path suffix is appended. Native applications still require authorization even when they send no Origin header. Browser callers need an explicitly allowed HTTPS origin; use the same app origin in the handler's allowedOrigins.")),
      s("wire", "The gateway contract", code("POST body · protocol v1", `{
  "query": "SQLite write concurrency",
  "limit": 3,
  "includeDomains": ["sqlite.org"]
}`, "json"), p("Only query, limit, includeDomains and excludeDomains are accepted. Provider names, credentials, arbitrary URLs, retry settings and native operations are not request fields. HTTP 200 returns the normalized response; failures return a sanitized error envelope. The handler sets X-SearchSDK-Protocol: 1 and Cache-Control: no-store."), p("Default handler bounds are 64 KiB of request data, 10 MiB of decoded response data, ten seconds for the whole operation and 32 concurrent operations. Overload returns 429. The deadline covers authorization, body reading, provider work, validation and serialization.")),
      s("deployment", "Deploy and verify your boundary", list("Mount only the intended route, use HTTPS and map client disconnects to the Fetch Request's signal.", "Keep provider secrets in server configuration. Do not log authorization headers or provider keys.", "Test authorization failure before dispatch, cancellation, deadline exhaustion, response ceilings and successful sibling batch outcomes with fixtures.", "Set your own quotas and spending policy. Retries and fallback can repeat billable work; cancellation does not undo accepted requests."), callout("Separate from the hosted playground", "The public playground accepts visitor keys for individual demonstrations. The public MCP endpoint serves documentation only. Neither is the authenticated application gateway you deploy for your users."), links({ label: "Gateway handler reference", href: `${sdkSourceUrl}/blob/main/packages/sdk/GATEWAY.md` }, { label: "Language-neutral wire protocol", href: `${sdkSourceUrl}/tree/main/sdk-contract#readme` })),
    ],
  },
];
