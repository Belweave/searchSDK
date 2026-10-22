import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer, request } from 'node:http';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, cpSync, symlinkSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createPlaygroundHandler } from '../playground.mjs';
import { guardedTransport, providerEndpoints, supportedProviders, loadSdk } from '../providers.mjs';
import { createAbuseGuard, limits, redactor, sanitizeResponse, trustedOrigins } from '../security.mjs';

// Private compiler output: never races the site's shared packages/sdk/dist build.
const temporary = mkdtempSync(join(tmpdir(), 'searchsdk-playground-'));
const root = new URL('../../../../', import.meta.url);
execFileSync(process.execPath, [fileURLToPath(new URL('node_modules/typescript/bin/tsc', root)),
  '-p', fileURLToPath(new URL('packages/sdk/tsconfig.json', root)), '--outDir', temporary, '--declaration', 'false'], { stdio: 'pipe' });
writeFileSync(join(temporary, 'package.json'), JSON.stringify({ type: 'module' }));
const sdkDirectory = pathToFileURL(`${temporary}/`);
after(() => rmSync(temporary, { recursive: true, force: true }));
const key = 'synthetic-primary-credential';
const fallbackKey = 'synthetic-fallback-credential';
const base = { query: 'deterministic fixture', limit: 3, provider: 'exa', apiKey: key };
const row = { url: 'https://example.com/result', title: 'Fixture result', description: 'Fixture snippet',
  snippet: 'Fixture snippet', content: 'Fixture snippet', highlights: ['Fixture highlight'], excerpts: ['Fixture excerpt'] };
const fixtures = {
  context: { results: [row] }, tinyfish: { results: [row] }, exa: { results: [row] }, tavily: { results: [row] },
  brave: { web: { results: [row] } }, perplexity: { results: [row] }, parallel: { results: [row] },
  linkup: { results: [{ ...row, name: 'Fixture name', type: 'text' }] }, firecrawl: { success: true, data: { web: [row] } },
  you: { results: { web: [row] } }, serper: { organic: [{ ...row, link: row.url }] }, valyu: { success: true, results: [row] },
};
const json = value => new Response(JSON.stringify(value), { headers: { 'content-type': 'application/json' } });
async function server(t, options = {}) {
  const calls = [];
  const upstream = options.upstream ?? (async (url, init) => { calls.push({ url, init }); return json(fixtures.exa); });
  const handler = options.handler ?? createPlaygroundHandler({ sdkDirectory, environment: {}, ...options, upstream });
  const http = createServer((req, res) => void handler(req, res));
  await new Promise(resolve => http.listen(0, '127.0.0.1', resolve));
  t.after(() => { http.closeAllConnections(); return new Promise(resolve => http.close(resolve)); });
  function call(body = base, { method = 'POST', path = '/api/playground/search', headers = {}, raw } = {}) {
    return new Promise((resolve, reject) => {
      const req = request({ hostname: '127.0.0.1', port: http.address().port, path, method,
        headers: { host: 'searchsdk.dev', origin: 'https://searchsdk.dev', 'content-type': 'application/json',
          'x-searchsdk-playground': '1', ...headers } }, res => {
        const chunks = [];
        res.on('data', chunk => chunks.push(chunk));
        res.on('end', () => {
          const text = Buffer.concat(chunks).toString();
          resolve({ status: res.statusCode, headers: res.headers, text, body: JSON.parse(text) });
        });
      });
      req.on('error', reject); req.end(raw ?? JSON.stringify(body));
    });
  }
  return { call, calls, http };
}

