// The named-step library. Semantics: registry/steps.md. One implementation per runtime.
import { policy } from "./generated/registry.ts";
import type { Pricing, StepRef } from "./types.ts";

export type Side = "request" | "response";
export interface StepContext { now: number }
/** Thrown by request-side steps that cannot express a value; the caller maps it to `unsupported`. */
export class StepUnsupported extends Error {}

const blankRanges = policy.query.blank.map(([a, b]) => [parseInt(a, 16), parseInt(b, 16)] as const);
export function isBlank(cp: number): boolean {
  for (const [a, b] of blankRanges) if (cp >= a && cp <= b) return true;
  return false;
}
function hasContent(s: string): boolean {
  for (const ch of s) if (!isBlank(ch.codePointAt(0)!)) return true;
  return false;
}

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const MIN_MS = -62_135_596_800_000; // 0001-01-01T00:00:00.000Z
const MAX_MS = 253_402_300_799_999; // 9999-12-31T23:59:59.999Z

function daysIn(y: number, m: number): number {
  return [31, y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1]!;
}

function offsetMinutes(zone: string | undefined): number | null {
  if (zone === undefined || /^(z|gmt|utc)$/i.test(zone)) return 0;
  const m = /^([+-])(\d{2}):?(\d{2})$/.exec(zone);
  if (!m) return null;
  const h = Number(m[2]), min = Number(m[3]);
  if (h > 23 || min > 59) return null;
  return (m[1] === "-" ? -1 : 1) * (h * 60 + min);
}

function build(y: number, mo: number, d: number, h: number, mi: number, s: number, ms: number, zone: string | undefined): string | null {
  if (y < 1 || mo < 1 || mo > 12 || d < 1 || d > daysIn(y, mo) || h > 23 || mi > 59 || s > 59) return null;
  const off = offsetMinutes(zone);
  if (off === null) return null;
  const date = new Date(0);
  date.setUTCFullYear(y, mo - 1, d);
  date.setUTCHours(h, mi, s, ms);
  const t = date.getTime() - off * 60_000;
  if (t < MIN_MS || t > MAX_MS) return null;
  return new Date(t).toISOString();
}

export function parseDate(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const s = value.replace(/^[ \t\r\n]+|[ \t\r\n]+$/g, "");
  let m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (m) return build(+m[1]!, +m[2]!, +m[3]!, 0, 0, 0, 0, undefined);
  m = /^(\d{4})-(\d{2})-(\d{2})[Tt ](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,9}))?)?(Z|z|[+-]\d{2}:?\d{2})?$/.exec(s);
  if (m) {
    const ms = m[7] ? Number((m[7] + "00").slice(0, 3)) : 0;
    return build(+m[1]!, +m[2]!, +m[3]!, +m[4]!, +m[5]!, m[6] ? +m[6] : 0, ms, m[8]);
  }
  m = /^(?:([A-Za-z]{3}), +)?(\d{1,2}) +([A-Za-z]{3}) +(\d{4}) +(\d{2}):(\d{2})(?::(\d{2}))? +([A-Za-z]{1,3}|[+-]\d{4})$/.exec(s);
  if (m) {
    if (m[1] !== undefined && !DAYS.includes(m[1].toLowerCase())) return null;
    const mo = MONTHS.indexOf(m[3]!.toLowerCase()) + 1;
    if (mo === 0 || !/^(gmt|utc|z|[+-]\d{4})$/i.test(m[8]!)) return null;
    return build(+m[4]!, mo, +m[2]!, +m[5]!, +m[6]!, m[7] ? +m[7] : 0, 0, m[8]);
  }
  return null;
}

export function toList(value: unknown): string[] {
  if (typeof value === "string") return hasContent(value) ? [value] : [];
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === "string" && hasContent(v));
  return [];
}

const asciiCase = (s: string, upper: boolean) =>
  s.replace(upper ? /[a-z]+/g : /[A-Z]+/g, (x) => (upper ? x.toUpperCase() : x.toLowerCase()));

function isoDays(now: number, days: number): string {
  return new Date(now - days * 86_400_000).toISOString();
}

export function runStep(value: unknown, ref: StepRef, side: Side, ctx: StepContext): unknown {
  switch (ref.step) {
    case "parse-date": return parseDate(value);
    case "to-list": return toList(value);
    case "join": {
      if (typeof value === "string") return value;
      if (!Array.isArray(value)) return null;
      const parts = value.filter((v): v is string => typeof v === "string");
      return parts.length ? parts.join(ref.separator ?? "") : null;
    }
    case "single":
      if (Array.isArray(value) && value.length === 1) return value[0];
      throw new StepUnsupported();
    case "map-value": {
      const key = typeof value === "number" ? String(value) : value;
      const table = ref.table ?? {};
      if (typeof key === "string" && Object.prototype.hasOwnProperty.call(table, key)) return table[key];
      if (side === "request") throw new StepUnsupported();
      return null;
    }
    case "lowercase": return typeof value === "string" ? asciiCase(value, false) : null;
    case "uppercase": return typeof value === "string" ? asciiCase(value, true) : null;
    case "date-to-datetime":
      return `${String(value)}T${ref.edge === "end" ? "23:59:59.999" : "00:00:00.000"}Z`;
    case "recency-to-date": {
      const days = (policy.search.recencyDays as Record<string, number>)[String(value)];
      if (days === undefined) throw new StepUnsupported();
      return isoDays(ctx.now, days);
    }
    default:
      throw new Error(`Unknown step ${ref.step}`);
  }
}

export function runSteps(value: unknown, steps: readonly StepRef[] | undefined, side: Side, ctx: StepContext): unknown {
  let v = value;
  for (const ref of steps ?? []) v = runStep(v, ref, side, ctx);
  return v;
}

export function creditsToUsd(credits: unknown, rateUsd: number | undefined): number | null {
  if (typeof credits !== "number" || !Number.isFinite(credits) || credits < 0 || rateUsd === undefined) return null;
  return credits * rateUsd;
}

export function requestPrice(count: number, pricing: Pricing | undefined, tier: string | null): number | null {
  if (!pricing) return null;
  const per = pricing.perRequestUsd;
  const base = typeof per === "number" ? per : (per as Record<string, number | undefined>)[tier ?? "standard"];
  if (base === undefined) return null;
  if (!pricing.extraBlock) return base;
  const blocks = Math.ceil(Math.max(0, count - (pricing.includedItems ?? 0)) / pricing.extraBlock.items);
  return base + blocks * pricing.extraBlock.usd;
}
