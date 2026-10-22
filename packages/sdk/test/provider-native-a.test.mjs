import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createExaClient, exaOperations } from '../dist/native-exa.js';
import { createTavilyClient, tavilyOperations } from '../dist/native-tavily.js';
import { createBraveClient, braveOperations } from '../dist/native-brave.js';
import { createContextClient, contextLogoUrl, contextOperations } from '../dist/native-context.js';
import { createTinyfishClient, tinyfishOperations } from '../dist/native-tinyfish.js';

// These are independent wire examples from the cited official guides, not
// expected values loaded from the generator's endpoint catalog. No live calls.
const json = (value, status = 200) => new Response(JSON.stringify(value), { status,
  headers: { 'Content-Type': 'application/json', 'x-request-id': 'fixture-request' } });
const sse = (text) => new Response(text, { headers: { 'Content-Type': 'text/event-stream' } });
function capture(response = () => json({})) {
  const calls = [];
  return { calls, fetch: async (input, init) => {
    calls.push({ url: new URL(String(input)), method: init.method, headers: new Headers(init.headers), body: init.body });
    return response(calls.at(-1), calls.length);
  } };
}
const body = call => JSON.parse(typeof call.body === 'string' ? call.body : new TextDecoder().decode(call.body));
const errorCode = expected => error => { assert.equal(error.code, expected); return true; };

test('native factories expose discoverable named operations across every inventoried family', () => {
  const examples = [
    [createExaClient, 74, ['search', 'getContents', 'answerStream', 'createAgentRun', 'createBatch', 'createWebset', 'listApiKeys']],
    [createTavilyClient, 16, ['search', 'extract', 'crawl', 'map', 'researchStream', 'logs', 'generateKeys', 'paidSearch']],
    [createBraveClient, 17, ['search', 'searchPost', 'llmContext', 'llmContextPost', 'news', 'images', 'places', 'answersStream']],
    [createContextClient, 50, ['search', 'scrape', 'parse', 'retrieveBrand', 'searchCompanies', 'enrichPerson', 'submitBatch', 'createMonitor', 'logoUrl']],
    [createTinyfishClient, 47, ['search', 'fetchUrls', 'runSse', 'runAsync', 'runBatch', 'createBrowserSession', 'runResearch', 'createMonitor', 'connectVault']],
  ];
  for (const [factory, count, methods] of examples) {
    const client = factory({ apiKey: 'fixture', fetch: async () => { throw new Error('must not fetch'); } });
    assert.equal(Object.values(client).filter(value => typeof value === 'function').length, count, factory.name);
    assert.ok(Object.isFrozen(client.operations));
    assert.equal(Object.keys(client.operations).length, count - (factory === createContextClient ? 1 : 0));
    for (const descriptor of Object.values(client.operations)) assert.ok(Object.isFrozen(descriptor));
    assert.equal(Object.hasOwn(client.operations, 'logoUrl'), false);
    assert.ok(Object.isFrozen(client));
    for (const name of methods) assert.equal(typeof client[name], 'function', `${factory.name}.${name}`);
  }
});

test('Exa native search preserves rich options, native fields and metadata', async () => {
  const payload = { requestId: 'native-id', results: [{ id: 'page', url: 'https://example.com', text: 'Full text',
    highlights: ['Relevant text'], extra: { nested: true } }], output: { answer: 42 }, costDollars: { total: 0.1 }, notices: [] };
  const t = capture(() => json(payload));
  const request = { query: 'q', type: 'deep', numResults: 35, category: 'research paper', includeDomains: ['example.com'],
    contents: { text: { maxCharacters: 1200 }, highlights: { query: 'q' }, summary: { query: 'facts' } },
    startPublishedDate: '2026-01-01T00:00:00Z', endPublishedDate: '2026-10-01T00:00:00Z', userLocation: 'US' };
  const result = await createExaClient({ apiKey: 'fixture', fetch: t.fetch }).search({ body: request });
  assert.equal(t.calls[0].url.href, 'https://api.exa.ai/search');
  assert.equal(t.calls[0].method, 'POST');
  assert.equal(t.calls[0].headers.get('x-api-key'), 'fixture');
  assert.deepEqual(body(t.calls[0]), { ...request, stream: false });
  assert.deepEqual(result.data, payload);
  assert.equal(result.metadata.requestId, 'fixture-request');
  assert.equal(result.metadata.provider, 'exa');
  assert.equal(t.calls.length, 1);
});

test('Context native search leaves page-level failures, partial results and request controls intact', async () => {
  const payload = { query: 'q', request_id: 'id', partial: true, results: [{ url: 'https://example.com',
    markdown: { code: 'TIMEOUT', markdown: null }, highlights: { code: 'OK', highlights: ['text'] } }],
    key_metadata: { credits_consumed: 2 } };
  const t = capture(() => json(payload));
  const request = { query: 'q', numResults: 30, country: 'us', languages: ['en'],
    markdownOptions: { enabled: true, includeLinks: true }, highlightsOptions: { enabled: true, maxCharacters: 1200 },
    timeoutOpts: { milliseconds: 15000, behavior: 'return-partial' } };
  const result = await createContextClient({ apiKey: 'fixture', fetch: t.fetch }).search({ body: request, timeoutMs: 20000 });
  assert.equal(t.calls[0].url.href, 'https://api.context.dev/v1/web/search');
  assert.equal(t.calls[0].headers.get('Authorization'), 'Bearer fixture');
  assert.deepEqual(body(t.calls[0]), request);
  assert.deepEqual(result.data, payload);
});

