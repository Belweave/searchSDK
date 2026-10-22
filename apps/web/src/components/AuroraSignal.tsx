import { useId, useRef } from "react";
import { DitherPattern } from "../lib/dither/pattern.js";
import { useFrameLoop } from "../lib/dither/motion.js";

const SPECTRUM = ["red", "orange", "yellow", "green", "cyan", "blue", "violet"] as const;

// Explicit geometry keeps the lens round and every trail outside its interior.
// Mobile is composed separately instead of squeezing the desktop paths together.
const COMPOSITIONS = [
  {
    name: "desktop", width: 1440, height: 350, lens: [860, 166, 102],
    handle: "M934 240 1000 306",
    queries: [
      "M48 65C260 65 425 96 710 110",
      "M48 126C300 126 460 143 710 147",
      "M48 224C300 224 460 190 710 185",
      "M48 285C260 285 425 220 710 222",
    ],
    sources: ["M1010 100H1340", "M1010 166H1390", "M1010 232H1340"],
  },
  {
    name: "mobile", width: 390, height: 250, lens: [204, 112, 60],
    handle: "M247 155 291 199",
    queries: [
      "M16 42C54 42 74 62 118 67",
      "M16 87C54 87 74 94 118 97",
      "M16 137C54 137 74 129 118 127",
      "M16 187C54 187 74 157 118 157",
    ],
    sources: ["M294 69H370", "M294 112H380", "M294 155H370"],
  },
] as const;

export interface AuroraSignalProps { animate?: boolean; intensity?: number; speed?: number; cell?: number }

/** Spatial rainbow through real Bayer masks; no luminance-to-hue heatmap. */
export function AuroraSignal({ animate = true, intensity = 1, speed = 1, cell = 2.5 }: AuroraSignalProps) {
  const id = useId().replaceAll(":", "");
  const root = useRef<HTMLDivElement>(null);
  const pulses = useRef<Array<SVGGElement | null>>([]);
  const offset = useRef(0);
  const velocity = Number.isFinite(speed) ? Math.min(2, Math.max(0, speed)) : 1;
  const grain = Number.isFinite(cell) ? Math.min(4, Math.max(1.5, cell)) : 2.5;
  const coverage = Number.isFinite(intensity) ? Math.min(1, Math.max(0, intensity)) : 1;
  const state = useFrameLoop((_time, delta) => {
    // A pause freezes the highlight. Reduced motion starts with a finished still.
    offset.current -= delta * 24 * velocity;
    for (const pulse of pulses.current) pulse?.setAttribute("stroke-dashoffset", String(offset.current));
  }, { target: root, enabled: animate && velocity > 0, fps: 12 });

  return <div ref={root} className="landing-signal" data-state={state} style={{ opacity: coverage }} aria-hidden="true">
    {COMPOSITIONS.map((composition, index) => {
      const key = `${id}-${composition.name}`;
      const { width, height, lens, queries, sources, handle } = composition;
      const paths = [...queries, ...sources];
      return <svg key={key} className={`landing-signal-art landing-signal-art-${composition.name}`} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet" aria-hidden="true">
        <defs>
          <DitherPattern id={`${key}-soft`} level={0.1875} cell={grain} color="white" />
          <DitherPattern id={`${key}-ink`} level={0.6875} cell={grain} color="white" />
          <DitherPattern id={`${key}-bright`} level={0.9375} cell={grain} color="white" />
          <linearGradient id={`${key}-spectrum`} x1="0" y1="0" x2={width} y2="0" gradientUnits="userSpaceOnUse">
            {SPECTRUM.map((color, i) => <stop key={color} offset={i / 6} stopColor={`var(--dither-${color})`} />)}
          </linearGradient>
          <mask id={`${key}-art`} maskUnits="userSpaceOnUse" x="0" y="0" width={width} height={height}>
            <g fill="none" stroke={`url(#${key}-soft)`}>
              {paths.map(path => <path key={path} d={path} strokeWidth={14} />)}
              <circle cx={lens[0]} cy={lens[1]} r={lens[2]} strokeWidth={22} />
              <path d={handle} strokeWidth={24} />
            </g>
            <g fill="none" stroke={`url(#${key}-ink)`}>
              {paths.map(path => <path key={path} d={path} strokeWidth={7} />)}
              <circle cx={lens[0]} cy={lens[1]} r={lens[2]} strokeWidth={12} />
              <path d={handle} strokeWidth={14} />
            </g>
            <g ref={element => { pulses.current[index] = element; }} fill="none" stroke={`url(#${key}-bright)`} strokeWidth={7} strokeDasharray="20 1600">
              {paths.map(path => <path key={path} d={path} />)}
            </g>
          </mask>
        </defs>
        <rect width={width} height={height} fill={`url(#${key}-spectrum)`} mask={`url(#${key}-art)`} />
      </svg>;
    })}
  </div>;
}
