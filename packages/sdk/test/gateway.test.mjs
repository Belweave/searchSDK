import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createSearch, SearchError } from '../dist/index.js';
import { createSearchGateway } from '../dist/gateway.js';
import { createMockProvider } from '../dist/testing.js';

const request = (body = { query: 'search' }, options = {}) => new Request('https://app.example/search', {
  method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer application-token' },
  body: JSON.stringify(body), ...options,
});
const fixture = options => createSearch({ provider: createMockProvider(options) });
const gateway = (options = {}) => createSearchGateway({ search: fixture(), authorize: () => true, ...options });
const code = async response => (await response.json()).error.code;

test('gateway serves protocol v1 with authorization, normalization, provenance, and no-store', async () => {
  const provider = createMockProvider();
  let auth;
  const handle = gateway({ search: createSearch({ provider }), authorize: value => { auth = value; return true; } });
  const response = await handle(request({ query: 'search', limit: 1, includeDomains: ['EXAMPLE.COM', 'example.com'] }));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('x-searchsdk-protocol'), '1');
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(auth.headers.get('authorization'), 'Bearer application-token');
  assert.deepEqual(provider.calls[0].request.includeDomains, ['example.com']);
  const body = await response.json();
  assert.equal(body.results.length, 1);
  assert.equal(body.results[0].provenance.provider, 'mock');
  assert.equal(body.attempts[0].outcome, 'success');
  assert.equal(body.usage, null);
});

test('gateway authorizes before reading/dispatch and sanitizes callback failures', async () => {
  let calls = 0;
  const search = { web: { search() { calls++; throw new Error('provider-secret'); } } };
  const denied = await gateway({ search, authorize: () => false })(request());
  assert.equal(denied.status, 401);
  assert.equal(await code(denied), 'auth');
  const failed = await gateway({ search, authorize: () => { throw new Error('authorization-secret'); } })(request());
  assert.equal(await failed.text(), '{"error":{"code":"unavailable","attempts":[]}}');
  assert.equal(calls, 0);
});

test('gateway rejects credentials, provider selection, invalid filters, bodies and methods', async () => {
  const handle = gateway();
  for (const body of [{ query: 'x', apiKey: 'no' }, { query: 'x', provider: 'exa' }, { query: 'x', limit: 21 },
    { query: ' ' }, { query: 'x', includeDomains: ['example.com'], excludeDomains: ['EXAMPLE.COM'] }]) {
    assert.equal(await code(await handle(request(body))), 'invalid_request');
  }
  assert.equal((await handle(request({}, { method: 'GET', body: undefined }))).status, 405);
  assert.equal((await handle(request({}, { headers: { 'content-type': 'text/plain' } }))).status, 415);
  assert.equal(await code(await handle(request({}, { body: '{' }))), 'invalid_request');
  assert.equal(await code(await gateway({ maxRequestBytes: 8 })(request())), 'invalid_request');
  assert.equal(await code(await handle(request({}, { body: new Uint8Array([0xff]) }))), 'invalid_request');
});

test('gateway bounds a chunked body and cancels its source', async () => {
  let cancelled = false;
  const body = new ReadableStream({ pull(c) { c.enqueue(new Uint8Array(10)); }, cancel() { cancelled = true; } });
  const response = await gateway({ maxRequestBytes: 12 })(request({}, { body, duplex: 'half' }));
  assert.equal(await code(response), 'invalid_request');
  assert.equal(cancelled, true);
});

test('whole deadline covers signal-ignoring authorization and stalled upload', async () => {
  const never = () => new Promise(() => {});
  assert.equal(await code(await gateway({ timeoutMs: 20, authorize: never })(request())), 'timeout');
  const body = new ReadableStream({ pull: never });
  assert.equal(await code(await gateway({ timeoutMs: 20 })(request({}, { body, duplex: 'half' }))), 'timeout');
});

test('gateway propagates cancellation and total timeout to search', async () => {
  let signal;
  const handle = gateway({ timeoutMs: 25, search: { web: { search(_request, options) {
    signal = options.signal; return new Promise(() => {});
  } } } });
  assert.equal(await code(await handle(request())), 'timeout');
  assert.equal(signal.aborted, true);
  const controller = new AbortController();
  controller.abort('sensitive-reason');
  assert.equal(await code(await handle(request({}, { signal: controller.signal }))), 'aborted');
});

