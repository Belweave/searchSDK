// Which keys a run needs, and whether each is present: names only. Values,
// lengths, prefixes and hashes of keys are never printed, logged or stored.
// Keys come from the environment; the owner loads them from a git-ignored,
// mode-600 file with Node's own `node --env-file=<path>` (no dotenv).
import { existsSync, statSync } from "node:fs";
import type { Method, RunConfig } from "./run/config.ts";
import { loadJudgeConfig } from "./judge/judge.ts";
import type { ProviderSpec } from "./sdk.ts";

const has = (env: Record<string, string | undefined>, name: string) => (env[name] ?? "") !== "";

/** The run without judging: an explicit choice, recorded in its name and description, so results say "not judged". */
export function withoutJudging(config: RunConfig): RunConfig {
  return {
    ...config,
    name: `${config.name}-notjudged`.slice(0, 40),
    description: `NOT JUDGED (--no-judge): known-answer scoring only. ${config.description ?? ""}`.trim(),
    judgeItems: 0,
    notJudged: true,
  };
}

export interface KeyReport {
  ok: boolean;
  /** Variable names that are needed and not set. */
  missing: string[];
  text: string;
}

/** Present or missing, per provider and judge, for a run config (or a provider list). Never a value. */
export function keyReport(config: Pick<RunConfig, "providers" | "judgeItems">, method: Method, registry: Readonly<Record<string, ProviderSpec>>, env: Record<string, string | undefined>, o: { noJudge: boolean }): KeyReport {
  const L = ["keys (names only; values are never printed):"];
  const missing: string[] = [];
  for (const id of config.providers) {
    const names = (registry[id]?.auth.env ?? []) as string[];
    const present = names.find((n) => has(env, n));
    if (!present) missing.push(names[0] ?? `${id}?`);
    L.push(`  ${id.padEnd(10)} ${(present ?? names.join(" or ")).padEnd(22)} ${present ? "present" : "missing"}`);
  }
  if (config.judgeItems > 0 || o.noJudge) {
    const ids = [method.judge.id, ...(method.judge.checkId ? [method.judge.checkId] : [])];
    const names = [...new Set(ids.map((id) => loadJudgeConfig(id).keyEnv))];
    for (const n of names) {
      if (o.noJudge) L.push(`  ${"judges".padEnd(10)} ${n.padEnd(22)} not needed (--no-judge: known-answer scoring only, marked not judged)`);
      else {
        if (!has(env, n)) missing.push(n);
        L.push(`  ${"judges".padEnd(10)} ${n.padEnd(22)} ${has(env, n) ? "present" : "missing (or pass --no-judge to run unjudged, clearly marked)"} [${ids.join(", ")}]`);
      }
    }
  }
  L.push(`  ${"BENCH_ALLOW_LIVE".padEnd(33)} ${env.BENCH_ALLOW_LIVE === "1" ? "set" : "not set (set it on the command line of a live command, not in the keys file)"}`);
  L.push(missing.length ? `missing: ${missing.join(", ")}` : "all needed keys are present");
  return { ok: missing.length === 0, missing, text: L.join("\n") };
}

/** The keys file's permissions, without opening it. */
export function keysFileReport(path: string): string {
  if (!existsSync(path)) return `keys file ${path}: not found`;
  const mode = statSync(path).mode & 0o777;
  const m = mode.toString(8);
  return mode & 0o077 ? `keys file ${path}: mode ${m}; others can read it, run: chmod 600 ${path}` : `keys file ${path}: mode ${m}`;
}
