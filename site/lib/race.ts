import file from "@/data/race.sample.json";
import { type Dataset, toDataset } from "./dataset";
import { getProvider, hueVar } from "./registry";

/** Data for the home page race. Placeholder until the benchmark harness records real runs. */
export type RaceLane = {
  provider: string;
  name: string;
  hue: string;
  latencyMs: number;
  costUsd: number;
  quality: number;
  results: { title: string; url: string }[];
};

export type Race = { query: string; lanes: RaceLane[] };

function load(): Dataset<Race> {
  const lanes = file.lanes.map((lane): RaceLane => {
    const provider = getProvider(lane.provider);
    if (!provider) throw new Error(`Race lane "${lane.provider}" is not in the registry.`);
    return { ...lane, name: provider.name, hue: hueVar(provider.hue) };
  });
  return toDataset(file, { query: file.query, lanes }, "data/race.sample.json");
}

const race = load();

export function getRace(): Dataset<Race> {
  return race;
}
