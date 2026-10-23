import { useEffect, useRef, useState } from "react";
import { createSearch, type SearchProvider, type SearchResponse } from "@belweave/search-sdk";
import { createMockProvider } from "@belweave/search-sdk/testing";
import { DitherAttemptBars, DitherButtonInk, DitherProgress, useSiteMotionPaused, setSiteMotionPaused } from "../components/DitherKit";
import { AuroraSignal } from "../components/AuroraSignal.js";
import { HomeDitherCorner, HomeDitherSeam, HomeDitherTrace, HomeDitherWaiting } from "../components/HomeDither.js";
import { usePrefersReducedMotion } from "../lib/dither/motion.js";
import { providers, alphaProviders } from "../provider-catalog.js";
import { providerBrandAssets } from "../brand-assets.js";
import { sdks, sdkHref } from "../sdk-catalog.js";
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
  const [sdkId, setSdkId] = useState("typescript");
  const sdk = sdks.find(item => item.id === sdkId)!;
  const snippet = sdkId === "typescript" ? example : sdk.example;
  const [interactive, setInteractive] = useState(false);
  const [response, setResponse] = useState<SearchResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState("query");
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
    setResponse(null);
    setStage("query");
    setNotice("");
    try {
      const track = (provider: SearchProvider, part: string): SearchProvider => ({ ...provider, search: (request, options) => { if (!abort.signal.aborted) setStage(part); return provider.search(request, options); } });
      const client = createSearch({
        provider: track(createMockProvider({ id: "demo-primary", outcomes: [{ type: "error", code: "rate_limit", status: 429, delayMs: 250 }] }), "primary"),
        fallback: [track(createMockProvider({ id: "demo-backup", outcomes: [{ type: "success", delayMs: 200, results: [{ title: "SQLite: Write-Ahead Logging", url: "https://www.sqlite.org/wal.html", snippet: "WAL allows readers and a writer to proceed concurrently." }] }] }), "fallback")],
      });
      const result = await client.web.search({ query: "SQLite write concurrency", limit: 3 }, { signal: abort.signal });
      if (!abort.signal.aborted) { setResponse(result); setStage("source"); }
    } catch {
      if (!abort.signal.aborted) setNotice("The demo could not run. Please try again.");
    } finally {
      controller.current = null;
      if (!abort.signal.aborted) setBusy(false);
    }
  }
  async function copy() {
    try { await navigator.clipboard.writeText(snippet); setNotice("Example copied."); }
    catch { setNotice("Clipboard unavailable. Select the example code to copy it."); }
  }
  return <div className="landing-example">
    <HomeDitherTrace busy={busy} complete={response !== null} stage={stage} />
    <div className="landing-code">
      <div className="landing-panel-bar"><label className="landing-sdk-select">SDK<select aria-label="Example SDK" value={sdkId} disabled={!interactive} onChange={event => { setSdkId(event.target.value); setNotice(""); }}>{sdks.map(item => <option key={item.id} value={item.id}>{item.id === "typescript" ? "TypeScript / JS" : item.name}</option>)}</select></label><button onClick={copy} disabled={!interactive}>Copy code</button></div>
      <pre tabIndex={0} aria-label={`${sdk.name} search example`}><code>{snippet.split("\n").map((line, i) => <span className={`landing-code-line${line.startsWith("import") ? " landing-code-import" : line.includes("query:") ? " landing-code-query" : ""}`} key={i}>{line || " "}</span>)}</code></pre>
      <p className="landing-code-note">{sdk.target === "app" ? "Calls your application gateway. Provider keys stay on your server." : "Server-side example. Supply your own provider credentials."} <a href={sdkHref(sdkId)}>Install {sdk.name}</a></p>
    </div>
    <div className="landing-result">
      <div className="landing-panel-bar"><span>TypeScript fixture · no key</span><button onClick={run} disabled={!interactive || busy}>{busy ? "Searching…" : response ? "Run again" : "Run demo"}<span aria-hidden="true"> ↗</span></button></div>
      <div className={`landing-result-body${response ? " dither-completion" : ""}`} aria-live="polite" aria-busy={busy}>
        {busy && <DitherProgress label="Running deterministic fallback demo" />}
        {response ? <>
          <p className="landing-result-heading">A source, with the full trail.</p>
          <ol className="landing-attempts" aria-label="Search attempts">{response.attempts.map(attempt => <li key={attempt.provider}><span>{attempt.provider}</span><span>{attempt.outcome === "success" ? "Success" : "Rate limited"}</span></li>)}</ol>
          <DitherAttemptBars attempts={response.attempts} label="This fixture run · measured durations" />
          <a className="landing-source" href={response.results[0].url} target="_blank" rel="noreferrer"><span className="landing-source-domain">sqlite.org</span><strong>{response.results[0].title} <span aria-hidden="true">↗</span></strong></a>
          <p>{response.results[0].snippet}</p>
          <code className="landing-result-meta">provider: '{response.provider}'<br />warnings: {JSON.stringify(response.warnings.map(warning => warning.code))}</code>
        </> : <>
          <HomeDitherWaiting />
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
  const still = useSiteMotionPaused();
  const [artMenu, setArtMenu] = useState<{ x: number; y: number } | null>(null);
  const art = useRef<HTMLDivElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const menuItem = useRef<HTMLButtonElement>(null);
  const reducedMotion = usePrefersReducedMotion();
  function dismissArtMenu(restoreFocus = true) {
    setArtMenu(null);
    if (restoreFocus) art.current?.focus({ preventScroll: true });
  }
  function openArtMenu(x: number, y: number) {
    setArtMenu({ x: Math.max(8, Math.min(x, window.innerWidth - 248)), y: Math.max(8, Math.min(y, window.innerHeight - 72)) });
  }
  useEffect(() => {
    if (!artMenu) return;
    menuItem.current?.focus();
    function outside(event: PointerEvent) {
      if (!menu.current?.contains(event.target as Node)) setArtMenu(null);
    }
    function escape(event: KeyboardEvent) {
      if (event.key === "Escape") { event.preventDefault(); setArtMenu(null); art.current?.focus({ preventScroll: true }); }
    }
    function dismiss() { setArtMenu(null); }
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    window.addEventListener("resize", dismiss);
    window.addEventListener("scroll", dismiss, true);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
      window.removeEventListener("resize", dismiss);
      window.removeEventListener("scroll", dismiss, true);
    };
  }, [artMenu]);
  return <div className="landing-page">
    <section className="landing-hero" aria-labelledby="landing-title">
      <div className="landing-intro">
        <h1 id="landing-title">Search anywhere.<br />In your language.</h1>
        <p>Pick your SDK. Choose your provider.<br className="landing-desktop-break" /> Keep the sources and every attempt.</p>
        <div className="landing-actions"><a className="landing-primary" href="/docs/sdks"><DitherButtonInk /><span>Choose your SDK</span><span aria-hidden="true">↗</span></a><a className="landing-secondary-action" href="/playground">Open playground <span aria-hidden="true">→</span></a></div>
      </div>
      <div ref={art} className="landing-art" tabIndex={0} role="group" aria-label="Search illustration" aria-haspopup="menu" aria-expanded={artMenu !== null} aria-controls={artMenu ? "landing-art-menu" : undefined}
        onClick={event => { const rect = event.currentTarget.getBoundingClientRect(); openArtMenu(rect.left + rect.width / 2, rect.top + rect.height / 2); }}
        onContextMenu={event => { event.preventDefault(); const rect = event.currentTarget.getBoundingClientRect(); openArtMenu(event.clientX || rect.left + rect.width / 2, event.clientY || rect.top + rect.height / 2); }}
        onKeyDown={event => { if (event.key === "Enter" || event.key === " " || event.key === "ContextMenu" || (event.shiftKey && event.key === "F10")) { event.preventDefault(); const rect = event.currentTarget.getBoundingClientRect(); openArtMenu(rect.left + rect.width / 2, rect.top + rect.height / 2); } }}>
        <AuroraSignal animate={!still} cell={2} /><span className="landing-art-hint">Click or press Enter for motion controls</span>
      </div>
      {artMenu && <div ref={menu} id="landing-art-menu" className="landing-art-menu" role="menu" aria-label="Illustration animation" style={{ left: artMenu.x, top: artMenu.y }}
        onKeyDown={event => { if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) { event.preventDefault(); menuItem.current?.focus(); } if (event.key === "Tab") { event.preventDefault(); dismissArtMenu(); } }}>
        <button ref={menuItem} role="menuitem" aria-disabled={reducedMotion} onClick={() => { if (!reducedMotion) setSiteMotionPaused(!still); dismissArtMenu(); }}>{reducedMotion ? "Reduced motion enabled" : still ? "Resume animation" : "Pause animation"}</button>
      </div>}
    </section>
    <HomeDitherSeam />
    <section className="landing-sdks" aria-labelledby="landing-sdks-title">
      <div className="landing-section-heading"><div><h2 id="landing-sdks-title">From your server<br />to their screen.</h2><p>Twelve SDKs. One shared search contract.<br className="landing-desktop-break" /> Alpha packages, available from source.</p></div><a href="/docs/sdks">Compare support</a></div>
      <div className="landing-sdk-groups">{(["server", "app"] as const).map(target => <div className={`landing-sdk-group landing-sdk-group-${target}`} key={target}>
        <h3>{target === "server" ? "On your server" : "In your app"}</h3>
        <p>{target === "server" ? "Normalized search and provider-native APIs." : "Your HTTPS gateway. Your provider keys stay server-side."}</p>
        <ul>{sdks.filter(sdk => sdk.target === target).map(sdk => <li key={sdk.id}><a href={sdkHref(sdk.id)}>{sdk.name}<svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M3 8h9M8 3l5 5-5 5" /></svg></a></li>)}</ul>
      </div>)}</div>
    </section>
    <HomeDitherSeam reverse />
    <section className="landing-build" aria-labelledby="landing-example-title">
      <div className="landing-section-heading"><div><h2 id="landing-example-title">Your language.<br />The same source trail.</h2><p>Choose a starter for your SDK.<br className="landing-desktop-break" /> Run the TypeScript fixture to see explicit fallback.</p></div><a href="/docs/reliability/fallback">How fallback works <span aria-hidden="true">↗</span></a></div>
      <SearchExample />
    </section>
    <HomeDitherSeam reverse />
    <section className="landing-providers" aria-labelledby="landing-providers-title">
      <div className="landing-section-heading"><div><h2 id="landing-providers-title">Your sources. Your choice.</h2><p>{alphaProviders.length} web-search adapters, plus provider-native APIs.<br className="landing-desktop-break" /> WonderSearch connects your own document corpus.</p></div><a href="/providers">Compare providers <span aria-hidden="true">↗</span></a></div>
      <div className="landing-provider-list">{providers.map(provider => {
        const brand = providerBrandAssets[provider.id];
        return <a className={`landing-provider${provider.priority ? " landing-provider-priority" : ""}${provider.corpus ? " landing-provider-corpus" : ""}`} href={`/docs/providers/${provider.id}`} key={provider.id}>
          <HomeDitherCorner />
          {brand && <span className={`landing-provider-logo${brand.plate ? " landing-provider-logo-plate" : ""}`} aria-hidden="true"><img className={brand.darkSrc ? "landing-logo-light" : undefined} src={brand.src} width={brand.width} height={brand.height} alt="" loading="lazy" />{brand.darkSrc && <img className="landing-logo-dark" src={brand.darkSrc} width={brand.width} height={brand.height} alt="" loading="lazy" />}</span>}
          <span className="landing-provider-copy"><span className="landing-provider-name">{provider.name}</span>{(provider.priority || provider.corpus) && <span className="landing-provider-kind">{provider.priority ? "Start here" : "Document corpus"}</span>}</span><span className="landing-provider-arrow" aria-hidden="true">↗</span>
        </a>;
      })}</div>
    </section>
  </div>;
}
