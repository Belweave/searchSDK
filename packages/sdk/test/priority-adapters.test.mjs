import test from 'node:test';
import assert from 'node:assert/strict';
import { getEventListeners } from 'node:events';
import { createSearch, SearchError } from '@belweave/search-sdk';
import { context } from '@belweave/search-sdk/context';
import { tinyfish } from '@belweave/search-sdk/tinyfish';
import { createMockProvider } from '@belweave/search-sdk/testing';

const json = value => new Response(JSON.stringify(value));
const url = 'https://example.com/source';
const contextId = '3f1c2a6e-8b4d-4c1e-9f0a-2d7b5e6c8a91';
const code = (expected, attempts) => error => {
  assert.ok(error instanceof SearchError);
  assert.equal(error.code, expected);
  assert.equal(error.attempts.length, attempts);
  return true;
};
const capture = value => {
  const calls = [];
  return { calls, fetch: async (input, init) => { calls.push({ url: String(input), init }); return json(value); } };
};

test('Context sends documented search fields and maps description, credits, request ID and partial warning', async () => {
  const t = capture({ results: [{ url, title: 'Title', description: '<b>native description</b>', relevance: 'high',
    provenance: { provider: 'forged' }, score: 99, highlights: { code: 'NOT_REQUESTED' } }],
    request_id: contextId, key_metadata: { credits_consumed: 2, credits_remaining: 42 }, partial: true });
  const response = await createSearch({ provider: context({ apiKey: 'context-fixture-key', fetch: t.fetch }) }).web.search({
    query: '  a & b  ', limit: 3, includeDomains: ['EXAMPLE.COM', 'example.com', 'docs.example.org'], excludeDomains: ['other.org'] });
  assert.equal(t.calls.length, 1);
  const { url: endpoint, init } = t.calls[0];
  assert.equal(endpoint, 'https://api.context.dev/v1/web/search');
  assert.equal(init.method, 'POST');
  assert.equal(init.redirect, 'error');
  assert.equal(init.headers.Authorization, 'Bearer context-fixture-key');
  assert.equal(init.headers['Content-Type'], 'application/json');
  assert.ok(init.signal instanceof AbortSignal);
  assert.deepEqual(JSON.parse(init.body), { query: '  a & b  ', numResults: 10,
    includeDomains: ['example.com', 'docs.example.org'], excludeDomains: ['other.org'] });
  assert.equal(response.provider, 'context');
  assert.deepEqual(response.usage, { unit: 'credits', value: 2 });
  assert.deepEqual(response.warnings, [{ code: 'provider_warning', provider: 'context' }]);
  assert.equal(response.results[0].snippet, '<b>native description</b>');
  assert.equal(response.results[0].score, undefined);
  assert.equal(response.results[0].highlights, undefined);
  assert.deepEqual(response.results[0].provenance, { provider: 'context', sourceUrl: url, requestId: contextId,
    retrievedAt: response.results[0].provenance.retrievedAt });
  assert.ok(Number.isFinite(Date.parse(response.results[0].provenance.retrievedAt)));
});

for (const limit of [1, 5, 10, 11, 20]) {
  test(`Context safely requests at least ten results and caps output for SDK limit ${limit}`, async () => {
    const t = capture({ results: Array.from({ length: 25 }, (_, i) => ({ url: `${url}/${i}` })) });
    const response = await createSearch({ provider: context({ apiKey: 'fixture', fetch: t.fetch }) }).web.search({ query: 'q', limit });
    assert.deepEqual(JSON.parse(t.calls[0].init.body), { query: 'q', numResults: Math.max(10, limit) });
    assert.equal(response.results.length, limit);
    assert.equal(response.results.at(-1).url, `${url}/${limit - 1}`);
    assert.equal(response.usage, null);
    assert.deepEqual(response.warnings, []);
  });
}