test('TinyFish native search exposes news/research, purpose, date, fetch and pagination controls without auto-pagination', async () => {
  const t = capture(() => json({ page: 3, total_results: 10, results: [{ title: 'Paper', citation_count: 7, fetch_error: 'timeout' }] }));
  const query = { query: 'q', purpose: 'survey literature', domain_type: 'research_paper', pub_year_min: 2024,
    pub_year_max: 2026, page: 3, include_domains: 'arxiv.org,example.com', fetch: '{"format":"markdown"}', include_thumbnail: 'true' };
  const result = await createTinyfishClient({ apiKey: 'fixture', fetch: t.fetch }).search({ query });
  assert.equal(t.calls[0].url.origin, 'https://api.search.tinyfish.ai');
  assert.equal(t.calls[0].url.pathname, '/');
  assert.equal(t.calls[0].method, 'GET');
  assert.equal(t.calls[0].headers.get('X-API-Key'), 'fixture');
  assert.deepEqual(Object.fromEntries(t.calls[0].url.searchParams), Object.fromEntries(Object.entries(query).map(([k, v]) => [k, String(v)])));
  assert.equal(result.data.results[0].citation_count, 7);
  assert.equal(t.calls.length, 1);
});

test('Brave GET and POST searches retain their distinct query/body contracts and location headers', async () => {
  const payload = { type: 'search', web: { results: [{ title: 'Result', url: 'https://example.com' }] }, locations: { results: [] } };
  const t = capture(() => json(payload));
  const client = createBraveClient({ apiKey: 'fixture', fetch: t.fetch });
  const result = await client.search({ query: { q: 'q', count: 12, extra_snippets: true, result_filter: ['web', 'news'], goggles: ['https://example.com/one', 'https://example.com/two'] },
    headers: { 'x-loc-city': 'Boston', 'api-version': '2026-10-01' } });
  assert.equal(t.calls[0].url.pathname, '/res/v1/web/search');
  assert.equal(t.calls[0].headers.get('x-subscription-token'), 'fixture');
  assert.equal(t.calls[0].headers.get('x-loc-city'), 'Boston');
  assert.deepEqual(t.calls[0].url.searchParams.getAll('goggles'), ['https://example.com/one', 'https://example.com/two']);
  assert.equal(t.calls[0].url.searchParams.get('extra_snippets'), 'true');
  assert.deepEqual(t.calls[0].url.searchParams.getAll('result_filter'), ['web,news']);
  assert.deepEqual(result.data, payload);
  const request = { q: 'q', count: 12, extra_snippets: true, result_filter: ['web', 'news'] };
  await client.searchPost({ body: request });
  assert.equal(t.calls[1].method, 'POST');
  assert.equal(t.calls[1].url.search, '');
  assert.deepEqual(body(t.calls[1]), request);
});

test('Tavily native search preserves native defaults/usage controls and attribution headers', async () => {
  const t = capture(() => json({ results: [], answer: 'A', images: [{ url: 'https://example.com/image' }], usage: { credits: 2 } }));
  const request = { query: 'q', search_depth: 'advanced', chunks_per_source: 3, max_results: 20, topic: 'news', include_answer: 'advanced',
    include_raw_content: 'markdown', include_usage: true, include_images: true, auto_parameters: true };
  const result = await createTavilyClient({ apiKey: 'fixture', fetch: t.fetch }).search({ body: request,
    headers: { 'X-Project-ID': 'project', 'X-Session-Id': 'session', 'X-Human-Id': 'opaque' } });
  assert.equal(t.calls[0].url.href, 'https://api.tavily.com/search');
  assert.equal(t.calls[0].headers.get('Authorization'), 'Bearer fixture');
  assert.deepEqual(body(t.calls[0]), request);
  assert.equal(result.data.answer, 'A');
  assert.equal(t.calls[0].headers.get('X-Project-ID'), 'project');
});

