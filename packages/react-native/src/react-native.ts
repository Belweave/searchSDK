import { NativeModules } from "react-native";
import { createSearchClient as createGatewayClient } from "./index.js";
import { createNativeTransport } from "./native-transport.js";
import type { NativeGatewayModule } from "./native-transport.js";
import type { SearchClient, SearchClientOptions } from "./types.js";
import { inputFields } from "./validation.js";

export * from "./index.js";

/** Bare React Native default: autolinked URLSession/OkHttp transport. */
export function createSearchClient(options: SearchClientOptions): SearchClient {
  const fields = inputFields(options, ["endpoint", "accessToken", "timeoutMs", "maxResponseBytes", "maxConcurrency", "fetch"], "configuration");
  return createGatewayClient({ ...fields, fetch: fields.fetch === undefined ?
    createNativeTransport(NativeModules.SearchSDKGateway as NativeGatewayModule | undefined) : fields.fetch } as SearchClientOptions);
}
