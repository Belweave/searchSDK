// Palette studies P1–P2: neutrals, one accent, twelve provider hues.
// Provider hues are searched, not picked by eye: twelve shared hue angles,
// with a lightness per theme, chosen to maximise the smallest CIEDE2000
// difference between any two hues, for normal vision and for simulated
// protanopia, deuteranopia and tritanopia, on both dark and light surfaces.
// Deterministic (seeded). Run: node brand/studies/tools/palettes.mjs
// A third system, Sonar (deep blue-green, cyan accent #3FE0F5), was tested and cut:
// keeping provider hues clear of a cyan accent dropped the worst-case separation
// to about 4 ΔE00 under simulated colour-vision deficiency, against about 6.6 here.

import { writeFileSync } from 'node:fs';
import { oklch, hexToOklch, contrast, labAs, deltaE2000, simulateHex, VISIONS } from './colour.mjs';

export const PALETTES = [
  {
    id: 'P1', name: 'Beam',
    idea: 'Graphite. The accent is the beam itself: white on dark, ink on light. Only providers carry hue.',
    dark: { bg: '#0C0E12', raised: '#151820', line: '#2A2F3A', fg: '#EEF1F5', muted: '#A9B0BC', subtle: '#808896', accent: '#F4F6F9', onAccent: '#0C0E12', accentText: '#F4F6F9' },
    light: { bg: '#F5F6F8', raised: '#FFFFFF', line: '#D8DCE3', fg: '#0E1116', muted: '#484F5B', subtle: '#5F6773', accent: '#0E1116', onAccent: '#F5F6F8', accentText: '#0E1116' },
    hues: { dark: { L: [0.72, 0.86], C: 0.19 }, light: { L: [0.47, 0.66], C: 0.2 }, avoid: null },
  },
  {
    id: 'P2', name: 'Volt',
    idea: 'Warm carbon with one electric accent; provider hues sit softer. On light, volt is a fill behind ink, never a line.',
    dark: { bg: '#100F0C', raised: '#1A1915', line: '#302E28', fg: '#F2F0E8', muted: '#B4AFA2', subtle: '#8C877B', accent: '#D6F542', onAccent: '#100F0C', accentText: '#D6F542' },
    light: { bg: '#F4F2EA', raised: '#FBFAF5', line: '#DAD6C9', fg: '#16150F', muted: '#4E4A3F', subtle: '#69655A', accent: '#D6F542', onAccent: '#16150F', accentText: '#4D6000' },
    hues: { dark: { L: [0.7, 0.85], C: 0.15 }, light: { L: [0.46, 0.64], C: 0.16 }, avoid: '#D6F542' },
  },
];

const N = 12;
const MIN_TEXT = 4.5;   // dark-surface hues double as text labels
const MIN_GRAPHIC = 3;  // light-surface hues are for lines and bars (WCAG 1.4.11)

function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}

function build(p, state) {
  const dark = state.map((c) => oklch(c.ld, p.hues.dark.C, c.h));
  const light = state.map((c) => oklch(c.ll, p.hues.light.C, c.h));
  return { dark, light };
}

function score(p, state) {
  const { dark, light } = build(p, state);
  let penalty = 0;
  dark.forEach((hex, i) => {
    const k = contrast(hex, p.dark.bg); if (k < MIN_TEXT) penalty += (MIN_TEXT - k) * 20;
    const [L, C] = hexToOklch(hex);
    if (C < 0.1) penalty += 10;
    // Yellows below this lightness turn olive on a dark surface.
    const h = state[i].h; if (h > 80 && h < 120 && L < 0.82) penalty += (0.82 - L) * 200;
  });
  light.forEach((hex) => {
    const k = contrast(hex, p.light.bg); if (k < MIN_GRAPHIC) penalty += (MIN_GRAPHIC - k) * 20;
    if (hexToOklch(hex)[1] < 0.08) penalty += 10;
  });
  if (p.hues.avoid) {
    // Keep provider hues clear of the brand accent, per theme.
    for (const [set, t] of [[dark, 'dark'], [light, 'light']]) {
      const refs = [p[t].accent, p[t].accentText].map((h) => labAs(h, 'normal'));
      set.forEach((hex) => refs.forEach((a) => {
        const d = deltaE2000(labAs(hex, 'normal'), a); if (d < 15) penalty += (15 - d);
      }));
    }
  }
  // A spectrum, not a cluster: no gap between neighbouring hue angles over 45°.
  const hs = state.map((c) => c.h).sort((a, b) => a - b);
  hs.forEach((h, i) => {
    const gap = (i === hs.length - 1 ? hs[0] + 360 : hs[i + 1]) - h;
    if (gap > 45) penalty += (gap - 45) * 0.25;
  });
  let min = Infinity;
  for (const set of [dark, light]) {
    for (const v of VISIONS) {
      const labs = set.map((hex) => labAs(hex, v));
      for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) {
        const d = deltaE2000(labs[i], labs[j]); if (d < min) min = d;
      }
    }
  }
  return min - penalty;
}

