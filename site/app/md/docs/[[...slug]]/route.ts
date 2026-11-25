import { notFound } from "next/navigation";
import { docsMarkdown, markdownResponse } from "@/lib/markdown";
import { source } from "@/lib/source";

/** /docs/<page>.md (next.config.ts rewrites it here): the docs page as Markdown. Static at build. */
export const revalidate = false;
export const dynamicParams = false;

export function generateStaticParams() {
  return source.generateParams();
}

export async function GET(_request: Request, { params }: { params: Promise<{ slug?: string[] }> }) {
  const page = source.getPage((await params).slug);
  if (!page) notFound();
  return markdownResponse(await docsMarkdown(page), page.url);
}
