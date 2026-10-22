import test from 'node:test';
import assert from 'node:assert/strict';
import { getEventListeners } from 'node:events';
import { createSearch, SearchError } from '../dist/index.js';
import { createMockProvider } from '../dist/testing.js';

const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const empty = () => ({ results: [], usage: null, warnings: [] });
const provider = search => ({ ...createMockProvider(), search });
const code = expected => error => error instanceof SearchError && error.code === expected;

test('batch bounds workers, preserves order, and keeps errors alongside successful queries', async () => {
  let active = 0, peak = 0;
  const completed = [];
  const sdk = createSearch({ provider: provider(async ({ query }) => {
    peak = Math.max(peak, ++active);
    try {
      await pause(query === 'slow' ? 25 : 2);
      if (query === 'fail') throw new SearchError('auth');
      completed.push(query);
      return { ...empty(), usage: { unit: 'credits', value: Number(query === 'slow') } };
    } finally { active--; }
  }) });
  const outcomes = await sdk.web.searchBatch(['slow', 'fast', 'fail', 'last'].map(query => ({ query })), { concurrency: 2 });
  assert.equal(peak, 2);
  assert.equal(completed[0], 'fast');
  assert.deepEqual(outcomes.map(row => [row.index, row.status]), [[0, 'fulfilled'], [1, 'fulfilled'], [2, 'rejected'], [3, 'fulfilled']]);
  assert.equal(outcomes[0].value.usage.value, 1);
  assert.equal(outcomes[2].error.code, 'auth');
  assert.equal(outcomes[2].error.attempts.length, 1);
});

test('batch validates envelope before any dispatch and records invalid individual inputs', async () => {
  const mock = createMockProvider();
  const sdk = createSearch({ provider: mock });
  for (const [inputs, options] of [[{}, {}], [Array(1001), {}], [[], null], [[], { concurrency: 0 }], [[], { concurrency: 65 }], [[], { timeoutMs: -1 }], [[], { signal: {} }], [[], { extra: true }]]) {
    await assert.rejects(sdk.web.searchBatch(inputs, options), code('invalid_request'));
  }
  assert.equal(mock.calls.length, 0);
  const inputs = [{ query: 'valid' }, { query: ' ' }, undefined, { query: 'valid', typo: true }];
  const outcomes = await sdk.web.searchBatch(inputs);
  assert.deepEqual(outcomes.map(row => row.status), ['fulfilled', 'rejected', 'rejected', 'rejected']);
  assert.ok(outcomes.slice(1).every(row => row.error.code === 'invalid_request' && row.error.attempts.length === 0));
  assert.equal(mock.calls.length, 1);
  assert.deepEqual(await sdk.web.searchBatch([]), []);
});

test('batch snapshots queued query and filter inputs before caller mutation', async () => {
  const calls = [];
  let release;
  const blocked = new Promise(resolve => { release = resolve; });
  const sdk = createSearch({ provider: provider(async request => {
    calls.push(request);
    if (calls.length === 1) await blocked;
    return empty();
  }) });
  const inputs = [{ query: 'first' }, { query: 'original', includeDomains: ['example.com'] }];
  const pending = sdk.web.searchBatch(inputs, { concurrency: 1 });
  inputs[1].query = 'mutated'; inputs[1].includeDomains[0] = 'changed.test'; inputs.push({ query: 'extra' });
  release();
  const results = await pending;
  assert.equal(results.length, 2);
  assert.equal(calls[1].query, 'original');
  assert.deepEqual(calls[1].includeDomains, ['example.com']);
});

