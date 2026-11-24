// SYNTHETIC FIXTURES. Nothing here is a real provider or a real judge.
// Fixture providers are registry specs on the reserved `.invalid` domain, run
// through the real SDK with an injected fetch that fabricates responses from
// the items' answer keys. Results from fixture mode are labelled "fixture"
// everywhere and must never be presented as live provider measurements.
import { rng, seedOf } from "./util/core.ts";
import type { Item } from "./dataset/items.ts";
import type { Judge, JudgeInput, JudgeVerdict } from "./judge/judge.ts";
import { textHasAnswer } from "./dataset/match.ts";

export interface FixtureBehaviour {
  /** Probability that the answer appears in the results (and on the fetched page). */
  hit: number;
  /** Probability of an empty result list. */
  empty?: number;
  /** Probability of each failure status on an attempt. */
  status503?: number;
  status429?: number;
  /** Fixed per-request list price in USD, or null for "not public". */
  price?: number | null;
  /** Reported cost in USD per request in the body (overrides the computed price). */
  reportedUsd?: number;
}

export const FIXTURE_PROVIDERS: Record<string, FixtureBehaviour> = {
  "fx-strong": { hit: 0.85, price: 0.005 },
  "fx-fair": { hit: 0.6, price: 0.002 },
  "fx-flaky": { hit: 0.8, status503: 0.15, status429: 0.05, price: 0.004 },
  "fx-empty": { hit: 0, empty: 1, price: 0.001 },
  "fx-unpriced": { hit: 0.5, price: null },
};

export const FIXTURE_FETCHER = "fx-pages";

function spec(id: string, b: FixtureBehaviour | null): Record<string, unknown> {
  const pricing = (usd: number | null) => ({ plan: "fixture", source: "https://fixture.invalid/pricing", retrievedOn: "2026-11-24", perRequestUsd: usd });
  const base: Record<string, unknown> = {
    formatVersion: 1, id, name: `Fixture ${id}`, specVersion: "2026-11-24",
    sources: [{ url: "https://fixture.invalid/docs", retrievedOn: "2026-11-24", covers: "synthetic fixture provider" }],
    auth: { in: "header", name: "x-fixture-key", env: ["FIXTURE_KEY"] },
    capabilities: { search: b !== null, contents: b === null },
    index: { type: "unknown", note: "Synthetic fixture." },
    terms: { url: "https://fixture.invalid/terms", readOn: "2026-11-24", benchmarkPublication: "allowed", rawResponseStorage: "allowed" },
    errors: [],
    unverified: [],
  };
  if (b) {
    base.search = {
      request: { method: "POST", url: `https://fixture.invalid/${id}/search`, encoding: "json", params: { query: { to: "q" }, maxResults: { to: "n" } } },
      limits: { maxResults: 20, maxQueryLength: null, maxIncludeDomains: 0, maxExcludeDomains: 0 },
      dateBasis: "unknown",
      response: { results: "results", fields: { url: "url", title: "title", excerpts: { path: "snippet", steps: [{ step: "to-list" }] } } },
      ...(b.reportedUsd !== undefined ? { cost: { reported: { path: "costUsd", unit: "usd" } } } : {}),
      pricing: pricing(b.price ?? null),
      rateLimits: [],
      providerOptions: { mode: { enum: ["plain", "boosted"] } },
    };
  } else {
    base.contents = {
      request: { method: "POST", url: `https://fixture.invalid/${id}/contents`, encoding: "json", params: { urls: { to: "urls" } } },
      limits: { maxUrls: 10 },
      contentFormat: "text",
      response: { pages: [{ from: "pages", status: "ok", fields: { url: "url", title: "title", content: "text" } }] },
      pricing: { ...pricing(0), extraBlock: { items: 1, usd: 0.001 } },
      rateLimits: [],
      providerOptions: {},
    };
  }
  return base;
}

export function fixtureRegistry(providers: Record<string, FixtureBehaviour> = FIXTURE_PROVIDERS): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [id, b] of Object.entries(providers)) out[id] = spec(id, b);
  out[FIXTURE_FETCHER] = spec(FIXTURE_FETCHER, null);
  return out;
}

export function fixtureKeys(registry: Record<string, unknown>): Record<string, string> {
  return Object.fromEntries(Object.keys(registry).map((id) => [id, "fixture-key"]));
}

