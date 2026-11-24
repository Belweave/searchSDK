import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * Brand values for places CSS cannot reach (the web manifest, the browser's theme colour), read at
 * build time from styles/brand.css, the synced copy of brand/tokens.site.css. Never retyped here.
 */
let css: string | null = null;

export function brandValue(name: `--${string}`, theme: "dark" | "light" = "dark"): string {
  css ??= readFileSync(path.join(process.cwd(), "styles", "brand.css"), "utf8");
  const selector = theme === "dark" ? ":root {" : ':root[data-theme="light"] {';
  const start = css.indexOf(selector);
  const block = start < 0 ? "" : css.slice(start, css.indexOf("}", start));
  const value = block.match(new RegExp(`\\s${name}:\\s*([^;]+);`))?.[1]?.trim();
  if (!value) throw new Error(`styles/brand.css has no ${name} for the ${theme} theme.`);
  return value;
}
