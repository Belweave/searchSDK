// tokens.json -> resolved values, CSS (brand names and the site's names) and the enforced checks.
import fs from 'node:fs';
import { oklchToHex, contrast } from './colour.mjs';

const ROOT = new URL('../../', import.meta.url).pathname;
export const tokens = JSON.parse(fs.readFileSync(ROOT + 'tokens.json', 'utf8'));

const get = (path) => path.split('.').reduce((o, k) => o?.[k], tokens);
/** Resolve a token value: references, then { $value } objects. */
export function value(v) {
  if (typeof v === 'string' && /^\{.+\}$/.test(v)) return value(get(v.slice(1, -1)));
  if (v && typeof v === 'object' && '$value' in v) return value(v.$value);
  return v;
}
export const role = (theme, name) => value(tokens.theme[theme][name]);
const roles = (theme) => Object.keys(tokens.theme[theme]).filter((k) => !k.startsWith('$'));

/** Every colour with an oklch source must equal its hex. Returns failures. */
export function checkColours() {
  const fails = [];
  const walk = (o, path) => {
    for (const [k, v] of Object.entries(o)) {
      if (k.startsWith('$') || !v || typeof v !== 'object') continue;
      if ('oklch' in v) { const h = oklchToHex(v.oklch); if (h !== v.$value) fails.push(`${path}${k}: ${v.oklch} is ${h}, not ${v.$value}`); }
      else walk(v, `${path}${k}.`);
    }
  };
  walk(tokens, '');
  return fails;
}

/** Contrast table: [{ theme, fg, bg, min, ratio, pass }]. */
export function contrastTable() {
  const rows = [];
  for (const theme of ['dark', 'light']) for (const [fg, bg, min] of tokens.contrast.rules) {
    const ratio = contrast(role(theme, fg), role(theme, bg));
    rows.push({ theme, fg, bg, min, ratio: Math.floor(ratio * 100) / 100, pass: ratio >= min });
  }
  return rows;
}

const flat = (group, prefix) => Object.entries(group).filter(([k]) => !k.startsWith('$'))
  .map(([k, v]) => [`--${prefix}-${k}`, value(v)]);
const block = (sel, decls, comment) => `${comment ? `/* ${comment} */\n` : ''}${sel} {\n${decls.map(([k, v]) => `  ${k}: ${v};`).join('\n')}\n}\n`;
const fontStack = (f) => f.$value.map((n) => (/\s/.test(n) ? `"${n}"` : n)).join(', ');

function shared() {
  const t = tokens;
  return [
    ...flat(t.color.brand, 'brand'),
    ...flat(t.color['brand-paper'], 'brand-paper'),
    ...flat(t.color.ink, 'ink'),
    ...flat(t.color.paper, 'paper'),
    ['--font-sans', fontStack(t.font.sans)], ['--font-mono', fontStack(t.font.mono)],
    ...flat(t.type.size, 'type'), ...flat(t.type.leading, 'leading'), ...flat(t.type.weight, 'weight'), ...flat(t.type.tracking, 'tracking'),
    ['--mono-stretch', value(t.type['mono-stretch'])],
    ['--space-unit', t.space.unit], ...flat(t.space.scale, 'space'), ['--space-gutter', t.space.gutter], ['--space-section', t.space.section],
    ['--page-max', t.space['page-max']], ['--measure', t.space.measure],
    ...flat(t.radius, 'radius'), ['--focus-width', t.focus.width], ['--focus-offset', t.focus.offset],
    ...flat(t.motion.duration, 'duration'), ...flat(t.motion.easing, 'ease'), ['--reveal-distance', t.motion.distance.reveal],
  ];
}
const themeDecls = (theme) => roles(theme).map((k) => [`--${k}`, value(tokens.theme[theme][k])]);

const REDUCED = `@media (prefers-reduced-motion: reduce) {\n  :root {\n${Object.keys(tokens.motion.duration).map((k) => `    --duration-${k}: 0.01ms;`).join('\n')}\n  }\n}\n`;

const HEADER = (what) => `/* searchSDK ${what}. Generated from brand/tokens.json by \`npm run build\`; do not edit. */\n\n`;

