// Logo mark studies. Every mark is drawn on a 64 × 64 grid from explicit geometry.
// Stroke logic: bands are 6–10 units (1.5–2.5 px at 16 px); gaps between bands are
// at least 4 units (1 px at 16 px) so the single-colour form keeps its structure.
// Colour tokens: {s1}…{s6} are spectrum bands, {beam} is the converged answer.

const f = (n) => +n.toFixed(2);
const rad = (a) => (a * Math.PI) / 180;
const pt = (cx, cy, r, a) => [f(cx + r * Math.cos(rad(a))), f(cy + r * Math.sin(rad(a)))];

const line = (x1, y1, x2, y2, c, w, cap = 'round') =>
  `<path d="M${f(x1)} ${f(y1)}L${f(x2)} ${f(y2)}" style="fill:none;stroke:${c};stroke-width:${w};stroke-linecap:${cap}"/>`;
const path = (d, c, w, cap = 'round', join = 'round') =>
  `<path d="${d}" style="fill:none;stroke:${c};stroke-width:${w};stroke-linecap:${cap};stroke-linejoin:${join}"/>`;
const shape = (d, c) => `<path d="${d}" style="fill:${c}"/>`;
const dot = (cx, cy, r, c) => `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}" style="fill:${c}"/>`;
// Arc from angle a0 to a1 (degrees, clockwise on screen).
function arc(cx, cy, r, a0, a1) {
  const [x0, y0] = pt(cx, cy, r, a0), [x1, y1] = pt(cx, cy, r, a1);
  return `M${x0} ${y0}A${f(r)} ${f(r)} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1} ${y1}`;
}
const S = (n) => Array.from({ length: n }, (_, i) => `{s${i + 1}}`);

// Centre line of an S built from two opposed 270° arcs, offset by d (lanes).
// Top circle centre (32, 32 − R), bottom (32, 32 + R). A lane offset outward on
// the top arc is offset inward on the bottom arc, as parallel curves must be.
function sPath(R, d = 0) {
  const rt = R + d, rb = R - d, ct = 32 - R, cb = 32 + R;
  return `M${f(32 + rt)} ${f(ct)}A${f(rt)} ${f(rt)} 0 1 0 32 ${f(ct + rt)}`
    + `A${f(rb)} ${f(rb)} 0 1 1 ${f(32 - rb)} ${f(cb)}`;
}

// Arc along the S centre line from parameter p0 to p1 (degrees, 0–540).
// 0–270 runs anticlockwise round the top circle from its right side to the waist;
// 270–540 runs clockwise round the bottom circle from the waist to its left side.
function sArc(R, p0, p1) {
  const top = (p) => pt(32, 32 - R, R, -p), bot = (p) => pt(32, 32 + R, R, -90 + (p - 270));
  const at = (p) => (p <= 270 ? top(p) : bot(p));
  let d = `M${at(p0).join(' ')}`;
  if (p0 < 270) {
    const e = Math.min(p1, 270);
    d += `A${R} ${R} 0 ${e - p0 > 180 ? 1 : 0} 0 ${top(e).join(' ')}`;
  }
  if (p1 > 270) {
    const s0 = Math.max(p0, 270);
    d += `A${R} ${R} 0 ${p1 - s0 > 180 ? 1 : 0} 1 ${bot(p1).join(' ')}`;
  }
  return d;
}

