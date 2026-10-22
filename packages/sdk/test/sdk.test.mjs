import test from 'node:test';
import assert from 'node:assert/strict';
import { getEventListeners } from 'node:events';
import { createSearch, SearchError } from '@belweave/search-sdk';
import { exa } from '@belweave/search-sdk/exa';
import { tavily } from '@belweave/search-sdk/tavily';
import { brave } from '@belweave/search-sdk/brave';
import { createMockProvider } from '@belweave/search-sdk/testing';

const hit = { url: 'https://example.com/a', title: 'A source', highlights: ['Relevant passage'], score: 0.8 };
const json = value => new Response(JSON.stringify(value), { headers: { 'Content-Type': 'application/json' } });
function transport(response) {
  const calls = [];
  const fetch = async (url, init) => { calls.push({ url: String(url), init }); return typeof response === 'function' ? response() : response; };
  return { calls, fetch };
}
function rejectsCode(code, count) {
  return error => {
    assert.ok(error instanceof SearchError);
    assert.equal(error.code, code);
    if (count !== undefined) assert.equal(error.attempts.length, count);
    return true;
  };
}

test('Exa sends native filters/highlights and maps provenance and USD usage', async () => {
  const t = transport(json({ results: [hit], requestId: 'exa-request-1', costDollars: { total: 0.004 }, warnings: [{ message: 'private body' }] }));
  const result = await createSearch({ provider: exa({ apiKey: 'test-exa', fetch: t.fetch }) }).web.search({
    query: 'source', limit: 2, includeDomains: ['EXAMPLE.COM'], excludeDomains: ['other.org'] });
  const { url, init } = t.calls[0];
  assert.equal(url, 'https://api.exa.ai/search');
  assert.equal(init.headers['x-api-key'], 'test-exa');
  assert.equal(init.method, 'POST');
  assert.equal(init.redirect, 'error');
  assert.ok(init.signal instanceof AbortSignal);
  assert.deepEqual(JSON.parse(init.body), { query: 'source', numResults: 2, type: 'auto', contents: { highlights: true },
    includeDomains: ['example.com'], excludeDomains: ['other.org'] });
  assert.equal(result.provider, 'exa');
  assert.deepEqual(result.usage, { unit: 'usd', value: 0.004 });
  assert.deepEqual(result.results[0].highlights, ['Relevant passage']);
  assert.equal(result.results[0].score, 0.8);
  assert.deepEqual(result.results[0].provenance, { provider: 'exa', sourceUrl: hit.url,
    requestId: 'exa-request-1', retrievedAt: result.results[0].provenance.retrievedAt });
  assert.ok(Number.isFinite(Date.parse(result.results[0].provenance.retrievedAt)));
  assert.deepEqual(result.warnings, [{ code: 'provider_warning', provider: 'exa' }]);
  assert.equal(result.attempts[0].outcome, 'success');
  assert.ok(!JSON.stringify(result).includes('private body'));
});

test('Tavily preserves native content, score, credits and restrictive filters', async () => {
  const t = transport(json({ results: [{ url: hit.url, title: hit.title, content: 'chunk 1 [...] chunk 2', score: 0.4 }],
    request_id: 'tvly-1', usage: { credits: 1 } }));
  const result = await createSearch({ provider: tavily({ apiKey: 'test-tavily', fetch: t.fetch }) }).web.search({
    query: 'q', includeDomains: ['example.com'], excludeDomains: ['other.org'] });
  assert.equal(t.calls[0].url, 'https://api.tavily.com/search');
  assert.equal(t.calls[0].init.headers.Authorization, 'Bearer test-tavily');
  assert.equal(t.calls[0].init.redirect, 'error');
  assert.deepEqual(JSON.parse(t.calls[0].init.body), { query: 'q', max_results: 5, search_depth: 'basic', include_usage: true,
    auto_parameters: false, include_answer: false, include_raw_content: false,
    include_domains: ['example.com'], include_domains_mode: 'restrict', exclude_domains: ['other.org'] });
  assert.equal(result.results[0].snippet, 'chunk 1 [...] chunk 2');
  assert.equal(result.results[0].score, 0.4);
  assert.equal(result.results[0].provenance.requestId, 'tvly-1');
  assert.deepEqual(result.usage, { unit: 'credits', value: 1 });
});

