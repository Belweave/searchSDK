// The ranking rule. Quality first, then reliability:
// 1. A provider is "unreliable" when we are confident (upper Wilson bound)
//    its usable-response rate is below the floor. Unreliable providers rank
//    below every dependable one.
// 2. Within each of those two bands, providers are sorted by quality. A
//    provider joins the current tie group unless it is separable from the
//    group's leader: the paired-bootstrap interval of the difference excludes
//    zero AND the difference is at least `minSeparation`.
// Cost and latency never enter the rank.
import type { PairedBootstrap } from "./stats.ts";

export interface RankInput {
  id: string;
  quality: number;
  usableRate: number;
  usableUpper: number;
}

export interface RankRow {
  id: string;
  /** Group number, 1 = best. Providers sharing a group are tied. */
  group: number;
  tied: boolean;
  reliable: boolean;
  /** Order within the table (1-based); not a claim of separation inside a group. */
  position: number;
}

export function rank(rows: readonly RankInput[], boot: PairedBootstrap, o: { floor: number; minSeparation: number }): RankRow[] {
  const separable = (leader: string, other: string): boolean => {
    const d = boot.diff[leader]?.[other];
    if (!d) return false;
    return d.lo > 0 && d.mean >= o.minSeparation;
  };
  const order = (a: RankInput, b: RankInput) => b.quality - a.quality || b.usableRate - a.usableRate || a.id.localeCompare(b.id);
  const reliable = rows.filter((r) => r.usableUpper >= o.floor).sort(order);
  const unreliable = rows.filter((r) => r.usableUpper < o.floor).sort(order);
  const out: RankRow[] = [];
  let group = 0;
  for (const band of [reliable, unreliable]) {
    let leader: string | null = null;
    for (const r of band) {
      if (leader === null || separable(leader, r.id)) {
        group++;
        leader = r.id;
      }
      out.push({ id: r.id, group, tied: false, reliable: band === reliable, position: out.length + 1 });
    }
  }
  for (const r of out) r.tied = out.filter((x) => x.group === r.group).length > 1;
  return out;
}
