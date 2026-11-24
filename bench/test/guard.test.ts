// The network guard and the live-mode guards.
import assert from "node:assert/strict";
import net from "node:net";
import { test } from "node:test";
import { loadMethod } from "../src/run/config.ts";
import { registry, type ProviderSpec } from "../src/sdk.ts";
import { liveGuards, openSession } from "../src/session.ts";
import { fixtureConfig, tempStore } from "./helpers.ts";

test("real network use fails in tests", async () => {
  await assert.rejects(fetch("https://api.exa.ai/search"), /blocked in bench tests/);
  assert.throws(() => net.connect(443, "example.com"), /blocked in bench tests/);
});

test("the SDK cannot reach a real provider from a test either", async () => {
  tempStore();
  const s = openSession({ config: fixtureConfig({ judgeItems: 0 }), mode: "fixture" });
  // Fixture specs point at the reserved .invalid domain; a stray real fetch would be blocked anyway.
  for (const spec of Object.values(s.registry)) {
    const url = spec.search?.request.url ?? spec.contents?.request.url;
    assert.match(String(url), /^https:\/\/fixture\.invalid\//);
  }
});

test("live mode is refused under CI, in tests, without opt-in, or without keys", () => {
  const base = { registry: registry as unknown as Record<string, ProviderSpec>, method: loadMethod(), judgeKeyEnv: "MORPH_API_KEY" };
  const config = { ...fixtureConfig(), providers: ["exa", "brave"] };
  const keys = { EXA_API_KEY: "k", BRAVE_API_KEY: "k", MORPH_API_KEY: "k", BENCH_ALLOW_LIVE: "1" };
  assert.deepEqual(liveGuards({ ...base, config, env: keys }), []);
  assert.match(liveGuards({ ...base, config, env: { ...keys, CI: "true" } }).join(), /never start from automated CI/);
  assert.match(liveGuards({ ...base, config, env: { ...keys, BENCH_TEST: "1" } }).join(), /tests never run live/);
  assert.match(liveGuards({ ...base, config, env: { ...keys, BENCH_ALLOW_LIVE: "" } }).join(), /BENCH_ALLOW_LIVE=1/);
  assert.match(liveGuards({ ...base, config, env: { ...keys, BRAVE_API_KEY: "" } }).join(), /brave: no key/);
  assert.match(liveGuards({ ...base, config, env: { ...keys, MORPH_API_KEY: "" } }).join(), /MORPH_API_KEY is not set/);
});