test('Brave uses GET, bounded count and extra snippets with unknown usage', async () => {
  const t = transport(json({ web: { results: [{ url: hit.url, title: hit.title, description: '<strong>native</strong>', extra_snippets: ['extra'] }] } }));
  const result = await createSearch({ provider: brave({ apiKey: 'test-brave', fetch: t.fetch }) }).web.search({ query: 'a & b', limit: 20 });
  const url = new URL(t.calls[0].url);
  assert.equal(url.origin + url.pathname, 'https://api.search.brave.com/res/v1/web/search');
  assert.equal(url.searchParams.get('q'), 'a & b');
  assert.equal(url.searchParams.get('count'), '20');
  assert.equal(url.searchParams.get('extra_snippets'), 'true');
  assert.equal(t.calls[0].init.method, 'GET');
  assert.equal(t.calls[0].init.headers['X-Subscription-Token'], 'test-brave');
  assert.equal(t.calls[0].init.redirect, 'error');
  assert.equal(t.calls[0].init.body, undefined);
  assert.equal(result.results[0].snippet, '<strong>native</strong>');
  assert.deepEqual(result.results[0].highlights, ['extra']);
  assert.equal(result.results[0].score, undefined);
  assert.equal(result.usage, null);
});

test('explicit fallback succeeds once and retains rate-limit Retry-After', async () => {
  const first = transport(new Response('secret provider body', { status: 429, headers: { 'retry-after': '3' } }));
  const second = createMockProvider({ id: 'secondary' });
  const result = await createSearch({ provider: exa({ apiKey: 'test', fetch: first.fetch }), fallback: [second] }).web.search({ query: 'q' });
  assert.equal(result.provider, 'secondary');
  assert.deepEqual(result.attempts.map(a => a.code ?? a.outcome), ['rate_limit', 'success']);
  assert.equal(result.attempts[0].retryAfterMs, 3000);
  assert.equal(result.attempts[0].status, 429);
  assert.deepEqual(result.warnings, [{ code: 'fallback_used', provider: 'secondary' }]);
  assert.equal(first.calls.length, 1);
  assert.equal(second.calls.length, 1);
});

test('all transient failures exhaust the chain without retries', async () => {
  const a = createMockProvider({ id: 'a', outcomes: [{ type: 'error', code: 'network' }] });
  const b = createMockProvider({ id: 'b', outcomes: [{ type: 'error', code: 'unavailable' }] });
  await assert.rejects(createSearch({ provider: a, fallback: [b] }).web.search({ query: 'q' }), error => {
    rejectsCode('unavailable', 2)(error);
    assert.deepEqual(error.attempts.map(a => a.provider), ['a', 'b']);
    return true;
  });
  assert.equal(a.calls.length, 1);
  assert.equal(b.calls.length, 1);
});

test('single-provider mode never adds an implicit fallback', async () => {
  const provider = createMockProvider({ outcomes: [{ type: 'error', code: 'network' }] });
  await assert.rejects(createSearch({ provider }).web.search({ query: 'q' }), rejectsCode('network', 1));
  assert.equal(provider.calls.length, 1);
});

test('empty results are successful and never trigger fallback', async () => {
  const provider = createMockProvider({ outcomes: [{ type: 'success', results: [] }] });
  const backup = createMockProvider({ id: 'backup' });
  const result = await createSearch({ provider, fallback: [backup] }).web.search({ query: 'q' });
  assert.deepEqual(result.results, []);
  assert.equal(result.attempts.length, 1);
  assert.equal(backup.calls.length, 0);
});

for (const status of [400, 401, 402, 403, 422, 432, 433]) {
  test(`HTTP ${status} stops fallback and does not expose body or key`, async () => {
    const t = transport(new Response('sensitive-body test-api-secret', { status }));
    const backup = createMockProvider({ id: 'backup' });
    await assert.rejects(createSearch({ provider: tavily({ apiKey: 'test-api-secret', fetch: t.fetch }), fallback: [backup] })
      .web.search({ query: 'q' }), error => {
        assert.equal(error.attempts.length, 1);
        assert.equal(error.status, status);
        assert.ok(!String(error).includes('sensitive-body'));
        assert.ok(!JSON.stringify(error).includes('test-api-secret'));
        assert.equal(error.cause, undefined);
        return true;
      });
    assert.equal(backup.calls.length, 0);
  });
}

