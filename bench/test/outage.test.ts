// Our own connection failing is not the provider's failure (METHOD section 4).
import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { fixtureFetch } from "../src/fixtures.ts";
import { capturingFetch } from "../src/run/capture.ts";
import { reclassifyLocalOutages, readAttemptLog, readAttempts, runPaths, type AttemptRecord } from "../src/run/records.ts";
import { runSearch } from "../src/run/runner.ts";
import { loadRunItems } from "../src/run/plan.ts";
import { scoreRun } from "../src/score/score.ts";
import { openSession } from "../src/session.ts";
import { fixtureConfig, tempStore } from "./helpers.ts";

const rec = (provider: string, startedAt: string, over: Partial<AttemptRecord> = {}): AttemptRecord => ({
  key: `s|1|i|${provider}|default`, pass: 1, itemId: "i", provider, profile: "default", startedAt, outcome: "network_error",
  durationMs: 1, billed: "possible", costUsd: 0, costSource: "none", costEstimated: false, reservedUsd: 0,
  resultCount: 0, urls: [], resultHashes: [], requestId: null, warnings: [], ...over,
});

test("network failures of two providers within seconds are ours; a lone one is the provider's", () => {
  const out = reclassifyLocalOutages([
    rec("a", "2026-11-25T21:05:39.000Z"),
    rec("b", "2026-11-25T21:05:47.000Z"),
    rec("a", "2026-11-25T20:28:41.000Z", { key: "lone" }),
    rec("c", "2026-11-25T20:28:45.000Z", { key: "ok", outcome: "ok_nonempty" }),
  ]);
  assert.deepEqual(out.map((a) => a.outcome), ["local_network", "local_network", "network_error", "ok_nonempty"]);
});

test("an offline probe makes a lone failure ours; an online probe does not clear a shared one", () => {
  const out = reclassifyLocalOutages([
    rec("a", "2026-11-25T21:05:39.000Z", { probeOnline: true }),
    rec("b", "2026-11-25T21:05:41.000Z", { probeOnline: true }),
    rec("c", "2026-11-25T22:00:00.000Z", { probeOnline: false }),
    rec("a", "2026-11-25T23:00:00.000Z", { probeOnline: true }),
  ]);
  assert.deepEqual(out.map((a) => a.outcome), ["local_network", "local_network", "local_network", "network_error"]);
});

test("calls lost to our own outage wait for the connection and are retried, never scored", async () => {
  tempStore();
  const config = fixtureConfig();
  const base = fixtureFetch(loadRunItems(config));
  let offline = true;
  let failed = 0;
  const fetch: typeof globalThis.fetch = async (input, init) => {
    if (offline) { failed++; throw new TypeError("fetch failed"); }
    return base(input, init);
  };
  const s = openSession({ config, mode: "fixture", fetch });
  // Offline at the first probe; back online once the run has waited.
  let probes = 0;
  const connectivity = async () => { probes++; if (probes === 1) return false; offline = false; return true; };
  assert.equal(await runSearch({ ...s, connectivity }), "done");
  assert.ok(failed > 0);
  const log = readAttemptLog(runPaths(s.dir).attempts);
  assert.ok(log.some((a) => a.outcome === "local_network"));
  const current = readAttempts(runPaths(s.dir).attempts);
  assert.ok(current.every((a) => a.outcome !== "local_network"), "every lost call was retried");
  assert.equal(current.length, s.plan.search.calls);
  const scores = scoreRun(s.dir, { config: s.config, method: s.method, items: s.items, judgeItemIds: s.plan.judgeItemIds });
  for (const p of scores.profiles) assert.equal(p.reliability.rates["local_network"], undefined);
});

test("a failed call keeps the provider's error reply in the local raw file only", async () => {
  tempStore();
  const config = fixtureConfig();
  const s = openSession({ config, mode: "fixture", fetch: capturingFetch(fixtureFetch(loadRunItems(config))) });
  assert.equal(await runSearch(s), "done");
  const failed = readAttempts(runPaths(s.dir).attempts).find((a) => a.outcome === "server_error")!;
  assert.ok(failed, "the flaky fixture provider returns 503s");
  const raw = JSON.parse(readFileSync(runPaths(s.dir).rawSearch(failed.pass, failed.provider, failed.profile, failed.itemId), "utf8"));
  assert.equal(raw.failure.replies[0].status, 503);
  assert.match(raw.failure.replies[0].body, /synthetic outage/);
  assert.equal(JSON.stringify(failed).includes("synthetic outage"), false, "attempt records never hold reply text");
});
