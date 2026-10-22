# Contributing to searchSDK

Thanks for helping make search integrations easier to inspect and test. Start
with an issue describing a bug, a provider contract change, or the outcome you
want. For security issues, follow [SECURITY.md](SECURITY.md) instead.

## Set up the workspace

Use the Node version pinned in [.nvmrc](.nvmrc) and npm's committed lockfile:

```sh
nvm use
npm ci
npm run build:sdk
```

`packages/sdk` contains the ESM SDK and Node tests. `apps/web` contains the static
docs and fixture playground. `npm run dev` starts the site; use the URL printed by
Vite. Provider credentials are unnecessary for the standard development flow.

## Check your change

For SDK work, rebuild before running tests, since tests import compiled output:

```sh
npm run build:sdk
npm test -w @belweave/search-sdk
```

For documentation and site work:

```sh
npm run typecheck
npm run test:docs
```

Before submitting a pull request, run:

```sh
npm run check
```

This checks SDK tests, TypeScript, the static site, docs, and the packed package
in an isolated consumer. Run the commands sequentially to keep builds bounded.
Use `npm run build:vercel` only when you need checked static deployment output;
it includes the checks above. None of these commands requires provider keys or
runs a comparative provider benchmark.

## Change provider contracts carefully

- Link to official API documentation or a retained official schema supporting
  the change. Distinguish a documented surface from authenticated verification.
- Keep normalized search semantics explicit: native ordering and scores,
  truthful capabilities, result ceilings, provenance, and unknown usage as `null`.
- Add focused tests with injected transports and synthetic fixtures. Cover
  relevant error, cancellation, deadline, filter, and malformed-response behavior.
  Never commit real account responses, credentials, or private queries.
- Preserve generator reproducibility. Native clients and their retained sources
  live in `scripts/providers-a` and `scripts/providers-b`; follow the applicable
  directory's instructions rather than editing generated output alone.
- Update public examples and reference material when an API changes. Do not
  describe native endpoint inventories or passing fixtures as live availability.
- Leave live calls and benchmarks out of ordinary tests. Any separately agreed
  live validation must state its scope and account for possible provider charges.

## Submit a focused pull request

Explain the problem, the resulting behavior, and the checks you ran. Include a
small reproduction or screenshot when it helps review. Note relevant limitations
and any public API changes. Keep unrelated refactors separate, and do not include
generated build output, local reports, secrets, or personal environment details.

CI uses read-only repository permissions and no provider secrets. Changes to CI
must keep official actions pinned to full commit SHAs and must not add automatic
publication, deployment, or privileged execution of fork contributions.

Contributions are licensed under the repository's [MIT license](LICENSE). Be
respectful of other contributors; see the [community guidelines](.github/CODE_OF_CONDUCT.md).
