import test from 'node:test';
import assert from 'node:assert/strict';
import { getEventListeners } from 'node:events';
import { createSearch, SearchError } from '../dist/index.js';
import { createMockProvider } from '../dist/testing.js';
import { perplexity } from '../dist/perplexity.js';
import { parallel } from '../dist/parallel.js';
import { linkup } from '../dist/linkup.js';
import { firecrawl } from '../dist/firecrawl.js';
import { you } from '../dist/you.js';
import { serper } from '../dist/serper.js';
import { serpapi } from '../dist/serpapi.js';
const source = 'https://example.com/source';
const json = value => new Response(JSON.stringify(value));
const failure = expected => error => { assert.ok(error instanceof SearchError); assert.equal(error.code, expected); assert.ok(!String(error).includes('sensitive')); return true; };
const definitions = [
  { factory: perplexity, endpoint: 'https://api.perplexity.ai/search', header: 'Authorization', auth: 'Bearer fixture',
    payload: rows => ({ id: 'req_1', results: rows }), row: { url: source, title: 'Title', snippet: 'Snippet' },
    request: { query: 'a & b', max_results: 3, search_type: 'web', search_domain_filter: ['example.com'] },
    include: 20, exclude: 20, exclusive: true },
  { factory: parallel, endpoint: 'https://api.parallel.ai/v1/search', header: 'x-api-key', auth: 'fixture',
    payload: rows => ({ search_id: 'search_1', results: rows }), row: { url: source, title: 'Title', excerpts: ['First', 'Second'] },
    request: { search_queries: ['a & b'], mode: 'basic', advanced_settings: { max_results: 3, source_policy: { include_domains: ['example.com'] } } },
    include: 200, exclude: 200, exclusive: true },
  { factory: linkup, endpoint: 'https://api.linkup.so/v1/search', header: 'Authorization', auth: 'Bearer fixture',
    payload: rows => ({ results: rows }), row: { url: source, name: 'Title', content: 'Snippet', type: 'text', favicon: '' },
    request: { q: 'a & b', depth: 'fast', outputType: 'searchResults', includeImages: false, maxResults: 3, includeDomains: ['example.com'] },
    include: 100, exclude: 50, exclusive: false },
  { factory: firecrawl, endpoint: 'https://api.firecrawl.dev/v2/search', header: 'Authorization', auth: 'Bearer fixture',
    payload: rows => ({ success: true, data: { web: rows }, id: 'job_1', creditsUsed: 2 }), row: { url: source, title: 'Title', description: 'Snippet' },
    request: { query: 'a & b', limit: 3, sources: [{ type: 'web' }], highlights: false, includeDomains: ['example.com'] },
    include: 100, exclude: 100, exclusive: true },
  { factory: you, endpoint: 'https://ydc-index.io/v1/search', header: 'X-API-Key', auth: 'fixture',
    payload: rows => ({ results: { web: rows, news: [{ url: 'https://news.example.com' }] }, metadata: { search_uuid: 'search_1' } }), row: { url: source, title: 'Title', description: 'Snippet', snippets: ['Keyword fragment'] },
    request: { query: 'a & b', count: 3, include_domains: ['example.com'] }, include: 500, exclude: 5000, exclusive: true },
  { factory: serper, endpoint: 'https://google.serper.dev/search', header: 'X-API-KEY', auth: 'fixture',
    payload: rows => ({ organic: rows, credits: 1 }), row: { link: source, title: 'Title', snippet: 'Snippet', position: 1 },
    request: { q: 'a & b', num: 3 }, include: 0, exclude: 0 },
  { factory: serpapi, endpoint: 'https://serpapi.com/search.json', payload: rows => ({ search_metadata: { id: 'search_1', status: 'Success' }, organic_results: rows }),
    row: { link: source, title: 'Title', snippet: 'Snippet', position: 1 }, include: 0, exclude: 0 },
];
for (const d of definitions) {
  const id = d.factory.name;
  test(`${id}: independently pinned search wire contract and provenance`, async () => {
    const calls = [];
    const provider = d.factory({ apiKey: 'fixture', fetch: async (url, init) => { calls.push({ url: String(url), init }); return json(d.payload([d.row])); } });
    const response = await createSearch({ provider }).web.search({ query: 'a & b', limit: 3, ...(d.include ? { includeDomains: ['EXAMPLE.COM', 'example.com'] } : {}) });
    assert.equal(calls.length, 1);
    const u = new URL(calls[0].url); const init = calls[0].init;
    assert.equal(u.origin + u.pathname, d.endpoint);
    assert.equal(init.redirect, 'error'); assert.ok(init.signal instanceof AbortSignal);
    if (id === 'serpapi') {
      assert.equal(init.method, 'GET'); assert.deepEqual(Object.fromEntries(u.searchParams), { engine: 'google', q: 'a & b', api_key: 'fixture' });
      assert.equal(init.body, undefined); // Google no longer documents a num parameter.
    } else {
      assert.equal(init.method, 'POST'); assert.equal(init.headers[d.header], d.auth); assert.equal(init.headers['Content-Type'], 'application/json');
      assert.deepEqual(JSON.parse(init.body), d.request);
    }
    assert.equal(response.results.length, 1); assert.equal(response.results[0].url, source); assert.equal(response.results[0].title, 'Title');
    assert.equal(response.results[0].provenance.provider, id); assert.equal(response.results[0].provenance.sourceUrl, source);
    assert.ok(Number.isFinite(Date.parse(response.results[0].provenance.retrievedAt)));
    assert.equal(response.results[0].score, undefined);
    if (id === 'parallel') assert.deepEqual(response.results[0].highlights, ['First', 'Second']);
    else { assert.equal(response.results[0].snippet, 'Snippet'); assert.equal(response.results[0].highlights, undefined); }
    assert.deepEqual(response.usage, id === 'firecrawl' ? { unit: 'credits', value: 2 } : id === 'serper' ? { unit: 'credits', value: 1 } : null);
  });
  test(`${id}: filter limits and unsupported combinations preflight every fallback`, async () => {
    const provider = d.factory({ apiKey: 'fixture', fetch: async () => { throw new Error('must not call'); } });
    for (const field of ['includeDomains', 'excludeDomains']) {
      const primary = createMockProvider(); const maximum = field === 'includeDomains' ? d.include : d.exclude;
      await assert.rejects(createSearch({ provider: primary, fallback: [provider] }).web.search({ query: 'q', [field]: Array.from({ length: maximum + 1 }, (_, i) => `site${i}.org`) }), failure('unsupported_option'));
      assert.equal(primary.calls.length, 0);
    }
    if (d.exclusive) {
      const primary = createMockProvider();
      await assert.rejects(createSearch({ provider: primary, fallback: [provider] }).web.search({ query: 'q', includeDomains: ['example.org'], excludeDomains: ['elsewhere.org'] }), failure('unsupported_option'));
      assert.equal(primary.calls.length, 0);
    }
  });
  test(`${id}: validates all consumed rows before result truncation`, async () => {
    for (const malformed of [null, {}, [], { ...d.row, [id === 'linkup' ? 'name' : 'title']: 42 },
      { ...d.row, [id === 'serper' || id === 'serpapi' ? 'link' : 'url']: 'javascript:alert(1)' },
      { ...d.row, [id === 'serper' || id === 'serpapi' ? 'link' : 'url']: 'https://user:secret@example.com' }]) {
      const backup = createMockProvider({ id: 'backup' });
      const provider = d.factory({ apiKey: 'fixture', fetch: async () => json(d.payload([d.row, malformed])) });
      await assert.rejects(createSearch({ provider, fallback: [backup] }).web.search({ query: 'q', limit: 1 }), failure('invalid_response'));
      assert.equal(backup.calls.length, 0);
    }
    for (const payload of [null, [], {}, d.payload(null), d.payload({})]) {
      await assert.rejects(createSearch({ provider: d.factory({ apiKey: 'fixture', fetch: async () => json(payload) }) }).web.search({ query: 'q' }), failure('invalid_response'));
    }
  });
  test(`${id}: zero hits succeed and output limit is a ceiling`, async () => {
    for (const rows of [[], Array.from({ length: 8 }, () => d.row)]) {
      let calls = 0; const backup = createMockProvider({ id: 'backup' });
      const provider = d.factory({ apiKey: 'fixture', fetch: async () => { calls++; return json(d.payload(rows)); } });
      const result = await createSearch({ provider, fallback: [backup] }).web.search({ query: 'q', limit: 3 });
      assert.equal(result.results.length, Math.min(rows.length, 3)); assert.equal(calls, 1); assert.equal(backup.calls.length, 0);
    }
  });
  test(`${id}: strict request and factory configuration fail before fetch`, async () => {
    for (const options of [{ apiKey: '' }, { apiKey: 'bad\nkey' }, { apiKey: 'fixture', fetch: 1 }, { apiKey: 'fixture', endpoint: 'https://elsewhere.org' }]) assert.throws(() => d.factory(options), failure('configuration'));
    let calls = 0; const client = createSearch({ provider: d.factory({ apiKey: 'fixture', fetch: async () => { calls++; return json(d.payload([])); } }) });
    for (const request of [{ query: '' }, { query: 'q', limit: 21 }, { query: 'q', page: 2 }, { query: 'q', includeDomains: ['https://example.org'] }]) await assert.rejects(client.web.search(request), failure('invalid_request'));
    assert.equal(calls, 0);
  });
  for (const status of [400, 401, 402, 403, 408, 429, 500, 503]) test(`${id}: safe HTTP ${status} classification`, async () => {
    const backup = createMockProvider({ id: 'backup' });
    const provider = d.factory({ apiKey: 'sensitive-key', fetch: async () => new Response('sensitive-body', { status, headers: { 'Retry-After': '2' } }) });
    const promise = createSearch({ provider, fallback: [backup] }).web.search({ query: 'q' });
    if ([408, 429, 500, 503].includes(status)) {
      const result = await promise; assert.equal(result.provider, 'backup'); assert.equal(result.attempts[0].status, status); assert.equal(result.attempts[0].retryAfterMs, 2000);
    } else { await assert.rejects(promise, failure(status === 400 ? 'provider_error' : 'auth')); assert.equal(backup.calls.length, 0); }
  });
  test(`${id}: cancellation and deadline bound a signal-ignoring transport`, async () => {
    const controller = new AbortController(); let observed;
    const provider = d.factory({ apiKey: 'fixture', fetch: async (_url, init) => { observed = init.signal; controller.abort('sensitive-reason'); return new Promise(() => {}); } });
    await assert.rejects(createSearch({ provider }).web.search({ query: 'q' }, { signal: controller.signal }), failure('aborted'));
    assert.equal(observed.aborted, true); assert.equal(getEventListeners(controller.signal, 'abort').length, 0);
    await assert.rejects(createSearch({ provider: d.factory({ apiKey: 'fixture', fetch: async () => new Promise(() => {}) }), timeoutMs: 20 }).web.search({ query: 'q' }), failure('timeout'));
  });
  test(`${id}: invalid JSON stays terminal while network failure can fall back`, async () => {
    for (const invalidJson of [false, true]) {
      const backup = createMockProvider({ id: 'backup' });
      const provider = d.factory({ apiKey: 'fixture', fetch: async () => { if (invalidJson) return new Response('sensitive-json'); throw Error('sensitive-network'); } });
      const promise = createSearch({ provider, fallback: [backup] }).web.search({ query: 'q' });
      if (invalidJson) { await assert.rejects(promise, failure('invalid_response')); assert.equal(backup.calls.length, 0); }
      else assert.equal((await promise).provider, 'backup');
    }
  });
}
test('Perplexity excludes use minus-prefixed native domains', async () => {
  let body;
  await createSearch({ provider: perplexity({ apiKey: 'fixture', fetch: async (_url, init) => { body = JSON.parse(init.body); return json({ results: [] }); } }) }).web.search({ query: 'q', excludeDomains: ['example.org'] });
  assert.deepEqual(body.search_domain_filter, ['-example.org']);
});
test('Linkup rejects media rows when images were disabled', async () => {
  await assert.rejects(createSearch({ provider: linkup({ apiKey: 'fixture', fetch: async () => json({ results: [{ url: source, type: 'image' }] }) }) }).web.search({ query: 'q' }), failure('invalid_response'));
});
test('You snippets are fragments, not synthetic provider highlights', async () => {
  const r = await createSearch({ provider: you({ apiKey: 'fixture', fetch: async () => json({ results: { web: [{ url: source, snippets: ['a', 'b'] }] } }) }) }).web.search({ query: 'q' });
  assert.equal(r.results[0].snippet, 'a\nb'); assert.equal(r.results[0].highlights, undefined);
});
test('Firecrawl credit/warning validation and failure envelopes', async () => {
  for (const payload of [{ success: false, error: 'sensitive' }, { success: true, data: { web: [] }, creditsUsed: -1 }, { success: true, data: { web: [] }, creditsUsed: 0.5 }, { success: true, data: { web: [] }, warning: {} }]) {
    await assert.rejects(createSearch({ provider: firecrawl({ apiKey: 'fixture', fetch: async () => json(payload) }) }).web.search({ query: 'q' }), failure(payload.success === false ? 'provider_error' : 'invalid_response'));
  }
});
test('Firecrawl query ceiling preflights across the chain', async () => {
  const primary = createMockProvider();
  await assert.rejects(createSearch({ provider: primary, fallback: [firecrawl({ apiKey: 'fixture' })] }).web.search({ query: 'q'.repeat(501) }), failure('unsupported_option'));
  assert.equal(primary.calls.length, 0);
});
test('SerpAPI provider error/async/malformed status cannot become web success', async () => {
  for (const status of ['Error', 'Processing', 'Queued', null, 42]) {
    const provider = serpapi({ apiKey: 'fixture', fetch: async () => json({ search_metadata: { status }, organic_results: [] }) });
    await assert.rejects(createSearch({ provider }).web.search({ query: 'q' }), failure(status === 'Error' ? 'provider_error' : 'invalid_response'));
  }
});
test('You news-only responses are legitimate empty web searches, never relabeled news', async () => {
  const r = await createSearch({ provider: you({ apiKey: 'fixture', fetch: async () => json({ results: { news: [{ url: source, title: 'News' }] }, metadata: { search_uuid: 'search_1' } }) }) }).web.search({ query: 'q' });
  assert.deepEqual(r.results, []);
});
test('Parallel validates its consumed warning envelope', async () => {
  await assert.rejects(createSearch({ provider: parallel({ apiKey: 'fixture', fetch: async () => json({ results: [], warnings: 'sensitive' }) }) }).web.search({ query: 'q' }), failure('invalid_response'));
});
test('SerpAPI documented successful no-match diagnostic returns empty results without fallback', async () => {
  for (const organic of [{}, { organic_results: [] }]) {
    let calls = 0; const backup = createMockProvider({ id: 'backup' });
    const provider = serpapi({ apiKey: 'fixture', fetch: async () => {
      calls++; return json({ search_metadata: { id: 'search_empty', status: 'Success' },
        search_information: { total_results: 0, organic_results_state: 'Fully empty' },
        error: "Google hasn't returned any results for this query.", ...organic });
    } });
    const response = await createSearch({ provider, fallback: [backup] }).web.search({ query: 'no matches' });
    assert.equal(response.provider, 'serpapi'); assert.deepEqual(response.results, []); assert.equal(response.usage, null);
    assert.deepEqual(response.warnings, []); assert.equal(response.attempts.length, 1); assert.equal(response.attempts[0].outcome, 'success');
    assert.equal(calls, 1); assert.equal(backup.calls.length, 0);
  }
});
test('SerpAPI empty-success exception requires every exact marker and cannot swallow bad rows or metadata', async () => {
  const empty = { search_metadata: { status: 'Success', id: 'search_empty' },
    search_information: { total_results: 0, organic_results_state: 'Fully empty' },
    error: "Google hasn't returned any results for this query." };
  const cases = [
    { ...empty, error: 'sensitive unrelated provider error' },
    { ...empty, error: empty.error.toLowerCase() },
    { ...empty, search_metadata: { status: 'Error' } },
    { ...empty, search_metadata: { status: 'Processing' } },
    { ...empty, search_information: undefined },
    { ...empty, search_information: null },
    { ...empty, search_information: [] },
    { ...empty, search_information: { total_results: '0', organic_results_state: 'Fully empty' } },
    { ...empty, search_information: { total_results: 1, organic_results_state: 'Fully empty' } },
    { ...empty, search_information: { total_results: 0, organic_results_state: 'Exact matches' } },
    { ...empty, organic_results: null },
    { ...empty, organic_results: {} },
    { ...empty, organic_results: [null] },
    { ...empty, organic_results: [{ link: source, title: 'Contradictory real result' }] },
  ];
  for (const payload of cases) {
    const backup = createMockProvider({ id: 'backup' });
    await assert.rejects(createSearch({ provider: serpapi({ apiKey: 'fixture', fetch: async () => json(payload) }), fallback: [backup] }).web.search({ query: 'q' }), failure('provider_error'));
    assert.equal(backup.calls.length, 0);
  }
  await assert.rejects(createSearch({ provider: serpapi({ apiKey: 'fixture', fetch: async () => json({ ...empty, search_metadata: { status: 'Success', id: 'invalid request id' } }) }) }).web.search({ query: 'q' }), failure('invalid_response'));
  await assert.rejects(createSearch({ provider: serpapi({ apiKey: 'fixture', fetch: async () => json({ ...empty, error: undefined, organic_results: null }) }) }).web.search({ query: 'q' }), failure('invalid_response'));
});
