// Native wire types and operations derived from official provider documentation.
// Sources, access gates, and verification limits: docs/provider-surfaces-a.md.
// Static wire types are not JSON Schema validation: ranges, patterns, and if/then
// constraints remain provider responsibilities; unconstrained source data stays unknown.
import { createNativeTransport } from "./native-transport.js";
import type { NativeOperation, NativeRequestInput, NativeResponse, NativeSSEEvent, NativeTransportConfig } from "./native-transport.js";
import { SearchError } from "./errors.js";

export interface BraveClientOptions extends Omit<NativeTransportConfig, "provider" | "baseUrl" | "headers"> {
  /** Server-side credential. Never embed it in browser bundles. */
  apiKey: string;
}

export type BraveSchemaSearchCountry = "AR" | "AU" | "AT" | "BE" | "BR" | "CA" | "CL" | "DK" | "FI" | "FR" | "DE" | "GR" | "HK" | "IN" | "ID" | "IT" | "JP" | "KR" | "MY" | "MX" | "NL" | "NZ" | "NO" | "CN" | "PL" | "PT" | "PH" | "RU" | "SA" | "ZA" | "ES" | "SE" | "CH" | "TW" | "TR" | "GB" | "US" | "ALL";

export type BraveSchemaLanguageInput = "ar" | "eu" | "bn" | "bg" | "ca" | "zh-hans" | "zh-hant" | "hr" | "cs" | "da" | "nl" | "en" | "en-gb" | "et" | "fi" | "fr" | "gl" | "de" | "el" | "gu" | "he" | "hi" | "hu" | "is" | "it" | "ja" | "jp" | "kn" | "ko" | "lv" | "lt" | "ms" | "ml" | "mr" | "nb" | "pl" | "pt-br" | "pt-pt" | "pa" | "ro" | "ru" | "sr" | "sk" | "sl" | "es" | "sv" | "ta" | "te" | "th" | "tr" | "uk" | "vi";

export type BraveSchemaAppModelsGeneralSafeSearch = "off" | "moderate" | "strict";

export type BraveSchemaSummarizerContextThresholdMode = "disabled" | "strict" | "lenient" | "balanced";

export type BraveSchemaLLMContextAPIResponse = {
  "grounding"?: BraveSchemaLLMContext;
  /** Metadata for all referenced URLs, keyed by URL. */
  "sources"?: {
    [key: string]: BraveSchemaSource;
  };
};

export type BraveSchemaLLMContextParameters = {
  /** The user’s search query term. Query can not be empty. Maximum of 600 characters and 75 words in the query. (minLength 1, maxLength 600) */
  "q": string;
  /** The search query country, where the results come from. The country string is limited to 2 character country codes of supported countries. */
  "country"?: BraveSchemaSearchCountry;
  /** The search language preference. The 2 or more character language code for which the search results are provided. */
  "search_lang"?: BraveSchemaLanguageInput;
  /** The maximum number of search results considered to select the LLM context data. The default is 20 and the maximum is 50. (min 1, max 50) */
  "count"?: number;
  /** <p>Filters results for adult content. The following values are supported:</p> <ul> <li><strong>off</strong> - No filtering is done.</li> <li><strong>moderate</strong> - Drops adult content from the results used for context.</li> <li><strong>strict</strong> - Drops all adult conte */
  "safesearch"?: ((BraveSchemaAppModelsGeneralSafeSearch) | (null));
  /** Whether to enable spellcheck on the query. */
  "spellcheck"?: boolean;
  /** Maximum number of different URLs to include in LLM context. (min 1, max 50) */
  "maximum_number_of_urls"?: number;
  /** Approximate maximum number of tokens to include in context. The default is <code>8192</code> and maximum is <code>32768</code>. (min 1024, max 32768) */
  "maximum_number_of_tokens"?: number;
  /** Maximum number of different snippets (or chunks of text) to include in LLM context. The default is <code>50</code> and maximum is <code>256</code>. (min 1, max 256) */
  "maximum_number_of_snippets"?: number;
  /** The mode to use to determine the threshold for including content in context. */
  "context_threshold_mode"?: ((BraveSchemaSummarizerContextThresholdMode) | (null));
  /** Maximum number of tokens to include per URL. The default is <code>4096</code> and maximum is <code>8192</code>. (min 512, max 8192) */
  "maximum_number_of_tokens_per_url"?: number;
  /** Maximum number of snippets to include per URL. The default is <code>50</code> and maximum is <code>100</code>. (min 1, max 100) */
  "maximum_number_of_snippets_per_url"?: number;
  /** Goggles act as a custom re-ranking on top of Brave’s search index. The parameter supports both a url where the Goggle is hosted or the definition of the Goggle. For more details, see the <a href="/documentation/resources/goggles">Goggles documentation</a>. The parameter can be a  */
  "goggles"?: ((string) | (Array<string>) | (null));
  /** <p>Filters search results by page age. The age of a page is determined by the most relevant date reported by the content, such as its published or last modified date. The following values are supported:</p> <ul> <li><strong>pd</strong> - Pages aged 24 hours or less.</li> <li><str */
  "freshness"?: string;
  /** Whether to enable local recall. Not setting this value means auto-detect: local recall is used if a location is provided (<code>X-Loc-Lat</code> with <code>X-Loc-Long</code>, or <code>X-Loc-City</code>). */
  "enable_local"?: ((boolean) | (null));
  /** Enable source metadata enrichment (site_name, favicon, thumbnail, description, fetched_content_timestamp) in the sources attribute of the response. */
  "enable_source_metadata"?: boolean;
};

export type BraveSchemaOpenAIChatRequest = {
  /** The conversation so far. Exactly one <code>user</code> message is supported, e.g. <code>[{&quot;role&quot;: &quot;user&quot;, &quot;content&quot;: &quot;Explain quantum computing&quot;}]</code>. (maxItems 1) */
  "messages": Array<BraveSchemaUserMessage>;
  /** Model ID used to generate the response. */
  "model"?: "brave-pro" | "brave";
  "max_completion_tokens"?: ((number) | (null));
  /** Accepted for OpenAI SDK compatibility and currently ignored: the pairs are not stored or returned. */
  "metadata"?: (({
    [key: string]: string;
  }) | (null));
  /** Accepted for OpenAI SDK compatibility and currently ignored: answers are not reproducible. */
  "seed"?: ((number) | (null));
  "stream"?: boolean;
  "web_search_options"?: ((BraveSchemaWebSearchOptions) | (null));
  "country"?: string;
  "language"?: string;
  "safesearch"?: string;
  /** Whether to include inline entity tags in the answer. Requires <code>stream=true</code> and is not supported in research mode. */
  "enable_entities"?: boolean;
  /** Whether to include inline citation tags in the answer. Requires <code>stream=true</code> and is not supported in research mode. */
  "enable_citations"?: boolean;
  /** Whether to answer with iterative deep research instead of a single search. Requires <code>stream=true</code>. */
  "enable_research"?: boolean;
  /** Accepted for compatibility. Ignored by the mixer engine behind this API, which always runs research with extended thinking off. */
  "research_allow_thinking"?: boolean;
  /** Maximum number of tokens to gather per research query. (min 1024, max 16384) */
  "research_maximum_number_of_tokens_per_query"?: number;
  /** Maximum number of search queries research mode may issue in total. (min 1, max 50) */
  "research_maximum_number_of_queries"?: number;
  /** Maximum number of research iterations. (min 1, max 5) */
  "research_maximum_number_of_iterations"?: number;
  /** Time budget for research, in seconds. (min 1, max 300) */
  "research_maximum_number_of_seconds"?: number;
  /** Maximum number of search results to consider per research query. (min 1, max 60) */
  "research_maximum_number_of_results_per_query"?: number;
};

export type BraveSchemaDelta = {
  "role"?: "assistant";
  "content": string;
};

export type BraveSchemaOpenAIUsage = {
  "completion_tokens": number;
  "prompt_tokens": number;
  "total_tokens": number;
  "completion_tokens_details"?: ((BraveSchemaOpenAICompletionTokensDetails) | (null));
};

export type BraveSchemaOpenAIChatResponse = {
  "model"?: "brave-pro" | "brave";
  "system_fingerprint"?: ((string) | (null));
  "choices": Array<BraveSchemaChoiceChunk>;
  "created": number;
  "id": string;
  "object"?: "chat.completion.chunk";
  "usage"?: ((BraveSchemaOpenAIUsage) | (null));
};

export type BraveSchemaMarketCodes = "es-AR" | "en-AU" | "de-AT" | "nl-BE" | "fr-BE" | "pt-BR" | "en-CA" | "fr-CA" | "es-CL" | "da-DK" | "fi-FI" | "fr-FR" | "de-DE" | "el-GR" | "zh-HK" | "en-IN" | "en-ID" | "it-IT" | "ja-JP" | "ko-KR" | "en-MY" | "es-MX" | "nl-NL" | "en-NZ" | "no-NO" | "zh-CN" | "pl-PL" | "en-PH" | "ru-RU" | "en-ZA" | "es-ES" | "sv-SE" | "fr-CH" | "de-CH" | "zh-TW" | "tr-TR" | "en-GB" | "en-US" | "es-US";

export type BraveSchemaMeasurementUnit = "imperial" | "metric";

export type BraveSchemaWebSearchApiResponse = {
  "type"?: "search";
  /** Search query string and its modifications that are used for search. */
  "query"?: ((BraveSchemaAppModelsProductsSearchV1QueryQuery) | (null));
  /** Discussions clusters aggregated from forum posts that are relevant to the query. */
  "discussions"?: ((BraveSchemaDiscussions) | (null));
  /** Frequently asked questions that are relevant to the search query. */
  "faq"?: ((BraveSchemaAppModelsProductsSearchV1FaqFAQ) | (null));
  /** Aggregated information on an entity showable as an infobox. */
  "infobox"?: ((BraveSchemaGraphInfobox) | (null));
  /** Places of interest (POIs) relevant to location sensitive queries. */
  "locations"?: ((BraveSchemaLocations) | (null));
  /** Preferred ranked order of search results. */
  "mixed"?: ((BraveSchemaMixedResponse) | (null));
  /** News results relevant to the query. */
  "news"?: ((BraveSchemaNews) | (null));
  /** Videos results relevant to the query. */
  "videos"?: ((BraveSchemaVideos) | (null));
  /** Web results relevant to the query. */
  "web"?: ((BraveSchemaSearch) | (null));
  /** Summary key to get summary results for the query. */
  "summarizer"?: ((BraveSchemaSummarizer) | (null));
  /** Callback information to retrieve rich results. */
  "rich"?: ((BraveSchemaRichHeaderCallback) | (null));
};

export type BraveSchemaWebSearchParameters = {
  /** The user’s search query term. Query can not be empty. Maximum of 600 characters and 75 words in the query. (minLength 1, maxLength 600) */
  "q": string;
  /** The 2 character country code where the search results come from. */
  "country"?: BraveSchemaSearchCountry;
  /** The 2 or more character language code for which the search results are provided. */
  "search_lang"?: BraveSchemaLanguageInput;
  /** User interface language preferred in response. Usually of the format &lt;language_code&gt;-&lt;country_code&gt;. For more, see <a href="https://www.rfc-editor.org/rfc/rfc9110.html#name-accept-language">RFC 9110</a>. */
  "ui_lang"?: BraveSchemaMarketCodes;
  /** <p>The number of search results returned in response. The maximum is 20. The actual number delivered may be less than requested. Combine this parameter with offset to paginate search results.</p> <p><strong>NOTE:</strong> Count only applies to web results.</p> (min 1, max 20) */
  "count"?: number;
  /** <p>The zero based offset that indicates number of search result pages (count) to skip before returning the result. The default is 0 and the maximum is 9. The actual number delivered may be less than requested.</p> <p>Use this parameter along with the count parameter to page resul (min 0, max 9) */
  "offset"?: number;
  /** <p>Filters search results for adult content. The following values are supported:</p> <ul> <li><strong>off</strong> - No filtering is done.</li> <li><strong>moderate</strong> - Filters explicit content, like images and videos, but allows adult domains in the search results.</li> < */
  "safesearch"?: BraveSchemaAppModelsGeneralSafeSearch;
  /** Whether to spell check provided query. If the spell checker is enabled, the modified query is always used for search. The modified query can be found in altered key from the query response model. */
  "spellcheck"?: boolean;
  /** <p>Filters search results by page age. The age of a page is determined by the most relevant date reported by the content, such as its published or last modified date. The following values are supported:</p> <ul> <li><strong>pd</strong> - Pages aged 24 hours or less.</li> <li><str */
  "freshness"?: string;
  /** Whether display strings (e.g. result snippets) should include decoration markers (e.g. highlighting characters). */
  "text_decorations"?: boolean;
  /** <p>A comma delimited string of result types to include in the search response. Not specifying this parameter will return back all result types in search response where data is available and the plan has the corresponding option activated. The response always includes query and ty */
  "result_filter"?: ((Array<string>) | (null));
  /** <p>The measurement units. The following values are supported:</p> <ul> <li><strong>metric</strong> - The standardized measurement system (km, celcius…)</li> <li><strong>imperial</strong> - The British Imperial system of units (mile, fahrenheit…)</li> </ul> */
  "units"?: ((BraveSchemaMeasurementUnit) | (null));
  /** Goggles act as a custom re-ranking on top of Brave’s search index. For more details, refer to the Goggles repository. This parameter is deprecated. Please use the goggles parameter. */
  "goggles_id"?: ((string) | (null));
  /** Goggles act as a custom re-ranking on top of Brave’s search index. The parameter supports both a url where the Goggle is hosted or the definition of the Goggle. For more details, see the <a href="/documentation/resources/goggles">Goggles documentation</a>. The parameter can be a  */
  "goggles"?: ((string) | (Array<string>) | (null));
  /** A snippet is an excerpt from a page you get as a result of the query, and extra_snippets allow you to get up to 5 additional, alternative excerpts. */
  "extra_snippets"?: ((boolean) | (null));
  /** This parameter enables summary key generation in web search results. This is required for summarizer to be enabled. */
  "summary"?: ((boolean) | (null));
  /** <p>Enable rich callback. Allows you to get real time rich results via a callback URL when they are relevant to your query.</p> <p><strong>NOTE</strong>: Requires <code>Search</code> plan.</p> */
  "enable_rich_callback"?: boolean;
  /** Include fetch metadata. */
  "include_fetch_metadata"?: boolean;
  /** Whether to apply search operators */
  "operators"?: boolean;
};

export type BraveSchemaLocalPoiSearchApiResponse = {
  "type"?: "local_pois";
  /** The list of location results (POIs) for the given location identifiers. */
  "results"?: ((Array<((BraveSchemaLocationResult) | (null))>) | (null));
};

export type BraveSchemaLocalDescriptionsSearchApiResponse = {
  "type"?: "local_descriptions";
  /** The list of location descriptions for the given location identifiers. */
  "results"?: ((Array<((BraveSchemaLocationDescription) | (null))>) | (null));
};

export type BraveSchemaRichHeaderResponse = {
  "type"?: "rich";
  "results"?: Array<BraveSchemaRichResult>;
  "response_callback_info"?: ((BraveSchemaResponseCallbackInfo) | (null));
};

export type BraveSchemaNewsSearchApiResponse = {
  "type"?: "news";
  /** News search query string. */
  "query": BraveSchemaAppModelsProductsSearchV1NewsQuery;
  /** The list of news results for the given query. */
  "results"?: Array<BraveSchemaAppModelsProductsSearchV1NewsNewsResult>;
};

export type BraveSchemaNewsSearchParameters = {
  /** The user’s search query term. Query can not be empty. Maximum of 400 characters and 50 words in the query. (minLength 1, maxLength 400) */
  "q": string;
  /** The search language preference. The 2 or more character language code for which the search results are provided. */
  "search_lang"?: BraveSchemaLanguageInput;
  /** User interface language preferred in response. Usually of the format <code>&lt;language_code&gt;-&lt;country_code&gt;</code>. For more, see <a href="https://www.rfc-editor.org/rfc/rfc9110.html#name-accept-language">RFC 9110</a>. */
  "ui_lang"?: BraveSchemaMarketCodes;
  /** The search query country, where the results come from. The country string is limited to 2 character country codes of supported countries or <code>ALL</code> for worldwide. */
  "country"?: BraveSchemaSearchCountry;
  /** <p>Filters search results for adult content. The following values are supported:</p> <ul> <li><strong>off</strong> - No filtering is done.</li> <li><strong>moderate</strong> - Filter out explicit content.</li> <li><strong>strict</strong> - Filter out explicit and suggestive conte */
  "safesearch"?: BraveSchemaAppModelsGeneralSafeSearch;
  /** The number of search results returned in response. The maximum is 50. The actual number delivered may be less than requested. Combine this parameter with offset to paginate search results. (min 1, max 50) */
  "count"?: number;
  /** The zero based offset that indicates number of search results per page (count) to skip before returning the result. The maximum is 9. The actual number delivered may be less than requested based on the query. In order to paginate results use this parameter together with count. Fo (min 0, max 9) */
  "offset"?: number;
  /** Whether to spell check the provided query. If the spellchecker is enabled, the modified query is always used for search. The modified query can be found in altered key from the query response model. */
  "spellcheck"?: boolean;
  /** <p>Filters search results by page age. The age of a page is determined by the most relevant date reported by the content, such as its published or last modified date. The following values are supported:</p> <ul> <li><strong>pd</strong> - Pages aged 24 hours or less.</li> <li><str */
  "freshness"?: string;
  /** A snippet is an excerpt from a page you get as a result of the query, and extra_snippets allow you to get up to 5 additional, alternative excerpts. */
  "extra_snippets"?: ((boolean) | (null));
  /** Goggles act as a custom re-ranking on top of Brave’s search index. The parameter supports both a url where the Goggle is hosted or the definition of the Goggle. For more details, see the <a href="/documentation/resources/goggles">Goggles documentation</a>. The parameter can be a  */
  "goggles"?: ((string) | (Array<string>) | (null));
  /** Include fetch metadata. */
  "include_fetch_metadata"?: boolean;
  /** Whether to apply search operators. */
  "operators"?: boolean;
};

export type BraveSchemaVideoSearchApiResponse = {
  "type"?: "videos";
  /** Video search query string. */
  "query": BraveSchemaAppModelsProductsSearchV1VideosQuery;
  /** The list of video results for the given query. */
  "results"?: Array<BraveSchemaAppModelsProductsSearchV1VideosVideoResult>;
  /** Additional information about the video search results. */
  "extra": BraveSchemaAppModelsProductsSearchV1VideosExtra;
};

export type BraveSchemaVideoSearchParameters = {
  /** The user’s search query term. Query can not be empty. Maximum of 400 characters and 50 words in the query. (minLength 1, maxLength 400) */
  "q": string;
  /** The search language preference. The 2 or more character language code for which the search results are provided. */
  "search_lang"?: BraveSchemaLanguageInput;
  /** User interface language preferred in response. Usually of the format <code>&lt;language_code&gt;-&lt;country_code&gt;</code>. For more, see <a href="https://www.rfc-editor.org/rfc/rfc9110.html#name-accept-language">RFC 9110</a>. */
  "ui_lang"?: BraveSchemaMarketCodes;
  /** The search query country, where the results come from. The country string is limited to 2 character country codes of supported countries or <code>ALL</code> for worldwide. */
  "country"?: BraveSchemaSearchCountry;
  /** <p>Filters search results for adult content. The following values are supported:</p> <ul> <li><strong>off</strong> - No filtering is done.</li> <li><strong>moderate</strong> - Filters explicit content, like images and videos, but allows adult domains in the search results.</li> < */
  "safesearch"?: BraveSchemaAppModelsGeneralSafeSearch;
  /** The number of search results returned in response. The maximum is 50. The actual number delivered may be less than requested. Combine this parameter with offset to paginate search results. (min 1, max 50) */
  "count"?: number;
  /** The zero based offset that indicates number of search results per page (count) to skip before returning the result. The maximum is 9. The actual number delivered may be less than requested based on the query. In order to paginate results use this parameter together with count. Fo (min 0, max 9) */
  "offset"?: number;
  /** Whether to spell check the provided query. If the spellchecker is enabled, the modified query is always used for search. The modified query can be found in altered key from the query response model. */
  "spellcheck"?: boolean;
  /** <p>Filters search results by page age. The age of a page is determined by the most relevant date reported by the content, such as its published or last modified date. The following values are supported:</p> <ul> <li><strong>pd</strong> - Pages aged 24 hours or less.</li> <li><str */
  "freshness"?: string;
  /** Include fetch metadata. */
  "include_fetch_metadata"?: boolean;
  /** Whether to apply search operators. */
  "operators"?: boolean;
};

export type BraveSchemaAppModelsProductsSearchV1ImagesSafeSearch = "off" | "strict";

export type BraveSchemaImageSearchApiResponse = {
  "type"?: "images";
  /** Image search query string. */
  "query": BraveSchemaAppModelsProductsSearchV1ImagesQuery;
  /** The list of image results for the given query. */
  "results": Array<BraveSchemaImageResult>;
  /** Additional information about the image search results. */
  "extra": BraveSchemaAppModelsProductsSearchV1ImagesExtra;
};

export type BraveSchemaLocalPlaceSearchApiResponse = {
  "type"?: "locations";
  /** The query object containing the original and potentially spell-corrected query. */
  "query"?: ((BraveSchemaSnakepitModelsSearchApiResponsesLocalV1Query) | (null));
  /** The list of points of interest results for the given quer. */
  "results"?: ((Array<BraveSchemaLocationResult>) | (null));
  /** The list of city results for the given query. */
  "cities"?: ((Array<BraveSchemaCityResult>) | (null));
  /** The list of country results for the given query. */
  "countries"?: ((Array<BraveSchemaCountryResult>) | (null));
  /** The list of region results for the given query. */
  "regions"?: ((Array<BraveSchemaRegionResult>) | (null));
  /** The list of neighborhood results for the given query. */
  "neighborhoods"?: ((Array<BraveSchemaNeighborhoodResult>) | (null));
  /** The list of address results for the given query. */
  "addresses"?: ((Array<BraveSchemaAddressResult>) | (null));
  /** The list of street results for the given query. */
  "streets"?: ((Array<BraveSchemaAddressResult>) | (null));
  /** The list of mixed results for the given query. */
  "mixed"?: Array<BraveSchemaResultReference>;
  /** Information about location resolved from either the coordinates of the location string. */
  "location"?: ((BraveSchemaSnakepitModelsSearchApiResponsesLocalV1Location) | (null));
};

export type BraveSchemaSuggestSearchApiResponse = {
  "type"?: "suggest";
  /** Suggest search query string. Only the original query is returned. */
  "query": BraveSchemaOriginalQuery;
  /** The list of suggestions for the given query. */
  "results"?: Array<BraveSchemaSuggestResult>;
};

export type BraveSchemaSpellCheckSearchApiResponse = {
  "type"?: "spellcheck";
  /** Spellcheck search query string. Only the original query is returned. */
  "query": BraveSchemaOriginalQuery;
  /** The list of spell-checked results for given query. */
  "results"?: Array<BraveSchemaSpellCheckResult>;
};

export type BraveSchemaLLMContext = {
  /** Array of LLM context items with extracted web content. */
  "generic"?: Array<BraveSchemaLLMContextItem>;
  /** Point of interest data. When <code>enable_local</code> is enabled, the response may include POI data. */
  "poi"?: ((BraveSchemaLLMContextPOIItem) | (null));
  /** Map/place results. When <code>enable_local</code> is enabled, the response may include map data. */
  "map"?: Array<BraveSchemaLLMContextMapItem>;
};

export type BraveSchemaSource = {
  /** The page title. */
  "title"?: string;
  /** The source hostname. */
  "hostname"?: string;
  /** The page’s date rendered four ways, in fixed positions: full date, <code>YYYY-MM-DD</code>, relative age, and an ISO 8601 timestamp. Empty when the page has no known date. */
  "age"?: ((Array<string>) | (null));
  /** The site name (e.g. ‘Wikipedia’). */
  "site_name"?: ((string) | (null));
  /** URL to the site’s favicon image. */
  "favicon"?: ((string) | (null));
  /** Page thumbnail: <code>src</code> is the proxied URL (ready to serve); <code>original</code> is the raw upstream URL. */
  "thumbnail"?: ((BraveSchemaSnakepitModelsSearchApiSpecsAtomicThumbnail) | (null));
  /** Robots.txt status for the requested user-agent: allow, disallow, or unknown. */
  "robotstxt_status"?: (("allow" | "disallow" | "unknown") | (null));
  /** The most query-relevant passage of the source page. */
  "snippet"?: ((string) | (null));
  /** The page’s own description, independent of the query (unlike <code>snippet</code>). Requires <code>enable_source_metadata</code>. */
  "description"?: ((string) | (null));
  /** Unix seconds of the index’s last fetch of this page. Requires <code>enable_source_metadata</code>. */
  "fetched_content_timestamp"?: ((number) | (null));
};

export type BraveSchemaUserMessage = {
  "role"?: "user";
  "content": string;
};

export type BraveSchemaWebSearchOptions = {
  "search_context_size"?: (("low" | "medium" | "high") | (null));
  "user_location"?: ((BraveSchemaUserLocation) | (null));
};

export type BraveSchemaOpenAICompletionTokensDetails = {
  "reasoning_tokens"?: ((number) | (null));
};

export type BraveSchemaChoiceChunk = {
  "delta": BraveSchemaDelta;
  "finish_reason"?: (("stop" | "length") | (null));
};

