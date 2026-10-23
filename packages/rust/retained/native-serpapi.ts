/** SerpAPI endpoint families. Engine-specific additions stay native. Sources: docs/provider-surfaces-b.md. */
import { createNativeTransport } from "./native-transport.js";
import type { NativeOperation, NativeRequestInput, NativeTransportConfig } from "./native-transport.js";
import { adapterOptions } from "./http.js";
import { exactFields } from "./validation.js";
import { SearchError } from "./errors.js";

export type SerpApiClientOptions = Omit<NativeTransportConfig, "provider" | "baseUrl" | "headers"> & { apiKey: string };
export type SerpApiCallOptions = Pick<NativeRequestInput, "signal" | "timeoutMs">;
export type SerpApiParameter = string | number | boolean | readonly (string | number | boolean)[] | null | undefined;
/** `engine` selects a provider engine, not an independently verified SDK adapter. */
export interface SerpApiCommonSearchQuery {
  q?: string;
  location?: string;
  google_domain?: string;
  gl?: string;
  hl?: string;
  device?: "desktop" | "tablet" | "mobile";
  start?: number;
  tbm?: string;
  tbs?: string;
  safe?: "active" | "off";
  no_cache?: boolean;
  async?: boolean;
  zero_trace?: boolean;
  json_restrictor?: string;
  /** Engine-specific scalar parameters use the documented provider names. */
  [parameter: string]: SerpApiParameter;
}
export interface SerpApiSearchQuery extends SerpApiCommonSearchQuery { engine: string }
export interface SerpApiSearchMetadata {
  id?: string;
  status?: "Queued" | "Processing" | "Success" | "Error" | string;
  json_endpoint?: string;
  raw_html_file?: string;
  created_at?: string;
  processed_at?: string;
  total_time_taken?: number;
  credits_consumed?: number;
  [field: string]: unknown;
}
export interface SerpApiOrganicResult {
  position?: number;
  title?: string;
  link?: string;
  snippet?: string;
  displayed_link?: string;
  date?: string;
  sitelinks?: unknown;
  [field: string]: unknown;
}
export interface SerpApiSearchResponse {
  search_metadata?: SerpApiSearchMetadata;
  search_parameters?: Readonly<Record<string, unknown>>;
  search_information?: Readonly<Record<string, unknown>>;
  organic_results?: readonly SerpApiOrganicResult[];
  answer_box?: Readonly<Record<string, unknown>>;
  knowledge_graph?: Readonly<Record<string, unknown>>;
  related_questions?: readonly Readonly<Record<string, unknown>>[];
  serpapi_pagination?: Readonly<Record<string, unknown>>;
  error?: string;
  [field: string]: unknown;
}
export type SerpApiSearchInput = SerpApiCallOptions & { query: SerpApiSearchQuery };
export type SerpApiGoogleInput = SerpApiCallOptions & { query: SerpApiCommonSearchQuery & { q: string } };
export interface SerpApiExtractQuery {
  url: string;
  mode?: "scrape" | "map" | "crawl";
  max_pages?: number;
  max_depth?: number;
  include_subdomains?: boolean;
  include_sitemap?: boolean;
  prefetch_delay?: number;
  timeout?: number;
  include_tags?: string;
  exclude_tags?: string;
  include_markdown?: boolean;
  include_inline_assets?: boolean;
  device?: "desktop" | "tablet" | "mobile";
  no_cache?: boolean;
  async?: boolean;
  zero_trace?: boolean;
  json_restrictor?: string;
}
export interface SerpApiExtractResponse extends SerpApiSearchResponse {
  page_information?: Readonly<Record<string, unknown>>;
  text_content?: { snippet?: string; excerpt?: string; full?: string; markdown?: string; character_count?: number; word_count?: number; [field: string]: unknown };
  headings?: readonly { position?: number; level?: number; title?: string; [field: string]: unknown }[];
  inline_links?: readonly Readonly<Record<string, unknown>>[];
  urls?: readonly { url?: string; title?: string; source?: string; serpapi_extract_link?: string; [field: string]: unknown }[];
  pages?: readonly Readonly<Record<string, unknown>>[];
}
export type SerpApiExtractInput = SerpApiCallOptions & { query: SerpApiExtractQuery };
export type SerpApiArchiveInput = SerpApiCallOptions & { path: { search_id: string } };
export type SerpApiLocationsInput = SerpApiCallOptions & { query?: { q?: string; limit?: number } };
export interface SerpApiLocation { id?: string; google_id?: number; google_parent_id?: number; name?: string; canonical_name?: string; country_code?: string; target_type?: string; reach?: number; gps?: readonly number[]; [field: string]: unknown }
export interface SerpApiAccountResponse {
  account_id?: string;
  /** Native success data may include account credentials; never log it by default. */
  api_key?: string;
  account_email?: string;
  account_status?: string;
  plan_id?: string;
  plan_name?: string;
  plan_monthly_price?: number;
  plan_renewal_date?: string;
  searches_per_month?: number;
  plan_searches_left?: number;
  extra_credits?: number;
  total_searches_left?: number;
  this_month_usage?: number;
  this_hour_searches?: number;
  account_rate_limit_per_hour?: number;
  [field: string]: unknown;
}
export interface SerpApiPixelPositionResponse extends SerpApiSearchResponse {
  pixel_position_information?: { viewport_width?: number; viewport_height?: number; time_taken?: number; parent_rectangles?: Readonly<Record<string, { x: number; y: number; width: number; height: number }>>; [field: string]: unknown };
}
export type SerpApiUploadImageInput = SerpApiCallOptions & { rawBody: FormData };
export interface SerpApiUploadImageResponse { image_id?: string; message?: string; error?: string; [field: string]: unknown }

