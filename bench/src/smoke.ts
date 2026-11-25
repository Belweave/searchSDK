// The live smoke check: a few calls per provider through the SDK, before a
// full run, to find registry spec mistakes cheaply. For each provider it
// sends 2 or 3 searches and 1 contents call, then reports per call the HTTP
// status, latency, result count, whether every field path the spec maps was
// actually present in the raw response, the cost against the spec's bound,
// and any error class, and lists the spec paths that look wrong. Raw
// responses go to the git-ignored store only; the printed table and
// report.json hold field paths, counts, statuses and costs, never response
// text, and never any key.
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import type { Budget } from "./run/budget.ts";
import type { Method } from "./run/config.ts";
import { attemptsCredits, creditReservation, reservation } from "./run/pricing.ts";
import { attemptsCost } from "./run/runner.ts";
import { allHold, getPath, SearchError, type Attempt, type Client, type ContentsResponse, type ProviderSpec, type SearchResponse } from "./sdk.ts";
import { writeJson } from "./util/core.ts";

/** Neutral queries: a head fact, a technical fact, and one whose answer changes (dates are likely). */
export const SMOKE_QUERIES = ["capital of Australia", "who designed the Python programming language", "latest stable release of Node.js"];
/** A stable, public, plain page every contents endpoint should read. */
export const SMOKE_URL = "https://en.wikipedia.org/wiki/Canberra";

type FieldSpec = string | { path: string } | undefined;
const pathOf = (f: FieldSpec): string | null => (f === undefined ? null : typeof f === "string" ? f : f.path);
const present = (v: unknown) => v !== undefined && v !== null && v !== "" && !(Array.isArray(v) && v.length === 0);

export interface FieldCheck {
  /** Where in the spec, e.g. search.response.fields.publishedAt. */
  field: string;
  /** The JSON path the spec maps, e.g. publishedDate. */
  path: string;
  present: number;
  of: number;
  /** A field the benchmark relies on (results, url, title, excerpts, contents url and content). */
  required: boolean;
}

export interface SmokeCall {
  provider: string;
  kind: "search" | "contents";
  n: number;
  status: number | null;
  latencyMs: number;
  outcome: "ok" | "error" | "skipped";
  error: { code: string; status: number | null; providerCode: string | null } | null;
  results: number;
  fields: FieldCheck[];
  requestId: boolean;
  cost: { usd: number | null; source: string; credits: number | null; boundUsd: number | null };
  warnings: string[];
  /** File name of the raw response under the smoke directory. */
  raw: string | null;
}

export interface SmokeProblem {
  provider: string;
  severity: "error" | "warn" | "note";
  where: string;
  message: string;
}

export interface SmokeReport {
  mode: "live" | "fixture";
  at: string;
  dir: string;
  providers: string[];
  calls: SmokeCall[];
  problems: SmokeProblem[];
}

/** Field paths of a search response, counted over its result rows. */
export function searchFields(spec: ProviderSpec, body: unknown): { fields: FieldCheck[]; rows: number } {
  const r = spec.search!.response;
  const list = getPath(body, r.results);
  const rows = Array.isArray(list) ? list : [];
  const out: FieldCheck[] = [{ field: "search.response.results", path: r.results, present: Array.isArray(list) ? 1 : 0, of: 1, required: !r.resultsOptional }];
  const count = (field: string, f: FieldSpec, required: boolean) => {
    const p = pathOf(f);
    if (p) out.push({ field, path: p, present: rows.filter((row) => present(getPath(row, p))).length, of: rows.length, required });
  };
  count("search.response.fields.url", r.fields.url, true);
  count("search.response.fields.title", r.fields.title, true);
  count("search.response.fields.excerpts", r.fields.excerpts, true);
  count("search.response.fields.publishedAt", r.fields.publishedAt, false);
  count("search.response.fields.author", r.fields.author, false);
  for (const [k, f] of Object.entries(r.providerFields ?? {})) count(`search.response.providerFields.${k}`, f as FieldSpec, false);
  const cost = spec.search!.cost?.reported?.path;
  if (cost) out.push({ field: "search.cost.reported", path: cost, present: present(getPath(body, cost)) ? 1 : 0, of: 1, required: false });
  for (const rule of r.requestId ?? []) if ("path" in rule) out.push({ field: "search.response.requestId", path: rule.path, present: present(getPath(body, rule.path)) ? 1 : 0, of: 1, required: false });
  return { fields: out, rows: rows.length };
}

