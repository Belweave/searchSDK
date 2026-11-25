import { notFound } from "next/navigation";
import { markdownResponse, providerMarkdown } from "@/lib/markdown";
import { getRegistry } from "@/lib/registry";

/** /providers/<id>.md (next.config.ts rewrites it here): the provider page as Markdown. Static at build. */
export const revalidate = false;
export const dynamicParams = false;

export function generateStaticParams() {
  return getRegistry().providers.map((p) => ({ id: p.id }));
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = providerMarkdown(id);
  if (!body) notFound();
  return markdownResponse(body, `/providers/${id}`);
}
