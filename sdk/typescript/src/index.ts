import { createClient } from "./client.ts";
import type { Client, ContentsOptions, ContentsResponse, ProviderId, SearchOptions, SearchResponse } from "./types.ts";

export { createClient } from "./client.ts";
export { SearchError } from "./errors.ts";
export { policy, providers as registry } from "./generated/registry.ts";
export type * from "./types.ts";

let defaultClient: Client | undefined;
const client = () => (defaultClient ??= createClient());

/** Searches with the provider's key from the environment. */
export function search(query: string, options: SearchOptions & { provider: ProviderId }): Promise<SearchResponse> {
  return client().search(query, options);
}

/** Fetches clean page text with the provider's key from the environment. */
export function contents(urls: string | readonly string[], options: ContentsOptions & { provider: ProviderId }): Promise<ContentsResponse> {
  return client().contents(urls, options);
}