test('batch cancellation aborts active signal-ignoring work and never dispatches queued queries', async () => {
  const controller = new AbortController();
  const signals = [];
  let started;
  const ready = new Promise(resolve => { started = resolve; });
  const sdk = createSearch({ provider: provider(async (_, { signal }) => { signals.push(signal); if (signals.length === 2) started(); return new Promise(() => {}); }) });
  const pending = sdk.web.searchBatch(Array.from({ length: 7 }, (_, i) => ({ query: String(i) })), { signal: controller.signal, concurrency: 2 });
  await ready; controller.abort('private-cancellation-reason');
  const outcomes = await pending;
  assert.equal(signals.length, 2);
  assert.ok(signals.every(signal => signal.aborted));
  assert.ok(outcomes.every(row => row.error.code === 'aborted'));
  assert.deepEqual(outcomes.map(row => row.error.attempts.length), [1, 1, 0, 0, 0, 0, 0]);
  assert.ok(!JSON.stringify(outcomes).includes('private-cancellation-reason'));
  assert.equal(getEventListeners(controller.signal, 'abort').length, 0);
});

test('batch whole-operation deadline preserves completed queries and times out queued queries', async () => {
  let calls = 0;
  const sdk = createSearch({ provider: provider(async () => ++calls === 1 ? empty() : new Promise(() => {})), timeoutMs: 1000 });
  const outcomes = await sdk.web.searchBatch(['done', 'blocked', 'queued'].map(query => ({ query })), { timeoutMs: 30, concurrency: 1 });
  assert.equal(outcomes[0].status, 'fulfilled');
  assert.equal(outcomes[1].error.code, 'timeout');
  assert.equal(outcomes[2].error.code, 'timeout');
  assert.equal(outcomes[2].error.attempts.length, 0);
  assert.equal(calls, 2);
});

test('pre-aborted batches produce explicit outcomes without dispatching', async () => {
  const mock = createMockProvider();
  const controller = new AbortController(); controller.abort('private');
  const outcomes = await createSearch({ provider: mock }).web.searchBatch([{ query: 'a' }, { query: 'b' }], { signal: controller.signal });
  assert.ok(outcomes.every(row => row.error.code === 'aborted'));
  assert.equal(mock.calls.length, 0);
});

test('batch reuses opt-in dedup/cache and respects the shared client concurrency limit', async () => {
  let calls = 0, active = 0, peak = 0;
  const sdk = createSearch({ provider: provider(async () => {
    calls++; peak = Math.max(peak, ++active); await pause(5); active--; return empty();
  }), deduplicate: true, cache: { ttlMs: 1000 }, maxConcurrency: 1 });
  const outcomes = await sdk.web.searchBatch(['same', 'same', 'other'].map(query => ({ query })), { concurrency: 3 });
  assert.equal(calls, 2); assert.equal(peak, 1);
  assert.equal(outcomes[1].value.reuse, 'inflight');
  const cached = await sdk.web.searchBatch([{ query: 'same' }]);
  assert.equal(cached[0].value.reuse, 'cache');
});

test('cancelling a deduplicated batch leaves an independent search subscriber alive', async () => {
  let release, upstream;
  const blocked = new Promise(resolve => { release = resolve; });
  const sdk = createSearch({ provider: provider(async (_, { signal }) => { upstream = signal; await blocked; return empty(); }), deduplicate: true });
  const independent = sdk.web.search({ query: 'shared' });
  const controller = new AbortController();
  const batch = sdk.web.searchBatch([{ query: 'shared' }], { signal: controller.signal });
  await pause(1); controller.abort();
  assert.equal((await batch)[0].error.code, 'aborted');
  assert.equal(upstream.aborted, false);
  release(); await independent;
});

test('64 batch workers use independent signals without accumulating listeners on the batch signal', async () => {
  const controller = new AbortController();
  const sdk = createSearch({ provider: createMockProvider({ delayMs: 1 }) });
  const pending = sdk.web.searchBatch(Array.from({ length: 64 }, (_, i) => ({ query: String(i) })), { signal: controller.signal, concurrency: 64 });
  assert.equal(getEventListeners(controller.signal, 'abort').length, 1);
  const outcomes = await pending;
  assert.ok(outcomes.every(row => row.status === 'fulfilled'));
  assert.equal(getEventListeners(controller.signal, 'abort').length, 0);
});