test('Context scrape output selectors and raw document parsing use separate JSON and byte contracts', async () => {
  const t = capture(() => json({ request_id: 'id', markdown: 'Parsed text', success: true }));
  const client = createContextClient({ apiKey: 'fixture', fetch: t.fetch });
  const request = { url: 'https://example.com', formats: { markdown: true, json: true, screenshot: true },
    markdownParams: { includeLinks: false }, jsonParams: { schema: { type: 'object', properties: { title: { type: 'string' } } } },
    sharedParams: { waitFor: 'main', mainContentOnly: true }, timeoutOpts: { milliseconds: 90000, behavior: 'return-partial' } };
  await client.scrape({ body: request });
  assert.deepEqual(body(t.calls[0]), request);
  const bytes = new Uint8Array([37, 80, 68, 70]);
  await client.parse({ rawBody: bytes, query: { extension: 'pdf', pdf: { start: 2, end: 4 }, tags: ['import', 'pdf'], ocr: true },
    headers: { 'Content-Type': 'application/pdf' } });
  const call = t.calls[1];
  assert.equal(call.url.pathname, '/v1/parse');
  assert.equal(call.url.searchParams.get('pdf[start]'), '2');
  assert.equal(call.url.searchParams.get('pdf[end]'), '4');
  assert.equal(call.url.searchParams.get('tags'), 'import,pdf');
  assert.equal(call.headers.get('Content-Type'), 'application/pdf');
  assert.deepEqual(new Uint8Array(call.body), bytes);
});

test('Context map and search-brand GETs serialize objects and arrays as documented by the official SDK', async () => {
  const t = capture();
  const c = createContextClient({ apiKey: 'fixture', fetch: t.fetch });
  await c.map({ query: { domain: 'example.com', headers: { 'X-Test': 'value' }, timeoutOpts: { milliseconds: 15000, behavior: 'return-partial' }, tags: ['a', 'b'] } });
  assert.equal(t.calls[0].url.pathname, '/v1/web/urls');
  assert.equal(t.calls[0].url.searchParams.get('headers[X-Test]'), 'value');
  assert.equal(t.calls[0].url.searchParams.get('timeoutOpts[milliseconds]'), '15000');
  assert.equal(t.calls[0].url.searchParams.get('timeoutOpts[behavior]'), 'return-partial');
  assert.equal(t.calls[0].url.searchParams.get('tags'), 'a,b');
  await c.searchBrands({ query: { query: 'stripe', queryBy: ['name', 'domain'], autocomplete: false } });
  assert.equal(t.calls[1].url.pathname, '/v1/brand/search');
  assert.equal(t.calls[1].url.searchParams.get('queryBy'), 'name,domain');
});

test('Context non-web API families send their own exact paths and native bodies', async () => {
  const t = capture();
  const c = createContextClient({ apiKey: 'fixture', fetch: t.fetch });
  for (const [name, path, request] of [
    ['retrieveBrand', '/v1/brand/retrieve', { type: 'by_domain', domain: 'example.com', maxAgeMs: 0 }],
    ['enrichPerson', '/v1/people/enrich', { email: 'person@example.com' }],
    ['searchCompanies', '/v1/company/search', { query: 'company' }],
    ['searchNews', '/v1/news/search', { searchBy: { type: 'natural_language', query: 'news' }, limit: 10 }],
    ['answers', '/v1/web/answers', { task: 'Question', json_format: { answer: '' } }],
    ['prefetch', '/v1/utility/prefetch', { type: 'brand', identifier: { domain: 'example.com' } }],
  ]) {
    await c[name]({ body: request });
    const call = t.calls.at(-1);
    assert.equal(call.url.pathname, path);
    assert.equal(call.method, 'POST');
    assert.deepEqual(body(call), request);
  }
});

test('Context asynchronous batches and monitor management preserve IDs, idempotency headers and explicit lifecycle calls', async () => {
  const t = capture(() => json({ id: 'batch_fixture', status: 'queued' }));
  const c = createContextClient({ apiKey: 'fixture', fetch: t.fetch });
  const request = { input: { mode: 'scrape', data: { urls: ['https://example.com'], formats: { markdown: true } } }, tags: ['import'] };
  await c.submitBatch({ body: request, headers: { 'Idempotency-Key': 'fixture-submit' } });
  assert.equal(t.calls[0].url.pathname, '/v1/batch/submit');
  assert.equal(t.calls[0].headers.get('Idempotency-Key'), 'fixture-submit');
  assert.deepEqual(body(t.calls[0]), request);
  await c.getBatchResults({ path: { batch_id: 'batch/with slash' }, query: { limit: 20, cursor: 'next' } });
  assert.equal(t.calls[1].url.pathname, '/v1/batch/batch%2Fwith%20slash/results');
  assert.equal(t.calls[1].url.searchParams.get('cursor'), 'next');
  await c.cancelBatch({ path: { batch_id: 'batch_fixture' } });
  assert.equal(t.calls[2].url.pathname, '/v1/batch/batch_fixture/cancel');
  assert.equal(t.calls[2].method, 'POST');
  await c.updateMonitor({ path: { monitor_id: 'mon_fixture' }, body: { status: 'paused' } });
  assert.equal(t.calls[3].method, 'PATCH');
  assert.equal(t.calls[3].url.pathname, '/v1/monitors/mon_fixture');
  await c.rotateMonitorWebhookSecret({ path: { monitor_id: 'mon_fixture' } });
  assert.equal(t.calls[4].url.pathname, '/v1/monitors/mon_fixture/webhook/rotate-secret');
  assert.equal(t.calls.length, 5);
});

