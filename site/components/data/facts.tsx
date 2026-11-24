import type { ReactNode } from "react";

/** One way to show a value that may be unknown. Unknown is said, never guessed. */
export function Fact({ value, format }: { value: string | number | boolean | null; format?: (v: string | number) => string }) {
  if (value === null) return <span className="text-fg-subtle">Unknown</span>;
  if (typeof value === "boolean") return <span>{value ? "Yes" : "No"}</span>;
  return <span className="figures">{format ? format(value) : value}</span>;
}

export function FactList({ title, rows }: { title: string; rows: { label: string; value: ReactNode }[] }) {
  return (
    <section>
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      <dl className="mt-3 divide-y divide-line border-y border-line">
        {rows.map((row) => (
          <div key={row.label} className="flex items-baseline justify-between gap-4 py-2.5 text-sm">
            <dt className="text-fg-muted">{row.label}</dt>
            <dd className="text-right text-fg">{row.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export const usdPer1k = (v: string | number) => `$${Number(v).toFixed(2)} / 1k`;
