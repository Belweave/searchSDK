// The mark, constructed. Every number here is written down in GUIDELINES.md.
// Two masters share one construction:
//   MAIN  on a 64-unit grid. Horizontal edges fall on whole pixels at 32 px and every multiple of 32.
//   SMALL on a 16-unit grid, for 16, 24 and 48 px, where the main master's 22/46 edges would blur.

/** Circle through three points: { cx, cy, r }. */
export function circleThrough([x1, y1], [x2, y2], [x3, y3]) {
  const a = 2 * (x2 - x1), b = 2 * (y2 - y1), c = 2 * (x3 - x1), d = 2 * (y3 - y1);
  const e = x2 * x2 - x1 * x1 + y2 * y2 - y1 * y1, f = x3 * x3 - x1 * x1 + y3 * y3 - y1 * y1;
  const det = a * d - b * c;
  const cx = (e * d - b * f) / det, cy = (a * f - e * c) / det;
  return { cx, cy, r: Math.hypot(x1 - cx, y1 - cy) };
}

/**
 * size  grid size (the mark is size × size)
 * top   apricot base = top of the beam
 * base  cyan top = bottom of the beam
 * crown x where the arc meets the top edge
 * apex  [x, y] of the beam's point; x is also where the arc crosses `top`
 * slope run per unit of rise for the beam's upper edge and the cyan's slanted edge (parallel)
 */
export function construct({ size, top, base, crown, apex, slope }) {
  const [ax, ay] = apex;
  const arc = circleThrough([crown, 0], [ax, top], [0, size]);
  const p = {
    crown: [crown, 0], topRight: [size, 0], apricotRight: [size, top],
    beamTop: [ax + (ay - top) * slope, top], // upper edge of the beam meets the apricot base
    apex, cyanCorner: [(size - base) * slope, base], beamBottom: [size, base],
    bottomRight: [size, size], foot: [0, size], shoulder: [ax, top],
  };
  return { size, top, base, slope, arc, p };
}

export const MAIN = construct({ size: 64, top: 22, base: 46, crown: 24, apex: [12, 40], slope: 2 });
export const SMALL = construct({ size: 16, top: 6, base: 12, crown: 6, apex: [3, 10], slope: 2 });

const n = (v) => +v.toFixed(3);
const pt = ([x, y]) => `${n(x)} ${n(y)}`;

/** Path data: { violet, apricot, cyan, silhouette }. Violet is drawn first and runs one unit under
 *  its neighbours, so shared edges never show a background seam. */
export function paths(g) {
  const { p, arc, top, base, slope } = g;
  const r = n(arc.r);
  const A = `A${r} ${r} 0 0 1`;
  const u = g.size / 64; // underlap, one main-grid unit
  const arcX = (y) => arc.cx - Math.sqrt(arc.r ** 2 - (y - arc.cy) ** 2);
  const lift = top - u; // violet reaches up under the apricot
  const upper = [p.apex[0] + (p.apex[1] - lift) * slope, lift]; // the beam's upper edge, extended
  return {
    violet: `M${pt(p.foot)}${A} ${pt([arcX(lift), lift])}H${n(upper[0])}L${pt(p.apex)}L${pt(p.cyanCorner)}H${n(p.cyanCorner[0] + u * 2)}L${n(u * 2)} ${g.size}Z`,
    apricot: `M${pt(p.crown)}H${g.size}V${top}H${n(p.shoulder[0])}${A} ${pt(p.crown)}Z`,
    cyan: `M${pt(p.cyanCorner)}H${g.size}V${g.size}H0Z`,
    silhouette: `M${pt(p.crown)}H${g.size}V${top}H${n(p.beamTop[0])}L${pt(p.apex)}L${pt(p.cyanCorner)}H${g.size}V${g.size}H0${A} ${pt(p.crown)}Z`,
  };
}
