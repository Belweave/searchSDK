// JSON paths, JSON equality and predicates, shared by request building,
// response mapping and status rules. Semantics: registry/policy.md.
import type { Predicate } from "./types.ts";

const own = (o: object, k: string) => Object.prototype.hasOwnProperty.call(o, k);

/** Reads a path: "$" is the value itself; otherwise own properties only, and digit segments index arrays. */
export function getPath(value: unknown, path: string): unknown {
  if (path === "$") return value;
  let v = value;
  for (const key of path.split(".")) {
    if (v === null || typeof v !== "object") return undefined;
    if (Array.isArray(v)) {
      if (!/^\d+$/.test(key)) return undefined;
      v = v[Number(key)];
    } else {
      if (!own(v, key)) return undefined;
      v = (v as Record<string, unknown>)[key];
    }
  }
  return v;
}

/** JSON equality: same JSON type, numbers by value, arrays element by element, objects by the same own keys. */
export function jsonEqual(a: unknown, b: unknown): boolean {
  if (a === null || b === null) return a === b;
  if (Array.isArray(a) || Array.isArray(b)) {
    return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((x, i) => jsonEqual(x, b[i]));
  }
  if (typeof a !== typeof b) return false;
  if (typeof a === "object") {
    const ka = Object.keys(a as object), kb = Object.keys(b as object);
    return ka.length === kb.length && ka.every((k) => own(b as object, k) && jsonEqual((a as never)[k], (b as never)[k]));
  }
  return a === b;
}

/** One predicate against `root`. An absent value never equals anything and is never in a list or range. */
export function holds(root: unknown, p: Predicate): boolean {
  const v = getPath(root, p.path);
  let r: boolean;
  if ("equals" in p) r = v !== undefined && jsonEqual(v, p.equals);
  else if ("in" in p) r = v !== undefined && p.in.some((x) => jsonEqual(v, x));
  else if ("range" in p) r = typeof v === "number" && Number.isFinite(v) && v >= p.range[0] && v <= p.range[1];
  else r = (v !== undefined && v !== null) === p.present;
  return p.not ? !r : r;
}

export const allHold = (root: unknown, where: readonly Predicate[] | undefined) => (where ?? []).every((p) => holds(root, p));
