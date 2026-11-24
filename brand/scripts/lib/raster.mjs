// SVG -> PNG with resvg (no browser, no network), ICO packing, and <text> -> outlines for templates.
import { Resvg } from '@resvg/resvg-js';
import { outline } from './text.mjs';

const ROOT = new URL('../../', import.meta.url).pathname;
const FONTS = { 'Instrument Sans': ROOT + 'fonts/InstrumentSans-VF.ttf', 'Martian Mono': ROOT + 'fonts/MartianMono-VF.ttf' };

/** Render SVG text to a PNG Buffer at the given pixel width. */
export function png(svgText, width) {
  const r = new Resvg(svgText, { fitTo: { mode: 'width', value: width }, font: { loadSystemFonts: false }, shapeRendering: 2, imageRendering: 0 });
  return Buffer.from(r.render().asPng());
}

/** Pack PNG buffers (square, ≤ 256 px) into one ICO. */
export function ico(entries) {
  const head = Buffer.alloc(6 + 16 * entries.length);
  head.writeUInt16LE(0, 0); head.writeUInt16LE(1, 2); head.writeUInt16LE(entries.length, 4);
  let offset = head.length;
  entries.forEach(({ size, data }, i) => {
    const e = 6 + 16 * i;
    head.writeUInt8(size >= 256 ? 0 : size, e); head.writeUInt8(size >= 256 ? 0 : size, e + 1);
    head.writeUInt16LE(1, e + 4); head.writeUInt16LE(32, e + 6);
    head.writeUInt32LE(data.length, e + 8); head.writeUInt32LE(offset, e + 12);
    offset += data.length;
  });
  return Buffer.concat([head, ...entries.map((e) => e.data)]);
}

/**
 * Replace each <image href="….svg" x y width|height> with the referenced SVG inlined as a nested
 * <svg>, because resvg does not load external images. A missing width or height follows the viewBox.
 */
export function inlineImages(svgText, read) {
  return svgText.replace(/<image\b([^>]*?)\/>/g, (_, attrs) => {
    const tag = ' ' + attrs;
    const href = attr(tag, 'href');
    const inner = read(href);
    const [, , vw, vh] = inner.match(/viewBox="([^"]+)"/)[1].split(/\s+/).map(Number);
    let w = attr(tag, 'width'), h = attr(tag, 'height');
    if (!w) w = (h * vw) / vh;
    if (!h) h = (w * vh) / vw;
    return inner.replace(/^<svg\b/, `<svg x="${attr(tag, 'x') || 0}" y="${attr(tag, 'y') || 0}" width="${+(+w).toFixed(3)}" height="${+(+h).toFixed(3)}"`).trim();
  });
}

const attr = (tag, name) => tag.match(new RegExp(`\\s${name}="([^"]*)"`))?.[1];

/**
 * Replace each single-line <text> in a template with its outline, so the template stays editable
 * while the render uses the exact variable-font instance. Supported attributes: x, y, font-family,
 * font-size, font-weight, letter-spacing (em), font-stretch (%), text-anchor (start|end), fill.
 */
export function outlineText(svgText) {
  return svgText.replace(/<text\b([^>]*)>([^<]*)<\/text>/g, (_, attrs, content) => {
    const tag = ' ' + attrs;
    const family = attr(tag, 'font-family').split(',')[0].trim().replace(/['"]/g, '');
    const file = FONTS[family];
    if (!file) throw new Error(`template font not available: ${family}`);
    const size = +attr(tag, 'font-size');
    const text = content.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#183;/g, '·');
    const variations = { wght: +(attr(tag, 'font-weight') || 400) };
    if (attr(tag, 'font-stretch')) variations.wdth = parseFloat(attr(tag, 'font-stretch'));
    const tracking = parseFloat(attr(tag, 'letter-spacing') || '0') * 1000;
    let x = +(attr(tag, 'x') || 0);
    const y = +(attr(tag, 'y') || 0);
    if (attr(tag, 'text-anchor') === 'end') x -= outline(text, { file, variations, size, tracking }).width;
    const o = outline(text, { file, variations, size, x, y, tracking });
    return `<path fill="${attr(tag, 'fill') || '#000'}" d="${o.d}"/>`;
  });
}
