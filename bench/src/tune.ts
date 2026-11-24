// Tuning: a small, budgeted search over each provider's documented options,
// run separately from the headline. Every provider's default runs on the same
// tuning items, so the choice is made against it. Spend goes through the same
// ledger and caps as any run. The selection names exact settings and the items
// used, which the tuned column then leaves out.
import { resolve } from "node:path";
import type { Method, RunConfig, Settings } from "./run/config.ts";
import { listPrice } from "./run/pricing.ts";
import type { ProviderSpec } from "./sdk.ts";
import type { Scores } from "./score/score.ts";
import { readJson } from "./util/core.ts";

export interface TuningConfig {
  name: string;
  datasets: string[];
  items: number;
  maxListPriceUsd: number;
  capUsd: number;
  seed: number;
  candidates: Record<string, Settings[]>;
}

export interface Selection {
  schema: "tuning-selection/1";
  runId: string;
  method: string;
  maxListPriceUsd: number;
  items: string[];
  chosen: Record<string, { profile: string; settings: Settings; knownAnswer: number; defaultKnownAnswer: number; listPriceUsd: number | null }>;
  rejected: { provider: string; settings: Settings; reason: string }[];
}

export function loadTuning(path: string): TuningConfig {
  return readJson<TuningConfig>(resolve(path));
}

/** The run config for a tuning run: default plus one profile per candidate slot, priced candidates only. */
export function tuningRunConfig(t: TuningConfig, registry: Readonly<Record<string, ProviderSpec>>, method: Method, providers: string[]): { config: RunConfig; rejected: Selection["rejected"] } {
  const settings: Record<string, Record<string, Settings>> = {};
  const rejected: Selection["rejected"] = [];
  let slots = 0;
  for (const p of providers) {
    let k = 0;
    for (const s of t.candidates[p] ?? []) {
      const spec = registry[p];
      if (!spec?.search) { rejected.push({ provider: p, settings: s, reason: "no search endpoint" }); continue; }
      const price = listPrice(spec, "search", method.search.maxResults, s);
      if (price === null) { rejected.push({ provider: p, settings: s, reason: "price not public" }); continue; }
      if (price > t.maxListPriceUsd) { rejected.push({ provider: p, settings: s, reason: `list price ${price} above the cap ${t.maxListPriceUsd}` }); continue; }
      const profile = `t${++k}`;
      (settings[profile] ??= {})[p] = s;
      slots = Math.max(slots, k);
    }
  }
  const config: RunConfig = {
    name: t.name, providers, datasets: t.datasets, limit: t.items, passes: 1,
    profiles: ["default", ...Array.from({ length: slots }, (_, i) => `t${i + 1}`)], settings,
    pagePasses: [1], judgeItems: 0, capUsd: t.capUsd, seed: t.seed,
  };
  return { config, rejected };
}

/** Best known-answer score per provider among default and its candidates; ties go to the cheaper list price, then default. */
export function select(runId: string, config: RunConfig, scores: Scores, registry: Readonly<Record<string, ProviderSpec>>, method: Method, t: TuningConfig, rejected: Selection["rejected"]): Selection {
  const chosen: Selection["chosen"] = {};
  for (const p of config.providers) {
    const rows = scores.profiles.filter((x) => x.provider === p && x.status === "scored");
    const def = rows.find((x) => x.profile === "default");
    if (!def) continue;
    const price = (profile: string) => listPrice(registry[p]!, "search", method.search.maxResults, profile === "default" ? {} : (config.settings?.[profile]?.[p] ?? {}));
    const eligible = rows.filter((x) => x.profile === "default" || (x.rank?.reliable ?? false));
    const best = eligible.sort((a, b) =>
      b.knownAnswer.mean - a.knownAnswer.mean || (price(a.profile) ?? Infinity) - (price(b.profile) ?? Infinity) || (a.profile === "default" ? -1 : b.profile === "default" ? 1 : 0))[0]!;
    chosen[p] = {
      profile: best.profile,
      settings: best.profile === "default" ? {} : config.settings![best.profile]![p]!,
      knownAnswer: best.knownAnswer.mean,
      defaultKnownAnswer: def.knownAnswer.mean,
      listPriceUsd: price(best.profile),
    };
  }
  return { schema: "tuning-selection/1", runId, method: method.method, maxListPriceUsd: t.maxListPriceUsd, items: scores.items.map((i) => i.id), chosen, rejected };
}

/** Adds the "tuned" profile to a run config from a selection: its settings, and its items left out of the tuned score. */
export function withTuned(config: RunConfig, sel: Selection): RunConfig {
  const tuned: Record<string, Settings> = {};
  for (const [p, c] of Object.entries(sel.chosen)) if (config.providers.includes(p)) tuned[p] = c.settings;
  return {
    ...config,
    profiles: [...new Set([...config.profiles, "tuned"])],
    settings: { ...(config.settings ?? {}), tuned },
    profileExclude: { ...(config.profileExclude ?? {}), tuned: sel.items },
  };
}
