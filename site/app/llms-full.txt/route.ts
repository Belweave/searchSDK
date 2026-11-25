import { allDocsMarkdown } from "@/lib/markdown";

export const revalidate = false;

/** llms-full.txt (https://llmstxt.org): every docs page as Markdown, in sidebar order, generated at build. */
export async function GET() {
  return new Response(await allDocsMarkdown(), { headers: { "content-type": "text/plain; charset=utf-8" } });
}
