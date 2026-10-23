import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { createSearchClient, createTrustedFetchTransport, SearchError } from '../dist/index.js';
import { createNativeTransport } from '../dist/native-transport.js';

const shared = name => JSON.parse(readFileSync(new URL(`../../../sdk-contract/fixtures/${name}.json`, import.meta.url), 'utf8'));
const requestCases = shared('request-cases');
const success = shared('search-success');
const errors = shared('search-errors');
const endpoint = 'https://gateway.invalid/exact/path';
const query = { query: 'synthetic query' };
const code = expected => error => error instanceof SearchError && error.code === expected;
const clone = () => structuredClone(success);
const trusted = implementation => createTrustedFetchTransport(implementation, { rejectsRedirects: true, omitsCredentials: true });
const json = (body = clone(), status = 200, headers = {}) => new Response(JSON.stringify(body), { status, headers });
const client = (transport = async () => json(), options = {}) => createSearchClient({ endpoint, fetch: trusted(transport), ...options });
const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; };
const tick = () => new Promise(resolve => setImmediate(resolve));
function assertPrivate(error, values) {
  const exposed = `${error.stack}\n${JSON.stringify(error)}\n${String(error.cause)}`;
  for (const value of values) assert.ok(!exposed.includes(value), `Error exposed private value: ${value}`);
}

for (const fixture of requestCases.valid) test(`shared request: ${fixture.name}`, async () => {
  let captured;
  const sdk = client(async (url, init) => { captured = { url, init }; return json(); });
  assert.deepEqual(await sdk.web.search(fixture.input), success);
  assert.equal(captured.url, endpoint);
  assert.deepEqual(JSON.parse(captured.init.body), fixture.normalized);
  assert.equal(captured.init.redirect, 'error');
  assert.equal(captured.init.credentials, 'omit');
  assert.equal(captured.init.cache, 'no-store');
  assert.equal(captured.init.method, 'POST');
  assert.deepEqual(captured.init.headers, { 'Content-Type': 'application/json', Accept: 'application/json' });
  assert.equal(captured.init.maxResponseBytes, 10 * 1024 * 1024);
});
for (const fixture of requestCases.invalid) test(`shared invalid request: ${fixture.name}`, async () => {
  let calls = 0;
  await assert.rejects(client(async () => { calls++; return json(); }).web.search(fixture.input), code(fixture.code));
  assert.equal(calls, 0);
});
for (const fixture of errors) test(`shared error envelope: ${fixture.httpStatus}`, async () => {
  await assert.rejects(client(async () => json(fixture.body, fixture.httpStatus)).web.search(query), error => {
    assert.ok(code(fixture.body.error.code)(error));
    assert.equal(error.status, fixture.httpStatus);
    return true;
  });
});
for (const value of [null, [], {}, { query: 'x', limit: NaN }, { query: 'x', limit: Infinity }, { query: 'x', includeDomains: [,] },
  { query: 'x', excludeDomains: ['éxample.com'] }, { query: 'x', includeDomains: ['-bad.com'] }, { query: 'x', includeDomains: ['example..com'] },
  { query: 'x', includeDomains: ['example.com/path'] }, { query: 'x', [Symbol('private')]: true },
  { get query() { throw new Error('private-getter'); } }]) test('runtime input validation rejects malformed data and accessors', async () => {
  await assert.rejects(client().web.search(value), code('invalid_request'));
});

