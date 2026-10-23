import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
mkdirSync(resolve(root, '.local'), { recursive: true });
const scratch = mkdtempSync(resolve(root, '.local/package-consumer-'));
const run = (command, args, cwd = scratch) => execFileSync(command, args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
const packedOutput = JSON.parse(run('npm', ['pack', '--json', '--ignore-scripts', '--workspaces=false', '--pack-destination', scratch], root));
const [packed] = Array.isArray(packedOutput) ? packedOutput : Object.values(packedOutput);
const paths = new Set(packed.files.map(file => file.path));
for (const path of ['dist/index.js', 'dist/index.d.ts', 'dist/react-native.js', 'dist/native-transport.js', 'LICENSE', 'README.md',
  'examples/consumer.ts', 'react-native.config.cjs', 'SearchSDKReactNative.podspec', 'ios/GatewayTransport.swift', 'ios/SearchSDKGateway.swift',
  'ios/SearchSDKGateway.m', 'android/build.gradle', 'android/consumer-rules.pro', 'android/src/main/AndroidManifest.xml',
  'android/src/main/java/dev/belweave/searchsdk/SearchSDKGatewayModule.java', 'android/src/main/java/dev/belweave/searchsdk/SearchSDKPackage.java']) {
  assert.ok(paths.has(path), `Packed file missing: ${path}`);
}
assert.ok([...paths].every(path => !path.includes('.local') && !path.includes('node_modules') && !path.endsWith('.log')));
const installed = resolve(scratch, 'node_modules/@belweave/search-sdk-react-native');
mkdirSync(installed, { recursive: true });
run('tar', ['-xzf', resolve(scratch, packed.filename), '--strip-components=1', '-C', installed]);
assert.equal(readFileSync(resolve(installed, 'LICENSE'), 'utf8'), readFileSync(resolve(root, '../../LICENSE'), 'utf8'));
const metadata = JSON.parse(readFileSync(resolve(installed, 'package.json'), 'utf8'));
assert.equal(metadata.name, '@belweave/search-sdk-react-native');
assert.equal(Object.keys(metadata.dependencies ?? {}).length, 0);
writeFileSync(resolve(scratch, 'package.json'), JSON.stringify({ name: 'installed-search-sdk-react-native-consumer', private: true, type: 'module' }));
const fixture = readFileSync(resolve(root, '../../sdk-contract/fixtures/search-success.json'), 'utf8');
writeFileSync(resolve(scratch, 'fixture.json'), fixture);
copyFileSync(resolve(installed, 'examples/consumer.ts'), resolve(scratch, 'example.ts'));
writeFileSync(resolve(scratch, 'consumer.ts'), `
import {createSearchClient, createTrustedFetchTransport, SearchError} from '@belweave/search-sdk-react-native';
import type {SearchRequest, SearchOptions, SearchBatchOptions, SearchBatchResult, SearchClient, SearchClientOptions,
  SearchResponse, SearchResult, SearchAttempt, SearchErrorCode, SearchUsage, SearchWarning, ProviderResponse,
  FetchImplementation, FetchRequestInit, FetchResponse, FetchTransport, ByteReader, TransportGuarantees} from '@belweave/search-sdk-react-native';
const options: SearchClientOptions = {endpoint:'https://gateway.invalid/exact', accessToken:async ()=>'synthetic'};
const client: SearchClient = createSearchClient(options);
const request: SearchRequest = {query:'synthetic', includeDomains:['example.com']};
const result: Promise<SearchResponse> = client.web.search(request, {signal: new AbortController().signal} satisfies SearchOptions);
const batch: Promise<readonly SearchBatchResult[]> = client.web.searchBatch([request], {concurrency:2} satisfies SearchBatchOptions);
// @ts-expect-error provider-native options are unsupported
const unsupported: SearchRequest = {query:'x', provider:'exa'};
// @ts-expect-error raw native fetch is not an attested advanced transport
const unsafe: SearchClientOptions = {endpoint:'https://gateway.invalid', fetch: globalThis.fetch};
void result; void batch; void unsupported; void unsafe; void SearchError; void createTrustedFetchTransport;
`);
const tsc = resolve(root, '../../node_modules/typescript/bin/tsc');
writeFileSync(resolve(scratch, 'tsconfig.json'), JSON.stringify({ compilerOptions: { noEmit: true, strict: true,
  exactOptionalPropertyTypes: true, noUncheckedIndexedAccess: true, target: 'ES2022', module: 'NodeNext', moduleResolution: 'NodeNext',
  lib: ['ES2022', 'DOM'] }, files: ['consumer.ts', 'example.ts'] }));
run(process.execPath, [tsc, '-p', 'tsconfig.json']);
writeFileSync(resolve(scratch, 'core.mjs'), `
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createSearchClient, createTrustedFetchTransport} from '@belweave/search-sdk-react-native';
const fixture=JSON.parse(readFileSync(new URL('./fixture.json', import.meta.url)));
const client=createSearchClient({endpoint:'https://gateway.invalid/exact',fetch:createTrustedFetchTransport(async (url,init)=>{
  assert.equal(url,'https://gateway.invalid/exact');assert.equal(init.redirect,'error');
  return new Response(JSON.stringify(fixture));
},{rejectsRedirects:true,omitsCredentials:true})});
assert.deepEqual(await client.web.search({query:'synthetic'}),fixture);
assert.equal((await client.web.searchBatch([{query:'one'},{query:'two'}])).length,2);
console.log('Installed portable entry point passed.');
`);
const rn = resolve(scratch, 'node_modules/react-native');
mkdirSync(rn, { recursive: true });
writeFileSync(resolve(rn, 'package.json'), JSON.stringify({ name: 'react-native', version: '0.0.0-test-fixture', type: 'module', exports: './index.js' }));
writeFileSync(resolve(rn, 'index.js'), 'export const NativeModules = {SearchSDKGateway: {request: (...args) => globalThis.__fixtureNativeRequest(...args), cancel: id => globalThis.__fixtureNativeCancel?.(id)}};\n');
writeFileSync(resolve(scratch, 'native.mjs'), `
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createSearchClient} from '@belweave/search-sdk-react-native';
const fixture=JSON.parse(readFileSync(new URL('./fixture.json',import.meta.url)));
let calls=0;
globalThis.__fixtureNativeRequest=async(id,url,headers,body,maxBytes,timeoutMs)=>{
  calls++;assert.equal(url,'https://gateway.invalid/exact');assert.equal(headers.Authorization,'Bearer synthetic');
  assert.equal(JSON.parse(body).query,'synthetic');assert.equal(maxBytes,10485760);assert.ok(timeoutMs>0);
  return {status:200,url,headers:{'x-searchsdk-protocol':'1'},bodyBase64:Buffer.from(JSON.stringify(fixture)).toString('base64')};
};
assert.deepEqual(await createSearchClient({endpoint:'https://gateway.invalid/exact',accessToken:()=> 'synthetic'}).web.search({query:'synthetic'}),fixture);
assert.equal(calls,1);
console.log('Installed React Native export and deterministic native bridge contract passed (fixture module, not a device run).');
`);
process.stdout.write(run(process.execPath, ['core.mjs']));
process.stdout.write(run(process.execPath, ['--conditions=react-native', 'native.mjs']));
console.log(`Packed consumer and public types passed: ${packed.filename} (${packed.files.length} files). Scratch: ${scratch}`);
