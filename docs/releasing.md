# Releasing

Three things ship from this repository, each by hand. A Git push publishes
nothing and deploys nothing, and CI never publishes or deploys.

| What | Where | How |
| --- | --- | --- |
| TypeScript SDK | npm, [`@searchsdk/sdk`](https://www.npmjs.com/package/@searchsdk/sdk) | a reviewed tarball, published from `sdk/typescript` |
| Python SDK | not published yet | install from source (see `sdk/python/README.md`) |
| Website | [searchsdk.dev](https://searchsdk.dev), on Vercel | a prebuilt deploy from `site/` |

Use the Node version in `.nvmrc`. Sign in to npm and Vercel in a browser.
Never paste a password, token, recovery code or one-time code into a file,
commit, issue or chat, and never commit an `.npmrc` with an auth token or the
`site/.vercel/` link directory.

## Before any release

From the repository root, with every package installed (`npm run setup`):

```sh
npm run check
```

This runs the public-tree guard, the registry drift checks, and the brand,
TypeScript, Python, benchmark-fixture and site checks. The Python check needs
mypy (`python -m pip install -r sdk/python/requirements-dev.txt`). None of
it calls a provider or needs a key.

## Bump the version

Both runtimes embed `registry/`. A release ships the registry as committed,
so sync it and bump the version in the same commit:

```sh
cd sdk/typescript
npm run sync                                  # re-embed ../../registry
npm version <x.y.z> --no-git-tag-version      # package.json and package-lock.json
cd ../python
python scripts/sync_registry.py               # re-embed ../../registry
# set the same version in pyproject.toml and src/searchsdk/__init__.py (__version__)
```

Bump Python with TypeScript until the two are released separately. Add the
release to each `CHANGELOG.md`, run `npm run check` from the root again, and
commit. npm versions are immutable: a published version can never be reused,
even after `npm unpublish`.

## Publish @searchsdk/sdk

`sdk/typescript/.npmrc` disables lifecycle scripts, so the pack step turns
them back on to build `dist/` first:

```sh
cd sdk/typescript
npm ci
npm test
npm pack --ignore-scripts=false               # runs prepack (registry check + build); writes searchsdk-sdk-<x.y.z>.tgz
tar -tzf searchsdk-sdk-<x.y.z>.tgz            # expect package/dist, README.md, CHANGELOG.md, LICENSE, package.json only
shasum -a 256 searchsdk-sdk-<x.y.z>.tgz
```

Check the file list: compiled `dist/` with declarations, the README,
changelog, license and `package.json`; no `src/`, `test/`, `scripts/`, keys
or local files. Then publish that exact file:

```sh
npm login --auth-type=web --registry=https://registry.npmjs.org/
npm whoami
npm publish ./searchsdk-sdk-<x.y.z>.tgz --access public --dry-run
npm publish ./searchsdk-sdk-<x.y.z>.tgz --access public
npm view @searchsdk/sdk@<x.y.z> version dist.integrity
```

Publishing a tarball runs no scripts and uploads exactly the reviewed bytes.
`--access public` is required for a scoped package; the account must be able
to publish under the `@searchsdk` scope. Without a dist-tag the version
becomes `latest`. Afterwards, install it in an empty directory
(`npm install @searchsdk/sdk@<x.y.z>`) and import it once. Delete the local
`.tgz` (it is git-ignored). Publishing proves nothing about live providers.

Optionally tag the release commit (`git tag -a sdk-v<x.y.z>`) and push the
tag deliberately; never move or delete an existing tag.

## Deploy the site

The Vercel project is not connected to Git. The site builds from a full
checkout, because it reads `../registry`, `../sdk/typescript` and `../brand`:

```sh
cd site
npm ci
npm run check                                 # brand copies, typecheck, examples, build, crawl
vercel link                                   # once per checkout; writes the git-ignored site/.vercel/
vercel build --prod
vercel deploy --prebuilt --prod
```

`vercel build` writes `site/.vercel/output/` locally and `deploy --prebuilt`
uploads only that output, so no environment file or key leaves the machine.
Check https://searchsdk.dev afterwards. Use the Vercel CLI (`npm install
--global vercel`, or prefix each command with `npx`).
