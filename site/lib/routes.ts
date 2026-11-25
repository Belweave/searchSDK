import { lastModified } from "./last-modified";
import { getRegistry, type Provider } from "./registry";
import { orderedPages } from "./source";

/** Every indexable page, for the sitemap and llms.txt. `lastModified` is the latest commit to its sources. */
export type SiteRoute = { path: string; title: string; description: string; lastModified?: string };

const REGISTRY = "../registry/providers";

/** "Exa search API", "Brave Search API": the provider's API as people search for it. */
export function providerApiName(p: Pick<Provider, "name">): string {
  return /\bsearch\b/i.test(p.name) ? `${p.name} API` : `${p.name} search API`;
}

export function providerDescription(p: Pick<Provider, "name">): string {
  return `How searchSDK calls the ${providerApiName(p)}: supported options, result fields, pricing and cost source, limits and sources, from the registry.`;
}

export function siteRoutes(): SiteRoute[] {
  const pages: SiteRoute[] = [
    {
      path: "/",
      title: "Home",
      description: "One interface for AI apps and agents to many web search providers.",
      lastModified: lastModified(["app/(site)/page.tsx", "components/home", "content/examples", REGISTRY]),
    },
    {
      path: "/providers",
      title: "Providers",
      description: "What each provider supports through searchSDK, what it costs and its limits, from the registry.",
      lastModified: lastModified(["app/(site)/providers/page.tsx", REGISTRY]),
    },
    {
      path: "/benchmarks",
      title: "Benchmarks",
      description: "The open benchmark: quality first, then reliability. Results pending; the first run is in progress.",
      lastModified: lastModified(["app/(site)/benchmarks/page.tsx", "data/benchmarks.sample.json"]),
    },
  ];
  const providers = getRegistry().providers.map((p) => ({
    path: `/providers/${p.id}`,
    title: `${providerApiName(p)} in searchSDK`,
    description: providerDescription(p),
    lastModified: lastModified(["app/(site)/providers/[id]/page.tsx", `${REGISTRY}/${p.id}.json`]),
  }));
  return [...pages, ...providers];
}

export function docsRoutes(): SiteRoute[] {
  return orderedPages().map((page) => ({
    path: page.url,
    title: page.data.title,
    description: page.data.description ?? "",
    lastModified: docsLastModified(page.path),
  }));
}

/** The latest commit to a docs page's MDX file (content/docs/<path>). */
export function docsLastModified(pagePath: string): string | undefined {
  return lastModified([`content/docs/${pagePath}`]);
}
