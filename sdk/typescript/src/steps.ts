// The named-step library. Semantics: registry/steps.md. One implementation per runtime.
import { policy, steps as library } from "./generated/registry.ts";
import type { Pricing, StepRef, Tier } from "./types.ts";

export type Side = "request" | "response";
export interface StepContext { now: number }
/** Thrown by request-side steps that cannot express a value; the caller maps it to `unsupported`. */
export class StepUnsupported extends Error {}

const blankRanges = policy.query.blank.map(([a, b]) => [parseInt(a, 16), parseInt(b, 16)] as const);
export function isBlank(cp: number): boolean {
  for (const [a, b] of blankRanges) if (cp >= a && cp <= b) return true;
  return false;
}
/** Removes policy blank code points from both ends. */
export function trimBlank(s: string): string {
  const cps = Array.from(s);
  let start = 0, end = cps.length;
  while (start < end && isBlank(cps[start]!.codePointAt(0)!)) start++;
  while (end > start && isBlank(cps[end - 1]!.codePointAt(0)!)) end--;
  return cps.slice(start, end).join("");
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

/** A validated calendar date in YYYY-MM-DD form, or null. */
export function calendarDate(value: unknown): [number, number, number] | null {
  const m = typeof value === "string" ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(value) : null;
  if (!m) return null;
  const y = +m[1]!, mo = +m[2]!, d = +m[3]!;
  return y >= 1 && mo >= 1 && mo <= 12 && d >= 1 && d <= daysIn(y, mo) ? [y, mo, d] : null;
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

type Impl = (value: unknown, ref: StepRef, side: Side, ctx: StepContext) => unknown;
const unsupported = (): never => { throw new StepUnsupported(); };

/** One function per library step that specs may reference. Cost steps are separate functions below. */
const implementations: Record<string, Impl> = {
  "parse-date": (value) => parseDate(value),
  "to-list": (value) => toList(value),
  "join": (value, ref) => {
    if (typeof value === "string") return value;
    if (!Array.isArray(value)) return null;
    const parts = value.filter((v): v is string => typeof v === "string");
    return parts.length ? parts.join(ref.separator ?? "") : null;
  },
  "single": (value) => (Array.isArray(value) && value.length === 1 ? value[0] : unsupported()),
  "map-value": (value, ref, side) => {
    const key = typeof value === "number" && Number.isSafeInteger(value) ? String(value) : value;
    const table = ref.table ?? {};
    if (typeof key === "string" && Object.prototype.hasOwnProperty.call(table, key)) return table[key];
    return side === "request" ? unsupported() : null;
  },
  "lowercase": (value) => (typeof value === "string" ? asciiCase(value, false) : null),
  "uppercase": (value) => (typeof value === "string" ? asciiCase(value, true) : null),
  "prefix": (value, ref) => {
    const pre = ref.prefix ?? "";
    if (typeof value === "string") return pre + value;
    if (Array.isArray(value)) return value.filter((v): v is string => typeof v === "string").map((v) => pre + v);
    return null;
  },
  "date-to-datetime": (value, ref) => {
    if (!calendarDate(value)) return unsupported();
    return `${value as string}T${ref.edge === "end" ? "23:59:59.999" : "00:00:00.000"}Z`;
  },
  "format-date": (value, ref) => {
    const d = calendarDate(value);
    if (!d || ref.format !== "MM/DD/YYYY") return unsupported();
    const [y, m, day] = (value as string).split("-");
    return `${m}/${day}/${y}`;
  },
  "recency-to-date": (value, _ref, _side, ctx) => {
    const days = typeof value === "string" && Object.prototype.hasOwnProperty.call(policy.search.recencyDays, value)
      ? (policy.search.recencyDays as Record<string, number>)[value]! : unsupported();
    return new Date(ctx.now - days * 86_400_000).toISOString();
  },
};

/** The step names this runtime implements, including the cost steps. Tests compare it with registry/steps.json. */
export const STEP_NAMES: readonly string[] = [...Object.keys(implementations), "credits-to-usd", "request-price"];

/**
 * Runs one step. A step used on a side the library does not allow it on is
 * unsupported on the request side and gives null on the response side.
 */
export function runStep(value: unknown, ref: StepRef, side: Side, ctx: StepContext): unknown {
  const def = (library.steps as Record<string, { side: string }>)[ref.step];
  const impl = Object.prototype.hasOwnProperty.call(implementations, ref.step) ? implementations[ref.step] : undefined;
  if (!def || !impl || (def.side !== "both" && def.side !== side)) return side === "request" ? unsupported() : null;
  return impl(value, ref, side, ctx);
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

export function requestPrice(count: number, pricing: Pricing | undefined, tier: Tier | string | null): number | null {
  if (!pricing) return null;
  const per = pricing.perRequestUsd;
  const base = per === null || typeof per === "number" ? per : (per as Record<string, number | null | undefined>)[tier ?? "standard"];
  if (base === undefined || base === null) return null;
  if (!pricing.extraBlock) return base;
  const blocks = Math.ceil(Math.max(0, count - (pricing.includedItems ?? 0)) / pricing.extraBlock.items);
  return base + blocks * pricing.extraBlock.usd;
}
