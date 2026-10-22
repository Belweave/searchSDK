# Deploy the documentation site

The public site is [searchsdk.dev](https://searchsdk.dev). It serves static HTML,
JavaScript, styles, fonts and images; it does not proxy provider requests or need
provider API keys. The playground runs deterministic fixtures in the browser.

## Build locally

```sh
nvm use
npm ci
npm run build:vercel
```

The build runs SDK tests, TypeScript checks, documentation example checks,
static link/metadata checks and packed-consumer checks. It renders every known
route and exports Markdown references, a sitemap and robots rules. The result
is in `.vercel/output/`, using Vercel's Build Output API.

## Deploy to your own project

Install or invoke a current Vercel CLI, authenticate, then explicitly link the
checkout to your intended account and project:

```sh
npx vercel link
npx vercel project inspect
npx vercel deploy --prebuilt
```

Inspect the preview before deploying to production with `--prebuilt --prod`.
Keep `.vercel/`, local environment files and deployment credentials out of Git.
The repository's `.vercelignore` is designed for the prebuilt workflow; use the
local build rather than uploading the entire source tree.

The exporter applies a same-origin Content Security Policy and security headers,
serves explicit route rewrites, and returns HTTP 404 for unknown routes. Only
built site assets and explicitly exported references are published.

## Verify a release

Check the homepage, a nested documentation route, providers, playground and
benchmarks. Verify unknown paths return 404. Compare deployed assets with the
local build, and check the social-card URL returns its declared image type
without authentication. Test light, dark and system themes, keyboard navigation,
narrow layouts and documentation search.

Social metadata is rendered into initial HTML. A versioned image filename lets
you revise the card without changing already shared image bytes. Chat apps
control their own preview rendering and caches.

For other static hosts, publish `apps/web/dist` and configure equivalent route
rewrites, 404 behavior and response headers from `scripts/vercel-output.mjs`.
