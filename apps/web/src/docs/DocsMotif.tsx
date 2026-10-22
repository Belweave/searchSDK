import { useId } from "react";
import { WorkspaceDitherSpectrum } from "../components/WorkspaceDither";
import { FillPattern } from "../lib/dither/fill.js";
import { DitherPattern } from "../lib/dither/pattern.js";

/** Static source paths: a small counterpart to the site's search composition. */
export function DocsMotif() {
  const id = useId();
  return <svg className="dw-source-motif" viewBox="0 0 240 104" width="240" height="104" aria-hidden="true" focusable="false">
    <defs><WorkspaceDitherSpectrum id={`${id}-rgb`} /><FillPattern id={id} fill="gradient" color="#fff" cell={2} level={0.85} floor={0.125} ramp={{ edge: "right", at: 240, length: 240 }} /><DitherPattern id={`${id}-paper`} level={0.125} color="#fff" cell={2} /><mask id={`${id}-mask`}>
    <rect width="240" height="104" fill={`url(#${id}-paper)`} opacity=".65" />
    <g transform="translate(0 16)">
    <g fill={`url(#${id})`}>
      <path d="M0 8h50l32 25h65v6H80L48 14H0zM0 33h148v6H0zM0 58h48l32-25h68v6H82L50 64H0z" />
      <rect x="156" y="4" width="84" height="15" rx="2" />
      <rect x="156" y="29" width="68" height="15" rx="2" />
      <rect x="156" y="54" width="50" height="15" rx="2" />
    </g>
    <g fill="none" stroke="#fff" opacity=".4"><path d="m144 36 8-24h4m-12 24 8 1h4m-12-1 8 25h4" /></g>
    </g>
    </mask></defs><rect width="240" height="104" fill={`url(#${id}-rgb)`} mask={`url(#${id}-mask)`} />
  </svg>;
}
