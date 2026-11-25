import type { Metadata } from "next";
import { absoluteUrl, markdownPath, site } from "./site";

type PageMeta = {
  path: string;
  title: string;
  description: string;
  /** "article" for docs pages, "website" otherwise. */
  type?: "website" | "article";
  /** ISO dates for article metadata, when known. */
  modifiedTime?: string;
};

/** Title 10–60 characters and description 50–160: a bad value fails the build, not the crawl. */
const TITLE = [10, 60] as const;
const DESCRIPTION = [50, 160] as const;

function guard(kind: string, path: string, value: string, [min, max]: readonly [number, number]) {
  if (value.length < min || value.length > max) {
    throw new Error(`${kind} for ${path} is ${value.length} characters; it must be ${min}–${max}.`);
  }
}

/** The social card, a copy of brand/dist/social/og.png (checks/brand.mjs). */
export const SOCIAL_IMAGE = { url: "/brand/og.png", width: 1200, height: 630, alt: `${site.name}: one interface to every web search API` } as const;

/** The title as the page shows it in a tab: the page's own, then the name, unless it already says it. */
export function fullTitle(path: string, title: string): string {
  return path === "/" || title.includes(site.name) ? title : `${title} | ${site.name}`;
}

export function pageMetadata({ path, title, description, type = "website", modifiedTime }: PageMeta): Metadata {
  const full = fullTitle(path, title);
  guard("Title", path, full, TITLE);
  guard("Description", path, description, DESCRIPTION);
  const url = absoluteUrl(path);
  const md = markdownPath(path);
  return {
    title: { absolute: full },
    description,
    alternates: {
      canonical: url,
      // The same page as Markdown for agents, and the site index for language models.
      types: { "text/plain": "/llms.txt", ...(md ? { "text/markdown": md } : {}) },
    },
    openGraph: {
      title: full,
      description,
      url,
      siteName: site.name,
      locale: "en_US",
      images: [SOCIAL_IMAGE],
      ...(type === "article" ? { type: "article", ...(modifiedTime ? { modifiedTime } : {}) } : { type: "website" }),
    },
    twitter: { card: "summary_large_image", title: full, description, images: [SOCIAL_IMAGE] },
  };
}
