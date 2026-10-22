import { lazy, Suspense, useId } from "react";
import { DitherPattern } from "../lib/dither/pattern.js";

const Shader = lazy(() => import("../lib/dither/shader.js").then(module => ({ default: module.DitherShader })));
const SPECTRUM = ["red", "orange", "yellow", "green", "cyan", "blue", "violet"] as const;
const PALETTE = SPECTRUM.map(color => `--dither-${color}`) as [string, string, ...string[]];

// Adapted from dithercn's Aurora field (MIT): https://dithercn.dev/r/aurora.json.
// Curtain edges, noise-shaped rays and depth attenuation form a single search current.
// The lens and stream are authored geometry; colour is independent of density.
const FIELD = `
float field(vec2 uv, vec2 res, float t) {
  float aspect = res.x / res.y;
  vec2 p = vec2(uv.x * aspect, uv.y);
  vec2 lens = vec2(aspect * 0.59, 0.48);
  float radius = 0.225;
  float distance = length(p - lens);
  float leftEnd = lens.x - radius;
  float tone = 0.0;
  if (p.x < leftEnd + 0.04) {
    float k = clamp(p.x / max(leftEnd, 0.1), 0.0, 1.0);
    float x = p.x * 2.2 - t * 0.24;
    for (int i = 0; i < 4; i++) {
      float fi = float(i);
      float base = mix(0.12 + fi * 0.205, lens.y - 0.13 + fi * 0.087, k * k);
      float fold = (1.0 - k * 0.8) * (
        0.075 * snoise(vec2(x * 0.8 + fi * 2.4, t * 0.17 + fi)) +
        0.035 * sin(x * 4.0 + fi * 1.8 + t * 0.65));
      float edge = base + fold;
      float above = p.y - edge;
      float curtain = above > 0.0 ? exp(-above * (12.0 + fi * 1.8)) : exp(above * 75.0);
      float bend = snoise(vec2(x * 0.7, t * 0.12 + fi)) * 0.35;
      float rays = mix(0.22, 1.0, smoothstep(0.2, 0.8, fbm(vec2((x + bend) * 7.0 + fi * 8.0, t * 0.22 + fi))));
      float rim = exp(-abs(above) * 85.0) * 0.65;
      float travel = 0.8 + 0.2 * sin(p.x * 10.0 - t * 2.2 + fi);
      tone += (curtain * rays + rim) * travel * (1.0 - fi * 0.1);
    }
    tone = (1.0 - exp(-tone * 1.45)) * smoothstep(0.0, 0.08, uv.x);
  }
  // Exactly one output silhouette. Its internal spectrum remains joined.
  if (p.x > lens.x + radius - 0.035) {
    float along = max(0.0, p.x - lens.x - radius);
    float bend = sin(along * 3.8 - t * 0.8) * 0.025 * smoothstep(0.0, 0.2, along);
    float d = abs(p.y - lens.y - bend);
    float width = 0.08 + 0.015 * sin(along * 5.0 - t * 0.65);
    float body = exp(-pow(d / width, 3.0));
    float rays = 0.68 + 0.32 * fbm(vec2(along * 3.0 - t * 0.65, p.y * 24.0));
    tone = max(tone, body * rays + exp(-d * 24.0) * 0.10);
  }
  // A circular, clear-centred lens, with a moving rim light.
  float rimD = abs(distance - radius);
  float angle = atan(p.y - lens.y, p.x - lens.x);
  float light = 0.7 + 0.3 * sin(angle * 2.0 - t * 1.1);
  float ring = exp(-pow(rimD / 0.018, 2.0)) * 0.92 + exp(-rimD * 60.0) * 0.22 * light;
  vec2 a = lens + vec2(radius * 0.70, -radius * 0.70);
  vec2 b = a + vec2(0.15, -0.15);
  vec2 ab = b - a;
  float h = clamp(dot(p - a, ab) / dot(ab, ab), 0.0, 1.0);
  float handle = exp(-pow(length(p - a - ab * h) / 0.026, 4.0));
  if (distance < radius - 0.035) tone = 0.0;
  return clamp(max(tone, max(ring, handle * 0.85)), 0.0, 1.0)
    * smoothstep(0.0, 0.045, uv.y) * smoothstep(0.0, 0.045, 1.0 - uv.y);
}
`;
const COLOR = `
float colorPosition(vec2 uv, vec2 res, float t) {
  float aspect = res.x / res.y;
  vec2 p = vec2(uv.x * aspect, uv.y);
  vec2 lens = vec2(aspect * 0.59, 0.48);
  if (length(p - lens) < 0.27) {
    return clamp((atan(p.y - lens.y, p.x - lens.x) + 3.14159265) / 6.2831853, 0.0, 1.0);
  }
  float right = smoothstep(lens.x + 0.20, lens.x + 0.34, p.x);
  float along = max(0.0, p.x - lens.x - 0.225);
  float bend = sin(along * 3.8 - t * 0.8) * 0.025 * smoothstep(0.0, 0.2, along);
  return mix(clamp((0.91 - uv.y) / 0.82, 0.0, 1.0), clamp((lens.y + bend + 0.09 - p.y) / 0.18, 0.0, 1.0), right);
}
`;

