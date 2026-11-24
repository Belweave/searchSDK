// Diagrams for the guidelines: construction, clear space, and the drawn "never" examples.
// Returns { 'src/guide/…svg': text, 'src/never/…svg': text }.
import { MAIN, paths } from './geometry.mjs';
import { SETS, LOCKUP, wordmark } from './sources.mjs';
import { outline } from './text.mjs';
import { tokens } from './tokens.mjs';

const ROOT = new URL('../../', import.meta.url).pathname;
const r = (v) => +v.toFixed(3);
const ink = tokens.color.ink;
const BG = ink['900'].$value, FG = ink['50'].$value, DIM = ink['500'].$value, LINE = ink['750'].$value, NO = tokens.theme.dark.danger.$value;
const P = paths(MAIN);
const colour = (s = SETS.dark, extra = '') => `<g${extra}><path fill="${s.violet}" d="${P.violet}"/><path fill="${s.apricot}" d="${P.apricot}"/><path fill="${s.cyan}" d="${P.cyan}"/></g>`;
const svg = (vb, body, label) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb.map(r).join(' ')}" role="img" aria-label="${label}"><title>${label}</title>${body}</svg>\n`;
const MONO = { file: ROOT + 'fonts/MartianMono-VF.ttf', variations: { wght: 400 } };
const label = (x, y, text, anchor = 'start', fill = DIM, size = 2.6) => {
  const w = outline(text, { ...MONO, size }).width;
  const dx = anchor === 'end' ? x - w : anchor === 'middle' ? x - w / 2 : x;
  return `<path fill="${fill}" d="${outline(text, { ...MONO, size, x: dx, y }).d}"/>`;
};

function construction() {
  const g = MAIN, p = g.p;
  let grid = '';
  for (let i = 0; i <= 64; i += 2) {
    const w = i % 8 === 0 ? 0.12 : 0.05;
    grid += `<path stroke="${LINE}" stroke-width="${w}" d="M${i} 0V64M0 ${i}H64"/>`;
  }
  const dash = `stroke="${FG}" stroke-width="0.18" stroke-dasharray="0.8 0.8" fill="none"`;
  const lines = [
    `<path ${dash} d="M0 ${g.top}H64M0 ${g.base}H64"/>`, // band edges
    `<path ${dash} d="M${p.shoulder[0]} 0V64"/>`, // apex under the shoulder
    `<path ${dash} d="M0 64L56 36"/>`, // cyan edge, extended: x + 2y = 128
    `<path ${dash} d="M12 40L56 18"/>`, // beam upper edge, extended: x + 2y = 92 (parallel)
  ].join('');
  const pts = ['crown', 'shoulder', 'foot', 'beamTop', 'apex', 'cyanCorner'].map((k) => `<circle cx="${p[k][0]}" cy="${p[k][1]}" r="0.7" fill="${BG}" stroke="${FG}" stroke-width="0.25"/>`).join('');
  const notes = [
    label(-1.5, 1.8, '0', 'end'), label(-1.5, g.top + 0.9, String(g.top), 'end'), label(-1.5, g.base + 0.9, String(g.base), 'end'), label(-1.5, 64.9, '64', 'end'),
    label(p.crown[0], -2.2, `${p.crown[0]},0`, 'middle'),
    label(p.shoulder[0] - 1.5, g.top - 1.5, `${p.shoulder[0]},${g.top}`, 'end'),
    label(p.apex[0] + 2, p.apex[1] - 0.4, `${p.apex[0]},${p.apex[1]}`),
    label(p.beamTop[0] + 1.2, g.top + 3.4, `${p.beamTop[0]},${g.top}`),
    label(p.cyanCorner[0] + 1.5, g.base - 1.2, `${p.cyanCorner[0]},${g.base}`),
    label(40, 31, '1:2', 'start', FG), label(25, 41.4, '1:4', 'start', FG),
    label(32, 70.5, `arc through 24,0 · 12,22 · 0,64  r ${r(g.arc.r).toFixed(1)}`, 'middle'),
  ].join('');
  return svg([-10, -6, 84, 80], `<rect x="-10" y="-6" width="84" height="80" fill="${BG}"/>${colour(SETS.dark, ' opacity="0.9"')}${grid}${lines}${pts}${notes}`, 'searchSDK mark construction on a 64-unit grid');
}

