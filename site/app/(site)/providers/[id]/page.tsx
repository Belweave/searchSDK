import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { CSSProperties } from "react";
import { ProviderLogo, ProviderMark } from "@/components/brand/provider-mark";
import { HEADER_MARK_PX } from "@/components/brand/searchsdk";
import { NameList, RowList, StatusLine } from "@/components/data/spec";
import { providerBrand } from "@/lib/provider-assets";
import { type Endpoint, getProvider, getRegistry, statusLine } from "@/lib/registry";
import { pageMetadata } from "@/lib/seo";
import "@/components/site/pages.css";

type Props = { params: Promise<{ id: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return getRegistry().providers.map((p) => ({ id: p.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const provider = getProvider((await params).id);
  if (!provider) notFound();
  return pageMetadata({
    path: `/providers/${provider.id}`,
    title: `${provider.name} provider`,
    description: `${provider.name} in searchSDK: supported options, result fields, pricing and cost source, limits and sources, from the registry.`,
  });
}

const TITLES = { search: "Search", contents: "Contents" } as const;

function EndpointSection({ ep, providerName }: { ep: Endpoint; providerName: string }) {
  const kind = TITLES[ep.kind];
  return (
    <section aria-labelledby={ep.kind} className="provider-section">
      <h2 id={ep.kind} className="provider-h2">
        {kind}
        <span className="provider-h2-wire figures">
          {ep.wire.method} {ep.wire.url.replace(/^https:\/\//, "")}
        </span>
      </h2>
      <div className="provider-grid">
        <RowList title="Request options" rows={ep.options} code>
          <NameList title={`${providerName} options (providerOptions)`} names={ep.providerOptions} />
        </RowList>
        <RowList title={ep.kind === "search" ? "Result fields" : "Page fields"} rows={ep.fields} code>
          {ep.kind === "search" ? <NameList title="Kept in providerFields" names={ep.providerFields} /> : null}
        </RowList>
        <RowList title="Pricing" rows={[ep.cost.row, ...ep.pricing.rows]}>
          {ep.pricing.note ? <p className="row-list-note">{ep.pricing.note}</p> : null}
          <p className="row-list-note">
            <a href={ep.pricing.source} rel="noopener" className="prose-link">
              Pricing source
            </a>
            , read <span className="figures">{ep.pricing.retrievedOn}</span>
          </p>
        </RowList>
        <div className="provider-stack">
          <RowList title="Limits" rows={ep.limits} />
          <RowList title="Rate limits" rows={ep.rateLimits} />
        </div>
      </div>
    </section>
  );
}

export default async function ProviderPage({ params }: Props) {
  const p = getProvider((await params).id);
  if (!p) notFound();
  const brand = providerBrand(p.id);
  const others = getRegistry().providers.filter((x) => x.id !== p.id);

  return (
    <div className="page-wrap page-top" style={{ "--lane": brand.hue } as CSSProperties}>
      <nav aria-label="Providers" className="provider-crumbs">
        <Link href="/providers" className="prose-link">
          Providers
        </Link>
        <span className="provider-others">
          {others.map((o) => (
            <Link key={o.id} href={`/providers/${o.id}`} className="provider-other" aria-label={o.name}>
              <ProviderMark brand={providerBrand(o.id)} size={16} />
            </Link>
          ))}
        </span>
      </nav>
      <div className="provider-hero">
        {/* The provider's own logo identifies it, no taller than searchSDK's own mark in the header
            (brand/GUIDELINES.md); the heading is the name in the site's type. */}
        <span className="provider-hero-logo" aria-hidden="true">
          <ProviderLogo brand={brand} height={HEADER_MARK_PX} />
        </span>
        <h1 className="type-h2 provider-h1">{p.name}</h1>
        <StatusLine verified={p.liveVerified}>{statusLine(p)}</StatusLine>
      </div>

      <div data-words="data">
        <dl className="provider-facts">
          {(["search", "contents"] as const).map((kind) => (
            <div key={kind}>
              <dt className="type-label">{TITLES[kind]}</dt>
              <dd>{p[kind] ? <a href={`#${kind}`} className="prose-link">Yes</a> : <span className="text-fg-subtle">No</span>}</dd>
            </div>
          ))}
          <div>
            <dt className="type-label">Id</dt>
            <dd>
              <code className="figures">{p.id}</code>
            </dd>
          </div>
          <div>
            <dt className="type-label">Key</dt>
            <dd>
              <code className="figures">{p.env.join(", ")}</code>
            </dd>
          </div>
        </dl>

        {p.search ? <EndpointSection ep={p.search} providerName={p.name} /> : null}
        {p.contents ? <EndpointSection ep={p.contents} providerName={p.name} /> : null}

        <section aria-labelledby="unverified" className="provider-section">
          <h2 id="unverified" className="provider-h2">Unverified</h2>
          {p.unverified.length ? (
            <ul className="provider-list slab">
              {p.unverified.map((u) => (
                <li key={u.pointer}>
                  <p>
                    {u.label}
                    <code className="provider-pointer">{u.pointer}</code>
                  </p>
                  <p className="text-fg-muted">{u.reason}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-fg-muted">The spec lists nothing as unverified.</p>
          )}
        </section>

        <section aria-labelledby="sources" className="provider-section">
          <h2 id="sources" className="provider-h2">Sources</h2>
          <ul className="provider-list slab">
            {p.sources.map((s) => (
              <li key={s.url}>
                <p className="min-w-0">
                  <a href={s.url} rel="noopener" className="prose-link break-all">
                    {s.url.replace(/^https:\/\//, "")}
                  </a>
                  <span className="provider-covers">{s.covers}</span>
                </p>
                <p className="figures text-fg-subtle">Read {s.retrievedOn}</p>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
