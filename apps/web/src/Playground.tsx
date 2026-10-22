import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import {
  createSearch,
  SearchError,
  type SearchAttempt,
  type SearchResponse,
} from "@belweave/search-sdk";
import {
  createMockProvider,
  type MockOutcome,
} from "@belweave/search-sdk/testing";
import { DitherPattern } from "./lib/dither/pattern";
import "./playground.css";

const scenarios = {
  success: {
    label: "Search succeeds",
    note: "The primary provider returns three sources.",
  },
  fallback: {
    label: "429 → fallback",
    note: "A simulated 429 sends the request to the explicitly configured backup.",
  },
  timeout: {
    label: "Timeout → backup",
    note: "The primary exceeds its attempt budget. The backup gets the remaining time.",
  },
  auth: {
    label: "Auth error",
    note: "An authentication error stops the call. It never falls back.",
  },
  empty: {
    label: "No results",
    note: "An empty response is a successful search. It never triggers fallback.",
  },
} as const;
type Scenario = keyof typeof scenarios;
const fixtures = [
  {
    title: "SQLite: Write-Ahead Logging",
    url: "https://www.sqlite.org/wal.html",
    snippet:
      "Learn how WAL allows readers and a writer to proceed concurrently.",
  },
  {
    title: "Isolation in SQLite",
    url: "https://www.sqlite.org/isolation.html",
    snippet:
      "Transaction isolation, snapshots, and the single-writer model.",
  },
  {
    title: "SQLite transactions",
    url: "https://www.sqlite.org/lang_transaction.html",
    snippet:
      "Deferred, immediate, and exclusive transaction behavior.",
  },
];
export function Playground() {
  const pattern = useId();
  const responseId = `search-response-${pattern}`;
  const [enhanced, setEnhanced] = useState(false);
  const [scenario, setScenario] = useState<Scenario>("fallback");
  const [query, setQuery] = useState("SQLite write concurrency");
  const [busy, setBusy] = useState(false);
  const [response, setResponse] = useState<SearchResponse | null>(null);
  const [failure, setFailure] = useState<SearchError | null>(null);
  const [ranScenario, setRanScenario] = useState<Scenario | null>(null);
  const controller = useRef<AbortController | null>(null);
  const runButton = useRef<HTMLButtonElement>(null);
  const cancelButton = useRef<HTMLButtonElement>(null);
  const restoreRunFocus = useRef(false);
  useEffect(() => setEnhanced(true), []);
  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => {
    if (busy || !restoreRunFocus.current) return;
    restoreRunFocus.current = false;
    if (document.activeElement === document.body) {
      runButton.current?.focus({ preventScroll: true });
    }
  }, [busy]);
  async function run(event: FormEvent) {
    event.preventDefault();
    if (!enhanced || controller.current || !query.trim()) return;
    restoreRunFocus.current = false;
    const abort = new AbortController();
    controller.current = abort;
    setBusy(true);
    setResponse(null);
    setFailure(null);
    setRanScenario(scenario);
    const outcome: MockOutcome =
      scenario === "fallback"
        ? { type: "error", code: "rate_limit", status: 429, delayMs: 350 }
        : scenario === "auth"
          ? { type: "error", code: "auth", status: 401, delayMs: 350 }
          : {
              type: "success",
              results: scenario === "empty" ? [] : fixtures,
              delayMs: scenario === "timeout" ? 1500 : 350,
            };
    try {
      const client = createSearch({
        provider: createMockProvider({
          id: "demo-primary",
          outcomes: [outcome],
        }),
        fallback: [
          createMockProvider({
            id: "demo-backup",
            outcomes: [{ type: "success", results: fixtures, delayMs: 250 }],
          }),
        ],
        timeoutMs: 4000,
        attemptTimeoutMs: 800,
      });
      setResponse(
        await client.web.search({ query, limit: 3 }, { signal: abort.signal }),
      );
    } catch (error) {
      setFailure(
        error instanceof SearchError
          ? error
          : new SearchError("provider_error"),
      );
    } finally {
      restoreRunFocus.current = document.activeElement === cancelButton.current;
      controller.current = null;
      setBusy(false);
    }
  }
  const attempts: readonly SearchAttempt[] =
    response?.attempts ?? failure?.attempts ?? [];
  const completion = busy
    ? null
    : failure
      ? failure.code === "aborted"
        ? "Cancelled."
        : failure.code === "auth"
          ? "Auth failed."
          : "Search failed."
      : response
        ? response.results.length === 0
          ? "No sources."
          : `${response.results.length} ${response.results.length === 1 ? "source" : "sources"}.`
        : null;
  return (
    <div className="search-demo-shell">
      <div className="search-demo-controls">
        <form onSubmit={run} aria-label="Search scenario">
          <label htmlFor="query">Search query</label>
          <input
            id="query"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            required
            maxLength={500}
            disabled={!enhanced || busy}
          />
          <label htmlFor="scenario">What happens next?</label>
          <span className="search-demo-select">
            <select
              id="scenario"
              aria-describedby="scenario-description"
              value={scenario}
              onChange={(e) => setScenario(e.target.value as Scenario)}
              disabled={!enhanced || busy}
            >
              {Object.entries(scenarios).map(([key, value]) => (
                <option key={key} value={key}>
                  {value.label}
                </option>
              ))}
            </select>
            <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false"><path d="m4 6 4 4 4-4" /></svg>
          </span>
          <p id="scenario-description" className="search-demo-scenario-note">{scenarios[scenario].note}</p>
          <div className="search-demo-action-area">
            <div className="search-demo-run-actions">
              <button ref={runButton} type="submit" disabled={!enhanced || !query.trim()} aria-disabled={busy}>
                {busy ? "Searching…" : "Run search"}
                <span aria-hidden="true">↗</span>
              </button>
              {busy && (
                <button
                  ref={cancelButton}
                  type="button"
                  className="search-demo-cancel"
                  onClick={() => controller.current?.abort()}
                >
                  Cancel
                </button>
              )}
            </div>
            {completion && (
              <p className="search-demo-completion">
                <span>{completion}</span>
                <a href={`#${responseId}`}>View response <span aria-hidden="true">↓</span></a>
              </p>
            )}
          </div>
        </form>
        <noscript><p className="search-demo-noscript">Enable JavaScript to run this example. <a href="/docs">Read the SDK docs <span aria-hidden="true">→</span></a></p></noscript>
        <p className="search-demo-fixture-note">
          Example data. Fixed SQLite sources let you try the SDK’s request handling without live retrieval.
        </p>
        <nav className="search-demo-docs" aria-label="Use this example in your application">
          <a href="/docs/guides/testing">Test this in your app <span aria-hidden="true">→</span></a>
          <a href="/docs/reliability/fallback">Read the fallback rules <span aria-hidden="true">→</span></a>
        </nav>
      </div>
      <div className="search-demo-output" id={responseId} role="region" aria-labelledby={`${responseId}-heading`} tabIndex={-1} aria-live="polite" aria-busy={busy}>
        <div className="search-demo-output-heading">
          <h2 id={`${responseId}-heading`}>Response</h2>
          <span>
            {busy
              ? "In progress"
              : response
                ? `${response.results.length} sources`
                : failure
                  ? failure.code
                  : "Ready"}
          </span>
        </div>
        {!busy && !response && !failure && (
          <div className="search-demo-empty-output">
            <svg className="search-demo-mark" viewBox="0 0 180 104" fill="none" aria-hidden="true">
              <defs><DitherPattern id={pattern} level={0.375} cell={2} color="--code-accent" /></defs>
              {[0, 1, 2].map((row) => <g key={row}><rect x="8" y={8 + row * 32} width="20" height="20" fill={`url(#${pattern})`} /><rect x="42" y={8 + row * 32} width={122 - row * 18} height="8" fill={`url(#${pattern})`} /><path d={`M42 ${24 + row * 32}h${90 - row * 18}`} stroke="var(--border)" strokeWidth="2" /></g>)}
            </svg>
            <h3>Follow the request.</h3>
            <p>
              Run a scenario to see the attempts, the provider that responds, and its sources.
            </p>
          </div>
        )}
        {busy && (
          <div className="search-demo-empty-output">
            <h3>Making the request…</h3>
            <p>The SDK is applying your scenario’s deadlines.</p>
          </div>
        )}
        {attempts.length > 0 && (
          <ol className="search-demo-attempts" aria-label="Search attempts">
            {attempts.map((attempt, i) => (
              <li key={`${attempt.provider}-${i}`}>
                <span className="search-demo-attempt-number">{i + 1}</span>
                <span>
                  {attempt.provider}
                  <span className="search-demo-attempt-status">
                    {attempt.code ?? "success"}
                    {attempt.status ? ` · HTTP ${attempt.status}` : ""}
                  </span>
                </span>
                <span className="search-demo-attempt-time">
                  {Math.round(attempt.durationMs)} ms
                </span>
              </li>
            ))}
          </ol>
        )}
        {failure && (
          <div className="search-demo-result-message">
            <h3>
              {failure.code === "aborted"
                ? "Search cancelled."
                : "The call stopped here."}
            </h3>
            <p>{failure.message}</p>
            <p>
              {failure.code === "auth"
                ? "Check the provider credentials. The backup was not called."
                : "The attempt trace above shows how far this call got."}
            </p>
          </div>
        )}
        {response && (
          <>
            <p className="search-demo-winner">
              Returned by <strong>{response.provider}</strong>
              {response.warnings.some((w) => w.code === "fallback_used")
                ? " · fallback used"
                : ""}
            </p>
            {response.results.length === 0 && (
              <div className="search-demo-result-message">
                <h3>No sources returned.</h3>
                <p>
                  The primary completed successfully. No fallback was needed.
                </p>
              </div>
            )}
            <ol className="search-demo-results" aria-label="Search sources">
              {response.results.map((result, i) => (
                <li key={result.url}>
                  <span className="search-demo-result-index">0{i + 1}</span>
                  <div>
                    <a href={result.url} target="_blank" rel="noreferrer">
                      {result.title}
                      <span aria-hidden="true"> ↗</span>
                    </a>
                    <p>{result.snippet}</p>
                    <span className="search-demo-source-url">
                      {new URL(result.url).hostname} ·{" "}
                      {result.provenance.provider}
                    </span>
                  </div>
                </li>
              ))}
            </ol>
            <details className="search-demo-response-json">
              <summary>Inspect JSON response</summary>
              <pre tabIndex={0} role="region" aria-label="JSON response"><code>{JSON.stringify(response, null, 2)}</code></pre>
            </details>
          </>
        )}
        {ranScenario && !busy && (
          <div className="search-demo-output-footnote">
            {scenarios[ranScenario].label}
            {response?.usage ? ` · Usage: ${response.usage.value} ${response.usage.unit}` : ""}
          </div>
        )}
      </div>
    </div>
  );
}
