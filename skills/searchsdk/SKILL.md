---
name: searchsdk
description: Add web search and page-text fetching to TypeScript apps and AI agents with searchSDK (npm @searchsdk/sdk), one interface to Exa, Tavily, Brave Search, Perplexity, Firecrawl, Context.dev and TinyFish. Use when writing or reviewing code that calls search(), contents() or createClient() from @searchsdk/sdk, choosing a search provider or fallback chain, handling SearchError codes, reading cost, attempts or warnings, wrapping web search as an agent tool (Vercel AI SDK, OpenAI, Anthropic, MCP), or connecting the searchSDK MCP server.
license: MIT
---

# searchSDK

searchSDK (always written exactly so) is an MIT-licensed TypeScript SDK by Belweave. Two calls, `search` and `contents`, one result shape for every provider. Zero runtime dependencies; needs standard `fetch`; tested on Node 24. Docs: https://searchsdk.dev/docs (every page has a `.md` copy, and https://searchsdk.dev/llms-full.txt has them all).

No provider is verified against its live API yet: specs are mapped from public docs and tested on synthetic fixtures. Benchmark results are pending. Do not claim one provider is faster, cheaper in practice or better.

## Install

```sh
npm install @searchsdk/sdk
```

The Python runtime (`sdk/python` in the repository) is not on PyPI.

## Keys

Each provider reads its documented variable: `EXA_API_KEY`, `TAVILY_API_KEY`, `BRAVE_API_KEY`, `PERPLEXITY_API_KEY`, `FIRECRAWL_API_KEY`, `CONTEXT_DEV_API_KEY`, `TINYFISH_API_KEY`. Or pass `createClient({ keys: { exa: "..." } })`, or `env` for Worker bindings.

- Server only. Never put a key in browser, mobile or edge-client code; app code calls your own backend.
- A missing primary key throws `configuration` (`field: "keys"`) before anything is sent; a fallback without a key is skipped with a `fallback_key_missing` warning.

## search vs contents

- `search(query, options)`: ranked results (`url`, `title`, `excerpts`, `publishedAt`, `author`, `rank`, `providerFields`).
- `contents(urls, options)`: page text, one `page` per requested URL in order, `status: "ok" | "failed"`. A failed page does not fail the call.
- Brave Search has no contents endpoint. URLs per contents call differ by provider (Context.dev and Firecrawl take 1).

```ts
import { createClient } from "@searchsdk/sdk";

const client = createClient({ provider: "exa", fallback: ["tavily"], maxRetries: 1 });
const res = await client.search("sqlite wal mode", { maxResults: 5, recency: "year" });
const pages = await client.contents(res.results.slice(0, 3).map((r) => r.url));
for (const p of pages.pages) console.log(p.status, p.url, p.content?.length ?? p.error?.code);
```

## Choosing a provider and fallback

- `provider` is required on a call unless the client sets one. Ids: `brave`, `context`, `exa`, `firecrawl`, `perplexity`, `tavily`, `tinyfish`.
- Check support before writing options: an option a provider cannot honour fails as `unsupported` before sending (for example `startDate` on Brave, `maxResults` above a provider's limit). The MCP tool `validate_options` or https://searchsdk.dev/docs/reference/provider-support shows the matrix.
- Retries and fallback are off by default. Set `maxRetries` (0 to 5) and `fallback: [...]`.
- Retried: `network`, `rate_limit`, `unavailable`, `attempt_timeout`. Falls back on those plus `quota` and `unsupported`. `auth`, `forbidden`, `provider_error`, `invalid_response`, `spec_mismatch`, `response_too_large`, `timeout` and `aborted` stop the call.
- Provider-only options go under `providerOptions: { <id>: {...} }`; each provider in a chain gets only its own.

## Cost, attempts and warnings

Read these on every response; they are the point of the SDK.

- `res.cost`: `{ usd, estimated, source }`. `usd` is `null` when the price is unknown. Never treat `null` as 0.
- `res.attempts`: every attempt, including skipped ones, each with `billed` (`yes`, `possible`, `no`) and its own `cost`. Sum attempts with `billed !== "no"` for spend; a `SearchError` carries `attempts` too.
- `res.warnings`: `fallback_used` (another provider answered: check `res.provider`), `invalid_rows_dropped`, `unmatched_pages`, `partial_results`, `provider_warning`, `provider_notice`.
- Before a call, `costBound(registry.exa, "search", { maxResults: 10 })` gives the most it can cost; `null` with `unknownBecause` when it cannot be bounded.

## Errors

Every failure is a `SearchError` with a fixed `code`; switch on `code`, never on `message`. `field` names the bad option, `status` the HTTP status, `retryAfterMs` the provider's `Retry-After`. An empty `results` array is a success, not an error. Full table: [references/errors.md](references/errors.md).

```ts
import { search, SearchError } from "@searchsdk/sdk";

try {
  await search("postgres vacuum", { provider: "brave", startDate: "2026-01-01" });
} catch (e) {
  if (e instanceof SearchError && e.code === "unsupported") console.log("Brave cannot filter by", e.field);
}
```

## As an agent tool

Return compact results (title, url, date, first excerpt) and return `{ error: e.code }` instead of throwing so the model can recover. Cap `maxResults`. Framework wrappers (Vercel AI SDK `tool()`, OpenAI Responses function calling, Anthropic tool use): [references/agent-tools.md](references/agent-tools.md).

## MCP server

- Public, free, keyless, docs and registry only: `claude mcp add --transport http searchsdk https://searchsdk.dev/mcp`. Tools: `search_docs`, `get_doc`, `list_providers`, `get_provider`, `estimate_cost`, `validate_options`, `get_example`. Use them to confirm an option or price before writing code.
- Local `@searchsdk/mcp` (stdio) adds real `search` and `contents` with the user's keys. Run it with `npx -y @searchsdk/mcp`.

## Pitfalls

- The npm name is `@searchsdk/sdk`, not `searchsdk` or `search-sdk`.
- Unknown option names throw `invalid_request`; do not pass provider-native names (`numResults`, `max_results`) at the top level.
- `recency` cannot be combined with `startDate` or `endDate`; dates are inclusive `YYYY-MM-DD`.
- `providerFields` (scores and ids) are not comparable across providers.
- `raw` is the provider's whole body; do not send it to a model unfiltered.
- The exported `registry` is frozen. Pass edited copies to `createClient({ registry })`.

More: [references/api.md](references/api.md) for every option and response field.
