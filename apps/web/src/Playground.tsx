import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import type { SearchAttempt, SearchResponse } from "@belweave/search-sdk";
import { DitherAttemptBars, DitherButtonInk, DitherEmpty, DitherProgress } from "./components/DitherKit";
import { FixturePlayground } from "./FixturePlayground";
import { providers } from "./provider-catalog";
import { PlaygroundDither, PlaygroundDitherBand } from "./components/PlaygroundDither";
import { ditherMaskStyle } from "./lib/dither/pattern";
import "./playground.css";

const liveProviders = providers.filter(p => p.status === "alpha" && p.id !== "searxng" && p.id !== "serpapi");
const factories: Record<string, string> = { context: "context", tinyfish: "tinyfish", exa: "exa", tavily: "tavily", brave: "brave", perplexity: "perplexity", parallel: "parallel", linkup: "linkup", firecrawl: "firecrawl", you: "you", serper: "serper", serpapi: "serpapi", valyu: "valyu" };
type Failure = { code: string; message: string; attempts: readonly SearchAttempt[] };
type Result = { ok: true; response: SearchResponse } | { ok: false; error: Failure };
const errorHelp: Record<string, string> = {
  auth: "The provider rejected this key or account. Check its permissions, billing, and available credits, then enter a valid key. Authentication errors do not call the backup.",
  rate_limit: "The request was rate limited. Wait before trying again, or configure a different backup provider.",
  timeout: "The search reached its time limit. Try a more specific query or another provider.",
  attempt_timeout: "The provider did not respond within its attempt budget. Try again later or add a backup.",
  network: "The provider could not be reached. Try again later or choose another provider.",
  unavailable: "The service is temporarily unavailable. Wait a moment before trying again.",
  invalid_request: "The request could not be accepted. Check the query, provider, and key, then try again.",
  invalid_response: "The provider returned a response that could not be safely displayed. Try another provider.",
  forbidden: "This request could not be verified. Reload this page and try again.",
  aborted: "The browser stopped waiting for this search. A request already received by a provider may still be billed.",
};
function safeUrl(value: string) { try { const u = new URL(value); return /^https?:$/.test(u.protocol) && !u.username && !u.password ? u : null; } catch { return null; } }
function name(id: string) { return liveProviders.find(p => p.id === id)?.name ?? id; }
function Select({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <span className="search-demo-select"><select {...props}>{children}</select><svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="m4 6 4 4 4-4" /></svg></span>;
}
function snippet(provider: string, backup: string, query: string, limit: number) {
  const chosen = [provider, ...(backup ? [backup] : [])];
  return `import { createSearch } from '@belweave/search-sdk';\n${chosen.map(p => `import { ${factories[p]} } from '@belweave/search-sdk/${p}';`).join("\n")}\n\n// Run on your server. Set keys in its environment.\nconst search = createSearch({\n  provider: ${factories[provider]}({ apiKey: process.env.${provider.toUpperCase()}_API_KEY! }),${backup ? `\n  fallback: [${factories[backup]}({ apiKey: process.env.${backup.toUpperCase()}_API_KEY! })],` : ""}\n  timeoutMs: 15_000,\n  attemptTimeoutMs: 7_000,\n});\n\nconst response = await search.web.search({\n  query: ${JSON.stringify(query)},\n  limit: ${limit},\n});\nconsole.log(response.results);\nconsole.log(response.attempts);`;
}

export function Playground() {
  const [mode, setMode] = useState<"live" | "demo">("live");
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  return <>
    <div className="play-mode-bar"><div className="play-mode-switch" role="group" aria-label="Playground mode">
      <button type="button" aria-pressed={mode === "live"} disabled={!mounted} onClick={() => setMode("live")}>Live search</button>
      <button type="button" aria-pressed={mode === "demo"} disabled={!mounted} onClick={() => setMode("demo")}>Demo · no key</button>
    </div><span>{mode === "live" ? "Your keys. Real provider requests." : "Fixed example data. No provider requests."}</span></div>
    {mode === "live" ? <LivePlayground /> : <FixturePlayground />}
    <nav className="play-next" aria-label="Next steps"><PlaygroundDitherBand /><a href="/docs/quickstart">Build with the SDK <span aria-hidden="true">→</span></a><a href="/docs/guides/boat">Run in your Boat sandbox <span aria-hidden="true">→</span></a><a href="/docs/reliability/fallback">Understand fallback <span aria-hidden="true">→</span></a></nav>
  </>;
}
function LivePlayground() {
  const id = useId();
  const [ready, setReady] = useState(false);
  const [provider, setProvider] = useState("context");
  const [backup, setBackup] = useState("");
  const [query, setQuery] = useState("SQLite write concurrency");
  const [limit, setLimit] = useState(5);
  const [busy, setBusy] = useState(false);
  const [response, setResponse] = useState<SearchResponse | null>(null);
  const [failure, setFailure] = useState<Failure | null>(null);
  const [view, setView] = useState<"sources" | "json" | "code">("sources");
  const [copyStatus, setCopyStatus] = useState("");
  const [credentialNote, setCredentialNote] = useState("");
  const [lastQuery, setLastQuery] = useState("");
  const key = useRef<HTMLInputElement>(null);
  const backupKey = useRef<HTMLInputElement>(null);
  const controller = useRef<AbortController | null>(null);
  const cancelButton = useRef<HTMLButtonElement>(null);
  const runButton = useRef<HTMLButtonElement>(null);
  const returnFocus = useRef(false);
  const clearKeys = () => { if (key.current) key.current.value = ""; if (backupKey.current) backupKey.current.value = ""; };
  useEffect(() => { setReady(true); const clear = () => clearKeys(); window.addEventListener("pagehide", clear); return () => { controller.current?.abort(); clearKeys(); window.removeEventListener("pagehide", clear); }; }, []);
  useEffect(() => { if (!busy && returnFocus.current) { returnFocus.current = false; runButton.current?.focus({ preventScroll: true }); } }, [busy]);
  const selected = liveProviders.find(p => p.id === provider)!;
  const attempts = response?.attempts ?? failure?.attempts ?? [];
  const code = snippet(provider, backup, query, limit);
  const completed = !busy && (response || failure);
  async function run(event: FormEvent) {
    event.preventDefault();
    if (!ready || controller.current || !query.trim()) return;
    const primaryKey = key.current?.value.trim() ?? "";
    const secondaryKey = backupKey.current?.value.trim() ?? "";
    if (!primaryKey) { key.current?.focus(); return; }
    if (backup && !secondaryKey) { backupKey.current?.focus(); return; }
    const abort = new AbortController(); controller.current = abort;
    const timer = window.setTimeout(() => abort.abort("timeout"), 20_000);
    setBusy(true); setResponse(null); setFailure(null); setView("sources"); setLastQuery(query.trim()); setCopyStatus("");
    setCredentialNote("Keys cleared from the form. Enter them again for your next search.");
    clearKeys();
    try {
      const result = await fetch("/api/playground/search", {
        method: "POST", credentials: "omit", cache: "no-store", redirect: "error",
        headers: { "Content-Type": "application/json", "x-searchsdk-playground": "1" },
        signal: abort.signal,
        body: JSON.stringify({ query: query.trim(), limit, provider, apiKey: primaryKey, ...(backup ? { fallback: { provider: backup, apiKey: secondaryKey } } : {}) }),
      });
      if (!result.headers.get("content-type")?.includes("application/json")) throw new Error("Invalid server response");
      const data = await result.json() as Result;
      if (data.ok && result.ok && Array.isArray(data.response?.results) && Array.isArray(data.response?.attempts)) setResponse(data.response);
      else if (!data.ok && data.error && typeof data.error.code === "string") setFailure({ code: data.error.code, message: "", attempts: Array.isArray(data.error.attempts) ? data.error.attempts : [] });
      else throw new Error("Invalid server response");
    } catch {
      setFailure({ code: abort.signal.aborted ? abort.signal.reason === "timeout" ? "timeout" : "aborted" : "unavailable", message: "", attempts: [] });
    } finally {
      window.clearTimeout(timer); returnFocus.current = document.activeElement === cancelButton.current;
      controller.current = null; setBusy(false);
    }
  }
  async function copy(text: string) { try { await navigator.clipboard.writeText(text); setCopyStatus("Copied."); } catch { setCopyStatus("Copy unavailable. Select the text below."); } }
  return <div className="play-live" data-running={busy || undefined}>
    <PlaygroundDitherBand className="play-dither-frame" />
    <div className="play-request">
      <div className="play-section-title"><h2>Your request</h2><span>Server-side search</span><PlaygroundDitherBand /></div>
      <form onSubmit={run} aria-label="Live search" autoComplete="off">
        <fieldset disabled={busy || !ready}>
          <div className="play-field"><label htmlFor={`${id}-provider`}>Provider</label><Select id={`${id}-provider`} value={provider} onChange={e => { setProvider(e.target.value); clearKeys(); setCredentialNote(""); if (backup === e.target.value) setBackup(""); }}>{liveProviders.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</Select></div>
          <div className="play-field"><div className="play-label-row"><label htmlFor={`${id}-key`}>{selected.name} API key</label><a href={`/docs/providers/${provider}`} target="_blank" rel="noreferrer">Provider guide <span aria-hidden="true">↗</span></a></div><input ref={key} id={`${id}-key`} type="password" required maxLength={512} placeholder="Paste your provider key" autoComplete="off" autoCapitalize="none" spellCheck={false} aria-describedby={`${id}-key-note`} onInput={() => setCredentialNote("")} /><p id={`${id}-key-note`} className="play-hint">Sent over HTTPS to our server and your selected provider. Cleared after each run.</p></div>
          <div className="play-field"><label htmlFor={`${id}-query`}>Search query</label><textarea id={`${id}-query`} rows={2} maxLength={500} required value={query} onChange={e => setQuery(e.target.value)} spellCheck={false} /><div className="play-query-actions"><button type="button" onClick={() => setQuery("Latest SQLite release notes")}>Try another query</button><span>{query.length}/500</span></div></div>

        </fieldset>
        <div className="play-submit"><button className="play-run" ref={runButton} disabled={!ready || busy} type="submit"><DitherButtonInk /><span>{busy ? "Searching…" : "Run live search"}</span><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" /></svg></button>{busy && <button type="button" className="play-clear" ref={cancelButton} onClick={() => controller.current?.abort()}>Cancel</button>}{!busy && <button type="button" className="play-clear" disabled={!ready} onClick={() => { clearKeys(); setCredentialNote("Keys cleared."); }}>Clear keys</button>}</div>
        <p className="play-charge">Uses your provider account and credits. No automatic retries. By running a search, you agree to our <a href="/terms">Terms</a>. See our <a href="/privacy">Privacy policy</a>.</p>
        <fieldset className="play-advanced" disabled={busy || !ready}><details className="play-options"><summary>Results &amp; fallback <span>{limit} sources{backup ? " · backup set" : ""}</span></summary><div className="play-settings"><div className="play-field"><label htmlFor={`${id}-limit`}>Result limit</label><Select id={`${id}-limit`} value={limit} onChange={e => setLimit(Number(e.target.value))}>{[3,5,10].map(n => <option key={n} value={n}>{n} sources</option>)}</Select></div><div className="play-budget"><span>Time limit</span><strong>15 seconds</strong></div></div>
          <div className="play-backup"><p className="play-hint">A backup is optional. It is only called after a retryable failure and may incur a separate provider charge.</p><div className="play-field"><label htmlFor={`${id}-backup`}>Backup provider</label><Select id={`${id}-backup`} value={backup} onChange={e => { setBackup(e.target.value); if (backupKey.current) backupKey.current.value = ""; }}><option value="">No fallback</option>{liveProviders.filter(p => p.id !== provider).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</Select></div>{backup && <div className="play-field"><label htmlFor={`${id}-backup-key`}>{name(backup)} API key</label><input ref={backupKey} onInvalid={e => { const details = e.currentTarget.closest("details"); if (details) details.open = true; }} id={`${id}-backup-key`} type="password" required maxLength={512} placeholder="Paste the backup provider key" autoComplete="off" autoCapitalize="none" spellCheck={false} /></div>}</div></details></fieldset>
        <p className="play-credential-status" role="status">{credentialNote}</p>
        {completed && <a className="play-response-jump" href={`#${id}-response`}>{response ? `${response.results.length} sources returned` : failure?.code === "aborted" ? "Search cancelled" : "Search failed"} · View response <span aria-hidden="true">↓</span></a>}
      </form>
      <noscript><p>Enable JavaScript to run live search. <a href="/docs/quickstart">Use the server quickstart</a>.</p></noscript>
      <details className="play-privacy"><summary>How your keys are handled</summary><p>Keys are held in memory for this request. The playground does not save them in cookies, browser storage, a database, or application logs. Search responses are not cached.</p><p>Your query and key reach the selected provider, whose own data and billing policies apply. Custom endpoints and arbitrary code are not accepted here. SerpAPI requires credentials in its upstream URL, so it is available through the SDK on your own server, alongside SearXNG and the corpus-only WonderSearch client.</p><p>Prefer a limited-scope key. Closing this page or cancelling cannot undo a request already received by a provider.</p></details>
    </div>
    <section className="play-response" id={`${id}-response`} aria-labelledby={`${id}-response-title`} tabIndex={-1} aria-busy={busy}>
      <div className="play-section-title"><h2 id={`${id}-response-title`}>Response</h2><span role="status">{busy ? "Searching" : response ? `${response.results.length} sources` : failure ? failure.code : "Ready when you are"}</span><PlaygroundDitherBand /></div>
      <div className="play-response-nav" role="group" aria-label="Response view">{([['sources','Sources'],['json','JSON'],['code','TypeScript']] as const).map(([value,label]) => <button key={value} type="button" aria-pressed={view === value} onClick={() => { setView(value); setCopyStatus(""); }}>{label}</button>)}</div>
      {view === "code" ? <div className="play-code"><div className="play-code-header"><span>search.ts · server</span><button type="button" onClick={() => copy(code)}>Copy code</button></div><pre tabIndex={0} aria-label="Server TypeScript example"><code>{code}</code></pre><p role="status">{copyStatus}</p><p>Keys stay in environment variables. <a href="/docs/installation">Install the SDK</a> before running this example.</p></div> : view === "json" ? <div className="play-code"><div className="play-code-header"><span>Normalized response</span><button type="button" disabled={!response && !failure} onClick={() => copy(JSON.stringify(response ?? failure, null, 2))}>Copy JSON</button></div><pre tabIndex={0} aria-label="JSON response"><code>{response || failure ? JSON.stringify(response ?? failure, null, 2) : "// Run a search to inspect its response."}</code></pre><p role="status">{copyStatus}</p></div> : <>
        {(!response && !failure || busy) && <div className="play-empty"><PlaygroundDither active={busy} />{busy && <DitherProgress label="Waiting for provider response" />}<h3>{busy ? `Searching ${name(provider)}…` : "A real query. Every attempt."}</h3><p>{busy ? "The server is calling your provider. Sources and attempt timings appear when the request completes." : "Choose a provider, paste your key, and ask a question. Inspect the sources, follow the attempt trace, then choose an SDK for your app."}</p>{!busy && <a className="play-empty-note" href="/docs/sdks">Choose your SDK · 12 languages and platforms</a>}</div>}
        {attempts.length > 0 && <div className="play-trace"><h3>Attempt trace</h3><ol>{attempts.map((a,i) => <li key={`${a.provider}-${i}`}><span className="play-attempt-index"><span className="play-attempt-ink" aria-hidden="true" style={{ ...ditherMaskStyle(a.outcome === "success" ? .75 : .25, { cell: 2, matrix: "bayer4" }), backgroundImage: "var(--dither-spectrum)" }} />{i+1}</span><div><strong>{name(a.provider)}</strong><span>{a.code ?? "success"}{a.status ? ` · HTTP ${a.status}` : ""}</span></div><time>{Math.round(a.durationMs)} ms</time></li>)}</ol></div>}
        {failure && !busy && <div className="play-error" role="alert"><h3>{failure.code === "aborted" ? "Search cancelled." : failure.code === "auth" ? "Check your provider key." : "This search didn’t complete."}</h3><p>{errorHelp[failure.code] ?? "The request failed. Check the provider and your account, then try again."}</p></div>}
        {attempts.length > 0 && !busy && <DitherAttemptBars attempts={attempts} label="This request · measured durations" />}
        {response && !busy && <><div className="play-result-summary dither-completion"><p>Returned by <strong>{name(response.provider)}</strong>{response.warnings.some(w => w.code === "fallback_used") ? " · fallback used" : ""}</p><span>{lastQuery}</span></div>{response.results.length === 0 && <div className="play-error"><DitherEmpty /><h3>No sources returned.</h3><p>The provider completed successfully. Try a broader query. An empty result does not trigger fallback.</p></div>}<ol className="play-sources" aria-label="Search sources">{response.results.map((r,i) => { const url = safeUrl(r.url); return <li key={`${r.url}-${i}`}><span className="play-source-number"><span className="play-source-ink" aria-hidden="true" style={{ ...ditherMaskStyle(.375, { cell: 2, matrix: "bayer8" }), backgroundImage: "var(--dither-spectrum)" }} />{String(i+1).padStart(2,"0")}</span><div>{url ? <a href={url.href} target="_blank" rel="noreferrer">{r.title || url.hostname}<span aria-hidden="true"> ↗</span></a> : <strong>{r.title || "Source"}</strong>}{(r.snippet || r.highlights?.length) ? <p>{(r.snippet || r.highlights?.find(text => text.trim()) || "").slice(0, 1600)}</p> : null}<span className="play-source-origin">{url?.hostname ?? "URL unavailable"} · {name(r.provenance.provider)}</span></div></li>; })}</ol><div className="play-response-footer">{response.usage ? `Provider-reported usage: ${response.usage.value} ${response.usage.unit}.` : "This provider did not report usage for this response."} Timings describe this request, not a benchmark.</div></>}
      </>}
    </section>
  </div>;
}
