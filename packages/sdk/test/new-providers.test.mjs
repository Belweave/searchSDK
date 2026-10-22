import test from 'node:test';
import assert from 'node:assert/strict';
import { getEventListeners } from 'node:events';
import { createSearch, SearchError } from '../dist/index.js';
import { valyu } from '@belweave/search-sdk/valyu';
import { searxng } from '@belweave/search-sdk/searxng';
import { createMockProvider } from '../dist/testing.js';

// Synthetic documented-shape contracts; no provider calls, account checks or benchmark measurements.
const url = 'https://example.com/evidence';
const json = value => new Response(JSON.stringify(value));
const capture = value => {
  const calls = [];
  return { calls, fetch: async (input, init) => { calls.push({ url: String(input), init }); return json(value); } };
};
const failure = code => error => {
  assert.ok(error instanceof SearchError);
  assert.equal(error.code, code);
  assert.doesNotMatch(String(error), /sensitive|Bearer|fixture-key/);
  return true;
};
const definitions = [
  { id: 'valyu', make: fetch => valyu({ apiKey: 'fixture-key', fetch }),
    body: rows => ({ success: true, tx_id: 'tx_fixture', results: rows, total_deduction_dollars: 0 }),
    row: { url, title: 'Evidence', content: 'Body', relevance_score: 0.9 } },
  { id: 'searxng', make: fetch => searxng({ baseUrl: 'https://search.example.org', headers: { Authorization: 'Bearer fixture-key' }, fetch }),
    body: rows => ({ query: 'q', results: rows, unresponsive_engines: [] }),
    row: { url, title: 'Evidence', content: 'Body', score: 1.5 } },
];

test('Valyu sends documented web fields, typed settings, normalized filters and source provenance', async () => {
  const settings = { maxPrice: 20, relevanceThreshold: 0, responseLength: 1000, fastMode: false,
    startDate: '2024-02-29', endDate: '2024-06-30', instructions: 'Prefer official sources' };
  const t = capture({ success: true, tx_id: 'tx_fixture', error: null, results: [{ url, title: 'Evidence',
    content: 'Source text', relevance_score: 0.8, source: 'web', publication_date: '2024-06-15', price: 0.000625,
    provenance: { provider: 'forged', retrievedAt: 'forged' } }], total_deduction_dollars: 0.000625 });
  const provider = valyu({ apiKey: 'fixture-key', fetch: t.fetch, search: settings });
  settings.maxPrice = 1000; // Configuration is captured, not retained by reference.
  const result = await createSearch({ provider }).web.search({ query: ' a & b + 日本語 ', limit: 3,
    includeDomains: ['EXAMPLE.COM', 'example.com'], excludeDomains: ['other.org'] });
  assert.equal(t.calls.length, 1);
  const call = t.calls[0];
  assert.equal(call.url, 'https://api.valyu.ai/v1/search');
  assert.equal(call.init.method, 'POST');
  assert.equal(call.init.redirect, 'error');
  assert.equal(new Headers(call.init.headers).get('x-api-key'), 'fixture-key');
  assert.equal(new Headers(call.init.headers).get('content-type'), 'application/json');
  assert.deepEqual(JSON.parse(call.init.body), { query: ' a & b + 日本語 ', max_num_results: 3, search_type: 'web',
    included_sources: ['example.com'], excluded_sources: ['other.org'], max_price: 20, relevance_threshold: 0,
    response_length: 1000, fast_mode: false, start_date: '2024-02-29', end_date: '2024-06-30', instructions: 'Prefer official sources' });
  assert.equal(result.results[0].snippet, 'Source text');
  assert.equal(result.results[0].score, 0.8);
  assert.deepEqual(result.results[0].provenance, { provider: 'valyu', sourceUrl: url,
    retrievedAt: result.results[0].provenance.retrievedAt, requestId: 'tx_fixture' });
  assert.ok(Number.isFinite(Date.parse(result.results[0].provenance.retrievedAt)));
  assert.deepEqual(result.usage, { unit: 'usd', value: 0.000625 });
});

test('Valyu default request stays web only and never invents usage or source metadata', async () => {
  const t = capture({ success: true, results: [{ url }] });
  const result = await createSearch({ provider: valyu({ apiKey: 'fixture-key', fetch: t.fetch }) }).web.search({ query: 'q' });
  assert.deepEqual(JSON.parse(t.calls[0].init.body), { query: 'q', search_type: 'web', max_num_results: 5 });
  assert.equal(result.usage, null);
  assert.equal(result.results[0].provenance.requestId, undefined);
});

