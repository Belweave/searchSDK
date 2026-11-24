# Fonts

Copies of `brand/fonts/`, kept byte-identical by `checks/brand.mjs` (`npm run check` fails on a stale
copy; `npm run dev` and `npm run build` refresh them). Change a face in `brand/`, never here.

| File | Family | Role | Licence |
| --- | --- | --- | --- |
| `InstrumentSans-latin.woff2` | Instrument Sans (variable: weight 400–700, width 75–100, Latin subset) | headings and prose | SIL Open Font License 1.1, `InstrumentSans-OFL.txt` |
| `MartianMono-latin.woff2` | Martian Mono (variable: weight 100–800, width 75–112.5, Latin subset) | code, labels, numbers and benchmark figures | SIL Open Font License 1.1, `MartianMono-OFL.txt` |

Both files are unmodified; sources are recorded in `brand/fonts/README.md`. They are self-hosted
through `next/font/local` (`app/fonts.ts`).
