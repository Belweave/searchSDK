"use client";

import { useEffect, useRef } from "react";
import { usePageVisible, usePrefersReducedMotion } from "@/lib/motion";

/**
 * The page's field, drawn from the mark's idea: sources arrive from the right as bands of colour
 * (apricot above, cyan below, violet where they meet) and converge leftward on one point, as the
 * mark's bands run into its beam. Signal packets travel along the threads into it, right to left
 * (brand/GUIDELINES.md, Motion: "sources travel right to left, into the beam"). Flat strokes, no
 * gradients, no provider hues: those identify providers and never decorate. Fixed behind
 * everything, never interactive.
 *
 * Cost: one 2D canvas at device pixel ratio ≤ 1.25, a few curves and dots a frame. It runs only
 * while the tab is visible; under reduced motion it draws one still frame. Colours and strengths
 * are read from the tokens and re-read when the theme changes.
 */
const BANDS = [
  ["--brand-apricot", 3],
  ["--brand-violet", 2],
  ["--brand-cyan", 3],
] as const;
const SEGMENTS = 64;
const PACKETS_PER_THREAD = 2;

type Palette = { threads: string[]; strength: number; dark: boolean; opacity: number; line: number };

function readPalette(): Palette {
  const css = getComputedStyle(document.documentElement);
  const get = (name: string) => css.getPropertyValue(name).trim();
  return {
    threads: BANDS.flatMap(([token, n]) => Array.from({ length: n }, () => get(token))),
    strength: Number.parseFloat(get("--glow-strength")) || 1,
    opacity: Number.parseFloat(get("--backdrop-opacity")) || 0.5,
    line: Number.parseFloat(get("--backdrop-line")) || 1.25,
    dark: document.documentElement.getAttribute("data-theme") !== "light",
  };
}

export function Backdrop() {
  const ref = useRef<HTMLCanvasElement>(null);
  const reduced = usePrefersReducedMotion();
  const visible = usePageVisible();

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    let palette = readPalette();
    let w = 0;
    let h = 0;
    const dpr = Math.min(1.25, window.devicePixelRatio || 1);

    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const draw = (t: number) => {
      const scroll = Math.min(1, window.scrollY / Math.max(1, h));
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = palette.dark ? "lighter" : "source-over";
      canvas.style.opacity = String(palette.opacity * (1 - scroll * 0.45));
      const narrow = w < 720;
      // The meeting point sits past the left edge, so the threads read as a wide cut converging
      // on it; it drifts a little with scroll and time.
      const fx = -w * (narrow ? 0.18 : 0.08) + Math.sin(t * 0.00011) * w * 0.01;
      const fy = h * (narrow ? 0.34 : 0.46) - scroll * h * 0.2 + Math.cos(t * 0.00009) * h * 0.015;
      const n = palette.threads.length;
      // Packets are drawn bright on ink and as ink-weight dots on paper.
      const lineAlpha = (palette.dark ? 0.42 : 0.34) * palette.strength;
      const packetAlpha = palette.dark ? 0.95 : 0.8;

      palette.threads.forEach((colour, i) => {
        // Entry heights spread past both edges, apricot at the top, cyan at the bottom.
        const y0 = h * (-0.08 + (1.16 * i) / (n - 1));
        const sway = Math.sin(t * 0.0002 + i * 1.3) * h * 0.05;
        const x0 = w + 24;
        const c1x = w * 0.62;
        const c1y = y0 + sway;
        const c2x = w * 0.22;
        const c2y = fy + (y0 - fy) * 0.32 - sway * 0.4;
        const at = (s: number) => {
          const u = 1 - s;
          return {
            x: u * u * u * x0 + 3 * u * u * s * c1x + 3 * u * s * s * c2x + s * s * s * fx,
            y: u * u * u * y0 + 3 * u * u * s * c1y + 3 * u * s * s * c2y + s * s * s * fy,
          };
        };
        ctx.strokeStyle = colour;
        ctx.lineWidth = palette.line;
        ctx.globalAlpha = lineAlpha;
        ctx.beginPath();
        for (let k = 0; k <= SEGMENTS; k++) {
          const p = at(k / SEGMENTS);
          if (k === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        }
        ctx.stroke();
        // Packets: short bright dashes travelling from the right edge into the meeting point.
        ctx.fillStyle = colour;
        for (let j = 0; j < PACKETS_PER_THREAD; j++) {
          const s = (t * 0.000055 * (1 + i * 0.07) + j / PACKETS_PER_THREAD + i * 0.17) % 1;
          const p = at(s);
          const q = at(Math.max(0, s - 0.018));
          ctx.globalAlpha = Math.sin(s * Math.PI) * packetAlpha;
          ctx.lineWidth = palette.line * 2.2;
          ctx.lineCap = "round";
          ctx.strokeStyle = colour;
          ctx.beginPath();
          ctx.moveTo(q.x, q.y);
          ctx.lineTo(p.x, p.y);
          ctx.stroke();
        }
      });
      ctx.globalAlpha = 1;
    };

    const onTheme = () => {
      palette = readPalette();
      draw(performance.now());
    };
    const onResize = () => {
      resize();
      draw(performance.now());
    };
    window.addEventListener("resize", onResize);
    window.addEventListener("searchsdk-theme", onTheme);

    let raf = 0;
    if (reduced || !visible) {
      draw(reduced ? 0 : performance.now());
    } else {
      const tick = (now: number) => {
        draw(now);
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("searchsdk-theme", onTheme);
    };
  }, [reduced, visible]);

  return <canvas ref={ref} aria-hidden="true" className="site-backdrop" />;
}
