// Native wire types and operations derived from official provider documentation.
// Sources, access gates, and verification limits: docs/provider-surfaces-a.md.
// Static wire types are not JSON Schema validation: ranges, patterns, and if/then
// constraints remain provider responsibilities; unconstrained source data stays unknown.
import { createNativeTransport } from "./native-transport.js";
import type { NativeOperation, NativeRequestInput, NativeResponse, NativeSSEEvent, NativeTransportConfig } from "./native-transport.js";
import { SearchError } from "./errors.js";

export interface TavilyClientOptions extends Omit<NativeTransportConfig, "provider" | "baseUrl" | "headers"> {
  /** Server-side credential. Never embed it in browser bundles. */
  apiKey?: string;
  /** Explicit free keyless access supports Search and Extract only. Keyed access is the default. */
  accessMode?: "keyed" | "keyless";
}

export type TavilySchemaUsageByType = {
  "search"?: TavilySchemaUsageMetrics;
  "crawl"?: TavilySchemaUsageMetrics;
  "extract"?: TavilySchemaUsageMetrics;
  "map"?: TavilySchemaUsageMetrics;
  "research"?: TavilySchemaUsageMetrics;
};

export type TavilySchemaResearchTaskCompleted = {
  /** The unique identifier of the research task. */
  "request_id": string;
  /** Timestamp when the research task was created. */
  "created_at": string;
  /** The current status of the research task. */
  "status": "completed";
  /** The research report content. Can be a string or a structured object if output_schema was provided. */
  "content": ((string) | ({ [key: string]: unknown }));
  /** List of sources used in the research. */
  "sources": Array<{
    /** Title or name of the source. */
    "title"?: string;
    /** URL of the source. (format uri) */
    "url"?: string;
    /** URL to the source's favicon. (format uri) */
    "favicon"?: string;
  }>;
  /** Time in seconds it took to complete the request. */
  "response_time": number;
  /** Credit usage details for the request. */
  "usage"?: { [key: string]: unknown };
};

export type TavilySchemaResearchTaskFailed = {
  /** The unique identifier of the research task. */
  "request_id": string;
  /** The current status of the research task. */
  "status": "failed";
  /** Time in seconds it took to complete the request. */
  "response_time": number;
  /** Credit usage details for the request. */
  "usage"?: { [key: string]: unknown };
};

export type TavilySchemaUsageMetrics = {
  /** Credits consumed */
  "usage"?: number;
  /** Pay-as-you-go cost in USD (overage credits billed at the account's per-credit rate) */
  "paygo_cost_usd"?: number;
  /** Number of requests */
  "request_count"?: number;
};

export type TavilyCrawlBody = {
  /** The root URL to begin the crawl. */
  "url": string;
  /** Natural language instructions for the crawler. When specified, the mapping cost increases to 2 API credits per 10 successful pages instead of 1 API credit per 10 pages. */
  "instructions"?: string;
  /** Chunks are short content snippets (about 800 characters each) pulled directly from the source. Use `chunks_per_source` to define the maximum number of relevant chunks returned per source and to control the `raw_content` length. Chunks will appear in the `raw_content` field as: `< (min 1, max 5) */
  "chunks_per_source"?: number;
  /** Max depth of the crawl. Defines how far from the base URL the crawler can explore. (min 1, max 5) */
  "max_depth"?: number;
  /** Max number of links to follow per level of the tree (i.e., per page). (min 1, max 500) */
  "max_breadth"?: number;
  /** Total number of links the crawler will process before stopping. (min 1) */
  "limit"?: number;
  /** Regex patterns to select only URLs with specific path patterns (e.g., `/docs/.*`, `/api/v1.*`). */
  "select_paths"?: Array<string>;
  /** Regex patterns to select crawling to specific domains or subdomains (e.g., `^docs\.example\.com$`). */
  "select_domains"?: Array<string>;
  /** Regex patterns to exclude URLs with specific path patterns (e.g., `/private/.*`, `/admin/.*`). */
  "exclude_paths"?: Array<string>;
  /** Regex patterns to exclude specific domains or subdomains from crawling (e.g., `^private\.example\.com$`). */
  "exclude_domains"?: Array<string>;
  /** Whether to include external domain links in the final results list. */
  "allow_external"?: boolean;
  /** Whether to include images in the crawl results. */
  "include_images"?: boolean;
  /** Advanced extraction retrieves more data, including tables and embedded content, with higher success but may increase latency. `basic` extraction costs 1 credit per 5 successful extractions, while `advanced` extraction costs 2 credits per 5 successful extractions. */
  "extract_depth"?: "basic" | "advanced";
  /** The format of the extracted web page content. `markdown` returns content in markdown format. `text` returns plain text and may increase latency. */
  "format"?: "markdown" | "text";
  /** Whether to include the favicon URL for each result. */
  "include_favicon"?: boolean;
  /** Maximum time in seconds to wait for the crawl operation before timing out. Must be between 10 and 150 seconds. (min 10, max 150, format float) */
  "timeout"?: number;
  /** Whether to include credit usage information in the response. `NOTE:`The value may be 0 if the total use of /extract and /map have not yet reached minimum requirements. See our [Credits & Pricing documentation](https://docs.tavily.com/documentation/api-credits) for details. */
  "include_usage"?: boolean;
};

export interface TavilyCrawlInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  headers?: Readonly<Record<string, string>>;
  body: TavilyCrawlBody;
}

export type TavilyCrawlResponse = {
  /** The base URL that was crawled. */
  "base_url"?: string;
  /** A list of extracted content from the crawled URLs. */
  "results"?: Array<{
    /** The URL that was crawled. */
    "url"?: string;
    /** The full content extracted from the page. When `query` is provided, contains the top-ranked chunks joined by `[...]` separator. */
    "raw_content"?: string;
    /** The favicon URL for the result. */
    "favicon"?: string;
  }>;
  /** Time in seconds it took to complete the request. (format float) */
  "response_time"?: number;
  /** Credit usage details for the request. */
  "usage"?: { [key: string]: unknown };
  /** A unique request identifier you can share with customer support to help resolve issues with specific requests. */
  "request_id"?: string;
};

export type TavilyDeactivateKeysBody = {
  /** The request ID from a previous `/generate-keys` call. All keys from that request will be deactivated. */
  "request_id"?: string;
};

export interface TavilyDeactivateKeysInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  headers?: Readonly<Record<string, string>>;
  body?: TavilyDeactivateKeysBody;
}

export type TavilyDeactivateKeysResponse = {
  /** A confirmation message. */
  "message"?: string;
};

export type TavilyExtractBody = {
  "urls": ((string) | (Array<string>));
  /** User intent for reranking extracted content chunks. When provided, chunks are reranked based on relevance to this query. */
  "query"?: string;
  /** Chunks are short content snippets (about 800 characters each) pulled directly from the source. Use `chunks_per_source` to define the maximum number of relevant chunks returned per source and to control the `raw_content` length. Chunks will appear in the `raw_content` field as: `< (min 1, max 5) */
  "chunks_per_source"?: number;
  /** The depth of the extraction process. `advanced` extraction retrieves more data, including tables and embedded content, with higher success but may increase latency.`basic` extraction costs 1 credit per 5 successful URL extractions, while `advanced` extraction costs 2 credits per  */
  "extract_depth"?: "basic" | "advanced";
  /** Include a list of images extracted from the URLs in the response. Default is false. */
  "include_images"?: boolean;
  /** Whether to include the favicon URL for each result. */
  "include_favicon"?: boolean;
  /** The format of the extracted web page content. `markdown` returns content in markdown format. `text` returns plain text and may increase latency. */
  "format"?: "markdown" | "text";
  /** Maximum time in seconds to wait for the URL extraction before timing out. Must be between 1.0 and 60.0 seconds. If not specified, default timeouts are applied based on extract_depth: 10 seconds for basic extraction and 30 seconds for advanced extraction. (min 1, max 60, format float) */
  "timeout"?: number;
  /** Whether to include credit usage information in the response. `NOTE:`The value may be 0 if the total successful URL extractions has not yet reached 5 calls. See our [Credits & Pricing documentation](https://docs.tavily.com/documentation/api-credits) for details. */
  "include_usage"?: boolean;
};

export interface TavilyExtractInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  headers?: Readonly<Record<string, string>>;
  body: TavilyExtractBody;
}

export type TavilyExtractResponse = {
  /** A list of extracted content from the provided URLs. */
  "results"?: Array<{
    /** The URL from which the content was extracted. */
    "url"?: string;
    /** The full content extracted from the page. When `query` is provided, contains the top-ranked chunks joined by `[...]` separator. */
    "raw_content"?: string;
    /** This is only available if `include_images` is set to `true`. A list of image URLs extracted from the page. */
    "images"?: Array<string>;
    /** The favicon URL for the result. */
    "favicon"?: string;
  }>;
  /** A list of URLs that could not be processed. */
  "failed_results"?: Array<{
    /** The URL that failed to be processed. */
    "url"?: string;
    /** An error message describing why the URL couldn't be processed. */
    "error"?: string;
  }>;
  /** Time in seconds it took to complete the request. (format float) */
  "response_time"?: number;
  /** Credit usage details for the request. */
  "usage"?: { [key: string]: unknown };
  /** A unique request identifier you can share with customer support to help resolve issues with specific requests. */
  "request_id"?: string;
};

export type TavilyFeedbackBody = {
  /** The search request to give feedback on, as returned in the `request_id` field of the search response. When provided, the feedback applies to this request. (maxLength 200) */
  "request_id"?: string;
  /** The session to give feedback on — the value you sent in the `X-Session-Id` header. When `request_id` is omitted, the feedback applies to the whole session. Optional if `request_id` is provided. (maxLength 200) */
  "session_id"?: string;
  /** Overall score for how relevant and useful the results were for your task. */
  "agent_score"?: ((number) | (string));
  /** Feedback from your end user, if you collect it. */
  "human_score"?: ((number) | (string));
  /** Additional labeled scores for the dimensions you care about. (maxItems 50) */
  "extra_scores"?: Array<{
    /** Name of the dimension being scored. (maxLength 64) */
    "label": string;
    /** A numeric score, or a short string label (max 64 characters). */
    "value": ((number) | (string));
  }>;
  /** Free-text explanation of the feedback. (maxLength 10000) */
  "comment"?: string;
  /** The final answer you produced using the results. (maxLength 50000) */
  "response_delivered"?: string;
  /** IDs of the results you actually used in your answer. Alternative to `used_urls`. (maxItems 100) */
  "used_ids"?: Array<string>;
  /** URLs of the results you actually used in your answer. Alternative to `used_ids`. (maxItems 100) */
  "used_urls"?: Array<string>;
  /** The specific content snippets you quoted from the results. (maxItems 100) */
  "used_citations"?: Array<string>;
  /** Per-result feedback. Identify each result by `id` or `url`. (maxItems 100) */
  "urls_scores"?: Array<{
    /** The `id` of the result, as returned in the search response. (maxLength 200) */
    "id"?: string;
    /** The URL of the result. Use instead of `id` when you don't have the result ID. (maxLength 2000) */
    "url"?: string;
    /** Score for this specific result. */
    "agent_score"?: ((number) | (string));
    /** Additional labeled scores for this result. (maxItems 20) */
    "scores"?: Array<{
      /** Name of the dimension being scored. (maxLength 64) */
      "label": string;
      /** A numeric score, or a short string label (max 64 characters). */
      "value": ((number) | (string));
    }>;
    /** Free-text explanation of the feedback on this result. (maxLength 2000) */
    "comment"?: string;
  }>;
};

export interface TavilyFeedbackInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  headers?: Readonly<Record<string, string>>;
  body: TavilyFeedbackBody;
}

export type TavilyFeedbackResponse = {
  /** Whether the feedback was accepted. */
  "success"?: boolean;
  /** Unique identifier of this feedback submission. */
  "feedback_id"?: string;
  /** Response time of this feedback request in seconds. */
  "response_time"?: number;
};

export type TavilyGenerateKeysBody = {
  /** The permission level for the key. */
  "permission_level": "admin" | "user";
  /** The name of the key(s). Auto-generated in the format `{key_type}-{expiration}-#{index}` */
  "name"?: string;
  /** Permission scopes for the key. Only applicable when `permission_level` is `"user"`. */
  "scope"?: Array<"api:generate_keys">;
  /** The type of key. */
  "key_type"?: "development" | "production";
  /** The number of credits for the generated keys. (min 1, max 100000) */
  "key_limit"?: number;
  /** Number of hours before the keys become deactivated. (min 1, max 8760) */
  "ttl_hours"?: number;
  /** The total number of keys to generate. (min 1, max 200) */
  "count"?: number;
};