test('TinyFish uses one GET search page, native CSV filters, and no invented count or usage', async () => {
  const t = capture({ query: 'q', page: 0, total_results: 2, results: [
    { url, title: 'A title', snippet: 'Search snippet', position: 1, site_name: 'example.com', score: 0.9 },
    { url: 'https://other.org/a', snippet: 'Second' }], request_id: 'unmapped', usage: { credits: 0 } });
  const response = await createSearch({ provider: tinyfish({ apiKey: 'tinyfish-fixture-key', fetch: t.fetch }) }).web.search({
    query: 'a & b + 日本語 site:unchanged.org', limit: 20,
    includeDomains: ['EXAMPLE.COM', 'example.com', 'docs.example.org'], excludeDomains: ['other.org', 'another.org'] });
  assert.equal(t.calls.length, 1);
  const { init } = t.calls[0];
  const endpoint = new URL(t.calls[0].url);
  assert.equal(endpoint.origin + endpoint.pathname, 'https://api.search.tinyfish.ai/');
  assert.deepEqual(Object.fromEntries(endpoint.searchParams), { query: 'a & b + 日本語 site:unchanged.org',
    domain_type: 'web', page: '0', include_domains: 'example.com,docs.example.org', exclude_domains: 'other.org,another.org' });
  assert.equal(init.method, 'GET');
  assert.equal(init.headers['X-API-Key'], 'tinyfish-fixture-key');
  assert.equal(init.headers.Accept, 'application/json');
  assert.equal(init.body, undefined);
  assert.equal(init.redirect, 'error');
  assert.ok(init.signal instanceof AbortSignal);
  assert.equal(response.results.length, 2); // No synthetic padding or local domain filtering.
  assert.equal(response.results[0].snippet, 'Search snippet');
  assert.equal(response.results[0].score, undefined); // Position is not a relevance score.
  assert.equal(response.results[0].provenance.provider, 'tinyfish');
  assert.equal(response.results[0].provenance.sourceUrl, url);
  assert.equal(response.results[0].provenance.requestId, undefined);
  assert.ok(Number.isFinite(Date.parse(response.results[0].provenance.retrievedAt)));
  assert.equal(response.usage, null);
});

test('TinyFish does not interpret provider total_results as a count guarantee or pagination signal', async () => {
  // The official examples show two rows with total_results: 10. Do not impose
  // an undocumented equality invariant or fetch more paid pages to fill limit.
  const t = capture({ query: 'q', page: 0, total_results: 10,
    results: [{ url, title: 'First' }, { url: `${url}/second`, title: 'Second' }] });
  const backup = createMockProvider({ id: 'backup' });
  const response = await createSearch({ provider: tinyfish({ apiKey: 'fixture', fetch: t.fetch }), fallback: [backup] })
    .web.search({ query: 'q', limit: 20 });
  assert.equal(t.calls.length, 1);
  assert.equal(response.results.length, 2);
  assert.equal(response.attempts.length, 1);
  assert.equal(backup.calls.length, 0);
  assert.equal(response.usage, null);
  assert.deepEqual(response.warnings, []);
  assert.equal(Object.hasOwn(response, 'total_results'), false);
  assert.equal(Object.hasOwn(response, 'page'), false);
});

test('Context retains usable search rows when optional content extraction reports documented failures', async () => {
  const failures = ['NOT_REQUESTED', 'TIMEOUT', 'CONTENT_TOO_LARGE', 'WEBSITE_ACCESS_ERROR', 'WEBSITE_BLOCKED', 'ERROR'];
  const t = capture({ query: 'q', request_id: contextId, partial: false,
    cache_metadata: { status: 'miss' }, key_metadata: { credits_consumed: 1 },
    results: failures.map((failure, i) => ({ url: `${url}/${i}`, title: failure, description: 'Usable search description',
      markdown: { code: failure, markdown: null, finalDOMState: 'still-loading' },
      highlights: { code: failure, highlights: null } })) });
  const backup = createMockProvider({ id: 'backup' });
  const response = await createSearch({ provider: context({ apiKey: 'fixture', fetch: t.fetch }), fallback: [backup] })
    .web.search({ query: 'q', limit: 10 });
  assert.equal(response.results.length, failures.length);
  assert.deepEqual(response.results.map(row => row.title), failures);
  assert.ok(response.results.every(row => row.snippet === 'Usable search description' && row.highlights === undefined));
  assert.deepEqual(response.usage, { unit: 'credits', value: 1 });
  assert.deepEqual(response.warnings, []);
  assert.equal(backup.calls.length, 0);
  const body = JSON.parse(t.calls[0].init.body);
  assert.equal(Object.hasOwn(body, 'markdownOptions'), false);
  assert.equal(Object.hasOwn(body, 'highlightsOptions'), false);
  assert.equal(Object.hasOwn(body, 'timeoutOpts'), false);
});

