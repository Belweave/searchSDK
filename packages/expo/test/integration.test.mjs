import test from 'node:test';
import assert from 'node:assert/strict';
import { getEventListeners } from 'node:events';
import {
  setExpoFetch, createExpoSearchClient, SearchError, base, endpoint, response, json, code, pause, trusted,
} from './harness.mjs';

test('named Expo fetch executes the real gateway client and preserves normalization and provenance', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = () => { throw new Error('Global fetch must never run.'); };
  let calls = 0;
  try {
    setExpoFetch(async (input, init) => {
      calls++;
      assert.equal(String(input), endpoint);
      assert.equal(init.method, 'POST');
      assert.equal(init.redirect, 'error');
      assert.equal(init.credentials, 'omit');
      assert.equal(new Headers(init.headers).get('content-type'), 'application/json');
      assert.deepEqual(JSON.parse(init.body), { query: 'search terms', limit: 5, includeDomains: ['example.test'] });
      assert.ok(init.signal instanceof AbortSignal);
      return json();
    });
    const result = await createExpoSearchClient({ endpoint }).web.search({ query: 'search terms', includeDomains: ['Example.Test', 'example.test'] });
    assert.deepEqual(result, response());
    assert.equal(calls, 1);
    assert.equal(SearchError, base.SearchError);
  } finally { globalThis.fetch = original; }
});

test('explicit transport overrides Expo without modifying globals', async () => {
  setExpoFetch(() => assert.fail('Expo fetch must be bypassed'));
  const original = globalThis.fetch;
  let calls = 0;
  const result = await createExpoSearchClient({ endpoint, fetch: trusted(async () => { calls++; return json(); }) }).web.search({ query: 'test' });
  assert.equal(result.provider, 'fixture');
  assert.equal(calls, 1);
  assert.equal(globalThis.fetch, original);
});

test('configuration rejects insecure endpoints and unsupported options without dispatch', () => {
  setExpoFetch(() => assert.fail('Invalid configuration dispatched'));
  for (const options of [
    {}, null, { endpoint: 'http://example.test/search' }, { endpoint: 'https://user:pass@example.test/search' },
    { endpoint: endpoint + '?secret=value' }, { endpoint: endpoint + '#fragment' },
    { endpoint, timeoutMs: 0 }, { endpoint, maxResponseBytes: 0 }, { endpoint, maxConcurrency: 0 },
    { endpoint, accessToken: 'provider-key' }, { endpoint, apiKey: 'provider-key' }, { endpoint, fetch: null },
    { endpoint, native: true },
  ]) assert.throws(() => createExpoSearchClient(options), code('configuration'));
});

test('unsupported normalized fields and invalid filters reject before requesting a token', async () => {
  let tokenCalls = 0;
  setExpoFetch(() => assert.fail('Invalid input dispatched'));
  const client = createExpoSearchClient({ endpoint, accessToken: () => { tokenCalls++; return 'short-lived-token'; } });
  for (const input of [
    { query: ' ' }, { query: 'q', limit: 21 }, { query: 'q', limit: 0 },
    { query: 'q', includeDomains: [] }, { query: 'q', includeDomains: ['https://example.test'] },
    { query: 'q', includeDomains: ['example.test'], excludeDomains: ['EXAMPLE.TEST'] },
    { query: 'q', provider: 'exa' }, { query: 'q', stream: true }, { query: 'q', native: {} },
  ]) await assert.rejects(client.web.search(input), code('invalid_request'));
  assert.equal(tokenCalls, 0);
});

test('token is acquired per request, sent only as bearer header, and never cached', async () => {
  let tokenCalls = 0;
  const tokens = [];
  setExpoFetch(async (_, init) => {
    tokens.push(new Headers(init.headers).get('authorization'));
    assert.ok(!init.body.includes('ephemeral'));
    return json();
  });
  const client = createExpoSearchClient({ endpoint, accessToken: async () => `ephemeral-${++tokenCalls}` });
  await client.web.search({ query: 'first' });
  await client.web.search({ query: 'second' });
  assert.deepEqual(tokens, ['Bearer ephemeral-1', 'Bearer ephemeral-2']);
  assert.equal(tokenCalls, 2);
});

test('transport failures and token callback failures never expose credentials or raw causes', async () => {
  const secret = 'SECRET-credential-query-and-abort-reason';
  for (const options of [
    { endpoint, accessToken: () => { throw new Error(secret); } },
    { endpoint, accessToken: () => secret, fetch: trusted(async () => { throw new Error(secret); }) },
  ]) {
    try { await createExpoSearchClient(options).web.search({ query: secret }); assert.fail('Expected failure'); }
    catch (error) {
      assert.ok(error instanceof SearchError);
      assert.ok(!`${String(error)}${JSON.stringify(error)}${error.stack}`.includes(secret));
      assert.equal(error.cause, undefined);
    }
  }
});

