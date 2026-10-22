import { useEffect, useId, useState } from "react";
import { DitherPattern } from "./lib/dither/pattern";
import { providers } from "./provider-catalog";
import { WorkspaceDitherField, WorkspaceDitherSpectrum, WorkspaceDitherUnrun, workspaceDitherStyles } from "./components/WorkspaceDither";
import "./benchmarks.css";

const metrics = [
  { id: "relevance", name: "Relevance", label: "nDCG@10", detail: "Ranked relevance against independently judged queries. Publish the judging rubric, per-query scores, agreement, and confidence intervals.", unit: "Score · higher is better" },
  { id: "latency", name: "Latency", label: "p50 / p95", detail: "End-to-end elapsed time from a fixed region and runtime. Keep warmups separate and retain failures and timeouts. Process warmup does not control provider caches.", unit: "Milliseconds · lower is better" },
  { id: "cost", name: "Cost", label: "Cost / 1k queries", detail: "Measured billable usage at a named plan and date. Keep unknown charges visible, and separate base search from extraction and generated answers.", unit: "USD · plan and date disclosed" },
  { id: "reliability", name: "Reliability", label: "Completion rate", detail: "Schema-valid responses divided by all started measured attempts. Show empty responses separately, alongside rate limits, provider failures, SDK timeouts, and incomplete runs.", unit: "Percent · denominator published" },
] as const;
const principles = [
  ["Match the task.", "Compare search with search. Report extraction, generated answers, research jobs, and private-corpus retrieval as separate tracks."],
  ["Freeze the conditions.", "Version queries, result depth, provider options, API versions, plans, region, time window, concurrency, cache policy, and retry policy."],
  ["Keep the inconvenient data.", "Report sample sizes, failures, exclusions, uncertainty, and per-query outcomes. Randomize provider order and repeat runs."],
  ["Make judgment reviewable.", "Blind relevance judgments to provider identity. Publish the rubric, disagreements, adjudication, and dataset limitations."],
  ["Disclose influence.", "List funding, provider credits, and other relationships beside each run. Providers may flag errors; they do not choose the published subset."],
] as const;

