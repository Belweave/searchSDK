/** Official provider artwork. Source details and hashes: docs/brand-assets.md. */
export interface ProviderBrandAsset {
  src: string;
  alt: string;
  /** Official alternate artwork intended for a dark canvas. */
  darkSrc?: string;
  width: number;
  height: number;
  /** Keep this light canvas behind the mark in either site theme. */
  plate?: "light";
}

// IDs match provider-catalog.ts. Never apply a CSS color filter to these marks.
export const providerBrandAssets: Record<string, ProviderBrandAsset> = {
  context: { src: "/brands/context.svg", darkSrc: "/brands/context-dark.svg", alt: "Context.dev", width: 372, height: 256 },
  tinyfish: { src: "/brands/tinyfish.svg", alt: "TinyFish", width: 221, height: 207, plate: "light" },
  exa: { src: "/brands/exa.svg", alt: "Exa", width: 151, height: 182, plate: "light" },
  tavily: { src: "/brands/tavily.svg", darkSrc: "/brands/tavily-dark.svg", alt: "Tavily", width: 55, height: 55 },
  brave: { src: "/brands/brave.svg", alt: "Brave", width: 56, height: 64 },
  perplexity: { src: "/brands/perplexity.svg", alt: "Perplexity", width: 270, height: 270, plate: "light" },
  parallel: { src: "/brands/parallel.svg", alt: "Parallel", width: 96, height: 96, plate: "light" },
  linkup: { src: "/brands/linkup.svg", alt: "Linkup", width: 285, height: 198, plate: "light" },
  firecrawl: { src: "/brands/firecrawl.svg", alt: "Firecrawl", width: 200, height: 284 },
  you: { src: "/brands/you.svg", alt: "You.com", width: 500, height: 500 },
  serper: { src: "/brands/serper.svg", alt: "Serper", width: 70, height: 70, plate: "light" },
  serpapi: { src: "/brands/serpapi.svg", alt: "SerpAPI", width: 1000, height: 1000, plate: "light" },
  valyu: { src: "/brands/valyu.svg", alt: "Valyu", width: 375, height: 375, plate: "light" },
  searxng: { src: "/brands/searxng.svg", alt: "SearXNG", width: 92, height: 92, plate: "light" },
  wondersearch: { src: "/brands/wondersearch.svg", darkSrc: "/brands/wondersearch-dark.svg", alt: "WonderSearch", width: 373, height: 375 },
};
