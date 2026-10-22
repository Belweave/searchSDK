# Provider brand assets

Retrieved and visually inspected on 2026-10-22. All fifteen providers have authentic, locally served SVG artwork. These files identify integrations; they are not evidence of sponsorship, endorsement, or live API verification. WonderSearch.ai and WonderSearch.com identify the same corpus provider.

## Integration contract

Import `providerBrandAssets` from `apps/web/src/brand-assets.ts`. Keys match `provider-catalog.ts`, including `you` and `wondersearch`. Each record supplies `src`, `alt`, native `width`/`height`, an optional official `darkSrc`, and an optional `plate: "light"` hint. Public URLs start with `/brands/`.

Render the image with `object-fit: contain`, preserve its aspect ratio, and leave clear space. Use a permanent white canvas behind assets marked `plate: "light"`, including in dark mode. Use the official `darkSrc` only when the image sits on a dark canvas. Do not apply CSS brightness, invert, grayscale, or tint filters. The colored originals stay colored; monochrome brands stay monochrome. Names should remain visible beside the marks; use `alt=""` when the neighboring name already labels the same link.

The dimensions describe the SVG viewBox, so explicit width and height attributes can reserve the correct aspect ratio. They are not a recommended CSS display size. The set contains no fonts, JavaScript, remote images, or runtime CDN dependencies.

## Sources and published usage information

All URLs below were retrieved publicly without authentication. Public availability is not an open-source license. Provider trademarks remain with their owners. No license is inferred from a site's software repository or this project's license.

