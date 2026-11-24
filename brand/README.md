# searchSDK brand

The mark, wordmark, lockups, icons, tokens and rules. Open `index.html` to see them; read
`GUIDELINES.md` for the rules.

| Path | Contents |
| --- | --- |
| `src/` | SVG sources: mark, wordmark, lockups, icons, motion study, social card templates |
| `dist/` | PNG, ICO and social images rendered from `src/` |
| `tokens.json` | colour, type, space, radius and motion values; the source of truth |
| `tokens.css`, `tokens.site.css` | the tokens as CSS, under brand names and under the website's names |
| `fonts/` | Instrument Sans and Martian Mono |

## Rebuild

```sh
cd brand && npm ci && npm run build   # regenerate everything
npm run check                         # fail if anything committed is stale or a rule is broken
```

Two pinned development dependencies (`@resvg/resvg-js`, `harfbuzzjs`); no browser and no network at build time.

## Licences

Code, tokens and documents: MIT, as the repository. The searchSDK name, mark and wordmark identify
the project; use them as `GUIDELINES.md` describes. Fonts: SIL Open Font License 1.1, see `fonts/`.

## Provenance

The mark's concept came from a generated image (round R3-A, "Cut beam"). It was redrawn by hand as
vector on a stated grid; nothing was traced.