test('Valyu reports source warnings without exposing warning text or dropping usable rows', async () => {
  const t = capture({ success: true, error: 'sensitive source timeout', warnings: ['sensitive collection'], results: [{ url }] });
  const result = await createSearch({ provider: valyu({ apiKey: 'fixture-key', fetch: t.fetch }) }).web.search({ query: 'q' });
  assert.equal(result.results.length, 1);
  assert.deepEqual(result.warnings, [{ code: 'provider_warning', provider: 'valyu' }]);
  assert.doesNotMatch(JSON.stringify(result), /sensitive/);
});

test('SearXNG uses documented JSON form POST under base path with proxy auth and typed controls', async () => {
  const headers = { Authorization: 'Bearer fixture-key' };
  const categories = ['general', 'science'];
  const t = capture({ query: 'q', results: [{ url, title: 'Evidence', content: '<b>text</b>', score: 1.2,
    engines: ['engine-a', 'engine-b'], publishedDate: '2024-06-15', provenance: { provider: 'forged' } }],
    unresponsive_engines: [['engine-c', 'sensitive timeout']], number_of_results: 10000 });
  const provider = searxng({ baseUrl: 'https://search.example.org/private/', fetch: t.fetch, headers,
    categories, language: 'en-US', safeSearch: 0, timeRange: 'month' });
  headers.Authorization = 'Bearer changed';
  categories.push('news');
  const result = await createSearch({ provider }).web.search({ query: ' a & b + 日本語 site:unchanged.org ', limit: 20 });
  assert.equal(t.calls.length, 1);
  assert.equal(t.calls[0].url, 'https://search.example.org/private/search');
  assert.equal(t.calls[0].init.method, 'POST');
  assert.equal(t.calls[0].init.redirect, 'error');
  assert.equal(new Headers(t.calls[0].init.headers).get('authorization'), 'Bearer fixture-key');
  assert.equal(new Headers(t.calls[0].init.headers).get('content-type'), 'application/x-www-form-urlencoded');
  assert.deepEqual(Object.fromEntries(new URLSearchParams(t.calls[0].init.body)), { format: 'json', pageno: '1',
    categories: 'general,science', language: 'en-US', safesearch: '0', time_range: 'month', q: ' a & b + 日本語 site:unchanged.org ' });
  assert.equal(result.results.length, 1);
  assert.equal(result.results[0].score, 1.2);
  assert.equal(result.results[0].snippet, '<b>text</b>');
  assert.equal(result.results[0].provenance.provider, 'searxng');
  assert.equal(result.results[0].provenance.requestId, undefined);
  assert.equal(result.usage, null);
  assert.deepEqual(result.warnings, [{ code: 'provider_warning', provider: 'searxng' }]);
  assert.doesNotMatch(JSON.stringify(result), /sensitive/);
});