export type BraveSchemaAppModelsProductsSearchV1QueryQuery = {
  /** The original query that was requested. */
  "original": string;
  /** Whether to show a warning that strict safesearch filtered results. */
  "show_strict_warning"?: ((boolean) | (null));
  /** The altered query by the spellchecker. */
  "altered"?: ((string) | (null));
  /** The cleaned normalized query. */
  "cleaned"?: ((string) | (null));
  /** Whether safesearch is active. */
  "safesearch"?: ((boolean) | (null));
  /** Whether the query is navigational (user wants to go to a specific site). */
  "is_navigational"?: ((boolean) | (null));
  /** Whether the query has local intent. */
  "is_geolocal"?: ((boolean) | (null));
  /** The local search decision for the query. */
  "local_decision"?: ((string) | (null));
  /** Index of the local location result. */
  "local_locations_idx"?: ((number) | (null));
  /** Whether the query is a trending topic. */
  "is_trending"?: ((boolean) | (null));
  /** Whether the query is related to breaking news. */
  "is_news_breaking"?: ((boolean) | (null));
  /** Whether to prompt the user for their location. */
  "ask_for_location"?: ((boolean) | (null));
  /** The detected language of the query. */
  "language"?: ((BraveSchemaAppModelsProductsSearchV1LanguageLanguage) | (null));
  /** Whether spellcheck is disabled for this query. */
  "spellcheck_off"?: ((boolean) | (null));
  /** The country code for the query. */
  "country"?: ((string) | (null));
  /** Whether the results are considered low quality. */
  "bad_results"?: ((boolean) | (null));
  /** Whether to fallback to alternative ranking. */
  "should_fallback"?: ((boolean) | (null));
  /** The latitude for location-based queries. */
  "lat"?: ((string) | (null));
  /** The longitude for location-based queries. */
  "long"?: ((string) | (null));
  /** The postal code for location-based queries. */
  "postal_code"?: ((string) | (null));
  /** The city for location-based queries. */
  "city"?: ((string) | (null));
  /** The country from request headers. */
  "header_country"?: ((string) | (null));
  /** Whether more results are available for pagination. */
  "more_results_available"?: ((boolean) | (null));
  /** The state/region for location-based queries. */
  "state"?: ((string) | (null));
  /** A custom label for the location. */
  "custom_location_label"?: ((string) | (null));
  /** Reddit cluster identifier for discussion results. */
  "reddit_cluster"?: ((string) | (null));
  /** Key to retrieve AI-generated summary for the query. */
  "summary_key"?: ((string) | (null));
  /** Search operators that were detected and applied to the query. */
  "search_operators"?: ((BraveSchemaSearchOperators) | (null));
  /** Related queries for the query. */
  "related_queries"?: Array<string>;
};

export type BraveSchemaDiscussions = {
  /** The type identifying a discussion cluster. Currently the value is always <code>search</code>. */
  "type"?: "search";
  /** A list of discussion results. */
  "results": Array<BraveSchemaDiscussionResult>;
  /** Whether the discussion results are changed by Goggles. The value is <code>false</code> by default. */
  "mutated_by_goggles"?: boolean;
};

export type BraveSchemaAppModelsProductsSearchV1FaqFAQ = {
  /** The FAQ result type identifier. The value is always <code>faq</code>. */
  "type"?: "faq";
  /** A list of aggregated question answer results relevant to the query. */
  "results": Array<BraveSchemaQA>;
};

export type BraveSchemaGraphInfobox = {
  /** The type identifier for infoboxes. The value is always <code>graph</code>. */
  "type"?: "graph";
  /** A list of infoboxes associated with the query. */
  "results": Array<((BraveSchemaGenericInfobox) | (BraveSchemaQAInfobox) | (BraveSchemaInfoboxPlace) | (BraveSchemaInfoboxWithLocation) | (BraveSchemaEntityInfobox))>;
};

export type BraveSchemaLocations = {
  /** Location type identifier. The value is always <code>locations</code>. */
  "type"?: "locations";
  /** An aggregated list of location sensitive results. */
  "results": Array<BraveSchemaLocationResult>;
  /** The provider of the location data. */
  "provider"?: (({ [key: string]: unknown }) | (null));
};

export type BraveSchemaMixedResponse = {
  /** The type representing the model mixed. The value is always <code>mixed</code>. */
  "type"?: "mixed";
  /** The ranking order for the main section of the search result page. */
  "main"?: ((Array<BraveSchemaResultReference>) | (null));
  /** The ranking order for the top section of the search result page. */
  "top"?: ((Array<BraveSchemaResultReference>) | (null));
  /** The ranking order for the side section of the search result page. */
  "side"?: ((Array<BraveSchemaResultReference>) | (null));
};

export type BraveSchemaNews = {
  /** The type of API result. The value is always <code>news</code>. */
  "type"?: "news";
  /** The list of news results. */
  "results": Array<BraveSchemaAppModelsProductsSearchV1SharedNewsResult>;
  /** Whether the results are mutated by a goggle. */
  "mutated_by_goggles"?: boolean;
};

export type BraveSchemaVideos = {
  /** The type of API result. The value is always <code>videos</code>. */
  "type"?: "videos";
  /** The list of video results. */
  "results": Array<BraveSchemaAppModelsProductsSearchV1VideosVideoResult>;
  /** Whether the results are mutated by a goggle. */
  "mutated_by_goggles"?: boolean;
};

export type BraveSchemaSearch = {
  /** A type identifying web search results. The value is always <code>search</code>. */
  "type"?: "search";
  /** A list of search results. */
  "results": Array<BraveSchemaSearchResult>;
  /** Whether the results are family friendly. */
  "family_friendly"?: boolean;
};

export type BraveSchemaSummarizer = {
  /** The type of result. The value is always <code>summarizer</code>. */
  "type"?: "summarizer";
  /** The key to retrieve the full summary results. */
  "key": string;
};

export type BraveSchemaRichHeaderCallback = {
  "type"?: "rich";
  "hint"?: ((BraveSchemaResponseCallback) | (null));
};

export type BraveSchemaLocationResult = {
  /** The title of the web page. */
  "title": string;
  /** The URL where the page is served. */
  "url": string;
  /** Whether the result is from a local source. */
  "is_source_local"?: boolean;
  /** Whether the result is from both local and global sources. */
  "is_source_both"?: boolean;
  /** A description for the web page. */
  "description"?: ((string) | (null));
  /** The page’s date, based on its published or last modified date. */
  "page_age"?: ((string) | (null));
  /** A date representing when the web page was last fetched. */
  "page_fetched"?: ((string) | (null));
  /** The timestamp when the content was fetched. */
  "fetched_content_timestamp"?: ((number) | (null));
  /** A profile associated with the web page. */
  "profile"?: ((BraveSchemaAppModelsProductsSearchV1SharedProfile) | (null));
  /** A language classification for the web page. */
  "language"?: ((string) | (null));
  /** Whether the web page is family friendly. */
  "family_friendly"?: boolean;
  /** Location result type identifier. The value is always <code>location_result</code>. */
  "type"?: "location_result";
  /** The complete URL of the provider. */
  "provider_url": string;
  /** A list of coordinates associated with the location. This is a lat long represented as a floating point. */
  "coordinates"?: ((Array<unknown>) | (null));
  /** The zoom level on the map. */
  "zoom_level"?: number;
  /** The thumbnail associated with the location. */
  "thumbnail"?: ((BraveSchemaAppModelsProductsSearchV1SharedThumbnail) | (null));
  /** The postal address associated with the location. */
  "postal_address"?: ((BraveSchemaPostalAddress) | (null));
  /** The opening hours, if it is a business, associated with the location. */
  "opening_hours"?: ((BraveSchemaOpeningHours) | (null));
  /** The contact of the business associated with the location. */
  "contact"?: ((BraveSchemaContact) | (null));
  /** A display string used to show the price classification for the business. */
  "price_range"?: ((string) | (null));
  /** The ratings of the business. */
  "rating"?: ((BraveSchemaAppModelsProductsSearchV1SharedRating) | (null));
  /** The distance of the location from the client. */
  "distance"?: ((BraveSchemaUnit) | (null));
  /** Profiles associated with the business. */
  "profiles"?: ((Array<BraveSchemaAppModelsProductsSearchV1SharedDataProvider>) | (null));
  /** Aggregated reviews from various sources relevant to the business. */
  "reviews"?: ((BraveSchemaReviews) | (null));
  /** A bunch of pictures associated with the business. */
  "pictures"?: ((BraveSchemaPictureResults) | (null));
  /** An action to be taken. */
  "action"?: ((BraveSchemaAction) | (null));
  /** A list of cuisine categories served. */
  "serves_cuisine"?: ((Array<string>) | (null));
  /** A list of categories. */
  "categories"?: Array<string>;
  /** An icon category. */
  "icon_category"?: ((string) | (null));
  /** IANA timezone identifier. */
  "timezone"?: ((string) | (null));
  /** The UTC offset of the timezone. */
  "timezone_offset"?: ((number) | (null));
  /** A temporary id associated with this result, which can be used to retrieve extra information about the location. It remains valid for 8 hours. */
  "id"?: ((string) | (null));
  /** Web results related to this location. */
  "results"?: ((Array<BraveSchemaLocationWebResult>) | (null));
};

export type BraveSchemaLocationDescription = {
  /** The type of a location description. The value is always <code>local_description</code>. */
  "type"?: "local_description";
  /** A temporary id of the location with this description. */
  "id": string;
  /** AI generated description of the location with the given id. */
  "description"?: ((string) | (null));
};

export type BraveSchemaRichResult = {
  "type"?: "rich";
  "subtype": BraveSchemaSearchAPIVertical;
  "provider"?: ((BraveSchemaSnakepitModelsMixerSpecsItemsDataProvider) | (null));
  "language"?: ((string) | (null));
  "calculator"?: ((BraveSchemaCalculatorResult) | (null));
  "cryptocurrency"?: ((BraveSchemaCryptocurrencyResult) | (null));
  "currency"?: ((BraveSchemaCurrencyResult) | (null));
  "definitions"?: ((BraveSchemaDefinitionsResult) | (null));
  "formula1"?: ((BraveSchemaFormula1Result) | (null));
  "news"?: ((BraveSchemaTopStoriesNewsResult) | (null));
  "packagetracker"?: ((BraveSchemaPackageTrackerResult) | (null));
  "american_football"?: ((BraveSchemaSportsResultAmericanFootball) | (null));
  "football"?: ((BraveSchemaSportsResultFootball) | (null));
  "baseball"?: ((BraveSchemaSportsResultBaseball) | (null));
  "basketball"?: ((BraveSchemaSportsResultBasketball) | (null));
  "ice_hockey"?: ((BraveSchemaSportsResultIceHockey) | (null));
  "cricket"?: ((BraveSchemaSportsResultCricket) | (null));
  "stock"?: ((BraveSchemaStockResult) | (null));
  "unitconversion"?: ((BraveSchemaUnitConversionResult) | (null));
  "unixtimestamp"?: ((BraveSchemaUnixTimestampResult) | (null));
  "weather"?: ((BraveSchemaWeatherResult) | (null));
};

export type BraveSchemaResponseCallbackInfo = {
  /** The vertical associated with the callback. For the full list of verticals supported see the Rich Vertical list. */
  "vertical"?: ((BraveSchemaSearchAPIVertical) | (null));
  /** The unique key for the callback. */
  "callback_key": string;
  /** The status of the callback operation. The value is either <code>success</code> or <code>failure</code>. */
  "callback_status": "success" | "failure";
  /** The language used for the search. */
  "search_lang"?: BraveSchemaSnakepitModelsMixerGeneralLanguage;
};

export type BraveSchemaAppModelsProductsSearchV1NewsQuery = {
  /** The original query that was requested. */
  "original": string;
  /** The altered query by the spellchecker. This is the query that is used to search if any. */
  "altered"?: ((string) | (null));
  /** The cleaned normalized query by the spellchecker. This is the query that is used to search if any. */
  "cleaned"?: ((string) | (null));
  /** Whether the spellchecker is enabled or disabled. */
  "spellcheck_off"?: ((boolean) | (null));
  /** The value is <code>true</code> if the lack of results is due to a <code>strict</code> safesearch setting. Adult content relevant to the query was found, but was blocked by safesearch. */
  "show_strict_warning"?: ((boolean) | (null));
  /** Search operators applied to the query. */
  "search_operators"?: ((BraveSchemaSearchOperators) | (null));
};

export type BraveSchemaAppModelsProductsSearchV1NewsNewsResult = {
  /** The type of news search API result. The value is always <code>news_result</code>. */
  "type"?: "news_result";
  /** The title of the news article. */
  "title": string;
  /** The source URL of the news article. */
  "url": string;
  /** The description for the news article. */
  "description"?: ((string) | (null));
  /** A human-readable representation of the news article’s age. For example, <code>2 days ago</code>. */
  "age"?: ((string) | (null));
  /** The page’s date, based on its published or last modified date. */
  "page_age"?: ((string) | (null));
  /** The ISO date time when the page was last fetched. The format is <code>YYYY-MM-DDTHH:MM:SSZ</code>. */
  "page_fetched"?: ((string) | (null));
  /** A profile associated with the web page. */
  "profile"?: ((BraveSchemaAppModelsProductsSearchV1SharedProfile) | (null));
  /** The timestamp when the content was fetched. */
  "fetched_content_timestamp"?: ((number) | (null));
  /** Aggregated information on the URL associated with the news search result. */
  "meta_url"?: ((BraveSchemaAppModelsProductsSearchV1NewsMetaUrl) | (null));
  /** Whether the result includes breaking news. */
  "breaking"?: ((boolean) | (null));
  /** The thumbnail for the news article. */
  "thumbnail"?: ((BraveSchemaAppModelsProductsSearchV1NewsThumbnail) | (null));
  /** A list of extra alternate snippets for the news search result. */
  "extra_snippets"?: ((Array<string>) | (null));
  /** Icons associated with the news result. */
  "icons"?: ((Array<BraveSchemaPostprocessedIcon>) | (null));
};

export type BraveSchemaAppModelsProductsSearchV1VideosQuery = {
  /** The original query that was requested. */
  "original": string;
  /** The altered query by the spellchecker. This is the query that is used to search if any. */
  "altered"?: ((string) | (null));
  /** The cleaned normalized query by the spellchecker. This is the query that is used to search if any. */
  "cleaned"?: ((string) | (null));
  /** Whether the spellchecker is enabled or disabled. */
  "spellcheck_off"?: ((boolean) | (null));
  /** The value is <code>true</code> if the lack of results is due to a <code>strict</code> safesearch setting. Adult content relevant to the query was found, but was blocked by safesearch. */
  "show_strict_warning"?: ((boolean) | (null));
  /** Search operators applied to the query. */
  "search_operators"?: ((BraveSchemaSearchOperators) | (null));
};

export type BraveSchemaAppModelsProductsSearchV1VideosVideoResult = {
  /** The type of video search API result. The value is always <code>video_result</code>. */
  "type"?: "video_result";
  /** The source URL of the video. */
  "url": string;
  /** The title of the video. */
  "title": string;
  /** The description for the video. */
  "description"?: ((string) | (null));
  /** A human-readable representation of the video’s age. For example, <code>2 days ago</code>. */
  "age"?: ((string) | (null));
  /** The page’s date, based on its published or last modified date. */
  "page_age"?: ((string) | (null));
  /** The ISO date time when the page was last fetched. The format is <code>YYYY-MM-DDTHH:MM:SSZ</code>. */
  "page_fetched"?: ((string) | (null));
  /** The timestamp when the content was fetched. */
  "fetched_content_timestamp"?: ((number) | (null));
  /** Metadata for the video. */
  "video"?: ((BraveSchemaAppModelsProductsSearchV1VideosVideoData) | (null));
  /** Aggregated information on the URL associated with the video search result. */
  "meta_url"?: ((BraveSchemaAppModelsProductsSearchV1VideosMetaUrl) | (null));
  /** The thumbnail for the video. */
  "thumbnail"?: ((BraveSchemaAppModelsProductsSearchV1VideosThumbnail) | (null));
};

export type BraveSchemaAppModelsProductsSearchV1VideosExtra = {
  /** Indicates whether the video search results might contain offensive content. */
  "might_be_offensive"?: boolean;
};

export type BraveSchemaAppModelsProductsSearchV1ImagesQuery = {
  /** The original query that was requested. */
  "original": string;
  /** The altered query by the spellchecker. This is the query that is used to search. */
  "altered"?: ((string) | (null));
  /** Whether the spellchecker is enabled or disabled. */
  "spellcheck_off"?: ((boolean) | (null));
  /** The value is <code>true</code> if the lack of results is due to a <code>strict</code> safesearch setting. Adult content relevant to the query was found, but was blocked by safesearch. */
  "show_strict_warning"?: ((boolean) | (null));
};

export type BraveSchemaImageResult = {
  /** The type of image search API result. The value is always <code>image_result</code>. */
  "type"?: string;
  /** The title of the image. */
  "title"?: ((string) | (null));
  /** The original page URL where the image was found. */
  "url"?: ((string) | (null));
  /** The source domain where the image was found. */
  "source"?: ((string) | (null));
  /** The ISO date time when the page was last fetched. The format is <code>YYYY-MM-DDTHH:MM:SSZ</code>. */
  "page_fetched"?: ((string) | (null));
  /** The thumbnail for the image. */
  "thumbnail"?: ((BraveSchemaAppModelsProductsSearchV1ImagesThumbnail) | (null));
  /** Metadata for the image. */
  "properties"?: ((BraveSchemaProperties) | (null));
  /** Aggregated information on the URL associated with the image search result. */
  "meta_url"?: ((BraveSchemaAppModelsProductsSearchV1ImagesMetaUrl) | (null));
  /** The confidence level for the image result. */
  "confidence"?: (("low" | "medium" | "high") | (null));
};

export type BraveSchemaAppModelsProductsSearchV1ImagesExtra = {
  /** Indicates whether the image search results might contain offensive content. */
  "might_be_offensive"?: boolean;
};

export type BraveSchemaSnakepitModelsSearchApiResponsesLocalV1Query = {
  /** The original query that was requested. */
  "original": string;
  /** The altered query by the spellchecker. This is the query that is used to search. */
  "altered"?: ((string) | (null));
  /** Whether the spellchecker is enabled or disabled. */
  "spellcheck_off"?: ((boolean) | (null));
  /** The value is <code>true</code> if the lack of results is due to a <code>strict</code> safesearch setting. Adult content relevant to the query was found, but was blocked by safesearch. */
  "show_strict_warning"?: ((boolean) | (null));
};

export type BraveSchemaCityResult = {
  /** City result type identifier. The value is always <code>city</code>. */
  "type"?: "city";
  /** The name of the city. */
  "name": string;
  /** The country of the city. */
  "country": string;
  /** A pair of coordinates (lat, long) for the city. (maxItems 2) */
  "coordinates": Array<unknown>;
  /** Primary image for the city. */
  "thumbnail": BraveSchemaAppModelsProductsSearchV1SharedThumbnail;
};

export type BraveSchemaCountryResult = {
  /** Country result type identifier. The value is always <code>country</code>. */
  "type"?: "country";
  /** The name of the country. */
  "name": string;
  /** The country of the result. */
  "country": string;
  /** A pair of coordinates (lat, long) for the country. (maxItems 2) */
  "coordinates": Array<unknown>;
  /** Primary image for the country. */
  "thumbnail": BraveSchemaAppModelsProductsSearchV1SharedThumbnail;
};

export type BraveSchemaRegionResult = {
  /** Region result type identifier. The value is always <code>region</code>. */
  "type"?: "region";
  /** The name of the region. */
  "name": string;
  /** The country of the region. */
  "country": string;
  /** A pair of coordinates (lat, long) for the region. (maxItems 2) */
  "coordinates": Array<unknown>;
  /** Primary image for the region. */
  "thumbnail": BraveSchemaAppModelsProductsSearchV1SharedThumbnail;
};

export type BraveSchemaNeighborhoodResult = {
  /** Neighborhood result type identifier. The value is always <code>neighborhood</code>. */
  "type"?: "neighborhood";
  /** The name of the neighborhood. */
  "name": string;
  /** The country of the neighborhood. */
  "country": string;
  /** A pair of coordinates (lat, long) for the neighborhood. (maxItems 2) */
  "coordinates": Array<unknown>;
  /** Primary image for the neighborhood. */
  "thumbnail": BraveSchemaAppModelsProductsSearchV1SharedThumbnail;
};

export type BraveSchemaAddressResult = {
  /** Result type identifier. <code>address</code> when the result refers to an explicit street + number, <code>street</code> when it refers to the street itself. */
  "type"?: "address" | "street";
  /** The name of the address. */
  "name": string;
  /** A pair of coordinates (lat, long) for the address. (maxItems 2) */
  "coordinates": Array<unknown>;
  /** POIs located at this address. */
  "pois"?: Array<BraveSchemaLocationResult>;
  /** POIs located nearby this address. */
  "pois_nearby"?: Array<BraveSchemaLocationResult>;
  /** Suggested zoom level on the map. */
  "zoom_level"?: number;
  /** Distance from the user’s geolocation, if available. */
  "distance"?: ((BraveSchemaUnit) | (null));
  /** Structured postal address. */
  "postal_address"?: ((BraveSchemaPostalAddress) | (null));
};

export type BraveSchemaResultReference = {
  /** The type of the result. */
  "type": string;
  /** The 0th based index where the result should be placed. */
  "index"?: ((number) | (null));
  /** Whether to put all the results from the type at specific position. */
  "all"?: boolean;
};

export type BraveSchemaSnakepitModelsSearchApiResponsesLocalV1Location = {
  /** The latitude and longitude of the location. (maxItems 2) */
  "coordinates": Array<unknown>;
  /** The name of the location. */
  "name"?: ((string) | (null));
  /** The two letter country code of the location. */
  "country"?: ((string) | (null));
};

export type BraveSchemaOriginalQuery = {
  /** The original query that was requested. */
  "original": string;
};

export type BraveSchemaSuggestResult = {
  /** Suggested query completion. */
  "query": string;
  /** Kind of suggestion, currently <code>query</code> or <code>entity</code>. New kinds may be added, so treat an unrecognised value as a plain query suggestion. */
  "type"?: ((BraveSchemaSuggestType) | (null));
  /** Whether the suggested enriched query is an entity. Deprecated: use <code>type</code> instead. */
  "is_entity"?: ((boolean) | (null));
  /** The suggested query enriched title. */
  "title"?: ((string) | (null));
  /** The suggested query enriched description. */
  "description"?: ((string) | (null));
  /** The suggested query enriched image URL. */
  "img"?: ((string) | (null));
};

export type BraveSchemaSpellCheckResult = {
  /** The spellcheck-corrected query. */
  "query": string;
};

export type BraveSchemaLLMContextItem = {
  /** The source URL. */
  "url"?: string;
  /** The page title. */
  "title"?: string;
  /** Extracted text chunks from the page that are picked for their relevance to the query. */
  "snippets"?: Array<string>;
};

export type BraveSchemaLLMContextPOIItem = {
  /** The name of the point of interest. */
  "name"?: ((string) | (null));
  /** The URL of the point of interest. */
  "url"?: ((string) | (null));
  /** The title of the point of interest. */
  "title"?: ((string) | (null));
  /** The snippets about the point of interest. */
  "snippets"?: ((Array<string>) | (null));
};

export type BraveSchemaLLMContextMapItem = {
  /** The name of the place. */
  "name"?: ((string) | (null));
  /** The URL of the place. */
  "url"?: ((string) | (null));
  /** The title of the place. */
  "title"?: ((string) | (null));
  /** The snippets about the place. */
  "snippets"?: ((Array<string>) | (null));
};

export type BraveSchemaSnakepitModelsSearchApiSpecsAtomicThumbnail = {
  /** The served URL of the picture thumbnail. */
  "src": string;
  /** The alt text for the thumbnail image. */
  "alt"?: ((string) | (null));
  /** The height of the thumbnail. */
  "height"?: ((number) | (null));
  /** The width of the thumbnail. */
  "width"?: ((number) | (null));
  /** The background color of the thumbnail. */
  "bg_color"?: ((string) | (null));
  /** The original URL of the image. */
  "original"?: ((string) | (null));
  /** Whether the thumbnail is a logo. */
  "logo"?: ((boolean) | (null));
  /** Whether the thumbnail is a duplicate. */
  "duplicated"?: ((boolean) | (null));
  /** The theme of the thumbnail (e.g., light or dark). */
  "theme"?: ((string) | (null));
};

export type BraveSchemaUserLocation = {
  "approximate": BraveSchemaApproximateUserLocation;
  "type"?: "approximate";
};

export type BraveSchemaAppModelsProductsSearchV1LanguageLanguage = {
  /** The main language seen in the string. */
  "main": string;
};

export type BraveSchemaSearchOperators = {
  /** Whether search operators were applied to the query. */
  "applied"?: boolean;
  /** The query after search operators have been processed. */
  "cleaned_query"?: ((string) | (null));
  /** List of site domains extracted from site: operators. */
  "sites"?: ((Array<string>) | (null));
};

