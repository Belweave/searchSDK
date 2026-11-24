"use client";

import Link from "next/link";
import { type CSSProperties, type ReactNode, useRef, useState } from "react";
import { ProviderMark } from "@/components/brand/provider-mark";
import type { ProviderBrand } from "@/lib/provider-assets";
import { useFrameLoop, useInView } from "@/lib/motion";
import { jsonLines } from "./stage/code";

/**
 * One file per provider: an excerpt of the provider's registry spec on the left, and what reads
 * it on the right (the TypeScript and Python runtimes, the conformance suite, the leaderboard, these docs).
 * Choosing a provider sends a pulse down every beam and each target redraws from that one file.
 */
export type FeedProvider = {
  brand: ProviderBrand;
  excerpt: unknown;
  cases: number;
  options: number;
  fields: number;
  hasContents: boolean;
};

const CYCLE_MS = 3400;

export function SpecFeed({ providers }: { providers: FeedProvider[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { threshold: 0.4 });
  const [index, setIndex] = useState(0);
  const [touched, setTouched] = useState(false);
  const elapsed = useRef(0);
  useFrameLoop((dt) => {
    elapsed.current += dt;
    if (elapsed.current >= CYCLE_MS) {
      elapsed.current = 0;
      setIndex((i) => (i + 1) % providers.length);
    }
  }, inView && !touched);
  const p = providers[index] ?? providers[0]!;
  const id = p.brand.id;

  const targets: { key: string; title: string; body: ReactNode }[] = [
    {
      key: "ts",
      title: "TypeScript runtime",
      body: (
        <code className="feed-code">
          search(q, {"{"} provider: <span className="c-str">&quot;{id}&quot;</span> {"}"})
        </code>
      ),
    },
    {
      key: "py",
      title: "Python runtime",
      body: (
        <code className="feed-code">
          search(q, provider=<span className="c-str">&quot;{id}&quot;</span>)
        </code>
      ),
    },
    { key: "conf", title: "Conformance, both runtimes", body: <span className="figures feed-big">{p.cases} cases</span> },
    {
      key: "bench",
      title: "Benchmark lane",
      body: (
        <Link href="/benchmarks" className="feed-link">
          <ProviderMark brand={p.brand} size={16} /> {p.brand.name}
        </Link>
      ),
    },
    {
      key: "docs",
      title: "These docs",
      body: (
        <Link href={`/providers/${id}`} className="feed-link figures">
          /providers/{id}
        </Link>
      ),
    },
  ];

  return (
    <div ref={ref} className="feed" data-words="data" style={{ "--lane": p.brand.hue } as CSSProperties}>
      <div className="feed-picker" role="group" aria-label="Provider spec">
        {providers.map((x, i) => (
          <button
            key={x.brand.id}
            type="button"
            className={`switch-pick ${i === index ? "is-on" : ""}`}
            aria-pressed={i === index}
            style={{ "--lane": x.brand.hue } as CSSProperties}
            onClick={() => {
              setTouched(true);
              setIndex(i);
            }}
          >
            <ProviderMark brand={x.brand} size={18} labelled />
          </button>
        ))}
      </div>
      <div className="feed-grid">
        <div className="feed-spec">
          <p className="type-label feed-file">registry/providers/{id}.json</p>
          <pre className="feed-json" key={id}>
            <code>{jsonLines(p.excerpt, { maxString: 38, mark: new Set(["to", "path", "results", "url"]) })}</code>
          </pre>
        </div>
        <svg className="feed-beams" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          {targets.map((t, i) => {
            const y = ((i + 0.5) / targets.length) * 100;
            const d = `M0 50 C 50 50, 50 ${y}, 100 ${y}`;
            return (
              <g key={t.key}>
                <path d={d} className="feed-beam" vectorEffect="non-scaling-stroke" />
                <path key={`${id}-${t.key}`} d={d} className="feed-pulse" pathLength={100} vectorEffect="non-scaling-stroke" style={{ "--i": i } as CSSProperties} />
              </g>
            );
          })}
        </svg>
        <div className="feed-targets">
          {targets.map((t, i) => (
            <div key={t.key} className="feed-target" style={{ "--i": i } as CSSProperties}>
              <span className="type-label feed-target-title">{t.title}</span>
              <span key={id} className="feed-target-body">
                {t.body}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
