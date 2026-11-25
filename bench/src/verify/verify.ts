// Live conformance (registry/README.md, Versions): replays a provider's
// conformance vectors against the live API through each runtime, so an
// endpoint's `verification` can move from "unverified" to "verified" on
// evidence rather than on reading docs.
//
// Every vector falls in one of three classes:
// - local: the vector expects nothing to be sent (validation, unsupported
//   input). The runtimes' offline suites already run it; nothing is sent live.
// - scripted failure: the vector scripts a provider failure (a non-2xx status,
//   a network failure, a delay, an abort) that cannot be produced on demand.
//   It stays covered by the offline suites only, and the report lists it.
// - replay: the vector scripts a 2xx reply. The same call is sent live, and:
//   1. the runtime sends exactly the request the vector expects (key redacted);
//   2. the provider answers 2xx and the call has the vector's outcome
//      (success, the same page statuses and page error codes);
//   3. when the synthetic body carries the reported-cost path, the live cost
//      comes from the same source; the live cost is within the SDK's bound;
//   4. when the vector expects a request id, the live response has one;
//   5. over all replays of the endpoint, every spec path the synthetic bodies
//      resolve is resolved by at least one live body.
// An endpoint passes in a runtime when every replay passes every check; it is
// verified when it passes in every runtime. A vector whose placeholder input
// cannot behave live as scripted (example.com/page is a 404 live) is replayed
// with a published override (registry/conformance/live.json), applied to the
// expected request as well.
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { pathReport } from "../../../sdk/typescript/src/diagnostics.ts";
import { jsonEqual } from "../../../sdk/typescript/src/json.ts";
import type { Budget } from "../run/budget.ts";
import type { Method } from "../run/config.ts";
import { attemptsCredits, creditReservation, reservation } from "../run/pricing.ts";
import { attemptsCost } from "../run/runner.ts";
import { costBound, createClient, policy, SearchError, type Attempt, type ProviderSpec } from "../sdk.ts";

export type Runtime = "typescript" | "python";
export const RUNTIMES: readonly Runtime[] = ["typescript", "python"];

/** A conformance vector case, as much of it as live replay reads. */
export interface VectorCase {
  name: string;
  call: "search" | "contents";
  query?: unknown;
  urls?: unknown;
  options?: Record<string, unknown>;
  client?: Record<string, unknown>;
  abortAt?: unknown;
  responses?: { status?: number; body?: unknown; network?: boolean; delayMs?: number; bodyDelayMs?: number; bodyFailAtMs?: number }[];
  expect: {
    requestCount?: number;
    requests?: { method?: string; url?: string; headers?: Record<string, string>; body?: unknown; bodyIncludes?: Record<string, unknown> }[];
    response?: Record<string, unknown>;
    responseIncludes?: Record<string, unknown>;
    error?: Record<string, unknown> | null;
  };
}

/** A published change to a vector's input for live replay, with its reason. */
export interface LiveOverride {
  urls?: string[];
  options?: Record<string, unknown>;
  /** Credits to reserve when the SDK cannot bound the call (an option with unpublished cost). */
  worstCredits?: number;
  reason: string;
}

export type CaseClass =
  | { kind: "local"; reason: string }
  | { kind: "scripted-failure"; reason: string }
  | { kind: "replay"; call: LiveCall; substitutions: [string, string][]; override: LiveOverride | null };

/** What is sent live. */
export interface LiveCall {
  call: "search" | "contents";
  query?: string;
  urls?: string[];
  options: Record<string, unknown>;
}

/** What one runtime returned for one live call, in the runtimes' shared JSON form. */
export interface LiveOutcome {
  response: Record<string, unknown> | null;
  error: { code: string; status: number | null; providerCode: string | null } | null;
  diagnostics: DiagEvent[];
}

export interface DiagEvent {
  attempt: Attempt<string>;
  request: { method: string; url: string; headers: Record<string, string>; body: string | null };
  response: { status: number; headers: Record<string, string>; body: string | null } | null;
  paths: { role: string; path: string; found: number; missing: number }[];
}

export interface Check {
  name: string;
  ok: boolean;
  detail?: string;
  /** Informational: recorded, never a failure (a result count depends on the live index, not on the spec). */
  soft?: boolean;
}

