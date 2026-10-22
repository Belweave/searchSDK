// Keep runnable snippets separate from prose so evolving alpha contracts can be reviewed in one place.
export const examples = {
  install: `# In your Node server application:
npm install @belweave/search-sdk@alpha`,
  quickstart: `import { createSearch } from '@belweave/search-sdk';
import { context } from '@belweave/search-sdk/context';

const apiKey = process.env.CONTEXT_API_KEY;
if (!apiKey) throw new Error('CONTEXT_API_KEY is required');

const client = createSearch({
  provider: context({ apiKey }),
  timeoutMs: 10_000,
});

const response = await client.web.search({
  query: 'SQLite write concurrency',
  limit: 5,
});

for (const result of response.results) {
  console.log(result.title ?? result.url, result.url);
}
console.log(response.provider, response.attempts);`,
  mock: `import { createSearch } from '@belweave/search-sdk';
import { createMockProvider } from '@belweave/search-sdk/testing';

const provider = createMockProvider();
const client = createSearch({ provider });
const response = await client.web.search({ query: 'SQLite concurrency' });

console.log(response.results); // Fixed example-domain fixtures
console.log(provider.calls.length); // 1; no network requests`,
  fallback: `import { createSearch } from '@belweave/search-sdk';
import { context } from '@belweave/search-sdk/context';
import { tinyfish } from '@belweave/search-sdk/tinyfish';

const contextKey = process.env.CONTEXT_API_KEY;
const tinyfishKey = process.env.TINYFISH_API_KEY;
if (!contextKey || !tinyfishKey) throw new Error('Missing server credentials');

const client = createSearch({
  provider: context({ apiKey: contextKey }),
  fallback: [tinyfish({ apiKey: tinyfishKey })],
  timeoutMs: 10_000,
  attemptTimeoutMs: 4_000,
});

const response = await client.web.search({ query: 'SQLite write concurrency' });
console.log(response.provider, response.attempts, response.warnings);`,
  cancellation: `import { createSearch, SearchError } from '@belweave/search-sdk';
import { createMockProvider } from '@belweave/search-sdk/testing';

const controller = new AbortController();
const client = createSearch({ provider: createMockProvider({ delayMs: 500 }) });
const pending = client.web.search(
  { query: 'SQLite concurrency' },
  { signal: controller.signal },
);

controller.abort();
try {
  await pending;
} catch (error) {
  if (error instanceof SearchError) console.log(error.code); // aborted
  else throw error;
}`,
  filters: `import { createSearch } from '@belweave/search-sdk';
import { createMockProvider } from '@belweave/search-sdk/testing';

const client = createSearch({ provider: createMockProvider() });
const response = await client.web.search({
  query: 'search API reference',
  limit: 3,
  includeDomains: ['example.org'],
  excludeDomains: ['excluded.example.org'],
});

console.log(response.results); // Mock hostname filtering; no live search`,
  errors: `import { createSearch, SearchError } from '@belweave/search-sdk';
import { createMockProvider } from '@belweave/search-sdk/testing';

const client = createSearch({ provider: createMockProvider({
  outcomes: [{ type: 'error', code: 'rate_limit', retryAfterMs: 2_000 }],
}) });

try {
  await client.web.search({ query: 'SQLite concurrency' });
} catch (error) {
  if (!(error instanceof SearchError)) throw error;
  console.log(error.code, error.status, error.retryAfterMs);
  console.log(error.attempts); // Fixed codes and timing, no raw error bodies
}`,
  fixtureFallback: `import assert from 'node:assert/strict';
import { createSearch } from '@belweave/search-sdk';
import { createMockProvider } from '@belweave/search-sdk/testing';

const primary = createMockProvider({
  id: 'primary',
  outcomes: [{ type: 'error', code: 'rate_limit', retryAfterMs: 2_000 }],
});
const backup = createMockProvider({ id: 'backup' });
const client = createSearch({ provider: primary, fallback: [backup] });
const response = await client.web.search({ query: 'search interfaces' });

assert.equal(response.provider, 'backup');
assert.equal(response.attempts.length, 2);
assert.equal(response.warnings[0]?.code, 'fallback_used');
assert.equal(primary.calls.length, 1);
assert.equal(backup.calls.length, 1);`,
} as const;
