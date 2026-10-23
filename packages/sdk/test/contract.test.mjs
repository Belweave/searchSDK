import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { validateRequest, validateProviderResponse } from '../dist/validation.js';
const fixture = name => readFile(new URL(`../../../sdk-contract/fixtures/${name}`, import.meta.url), 'utf8').then(JSON.parse);

test('reference SDK accepts and rejects every shared request conformance fixture', async () => {
  const cases = await fixture('request-cases.json');
  for (const row of cases.valid) assert.deepEqual(validateRequest(row.input), row.normalized, row.name);
  for (const row of cases.invalid) assert.throws(() => validateRequest(row.input), error => error.code === row.code, row.name);
});
test('shared success fixture preserves normalized response fields and provenance', async () => {
  const response = await fixture('search-success.json');
  const { results, usage, warnings } = response;
  assert.deepEqual(validateProviderResponse(response), { results, usage, warnings });
});
