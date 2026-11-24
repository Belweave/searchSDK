import { getRegistry } from "./registry";
import { source } from "./source";

/** Every indexable page, for the sitemap and llms.txt. */
export type SiteRoute = { path: string; title: string; description: string };

const pages: SiteRoute[] = [
  { path: "/", title: "Home", description: "One interface for AI apps and agents to many web search providers." },
  { path: "/providers", title: "Providers", description: "What each provider supports through searchSDK, what it costs and its limits, from the registry." },
  { path: "/benchmarks", title: "Benchmarks", description: "The leaderboard: quality first, then reliability." },
];

export function siteRoutes(): SiteRoute[] {
  const providers = getRegistry().providers.map((p) => ({
    path: `/providers/${p.id}`,
    title: p.name,
    description: `${p.name} in searchSDK: options, result fields, pricing, limits and sources.`,
  }));
  return [...pages, ...providers];
}

export function docsRoutes(): SiteRoute[] {
  return source.getPages().map((page) => ({
    path: page.url,
    title: page.data.title,
    description: page.data.description ?? "",
  }));
}
