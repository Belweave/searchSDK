// Benchmark inventory. Native endpoints and normalized adapters are distinct tracks.
// These are harness settings; the product catalog remains the product source of truth.
export const providers = Object.freeze([
  ['context', 'Context.dev', 'CONTEXT_API_KEY', 'v1-web-search', 'numResults-floor-10'],
  ['tinyfish', 'TinyFish', 'TINYFISH_API_KEY', 'search-api', 'web-first-page'],
  ['exa', 'Exa', 'EXA_API_KEY', 'search', 'auto-highlights'],
  ['tavily', 'Tavily', 'TAVILY_API_KEY', 'search', 'basic-no-answer'],
  ['brave', 'Brave', 'BRAVE_API_KEY', 'res-v1-web', 'web-extra-snippets'],
  ['perplexity', 'Perplexity', 'PERPLEXITY_API_KEY', 'search', 'web-search-only'],
  ['parallel', 'Parallel', 'PARALLEL_API_KEY', 'v1-search', 'basic-search-queries'],
  ['linkup', 'Linkup', 'LINKUP_API_KEY', 'v1-search', 'fast-searchResults'],
  ['firecrawl', 'Firecrawl', 'FIRECRAWL_API_KEY', 'v2-search', 'web-no-scrape'],
  ['you', 'You.com', 'YOU_API_KEY', 'v1-search', 'web-only'],
  ['serper', 'Serper', 'SERPER_API_KEY', 'search', 'google-organic'],
  ['serpapi', 'SerpAPI', 'SERPAPI_API_KEY', 'search-json', 'google-organic-first-page'],
  ['valyu', 'Valyu', 'VALYU_API_KEY', 'v1-search', 'web-only'],
  ['searxng', 'SearXNG', null, 'search-json', 'operator-selected-instance'],
].map(([id, name, keyEnv, apiVersion, profile]) => Object.freeze({
  id, name, keyEnv, apiVersion, profile, track: 'open-web-search', comparable: true,
})).concat([Object.freeze({
  id: 'wondersearch', name: 'WonderSearch', keyEnv: null, apiVersion: 'native-corpus',
  profile: 'corpus-only', track: 'corpus-retrieval', comparable: false,
  exclusion: 'Corpus retrieval requires a frozen, lawfully reusable corpus and its own judgments; it is not open-web search. No ingestion or native mutation is performed by this harness.',
})]));

export async function loadAdapter(provider, options, sdkRoot) {
  const module = await import(sdkRoot ? new URL(`${provider.id}.js`, sdkRoot).href : `@belweave/search-sdk/${provider.id}`);
  const factory = module[provider.id];
  if (typeof factory !== 'function') throw new Error('adapter_unavailable');
  return factory(options);
}
