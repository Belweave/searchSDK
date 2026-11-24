import type { Metadata } from "next";
import Link from "next/link";
import { DataRegion } from "@/components/data/data-region";
import { Race } from "@/components/home/race";
import { CopyCommand } from "@/components/site/copy-command";
import { getRace } from "@/lib/race";
import { pageMetadata } from "@/lib/seo";
import { site } from "@/lib/site";

export const metadata: Metadata = pageMetadata({
  path: "/",
  title: "searchSDK: one interface to every web search API",
  description: "One TypeScript and Python interface for AI apps and agents to many web search providers, with open benchmarks. MIT licensed.",
});

const EXAMPLE = `import { createSearch } from "searchsdk";
const search = createSearch({ providers: ["exa", "tavily"] });
const { results } = await search("vector database indexing");
console.log(results[0]?.url);`;

export default function Home() {
  return (
    <div className="mx-auto max-w-page px-gutter">
      <section data-cap="30" data-cap-name="hero" className="pt-12 sm:pt-16">
        <h1 className="max-w-3xl text-display leading-tight font-semibold tracking-tight">One query. Every search provider.</h1>
        <p className="mt-5 max-w-measure text-lg text-fg-muted">
          searchSDK gives AI apps and agents one interface to web search providers, and publishes how each one performs.
        </p>
        <DataRegion dataset={getRace()} className="mt-10">
          {(race) => (
            <div data-words="data">
              <Race race={race} />
            </div>
          )}
        </DataRegion>
      </section>

      <section aria-labelledby="install" className="mt-section grid gap-10 md:grid-cols-2">
        <div className="min-w-0">
          <h2 id="install" className="text-xl font-semibold tracking-tight">Install</h2>
          <div className="mt-4">
            <CopyCommand command={site.install} />
          </div>
        </div>
        <div className="min-w-0">
          <h2 className="text-xl font-semibold tracking-tight">Search</h2>
          <pre className="mt-4 overflow-x-auto rounded-md border border-line bg-surface-1 p-4 font-mono text-sm leading-normal text-fg">
            <code>{EXAMPLE}</code>
          </pre>
        </div>
      </section>

      <nav aria-label="Next steps" className="mt-12 flex flex-wrap gap-3">
        <Link href="/docs" className="rounded-md bg-accent px-4 py-2.5 font-medium text-on-accent transition-colors duration-[var(--motion-fast)] ease-standard hover:bg-accent-strong">
          Read the docs
        </Link>
        <Link href="/benchmarks" className="rounded-md border border-line-strong px-4 py-2.5 font-medium text-fg transition-colors duration-[var(--motion-fast)] ease-standard hover:bg-surface-2">
          See the benchmarks
        </Link>
      </nav>
    </div>
  );
}
