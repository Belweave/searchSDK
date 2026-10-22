# Deploy the documentation site

The public site is [searchsdk.dev](https://searchsdk.dev). It serves static HTML,
JavaScript, styles, fonts and images, plus separate Node 24 server functions for
the live playground and read-only documentation MCP endpoint. Visitors supply their own provider keys for individual playground requests.
The separate **Demo · no key** mode runs deterministic fixtures in the browser.

## Build locally

```sh
nvm use
npm ci
npm run build:vercel
```

The build runs SDK, playground and MCP security tests, TypeScript checks, documentation example checks,
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

## Live playground

`POST /api/playground/search` accepts a query, a result limit, one supported
provider and its key, and optionally one distinct fallback provider and key.
This is a bounded UI endpoint, not a general-purpose public search API.

- Twelve fixed-host providers are enabled. SerpAPI is excluded because its
  upstream API requires URL credentials; SearXNG requires an operator-selected
  endpoint; WonderSearch is a separate corpus client. All remain available in
  the SDK for an application with an appropriate server configuration.
- Requests have an 8 KiB body ceiling, a 500-character query ceiling, a maximum
  of ten displayed results, a 15-second total budget and a seven-second attempt
  budget. There are no automatic retries. A provider may retrieve or bill for
  more native results than the displayed limit; see its SDK reference.
- Keys stay in request memory. The application does not persist credentials,
  queries or responses, and does not log provider errors or request bodies.
  The browser clears key fields on submission and page exit. HTTP responses
  carry `no-store` headers. Provider retention and platform observability are
  separate boundaries; do not configure request-body/header logging.
- Exact origin/host checks, a custom request header, Fetch Metadata and JSON
  validation protect browser requests. These checks do not authenticate an
  arbitrary HTTP client. No caller-controlled endpoints, code or native write
  operations are accepted. Upstream redirects are rejected.
- The server bounds concurrent work, response sizes and in-memory request/key
  buckets. These guards reset on cold starts and are separate across instances;
  they are not durable global rate limits. Use deployment-level traffic and
  spending controls appropriate to your own public deployment.
- Cancellation stops local waiting and signals the upstream request. It cannot
  reverse provider work already accepted or guarantee that no charge occurred.

The function's private SDK build and server files live under
`.vercel/output/functions/api/playground/search.func/`. They are not static
assets. Its Vercel execution ceiling is 20 seconds. `npm run dev` installs the
same handler in Vite and permits only explicit loopback development origins.

Production origins are explicit in `apps/web/server/security.mjs`. Platform
`VERCEL_URL`, `VERCEL_BRANCH_URL` and `VERCEL_PROJECT_PRODUCTION_URL` values add
only exact `*.vercel.app` origins. A new custom domain requires an explicit
origin configuration change and a rebuild; caller Host headers never extend
that list. No provider credentials are needed in deployment environment variables.

Server tests inject provider responses and never use live credentials. Test
the deployed method/origin rejection, JSON content type and no-store behavior
without a key. A successful authenticated provider request requires a visitor's
own account and may incur charges; fixture tests do not establish that result.

For another host, publish `apps/web/dist`, configure equivalent static rewrites,
404 behavior and security headers, and supply both Node server endpoints. A static-only
upload cannot run live search. Keep the API same-origin with the page.

## Public documentation MCP

`POST /mcp` and its `/api/mcp` alias serve the same read-only handler. It supports
MCP version `2026-07-28`, with per-request metadata and matching protocol/method/name
headers. It does not implement the older initialization or session handshake.
The [MCP guide](https://searchsdk.dev/docs/guides/mcp) contains complete request
examples and client compatibility requirements.

The function at `.vercel/output/functions/api/mcp.func/` contains only its
protocol implementation and generated public data, with no SDK provider code
or runtime dependencies. It offers six documentation/provider/example tools,
exact resources, and the official Skills extension. It accepts no API keys,
cookies, caller-selected URLs, arbitrary files, or executable code. No provider
requests or billing can originate from this handler.

Requests are limited to 16 KiB, three seconds to read the body, five seconds
overall, and 512 KiB per response. The Vercel execution ceiling is ten seconds.
Admission allows at most 12 concurrent requests, a connection-address burst of
30 refilling at 60/minute, and an instance burst of 120 refilling at 240/minute.
At most 512 salted address buckets are held in memory. Forwarding headers are
untrusted, so reverse-proxied clients may share a bucket. These are per-instance
limits, not distributed quotas; cold starts reset them. Rejections return 429
with Retry-After where applicable.

Native clients can omit Origin. Browser origins must match the explicit
allowlist; an operator can add exact HTTPS origins through `MCP_ALLOWED_ORIGINS`
as a comma-separated value. This does not widen the accepted Host list. Invalid
configuration grants no extra access. No credentials are allowed by CORS.

The build generates `/llms.txt`, `/llms-full.txt`, canonical Markdown pages,
`/agent-index.json`, `/provider-capabilities.json`, `/mcp-public-data.json`,
`/sitemap.xml`, and `/robots.txt` from current public source. The public integration
skill is served at `/skills/searchsdk/SKILL.md`; its exact UTF-8 bytes are hashed
in the MCP manifest. These files are public documentation, not private run logs.
Privacy and terms are served at `/privacy` and `/terms`, with matching Markdown.

Verify discovery and one documentation call on both production aliases, response
MIME/cache headers, Skills integrity, and unknown-method rejection after deploy.
Do not claim support for older MCP clients based solely on a successful HTTP POST.