test('unsupported filters in a fallback reject before the primary dispatches', async () => {
  const primary = createMockProvider();
  const t = transport(json({ web: { results: [] } }));
  const client = createSearch({ provider: primary, fallback: [brave({ apiKey: 'test', fetch: t.fetch })] });
  await assert.rejects(client.web.search({ query: 'q', includeDomains: ['example.com'] }), rejectsCode('unsupported_option', 0));
  await assert.rejects(client.web.search({ query: 'q', excludeDomains: ['example.com'] }), rejectsCode('unsupported_option', 0));
  assert.equal(primary.calls.length, 0);
  assert.equal(t.calls.length, 0);
});

test('chain-wide domain capacity is validated before dispatch', async () => {
  const primary = createMockProvider();
  const backup = tavily({ apiKey: 'test', fetch: async () => { throw new Error('must not run'); } });
  await assert.rejects(createSearch({ provider: primary, fallback: [backup] }).web.search({ query: 'q',
    excludeDomains: Array.from({ length: 151 }, (_, i) => `host${i}.org`) }), rejectsCode('unsupported_option', 0));
  assert.equal(primary.calls.length, 0);
});

for (const input of [{ query: '' }, { query: '  ' }, { query: 'q', limit: 0 }, { query: 'q', limit: 21 },
  { query: 'q', limit: 1.5 }, { query: 'q', limit: null }, { query: 'q', includeDomains: [] },
  { query: 'q', includeDomains: ['https://example.com'] }, { query: 'q', excludeDomains: ['example.com/path'] },
  { query: 'q', includeDomains: ['*.example.com'] }, { query: 'q', typo: true },
  { query: 'q', includeDomains: ['example.com'], excludeDomains: ['EXAMPLE.COM'] }]) {
  test(`invalid/unknown request fields never dispatch: ${JSON.stringify(input)}`, async () => {
    const provider = createMockProvider();
    await assert.rejects(createSearch({ provider }).web.search(input), rejectsCode('invalid_request', 0));
    assert.equal(provider.calls.length, 0);
  });
}

test('default limit is five and output is bounded even if provider over-delivers', async () => {
  const provider = exa({ apiKey: 'test', fetch: async () => json({ results: Array.from({ length: 9 }, () => hit) }) });
  const result = await createSearch({ provider }).web.search({ query: 'q' });
  assert.equal(result.results.length, 5);
});

test('one total deadline bounds two uncooperative attempts', async () => {
  let calls = 0;
  const pending = id => ({ id, capabilities: { domainFilters: false, maxIncludeDomains: 0, maxExcludeDomains: 0 },
    search: () => { calls++; return new Promise(() => {}); } });
  const start = performance.now();
  await assert.rejects(createSearch({ provider: pending('a'), fallback: [pending('b')], timeoutMs: 150, attemptTimeoutMs: 90 })
    .web.search({ query: 'q' }), error => {
      rejectsCode('timeout', 2)(error);
      assert.equal(error.attempts[0].code, 'attempt_timeout');
      return true;
    });
  assert.equal(calls, 2);
  assert.ok(performance.now() - start < 1500);
});

test('per-attempt timeout allows a successful explicit fallback', async () => {
  const t = transport(() => new Promise(() => {}));
  const fallback = createMockProvider({ id: 'backup' });
  const result = await createSearch({ provider: exa({ apiKey: 'test', fetch: t.fetch }), fallback: [fallback],
    timeoutMs: 500, attemptTimeoutMs: 40 }).web.search({ query: 'q' });
  assert.equal(result.attempts[0].code, 'attempt_timeout');
  assert.equal(t.calls[0].init.signal.aborted, true);
  assert.equal(result.provider, 'backup');
});

test('abort before request never dispatches and sanitizes reason', async () => {
  const controller = new AbortController();
  controller.abort('secret reason');
  const provider = createMockProvider();
  await assert.rejects(createSearch({ provider }).web.search({ query: 'q' }, { signal: controller.signal }), rejectsCode('aborted', 0));
  assert.equal(provider.calls.length, 0);
});

test('abort during ignored signal stops promptly without fallback/listener leaks', async () => {
  const controller = new AbortController();
  const t = transport(() => new Promise(() => {}));
  const backup = createMockProvider({ id: 'backup' });
  const promise = createSearch({ provider: exa({ apiKey: 'test', fetch: t.fetch }), fallback: [backup], timeoutMs: 10_000 })
    .web.search({ query: 'q' }, { signal: controller.signal });
  const timer = setTimeout(() => controller.abort('secret reason'), 20);
  try { await assert.rejects(promise, rejectsCode('aborted', 1)); }
  finally { clearTimeout(timer); }
  assert.equal(t.calls[0].init.signal.aborted, true);
  assert.equal(backup.calls.length, 0);
  assert.equal(getEventListeners(controller.signal, 'abort').length, 0);
});

