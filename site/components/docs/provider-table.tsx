import Link from "next/link";
import type { CSSProperties } from "react";
import { ProviderName } from "@/components/brand/provider-mark";
import { providerBrand } from "@/lib/provider-assets";
import { getRegistry } from "@/lib/registry";

/**
 * Every provider in the registry, as the docs show them: its own mark and name (unmodified files,
 * public/providers/SOURCES.md), the id to pass, and the variable its key is read from. Reads the
 * registry at build time, so a new spec is a new row. Data, not prose: outside the word cap.
 */
export function ProviderTable() {
  const providers = getRegistry().providers;
  return (
    <div className="docs-providers not-prose" data-words="data">
      <table>
        <thead>
          <tr>
            <th scope="col">Provider</th>
            <th scope="col">Id</th>
            <th scope="col">Key variable</th>
            <th scope="col">Calls</th>
          </tr>
        </thead>
        <tbody>
          {providers.map((p) => (
            <tr key={p.id} style={{ "--lane": providerBrand(p.id).hue } as CSSProperties}>
              <th scope="row">
                <Link href={`/providers/${p.id}`} className="docs-provider-link">
                  <ProviderName brand={providerBrand(p.id)} size={18} />
                </Link>
              </th>
              <td>
                <code>{p.id}</code>
              </td>
              <td>
                <code>{p.env.join(", ")}</code>
              </td>
              <td>{[p.search ? "search" : null, p.contents ? "contents" : null].filter(Boolean).join(", ")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
