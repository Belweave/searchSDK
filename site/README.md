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

Typechecks, typechecks every TypeScript example (docs code blocks and `content/examples/*.ts`) against `../sdk/typescript/src` (`npm run check:examples` alone), scans for colours, fonts and durations outside the token file, builds, serves on a free local port and crawls every page. It fails on broken links, missing titles or descriptions, word caps (home 150, hero 30, docs page 300, outside code and navigation), sample data without its label, and provider logos that are not this site's SVGs with a reserved box, alt text and a recorded source. Rules: `checks/config.mjs`. No provider call, no network beyond localhost.

While the dev server runs, build the check elsewhere so it never touches `.next/`:
`NEXT_DIST_DIR=.cache/next-check npm run check` (Next adds that directory to `tsconfig.json`; do not commit that line).

## Look

"Signal and spectrum": a night-ink field, each provider a hue that reads as light, the brand as the blend of all of them (`--spectrum`) resolving into one warm white beam (`--beam`). Dark first, light supported. Keys have walls and travel when pressed; panels are slabs; code and tracks are wells.

Every colour, type, space, radius, depth and motion value: `styles/tokens.css`. Fonts: Bricolage Grotesque and Martian Mono in `assets/fonts/` (OFL, see its README). To change the identity, change those only. Script motion uses `lib/motion.ts`: loops run only while visible and the tab is shown, and every animated piece has a reduced-motion still.

## Provider logos

`public/providers/<id>/` holds each provider's own files, unmodified, named `mark-on-dark.svg`, `mark-on-light.svg`, `logo-on-dark.svg` and `logo-on-light.svg`; `SOURCES.md` records where each came from and the provider's usage rules. `lib/provider-assets.ts` reads them at build time; a provider with no files shows a monogram, so a new registry spec never breaks the build. Render logos only through `components/brand/provider-mark.tsx`. Provider hues are tokens named `--hue-<id>`, derived from each brand colour.

## Home page

The stage (`components/home/stage/`) plays a scripted, deterministic story: state is a pure function of time (`story.ts`), so play, pause, scrub and replay are one operation. The code it shows is `content/examples/stage.ts` with the visitor's query and providers substituted. Below it: `switch.tsx`, `board.tsx`, `receipt.tsx` and `spec-feed.tsx`, each reading the registry; only the stage timings and the leaderboard are sample data.

## Data

Providers come from the registry: `lib/registry.ts` reads `../registry/providers/*.json` at build time and is the only module that does. A new spec is a new provider on every page. The site therefore builds from a full checkout of the repository, not from `site/` alone.

Placeholders, labelled on every page: `data/*.sample.json` (race and benchmark numbers, keyed by provider id). Each has one loader in `lib/`. Render sample data only through `DataRegion`.

Home page code lives in `content/examples/` so the check can typecheck it.

## Stubs

`/api/mcp` and `/api/playground/search` answer 501.
