// Opens a run (new or resumed) in live or fixture mode and wires the SDK
// client, judge, budget and plan together. Live mode is refused unless every
// guard passes; fixture mode never touches the network.
import { existsSync } from "node:fs";
import { join } from "node:path";
import type { Item } from "./dataset/items.ts";
import { FIXTURE_FETCHER, fixtureFetch, fixtureJudge, fixtureKeys, fixtureRegistry } from "./fixtures.ts";
import { createJudge, type Judge } from "./judge/judge.ts";
import { Budget } from "./run/budget.ts";
import { loadMethod, type Method, type RunConfig } from "./run/config.ts";
import { loadRunItems, makePlan, planHash, runsDir, type Plan } from "./run/plan.ts";
import { runPaths } from "./run/records.ts";
import { createClient, registry as builtInRegistry, type Client, type ProviderSpec } from "./sdk.ts";
import { readJson, storeDir, writeJson } from "./util/core.ts";

export type Mode = "live" | "fixture";

export interface Session {
  runId: string;
  dir: string;
  mode: Mode;
  config: RunConfig;
  method: Method;
  items: Item[];
  plan: Plan;
  registry: Readonly<Record<string, ProviderSpec>>;
  client: Client;
  judge: Judge | null;
  budget: Budget;
  createdAt: string;
}

export interface RunMeta {
  runId: string;
  mode: Mode;
  config: RunConfig;
  method: Method;
  planHash: string;
  createdAt: string;
  judge: Judge["info"] | null;
}

/** Reasons live mode must not start. Empty means every guard passed. */
export function liveGuards(o: { env: Record<string, string | undefined>; registry: Readonly<Record<string, ProviderSpec>>; config: RunConfig; method: Method; judgeKeyEnv: string | null }): string[] {
  const out: string[] = [];
  if (o.env.CI) out.push("CI is set: live runs never start from automated CI");
  if (o.env.BENCH_TEST) out.push("BENCH_TEST is set: tests never run live");
  if (o.env.BENCH_ALLOW_LIVE !== "1") out.push("set BENCH_ALLOW_LIVE=1 to allow provider calls");
  const needs = new Set(o.config.providers);
  if (o.config.pagePasses.length) needs.add(o.method.pages.fetcher);
  for (const id of needs) {
    const env = (o.registry[id]?.auth.env ?? []) as string[];
    if (!env.some((n) => (o.env[n] ?? "") !== "")) out.push(`${id}: no key in ${env.join(" or ")}`);
  }
  if (o.config.judgeItems > 0 && o.judgeKeyEnv && !o.env[o.judgeKeyEnv]) out.push(`judge: ${o.judgeKeyEnv} is not set`);
  return out;
}

export function ledgerPath(): string {
  return join(storeDir(), "ledger.jsonl");
}

export function openSession(o: {
  config: RunConfig;
  mode: Mode;
  runId?: string;
  env?: Record<string, string | undefined>;
  method?: Method;
  /** Fixture mode only: replaces the synthetic fetch (tests count calls with it). */
  fetch?: typeof fetch;
  judge?: Judge | null;
  now?: () => number;
  ledger?: string;
  /** Fixture registry behaviours (tests). */
  fixtureProviders?: Parameters<typeof fixtureRegistry>[0];
}): Session {
  const env = o.env ?? process.env;
  let method = o.method ?? loadMethod();
  const config = o.config;
  const items = loadRunItems(config);
  let registry: Readonly<Record<string, ProviderSpec>>;
  let client: Client;
  let judge: Judge | null;
  if (o.mode === "fixture") {
    const reg = fixtureRegistry(o.fixtureProviders);
    registry = reg as unknown as Record<string, ProviderSpec>;
    // Synthetic providers answer instantly; a 30-second pause after a synthetic 429 would only slow tests.
    method = { ...method, pages: { ...method.pages, fetcher: FIXTURE_FETCHER }, pacing: { ...method.pacing, rateLimitPauseMs: 0 } };
    client = createClient({ registry: reg, keys: fixtureKeys(reg) as never, fetch: o.fetch ?? fixtureFetch(items, o.fixtureProviders) });
    judge = o.judge === undefined ? fixtureJudge(items) : o.judge;
  } else {
    registry = builtInRegistry as unknown as Record<string, ProviderSpec>;
    judge = o.judge === undefined ? (config.judgeItems > 0 ? createJudge(method.judge.id, method.judge.rubric, { fetch: globalThis.fetch, env }) : null) : o.judge;
    client = createClient({ env });
  }
  const plan = makePlan({ config, method, items, registry, judge, checkCommitted: o.mode === "live" });
  const hash = planHash(plan, config);
  const now = o.now ?? Date.now;
  let runId = o.runId;
  let createdAt = new Date(now()).toISOString();
  if (runId) {
    const metaPath = runPaths(join(runsDir(), runId)).run;
    if (!existsSync(metaPath)) throw new Error(`no run ${runId} in ${runsDir()}`);
    const meta = readJson<RunMeta>(metaPath);
    if (meta.planHash !== hash) throw new Error(`run ${runId} was planned differently (items, settings or method changed); start a new run`);
    if (meta.mode !== o.mode) throw new Error(`run ${runId} is a ${meta.mode} run`);
    createdAt = meta.createdAt;
  } else {
    runId = `${config.name}-${createdAt.replace(/[-:]/g, "").replace(/\..*$/, "").replace("T", "-")}${o.mode === "fixture" ? "-fixture" : ""}`;
  }
  const dir = join(runsDir(), runId);
  const budget = new Budget({
    ledgerPath: o.ledger ?? (o.mode === "fixture" ? join(dir, "fixture-ledger.jsonl") : ledgerPath()),
    runId, runCapUsd: config.capUsd, monthlyCapUsd: method.budget.monthlyCapUsd,
    ...(config.creditsUsd ? { creditsUsd: config.creditsUsd } : {}), now,
  });
  if (!o.runId) {
    writeJson(runPaths(dir).run, { runId, mode: o.mode, config, method, planHash: hash, createdAt, judge: judge?.info ?? null } satisfies RunMeta, 0o600);
  }
  return { runId, dir, mode: o.mode, config, method, items, plan, registry, client, judge, budget, createdAt };
}
