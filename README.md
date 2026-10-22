<p align="center">
  <a href="https://searchsdk.dev">
    <img src="apps/web/public/social/searchsdk-card-v2.jpg" alt="searchSDK — web search for TypeScript apps" width="960" />
  </a>
</p>

<h1 align="center">searchSDK</h1>

<p align="center">
  Typed search across providers. Explicit fallback. Sources you can trace.<br />
  Built by <a href="https://belweave.com">Belweave</a>.
</p>

<p align="center">
  <a href="https://github.com/Belweave/searchSDK/actions/workflows/ci.yml"><img src="https://github.com/Belweave/searchSDK/actions/workflows/ci.yml/badge.svg?branch=main" alt="CI workflow status" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License: MIT" /></a>
  <a href="packages/sdk/package.json"><img src="https://img.shields.io/badge/status-alpha-orange.svg" alt="Status: alpha" /></a>
  <a href="https://github.com/Belweave/searchSDK/commits/main/"><img src="https://img.shields.io/github/last-commit/Belweave/searchSDK/main" alt="Latest GitHub commit" /></a>
</p>

<p align="center">
  <a href="https://searchsdk.dev/docs">Documentation</a> ·
  <a href="https://searchsdk.dev/playground">Try the playground</a> ·
  <a href="packages/sdk/README.md">SDK reference</a> ·
  <a href="CONTRIBUTING.md">Contribute</a>
</p>

searchSDK gives server-side TypeScript apps one web-search contract while keeping
provider choice visible. Use normalized results for retrieval, provider-native
clients for specialized operations, and deterministic mocks for local development.
The SDK is ESM with TypeScript declarations and zero runtime dependencies.

**Alpha `0.1.0-alpha.0`.** APIs may change before a stable release. Use the
`alpha` channel and commit your package lockfile to keep the resolved version.

## Install

Use Node 24.22.1 or a newer patched Node 24 release. In your server application:

```sh
npm install @belweave/search-sdk@alpha
```

For a new application, run `npm init --yes` first. No compiler or additional
runtime dependency is needed for the `.mjs` examples below.

## Start without API keys

Save this as `example.mjs`, then run `node example.mjs`:

```js
import { createSearch } from '@belweave/search-sdk';
import { createMockProvider } from '@belweave/search-sdk/testing';

const search = createSearch({ provider: createMockProvider() });
const response = await search.web.search({ query: 'SQLite write concurrency', limit: 3 });

console.log(response.results);
console.log(response.attempts);
```