test('successful calls release the caller abort listener', async () => {
  const controller = new AbortController();
  const client = createSearch({ provider: createMockProvider() });
  for (let i = 0; i < 15; i++) await client.web.search({ query: 'q' }, { signal: controller.signal });
  assert.equal(getEventListeners(controller.signal, 'abort').length, 0);
});

test('response JSON parsing is bounded by the same deadline', async () => {
  const provider = exa({ apiKey: 'test', fetch: async () => ({ ok: true, json: () => new Promise(() => {}) }) });
  await assert.rejects(createSearch({ provider, timeoutMs: 30 }).web.search({ query: 'q' }), rejectsCode('timeout', 1));
});

for (const value of [null, {}, { results: {} }, { results: [null] }, { results: [{ url: 'javascript:alert(1)' }] },
  { results: [{ url: 'https://user:password@example.com' }] }, { results: [{ url: 'https://example.com', title: 42 }] },
  { results: [{ url: 'https://example.com', highlights: [false] }] }, { results: [], costDollars: { total: -1 } }]) {
  test(`malformed payload fails safely without fallback: ${JSON.stringify(value)}`, async () => {
    const backup = createMockProvider({ id: 'backup' });
    await assert.rejects(createSearch({ provider: exa({ apiKey: 'test', fetch: async () => json(value) }), fallback: [backup] })
      .web.search({ query: 'q' }), rejectsCode('invalid_response', 1));
    assert.equal(backup.calls.length, 0);
  });
}

test('invalid JSON and transport exceptions never expose raw messages', async () => {
  for (const fetch of [async () => new Response('secret invalid json'), async () => { throw new Error('secret transport key'); }]) {
    await assert.rejects(createSearch({ provider: exa({ apiKey: 'test', fetch }) }).web.search({ query: 'q' }), error => {
      assert.ok(['invalid_response', 'network'].includes(error.code));
      assert.ok(!String(error).includes('secret'));
      return true;
    });
  }
});

test('HTTP-date Retry-After is parsed and surfaced, never slept', async () => {
  const future = new Date(Date.now() + 60_000).toUTCString();
  const t = transport(new Response('', { status: 503, headers: { 'Retry-After': future } }));
  await assert.rejects(createSearch({ provider: brave({ apiKey: 'test', fetch: t.fetch }) }).web.search({ query: 'q' }), error => {
    rejectsCode('unavailable', 1)(error);
    assert.ok(error.attempts[0].retryAfterMs > 58_000 && error.attempts[0].retryAfterMs <= 60_000);
    return true;
  });
});

test('mock queues are per instance and reserve concurrent outcomes in invocation order', async () => {
  const a = createMockProvider({ outcomes: [{ type: 'success', results: [{ url: 'https://example.com/first' }], delayMs: 30 },
    { type: 'success', results: [{ url: 'https://example.com/second' }], delayMs: 0 }] });
  const b = createMockProvider();
  const client = createSearch({ provider: a });
  const [first, second, other] = await Promise.all([client.web.search({ query: 'first' }), client.web.search({ query: 'second' }),
    createSearch({ provider: b }).web.search({ query: 'other', includeDomains: ['example.org'] })]);
  assert.equal(first.results[0].url, 'https://example.com/first');
  assert.equal(second.results[0].url, 'https://example.com/second');
  assert.equal(other.results.length, 1);
  assert.equal(other.results[0].url, 'https://example.org/reference');
  assert.deepEqual(a.calls.map(c => c.request.query), ['first', 'second']);
  assert.equal(b.calls.length, 1);
  first.results[0].title = 'mutated';
  await assert.rejects(client.web.search({ query: 'exhausted' }), rejectsCode('configuration', 1));
});

