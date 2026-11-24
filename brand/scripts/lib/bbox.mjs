// Exact bounding box of absolute SVG path data for M, L, H, V, Q and C commands (font glyphs and the mark's polygons; no arcs).
export function bbox(d) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  const add = (x, y) => { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); };
  let cx = 0, cy = 0;
  for (const [, cmd, args] of d.matchAll(/([MLHVQCZ])([^MLHVQCZ]*)/gi)) {
    const a = (args.match(/-?\d*\.?\d+(?:e-?\d+)?/gi) || []).map(Number);
    if (cmd === 'M' || cmd === 'L') for (let i = 0; i < a.length; i += 2) { cx = a[i]; cy = a[i + 1]; add(cx, cy); }
    else if (cmd === 'H') { cx = a[0]; add(cx, cy); }
    else if (cmd === 'V') { cy = a[0]; add(cx, cy); }
    else if (cmd === 'Q') for (let i = 0; i < a.length; i += 4) {
      const [qx, qy, ex, ey] = a.slice(i, i + 4);
      const at = (t) => [(1 - t) ** 2 * cx + 2 * (1 - t) * t * qx + t * t * ex, (1 - t) ** 2 * cy + 2 * (1 - t) * t * qy + t * t * ey];
      for (const [p0, p1, p2] of [[cx, qx, ex], [cy, qy, ey]]) {
        const den = p0 - 2 * p1 + p2;
        if (den !== 0) { const t = (p0 - p1) / den; if (t > 0 && t < 1) add(...at(t)); }
      }
      cx = ex; cy = ey; add(cx, cy);
    } else if (cmd === 'C') for (let i = 0; i < a.length; i += 6) {
      const [c1x, c1y, c2x, c2y, ex, ey] = a.slice(i, i + 6);
      for (let k = 1; k < 64; k++) { const t = k / 64, u = 1 - t; add(u ** 3 * cx + 3 * u * u * t * c1x + 3 * u * t * t * c2x + t ** 3 * ex, u ** 3 * cy + 3 * u * u * t * c1y + 3 * u * t * t * c2y + t ** 3 * ey); }
      cx = ex; cy = ey; add(cx, cy);
    }
  }
  return { x: x0, y: y0, width: x1 - x0, height: y1 - y0, right: x1, bottom: y1 };
}
