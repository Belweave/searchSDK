import test from 'node:test';
import assert from 'node:assert/strict';
import { createNativeTransport } from '../dist/native-transport.js';
import { SearchError } from '../dist/errors.js';

const json = data => new Response(JSON.stringify(data), { headers: { 'content-type': 'application/json' } });
const op = { id: 'search', method: 'POST', path: '/search', retryable: true };
const client = (fetch, options = {}) => createNativeTransport({ provider: 'fixture', baseUrl: 'https://api.example.com/v1', headers: { Authorization: 'Bearer private-secret' }, fetch, ...options });
const code = expected => error => { assert.ok(error instanceof SearchError); assert.equal(error.code, expected); return true; };

test('native JSON encodes paths, preserves base path, repeats query, snapshots bodies and bounds metadata', async () => {
  let call;
  const c = client(async (url, init) => { call = { url, init }; return new Response('{"ok":true}', { headers: { 'x-request-id': 'req_1', 'x-secret': 'private-secret' } }); });
  const result = await c.request({ id: 'jobs.get', method: 'POST', path: '/jobs/{id}' }, { path: { id: 'one/two?#' }, query: { tag: ['a', 'b'], count: 1, false: false, omit: null }, body: { q: 'secret query' } });
  assert.equal(call.url, 'https://api.example.com/v1/jobs/one%2Ftwo%3F%23?tag=a&tag=b&count=1&false=false');
  assert.equal(call.init.redirect, 'error');
  assert.equal(call.init.credentials, 'omit');
  assert.equal(new Headers(call.init.headers).get('authorization'), 'Bearer private-secret');
  assert.equal(new TextDecoder().decode(call.init.body), '{"q":"secret query"}');
  assert.deepEqual(result.data, { ok: true });
  assert.equal(result.metadata.requestId, 'req_1');
  assert.equal(result.metadata.attempts.length, 1);
  assert.ok(!JSON.stringify(result.metadata).includes('secret'));
});

for (const path of ['https://evil.test', '//evil.test', '/../bad', '/%2e%2e/bad', '/a?key=secret', '/a#bad', '/a\\b']) {
  test(`native rejects unsafe path ${path} before transport`, async () => {
    let calls = 0;
    await assert.rejects(client(async () => { calls++; return json({}); }).request({ ...op, path }), code('invalid_request'));
    assert.equal(calls, 0);
  });
}

test('native rejects malformed config, auth overrides, bad path inputs and invalid request bodies', async () => {
  for (const baseUrl of ['http://example.com', 'https://user:pass@example.com', 'https://example.com?a=b', 'https://example.com/#x']) assert.throws(() => client(async () => json({}), { baseUrl }), code('configuration'));
  let calls = 0;
  const c = client(async () => { calls++; return json({}); });
  for (const input of [{ headers: { authorization: 'steal' } }, { body: {}, rawBody: 'x' }, { path: { extra: 'x' } }, { query: { invalid: NaN } }, { timeoutMs: 0 }]) await assert.rejects(c.request(op, input), code('invalid_request'));
  for (const id of ['', '.', '..']) await assert.rejects(c.request({ ...op, path: '/jobs/{id}' }, { path: { id } }), code('invalid_request'));
  assert.equal(calls, 0);
});

test('native retries only explicitly replay-safe operations; writes default to one call', async () => {
  let calls = 0;
  const fetch = async () => ++calls < 3 ? new Response('private-secret', { status: 503 }) : json({ ok: true });
  const result = await client(fetch, { retry: { maxRetries: 2, baseDelayMs: 1, maxDelayMs: 2 } }).request(op, { body: {} });
  assert.equal(calls, 3);
  assert.deepEqual(result.metadata.attempts.map(a => a.outcome), ['error', 'error', 'success']);
  for (const method of ['GET', 'POST', 'DELETE']) {
    calls = 0;
    await assert.rejects(client(fetch, { retry: { maxRetries: 2 } }).request({ id: 'write', method, path: '/write' }), code('unavailable'));
    assert.equal(calls, 1);
  }
});

test('native Retry-After beyond remaining deadline never retries early', async () => {
  let calls = 0;
  await assert.rejects(client(async () => { calls++; return new Response('secret', { status: 429, headers: { 'retry-after': '5' } }); },
    { retry: { maxRetries: 2, baseDelayMs: 1 }, timeoutMs: 60 }).request(op), code('timeout'));
  assert.equal(calls, 1);
});

for (const status of [400, 401, 402, 403, 422]) test(`native HTTP ${status} terminal and redacted`, async () => {
  let calls = 0;
  await assert.rejects(client(async () => { calls++; return new Response('private-secret', { status }); }, { retry: { maxRetries: 2 } }).request(op), error => {
    assert.equal(error.status, status); assert.ok(!JSON.stringify(error).includes('private-secret')); assert.equal(error.cause, undefined); return true;
  });
  assert.equal(calls, 1);
});

test('native malformed JSON and over-limit bodies never retry', async () => {
  for (const response of [new Response('no json'), new Response('123456789')]) {
    let calls = 0;
    await assert.rejects(client(async () => { calls++; return response; }, { maxResponseBytes: 8, retry: { maxRetries: 2 } }).request(op), code('invalid_response'));
    assert.equal(calls, 1);
  }
});

test('native handles empty JSON responses, text, bytes, and bounded buffered raw responses', async () => {
  const c = client(async () => new Response('hello', { headers: { 'content-type': 'text/plain' } }));
  assert.equal((await c.request({ ...op, response: 'text' })).data, 'hello');
  assert.equal(new TextDecoder().decode((await c.request({ ...op, response: 'bytes' })).data), 'hello');
  assert.equal(await (await c.request({ ...op, response: 'raw' })).data.text(), 'hello');
  assert.equal((await client(async () => new Response(null, { status: 204 })).request(op)).data, null);
});

