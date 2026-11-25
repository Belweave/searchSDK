// What one call reserves against the caps: the SDK's cost bound
// (registry/steps.md, Cost bound), which already uses each provider's highest
// documented rates. No margin is added. Only when the SDK cannot bound a
// call is `unknownPriceUsd` reserved, and the plan says so.
import { costBound, listPrice, type Attempt, type ProviderSpec } from "../sdk.ts";
import type { Method, Settings } from "./config.ts";

export interface Reservation {
  /** The amount held against the caps before the call. */
  usd: number;
  /** The SDK's bound, or null when it could not bound the call. */
  boundUsd: number | null;
  /** True when the bound holds only while paid use past the provider's free allowance stays off. */
  requiresOverageOff: boolean;
  /** How the number was reached, for the printed plan. */
  basis: string;
}

/** What one call may cost at most, as the budget sees it. `count` is results asked for (search) or URLs sent (contents). */
export function reservation(spec: ProviderSpec, kind: "search" | "contents", count: number, settings: Settings, method: Method): Reservation {
  const b = costBound(spec, kind, kind === "search"
    ? { maxResults: count, ...(settings.depth ? { depth: settings.depth } : {}), ...(settings.providerOptions ? { providerOptions: settings.providerOptions } : {}) }
    : { urls: count, ...(settings.providerOptions ? { providerOptions: settings.providerOptions } : {}) });
  if (b.usd === null) {
    const w = method.budget.unknownPriceUsd;
    return { usd: w, boundUsd: null, requiresOverageOff: false, basis: `no bound (${b.unknownBecause}): worst case ${w}` };
  }
  return { usd: b.usd, boundUsd: b.usd, requiresOverageOff: b.requiresOverageOff === true, basis: b.requiresOverageOff ? "free allowance, overage off" : "bound" };
}

/**
 * Provider credits one call may use, for providers priced in credits
 * (pricing.creditUsd): the list price for the requested count, in credits,
 * rounded up. Null when the provider is not priced in credits or the price
 * is unknown (for example an option with unpublished cost).
 */
export function creditReservation(spec: ProviderSpec, kind: "search" | "contents", count: number, settings: Settings): number | null {
  const ep = spec[kind];
  const creditUsd = ep?.pricing.creditUsd;
  if (!ep || !creditUsd) return null;
  const c = listPrice(spec, kind, { count, ...(kind === "search" && settings.depth ? { depth: settings.depth } : {}), ...(settings.providerOptions ? { providerOptions: settings.providerOptions } : {}) });
  return c.usd === null ? null : Math.ceil(c.usd / creditUsd - 1e-9);
}

/** Credits the sent attempts used: reported credits, else the computed price in credits; null when any is unknown. */
export function attemptsCredits(spec: ProviderSpec, kind: "search" | "contents", attempts: readonly Attempt<string>[]): number | null {
  const creditUsd = spec[kind]?.pricing.creditUsd;
  let total = 0;
  for (const a of attempts) {
    if (a.billed === "no") continue;
    if (typeof a.cost.credits === "number") { total += a.cost.credits; continue; }
    if (a.cost.usd === null || !creditUsd) return null;
    total += Math.ceil(a.cost.usd / creditUsd - 1e-9);
  }
  return total;
}