export const MARKS = [
  // ── A. Converging lines ────────────────────────────────────────────────
  {
    id: 'A1', idea: 'A', name: 'Fan-in',
    caption: 'Four sources meet. One beam leaves.',
    body() {
      const ys = [10, 24.67, 39.33, 54];
      return ys.map((y, i) => line(8, y, 40, 32, S(4)[i], 6)).join('') + line(40, 32, 56, 32, '{beam}', 8);
    },
  },
  {
    id: 'A2', idea: 'A', name: 'Merge',
    caption: 'Parallel lanes bend into one.',
    body() {
      const ys = [14, 26, 38, 50];
      return ys.map((y, i) => path(`M6 ${y}H16C28 ${y} 28 32 40 32`, S(4)[i], 7)).join('')
        + line(38, 32, 58, 32, '{beam}', 8);
    },
  },
  {
    id: 'A3', idea: 'A', name: 'Narrowing',
    caption: 'Three chevrons tighten to a point.',
    dropped: 'Reads as a fast-forward control. No sources.',
    body() {
      const cs = [[30, 20], [45, 14], [58, 8]];
      return cs.map(([x, h], i) => path(`M${x - h} ${32 - h}L${x} 32L${x - h} ${32 + h}`, i === 2 ? '{beam}' : S(2)[i], 7)).join('');
    },
  },
  {
    id: 'A4', idea: 'A', name: 'Rays',
    caption: 'Seven fine rays into one point.',
    dropped: 'Fails at 16 px: 3-unit rays fall below one pixel and blur.',
    body() {
      const out = [];
      [-45, -30, -15, 0, 15, 30, 45].forEach((a, i) => {
        const [x, y] = pt(48, 32, 42, 180 + a), [x2, y2] = pt(48, 32, 9, 180 + a);
        out.push(line(x, y, x2, y2, S(7)[i % 6], 3));
      });
      return out.join('') + dot(48, 32, 8, '{beam}');
    },
  },
  {
    id: 'A5', idea: 'A', name: 'Node',
    caption: 'Three sources, one answer.',
    body() {
      return [12, 32, 52].map((y, i) => line(8, y, 42, 32, S(3)[i], 7)).join('') + dot(44, 32, 11, '{beam}');
    },
  },

  // ── B. Spectrum S ──────────────────────────────────────────────────────
  {
    id: 'B1', idea: 'B', name: 'Three-lane S',
    caption: 'Three parallel lanes form the letter.',
    dropped: 'Fails at 16 px: half-pixel gaps close; the lanes merge.',
    body() {
      return [-7, 0, 7].map((d, i) => path(sPath(11, d), S(3)[i], 5, 'butt')).join('');
    },
  },
  {
    id: 'B2', idea: 'B', name: 'Two-lane S',
    caption: 'Two lanes, swapping sides at the waist.',
    body() {
      return [-5, 5].map((d, i) => path(sPath(11, d), S(3)[i * 2], 6, 'butt')).join('');
    },
  },
  {
    id: 'B3', idea: 'B', name: 'Spectrum S',
    caption: 'One stroke, read through five hues.',
    body() {
      // Five arcs along the centre line (540° in all), split by 12.4° gaps (2.6 units,
      // about 0.65 px at 16 px; the hue change carries the split in colour).
      // The middle arc is centred on the waist so the spine is never cut.
      const g = 12.4, seg = (540 - 4 * g) / 5;
      return S(5).map((c, i) => path(sArc(12, i * (seg + g), i * (seg + g) + seg), c, 10, 'butt')).join('');
    },
  },
  {
    id: 'B4', idea: 'B', name: 'Sliced S',
    caption: 'A heavy S cut into three bands.',
    body(uid) {
      const bands = [[2, 19.5], [22.5, 41.5], [44.5, 62]];
      const defs = bands.map(([y0, y1], i) => `<clipPath id="${uid}-b${i}"><rect x="0" y="${y0}" width="64" height="${f(y1 - y0)}"/></clipPath>`).join('');
      return `<defs>${defs}</defs>` + bands.map((_, i) =>
        `<g clip-path="url(#${uid}-b${i})">${path(sPath(11), S(3)[i], 13, 'butt')}</g>`).join('');
    },
  },

  // ── C. Lens or aperture ────────────────────────────────────────────────
  {
    id: 'C1', idea: 'C', name: 'Spectrum lens',
    caption: 'A search lens; the ring is six hues.',
    body() {
      const out = [];
      for (let i = 0; i < 6; i++) {
        const a0 = 45 + i * 60 + 8, a1 = 45 + (i + 1) * 60 - 8; // gaps centred on 45° + k·60°
        out.push(path(arc(27, 27, 17, a0, a1), S(6)[i], 7, 'butt'));
      }
      return out.join('') + line(47.5, 47.5, 56, 56, '{beam}', 9);
    },
  },
  {
    id: 'C2', idea: 'C', name: 'Iris',
    caption: 'Six blades, each a hue, around an open centre.',
    body(uid) {
      const R = 29, r = 11, gap = 4;
      const t = Math.sqrt(R * R - r * r);
      const blades = [], cuts = [];
      for (let k = 0; k < 6; k++) {
        const a = -90 + k * 60, b = a + 60;
        const T0 = pt(32, 32, r, a), T1 = pt(32, 32, r, b);
        const dir = (q) => [-Math.sin(rad(q)), Math.cos(rad(q))];
        const [dx0, dy0] = dir(a), [dx1, dy1] = dir(b);
        const O0 = [f(T0[0] + t * dx0), f(T0[1] + t * dy0)], O1 = [f(T1[0] + t * dx1), f(T1[1] + t * dy1)];
        blades.push(shape(`M${T0}L${O0}A${R} ${R} 0 0 1 ${O1}L${T1}A${r} ${r} 0 0 0 ${T0}Z`.replace(/,/g, ' '), S(6)[k]));
        cuts.push(`<path d="M${T0[0]} ${T0[1]}L${f(T0[0] + (t + 4) * dx0)} ${f(T0[1] + (t + 4) * dy0)}" style="stroke:#000;stroke-width:${gap};stroke-linecap:square"/>`);
      }
      return `<defs><mask id="${uid}-m" maskUnits="userSpaceOnUse" x="0" y="0" width="64" height="64"><rect width="64" height="64" fill="#fff"/>${cuts.join('')}</mask></defs><g mask="url(#${uid}-m)">${blades.join('')}</g>`;
    },
  },
  {
    id: 'C3', idea: 'C', name: 'Optic',
    caption: 'Parallel rays pass a lens and focus.',
    body() {
      const rays = [20, 32, 44].map((y, i) => path(`M6 ${y}H30L56 32`, S(3)[i], 6));
      const lens = shape('M31 8A44 44 0 0 1 31 56A44 44 0 0 1 31 8Z', '{beam}');
      return rays.join('') + lens;
    },
  },
  {
    id: 'C4', idea: 'C', name: 'Shutter',
    caption: 'Six hued blades around a hexagonal opening.',
    dropped: 'Weak: the blades scatter and no lens reads.',
    body() {
      const R = 22, w = 7;
      const V = Array.from({ length: 6 }, (_, k) => pt(32, 32, R, -90 + k * 60));
      const out = [];
      for (let k = 0; k < 6; k++) {
        const [x0, y0] = V[k], [x1, y1] = V[(k + 1) % 6];
        const len = Math.hypot(x1 - x0, y1 - y0), ux = (x1 - x0) / len, uy = (y1 - y0) / len;
        out.push(line(x0 + ux * 9, y0 + uy * 9, x1 + ux * 6, y1 + uy * 6, S(6)[k], w, 'butt'));
      }
      return out.join('');
    },
  },
];

