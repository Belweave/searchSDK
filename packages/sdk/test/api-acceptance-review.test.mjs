import test from 'node:test';
import assert from 'node:assert/strict';
import { createSearch, SearchError } from '../dist/index.js';
import { createNativeTransport } from '../dist/native-transport.js';
import { createBraveClient } from '../dist/native-brave.js';
import { createContextClient } from '../dist/native-context.js';
import { createExaClient } from '../dist/native-exa.js';
import { createLinkupClient } from '../dist/native-linkup.js';
import { createTavilyClient } from '../dist/native-tavily.js';
import { createWonderSearchClient } from '../dist/native-wondersearch.js';
import { createPerplexityClient } from '../dist/native-perplexity.js';
import { serpapi } from '../dist/serpapi.js';
import { exa } from '../dist/exa.js';
import { runDurableOperation, createMemoryCheckpointStore, attachDurableRemoteId } from '../dist/durable.js';

// Independent wire expectations from official references, not generator catalogs.
// No network access, credentials, or provider availability claims.
const json = value => new Response(JSON.stringify(value));
const failure = code => error => error?.code === code;
const deferred = () => {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
};
function capture(value = {}) {
  const calls = [];
  return { calls, fetch: async (url, init) => {
    calls.push({ url: new URL(url), init });
    return json(value);
  } };
}

test('acceptance: Brave result_filter is one comma-delimited query value', async () => {
  // https://api-dashboard.search.brave.com/api-reference/web/search/get
  const t = capture();
  await createBraveClient({ apiKey: 'fixture', fetch: t.fetch }).search({
    query: { q: 'query & punctuation', result_filter: ['web', 'news'], goggles: ['https://a.invalid/g', 'https://b.invalid/g'] },
  });
  assert.deepEqual(t.calls[0].url.searchParams.getAll('result_filter'), ['web,news']);
  assert.equal(t.calls[0].url.searchParams.get('q'), 'query & punctuation');
  // Goggles is separately documented as a list; result_filter's prose does not change it.
  assert.deepEqual(t.calls[0].url.searchParams.getAll('goggles'), ['https://a.invalid/g', 'https://b.invalid/g']);
});

test('acceptance: Context parse preserves bracket objects, comma tags, and raw PDF bytes', async () => {
  // https://docs.context.dev/parse/pdfs-and-ocr.md explicitly uses pdf[start]/pdf[end].
  const t = capture();
  const bytes = new Uint8Array([37, 80, 68, 70]);
  await createContextClient({ apiKey: 'fixture', fetch: t.fetch }).parse({
    rawBody: bytes, query: { extension: 'pdf', pdf: { start: 2, end: 5 }, tags: ['alpha', 'beta'], ocr: true },
  });
  assert.equal(t.calls[0].url.pathname, '/v1/parse');
  assert.equal(t.calls[0].url.searchParams.get('pdf[start]'), '2');
  assert.equal(t.calls[0].url.searchParams.get('pdf[end]'), '5');
  assert.equal(t.calls[0].url.searchParams.has('pdf'), false);
  assert.equal(t.calls[0].url.searchParams.get('tags'), 'alpha,beta');
  assert.deepEqual(new Uint8Array(t.calls[0].init.body), bytes);
});

test('acceptance: Exa deepObject metadata and repeated event arrays retain distinct styles', async () => {
  const t = capture();
  const c = createExaClient({ apiKey: 'fixture', fetch: t.fetch });
  await c.listMonitors({ query: { metadata: { project: 'sdk & review' }, cursor: null } });
  await c.listEvents({ query: { types: ['webset.created', 'webset.deleted'] } });
  assert.equal(t.calls[0].url.searchParams.get('metadata[project]'), 'sdk & review');
  assert.equal(t.calls[0].url.searchParams.has('cursor'), false);
  assert.equal(t.calls[1].url.pathname, '/websets/v0/events');
  assert.deepEqual(t.calls[1].url.searchParams.getAll('types'), ['webset.created', 'webset.deleted']);
});