export const serpapiOperations = Object.freeze({
  search: Object.freeze({ id: "serpapi.search", method: "GET", path: "/search.json", retryable: false }),
  searchHtml: Object.freeze({ id: "serpapi.searchHtml", method: "GET", path: "/search.html", response: "text", retryable: false }),
  searchMarkdown: Object.freeze({ id: "serpapi.searchMarkdown", method: "GET", path: "/search.md", response: "text", retryable: false }),
  searchPixelPositions: Object.freeze({ id: "serpapi.searchPixelPositions", method: "GET", path: "/search.json_with_pixel_position", retryable: false }),
  getSearch: Object.freeze({ id: "serpapi.getSearch", method: "GET", path: "/searches/{search_id}.json", retryable: true }),
  getSearchHtml: Object.freeze({ id: "serpapi.getSearchHtml", method: "GET", path: "/searches/{search_id}.html", response: "text", retryable: true }),
  getSearchPixelPositions: Object.freeze({ id: "serpapi.getSearchPixelPositions", method: "GET", path: "/searches/{search_id}.json_with_pixel_position", retryable: false }),
  locations: Object.freeze({ id: "serpapi.locations", method: "GET", path: "/locations.json", retryable: true }),
  account: Object.freeze({ id: "serpapi.account", method: "GET", path: "/account.json", retryable: true }),
  uploadImage: Object.freeze({ id: "serpapi.uploadImage", method: "POST", path: "/image", retryable: false }),
} satisfies Record<string, NativeOperation>);

