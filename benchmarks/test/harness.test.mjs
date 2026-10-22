import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { execute, makePlan, validateConfig, validateLive, summarize, shuffled } from '../harness.mjs';
import { providers, loadAdapter } from '../providers.mjs';
import { fixtureFetch } from '../fixtures.mjs';
import { parseArgs } from '../run.mjs';

const config = JSON.parse(await readFile(new URL('../configs/portable-v1.json', import.meta.url)));
const dataset = JSON.parse(await readFile(new URL('../datasets/public-web-v1.json', import.meta.url)));
const protocol = JSON.parse(await readFile(new URL('../../apps/web/public/benchmark-methodology.json', import.meta.url)));
const schema = JSON.parse(await readFile(new URL('../attempt.schema.json', import.meta.url)));
const resultSchema = JSON.parse(await readFile(new URL('../results.schema.json', import.meta.url)));
const sdkRoot = process.env.SEARCHSDK_BENCHMARK_TEST_SDK_ROOT
  ? pathToFileURL(resolve(process.env.SEARCHSDK_BENCHMARK_TEST_SDK_ROOT) + '/').href : undefined;
const small = () => ({ ...structuredClone(config), providers: structuredClone(config.providers.filter(p => p.id === 'context')),
  execution: { ...config.execution, warmupsPerProvider: 0, runs: 1 } });
const oneQuery = { ...dataset, queries: dataset.queries.slice(0, 1) };

test('all 15 providers are inventoried; only the 14 normalized web adapters are scheduled', () => {
  const plan = makePlan(config, dataset);
  assert.equal(plan.providers.length, 15);
  assert.equal(plan.expectedRequests, 14 * (1 + 12 * 3));
  assert.equal(new Set(plan.schedule.map(task => task.provider)).size, 14);
  assert(!plan.schedule.some(task => task.provider === 'wondersearch'));
  assert.match(plan.exclusions[0].reason, /corpus/i);
  assert.deepEqual(protocol.tracks[0].providers.sort(), providers.filter(p => p.comparable).map(p => p.id).sort());
  assert.equal(protocol.protocolVersion, config.protocolVersion);
  assert.equal(protocol.resultsPublished, false);
  assert.equal(protocol.runs.length, 0);
});

test('query/provider order is reproducible, changes by seed, and is balanced per query/round', () => {
  const plan = makePlan(config, dataset);
  assert.deepEqual(makePlan(config, dataset), plan);
  assert.notDeepEqual(makePlan({ ...config, seed: 42 }, dataset).schedule, plan.schedule);
  assert.deepEqual(shuffled([1, 2, 3], 11).sort(), [1, 2, 3]);
  for (const q of dataset.queries) for (let round = 0; round < config.execution.runs; round++) {
    const group = plan.schedule.filter(t => t.queryId === q.id && t.round === round && t.phase === 'measured');
    assert.equal(group.length, 14);
    assert.equal(new Set(group.map(t => t.provider)).size, 14);
  }
});

test('strict config rejects unbounded concurrency, unknown fields, provider IDs and credential fields', () => {
  for (const mutate of [c => c.execution.concurrency = 2, c => c.execution.maxSpendUsd = Infinity,
    c => c.providers.push(c.providers[0]), c => c.providers[0].apiKey = 'forbidden',
    c => c.execution.retry = 'on', c => c.runtime.hostname = 'private',
    c => c.providers[0].id = '../unexpected', c => c.execution.runs = 21]) {
    const c = structuredClone(config); mutate(c);
    assert.throws(() => validateConfig(c, dataset), /invalid_config/);
  }
});

test('CLI defaults to planning and rejects ambiguous or misspelled live flags', () => {
  assert.equal(parseArgs([]).mode, 'plan');
  assert.equal(parseArgs(['--mode', 'fixture']).allowLive, false);
  for (const args of [['--live'], ['--mode', 'liv'], ['--allow-live'], ['--mode'], ['--mode', 'plan', '--mode', 'live']]) {
    assert.throws(() => parseArgs(args), /invalid_arguments/);
  }
});

