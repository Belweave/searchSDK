# Provider brand assets

Every file in this directory is the provider's own file, downloaded from the provider's own
website on 2026-11-24 and stored byte for byte unmodified. Only the file names were changed, to one
convention the site reads (`lib/provider-assets.ts`):

| File | Use |
| --- | --- |
| `mark-on-dark.svg` | the provider's symbol, the variant the provider supplies for dark surfaces |
| `mark-on-light.svg` | the symbol for light surfaces (the same file when the provider supplies one variant) |
| `logo-on-dark.svg` | the provider's logo or wordmark for dark surfaces |
| `logo-on-light.svg` | the logo or wordmark for light surfaces |

A provider without a folder, or with a missing file, renders its name in text with a neutral
monogram; the build does not fail. Adding a registry spec never needs a file here.

How the site uses them, for every provider: the supplied files only, at their own proportions
(width and height come from each file's viewBox), never recoloured, rotated, outlined, cropped,
animated or given effects; the variant the provider assigns to the surface (dark or light theme);
clear space of at least a third of the mark's width around every mark; nothing smaller than 16 px
tall; never larger or more prominent than needed to identify the provider; always beside the
provider's name or in place of it with the name as the accessible label. Each provider's colour on
this site is derived from its brand colour (`styles/tokens.css`), is used for lanes, bars and
rules, never applied to the logo, and never carries meaning alone. Every page says the names are
trademarks of their owners and that searchSDK is not affiliated with them.

`sha256` is the first 16 hex digits of the stored file's SHA-256.

## Exa (`exa`)

- Source: https://exa.ai/brand ("Download brand assets": https://exa.ai/assets/Exa%20Brand%20Assets.zip). The blue logo is also served at https://exa.ai/images/logo/exa-logo-blue.svg.
- Files: `mark-on-dark.svg` = `Logo/SVGs/Logomark/Exa Logomark White.svg` (254712cd4c69ddae); `mark-on-light.svg` = `Exa Logomark Blue.svg` (3370144d994ce302); `logo-on-dark.svg` = `Logo/SVGs/Logo/Exa Logo White.svg` (03674f991d421dfb); `logo-on-light.svg` = `Exa Logo Blue.svg` (60fa408cdcf1e401).
- Guidelines: the name, logo and trademarks are Exa's property. The logo requires prescribed clear space; it is supplied in white and blue; the logomark is Exa blue (#1840ED) for standard use and white for dark backgrounds. With partner logos: clear spacing equal to the height of the Exa logo, approved colours and proportions, no distortion or modification; co-branded materials need approval from both parties. This site does not co-brand: logos identify providers in a comparison.
- Brand colour: #1840ED, with a lighter lavender blue in Exa's palette. Site hue: a light periwinkle blue (hue moved slightly toward violet so it is distinct from Context.dev's blue).

## Tavily (`tavily`)

- Source: https://www.tavily.com/brand (files under https://www.tavily.com/logos/).
- Files: `mark-on-dark.svg` = `tavily-mark-offwhite.svg` (ff1dbb5a01fb6c3c); `mark-on-light.svg` = `tavily-mark-black.svg` (320ef37b5a13331b); `logo-on-dark.svg` = `tavily-full-offwhite.svg` (4d3bacb8e49563f3); `logo-on-light.svg` = `tavily-full.svg` (a482ea651b406945).
- Guidelines: use the supplied files at their original proportions, without modification; clear space at least the height of the icon; black logo on light surfaces, off-white on dark; do not stretch, squash, recolour outside the approved palette, rotate, skew, add shadows, outlines or effects, or rebuild the wordmark in another typeface. Trademark use without written consent is allowed for referential (nominative fair) use: only as needed to identify Tavily, with no suggestion of endorsement, sponsorship or affiliation, and not more prominently than necessary.
- Brand colours: Off White #FFFCF6 and Black #1F1E1E, with accents Green #80AF9B, Light Blue #79DEEB, Lavender #817FFF, Pink #F49EFF. Site hue: Tavily's Pink accent, lifted slightly for contrast.

## Context.dev (`context`)

- Source: https://www.context.dev/brand (kit: https://www.context.dev/brand-guidelines/context-dev-brand-assets.zip, files also under https://www.context.dev/brand-guidelines/kit/).
- Files: `mark-on-dark.svg` = `Logomark/context-dev-logomark-white.svg` (d9a8c30933f43efe); `mark-on-light.svg` = `context-dev-logomark-blue.svg` (873d9dc1eae4ec11); `logo-on-dark.svg` = `Logo/context-dev-logo-blue-white.svg` (b48a9192427cc85a); `logo-on-light.svg` = `context-dev-logo-blue-black.svg` (16336a7942c1c98d).
- Guidelines: usable to write about Context.dev without asking first. Clear space a third of the logomark's width on every side; at least 16 px tall; scale only in proportion; do not stretch, recolour, rotate, outline, add shadows or effects, or rearrange; do not retype the wordmark. The name is always "Context.dev", never "Context".
- Brand colour: Blue #2563EB, with black and white. Site hue: a lighter azure from the same blue, moved slightly toward cyan so it is distinct from Exa.

## TinyFish (`tinyfish`)

- Source: https://www.tinyfish.ai/ (the site's own logo files: https://www.tinyfish.ai/TF-Logos/Icon/SVG/TF_ICON.svg, https://www.tinyfish.ai/TF-Logos/Horizontal%20Logo/SVG/TF_Horizontal.svg, https://www.tinyfish.ai/TF-Logos/Horizontal%20Logo/SVG/TF_Horizontal_KO.svg).
- Files: `mark-on-dark.svg` and `mark-on-light.svg` = `TF_ICON.svg` (2f6c073af6f36e02); `logo-on-dark.svg` = `TF_Horizontal_KO.svg` (052076221f8adfad); `logo-on-light.svg` = `TF_Horizontal.svg` (09e9a90125aabe33).
- Guidelines: no brand or press page was found (tinyfish.ai/brand, /press, /brand-guidelines and /media-kit return 404). The files are used as TinyFish serves them, under the general rules above. Not obtained: written usage rules.
- Brand colours (from the site): orange #E86007, apricot, and a mint green. Site hue: TinyFish's mint, as a vivid lime, because three orange providers would be hard to tell apart.

## Brave Search (`brave`)

- Source: https://brave.com/brave-branding-assets/ ("Brave Logo Package", https://brave.com/static-assets/files/BrandBrave.zip, holds PNG, AI and EPS only). The SVGs are the ones that page itself serves: https://brave.com/static-assets/images/brave-logo-sans-text.svg, https://brave.com/static-assets/images/brave-logo.svg, https://brave.com/static-assets/images/brave-logo-dark.svg.
- Files: `mark-on-dark.svg` and `mark-on-light.svg` = `brave-logo-sans-text.svg` (2530f80fdf2144b6); `logo-on-dark.svg` = `brave-logo.svg` (f781ec306fbc06a1); `logo-on-light.svg` = `brave-logo-dark.svg` (9b1e1edcd53053bb).
- Guidelines: the page lists official colours (#FB542B, #343546, #A0A1B2, #F0F0F0, #A3278F, #4F30AB) and type (Poppins); it states no further written rules. The logo package separates logos for dark and light backgrounds; the site follows that split.
- Brand colour: #FB542B. Site hue: a red-orange from it, kept redder than Firecrawl's orange.

## Perplexity (`perplexity`)

- Source: https://www.perplexity.ai/hub/brand (files on Perplexity's own CDN: https://frontend-cdn.perplexity.ai/_agi_assets/marketing/hub/brand/logos/2026-10-08/).
- Files: `mark-on-dark.svg` = `perplexity-symbol-offwhite.svg` (6b24dcc3a85e5b2c); `mark-on-light.svg` = `perplexity-symbol-offblack.svg` (56a6f9663ee82207); `logo-on-dark.svg` = `perplexity-wordmark-offwhite.svg` (03f3a3e2036c6653); `logo-on-light.svg` = `perplexity-wordmark-offblack.svg` (40b95d62bef00fcd).
- Guidelines: the logo is the symbol and the wordmark on one shared axis; logos and symbols are supplied in Off Black and Off White. The page we could read states no further usage rules.
- Brand colour: a deep teal. Site hue: a light turquoise from that teal.

## Firecrawl (`firecrawl`)

- Source: https://www.firecrawl.dev/press-brand (kit: https://www.firecrawl.dev/brand/brand-assets.zip).
- Files: `mark-on-dark.svg` and `mark-on-light.svg` = `firecrawl-logo.svg` (eaae76b7227c4b6a); `logo-on-dark.svg` = `firecrawl-colored-light-wordmark.svg` (e0aaaeda85bac4b9); `logo-on-light.svg` = `firecrawl-wordmark.svg` (7edcff63dfe51f31).
- Guidelines: the wordmark is the primary logo in most situations; avoid stretching, recolouring or modifying it. The flame symbol is for square or minimal uses.
- Brand colour: Heat #FA5D19, with Graphite and Paper. Site hue: Heat as a warm orange, kept more yellow than Brave's red-orange.

## Display notes

`perplexity/display.json` records that Perplexity's own files carry their clear space inside the
file (the wordmark's letters fill 38% of its height, the symbol 63%). The site draws those files
larger by that ratio so the letters match other providers' size, and lets the built-in space overlap
the surrounding line instead of cropping it. The files themselves are unchanged.
