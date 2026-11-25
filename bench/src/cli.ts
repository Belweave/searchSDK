// searchSDK Benchmarks command line. Run `node src/cli.ts help`.
import { createInterface } from "node:readline/promises";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { committedProblems, describeFile, itemProblems, loadItems, makePrivate, MANIFEST_PATH, writePrivateManifest, type Item } from "./dataset/items.ts";
import { applyReview, type BuildSpec, type Review } from "./dataset/review.ts";
import { buildFromWikidata } from "./dataset/wikidata.ts";
import { FIXTURE_PROVIDERS } from "./fixtures.ts";
import { labelSession } from "./human.ts";
import { keyReport, keysFileReport, withoutJudging } from "./keys.ts";
import { createJudge, loadJudgeConfig } from "./judge/judge.ts";
import { writeOutputs } from "./publish/publish.ts";
import { Budget, poolUsage } from "./run/budget.ts";
import { loadMethod, loadRunConfig, type RunConfig } from "./run/config.ts";
import { formatPlan, loadRunItems, makePlan, runsDir } from "./run/plan.ts";
import { runPaths } from "./run/records.ts";
import { runJudge, runPages, runSearch, type StopReason } from "./run/runner.ts";
import { createClient, registry as builtInRegistry, type ProviderSpec } from "./sdk.ts";
import { scoreRun, type Scores } from "./score/score.ts";
import { formatSmoke, formatSmokePlan, runSmoke, smokePlan } from "./smoke.ts";
import { shapeFetch } from "./smoke-fixtures.ts";
import { ledgerPath, liveGuards, openSession, type RunMeta, type Session } from "./session.ts";
import { loadTuning, select, tuningRunConfig, withTuned, type Selection } from "./tune.ts";
import { BENCH_DIR, isoDate, readJson, storeDir, usd, writeJson, writeJsonl } from "./util/core.ts";

const HELP = `searchSDK Benchmarks

  keys     --config <run.json> | --providers a,b [--no-judge] [--file <keys.env>]   which key variables are present; names only
  smoke    --config <run.json> | --providers a,b [--searches 2] [--cap 0.10] [--live --confirm-spend <cap>]
           2 or 3 searches and 1 contents call per provider: status, latency, fields found per spec path, cost vs bound
  plan     --config <run.json> [--tuned <selection.json>] [--no-judge]   print the calls and the maximum spend; sends nothing
  pilot    --config <run.json> [--no-judge] [--live --confirm-spend <cap>]   plan, confirm, search, fetch pages, judge, score
  run      --config <run.json> [--tuned <sel>] [--no-judge] [--live --confirm-spend <cap>] [--resume <runId>]
  score    --run <runId>                                        print scores (local)
  label    --run <runId> [--n 120] [--labeller name]            human check: grade judged pairs blind
  publish  --run <runId> [--out <dir>]                          write results, leaderboard and routing table
  tune     --tuning <tuning.json> --providers a,b [--live --confirm-spend <cap>]
  dataset  validate | build --spec <spec.json> | review --spec <spec.json> | private --from <file> --version <v>

Without --live, runs use synthetic fixture providers and a synthetic judge, and every output is marked "fixture".
--no-judge runs known-answer scoring only, by choice; the run is named <name>-notjudged and every output says "not judged".
Keys: node --env-file=<keys.env> src/cli.ts ... loads them (KEY=value lines, mode 600, git-ignored); nothing prints them.
Live runs need BENCH_ALLOW_LIVE=1, provider keys in their documented variables, and --confirm-spend equal to the cap.
Local data (raw responses, pages, labels, ledger, private items) lives in ${storeDir()}.`;

function args(argv: string[]): { cmd: string; sub?: string; flags: Record<string, string | true> } {
  const [cmd = "help", ...rest] = argv;
  const flags: Record<string, string | true> = {};
  let sub: string | undefined;
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i]!;
    if (a.startsWith("--")) {
      const next = rest[i + 1];
      if (next !== undefined && !next.startsWith("--")) { flags[a.slice(2)] = next; i++; } else flags[a.slice(2)] = true;
    } else if (sub === undefined) sub = a;
  }
  return { cmd, ...(sub ? { sub } : {}), flags };
}

