import { createClient } from "./client.ts";
import type { Client, ContentsOptions, ContentsResponse, SearchOptions, SearchResponse } from "./types.ts";

export { createClient } from "./client.ts";
export { SearchError } from "./errors.ts";
export { policy, providers as registry } from "./generated/registry.ts";
export type * from "./types.ts";

let defaultClient: Client | undefined;
const client = () => (defaultClient ??= createClient());

/** Searches with keys from the environment. `options.provider` is required. */
export function search(query: string, options?: SearchOptions): Promise<SearchResponse> {
  return client().search(query, options);
}

/** Fetches page contents with keys from the environment. `options.provider` is required. */
export function contents(urls: string | readonly string[], options?: ContentsOptions): Promise<ContentsResponse> {
  return client().contents(urls, options);
}
