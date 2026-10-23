import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { readFileSync } from 'node:fs';
import { NativeModules } from './react-native.fixture.mjs';

registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier === 'expo/fetch') throw new Error('Native entry must not load Expo fetch.');
  if (specifier === '@belweave/search-sdk-react-native') return {
    url: new URL('../../react-native/dist/react-native.js', import.meta.url).href, shortCircuit: true,
  };
  if (specifier === 'react-native') return { url: new URL('./react-native.fixture.mjs', import.meta.url).href, shortCircuit: true };
  return nextResolve(specifier, context);
} });
const { createExpoSearchClient, SearchError } = await import('../dist/index.native.js');
const fixture = JSON.parse(readFileSync(new URL('../../../sdk-contract/fixtures/search-success.json', import.meta.url), 'utf8'));
const endpoint = 'https://gateway.example.test/search';
const code = expected => error => error instanceof SearchError && error.code === expected;

test('native Expo entry binds the actual sibling native transport without loading Expo fetch', async () => {
  const calls = [];
  NativeModules.SearchSDKGateway = {
    async request(...args) {
      calls.push(args);
      return { status: 200, url: endpoint, headers: { 'X-SearchSDK-Protocol': '1' }, bodyBase64: Buffer.from(JSON.stringify(fixture)).toString('base64') };
    }, cancel() {},
  };
  const client = createExpoSearchClient({ endpoint, accessToken: () => 'ephemeral', maxResponseBytes: 4096, timeoutMs: 1000 });
  assert.deepEqual(await client.web.search({ query: 'native integration', limit: 3 }), fixture);
  const [id, target, headers, body, maximum, budget] = calls[0];
  assert.equal(typeof id, 'string');
  assert.equal(target, endpoint);
  assert.equal(headers.Authorization, 'Bearer ephemeral');
  assert.deepEqual(JSON.parse(body), { query: 'native integration', limit: 3 });
  assert.equal(maximum, 4096);
  assert.ok(budget > 0 && budget <= 1000);
});

test('stock Expo Go or missing native module fails explicitly before execution', () => {
  delete NativeModules.SearchSDKGateway;
  assert.throws(() => createExpoSearchClient({ endpoint }), code('configuration'));
});

test('native bridge overflow and raw failures remain sanitized', async () => {
  for (const nativeCode of ['SEARCHSDK_LIMIT', 'SEARCHSDK_INVALID_RESPONSE', 'PRIVATE_NATIVE_FAILURE']) {
    NativeModules.SearchSDKGateway = { async request() { throw { code: nativeCode, message: 'private-token-and-query' }; }, cancel() {} };
    await assert.rejects(createExpoSearchClient({ endpoint }).web.search({ query: 'private-token-and-query' }), error => {
      assert.equal(error.code, nativeCode === 'PRIVATE_NATIVE_FAILURE' ? 'network' : 'invalid_response');
      assert.ok(!JSON.stringify(error).includes('private-token-and-query'));
      assert.equal(error.cause, undefined);
      return true;
    });
  }
});

test('native cancellation and deadlines invoke native cancellation with no raw abort reason', async () => {
  for (const expected of ['aborted', 'timeout']) {
    let started, cancelId;
    const ready = new Promise(resolve => { started = resolve; });
    NativeModules.SearchSDKGateway = {
      async request(id) { started(id); return new Promise(() => {}); },
      cancel(id) { cancelId = id; },
    };
    const controller = new AbortController();
    const pending = createExpoSearchClient({ endpoint, timeoutMs: expected === 'timeout' ? 25 : 1000 }).web.search({ query: 'q' }, { signal: controller.signal });
    const id = await ready;
    if (expected === 'aborted') controller.abort('private reason');
    await assert.rejects(pending, code(expected));
    assert.equal(cancelId, id);
  }
});
