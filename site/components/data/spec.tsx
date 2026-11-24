import type { ReactNode } from "react";
import type { Row } from "@/lib/registry";

/** The verification status of registry data: one line, said once per page. */
export function StatusLine({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <p data-status="" className={`inline-flex items-start gap-2 text-sm text-fg-muted ${className}`}>
      <span aria-hidden="true" className="mt-1.5 inline-block size-2 shrink-0 rounded-full bg-warn" />
      <span>{children}</span>
    </p>
  );
}

/** Marks a fact the spec lists as unverified; the reasons are in the page's Unverified section. */
export function UnverifiedMark({ reasons }: { reasons: string[] }) {
  if (!reasons.length) return null;
  return (
    <a
      href="#unverified"
      title={reasons.join(" ")}
      className="ml-2 inline-block rounded-sm border border-warn px-1 font-mono text-xs leading-normal text-warn no-underline"
    >
      unverified
    </a>
  );
}

/** A value from a row, with its unverified mark. "No" and "Unknown" read quieter than facts. */
export function RowValue({ row }: { row: Row }) {
  const quiet = row.value === "No" || row.value === "Unknown" || row.value.startsWith("Unknown");
  return (
    <>
      <span className={quiet ? "text-fg-subtle" : "figures"}>{row.value}</span>
      <UnverifiedMark reasons={row.unverified} />
    </>
  );
}

/** A titled list of rows. Option and field names render as code. */
export function RowList({ title, rows, code = false, children }: { title: string; rows: Row[]; code?: boolean; children?: ReactNode }) {
  return (
    <section className="min-w-0">
      <h3 className="text-base font-semibold tracking-tight">{title}</h3>
      <dl className="mt-3 divide-y divide-line border-y border-line">
        {rows.map((row) => (
          <div key={`${row.label}-${row.pointer}`} className="flex items-baseline justify-between gap-4 py-2.5 text-sm">
            <dt className="min-w-0 text-fg-muted">{code ? <code className="font-mono text-fg">{row.label}</code> : row.label}</dt>
            <dd className="text-right text-fg">
              <RowValue row={row} />
            </dd>
          </div>
        ))}
      </dl>
      {children}
    </section>
  );
}

/** Names as an inline list of code, or a dash when there are none. */
export function NameList({ title, names }: { title: string; names: string[] }) {
  return (
    <div className="mt-4 text-sm">
      <p className="text-fg-muted">{title}</p>
      {names.length ? (
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {names.map((n) => (
            <li key={n}>
              <code className="rounded-sm bg-surface-2 px-1.5 py-0.5 font-mono text-xs text-fg">{n}</code>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-1 text-fg-subtle">None</p>
      )}
    </div>
  );
}
