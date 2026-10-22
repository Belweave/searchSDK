import test from 'node:test';
import assert from 'node:assert/strict';
import { getEventListeners } from 'node:events';
import { SearchError } from '../dist/index.js';
import { createPerplexityClient } from '../dist/native-perplexity.js';
import { createParallelClient } from '../dist/native-parallel.js';
import { createLinkupClient } from '../dist/native-linkup.js';
import { createFirecrawlClient } from '../dist/native-firecrawl.js';
import { createYouClient } from '../dist/native-you.js';
import { createSerperClient } from '../dist/native-serper.js';
import { createSerpApiClient } from '../dist/native-serpapi.js';
import { createWonderSearchClient } from '../dist/native-wondersearch.js';
const wireJson = init => JSON.parse(typeof init.body === 'string' ? init.body : new TextDecoder().decode(init.body));
const wireForm = init => new Response(init.body, { headers: init.headers }).formData();
const json = value => new Response(JSON.stringify(value), { headers: { 'x-request-id': 'request_1' } });
const fixture = { id: 'job_1', status: 'queued', nested: { future_field: ['unchanged', 42] }, usage: { cost: { amount: '0.002500', currency: 'USD' } } };
function capture(response = fixture) { const calls = []; return { calls, fetch: async (url, init) => { calls.push({ url: new URL(url), init }); return response instanceof Response ? response.clone() : json(response); } }; }
const failure = code => error => { assert.ok(error instanceof SearchError); assert.equal(error.code, code); assert.ok(!JSON.stringify(error).includes('sensitive')); assert.ok(!String(error).includes('sensitive')); return true; };
const path = { drive_id: 'drive', workspace_id: 'workspace', organization_id: 'org', document_id: 'doc', upload_id: 'upload', import_id: 'import' };
const key = { 'Idempotency-Key': 'fixture-operation-1' };

