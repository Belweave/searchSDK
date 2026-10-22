import { useEffect, useRef, useState } from "react";
import { createSearch, type SearchResponse } from "@belweave/search-sdk";
import { createMockProvider } from "@belweave/search-sdk/testing";
import { AuroraSignal } from "../components/AuroraSignal.js";
import { usePrefersReducedMotion } from "../lib/dither/motion.js";
import { providers, alphaProviders } from "../provider-catalog.js";
import { providerBrandAssets } from "../brand-assets.js";
import "./home.css";

const example = `import { createSearch } from '@belweave/search-sdk';
import { context } from '@belweave/search-sdk/context';
import { tinyfish } from '@belweave/search-sdk/tinyfish';

const { web } = createSearch({
  provider: context({ apiKey: process.env.CONTEXT_API_KEY! }),
  fallback: [tinyfish({ apiKey: process.env.TINYFISH_API_KEY! })],
  timeoutMs: 10_000,
  attemptTimeoutMs: 4_000,
});

const response = await web.search({
  query: 'SQLite write concurrency',
  limit: 3,
});`;

function SearchExample() {
  const [interactive, setInteractive] = useState(false);
  const [response, setResponse] = useState<SearchResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const controller = useRef<AbortController | null>(null);
  useEffect(() => {
    setInteractive(true);
    return () => controller.current?.abort();
  }, []);
  async function run() {
    if (controller.current) return;
    const abort = new AbortController();
    controller.current = abort;
    setBusy(true);
    setNotice("");
    try {
      const client = createSearch({
        provider: createMockProvider({ id: "demo-primary", outcomes: [{ type: "error", code: "rate_limit", status: 429, delayMs: 250 }] }),
        fallback: [createMockProvider({ id: "demo-backup", outcomes: [{ type: "success", delayMs: 200, results: [{ title: "SQLite: Write-Ahead Logging", url: "https://www.sqlite.org/wal.html", snippet: "WAL allows readers and a writer to proceed concurrently." }] }] })],
      });
      const result = await client.web.search({ query: "SQLite write concurrency", limit: 3 }, { signal: abort.signal });
      if (!abort.signal.aborted) setResponse(result);
    } catch {
      if (!abort.signal.aborted) setNotice("The demo could not run. Please try again.");
    } finally {
      controller.current = null;
      if (!abort.signal.aborted) setBusy(false);
    }
  }
  async function copy() {
    try { await navigator.clipboard.writeText(example); setNotice("Example copied."); }
    catch { setNotice("Clipboard unavailable. Select the example code to copy it."); }
  }
  return <div className="landing-example">
    <div className="landing-code">
      <div className="landing-panel-bar"><span>search.ts <span className="landing-secondary">/ Example</span></span><button onClick={copy} disabled={!interactive}>Copy code</button></div>
      <pre tabIndex={0} aria-label="TypeScript search example"><code>{example.split("\n").map((line, i) => <span className={`landing-code-line${line.startsWith("import") ? " landing-code-import" : line.includes("query:") ? " landing-code-query" : ""}`} key={i}>{line || " "}</span>)}</code></pre>
    </div>
    <div className="landing-result">
      <div className="landing-panel-bar"><span>Demo data</span><button onClick={run} disabled={!interactive || busy}>{busy ? "Searching…" : response ? "Run again" : "Run demo"}<span aria-hidden="true"> ↗</span></button></div>
      <div className="landing-result-body" aria-live="polite" aria-busy={busy}>
        {response ? <>
          <p className="landing-result-heading">A source, with the full trail.</p>
          <ol className="landing-attempts" aria-label="Search attempts">{response.attempts.map(attempt => <li key={attempt.provider}><span>{attempt.provider}</span><span>{attempt.outcome === "success" ? "Success" : "Rate limited"}</span></li>)}</ol>
          <a className="landing-source" href={response.results[0].url} target="_blank" rel="noreferrer"><span className="landing-source-domain">sqlite.org</span><strong>{response.results[0].title} <span aria-hidden="true">↗</span></strong></a>
          <p>{response.results[0].snippet}</p>
          <code className="landing-result-meta">provider: '{response.provider}'<br />warnings: {JSON.stringify(response.warnings.map(warning => warning.code))}</code>
        </> : <>
          <div className="landing-empty-trail" aria-hidden="true"><span /><span /><span /></div>
          <p className="landing-result-heading">See what happens<br />when a provider says no.</p>
          <p>Run the SDK with mock providers. The first returns a rate limit; the fallback returns a source.</p>
          <button className="landing-inline-action" onClick={run} disabled={!interactive || busy}>Try the fallback <span aria-hidden="true">→</span></button>
        </>}
      </div>
    </div>
    <p className="landing-notice" role="status">{notice}</p>
    <noscript><p className="landing-noscript">Enable JavaScript to run the demo. The example and documentation are available without it.</p></noscript>
  </div>;
}