export function Benchmarks() {
  const [enhanced, setEnhanced] = useState(false);
  useEffect(() => setEnhanced(true), []);
  const pattern = useId();
  const [metricId, setMetricId] = useState<(typeof metrics)[number]["id"]>("relevance");
  const [scope, setScope] = useState("all");
  const [query, setQuery] = useState("");
  const metric = metrics.find((item) => item.id === metricId)!;
  const visible = providers.filter((provider) =>
    (scope === "all" || (scope === "corpus" ? provider.corpus : !provider.corpus)) && provider.name.toLowerCase().includes(query.trim().toLowerCase()),
  );
  return (
    <div className="benchmarks-page" style={workspaceDitherStyles}>
      <header className="benchmark-heading">
        <h1>Provider benchmarks</h1>
        <p className="benchmark-status">Boat run planned · results not yet available</p>
        <p>Relevance, latency, cost, and reliability need evidence. The protocol and portable harness are prepared for a future run on Boat. No live benchmark results have been collected or published.</p>
        <a href="#methodology" className="benchmark-method-link">Read the proposed methodology <span aria-hidden="true">↘</span></a>
        <WorkspaceDitherUnrun />
      </header>

      <section className="benchmark-lab" aria-labelledby="benchmark-results-title">
        <div className="benchmark-lab-heading">
          <div><h2 id="benchmark-results-title">The protocol comes first.</h2><p>Fixture runs check the harness. They do not measure provider performance.</p></div>
          <svg className="benchmark-mark" viewBox="0 0 96 80" fill="none" aria-hidden="true"><defs><WorkspaceDitherSpectrum id={`${pattern}-rgb`} /><DitherPattern id={pattern} level={0.5} cell={2} color="#fff" /><mask id={`${pattern}-mask`}><path d="M4 4h36v32H4zm52 0h36v32H56zM4 44h36v32H4zm52 0h36v32H56z" fill={`url(#${pattern})`} /><path d="M13 13h18v14H13zm52 0h18v14H65zM13 53h18v14H13zm52 0h18v14H65z" fill="#000" /></mask></defs><rect width="96" height="80" fill={`url(#${pattern}-rgb)`} mask={`url(#${pattern}-mask)`} /></svg>
        </div>
        <div className="benchmark-metrics" role="group" aria-label="Metric to inspect">
          {metrics.map((item) => <button key={item.id} type="button" disabled={!enhanced} aria-pressed={item.id === metricId} aria-controls="benchmark-metric-description" onClick={() => setMetricId(item.id)}><WorkspaceDitherField className="benchmark-metric-dither" variant={item.id === metricId ? "gradient" : "dotted"} />{item.name}<span>{item.label}</span></button>)}
        </div>
        <div className="benchmark-metric-detail" id="benchmark-metric-description" aria-live="polite"><p>{metric.detail}</p><span>{metric.unit}</span></div>
        <div className="benchmark-controls">
          <label>Task track
            <span className="benchmark-select">
              <select disabled={!enhanced} value={scope} onChange={(event) => setScope(event.target.value)}><option value="all">All task tracks</option><option value="web">Open-web search</option><option value="corpus">Corpus retrieval</option></select>
              <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false"><path d="m4 6 4 4 4-4" /></svg>
            </span>
          </label>
          <label>Find a provider<input type="search" disabled={!enhanced} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Provider name…" /></label>
          <p role="status">{visible.length} {visible.length === 1 ? "provider" : "providers"}</p>
        </div>
        <dl className="benchmark-run-plan" aria-label="Proposed run conditions">
          <div><dt>Dataset</dt><dd>12 public-safe prompts</dd></div>
          <div><dt>Repetitions</dt><dd>3 measured rounds</dd></div>
          <div><dt>Dispatch</dt><dd>1 request at a time</dd></div>
          <div><dt>Live execution</dt><dd>Explicit opt-in required</dd></div>
        </dl>
        {visible.length === 0 ? (
          <div className="benchmark-no-results" role="status"><WorkspaceDitherField variant="dotted" /><p>No providers match “{query}”.</p></div>
        ) : <ul className="benchmark-provider-plan" aria-label="Planned provider coverage">
          {visible.map((provider) => <li key={provider.id}>
            <WorkspaceDitherField className="benchmark-provider-dither" variant={provider.corpus ? "hatched" : "dotted"} />
            <a href={`/docs/providers/${provider.id}`}>{provider.name}<span aria-hidden="true">↗</span></a>
            <div><p className="benchmark-track-label">{provider.corpus ? "Separate corpus track" : "Planned web-search track"}</p>
              <p>{provider.corpus ? "Retrieves from a configured corpus. Requires its own frozen dataset and judgments; excluded from open-web comparisons."
                : provider.id === "searxng" ? "An operator-selected instance and its upstream engines define the configuration. Instance differences must be disclosed."
                : provider.description}</p></div>
          </li>)}
        </ul>}
        <p className="benchmark-footnote">Catalog order, with no rankings. The small smoke dataset validates the process; general relevance claims require a representative dataset and independent judgments.</p>
      </section>

      <section className="benchmark-methodology" id="methodology" aria-labelledby="methodology-title">
        <div><h2 id="methodology-title">The method ships<br />with the numbers.</h2><p className="benchmark-protocol-label">Proposed protocol · v0.2</p><p>Results will be scoped to a task, a dataset, and a configuration. Each future run will record its runtime, region, budgets, timestamps, failures, and reproducibility hashes.</p><a href="/benchmark-methodology.json" download className="benchmark-method-link">Download the protocol draft <span aria-hidden="true">↓</span></a><p className="benchmark-venue">Planned execution venue: <a href="https://boat.dev">Boat</a>. <a href="https://docs.boat.dev/llms.txt">Official documentation</a>.</p></div>
        <ol className="benchmark-principles">{principles.map(([title, description], index) => <li key={title}><span className="benchmark-principle-number" aria-hidden="true">0{index + 1}<WorkspaceDitherField variant="hatched" /></span><div><h3>{title}</h3><p>{description}</p></div></li>)}</ol>
      </section>
      <aside className="benchmark-next"><WorkspaceDitherField className="benchmark-next-dither" /><div><h2>Find your provider’s API.</h2><p>Explore capabilities and integration details while the first benchmark run takes shape.</p></div><a href="/providers">Browse providers <span aria-hidden="true">→</span></a></aside>
    </div>
  );
}