test('gateway enforces admission limits and releases slots after failures', async () => {
  let release;
  let entered;
  const ready = new Promise(resolve => { entered = resolve; });
  const handle = gateway({ maxConcurrency: 1, authorize: () => { entered(); return new Promise(resolve => { release = resolve; }); } });
  const first = handle(request());
  await ready;
  const second = await handle(request());
  assert.equal(second.status, 429);
  release(false);
  assert.equal((await first).status, 401);
  const third = handle(request());
  await new Promise(resolve => setImmediate(resolve));
  release(true);
  assert.equal((await third).status, 200);
});

test('gateway validates provider output, caps responses and strips unrecognized metadata', async () => {
  const value = await fixture().web.search({ query: 'x' });
  const withValue = result => gateway({ search: { web: { search: async () => result } } });
  const clean = await (await withValue({ ...value, secret: 'no', attempts: value.attempts.map(a => ({ ...a, raw: 'no' })) })(request())).json();
  assert.equal(clean.secret, undefined);
  assert.equal(clean.attempts[0].raw, undefined);
  for (const bad of [{ ...value, provider: 'bad secret' }, { ...value, attempts: [{ provider: 'p' }] },
    { ...value, results: [{ url: 'https://user:secret@example.com', provenance: {} }] }]) {
    assert.equal(await code(await withValue(bad)(request())), 'invalid_response');
  }
  assert.equal(await code(await gateway({ maxResponseBytes: 128 })(request())), 'invalid_response');
});

test('gateway serializes only sanitized SDK error fields', async () => {
  const handle = gateway({ search: { web: { search: async () => {
    throw new SearchError('rate_limit', { status: 429, retryAfterMs: 1000, attempts: [{ provider: 'invalid secret' }] });
  } } } });
  const response = await handle(request());
  assert.equal(response.status, 429);
  assert.deepEqual(await response.json(), { error: { code: 'rate_limit', status: 429, retryAfterMs: 1000, attempts: [] } });
});

test('gateway emits interoperable UTC timestamps for custom provider metadata', async () => {
  const value = await fixture().web.search({ query: 'x' });
  const timestamp = 'Thu, 22 Oct 2026 12:30:00 GMT';
  value.results[0].provenance.retrievedAt = timestamp;
  value.attempts[0].startedAt = '2026-10-22T14:30:00+02:00';
  const handle = gateway({ search: { web: { search: async () => value } } });
  const response = await (await handle(request())).json();
  assert.equal(response.results[0].provenance.retrievedAt, '2026-10-22T12:30:00.000Z');
  assert.equal(response.attempts[0].startedAt, '2026-10-22T12:30:00.000Z');
  value.results[0].provenance.retrievedAt = '+010000-01-01T00:00:00.000Z';
  assert.equal(await code(await handle(request())), 'invalid_response');
});

test('browser origins require explicit allowlisting and bounded preflight headers', async () => {
  const handle = gateway({ allowedOrigins: ['https://app.example'] });
  const denied = await handle(request({}, { headers: { origin: 'https://evil.example' } }));
  assert.equal(denied.status, 403);
  assert.equal(denied.headers.get('access-control-allow-origin'), null);
  const allowed = await handle(request({}, { method: 'OPTIONS', body: undefined, headers: {
    origin: 'https://app.example', 'access-control-request-method': 'POST', 'access-control-request-headers': 'Authorization, Content-Type',
  } }));
  assert.ok(allowed.ok);
  assert.equal(allowed.headers.get('access-control-allow-origin'), 'https://app.example');
  const invalid = await handle(request({}, { method: 'OPTIONS', body: undefined, headers: {
    origin: 'https://app.example', 'access-control-request-method': 'POST', 'access-control-request-headers': 'X-Provider-Key',
  } }));
  assert.equal(invalid.status, 400);
});

test('gateway requires explicit authorization and validates configuration', () => {
  for (const options of [{ authorize: undefined }, { maxConcurrency: 0 }, { maxResponseBytes: 1 },
    { allowedOrigins: ['*'] }, { allowedOrigins: ['https://app.example/'] }, { unknown: true }]) {
    assert.throws(() => gateway(options), error => error.code === 'configuration');
  }
});
