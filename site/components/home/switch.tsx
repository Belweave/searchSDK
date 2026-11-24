"use client";

import { type CSSProperties, useRef, useState } from "react";
import { ProviderMark } from "@/components/brand/provider-mark";
import type { ProviderBrand } from "@/lib/provider-assets";
import { useFrameLoop, useInView } from "@/lib/motion";
import type { Wire } from "@/lib/registry";
import { highlightTs } from "./stage/code";

/**
 * "Change one word": the home example with its provider as a key. Each press swaps the provider;
 * the request on the wire and the response paths reshape (read from the registry), and the lines
 * your code reads stay exactly where they are. Cycles by itself while in view until touched.
 */
export type SwitchProvider = { brand: ProviderBrand; wire: Wire };

const CYCLE_MS = 2800;

function requestLines(w: Wire, query: string, maxResults: number): string[] {
  // As the runtime builds it: the spec's fixed fields, then the mapped inputs (maxResults defaults to the policy's 10).
  const values: Record<string, unknown> = { ...w.fixed };
  if (w.params.query) values[w.params.query] = query;
  if (w.params.maxResults) values[w.params.maxResults] = maxResults;
  const key = w.auth.prefix ? `${w.auth.prefix}$${w.auth.env}` : `$${w.auth.env}`;
  const auth = w.auth.in === "header" ? [`${w.auth.name}: ${key}`] : [];
  if (w.encoding === "query") {
    const u = new URL(w.url);
    const qs = Object.entries(values)
      .map(([k, v]) => `${k}=${encodeURIComponent(typeof v === "string" ? v : JSON.stringify(v)).replace(/%20/g, "+")}`)
      .join("&");
    return [`GET ${u.host}${u.pathname}`, `  ?${qs}`, ...auth];
  }
  const u = new URL(w.url);
  const body = JSON.stringify(values, null, 1).replace(/\n\s*/g, " ");
  return [`${w.method} ${u.host}${u.pathname}`, ...auth, body];
}

function responseLines(w: Wire): [string, string][] {
  const list = w.list === "$" ? "" : `${w.list}[]`;
  return (["url", "title", "excerpts"] as const)
    .filter((f) => w.fields[f])
    .map((f) => [`${list}.${w.fields[f]}`.replace(/^\./, ""), f]);
}

export function ProviderSwitch({ providers, template, query, maxResults }: { providers: SwitchProvider[]; template: string; query: string; maxResults: number }) {
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
  const next = () => {
    setTouched(true);
    setIndex((i) => (i + 1) % providers.length);
  };
  const lines = template.split("\n");

  return (
    <div ref={ref} className="switch" data-words="data" style={{ "--lane": p.brand.hue } as CSSProperties}>
      <pre className="switch-code">
        <code>
          {lines.map((line, n) => {
            const at = line.indexOf("%%PROVIDER%%");
            if (at < 0) return <span key={n} className="code-line">{highlightTs(line, n)}{"\n"}</span>;
            return (
              <span key={n} className="code-line">
                {highlightTs(line.slice(0, at), "a")}
                <button type="button" className="switch-word" onClick={next} aria-label={`Provider: ${p.brand.id}. Switch to the next provider`}>
                  <span key={p.brand.id} className="switch-word-face">&quot;{p.brand.id}&quot;</span>
                </button>
                {highlightTs(line.slice(at + "%%PROVIDER%%".length), "b")}
                {"\n"}
              </span>
            );
          })}
        </code>
      </pre>

      <div className="switch-picker" role="group" aria-label="Provider">
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

      <div className="switch-cols">
        <div className="switch-col" data-moves="">
          <p className="type-label switch-col-title">
            <span>Sent to</span>
            <ProviderMark brand={p.brand} size={14} />
            <span>{p.brand.name}</span>
          </p>
          <pre className="switch-wire">
            <code>
              {requestLines(p.wire, query, maxResults).map((l, n) => (
                <span key={`${p.brand.id}-${n}`} className="switch-line" style={{ "--i": n } as CSSProperties}>
                  {l}
                  {"\n"}
                </span>
              ))}
            </code>
          </pre>
        </div>
        <div className="switch-col" data-moves="">
          <p className="type-label switch-col-title">Read from its response</p>
          <pre className="switch-wire">
            <code>
              {responseLines(p.wire).map(([from, to], n) => (
                <span key={`${p.brand.id}-${n}`} className="switch-line switch-map" style={{ "--i": n + 2 } as CSSProperties}>
                  <span className="switch-from">{from}</span>
                  <span className="switch-arrow" aria-hidden="true"> → </span>
                  <span className="switch-to">{to}</span>
                  {"\n"}
                </span>
              ))}
              {p.wire.cost ? (
                <span key={`${p.brand.id}-cost`} className="switch-line switch-map" style={{ "--i": 5 } as CSSProperties}>
                  <span className="switch-from">{p.wire.cost.path}</span>
                  <span className="switch-arrow" aria-hidden="true"> → </span>
                  <span className="switch-to">cost</span>
                  {"\n"}
                </span>
              ) : (
                <span key={`${p.brand.id}-cost`} className="switch-line switch-map" style={{ "--i": 5 } as CSSProperties}>
                  <span className="switch-from">list price</span>
                  <span className="switch-arrow" aria-hidden="true"> → </span>
                  <span className="switch-to">cost</span>
                  {"\n"}
                </span>
              )}
            </code>
          </pre>
        </div>
        <div className="switch-col switch-still">
          <p className="type-label switch-col-title">
            <span>You read</span>
            <span className="tag">unchanged</span>
          </p>
          <pre className="switch-wire">
            <code>
              {["results[0].url", "results[0].title", "results[0].excerpts", "cost.usd"].map((l) => (
                <span key={l} className="switch-line-still">
                  {l}
                  {"\n"}
                </span>
              ))}
            </code>
          </pre>
        </div>
      </div>
    </div>
  );
}
