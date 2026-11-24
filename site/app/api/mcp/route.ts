/**
 * TODO(mcp): the public, read-only docs MCP endpoint. Not ported yet.
 * It will serve generated documentation only: no keys, no provider calls, no arbitrary URLs,
 * no code execution (AGENTS.md). Until then every method answers 501.
 */
const notImplemented = () =>
  Response.json(
    { error: "not_implemented", message: "The searchSDK docs MCP endpoint is not available yet." },
    { status: 501 },
  );

export const GET = notImplemented;
export const POST = notImplemented;