test('all 12 allowed adapters normalize synthetic responses through exact fixed endpoints', async t => {
  for (const provider of supportedProviders) await t.test(provider, async t => {
    let calls = 0;
    const { call } = await server(t, { upstream: async (url, init) => {
      calls++;
      assert.equal(url.origin + url.pathname, providerEndpoints[provider][0]);
      assert.equal(init.method, providerEndpoints[provider][1]);
      assert.equal(init.redirect, 'error'); assert.equal(init.credentials, 'omit'); assert.equal(init.cache, 'no-store');
      assert.equal(url.href.includes(key), false);
      assert.equal(url.username, ''); assert.equal(url.password, '');
      assert.equal(new Headers(init.headers).has('cookie'), false);
      assert.ok([...new Headers(init.headers).values()].some(value => value.includes(key)));
      return json(fixtures[provider]);
    } });
    const result = await call({ ...base, provider });
    assert.equal(result.status, 200, result.text); assert.equal(calls, 1);
    assert.equal(result.body.ok, true); assert.equal(result.body.response.provider, provider);
    assert.equal(result.body.response.results.length, 1); assert.equal(result.body.response.attempts.length, 1);
    assert.equal(result.body.response.results[0].provenance.provider, provider);
    assert.equal(result.text.includes(key), false);
    assert.match(result.headers['cache-control'], /no-store/);
    assert.equal(result.headers['vercel-cdn-cache-control'], 'no-store');
    assert.equal(result.headers['x-content-type-options'], 'nosniff');
    assert.equal(result.headers['access-control-allow-origin'], undefined);
  });
});

test('rejects origin spoofing, missing origin/marker, cross-site metadata, cookies and malformed headers before dispatch', async t => {
  const { call, calls } = await server(t);
  const cases = [
    { origin: 'https://evil.example' }, { origin: 'null' }, { origin: '' },
    { origin: 'https://searchsdk.dev.evil.example', host: 'searchsdk.dev.evil.example' },
    { origin: 'https://evil.example', host: 'evil.example', 'x-forwarded-host': 'searchsdk.dev' },
    { origin: 'https://searchsdk.dev', host: 'evil.example' },
    { origin: 'http://searchsdk.dev' }, { 'sec-fetch-site': 'cross-site' }, { 'sec-fetch-site': 'same-site' },
    { 'x-searchsdk-playground': '' }, { 'content-type': 'text/plain' }, { 'content-encoding': 'gzip' },
    { cookie: 'session=synthetic' }, { authorization: 'Bearer synthetic' },
  ];
  for (const headers of cases) {
    const response = await call(base, { headers });
    assert.ok([400, 403].includes(response.status), JSON.stringify(headers));
    assert.equal(response.body.ok, false); assert.deepEqual(response.body.error.attempts, []);
    assert.equal(response.headers['access-control-allow-origin'], undefined);
  }
  assert.equal(calls.length, 0);
});

test('trusts only exact operator-configured deployment origins and explicit loopback development', async t => {
  assert.deepEqual([...trustedOrigins({ VERCEL_URL: 'evil.example', VERCEL_BRANCH_URL: 'https://evil.vercel.app',
    VERCEL_PROJECT_PRODUCTION_URL: 'project.vercel.app.evil.example' }, false)], ['https://searchsdk.dev', 'https://www.searchsdk.dev']);
  const deployment = await server(t, { environment: { VERCEL_URL: 'searchsdk-synthetic.vercel.app' } });
  assert.equal((await deployment.call(base, { headers: { origin: 'https://searchsdk-synthetic.vercel.app', host: 'searchsdk-synthetic.vercel.app' } })).status, 200);
  assert.equal((await deployment.call(base, { headers: { origin: 'https://other.vercel.app', host: 'other.vercel.app' } })).status, 403);
  const dev = await server(t, { development: true });
  for (const host of ['127.0.0.1:5173', 'localhost:5173', '[::1]:5173']) {
    assert.equal((await dev.call(base, { headers: { origin: `http://${host}`, host } })).status, 200);
  }
  const prod = await server(t);
  assert.equal((await prod.call(base, { headers: { origin: 'http://localhost:5173', host: 'localhost:5173' } })).status, 403);
  assert.equal((await dev.call(base, { headers: { origin: 'http://localhost:5174', host: 'localhost:5174' } })).status, 403);
});

