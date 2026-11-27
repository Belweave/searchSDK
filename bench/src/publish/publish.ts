// Published outputs: the results file, per-attempt records, the leaderboard
// summary for the site, and the routing table. They carry scores, URLs,
// hashes, timings, costs and settings, never response or page text. Before
// anything is written, a leak check scans the serialized output for any text
// held in the run's raw store and for every private item.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { arch, platform } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { itemHash, MANIFEST_PATH, PRIVATE_MANIFEST_PATH, type Item } from "../dataset/items.ts";
import type { JudgeInfo } from "../judge/judge.ts";
import type { Method, RunConfig, Settings } from "../run/config.ts";
import { scopeOf, settingsFor } from "../run/plan.ts";
import { readAttemptLog, runPaths } from "../run/records.ts";
import type { ProviderSpec } from "../sdk.ts";
import type { Scores } from "../score/score.ts";
import { addDays, BENCH_DIR, readJson, readJsonl, REPO_DIR, round, writeJson, writeJsonl } from "../util/core.ts";
import { validate, type Schema } from "../util/schema.ts";

export const RANK_RULE = "Quality first, then reliability. Providers whose usable-response rate is confidently below the floor rank below all others. Within each band, a provider ties with the group leader unless the 95% paired-bootstrap interval of their known-answer difference excludes zero and the difference is at least the minimum separation. Cost and latency never affect rank.";

const SCHEMAS = ["results-1", "leaderboard-1", "routing-table-1"] as const;
export function loadSchema(name: (typeof SCHEMAS)[number]): Schema {
  return readJson<Schema>(join(BENCH_DIR, "schemas", `${name}.schema.json`));
}

interface Ctx {
  dir: string;
  mode: "live" | "fixture";
  runId: string;
  config: RunConfig;
  method: Method;
  items: Item[];
  registry: Readonly<Record<string, ProviderSpec>>;
  judge: JudgeInfo | null;
  checkJudge?: JudgeInfo | null;
  scores: Scores;
  startedAt: string;
  finishedAt: string;
}


