// searchSDK alpha recipe. Run on a server or in your own Boat sandbox.
// Setup and lifecycle: https://searchsdk.dev/docs/guides/boat
// Install in your sandbox application: npm install @belweave/search-sdk@alpha
// Commit the package lockfile to retain the resolved prerelease version.
// Default: deterministic fixtures, no provider requests.
// --live: one Context.dev search; requires your own CONTEXT_API_KEY.
import { createSearch, SearchError } from '@belweave/search-sdk';
import { context } from '@belweave/search-sdk/context';
import { createMockProvider } from '@belweave/search-sdk/testing';

const args = process.argv.slice(2);
if (args.length > 1 || (args.length === 1 && !['--live', '--help'].includes(args[0]))) {
  console.error('Usage: node search.mjs [--live | --help]');
  process.exitCode = 2;
} else if (args[0] === '--help') {
  console.log('node search.mjs: local fixtures; no provider requests.');
  console.log('node search.mjs --live: one potentially billable Context.dev search.');
  console.log('Enter CONTEXT_API_KEY inside your sandbox; never save it in this file.');
} else {
  const live = args[0] === '--live';
  const apiKey = live ? process.env.CONTEXT_API_KEY?.trim() : undefined;
  // Do not pass the key on to child processes through the environment.
  // The adapter still holds it in process memory until this program exits.
  delete process.env.CONTEXT_API_KEY;
  if (live && !apiKey) {
    console.error('CONTEXT_API_KEY is required for --live. No request was sent.');
    process.exitCode = 2;
  } else {
    const controller = new AbortController();
    const cancel = () => controller.abort();
    process.once('SIGINT', cancel);
    process.once('SIGTERM', cancel);
    try {
      const client = createSearch({
        provider: live ? context({ apiKey }) : createMockProvider(),
        timeoutMs: 10_000,
        attemptTimeoutMs: 8_000,
        retry: { maxRetries: 0 },
      });
      const response = await client.web.search(
        { query: 'SQLite write concurrency', limit: 3 },
        { signal: controller.signal },
      );
      // Normalized output includes source URLs and provenance; no raw bodies or key.
      console.log(JSON.stringify({ mode: live ? 'live' : 'fixture', ...response }, null, 2));
    } catch (error) {
      // Keep raw transport errors, request headers and provider bodies out of logs.
      console.error(error instanceof SearchError ? `Search failed: ${error.code}` : 'Search failed.');
      process.exitCode = 1;
    } finally {
      process.removeListener('SIGINT', cancel);
      process.removeListener('SIGTERM', cancel);
    }
  }
}
