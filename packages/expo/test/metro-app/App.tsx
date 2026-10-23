import { useEffect, useState } from 'react';
import { Platform, Text, View } from 'react-native';
import { createExpoSearchClient, SearchError } from '@belweave/search-sdk-expo';

export default function App() {
  const [status, setStatus] = useState('Running packed SDK consumer…');
  useEffect(() => {
    // Native Metro exports verify package selection; device/network execution
    // belongs to the native sibling verification. Never dispatch a native call.
    if (Platform.OS !== 'web') { setStatus('Native Metro consumer bundled; native networking is not run.'); return; }
    async function verify() {
      const report = (globalThis as any).__searchSDKSmoke;
      const check = (condition: unknown, label: string) => {
        if (!condition) throw new Error(label);
        report.assertions.push(label);
      };
      const options = { endpoint: 'https://gateway.example.test/search', accessToken: () => 'synthetic-app-token', timeoutMs: 1000, maxConcurrency: 2 };
      const client = createExpoSearchClient(options);
      const response = await client.web.search({ query: 'single', includeDomains: ['EXAMPLE.COM'] });
      check(response.results[0]?.provenance.provider === 'fixture', 'streamed success retains provenance');
      const batch = await client.web.searchBatch([{ query: 'first' }, { query: 'auth' }, { query: 'third' }], { concurrency: 2 });
      check(batch[0]?.status === 'fulfilled' && batch[1]?.status === 'rejected' && batch[1].error.code === 'auth' && batch[2]?.status === 'fulfilled', 'ordered batch preserves siblings and sanitized errors');
      const controller = new AbortController();
      const pending = client.web.search({ query: 'cancel' }, { signal: controller.signal });
      setTimeout(() => controller.abort('private-abort-reason'), 5);
      try { await pending; throw new Error('Cancellation did not reject'); }
      catch (error) { check(error instanceof SearchError && error.code === 'aborted' && !String(error).includes('private'), 'cancellation remains sanitized'); }
      try { await createExpoSearchClient({ ...options, maxResponseBytes: 16 }).web.search({ query: 'limit' }); throw new Error('Limit did not reject'); }
      catch (error) { check(error instanceof SearchError && error.code === 'invalid_response', 'decoded response ceiling enforced'); }
      check(report.requests === 6, 'six deterministic requests; no retry or provider traffic');
      report.status = 'passed';
      setStatus(`PASS: ${report.assertions.length} browser assertions; ${report.requests} deterministic requests`);
    }
    verify().catch(error => {
      (globalThis as any).__searchSDKSmoke.status = 'failed';
      (globalThis as any).__searchSDKSmoke.error = String(error);
      setStatus(`FAIL: ${String(error)}`);
    });
  }, []);
  return <View style={{ padding: 24 }}><Text accessibilityRole="header">searchSDK Expo packed consumer</Text><Text testID="sdk-smoke-status">{status}</Text></View>;
}
