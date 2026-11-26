# searchSDK API reference (condensed)

Generated pages with every field: https://searchsdk.dev/docs/reference/options and https://searchsdk.dev/docs/reference/responses.

## Exports

`search`, `contents`, `createClient`, `costBound`, `listPrice`, `registry`, `policy`, `urlKey`, `SearchError`, and the types (`ProviderId`, `SearchOptions`, `SearchResponse`, `ContentsResponse`, `Attempt`, `Cost`, ...).

## search options

| Option | Notes |
| --- | --- |
| `provider` | Required unless the client sets one |
| `fallback` | Providers tried next, in order; `[]` turns the client's list off for one call |
| `maxResults` | 1 to 100, default 10; above a provider's limit is `unsupported` there |
| `includeDomains`, `excludeDomains` | Hostnames; must not overlap |
| `recency` | `day`, `week`, `month`, `year`; not with dates |
| `startDate`, `endDate` | Inclusive `YYYY-MM-DD`, by publication date |
| `country`, `language` | ISO 3166-1 alpha-2, ISO 639-1 |
| `depth` | `fast`, `standard`, `deep`; may change the price tier |
| `providerOptions` | `{ <id>: { ... } }`, validated per provider |
| `timeoutMs` | Whole call, default 30000, max 300000 |
| `attemptTimeoutMs` | Each attempt, default `timeoutMs` |
| `maxRetries` | 0 to 5, default 0 |
| `maxResponseBytes` | Default 10 MiB for search, 50 MiB for contents |
| `signal` | `AbortSignal` |

`contents(urls, options)` takes the call options (`provider`, `fallback`, `providerOptions`, timeouts, `maxRetries`, `maxResponseBytes`, `signal`) and 1 to 100 http(s) URLs; each provider allows fewer per call.

## Client settings

`createClient({ provider, fallback, keys, env, timeoutMs, attemptTimeoutMs, maxRetries, maxResponseBytes, fetch, diagnostics, registry })`. Settings are checked when the client is created.

## Responses

Common: `provider`, `cost`, `requestId`, `latencyMs`, `warnings`, `attempts`, `raw`. Search adds `results`; contents adds `pages`.

- Result: `url`, `title | null`, `excerpts: string[]`, `publishedAt | null`, `author | null`, `rank` (from 1), `providerFields`.
- Page: `url`, `status`, `finalUrl`, `title`, `content`, `publishedAt`, `author`, `error: { code, message } | null` (`missing` when the provider returned nothing for the URL).
- Cost: `usd | null`, `estimated`, `source` (`reported`, `reported-credits`, `computed`, `unknown`, `none`), `credits?`.
- Attempt: `provider`, `outcome` (`ok`, `error`, `skipped`), `code?`, `status?`, `startMs`, `durationMs`, `retryAfterMs?`, `billed`, `cost`.

## Budget sketch

```ts
import { costBound, registry, type ProviderId } from "@searchsdk/sdk";

const chain: ProviderId[] = ["exa", "tavily"];
let reserve = 0;
for (const id of chain) {
  const bound = costBound(registry[id], "search", { maxResults: 10 });
  if (bound.usd === null) throw new Error(`${id}: ${bound.unknownBecause}`);
  reserve += bound.usd;
}
console.log(reserve);
```
