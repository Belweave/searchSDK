#!/usr/bin/env node
// searchsdk-mcp: the local searchSDK MCP server over stdio. `npx -y @searchsdk/mcp`.
// stdout carries the protocol only; diagnostics go to stderr and never include a key.
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { createLocalServer, settings, VERSION } from "./server.ts";

const arg = process.argv[2];
if (arg === "--version" || arg === "-v") {
  process.stdout.write(`${VERSION}\n`);
} else if (arg === "--help" || arg === "-h") {
  process.stdout.write(
    [
      `searchsdk-mcp ${VERSION}: searchSDK docs, provider registry, search and contents over MCP (stdio).`,
      "",
      "Usage: npx -y @searchsdk/mcp",
      "",
      "Provider keys come from each provider's documented variable (EXA_API_KEY, TAVILY_API_KEY, ...).",
      "Optional: SEARCHSDK_PROVIDER, SEARCHSDK_FALLBACK (comma list), SEARCHSDK_MAX_RETRIES,",
      "SEARCHSDK_TIMEOUT_MS, SEARCHSDK_MAX_CHARS. Docs: https://searchsdk.dev/docs/mcp",
      "",
    ].join("\n"),
  );
} else {
  try {
    settings(process.env); // fail fast on a bad setting, before a client connects
  } catch (e) {
    process.stderr.write(`searchsdk-mcp: ${(e as Error).message}\n`);
    process.exit(2);
  }
  serveStdio(() => createLocalServer(), {
    onerror: (e) => process.stderr.write(`searchsdk-mcp: ${e.name}: ${e.message}\n`),
  });
}