test('strict schemas exclude URLs, code, native operations, unknown fields, extra fallback and invalid limits', async t => {
  const { call, calls } = await server(t);
  const bad = [null, [], {}, { ...base, url: 'http://169.254.169.254/' }, { ...base, code: 'throw 1' },
    { ...base, operation: 'createTask' }, { ...base, provider: '__proto__' }, { ...base, provider: 'searxng' },
    { ...base, provider: 'wondersearch' }, { ...base, provider: 'https://api.exa.ai' },
    ...[0, -1, 11, 1.5, '3', null].map(limit => ({ ...base, limit })),
    ...['', '   ', 'a'.repeat(501), 'a\u0001b', 'a\u0000b', '\ud800'].map(query => ({ ...base, query })),
    ...['', 'a'.repeat(513), 'a b', 'a\r\nb', 'secreté'].map(apiKey => ({ ...base, apiKey })),
    { ...base, fallback: [] }, { ...base, fallback: null }, { ...base, fallback: { provider: 'exa', apiKey: fallbackKey } },
    { ...base, fallback: { provider: 'brave', apiKey: fallbackKey, url: 'http://localhost' } },
    { ...base, fallback: [{ provider: 'brave', apiKey: fallbackKey }, { provider: 'you', apiKey: fallbackKey }] },
  ];
  for (const body of bad) assert.equal((await call(body)).status, 400, JSON.stringify(body));
  for (const raw of ['{', 'true', '{"query":NaN}', Buffer.from([0xff])]) assert.equal((await call(base, { raw })).status, 400);
  assert.equal((await call({ ...base, provider: 'serpapi' })).body.error.code, 'unsupported_option');
  assert.equal((await call({ ...base, fallback: { provider: 'serpapi', apiKey: fallbackKey } })).body.error.code, 'unsupported_option');
  assert.equal(calls.length, 0);
});

test('multiline query whitespace is normalized before SDK dispatch, original length stays bounded', async t => {
  const { call, calls } = await server(t);
  assert.equal((await call({ ...base, query: '  first\nsecond\tthird\r\nfourth  ' })).status, 200);
  assert.equal(JSON.parse(calls[0].init.body).query, 'first second third fourth');
  assert.equal((await call({ ...base, query: 'a' + '\n'.repeat(500) })).status, 400);
});

test('method, endpoint and streaming body bounds fail closed with no upstream work', async t => {
  const { call, calls } = await server(t);
  for (const method of ['GET', 'PUT', 'DELETE', 'OPTIONS']) {
    const response = await call(base, { method });
    assert.equal(response.status, 405); assert.equal(response.headers.allow, 'POST');
  }
  assert.equal((await call(base, { path: '/api/playground/search?apiKey=synthetic' })).status, 400);
  assert.equal((await call(base, { raw: ' '.repeat(limits.bodyBytes + 1) })).status, 413);
  assert.equal((await call(base, { headers: { 'content-length': String(limits.bodyBytes + 1) } })).status, 413);
  assert.equal(calls.length, 0);
});

test('only explicit transient fallback, at most two attempts, no retries, no auth fallback', async t => {
  let calls = 0;
  const { call } = await server(t, { upstream: async () => { calls++; return calls === 1 ? new Response('PRIVATE RAW BODY', { status: 503 }) : json(fixtures.tavily); } });
  const response = await call({ ...base, fallback: { provider: 'tavily', apiKey: fallbackKey } });
  assert.equal(response.status, 200); assert.equal(calls, 2);
  assert.deepEqual(response.body.response.attempts.map(a => [a.provider, a.outcome]), [['exa', 'error'], ['tavily', 'success']]);
  assert.deepEqual(response.body.response.warnings, [{ code: 'fallback_used', provider: 'tavily' }]);
  let rejectedCalls = 0;
  const auth = await server(t, { upstream: async () => { rejectedCalls++; return new Response(`PRIVATE ${key}`, { status: 401 }); } });
  const rejected = await auth.call({ ...base, fallback: { provider: 'tavily', apiKey: fallbackKey } });
  assert.equal(rejected.status, 401); assert.equal(rejectedCalls, 1); assert.equal(rejected.body.error.attempts.length, 1);
  assert.equal(rejected.text.includes('PRIVATE'), false); assert.equal(rejected.text.includes(key), false);
});

