# searchSDK brand studies, phase 1

Open `index.html` in a browser; it needs no build. Choose by label: marks A1–C3, lockups L1–L9, palettes P1–P2, type T1–T4, motion M1–M4.

## Recommendation

- **Mark: A2 Merge.** It draws the brief literally, many lanes bending into one beam, and it holds its structure at 16 px in colour and in one colour.
- **Palette: P1 Beam.** Hue belongs only to providers and the accent is the beam itself, so the brand never competes with benchmark data.
- **Type: T1 Instrument Sans + JetBrains Mono** (both SIL OFL 1.1). Compact and current, with clear, even figures for tables.
- **Lockup: L1**, which pairs A2 with Instrument Sans.

## Cut

A3, A4, B1 and C4 are shown on the board with the reason for each cut. Sonar, a cyan-accent palette, failed provider-hue separation.

## Method

- Marks are drawn from geometry on a 64-unit grid in `tools/marks.mjs`. The sources are in `marks/` as `-dark`, `-light` and `-mono` (`currentColor`) files.
- Provider hues are searched by `tools/palettes.mjs`, which maximises the closest CIEDE2000 pair for normal vision and simulated protanopia, deuteranopia and tritanopia (Machado 2009). The worst pair is about 6.6 ΔE00, so hues always need name labels.
- To regenerate: `node brand/studies/tools/palettes.mjs && node brand/studies/tools/build.mjs`.

## Phase 2

1. Refine A2: optical spacing, a pixel-fitted 16 px master, clear space, minimum size, app-icon tile.
2. Draw the wordmark as outlines with kerning; make horizontal, stacked and icon lockups.
3. Assign hues to named providers, checking each against that provider's own brand colour.
4. Write tokens (CSS, JSON) and a scripted export: SVG, PNG, ICO, favicon, social cards.
5. Set motion tokens and build the race hero from real benchmark data.
6. Write the guidelines, including the never list and trademark rules.