const is2xx = (s: number | undefined) => s !== undefined && s >= 200 && s < 300;

/** Decides how a vector is treated live. */
export function classifyCase(c: VectorCase, override?: LiveOverride | null): CaseClass {
  if (c.expect.requestCount === 0) return { kind: "local", reason: "nothing is sent; the offline suites run it" };
  const first = c.responses?.[0];
  if (!first) return { kind: "local", reason: "no scripted reply" };
  if (c.abortAt !== undefined) return { kind: "scripted-failure", reason: "scripts a cancellation" };
  if (first.network || first.delayMs || first.bodyDelayMs || first.bodyFailAtMs) return { kind: "scripted-failure", reason: "scripts a network failure or timing" };
  if (!is2xx(first.status)) return { kind: "scripted-failure", reason: `scripts HTTP ${first.status}, which cannot be produced on demand` };
  if ((c.responses?.length ?? 0) > 1) return { kind: "scripted-failure", reason: "scripts several replies (retries)" };
  if (c.client && Object.keys(c.client).length) return { kind: "scripted-failure", reason: "needs client settings the live replay does not use" };
  if (typeof c.query === "object" && c.query !== null) return { kind: "local", reason: "a generated query" };
  const vectorUrls = c.call === "contents" ? (Array.isArray(c.urls) ? (c.urls as string[]) : [c.urls as string]) : [];
  const urls = override?.urls ?? vectorUrls;
  const substitutions: [string, string][] = vectorUrls.map((u, i) => [u, urls[i] ?? u] as [string, string]).filter(([a, b]) => a !== b);
  const options = { ...(c.options ?? {}), ...(override?.options ?? {}) };
  const call: LiveCall = c.call === "search" ? { call: "search", query: String(c.query), options } : { call: "contents", urls, options };
  return { kind: "replay", call, substitutions, override: override ?? null };
}

function substitute(v: unknown, subs: readonly [string, string][]): unknown {
  if (typeof v === "string") return subs.find(([a]) => a === v)?.[1] ?? v;
  if (Array.isArray(v)) return v.map((x) => substitute(x, subs));
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, substitute(x, subs)]));
  return v;
}

const parseBody = (s: string | null): unknown => {
  if (s === null) return null;
  try {
    return JSON.parse(s);
  } catch {
    return s;
  }
};

/** The spec paths a vector's synthetic 2xx body resolves (found > 0), by role. */
export function syntheticRoles(spec: ProviderSpec, c: VectorCase): string[] {
  const body = c.responses?.[0]?.body;
  return pathReport(spec, c.call, body).filter((p) => p.found > 0).map((p) => p.role);
}

