import localFont from "next/font/local";

/**
 * The two faces, self-hosted. Which fonts these are is recorded in assets/fonts/README.md;
 * the rest of the site refers only to --type-prose and --type-mono (styles/tokens.css).
 */
export const proseFace = localFont({
  src: "../assets/fonts/prose.woff2",
  weight: "200 800",
  display: "swap",
  variable: "--font-prose-face",
});

export const monoFace = localFont({
  src: "../assets/fonts/mono.woff2",
  weight: "100 800",
  style: "normal",
  display: "swap",
  variable: "--font-mono-face",
  declarations: [{ prop: "font-stretch", value: "75% 112.5%" }],
});
