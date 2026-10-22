import { useId } from "react";
import { DitherPattern } from "../lib/dither/pattern";
import { FillPattern } from "../lib/dither/fill";
import { fillStyle } from "../lib/dither/style";

/** SSR-safe dithercn geometry: one query fans out into attributed sources. */
export function PlaygroundDither({ active = false }: { active?: boolean }) {
  const id = useId();
  return <svg className={`play-signal${active ? " is-active" : ""}`} viewBox="0 0 440 144" fill="none" aria-hidden="true">
    <defs>
      <linearGradient id={`${id}-rainbow`} x1="0" y1="0" x2="440" y2="100" gradientUnits="userSpaceOnUse">
        {["red", "orange", "yellow", "green", "cyan", "blue", "violet"].map((color, i) => <stop key={color} offset={`${i * 100 / 6}%`} stopColor={`var(--dither-${color})`} />)}
      </linearGradient>
      <DitherPattern id={`${id}-query`} level={.5} matrix="bayer8" cell={2} color="#fff" />
      <DitherPattern id={`${id}-source`} level={.5} matrix="bayer4" cell={2} color="#fff" />
      <FillPattern id={`${id}-core`} fill="gradient" cell={2} color="#fff" level={.85} floor={.125} matrix="bayer8" ramp={{ edge: "left", at: 144, length: 88 }} />
      <FillPattern id={`${id}-line`} fill="gradient" cell={2} color="#fff" level={.8} floor={.125} ramp={{ edge: "left", at: 340, length: 88 }} />
      <mask id={`${id}-mask`} x="0" y="0" width="440" height="144" maskUnits="userSpaceOnUse">
        <rect x="8" y="48" width="48" height="48" fill={`url(#${id}-query)`} />
        <circle cx="188" cy="72" r="44" fill={`url(#${id}-core)`} />
        {[0, 1, 2].map(row => <g key={row} className="play-signal-row">
          <rect x="308" y={12 + row * 48} width="24" height="24" fill={`url(#${id}-source)`} />
          <rect x="344" y={12 + row * 48} width={88 - row * 12} height="8" fill={`url(#${id}-line)`} />
          <rect x="344" y={28 + row * 48} width={64 - row * 12} height="4" fill={`url(#${id}-line)`} />
        </g>)}
      </mask>
    </defs>
    <path d="M68 72h64m112 0h30m0 0V24h24m-24 48h24m-24 0v48h24" stroke="var(--control-border)" strokeWidth="1" />
    <rect width="440" height="144" fill={`url(#${id}-rainbow)`} mask={`url(#${id}-mask)`} />
    <circle cx="188" cy="72" r="22" stroke="var(--dither-green)" strokeWidth="1" />
  </svg>;
}

export function PlaygroundDitherBand({ className = "" }: { className?: string }) {
  return <span className={`play-dither-band ${className}`} aria-hidden="true" style={{ ...fillStyle("gradient", { cell: 2, matrix: "bayer8", edge: "left", length: 120, from: .875, to: .375 }), backgroundImage: "var(--dither-spectrum)" }} />;
}
