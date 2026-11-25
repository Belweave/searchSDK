import { readFileSync } from "node:fs";
import path from "node:path";
import Link from "next/link";
import type { ReactNode } from "react";
import { DataRegion } from "@/components/data/data-region";
import { Reveal } from "@/components/motion/reveal";
import { getLeaderboard } from "@/lib/benchmarks";
import { allBrands, type ProviderBrand, providerBrand } from "@/lib/provider-assets";
import { conformanceCases, getRegistry, type Provider } from "@/lib/registry";
import { Board } from "./board";
import { Receipt, type ReceiptLine } from "./receipt";
import { SpecFeed, type FeedProvider } from "./spec-feed";
import { ProviderSwitch } from "./switch";

/**
 * The instruments below the stage. Each is a heading, at most one line, and something to touch.
 * Everything shown comes from the registry, except the leaderboard, which is a labelled placeholder
 * (the same for every provider until results are published), and the receipt, which uses example
 * providers so that no real provider is shown failing.
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

/** A stand-in provider for the receipt: a neutral monogram, no real name, logo or hue. */
function exampleProvider(letter: string): ProviderBrand {
  return { id: `example-${letter.toLowerCase()}`, name: `Provider ${letter}`, hue: "var(--fg-subtle)", mark: null, logo: null, monogram: letter };
}

/**
 * The receipt illustrates the billing policy, not an event: a short agent session with example
 * providers and one placeholder price. Provider B's attempt fails (the visitor picks how) and
 * Provider C takes over; Provider D has no public price. No real provider is shown failing.
 */
function receiptLines(): ReceiptLine[] {
  const PRICE_USD = 0.005;
  const plan: { letter: string; call: "search" | "contents"; role?: ReceiptLine["role"]; usd: number | null }[] = [
    { letter: "A", call: "search", usd: PRICE_USD },
    { letter: "B", call: "search", role: "failing", usd: PRICE_USD },
    { letter: "C", call: "search", role: "fallback", usd: PRICE_USD },
    { letter: "D", call: "search", usd: null },
    { letter: "A", call: "contents", usd: PRICE_USD },
  ];
  return plan.map((step) => ({
    key: `${step.letter}-${step.call}`,
    brand: exampleProvider(step.letter),
    call: step.call,
    source: step.usd === null ? "unknown" : "computed",
    usd: step.usd,
    role: step.role,
  }));
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
      <Section id="switch" layout="wide" title="Change one word" line="Same call, same result shape. Only the request on the wire changes.">
        <ProviderSwitch providers={searchers.map((p) => ({ brand: providerBrand(p.id), wire: p.search!.wire }))} template={template} query={query} maxResults={10} />
      </Section>

      <Section
        id="ranked"
        layout="wide"
        title="Quality first, then reliability"
        line={
          <>
            Results pending. The first benchmark run is in progress; every provider shows the same placeholder until it is published.
            Then scores within {board.data.method.tieBand} points share a rank; latency and cost are shown, never scored.{" "}
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

      <Section id="cost" title="Every attempt has a price" line="An attempt that may have been billed is counted. An unknown price stays unknown.">
        <Receipt lines={receipt} note="example providers, placeholder price" />
      </Section>

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
                {["git clone https://github.com/Belweave/searchSDK", "(cd searchSDK/sdk/typescript && npm ci && npm pack --ignore-scripts=false)", "cd your-app && npm install ../searchSDK/sdk/typescript/searchsdk-0.1.0.tgz"].map((l) => (
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
