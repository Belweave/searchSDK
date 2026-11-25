import { loader } from "fumadocs-core/source";
import { metaSchema, pageSchema } from "fumadocs-core/source/schema";
import { defineDocs } from "fumadocs-mdx/macro";

/**
 * Frontmatter: fumadocs' own, plus `metaTitle`, the <title> when it should say more than the
 * heading, and `faq`, set on a page whose "## …?" headings are a visible FAQ (FAQPage JSON-LD).
 */
const docsPageSchema = pageSchema.extend({
  metaTitle: pageSchema.shape.title.optional(),
  faq: pageSchema.shape.full,
});

const docs = defineDocs({
  dir: "content/docs",
  docs: {
    schema: docsPageSchema,
    postprocess: { includeProcessedMarkdown: true },
  },
  meta: { schema: metaSchema },
});

/** The docs content source (content/docs/**.mdx, ordered by meta.json). */
export const source = loader({
  baseUrl: "/docs",
  source: docs.toFumadocsSource(),
});

export type DocsPageEntry = ReturnType<typeof source.getPages>[number];

type TreeNode = { type: string; url?: string; children?: TreeNode[]; index?: TreeNode };

/** Every docs page in sidebar order (meta.json), for llms.txt, llms-full.txt and the sitemap. */
export function orderedPages(): DocsPageEntry[] {
  const byUrl = new Map(source.getPages().map((p) => [p.url, p]));
  const out: DocsPageEntry[] = [];
  const visit = (node: TreeNode) => {
    if (node.index) visit(node.index);
    const page = node.type === "page" && node.url ? byUrl.get(node.url) : undefined;
    if (page && !out.includes(page)) out.push(page);
    node.children?.forEach(visit);
  };
  visit(source.getPageTree() as TreeNode);
  // Anything the tree leaves out still appears, after the rest.
  for (const page of byUrl.values()) if (!out.includes(page)) out.push(page);
  return out;
}
