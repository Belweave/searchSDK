// The only door to providers: the searchSDK TypeScript runtime, from source,
// so the benchmark exercises exactly the code users get. Prices and URL
// matching come from the SDK too, so the benchmark keeps no copies of them.
export { costBound, createClient, listPrice, policy, registry, SearchError, urlKey } from "../../sdk/typescript/src/index.ts";
export type {
  Attempt, Client, ClientConfig, ContentsResponse, Cost, CostBound, ErrorCode, ProviderId, ProviderSpec, RateLimit, SearchOptions, SearchResponse, SearchResult,
} from "../../sdk/typescript/src/index.ts";
// The SDK's own JSON path reader and predicate check, so the smoke check reads spec paths exactly as the runtime does.
export { allHold, getPath } from "../../sdk/typescript/src/json.ts";
