import { createHash } from 'node:crypto';
import { providers, loadAdapter } from './providers.mjs';
import { fixtureFetch } from './fixtures.mjs';

export const hash = value => createHash('sha256').update(typeof value === 'string' ? value : JSON.stringify(value)).digest('hex');
const fail = code => { throw new Error(code); };
const exact = (value, keys) => {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(key => !keys.includes(key))) fail('invalid_config');
};
const integer = (value, min, max) => { if (!Number.isInteger(value) || value < min || value > max) fail('invalid_config'); };
const label = value => typeof value === 'string' && /^[a-z0-9][a-z0-9._-]{0,63}$/i.test(value);
const errors = new Set(['invalid_request', 'unsupported_option', 'configuration', 'auth', 'rate_limit', 'network',
  'unavailable', 'attempt_timeout', 'timeout', 'aborted', 'invalid_response', 'provider_error']);

export function validateConfig(config, dataset) {
  exact(config, ['protocolVersion', 'dataset', 'seed', 'runtime', 'execution', 'providers', 'disclosures']);
  if (config.protocolVersion !== '0.2.0-draft' || config.dataset !== 'public-web-v1' || dataset.id !== config.dataset) fail('invalid_config');
  integer(config.seed, 1, 0xffffffff);
  exact(config.runtime, ['environment', 'region', 'machineClass']);
  if (!['local-fixture', 'boat', 'other'].includes(config.runtime.environment) || !label(config.runtime.region) || !label(config.runtime.machineClass)) fail('invalid_config');
  const e = config.execution;
  exact(e, ['resultDepth', 'warmupsPerProvider', 'runs', 'concurrency', 'timeoutMs', 'minIntervalMs', 'maxRequests', 'maxDurationMs', 'maxSpendUsd', 'retry', 'cache', 'deduplicate', 'fallback']);
  integer(e.resultDepth, 1, 20); integer(e.warmupsPerProvider, 0, 5); integer(e.runs, 1, 20);
  integer(e.concurrency, 1, 1); integer(e.timeoutMs, 1, 60000); integer(e.minIntervalMs, 0, 60000);
  integer(e.maxRequests, 1, 10000); integer(e.maxDurationMs, 1, 86400000);
  if (!Number.isFinite(e.maxSpendUsd) || e.maxSpendUsd < 0 || e.maxSpendUsd > 100 || e.retry !== 'off' || e.cache !== 'off' || e.deduplicate !== false || e.fallback !== 'off') fail('invalid_config');
  if (!Array.isArray(config.providers) || config.providers.length < 1 || config.providers.length > providers.length) fail('invalid_config');
  const seen = new Set();
  for (const p of config.providers) {
    exact(p, ['id', 'plan', 'reservationUsdPerRequest', 'instanceAlias', 'engineManifestSha256']);
    if (!providers.some(item => item.id === p.id) || seen.has(p.id) || !label(p.plan)) fail('invalid_config');
    if (p.reservationUsdPerRequest !== null && (!Number.isFinite(p.reservationUsdPerRequest) || p.reservationUsdPerRequest < 0 || p.reservationUsdPerRequest > 100)) fail('invalid_config');
    if (p.id === 'searxng') {
      if (!label(p.instanceAlias) || p.engineManifestSha256 !== null && !/^[a-f0-9]{64}$/.test(p.engineManifestSha256)) fail('invalid_config');
    } else if (p.instanceAlias !== undefined || p.engineManifestSha256 !== undefined) fail('invalid_config');
    seen.add(p.id);
  }
  exact(config.disclosures, ['funding', 'providerCredits', 'pricingVerifiedOn']);
  if (!['none', 'declared', 'not-declared'].includes(config.disclosures.funding) || !['none', 'declared', 'not-declared'].includes(config.disclosures.providerCredits)) fail('invalid_config');
  const day = config.disclosures.pricingVerifiedOn;
  if (day !== null && (typeof day !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(day) || !Number.isFinite(Date.parse(day)) || new Date(day).toISOString().slice(0, 10) !== day)) fail('invalid_config');
  if (!Array.isArray(dataset.queries) || dataset.queries.length < 1 || dataset.queries.length > 1000 || new Set(dataset.queries.map(q => q.id)).size !== dataset.queries.length) fail('invalid_dataset');
  for (const q of dataset.queries) if (!label(q.id) || typeof q.query !== 'string' || q.query.length < 1 || q.query.length > 500) fail('invalid_dataset');
  return config;
}

// Seeded Fisher–Yates, independent of wall-clock time and transport timings.
export function shuffled(items, seed) {
  const output = [...items];
  let state = seed >>> 0;
  for (let i = output.length - 1; i > 0; i--) {
    state ^= state << 13; state ^= state >>> 17; state ^= state << 5;
    const j = (state >>> 0) % (i + 1);
    [output[i], output[j]] = [output[j], output[i]];
  }
  return output;
}

