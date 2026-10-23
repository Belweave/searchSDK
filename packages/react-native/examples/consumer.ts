import { createSearchClient, SearchError } from "@belweave/search-sdk-react-native";
import type { SearchBatchResult, SearchResponse } from "@belweave/search-sdk-react-native";

/** In a bare React Native application, Metro selects the built-in native transport. */
export function createApplicationSearch(endpoint: string, applicationAccessToken: () => Promise<string>) {
  const client = createSearchClient({ endpoint, accessToken: applicationAccessToken, maxConcurrency: 2 });

  async function search(query: string, signal?: AbortSignal): Promise<SearchResponse> {
    try { return await client.web.search({ query, limit: 5 }, signal === undefined ? {} : { signal }); }
    catch (error) {
      if (error instanceof SearchError && error.code === "aborted") throw error;
      // Application UI can map SearchError.code to a local message; no raw body is exposed.
      throw error;
    }
  }
  async function batch(queries: readonly string[], signal?: AbortSignal): Promise<readonly SearchBatchResult[]> {
    return client.web.searchBatch(queries.map(query => ({ query })), {
      concurrency: 2, timeoutMs: 10_000, ...(signal === undefined ? {} : { signal }),
    });
  }
  return { search, batch };
}

// Own the controller in your screen/effect; abort when superseded or unmounted.
// const controller = new AbortController();
// const pending = applicationSearch.search("synthetic query", controller.signal);
// controller.abort();
