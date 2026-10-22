import test from 'node:test';
import assert from 'node:assert/strict';
import { createSearch, SearchError, createNativeTransport } from '../dist/index.js';
import { createMockProvider } from '../dist/testing.js';
import { exa } from '../dist/exa.js';
import { createScope } from '../dist/reliability.js';
import { createMemoryCheckpointStore, runDurableOperation, attachDurableRemoteId, DurableOperationError } from '../dist/durable.js';

const code = expected => error => error instanceof SearchError && error.code === expected;
const durableCode = expected => error => error instanceof DurableOperationError && error.code === expected;
const tick = () => new Promise(resolve => setImmediate(resolve));
const empty = () => ({ results: [], usage: null, warnings: [] });
const hit = () => ({ url: 'https://example.com/source', title: 'Valid', provenance: { provider: 'custom', sourceUrl: 'https://example.com/source', retrievedAt: '2026-10-22T00:00:00Z' } });
const custom = response => ({ ...createMockProvider({ id: 'custom' }), search: async () => response });

for (const [name, response] of [
  ['null', null], ['missing fields', {}], ['nonarray results', { ...empty(), results: {} }],
  ['sparse results', { ...empty(), results: Array(1) }],
  ['unsafe source URL', { ...empty(), results: [{ ...hit(), url: 'javascript:alert(1)' }] }],
  ['missing provenance', { ...empty(), results: [{ url: 'https://example.com/' }] }],
  ['invalid provenance URL', { ...empty(), results: [{ ...hit(), provenance: { ...hit().provenance, sourceUrl: 'https://user:private@example.com/' } }] }],
  ['nonfinite score', { ...empty(), results: [{ ...hit(), score: NaN }] }],
  ['malformed highlights', { ...empty(), results: [{ ...hit(), highlights: [1] }] }],
  ['negative usage', { ...empty(), usage: { unit: 'usd', value: -1 } }],
  ['missing usage', { results: [], warnings: [] }],
  ['unsafe warning', { ...empty(), warnings: [{ code: 'private-body', provider: 'custom' }] }],
  ['throwing property', { ...empty(), get results() { throw new Error('private-provider-details'); } }],
]) test(`custom provider ${name} fails as invalid_response without retry or fallback`, async () => {
  const fallback = createMockProvider({ id: 'backup' });
  await assert.rejects(createSearch({ provider: custom(response), fallback: [fallback], retry: { maxRetries: 1, baseDelayMs: 1 } }).web.search({ query: 'fixture' }), error => {
    assert.ok(code('invalid_response')(error));
    assert.equal(error.attempts.length, 1);
    assert.equal(error.attempts[0].code, 'invalid_response');
    assert.ok(!JSON.stringify(error).includes('private-'));
    return true;
  });
  assert.equal(fallback.calls.length, 0);
});

test('custom provider success copies only public normalized fields and isolates mutable results', async () => {
  const row = hit(); row.apiKey = 'private-credential'; row.provenance.raw = 'private-provider-body';
  const response = { results: [row], usage: { unit: 'credits', value: 1, raw: 'private-usage' }, warnings: [{ code: 'provider_warning', provider: 'custom', raw: 'private-warning' }], raw: 'private-response' };
  const result = await createSearch({ provider: custom(response) }).web.search({ query: 'fixture' });
  assert.ok(!JSON.stringify(result).includes('private-'));
  row.title = 'mutated'; row.provenance.provider = 'mutated';
  assert.equal(result.results[0].title, 'Valid');
  assert.equal(result.results[0].provenance.provider, 'custom');
});

test('custom provider rejected errors stay distinct from malformed successful results', async () => {
  const provider = { ...custom(empty()), async search() { throw new Error('private-rejection'); } };
  await assert.rejects(createSearch({ provider }).web.search({ query: 'fixture' }), code('provider_error'));
});

