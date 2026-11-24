"use client";

import { type RefObject, useEffect, useRef, useState, useSyncExternalStore } from "react";

/**
 * Motion foundations. Every component that animates from script uses these, so reduced motion is
 * honoured in one place. CSS animations are already stopped by the global rule in app/globals.css.
 */

const REDUCE_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeReduced(onChange: () => void) {
  const query = window.matchMedia(REDUCE_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/** True when the visitor asks for reduced motion. On the server, assume reduced (render the still). */
export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeReduced,
    () => window.matchMedia(REDUCE_QUERY).matches,
    () => true,
  );
}

/** A motion token from styles/tokens.css in milliseconds; 0 under reduced motion. */
export function motionMs(token: `--motion-${string}`): number {
  if (typeof window === "undefined" || window.matchMedia(REDUCE_QUERY).matches) return 0;
  const raw = getComputedStyle(document.documentElement).getPropertyValue(token).trim();
  const value = Number.parseFloat(raw);
  if (Number.isNaN(value)) return 0;
  return raw.endsWith("ms") ? value : value * 1000;
}

type InViewOptions = { once?: boolean; rootMargin?: string; threshold?: number };

/**
 * True while the element is in the viewport (or, with `once`, after it first enters).
 * Use it to start motion only when seen and to pause it offscreen. Pair with `data-reveal`
 * in CSS: set `data-inview` on the element when this returns true.
 */
export function useInView<T extends Element>(ref: RefObject<T | null>, options: InViewOptions = {}): boolean {
  const { once = false, rootMargin = "0px", threshold = 0.2 } = options;
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.some((entry) => entry.isIntersecting);
        if (visible) {
          setInView(true);
          if (once) observer.disconnect();
        } else if (!once) {
          setInView(false);
        }
      },
      { rootMargin, threshold },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [ref, once, rootMargin, threshold]);

  return inView;
}

/** True while the tab is visible. Loops pause when it is not. */
export function usePageVisible(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      document.addEventListener("visibilitychange", onChange);
      return () => document.removeEventListener("visibilitychange", onChange);
    },
    () => document.visibilityState === "visible",
    () => true,
  );
}

/**
 * Run `frame(dt, now)` every animation frame while `active`, the tab is visible and motion is
 * allowed. dt is capped so a resumed loop never jumps. Stops cleanly on unmount.
 */
export function useFrameLoop(frame: (dt: number, now: number) => void, active: boolean): void {
  const visible = usePageVisible();
  const reduced = usePrefersReducedMotion();
  const ref = useRef(frame);
  ref.current = frame;
  useEffect(() => {
    if (!active || !visible || reduced) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(64, now - last);
      last = now;
      ref.current(dt, now);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, visible, reduced]);
}

/** Ease-out used for numbers and bars settling. */
export const settle = (t: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);

/**
 * A number that settles to `target`. It renders the target (server, no script, reduced motion);
 * the first time `start` turns true it counts up from 0, and later target changes glide from the
 * current value. Pair with a reveal so the reset to 0 happens while the element fades in.
 */
export function useSettledNumber(target: number, start: boolean, ms = 1100): number {
  const reduced = usePrefersReducedMotion();
  const [value, setValue] = useState(target);
  const from = useRef(target);
  const goal = useRef(target);
  const t0 = useRef<number | null>(null);
  const begun = useRef(false);
  const [running, setRunning] = useState(false);
  useEffect(() => {
    if (reduced) {
      setValue(target);
      return;
    }
    if (!start) return;
    from.current = begun.current ? value : 0;
    begun.current = true;
    goal.current = target;
    t0.current = null;
    setRunning(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- restart only when the target or start changes
  }, [target, start, reduced]);
  useFrameLoop((_, now) => {
    if (t0.current === null) t0.current = now;
    const p = settle((now - t0.current) / ms);
    setValue(from.current + (goal.current - from.current) * p);
    if (p >= 1) setRunning(false);
  }, running);
  return reduced ? target : value;
}