const str = (f: Record<string, string | true>, k: string): string | undefined => (typeof f[k] === "string" ? (f[k] as string) : undefined);
const need = (f: Record<string, string | true>, k: string): string => {
  const v = str(f, k);
  if (!v) throw new Error(`--${k} is required`);
  return v;
};

function configFrom(f: Record<string, string | true>): RunConfig {
  let c = loadRunConfig(need(f, "config"));
  const tuned = str(f, "tuned");
  if (tuned) c = withTuned(c, readJson<Selection>(resolve(tuned)));
  // An explicit choice, never a silent fallback when the judge key is missing.
  if (f["no-judge"] === true) c = withoutJudging(c);
  return c;
}

/** The explicit confirmation step: --confirm-spend must repeat the cap, or the owner types it. */
async function confirmSpend(cap: number, f: Record<string, string | true>, maxUsd: number): Promise<boolean> {
  const given = str(f, "confirm-spend");
  if (given !== undefined) return Number(given) === cap;
  if (!process.stdin.isTTY) return false;
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const a = await rl.question(`This run may spend up to ${usd(Math.min(cap, maxUsd))} (cap ${usd(cap)}). Type the cap (${cap}) to start: `);
  rl.close();
  return Number(a.trim()) === cap;
}

/** Credits each limited provider has already used in the ledger (smoke checks and earlier runs included). */
function creditsUsed(config: RunConfig): Record<string, number> {
  return Object.fromEntries(Object.entries(config.providerLimits ?? {}).map(([id, l]) => [id, poolUsage(ledgerPath(), id, l.since).credits]));
}

/** The primary and check judges a run uses, or nulls when it judges nothing. */
function judgesFor(config: RunConfig, method: ReturnType<typeof loadMethod>, opts: { fetch: typeof fetch; env: Record<string, string | undefined> }) {
  if (config.judgeItems <= 0) return { judge: null, checkJudge: null };
  return {
    judge: createJudge(method.judge.id, method.judge.rubric, opts),
    checkJudge: method.judge.checkId ? createJudge(method.judge.checkId, method.judge.rubric, opts) : null,
  };
}

async function prepareLive(config: RunConfig, f: Record<string, string | true>): Promise<void> {
  const method = loadMethod();
  const judgeKey = config.judgeItems > 0 ? loadJudgeConfig(method.judge.id).keyEnv : null;
  const checkKey = config.judgeItems > 0 && method.judge.checkId ? loadJudgeConfig(method.judge.checkId).keyEnv : null;
  const problems = liveGuards({ env: process.env, registry: builtInRegistry as unknown as Record<string, ProviderSpec>, config, method, judgeKeyEnv: judgeKey, checkJudgeKeyEnv: checkKey });
  if (problems.length) throw new Error(`live run refused:\n  ${problems.join("\n  ")}`);
  const items = loadRunItems(config);
  const { judge, checkJudge } = judgesFor(config, method, { fetch: globalThis.fetch, env: process.env });
  const plan = makePlan({ config, method, items, registry: builtInRegistry as unknown as Record<string, ProviderSpec>, judge, checkJudge });
  const month = new Budget({ ledgerPath: ledgerPath(), runId: "plan", runCapUsd: config.capUsd, monthlyCapUsd: method.budget.monthlyCapUsd, ...(config.creditsUsd ? { creditsUsd: config.creditsUsd } : {}) });
  console.log(formatPlan(plan, { mode: "live", monthCashUsd: month.monthCashUsd(), monthlyCapUsd: method.budget.monthlyCapUsd, creditsUsed: creditsUsed(config), ...(config.creditsUsd ? { credits: config.creditsUsd } : {}) }));
  if (!(await confirmSpend(config.capUsd, f, plan.maxUsd))) throw new Error(`not confirmed: pass --confirm-spend ${config.capUsd} to accept the cap`);
}

function session(config: RunConfig, f: Record<string, string | true>): Session {
  const live = f.live === true;
  const resume = str(f, "resume");
  if (!live) {
    // Fixture mode swaps every provider for the synthetic set; nothing real is called.
    config = { ...config, providers: Object.keys(FIXTURE_PROVIDERS) };
    console.error(`FIXTURE mode: synthetic providers ${config.providers.join(", ")} and a synthetic judge. Add --live for real providers.`);
  }
  return openSession({ config, mode: live ? "live" : "fixture", ...(resume ? { runId: resume } : {}) });
}

