// Token discipline and the brand's mechanical "never" rules, on source.
//   node checks/source.mjs
// Scans app/, components/, lib/, content/ and source.config.ts for colour literals, Tailwind
// palette classes, named font families and hard-coded durations or easings in styles; colours,
// fonts and motion come only from styles/brand.css (synced from brand/) and styles/tokens.css.
// Then the brand rules (brand/GUIDELINES.md) that can be read from source:
//   - styles/tokens.css never redefines a brand token (the brand is the one source of its values);
//   - brand colours meet at hard edges, never blended: a gradient that names one uses hard stops;
//   - no glow, shadow, blur, opacity, rotation or scaling on searchSDK's mark (.ssdk-*);
//   - the mark and lockup are drawn only from the brand's files, by components/brand/searchsdk.tsx;
//   - provider hues never decorate: only lib/ resolves --hue-* tokens, for a provider's identity;
//   - brand colours never encode data: no provider hue or lane is a brand colour;
//   - the name is written searchSDK in source copy (strings and MDX prose, not identifiers).
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SCAN = ["app", "components", "lib", "content", "source.config.ts"];
const EXTENSIONS = /\.(tsx?|css|mdx?|mjs)$/;

const RULES = [
  { name: "colour literal", re: /#[0-9a-fA-F]{3,8}\b(?![-\w])|\b(?:rgba?|hsla?|oklch|oklab|lab|lch|hwb)\(/g },
  {
    name: "Tailwind palette colour",
    re: /\b(?:bg|text|border|fill|stroke|ring|outline|decoration|from|to|via|accent|caret|shadow|divide)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|black|white)\b/g,
  },
  { name: "named font", re: /\b(?:Inter|JetBrains|Helvetica|Arial|Roboto|Menlo|Consolas|Courier|Georgia|Times New Roman|SF Mono|Segoe)\b/g },
  { name: "font-family without a token", re: /font-family\s*:(?!\s*var\()/g },
  { name: "hard-coded easing", re: /cubic-bezier\(/g },
  { name: "hard-coded duration in a style", re: /(?:transition|animation)[\w-]*\s*:[^;{}]*\b\d+(?:\.\d+)?m?s\b/g },
  { name: "Tailwind duration class", re: /\bduration-\d+\b/g },
];

// Allowed exceptions, each with its reason.
const ALLOW = [
  // The global reduced-motion rule sets near-zero durations on purpose.
  { file: "app/globals.css", rule: "hard-coded duration in a style", text: "0.01ms" },
  // The same rule removes stagger delays so reduced-motion content appears at once.
  { file: "app/globals.css", rule: "hard-coded duration in a style", text: "transition-delay: 0s !important" },
];

const BRAND_COLOUR = /var\(--(?:brand-(?:apricot|violet|cyan)|accent(?:-strong|-text)?|beam|focus|selection|mark-(?:apricot|violet|cyan))\)/;

/** Top-level comma split of a function's arguments. */
function args(text) {
  const out = [];
  let depth = 0;
  let cur = "";
  for (const ch of text) {
    if (ch === "(") depth += 1;
    if (ch === ")") depth -= 1;
    if (ch === "," && depth === 0) {
      out.push(cur.trim());
      cur = "";
    } else cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

/** Every *-gradient( … ) in a text, with its argument string. */
function gradients(text) {
  const out = [];
  for (const m of text.matchAll(/(?:repeating-)?(?:linear|radial|conic)-gradient\(/g)) {
    let depth = 1;
    let i = m.index + m[0].length;
    const start = i;
    while (i < text.length && depth) {
      if (text[i] === "(") depth += 1;
      if (text[i] === ")") depth -= 1;
      i += 1;
    }
    out.push({ index: m.index, body: text.slice(start, i - 1) });
  }
  return out;
}

const lineOf = (text, index) => text.slice(0, index).split("\n").length;

/** Custom properties declared in a CSS text. */
const declared = (css) => new Set([...css.matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1]));

async function brandRules(scanned) {
  const failures = [];
  const brandCss = await readFile(path.join(ROOT, "styles", "brand.css"), "utf8");
  const siteCss = await readFile(path.join(ROOT, "styles", "tokens.css"), "utf8");
  const brandNames = declared(brandCss);
  for (const name of declared(siteCss)) {
    if (brandNames.has(name)) failures.push(`styles/tokens.css redefines ${name}, which the brand defines (styles/brand.css); change it in brand/`);
  }
  for (const m of siteCss.matchAll(/(--hue-[\w-]+)\s*:\s*([^;]+);/g)) {
    if (BRAND_COLOUR.test(m[2])) failures.push(`styles/tokens.css: ${m[1]} is a brand colour; brand colours never encode data`);
  }

  for (const [file, text] of [["styles/tokens.css", siteCss], ...scanned]) {
    // Brand colours never blended: in a gradient that names one, every colour stop is a flat band
    // with a start and an end position.
    if (/\.(css|tsx?)$/.test(file)) {
      for (const g of gradients(text)) {
        if (!BRAND_COLOUR.test(g.body) && !/var\(--spectrum/.test(g.body)) continue;
        const stops = args(g.body).filter((a) => !/^(?:to\s|\d+(?:\.\d+)?deg|circle|ellipse|at\s|from\s)/.test(a));
        const soft = stops.filter((a) => !/\)\s+\S+\s+\S+$/.test(a));
        if (soft.length) failures.push(`${file}:${lineOf(text, g.index)}: a gradient blends a brand colour (“${soft[0]}”); brand colours meet at hard edges`);
      }
    }
    if (file.endsWith(".css")) {
      // No effects on the mark: rules whose selector names .ssdk- set no filter, shadow, opacity,
      // blend, clip, mask, rotation or scale.
      for (const m of text.matchAll(/([^{}]*\.ssdk-[^{}]*)\{([^{}]*)\}/g)) {
        const bad = m[2].match(/(?:^|;|\s)(filter|backdrop-filter|box-shadow|text-shadow|opacity|mix-blend-mode|clip-path|mask[\w-]*|rotate|scale)\s*:|transform\s*:[^;]*(?:rotate|scale|skew|matrix)/);
        if (bad) failures.push(`${file}:${lineOf(text, m.index + m[0].search(/\S/))}: “${bad[0].trim()}” on searchSDK's mark; never add effects, rotate or scale it`);
      }
    }
    // The mark comes only from the brand's files, through one component.
    if (file !== "components/brand/searchsdk.tsx" && /assets\/brand\/|(?:horizontal|mark(?:-small|-loader)?)-(?:dark|light)\.svg/.test(text)) {
      failures.push(`${file}: draws searchSDK's mark or lockup itself; use components/brand/searchsdk.tsx`);
    }
    // Provider hues identify providers (lib/ resolves them for a provider); they never decorate.
    if (!file.startsWith("lib/") && /var\(--hue-/.test(text)) failures.push(`${file}: uses a provider hue directly; hues only identify a provider, through its brand (lib/provider-assets.ts)`);
    // A lane is a provider's hue, never a brand colour.
    for (const m of text.matchAll(/--lane["']?\s*:\s*["']?([^;,}"']+)/g)) {
      if (BRAND_COLOUR.test(m[1])) failures.push(`${file}:${lineOf(text, m.index)}: a lane coloured with a brand colour; brand colours never encode data`);
    }
    // The name in source copy: string literals, JSX text and MDX prose (not code or identifiers).
    if (/\.(tsx|mdx?)$/.test(file)) {
      const copy = text
        .replace(/```[\s\S]*?```/g, " ")
        .replace(/`[^`\n]*`/g, " ")
        .replace(/import[^;]+;/g, " ")
        .replace(/https?:\/\/\S+/g, " ")
        .replace(/[\w./-]*searchsdk[\w./-]*/g, (w) => (/[./-]/.test(w) || w === "searchsdk" ? " " : w));
      for (const m of copy.matchAll(/search[\s_-]?sdk/gi)) {
        if (m[0] !== "searchSDK") failures.push(`${file}: writes the name as “${m[0]}”; it is always searchSDK`);
      }
    }
  }
  return failures;
}

async function files(entry) {
  const full = path.join(ROOT, entry);
  const stat = await import("node:fs/promises").then((fs) => fs.stat(full));
  if (stat.isFile()) return [entry];
  const out = [];
  for (const child of await readdir(full, { withFileTypes: true })) {
    const rel = path.join(entry, child.name);
    if (child.isDirectory()) out.push(...(await files(rel)));
    else if (EXTENSIONS.test(child.name)) out.push(rel);
  }
  return out;
}

export async function checkSource() {
  const failures = [];
  let scanned = 0;
  const texts = [];
  for (const entry of SCAN) {
    for (const file of await files(entry)) {
      scanned += 1;
      const text = await readFile(path.join(ROOT, file), "utf8");
      texts.push([file, text]);
      const lines = text.split("\n");
      lines.forEach((line, i) => {
        for (const rule of RULES) {
          for (const m of line.matchAll(rule.re)) {
            const allowed = ALLOW.some((a) => a.file === file && a.rule === rule.name && line.includes(a.text));
            if (!allowed) failures.push(`${file}:${i + 1}: ${rule.name} “${m[0]}”`);
          }
        }
      });
    }
  }
  failures.push(...(await brandRules(texts)));
  return { failures, scanned };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { failures, scanned } = await checkSource();
  if (failures.length) {
    console.error(`${failures.length} token failure(s):`);
    for (const f of failures) console.error(`  ✗ ${f}`);
    process.exit(1);
  }
  console.log(`source ok (${scanned} files)`);
}
