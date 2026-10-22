"use client";

import { useId } from "react";

import {
  DitherPattern,
  DitherShader,
  usePrefersReducedMotion,
} from "@/lib/dither";
import type { DitherShaderProps } from "@/lib/dither";

import "./search-signal.css";

// The engine owns quantisation and Bayer thresholds. This field describes
// continuous coverage only, including the soft edges of individual points.
const SEARCH_SIGNAL_FIELD = `
float signalSegment(vec2 p, vec2 a, vec2 b) {
  vec2 ab = b - a;
  float along = clamp(dot(p - a, ab) / dot(ab, ab), 0.0, 1.0);
  return length(p - a - ab * along);
}

float signalStroke(float distanceToStroke, float width) {
  return exp(-pow(distanceToStroke / width, 2.0));
}

float field(vec2 uv, vec2 res, float t) {
  vec2 p = (uv - 0.5) * vec2(res.x / res.y, 1.0) / signalScale;
  float elapsed = max(0.0, t - 12.0);
  float settle = mix(smoothstep(0.0, 11.0, elapsed), 1.0, signalStill);
  float drift = (1.0 - signalStill) * 0.004;
  p -= drift * vec2(sin(elapsed * 0.19), sin(elapsed * 0.15));

  vec2 centre = vec2(-0.035, 0.055);
  vec2 q = p - centre;
  float radius = 0.247;
  float ringDistance = abs(length(q) - radius);
  float ring = signalStroke(ringDistance, 0.014);
  // The rim has a broad, sparse shoulder, with a denser printed centre.
  ring = max(ring * (0.64 + 0.12 * smoothstep(-0.25, 0.25, q.y - q.x)),
             signalStroke(ringDistance, 0.032) * 0.18);
  float handle = signalStroke(signalSegment(p,
    vec2(0.145, -0.125), vec2(0.335, -0.315)), 0.021) * 0.74;

  float rows = signalStroke(signalSegment(p,
    vec2(-0.165, 0.135), vec2(0.090, 0.135)), 0.013) * 0.70;
  rows = max(rows, signalStroke(signalSegment(p,
    vec2(-0.165, 0.055), vec2(0.035, 0.055)), 0.013) * 0.54);
  rows = max(rows, signalStroke(signalSegment(p,
    vec2(-0.165, -0.025), vec2(-0.020, -0.025)), 0.013) * 0.38);

  float resolved = max(max(ring, handle), rows);
  float points = 0.0;
  // Twenty-eight stable points follow individual, eased paths. No animated
  // random noise: a point keeps its identity all the way to the signal.
  for (int i = 0; i < 28; i++) {
    float fi = float(i);
    float seed = hash21(vec2(fi + 2.0, 7.3));
    float other = hash21(vec2(fi + 19.0, 3.8));
    vec2 source = vec2((seed - 0.5) * 1.04, (other - 0.5) * 0.80);
    vec2 destination;
    if (i < 20) {
      float angle = fi * 6.2831853 / 20.0;
      destination = centre + radius * vec2(cos(angle), sin(angle));
    } else if (i < 25) {
      destination = mix(vec2(0.145, -0.125), vec2(0.335, -0.315), (fi - 20.0) / 4.0);
    } else {
      destination = vec2(-0.165, 0.135 - (fi - 25.0) * 0.080);
    }
    float travel = mix(smoothstep(seed * 1.8, 9.2 + seed * 1.8, elapsed), 1.0, signalStill);
    vec2 bend = vec2(destination.y - source.y, source.x - destination.x);
    vec2 location = mix(source, destination, travel)
      + bend * sin(travel * 3.14159265) * 0.16;
    float pointRadius = mix(0.011, 0.018, seed);
    float pointTone = signalStroke(length(p - location), pointRadius);
    points = max(points, pointTone * (0.45 + 0.30 * other));
  }

  // A few peripheral grains remain: retrieval sharpens the useful signal
  // without turning the entire field into a filled silhouette.
  vec2 tile = floor((p + 0.7) * 15.0);
  vec2 local = fract((p + 0.7) * 15.0) - 0.5;
  vec2 jitter = vec2(hash21(tile + 4.1), hash21(tile + 11.7)) - 0.5;
  float peripheral = signalStroke(length(local - jitter * 0.55), 0.13)
    * smoothstep(0.65, 0.95, hash21(tile))
    * smoothstep(0.30, 0.42, length(q)) * 0.30;
  float edge = (1.0 - smoothstep(0.44, 0.58, abs(p.x)))
    * (1.0 - smoothstep(0.36, 0.47, abs(p.y)));
  float structure = resolved * mix(0.08, 1.0, smoothstep(0.18, 0.95, settle));
  return clamp(max(max(structure, points * mix(1.0, 0.32, settle)), peripheral)
    * edge * signalIntensity, 0.0, 0.88);
}
`;

