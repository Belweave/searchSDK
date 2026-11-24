import type { CSSProperties, ReactNode } from "react";
import type { Row } from "@/lib/registry";

/** The verification status of registry data: one line, said once per page, led by a state tag. */
export function StatusLine({ children, verified = false, className = "" }: { children: ReactNode; verified?: boolean; className?: string }) {
  return (
    <p data-status="" className={`status-line ${className}`}>
      <span className="tag" style={{ "--tag-fill": verified ? "var(--ok)" : "var(--warn)", "--tag-ink": "var(--on-state)" } as CSSProperties}>
        {verified ? "live verified" : "from docs"}
      </span>
      <span>{children}</span>
    </p>
  );
}

/** Marks a fact the spec lists as unverified; the reasons are in the page's Unverified section. */
export function UnverifiedMark({ reasons, href = "#unverified" }: { reasons: string[]; href?: string }) {
  if (!reasons.length) return null;
  return (
    <a href={href} title={reasons.join(" ")} className="unverified-mark">
      unverified
    </a>
  );
}

/**
 * A value from a row, with its unverified mark. "No" and "Unknown" read quieter than facts; values
 * with figures set in mono (the brand's rule for numbers), words stay in the reading face.
 */
export function RowValue({ row, unverifiedHref }: { row: Row; unverifiedHref?: string }) {
  const quiet = row.value === "No" || row.value === "Unknown" || row.value.startsWith("Unknown");
  return (
    <>
      <span className={quiet ? "text-fg-subtle" : /\d/.test(row.value) ? "figures" : undefined}>{row.value}</span>
      <UnverifiedMark reasons={row.unverified} href={unverifiedHref} />
    </>
  );
}

/** A titled list of rows in a slab. Option and field names render as code. */
export function RowList({ title, rows, code = false, children }: { title: string; rows: Row[]; code?: boolean; children?: ReactNode }) {
  return (
    <section className="row-list slab">
      <h3 className="type-label row-list-title">{title}</h3>
      <dl className="row-list-rows">
        {rows.map((row) => (
          <div key={`${row.label}-${row.pointer}`} className="row-list-row">
            <dt>{code ? <code className="row-list-code">{row.label}</code> : row.label}</dt>
            <dd>
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
    <div className="name-list">
      <p className="type-label">{title}</p>
      {names.length ? (
        <ul>
          {names.map((n) => (
            <li key={n}>
              <code>{n}</code>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-fg-subtle">None</p>
      )}
    </div>
  );
}
