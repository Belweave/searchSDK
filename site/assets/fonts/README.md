# Fonts

| File | Family | Role | Licence | Source |
| --- | --- | --- | --- | --- |
| `prose.woff2` | Bricolage Grotesque (variable: weight 200–800 and optical size, Latin subset) | headings and prose; the optical-size axis gives the large headlines their tighter, inked display cut | SIL Open Font License 1.1, `prose-OFL.txt` | `@fontsource-variable/bricolage-grotesque` 5.3.0 (`files/bricolage-grotesque-latin-opsz-normal.woff2`), from github.com/ateliertriay/bricolage |
| `mono.woff2` | Martian Mono (variable: weight 100–800, width 75–112.5%, Latin subset) | code, labels, numbers and benchmark figures; labels use the 87.5% width | SIL Open Font License 1.1, `mono-OFL.txt` | `@fontsource-variable/martian-mono` 5.3.0 (`files/martian-mono-latin-standard-normal.woff2`), from github.com/evilmartians/mono |

Both files are unmodified. They are self-hosted through `next/font/local` (`app/fonts.ts`).
To change the type, replace a file and its licence here, and the axis ranges in `app/fonts.ts`.