test('Context empty partial success warns without fallback or leaking provider messages', async () => {
  const t = capture({ results: [], partial: true, request_id: contextId, key_metadata: { credits_consumed: 0 },
    message: 'sensitive-provider-message', error_data: { detail: 'sensitive-provider-message' } });
  const backup = createMockProvider({ id: 'backup' });
  const response = await createSearch({ provider: context({ apiKey: 'fixture', fetch: t.fetch }), fallback: [backup] })
    .web.search({ query: 'q' });
  assert.deepEqual(response.results, []);
  assert.deepEqual(response.warnings, [{ code: 'provider_warning', provider: 'context' }]);
  assert.deepEqual(response.usage, { unit: 'credits', value: 0 });
  assert.equal(response.attempts.length, 1);
  assert.equal(backup.calls.length, 0);
  assert.ok(!JSON.stringify(response).includes('sensitive'));
});

for (const factory of [context, tinyfish]) {
  const name = factory.name;
  test(`${name} enforces both domain capacities across the entire chain before dispatch`, async () => {
    const t = capture({ results: [] });
    const provider = factory({ apiKey: 'fixture', fetch: t.fetch });
    assert.equal(provider.capabilities.domainFilters, true);
    assert.equal(provider.capabilities.maxIncludeDomains, 100);
    assert.equal(provider.capabilities.maxExcludeDomains, 100);
    for (const field of ['includeDomains', 'excludeDomains']) {
      const primary = createMockProvider();
      await assert.rejects(createSearch({ provider: primary, fallback: [provider] }).web.search({ query: 'q',
        [field]: Array.from({ length: 101 }, (_, i) => `site${i}.org`) }), code('unsupported_option', 0));
      assert.equal(primary.calls.length, 0);
    }
    assert.equal(t.calls.length, 0);
    await createSearch({ provider }).web.search({ query: 'q',
      includeDomains: Array.from({ length: 100 }, (_, i) => `include${i}.org`),
      excludeDomains: Array.from({ length: 100 }, (_, i) => `exclude${i}.org`) });
    assert.equal(t.calls.length, 1);
  });

  test(`${name} rejects invalid request and configuration fields without dispatch`, async () => {
    const t = capture({ results: [] });
    for (const options of [{ apiKey: '' }, { apiKey: 'bad\r\nkey' }, { apiKey: 'fixture', endpoint: 'https://other.org' },
      { apiKey: 'fixture', fetch: 42 }]) assert.throws(() => factory(options), code('configuration', 0));
    const client = createSearch({ provider: factory({ apiKey: 'fixture', fetch: t.fetch }) });
    for (const request of [{ query: '' }, { query: 'q', limit: 21 }, { query: 'q', page: 1 }, { query: 'q', purpose: 'unsupported' },
      { query: 'q', includeDomains: ['https://example.com'] }, { query: 'q', excludeDomains: ['*.example.com'] },
      { query: 'q', includeDomains: ['example.com'], excludeDomains: ['EXAMPLE.COM'] }]) {
      await assert.rejects(client.web.search(request), code('invalid_request', 0));
    }
    assert.equal(t.calls.length, 0);
  });

  test(`${name} validates all consumed rows before truncating and keeps malformed responses terminal`, async () => {
    const snippet = name === 'context' ? 'description' : 'snippet';
    for (const payload of [null, [], {}, { results: null }, { results: {} }, { results: [null] },
      { results: [{ url, title: 42 }] }, { results: [{ url, [snippet]: {} }] },
      { results: [{ url: 'javascript:alert(1)' }] }, { results: [{ url: 'https://user:secret@example.com' }] },
      { results: [{ url: 'https://example.com\\other' }] }, { results: [{ url: 'https:///example.com' }] },
      { results: [{ url: 'https://example.com/\u0085' }] }, { results: [{ url }, { url, [snippet]: false }] }]) {
      const backup = createMockProvider({ id: 'backup' });
      await assert.rejects(createSearch({ provider: factory({ apiKey: 'fixture', fetch: async () => json(payload) }), fallback: [backup] })
        .web.search({ query: 'q', limit: 1 }), code('invalid_response', 1));
      assert.equal(backup.calls.length, 0);
    }
  });

  test(`${name} preserves empty success, unknown usage and output limits without retrying`, async () => {
    for (const rows of [[], Array.from({ length: 12 }, (_, i) => ({ url: `${url}/${i}` }))]) {
      const t = capture({ results: rows });
      const backup = createMockProvider({ id: 'backup' });
      const response = await createSearch({ provider: factory({ apiKey: 'fixture', fetch: t.fetch }), fallback: [backup] })
        .web.search({ query: 'q' });
      assert.equal(response.results.length, Math.min(5, rows.length));
      assert.equal(response.usage, null);
      assert.equal(response.attempts.length, 1);
      assert.deepEqual(response.warnings, []);
      assert.equal(backup.calls.length, 0);
      assert.equal(t.calls.length, 1);
    }
  });

  for (const status of [400, 401, 402, 403, 408, 429, 500, 503]) {
    test(`${name} HTTP ${status} follows shared fallback and secret redaction rules`, async () => {
      let calls = 0;
      const provider = factory({ apiKey: 'sensitive-key', fetch: async () => {
        calls++;
        return new Response('sensitive-body sensitive-key', { status, headers: { 'Retry-After': '2' } });
      } });
      const backup = createMockProvider({ id: 'backup' });
      const promise = createSearch({ provider, fallback: [backup] }).web.search({ query: 'q' });
      if (status === 429 || status === 408 || status >= 500) {
        const response = await promise;
        assert.equal(response.provider, 'backup');
        assert.equal(response.attempts[0].code, status === 429 ? 'rate_limit' : 'unavailable');
        assert.equal(response.attempts[0].status, status);
        assert.equal(response.attempts[0].retryAfterMs, 2000);
        assert.deepEqual(response.warnings, [{ code: 'fallback_used', provider: 'backup' }]);
      } else {
        await assert.rejects(promise, error => {
          code(status === 400 ? 'provider_error' : 'auth', 1)(error);
          assert.equal(error.status, status);
          assert.ok(!JSON.stringify(error).includes('sensitive'));
          assert.ok(!String(error).includes('sensitive'));
          return true;
        });
        assert.equal(backup.calls.length, 0);
      }
      assert.equal(calls, 1);
    });
  }

  test(`${name} transport failure falls back while invalid JSON is terminal`, async () => {
    for (const malformedJson of [true, false]) {
      const backup = createMockProvider({ id: 'backup' });
      const fetch = async () => {
        if (malformedJson) return new Response('sensitive-invalid-json');
        throw new Error('sensitive-network-message');
      };
      const promise = createSearch({ provider: factory({ apiKey: 'fixture', fetch }), fallback: [backup] }).web.search({ query: 'q' });
      if (malformedJson) {
        await assert.rejects(promise, code('invalid_response', 1));
        assert.equal(backup.calls.length, 0);
      } else {
        const response = await promise;
        assert.equal(response.attempts[0].code, 'network');
        assert.equal(response.provider, 'backup');
        assert.ok(!JSON.stringify(response).includes('sensitive'));
      }
    }
  });

  test(`${name} abort and deadline bound ignored transports and JSON parsing`, async () => {
    const controller = new AbortController();
    let attemptSignal;
    const backup = createMockProvider({ id: 'backup' });
    const provider = factory({ apiKey: 'fixture', fetch: async (_url, init) => {
      attemptSignal = init.signal;
      controller.abort('sensitive-reason');
      return new Promise(() => {});
    } });
    await assert.rejects(createSearch({ provider, fallback: [backup] }).web.search({ query: 'q' }, { signal: controller.signal }), code('aborted', 1));
    assert.equal(attemptSignal.aborted, true);
    assert.equal(getEventListeners(controller.signal, 'abort').length, 0);
    assert.equal(backup.calls.length, 0);
    const pending = factory({ apiKey: 'fixture', fetch: async (_url, init) => {
      attemptSignal = init.signal;
      return { ok: true, json: () => new Promise(() => {}) };
    } });
    await assert.rejects(createSearch({ provider: pending, timeoutMs: 30 }).web.search({ query: 'q' }), code('timeout', 1));
    assert.equal(attemptSignal.aborted, true);
    const response = await createSearch({ provider: pending, fallback: [backup], timeoutMs: 1000, attemptTimeoutMs: 30 })
      .web.search({ query: 'q' });
    assert.equal(response.attempts[0].code, 'attempt_timeout');
    assert.equal(response.provider, 'backup');
  });
}

