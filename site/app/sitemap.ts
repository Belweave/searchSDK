import type { MetadataRoute } from "next";
import { docsRoutes, siteRoutes } from "@/lib/routes";
import { absoluteUrl } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return [...siteRoutes(), ...docsRoutes()].map((route) => ({ url: absoluteUrl(route.path) }));
}