| Provider | Local artwork | Official source | Published usage information observed |
| --- | --- | --- | --- |
| Context.dev | `context.svg`, `context-dark.svg` | [Blue logomark](https://www.context.dev/brand-guidelines/kit/logomark/context-dev-logomark-blue.svg), [white logomark](https://www.context.dev/brand-guidelines/kit/logomark/context-dev-logomark-white.svg), linked from the [brand & press guide](https://www.context.dev/brand) | The guide permits writing about Context.dev using its supplied assets, asks that its name retain the `.dev`, and supplies original-color variants. No separate open-source artwork license observed. |
| TinyFish | `tinyfish.svg` | [TF_ICON.svg](https://www.tinyfish.ai/TF-Logos/Icon/SVG/TF_ICON.svg), linked from [TinyFish](https://www.tinyfish.ai/) | Full-color orange fish, peach body and black outlines are retained. No separate artwork license or attribution requirement found in the retrieved asset/homepage. |
| Exa | `exa.svg` | [Exa Brand Assets.zip](https://exa.ai/assets/Exa%20Brand%20Assets.zip), member `Exa Brand Assets/Logo/SVGs/Logomark/Exa Logomark Blue.svg`, linked from the [brand guide](https://exa.ai/brand) | Exa owns the trademarks. The guide prescribes clear space, original colors/proportions, and approval for co-branded materials. Archive README identifies the contents, without an open-source artwork license. This catalog use does not claim a partnership. |
| Tavily | `tavily.svg`, `tavily-dark.svg` | [Black brand mark](https://www.tavily.com/logos/tavily-mark-black.svg), [off-white brand mark](https://www.tavily.com/logos/tavily-mark-offwhite.svg), linked from the [brand guide](https://www.tavily.com/brand) | Guide specifies original proportions, icon-height clear space, and black/off-white variants. Its trademark section requires written consent outside enumerated licensed, reseller, editorial/media, and academic uses. No permission is represented as acquired by this asset collection. |
| Brave | `brave.svg` | [Original-color symbol](https://brave.com/static-assets/images/brave-logo-sans-text.svg), linked from [Brave branding assets](https://brave.com/brave-branding-assets/) | Official downloadable branding; original orange/red gradient retained. No open-source artwork license observed in the retrieved SVG/page. |
| Perplexity | `perplexity.svg` | [Official vector site icon](https://www.perplexity.ai/favicon.svg), declared by [Perplexity](https://www.perplexity.ai/) | Official black/white vector, not an enlarged bitmap favicon. No separate artwork license or attribution terms in the retrieved SVG. |
| Parallel | `parallel.svg` | [Official vector site icon](https://parallel.ai/icon.svg), declared by [Parallel](https://parallel.ai/) | Official monochrome symbol, with its original white circular canvas retained. No separate artwork license or attribution terms in the retrieved SVG/homepage. |
| Linkup | `linkup.svg` | [Official header mark](https://www.linkup.so/_next/static/immutable/media/logo-mark.0ik9azgcc90iz.svg), displayed on [Linkup](https://www.linkup.so/) | Original black symbol retained. No separate artwork license or attribution terms in the retrieved SVG/homepage. |
| Firecrawl | `firecrawl.svg` | [Brand asset archive](https://www.firecrawl.dev/brand/brand-assets.zip), member `firecrawl-logo.svg`, linked from [Press & Brand](https://www.firecrawl.dev/press-brand) | Official flame symbol and original Heat orange retained, including its source display-P3 declaration. Brand guide provides downloadable marks and instructs against stretching, recoloring, and modification. No open-source artwork license supplied in the archive. |
| You.com | `you.svg` | [You.com logo archive](https://cdn.prod.website-files.com/692099bde0f0552fdd191bc2/6a0dda13df9dab82813b7eb1_YDC%20Logo.zip), member `YDC Logo/02_Logo Mark/01_Gradient/YDC-Logomark-Gradient.svg` | The archive is linked by the [official brand guide](https://ydc-brand-guidelines.webflow.io/), itself linked by [You.com's partnerships page](https://about.you.com/partnerships). The original violet/blue gradient is retained. No separate open-source artwork license supplied with the chosen SVG. |
| Serper | `serper.svg` | [Official homepage](https://serper.dev/), inline header SVG (`viewBox="0 0 214 75"`) | Its independent first path and final circle form the pale-blue S symbol, matching the site's [180px app icon](https://serper.dev/apple-touch-icon.png). Only those existing symbol elements were extracted; their geometry, stroke and `#90CDF4` color are unchanged. No new letterform was drawn or raster traced. No separate artwork license or attribution terms found in the retrieved homepage. |
| SerpAPI | `serpapi.svg` | [Official vector site icon](https://serpapi.com/favicon.svg), declared by [SerpAPI](https://serpapi.com/) | Original violet/blue gradient retained. No separate artwork license or attribution terms in the retrieved SVG/homepage. |
| Valyu | `valyu.svg` | [Official vector site icon](https://www.valyu.ai/favicon.svg), declared by [Valyu](https://www.valyu.ai/) | Original geometry and the dark fill supplied for light surfaces retained. The supplied adaptive CSS is frozen to its light variant and displayed on a permanent white canvas. No artwork license or permission inferred. |
| SearXNG | `searxng.svg` | [Official repository vector icon](https://raw.githubusercontent.com/searxng/searxng/master/searx/static/themes/simple/img/favicon.svg), alongside the [published wordmark](https://raw.githubusercontent.com/searxng/searxng/master/searx/static/themes/simple/img/searxng.svg) | Original blue icon retained byte-for-byte; white display canvas preserves contrast. No trademark permission inferred from the software license. |
| WonderSearch | `wondersearch.svg`, `wondersearch-dark.svg` | [Light-theme vector](https://wondersearch.ai/favicon-light-theme.svg), [dark-theme vector](https://wondersearch.ai/favicon-dark-theme.svg), declared by [WonderSearch.ai](https://wondersearch.ai/) | Official brown/white variants retained. These are resolution-independent vector marks. No separate artwork license or attribution terms found in the retrieved SVG/homepage. |

No required attribution statement was present in the chosen SVG files. The source links above are retained for traceability; this does not assert blanket permission for every future use. Keep this evidence with any redistribution of the artwork.

## Sanitization and checks

XML declarations, remote SVG DTD declarations, editor metadata and comments were removed where present. Drawing paths, fills, gradients, viewBoxes and internal clipping references were retained. All eighteen files were parsed as XML and checked for scripts, event attributes, foreign objects, embedded images, animation, external hrefs, external CSS URLs, `@import`, and JavaScript URLs; none remain. Internal `url(#...)` references are retained. SVG namespace identifiers are not network fetches.

The set contains fifteen provider marks and three alternate variants, totaling 55,768 bytes uncompressed; no PNG favicon upscaling or invented brand artwork is used. The manifest covers all fifteen catalog IDs. Local checks confirm that all eighteen SVG URLs return HTTP 200, an SVG content type, and identical local bytes from the development server, and that the integrity hashes below match. These asset checks do not establish provider API availability.

## File integrity

SHA-256 values describe the local sanitized SVG bytes, not the source archives. Dimensions below are SVG viewBoxes (`min-x min-y width height`).

| File | Bytes | ViewBox | SHA-256 |
| --- | ---: | --- | --- |
| `context.svg` | 6,264 | `0 0 372 256` | `873d9dc1eae4ec11cb93f5aab7305607bac8d854104aab1275fb0d6b2426d143` |
| `context-dark.svg` | 6,264 | `0 0 372 256` | `d9a8c30933f43efe7465857618ff0cfcdfebeb8c58c7903ca1e661fb19572674` |
| `tinyfish.svg` | 12,910 | `0 0 221 207` | `2f6c073af6f36e02809e1a9efb70c4bd4620605cf327beaa026f73b92b71cee9` |
| `exa.svg` | 1,147 | `0 0 151 182` | `3370144d994ce3021db0ce5cf952563b7a198346920b0ce61d5b8af65b3518a3` |
| `tavily.svg` | 2,282 | `0 0 55 55` | `320ef37b5a13331bee4d756c6aed45422e61e73a02816ac3a4768815f6ed5153` |
| `tavily-dark.svg` | 2,282 | `0 0 55 55` | `ff1dbb5a01fb6c3cf73229d55d2b86ad5554977ff4f62f1c967d3317699e5572` |
| `brave.svg` | 4,085 | `0 0 56 64` | `451702ccb0e790a8ee8954174e32e638cc0f8d5ae4c0213c6c1a6fa09f0d4622` |
| `perplexity.svg` | 2,204 | `0 0 270.000000 270.000000` | `0ae2408ccc53c870a25e1c4ef74a74db764c3cac8a382a1f441f775a796ecc4d` |
| `parallel.svg` | 3,181 | `0 0 96 96` | `116950c81e4b0881d60a75c6e4cef770c6a24254d070ecf9191a5d16bb88ad0c` |
| `linkup.svg` | 2,881 | `0 0 285 198` | `49088ad12dce50e3582da8f3cb2f7ddf47000f5af4e841a54784a8a96d8d0328` |
| `firecrawl.svg` | 1,523 | `0 0 200 284` | `eaae76b7227c4b6a694c7575c0c665bd627e373b408b9d1806e0dc876e664289` |
| `you.svg` | 997 | `0 0 500 500` | `7f66ccadba268bfec04d115f294529bf3cd2f7a650a38d12b3beb8245b6a1716` |
| `serper.svg` | 2,575 | `0 0 70 70` | `1e8698c65ff6938e8e77344d335c3b00656b6237127d73ca9a3972f0e2271742` |
| `serpapi.svg` | 961 | `0 0 1000 1000` | `253313a8e85df068ac640a31b54e38f98e8d41a9e6b8a50bd17d63bf44e2881f` |
| `wondersearch.svg` | 2,445 | `0 0 373 375` | `e412282c79a5a3848ee2f92480854e7359e48bc9bd89b32fdf52fd552e6dbabe` |
| `wondersearch-dark.svg` | 2,445 | `0 0 373 375` | `7cbd98069a31db14abf6d4807d59134b31f4ffe5b651b5891d92e7a227c65b88` |
| `valyu.svg` | 596 | `0 0 375 375` | `f2ed2b21014b4d133d4ae55e30b9dd5403bf0032b3107ed61cc253f1ddc5b076` |
| `searxng.svg` | 726 | `0 0 92 92` | `c852f912d69550e4ba16a2c87eb7cc081d63bcf9a6d9d25aa3b5223561de428d` |