test('configuration preserves strict descriptor validation without invoking getters', () => {
  let reads = 0;
  const get = () => { reads++; throw new Error('private getter exception'); };
  for (const key of ['endpoint', 'fetch', 'accessToken', 'unknown']) {
    const options = { endpoint };
    Object.defineProperty(options, key, { get, enumerable: true });
    assert.throws(() => createExpoSearchClient(options), code('configuration'));
  }
  assert.throws(() => createExpoSearchClient({ endpoint, [Symbol('private')]: true }), code('configuration'));
  assert.throws(() => createExpoSearchClient(Object.create({ endpoint })), code('configuration'));
  assert.throws(() => createExpoSearchClient(new Proxy({}, { ownKeys() { throw new Error('private'); } })), code('configuration'));
  assert.equal(reads, 0);
  assert.doesNotThrow(() => createExpoSearchClient(Object.freeze({ endpoint, fetch: undefined })));
});

test('invalid bearer token syntax fails without dispatch or disclosure', async () => {
  setExpoFetch(() => assert.fail('Invalid token dispatched'));
  for (const token of ['', 'a\r\nAuthorization: stolen', 'contains spaces', null, 123]) {
    await assert.rejects(createExpoSearchClient({ endpoint, accessToken: () => token }).web.search({ query: 'q' }), error =>
      error instanceof SearchError && !String(error).includes('stolen'));
  }
});

test('pre-cancelled and in-flight searches abort without exposing the abort reason', async () => {
  const controller = new AbortController();
  controller.abort('private reason');
  setExpoFetch(() => assert.fail('Pre-cancelled call dispatched'));
  const client = createExpoSearchClient({ endpoint });
  await assert.rejects(client.web.search({ query: 'q' }, { signal: controller.signal }), code('aborted'));
  let started;
  const ready = new Promise(resolve => { started = resolve; });
  let transportSignal;
  setExpoFetch(async (_, init) => { transportSignal = init.signal; started(); return new Promise(() => {}); });
  const active = new AbortController();
  const pending = client.web.search({ query: 'q' }, { signal: active.signal });
  await ready;
  active.abort('private reason');
  await assert.rejects(pending, error => code('aborted')(error) && !JSON.stringify(error).includes('private reason'));
  assert.equal(transportSignal.aborted, true);
  assert.equal(getEventListeners(active.signal, 'abort').length, 0);
});

test('whole-call deadline bounds signal-ignoring transport and token acquisition', async () => {
  let signal;
  setExpoFetch(async (_, init) => { signal = init.signal; return new Promise(() => {}); });
  await assert.rejects(createExpoSearchClient({ endpoint, timeoutMs: 20 }).web.search({ query: 'q' }), code('timeout'));
  assert.equal(signal.aborted, true);
  setExpoFetch(() => assert.fail('Token acquisition must time out before transport'));
  await assert.rejects(createExpoSearchClient({ endpoint, timeoutMs: 20, accessToken: () => new Promise(() => {}) }).web.search({ query: 'q' }), code('timeout'));
});

test('streaming response decodes UTF-8 spanning chunks within the exact byte ceiling', async () => {
  const value = response(); value.results[0].title = 'café 🦊';
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  setExpoFetch(async () => new Response(new ReadableStream({ start(controller) {
    for (const byte of bytes) controller.enqueue(Uint8Array.of(byte));
    controller.close();
  } })));
  const result = await createExpoSearchClient({ endpoint, maxResponseBytes: bytes.byteLength }).web.search({ query: 'q' });
  assert.equal(result.results[0].title, value.results[0].title);
});

test('decoded response ceiling cancels a growing stream, including error bodies', async () => {
  for (const status of [200, 429]) {
    let cancelled = false;
    setExpoFetch(async () => new Response(new ReadableStream({
      start(controller) { controller.enqueue(new Uint8Array(129)); },
      cancel() { cancelled = true; },
    }), { status }));
    await assert.rejects(createExpoSearchClient({ endpoint, maxResponseBytes: 128 }).web.search({ query: 'q' }), code(status === 200 ? 'invalid_response' : 'rate_limit'));
    assert.equal(cancelled, true);
  }
});

test('deadline and cancellation cover stalled response body reads and clean up streams', async () => {
  for (const mode of ['timeout', 'aborted']) {
    let cancelled = false;
    let started;
    const ready = new Promise(resolve => { started = resolve; });
    setExpoFetch(async () => new Response(new ReadableStream({
      pull() { started(); return new Promise(() => {}); }, cancel() { cancelled = true; },
    }, { highWaterMark: 0 })));
    const controller = new AbortController();
    const pending = createExpoSearchClient({ endpoint, timeoutMs: mode === 'timeout' ? 30 : 1000 }).web.search({ query: 'q' }, { signal: controller.signal });
    await ready;
    if (mode === 'aborted') controller.abort('private');
    await assert.rejects(pending, code(mode));
    await pause(0);
    assert.equal(cancelled, true);
    assert.equal(getEventListeners(controller.signal, 'abort').length, 0);
  }
});