// Colour slots (1-based) into a palette's twelve provider hues, per band count.
export const SLOTS = { 2: [2, 10], 3: [2, 7, 10], 4: [2, 4, 7, 10], 5: [2, 4, 6, 8, 10], 6: [2, 4, 6, 8, 10, 12], 7: [2, 4, 6, 8, 10, 12, 1] };

export function bandCount(mark) {
  const m = mark.body('x').match(/\{s(\d)\}/g) || [];
  return Math.max(...m.map((s) => +s[2]));
}

// Fill tokens for one variant. theme: 'dark' | 'light' | 'mono'.
export function render(mark, { palette, theme, uid, standalone = false, size }) {
  let body = mark.body(uid);
  const n = bandCount(mark);
  if (theme === 'mono') {
    body = body.replace(/\{(s\d|beam)\}/g, 'currentColor');
  } else {
    const hues = palette.providers[theme];
    const slots = SLOTS[n];
    body = body.replace(/\{s(\d)\}/g, (_, i) => hues[slots[i - 1] - 1]);
    body = body.replace(/\{beam\}/g, palette[theme].fg);
  }
  const dims = size ? ` width="${size}" height="${size}"` : '';
  const ns = standalone ? ' xmlns="http://www.w3.org/2000/svg"' : '';
  return `<svg${ns} viewBox="0 0 64 64"${dims} role="img" aria-label="searchSDK mark study ${mark.id}">${body}</svg>`;
}