export type BraveSchemaDiscussionResult = {
  /** The title of the web page. */
  "title": string;
  /** The URL where the page is served. */
  "url": string;
  /** Whether the result is from a local source. */
  "is_source_local"?: boolean;
  /** Whether the result is from both local and global sources. */
  "is_source_both"?: boolean;
  /** A description for the web page. */
  "description"?: ((string) | (null));
  /** The page’s date, based on its published or last modified date. */
  "page_age"?: ((string) | (null));
  /** A date representing when the web page was last fetched. */
  "page_fetched"?: ((string) | (null));
  /** The timestamp when the content was fetched. */
  "fetched_content_timestamp"?: ((number) | (null));
  /** A profile associated with the web page. */
  "profile"?: ((BraveSchemaAppModelsProductsSearchV1SharedProfile) | (null));
  /** The main language on the web search result. */
  "language"?: string;
  /** Whether the web page is family friendly. */
  "family_friendly"?: boolean;
  /** The discussion result type identifier. The value is always <code>discussion</code>. */
  "type"?: "discussion";
  /** A sub type identifying the web search result type. */
  "subtype"?: string;
  /** Whether the web search result is currently live. Default value is <code>false</code>. */
  "is_live"?: boolean;
  /** Gathered information on a web search result. */
  "deep_results"?: ((BraveSchemaDeepResult) | (null));
  /** A list of schemas (structured data) extracted from the page. The schemas try to follow <a href="http://schema.org">schema.org</a> and will return anything we can extract from the HTML that can fit into these models. */
  "schemas"?: ((Array<unknown>) | (null));
  /** Aggregated information on the URL associated with the web search result. */
  "meta_url"?: (({ [key: string]: unknown }) | (null));
  /** The thumbnail of the web search result. */
  "thumbnail"?: ((BraveSchemaAppModelsProductsSearchV1SharedThumbnail) | (null));
  /** A human-readable representation of the web search result’s age. For example, <code>2 days ago</code>. */
  "age"?: ((string) | (null));
  /** The location details if the query relates to a restaurant. */
  "location"?: ((BraveSchemaLocationResult) | (null));
  /** Deprecated. Use <code>location</code> instead. */
  "restaurant"?: ((BraveSchemaLocationResult) | (null));
  /** The video associated with the web search result. */
  "video"?: ((BraveSchemaAppModelsProductsSearchV1SharedVideoData) | (null));
  /** The movie associated with the web search result. */
  "movie"?: ((BraveSchemaMovieData) | (null));
  /** Any frequently asked questions associated with the web search result. */
  "faq"?: ((BraveSchemaAppModelsProductsSearchV1SharedFAQ) | (null));
  /** Any question answer information associated with the web search result page. */
  "qa"?: ((BraveSchemaQAPage) | (null));
  /** Any book information associated with the web search result page. */
  "book"?: ((BraveSchemaBook) | (null));
  /** Rating found for the web search result page. */
  "rating"?: ((BraveSchemaAppModelsProductsSearchV1SharedRating) | (null));
  /** An article found for the web search result page. */
  "article"?: ((BraveSchemaArticle) | (null));
  /** The main product and a review that is found on the web search result page. */
  "product"?: ((BraveSchemaAppModelsProductsSearchV1SharedProduct) | (BraveSchemaReview) | (null));
  /** A list of products and reviews that are found on the web search result page. */
  "product_cluster"?: ((Array<((BraveSchemaAppModelsProductsSearchV1SharedProduct) | (BraveSchemaReview))>) | (null));
  /** A type representing a cluster. The value can be product_cluster. */
  "cluster_type"?: ((string) | (null));
  /** A list of web search results. */
  "cluster"?: ((Array<BraveSchemaResult>) | (null));
  /** Aggregated information on the creative work found on the web search result. */
  "creative_work"?: ((BraveSchemaCreativeWork) | (null));
  /** Aggregated information on music recording found on the web search result. */
  "music_recording"?: ((BraveSchemaMusicRecording) | (null));
  /** Aggregated information on the review found on the web search result. */
  "review"?: ((BraveSchemaReview) | (null));
  /** Aggregated information on a recipe found on the web search result page. */
  "recipe"?: ((BraveSchemaRecipe) | (null));
  /** Aggregated information on a software product found on the web search result page. */
  "software"?: ((BraveSchemaSoftware) | (null));
  /** Aggregated information on a organization found on the web search result page. */
  "organization"?: ((BraveSchemaOrganization) | (null));
  /** The content type associated with the search result page. */
  "content_type"?: ((string) | (null));
  /** A list of extra alternate snippets for the web search result. */
  "extra_snippets"?: ((Array<string>) | (null));
  /** Icons associated with the search result. */
  "icons"?: ((Array<BraveSchemaPostprocessedIcon>) | (null));
  /** The enriched aggregated data for the relevant forum post. */
  "data"?: ((BraveSchemaForumData) | (null));
};

export type BraveSchemaQA = {
  /** The question being asked. */
  "question": string;
  /** The answer to the question. */
  "answer": string;
  /** The title of the post. */
  "title": string;
  /** The URL pointing to the post. */
  "url": string;
  /** Aggregated information about the URL. */
  "meta_url"?: ((BraveSchemaAppModelsProductsSearchV1SharedMetaUrl) | (null));
};

export type BraveSchemaGenericInfobox = {
  /** The title of the web page. */
  "title": string;
  /** The URL where the page is served. */
  "url": string;
  /** Whether the result is from a local source. */
  "is_source_local"?: boolean;
  /** Whether the result is from both local and global sources. */
  "is_source_both"?: boolean;
  /** A description for the web page. */
  "description"?: ((string) | (null));
  /** The page’s date, based on its published or last modified date. */
  "page_age"?: ((string) | (null));
  /** A date representing when the web page was last fetched. */
  "page_fetched"?: ((string) | (null));
  /** The timestamp when the content was fetched. */
  "fetched_content_timestamp"?: ((number) | (null));
  /** A profile associated with the web page. */
  "profile"?: ((BraveSchemaAppModelsProductsSearchV1SharedProfile) | (null));
  /** A language classification for the web page. */
  "language"?: ((string) | (null));
  /** Whether the web page is family friendly. */
  "family_friendly"?: boolean;
  /** The infobox result type identifier. The value is always <code>infobox</code>. */
  "type"?: "infobox";
  /** The position on a search result page. */
  "position": number;
  /** Any label associated with the entity. */
  "label"?: ((string) | (null));
  /** Category classification for the entity. */
  "category"?: ((string) | (null));
  /** A longer description for the entity. */
  "long_desc"?: ((string) | (null));
  /** The thumbnail associated with the entity. */
  "thumbnail"?: ((BraveSchemaAppModelsProductsSearchV1SharedThumbnail) | (null));
  /** A list of attributes about the entity. */
  "attributes"?: Array<Array<((string) | (null))>>;
  /** The profiles associated with the entity. */
  "profiles"?: ((Array<BraveSchemaAppModelsProductsSearchV1SharedProfile>) | (Array<BraveSchemaAppModelsProductsSearchV1SharedDataProvider>) | (null));
  /** The official website pertaining to the entity. */
  "website_url"?: ((string) | (null));
  /** Any ratings given to the entity. */
  "ratings"?: ((Array<BraveSchemaAppModelsProductsSearchV1SharedRating>) | (null));
  /** A list of data sources for the entity. */
  "providers"?: ((Array<BraveSchemaAppModelsProductsSearchV1SharedDataProvider>) | (null));
  /** A unit representing quantity relevant to the entity. */
  "distance"?: ((BraveSchemaUnit) | (null));
  /** A list of images relevant to the entity. */
  "images"?: ((Array<BraveSchemaAppModelsProductsSearchV1SharedThumbnail>) | (null));
  /** Any movie data relevant to the entity. Appears only when the result is a movie. */
  "movie"?: ((BraveSchemaMovieData) | (null));
  /** The infobox subtype identifier. The value is always <code>generic</code>. */
  "subtype"?: "generic";
  /** List of URLs where the entity was found. */
  "found_in_urls"?: ((Array<string>) | (null));
};

export type BraveSchemaQAInfobox = {
  /** The title of the web page. */
  "title": string;
  /** The URL where the page is served. */
  "url": string;
  /** Whether the result is from a local source. */
  "is_source_local"?: boolean;
  /** Whether the result is from both local and global sources. */
  "is_source_both"?: boolean;
  /** A description for the web page. */
  "description"?: ((string) | (null));
  /** The page’s date, based on its published or last modified date. */
  "page_age"?: ((string) | (null));
  /** A date representing when the web page was last fetched. */
  "page_fetched"?: ((string) | (null));
  /** The timestamp when the content was fetched. */
  "fetched_content_timestamp"?: ((number) | (null));
  /** A profile associated with the web page. */
  "profile"?: ((BraveSchemaAppModelsProductsSearchV1SharedProfile) | (null));
  /** A language classification for the web page. */
  "language"?: ((string) | (null));
  /** Whether the web page is family friendly. */
  "family_friendly"?: boolean;
  /** The infobox result type identifier. The value is always <code>infobox</code>. */
  "type"?: "infobox";
  /** The position on a search result page. */
  "position": number;
  /** Any label associated with the entity. */
  "label"?: ((string) | (null));
  /** Category classification for the entity. */
  "category"?: ((string) | (null));
  /** A longer description for the entity. */
  "long_desc"?: ((string) | (null));
  /** The thumbnail associated with the entity. */
  "thumbnail"?: ((BraveSchemaAppModelsProductsSearchV1SharedThumbnail) | (null));
  /** A list of attributes about the entity. */
  "attributes"?: Array<Array<((string) | (null))>>;
  /** The profiles associated with the entity. */
  "profiles"?: ((Array<BraveSchemaAppModelsProductsSearchV1SharedProfile>) | (Array<BraveSchemaAppModelsProductsSearchV1SharedDataProvider>) | (null));
  /** The official website pertaining to the entity. */
  "website_url"?: ((string) | (null));
  /** Any ratings given to the entity. */
  "ratings"?: ((Array<BraveSchemaAppModelsProductsSearchV1SharedRating>) | (null));
  /** A list of data sources for the entity. */
  "providers"?: ((Array<BraveSchemaAppModelsProductsSearchV1SharedDataProvider>) | (null));
  /** A unit representing quantity relevant to the entity. */
  "distance"?: ((BraveSchemaUnit) | (null));
  /** A list of images relevant to the entity. */
  "images"?: ((Array<BraveSchemaAppModelsProductsSearchV1SharedThumbnail>) | (null));
  /** Any movie data relevant to the entity. Appears only when the result is a movie. */
  "movie"?: ((BraveSchemaMovieData) | (null));
  /** The infobox subtype identifier. The value is always <code>code</code>. */
  "subtype"?: "code";
  /** The question and relevant answer. */
  "data": BraveSchemaQAPage;
  /** Detailed information on the page containing the question and relevant answer. */
  "meta_url"?: ((BraveSchemaAppModelsProductsSearchV1SharedMetaUrl) | (null));
};

export type BraveSchemaInfoboxPlace = {
  /** The title of the web page. */
  "title": string;
  /** The URL where the page is served. */
  "url": string;
  /** Whether the result is from a local source. */
  "is_source_local"?: boolean;
  /** Whether the result is from both local and global sources. */
  "is_source_both"?: boolean;
  /** A description for the web page. */
  "description"?: ((string) | (null));
  /** The page’s date, based on its published or last modified date. */
  "page_age"?: ((string) | (null));
  /** A date representing when the web page was last fetched. */
  "page_fetched"?: ((string) | (null));
  /** The timestamp when the content was fetched. */
  "fetched_content_timestamp"?: ((number) | (null));
  /** A profile associated with the web page. */
  "profile"?: ((BraveSchemaAppModelsProductsSearchV1SharedProfile) | (null));
  /** A language classification for the web page. */
  "language"?: ((string) | (null));
  /** Whether the web page is family friendly. */
  "family_friendly"?: boolean;
  /** The infobox result type identifier. The value is always <code>infobox</code>. */
  "type"?: "infobox";
  /** The position on a search result page. */
  "position": number;
  /** Any label associated with the entity. */
  "label"?: ((string) | (null));
  /** Category classification for the entity. */
  "category"?: ((string) | (null));
  /** A longer description for the entity. */
  "long_desc"?: ((string) | (null));
  /** The thumbnail associated with the entity. */
  "thumbnail"?: ((BraveSchemaAppModelsProductsSearchV1SharedThumbnail) | (null));
  /** A list of attributes about the entity. */
  "attributes"?: Array<Array<((string) | (null))>>;
  /** The profiles associated with the entity. */
  "profiles"?: ((Array<BraveSchemaAppModelsProductsSearchV1SharedProfile>) | (Array<BraveSchemaAppModelsProductsSearchV1SharedDataProvider>) | (null));
  /** The official website pertaining to the entity. */
  "website_url"?: ((string) | (null));
  /** Any ratings given to the entity. */
  "ratings"?: ((Array<BraveSchemaAppModelsProductsSearchV1SharedRating>) | (null));
  /** A list of data sources for the entity. */
  "providers"?: ((Array<BraveSchemaAppModelsProductsSearchV1SharedDataProvider>) | (null));
  /** A unit representing quantity relevant to the entity. */
  "distance"?: ((BraveSchemaUnit) | (null));
  /** A list of images relevant to the entity. */
  "images"?: ((Array<BraveSchemaAppModelsProductsSearchV1SharedThumbnail>) | (null));
  /** Any movie data relevant to the entity. Appears only when the result is a movie. */
  "movie"?: ((BraveSchemaMovieData) | (null));
  /** The infobox subtype identifier. The value is always <code>place</code>. */
  "subtype"?: "place";
  /** List of URLs where the entity was found. */
  "found_in_urls"?: ((Array<string>) | (null));
  /** Whether the entity is a location. */
  "is_location"?: boolean;
  /** The coordinates of the location. */
  "coordinates"?: ((Array<unknown>) | (null));
  /** The map zoom level. */
  "zoom_level"?: ((number) | (null));
  /** The location result. */
  "location": BraveSchemaLocationResult;
};

export type BraveSchemaInfoboxWithLocation = {
  /** The title of the web page. */
  "title": string;
  /** The URL where the page is served. */
  "url": string;
  /** Whether the result is from a local source. */
  "is_source_local"?: boolean;
  /** Whether the result is from both local and global sources. */
  "is_source_both"?: boolean;
  /** A description for the web page. */
  "description"?: ((string) | (null));
  /** The page’s date, based on its published or last modified date. */
  "page_age"?: ((string) | (null));
  /** A date representing when the web page was last fetched. */
  "page_fetched"?: ((string) | (null));
  /** The timestamp when the content was fetched. */
  "fetched_content_timestamp"?: ((number) | (null));
  /** A profile associated with the web page. */
  "profile"?: ((BraveSchemaAppModelsProductsSearchV1SharedProfile) | (null));
  /** A language classification for the web page. */
  "language"?: ((string) | (null));
  /** Whether the web page is family friendly. */
  "family_friendly"?: boolean;
  /** The infobox result type identifier. The value is always <code>infobox</code>. */
  "type"?: "infobox";
  /** The position on a search result page. */
  "position": number;
  /** Any label associated with the entity. */
  "label"?: ((string) | (null));
  /** Category classification for the entity. */
  "category"?: ((string) | (null));
  /** A longer description for the entity. */
  "long_desc"?: ((string) | (null));
  /** The thumbnail associated with the entity. */
  "thumbnail"?: ((BraveSchemaAppModelsProductsSearchV1SharedThumbnail) | (null));
  /** A list of attributes about the entity. */
  "attributes"?: Array<Array<((string) | (null))>>;
  /** The profiles associated with the entity. */
  "profiles"?: ((Array<BraveSchemaAppModelsProductsSearchV1SharedProfile>) | (Array<BraveSchemaAppModelsProductsSearchV1SharedDataProvider>) | (null));
  /** The official website pertaining to the entity. */
  "website_url"?: ((string) | (null));
  /** Any ratings given to the entity. */
  "ratings"?: ((Array<BraveSchemaAppModelsProductsSearchV1SharedRating>) | (null));
  /** A list of data sources for the entity. */
  "providers"?: ((Array<BraveSchemaAppModelsProductsSearchV1SharedDataProvider>) | (null));
  /** A unit representing quantity relevant to the entity. */
  "distance"?: ((BraveSchemaUnit) | (null));
  /** A list of images relevant to the entity. */
  "images"?: ((Array<BraveSchemaAppModelsProductsSearchV1SharedThumbnail>) | (null));
  /** Any movie data relevant to the entity. Appears only when the result is a movie. */
  "movie"?: ((BraveSchemaMovieData) | (null));
  /** The infobox subtype identifier. The value is always <code>location</code>. */
  "subtype"?: "location";
  /** List of URLs where the entity was found. */
  "found_in_urls"?: ((Array<string>) | (null));
  /** Whether the entity is a location. */
  "is_location"?: boolean;
  /** The coordinates of the location. */
  "coordinates"?: ((Array<unknown>) | (null));
  /** The map zoom level. */
  "zoom_level"?: ((number) | (null));
  /** The location result. */
  "location"?: ((BraveSchemaLocationResult) | (null));
};

export type BraveSchemaEntityInfobox = {
  /** The title of the web page. */
  "title": string;
  /** The URL where the page is served. */
  "url": string;
  /** Whether the result is from a local source. */
  "is_source_local"?: boolean;
  /** Whether the result is from both local and global sources. */
  "is_source_both"?: boolean;
  /** A description for the web page. */
  "description"?: ((string) | (null));
  /** The page’s date, based on its published or last modified date. */
  "page_age"?: ((string) | (null));
  /** A date representing when the web page was last fetched. */
  "page_fetched"?: ((string) | (null));
  /** The timestamp when the content was fetched. */
  "fetched_content_timestamp"?: ((number) | (null));
  /** A profile associated with the web page. */
  "profile"?: ((BraveSchemaAppModelsProductsSearchV1SharedProfile) | (null));
  /** A language classification for the web page. */
  "language"?: ((string) | (null));
  /** Whether the web page is family friendly. */
  "family_friendly"?: boolean;
  /** The infobox result type identifier. The value is always <code>infobox</code>. */
  "type"?: "infobox";
  /** The position on a search result page. */
  "position": number;
  /** Any label associated with the entity. */
  "label"?: ((string) | (null));
  /** Category classification for the entity. */
  "category"?: ((string) | (null));
  /** A longer description for the entity. */
  "long_desc"?: ((string) | (null));
  /** The thumbnail associated with the entity. */
  "thumbnail"?: ((BraveSchemaAppModelsProductsSearchV1SharedThumbnail) | (null));
  /** A list of attributes about the entity. */
  "attributes"?: Array<Array<((string) | (null))>>;
  /** The profiles associated with the entity. */
  "profiles"?: ((Array<BraveSchemaAppModelsProductsSearchV1SharedProfile>) | (Array<BraveSchemaAppModelsProductsSearchV1SharedDataProvider>) | (null));
  /** The official website pertaining to the entity. */
  "website_url"?: ((string) | (null));
  /** Any ratings given to the entity. */
  "ratings"?: ((Array<BraveSchemaAppModelsProductsSearchV1SharedRating>) | (null));
  /** A list of data sources for the entity. */
  "providers"?: ((Array<BraveSchemaAppModelsProductsSearchV1SharedDataProvider>) | (null));
  /** A unit representing quantity relevant to the entity. */
  "distance"?: ((BraveSchemaUnit) | (null));
  /** A list of images relevant to the entity. */
  "images"?: ((Array<BraveSchemaAppModelsProductsSearchV1SharedThumbnail>) | (null));
  /** Any movie data relevant to the entity. Appears only when the result is a movie. */
  "movie"?: ((BraveSchemaMovieData) | (null));
  /** The infobox subtype identifier. The value is always <code>entity</code>. */
  "subtype"?: "entity";
};

export type BraveSchemaAppModelsProductsSearchV1SharedNewsResult = {
  /** The title of the web page. */
  "title": string;
  /** The URL where the page is served. */
  "url": string;
  /** Whether the result is from a local source. */
  "is_source_local"?: boolean;
  /** Whether the result is from both local and global sources. */
  "is_source_both"?: boolean;
  /** A description for the web page. */
  "description"?: ((string) | (null));
  /** The page’s date, based on its published or last modified date. */
  "page_age"?: ((string) | (null));
  /** A date representing when the web page was last fetched. */
  "page_fetched"?: ((string) | (null));
  /** The timestamp when the content was fetched. */
  "fetched_content_timestamp"?: ((number) | (null));
  /** A profile associated with the web page. */
  "profile"?: ((BraveSchemaAppModelsProductsSearchV1SharedProfile) | (null));
  /** A language classification for the web page. */
  "language"?: ((string) | (null));
  /** Whether the web page is family friendly. */
  "family_friendly"?: boolean;
  /** The aggregated information on the URL representing a news result. */
  "meta_url"?: (({ [key: string]: unknown }) | (null));
  /** The source of the news. */
  "source"?: ((string) | (null));
  /** Whether the news result is currently a breaking news. */
  "breaking"?: boolean;
  /** Whether the news result is currently live. */
  "is_live"?: boolean;
  /** The thumbnail associated with the news result. */
  "thumbnail"?: ((BraveSchemaAppModelsProductsSearchV1SharedThumbnail) | (null));
  /** A human-readable representation of the news article’s age. For example, <code>2 days ago</code>. */
  "age"?: ((string) | (null));
  /** A list of extra alternate snippets for the news search result. */
  "extra_snippets"?: ((Array<string>) | (null));
  /** Icons associated with the news result. */
  "icons"?: ((Array<BraveSchemaPostprocessedIcon>) | (null));
};

export type BraveSchemaSearchResult = {
  /** The title of the web page. */
  "title": string;
  /** The URL where the page is served. */
  "url": string;
  /** Whether the result is from a local source. */
  "is_source_local"?: boolean;
  /** Whether the result is from both local and global sources. */
  "is_source_both"?: boolean;
  /** A description for the web page. */
  "description"?: ((string) | (null));
  /** The page’s date, based on its published or last modified date. */
  "page_age"?: ((string) | (null));
  /** A date representing when the web page was last fetched. */
  "page_fetched"?: ((string) | (null));
  /** The timestamp when the content was fetched. */
  "fetched_content_timestamp"?: ((number) | (null));
  /** A profile associated with the web page. */
  "profile"?: ((BraveSchemaAppModelsProductsSearchV1SharedProfile) | (null));
  /** The main language on the web search result. */
  "language"?: string;
  /** Whether the web page is family friendly. */
  "family_friendly"?: boolean;
  /** A type identifying a web search result. The value is always <code>search_result</code>. */
  "type"?: "search_result";
  /** A sub type identifying the web search result type. */
  "subtype"?: string;
  /** Whether the web search result is currently live. Default value is <code>false</code>. */
  "is_live"?: boolean;
  /** Gathered information on a web search result. */
  "deep_results"?: ((BraveSchemaDeepResult) | (null));
  /** A list of schemas (structured data) extracted from the page. The schemas try to follow <a href="http://schema.org">schema.org</a> and will return anything we can extract from the HTML that can fit into these models. */
  "schemas"?: ((Array<unknown>) | (null));
  /** Aggregated information on the URL associated with the web search result. */
  "meta_url"?: (({ [key: string]: unknown }) | (null));
  /** The thumbnail of the web search result. */
  "thumbnail"?: ((BraveSchemaAppModelsProductsSearchV1SharedThumbnail) | (null));
  /** A human-readable representation of the web search result’s age. For example, <code>2 days ago</code>. */
  "age"?: ((string) | (null));
  /** The location details if the query relates to a restaurant. */
  "location"?: ((BraveSchemaLocationResult) | (null));
  /** Deprecated. Use <code>location</code> instead. */
  "restaurant"?: ((BraveSchemaLocationResult) | (null));
  /** The video associated with the web search result. */
  "video"?: ((BraveSchemaAppModelsProductsSearchV1SharedVideoData) | (null));
  /** The movie associated with the web search result. */
  "movie"?: ((BraveSchemaMovieData) | (null));
  /** Any frequently asked questions associated with the web search result. */
  "faq"?: ((BraveSchemaAppModelsProductsSearchV1SharedFAQ) | (null));
  /** Any question answer information associated with the web search result page. */
  "qa"?: ((BraveSchemaQAPage) | (null));
  /** Any book information associated with the web search result page. */
  "book"?: ((BraveSchemaBook) | (null));
  /** Rating found for the web search result page. */
  "rating"?: ((BraveSchemaAppModelsProductsSearchV1SharedRating) | (null));
  /** An article found for the web search result page. */
  "article"?: ((BraveSchemaArticle) | (null));
  /** The main product and a review that is found on the web search result page. */
  "product"?: ((BraveSchemaAppModelsProductsSearchV1SharedProduct) | (BraveSchemaReview) | (null));
  /** A list of products and reviews that are found on the web search result page. */
  "product_cluster"?: ((Array<((BraveSchemaAppModelsProductsSearchV1SharedProduct) | (BraveSchemaReview))>) | (null));
  /** A type representing a cluster. The value can be product_cluster. */
  "cluster_type"?: ((string) | (null));
  /** A list of web search results. */
  "cluster"?: ((Array<BraveSchemaResult>) | (null));
  /** Aggregated information on the creative work found on the web search result. */
  "creative_work"?: ((BraveSchemaCreativeWork) | (null));
  /** Aggregated information on music recording found on the web search result. */
  "music_recording"?: ((BraveSchemaMusicRecording) | (null));
  /** Aggregated information on the review found on the web search result. */
  "review"?: ((BraveSchemaReview) | (null));
  /** Aggregated information on a recipe found on the web search result page. */
  "recipe"?: ((BraveSchemaRecipe) | (null));
  /** Aggregated information on a software product found on the web search result page. */
  "software"?: ((BraveSchemaSoftware) | (null));
  /** Aggregated information on a organization found on the web search result page. */
  "organization"?: ((BraveSchemaOrganization) | (null));
  /** The content type associated with the search result page. */
  "content_type"?: ((string) | (null));
  /** A list of extra alternate snippets for the web search result. */
  "extra_snippets"?: ((Array<string>) | (null));
  /** Icons associated with the search result. */
  "icons"?: ((Array<BraveSchemaPostprocessedIcon>) | (null));
};

export type BraveSchemaResponseCallback = {
  /** The vertical associated with the callback. For the full list of verticals supported see the Rich Vertical list. */
  "vertical": BraveSchemaSearchAPIVertical;
  /** The unique key for the callback. */
  "callback_key": string;
};

