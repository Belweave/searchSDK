// The only door to providers: the searchSDK TypeScript runtime, from source,
// so the benchmark exercises exactly the code users get.
export { createClient, registry, policy, SearchError } from "../../sdk/typescript/src/index.ts";
export type {
  Attempt, Client, ClientConfig, ContentsResponse, Cost, ErrorCode, ProviderId, ProviderSpec, SearchOptions, SearchResponse, SearchResult,
} from "../../sdk/typescript/src/index.ts";