async function execute(s: Session): Promise<StopReason> {
  const ac = new AbortController();
  const onSignal = () => { console.error("\nstopping: finishing in-flight calls; resume with --resume", s.runId); ac.abort(); };
  process.once("SIGINT", onSignal);
  process.once("SIGTERM", onSignal);
  const ctx = { ...s, signal: ac.signal, log: (l: string) => console.error(l) };
  console.error(`run ${s.runId} (${s.mode}) in ${s.dir}`);
  let r = await runSearch(ctx);
  console.error(`search: ${r}; spent ${usd(s.budget.runCashUsd(), 4)}`);
  if (r === "done") { r = await runPages(ctx); console.error(`pages: ${r}; spent ${usd(s.budget.runCashUsd(), 4)}`); }
  if (r === "done") { r = await runJudge(ctx); console.error(`judge: ${r}; spent ${usd(s.budget.runCashUsd(), 4)}`); }
  if (s.budget.halted) console.error(`HALTED: ${s.budget.halted}`);
  process.removeListener("SIGINT", onSignal);
  process.removeListener("SIGTERM", onSignal);
  return r;
}

function loadRun(runId: string): { meta: RunMeta; dir: string; items: Item[]; s: Session } {
  const dir = join(runsDir(), runId);
  const meta = readJson<RunMeta>(runPaths(dir).run);
  const s = openSession({ config: meta.config, mode: meta.mode, runId, method: meta.method, env: {} });
  return { meta, dir, items: s.items, s };
}

function report(scores: Scores, config?: RunConfig): string {
  const L: string[] = [];
  if (config?.notJudged) L.push("NOT JUDGED (--no-judge): known-answer scoring only; no judged relevance in this run.");
  const f = (x: number) => (Number.isFinite(x) ? x.toFixed(2) : "  - ");
  for (const profile of [...new Set(scores.profiles.map((p) => p.profile))]) {
    L.push(`\nprofile ${profile}: ${scores.pairedN[profile]} paired items (${scores.droppedItems[profile]} dropped)`);
    L.push("group  provider          known-answer [95% CI]   judged   usable  p50 ms  $/query   retest");
    const rows = scores.profiles.filter((p) => p.profile === profile).sort((a, b) => (a.rank?.position ?? 99) - (b.rank?.position ?? 99));
    for (const p of rows) {
      const g = p.rank ? `${p.rank.group}${p.rank.tied ? "=" : " "}${p.rank.reliable ? " " : "!"}` : "n/a";
      L.push(`${g.padEnd(6)} ${p.provider.padEnd(17)} ${f(p.knownAnswer.mean)} [${f(p.knownAnswer.lo)}, ${f(p.knownAnswer.hi)}]   ${p.judged ? f(p.judged.mean) : " -  "}     ${f(p.reliability.usableRate)}   ${String(p.latencyMs.p50).padStart(6)}  ${p.cost.perQueryUsd === null ? "unknown" : p.cost.perQueryUsd.toFixed(4)}${p.cost.known ? " " : "*"}  ${p.retest ? `${f(p.retest.agreement)} agree, URL overlap ${f(p.retest.urlJaccard)}` : ""}`);
    }
  }
  L.push("\n= tied group, ! unreliable (ranked below dependable providers), * some costs unknown");
  const t = scores.timing;
  if (t.items) L.push(`timing: providers queried for the same item within ${(t.p50Ms / 1000).toFixed(1)} s (median), ${(t.p95Ms / 1000).toFixed(1)} s (p95), ${(t.maxMs / 1000).toFixed(1)} s (max) of each other`);
  const pg = scores.pages;
  if (pg.urls) {
    const why = Object.entries(pg.reasons).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(", ");
    L.push(`pages: ${pg.read} of ${pg.urls} top URLs read by the harness's own fetcher; unreadable ${f(pg.unreadableRate ?? 0)}${why ? ` (${why})` : ""}, counted alike for every provider`);
  }
  if (scores.agreement) {
    const a = scores.agreement;
    L.push(`judge: ${a.judged}/${a.pairs} pairs graded; self-consistency kappa ${a.self.kappa ? f(a.self.kappa.mean) : "n/a"} (n ${a.self.n}); judge-human kappa ${a.human.kappa ? f(a.human.kappa.mean) : "n/a"} (n ${a.human.n}); judged scores ${a.publishJudged ? "publishable" : `withheld: ${a.gateReason}`}`);
    if (a.cross) {
      const checks = scores.profiles.filter((p) => p.profile === "default" && p.judgedCheck).map((p) => `${p.provider} ${f(p.judgedCheck!.mean)}`).join(", ");
      L.push(`check judge ${a.cross.judge}: cross-judge kappa ${a.cross.kappa ? f(a.cross.kappa.mean) : "n/a"} (n ${a.cross.n}); judged under it: ${checks || "n/a"}`);
    }
  }
  return L.join("\n");
}