test('TinyFish automation sync, async and bulk remain distinct, with no implicit polling', async () => {
  const t = capture(() => json({ run_id: 'run_fixture', status: 'PENDING' }));
  const c = createTinyfishClient({ apiKey: 'fixture', fetch: t.fetch });
  const request = { url: 'https://example.com', goal: 'Extract pricing', browser_profile: 'stealth',
    agent_config: { mode: 'strict', max_steps: 20, max_duration_seconds: 300 }, capture_config: { html: true },
    output_schema: { type: 'object', properties: { price: { type: 'number' } } } };
  await c.run({ body: request });
  await c.runAsync({ body: request });
  await c.runBatch({ body: { runs: [request] } });
  assert.deepEqual(t.calls.map(x => x.url.pathname), ['/v1/automation/run', '/v1/automation/run-async', '/v1/automation/run-batch']);
  assert.ok(t.calls.every(x => x.url.origin === 'https://agent.tinyfish.ai' && x.method === 'POST'));
  assert.deepEqual(body(t.calls[0]), request);
  assert.deepEqual(body(t.calls[1]), request);
  assert.deepEqual(body(t.calls[2]), { runs: [request] });
});

test('TinyFish profile setup, upload and domain removal preserve state fields and encoded paths', async () => {
  const t = capture(() => json({ session_id: 'setup', saved: true }));
  const c = createTinyfishClient({ apiKey: 'fixture', fetch: t.fetch });
  await c.createBrowserContextProfileSetupSession({ path: { profileId: 'prof_1' }, body: { url: 'https://example.com' } });
  await c.saveBrowserContextProfileSetupSession({ path: { profileId: 'prof_1' }, body: { session_id: 'setup' } });
  const upload = { cookies: [{ name: 'session', value: 'fixture', domain: '.example.com', httpOnly: true, sameSite: 'Lax' }],
    localStorage: [{ origin: 'https://example.com', items: [{ name: 'lang', value: 'en' }] }] };
  await c.uploadBrowserContextProfileState({ path: { profileId: 'prof_1' }, body: upload });
  await c.deleteBrowserContextProfileDomain({ path: { profileId: 'prof_1', domain: 'a/b.example.com' } });
  assert.deepEqual(t.calls.map(x => x.url.pathname), ['/v1/profiles/prof_1/setup-session', '/v1/profiles/prof_1/save',
    '/v1/profiles/prof_1/upload', '/v1/profiles/prof_1/domains/a%2Fb.example.com']);
  assert.deepEqual(body(t.calls[2]), upload);
  assert.equal(t.calls[3].method, 'DELETE');
});

test('TinyFish screenshots return bytes, HTML returns text, and browser termination returns null', async () => {
  const t = capture(call => call.url.pathname.endsWith('screenshot') ? new Response(new Uint8Array([255, 216, 255]), { headers: { 'Content-Type': 'image/jpeg' } }) :
    call.url.pathname.endsWith('html') ? new Response('<html>fixture</html>', { headers: { 'Content-Type': 'text/html' } }) : new Response(null, { status: 204 }));
  const c = createTinyfishClient({ apiKey: 'fixture', fetch: t.fetch });
  assert.deepEqual((await c.getStepScreenshot({ path: { id: 'run_1', stepId: 'step 1' } })).data, new Uint8Array([255, 216, 255]));
  assert.equal((await c.getStepHtml({ path: { id: 'run_1', stepId: 'step 1' } })).data, '<html>fixture</html>');
  assert.equal(t.calls[0].url.pathname, '/v1/runs/run_1/steps/step%201/screenshot');
  assert.equal((await c.deleteBrowserSession({ path: { sessionId: 'session_1' } })).data, null);
  assert.equal(t.calls[2].url.href, 'https://api.browser.tinyfish.ai/session_1');
});

test('TinyFish fetch/browser/monitor services use their own hosts and native options', async () => {
  const t = capture();
  const c = createTinyfishClient({ apiKey: 'fixture', fetch: t.fetch });
  const fetchRequest = { urls: ['https://example.com'], format: 'markdown', links: true, include_selectors: ['main'], include_etag_and_last_modified: true };
  await c.fetchUrls({ body: fetchRequest });
  assert.equal(t.calls[0].url.href, 'https://api.fetch.tinyfish.ai/');
  assert.deepEqual(body(t.calls[0]), fetchRequest);
  await c.createBrowserSession({ body: { timeout_seconds: 300, proxy_config: { enabled: false } } });
  assert.equal(t.calls[1].url.href, 'https://api.browser.tinyfish.ai/');
  await c.createMonitor({ body: { type: 'search', schedule_cron: '0 9 * * *', config: { query: 'q', result_limit: 3 } } });
  assert.equal(t.calls[2].url.href, 'https://agent.tinyfish.ai/v1/monitors');
  await c.updateMonitor({ path: { id: 'monitor_1' }, body: { status: 'paused' } });
  assert.equal(t.calls[3].method, 'PATCH');
});

