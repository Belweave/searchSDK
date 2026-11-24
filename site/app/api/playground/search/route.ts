/**
 * TODO(playground): the bounded live playground. Not ported yet.
 * When it lands it accepts request-scoped visitor keys that are never stored or logged, keeps
 * provider calls server-side, and enforces deadlines and response limits (AGENTS.md).
 * Until then it answers 501 and makes no provider call.
 */
const notImplemented = () =>
  Response.json(
    { error: "not_implemented", message: "The searchSDK playground is not available yet." },
    { status: 501 },
  );

export const POST = notImplemented;
export const GET = notImplemented;
