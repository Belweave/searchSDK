import type { Metadata } from "next";
import Link from "next/link";
import { ProviderMark } from "@/components/brand/provider-mark";
import { DataRegion } from "@/components/data/data-region";
import { Board } from "@/components/home/board";
import { getLeaderboard } from "@/lib/benchmarks";
import { allBrands, providerBrand } from "@/lib/provider-assets";
import { pageMetadata } from "@/lib/seo";
import { breadcrumbs, JsonLd } from "@/lib/structured-data";
import "@/components/home/home.css";
import "@/components/site/pages.css";

export const metadata: Metadata = pageMetadata({
  path: "/benchmarks",
  title: "Open benchmark of web search APIs",
  description: "searchSDK's open benchmark of web search providers: quality first, then reliability, with latency and cost. Results pending; the first run is in progress.",
});

export default function BenchmarksPage() {
  const leaderboard = getLeaderboard();
  const brands = Object.fromEntries(allBrands().map((b) => [b.id, b]));
  return (
    <div className="page-wrap page-top">
      <JsonLd nodes={[breadcrumbs([{ name: "Home", path: "/" }, { name: "Benchmarks", path: "/benchmarks" }])]} />
      <div className="page-head">
        <h1 className="type-h2">Benchmarks</h1>
        <p className="page-line">
          Results pending. The first benchmark run is in progress; every provider shows the same placeholder until it is published.
          Then rank is quality first, then reliability: scores within {leaderboard.data.method.tieBand} points tie, and latency and
          cost never change rank.{" "}
          <Link href="/docs/benchmarks-method" className="prose-link">
            Method
          </Link>
        </p>
      </div>
      <DataRegion dataset={leaderboard} placeLabel className="bench-region">
        {(board, label) => (
          <>
            <Board board={board} brands={brands} sampleTag={label} />
            <div data-words="data" className="bench-table-wrap">
              <table className="bench-table">
                <thead>
                  <tr>
                    <th scope="col" className="type-label bench-left">Rank</th>
                    <th scope="col" className="type-label bench-left">Provider</th>
                    <th scope="col" className="type-label">Quality</th>
                    <th scope="col" className="type-label">Reliability</th>
                    <th scope="col" className="type-label">Latency p50</th>
                    <th scope="col" className="type-label">Cost / 1k</th>
                  </tr>
                </thead>
                <tbody>
                  {board.rows.map((row) => (
                    <tr key={row.provider} data-unreliable={row.dependable ? undefined : ""}>
                      <td className="figures bench-left">{board.pending ? "–" : row.tied ? `=${row.rank}` : row.rank}</td>
                      <th scope="row">
                        <Link href={`/providers/${row.provider}`} className="bench-name">
                          <ProviderMark brand={providerBrand(row.provider)} size={18} />
                          {providerBrand(row.provider).name}
                        </Link>
                      </th>
                      {board.pending ? (
                        <>
                          <td className="figures">–</td>
                          <td className="figures">–</td>
                          <td className="figures">–</td>
                          <td className="figures">–</td>
                        </>
                      ) : (
                        <>
                          <td className="figures">{row.quality.toFixed(1)}</td>
                          <td className="figures">{(row.reliability * 100).toFixed(1)}%</td>
                          <td className="figures">{row.latencyP50Ms} ms</td>
                          <td className="figures">${row.costUsdPer1k.toFixed(2)}</td>
                        </>
                      )}
                    </tr>
                  ))}
                  {board.notRun.map((id) => (
                    <tr key={id} data-unreliable="">
                      <td className="figures bench-left">–</td>
                      <th scope="row">
                        <Link href={`/providers/${id}`} className="bench-name">
                          <ProviderMark brand={providerBrand(id)} size={18} />
                          {providerBrand(id).name}
                        </Link>
                      </th>
                      <td colSpan={4}>Not run</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </DataRegion>
    </div>
  );
}
