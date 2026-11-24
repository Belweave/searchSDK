import localFont from "next/font/local";

/**
 * The brand's two faces, self-hosted from copies of brand/fonts/ (checks/brand.mjs keeps them
 * current). The rest of the site refers only to --type-prose and --type-mono (styles/brand.css).
 */
export const proseFace = localFont({
  src: "../assets/fonts/InstrumentSans-latin.woff2",
  weight: "400 700",
  style: "normal",
  display: "swap",
  variable: "--font-prose-face",
  declarations: [{ prop: "font-stretch", value: "75% 100%" }],
});

export const monoFace = localFont({
  src: "../assets/fonts/MartianMono-latin.woff2",
  weight: "100 800",
  style: "normal",
  display: "swap",
  variable: "--font-mono-face",
  declarations: [{ prop: "font-stretch", value: "75% 112.5%" }],
});
