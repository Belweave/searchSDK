import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createSearch } from '../../packages/sdk/dist/index.js';
import { createMockProvider } from '../../packages/sdk/dist/testing.js';
import { createSearchGateway } from '../../packages/sdk/dist/gateway.js';
import { createSearchClient, createTrustedFetchTransport } from '../../packages/react-native/dist/index.js';

const endpoint = 'https://app.example/search';
function connect(handle, inspect = () => {}) {
  // In-process HTTP boundary. This proves SDK-to-handler interoperability, not device networking.
  return createTrustedFetchTransport(async (url, init) => {
    inspect(url, init);
    return handle(new Request(url, init));
  }, { rejectsRedirects: true, omitsCredentials: true });
}

test('mobile client and server gateway preserve explicit fallback, provenance, usage and attempts', async () => {
  const first = createMockProvider({ id: 'primary', outcomes: [{ type: 'error', code: 'unavailable', status: 503 }] });
  const fallback = createMockProvider({ id: 'secondary', outcomes: [{ type: 'success', usage: { unit: 'credits', value: 1 } }] });
  const handle = createSearchGateway({
    search: createSearch({ provider: first, fallback: [fallback] }),
    authorize: ({ headers }) => headers.get('authorization') === 'Bearer app-session',
  });
  const client = createSearchClient({ endpoint, accessToken: () => 'app-session', fetch: connect(handle, (url, init) => {
    assert.equal(url, endpoint);
    assert.deepEqual(JSON.parse(init.body), { query: 'interop', limit: 1 });
    assert.equal(init.redirect, 'error');
    assert.equal(init.credentials, 'omit');
  }) });
  const result = await client.web.search({ query: 'interop', limit: 1 });
  assert.equal(result.provider, 'secondary');
  assert.equal(result.results.length, 1);
  assert.equal(result.results[0].provenance.provider, 'secondary');
  assert.deepEqual(result.usage, { unit: 'credits', value: 1 });
  assert.deepEqual(result.warnings, [{ code: 'fallback_used', provider: 'secondary' }]);
  assert.deepEqual(result.attempts.map(({ provider, outcome }) => ({ provider, outcome })), [
    { provider: 'primary', outcome: 'error' }, { provider: 'secondary', outcome: 'success' },
  ]);
});

test('gateway authorization failure crosses the client boundary without dispatch or raw details', async () => {
  const provider = createMockProvider();
  const handle = createSearchGateway({ search: createSearch({ provider }), authorize: () => false });
  const client = createSearchClient({ endpoint, accessToken: () => 'private-session', fetch: connect(handle) });
  await assert.rejects(client.web.search({ query: 'private-query' }), error => {
    assert.equal(error.code, 'auth');
    assert.equal(JSON.stringify(error).includes('private'), false);
    return true;
  });
  assert.equal(provider.calls.length, 0);
});

test('cancellation travels from mobile caller through gateway to provider', async () => {
  const provider = createMockProvider({ delayMs: 1000 });
  const handle = createSearchGateway({ search: createSearch({ provider }), authorize: () => true });
  let dispatched;
  const ready = new Promise(resolve => { dispatched = resolve; });
  const client = createSearchClient({ endpoint, fetch: connect(handle, dispatched) });
  const controller = new AbortController();
  const operation = client.web.search({ query: 'cancel' }, { signal: controller.signal });
  await ready;
  await new Promise(resolve => setImmediate(resolve));
  controller.abort();
  await assert.rejects(operation, error => error.code === 'aborted');
  assert.equal(provider.calls.length, 1);
  assert.equal(provider.calls[0].signal.aborted, true);
});

test('bounded batch retains successes, application tokens are acquired separately, and errors are never retried', async () => {
  const provider = createMockProvider({ outcomes: [
    { type: 'success' }, { type: 'error', code: 'rate_limit', status: 429 }, { type: 'success' },
  ] });
  let tokens = 0;
  const client = createSearchClient({ endpoint, accessToken: () => `session-${++tokens}`,
    fetch: connect(createSearchGateway({ search: createSearch({ provider }), authorize: () => true })) });
  const results = await client.web.searchBatch([{ query: 'one' }, { query: 'two' }, { query: 'three' }], { concurrency: 1 });
  assert.deepEqual(results.map(row => row.status), ['fulfilled', 'rejected', 'fulfilled']);
  assert.equal(results[1].error.code, 'rate_limit');
  assert.equal(provider.calls.length, 3);
  assert.equal(tokens, 3);
});
