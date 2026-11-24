// The registry a client runs on: the embedded one, or caller specs that are
// validated, copied and frozen so no other code can change them afterwards.
import { SearchError } from "./errors.ts";
import { deepFreeze } from "./freeze.ts";
import { providers, schema } from "./generated/registry.ts";
import { getPath } from "./json.ts";
import { validate } from "./schema.ts";
import type { ProviderSpec } from "./types.ts";

export type Registry = Readonly<Record<string, ProviderSpec>>;

export const builtInRegistry: Registry = providers;

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
    if (ep.pricing.extraBlock === undefined && ep.pricing.includedItems !== undefined) out.push(`${at}/pricing/includedItems: needs extraBlock`);
  }
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
