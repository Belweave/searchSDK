// The registry a client runs on: the embedded one, or caller specs that are
// validated, copied and frozen so no other code can change them afterwards.
import { SearchError } from "./errors.ts";
import { deepFreeze } from "./freeze.ts";
import { providers, schema } from "./generated/registry.ts";
import { getPath } from "./json.ts";
import { wellFormed } from "./policy.ts";
import { validate } from "./schema.ts";
import type { ProviderSpec } from "./types.ts";

export type Registry = Readonly<Record<string, ProviderSpec>>;

export const builtInRegistry: Registry = providers;

/**
 * Whether a pattern stays inside the portable regex subset (registry/README.md),
 * so every runtime can translate it exactly. Mirrors sdk/python's _regex.translate.
 */
export function portablePattern(p: string): boolean {
  const escape = (i: number, inClass: boolean): number => {
    const c = p[i + 1];
    if (c === undefined) return -1;
    if ("dws".includes(c) || "tnrfv".includes(c)) return i + 2;
    if ("DWS".includes(c)) return inClass ? -1 : i + 2;
    if (c === "x") return /^[0-9A-Fa-f]{2}$/.test(p.slice(i + 2, i + 4)) ? i + 4 : -1;
    if (c === "u") {
      const m = /^\{([0-9A-Fa-f]+)\}|^([0-9A-Fa-f]{4})/.exec(p.slice(i + 2));
      if (!m) return -1;
      const cp = parseInt(m[1] ?? m[2]!, 16);
      return cp > 0x10ffff || (cp >= 0xd800 && cp <= 0xdfff) ? -1 : i + 2 + m[0].length;
    }
    return "^$\\.*+?()[]{}|/".includes(c) || (inClass && c === "-") ? i + 2 : -1;
  };
  let depth = 0;
  for (let i = 0; i < p.length;) {
    const c = p[i]!;
    if (c === "\\") { i = escape(i, false); if (i < 0) return false; continue; }
    if (c === "[") {
      i += p[i + 1] === "^" ? 2 : 1;
      for (;;) {
        if (i >= p.length || p[i] === "[") return false;
        if (p[i] === "]") { i++; break; }
        if (p[i] === "\\") {
          const shorthand = "dws".includes(p[i + 1] ?? "");
          i = escape(i, true);
          if (i < 0 || (shorthand && p[i] === "-" && p[i + 1] !== "]")) return false;
        } else i++;
      }
      continue;
    }
    if (c === "(") {
      if (p.startsWith("(?:", i)) i += 3;
      else if (p[i + 1] === "?") return false;
      else i++;
      depth++;
      continue;
    }
    if (c === ")") { if (--depth < 0) return false; i++; continue; }
    if (c === "{") {
      const m = /^\{[0-9]+(,[0-9]*)?\}/.exec(p.slice(i));
      if (!m) return false;
      i += m[0].length;
      continue;
    }
    if (c === "}" || c === "]") return false;
    i++;
  }
  return depth === 0;
}

const patternsIn = (v: unknown): string[] =>
  Array.isArray(v) ? v.flatMap(patternsIn)
    : v !== null && typeof v === "object"
      ? Object.entries(v).flatMap(([k, x]) => (k === "pattern" && typeof x === "string" ? [x] : patternsIn(x)))
      : [];

const NORMALIZED_INPUTS = ["query", "maxResults", "includeDomains", "excludeDomains", "recency", "startDate", "endDate", "country", "language", "depth"];

/**
 * Rules the schema subset cannot express (registry/README.md). Returns one
 * message per problem; an empty list means the spec is usable.
 */
export function specProblems(spec: ProviderSpec): string[] {
  const out: string[] = [];
  for (const kind of ["search", "contents"] as const) {
    const ep = spec[kind];
    if (!ep) continue;
    const at = `/${kind}`;
    const options = Object.keys(ep.providerOptions);
    for (const name of Object.keys(ep.pricing.costOptions ?? {})) {
      if (!options.includes(name)) out.push(`${at}/pricing/costOptions/${name}: not a declared provider option`);
    }
    for (const path of ep.request.locked ?? []) {
      if (getPath(ep.request.fixed ?? {}, path) === undefined) out.push(`${at}/request/locked: ${path} is not in fixed`);
    }
    const params = Object.keys(ep.request.params);
    for (const [i, c] of (ep.request.compose ?? []).entries()) {
      const inputs = c.parts.flatMap((p) => ("input" in p ? [p.input] : []));
      if (!inputs.length) out.push(`${at}/request/compose/${i}: has no input part`);
      for (const input of inputs) {
        if (params.includes(input)) out.push(`${at}/request/compose/${i}: ${input} is also a param`);
        if (!NORMALIZED_INPUTS.includes(input)) out.push(`${at}/request/compose/${i}: unknown input ${input}`);
      }
    }
    if (ep.request.method === "GET" && ep.request.encoding !== "query") out.push(`${at}/request: GET needs query encoding`);
    if (ep.request.encoding === "query") {
      for (const [k, v] of Object.entries(ep.request.fixed ?? {})) {
        if (!["string", "number", "boolean"].includes(typeof v)) out.push(`${at}/request/fixed/${k}: query encoding takes strings, numbers and booleans`);
      }
      // ECMAScript objects list integer-like keys first, so their place in a query string would differ by runtime.
      for (const k of [...Object.keys(ep.request.fixed ?? {}), ...options]) {
        if (/^(0|[1-9][0-9]*)$/.test(k)) out.push(`${at}: ${k} is an integer-like top-level key in a query encoding`);
      }
    }
    if (ep.pricing.extraBlock === undefined && ep.pricing.includedItems !== undefined) out.push(`${at}/pricing/includedItems: needs extraBlock`);
    for (const pattern of patternsIn(ep.providerOptions)) {
      if (!portablePattern(pattern)) out.push(`${at}/providerOptions: pattern ${JSON.stringify(pattern)} is outside the portable subset`);
    }
  }
  if (!wellFormed(spec)) out.push("/: strings must be well-formed Unicode and numbers finite");
  if (spec.contents) {
    for (const [i, source] of spec.contents.response.pages.entries()) {
      if (source.status === "ok" && source.billable === false) out.push(`/contents/response/pages/${i}: ok pages are always billable`);
    }
  }
  return out;
}

/** Validates, copies and freezes caller specs. Any problem is a `configuration` error naming `registry`. */
export function loadRegistry(specs: unknown): Registry {
  if (specs === null || typeof specs !== "object" || Array.isArray(specs)) throw new SearchError("configuration", { field: "registry" });
  let copy: Record<string, ProviderSpec>;
  try {
    copy = structuredClone(specs) as Record<string, ProviderSpec>;
  } catch {
    throw new SearchError("configuration", { field: "registry" });
  }
  for (const [id, spec] of Object.entries(copy)) {
    if (validate(spec, schema).length || spec.id !== id || specProblems(spec).length) throw new SearchError("configuration", { field: "registry" });
    delete (spec as Record<string, unknown>).$schema;
  }
  return deepFreeze(copy);
}
