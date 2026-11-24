// Writes the source SVGs to brand/studies/marks/ and inlines all study data into
// brand/studies/index.html (between the DATA markers), so the board opens from
// the file system with no build step.
// Run: node brand/studies/tools/palettes.mjs && node brand/studies/tools/build.mjs

import { readFileSync, writeFileSync, mkdirSync, readdirSync, unlinkSync } from 'node:fs';
import { MARKS, render, bandCount } from './marks.mjs';

const root = new URL('../', import.meta.url);
const palettes = JSON.parse(readFileSync(new URL('palettes.json', root), 'utf8'));
const source = palettes.find((p) => p.id === 'P1');

// Source files: colour on dark, colour on light, single colour (currentColor).
const dir = new URL('marks/', root);
mkdirSync(dir, { recursive: true });
for (const f of readdirSync(dir)) if (f.endsWith('.svg')) unlinkSync(new URL(f, dir));
for (const m of MARKS) {
  const id = m.id.toLowerCase();
  const head = (t) => `<!-- searchSDK mark study ${m.id} "${m.name}" · ${t} · palette ${source.id} ${source.name} · 64-unit grid -->\n`;
  writeFileSync(new URL(`${id}-dark.svg`, dir), head('colour for dark surfaces') + render(m, { palette: source, theme: 'dark', uid: id, standalone: true }) + '\n');
  writeFileSync(new URL(`${id}-light.svg`, dir), head('colour for light surfaces') + render(m, { palette: source, theme: 'light', uid: id, standalone: true }) + '\n');
  writeFileSync(new URL(`${id}-mono.svg`, dir), head('single colour, currentColor') + render(m, { palette: source, theme: 'mono', uid: id, standalone: true }) + '\n');
}

const data = {
  palettes,
  marks: MARKS.map((m) => ({
    id: m.id, idea: m.idea, name: m.name, caption: m.caption, bands: bandCount(m),
    dropped: m.dropped || null,
    svg: Object.fromEntries(palettes.map((p) => [p.id, {
      dark: render(m, { palette: p, theme: 'dark', uid: m.id, standalone: true }),
      light: render(m, { palette: p, theme: 'light', uid: m.id, standalone: true }),
    }])),
    mono: render(m, { palette: source, theme: 'mono', uid: m.id, standalone: true }),
  })),
};

const file = new URL('index.html', root);
const html = readFileSync(file, 'utf8');
const start = '/*DATA:start*/', end = '/*DATA:end*/';
const a = html.indexOf(start), b = html.indexOf(end);
if (a < 0 || b < 0) throw new Error('DATA markers missing in index.html');
writeFileSync(file, html.slice(0, a + start.length) + 'const DATA = ' + JSON.stringify(data) + ';' + html.slice(b));
console.log(`wrote ${MARKS.length * 3} SVGs and inlined data (${(JSON.stringify(data).length / 1024).toFixed(0)} KB)`);
