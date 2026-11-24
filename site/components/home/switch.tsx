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

type ReqRow = { k: string; v: string; kind: "param" | "fixed" | "auth" };

/**
 * The request as the runtime builds it: method and endpoint, the key's header (its variable name,
 * never a value), then the mapped inputs (maxResults defaults to the policy's 10) and the spec's
 * fixed fields, sent as a JSON body or a query string.
 */
function request(w: Wire, query: string, maxResults: number): { method: string; endpoint: string; rows: ReqRow[] } {
  const u = new URL(w.url);
  const rows: ReqRow[] = [];
  if (w.auth.in === "header") rows.push({ k: w.auth.name, v: `${w.auth.prefix ?? ""}$${w.auth.env}`, kind: "auth" });
  if (w.params.query) rows.push({ k: w.params.query, v: JSON.stringify(query), kind: "param" });
  if (w.params.maxResults) rows.push({ k: w.params.maxResults, v: String(maxResults), kind: "param" });
  for (const [k, v] of Object.entries(w.fixed)) rows.push({ k, v: JSON.stringify(v), kind: "fixed" });
  return { method: w.method, endpoint: `${u.host}${u.pathname}`, rows };
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
          {(() => {
            const req = request(p.wire, query, maxResults);
            return (
              <div className="switch-req" key={p.brand.id}>
                <p className="switch-line switch-endpoint" style={{ "--i": 0 } as CSSProperties}>
                  <span className="tag">{req.method}</span>
                  <span className="figures">{req.endpoint}</span>
                </p>
                <dl className="switch-rows">
                  {req.rows.map((r, n) => (
                    <div key={r.k} className="switch-line switch-row" data-kind={r.kind} style={{ "--i": n + 1 } as CSSProperties}>
                      <dt>{r.k}</dt>
                      <dd>{r.v}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            );
          })()}
        </div>
        <div className="switch-col switch-map-col">
          <p className="type-label switch-col-title switch-map-head">
            <span>From its response</span>
            <span>
              You read <span className="tag">unchanged</span>
            </span>
          </p>
          <dl className="switch-rows">
            {[...responseLines(p.wire).map(([from, to]) => [from, `result.${to}`] as const), [p.wire.cost ? p.wire.cost.path : "list price", "cost.usd"] as const].map(([from, to], n) => (
              <div key={to} className="switch-row switch-map-row">
                <dt key={`${p.brand.id}-${from}`} className="switch-line" style={{ "--i": n + 1 } as CSSProperties}>
                  {from}
                </dt>
                <dd>
                  <span aria-hidden="true" className="switch-arrow">
                    →{" "}
                  </span>
                  {to}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  );
}
