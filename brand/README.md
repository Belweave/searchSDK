# searchSDK brand

Open `index.html` to see the identity; `GUIDELINES.md` holds the rules.

| Path | Contents |
| --- | --- |
| `src/` | SVG sources: mark, wordmark, lockups, icons, motion, social templates |
| `dist/` | PNG, ICO and social images rendered from `src/` |
| `tokens.json` | colour, type, space, radius and motion; the source of truth |
| `tokens.css`, `tokens.site.css` | the tokens as CSS, under brand and website names |
| `fonts/` | Instrument Sans and Martian Mono |

## Rebuild

```sh
npm ci && npm run build   # regenerate everything
npm run check             # fails on stale outputs or broken rules
```

Run in `brand/`. Two pinned development dependencies; no browser or network at build time.

## Licences

Code, tokens and documents: MIT, as the repository. The searchSDK name, mark and wordmark identify
the project; use them as `GUIDELINES.md` describes. Fonts: SIL Open Font License 1.1, see `fonts/`.

## Provenance

The mark's concept came from a generated image (round R3-A, "Cut beam"). It was redrawn by hand as
vector on a stated grid; nothing was traced.
