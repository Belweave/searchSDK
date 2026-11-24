import { getRegistry } from "./registry";
import { source } from "./source";

/** Every indexable page, for the sitemap and llms.txt. */
export type SiteRoute = { path: string; title: string; description: string };

const pages: SiteRoute[] = [
  { path: "/", title: "Home", description: "One interface for AI apps and agents to many web search providers." },
  { path: "/providers", title: "Providers", description: "What each supported provider can do, what it costs and its limits." },
  { path: "/benchmarks", title: "Benchmarks", description: "The leaderboard: quality first, then reliability." },
];

export function siteRoutes(): SiteRoute[] {
  const providers = getRegistry().data.providers.map((p) => ({
    path: `/providers/${p.id}`,
    title: p.name,
    description: `${p.name}: capabilities, pricing, limits and sources.`,
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