The mock returns deterministic local fixtures and makes no provider requests.
The [hosted playground](https://searchsdk.dev/playground) offers a separate
**Demo · no key** mode and live server-side searches with your own provider key.
The [Boat recipe](https://searchsdk.dev/docs/guides/boat) runs the same SDK in a
sandbox you control.

## Search from your server

Add `.env` to your server project's `.gitignore`. In that local file, set
`CONTEXT_API_KEY=your-provider-key` using your own provider account. Save this
example as `search.mjs`:

```js
import { createSearch } from '@belweave/search-sdk';
import { context } from '@belweave/search-sdk/context';

const apiKey = process.env.CONTEXT_API_KEY;
if (!apiKey) throw new Error('CONTEXT_API_KEY is required');

const search = createSearch({
  provider: context({ apiKey }),
  timeoutMs: 10_000,
});
const response = await search.web.search(
  { query: 'SQLite write concurrency', limit: 5 },
  { signal: AbortSignal.timeout(10_000) },
);
console.log(response.provider, response.results, response.attempts);
```

Run `node --env-file=.env search.mjs` locally. In production, inject
`CONTEXT_API_KEY` through your host's server secret configuration and run
`node search.mjs`. Node or your host loads the environment; the SDK takes the key
explicitly. Keep it out of browser code, public environment variables, and logs.
A live request can incur provider charges.

For explicit fallback, import `tinyfish` from `@belweave/search-sdk/tinyfish`,
configure its server-side key, and add `fallback: [tinyfish({ apiKey: tinyfishKey })]`
to `createSearch`. Set `attemptTimeoutMs: 4_000` with the ten-second total budget
to reserve time for another provider. See the
[fallback guide](https://searchsdk.dev/docs/reliability/fallback).

## Search a batch

```ts
const outcomes = await search.web.searchBatch([
  { query: 'SQLite write concurrency', limit: 3 },
  { query: 'PostgreSQL transaction isolation', limit: 3 },
], { concurrency: 4, timeoutMs: 10_000 });

for (const outcome of outcomes) {
  if (outcome.status === 'fulfilled') console.log(outcome.index, outcome.value.results);
  else console.error(outcome.index, outcome.error.code);
}
```

Outcomes keep input order, and an individual failure preserves successful sibling
results. Worker concurrency is bounded; a shared deadline or `signal` also stops
queued items. Each dispatched search retains the client's provider and policies.
See the [batch search guide](docs/batch-search.md) for cancellation and outcome handling.

## What you control

- **Provider choice.** Fallback is explicit. Authentication failures, invalid
  responses, and empty results do not silently route to another provider.
- **Reliability policies.** Retries, bounded concurrency, caching, and in-flight
  deduplication are configurable; retries, caching, and sharing are opt-in.
- **Traceable results.** Source URLs, provider attribution, retrieval timestamps,
  and attempt traces stay attached. Scores retain each provider's native scale.
- **Native capabilities.** Thirteen native clients preserve documented operations
  and fields, including extraction, research, streaming, and job management where
  the provider exposes them.
- **Resumable work.** Durable checkpoints retain remote job IDs. Ambiguous
  submissions require reconciliation; remote effects have no exactly-once guarantee.
- **Key-free tests.** Inject transports or use deterministic mocks. Fixtures and
  declaration checks validate SDK contracts, not live account access or billing.

## Providers

Fifteen providers are represented: fourteen normalized web-search adapters and
thirteen provider-native clients. Provider access, filter support, and result
limits differ; consult the [provider reference](https://searchsdk.dev/docs/providers).

| Provider | Normalized web search | Provider-native client |
| --- | :---: | :---: |
| Context.dev | ✓ | ✓ |
| TinyFish | ✓ | ✓ |
| Exa | ✓ | ✓ |
| Tavily | ✓ | ✓ |
| Brave | ✓ | ✓ |
| Perplexity | ✓ | ✓ |
| Parallel | ✓ | ✓ |
| Linkup | ✓ | ✓ |
| Firecrawl | ✓ | ✓ |
| You.com | ✓ | ✓ |
| Serper | ✓ | ✓ |
| SerpAPI | ✓ | ✓ |
| Valyu | ✓ | — |
| SearXNG | ✓ | — |
| WonderSearch.ai / .com | — | ✓ |

WonderSearch searches a corpus through its native client. SearXNG connects to an
operator-selected instance with JSON search enabled. Valyu and SearXNG currently
provide normalized adapters only.

Authenticated live-provider validation and comparative benchmarks are pending.
The fixture demo does not establish provider performance, availability, or
account-gated behavior. A live playground request verifies only that particular
request, not a comparative benchmark.

## Find your next step

- [SDK quickstart and policies](packages/sdk/README.md): installation, fallback,
  native clients, cancellation, and durable operations.
- [Online documentation](https://searchsdk.dev/docs): request contracts, provider
  limits, and guides.
- [Contributing](CONTRIBUTING.md): local checks and reproducible provider changes.
- [Security policy](SECURITY.md): private reporting and integration boundaries.

The repository contains the SDK in `packages/sdk` and the static React/Vite docs
and server-backed playground in `apps/web`. Run `npm run check` for SDK tests, type
checks, static-site checks, and packed-consumer verification. The CI workflow runs
these checks without provider credentials. It does not publish packages or deploy.

## Optional: build from source

For contributions or unreleased changes, use Node from [.nvmrc](.nvmrc):

```sh
git clone https://github.com/Belweave/searchSDK.git
cd searchSDK
nvm use
npm ci
npm run build:sdk
npm pack -w @belweave/search-sdk
```

Install the generated tarball in your server application with
`npm install /path/to/belweave-search-sdk-0.1.0-alpha.0.tgz`. Run `npm run dev`
from the checkout to serve the site locally. See [Contributing](CONTRIBUTING.md)
for checks; building, pushing, website deployment, and package publication are
separate operations.

## License

[MIT](LICENSE). Provider services, credentials, content, and third-party assets
remain subject to their respective terms and licenses.
