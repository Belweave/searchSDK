# Contributing to searchSDK

Thanks for helping. Start with an issue describing a bug, a provider change,
or the outcome you want. For security issues, follow [SECURITY.md](SECURITY.md)
instead.

## Set up

Use the Node version pinned in [.nvmrc](.nvmrc) and Python 3.10 or newer.
Each package has its own lockfile and installs on its own:

| Path | What | Install | Check |
| --- | --- | --- | --- |
| `sdk/typescript/` | `@searchsdk/sdk` | `npm ci` | `npm test` |
| `sdk/python/` | `searchsdk` | `python -m pip install -r requirements-dev.txt` (mypy) | `python scripts/check.py` |
| `bench/` | benchmark harness | `npm ci` | `npm run check` |
| `site/` | searchsdk.dev | `npm ci` | `npm run check` (build and crawl) |
| `brand/` | brand sources and exports | `npm ci` | `npm run check` |

From the repository root, `npm run setup` installs the four npm packages and
`npm run check` runs every check CI runs, including the public-tree guard and
the registry drift checks. Run checks one package at a time to keep builds
bounded. None of them needs a provider key or calls a provider.

## Change a provider

Provider behaviour lives in [`registry/`](registry/README.md), not in the
runtimes. To add or change a provider:

- Edit `registry/providers/<id>.json` and its vectors in
  `registry/conformance/providers/<id>.json`. Follow the rules in
  [`registry/README.md`](registry/README.md); exact semantics are in
  `registry/steps.md` and `registry/policy.md`.
- Link the official API documentation behind every fact and record its
  retrieval date. List anything unclear under `unverified`. Leave options the
  provider cannot honour out of the spec.
- Write `null` for a price that is not public; never `0`.
- Use synthetic response bodies only. Never commit real account responses,
  credentials or private queries.
- Re-embed the registry and regenerate the README table, then commit them:

  ```sh
  (cd sdk/typescript && npm run sync)
  (cd sdk/python && python scripts/sync_registry.py)
  node scripts/readme-providers.mjs
  ```

- Keep the endpoint at `"verification": { "status": "unverified" }`. Passing
  fixtures is not live verification.

Logic that no named step or format feature offers needs a general addition
to every runtime, with conformance vectors, not provider-specific code.

## Live calls and benchmarks

Ordinary tests, checks and CI never call providers, never need keys, and
never incur charges. Tests install a guard that fails on network use beyond
loopback. A live benchmark or smoke run needs `--live`, `BENCH_ALLOW_LIVE=1`
and `--confirm-spend`, refuses to run under CI, and must state its scope and
its cost. Keep keys and raw outputs in `.local/`, never in the repository.
See [`bench/README.md`](bench/README.md).

## Submit a focused pull request

Explain the problem, the resulting behaviour and the checks you ran. Note
public API changes and limitations, and link official provider references for
changed specs. Keep unrelated refactors separate. Do not include build output,
local reports, secrets or personal environment details.

CI uses read-only repository permissions and no provider secrets. Changes to
CI must keep actions pinned to full commit SHAs and must not add automatic
publication, deployment or privileged execution of fork contributions.
Releases are manual; see [docs/releasing.md](docs/releasing.md).

Contributions are licensed under the repository's [MIT license](LICENSE). Be
respectful of other contributors; see the
[community guidelines](.github/CODE_OF_CONDUCT.md).