for (const definition of definitions) {
  const { id, make, body, row } = definition;
  test(`${id} raw method retains provider fields with SDK retrieval provenance`, async () => {
    const payload = body([{ ...row, source: 'web', engines: ['engine-a'], publication_date: '2024-06-15', price: 0.1 }]);
    payload.extra = { future_field: true };
    const t = capture(payload);
    const raw = await make(t.fetch).searchRaw({ query: 'q' });
    assert.equal(t.calls.length, 1);
    assert.deepEqual(raw.data, payload);
    assert.equal(raw.provider, id);
    assert.ok(Number.isFinite(Date.parse(raw.retrievedAt)));
  });
  test(`${id} returns empty results without fallback or usage fabrication`, async () => {
    const fallback = createMockProvider({ id: 'backup' });
    const result = await createSearch({ provider: make(async () => json(body([]))), fallback: [fallback] }).web.search({ query: 'q' });
    assert.equal(result.results.length, 0);
    assert.equal(fallback.calls.length, 0);
    assert.equal(result.usage?.value ?? null, id === 'valyu' ? 0 : null);
  });
  test(`${id} direct normalized output honors ceiling and dispatches one request`, async () => {
    const t = capture(body(Array.from({ length: 8 }, (_, i) => ({ ...row, url: `${url}/${i}` }))));
    const result = await make(t.fetch).search({ query: 'q', limit: 2 }, { signal: new AbortController().signal });
    assert.equal(result.results.length, 2);
    assert.equal(t.calls.length, 1);
  });
  for (const badRow of [null, [], { url: 'javascript:alert(1)' }, { url: 'https://user:secret@example.com' },
    { url: 'https://example.com\\evil' }, { url, title: {} }, { url, content: {} },
    { url, [id === 'valyu' ? 'relevance_score' : 'score']: '0.9' }]) {
    test(`${id} rejects malformed or unsafe result ${JSON.stringify(badRow)}`, async () => {
      await assert.rejects(make(async () => json(body([badRow]))).searchRaw({ query: 'q' }), failure('invalid_response'));
    });
  }
  for (const payload of [null, [], {}, { results: null }, ...(id === 'valyu' ? [{ results: [], success: 'true' }] : [])]) {
    test(`${id} rejects malformed envelope ${JSON.stringify(payload)}`, async () => {
      await assert.rejects(make(async () => json(payload)).searchRaw({ query: 'q' }), failure('invalid_response'));
    });
  }
  test(`${id} rejects invalid requests and options before transport`, async () => {
    let calls = 0;
    const provider = make(async () => { calls++; return json(body([])); });
    for (const request of [{ query: '' }, { query: 'q', limit: 21 }, { query: 'q', limit: null }, { query: 'q', native: {} },
      { query: 'q', includeDomains: ['https://example.com'] }]) {
      await assert.rejects(provider.searchRaw(request), failure('invalid_request'));
    }
    await assert.rejects(provider.searchRaw({ query: 'q' }, { signal: 'sensitive' }), failure('invalid_request'));
    await assert.rejects(provider.searchRaw({ query: 'q' }, { headers: {} }), failure('invalid_request'));
    assert.equal(calls, 0);
  });
  for (const [status, expected] of [[401, 'auth'], [403, 'auth'], [429, 'rate_limit'], [500, 'unavailable'], [400, 'provider_error']]) {
    test(`${id} sanitizes HTTP ${status} and preserves Retry-After`, async () => {
      await assert.rejects(make(async () => new Response('sensitive provider body', { status, headers: { 'Retry-After': '2' } }))
        .searchRaw({ query: 'q' }), error => { assert.ok(failure(expected)(error)); assert.equal(error.status, status); assert.equal(error.retryAfterMs, 2000); return true; });
    });
  }
  test(`${id} blocks redirects and redacts thrown transport secrets`, async () => {
    await assert.rejects(make(async (_, init) => {
      assert.equal(init.redirect, 'error');
      throw new Error('sensitive Bearer fixture-key');
    }).searchRaw({ query: 'q' }), failure('network'));
  });
  test(`${id} cancels a pending response stream and removes caller listeners`, async () => {
    let cancelled = 0;
    let arrived;
    const opened = new Promise(resolve => { arrived = resolve; });
    const provider = make(async () => new Response(new ReadableStream({ start() { arrived(); }, cancel() { cancelled++; } })));
    const controller = new AbortController();
    const pending = provider.searchRaw({ query: 'q' }, { signal: controller.signal });
    await opened;
    controller.abort('sensitive');
    await assert.rejects(pending, failure('aborted'));
    assert.equal(cancelled, 1);
    assert.equal(getEventListeners(controller.signal, 'abort').length, 0);
  });
  test(`${id} rejects pre-aborted calls without dispatch and bounds signal-ignoring fetch`, async () => {
    let calls = 0;
    const provider = make(async () => { calls++; return new Promise(() => {}); });
    const controller = new AbortController();
    controller.abort();
    await assert.rejects(provider.searchRaw({ query: 'q' }, { signal: controller.signal }), failure('aborted'));
    assert.equal(calls, 0);
    await assert.rejects(createSearch({ provider, timeoutMs: 25 }).web.search({ query: 'q' }), failure('timeout'));
    assert.equal(calls, 1);
  });
  test(`${id} bounds announced and streamed response bytes and cancels excess`, async () => {
    let cancelled = 0;
    await assert.rejects(make(async () => new Response(new ReadableStream({ cancel() { cancelled++; } }),
      { headers: { 'Content-Length': String(10 * 1024 * 1024 + 1) } })).searchRaw({ query: 'q' }), failure('invalid_response'));
    assert.equal(cancelled, 1);
    await assert.rejects(make(async () => new Response(new ReadableStream({
      start(controller) { controller.enqueue(new Uint8Array(10 * 1024 * 1024 + 1)); },
      cancel() { cancelled++; },
    }))).searchRaw({ query: 'q' }), failure('invalid_response'));
    assert.equal(cancelled, 2);
  });
}

test('Valyu rejects error envelopes, invalid usage, malformed IDs and warnings', async () => {
  for (const [payload, code] of [
    [{ success: false, error: 'sensitive', results: [] }, 'provider_error'],
    [{ success: true, results: [], total_deduction_dollars: -1 }, 'invalid_response'],
    [{ success: true, results: [], total_deduction_dollars: '0.1' }, 'invalid_response'],
    [{ success: true, results: [], tx_id: 'sensitive\r\n' }, 'invalid_response'],
    [{ success: true, results: [], warnings: [1] }, 'invalid_response'],
    [{ success: true, results: [], error: {} }, 'invalid_response'],
  ]) await assert.rejects(valyu({ apiKey: 'fixture-key', fetch: async () => json(payload) }).searchRaw({ query: 'q' }), failure(code));
});