export type BraveSchemaAppModelsProductsSearchV1SharedProfile = {
  /** The name of the profile. */
  "name": string;
  /** The original URL where the profile is available. */
  "url": string;
  /** The long name of the profile. */
  "long_name"?: ((string) | (null));
  /** The served image URL representing the profile. */
  "img"?: ((string) | (null));
};

export type BraveSchemaAppModelsProductsSearchV1SharedThumbnail = {
  /** The served URL of the picture thumbnail. */
  "src": string;
  /** The alt text for the thumbnail image. */
  "alt"?: ((string) | (null));
  /** The height of the thumbnail. */
  "height"?: ((number) | (null));
  /** The width of the thumbnail. */
  "width"?: ((number) | (null));
  /** The background color of the thumbnail. */
  "bg_color"?: ((string) | (null));
  /** The original URL of the image. */
  "original"?: ((string) | (null));
  /** Whether the thumbnail is a logo. */
  "logo"?: ((boolean) | (null));
  /** Whether the thumbnail is a duplicate. */
  "duplicated"?: ((boolean) | (null));
  /** The theme of the thumbnail (e.g., light or dark). */
  "theme"?: ((string) | (null));
};

export type BraveSchemaPostalAddress = {
  /** The type identifying a postal address. The value is always <code>PostalAddress</code>. */
  "type"?: "PostalAddress";
  /** The country associated with the location. */
  "country"?: ((string) | (null));
  /** The postal code associated with the location. */
  "postalCode"?: ((string) | (null));
  /** The street address associated with the location. */
  "streetAddress"?: ((string) | (null));
  /** The region associated with the location. This is usually a state. */
  "addressRegion"?: ((string) | (null));
  /** The address locality or subregion associated with the location. */
  "addressLocality"?: ((string) | (null));
  /** The displayed address string. */
  "displayAddress": string;
};

export type BraveSchemaOpeningHours = {
  /** The current day opening hours. Can have two sets of opening hours. */
  "current_day"?: ((Array<BraveSchemaDayOpeningHours>) | (null));
  /** The opening hours for the whole week. */
  "days"?: ((Array<Array<BraveSchemaDayOpeningHours>>) | (null));
};

export type BraveSchemaContact = {
  /** The email address. */
  "email"?: ((string) | (null));
  /** The telephone number. */
  "telephone"?: ((string) | (null));
};

export type BraveSchemaAppModelsProductsSearchV1SharedRating = {
  /** The current value of the rating. (min 0) */
  "ratingValue": number;
  /** Best rating received. */
  "bestRating": number;
  /** The number of reviews associated with the rating. */
  "reviewCount"?: ((number) | (null));
  /** The profile associated with the rating. */
  "profile"?: ((BraveSchemaAppModelsProductsSearchV1SharedProfile) | (null));
  /** Whether the rating is coming from Tripadvisor. */
  "is_tripadvisor"?: boolean;
};

export type BraveSchemaUnit = {
  /** The quantity of the unit. */
  "value": number;
  /** The name of the unit associated with the quantity. */
  "units": string;
};

export type BraveSchemaAppModelsProductsSearchV1SharedDataProvider = {
  /** The type representing the source of data. This is usually <code>external</code>. */
  "type"?: "external";
  /** The name of the data provider. This can be a domain. */
  "name": string;
  /** The URL where the information is coming from. */
  "url": string;
  /** The long name for the data provider. */
  "long_name"?: ((string) | (null));
  /** The served URL for the image data. */
  "img"?: ((string) | (null));
};

export type BraveSchemaReviews = {
  /** A list of trip advisor reviews for the entity. */
  "results": Array<BraveSchemaTripadvisorReview>;
  /** A URL to a web page where more information on the result can be seen. */
  "viewMoreUrl": string;
  /** Any reviews available in a foreign language. */
  "reviews_in_foreign_language": boolean;
};

export type BraveSchemaPictureResults = {
  /** A URL to view more pictures. */
  "viewMoreUrl": ((string) | (null));
  /** A list of thumbnail results. */
  "results": Array<BraveSchemaAppModelsProductsSearchV1SharedThumbnail>;
};

export type BraveSchemaAction = {
  /** The type representing the action. */
  "type": string;
  /** A URL representing the action to be taken. */
  "url": string;
};

export type BraveSchemaLocationWebResult = {
  /** The title of the web page. */
  "title": string;
  /** The URL where the page is served. */
  "url": string;
  /** Whether the result is from a local source. */
  "is_source_local"?: boolean;
  /** Whether the result is from both local and global sources. */
  "is_source_both"?: boolean;
  /** A description for the web page. */
  "description"?: ((string) | (null));
  /** The page’s date, based on its published or last modified date. */
  "page_age"?: ((string) | (null));
  /** A date representing when the web page was last fetched. */
  "page_fetched"?: ((string) | (null));
  /** The timestamp when the content was fetched. */
  "fetched_content_timestamp"?: ((number) | (null));
  /** A profile associated with the web page. */
  "profile"?: ((BraveSchemaAppModelsProductsSearchV1SharedProfile) | (null));
  /** A language classification for the web page. */
  "language"?: ((string) | (null));
  /** Whether the web page is family friendly. */
  "family_friendly"?: boolean;
  /** Aggregated information about the URL. */
  "meta_url": BraveSchemaAppModelsProductsSearchV1SharedMetaUrl;
};

export type BraveSchemaSearchAPIVertical = "calculator" | "cryptocurrency" | "currency" | "definitions" | "formula1" | "packagetracker" | "sports" | "stocks" | "unitconversion" | "unixtimestamp" | "weather";

export type BraveSchemaSnakepitModelsMixerSpecsItemsDataProvider = {
  "type"?: string;
  "name": string;
  "url": string;
  "long_name"?: ((string) | (null));
  "img"?: ((string) | (null));
};

export type BraveSchemaCalculatorResult = {
  "expression": string;
  "answer"?: ((number) | (string) | (null));
};

export type BraveSchemaCryptocurrencyResult = {
  "intent_type": "lookup" | "conversion";
  "quote": BraveSchemaSnakepitModelsRichHeaderResultsCryptocurrenciesV1Quote;
  "timeseries": BraveSchemaCryptocurrencyResultTimeseries;
  "vs_currency": string;
  "vs_currencies"?: Array<BraveSchemaVsCurrency>;
  "top100_crypto"?: Array<BraveSchemaCryptocurrencyItem>;
  "amount"?: ((number) | (number) | (null));
  "currency"?: ((BraveSchemaCurrencyForex) | (null));
};

export type BraveSchemaCurrencyResult = {
  "conversion": BraveSchemaConversion;
  "timeseries": BraveSchemaTimeseries;
  "supported_currencies"?: Array<BraveSchemaCurrency>;
};

export type BraveSchemaDefinitionsResult = {
  "word": string;
  "language": string;
  "pronounciation"?: ((string) | (null));
  "definitions": Array<BraveSchemaDefinition>;
  "source_dict": string;
  "attribution_text": string;
  "attribution_url": string;
  "audio_available"?: boolean;
};

export type BraveSchemaFormula1Result = {
  "default_view"?: (("schedule" | "drivers" | "constructors") | (null));
  "calendar"?: ((BraveSchemaF1Calendar) | (null));
  "next_race"?: ((BraveSchemaF1RaceDetail) | (null));
  "previous_race"?: ((BraveSchemaF1RaceDetail) | (null));
  "live_race"?: ((BraveSchemaF1RaceDetail) | (null));
  "drivers"?: ((Array<BraveSchemaF1Standing>) | (null));
  "constructors"?: ((Array<BraveSchemaF1Standing>) | (null));
};

export type BraveSchemaTopStoriesNewsResult = {
  "is_topical": boolean;
  "topic_id": number;
  "topics"?: Array<BraveSchemaTopic>;
  "articles"?: Array<BraveSchemaTopStoryNewsArticle>;
};

export type BraveSchemaPackageTrackerResult = {
  "matched"?: Array<BraveSchemaTrackingNumber>;
};

export type BraveSchemaSportsResultAmericanFootball = {
  "sport"?: BraveSchemaSportsType;
  "type": BraveSchemaSportsDataType;
  "view": BraveSchemaSportsView;
  "content": ((BraveSchemaSportsAmericanFootballContentLeagueGames) | (BraveSchemaSportsAmericanFootballContentLeagueStandings) | (BraveSchemaSportsAmericanFootballContentTeamGames) | (BraveSchemaSportsAmericanFootballContentTeamStandings) | (BraveSchemaSportsAmericanFootballContentFixture));
};

export type BraveSchemaSportsResultFootball = {
  "sport"?: BraveSchemaSportsType;
  "type": BraveSchemaSportsDataType;
  "view": BraveSchemaSportsView;
  "content": ((BraveSchemaSportsFootballContentFixture) | (BraveSchemaSportsFootballContentLeagueGames) | (BraveSchemaSportsFootballContentTeamStandings) | (BraveSchemaSportsFootballContentLeagueStandings) | (BraveSchemaSportsFootballContentTeamGames));
};

export type BraveSchemaSportsResultBaseball = {
  "sport"?: BraveSchemaSportsType;
  "type": BraveSchemaSportsDataType;
  "view": BraveSchemaSportsView;
  "content": ((BraveSchemaSportsBaseballContentLeagueGames) | (BraveSchemaSportsBaseballContentLeagueStandings) | (BraveSchemaSportsBaseballContentTeamGames) | (BraveSchemaSportsBaseballContentTeamStandings));
};

export type BraveSchemaSportsResultBasketball = {
  "sport"?: BraveSchemaSportsType;
  "type": BraveSchemaSportsDataType;
  "view": BraveSchemaSportsView;
  "content": ((BraveSchemaSportsBasketballContentLeagueGames) | (BraveSchemaSportsBasketballContentLeagueStandings) | (BraveSchemaSportsBasketballContentTeamGames) | (BraveSchemaSportsBasketballContentTeamStandings));
};

export type BraveSchemaSportsResultIceHockey = {
  "sport"?: BraveSchemaSportsType;
  "type": BraveSchemaSportsDataType;
  "view": BraveSchemaSportsView;
  "content": ((BraveSchemaSportsIceHockeyContentLeagueGames) | (BraveSchemaSportsIceHockeyContentLeagueStandings) | (BraveSchemaSportsIceHockeyContentTeamGames) | (BraveSchemaSportsIceHockeyContentTeamStandings));
};

export type BraveSchemaSportsResultCricket = {
  "sport"?: BraveSchemaSportsType;
  "type": BraveSchemaSportsDataType;
  "view": BraveSchemaSportsView;
  "content": ((BraveSchemaSportsCricketContentLeagueGames) | (BraveSchemaSportsCricketContentLeagueStandings) | (BraveSchemaSportsCricketContentTeamGames) | (BraveSchemaSportsCricketContentTeamStandings) | (BraveSchemaSportsCricketContentFixture));
};

export type BraveSchemaStockResult = {
  "asset_info": BraveSchemaAssetInfo;
  "time_range": BraveSchemaTickerPlotTimeRange;
  "quote": BraveSchemaSnakepitModelsRichHeaderResultsStocksV1Quote;
  "timeseries": BraveSchemaStockResultTimeseries;
  "exchange_info"?: ((BraveSchemaExchangeInfo) | (null));
};

export type BraveSchemaUnitConversionResult = {
  "amount": number;
  "from_unit": string;
  "to_unit": string;
  "dimensionality": BraveSchemaUnitConversionDimensionality;
};

export type BraveSchemaUnixTimestampResult = {
  "conversion": ((BraveSchemaTsToDate) | (BraveSchemaDateToTs) | (BraveSchemaNowToTs) | (BraveSchemaNowToDate));
};

export type BraveSchemaWeatherResult = {
  "location": BraveSchemaSnakepitModelsRichHeaderResultsWeatherV1Location;
  "current_time_iso": string;
  "current_weather": BraveSchemaCurrentWeather;
  "daily": Array<BraveSchemaWeatherSummaryDay>;
  "hours3": Array<BraveSchemaWeatherSummary3Hours>;
  "alerts"?: Array<BraveSchemaWeatherAlert>;
};

export type BraveSchemaSnakepitModelsMixerGeneralLanguage = "ar" | "eu" | "bn" | "bg" | "ca" | "zh-hans" | "zh-hant" | "hr" | "cs" | "da" | "nl" | "en" | "en-gb" | "et" | "fi" | "fr" | "gl" | "de" | "el" | "gu" | "he" | "hi" | "hu" | "is" | "it" | "ja" | "jp" | "kn" | "ko" | "lv" | "lt" | "ms" | "ml" | "mr" | "nb" | "pl" | "pt-br" | "pt-pt" | "pa" | "ro" | "ru" | "sr" | "sk" | "sl" | "es" | "sv" | "ta" | "te" | "th" | "tr" | "uk" | "vi";

export type BraveSchemaAppModelsProductsSearchV1NewsMetaUrl = {
  /** The protocol scheme extracted from the URL. */
  "scheme"?: ((string) | (null));
  /** The network location part extracted from the URL. */
  "netloc"?: ((string) | (null));
  /** The lowercased domain name extracted from the URL. */
  "hostname"?: ((string) | (null));
  /** The favicon used for the URL. */
  "favicon"?: ((string) | (null));
  /** The hierarchical path of the URL useful as a display string. */
  "path"?: ((string) | (null));
};

export type BraveSchemaAppModelsProductsSearchV1NewsThumbnail = {
  /** The served URL of the thumbnail associated with the news article. */
  "src": string;
  /** The original URL of the thumbnail associated with the news article. */
  "original"?: ((string) | (null));
};

export type BraveSchemaPostprocessedIcon = {
  "href": string;
  "sizes": ((string) | (null));
  "rel": ((string) | (null));
  "type": ((string) | (null));
  "ext": ((string) | (null));
};

export type BraveSchemaAppModelsProductsSearchV1VideosVideoData = {
  /** A time string representing the duration of the video. */
  "duration"?: ((string) | (null));
  /** The number of views of the video. */
  "views"?: ((number) | (null));
  /** The creator of the video. */
  "creator"?: ((string) | (null));
  /** The publisher of the video. */
  "publisher"?: ((string) | (null));
  /** Whether the video requires a subscription. */
  "requires_subscription"?: ((boolean) | (null));
  /** A list of tags relevant to the video. */
  "tags"?: ((Array<string>) | (null));
  /** A profile associated with the video. */
  "author"?: ((BraveSchemaAppModelsProductsSearchV1VideosProfile) | (null));
};

export type BraveSchemaAppModelsProductsSearchV1VideosMetaUrl = {
  /** The protocol scheme extracted from the URL. */
  "scheme"?: ((string) | (null));
  /** The network location part extracted from the URL. */
  "netloc"?: ((string) | (null));
  /** The lowercased domain name extracted from the URL. */
  "hostname"?: ((string) | (null));
  /** The favicon used for the URL. */
  "favicon"?: ((string) | (null));
  /** The hierarchical path of the URL useful as a display string. */
  "path"?: ((string) | (null));
};

export type BraveSchemaAppModelsProductsSearchV1VideosThumbnail = {
  /** The served URL of the thumbnail associated with the video. */
  "src": string;
  /** The original URL of the thumbnail associated with the video. */
  "original"?: ((string) | (null));
};

export type BraveSchemaAppModelsProductsSearchV1ImagesThumbnail = {
  /** The served URL of the image. */
  "src"?: ((string) | (null));
  /** The width of the image. */
  "width"?: ((number) | (null));
  /** The height of the image. */
  "height"?: ((number) | (null));
};

export type BraveSchemaProperties = {
  /** The image URL. */
  "url"?: ((string) | (null));
  /** The lower resolution placeholder image URL. */
  "placeholder"?: ((string) | (null));
  /** The width of the image. */
  "width"?: ((number) | (null));
  /** The height of the image. */
  "height"?: ((number) | (null));
};

export type BraveSchemaAppModelsProductsSearchV1ImagesMetaUrl = {
  /** The protocol scheme extracted from the URL. */
  "scheme"?: ((string) | (null));
  /** The network location part extracted from the URL. */
  "netloc"?: ((string) | (null));
  /** The lowercased domain name extracted from the URL. */
  "hostname"?: ((string) | (null));
  /** The favicon used for the URL. */
  "favicon"?: ((string) | (null));
  /** The hierarchical path of the URL useful as a display string. */
  "path"?: ((string) | (null));
};

export type BraveSchemaSuggestType = "query" | "entity" | "calculator";

export type BraveSchemaApproximateUserLocation = {
  "city"?: ((string) | (null));
  "country"?: ((string) | (null));
  "region"?: ((string) | (null));
  "timezone"?: ((string) | (null));
};

export type BraveSchemaDeepResult = {
  /** A list of news results associated with the result. */
  "news"?: ((Array<BraveSchemaAppModelsProductsSearchV1SharedNewsResult>) | (null));
  /** A list of buttoned results associated with the result. */
  "buttons"?: ((Array<BraveSchemaButtonResult>) | (null));
  /** Videos associated with the result. */
  "videos"?: ((Array<BraveSchemaAppModelsProductsSearchV1SharedVideoResult>) | (null));
  /** Images associated with the result. */
  "images"?: ((Array<BraveSchemaImage>) | (null));
};

export type BraveSchemaAppModelsProductsSearchV1SharedVideoData = {
  /** A time string representing the duration of the video. The format can be HH:MM:SS or MM:SS. */
  "duration"?: ((string) | (null));
  /** The number of views of the video. */
  "views"?: ((string) | (null));
  /** The creator of the video. */
  "creator"?: ((string) | (null));
  /** The publisher of the video. */
  "publisher"?: ((string) | (null));
  /** A thumbnail associated with the video. */
  "thumbnail"?: ((BraveSchemaAppModelsProductsSearchV1SharedThumbnail) | (null));
  /** A list of tags associated with the video. */
  "tags"?: ((Array<string>) | (null));
  /** Author of the video. */
  "author"?: ((BraveSchemaAppModelsProductsSearchV1SharedProfile) | (null));
  /** Whether the video requires a subscription to watch. */
  "requires_subscription"?: ((boolean) | (null));
};

export type BraveSchemaMovieData = {
  /** Name of the movie. */
  "name"?: ((string) | (null));
  /** A short plot summary for the movie. */
  "description"?: ((string) | (null));
  /** A URL serving a movie profile page. */
  "url"?: ((string) | (null));
  /** A thumbnail for a movie poster. */
  "thumbnail"?: ((BraveSchemaAppModelsProductsSearchV1SharedThumbnail) | (null));
  /** The release date for the movie. */
  "release"?: ((string) | (null));
  /** A list of people responsible for directing the movie. */
  "directors"?: ((Array<BraveSchemaPerson>) | (null));
  /** A list of actors in the movie. */
  "actors"?: ((Array<BraveSchemaPerson>) | (null));
  /** Rating provided to the movie from various sources. */
  "rating"?: ((BraveSchemaAppModelsProductsSearchV1SharedRating) | (null));
  /** The runtime of the movie. The format is HH:MM:SS. */
  "duration"?: ((string) | (null));
  /** List of genres in which the movie can be classified. */
  "genre"?: ((Array<string>) | (null));
  /** The query that resulted in the movie result. */
  "query"?: ((string) | (null));
};

export type BraveSchemaAppModelsProductsSearchV1SharedFAQ = {
  /** A list of question/answer pairs. */
  "items": Array<BraveSchemaQA>;
};

export type BraveSchemaQAPage = {
  /** The question that is being asked. */
  "question": string;
  /** An answer to the question. */
  "answer": BraveSchemaAnswer;
};

export type BraveSchemaBook = {
  /** The title of the book. */
  "title": string;
  /** The author of the book. */
  "author": Array<BraveSchemaPerson>;
  /** The publishing date of the book. */
  "date"?: ((string) | (null));
  /** The price of the book. */
  "price"?: ((BraveSchemaPrice) | (null));
  /** The number of pages in the book. */
  "pages"?: ((number) | (null));
  /** The publisher of the book. */
  "publisher"?: ((BraveSchemaPerson) | (null));
  /** A gathered rating from different sources associated with the book. */
  "rating"?: ((BraveSchemaAppModelsProductsSearchV1SharedRating) | (null));
};

export type BraveSchemaArticle = {
  /** The author of the article. */
  "author"?: ((Array<BraveSchemaPerson>) | (null));
  /** The date when the article was published. */
  "date"?: ((string) | (null));
  /** The name of the publisher for the article. */
  "publisher"?: ((BraveSchemaOrganization) | (null));
  /** A thumbnail associated with the article. */
  "thumbnail"?: ((BraveSchemaAppModelsProductsSearchV1SharedThumbnail) | (null));
  /** Whether the article is free to read or is behind a paywall. */
  "isAccessibleForFree"?: ((boolean) | (null));
};

export type BraveSchemaAppModelsProductsSearchV1SharedProduct = {
  /** A string representing a product type. The value is always <code>Product</code>. */
  "type"?: "Product";
  /** The name of the product. (minLength 1) */
  "name": string;
  /** The URL of the product page. */
  "url"?: ((string) | (null));
  /** The category of the product. */
  "category"?: ((string) | (null));
  /** The price of the product. */
  "price": string;
  /** A thumbnail associated with the product. */
  "thumbnail": BraveSchemaAppModelsProductsSearchV1SharedThumbnail;
  /** The description of the product. */
  "description"?: ((string) | (null));
  /** A list of offers available on the product. */
  "offers"?: Array<BraveSchemaAppModelsProductsSearchV1SharedOffer>;
  /** A rating associated with the product. */
  "rating"?: ((BraveSchemaAppModelsProductsSearchV1SharedRating) | (null));
  /** A Global Trade Item Number (GTIN) for the product. */
  "gtin"?: ((string) | (null));
  /** The GTIN-8 (EAN/UCC-8) code of the product. */
  "gtin8"?: ((string) | (null));
  /** The GTIN-12 (UPC) code of the product. */
  "gtin12"?: ((string) | (null));
  /** The GTIN-13 (EAN/ISBN-13) code of the product. */
  "gtin13"?: ((string) | (null));
  /** The GTIN-14 code of the product. */
  "gtin14"?: ((string) | (null));
};

export type BraveSchemaReview = {
  /** A string representing review type. This is always <code>Review</code>. */
  "type"?: "Review";
  /** The review title for the review. */
  "name": string;
  /** The thumbnail associated with the reviewer. */
  "thumbnail": BraveSchemaAppModelsProductsSearchV1SharedThumbnail;
  /** A description of the review (the text of the review itself). */
  "description": string;
  /** The ratings associated with the review. */
  "rating": BraveSchemaAppModelsProductsSearchV1SharedRating;
};

export type BraveSchemaResult = {
  /** The title of the web page. */
  "title": string;
  /** The URL where the page is served. */
  "url": string;
  /** Whether the result is from a local source. */
  "is_source_local"?: boolean;
  /** Whether the result is from both local and global sources. */
  "is_source_both"?: boolean;
  /** A description for the web page. */
  "description"?: ((string) | (null));
  /** The page’s date, based on its published or last modified date. */
  "page_age"?: ((string) | (null));
  /** A date representing when the web page was last fetched. */
  "page_fetched"?: ((string) | (null));
  /** The timestamp when the content was fetched. */
  "fetched_content_timestamp"?: ((number) | (null));
  /** A profile associated with the web page. */
  "profile"?: ((BraveSchemaAppModelsProductsSearchV1SharedProfile) | (null));
  /** A language classification for the web page. */
  "language"?: ((string) | (null));
  /** Whether the web page is family friendly. */
  "family_friendly"?: boolean;
};

export type BraveSchemaCreativeWork = {
  /** The name of the creative work. (minLength 1) */
  "name": string;
  /** A rating that is given to the creative work. */
  "rating"?: ((BraveSchemaAppModelsProductsSearchV1SharedRating) | (null));
  /** A thumbnail associated with the creative work. */
  "thumbnail": BraveSchemaAppModelsProductsSearchV1SharedThumbnail;
};

export type BraveSchemaMusicRecording = {
  /** The name of the song or album. (minLength 1) */
  "name": string;
  /** The rating of the music. */
  "rating"?: ((BraveSchemaAppModelsProductsSearchV1SharedRating) | (null));
  /** A thumbnail associated with the music. */
  "thumbnail"?: ((BraveSchemaAppModelsProductsSearchV1SharedThumbnail) | (null));
};

export type BraveSchemaRecipe = {
  /** The title of the recipe. */
  "title": string;
  /** The description of the recipe. */
  "description": string;
  /** A thumbnail associated with the recipe. */
  "thumbnail": BraveSchemaAppModelsProductsSearchV1SharedThumbnail;
  /** The URL of the web page where the recipe was found. */
  "url": string;
  /** The domain of the web page where the recipe was found. */
  "domain": string;
  /** The URL for the favicon of the web page where the recipe was found. */
  "favicon": string;
  /** The total time required to cook the recipe. */
  "time"?: ((string) | (null));
  /** The preparation time for the recipe. */
  "prep_time"?: ((string) | (null));
  /** The cooking time for the recipe. */
  "cook_time"?: ((string) | (null));
  /** Ingredients required for the recipe. */
  "ingredients"?: ((string) | (null));
  /** List of instructions for the recipe. */
  "instructions"?: ((Array<BraveSchemaHowTo>) | (null));
  /** How many people the recipe serves. */
  "servings"?: ((number) | (null));
  /** Calorie count for the recipe. */
  "calories"?: ((number) | (null));
  /** The publisher of the recipe. */
  "publisher"?: ((string) | (null));
  /** Aggregated information on the ratings associated with the recipe. */
  "rating"?: ((BraveSchemaAppModelsProductsSearchV1SharedRating) | (null));
  /** The category of the recipe. */
  "recipeCategory"?: ((string) | (null));
  /** The cuisine classification for the recipe. */
  "recipeCuisine"?: ((string) | (null));
  /** Aggregated information on the cooking video associated with the recipe. */
  "video"?: ((BraveSchemaAppModelsProductsSearchV1SharedVideoData) | (null));
};