test('normalized transport omits ambient credentials and forbids redirects', async () => {
  let sent;
  await createSearch({ provider: exa({ apiKey: 'fixture', fetch: async (_, init) => { sent = init; return new Response('{"results":[]}'); } }) }).web.search({ query: 'fixture' });
  assert.equal(sent.credentials, 'omit');
  assert.equal(sent.redirect, 'error');
});

test('pre-aborted scope observes already scheduled work rejection', async () => {
  const controller = new AbortController(); controller.abort('private-abort');
  const scope = createScope(1000, controller.signal);
  try {
    await assert.rejects(scope.race(Promise.reject(new Error('private-work-rejection'))), code('aborted'));
    await tick(); // node:test will fail if the scheduled rejection was unhandled.
  } finally { scope.close(); }
});

test('pre-aborted direct normalized adapter never dispatches or leaks an unhandled rejection', async () => {
  const controller = new AbortController(); controller.abort('private-abort');
  let calls = 0;
  await assert.rejects(exa({ apiKey: 'fixture', fetch: async () => { calls++; return new Response('{}'); } }).search({ query: 'fixture', limit: 5 }, { signal: controller.signal }), code('aborted'));
  await tick(); assert.equal(calls, 0);
});

test('native transport rejects arbitrary coercible rawBody objects before dispatch', async () => {
  let calls = 0, coerced = 0;
  const c = createNativeTransport({ provider: 'fixture', baseUrl: 'https://provider.invalid', fetch: async () => { calls++; return new Response('{}'); } });
  for (const rawBody of [{ toString() { coerced++; return 'private-value'; } }, null, 1, true, [], new ReadableStream()]) {
    await assert.rejects(c.request({ id: 'write', method: 'POST', path: '/write' }, { rawBody }), code('invalid_request'));
  }
  assert.equal(calls, 0); assert.equal(coerced, 0);
  for (const rawBody of ['ok', new Blob(['ok']), new URLSearchParams({ x: 'ok' }), new Uint8Array([1, 2]), new ArrayBuffer(1)]) {
    await c.request({ id: 'write', method: 'POST', path: '/write' }, { rawBody });
  }
  assert.equal(calls, 5);
});

const binding = { key: 'stable:key', operation: 'fixture.job', inputFingerprint: 'stable-input' };
const opts = store => ({ ...binding, store, submit: async () => ({ remoteId: 'stable_job' }), poll: async () => ({ state: 'completed', value: 'done' }) });

test('durable invocation keeps its checkpoint key, store and callbacks across caller mutation', async () => {
  const memory = createMemoryCheckpointStore();
  let release;
  const blocked = new Promise(resolve => { release = resolve; });
  const store = { async load(key) { await blocked; return memory.load(key); }, compareAndSet: memory.compareAndSet.bind(memory) };
  const options = opts(store);
  const pending = runDurableOperation(options);
  options.key = 'changed:key'; options.operation = 'changed.job'; options.inputFingerprint = 'changed-input';
  options.store = { load() { throw new Error('wrong-store'); }, compareAndSet() { throw new Error('wrong-store'); } };
  options.submit = async () => { throw new Error('wrong-submit'); };
  options.poll = async () => { throw new Error('wrong-poll'); };
  store.compareAndSet = () => { throw new Error('mutated-method'); };
  release();
  const result = await pending;
  assert.equal(result.value, 'done');
  assert.equal((await memory.load(binding.key)).state, 'completed');
  assert.equal(await memory.load('changed:key'), null);
});

test('durable reconciliation cannot switch keys or remote identifiers while loading', async () => {
  const memory = createMemoryCheckpointStore();
  const ambiguous = { ...opts(memory), submit: async () => { throw new Error('ambiguous'); } };
  await assert.rejects(runDurableOperation(ambiguous), durableCode('ambiguous_submission'));
  await assert.rejects(runDurableOperation({ ...ambiguous, key: 'other:key' }), durableCode('ambiguous_submission'));
  let release;
  const blocked = new Promise(resolve => { release = resolve; });
  const store = { async load(key) { await blocked; return memory.load(key); }, compareAndSet: memory.compareAndSet.bind(memory) };
  const options = { ...binding, store, remoteId: 'verified_job' };
  const pending = attachDurableRemoteId(options);
  options.key = 'other:key'; options.remoteId = 'wrong_job'; options.operation = 'wrong.job';
  release();
  assert.equal((await pending).remoteId, 'verified_job');
  assert.equal((await memory.load(binding.key)).remoteId, 'verified_job');
  assert.equal((await memory.load('other:key')).state, 'submitting');
});

