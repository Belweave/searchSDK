# searchsdk

One interface to many web search providers, for AI apps and agents. Two
calls: `search` and `contents`. Zero runtime dependencies; standard `fetch`
on Node, Bun, Deno and edge runtimes.

**Not live-verified.** Providers are mapped from their public docs and tested
against synthetic fixtures only.

```ts
import { search } from "searchsdk";

const { results, cost } = await search("sqlite wal mode", { provider: "exa" });
console.log(results[0]?.title, results[0]?.publishedAt, cost.usd);
```

Keys come from each provider's documented variable (`EXA_API_KEY`,
`TAVILY_API_KEY`, `CONTEXT_DEV_API_KEY`, `TINYFISH_API_KEY`) or from
`createClient({ keys })`. They are sent only in headers and never logged.

```ts
import { createClient } from "searchsdk";

const client = createClient({ provider: "tavily", fallback: ["exa"], maxRetries: 1 });
const res = await client.search("eu ai act", {
  recency: "month",
  country: "DE",
  depth: "deep",
  providerOptions: { tavily: { topic: "news" } },
  timeoutMs: 10_000,
});
const pages = await client.contents(res.results.map((r) => r.url), { provider: "exa" });
```

Every response carries `results` or `pages`, `cost` (USD, marked `estimated`
when computed from list prices), `requestId`, `attempts`, `warnings`, and
`raw`, the provider's own body. Provider scores stay in `providerFields`; they
are not comparable across providers.

Options a provider cannot honour fail as `unsupported` before anything is
sent, and a fallback chain skips that provider. Failures throw `SearchError`
with a fixed `code`. Retries are off by default.

Provider behaviour lives in `../../registry`, not in this package; `registry`
is exported for routers and benchmarks.

## Development

```sh
npm ci
npm test   # registry sync check, typecheck (with and without Node types), all tests
```

Tests run every vector in `registry/conformance` with an injected fetch. A
guard fails any real network call.
