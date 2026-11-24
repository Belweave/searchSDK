"use client";

import { type RefObject, useEffect, useState, useSyncExternalStore } from "react";

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