test('redacts primary/fallback keys and encoded forms in text and request IDs, drops unsafe result URLs', async t => {
  const primary = 'credential+"/.*[a]';
  const secondary = 'secondary-synthetic-key';
  const variants = [primary, secondary, encodeURIComponent(primary), encodeURIComponent(primary).replace(/%[A-F0-9]{2}/g, s => s.toLowerCase()), Buffer.from(primary).toString('base64')];
  const reflected = variants.join(' ');
  const { call } = await server(t, { upstream: async () => json({ requestId: secondary, debug: reflected,
    results: [{ ...row, title: reflected, highlights: [reflected] },
      { ...row, url: `https://example.com/?key=${encodeURIComponent(primary)}` }] }) });
  const result = await call({ ...base, apiKey: primary, fallback: { provider: 'tavily', apiKey: secondary } });
  assert.equal(result.status, 200, result.text); assert.equal(result.body.response.results.length, 1);
  assert.equal(result.body.response.results[0].title.includes('•••'), true);
  for (const variant of variants) assert.equal(result.text.includes(variant), false, variant);
  assert.equal(result.text.includes('debug'), false); assert.equal(result.text.includes('username'), false);
  const userinfo = await server(t, { upstream: async () => json({ results: [{ ...row, url: 'https://username:password@example.com/' }] }) });
  const rejected = await userinfo.call(); assert.equal(rejected.status, 502); assert.equal(rejected.text.includes('username'), false);
  const tiny = redactor(['a', '.*[a]']);
  assert.equal(tiny('a .*х[a] .*[a]'), '•••');
});

test('bounded text, result count and upstream decoded size', async t => {
  const largeRow = { ...row, title: 't'.repeat(10000), highlights: Array(50).fill('h'.repeat(10000)) };
  const { call } = await server(t, { upstream: async () => json({ results: Array(2).fill(largeRow) }) });
  const result = await call({ ...base, limit: 1 });
  assert.equal(result.status, 200); assert.equal(result.body.response.results.length, 1);
  assert.equal(result.body.response.results[0].title.length, 512);
  assert.equal(result.body.response.results[0].highlights.length, 5);
  assert.equal(result.body.response.results[0].highlights[0].length, 1000);
  assert.ok(Buffer.byteLength(result.text) <= limits.responseBytes);
  for (const upstream of [async () => new Response('{}', { headers: { 'content-length': String(1024 * 1024 + 1) } }),
    async () => new Response(new ReadableStream({ start(c) { c.enqueue(new Uint8Array(1024 * 1024 + 1)); c.close(); } }))]) {
    const oversized = await server(t, { upstream });
    const rejected = await oversized.call();
    assert.equal(rejected.body.ok, false); assert.equal(rejected.status, 502);
    assert.equal(rejected.body.error.attempts.length, 1);
  }
});

test('outbound exact-host/path/method allowlist, no URL credentials, redirects rejected', async t => {
  const sdk = await loadSdk(sdkDirectory);
  let calls = 0;
  const transport = guardedTransport('exa', async () => { calls++; return json(fixtures.exa); }, sdk.SearchError);
  for (const url of ['https://api.exa.ai.evil.example/search', 'http://api.exa.ai/search', 'https://api.exa.ai:8443/search',
    'https://user:pass@api.exa.ai/search', 'https://api.exa.ai/contents', 'http://169.254.169.254/',
    'https://api.exa.ai/search?api_key=synthetic', 'https://api.exa.ai/search#fragment']) {
    await assert.rejects(transport(url, { method: 'POST' }));
  }
  await assert.rejects(transport('https://api.exa.ai/search', { method: 'DELETE' })); assert.equal(calls, 0);
  const redirect = await server(t, { upstream: async (url, init) => {
    assert.equal(init.redirect, 'error'); return new Response(null, { status: 302, headers: { location: 'http://169.254.169.254/' } });
  } });
  assert.equal((await redirect.call()).status, 502);
});

