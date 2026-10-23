// Metro's react-native condition resolves the sibling's autolinked native entry.
// Expo fetch rejects redirects and omits cookies, but its iOS default session
// does not explicitly disable URL credential storage. Use the secure bounded
// native transport instead of claiming a stronger Expo fetch guarantee.
import { createSearchClient } from "@belweave/search-sdk-react-native";

export { SearchError, createTrustedFetchTransport } from "@belweave/search-sdk-react-native";
export type * from "@belweave/search-sdk-react-native";
export type ExpoSearchClientOptions = Parameters<typeof createSearchClient>[0];
export type ExpoSearchClient = ReturnType<typeof createSearchClient>;

/** Expo iOS/Android require a development/production build with the RN peer linked. */
export function createExpoSearchClient(options: ExpoSearchClientOptions): ExpoSearchClient {
  return createSearchClient(options);
}
