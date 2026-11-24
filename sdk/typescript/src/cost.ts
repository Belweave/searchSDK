// The exported price functions (registry/steps.md, List price and Cost bound).
// They read a spec's pricing data only; nothing is sent.
import { computedCost, pricedTier, type Kind } from "./engine.ts";
import { SearchError } from "./errors.ts";
import { policy } from "./generated/registry.ts";
import { requestPrice } from "./steps.ts";
import type { Cost, CostBound, Depth, EndpointBase, Pricing, ProviderSpec } from "./types.ts";

const own = (o: object, k: string) => Object.prototype.hasOwnProperty.call(o, k);

/** The spec's endpoint, or `unsupported` naming the kind. */
function endpointOf(spec: Pick<ProviderSpec, "id" | "search" | "contents">, kind: Kind): EndpointBase {
  const ep = spec[kind];
  if (!ep) throw new SearchError("unsupported", { provider: spec.id, field: kind });
  return ep;
}

export interface ListPriceInput {
  /** Results (search) or billable pages (contents) the provider returned. */
  count: number;
  /** Search only; contents ignore it. */
  depth?: Depth;
  /** This provider's own options, as sent under providerOptions[id]. */
  providerOptions?: Readonly<Record<string, unknown>>;
}

/**
 * The computed list price of one request that returned `count` items, as a
 * response's `cost` reports it when the provider reports none: a computed
 * estimate, or unknown when the price is not public or a cost option makes it so.
 */
export function listPrice(spec: Pick<ProviderSpec, "id" | "search" | "contents">, kind: Kind, input: ListPriceInput): Cost {
  const ep = endpointOf(spec, kind);
  return computedCost(ep, input.count, kind === "search" ? input.depth : undefined, input.providerOptions);
}

export interface CostBoundInput {
  /** Search: results requested (default policy.search.maxResults.default). */
  maxResults?: number;
  /** Contents: URLs sent (default 1). */
  urls?: number;
  depth?: Depth;
  providerOptions?: Readonly<Record<string, unknown>>;
}

/**
 * The most one request can cost under the registry's documented prices: the
 * highest documented rates (pricing.ceiling) for the requested count, and the
 * overage price past a free allowance when that is public. A spend cap can
 * reserve this figure instead of a guessed margin. It assumes the provider bills
 * no more items than were requested; a reported cost above it means the
 * registry's price data is wrong.
 */
export function costBound(spec: Pick<ProviderSpec, "id" | "search" | "contents">, kind: Kind, input: CostBoundInput = {}): CostBound {
  const ep = endpointOf(spec, kind);
  const tier = pricedTier(ep, kind === "search" ? input.depth : undefined, input.providerOptions);
  if (tier === null) return { usd: null, unknownBecause: "option" };
  const pricing = ep.pricing;
  let count: number;
  if (kind === "search") {
    // Without a mapped result count the provider decides how many rows it bills.
    if (pricing.extraBlock && !own(ep.request.params, "maxResults")) return { usd: null, unknownBecause: "count" };
    count = input.maxResults ?? policy.search.maxResults.default;
  } else count = input.urls ?? 1;
  const ceiling = pricing.ceiling;
  const highest: Pricing = {
    ...pricing,
    perRequestUsd: ceiling?.perRequestUsd !== undefined ? ceiling.perRequestUsd : pricing.perRequestUsd,
    ...(pricing.extraBlock ? { extraBlock: { items: pricing.extraBlock.items, usd: ceiling?.extraBlockUsd ?? pricing.extraBlock.usd } } : {}),
  };
  let usd = requestPrice(count, highest, tier);
  if (usd === null) return { usd: null, unknownBecause: "price" };
  const allowance = pricing.allowance;
  if (allowance?.beyond.billing === "opt-in") {
    const over = allowance.beyond.perRequestUsd;
    if (typeof over !== "number") return { usd, requiresOverageOff: true };
    const overUsd = requestPrice(count, { ...highest, perRequestUsd: over }, tier)!;
    usd = Math.max(usd, overUsd);
  }
  return { usd };
}
