import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { setExpoFetch, createExpoSearchClient, endpoint, json, code } from './harness.mjs';

const fixture = name => JSON.parse(readFileSync(new URL(`../../../sdk-contract/fixtures/${name}.json`, import.meta.url), 'utf8'));
const requests = fixture('request-cases');
const success = fixture('search-success');
const errors = fixture('search-errors');

test('shared protocol-v1 request and success fixtures execute through the Expo adapter', async () => {
  assert.equal(requests.protocolVersion, 1);
  for (const row of requests.valid) {
    let calls = 0;
    setExpoFetch(async (_, init) => {
      calls++;
      assert.deepEqual(JSON.parse(init.body), row.normalized, row.name);
      return json(success);
    });
    assert.deepEqual(await createExpoSearchClient({ endpoint }).web.search(row.input), success, row.name);
    assert.equal(calls, 1);
  }
});

test('shared invalid requests fail before token acquisition or transport dispatch', async () => {
  setExpoFetch(() => assert.fail('Invalid shared fixture dispatched'));
  const client = createExpoSearchClient({ endpoint, accessToken: () => assert.fail('Invalid shared fixture requested a token') });
  for (const row of requests.invalid) await assert.rejects(client.web.search(row.input), code(row.code), row.name);
});

test('shared sanitized error envelopes retain protocol error codes', async () => {
  for (const row of errors) {
    setExpoFetch(async () => json(row.body, row.httpStatus));
    await assert.rejects(createExpoSearchClient({ endpoint }).web.search({ query: 'fixture query' }), code(row.body.error.code));
  }
});
