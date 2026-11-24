// Text to outlines with HarfBuzz: shaping (kerning included) and glyph paths from the font file.
import fs from 'node:fs';
import * as hb from 'harfbuzzjs';

const cache = new Map();
function font(file, variations) {
  const key = file + JSON.stringify(variations);
  if (!cache.has(key)) {
    const face = new hb.Face(new hb.Blob(fs.readFileSync(file)));
    const f = new hb.Font(face);
    f.setVariations(Object.entries(variations).map(([tag, value]) => new hb.Variation(tag, value)));
    cache.set(key, { face, font: f, upem: face.upem });
  }
  return cache.get(key);
}

/** Vertical extent [top, bottom] of an outline path (y down). */
export function extent(d) {
  const ys = [...d.matchAll(/-?\d+(?:\.\d+)?/g)].map(Number).filter((_, i) => i % 2 === 1);
  return [Math.min(...ys), Math.max(...ys)];
}

/** Flat-topped heights in font units, measured from the outlines of x and H: { upem, xHeight, capHeight }. */
export function metrics(file, variations = {}) {
  const { upem } = font(file, variations);
  const h = (ch) => -extent(outline(ch, { file, variations, size: upem }).d)[0];
  return { upem, xHeight: h('x'), capHeight: h('H') };
}

// Scale and translate an SVG path from font units (y up) to output units (y down).
function place(d, s, dx, dy) {
  const nums = (str) => str.trim().split(/[\s,]+/).filter(Boolean).map(Number);
  const r = (v) => +v.toFixed(3);
  return d.replace(/([MLQCZ])([^MLQCZ]*)/gi, (_, cmd, args) => {
    const a = nums(args);
    const out = [];
    for (let i = 0; i < a.length; i += 2) out.push(r(dx + a[i] * s), r(dy - a[i + 1] * s));
    return cmd + out.join(' ');
  });
}

/**
 * Shape `text` and return { d, width, advances } in output units.
 * size: font size; x, y: baseline origin; tracking: extra units (per 1000 em) after every glyph
 * but the last; adjust: { index: extra units per 1000 em } after glyph `index` (letter-pair spacing).
 */
export function outline(text, { file, variations = {}, size, x = 0, y = 0, tracking = 0, adjust = {}, features = [] }) {
  const { font: f, upem } = font(file, variations);
  const buf = new hb.Buffer();
  buf.addText(text);
  buf.guessSegmentProperties();
  hb.shape(f, buf, features);
  const infos = buf.getGlyphInfos(), pos = buf.getGlyphPositions();
  const s = size / upem;
  let pen = 0;
  const parts = [], advances = [];
  infos.forEach((g, i) => {
    const d = f.glyphToPath(g.codepoint);
    if (d) parts.push(place(d, s, x + (pen + pos[i].xOffset) * s, y - pos[i].yOffset * s));
    let adv = pos[i].xAdvance;
    if (i < infos.length - 1) adv += ((tracking + (adjust[i] || 0)) / 1000) * upem;
    advances.push(adv * s);
    pen += adv;
  });
  buf.destroy?.();
  return { d: parts.join(''), width: pen * s, advances };
}
