import React, { useEffect, useState } from 'react';
import { Platform, ScrollView, Text } from 'react-native';
import { createSearchClient, SearchError } from '@belweave/search-sdk-react-native';
import { createExpoSearchClient } from '@belweave/search-sdk-expo';

// Deterministic local TLS fixture only. No provider URLs or provider keys exist here.
const base = 'https://127.0.0.1:19443';
const token = 'synthetic-application-token';
export default function App() {
  const [status, setStatus] = useState('Running native gateway checks…');
  useEffect(() => {
    const cases: { name: string; passed: boolean; code?: string }[] = [];
    const client = (path = '/search', config = {}) => createSearchClient({ endpoint: base + path, accessToken: () => token, ...config });
    const check = async (name: string, run: () => Promise<void>) => {
      try { await run(); cases.push({ name, passed: true }); }
      catch (error) { cases.push({ name, passed: false, code: error instanceof SearchError ? error.code : 'assertion' }); }
      setStatus(JSON.stringify(cases, null, 2));
    };
    const expectCode = async (name: string, code: string, run: () => Promise<unknown>) => check(name, async () => {
      try { await run(); throw new Error('Expected failure'); }
      catch (error) {
        if (!(error instanceof SearchError) || error.code !== code || JSON.stringify(error).includes(token)) throw error;
      }
    });
    void (async () => {
      await check('native-success-provenance', async () => {
        const response = await client().web.search({ query: 'synthetic', includeDomains: ['EXAMPLE.COM', 'example.com'] });
        if (response.provider !== 'fixture' || response.results[0]?.provenance.provider !== 'fixture' || response.usage !== null) throw new Error('Invalid normalized result');
      });
      await check('expo-native-entry', async () => {
        const response = await createExpoSearchClient({ endpoint: base + '/search', accessToken: () => token }).web.search({ query: 'synthetic-expo' });
        if (response.provider !== 'fixture' || response.results[0]?.provenance.provider !== 'fixture') throw new Error('Invalid Expo native response');
      });
      await expectCode('native-redirect-rejected', 'invalid_response', () => client('/redirect').web.search({ query: 'synthetic' }));
      await expectCode('native-decoded-gzip-limit', 'invalid_response', () => client('/oversize', { maxResponseBytes: 100 }).web.search({ query: 'synthetic' }));
      await expectCode('native-auth-error-sanitized', 'auth', () => client('/auth').web.search({ query: 'synthetic' }));
      await expectCode('native-protocol-version-rejected', 'invalid_response', () => client('/version').web.search({ query: 'synthetic' }));
      await expectCode('native-cancellation', 'aborted', async () => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 100);
        try { await client('/hang').web.search({ query: 'synthetic' }, { signal: controller.signal }); }
        finally { clearTimeout(timer); }
      });
      await expectCode('native-deadline', 'timeout', () => client('/hang', { timeoutMs: 100 }).web.search({ query: 'synthetic' }));
      await check('native-batch-and-cookie-isolation', async () => {
        const outcomes = await client('/search', { maxConcurrency: 1 }).web.searchBatch([{ query: 'first' }, { query: 'second' }]);
        if (outcomes.length !== 2 || outcomes.some(r => r.status !== 'fulfilled')) throw new Error('Invalid batch');
      });
      const report = { platform: Platform.OS, cases, passed: cases.every(result => result.passed) };
      await fetch(base + '/report', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(report) });
      setStatus(JSON.stringify(report, null, 2));
    })().catch(() => setStatus('Native fixture report failed. Inspect the local fixture server.'));
  }, []);
  return <ScrollView contentContainerStyle={{ padding: 30, paddingTop: 70 }}><Text testID="native-status">{status}</Text></ScrollView>;
}
