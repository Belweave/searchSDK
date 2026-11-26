import { skillZip } from "@/lib/skill";

/** /skills/searchsdk.zip: the agent skill folder, unzipped as searchsdk/. Static at build. */
export const revalidate = false;

export function GET() {
  return new Response(skillZip() as Uint8Array<ArrayBuffer>, {
    headers: { "content-type": "application/zip", "content-disposition": 'attachment; filename="searchsdk.zip"' },
  });
}
