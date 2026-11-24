import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { test } from "node:test";
import { policy, providers } from "../src/generated/registry.ts";
import { validate } from "../src/schema.ts";
import { conformanceDir, loadVectors } from "./harness.ts";

const registry = new URL("../../../registry/", import.meta.url);
const read = (rel: string) => JSON.parse(readFileSync(new URL(rel, registry), "utf8"));
const schema = read("schema/provider.schema.json");
const steps = read("steps.json");
const files = readdirSync(new URL("providers/", registry)).filter((f) => f.endsWith(".json"));

test("every provider spec validates against the schema", () => {
  for (const f of files) assert.deepEqual(validate(read(`providers/${f}`), schema), [], f);
});

test("the schema rejects a spec with an unknown step and an extra field", () => {
  const spec = read("providers/exa.json");
  spec.search.request.params.query.steps = [{ step: "eval" }];
  spec.extra = true;
  assert.ok(validate(spec, schema).length >= 2);
});

test("every referenced step is in the library, and the library matches the runtime", () => {
  const used = new Set<string>();
  JSON.stringify(Object.values(providers), (k, v) => { if (k === "step") used.add(v); return v; });
  for (const s of used) assert.ok(s in steps.steps, s);
  assert.deepEqual(Object.keys(steps.steps).sort(), [
    "credits-to-usd", "date-to-datetime", "join", "lowercase", "map-value", "parse-date",
    "recency-to-date", "request-price", "single", "to-list", "uppercase",
  ]);
});

test("every unverified pointer resolves inside its spec", () => {
  for (const f of files) {
    const spec = read(`providers/${f}`);
    for (const { pointer } of spec.unverified) {
      const v = pointer.split("/").slice(1).reduce((o: any, k: string) => o?.[k.replace(/~1/g, "/").replace(/~0/g, "~")], spec);
      assert.notEqual(v, undefined, `${f} ${pointer}`);
    }
  }
});

test("no spec puts a key in the URL without a stated reason", () => {
  for (const spec of Object.values(providers)) {
    if (spec.auth.in === "query") assert.ok((spec.auth as { keyInUrlReason?: string }).keyInUrlReason, spec.id);
  }
});

test("policy error messages cover exactly the error codes", () => {
  assert.deepEqual(Object.keys(policy.errors).sort(), [
    "aborted", "attempt_timeout", "auth", "configuration", "forbidden", "invalid_request", "invalid_response",
    "network", "provider_error", "quota", "rate_limit", "response_too_large", "timeout", "unavailable", "unsupported",
  ]);
  for (const code of [...policy.transient, ...policy.fallbackOn]) assert.ok(code in policy.errors, code);
});

test("every provider endpoint has conformance vectors marked synthetic", () => {
  const vectors = loadVectors("providers/");
  for (const [id, spec] of Object.entries(providers)) {
    const v = vectors.find((x) => x.file === `providers/${id}.json`);
    assert.ok(v, `missing vectors for ${id}`);
    assert.match(v!.data.synthetic, /synthetic/i);
    for (const kind of ["search", "contents"] as const) {
      if (spec[kind]) assert.ok(v!.data.cases.some((c: any) => c.call === kind && c.expect.response), `${id} ${kind} needs a full response vector`);
    }
  }
  assert.ok(conformanceDir.href.endsWith("/registry/conformance/"));
});
