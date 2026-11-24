// Every generated SVG source in brand/src/, built from the stated geometry (geometry.mjs) and the
// wordmark face (fonts/). Returns { 'src/…/file.svg': text }.
import { MAIN, SMALL, paths } from './geometry.mjs';
import { outline, metrics } from './text.mjs';
import { bbox } from './bbox.mjs';
import { tokens } from './tokens.mjs';

const ROOT = new URL('../../', import.meta.url).pathname;
export const WORDMARK_FONT = ROOT + 'fonts/InstrumentSans-VF.ttf';

const c = tokens.color;
export const SETS = {
  dark: { apricot: c.brand.apricot.$value, violet: c.brand.violet.$value, cyan: c.brand.cyan.$value, text: c.ink['50'].$value, tile: c.ink['900'].$value },
  light: { apricot: c['brand-paper'].apricot.$value, violet: c['brand-paper'].violet.$value, cyan: c['brand-paper'].cyan.$value, text: c.ink['900'].$value, tile: c.paper['50'].$value },
};

// Lockup rules, in units of the main grid (mark height = 64 u).
export const LOCKUP = {
  beam: 24, // the beam opening; the clear space on every side, and the wordmark's x-height (horizontal) or cap height (stacked)
  gap: 18, // the cyan band; between mark and wordmark
};
// Wordmark: Instrument Sans at weight 650, width 100, tracked −20/1000 em, with one pair adjusted.
export const WORDMARK = {
  text: 'searchSDK',
  variations: { wght: 650, wdth: 100 },
  tracking: -20,
  adjust: { 3: -12 }, // r→c: the r's open arm leaves a hole; close it by 12/1000 em
};

const r = (v) => +v.toFixed(3);
const svg = (vb, body, { title = 'searchSDK', extra = '' } = {}) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb.map(r).join(' ')}" role="img" aria-label="${title}"${extra}><title>${title}</title>${body}</svg>\n`;

const colourMark = (g, s, t = '') => {
  const p = paths(g);
  return `<g${t}><path fill="${s.violet}" d="${p.violet}"/><path fill="${s.apricot}" d="${p.apricot}"/><path fill="${s.cyan}" d="${p.cyan}"/></g>`;
};
const monoMark = (g, t = '', fill = 'currentColor') => `<path${t} fill="${fill}" d="${paths(g).silhouette}"/>`;
const at = (x, y, s = 1) => ` transform="translate(${r(x)} ${r(y)})${s !== 1 ? ` scale(${r(s)})` : ''}"`;

/** The wordmark outline at a given x-height or cap height, ink starting at x, baseline at y. */
export function wordmark({ xHeight, capHeight, x = 0, y = 0 }) {
  const m = metrics(WORDMARK_FONT, WORDMARK.variations);
  const size = xHeight ? (xHeight / m.xHeight) * m.upem : (capHeight / m.capHeight) * m.upem;
  const probe = outline(WORDMARK.text, { file: WORDMARK_FONT, ...WORDMARK, size });
  const ink = bbox(probe.d);
  const o = outline(WORDMARK.text, { file: WORDMARK_FONT, ...WORDMARK, size, x: x - ink.x, y });
  return { d: o.d, size, box: bbox(o.d) };
}

// Optical centre of the main mark: the area centroid of its silhouette, sampled on a fine grid.
export function centroid(g = MAIN) {
  const { arc, p, top, base, size } = g;
  const arcX = (y) => arc.cx - Math.sqrt(arc.r ** 2 - (y - arc.cy) ** 2);
  const beamUpper = (y) => p.apex[0] + (p.apex[1] - y) * g.slope; // x of the beam's upper edge at y
  const beamLower = (y) => p.apex[0] + ((y - p.apex[1]) / (base - p.apex[1])) * (p.cyanCorner[0] - p.apex[0]);
  let sx = 0, sa = 0;
  const N = 2000;
  for (let i = 0; i < N; i++) {
    const y = ((i + 0.5) / N) * size;
    const spans = [];
    const left = arcX(y);
    if (y < top || y > base) spans.push([left, size]);
    else if (y <= p.apex[1]) spans.push([left, beamUpper(y)]);
    else spans.push([left, beamLower(y)]);
    for (const [a, b] of spans) { sa += b - a; sx += ((b * b - a * a) / 2); }
  }
  return sx / sa;
}