test('acceptance: Linkup list filters repeat keys and preserve pagination', async () => {
  const t = capture();
  await createLinkupClient({ apiKey: 'fixture', fetch: t.fetch }).listTasks({
    query: { type: ['search', 'fetch'], status: ['pending', 'completed'], limit: 2 },
  });
  assert.deepEqual(t.calls[0].url.searchParams.getAll('type'), ['search', 'fetch']);
  assert.deepEqual(t.calls[0].url.searchParams.getAll('status'), ['pending', 'completed']);
  assert.equal(t.calls[0].url.searchParams.get('limit'), '2');
});

test('acceptance: beta header and separate Exa team credential are sent to exact origins', async () => {
  const t = capture();
  const c = createExaClient({ apiKey: 'search-fixture', teamApiKey: 'team-fixture', fetch: t.fetch });
  await c.listBatches();
  await c.listApiKeys();
  assert.equal(t.calls[0].init.headers.get('Exa-Beta'), 'batches-2026-06-06');
  assert.equal(t.calls[0].url.origin, 'https://api.exa.ai');
  assert.equal(t.calls[0].init.headers.get('x-api-key'), 'search-fixture');
  assert.equal(t.calls[1].url.origin, 'https://admin-api.exa.ai');
  assert.equal(t.calls[1].init.headers.get('x-api-key'), 'team-fixture');
});

test('acceptance: Tavily payment requests never receive the normal API credential', async () => {
  const t = capture();
  const c = createTavilyClient({ apiKey: 'key-fixture', fetch: t.fetch });
  await c.search({ body: { query: 'query' } });
  await c.paidSearch({ body: { query: 'query' }, headers: { 'PAYMENT-SIGNATURE': 'external-fixture' } });
  assert.equal(t.calls[0].init.headers.get('authorization'), 'Bearer key-fixture');
  assert.equal(t.calls[1].url.origin, 'https://x402.tavily.com');
  assert.equal(t.calls[1].init.headers.has('authorization'), false);
  assert.equal(t.calls[1].init.headers.get('PAYMENT-SIGNATURE'), 'external-fixture');
});

test('acceptance: a WonderSearch idempotency key never enables automatic write replay', async () => {
  let calls = 0;
  const c = createWonderSearchClient({ apiKey: 'fixture', retry: { maxRetries: 2, baseDelayMs: 1, maxDelayMs: 1 },
    fetch: async () => { calls++; return new Response(null, { status: 503 }); } });
  await assert.rejects(c.createDriveDocument({ path: { drive_id: 'drive' },
    headers: { 'Idempotency-Key': 'fixture-intent' }, body: { documents: [{ external_id: 'doc', text: 'content' }] } }), failure('unavailable'));
  assert.equal(calls, 1);
});

test('acceptance: stream headers and body negotiate SSE, with no replay after event failure', async () => {
  let calls = 0;
  const c = createPerplexityClient({ apiKey: 'fixture', retry: { maxRetries: 2, baseDelayMs: 1, maxDelayMs: 1 },
    fetch: async (url, init) => {
      calls++;
      assert.equal(init.headers.get('accept'), 'text/event-stream');
      assert.equal(JSON.parse(new TextDecoder().decode(init.body)).stream, true);
      return new Response(new ReadableStream({ start(controller) {
        controller.enqueue(new TextEncoder().encode('data: first\n\n'));
      }, pull(controller) { controller.error(new Error('fixture transport failure')); } }),
      { headers: { 'content-type': 'text/event-stream' } });
    } });
  const r = await c.chatCompletionsStream({ body: { model: 'sonar', messages: [{ role: 'user', content: 'query' }] } });
  await assert.rejects(async () => { for await (const event of r.data) void event; }, failure('network'));
  assert.equal(calls, 1);
});

