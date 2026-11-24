/** Site-wide facts. One place, so pages, metadata, sitemap and llms.txt agree. */
export const site = {
  name: "searchSDK",
  url: (process.env.SITE_URL ?? "https://searchsdk.dev").replace(/\/$/, ""),
  description: "One interface for AI apps and agents to many web search providers, with open benchmarks. MIT licensed.",
  repo: "https://github.com/Belweave/searchSDK",
  install: "npm install searchsdk",
} as const;

export const primaryNav = [
  { href: "/docs", label: "Docs" },
  { href: "/providers", label: "Providers" },
  { href: "/benchmarks", label: "Benchmarks" },
] as const;

export function absoluteUrl(path: string): string {
  return path === "/" ? `${site.url}/` : `${site.url}${path}`;
}
