import { DocsBody, DocsDescription, DocsPage, DocsTitle } from "fumadocs-ui/layouts/docs/page";
import { createRelativeLink } from "fumadocs-ui/mdx";
import defaultMdxComponents from "fumadocs-ui/mdx";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageActions } from "@/components/docs/page-actions";
import { ProviderTable } from "@/components/docs/provider-table";
import { faqEntries, providerNames } from "@/lib/markdown";
import { openInTargets } from "@/lib/page-actions";
import { docsLastModified } from "@/lib/routes";
import { pageMetadata } from "@/lib/seo";
import { source } from "@/lib/source";
import { absoluteUrl, markdownPath } from "@/lib/site";
import { breadcrumbs, faqPage, JsonLd, techArticle } from "@/lib/structured-data";

type Props = { params: Promise<{ slug?: string[] }> };

/** The providers' names in prose, from the registry, so a new spec never leaves a page out of date. */
function ProviderNames() {
  return <>{providerNames()}</>;
}

export default async function Page({ params }: Props) {
  const page = source.getPage((await params).slug);
  if (!page) notFound();
  const MDX = page.data.body;
  const description = page.data.description ?? "";
  const crumbs = [
    { name: "Home", path: "/" },
    { name: "Docs", path: "/docs" },
    ...(page.url === "/docs" ? [] : [{ name: page.data.title, path: page.url }]),
  ];
  const faq = page.data.faq ? await faqEntries(page) : [];

  return (
    <DocsPage toc={page.data.toc} tableOfContent={{ style: "clerk" }}>
      <JsonLd
        nodes={[
          techArticle({ path: page.url, title: page.data.title, description, dateModified: docsLastModified(page.path) }),
          breadcrumbs(crumbs),
          ...(faq.length ? [faqPage(page.url, faq)] : []),
        ]}
      />
      <DocsTitle>{page.data.title}</DocsTitle>
      {description ? <DocsDescription className="mb-0">{description}</DocsDescription> : null}
      <PageActions markdownUrl={markdownPath(page.url)!} targets={openInTargets(absoluteUrl(markdownPath(page.url)!))} />
      <DocsBody>
        <MDX components={{ ...defaultMdxComponents, a: createRelativeLink(source, page), ProviderTable, ProviderNames }} />
      </DocsBody>
    </DocsPage>
  );
}

export function generateStaticParams() {
  return source.generateParams();
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const page = source.getPage((await params).slug);
  if (!page) notFound();
  return pageMetadata({
    path: page.url,
    title: page.data.metaTitle ?? page.data.title,
    description: page.data.description ?? "",
    type: "article",
    modifiedTime: docsLastModified(page.path),
  });
}
