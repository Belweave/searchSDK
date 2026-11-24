// What one call reserves against the caps: the SDK's cost bound
// (registry/steps.md, Cost bound), which already uses each provider's highest
// documented rates. No margin is added. Only when the SDK cannot bound a
// call is `unknownPriceUsd` reserved, and the plan says so.
import { costBound, type ProviderSpec } from "../sdk.ts";
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