test('Perplexity current search, Sonar and async route contracts retain request and response fields', async () => {
  const t = capture(); const c = createPerplexityClient({ apiKey: 'fixture', fetch: t.fetch });
  const search = { query: ['a', 'b'], search_type: 'people', max_results: 30, country: 'US', search_domain_filter: ['example.org'] };
  const out = await c.search({ body: search });
  assert.deepEqual(out.data, fixture); assert.equal(out.metadata.provider, 'perplexity'); assert.equal(out.metadata.requestId, 'request_1');
  assert.equal(t.calls[0].url.href, 'https://api.perplexity.ai/search'); assert.deepEqual(wireJson(t.calls[0].init), search);
  await c.chatCompletions({ body: { model: 'sonar', messages: [{ role: 'user', content: 'q' }] } });
  await c.createAsyncChatCompletion({ body: { request: { model: 'sonar-deep-research', messages: [{ role: 'user', content: 'q' }] } } });
  await c.getAsyncChatCompletion({ path: { api_request: 'job/a b' } });
  await c.listAsyncChatCompletions({ query: { limit: 2, next_token: 'cursor' } });
  assert.deepEqual(t.calls.slice(1).map(x => x.url.pathname), ['/v1/sonar', '/v1/async/sonar', '/v1/async/sonar/job%2Fa%20b', '/v1/async/sonar']);
  assert.equal(t.calls[0].init.headers.get('Authorization'), 'Bearer fixture');
});
test('Perplexity agent, embeddings, decisions, router and analytics retain separate surfaces', async () => {
  const t = capture(); const c = createPerplexityClient({ apiKey: 'fixture', fetch: t.fetch });
  await c.createAgent({ body: { input: 'q', preset: 'deep-research', background: true } });
  await c.retrieveAgent({ path: { id: 'resp_1' } });
  await c.cancelAgentResponse({ path: { id: 'resp_1' } });
  await c.createEmbeddings({ body: { input: ['a'], model: 'pplx-embed-v1-0.6b' } });
  await c.createContextualizedEmbeddings({ body: { input: [['a', 'b']], model: 'pplx-embed-context-v1-0.6b' } });
  await c.answerQuestions({ body: { model: 'pplx-decider-v1.2', state: 'a', questions: {} } });
  await c.routerMessages({ body: { model: 'provider/model', max_tokens: 10, messages: [{ role: 'user', content: 'q' }] } });
  await c.getComputerUsageAnalytics({ query: { dataset: 'credit_usage', start_time: 1790812800, end_time: 1790899200 } });
  assert.deepEqual(t.calls.map(x => x.url.pathname), ['/v1/agent', '/v1/agent/resp_1', '/v1/agent/resp_1/cancel', '/v1/embeddings', '/v1/contextualizedembeddings', '/v1/decisions', '/router/v1/messages', '/v1/analytics/computer/usage']);
});
test('Perplexity skill bundles are multipart, downloadSkill is JSON URL metadata, agent files are bytes', async () => {
  const t = capture({ url: 'https://download.example.org/skill.zip', expires_at: '2026-10-22T00:00:00Z' });
  const c = createPerplexityClient({ apiKey: 'fixture', fetch: t.fetch }); const form = new FormData(); form.set('file', new Blob(['zip']), 'skill.zip');
  await c.createSkill({ rawBody: form });
  assert.equal((await wireForm(t.calls[0].init)).get('file').name, 'skill.zip'); assert.match(t.calls[0].init.headers.get('content-type'), /^multipart\/form-data; boundary=/);
  const result = await c.downloadSkill({ path: { skill_id: 'skill' }, query: { revision: '1' } });
  assert.equal(result.data.url, 'https://download.example.org/skill.zip'); assert.equal(t.calls[1].url.pathname, '/v1/skills/skill/download');
  const bytes = createPerplexityClient({ apiKey: 'fixture', fetch: async () => new Response(new Uint8Array([0, 255, 42])) });
  assert.deepEqual((await bytes.downloadAgentFile({ path: { id: 'resp', file_id: 'file' } })).data, new Uint8Array([0, 255, 42]));
});
test('Perplexity token management has exact paths and handles its documented empty HTTP 200', async () => {
  const t = capture({ auth_token: 'fixture-generated', created_at_epoch_seconds: 1 }); const c = createPerplexityClient({ apiKey: 'fixture', fetch: t.fetch });
  assert.equal((await c.generateAuthToken({ body: { token_name: 'fixture' } })).data.auth_token, 'fixture-generated');
  assert.equal(t.calls[0].url.pathname, '/generate_auth_token');
  const calls = []; const revoke = createPerplexityClient({ apiKey: 'fixture', fetch: async (url, init) => { calls.push({ url, init }); return new Response(null, { status: 200 }); } });
  const r = await revoke.revokeAuthToken({ body: { auth_token: 'fixture-revoke' } }); assert.equal(r.data, null); assert.equal(r.metadata.status, 200);
  assert.equal(calls[0].url, 'https://api.perplexity.ai/revoke_auth_token'); assert.deepEqual(wireJson(calls[0].init), { auth_token: 'fixture-revoke' });
});
test('Parallel task groups, FindAll, monitor and memory use exact verbs and paths', async () => {
  const t = capture(); const c = createParallelClient({ apiKey: 'fixture', fetch: t.fetch });
  await c.createTaskRun({ body: { input: 'q', processor: 'base', enable_events: true }, headers: { 'parallel-beta': null } });
  await c.addRunsToTaskGroup({ path: { taskgroup_id: 'group' }, query: { refresh_status: false }, body: { inputs: [] } });
  await c.retrieveTaskRunResult({ path: { run_id: 'run' }, query: { timeout: 3 } });
  await c.createFindAllRun({ body: { objective: 'q', entity_type: 'company', match_limit: 10 }, headers: { 'parallel-beta': 'findall-2025-09-15' } });
  await c.updateMonitor({ path: { monitor_id: 'monitor' }, body: { metadata: { stable: 'yes' } } });
  await c.retrieveMemory({ body: { query: 'q' } });
  assert.deepEqual(t.calls.map(x => [x.init.method, x.url.pathname]), [['POST', '/v1/tasks/runs'], ['POST', '/v1/tasks/groups/group/runs'], ['GET', '/v1/tasks/runs/run/result'], ['POST', '/v1beta/findall/runs'], ['POST', '/v1/monitors/monitor/update'], ['POST', '/v1beta/memory/retrieve']]);
  assert.equal(t.calls[0].init.headers.has('parallel-beta'), false); assert.equal(t.calls[3].init.headers.get('parallel-beta'), 'findall-2025-09-15'); assert.equal(t.calls[1].url.searchParams.get('refresh_status'), 'false');
});
test('Parallel extraction and image search keep native schemas rather than web-normalizing', async () => {
  const t = capture(); const c = createParallelClient({ apiKey: 'fixture', fetch: t.fetch });
  const data = { urls: ['https://example.com'], objective: 'details', excerpts: true, full_content: true };
  assert.deepEqual((await c.extract({ body: data })).data, fixture);
  await c.imageSearch({ body: { search_queries: ['golden gate'] } });
  assert.equal(t.calls[0].url.pathname, '/v1/extract'); assert.deepEqual(wireJson(t.calls[0].init), data); assert.equal(t.calls[1].url.pathname, '/v1/images/search');
});
test('Linkup all public endpoint families preserve casing, pagination and closed-beta requests', async () => {
  const t = capture(); const c = createLinkupClient({ apiKey: 'fixture', fetch: t.fetch });
  const body = { q: 'q', depth: 'deep', outputType: 'structured', structuredOutputSchema: '{"type":"object"}' };
  await c.search({ body }); await c.fetchPage({ body: { url: 'https://example.com', renderJs: true } });
  await c.createResearch({ body: { q: 'q', outputType: 'sourcedAnswer' } }); await c.getResearch({ path: { id: 'research' } });
  await c.createTasks({ body: [{ type: 'fetch', input: { url: 'https://example.com' } }] }); await c.getTask({ path: { id: 'task' } });
  await c.createExtract({ body: { url: 'https://example.com', q: 'q', schema: { type: 'object', properties: { name: { type: 'string' } } } } }); await c.getExtract({ path: { id: 'extract' } }); await c.balance();
  await c.rewindSearch({ body: { q: 'q' } }); await c.responses({ body: { input: 'q' } });
  assert.deepEqual(t.calls.map(x => x.url.pathname), ['/v1/search', '/v1/fetch', '/v1/research', '/v1/research/research', '/v1/tasks', '/v1/tasks/task', '/v1/extract', '/v1/extract/extract', '/v1/credits/balance', '/v1/rewind/search', '/v1/responses']);
  assert.deepEqual(wireJson(t.calls[0].init), body); assert.equal(t.calls[0].init.headers.get('authorization'), 'Bearer fixture');
});
test('Firecrawl uses v2 for crawl/batch/agent/interact/monitor and preserves failure details as native data', async () => {
  const t = capture({ success: true, data: [{ url: 'https://example.com', metadata: { error: 'provider-native-detail' } }], next: 'cursor' });
  const c = createFirecrawlClient({ apiKey: 'fixture', fetch: t.fetch });
  const r = await c.crawl({ body: { url: 'https://example.com', limit: 10 } }); assert.equal(r.data.data[0].metadata.error, 'provider-native-detail');
  await c.getCrawlStatus({ path: { id: 'crawl' } }); await c.cancelCrawl({ path: { id: 'crawl' } });
  await c.batchScrape({ body: { urls: ['https://example.com'] } }); await c.startAgent({ body: { prompt: 'q' } });
  await c.executeBrowserCode({ path: { sessionId: 'session' }, body: { code: 'console.log(1)', language: 'javascript' } });
  await c.updateMonitor({ path: { monitorId: 'monitor' }, body: { name: 'updated' } }); await c.researchGetPaper({ path: { id: 'paper' } });
  assert.deepEqual(t.calls.map(x => [x.init.method, x.url.pathname]), [['POST', '/v2/crawl'], ['GET', '/v2/crawl/crawl'], ['DELETE', '/v2/crawl/crawl'], ['POST', '/v2/batch/scrape'], ['POST', '/v2/agent'], ['POST', '/v2/interact/session/execute'], ['PATCH', '/v2/monitor/monitor'], ['GET', '/v2/search/research/papers/paper']]);
});
test('Firecrawl parse endpoint forwards FormData without a manually invented boundary', async () => {
  const t = capture(); const c = createFirecrawlClient({ apiKey: 'fixture', fetch: t.fetch }); const form = new FormData(); form.set('file', new Blob(['pdf']), 'fixture.pdf');
  await c.parseFile({ rawBody: form }); assert.equal(t.calls[0].url.pathname, '/v2/parse'); assert.equal((await wireForm(t.calls[0].init)).get('file').name, 'fixture.pdf'); assert.match(t.calls[0].init.headers.get('content-type'), /^multipart\/form-data; boundary=/);
});
test('You separates search/contents and answer/research/billing hosts, with X-API-Key auth', async () => {
  const t = capture(); const c = createYouClient({ apiKey: 'fixture', fetch: t.fetch });
  await c.search({ body: { query: 'q', extraction: { extraction_mode: 'highlights' } } }); await c.contents({ body: { urls: ['https://example.com'] } });
  await c.answer({ body: { query: 'q' } }); await c.research({ body: { input: 'q', background: true } }); await c.getResearchTask({ path: { task_id: 'task' } });
  await c.financeResearch({ body: { input: 'q' } }); await c.images({ query: { q: 'q' } }); await c.getAccountBalance();
  assert.deepEqual(t.calls.map(x => x.url.origin + x.url.pathname), ['https://ydc-index.io/v1/search', 'https://ydc-index.io/v1/contents', 'https://api.you.com/v1/answer', 'https://api.you.com/v1/research', 'https://api.you.com/v1/research/task', 'https://api.you.com/v1/finance_research', 'https://api.you.com/v1/images', 'https://api.you.com/v1/billing/account_balance']);
  assert.ok(t.calls.every(x => x.init.headers.get('X-API-Key') === 'fixture'));
});
test('Serper specialized operations and batch responses remain native; GET auth cannot be replaced', async () => {
  const t = capture([{ images: [{ imageUrl: 'https://example.org/a.png' }], credits: 1 }]); const c = createSerperClient({ apiKey: 'fixture', fetch: t.fetch });
  const batch = [{ q: 'a', gl: 'us' }, { q: 'b', hl: 'en' }]; const r = await c.images({ body: batch });
  assert.deepEqual(r.data, [{ images: [{ imageUrl: 'https://example.org/a.png' }], credits: 1 }]); assert.deepEqual(wireJson(t.calls[0].init), batch);
  await c.reviews({ body: { placeId: 'place', nextPageToken: 'cursor' } }); await c.lens({ body: { url: 'https://example.org/a.png' } });
  await c.searchGet({ query: { q: 'a&b' } }); await c.scrape({ body: { url: 'https://example.org', includeMarkdown: true } });
  assert.deepEqual(t.calls.map(x => x.url.origin + x.url.pathname), ['https://google.serper.dev/images', 'https://google.serper.dev/reviews', 'https://google.serper.dev/lens', 'https://google.serper.dev/search', 'https://scrape.serper.dev/']);
  assert.equal(t.calls[3].url.searchParams.get('apiKey'), 'fixture'); assert.equal(t.calls[3].url.searchParams.get('q'), 'a&b');
  assert.equal(t.calls[0].init.headers.get('X-API-KEY'), 'fixture');
});
test('SerpAPI engine, async archive, pixel, extract, locations, account and upload families', async () => {
  const t = capture(); const c = createSerpApiClient({ apiKey: 'fixture', fetch: t.fetch });
  await c.search({ query: { engine: 'google_flights', departure_id: 'JFK', arrival_id: 'LHR', async: true } });
  await c.getSearch({ path: { search_id: 'saved/a' } }); await c.searchPixelPositions({ query: { engine: 'google', q: 'q' } });
  await c.extract({ query: { url: 'https://example.org', mode: 'crawl', max_pages: 3 } }); await c.locations({ query: { q: 'Austin', limit: 3 } }); await c.account();
  const form = new FormData(); form.set('image', new Blob(['png'], { type: 'image/png' }), 'fixture.png'); await c.uploadImage({ rawBody: form });
  assert.deepEqual(t.calls.map(x => x.url.pathname), ['/search.json', '/searches/saved%2Fa.json', '/search.json_with_pixel_position', '/search.json', '/locations.json', '/account.json', '/image']);
  assert.equal(t.calls[3].url.searchParams.get('engine'), 'extract'); assert.equal(t.calls[3].url.searchParams.get('mode'), 'crawl'); assert.equal(t.calls[0].url.searchParams.get('api_key'), 'fixture');
  assert.equal(t.calls[4].url.searchParams.has('api_key'), false); assert.equal((await wireForm(t.calls[6].init)).get('api_key'), 'fixture'); assert.equal(form.has('api_key'), false);
  await assert.rejects(c.search({ query: { engine: 'google', q: 'q', api_key: 'replacement' } }), failure('invalid_request'));
  await assert.rejects(c.search({ query: { engine: 'google', q: 'q', no_cache: true, async: true } }), failure('invalid_request'));
});
test('WonderSearch searches corpus passages with exact revision/cost strings and explicit headers', async () => {
  const corpus = { request_id: 'request', drive_id: 'drive', results: [{ document_id: 'doc', document_revision: '9007199254740993', passage_id: 'passage', text: 'Source', start_byte: 0, end_byte: 6, score: 0.8 }], usage: { cost: { amount: '0.002500', currency: 'USD' } }, warnings: [] };
  const t = capture(corpus); const c = createWonderSearchClient({ apiKey: 'fixture', fetch: t.fetch });
  const r = await c.searchDrive({ path: { drive_id: 'drive' }, headers: key, body: { query: 'q', effort: 'small', folder_id: 'root' } });
  assert.deepEqual(r.data, corpus); assert.equal(r.data.results[0].document_revision, '9007199254740993'); assert.equal(r.data.usage.cost.amount, '0.002500');
  await c.searchWorkspace({ path: { workspace_id: 'workspace' }, headers: key, body: { query: 'q' } });
  await c.getPassage({ path: { drive_id: 'drive', passage_id: 'passage/a' }, query: { index_snapshot_id: 'snapshot' } });
  assert.equal(t.calls[0].url.href, 'https://api.wondersearch.ai/v1/drives/drive/search'); assert.equal(t.calls[0].init.headers.get('Idempotency-Key'), key['Idempotency-Key']);
  assert.equal(t.calls[2].url.pathname, '/v1/drives/drive/passages/passage%2Fa'); assert.equal(t.calls[2].url.searchParams.get('index_snapshot_id'), 'snapshot');
  await assert.rejects(c.searchDrive({ path: { drive_id: 'drive' }, body: { query: 'q' } }), failure('invalid_request'));
  assert.equal(c.web, undefined);
});
test('WonderSearch ingestion/access/billing methods are explicit and do not poll or follow signed URLs', async () => {
  const t = capture(); const c = createWonderSearchClient({ apiKey: 'fixture', fetch: t.fetch });
  await c.createDriveDocument({ path: { drive_id: 'drive' }, headers: { ...key, 'X-Ingestion-Mode': 'progressive' }, body: { documents: [{ external_id: 'doc', text: 'content' }] } });
  await c.createUploadBatch({ path: { drive_id: 'drive' }, body: { files: [] } });
  await c.uploadContent({ path: { drive_id: 'drive', upload_id: 'upload' }, headers: key, rawBody: new Uint8Array([1, 2]) });
  await c.createImport({ path: { drive_id: 'drive', import_id: 'import' }, body: { source_bytes: 2, documents: 1 } });
  await c.getWorkspaceOperation({ path: { workspace_id: 'workspace', operation_id: 'op' } });
  await c.updateOrganization({ path: { organization_id: 'org' }, headers: { 'If-Match': '"1"' }, body: { name: 'Name' } });
  await c.setBillingLimits({ path: { organization_id: 'org' }, headers: key, body: { maximum_usd: '25.000000' } });
  assert.deepEqual(t.calls.map(x => [x.init.method, x.url.pathname]), [['POST', '/v1/drives/drive/documents'], ['POST', '/v1/drives/drive/uploads/batch'], ['PUT', '/v1/drives/drive/uploads/upload/content'], ['PUT', '/v1/drives/drive/imports/import'], ['GET', '/v1/workspaces/workspace/operations/op'], ['PATCH', '/v1/organizations/org'], ['POST', '/v1/organizations/org/billing/limits']]);
  assert.deepEqual(wireJson(t.calls[6].init), { maximum_usd: '25.000000' }); assert.equal(t.calls[5].init.headers.get('If-Match'), '"1"');
});
const clients = [
  [createPerplexityClient, c => c.search({ body: { query: 'q' } }), c => c.createAgent({ body: { input: 'q' } })],
  [createParallelClient, c => c.search({ body: { search_queries: ['q'] } }), c => c.createTaskRun({ body: { input: 'q', processor: 'base' } })],
  [createLinkupClient, c => c.search({ body: { q: 'q', depth: 'fast', outputType: 'searchResults' } }), c => c.createResearch({ body: { q: 'q', outputType: 'sourcedAnswer' } })],
  [createFirecrawlClient, c => c.search({ body: { query: 'q' } }), c => c.crawl({ body: { url: 'https://example.com' } })],
  [createYouClient, c => c.search({ body: { query: 'q' } }), c => c.research({ body: { input: 'q' } })],
  [createSerperClient, c => c.search({ body: { q: 'q' } }), c => c.search({ body: { q: 'q' } })],
  [createSerpApiClient, c => c.search({ query: { engine: 'google', q: 'q' } }), c => c.search({ query: { engine: 'google', q: 'q' } })],
  [createWonderSearchClient, c => c.searchDrive({ path: { drive_id: 'drive' }, headers: key, body: { query: 'q' } }), c => c.createWorkspaceDrive({ path: { workspace_id: 'workspace' }, headers: key, body: { name: 'Drive' } })],
];
for (const [factory, read, write] of clients) {
  test(`${factory.name}: safe errors, default no retry and fixed credentials`, async () => {
    for (const status of [401, 429, 503]) {
      let calls = 0; const c = factory({ apiKey: 'sensitive-key', fetch: async () => { calls++; return new Response('sensitive-provider-message', { status }); } });
      await assert.rejects(read(c), failure(status === 401 ? 'auth' : status === 429 ? 'rate_limit' : 'unavailable')); assert.equal(calls, 1);
    }
    for (const config of [{ apiKey: '' }, { apiKey: 'bad\rkey' }, { apiKey: 'fixture', fetch: false }, { apiKey: 'fixture', baseUrl: 'https://elsewhere.org' }]) assert.throws(() => factory(config), failure('configuration'));
    let calls = 0; const c = factory({ apiKey: 'fixture', retry: { maxRetries: 1, baseDelayMs: 1 }, fetch: async () => { calls++; return new Response('sensitive-error', { status: 503 }); } });
    await assert.rejects(write(c), failure('unavailable')); assert.equal(calls, 1);
  });
  test(`${factory.name}: deadline and cancellation bound ignored fetch`, async () => {
    const control = new AbortController(); let seen;
    const c = factory({ apiKey: 'fixture', timeoutMs: 20, fetch: async (_url, init) => { seen = init.signal; return new Promise(() => {}); } });
    const proxy = Object.fromEntries(Object.entries(c).map(([field, value]) => [field, typeof value === 'function' ? input => value({ ...input, signal: control.signal }) : value]));
    const promise = read(proxy); setTimeout(() => control.abort(), 1);
    await assert.rejects(promise, failure('aborted')); assert.equal(seen.aborted, true); assert.equal(getEventListeners(control.signal, 'abort').length, 0);
    await assert.rejects(read(c), failure('timeout')); assert.equal(seen.aborted, true);
  });
}
for (const [factory, invoke] of [
  [createPerplexityClient, c => c.createAgentStream({ body: { input: 'q' } })],
  [createParallelClient, c => c.streamTaskRunEvents({ path: { run_id: 'run' } })],
  [createYouClient, c => c.streamResearchTask({ path: { task_id: 'task' } })],
]) test(`${factory.name}: SSE remains incremental, typed native events with no replay`, async () => {
  const calls = []; const c = factory({ apiKey: 'fixture', fetch: async (url, init) => { calls.push({ url, init }); return new Response('event: progress\nid: event_1\ndata: {"value":1}\n\ndata: [DONE]\n\n', { headers: { 'content-type': 'text/event-stream' } }); } });
  const r = await invoke(c); const events = []; for await (const event of r.data) events.push(event);
  assert.equal(events[0].event, 'progress'); assert.equal(events[0].id, 'event_1'); assert.equal(events[0].data, '{"value":1}'); assert.equal(events[1].data, '[DONE]'); assert.equal(calls.length, 1);
  if (factory === createPerplexityClient) assert.equal(wireJson(calls[0].init).stream, true);
});
test('WonderSearch raw reads expose the documented ETag needed for If-Match, source downloads are bytes', async () => {
  const c = createWonderSearchClient({ apiKey: 'fixture', fetch: async url => String(url).endsWith('/source') ? new Response(new Uint8Array([7, 8])) : new Response('{"id":"drive","version":"1"}', { headers: { ETag: '"version-1"' } }) });
  const raw = await c.getDriveRaw({ path: { drive_id: 'drive' } }); assert.equal(raw.data.headers.get('etag'), '"version-1"'); assert.deepEqual(await raw.data.json(), { id: 'drive', version: '1' });
  const bytes = await c.getDriveDocumentSource({ path: { drive_id: 'drive', document_id: 'doc' } }); assert.deepEqual(bytes.data, new Uint8Array([7, 8]));
});
