import { docsRoutes, siteRoutes } from "@/lib/routes";
import { absoluteUrl, site } from "@/lib/site";

export const revalidate = false;

/** llms.txt (https://llmstxt.org): the site and its docs, generated from the docs source at build. */
export function GET() {
  const line = (r: { path: string; title: string; description: string }) =>
    `- [${r.title}](${absoluteUrl(r.path)})${r.description ? `: ${r.description}` : ""}`;

  const body = [
    `# ${site.name}`,
    "",
    `> ${site.description}`,
    "",
    `Install: \`${site.install}\`. Source: ${site.repo}`,
    "",
    "## Docs",
    "",
    ...docsRoutes().map(line),
    "",
    "## Pages",
    "",
    ...siteRoutes().filter((r) => !r.path.startsWith("/providers/")).map(line),
    "",
  ].join("\n");

  return new Response(body, { headers: { "content-type": "text/plain; charset=utf-8" } });
}
