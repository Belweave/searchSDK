// Worst-case prices for calls, from the registry's dated list prices. The
// computation mirrors registry/steps.md (request-price); the reservation adds a
// safety factor, and a price that is not public reserves `unknownPriceUsd`.
import type { ProviderSpec } from "../sdk.ts";
import type { Method, Settings } from "./config.ts";

type Tier = "fast" | "standard" | "deep";

/** registry/steps.md request-price for `count` items, or null when the price is not public. */
export function listPrice(spec: ProviderSpec, kind: "search" | "contents", count: number, settings: Settings = {}): number | null {
  const ep = spec[kind];
  if (!ep) return null;
  const pricing = ep.pricing;
  let tier: Tier = settings.depth ?? "standard";
  const options = settings.providerOptions ?? {};
  for (const [name, rule] of Object.entries(pricing.costOptions ?? {})) {
    if (!Object.prototype.hasOwnProperty.call(options, name)) continue;
    if (rule === "unknown") return null;
    const v = options[name];
    const mapped = typeof v === "string" && Object.prototype.hasOwnProperty.call(rule, v) ? rule[v] : null;
    if (!mapped) return null;
    tier = mapped;
  }
  const p = pricing.perRequestUsd;
  const base = typeof p === "number" ? p : p === null ? null : (p[tier] ?? (tier === "standard" ? null : p.standard ?? null));
  if (base === null || base === undefined) return null;
  if (!pricing.extraBlock) return base;
  const blocks = Math.ceil(Math.max(0, count - (pricing.includedItems ?? 0)) / pricing.extraBlock.items);
  return base + blocks * pricing.extraBlock.usd;
}

export interface Reservation {
  /** The amount held against the caps before the call. */
  usd: number;
  /** The list price it was derived from, or null when unknown. */
  listUsd: number | null;
  /** How the number was reached, for the printed plan. */
  basis: string;
}

/** What one call may cost at most, as the budget sees it. */
export function reservation(spec: ProviderSpec, kind: "search" | "contents", count: number, settings: Settings, method: Method): Reservation {
  const list = listPrice(spec, kind, count, settings);
  const f = method.budget.priceSafetyFactor;
  if (list === null) {
    return { usd: method.budget.unknownPriceUsd, listUsd: null, basis: `price unknown: worst case ${method.budget.unknownPriceUsd}` };
  }
  return { usd: list * f, listUsd: list, basis: `${list.toFixed(4)} list x ${f}` };
}