test('generic errors omit thrown secrets and raw invalid provider body', async t => {
  for (const upstream of [async () => { throw new Error(`PRIVATE ${key}`); },
    async () => new Response(`PRIVATE ${key}`), async () => json({ error: `PRIVATE ${key}` })]) {
    const { call } = await server(t, { upstream }); const response = await call();
    assert.equal(response.status, 502); assert.equal(response.text.includes('PRIVATE'), false);
    assert.equal(response.text.includes(key), false); assert.equal(response.body.error.attempts.length, 1);
  }
});

test('attempt and whole-call deadlines bound signal-ignoring upstream; timeout fallback is explicit', async t => {
  let calls = 0;
  const { call } = await server(t, { attemptMs: 40, totalMs: 300, upstream: async () => {
    calls++; return calls === 1 ? new Promise(() => {}) : json(fixtures.tavily);
  } });
  const result = await call({ ...base, fallback: { provider: 'tavily', apiKey: fallbackKey } });
  assert.equal(result.status, 200); assert.equal(calls, 2);
  assert.equal(result.body.response.attempts[0].code, 'attempt_timeout');
  const whole = await server(t, { attemptMs: 200, totalMs: 60, upstream: async () => new Promise(() => {}) });
  const start = performance.now(); const timeout = await whole.call();
  assert.equal(timeout.status, 504); assert.ok(performance.now() - start < 1000);
  assert.equal(timeout.body.error.attempts.length, 1);
});

test('client disconnect propagates cancellation to upstream and releases concurrency', async t => {
  let started;
  let cancelled;
  const dispatched = new Promise(resolve => { started = resolve; });
  const aborted = new Promise(resolve => { cancelled = resolve; });
  const { http, call } = await server(t, { abuse: createAbuseGuard({ maximumActive: 1 }), upstream: async (_url, init) => {
    if (init.signal.aborted) cancelled(); else init.signal.addEventListener('abort', cancelled, { once: true });
    started(); return new Promise(() => {});
  } });
  const req = request({ hostname: '127.0.0.1', port: http.address().port, path: '/api/playground/search', method: 'POST',
    headers: { host: 'searchsdk.dev', origin: 'https://searchsdk.dev', 'content-type': 'application/json', 'x-searchsdk-playground': '1' } });
  req.on('error', () => {}); req.end(JSON.stringify(base));
  await dispatched; req.destroy();
  await Promise.race([aborted, new Promise((_, reject) => setTimeout(() => reject(new Error('Upstream not aborted')), 500))]);
  await new Promise(resolve => setTimeout(resolve, 10));
  assert.equal((await call({ ...base, provider: 'serpapi' })).status, 400);
});

test('fixed-memory key buckets and instance caps release concurrency and do not retain raw keys', async () => {
  let time = 0;
  const guard = createAbuseGuard({ now: () => time, maximumActive: 1, maximumRequests: 3, perKeyActive: 1, perKeyRequests: 2, maximumBuckets: 1 });
  const first = guard.enter(); assert.equal(typeof first, 'function'); assert.equal(guard.enter(), undefined); first(); first();
  const third = guard.enter(); assert.equal(typeof third, 'function'); third(); assert.equal(guard.enter(), undefined);
  const a = guard.keys([base]); assert.equal(typeof a, 'function'); assert.equal(guard.keys([base]), undefined); a(); a();
  const b = guard.keys([base]); assert.equal(typeof b, 'function'); b(); assert.equal(guard.keys([base]), undefined);
  assert.equal(guard.keys([{ provider: 'exa', apiKey: fallbackKey }]), undefined);
  time += 60001;
  const reset = guard.keys([{ provider: 'exa', apiKey: fallbackKey }]); assert.equal(typeof reset, 'function'); reset();
  assert.equal(typeof guard.enter(), 'function');
});