test('duplicate provider IDs and invalid configuration fail before dispatch', () => {
  const provider = createMockProvider();
  assert.throws(() => createSearch({ provider, fallback: [provider] }), rejectsCode('configuration', 0));
  for (const timeoutMs of [0, NaN, Infinity, -1, 2 ** 32]) {
    assert.throws(() => createSearch({ provider, timeoutMs }), rejectsCode('configuration', 0));
  }
  assert.throws(() => exa({ apiKey: '' }), rejectsCode('configuration', 0));
  assert.throws(() => tavily({ apiKey: 'a\r\nb' }), rejectsCode('configuration', 0));
  assert.throws(() => exa({ apiKey: 'bad\0key' }), rejectsCode('configuration', 0));
  assert.throws(() => brave({ apiKey: 'unicode-🔑' }), rejectsCode('configuration', 0));
  assert.equal(provider.calls.length, 0);
});

test('Brave distinguishes a valid response without web hits from a malformed payload', async () => {
  const search = body => createSearch({ provider: brave({ apiKey: 'test', fetch: async () => json(body) }) }).web.search({ query: 'q' });
  assert.deepEqual((await search({ query: { original: 'q' } })).results, []);
  for (const body of [{}, { query: {} }, { web: null }, { web: { results: 'bad' } },
    { web: { results: [{ url: hit.url, extra_snippets: [42] }] } }]) {
    await assert.rejects(search(body), rejectsCode('invalid_response', 1));
  }
});

test('Tavily rejects malformed consumed fields and preserves absent usage as unknown', async () => {
  const search = body => createSearch({ provider: tavily({ apiKey: 'test', fetch: async () => json(body) }) }).web.search({ query: 'q' });
  const unknown = await search({ results: [{ url: hit.url }] });
  assert.equal(unknown.usage, null);
  assert.equal(unknown.results[0].score, undefined);
  for (const body of [{ results: [{ url: hit.url, content: {} }] },
    { results: [{ url: hit.url, score: '0.5' }] }, { results: [], usage: { credits: '1' } }]) {
    await assert.rejects(search(body), rejectsCode('invalid_response', 1));
  }
});

test('cooperative mock cancellation releases its delay listener', async () => {
  const provider = createMockProvider({ delayMs: 10_000 });
  const controller = new AbortController();
  const result = createSearch({ provider }).web.search({ query: 'q' }, { signal: controller.signal });
  const timer = setTimeout(() => controller.abort(), 10);
  try { await assert.rejects(result, rejectsCode('aborted', 1)); }
  finally { clearTimeout(timer); }
  assert.equal(getEventListeners(provider.calls[0].signal, 'abort').length, 0);
  assert.equal(getEventListeners(controller.signal, 'abort').length, 0);
});

test('a failed attempt cannot mutate the normalized request used by fallback', async () => {
  const first = { id: 'first', capabilities: { domainFilters: true, maxIncludeDomains: 10, maxExcludeDomains: 10 },
    async search(request) {
      assert.throws(() => { request.includeDomains.push('changed.org'); }, TypeError);
      assert.throws(() => { request.query = 'changed'; }, TypeError);
      throw new SearchError('network');
    } };
  const second = createMockProvider({ id: 'second' });
  await createSearch({ provider: first, fallback: [second] }).web.search({ query: 'original', includeDomains: ['example.com'] });
  assert.equal(second.calls[0].request.query, 'original');
  assert.deepEqual(second.calls[0].request.includeDomains, ['example.com']);
});

test('a failed response stream is eligible for explicit network fallback', async () => {
  const fetch = async () => new Response(new ReadableStream({
    start(controller) { controller.error(new TypeError('secret transport failure')); },
  }));
  const backup = createMockProvider({ id: 'backup' });
  const response = await createSearch({ provider: exa({ apiKey: 'test', fetch }), fallback: [backup] }).web.search({ query: 'q' });
  assert.equal(response.attempts[0].code, 'network');
  assert.equal(response.provider, 'backup');
  assert.ok(!JSON.stringify(response).includes('secret'));
});

for (const status of [401, 429, 503]) {
  test(`stalled HTTP ${status} body cancellation preserves status and fallback policy`, async () => {
    let cancelled = false;
    const fetch = async () => new Response(new ReadableStream({
      cancel() { cancelled = true; return new Promise(() => {}); },
    }), { status });
    const backup = createMockProvider({ id: 'backup' });
    const promise = createSearch({ provider: exa({ apiKey: 'test', fetch }), fallback: [backup],
      timeoutMs: 500, attemptTimeoutMs: 40 }).web.search({ query: 'q' });
    if (status === 401) {
      await assert.rejects(promise, error => {
        rejectsCode('auth', 1)(error);
        assert.equal(error.status, status);
        return true;
      });
      assert.equal(backup.calls.length, 0);
    } else {
      const response = await promise;
      assert.equal(response.provider, 'backup');
      assert.equal(response.attempts[0].code, status === 429 ? 'rate_limit' : 'unavailable');
      assert.equal(response.attempts[0].status, status);
    }
    assert.equal(cancelled, true);
  });
}

