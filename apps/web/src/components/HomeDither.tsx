import { useId } from "react";
import { DitherPattern, ditherMaskStyle } from "../lib/dither/pattern.js";
import { FillPattern } from "../lib/dither/fill.js";
import { fillStyle } from "../lib/dither/style.js";

/** Static engine fills: no canvas, worker, timer, or image request. */
export function HomeDitherSeam({ reverse = false }: { reverse?: boolean }) {
  return <div className={`home-dither-seam${reverse ? " home-dither-seam-reverse" : ""}`} aria-hidden="true">
    <span style={{ ...fillStyle("gradient", { color: "--landing-ink", cell: 2, matrix: "bayer8", edge: "top", length: 32, from: 0.75, to: 0 }), backgroundImage: "var(--dither-spectrum)" }} />
  </div>;
}

export function HomeDitherCorner() {
  return <span className="home-dither-corner" aria-hidden="true">
    <span style={ditherMaskStyle(0.125, { matrix: "bayer4", cell: 2 })} />
    <span style={ditherMaskStyle(0.375, { matrix: "bayer4", cell: 2 })} />
  </span>;
}

type TracePart = "query" | "primary" | "fallback" | "source";

function HomeDitherGlyph({ part }: { part: TracePart }) {
  const id = `home-dither-${useId().replaceAll(":", "")}`;
  const fade = `url(#${id}-fade)`;
  const dense = `url(#${id}-dense)`;
  const hatch = `url(#${id}-hatch)`;
  return <svg viewBox="0 0 200 112" className="home-dither-glyph" aria-hidden="true">
    <defs>
      <FillPattern id={`${id}-fade`} fill="gradient" color="white" cell={2} matrix="bayer8" level={0.9} floor={0.0625} ramp={{ edge: "top", at: 16, length: 88 }} />
      <DitherPattern id={`${id}-dense`} level={0.625} cell={2} matrix="bayer4" color="white" />
      <FillPattern id={`${id}-hatch`} fill="hatched" color="white" cell={2} />
      <linearGradient id={`${id}-spectrum`} x1="0" y1="0" x2="200" y2="56" gradientUnits="userSpaceOnUse">
        {["red", "orange", "yellow", "green", "cyan", "blue", "violet"].map((color, i) => <stop key={color} offset={i / 6} stopColor={`var(--dither-${color})`} />)}
      </linearGradient>
      <mask id={`${id}-shape`} maskUnits="userSpaceOnUse" x="0" y="0" width="200" height="112">
    {part === "query" && <>
      <path d="M22 20h156v64H68L46 100V84H22Z" fill={fade} />
      <path d="M42 40h112v5H42zM42 54h84v5H42zM42 68h54v5H42z" fill="black" />
    </>}
    {part === "primary" && <>
      <path d="M22 20h156v72H22Z" fill={hatch} />
      <path d="M22 20h156v14H22Z" fill={dense} />
      <path d="M89 42h22v40H89Z" fill="black" />
      <path d="M95 44h10v23H95zM95 73h10v9H95z" fill="white" />
    </>}
    {part === "fallback" && <>
      <path d="M22 44h64V24h47V12l37 25-37 25V50h-22v28h22V66l37 25-37 21v-10H86V70H22Z" fill={fade} />
    </>}
    {part === "source" && <>
      <path d="M62 14h108v72H62Z" fill={hatch} />
      <path d="M44 28h108v72H44Z" fill="black" />
      <path d="M44 28h108v72H44Z" fill={fade} />
      <path d="M60 44h74v6H60zM60 60h58v6H60zM60 76h38v6H60z" fill={dense} />
    </>}
      </mask>
    </defs>
    <rect width="200" height="112" fill={`url(#${id}-spectrum)`} mask={`url(#${id}-shape)`} />
  </svg>;
}

const trace = [
  { part: "query", title: "Your query", detail: "One search request" },
  { part: "primary", title: "Primary", detail: "Mock rate limit" },
  { part: "fallback", title: "Fallback", detail: "Mock source returned" },
  { part: "source", title: "The response", detail: "Source + attempt trail" },
] as const;

/** A schematic of the existing deterministic SDK demo, never live metrics. */
export function HomeDitherTrace({ busy, complete }: { busy: boolean; complete: boolean }) {
  return <div className="home-dither-trace" data-state={busy ? "running" : complete ? "complete" : "ready"}>
    <div className="home-dither-trace-caption"><span>The route in this demo</span><span>{busy ? "Running fixtures…" : complete ? "Fallback complete" : "Deterministic fixtures"}</span></div>
    <ol className="home-dither-trace-steps">
      {trace.map(({ part, title, detail }) => <li key={part}>
        <HomeDitherGlyph part={part} />
        <span className="home-dither-trace-title">{title}</span>
        <span className="home-dither-trace-detail">{detail}</span>
      </li>)}
    </ol>
  </div>;
}

/** A printed signal in the empty result, replaced by the real demo response. */
export function HomeDitherWaiting() {
  return <div className="home-dither-waiting" aria-hidden="true">
    {[0.6875, 0.4375, 0.1875].map((level, i) => <span key={level} style={{ ...fillStyle("gradient", { color: "--landing-ink", edge: "left", cell: 2, length: 96, from: level, to: 0 }), backgroundImage: "var(--dither-spectrum)", width: `${[72, 100, 86][i]}%` }} />)}
  </div>;
}
