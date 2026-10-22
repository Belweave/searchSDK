import { useEffect, useRef, useSyncExternalStore } from "react";
import type { SearchAttempt } from "@belweave/search-sdk";
import { ditherMaskStyle } from "../lib/dither/pattern";
import { useDocumentVisible, useInView, usePrefersReducedMotion } from "../lib/dither/motion";
import "./DitherKit.css";

// Site-only adaptations of dithercn's ordered fills, Divider, Card, Empty,
// Loader, ProgressBar and Number. MIT attribution is retained in THIRD_PARTY_NOTICES.md.
// The masks always belong to decoration; text, logos and controls stay unmasked.
let paused = false;
const listeners = new Set<() => void>();
const subscribe = (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; };
export function setSiteMotionPaused(value: boolean) {
  paused = value;
  document.documentElement.dataset.motion = value ? "paused" : "running";
  listeners.forEach(fn => fn());
}
export function useSiteMotionPaused() { return useSyncExternalStore(subscribe, () => paused, () => false); }
export function DitherMotionController() {
  useEffect(() => {
    const update = () => { document.documentElement.dataset.visibility = document.visibilityState; };
    update(); document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);
  return null;
}
export function DitherFade({ className = "", reverse = false }: { className?: string; reverse?: boolean }) {
  return <span className={`dither-fade ${className}`} data-reverse={reverse || undefined} aria-hidden="true">{Array.from({ length: 16 }, (_, i) => <span key={i} style={ditherMaskStyle((16 - i) / 16, { matrix: "bayer8", cell: 2 })} />)}</span>;
}
export function DitherDivider({ className = "" }: { className?: string }) {
  return <div className={`dither-divider ${className}`} aria-hidden="true">{Array.from({ length: 10 }, (_, i) => <span key={i} style={{ ...ditherMaskStyle((10 - i) / 10, { cell: 2 }), backgroundSize: "1000% 100%", backgroundPosition: `${i / 9 * 100}% 0` }} />)}</div>;
}
/** A static closing field. The accessible brand remains in the footer links. */
export function DitherFooter() {
  return <div className="dither-footer" aria-hidden="true">
    <DitherFade reverse />
    <div className="dither-footer-brand" style={ditherMaskStyle(.75, { cell: 2 })}>
      {Array.from("searchSDK.").map((letter, i) => <span key={i} style={{ color: `var(--dither-${["red", "orange", "yellow", "green", "cyan", "blue", "violet", "blue", "violet", "red"][i]})` }}>{letter}</span>)}
    </div>
    <DitherFade />
  </div>;
}
export function DitherSurface({ variant = "mesh" }: { variant?: "mesh" | "glow" | "empty" }) {
  return <span className={`dither-surface dither-surface-${variant}`} aria-hidden="true">
    <span style={ditherMaskStyle(.125, { cell: 2 })} /><span style={ditherMaskStyle(.375, { cell: 2 })} /><span style={ditherMaskStyle(.625, { cell: 2 })} />
  </span>;
}
export function DitherButtonInk() {
  return <span className="dither-button-ink" aria-hidden="true" style={ditherMaskStyle(.5, { cell: 2 })} />;
}
export function DitherProgress({ label = "Waiting for response" }: { label?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref), visible = useDocumentVisible(), reduced = usePrefersReducedMotion(), stopped = useSiteMotionPaused();
  return <div ref={ref} className="dither-progress" role="progressbar" aria-label={label} data-animate={inView && visible && !reduced && !stopped}>
    <span className="dither-progress-track" style={ditherMaskStyle(.125, { cell: 2 })} />
    <span className="dither-progress-wave" style={ditherMaskStyle(.625, { cell: 2 })} />
  </div>;
}
export function DitherEmpty({ kind = "search" }: { kind?: "search" | "unrun" | "404" }) {
  return <div className="dither-empty" data-kind={kind} aria-hidden="true"><DitherSurface variant="empty" />
    {kind === "404" ? <span className="dither-empty-word" style={ditherMaskStyle(.75, { cell: 2 })}>404</span> : <svg viewBox="0 0 240 112" fill="none"><circle cx="108" cy="48" r="27" /><path d="m128 69 29 29M47 24h24M37 48h24M47 72h24M156 24h36M156 48h48" />{kind === "unrun" && <path d="M104 35v18l12 7" />}</svg>}
  </div>;
}
export function DitherSkeleton() {
  return <div className="dither-skeleton" role="status"><span>Loading workspace…</span><DitherProgress label="Loading workspace" /><div aria-hidden="true">{[90, 100, 68].map(width => <span key={width} style={{ width: `${width}%`, ...ditherMaskStyle(.125, { cell: 2 }) }} />)}</div></div>;
}
export function DitherNumber({ value }: { value: number }) {
  return <span className="dither-number"><span key={value}>{value}</span></span>;
}
export function DitherAttemptBars({ attempts, label = "Attempt durations" }: { attempts: readonly SearchAttempt[]; label?: string }) {
  const max = Math.max(1, ...attempts.map(a => a.durationMs));
  return <figure className="dither-attempt-bars"><figcaption>{label}</figcaption><ol>{attempts.map((a, i) => <li key={`${a.provider}-${i}`}>
    <span className="dither-attempt-label">{a.provider}<small>{a.code ?? a.outcome}</small></span>
    <span className="dither-attempt-track" aria-hidden="true"><span style={{ width: `${Math.max(0, a.durationMs) / max * 100}%`, ...ditherMaskStyle(a.outcome === "success" ? .75 : .375, { cell: 2 }) }} /></span>
    <span className="dither-attempt-value"><DitherNumber value={Math.round(a.durationMs)} /> ms</span>
  </li>)}</ol></figure>;
}