/** brand/tokens.css: brand names. Dark is :root; light is [data-theme="light"]. */
export function brandCss() {
  return HEADER('design tokens') +
    block(':root', [['color-scheme', 'dark'], ...shared(), ...themeDecls('dark')], 'Primitives and the dark theme (default)') + '\n' +
    block(':root[data-theme="light"]', [['color-scheme', 'light'], ...themeDecls('light')], 'Light theme') + '\n' +
    REDUCED;
}

// The site's token names (site/styles/tokens.css), mapped to brand values. Provider hues, the
// spectrum, glow, backdrop and the stage/key depth values stay owned by the site and are not here.
const SITE = {
  shared: (t) => [
    ['--type-prose', `var(--font-prose-face, "Instrument Sans"), ui-sans-serif, system-ui, sans-serif`],
    ['--type-mono', `var(--font-mono-face, "Martian Mono"), ui-monospace, monospace`],
    ...['xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl', 'display', 'h2', 'lead', 'label', 'readout'].map((k) => [`--type-${k}`, t.type.size[k]]),
    ...Object.entries(t.type.leading).map(([k, v]) => [`--type-leading-${k}`, v]),
    ...Object.entries(t.type.weight).map(([k, v]) => [`--type-weight-${k}`, v]),
    ...Object.entries(t.type.tracking).map(([k, v]) => [`--type-tracking-${k}`, v]),
    ['--type-mono-stretch', value(t.type['mono-stretch'])],
    ['--space-unit', t.space.unit], ['--space-gutter', t.space.gutter], ['--space-section', t.space.section],
    ['--layout-page-max', t.space['page-max']], ['--layout-measure', t.space.measure],
    ['--corner-sm', t.radius.sm], ['--corner-md', t.radius.md], ['--corner-lg', t.radius.lg],
    ['--focus-width', t.focus.width], ['--focus-offset', t.focus.offset],
    ...['instant', 'fast', 'base', 'slow', 'reveal', 'settle', 'stagger', 'blink', 'mark-band', 'mark-loop'].map((k) => [`--motion-${k}`, t.motion.duration[k]]),
    ...Object.entries(t.motion.easing).map(([k, v]) => [`--motion-ease-${k}`, v]),
    ['--motion-reveal-distance', t.motion.distance.reveal],
  ],
  theme: (th) => {
    const R = (n) => role(th, n);
    return [
      ...['surface-0', 'surface-1', 'surface-2', 'surface-3', 'well', 'edge', 'edge-lit', 'line', 'line-strong', 'fg', 'fg-muted', 'fg-subtle'].map((k) => [`--${k}`, R(k)]),
      ['--grid-dot', R('line')],
      ['--beam', R('accent')], ['--on-beam', R('on-accent')],
      ['--accent', R('accent')], ['--accent-strong', R('accent-strong')], ['--accent-text', R('accent-text')], ['--on-accent', R('on-accent')],
      ['--selection', R('selection')],
      ...['ok', 'warn', 'danger', 'sample', 'on-state'].map((k) => [`--${k}`, R(k)]),
      ['--danger', R('danger')],
      ['--code-bg', R('well')], ['--code-fg', R('fg')], ['--code-comment', R('fg-subtle')],
      ...['keyword', 'string', 'number', 'function', 'type'].map((k) => [`--code-${k}`, R(`code-${k}`)]),
      ['--code-punctuation', R('fg-muted')],
      ['--focus', R('focus')],
      ['--brand-apricot', R('mark-apricot')], ['--brand-violet', R('mark-violet')], ['--brand-cyan', R('mark-cyan')],
    ].filter(([k], i, a) => a.findIndex(([j]) => j === k) === i);
  },
};

/** brand/tokens.site.css: the same values under the site's existing names. */
export function siteCss() {
  return HEADER('tokens under the website\'s names (site/styles/tokens.css)') +
    '/* Site-owned, not defined here: --hue-*, --spectrum*, --glow-strength, --backdrop-opacity,\n   --key-wall, --key-travel, --slab-wall, --stage-tilt, --stage-perspective. */\n\n' +
    block(':root', [['color-scheme', 'dark'], ...SITE.shared(tokens), ...SITE.theme('dark')]) + '\n' +
    block(':root[data-theme="light"]', [['color-scheme', 'light'], ...SITE.theme('light')]) + '\n' +
    `@media (prefers-reduced-motion: reduce) {\n  :root {\n${Object.keys(tokens.motion.duration).map((k) => `    --motion-${k}: 0.01ms;`).join('\n')}\n  }\n}\n`;
}
