# Working on searchSDK

searchSDK is a family of server and application search SDKs with a statically
rendered documentation site, a bounded server-side playground endpoint, and a
public read-only documentation MCP endpoint. Keep SDKs independent of the website.
The TypeScript SDK must remain free of runtime dependencies; other packages must
document their runtime and transport dependencies.

## Development

- Use the Node version in `.nvmrc` and `npm ci`.
- `npm run dev` serves the site on port 5173.
- `npm run check` validates TypeScript/mobile JavaScript, the website, docs and npm consumers.
- Follow each `packages/*/README.md` for its native builds and consumer checks.
  `.github/workflows/sdk-variants.yml` defines the separate language/platform matrix.
- `npm run build:vercel` produces the checked site and both server functions.
- `npm run release:prepare` checks and packs the SDK locally; it does not publish.
- Prefer bounded local builds. Coordinate shared output when working in parallel;
  use isolated output directories for independent tests.

## Product contracts

- Server SDKs call providers directly. App SDKs call an application-owned,
  authenticated HTTPS gateway; never ship provider credentials to an app.
- Publish explicit per-language capabilities, runtime limits and source-alpha
  installation instructions. A local package identity does not prove registry availability.
- Regenerate `sdk-contract/` through `scripts/generate-sdk-contract.mjs`; preserve
  shared fixtures without implying identical policy APIs in every language.

- Keep provider capabilities explicit. Normalized search adapters and native
  endpoint clients are different surfaces; document the supported subset.
- Native clients are generated from retained source tables and public schemas in
  `scripts/providers-a` and `scripts/providers-b`. Preserve reproducibility and
  source attribution.
- Keep provider calls server-side. The live playground accepts request-scoped
  visitor keys; never persist or log them. The separate key-free demo and
  automated tests use deterministic fixtures. Do not describe fixture coverage
  as live provider verification.
- Preserve cancellation, deadlines, response limits, provenance and explicit
  fallback. Do not promise exactly-once remote side effects.
- Benchmarks require an explicit live opt-in. Tests and CI must never incur
  provider charges or create remote infrastructure.
- The public MCP server serves generated documentation only. Keep keys, provider
  execution, arbitrary URLs, and code execution outside that endpoint.

## Public repository hygiene

- Commit product source, public documentation, synthetic fixtures and required
  notices. Keep local reports and scratch work in `.local/`.
- Never commit credentials, personal data, private infrastructure configuration
  or internal planning. Check staged changes before committing.
- Preserve third-party copyright notices, font licenses and provider trademarks.
- The website and repository are independently deployed. A Git push does not
  deploy the site or publish the npm package.
- Synchronize reviewed work through deliberate commits and pushes. Never
  force-push, delete remote history or change visibility during routine work.
