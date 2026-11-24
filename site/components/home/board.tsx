"use client";

import { type CSSProperties, type ReactNode, useRef, useState } from "react";
import { ProviderMark } from "@/components/brand/provider-mark";
import type { Leaderboard, RankedRow } from "@/lib/benchmarks";
import type { ProviderBrand } from "@/lib/provider-assets";
import { useInView, useSettledNumber } from "@/lib/motion";

/**
 * The leaderboard as an instrument. Bars race in when seen; the visitor sorts by quality,
 * reliability, latency or cost and the rows travel to their new places (transform only). Rank is
 * always quality first, then reliability; sorting by another column moves rows, never ranks.
 * Ties (within the tie band) share a bracket; unreliable providers carry a tag and rank last.
 */
type Metric = "quality" | "reliability" | "latency" | "cost";

const METRICS: { id: Metric; label: string; better: "high" | "low" }[] = [
  { id: "quality", label: "Quality", better: "high" },
  { id: "reliability", label: "Reliability", better: "high" },
  { id: "latency", label: "Latency p50", better: "low" },
  { id: "cost", label: "Cost / 1k", better: "low" },
];

const value = (r: RankedRow, m: Metric) => (m === "quality" ? r.quality : m === "reliability" ? r.reliability * 100 : m === "latency" ? r.latencyP50Ms : r.costUsdPer1k);
const format = (v: number, m: Metric) => (m === "quality" ? v.toFixed(1) : m === "reliability" ? `${v.toFixed(1)}%` : m === "latency" ? `${Math.round(v)} ms` : `$${v.toFixed(2)}`);

function Figure({ v, m, start }: { v: number; m: Metric; start: boolean }) {
  const shown = useSettledNumber(v, start, 900);
  return <>{format(shown, m)}</>;
}

export function Board({ board, brands, sampleTag }: { board: Leaderboard; brands: Record<string, ProviderBrand>; sampleTag: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const seen = useInView(ref, { once: true, threshold: 0.3 });
  const [metric, setMetric] = useState<Metric>("quality");
  const def = METRICS.find((m) => m.id === metric)!;

  // Rank order is the default; other metrics only reorder the view.
  const order =
    metric === "quality"
      ? board.rows
      : [...board.rows].sort((a, b) => (def.better === "high" ? value(b, metric) - value(a, metric) : value(a, metric) - value(b, metric)));
  const position = new Map(order.map((r, i) => [r.provider, i]));
  const max = Math.max(...board.rows.map((r) => value(r, metric)));
  const floor = metric === "reliability" ? 85 : 0; // reliability differs in the last few points: show them
  const span = Math.max(1e-9, max - floor);

  // Tie brackets: consecutive rank-order rows that share a rank, drawn only in rank order.
  const groups: { from: number; to: number; rank: number }[] = [];
  if (metric === "quality") {
    board.rows.forEach((r, i) => {
      const last = groups[groups.length - 1];
      if (r.tied && last && last.rank === r.rank && last.to === i - 1) last.to = i;
      else if (r.tied) groups.push({ from: i, to: i, rank: r.rank });
    });
  }

  return (
    <div ref={ref} className="board" data-seen={seen ? "" : undefined} data-words="data" style={{ "--rows": board.rows.length } as CSSProperties}>
      <div className="board-head">
        <div className="board-keys" role="group" aria-label="Sort by">
          {METRICS.map((m) => (
            <button key={m.id} type="button" className={`key key-sm ${metric === m.id ? "key-lit" : ""}`} aria-pressed={metric === m.id} onClick={() => setMetric(m.id)}>
              <span className="key-face">{m.label}</span>
            </button>
          ))}
        </div>
        {sampleTag}
      </div>
      <div className="board-rows" role="list">
        {groups.map((g) => (
          <span key={`${g.rank}-${g.from}`} className="board-tie" aria-hidden="true" style={{ "--from": g.from, "--to": g.to } as CSSProperties}>
            <span className="type-label">tie</span>
          </span>
        ))}
        {board.rows.map((r) => {
          const i = position.get(r.provider) ?? 0;
          const brand = brands[r.provider]!;
          const v = value(r, metric);
          return (
            <div
              key={r.provider}
              role="listitem"
              className="board-row"
              data-unreliable={r.dependable ? undefined : ""}
              style={{ "--i": i, "--lane": brand.hue, "--w": Math.max(0.02, (v - floor) / span), "--d": board.rows.indexOf(r) } as CSSProperties}
            >
              <span className="board-rank figures">{r.tied ? `=${r.rank}` : r.rank}</span>
              <span className="board-name">
                <ProviderMark brand={brand} size={20} />
                <span>{brand.name}</span>
                {r.dependable ? null : (
                  <span className="tag" style={{ "--tag-fill": "var(--warn)", "--tag-ink": "var(--on-state)" } as CSSProperties}>
                    unreliable
                  </span>
                )}
              </span>
              <span className="board-track" aria-hidden="true">
                <span className="board-bar" />
              </span>
              <span className="board-value figures">
                <Figure v={v} m={metric} start={seen} />
              </span>
            </div>
          );
        })}
      </div>
      {board.notRun.length ? (
        <p className="board-notrun type-label">
          Not run:{" "}
          {board.notRun.map((id) => (
            <span key={id} className="board-notrun-item">
              <ProviderMark brand={brands[id]!} size={14} /> {brands[id]!.name}
            </span>
          ))}
        </p>
      ) : null}
    </div>
  );
}