test('server rate limiting dispatches no excess request and stores no successful search cache', async t => {
  const { call, calls } = await server(t, { abuse: createAbuseGuard({ perKeyRequests: 2 }) });
  assert.equal((await call()).status, 200); assert.equal((await call()).status, 200);
  const rejected = await call(); assert.equal(rejected.status, 429); assert.deepEqual(rejected.body.error.attempts, []);
  assert.equal(calls.length, 2);
});

test('Build Output v3 function is self-contained, Node24, keeps static security headers and excludes tests', async t => {
  const fixtureRoot = join(temporary, 'deployment-fixture');
  const put = (name, content) => { const file = join(fixtureRoot, name); mkdirSync(join(file, '..'), { recursive: true }); writeFileSync(file, content); };
  put('package.json', JSON.stringify({ private: true, type: 'module' }));
  put('apps/web/dist/route-manifest.json', JSON.stringify([{ path: '/', file: 'index.html', notFound: false }]));
  put('apps/web/dist/index.html', '<!doctype html><title>Synthetic deployment fixture</title>');
  put('apps/web/dist/404.html', '<!doctype html><title>Not found</title>');
  // The shared packager also copies the independent MCP mount. This test
  // exercises only the playground; mcp.test.mjs validates its own full catalog.
  put('apps/web/dist/mcp-public-data.json', JSON.stringify({ schemaVersion: 1, docs: [], providers: [], examples: [], skills: [] }));
  put('docs/sdk-alpha.md', '# Synthetic guide');
  mkdirSync(join(fixtureRoot, 'scripts'), { recursive: true });
  cpSync(new URL('scripts/vercel-output.mjs', root), join(fixtureRoot, 'scripts/vercel-output.mjs'));
  cpSync(new URL('apps/web/server/', root), join(fixtureRoot, 'apps/web/server'), { recursive: true });
  cpSync(new URL('packages/sdk/src/', root), join(fixtureRoot, 'packages/sdk/src'), { recursive: true });
  cpSync(new URL('packages/sdk/tsconfig.json', root), join(fixtureRoot, 'packages/sdk/tsconfig.json'));
  mkdirSync(join(fixtureRoot, 'node_modules'), { recursive: true });
  symlinkSync(fileURLToPath(new URL('node_modules/typescript/', root)), join(fixtureRoot, 'node_modules/typescript'));
  execFileSync(process.execPath, [join(fixtureRoot, 'scripts/vercel-output.mjs')], { cwd: fixtureRoot, stdio: 'pipe' });
  const output = join(fixtureRoot, '.vercel/output');
  const functionDirectory = join(output, 'functions/api/playground/search.func');
  const config = JSON.parse(readFileSync(join(output, 'config.json')));
  assert.equal(config.version, 3);
  assert.equal(config.routes[0].headers['X-Content-Type-Options'], 'nosniff');
  assert.match(config.routes[0].headers['Content-Security-Policy'], /connect-src 'self'/);
  assert.ok(config.routes.find(route => route.src === '^/api/playground/search$'));
  const runtime = JSON.parse(readFileSync(join(functionDirectory, '.vc-config.json')));
  assert.equal(runtime.runtime, 'nodejs24.x'); assert.equal(runtime.launcherType, 'Nodejs'); assert.equal(runtime.handler, 'index.mjs');
  assert.equal(existsSync(join(functionDirectory, 'packages/sdk/dist/exa.js')), true);
  assert.equal(existsSync(join(functionDirectory, 'apps/web/server/test/playground.test.mjs')), false);
  assert.equal(existsSync(join(output, 'static/apps/web/server/playground.mjs')), false);
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => json(fixtures.exa);
    const { default: handler } = await import(pathToFileURL(join(functionDirectory, 'index.mjs')).href);
    const { call } = await server(t, { handler });
    const result = await call(); assert.equal(result.status, 200, result.text); assert.equal(result.body.response.provider, 'exa');
  } finally { globalThis.fetch = originalFetch; }
});

