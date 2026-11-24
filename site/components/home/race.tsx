"use client";

import { type CSSProperties, useCallback, useEffect, useRef, useState } from "react";
import type { Race as RaceData } from "@/lib/race";
import { useInView, usePageVisible, usePrefersReducedMotion } from "@/lib/motion";
import "./race.css";

/**
 * The home page centrepiece: one query fans out to every provider and the answers race in.
 * Each bar grows at the same speed and stops at that provider's latency, so the fastest lands first
 * and the finished picture is a latency chart. Results, cost and quality appear as each one lands.
 *
 * Phases: "still" is the server render and the reduced-motion form (every lane finished).
 * With script and motion allowed, CSS hides the still from the first paint (race.css), and the race
 * starts when the component is in view. Every lane reserves its full size, so nothing shifts.
 */
type Phase = "still" | "ready" | "running" | "done";

const HOLD_MS = 200;

function host(url: string) {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

function usd(value: number) {
  return `$${value.toFixed(3)}`;
}

export function Race({ race }: { race: RaceData }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = usePrefersReducedMotion();
  const inView = useInView(ref, { threshold: 0.3 });
  const visible = usePageVisible();
  const [phase, setPhase] = useState<Phase>("still");
  const [elapsed, setElapsed] = useState(0);
  const startedAt = useRef<number | null>(null);
  const offset = useRef(0);

  const slowest = Math.max(1, ...race.lanes.map((l) => l.run?.latencyMs ?? 0));

  // Reduced motion: stay on the still. Otherwise arm the race once hydrated.
  useEffect(() => {
    setPhase(reduced ? "still" : "ready");
    setElapsed(0);
    offset.current = 0;
  }, [reduced]);

  // Start when seen.
  useEffect(() => {
    if (phase === "ready" && inView) setPhase("running");
  }, [phase, inView]);

  // The clock: runs only while running, in view and the tab is visible; pauses keep their place.
  useEffect(() => {
    if (phase !== "running" || !inView || !visible) return;
    let frame = 0;
    startedAt.current = null;
    const tick = (now: number) => {
      if (startedAt.current === null) startedAt.current = now - offset.current;
      const t = now - startedAt.current;
      offset.current = t;
      if (t >= slowest + HOLD_MS) {
        setElapsed(slowest);
        setPhase("done");
        return;
      }
      setElapsed(Math.min(t, slowest));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [phase, inView, visible, slowest]);

  const replay = useCallback(() => {
    offset.current = 0;
    setElapsed(0);
    setPhase("running");
  }, []);

  const clock = phase === "still" || phase === "done" ? slowest : elapsed;

  return (
    <div ref={ref} className="race" data-race-phase={phase} aria-busy={phase === "running"}>
      <div className="race-query">
        <svg aria-hidden="true" viewBox="0 0 20 20" className="size-4 shrink-0 text-fg-subtle" fill="none" stroke="currentColor" strokeWidth="1.6">
          <circle cx="8.5" cy="8.5" r="5.5" />
          <path d="m13 13 4 4" strokeLinecap="round" />
        </svg>
        <span className="min-w-0 flex-1 truncate font-mono text-sm text-fg">{race.query}</span>
        <button type="button" onClick={replay} className="race-replay" disabled={phase === "running"}>
          Run again
        </button>
      </div>

      <div className="race-head" aria-hidden="true">
        <span>Provider</span>
        <span />
        <span>Latency</span>
        <span>Cost</span>
        <span>Quality</span>
      </div>

      <ol className="race-lanes">
        {race.lanes.map((lane) => {
          const run = lane.run;
          const done = run !== null && clock >= run.latencyMs;
          const share = run ? run.latencyMs / slowest : 0;
          const progress = run ? Math.min(clock / run.latencyMs, 1) : 0;
          const top = run?.results[0];
          // A lane with no run shows its dashes from the start; a lane with one fades its figures in.
          const metric = `race-metric figures${run ? " race-out" : ""}`;
          return (
            <li
              key={lane.provider}
              className="race-lane"
              data-done={done || undefined}
              data-no-run={run ? undefined : ""}
              style={{ "--lane-hue": lane.hue } as CSSProperties}
            >
              <span className="race-name">
                <span aria-hidden="true" className="race-swatch" />
                {lane.name}
              </span>
              <span className="race-track" aria-hidden="true">
                <span className="race-bar-slot" style={{ width: `${share * 100}%` }}>
                  <span className="race-bar" style={{ transform: `scaleX(${progress})` }} />
                </span>
              </span>
              <span className={metric}>{run ? `${run.latencyMs} ms` : "–"}</span>
              <span className={metric}>{run ? usd(run.costUsd) : "–"}</span>
              <span className={metric}>{run ? run.quality : "–"}</span>
              {top ? (
                <span className="race-result race-out">
                  <span className="truncate text-fg">{top.title}</span>
                  <span className="shrink-0 font-mono text-xs text-fg-subtle">{host(top.url)}</span>
                </span>
              ) : run ? null : (
                <span className="race-result text-fg-subtle">No run</span>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
