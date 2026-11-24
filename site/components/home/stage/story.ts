import type { StagePreset } from "@/lib/race";

/**
 * The stage's story as a pure function of time. Nothing here is random and nothing keeps state,
 * so playing, pausing, scrubbing and replaying are all the same operation: compute the frame at t.
 *
 *   pointer to a preset key → the query types into search() → pointer presses Run → the call fans
 *   out to every enabled provider → each answers at its own latency → one attempt fails and the
 *   fallback takes over → pointer hovers a lane: raw response beside the normalized one → pointer
 *   presses the top result: contents() streams the page → every lane pours into one shape, with
 *   the total cost.
 */

export const TYPE_CPS = 32;
const FAN_MS = 420;
const HOLD_MS = 2600;

export type Phase = "idle" | "running" | "done" | "failed" | "fallback" | "recovered";

export type LaneFrame = {
  phase: Phase;
  /** Milliseconds since dispatch shown on the counter. */
  elapsedMs: number;
  /** Where the primary attempt's bar ends (ms), once known. */
  primaryEndMs: number;
  /** When the failed attempt gave up, for the failing lane. */
  failAtMs: number | null;
  /** The fallback attempt's bar end (ms), for the failing lane. */
  fallbackEndMs: number | null;
};

export type Times = {
  pressPreset: number;
  typeStart: number;
  typeEnd: number;
  pressRun: number;
  dispatch: number;
  race: number;
  raceEnd: number;
  inspectStart: number;
  inspectEnd: number;
  pressContents: number;
  contentsEnd: number;
  converge: number;
  end: number;
  loop: number;
  /** Absolute time of the failed attempt, or null when the failing provider is off. */
  fail: number | null;
};

export type Chapter = { id: string; label: string; at: number };

export type Frame = {
  t: number;
  typed: number;
  runPressed: boolean;
  /** 0 → 1 as the call travels out along the fan. */
  fan: number;
  lanes: Record<string, LaneFrame>;
  inspect: string | null;
  contentsPressed: boolean;
  /** 0 → 1 as the page text streams in. */
  page: number;
  /** 0 → 1 as the lanes pour into one shape. */
  converge: number;
  chapter: number;
  /** The lane the story inspects and opens. */
  lead: string | null;
};

export type Story = { times: Times; chapters: Chapter[]; scaleMs: number; frame: (t: number) => Frame };

