import { readFileSync } from "node:fs";
import path from "node:path";
import Link from "next/link";
import type { ReactNode } from "react";
import { DataRegion } from "@/components/data/data-region";
import { Reveal } from "@/components/motion/reveal";
import { getLeaderboard } from "@/lib/benchmarks";
import { allBrands, providerBrand } from "@/lib/provider-assets";
import { conformanceCases, getRegistry, listPriceUsd, type Provider } from "@/lib/registry";
import { Board } from "./board";
import { Receipt, type ReceiptLine } from "./receipt";
import { SpecFeed, type FeedProvider } from "./spec-feed";
import { ProviderSwitch } from "./switch";

/**
 * The instruments below the stage. Each is a heading, at most one line, and something to touch.
 * Everything shown comes from the registry, except the leaderboard, which is labelled sample data.
 */

function Section({ id, title, line, children, layout = "split" }: { id: string; title: string; line: ReactNode; children: ReactNode; layout?: "split" | "wide" }) {
  return (
    <section aria-labelledby={id} className={`home-section home-${layout}`}>
      <div className="page-wrap home-section-grid">
        <Reveal className="home-copy">
          <h2 id={id} className="type-h2 home-h2">
            {title}
          </h2>
          <p className="home-line">{line}</p>
        </Reveal>
        <Reveal className="home-instrument" index={1}>
          {children}
        </Reveal>
      </div>
    </section>
  );
}

function example(file: string): string {
  return readFileSync(path.join(process.cwd(), "content", "examples", file), "utf8").trimEnd();
}

/** The home example with its provider marked, and the query it searches. */
function switchTemplate(): { template: string; query: string } {
  const source = example("home.ts");
  const template = source.replace(/provider: "[a-z0-9-]+"/, "provider: %%PROVIDER%%");
  const query = source.match(/search\("([^"]+)"/)?.[1];
  if (!template.includes("%%PROVIDER%%") || !query) throw new Error("content/examples/home.ts must call search(\"…\", { provider: \"…\" }).");
  return { template, query };
}

function excerpt(p: Provider): unknown {
  const s = p.search!;
  const w = s.wire;
  const pick = (o: Record<string, string>, keys: string[]) => Object.fromEntries(keys.filter((k) => o[k]).map((k) => [k, { to: o[k] }]));
  return {
    id: p.id,
    search: {
      request: { method: w.method, url: w.url, params: pick(w.params, ["query", "maxResults"]) },
      response: { results: w.list, fields: Object.fromEntries(["url", "title", "excerpts"].filter((f) => w.fields[f]).map((f) => [f, w.fields[f]])) },
      ...(w.cost ? { cost: { reported: { path: w.cost.path, unit: w.cost.unit } } } : {}),
    },
  };
}

function receiptLines(): { lines: ReceiptLine[]; retrievedOn: string } | null {
  const reg = getRegistry();
  const get = (id: string) => reg.providers.find((p) => p.id === id);
  // A short agent session: Exa searches; Perplexity's attempt fails and Brave Search takes over;
  // TinyFish searches; Tavily extracts one page. Every figure is that provider's list price.
  const plan: { id: string; call: "search" | "contents"; role?: ReceiptLine["role"] }[] = [
    { id: "exa", call: "search" },
    { id: "perplexity", call: "search", role: "failing" },
    { id: "brave", call: "search", role: "fallback" },
    { id: "tinyfish", call: "search" },
    { id: "tavily", call: "contents" },
  ];
  const lines: ReceiptLine[] = [];
  const dates: string[] = [];
  for (const step of plan) {
    const ep = get(step.id)?.[step.call];
    if (!ep) return null; // a provider left the registry: drop the section rather than invent a line
    const usd = listPriceUsd(ep.price, step.call === "search" ? 10 : 1);
    dates.push(ep.pricing.retrievedOn);
    lines.push({
      key: `${step.id}-${step.call}`,
      brand: providerBrand(step.id),
      call: step.call,
      source: usd === null ? "unknown" : ep.cost.source === "reported" || ep.cost.source === "reported-credits" ? ep.cost.source : ep.cost.source === "unknown" ? "unknown" : "computed",
      usd,
      role: step.role,
    });
  }
  return { lines, retrievedOn: dates.sort()[0] ?? "" };
}