export type BraveSchemaSoftware = {
  /** The name of the software product. */
  "name"?: ((string) | (null));
  /** The author of software product. */
  "author"?: ((string) | (null));
  /** The latest version of the software product. */
  "version"?: ((string) | (null));
  /** The code repository where the software product is currently available or maintained. */
  "codeRepository"?: ((string) | (null));
  /** The home page of the software product. */
  "homepage"?: ((string) | (null));
  /** The date when the software product was published. */
  "datePublished"?: ((string) | (null));
  /** Whether the software product is available on npm. */
  "is_npm"?: ((boolean) | (null));
  /** Whether the software product is available on pypi. */
  "is_pypi"?: ((boolean) | (null));
  /** The number of stars on the repository. */
  "stars"?: ((number) | (null));
  /** The numbers of forks of the repository. */
  "forks"?: ((number) | (null));
  /** The programming language spread on the software product. */
  "programmingLanguage"?: ((string) | (null));
};

export type BraveSchemaOrganization = {
  /** A type string identifying an organization. The value is always <code>organization</code>. */
  "type"?: string;
  /** The name of the thing. */
  "name": string;
  /** A URL for the thing. */
  "url"?: ((string) | (null));
  /** Thumbnail associated with the thing. */
  "thumbnail"?: ((BraveSchemaAppModelsProductsSearchV1SharedThumbnail) | (null));
  /** A list of contact points for the organization. */
  "contact_points"?: ((Array<BraveSchemaContactPoint>) | (null));
};

export type BraveSchemaForumData = {
  /** The name of the forum. */
  "forum_name": string;
  /** The number of answers to the post. */
  "num_answers"?: ((number) | (null));
  /** The score of the post on the forum. */
  "score"?: ((string) | (null));
  /** The title of the post on the forum. */
  "title"?: ((string) | (null));
  /** The question asked in the forum post. */
  "question"?: ((string) | (null));
  /** The top-rated comment under the forum post. */
  "top_comment"?: ((string) | (null));
};

export type BraveSchemaAppModelsProductsSearchV1SharedMetaUrl = {
  /** The protocol scheme extracted from the URL. */
  "scheme": string;
  /** The network location part extracted from the URL. */
  "netloc": string;
  /** The lowercased domain name extracted from the URL. */
  "hostname"?: ((string) | (null));
  /** The favicon used for the URL. */
  "favicon": string;
  /** The hierarchical path of the URL useful as a display string. */
  "path": string;
};

export type BraveSchemaDayOpeningHours = {
  /** A short string representing the day of the week. */
  "abbr_name": string;
  /** A full string representing the day of the week. */
  "full_name": string;
  /** A 24 hr clock time string for the opening time of the business on a particular day. */
  "opens": string;
  /** A 24 hr clock time string for the closing time of the business on a particular day. */
  "closes": string;
};

export type BraveSchemaTripadvisorReview = {
  /** The title of the review. */
  "title": string;
  /** A description seen in the review. */
  "description": string;
  /** The date when the review was published. */
  "date": string;
  /** A rating given by the reviewer. */
  "rating": BraveSchemaAppModelsProductsSearchV1SharedRating;
  /** The author of the review. */
  "author": BraveSchemaPerson;
  /** A URL link to the page where the review can be found. */
  "review_url": string;
  /** The language of the review. */
  "language": string;
};

export type BraveSchemaSnakepitModelsRichHeaderResultsCryptocurrenciesV1Quote = {
  "id": string;
  "symbol": string;
  "name": string;
  "image": string;
  "current_price": ((number) | (null));
  "market_cap": ((number) | (null));
  "market_cap_rank": ((number) | (null));
  "fully_diluted_valuation"?: ((number) | (null));
  "total_volume": number;
  "high_24h": ((number) | (null));
  "low_24h": ((number) | (null));
  "price_change_24h": ((number) | (null));
  "price_change_percentage_24h": ((number) | (null));
  "market_cap_change_24h": ((number) | (null));
  "market_cap_change_percentage_24h": ((number) | (null));
  "circulating_supply"?: ((number) | (null));
  "total_supply"?: ((number) | (null));
  "max_supply"?: ((number) | (null));
  "ath": number;
  "ath_change_percentage": number;
  "ath_date": string;
  "atl": number;
  "atl_change_percentage": number;
  "atl_date": string;
  "last_updated": string;
};

export type BraveSchemaCryptocurrencyResultTimeseries = {
  "time_range": BraveSchemaTickerPlotTimeRange;
  "ts_price": Array<Array<unknown>>;
  "ts_market_cap": Array<Array<unknown>>;
  "ts_volume": Array<Array<unknown>>;
};

export type BraveSchemaVsCurrency = {
  "label": string;
  "value": string;
};

export type BraveSchemaCryptocurrencyItem = {
  "label": string;
  "value": string;
  "symbol": string;
};

export type BraveSchemaCurrencyForex = {
  "full_name": string;
  "code": string;
  "decimals": number;
};

export type BraveSchemaConversion = {
  "query": BraveSchemaSnakepitModelsRichHeaderResultsCurrenciesV1Query;
  "info": BraveSchemaInfo;
  "date": string;
  "result": number;
  "amount": number;
};

export type BraveSchemaTimeseries = {
  "time_range": BraveSchemaTickerPlotTimeRange;
  "ts_exchange_rate"?: Array<Array<unknown>>;
};

export type BraveSchemaCurrency = {
  "full_name": string;
  "code": string;
  "decimals": number;
};

export type BraveSchemaDefinition = {
  "part_of_speech": string;
  "definitions": Array<((BraveSchemaDefinitionText) | (string))>;
};

export type BraveSchemaF1Calendar = {
  "races"?: Array<BraveSchemaF1RaceRef>;
  "next_race"?: ((BraveSchemaF1Race) | (null));
  "previous_race"?: ((BraveSchemaF1Race) | (null));
};

export type BraveSchemaF1RaceDetail = {
  "event": BraveSchemaF1Race;
  "standings"?: ((Array<BraveSchemaF1Standing>) | (null));
  "qualifying"?: ((Array<BraveSchemaF1Standing>) | (null));
  "sprint_shootout"?: ((Array<BraveSchemaF1Standing>) | (null));
  "sprint_event"?: ((BraveSchemaF1Race) | (null));
  "sprint_standings"?: ((Array<BraveSchemaF1Standing>) | (null));
  "weekend_events"?: ((Array<BraveSchemaF1WeekendEvent>) | (null));
};

export type BraveSchemaF1Standing = {
  "position": number;
  "driver"?: ((BraveSchemaF1Driver) | (null));
  "team"?: ((BraveSchemaF1Team) | (null));
  "points"?: ((number) | (null));
  "wins"?: ((number) | (null));
  "behind"?: ((number) | (null));
  "season"?: ((number) | (null));
  "time"?: ((string) | (null));
  "laps"?: ((number) | (null));
  "grid"?: ((string) | (null));
  "gap"?: ((string) | (null));
};

export type BraveSchemaTopic = {
  "index": number;
  "title": string;
  "score": number;
  "query": string;
};

export type BraveSchemaTopStoryNewsArticle = {
  "title": string;
  "img"?: ((string) | (null));
  "img_small"?: ((string) | (null));
  "url": string;
  "meta_url": BraveSchemaSnakepitModelsMixerSpecsAtomicMetaUrl;
  "publisher_name": string;
  "publish_time": number;
  "page_age"?: ((string) | (null));
  "is_live"?: boolean;
  "description"?: ((string) | (null));
  "extra_snippets"?: Array<string>;
  "bo_debug"?: { [key: string]: unknown };
};

export type BraveSchemaTrackingNumber = {
  "tracking_number": string;
  "tracking_url": string;
  "description"?: ((string) | (null));
  "courier": BraveSchemaCourier;
};

export type BraveSchemaSportsType = "basketball" | "baseball" | "football" | "american_football" | "formula_1" | "ice_hockey" | "rugby" | "tennis" | "golf" | "cricket";

export type BraveSchemaSportsDataType = "league" | "team" | "fixture";

export type BraveSchemaSportsView = "games" | "standings" | "fixture" | "bracket";

export type BraveSchemaSportsAmericanFootballContentLeagueGames = {
  "type"?: "league_games";
  "league": BraveSchemaSportsLeague;
  "game_times": Array<number>;
  "game_time"?: ((number) | (null));
  "date": string;
  "date_kind": BraveSchemaSportsDateKind;
  "games": Array<BraveSchemaSportsFixtureAmericanFootball>;
};

export type BraveSchemaSportsAmericanFootballContentLeagueStandings = {
  "type"?: "league_standings";
  "league": BraveSchemaSportsLeague;
  "group_standings": Array<BraveSchemaSportsAmericanFootballStandingsGroup>;
  "default_group": number;
};

export type BraveSchemaSportsAmericanFootballContentTeamGames = {
  "type"?: "team_games";
  "league": BraveSchemaSportsLeague;
  "team": BraveSchemaSportsTeam;
  "games": Array<BraveSchemaSportsFixtureAmericanFootball>;
  "competitions": Array<BraveSchemaSportsCompetition>;
};

export type BraveSchemaSportsAmericanFootballContentTeamStandings = {
  "type"?: "team_standings";
  "league": BraveSchemaSportsLeague;
  "team": BraveSchemaSportsTeam;
  "group_standings": Array<BraveSchemaSportsAmericanFootballStandingsGroup>;
  "default_group": number;
};

export type BraveSchemaSportsAmericanFootballContentFixture = {
  "type"?: "fixture";
  "league": BraveSchemaSportsLeague;
  "id": ((string) | (number));
  "start_time": number;
  "teams": BraveSchemaSportsFixtureTeams;
  "status": BraveSchemaSportsAmericanFootballFixtureStatus;
  "score"?: ((BraveSchemaSportsFixtureScore) | (null));
  "score_table": BraveSchemaSportsAmericanFootballScoreTable;
  "statistics": { [key: string]: unknown };
  "phase": string;
  "event_title"?: ((string) | (null));
  "week": number;
  "bulletins"?: ((Array<BraveSchemaSportsAmericanFootballFixtureBulletin>) | (null));
};

export type BraveSchemaSportsFootballContentFixture = {
  "type"?: "fixture";
  "league": BraveSchemaSportsLeague;
  "id": ((string) | (number));
  "start_time": number;
  "teams": BraveSchemaSportsFixtureTeams;
  "status": BraveSchemaSportsFootballFixtureStatus;
  "score"?: ((BraveSchemaSportsFixtureScore) | (null));
  "ps_score"?: ((BraveSchemaSportsFixtureScore) | (null));
  "statistics"?: ((Array<BraveSchemaSportsStatistic>) | (null));
  "events"?: ((Array<BraveSchemaSportsFootballFixtureEvent>) | (null));
  "lineups"?: ((BraveSchemaSportsFootballLineups) | (null));
  "aggregate_score"?: ((BraveSchemaSportsFixtureAggregateScore) | (null));
};

export type BraveSchemaSportsFootballContentLeagueGames = {
  "type"?: "league_games";
  "league": BraveSchemaSportsLeague;
  "game_times": Array<number>;
  "game_time"?: ((number) | (null));
  "date": string;
  "date_kind": BraveSchemaSportsDateKind;
  "games": Array<BraveSchemaSportsFixtureFootball>;
  "group_standings"?: ((Array<BraveSchemaSportsFootballStandingsGroup>) | (null));
  "structure"?: (({ [key: string]: unknown }) | (null));
};

export type BraveSchemaSportsFootballContentTeamStandings = {
  "type"?: "team_standings";
  "league": BraveSchemaSportsLeague;
  "team": BraveSchemaSportsTeam;
  "group_standings": Array<BraveSchemaSportsFootballStandingsGroup>;
};

export type BraveSchemaSportsFootballContentLeagueStandings = {
  "type"?: "league_standings";
  "league": BraveSchemaSportsLeague;
  "group_standings": Array<BraveSchemaSportsFootballStandingsGroup>;
};

export type BraveSchemaSportsFootballContentTeamGames = {
  "type"?: "team_games";
  "league": BraveSchemaSportsLeague;
  "team": BraveSchemaSportsTeam;
  "games": Array<BraveSchemaSportsFixtureFootball>;
  "competitions": Array<BraveSchemaSportsCompetition>;
  "group_standings"?: ((Array<BraveSchemaSportsFootballStandingsGroup>) | (null));
};

export type BraveSchemaSportsBaseballContentLeagueGames = {
  "type"?: "league_games";
  "league": BraveSchemaSportsLeague;
  "game_times": Array<number>;
  "game_time"?: ((number) | (null));
  "date": string;
  "date_kind": BraveSchemaSportsDateKind;
  "games": Array<BraveSchemaSportsFixtureBaseball>;
};

export type BraveSchemaSportsBaseballContentLeagueStandings = {
  "type"?: "league_standings";
  "league": BraveSchemaSportsLeague;
  "group_standings": Array<BraveSchemaSportsBaseballStandingsGroup>;
};

export type BraveSchemaSportsBaseballContentTeamGames = {
  "type"?: "team_games";
  "league": BraveSchemaSportsLeague;
  "team": BraveSchemaSportsTeam;
  "games": Array<BraveSchemaSportsFixtureBaseball>;
};

export type BraveSchemaSportsBaseballContentTeamStandings = {
  "type"?: "team_standings";
  "league": BraveSchemaSportsLeague;
  "team": BraveSchemaSportsTeam;
  "group_standings": Array<BraveSchemaSportsBaseballStandingsGroup>;
};

export type BraveSchemaSportsBasketballContentLeagueGames = {
  "type"?: "league_games";
  "league": BraveSchemaSportsLeague;
  "game_times": Array<number>;
  "game_time"?: ((number) | (null));
  "date": string;
  "date_kind": BraveSchemaSportsDateKind;
  "games": Array<BraveSchemaSportsFixtureBasketball>;
};

export type BraveSchemaSportsBasketballContentLeagueStandings = {
  "type"?: "league_standings";
  "league": BraveSchemaSportsLeague;
  "group_standings": Array<BraveSchemaSportsBasketballStandingsGroup>;
};

export type BraveSchemaSportsBasketballContentTeamGames = {
  "type"?: "team_games";
  "league": BraveSchemaSportsLeague;
  "team": BraveSchemaSportsTeam;
  "games": Array<BraveSchemaSportsFixtureBasketball>;
};

export type BraveSchemaSportsBasketballContentTeamStandings = {
  "type"?: "team_standings";
  "league": BraveSchemaSportsLeague;
  "team": BraveSchemaSportsTeam;
  "group_standings": Array<BraveSchemaSportsBasketballStandingsGroup>;
};

export type BraveSchemaSportsIceHockeyContentLeagueGames = {
  "type"?: "league_games";
  "league": BraveSchemaSportsLeague;
  "game_times": Array<number>;
  "game_time"?: ((number) | (null));
  "date": string;
  "date_kind": BraveSchemaSportsDateKind;
  "games": Array<BraveSchemaSportsFixtureIceHockey>;
};

export type BraveSchemaSportsIceHockeyContentLeagueStandings = {
  "type"?: "league_standings";
  "league": BraveSchemaSportsLeague;
  "group_standings": Array<BraveSchemaSportsIceHockeyStandingsGroup>;
};

export type BraveSchemaSportsIceHockeyContentTeamGames = {
  "type"?: "team_games";
  "league": BraveSchemaSportsLeague;
  "team": BraveSchemaSportsTeam;
  "games": Array<BraveSchemaSportsFixtureIceHockey>;
};

export type BraveSchemaSportsIceHockeyContentTeamStandings = {
  "type"?: "team_standings";
  "league": BraveSchemaSportsLeague;
  "team": BraveSchemaSportsTeam;
  "group_standings": Array<BraveSchemaSportsIceHockeyStandingsGroup>;
};

export type BraveSchemaSportsCricketContentLeagueGames = {
  "type"?: "league_games";
  "league": BraveSchemaSportsLeague;
  "game_times": Array<number>;
  "game_time"?: ((number) | (null));
  "date": string;
  "date_kind": BraveSchemaSportsDateKind;
  "games": Array<BraveSchemaSportsFixtureCricket>;
};

export type BraveSchemaSportsCricketContentLeagueStandings = {
  "type"?: "league_standings";
  "league": BraveSchemaSportsLeague;
  "group_standings": Array<BraveSchemaSportsCricketStandingsGroup>;
};

export type BraveSchemaSportsCricketContentTeamGames = {
  "type"?: "team_games";
  "league": BraveSchemaSportsLeague;
  "team": BraveSchemaSportsTeam;
  "games": Array<BraveSchemaSportsFixtureCricket>;
};

export type BraveSchemaSportsCricketContentTeamStandings = {
  "type"?: "team_standings";
  "league": BraveSchemaSportsLeague;
  "team": BraveSchemaSportsTeam;
  "group_standings": Array<BraveSchemaSportsCricketStandingsGroup>;
};

export type BraveSchemaSportsCricketContentFixture = {
  "type"?: "fixture";
  "league": BraveSchemaSportsLeague;
  "id": ((string) | (number));
  "start_time": number;
  "teams": BraveSchemaSportsFixtureTeams;
  "status": BraveSchemaSportsCricketFixtureStatus;
  "score"?: ((BraveSchemaSportsCricketFixtureScore) | (null));
  "upcoming": boolean;
  "venue_name"?: ((string) | (null));
  "details": BraveSchemaSportsCricketContentFixtureDetails;
  "lineups": Array<BraveSchemaSportsCricketContentFixtureLineup>;
};

export type BraveSchemaAssetInfo = {
  "symbol": string;
  "name": string;
  "category": BraveSchemaFinancialInstrumentCategory;
  "currency": string;
  "country"?: ((string) | (null));
  "country_code"?: ((string) | (null));
  "exchange": string;
  "type"?: ((string) | (null));
  "mic_code"?: ((string) | (null));
  "score"?: number;
};

export type BraveSchemaTickerPlotTimeRange = "1d" | "5d" | "7d" | "1m" | "3m" | "6m" | "ytd" | "1y" | "2y" | "5y" | "max";

export type BraveSchemaSnakepitModelsRichHeaderResultsStocksV1Quote = {
  "symbol": string;
  "company_name": string;
  "primary_exchange": string;
  "market_cap": number;
  "pe_ratio"?: ((number) | (null));
  "week_52_high"?: ((number) | (null));
  "week_52_low"?: ((number) | (null));
  "latest_price": number;
  "open"?: ((number) | (null));
  "close": number;
  "high"?: ((number) | (null));
  "low"?: ((number) | (null));
  "change"?: ((number) | (null));
  "change_percent"?: ((number) | (null));
  "volume"?: ((number) | (null));
  "latest_update": number;
  "currency": string;
};

export type BraveSchemaStockResultTimeseries = {
  "time_range": BraveSchemaTickerPlotTimeRange;
  "timeseries": Array<BraveSchemaStockObservation>;
};

export type BraveSchemaExchangeInfo = {
  "timezone"?: ((string) | (null));
  "open_time"?: ((string) | (null));
  "close_time"?: ((string) | (null));
};

export type BraveSchemaUnitConversionDimensionality = "angle" | "area" | "data_transfer" | "digital" | "duration" | "energy" | "force" | "frequency" | "length" | "mass" | "power" | "pressure" | "speed" | "temperature" | "volume";

export type BraveSchemaTsToDate = {
  "intent_type"?: "ts_to_date";
  "input_ts": number;
};

export type BraveSchemaDateToTs = {
  "intent_type"?: "date_to_ts";
  "input_date": string;
};

export type BraveSchemaNowToTs = {
  "intent_type"?: "now_to_ts";
};

export type BraveSchemaNowToDate = {
  "intent_type"?: "now_to_date";
};

export type BraveSchemaSnakepitModelsRichHeaderResultsWeatherV1Location = {
  "id": number;
  "name": string;
  "country": string;
  "state"?: ((string) | (null));
  "coords": BraveSchemaCoordinates;
  "population": number;
  "sunrise": number;
  "sunset": number;
  "tzoffset": number;
  "implicit_location"?: boolean;
};

export type BraveSchemaCurrentWeather = {
  "ts": number;
  "sunrise"?: ((number) | (null));
  "sunset"?: ((number) | (null));
  "temp": number;
  "feels_like": number;
  "pressure": number;
  "humidity": number;
  "dew_point": number;
  "uvi": number;
  "clouds": number;
  "visibility": ((number) | (null));
  "wind": BraveSchemaWindSnapshot;
  "weather": BraveSchemaWeatherSnapshot;
  "rain"?: ((number) | (null));
  "snow"?: ((number) | (null));
};

export type BraveSchemaWeatherSummaryDay = {
  "ts": number;
  "date_i18n"?: ((string) | (null));
  "sunrise"?: ((number) | (null));
  "sunset"?: ((number) | (null));
  "moonrise": number;
  "moonset": number;
  "temperature": BraveSchemaTemperatureDailySummary;
  "feels_like": BraveSchemaTemperatureDailyFeelsLikeSummary;
  "pressure": number;
  "humidity": number;
  "dew_point": number;
  "wind": BraveSchemaWindSnapshot;
  "clouds": number;
  "pop": number;
  "rain"?: ((number) | (null));
  "uvi": number;
  "weather": BraveSchemaWeatherSnapshot;
};

export type BraveSchemaWeatherSummary3Hours = {
  "ts": number;
  "temperature": BraveSchemaTemperatureSummary3Hours;
  /** Atmospheric pressure, hPa */
  "pressure": number;
  /** Weather conditions information */
  "weather": BraveSchemaWeatherSnapshot;
  /** Wind information */
  "wind": BraveSchemaWindSnapshot;
  /** Humidity, % */
  "humidity": number;
  /** Cloudiness, % */
  "clouds": number;
  /** Probability of precipitation */
  "pop": number;
  /** Average visibility, metres. The maximum value of the visibility is 10 km */
  "visibility"?: ((number) | (null));
  /** Rain volume in millimeters. */
  "rain"?: ((number) | (null));
  /** Snow volume in millimeters. */
  "snow"?: ((number) | (null));
};

export type BraveSchemaWeatherAlert = {
  "sender": string;
  "event": string;
  "ts_start": number;
  "ts_end": number;
  "start_relative_i18n"?: ((string) | (null));
  "description": string;
  "tags": Array<string>;
};

export type BraveSchemaAppModelsProductsSearchV1VideosProfile = {
  /** The name of the profile. */
  "name": string;
  /** The original URL where the profile is available. */
  "url": string;
  /** The long name of the profile. */
  "long_name"?: ((string) | (null));
  /** The served image URL representing the profile. */
  "img"?: ((string) | (null));
};

export type BraveSchemaButtonResult = {
  /** A type identifying button result. The value is always <code>button_result</code>. */
  "type"?: "button_result";
  /** The title of the result. */
  "title": string;
  /** The URL for the button result. */
  "url": string;
};

export type BraveSchemaAppModelsProductsSearchV1SharedVideoResult = {
  /** The title of the web page. */
  "title": string;
  /** The URL where the page is served. */
  "url": string;
  /** Whether the result is from a local source. */
  "is_source_local"?: boolean;
  /** Whether the result is from both local and global sources. */
  "is_source_both"?: boolean;
  /** A description for the web page. */
  "description"?: ((string) | (null));
  /** The page’s date, based on its published or last modified date. */
  "page_age"?: ((string) | (null));
  /** A date representing when the web page was last fetched. */
  "page_fetched"?: ((string) | (null));
  /** The timestamp when the content was fetched. */
  "fetched_content_timestamp"?: ((number) | (null));
  /** A profile associated with the web page. */
  "profile"?: ((BraveSchemaAppModelsProductsSearchV1SharedProfile) | (null));
  /** A language classification for the web page. */
  "language"?: ((string) | (null));
  /** Whether the web page is family friendly. */
  "family_friendly"?: boolean;
  /** The type identifying the video result. The value is always <code>video_result</code>. */
  "type"?: "video_result";
  /** Meta data for the video. */
  "video": BraveSchemaAppModelsProductsSearchV1SharedVideoData;
  /** Aggregated information on the URL. */
  "meta_url"?: ((BraveSchemaAppModelsProductsSearchV1SharedMetaUrl) | (null));
  /** The thumbnail of the video. */
  "thumbnail"?: ((BraveSchemaAppModelsProductsSearchV1SharedThumbnail) | (null));
  /** A human-readable representation of the video’s age. For example, <code>2 days ago</code>. */
  "age"?: ((string) | (null));
  /** The publisher of the video. */
  "publisher"?: ((string) | (null));
};

export type BraveSchemaImage = {
  /** The thumbnail associated with the image. */
  "thumbnail": BraveSchemaAppModelsProductsSearchV1SharedThumbnail;
  /** The URL of the image. */
  "url"?: ((string) | (null));
  /** Metadata on the image. */
  "properties"?: ((BraveSchemaImageProperties) | (null));
};

export type BraveSchemaPerson = {
  /** A type identifying a person. The value is always <code>person</code>. */
  "type"?: "person";
  /** The name of the thing. */
  "name": string;
  /** A URL for the thing. */
  "url"?: ((string) | (null));
  /** Thumbnail associated with the thing. */
  "thumbnail"?: ((BraveSchemaAppModelsProductsSearchV1SharedThumbnail) | (null));
  /** Email address of the person. */
  "email"?: ((string) | (null));
};

export type BraveSchemaAnswer = {
  /** The main content of the answer. */
  "text": string;
  /** The name of the author of the answer. */
  "author"?: ((string) | (null));
  /** Number of upvotes on the answer. */
  "upvoteCount"?: ((number) | (null));
  /** The number of downvotes on the answer. */
  "downvoteCount"?: ((number) | (null));
};

