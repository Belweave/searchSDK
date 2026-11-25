import { getProvider, getRegistry, type Endpoint, type Provider, type Row, statusLine } from "./registry";
import { providerApiName, providerDescription } from "./routes";
import { absoluteUrl, site } from "./site";
import { type DocsPageEntry, orderedPages } from "./source";

/**
 * Markdown copies of the docs and provider pages, for agents and answer engines: /docs/<page>.md,
 * /providers/<id>.md, and every docs page together in /llms-full.txt. Built from the same sources
 * as the HTML (the docs MDX, the registry), so the two never disagree.
 */

const SITE_LINK = /\]\((\/[^)\s]*)\)/g;

/** Site-relative links become absolute, so a copied page still points home. */
function absoluteLinks(md: string): string {
  return md.replace(SITE_LINK, (_, p: string) => `](${absoluteUrl(p)})`);
}

/** Markdown for the MDX components the docs use; each reads the registry, as the component does. */
const COMPONENTS: Record<string, () => string> = {
  ProviderTable: () =>
    [
      "| Provider | Id | Key variable | Calls |",
      "| --- | --- | --- | --- |",
      ...getRegistry().providers.map(
        (p) => `| [${p.name}](/providers/${p.id}) | \`${p.id}\` | \`${p.env.join(", ")}\` | ${[p.search ? "search" : null, p.contents ? "contents" : null].filter(Boolean).join(", ")} |`,
      ),
    ].join("\n"),
  ProviderNames: () => providerNames(),
};

/** The providers' names as a sentence list: "A, B and C". */
export function providerNames(): string {
  const names = getRegistry().providers.map((p) => p.name);
  return names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names.at(-1)}` : (names[0] ?? "");
}

function expandComponents(md: string): string {
  return md.replace(/<([A-Z][A-Za-z]*)\s*\/>/g, (whole, name: string) => COMPONENTS[name]?.() ?? whole);
}

/** A docs page's body as Markdown, components expanded, links absolute; no title. */
export async function docsBody(page: DocsPageEntry): Promise<string> {
  const text = await page.data.getText("processed");
  // Headings carry their anchor as " [#id]"; the copy drops it.
  return absoluteLinks(expandComponents(text)).replace(/^(#{1,6} .*?) \[#[^\]]+\]$/gm, "$1").trim();
}

export async function docsMarkdown(page: DocsPageEntry): Promise<string> {
  const head = [`# ${page.data.title}`, "", ...(page.data.description ? [`> ${page.data.description}`, ""] : []), `Source: ${absoluteUrl(page.url)}`, ""];
  return `${head.join("\n")}\n${await docsBody(page)}\n`;
}

/** Every docs page, in sidebar order, under the site's definition: /llms-full.txt. */
export async function allDocsMarkdown(): Promise<string> {
  const parts = [`# ${site.name} documentation`, "", `> ${site.definition}`, ""];
  for (const page of orderedPages()) parts.push(await docsMarkdown(page), "");
  return parts.join("\n");
}

/** Questions and answers from a page's "## …?" headings and the text under each. */
export async function faqEntries(page: DocsPageEntry): Promise<{ question: string; answer: string }[]> {
  const body = await docsBody(page);
  return body
    .split(/^## /m)
    .slice(1)
    .map((section) => {
      const [heading, ...rest] = section.split("\n");
      const answer = rest
        .join("\n")
        .replace(/```[\s\S]*?```/g, "")
        .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
        .replace(/[`*_]/g, "")
        .replace(/\s+/g, " ")
        .trim();
      return { question: (heading ?? "").trim(), answer };
    })
    .filter((e) => e.question.endsWith("?") && e.answer);
}

// ---- Provider pages ----

const row = (r: Row) => `- ${r.label}: ${r.value}${r.unverified.length ? " (unverified)" : ""}`;

function endpoint(title: string, ep: Endpoint): string[] {
  return [
    `## ${title}`,
    "",
    `\`${ep.wire.method} ${ep.wire.url}\``,
    "",
    "### Request options",
    "",
    ...ep.options.map(row),
    ...(ep.providerOptions.length ? ["", `Provider options (providerOptions): ${ep.providerOptions.map((n) => `\`${n}\``).join(", ")}`] : []),
    "",
    `### ${ep.kind === "search" ? "Result fields" : "Page fields"}`,
    "",
    ...ep.fields.map(row),
    ...(ep.providerFields.length ? ["", `Kept in providerFields: ${ep.providerFields.map((n) => `\`${n}\``).join(", ")}`] : []),
    "",
    "### Pricing",
    "",
    ...[ep.cost.row, ...ep.pricing.rows].map(row),
    ...(ep.pricing.note ? ["", ep.pricing.note] : []),
    "",
    `Pricing source: ${ep.pricing.source} (read ${ep.pricing.retrievedOn})`,
    "",
    "### Limits",
    "",
    ...ep.limits.map(row),
    "",
    "### Rate limits",
    "",
    ...ep.rateLimits.map(row),
    "",
  ];
}

export function providerMarkdown(id: string): string | null {
  const p: Provider | undefined = getProvider(id);
  if (!p) return null;
  const lines = [
    `# ${providerApiName(p)} in ${site.name}`,
    "",
    `> ${providerDescription(p)}`,
    "",
    `Source: ${absoluteUrl(`/providers/${p.id}`)}`,
    "",
    statusLine(p),
    "",
    `- Id: \`${p.id}\``,
    `- Key: \`${p.env.join(", ")}\``,
    `- Search: ${p.search ? "yes" : "no"}`,
    `- Contents: ${p.contents ? "yes" : "no"}`,
    "",
    ...(p.search ? endpoint("Search", p.search) : []),
    ...(p.contents ? endpoint("Contents", p.contents) : []),
    "## Unverified",
    "",
    ...(p.unverified.length ? p.unverified.map((u) => `- ${u.label} (\`${u.pointer}\`): ${u.reason}`) : ["The spec lists nothing as unverified."]),
    "",
    "## Sources",
    "",
    ...p.sources.map((s) => `- ${s.url}: ${s.covers} (read ${s.retrievedOn})`),
    "",
    `Provider names are trademarks of their respective owners. ${site.name} is not affiliated with them.`,
    "",
  ];
  return lines.join("\n");
}

/** A Markdown response that names the HTML page as canonical, so search engines index the page. */
export function markdownResponse(body: string, htmlPath: string): Response {
  return new Response(body, {
    headers: {
      "content-type": "text/markdown; charset=utf-8",
      link: `<${absoluteUrl(htmlPath)}>; rel="canonical"`,
    },
  });
}
