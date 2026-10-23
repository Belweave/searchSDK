import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { fixtureBody } from '../benchmarks/fixtures.mjs';
import { providers } from '../benchmarks/providers.mjs';
import { validateRequest } from '../packages/sdk/dist/validation.js';

// This generator calls only injected synthetic transports. Ambient network is forbidden.
globalThis.fetch = () => { throw new Error('Contract generation cannot access the network'); };
const check = process.argv.includes('--check');
if (process.argv.slice(2).some(arg => arg !== '--check')) throw new Error('Usage: generate-sdk-contract.mjs [--check]');
const epoch = '2026-10-22T00:00:00.000Z';
const rows = [];
for (const provider of providers.filter(row => row.track === 'open-web-search')) {
  const { [provider.id]: factory } = await import(`../packages/sdk/dist/${provider.id}.js`);
  const observed = [];
  const upstream = fixtureBody(provider.id);
  const transport = async (input, init = {}) => {
    const url = new URL(input);
    const headers = Object.fromEntries(new Headers(init.headers));
    let body = init.body === undefined ? null : String(init.body);
    if (headers['content-type']?.startsWith('application/json') && body !== null) body = JSON.parse(body);
    if (headers['content-type']?.startsWith('application/x-www-form-urlencoded') && body !== null) body = Object.fromEntries(new URLSearchParams(body));
    observed.push({ url: url.origin + url.pathname, query: Object.fromEntries(url.searchParams), method: init.method ?? 'GET', headers, body });
    return Response.json(upstream);
  };
  const options = provider.id === 'searxng'
    ? { baseUrl: 'https://searxng.example', fetch: transport }
    : { apiKey: 'fixture-key', fetch: transport };
  const adapter = factory(options);
  for (const filtered of [false, true]) {
    if (filtered && !adapter.capabilities.domainFilters) continue;
    const input = { query: 'SDK conformance fixture', limit: 3,
      ...(filtered ? { includeDomains: ['example.org'] } : {}) };
    const response = await adapter.search(validateRequest(input), { signal: new AbortController().signal });
    assert.equal(observed.length, 1, 'One normalized request must make one native request');
    const canonical = JSON.parse(JSON.stringify(response, (key, value) => key === 'retrievedAt' ? epoch : value));
    rows.push({ name: `${provider.id}-${filtered ? 'include-domains' : 'default'}`, provider: provider.id,
      capabilities: adapter.capabilities, request: input, upstreamRequest: observed.shift(), upstreamResponse: upstream,
      response: canonical });
  }
}
const output = JSON.stringify({ schemaVersion: 1,
  description: 'Synthetic cross-language adapter fixtures generated from the TypeScript reference. No live verification.',
  credential: 'fixture-key', canonicalRetrievalTime: epoch, cases: rows }, null, 2) + '\n';
const destination = new URL('../sdk-contract/fixtures/providers.json', import.meta.url);
if (check) {
  assert.equal(await readFile(destination, 'utf8'), output, 'Provider conformance fixtures drifted; rebuild SDK then run generate-sdk-contract.mjs');
} else await writeFile(destination, output);
console.log(`${check ? 'Verified' : 'Generated'} ${rows.length} synthetic adapter cases for 14 normalized providers.`);
