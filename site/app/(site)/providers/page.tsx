import type { Metadata } from "next";
import Link from "next/link";
import type { CSSProperties } from "react";
import { ProviderLogo } from "@/components/brand/provider-mark";
import { StatusLine } from "@/components/data/spec";
import { Reveal } from "@/components/motion/reveal";
import { providerBrand } from "@/lib/provider-assets";
import { type Endpoint, getRegistry, registryStatusLine } from "@/lib/registry";
import { pageMetadata } from "@/lib/seo";
import "@/components/site/pages.css";

export const metadata: Metadata = pageMetadata({
  path: "/providers",
  title: "Providers",
  description: "Every web search provider in searchSDK: what it supports, what it costs, where cost comes from and its limits, from the registry.",
});

const COST: Record<Endpoint["cost"]["source"], string> = {
  reported: "Reported",
  "reported-credits": "Reported in credits",
  computed: "Computed",
  unknown: "Unknown",
};

export default function ProvidersPage() {
  const registry = getRegistry();
  return (
    <div className="page-wrap page-top">
      <div className="page-head">
        <h1 className="type-h2">Providers</h1>
        <p className="page-line">What each provider supports through searchSDK, what it costs and its limits, read from the registry.</p>
        <StatusLine verified={registry.liveVerified === registry.providers.length}>{registryStatusLine(registry)}</StatusLine>
      </div>
      <ul data-words="data" className="provider-wall">
        {registry.providers.map((p, i) => {
          const brand = providerBrand(p.id);
          return (
            <li key={p.id}>
              <Reveal index={i % 3} className="provider-tile-wrap">
                <Link href={`/providers/${p.id}`} className="provider-tile" style={{ "--lane": brand.hue } as CSSProperties} aria-label={`${p.name}: capabilities, pricing and limits`}>
                  <span className="provider-tile-logo">
                    <ProviderLogo brand={brand} height={26} />
                  </span>
                  <span className="provider-tile-caps">
                    <span className="tag" data-on={p.search ? "" : undefined}>search</span>
                    <span className="tag" data-on={p.contents ? "" : undefined}>contents</span>
                  </span>
                  <dl className="provider-tile-facts">
                    <div>
                      <dt className="type-label">Search price</dt>
                      <dd>
                        {p.search ? (
                          <>
                            <span className="figures">{p.search.priceSummary.value}</span>
                            {p.search.priceSummary.unverified.length ? <span className="unverified-mark">unverified</span> : null}
                          </>
                        ) : (
                          "–"
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt className="type-label">Cost</dt>
                      <dd>{p.search ? COST[p.search.cost.source] : "–"}</dd>
                    </div>
                    <div>
                      <dt className="type-label">Spec read</dt>
                      <dd className="figures">{p.specVersion}</dd>
                    </div>
                    <div>
                      <dt className="type-label">Unverified</dt>
                      <dd className="figures">{p.unverified.length}</dd>
                    </div>
                  </dl>
                </Link>
              </Reveal>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
