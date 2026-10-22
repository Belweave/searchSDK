import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer, request } from 'node:http';
import { createHash } from 'node:crypto';
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, cpSync, symlinkSync, readdirSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createMcpHandler, createMcpGuard, protocolVersion, mcpLimits } from '../mcp.mjs';
import { createMcpCatalog, loadMcpCatalog, mcpTools } from '../mcp-data.mjs';

const root = new URL('../../../../', import.meta.url);
const official = JSON.parse(readFileSync(new URL('./mcp-protocol-schema.json', import.meta.url), 'utf8'));
// Offline validator for the assertion keywords used by the retained official
// schema. This is test-only: no remote $refs, formats are annotations, no claim
// to being a general-purpose JSON Schema implementation.
function validate(value, schema, location = '$') {
  if (schema === true) return;
  assert.notEqual(schema, false, location);
  if (schema.$ref) {
    assert.match(schema.$ref, /^#\/\$defs\//);
    validate(value, official.$defs[schema.$ref.slice(8)], location);
  }
  if (schema.allOf) schema.allOf.forEach(part => validate(value, part, location));
  if (schema.anyOf) assert.ok(schema.anyOf.some(part => { try { validate(value, part, location); return true; } catch { return false; } }), `${location}: anyOf`);
  if (schema.const !== undefined) assert.deepEqual(value, schema.const, location);
  if (schema.enum) assert.ok(schema.enum.some(item => item === value), `${location}: enum`);
  if (schema.type) {
    const actual = value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value;
    const allowed = Array.isArray(schema.type) ? schema.type : [schema.type];
    assert.ok(allowed.includes(actual) || allowed.includes('integer') && Number.isInteger(value), `${location}: ${schema.type}`);
  }
  if (typeof value === 'number') {
    if (schema.minimum !== undefined) assert.ok(value >= schema.minimum, location);
    if (schema.maximum !== undefined) assert.ok(value <= schema.maximum, location);
  }
  if (typeof value === 'string') {
    if (schema.minLength !== undefined) assert.ok([...value].length >= schema.minLength, location);
    if (schema.maxLength !== undefined) assert.ok([...value].length <= schema.maxLength, location);
  }
  if (Array.isArray(value) && schema.items) value.forEach((item, i) => validate(item, schema.items, `${location}[${i}]`));
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    for (const name of schema.required ?? []) assert.ok(Object.hasOwn(value, name), `${location}.${name}: required`);
    for (const [name, item] of Object.entries(value)) {
      if (schema.properties?.[name]) validate(item, schema.properties[name], `${location}.${name}`);
      else if (schema.additionalProperties !== undefined) validate(item, schema.additionalProperties, `${location}.${name}`);
    }
  }
}
const conforms = (value, name) => validate(value, official.$defs[name]);
const description = 'Read public integration guidance for café search.';
const skillText = `---\nname: searchsdk\ndescription: ${JSON.stringify(description)}\n---\n\n# searchSDK\n\nRead docs first. Never run examples automatically.\n`;
const skillUri = 'skill://searchsdk/SKILL.md';
function fixture() {
  return { schemaVersion: 1,
    docs: [{ slug: '', title: 'Index', description: 'Documentation', url: 'https://searchsdk.dev/docs', text: '# Index\n' },
      ...Array.from({ length: 55 }, (_, i) => ({ slug: `guide/${String(i).padStart(2, '0')}`, title: `Search guide ${i}`, description: 'Provider capabilities and cancellation',
        url: `https://searchsdk.dev/docs/guide/${i}`, text: `# Guide ${i}\n\nRead-only provider search documentation. Cancellation and deadline examples.\n` }))],
    providers: Array.from({ length: 55 }, (_, i) => ({ id: `provider-${String(i).padStart(2, '0')}`, name: `Provider ${i}`, description: 'Synthetic public catalog entry',
      boundary: 'Normalized web search is separate from native APIs.', docs: 'https://example.com/docs', status: 'alpha', nativeClient: i % 2 === 0 })),
    examples: Array.from({ length: 55 }, (_, i) => ({ id: `example-${String(i).padStart(2, '0')}`, title: `Example ${i}`, language: 'typescript',
      code: 'const value = "fixture, never executed";', url: 'https://searchsdk.dev/docs' })),
    skills: [{ uri: skillUri, frontmatter: { name: 'searchsdk', description },
      resources: [{ uri: skillUri, digest: `sha256:${createHash('sha256').update(skillText).digest('hex')}`, size: Buffer.byteLength(skillText) }],
      files: [{ uri: skillUri, mimeType: 'text/markdown', text: skillText }], url: 'https://searchsdk.dev/skills/searchsdk/SKILL.md' }],
  };
}
const meta = () => ({ 'io.modelcontextprotocol/protocolVersion': protocolVersion, 'io.modelcontextprotocol/clientCapabilities': {} });
const message = (method = 'server/discover', params = {}, id = 1) => ({ jsonrpc: '2.0', id, method, params: { _meta: meta(), ...params } });
async function server(t, options = {}) {
  const handler = options.handler ?? createMcpHandler({ environment: {}, catalog: createMcpCatalog(fixture()), ...options });
  // Let oversized test envelopes reach our guard instead of Node's parser.
  const http = createServer({ maxHeaderSize: 65536 }, (req, res) => void handler(req, res));
  await new Promise(resolve => http.listen(0, '127.0.0.1', resolve));
  t.after(() => { http.closeAllConnections(); return new Promise(resolve => http.close(resolve)); });
  function call(body = message(), { method = 'POST', path = '/mcp', headers = {}, raw } = {}) {
    const name = body?.method === 'resources/read' ? body.params?.uri : ['tools/call', 'prompts/get'].includes(body?.method) ? body.params?.name : undefined;
    const defaults = { host: 'searchsdk.dev', accept: 'application/json, text/event-stream', 'content-type': 'application/json',
      'mcp-protocol-version': body?.params?._meta?.['io.modelcontextprotocol/protocolVersion'] ?? protocolVersion,
      'mcp-method': body?.method ?? 'server/discover', ...(name !== undefined ? { 'mcp-name': name } : {}), ...headers };
    for (const key of Object.keys(defaults)) if (defaults[key] === undefined) delete defaults[key];
    return new Promise((resolve, reject) => {
      const req = request({ hostname: '127.0.0.1', port: http.address().port, path, method, headers: defaults }, res => {
        const chunks = []; res.on('data', chunk => chunks.push(chunk));
        res.on('end', () => { const text = Buffer.concat(chunks).toString(); resolve({ status: res.statusCode, headers: res.headers, text, body: text ? JSON.parse(text) : undefined }); });
      });
      req.on('error', reject); req.end(raw ?? JSON.stringify(body));
    });
  }
  return { call, http };
}
const tool = (name, args = {}) => message('tools/call', { name, arguments: args });