test('TinyFish Research always uses SSE while preserving its independent synthesis stream flag', async () => {
  const t = capture(call => call.url.pathname.endsWith('-async') ? json({ research_run_id: 'research_1', error: null }) :
    sse('event: created\nid: e1\ndata: {"research_run_id":"research_1"}\n\nevent: error\ndata: {"code":"fixture_pipeline_error"}\n\n'));
  const c = createTinyfishClient({ apiKey: 'fixture', fetch: t.fetch });
  const stream = await c.runResearch({ body: { query: 'q', stream: false, mode: 'max', domain_filter: { mode: 'exclusive', domains: ['example.com'] } } });
  const events = [];
  for await (const event of stream.data) events.push(event);
  assert.equal(body(t.calls[0]).stream, false);
  assert.equal(t.calls[0].headers.get('Accept'), 'text/event-stream');
  assert.equal(events[0].id, 'e1');
  assert.equal(events[1].event, 'error');
  await c.startResearchAsync({ body: { query: 'q', stream: true, session_id: 'session' } });
  assert.equal(body(t.calls[1]).stream, true);
  const resumed = await c.streamResearchEvents({ path: { research_run_id: 'research_1' }, headers: { 'Last-Event-ID': 'e1' } });
  for await (const _ of resumed.data) { /* fully consume fixture */ }
  assert.equal(t.calls[2].url.pathname, '/v1/research-run/research_1/events');
  assert.equal(t.calls[2].headers.get('Last-Event-ID'), 'e1');
  assert.equal(t.calls.length, 3);
});

test('Exa Agent streams negotiate Accept, batches carry required beta header, Websets preserve base path', async () => {
  const t = capture(call => call.headers.get('Accept') === 'text/event-stream' ? sse('data: {"type":"run.created","runId":"run_1"}\n\n') : json({ id: 'id' }));
  const c = createExaClient({ apiKey: 'fixture', fetch: t.fetch });
  const stream = await c.createAgentRunStream({ body: { query: 'Find companies', effort: 'high' }, headers: { 'Exa-Beta': 'fixture-beta' } });
  for await (const _ of stream.data) { /* consume */ }
  assert.equal(t.calls[0].url.pathname, '/agent/runs');
  assert.equal(t.calls[0].headers.get('Exa-Beta'), 'fixture-beta');
  await c.createBatch({ body: { requests: [{ customId: 'r1', method: 'POST', url: '/search', body: { query: 'q' } }] } });
  assert.equal(t.calls[1].headers.get('Exa-Beta'), 'batches-2026-06-06');
  assert.equal(t.calls[1].url.pathname, '/batches');
  await c.updateWebset({ path: { id: 'webset_1' }, body: { title: 'Research', metadata: { owner: 'a' } } });
  assert.equal(t.calls[2].url.pathname, '/websets/v0/websets/webset_1');
  assert.equal(t.calls[2].method, 'POST');
  await c.listMonitors({ query: { metadata: { owner: 'a' }, status: 'active' } });
  assert.equal(t.calls[3].url.searchParams.get('metadata[owner]'), 'a');
});

test('Exa Search and Answer stream methods set wire modes and preserve synthesis payloads', async () => {
  const t = capture(() => sse('id: 1\ndata: {"event":"content","content":"é"}\n\ndata: [DONE]\n\n'));
  const c = createExaClient({ apiKey: 'fixture', fetch: t.fetch });
  const request = { query: 'q', type: 'deep', outputSchema: { type: 'object', properties: { answer: { type: 'string' } } } };
  for (const [name, requestBody] of [['searchStream', request], ['answerStream', { query: 'q', text: true }]]) {
    const result = await c[name]({ body: requestBody });
    const events = [];
    for await (const event of result.data) events.push(event);
    assert.equal(JSON.parse(events[0].data).content, 'é');
    assert.equal(events[1].data, '[DONE]');
    assert.equal(body(t.calls.at(-1)).stream, true);
  }
});

test('Exa administration uses a separate service key and shares its lazy transport concurrency limit', async () => {
  let active = 0, peak = 0;
  const t = capture(async () => { active++; peak = Math.max(active, peak); await new Promise(resolve => setTimeout(resolve, 8)); active--; return json({ keys: [] }); });
  const c = createExaClient({ apiKey: 'search-fixture', teamApiKey: 'team-fixture', maxConcurrency: 1, fetch: t.fetch });
  await Promise.all([c.listApiKeys(), c.listApiKeys()]);
  assert.equal(peak, 1);
  assert.ok(t.calls.every(x => x.url.origin === 'https://admin-api.exa.ai' && x.url.pathname === '/team-management/api-keys'));
  assert.ok(t.calls.every(x => x.headers.get('x-api-key') === 'team-fixture'));
  await assert.rejects(createExaClient({ apiKey: 'search-fixture', fetch: t.fetch }).listApiKeys(), errorCode('configuration'));
});