function gitSha(): string | null {
  try {
    return execFileSync("git", ["-C", REPO_DIR, "rev-parse", "HEAD"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return null;
  }
}

const interval = (x: { mean: number; lo: number; hi: number }) => ({ mean: round(x.mean), ci95: [round(x.lo), round(x.hi)] as [number, number] });
const maybe = (x: { mean: number; lo: number; hi: number } | null | undefined) => (x && Number.isFinite(x.mean) ? interval(x) : null);

/**
 * The tuned column's record (METHOD §8): per provider, the headline default, the tuned score on its
 * subset beside the default on the same items and passes, the exact settings, the cost bound per
 * call against the cap, and the tuning evidence. Null when the run has no tuned condition.
 */
function tuningBlock(c: Ctx, providers: { provider: string; profile: string; n: number; knownAnswer: { mean: number; ci95: [number, number] } }[]) {
  const src = c.config.tuned;
  if (!src || src.status !== "selected" || !c.config.profiles.includes("tuned")) return null;
  const sel = src.selection;
  const scope = scopeOf(c.config, "tuned", c.items);
  return {
    status: "selected" as const,
    selection: { runId: sel.runId, mode: sel.mode, createdAt: sel.createdAt, sha256: src.selectionSha256, tuningConfigSha256: sel.tuningConfigSha256 },
    rule: sel.rule,
    split: { files: sel.split.files, seed: sel.split.seed, n: sel.split.n, itemsSha256: sel.split.itemsSha256, disjointFromScored: true },
    condition: { items: scope.items.map(ref), passes: scope.passes },
    providers: c.config.providers.map((p) => {
      const pick = sel.providers[p]!;
      const def = providers.find((x) => x.provider === p && x.profile === "default");
      const tuned = c.scores.profiles.find((x) => x.provider === p && x.profile === "tuned");
      return {
        provider: p, chosen: pick.chosen, settings: pick.settings, reason: pick.reason,
        costBoundUsd: pick.boundUsd, capUsd: sel.rule.maxCostPerCallUsd,
        default: def ? { ...def.knownAnswer, n: def.n } : null,
        tuned: tuned && Number.isFinite(tuned.knownAnswer.mean) ? { ...interval(tuned.knownAnswer), n: tuned.n } : null,
        sameItemsDefault: tuned?.vsDefault ? { ...interval(tuned.vsDefault.default), n: tuned.vsDefault.n } : null,
        gain: maybe(tuned?.vsDefault?.diff),
        evidence: pick.evidence.map((e) => ({
          profile: e.profile, settings: e.settings, costBoundUsd: e.boundUsd, n: e.n, knownAnswer: maybe(e.knownAnswer), gain: maybe(e.gain),
          usableRate: round(e.usableRate), eligible: e.eligible, reason: e.reason,
        })),
        rejected: pick.rejected.map((x) => ({ settings: x.settings, reason: x.reason })),
      };
    }),
  };
}

function ref(i: Item): string {
  return i.split === "private" ? `sha256:${itemHash(i)}` : i.id;
}

export function buildOutputs(c: Ctx) {
  const { scores, method, config } = c;
  const snapshot = `${c.config.name}-${c.finishedAt.slice(0, 10)}`;
  const manifest = existsSync(MANIFEST_PATH) ? readJson<{ datasets: { name: string; version: string; file: string; sha256: string; count: number }[] }>(MANIFEST_PATH) : { datasets: [] };
  const usedFiles = new Set(config.datasets);
  const privateManifest = existsSync(PRIVATE_MANIFEST_PATH) ? readJson<{ version: string; count: number }>(PRIVATE_MANIFEST_PATH) : null;
  const publishJudged = scores.agreement?.publishJudged ?? false;
  const itemById = new Map(c.items.map((i) => [i.id, i]));
  const name = (p: string) => c.registry[p]?.name ?? p;
  const spec = (p: string) => (c.registry[p] as { specVersion?: string } | undefined)?.specVersion ?? null;

  const providers = scores.profiles.map((p) => ({
    provider: p.provider,
    name: name(p.provider),
    profile: p.profile,
    settings: settingsFor(config, p.profile, p.provider) as Settings,
    status: p.status,
    n: p.n,
    knownAnswer: interval(p.knownAnswer),
    components: p.components,
    judged: publishJudged && p.judged ? { ...interval(p.judged), n: p.judged.n, pageShare: p.judged.pageShare } : null,
    judgedCheck: publishJudged && p.judgedCheck ? { ...interval(p.judgedCheck), n: p.judgedCheck.n } : null,
    reliability: { usableRate: round(p.reliability.usableRate), ci95: [round(p.reliability.ci[0]), round(p.reliability.ci[1])], attempts: p.reliability.attempts, rates: p.reliability.rates },
    latencyMs: p.latencyMs,
    cost: p.cost,
    excerptKind: (c.registry[p.provider] as { search?: { response?: { excerptKind?: string } } } | undefined)?.search?.response?.excerptKind ?? null,
    pageUnreadableRate: p.pageUnreadableRate,
    stale: p.stale,
    retest: p.retest,
    rank: p.rank ? { group: p.rank.group, tied: p.rank.tied, reliable: p.rank.reliable, position: p.rank.position } : null,
  }));

  const results = {
    schema: "bench-results/1",
    snapshot,
    mode: c.mode,
    liveVerified: c.mode === "live",
    method: method.method,
    generatedAt: c.finishedAt,
    run: {
      id: c.runId, startedAt: c.startedAt, finishedAt: c.finishedAt, harnessGit: gitSha(),
      region: process.env.BENCH_REGION ?? null, host: { platform: platform(), arch: arch(), node: process.version },
    },
    datasets: manifest.datasets.filter((d) => usedFiles.has(d.file)).map((d) => ({ name: d.name, version: d.version, sha256: d.sha256, count: d.count })),
    privateSet: config.privateDatasets?.length && privateManifest ? { version: privateManifest.version, count: privateManifest.count } : null,
    registry: config.providers.map((p) => ({ provider: p, specVersion: spec(p) })),
    judging: config.notJudged ? "not judged (--no-judge)" : scores.agreement ? "judged" : "no judged items",
    judge: c.judge ? { id: c.judge.id, model: c.judge.model, rubric: c.judge.rubric, rubricSha256: c.judge.rubricSha256, promptSha256: c.judge.promptSha256, params: c.judge.params } : null,
    checkJudge: c.checkJudge ? { id: c.checkJudge.id, model: c.checkJudge.model, rubric: c.checkJudge.rubric, rubricSha256: c.checkJudge.rubricSha256, promptSha256: c.checkJudge.promptSha256, params: c.checkJudge.params } : null,
    conditions: {
      maxResults: method.search.maxResults, timeoutMs: method.search.timeoutMs, retries: method.search.maxRetries, fallback: "none",
      pageFetcher: method.pages.fetcher, pageUserAgent: method.pages.userAgent, pageTopK: method.pages.topK, snippetTopK: method.knownAnswer.snippetTopK, navTopK: method.knownAnswer.navTopK,
      judgeTopK: method.judge.topK, passes: config.passes, seed: config.seed,
    },
    agreement: scores.agreement ? {
      pairs: scores.agreement.pairs, judged: scores.agreement.judged, unresolved: scores.agreement.unresolved,
      selfKappa: scores.agreement.self.kappa ? { n: scores.agreement.self.n, ...interval(scores.agreement.self.kappa) } : null,
      crossKappa: scores.agreement.cross?.kappa ? { judge: scores.agreement.cross.judge, n: scores.agreement.cross.n, ...interval(scores.agreement.cross.kappa) } : null,
      humanKappa: scores.agreement.human.kappa ? { n: scores.agreement.human.n, ...interval(scores.agreement.human.kappa) } : null,
      humanExact: scores.agreement.human.exact === null ? null : round(scores.agreement.human.exact),
      judgedPublished: publishJudged, gate: scores.agreement.gateReason,
    } : null,
    ranking: { rule: RANK_RULE, floor: method.reliability.floor, minSeparation: method.stats.minSeparation, pairedItems: scores.pairedN, droppedItems: scores.droppedItems },
    pages: scores.pages,
    providers,
    tuning: tuningBlock(c, providers),
    items: c.items.map((i) => ({ ref: ref(i), class: i.class, split: i.split })),
  };

  const attempts = readAttemptLog(runPaths(c.dir).attempts).map((a) => {
    const item = itemById.get(a.itemId)!;
    const priv = item.split === "private";
    const k = c.items.indexOf(item);
    const ps = scores.profiles.find((p) => p.provider === a.provider && p.profile === a.profile);
    return {
      item: ref(item), provider: a.provider, profile: a.profile, pass: a.pass, startedAt: a.startedAt, outcome: a.outcome,
      code: a.code ?? null, status: a.status ?? null, durationMs: a.durationMs, billed: a.billed, costUsd: a.costUsd, costSource: a.costSource,
      resultCount: a.resultCount,
      // Private items publish no URLs until they retire: URLs would reveal the query.
      urls: priv ? [] : a.urls, resultHashes: a.resultHashes,
      knownAnswer: ps ? (ps.perItemPasses[a.pass - 1]?.[k] ?? null) : null,
    };
  });

  const profile = (pid: string) => providers.filter((p) => p.profile === pid);
  const leaderboard = {
    schema: "bench-leaderboard/1",
    snapshot,
    mode: c.mode,
    liveVerified: c.mode === "live",
    method: method.method,
    generatedAt: c.finishedAt,
    items: c.items.length,
    judgedPublished: publishJudged,
    rule: "Quality first, then reliability; tied when not statistically separable. Cost and latency are shown, never ranked.",
    providers: profile("default").filter((p) => p.rank).sort((a, b) => a.rank!.position - b.rank!.position).map((p) => {
      const tuned = providers.find((t) => t.provider === p.provider && t.profile === "tuned");
      const tb = results.tuning?.providers.find((t) => t.provider === p.provider);
      return {
        id: p.provider, name: p.name, group: p.rank!.group, tied: p.rank!.tied, reliable: p.rank!.reliable,
        knownAnswer: p.knownAnswer, judged: p.judged ? { mean: p.judged.mean, ci95: p.judged.ci95 } : null,
        usableRate: p.reliability.usableRate, latencyP50Ms: p.latencyMs.p50, costPerQueryUsd: p.cost.perQueryUsd, costKnown: p.cost.known,
        // Informational, beside the headline: never the rank. Compared with the default on the same items and passes.
        tuned: tuned && tb ? { knownAnswer: tuned.knownAnswer, n: tuned.n, settings: tb.settings, sameItemsDefault: tb.sameItemsDefault, costBoundUsd: tb.costBoundUsd } : null,
      };
    }),
    notRanked: profile("default").filter((p) => !p.rank).map((p) => ({ id: p.provider, reason: p.status })),
  };

  const routing = {
    schema: "routing-table/1",
    snapshot,
    mode: c.mode,
    liveVerified: c.mode === "live",
    method: method.method,
    generatedAt: c.finishedAt,
    validUntil: addDays(c.finishedAt.slice(0, 10), method.routing.validDays),
    priceBasis: "registry list prices; cost per query counts every billed attempt",
    classes: [...new Set(scores.cells.map((x) => x.class))].sort(),
    cells: scores.cells.map((x) => ({
      provider: x.provider, profile: x.profile, settings: settingsFor(config, x.profile, x.provider), class: x.class, n: x.n,
      quality: { knownAnswer: interval(x.knownAnswer), judged: publishJudged && x.judged ? interval(x.judged) : null },
      latencyMs: x.latencyMs, reliability: x.reliability, cost: x.cost, tierGroup: x.group, flags: x.flags,
    })),
  };
  return { results, attempts, leaderboard, routing };
}

/** Every text the run stored locally that must never be published, at least `min` characters long. */
export function sensitiveStrings(dir: string, items: readonly Item[], min = 24): string[] {
  const out = new Set<string>();
  // Only prose counts: a window with no spaces may be a URL, and URLs are published on purpose.
  const prose = (t: string) => (t.match(/\s/g)?.length ?? 0) >= 2;
  const add = (s: unknown) => {
    if (typeof s !== "string") return;
    const t = s.trim();
    if (t.length < min) return;
    // Long texts are checked as several windows, so a partial copy is caught too.
    if (t.length <= 80) { if (prose(t)) out.add(t); return; }
    for (let i = 0; i + 48 <= t.length; i += Math.max(48, Math.floor(t.length / 12))) {
      const w = t.slice(i, i + 48);
      if (prose(w)) out.add(w);
    }
  };
  const walk = (d: string, f: (j: any) => void) => {
    if (!existsSync(d)) return;
    for (const e of readdirSync(d, { withFileTypes: true, recursive: true })) {
      if (!e.isFile() || !e.name.endsWith(".json")) continue;
      try {
        f(JSON.parse(readFileSync(join(e.parentPath, e.name), "utf8")));
      } catch {}
    }
  };
  walk(join(dir, "raw", "search"), (j) => { for (const r of j.results ?? []) { add(r.title); for (const x of r.excerpts ?? []) add(x); } });
  walk(join(dir, "raw", "pages"), (j) => { add(j.content); add(j.title); });
  walk(join(dir, "raw", "judge"), (j) => add(j.rationale));
  // The contents track's raw files: what each provider returned, and the harness's own probe text.
  walk(join(dir, "raw", "contents"), (j) => { add(j.content); add(j.title); });
  walk(join(dir, "raw", "probes"), (j) => add(j.text));
  for (const i of items) {
    if (i.split !== "private") continue;
    out.add(i.query);
    for (const a of i.answers) if (a.length >= 4) out.add(a);
    if (i.nonce) out.add(i.nonce);
  }
  return [...out];
}

export function leakCheck(serialized: string, sensitive: readonly string[]): string[] {
  return sensitive.filter((s) => serialized.includes(s) || serialized.includes(JSON.stringify(s).slice(1, -1)));
}

export function writeOutputs(c: Ctx, outDir: string): { files: string[] } {
  const o = buildOutputs(c);
  for (const [name, value] of [["results-1", o.results], ["leaderboard-1", o.leaderboard], ["routing-table-1", o.routing]] as const) {
    const errors = validate(value, loadSchema(name));
    if (errors.length) throw new Error(`${name} does not match its schema:\n  ${errors.slice(0, 10).join("\n  ")}`);
  }
  const allSensitive = sensitiveStrings(c.dir, c.items);
  const nonPublicUrls = [
    JSON.stringify(o.results),
    JSON.stringify(o.leaderboard),
    JSON.stringify(o.routing),
    ...o.attempts.map((a) => JSON.stringify(a.item.startsWith("sha256:") ? a : { ...a, urls: [] })),
  ].join("\n");
  const publicUrls = o.attempts.filter((a) => !a.item.startsWith("sha256:")).flatMap((a) => a.urls).join("\n");
  const privateAnswers = new Set(c.items.filter((i) => i.split === "private").flatMap((i) => i.answers.filter((a) => a.length >= 4)));
  const urlSensitive = allSensitive.filter((s) => !privateAnswers.has(s));
  const leaks = [...leakCheck(nonPublicUrls, allSensitive), ...leakCheck(publicUrls, urlSensitive)];
  if (leaks.length) throw new Error(`refusing to publish: ${leaks.length} stored response or private strings found in the output`);
  const files = [join(outDir, "results.json"), join(outDir, "attempts.jsonl"), join(outDir, "leaderboard.json"), join(outDir, "routing-table.json")];
  writeJson(files[0]!, o.results);
  writeJsonl(files[1]!, o.attempts);
  writeJson(files[2]!, o.leaderboard);
  writeJson(files[3]!, o.routing);
  return { files };
}
