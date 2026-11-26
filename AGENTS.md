# Working on searchSDK

searchSDK gives AI apps and agents one interface to many web search APIs:
two calls, `search` and `contents`, with explicit fallback, honest
per-attempt cost and a fixed error taxonomy. Provider behaviour is data in
`registry/`; the runtimes are thin and contain no provider-specific code.

## Layout

- `registry/`: provider specs, named steps (`steps.json`, `steps.md`), shared
  policy (`policy.json`, `policy.md`), the spec schema and conformance vectors.
- `sdk/typescript/`: `@searchsdk/sdk` on npm. Zero runtime dependencies.
- `sdk/python/`: `searchsdk`, standard library only. Not on PyPI yet.
- `bench/`: searchSDK Benchmarks, method in `bench/METHOD.md`.
- `site/`: searchsdk.dev (Next.js and Fumadocs). Read `site/AGENTS.md` and
  `site/README.md` before changing it.
- `brand/`: brand sources and exports. `brand/GUIDELINES.md` binds the site.
- `scripts/`: repository checks. `docs/`: an index and the release guide.

v1 is archived at tag `v1-final` and branch `v1`. Do not restore v1 paths.

## Development

- Use the Node version in `.nvmrc`. Each of `brand/`, `sdk/typescript/`,
  `bench/` and `site/` is a standalone npm package with its own lockfile;
  run `npm ci` inside it. `npm run setup` at the root installs all four.
- `npm run check` at the root runs every check CI runs: the public-tree guard,
  registry drift (both runtimes and the README table), brand, TypeScript,
  Python (needs `sdk/python/requirements-dev.txt`), benchmark fixtures and the
  site build and crawl. `.github/workflows/ci.yml` runs the same jobs.
- After changing `registry/`, run `npm run sync` in `sdk/typescript`,
  `python scripts/sync_registry.py` in `sdk/python` and
  `node scripts/readme-providers.mjs` at the root, and commit the results.
- Change the brand in `brand/`, never the site's copies.
- Prefer bounded local builds. Coordinate shared output when working in
  parallel; use isolated output directories for independent tests.
- Releasing and deploying are manual: see `docs/releasing.md`.

## Product contracts

- Describe providers in the registry, never in a runtime. Leave out options a
  provider cannot honour so runtimes report `unsupported`. Record each source
  URL and retrieval date, and list anything unclear under `unverified`.
- Every endpoint is `unverified` until its vectors pass against the live API.
  Do not describe fixture coverage as live provider verification.
- Keep cost honest: `null` when a price is unknown, never `0`. Record whether
  each attempt was billed. Retries and fallback stay opt-in and explicit.
- Preserve cancellation, deadlines, response limits and explicit fallback. Do
  not promise exactly-once remote side effects.
- Keys go in headers, are read from documented variables or passed by the
  caller, and never appear in errors, logs, diagnostics or fixtures.
- Benchmarks require an explicit live opt-in (`--live`, `BENCH_ALLOW_LIVE=1`
  and `--confirm-spend`). Tests and CI must never incur provider charges or
  create remote infrastructure. Do not publish benchmark figures before a
  reviewed run; the site labels sample data "Results pending".
- The public MCP server serves documentation and registry data only. Keep
  keys, provider execution, arbitrary URLs and code execution outside it.

## Public repository hygiene

- Commit product source, public documentation, synthetic fixtures and required
  notices. Keep local reports, keys, raw benchmark output and scratch work in
  `.local/`.
- Never commit credentials, personal data, private infrastructure
  configuration or internal planning. Check staged changes before committing;
  `node scripts/verify-public-tree.mjs` is a narrow guard, not a review.
- Preserve third-party copyright notices, font licenses and provider
  trademarks (`THIRD_PARTY_NOTICES.md`, `site/public/providers/SOURCES.md`).
- The website, the npm package and the repository are released separately. A
  Git push does not deploy the site or publish a package.
- Synchronize reviewed work through deliberate commits and pushes. Never
  force-push, delete remote history or change visibility during routine work.
