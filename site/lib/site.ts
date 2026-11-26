/** Site-wide facts. One place, so pages, metadata, structured data, sitemap and llms.txt agree. */
export const site = {
  name: "searchSDK",
  url: (process.env.SITE_URL ?? "https://searchsdk.dev").replace(/\/$/, ""),
  description: "One interface for AI apps and agents to many web search providers, with open benchmarks. MIT licensed.",
  /** The one-sentence definition pages, structured data and llms.txt open with. */
  definition:
    "searchSDK is an open-source, MIT-licensed SDK by Belweave that gives AI apps and agents one interface to many web search APIs, with explicit fallback, per-attempt cost and open benchmarks.",
  repo: "https://github.com/Belweave/searchSDK",
  /** The npm package (the unscoped name is blocked by npm as too close to search-sdk). */
  packageName: "@searchsdk/sdk",
  /** The languages with a runtime in the repository (sdk/typescript, sdk/python). */
  languages: ["TypeScript", "Python"],
  license: "https://opensource.org/license/mit",
  organization: { name: "Belweave", url: "https://github.com/Belweave" },
} as const;

export const primaryNav = [
  { href: "/docs", label: "Docs" },
  { href: "/providers", label: "Providers" },
  { href: "/benchmarks", label: "Benchmarks" },
] as const;

export function absoluteUrl(path: string): string {
  return path === "/" ? `${site.url}/` : `${site.url}${path}`;
}

/** The Markdown copy of a page that has one (docs pages and provider pages), or null. */
export function markdownPath(path: string): string | null {
  if (path === "/docs" || path.startsWith("/docs/") || /^\/providers\/[a-z0-9-]+$/.test(path)) return `${path}.md`;
  return null;
}
