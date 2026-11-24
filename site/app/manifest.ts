import type { MetadataRoute } from "next";
import { brandValue } from "@/lib/brand-tokens";
import { site } from "@/lib/site";

export const dynamic = "force-static";

/** Icons are copies of brand/dist/icon (checks/brand.mjs); colours are the brand's dark page. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: site.name,
    short_name: site.name,
    description: site.description,
    start_url: "/",
    display: "browser",
    background_color: brandValue("--surface-0"),
    theme_color: brandValue("--surface-0"),
    icons: [
      { src: "/brand/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/brand/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/brand/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
