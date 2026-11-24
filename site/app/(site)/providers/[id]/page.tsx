import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DataRegion } from "@/components/data/data-region";
import { Fact, FactList, usdPer1k } from "@/components/data/facts";
import { getProvider, getRegistry, hueVar } from "@/lib/registry";
import { pageMetadata } from "@/lib/seo";

type Props = { params: Promise<{ id: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return getRegistry().data.providers.map((p) => ({ id: p.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const provider = getProvider((await params).id);
  if (!provider) notFound();
  return pageMetadata({
    path: `/providers/${provider.id}`,
    title: `${provider.name} provider`,
    description: `${provider.name} in searchSDK: capabilities, pricing, limits and sources, from the provider registry.`,
  });
}

export default async function ProviderPage({ params }: Props) {
  const provider = getProvider((await params).id);
  if (!provider) notFound();
  const registry = getRegistry();

  return (
    <div className="mx-auto max-w-page px-gutter pt-12">
      <p className="text-sm">
        <Link href="/providers" className="text-fg-muted hover:text-fg">Providers</Link>
      </p>
      <h1 className="mt-2 flex items-center gap-3 text-3xl font-semibold tracking-tight">
        <span aria-hidden="true" className="size-4 rounded-sm" style={{ background: hueVar(provider.hue) }} />
        {provider.name}
      </h1>
      <DataRegion dataset={{ ...registry, data: provider }} className="mt-8">
        {(p) => (
          <div data-words="data" className="grid gap-10 md:grid-cols-2">
            <FactList
              title="Capabilities"
              rows={[
                { label: "Search", value: <Fact value={p.capabilities.search} /> },
                { label: "Contents", value: <Fact value={p.capabilities.contents} /> },
                { label: "Answer", value: <Fact value={p.capabilities.answer} /> },
              ]}
            />
            <FactList
              title="Pricing"
              rows={[
                { label: "Model", value: <Fact value={p.pricing.model} /> },
                { label: "Search", value: <Fact value={p.pricing.searchUsdPer1k} format={usdPer1k} /> },
                { label: "Contents", value: <Fact value={p.pricing.contentsUsdPer1k} format={usdPer1k} /> },
                { label: "Free tier", value: <Fact value={p.pricing.freeTier} /> },
              ]}
            />
            <FactList
              title="Limits"
              rows={[
                { label: "Results per query", value: <Fact value={p.limits.maxResultsPerQuery} /> },
                { label: "Requests per second", value: <Fact value={p.limits.requestsPerSecond} /> },
                { label: "Timeout", value: <Fact value={p.limits.timeoutMs} format={(v) => `${v} ms`} /> },
              ]}
            />
            <section>
              <h2 className="text-lg font-semibold tracking-tight">Sources</h2>
              <ul className="mt-3 space-y-2 text-sm">
                {p.sources.map((s) => (
                  <li key={s.url}>
                    <a href={s.url} rel="noopener" className="text-accent underline underline-offset-4">
                      {s.label}
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        )}
      </DataRegion>
    </div>
  );
}
