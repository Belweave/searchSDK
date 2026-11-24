// Colour maths, no dependencies: OKLCH -> sRGB hex (gamut-mapped by chroma reduction) and WCAG 2 contrast.
const toLin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toGam = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
const clamp01 = (v) => Math.min(1, Math.max(0, v));

export const hexToRgb = (hex) => [0, 2, 4].map((i) => parseInt(hex.replace('#', '').slice(i, i + 2), 16) / 255);
const rgbToHex = (rgb) => '#' + rgb.map((v) => Math.round(clamp01(v) * 255).toString(16).padStart(2, '0')).join('').toUpperCase();

export function luminance(hex) {
  const [r, g, b] = hexToRgb(hex).map(toLin);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
export function contrast(a, b) {
  const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}

function oklabToLin([L, a, b]) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}
const inGamut = (lin) => lin.every((v) => v >= -1e-4 && v <= 1 + 1e-4);

/** "oklch(L C H)" -> "#RRGGBB"; chroma is reduced until the colour fits sRGB. */
export function oklchToHex(str) {
  const [L, C, H] = str.match(/oklch\(([^)]+)\)/)[1].trim().split(/\s+/).map(Number);
  const h = (H * Math.PI) / 180;
  const lab = (c) => [L, c * Math.cos(h), c * Math.sin(h)];
  let lo = 0, hi = C;
  if (!inGamut(oklabToLin(lab(C)))) {
    for (let i = 0; i < 30; i++) { const mid = (lo + hi) / 2; if (inGamut(oklabToLin(lab(mid)))) lo = mid; else hi = mid; }
  } else lo = C;
  return rgbToHex(oklabToLin(lab(lo)).map((v) => toGam(clamp01(v))));
}