test('Exa no-content enrichment update accepts empty 200 and rejects unexpected payloads', async () => {
  for (const [response, expected] of [[new Response(null, { status: 200 }), null], [new Response('unexpected', { status: 200 }), 'invalid_response']]) {
    const t = capture(() => response);
    const action = createExaClient({ apiKey: 'fixture', fetch: t.fetch }).updateWebsetEnrichment({ path: { webset: 'ws', id: 'en' }, body: { description: 'changed' } });
    if (expected === null) assert.equal((await action).data, null);
    else await assert.rejects(action, errorCode(expected));
    assert.equal(t.calls[0].method, 'PATCH');
  }
});

test('Tavily Research creates an async task or SSE stream explicitly, and GET status retains native fields', async () => {
  const t = capture(call => call.headers.get('Accept') === 'text/event-stream' ? sse('data: {"object":"chat.completion.chunk","choices":[{"delta":{"content":"Report"}}]}\n\n') : json({ request_id: 'request_1', status: 'pending', custom: { retained: true } }, 202));
  const c = createTavilyClient({ apiKey: 'fixture', fetch: t.fetch });
  await c.research({ body: { input: 'Compare', model: 'pro', citation_format: 'apa', output_length: 'long' } });
  assert.equal(body(t.calls[0]).stream, false);
  const streamed = await c.researchStream({ body: { input: 'Compare', include_domains: ['example.com'] } });
  for await (const event of streamed.data) assert.equal(JSON.parse(event.data).choices[0].delta.content, 'Report');
  assert.equal(body(t.calls[1]).stream, true);
  const status = await c.getResearch({ path: { request_id: 'request/1' } });
  assert.equal(t.calls[2].url.pathname, '/research/request%2F1');
  assert.deepEqual(status.data.custom, { retained: true });
});

test('Tavily management logs use POST and enterprise key management uses a separate host', async () => {
  const t = capture(() => json({ keys: ['returned-secret-fixture'], message: 'ok' }));
  const c = createTavilyClient({ apiKey: 'fixture', fetch: t.fetch });
  await c.logs({ body: { start_date: '2026-10-01', end_date: '2026-10-22', limit: 20 } });
  assert.equal(t.calls[0].method, 'POST');
  assert.equal(t.calls[0].url.pathname, '/logs');
  const result = await c.generateKeys({ body: { permission_level: 'user', key_type: 'development', count: 2, ttl_hours: 1 } });
  assert.equal(t.calls[1].url.href, 'https://api-key-generator.tavily.com/generate-keys');
  assert.equal(result.data.keys[0], 'returned-secret-fixture');
  await c.deactivateKeys();
  assert.equal(t.calls[2].url.pathname, '/deactivate-keys');
  assert.equal(t.calls[2].body, undefined);
});

test('Tavily keyless is explicit, header-selected and restricted to Search/Extract locally', async () => {
  const t = capture();
  const c = createTavilyClient({ accessMode: 'keyless', fetch: t.fetch });
  await c.search({ body: { query: 'q' } });
  await c.extract({ body: { urls: ['https://example.com'] } });
  assert.ok(t.calls.every(x => x.headers.get('X-Tavily-Access-Mode') === 'keyless' && !x.headers.has('Authorization')));
  await assert.rejects(c.crawl({ body: { url: 'https://example.com' } }), errorCode('configuration'));
  assert.equal(t.calls.length, 2);
  assert.throws(() => createTavilyClient({ fetch: t.fetch }), errorCode('configuration'));
});

test('public logo URL construction performs no download; HEAD uses client ID without bearer credentials', async () => {
  const t = capture(() => new Response(null, { headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'max-age=60' } }));
  const q = { publicClientId: 'brandLL_fixture', domain: 'example.com', theme: 'dark', type: 'wordmark' };
  const url = new URL(contextLogoUrl(q));
  assert.equal(url.origin, 'https://logos.context.dev');
  assert.deepEqual(Object.fromEntries(url.searchParams), q);
  const c = createContextClient({ apiKey: 'fixture-secret', fetch: t.fetch });
  assert.equal(c.logoUrl(q), url.href);
  assert.equal(t.calls.length, 0);
  const head = await c.headLogo({ query: q, headers: { Referer: 'https://example.com/' } });
  assert.equal(t.calls[0].method, 'HEAD');
  assert.equal(t.calls[0].headers.get('Authorization'), null);
  assert.equal(head.data.headers.get('Content-Type'), 'image/svg+xml');
});

test('payment bindings never negotiate/sign or replay charges, and preserve native success fields', async () => {
  const t = capture(() => json({ status: 'pending', amount: '25.00', currency: 'USD', payment_reference: 'pi_fixture' }, 202));
  const tiny = createTinyfishClient({ apiKey: 'fixture', fetch: t.fetch, retry: { maxRetries: 2 } });
  const result = await tiny.topUpWallet({ body: { amount: '25.00' }, headers: { 'Payment-Authorization': 'fixture-credential' } });
  assert.equal(result.data.status, 'pending');
  assert.equal(t.calls[0].url.pathname, '/v1/wallet/top-up');
  assert.equal(t.calls[0].headers.get('Payment-Authorization'), 'fixture-credential');
  const p = capture(() => json({ results: [], request_id: 'fixture' }));
  await createTavilyClient({ accessMode: 'keyless', fetch: p.fetch }).paidSearch({ body: { query: 'q' }, headers: { 'PAYMENT-SIGNATURE': 'fixture-signature' } });
  assert.equal(p.calls[0].url.href, 'https://x402.tavily.com/search');
  assert.equal(p.calls[0].headers.get('Authorization'), null);
  assert.equal(p.calls[0].headers.get('PAYMENT-SIGNATURE'), 'fixture-signature');
});