test('acceptance: SerpAPI documented fully-empty Google success normalizes to zero results', async () => {
  // Official example: https://www.serpapi.com/blog/fix-serpapi-errors-guide/
  const t = capture({ search_metadata: { status: 'Success', id: 'fixture' },
    search_information: { total_results: 0, organic_results_state: 'Fully empty' },
    error: "Google hasn't returned any results for this query." });
  const result = await createSearch({ provider: serpapi({ apiKey: 'fixture', fetch: t.fetch }) }).web.search({ query: 'no-match' });
  assert.deepEqual(result.results, []);
  assert.equal(result.attempts.length, 1);
  assert.equal(result.attempts[0].outcome, 'success');
});

test('acceptance: SerpAPI unrelated errors and malformed nonempty rows never become empty success', async () => {
  for (const response of [
    { search_metadata: { status: 'Success' }, search_information: { organic_results_state: 'Fully empty' }, error: 'Account problem' },
    { search_metadata: { status: 'Success' }, organic_results: [{ title: 'missing URL' }] },
    { search_metadata: { status: 'Processing' }, organic_results: [] },
  ]) {
    const c = createSearch({ provider: serpapi({ apiKey: 'fixture', fetch: async () => json(response) }) });
    await assert.rejects(c.web.search({ query: 'query' }), error => error instanceof SearchError);
  }
});

test('acceptance: normalized direct adapter incrementally caps decoded bytes and cancels', async () => {
  let cancelled = 0;
  const provider = exa({ apiKey: 'fixture', fetch: async () => new Response(new ReadableStream({
    pull(controller) { controller.enqueue(new Uint8Array(1024 * 1024)); }, cancel() { cancelled++; },
  }), { headers: { 'content-encoding': 'gzip', 'content-length': '1' } }) });
  await assert.rejects(provider.search({ query: 'query', limit: 1 }, { signal: new AbortController().signal }), failure('invalid_response'));
  assert.equal(cancelled, 1);
});

test('acceptance: invalid query values cannot replace configured auth or escape into fetch', async () => {
  let calls = 0;
  const c = createNativeTransport({ provider: 'review', baseUrl: 'https://provider.invalid/v1',
    headers: { Authorization: 'Bearer fixture' }, fetch: async () => { calls++; return json({}); } });
  await assert.rejects(c.request({ id: 'read', method: 'GET', path: '/read' }, { headers: { aUtHoRiZaTiOn: 'replacement' } }), failure('invalid_request'));
  await assert.rejects(c.request({ id: 'read', method: 'GET', path: '/read' }, { query: { q: { nested: 'invalid' } } }), failure('invalid_request'));
  assert.equal(calls, 0);
});

test('acceptance: a second durable caller cannot submit while the first has an unacknowledged submission', async () => {
  const store = createMemoryCheckpointStore();
  const started = deferred(), done = deferred();
  let submissions = 0;
  const options = { key: 'concurrent-intent', operation: 'job.create', inputFingerprint: 'account-request', store,
    submit: async () => { submissions++; started.resolve(); return done.promise; },
    poll: async () => ({ state: 'completed', value: { result: 'saved' } }) };
  const first = runDurableOperation(options);
  await started.promise;
  await assert.rejects(runDurableOperation(options), failure('ambiguous_submission'));
  done.resolve({ remoteId: 'remote' });
  const result = await first;
  assert.equal(submissions, 1);
  assert.deepEqual(result.value, { result: 'saved' });
});

test('acceptance: competing durable completion is a CAS conflict, never a contradictory success', async () => {
  const inner = createMemoryCheckpointStore();
  await inner.compareAndSet('cas-intent', null, { version: 1, revision: 1, operation: 'job.create',
    inputFingerprint: 'account-request', state: 'submitted', remoteId: 'remote', updatedAt: new Date().toISOString() });
  const store = { load: key => inner.load(key), compareAndSet: async (key, expected, next) => {
    await inner.compareAndSet(key, expected, { ...next, result: 'winner' });
    return inner.compareAndSet(key, expected, next);
  } };
  await assert.rejects(runDurableOperation({ key: 'cas-intent', operation: 'job.create', inputFingerprint: 'account-request', store,
    submit: async () => { assert.fail('must resume'); }, poll: async () => ({ state: 'completed', value: 'loser' }) }),
  error => error.code === 'checkpoint_conflict' && error.remoteId === 'remote');
  assert.equal((await inner.load('cas-intent')).result, 'winner');
});

