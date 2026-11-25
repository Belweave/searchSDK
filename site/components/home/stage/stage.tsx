"use client";

import { type CSSProperties, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ProviderMark } from "@/components/brand/provider-mark";
import { useFrameLoop, useInView, usePrefersReducedMotion } from "@/lib/motion";
import type { Stage as StageData, StagePreset } from "@/lib/race";
import { highlightTs, jsonLines } from "./code";
import { buildStory, type Frame, pointerMoves, reach } from "./story";
import "./stage.css";

/**
 * The home page stage: searchSDK working end to end as a scripted story that starts by itself
 * and that the visitor can take over. Lanes, request and response shapes come from the registry;
 * timings, results and costs are labelled placeholder data. While it is pending, every provider has
 * the same values, the lanes move in lockstep and no per-provider time or cost is printed.
 *
 * Visitor controls: preset queries, providers on and off, Pause, Replay, a scrubber over the
 * whole story, and hovering or focusing a lane to read that provider's raw response beside the
 * normalized one. Touching any control takes over: the pointer leaves and presets stop cycling.
 *
 * Motion: one requestAnimationFrame clock, only while the stage is in view and the tab visible.
 * Everything moves by transform or opacity inside boxes that are sized up front, so nothing
 * shifts. Reduced motion: the finished story as a still, with a Play key.
 */

type Props = {
  stage: StageData;
  /** The typechecked example (content/examples/stage.ts) with %%QUERY%% for the query and %%PROVIDERS%% for the provider list. */
  template: string;
  sampleTag: ReactNode;
  /** searchSDK's loader study (components/brand/searchsdk.tsx), shown while the answer is loading. */
  loader?: ReactNode;
};


function host(url: string) {
  try {
    const u = new URL(url);
    return u.hostname + (u.pathname === "/" ? "" : u.pathname);
  } catch {
    return url;
  }
}

const usd = (v: number) => (v === 0 ? "$0" : v < 0.01 ? `$${v.toFixed(4)}` : `$${v.toFixed(3)}`);
const secs = (ms: number) => `${(ms / 1000).toFixed(2)} s`;