for (const [factory, method, input, auth] of [
  [createExaClient, 'search', { body: { query: 'q' } }, 'x-api-key'],
  [createTavilyClient, 'search', { body: { query: 'q' } }, 'Authorization'],
  [createBraveClient, 'search', { query: { q: 'q' } }, 'X-Subscription-Token'],
  [createContextClient, 'search', { body: { query: 'q' } }, 'Authorization'],
  [createTinyfishClient, 'search', { query: { query: 'q' } }, 'X-API-Key'],
]) {
  test(`${factory.name} keeps credentials protected and sanitizes provider errors`, async () => {
    const t = capture(() => new Response('secret-key private-body', { status: 401 }));
    const c = factory({ apiKey: 'secret-key', fetch: t.fetch });
    await assert.rejects(c[method]({ ...input, headers: { [auth]: 'replacement' } }), errorCode('invalid_request'));
    assert.equal(t.calls.length, 0);
    await assert.rejects(c[method](input), error => {
      assert.equal(error.code, 'auth');
      assert.equal(error.status, 401);
      assert.ok(!JSON.stringify(error).includes('secret-key'));
      assert.ok(!String(error).includes('private-body'));
      return true;
    });
    assert.equal(t.calls.length, 1);
  });
}

test('explicit destructive methods do not retry even when transport retries are configured', async () => {
  for (const [factory, method, input] of [
    [createExaClient, 'deleteWebset', { path: { id: 'id' } }],
    [createTavilyClient, 'deactivateKeys', {}],
    [createContextClient, 'deleteBatch', { path: { batch_id: 'id' } }],
    [createTinyfishClient, 'deleteMonitor', { path: { id: 'id' } }],
  ]) {
    const t = capture(() => new Response('private-error', { status: 503 }));
    const c = factory({ apiKey: 'fixture', fetch: t.fetch, retry: { maxRetries: 2, baseDelayMs: 1, maxDelayMs: 1 } });
    await assert.rejects(c[method](input), errorCode('unavailable'));
    assert.equal(t.calls.length, 1, method);
  }
});

test('read retries are opt-in while cancellation and malformed JSON remain terminal', async () => {
  const t = capture((_call, n) => n === 1 ? new Response(null, { status: 503 }) : json({ runs: [] }));
  const c = createTinyfishClient({ apiKey: 'fixture', fetch: t.fetch, retry: { maxRetries: 1, baseDelayMs: 1, maxDelayMs: 1 } });
  const response = await c.listRuns({ query: { status: 'RUNNING', limit: 10 } });
  assert.equal(t.calls.length, 2);
  assert.equal(response.metadata.attempts.length, 2);
  const controller = new AbortController(); controller.abort('sensitive-reason');
  await assert.rejects(c.listRuns({ signal: controller.signal }), errorCode('aborted'));
  assert.equal(t.calls.length, 2);
  const bad = capture(() => new Response('invalid json'));
  await assert.rejects(createExaClient({ apiKey: 'fixture', fetch: bad.fetch }).getContents({ body: { urls: ['https://example.com'] } }), errorCode('invalid_response'));
  assert.equal(bad.calls.length, 1);
});