for (const value of ['http://example.com', 'https://u:p@example.com', 'https://@example.com', 'https://example.com?', 'https://example.com#',
  'https://example.com?q=secret', ' https://example.com', 'https://example.com/\n', 'https://example.com/\\path', 'file:///private', '/search', '', null]) {
  test(`unsafe endpoint rejected: ${JSON.stringify(value)}`, () => assert.throws(() => client(undefined, { endpoint: value }), code('configuration')));
}
for (const value of [null, -1, 0, 0.5, NaN, Infinity, '5', 2_147_483_648]) {
  for (const field of ['timeoutMs', 'maxResponseBytes', 'maxConcurrency']) test(`invalid configuration ${field}: ${value}`, () => {
    assert.throws(() => client(undefined, { [field]: value }), code('configuration'));
  });
}
test('transport trust is explicit and ambient fetch is never used', () => {
  assert.throws(() => createSearchClient({ endpoint }), code('configuration'));
  assert.throws(() => createSearchClient({ endpoint, fetch: globalThis.fetch }), code('configuration'));
  assert.throws(() => createTrustedFetchTransport(globalThis.fetch, { rejectsRedirects: true }), code('configuration'));
  assert.throws(() => client(undefined, { provider: 'exa' }), code('configuration'));
});
test('configuration and queued request inputs are snapshotted', async () => {
  const blocked = deferred(), started = deferred(), seen = [];
  const config = { endpoint, maxConcurrency: 1, fetch: trusted(async (url, init) => {
    seen.push({ url, body: JSON.parse(init.body) }); started.resolve();
    if (seen.length === 1) await blocked.promise;
    return json();
  }) };
  const sdk = createSearchClient(config);
  const first = sdk.web.search(query); await started.promise;
  const request = { query: 'queued', includeDomains: ['EXAMPLE.COM'] };
  const second = sdk.web.search(request);
  config.endpoint = 'https://mutated.invalid'; config.fetch = () => { throw new Error('mutated'); };
  request.query = 'changed'; request.includeDomains[0] = 'changed.invalid';
  blocked.resolve(); await Promise.all([first, second]);
  assert.deepEqual(seen[1], { url: endpoint, body: { query: 'queued', limit: 5, includeDomains: ['example.com'] } });
});
test('tokens are resolved for each dispatch with no retries or persistence', async () => {
  let tokenCalls = 0, fetchCalls = 0;
  const sdk = client(async (_, init) => { fetchCalls++; assert.equal(init.headers.Authorization, `Bearer synthetic-${fetchCalls}`); return json(); },
    { accessToken: async () => `synthetic-${++tokenCalls}` });
  await sdk.web.search(query); await sdk.web.search(query);
  assert.equal(tokenCalls, 2); assert.equal(fetchCalls, 2);
});
for (const token of ['', null, undefined, 1, 'private token', 'private\r\nInjected: header', 'Bearer secret']) test(`invalid bearer token sanitized: ${JSON.stringify(token)}`, async () => {
  let calls = 0;
  await assert.rejects(client(async () => { calls++; return json(); }, { accessToken: () => token }).web.search(query), code('auth'));
  assert.equal(calls, 0);
});
test('token rejection and malicious transport errors never expose raw details', async () => {
  const secrets = ['private-app-token', 'private-request-query', 'private-callback-error'];
  for (const sdk of [client(undefined, { accessToken: () => { throw new Error(secrets.join(' ')); } }),
    client(async () => { throw new Error(secrets.join(' ')); }, { accessToken: () => secrets[0] }),
    client(async () => { throw new SearchError('invalid_response', { attempts: [{ provider: secrets[0], startedAt: secrets[1] }] }); })]) {
    await assert.rejects(sdk.web.search({ query: secrets[1] }), error => { assertPrivate(error, secrets); return true; });
  }
});

