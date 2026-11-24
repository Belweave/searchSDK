import { defineConfig } from "fumadocs-mdx/config";

/**
 * One Shiki theme whose colours are CSS variables (--code-* in styles/tokens.css), so highlighted
 * code follows the active theme without a second theme.
 */
const tokenTheme = {
  name: "searchsdk-tokens",
  type: "dark" as const,
  colors: { "editor.background": "var(--code-bg)", "editor.foreground": "var(--code-fg)" },
  tokenColors: [
    { settings: { foreground: "var(--code-fg)" } },
    { scope: ["comment", "punctuation.definition.comment"], settings: { foreground: "var(--code-comment)", fontStyle: "italic" } },
    { scope: ["keyword", "storage", "storage.type", "storage.modifier", "keyword.control"], settings: { foreground: "var(--code-keyword)" } },
    { scope: ["string", "string.quoted", "string.template", "punctuation.definition.string"], settings: { foreground: "var(--code-string)" } },
    { scope: ["constant.numeric", "constant.language", "support.constant"], settings: { foreground: "var(--code-number)" } },
    { scope: ["entity.name.function", "support.function", "meta.function-call"], settings: { foreground: "var(--code-function)" } },
    { scope: ["entity.name.type", "support.type", "entity.name.class"], settings: { foreground: "var(--code-type)" } },
    { scope: ["variable", "variable.other", "meta.object-literal.key", "variable.parameter"], settings: { foreground: "var(--code-fg)" } },
    { scope: ["punctuation", "keyword.operator", "meta.brace"], settings: { foreground: "var(--code-punctuation)" } },
  ],
};

export default defineConfig({
  mdxOptions: {
    rehypeCodeOptions: {
      themes: { light: tokenTheme, dark: tokenTheme },
    },
  },
});
