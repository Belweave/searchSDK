# Working on searchSDK

searchSDK is a TypeScript search SDK and a statically rendered documentation
site. Keep the SDK independent of the website and free of runtime dependencies.

## Development

- Use the Node version in `.nvmrc` and `npm ci`.
- `npm run dev` serves the site on port 5173.
- `npm run check` validates the SDK, website, documentation and packaged consumer.
- `npm run build:vercel` produces the checked static deployment output.
- Prefer bounded local builds. Coordinate shared output when working in parallel;
  use isolated output directories for independent tests.

## Product contracts

- Keep provider capabilities explicit. Normalized search adapters and native
  endpoint clients are different surfaces; document the supported subset.
- Native clients are generated from retained source tables and public schemas in
  `scripts/providers-a` and `scripts/providers-b`. Preserve reproducibility and
  source attribution.
- Keep credentials server-side. Demos and automated tests use deterministic
  fixtures. Do not describe fixture coverage as live provider verification.
- Preserve cancellation, deadlines, response limits, provenance and explicit
  fallback. Do not promise exactly-once remote side effects.
- Benchmarks require an explicit live opt-in. Tests and CI must never incur
  provider charges or create remote infrastructure.

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