export interface TavilyGenerateKeysInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  headers?: Readonly<Record<string, string>>;
  body: TavilyGenerateKeysBody;
}

export type TavilyGenerateKeysResponse = {
  /** The generated API keys. */
  "keys"?: Array<string>;
  /** The expiration timestamp for the keys. */
  "expires_at"?: string;
  /** The creation timestamp. */
  "created"?: string;
  /** A summary message about the generated keys. */
  "message"?: string;
  /** Unique identifier for this generation request. Use this to bulk-deactivate the keys later. */
  "request_id"?: string;
};

export interface TavilyKeyInfoInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  headers?: Readonly<Record<string, string>>;
}

export type TavilyKeyInfoResponse = {
  /** The name of the API key. */
  "name"?: string;
  /** The creation timestamp. */
  "created"?: string;
  /** The expiration timestamp, or `"never"` if the key does not expire. */
  "expires_at"?: string;
  /** The type of key. */
  "key_type"?: "development" | "production";
  /** The current status of the key. */
  "status"?: "active" | "deactivated";
};

export type TavilyLogsBody = {
  /** Maximum number of logs to return, most recent first. (min 1, max 10000) */
  "limit"?: number;
  /** Inclusive start of the log window (YYYY-MM-DD). (format date) */
  "start_date"?: string;
  /** Inclusive end of the log window (YYYY-MM-DD). (format date) */
  "end_date"?: string;
  /** Only return logs for these endpoints. By default, logs for all endpoints are returned. */
  "endpoints"?: Array<"search" | "extract" | "map" | "crawl" | "research">;
  /** Only return logs for a single project. */
  "project_id"?: string;
  /** When `true`, return only logs for the API key provided in the Authorization header. When `false` (default), logs for all API keys under your account or organization are returned. */
  "filter_by_api_key"?: boolean;
};

export interface TavilyLogsInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  headers?: Readonly<Record<string, string>>;
  body: TavilyLogsBody;
}

export type TavilyLogsResponse = {
  /** Matching log entries, most recent first. Log entries never include the input or output of the original request. */
  "logs"?: Array<{
    /** When the request was made (format date-time) */
    "timestamp"?: string;
    /** Which Tavily API was called */
    "endpoint"?: "search" | "extract" | "map" | "crawl" | "research";
    /** The request depth (e.g. `basic`, `advanced`). For `research` requests, the model tier. */
    "depth"?: string;
    /** Server-side response time in seconds */
    "response_time"?: number;
    /** API credits the request consumed */
    "credits"?: number;
    /** The API key that made the request, masked to its last 4 characters */
    "api_key"?: string;
    /** Unique identifier of the original request */
    "request_id"?: string;
  }>;
  /** Number of log entries returned */
  "count"?: number;
  /** Response time of this logs request in seconds */
  "response_time"?: number;
  /** Unique identifier of this logs request */
  "request_id"?: string;
};

export type TavilyMapBody = {
  /** The root URL to begin the mapping. */
  "url": string;
  /** Natural language instructions for the crawler. When specified, the cost increases to 2 API credits per 10 successful pages instead of 1 API credit per 10 pages. */
  "instructions"?: string;
  /** Max depth of the mapping. Defines how far from the base URL the crawler can explore. (min 1, max 5) */
  "max_depth"?: number;
  /** Max number of links to follow per level of the tree (i.e., per page). (min 1, max 500) */
  "max_breadth"?: number;
  /** Total number of links the crawler will process before stopping. (min 1) */
  "limit"?: number;
  /** Regex patterns to select only URLs with specific path patterns (e.g., `/docs/.*`, `/api/v1.*`). */
  "select_paths"?: Array<string>;
  /** Regex patterns to select crawling to specific domains or subdomains (e.g., `^docs\.example\.com$`). */
  "select_domains"?: Array<string>;
  /** Regex patterns to exclude URLs with specific path patterns (e.g., `/private/.*`, `/admin/.*`). */
  "exclude_paths"?: Array<string>;
  /** Regex patterns to exclude specific domains or subdomains from crawling (e.g., `^private\.example\.com$`). */
  "exclude_domains"?: Array<string>;
  /** Whether to include external domain links in the final results list. */
  "allow_external"?: boolean;
  /** Maximum time in seconds to wait for the map operation before timing out. Must be between 10 and 150 seconds. (min 10, max 150, format float) */
  "timeout"?: number;
  /** Whether to include credit usage information in the response.`NOTE:`The value may be 0 if the total successful pages mapped has not yet reached 10 calls. See our [Credits & Pricing documentation](https://docs.tavily.com/documentation/api-credits) for details. */
  "include_usage"?: boolean;
};

export interface TavilyMapInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  headers?: Readonly<Record<string, string>>;
  body: TavilyMapBody;
}

export type TavilyMapResponse = {
  /** The base URL that was mapped. */
  "base_url"?: string;
  /** A list of URLs that were discovered during the mapping. */
  "results"?: Array<string>;
  /** Time in seconds it took to complete the request. (format float) */
  "response_time"?: number;
  /** Credit usage details for the request. */
  "usage"?: { [key: string]: unknown };
  /** A unique request identifier you can share with customer support to help resolve issues with specific requests. */
  "request_id"?: string;
};

export type TavilyOrgUsageBody = {
  /** Exact organization name (case-sensitive). You must be the owner of this organization. */
  "organization_name": string;
  /** Inclusive start of the usage window (YYYY-MM-DD). Defaults to the start of the current billing cycle. (format date) */
  "start_date"?: string;
  /** Inclusive end of the usage window (YYYY-MM-DD). Defaults to today. (format date) */
  "end_date"?: string;
  /** Scope usage to a single project. */
  "project_id"?: string;
  /** Scope usage to a single request depth. */
  "depth"?: "basic" | "advanced" | "fast" | "pro" | "mini" | "auto" | "ultra-fast";
};

export interface TavilyOrgUsageInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  headers?: Readonly<Record<string, string>>;
  body: TavilyOrgUsageBody;
}

