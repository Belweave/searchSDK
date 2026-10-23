import { registerHooks } from 'node:module';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === 'expo/fetch') return { url: new URL('./expo-fetch.fixture.mjs', import.meta.url).href, shortCircuit: true };
    if (specifier === '@belweave/search-sdk-react-native') {
      const sibling = new URL('../../react-native/dist/index.js', import.meta.url);
      if (existsSync(fileURLToPath(sibling))) return { url: sibling.href, shortCircuit: true };
    }
    return nextResolve(specifier, context);
  },
});

export { setExpoFetch } from './expo-fetch.fixture.mjs';
export const { createExpoSearchClient, SearchError, createTrustedFetchTransport } = await import('../dist/index.js');
export const base = await import('@belweave/search-sdk-react-native');
export const endpoint = 'https://gateway.example.test/search';
export const response = () => ({
  provider: 'fixture',
  results: [{
    url: 'https://example.test/result', title: 'Deterministic result', snippet: 'Synthetic data',
    provenance: { provider: 'fixture', sourceUrl: 'https://example.test/result', retrievedAt: '2026-10-22T12:00:00.000Z' },
  }],
  usage: null, warnings: [], attempts: [],
});
export const json = (value = response(), status = 200, headers = {}) => new Response(JSON.stringify(value), {
  status, headers: { 'content-type': 'application/json', 'X-SearchSDK-Protocol': '1', ...headers },
});
export const code = expected => error => error instanceof SearchError && error.code === expected;
export const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
export const trusted = implementation => createTrustedFetchTransport(implementation, { rejectsRedirects: true, omitsCredentials: true });