/** `bench smoke`: a few real calls per provider (or recorded-shape fixtures without --live), under a cents-sized cap. */
async function smoke(flags: Record<string, string | true>): Promise<void> {
  const method = loadMethod();
  const providersFlag = str(flags, "providers");
  const config = str(flags, "config") ? configFrom(flags) : null;
  const providers = providersFlag ? providersFlag.split(",").map((x) => x.trim()).filter(Boolean) : config?.providers;
  if (!providers?.length) throw new Error("smoke: pass --config <run.json> or --providers a,b");
  const reg = builtInRegistry as unknown as Record<string, ProviderSpec>;
  for (const p of providers) if (!reg[p]?.search) throw new Error(`smoke: ${p} is not a registry provider with search`);
  const searches = Number(str(flags, "searches") ?? 2);
  if (!Number.isInteger(searches) || searches < 1 || searches > 3) throw new Error("--searches: 1 to 3");
  const cap = Number(str(flags, "cap") ?? 0.1);
  if (!(cap > 0) || cap > 1) throw new Error("--cap: a smoke cap above $0 and at most $1");
  const plan = smokePlan(reg, providers, searches, method);
  console.log(formatSmokePlan(plan, cap));
  if (plan.maxUsd > cap) throw new Error(`the smoke check could spend ${usd(plan.maxUsd, 4)}, above --cap ${cap}`);
  const live = flags.live === true;
  if (live) {
    const problems = liveGuards({ env: process.env, registry: reg, config: { providers, judgeItems: 0 } as unknown as RunConfig, method, judgeKeyEnv: null });
    if (problems.length) throw new Error(`live smoke check refused:\n  ${problems.join("\n  ")}`);
    if (!(await confirmSpend(cap, flags, plan.maxUsd))) throw new Error(`not confirmed: pass --confirm-spend ${cap} to accept the smoke cap`);
  } else console.error("FIXTURE mode: synthetic recorded-shape responses; nothing is sent. Add --live to check the real APIs.");
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\..*$/, "").replace("T", "-");
  const dir = join(storeDir(), "smoke", live ? stamp : `${stamp}-fixture`);
  // Live smoke calls go in the month-wide ledger, so they count against the monthly cap and any provider limit.
  const budget = new Budget({
    ledgerPath: live ? ledgerPath() : join(dir, "fixture-ledger.jsonl"), runId: `smoke-${stamp}${live ? "" : "-fixture"}`, runCapUsd: cap,
    monthlyCapUsd: method.budget.monthlyCapUsd, ...(config?.providerLimits ? { providerLimits: config.providerLimits } : {}),
  });
  const client = live
    ? createClient<string>({ env: process.env })
    : createClient<string>({ keys: Object.fromEntries(providers.map((p) => [p, "fixture-key"])), fetch: shapeFetch() });
  const report = await runSmoke({ mode: live ? "live" : "fixture", providers, registry: reg, client, budget, method, dir, searches });
  console.log(formatSmoke(report));
  console.log(live
    ? `\nspent ${usd(budget.runCashUsd(), 4)} of the ${usd(cap)} smoke cap`
    : `\nfixture: nothing was spent (a live check would have counted ${usd(budget.runCashUsd(), 4)} against the ${usd(cap)} cap)`);
  if (report.problems.some((p) => p.severity === "error")) process.exitCode = 2;
}