test('modern discovery, tool definitions, calls, and resources conform to the pinned official July 2026 schema', async t => {
  const { call } = await server(t);
  const discover = await call();
  assert.equal(discover.status, 200); conforms(message(), 'DiscoverRequest'); conforms(discover.body.result, 'DiscoverResult');
  assert.deepEqual(discover.body.result.supportedVersions, ['2026-07-28']);
  assert.deepEqual(discover.body.result.capabilities, { tools: {}, resources: {}, extensions: { 'io.modelcontextprotocol/skills': {} } });
  assert.equal(discover.headers['mcp-session-id'], undefined);
  const listed = await call(message('tools/list'));
  conforms(listed.body.result, 'ListToolsResult');
  assert.deepEqual(listed.body.result.tools.map(item => item.name), ['search_docs', 'get_doc', 'list_providers', 'get_provider', 'list_examples', 'get_example']);
  for (const definition of listed.body.result.tools) assert.deepEqual(definition.annotations, { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false });
  for (const [name, args] of [['search_docs', { query: 'cancellation', limit: 2 }], ['get_doc', { slug: '' }],
    ['list_providers', {}], ['get_provider', { id: 'provider-01' }], ['list_examples', {}], ['get_example', { id: 'example-01' }]]) {
    const request = tool(name, args); conforms(request, 'CallToolRequest');
    validate(args, mcpTools.find(item => item.name === name).inputSchema);
    const response = await call(request);
    assert.equal(response.status, 200); conforms(response.body.result, 'CallToolResult'); assert.equal(response.body.result.isError, false);
    assert.deepEqual(JSON.parse(response.body.result.content[0].text), response.body.result.structuredContent);
  }
  const resources = await call(message('resources/list'));
  conforms(resources.body.result, 'ListResourcesResult'); assert.equal(resources.body.result.resources.length, 50);
  const resource = await call(message('resources/read', { uri: 'searchsdk://docs/guide%2F00' }));
  conforms(resource.body.result, 'ReadResourceResult'); assert.equal(resource.body.result.contents[0].text, fixture().docs[1].text);
  conforms((await call(message('resources/templates/list'))).body.result, 'ListResourceTemplatesResult');
});