export function sources() {
  const out = {};
  const M = MAIN.size;
  const B = LOCKUP.beam;

  // Mark: tight 64 × 64 (main) and 16 × 16 (small).
  for (const [name, g] of [['mark', MAIN], ['mark-small', SMALL]]) {
    const vb = [0, 0, g.size, g.size];
    out[`src/mark/${name}-dark.svg`] = svg(vb, colourMark(g, SETS.dark));
    out[`src/mark/${name}-light.svg`] = svg(vb, colourMark(g, SETS.light));
    out[`src/mark/${name}-mono.svg`] = svg(vb, monoMark(g));
  }

  // Wordmark: tight, single colour.
  const wmH = wordmark({ xHeight: B, y: 0 });
  const wvb = [0, wmH.box.y, wmH.box.right, wmH.box.height];
  out['src/wordmark/wordmark-mono.svg'] = svg(wvb, `<path fill="currentColor" d="${wmH.d}"/>`);
  for (const v of ['dark', 'light']) out[`src/wordmark/wordmark-${v}.svg`] = svg(wvb, `<path fill="${SETS[v].text}" d="${wmH.d}"/>`);

  // Lockups include their clear space (B on every side).
  // Horizontal: x-height spans the beam (baseline on the cyan's top edge). Stacked: cap height = beam.
  const horiz = wordmark({ xHeight: B, x: M + LOCKUP.gap, y: MAIN.base });
  const hw = horiz.box.right;
  const stacked = wordmark({ capHeight: B, x: 0, y: M + LOCKUP.gap + B });
  const sw = stacked.box.width, sh = stacked.box.bottom;
  const shift = (sw - M) / 2;
  const layouts = {
    horizontal: { vb: [-B, -B, hw + 2 * B, M + 2 * B], word: horiz.d, markAt: at(0, 0) },
    stacked: { vb: [-B, -B, sw + 2 * B, sh + 2 * B], word: stacked.d, markAt: at(shift, 0) },
    icon: { vb: [-B, -B, M + 2 * B, M + 2 * B], word: null, markAt: at(0, 0) },
  };
  for (const [name, L] of Object.entries(layouts)) {
    for (const v of ['dark', 'light']) {
      const s = SETS[v];
      out[`src/lockup/${name}-${v}.svg`] = svg(L.vb, colourMark(MAIN, s, L.markAt) + (L.word ? `<path fill="${s.text}" d="${L.word}"/>` : ''));
    }
    out[`src/lockup/${name}-mono.svg`] = svg(L.vb, monoMark(MAIN, L.markAt) + (L.word ? `<path fill="currentColor" d="${L.word}"/>` : ''));
  }

  // App icon family. The mark is centred on its box, then moved left by half the distance between
  // the box centre and the silhouette's centroid, so the flat right edge does not pull it off centre.
  const optical = (M / 2 - centroid()) / 2;
  const tile = (size, markSize, rx, fill) => {
    const s = markSize / M;
    const x = (size - markSize) / 2 + optical * s, y = (size - markSize) / 2;
    return `<rect width="${size}" height="${size}"${rx ? ` rx="${rx}"` : ''} fill="${fill}"/>` + colourMark(MAIN, SETS.dark, at(x, y, s));
  };
  out['src/icon/app-icon.svg'] = svg([0, 0, 1024, 1024], tile(1024, 544, 232, SETS.dark.tile));
  out['src/icon/apple-touch-icon.svg'] = svg([0, 0, 180, 180], tile(180, 96, 0, SETS.dark.tile));
  out['src/icon/maskable.svg'] = svg([0, 0, 512, 512], tile(512, 256, 0, SETS.dark.tile));

  // Favicon: the small master; paper colours unless the browser is dark.
  const sp = paths(SMALL);
  const fav = `<style>.fa{fill:${SETS.light.apricot}}.fv{fill:${SETS.light.violet}}.fc{fill:${SETS.light.cyan}}@media (prefers-color-scheme:dark){.fa{fill:${SETS.dark.apricot}}.fc{fill:${SETS.dark.cyan}}}</style>` +
    `<path class="fv" d="${sp.violet}"/><path class="fa" d="${sp.apricot}"/><path class="fc" d="${sp.cyan}"/>`;
  out['src/icon/favicon.svg'] = svg([0, 0, 16, 16], fav);

  // Motion study: the bands converge, hold, and clear. Loop for loading states, once for a header.
  for (const [name, loop] of [['mark-loader', true], ['mark-intro', false]]) for (const v of ['dark', 'light']) out[`src/motion/${name}-${v}.svg`] = motion(loop, `ssdk-${name.slice(5)}-${v}`, SETS[v]);
  return out;
}

function motion(loop, ns, s) {
  // Class and keyframe names carry the file's namespace, so the SVG can be inlined beside others.
  // The bands flow in from the right (apricot, cyan, then violet, which passes through the beam to
  // land last), hold, then flow out to the left (violet first, so its underlap is never exposed).
  // Opaque throughout; the frame clips them. Reduced motion: the finished mark, still.
  const t = tokens.motion;
  const p = paths(MAIN);
  const band = parseInt(t.duration['mark-band']), stagger = parseInt(t.duration.stagger);
  const exit = 360;
  const total = loop ? parseInt(t.duration['mark-loop']) : band + 2 * stagger;
  const pct = (ms) => +((ms / total) * 100).toFixed(3) + '%';
  const IN = 'translateX(64px)', OUT = 'translateX(-64px)';
  const frames = (enterAt, exitAt) => {
    let k = `${enterAt ? '0%,' : ''}${pct(enterAt)}{transform:${IN};animation-timing-function:${t.easing.enter}}${pct(enterAt + band)}{transform:none;animation-timing-function:linear}`;
    k += loop ? `${pct(exitAt)}{transform:none;animation-timing-function:${t.easing.exit}}${pct(exitAt + exit)},100%{transform:${OUT}}` : `100%{transform:none}`;
    return k;
  };
  const hold = 1800; // exits begin here in the loop
  const bands = { a: [0, hold + stagger], c: [stagger, hold + 2 * stagger], v: [2 * stagger, hold] };
  const css = Object.entries(bands).map(([k, [e, x]]) => `@keyframes ${ns}-${k}{${frames(e, x)}}.${ns}-${k}{animation:${ns}-${k} ${total}ms both ${loop ? 'infinite' : '1'}}`).join('') +
    `@media (prefers-reduced-motion:reduce){.${ns}-a,.${ns}-c,.${ns}-v{animation:none}}`;
  return svg([0, 0, 64, 64], `<style>${css}</style><path class="${ns}-v" fill="${s.violet}" d="${p.violet}"/><path class="${ns}-a" fill="${s.apricot}" d="${p.apricot}"/><path class="${ns}-c" fill="${s.cyan}" d="${p.cyan}"/>`, { extra: ' overflow="hidden"' });
}
