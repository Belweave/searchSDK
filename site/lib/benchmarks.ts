import file from "@/data/benchmarks.sample.json";
import { type Dataset, toDataset } from "./dataset";

/**
 * Leaderboard data and ranking. Rank is quality first, then reliability:
 *  1. Providers below `minReliability` are marked unreliable and ranked after every dependable one.
 *  2. Within each group, quality decides. A provider within `tieBand` points of its band's leader
 *     shares the leader's rank (shown as tied).
 * Latency and cost are reported, never ranked. Cost is not an input to anything here.
 */

export type BenchmarkRow = {
  provider: string;
  quality: number;
  reliability: number;
  latencyP50Ms: number;
  costUsdPer1k: number;
};

export type RankedRow = BenchmarkRow & { rank: number; tied: boolean; dependable: boolean };

export type Leaderboard = {
  run: { id: string; date: string | null; queries: number | null };
  method: { tieBand: number; minReliability: number };
  rows: RankedRow[];
};

export function rankRows(rows: BenchmarkRow[], tieBand: number, minReliability: number): RankedRow[] {
  const byQuality = (a: BenchmarkRow, b: BenchmarkRow) => b.quality - a.quality || b.reliability - a.reliability;
  const dependable = rows.filter((r) => r.reliability >= minReliability).sort(byQuality);
  const unreliable = rows.filter((r) => r.reliability < minReliability).sort(byQuality);

  const ranked: RankedRow[] = [];
  let position = 0;
  for (const [group, isDependable] of [
    [dependable, true],
    [unreliable, false],
  ] as const) {
    let leader: RankedRow | undefined;
    for (const row of group) {
      position += 1;
      if (leader && leader.quality - row.quality < tieBand) {
        leader.tied = true;
        ranked.push({ ...row, rank: leader.rank, tied: true, dependable: isDependable });
      } else {
        leader = { ...row, rank: position, tied: false, dependable: isDependable };
        ranked.push(leader);
      }
    }
  }
  return ranked;
}

function load(): Dataset<Leaderboard> {
  const { run, method } = file;
  return toDataset(
    file,
    { run, method, rows: rankRows(file.rows, method.tieBand, method.minReliability) },
    "data/benchmarks.sample.json",
  );
}

const leaderboard = load();

export function getLeaderboard(): Dataset<Leaderboard> {
  return leaderboard;
}
