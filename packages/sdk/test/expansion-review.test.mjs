import test from 'node:test';
import assert from 'node:assert/strict';
import { createNativeTransport } from '../dist/native-transport.js';
import { SearchError } from '../dist/errors.js';
import { createSearch } from '../dist/index.js';
import { createPerplexityClient } from '../dist/native-perplexity.js';
import { createExaClient } from '../dist/native-exa.js';
import { runDurableOperation, createMemoryCheckpointStore, attachDurableRemoteId, DurableOperationError } from '../dist/durable.js';
import { createFileCheckpointStore } from '../dist/durable-node.js';
import { exa } from '../dist/exa.js';
import { mkdtemp, writeFile, readFile, stat, readdir, chmod, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { execFile } from 'node:child_process';

// Independent failure-oriented review fixtures. No network or real credentials.
const json = data => new Response(JSON.stringify(data));
const read = { id: 'review.read', method: 'GET', path: '/read', retryable: true };
const events = { id: 'review.events', method: 'GET', path: '/events', response: 'sse' };
const tick = () => new Promise(resolve => setImmediate(resolve));
const deferred = () => {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
};
const client = (fetch, options = {}) => createNativeTransport({
  provider: 'review', baseUrl: 'https://provider.invalid/v1',
  headers: { Authorization: 'Bearer fixture-only-credential' }, fetch, timeoutMs: 1_000, ...options,
});
const code = expected => error => error instanceof SearchError && error.code === expected;

test('review: closing an SSE iterator before first read immediately cancels and frees its slot', async () => {
  const controller = new AbortController();
  let cancelled = 0;
  let calls = 0;
  const c = client(async () => ++calls === 1
    ? new Response(new ReadableStream({ cancel() { cancelled++; } }), { headers: { 'content-type': 'text/event-stream' } })
    : json({ ok: true }), { maxConcurrency: 1 });
  try {
    const response = await c.request(events, { signal: controller.signal });
    await response.data[Symbol.asyncIterator]().return();
    await tick();
    assert.equal(cancelled, 1, 'explicit iterator close must cancel the HTTP body even before next()');
    assert.deepEqual((await c.request(read, { timeoutMs: 200 })).data, { ok: true });
  } finally { controller.abort(); }
});

test('review: closing an SSE iterator cancels a pending read without waiting for the total deadline', async () => {
  const controller = new AbortController();
  let cancelled = 0;
  const c = client(async () => new Response(new ReadableStream({ cancel() { cancelled++; } }),
    { headers: { 'content-type': 'text/event-stream' } }));
  let pending;
  try {
    const response = await c.request(events, { signal: controller.signal });
    const iterator = response.data[Symbol.asyncIterator]();
    pending = iterator.next().catch(() => {});
    await tick();
    const closing = iterator.return();
    void closing.catch(() => {});
    await tick();
    assert.equal(cancelled, 1, 'return() must interrupt an outstanding HTTP read');
    await closing;
  } finally { controller.abort(); await pending; }
});

test('review: a response arriving after cancellation has its unread body cancelled', async () => {
  const started = deferred();
  const delayed = deferred();
  const controller = new AbortController();
  let cancelled = 0;
  const c = client(async () => { started.resolve(); return delayed.promise; });
  const request = c.request(read, { signal: controller.signal });
  await started.promise;
  controller.abort('fixture-only-private-reason');
  await assert.rejects(request, code('aborted'));
  delayed.resolve(new Response(new ReadableStream({ cancel() { cancelled++; } })));
  await tick();
  await tick();
  assert.equal(cancelled, 1, 'signal-ignoring transports must not leak late response bodies');
});

test('review: queue timeout remains timeout, never invokes fetch, and does not consume future capacity', async () => {
  const started = deferred();
  const release = deferred();
  let calls = 0;
  const c = client(async () => {
    if (++calls === 1) { started.resolve(); await release.promise; }
    return json({ calls });
  }, { maxConcurrency: 1 });
  const first = c.request(read);
  await started.promise;
  try {
    await assert.rejects(c.request(read, { timeoutMs: 25 }), code('timeout'));
    assert.equal(calls, 1);
  } finally { release.resolve(); await first; }
  await c.request(read);
  assert.equal(calls, 2);
});

test('review: response cap counts accumulated chunk bytes and cancels rather than retries', async () => {
  let cancelled = 0;
  let calls = 0;
  const c = client(async () => {
    calls++;
    return new Response(new ReadableStream({ start(controller) {
      controller.enqueue(new TextEncoder().encode('{"a":"'));
      controller.enqueue(new TextEncoder().encode('12345678901234567890'));
    }, cancel() { cancelled++; } }));
  }, { maxResponseBytes: 16, retry: { maxRetries: 2, baseDelayMs: 1 } });
  await assert.rejects(c.request(read), code('invalid_response'));
  assert.equal(calls, 1);
  assert.equal(cancelled, 1);
});

test('review: response limit measures decoded bytes rather than compressed Content-Length', async () => {
  // Fetch exposes decoded response bytes while retaining the encoded content headers.
  // A gzip representation of '{}' can exceed four bytes although the JSON does not.
  const c = client(async () => new Response('{}', { headers: { 'content-encoding': 'gzip', 'content-length': '22' } }),
    { maxResponseBytes: 4 });
  assert.deepEqual((await c.request(read)).data, {});
});

test('review: a large UTF-8 SSE event survives fine-grained network fragmentation', async () => {
  const expected = 'α'.repeat(256 * 1024);
  const bytes = new TextEncoder().encode('data: ' + expected + '\r\n\r\n');
  let offset = 0;
  const c = client(async () => new Response(new ReadableStream({ pull(controller) {
    if (offset >= bytes.length) { controller.close(); return; }
    controller.enqueue(bytes.subarray(offset, offset + 256));
    offset += 256;
  } }), { headers: { 'content-type': 'text/event-stream' } }), { timeoutMs: 5_000 });
  const response = await c.request(events);
  let count = 0;
  for await (const event of response.data) {
    count++;
    assert.equal(event.data.length, expected.length);
    assert.equal(createHash('sha256').update(event.data).digest('hex'), createHash('sha256').update(expected).digest('hex'));
  }
  assert.equal(count, 1);
});

test('review: replay uses original upload bytes after caller mutation during retry', async () => {
  const source = Uint8Array.of(1, 2, 3);
  const bodies = [];
  const c = client(async (_url, init) => {
    bodies.push([...new Uint8Array(init.body)]);
    if (bodies.length === 1) { source.fill(9); return new Response(null, { status: 503 }); }
    return json({ ok: true });
  }, { retry: { maxRetries: 1, baseDelayMs: 1 } });
  await c.request({ ...read, method: 'POST' }, { rawBody: source });
  assert.deepEqual(bodies, [[1, 2, 3], [1, 2, 3]]);
});

test('review: path payloads stay within the credential origin and base path', async () => {
  const urls = [];
  const c = client(async (url, init) => {
    urls.push(url);
    assert.equal(init.redirect, 'error');
    assert.equal(init.credentials, 'omit');
    return json({});
  });
  for (const id of ['//evil.invalid/x', '%2e%2e', '../x', 'x?api_key=private', 'x#fragment', 'x\\y']) {
    await c.request({ ...read, path: '/jobs/{id}' }, { path: { id } });
  }
  for (const value of urls) {
    const url = new URL(value);
    assert.equal(url.origin, 'https://provider.invalid');
    assert.ok(url.pathname.startsWith('/v1/jobs/'));
    assert.equal(url.search, '');
    assert.equal(url.hash, '');
  }
});

test('review: neither operation headers nor caller headers replace configured credentials', async () => {
  let calls = 0;
  const c = client(async () => { calls++; return json({}); });
  for (const name of ['authorization', 'AUTHORIZATION', 'aUtHoRiZaTiOn']) {
    await assert.rejects(c.request({ ...read, headers: { [name]: 'replacement' } }), code('invalid_request'));
    await assert.rejects(c.request(read, { headers: { [name]: 'replacement' } }), code('invalid_request'));
  }
  assert.equal(calls, 0);
});

test('review: terminal errors redact credential, provider body, URL and abort reason', async () => {
  const c = client(async () => new Response('fixture-only-credential private-query provider-internal-stack', { status: 403 }));
  await assert.rejects(c.request(read, { query: { q: 'private-query' } }), error => {
    assert.equal(error.code, 'auth');
    assert.equal(error.status, 403);
    const report = JSON.stringify(error) + error.message + error.stack;
    for (const forbidden of ['fixture-only-credential', 'private-query', 'provider-internal-stack', 'provider.invalid']) {
      assert.ok(!report.includes(forbidden));
    }
    return true;
  });
});

const provider = search => ({ id: 'review', capabilities: { domainFilters: true, maxIncludeDomains: 20, maxExcludeDomains: 20 }, search });
const searchResult = () => ({ results: [{ url: 'https://result.invalid/', title: 'original',
  provenance: { provider: 'review', sourceUrl: 'https://result.invalid/', retrievedAt: '2026-10-22T00:00:00.000Z' } }], usage: null, warnings: [] });

test('review: cancelling the first singleflight subscriber preserves another subscriber and isolates its result', async () => {
  const started = deferred();
  const release = deferred();
  const firstController = new AbortController();
  let underlyingSignal;
  let calls = 0;
  const sdk = createSearch({ provider: provider(async (_request, { signal }) => {
    calls++; underlyingSignal = signal; started.resolve(); await release.promise; return searchResult();
  }), deduplicate: true, timeoutMs: 1_000 });
  const first = sdk.web.search({ query: 'same', includeDomains: ['b.invalid', 'a.invalid'] }, { signal: firstController.signal });
  await started.promise;
  const second = sdk.web.search({ query: 'same', includeDomains: ['a.invalid', 'b.invalid'] });
  firstController.abort();
  await assert.rejects(first, code('aborted'));
  assert.equal(underlyingSignal.aborted, false);
  release.resolve();
  const result = await second;
  assert.equal(calls, 1);
  assert.equal(result.reuse, 'inflight');
  assert.equal(result.results[0].title, 'original');
});

test('review: cancelling all shared subscribers permits a clean replacement operation', async () => {
  const started = deferred();
  const release = deferred();
  const controller = new AbortController();
  let calls = 0;
  let oldSignal;
  const sdk = createSearch({ provider: provider(async (_request, { signal }) => {
    if (++calls === 1) { oldSignal = signal; started.resolve(); await release.promise; }
    return searchResult();
  }), deduplicate: true, cache: { ttlMs: 1_000 }, timeoutMs: 1_000 });
  const old = sdk.web.search({ query: 'same' }, { signal: controller.signal });
  await started.promise;
  controller.abort();
  await assert.rejects(old, code('aborted'));
  assert.equal(oldSignal.aborted, true);
  const replacement = await sdk.web.search({ query: 'same' });
  assert.equal(calls, 2);
  assert.equal(replacement.reuse, undefined);
  release.resolve();
  await tick();
  assert.equal((await sdk.web.search({ query: 'same' })).reuse, 'cache');
});

test('review: cached results are isolated from mutations and different client credentials', async () => {
  let calls = 0;
  const configuration = { provider: provider(async () => { calls++; return searchResult(); }), cache: { ttlMs: 1_000 } };
  const sdk = createSearch(configuration);
  const first = await sdk.web.search({ query: 'same' });
  first.results[0].title = 'caller mutation';
  first.results[0].provenance.provider = 'caller mutation';
  const second = await sdk.web.search({ query: 'same' });
  assert.equal(second.reuse, 'cache');
  assert.equal(second.results[0].title, 'original');
  assert.equal(second.results[0].provenance.provider, 'review');
  second.results.length = 0;
  assert.equal((await sdk.web.search({ query: 'same' })).results.length, 1);
  const otherClient = createSearch(configuration);
  assert.equal((await otherClient.web.search({ query: 'same' })).reuse, undefined);
  assert.equal(calls, 2);
});

test('review: failed operations never populate the success cache', async () => {
  let calls = 0;
  const sdk = createSearch({ provider: provider(async () => {
    if (++calls === 1) throw new SearchError('rate_limit');
    return searchResult();
  }), cache: { ttlMs: 1_000 }, deduplicate: true });
  await assert.rejects(sdk.web.search({ query: 'same' }), code('rate_limit'));
  assert.equal((await sdk.web.search({ query: 'same' })).reuse, undefined);
  assert.equal((await sdk.web.search({ query: 'same' })).reuse, 'cache');
  assert.equal(calls, 2);
});

for (const reuseOptions of [{ cache: { ttlMs: 1_000 } }, { deduplicate: true }]) {
  test(`review: total deadline includes synchronous result snapshot work ${JSON.stringify(reuseOptions)}`, async () => {
    const response = searchResult();
    // A getter simulates CPU-heavy cloning without allocating a large provider response.
    // It remains a structurally valid custom provider result.
    Object.defineProperty(response.results[0], 'snippet', { enumerable: true, get() {
      const until = performance.now() + 40;
      while (performance.now() < until) { /* Simulate a blocking snapshot. */ }
      return 'fixture';
    } });
    const sdk = createSearch({ provider: provider(async () => response), timeoutMs: 10, ...reuseOptions });
    await assert.rejects(sdk.web.search({ query: 'fixture' }), code('timeout'));
  });
}

test('review: response-assembly timeout records one failed attempt for one provider dispatch', async () => {
  let calls = 0;
  const response = { results: [], usage: null, get warnings() {
    const until = performance.now() + 20;
    while (performance.now() < until) { /* Simulate CPU-heavy response assembly. */ }
    return [];
  } };
  const sdk = createSearch({ provider: provider(async () => { calls++; return response; }), timeoutMs: 10 });
  await assert.rejects(sdk.web.search({ query: 'fixture' }), error => {
    assert.ok(code('timeout')(error));
    assert.equal(calls, 1);
    assert.equal(error.attempts.length, 1, 'a provisional success must not become an extra dispatch');
    assert.equal(error.attempts[0].outcome, 'error');
    assert.equal(error.attempts[0].code, 'timeout');
    return true;
  });
});

test('review: successful Perplexity token revocation accepts its documented empty HTTP 200', async () => {
  // Official endpoint reference declares HTTP 200 without response content.
  // https://docs.perplexity.ai/api-reference/revoke-auth-token-post
  let sent;
  const c = createPerplexityClient({ apiKey: 'fixture-only', fetch: async (url, init) => {
    sent = { url, request: new Request(url, init) };
    return new Response(null, { status: 200 });
  } });
  const response = await c.revokeAuthToken({ body: { auth_token: 'fixture-revoked-token' } });
  assert.equal(sent.url, 'https://api.perplexity.ai/revoke_auth_token');
  assert.deepEqual(await sent.request.json(), { auth_token: 'fixture-revoked-token' });
  assert.equal(response.data, null);
  assert.equal(response.metadata.status, 200);
});

test('review: Exa administrative calls share the configured concurrency bound and separate credential', async () => {
  const release = deferred();
  const started = deferred();
  let active = 0;
  let peak = 0;
  const c = createExaClient({ apiKey: 'fixture-search-key', teamApiKey: 'fixture-admin-key', maxConcurrency: 1,
    fetch: async (url, init) => {
      assert.equal(url, 'https://admin-api.exa.ai/team-management/api-keys');
      assert.equal(new Headers(init.headers).get('x-api-key'), 'fixture-admin-key');
      peak = Math.max(peak, ++active);
      started.resolve();
      await release.promise;
      active--;
      return json({ apiKeys: [] });
    } });
  const first = c.listApiKeys();
  await started.promise;
  const second = c.listApiKeys();
  await tick();
  release.resolve();
  await Promise.all([first, second]);
  assert.equal(peak, 1, 'all calls to one administrative service must reuse its semaphore');
});

test('review: Exa enrichment updates accept their documented successful empty HTTP 200', async () => {
  let sent;
  const c = createExaClient({ apiKey: 'fixture-only', fetch: async (url, init) => {
    sent = { url, method: init.method };
    return new Response(null, { status: 200 });
  } });
  const response = await c.updateWebsetEnrichment({ path: { webset: 'ws_fixture', id: 'en_fixture' }, body: {} });
  assert.equal(sent.url, 'https://api.exa.ai/websets/v0/websets/ws_fixture/enrichments/en_fixture');
  assert.equal(sent.method, 'PATCH');
  assert.equal(response.data, null);
});

test('review: stream request types preserve required fields and their native types', async () => {
  const temporary = await mkdtemp(join(tmpdir(), 'searchsdk-review-types-'));
  try {
    const perplexity = fileURLToPath(new URL('../dist/native-perplexity.js', import.meta.url));
    const parallel = fileURLToPath(new URL('../dist/native-parallel.js', import.meta.url));
    const fixture = join(temporary, 'contract.mts');
    await writeFile(fixture, `
import type { PerplexityChatCompletionsBody, PerplexityChatCompletionsStreamBody } from ${JSON.stringify(perplexity)};
import type { ParallelChatCompletionsBody, ParallelCreateResponseBody } from ${JSON.stringify(parallel)};
const valid: PerplexityChatCompletionsBody = { model: 'sonar', messages: [{ role: 'user', content: 'hello' }] };
const validStream: PerplexityChatCompletionsStreamBody = { model: 'sonar', messages: [{ role: 'user', content: 'hello' }], stream: true };
// @ts-expect-error model and messages are required by the official native contract
const missing: PerplexityChatCompletionsBody = {};
// @ts-expect-error native model is a string enum and messages is an array
const malformed: PerplexityChatCompletionsBody = { model: 123, messages: 'bad' };
// @ts-expect-error stream variants must retain model and messages
const missingStream: PerplexityChatCompletionsStreamBody = { stream: true };
// @ts-expect-error the nonstream method must reject stream true
const wrongVariant: PerplexityChatCompletionsBody = { model: 'sonar', messages: [], stream: true };
// @ts-expect-error Parallel chat requires native messages and model
const missingParallel: ParallelChatCompletionsBody = {};
// @ts-expect-error Parallel responses require model
const missingResponse: ParallelCreateResponseBody = {};
void [valid, validStream, missing, malformed, missingStream, wrongVariant, missingParallel, missingResponse];
`);
    const compiler = fileURLToPath(new URL('../../../node_modules/typescript/lib/tsc.js', import.meta.url));
    try {
      await promisify(execFile)(process.execPath, [compiler, '--ignoreConfig', '--noEmit', '--strict', '--skipLibCheck',
        '--module', 'NodeNext', '--moduleResolution', 'NodeNext', '--target', 'ES2022', fixture], { timeout: 30_000 });
    } catch (error) { assert.fail(`Native request type contract failed:\n${error.stdout ?? error.message}`); }
  } finally { await rm(temporary, { recursive: true, force: true }); }
});

const durableCode = expected => error => error instanceof DurableOperationError && error.code === expected;
const durableOptions = store => ({ store, key: 'review-run', operation: 'review.job', inputFingerprint: 'account-input-v1',
  submit: async () => ({ remoteId: 'job_fixture_1' }), poll: async () => ({ state: 'completed', value: { answer: 42 } }) });

test('review: initial durable result equals the committed result even when provider data mutates during persistence', async () => {
  const memory = createMemoryCheckpointStore();
  const providerValue = { version: 1 };
  const store = { load: key => memory.load(key), compareAndSet: async (key, expected, next) => {
    const saved = await memory.compareAndSet(key, expected, next);
    if (next.state === 'completed') providerValue.version = 2;
    return saved;
  } };
  const options = { ...durableOptions(store), poll: async () => ({ state: 'completed', value: providerValue }) };
  const first = await runDurableOperation(options);
  const resumed = await runDurableOperation(options);
  assert.deepEqual(first.value, first.checkpoint.result);
  assert.deepEqual(first.value, resumed.value);
  assert.deepEqual(first.value, { version: 1 });
});

test('review: ambiguous durable submission cannot dispatch again; explicit verified reconciliation can resume', async () => {
  const store = createMemoryCheckpointStore();
  let submissions = 0;
  let polls = 0;
  const options = { ...durableOptions(store), submit: async () => { submissions++; throw new Error('provider accepted but response was lost'); },
    poll: async id => { polls++; assert.equal(id, 'reconciled_job'); return { state: 'completed', value: { answer: 42 } }; } };
  await assert.rejects(runDurableOperation(options), durableCode('ambiguous_submission'));
  await assert.rejects(runDurableOperation(options), durableCode('ambiguous_submission'));
  assert.equal(submissions, 1);
  assert.equal(polls, 0);
  await assert.rejects(attachDurableRemoteId({ store, key: options.key, operation: options.operation,
    inputFingerprint: 'different-account', remoteId: 'reconciled_job' }), durableCode('checkpoint_conflict'));
  await attachDurableRemoteId({ store, key: options.key, operation: options.operation,
    inputFingerprint: options.inputFingerprint, remoteId: 'reconciled_job' });
  assert.deepEqual((await runDurableOperation(options)).value, { answer: 42 });
  assert.equal(submissions, 1);
  assert.equal(polls, 1);
});

test('review: a returned remote ID remains recoverable when its checkpoint write fails', async () => {
  const memory = createMemoryCheckpointStore();
  let submissions = 0;
  const store = { load: key => memory.load(key), compareAndSet: async (key, expected, next) => {
    if (next.state === 'submitted') throw new Error('fixture disk failure containing private details');
    return memory.compareAndSet(key, expected, next);
  } };
  const options = { ...durableOptions(store), submit: async () => { submissions++; return { remoteId: 'accepted_job' }; } };
  await assert.rejects(runDurableOperation(options), error => {
    assert.ok(durableCode('storage_failure')(error));
    assert.equal(error.remoteId, 'accepted_job');
    assert.ok(!error.message.includes('private details'));
    return true;
  });
  assert.equal((await memory.load(options.key)).state, 'submitting');
  await assert.rejects(runDurableOperation(options), durableCode('ambiguous_submission'));
  assert.equal(submissions, 1);
});

test('review: a separate Node process resumes the saved remote job without submitting it again', async () => {
  const temporary = await mkdtemp(join(tmpdir(), 'searchsdk-review-durable-'));
  try {
    const store = await createFileCheckpointStore({ directory: temporary });
    const options = { ...durableOptions(store), maxPolls: 1, poll: async () => ({ state: 'pending' }) };
    await assert.rejects(runDurableOperation(options), durableCode('poll_limit'));
    const durableUrl = new URL('../dist/durable.js', import.meta.url).href;
    const diskUrl = new URL('../dist/durable-node.js', import.meta.url).href;
    const script = `
import { runDurableOperation } from ${JSON.stringify(durableUrl)};
import { createFileCheckpointStore } from ${JSON.stringify(diskUrl)};
const store = await createFileCheckpointStore({ directory: ${JSON.stringify(temporary)} });
const result = await runDurableOperation({ store, key: 'review-run', operation: 'review.job', inputFingerprint: 'account-input-v1',
  submit: async () => { throw new Error('DUPLICATE SUBMISSION'); },
  poll: async id => { if (id !== 'job_fixture_1') throw new Error('WRONG REMOTE ID'); return { state: 'completed', value: { answer: 42 } }; } });
console.log(JSON.stringify({ value: result.value, resumed: result.resumed }));
`;
    const result = await promisify(execFile)(process.execPath, ['--input-type=module', '--eval', script], { timeout: 10_000 });
    assert.deepEqual(JSON.parse(result.stdout), { value: { answer: 42 }, resumed: true });
    const saved = await store.load(options.key);
    assert.equal(saved.state, 'completed');
    assert.deepEqual(saved.result, { answer: 42 });
  } finally { await rm(temporary, { recursive: true, force: true }); }
});

test('review: concurrent Node processes cannot both submit the same durable intent', async () => {
  const temporary = await mkdtemp(join(tmpdir(), 'searchsdk-review-writers-'));
  try {
    const durableUrl = new URL('../dist/durable.js', import.meta.url).href;
    const diskUrl = new URL('../dist/durable-node.js', import.meta.url).href;
    const audit = join(temporary, 'fixture-submit-audit');
    const script = `
import { appendFile } from 'node:fs/promises';
import { runDurableOperation } from ${JSON.stringify(durableUrl)};
import { createFileCheckpointStore } from ${JSON.stringify(diskUrl)};
const store = await createFileCheckpointStore({ directory: ${JSON.stringify(temporary)} });
try {
  const result = await runDurableOperation({ store, key: 'same-intent', operation: 'review.job', inputFingerprint: 'account-input-v1',
    submit: async () => { await appendFile(${JSON.stringify(audit)}, 'submit\\n', { mode: 0o600 }); return { remoteId: 'same_remote_job' }; },
    poll: async () => ({ state: 'completed', value: { answer: 42 } }) });
  console.log(JSON.stringify({ completed: true, value: result.value }));
} catch (error) { console.log(JSON.stringify({ completed: false, code: error.code })); }
`;
    const run = () => promisify(execFile)(process.execPath, ['--input-type=module', '--eval', script], { timeout: 10_000 });
    const workers = await Promise.all([run(), run()]);
    const outcomes = workers.map(worker => JSON.parse(worker.stdout));
    assert.ok(outcomes.some(outcome => outcome.completed), JSON.stringify(outcomes));
    assert.equal(await readFile(audit, 'utf8'), 'submit\n');
    const store = await createFileCheckpointStore({ directory: temporary });
    const checkpoint = await store.load('same-intent');
    assert.equal(checkpoint.state, 'completed');
    assert.equal(checkpoint.remoteId, 'same_remote_job');
  } finally { await rm(temporary, { recursive: true, force: true }); }
});

test('review: normalized search rejects accumulated oversized response bytes without fallback or retry', async () => {
  let cancelled = 0;
  let calls = 0;
  let fallbackCalls = 0;
  const chunk = new Uint8Array(1024 * 1024).fill(32);
  const primary = exa({ apiKey: 'fixture-only', fetch: async () => {
    calls++;
    let count = 0;
    return new Response(new ReadableStream({ pull(controller) {
      if (++count <= 11) controller.enqueue(chunk);
    }, cancel() { cancelled++; } }), { headers: { 'content-length': '1' } });
  } });
  const sdk = createSearch({ provider: primary,
    fallback: [provider(async () => { fallbackCalls++; return searchResult(); })],
    retry: { maxRetries: 2, baseDelayMs: 1 } });
  await assert.rejects(sdk.web.search({ query: 'fixture' }), code('invalid_response'));
  assert.equal(calls, 1);
  assert.equal(fallbackCalls, 0);
  assert.equal(cancelled, 1);
});

test('review: direct normalized adapter cancellation also cleans up a late custom transport response', async () => {
  const started = deferred();
  const delayed = deferred();
  const controller = new AbortController();
  let cancelled = 0;
  const adapter = exa({ apiKey: 'fixture-only', fetch: async () => { started.resolve(); return delayed.promise; } });
  const request = adapter.search({ query: 'fixture', limit: 5 }, { signal: controller.signal });
  await started.promise;
  controller.abort();
  await assert.rejects(request, code('aborted'));
  delayed.resolve(new Response(new ReadableStream({ cancel() { cancelled++; } })));
  await tick();
  assert.equal(cancelled, 1);
});

test('review: disk store never steals a leftover lock and preserves private checkpoint modes', async () => {
  const temporary = await mkdtemp(join(tmpdir(), 'searchsdk-review-lock-'));
  try {
    const store = await createFileCheckpointStore({ directory: temporary });
    const key = 'review-stale-lock';
    const prefix = join(temporary, createHash('sha256').update(key).digest('hex'));
    const next = { version: 1, revision: 1, operation: 'review.job', inputFingerprint: 'account-input-v1',
      state: 'submitting', updatedAt: '2026-10-22T00:00:00.000Z' };
    await writeFile(prefix + '.lock', 'fixture-leftover-lock', { mode: 0o600 });
    await assert.rejects(store.compareAndSet(key, null, next), durableCode('checkpoint_conflict'));
    assert.equal(await readFile(prefix + '.lock', 'utf8'), 'fixture-leftover-lock');
    assert.equal(await store.load(key), null);
    await rm(prefix + '.lock'); // This fixture is the only writer; explicit operator reconciliation.
    assert.equal(await store.compareAndSet(key, null, next), true);
    assert.equal((await stat(prefix + '.json')).mode & 0o777, 0o600);
    assert.deepEqual((await readdir(temporary)).sort(), [prefix.split('/').at(-1) + '.json']);
  } finally { await rm(temporary, { recursive: true, force: true }); }
});

test('review: disk store requires an existing private directory and rejects corrupt checkpoint data', async () => {
  const temporary = await mkdtemp(join(tmpdir(), 'searchsdk-review-disk-'));
  try {
    await assert.rejects(createFileCheckpointStore({ directory: join(temporary, 'missing') }), durableCode('storage_failure'));
    await chmod(temporary, 0o755);
    await assert.rejects(createFileCheckpointStore({ directory: temporary }), durableCode('configuration'));
    await chmod(temporary, 0o700);
    const store = await createFileCheckpointStore({ directory: temporary });
    const corruptFile = join(temporary, createHash('sha256').update('corrupt').digest('hex') + '.json');
    await writeFile(corruptFile, 'private-provider-error not valid JSON', { mode: 0o600 });
    await assert.rejects(store.load('corrupt'), error => {
      assert.ok(durableCode('storage_failure')(error));
      assert.ok(!error.message.includes('private-provider-error'));
      assert.equal(error.cause, undefined);
      return true;
    });
  } finally { await rm(temporary, { recursive: true, force: true }); }
});