export type TavilyOrgUsageResponse = {
  "organization"?: {
    "name"?: string;
    /** Echo of the filters applied to this response */
    "filters"?: {
      "start_date"?: string;
      "end_date"?: string;
      "project_id"?: string;
      "depth"?: string;
    };
  };
  /** Aggregated usage across all keys in the organization for the selected window/filters */
  "totals"?: {
    "usage"?: number;
    "paygo_cost_usd"?: number;
    "request_count"?: number;
    "by_type"?: TavilySchemaUsageByType;
  };
  "keys"?: Array<{
    /** API key, masked to the last 5 characters */
    "key"?: string;
    /** Key name */
    "name"?: string;
    "usage"?: number;
    "paygo_cost_usd"?: number;
    "request_count"?: number;
    "by_type"?: TavilySchemaUsageByType;
  }>;
};

export type TavilyGetResearchPath = {
  "request_id": string;
};

export type TavilyGetResearchQuery = {
  "include_usage"?: boolean;
};

export interface TavilyGetResearchInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  path: TavilyGetResearchPath;
  query?: TavilyGetResearchQuery;
  headers?: Readonly<Record<string, string>>;
}

export type TavilyGetResearchResponse = ((((TavilySchemaResearchTaskCompleted) | (TavilySchemaResearchTaskFailed))) | ({
  /** The unique identifier of the research task. */
  "request_id": string;
  /** Current status of the research task. */
  "status": "pending" | "in_progress";
  /** Time in seconds it took to complete the request. */
  "response_time": number;
}));

export type TavilyResearchBody = {
  /** The research task or question to investigate. */
  "input": string;
  /** The model used by the research agent. "mini" is optimized for targeted, efficient research and works best for narrow or well-scoped questions. "pro" provides comprehensive, multi-angle research and is suited for complex topics that span multiple subtopics or domains */
  "model"?: "mini" | "pro" | "auto";
  /** Whether to stream the research results as they are generated. When 'true', returns a Server-Sent Events (SSE) stream. See [Streaming documentation](/documentation/api-reference/endpoint/research-streaming) for details. */
  "stream"?: boolean;
  /** A JSON Schema object that defines the structure of the research output. When provided, the research response will be structured to match this schema, ensuring a predictable and validated output shape. Must include a 'properties' field, and may optionally include 'required' field. */
  "output_schema"?: {
    /** An object containing property definitions. Each key is a property name, and each value is a property schema. */
    "properties"?: {
      [key: string]: {
        /** The type of the property. Must be one of: object, string, integer, number, or array. */
        "type": "object" | "string" | "integer" | "number" | "array";
        /** A description of the property. */
        "description": string;
        /** Required when type is 'object'. Recursive definition of object properties. */
        "properties"?: { [key: string]: unknown };
        /** Required when type is 'array'. Defines the schema for array items. */
        "items"?: { [key: string]: unknown };
      };
    };
    /** An array of property names that are required. At least one key from the properties object must be included. */
    "required"?: Array<string>;
  };
  /** The format for citations in the research report. */
  "citation_format"?: "numbered" | "mla" | "apa" | "chicago";
  /** Soft preference for sources. The research agent prioritizes these domains, but URLs from other domains can still appear in the final report. Matching is host-based and includes subdomains (e.g., `sec.gov` matches `sec.gov` and `data.sec.gov`). Maximum 20 entries. (maxItems 20) */
  "include_domains"?: Array<string>;
  /** Hard blocklist. No URL from a listed domain or any of its subdomains appears in the response. Subdomain matching is downward only — blocking `medium.com` also blocks `blog.medium.com`, but blocking `blog.medium.com` leaves `medium.com` itself allowed. Maximum 20 entries. (maxItems 20) */
  "exclude_domains"?: Array<string>;
  /** Typed control over response size. Ranges are targets, not hard caps — individual responses can fall outside when the question requires it. */
  "output_length"?: "short" | "standard" | "long";
  /** Attach files to the research request and the agent uses their contents as a source alongside the web. Each entry carries a filename and its base64-encoded contents. The agent reads the relevant parts of each file, grounds its answer in them, and cites any file it draws from. Supp (maxItems 5) */
  "files"?: Array<{
    /** The filename, including its extension (`.txt`, `.md`, or `.json`). */
    "name": string;
    /** The base64-encoded file contents. */
    "data": string;
    /** The encoding of the `data` field. */
    "type"?: "base64";
  }>;
};

export interface TavilyResearchInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  headers?: Readonly<Record<string, string>>;
  body: Omit<TavilyResearchBody, "stream"> & { stream?: false };
}

export type TavilyResearchResponse = {
  /** A unique identifier for the research task. */
  "request_id": string;
  /** Timestamp when the research task was created. */
  "created_at": string;
  /** The current status of the research task. */
  "status": string;
  /** The research task or question investigated. */
  "input": string;
  /** The model used by the research agent. */
  "model": string;
  /** Time in seconds it took to complete the request. */
  "response_time": number;
};

export type TavilyResearchStreamBody = {
  /** The research task or question to investigate. */
  "input": string;
  /** The model used by the research agent. "mini" is optimized for targeted, efficient research and works best for narrow or well-scoped questions. "pro" provides comprehensive, multi-angle research and is suited for complex topics that span multiple subtopics or domains */
  "model"?: "mini" | "pro" | "auto";
  /** Whether to stream the research results as they are generated. When 'true', returns a Server-Sent Events (SSE) stream. See [Streaming documentation](/documentation/api-reference/endpoint/research-streaming) for details. */
  "stream"?: boolean;
  /** A JSON Schema object that defines the structure of the research output. When provided, the research response will be structured to match this schema, ensuring a predictable and validated output shape. Must include a 'properties' field, and may optionally include 'required' field. */
  "output_schema"?: {
    /** An object containing property definitions. Each key is a property name, and each value is a property schema. */
    "properties"?: {
      [key: string]: {
        /** The type of the property. Must be one of: object, string, integer, number, or array. */
        "type": "object" | "string" | "integer" | "number" | "array";
        /** A description of the property. */
        "description": string;
        /** Required when type is 'object'. Recursive definition of object properties. */
        "properties"?: { [key: string]: unknown };
        /** Required when type is 'array'. Defines the schema for array items. */
        "items"?: { [key: string]: unknown };
      };
    };
    /** An array of property names that are required. At least one key from the properties object must be included. */
    "required"?: Array<string>;
  };
  /** The format for citations in the research report. */
  "citation_format"?: "numbered" | "mla" | "apa" | "chicago";
  /** Soft preference for sources. The research agent prioritizes these domains, but URLs from other domains can still appear in the final report. Matching is host-based and includes subdomains (e.g., `sec.gov` matches `sec.gov` and `data.sec.gov`). Maximum 20 entries. (maxItems 20) */
  "include_domains"?: Array<string>;
  /** Hard blocklist. No URL from a listed domain or any of its subdomains appears in the response. Subdomain matching is downward only — blocking `medium.com` also blocks `blog.medium.com`, but blocking `blog.medium.com` leaves `medium.com` itself allowed. Maximum 20 entries. (maxItems 20) */
  "exclude_domains"?: Array<string>;
  /** Typed control over response size. Ranges are targets, not hard caps — individual responses can fall outside when the question requires it. */
  "output_length"?: "short" | "standard" | "long";
  /** Attach files to the research request and the agent uses their contents as a source alongside the web. Each entry carries a filename and its base64-encoded contents. The agent reads the relevant parts of each file, grounds its answer in them, and cites any file it draws from. Supp (maxItems 5) */
  "files"?: Array<{
    /** The filename, including its extension (`.txt`, `.md`, or `.json`). */
    "name": string;
    /** The base64-encoded file contents. */
    "data": string;
    /** The encoding of the `data` field. */
    "type"?: "base64";
  }>;
};

