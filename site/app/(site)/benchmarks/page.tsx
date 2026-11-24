import type { Metadata } from "next";
import Link from "next/link";
import { DataRegion } from "@/components/data/data-region";
import { getLeaderboard } from "@/lib/benchmarks";
import { providerHue, providerName } from "@/lib/registry";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  path: "/benchmarks",
  title: "Benchmarks",
  description: "searchSDK benchmarks every web search provider end to end. Ranked by answer quality, then reliability; latency and cost reported.",
});

const th = "py-2.5 pr-4 font-mono text-xs font-normal uppercase tracking-wide text-fg-subtle";
const td = "py-3 pr-4";

export default function BenchmarksPage() {
  const leaderboard = getLeaderboard();
  return (
    <div className="mx-auto max-w-page px-gutter pt-12">
      <h1 className="text-3xl font-semibold tracking-tight">Benchmarks</h1>
      <p className="mt-3 max-w-measure text-fg-muted">
        Ranked by quality, then reliability. Scores within {leaderboard.data.method.tieBand} points are a tie. Latency and cost
        never change rank. <Link href="/docs/benchmarks-method" className="text-accent underline underline-offset-4">Method</Link>
      </p>
      <DataRegion dataset={leaderboard} className="mt-8">
        {(board) => (
          <div data-words="data" className="overflow-x-auto">
            <table className="w-full min-w-[36rem] border-collapse text-sm">
              <thead className="border-b border-line">
                <tr>
                  <th scope="col" className={`${th} w-14 text-left`}>Rank</th>
                  <th scope="col" className={`${th} text-left`}>Provider</th>
                  <th scope="col" className={`${th} text-right`}>Quality</th>
                  <th scope="col" className={`${th} text-right`}>Reliability</th>
                  <th scope="col" className={`${th} text-right`}>Latency p50</th>
                  <th scope="col" className={`${th} text-right`}>Cost / 1k</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {board.rows.map((row) => (
                  <tr key={row.provider} className={row.dependable ? undefined : "text-fg-muted"}>
                    <td className={`${td} figures`}>{row.tied ? `=${row.rank}` : row.rank}</td>
                    <th scope="row" className={`${td} text-left font-medium`}>
                      <Link href={`/providers/${row.provider}`} className="inline-flex items-center gap-2 hover:text-accent">
                        <span aria-hidden="true" className="size-2.5 rounded-sm" style={{ background: providerHue(row.provider) }} />
                        {providerName(row.provider)}
                      </Link>
                      {row.dependable ? null : (
                        <span className="ml-2 rounded-sm border border-warn px-1.5 py-0.5 font-mono text-xs text-warn">unreliable</span>
                      )}
                    </th>
                    <td className={`${td} figures text-right`}>{row.quality.toFixed(1)}</td>
                    <td className={`${td} figures text-right`}>{(row.reliability * 100).toFixed(1)}%</td>
                    <td className={`${td} figures text-right`}>{row.latencyP50Ms} ms</td>
                    <td className={`${td} figures text-right`}>${row.costUsdPer1k.toFixed(2)}</td>
                  </tr>
                ))}
                {board.notRun.map((id) => (
                  <tr key={id} className="text-fg-muted">
                    <td className={`${td} figures`}>–</td>
                    <th scope="row" className={`${td} text-left font-medium`}>
                      <Link href={`/providers/${id}`} className="inline-flex items-center gap-2 hover:text-accent">
                        <span aria-hidden="true" className="size-2.5 rounded-sm" style={{ background: providerHue(id) }} />
                        {providerName(id)}
                      </Link>
                    </th>
                    <td colSpan={4} className={`${td} text-right`}>Not run</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DataRegion>
    </div>
  );
}
