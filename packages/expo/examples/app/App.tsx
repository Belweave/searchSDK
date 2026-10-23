import { useEffect, useMemo, useRef, useState } from 'react';
import { Button, FlatList, SafeAreaView, Text, TextInput, View } from 'react-native';
import { createExpoSearchClient, SearchError } from '@belweave/search-sdk-expo';

/** Replace the public endpoint with your application-owned protocol-v1 gateway. */
export default function App({
  endpoint = 'https://search.example.com/api/search',
  getAccessToken,
}: {
  endpoint?: string;
  /** Supply your session's current short-lived application token, when required. */
  getAccessToken?: () => string | Promise<string>;
}) {
  const client = useMemo(() => createExpoSearchClient({
    endpoint,
    ...(getAccessToken ? { accessToken: getAccessToken } : {}),
    timeoutMs: 10_000,
    maxResponseBytes: 1024 * 1024,
    maxConcurrency: 2,
  }), [endpoint, getAccessToken]);
  type Response = Awaited<ReturnType<typeof client.web.search>>;
  const [query, setQuery] = useState('Expo networking');
  const [results, setResults] = useState<Response['results']>([]);
  const [status, setStatus] = useState('');
  const active = useRef<AbortController | null>(null);
  useEffect(() => () => { active.current?.abort(); active.current = null; }, [client]);

  async function search() {
    active.current?.abort();
    const controller = new AbortController();
    active.current = controller;
    setStatus('Searching…');
    try {
      const response = await client.web.search({ query, limit: 5 }, { signal: controller.signal });
      if (active.current !== controller) return;
      setResults(response.results);
      setStatus(`${response.results.length} results from ${response.provider}`);
    } catch (error) {
      if (active.current !== controller) return;
      // Only public SDK error codes enter the UI. No raw transport messages,
      // queries, token values or response bodies are logged.
      setStatus(error instanceof SearchError ? error.code : 'Search failed');
    } finally {
      if (active.current === controller) active.current = null;
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, padding: 24 }}>
      <TextInput accessibilityLabel="Search query" value={query} onChangeText={setQuery} autoCapitalize="none" />
      <Button title="Search" onPress={search} disabled={!query.trim()} />
      <Button title="Cancel" onPress={() => active.current?.abort()} />
      <Text accessibilityLiveRegion="polite">{status}</Text>
      <FlatList data={results} keyExtractor={(item, index) => `${item.url}:${index}`} renderItem={({ item }) => (
        <View style={{ marginVertical: 12 }}>
          <Text>{item.title ?? item.url}</Text>
          <Text>{item.snippet}</Text>
          <Text>{item.provenance.provider} · {item.provenance.sourceUrl}</Text>
        </View>
      )} />
    </SafeAreaView>
  );
}
