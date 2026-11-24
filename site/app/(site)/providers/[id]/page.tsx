import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { NameList, RowList, StatusLine } from "@/components/data/spec";
import { type Endpoint, getProvider, getRegistry, hueVar, statusLine } from "@/lib/registry";
import { pageMetadata } from "@/lib/seo";

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
    <section aria-labelledby={ep.kind} className="mt-12">
      <h2 id={ep.kind} className="text-xl font-semibold tracking-tight">{kind}</h2>
      <div className="mt-5 grid gap-10 md:grid-cols-2">
        <RowList title="Request options" rows={ep.options} code>
          <NameList title={`${providerName} options (providerOptions)`} names={ep.providerOptions} />
        </RowList>
        <RowList title={ep.kind === "search" ? "Result fields" : "Page fields"} rows={ep.fields} code>
          {ep.kind === "search" ? <NameList title="Kept in providerFields" names={ep.providerFields} /> : null}
        </RowList>
        <RowList title="Pricing" rows={[ep.cost.row, ...ep.pricing.rows]}>
          {ep.pricing.note ? <p className="mt-3 text-sm text-fg-muted">{ep.pricing.note}</p> : null}
          <p className="mt-3 text-sm">
            <a href={ep.pricing.source} rel="noopener" className="text-accent underline underline-offset-4">Pricing source</a>
            <span className="text-fg-subtle">, read <span className="figures">{ep.pricing.retrievedOn}</span></span>
          </p>
        </RowList>
        <div className="grid content-start gap-10">
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

  return (
    <div className="mx-auto max-w-page px-gutter pt-12">
      <p className="text-sm">
        <Link href="/providers" className="text-fg-muted hover:text-fg">Providers</Link>
      </p>
      <h1 className="mt-2 flex items-center gap-3 text-3xl font-semibold tracking-tight">
        <span aria-hidden="true" className="size-4 rounded-sm" style={{ background: hueVar(p.hue) }} />
        {p.name}
      </h1>
      <StatusLine className="mt-4">{statusLine(p)}</StatusLine>

      <div data-words="data">
        <dl className="mt-8 flex flex-wrap gap-x-10 gap-y-2 text-sm">
          {(["search", "contents"] as const).map((kind) => (
            <div key={kind} className="flex gap-2">
              <dt className="text-fg-muted">{TITLES[kind]}</dt>
              <dd>{p[kind] ? <a href={`#${kind}`} className="hover:text-accent">Yes</a> : <span className="text-fg-subtle">No</span>}</dd>
            </div>
          ))}
          <div className="flex gap-2">
            <dt className="text-fg-muted">Id</dt>
            <dd><code className="font-mono">{p.id}</code></dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-fg-muted">Key</dt>
            <dd><code className="font-mono">{p.env.join(", ")}</code></dd>
          </div>
        </dl>

        {p.search ? <EndpointSection ep={p.search} providerName={p.name} /> : null}
        {p.contents ? <EndpointSection ep={p.contents} providerName={p.name} /> : null}

        <section aria-labelledby="unverified" className="mt-12">
          <h2 id="unverified" className="scroll-mt-20 text-xl font-semibold tracking-tight">Unverified</h2>
          {p.unverified.length ? (
            <ul className="mt-4 divide-y divide-line border-y border-line text-sm">
              {p.unverified.map((u) => (
                <li key={u.pointer} className="grid gap-1 py-3 md:grid-cols-[16rem_minmax(0,1fr)] md:gap-6">
                  <p>
                    {u.label}
                    <code className="mt-0.5 block break-all font-mono text-xs text-fg-subtle">{u.pointer}</code>
                  </p>
                  <p className="text-fg-muted">{u.reason}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-fg-muted">The spec lists nothing as unverified.</p>
          )}
        </section>

        <section aria-labelledby="sources" className="mt-12">
          <h2 id="sources" className="text-xl font-semibold tracking-tight">Sources</h2>
          <ul className="mt-4 divide-y divide-line border-y border-line text-sm">
            {p.sources.map((s) => (
              <li key={s.url} className="grid gap-1 py-3 md:grid-cols-[minmax(0,1fr)_auto] md:gap-6">
                <p className="min-w-0">
                  <a href={s.url} rel="noopener" className="break-all text-accent underline underline-offset-4">{s.url.replace(/^https:\/\//, "")}</a>
                  <span className="mt-0.5 block text-fg-muted">{s.covers}</span>
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
