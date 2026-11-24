// npm run build   regenerates brand/src (generated SVGs), tokens.css, tokens.site.css, index.html and dist/.
// npm run check   regenerates in memory and fails if anything committed differs, or a rule is broken.
import fs from 'node:fs';
import path from 'node:path';
import { sources } from './lib/sources.mjs';
import { guide } from './lib/guide.mjs';
import { brandCss, siteCss, checkColours, contrastTable } from './lib/tokens.mjs';
import { png, ico, outlineText, inlineImages } from './lib/raster.mjs';
import { page } from './lib/page.mjs';
import { lint } from './lib/lint.mjs';

const ROOT = new URL('../', import.meta.url).pathname;
const CHECK = process.argv.includes('--check');
// Directories whose every file is generated: anything here that the build does not produce is stale.
const MANAGED = ['src/mark', 'src/wordmark', 'src/lockup', 'src/icon', 'src/motion', 'src/guide', 'src/never', 'dist'];

const out = new Map();
const put = (p, data) => out.set(p, typeof data === 'string' ? Buffer.from(data) : data);

// 1. SVG sources from the construction.
const src = { ...sources(), ...guide() };
for (const [p, text] of Object.entries(src)) put(p, text);
const svg = (p) => src[p] ?? fs.readFileSync(ROOT + p, 'utf8');
const fill = (text, colour) => text.replaceAll('currentColor', colour);

// 2. Tokens.
put('tokens.css', brandCss());
put('tokens.site.css', siteCss());

// 3. Rasters. Each size uses the master whose edges land on whole pixels.
const small = (px) => px < 32 || px === 48;
const SIZES = [16, 24, 32, 48, 64, 128, 256, 512, 1024];
for (const v of ['dark', 'light']) for (const px of SIZES) {
  put(`dist/mark/mark-${v}-${px}.png`, png(svg(`src/mark/${small(px) ? 'mark-small' : 'mark'}-${v}.svg`), px));
}
const INK = '#0E0F15', WHITE = '#FFFFFF';
for (const [name, colour] of [['white', WHITE], ['ink', INK]]) for (const px of [32, 256, 1024]) {
  put(`dist/mark/mark-${name}-${px}.png`, png(fill(svg('src/mark/mark-mono.svg'), colour), px));
}
for (const kind of ['horizontal', 'stacked', 'icon']) for (const v of ['dark', 'light']) {
  const text = svg(`src/lockup/${kind}-${v}.svg`);
  const w = +text.match(/viewBox="[^"]*?\s[^\s]+\s([\d.]+)\s/)[1];
  for (const scale of [1, 4]) put(`dist/lockup/${kind}-${v}-${scale}x.png`, png(text, Math.round(w * scale)));
}
put('dist/icon/app-icon-1024.png', png(svg('src/icon/app-icon.svg'), 1024));
put('dist/icon/app-icon-512.png', png(svg('src/icon/app-icon.svg'), 512));
put('dist/icon/icon-192.png', png(svg('src/icon/app-icon.svg'), 192));
put('dist/icon/apple-touch-icon.png', png(svg('src/icon/apple-touch-icon.svg'), 180));
put('dist/icon/icon-maskable-512.png', png(svg('src/icon/maskable.svg'), 512));
put('dist/icon/favicon.svg', svg('src/icon/favicon.svg'));
put('dist/icon/favicon.ico', ico([
  { size: 16, data: png(svg('src/mark/mark-small-light.svg'), 16) },
  { size: 32, data: png(svg('src/mark/mark-light.svg'), 32) },
  { size: 48, data: png(svg('src/mark/mark-small-light.svg'), 48) },
]));
for (const [name, w] of [['og', 1200], ['github', 1280]]) {
  put(`dist/social/${name}.png`, png(outlineText(inlineImages(svg(`src/social/${name}.svg`), (href) => svg(path.join('src/social', href)))), w));
}

// 4. The guidelines page (inlines the sources and fonts; opens from the file system).
put('index.html', page(src, (p) => out.get(p)));

// The contrast block in GUIDELINES.md is generated from the same table the check enforces.
{
  const rows = contrastTable();
  const keys = [...new Set(rows.map((r) => `${r.fg}|${r.bg}|${r.min}`))];
  const table = ['| Pair | Dark | Light | Min |', '| --- | --- | --- | --- |', ...keys.map((k) => {
    const [fg, bg, min] = k.split('|');
    const v = (t) => rows.find((r) => r.theme === t && r.fg === fg && r.bg === bg).ratio.toFixed(2);
    return `| \`${fg}\` on \`${bg}\` | ${v('dark')} | ${v('light')} | ${min} |`;
  })].join('\n');
  const g = fs.readFileSync(ROOT + 'GUIDELINES.md', 'utf8');
  put('GUIDELINES.md', g.replace(/<!-- contrast:start -->[\s\S]*<!-- contrast:end -->/, `<!-- contrast:start -->\n${table}\n<!-- contrast:end -->`));
}

// 5. Rules.
const problems = [...checkColours(), ...contrastTable().filter((r) => !r.pass).map((r) => `contrast ${r.theme}: ${r.fg} on ${r.bg} is ${r.ratio}, needs ${r.min}`), ...lint(ROOT, out)];

const walk = (dir) => (fs.existsSync(ROOT + dir) ? fs.readdirSync(ROOT + dir, { recursive: true }).map((f) => path.join(dir, f)).filter((f) => fs.statSync(ROOT + f).isFile()) : []);
const extra = MANAGED.flatMap(walk).filter((f) => !out.has(f) && !f.endsWith('.DS_Store'));

if (CHECK) {
  const stale = [...out].filter(([p, data]) => !fs.existsSync(ROOT + p) || !fs.readFileSync(ROOT + p).equals(data)).map(([p]) => p);
  for (const p of stale) problems.push(`stale: ${p} (run npm run build)`);
  for (const p of extra) problems.push(`not produced by the build: ${p}`);
  if (problems.length) { console.error(problems.map((p) => '✗ ' + p).join('\n')); process.exit(1); }
  console.log(`brand check passed: ${out.size} generated files current; colours, contrast and copy rules hold.`);
} else {
  for (const [p, data] of out) { fs.mkdirSync(path.dirname(ROOT + p), { recursive: true }); fs.writeFileSync(ROOT + p, data); }
  for (const p of extra) fs.rmSync(ROOT + p);
  if (problems.length) { console.error(problems.map((p) => '✗ ' + p).join('\n')); process.exit(1); }
  console.log(`brand build: wrote ${out.size} files${extra.length ? `, removed ${extra.length} stale` : ''}.`);
}