/** Finished prerendered art also serves no-WebGL and lost-context browsers. */
function Still() {
  const uid = useId().replaceAll(":", "");
  return <>{[false, true].map(mobile => {
    const id = `${uid}-${mobile}`;
    const width = mobile ? 390 : 1440, height = mobile ? 300 : 420;
    const cx = width * .59, cy = height * .52, radius = height * .225;
    return <svg key={id} className={`landing-signal-art landing-signal-art-${mobile ? "mobile" : "desktop"}`} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-rgb`} x1="0" y1="0" x2="0" y2="1">{SPECTRUM.map((color, i) => <stop key={color} offset={i / 6} stopColor={`var(--dither-${color})`} />)}</linearGradient>
        <DitherPattern id={`${id}-soft`} color="white" level={.25} cell={2} matrix="bayer8" />
        <DitherPattern id={`${id}-dense`} color="white" level={.75} cell={2} matrix="bayer8" />
        <mask id={`${id}-mask`}><g stroke={`url(#${id}-soft)`} strokeWidth={height * .11} fill="none">{[.18,.38,.58,.78].map((y,i) => <path key={y} d={`M0 ${height*y} C${cx*.32} ${height*(y-.12)},${cx*.65} ${height*(y+.12)},${cx-radius} ${cy+(i-1.5)*height*.087}`} />)}</g><g stroke={`url(#${id}-dense)`} strokeWidth={height*.035} fill="none">{[.18,.38,.58,.78].map((y,i) => <path key={y} d={`M0 ${height*y} C${cx*.32} ${height*(y-.12)},${cx*.65} ${height*(y+.12)},${cx-radius} ${cy+(i-1.5)*height*.087}`} />)}<circle cx={cx} cy={cy} r={radius} /><path d={`M${cx+radius*.7} ${cy+radius*.7}l${height*.15} ${height*.15}`} strokeWidth={height*.05}/></g></mask>
        <mask id={`${id}-stream`}><path d={`M${cx+radius} ${cy-height*.08} Q${width*.8} ${cy-height*.12} ${width} ${cy-height*.06}V${cy+height*.09}Q${width*.8} ${cy+height*.04} ${cx+radius} ${cy+height*.08}Z`} fill={`url(#${id}-dense)`}/></mask>
      </defs>
      <rect width={width} height={height} fill={`url(#${id}-rgb)`} mask={`url(#${id}-mask)`}/>
      <rect x={cx+radius} y={cy-height*.12} width={width-cx-radius} height={height*.24} fill={`url(#${id}-rgb)`} mask={`url(#${id}-stream)`}/>
    </svg>;
  })}</>;
}

export interface AuroraSignalProps { animate?: boolean; intensity?: number; speed?: number; cell?: number }
export function AuroraSignal({ animate = true, intensity = 1, speed = 1, cell = 2 }: AuroraSignalProps) {
  return <div className="landing-signal" aria-hidden="true" style={{ opacity: Math.min(1, Math.max(0, intensity)) }}>
    <Suspense fallback={<Still />}><Shader className="aurora-canvas" field={FIELD} colorField={COLOR} palette={PALETTE} matrix="bayer8" cell={cell} fps={30} animate={animate} speed={speed} stillTime={8} fallback={<Still />} /></Suspense>
  </div>;
}
