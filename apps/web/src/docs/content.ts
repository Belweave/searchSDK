import { coreArticles } from "./articles.js";
import { providerArticles } from "./provider-articles.js";
import { nativeArticles } from "./native-articles.js";
import { boatArticles } from "./boat-articles.js";
import { agentArticles } from "./agent-articles.js";
import { sdkArticles } from "./sdk-articles.js";
import type { DocArticle, DocBlock, DocGroup, DocSection } from "./model.js";
import { docHref, callout } from "./model.js";

// The original API and policy articles document the TypeScript implementation.
// Keep that scope in both the rendered page and generated Markdown/MCP records.
function scopeTypeScript(article: DocArticle): DocArticle {
  if (["", "concepts", "providers", "reliability/verification", "sdks/typescript"].includes(article.slug)) return article;
  return { ...article, sections: article.sections.map((section, index) => index ? section : {
    ...section, blocks: [callout("TypeScript reference", "The API names, code and policy behavior in this article describe the TypeScript SDK. See [your language guide](/docs/sdks) for its supported surface and limits."), ...section.blocks],
  }) };
}

// Public build-time metadata/content entrypoint. Pure data: no DOM, fetch, or SDK execution.
export const docGroups: readonly DocGroup[] = ["Get started", "SDKs", "Guides", "API reference", "Providers", "Reliability"];
export const docArticles: readonly DocArticle[] = docGroups.flatMap(group => [...coreArticles.map(scopeTypeScript), ...sdkArticles, ...boatArticles.map(scopeTypeScript), ...agentArticles, ...nativeArticles.map(scopeTypeScript), ...providerArticles.map(scopeTypeScript)].filter(article => article.group === group));

export function findArticle(path: string): DocArticle | undefined {
  const pathname = path.split(/[?#]/, 1)[0].replace(/\/+$/, "") || "/";
  if (pathname !== "/docs" && !pathname.startsWith("/docs/")) return undefined;
  const slug = pathname === "/docs" ? "" : pathname.slice(6);
  return docArticles.find(article => article.slug === slug);
}
export function blockText(block: DocBlock): string {
  switch (block.type) {
    case "paragraph": return block.text;
    case "callout": return `${block.title} ${block.text}`;
    case "list": return block.items.join(" ");
    case "code": return `${block.title} ${block.code}`;
    case "table": return `${block.columns.join(" ")} ${block.rows.map(row => row.join(" ")).join(" ")}`;
    case "links": return block.items.map(item => `${item.label} ${item.description ?? ""}`).join(" ");
  }
}
interface SearchRecord { article: DocArticle; sections: { section: DocSection; text: string }[]; title: string; text: string }
const searchIndex: readonly SearchRecord[] = docArticles.map(article => ({ article, title: `${article.label ?? ""} ${article.title} ${(article.keywords ?? []).join(" ")}`.toLowerCase(), text: `${article.description} ${article.group}`.toLowerCase(), sections: article.sections.map(section => ({ section, text: `${section.title} ${section.blocks.map(blockText).join(" ")}`.toLowerCase() })) }));
export interface DocSearchResult { article: DocArticle; section?: DocSection; href: string; excerpt: string }
export function searchArticles(query: string): DocSearchResult[] {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return ["sdks", "guides/application-gateway", "quickstart", "providers", "reliability/fallback", "guides/testing"].flatMap(slug => { const article = docArticles.find(item => item.slug === slug); return article ? [{ article, href: docHref(article.slug), excerpt: article.description }] : []; });
  return searchIndex.flatMap(record => {
    if (!terms.every(term => `${record.title} ${record.text} ${record.sections.map(section => section.text).join(" ")}`.includes(term))) return [];
    const matching = record.sections.map(value => ({ ...value, score: terms.reduce((score, term) => score + (value.text.includes(term) ? 1 : 0) + (value.section.title.toLowerCase().includes(term) ? 4 : 0), 0) })).sort((a, b) => b.score - a.score)[0];
    const titleScore = terms.reduce((score, term) => score + (record.title.includes(term) ? 12 : 0) + (record.text.includes(term) ? 3 : 0), 0);
    const section = titleScore >= terms.length * 12 ? undefined : matching?.section;
    const source = section ? section.blocks.map(blockText).join(" ").replace(/`/g, "") : record.article.description;
    const position = Math.max(0, source.toLowerCase().indexOf(terms[0]) - 55);
    const excerpt = `${position > 0 ? "…" : ""}${source.slice(position, position + 170)}${source.length > position + 170 ? "…" : ""}`;
    return [{ article: record.article, section, href: `${docHref(record.article.slug)}${section ? `#${section.id}` : ""}`, excerpt, score: titleScore + (matching?.score ?? 0) }];
  }).sort((a, b) => b.score - a.score || a.article.title.localeCompare(b.article.title)).slice(0, 12);
}