test('durable reconciliation rejects malformed configuration with a sanitized domain error', async () => {
  for (const options of [null, undefined, {}, { ...binding, store: {} }]) await assert.rejects(attachDurableRemoteId(options), durableCode('configuration'));
});

test('native byte buffering preserves fragmented content across buffer growth', async () => {
  const expected = Uint8Array.from({ length: 8193 }, (_, i) => i % 251);
  let offset = 0;
  const c = createNativeTransport({ provider: 'fixture', baseUrl: 'https://provider.invalid', maxResponseBytes: expected.length,
    fetch: async () => new Response(new ReadableStream({ pull(controller) {
      if (offset === expected.length) return controller.close();
      controller.enqueue(expected.slice(offset, ++offset));
    } })) });
  const result = await c.request({ id: 'bytes', method: 'GET', path: '/bytes', response: 'bytes' });
  assert.deepEqual(result.data, expected);
});

test('native response rejects non-byte stream chunks as invalid_response and cancels', async () => {
  let cancelled = false;
  const c = createNativeTransport({ provider: 'fixture', baseUrl: 'https://provider.invalid', fetch: async () => new Response(new ReadableStream({
    start(controller) { controller.enqueue('private-non-byte-payload'); }, cancel() { cancelled = true; }
  })) });
  await assert.rejects(c.request({ id: 'read', method: 'GET', path: '/read' }), code('invalid_response'));
  assert.equal(cancelled, true);
});

test('native SSE compacts tiny fragments without changing event content or split UTF-8', async () => {
  const expected = 'é'.repeat(4097);
  const bytes = new TextEncoder().encode(`data: ${expected}\n\n`);
  let offset = 0;
  const c = createNativeTransport({ provider: 'fixture', baseUrl: 'https://provider.invalid', maxResponseBytes: bytes.length,
    fetch: async () => new Response(new ReadableStream({ pull(controller) {
      if (offset === bytes.length) return controller.close();
      controller.enqueue(bytes.slice(offset, ++offset));
    } }), { headers: { 'content-type': 'text/event-stream' } }) });
  const result = await c.request({ id: 'events', method: 'GET', path: '/events', response: 'sse' });
  const events = []; for await (const event of result.data) events.push(event);
  assert.deepEqual(events, [{ data: expected }]);
});

test('normalized transport handles tiny fragmented JSON without losing UTF-8', async () => {
  const expected = 'é'.repeat(4097);
  const bytes = new TextEncoder().encode(JSON.stringify({ results: [{ url: 'https://example.com/', highlights: [expected] }] }));
  let offset = 0;
  const sdk = createSearch({ provider: exa({ apiKey: 'fixture', fetch: async () => new Response(new ReadableStream({ pull(controller) {
    if (offset === bytes.length) return controller.close();
    controller.enqueue(bytes.slice(offset, ++offset));
  } })) }) });
  assert.equal((await sdk.web.search({ query: 'fixture' })).results[0].highlights[0], expected);
});

test('normalized transport rejects non-byte chunks without exposing their contents', async () => {
  let cancelled = false;
  const sdk = createSearch({ provider: exa({ apiKey: 'fixture', fetch: async () => new Response(new ReadableStream({
    start(controller) { controller.enqueue('private-non-byte-payload'); }, cancel() { cancelled = true; }
  })) }) });
  await assert.rejects(sdk.web.search({ query: 'fixture' }), error => code('invalid_response')(error) && !JSON.stringify(error).includes('private-'));
  assert.equal(cancelled, true);
});
