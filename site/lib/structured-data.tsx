import { SOCIAL_IMAGE } from "./seo";
import { absoluteUrl, site } from "./site";

/**
 * schema.org JSON-LD, built from the same facts the pages show (lib/site.ts, the docs source, the
 * registry). Only fields that are true today: no ratings, reviews, offers, download counts or
 * release claims. Every page's graph names the organization, the website and the SDK by @id, so the
 * entity stays the same across pages.
 */

type Node = Record<string, unknown>;

const ids = {
  organization: `${site.url}/#organization`,
  website: `${site.url}/#website`,
  software: `${site.url}/#software`,
};

export function organization(): Node {
  return {
    "@type": "Organization",
    "@id": ids.organization,
    name: site.organization.name,
    url: site.organization.url,
  };
}

export function website(): Node {
  return {
    "@type": "WebSite",
    "@id": ids.website,
    name: site.name,
    url: absoluteUrl("/"),
    description: site.description,
    inLanguage: "en",
    publisher: { "@id": ids.organization },
  };
}

export function software(): Node {
  return {
    "@type": "SoftwareSourceCode",
    "@id": ids.software,
    name: site.name,
    description: site.definition,
    url: absoluteUrl("/"),
    codeRepository: site.repo,
    programmingLanguage: [...site.languages],
    runtimePlatform: ["Node.js 24", "Python 3.10+"],
    license: site.license,
    isAccessibleForFree: true,
    author: { "@id": ids.organization },
    publisher: { "@id": ids.organization },
  };
}

type Crumb = { name: string; path: string };

export function breadcrumbs(crumbs: Crumb[]): Node {
  return {
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, item: absoluteUrl(c.path) })),
  };
}

export function techArticle({ path, title, description, dateModified }: { path: string; title: string; description: string; dateModified?: string }): Node {
  const url = absoluteUrl(path);
  return {
    "@type": "TechArticle",
    "@id": `${url}#article`,
    headline: title,
    description,
    url,
    mainEntityOfPage: url,
    image: absoluteUrl(SOCIAL_IMAGE.url),
    inLanguage: "en",
    ...(dateModified ? { dateModified } : {}),
    author: { "@id": ids.organization },
    publisher: { "@id": ids.organization },
    isPartOf: { "@id": ids.website },
    about: { "@id": ids.software },
  };
}

/** A FAQPage from the questions and answers the page shows: never questions it does not. */
export function faqPage(path: string, entries: { question: string; answer: string }[]): Node {
  return {
    "@type": "FAQPage",
    "@id": `${absoluteUrl(path)}#faq`,
    mainEntity: entries.map((e) => ({ "@type": "Question", name: e.question, acceptedAnswer: { "@type": "Answer", text: e.answer } })),
  };
}

/** One <script type="application/ld+json"> with a @graph; the base entities ride along so every @id resolves. */
export function JsonLd({ nodes }: { nodes: Node[] }) {
  const graph = { "@context": "https://schema.org", "@graph": [organization(), website(), software(), ...nodes] };
  // "<" is escaped so no string in the data can close the script element.
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(graph).replace(/</g, "\\u003c") }} />;
}