export function HomeSections() {
  const reg = getRegistry();
  const searchers = reg.providers.filter((p) => p.search);
  const { template, query } = switchTemplate();
  const board = getLeaderboard();
  const brands = Object.fromEntries(allBrands().map((b) => [b.id, b]));
  const receipt = receiptLines();
  const feed: FeedProvider[] = searchers.map((p) => ({
    brand: providerBrand(p.id),
    excerpt: excerpt(p),
    cases: conformanceCases(p.id),
    options: p.search!.options.filter((o) => o.value === "Yes").length,
    fields: p.search!.fields.filter((o) => o.value === "Yes").length,
    hasContents: p.contents !== null,
  }));

  return (
    <>
      <Section id="switch" title="Change one word" line="Same call, same result shape. Only the request on the wire changes.">
        <ProviderSwitch providers={searchers.map((p) => ({ brand: providerBrand(p.id), wire: p.search!.wire }))} template={template} query={query} maxResults={10} />
      </Section>

      <Section
        id="ranked"
        layout="wide"
        title="Ranked by quality, then reliability"
        line={
          <>
            Scores within {board.data.method.tieBand} points share a rank. Latency and cost are shown, never scored.{" "}
            <Link href="/docs/benchmarks-method" className="prose-link">
              Method
            </Link>
          </>
        }
      >
        <DataRegion dataset={board} placeLabel>
          {(data, label) => <Board board={data} brands={brands} sampleTag={label} />}
        </DataRegion>
      </Section>

      {receipt ? (
        <Section id="cost" title="Every attempt has a price" line="An attempt that may have been billed is counted. An unknown price stays unknown.">
          <Receipt lines={receipt.lines} retrievedOn={receipt.retrievedOn} />
        </Section>
      ) : null}

      <Section
        id="registry"
        layout="wide"
        title="One file per provider"
        line="A registry spec drives the TypeScript and Python runtimes, their shared tests, the benchmark and these pages. Both runtimes pass the same vectors. Neither is published or verified against live APIs yet."
      >
        <SpecFeed providers={feed} />
      </Section>

      <section aria-labelledby="start" className="home-section home-start">
        <div className="page-wrap home-section-grid">
          <Reveal className="home-copy">
            <h2 id="start" className="type-h2 home-h2">
              Build it today
            </h2>
            <p className="home-line">
              <code className="figures">searchsdk</code> is not on npm yet. Pack it from the repository:
            </p>
          </Reveal>
          <Reveal className="home-instrument" index={1}>
            <pre className="home-shell">
              <code>
                {["git clone https://github.com/Belweave/searchSDK", "cd searchSDK/sdk/typescript && npm ci && npm pack --ignore-scripts=false", "cd your-app && npm install ../searchSDK/sdk/typescript/searchsdk-0.0.0.tgz"].map((l) => (
                  <span key={l} className="code-line">
                    <span className="home-prompt" aria-hidden="true">
                      ${" "}
                    </span>
                    {l}
                    {"\n"}
                  </span>
                ))}
              </code>
            </pre>
            <nav aria-label="Next steps" className="home-keys">
              <Link href="/docs" className="key key-beam">
                <span className="key-face">Read the docs</span>
              </Link>
              <Link href="/benchmarks" className="key">
                <span className="key-face">See the benchmarks</span>
              </Link>
              <Link href="/providers" className="key">
                <span className="key-face">Browse providers</span>
              </Link>
            </nav>
          </Reveal>
        </div>
      </section>
    </>
  );
}
