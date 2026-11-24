import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * searchSDK's own mark and lockup, inlined from the brand's SVG files (assets/brand/, synced from
 * brand/src by checks/brand.mjs). The outlines and colours are the files' own: never retyped,
 * redrawn or recoloured. Both theme versions are in the markup and the theme shows one, like the
 * provider logos. Sizes below the guidelines' minimums fail the build.
 *
 * The only change to a file is structural: the lockup's mark is nested in its own 64-unit
 * viewport, so the header's one-time intro (bands flowing in from the right, violet last, as in
 * brand/src/motion/mark-intro-*.svg) is clipped to the mark and never crosses the wordmark.
 */

const LOCKUP_UNITS = { width: 369.585, height: 112, clear: 24, mark: 64 } as const;
/** brand/GUIDELINES.md: minimum sizes, in CSS pixels of mark height. */
export const MIN_MARK_PX = { mark: 16, horizontal: 20 } as const;
/** The header lockup's mark. Provider logos are never set taller than this (checked by the crawl). */
export const HEADER_MARK_PX = 28;

const cache = new Map<string, string>();
function source(name: string): string {
  let text = cache.get(name);
  if (!text) {
    text = readFileSync(path.join(process.cwd(), "assets", "brand", name), "utf8");
    cache.set(name, text);
  }
  return text;
}

/** Decorative inside a labelled parent: no title, no role, hidden from assistive technology. */
function quiet(svg: string, attrs: string): string {
  return svg
    .replace(/<title>[^<]*<\/title>/, "")
    .replace(/ role="img" aria-label="[^"]*"/, "")
    .replace("<svg ", `<svg aria-hidden="true" focusable="false" ${attrs} `);
}

function lockupSvg(theme: "dark" | "light", markPx: number): string {
  const svg = source(`horizontal-${theme}.svg`);
  const open = '<g transform="translate(0 0)">';
  const start = svg.indexOf(open);
  const end = svg.indexOf("</g>", start);
  if (start < 0 || end < 0) throw new Error(`assets/brand/horizontal-${theme}.svg: the mark group has moved; update components/brand/searchsdk.tsx.`);
  const nested =
    svg.slice(0, start) +
    `<svg class="ssdk-mark" x="0" y="0" width="${LOCKUP_UNITS.mark}" height="${LOCKUP_UNITS.mark}" viewBox="0 0 ${LOCKUP_UNITS.mark} ${LOCKUP_UNITS.mark}" overflow="hidden"><g>` +
    svg.slice(start + open.length, end) +
    "</g></svg>" +
    svg.slice(end + "</g>".length);
  const scale = markPx / LOCKUP_UNITS.mark;
  const w = +(LOCKUP_UNITS.width * scale).toFixed(2);
  const h = +(LOCKUP_UNITS.height * scale).toFixed(2);
  return quiet(nested, `class="ssdk-svg" data-on="${theme}" width="${w}" height="${h}"`);
}

/**
 * The horizontal lockup with its own clear space (the beam, 3/8 of the mark, on every side). The
 * clear space is kept; `flush` pulls the lockup left by it so the mark lines up with the text edge
 * (the clear space then falls in the page gutter, which stays empty).
 */
export function Lockup({ markPx = HEADER_MARK_PX, intro = false, flush = true }: { markPx?: number; intro?: boolean; flush?: boolean }) {
  if (markPx < MIN_MARK_PX.horizontal) throw new Error(`The horizontal lockup's mark is at least ${MIN_MARK_PX.horizontal}px tall (brand/GUIDELINES.md); got ${markPx}px.`);
  const clear = (LOCKUP_UNITS.clear / LOCKUP_UNITS.mark) * markPx;
  return (
    <span
      className="ssdk-lockup"
      data-intro={intro ? "" : undefined}
      data-mark-px={markPx}
      style={flush ? { marginInline: -clear } : undefined}
    >
      <span dangerouslySetInnerHTML={{ __html: lockupSvg("dark", markPx) + lockupSvg("light", markPx) }} />
      <span className="sr-only">searchSDK</span>
    </span>
  );
}

/** The mark alone. Below 32 px, and at 48 px, the small master (guidelines: whole-pixel edges). */
export function Mark({ px, label }: { px: number; label?: string }) {
  if (px < MIN_MARK_PX.mark) throw new Error(`The mark is at least ${MIN_MARK_PX.mark}px (brand/GUIDELINES.md); got ${px}px.`);
  const master = px < 32 || px === 48 ? "mark-small" : "mark";
  const html = (["dark", "light"] as const).map((t) => quiet(source(`${master}-${t}.svg`), `class="ssdk-svg" data-on="${t}" width="${px}" height="${px}"`)).join("");
  return <span className="ssdk-markbox" data-mark-px={px} role={label ? "img" : undefined} aria-label={label} dangerouslySetInnerHTML={{ __html: html }} />;
}

/**
 * The loader study (brand/src/motion/mark-loader-*.svg): only while something is loading. It is
 * drawn on the main master, so never below 32 px (the small master takes smaller sizes).
 */
export function MarkLoader({ px }: { px: number }) {
  if (px < 32) throw new Error(`The loader uses the mark's main master, which is for 32px and up (brand/GUIDELINES.md); got ${px}px.`);
  const html = (["dark", "light"] as const).map((t) => quiet(source(`mark-loader-${t}.svg`), `class="ssdk-svg" data-on="${t}" width="${px}" height="${px}"`)).join("");
  return <span className="ssdk-markbox ssdk-loader" data-mark-px={px} aria-hidden="true" dangerouslySetInnerHTML={{ __html: html }} />;
}
