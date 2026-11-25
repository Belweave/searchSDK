// The spend guard. Every paid call reserves its worst-case price in a
// month-wide ledger before it is sent, and commits its actual cost after.
// A call is refused when the reservation could take the run past its cap or
// the month past the monthly cap. Unknown actual costs keep the reservation.
// An actual cost above its reservation halts the run: the price data is wrong.
// Separately, a provider may have a hard account limit in credits or calls
// (providerLimits). It counts every ledger line for that provider since a
// date, across runs, smoke checks and resumes, and refuses the call that
// could pass it; the runner then stops that provider alone.
import { randomUUID } from "node:crypto";
import { appendJsonl, monthOf, readJsonl } from "../util/core.ts";

export type SpendKind = "search" | "contents" | "judge";

export interface LedgerLine {
  t: "reserve" | "commit";
  id: string;
  runId: string;
  month: string;
  /** Provider id, or "judge:<id>". Credits are matched on this. */
  account: string;
  kind: SpendKind;
  usd: number;
  at: string;
  /** Provider credits reserved (reserve) or used (commit), for providers priced in credits. */
  credits?: number;
  /** commit only: true when the actual was unknown and the reservation was kept. */
  assumed?: boolean;
  overrun?: boolean;
}

export interface Hold {
  id: string;
  account: string;
  kind: SpendKind;
  usd: number;
  credits?: number;
}

/** A hard limit on one provider account: credits and/or calls, counted from `since` (YYYY-MM-DD, UTC), or from the start of the ledger. */
export interface ProviderLimit {
  credits?: number;
  calls?: number;
  since?: string;
}

/** Credits and calls one account has used since a date: committed credits, open reservations in full, one call per reservation. */
export function poolUsage(ledgerPath: string, account: string, since?: string): { credits: number; calls: number } {
  const from = since ? Date.parse(`${since}T00:00:00Z`) : -Infinity;
  const reserves = new Map<string, LedgerLine>();
  const commits = new Map<string, LedgerLine>();
  for (const l of readJsonl<LedgerLine>(ledgerPath)) {
    if (l.account !== account) continue;
    (l.t === "reserve" ? reserves : commits).set(l.id, l);
  }
  let credits = 0;
  let calls = 0;
  for (const [id, r] of reserves) {
    if (!(Date.parse(r.at) >= from)) continue;
    calls++;
    credits += commits.get(id)?.credits ?? r.credits ?? 0;
  }
  return { credits, calls };
}

export interface BudgetOptions {
  ledgerPath: string;
  runId: string;
  runCapUsd: number;
  monthlyCapUsd: number;
  creditsUsd?: Record<string, number>;
  /** Hard per-provider limits in credits or calls, across runs (see ProviderLimit). */
  providerLimits?: Record<string, ProviderLimit>;
  now?: () => number;
}

export class BudgetError extends Error {}

export class Budget {
  readonly runCapUsd: number;
  readonly monthlyCapUsd: number;
  readonly month: string;
  /** Set once an actual cost exceeded its reservation; no further calls are allowed. */
  halted: string | null = null;
  private readonly o: BudgetOptions;
  private readonly now: () => number;
  /** Spend per account this month: committed actuals plus open reservations (from any run). */
  private readonly monthSpend = new Map<string, number>();
  private readonly runSpend = new Map<string, number>();
  private readonly open = new Map<string, Hold>();
  private readonly cashAtStart: number;
  /** Credits and calls used against each limited provider's limit, kept current as calls are reserved and committed. */
  private readonly pools = new Map<string, { credits: number; calls: number }>();

  constructor(o: BudgetOptions) {
    if (!(o.runCapUsd > 0)) throw new BudgetError("a run needs a positive spend cap");
    this.o = o;
    this.now = o.now ?? Date.now;
    this.month = monthOf(this.now());
    this.runCapUsd = o.runCapUsd;
    this.monthlyCapUsd = o.monthlyCapUsd;
    // Reservations without a commit are calls that may have been billed before a crash: they count in full.
    const reserves = new Map<string, LedgerLine>();
    const commits = new Map<string, LedgerLine>();
    for (const l of readJsonl<LedgerLine>(o.ledgerPath)) {
      if (l.month !== this.month) continue;
      (l.t === "reserve" ? reserves : commits).set(l.id, l);
    }
    for (const [id, r] of reserves) {
      const usd = commits.get(id)?.usd ?? r.usd;
      this.add(this.monthSpend, r.account, usd);
      if (r.runId === o.runId) this.add(this.runSpend, r.account, usd);
    }
    // A resumed run starts from the month's cash before this run's own earlier spend.
    this.cashAtStart = this.cash(this.subtract(this.monthSpend, this.runSpend));
    for (const [account, limit] of Object.entries(o.providerLimits ?? {})) this.pools.set(account, poolUsage(o.ledgerPath, account, limit.since));
  }

