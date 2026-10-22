import test from 'node:test';
import assert from 'node:assert/strict';
import { getEventListeners } from 'node:events';
import { createSearch, SearchError } from '../dist/index.js';
import { createMockProvider } from '../dist/testing.js';
import { exa } from '../dist/exa.js';

const code = expected => error => { assert.equal(error.code, expected); return true; };
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

test('opt-in search retries primary before fallback and counts every dispatch without false fallback warning', async () => {
  const provider = createMockProvider({ outcomes: [{ type: 'error', code: 'network' }, { type: 'success', results: [] }] });
  const backup = createMockProvider({ id: 'backup' });
  const response = await createSearch({ provider, fallback: [backup], retry: { maxRetries: 1, baseDelayMs: 1 } }).web.search({ query: 'q' });
  assert.equal(provider.calls.length, 2); assert.equal(backup.calls.length, 0);
  assert.deepEqual(response.attempts.map(a => a.code ?? a.outcome), ['network', 'success']);
  assert.deepEqual(response.warnings, []);
});

test('search exhausts bounded retries per provider before explicit fallback', async () => {
  const provider = createMockProvider({ outcomes: [{ type: 'error', code: 'unavailable' }, { type: 'error', code: 'unavailable' }] });
  const response = await createSearch({ provider, fallback: [createMockProvider({ id: 'backup' })], retry: { maxRetries: 1, baseDelayMs: 1 } }).web.search({ query: 'q' });
  assert.equal(provider.calls.length, 2); assert.equal(response.attempts.length, 3);
  assert.deepEqual(response.warnings, [{ code: 'fallback_used', provider: 'backup' }]);
});

for (const terminal of ['auth', 'invalid_response', 'provider_error', 'unsupported_option']) test(`search never retries terminal ${terminal}`, async () => {
  const provider = createMockProvider({ outcomes: [{ type: 'error', code: terminal }] });
  await assert.rejects(createSearch({ provider, retry: { maxRetries: 5, baseDelayMs: 1 } }).web.search({ query: 'q' }), code(terminal));
  assert.equal(provider.calls.length, 1);
});

test('search Retry-After cannot be shortened to squeeze another call into the deadline', async () => {
  let calls = 0;
  const provider = { ...createMockProvider(), search: async () => { calls++; throw new SearchError('rate_limit', { status: 429, retryAfterMs: 5000 }); } };
  await assert.rejects(createSearch({ provider, retry: { maxRetries: 2 }, timeoutMs: 50 }).web.search({ query: 'q' }), error => {
    assert.equal(error.code, 'timeout'); assert.equal(error.attempts.length, 1); return true;
  });
  assert.equal(calls, 1);
});

test('search backoff cancellation is prompt, sanitized and releases caller listeners', async () => {
  const controller = new AbortController();
  const provider = createMockProvider({ outcomes: [{ type: 'error', code: 'network' }] });
  const request = createSearch({ provider, retry: { maxRetries: 2, baseDelayMs: 1000 } }).web.search({ query: 'q' }, { signal: controller.signal });
  setTimeout(() => controller.abort('private-secret'), 10);
  await assert.rejects(request, error => { assert.equal(error.code, 'aborted'); assert.equal(error.attempts.length, 1); assert.ok(!JSON.stringify(error).includes('private-secret')); return true; });
  assert.equal(provider.calls.length, 1); assert.equal(getEventListeners(controller.signal, 'abort').length, 0);
});

test('search queue time counts toward total deadline and releases cancelled waiters', async () => {
  let calls = 0; let release;
  const provider = { ...createMockProvider(), search: async () => { calls++; await new Promise(resolve => { release = resolve; }); return { results: [], usage: null, warnings: [] }; } };
  const search = createSearch({ provider, maxConcurrency: 1, timeoutMs: 30 });
  const first = search.web.search({ query: 'first' });
  await pause(5); const controller = new AbortController();
  const second = search.web.search({ query: 'second' }, { signal: controller.signal });
  controller.abort(); await assert.rejects(second, code('aborted'));
  await assert.rejects(first, code('timeout'));
  assert.equal(calls, 1); release();
});

test('success cache is opt-in, cloned, TTL bounded, LRU bounded and never caches errors', async () => {
  const provider = createMockProvider(); const client = createSearch({ provider, cache: { ttlMs: 30, maxEntries: 2 } });
  const first = await client.web.search({ query: 'a' }); first.attempts[0].provider = 'changed';
  assert.equal((await client.web.search({ query: 'a' })).reuse, 'cache'); assert.equal(provider.calls.length, 1);
  assert.notEqual((await client.web.search({ query: 'a' })).attempts[0].provider, 'changed');
  await client.web.search({ query: 'b' }); await client.web.search({ query: 'a' }); await client.web.search({ query: 'c' });
  await client.web.search({ query: 'b' }); assert.equal(provider.calls.length, 4);
  await pause(40); await client.web.search({ query: 'b' }); assert.equal(provider.calls.length, 5);
  const broken = createMockProvider({ outcomes: [{ type: 'error', code: 'network' }, { type: 'success', results: [] }] });
  const errors = createSearch({ provider: broken, cache: { ttlMs: 1000 } });
  await assert.rejects(errors.web.search({ query: 'q' })); await errors.web.search({ query: 'q' }); assert.equal(broken.calls.length, 2);
});