test('incomplete request timeout and mid-body disconnect release capacity before SDK dispatch', async t => {
  const fixture = await server(t, { totalMs: 80, abuse: createAbuseGuard({ maximumActive: 1 }) });
  const { http, call, calls } = fixture;
  const options = { hostname: '127.0.0.1', port: http.address().port, path: '/api/playground/search', method: 'POST',
    headers: { host: 'searchsdk.dev', origin: 'https://searchsdk.dev', 'content-type': 'application/json', 'x-searchsdk-playground': '1' } };
  const timeout = await new Promise((resolve, reject) => {
    const req = request(options, res => { res.resume(); res.on('end', () => { resolve(res.statusCode); req.destroy(); }); });
    req.on('error', reject); req.write('{');
  });
  assert.equal(timeout, 408); assert.equal(calls.length, 0);
  const req = request(options); req.on('error', () => {}); req.write('{');
  await new Promise(resolve => setTimeout(resolve, 10)); req.destroy();
  await new Promise(resolve => setTimeout(resolve, 10));
  assert.equal(calls.length, 0);
  assert.equal((await call()).status, 200);
});

// SEC-R1-01: URL destinations are untrusted even when React renders them safely.
function fullPercent(value, mixedCase = false) {
  return [...value].map((character, index) => {
    const hex = character.charCodeAt(0).toString(16).padStart(2, '0');
    return '%' + (mixedCase && index % 2 ? hex.toUpperCase() : hex);
  }).join('');
}
function nestedPercent(value, depth) {
  let encoded = fullPercent(value, true);
  for (let pass = 1; pass < depth; pass++) encoded = encodeURIComponent(encoded);
  return encoded;
}

test('SEC-R1-01 drops fully/partially/mixed/nested percent-encoded primary and fallback keys in URL paths and querystrings', async t => {
  const primary = 'synthetic-review-key-A1B2C3';
  const secondary = 'synthetic-fallback-key-D4E5F6';
  let payload;
  const { call } = await server(t, { abuse: createAbuseGuard({ perKeyRequests: 100 }), upstream: async () => json(payload) });
  for (const credential of [primary, secondary]) {
    const forms = [credential, fullPercent(credential), fullPercent(credential, true),
      [...credential].map((character, index) => index % 3 ? character : fullPercent(character, true)).join(''),
      nestedPercent(credential, 2), nestedPercent(credential, limits.percentDecodePasses),
      nestedPercent(credential, limits.percentDecodePasses + 1)];
    for (const encoded of forms) {
      const reflected = `prefix ${encoded} suffix`;
      payload = { results: [
        { ...row, title: reflected, highlights: [reflected] },
        { ...row, url: `https://untrusted.test/collect/${encoded}/end` },
        { ...row, url: `https://untrusted.test/collect?key=${encoded}` },
      ] };
      const result = await call({ ...base, apiKey: primary, fallback: { provider: 'tavily', apiKey: secondary } });
      assert.equal(result.status, 200, result.text);
      assert.equal(result.body.response.results.length, 1, encoded);
      assert.equal(result.body.response.results[0].url, row.url);
      assert.equal(result.body.response.results[0].title.includes('•••'), true);
      assert.equal(result.body.response.results[0].highlights[0].includes('•••'), true);
      assert.equal(result.text.includes(credential), false);
      assert.equal(result.text.includes(encoded), false, encoded);
      assert.equal(result.text.includes('untrusted.test'), false);
      assert.ok(Buffer.byteLength(result.text) <= limits.responseBytes);
    }
  }
});

