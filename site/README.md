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

Checks that the site's copies of `../brand` are current, typechecks, typechecks every TypeScript example (docs code blocks and `content/examples/*.ts`) against `../sdk/typescript/src` (`npm run check:examples` alone), scans for colours, fonts and durations outside the token files and for the brand's mechanical "never" rules (no redefined brand token, no blended brand colours, no effects on the mark, no provider hue as decoration, the name spelt `searchSDK`), builds, serves on a free local port and crawls every page. The crawl fails on broken links, missing titles or descriptions, word caps (home 150, hero 30, docs page 300, outside code and navigation), sample data without its "Results pending" label, pending placeholder data that differs between providers, provider logos that are not this site's SVGs with a reserved box, alt text and a recorded source or that stand taller than searchSDK's mark, the name written any other way, a missing or undersized lockup, a mark path or fill not in the brand files, more than one apricot primary key in a section, and missing icons, manifest or social images. Rules: `checks/config.mjs`. No provider call, no network beyond localhost.

While the dev server runs, build the check elsewhere so it never touches `.next/`:
`NEXT_DIST_DIR=.cache/next-check npm run check` (Next adds that directory to `tsconfig.json`; do not commit that line).

## Look

The identity is `../brand` (read `brand/GUIDELINES.md`; its rules bind the site). `checks/brand.mjs` copies the brand's own files into the site byte for byte: `styles/brand.css` (from `brand/tokens.site.css`), the two faces in `assets/fonts/`, the lockup, mark and loader SVGs in `assets/brand/`, and the favicon family, app icons and social cards in `app/` and `public/brand/`. `npm run dev` and `npm run build` refresh them (`npm run brand:sync` alone); `npm run check` fails on a stale, missing or stray copy. Change the brand in `brand/`, then rebuild; never edit a copy. `public/brand/github-social.png` is the repository's social preview, uploaded in the GitHub settings.

`styles/tokens.css` holds only what the brand leaves to the site: provider hues, the band strip (`--spectrum`, the mark's three colours at hard edges), glow, the backdrop and the depth of keys, slabs and the stage. It never redefines a brand token. Dark first, light supported. Apricot is the one primary action per section, violet is selection, focus is cyan on dark and violet on light. Keys have walls and travel when pressed; panels are slabs; code and tracks are wells.

searchSDK's mark and lockup render only through `components/brand/searchsdk.tsx`, which inlines the brand's SVGs, enforces the minimum sizes and plays the header's one-time intro. Script motion uses `lib/motion.ts`: loops run only while visible and the tab is shown, and every animated piece has a reduced-motion still.

## Provider logos

`public/providers/<id>/` holds each provider's own files, unmodified, named `mark-on-dark.svg`, `mark-on-light.svg`, `logo-on-dark.svg` and `logo-on-light.svg`; `SOURCES.md` records where each came from and the provider's usage rules. `lib/provider-assets.ts` reads them at build time; a provider with no files shows a monogram, so a new registry spec never breaks the build. Render logos only through `components/brand/provider-mark.tsx`, never taller than searchSDK's header mark. Provider hues are tokens named `--hue-<id>`, derived from each brand colour; they identify a provider beside its logo and name and never decorate.

## Home page

The stage (`components/home/stage/`) plays a scripted, deterministic story: state is a pure function of time (`story.ts`), so play, pause, scrub and replay are one operation. The code it shows is `content/examples/stage.ts` with the visitor's query and providers substituted. Below it: `switch.tsx`, `board.tsx`, `receipt.tsx` and `spec-feed.tsx`. The switch and spec feed read the registry; the stage timings and the leaderboard are placeholder data; the receipt uses example providers ("Provider A" to "D") and one placeholder price, so no real provider is shown failing.

## Data

Providers come from the registry: `lib/registry.ts` reads `../registry/providers/*.json` at build time and is the only module that does. A new spec is a new provider on every page. The site therefore builds from a full checkout of the repository, not from `site/` alone.

Placeholders, labelled "Results pending" on every page: `data/*.sample.json` (race and benchmark numbers, keyed by provider id). Each has one loader in `lib/`. Render sample data only through `DataRegion`. While a file says `"pending": true`, every provider has identical values (the check enforces it), providers are listed alphabetically and tied, and the site prints "–" instead of any per-provider figure or rank; bars and lanes still animate, in lockstep. The first published run replaces the files.

Home page code lives in `content/examples/` so the check can typecheck it.

## Stubs

`/api/mcp` and `/api/playground/search` answer 501.