export function createSerpApiClient(options: SerpApiClientOptions) {
  if (!options || typeof options !== "object" || Array.isArray(options)) throw new SearchError("configuration");
  exactFields(options, ["apiKey", "fetch", "timeoutMs", "retry", "maxResponseBytes", "maxConcurrency"], "configuration");
  const { apiKey, fetch } = adapterOptions({ apiKey: options.apiKey, ...(options.fetch !== undefined ? { fetch: options.fetch } : {}) });
  const { timeoutMs, retry, maxResponseBytes, maxConcurrency } = options;
  const transport = createNativeTransport({ provider: "serpapi", baseUrl: "https://serpapi.com", fetch,
    ...(timeoutMs !== undefined ? { timeoutMs } : {}), ...(retry !== undefined ? { retry } : {}),
    ...(maxResponseBytes !== undefined ? { maxResponseBytes } : {}), ...(maxConcurrency !== undefined ? { maxConcurrency } : {}) });
  function searchInput(input: SerpApiSearchInput): NativeRequestInput {
    if (!input || !input.query || typeof input.query.engine !== "string" || !input.query.engine.trim()) throw new SearchError("invalid_request");
    // Output selection belongs to named methods. Secret parameters are fixed by this factory.
    if (Object.hasOwn(input.query, "api_key") || Object.hasOwn(input.query, "output")) throw new SearchError("invalid_request");
    if (input.query.async && input.query.no_cache) throw new SearchError("invalid_request");
    return { ...input, query: { ...input.query, api_key: apiKey } };
  }
  function archiveInput(input: SerpApiArchiveInput): NativeRequestInput {
    if (!input || !input.path) throw new SearchError("invalid_request");
    return { ...input, query: { api_key: apiKey } };
  }
  return Object.freeze({
    operations: serpapiOperations,
    async search(input: SerpApiSearchInput) { return transport.request<SerpApiSearchResponse>(serpapiOperations.search, searchInput(input)); },
    async google(input: SerpApiGoogleInput) {
      if (!input?.query || typeof input.query.q !== "string" || !input.query.q.trim()) throw new SearchError("invalid_request");
      return transport.request<SerpApiSearchResponse>(serpapiOperations.search, searchInput({ ...input, query: { ...input.query, engine: "google" } }));
    },
    async searchHtml(input: SerpApiSearchInput) { return transport.request<string>(serpapiOperations.searchHtml, searchInput(input)); },
    async searchMarkdown(input: SerpApiSearchInput) { return transport.request<string>(serpapiOperations.searchMarkdown, searchInput(input)); },
    async searchPixelPositions(input: SerpApiSearchInput) { return transport.request<SerpApiPixelPositionResponse>(serpapiOperations.searchPixelPositions, searchInput(input)); },
    async extract(input: SerpApiExtractInput) {
      if (!input?.query || typeof input.query.url !== "string" || !input.query.url) throw new SearchError("invalid_request");
      return transport.request<SerpApiExtractResponse>(serpapiOperations.search, searchInput({ ...input, query: { ...input.query, engine: "extract" } }));
    },
    async extractMarkdown(input: SerpApiExtractInput) {
      if (!input?.query || typeof input.query.url !== "string" || !input.query.url) throw new SearchError("invalid_request");
      return transport.request<string>(serpapiOperations.searchMarkdown, searchInput({ ...input, query: { ...input.query, engine: "extract" } }));
    },
    async getSearch(input: SerpApiArchiveInput) { return transport.request<SerpApiSearchResponse>(serpapiOperations.getSearch, archiveInput(input)); },
    async getSearchHtml(input: SerpApiArchiveInput) { return transport.request<string>(serpapiOperations.getSearchHtml, archiveInput(input)); },
    async getSearchPixelPositions(input: SerpApiArchiveInput) { return transport.request<SerpApiPixelPositionResponse>(serpapiOperations.getSearchPixelPositions, archiveInput(input)); },
    async locations(input: SerpApiLocationsInput = {}) { return transport.request<readonly SerpApiLocation[]>(serpapiOperations.locations, input); },
    async account(input: SerpApiCallOptions = {}) { return transport.request<SerpApiAccountResponse>(serpapiOperations.account, { ...input, query: { api_key: apiKey } }); },
    async uploadImage(input: SerpApiUploadImageInput) {
      if (!(input?.rawBody instanceof FormData) || !input.rawBody.has("image")) throw new SearchError("invalid_request");
      const form = new FormData();
      // Keep the caller's form intact and prevent an alternate credential field.
      for (const [name, value] of input.rawBody) {
        if (name === "api_key") throw new SearchError("invalid_request");
        form.append(name, value);
      }
      form.set("api_key", apiKey);
      return transport.request<SerpApiUploadImageResponse>(serpapiOperations.uploadImage, { ...input, rawBody: form });
    },
  });
}
export type SerpApiClient = ReturnType<typeof createSerpApiClient>;
