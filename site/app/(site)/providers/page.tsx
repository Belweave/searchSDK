import type { Metadata } from "next";
import Link from "next/link";
import { RowValue, StatusLine } from "@/components/data/spec";
import { type Endpoint, getRegistry, hueVar, registryStatusLine } from "@/lib/registry";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  path: "/providers",
  title: "Providers",
  description: "Every web search provider in searchSDK: what it supports, what it costs, where cost comes from and its limits, from the registry.",
});

const th = "py-2.5 pr-4 text-left font-mono text-xs font-normal uppercase tracking-wide text-fg-subtle";
const td = "py-3 pr-4 align-baseline";

const COST: Record<Endpoint["cost"]["source"], string> = {
  reported: "Reported",
  "reported-credits": "Reported in credits",
  computed: "Computed",
  unknown: "Unknown",
};

function YesNo({ value }: { value: boolean }) {
  return value ? <span>Yes</span> : <span className="text-fg-subtle">No</span>;
}

export default function ProvidersPage() {
  const registry = getRegistry();
  return (
    <div className="mx-auto max-w-page px-gutter pt-12">
      <h1 className="text-3xl font-semibold tracking-tight">Providers</h1>
      <p className="mt-3 max-w-measure text-fg-muted">What each provider supports through searchSDK, what it costs and its limits, read from the registry.</p>
      <StatusLine className="mt-4">{registryStatusLine(registry)}</StatusLine>
      <div data-words="data" className="mt-8 overflow-x-auto">
        <table className="w-full min-w-[44rem] border-collapse text-sm">
          <thead className="border-b border-line">
            <tr>
              <th scope="col" className={th}>Provider</th>
              <th scope="col" className={th}>Search</th>
              <th scope="col" className={th}>Contents</th>
              <th scope="col" className={th}>Search price (standard)</th>
              <th scope="col" className={th}>Cost</th>
              <th scope="col" className={th}>Spec read</th>
              <th scope="col" className={`${th} text-right`}>Unverified</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {registry.providers.map((p) => (
              <tr key={p.id}>
                <th scope="row" className={`${td} text-left font-medium`}>
                  <Link href={`/providers/${p.id}`} className="inline-flex items-center gap-2 whitespace-nowrap hover:text-accent">
                    <span aria-hidden="true" className="size-2.5 rounded-sm" style={{ background: hueVar(p.hue) }} />
                    {p.name}
                  </Link>
                </th>
                <td className={td}><YesNo value={p.search !== null} /></td>
                <td className={td}><YesNo value={p.contents !== null} /></td>
                <td className={td}>{p.search ? <RowValue row={p.search.priceSummary} unverifiedHref={`/providers/${p.id}#unverified`} /> : <span className="text-fg-subtle">–</span>}</td>
                <td className={td}>{p.search ? COST[p.search.cost.source] : <span className="text-fg-subtle">–</span>}</td>
                <td className={`${td} figures whitespace-nowrap`}>{p.specVersion}</td>
                <td className={`${td} figures text-right`}>
                  <Link href={`/providers/${p.id}#unverified`} className="hover:text-accent">{p.unverified.length}</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