export interface TavilyResearchStreamInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  headers?: Readonly<Record<string, string>>;
  body: Omit<TavilyResearchStreamBody, "stream"> & { stream?: true };
}

export type TavilyResearchStreamPayload = {
  "id": string;
  "object": "chat.completion.chunk";
  "model": string;
  "created": number;
  "choices": Array<{
    "delta": {
      "role"?: string;
      "content"?: ((string) | ({ [key: string]: unknown }));
      "sources"?: Array<{
        "url": string;
        "title": string;
        "favicon": string;
      }>;
      "tool_calls"?: {
        "type": "tool_call" | "tool_response";
        "tool_call"?: Array<{
          "name": string;
          "id": string;
          "arguments": string;
          "queries"?: Array<string>;
          "sources"?: Array<{
            "url": string;
            "title": string;
            "favicon": string;
          }>;
          "parent_tool_call_id"?: string;
        }>;
        "tool_response"?: Array<{
          "name": string;
          "id": string;
          "arguments": string;
          "queries"?: Array<string>;
          "sources"?: Array<{
            "url": string;
            "title": string;
            "favicon": string;
          }>;
          "parent_tool_call_id"?: string;
        }>;
      };
    };
  }>;
};

export type TavilySearchBody = {
  /** The search query to execute with Tavily. */
  "query": string;
  /** Controls the latency vs. relevance tradeoff and how `results[].content` is generated: - `advanced`: Highest relevance with increased latency. Best for detailed, high-precision queries. Returns multiple semantically relevant snippets per URL (configurable via `chunks_per_source`). */
  "search_depth"?: "advanced" | "basic" | "fast" | "ultra-fast";
  /** Chunks are short content snippets (about 500 characters each for `basic` and `fast`, 800 for `advanced`) pulled directly from the source. Use `chunks_per_source` to define the maximum number of relevant chunks returned per source and to control the `content` length. Chunks will a (min 1, max 3) */
  "chunks_per_source"?: number;
  /** The maximum number of search results to return. (min 0, max 20) */
  "max_results"?: number;
  /** The category of the search.`news` is useful for retrieving real-time updates, particularly about politics, sports, and major current events covered by mainstream media sources. `general` is for broader, more general-purpose searches that may include a wide range of sources. */
  "topic"?: "general" | "news" | "finance";
  /** The time range back from the current date to filter results based on publish date or last updated date. Useful when looking for sources that have published or updated data. By default, results with no detectable published date are not removed; set `filter_by_published_date` to `t */
  "time_range"?: "day" | "week" | "month" | "year" | "d" | "w" | "m" | "y";
  /** Will return all results after the specified start date based on publish date or last updated date. Required to be written in the format YYYY-MM-DD. By default, results with no detectable published date are not removed; set `filter_by_published_date` to `true` to remove them. */
  "start_date"?: string;
  /** Will return all results before the specified end date based on publish date or last updated date. Required to be written in the format YYYY-MM-DD. By default, results with no detectable published date are not removed; set `filter_by_published_date` to `true` to remove them. */
  "end_date"?: string;
  /** Include a `published_date` field in each result. The date is Tavily's best estimate of when the source was published or last updated, so it can be later than the original publish date. Results with no detectable date return `null`. Automatically enabled when `topic` is `news`. ** */
  "include_published_date"?: boolean;
  /** Remove results whose published date falls outside the `time_range`, `start_date`, or `end_date` window. Results with no detectable published date are also removed. Setting this to `true` also enables `include_published_date`. If you want date-window filtering but don't want to lo */
  "filter_by_published_date"?: boolean;
  /** Include an LLM-generated answer to the provided query. `basic` or `true` returns a quick answer. `advanced` returns a more detailed answer. */
  "include_answer"?: ((boolean) | ("basic" | "advanced"));
  /** Include the cleaned and parsed HTML content of each search result. `markdown` or `true` returns search result content in markdown format. `text` returns the plain text from the results and may increase latency. */
  "include_raw_content"?: ((boolean) | ("markdown" | "text"));
  /** Include images in the response. Returns both a top-level `images` list of query-related images and an `images` array inside each result object with images extracted from that specific source. */
  "include_images"?: boolean;
  /** When `include_images` is `true`, also add a descriptive text for each image. */
  "include_image_descriptions"?: boolean;
  /** Whether to include the favicon URL for each result. */
  "include_favicon"?: boolean;
  /** A list of domains to specifically include in the search results. Maximum 300 domains. */
  "include_domains"?: Array<string>;
  /** A list of domains to specifically exclude from the search results. Maximum 150 domains. */
  "exclude_domains"?: Array<string>;
  /** Controls how `include_domains` is applied. `restrict` limits results to only the listed domains. `prefer` also searches the rest of the web, so results outside `include_domains` can still surface, rather than excluding them. Defaults to `restrict`, so `include_domains` acts as a  */
  "include_domains_mode"?: "restrict" | "prefer";
  /** Boost search results from a specific country. This will prioritize content from the selected country in the search results. Available only if topic is `general`. */
  "country"?: "afghanistan" | "albania" | "algeria" | "andorra" | "angola" | "argentina" | "armenia" | "australia" | "austria" | "azerbaijan" | "bahamas" | "bahrain" | "bangladesh" | "barbados" | "belarus" | "belgium" | "belize" | "benin" | "bhutan" | "bolivia" | "bosnia and herzegovina" | "botswana" | "brazil" | "brunei" | "bulgaria" | "burkina faso" | "burundi" | "cambodia" | "cameroon" | "canada" | "cape verde" | "central african republic" | "chad" | "chile" | "china" | "colombia" | "comoros" | "congo" | "costa rica" | "croatia" | "cuba" | "cyprus" | "czech republic" | "denmark" | "djibouti" | "dominican republic" | "ecuador" | "egypt" | "el salvador" | "equatorial guinea" | "eritrea" | "estonia" | "ethiopia" | "fiji" | "finland" | "france" | "gabon" | "gambia" | "georgia" | "germany" | "ghana" | "greece" | "guatemala" | "guinea" | "haiti" | "honduras" | "hungary" | "iceland" | "india" | "indonesia" | "iran" | "iraq" | "ireland" | "israel" | "italy" | "jamaica" | "japan" | "jordan" | "kazakhstan" | "kenya" | "kuwait" | "kyrgyzstan" | "latvia" | "lebanon" | "lesotho" | "liberia" | "libya" | "liechtenstein" | "lithuania" | "luxembourg" | "madagascar" | "malawi" | "malaysia" | "maldives" | "mali" | "malta" | "mauritania" | "mauritius" | "mexico" | "moldova" | "monaco" | "mongolia" | "montenegro" | "morocco" | "mozambique" | "myanmar" | "namibia" | "nepal" | "netherlands" | "new zealand" | "nicaragua" | "niger" | "nigeria" | "north korea" | "north macedonia" | "norway" | "oman" | "pakistan" | "panama" | "papua new guinea" | "paraguay" | "peru" | "philippines" | "poland" | "portugal" | "qatar" | "romania" | "russia" | "rwanda" | "saudi arabia" | "senegal" | "serbia" | "singapore" | "slovakia" | "slovenia" | "somalia" | "south africa" | "south korea" | "south sudan" | "spain" | "sri lanka" | "sudan" | "sweden" | "switzerland" | "syria" | "taiwan" | "tajikistan" | "tanzania" | "thailand" | "togo" | "trinidad and tobago" | "tunisia" | "turkey" | "turkmenistan" | "uganda" | "ukraine" | "united arab emirates" | "united kingdom" | "united states" | "uruguay" | "uzbekistan" | "venezuela" | "vietnam" | "yemen" | "zambia" | "zimbabwe";
  /** Boost search results in a specific language. Accepts an ISO 639-1 code (e.g. `en`, `fr`, `zh-cn`) or an English language name (e.g. `english`, `french`). By default this only boosts matching-language results in ranking; pass `filter_by_language: true` to strictly filter out non-m */
  "language"?: string;
  /** Strictly filter out search results that don't match the `language` parameter, instead of only boosting them in ranking. Requires `language` to be set; returns a 400 error otherwise. */
  "filter_by_language"?: boolean;
  /** When `auto_parameters` is enabled, Tavily automatically configures search parameters based on your query's content and intent. You can still set other parameters manually, and your explicit values will override the automatic ones. The parameters `include_answer`, `include_raw_con */
  "auto_parameters"?: boolean;
  /** Ensure that only search results containing the exact quoted phrase(s) in the query are returned, bypassing synonyms or semantic variations. Wrap target phrases in quotes within your query (e.g. `"John Smith" CEO Acme Corp`). Punctuation is typically ignored inside quotes. */
  "exact_match"?: boolean;
  /** Whether to include credit usage information in the response. */
  "include_usage"?: boolean;
  /** Whether to filter out adult or unsafe content from results. Not supported for `fast` or `ultra-fast` search depths. */
  "safe_search"?: boolean;
};

