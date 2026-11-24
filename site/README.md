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

Typechecks, scans for colours, fonts and durations outside the token file, builds, serves on a free local port and crawls every page. It fails on broken links, missing titles or descriptions, word caps (home 150, hero 30, docs page 300, outside code and navigation), and sample data without its label. Rules: `checks/config.mjs`. No provider call, no network beyond localhost.

## Tokens

Every colour, type, space, radius and motion value: `styles/tokens.css`. Fonts: `assets/fonts/` (OFL, see its README). To change the identity, change those only. Script motion uses `lib/motion.ts`.

## Data

Placeholders, labelled on every page: `data/*.sample.json`. Each has one loader in `lib/`; the registry loader is `lib/registry.ts`. Render data only through `DataRegion`.

## Stubs

`/api/mcp` and `/api/playground/search` answer 501.