export function optimise(p, seed) {
  const r = rng(seed);
  const [d0, d1] = p.hues.dark.L, [l0, l1] = p.hues.light.L;
  let state = Array.from({ length: N }, (_, i) => ({
    h: (i * 360) / N + 15,
    ld: i % 2 ? d1 - 0.02 : d0 + 0.03,
    ll: i % 2 ? l0 + 0.02 : l1 - 0.03,
  }));
  let best = score(p, state), bestState = state.map((c) => ({ ...c }));
  let cur = best, T = 2;
  for (let it = 0; it < 26000; it++) {
    const next = state.map((c) => ({ ...c }));
    const c = next[Math.floor(r() * N)];
    const k = r();
    if (k < 0.5) c.h = (c.h + (r() - 0.5) * 24 + 360) % 360;
    else if (k < 0.75) c.ld = Math.min(d1, Math.max(d0, c.ld + (r() - 0.5) * 0.06));
    else c.ll = Math.min(l1, Math.max(l0, c.ll + (r() - 0.5) * 0.06));
    const s = score(p, next);
    if (s > cur || r() < Math.exp((s - cur) / T)) { state = next; cur = s; }
    if (cur > best) { best = cur; bestState = state.map((x) => ({ ...x })); }
    T = Math.max(0.02, T * 0.9997);
  }
  return { best, state: bestState.sort((a, b) => a.h - b.h) };
}

export function report(p, state) {
  const { dark, light } = build(p, state);
  const pairs = (set) => {
    const out = {};
    for (const v of VISIONS) {
      const labs = set.map((hex) => labAs(hex, v));
      let min = Infinity, at = null, close = 0;
      for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) {
        const d = deltaE2000(labs[i], labs[j]);
        if (d < min) { min = d; at = [i + 1, j + 1]; }
        if (d < 10) close++;
      }
      out[v] = { min: +min.toFixed(1), closest: at, under10: close };
    }
    return out;
  };
  const neutral = (t) => {
    const s = p[t];
    return {
      'fg on bg': contrast(s.fg, s.bg), 'fg on raised': contrast(s.fg, s.raised),
      'muted on bg': contrast(s.muted, s.bg), 'muted on raised': contrast(s.muted, s.raised),
      'subtle on bg': contrast(s.subtle, s.bg), 'subtle on raised': contrast(s.subtle, s.raised),
      'accent text on bg': contrast(s.accentText, s.bg), 'text on accent': contrast(s.onAccent, s.accent),
    };
  };
  const round = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, +v.toFixed(2)]));
  return {
    ...p,
    providers: {
      hue: state.map((c) => +c.h.toFixed(1)),
      dark, light,
      sim: Object.fromEntries(['protan', 'deutan', 'tritan'].map((v) => [v, { dark: dark.map((h) => simulateHex(h, v)), light: light.map((h) => simulateHex(h, v)) }])),
      contrastDark: dark.map((h) => +contrast(h, p.dark.bg).toFixed(2)),
      contrastLight: light.map((h) => +contrast(h, p.light.bg).toFixed(2)),
      separation: { dark: pairs(dark), light: pairs(light) },
    },
    contrast: { dark: round(neutral('dark')), light: round(neutral('light')) },
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const out = PALETTES.map((p, i) => {
    let top = null;
    for (const seed of [11, 23, 37, 51]) {
      const r = optimise(p, seed * (i + 1));
      if (!top || r.best > top.best) top = r;
    }
    console.error(p.id, 'score', top.best.toFixed(2));
    return report(p, top.state);
  });
  const file = new URL('../palettes.json', import.meta.url);
  writeFileSync(file, JSON.stringify(out, null, 2) + '\n');
  for (const p of out) {
    console.log(p.id, p.name, JSON.stringify(p.contrast));
    console.log('  dark ', p.providers.dark.join(' '), JSON.stringify(p.providers.separation.dark));
    console.log('  light', p.providers.light.join(' '), JSON.stringify(p.providers.separation.light));
    console.log('  min contrast dark', Math.min(...p.providers.contrastDark), 'light', Math.min(...p.providers.contrastLight));
  }
}