export interface TavilySearchInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  headers?: Readonly<Record<string, string>>;
  body: TavilySearchBody;
}

export type TavilySearchResponse = {
  /** The search query that was executed. */
  "query": string;
  /** A short answer to the user's query, generated by an LLM. Included in the response only if `include_answer` is requested (i.e., set to `true`, `basic`, or `advanced`) */
  "answer": string;
  /** A list of query-related images from image search. If `include_image_descriptions` is true, each item will have `url` and `description`. Note: per-result images are also returned inside each result object's `images` field. */
  "images": Array<{
    "url"?: string;
    "description"?: string;
  }>;
  /** A list of sorted search results, ranked by relevancy. */
  "results": Array<{
    /** The title of the search result. */
    "title"?: string;
    /** The URL of the search result. */
    "url"?: string;
    /** A short description of the search result. */
    "content"?: string;
    /** The relevance score of the search result. (format float) */
    "score"?: number;
    /** The cleaned and parsed HTML content of the search result. Only if `include_raw_content` is true. */
    "raw_content"?: string;
    /** Tavily's best estimate of when the source was published or last updated. Can be later than the original publish date. `null` if no date could be detected. Only returned when `include_published_date` is `true` (automatically enabled when `topic` is `news`). */
    "published_date"?: string;
    /** The favicon URL for the result. */
    "favicon"?: string;
    /** A list of images extracted from this search result. Only included when `include_images` is `true`. If `include_image_descriptions` is `true`, each item will have `url` and `description`. */
    "images"?: Array<{
      "url"?: string;
      "description"?: string;
    }>;
    /** Unique identifier for this result */
    "id"?: string;
  }>;
  /** A dictionary of the selected auto_parameters, only shown when `auto_parameters` is true. */
  "auto_parameters"?: { [key: string]: unknown };
  /** Time in seconds it took to complete the request. (format float) */
  "response_time": number;
  /** Credit usage details for the request. */
  "usage"?: { [key: string]: unknown };
  /** A unique request identifier you can share with customer support to help resolve issues with specific requests. */
  "request_id"?: string;
};

export type TavilyGetUsageHeaders = {
  "X-Project-ID"?: string;
};

export interface TavilyGetUsageInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  headers?: TavilyGetUsageHeaders & Readonly<Record<string, string>>;
}

