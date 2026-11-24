"use client";

import { type CSSProperties, type ReactNode, useRef } from "react";
import { useInView } from "@/lib/motion";

/**
 * Enters once, when scrolled into view: rises and fades in (app/globals.css, [data-reveal]).
 * `index` staggers siblings. Without script, or under reduced motion, it is simply there.
 */
export function Reveal({ children, className, index = 0 }: { children: ReactNode; className?: string; index?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const seen = useInView(ref, { once: true, threshold: 0.15, rootMargin: "0px 0px -8% 0px" });
  return (
    <div ref={ref} className={className} data-reveal="" data-inview={seen ? "" : undefined} style={{ "--reveal-index": index } as CSSProperties}>
      {children}
    </div>
  );
}
