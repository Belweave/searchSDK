import { type NextFetchEvent, type NextRequest, NextResponse } from "next/server";
import { machineResource } from "@/lib/analytics/classify";
import { captureServer } from "@/lib/analytics/server";

/**
 * Counts fetches of the documents agents and crawlers read: /llms.txt, /llms-full.txt, every
 * Markdown copy (/docs.md, /docs/….md, /providers/….md), /sitemap.xml and /robots.txt. They are
 * prerendered, so no route handler runs per request; Proxy runs before the static file is served,
 * passes the request through untouched and sends the event after the response (waitUntil).
 *
 * The matcher lists only these paths. Everything else, including the /ingest analytics proxy,
 * never enters this function.
 */
export function proxy(request: NextRequest, event: NextFetchEvent) {
  const resource = machineResource(request.nextUrl.pathname);
  if (resource && (request.method === "GET" || request.method === "HEAD") && !isSiteFetch(request)) {
    captureServer("machine_doc_fetched", { resource }, request, { waitUntil: (p) => event.waitUntil(p) });
  }
  return NextResponse.next();
}

/**
 * A fetch made by this site's own scripts: Next's <Link> prefetches (Next strips its RSC headers
 * before Proxy runs, so they are recognisable only this way) and in-page fetches such as a
 * copy-Markdown button. Crawlers and agents never send this pair of Fetch Metadata headers.
 */
function isSiteFetch(request: NextRequest): boolean {
  return request.headers.get("sec-fetch-site") === "same-origin" && request.headers.get("sec-fetch-dest") === "empty";
}

export const config = {
  matcher: ["/llms.txt", "/llms-full.txt", "/sitemap.xml", "/robots.txt", "/docs.md", "/docs/(.+\\.md)", "/providers/([a-z0-9-]+\\.md)"],
};
