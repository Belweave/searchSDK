import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site";

/** Open to every crawler, AI crawlers included. Route handlers are not pages. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: "/api/" },
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
