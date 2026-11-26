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

Checks that the site's copies of `../brand` are current, runs the analytics unit tests, typechecks, typechecks every TypeScript example (docs code blocks and `content/examples/*.ts`) against `../sdk/typescript/src` (`npm run check:examples` alone), scans for colours, fonts and durations outside the token files and for the brand's mechanical "never" rules (no redefined brand token, no blended brand colours, no effects on the mark, no provider hue as decoration, the name spelt `searchSDK`), builds, serves on a free local port and crawls every page. The crawl fails on broken links, missing titles or descriptions, word caps (home 150, hero 30, docs page 300, outside code and navigation), sample data without its "Results pending" label, pending placeholder data that differs between providers, provider logos that are not this site's SVGs with a reserved box, alt text and a recorded source or that stand taller than searchSDK's mark, the name written any other way, analytics that is not first party (a PostHog host named in a page, a CSP allowing another origin for scripts or connections, `robots.txt` not disallowing `/ingest/`), a missing or undersized lockup, a mark path or fill not in the brand files, more than one apricot primary key in a section, and missing icons, manifest or social images. Rules: `checks/config.mjs`. No provider call, no network beyond localhost (the crawl never requests `/ingest/`, and server capture is off outside Vercel production).

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

## Search and agents

Every page's title, description, canonical URL and social tags come from `lib/seo.ts`; facts shared by pages, JSON-LD and `llms.txt` live in `lib/site.ts`. `lib/structured-data.tsx` writes schema.org JSON-LD from those facts: Organization, WebSite and SoftwareSourceCode on every page, TechArticle and BreadcrumbList on docs pages, FAQPage only on a docs page with `faq: true` whose `## …?` headings are its questions. Never add ratings, reviews, offers or usage figures. Docs frontmatter may set `metaTitle` for the `<title>`.

Each docs and provider page has a Markdown copy at the same path plus `.md` (`lib/markdown.ts`, rewritten in `next.config.ts`), linked from its `<head>`; `/llms.txt` indexes them and `/llms-full.txt` holds every docs page. `app/robots.ts` names the search and AI crawlers it allows. The sitemap's `lastmod` is the latest commit to a page's sources (`lib/last-modified.ts`). The crawl also fails on a wrong canonical, JSON-LD that does not parse or lacks a page's types, a FAQ question that is not a heading, and a missing Markdown copy.

## Analytics

The website measures itself with PostHog (project "searchSDK", US cloud); `content/docs/privacy.mdx` says what is measured. The SDK packages contain no analytics and must never gain any: nothing under `sdk/` or `packages/` imports from here.

