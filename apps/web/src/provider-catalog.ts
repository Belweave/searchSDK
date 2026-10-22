export type ProviderStatus = "alpha" | "native" | "next" | "research";
export interface ProviderEntry {
  id: string;
  name: string;
  description: string;
  boundary: string;
  docs: string;
  status: ProviderStatus;
  priority?: boolean;
  corpus?: boolean;
  /** False when only the normalized adapter is implemented. */
  nativeClient?: boolean;
}

// Keep every requested provider visible. Native corpus APIs are not web adapters.
export const providers: readonly ProviderEntry[] = [
  {
    id: "context",
    name: "Context.dev",
    description:
      "Web search with optional page content and query-relevant passages.",
    boundary:
      "Normalized search returns descriptions and credits. Native APIs add scraping, parsing, brand data, batches, monitors, and account operations.",
    docs: "https://docs.context.dev/api-reference/web-scraping/search",
    status: "alpha",
    priority: true,
  },
  {
    id: "tinyfish",
    name: "TinyFish",
    description:
      "Structured web search with ranked titles, URLs, and snippets.",
    boundary:
      "Normalized search returns one page. Native APIs cover search, fetch, browser sessions, agents, research, and monitors.",
    docs: "https://docs.tinyfish.ai/search-api/reference",
    status: "alpha",
    priority: true,
  },
  {
    id: "exa",
    name: "Exa",
    description:
      "Web search with query-relevant highlights and native relevance.",
    boundary:
      "Normalized sources and reported USD usage. Native APIs include content, answers, research, Websets, monitors, and management.",
    docs: "https://exa.ai/docs/reference/search",
    status: "alpha",
  },
  {
    id: "tavily",
    name: "Tavily",
    description:
      "Agent-oriented web search with relevance-ranked content snippets.",
    boundary:
      "Normalized basic search and credits. Native APIs preserve extraction, crawl, map, research, and explicit streaming.",
    docs: "https://docs.tavily.com/documentation/api-reference/endpoint/search",
    status: "alpha",
  },
  {
    id: "brave",
    name: "Brave",
    description:
      "Independent-index web search with descriptions and extra snippets.",
    boundary:
      "Normalized web results. Native search verticals, LLM Context, answers, suggestions, and enrichment remain separate.",
    docs: "https://api-dashboard.search.brave.com/app/documentation/web-search/get-started",
    status: "alpha",
  },
  {
    id: "perplexity",
    name: "Perplexity",
    description:
      "Ranked web results with extracted snippets and search filters.",
    boundary:
      "Normalized Search API sources. Native clients preserve Sonar, Agent, embeddings, skills, analytics, and streaming.",
    docs: "https://docs.perplexity.ai/api-reference/search-post",
    status: "alpha",
  },
  {
    id: "parallel",
    name: "Parallel",
    description:
      "Web retrieval using search queries and an optional research objective.",
    boundary:
      "Normalized search excerpts. Native APIs include Extract, Tasks, FindAll, monitors, memory, Chat, and Responses.",
    docs: "https://docs.parallel.ai/api-reference/search/search",
    status: "alpha",
  },
  {
    id: "linkup",
    name: "Linkup",
    description:
      "Search with source results, sourced answers, and structured output modes.",
    boundary:
      "Normalized searchResults. Native answers, fetch, research, tasks, and access-gated extraction keep their own shapes.",
    docs: "https://docs.linkup.so/pages/documentation/endpoints/search/overview",
    status: "alpha",
  },
  {
    id: "firecrawl",
    name: "Firecrawl",
    description: "Web search with optional scraping of returned pages.",
    boundary:
      "Normalized web results. Native scraping, crawling, extraction, agents, monitors, and account APIs remain explicit.",
    docs: "https://docs.firecrawl.dev/features/search",
    status: "alpha",
  },
  {
    id: "you",
    name: "You.com",
    description:
      "Web and news search with snippets and optional page extraction.",
    boundary:
      "Normalized web sources. Native Contents, Answer, Research, finance, images, and account balance retain their own shapes.",
    docs: "https://you.com/docs/api-reference/search/v1-search",
    status: "alpha",
  },
  {
    id: "serper",
    name: "Serper",
    description:
      "Google search results across web and specialized result categories.",
    boundary:
      "Normalized organic web hits. Native Google verticals, batches, GET/POST variants, and scraping use provider options.",
    docs: "https://serper.dev/",
    status: "alpha",
  },
  {
    id: "serpapi",
    name: "SerpAPI",
    description:
      "Structured search results from Google and other supported engines.",
    boundary:
      "Normalized Google organic hits, one page. Native engine gateway, archives, locations, uploads, and Extract families.",
    docs: "https://serpapi.com/search-api",
    status: "alpha",
  },
  {
    id: "valyu",
    name: "Valyu",
    description: "Web search with source content and provider-native relevance.",
    boundary: "Normalized web search only. Typed adapter options and raw response access preserve provider-specific details; no generated native client.",
    docs: "https://docs.valyu.ai/api-reference/endpoint/search",
    status: "alpha",
    nativeClient: false,
  },
  {
    id: "searxng",
    name: "SearXNG",
    description: "Metasearch through an operator-selected SearXNG instance.",
    boundary: "Normalized JSON web results only. Your server chooses the instance; JSON search must be enabled by its operator. No generated native client.",
    docs: "https://docs.searxng.org/dev/search_api.html",
    status: "alpha",
    nativeClient: false,
  },
  {
    id: "wondersearch",
    name: "WonderSearch",
    description:
      "Semantic retrieval over your own documents and workspace collections.",
    boundary:
      "Corpus-only native client: passages, content, access, uploads, ingestion, and billing. Never relabeled as open-web results.",
    docs: "https://docs.evokoa.com/wondersearch/reference/search-api",
    status: "native",
    corpus: true,
  },
];
export const alphaProviders = providers.filter(
  (provider) => provider.status === "alpha",
);

export const nativeProviders = providers.filter(
  (provider) => provider.nativeClient !== false,
);