test('SEC-R1-01 scans full fields before clipping and handles malformed escapes adjacent to encoded credentials', async t => {
  const credential = 'synthetic-percent-key-G7H8I9';
  const secondary = 'synthetic-other-key-J1K2L3';
  const encoded = fullPercent(credential, true);
  const { call } = await server(t, { upstream: async () => json({ results: [{ ...row,
    title: 'x'.repeat(600) + encoded, content: `%zz %q1 %0 ${encoded} tail`, request_id: encoded }] }) });
  const result = await call({ ...base, provider: 'tavily', apiKey: credential, fallback: { provider: 'exa', apiKey: secondary } });
  assert.equal(result.status, 200, result.text);
  assert.equal(result.body.response.results[0].title, '•••');
  assert.equal(result.body.response.results[0].snippet, '•••');
  assert.equal(result.text.includes(encoded), false);
  assert.equal(result.text.includes('request_id'), false);
});

test('SEC-R1-01 inspects provenance source URLs and normalized hostnames and fails closed beyond bounded decode depth', () => {
  const credential = 'synthetic-source-key-M4N5O6';
  const redact = redactor([credential, fallbackKey]);
  const response = sourceUrl => ({ provider: 'exa', usage: null, warnings: [], attempts: [],
    results: [{ url: row.url, title: 'safe', provenance: { provider: 'exa', sourceUrl, retrievedAt: new Date().toISOString() } }] });
  for (const encoded of [fullPercent(credential, true), nestedPercent(fallbackKey, 3)]) {
    assert.equal(sanitizeResponse(response(`https://untrusted.test/${encoded}`), redact).results.length, 0);
    assert.equal(sanitizeResponse(response(`https://untrusted.test/?key=${encoded}`), redact).results.length, 0);
  }
  const hostCredential = 'host-credential';
  assert.equal(sanitizeResponse(response('https://HOST-CREDENTIAL.untrusted.test/'), redactor([hostCredential])).results.length, 0);
  const innocent = 'https://example.com/a%20b?message=%E2%9C%93';
  assert.equal(sanitizeResponse(response(innocent), redact).results[0].provenance.sourceUrl, innocent);
  const deepInnocent = nestedPercent('innocent', limits.percentDecodePasses + 1);
  assert.equal(redact(deepInnocent), '•••');
  assert.equal(redact('x'.repeat(limits.redactionCharacters + 1)), '•••');
  assert.equal(redact('%zz ordinary malformed escape'), '%zz ordinary malformed escape');
  // A literal % in a submitted key is not recursively decoded as configuration.
  assert.equal(redactor(['literal%61-key'])(fullPercent('literal%61-key')), '•••');
});


test('overlapping, contained, and identical credentials never expose a suffix', async t => {
  const cases = [
    ['overlap-ABC', 'ABC-tail-secret', 'overlap-ABC-tail-secret'],
    ['ABC-tail-secret', 'overlap-ABC', 'overlap-ABC-tail-secret'],
    ['prefix-contained-secret-suffix', 'contained-secret', 'prefix-contained-secret-suffix'],
    ['same-synthetic-key', 'same-synthetic-key', 'prefix same-synthetic-key suffix'],
  ];
  for (const [primary, fallback, reflected] of cases) {
    const { call } = await server(t, { upstream: async () => json({ results: [
      { ...row, title: reflected, highlights: [reflected] },
      { ...row, url: `https://example.com/${encodeURIComponent(reflected)}` },
    ] }) });
    const result = await call({ ...base, apiKey: primary, fallback: { provider: 'tavily', apiKey: fallback } });
    assert.equal(result.status, 200);
    assert.equal(result.body.response.results.length, 1);
    assert.equal(result.body.response.results[0].title, '•••');
    assert.deepEqual(result.body.response.results[0].highlights, ['•••']);
    assert.equal(result.text.includes('tail-secret'), false);
  }
});
