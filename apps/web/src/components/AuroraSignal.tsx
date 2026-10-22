import { useId } from "react";
import { DitherShader } from "../lib/dither/shader.js";

// Search paths gather through a lens and separate into source trails.
// All distances use height units, so the lens remains circular at every ratio.
const FIELD = `
float searchLine(vec2 p, vec2 a, vec2 b, float width) {
  vec2 pa = p - a;
  vec2 ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return exp(-length(pa - ba * h) / width);
}
float field(vec2 uv, vec2 res, float t) {
  float aspect = res.x / res.y;
  vec2 p = vec2(uv.x * aspect, uv.y);
  vec2 lens = vec2(aspect * 0.61, 0.51);
  float radial = length(p - lens);
  float ring = exp(-abs(radial - 0.30) * 54.0);
  float rim = exp(-abs(radial - 0.325) * 120.0) * 0.35;
  float handle = searchLine(p, lens + vec2(0.225, -0.225), lens + vec2(0.43, -0.43), 0.025);
  float trails = 0.0;
  float join = smoothstep(0.03, 0.62, uv.x);
  for (int i = 0; i < 7; i++) {
    float lane = float(i) - 3.0;
    float bend = sin(uv.x * 6.0 + lane * 0.34 + t * 0.075) * 0.10;
    float centre = 0.51 + lane * mix(0.125, 0.034, join) + bend * (1.0 - join);
    float d = uv.y - centre;
    float ribbon = exp(-abs(d) * (48.0 + 8.0 * sin(uv.x * 7.0 + lane)));
    float weave = 0.65 + 0.35 * sin(uv.x * 75.0 + lane * 4.0 - t * 0.2);
    float tail = smoothstep(0.0, 0.16, uv.x) * (1.0 - smoothstep(0.56, 0.66, uv.x));
    trails = max(trails, ribbon * weave * tail * 0.85);
  }
  float sources = 0.0;
  for (int j = 0; j < 3; j++) {
    float row = float(j) - 1.0;
    float y = lens.y + row * 0.19;
    float xStart = lens.x + sqrt(max(0.0, 0.09 - row * row * 0.0361));
    float xEnd = aspect * 0.94 - abs(row) * 0.18;
    float band = searchLine(p, vec2(xStart, y), vec2(xEnd, y), 0.012);
    float wake = exp(-abs(uv.y - y) * 22.0) * smoothstep(xStart, xStart + 0.12, p.x) * (1.0 - smoothstep(xEnd - 0.25, xEnd, p.x)) * 0.23;
    sources = max(sources, band * 0.75 + wake);
  }
  float lensShade = exp(-radial * 8.0) * 0.10;
  float edge = smoothstep(0.0, 0.06, uv.x) * (1.0 - smoothstep(0.96, 1.0, uv.x));
  float vertical = smoothstep(0.0, 0.12, uv.y) * (1.0 - smoothstep(0.91, 1.0, uv.y));
  return clamp(max(max(trails, sources), ring * 0.94 + rim + handle * 0.78) + lensShade, 0.0, 1.0) * edge * vertical;
}`;

function SearchPathsStill() {
  const id = useId().replaceAll(":", "");
  return <>{[false, true].map(mobile => {
    const key = `${id}-${mobile ? "mobile" : "desktop"}`;
    const width = mobile ? 390 : 1440;
    const height = mobile ? 250 : 350;
    return <svg key={key} className={`landing-signal-fallback landing-signal-fallback-${mobile ? "mobile" : "desktop"}`} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      <defs><pattern id={`${key}-dots`} width="4" height="4" patternUnits="userSpaceOnUse"><rect width="2" height="2" fill="var(--landing-ink)" /></pattern><linearGradient id={`${key}-fade`}><stop stopColor="white" stopOpacity="0" /><stop offset=".15" stopColor="white" /><stop offset=".9" stopColor="white" /><stop offset="1" stopColor="white" stopOpacity="0" /></linearGradient><mask id={`${key}-mask`}><rect width={width} height={height} fill={`url(#${key}-fade)`} /></mask></defs>
      <g mask={`url(#${key}-mask)`} fill="none" stroke={`url(#${key}-dots)`} strokeWidth={mobile ? 9 : 15}>{(mobile ? [35, 65, 95, 125, 155, 185, 215] : [65, 100, 135, 175, 215, 250, 285]).map((y, i) => <path key={y} d={mobile ? `M 0 ${y} C 90 ${y - 20}, 110 ${125 + i * 3}, 215 ${110 + i * 5}` : `M 0 ${y} C 280 ${y - 65 + i * 4}, 420 ${175 + i * 4}, 790 ${155 + i * 6}`} />)}<circle cx={mobile ? 238 : 878} cy={mobile ? 123 : 172} r={mobile ? 75 : 105} strokeWidth={mobile ? 9 : 13} /><path d={mobile ? "m 291 176 46 46" : "m 953 247 65 65"} strokeWidth={mobile ? 14 : 20} /><path d={mobile ? "M 298 76 H 370 M 313 123 H 385 M 298 170 H 370" : "M 965 107 H 1320 M 983 172 H 1390 M 965 238 H 1320"} strokeWidth={mobile ? 6 : 9} /></g>
    </svg>;
  })}</>;
}

export interface AuroraSignalProps { animate?: boolean; intensity?: number; speed?: number; cell?: number }
export function AuroraSignal({ animate = true, intensity = 1, speed = 1, cell = 2.5 }: AuroraSignalProps) {
  return <div className="landing-signal" style={{ opacity: Math.min(1, Math.max(0, intensity)) }} aria-hidden="true"><DitherShader field={FIELD} matrix="bayer8" levels={64} cell={cell} palette={["--landing-paper", "--landing-haze", "--landing-blue", "--landing-ink"]} animate={animate} speed={speed} fps={20} stillTime={8} className="landing-signal-canvas" fallback={<SearchPathsStill />} /></div>;
}
