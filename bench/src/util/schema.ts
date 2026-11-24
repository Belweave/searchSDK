// A JSON Schema subset validator for bench's own schemas: type, enum, const,
// properties, required, additionalProperties, items, minItems, maxItems,
// minimum, maximum, minLength, maxLength, pattern, anyOf, oneOf, local $ref.
export type Schema = { [key: string]: unknown };

function typeOf(v: unknown): string {
  if (v === null) return "null";
  if (Array.isArray(v)) return "array";
  if (typeof v === "number") return Number.isInteger(v) ? "integer" : "number";
  return typeof v;
}

const SUPPORTED = new Set(["$schema", "$id", "$defs", "$ref", "$comment", "title", "description", "type", "enum", "const", "properties",
  "required", "additionalProperties", "items", "minItems", "maxItems", "minimum", "maximum", "minLength", "maxLength", "pattern",
  "anyOf", "oneOf"]);

/** Returns error locations; empty when valid. Unknown keywords are errors, so the subset stays honest. */
export function validate(value: unknown, schema: Schema, root: Schema = schema, at = ""): string[] {
  const errors: string[] = [];
  const where = at || "/";
  const fail = (why: string) => errors.push(`${where}: ${why}`);
  for (const k of Object.keys(schema)) if (!SUPPORTED.has(k)) return [`${where}: unsupported schema keyword ${k}`];
  const s = schema as Record<string, any>;
  if (typeof s.$ref === "string") {
    const target = s.$ref.replace(/^#\//, "").split("/").reduce((o: any, k: string) => o?.[k], root);
    if (!target) return [`${where}: unresolved ${s.$ref}`];
    errors.push(...validate(value, target, root, at));
  }
  const t = typeOf(value);
  if (s.type !== undefined) {
    const types: string[] = Array.isArray(s.type) ? s.type : [s.type];
    if (!types.some((x) => x === t || (x === "number" && t === "integer"))) return [...errors, `${where}: expected ${types.join("|")}, got ${t}`];
  }
  if (s.enum && !s.enum.some((e: unknown) => JSON.stringify(e) === JSON.stringify(value))) fail("not in enum");
  if ("const" in s && JSON.stringify(s.const) !== JSON.stringify(value)) fail(`not ${JSON.stringify(s.const)}`);
  if (typeof value === "string") {
    const n = [...value].length;
    if (s.minLength !== undefined && n < s.minLength) fail(`shorter than ${s.minLength}`);
    if (s.maxLength !== undefined && n > s.maxLength) fail(`longer than ${s.maxLength}`);
    if (s.pattern !== undefined && !new RegExp(s.pattern, "u").test(value)) fail(`does not match ${s.pattern}`);
  }
  if (typeof value === "number") {
    if (s.minimum !== undefined && value < s.minimum) fail(`below ${s.minimum}`);
    if (s.maximum !== undefined && value > s.maximum) fail(`above ${s.maximum}`);
  }
  if (Array.isArray(value)) {
    if (s.minItems !== undefined && value.length < s.minItems) fail(`fewer than ${s.minItems} items`);
    if (s.maxItems !== undefined && value.length > s.maxItems) fail(`more than ${s.maxItems} items`);
    if (s.items) value.forEach((v, i) => errors.push(...validate(v, s.items, root, `${at}/${i}`)));
  }
  if (t === "object") {
    const o = value as Record<string, unknown>;
    for (const r of s.required ?? []) if (!(r in o)) fail(`missing ${r}`);
    const props: Record<string, Schema> = s.properties ?? {};
    for (const [k, v] of Object.entries(o)) {
      if (props[k]) errors.push(...validate(v, props[k], root, `${at}/${k}`));
      else if (s.additionalProperties === false) fail(`unexpected property ${k}`);
      else if (s.additionalProperties && typeof s.additionalProperties === "object") errors.push(...validate(v, s.additionalProperties, root, `${at}/${k}`));
    }
  }
  if (s.anyOf && !s.anyOf.some((x: Schema) => validate(value, x, root, at).length === 0)) fail("matches no anyOf branch");
  if (s.oneOf && s.oneOf.filter((x: Schema) => validate(value, x, root, at).length === 0).length !== 1) fail("does not match exactly one oneOf branch");
  return errors;
}