export type TavilyGetUsageResponse = {
  "key"?: {
    /** Total credits used for this API key during the current billing cycle */
    "usage"?: number;
    /** Usage limit for the API key. Returns null if unlimited */
    "limit"?: number;
    /** Search endpoint credits used for this API key during the current billing cycle */
    "search_usage"?: number;
    /** Extract endpoint credits used for this API key during the current billing cycle */
    "extract_usage"?: number;
    /** Crawl endpoint credits used for this API key during the current billing cycle */
    "crawl_usage"?: number;
    /** Map endpoint credits used for this API key during the current billing cycle */
    "map_usage"?: number;
    /** Research endpoint credits used for this API key during the current billing cycle */
    "research_usage"?: number;
  };
  /** Account plan and usage information */
  "account"?: {
    /** The current subscription plan name */
    "current_plan"?: string;
    /** Total credits used for this plan during the current billing cycle */
    "plan_usage"?: number;
    /** Usage limit for the current plan */
    "plan_limit"?: number;
    /** Current pay-as-you-go usage count */
    "paygo_usage"?: number;
    /** Pay-as-you-go usage limit */
    "paygo_limit"?: number;
    /** Search endpoint credits used for this plan during the current billing cycle */
    "search_usage"?: number;
    /** Extract endpoint credits used for this plan during the current billing cycle */
    "extract_usage"?: number;
    /** Crawl endpoint credits used for this plan during the current billing cycle */
    "crawl_usage"?: number;
    /** Map endpoint credits used for this plan during the current billing cycle */
    "map_usage"?: number;
    /** Research endpoint credits used for this plan during the current billing cycle */
    "research_usage"?: number;
  };
};

/** Supply a payment signature acquired by an external x402 client. This SDK never signs payments. */
export interface TavilyPaidSearchInput extends Omit<TavilySearchInput, "headers" | "body"> {
  body: Omit<TavilySearchBody, "search_depth"> & { search_depth?: "advanced" };
  headers?: { "PAYMENT-SIGNATURE"?: string } & Readonly<Record<string, string>>;
}
export interface TavilyPaymentPricingInput extends Pick<NativeRequestInput, "signal" | "timeoutMs" | "headers"> {}

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

export const tavilyOperations = Object.freeze({
  getPaymentPricing: Object.freeze({ id: "getPaymentPricing", method: "GET", path: "/.well-known/pricing", response: "raw", retryable: true }),
  paidSearch: Object.freeze({ id: "paidSearch", method: "POST", path: "/search", retryable: false }),
  crawl: Object.freeze({"id": "crawl", "method": "POST", "path": "/crawl", "retryable": false}),
  deactivateKeys: Object.freeze({"id": "deactivateKeys", "method": "POST", "path": "/deactivate-keys", "retryable": false}),
  extract: Object.freeze({"id": "extract", "method": "POST", "path": "/extract", "retryable": false}),
  feedback: Object.freeze({"id": "feedback", "method": "POST", "path": "/feedback", "retryable": false}),
  generateKeys: Object.freeze({"id": "generateKeys", "method": "POST", "path": "/generate-keys", "retryable": false}),
  keyInfo: Object.freeze({"id": "keyInfo", "method": "GET", "path": "/key-info", "retryable": true}),
  logs: Object.freeze({"id": "logs", "method": "POST", "path": "/logs", "retryable": false}),
  map: Object.freeze({"id": "map", "method": "POST", "path": "/map", "retryable": false}),
  orgUsage: Object.freeze({"id": "orgUsage", "method": "POST", "path": "/org-usage", "retryable": false}),
  getResearch: Object.freeze({"id": "getResearch", "method": "GET", "path": "/research/{request_id}", "retryable": true}),
  research: Object.freeze({"id": "research", "method": "POST", "path": "/research", "retryable": false}),
  researchStream: Object.freeze({"id": "researchStream", "method": "POST", "path": "/research", "retryable": false, "response": "sse", "headers": Object.freeze({"Accept": "text/event-stream"}) }),
  search: Object.freeze({"id": "search", "method": "POST", "path": "/search", "retryable": false}),
  getUsage: Object.freeze({"id": "getUsage", "method": "GET", "path": "/usage", "retryable": true}),
} satisfies Readonly<Record<string, NativeOperation>>);

