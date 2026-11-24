# searchSDK site

The website and docs. A standalone npm package; Node from the repo's `.nvmrc`.

## Run

```sh
cd site
npm ci
npm run dev        # http://localhost:3210
```

## Check

```sh
npm run check
```

Typechecks, typechecks every TypeScript example (docs code blocks and `content/examples/*.ts`) against `../sdk/typescript/src` (`npm run check:examples` alone), scans for colours, fonts and durations outside the token file, builds, serves on a free local port and crawls every page. It fails on broken links, missing titles or descriptions, word caps (home 150, hero 30, docs page 300, outside code and navigation), and sample data without its label. Rules: `checks/config.mjs`. No provider call, no network beyond localhost.

## Tokens

Every colour, type, space, radius and motion value: `styles/tokens.css`. Fonts: `assets/fonts/` (OFL, see its README). To change the identity, change those only. Script motion uses `lib/motion.ts`.

## Data

Providers come from the registry: `lib/registry.ts` reads `../registry/providers/*.json` at build time and is the only module that does. A new spec is a new provider on every page. The site therefore builds from a full checkout of the repository, not from `site/` alone.

Placeholders, labelled on every page: `data/*.sample.json` (race and benchmark numbers, keyed by provider id). Each has one loader in `lib/`. Render sample data only through `DataRegion`.

Home page code lives in `content/examples/` so the check can typecheck it.

## Stubs

`/api/mcp` and `/api/playground/search` answer 501.
