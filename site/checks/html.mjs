// Small HTML helpers over parse5: walk a document, match simple selectors, count visible words.
import { parse } from "parse5";

export function parseHtml(html) {
  return parse(html);
}

export function attr(node, name) {
  return node.attrs?.find((a) => a.name === name)?.value;
}

export function hasAttr(node, name) {
  return node.attrs?.some((a) => a.name === name) ?? false;
}

/** Depth-first walk. `visit` returning false skips the node's children. */
export function walk(node, visit, ancestors = []) {
  if (visit(node, ancestors) === false) return;
  const kids = node.tagName === "template" ? node.content?.childNodes : node.childNodes;
  if (!kids) return;
  const next = [...ancestors, node];
  for (const child of kids) walk(child, visit, next);
}

export function findAll(root, test) {
  const out = [];
  walk(root, (n) => {
    if (n.tagName && test(n)) out.push(n);
  });
  return out;
}

export function findFirst(root, test) {
  return findAll(root, test)[0];
}

export const byTag = (tag) => (n) => n.tagName === tag;
export const byId = (id) => (n) => attr(n, "id") === id;

/** Elements whose text is never visible copy. */
const NEVER_TEXT = new Set(["script", "style", "noscript", "template", "svg", "title", "head"]);
/** Chrome and code: excluded from word caps (navigation, header, footer, sidebars, code blocks). */
const NOT_COPY = new Set(["pre", "code", "kbd", "samp", "nav", "header", "footer", "aside"]);

function hidden(n) {
  return hasAttr(n, "hidden") || attr(n, "aria-hidden") === "true";
}

/**
 * Visible text under `root`, split into copy and data.
 * Copy: prose, headings, labels. Data: text inside [data-words="data"] (tables, the race), reported
 * separately and not counted against the cap. Code, navigation and chrome (including
 * [data-words="chrome"], such as the docs page actions) are excluded.
 */
export function textParts(root) {
  const copy = [];
  const data = [];
  walk(root, (n, ancestors) => {
    if (n.tagName) {
      if (NEVER_TEXT.has(n.tagName) || NOT_COPY.has(n.tagName) || hidden(n)) return false;
      // Controls the site adds to every page of a kind (the docs page actions) are chrome too.
      if (attr(n, "data-words") === "chrome") return false;
      return true;
    }
    if (n.nodeName === "#text") {
      const inData = ancestors.some((a) => attr(a, "data-words") === "data");
      (inData ? data : copy).push(n.value);
    }
    return true;
  });
  return { copy: copy.join(" "), data: data.join(" ") };
}

export function countWords(text) {
  return text.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
}

/** All visible text, code included, for leak checks. Each entry knows whether it sits in a sample region. */
export function textNodes(root) {
  const out = [];
  walk(root, (n, ancestors) => {
    if (n.tagName) return !(NEVER_TEXT.has(n.tagName) || hidden(n));
    if (n.nodeName === "#text" && n.value.trim()) {
      out.push({ text: n.value, inSample: ancestors.some((a) => hasAttr(a, "data-sample")) });
    }
    return true;
  });
  return out;
}

/** The page's content root: <main>, or the Fumadocs article on docs pages. */
export function contentRoot(doc) {
  return findFirst(doc, byTag("main")) ?? findFirst(doc, byId("nd-page"));
}
