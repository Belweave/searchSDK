# @searchsdk/sdk

searchSDK is an open-source, MIT-licensed SDK by Belweave that gives AI apps
and agents one interface to many web search APIs, with explicit fallback,
per-attempt cost and open benchmarks. This is the TypeScript runtime: two
calls, `search` and `contents`, and zero runtime dependencies. Written for
any runtime with standard `fetch`; tested on Node 24 only.

**Not live-verified.** Providers are mapped from their public docs and tested
against synthetic fixtures only.

## Install

```sh
npm install @searchsdk/sdk
```

Docs: [searchsdk.dev/docs](https://searchsdk.dev/docs). Source:
[github.com/Belweave/searchSDK](https://github.com/Belweave/searchSDK/tree/main/sdk/typescript).
A Python runtime with the same behaviour is in
[`sdk/python`](https://github.com/Belweave/searchSDK/tree/main/sdk/python).

## Providers

Brave Search (`brave`, search only), Context.dev (`context`), Exa (`exa`),
Firecrawl (`firecrawl`), Perplexity (`perplexity`), Tavily (`tavily`) and
TinyFish (`tinyfish`). Each is described in
[`registry/`](https://github.com/Belweave/searchSDK/tree/main/registry) and
embedded in this package; every endpoint is unverified against its live API
today. Provider names are trademarks of their owners; searchSDK is not
affiliated with any provider.

## Use

```ts
import { search } from "@searchsdk/sdk";

const { results, cost } = await search("sqlite wal mode", { provider: "exa" });
console.log(results[0]?.title, results[0]?.publishedAt, cost.usd);
```

Keys come from each provider's documented variable (`EXA_API_KEY`,
`BRAVE_API_KEY`, `PERPLEXITY_API_KEY` and so on) or from
`createClient({ keys })`. Every current spec sends them in headers; none is
logged. A fallback without a key is skipped with a warning.

```ts
import { createClient } from "@searchsdk/sdk";

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
`SearchError` with a fixed `code` (see Errors). Retries and fallback are off unless set.

Provider behaviour lives in `../../registry`, not in this package. The
exported `registry` is frozen; pass edited copies as
`createClient({ registry })`, which validates them and takes their ids as
provider ids, with no casts. `costBound` gives the most one request can cost,
`listPrice` its computed price, and `urlKey` the URL matching rule.

## Errors

Every failure is a `SearchError` with one of these codes, the `provider`,
the HTTP `status` when one arrived, and `attempts`. Retries happen only when
`maxRetries` is set; fallback only through `fallback`.

| `code` | What happened | Sent? | Billed | Retried | Falls back |
| --- | --- | --- | --- | --- | --- |
| `invalid_request` | an input or option failed validation | no | no | no | no |
| `configuration` | missing or unusable key, unknown provider, bad client setting | no | no | no | no |
| `unsupported` | the provider cannot express this request | no (skipped) | no | no | yes |
| `auth` | 401 | yes | no | no | no |
| `forbidden` | 403 | yes | no | no | no |
| `quota` | 402, or a provider's out-of-credits signal | yes | no | no | yes |
| `rate_limit` | 429 (`Retry-After` honoured) | yes | no | yes | yes |
| `unavailable` | 5xx or 408 | yes | no | yes | yes |
| `provider_error` | any other 4xx | yes | no | no | no |
| `network` | no answer: connection failed or broke off | yes | possible | yes | yes |
| `attempt_timeout` | the attempt's own deadline passed | yes | possible | yes | yes |
| `timeout` | the call's deadline passed | yes | possible | no | no |
| `aborted` | the caller cancelled | if under way | possible if under way | no | no |
| `invalid_response` | a 2xx that is not a UTF-8 JSON object, or an unmapped status (3xx) | yes | yes for a 2xx | no | no |
| `spec_mismatch` | a 2xx JSON object without the list the spec reads; `path` names it | yes | yes | no | no |
| `response_too_large` | a 2xx over the size limit | yes | yes | no | no |

An empty result list is a success (`results: []`), never an error. A
`spec_mismatch` means our spec and the provider's body disagree, not that the
provider found nothing; its `raw` holds the body. Rows without a URL are
dropped with an `invalid_rows_dropped` warning. A 2xx is billed even when it
cannot be read, so it is never retried.

## Diagnostics

`createClient({ diagnostics: (event) => ... })` is an opt-in hook for smoke
checks and spec debugging. It is called once per sent attempt with:

- `index`, `kind` and a copy of the `attempt` (status, timing, billed, cost);
- `request`: method, URL, headers and body as sent, with the key replaced by
  `[redacted]`;
- `response` (`null` when no status arrived): status, headers (`set-cookie`
  dropped), the raw body as text (key redacted, at most 64 KiB, cut on a
  character boundary), `bodyBytes` and `bodyTruncated`;
- `paths`: for a 2xx JSON object, how each spec path resolved
  (`{ role, path, found, missing }`), so a smoke check can tell an empty answer
  from a field the spec reads in the wrong place.

The hook cannot change the call; anything it throws is ignored. Exact rules:
`registry/policy.md`, Diagnostics.

## Development

```sh
npm ci
npm test   # registry sync check, typecheck (with and without Node types), all tests
npm pack --ignore-scripts=false   # builds dist first; .npmrc disables lifecycle scripts
```

Tests run every vector in `registry/conformance` with an injected fetch,
plus one local loopback test of the real fetch. Every test file installs a
guard that fails any other network use.

## License

[MIT](https://github.com/Belweave/searchSDK/blob/main/LICENSE). Provider
services, their content and their terms remain the providers' own.