test('live guards fail closed before importing an adapter or dispatching anything', async () => {
  const plan = makePlan(config, dataset);
  assert.throws(() => validateLive(config, plan, { env: {} }), /live_opt_in_required/);
  assert.throws(() => validateLive(config, plan, { allowLive: true, env: {} }), /live_opt_in_required/);
  assert.throws(() => validateLive(config, plan, { allowLive: true, env: { SEARCHSDK_BENCHMARK_ALLOW_LIVE: '1' } }), /live_runtime_required/);
  let imports = 0;
  await assert.rejects(execute(config, dataset, { mode: 'live', env: {}, adapterLoader: async () => { imports++; } }), /live_opt_in_required/);
  assert.equal(imports, 0);
});

test('live validation rejects missing pricing, insufficient budget, and secrets in metadata without running live', () => {
  const c = small();
  c.runtime = { environment: 'boat', region: 'operator-verified', machineClass: 'small' };
  c.execution.maxSpendUsd = 1;
  c.disclosures = { funding: 'none', providerCredits: 'none', pricingVerifiedOn: '2026-10-22' };
  const env = { SEARCHSDK_BENCHMARK_ALLOW_LIVE: '1', CONTEXT_API_KEY: 'synthetic-key-never-sent' };
  const validate = () => validateLive(c, makePlan(c, oneQuery), { allowLive: true, env });
  assert.throws(validate, /live_pricing_required/);
  c.providers[0].plan = 'standard'; c.providers[0].reservationUsdPerRequest = 2;
  assert.throws(validate, /live_budget_exceeded/);
  c.providers[0].reservationUsdPerRequest = 0.1;
  c.providers[0].plan = env.CONTEXT_API_KEY;
  assert.throws(validate, /secret_in_metadata/);
  c.providers[0].plan = 'standard';
  delete env.CONTEXT_API_KEY;
  assert.throws(validate, /live_credentials_required/);
});

test('SearXNG live validation requires a sanitized identity manifest and an explicit HTTPS origin', () => {
  const c = small(); c.providers = structuredClone(config.providers.filter(p => p.id === 'searxng'));
  c.runtime = { environment: 'boat', region: 'operator-verified', machineClass: 'small' };
  c.execution.maxSpendUsd = 1;
  c.disclosures = { funding: 'none', providerCredits: 'none', pricingVerifiedOn: '2026-10-22' };
  Object.assign(c.providers[0], { plan: 'self-hosted', reservationUsdPerRequest: 0 });
  for (const instance of [undefined, 'http://search.test', 'https://user:pass@search.test', 'https://search.test/?key=secret', 'https://example.org']) {
    assert.throws(() => validateLive(c, makePlan(c, oneQuery), { allowLive: true,
      env: { SEARCHSDK_BENCHMARK_ALLOW_LIVE: '1', SEARXNG_BASE_URL: instance } }), /live_instance_required/);
  }
  assert.throws(() => validateLive(c, makePlan(c, oneQuery), { allowLive: true,
    env: { SEARCHSDK_BENCHMARK_ALLOW_LIVE: '1', SEARXNG_BASE_URL: 'https://search.test' } }), /live_instance_required/);
});

test('all 14 adapters normalize injected fixture responses with global network disabled', async () => {
  const originalFetch = globalThis.fetch;
  let networkCalls = 0;
  globalThis.fetch = () => { networkCalls++; throw new Error('unexpected network'); };
  try {
    const c = structuredClone(config); c.execution.runs = 1; c.execution.warmupsPerProvider = 0;
    const result = await execute(c, oneQuery, { sdkRoot });
    assert.equal(result.stopReason, 'complete');
    assert.equal(result.completedRequests, 14);
    assert.equal(result.records.filter(r => r.outcome === 'success').length, 14);
    assert.equal(result.evidence, 'synthetic-not-provider-performance');
    assert.deepEqual(Object.keys(result).sort(), resultSchema.required.toSorted());
    assert.deepEqual(Object.keys(result.plan).sort(), resultSchema.properties.plan.required.toSorted());
    assert.equal(result.publicationReady, false);
    assert.equal(result.relevance.score, null); assert.equal(result.costUsd.value, null);
    assert.equal(networkCalls, 0);
    for (const row of result.records) {
      assert.deepEqual(Object.keys(row).sort(), schema.required.toSorted());
      assert(row.durationMs >= 0); assert(Number.isFinite(Date.parse(row.startedAt)));
      assert(schema.properties.provider.enum.includes(row.provider));
      assert.equal(row.resultCount, 1);
    }
    assert(!JSON.stringify(result).includes('synthetic-fixture-key'));
    assert(!JSON.stringify(result).includes('https://example.org/reference'));
  } finally { globalThis.fetch = originalFetch; }
});

