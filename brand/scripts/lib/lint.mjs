// Copy rules for this folder: the name, banned words and word caps. Returns failures.
import fs from 'node:fs';

export const BANNED = ['seamless', 'effortless', 'revolutionary', 'powerful', 'unlock', 'supercharge', 'game-changing', 'next-level', 'blazing', 'lightning-fast', 'cutting-edge', 'world-class', 'best-in-class', 'magic', 'ultimate', 'robust'];
const CAPS = { 'README.md': 200, 'fonts/README.md': 200 };
const HEADLINE_CAP = 8;

/** Prose only: no fenced or inline code, URLs, HTML tags or comments, or lines marked lint-ignore. */
export function prose(text, { html = false } = {}) {
  let t = text.split('\n').filter((l) => !l.includes('lint-ignore')).join('\n');
  if (html) t = t.replace(/<(script|style|svg)\b[\s\S]*?<\/\1>/gi, ' ').replace(/<code\b[\s\S]*?<\/code>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ');
  return t
    .replace(/```[\s\S]*?```/g, ' ').replace(/`[^`]*`/g, ' ').replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/\]\([^)]*\)/g, ']').replace(/https?:\/\/\S+/g, ' ');
}
export const words = (t) => (t.match(/[A-Za-z0-9][A-Za-z0-9'’.-]*/g) || []).length;

export function lint(root, out) {
  const fails = [];
  const read = (p) => (out.has(p) ? out.get(p).toString() : fs.existsSync(root + p) ? fs.readFileSync(root + p, 'utf8') : null);
  const docs = { 'GUIDELINES.md': {}, 'README.md': {}, 'fonts/README.md': {}, 'index.html': { html: true } };
  for (const [file, opt] of Object.entries(docs)) {
    const text = read(file);
    if (text == null) { fails.push(`missing: ${file}`); continue; }
    const p = prose(text, opt);
    for (const m of p.matchAll(/search[\s-]?sdk/gi)) if (m[0] !== 'searchSDK') fails.push(`${file}: write the name as searchSDK, not "${m[0]}"`);
    for (const w of BANNED) if (new RegExp(`\\b${w}\\b`, 'i').test(p)) fails.push(`${file}: banned word "${w}"`);
    if (CAPS[file] && words(p) > CAPS[file]) fails.push(`${file}: ${words(p)} words, cap ${CAPS[file]}`);
  }
  for (const card of ['src/social/og.svg', 'src/social/github.svg']) {
    const headline = [...read(card).matchAll(/<text\b[^>]*font-size="(\d+)"[^>]*>([^<]*)<\/text>/g)].filter((m) => +m[1] >= 40).map((m) => m[2]).join(' ');
    if (words(headline) > HEADLINE_CAP) fails.push(`${card}: headline has ${words(headline)} words, cap ${HEADLINE_CAP}`);
    if (/search[\s-]?sdk/i.test(headline.replace(/searchSDK/g, ''))) fails.push(`${card}: write the name as searchSDK`);
  }
  return fails;
}