export type SearchSignalProps = Omit<
  DitherShaderProps,
  "field" | "uniforms" | "fallback" | "children" | "stillTime" | "palette"
> & {
  /** Coverage multiplier, 0–1. Defaults to 1. */
  intensity?: number;
  /** Object size, 0.7–1.25. Defaults to 1. */
  scale?: number;
  /** Force the finished still frame; OS reduced motion is always respected. */
  reducedMotion?: boolean;
};

const bounded = (value: number, min: number, max: number, fallback: number) =>
  Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;

/** A static, theme-aware printed signal for startup and unavailable WebGL. */
function SignalFallback({ intensity, scale }: { intensity: number; scale: number }) {
  const id = useId().replace(/:/g, "");
  const rimId = `${id}-signal-rim`;
  const rowId = `${id}-signal-row`;
  const grainId = `${id}-signal-grain`;

  return (
    <svg className="search-signal__fallback" viewBox="0 0 450 360" aria-hidden="true">
      <defs>
        <DitherPattern id={rimId} level={0.6875} cell={2.5} />
        <DitherPattern id={rowId} level={0.4375} cell={2.5} />
        <DitherPattern id={grainId} level={0.1875} cell={2.5} />
      </defs>
      <g opacity={intensity} transform={`translate(225 180) scale(${scale}) translate(-225 -180)`}>
        <path d="M 266 225 L 346 305 L 354 297 L 274 217 Z" fill={`url(#${rimId})`} />
        <path
          d="M301 160a89 89 0 1 1-178 0a89 89 0 1 1 178 0 M291 160a79 79 0 1 0-158 0a79 79 0 1 0 158 0"
          fillRule="evenodd"
          fill={`url(#${rimId})`}
        />
        <path d="M165 127h93v9h-93z" fill={`url(#${rimId})`} />
        <path d="M165 156h73v9h-73z M165 185h53v9h-53z" fill={`url(#${rowId})`} />
        {[[57, 110], [86, 229], [113, 50], [314, 54], [367, 124], [384, 219], [166, 299], [68, 291]].map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r={5} fill={`url(#${grainId})`} />
        ))}
      </g>
    </svg>
  );
}

/** Decorative only. Place captions and accessible figure labels outside it. */
export function SearchSignal({
  intensity = 1,
  speed = 1,
  scale = 1,
  reducedMotion = false,
  animate = true,
  cell = 2.5,
  fps = 24,
  matrix = "bayer8",
  className,
  ...props
}: SearchSignalProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const still = reducedMotion || prefersReducedMotion || !animate || speed <= 0;
  const coverage = bounded(intensity, 0, 1, 1);
  const size = bounded(scale, 0.7, 1.25, 1);

  return (
    <DitherShader
      {...props}
      className={`search-signal${className ? ` ${className}` : ""}`}
      field={SEARCH_SIGNAL_FIELD}
      uniforms={{ signalIntensity: coverage, signalScale: size, signalStill: still ? 1 : 0 }}
      palette={["--dither-paper", "--dither-ink"]}
      matrix={matrix}
      cell={bounded(cell, 1.5, 6, 2.5)}
      speed={bounded(speed, 0, 2, 1)}
      fps={bounded(fps, 1, 30, 24)}
      animate={!still}
      stillTime={12}
      fallback={<SignalFallback intensity={coverage} scale={size} />}
      aria-hidden="true"
    />
  );
}