export type BraveSchemaPrice = {
  /** The price value in a given currency. */
  "price": string;
  /** The currency of the price value. */
  "priceCurrency": string;
};

export type BraveSchemaAppModelsProductsSearchV1SharedOffer = {
  /** The URL where the offer can be found. */
  "url": string;
  /** The currency in which the offer is made. */
  "priceCurrency": string;
  /** The price of the product currently on offer. */
  "price": string;
};

export type BraveSchemaHowTo = {
  /** The how to text. */
  "text": string;
  /** A name for the how to. */
  "name"?: ((string) | (null));
  /** A URL associated with the how to. */
  "url"?: ((string) | (null));
  /** A list of image URLs associated with the how to. */
  "image"?: ((Array<string>) | (null));
};

export type BraveSchemaContactPoint = {
  /** A type string identifying a contact point. The value is always <code>contact_point</code>. */
  "type"?: string;
  /** The name of the thing. */
  "name": string;
  /** A URL for the thing. */
  "url"?: ((string) | (null));
  /** Thumbnail associated with the thing. */
  "thumbnail"?: ((BraveSchemaAppModelsProductsSearchV1SharedThumbnail) | (null));
  /** The telephone number of the entity. */
  "telephone"?: ((string) | (null));
  /** The email address of the entity. */
  "email"?: ((string) | (null));
};

export type BraveSchemaSnakepitModelsRichHeaderResultsCurrenciesV1Query = {
  "from_currency": BraveSchemaCurrency;
  "to_currency": BraveSchemaCurrency;
  "amount": number;
};

export type BraveSchemaInfo = {
  "rate": number;
  "timestamp": number;
};

export type BraveSchemaDefinitionText = {
  "text": string;
  "example_uses": Array<string>;
  "related_words": Array<string>;
  "labels": Array<BraveSchemaDefinitionLabel>;
};

export type BraveSchemaF1RaceRef = {
  "id": number;
  "name": string;
  "date"?: ((string) | (null));
};

export type BraveSchemaF1Race = {
  "id": number;
  "competition": BraveSchemaF1Competition;
  "circuit": BraveSchemaF1Circuit;
  "season": number;
  "type": string;
  "laps"?: ((BraveSchemaF1Laps) | (null));
  "fastest_lap"?: ((BraveSchemaF1FastestLap) | (null));
  "distance"?: ((number) | (string) | (null));
  "date": string;
  "status": string;
};

export type BraveSchemaF1WeekendEvent = {
  "type": string;
  "date": string;
  "status": string;
};

export type BraveSchemaF1Driver = {
  "id": number;
  "name": string;
  "abbr"?: ((string) | (null));
  "number"?: ((number) | (null));
  "image"?: ((string) | (null));
};

export type BraveSchemaF1Team = {
  "id": number;
  "name": string;
  "logo"?: ((string) | (null));
};

export type BraveSchemaSnakepitModelsMixerSpecsAtomicMetaUrl = {
  "scheme": string;
  "netloc": string;
  "hostname"?: ((string) | (null));
  "favicon": string;
  "path": string;
};

export type BraveSchemaCourier = {
  "name": string;
  "service": string;
  "code": string;
  "domain": string;
};

export type BraveSchemaSportsLeague = {
  "id": ((number) | (string));
  "name": string;
  "logo": string;
  "season": string;
  "round"?: ((string) | (null));
  "has_standings"?: ((boolean) | (null));
};

export type BraveSchemaSportsDateKind = "today" | "season_end" | "season_start" | "explicit";

export type BraveSchemaSportsFixtureAmericanFootball = {
  "id": ((string) | (number));
  "teams": BraveSchemaSportsFixtureTeams;
  "score"?: ((BraveSchemaSportsFixtureScore) | (null));
  "start_time": number;
  "status"?: ((BraveSchemaSportsAmericanFootballFixtureStatus) | (null));
  "video"?: ((BraveSchemaSportsFixtureVideo) | (null));
  "score_table"?: ((BraveSchemaSportsAmericanFootballScoreTable) | (null));
  "phase": string;
};

export type BraveSchemaSportsAmericanFootballStandingsGroup = {
  "group_name": string;
  "standings": Array<BraveSchemaSportsAmericanFootballStandingsDivision>;
};

export type BraveSchemaSportsTeam = {
  "id"?: ((string) | (number) | (null));
  "nickname"?: ((string) | (null));
  "location"?: ((string) | (null));
  "name": string;
  "logo": string;
};

export type BraveSchemaSportsCompetition = {
  "id": ((number) | (string));
  "name": string;
  "season": string;
};

export type BraveSchemaSportsFixtureTeams = {
  "home": BraveSchemaSportsTeam;
  "away": BraveSchemaSportsTeam;
};

export type BraveSchemaSportsAmericanFootballFixtureStatus = {
  "code"?: ((BraveSchemaSportsAmericanFootballFixtureStatusCode) | (null));
  "elapsed"?: ((string) | (null));
};

export type BraveSchemaSportsFixtureScore = {
  "home": number;
  "away": number;
};

export type BraveSchemaSportsAmericanFootballScoreTable = {
  "q1"?: ((BraveSchemaSportsFixtureScore) | (null));
  "q2"?: ((BraveSchemaSportsFixtureScore) | (null));
  "q3"?: ((BraveSchemaSportsFixtureScore) | (null));
  "q4"?: ((BraveSchemaSportsFixtureScore) | (null));
  "ot"?: ((BraveSchemaSportsFixtureScore) | (null));
};

export type BraveSchemaSportsAmericanFootballFixtureBulletin = {
  "text": string;
};

export type BraveSchemaSportsFootballFixtureStatus = {
  "code"?: ((BraveSchemaSportsFootballFixtureStatusCode) | (null));
  "elapsed"?: ((number) | (null));
  "extra"?: ((number) | (null));
};

export type BraveSchemaSportsStatistic = {
  "name": string;
  "home"?: ((string) | (number) | (null));
  "away"?: ((string) | (number) | (null));
};

export type BraveSchemaSportsFootballFixtureEvent = {
  "team_id": number;
  "type": string;
  "detail"?: ((string) | (null));
  "player_name"?: ((string) | (null));
  "assist_name"?: ((string) | (null));
  "elapsed": number;
  "extra"?: ((number) | (null));
};

export type BraveSchemaSportsFootballLineups = {
  "home": BraveSchemaSportsFootballLineup;
  "away": BraveSchemaSportsFootballLineup;
};

export type BraveSchemaSportsFixtureAggregateScore = {
  "scores": {
    [key: string]: number;
  };
};

export type BraveSchemaSportsFixtureFootball = {
  "id": ((string) | (number));
  "teams": BraveSchemaSportsFixtureTeams;
  "score"?: ((BraveSchemaSportsFixtureScore) | (null));
  "start_time": number;
  "status"?: ((BraveSchemaSportsFootballFixtureStatus) | (null));
  "video"?: ((BraveSchemaSportsFixtureVideo) | (null));
  "ps_score"?: ((BraveSchemaSportsFixtureScore) | (null));
  "events"?: ((Array<BraveSchemaSportsFootballFixtureEvent>) | (null));
  "competition_id"?: ((number) | (null));
  "aggregate_score"?: ((BraveSchemaSportsFixtureAggregateScore) | (null));
  "group"?: ((BraveSchemaSportsLabel) | (null));
  "round"?: ((string) | (null));
};

export type BraveSchemaSportsFootballStandingsGroup = {
  "group_name": string;
  "standings": Array<BraveSchemaSportsFootballStanding>;
};

export type BraveSchemaSportsFixtureBaseball = {
  "id": ((string) | (number));
  "teams": BraveSchemaSportsFixtureTeams;
  "score"?: ((BraveSchemaSportsFixtureScore) | (null));
  "start_time": number;
  "status"?: ((BraveSchemaSportsBaseballFixtureStatus) | (null));
  "video"?: ((BraveSchemaSportsFixtureVideo) | (null));
  "score_table"?: ((BraveSchemaSportsBaseballScoreTable) | (null));
};

export type BraveSchemaSportsBaseballStandingsGroup = {
  "group_name": string;
  "standings": Array<BraveSchemaSportsBaseballStanding>;
  "stage": string;
};

export type BraveSchemaSportsFixtureBasketball = {
  "id": ((string) | (number));
  "teams": BraveSchemaSportsFixtureTeams;
  "score"?: ((BraveSchemaSportsFixtureScore) | (null));
  "start_time": number;
  "status"?: ((BraveSchemaSportsBasketballFixtureStatus) | (null));
  "video"?: ((BraveSchemaSportsFixtureVideo) | (null));
  "score_table"?: ((BraveSchemaSportsBasketballScoreTable) | (null));
};

export type BraveSchemaSportsBasketballStandingsGroup = {
  "group_name": string;
  "standings": Array<BraveSchemaSportsBasketballStanding>;
  "stage": string;
};

export type BraveSchemaSportsFixtureIceHockey = {
  "id": ((string) | (number));
  "teams": BraveSchemaSportsFixtureTeams;
  "score"?: ((BraveSchemaSportsFixtureScore) | (null));
  "start_time": number;
  "status"?: ((BraveSchemaSportsIceHockeyFixtureStatus) | (null));
  "video"?: ((BraveSchemaSportsFixtureVideo) | (null));
  "score_table"?: ((BraveSchemaSportsIceHockeyScoreTable) | (null));
  "league_id"?: ((number) | (null));
};

export type BraveSchemaSportsIceHockeyStandingsGroup = {
  "group_name": string;
  "standings": Array<BraveSchemaSportsIceHockeyStanding>;
  "stage": string;
};

export type BraveSchemaSportsFixtureCricket = {
  "id": ((string) | (number));
  "teams": BraveSchemaSportsFixtureTeams;
  "score"?: ((BraveSchemaSportsCricketFixtureScore) | (null));
  "start_time": number;
  "status"?: ((BraveSchemaSportsCricketFixtureStatus) | (null));
  "video"?: ((BraveSchemaSportsFixtureVideo) | (null));
};

export type BraveSchemaSportsCricketStandingsGroup = {
  "group_name": string;
  "standings": Array<BraveSchemaSportsCricketStanding>;
};

export type BraveSchemaSportsCricketFixtureStatus = {
  "code"?: ((BraveSchemaSportsCricketFixtureStatusCode) | (null));
};

export type BraveSchemaSportsCricketFixtureScore = {
  "home": ((string) | (number));
  "away": ((string) | (number));
  "home_runs"?: ((string) | (null));
  "home_overs"?: ((string) | (null));
  "away_runs"?: ((string) | (null));
  "away_overs"?: ((string) | (null));
};

export type BraveSchemaSportsCricketContentFixtureDetails = {
  "innings"?: Array<BraveSchemaSportsCricketContentFixtureDetailsInning>;
  "matchDay"?: ((number) | (null));
  "numberDays"?: ((number) | (null));
  "night"?: ((number) | (null));
  "dl"?: ((number) | (null));
  "statusId"?: ((number) | (null));
  "winTypeId"?: ((number) | (null));
  "winnerId"?: ((number) | (null));
  "result"?: ((string) | (null));
  "minOversRemaining"?: ((string) | (null));
  "totalOvers"?: ((number) | (null));
  "winMargin"?: ((number) | (null));
  "tossWinnerTeamId"?: ((string) | (null));
  "toss"?: ((string) | (null));
  "tossDecision"?: ((string) | (null));
  "awayBattingBonus"?: ((number) | (null));
  "awayBowlingBonus"?: ((number) | (null));
  "homeBattingBonus"?: ((number) | (null));
  "homeBowlingBonus"?: ((number) | (null));
  "playerOfTheMatch1Id"?: ((string) | (null));
  "playerOfTheMatch2Id"?: ((string) | (null));
  "playerOfTheMatch1Name"?: ((string) | (null));
  "playerOfTheMatch2Name"?: ((string) | (null));
  "playerOfTheSeries1Id"?: ((string) | (null));
  "playerOfTheSeries2Id"?: ((string) | (null));
  "playerOfTheSeries1Name"?: ((string) | (null));
  "playerOfTheSeries2Name"?: ((string) | (null));
};

export type BraveSchemaSportsCricketContentFixtureLineup = {
  "player"?: Array<BraveSchemaSportsCricketContentFixtureLineupPlayer>;
  "name": string;
};

export type BraveSchemaFinancialInstrumentCategory = "stock" | "index" | "fund" | "etf" | "bond" | "other";

export type BraveSchemaStockObservation = {
  "date": string;
  "minute": string;
  "label": string;
  "timestamp": number;
  "high"?: ((number) | (null));
  "low"?: ((number) | (null));
  "close"?: ((number) | (null));
  "previous_close"?: ((number) | (null));
  "average"?: ((number) | (null));
  "volume"?: ((number) | (null));
};

export type BraveSchemaCoordinates = {
  "lat": number;
  "lon": number;
};

export type BraveSchemaWindSnapshot = {
  "speed": number;
  "deg": number;
  "gust"?: ((number) | (null));
};

export type BraveSchemaWeatherSnapshot = {
  "id": number;
  "main": string;
  "description": string;
  "icon": string;
};

export type BraveSchemaTemperatureDailySummary = {
  "day": number;
  "min": number;
  "max": number;
  "night": number;
  "evening": number;
  "morning": number;
};

export type BraveSchemaTemperatureDailyFeelsLikeSummary = {
  "day": number;
  "night": number;
  "evening": number;
  "morning": number;
};

export type BraveSchemaTemperatureSummary3Hours = {
  "temp": number;
  "feels_like": number;
  "min": number;
  "max": number;
};

export type BraveSchemaImageProperties = {
  /** The original image URL. */
  "url": string;
  /** The URL for a better quality resized image. */
  "resized": string;
  /** The placeholder image URL. */
  "placeholder": string;
  /** The image height. */
  "height"?: ((number) | (null));
  /** The image width. */
  "width"?: ((number) | (null));
  /** The image format. */
  "format"?: ((string) | (null));
  /** The image size. */
  "content_size"?: ((string) | (null));
};

export type BraveSchemaDefinitionLabel = {
  "text": string;
  "type": string;
};

export type BraveSchemaF1Competition = {
  "id": number;
  "name": string;
  "location": BraveSchemaF1Location;
};

export type BraveSchemaF1Circuit = {
  "id": number;
  "name": string;
  "image": string;
};

export type BraveSchemaF1Laps = {
  "current"?: ((number) | (null));
  "total"?: ((number) | (null));
};

export type BraveSchemaF1FastestLap = {
  "driver"?: ((BraveSchemaF1FastestLapDriver) | (null));
  "time"?: ((string) | (null));
};

export type BraveSchemaSportsFixtureVideo = {
  "duration"?: ((string) | (null));
  "url": string;
  "thumbnail": string;
  "type"?: "video" | "story";
};

export type BraveSchemaSportsAmericanFootballStandingsDivision = {
  "name": string;
  "standings": Array<BraveSchemaSportsAmericanFootballStanding>;
};

export type BraveSchemaSportsAmericanFootballFixtureStatusCode = "FT" | "AET" | "Q1" | "Q2" | "Q3" | "Q4" | "NS" | "POST" | "CANC" | "INT" | "DEL" | "LIVE" | "FFA" | "FFH" | "FFB";

export type BraveSchemaSportsFootballFixtureStatusCode = "AET" | "BT" | "CANC" | "ET" | "FT" | "1H" | "2H" | "HT" | "LIVE" | "NS" | "P" | "PEN" | "PST" | "SUSP" | "TBD";

export type BraveSchemaSportsFootballLineup = {
  "formation"?: ((string) | (null));
  "startXI": Array<BraveSchemaSportsFootballPlayer>;
  "substitutes": Array<BraveSchemaSportsFootballPlayer>;
  "coach": BraveSchemaSportsFootballCoach;
};

export type BraveSchemaSportsLabel = {
  "i18n": string;
  "i18n_opts"?: (({
    [key: string]: string;
  }) | (null));
  "kind"?: ((BraveSchemaSportsLabelKind) | (null));
};

export type BraveSchemaSportsFootballStanding = {
  "team": BraveSchemaSportsTeam;
  "rank": number;
  "matches_played": number;
  "matches_won": number;
  "matches_drawn": number;
  "matches_lost": number;
  "goals_for": number;
  "goals_against": number;
  "points": number;
  "form": string;
  "label"?: ((BraveSchemaSportsLabel) | (null));
};

export type BraveSchemaSportsBaseballFixtureStatus = {
  "code"?: ((BraveSchemaSportsBaseballFixtureStatusCode) | (null));
};

export type BraveSchemaSportsBaseballScoreTable = {
  "innings": Array<BraveSchemaSportsBaseballInningScore>;
  "extra"?: ((BraveSchemaSportsBaseballInningScore) | (null));
  "hits"?: ((BraveSchemaSportsFixtureScore) | (null));
  "errors"?: ((BraveSchemaSportsFixtureScore) | (null));
};

export type BraveSchemaSportsBaseballStanding = {
  "team": BraveSchemaSportsTeam;
  "rank": number;
  "matches_played": number;
  "matches_won": number;
  "matches_won_pros": string;
  "matches_lost": number;
  "matches_lost_pros": string;
  "games_behind": number;
  "form": string;
};

export type BraveSchemaSportsBasketballFixtureStatus = {
  "code"?: ((BraveSchemaSportsBasketballFixtureStatusCode) | (null));
};

export type BraveSchemaSportsBasketballScoreTable = {
  "q1"?: ((BraveSchemaSportsFixtureScore) | (null));
  "q2"?: ((BraveSchemaSportsFixtureScore) | (null));
  "q3"?: ((BraveSchemaSportsFixtureScore) | (null));
  "q4"?: ((BraveSchemaSportsFixtureScore) | (null));
  "ot"?: ((BraveSchemaSportsFixtureScore) | (null));
};

export type BraveSchemaSportsBasketballStanding = {
  "team": BraveSchemaSportsTeam;
  "rank": number;
  "matches_played": number;
  "matches_won": number;
  "matches_won_pros": string;
  "matches_lost": number;
  "matches_lost_pros": string;
  "games_behind": number;
};

export type BraveSchemaSportsIceHockeyFixtureStatus = {
  "code"?: ((BraveSchemaSportsIceHockeyFixtureStatusCode) | (null));
  "elapsed"?: ((number) | (null));
};

export type BraveSchemaSportsIceHockeyScoreTable = {
  "p1"?: ((BraveSchemaSportsFixtureScore) | (null));
  "p2"?: ((BraveSchemaSportsFixtureScore) | (null));
  "p3"?: ((BraveSchemaSportsFixtureScore) | (null));
  "ot"?: ((BraveSchemaSportsFixtureScore) | (null));
  "so"?: ((BraveSchemaSportsFixtureScore) | (null));
};

export type BraveSchemaSportsIceHockeyStanding = {
  "team": BraveSchemaSportsTeam;
  "rank": number;
  "matches_played": number;
  "matches_won": number;
  "matches_won_pros": string;
  "matches_lost": number;
  "matches_lost_pros": string;
  "points": number;
  "form": string;
};

export type BraveSchemaSportsCricketStanding = {
  "team": BraveSchemaSportsTeam;
  "rank": number;
  "matches_played": number;
  "matches_won": number;
  "matches_drawn": string;
  "matches_lost": number;
  "matches_no_result": string;
  "points": string;
  "net_run_rate": number;
};

export type BraveSchemaSportsCricketFixtureStatusCode = "ABN" | "BRK" | "FT" | "LIVE" | "NS" | "PST" | "SDL" | "SPR" | "STM" | "TRB";

export type BraveSchemaSportsCricketContentFixtureDetailsInning = {
  "batters"?: ((BraveSchemaSportsCricketContentFixtureDetailsInningBatters) | (null));
  "bowlers"?: ((BraveSchemaSportsCricketContentFixtureDetailsInningBowlers) | (null));
  "extras"?: ((BraveSchemaSportsCricketContentFixtureDetailsInningExtras) | (null));
  "fallOfWickets"?: ((BraveSchemaSportsCricketContentFixtureDetailsInningFallOfWickets) | (null));
  "total"?: ((BraveSchemaSportsCricketContentFixtureDetailsInningTotal) | (null));
  "id": number;
  "battingTeamId"?: ((string) | (null));
  "bowlingTeamId"?: ((string) | (null));
  "declared"?: ((number) | (null));
  "dlOvers"?: ((number) | (null));
  "dlTarget"?: ((number) | (null));
  "followOn"?: ((number) | (null));
  "forfeited"?: ((number) | (null));
  "overnightRuns"?: ((number) | (null));
  "overnightWickets"?: ((number) | (null));
  "team"?: ((BraveSchemaSportsCricketContentFixtureDetailsInningTeam) | (null));
  "bestBatters"?: Array<BraveSchemaSportsCricketContentFixtureDetailsInningBatter>;
  "bestBowlers"?: Array<BraveSchemaSportsCricketContentFixtureDetailsInningBowler>;
};

export type BraveSchemaSportsCricketContentFixtureLineupPlayer = {
  "id": string;
  "order"?: ((number) | (null));
  "firstName"?: ((string) | (null));
  "middleName"?: ((string) | (null));
  "lastName"?: ((string) | (null));
  "matchName"?: ((string) | (null));
  "initials"?: ((string) | (null));
  "teamRole"?: ((string) | (null));
  "gameRole"?: ((string) | (null));
};

export type BraveSchemaF1Location = {
  "country": string;
  "city": string;
};

export type BraveSchemaF1FastestLapDriver = {
  "id"?: ((number) | (null));
};

export type BraveSchemaSportsAmericanFootballStanding = {
  "team": BraveSchemaSportsTeam;
  "division_rank"?: ((number) | (null));
  "division_seed"?: ((number) | (null));
  "conference_rank"?: ((number) | (null));
  "conference_seed"?: ((number) | (null));
  "matches_won": number;
  "matches_drawn": number;
  "matches_lost": number;
  "matches_won_percent": string;
  "points_for": number;
  "points_against": number;
  "games_behind": string;
};

export type BraveSchemaSportsFootballPlayer = {
  "name": string;
  "number": number;
  "pos": string;
  "grid"?: ((string) | (null));
  "photo"?: ((string) | (null));
};

export type BraveSchemaSportsFootballCoach = {
  "name": string;
  "photo"?: ((string) | (null));
};

export type BraveSchemaSportsLabelKind = "qualification" | "relegation" | "unknown";

export type BraveSchemaSportsBaseballFixtureStatusCode = "FT" | "NS" | "POST" | "CANC" | "INTR" | "ABD" | "IN1" | "IN2" | "IN3" | "IN4" | "IN5" | "IN6" | "IN7" | "IN8" | "IN9";

export type BraveSchemaSportsBaseballInningScore = {
  "home"?: ((number) | (null));
  "away"?: ((number) | (null));
};

export type BraveSchemaSportsBasketballFixtureStatusCode = "FT" | "AOT" | "NS" | "POST" | "CANC" | "SUSP" | "Q1" | "Q2" | "Q3" | "Q4" | "BT" | "OT" | "HT";

export type BraveSchemaSportsIceHockeyFixtureStatusCode = "NS" | "P1" | "P2" | "P3" | "OT" | "PT" | "BT" | "AW" | "POST" | "CANC" | "INTR" | "ABD" | "AOT" | "AP" | "FT";

export type BraveSchemaSportsCricketContentFixtureDetailsInningBatters = {
  "batter"?: Array<BraveSchemaSportsCricketContentFixtureDetailsInningBatter>;
};

export type BraveSchemaSportsCricketContentFixtureDetailsInningBowlers = {
  "bowler"?: Array<BraveSchemaSportsCricketContentFixtureDetailsInningBowler>;
};

export type BraveSchemaSportsCricketContentFixtureDetailsInningExtras = {
  "byes"?: ((number) | (null));
  "legByes"?: ((number) | (null));
  "noBalls"?: ((number) | (null));
  "penalties"?: ((number) | (null));
  "totalExtras"?: ((number) | (null));
  "wides"?: ((number) | (null));
};

export type BraveSchemaSportsCricketContentFixtureDetailsInningFallOfWickets = {
  "fallOfWicket"?: Array<BraveSchemaSportsCricketContentFixtureDetailsInningFallOfWicket>;
};

export type BraveSchemaSportsCricketContentFixtureDetailsInningTotal = {
  "runsScored"?: ((number) | (null));
  "wickets"?: ((number) | (null));
  "overs"?: ((number) | (null));
};

export type BraveSchemaSportsCricketContentFixtureDetailsInningTeam = {
  "id"?: ((string) | (number) | (null));
  "nickname"?: ((string) | (null));
  "location"?: ((string) | (null));
  "name": string;
  "logo": string;
  "score"?: ((string) | (null));
  "runs"?: ((string) | (null));
  "overs"?: ((number) | (null));
};

export type BraveSchemaSportsCricketContentFixtureDetailsInningBatter = {
  "id": string;
  "ballsFaced"?: ((number) | (null));
  "bowledById"?: ((string) | (null));
  "caughtById"?: ((string) | (null));
  "day"?: ((number) | (null));
  "dismissalId"?: ((number) | (null));
  "foursScored"?: ((number) | (null));
  "howOut"?: ((string) | (null));
  "minutes"?: ((number) | (null));
  "nonStrike"?: ((number) | (null));
  "onStrike"?: ((number) | (null));
  "order"?: ((number) | (null));
  "runsScored"?: ((number) | (null));
  "sixesScored"?: ((number) | (null));
};

export type BraveSchemaSportsCricketContentFixtureDetailsInningBowler = {
  "id": string;
  "ballsBowled"?: ((number) | (null));
  "totalBallsBowled"?: ((number) | (null));
  "dotBalls"?: ((number) | (null));
  "maidensBowled"?: ((number) | (null));
  "noBalls"?: ((number) | (null));
  "nonStrike"?: ((number) | (null));
  "onStrike"?: ((number) | (null));
  "order"?: ((number) | (null));
  "oversBowled"?: ((number) | (null));
  "runsConceded"?: ((number) | (null));
  "wicketsTaken"?: ((number) | (null));
  "wides"?: ((number) | (null));
};