/** The answer as page text: the first alias, or the literal a freshness pattern encodes. */
function answerText(item: Item): string {
  if (item.answers[0]) return item.answers[0];
  const p = item.answerPatterns[0]?.match(/v\?(.*?)\(\?!/)?.[1];
  return p ? p.replace(/\\(.)/g, "$1") : "";
}

/** A fake web: page text for a fixture URL. Pages with "/a/" in the path state the answer. */
export function fixturePageText(url: string, items: Map<string, Item>): string {
  const m = url.match(/^https:\/\/([a-z0-9-]+)\.example\/(a|n)\/([a-z0-9-]+)\/(\d+)$/);
  const item = m ? items.get(m[3]!) : undefined;
  if (!m || !item) return "Nothing useful on this synthetic page.";
  if (m[2] === "a") {
    return `Synthetic page. Regarding the question, the answer is ${answerText(item) || "unknown"}. More filler text follows here.`;
  }
  return "Synthetic page about something else entirely, with filler text and no answer.";
}

/**
 * An injected fetch for the fixture registry. Deterministic per (provider,
 * query, attempt number), so fixture runs are reproducible.
 */
export function fixtureFetch(items: readonly Item[], providers: Record<string, FixtureBehaviour> = FIXTURE_PROVIDERS, opts: { calls?: string[] } = {}): typeof fetch {
  const byQuery = new Map(items.map((i) => [i.query, i]));
  const byId = new Map(items.map((i) => [i.id, i]));
  const counter = new Map<string, number>();
  return (async (input: unknown, init?: RequestInit) => {
    const url = String(input instanceof Request ? input.url : input);
    opts.calls?.push(url);
    const m = url.match(/^https:\/\/fixture\.invalid\/([a-z0-9-]+)\/(search|contents)$/);
    if (!m) throw new TypeError(`fixture fetch: unexpected URL ${url}`);
    const [, id, kind] = m;
    const body = JSON.parse(String(init?.body ?? "{}")) as { q?: string; n?: number; urls?: string[] };
    const json = (status: number, value: unknown) => new Response(JSON.stringify(value), { status, headers: { "content-type": "application/json" } });
    if (kind === "contents") {
      return json(200, { pages: (body.urls ?? []).map((u) => ({ url: u, title: "Synthetic page", text: fixturePageText(u, byId) })) });
    }
    const b = providers[id!];
    const item = byQuery.get(body.q ?? "");
    if (!b || !item) return json(200, { results: [] });
    const n = (counter.get(`${id}|${body.q}`) ?? 0) + 1;
    counter.set(`${id}|${body.q}`, n);
    const r = rng(seedOf("fixture", id!, item.id, n));
    const roll = r();
    if (roll < (b.status503 ?? 0)) return json(503, { error: "synthetic outage" });
    if (roll < (b.status503 ?? 0) + (b.status429 ?? 0)) return json(429, { error: "synthetic rate limit" });
    if (r() < (b.empty ?? 0)) return json(200, { results: [], ...(b.reportedUsd !== undefined ? { costUsd: b.reportedUsd } : {}) });
    const hit = r() < b.hit;
    const count = Math.min(body.n ?? 10, 10);
    const slot = Math.floor(r() * 3);
    const results = Array.from({ length: count }, (_, i) => {
      const answerHere = hit && i === slot;
      const host = item.class === "nav" && answerHere ? new URL(item.answerUrls[0]!).hostname : `${id}-${i}.example`;
      const path = `${answerHere ? "a" : "n"}/${item.id}/${i}`;
      return {
        url: item.class === "nav" && answerHere ? `https://${host}/` : `https://${host}/${path}`,
        title: `Synthetic result ${i + 1}`,
        // Half of the hits state the answer in the snippet; the other half only on the page.
        snippet: answerHere && r() < 0.5 ? `Synthetic snippet mentioning ${answerText(item) || "the topic"}.` : "Synthetic snippet without the answer.",
      };
    });
    return json(200, { results, ...(b.reportedUsd !== undefined ? { costUsd: b.reportedUsd } : {}) });
  }) as typeof fetch;
}

/** A synthetic judge: grade 3 when the passage states the item's answer, else 0 or 1, with a little seeded noise. */
export function fixtureJudge(items: readonly Item[], noise = 0.1): Judge {
  const byQuery = new Map(items.map((i) => [i.query, i]));
  let calls = 0;
  return {
    info: { id: "fixture-judge", label: "Synthetic fixture judge", model: "none", rubric: "rubric/relevance-1.0.0.md", rubricSha256: "fixture", promptSha256: "fixture", params: {} },
    maxCallCostUsd: () => 0.001,
    cooldownMs: () => 0,
    async grade(input: JudgeInput): Promise<JudgeVerdict> {
      calls++;
      const item = byQuery.get(input.query);
      const has = item ? textHasAnswer(input.passage, item) : false;
      let grade: 0 | 1 | 2 | 3 = has ? 3 : input.passage.includes("Synthetic page about") ? 0 : 1;
      if (rng(seedOf("judge-noise", input.query, input.url, calls))() < noise) grade = (grade === 3 ? 2 : grade + 1) as 0 | 1 | 2 | 3;
      return { grade, rationale: "synthetic", inputTokens: 100, outputTokens: 20, costUsd: 0.0005, model: "fixture", raw: { synthetic: true } };
    },
  };
}
