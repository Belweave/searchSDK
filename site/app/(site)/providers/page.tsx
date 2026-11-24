import type { Metadata } from "next";
import Link from "next/link";
import { DataRegion } from "@/components/data/data-region";
import { Fact, usdPer1k } from "@/components/data/facts";
import { getRegistry, hueVar } from "@/lib/registry";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  path: "/providers",
  title: "Providers",
  description: "Every web search provider searchSDK supports: what each can do, what it costs and its limits, from one registry.",
});

const th = "py-2.5 pr-4 text-left font-mono text-xs font-normal uppercase tracking-wide text-fg-subtle";
const td = "py-3 pr-4";

export default function ProvidersPage() {
  return (
    <div className="mx-auto max-w-page px-gutter pt-12">
      <h1 className="text-3xl font-semibold tracking-tight">Providers</h1>
      <p className="mt-3 max-w-measure text-fg-muted">What each provider can do, what it costs and its limits.</p>
      <DataRegion dataset={getRegistry()} className="mt-8">
        {(registry) => (
          <div data-words="data" className="overflow-x-auto">
            <table className="w-full min-w-[36rem] border-collapse text-sm">
              <thead className="border-b border-line">
                <tr>
                  <th scope="col" className={th}>Provider</th>
                  <th scope="col" className={th}>Search</th>
                  <th scope="col" className={th}>Contents</th>
                  <th scope="col" className={th}>Answer</th>
                  <th scope="col" className={th}>Search price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {registry.providers.map((p) => (
                  <tr key={p.id}>
                    <th scope="row" className={`${td} text-left font-medium`}>
                      <Link href={`/providers/${p.id}`} className="inline-flex items-center gap-2 hover:text-accent">
                        <span aria-hidden="true" className="size-2.5 rounded-sm" style={{ background: hueVar(p.hue) }} />
                        {p.name}
                      </Link>
                    </th>
                    <td className={td}><Fact value={p.capabilities.search} /></td>
                    <td className={td}><Fact value={p.capabilities.contents} /></td>
                    <td className={td}><Fact value={p.capabilities.answer} /></td>
                    <td className={td}><Fact value={p.pricing.searchUsdPer1k} format={usdPer1k} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DataRegion>
    </div>
  );
}