test('deduplication canonicalizes filter sets, keeps subscribers independent and isolates results', async () => {
  let calls = 0; let complete;
  const provider = { ...createMockProvider(), search: async () => { calls++; return new Promise(resolve => { complete = resolve; }); } };
  const client = createSearch({ provider, deduplicate: true });
  const controller = new AbortController();
  const first = client.web.search({ query: 'q', includeDomains: ['b.com', 'a.com'] }, { signal: controller.signal });
  const second = client.web.search({ query: 'q', includeDomains: ['a.com', 'b.com'] });
  await pause(1); controller.abort(); await assert.rejects(first, code('aborted')); assert.equal(calls, 1);
  complete({ results: [], warnings: [], usage: null }); const result = await second;
  assert.equal(result.reuse, 'inflight'); assert.equal(calls, 1);
});

test('dedup all-subscriber cancellation aborts upstream; replacement never joins cancelled work', async () => {
  let calls = 0; const signals = [];
  const provider = { ...createMockProvider(), search: async (_, { signal }) => { calls++; signals.push(signal); return calls === 1 ? new Promise(() => {}) : { results: [], warnings: [], usage: null }; } };
  const client = createSearch({ provider, deduplicate: true });
  const controller = new AbortController(); const request = client.web.search({ query: 'q' }, { signal: controller.signal });
  await pause(1); controller.abort(); await assert.rejects(request, code('aborted'));
  await client.web.search({ query: 'q' }); assert.equal(calls, 2); assert.equal(signals[0].aborted, true);
});

test('mutually exclusive filters reject chain-wide before dispatch', async () => {
  const primary = createMockProvider(); const base = createMockProvider({ id: 'backup' });
  const backup = { ...base, capabilities: { ...base.capabilities, mutuallyExclusiveDomainFilters: true } };
  await assert.rejects(createSearch({ provider: primary, fallback: [backup] }).web.search({ query: 'q', includeDomains: ['a.com'], excludeDomains: ['b.com'] }), code('unsupported_option'));
  assert.equal(primary.calls.length, 0); assert.equal(backup.calls.length, 0);
});

test('normalized adapters enforce decoded byte cap incrementally and cancel without retry', async () => {
  let cancelled = 0; let calls = 0;
  const provider = exa({ apiKey: 'fixture', fetch: async () => {
    calls++; let chunks = 0;
    return new Response(new ReadableStream({ pull(controller) { chunks++; controller.enqueue(new Uint8Array(1024 * 1024).fill(32)); if (chunks > 20) controller.close(); }, cancel() { cancelled++; } }));
  } });
  await assert.rejects(createSearch({ provider, retry: { maxRetries: 2 } }).web.search({ query: 'q' }), code('invalid_response'));
  assert.equal(calls, 1); assert.equal(cancelled, 1);
});

for (const config of [{ retry: { maxRetries: 6 } }, { retry: { maxRetries: null } }, { retry: { baseDelayMs: 500, maxDelayMs: 1 } }, { retry: { typo: 1 } }, { maxConcurrency: 0 }, { cache: { ttlMs: 0 } }, { cache: { ttlMs: 10, maxEntries: 0 } }, { deduplicate: 'yes' }]) test(`reliability config rejects ${JSON.stringify(config)}`, () => {
  assert.throws(() => createSearch({ provider: createMockProvider(), ...config }), code('configuration'));
});

test('normalized encoded Content-Length does not replace incremental decoded-byte accounting', async () => {
  const provider = exa({ apiKey: 'fixture', fetch: async () => new Response('{"results":[]}', { headers: { 'content-encoding': 'gzip', 'content-length': String(11 * 1024 * 1024) } }) });
  assert.deepEqual((await createSearch({ provider }).web.search({ query: 'q' })).results, []);
});

test('internal total deadlines retain timeout classification through nested adapter scopes', async () => {
  const provider = exa({ apiKey: 'fixture', fetch: async () => new Promise(() => {}) });
  await Promise.all(Array.from({ length: 16 }, async () => {
    await assert.rejects(createSearch({ provider, timeoutMs: 20 }).web.search({ query: 'q' }), code('timeout'));
  }));
});

test('response assembly enforces the attempt budget and records one error for one dispatch', async () => {
  let calls = 0;
  const provider = { ...createMockProvider(), search: async () => {
    calls++;
    return { results: [], usage: null, get warnings() { const stop = performance.now() + 20; while (performance.now() < stop) {} return []; } };
  } };
  await assert.rejects(createSearch({ provider, timeoutMs: 100, attemptTimeoutMs: 10 }).web.search({ query: 'q' }), error => {
    assert.equal(error.code, 'attempt_timeout'); assert.equal(error.attempts.length, 1); assert.equal(error.attempts[0].outcome, 'error'); return true;
  });
  assert.equal(calls, 1);
});
