import type { DocArticle } from "./model.js";
import { callout, code, links, list, paragraph as p, section as s, table } from "./model.js";
import { examples } from "./examples.js";

export const coreArticles: readonly DocArticle[] = [
  {
    slug: "", title: "Search, with the details intact.", group: "Get started", label: "Introduction",
    description: "Search anywhere, in your language. Twelve SDKs connect servers and apps to explicit provider APIs and traceable sources.",
    keywords: ["overview", "alpha", "start"],
    sections: [
      s("one-search-contract", "Choose your language, keep your sources", p("Use TypeScript, Python, Go, Java, Rust, C#, C or C++ on your server. Connect Swift, Android, React Native or Expo apps through your application gateway. Normalized web search shares query, result and provenance semantics; provider-native operations remain a separate surface."), links({ label: "Choose your SDK", href: "/docs/sdks", description: "Installation, first search and exact support for all twelve packages." }, { label: "Connect a mobile or browser app", href: "/docs/guides/application-gateway", description: "Keep provider credentials and policy behind your server." })),
      s("choose-your-path", "Choose your path", links({ label: "Install the SDK", href: "/docs/installation", description: "Build and install the alpha for your language." }, { label: "Run without a key", href: "/docs/quickstart#try-without-credentials", description: "Use deterministic local fixtures." }, { label: "Explore all providers", href: "/docs/providers", description: "See normalized support and native boundaries." }, { label: "Handle failures deliberately", href: "/docs/reliability/fallback", description: "Set an ordered fallback chain and bounded deadlines." })),
      s("what-is-verified", "Web results and native operations", p("Normalized search is a deliberately narrow surface. Provider-native clients preserve different operations and response shapes; their documentation is separate. A search snippet, an extracted page, a generated answer, and a corpus passage carry different meaning."), links({ label: "Verification and limits", href: "/docs/reliability/verification" })),
    ],
  },
  {
    slug: "sdks/typescript", keywords: ["@belweave/search-sdk", "TypeScript", "JavaScript", "Node", "install"], title: "searchSDK for TypeScript and JavaScript", label: "TypeScript / JavaScript", group: "SDKs", description: "ESM with declarations, zero runtime dependencies, direct provider APIs and an application gateway handler for Node servers.",
    sections: [
      s("requirements", "Requirements", list("Use Node 24.22.1 or a newer patched Node 24 release. The SDK is ESM with TypeScript declarations and zero runtime dependencies.", "Use ESM imports in .mjs or a project with type: module; CommonJS callers can use dynamic import().", "This alpha is distributed as source and locally built artifacts. Public npm availability is not assumed. Record the reviewed source revision and commit your application lockfile.")),
      s("install", "Install", code("Terminal", examples.install, "bash"), p("Run the build commands in the source checkout, then install the resulting tarball in your application. For a new application, run `npm init --yes` first. For TypeScript files run directly with Node 24, set `type: module` with `npm pkg set type=module`. The artifact version is `0.1.0-alpha.0`; this version alone does not prove the artifact includes the latest gateway changes. Record its source revision.")),
      s("server-credentials", "Configure server credentials", p("Store provider keys in your application's server secret store or server environment. The SDK accepts keys explicitly; it does not load environment files or read environment variables itself."), code("credentials.ts · server", `const apiKey = process.env.CONTEXT_API_KEY;
if (!apiKey) throw new Error('CONTEXT_API_KEY is required');`), p("For local development, add `.env` to your server project's `.gitignore`, then put `CONTEXT_API_KEY=your-provider-key` in that local file. Run your server example with `node --env-file=.env search.ts`. Node loads the file; the SDK does not. In production, inject `CONTEXT_API_KEY` through your host's server secret configuration."), p("Do not prefix provider credentials with `VITE_` or another public environment prefix. The hosted playground accepts request-scoped keys and calls providers from its server. The separate key-free demo uses fixtures. Call your own authenticated server route when building a browser application.")),
      s("imports", "Choose the right import", table(["Import", "Purpose"], [["`@belweave/search-sdk`", "`createSearch`, `SearchError`, and public normalized types"], ["`@belweave/search-sdk/context`", "Context.dev adapter and provider-specific exports"], ["`@belweave/search-sdk/tinyfish`", "TinyFish adapter and provider-specific exports"], ["`@belweave/search-sdk/testing`", "`createMockProvider` and fixture types"]]), links({ label: "Make your first request", href: "/docs/quickstart" })),
      s("pack-locally", "Rebuild the source artifact", p("Rebuild the local tarball when you change the SDK source. Use the checkout's `.nvmrc` and locked dependencies. This command does not publish the package."), code("Source checkout · terminal", `git clone https://github.com/Belweave/searchSDK.git
cd searchSDK
nvm use
npm ci
npm run build:sdk
npm pack -w @belweave/search-sdk

# In your server application, use the actual generated tarball:
npm install /absolute/path/belweave-search-sdk-0.1.0-alpha.0.tgz`, "bash")),
    ],
  },
  {
    slug: "quickstart", title: "Your first TypeScript search", label: "TypeScript quickstart", group: "Get started", description: "Run a key-free fixture in Node, then configure a real provider. Other SDKs have their own first-search guides.",
    sections: [
      s("try-without-credentials", "Try without credentials", p("[Build and install the TypeScript artifact](/docs/sdks/typescript#install), or [choose another language](/docs/sdks). Save the following example as `first-search.mjs` in your server application, then run `node first-search.mjs` on Node 24. It uses plain ESM JavaScript and needs no compiler. For an immediate browser demo, [open the playground](/playground) and choose “Demo · no key”."), code("first-search.mjs · fixture", examples.mock), p("The mock returns three fixed example-domain results and performs no outbound requests. This validates your application integration, not a provider's retrieval quality.")),
      s("connect-context", "Connect Context.dev", p("Save this example as `search.mjs`. Configure `CONTEXT_API_KEY` in a server-only environment or [local .env file](/docs/installation#server-credentials), then run `node --env-file=.env search.mjs`. With a production-injected environment, use `node search.mjs`. This makes a real provider request and may incur charges."), code("search.mjs · server", examples.quickstart), p("The same ESM example can be saved as `search.ts` and run directly with Node 24 in a type: module project. Missing, blank, or invalid keys must be resolved through your provider account. A configured factory is not proof that the key is valid.")),
      s("read-the-response", "Read the response", list("`results` contains up to your requested limit in provider order.", "`provider` identifies the winning provider. Every result also has its own `provenance`.", "`attempts` records successes and failures. `warnings` uses stable SDK codes.", "`usage` is provider-reported usage from the winner, or `null` when unknown."), callout("Context.dev result count", "Context requests at least ten native results to satisfy conflicting provider documents, then caps the SDK output. Trimmed results can still affect reported credits.")),
      s("next-step", "Add one policy at a time", links({ label: "Filter by domain", href: "/docs/guides/domain-filters" }, { label: "Configure explicit fallback", href: "/docs/reliability/fallback" }, { label: "Connect a different provider", href: "/docs/providers" })),
    ],
  },
  {
    slug: "concepts", title: "The retrieval model", group: "Get started", description: "Understand what is shared, what stays native, and where evidence comes from.",
    sections: [
      s("normalized-and-native", "Normalized and native", p("Normalized search offers a portable vocabulary for a small shared operation. Provider-native APIs preserve a provider's own arguments, job models, streaming events, and returned data. Choose a surface based on the operation you need, rather than assuming that a similar name implies identical behavior.")),
      s("four-kinds-of-material", "Four kinds of material", table(["Material", "Interpretation"], [["Search result", "A ranked source link with provider search text."], ["Extracted content", "Content retrieved for a known page, with its own extraction outcome."], ["Generated answer", "A synthesis that requires separate source and claim handling."], ["Corpus passage", "A span from an ingested document; document and revision identity matter."]]), p("WonderSearch.ai and WonderSearch.com refer to one corpus candidate. Corpus passage IDs are not web source URLs and should never be fabricated into normalized web results.")),
      s("provider-differences", "Provider differences remain visible", list("Native scores are preserved when available. They are not a common relevance scale.", "A result ceiling does not promise an exact count or multiple pages.", "Provider-native hostname semantics still apply after request validation.", "An absent usage value is unknown, rather than free.")),
    ],
  },
  {
    slug: "guides/domain-filters", title: "Filter by domain", group: "Guides", description: "Validate hostnames before dispatch and check the complete fallback chain.", keywords: ["includeDomains", "excludeDomains", "allowlist", "blocklist"],
    sections: [
      s("request-hostnames", "Request hostnames", code("filter.ts · fixture", examples.filters), p("Use ASCII hostnames or punycode. Schemes, paths, ports, wildcards, and empty lists are rejected. The SDK lowercases and deduplicates hosts. The same normalized host cannot appear in both lists.")),
      s("capacity", "Check provider capacity", table(["Adapter", "Include / exclude capacity"], [["Valyu", "100 / 100 under SDK policy; web only"], ["Context.dev", "100 / 100"], ["TinyFish", "100 / 100 — conservative SDK policy"], ["Exa", "1,200 / 1,200"], ["Tavily", "300 / 150"], ["Perplexity", "20 include or 20 exclude; mutually exclusive"], ["Parallel", "200 include or 200 exclude; mutually exclusive SDK policy"], ["Linkup", "100 / 50 under SDK policy"], ["Firecrawl", "100 include or 100 exclude; mutually exclusive SDK policy"], ["You.com", "500 include or 5,000 exclude; mutually exclusive"], ["Brave / Serper / SerpAPI / SearXNG", "Neither filter supported by these normalized adapters"]]), p("Every provider in a configured fallback chain must support the requested filters and capacity before any network dispatch. A Brave fallback makes a filtered request unsupported even when the primary supports it. A provider declaring mutuallyExclusiveDomainFilters rejects simultaneous lists before dispatch.")),
      s("matching", "Keep matching semantics explicit", p("Built-in adapters forward native filter options. They do not rewrite the query into `site:` operators or remove provider results locally. Root-domain and subdomain behavior remains provider-specific; do not infer exact-host matching from the SDK's hostname syntax."), links({ label: "Request validation reference", href: "/docs/api/search" }, { label: "Provider capability reference", href: "/docs/api/providers" })),
    ],
  },
  {
    slug: "guides/results", title: "Work with results", group: "Guides", description: "Render untrusted source material while preserving ordering and provenance.",
    sections: [
      s("render-text", "Render provider text as text", p("Titles, snippets, and highlights come from external sources. Use text children in React, or equivalent escaping in your renderer. Do not inject snippets as HTML or treat retrieved instructions as application authority."), code("result.tsx · React", `import type { SearchResult } from '@belweave/search-sdk';

export function Source({ result }: { result: SearchResult }) {
  return (
    <article>
      <a href={result.url} rel="noreferrer" target="_blank">
        {result.title ?? result.url}
      </a>
      {result.snippet && <p>{result.snippet}</p>}
      <small>{result.provenance.provider}</small>
    </article>
  );
}`)),
      s("preserve-order", "Preserve order unless you choose a policy", p("Normalized search caps the output without reranking or deduplicating it. A native score belongs to its provider; sorting a mixed set of scores across providers would create an unsupported comparison. There is no fan-out or score fusion in the normalized client.")),
      s("validate-before-fetching", "Distinguish a link from a fetch target", p("Built-in adapters reject unsafe result URLs and validate consumed response fields. That link validation is not an SSRF policy. If your application fetches result URLs server-side, apply your own network, redirect, DNS, and response-size policies.")),
    ],
  },
  {
    slug: "guides/server-integration", title: "Integrate on a server", group: "Guides", description: "Keep credentials and query policy behind your application's server boundary.",
    sections: [
      s("request-boundary", "Put policy at your request boundary", list("Authenticate and authorize your application's caller before performing search.", "Validate application-specific query limits and usage policy before calling the SDK.", "Pass the incoming request's AbortSignal when your framework exposes one.", "Return only the fields the browser needs. Keep provider keys and internal account details on the server.")),
      s("reuse-client", "Configure once, call per request", p("A normalized client holds provider configuration rather than user session state. Create it in server-owned code and pass a new search request and signal for each incoming request. Do not share a queued fixture provider across tests that assume isolated outcomes."), code("search-service.ts · server", examples.quickstart)),
      s("batch-queries", "Run independent queries in a bounded batch", p("Use web.searchBatch for multiple queries with an explicit worker limit and ordered per-item outcomes. Each query retains the same client policy; successful items survive a sibling failure."), links({ label: "Batch query reference and fixture", href: "/docs/api/search-batch" })),
      s("operational-controls", "Add application controls deliberately", p("The normalized client supports opt-in retries, a local successful-result cache, identical in-flight request sharing, and bounded concurrency. Configure these deliberately because queries may contain sensitive material and retries can repeat billable work. Per-user quotas and telemetry remain application policy. Avoid logging full query bodies or transport headers by default."), links({ label: "Retry policy", href: "/docs/reliability/retries" }, { label: "Caching and request sharing", href: "/docs/reliability/caching" }, { label: "Credentials and untrusted data", href: "/docs/reliability/security" })),
    ],
  },
  {
    slug: "guides/testing", title: "Test without API keys", group: "Guides", description: "Exercise your application's failure paths with deterministic mock outcomes.",
    sections: [
      s("fallback-fixture", "Assert fallback behavior", code("fallback.test.ts · Node", examples.fixtureFallback), p("Each mock has an independent outcome queue and call history. Outcomes are reserved in invocation order, even if concurrent calls complete in a different order. An exhausted explicit queue returns `configuration`.")),
      s("fixture-behavior", "Understand fixture behavior", list("Without an outcome queue, the default success fixture repeats.", "A success outcome accepts `results`, `usage`, and `delayMs`. Omit provenance; the mock adds it.", "An error outcome accepts `code`, optional `status`, `retryAfterMs`, and `delayMs`.", "The mock implements hostname filtering and output limits. Timestamps reflect the actual test clock.")),
      s("evidence", "Keep evidence levels separate", table(["Check", "What it can establish"], [["Application mock", "Your consumer's state and error handling."], ["Injected HTTP fixture", "Expected request mapping and response validation."], ["Authenticated live request", "Behavior of a particular provider request at a particular time."], ["Quality evaluation", "Usefulness against a dated query set and explicit rubric."]]), p("Passing fixture tests does not establish live key validity, production availability, billing correctness, or a provider quality ranking.")),
    ],
  },
  {
    slug: "api/create-search", title: "createSearch", group: "API reference", description: "Configure one normalized search client with explicit providers and time budgets.",
    sections: [
      s("signature", "Signature", code("TypeScript", `import { createSearch } from '@belweave/search-sdk';
import type { SearchConfig } from '@belweave/search-sdk';

// createSearch(config: SearchConfig)
// → { web: { search(request, options?), searchBatch(requests, options?) } }`)),
      s("configuration", "Configuration", table(["Field", "Behavior"], [["`provider`", "Required SearchProvider; first attempted provider."], ["`fallback`", "Optional ordered array of distinct provider IDs."], ["`timeoutMs`", "Total deadline in integer milliseconds; default 10,000."], ["`attemptTimeoutMs`", "Per-attempt budget; defaults to the total configured budget."], ["`retry`", "Optional additional attempts per provider with bounded backoff; off by default."], ["`maxConcurrency`", "Optional active-operation bound; queue time shares the deadline."], ["`cache`", "Optional `{ ttlMs, maxEntries? }` local successful-response cache."], ["`deduplicate`", "Optional sharing of identical in-flight requests; false by default."]]), p("Both durations must be between 1 and 2,147,483,647. Unknown configuration fields, duplicate provider IDs, invalid capability descriptors, and invalid budgets are configuration errors. Factory configuration errors can throw synchronously.")),
      s("example", "Example", code("client.ts · server", examples.fallback), p("Set a smaller per-attempt budget when you need to reserve time for fallback. A total deadline never extends to accommodate another provider.")),
    ],
  },
  {
    slug: "api/search", title: "web.search", group: "API reference", description: "The portable request for ranked web results, with capability checks before dispatch.", keywords: ["SearchRequest", "SearchOptions", "limit", "query"],
    sections: [
      s("request", "Request fields", table(["Field", "Contract"], [["`query: string`", "Required, nonblank; forwarded unchanged."], ["`limit?: number`", "Integer 1–20; default 5. Output ceiling."], ["`includeDomains?: readonly string[]`", "Nonempty hostname allowlist within every provider's capacity."], ["`excludeDomains?: readonly string[]`", "Nonempty hostname blocklist within every provider's capacity."]])),
      s("options", "Call options", code("TypeScript", `const controller = new AbortController();
// client is a configured createSearch() client.
const response = await client.web.search(
  { query: 'SQLite write concurrency', limit: 5 },
  { signal: controller.signal },
);`), p("Only `signal` is accepted in normalized call options. Unknown request or option fields reject with `invalid_request`; a required capability missing from any configured provider rejects with `unsupported_option`. Native options belong on the provider-native surface.")),
      s("result-count", "Result-count behavior", p("A successful response can contain zero or fewer than the requested number of results. Empty success does not trigger fallback. TinyFish fetches one first page; Context requests at least ten native results and trims to the requested ceiling. The SDK does not silently paginate."), links({ label: "Response shape", href: "/docs/api/response" }, { label: "Domain filter rules", href: "/docs/guides/domain-filters" })),
    ],
  },
  {
    slug: "api/search-batch", title: "web.searchBatch", group: "API reference",
    description: "Run multiple normalized queries with bounded workers and ordered per-item outcomes.",
    keywords: ["SearchBatchOptions", "SearchBatchResult", "batch", "concurrency", "partial failure"],
    sections: [
      s("example", "Run independent queries", p("Call searchBatch on the same web client as search. Results preserve input order even when requests finish out of order. Each item has its original index and either a fulfilled value or a rejected SearchError."), code("batch-search.ts · fixture", `import { createSearch } from '@belweave/search-sdk';
import { createMockProvider } from '@belweave/search-sdk/testing';

const client = createSearch({ provider: createMockProvider() });
const outcomes = await client.web.searchBatch(
  [
    { query: 'SQLite WAL', limit: 3 },
    { query: 'SQLite transactions', limit: 3 },
  ],
  { concurrency: 2, timeoutMs: 10_000 },
);

for (const outcome of outcomes) {
  if (outcome.status === 'fulfilled') {
    console.log(outcome.index, outcome.value.results);
  } else {
    console.log(outcome.index, outcome.error.code);
  }
}`)),
      s("options", "Batch options", table(["Option", "Contract"], [["`requests`", "Array of up to 1,000 SearchRequest items; empty input returns an empty array."], ["`concurrency`", "Workers per batch, integer 1–64; default 4."], ["`timeoutMs`", "Whole-batch budget including queued items; defaults to the client's total timeoutMs."], ["`signal`", "Optional caller AbortSignal for the entire batch."]]), p("The client's maxConcurrency still limits active underlying searches. Each item uses the same provider, fallback, retry, cache, and deduplication policy as a single search; concurrency is not a provider-side batch endpoint or a billing discount.")),
      s("failures", "Handle partial failure", list("An invalid individual request becomes a rejected item without discarding successful sibling results.", "An invalid batch envelope or option rejects the batch promise with invalid_request.", "Caller cancellation or the whole-batch deadline stops new dispatch and rejects unfinished items with aborted or timeout. Completed successful items remain in the ordered output.", "Client and per-attempt deadlines still apply to each individual search. A total batch budget does not extend them."), p("Cancellation cannot promise that upstream work or billing stops after a request has been dispatched. Inspect each outcome and its attempt trace; persist the results you need before retrying failed items."), links({ label: "Single-search contract", href: "/docs/api/search" }, { label: "Deadlines and cancellation", href: "/docs/reliability/timeouts" }, { label: "Cache and request sharing", href: "/docs/reliability/caching" })),
    ],
  },
  {
    slug: "api/response", title: "SearchResponse", group: "API reference", description: "Inspect the winner, source material, execution trace, warnings, and reported usage.",
    sections: [
      s("shape", "Response fields", code("TypeScript · shape", `interface SearchResponse {
  provider: string;
  results: readonly SearchResult[];
  attempts: readonly SearchAttempt[];
  warnings: readonly {
    code: 'fallback_used' | 'provider_warning';
    provider: string;
  }[];
  usage: { unit: 'usd' | 'credits'; value: number } | null;
  reuse?: 'cache' | 'inflight';
}`)),
      s("result", "Result fields", table(["Field", "Meaning"], [["`url`", "Validated HTTP(S) source link."], ["`title?`, `snippet?`", "Optional provider text; render as untrusted text."], ["`highlights?`", "Separate passages, preserved as an array."], ["`score?`", "Native score; no cross-provider normalization."], ["`provenance`", "Provider ID, sourceUrl, retrievedAt, optional requestId."]])),
      s("validation", "Validation and omissions", p("Built-in adapters validate consumed fields, including results beyond the output ceiling, before returning. A malformed consumed field rejects with `invalid_response` instead of being silently discarded. Unknown provider fields are ignored. The orchestrator also checks the normalized shape returned by custom providers, including safe URLs, provenance fields, usage, and warnings, and copies only public fields. Structural validation does not prove source truth or attribution."), links({ label: "Provenance semantics", href: "/docs/reliability/provenance" }, { label: "Warnings and usage", href: "/docs/reliability/usage" })),
    ],
  },
  {
    slug: "api/providers", title: "SearchProvider", group: "API reference", description: "The normalized adapter interface, capability descriptor, and trust boundary.",
    sections: [
      s("interface", "Interface", code("TypeScript · abbreviated", `import type {
  ProviderResponse, ValidatedSearchRequest,
} from '@belweave/search-sdk';

interface SearchProvider {
  readonly id: string;
  readonly capabilities: {
    readonly domainFilters: boolean;
    readonly mutuallyExclusiveDomainFilters?: boolean;
    readonly maxIncludeDomains: number;
    readonly maxExcludeDomains: number;
    readonly maxQueryLength?: number;
  };
  search(
    request: ValidatedSearchRequest,
    options: { signal: AbortSignal },
  ): Promise<ProviderResponse>;
}`)),
      s("capabilities", "Declare capabilities truthfully", p("The orchestrator checks capabilities across the entire fallback chain before dispatch. Capacities are nonnegative integers. An optional `maxQueryLength` must be a positive integer and is measured in UTF-16 code units. Context declares a ceiling of 500. IDs must be 1–64 ASCII letters, digits, hyphens, or underscores.")),
      s("trust", "Custom implementations are trusted code", p("A custom provider must return the normalized response shape, assign truthful provenance, honor its advertised capabilities, and observe the signal where possible. The orchestrator validates response fields and applies deadlines, fallback policy, and result ceilings. It cannot verify the truth of supplied attribution."), p("Most hosted adapter options are `{ apiKey, fetch? }`; Valyu adds typed search settings, and SearXNG uses an operator-selected instance. Injected fetch has the shape `(input: string | URL, init?: RequestInit) => Promise<Response>` and is useful for controlled fixtures and server networking policy.")),
    ],
  },
  {
    slug: "api/errors", title: "SearchError", group: "API reference", description: "Stable normalized failure codes with a trace and sanitized diagnostic fields.",
    sections: [
      s("handling", "Handle by code", code("errors.ts · fixture", examples.errors)),
      s("codes", "Error codes", table(["Code", "Fallback / meaning"], [["`rate_limit`", "Yes — HTTP 429."], ["`network`", "Yes — rejected transport, including blocked redirects."], ["`unavailable`", "Yes — HTTP 408 or 5xx."], ["`attempt_timeout`", "Yes — attempt budget elapsed while total time remains."], ["`timeout`", "No — total call budget elapsed."], ["`aborted`", "No — caller cancelled."], ["`auth`", "No — account/auth failures, including HTTP 401/402/403."], ["`invalid_request`", "No — request or call options are invalid."], ["`unsupported_option`", "No — a configured provider cannot satisfy a required option."], ["`configuration`", "No — invalid setup or exhausted fixture outcomes."], ["`invalid_response`", "No — malformed consumed response data."], ["`provider_error`", "No — other rejected requests or custom exceptions."]])),
      s("diagnostics", "Diagnostic fields", p("Read `code`, `attempts`, optional `status`, and optional `retryAfterMs`. Error messages are fixed by code. Raw provider bodies, transport messages, credentials, and caller abort reasons are excluded. Avoid attaching your own secret-bearing request objects to errors.")),
    ],
  },
  {
    slug: "reliability/fallback", title: "Explicit fallback", group: "Reliability", description: "Choose which providers may receive a query and exactly when the chain may advance.",
    sections: [
      s("configure", "Configure an ordered chain", code("fallback.ts · server", examples.fallback), p("Fallback can disclose the same query to another provider and incur additional charges. Providers are attempted sequentially in configured order. Each ID can appear only once.")),
      s("advance", "When the chain advances", list("`rate_limit`, `network`, `unavailable`, and `attempt_timeout` may advance to the next configured provider after any explicitly configured retries are exhausted.", "Authentication, invalid requests, unsupported options, invalid responses, caller cancellation, and the total deadline are terminal.", "An empty successful result is a success. It does not advance the chain.", "Same-provider retries are off by default. There are no hedges or quality-triggered fallback.")),
      s("trace", "Inspect the trace", p("Every completed attempt records provider, start time, duration, and outcome. Failed attempts can include a code, HTTP status, and parsed Retry-After delay. A successful backup response adds `fallback_used`; a terminal failure exposes the complete trace on SearchError."), links({ label: "Reserve a deadline for the chain", href: "/docs/reliability/timeouts" }, { label: "Test fallback locally", href: "/docs/guides/testing" })),
    ],
  },
  {
    slug: "reliability/timeouts", title: "Deadlines and cancellation", group: "Reliability", description: "Bound the complete call and each attempt, and stop the chain when callers cancel.", keywords: ["abort", "signal", "timeoutMs", "attemptTimeoutMs"],
    sections: [
      s("budgets", "Two budgets, one deadline", p("`timeoutMs` bounds the complete normalized call, including attempts and JSON parsing. `attemptTimeoutMs` bounds each attempt without extending the total deadline. Both default to the configured total budget; with defaults, a full-budget timeout leaves no time for fallback."), code("Configuration", `const policy = {
  timeoutMs: 10_000,
  attemptTimeoutMs: 4_000,
};
// Pass these fields alongside provider and optional fallback to createSearch().`)),
      s("cancellation", "Cancel with AbortSignal", code("cancel.ts · fixture", examples.cancellation), p("Cancellation aborts the current attempt and prevents later providers from starting. A pre-aborted signal fails before provider dispatch. The SDK cleans up its own timers and listeners.")),
      s("transport-limits", "Understand resource limits", callout("Promise settlement and upstream work", "The SDK can settle even when a transport ignores its signal. That underlying I/O may continue. Use signal-aware transports to cancel resources; a local deadline does not guarantee that upstream work or billing stops.", "caution"), p("JavaScript timers require the event loop to yield. When provider work eventually settles, elapsed deadlines take precedence over a late success or failure.")),
    ],
  },
  {
    slug: "reliability/provenance", title: "Source provenance", group: "Reliability", description: "Keep source identity and retrieval time attached to every normalized result.",
    sections: [
      s("fields", "Provenance fields", table(["Field", "Meaning"], [["`provider`", "Adapter identity for this result."], ["`sourceUrl`", "The source link assigned by the adapter."], ["`retrievedAt`", "SDK retrieval time in ISO 8601, not source publication time."], ["`requestId?`", "Provider request identifier when the adapter has one."]])),
      s("retain", "Retain provenance through your pipeline", p("When storing sources or passing them to an answer-generating step, keep their provenance beside the text. Preserve the original link even when your application derives a citation label. Retrieval time is useful for traceability but does not prove a page is current or substantiate a factual claim.")),
      s("scores", "Keep native relevance in context", p("Exa and Tavily may provide numeric scores. Context's string relevance is not converted into a fabricated number, and TinyFish position is not a score. A missing value should stay absent. Do not compare scores across providers without a separately validated calibration method.")),
    ],
  },
  {
    slug: "reliability/usage", title: "Usage and warnings", group: "Reliability", description: "Report what the winning provider supplies, while keeping unknown costs unknown.",
    sections: [
      s("usage", "Usage is reported, not estimated", table(["Adapter", "Normalized usage"], [["Context.dev", "`credits` from key_metadata.credits_consumed."], ["Exa", "`usd` from costDollars.total."], ["Tavily", "`credits` from usage.credits."], ["TinyFish / Brave", "`null` when not reported."]]), p("Explicit zero usage is preserved. Missing usage becomes `null`. Winning-response usage excludes failed-attempt charges and is not the total cost of a fallback chain."), p("A reused response retains the original provider's usage, retrieval timestamps, and attempts. Check `response.reuse`: cache or in-flight sharing is not a new provider call, and its retained usage is not a fresh charge.")),
      s("count", "Output count is not a billing unit", p("Context requests at least ten native results and can trim to a smaller SDK ceiling. TinyFish requests one first page without a native count parameter. Never infer provider charges from `results.length` or treat unknown usage as zero.")),
      s("warnings", "Warnings use stable codes", list("`fallback_used`: a later provider succeeded after an earlier failure.", "`provider_warning`: a provider-specific warning condition, such as Context partial results or Exa warning metadata."), p("Raw provider warning text is not forwarded through normalized warnings. A warning does not imply that a malformed consumed result was accepted; schema validation still applies.")),
    ],
  },
  {
    slug: "reliability/security", title: "Credentials and trust", group: "Reliability", description: "Separate server secrets, external source material, and application authority.",
    sections: [
      s("credentials", "Keep credentials server-side", p("Provider factories receive keys explicitly and never load environment variables. Built-in normalized adapters use fixed provider endpoints and reject redirects. Supply credentials from server-owned configuration. Do not expose them through browser bundles, query logs, or example output.")),
      s("untrusted", "Treat retrieval as untrusted input", p("Provider text may contain markup, misleading claims, or instructions. Escape it in user interfaces and keep it out of trusted system instructions. A valid source URL does not establish source credibility, ownership, or safe server-side fetch behavior.")),
      s("custom-transport", "Review custom transports", p("An injected transport is trusted server code. Preserve request authentication boundaries, AbortSignal, and redirect policy. If you add telemetry or retries, consider that headers may contain keys, query strings can contain search text, and repeated calls can incur extra work."), links({ label: "Server integration guide", href: "/docs/guides/server-integration" }, { label: "Result rendering guide", href: "/docs/guides/results" })),
    ],
  },
  {
    slug: "reliability/verification", title: "Verification and limits", group: "Reliability", description: "Read validation claims at the right evidence level and evaluate providers on your workload.",
    sections: [
      s("fixture-evidence", "What fixture validation covers", p("Deterministic fixtures check protocol mapping, invalid fields, unsafe URLs, filter preflight, errors, fallback, cancellation, and deadlines. Use the repository's latest validation record for the current suite and results."), p("Injected responses exercise expected contracts without API credentials. They do not establish account readiness, upstream availability, actual billing, or real retrieval usefulness.")),
      s("evaluate", "Evaluate your own workload", list("Record dated queries and required source types.", "Record provider settings, locale, filters, result count, and time budgets.", "Use a clear rubric for source usefulness and coverage, with human review when needed.", "Measure latency and observed failures independently from content quality.", "Keep reported usage separate from estimated total spend.")),
      s("benchmarks", "Benchmark work is in development", callout("No published ranking", "The benchmark workspace is in development. No universal quality ranking or fabricated latency score is presented here."), links({ label: "Benchmark development status", href: "/benchmarks" }, { label: "Provider-specific boundaries", href: "/docs/providers" })),
    ],
  },
];