/** The checks for one replayed vector in one runtime. */
export function checkReplay(spec: ProviderSpec, c: VectorCase, cls: Extract<CaseClass, { kind: "replay" }>, out: LiveOutcome): Check[] {
  const checks: Check[] = [];
  const add = (name: string, ok: boolean, detail?: string) => checks.push({ name, ok, ...(detail ? { detail } : {}) });
  const sent = out.diagnostics;
  add("one request sent", sent.length === 1, `${sent.length} sent`);
  const ev = sent[0];
  const want = c.expect.requests?.[0];
  if (ev && want) {
    const auth = spec.auth.in === "header" ? spec.auth.name.toLowerCase() : null;
    if (want.method !== undefined) add("request method", ev.request.method === want.method, ev.request.method);
    if (want.url !== undefined) add("request url", ev.request.url === substitute(want.url, cls.substitutions), ev.request.url);
    if (want.headers !== undefined) {
      const expected = Object.fromEntries(Object.entries(want.headers).map(([k, v]) => [k.toLowerCase(), k.toLowerCase() === auth ? policy.diagnostics.redacted : v]));
      add("request headers", jsonEqual(ev.request.headers, expected), Object.keys(ev.request.headers).sort().join(","));
    }
    const body = parseBody(ev.request.body);
    if (want.body !== undefined) add("request body", jsonEqual(body, substitute(want.body, cls.substitutions)), JSON.stringify(body));
    for (const [k, v] of Object.entries(want.bodyIncludes ?? {})) {
      add(`request body.${k}`, jsonEqual((body as Record<string, unknown> | null)?.[k], substitute(v, cls.substitutions)));
    }
  }
  const status = ev?.response?.status;
  add("provider answered 2xx", is2xx(status), String(status ?? "no status"));
  const expected = (c.expect.response ?? c.expect.responseIncludes) as Record<string, unknown> | undefined;
  if (expected) {
    add("call succeeded", out.response !== null, out.error ? `${out.error.code}${out.error.status ? ` (HTTP ${out.error.status})` : ""}` : undefined);
    const r = out.response;
    if (r && c.call === "contents" && Array.isArray(expected.pages)) {
      const want = (expected.pages as { status: string; error?: { code: string | null } | null }[]).map((p) => `${p.status}:${p.error?.code ?? ""}`);
      const got = ((r.pages ?? []) as { status: string; error?: { code: string | null } | null }[]).map((p) => `${p.status}:${p.error?.code ?? ""}`);
      add("page statuses", jsonEqual(got, want), got.join(","));
    }
    if (r && c.call === "search" && Array.isArray(expected.results) && expected.results.length) {
      checks.push({ name: "results returned", ok: Array.isArray(r.results) && r.results.length > 0, detail: String((r.results as unknown[] | undefined)?.length ?? 0), soft: true });
    }
    const reportedPath = spec[c.call]?.cost?.reported?.path;
    const synthetic = c.responses?.[0]?.body;
    const expectedCost = expected.cost as { source?: string } | undefined;
    if (r && reportedPath && expectedCost?.source && pathReport(spec, c.call, synthetic).some((p) => p.role === "cost" && p.found > 0)) {
      const got = (r.cost as { source?: string } | undefined)?.source;
      add("cost source", got === expectedCost.source, String(got));
    }
    if (r && "requestId" in expected && expected.requestId !== null) add("request id", typeof r.requestId === "string" && r.requestId.length > 0);
  }
  const attempts = ((out.response?.attempts ?? []) as Attempt<string>[]).filter((a) => a.outcome !== "skipped");
  const cost = attempts.length ? attemptsCost(attempts) : 0;
  const count = c.call === "search" ? Number(cls.call.options.maxResults ?? policy.search.maxResults.default) : (cls.call.urls ?? []).length;
  const b = costBound(spec, c.call, c.call === "search"
    ? { maxResults: count, ...(cls.call.options.providerOptions ? { providerOptions: (cls.call.options.providerOptions as Record<string, unknown>)[spec.id] as Record<string, unknown> } : {}) }
    : { urls: count });
  if (b.usd !== null && cost !== null) add("cost within the SDK's bound", cost <= b.usd + 1e-12, `$${cost.toFixed(6)} of $${b.usd.toFixed(6)}`);
  return checks;
}

/** Endpoint-level path check: every role a synthetic body resolves must be resolved by some live body. */
export function pathChecks(spec: ProviderSpec, kind: "search" | "contents", replays: { c: VectorCase; out: LiveOutcome }[]): Check[] {
  const want = new Set(replays.flatMap(({ c }) => syntheticRoles(spec, c)));
  const found = new Map<string, number>();
  const seen = new Map<string, number>();
  for (const { out } of replays) {
    for (const ev of out.diagnostics) {
      for (const p of ev.paths) {
        found.set(p.role, (found.get(p.role) ?? 0) + p.found);
        seen.set(p.role, (seen.get(p.role) ?? 0) + p.found + p.missing);
      }
    }
  }
  return [...want].sort().map((role) => ({ name: `${kind} path ${role}`, ok: (found.get(role) ?? 0) > 0, detail: `${found.get(role) ?? 0}/${seen.get(role) ?? 0}` }));
}

/** Runs one call live in a runtime. */
export type Executor = (runtime: Runtime, call: LiveCall) => Promise<LiveOutcome>;

const HERE = dirname(fileURLToPath(import.meta.url));