  /**
   * Why a provider's next call must not be sent under its own limit, or null.
   * `credits` is the call's credit reservation; null means it cannot be counted in credits.
   */
  providerRefusal(account: string, credits: number | null): string | null {
    const limit = this.o.providerLimits?.[account];
    const used = this.pools.get(account);
    if (!limit || !used) return null;
    const since = limit.since ? ` since ${limit.since}` : "";
    if (limit.calls !== undefined && used.calls + 1 > limit.calls) return `${account}: ${used.calls} of ${limit.calls} calls used${since}; the call limit stops it`;
    if (limit.credits !== undefined) {
      if (credits === null) return `${account}: this call's credits cannot be bounded, so the ${limit.credits}-credit limit stops it`;
      if (used.credits + credits > limit.credits + 1e-9) return `${account}: ${used.credits} of ${limit.credits} credits used${since}; a ${credits}-credit call would pass the limit`;
    }
    return null;
  }

  private add(m: Map<string, number>, k: string, v: number) {
    m.set(k, (m.get(k) ?? 0) + v);
  }

  private subtract(a: Map<string, number>, b: Map<string, number>): Map<string, number> {
    const out = new Map(a);
    for (const [k, v] of b) out.set(k, (out.get(k) ?? 0) - v);
    return out;
  }

  /** Cash: spend beyond each account's declared free credit. */
  private cash(spend: Map<string, number>): number {
    let total = 0;
    for (const [k, v] of spend) total += Math.max(0, v - (this.o.creditsUsd?.[k] ?? 0));
    return total;
  }

  monthCashUsd(): number {
    return this.cash(this.monthSpend);
  }

  /** This run's cash: the month's cash now minus the month's cash without this run. */
  runCashUsd(): number {
    return this.monthCashUsd() - this.cashAtStart;
  }

  runGrossUsd(): number {
    let t = 0;
    for (const v of this.runSpend.values()) t += v;
    return t;
  }

  /** What the caps still allow, in cash. */
  headroomUsd(): number {
    return Math.min(this.runCapUsd - this.runCashUsd(), this.monthlyCapUsd - this.monthCashUsd());
  }

  /** Reserves `usd` (and `credits`, for a credit-priced provider) for one call, or returns null when the call could break a cap. */
  reserve(account: string, kind: SpendKind, usd: number, credits?: number | null): Hold | null {
    if (this.halted) return null;
    if (!(usd >= 0) || !Number.isFinite(usd)) throw new BudgetError(`invalid reservation ${usd}`);
    const next = new Map(this.monthSpend);
    this.add(next, account, usd);
    const monthCash = this.cash(next);
    if (monthCash - this.cashAtStart > this.runCapUsd + 1e-12) return null;
    if (monthCash > this.monthlyCapUsd + 1e-12) return null;
    const hold: Hold = { id: randomUUID(), account, kind, usd, ...(typeof credits === "number" ? { credits } : {}) };
    appendJsonl(this.o.ledgerPath, { ...this.line("reserve", hold, usd), ...(hold.credits !== undefined ? { credits: hold.credits } : {}) });
    const pool = this.pools.get(account);
    if (pool) { pool.calls++; pool.credits += hold.credits ?? 0; }
    this.monthSpend.set(account, next.get(account)!);
    this.add(this.runSpend, account, usd);
    this.open.set(hold.id, hold);
    return hold;
  }

  /** Records the actual cost (and credits). `null` (unknown) keeps the reservation. Returns true on an overrun. */
  commit(hold: Hold, actualUsd: number | null, actualCredits?: number | null): boolean {
    if (!this.open.delete(hold.id)) throw new BudgetError("commit without an open reservation");
    const assumed = actualUsd === null || !Number.isFinite(actualUsd) || actualUsd < 0;
    const usd = assumed ? hold.usd : actualUsd;
    const overrun = usd > hold.usd + 1e-12;
    this.add(this.monthSpend, hold.account, usd - hold.usd);
    this.add(this.runSpend, hold.account, usd - hold.usd);
    const credits = hold.credits === undefined ? undefined : typeof actualCredits === "number" && Number.isFinite(actualCredits) && actualCredits >= 0 ? actualCredits : hold.credits;
    const pool = this.pools.get(hold.account);
    if (pool && credits !== undefined) pool.credits += credits - hold.credits!;
    appendJsonl(this.o.ledgerPath, { ...this.line("commit", hold, usd), ...(credits !== undefined ? { credits } : {}), ...(assumed ? { assumed: true } : {}), ...(overrun ? { overrun: true } : {}) });
    if (overrun) this.halted = `${hold.account} ${hold.kind} cost $${usd.toFixed(6)}, above its reservation of $${hold.usd.toFixed(6)}; registry price data is wrong`;
    return overrun;
  }

  /** Stops all further calls, for a reason other than a cost overrun (for example a covered judge asking for payment). */
  halt(reason: string): void {
    this.halted ??= reason;
  }

  private line(t: "reserve" | "commit", h: Hold, usd: number): LedgerLine {
    return { t, id: h.id, runId: this.o.runId, month: this.month, account: h.account, kind: h.kind, usd, at: new Date(this.now()).toISOString() };
  }
}