const mutations = {
  'provider missing': body => { delete body.provider; },
  'provider unsafe': body => { body.provider = 'Bearer secret'; },
  'results missing': body => { delete body.results; },
  'result not record': body => { body.results[0] = null; },
  'result credentials': body => { body.results[0].url = 'https://u:p@example.com'; },
  'result scheme': body => { body.results[0].url = 'javascript:alert(1)'; },
  'result backslash': body => { body.results[0].url = 'https://example.com/\\x'; },
  'result whitespace': body => { body.results[0].url = 'https://example.com/ x'; },
  'title type': body => { body.results[0].title = []; },
  'snippet type': body => { body.results[0].snippet = 1; },
  'highlight type': body => { body.results[0].highlights = [1]; },
  'score type': body => { body.results[0].score = '0.5'; },
  'score overflow': body => { body.results[0].score = 'OVERFLOW'; },
  'provenance missing': body => { delete body.results[0].provenance; },
  'provenance provider': body => { body.results[0].provenance.provider = 'bad provider'; },
  'provenance date': body => { body.results[0].provenance.retrievedAt = 'invalid'; },
  'provenance credentials': body => { body.results[0].provenance.sourceUrl = 'https://u:p@example.com/'; },
  'provenance id': body => { body.results[0].provenance.requestId = 'private token'; },
  'usage missing': body => { delete body.usage; },
  'usage unit': body => { body.usage = { unit: 'tokens', value: 1 }; },
  'usage negative': body => { body.usage = { unit: 'usd', value: -1 }; },
  'usage overflow': body => { body.usage = { unit: 'usd', value: 'OVERFLOW' }; },
  'warnings missing': body => { delete body.warnings; },
  'warning code': body => { body.warnings = [{ code: 'unbounded-text', provider: 'fixture' }]; },
  'warning provider': body => { body.warnings = [{ code: 'provider_warning', provider: 'private token' }]; },
  'attempts missing': body => { delete body.attempts; },
  'attempt duration': body => { body.attempts[0].durationMs = -1; },
  'attempt overflow': body => { body.attempts[0].durationMs = 'OVERFLOW'; },
  'attempt outcome': body => { body.attempts[0].outcome = 'pending'; },
  'attempt code': body => { body.attempts[0].code = 'secret'; },
  'attempt status': body => { body.attempts[0].status = 600; },
  'attempt retry': body => { body.attempts[0].retryAfterMs = -1; },
  'attempt timestamp': body => { body.attempts[0].startedAt = 'secret'; },
  'reuse': body => { body.reuse = 'memory'; },
};
for (const [name, mutate] of Object.entries(mutations)) test(`malformed success: ${name}`, async () => {
  const body = clone(); mutate(body);
  const text = JSON.stringify(body).replaceAll('"OVERFLOW"', '1e999');
  await assert.rejects(client(async () => new Response(text)).web.search(query), code('invalid_response'));
});
test('normalized response copies only public fields and respects the result ceiling', async () => {
  const body = clone();
  body.results = [body.results[0], { ...body.results[0] }]; body.privateKey = 'secret'; body.results[0].private = 'secret';
  body.results[0].provenance.private = 'secret'; body.attempts[0].exception = 'secret';
  body.usage = { unit: 'credits', value: 0 }; body.warnings = [{ provider: 'fixture', code: 'provider_warning', message: 'secret' }]; body.reuse = 'cache';
  const value = await client(async () => json(body)).web.search({ query: 'q', limit: 1 });
  assert.equal(value.results.length, 1); assert.equal(value.reuse, 'cache');
  assert.ok(!JSON.stringify(value).includes('secret'));
});
for (const protocol of ['2', '1, 1', '', '01']) test(`protocol version rejected: ${JSON.stringify(protocol)}`, async () => {
  await assert.rejects(client(async () => json(clone(), 200, { 'X-SearchSDK-Protocol': protocol })).web.search(query), code('invalid_response'));
});
test('protocol version 1 accepted', async () => assert.deepEqual(await client(async () => json(clone(), 200, { 'X-SearchSDK-Protocol': '1' })).web.search(query), success));
for (const status of [201, 202, 204, 206]) test(`only HTTP 200 succeeds: ${status}`, async () => {
  await assert.rejects(client(async () => status === 204 ? new Response(null, { status }) : json(clone(), status)).web.search(query), code('invalid_response'));
});
for (const [status, expected] of [[401, 'auth'], [402, 'auth'], [403, 'auth'], [432, 'auth'], [433, 'auth'], [429, 'rate_limit'], [408, 'unavailable'], [500, 'unavailable'], [599, 'unavailable'], [400, 'provider_error'], [404, 'provider_error'], [302, 'provider_error']]) {
  test(`missing/malformed error maps HTTP ${status}`, async () => {
    for (const body of ['private raw body', JSON.stringify({ error: { code: 'private-code', attempts: [] } }), JSON.stringify({ error: { code: 'auth', attempts: [{ provider: 'bad' }] } })]) {
      await assert.rejects(client(async () => new Response(body, { status })).web.search(query), error => {
        assert.ok(code(expected)(error)); assert.equal(error.status, status); assertPrivate(error, ['private raw body', 'private-code']); return true;
      });
    }
  });
}
test('validated error metadata is preserved; sensitive strings and extra fields are removed', async () => {
  const body = { error: { code: 'rate_limit', status: 429, retryAfterMs: 2000, message: 'private-app-token',
    attempts: [{ ...success.attempts[0], outcome: 'error', code: 'rate_limit', status: 429, retryAfterMs: 2000, exception: 'private-stack' },
      { ...success.attempts[0], provider: 'private-app-token' }, { ...success.attempts[0], provider: 'private-request-query' }] } };
  await assert.rejects(client(async () => json(body, 503), { accessToken: () => 'private-app-token' }).web.search({ query: 'private-request-query' }), error => {
    assert.ok(code('rate_limit')(error)); assert.equal(error.status, 429); assert.equal(error.retryAfterMs, 2000);
    assert.equal(error.attempts.length, 1); assert.ok(Object.isFrozen(error.attempts[0]));
    assertPrivate(error, ['private-app-token', 'private-request-query', 'private-stack']); return true;
  });
});
test('defensive response URL/redirect checks reject nonconforming transports', async () => {
  for (const properties of [{ redirected: true }, { type: 'opaqueredirect' }, { url: 'https://other.invalid/' }, { status: 0 }]) {
    await assert.rejects(client(async () => Object.assign({ status: 200, headers: new Headers(), readBoundedBody: async () => new TextEncoder().encode(JSON.stringify(clone())) }, properties)).web.search(query), code('invalid_response'));
  }
});

