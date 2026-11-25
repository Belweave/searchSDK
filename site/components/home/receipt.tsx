"use client";

import { type CSSProperties, useRef, useState } from "react";
import { ProviderMark } from "@/components/brand/provider-mark";
import type { ProviderBrand } from "@/lib/provider-assets";
import { useInView, useSettledNumber } from "@/lib/motion";

/**
 * Honest cost, as a receipt that prints attempt by attempt. The lines are example providers with a
 * placeholder price (components/home/sections.tsx), so no real provider is shown failing. The
 * visitor picks how the failing line's attempt fails and watches billing follow the policy: a
 * timeout or a network failure may have been billed and is counted; a 429 was not.
 */
export type ReceiptLine = {
  key: string;
  brand: ProviderBrand;
  call: "search" | "contents";
  source: "reported" | "reported-credits" | "computed" | "unknown";
  usd: number | null;
  /** The line whose outcome the visitor chooses; the fallback line depends on it. */
  role?: "failing" | "fallback";
};

type Failure = "attempt_timeout" | "network" | "rate_limit" | "none";
const FAILURES: { id: Failure; label: string; billed: "possible" | "no" | "yes" }[] = [
  { id: "attempt_timeout", label: "Timeout", billed: "possible" },
  { id: "network", label: "Network", billed: "possible" },
  { id: "rate_limit", label: "429", billed: "no" },
  { id: "none", label: "No failure", billed: "yes" },
];

const SOURCE: Record<ReceiptLine["source"], string> = { reported: "reported", "reported-credits": "credits", computed: "list price", unknown: "unknown" };
const money = (v: number) => `$${v.toFixed(4)}`;

function Total({ value, start }: { value: number; start: boolean }) {
  const v = useSettledNumber(value, start, 900);
  return <>{money(v)}</>;
}

export function Receipt({ lines, note }: { lines: ReceiptLine[]; note: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const seen = useInView(ref, { once: true, threshold: 0.35 });
  const [failure, setFailure] = useState<Failure>("attempt_timeout");
  const f = FAILURES.find((x) => x.id === failure)!;

  const rows = lines.map((l) => {
    if (l.role === "failing") {
      if (failure === "none") return { ...l, outcome: "ok", billed: "yes" as const, counted: l.usd };
      return { ...l, outcome: failure.replace("_", " "), billed: f.billed, counted: f.billed === "possible" ? l.usd : 0 };
    }
    if (l.role === "fallback" && failure === "none") return { ...l, outcome: "not sent", billed: "no" as const, counted: 0 };
    return { ...l, outcome: "ok", billed: "yes" as const, counted: l.usd };
  });
  const total = rows.reduce((s, r) => s + (r.counted ?? 0), 0);
  const possible = rows.filter((r) => r.billed === "possible").reduce((s, r) => s + (r.counted ?? 0), 0);
  const unknown = rows.filter((r) => r.counted === null).length;
  const failingName = lines.find((l) => l.role === "failing")?.brand.name ?? "first";

  return (
    <div ref={ref} className="receipt" data-seen={seen ? "" : undefined} data-words="data">
      <div className="receipt-keys" role="group" aria-label={`How the ${failingName} attempt fails`}>
        {FAILURES.map((x) => (
          <button key={x.id} type="button" className={`key key-sm ${failure === x.id ? "key-lit" : ""}`} aria-pressed={failure === x.id} onClick={() => setFailure(x.id)}>
            <span className="key-face">{x.label}</span>
          </button>
        ))}
      </div>
      <div className="receipt-paper">
        <div className="receipt-head type-label">
          <span>Attempt</span>
          <span>Outcome</span>
          <span>Billed</span>
          <span>Source</span>
          <span className="receipt-num">Cost</span>
        </div>
        {rows.map((r, i) => (
          <div
            key={r.key}
            className="receipt-row"
            data-role={r.role}
            data-billed={r.billed}
            data-skipped={r.outcome === "not sent" ? "" : undefined}
            style={{ "--i": i, "--lane": r.brand.hue } as CSSProperties}
          >
            <span className="receipt-who">
              <ProviderMark brand={r.brand} size={16} />
              <span className="receipt-name">{r.brand.name}</span>
              <span className="receipt-call figures">{r.call}()</span>
            </span>
            <span className="receipt-outcome">
              <span className="tag" data-state={r.outcome === "ok" ? "ok" : r.outcome === "not sent" ? "off" : "fail"}>
                {r.outcome}
              </span>
            </span>
            <span className="receipt-billed">{r.billed === "possible" ? "possibly" : r.billed}</span>
            <span className="receipt-source">{r.counted === null ? "unknown" : SOURCE[r.source]}</span>
            <span className="receipt-num figures">{r.counted === null ? "?" : money(r.counted)}</span>
          </div>
        ))}
        <div className="receipt-total">
          <span className="receipt-total-label">Total</span>
          <span className="receipt-total-figure figures">
            <Total value={total} start={seen} />
          </span>
          <span className="receipt-notes type-label">
            {possible > 0 ? <span>incl. {money(possible)} possibly billed</span> : null}
            {unknown ? <span>{unknown} unknown, never $0</span> : null}
            <span>{note}</span>
          </span>
        </div>
      </div>
    </div>
  );
}
