import type { MetadataRoute } from "next";
import { docsRoutes, siteRoutes } from "@/lib/routes";
import { absoluteUrl } from "@/lib/site";

/** Every indexable page on the canonical host, with the date its sources last changed when Git knows it. */
export default function sitemap(): MetadataRoute.Sitemap {
  return [...siteRoutes(), ...docsRoutes()].map((route) => ({
    url: absoluteUrl(route.path),
    ...(route.lastModified ? { lastModified: route.lastModified } : {}),
  }));
}
