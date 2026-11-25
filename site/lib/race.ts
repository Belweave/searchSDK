import raw from "@/data/race.sample.json";
import { type Dataset, toDataset } from "./dataset";
import { type ProviderBrand, providerBrand } from "./provider-assets";
import { type CostSource, getRegistry, listPriceUsd, type Wire } from "./registry";

/**
 * Data for the home page stage. Lanes are the registry's search providers, in registry order
 * (alphabetical by name). Request and response shapes come from each spec (lib/registry.ts, Wire);
 * timings, results, costs and page text are placeholders (data/race.sample.json) until the benchmark
 * harness records real runs. A provider with no placeholder entry gets a lane with no run.
 *
 * While the file is `pending`, every provider has the same placeholder values: the lanes move in
 * lockstep and the stage shows no per-provider figures.
 */

type RaceFile = {
  sample?: boolean;
  pending?: boolean;
  label?: string;
  /** The provider that takes over when a preset's attempt fails; required only if one does. */
  fallback?: string;
  attemptTimeoutMs: number;
  presets: {
    id: string;
    query: string;
    fails: { provider: string; code: string } | null;
    docs: Doc[];
    lanes: Record<string, { latencyMs: number; costUsd: number | null; picks: number[] }>;
    page: { title: string; lines: string[] };
  }[];
};

const file = raw as RaceFile;

export type Doc = { title: string; url: string; excerpt: string };
export type Normalized = { url: string; title: string; excerpts: string[]; publishedAt: null; author: null; rank: number; providerFields: Record<string, never> };

export type LaneRun = {
  latencyMs: number;
  cost: { usd: number | null; source: CostSource };
  results: Doc[];
  /** The provider's response body, built from the spec's response paths. */
  raw: unknown;
  normalized: Normalized[];
};

/** The parts of a provider's wire view the stage shows. */
export type LaneWire = Pick<Wire, "method" | "url" | "list" | "fields">;

export type StageLane = { brand: ProviderBrand; wire: LaneWire; costSource: CostSource };

export type ErrorCodeShown = "attempt_timeout" | "rate_limit" | "network";

export type StagePreset = {
  id: string;
  query: string;
  /** The provider whose attempt fails in this story, and how. */
  fails: { provider: string; code: ErrorCodeShown; billed: "possible" | "no" } | null;
  runs: Record<string, LaneRun>;
  page: { url: string; title: string; lines: string[] };
};

export type Stage = {
  /** Placeholder values that are the same for every provider: show no per-provider timing or cost. */
  pending: boolean;
  lanes: StageLane[];
  presets: StagePreset[];
  fallback: ProviderBrand;
  attemptTimeoutMs: number;
  /** The provider `contents()` is called on in the story, and one page's list price there. */
  contents: ProviderBrand;
  contentsCost: { usd: number | null; source: CostSource };
};

/** Write `value` at a dotted path ("web.results", "costDollars.total"); "$" is the root. */
function setPath(target: Record<string, unknown>, path: string, value: unknown): Record<string, unknown> {
  if (path === "$" || path === "") return Object.assign(target, value as object);
  const keys = path.split(".");
  let node = target;
  keys.forEach((key, i) => {
    if (i === keys.length - 1) node[key] = value;
    else node = (node[key] ??= {}) as Record<string, unknown>;
  });
  return target;
}

function rawBody(wire: Wire, docs: Doc[], costUsd: number | null): unknown {
  const items = docs.map((d) => {
    const item: Record<string, unknown> = {};
    if (wire.fields.url) setPath(item, wire.fields.url, d.url);
    if (wire.fields.title) setPath(item, wire.fields.title, d.title);
    // A plural field name (Exa's "highlights") is a list on the wire; singular ones are one string that the spec's to-list step wraps.
    if (wire.fields.excerpts) setPath(item, wire.fields.excerpts, /s$/.test(wire.fields.excerpts.split(".").pop() ?? "") ? [d.excerpt] : d.excerpt);
    return item;
  });
  const body: Record<string, unknown> = {};
  setPath(body, wire.list, items);
  if (wire.cost && costUsd !== null) {
    const value = wire.cost.unit === "usd" ? costUsd : wire.cost.creditUsd ? Math.max(1, Math.round(costUsd / wire.cost.creditUsd)) : 1;
    setPath(body, wire.cost.path, value);
  }
  return body;
}