- **Browser** (`lib/analytics/client.ts`, started by `instrumentation-client.ts`): posthog-js in cookieless mode (`cookieless_mode: "always"`: no cookie, local or session storage, so no consent banner), pageviews and pageleaves on App Router navigations, web vitals, click and submit autocapture with input value capture off, no session replay, surveys or feature flags. URLs lose their query string and hash in `before_send`. A browser with Do Not Track or Global Privacy Control never loads posthog-js. posthog-js is a lazy chunk loaded when the browser is idle after `load`; events tracked earlier are queued. Only the hostnames in `NEXT_PUBLIC_ANALYTICS_HOSTS` send, so local runs and preview URLs send nothing.
- **Proxy**: the browser talks only to `/ingest` on this origin. `next.config.ts` rewrites `/ingest/static/*` and `/ingest/array/*` to the assets host and `/ingest/*` to the ingest host, as PostHog documents, with `skipTrailingSlashRedirect` (PostHog paths end in `/`) and a redirect that restores Next's trailing-slash redirect for every other path. The CSP stays `'self'`; `robots.txt` disallows `/ingest/`.
- **Server** (`lib/analytics/server.ts`): `captureServer(event, props, request)` sends one anonymous event after the response (`after()`, or Proxy's `waitUntil`) to PostHog's `/batch/` endpoint: a random distinct id, `$process_person_profile: false`, GeoIP off, and only the path, method, user-agent family and kind (`lib/analytics/ua.ts`), referrer host and Vercel's country header. Never the IP, user-agent string, query, body or tool arguments. `proxy.ts` uses it for the prerendered machine-readable documents (no route handler runs for them); it skips the site's own fetches (Next's `<Link>` prefetches). It sends only on Vercel production (`VERCEL_ENV=production`) or with `ANALYTICS_SERVER_SEND=1`.
- **Package statistics** (`app/api/cron/package-stats`, `lib/analytics/package-stats.ts`): a daily Vercel Cron (`vercel.json`) reads npm's public download counts (range and point endpoints) for `@searchsdk/sdk` and `@searchsdk/mcp` (skipped while npm answers 404, as it does for a package too new to have counts) and GitHub's public repository and release asset counts, and sends them as events with `distinct_id: "package-stats"`. Each run backfills 30 days; every event's `uuid` (UUID v5) and `timestamp` derive from the event, package or repository and UTC day, so a rerun replaces a day's figure instead of adding one. Vercel calls it with `Authorization: Bearer $CRON_SECRET`; anything else gets 401. `?dry=1` returns the events without sending. Crons run on production deployments only; `vercel build` writes them to `.vercel/output/config.json`, so `vercel deploy --prebuilt` registers them too.

Configuration (`lib/analytics/config.ts`; the committed defaults are the production values, and the project key is public by design):

| Variable | Default | |
| --- | --- | --- |
| `NEXT_PUBLIC_POSTHOG_KEY` | `phc_qY5Y…MDq` | project API key (write-only) |
| `NEXT_PUBLIC_POSTHOG_HOST` | `https://us.i.posthog.com` | ingest host: rewrites and server capture |
| `NEXT_PUBLIC_POSTHOG_UI_HOST` | `https://us.posthog.com` | the PostHog app |
| `NEXT_PUBLIC_ANALYTICS` | `on` | `off`, or `debug`: log events to the console and server log, send nothing |
| `NEXT_PUBLIC_ANALYTICS_HOSTS` | `searchsdk.dev` | comma-separated hostnames the browser sends from |
| `ANALYTICS_SERVER_SEND` | unset | `1` sends server events outside Vercel production |
| `ANALYTICS_DEBUG` | unset | `1` logs server events instead of sending (runtime; no rebuild) |
| `CRON_SECRET` | unset | required by the cron route; set it in the Vercel project |

`NEXT_PUBLIC_*` values are inlined at build time. To see server capture locally: `npm run build && ANALYTICS_DEBUG=1 npm start`, then `curl -A GPTBot localhost:3210/llms.txt`; each event is logged as `[analytics] …`. Tests: `npm test` (UA families, classifiers, stats mapping, deterministic ids); `npm run check` runs them first.

### Events

Names are stable snake_case and typed in `lib/analytics/events.ts`; renaming one breaks the insights built on it. Every browser event also carries PostHog's own properties (`$current_url` without query, `$pathname`, `$referrer`, browser, device, UTM parameters).

| Event | Fired | Properties |
| --- | --- | --- |
| `$pageview`, `$pageleave`, `$web_vitals`, `$autocapture` | posthog-js, every page | PostHog's |
| `install_command_copied` | copy button or selection copy of a code block whose first line installs a package | `page`, `manager` (npm, pnpm, yarn, bun, pip, other), `method` (button, selection) |
| `code_copied` | any other code block copied | `page`, `block_index` (0-based, page order of `<pre>`), `method` |
| `markdown_copied` | element with `data-track="markdown_copied"` clicked | `page` |
| `open_in_agent` | element with `data-track="open_in_agent" data-track-destination="…"` clicked | `page`, `destination` |
| `agent_prompt_copied` | home page "Set up with your agent" key | `page` |
| `outbound_click` | a link to another origin | `page`, `host` (hostname only), `target` (github, npm, provider_docs, other; `data-track-target` overrides) |
| `docs_search` | 1 s after typing stops in Fumadocs' search input, `input[type=search]` or `[data-track-search]`, or `trackDocsSearch(query, count)` | `page`, `query_length`, `result_count` (null when unknown). Never the text |
| `provider_viewed` | a `/providers/<id>` page shown (load or navigation) | `page`, `provider` |
| `benchmarks_viewed` | `/benchmarks` shown | `page` |
| `page_not_found` | the 404 page shown (`components/analytics/track-not-found.tsx`) | `page`, `referrer_host` |
| `machine_doc_fetched` | server: `/llms.txt`, `/llms-full.txt`, `/docs.md`, `/docs/*.md`, `/providers/*.md`, `/sitemap.xml`, `/robots.txt` (`proxy.ts`) | `resource` (llms_txt, llms_full_txt, markdown, sitemap, robots), `path`, `method`, `ua_family`, `ua_kind`, `referrer_host`, `country` |
| `mcp_request` | server: for the MCP route to call | `method`, `tool` (name only) and the request properties above |
| `npm_downloads` | cron, one per package and UTC day | `package`, `day`, `downloads` |
| `npm_downloads_summary` | cron, one per package per run day | `package`, `day`, `last_week`, `last_month` |
| `github_repo_stats` | cron, one per run day | `repo`, `day`, `stars`, `forks`, `watchers`, `open_issues`, `release_downloads` |
| `github_release_downloads` | cron, one per release asset per run day | `repo`, `day`, `tag`, `asset`, `downloads` (cumulative) |

`ua_kind` is one of `ai_crawler` (GPTBot, ClaudeBot, CCBot …), `ai_search` (OAI-SearchBot, Claude-SearchBot, PerplexityBot, ExaSearchBot …), `ai_agent` (ChatGPT-User, Claude-User, Perplexity-User …), `search_crawler` (Googlebot, Bingbot, Applebot …), `link_preview`, `bot`, `tool` (curl, Node, Python …), `headless`, `browser` or `unknown`.

Wiring a new UI: prefer attributes, `<button data-track="open_in_agent" data-track-destination="claude">`, which `lib/analytics/listeners.ts` picks up; otherwise call `track(name, props)` from `lib/analytics/client.ts`. A new event name goes in `lib/analytics/events.ts` (and `DATA_EVENTS` in the listeners for attribute use) and in the table above. On the server, `captureServer("mcp_request", { method, tool }, request)` from a route handler.

## Stubs

`/api/mcp` and `/api/playground/search` answer 501.
