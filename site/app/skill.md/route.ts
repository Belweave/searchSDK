import { markdown, skillFiles } from "@/lib/skill";

/** /skill.md: the searchSDK agent skill's SKILL.md. Static at build. */
export const revalidate = false;

export function GET() {
  return markdown(skillFiles["SKILL.md"] ?? "");
}