function clearspace(kind) {
  const B = LOCKUP.beam, M = 64;
  const word = kind === 'horizontal' ? wordmark({ xHeight: B, x: M + LOCKUP.gap, y: MAIN.base }) : null;
  const w = word ? word.box.right : M;
  const zone = `<rect x="${-B}" y="${-B}" width="${r(w + 2 * B)}" height="${M + 2 * B}" fill="none" stroke="${DIM}" stroke-width="0.3" stroke-dasharray="1 1"/>`;
  const beams = [[-B, 0], [w, 0], [0, -B], [0, M]].map(([x, y], i) => i < 2
    ? `<rect x="${x}" y="${MAIN.top}" width="${B}" height="${B}" fill="${SETS.dark.violet}" opacity="0.35"/>`
    : `<rect x="0" y="${y}" width="${B}" height="${B}" fill="${SETS.dark.violet}" opacity="0.35"/>`).join('');
  const gap = word ? `<rect x="${M}" y="${MAIN.top}" width="${LOCKUP.gap}" height="${B}" fill="${SETS.dark.cyan}" opacity="0.3"/>` : '';
  const xh = word ? `<path stroke="${FG}" stroke-width="0.2" stroke-dasharray="0.8 0.8" d="M0 ${MAIN.top}H${r(w + B / 2)}M0 ${MAIN.base}H${r(w + B / 2)}"/>` : '';
  const pad = B + 6;
  const vbw = w + 2 * pad;
  return svg([-pad, -pad, r(vbw), M + 2 * pad], `<rect x="${-pad}" y="${-pad}" width="${r(vbw)}" height="${M + 2 * pad}" fill="${BG}"/>${zone}${beams}${gap}${colour()}${word ? `<path fill="${FG}" d="${word.d}"/>` : ''}${xh}`, `Clear space around the ${kind} lockup`);
}

// Each misuse example: a 96 × 96 tile with a strike.
function never() {
  const tile = (body, name) => svg([0, 0, 96, 96], `<rect width="96" height="96" fill="${BG}"/>${body}<path stroke="${NO}" stroke-width="2" d="M6 90L90 6"/>`, `Never: ${name}`);
  const at = (t) => ` transform="${t}"`;
  const centred = 'translate(16 16)';
  const wrong = { violet: '#2FBF71', apricot: '#E5484D', cyan: '#3E63DD' };
  const wm = (text, file, x, y, size, wght = 650) => `<path fill="${FG}" d="${outline(text, { file: ROOT + 'fonts/' + file, variations: { wght }, size, x, y, tracking: -20 }).d}"/>`;
  return {
    stretch: tile(colour(SETS.dark, at('translate(8 22) scale(1.25 0.8)')), 'stretch or squash'),
    rotate: tile(colour(SETS.dark, at('rotate(-14 48 48) translate(16 16)')), 'rotate'),
    recolour: tile(colour(wrong, at(centred)), 'recolour'),
    reorder: tile(`<g${at(centred)}><path fill="${SETS.dark.violet}" d="${P.violet}"/><path fill="${SETS.dark.cyan}" d="${P.apricot}"/><path fill="${SETS.dark.apricot}" d="${P.cyan}"/></g>`, 'reorder the bands'),
    gradient: tile(`<defs><linearGradient id="never-g" x1="0" x2="1"><stop offset="0" stop-color="${SETS.dark.apricot}"/><stop offset="0.5" stop-color="${SETS.dark.violet}"/><stop offset="1" stop-color="${SETS.dark.cyan}"/></linearGradient></defs><path fill="url(#never-g)" d="${P.silhouette}"${at(centred)}/>`, 'add gradients'),
    outline: tile(`<path fill="none" stroke="${FG}" stroke-width="1.5" d="${P.silhouette}"${at(centred)}/>`, 'outline'),
    effects: tile(`<defs><filter id="never-f" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="5"/></filter></defs><path fill="${SETS.dark.violet}" opacity="0.8" filter="url(#never-f)" d="${P.silhouette}"${at('translate(20 22)')}/>${colour(SETS.dark, at(centred))}`, 'add glow, shadow or blur'),
    field: tile(`<rect x="8" y="8" width="80" height="80" fill="${SETS.dark.apricot}"/>${colour(SETS.dark, at(centred))}`, 'place the colour mark on a brand colour'),
    crop: tile(colour(SETS.dark, at('translate(28 4) scale(1.6)')), 'crop'),
    redraw: tile(`<g${at(centred)}><path fill="${SETS.dark.violet}" d="M0 64L12 22H48L24 34L36 46H38L2 64Z"/><path fill="${SETS.dark.apricot}" d="M24 0H64V22H12L24 0Z"/><path fill="${SETS.dark.cyan}" d="${P.cyan}"/></g>`, 'redraw or simplify'),
    retype: tile(`<g${at('translate(8 38) scale(0.3)')}>${colour()}</g>${wm('searchSDK', 'MartianMono-VF.ttf', 30, 55, 7.4, 500)}`, 'retype the wordmark'),
    rename: tile(`<g${at('translate(6 38) scale(0.3)')}>${colour()}</g>${wm('Search SDK', 'InstrumentSans-VF.ttf', 28, 55, 10.6)}`, 'change the name'),
  };
}

export function guide() {
  const out = {
    'src/guide/construction.svg': construction(),
    'src/guide/clearspace-horizontal.svg': clearspace('horizontal'),
    'src/guide/clearspace-mark.svg': clearspace('icon'),
  };
  for (const [k, v] of Object.entries(never())) out[`src/never/${k}.svg`] = v;
  return out;
}