async function main(): Promise<void> {
  const { cmd, sub, flags } = args(process.argv.slice(2));
  switch (cmd) {
    case "keys": {
      const method = loadMethod();
      const providers = str(flags, "providers");
      const config = providers
        ? { providers: providers.split(",").map((x) => x.trim()).filter(Boolean), judgeItems: 0 }
        : configFrom(flags);
      const r = keyReport(config, method, builtInRegistry as unknown as Record<string, ProviderSpec>, process.env, { noJudge: flags["no-judge"] === true });
      console.log(r.text);
      const file = str(flags, "file");
      if (file) console.log(keysFileReport(resolve(file)));
      if (!r.ok) process.exitCode = 1;
      return;
    }
    case "smoke": {
      await smoke(flags);
      return;
    }
    case "plan": {
      const config = configFrom(flags);
      const method = loadMethod();
      const items = loadRunItems(config);
      const { judge, checkJudge } = judgesFor(config, method, { fetch: () => Promise.reject(new Error("plan sends nothing")), env: {} });
      const plan = makePlan({ config, method, items, registry: builtInRegistry as unknown as Record<string, ProviderSpec>, judge, checkJudge });
      const text = formatPlan(plan, { mode: "live", monthlyCapUsd: method.budget.monthlyCapUsd, creditsUsed: creditsUsed(config), ...(config.creditsUsd ? { credits: config.creditsUsd } : {}) });
      if (flags.quiet !== true) console.log(text);
      if (plan.maxUsd > method.budget.monthlyCapUsd && flags.quiet === true) throw new Error("plan exceeds the monthly cap");
      return;
    }
    case "pilot":
    case "run": {
      const config = configFrom(flags);
      if (flags.live === true) await prepareLive(config, flags);
      const s = session(config, flags);
      const r = await execute(s);
      if (cmd === "pilot" || r === "done") {
        const scores = scoreRun(s.dir, { config: s.config, method: s.method, items: s.items, judgeItemIds: s.plan.judgeItemIds });
        writeJson(runPaths(s.dir).scores, scores, 0o600);
        console.log(report(scores, s.config));
        console.log(`\nspent ${usd(s.budget.runCashUsd(), 4)} of the ${usd(s.config.capUsd)} cap. Next: bench label --run ${s.runId}, then bench publish --run ${s.runId}`);
      }
      if (r !== "done") process.exitCode = 2;
      return;
    }
    case "score": {
      const { meta, dir, items, s } = loadRun(need(flags, "run"));
      const scores = scoreRun(dir, { config: meta.config, method: meta.method, items, judgeItemIds: s.plan.judgeItemIds });
      writeJson(runPaths(dir).scores, scores, 0o600);
      console.log(report(scores, meta.config));
      return;
    }
    case "label": {
      const { meta, dir, items, s } = loadRun(need(flags, "run"));
      const rl = createInterface({ input: process.stdin, output: process.stdout });
      const r = await labelSession({
        dir, config: meta.config, method: meta.method, plan: s.plan, items, target: Number(str(flags, "n") ?? meta.method.gate.minHumanLabels + 20),
        labeller: str(flags, "labeller") ?? "owner", judgeId: meta.judge?.id ?? null, io: { ask: (p) => rl.question(p), say: (t) => console.log(t) },
      });
      rl.close();
      console.log(`${r.labelled} labelled this session; ${r.total} in total.`);
      return;
    }
    case "publish": {
      const runId = need(flags, "run");
      const { meta, dir, items, s } = loadRun(runId);
      const scores = scoreRun(dir, { config: meta.config, method: meta.method, items, judgeItemIds: s.plan.judgeItemIds });
      const out = resolve(str(flags, "out") ?? runPaths(dir).publish);
      const { files } = writeOutputs({
        dir, mode: meta.mode, runId, config: meta.config, method: meta.method, items, registry: s.registry, judge: meta.judge, checkJudge: meta.checkJudge ?? null,
        scores, startedAt: meta.createdAt, finishedAt: new Date().toISOString(),
      }, out);
      console.log(`wrote ${files.join(", ")}${meta.mode === "fixture" ? "\nFIXTURE run: synthetic providers; never present these as live results." : ""}`);
      return;
    }
    case "tune": {
      const t = loadTuning(need(flags, "tuning"));
      const method = loadMethod();
      const providers = need(flags, "providers").split(",").map((x) => x.trim()).filter(Boolean);
      const reg = builtInRegistry as unknown as Record<string, ProviderSpec>;
      const { config, rejected } = tuningRunConfig(t, reg, method, providers);
      if (flags.live === true) await prepareLive(config, flags);
      const s = session(config, flags);
      const r = await execute(s);
      const scores = scoreRun(s.dir, { config: s.config, method: s.method, items: s.items, judgeItemIds: [] });
      const sel = select(s.runId, s.config, scores, s.registry, s.method, t, rejected);
      const path = join(storeDir(), "tuning", `${s.runId}.json`);
      writeJson(path, sel);
      console.log(report(scores));
      console.log(`\nselection: ${path}${r !== "done" ? ` (run stopped: ${r})` : ""}`);
      return;
    }
    case "dataset": {
      if (sub === "validate") {
        const problems = committedProblems();
        if (problems.length) throw new Error(`dataset problems:\n  ${problems.join("\n  ")}`);
        const m = readJson<{ datasets: { file: string; count: number }[] }>(MANIFEST_PATH);
        console.log(`datasets valid: ${m.datasets.map((d) => `${d.file} (${d.count})`).join(", ")}`);
        return;
      }
      if (sub === "build") {
        if (process.env.BENCH_TEST) throw new Error("dataset build queries Wikidata; not in tests");
        const spec = readJson<BuildSpec>(resolve(need(flags, "spec")));
        const items = await buildFromWikidata({ templates: spec.templates, seed: spec.seed, today: str(flags, "today") ?? isoDate(Date.now()), fetch: globalThis.fetch, idPrefix: "cand", log: (l) => console.error(l) });
        const out = join(storeDir(), "candidates", `${spec.name}-${spec.version}.jsonl`);
        writeJsonl(out, items);
        console.log(`${items.length} candidates in ${out}; review them, then run: dataset review --spec <spec>`);
        return;
      }
      if (sub === "review") {
        const specPath = resolve(need(flags, "spec"));
        const spec = readJson<BuildSpec>(specPath);
        const cands = loadItems(join(storeDir(), "candidates", `${spec.name}-${spec.version}.jsonl`));
        const review = readJson<Review>(join(BENCH_DIR, "datasets", "review", `${spec.name}-${spec.version}.json`));
        const items = applyReview(cands, review, spec.split === "fresh" ? "fresh" : "pub");
        const problems = itemProblems(items, { committed: true });
        if (problems.length) throw new Error(`reviewed set has problems:\n  ${problems.join("\n  ")}`);
        const file = `datasets/${spec.split === "fresh" ? "fresh" : "public"}/${spec.name}-${spec.version}.jsonl`;
        writeJsonl(join(BENCH_DIR, file), items);
        const m = existsSync(MANIFEST_PATH) ? readJson<{ schema: string; datasets: ReturnType<typeof describeFile>[] }>(MANIFEST_PATH) : { schema: "dataset-manifest/1", datasets: [] };
        m.datasets = [...m.datasets.filter((d) => d.file !== file), describeFile(spec.name, spec.version, file)].sort((a, b) => a.file.localeCompare(b.file));
        writeJson(MANIFEST_PATH, m);
        console.log(`${items.length} items in ${file}; manifest updated`);
        return;
      }
      if (sub === "private") {
        const from = resolve(need(flags, "from"));
        const version = need(flags, "version");
        const items = loadItems(from);
        const { file, hashes } = makePrivate(items, version);
        writePrivateManifest(version, hashes, isoDate(Date.now()));
        console.log(`${hashes.length} private items in ${file} (local only); hashes in datasets/private-manifest.json`);
        return;
      }
      throw new Error("dataset: validate, build, review or private");
    }
    default:
      console.log(HELP);
  }
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : String(e));
  process.exitCode = 1;
});
