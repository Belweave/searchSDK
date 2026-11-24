# Fonts (placeholders)

| File | Family | Role | Licence | Source |
| --- | --- | --- | --- | --- |
| `prose.woff2` | Inter (variable, weights 100–900, Latin subset) | headings and prose | SIL Open Font License 1.1, `prose-OFL.txt` | `@fontsource-variable/inter` 5.3.0 (`files/inter-latin-wght-normal.woff2`), from github.com/rsms/inter |
| `mono.woff2` | JetBrains Mono (variable, weights 100–800, Latin subset) | code, numbers, benchmark figures | SIL Open Font License 1.1, `mono-OFL.txt` | `@fontsource-variable/jetbrains-mono` 5.3.0 (`files/jetbrains-mono-latin-wght-normal.woff2`), from github.com/JetBrains/JetBrainsMono |

Both files are unmodified. They are self-hosted through `next/font/local` (`app/fonts.ts`).
To change the type, replace a file and its licence here, and the weight range in `app/fonts.ts`.