test('malformed JSON, schema, provenance, usage, attempts, protocol and result URLs reject', async () => {
  const invalid = [
    null, [], {}, { ...response(), results: [{}] }, { ...response(), provider: '' },
    { ...response(), usage: { unit: 'usd', value: -1 } }, { ...response(), warnings: [{ code: 'arbitrary', provider: 'fixture' }] },
    { ...response(), attempts: [{ provider: 'fixture', durationMs: -1, outcome: 'success', startedAt: 'invalid' }] },
    { ...response(), results: [{ ...response().results[0], provenance: undefined }] },
    { ...response(), results: [{ ...response().results[0], url: 'https://user:pass@example.test' }] },
    { ...response(), results: [{ ...response().results[0], url: 'javascript:alert(1)' }] },
    { ...response(), reuse: 'unknown' },
  ];
  for (const value of invalid) {
    setExpoFetch(async () => json(value));
    await assert.rejects(createExpoSearchClient({ endpoint }).web.search({ query: 'q' }), code('invalid_response'));
  }
  setExpoFetch(async () => new Response('{secret:invalid-json'));
  await assert.rejects(createExpoSearchClient({ endpoint }).web.search({ query: 'q' }), code('invalid_response'));
  setExpoFetch(async () => json(response(), 200, { 'X-SearchSDK-Protocol': '2' }));
  await assert.rejects(createExpoSearchClient({ endpoint }).web.search({ query: 'q' }), code('invalid_response'));
});

test('HTTP failure mapping is sanitized and gateway errors retain safe metadata', async () => {
  for (const [status, expected] of [[401, 'auth'], [402, 'auth'], [403, 'auth'], [432, 'auth'], [433, 'auth'], [429, 'rate_limit'], [408, 'unavailable'], [503, 'unavailable'], [422, 'provider_error']]) {
    setExpoFetch(async () => new Response('private upstream content', { status }));
    await assert.rejects(createExpoSearchClient({ endpoint }).web.search({ query: 'private query' }), error =>
      code(expected)(error) && !JSON.stringify(error).includes('private'));
  }
  setExpoFetch(async () => json({ error: { code: 'rate_limit', attempts: [], status: 429, retryAfterMs: 250, message: 'private' } }, 429));
  await assert.rejects(createExpoSearchClient({ endpoint }).web.search({ query: 'q' }), error =>
    code('rate_limit')(error) && error.status === 429 && error.retryAfterMs === 250 && !JSON.stringify(error).includes('private'));
});

test('redirect responses never trigger an SDK retry', async () => {
  let calls = 0;
  setExpoFetch(async (_, init) => {
    calls++;
    assert.equal(init.redirect, 'error');
    return new Response(null, { status: 307, headers: { location: 'https://elsewhere.example.test/' } });
  });
  await assert.rejects(createExpoSearchClient({ endpoint, accessToken: () => 'ephemeral' }).web.search({ query: 'q' }));
  assert.equal(calls, 1);
});

test('batch uses bounded concurrency and returns ordered individual outcomes', async () => {
  let active = 0, peak = 0;
  setExpoFetch(async (_, init) => {
    peak = Math.max(peak, ++active);
    const { query } = JSON.parse(init.body);
    try { await pause(query === 'slow' ? 15 : 1); return query === 'fail' ? json({ error: { code: 'auth', attempts: [] } }, 401) : json(); }
    finally { active--; }
  });
  const outcomes = await createExpoSearchClient({ endpoint, maxConcurrency: 2 }).web.searchBatch(
    ['slow', 'fast', 'fail', 'last'].map(query => ({ query })), { concurrency: 2 });
  assert.equal(peak, 2);
  assert.deepEqual(outcomes.map(row => [row.index, row.status]), [[0, 'fulfilled'], [1, 'fulfilled'], [2, 'rejected'], [3, 'fulfilled']]);
  assert.equal(outcomes[2].error.code, 'auth');
});

test('batch cancellation and deadline preserve completed siblings and stop queued dispatch', async () => {
  for (const expected of ['aborted', 'timeout']) {
    let calls = 0, started;
    const ready = new Promise(resolve => { started = resolve; });
    setExpoFetch(async () => { calls++; if (calls === 1) return json(); started(); return new Promise(() => {}); });
    const controller = new AbortController();
    const pending = createExpoSearchClient({ endpoint }).web.searchBatch(
      ['complete', 'blocked', 'queued'].map(query => ({ query })),
      { concurrency: 1, timeoutMs: expected === 'timeout' ? 30 : 1000, signal: controller.signal });
    await ready;
    if (expected === 'aborted') controller.abort('private');
    const outcomes = await pending;
    assert.equal(outcomes[0].status, 'fulfilled');
    assert.equal(outcomes[1].error.code, expected);
    assert.equal(outcomes[2].error.code, expected);
    assert.equal(calls, 2);
  }
});