test('Valyu accepts documented settings and rejects unsupported configuration before transport', () => {
  for (const responseLength of ['short', 'medium', 'large', 'max', 1]) assert.ok(valyu({ apiKey: 'fixture-key', search: { responseLength } }));
  for (const options of [null, {}, { apiKey: '' }, { apiKey: 'bad\nkey' }, { apiKey: 'fixture-key', fetch: null },
    { apiKey: 'fixture-key', baseUrl: 'https://evil.example' }, { apiKey: 'fixture-key', search: null },
    ...[{ maxPrice: 0 }, { maxPrice: Infinity }, { relevanceThreshold: 1.1 }, { relevanceThreshold: '0.5' },
      { responseLength: 0 }, { responseLength: 1.5 }, { responseLength: 'huge' }, { fastMode: 1 },
      { startDate: '2024-02-30' }, { startDate: '2023-02-29' }, { startDate: '2024' },
      { startDate: '2024-06-30', endDate: '2024-06-01' }, { instructions: 'x'.repeat(501) },
      { search_type: 'proprietary' }, { included_sources: ['dataset/premium'] }].map(search => ({ apiKey: 'fixture-key', search })),
  ]) assert.throws(() => valyu(options), failure('configuration'));
});

test('Valyu domain capacities are enforced for direct and orchestrated requests', async () => {
  let calls = 0;
  const provider = valyu({ apiKey: 'fixture-key', fetch: async () => { calls++; return json({ success: true, results: [] }); } });
  const request = { query: 'q', includeDomains: Array.from({ length: 101 }, (_, i) => `domain${i}.example`) };
  await assert.rejects(provider.searchRaw(request), failure('unsupported_option'));
  await assert.rejects(createSearch({ provider }).web.search(request), failure('unsupported_option'));
  assert.equal(calls, 0);
});

test('SearXNG rejects domain filters without synthesizing site syntax or dispatching', async () => {
  let calls = 0;
  const provider = searxng({ baseUrl: 'https://search.example.org', fetch: async () => { calls++; return json({ results: [] }); } });
  await assert.rejects(provider.searchRaw({ query: 'q', includeDomains: ['example.com'] }), failure('unsupported_option'));
  await assert.rejects(createSearch({ provider }).web.search({ query: 'q', excludeDomains: ['example.com'] }), failure('unsupported_option'));
  assert.equal(calls, 0);
});

test('SearXNG rejects unsafe endpoints and malformed or reserved proxy headers', () => {
  for (const baseUrl of ['', 'http://search.example.org', '//search.example.org', 'https://user:secret@search.example.org',
    'https://search.example.org/?q=secret', 'https://search.example.org/#secret', 'https://search.example.org/?',
    'https://search.example.org/#', 'https://search.example.org\\evil', ' https://search.example.org']) {
    assert.throws(() => searxng({ baseUrl }), failure('configuration'));
  }
  for (const options of [{ baseUrl: 'https://search.example.org', fetch: null }, { baseUrl: 'https://search.example.org', extra: true },
    ...[null, [], { Authorization: 'secret\r\nX-Forged: yes' }, { Host: 'evil.example' }, { Cookie: 'secret' },
      { 'Content-Type': 'text/plain' }, { Accept: 'text/html' }, { 'X-Test': 1 }].map(headers => ({ baseUrl: 'https://search.example.org', headers })),
    ...[{ language: 'en&format=html' }, { safeSearch: 3 }, { safeSearch: '1' }, { timeRange: 'week' },
      { categories: [] }, { categories: null }, { categories: ['general,news'] }, { categories: ['x&format=html'] },
      { categories: Array(21).fill('general') }].map(settings => ({ baseUrl: 'https://search.example.org', ...settings })),
  ]) assert.throws(() => searxng(options), failure('configuration'));
});

test('SearXNG rejects provider errors and malformed engine-health envelopes', async () => {
  for (const [payload, code] of [[{ error: 'sensitive', results: [] }, 'provider_error'],
    [{ results: [], unresponsive_engines: {} }, 'invalid_response']]) {
    await assert.rejects(searxng({ baseUrl: 'https://search.example.org', fetch: async () => json(payload) }).searchRaw({ query: 'q' }), failure(code));
  }
});