test('acceptance: late intent persistence fails closed and demands explicit reconciliation', async () => {
  const inner = createMemoryCheckpointStore();
  const entered = deferred(), persist = deferred();
  let submissions = 0;
  const store = { load: key => inner.load(key), compareAndSet: async (...args) => {
    entered.resolve(); await persist.promise; return inner.compareAndSet(...args);
  } };
  const controller = new AbortController();
  const options = { key: 'late-cas', operation: 'job.create', inputFingerprint: 'account-request', store,
    submit: async () => { submissions++; return { remoteId: 'remote' }; }, poll: async () => ({ state: 'pending' }) };
  const running = runDurableOperation({ ...options, signal: controller.signal });
  await entered.promise;
  controller.abort();
  await assert.rejects(running, failure('aborted'));
  persist.resolve();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(submissions, 0);
  await assert.rejects(runDurableOperation({ ...options, store: inner }), failure('ambiguous_submission'));
  await assert.rejects(attachDurableRemoteId({ key: 'late-cas', operation: 'job.create', inputFingerprint: 'different', remoteId: 'remote', store: inner }), failure('checkpoint_conflict'));
});

test('acceptance: durable result snapshot cannot silently turn a reread accessor into null', async () => {
  const store = createMemoryCheckpointStore();
  let reads = 0;
  const value = { get amount() { return ++reads === 1 ? 5 : NaN; } };
  try {
    const result = await runDurableOperation({ key: 'accessor-intent', operation: 'job.create', inputFingerprint: 'fixture', store,
      submit: async () => ({ remoteId: 'remote' }), poll: async () => ({ state: 'completed', value }) });
    // Either reject executable properties, or take one validated snapshot. No second read/lossy serialization.
    assert.deepEqual(result.value, { amount: 5 });
    assert.equal(reads, 1);
  } catch (error) {
    if (error?.code !== 'poll_failed') throw error;
    assert.equal((await store.load('accessor-intent')).state, 'submitted');
  }
});

test('acceptance: a hidden toJSON hook cannot replace validated durable result data', async () => {
  const store = createMemoryCheckpointStore();
  const value = { amount: 5 };
  Object.defineProperty(value, 'toJSON', { value: () => ({ amount: null }) });
  try {
    const result = await runDurableOperation({ key: 'tojson-intent', operation: 'job.create', inputFingerprint: 'fixture', store,
      submit: async () => ({ remoteId: 'remote' }), poll: async () => ({ state: 'completed', value }) });
    assert.deepEqual(result.value, { amount: 5 });
  } catch (error) {
    if (error?.code !== 'poll_failed') throw error;
    assert.equal((await store.load('tojson-intent')).state, 'submitted');
  }
});

test('acceptance: native JSON parsing cannot return success after the whole-call deadline', async t => {
  // Deterministically model CPU time spent in built-in parsing without a large allocation or timing benchmark.
  const payload = '{"review_parse_budget":true}';
  const parse = JSON.parse;
  let parsed = false;
  t.mock.method(JSON, 'parse', function (source, ...args) {
    const value = Reflect.apply(parse, this, [source, ...args]);
    if (source === payload) {
      parsed = true;
      const until = performance.now() + 40;
      while (performance.now() < until) { /* Synchronous parsing cannot be preempted. */ }
    }
    return value;
  });
  const c = createNativeTransport({ provider: 'review', baseUrl: 'https://provider.invalid', timeoutMs: 10,
    fetch: async () => new Response(payload) });
  await assert.rejects(c.request({ id: 'parse', method: 'GET', path: '/json' }), failure('timeout'));
  assert.equal(parsed, true, 'the fixture must reach parsing, rather than timing out before it');
});
