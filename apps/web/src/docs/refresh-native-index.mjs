// Inspect local source clients with an offline fetch guard. No provider requests or installs.
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const root = new URL('../../../../', import.meta.url);
const factories = {
  context: 'createContextClient', tinyfish: 'createTinyfishClient', exa: 'createExaClient',
  tavily: 'createTavilyClient', brave: 'createBraveClient', perplexity: 'createPerplexityClient',
  parallel: 'createParallelClient', linkup: 'createLinkupClient', firecrawl: 'createFirecrawlClient',
  you: 'createYouClient', serper: 'createSerperClient', serpapi: 'createSerpApiClient',
  wondersearch: 'createWonderSearchClient',
};
const result = {};
const helpers = {};
let requests = 0;
const offlineFetch = async () => { requests++; throw new Error('Provider calls are forbidden during documentation generation'); };
const originalFetch = globalThis.fetch;
globalThis.fetch = offlineFetch;
const server = await createServer({
  root: fileURLToPath(new URL('apps/web/', root)),
  configFile: fileURLToPath(new URL('apps/web/vite.config.ts', root)),
  server: { middlewareMode: true, watch: null }, appType: 'custom', logLevel: 'error',
});
try {
  for (const [id, factory] of Object.entries(factories)) {
    const module = await server.ssrLoadModule(fileURLToPath(new URL(`packages/sdk/src/native-${id}.ts`, root)));
    const client = module[factory]({ apiKey: 'documentation-fixture-key', fetch: offlineFetch });
    const methods = new Set(Object.keys(client).filter(name => typeof client[name] === 'function'));
    if (!client.operations || !Object.isFrozen(client.operations)) throw new Error(`Missing immutable operation catalog: ${id}`);
    result[id] = Object.entries(client.operations).map(([name, operation]) => {
      if (!methods.has(name)) throw new Error(`Catalog entry has no public method: ${id}.${name}`);
      return { name, method: operation.method, path: operation.path, retryable: operation.retryable === true, response: operation.response ?? 'json' };
    });
    helpers[id] = [...methods].filter(name => !Object.hasOwn(client.operations, name));
    if (!result[id].length) throw new Error(`No implemented operations found for ${id}`);
  }
  if (requests) throw new Error(`Unexpected provider requests: ${requests}`);
} finally {
  globalThis.fetch = originalFetch;
  await server.close();
}
await writeFile(new URL('./native-operation-index.ts', import.meta.url), `// Generated from public source clients and their immutable operation catalogs.\n// Run refresh-native-index.mjs after client changes; no live endpoint verification is implied.\nexport interface NativeOperationEntry { name: string; method: string; path: string; retryable: boolean; response: string }\nexport const nativeOperationIndex: Readonly<Record<string, readonly NativeOperationEntry[]>> = ${JSON.stringify(result, null, 2)};\nexport const nativeHelperIndex: Readonly<Record<string, readonly string[]>> = ${JSON.stringify(helpers, null, 2)};\n`);
console.log(Object.entries(result).map(([id, operations]) => `${id}: ${operations.length} request mappings, ${helpers[id].length} helpers`).join('\n'));
