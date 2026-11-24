// Token discipline: colours, font names and motion values live only in styles/tokens.css.
//   node checks/source.mjs
// Scans app/, components/, lib/, content/ and source.config.ts for colour literals, Tailwind
// palette classes, named font families and hard-coded durations or easings in styles.
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
  for (const entry of SCAN) {
    for (const file of await files(entry)) {
      scanned += 1;
      const text = await readFile(path.join(ROOT, file), "utf8");
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
