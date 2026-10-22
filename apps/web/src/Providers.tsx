import { useEffect, useId, useRef, useState } from "react";
import { DitherPattern } from "./lib/dither/pattern";
import { providerBrandAssets } from "./brand-assets";
import { providers, alphaProviders, nativeProviders } from "./provider-catalog";
import { WorkspaceDitherCatalog, WorkspaceDitherField, WorkspaceDitherSpectrum, workspaceDitherStyles } from "./components/WorkspaceDither";
import "./provider-page.css";

function ProviderLogo({ id, eager }: { id: string; eager?: boolean }) {
  const brand = providerBrandAssets[id];
  if (!brand) return null;
  return <span className="provider-page-logo" data-plate={brand.plate} aria-hidden="true">
    <img className={brand.darkSrc ? "provider-page-logo-light" : undefined} src={brand.src} alt="" width={brand.width} height={brand.height} loading={eager ? "eager" : "lazy"} decoding="async" />
    {brand.darkSrc && <img className="provider-page-logo-dark" src={brand.darkSrc} alt="" width={brand.width} height={brand.height} loading={eager ? "eager" : "lazy"} decoding="async" />}
  </span>;
}

export function Providers() {
  const [enhanced, setEnhanced] = useState(false);
  useEffect(() => setEnhanced(true), []);
  const searchInput = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState("all");
  const pattern = useId();
  const visible = providers.filter((provider) =>
    (scope === "all" || (scope === "corpus" ? provider.corpus : !provider.corpus)) &&
    `${provider.name} ${provider.description} ${provider.boundary}`.toLowerCase().includes(query.trim().toLowerCase()),
  );
  return (
    <section className="provider-page" style={workspaceDitherStyles} id="providers" aria-labelledby="provider-title">
      <header className="provider-page-heading">
        <div>
          <h1 id="provider-title">Search providers.</h1>
          <p>{nativeProviders.length} native clients. {alphaProviders.length} web-search adapters.<br />Start with Context.dev or TinyFish, then explore the full catalog.</p>
        </div>
        <svg className="provider-page-mark" viewBox="0 0 240 168" fill="none" aria-hidden="true">
          <defs><WorkspaceDitherSpectrum id={`${pattern}-rgb`} /><DitherPattern id={pattern} level={0.5} cell={2} color="#fff" /><mask id={`${pattern}-mask`}>
          {[0, 1, 2].map((row) => <g key={row}><rect x={8 + row * 18} y={10 + row * 48} width={122 - row * 18} height="30" rx="3" fill={`url(#${pattern})`} /><path d={`M142 ${25 + row * 48}h${24 - row * 5}L198 73`} stroke="#fff" /></g>)}
          <rect x="184" y="57" width="46" height="46" rx="4" fill={`url(#${pattern})`} />
          </mask></defs><rect width="240" height="168" fill={`url(#${pattern}-rgb)`} mask={`url(#${pattern}-mask)`} />
        </svg>
      </header>
      <WorkspaceDitherCatalog />
      <div className="provider-page-toolbar">
        <label className="provider-page-search">Find a provider<input ref={searchInput} type="search" disabled={!enhanced} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name or capability…" /></label>
        <label className="provider-page-scope">Search task
          <span className="provider-page-select">
            <select disabled={!enhanced} value={scope} onChange={(event) => setScope(event.target.value)}><option value="all">All providers</option><option value="web">Web search</option><option value="corpus">Corpus retrieval</option></select>
            <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false"><path d="m4 6 4 4 4-4" /></svg>
          </span>
        </label>
        <p className="provider-page-count" role="status">{visible.length} of {providers.length} providers</p>
      </div>
      <div className="provider-page-list">
        {visible.map((provider) => (
          <article className="provider-page-entry" key={provider.id} data-provider={provider.id} data-status={provider.status} data-priority={provider.priority || undefined}>
            <WorkspaceDitherField className="provider-page-entry-dither" variant={provider.corpus ? "hatched" : "gradient"} />
            <div className="provider-page-entry-header">
              <span>{provider.corpus ? "Corpus retrieval" : "Web search"}</span>
              {provider.priority && <span className="provider-page-priority">Start here</span>}
            </div>
            <h2><a href={`/docs/providers/${provider.id}`}><ProviderLogo id={provider.id} eager={provider.priority} /><span className="provider-page-name">{provider.name}</span><span className="provider-page-arrow" aria-hidden="true">↗</span></a></h2>
            <p className="provider-page-description">{provider.description}</p>
            <p className="provider-page-boundary">{provider.boundary}</p>
            <div className="provider-page-entry-footer"><a href={`/docs/providers/${provider.id}`}>SDK reference <span aria-hidden="true">→</span><span className="visually-hidden"> for {provider.name}</span></a><a href={provider.docs} target="_blank" rel="noreferrer">Provider docs <span aria-hidden="true">↗</span><span className="visually-hidden"> for {provider.name}</span></a></div>
          </article>
        ))}
      </div>
      {visible.length === 0 && <div className="provider-page-empty"><WorkspaceDitherField className="provider-page-empty-dither" variant="dotted" /><h2>No matching providers.</h2><p>Try another name or capability, or return to the full catalog.</p><button type="button" onClick={() => { setQuery(""); setScope("all"); searchInput.current?.focus(); }}>Show all providers</button></div>}
      <p className="provider-page-note">Read each reference for access requirements and verification limits. <a href="/provider-catalog.md">Complete provider notes <span aria-hidden="true">↓</span></a></p>
    </section>
  );
}