test('Context consumed metadata validation preserves absent/zero usage and rejects malformed fields', async () => {
  for (const metadata of [{ request_id: 'bad id' }, { request_id: 42 }, { key_metadata: [] },
    { key_metadata: { credits_consumed: '1' } }, { key_metadata: { credits_consumed: -1 } },
    { partial: null }, { partial: 'false' }]) {
    await assert.rejects(createSearch({ provider: context({ apiKey: 'fixture', fetch: async () => json({ results: [], ...metadata }) }) })
      .web.search({ query: 'q' }), code('invalid_response', 1));
  }
  for (const key_metadata of [undefined, null, {}, { credits_remaining: 99 }, { credits_consumed: 0 }]) {
    const response = await createSearch({ provider: context({ apiKey: 'fixture', fetch: async () => json({ results: [], key_metadata, partial: false }) }) })
      .web.search({ query: 'q' });
    assert.deepEqual(response.usage, key_metadata?.credits_consumed === 0 ? { unit: 'credits', value: 0 } : null);
    assert.deepEqual(response.warnings, []);
  }
});

test('Context query ceiling is preflighted even as a fallback, without affecting other providers', async () => {
  const primary = createMockProvider();
  const t = capture({ results: [] });
  const provider = context({ apiKey: 'fixture', fetch: t.fetch });
  await assert.rejects(createSearch({ provider: primary, fallback: [provider] }).web.search({ query: 'x'.repeat(501) }), code('unsupported_option', 0));
  assert.equal(primary.calls.length, 0);
  assert.equal(t.calls.length, 0);
  await createSearch({ provider }).web.search({ query: 'x'.repeat(500) });
  assert.equal(t.calls.length, 1);
  await createSearch({ provider: primary }).web.search({ query: 'x'.repeat(501) });
  assert.equal(primary.calls.length, 1);
  for (const maxQueryLength of [0, -1, 1.5, NaN, Infinity, '500', null]) {
    assert.throws(() => createSearch({ provider: { ...primary, capabilities: { ...primary.capabilities, maxQueryLength } } }), code('configuration', 0));
  }
});

test('Context can explicitly fall back to TinyFish with filters and winning-provider provenance', async () => {
  const t = capture({ results: [{ url, snippet: 'Backup snippet' }] });
  const response = await createSearch({
    provider: context({ apiKey: 'fixture', fetch: async () => new Response('', { status: 503 }) }),
    fallback: [tinyfish({ apiKey: 'fixture', fetch: t.fetch })],
  }).web.search({ query: 'q', includeDomains: ['example.com'], excludeDomains: ['excluded.org'] });
  assert.deepEqual(response.attempts.map(attempt => attempt.provider), ['context', 'tinyfish']);
  assert.equal(response.results[0].provenance.provider, 'tinyfish');
  assert.equal(response.usage, null);
  assert.deepEqual(response.warnings, [{ code: 'fallback_used', provider: 'tinyfish' }]);
  assert.equal(new URL(t.calls[0].url).searchParams.get('include_domains'), 'example.com');
  assert.equal(new URL(t.calls[0].url).searchParams.get('exclude_domains'), 'excluded.org');
});
