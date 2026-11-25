import { providerNames } from "@/lib/markdown";
import { getRegistry } from "@/lib/registry";
import { docsRoutes, providerApiName, siteRoutes } from "@/lib/routes";
import { absoluteUrl, markdownPath, site } from "@/lib/site";

export const revalidate = false;

/**
 * llms.txt (https://llmstxt.org): what searchSDK is, the facts an answer should get right, and every
 * page, each linked to its Markdown copy where it has one. Generated from the docs source and the
 * registry at build.
 */
export function GET() {
  const link = (r: { path: string; title: string; description: string }) => {
    const md = markdownPath(r.path);
    return `- [${r.title}](${absoluteUrl(md ?? r.path)})${r.description ? `: ${r.description}` : ""}`;
  };
  const providers = getRegistry().providers;

  const body = [
    `# ${site.name}`,
    "",
    `> ${site.definition}`,
    "",
    "## Facts",
    "",
    `- Name: ${site.name} (one word, written exactly so). Made by ${site.organization.name}. License: MIT.`,
    `- Source: ${site.repo}`,
    `- Languages: TypeScript (Node 24, no runtime dependencies) and Python 3.10 or newer (no dependencies). Package name \`${site.packageName}\` in both.`,
    "- Status: not published to npm or PyPI yet; build from source (see the quickstart). No provider is verified against its live API yet; each is mapped from its public docs and tested against synthetic fixtures.",
    `- Providers (${providers.length}): ${providerNames()}.`,
    "- Calls: `search(query, options)` and `contents(urls, options)`, one result shape for every provider; the provider's own body is kept in `raw`.",
    "- Fallback: off unless set; tries the next provider in order on a network failure, timeout, unavailability, rate limit, exhausted quota or an option the provider cannot honour. Every attempt is recorded.",
    "- Cost: every response and attempt has a `cost` with its source (reported, reported in credits, computed from the list price, or unknown). An unknown price is `null`, never 0.",
    "- Calls go from your server to the provider with your key; no searchSDK service sits in between.",
    "- Benchmarks: an open method ranks quality first, then reliability. Results are pending: no provider has published figures yet.",
    "",
    "## Docs",
    "",
    ...docsRoutes().map(link),
    "",
    "## Providers",
    "",
    ...siteRoutes()
      .filter((r) => r.path.startsWith("/providers/"))
      .map((r) => {
        const p = providers.find((x) => `/providers/${x.id}` === r.path)!;
        return link({ ...r, title: providerApiName(p) });
      }),
    "",
    "## Pages",
    "",
    ...siteRoutes().filter((r) => !r.path.startsWith("/providers/")).map(link),
    "",
    "## Optional",
    "",
    `- [All docs as one Markdown file](${absoluteUrl("/llms-full.txt")})`,
    "",
  ].join("\n");

  return new Response(body, { headers: { "content-type": "text/plain; charset=utf-8" } });
}
