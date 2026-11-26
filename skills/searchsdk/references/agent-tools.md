# searchSDK as an agent tool

Full guide: https://searchsdk.dev/docs/guides/agent-tools. Each example typechecks against `@searchsdk/sdk`.

## Vercel AI SDK

```ts
import { tool } from "ai";
import { z } from "zod";
import { createClient, SearchError } from "@searchsdk/sdk";

const client = createClient({ provider: "exa", fallback: ["tavily"], maxRetries: 1 });

export const webSearch = tool({
  description: "Search the web. Returns titles, URLs, dates and excerpts.",
  inputSchema: z.object({ query: z.string() }),
  execute: async ({ query }) => {
    try {
      const res = await client.search(query, { maxResults: 5 });
      return { results: res.results.map((r) => ({ title: r.title, url: r.url, publishedAt: r.publishedAt, excerpt: r.excerpts[0] ?? null })) };
    } catch (e) {
      if (e instanceof SearchError) return { error: e.code };
      throw e;
    }
  },
});
```

## OpenAI Responses function calling

```ts
import OpenAI from "openai";
import { search } from "@searchsdk/sdk";

export const tools: OpenAI.Responses.Tool[] = [
  {
    type: "function",
    name: "web_search",
    description: "Search the web. Returns titles, URLs and excerpts.",
    parameters: { type: "object", properties: { query: { type: "string" } }, required: ["query"], additionalProperties: false },
    strict: true,
  },
];

export async function runTool(call: OpenAI.Responses.ResponseFunctionToolCall): Promise<OpenAI.Responses.ResponseInputItem> {
  const { query } = JSON.parse(call.arguments) as { query: string };
  const res = await search(query, { provider: "exa", maxResults: 5 });
  return { type: "function_call_output", call_id: call.call_id, output: JSON.stringify(res.results) };
}
```

## Anthropic tool use

```ts
import Anthropic from "@anthropic-ai/sdk";
import { search } from "@searchsdk/sdk";

export const tools: Anthropic.Tool[] = [
  {
    name: "web_search",
    description: "Search the web. Returns titles, URLs and excerpts.",
    input_schema: { type: "object", properties: { query: { type: "string" } }, required: ["query"] },
  },
];

export async function runTool(block: Anthropic.ToolUseBlock): Promise<Anthropic.ToolResultBlockParam> {
  const { query } = block.input as { query: string };
  const res = await search(query, { provider: "exa", maxResults: 5 });
  return { type: "tool_result", tool_use_id: block.id, content: JSON.stringify(res.results) };
}
```

Loop: call `messages.create` with `tools`, append the assistant `content`, run every `tool_use` block, send all `tool_result` blocks in one user message, repeat until `stop_reason` is not `tool_use`.

## MCP

`claude mcp add --transport http searchsdk https://searchsdk.dev/mcp` gives an agent the docs and registry tools. The local `@searchsdk/mcp` package (stdio, built from `sdk/mcp`) adds `search` and `contents` with your keys.
