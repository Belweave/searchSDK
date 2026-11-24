import type { Metadata } from "next";
import { absoluteUrl, site } from "./site";

type PageMeta = { path: string; title: string; description: string };

/** Title 10–60 characters and description 50–160: a bad value fails the build, not the crawl. */
const TITLE = [10, 60] as const;
const DESCRIPTION = [50, 160] as const;

function guard(kind: string, path: string, value: string, [min, max]: readonly [number, number]) {
  if (value.length < min || value.length > max) {
    throw new Error(`${kind} for ${path} is ${value.length} characters; it must be ${min}–${max}.`);
  }
}

export function pageMetadata({ path, title, description }: PageMeta): Metadata {
  const fullTitle = path === "/" ? title : `${title} | ${site.name}`;
  guard("Title", path, fullTitle, TITLE);
  guard("Description", path, description, DESCRIPTION);
  const url = absoluteUrl(path);
  return {
    title: { absolute: fullTitle },
    description,
    alternates: { canonical: url },
    openGraph: { title: fullTitle, description, url, siteName: site.name, type: "website" },
  };
}