test('provider native TypeScript inputs reject lost compositions, wrong field types and wrong placement', () => {
  const dir = mkdtempSync(join(tmpdir(), 'searchsdk-native-a-types-'));
  const src = fileURLToPath(new URL('../src/', import.meta.url));
  try {
    const code = `
import { createContextClient } from ${JSON.stringify(join(src, 'native-context.js'))};
import { createExaClient, exaOperations } from ${JSON.stringify(join(src, 'native-exa.js'))};
import { createTinyfishClient, tinyfishOperations } from ${JSON.stringify(join(src, 'native-tinyfish.js'))};
import { createBraveClient, braveOperations } from ${JSON.stringify(join(src, 'native-brave.js'))};
const context = createContextClient({apiKey:'fixture'});
context.scrape({body:{url:'https://example.com',formats:{markdown:true},markdownParams:{includeLinks:false}}});
// @ts-expect-error sibling object fields must survive allOf conditions
context.scrape({body:{formats:{markdown:true}}});
// @ts-expect-error markdown fields must not collapse to unknown
context.scrape({body:{url:'https://example.com',formats:{markdown:true},markdownParams:{includeLinks:'yes'}}});
const exa = createExaClient({apiKey:'fixture'});
exa.getContents({body:{urls:['https://example.com'],text:true}});
// @ts-expect-error contents requires ids or urls
exa.getContents({body:{text:true}});
// @ts-expect-error contents must not collapse to unknown
exa.getContents({body:{urls:[123]}});
// @ts-expect-error synthesis streaming requires outputSchema
exa.searchStream({body:{query:'q'}});
const tiny = createTinyfishClient({apiKey:'fixture'});
tiny.startResearchAsync({body:{query:'q',stream:true}});
// @ts-expect-error native domain_type is an enum
 tiny.search({query:{query:'q',domain_type:'invented'}});
// @ts-expect-error wrong native body type
 tiny.runAsync({body:{url:'https://example.com',goal:123}});
// @ts-expect-error monitor discriminant controls required config
 tiny.createMonitor({body:{type:'search',schedule_cron:'0 9 * * *',config:{url:'https://example.com'}}});
const brave=createBraveClient({apiKey:'fixture'});
brave.searchPost({body:{q:'q',extra_snippets:true}});
// @ts-expect-error request belongs in query for the GET variant
brave.search({body:{q:'q'}});
// @ts-expect-error q remains required in the POST body
brave.searchPost({body:{count:5}});
`;
    const file = join(dir, 'probe.mts'); writeFileSync(file, code);
    const compiler = resolve(fileURLToPath(new URL('../../../node_modules/.bin/tsc', import.meta.url)));
    execFileSync(compiler, ['--ignoreConfig', '--noEmit', '--strict', '--exactOptionalPropertyTypes', '--skipLibCheck', '--module', 'NodeNext',
      '--target', 'ES2022', '--lib', 'ES2022,DOM,DOM.Iterable', file], { encoding: 'utf8', stdio: 'pipe' });
  } finally { rmSync(dir, { recursive: true, force: true }); }
});


test('exported frozen operation maps are the exact catalogs used by all five factories', () => {
  for (const [factory, operations] of [[createExaClient, exaOperations], [createTavilyClient, tavilyOperations],
    [createBraveClient, braveOperations], [createContextClient, contextOperations], [createTinyfishClient, tinyfishOperations]]) {
    assert.equal(factory({ apiKey: 'fixture' }).operations, operations);
  }
  assert.equal(exaOperations.answerStream.response, 'sse');
  assert.equal(exaOperations.updateWebsetEnrichment.response, 'text');
  assert.equal(exaOperations.deleteWebset.retryable, false);
  assert.equal(contextOperations.headLogo.method, 'HEAD');
  assert.equal(contextOperations.headLogo.response, 'raw');
  assert.equal(tinyfishOperations.getStepScreenshot.response, 'bytes');
  assert.ok(Object.isFrozen(exaOperations.createBatch.headers));
  assert.throws(() => { exaOperations.search.method = 'DELETE'; }, TypeError);
});

test('native methods reject missing wire locations and contradictory HTTP stream controls before dispatch', async () => {
  const t = capture();
  for (const [factory, name] of [[createExaClient, 'search'], [createTavilyClient, 'search'], [createContextClient, 'search'],
    [createTinyfishClient, 'runAsync'], [createBraveClient, 'searchPost']]) {
    const c = factory({ apiKey: 'fixture', fetch: t.fetch });
    await assert.rejects(c[name]({}), errorCode('invalid_request'));
    await assert.rejects(c[name]({ body: null }), errorCode('invalid_request'));
  }
  const brave = createBraveClient({ apiKey: 'fixture', fetch: t.fetch });
  await assert.rejects(brave.search({ query: null }), errorCode('invalid_request'));
  const exa = createExaClient({ apiKey: 'fixture', fetch: t.fetch });
  await assert.rejects(exa.search({ body: { query: 'q', stream: true } }), errorCode('unsupported_option'));
  await assert.rejects(exa.answerStream({ body: { query: 'q', stream: false } }), errorCode('unsupported_option'));
  assert.equal(t.calls.length, 0);
});

test('TinyFish automation SSE preserves native STARTED events and never replays after a broken stream', async () => {
  const encoder = new TextEncoder();
  const t = capture(() => {
    let n = 0;
    return new Response(new ReadableStream({ pull(controller) {
      if (n++ === 0) controller.enqueue(encoder.encode('data: {"type":"STARTED","run_id":"run_1","timestamp":"2026-10-22T00:00:00Z"}\n\n'));
      else controller.error(new Error('fixture transport failure'));
    } }), { headers: { 'Content-Type': 'text/event-stream' } });
  });
  const result = await createTinyfishClient({ apiKey: 'fixture', fetch: t.fetch, retry: { maxRetries: 2 } })
    .runSse({ body: { url: 'https://example.com', goal: 'Read pricing' } });
  const iterator = result.data[Symbol.asyncIterator]();
  assert.equal(JSON.parse((await iterator.next()).value.data).type, 'STARTED');
  await assert.rejects(iterator.next(), errorCode('network'));
  assert.equal(t.calls.length, 1);
  assert.equal(t.calls[0].url.pathname, '/v1/automation/run-sse');
  assert.equal(t.calls[0].headers.get('Accept'), 'text/event-stream');
});