/** The live executor: the TypeScript runtime in process, the Python runtime in a child process. */
export function liveExecutor(env: Record<string, string | undefined>, timeoutMs = 60_000): Executor {
  return async (runtime, call) => {
    if (runtime === "python") {
      const r = spawnSync("python3", ["-I", join(HERE, "live_case.py")], {
        input: JSON.stringify({ ...call, options: { ...call.options, timeoutMs } }), env: env as NodeJS.ProcessEnv, encoding: "utf8", maxBuffer: 64 * 1024 * 1024,
      });
      if (r.status !== 0) throw new Error(`python runtime failed (exit ${r.status}): ${(r.stderr ?? "").slice(0, 2000)}`);
      return JSON.parse(r.stdout) as LiveOutcome;
    }
    const diagnostics: DiagEvent[] = [];
    const client = createClient<string>({ env, diagnostics: (e) => diagnostics.push(e as unknown as DiagEvent) });
    try {
      const options = { ...call.options, timeoutMs } as never;
      const response = call.call === "search" ? await client.search(call.query!, options) : await client.contents(call.urls!, options);
      return { response: JSON.parse(JSON.stringify(response)) as Record<string, unknown>, error: null, diagnostics };
    } catch (e) {
      if (e instanceof SearchError) return { response: null, error: { code: e.code, status: e.status ?? null, providerCode: e.providerCode ?? null }, diagnostics };
      throw e;
    }
  };
}

export interface CaseResult {
  name: string;
  kind: CaseClass["kind"];
  reason?: string;
  override?: LiveOverride | null;
  runs: { runtime: Runtime; checks: Check[]; ok: boolean; status: number | null; credits: number | null; costUsd: number | null; requestId: boolean; rateLimitHeaders: Record<string, string> }[];
}

export interface EndpointResult {
  kind: "search" | "contents";
  cases: CaseResult[];
  paths: Record<Runtime, Check[]>;
  /** Per runtime: every replay passed every check and every path was found. */
  passed: Record<Runtime, boolean>;
  verified: boolean;
  /** Why the run stopped early, if it did; an endpoint that did not finish is never verified. */
  stopped: string | null;
}

export interface VerifyReport {
  mode: "live" | "fixture";
  provider: string;
  at: string;
  runtimes: Runtime[];
  endpoints: EndpointResult[];
  credits: number;
  spentUsd: number;
}

const RATE_HEADERS = /ratelimit|rate-limit|retry-after|concurren/i;

/**
 * Replays every vector of the provider's endpoints, one call at a time, at
 * least `intervalMs` apart. Each call reserves its cost bound (and credits)
 * in the shared ledger first; a call whose credits cannot be bounded is not
 * sent unless its override states a worst case, and the session stops before
 * passing `maxCredits`.
 */