test('native multipart uploads get generated boundaries and no JSON wrapper', async () => {
  let request;
  const form = new FormData(); form.append('file', new Blob(['abc']), 'sample.txt');
  await client(async (url, init) => { request = new Request(url, init); return json({}); }).request(op, { rawBody: form });
  assert.match(request.headers.get('content-type'), /^multipart\/form-data; boundary=/);
  const parsed = await request.formData(); assert.equal(await parsed.get('file').text(), 'abc');
});

test('native cancellation and deadlines race fetch and bodies that ignore abort', async () => {
  let signal;
  const c = client(async (_, init) => { signal = init.signal; return new Promise(() => {}); }, { timeoutMs: 25 });
  await assert.rejects(c.request(op), code('timeout')); assert.equal(signal.aborted, true);
  const controller = new AbortController();
  const promise = client(async () => new Response(new ReadableStream({ pull() { return new Promise(() => {}); } }))).request(op, { signal: controller.signal });
  setTimeout(() => controller.abort('private-secret'), 10);
  await assert.rejects(promise, code('aborted'));
});

test('native FIFO concurrency, queued cancellation, and capacity release', async () => {
  let calls = 0; let release;
  const c = client(async () => { calls++; if (calls === 1) await new Promise(resolve => { release = resolve; }); return json({}); }, { maxConcurrency: 1 });
  const first = c.request(op);
  await new Promise(resolve => setTimeout(resolve, 5));
  const controller = new AbortController();
  const cancelled = c.request(op, { signal: controller.signal });
  const third = c.request(op);
  controller.abort(); await assert.rejects(cancelled, code('aborted')); assert.equal(calls, 1);
  release(); await first; await third; assert.equal(calls, 2);
});

function stream(chunks, onCancel = () => {}) {
  return new Response(new ReadableStream({ start(controller) { for (const chunk of chunks) controller.enqueue(chunk); controller.close(); }, cancel: onCancel }), { headers: { 'content-type': 'text/event-stream' } });
}

test('native SSE parses incremental UTF-8, split CRLF, comments, multiline data, IDs and incomplete EOF', async () => {
  const bytes = new TextEncoder().encode(': comment\r\nid: 7\r\nevent: token\r\nretry: 25\r\ndata: héllo\r\ndata: world\r\n\r\ndata: next\n\ndata: incomplete');
  const chunks = Array.from(bytes, b => Uint8Array.of(b));
  const result = await client(async () => stream(chunks)).request({ ...op, response: 'sse' });
  const events = []; for await (const event of result.data) events.push(event);
  assert.deepEqual(events, [{ event: 'token', id: '7', retry: 25, data: 'héllo\nworld' }, { id: '7', data: 'next' }]);
  await assert.rejects(async () => { for await (const _ of result.data) {} }, code('invalid_request'));
});

test('native SSE consumer break cancels, releases concurrency, and never reconnects', async () => {
  let calls = 0; let cancelled = 0;
  const c = client(async () => {
    calls++;
    if (calls > 1) return json({});
    return new Response(new ReadableStream({ start(controller) { controller.enqueue(new TextEncoder().encode('data: one\n\n')); }, cancel() { cancelled++; } }), { headers: { 'content-type': 'text/event-stream' } });
  }, { maxConcurrency: 1, retry: { maxRetries: 2 } });
  const result = await c.request({ ...op, response: 'sse' });
  for await (const event of result.data) { assert.equal(event.data, 'one'); break; }
  await c.request(op); assert.equal(calls, 2); assert.equal(cancelled, 1);
});

test('native SSE unused stream expires and releases capacity; midstream failure never retries', async () => {
  let calls = 0;
  const c = client(async () => { calls++; return new Response(new ReadableStream({ pull() { return new Promise(() => {}); } }), { headers: { 'content-type': 'text/event-stream' } }); }, { maxConcurrency: 1, timeoutMs: 25, retry: { maxRetries: 2 } });
  const result = await c.request({ ...op, response: 'sse' });
  await new Promise(resolve => setTimeout(resolve, 40));
  await assert.rejects(async () => { for await (const _ of result.data) {} }, code('timeout'));
  const second = await c.request({ ...op, response: 'sse' });
  await assert.rejects(async () => { for await (const _ of second.data) {} }, code('timeout')); assert.equal(calls, 2);
});

test('native SSE accepts a large event fragmented into small chunks without losing UTF-8 or line boundaries', async () => {
  const value = 'é'.repeat(256 * 1024);
  const bytes = new TextEncoder().encode(`data: ${value}\r\n\r\n`);
  let offset = 0;
  const response = new Response(new ReadableStream({ pull(controller) {
    if (offset >= bytes.length) { controller.close(); return; }
    controller.enqueue(bytes.subarray(offset, offset + 257)); offset += 257;
  } }), { headers: { 'content-type': 'text/event-stream' } });
  const result = await client(async () => response, { timeoutMs: 5000 }).request({ ...op, response: 'sse' });
  const values = []; for await (const event of result.data) values.push(event.data);
  assert.deepEqual(values, [value]);
});

test('native encoded Content-Length does not reject a smaller decoded response', async () => {
  const response = new Response('{}', { headers: { 'content-encoding': 'gzip', 'content-length': '22' } });
  assert.deepEqual((await client(async () => response, { maxResponseBytes: 4 }).request(op)).data, {});
});