test('stream byte limit is exact across fragmented UTF-8 with no content-length', async () => {
  const body = clone(); body.results[0].title = 'é 😀 '.repeat(1000);
  const bytes = new TextEncoder().encode(JSON.stringify(body));
  function response() { let offset = 0; return new Response(new ReadableStream({ pull(controller) {
    if (offset === bytes.length) controller.close(); else controller.enqueue(bytes.slice(offset, ++offset));
  } })); }
  assert.deepEqual(await client(async () => response(), { maxResponseBytes: bytes.length }).web.search(query), body);
  await assert.rejects(client(async () => response(), { maxResponseBytes: bytes.length - 1 }).web.search(query), code('invalid_response'));
});
test('oversized header and non-byte stream are cancelled without reading text', async () => {
  for (const largeHeader of [true, false]) {
    let cancelled = 0;
    const response = new Response(new ReadableStream({ start(controller) { controller.enqueue(largeHeader ? new Uint8Array([1]) : 'private-not-bytes'); }, cancel() { cancelled++; } }),
      { headers: largeHeader ? { 'content-length': '1000' } : {} });
    await assert.rejects(client(async () => response, { maxResponseBytes: 1 }).web.search(query), code('invalid_response'));
    assert.ok(cancelled >= 1);
  }
});
for (const bytes of [[0xff], [0xc0, 0xaf], [0xed, 0xa0, 0x80], [0xf4, 0x90, 0x80, 0x80], [0xe2, 0x82]]) test(`malformed UTF-8 rejected: ${bytes}`, async () => {
  await assert.rejects(client(async () => new Response(new Uint8Array(bytes))).web.search(query), code('invalid_response'));
});
test('text/json/arrayBuffer-only runtimes fail closed without allocation', async () => {
  let allocated = false;
  await assert.rejects(client(async () => ({ status: 200, headers: new Headers(), text() { allocated = true; }, json() { allocated = true; }, arrayBuffer() { allocated = true; } })).web.search(query), code('unsupported_option'));
  assert.equal(allocated, false);
});
test('bounded bridge passes byte ceiling and signal; rejects oversized results', async () => {
  const bytes = new TextEncoder().encode(JSON.stringify(success));
  for (const maximum of [bytes.length, bytes.length - 1]) {
    const pending = client(async () => ({ status: 200, headers: new Headers(), readBoundedBody: async (limit, signal) => {
      assert.equal(limit, maximum); assert.equal(signal.aborted, false); return bytes;
    } }), { maxResponseBytes: maximum }).web.search(query);
    if (maximum === bytes.length) assert.deepEqual(await pending, success);
    else await assert.rejects(pending, code('invalid_response'));
  }
});

