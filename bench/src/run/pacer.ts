// Per-provider pacing from the registry's documented rate limits. The runner
// stays at `shareOfLimit` of the most restrictive matching limit, so a 429 is
// the provider's doing, not ours. Day quotas are checked by the planner.

export interface RateLimit { plan: string; limit: number; per: string; scope?: string; note?: string }

export interface Timer {
  now(): number;
  sleep(ms: number): Promise<void>;
}

export const realTimer: Timer = {
  now: () => Date.now(),
  sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
};

const PERIOD_MS: Record<string, number> = { second: 1000, minute: 60_000, hour: 3_600_000 };

export interface Pace {
  /** Minimum milliseconds between request starts. */
  intervalMs: number;
  maxInFlight: number;
  /** Requests per UTC day allowed at our share, or null when no day limit is documented. */
  perDay: number | null;
  basis: string[];
}

/** Picks the limits for a plan (matched by substring), or all of them, and returns the strictest pace at our share. */
export function paceFor(limits: readonly RateLimit[], plan: string | undefined, share: number, maxInFlightCap: number): Pace {
  const chosen = plan ? limits.filter((l) => l.plan.toLowerCase().includes(plan.toLowerCase())) : [...limits];
  const use = chosen.length ? chosen : [...limits];
  let intervalMs = 0;
  let maxInFlight = maxInFlightCap;
  let perDay: number | null = null;
  const basis: string[] = [];
  for (const l of use) {
    if (l.per === "concurrent") {
      maxInFlight = Math.min(maxInFlight, Math.max(1, Math.floor(l.limit * share)));
      basis.push(`${l.limit} concurrent (${l.plan})`);
    } else if (PERIOD_MS[l.per]) {
      const iv = PERIOD_MS[l.per]! / Math.max(l.limit * share, 1e-9);
      if (iv > intervalMs) intervalMs = iv;
      basis.push(`${l.limit}/${l.per} (${l.plan})`);
    } else if (l.per === "day") {
      const d = Math.floor(l.limit * share);
      perDay = perDay === null ? d : Math.min(perDay, d);
      basis.push(`${l.limit}/day (${l.plan})`);
    }
  }
  return { intervalMs: Math.ceil(intervalMs), maxInFlight, perDay, basis };
}

export class Pacer {
  private nextStart = 0;
  private inFlight = 0;
  private pausedUntil = 0;
  private readonly waiters: (() => void)[] = [];

  readonly pace: Pace;
  private readonly timer: Timer;

  constructor(pace: Pace, timer: Timer = realTimer) {
    this.pace = pace;
    this.timer = timer;
  }

  /** Waits for a slot and the spacing interval; returns the release function. */
  async acquire(): Promise<() => void> {
    while (this.inFlight >= this.pace.maxInFlight) await new Promise<void>((r) => this.waiters.push(r));
    this.inFlight++;
    for (;;) {
      const now = this.timer.now();
      const at = Math.max(this.nextStart, this.pausedUntil);
      if (now >= at) break;
      await this.timer.sleep(at - now);
    }
    this.nextStart = this.timer.now() + this.pace.intervalMs;
    let released = false;
    return () => {
      if (released) return;
      released = true;
      this.inFlight--;
      this.waiters.shift()?.();
    };
  }

  /** Holds new requests for `ms`, after a rate-limit response. */
  pause(ms: number): void {
    this.pausedUntil = Math.max(this.pausedUntil, this.timer.now() + ms);
  }
}
