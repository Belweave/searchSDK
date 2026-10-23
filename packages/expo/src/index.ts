import { fetch as expoFetch } from "expo/fetch";
import { createSearchClient, createTrustedFetchTransport, SearchError } from "@belweave/search-sdk-react-native";
import type { FetchImplementation } from "@belweave/search-sdk-react-native";

export { SearchError, createTrustedFetchTransport } from "@belweave/search-sdk-react-native";
export type * from "@belweave/search-sdk-react-native";

/** Application gateway options shared with the React Native client. */
export type ExpoSearchClientOptions = Parameters<typeof createSearchClient>[0];
export type ExpoSearchClient = ReturnType<typeof createSearchClient>;

// This is the browser/default entry. Metro selects index.native on iOS/Android.
// Read the official Expo web fetch body as a stream to bound decoded bytes.
const fetchWithExpo: FetchImplementation = async (input, init) => {
  const response = await expoFetch(input, init);
  const body = response.body;
  return {
    status: response.status,
    headers: response.headers,
    url: response.url,
    redirected: response.redirected,
    type: response.type,
    // Adapt the overloaded DOM reader API to the sibling's small structural
    // transport interface without unsafe casts or buffering the response.
    body: body === null ? null : {
      getReader() {
        const reader = body.getReader();
        return {
          async read() {
            const chunk = await reader.read();
            return chunk.done ? { done: true } : { done: false, value: chunk.value };
          },
          cancel: () => reader.cancel(),
          releaseLock: () => reader.releaseLock(),
        };
      },
      cancel: () => body.cancel(),
    },
  };
};
const streamingFetch = createTrustedFetchTransport(
  fetchWithExpo,
  { rejectsRedirects: true, omitsCredentials: true },
);

/**
 * Create a protocol-v1 application gateway client using Expo's web streaming fetch.
 * A supplied transport overrides Expo fetch and must honor redirect and abort
 * semantics and expose a byte stream. Tokens remain request-scoped in the base
 * client; this adapter stores no tokens and installs no global polyfills.
 */
export function createExpoSearchClient(options: ExpoSearchClientOptions): ExpoSearchClient {
  let forwarded: ExpoSearchClientOptions;
  try {
    if (!options || typeof options !== "object" || Array.isArray(options)) throw new Error();
    const prototype: unknown = Object.getPrototypeOf(options);
    if (prototype !== Object.prototype && prototype !== null) throw new Error();
    // Preserve descriptors and symbols so the base client's strict validation
    // still rejects accessors and unknown fields without executing user getters.
    const descriptors = Object.getOwnPropertyDescriptors(options);
    const fetchDescriptor = descriptors.fetch;
    if (!fetchDescriptor || ("value" in fetchDescriptor && fetchDescriptor.value === undefined)) {
      descriptors.fetch = { value: streamingFetch, enumerable: true, configurable: true, writable: true };
    }
    forwarded = Object.create(prototype, descriptors) as ExpoSearchClientOptions;
  } catch { throw new SearchError("configuration"); }
  return createSearchClient(forwarded);
}