test('pre-aborted request never calls token or transport; arbitrary abort reason is hidden', async () => {
  const controller = new AbortController(); controller.abort(new Error('private-abort-reason'));
  let calls = 0;
  await assert.rejects(client(async () => { calls++; return json(); }, { accessToken() { calls++; return 'token'; } }).web.search(query, { signal: controller.signal }), error => {
    assert.ok(code('aborted')(error)); assertPrivate(error, ['private-abort-reason']); return true;
  }); assert.equal(calls, 0);
});
for (const phase of ['token', 'fetch', 'body']) test(`whole-call deadline races ignored signal during ${phase}`, async () => {
  const stuck = new Promise(() => {});
  let aborted = false;
  const sdk = client(async (_, init) => {
    init.signal.addEventListener('abort', () => { aborted = true; });
    if (phase === 'fetch') return stuck;
    return { status: 200, headers: new Headers(), readBoundedBody: () => stuck };
  }, { timeoutMs: 20, ...(phase === 'token' ? { accessToken: () => stuck } : {}) });
  await assert.rejects(sdk.web.search(query), code('timeout'));
  if (phase !== 'token') assert.equal(aborted, true);
});
for (const phase of ['token', 'fetch', 'body']) test(`cancellation races ignored signal during ${phase}`, async () => {
  const entered = deferred(), stopped = deferred(), controller = new AbortController();
  const sdk = client(async () => {
    if (phase === 'fetch') { entered.resolve(); return stopped.promise; }
    return { status: 200, headers: new Headers(), readBoundedBody: () => { entered.resolve(); return stopped.promise; } };
  }, { ...(phase === 'token' ? { accessToken: () => { entered.resolve(); return stopped.promise; } } : {}) });
  const pending = sdk.web.search(query, { signal: controller.signal }); await entered.promise;
  controller.abort('private-abort'); await assert.rejects(pending, code('aborted'));
  stopped.reject(new Error('private-late-rejection')); await tick();
});
test('late transport responses are disposed after the caller deadline', async () => {
  const late = deferred(), entered = deferred(); let disposed = 0;
  const pending = client(async () => { entered.resolve(); return late.promise; }, { timeoutMs: 20 }).web.search(query);
  await entered.promise; await assert.rejects(pending, code('timeout'));
  late.resolve({ status: 200, headers: new Headers(), cancelBody: async () => { disposed++; } }); await tick();
  assert.equal(disposed, 1);
});
test('client concurrency, queued cancellation, deadline and recovery', async () => {
  const entered = deferred(), release = deferred(), controller = new AbortController(); let calls = 0, tokens = 0;
  const sdk = client(async () => { calls++; if (calls === 1) { entered.resolve(); await release.promise; } return json(); },
    { maxConcurrency: 1, timeoutMs: 50, accessToken: () => { tokens++; return 'synthetic'; } });
  const first = sdk.web.search(query).catch(error => error);
  await entered.promise;
  const queued = sdk.web.search(query, { signal: controller.signal }); controller.abort();
  await assert.rejects(queued, code('aborted'));
  assert.equal(tokens, 1);
  assert.ok(code('timeout')(await first));
  await sdk.web.search(query); assert.equal(calls, 2);
  release.resolve(); await tick();
});