export async function runVerify(o: {
  mode: "live" | "fixture";
  spec: ProviderSpec;
  vectors: VectorCase[];
  overrides: Record<string, LiveOverride>;
  kinds: ("search" | "contents")[];
  runtimes: Runtime[];
  execute: Executor;
  budget: Budget;
  method: Method;
  maxCredits: number;
  intervalMs: number;
  sleep?: (ms: number) => Promise<void>;
  log?: (line: string) => void;
  now?: () => number;
  /** Receives every live outcome (bodies included), for the local store only. */
  onOutcome?: (x: { kind: string; name: string; runtime: Runtime; call: LiveCall; outcome: LiveOutcome }) => void;
}): Promise<VerifyReport> {
  const sleep = o.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  let credits = 0;
  let spent = 0;
  let last = -Infinity;
  const clock = o.now ?? Date.now;
  const endpoints: EndpointResult[] = [];
  let stopped: string | null = null;
  for (const kind of o.kinds) {
    const cases: CaseResult[] = [];
    const replays: Record<Runtime, { c: VectorCase; out: LiveOutcome }[]> = { typescript: [], python: [] };
    for (const c of o.vectors.filter((v) => v.call === kind)) {
      const cls = classifyCase(c, o.overrides[c.name] ?? null);
      const result: CaseResult = { name: c.name, kind: cls.kind, ...(cls.kind !== "replay" ? { reason: cls.reason } : { override: cls.override }), runs: [] };
      cases.push(result);
      if (cls.kind !== "replay" || stopped) continue;
      for (const runtime of o.runtimes) {
        const count = kind === "search" ? Number(cls.call.options.maxResults ?? policy.search.maxResults.default) : cls.call.urls!.length;
        const providerOptions = (cls.call.options.providerOptions as Record<string, Record<string, unknown>> | undefined)?.[o.spec.id];
        const settings = providerOptions ? { providerOptions } : {};
        const res = reservation(o.spec, kind, count, settings, o.method);
        const cr = creditReservation(o.spec, kind, count, settings) ?? cls.override?.worstCredits ?? null;
        if (cr === null && o.spec[kind]?.pricing.creditUsd) { stopped = `${c.name}: its credits cannot be bounded and no worst case is given`; break; }
        if (cr !== null && credits + cr > o.maxCredits) { stopped = `the next call could pass the ${o.maxCredits}-credit limit (${credits} used)`; break; }
        const usdHold = cr !== null && o.spec[kind]?.pricing.creditUsd && res.boundUsd === null
          ? cr * (o.spec[kind]!.pricing.ceiling?.extraBlockUsd ?? o.spec[kind]!.pricing.extraBlock?.usd ?? o.method.budget.unknownPriceUsd)
          : res.usd;
        const wait = last + o.intervalMs - clock();
        if (wait > 0) await sleep(wait);
        const hold = o.budget.reserve(o.spec.id, kind, usdHold, cr);
        if (!hold) { stopped = o.budget.halted ?? "the verification cap would be passed"; break; }
        last = clock();
        o.log?.(`${kind} ${runtime}: ${c.name}`);
        let out: LiveOutcome;
        try {
          out = await o.execute(runtime, cls.call);
        } catch (e) {
          o.budget.commit(hold, null);
          stopped = `${runtime} runtime failed: ${e instanceof Error ? e.message : String(e)}`;
          break;
        }
        const attempts = ((out.response?.attempts ?? []) as Attempt<string>[]).filter((a) => a.outcome !== "skipped");
        const sentAttempts = attempts.length ? attempts : out.diagnostics.map((d) => d.attempt);
        const usd = sentAttempts.length ? attemptsCost(sentAttempts) : 0;
        const used = sentAttempts.length ? attemptsCredits(o.spec, kind, sentAttempts) : 0;
        if (o.budget.commit(hold, usd, used)) stopped = o.budget.halted ?? "a cost above its reservation";
        credits += used ?? cr ?? 0;
        spent += usd ?? hold.usd;
        const checks = checkReplay(o.spec, c, cls, out);
        const ev = out.diagnostics[0];
        const rateLimitHeaders = Object.fromEntries(Object.entries(ev?.response?.headers ?? {}).filter(([k]) => RATE_HEADERS.test(k)));
        result.runs.push({
          runtime, checks, ok: checks.every((x) => x.ok || x.soft), status: ev?.response?.status ?? null, credits: used, costUsd: usd,
          requestId: typeof out.response?.requestId === "string", rateLimitHeaders,
        });
        replays[runtime].push({ c, out });
        o.onOutcome?.({ kind, name: c.name, runtime, call: cls.call, outcome: out });
        if (stopped) break;
      }
    }
    const paths = { typescript: pathChecks(o.spec, kind, replays.typescript), python: pathChecks(o.spec, kind, replays.python) };
    const passed = Object.fromEntries(o.runtimes.map((rt) => {
      const replayed = cases.filter((x) => x.kind === "replay");
      const all = replayed.every((x) => x.runs.some((r) => r.runtime === rt) && x.runs.filter((r) => r.runtime === rt).every((r) => r.ok));
      return [rt, all && replayed.length > 0 && paths[rt].every((p) => p.ok)];
    })) as Record<Runtime, boolean>;
    endpoints.push({ kind, cases, paths, passed, verified: !stopped && o.runtimes.length === RUNTIMES.length && o.runtimes.every((rt) => passed[rt]), stopped });
  }
  return { mode: o.mode, provider: o.spec.id, at: new Date(clock()).toISOString(), runtimes: o.runtimes, endpoints, credits, spentUsd: spent };
}

