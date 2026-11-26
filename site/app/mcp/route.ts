import { createMcpHandler } from "@modelcontextprotocol/server";
import { createDocsServer, type Corpus } from "@/lib/mcp/core";
import corpusJson from "@/lib/mcp/corpus.json";

/**
 * The public, read-only searchSDK MCP endpoint (https://searchsdk.dev/mcp): Streamable HTTP,
 * stateless, MCP revision 2026-07-28 with the SDK's stateless fallback for 2025-era clients. It
 * serves generated documentation and registry data only (AGENTS.md): no keys, no provider calls,
 * no arbitrary URLs, no code execution. Every tool is a pure function of the bundled corpus.
 *
 * Any origin may call it: it is public, unauthenticated and returns only public data, so a
 * cross-origin or DNS-rebinding caller gains nothing it could not fetch directly. Requests are
 * capped at 64 KiB; responses are small, deterministic and never cached by intermediaries.
 */
export const maxDuration = 10;

const corpus = corpusJson as Corpus;
const VERSION = "0.1.0";

const handler = createMcpHandler(() => createDocsServer(corpus, { name: "searchsdk-docs", version: VERSION }), {
  maxRequestBodySize: 64 * 1024,
});

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, DELETE, OPTIONS",
  "access-control-expose-headers": "mcp-protocol-version, mcp-session-id",
  "access-control-max-age": "86400",
};
const DEFAULT_ALLOWED_HEADERS = "accept, content-type, mcp-protocol-version, mcp-method, mcp-name, mcp-session-id, last-event-id";

function withCors(response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [k, v] of Object.entries(CORS)) headers.set(k, v);
  headers.set("cache-control", "no-store");
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

async function serve(request: Request): Promise<Response> {
  return withCors(await handler.fetch(request));
}

export const GET = serve;
export const POST = serve;
export const DELETE = serve;

export function OPTIONS(request: Request): Response {
  // Echo the requested headers: tool parameters may travel as Mcp-Param-* headers (SEP-2243).
  const asked = request.headers.get("access-control-request-headers");
  return new Response(null, { status: 204, headers: { ...CORS, "access-control-allow-headers": asked ?? DEFAULT_ALLOWED_HEADERS } });
}