export function buildStory(preset: StagePreset, enabled: string[], fallbackLatencyMs: number, attemptTimeoutMs: number): Story {
  const failing = preset.fails && enabled.includes(preset.fails.provider) ? preset.fails : null;
  const pressPreset = 700;
  const typeStart = 860;
  const typeEnd = typeStart + (preset.query.length / TYPE_CPS) * 1000;
  const pressRun = typeEnd + 620;
  const dispatch = pressRun + 90;
  const race = dispatch + FAN_MS;

  // Each lane's timeline, relative to `race`.
  const plan = enabled.map((id) => {
    const run = preset.runs[id];
    if (!run) return { id, end: 0, failAt: null as number | null, fbEnd: null as number | null };
    if (failing && failing.provider === id) {
      const failAt = failing.code === "attempt_timeout" ? attemptTimeoutMs : run.latencyMs;
      return { id, end: failAt, failAt, fbEnd: failAt + 70 + fallbackLatencyMs };
    }
    return { id, end: run.latencyMs, failAt: null, fbEnd: null };
  });
  const raceSpan = Math.max(400, ...plan.map((p) => p.fbEnd ?? p.end));
  const raceEnd = race + raceSpan;
  const lead = plan.find((p) => p.failAt === null && preset.runs[p.id])?.id ?? null;
  const inspectStart = raceEnd + 1150;
  const inspectEnd = inspectStart + 2300;
  const pressContents = inspectEnd + 750;
  const pageChars = preset.page.lines.join("").length;
  const contentsEnd = pressContents + 260 + Math.min(1900, pageChars * 9);
  const converge = contentsEnd + 250;
  const end = converge + 1300;
  const loop = end + HOLD_MS;
  const failPlan = plan.find((p) => p.failAt !== null);
  const fail = failPlan ? race + failPlan.failAt! : null;

  const times: Times = { pressPreset, typeStart, typeEnd, pressRun, dispatch, race, raceEnd, inspectStart, inspectEnd, pressContents, contentsEnd, converge, end, loop, fail };
  const chapters: Chapter[] = [
    { id: "ask", label: "Ask", at: 0 },
    { id: "fan", label: "Fan out", at: dispatch },
    ...(fail !== null ? [{ id: "fallback", label: "Fallback", at: fail }] : []),
    { id: "raw", label: "Raw vs normalized", at: inspectStart - 200 },
    { id: "contents", label: "contents()", at: pressContents },
    { id: "shape", label: "One shape", at: converge },
  ];
  const scaleMs = Math.ceil((raceSpan + 150) / 500) * 500;

  const frame = (t: number): Frame => {
    const lanes: Record<string, LaneFrame> = {};
    const since = t - race;
    for (const p of plan) {
      if (!preset.runs[p.id] || since < 0) {
        lanes[p.id] = { phase: "idle", elapsedMs: 0, primaryEndMs: 0, failAtMs: null, fallbackEndMs: null };
        continue;
      }
      if (p.failAt !== null && p.fbEnd !== null) {
        const fbStart = p.failAt + 70;
        const phase: Phase = since < p.failAt ? "running" : since < fbStart ? "failed" : since < p.fbEnd ? "fallback" : "recovered";
        lanes[p.id] = {
          phase,
          elapsedMs: Math.min(since, p.fbEnd),
          primaryEndMs: Math.min(since, p.failAt),
          failAtMs: since >= p.failAt ? p.failAt : null,
          fallbackEndMs: since >= fbStart ? Math.min(since, p.fbEnd) : null,
        };
      } else {
        lanes[p.id] = { phase: since < p.end ? "running" : "done", elapsedMs: Math.min(since, p.end), primaryEndMs: Math.min(since, p.end), failAtMs: null, fallbackEndMs: null };
      }
    }
    let chapter = 0;
    chapters.forEach((c, i) => {
      if (t >= c.at) chapter = i;
    });
    return {
      t,
      typed: Math.max(0, Math.min(preset.query.length, Math.floor(((t - typeStart) / 1000) * TYPE_CPS))),
      runPressed: t >= pressRun && t < pressRun + 160,
      fan: Math.max(0, Math.min(1, (t - dispatch) / FAN_MS)),
      lanes,
      inspect: t >= inspectStart && t < inspectEnd ? lead : null,
      contentsPressed: t >= pressContents,
      page: Math.max(0, Math.min(1, (t - pressContents - 260) / Math.max(1, contentsEnd - pressContents - 260))),
      converge: Math.max(0, Math.min(1, (t - converge) / 1100)),
      chapter,
      lead,
    };
  };

  return { times, chapters, scaleMs, frame };
}

/** Where the scripted pointer is headed, as a list of moves. Targets are data-target names. */
export type Move = { from: number; to: number; target: string; press?: number };

export function pointerMoves(times: Times, presetId: string, lead: string | null): Move[] {
  const moves: Move[] = [{ from: 0, to: 640, target: `preset-${presetId}`, press: times.pressPreset }];
  moves.push({ from: times.typeEnd - 40, to: times.pressRun - 40, target: "run", press: times.pressRun });
  if (lead) {
    moves.push({ from: times.raceEnd + 200, to: times.inspectStart - 60, target: `lane-${lead}` });
    moves.push({ from: times.inspectEnd + 80, to: times.pressContents - 60, target: `result-${lead}`, press: times.pressContents });
  }
  moves.push({ from: times.contentsEnd + 300, to: times.end, target: "answer" });
  return moves;
}

/** Minimum-jerk easing: the velocity profile of a hand reaching for something. */
export const reach = (t: number) => t * t * t * (10 - 15 * t + 6 * t * t);