/** Explicit native calls; no auto-pagination, polling, or stream reconnection. */
export function createTavilyClient(options: TavilyClientOptions) {
  const { apiKey, accessMode = "keyed", ...config } = options;
  if (!["keyed", "keyless"].includes(accessMode)) throw new SearchError("configuration");
  const key = apiKey === undefined && accessMode === "keyless" ? undefined : credential(apiKey as string);
  const transport0 = createNativeTransport({ ...config, provider: "tavily", baseUrl: "https://api.tavily.com", headers: key === undefined ? { "X-Tavily-Access-Mode": "keyless" } : { Authorization: `Bearer ${key}` } });
  const transport1 = createNativeTransport({ ...config, provider: "tavily", baseUrl: "https://api-key-generator.tavily.com", headers: key === undefined ? { "X-Tavily-Access-Mode": "keyless" } : { Authorization: `Bearer ${key}` } });
  const paymentTransport = createNativeTransport({ ...config, provider: "tavily", baseUrl: "https://x402.tavily.com" });
  return Object.freeze({
    /** GET https://x402.tavily.com/.well-known/pricing — bounded raw JSON; no stable response schema is published. */
    getPaymentPricing(input: TavilyPaymentPricingInput = {}): Promise<NativeResponse<Response>> {
      return paymentTransport.request(tavilyOperations.getPaymentPricing, input);
    },
    /** POST https://x402.tavily.com/search — externally authorized payment; never retried automatically. */
    paidSearch(input: TavilyPaidSearchInput): Promise<NativeResponse<TavilySearchResponse>> {
      return paymentTransport.request<TavilySearchResponse>(tavilyOperations.paidSearch, input);
    },
    operations: tavilyOperations,
    /** POST https://api.tavily.com/crawl — Initiate a web crawl from a base URL. */
    async crawl(input: TavilyCrawlInput): Promise<NativeResponse<TavilyCrawlResponse>> {
      if (key === undefined) throw new SearchError("configuration");
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      if (input.body !== undefined && (!input.body || typeof input.body !== "object" || Array.isArray(input.body))) throw new SearchError("invalid_request");
      return transport0.request<TavilyCrawlResponse>(tavilyOperations.crawl, { ...input });
    },
    /** POST https://api-key-generator.tavily.com/deactivate-keys — Deactivate API Keys. */
    async deactivateKeys(input: TavilyDeactivateKeysInput = {}): Promise<NativeResponse<TavilyDeactivateKeysResponse>> {
      if (key === undefined) throw new SearchError("configuration");
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body !== undefined && (!input.body || typeof input.body !== "object" || Array.isArray(input.body))) throw new SearchError("invalid_request");
      return transport1.request<TavilyDeactivateKeysResponse>(tavilyOperations.deactivateKeys, { ...input });
    },
    /** POST https://api.tavily.com/extract — Retrieve raw web content from specified URLs. */
    async extract(input: TavilyExtractInput): Promise<NativeResponse<TavilyExtractResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      if (input.body !== undefined && (!input.body || typeof input.body !== "object" || Array.isArray(input.body))) throw new SearchError("invalid_request");
      return transport0.request<TavilyExtractResponse>(tavilyOperations.extract, { ...input });
    },
    /** POST https://api.tavily.com/feedback — Submit feedback on a search request or session. */
    async feedback(input: TavilyFeedbackInput): Promise<NativeResponse<TavilyFeedbackResponse>> {
      if (key === undefined) throw new SearchError("configuration");
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      if (input.body !== undefined && (!input.body || typeof input.body !== "object" || Array.isArray(input.body))) throw new SearchError("invalid_request");
      return transport0.request<TavilyFeedbackResponse>(tavilyOperations.feedback, { ...input });
    },
    /** POST https://api-key-generator.tavily.com/generate-keys — Generate API Keys. */
    async generateKeys(input: TavilyGenerateKeysInput): Promise<NativeResponse<TavilyGenerateKeysResponse>> {
      if (key === undefined) throw new SearchError("configuration");
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      if (input.body !== undefined && (!input.body || typeof input.body !== "object" || Array.isArray(input.body))) throw new SearchError("invalid_request");
      return transport1.request<TavilyGenerateKeysResponse>(tavilyOperations.generateKeys, { ...input });
    },
    /** GET https://api-key-generator.tavily.com/key-info — Get Key Info. */
    async keyInfo(input: TavilyKeyInfoInput = {}): Promise<NativeResponse<TavilyKeyInfoResponse>> {
      if (key === undefined) throw new SearchError("configuration");
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport1.request<TavilyKeyInfoResponse>(tavilyOperations.keyInfo, { ...input });
    },
    /** POST https://api.tavily.com/logs — Get usage logs for your API keys. */
    async logs(input: TavilyLogsInput): Promise<NativeResponse<TavilyLogsResponse>> {
      if (key === undefined) throw new SearchError("configuration");
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      if (input.body !== undefined && (!input.body || typeof input.body !== "object" || Array.isArray(input.body))) throw new SearchError("invalid_request");
      return transport0.request<TavilyLogsResponse>(tavilyOperations.logs, { ...input });
    },
    /** POST https://api.tavily.com/map — Initiate a web mapping from a base URL. */
    async map(input: TavilyMapInput): Promise<NativeResponse<TavilyMapResponse>> {
      if (key === undefined) throw new SearchError("configuration");
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      if (input.body !== undefined && (!input.body || typeof input.body !== "object" || Array.isArray(input.body))) throw new SearchError("invalid_request");
      return transport0.request<TavilyMapResponse>(tavilyOperations.map, { ...input });
    },
    /** POST https://api.tavily.com/org-usage — Get organization usage across all API keys. */
    async orgUsage(input: TavilyOrgUsageInput): Promise<NativeResponse<TavilyOrgUsageResponse>> {
      if (key === undefined) throw new SearchError("configuration");
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      if (input.body !== undefined && (!input.body || typeof input.body !== "object" || Array.isArray(input.body))) throw new SearchError("invalid_request");
      return transport0.request<TavilyOrgUsageResponse>(tavilyOperations.orgUsage, { ...input });
    },
    /** GET https://api.tavily.com/research/{request_id} — Get research task status and results. */
    async getResearch(input: TavilyGetResearchInput): Promise<NativeResponse<TavilyGetResearchResponse>> {
      if (key === undefined) throw new SearchError("configuration");
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.query !== undefined && (!input.query || typeof input.query !== "object" || Array.isArray(input.query))) throw new SearchError("invalid_request");
      return transport0.request<TavilyGetResearchResponse>(tavilyOperations.getResearch, { ...input, query: wireQuery(input.query, []) ?? {} });
    },
    /** POST https://api.tavily.com/research — Initiate a research task. */
    async research(input: TavilyResearchInput): Promise<NativeResponse<TavilyResearchResponse>> {
      if (key === undefined) throw new SearchError("configuration");
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      if (input.body !== undefined && (!input.body || typeof input.body !== "object" || Array.isArray(input.body))) throw new SearchError("invalid_request");
      if (input.body?.stream !== undefined && input.body.stream !== false) throw new SearchError("unsupported_option");
      return transport0.request<TavilyResearchResponse>(tavilyOperations.research, { ...input, body: { ...input.body, stream: false } });
    },
    /** POST https://api.tavily.com/research — Initiate a research task. */
    async researchStream(input: TavilyResearchStreamInput): Promise<NativeResponse<AsyncIterable<NativeSSEEvent>>> {
      if (key === undefined) throw new SearchError("configuration");
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      if (input.body !== undefined && (!input.body || typeof input.body !== "object" || Array.isArray(input.body))) throw new SearchError("invalid_request");
      if (input.body?.stream !== undefined && input.body.stream !== true) throw new SearchError("unsupported_option");
      return transport0.request(tavilyOperations.researchStream, { ...input, body: { ...input.body, stream: true }, headers: { ...input.headers, Accept: "text/event-stream" } });
    },
    /** POST https://api.tavily.com/search — Search for data based on a query. */
    async search(input: TavilySearchInput): Promise<NativeResponse<TavilySearchResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      if (input.body !== undefined && (!input.body || typeof input.body !== "object" || Array.isArray(input.body))) throw new SearchError("invalid_request");
      return transport0.request<TavilySearchResponse>(tavilyOperations.search, { ...input });
    },
    /** GET https://api.tavily.com/usage — Get API key and account usage details. */
    async getUsage(input: TavilyGetUsageInput = {}): Promise<NativeResponse<TavilyGetUsageResponse>> {
      if (key === undefined) throw new SearchError("configuration");
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport0.request<TavilyGetUsageResponse>(tavilyOperations.getUsage, { ...input });
    },
  });
}

export type TavilyClient = ReturnType<typeof createTavilyClient>;