test('batch is bounded, ordered, and retains successful siblings', async () => {
  const release = deferred(), entered = deferred(); let active = 0, peak = 0;
  const sdk = client(async (_, init) => {
    const request = JSON.parse(init.body); active++; peak = Math.max(peak, active);
    if (request.query === 'slow') { entered.resolve(); await release.promise; }
    active--;
    if (request.query === 'fail') return json({ error: { code: 'auth', attempts: [] } }, 401);
    const body = clone(); body.results[0].title = request.query; return json(body);
  }, { maxConcurrency: 2 });
  const pending = sdk.web.searchBatch([{ query: 'slow' }, { query: 'fast' }, { query: 'fail' }, { query: '' }], { concurrency: 4 });
  await entered.promise; await tick(); release.resolve();
  const results = await pending;
  assert.equal(peak, 2); assert.deepEqual(results.map(r => [r.index, r.status]), [[0, 'fulfilled'], [1, 'fulfilled'], [2, 'rejected'], [3, 'rejected']]);
  assert.equal(results[0].value.results[0].title, 'slow'); assert.equal(results[1].value.results[0].title, 'fast');
  assert.equal(results[2].error.code, 'auth'); assert.equal(results[3].error.code, 'invalid_request');
});
for (const stopped of ['aborted', 'timeout']) test(`batch ${stopped} includes queued items and preserves completed items`, async () => {
  const controller = new AbortController(), entered = deferred(); let calls = 0;
  const sdk = client(async () => { calls++; if (calls > 1) { entered.resolve(); return new Promise(() => {}); } return json(); });
  const pending = sdk.web.searchBatch([query, query, query], { concurrency: 1, timeoutMs: stopped === 'timeout' ? 25 : 1000, signal: controller.signal });
  await entered.promise; if (stopped === 'aborted') controller.abort('private-reason');
  const outcomes = await pending;
  assert.equal(outcomes[0].status, 'fulfilled'); assert.deepEqual(outcomes.slice(1).map(r => r.error.code), [stopped, stopped]); assert.equal(calls, 2);
});
test('batch snapshots queued items before asynchronous work', async () => {
  const entered = deferred(), release = deferred(), seen = [];
  const inputs = [{ query: 'first' }, { query: 'second' }];
  const sdk = client(async (_, init) => { seen.push(JSON.parse(init.body).query); if (seen.length === 1) { entered.resolve(); await release.promise; } return json(); });
  const pending = sdk.web.searchBatch(inputs, { concurrency: 1 }); await entered.promise;
  inputs[1].query = 'changed'; release.resolve(); await pending; assert.deepEqual(seen, ['first', 'second']);
});
for (const options of [null, { concurrency: 0 }, { concurrency: 65 }, { timeoutMs: null }, { signal: {} }, { unsupported: true }]) test(`invalid batch options: ${JSON.stringify(options)}`, async () => {
  await assert.rejects(client().web.searchBatch([query], options), code('invalid_request'));
});
test('batch edge cases, count bound and pre-abort', async () => {
  const sdk = client(); assert.deepEqual(await sdk.web.searchBatch([]), []);
  await assert.rejects(sdk.web.searchBatch(Array(1001).fill(query)), code('invalid_request'));
  await assert.rejects(sdk.web.searchBatch(null), code('invalid_request'));
  const controller = new AbortController(); controller.abort();
  assert.deepEqual((await sdk.web.searchBatch([query, query], { signal: controller.signal })).map(r => r.error.code), ['aborted', 'aborted']);
});

