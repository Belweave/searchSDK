"use client";

import { useEffect, useRef } from "react";
import { usePageVisible, usePrefersReducedMotion } from "@/lib/motion";

/**
 * The page's field: one thread of light per provider hue, each leaving the left edge at its own
 * height, swaying slowly, and converging on one point where they become a single beam. Signal
 * packets travel along the threads into it. Fixed behind everything, never interactive.
 *
 * Cost: one 2D canvas at device pixel ratio ≤ 1.25, seven curves and a few dots a frame. It runs
 * only while the tab is visible; under reduced motion it draws one still frame. The hues are read
 * from the tokens and re-read when the theme changes.
 */
const HUES = ["--hue-brave", "--hue-firecrawl", "--hue-tinyfish", "--hue-perplexity", "--hue-context", "--hue-exa", "--hue-tavily"] as const;
const SEGMENTS = 72;
const PACKETS_PER_THREAD = 2;

type Palette = { hues: string[]; beam: string; strength: number; dark: boolean; opacity: number };

function readPalette(): Palette {
  const css = getComputedStyle(document.documentElement);
  const get = (name: string) => css.getPropertyValue(name).trim();
  return {
    hues: HUES.map(get),
    beam: get("--beam"),
    strength: Number.parseFloat(get("--glow-strength")) || 1,
    opacity: Number.parseFloat(get("--backdrop-opacity")) || 0.5,
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
      canvas.style.opacity = String(palette.opacity * (1 - scroll * 0.5));
      const narrow = w < 720;
      // The convergence point drifts a little with scroll and time.
      const fx = w * (narrow ? 0.86 : 0.8) + Math.sin(t * 0.00011) * w * 0.012;
      const fy = h * (narrow ? 0.2 : 0.3) - scroll * h * 0.18 + Math.cos(t * 0.00009) * h * 0.02;
      const n = palette.hues.length;

      palette.hues.forEach((hue, i) => {
        const y0 = h * (0.08 + (0.84 * i) / (n - 1));
        const sway = Math.sin(t * 0.00023 + i * 1.7) * h * 0.06;
        const c1x = w * 0.28;
        const c1y = y0 + sway;
        const c2x = fx - w * 0.22;
        const c2y = fy + (y0 - fy) * 0.25 - sway * 0.5;
        const at = (s: number) => {
          const u = 1 - s;
          return {
            x: u * u * u * -20 + 3 * u * u * s * c1x + 3 * u * s * s * c2x + s * s * s * fx,
            y: u * u * u * y0 + 3 * u * u * s * c1y + 3 * u * s * s * c2y + s * s * s * fy,
          };
        };
        ctx.strokeStyle = hue;
        ctx.lineWidth = 1.25;
        ctx.globalAlpha = 0.55 * palette.strength;
        ctx.beginPath();
        for (let k = 0; k <= SEGMENTS; k++) {
          const p = at(k / SEGMENTS);
          if (k === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        }
        ctx.stroke();
        // Packets: short bright dashes travelling into the focus.
        ctx.fillStyle = hue;
        for (let j = 0; j < PACKETS_PER_THREAD; j++) {
          const s = (t * 0.00006 * (1 + i * 0.09) + j / PACKETS_PER_THREAD + i * 0.13) % 1;
          const p = at(s);
          ctx.globalAlpha = Math.sin(s * Math.PI) * 0.9 * palette.strength;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 1.8, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // The beam: one line of the converged light leaving the focus.
      const grad = ctx.createLinearGradient(fx, fy, w, fy - h * 0.05);
      grad.addColorStop(0, palette.beam);
      grad.addColorStop(1, "transparent");
      ctx.globalAlpha = 0.85 * palette.strength;
      ctx.strokeStyle = grad;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(fx, fy);
      ctx.lineTo(w + 20, fy - h * 0.05);
      ctx.stroke();
      ctx.fillStyle = palette.beam;
      ctx.globalAlpha = 0.9 * palette.strength;
      ctx.beginPath();
      ctx.arc(fx, fy, 2.6, 0, Math.PI * 2);
      ctx.fill();
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
