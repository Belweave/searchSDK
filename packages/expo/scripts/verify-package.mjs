import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const storage = join(root, '.local');
mkdirSync(storage, { recursive: true });
const consumer = mkdtempSync(join(storage, 'consumer-'));
const require = createRequire(import.meta.url);
const tsc = join(dirname(require.resolve('typescript/package.json')), 'bin/tsc');
function run(command, args, cwd = root) {
  const result = spawnSync(command, args, { cwd, encoding: 'utf8', env: { ...process.env, npm_config_cache: join(storage, 'npm-cache') } });
  if (result.status !== 0) throw new Error(`${command} ${args.join(' ')} failed (${result.status}):\n${result.stdout}\n${result.stderr}`);
  return result.stdout;
}
function pack(packageRoot) {
  const parsed = JSON.parse(run(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['pack', '--ignore-scripts', '--json', '--pack-destination', consumer], packageRoot));
  const output = Array.isArray(parsed) ? parsed : Object.values(parsed);
  assert.equal(output.length, 1);
  return output[0];
}
function unpack(filename, destination) {
  mkdirSync(destination, { recursive: true });
  run('tar', ['-xzf', join(consumer, filename), '-C', destination, '--strip-components=1']);
}

let rnRoot;
try { rnRoot = dirname(require.resolve('@belweave/search-sdk-react-native/package.json')); }
catch { rnRoot = resolve(root, '../react-native'); }
assert.ok(existsSync(join(rnRoot, 'dist/index.js')), 'Build the actual React Native sibling before checking Expo packaging.');
let expoRoot = process.env.EXPO_PACKAGE_DIR;
if (!expoRoot) {
  try { expoRoot = dirname(require.resolve('expo/package.json')); }
  catch { expoRoot = join(storage, 'upstream/package'); }
}
expoRoot = resolve(expoRoot);
const expoMeta = JSON.parse(readFileSync(join(expoRoot, 'package.json'), 'utf8'));
assert.equal(expoMeta.name, 'expo');
assert.match(expoMeta.version, /^(55|56|57)\./);
const expoWeb = join(expoRoot, 'src/winter/fetch/fetch.web.ts');
// Metro selects this platform-specific official implementation on web. Node's
// hook substitutes only Metro resolution, executing the upstream source as-is.
assert.match(readFileSync(expoWeb, 'utf8'), /export const fetch = globalThis\.fetch/);
const artifact = pack(root);
assert.ok(artifact.files.some(file => file.path === 'dist/index.js'));
assert.ok(artifact.files.some(file => file.path === 'dist/index.d.ts'));
assert.ok(artifact.files.some(file => file.path === 'LICENSE'));
assert.ok(artifact.files.some(file => file.path === 'examples/app/App.tsx'));
assert.ok(artifact.files.every(file => !/(^|\/)(test|scripts|\.local|node_modules)(\/|$)/.test(file.path)));
const installed = join(consumer, 'node_modules/@belweave/search-sdk-expo');
unpack(artifact.filename, installed);
const nativeArtifact = pack(rnRoot);
unpack(nativeArtifact.filename, join(consumer, 'node_modules/@belweave/search-sdk-react-native'));
const metadata = JSON.parse(readFileSync(join(installed, 'package.json'), 'utf8'));
for (const field of ['main', 'module', 'react-native', 'types']) assert.ok(existsSync(join(installed, metadata[field])), field);
assert.equal(metadata.exports['.']['react-native'], metadata['react-native']);
assert.equal(metadata.exports['.'].browser, metadata.module);
assert.equal(metadata.exports['.'].import, metadata.module);
assert.equal(metadata.dependencies, undefined);
assert.equal(metadata.peerDependenciesMeta.expo.optional, true);
assert.deepEqual(Object.keys(metadata.peerDependencies).sort(), ['@belweave/search-sdk-react-native', 'expo']);
assert.equal(readFileSync(join(installed, 'LICENSE'), 'utf8'), readFileSync(resolve(root, '../../LICENSE'), 'utf8'));
writeFileSync(join(consumer, 'package.json'), JSON.stringify({ private: true, type: 'module' }));
writeFileSync(join(consumer, 'run.mjs'), `
import { registerHooks } from 'node:module';
import { pathToFileURL } from 'node:url';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const expoWeb = ${JSON.stringify(expoWeb)};
const expoUrl = pathToFileURL(expoWeb).href;
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === 'expo/fetch') return { url: expoUrl, shortCircuit: true };
    if (specifier === 'react-native') return { url: new URL('./react-native-web.mjs', import.meta.url).href, shortCircuit: true };
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (url === expoUrl) return { format: 'module', source: readFileSync(expoWeb, 'utf8'), shortCircuit: true };
    return nextLoad(url, context);
  },
});
let calls = 0;
globalThis.fetch = async (url, init) => {
  calls++;
  assert.equal(url, 'https://gateway.example.test/search');
  assert.equal(new Headers(init.headers).get('authorization'), 'Bearer ephemeral');
  assert.equal(init.redirect, 'error');
  assert.equal(init.credentials, 'omit');
  return new Response(JSON.stringify({ provider: 'fixture', results: [], usage: null, warnings: [], attempts: [] }), { headers: { 'X-SearchSDK-Protocol': '1' } });
};
const { createExpoSearchClient, SearchError } = await import('@belweave/search-sdk-expo');
assert.equal(SearchError, (await import('@belweave/search-sdk-react-native')).SearchError);
const client = createExpoSearchClient({ endpoint: 'https://gateway.example.test/search', accessToken: () => 'ephemeral' });
assert.equal((await client.web.search({ query: 'packed consumer' })).provider, 'fixture');
assert.equal((await client.web.searchBatch([{ query: 'one' }, { query: 'two' }], { concurrency: 2 })).length, 2);
assert.equal(calls, 3);
`);
run(process.execPath, ['run.mjs'], consumer);
// Metro's web target can assert both browser and react-native. The browser
// branch must win at the Expo boundary; the sibling may still import RN's web
// registry but must not select or invoke a native transport with our override.
writeFileSync(join(consumer, 'react-native-web.mjs'), `export const NativeModules = new Proxy({}, { get() { throw new Error('Web entry attempted to use a native module'); } });`);
run(process.execPath, ['--conditions=browser', '--conditions=react-native', 'run.mjs'], consumer);
writeFileSync(join(consumer, 'native-module.mjs'), `
const fixture = { provider: 'fixture', results: [], usage: null, warnings: [], attempts: [] };
export const NativeModules = { SearchSDKGateway: {
  async request(id, endpoint, headers, body, maxBytes, timeoutMs) {
    if (headers.Authorization !== 'Bearer ephemeral' || JSON.parse(body).query !== 'native packed consumer') throw new Error('Native packed consumer mismatch');
    if (maxBytes !== 4096 || !(timeoutMs > 0 && timeoutMs <= 1000)) throw new Error('Native limits mismatch');
    return { status: 200, headers: { 'X-SearchSDK-Protocol': '1' }, url: endpoint, bodyBase64: Buffer.from(JSON.stringify(fixture)).toString('base64') };
  }, cancel() {},
} };
`);
writeFileSync(join(consumer, 'run.native.mjs'), `
import { registerHooks } from 'node:module';
import assert from 'node:assert/strict';
registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier === 'expo/fetch') throw new Error('Native package condition loaded Expo fetch');
  if (specifier === 'react-native') return { url: new URL('./native-module.mjs', import.meta.url).href, shortCircuit: true };
  return nextResolve(specifier, context);
} });
const { createExpoSearchClient } = await import('@belweave/search-sdk-expo');
const client = createExpoSearchClient({ endpoint: 'https://gateway.example.test/search', accessToken: () => 'ephemeral', maxResponseBytes: 4096, timeoutMs: 1000 });
assert.equal((await client.web.search({ query: 'native packed consumer' })).provider, 'fixture');
`);
run(process.execPath, ['--conditions=react-native', 'run.native.mjs'], consumer);
writeFileSync(join(consumer, 'consumer.ts'), `
import { createExpoSearchClient, SearchError, type ExpoSearchClientOptions, type ExpoSearchClient } from '@belweave/search-sdk-expo';
const options: ExpoSearchClientOptions = { endpoint: 'https://gateway.example.test/search', accessToken: async () => 'ephemeral', timeoutMs: 500, maxResponseBytes: 4096, maxConcurrency: 2 };
const client: ExpoSearchClient = createExpoSearchClient(options);
const controller = new AbortController();
await client.web.search({ query: 'hello', includeDomains: ['example.test'], limit: 3 }, { signal: controller.signal });
const outcomes = await client.web.searchBatch([{ query: 'a' }], { signal: controller.signal, concurrency: 2, timeoutMs: 500 });
for (const result of outcomes) { if (result.status === 'fulfilled') result.value.results; else result.error.code; }
new SearchError('aborted');
// @ts-expect-error Provider keys must never be accepted by an application client.
createExpoSearchClient({ endpoint: options.endpoint, apiKey: 'forbidden' });
// @ts-expect-error Native provider operations are intentionally absent.
client.native;
// @ts-expect-error Unsupported request fields must fail at the type boundary.
client.web.search({ query: 'q', provider: 'exa' });
`);
writeFileSync(join(consumer, 'tsconfig.json'), JSON.stringify({
  compilerOptions: { target: 'ES2022', module: 'NodeNext', moduleResolution: 'NodeNext', lib: ['ES2022', 'DOM'], strict: true, skipLibCheck: true, noEmit: true },
  include: ['consumer.ts'],
}));
run(process.execPath, [tsc, '-p', join(consumer, 'tsconfig.json')], consumer);
// A second consumer uses Metro's export conditions and TypeScript resolution.
writeFileSync(join(consumer, 'tsconfig.metro.json'), JSON.stringify({
  extends: './tsconfig.json', compilerOptions: { module: 'ESNext', moduleResolution: 'Bundler', customConditions: ['react-native'] },
}));
run(process.execPath, [tsc, '-p', join(consumer, 'tsconfig.metro.json')], consumer);
console.log(`Packed consumer passed: ${artifact.filename}; actual RN artifact; Expo ${expoMeta.version} web fetch; native export/bridge integration; NodeNext and Metro/Bundler types. Native devices were not exercised.`);