export function Home() {
  const [interactive, setInteractive] = useState(false);
  const [still, setStill] = useState(false);
  const reducedMotion = usePrefersReducedMotion();
  useEffect(() => setInteractive(true), []);
  return <div className="landing-page">
    <section className="landing-hero" aria-labelledby="landing-title">
      <div className="landing-intro">
        <h1 id="landing-title">Web search for<br />TypeScript apps.</h1>
        <p>Choose your sources. Set your fallback.<br className="landing-desktop-break" /> Get typed results and a record of every attempt.</p>
        <div className="landing-actions"><a className="landing-primary" href="/docs">Read the docs <span aria-hidden="true">↗</span></a><a className="landing-secondary-action" href="/playground">Open playground <span aria-hidden="true">→</span></a></div>
      </div>
      <div className="landing-art"><AuroraSignal animate={!still} cell={2.5} /></div>
      <div className="landing-art-controls"><button onClick={() => setStill(!still)} disabled={!interactive || reducedMotion} aria-pressed={still || reducedMotion} aria-label={reducedMotion ? "Artwork motion follows your reduced motion setting" : still ? "Resume artwork motion" : "Pause artwork motion"}><span aria-hidden="true">{still && !reducedMotion ? "▶" : "Ⅱ"}</span> {reducedMotion ? "Reduced motion" : still ? "Resume motion" : "Pause motion"}</button></div>
    </section>
    <section className="landing-build" aria-labelledby="landing-example-title">
      <div className="landing-section-heading"><div><h2 id="landing-example-title">One query.<br />Every attempt accounted for.</h2><p>Start with Context.dev. Fall back to TinyFish.<br className="landing-desktop-break" /> Keep the source and the path it took to reach you.</p></div><a href="/docs/reliability/fallback">How fallback works <span aria-hidden="true">↗</span></a></div>
      <SearchExample />
    </section>
    <section className="landing-providers" aria-labelledby="landing-providers-title">
      <div className="landing-section-heading"><div><h2 id="landing-providers-title">Your sources. Your choice.</h2><p>{alphaProviders.length} web-search adapters, plus provider-native APIs.<br className="landing-desktop-break" /> WonderSearch connects your own document corpus.</p></div><a href="/providers">Compare providers <span aria-hidden="true">↗</span></a></div>
      <div className="landing-provider-list">{providers.map(provider => {
        const brand = providerBrandAssets[provider.id];
        return <a className={`landing-provider${provider.priority ? " landing-provider-priority" : ""}${provider.corpus ? " landing-provider-corpus" : ""}`} href={`/docs/providers/${provider.id}`} key={provider.id}>
          {brand && <span className={`landing-provider-logo${brand.plate ? " landing-provider-logo-plate" : ""}`} aria-hidden="true"><img className={brand.darkSrc ? "landing-logo-light" : undefined} src={brand.src} width={brand.width} height={brand.height} alt="" loading="lazy" />{brand.darkSrc && <img className="landing-logo-dark" src={brand.darkSrc} width={brand.width} height={brand.height} alt="" loading="lazy" />}</span>}
          <span className="landing-provider-copy"><span className="landing-provider-name">{provider.name}</span>{(provider.priority || provider.corpus) && <span className="landing-provider-kind">{provider.priority ? "Start here" : "Document corpus"}</span>}</span><span className="landing-provider-arrow" aria-hidden="true">↗</span>
        </a>;
      })}</div>
    </section>
  </div>;
}
