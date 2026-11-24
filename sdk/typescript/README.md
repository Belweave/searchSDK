# searchsdk

One interface to many web search providers, for AI apps and agents. Two
calls: `search` and `contents`. Zero runtime dependencies. Written for any
runtime with standard `fetch`; tested on Node 24 only.

**Not live-verified.** Providers are mapped from their public docs and tested
against synthetic fixtures only.

## Install from source

Nothing is published to npm yet. Build a package from the repository:

```sh
git clone https://github.com/Belweave/searchSDK
cd searchSDK/sdk/typescript && npm ci && npm pack --ignore-scripts=false
cd your-app && npm install ../searchSDK/sdk/typescript/searchsdk-0.0.0.tgz
```

## Use

```ts
import { search } from "searchsdk";

const { results, cost } = await search("sqlite wal mode", { provider: "exa" });
console.log(results[0]?.title, results[0]?.publishedAt, cost.usd);
```

Keys come from each provider's documented variable (`EXA_API_KEY`,
`BRAVE_API_KEY`, `PERPLEXITY_API_KEY` and so on) or from
`createClient({ keys })`. Every current spec sends them in headers; none is
logged. A fallback without a key is skipped with a warning.

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

Every response carries `results` or `pages`, `cost`, `requestId`,
`attempts`, `warnings`, and `raw`, the provider's own body. Cost is in USD,
marked `estimated` when computed from list prices, and `null` when the price
is unknown. Each attempt records whether it was billed (`yes`, `possible`,
`no`) and its own cost, so retries and fallback never hide spend. Provider
scores stay in `providerFields`; they are not comparable across providers.

Options a spec knows a provider cannot honour fail as `unsupported` before
anything is sent, and a fallback chain skips that provider. Failures throw
`SearchError` with a fixed `code`. Retries and fallback are off unless set.

Provider behaviour lives in `../../registry`, not in this package. The
exported `registry` is frozen; pass edited copies as
`createClient({ registry })`, which validates them and takes their ids as
provider ids, with no casts. `costBound` gives the most one request can cost,
`listPrice` its computed price, and `urlKey` the URL matching rule.

## Development

```sh
npm ci
npm test   # registry sync check, typecheck (with and without Node types), all tests
npm pack --ignore-scripts=false   # builds dist first; .npmrc disables lifecycle scripts
```

Tests run every vector in `registry/conformance` with an injected fetch,
plus one local loopback test of the real fetch. Every test file installs a
guard that fails any other network use.
