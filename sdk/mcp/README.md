# @searchsdk/mcp

A local [Model Context Protocol](https://modelcontextprotocol.io) server for
[searchSDK](https://searchsdk.dev): its documentation and provider registry,
plus real web `search` and page `contents` through
[`@searchsdk/sdk`](https://www.npmjs.com/package/@searchsdk/sdk) with your own
provider keys. Runs over stdio, on MCP revision 2026-07-28, and answers
2025-era clients too. MIT licensed.

**Not on npm yet.** Build it from this folder (below). Once it is published it
runs with `npx -y @searchsdk/mcp`.

**Not live-verified.** No provider is verified against its live API yet; the
SDK maps each one from its public docs and is tested on synthetic fixtures.

Want the docs tools only, with no install and no keys? Use the public server at
`https://searchsdk.dev/mcp` ([setup](https://searchsdk.dev/docs/mcp)).

## Tools

| Tool | What it does | Network |
| --- | --- | --- |
| `search` | Web search through one provider or a fallback chain; normalized results, cost, warnings and every attempt | The provider you choose, with your key; may be billed |
| `contents` | Page text for up to 20 URLs, one page per URL, failures kept, cut at `maxChars` | The provider you choose, with your key; may be billed |
| `search_docs` | Full-text search over the bundled docs | None |
| `get_doc` | One docs page as Markdown | None |
| `list_providers` | Every provider, its key variable and verification status | None |
| `get_provider` | Supported options, limits, list prices, rate limits and sources | None |
| `estimate_cost` | `costBound` and `listPrice` for a call | None |
| `validate_options` | Whether a provider can honour your options, checked by the SDK with a fetch that never sends | None |
| `get_example` | TypeScript examples from the docs for a task | None |

Resources: every docs page (`searchsdk://docs/...`), every provider spec
(`searchsdk://providers/<id>`), the shared policy and the agent skill.
Prompts: `integrate-searchsdk`, `choose-provider`.

## Build and install from source

Node 24.22.1 or newer.

```sh
git clone https://github.com/Belweave/searchSDK.git
cd searchSDK/sdk/mcp
npm ci
npm pack --ignore-scripts=false     # builds dist, writes searchsdk-mcp-0.1.0.tgz
npm install -g ./searchsdk-mcp-0.1.0.tgz
searchsdk-mcp --help
```

## Keys and settings

Keys come from each provider's documented variable: `EXA_API_KEY`,
`TAVILY_API_KEY`, `BRAVE_API_KEY`, `PERPLEXITY_API_KEY`, `FIRECRAWL_API_KEY`,
`CONTEXT_DEV_API_KEY`, `TINYFISH_API_KEY`. Set only the ones you use.

| Variable | Meaning |
| --- | --- |
| `SEARCHSDK_PROVIDER` | Default provider. Otherwise a call names one, or the first provider (by id) that has a key set and supports the call is used |
| `SEARCHSDK_FALLBACK` | Default fallback chain, comma separated, such as `tavily,brave` |
| `SEARCHSDK_MAX_RETRIES` | Retries of transient failures, 0 to 5 (default 0) |
| `SEARCHSDK_TIMEOUT_MS` | Deadline per call, 1 to 300000 ms (default 30000) |
| `SEARCHSDK_MAX_CHARS` | Characters kept per page by `contents` (default 20000) |

A bad value stops the server at start with a message on stderr.

Keys are handed to the SDK and nothing else. They are never logged, never
included in a tool result or error, and only sent to the provider they belong
to, in the header its spec names. The server's instructions say which
providers have a key (names only). stdout carries the protocol only.

## Add it to a client

Claude Code:

```sh
claude mcp add --env EXA_API_KEY=your-key --transport stdio searchsdk -- searchsdk-mcp
```

Cursor (`.cursor/mcp.json`), and Claude Code or VS Code projects (`.mcp.json`):

```json
{
  "mcpServers": {
    "searchsdk": {
      "command": "searchsdk-mcp",
      "env": { "EXA_API_KEY": "your-key" }
    }
  }
}
```

VS Code's `.mcp.json` also takes `"type": "stdio"` on the entry.

Codex (`~/.codex/config.toml`):

```toml
[mcp_servers.searchsdk]
command = "searchsdk-mcp"
env_vars = ["EXA_API_KEY"]
```

After publication, replace `searchsdk-mcp` with `npx` and `["-y", "@searchsdk/mcp"]`.

## Cost

`search` and `contents` call a paid API. Every result carries `cost`
(`usd` is `null` when the price is unknown, never 0) and `attempts`, each with
`billed` (`yes`, `possible`, `no`). Retries and fallback are off unless you set
them. Errors come back as tool errors with the SDK's fixed `code`
(https://searchsdk.dev/docs/reference/errors).

## Development

```sh
npm ci
npm test     # corpus current, typecheck, fixture tests (network blocked)
npm run build
```

`src/core.ts` holds the docs and registry tools, shared with the public
endpoint (`site/lib/mcp/core.ts` is a copy the site's check keeps current).
`src/generated/corpus.json` is built by `npm run corpus` from `site/content/docs`,
`registry/` and `skills/searchsdk`; `npm test` fails when it is stale. Tests use
fixture responses and an injected `fetch`; a guard fails any other network use.
