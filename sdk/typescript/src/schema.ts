// A JSON Schema subset: the keywords listed in registry/README.md. Used to check
// provider options at runtime and the registry itself in tests.
import type { JsonSchema } from "./types.ts";

function typeOf(v: unknown): string {
  if (v === null) return "null";
  if (Array.isArray(v)) return "array";
  if (typeof v === "number") return Number.isInteger(v) ? "integer" : "number";
  return typeof v;
}

function equal(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const ka = Object.keys(a), kb = Object.keys(b);
  return ka.length === kb.length && ka.every((k) => equal((a as never)[k], (b as never)[k]));
}

/** Returns a list of error locations; empty when valid. */
export function validate(value: unknown, schema: JsonSchema, root: JsonSchema = schema, at = ""): string[] {
  const errors: string[] = [];
  const fail = (why: string) => errors.push(`${at || "/"}: ${why}`);
  const s = schema as Record<string, any>;

  if (typeof s.$ref === "string") {
    const target = s.$ref.replace(/^#\//, "").split("/").reduce((o: any, k: string) => o?.[k], root);
    if (!target) return [`${at}: unresolved ${s.$ref}`];
    errors.push(...validate(value, target, root, at));
  }
  if (s.allOf) for (const sub of s.allOf) errors.push(...validate(value, sub, root, at));
  if (s.anyOf && !s.anyOf.some((sub: JsonSchema) => validate(value, sub, root, at).length === 0)) fail("matches no anyOf branch");
  if (s.oneOf && s.oneOf.filter((sub: JsonSchema) => validate(value, sub, root, at).length === 0).length !== 1) fail("must match exactly one oneOf branch");
  if ("const" in s && !equal(value, s.const)) fail("const mismatch");
  if (s.enum && !s.enum.some((e: unknown) => equal(value, e))) fail("not in enum");

  const t = typeOf(value);
  if (s.type !== undefined) {
    const types: string[] = Array.isArray(s.type) ? s.type : [s.type];
    if (!types.some((x) => x === t || (x === "number" && t === "integer"))) {
      fail(`expected ${types.join("|")}`);
      return errors;
    }
  }
  if (t === "string") {
    const len = [...(value as string)].length;
    if (s.minLength !== undefined && len < s.minLength) fail("too short");
    if (s.maxLength !== undefined && len > s.maxLength) fail("too long");
    if (s.pattern !== undefined && !new RegExp(s.pattern, "u").test(value as string)) fail("pattern mismatch");
  }
  if (t === "number" || t === "integer") {
    if (s.minimum !== undefined && (value as number) < s.minimum) fail("below minimum");
    if (s.maximum !== undefined && (value as number) > s.maximum) fail("above maximum");
  }
  if (t === "array") {
    const arr = value as unknown[];
    if (s.minItems !== undefined && arr.length < s.minItems) fail("too few items");
    if (s.maxItems !== undefined && arr.length > s.maxItems) fail("too many items");
    if (s.items) arr.forEach((v, i) => errors.push(...validate(v, s.items, root, `${at}/${i}`)));
  }
  if (t === "object") {
    const obj = value as Record<string, unknown>;
    for (const k of s.required ?? []) if (!(k in obj)) fail(`missing ${k}`);
    for (const [k, v] of Object.entries(obj)) {
      const where = `${at}/${k}`;
      if (s.propertyNames) errors.push(...validate(k, s.propertyNames, root, where));
      if (s.properties && k in s.properties) errors.push(...validate(v, s.properties[k], root, where));
      else if (s.additionalProperties === false) errors.push(`${where}: not allowed`);
      else if (typeof s.additionalProperties === "object") errors.push(...validate(v, s.additionalProperties, root, where));
    }
  }
  return errors;
}