test('each request works independently; legacy handshake, sessions, GET streams, DELETE, and unknown methods are explicit', async t => {
  const { call } = await server(t);
  const direct = await call(tool('get_doc', { slug: '' }), { path: '/api/mcp', headers: { 'mcp-session-id': 'ignored', 'last-event-id': 'ignored' } });
  assert.equal(direct.body.result.structuredContent.title, 'Index'); assert.equal(direct.headers['mcp-session-id'], undefined);
  for (const method of ['GET', 'DELETE', 'PUT']) {
    const response = await call(message(), { method });
    assert.equal(response.status, 405); assert.equal(response.headers.allow, 'POST, OPTIONS');
  }
  const old = await call({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-11-25' } }, { headers: { 'mcp-method': undefined, 'mcp-protocol-version': undefined } });
  assert.equal(old.status, 400); assert.equal(old.body.error.code, -32020); assert.match(old.text, /2026-07-28/);
  const unknown = await call(message('not-a-method')); assert.equal(unknown.status, 404); assert.equal(unknown.body.error.code, -32601);
  for (const method of ['subscriptions/listen', 'prompts/list', 'resources/directory/read']) assert.equal((await call(message(method))).body.error.code, -32601);
});

test('version and mirrored-header errors follow modern codes, IDs, metadata, and Base64 sentinel rules', async t => {
  const { call } = await server(t);
  const unsupported = message(); unsupported.params._meta['io.modelcontextprotocol/protocolVersion'] = '2025-11-25';
  const version = await call(unsupported); assert.equal(version.status, 400); conforms(version.body, 'UnsupportedProtocolVersionError');
  assert.deepEqual(version.body.error.data, { requested: '2025-11-25', supported: [protocolVersion] });
  for (const headers of [{ 'mcp-method': undefined }, { 'mcp-protocol-version': undefined }, { 'mcp-method': 'tools/list' }, { 'mcp-protocol-version': '2025-11-25' }]) {
    const response = await call(message(), { headers }); assert.equal(response.status, 400); conforms(response.body, 'HeaderMismatchError');
  }
  for (const headers of [{ 'mcp-name': undefined }, { 'mcp-name': 'different' }, { 'mcp-name': '=?base64?!!?=' }, { 'mcp-name': '=?base64?/w==?=' }]) {
    assert.equal((await call(tool('list_providers'), { headers })).body.error.code, -32020);
  }
  const encoded = `=?base64?${Buffer.from('get_doc').toString('base64')}?=`;
  assert.equal((await call(tool('get_doc', { slug: '' }), { headers: { 'mcp-name': encoded } })).body.result.isError, false);
  const unicodeUri = 'searchsdk://docs/日本語';
  const unicode = await call(message('resources/read', { uri: unicodeUri }), { headers: { 'mcp-name': `=?base64?${Buffer.from(unicodeUri).toString('base64')}?=` } });
  assert.equal(unicode.body.error.code, -32602); // decoded correctly, unknown exact resource
  for (const params of [{}, { _meta: {} }, { _meta: { 'io.modelcontextprotocol/protocolVersion': protocolVersion } }, { _meta: { ...meta(), 'io.modelcontextprotocol/clientInfo': {} } }]) {
    assert.equal((await call({ ...message(), params })).body.error.code, -32602);
  }
});

test('single UTF-8 JSON messages, integer/string IDs, media negotiation, and notification mechanics are bounded', async t => {
  const { call } = await server(t);
  for (const id of [0, 'request-id']) assert.equal((await call(message('server/discover', {}, id))).body.id, id);
  for (const body of [[], [message()], null, { ...message(), id: null }, { ...message(), id: 1.5 }, { ...message(), result: {} }, { jsonrpc: '2.0', id: 1, result: {} }]) {
    const response = await call(body); assert.equal(response.status, 400); assert.equal(response.body.error.code, -32600);
  }
  for (const raw of ['{', Buffer.from([0xff]), '']) assert.equal((await call(message(), { raw })).body.error.code, -32700);
  for (const headers of [{ accept: undefined }, { accept: 'application/json' }, { accept: 'application/json, text/event-stream;q=0' },
    { accept: 'application/json, text/event-stream;q=bogus' }]) assert.equal((await call(message(), { headers })).status, 406);
  for (const headers of [{ 'content-type': 'text/plain' }, { 'content-encoding': 'gzip' }]) assert.equal((await call(message(), { headers })).status, 415);
  assert.equal((await call(message(), { headers: { accept: 'text/event-stream;q=0.5, application/json; q=1', 'content-type': 'application/json; charset=UTF-8' } })).status, 200);
  const notification = { jsonrpc: '2.0', method: 'notifications/initialized' };
  const rejected = await call(notification); assert.equal(rejected.status, 400); assert.equal(rejected.text, '');
  const big = await call(message(), { raw: 'x'.repeat(mcpLimits.bodyBytes + 1) }); assert.equal(big.status, 413);
  const chunkedBig = await call(message(), { raw: 'x'.repeat(mcpLimits.bodyBytes + 1), headers: { 'transfer-encoding': 'chunked' } }); assert.equal(chunkedBig.status, 413);
  const declaredBig = await call(message(), { headers: { 'content-length': String(mcpLimits.bodyBytes + 1) } }); assert.equal(declaredBig.status, 413);
  assert.equal((await call(message(), { headers: { 'x-extra': 'x'.repeat(17000) } })).status, 431);
});

test('exact host/origin policy permits key-free native clients and only configured browsers, never forwarded-host widening', async t => {
  const { call } = await server(t, { environment: { VERCEL_URL: 'fixture.vercel.app', MCP_ALLOWED_ORIGINS: 'https://client.example' } });
  for (const headers of [{}, { origin: 'https://searchsdk.dev' }, { origin: 'https://client.example' }, { host: 'fixture.vercel.app', origin: 'https://fixture.vercel.app' }]) assert.equal((await call(message(), { headers })).status, 200);
  for (const headers of [{ origin: 'null' }, { origin: '' }, { origin: 'https://evil.example' }, { origin: 'https://searchsdk.dev.evil.example' },
    { host: 'evil.example', 'x-forwarded-host': 'searchsdk.dev' }, { host: '127.0.0.1:5173' }, { origin: 'http://searchsdk.dev' }]) {
    const response = await call(message(), { headers }); assert.equal(response.status, 403); assert.equal(response.headers['access-control-allow-origin'], undefined);
  }
  const preflight = await call(undefined, { method: 'OPTIONS', headers: { origin: 'https://client.example', 'access-control-request-method': 'POST', 'access-control-request-headers': 'content-type,mcp-method,mcp-name,mcp-protocol-version' } });
  assert.equal(preflight.status, 204); assert.equal(preflight.text, ''); assert.equal(preflight.headers['access-control-allow-origin'], 'https://client.example');
  assert.equal(preflight.headers['access-control-allow-credentials'], undefined);
  assert.equal((await call(message(), { method: 'OPTIONS', headers: { 'access-control-request-headers': 'authorization' } })).status, 400);
  const local = await server(t, { development: true });
  assert.equal((await local.call(message(), { headers: { host: 'localhost:5173', origin: 'http://localhost:5173' } })).status, 200);
  assert.equal((await call(message(), { path: '/mcp?url=https://example.com' })).status, 404);
});

test('tools cannot fetch caller URLs, use keys, execute examples, mutate files, or escape the public catalog', async t => {
  const { call } = await server(t);
  const previous = globalThis.fetch;
  globalThis.fetch = () => { throw new Error('Unexpected network access.'); };
  t.after(() => { globalThis.fetch = previous; });
  for (const request of [tool('get_doc', { slug: '../../AGENTS.md' }), tool('get_doc', { slug: 'https://example.com' }),
    tool('get_doc', { slug: '', apiKey: 'synthetic-secret' }), tool('list_providers', { url: 'http://169.254.169.254/' }),
    tool('get_example', { id: 'example-00', execute: true }), tool('search_docs', { query: 'anything', code: 'process.exit()' }),
    tool('search_docs', { query: ' ', limit: 5 }), tool('search_docs', { query: 'docs', limit: 11 })]) {
    const response = await call(request); assert.equal(response.status, 200); assert.equal(response.body.result.isError, true);
    assert.equal(response.text.includes('synthetic-secret'), false);
  }
  for (const name of ['execute', 'search_web', 'fetch', 'toString', '__proto__']) assert.equal((await call(tool(name))).body.error.code, -32602);
  for (const uri of ['file:///etc/passwd', 'https://example.com', 'searchsdk://docs/../AGENTS.md', 'searchsdk://docs/%2e%2e', 'searchsdk://docs/index?url=https://example.com']) {
    const response = await call(message('resources/read', { uri })); assert.equal(response.body.error.code, -32602);
  }
  for (const headers of [{ authorization: 'Bearer synthetic-secret' }, { cookie: 'key=synthetic-secret' }]) {
    const response = await call(message(), { headers }); assert.equal(response.status, 400); assert.equal(response.text.includes('synthetic-secret'), false);
  }
  assert.equal((await call(tool('get_example', { id: 'example-00' }))).body.result.structuredContent.code, fixture().examples[0].code);
});

test('stable opaque pagination spans all resources/providers/examples and rejects malformed, cross-list, and stale cursors', async t => {
  const { call } = await server(t, { guard: createMcpGuard({ clientBurst: 100 }) });
  let resourceCursor;
  for (const kind of ['resources', 'providers', 'examples']) {
    const first = kind === 'resources' ? await call(message('resources/list')) : await call(tool(`list_${kind}`));
    const page = kind === 'resources' ? first.body.result : first.body.result.structuredContent;
    assert.equal(page[kind].length, 50); assert.equal(typeof page.nextCursor, 'string');
    if (kind === 'resources') resourceCursor = page.nextCursor;
    const all = [...page[kind]];
    let cursor = page.nextCursor;
    while (cursor !== undefined) {
      const next = kind === 'resources' ? await call(message('resources/list', { cursor })) : await call(tool(`list_${kind}`, { cursor }));
      const nextPage = kind === 'resources' ? next.body.result : next.body.result.structuredContent;
      all.push(...nextPage[kind]); cursor = nextPage.nextCursor;
      assert.ok(all.length <= 167);
    }
    assert.equal(new Set(all.map(row => row.uri ?? row.id)).size, kind === 'resources' ? 167 : 55);
    if (kind === 'examples') assert.ok(all.every(row => row.code === undefined));
    const repeated = kind === 'resources' ? await call(message('resources/list')) : await call(tool(`list_${kind}`));
    assert.equal((kind === 'resources' ? repeated.body.result : repeated.body.result.structuredContent).nextCursor, page.nextCursor);
  }
  for (const cursor of ['', 'not-a-cursor', Buffer.from('["wrong","resources",50]').toString('base64url'), resourceCursor]) {
    const response = await call(tool('list_providers', { cursor })); assert.equal(response.body.result.isError, true);
  }
  const bad = await call(message('resources/list', { cursor: '' })); assert.equal(bad.body.error.code, -32602);
});

test('Skills extension serves atomic official-shaped entries and verifies exact Unicode bytes, digest, and frontmatter', async t => {
  const { call } = await server(t);
  const expected = fixture().skills[0];
  // Direct lookup must work independently of listing or prior discovery.
  const direct = await call(message('skills/get', { uri: skillUri }));
  const listed = await call(message('skills/list'));
  const entry = listed.body.result.skills[0];
  assert.deepEqual(Object.keys(entry).sort(), ['frontmatter', 'resources', 'uri']);
  assert.deepEqual(direct.body.result.skill, entry); assert.deepEqual(entry.frontmatter, expected.frontmatter);
  for (const response of [direct, listed]) {
    assert.equal(response.status, 200); assert.equal(response.body.result.resultType, 'complete');
    assert.equal(response.body.result.ttlMs, 300000); assert.equal(response.body.result.cacheScope, 'public');
  }
  const read = await call(message('resources/read', { uri: skillUri }));
  const bytes = Buffer.from(read.body.result.contents[0].text, 'utf8');
  assert.deepEqual(bytes, Buffer.from(skillText)); assert.equal(bytes.length, entry.resources[0].size);
  assert.equal(`sha256:${createHash('sha256').update(bytes).digest('hex')}`, entry.resources[0].digest);
  assert.ok(bytes.length > skillText.length); // Unicode fixture makes character-vs-byte mistakes observable.
  for (const uri of ['skill://searchsdk/../SKILL.md', 'skill://searchsdk/%2e%2e/SKILL.md', 'skill://other/SKILL.md', 'skill://searchsdk/SKILL.md?query=1']) {
    for (const method of ['skills/get', 'resources/read']) assert.equal((await call(message(method, { uri }))).body.error.code, -32602);
  }
  assert.equal((await call(message('skills/list', { cursor: 'invalid' }))).body.error.code, -32602);
  for (const mutate of [data => { data.skills[0].files[0].text += '\n'; }, data => { data.skills[0].resources[0].size--; },
    data => { data.skills[0].resources[0].digest = 'sha256:' + '0'.repeat(64); }, data => { data.skills[0].frontmatter.description = 'different'; },
    data => { data.skills[0].resources.push({ ...data.skills[0].resources[0] }); }]) {
    const data = fixture(); mutate(data); assert.throws(() => createMcpCatalog(data), /skill/i);
  }
});

test('token buckets bound admission, refill, concurrency, map growth, and produce Retry-After without trusting client headers', async t => {
  let time = 0;
  const guard = createMcpGuard({ now: () => time, maximumActive: 1, maximumBuckets: 2, clientBurst: 1, clientPerMinute: 60, globalBurst: 3, globalPerMinute: 60 });
  const first = guard.enter('a'); assert.equal(typeof first.release, 'function');
  assert.equal(guard.enter('b').retryAfter, 1); first.release(); first.release();
  assert.equal(guard.enter('a').retryAfter, 1);
  const second = guard.enter('b'); second.release();
  assert.equal(guard.enter('c').retryAfter, 60); time = 1000;
  const refill = guard.enter('a'); assert.equal(typeof refill.release, 'function'); refill.release();
  time = 61000; const expired = guard.enter('c'); assert.equal(typeof expired.release, 'function'); expired.release();
  const { call } = await server(t, { guard: createMcpGuard({ clientBurst: 1 }) });
  assert.equal((await call()).status, 200);
  const limited = await call(message(), { headers: { 'x-forwarded-for': 'different-address' } });
  assert.equal(limited.status, 429); assert.equal(limited.headers['retry-after'], '1');
  assert.equal(limited.body.error.code, -31029); assert.match(limited.text, /instance/);
});

test('body deadlines, disconnected uploads, slow local loading, and response bounds release capacity', async t => {
  const { http, call } = await server(t, { totalMs: 50, guard: createMcpGuard({ maximumActive: 1, clientBurst: 100 }) });
  const upload = () => request({ hostname: '127.0.0.1', port: http.address().port, path: '/mcp', method: 'POST',
    headers: { host: 'searchsdk.dev', accept: 'application/json,text/event-stream', 'content-type': 'application/json', 'mcp-method': 'server/discover', 'mcp-protocol-version': protocolVersion } });
  const timedOut = await new Promise((resolve, reject) => {
    const req = upload(); req.on('error', reject); req.on('response', res => { const chunks = []; res.on('data', chunk => chunks.push(chunk)); res.on('end', () => resolve({ status: res.statusCode, text: Buffer.concat(chunks).toString() })); });
    req.write('{');
  });
  assert.equal(timedOut.status, 408); assert.equal((await call()).status, 200);
  await new Promise(resolve => { const req = upload(); req.on('error', () => resolve()); req.on('socket', socket => socket.once('connect', () => { req.write('{'); req.destroy(); })); });
  // A new independent request can still be served after the transport is gone.
  assert.equal((await call()).status, 200);
  const slow = await server(t, { catalog: new Promise(() => {}), totalMs: 20 });
  assert.equal((await slow.call(tool('get_doc', { slug: '' }))).status, 408);
  const tooLarge = await server(t, { catalog: { get: () => ({ text: 'x'.repeat(mcpLimits.responseBytes) }) } });
  const response = await tooLarge.call(tool('get_doc', { slug: '' }));
  assert.equal(response.status, 500); assert.equal(response.body.error.code, -32603); assert.ok(Buffer.byteLength(response.text) < 1024);
});

test('invalid public snapshots fail closed without leaking filesystem details', async t => {
  const { call } = await server(t, { catalog: undefined, artifact: new URL('./does-not-exist-secret.json', import.meta.url) });
  const response = await call(tool('get_doc', { slug: '' }));
  assert.equal(response.status, 503); assert.equal(response.text.includes('does-not-exist'), false);
  assert.equal(response.text.includes(fileURLToPath(root)), false);
  for (const mutate of [data => { data.docs[0].url = 'file:///private'; }, data => { data.docs.push(data.docs[0]); },
    data => { data.docs[0].text = 'x'.repeat(128 * 1024 + 1); }, data => { data.providers[0].id = '../private'; }]) {
    const data = fixture(); mutate(data); assert.throws(() => createMcpCatalog(data));
  }
});

test('Vite routes both MCP paths and Vercel emits an independently runnable public function in isolated output', async t => {
  const temporary = mkdtempSync(join(tmpdir(), 'searchsdk-mcp-deployment-'));
  t.after(() => rmSync(temporary, { recursive: true, force: true }));
  for (const directory of ['scripts', 'apps/web/server', 'apps/web/dist', 'packages/sdk', 'docs']) mkdirSync(join(temporary, directory), { recursive: true });
  cpSync(new URL('../', import.meta.url), join(temporary, 'apps/web/server'), { recursive: true, filter: source => !source.includes('/test/') });
  cpSync(new URL('scripts/vercel-output.mjs', root), join(temporary, 'scripts/vercel-output.mjs'));
  cpSync(new URL('packages/sdk/src/', root), join(temporary, 'packages/sdk/src'), { recursive: true });
  cpSync(new URL('packages/sdk/tsconfig.json', root), join(temporary, 'packages/sdk/tsconfig.json'));
  writeFileSync(join(temporary, 'packages/sdk/package.json'), '{"type":"module"}');
  symlinkSync(fileURLToPath(new URL('node_modules/', root)), join(temporary, 'node_modules'), 'dir');
  writeFileSync(join(temporary, 'apps/web/dist/route-manifest.json'), JSON.stringify([{ path: '/', file: 'index.html' }]));
  writeFileSync(join(temporary, 'apps/web/dist/index.html'), '<!doctype html><title>Fixture</title>');
  writeFileSync(join(temporary, 'apps/web/dist/mcp-public-data.json'), JSON.stringify(fixture()));
  writeFileSync(join(temporary, 'docs/sdk-alpha.md'), '# Synthetic deployment fixture\n');
  execFileSync(process.execPath, [join(temporary, 'scripts/vercel-output.mjs')], { stdio: 'pipe' });
  const mount = join(temporary, '.vercel/output/functions/api/mcp.func');
  const files = readdirSync(join(mount, 'apps/web/server'));
  assert.deepEqual(files.sort(), ['mcp-data.mjs', 'mcp.mjs', 'request-headers.mjs']);
  assert.equal(existsSync(join(mount, 'packages/sdk')), false); assert.equal(existsSync(join(mount, 'node_modules')), false);
  const config = JSON.parse(readFileSync(join(temporary, '.vercel/output/config.json')));
  const mcpRoute = config.routes.find(route => route.dest === '/api/mcp');
  assert.ok(new RegExp(mcpRoute.src).test('/mcp')); assert.ok(new RegExp(mcpRoute.src).test('/api/mcp'));
  assert.ok(config.routes.indexOf(mcpRoute) < config.routes.findIndex(route => route.handle === 'filesystem'));
  assert.equal(config.routes.find(route => route.headers?.['Content-Type']?.startsWith('text/markdown')).continue, true);
  const entry = await import(pathToFileURL(join(mount, 'index.mjs')));
  const deployed = await server(t, { handler: entry.default });
  assert.equal((await deployed.call(tool('get_doc', { slug: '' }))).body.result.structuredContent.title, 'Index');
  assert.equal((await deployed.call(message('skills/get', { uri: skillUri }))).body.result.skill.uri, skillUri);
  const { playgroundServer } = await import('../vite-plugin.mjs');
  let middleware;
  playgroundServer().configureServer({ middlewares: { use(value) { middleware = value; } } });
  let passed = false; middleware({ url: '/unrelated' }, {}, () => { passed = true; }); assert.equal(passed, true);
  for (const path of ['/mcp', '/api/mcp']) {
    let handled = false;
    middleware({ url: path, headers: { host: 'wrong.example' }, socket: {}, once() {}, off() {} }, {
      setHeader() {}, end() { handled = true; }, once() {}, off() {}, writableEnded: false,
    }, () => assert.fail('MCP route passed through'));
    assert.equal(handled, true);
  }
});

test('generated public artifact, when present, retains source skill bytes and matches every declared resource', async t => {
  const artifact = new URL('../../public/mcp-public-data.json', import.meta.url);
  if (!existsSync(artifact)) return t.skip('Generated public snapshot is verified after the documentation generator runs.');
  const catalog = await loadMcpCatalog(artifact);
  const data = JSON.parse(readFileSync(artifact));
  const skill = data.skills[0];
  assert.deepEqual(Buffer.from(catalog.read(skill.uri).text), readFileSync(new URL('../../public/skills/searchsdk/SKILL.md', import.meta.url)));
  const { call } = await server(t, { catalog, guard: createMcpGuard({ clientBurst: 1000, globalBurst: 1000 }) });
  for (const doc of data.docs) {
    const response = await call(tool('get_doc', { slug: doc.slug }));
    assert.equal(response.status, 200); assert.equal(response.body.result.isError, false, doc.slug);
    assert.equal(response.body.result.structuredContent.text, doc.text);
    assert.ok(Buffer.byteLength(response.text) <= mcpLimits.responseBytes);
  }
  for (const [kind, toolName] of [['providers', 'get_provider'], ['examples', 'get_example']]) for (const row of data[kind]) {
    const response = await call(tool(toolName, { id: row.id }));
    assert.equal(response.status, 200); assert.equal(response.body.result.isError, false, row.id);
    assert.deepEqual(response.body.result.structuredContent, row);
  }
  for (const kind of ['resources', 'providers', 'examples']) {
    let cursor;
    let count = 0;
    do {
      const page = catalog.page(kind, cursor);
      for (const row of page[kind]) if (kind === 'resources') {
        const response = await call(message('resources/read', { uri: row.uri }));
        assert.equal(response.status, 200); conforms(response.body.result, 'ReadResourceResult');
        assert.equal(Buffer.byteLength(response.body.result.contents[0].text), row.size);
      }
      count += page[kind].length; cursor = page.nextCursor;
    } while (cursor !== undefined);
    assert.equal(count, kind === 'resources' ? data.docs.length + data.providers.length + data.examples.length + 1 : data[kind].length);
  }
});

test('proxy header overhead is accepted while count, individual and aggregate limits remain bounded', async t => {
  const { call } = await server(t);
  const proxy = Object.fromEntries(Array.from({ length: 60 }, (_, i) => [`x-proxy-fixture-${i}`, 'x'.repeat(160)]));
  const good = await call(message(), { headers: proxy });
  assert.equal(good.status, 200);
  assert.equal((await call(message(), { headers: { ...proxy, host: 'wrong.example', 'x-forwarded-host': 'searchsdk.dev' } })).status, 403);
  const excessive = Object.fromEntries(Array.from({ length: 129 }, (_, i) => [`x-extra-${i}`, 'x']));
  assert.equal((await call(message(), { headers: excessive })).status, 431);
  const aggregate = Object.fromEntries(Array.from({ length: 4 }, (_, i) => [`x-wide-${i}`, 'x'.repeat(8500)]));
  assert.equal((await call(message(), { headers: aggregate })).status, 431);
  assert.equal((await call(message(), { headers: { 'x-wide': 'x'.repeat(17000) } })).status, 431);
});
