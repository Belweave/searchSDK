import "./guard.ts";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { test } from "node:test";
import { policy, providers } from "../src/generated/registry.ts";
import { portablePattern, specProblems } from "../src/registry.ts";
import { validate } from "../src/schema.ts";
import { STEP_NAMES } from "../src/steps.ts";
import { conformanceDir, loadVectors } from "./harness.ts";

const registryDir = new URL("../../../registry/", import.meta.url);
const read = (rel: string) => JSON.parse(readFileSync(new URL(rel, registryDir), "utf8"));
const schema = read("schema/provider.schema.json");
const steps = read("steps.json");
const files = readdirSync(new URL("providers/", registryDir)).filter((f) => f.endsWith(".json")).sort();
/** Every spec the suite knows: the registry's, plus the synthetic ones inside format vectors. */
const allSpecs = [
  ...files.map((f) => ({ where: `providers/${f}`, spec: read(`providers/${f}`) })),
  ...loadVectors("format/").flatMap(({ file, data }) => Object.values(data.providers ?? {}).map((spec) => ({ where: file, spec: spec as any }))),
];

test("every provider spec, and every synthetic spec in the format vectors, validates against the schema", () => {
  for (const { where, spec } of allSpecs) assert.deepEqual(validate(spec, schema), [], `${where} ${spec.id}`);
});

test("every spec passes the cross-field rules the schema cannot express", () => {
  for (const { where, spec } of allSpecs) assert.deepEqual(specProblems(spec), [], `${where} ${spec.id}`);
});

test("the schema rejects a spec with an unknown step and an extra field", () => {
  const spec = read("providers/exa.json");
  spec.search.request.params.query.steps = [{ step: "eval" }];
  spec.extra = true;
  assert.ok(validate(spec, schema).length >= 2);
});

test("the schema keeps steps on their side and requires their arguments", () => {
  const responseStepInRequest = read("providers/exa.json");
  responseStepInRequest.search.request.params.query.steps = [{ step: "parse-date" }];
  assert.notDeepEqual(validate(responseStepInRequest, schema), []);
  const requestStepInResponse = read("providers/exa.json");
  requestStepInResponse.search.response.fields.title = { path: "title", steps: [{ step: "single" }] };
  assert.notDeepEqual(validate(requestStepInResponse, schema), []);
  const missingArg = read("providers/tinyfish.json");
  delete missingArg.search.request.params.includeDomains.steps[0].separator;
  assert.notDeepEqual(validate(missingArg, schema), []);
  const strayArg = read("providers/exa.json");
  strayArg.search.response.fields.excerpts.steps[0].separator = ",";
  assert.notDeepEqual(validate(strayArg, schema), []);
});

test("the schema requires a reason for a key in the URL, and only then", () => {
  const query = read("providers/exa.json");
  query.auth = { in: "query", name: "api_key", env: ["EXA_API_KEY"] };
  assert.notDeepEqual(validate(query, schema), []);
  query.auth.keyInUrlReason = "The provider documents no header.";
  assert.deepEqual(validate(query, schema), []);
  const header = read("providers/exa.json");
  header.auth.keyInUrlReason = "Not needed.";
  assert.notDeepEqual(validate(header, schema), []);
});

test("the step library, the schema and the runtime name the same steps", () => {
  const library = Object.keys(steps.steps).sort();
  const sides = (side: string) => Object.entries(steps.steps).filter(([, s]: [string, any]) => s.side === side || s.side === "both").map(([n]) => n).sort();
  const names = (def: any) => def.anyOf.map((b: any) => b.properties.step.const).sort();
  assert.deepEqual(names(schema.$defs.requestStep), sides("request"));
  assert.deepEqual(names(schema.$defs.responseStep), sides("response"));
  assert.deepEqual([...STEP_NAMES].sort(), library);
  const used = new Set<string>();
  JSON.stringify(allSpecs.map((s) => s.spec), (k, v) => { if (k === "step") used.add(v); return v; });
  for (const s of used) assert.ok(library.includes(s), s);
});

test("specs refuse values a query string cannot carry in one fixed order, and malformed strings", () => {
  const spec = read("providers/brave.json");
  spec.search.request.fixed.nested = { a: 1 };
  spec.search.request.fixed["10"] = "x";
  spec.search.providerOptions["2"] = { type: "string" };
  spec.name = "bad \uD800";
  const problems = specProblems(spec).join("\n");
  assert.match(problems, /fixed\/nested: query encoding/);
  assert.match(problems, /10 is an integer-like/);
  assert.match(problems, /2 is an integer-like/);
  assert.match(problems, /well-formed/);
});

test("every pattern is in the portable subset, and the subset refuses what other runtimes cannot translate", () => {
  const patterns = (v: unknown): string[] => Array.isArray(v) ? v.flatMap(patterns)
    : v !== null && typeof v === "object" ? Object.entries(v).flatMap(([k, x]) => (k === "pattern" && typeof x === "string" ? [x] : patterns(x))) : [];
  for (const p of [...patterns([schema, read("policy.json"), ...allSpecs.map((s) => s.spec)]), policy.domains.labelPattern]) assert.ok(portablePattern(p), p);
  for (const bad of ["(?<=a)b", "(?<n>a)", "\\p{L}", "(a)\\1", "\\b", "a{", "\\uD83D", "[\\d-z]", "[\\S]"]) assert.ok(!portablePattern(bad), bad);
  for (const good of ["^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$", "^\\u{1F600}+$", "[\\d-]", "a{2,}?", "\\/\\-"]) assert.equal(portablePattern(good), good !== "\\/\\-", good);
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

test("the embedded registry holds exactly the spec files", () => {
  assert.deepEqual(Object.keys(providers).sort(), files.map((f) => f.slice(0, -5)));
});

test("policy error messages cover exactly the error codes", () => {
  assert.deepEqual(Object.keys(policy.errors).sort(), [
    "aborted", "attempt_timeout", "auth", "configuration", "forbidden", "invalid_request", "invalid_response",
    "network", "provider_error", "quota", "rate_limit", "response_too_large", "timeout", "unavailable", "unsupported",
  ]);
  for (const code of [...policy.transient, ...policy.fallbackOn, ...policy.billing.possible]) assert.ok(code in policy.errors, code);
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
  for (const { file, data } of loadVectors("format/")) assert.match(data.synthetic, /synthetic/i, file);
  assert.ok(conformanceDir.href.endsWith("/registry/conformance/"));
});

test("every test file installs the network guard before anything else", () => {
  const dir = new URL("./", import.meta.url);
  for (const f of readdirSync(dir).filter((x) => x.endsWith(".ts") && x !== "guard.ts")) {
    const first = readFileSync(new URL(f, dir), "utf8").split("\n").find((l) => l.startsWith("import "));
    assert.match(first ?? "", /^import (\{[^}]*\} from )?"\.\/guard\.ts";$/, `${f} must import ./guard.ts first`);
  }
});