export function makePlan(config, dataset) {
  validateConfig(config, dataset);
  const selected = config.providers.map(p => ({ ...providers.find(item => item.id === p.id), ...p }));
  const eligible = selected.filter(p => p.comparable);
  const schedule = [];
  // One explicitly unmeasured warm-up query per provider per warm-up round.
  for (let round = 0; round < config.execution.warmupsPerProvider; round++) {
    for (const p of shuffled(eligible, config.seed + round)) schedule.push({ provider: p.id, queryId: dataset.queries[0].id, phase: 'warmup', round });
  }
  // Interleave providers per query; shuffle queries and providers on every round.
  for (let round = 0; round < config.execution.runs; round++) {
    for (const [index, query] of shuffled(dataset.queries, config.seed + 101 + round).entries()) {
      for (const p of shuffled(eligible, config.seed + 1009 + round * dataset.queries.length + index)) {
        schedule.push({ provider: p.id, queryId: query.id, phase: 'measured', round });
      }
    }
  }
  return {
    protocolVersion: config.protocolVersion, dataset: { id: dataset.id, version: dataset.version, sha256: hash(dataset) },
    configSha256: hash(config), seed: config.seed, expectedRequests: schedule.length,
    providers: selected.map(({ keyEnv, ...p }) => p),
    exclusions: selected.filter(p => !p.comparable).map(p => ({ provider: p.id, reason: p.exclusion })),
    schedule,
  };
}

export function validateLive(config, plan, { allowLive = false, env = process.env } = {}) {
  if (!allowLive || env.SEARCHSDK_BENCHMARK_ALLOW_LIVE !== '1') fail('live_opt_in_required');
  if (config.runtime.environment === 'local-fixture' || ['not-measured', 'not-recorded'].includes(config.runtime.region) || config.runtime.machineClass === 'not-recorded') fail('live_runtime_required');
  if (config.execution.minIntervalMs < 250 || config.execution.maxSpendUsd <= 0 || plan.expectedRequests > config.execution.maxRequests) fail('live_budget_required');
  if (config.disclosures.funding === 'not-declared' || config.disclosures.providerCredits === 'not-declared' || !config.disclosures.pricingVerifiedOn) fail('live_disclosures_required');
  const secrets = [];
  for (const p of plan.providers.filter(p => p.comparable)) {
    if (p.plan === 'unverified' || p.reservationUsdPerRequest === null) fail('live_pricing_required');
    const entry = providers.find(item => item.id === p.id);
    if (entry.keyEnv) {
      const value = env[entry.keyEnv];
      if (typeof value !== 'string' || value.trim().length === 0) fail('live_credentials_required');
      secrets.push(value);
    }
  }
  if (plan.providers.some(p => p.id === 'searxng')) {
    publicInstance(env.SEARXNG_BASE_URL);
    const instance = plan.providers.find(p => p.id === 'searxng');
    if (instance.instanceAlias === 'not-configured' || !instance.engineManifestSha256) fail('live_instance_required');
  }
  // Prevent even an accidental secret pasted into a public metadata label.
  if (secrets.some(secret => JSON.stringify({ config, plan }).includes(secret))) fail('secret_in_metadata');
  const reservation = plan.schedule.reduce((sum, task) => sum + plan.providers.find(p => p.id === task.provider).reservationUsdPerRequest, 0);
  if (reservation > config.execution.maxSpendUsd + Number.EPSILON * plan.schedule.length) fail('live_budget_exceeded');
}