export type BraveSchemaSportsCricketContentFixtureDetailsInningFallOfWicket = {
  "playerId": string;
  "order"?: ((number) | (null));
  "overBall"?: ((number) | (null));
  "runs"?: ((number) | (null));
  "totalBallsBowled"?: ((number) | (null));
};

export type BraveLlmContextQuery = {
  /** The user’s search query term. Query can not be empty. Maximum of 600 characters and 75 words in the query. (minLength 1, maxLength 600) */
  "q": string;
  /** The search query country, where the results come from. The country string is limited to 2 character country codes of supported countries. */
  "country"?: BraveSchemaSearchCountry;
  /** The search language preference. The 2 or more character language code for which the search results are provided. */
  "search_lang"?: BraveSchemaLanguageInput;
  /** The maximum number of search results considered to select the LLM context data. The default is 20 and the maximum is 50. (min 1, max 50) */
  "count"?: number;
  /** <p>Filters results for adult content. The following values are supported:</p> <ul> <li><strong>off</strong> - No filtering is done.</li> <li><strong>moderate</strong> - Drops adult content from the results used for context.</li> <li><strong>strict</strong> - Drops all adult conte */
  "safesearch"?: ((BraveSchemaAppModelsGeneralSafeSearch) | (null));
  /** Whether to enable spellcheck on the query. */
  "spellcheck"?: boolean;
  /** Maximum number of different URLs to include in LLM context. (min 1, max 50) */
  "maximum_number_of_urls"?: number;
  /** Approximate maximum number of tokens to include in context. The default is <code>8192</code> and maximum is <code>32768</code>. (min 1024, max 32768) */
  "maximum_number_of_tokens"?: number;
  /** Maximum number of different snippets (or chunks of text) to include in LLM context. The default is <code>50</code> and maximum is <code>256</code>. (min 1, max 256) */
  "maximum_number_of_snippets"?: number;
  /** The mode to use to determine the threshold for including content in context. */
  "context_threshold_mode"?: ((BraveSchemaSummarizerContextThresholdMode) | (null));
  /** Maximum number of tokens to include per URL. The default is <code>4096</code> and maximum is <code>8192</code>. (min 512, max 8192) */
  "maximum_number_of_tokens_per_url"?: number;
  /** Maximum number of snippets to include per URL. The default is <code>50</code> and maximum is <code>100</code>. (min 1, max 100) */
  "maximum_number_of_snippets_per_url"?: number;
  /** Goggles act as a custom re-ranking on top of Brave’s search index. The parameter supports both a url where the Goggle is hosted or the definition of the Goggle. For more details, see the <a href="/documentation/resources/goggles">Goggles documentation</a>. The parameter can be a  */
  "goggles"?: ((string) | (Array<string>) | (null));
  /** <p>Filters search results by page age. The age of a page is determined by the most relevant date reported by the content, such as its published or last modified date. The following values are supported:</p> <ul> <li><strong>pd</strong> - Pages aged 24 hours or less.</li> <li><str */
  "freshness"?: string;
  /** Whether to enable local recall. Not setting this value means auto-detect: local recall is used if a location is provided (<code>X-Loc-Lat</code> with <code>X-Loc-Long</code>, or <code>X-Loc-City</code>). */
  "enable_local"?: ((boolean) | (null));
  /** Enable source metadata enrichment (site_name, favicon, thumbnail, description, fetched_content_timestamp) in the sources attribute of the response. */
  "enable_source_metadata"?: boolean;
};

export type BraveLlmContextHeaders = {
  /** The latitude of the client’s geographical location in degrees, to provide relevant local results. The latitude must be greater than or equal to -90.0 degrees and less than or equal to +90.0 degrees. */
  "x-loc-lat"?: string;
  /** The longitude of the client’s geographical location in degrees, to provide relevant local results. The longitude must be greater than or equal to -180.0 and less than or equal to +180.0 degrees. */
  "x-loc-long"?: string;
  /** The generic name of the client city */
  "x-loc-city"?: string;
  /** A code which could be up to three characters, that represent the client’s state/region. The region is the first-level subdivision (the broadest or least specific) of the <a href="https://en.wikipedia.org/wiki/ISO_3166-2">ISO 3166-2</a> code. */
  "x-loc-state"?: string;
  /** The name of the client’s state/region. The region is the first-level subdivision (the broadest or least specific) of the <a href="https://en.wikipedia.org/wiki/ISO_3166-2">ISO 3166-2</a> code. */
  "x-loc-state-name"?: string;
  /** The two letter country code for the client’s country. For a list of country codes, see <a href="https://en.wikipedia.org/wiki/ISO_3166-1_alpha-2">ISO 3166-1 alpha-2</a> */
  "x-loc-country"?: string;
  /** The client’s postal code */
  "x-loc-postal-code"?: string;
  /** The API version to use. This is denoted by the format <code>YYYY-MM-DD</code>. Default is the latest that is available. Read more about <a href="/documentation/guides/versioning">API versioning</a>. */
  "api-version"?: string;
  /** The default supported media type is application/json. */
  "accept"?: string;
  /** Brave Search will return cached content by default. To prevent caching set the Cache-Control header to <code>no-cache</code>. This is currently done as best effort. */
  "cache-control"?: string;
  /** The user agent originating the request. Brave search can utilize the user agent to provide a different experience depending on the device as described by the string. The user agent should follow the commonly used browser agent strings on each platform. For more information on cur */
  "user-agent"?: string;
};

export interface BraveLlmContextInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  query: BraveLlmContextQuery;
  headers?: BraveLlmContextHeaders & Readonly<Record<string, string>>;
}

export type BraveLlmContextResponse = BraveSchemaLLMContextAPIResponse;

export type BraveLlmContextPostHeaders = {
  /** The latitude of the client’s geographical location in degrees, to provide relevant local results. The latitude must be greater than or equal to -90.0 degrees and less than or equal to +90.0 degrees. */
  "x-loc-lat"?: string;
  /** The longitude of the client’s geographical location in degrees, to provide relevant local results. The longitude must be greater than or equal to -180.0 and less than or equal to +180.0 degrees. */
  "x-loc-long"?: string;
  /** The generic name of the client city */
  "x-loc-city"?: string;
  /** A code which could be up to three characters, that represent the client’s state/region. The region is the first-level subdivision (the broadest or least specific) of the <a href="https://en.wikipedia.org/wiki/ISO_3166-2">ISO 3166-2</a> code. */
  "x-loc-state"?: string;
  /** The name of the client’s state/region. The region is the first-level subdivision (the broadest or least specific) of the <a href="https://en.wikipedia.org/wiki/ISO_3166-2">ISO 3166-2</a> code. */
  "x-loc-state-name"?: string;
  /** The two letter country code for the client’s country. For a list of country codes, see <a href="https://en.wikipedia.org/wiki/ISO_3166-1_alpha-2">ISO 3166-1 alpha-2</a> */
  "x-loc-country"?: string;
  /** The client’s postal code */
  "x-loc-postal-code"?: string;
  /** The API version to use. This is denoted by the format <code>YYYY-MM-DD</code>. Default is the latest that is available. Read more about <a href="/documentation/guides/versioning">API versioning</a>. */
  "api-version"?: string;
  /** The default supported media type is application/json. */
  "accept"?: string;
  /** Brave Search will return cached content by default. To prevent caching set the Cache-Control header to <code>no-cache</code>. This is currently done as best effort. */
  "cache-control"?: string;
  /** The user agent originating the request. Brave search can utilize the user agent to provide a different experience depending on the device as described by the string. The user agent should follow the commonly used browser agent strings on each platform. For more information on cur */
  "user-agent"?: string;
};

export type BraveLlmContextPostBody = BraveSchemaLLMContextParameters;

export interface BraveLlmContextPostInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  headers?: BraveLlmContextPostHeaders & Readonly<Record<string, string>>;
  body: BraveLlmContextPostBody;
}

export type BraveLlmContextPostResponse = BraveSchemaLLMContextAPIResponse;

export type BraveAnswersBody = BraveSchemaOpenAIChatRequest;

export interface BraveAnswersInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  headers?: Readonly<Record<string, string>>;
  body: Omit<BraveAnswersBody, "stream"> & { stream?: false };
}

export type BraveAnswersResponse = {
  "model"?: "brave-pro" | "brave";
  "system_fingerprint"?: ((string) | (null));
  "choices": Array<{
    "delta"?: BraveSchemaDelta;
    "finish_reason"?: (("stop" | "length") | (null));
    "message": {
      "role"?: string;
      "content": string;
    };
  }>;
  "created": number;
  "id": string;
  "object"?: "chat.completion.chunk";
  "usage"?: ((BraveSchemaOpenAIUsage) | (null));
};

export type BraveAnswersStreamBody = BraveSchemaOpenAIChatRequest;

export interface BraveAnswersStreamInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  headers?: Readonly<Record<string, string>>;
  body: Omit<BraveAnswersStreamBody, "stream"> & { stream?: true };
}

export type BraveAnswersStreamPayload = BraveSchemaOpenAIChatResponse;

export type BraveSearchQuery = {
  /** The user’s search query term. Query can not be empty. Maximum of 600 characters and 75 words in the query. (minLength 1, maxLength 600) */
  "q": string;
  /** The 2 character country code where the search results come from. */
  "country"?: BraveSchemaSearchCountry;
  /** The 2 or more character language code for which the search results are provided. */
  "search_lang"?: BraveSchemaLanguageInput;
  /** User interface language preferred in response. Usually of the format &lt;language_code&gt;-&lt;country_code&gt;. For more, see <a href="https://www.rfc-editor.org/rfc/rfc9110.html#name-accept-language">RFC 9110</a>. */
  "ui_lang"?: BraveSchemaMarketCodes;
  /** <p>The number of search results returned in response. The maximum is 20. The actual number delivered may be less than requested. Combine this parameter with offset to paginate search results.</p> <p><strong>NOTE:</strong> Count only applies to web results.</p> (min 1, max 20) */
  "count"?: number;
  /** <p>The zero based offset that indicates number of search result pages (count) to skip before returning the result. The default is 0 and the maximum is 9. The actual number delivered may be less than requested.</p> <p>Use this parameter along with the count parameter to page resul (min 0, max 9) */
  "offset"?: number;
  /** <p>Filters search results for adult content. The following values are supported:</p> <ul> <li><strong>off</strong> - No filtering is done.</li> <li><strong>moderate</strong> - Filters explicit content, like images and videos, but allows adult domains in the search results.</li> < */
  "safesearch"?: BraveSchemaAppModelsGeneralSafeSearch;
  /** Whether to spell check provided query. If the spell checker is enabled, the modified query is always used for search. The modified query can be found in altered key from the query response model. */
  "spellcheck"?: boolean;
  /** <p>Filters search results by page age. The age of a page is determined by the most relevant date reported by the content, such as its published or last modified date. The following values are supported:</p> <ul> <li><strong>pd</strong> - Pages aged 24 hours or less.</li> <li><str */
  "freshness"?: string;
  /** Whether display strings (e.g. result snippets) should include decoration markers (e.g. highlighting characters). */
  "text_decorations"?: boolean;
  /** <p>A comma delimited string of result types to include in the search response. Not specifying this parameter will return back all result types in search response where data is available and the plan has the corresponding option activated. The response always includes query and ty */
  "result_filter"?: ((Array<string>) | (null));
  /** <p>The measurement units. The following values are supported:</p> <ul> <li><strong>metric</strong> - The standardized measurement system (km, celcius…)</li> <li><strong>imperial</strong> - The British Imperial system of units (mile, fahrenheit…)</li> </ul> */
  "units"?: ((BraveSchemaMeasurementUnit) | (null));
  /** Goggles act as a custom re-ranking on top of Brave’s search index. For more details, refer to the Goggles repository. This parameter is deprecated. Please use the goggles parameter. */
  "goggles_id"?: ((string) | (null));
  /** Goggles act as a custom re-ranking on top of Brave’s search index. The parameter supports both a url where the Goggle is hosted or the definition of the Goggle. For more details, see the <a href="/documentation/resources/goggles">Goggles documentation</a>. The parameter can be a  */
  "goggles"?: ((string) | (Array<string>) | (null));
  /** A snippet is an excerpt from a page you get as a result of the query, and extra_snippets allow you to get up to 5 additional, alternative excerpts. */
  "extra_snippets"?: ((boolean) | (null));
  /** This parameter enables summary key generation in web search results. This is required for summarizer to be enabled. */
  "summary"?: ((boolean) | (null));
  /** <p>Enable rich callback. Allows you to get real time rich results via a callback URL when they are relevant to your query.</p> <p><strong>NOTE</strong>: Requires <code>Search</code> plan.</p> */
  "enable_rich_callback"?: boolean;
  /** Include fetch metadata. */
  "include_fetch_metadata"?: boolean;
  /** Whether to apply search operators */
  "operators"?: boolean;
};

export type BraveSearchHeaders = {
  /** The latitude of the client’s geographical location in degrees, to provide relevant local results. The latitude must be greater than or equal to -90.0 degrees and less than or equal to +90.0 degrees. */
  "x-loc-lat"?: string;
  /** The longitude of the client’s geographical location in degrees, to provide relevant local results. The longitude must be greater than or equal to -180.0 and less than or equal to +180.0 degrees. */
  "x-loc-long"?: string;
  /** The IANA timezone for the client’s device. For complete list of IANA timezones and location mappings see <a href="https://www.iana.org/time-zones">IANA Database</a> and <a href="https://download.geonames.org/export/dump/">Geonames Database</a>. */
  "x-loc-timezone"?: string;
  /** The generic name of the client city. */
  "x-loc-city"?: string;
  /** A code which could be up to three characters, that represent the client’s state/region. The region is the first-level subdivision (the broadest or least specific) of the <a href="https://en.wikipedia.org/wiki/ISO_3166-2">ISO 3166-2</a> code. */
  "x-loc-state"?: string;
  /** The name of the client’s state/region. The region is the first-level subdivision (the broadest or least specific) of the <a href="https://en.wikipedia.org/wiki/ISO_3166-2">ISO 3166-2</a> code. */
  "x-loc-state-name"?: string;
  /** <p>The two letter country code for the client’s country. For a list of country codes, see <a href="https://en.wikipedia.org/wiki/ISO_3166-1_alpha-2">ISO 3166-1 alpha-2</a>.</p> */
  "x-loc-country"?: string;
  /** The client’s postal code. */
  "x-loc-postal-code"?: string;
  /** The API version to use. This is denoted by the format <code>YYYY-MM-DD</code>. Default is the latest that is available. Read more about <a href="/documentation/guides/versioning">API versioning</a>. */
  "api-version"?: string;
  /** The default supported media type is application/json. */
  "accept"?: string;
  /** Brave Search will return cached content by default. To prevent caching set the Cache-Control header to <code>no-cache</code>. This is currently done as best effort. */
  "cache-control"?: string;
  /** The user agent originating the request. Brave search can utilize the user agent to provide a different experience depending on the device as described by the string. The user agent should follow the commonly used browser agent strings on each platform. For more information on cur */
  "user-agent"?: string;
};

export interface BraveSearchInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  query: BraveSearchQuery;
  headers?: BraveSearchHeaders & Readonly<Record<string, string>>;
}

export type BraveSearchResponse = BraveSchemaWebSearchApiResponse;

export type BraveSearchPostHeaders = {
  /** The latitude of the client’s geographical location in degrees, to provide relevant local results. The latitude must be greater than or equal to -90.0 degrees and less than or equal to +90.0 degrees. */
  "x-loc-lat"?: string;
  /** The longitude of the client’s geographical location in degrees, to provide relevant local results. The longitude must be greater than or equal to -180.0 and less than or equal to +180.0 degrees. */
  "x-loc-long"?: string;
  /** The IANA timezone for the client’s device. For complete list of IANA timezones and location mappings see <a href="https://www.iana.org/time-zones">IANA Database</a> and <a href="https://download.geonames.org/export/dump/">Geonames Database</a>. */
  "x-loc-timezone"?: string;
  /** The generic name of the client city. */
  "x-loc-city"?: string;
  /** A code which could be up to three characters, that represent the client’s state/region. The region is the first-level subdivision (the broadest or least specific) of the <a href="https://en.wikipedia.org/wiki/ISO_3166-2">ISO 3166-2</a> code. */
  "x-loc-state"?: string;
  /** The name of the client’s state/region. The region is the first-level subdivision (the broadest or least specific) of the <a href="https://en.wikipedia.org/wiki/ISO_3166-2">ISO 3166-2</a> code. */
  "x-loc-state-name"?: string;
  /** <p>The two letter country code for the client’s country. For a list of country codes, see <a href="https://en.wikipedia.org/wiki/ISO_3166-1_alpha-2">ISO 3166-1 alpha-2</a>.</p> */
  "x-loc-country"?: string;
  /** The client’s postal code. */
  "x-loc-postal-code"?: string;
  /** The API version to use. This is denoted by the format <code>YYYY-MM-DD</code>. Default is the latest that is available. Read more about <a href="/documentation/guides/versioning">API versioning</a>. */
  "api-version"?: string;
  /** The default supported media type is application/json. */
  "accept"?: string;
  /** Brave Search will return cached content by default. To prevent caching set the Cache-Control header to <code>no-cache</code>. This is currently done as best effort. */
  "cache-control"?: string;
  /** The user agent originating the request. Brave search can utilize the user agent to provide a different experience depending on the device as described by the string. The user agent should follow the commonly used browser agent strings on each platform. For more information on cur */
  "user-agent"?: string;
};

export type BraveSearchPostBody = BraveSchemaWebSearchParameters;

export interface BraveSearchPostInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  headers?: BraveSearchPostHeaders & Readonly<Record<string, string>>;
  body: BraveSearchPostBody;
}

export type BraveSearchPostResponse = BraveSchemaWebSearchApiResponse;

export type BraveLocalPoisQuery = {
  /** A list of unique identifiers for the location. The ids are valid only for 8 hours. (maxItems 20) */
  "ids": Array<string>;
  /** The search language preference. The 2 or more character language code for which the search results are provided. */
  "search_lang"?: BraveSchemaLanguageInput;
  /** User interface language preferred in response. Usually of the format &lt;language_code&gt;-&lt;country_code&gt;. For more, see <a href="https://www.rfc-editor.org/rfc/rfc9110.html#name-accept-language">RFC 9110</a>. */
  "ui_lang"?: BraveSchemaMarketCodes;
  /** <p>The measurement units. The following values are supported:</p> <ul> <li><strong>metric</strong> - The standardized measurement system (km, celcius…)</li> <li><strong>imperial</strong> - The British Imperial system of units (mile, fahrenheit…)</li> </ul> */
  "units"?: ((BraveSchemaMeasurementUnit) | (null));
};

export type BraveLocalPoisHeaders = {
  /** The latitude of the client’s geographical location in degrees, to provide relevant local results. The latitude must be greater than or equal to -90.0 degrees and less than or equal to +90.0 degrees. */
  "x-loc-lat"?: string;
  /** The longitude of the client’s geographical location in degrees, to provide relevant local results. The longitude must be greater than or equal to -180.0 and less than or equal to +180.0 degrees. */
  "x-loc-long"?: string;
  /** The API version to use. This is denoted by the format <code>YYYY-MM-DD</code>. Default is the latest that is available. Read more about <a href="/documentation/guides/versioning">API versioning</a>. */
  "api-version"?: string;
  /** The default supported media type is application/json. */
  "accept"?: string;
  /** Brave Search will return cached content by default. To prevent caching set the Cache-Control header to <code>no-cache</code>. This is currently done as best effort. */
  "cache-control"?: string;
  /** The user agent originating the request. Brave search can utilize the user agent to provide a different experience depending on the device as described by the string. The user agent should follow the commonly used browser agent strings on each platform. For more information on cur */
  "user-agent"?: string;
};

export interface BraveLocalPoisInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  query: BraveLocalPoisQuery;
  headers?: BraveLocalPoisHeaders & Readonly<Record<string, string>>;
}

export type BraveLocalPoisResponse = BraveSchemaLocalPoiSearchApiResponse;

export type BravePoiDescriptionsQuery = {
  /** A list of unique identifiers for the location. The ids are valid only for 8 hours. (maxItems 20) */
  "ids": Array<string>;
};

export type BravePoiDescriptionsHeaders = {
  /** The API version to use. This is denoted by the format <code>YYYY-MM-DD</code>. Default is the latest that is available. Read more about <a href="/documentation/guides/versioning">API versioning</a>. */
  "api-version"?: string;
  /** The default supported media type is application/json. */
  "accept"?: string;
  /** Brave Search will return cached content by default. To prevent caching set the Cache-Control header to <code>no-cache</code>. This is currently done as best effort. */
  "cache-control"?: string;
  /** The user agent originating the request. Brave search can utilize the user agent to provide a different experience depending on the device as described by the string. The user agent should follow the commonly used browser agent strings on each platform. For more information on cur */
  "user-agent"?: string;
};

export interface BravePoiDescriptionsInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  query: BravePoiDescriptionsQuery;
  headers?: BravePoiDescriptionsHeaders & Readonly<Record<string, string>>;
}

export type BravePoiDescriptionsResponse = BraveSchemaLocalDescriptionsSearchApiResponse;

export type BraveRichQuery = {
  /** The callback key to use for the rich header */
  "callback_key": string;
};

export type BraveRichHeaders = {
  /** The API version to use. This is denoted by the format <code>YYYY-MM-DD</code>. Default is the latest that is available. Read more about <a href="/documentation/guides/versioning">API versioning</a>. */
  "api-version"?: string;
  /** The default supported media type is application/json. */
  "accept"?: string;
  /** Brave Search will return cached content by default. To prevent caching set the Cache-Control header to <code>no-cache</code>. This is currently done as best effort. */
  "cache-control"?: string;
  /** The user agent originating the request. Brave search can utilize the user agent to provide a different experience depending on the device as described by the string. The user agent should follow the commonly used browser agent strings on each platform. For more information on cur */
  "user-agent"?: string;
};

export interface BraveRichInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  query: BraveRichQuery;
  headers?: BraveRichHeaders & Readonly<Record<string, string>>;
}

export type BraveRichResponse = BraveSchemaRichHeaderResponse;

export type BraveNewsQuery = {
  /** The user’s search query term. Query can not be empty. Maximum of 400 characters and 50 words in the query. (minLength 1, maxLength 400) */
  "q": string;
  /** The search language preference. The 2 or more character language code for which the search results are provided. */
  "search_lang"?: BraveSchemaLanguageInput;
  /** User interface language preferred in response. Usually of the format <code>&lt;language_code&gt;-&lt;country_code&gt;</code>. For more, see <a href="https://www.rfc-editor.org/rfc/rfc9110.html#name-accept-language">RFC 9110</a>. */
  "ui_lang"?: BraveSchemaMarketCodes;
  /** The search query country, where the results come from. The country string is limited to 2 character country codes of supported countries or <code>ALL</code> for worldwide. */
  "country"?: BraveSchemaSearchCountry;
  /** <p>Filters search results for adult content. The following values are supported:</p> <ul> <li><strong>off</strong> - No filtering is done.</li> <li><strong>moderate</strong> - Filter out explicit content.</li> <li><strong>strict</strong> - Filter out explicit and suggestive conte */
  "safesearch"?: BraveSchemaAppModelsGeneralSafeSearch;
  /** The number of search results returned in response. The maximum is 50. The actual number delivered may be less than requested. Combine this parameter with offset to paginate search results. (min 1, max 50) */
  "count"?: number;
  /** The zero based offset that indicates number of search results per page (count) to skip before returning the result. The maximum is 9. The actual number delivered may be less than requested based on the query. In order to paginate results use this parameter together with count. Fo (min 0, max 9) */
  "offset"?: number;
  /** Whether to spell check the provided query. If the spellchecker is enabled, the modified query is always used for search. The modified query can be found in altered key from the query response model. */
  "spellcheck"?: boolean;
  /** <p>Filters search results by page age. The age of a page is determined by the most relevant date reported by the content, such as its published or last modified date. The following values are supported:</p> <ul> <li><strong>pd</strong> - Pages aged 24 hours or less.</li> <li><str */
  "freshness"?: string;
  /** A snippet is an excerpt from a page you get as a result of the query, and extra_snippets allow you to get up to 5 additional, alternative excerpts. */
  "extra_snippets"?: ((boolean) | (null));
  /** Goggles act as a custom re-ranking on top of Brave’s search index. The parameter supports both a url where the Goggle is hosted or the definition of the Goggle. For more details, see the <a href="/documentation/resources/goggles">Goggles documentation</a>. The parameter can be a  */
  "goggles"?: ((string) | (Array<string>) | (null));
  /** Include fetch metadata. */
  "include_fetch_metadata"?: boolean;
  /** Whether to apply search operators. */
  "operators"?: boolean;
};

export type BraveNewsHeaders = {
  /** The API version to use. This is denoted by the format <code>YYYY-MM-DD</code>. Default is the latest that is available. Read more about <a href="/documentation/guides/versioning">API versioning</a>. */
  "api-version"?: string;
  /** The default supported media type is application/json. */
  "accept"?: string;
  /** Brave Search will return cached content by default. To prevent caching set the Cache-Control header to <code>no-cache</code>. This is currently done as best effort. */
  "cache-control"?: string;
  /** The user agent originating the request. Brave search can utilize the user agent to provide a different experience depending on the device as described by the string. The user agent should follow the commonly used browser agent strings on each platform. For more information on cur */
  "user-agent"?: string;
};

