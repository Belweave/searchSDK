import { notFound } from "next/navigation";
import { markdown, skillFiles } from "@/lib/skill";

/** /skills/searchsdk/<file>: each file of the agent skill (SKILL.md, references/*.md). Static at build. */
export const revalidate = false;
export const dynamicParams = false;

export function generateStaticParams() {
  return Object.keys(skillFiles).map((file) => ({ path: file.split("/") }));
}

export async function GET(_request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const body = skillFiles[(await params).path.join("/")];
  if (body === undefined) notFound();
  return markdown(body);
}
