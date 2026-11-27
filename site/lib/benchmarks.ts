import file from "@/data/benchmarks.json";
import { type Dataset, toDataset } from "./dataset";
import { getRegistry } from "./registry";

/**
 * Leaderboard data and ranking. Rank is quality first, then reliability:
 *  1. Providers below `minReliability` are marked unreliable and ranked after every dependable one.
 *  2. Within each group, quality decides. A provider within `tieBand` points of its band's leader
 *     shares the leader's rank (shown as tied).
 * Latency and cost are reported, never ranked. Cost is not an input to anything here.
 * Equal rows keep registry order (alphabetical by name): the sorts are stable.
 *
 * While the file is `pending`, every provider has the same placeholder row, so all share one rank;
 * the board and table show no figures or rank numbers for them.
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
  /** Placeholder rows, the same for every provider: show them as pending, never as figures or ranks. */
  pending: boolean;
  run: { id: string; date: string | null; queries: number | null };
  method: { tieBand: number; minReliability: number };
  rows: RankedRow[];
  /** Registry providers with no row in this run, listed after the ranking. */
  notRun: string[];
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

/** Rows for every registry provider that has one; the provider list comes from the registry. */
function load(): Dataset<Leaderboard> {
  const { run, method } = file;
  const scores: Record<string, Omit<BenchmarkRow, "provider">> = file.rows;
  const ids = getRegistry().providers.map((p) => p.id);
  for (const id of Object.keys(scores)) {
    if (!ids.includes(id)) throw new Error(`data/benchmarks.json has a row for "${id}", which is not in the registry.`);
  }
  const rows = ids.flatMap((id) => (scores[id] ? [{ provider: id, ...scores[id] }] : []));
  return toDataset(
    file,
    { pending: file.pending === true, run, method, rows: rankRows(rows, method.tieBand, method.minReliability), notRun: ids.filter((id) => !scores[id]) },
    "data/benchmarks.json",
  );
}

const leaderboard = load();

export function getLeaderboard(): Dataset<Leaderboard> {
  return leaderboard;
}