export interface BraveNewsInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  query: BraveNewsQuery;
  headers?: BraveNewsHeaders & Readonly<Record<string, string>>;
}

export type BraveNewsResponse = BraveSchemaNewsSearchApiResponse;

export type BraveNewsPostHeaders = {
  /** The API version to use. This is denoted by the format <code>YYYY-MM-DD</code>. Default is the latest that is available. Read more about <a href="/documentation/guides/versioning">API versioning</a>. */
  "api-version"?: string;
  /** The default supported media type is application/json. */
  "accept"?: string;
  /** Brave Search will return cached content by default. To prevent caching set the Cache-Control header to <code>no-cache</code>. This is currently done as best effort. */
  "cache-control"?: string;
  /** The user agent originating the request. Brave search can utilize the user agent to provide a different experience depending on the device as described by the string. The user agent should follow the commonly used browser agent strings on each platform. For more information on cur */
  "user-agent"?: string;
};

export type BraveNewsPostBody = BraveSchemaNewsSearchParameters;

export interface BraveNewsPostInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  headers?: BraveNewsPostHeaders & Readonly<Record<string, string>>;
  body: BraveNewsPostBody;
}

export type BraveNewsPostResponse = BraveSchemaNewsSearchApiResponse;

export type BraveVideosQuery = {
  /** The user’s search query term. Query can not be empty. Maximum of 400 characters and 50 words in the query. (minLength 1, maxLength 400) */
  "q": string;
  /** The search language preference. The 2 or more character language code for which the search results are provided. */
  "search_lang"?: BraveSchemaLanguageInput;
  /** User interface language preferred in response. Usually of the format <code>&lt;language_code&gt;-&lt;country_code&gt;</code>. For more, see <a href="https://www.rfc-editor.org/rfc/rfc9110.html#name-accept-language">RFC 9110</a>. */
  "ui_lang"?: BraveSchemaMarketCodes;
  /** The search query country, where the results come from. The country string is limited to 2 character country codes of supported countries or <code>ALL</code> for worldwide. */
  "country"?: BraveSchemaSearchCountry;
  /** <p>Filters search results for adult content. The following values are supported:</p> <ul> <li><strong>off</strong> - No filtering is done.</li> <li><strong>moderate</strong> - Filters explicit content, like images and videos, but allows adult domains in the search results.</li> < */
  "safesearch"?: BraveSchemaAppModelsGeneralSafeSearch;
  /** The number of search results returned in response. The maximum is 50. The actual number delivered may be less than requested. Combine this parameter with offset to paginate search results. (min 1, max 50) */
  "count"?: number;
  /** The zero based offset that indicates number of search results per page (count) to skip before returning the result. The maximum is 9. The actual number delivered may be less than requested based on the query. In order to paginate results use this parameter together with count. Fo (min 0, max 9) */
  "offset"?: number;
  /** Whether to spell check the provided query. If the spellchecker is enabled, the modified query is always used for search. The modified query can be found in altered key from the query response model. */
  "spellcheck"?: boolean;
  /** <p>Filters search results by page age. The age of a page is determined by the most relevant date reported by the content, such as its published or last modified date. The following values are supported:</p> <ul> <li><strong>pd</strong> - Pages aged 24 hours or less.</li> <li><str */
  "freshness"?: string;
  /** Include fetch metadata. */
  "include_fetch_metadata"?: boolean;
  /** Whether to apply search operators. */
  "operators"?: boolean;
};

export type BraveVideosHeaders = {
  /** The API version to use. This is denoted by the format <code>YYYY-MM-DD</code>. Default is the latest that is available. Read more about <a href="/documentation/guides/versioning">API versioning</a>. */
  "api-version"?: string;
  /** The default supported media type is application/json. */
  "accept"?: string;
  /** Brave Search will return cached content by default. To prevent caching set the Cache-Control header to <code>no-cache</code>. This is currently done as best effort. */
  "cache-control"?: string;
  /** The user agent originating the request. Brave search can utilize the user agent to provide a different experience depending on the device as described by the string. The user agent should follow the commonly used browser agent strings on each platform. For more information on cur */
  "user-agent"?: string;
};

export interface BraveVideosInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  query: BraveVideosQuery;
  headers?: BraveVideosHeaders & Readonly<Record<string, string>>;
}

export type BraveVideosResponse = BraveSchemaVideoSearchApiResponse;

export type BraveVideosPostHeaders = {
  /** The API version to use. This is denoted by the format <code>YYYY-MM-DD</code>. Default is the latest that is available. Read more about <a href="/documentation/guides/versioning">API versioning</a>. */
  "api-version"?: string;
  /** The default supported media type is application/json. */
  "accept"?: string;
  /** Brave Search will return cached content by default. To prevent caching set the Cache-Control header to <code>no-cache</code>. This is currently done as best effort. */
  "cache-control"?: string;
  /** The user agent originating the request. Brave search can utilize the user agent to provide a different experience depending on the device as described by the string. The user agent should follow the commonly used browser agent strings on each platform. For more information on cur */
  "user-agent"?: string;
};

export type BraveVideosPostBody = BraveSchemaVideoSearchParameters;

export interface BraveVideosPostInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  headers?: BraveVideosPostHeaders & Readonly<Record<string, string>>;
  body: BraveVideosPostBody;
}

export type BraveVideosPostResponse = BraveSchemaVideoSearchApiResponse;

export type BraveImagesQuery = {
  /** The user’s search query term. Query can not be empty. Maximum of 400 characters and 50 words in the query. (minLength 1, maxLength 400) */
  "q": string;
  /** The search language preference. The 2 or more character language code for which the search results are provided. */
  "search_lang"?: BraveSchemaLanguageInput;
  /** The search query country, where the results come from. The country string is limited to 2 character country codes of supported countries and <code>ALL</code> for worldwide. */
  "country"?: BraveSchemaSearchCountry;
  /** <p>Filters search results for adult content. The following values are supported:</p> <ul> <li><strong>off</strong> - No content filtering (except for illegal content).</li> <li><strong>strict</strong> - Drops all adult content from search results.</li> </ul> */
  "safesearch"?: BraveSchemaAppModelsProductsSearchV1ImagesSafeSearch;
  /** <p>The number of search results returned in response. The maximum is 200. The actual number delivered may be less than requested.</p> <p><strong>NOTE:</strong> Image search is not paginated and has no <code>offset</code> parameter. Raise <code>count</code> to get more results.</p (min 1, max 200) */
  "count"?: number;
  /** Whether to spell check provided query. If the spell checker is enabled, the modified query is always used for search. The modified query can be found in altered key from the query response model. */
  "spellcheck"?: boolean;
};

export type BraveImagesHeaders = {
  /** The API version to use. This is denoted by the format <code>YYYY-MM-DD</code>. Default is the latest that is available. Read more about <a href="/documentation/guides/versioning">API versioning</a>. */
  "api-version"?: string;
  /** The default supported media type is application/json. */
  "accept"?: string;
  /** Brave Search will return cached content by default. To prevent caching set the Cache-Control header to <code>no-cache</code>. This is currently done as best effort. */
  "cache-control"?: string;
  /** The user agent originating the request. Brave search can utilize the user agent to provide a different experience depending on the device as described by the string. The user agent should follow the commonly used browser agent strings on each platform. For more information on cur */
  "user-agent"?: string;
};

export interface BraveImagesInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  query: BraveImagesQuery;
  headers?: BraveImagesHeaders & Readonly<Record<string, string>>;
}

export type BraveImagesResponse = BraveSchemaImageSearchApiResponse;

export type BravePlacesQuery = {
  /** Search radius bias around the given coordinates, in meters. <strong>NOTE</strong>: This is not strictly the radius of the search (nor the resulting radius of the results), but rather a bias towards results that are closer to the given coordinates. Search is performed globally if  */
  "radius"?: ((number) | (null));
  /** Number of results to return. The maximum is 100. (min 1, max 100) */
  "count"?: number;
  /** Two-letter country code (ISO 3166-1 alpha-2) to scope the search. */
  "country"?: BraveSchemaSearchCountry;
  /** Language for the search results. */
  "search_lang"?: BraveSchemaLanguageInput;
  /** User interface language for the response. Usually <code>&lt;language&gt;-&lt;region&gt;</code>. */
  "ui_lang"?: BraveSchemaMarketCodes;
  /** Units of measurement for distance values: <code>metric</code> is kilometres, <code>imperial</code> is miles. */
  "units"?: BraveSchemaMeasurementUnit;
  /** Safe search level for the query results. */
  "safesearch"?: BraveSchemaAppModelsGeneralSafeSearch;
  /** Whether to apply spellcheck before executing the search. */
  "spellcheck"?: boolean;
  /** Optional geolocation of the user in the format <code>&lt;latitude&gt;x&lt;longitude&gt;</code>. Used to calculate distance values in results. */
  "geoloc"?: ((string) | (null));
  /** Query string to search for points of interest in an area. If no <code>q</code> is provided, the endpoint will return general points of interest in the given area. */
  "q"?: string;
  /** Latitude of the geographical coordinates. */
  "latitude"?: ((number) | (null));
  /** Longitude of the geographical coordinates. */
  "longitude"?: ((number) | (null));
  /** <p>Location string to search for points of interest in an area. This is alternative to the <code>latitude</code> and <code>longitude</code> parameters.</p> <ul> <li>For locations in US prefer the form <code>&lt;city&gt; &lt;state&gt; &lt;country name&gt;</code>, ie. <code>san fra */
  "location"?: ((string) | (null));
};

export type BravePlacesHeaders = {
  /** The API version to use. This is denoted by the format <code>YYYY-MM-DD</code>. Default is the latest that is available. Read more about <a href="/documentation/guides/versioning">API versioning</a>. */
  "api-version"?: string;
  /** The default supported media type is application/json. */
  "accept"?: string;
  /** Brave Search will return cached content by default. To prevent caching set the Cache-Control header to <code>no-cache</code>. This is currently done as best effort. */
  "cache-control"?: string;
  /** The user agent originating the request. Brave search can utilize the user agent to provide a different experience depending on the device as described by the string. The user agent should follow the commonly used browser agent strings on each platform. For more information on cur */
  "user-agent"?: string;
};

export interface BravePlacesInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  query?: BravePlacesQuery;
  headers?: BravePlacesHeaders & Readonly<Record<string, string>>;
}

export type BravePlacesResponse = BraveSchemaLocalPlaceSearchApiResponse;

export type BraveSuggestQuery = {
  /** The user’s suggest search query term. Query can not be empty. The max query length is 400 characters, and the word limit is 50 words. (minLength 1, maxLength 400) */
  "q": string;
  /** The suggest search language preference, where potentially the results could come from. The 2 or more character language code for which the suggest search results are provided. This is a just a hint for calculating suggest responses. */
  "lang"?: BraveSchemaLanguageInput;
  /** The suggest search query country, where potentially the results could come from. The country string is limited to 2 character country codes of supported countries. This is a just a hint for calculating suggest responses. */
  "country"?: BraveSchemaSearchCountry;
  /** The number of suggestion search results returned in response. The actual number of results delivered may be less than requested. Minimum is 1, maximum is 20. The default is 5. (min 1, max 20) */
  "count"?: number;
  /** Whether to enhance suggestions with rich results. This requires a paid autosuggest subscription. */
  "rich"?: boolean;
};

export type BraveSuggestHeaders = {
  /** The API version to use. This is denoted by the format <code>YYYY-MM-DD</code>. Default is the latest that is available. Read more about <a href="/documentation/guides/versioning">API versioning</a>. */
  "api-version"?: string;
  /** The default supported media type is application/json. */
  "accept"?: string;
  /** Brave Search will return cached content by default. To prevent caching set the Cache-Control header to <code>no-cache</code>. This is currently done as best effort. */
  "cache-control"?: string;
  /** The user agent originating the request. Brave search can utilize the user agent to provide a different experience depending on the device as described by the string. The user agent should follow the commonly used browser agent strings on each platform. For more information on cur */
  "user-agent"?: string;
};

export interface BraveSuggestInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  query: BraveSuggestQuery;
  headers?: BraveSuggestHeaders & Readonly<Record<string, string>>;
}

export type BraveSuggestResponse = BraveSchemaSuggestSearchApiResponse;

export type BraveSpellcheckQuery = {
  /** The phrase to be spell checked. Query can not be empty. Maximum of 400 characters and 50 words in the query. (minLength 1, maxLength 400) */
  "q": string;
  /** The spell check language preference, where potentially the results could come from. The 2 or more character language code for which the spell check search results are provided. This is a just a hint for calculating spell check responses. */
  "lang"?: BraveSchemaLanguageInput;
  /** The spell check country, where potentially the results could come from. The country string is limited to 2 character country codes of supported countries. This is a just a hint for calculating spellcheck responses. */
  "country"?: BraveSchemaSearchCountry;
};

export type BraveSpellcheckHeaders = {
  /** The API version to use. This is denoted by the format <code>YYYY-MM-DD</code>. Default is the latest that is available. Read more about <a href="/documentation/guides/versioning">API versioning</a>. */
  "api-version"?: string;
  /** The default supported media type is application/json. */
  "accept"?: string;
  /** Brave Search will return cached content by default. To prevent caching set the Cache-Control header to <code>no-cache</code>. This is currently done as best effort. */
  "cache-control"?: string;
  /** The user agent originating the request. Brave search can utilize the user agent to provide a different experience depending on the device as described by the string. The user agent should follow the commonly used browser agent strings on each platform. For more information on cur */
  "user-agent"?: string;
};

export interface BraveSpellcheckInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  query: BraveSpellcheckQuery;
  headers?: BraveSpellcheckHeaders & Readonly<Record<string, string>>;
}

export type BraveSpellcheckResponse = BraveSchemaSpellCheckSearchApiResponse;

function credential(value: string): string {
  if (typeof value !== "string" || !value.trim() || /[\u0000-\u0020\u007f]/u.test(value)) throw new SearchError("configuration");
  return value;
}

// OpenAPI form arrays are repeated; explicit explode:false uses commas.
// Deep object query values use bracket notation, matching the provider reference.
function wireQuery(query: object | undefined, comma: readonly string[] = []): NativeRequestInput["query"] {
  if (query === undefined) return undefined;
  const result: Record<string, string | number | boolean | readonly (string | number | boolean)[] | null | undefined> = {};
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) result[key] = comma.includes(key) ? value.join(",") : value;
    else if (typeof value === "object") {
      for (const [child, entry] of Object.entries(value)) {
        if (entry !== null && entry !== undefined) result[`${key}[${child}]`] = entry as string | number | boolean;
      }
    } else result[key] = value;
  }
  return result;
}

export const braveOperations = Object.freeze({
  llmContext: Object.freeze({"id": "llmContext", "method": "GET", "path": "/v1/llm/context", "retryable": true}),
  llmContextPost: Object.freeze({"id": "llmContextPost", "method": "POST", "path": "/v1/llm/context", "retryable": false}),
  answers: Object.freeze({"id": "answers", "method": "POST", "path": "/v1/chat/completions", "retryable": false}),
  answersStream: Object.freeze({"id": "answersStream", "method": "POST", "path": "/v1/chat/completions", "retryable": false, "response": "sse", "headers": Object.freeze({"Accept": "text/event-stream"}) }),
  search: Object.freeze({"id": "search", "method": "GET", "path": "/v1/web/search", "retryable": true}),
  searchPost: Object.freeze({"id": "searchPost", "method": "POST", "path": "/v1/web/search", "retryable": false}),
  localPois: Object.freeze({"id": "localPois", "method": "GET", "path": "/v1/local/pois", "retryable": true}),
  poiDescriptions: Object.freeze({"id": "poiDescriptions", "method": "GET", "path": "/v1/local/descriptions", "retryable": true}),
  rich: Object.freeze({"id": "rich", "method": "GET", "path": "/v1/web/rich", "retryable": true}),
  news: Object.freeze({"id": "news", "method": "GET", "path": "/v1/news/search", "retryable": true}),
  newsPost: Object.freeze({"id": "newsPost", "method": "POST", "path": "/v1/news/search", "retryable": false}),
  videos: Object.freeze({"id": "videos", "method": "GET", "path": "/v1/videos/search", "retryable": true}),
  videosPost: Object.freeze({"id": "videosPost", "method": "POST", "path": "/v1/videos/search", "retryable": false}),
  images: Object.freeze({"id": "images", "method": "GET", "path": "/v1/images/search", "retryable": true}),
  places: Object.freeze({"id": "places", "method": "GET", "path": "/v1/local/place_search", "retryable": true}),
  suggest: Object.freeze({"id": "suggest", "method": "GET", "path": "/v1/suggest/search", "retryable": true}),
  spellcheck: Object.freeze({"id": "spellcheck", "method": "GET", "path": "/v1/spellcheck/search", "retryable": true}),
} satisfies Readonly<Record<string, NativeOperation>>);

/** Explicit native calls; no auto-pagination, polling, or stream reconnection. */
export function createBraveClient(options: BraveClientOptions) {
  const { apiKey, ...config } = options;
  const key = credential(apiKey);
  const transport0 = createNativeTransport({ ...config, provider: "brave", baseUrl: "https://api.search.brave.com/res", headers: { "X-Subscription-Token": key } });
  return Object.freeze({
    operations: braveOperations,
    /** GET https://api.search.brave.com/res/v1/llm/context — LLM Context — Web search API for AI agents. */
    async llmContext(input: BraveLlmContextInput): Promise<NativeResponse<BraveLlmContextResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.query === undefined) throw new SearchError("invalid_request");
      if (input.query !== undefined && (!input.query || typeof input.query !== "object" || Array.isArray(input.query))) throw new SearchError("invalid_request");
      return transport0.request<BraveLlmContextResponse>(braveOperations.llmContext, { ...input, query: wireQuery(input.query, []) ?? {} });
    },
    /** POST https://api.search.brave.com/res/v1/llm/context — LLM Context — Web search API for AI agents. */
    async llmContextPost(input: BraveLlmContextPostInput): Promise<NativeResponse<BraveLlmContextPostResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      if (input.body !== undefined && (!input.body || typeof input.body !== "object" || Array.isArray(input.body))) throw new SearchError("invalid_request");
      return transport0.request<BraveLlmContextPostResponse>(braveOperations.llmContextPost, { ...input });
    },
    /** POST https://api.search.brave.com/res/v1/chat/completions — Answers. */
    async answers(input: BraveAnswersInput): Promise<NativeResponse<BraveAnswersResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      if (input.body !== undefined && (!input.body || typeof input.body !== "object" || Array.isArray(input.body))) throw new SearchError("invalid_request");
      if (input.body?.stream !== undefined && input.body.stream !== false) throw new SearchError("unsupported_option");
      return transport0.request<BraveAnswersResponse>(braveOperations.answers, { ...input, body: { ...input.body, stream: false } });
    },
    /** POST https://api.search.brave.com/res/v1/chat/completions — Answers. */
    async answersStream(input: BraveAnswersStreamInput): Promise<NativeResponse<AsyncIterable<NativeSSEEvent>>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      if (input.body !== undefined && (!input.body || typeof input.body !== "object" || Array.isArray(input.body))) throw new SearchError("invalid_request");
      if (input.body?.stream !== undefined && input.body.stream !== true) throw new SearchError("unsupported_option");
      return transport0.request(braveOperations.answersStream, { ...input, body: { ...input.body, stream: true }, headers: { ...input.headers, Accept: "text/event-stream" } });
    },
    /** GET https://api.search.brave.com/res/v1/web/search — Search. */
    async search(input: BraveSearchInput): Promise<NativeResponse<BraveSearchResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.query === undefined) throw new SearchError("invalid_request");
      if (input.query !== undefined && (!input.query || typeof input.query !== "object" || Array.isArray(input.query))) throw new SearchError("invalid_request");
      return transport0.request<BraveSearchResponse>(braveOperations.search, { ...input, query: wireQuery(input.query, ["result_filter"]) ?? {} });
    },
    /** POST https://api.search.brave.com/res/v1/web/search — Search. */
    async searchPost(input: BraveSearchPostInput): Promise<NativeResponse<BraveSearchPostResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      if (input.body !== undefined && (!input.body || typeof input.body !== "object" || Array.isArray(input.body))) throw new SearchError("invalid_request");
      return transport0.request<BraveSearchPostResponse>(braveOperations.searchPost, { ...input });
    },
    /** GET https://api.search.brave.com/res/v1/local/pois — Local POIs. */
    async localPois(input: BraveLocalPoisInput): Promise<NativeResponse<BraveLocalPoisResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.query === undefined) throw new SearchError("invalid_request");
      if (input.query !== undefined && (!input.query || typeof input.query !== "object" || Array.isArray(input.query))) throw new SearchError("invalid_request");
      return transport0.request<BraveLocalPoisResponse>(braveOperations.localPois, { ...input, query: wireQuery(input.query, []) ?? {} });
    },
    /** GET https://api.search.brave.com/res/v1/local/descriptions — POI descriptions. */
    async poiDescriptions(input: BravePoiDescriptionsInput): Promise<NativeResponse<BravePoiDescriptionsResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.query === undefined) throw new SearchError("invalid_request");
      if (input.query !== undefined && (!input.query || typeof input.query !== "object" || Array.isArray(input.query))) throw new SearchError("invalid_request");
      return transport0.request<BravePoiDescriptionsResponse>(braveOperations.poiDescriptions, { ...input, query: wireQuery(input.query, []) ?? {} });
    },
    /** GET https://api.search.brave.com/res/v1/web/rich — Rich search. */
    async rich(input: BraveRichInput): Promise<NativeResponse<BraveRichResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.query === undefined) throw new SearchError("invalid_request");
      if (input.query !== undefined && (!input.query || typeof input.query !== "object" || Array.isArray(input.query))) throw new SearchError("invalid_request");
      return transport0.request<BraveRichResponse>(braveOperations.rich, { ...input, query: wireQuery(input.query, []) ?? {} });
    },
    /** GET https://api.search.brave.com/res/v1/news/search — News search. */
    async news(input: BraveNewsInput): Promise<NativeResponse<BraveNewsResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.query === undefined) throw new SearchError("invalid_request");
      if (input.query !== undefined && (!input.query || typeof input.query !== "object" || Array.isArray(input.query))) throw new SearchError("invalid_request");
      return transport0.request<BraveNewsResponse>(braveOperations.news, { ...input, query: wireQuery(input.query, []) ?? {} });
    },
    /** POST https://api.search.brave.com/res/v1/news/search — News search. */
    async newsPost(input: BraveNewsPostInput): Promise<NativeResponse<BraveNewsPostResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      if (input.body !== undefined && (!input.body || typeof input.body !== "object" || Array.isArray(input.body))) throw new SearchError("invalid_request");
      return transport0.request<BraveNewsPostResponse>(braveOperations.newsPost, { ...input });
    },
    /** GET https://api.search.brave.com/res/v1/videos/search — Video search. */
    async videos(input: BraveVideosInput): Promise<NativeResponse<BraveVideosResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.query === undefined) throw new SearchError("invalid_request");
      if (input.query !== undefined && (!input.query || typeof input.query !== "object" || Array.isArray(input.query))) throw new SearchError("invalid_request");
      return transport0.request<BraveVideosResponse>(braveOperations.videos, { ...input, query: wireQuery(input.query, []) ?? {} });
    },
    /** POST https://api.search.brave.com/res/v1/videos/search — Video search. */
    async videosPost(input: BraveVideosPostInput): Promise<NativeResponse<BraveVideosPostResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      if (input.body !== undefined && (!input.body || typeof input.body !== "object" || Array.isArray(input.body))) throw new SearchError("invalid_request");
      return transport0.request<BraveVideosPostResponse>(braveOperations.videosPost, { ...input });
    },
    /** GET https://api.search.brave.com/res/v1/images/search — Image search. */
    async images(input: BraveImagesInput): Promise<NativeResponse<BraveImagesResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.query === undefined) throw new SearchError("invalid_request");
      if (input.query !== undefined && (!input.query || typeof input.query !== "object" || Array.isArray(input.query))) throw new SearchError("invalid_request");
      return transport0.request<BraveImagesResponse>(braveOperations.images, { ...input, query: wireQuery(input.query, []) ?? {} });
    },
    /** GET https://api.search.brave.com/res/v1/local/place_search — Place search. */
    async places(input: BravePlacesInput = {}): Promise<NativeResponse<BravePlacesResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.query !== undefined && (!input.query || typeof input.query !== "object" || Array.isArray(input.query))) throw new SearchError("invalid_request");
      return transport0.request<BravePlacesResponse>(braveOperations.places, { ...input, query: wireQuery(input.query, []) ?? {} });
    },
    /** GET https://api.search.brave.com/res/v1/suggest/search — Suggestions. */
    async suggest(input: BraveSuggestInput): Promise<NativeResponse<BraveSuggestResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.query === undefined) throw new SearchError("invalid_request");
      if (input.query !== undefined && (!input.query || typeof input.query !== "object" || Array.isArray(input.query))) throw new SearchError("invalid_request");
      return transport0.request<BraveSuggestResponse>(braveOperations.suggest, { ...input, query: wireQuery(input.query, []) ?? {} });
    },
    /** GET https://api.search.brave.com/res/v1/spellcheck/search — Spell check. */
    async spellcheck(input: BraveSpellcheckInput): Promise<NativeResponse<BraveSpellcheckResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.query === undefined) throw new SearchError("invalid_request");
      if (input.query !== undefined && (!input.query || typeof input.query !== "object" || Array.isArray(input.query))) throw new SearchError("invalid_request");
      return transport0.request<BraveSpellcheckResponse>(braveOperations.spellcheck, { ...input, query: wireQuery(input.query, []) ?? {} });
    },
  });
}

export type BraveClient = ReturnType<typeof createBraveClient>;