export function Stage({ stage, template, sampleTag, loader }: Props) {
  const reduced = usePrefersReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const pointerRef = useRef<HTMLDivElement>(null);
  const inView = useInView(rootRef, { threshold: 0.25 });

  // The call's provider order: the lanes in order (alphabetical by name). The story opens the first one's top result.
  const allIds = useMemo(() => stage.lanes.map((l) => l.brand.id), [stage.lanes]);
  const [presetIndex, setPresetIndex] = useState(0);
  const [enabled, setEnabled] = useState<string[]>(allIds);
  const [takenOver, setTakenOver] = useState(false);
  const [userInspect, setUserInspect] = useState<string | null>(null);
  const [userTab, setUserTab] = useState<string | null>(null);
  const [rewind, setRewind] = useState(false);

  const preset: StagePreset = stage.presets[presetIndex] ?? stage.presets[0]!;
  const fallbackLatency = preset.runs[stage.fallback.id]?.latencyMs ?? 600;
  const story = useMemo(() => buildStory(preset, enabled, fallbackLatency, stage.attemptTimeoutMs), [preset, enabled, fallbackLatency, stage.attemptTimeoutMs]);

  // The server and reduced motion render the finished story: a meaningful still.
  const [t, setT] = useState(() => story.times.end);
  const [playing, setPlaying] = useState(false);
  const started = useRef(false);
  const scrubbing = useRef<boolean>(false);

  // Start the first time the stage is seen (not under reduced motion).
  useEffect(() => {
    if (reduced || started.current || !inView) return;
    started.current = true;
    setRewind(true);
    setT(0);
    setPlaying(true);
  }, [inView, reduced]);

  // Rewind transitions last one beat, then the clock owns the bars again.
  useEffect(() => {
    if (!rewind) return;
    const id = window.setTimeout(() => setRewind(false), 320);
    return () => window.clearTimeout(id);
  }, [rewind]);

  const restart = useCallback((index: number, at = 0) => {
    setPresetIndex(index);
    setRewind(true);
    setT(at);
    setPlaying(true);
    setUserTab(null);
  }, []);

  const tRef = useRef(t);
  tRef.current = t;
  useFrameLoop(
    (dt) => {
      if (scrubbing.current) return;
      const next = tRef.current + dt;
      tRef.current = next;
      if (next < story.times.loop) {
        setT(next);
        return;
      }
      if (takenOver) {
        setPlaying(false);
        setT(story.times.end);
        return;
      }
      // Loop: the next preset, from the top.
      tRef.current = 0;
      setPresetIndex((i) => (i + 1) % stage.presets.length);
      setRewind(true);
      setT(0);
    },
    playing && inView,
  );

  const frame: Frame = useMemo(() => story.frame(t), [story, t]);
  const inspectId = userInspect ?? frame.inspect;

  // ---- Visitor actions ----
  const takeOver = () => setTakenOver(true);
  const choosePreset = (i: number) => {
    takeOver();
    restart(i, story.times.pressPreset + 60);
  };
  const toggleProvider = (id: string) => {
    takeOver();
    setEnabled((cur) => {
      if (cur.includes(id)) return cur.length > 1 ? cur.filter((x) => x !== id) : cur;
      return allIds.filter((x) => x === id || cur.includes(x));
    });
  };
  const togglePlay = () => {
    takeOver();
    if (playing) setPlaying(false);
    else {
      if (t >= story.times.end) setT(0);
      setPlaying(true);
    }
  };
  const replay = () => {
    takeOver();
    restart(presetIndex, 0);
  };
  const scrubTo = (value: number) => {
    takeOver();
    setT(value);
  };

  // ---- Pointer: follows the script's moves, measured on the live (possibly tilted) layout ----
  const moves = useMemo(() => pointerMoves(story.times, preset.id, frame.lead), [story.times, preset.id, frame.lead]);
  const showPointer = !takenOver && !reduced && playing;
  useEffect(() => {
    const el = pointerRef.current;
    const view = viewRef.current;
    if (!el || !view) return;
    if (!showPointer) {
      el.dataset.visible = "false";
      return;
    }
    const vr = view.getBoundingClientRect();
    // Phones and narrow stages get a fingertip instead of an arrow; the story is the same.
    el.dataset.touch = String(vr.width < 720 || !matchMedia("(hover: hover) and (pointer: fine)").matches);
    const rest = { x: vr.width * 0.62, y: vr.height * 0.96 };
    const at = (name: string | null) => {
      if (!name) return rest;
      // The first copy of the target that is laid out (narrow stages hide the title-bar queries).
      const target = [...view.querySelectorAll(`[data-target="${name}"]`)].find((n) => n.getClientRects().length > 0);
      if (!target) return rest;
      const r = target.getBoundingClientRect();
      const ax = r.width > 140 ? 0.3 : 0.5;
      return { x: r.left - vr.left + r.width * ax, y: r.top - vr.top + r.height * 0.58 };
    };
    let idx = -1;
    moves.forEach((m, i) => {
      if (t >= m.from) idx = i;
    });
    let pos;
    if (idx < 0) pos = at(null);
    else {
      const m = moves[idx]!;
      const to = at(m.target);
      if (t >= m.to) pos = to;
      else {
        const from = at(idx > 0 ? moves[idx - 1]!.target : null);
        const p = reach((t - m.from) / (m.to - m.from));
        const bend = (idx % 2 ? -1 : 1) * Math.min(50, Math.hypot(to.x - from.x, to.y - from.y) * 0.12);
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const len = Math.hypot(dx, dy) || 1;
        const cx = from.x + dx / 2 - (dy / len) * bend;
        const cy = from.y + dy / 2 + (dx / len) * bend;
        const u = 1 - p;
        pos = { x: u * u * from.x + 2 * u * p * cx + p * p * to.x, y: u * u * from.y + 2 * u * p * cy + p * p * to.y };
      }
      el.dataset.down = String(m.press !== undefined && t >= m.press && t < m.press + 180);
    }
    el.dataset.visible = "true";
    el.style.transform = `translate3d(${pos.x.toFixed(1)}px, ${pos.y.toFixed(1)}px, 0)`;
  }, [t, moves, showPointer]);

  // ---- Tilt: follows the visitor's mouse, settles level; transform only, removed at rest ----
  useEffect(() => {
    const view = viewRef.current;
    const scene = sceneRef.current;
    if (!view || !scene || reduced) return;
    if (!matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    // Degrees of tilt at the stage's edge: the --stage-tilt token (styles/tokens.css).
    const TILT_MAX = Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--stage-tilt")) || 3;
    let tx = 0;
    let ty = 0;
    let x = 0;
    let y = 0;
    let raf = 0;
    const step = () => {
      x += (tx - x) * 0.08;
      y += (ty - y) * 0.08;
      if (Math.abs(x) < 0.01 && Math.abs(y) < 0.01 && tx === 0 && ty === 0) {
        scene.style.transform = "";
        view.removeAttribute("data-tilting");
        raf = 0;
        return;
      }
      view.setAttribute("data-tilting", "");
      scene.style.setProperty("--tilt", Math.min(1, Math.hypot(x, y) / TILT_MAX).toFixed(3));
      scene.style.transform = `rotateX(${x.toFixed(3)}deg) rotateY(${y.toFixed(3)}deg)`;
      raf = requestAnimationFrame(step);
    };
    const kick = () => {
      if (!raf) raf = requestAnimationFrame(step);
    };
    const move = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const r = view.getBoundingClientRect();
      ty = ((e.clientX - r.left) / r.width - 0.5) * 2 * TILT_MAX;
      tx = -((e.clientY - r.top) / r.height - 0.5) * 2 * TILT_MAX * 0.6;
      kick();
    };
    const leave = () => {
      tx = 0;
      ty = 0;
      kick();
    };
    view.addEventListener("pointermove", move);
    view.addEventListener("pointerleave", leave);
    return () => {
      view.removeEventListener("pointermove", move);
      view.removeEventListener("pointerleave", leave);
      cancelAnimationFrame(raf);
    };
  }, [reduced]);

  // ---- Derived view values ----
  const query = preset.query.slice(0, frame.typed);
  const typing = t >= story.times.typeStart && frame.typed < preset.query.length;
  const providerList = enabled.map((id) => `"${id}"`).join(", ");
  const phaseLine = frame.contentsPressed ? "contents" : t >= story.times.dispatch ? "search" : null;
  const codeLines = template.split("\n");
  const activeLanes = stage.lanes.filter((l) => enabled.includes(l.brand.id));
  const failing = preset.fails && enabled.includes(preset.fails.provider) ? preset.fails : null;

  // Cost: every attempt that was or may have been billed, plus contents(); unknown prices counted apart.
  const attempts: { usd: number | null; possible: boolean }[] = [];
  for (const lane of activeLanes) {
    const run = preset.runs[lane.brand.id];
    const lf = frame.lanes[lane.brand.id];
    if (!run || !lf || lf.phase === "idle" || lf.phase === "running") continue;
    if (failing && failing.provider === lane.brand.id) {
      attempts.push({ usd: failing.billed === "possible" ? run.cost.usd : 0, possible: failing.billed === "possible" });
      if (lf.phase === "recovered") attempts.push({ usd: preset.runs[stage.fallback.id]?.cost.usd ?? null, possible: false });
    } else attempts.push({ usd: run.cost.usd, possible: false });
  }
  if (frame.page >= 1) attempts.push({ usd: stage.contentsCost.usd, possible: false });
  const known = attempts.reduce((sum, a) => sum + (a.usd ?? 0), 0);
  const unknown = attempts.filter((a) => a.usd === null).length;
  const possible = attempts.filter((a) => a.possible).length;

  const tabIds = enabled.filter((id) => preset.runs[id]);
  const autoTab = tabIds.length ? tabIds[Math.floor(Math.max(0, t - story.times.converge - 900) / 900) % tabIds.length] : null;
  const tab = userTab && tabIds.includes(userTab) ? userTab : (frame.converge >= 1 ? autoTab : frame.lead) ?? tabIds[0] ?? null;
  const tabRun = tab ? preset.runs[tab] : null;
  const tabFromFallback = tab && failing && failing.provider === tab;
  const tabResult = tabFromFallback ? preset.runs[stage.fallback.id]?.normalized[0] : tabRun?.normalized[0];

  const inspectLane = inspectId ? stage.lanes.find((l) => l.brand.id === inspectId) : null;
  const inspectRun = inspectId ? preset.runs[inspectId] : null;
  // The page contents() returns is the lead's top result: the sample page when it is that document, else its excerpt.
  const leadTop = frame.lead ? preset.runs[frame.lead]?.results[0] : undefined;
  const pageDoc = leadTop ?? { url: preset.page.url, title: preset.page.title, excerpt: "" };
  const pageText = leadTop && leadTop.url !== preset.page.url ? [`# ${leadTop.title}`, leadTop.excerpt] : preset.page.lines;
  const pageChars = Math.round(frame.page * pageText.join("").length);

  const brandOf = (id: string) => stage.lanes.find((l) => l.brand.id === id)!.brand;

  return (
    <div ref={rootRef} className="stage" data-rewind={rewind ? "" : undefined} data-words="data">
      <a href="#stage-end" className="stage-skip">
        Skip the demonstration
      </a>
      <div
        ref={viewRef}
        className="stage-view"
        role="group"
        aria-roledescription="simulation"
        aria-label="searchSDK sends one query to every provider"
        aria-describedby="stage-description"
      >
        <p id="stage-description" className="sr-only">
          A query is typed into searchSDK&apos;s search call and sent to {activeLanes.length} providers at once.{" "}
          {stage.pending
            ? "Every provider runs on the same placeholder timing and results."
            : "Each answers at its own speed."}{" "}
          {failing ? `One attempt fails and the configured fallback, ${stage.fallback.name}, answers instead. ` : null}The raw
          response of one provider is shown beside the normalized result, contents() fetches the top result&apos;s page as clean
          text, and every response arrives in the same shape{stage.pending ? "" : " with the total cost"}.{" "}
          {stage.pending ? "Results pending: the first benchmark run is in progress." : null}
        </p>
        <div ref={sceneRef} className="stage-scene" onPointerDown={(e) => {
          if ((e.target as Element).closest("button, a, input")) return;
          if (playing && !takenOver) setTakenOver(true);
        }}>
          <div className="stage-slab">
            {/* Title bar */}
            <div className="stage-bar">
              <span className="stage-file type-label">agent.ts</span>
              <span className="stage-bar-presets" role="group" aria-label="Query">
                {stage.presets.map((p, i) => (
                  <button
                    key={p.id}
                    type="button"
                    className={`stage-chip ${i === presetIndex ? "is-on" : ""}`}
                    aria-pressed={i === presetIndex}
                    data-target={`preset-${p.id}`}
                    data-pressed={i === presetIndex && t >= story.times.pressPreset && t < story.times.pressPreset + 180 ? "" : undefined}
                    onClick={() => choosePreset(i)}
                  >
                    {p.query}
                  </button>
                ))}
              </span>
              <button
                type="button"
                className="key key-sm stage-run"
                data-target="run"
                data-pressed={frame.runPressed ? "" : undefined}
                onClick={replay}
                aria-label="Run the query again"
              >
                <span className="key-face">
                  <svg aria-hidden="true" viewBox="0 0 12 12" width="10" height="10">
                    <path d="M2 1.5v9l8-4.5z" fill="currentColor" />
                  </svg>
                  Run
                </span>
              </button>
              <span className="stage-bar-fill" />
              {sampleTag}
              <span className="stage-clock figures" aria-hidden="true">
                {t >= story.times.dispatch ? secs(Math.min(t, story.times.end) - story.times.dispatch) : "0.00 s"}
              </span>
            </div>

            <div className="stage-body">
              {/* Code, or the inspector while a lane is inspected */}
              <div className="stage-code" data-layer="" style={{ "--z": "34px" } as CSSProperties}>
                <pre className="stage-pre" data-hidden={inspectLane ? "" : undefined} aria-hidden={inspectLane ? true : undefined}>
                  <code>
                    {codeLines.map((line, n) => {
                      const active = phaseLine && line.includes(`${phaseLine}(`);
                      const parts = line.split(/(%%QUERY%%|%%PROVIDERS%%)/);
                      return (
                        <span key={n} className="code-line" data-active={active ? "" : undefined}>
                          {parts.map((part, k) =>
                            part === "%%QUERY%%" ? (
                              <span key={k} className="stage-query">
                                <span className="c-str">&quot;{query}</span>
                                {/* The rest of the query holds its place unseen, so typing never re-wraps the code. */}
                                <span className="stage-caret-anchor">
                                  {typing || t < story.times.typeStart ? <span className="stage-caret" aria-hidden="true" /> : null}
                                </span>
                                <span className="c-str stage-query-rest" aria-hidden="true">
                                  {preset.query.slice(query.length)}
                                </span>
                                <span className="c-str">&quot;</span>
                              </span>
                            ) : part === "%%PROVIDERS%%" ? (
                              <span key={k} className="c-str">{providerList}</span>
                            ) : (
                              highlightTs(part, k)
                            ),
                          )}
                          {"\n"}
                        </span>
                      );
                    })}
                  </code>
                </pre>
                {inspectLane && inspectRun ? (
                  <div className="stage-inspect" style={{ "--lane": inspectLane.brand.hue } as CSSProperties}>
                    <div className="stage-inspect-head">
                      <ProviderMark brand={inspectLane.brand} size={16} />
                      <span className="type-label">
                        {inspectLane.wire.method} {host(inspectLane.wire.url)}
                      </span>
                    </div>
                    <div className="stage-inspect-cols">
                      <div>
                        <p className="type-label stage-inspect-title">{inspectLane.brand.name} sends</p>
                        <pre className="stage-json">
                          <code>{jsonLines(inspectRun.raw, { maxString: 30, mark: new Set(Object.values(inspectLane.wire.fields).map((p) => p.split(".").pop()!)) })}</code>
                        </pre>
                      </div>
                      <div>
                        <p className="type-label stage-inspect-title">You get</p>
                        <pre className="stage-json">
                          <code>{jsonLines({ results: [inspectRun.normalized[0]] }, { maxString: 30, mark: new Set(["url", "title", "excerpts"]) })}</code>
                        </pre>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>

              {/* Lanes */}
              <div className="stage-lanes" style={{ "--n": stage.lanes.length } as CSSProperties}>
                <div className="stage-axis figures" aria-hidden="true">
                  {Array.from({ length: story.scaleMs / 500 + 1 }, (_, i) => (
                    <span key={i} data-minor={i % 2 ? "" : undefined} style={{ left: `${((i * 500) / story.scaleMs) * 100}%` }}>
                      {i === 0 ? "0" : `${(i * 0.5).toFixed(1)}s`}
                    </span>
                  ))}
                </div>
                <div className="stage-rows">
                  <svg className="stage-fan" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                    {stage.lanes.map((lane, i) => {
                      const y = ((i + 0.5) / stage.lanes.length) * 100;
                      const on = enabled.includes(lane.brand.id);
                      const d = `M0 50 C 55 50, 45 ${y}, 100 ${y}`;
                      return (
                        <g key={lane.brand.id} style={{ "--lane": lane.brand.hue } as CSSProperties} data-on={on ? "" : undefined}>
                          <path d={d} className="stage-fan-line" vectorEffect="non-scaling-stroke" />
                          <path
                            d={d}
                            className="stage-fan-pulse"
                            pathLength={100}
                            vectorEffect="non-scaling-stroke"
                            style={{ strokeDashoffset: on ? 120 - frame.fan * 140 : 120 }}
                          />
                        </g>
                      );
                    })}
                  </svg>
                  {stage.lanes.map((lane) => {
                    const id = lane.brand.id;
                    const on = enabled.includes(id);
                    const run = preset.runs[id];
                    const lf = frame.lanes[id];
                    const isFail = failing?.provider === id;
                    const scale = story.scaleMs;
                    const primary = lf ? lf.primaryEndMs / scale : 0;
                    const fbFrom = lf?.failAtMs != null ? (lf.failAtMs + 70) / scale : 0;
                    const fbLen = lf?.fallbackEndMs != null && lf.failAtMs != null ? (lf.fallbackEndMs - lf.failAtMs - 70) / scale : 0;
                    const done = lf && (lf.phase === "done" || lf.phase === "recovered");
                    const result = isFail ? preset.runs[stage.fallback.id]?.results[0] : run?.results[0];
                    const status = !on ? "off" : !run ? "none" : lf?.phase ?? "idle";
                    return (
                      <button
                        key={id}
                        type="button"
                        className="stage-lane"
                        data-status={status}
                        data-inspected={inspectId === id ? "" : undefined}
                        data-target={`lane-${id}`}
                        style={{ "--lane": lane.brand.hue, "--fb": stage.fallback.hue } as CSSProperties}
                        disabled={!on || !run}
                        aria-label={`${lane.brand.name}: show the raw response beside the normalized one`}
                        onPointerEnter={(e) => e.pointerType === "mouse" && setUserInspect(id)}
                        onPointerLeave={() => setUserInspect(null)}
                        onFocus={() => setUserInspect(id)}
                        onBlur={() => setUserInspect(null)}
                      >
                        <span className="stage-lane-name">
                          <ProviderMark brand={lane.brand} size={18} />
                          <span>{lane.brand.name}</span>
                        </span>
                        <span className="stage-track" aria-hidden="true">
                          <span className="stage-bar-seg" data-kind={isFail && lf?.failAtMs != null ? "failed" : "primary"} style={{ "--from": 0, "--len": primary } as CSSProperties} />
                          {isFail ? <span className="stage-bar-seg" data-kind="fallback" style={{ "--from": fbFrom, "--len": fbLen } as CSSProperties} /> : null}
                          {isFail && failing?.code === "attempt_timeout" ? (
                            <span className="stage-limit" style={{ left: `${(stage.attemptTimeoutMs / scale) * 100}%` }} />
                          ) : null}
                          <span className="stage-head-rail" style={{ "--at": isFail && fbLen > 0 ? fbFrom + fbLen : primary } as CSSProperties}>
                            <span className="stage-head" data-live={lf?.phase === "running" || lf?.phase === "fallback" ? "" : undefined} />
                          </span>
                        </span>
                        <span className="stage-readout figures">
                          {status === "off" ? (
                            <span className="tag">off</span>
                          ) : lf && lf.phase !== "idle" && !stage.pending ? (
                            `${Math.round(lf.elapsedMs)} ms`
                          ) : (
                            "–"
                          )}
                        </span>
                        <span className="stage-lane-foot">
                          {isFail && lf && lf.failAtMs != null ? (
                            <span className="stage-fail">
                              <span className="tag" style={{ "--tag-fill": "var(--warn)", "--tag-ink": "var(--on-state)" } as CSSProperties}>
                                {failing!.code === "attempt_timeout" ? "timeout" : failing!.code === "rate_limit" ? "429" : failing!.code}
                              </span>
                              <span className="type-label">{failing!.billed === "possible" ? "possibly billed" : "not billed"}</span>
                              {lf.fallbackEndMs != null ? (
                                <span className="stage-fb">
                                  <span aria-hidden="true">→</span>
                                  <ProviderMark brand={stage.fallback} size={14} />
                                  <span className="type-label">fallback</span>
                                </span>
                              ) : null}
                            </span>
                          ) : null}
                          {done && result ? (
                            <span
                              className="stage-result"
                              data-target={`result-${id}`}
                              data-pressed={frame.lead === id && t >= story.times.pressContents && t < story.times.pressContents + 180 ? "" : undefined}
                              data-opened={frame.lead === id && frame.contentsPressed ? "" : undefined}
                            >
                              {isFail && lf?.failAtMs != null ? null : <span className="stage-result-title">{result.title}</span>}
                            </span>
                          ) : null}
                        </span>
                      </button>
                    );
                  })}
                  <span className="stage-bus" aria-hidden="true">
                    {stage.lanes.map((lane) => {
                      const lf = frame.lanes[lane.brand.id];
                      const lit = enabled.includes(lane.brand.id) && lf && (lf.phase === "done" || lf.phase === "recovered");
                      return <span key={lane.brand.id} data-lit={lit ? "" : undefined} style={{ "--lane": lane.brand.hue } as CSSProperties} />;
                    })}
                  </span>
                </div>
              </div>
            </div>

            {/* Output: the page from contents(), and one shape from every provider */}
            <div className="stage-out">
              <div className="stage-page" data-open={frame.contentsPressed ? "" : undefined}>
                <div className="stage-panel-head">
                  <span className="type-label">contents()</span>
                  <ProviderMark brand={stage.contents} size={14} />
                  <span className="stage-page-url figures">{frame.contentsPressed ? host(pageDoc.url) : "–"}</span>
                </div>
                <div className="stage-page-text">
                  {(() => {
                    let left = pageChars;
                    return pageText.map((line, n) => {
                      const shown = line.slice(0, Math.max(0, left));
                      left -= line.length;
                      const heading = line.startsWith("#");
                      return (
                        <p key={n} className={heading ? "stage-page-h" : undefined} data-empty={shown ? undefined : ""}>
                          {shown || " "}
                        </p>
                      );
                    });
                  })()}
                </div>
              </div>
              <span className="stage-pour" aria-hidden="true" style={{ "--pour": frame.converge } as CSSProperties} />
              <div className="stage-answer" data-target="answer" data-on={frame.converge > 0 ? "" : undefined}>
                {/* Loading: from the moment the call fans out until the lanes pour into one shape. */}
                {loader ? (
                  <span className="stage-loader" data-on={frame.fan > 0 && frame.converge === 0 ? "" : undefined}>
                    {loader}
                  </span>
                ) : null}
                <div className="stage-panel-head">
                  <span className="type-label">One shape</span>
                  <span className="stage-tabs" role="tablist" aria-label="Normalized result by provider">
                    {tabIds.map((id) => (
                      <button
                        key={id}
                        type="button"
                        role="tab"
                        aria-selected={tab === id}
                        className="stage-tab"
                        style={{ "--lane": brandOf(id).hue } as CSSProperties}
                        onClick={() => {
                          takeOver();
                          setUserTab(id);
                        }}
                      >
                        <ProviderMark brand={brandOf(id)} size={14} labelled />
                      </button>
                    ))}
                  </span>
                </div>
                <pre className="stage-json stage-answer-json" data-waiting={frame.converge > 0 || userTab ? undefined : ""}>
                  <code>
                    {tabResult
                      ? jsonLines(
                          { provider: tabFromFallback ? stage.fallback.id : tab, rank: tabResult.rank, url: tabResult.url, title: tabResult.title, excerpts: tabResult.excerpts },
                          { maxString: 40, mark: new Set(["provider"]) },
                        )
                      : null}
                  </code>
                </pre>
                <div className="stage-cost">
                  <span className="stage-cost-total figures">{stage.pending ? "–" : usd(known)}</span>
                  <span className="stage-cost-meta type-label">
                    {attempts.length} attempts
                    {stage.pending ? " · cost pending" : `${possible ? ` · ${possible} possibly billed` : ""}${unknown ? ` · ${unknown} price unknown` : ""}`}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="stage-pointer-layer" aria-hidden="true">
          <div ref={pointerRef} className="stage-pointer" data-visible="false">
            <svg viewBox="0 0 24 24" width="22" height="22">
              <path d="M5 2.5 L5 19.2 L9.3 15.3 L12.2 21.6 L15.1 20.3 L12.3 14.1 L18.2 14.1 Z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Rail: the visitor's controls */}
      <div className="stage-rail">
        <div className="stage-rail-row">
          <div className="stage-presets" role="group" aria-label="Query">
            {stage.presets.map((p, i) => (
              <button
                key={p.id}
                type="button"
                className={`key key-sm stage-preset ${i === presetIndex ? "key-lit" : ""}`}
                aria-pressed={i === presetIndex}
                onClick={() => choosePreset(i)}
              >
                <span className="key-face">{p.query}</span>
              </button>
            ))}
          </div>
          <div className="stage-ctl">
            <button type="button" className="key key-sm" onClick={togglePlay} aria-pressed={!playing && t < story.times.end ? true : undefined}>
              <span className="key-face">{playing ? "Pause" : t >= story.times.end ? "Play" : "Resume"}</span>
            </button>
            <button type="button" className="key key-sm" onClick={replay}>
              <span className="key-face">Replay</span>
            </button>
          </div>
        </div>
        <div className="stage-rail-row">
          <div className="stage-toggles" role="group" aria-label="Providers">
            {stage.lanes.map((lane) => {
              const on = enabled.includes(lane.brand.id);
              return (
                <button
                  key={lane.brand.id}
                  type="button"
                  role="switch"
                  aria-checked={on}
                  className={`key key-sm stage-toggle ${on ? "" : "is-off"}`}
                  style={{ "--lane": lane.brand.hue } as CSSProperties}
                  onClick={() => toggleProvider(lane.brand.id)}
                >
                  <span className="key-face">
                    <ProviderMark brand={lane.brand} size={16} />
                    <span className="stage-toggle-name">{lane.brand.name}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
        <div className="stage-scrub">
          <div className="stage-scrub-track" aria-hidden="true">
            <span className="stage-scrub-fill" style={{ "--p": Math.min(1, t / story.times.end) } as CSSProperties} />
            {story.chapters.map((c, i) => (
              <span key={c.id} className="stage-chapter" data-on={frame.chapter === i ? "" : undefined} style={{ left: `${(c.at / story.times.end) * 100}%` }}>
                <span className="type-label">{c.label}</span>
              </span>
            ))}
          </div>
          <input
            type="range"
            className="stage-scrub-input"
            min={0}
            max={Math.round(story.times.end)}
            step={10}
            value={Math.round(Math.min(t, story.times.end))}
            aria-label="Story position"
            aria-valuetext={story.chapters[frame.chapter]?.label}
            onPointerDown={() => {
              scrubbing.current = true;
            }}
            onPointerUp={() => {
              scrubbing.current = false;
            }}
            onChange={(e) => scrubTo(Number(e.target.value))}
          />
        </div>
      </div>
      <span id="stage-end" tabIndex={-1} />
    </div>
  );
}