test('rate limits are retained and never retried; raw secret-bearing errors are omitted', async () => {
  let transportCalls = 0;
  const result = await execute(small(), oneQuery, { sdkRoot, adapterLoader: async (p, options, root) =>
    loadAdapter(p, { ...options, fetch: async (...args) => { transportCalls++; return fixtureFetch(p.id, 'rate_limit')(...args); } }, root) });
  assert.equal(transportCalls, 1);
  assert.equal(result.records[0].errorCode, 'rate_limit');
  assert.equal(result.summaries[0].completionRate, 0);
  assert.equal(result.summaries[0].successfulResponseLatencyMs.p95, null);
  const secret = 'https://private.example/?api_key=DO-NOT-SERIALIZE';
  const hidden = await execute(small(), oneQuery, { sdkRoot, adapterLoader: async p => ({ id: p.id,
    capabilities: { domainFilters: false, maxIncludeDomains: 0, maxExcludeDomains: 0 },
    search: async () => { throw new Error(secret); } }) });
  assert(!JSON.stringify(hidden).includes(secret));
});

test('warmups count toward request budgets but not measured denominators', async () => {
  const c = small(); c.execution.warmupsPerProvider = 1; c.execution.maxRequests = 1;
  const result = await execute(c, dataset, { sdkRoot });
  assert.equal(result.stopReason, 'request-budget');
  assert.equal(result.records.length, 1); assert.equal(result.records[0].phase, 'warmup');
  assert.equal(result.summaries[0].measuredAttempts, 0); assert.equal(result.summaries[0].completionRate, null);
  assert.equal(result.unstartedRequests, 12);
});

test('whole-run deadline bounds a noncooperative provider; cancellation starts no subsequent requests', async () => {
  const c = small(); c.execution.maxDurationMs = 15; c.execution.timeoutMs = 1000;
  const result = await execute(c, dataset, { sdkRoot, adapterLoader: async p => ({ id: p.id,
    capabilities: { domainFilters: false, maxIncludeDomains: 0, maxExcludeDomains: 0 },
    search: async () => new Promise(() => {}) }) });
  assert.equal(result.records.length, 1); assert.equal(result.records[0].outcome, 'error');
  assert.equal(result.stopReason, 'deadline'); assert(result.durationMs < 500);
  const controller = new AbortController(); controller.abort();
  const stopped = await execute(small(), dataset, { sdkRoot, signal: controller.signal });
  assert.equal(stopped.stopReason, 'cancelled'); assert.equal(stopped.records.length, 0);
});

test('empty valid responses remain visible; failed latency and warmups cannot improve measured percentiles', () => {
  const rows = [{ provider: 'context', phase: 'warmup', durationMs: 1, outcome: 'success', errorCode: null },
    { provider: 'context', phase: 'measured', durationMs: 10, outcome: 'success', errorCode: null },
    { provider: 'context', phase: 'measured', durationMs: 20, outcome: 'empty', errorCode: null },
    { provider: 'context', phase: 'measured', durationMs: 15000, outcome: 'error', errorCode: 'timeout' }];
  const [summary] = summarize(rows);
  assert.equal(summary.measuredAttempts, 3); assert.equal(summary.schemaValid, 2);
  assert.equal(summary.completionRate, 2 / 3); assert.equal(summary.nonempty, 1); assert.equal(summary.empty, 1);
  assert.deepEqual(summary.successfulResponseLatencyMs, { p50: 10, p95: 20 });
  assert.deepEqual(summary.errorCodes, { timeout: 1 });
});