/** Field paths of a contents response, per page source, counted over the items its `where` selects. */
export function contentsFields(spec: ProviderSpec, body: unknown): FieldCheck[] {
  const out: FieldCheck[] = [];
  for (const [k, source] of spec.contents!.response.pages.entries()) {
    const raw = source.from === "$" ? body : getPath(body, source.from);
    const list = source.from === "$" ? [raw] : Array.isArray(raw) ? raw : [];
    out.push({ field: `contents.response.pages.${k}.from`, path: source.from, present: source.from === "$" || Array.isArray(raw) ? 1 : 0, of: 1, required: !source.optional });
    const items = list.filter((item) => allHold(item, source.where));
    for (const [name, f] of Object.entries(source.fields)) {
      const p = pathOf(f as FieldSpec);
      if (p) out.push({ field: `contents.response.pages.${k}.fields.${name}`, path: p, present: items.filter((i) => present(getPath(i, p))).length, of: items.length, required: source.status === "ok" && (name === "url" || name === "content") });
    }
  }
  const cost = spec.contents!.cost?.reported?.path;
  if (cost) out.push({ field: "contents.cost.reported", path: cost, present: present(getPath(body, cost)) ? 1 : 0, of: 1, required: false });
  return out;
}

const ERROR_ADVICE: Record<string, string> = {
  auth: "the provider rejected the key: check its value in the keys file (the name is right if `bench keys` shows it present)",
  forbidden: "the provider refused the request for this key or plan",
  quota: "the account is out of credits or over its allowance",
  rate_limit: "rate limited at smoke-check volume: check the plan's limits in the spec",
  provider_error: "the provider rejected the request (4xx): check the spec's request URL, method, fixed values and parameter names",
  invalid_response: "a 2xx response the spec cannot read: compare the spec's response paths with the raw response",
  response_too_large: "the response exceeded the SDK's size limit",
  unavailable: "the provider was unavailable (5xx); retry later",
  network: "the provider could not be reached",
  timeout: "the call exceeded its deadline",
  attempt_timeout: "the call exceeded its deadline",
  configuration: "the key is missing or not usable by the SDK",
  unsupported: "the SDK does not support this call for the provider",
};

