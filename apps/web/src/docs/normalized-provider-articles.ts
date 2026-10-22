import type { DocArticle } from "./model.js";
import { code, links, list, paragraph as p, section as s, table } from "./model.js";

// These integrations expose normalized adapters, not generated provider-native clients.
export const normalizedProviderArticles: readonly DocArticle[] = [
  {
    slug: "providers/valyu", title: "Valyu", group: "Providers",
    description: "Web-only search with content snippets, relevance, reported USD usage, and explicit adapter settings.",
    keywords: ["valyu", "ValyuOptions", "ValyuSearchOptions", "VALYU_API_KEY", "searchRaw"],
    sections: [
      s("overview", "Normalized web search", p("The adapter sends one POST to `https://api.valyu.ai/v1/search` with `X-API-Key` authentication. It explicitly selects `search_type: 'web'`; the provider's broader dataset search is outside this adapter."), code("valyu-search.ts · server", `import { createSearch } from '@belweave/search-sdk';
import { valyu } from '@belweave/search-sdk/valyu';

const apiKey = process.env.VALYU_API_KEY;
if (!apiKey) throw new Error('VALYU_API_KEY is required');

const client = createSearch({ provider: valyu({ apiKey }) });
const response = await client.web.search({
  query: 'SQLite write concurrency',
  limit: 5,
});
console.log(response.results, response.usage);`), p("Content maps to snippet, relevance_score to the native score, and tx_id to provenance requestId. Reported total_deduction_dollars maps to USD usage. A missing amount remains unknown. The SDK validates consumed results before applying your output ceiling.")),
      s("settings", "Adapter settings", p("Import `ValyuOptions` or `ValyuSearchOptions` from the same subpath for typed configuration. The `search` object is fixed when you create the adapter; it does not add fields to the portable SearchRequest."), table(["Setting", "Behavior"], [["`search.maxPrice`", "Positive provider-native request budget; not an SDK estimate of USD."], ["`search.relevanceThreshold`", "Native relevance threshold between 0 and 1."], ["`search.responseLength`", "short, medium, large, max, or a positive integer character budget."], ["`search.fastMode`", "Explicit native fast-mode selection."], ["`search.startDate`, `search.endDate`", "YYYY-MM-DD subset with valid dates in ascending order."], ["`search.instructions`", "Nonblank provider ranking instructions, at most 500 characters."]]), p("Domain filters map to included_sources and excluded_sources. Both lists allow up to 100 hostnames under conservative SDK policy; this is not a verified native maximum. No implicit pagination or proprietary dataset access is performed.")),
      s("raw-response", "Preserve provider details", p("The adapter also exposes `searchRaw`. It makes the same validated web-only request and returns `{ provider, retrievedAt, data }`, retaining provider fields omitted by normalization. This direct adapter call does not run the createSearch fallback, retry, cache, or deadline policy. The HTTP transport retains its own resource bounds; supply a cancellation signal for your application deadline."), code("valyu-raw.ts · server", `import { valyu } from '@belweave/search-sdk/valyu';

const apiKey = process.env.VALYU_API_KEY;
if (!apiKey) throw new Error('VALYU_API_KEY is required');

const provider = valyu({ apiKey, search: { responseLength: 'short' } });
const response = await provider.searchRaw(
  { query: 'SQLite write concurrency', limit: 5 },
  { signal: AbortSignal.timeout(10_000) },
);
// data is a record of unknown values: validate fields before using them.
console.log(response.provider, response.retrievedAt);`)),
      s("boundaries", "Coverage and verification", p("This integration has no generated native client or native operation inventory. Contents, generated answers, research jobs, and dataset access are separate Valyu products. Local fixtures establish expected mapping and failure handling; they do not verify live availability, account access, or billing."), links({ label: "Official Valyu search reference", href: "https://docs.valyu.ai/api-reference/endpoint/search" }, { label: "Normalized request reference", href: "/docs/api/search" }, { label: "All providers", href: "/docs/providers" })),
    ],
  },
  {
    slug: "providers/searxng", title: "SearXNG", group: "Providers",
    description: "Normalized JSON search through a trusted, operator-selected SearXNG instance.",
    keywords: ["searxng", "SearxngOptions", "SEARXNG_BASE_URL", "metasearch", "self hosted", "searchRaw"],
    sections: [
      s("overview", "Choose your instance", p("SearXNG is metasearch software rather than a single hosted API. Configure the HTTPS baseUrl of an instance you trust on your server. The adapter appends /search and sends a form-encoded POST requesting JSON, page one, and the general category by default. It does not discover or select public instances."), code("searxng-search.ts · server", `import { createSearch } from '@belweave/search-sdk';
import { searxng } from '@belweave/search-sdk/searxng';

const baseUrl = process.env.SEARXNG_BASE_URL;
if (!baseUrl) throw new Error('SEARXNG_BASE_URL is required');

const client = createSearch({
  provider: searxng({ baseUrl }),
  timeoutMs: 10_000,
});
const response = await client.web.search({
  query: 'SQLite write concurrency',
  limit: 5,
});
console.log(response.results, response.warnings);`), p("JSON output must be enabled by the instance operator. SearXNG documents a 403 response when a requested format is disabled, including on many public instances. Search engines, access requirements, and availability depend on the selected instance.")),
      s("settings", "Instance settings", table(["Option", "Behavior"], [["`baseUrl`", "Required trusted HTTPS instance URL; optional base path, no embedded credentials, query, or fragment."], ["`headers`", "Optional server-owned reverse-proxy authentication headers; no standard SearXNG search API key."], ["`language`", "Instance-supported language selection."], ["`safeSearch`", "0, 1, or 2; engine-dependent behavior."], ["`timeRange`", "day, month, or year; engine-dependent behavior."], ["`categories`", "Instance-specific category names; defaults to general."], ["`fetch`", "Optional trusted transport for tests or server networking policy."]]), p("The selected URL is a server configuration boundary. Never take baseUrl or authentication headers directly from an untrusted caller. Requests reject redirects. Domain filters are unsupported: the SDK does not rewrite queries into engine-dependent site operators.")),
      s("results", "Keep metasearch semantics visible", list("One response page is read. limit caps normalized output and does not request extra pages.", "Content maps to snippet and a supplied score stays native. Unreported usage is null.", "Unresponsive engines produce a sanitized provider_warning when reported. A valid source list can be partial.", "Provider text remains untrusted, including any markup in content."), p("For engine attribution, dates, suggestions, or unresponsive-engine details, call the adapter's searchRaw(request, { signal }) method. It returns `{ provider, retrievedAt, data }`; validate unknown raw fields before use. Direct raw calls do not apply createSearch reliability policies; the HTTP transport retains its own resource bounds.")),
      s("boundaries", "Coverage and verification", p("This is a normalized adapter with raw JSON access, without a generated native client. Fixture validation does not establish a particular instance's access, engine configuration, privacy policy, or availability."), links({ label: "Official SearXNG Search API", href: "https://docs.searxng.org/dev/search_api.html" }, { label: "Server integration guide", href: "/docs/guides/server-integration" }, { label: "All providers", href: "/docs/providers" })),
    ],
  },
];
