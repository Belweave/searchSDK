import { DitherEmpty } from "./DitherKit";
import { useId } from "react";
import type { CSSProperties } from "react";
import { DitherPattern, ditherMask } from "../lib/dither/pattern";
import { FillPattern } from "../lib/dither/fill";
import { fillStyle } from "../lib/dither/style";
import "./WorkspaceDither.css";

/** Share cached engine tiles with decorative CSS; never mask content. */
export const workspaceDitherStyles = {
  "--workspace-dither-mask": ditherMask(0.375, { cell: 2 }),
  "--workspace-dither-sparse": ditherMask(0.125, { cell: 2 }),
} as CSSProperties;

/** SVG counterpart of the shared theme spectrum; the engine owns the dots. */
export function WorkspaceDitherSpectrum({ id }: { id: string }) {
  return <linearGradient id={id} x1="0%" y1="0%" x2="100%" y2="30%">
    <stop offset="0%" stopColor="var(--dither-red, var(--dither-color-red))" />
    <stop offset="16%" stopColor="var(--dither-orange, var(--dither-color-orange))" />
    <stop offset="32%" stopColor="var(--dither-yellow, var(--dither-color-orange))" />
    <stop offset="49%" stopColor="var(--dither-green, var(--dither-color-green))" />
    <stop offset="65%" stopColor="var(--dither-cyan, var(--dither-color-blue))" />
    <stop offset="82%" stopColor="var(--dither-blue, var(--dither-color-blue))" />
    <stop offset="100%" stopColor="var(--dither-violet, var(--dither-color-purple))" />
  </linearGradient>;
}

export function WorkspaceDitherField({ className = "", variant = "gradient" }: {
  className?: string;
  variant?: "gradient" | "dotted" | "hatched";
}) {
  return <span aria-hidden="true" className={`workspace-dither-field ${className}`} style={fillStyle(variant, {
    color: "--code-accent", cell: 2, edge: "left", length: 48, from: 0.75, to: 0.0625,
  })} />;
}

/** Catalog structure, not request telemetry or an assertion about capability. */
export function WorkspaceDitherCatalog() {
  const id = useId();
  return <figure className="workspace-dither-catalog">
    <svg viewBox="0 0 720 112" aria-hidden="true" focusable="false">
      <defs>
        <WorkspaceDitherSpectrum id={`${id}-rgb`} />
        <FillPattern id={`${id}-ramp`} fill="gradient" color="#fff" cell={2} level={0.8} floor={0.0625} ramp={{ edge: "left", at: 0, length: 720 }} />
        <DitherPattern id={`${id}-dots`} level={0.5} cell={2} color="#fff" />
        <mask id={`${id}-field-mask`}><rect width="720" height="112" fill={`url(#${id}-ramp)`} /></mask>
        <mask id={`${id}-route-mask`}><g fill={`url(#${id}-dots)`}>
        <path d="M0 50h170l60-36h250v8H232l-60 36H0zM170 50l60 36h250v8H228l-60-36zM480 14h58l52 36h130v8H588l-52-36h-56zM480 86h56l52-36h132v8H590l-52 36h-58z" />
        <rect x="18" y="32" width="44" height="44" /><rect x="322" y="2" width="60" height="32" /><rect x="322" y="74" width="60" height="32" /><rect x="656" y="32" width="44" height="44" />
        </g></mask>
      </defs>
      <rect width="720" height="112" fill={`url(#${id}-rgb)`} mask={`url(#${id}-field-mask)`} opacity=".45" />
      <rect width="720" height="112" fill={`url(#${id}-rgb)`} mask={`url(#${id}-route-mask)`} />
    </svg>
    <figcaption><span>Your search task</span><span>Web search / corpus retrieval</span><span>Provider reference</span></figcaption>
  </figure>;
}

/** An explicit absence of measurements, with no chart-shaped invented data. */
export function WorkspaceDitherUnrun() {
  return <div className="workspace-dither-unrun">
    <DitherEmpty kind="unrun" />
    <strong>UNRUN</strong><span>Awaiting the first live run</span>
    <WorkspaceDitherField variant="dotted" />
  </div>;
}