/** Turns the calls into the list a maintainer acts on: which spec paths look wrong, and why. */
export function smokeProblems(calls: readonly SmokeCall[], registry: Readonly<Record<string, ProviderSpec>>): SmokeProblem[] {
  const out: SmokeProblem[] = [];
  for (const provider of [...new Set(calls.map((c) => c.provider))]) {
    const mine = calls.filter((c) => c.provider === provider);
    for (const c of mine.filter((x) => x.outcome === "error")) {
      const e = c.error!;
      const severe = ["auth", "forbidden", "provider_error", "invalid_response", "configuration", "unsupported", "quota"].includes(e.code);
      out.push({ provider, severity: severe ? "error" : "warn", where: `${c.kind} ${c.n}`, message: `${e.code}${e.status !== null ? ` (HTTP ${e.status}${e.providerCode ? `, provider code ${e.providerCode}` : ""})` : ""}: ${ERROR_ADVICE[e.code] ?? "see the raw response"}${c.raw ? `; raw response ${c.raw}` : ""}` });
    }
    // Field paths, summed over the provider's successful calls of each kind.
    const sums = new Map<string, FieldCheck>();
    for (const c of mine.filter((x) => x.outcome === "ok")) {
      for (const f of c.fields) {
        const s = sums.get(f.field) ?? { ...f, present: 0, of: 0 };
        s.present += f.present;
        s.of += f.of;
        sums.set(f.field, s);
      }
    }
    for (const f of sums.values()) {
      if (f.of === 0 || f.present > 0) continue;
      const what = `${f.field} ("${f.path}")`;
      if (f.field.endsWith(".cost.reported")) out.push({ provider, severity: "warn", where: what, message: "not in any response; cost falls back to the computed list price. Check the path, or remove cost.reported if the provider does not report it" });
      else if (f.field.endsWith(".requestId")) out.push({ provider, severity: "note", where: what, message: "not in any response body" });
      else if (f.required) out.push({ provider, severity: "error", where: what, message: `present in 0 of ${f.of}: the path is wrong or the provider names this field differently` });
      // An optional field missing from a handful of items (one contents page) is common; from ten or more results it is suspicious.
      else out.push({ provider, severity: f.of >= 10 ? "warn" : "note", where: what, message: `present in 0 of ${f.of}: check the path (the provider may also omit it for these queries)` });
    }
    for (const c of mine) {
      if (c.cost.usd !== null && c.cost.boundUsd !== null && c.cost.usd > c.cost.boundUsd + 1e-12) {
        out.push({ provider, severity: "error", where: `${c.kind}.pricing`, message: `${c.kind} ${c.n} cost $${c.cost.usd.toFixed(4)} (${c.cost.source}), above the spec's bound of $${c.cost.boundUsd.toFixed(4)}: the pricing data is wrong` });
      }
    }
    const spec = registry[provider];
    const searches = mine.filter((c) => c.kind === "search" && c.outcome === "ok");
    if (spec?.search?.response.requestId?.length && searches.length && searches.every((c) => !c.requestId)) {
      out.push({ provider, severity: "note", where: "search.response.requestId", message: "no request id found by any rule (body paths or headers)" });
    }
    for (const c of mine.filter((x) => x.kind === "search" && x.outcome === "ok" && x.results === 0)) out.push({ provider, severity: "warn", where: `search ${c.n}`, message: "an empty result list for a common query" });
    for (const w of [...new Set(mine.flatMap((c) => c.warnings))]) out.push({ provider, severity: "note", where: "warnings", message: `the SDK reported ${w}` });
  }
  return out;
}

function lastSent(attempts: readonly Attempt<string>[]): Attempt<string> | undefined {
  const sent = attempts.filter((a) => a.outcome !== "skipped");
  return sent[sent.length - 1];
}

/**
 * Runs the smoke calls. The caller has already passed the live guards (or
 * uses a fixture client). Every call reserves its cost bound (and credits,
 * under any provider limit) in the ledger first, like a run.
 */