function publicInstance(value) {
  let url;
  try { url = new URL(value); } catch { fail('live_instance_required'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.pathname !== '/' || /(?:^|\.)example\.(?:org|com|net)$/.test(url.hostname)) fail('live_instance_required');
  return url.origin;
}

const sleep = (ms, signal) => new Promise((resolve, reject) => {
  const abort = () => { clearTimeout(timer); signal?.removeEventListener('abort', abort); reject(new Error('aborted')); };
  const timer = setTimeout(() => { signal?.removeEventListener('abort', abort); resolve(); }, ms);
  if (signal?.aborted) abort(); else signal?.addEventListener('abort', abort, { once: true });
});

/** Serial by design in protocol v0.2; all warmups/failures consume the same budget. */
export async function execute(config, dataset, {
  mode = 'fixture', allowLive = false, env = process.env, signal,
  adapterLoader = loadAdapter, onRecord = async () => {}, sdkRoot,
} = {}) {
  if (!['fixture', 'live'].includes(mode)) fail('invalid_mode');
  const plan = makePlan(config, dataset);
  if (mode === 'live') validateLive(config, plan, { allowLive, env });
  const { createSearch } = await import(sdkRoot ? new URL('index.js', sdkRoot).href : '@belweave/search-sdk');
  const startedAt = new Date().toISOString();
  const started = performance.now();
  const e = config.execution;
  const clients = new Map();
  // Resolve every adapter before dispatching, so a missing module never causes a partial paid run.
  for (const p of providers.filter(p => p.comparable && plan.providers.some(row => row.id === p.id))) {
    const options = p.id === 'searxng'
      ? { baseUrl: mode === 'fixture' ? 'https://search.example.org' : publicInstance(env.SEARXNG_BASE_URL) }
      : { apiKey: mode === 'fixture' ? 'synthetic-fixture-key' : env[p.keyEnv] };
    if (mode === 'fixture') options.fetch = fixtureFetch(p.id);
    const adapter = await adapterLoader(p, options, sdkRoot);
    clients.set(p.id, createSearch({ provider: adapter, timeoutMs: e.timeoutMs, maxConcurrency: 1 }));
  }
  const controller = new AbortController();
  const cancel = () => controller.abort();
  signal?.addEventListener('abort', cancel, { once: true });
  if (signal?.aborted) cancel();
  const deadline = setTimeout(cancel, Math.max(0, e.maxDurationMs - (performance.now() - started)));
  const records = [];
  let stopReason = 'complete', reservedUsd = 0, lastStart = -Infinity;
  try {
    for (const task of plan.schedule) {
      if (controller.signal.aborted) { stopReason = signal?.aborted ? 'cancelled' : 'deadline'; break; }
      if (records.length >= e.maxRequests) { stopReason = 'request-budget'; break; }
      const reservation = mode === 'live' ? plan.providers.find(p => p.id === task.provider).reservationUsdPerRequest : 0;
      if (reservedUsd + reservation > e.maxSpendUsd + Number.EPSILON * plan.schedule.length) { stopReason = 'spend-budget'; break; }
      // Fixture runs need no artificial delay; they cannot dispatch to the network.
      if (mode === 'live') {
        try { await sleep(Math.max(0, e.minIntervalMs - (performance.now() - lastStart)), controller.signal); }
        catch { stopReason = signal?.aborted ? 'cancelled' : 'deadline'; break; }
      }
      if (controller.signal.aborted) { stopReason = signal?.aborted ? 'cancelled' : 'deadline'; break; }
      reservedUsd += reservation;
      lastStart = performance.now();
      const at = new Date().toISOString();
      let outcome;
      try {
        const response = await clients.get(task.provider).web.search({
          query: dataset.queries.find(q => q.id === task.queryId).query, limit: e.resultDepth,
        }, { signal: controller.signal });
        const usage = response.usage && ['usd', 'credits'].includes(response.usage.unit) && Number.isFinite(response.usage.value) && response.usage.value >= 0
          ? { unit: response.usage.unit, value: response.usage.value } : null;
        outcome = { outcome: response.results.length ? 'success' : 'empty', errorCode: null,
          httpStatus: null, resultCount: response.results.length, warningCount: response.warnings.length, usage };
      } catch (error) {
        outcome = { outcome: 'error', errorCode: errors.has(error?.code) ? error.code : 'provider_error',
          httpStatus: Number.isInteger(error?.status) && error.status >= 100 && error.status <= 599 ? error.status : null,
          resultCount: 0, warningCount: 0, usage: null };
      }
      const record = { schemaVersion: '1.0.0', sequence: records.length, mode, track: 'open-web-search',
        ...task, startedAt: at, finishedAt: new Date().toISOString(),
        durationMs: Math.round((performance.now() - lastStart) * 1000) / 1000, ...outcome };
      // Only allowlisted scalars are emitted: never headers, raw errors, URLs, IDs or content.
      records.push(record);
      await onRecord(record);
    }
  } finally {
    clearTimeout(deadline);
    signal?.removeEventListener('abort', cancel);
  }
  return { schemaVersion: '1.0.0', mode, evidence: mode === 'fixture' ? 'synthetic-not-provider-performance' : 'unreviewed-live',
    publicationReady: false, startedAt, finishedAt: new Date().toISOString(),
    durationMs: Math.round(performance.now() - started), stopReason, reservedUsd,
    completedRequests: records.length, unstartedRequests: plan.expectedRequests - records.length,
    plan, records, summaries: summarize(records),
    relevance: { score: null, reason: 'No blinded relevance judgments have been collected.' },
    costUsd: { value: null, reason: 'Reservations and provider-reported units are not reconciled billing.' },
    limitations: ['Small smoke dataset; not a representative relevance benchmark.',
      'Warmup describes process reuse; provider caches and connection state are not controlled.',
      'No raw result content is retained; relevance review needs a separate lawful evidence workflow.'] };
}

export function summarize(records) {
  return [...new Set(records.map(r => r.provider))].map(provider => {
    const rows = records.filter(r => r.provider === provider && r.phase === 'measured');
    const valid = rows.filter(r => r.outcome !== 'error');
    const durations = valid.map(r => r.durationMs).sort((a, b) => a - b);
    const percentile = p => durations.length ? durations[Math.max(0, Math.ceil(durations.length * p) - 1)] : null;
    return { provider, measuredAttempts: rows.length, schemaValid: valid.length,
      nonempty: rows.filter(r => r.outcome === 'success').length, empty: rows.filter(r => r.outcome === 'empty').length,
      errors: rows.filter(r => r.outcome === 'error').length,
      completionRate: rows.length ? valid.length / rows.length : null,
      successfulResponseLatencyMs: { p50: percentile(0.5), p95: percentile(0.95) },
      errorCodes: Object.fromEntries([...new Set(rows.filter(r => r.errorCode).map(r => r.errorCode))]
        .map(code => [code, rows.filter(r => r.errorCode === code).length])) };
  });
}