for (const url of ['javascript:alert(1)', 'https:example.com/path', 'https:/example.com/path', 'https:///example.com/path',
  'https://example.com/\u00a0', 'https://example.com/\u2028', 'https://example.com\\other',
  'https://example.com/\u0085', 'https://user:secret@example.com/']) {
  test(`real adapters and mock reject unsafe or ambiguous result URLs: ${JSON.stringify(url)}`, async () => {
    const providers = [
      exa({ apiKey: 'test', fetch: async () => json({ results: [{ url }] }) }),
      tavily({ apiKey: 'test', fetch: async () => json({ results: [{ url }] }) }),
      brave({ apiKey: 'test', fetch: async () => json({ web: { results: [{ url }] } }) }),
      createMockProvider({ outcomes: [{ type: 'success', results: [{ url }] }] }),
    ];
    for (const provider of providers) {
      const backup = createMockProvider({ id: 'backup' });
      await assert.rejects(createSearch({ provider, fallback: [backup] }).web.search({ query: 'q' }),
        rejectsCode('invalid_response', 1));
      assert.equal(backup.calls.length, 0);
    }
  });
}

test('mock validates fixture content and replaces supplied provenance with its own attribution', async () => {
  const url = 'https://example.com/path?q=encoded%20space';
  const provider = createMockProvider({ id: 'fixture-provider', outcomes: [{ type: 'success', results: [{
    url, title: 'A title', highlights: ['a passage'], provenance: { provider: 'forged', sourceUrl: 'https://other.org' },
  }] }] });
  const response = await createSearch({ provider }).web.search({ query: 'q' });
  assert.equal(response.results[0].url, url);
  assert.equal(response.results[0].provenance.provider, 'fixture-provider');
  assert.equal(response.results[0].provenance.sourceUrl, url);
  assert.ok(Number.isFinite(Date.parse(response.results[0].provenance.retrievedAt)));
  const malformed = createMockProvider({ outcomes: [{ type: 'success', results: [{ url, highlights: [42] }] }] });
  await assert.rejects(createSearch({ provider: malformed }).web.search({ query: 'q' }), rejectsCode('invalid_response', 1));
});

for (const totalExpires of [false, true]) {
  test(`elapsed ${totalExpires ? 'total' : 'attempt'} budget takes precedence over a late provider failure`, async () => {
    const provider = { id: 'blocking', capabilities: { domainFilters: false, maxIncludeDomains: 0, maxExcludeDomains: 0 },
      async search() {
        const until = performance.now() + 25;
        while (performance.now() < until) { /* Simulate synchronous provider work. */ }
        throw new SearchError('network');
      } };
    const backup = createMockProvider({ id: 'backup' });
    const promise = createSearch({ provider, fallback: [backup], timeoutMs: totalExpires ? 10 : 500,
      attemptTimeoutMs: totalExpires ? 500 : 10 }).web.search({ query: 'q' });
    if (totalExpires) {
      await assert.rejects(promise, rejectsCode('timeout', 1));
      assert.equal(backup.calls.length, 0);
    } else {
      const response = await promise;
      assert.equal(response.attempts[0].code, 'attempt_timeout');
      assert.equal(response.provider, 'backup');
    }
  });
}

test('provider IDs must be strings rather than coercible values', () => {
  assert.throws(() => createSearch({ provider: { ...createMockProvider(), id: 123 } }), rejectsCode('configuration', 0));
});

test('sparse domain arrays reject before dispatch instead of forwarding undefined entries', async () => {
  const provider = createMockProvider();
  for (const key of ['includeDomains', 'excludeDomains']) {
    await assert.rejects(createSearch({ provider }).web.search({ query: 'q', [key]: Array(1) }),
      rejectsCode('invalid_request', 0));
  }
  assert.equal(provider.calls.length, 0);
});

test('sparse mock highlight arrays fail response validation', async () => {
  const provider = createMockProvider({ outcomes: [{ type: 'success', results: [{
    url: 'https://example.com', highlights: Array(1),
  }] }] });
  await assert.rejects(createSearch({ provider }).web.search({ query: 'q' }), rejectsCode('invalid_response', 1));
});