export async function runSmoke(o: {
  mode: "live" | "fixture";
  providers: string[];
  registry: Readonly<Record<string, ProviderSpec>>;
  client: Client<string>;
  budget: Budget;
  method: Method;
  dir: string;
  searches: number;
  contentsUrl?: string;
  contentsTimeoutMs?: number;
  now?: () => number;
}): Promise<SmokeReport> {
  const at = new Date((o.now ?? Date.now)()).toISOString();
  const calls: SmokeCall[] = [];
  const stopped: SmokeProblem[] = [];
  const url = o.contentsUrl ?? SMOKE_URL;
  await Promise.all(o.providers.map(async (provider) => {
    const spec = o.registry[provider]!;
    const plan: { kind: "search" | "contents"; n: number }[] = [
      ...Array.from({ length: o.searches }, (_, k) => ({ kind: "search" as const, n: k + 1 })),
      ...(spec.contents ? [{ kind: "contents" as const, n: 1 }] : []),
    ];
    for (const { kind, n } of plan) {
      const count = kind === "search" ? o.method.search.maxResults : 1;
      const res = reservation(spec, kind, count, {}, o.method);
      const credits = creditReservation(spec, kind, count, {});
      const refusal = o.budget.providerRefusal(provider, credits);
      if (refusal) { stopped.push({ provider, severity: "error", where: "providerLimits", message: `${refusal}; smoke calls stopped` }); return; }
      const hold = o.budget.reserve(provider, kind, res.usd, credits);
      if (!hold) { stopped.push({ provider, severity: "error", where: "cap", message: o.budget.halted ?? "the smoke cap would be passed; smoke calls stopped" }); return; }
      const t0 = performance.now();
      let response: SearchResponse<string> | ContentsResponse<string> | null = null;
      let error: unknown = null;
      try {
        response = kind === "search"
          ? await o.client.search(SMOKE_QUERIES[(n - 1) % SMOKE_QUERIES.length]!, { provider, fallback: [], maxResults: o.method.search.maxResults, timeoutMs: o.method.search.timeoutMs, maxRetries: 0 })
          : await o.client.contents(url, { provider, fallback: [], timeoutMs: o.contentsTimeoutMs ?? 60_000, maxRetries: 0 });
      } catch (e) {
        error = e;
      }
      const latencyMs = Math.round(performance.now() - t0);
      const attempts = response?.attempts ?? (error instanceof SearchError ? error.attempts : []);
      const sent = attempts.filter((a) => a.outcome !== "skipped");
      const usd = sent.length ? attemptsCost(sent) : 0;
      const used = credits === null ? null : sent.length ? attemptsCredits(spec, kind, sent) : 0;
      const overrun = o.budget.commit(hold, usd, used);
      const raw = response?.raw ?? (error instanceof SearchError ? (error.raw ?? null) : null);
      const file = `${provider}-${kind}-${n}.json`;
      const last = lastSent(attempts);
      writeJson(join(o.dir, file), { provider, kind, n, ...(kind === "search" ? { query: SMOKE_QUERIES[(n - 1) % SMOKE_QUERIES.length] } : { url }), status: last?.status ?? null, raw }, 0o600);
      const fields = raw !== null ? (kind === "search" ? searchFields(spec, raw).fields : contentsFields(spec, raw)) : [];
      const cost = response?.cost ?? last?.cost ?? null;
      const call: SmokeCall = {
        provider, kind, n, status: last?.status ?? (error instanceof SearchError ? (error.status ?? null) : null), latencyMs,
        outcome: response ? "ok" : "error",
        error: response ? null : error instanceof SearchError ? { code: error.code, status: error.status ?? null, providerCode: error.providerCode ?? null } : { code: "harness_error", status: null, providerCode: null },
        results: response ? ("results" in response ? response.results.length : response.pages.filter((p) => p.status === "ok").length) : 0,
        fields,
        requestId: !!response?.requestId,
        cost: { usd: cost?.usd ?? null, source: cost?.source ?? "none", credits: used, boundUsd: res.boundUsd },
        warnings: (response?.warnings ?? []).map((w) => w.code),
        raw: file,
      };
      if (response && "pages" in response) {
        for (const p of response.pages.filter((x) => x.status === "failed")) {
          stopped.push({ provider, severity: p.error?.code === "missing" ? "error" : "warn", where: "contents.response.pages", message: p.error?.code === "missing" ? "no page in the response matched the requested URL: check contents.response.pages[].fields.url" : `the page failed (${p.error?.code ?? "no code"})` });
        }
      }
      calls.push(call);
      if (overrun) { stopped.push({ provider, severity: "error", where: `${kind}.pricing`, message: o.budget.halted ?? "cost above its reservation" }); return; }
    }
  }));
  const order = new Map(o.providers.map((p, k) => [p, k]));
  calls.sort((a, b) => order.get(a.provider)! - order.get(b.provider)! || (a.kind === b.kind ? a.n - b.n : a.kind === "search" ? -1 : 1));
  const problems = [...smokeProblems(calls, o.registry), ...stopped].sort((a, b) => order.get(a.provider)! - order.get(b.provider)!);
  const report: SmokeReport = { mode: o.mode, at, dir: o.dir, providers: o.providers, calls, problems };
  writeJson(join(o.dir, "report.json"), report, 0o600);
  return report;
}

const SOURCE: Record<string, string> = { reported: "reported", "reported-credits": "reported credits", computed: "computed", unknown: "unknown", none: "none" };