/** The dry-run listing: each vector's class, and what a replay reserves. */
export function verifyPlan(spec: ProviderSpec, vectors: VectorCase[], overrides: Record<string, LiveOverride>, kinds: ("search" | "contents")[], runtimes: Runtime[], method: Method) {
  const rows = vectors.filter((v) => kinds.includes(v.call)).map((c) => {
    const cls = classifyCase(c, overrides[c.name] ?? null);
    if (cls.kind !== "replay") return { name: c.name, kind: c.call, cls: cls.kind, reason: cls.reason, calls: 0, usd: 0, credits: 0 as number | null };
    const count = c.call === "search" ? Number(cls.call.options.maxResults ?? policy.search.maxResults.default) : cls.call.urls!.length;
    const providerOptions = (cls.call.options.providerOptions as Record<string, Record<string, unknown>> | undefined)?.[spec.id];
    const settings = providerOptions ? { providerOptions } : {};
    const r = reservation(spec, c.call, count, settings, method);
    const cr = creditReservation(spec, c.call, count, settings) ?? cls.override?.worstCredits ?? null;
    return { name: c.name, kind: c.call, cls: cls.kind, reason: cls.override?.reason ?? "", calls: runtimes.length, usd: r.usd * runtimes.length, credits: cr === null ? null : cr * runtimes.length };
  });
  return { rows, calls: rows.reduce((a, r) => a + r.calls, 0), usd: rows.reduce((a, r) => a + r.usd, 0), credits: rows.some((r) => r.credits === null) ? null : rows.reduce((a, r) => a + (r.credits ?? 0), 0) };
}

export function formatVerify(r: VerifyReport): string {
  const L = [`live conformance (${r.mode === "live" ? "LIVE" : "FIXTURE: synthetic, not a live check"}) for ${r.provider} at ${r.at}, runtimes ${r.runtimes.join(", ")}`];
  for (const e of r.endpoints) {
    L.push("", `${e.kind}: ${e.verified ? "VERIFIED" : "not verified"}${e.stopped ? ` (stopped: ${e.stopped})` : ""}; ${r.runtimes.map((rt) => `${rt} ${e.passed[rt] ? "pass" : "fail"}`).join(", ")}`);
    for (const c of e.cases) {
      if (c.kind !== "replay") { L.push(`  - ${c.kind.padEnd(16)} ${c.name} (${c.reason})`); continue; }
      for (const run of c.runs) {
        const bad = run.checks.filter((x) => !x.ok && !x.soft).map((x) => `${x.name}${x.detail ? ` [${x.detail}]` : ""}`);
        const notes = run.checks.filter((x) => !x.ok && x.soft).map((x) => `${x.name}${x.detail ? ` [${x.detail}]` : ""}`);
        L.push(`  ${run.ok ? "+" : "x"} replay ${run.runtime.padEnd(10)} ${c.name}: HTTP ${run.status ?? "-"}, ${run.credits ?? "?"} credits${bad.length ? `; FAILED ${bad.join("; ")}` : ""}${notes.length ? `; note: ${notes.join("; ")} (informational)` : ""}`);
      }
      if (c.override) L.push(`      override: ${c.override.reason}`);
    }
    for (const rt of r.runtimes) {
      const bad = e.paths[rt].filter((p) => !p.ok);
      L.push(`  paths (${rt}): ${e.paths[rt].length - bad.length}/${e.paths[rt].length} found live${bad.length ? `; missing ${bad.map((p) => p.name).join(", ")}` : ""}`);
    }
  }
  L.push("", `credits used ${r.credits}; spent $${r.spentUsd.toFixed(4)}`);
  return L.join("\n");
}

/** The public summary: classes, checks, statuses and credits; no response text, no headers beyond rate-limit ones. */
export function publicSummary(r: VerifyReport) {
  return {
    schema: "live-conformance/1",
    provider: r.provider,
    at: r.at,
    mode: r.mode,
    runtimes: r.runtimes,
    credits: r.credits,
    endpoints: r.endpoints.map((e) => ({
      kind: e.kind, verified: e.verified, passed: e.passed, stopped: e.stopped,
      cases: e.cases.map((c) => ({
        name: c.name, class: c.kind, ...(c.reason ? { reason: c.reason } : {}), ...(c.override ? { override: c.override } : {}),
        runs: c.runs.map((x) => ({ runtime: x.runtime, ok: x.ok, status: x.status, credits: x.credits, requestId: x.requestId, rateLimitHeaders: x.rateLimitHeaders, checks: x.checks.map((k) => ({ name: k.name, ok: k.ok, ...(k.soft ? { soft: true } : {}), ...(k.name === "results returned" || k.name.startsWith("cost") ? { detail: k.detail } : {}) })) })),
      })),
      paths: e.paths,
    })),
  };
}