const BILLED: Record<ErrorCodeShown, "possible" | "no"> = { attempt_timeout: "possible", network: "possible", rate_limit: "no" };

function load(): Dataset<Stage> {
  const providers = getRegistry().providers.filter((p) => p.search);
  const ids = new Set(providers.map((p) => p.id));
  const lanes: StageLane[] = providers.map((p) => ({
    brand: providerBrand(p.id),
    wire: { method: p.search!.wire.method, url: p.search!.wire.url, list: p.search!.wire.list, fields: p.search!.wire.fields },
    costSource: p.search!.cost.source,
  }));

  const presets = file.presets.map((preset): StagePreset => {
    const runs: Record<string, LaneRun> = {};
    for (const [id, lane] of Object.entries(preset.lanes)) {
      if (!ids.has(id)) throw new Error(`data/race.sample.json preset "${preset.id}" has a lane for "${id}", which is not a search provider in the registry.`);
      const spec = providers.find((p) => p.id === id)!.search!;
      const results = lane.picks.map((i) => {
        const doc = preset.docs[i];
        if (!doc) throw new Error(`data/race.sample.json preset "${preset.id}" lane "${id}" picks doc ${i}, which does not exist.`);
        return doc;
      });
      const usd = lane.costUsd;
      runs[id] = {
        latencyMs: lane.latencyMs,
        cost: { usd, source: usd === null ? "unknown" : spec.cost.source },
        results,
        raw: rawBody(spec.wire, results, usd),
        normalized: results.map((d, i) => ({ url: d.url, title: d.title, excerpts: [d.excerpt], publishedAt: null, author: null, rank: i + 1, providerFields: {} })),
      };
    }
    const fails = preset.fails && ids.has(preset.fails.provider) ? { provider: preset.fails.provider, code: preset.fails.code as ErrorCodeShown, billed: BILLED[preset.fails.code as ErrorCodeShown] } : null;
    const top = preset.docs[0];
    if (!top) throw new Error(`data/race.sample.json preset "${preset.id}" has no docs.`);
    return { id: preset.id, query: preset.query, fails, runs, page: { url: top.url, title: preset.page.title, lines: preset.page.lines } };
  });

  const first = providers[0];
  if (!first) throw new Error("The registry has no search provider for the stage.");
  // contents() goes to the first search provider, alphabetically, that has a contents endpoint
  // (content/examples/stage.ts names the same one).
  const contentsId = providers.find((p) => p.contents)?.id ?? first.id;
  if (presets.some((p) => p.fails) && !(file.fallback && ids.has(file.fallback))) {
    throw new Error("data/race.sample.json has a preset whose attempt fails but no registry search provider as `fallback`.");
  }
  const fallbackId = file.fallback && ids.has(file.fallback) ? file.fallback : first.id;
  const contentsSpec = getRegistry().providers.find((p) => p.id === contentsId)?.contents;
  const contentsCost = contentsSpec ? { usd: listPriceUsd(contentsSpec.price, 1), source: contentsSpec.cost.source } : { usd: null, source: "unknown" as const };
  return toDataset(
    file,
    { pending: file.pending === true, lanes, presets, fallback: providerBrand(fallbackId), attemptTimeoutMs: file.attemptTimeoutMs, contents: providerBrand(contentsId), contentsCost },
    "data/race.sample.json",
  );
}

const stage = load();

export function getStage(): Dataset<Stage> {
  return stage;
}