test('native bridge adapter forwards exact endpoint, byte limit, timeout and cancellation', async () => {
  let captured;
  const transport = createNativeTransport({ request: async (...args) => {
    captured = args;
    return { status: 200, headers: { 'X-SearchSDK-Protocol': '1' }, url: endpoint, bodyBase64: Buffer.from(JSON.stringify(success)).toString('base64') };
  }, cancel() {} });
  const sdk = createSearchClient({ endpoint, fetch: transport, maxResponseBytes: 1000, timeoutMs: 1234, accessToken: () => 'synthetic' });
  assert.deepEqual(await sdk.web.search(query), success);
  assert.equal(captured[1], endpoint); assert.equal(captured[2].Authorization, 'Bearer synthetic'); assert.equal(captured[4], 1000);
  assert.ok(captured[5] <= 1234 && captured[5] > 0);
  const controller = new AbortController(), entered = deferred(); let cancelled;
  const pending = createSearchClient({ endpoint, fetch: createNativeTransport({ request: async id => { entered.resolve(id); return new Promise(() => {}); }, cancel(id) { cancelled = id; } }) })
    .web.search(query, { signal: controller.signal });
  const id = await entered.promise; controller.abort(); await assert.rejects(pending, code('aborted')); assert.equal(cancelled, id);
});
for (const [nativeCode, expected] of [['SEARCHSDK_LIMIT', 'invalid_response'], ['SEARCHSDK_TIMEOUT', 'timeout'], ['SEARCHSDK_UNAVAILABLE', 'unavailable'], ['private-code', 'network']]) test(`native error sanitized: ${nativeCode}`, async () => {
  const sdk = createSearchClient({ endpoint, fetch: createNativeTransport({ request: async () => { throw { code: nativeCode, message: 'private-token' }; }, cancel() {} }) });
  await assert.rejects(sdk.web.search(query), error => { assert.ok(code(expected)(error)); assertPrivate(error, ['private-token', 'private-code']); return true; });
});
test('native bridge rejects malformed/oversized base64 before decoding', async () => {
  for (const bodyBase64 of ['private invalid', 'A===', 'AA', 'A'.repeat(1000)]) {
    const sdk = createSearchClient({ endpoint, maxResponseBytes: 10, fetch: createNativeTransport({ request: async () => ({ status: 200, headers: {}, url: endpoint, bodyBase64 }), cancel() {} }) });
    await assert.rejects(sdk.web.search(query), code('invalid_response'));
  }
});
test('native bounded bridge decodes large Base64 bodies without regex recursion or Node runtime APIs', async () => {
  const body = clone(); body.results[0].snippet = 'é😀'.repeat(100_000);
  const bodyBase64 = Buffer.from(JSON.stringify(body)).toString('base64');
  const sdk = createSearchClient({ endpoint, fetch: createNativeTransport({ request: async () => ({ status: 200, headers: {}, url: endpoint, bodyBase64 }), cancel() {} }) });
  assert.deepEqual(await sdk.web.search(query), body);
});
test('elapsed-time check catches synchronous token callbacks that outlive the deadline', async () => {
  let calls = 0;
  const sdk = client(async () => { calls++; return json(); }, { timeoutMs: 5, accessToken: () => {
    const until = performance.now() + 15; while (performance.now() < until) {} return 'synthetic';
  } });
  await assert.rejects(sdk.web.search(query), code('timeout')); assert.equal(calls, 0);
});
test('client queue capacity fails explicitly and all cancelled waiters are released', async () => {
  const entered = deferred(); let calls = 0;
  const sdk = client(async () => { calls++; entered.resolve(); return new Promise(() => {}); }, { maxConcurrency: 1 });
  const controllers = Array.from({ length: 1025 }, () => new AbortController());
  const pending = controllers.map(controller => sdk.web.search(query, { signal: controller.signal }).catch(error => error));
  await entered.promise;
  await assert.rejects(sdk.web.search(query), code('unavailable'));
  controllers.forEach(controller => controller.abort());
  const outcomes = await Promise.all(pending);
  assert.ok(outcomes.every(code('aborted'))); assert.equal(calls, 1);
});
test('malicious structural signals cannot expose listener exception text', async () => {
  const signal = { aborted: false, addEventListener() { throw new Error('private-listener-error'); }, removeEventListener() {} };
  await assert.rejects(client().web.search(query, { signal }), error => {
    assert.ok(code('invalid_request')(error)); assertPrivate(error, ['private-listener-error']); return true;
  });
});
test('batch item accessors are isolated as sanitized per-item failures', async () => {
  const inputs = [query, query];
  Object.defineProperty(inputs, '0', { get() { throw new Error('private-batch-getter'); } });
  const outcomes = await client().web.searchBatch(inputs);
  assert.equal(outcomes[0].error.code, 'invalid_request'); assertPrivate(outcomes[0].error, ['private-batch-getter']);
  assert.equal(outcomes[1].status, 'fulfilled');
});
