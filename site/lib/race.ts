import file from "@/data/race.sample.json";
import { type Dataset, toDataset } from "./dataset";
import { getRegistry, hueVar } from "./registry";

/**
 * Data for the home page race. Lanes are the registry's search providers; the timings, costs,
 * scores and results are placeholders (data/race.sample.json) until the benchmark harness records
 * real runs. A provider with no placeholder entry gets a lane with no run.
 */
export type RaceRun = { latencyMs: number; costUsd: number; quality: number; results: { title: string; url: string }[] };

export type RaceLane = { provider: string; name: string; hue: string; run: RaceRun | null };

export type Race = { query: string; lanes: RaceLane[] };

function load(): Dataset<Race> {
  const runs: Record<string, RaceRun> = file.lanes;
  const providers = getRegistry().providers.filter((p) => p.search);
  for (const id of Object.keys(runs)) {
    if (!providers.some((p) => p.id === id)) throw new Error(`data/race.sample.json has a lane for "${id}", which is not a search provider in the registry.`);
  }
  const lanes = providers.map((p): RaceLane => ({ provider: p.id, name: p.name, hue: hueVar(p.hue), run: runs[p.id] ?? null }));
  return toDataset(file, { query: file.query, lanes }, "data/race.sample.json");
}

const race = load();

export function getRace(): Dataset<Race> {
  return race;
}
