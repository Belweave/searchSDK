import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { site } from "@/lib/site";
import { THEME_SCRIPT } from "@/lib/theme";
import { monoFace, proseFace } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  applicationName: site.name,
  alternates: { types: { "text/plain": "/llms.txt" } },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    // The pre-paint script may switch data-theme and the dark class, so React must not fight it.
    <html lang="en" data-theme="dark" className={`dark ${proseFace.variable} ${monoFace.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
