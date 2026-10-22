export type DocBlock =
  | { type: "paragraph"; text: string }
  | { type: "list"; items: readonly string[]; ordered?: boolean }
  | { type: "code"; code: string; language: "typescript" | "bash" | "json"; title: string }
  | { type: "callout"; title: string; text: string; tone?: "note" | "caution" }
  | { type: "table"; columns: readonly string[]; rows: readonly (readonly string[])[] }
  | { type: "links"; items: readonly { label: string; href: string; description?: string }[] };

export interface DocSection {
  id: string;
  title: string;
  blocks: readonly DocBlock[];
}
export type DocGroup = "Get started" | "Guides" | "API reference" | "Providers" | "Reliability";
export interface DocArticle {
  slug: string;
  title: string;
  description: string;
  group: DocGroup;
  label?: string;
  keywords?: readonly string[];
  sections: readonly DocSection[];
}
export const paragraph = (text: string): DocBlock => ({ type: "paragraph", text });
export const list = (...items: string[]): DocBlock => ({ type: "list", items });
export const code = (title: string, source: string, language: "typescript" | "bash" | "json" = "typescript"): DocBlock => ({ type: "code", title, code: source, language });
export const callout = (title: string, text: string, tone: "note" | "caution" = "note"): DocBlock => ({ type: "callout", title, text, tone });
export const table = (columns: readonly string[], rows: readonly (readonly string[])[]): DocBlock => ({ type: "table", columns, rows });
export const links = (...items: { label: string; href: string; description?: string }[]): DocBlock => ({ type: "links", items });
export const section = (id: string, title: string, ...blocks: DocBlock[]): DocSection => ({ id, title, blocks });
export const docHref = (slug: string): string => slug ? `/docs/${slug}` : "/docs";