/** The short table, then each provider's field paths, then the problems. */
export function formatSmoke(r: SmokeReport): string {
  const L: string[] = [];
  L.push(`smoke check (${r.mode === "live" ? "LIVE" : "FIXTURE: synthetic recorded-shape responses, not a live check"}) at ${r.at}`);
  L.push(`raw responses: ${r.dir}`);
  L.push("");
  L.push(`${"provider".padEnd(10)} ${"call".padEnd(10)} ${"http".padEnd(5)} ${"ms".padStart(6)} ${"n".padStart(3)}  ${"cost".padEnd(30)} ${"bound".padEnd(8)} error`);
  for (const c of r.calls) {
    const cost = c.cost.usd === null ? `unknown (${SOURCE[c.cost.source] ?? c.cost.source})` : `$${c.cost.usd.toFixed(4)} ${SOURCE[c.cost.source] ?? c.cost.source}`;
    const cr = c.cost.credits !== null ? `, ${c.cost.credits} cr` : "";
    L.push(`${c.provider.padEnd(10)} ${`${c.kind} ${c.n}`.padEnd(10)} ${String(c.status ?? "-").padEnd(5)} ${String(c.latencyMs).padStart(6)} ${String(c.results).padStart(3)}  ${(cost + cr).padEnd(30)} ${(c.cost.boundUsd === null ? "none" : `$${c.cost.boundUsd.toFixed(4)}`).padEnd(8)} ${c.error ? c.error.code : ""}`);
  }
  L.push("");
  L.push("field paths the spec maps (present / looked at, over the provider's successful calls):");
  for (const p of r.providers) {
    for (const kind of ["search", "contents"] as const) {
      const sums = new Map<string, { path: string; present: number; of: number }>();
      for (const c of r.calls.filter((x) => x.provider === p && x.kind === kind && x.outcome === "ok")) {
        for (const f of c.fields) {
          const s = sums.get(f.field) ?? { path: f.path, present: 0, of: 0 };
          s.present += f.present;
          s.of += f.of;
          sums.set(f.field, s);
        }
      }
      if (!sums.size) continue;
      const parts = [...sums.entries()].map(([field, s]) => `${field.replace(/^(search|contents)\.(response\.)?/, "")} (${s.path}) ${s.present}/${s.of}`);
      L.push(`  ${p.padEnd(10)} ${kind}: ${parts.join("; ")}`);
    }
  }
  L.push("");
  if (!r.problems.length) L.push("no spec problems found");
  else {
    L.push("problems (error: fix before the full run; warn: check; note: for information):");
    for (const x of r.problems) L.push(`  ${x.severity.padEnd(5)} ${x.provider.padEnd(10)} ${x.where}: ${x.message}`);
  }
  return L.join("\n");
}

/** What a smoke check may cost at most: each call's reservation (the SDK's cost bound), and credits for credit-priced providers. */
export function smokePlan(registry: Readonly<Record<string, ProviderSpec>>, providers: readonly string[], searches: number, method: Method) {
  const rows = providers.flatMap((provider) => {
    const spec = registry[provider]!;
    const kinds: { kind: "search" | "contents"; calls: number; count: number }[] = [
      { kind: "search", calls: searches, count: method.search.maxResults },
      ...(spec.contents ? [{ kind: "contents" as const, calls: 1, count: 1 }] : []),
    ];
    return kinds.map(({ kind, calls, count }) => {
      const r = reservation(spec, kind, count, {}, method);
      return { provider, kind, calls, perCallUsd: r.usd, basis: r.basis, credits: creditReservation(spec, kind, count, {}) };
    });
  });
  const maxUsd = rows.reduce((a, r) => a + r.calls * r.perCallUsd, 0);
  const credits: Record<string, number> = {};
  for (const r of rows) if (r.credits !== null) credits[r.provider] = (credits[r.provider] ?? 0) + r.calls * r.credits;
  return { rows, maxUsd, credits };
}

export function formatSmokePlan(p: ReturnType<typeof smokePlan>, capUsd: number): string {
  const L = ["smoke check plan (dry run: nothing is sent yet)"];
  for (const r of p.rows) {
    const credits = r.credits !== null ? `, ${r.calls * r.credits} credits` : "";
    L.push(`  ${r.provider.padEnd(10)} ${r.kind.padEnd(9)} ${r.calls} x $${r.perCallUsd.toFixed(4)} (${r.basis})${credits}`);
  }
  L.push(`maximum possible spend $${p.maxUsd.toFixed(4)}; smoke cap $${capUsd.toFixed(2)}`);
  return L.join("\n");
}
