// Native wire types and operations derived from official provider documentation.
// Sources, access gates, and verification limits: docs/provider-surfaces-a.md.
// Static wire types are not JSON Schema validation: ranges, patterns, and if/then
// constraints remain provider responsibilities; unconstrained source data stays unknown.
import { createNativeTransport } from "./native-transport.js";
import type { NativeOperation, NativeRequestInput, NativeResponse, NativeSSEEvent, NativeTransportConfig } from "./native-transport.js";
import { SearchError } from "./errors.js";

export interface TinyfishClientOptions extends Omit<NativeTransportConfig, "provider" | "baseUrl" | "headers"> {
  /** Server-side credential. Never embed it in browser bundles. */
  apiKey: string;
}

export type TinyfishSchemaMonitor = (({
  "id": string;
  "name": (string) | null;
  "schedule_cron": string;
  "status": "creating" | "active" | "paused" | "failed" | "cancelled";
  "last_error": (string) | null;
  "webhook_url": (string) | null;
  /**  (format date-time) */
  "created_at": string;
  /**  (format date-time) */
  "updated_at": string;
  "type": "fetch";
  "config": {
    "url": string;
    "format": "markdown" | "html" | "json";
    "links": boolean;
    "image_links": boolean;
    "ttl": number;
  };
}) | ({
  "id": string;
  "name": (string) | null;
  "schedule_cron": string;
  "status": "creating" | "active" | "paused" | "failed" | "cancelled";
  "last_error": (string) | null;
  "webhook_url": (string) | null;
  /**  (format date-time) */
  "created_at": string;
  /**  (format date-time) */
  "updated_at": string;
  "type": "search";
  "config": {
    "query": string;
    "recency_minutes": (number) | null;
    "result_limit": number;
  };
}));

export type TinyfishSchemaMonitorRun = (({
  /** Successfully fetched URLs */
  "results": Array<{
    /** Original requested URL */
    "url": string;
    /** Final URL after redirects */
    "final_url": (string) | null;
    /** Page title */
    "title": (string) | null;
    /** Page meta description */
    "description": (string) | null;
    /** Detected language code */
    "language": (string) | null;
    /** Format of the extracted text */
    "format": "markdown" | "html" | "json";
    /** Extracted content (string for markdown/html, object for json). Null if extraction failed. */
    "text": ((string) | (unknown) | ((unknown) | null));
    /** Page author if available */
    "author": (string) | null;
    /** Published date if available */
    "published_date": (string) | null;
    /** Extracted links (only if links=true in request) */
    "links"?: Array<string>;
    /** Extracted image links (only if image_links=true in request) */
    "image_links"?: Array<string>;
    /** Extracted <iframe src> URLs, absolute and deduplicated (only if iframe_links=true in request) */
    "iframe_links"?: Array<string>;
    /** Page-head metadata (only if page_metadata=true in request): canonical, favicon, robots, generator, viewport, keywords, plus nested og/twitter/article objects keyed by tag suffix and remaining named meta tags under `other`. Tags that legitimately repeat (og:image, og:locale:altern */
    "page_metadata"?: {
      [key: string]: (unknown) | null;
    };
    /** Fetch latency for this URL in milliseconds if available from tf-fetch */
    "latency_ms"?: (number) | null;
    /** Present and `true` only when the origin returned 304 Not Modified for your `if_none_match`/`if_modified_since`; omitted otherwise. */
    "not_modified"?: boolean;
    /** The origin's current ETag validator, present only when the origin sent one and you set `include_etag_and_last_modified: true`; omitted otherwise. Store it and replay it as `if_none_match`. */
    "etag"?: string;
    /** The origin's current Last-Modified validator, present only when the origin sent one and you set `include_etag_and_last_modified: true`; omitted otherwise. Store it and replay it as `if_modified_since`. */
    "last_modified"?: string;
    /** Partial-miss report for `include_selectors`: the entries that matched no elements on this page, present only when some (but not all) entries matched — the result still carries the matched content. Omitted when every entry matched. A total miss is not a result at all: it is report */
    "unmatched_selectors"?: Array<string>;
  }>;
  /** URLs that failed to fetch */
  "errors": Array<{
    /** URL that failed to fetch */
    "url": string;
    /** Error code describing the failure. Possible values: `target_http_error` (target server returned a non-2xx HTTP status other than 404/410 — see `status` field), `page_not_found` (target returned HTTP 404 or 410), `target_unreachable` (connection refused, TLS failure, or network er */
    "error": string;
    /** Upstream HTTP status code. Only present when `error` is `target_http_error` or `page_not_found`. */
    "status"?: number;
    /** The `include_selectors` entries that matched no elements on the fetched page. Only present when `error` is `selector_not_matched`. */
    "unmatched_selectors"?: Array<string>;
    /** Cheap retry hints (max 10), only present when `error` is `selector_not_matched`: landmark tags present on the page (e.g. `main`, `article`, `nav`) plus `#id` selectors of content-heavy elements. Retry the fetch with `include_selectors` drawn from this list. */
    "candidate_selectors"?: Array<string>;
  }>;
  /** Request correlation ID, also returned as the X-Request-ID response header. Present only when errors is non-empty; include it when reporting failed URLs. */
  "request_id"?: string;
  "id": string;
  /** True for the first run; nothing to compare. */
  "is_baseline": boolean;
}) | ({
  "id": string;
  "request_id": string;
  "query": string;
  "status_code": number;
  "result_count": number;
  "results": Array<{
    /** Position in search results */
    "position": number;
    /** Site name */
    "site_name": string;
    /** Text snippet from the result */
    "snippet": string;
    /** Page title */
    "title": string;
    /** Result URL (format uri) */
    "url": string;
    /** Thumbnail image URL, present only when include_thumbnail=true and a thumbnail is available (format uri) */
    "thumbnail_url"?: string;
    /** Fetched page content, present only when fetch param is supplied */
    "fetch"?: (unknown) | null;
    /** Fetch error details when fetch was requested. Contains details on failure; may be null when fetching succeeds. */
    "fetch_error"?: (unknown) | null;
    /** Publication date, present for news and some web results */
    "date"?: string;
    /** Publisher name, present for news results when domain_type=news */
    "publisher"?: string;
    /** Author list, present for academic results when domain_type=research_paper */
    "authors"?: Array<string>;
    /** Journal or conference name, present when domain_type=research_paper */
    "venue"?: string;
    /** Publication year, present when domain_type=research_paper */
    "year"?: number;
    /** Citation count, present when domain_type=research_paper */
    "cited_by_count"?: number;
    /** PDF URL, present when domain_type=research_paper and a PDF is available */
    "pdf_url"?: string;
  }>;
  /** Positions of results not seen in earlier runs */
  "new_result_positions": Array<number>;
  /**  (format date-time) */
  "created_at": string;
}));

export type TinyfishRunSseBody = {
  /** Target website URL to automate (format uri) */
  "url": string;
  /** Natural language description of what to accomplish on the website (minLength 1) */
  "goal": string;
  /** Browser profile for execution. LITE uses standard browser, STEALTH uses anti-detection browser. */
  "browser_profile"?: "lite" | "stealth";
  /** Name of the integration making this API call (e.g., "dify", "zapier", "n8n"). Used for analytics. */
  "api_integration"?: string;
  /** Agent behavior configuration */
  "agent_config"?: {
    /** Agent behavior mode. "strict" enables fail-fast for test automation. */
    "mode"?: "default" | "strict";
    /** Cursor style for the browser agent. */
    "cursor_style"?: "fish" | "standard" | "green-pointer";
    /** Maximum tool-call steps before the agent stops. Defaults to 150. (min 1, max 500) */
    "max_steps"?: number;
    /** Maximum wall-clock seconds before the agent stops. Defaults to no limit. (min 1) */
    "max_duration_seconds"?: number;
  };
  /** Configure which data to capture during the run. */
  "capture_config"?: {
    "elements"?: boolean;
    "snapshots"?: boolean;
    "screenshots"?: boolean;
    "recording"?: boolean;
    "html"?: boolean;
  };
  /** HTTPS URL to receive webhook notifications for run lifecycle events. Must use HTTPS. (format uri) */
  "webhook_url"?: string;
  /** Opt-in to vault credentials for this run. When true, enabled vault items are included. Defaults to false. */
  "use_vault"?: boolean;
  /** Opt-in to the default Browser Context Profile if Browser Context Profiles are enabled; legacy callers are silently ignored when the profiles feature is disabled. Returns 400 when enabled but no default profile is set. */
  "use_profile"?: boolean;
  /** Browser Context Profile ID to use when use_profile is true. (minLength 1) */
  "profile_id"?: string;
  /** Scope vault credentials to specific credential URIs. Requires use_vault to be true. If omitted with use_vault: true, all enabled items are used. */
  "credential_item_ids"?: Array<string>;
  /** Proxy configuration */
  "proxy_config"?: {
    /** Enable proxy for this automation run */
    "enabled": boolean;
    /** Proxy exit country (ISO 3166-1 alpha-2). Defaults to US. */
    "country_code"?: string;
  };
  /** Optional provider-supported structured-output schema subset for the run result. Unsupported fields are rejected before the request is accepted. */
  "output_schema"?: {
    [key: string]: (unknown) | null;
  };
};

export interface TinyfishRunSseInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  headers?: Readonly<Record<string, string>>;
  body: TinyfishRunSseBody;
}

export type TinyfishRunSsePayload = (({
  "type": "STARTED";
  "run_id": string;
  "timestamp": string;
}) | ({
  "type": "STREAMING_URL";
  "run_id": string;
  "streaming_url": string;
  "timestamp": string;
}) | ({
  "type": "COMPLETE";
  "run_id": string;
  "status": "COMPLETED" | "FAILED" | "CANCELLED";
  "error"?: string;
  "help_url"?: string;
  "help_message"?: string;
  "profile_hint"?: {
    "message": string;
    "setup_url": string;
    "reason": "auth_wall" | "bot_challenge";
  };
  "result"?: ({
    [key: string]: (unknown) | null;
  }) | null;
  "timestamp": string;
}) | ({
  "type": "HEARTBEAT";
  "timestamp": string;
}) | ({
  "type": "PROGRESS";
  "run_id": string;
  "purpose": string;
  "tinyfish_api"?: "search" | "fetch";
  "timestamp": string;
}) | ({
  "type": "TF_API_RESULT";
  "run_id": string;
  "tinyfish_api": "search" | "fetch";
  "result": Array<(unknown) | null>;
  "timestamp": string;
}));

export type TinyfishRunBody = {
  /** Target website URL to automate (format uri) */
  "url": string;
  /** Natural language description of what to accomplish on the website (minLength 1) */
  "goal": string;
  /** Browser profile for execution. LITE uses standard browser, STEALTH uses anti-detection browser. */
  "browser_profile"?: "lite" | "stealth";
  /** Name of the integration making this API call (e.g., "dify", "zapier", "n8n"). Used for analytics. */
  "api_integration"?: string;
  /** Agent behavior configuration */
  "agent_config"?: {
    /** Agent behavior mode. "strict" enables fail-fast for test automation. */
    "mode"?: "default" | "strict";
    /** Cursor style for the browser agent. */
    "cursor_style"?: "fish" | "standard" | "green-pointer";
    /** Maximum tool-call steps before the agent stops. Defaults to 150. (min 1, max 500) */
    "max_steps"?: number;
    /** Maximum wall-clock seconds before the agent stops. Defaults to no limit. (min 1) */
    "max_duration_seconds"?: number;
  };
  /** Configure which data to capture during the run. */
  "capture_config"?: {
    "elements"?: boolean;
    "snapshots"?: boolean;
    "screenshots"?: boolean;
    "recording"?: boolean;
    "html"?: boolean;
  };
  /** HTTPS URL to receive webhook notifications for run lifecycle events. Must use HTTPS. (format uri) */
  "webhook_url"?: string;
  /** Opt-in to vault credentials for this run. When true, enabled vault items are included. Defaults to false. */
  "use_vault"?: boolean;
  /** Opt-in to the default Browser Context Profile if Browser Context Profiles are enabled; legacy callers are silently ignored when the profiles feature is disabled. Returns 400 when enabled but no default profile is set. */
  "use_profile"?: boolean;
  /** Browser Context Profile ID to use when use_profile is true. (minLength 1) */
  "profile_id"?: string;
  /** Scope vault credentials to specific credential URIs. Requires use_vault to be true. If omitted with use_vault: true, all enabled items are used. */
  "credential_item_ids"?: Array<string>;
  /** Proxy configuration */
  "proxy_config"?: {
    /** Enable proxy for this automation run */
    "enabled": boolean;
    /** Proxy exit country (ISO 3166-1 alpha-2). Defaults to US. */
    "country_code"?: string;
  };
  /** Optional provider-supported structured-output schema subset for the run result. Unsupported fields are rejected before the request is accepted. */
  "output_schema"?: {
    [key: string]: (unknown) | null;
  };
};

export interface TinyfishRunInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  headers?: Readonly<Record<string, string>>;
  body: TinyfishRunBody;
}

export type TinyfishRunResponse = {
  /** Unique identifier for the automation run */
  "run_id": (string) | null;
  /** Final status of the automation run */
  "status": "COMPLETED" | "FAILED";
  /** ISO 8601 timestamp when the run started */
  "started_at": (string) | null;
  /** ISO 8601 timestamp when the run finished */
  "finished_at": (string) | null;
  /** Number of steps taken during the automation. Null while the run is still in progress. */
  "num_of_steps": (number) | null;
  /** Structured JSON result extracted from the automation. Null if the run failed. */
  "result": ({
    [key: string]: (unknown) | null;
  }) | null;
  /** Error details. Null if the run succeeded. */
  "error": ({
    /** Machine-readable error code for programmatic handling */
    "code"?: string;
    /** Error message describing why the run failed */
    "message": string;
    /** Error category. SYSTEM_FAILURE = TinyFish issue (retry). AGENT_FAILURE = run issue (fix input). BILLING_FAILURE = out of credits (add credits). UNKNOWN = unclassified (treat as retryable). */
    "category": "SYSTEM_FAILURE" | "AGENT_FAILURE" | "BILLING_FAILURE" | "UNKNOWN";
    /** Suggested retry delay in seconds (null if not retryable) */
    "retry_after"?: (number) | null;
    /** URL to documentation for troubleshooting */
    "help_url"?: string;
    /** Human-readable help message with guidance */
    "help_message"?: string;
    /** Optional nudge shown when a failed run is likely solvable by setting up a Browser Context Profile. */
    "profile_hint"?: {
      /** Human-readable profile setup nudge for auth walls and bot challenges. */
      "message": string;
      /** Internal URL to set up the caller’s default Browser Context Profile. */
      "setup_url": string;
      /** Why a Browser Context Profile may solve this failed run. */
      "reason": "auth_wall" | "bot_challenge";
    };
  }) | null;
  /** Optional nudge shown when a failed run is likely solvable by setting up a Browser Context Profile. */
  "profile_hint"?: {
    /** Human-readable profile setup nudge for auth walls and bot challenges. */
    "message": string;
    /** Internal URL to set up the caller’s default Browser Context Profile. */
    "setup_url": string;
    /** Why a Browser Context Profile may solve this failed run. */
    "reason": "auth_wall" | "bot_challenge";
  };
};

export type TinyfishRunAsyncBody = {
  /** Target website URL to automate (format uri) */
  "url": string;
  /** Natural language description of what to accomplish on the website (minLength 1) */
  "goal": string;
  /** Browser profile for execution. LITE uses standard browser, STEALTH uses anti-detection browser. */
  "browser_profile"?: "lite" | "stealth";
  /** Name of the integration making this API call (e.g., "dify", "zapier", "n8n"). Used for analytics. */
  "api_integration"?: string;
  /** Agent behavior configuration */
  "agent_config"?: {
    /** Agent behavior mode. "strict" enables fail-fast for test automation. */
    "mode"?: "default" | "strict";
    /** Cursor style for the browser agent. */
    "cursor_style"?: "fish" | "standard" | "green-pointer";
    /** Maximum tool-call steps before the agent stops. Defaults to 150. (min 1, max 500) */
    "max_steps"?: number;
    /** Maximum wall-clock seconds before the agent stops. Defaults to no limit. (min 1) */
    "max_duration_seconds"?: number;
  };
  /** Configure which data to capture during the run. */
  "capture_config"?: {
    "elements"?: boolean;
    "snapshots"?: boolean;
    "screenshots"?: boolean;
    "recording"?: boolean;
    "html"?: boolean;
  };
  /** HTTPS URL to receive webhook notifications for run lifecycle events. Must use HTTPS. (format uri) */
  "webhook_url"?: string;
  /** Opt-in to vault credentials for this run. When true, enabled vault items are included. Defaults to false. */
  "use_vault"?: boolean;
  /** Opt-in to the default Browser Context Profile if Browser Context Profiles are enabled; legacy callers are silently ignored when the profiles feature is disabled. Returns 400 when enabled but no default profile is set. */
  "use_profile"?: boolean;
  /** Browser Context Profile ID to use when use_profile is true. (minLength 1) */
  "profile_id"?: string;
  /** Scope vault credentials to specific credential URIs. Requires use_vault to be true. If omitted with use_vault: true, all enabled items are used. */
  "credential_item_ids"?: Array<string>;
  /** Proxy configuration */
  "proxy_config"?: {
    /** Enable proxy for this automation run */
    "enabled": boolean;
    /** Proxy exit country (ISO 3166-1 alpha-2). Defaults to US. */
    "country_code"?: string;
  };
  /** Optional provider-supported structured-output schema subset for the run result. Unsupported fields are rejected before the request is accepted. */
  "output_schema"?: {
    [key: string]: (unknown) | null;
  };
};

export interface TinyfishRunAsyncInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  headers?: Readonly<Record<string, string>>;
  body: TinyfishRunAsyncBody;
}

export type TinyfishRunAsyncResponse = {
  /** Unique identifier for the created automation run */
  "run_id": (string) | null;
  /** Error details. Null if successful. */
  "error": ({
    /** Machine-readable error code */
    "code": string;
    /** Error message if run creation failed */
    "message": string;
  }) | null;
};

export type TinyfishRunBatchBody = {
  /** Array of run configurations (1-100) (maxItems 100) */
  "runs": Array<{
    /** Target website URL to automate (format uri) */
    "url": string;
    /** Natural language description of what to accomplish on the website (minLength 1) */
    "goal": string;
    /** Browser profile for execution. LITE uses standard browser, STEALTH uses anti-detection browser. */
    "browser_profile"?: "lite" | "stealth";
    /** Name of the integration making this API call (e.g., "dify", "zapier", "n8n"). Used for analytics. */
    "api_integration"?: string;
    /** Agent behavior configuration */
    "agent_config"?: {
      /** Agent behavior mode. "strict" enables fail-fast for test automation. */
      "mode"?: "default" | "strict";
      /** Cursor style for the browser agent. */
      "cursor_style"?: "fish" | "standard" | "green-pointer";
      /** Maximum tool-call steps before the agent stops. Defaults to 150. (min 1, max 500) */
      "max_steps"?: number;
      /** Maximum wall-clock seconds before the agent stops. Defaults to no limit. (min 1) */
      "max_duration_seconds"?: number;
    };
    /** Configure which data to capture during the run. */
    "capture_config"?: {
      "elements"?: boolean;
      "snapshots"?: boolean;
      "screenshots"?: boolean;
      "recording"?: boolean;
      "html"?: boolean;
    };
    /** HTTPS URL to receive webhook notifications for run lifecycle events. Must use HTTPS. (format uri) */
    "webhook_url"?: string;
    /** Opt-in to vault credentials for this run. When true, enabled vault items are included. Defaults to false. */
    "use_vault"?: boolean;
    /** Opt-in to the default Browser Context Profile if Browser Context Profiles are enabled; legacy callers are silently ignored when the profiles feature is disabled. Returns 400 when enabled but no default profile is set. */
    "use_profile"?: boolean;
    /** Scope vault credentials to specific credential URIs. Requires use_vault to be true. If omitted with use_vault: true, all enabled items are used. */
    "credential_item_ids"?: Array<string>;
    /** Proxy configuration */
    "proxy_config"?: {
      /** Enable proxy for this automation run */
      "enabled": boolean;
      /** Proxy exit country (ISO 3166-1 alpha-2). Defaults to US. */
      "country_code"?: string;
    };
  }>;
  /** Browser Context Profile ID to use when use_profile is true. (minLength 1) */
  "profile_id"?: string;
  /** Optional provider-supported structured-output schema subset applied to every run in the batch. Unsupported fields are rejected before the request is accepted. */
  "output_schema"?: {
    [key: string]: (unknown) | null;
  };
};

export interface TinyfishRunBatchInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  headers?: Readonly<Record<string, string>>;
  body: TinyfishRunBatchBody;
}

export type TinyfishRunBatchResponse = {
  /** Created run IDs. Null if creation failed. */
  "run_ids": (Array<string>) | null;
  /** Error details. Null if successful. */
  "error": ({
    /** Error code */
    "code": string;
    /** Error message */
    "message": string;
    /** Additional error details (validation errors, etc.) */
    "details"?: (unknown) | null;
  }) | null;
};

export type TinyfishListRunsQuery = {
  /** Filter by run status */
  "status"?: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED" | "CANCELLED";
  /** Filter runs by goal text (case-insensitive partial match) (maxLength 500) */
  "goal"?: string;
  /** Filter runs created after this ISO 8601 timestamp (format date-time) */
  "created_after"?: string;
  /** Filter runs created before this ISO 8601 timestamp (format date-time) */
  "created_before"?: string;
  /** Sort order by created_at */
  "sort_direction"?: "asc" | "desc";
  /** Cursor for pagination (from previous response) */
  "cursor"?: string;
  /** Maximum number of results to return (1-100) (min 1, max 100) */
  "limit"?: number;
};

export interface TinyfishListRunsInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  query?: TinyfishListRunsQuery;
  headers?: Readonly<Record<string, string>>;
}

export type TinyfishListRunsResponse = {
  /** Array of runs */
  "data": Array<{
    /** Unique identifier for the run */
    "run_id": string;
    /** Current status of the run */
    "status": "PENDING" | "RUNNING" | "COMPLETED" | "FAILED" | "CANCELLED";
    /** Natural language goal for this automation run */
    "goal": string;
    /** ISO 8601 timestamp when run was created */
    "created_at": string;
    /** ISO 8601 timestamp when run started executing */
    "started_at": (string) | null;
    /** ISO 8601 timestamp when run finished */
    "finished_at": (string) | null;
    /** Number of steps taken during the automation run. Null while the run is still in progress. (min 0) */
    "num_of_steps": (number) | null;
    /** Extracted data from the automation run */
    "result": ({
      [key: string]: (unknown) | null;
    }) | null;
    /** Provider-supported structured-output schema subset originally requested for this run. Null when no output_schema was provided. */
    "output_schema": ({
      [key: string]: (unknown) | null;
    }) | null;
    /** Whether this run attached a Browser Context Profile internally. */
    "profile_attached": boolean;
    /** Browser Context Profile ID attached to this run, or null when no profile attached. */
    "profile_id": (string) | null;
    /** Error details. Null if the run succeeded or is still running. */
    "error": ({
      /** Machine-readable error code for programmatic handling */
      "code"?: string;
      /** Error message describing why the run failed */
      "message": string;
      /** Error category. SYSTEM_FAILURE = TinyFish issue (retry). AGENT_FAILURE = run issue (fix input). BILLING_FAILURE = out of credits (add credits). UNKNOWN = unclassified (treat as retryable). */
      "category": "SYSTEM_FAILURE" | "AGENT_FAILURE" | "BILLING_FAILURE" | "UNKNOWN";
      /** Suggested retry delay in seconds (null if not retryable) */
      "retry_after"?: (number) | null;
      /** URL to documentation for troubleshooting */
      "help_url"?: string;
      /** Human-readable help message with guidance */
      "help_message"?: string;
      /** Optional nudge shown when a failed run is likely solvable by setting up a Browser Context Profile. */
      "profile_hint"?: {
        /** Human-readable profile setup nudge for auth walls and bot challenges. */
        "message": string;
        /** Internal URL to set up the caller’s default Browser Context Profile. */
        "setup_url": string;
        /** Why a Browser Context Profile may solve this failed run. */
        "reason": "auth_wall" | "bot_challenge";
      };
    }) | null;
    /** Optional nudge shown when a failed run is likely solvable by setting up a Browser Context Profile. */
    "profile_hint"?: {
      /** Human-readable profile setup nudge for auth walls and bot challenges. */
      "message": string;
      /** Internal URL to set up the caller’s default Browser Context Profile. */
      "setup_url": string;
      /** Why a Browser Context Profile may solve this failed run. */
      "reason": "auth_wall" | "bot_challenge";
    };
    /** URL to watch live browser session (available while running) */
    "streaming_url": (string) | null;
    /** Browser configuration used for the run */
    "browser_config": ({
      /** Whether proxy was enabled */
      "proxy_enabled": (boolean) | null;
      /** Country code for proxy */
      "proxy_country_code": (string) | null;
    }) | null;
  }>;
  /** Pagination information */
  "pagination": {
    /** Total number of runs matching the current filters */
    "total": number;
    /** Cursor for fetching next page. Null if no more results. */
    "next_cursor": (string) | null;
    /** Whether there are more results after this page */
    "has_more": boolean;
  };
};

export type TinyfishBatchGetRunsBody = {
  /** Array of run IDs (1-100) (maxItems 100) */
  "run_ids": Array<string>;
};

export interface TinyfishBatchGetRunsInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  headers?: Readonly<Record<string, string>>;
  body: TinyfishBatchGetRunsBody;
}

export type TinyfishBatchGetRunsResponse = {
  /** Found runs */
  "data": Array<{
    /** Unique identifier for the run */
    "run_id": string;
    /** Current status of the run */
    "status": "PENDING" | "RUNNING" | "COMPLETED" | "FAILED" | "CANCELLED";
    /** Natural language goal for this automation run */
    "goal": string;
    /** ISO 8601 timestamp when run was created */
    "created_at": string;
    /** ISO 8601 timestamp when run started executing */
    "started_at": (string) | null;
    /** ISO 8601 timestamp when run finished */
    "finished_at": (string) | null;
    /** Number of steps taken during the automation run. Null while the run is still in progress. (min 0) */
    "num_of_steps": (number) | null;
    /** Extracted data from the automation run */
    "result": ({
      [key: string]: (unknown) | null;
    }) | null;
    /** Provider-supported structured-output schema subset originally requested for this run. Null when no output_schema was provided. */
    "output_schema": ({
      [key: string]: (unknown) | null;
    }) | null;
    /** Whether this run attached a Browser Context Profile internally. */
    "profile_attached": boolean;
    /** Browser Context Profile ID attached to this run, or null when no profile attached. */
    "profile_id": (string) | null;
    /** Error details. Null if the run succeeded or is still running. */
    "error": ({
      /** Machine-readable error code for programmatic handling */
      "code"?: string;
      /** Error message describing why the run failed */
      "message": string;
      /** Error category. SYSTEM_FAILURE = TinyFish issue (retry). AGENT_FAILURE = run issue (fix input). BILLING_FAILURE = out of credits (add credits). UNKNOWN = unclassified (treat as retryable). */
      "category": "SYSTEM_FAILURE" | "AGENT_FAILURE" | "BILLING_FAILURE" | "UNKNOWN";
      /** Suggested retry delay in seconds (null if not retryable) */
      "retry_after"?: (number) | null;
      /** URL to documentation for troubleshooting */
      "help_url"?: string;
      /** Human-readable help message with guidance */
      "help_message"?: string;
      /** Optional nudge shown when a failed run is likely solvable by setting up a Browser Context Profile. */
      "profile_hint"?: {
        /** Human-readable profile setup nudge for auth walls and bot challenges. */
        "message": string;
        /** Internal URL to set up the caller’s default Browser Context Profile. */
        "setup_url": string;
        /** Why a Browser Context Profile may solve this failed run. */
        "reason": "auth_wall" | "bot_challenge";
      };
    }) | null;
    /** Optional nudge shown when a failed run is likely solvable by setting up a Browser Context Profile. */
    "profile_hint"?: {
      /** Human-readable profile setup nudge for auth walls and bot challenges. */
      "message": string;
      /** Internal URL to set up the caller’s default Browser Context Profile. */
      "setup_url": string;
      /** Why a Browser Context Profile may solve this failed run. */
      "reason": "auth_wall" | "bot_challenge";
    };
    /** URL to watch live browser session (available while running) */
    "streaming_url": (string) | null;
    /** Browser configuration used for the run */
    "browser_config": ({
      /** Whether proxy was enabled */
      "proxy_enabled": (boolean) | null;
      /** Country code for proxy */
      "proxy_country_code": (string) | null;
    }) | null;
    /** Presigned URL to the video recording of this run. Null if no recording is available. URL expires after 15 minutes. */
    "video_url": (string) | null;
    /** Steps the agent took during this run. */
    "steps": Array<{
      /** Unique identifier for this step */
      "id": string;
      /** ISO 8601 timestamp when this step occurred */
      "timestamp": string;
      /** Current status of the run */
      "status": "PENDING" | "RUNNING" | "COMPLETED" | "FAILED" | "CANCELLED";
      /** Description of the action taken in this step */
      "action": (string) | null;
      /** Screenshot for this step. Format depends on the screenshots query param: base64 returns a data URI (data:image/jpeg;base64,...), url returns an absolute URL to the screenshot. Null if screenshots=none or no screenshot available. */
      "screenshot": (string) | null;
      /** URL to the full-page HTML snapshot captured at this step. Null if html=none or no HTML was captured. Requires capture_config.html: true when starting the run. */
      "html": (string) | null;
      /** Time taken for this step */
      "duration": (string) | null;
    }>;
  }>;
  /** Run IDs that were not found or not owned. Null if all found. */
  "not_found": (Array<string>) | null;
};

export type TinyfishBatchCancelRunsBody = {
  /** Array of run IDs (1-100) (maxItems 100) */
  "run_ids": Array<string>;
};

export interface TinyfishBatchCancelRunsInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  headers?: Readonly<Record<string, string>>;
  body: TinyfishBatchCancelRunsBody;
}

export type TinyfishBatchCancelRunsResponse = {
  /** Results for runs that were found and processed (cancelled or already terminal) */
  "results": Array<{
    /** The unique identifier of the run */
    "run_id": string;
    /** The current status of the run. Returns actual status for idempotent responses (e.g., COMPLETED if run already finished) */
    "status": "CANCELLED" | "COMPLETED" | "FAILED";
    /** ISO 8601 timestamp when the run was cancelled, or null if not cancelled */
    "cancelled_at": (string) | null;
    /** Additional context about the cancellation result (e.g., "Run already cancelled", "Run already finished") */
    "message": (string) | null;
  }>;
  /** Run IDs that were not found or not owned. Null if all found. */
  "not_found": (Array<string>) | null;
};

export type TinyfishGetRunByIdPath = {
  /** Run ID */
  "id": string;
};

export type TinyfishGetRunByIdQuery = {
  /** Screenshot delivery mode. url: absolute URLs to screenshot images. base64: inline data URIs. none: omit screenshots. Defaults to url. */
  "screenshots"?: "base64" | "url" | "none";
  /** HTML snapshot delivery mode. url: absolute URLs to HTML snapshot pages (only non-null when capture_config.html was enabled). none: omit HTML URLs. Defaults to url. */
  "html"?: "url" | "none";
};

export interface TinyfishGetRunByIdInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  path: TinyfishGetRunByIdPath;
  query?: TinyfishGetRunByIdQuery;
  headers?: Readonly<Record<string, string>>;
}

export type TinyfishGetRunByIdResponse = {
  /** Unique identifier for the run */
  "run_id": string;
  /** Current status of the run */
  "status": "PENDING" | "RUNNING" | "COMPLETED" | "FAILED" | "CANCELLED";
  /** Natural language goal for this automation run */
  "goal": string;
  /** ISO 8601 timestamp when run was created */
  "created_at": string;
  /** ISO 8601 timestamp when run started executing */
  "started_at": (string) | null;
  /** ISO 8601 timestamp when run finished */
  "finished_at": (string) | null;
  /** Number of steps taken during the automation run. Null while the run is still in progress. (min 0) */
  "num_of_steps": (number) | null;
  /** Extracted data from the automation run */
  "result": ({
    [key: string]: (unknown) | null;
  }) | null;
  /** Provider-supported structured-output schema subset originally requested for this run. Null when no output_schema was provided. */
  "output_schema": ({
    [key: string]: (unknown) | null;
  }) | null;
  /** Whether this run attached a Browser Context Profile internally. */
  "profile_attached": boolean;
  /** Browser Context Profile ID attached to this run, or null when no profile attached. */
  "profile_id": (string) | null;
  /** Error details. Null if the run succeeded or is still running. */
  "error": ({
    /** Machine-readable error code for programmatic handling */
    "code"?: string;
    /** Error message describing why the run failed */
    "message": string;
    /** Error category. SYSTEM_FAILURE = TinyFish issue (retry). AGENT_FAILURE = run issue (fix input). BILLING_FAILURE = out of credits (add credits). UNKNOWN = unclassified (treat as retryable). */
    "category": "SYSTEM_FAILURE" | "AGENT_FAILURE" | "BILLING_FAILURE" | "UNKNOWN";
    /** Suggested retry delay in seconds (null if not retryable) */
    "retry_after"?: (number) | null;
    /** URL to documentation for troubleshooting */
    "help_url"?: string;
    /** Human-readable help message with guidance */
    "help_message"?: string;
    /** Optional nudge shown when a failed run is likely solvable by setting up a Browser Context Profile. */
    "profile_hint"?: {
      /** Human-readable profile setup nudge for auth walls and bot challenges. */
      "message": string;
      /** Internal URL to set up the caller’s default Browser Context Profile. */
      "setup_url": string;
      /** Why a Browser Context Profile may solve this failed run. */
      "reason": "auth_wall" | "bot_challenge";
    };
  }) | null;
  /** Optional nudge shown when a failed run is likely solvable by setting up a Browser Context Profile. */
  "profile_hint"?: {
    /** Human-readable profile setup nudge for auth walls and bot challenges. */
    "message": string;
    /** Internal URL to set up the caller’s default Browser Context Profile. */
    "setup_url": string;
    /** Why a Browser Context Profile may solve this failed run. */
    "reason": "auth_wall" | "bot_challenge";
  };
  /** URL to watch live browser session (available while running) */
  "streaming_url": (string) | null;
  /** Browser configuration used for the run */
  "browser_config": ({
    /** Whether proxy was enabled */
    "proxy_enabled": (boolean) | null;
    /** Country code for proxy */
    "proxy_country_code": (string) | null;
  }) | null;
  /** Presigned URL to the video recording of this run. Null if no recording is available. URL expires after 15 minutes. */
  "video_url": (string) | null;
  /** Steps the agent took during this run. */
  "steps": Array<{
    /** Unique identifier for this step */
    "id": string;
    /** ISO 8601 timestamp when this step occurred */
    "timestamp": string;
    /** Current status of the run */
    "status": "PENDING" | "RUNNING" | "COMPLETED" | "FAILED" | "CANCELLED";
    /** Description of the action taken in this step */
    "action": (string) | null;
    /** Screenshot for this step. Format depends on the screenshots query param: base64 returns a data URI (data:image/jpeg;base64,...), url returns an absolute URL to the screenshot. Null if screenshots=none or no screenshot available. */
    "screenshot": (string) | null;
    /** URL to the full-page HTML snapshot captured at this step. Null if html=none or no HTML was captured. Requires capture_config.html: true when starting the run. */
    "html": (string) | null;
    /** Time taken for this step */
    "duration": (string) | null;
  }>;
};

export type TinyfishCancelRunByIdPath = {
  /** Run ID */
  "id": string;
};

export interface TinyfishCancelRunByIdInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  path: TinyfishCancelRunByIdPath;
  headers?: Readonly<Record<string, string>>;
}

export type TinyfishCancelRunByIdResponse = {
  /** The unique identifier of the run */
  "run_id": string;
  /** The current status of the run. Returns actual status for idempotent responses (e.g., COMPLETED if run already finished) */
  "status": "CANCELLED" | "COMPLETED" | "FAILED";
  /** ISO 8601 timestamp when the run was cancelled, or null if not cancelled */
  "cancelled_at": (string) | null;
  /** Additional context about the cancellation result (e.g., "Run already cancelled", "Run already finished") */
  "message": (string) | null;
};

export type TinyfishGetStepScreenshotPath = {
  /** Run ID */
  "id": string;
  /** Step ID (event ID) */
  "stepId": string;
};

export interface TinyfishGetStepScreenshotInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  path: TinyfishGetStepScreenshotPath;
  headers?: Readonly<Record<string, string>>;
}

export type TinyfishGetStepHtmlPath = {
  /** Run ID */
  "id": string;
  /** Step ID (event ID) */
  "stepId": string;
};

export interface TinyfishGetStepHtmlInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  path: TinyfishGetStepHtmlPath;
  headers?: Readonly<Record<string, string>>;
}

export interface TinyfishListBrowserContextProfilesInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  headers?: Readonly<Record<string, string>>;
}

export type TinyfishListBrowserContextProfilesResponse = {
  "profiles": Array<{
    /** Browser Context Profile ID (minLength 1) */
    "id": string;
    /** Browser Context Profile display name */
    "name": string;
    "proxy_country_code"?: (string) | null;
    "is_default"?: boolean;
    "fingerprint_seed"?: string;
    /**  (min 0) */
    "domain_count"?: number;
    "created_at": string;
    "updated_at"?: string;
    /** Sites TinyFish saw the user sign in to during a setup, or that the user confirmed when saving it, whose cookies are still saved. Does not guarantee the session is still valid. Omitted when sign-in tracking is not enabled for the account. */
    "signed_in_sites"?: Array<{
      /** Registered domain (eTLD+1) */
      "site": string;
      "claimed_at": string;
    }>;
  }>;
};

export type TinyfishCreateBrowserContextProfileBody = {
  /**  (minLength 1, maxLength 100) */
  "name": string;
  "set_as_default"?: boolean;
  "proxy_country_code"?: (string) | null;
};

export interface TinyfishCreateBrowserContextProfileInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  headers?: Readonly<Record<string, string>>;
  body: TinyfishCreateBrowserContextProfileBody;
}

export type TinyfishCreateBrowserContextProfileResponse = {
  /** Browser Context Profile ID (minLength 1) */
  "id": string;
  /** Browser Context Profile display name */
  "name": string;
  "proxy_country_code"?: (string) | null;
  "is_default"?: boolean;
  "fingerprint_seed"?: string;
  /**  (min 0) */
  "domain_count"?: number;
  "created_at": string;
  "updated_at"?: string;
};

export type TinyfishGetBrowserContextProfilePath = {
  /** Browser Context Profile ID (minLength 1) */
  "profileId": string;
};

export interface TinyfishGetBrowserContextProfileInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  path: TinyfishGetBrowserContextProfilePath;
  headers?: Readonly<Record<string, string>>;
}

export type TinyfishGetBrowserContextProfileResponse = {
  /** Browser Context Profile ID (minLength 1) */
  "id": string;
  /** Browser Context Profile display name */
  "name": string;
  "proxy_country_code"?: (string) | null;
  "is_default"?: boolean;
  "fingerprint_seed"?: string;
  /**  (min 0) */
  "domain_count"?: number;
  "created_at": string;
  "updated_at"?: string;
  "domains": Array<{
    "domain": string;
    /**  (min 0) */
    "cookie_count": number;
    /**  (min 0) */
    "local_storage_origin_count": number;
    "last_accessed_at": string;
    "last_written_at": string;
    "last_written_by_run_id": string;
  }>;
};

export type TinyfishUpdateBrowserContextProfilePath = {
  /** Browser Context Profile ID (minLength 1) */
  "profileId": string;
};

export type TinyfishUpdateBrowserContextProfileBody = {
  /**  (minLength 1, maxLength 100) */
  "name"?: string;
  "set_as_default"?: boolean;
  "proxy_country_code"?: (string) | null;
};

export interface TinyfishUpdateBrowserContextProfileInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  path: TinyfishUpdateBrowserContextProfilePath;
  headers?: Readonly<Record<string, string>>;
  body?: TinyfishUpdateBrowserContextProfileBody;
}

export type TinyfishUpdateBrowserContextProfileResponse = {
  /** Browser Context Profile ID (minLength 1) */
  "id": string;
  /** Browser Context Profile display name */
  "name": string;
  "proxy_country_code"?: (string) | null;
  "is_default"?: boolean;
  "fingerprint_seed"?: string;
  /**  (min 0) */
  "domain_count"?: number;
  "created_at": string;
  "updated_at"?: string;
  "domains": Array<{
    "domain": string;
    /**  (min 0) */
    "cookie_count": number;
    /**  (min 0) */
    "local_storage_origin_count": number;
    "last_accessed_at": string;
    "last_written_at": string;
    "last_written_by_run_id": string;
  }>;
};

export type TinyfishDeleteBrowserContextProfilePath = {
  /** Browser Context Profile ID (minLength 1) */
  "profileId": string;
};

export interface TinyfishDeleteBrowserContextProfileInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  path: TinyfishDeleteBrowserContextProfilePath;
  headers?: Readonly<Record<string, string>>;
}

export type TinyfishDeleteBrowserContextProfileResponse = {
  "deleted": boolean;
};

export type TinyfishCreateBrowserContextProfileSetupSessionPath = {
  /** Browser Context Profile ID (minLength 1) */
  "profileId": string;
};

export type TinyfishCreateBrowserContextProfileSetupSessionBody = {
  /** Target URL the browser session will navigate to on startup. Bare domains (e.g. tinyfish.ai) are automatically prefixed with https://. If omitted, the browser starts at about:blank. */
  "url"?: string;
  /** Inactivity timeout in seconds (5–86400). If omitted, null, or greater than your plan maximum, the plan maximum is used. (min 5, max 86400) */
  "timeout_seconds"?: (number) | null;
};

export interface TinyfishCreateBrowserContextProfileSetupSessionInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  path: TinyfishCreateBrowserContextProfileSetupSessionPath;
  headers?: Readonly<Record<string, string>>;
  body?: TinyfishCreateBrowserContextProfileSetupSessionBody;
}

export type TinyfishCreateBrowserContextProfileSetupSessionResponse = {
  /** Unique identifier for this browser session. (minLength 1) */
  "session_id": string;
  /** WebSocket URL for browser connection. Pass this to Playwright's connect_over_cdp or any WebSocket-based CDP client. (format uri) */
  "cdp_url": string;
  /** HTTPS base URL for the session. Use to access session endpoints such as /pages. (format uri) */
  "base_url": string;
  "timeout_seconds": number;
  "expires_at": string;
};

export type TinyfishCancelBrowserContextProfileSetupSessionPath = {
  /** Browser Context Profile ID (minLength 1) */
  "profileId": string;
};

export type TinyfishCancelBrowserContextProfileSetupSessionBody = {
  /**  (minLength 1) */
  "session_id": string;
};

export interface TinyfishCancelBrowserContextProfileSetupSessionInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  path: TinyfishCancelBrowserContextProfileSetupSessionPath;
  headers?: Readonly<Record<string, string>>;
  body: TinyfishCancelBrowserContextProfileSetupSessionBody;
}

export type TinyfishCancelBrowserContextProfileSetupSessionResponse = {
  "cancelled": boolean;
};

export type TinyfishSaveBrowserContextProfileSetupSessionPath = {
  /** Browser Context Profile ID (minLength 1) */
  "profileId": string;
};

export type TinyfishSaveBrowserContextProfileSetupSessionBody = {
  /**  (minLength 1) */
  "session_id": string;
  /** Sites the user says they signed into during this setup, as hosts or URLs. Each is recorded as signed in only if this save wrote cookies for it; for sites TinyFish can check, its sign-in cookie must be saved too. Ignored when sign-in tracking is not enabled for the account. (maxItems 20) */
  "signed_in_sites"?: Array<string>;
};

export interface TinyfishSaveBrowserContextProfileSetupSessionInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  path: TinyfishSaveBrowserContextProfileSetupSessionPath;
  headers?: Readonly<Record<string, string>>;
  body: TinyfishSaveBrowserContextProfileSetupSessionBody;
}

export type TinyfishSaveBrowserContextProfileSetupSessionResponse = {
  "domains_updated": Array<string>;
  "domains_failed": Array<string>;
  /**  (min 0) */
  "cookie_count": number;
  "domains_skipped": {
    "cookies_skipped": Array<string>;
    "local_storage_skipped": Array<string>;
    "session_storage_skipped": Array<string>;
    "blob_too_large": Array<string>;
  };
  /**  (min 0) */
  "pages_captured"?: number;
  /**  (min 0) */
  "target_reads_skipped"?: number;
  "cleanup_failed"?: boolean;
  "cleanup_kind"?: string;
  /** Sites this save recorded as signed in, from sign-in cookies set during setup. Omitted when sign-in tracking is not enabled for the account. */
  "signed_in_sites"?: Array<string>;
  /** Whether TinyFish saw a sign-in to the site setup started on. unverifiable when it cannot tell. Omitted when sign-in tracking is not enabled for the account. */
  "sign_in"?: {
    "site": (string) | null;
    "status": "recorded" | "already_recorded" | "not_detected" | "unverifiable";
  };
  /** Present when the request sent signed_in_sites and sign-in tracking is enabled for the account: the registered domains recorded as signed in, and the sites rejected with a reason. */
  "user_confirmed_sites"?: {
    "recorded": Array<string>;
    "rejected": Array<{
      "site": string;
      "reason": "invalid_site" | "not_saved" | "no_sign_in_cookie" | "record_failed";
    }>;
  };
};

export type TinyfishUploadBrowserContextProfileStatePath = {
  /** Browser Context Profile ID (minLength 1) */
  "profileId": string;
};

export type TinyfishUploadBrowserContextProfileStateBody = {
  /**  (maxItems 3000) */
  "cookies": Array<{
    /**  (minLength 1, maxLength 4096) */
    "name": string;
    /**  (maxLength 16384) */
    "value": string;
    /**  (minLength 1, maxLength 255) */
    "domain": string;
    /**  (maxLength 4096) */
    "path"?: string;
    "httpOnly"?: boolean;
    "secure"?: boolean;
    "sameSite"?: "Strict" | "Lax" | "None";
    "expires"?: number;
    /**  (maxLength 10) */
    "sourceScheme"?: string;
    "sourcePort"?: number;
    /**  (maxLength 255) */
    "partitionKey"?: (string) | null;
    "priority"?: "Low" | "Medium" | "High";
    [key: string]: (unknown) | null;
  }>;
  /**  (maxItems 100) */
  "localStorage"?: Array<{
    /**  (minLength 1, maxLength 2048) */
    "origin": string;
    "items": Array<{
      /**  (maxLength 4096) */
      "name": string;
      /**  (maxLength 5242880) */
      "value": string;
    }>;
  }>;
  /**  (maxItems 100) */
  "sessionStorage"?: Array<{
    /**  (minLength 1, maxLength 2048) */
    "origin": string;
    "items": Array<{
      /**  (maxLength 4096) */
      "name": string;
      /**  (maxLength 5242880) */
      "value": string;
    }>;
  }>;
};

export interface TinyfishUploadBrowserContextProfileStateInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  path: TinyfishUploadBrowserContextProfileStatePath;
  headers?: Readonly<Record<string, string>>;
  body: TinyfishUploadBrowserContextProfileStateBody;
}

export type TinyfishUploadBrowserContextProfileStateResponse = {
  "domains_updated": Array<string>;
  "domains_failed": Array<string>;
  /**  (min 0) */
  "cookie_count": number;
  "domains_skipped": {
    "cookies_skipped": Array<string>;
    "local_storage_skipped": Array<string>;
    "session_storage_skipped": Array<string>;
    "blob_too_large": Array<string>;
  };
};

export type TinyfishDeleteBrowserContextProfileDomainPath = {
  /** Browser Context Profile ID (minLength 1) */
  "profileId": string;
  /** Domain to remove from the Browser Context Profile (minLength 1) */
  "domain": string;
};

export interface TinyfishDeleteBrowserContextProfileDomainInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  path: TinyfishDeleteBrowserContextProfileDomainPath;
  headers?: Readonly<Record<string, string>>;
}

export type TinyfishDeleteBrowserContextProfileDomainResponse = {
  "deleted": boolean;
};

export type TinyfishConnectVaultBody = {
  /** Vault provider identifier. */
  "provider": "1password" | "bitwarden";
  /** 1Password service account token. Required when provider is 1password. */
  "token"?: string;
  /** Bitwarden client ID. Required when provider is bitwarden. */
  "clientId"?: string;
  /** Bitwarden client secret. Required when provider is bitwarden. */
  "clientSecret"?: string;
  /** Bitwarden master password. Required when provider is bitwarden. */
  "masterPassword"?: string;
  /** Optional self-hosted Bitwarden server URL. (format uri) */
  "serverUrl"?: string;
};

export interface TinyfishConnectVaultInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  headers?: Readonly<Record<string, string>>;
  body: TinyfishConnectVaultBody;
}

export type TinyfishConnectVaultResponse = {
  "connectionId": string;
  "connected": true;
  /** Vault provider identifier. */
  "provider": "1password" | "bitwarden";
  "items": Array<{
    "itemId": string;
    "connectionId": (string) | null;
    "label": string;
    "vaultName": string;
    "domains": Array<string>;
    "fieldMetadata": Array<{
      "fieldId": string;
      "label": string;
      "type": "STRING" | "CONCEALED" | "OTP";
    }>;
    "hasTotp": boolean;
  }>;
};

export interface TinyfishListVaultConnectionsInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  headers?: Readonly<Record<string, string>>;
}

export type TinyfishListVaultConnectionsResponse = {
  "connections": Array<{
    "id": string;
    /** Vault provider identifier. */
    "provider": "1password" | "bitwarden";
    "connectionStatus": string;
    "lastValidatedAt": (string) | null;
  }>;
};

export type TinyfishDisconnectVaultPath = {
  "connectionId": string;
};

export interface TinyfishDisconnectVaultInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  path: TinyfishDisconnectVaultPath;
  headers?: Readonly<Record<string, string>>;
}

export type TinyfishDisconnectVaultResponse = {
  "disconnected": true;
  "connectionId": string;
};

export interface TinyfishListVaultItemsInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  headers?: Readonly<Record<string, string>>;
}

export type TinyfishListVaultItemsResponse = {
  "items": Array<{
    "itemId": string;
    "connectionId": (string) | null;
    "label": string;
    "vaultName": string;
    "domains": Array<string>;
    "fieldMetadata": Array<{
      "fieldId": string;
      "label": string;
      "type": "STRING" | "CONCEALED" | "OTP";
    }>;
    "hasTotp": boolean;
  }>;
};

export interface TinyfishSyncVaultItemsInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  headers?: Readonly<Record<string, string>>;
}

export type TinyfishSyncVaultItemsResponse = {
  "items": Array<{
    "itemId": string;
    "connectionId": (string) | null;
    "label": string;
    "vaultName": string;
    "domains": Array<string>;
    "fieldMetadata": Array<{
      "fieldId": string;
      "label": string;
      "type": "STRING" | "CONCEALED" | "OTP";
    }>;
    "hasTotp": boolean;
  }>;
  "sync_summary": {
    /**  (min 0) */
    "added": number;
    /**  (min 0) */
    "updated": number;
    /**  (min 0) */
    "removed": number;
  };
};

export interface TinyfishGetWalletInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  headers?: Readonly<Record<string, string>>;
}

export type TinyfishGetWalletResponse = {
  /** Current spendable balance, denominated in `currency`. A negative value means the wallet is overdrawn. */
  "available_balance": string;
  "currency": "USD";
  /**  (format date-time) */
  "as_of": string;
  /** null means the auto-reload contract read failed, not that it is unconfigured. */
  "auto_reload": (({
    "state": "unconfigured";
  }) | ({
    "state": "on";
    /** Balance floor that triggers a reload, denominated in the response's `currency`. */
    "threshold": string;
    /** Balance the wallet is topped up to when a reload triggers, denominated in the response's `currency`. */
    "recharge_to": string;
  }) | ({
    "state": "off";
    /** Balance floor that triggers a reload, denominated in the response's `currency`. */
    "threshold": string;
    /** Balance the wallet is topped up to when a reload triggers, denominated in the response's `currency`. */
    "recharge_to": string;
  }) | ({
    "state": "paused_payment_failed";
    /** Balance floor that triggers a reload, denominated in the response's `currency`. */
    "threshold": string;
    /** Balance the wallet is topped up to when a reload triggers, denominated in the response's `currency`. */
    "recharge_to": string;
  }) | ({
    "state": "needs_payment_method";
    /** Balance floor that triggers a reload, denominated in the response's `currency`. */
    "threshold": string;
    /** Balance the wallet is topped up to when a reload triggers, denominated in the response's `currency`. */
    "recharge_to": string;
  }) | ((unknown) | null));
  /** null means no in-flight top-up, or the ledger read failed. */
  "pending_top_up": ({
    /** Amount of the in-flight top-up, denominated in the response's `currency`. */
    "amount": string;
    /**  (format date-time) */
    "started_at": string;
  }) | null;
  /** null means the rates read failed, or the wallet has no rate contract yet. */
  "rates": ({
    "meters": Array<{
      /** Human-readable meter label. */
      "label": string;
      /** Per-unit rate, decimal USD string. */
      "unit_amount": string;
      "currency": "USD";
      /** Billable unit this meter charges per (e.g. "step"). Absent when unlabeled. */
      "per"?: string;
    }>;
    /**  (format date-time) */
    "as_of": string;
  }) | null;
  /** Present when an agent can add funds itself: POST here and pay the 402 MPP challenge. (format uri) */
  "agent_top_up_url"?: string;
};

export type TinyfishTopUpWalletBody = {
  /** Amount to add in USD, from 10.00 to 500.00. Charged over MPP once the agent presents a payment credential. */
  "amount": string;
};

export interface TinyfishTopUpWalletInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  headers?: Readonly<Record<string, string>>;
  body: TinyfishTopUpWalletBody;
}

export type TinyfishTopUpWalletResponse = {
  /** settled: the wallet is credited. pending (HTTP 202): the card was charged and the credit lands shortly via webhook; do not pay again. */
  "status": "settled" | "pending";
  "amount": string;
  "currency": "USD";
  /** Stripe PaymentIntent that settled this top-up. */
  "payment_reference": string;
  "ledger_entry_id": (string) | null;
  /** Spendable balance after the credit landed; null when pending or unreadable. */
  "available_balance": (string) | null;
  /** On a 202: do not pay again. */
  "hint"?: string;
};

export type TinyfishSearchQuery = {
  /** Search query (minLength 1, maxLength 2000) */
  "query": string;
  /** Why this search is being run — the underlying goal or task the results will be used for. Used to better rank results against your intent. (minLength 1, maxLength 2000) */
  "purpose"?: string;
  /** Country code for geo-targeted results */
  "location"?: string;
  /** Language code for result language */
  "language"?: string;
  /** Comma-separated list of domains to restrict results to */
  "include_domains"?: string;
  /** Comma-separated list of domains to exclude from results */
  "exclude_domains"?: string;
  /** Type of search to perform: "web" for standard results, "news" for news articles, "research_paper" for academic papers. Defaults to "web". */
  "domain_type"?: "web" | "news" | "research_paper";
  /** Return results after this date (YYYY-MM-DD) */
  "after_date"?: string;
  /** Return results before this date (YYYY-MM-DD) */
  "before_date"?: string;
  /** Return results from the past N minutes (1 to 5,256,000). (min 1, max 5256000) */
  "recency_minutes"?: number;
  /** Return research papers published on or after this year (0-9999, inclusive). Only supported for domain_type=research_paper. (min 0, max 9999) */
  "pub_year_min"?: number;
  /** Return research papers published on or before this year (0-9999, inclusive). Only supported for domain_type=research_paper. (min 0, max 9999) */
  "pub_year_max"?: number;
  /** Page number for pagination, starting from 0 (max 10) (min 0, max 10) */
  "page"?: (number) | null;
  /** When "true", each result includes a thumbnail_url when available. Defaults to false. */
  "include_thumbnail"?: "true" | "false";
  /** JSON-encoded fetch configuration object. (maxLength 256) */
  "fetch"?: string;
};

export interface TinyfishSearchInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  query: TinyfishSearchQuery;
  headers?: Readonly<Record<string, string>>;
}

export type TinyfishSearchResponse = {
  /** The search query that was executed */
  "query": string;
  /** Array of search results */
  "results": Array<{
    /** Position in search results */
    "position": number;
    /** Site name */
    "site_name": string;
    /** Text snippet from the result */
    "snippet": string;
    /** Page title */
    "title": string;
    /** Result URL (format uri) */
    "url": string;
    /** Thumbnail image URL, present only when include_thumbnail=true and a thumbnail is available (format uri) */
    "thumbnail_url"?: string;
    /** Fetched page content, present only when fetch param is supplied */
    "fetch"?: (unknown) | null;
    /** Fetch error details when fetch was requested. Contains details on failure; may be null when fetching succeeds. */
    "fetch_error"?: (unknown) | null;
    /** Publication date, present for news and some web results */
    "date"?: string;
    /** Publisher name, present for news results when domain_type=news */
    "publisher"?: string;
    /** Author list, present for academic results when domain_type=research_paper */
    "authors"?: Array<string>;
    /** Journal or conference name, present when domain_type=research_paper */
    "venue"?: string;
    /** Publication year, present when domain_type=research_paper */
    "year"?: number;
    /** Citation count, present when domain_type=research_paper */
    "cited_by_count"?: number;
    /** PDF URL, present when domain_type=research_paper and a PDF is available */
    "pdf_url"?: string;
  }>;
  /** Total number of results */
  "total_results": number;
  /** The current page number, starting from 0 */
  "page": number;
  /** Request correlation ID, also returned as the X-Request-ID response header. Present only when any result carries a fetch_error; include it when reporting failed fetches. */
  "request_id"?: string;
};

export type TinyfishListSearchUsageQuery = {
  /**  (format date-time) */
  "start_after"?: string;
  /**  (format date-time) */
  "end_before"?: string;
  "status"?: "completed" | "failed";
  /**  (min 1, max 1000) */
  "limit"?: number;
  /**  (min 1) */
  "page"?: number;
};

export interface TinyfishListSearchUsageInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  query?: TinyfishListSearchUsageQuery;
  headers?: Readonly<Record<string, string>>;
}

export type TinyfishListSearchUsageResponse = {
  "items": Array<{
    "id": number;
    "request_id": string;
    "query": string;
    "status_code": number;
    "result_count": number;
    "results": (Array<{
      /** Position in search results */
      "position": number;
      /** Site name */
      "site_name": string;
      /** Text snippet from the result */
      "snippet": string;
      /** Page title */
      "title": string;
      /** Result URL (format uri) */
      "url": string;
      /** Thumbnail image URL, present only when include_thumbnail=true and a thumbnail is available (format uri) */
      "thumbnail_url"?: string;
      /** Fetched page content, present only when fetch param is supplied */
      "fetch"?: (unknown) | null;
      /** Fetch error details when fetch was requested. Contains details on failure; may be null when fetching succeeds. */
      "fetch_error"?: (unknown) | null;
      /** Publication date, present for news and some web results */
      "date"?: string;
      /** Publisher name, present for news results when domain_type=news */
      "publisher"?: string;
      /** Author list, present for academic results when domain_type=research_paper */
      "authors"?: Array<string>;
      /** Journal or conference name, present when domain_type=research_paper */
      "venue"?: string;
      /** Publication year, present when domain_type=research_paper */
      "year"?: number;
      /** Citation count, present when domain_type=research_paper */
      "cited_by_count"?: number;
      /** PDF URL, present when domain_type=research_paper and a PDF is available */
      "pdf_url"?: string;
    }>) | null;
    "cached": (boolean) | null;
    "response_size_bytes": (number) | null;
    /**  (format date-time) */
    "created_at": string;
  }>;
  "total": number;
  "limit": number;
  "page": number;
  "total_pages": number;
  "has_more": boolean;
};

export type TinyfishFetchUrlsBody = {
  /** Array of URLs to fetch (1-10). All URLs are fetched in parallel. Each URL is processed independently — if one fails, others still return successfully. Errors are reported per-URL in the errors array. (maxItems 10) */
  "urls": Array<string>;
  /** Why these URLs are being fetched — the underlying goal or task the content will be used for. Used to better tailor fetching and extraction to your intent. (minLength 1, maxLength 2000) */
  "purpose"?: string;
  /** Output format for extracted content. "markdown" (default) is ideal for LLM consumption. "html" returns cleaned semantic HTML. "json" returns a structured document tree. */
  "format"?: "markdown" | "html" | "json";
  /** Extract all outbound links (<a href>) from each page. Useful for discovering related pages or navigating to specific content. Links are returned as absolute URLs in the links array of each result. */
  "links"?: boolean;
  /** Extract all image URLs (<img src>) from each page. Useful for finding visual content or media assets. Image links are returned as absolute URLs in the image_links array of each result. */
  "image_links"?: boolean;
  /** Extract the src URLs of <iframe> elements on each page. Useful when a page embeds its main content in a frame (job boards, booking widgets, document viewers): fetch the returned URL to read the embedded content. Iframe links are returned as absolute, deduplicated URLs in the ifra */
  "iframe_links"?: boolean;
  /** Return page-head metadata for each page in the page_metadata object of each result: canonical URL, favicon, robots directive, generator, viewport, keywords, all Open Graph (og), Twitter card (twitter), and article tags, and remaining named meta tags under `other`. Useful for SEO/ */
  "page_metadata"?: boolean;
  /** Caller freshness tolerance in seconds for the cached entry. Omit (default) for unlimited tolerance — any cached entry is acceptable. Set to 0 to prefer a live fetch; a cached entry is still served if the origin's Cache-Control: max-age covers its age, or the host is in the small  (min 0) */
  "ttl"?: number;
  /** Wall-clock timeout budget in milliseconds applied independently to each URL. If one URL exceeds this budget, it returns a per-URL timeout error while other URLs in the same request continue. (min 1, max 110000) */
  "per_url_timeout_ms"?: number;
  /** ETag validator from a prior fetch of this URL, forwarded verbatim as the If-None-Match header on the origin request. Only valid with a single URL — combining with a batch of URLs returns a 400. tf-fetch does not persist validators; the caller owns replaying them. (minLength 1) */
  "if_none_match"?: string;
  /** Last-Modified validator from a prior fetch of this URL, forwarded verbatim as the If-Modified-Since header on the origin request. Only valid with a single URL — combining with a batch of URLs returns a 400. tf-fetch does not persist validators; the caller owns replaying them. (minLength 1) */
  "if_modified_since"?: string;
  /** Opt-in to receiving `etag` / `last_modified` validators (and `not_modified` detection) on each result. Defaults to false — tf-fetch omits these fields unless requested. Independent of `if_none_match` / `if_modified_since`: works with a single URL or a batch. */
  "include_etag_and_last_modified"?: boolean;
  /** Array of CSS selectors (1-20 entries, each 1-1000 characters) that scope extracted content (`text`, `links`, `image_links`) to elements matching ANY entry, concatenated in document order. Tag selectors cover semantic sections (`main`, `article`, `nav`); entries may themselves use (maxItems 20) */
  "include_selectors"?: Array<string>;
  /** Array of CSS selectors (1-20 entries, each 1-1000 characters) for elements to remove before extraction — applied before `include_selectors` scopes what remains, so it also prunes inside selected regions. Entries may themselves use CSS comma-grouping. Entries that match nothing ar (maxItems 20) */
  "exclude_selectors"?: Array<string>;
};

export interface TinyfishFetchUrlsInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  headers?: Readonly<Record<string, string>>;
  body: TinyfishFetchUrlsBody;
}

export type TinyfishFetchUrlsResponse = {
  /** Successfully fetched URLs */
  "results": Array<{
    /** Original requested URL */
    "url": string;
    /** Final URL after redirects */
    "final_url": (string) | null;
    /** Page title */
    "title": (string) | null;
    /** Page meta description */
    "description": (string) | null;
    /** Detected language code */
    "language": (string) | null;
    /** Format of the extracted text */
    "format": "markdown" | "html" | "json";
    /** Extracted content (string for markdown/html, object for json). Null if extraction failed. */
    "text": ((string) | (unknown) | ((unknown) | null));
    /** Page author if available */
    "author": (string) | null;
    /** Published date if available */
    "published_date": (string) | null;
    /** Extracted links (only if links=true in request) */
    "links"?: Array<string>;
    /** Extracted image links (only if image_links=true in request) */
    "image_links"?: Array<string>;
    /** Extracted <iframe src> URLs, absolute and deduplicated (only if iframe_links=true in request) */
    "iframe_links"?: Array<string>;
    /** Page-head metadata (only if page_metadata=true in request): canonical, favicon, robots, generator, viewport, keywords, plus nested og/twitter/article objects keyed by tag suffix and remaining named meta tags under `other`. Tags that legitimately repeat (og:image, og:locale:altern */
    "page_metadata"?: {
      [key: string]: (unknown) | null;
    };
    /** Fetch latency for this URL in milliseconds if available from tf-fetch */
    "latency_ms"?: (number) | null;
    /** Present and `true` only when the origin returned 304 Not Modified for your `if_none_match`/`if_modified_since`; omitted otherwise. */
    "not_modified"?: boolean;
    /** The origin's current ETag validator, present only when the origin sent one and you set `include_etag_and_last_modified: true`; omitted otherwise. Store it and replay it as `if_none_match`. */
    "etag"?: string;
    /** The origin's current Last-Modified validator, present only when the origin sent one and you set `include_etag_and_last_modified: true`; omitted otherwise. Store it and replay it as `if_modified_since`. */
    "last_modified"?: string;
    /** Partial-miss report for `include_selectors`: the entries that matched no elements on this page, present only when some (but not all) entries matched — the result still carries the matched content. Omitted when every entry matched. A total miss is not a result at all: it is report */
    "unmatched_selectors"?: Array<string>;
  }>;
  /** URLs that failed to fetch */
  "errors": Array<{
    /** URL that failed to fetch */
    "url": string;
    /** Error code describing the failure. Possible values: `target_http_error` (target server returned a non-2xx HTTP status other than 404/410 — see `status` field), `page_not_found` (target returned HTTP 404 or 410), `target_unreachable` (connection refused, TLS failure, or network er */
    "error": string;
    /** Upstream HTTP status code. Only present when `error` is `target_http_error` or `page_not_found`. */
    "status"?: number;
    /** The `include_selectors` entries that matched no elements on the fetched page. Only present when `error` is `selector_not_matched`. */
    "unmatched_selectors"?: Array<string>;
    /** Cheap retry hints (max 10), only present when `error` is `selector_not_matched`: landmark tags present on the page (e.g. `main`, `article`, `nav`) plus `#id` selectors of content-heavy elements. Retry the fetch with `include_selectors` drawn from this list. */
    "candidate_selectors"?: Array<string>;
  }>;
  /** Request correlation ID, also returned as the X-Request-ID response header. Present only when errors is non-empty; include it when reporting failed URLs. */
  "request_id"?: string;
};

export type TinyfishListFetchUsageQuery = {
  /**  (format date-time) */
  "start_after"?: string;
  /**  (format date-time) */
  "end_before"?: string;
  "status"?: "completed" | "failed";
  /**  (min 1, max 1000) */
  "limit"?: number;
  /**  (min 1) */
  "page"?: number;
};

export interface TinyfishListFetchUsageInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  query?: TinyfishListFetchUsageQuery;
  headers?: Readonly<Record<string, string>>;
}

export type TinyfishListFetchUsageResponse = {
  "items": Array<{
    "id": string;
    "url": string;
    "final_url": string;
    "title": (string) | null;
    "description": (string) | null;
    "language": (string) | null;
    "author": (string) | null;
    "published_date": (string) | null;
    "format": "markdown" | "html" | "json";
    "status": "completed" | "failed";
    "request_origin": string;
    "request_id": (string) | null;
    "text_length": (number) | null;
    "links_count": number;
    "image_links_count": number;
    "latency_ms": (number) | null;
    /** Present and `true` only when that fetch was a conditional request that returned 304 Not Modified; omitted otherwise. */
    "not_modified"?: boolean;
    /** The origin's ETag validator captured at fetch time, present only when `include_etag_and_last_modified` was set on that request and the origin returned one; omitted otherwise. */
    "etag"?: string;
    /** The origin's Last-Modified validator captured at fetch time, present only when `include_etag_and_last_modified` was set on that request and the origin returned one; omitted otherwise. */
    "last_modified"?: string;
    /**  (format date-time) */
    "created_at": string;
    "error": (string) | null;
  }>;
  "total": number;
  "limit": number;
  "page": number;
  "total_pages": number;
  "has_more": boolean;
};

export type TinyfishCreateBrowserSessionBody = {
  /** Target URL the browser session will navigate to on startup. Bare domains (e.g. tinyfish.ai) are automatically prefixed with https://. If omitted, the browser starts at about:blank. */
  "url"?: string;
  /** Inactivity timeout in seconds (5–86400). If omitted, null, or greater than your plan maximum, the plan maximum is used. (min 5, max 86400) */
  "timeout_seconds"?: (number) | null;
  /** Proxy for the session. Omit to use the TinyFish proxy in the US. */
  "proxy_config"?: {
    /** Route the session through a proxy. false means direct egress. */
    "enabled"?: boolean;
    /** "tinyfish" uses the TinyFish residential proxy, pinned to one exit IP per session. "custom" routes through your own proxy — requires url. */
    "type"?: "tinyfish" | "custom";
    /** Exit country for the TinyFish proxy (ISO 3166-1 alpha-2). Defaults to US. */
    "country_code"?: string;
    /** Your HTTP or HTTPS proxy server URL. Required when type is "custom". (format uri) */
    "url"?: string;
    /** Username for the custom proxy. */
    "username"?: string;
    /** Password for the custom proxy. */
    "password"?: string;
  };
};

export interface TinyfishCreateBrowserSessionInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  headers?: Readonly<Record<string, string>>;
  body?: TinyfishCreateBrowserSessionBody;
}

export type TinyfishCreateBrowserSessionResponse = {
  /** Unique identifier for this browser session. (minLength 1) */
  "session_id": string;
  /** WebSocket URL for browser connection. Pass this to Playwright's connect_over_cdp or any WebSocket-based CDP client. (format uri) */
  "cdp_url": string;
  /** HTTPS base URL for the session. Use to access session endpoints such as /pages. (format uri) */
  "base_url": string;
};

export type TinyfishListBrowserUsageQuery = {
  "session_id"?: string;
  /**  (format date-time) */
  "start_after"?: string;
  /**  (format date-time) */
  "end_before"?: string;
  "status"?: "running" | "ended";
  /**  (min 1, max 1000) */
  "limit"?: number;
  /**  (min 1) */
  "page"?: number;
};

export interface TinyfishListBrowserUsageInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  query?: TinyfishListBrowserUsageQuery;
  headers?: Readonly<Record<string, string>>;
}

export type TinyfishListBrowserUsageResponse = {
  "items": Array<{
    "session_id": string;
    "user_id": string;
    "sub_user_id": (string) | null;
    "mode": "light" | "stealth" | "tf-browser";
    /**  (format date-time) */
    "start_time": string;
    /**  (format date-time) */
    "end_time": (string) | null;
    "duration_ms": (number) | null;
    "proxy_trg_rx_bytes": (number) | null;
    "proxy_trg_tx_bytes": (number) | null;
    "status": "running" | "ended" | "created";
    /**  (format date-time) */
    "created_at": string;
    /**  (format date-time) */
    "updated_at": string;
  }>;
  "total": number;
  "limit": number;
  "page": number;
  "total_pages": number;
  "has_more": boolean;
};

export type TinyfishDeleteBrowserSessionPath = {
  /** Session ID to terminate. (minLength 1) */
  "sessionId": string;
};

export interface TinyfishDeleteBrowserSessionInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  path: TinyfishDeleteBrowserSessionPath;
  headers?: Readonly<Record<string, string>>;
}

export type TinyfishCreateMonitorBody = (({
  /** Optional name for this Monitor. (minLength 1, maxLength 100) */
  "name"?: (string) | null;
  /**  (maxLength 100) */
  "schedule_cron": string;
  /** Optional URL that receives each scheduled run's results. (format uri) */
  "webhook_url"?: (string) | null;
  /** Optional plain-language description of the change that matters, e.g. "the price drops". (minLength 1, maxLength 2000) */
  "purpose"?: (string) | null;
  "type": "search";
  "config": {
    /** Topic to monitor (minLength 1, maxLength 2000) */
    "query": string;
    /** Optional Search freshness window in minutes. (min 1, max 5256000) */
    "recency_minutes"?: number;
    /** Results per run (1-10). Defaults to 10. (min 1, max 10) */
    "result_limit"?: number;
  };
}) | ({
  /** Optional name for this Monitor. (minLength 1, maxLength 100) */
  "name"?: (string) | null;
  /** Five-field cron expression, evaluated in UTC by default. Prefix with `CRON_TZ=<IANA zone>` (e.g. `CRON_TZ=America/New_York 0 9 * * 1-5`) to run in a timezone. (maxLength 100) */
  "schedule_cron": string;
  /** Optional URL that receives each scheduled run's results. (format uri) */
  "webhook_url"?: (string) | null;
  /** Optional plain-language description of the change that matters, e.g. "the price drops". (minLength 1, maxLength 2000) */
  "purpose"?: (string) | null;
  "type": "fetch";
  "config": {
    /** Public webpage URL to monitor (format uri) */
    "url": string;
    /** Fetch output format */
    "format"?: "markdown" | "html" | "json";
    /** Include links from the webpage */
    "links"?: boolean;
    /** Include image links from the webpage */
    "image_links"?: boolean;
    /** Deprecated. Fetch Monitors always bypass the cache. (min 0) */
    "ttl"?: number;
  };
}));

export interface TinyfishCreateMonitorInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  headers?: Readonly<Record<string, string>>;
  body: TinyfishCreateMonitorBody;
}

export type TinyfishCreateMonitorResponse = {
  "monitor": TinyfishSchemaMonitor;
  /** Baseline run captured at creation */
  "run": (({
    /** Successfully fetched URLs */
    "results": Array<{
      /** Original requested URL */
      "url": string;
      /** Final URL after redirects */
      "final_url": (string) | null;
      /** Page title */
      "title": (string) | null;
      /** Page meta description */
      "description": (string) | null;
      /** Detected language code */
      "language": (string) | null;
      /** Format of the extracted text */
      "format": "markdown" | "html" | "json";
      /** Extracted content (string for markdown/html, object for json). Null if extraction failed. */
      "text": ((string) | (unknown) | ((unknown) | null));
      /** Page author if available */
      "author": (string) | null;
      /** Published date if available */
      "published_date": (string) | null;
      /** Extracted links (only if links=true in request) */
      "links"?: Array<string>;
      /** Extracted image links (only if image_links=true in request) */
      "image_links"?: Array<string>;
      /** Extracted <iframe src> URLs, absolute and deduplicated (only if iframe_links=true in request) */
      "iframe_links"?: Array<string>;
      /** Page-head metadata (only if page_metadata=true in request): canonical, favicon, robots, generator, viewport, keywords, plus nested og/twitter/article objects keyed by tag suffix and remaining named meta tags under `other`. Tags that legitimately repeat (og:image, og:locale:altern */
      "page_metadata"?: {
        [key: string]: (unknown) | null;
      };
      /** Fetch latency for this URL in milliseconds if available from tf-fetch */
      "latency_ms"?: (number) | null;
      /** Present and `true` only when the origin returned 304 Not Modified for your `if_none_match`/`if_modified_since`; omitted otherwise. */
      "not_modified"?: boolean;
      /** The origin's current ETag validator, present only when the origin sent one and you set `include_etag_and_last_modified: true`; omitted otherwise. Store it and replay it as `if_none_match`. */
      "etag"?: string;
      /** The origin's current Last-Modified validator, present only when the origin sent one and you set `include_etag_and_last_modified: true`; omitted otherwise. Store it and replay it as `if_modified_since`. */
      "last_modified"?: string;
      /** Partial-miss report for `include_selectors`: the entries that matched no elements on this page, present only when some (but not all) entries matched — the result still carries the matched content. Omitted when every entry matched. A total miss is not a result at all: it is report */
      "unmatched_selectors"?: Array<string>;
    }>;
    /** URLs that failed to fetch */
    "errors": Array<{
      /** URL that failed to fetch */
      "url": string;
      /** Error code describing the failure. Possible values: `target_http_error` (target server returned a non-2xx HTTP status other than 404/410 — see `status` field), `page_not_found` (target returned HTTP 404 or 410), `target_unreachable` (connection refused, TLS failure, or network er */
      "error": string;
      /** Upstream HTTP status code. Only present when `error` is `target_http_error` or `page_not_found`. */
      "status"?: number;
      /** The `include_selectors` entries that matched no elements on the fetched page. Only present when `error` is `selector_not_matched`. */
      "unmatched_selectors"?: Array<string>;
      /** Cheap retry hints (max 10), only present when `error` is `selector_not_matched`: landmark tags present on the page (e.g. `main`, `article`, `nav`) plus `#id` selectors of content-heavy elements. Retry the fetch with `include_selectors` drawn from this list. */
      "candidate_selectors"?: Array<string>;
    }>;
    /** Request correlation ID, also returned as the X-Request-ID response header. Present only when errors is non-empty; include it when reporting failed URLs. */
    "request_id"?: string;
    "id": string;
    /** True for the first run; nothing to compare. */
    "is_baseline": boolean;
  }) | ({
    "id": string;
    "request_id": string;
    "query": string;
    "status_code": number;
    "result_count": number;
    "results": Array<{
      /** Position in search results */
      "position": number;
      /** Site name */
      "site_name": string;
      /** Text snippet from the result */
      "snippet": string;
      /** Page title */
      "title": string;
      /** Result URL (format uri) */
      "url": string;
      /** Thumbnail image URL, present only when include_thumbnail=true and a thumbnail is available (format uri) */
      "thumbnail_url"?: string;
      /** Fetched page content, present only when fetch param is supplied */
      "fetch"?: (unknown) | null;
      /** Fetch error details when fetch was requested. Contains details on failure; may be null when fetching succeeds. */
      "fetch_error"?: (unknown) | null;
      /** Publication date, present for news and some web results */
      "date"?: string;
      /** Publisher name, present for news results when domain_type=news */
      "publisher"?: string;
      /** Author list, present for academic results when domain_type=research_paper */
      "authors"?: Array<string>;
      /** Journal or conference name, present when domain_type=research_paper */
      "venue"?: string;
      /** Publication year, present when domain_type=research_paper */
      "year"?: number;
      /** Citation count, present when domain_type=research_paper */
      "cited_by_count"?: number;
      /** PDF URL, present when domain_type=research_paper and a PDF is available */
      "pdf_url"?: string;
    }>;
    /** Positions of results not seen in earlier runs */
    "new_result_positions": Array<number>;
    /**  (format date-time) */
    "created_at": string;
  }));
};

export interface TinyfishListMonitorsInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  headers?: Readonly<Record<string, string>>;
}

export type TinyfishListMonitorsResponse = {
  "monitors": Array<TinyfishSchemaMonitor>;
};

export type TinyfishGetMonitorPath = {
  /** Monitor ID (minLength 1, maxLength 36) */
  "id": string;
};

export interface TinyfishGetMonitorInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  path: TinyfishGetMonitorPath;
  headers?: Readonly<Record<string, string>>;
}

export type TinyfishGetMonitorResponse = TinyfishSchemaMonitor;

export type TinyfishUpdateMonitorPath = {
  /** Monitor ID (minLength 1, maxLength 36) */
  "id": string;
};

export type TinyfishUpdateMonitorBody = (({
  "status": "active" | "paused";
}) | ({
  /**  (maxLength 100) */
  "schedule_cron": string;
  /**  (minLength 1, maxLength 100) */
  "name"?: (string) | null;
  /**  (format uri) */
  "webhook_url"?: (string) | null;
  /**  (minLength 1, maxLength 2000) */
  "purpose"?: (string) | null;
}));

export interface TinyfishUpdateMonitorInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  path: TinyfishUpdateMonitorPath;
  headers?: Readonly<Record<string, string>>;
  body: TinyfishUpdateMonitorBody;
}

export type TinyfishUpdateMonitorResponse = TinyfishSchemaMonitor;

export type TinyfishDeleteMonitorPath = {
  /** Monitor ID (minLength 1, maxLength 36) */
  "id": string;
};

export interface TinyfishDeleteMonitorInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  path: TinyfishDeleteMonitorPath;
  headers?: Readonly<Record<string, string>>;
}

export type TinyfishDeleteMonitorResponse = {
  "deleted": true;
  "id": string;
};

export type TinyfishRunMonitorPath = {
  /** Monitor ID (minLength 1, maxLength 36) */
  "id": string;
};

export interface TinyfishRunMonitorInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  path: TinyfishRunMonitorPath;
  headers?: Readonly<Record<string, string>>;
}

export type TinyfishRunMonitorResponse = {
  "run": TinyfishSchemaMonitorRun;
};

export type TinyfishRunResearchBody = {
  /** Research question (minLength 1, maxLength 2000) */
  "query": string;
  /** Depth of research. Omitted selects deep. */
  "mode"?: "deep" | "max";
  /** Emit report text through synthesis_delta events as it is written */
  "stream"?: boolean;
  /** BCP 47 language tag for the report */
  "output_language"?: string;
  /** Allow relevant social and community sources */
  "weak_sources_enabled"?: boolean;
  /** Source pool to research over */
  "domain_type"?: "web" | "news" | "research_paper";
  /** Include results on or after this date (YYYY-MM-DD) (format date) */
  "after_date"?: string;
  /** Include results on or before this date (YYYY-MM-DD) (format date) */
  "before_date"?: string;
  /** Include results from the last 1-5,256,000 minutes. Not combinable with date filters. (min 1, max 5256000) */
  "recency_minutes"?: number;
  /** Domain preferences. Each list accepts at most 150 entries. */
  "domain_filter"?: {
    /** include prioritizes the domains; exclusive restricts results to them */
    "mode": "include" | "exclusive";
    /** Domains to prefer or require (maxItems 150) */
    "domains"?: Array<string>;
    /** Domains to always remove (maxItems 150) */
    "block"?: Array<string>;
  };
  /** Seed this run with a completed report and its evidence */
  "prior_run_id"?: string;
  /** Continue a research session. Mutually exclusive with prior_run_id. (format uuid) */
  "session_id"?: string;
};

export interface TinyfishRunResearchInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  headers?: Readonly<Record<string, string>>;
  body: TinyfishRunResearchBody;
}

export type TinyfishRunResearchPayload = string;

export type TinyfishStartResearchAsyncBody = {
  /** Research question (minLength 1, maxLength 2000) */
  "query": string;
  /** Depth of research. Omitted selects deep. */
  "mode"?: "deep" | "max";
  /** Emit report text through synthesis_delta events as it is written */
  "stream"?: boolean;
  /** BCP 47 language tag for the report */
  "output_language"?: string;
  /** Allow relevant social and community sources */
  "weak_sources_enabled"?: boolean;
  /** Source pool to research over */
  "domain_type"?: "web" | "news" | "research_paper";
  /** Include results on or after this date (YYYY-MM-DD) (format date) */
  "after_date"?: string;
  /** Include results on or before this date (YYYY-MM-DD) (format date) */
  "before_date"?: string;
  /** Include results from the last 1-5,256,000 minutes. Not combinable with date filters. (min 1, max 5256000) */
  "recency_minutes"?: number;
  /** Domain preferences. Each list accepts at most 150 entries. */
  "domain_filter"?: {
    /** include prioritizes the domains; exclusive restricts results to them */
    "mode": "include" | "exclusive";
    /** Domains to prefer or require (maxItems 150) */
    "domains"?: Array<string>;
    /** Domains to always remove (maxItems 150) */
    "block"?: Array<string>;
  };
  /** Seed this run with a completed report and its evidence */
  "prior_run_id"?: string;
  /** Continue a research session. Mutually exclusive with prior_run_id. (format uuid) */
  "session_id"?: string;
};

export interface TinyfishStartResearchAsyncInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  headers?: Readonly<Record<string, string>>;
  body: TinyfishStartResearchAsyncBody;
}

export type TinyfishStartResearchAsyncResponse = {
  /**  (format uuid) */
  "research_run_id": string;
  /** Error details. Null if successful. */
  "error": ({
    /** Machine-readable error code */
    "code": string;
    /** Error message if run creation failed */
    "message": string;
  }) | null;
};

export type TinyfishStreamResearchEventsPath = {
  /** Research run identifier */
  "research_run_id": string;
};

export type TinyfishStreamResearchEventsHeaders = {
  "Last-Event-ID"?: string;
};

export interface TinyfishStreamResearchEventsInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  path: TinyfishStreamResearchEventsPath;
  headers?: TinyfishStreamResearchEventsHeaders & Readonly<Record<string, string>>;
}

export type TinyfishStreamResearchEventsPayload = string;

export type TinyfishListResearchRunsQuery = {
  /** Filter by research run status */
  "status"?: "RUNNING" | "COMPLETED" | "FAILED" | "CANCELLED" | "TIMED_OUT" | "QUEUED";
  /** Filter by query text (case-insensitive partial match) (maxLength 500) */
  "query"?: string;
  /** Filter runs created after this ISO 8601 timestamp (format date-time) */
  "created_after"?: string;
  /** Filter runs created before this ISO 8601 timestamp (format date-time) */
  "created_before"?: string;
  /** Sort order by created_at */
  "sort_direction"?: "asc" | "desc";
  /** Cursor for pagination (from previous response). Must be replayed with the same sort_direction used to generate it. */
  "cursor"?: string;
  /** Maximum number of results to return (1-100) (min 1, max 100) */
  "limit"?: number;
};

export interface TinyfishListResearchRunsInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  query?: TinyfishListResearchRunsQuery;
  headers?: Readonly<Record<string, string>>;
}

export type TinyfishListResearchRunsResponse = {
  /** Array of research runs */
  "data": Array<{
    /** Unique research run identifier */
    "research_run_id": string;
    /** Current status of the research run */
    "status": "RUNNING" | "COMPLETED" | "FAILED" | "CANCELLED" | "TIMED_OUT" | "QUEUED";
    /** The research query */
    "query": string;
    /** Quick answer with citations, available before deep research completes */
    "quick_result": ({
      "answer": string;
      "citations": Array<string>;
      "actions"?: Array<{
        "id": string;
        "label": string;
        "status": "running" | "done" | "error";
        "streamingUrl"?: string;
        "kind"?: "plan" | "search" | "fetch" | "browse" | "map";
        /**  (min 0) */
        "iteration"?: number;
        "url"?: string;
        "query"?: string;
        "details"?: Array<string>;
      }>;
      "stats"?: {
        "iterations": number;
        "sources_searched": number;
        "sources_fetched": number;
        "agent_runs": number;
        "claims_extracted": number;
        "termination_reason": "planner_done" | "planner_no_queries" | "max_iterations" | "deadline" | "synthesis_failed" | "abort";
        "subquestions_covered": number;
        "subquestions_total": number;
      };
    }) | null;
    /** Short prose summary of the quick result */
    "quick_result_summary": (string) | null;
    /** Deep research report, available after the run completes */
    "deep_result": ({
      /** The report text */
      "result": string;
      "citations": Array<string>;
      /** How fresh the sources behind this report are */
      "freshness_report"?: {
        "filter_applied"?: {
          /** Type of search to perform: "web" for standard results, "news" for news articles, "research_paper" for academic papers. Defaults to "web". */
          "domain_type"?: "web" | "news" | "research_paper";
          /** Return results after this date (YYYY-MM-DD) */
          "after_date"?: string;
          /** Return results before this date (YYYY-MM-DD) */
          "before_date"?: string;
          /** Return results from the past N minutes (1 to 5,256,000). (min 1, max 5256000) */
          "recency_minutes"?: number;
        };
        "latest_published_date"?: string;
        /**  (min 0) */
        "sources_with_dates": number;
        /**  (min 0) */
        "sources_without_dates": number;
        /**  (min 0) */
        "sources_in_requested_window": number;
        "fetched_at_latest"?: string;
      };
      /** Why research stopped; synthesis_failed indicates interim findings */
      "termination_reason"?: "planner_done" | "planner_no_queries" | "max_iterations" | "deadline" | "synthesis_failed" | "abort";
    }) | null;
    /** IDs of the agent runs spawned by this research run */
    "run_ids": Array<string>;
    /** ISO 8601 timestamp when the research run was created */
    "created_at": (string) | null;
    /** ISO 8601 timestamp when the research run completed, or null if still running */
    "completed_at": (string) | null;
  }>;
  /** Pagination information */
  "pagination": {
    /** Total number of runs matching the current filters */
    "total": number;
    /** Cursor for fetching next page. Null if no more results. */
    "next_cursor": (string) | null;
    /** Whether there are more results after this page */
    "has_more": boolean;
  };
};

export type TinyfishGetResearchRunPath = {
  /** Research run identifier */
  "research_run_id": string;
};

export interface TinyfishGetResearchRunInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  path: TinyfishGetResearchRunPath;
  headers?: Readonly<Record<string, string>>;
}

export type TinyfishGetResearchRunResponse = {
  /** Unique research run identifier */
  "research_run_id": string;
  /** Current status of the research run */
  "status": "RUNNING" | "COMPLETED" | "FAILED" | "CANCELLED" | "TIMED_OUT" | "QUEUED";
  /** The research query */
  "query": string;
  /** Quick answer with citations, available before deep research completes */
  "quick_result": ({
    "answer": string;
    "citations": Array<string>;
    "actions"?: Array<{
      "id": string;
      "label": string;
      "status": "running" | "done" | "error";
      "streamingUrl"?: string;
      "kind"?: "plan" | "search" | "fetch" | "browse" | "map";
      /**  (min 0) */
      "iteration"?: number;
      "url"?: string;
      "query"?: string;
      "details"?: Array<string>;
    }>;
    "stats"?: {
      "iterations": number;
      "sources_searched": number;
      "sources_fetched": number;
      "agent_runs": number;
      "claims_extracted": number;
      "termination_reason": "planner_done" | "planner_no_queries" | "max_iterations" | "deadline" | "synthesis_failed" | "abort";
      "subquestions_covered": number;
      "subquestions_total": number;
    };
  }) | null;
  /** Short prose summary of the quick result */
  "quick_result_summary": (string) | null;
  /** Deep research report, available after the run completes */
  "deep_result": ({
    /** The report text */
    "result": string;
    "citations": Array<string>;
    /** How fresh the sources behind this report are */
    "freshness_report"?: {
      "filter_applied"?: {
        /** Type of search to perform: "web" for standard results, "news" for news articles, "research_paper" for academic papers. Defaults to "web". */
        "domain_type"?: "web" | "news" | "research_paper";
        /** Return results after this date (YYYY-MM-DD) */
        "after_date"?: string;
        /** Return results before this date (YYYY-MM-DD) */
        "before_date"?: string;
        /** Return results from the past N minutes (1 to 5,256,000). (min 1, max 5256000) */
        "recency_minutes"?: number;
      };
      "latest_published_date"?: string;
      /**  (min 0) */
      "sources_with_dates": number;
      /**  (min 0) */
      "sources_without_dates": number;
      /**  (min 0) */
      "sources_in_requested_window": number;
      "fetched_at_latest"?: string;
    };
    /** Why research stopped; synthesis_failed indicates interim findings */
    "termination_reason"?: "planner_done" | "planner_no_queries" | "max_iterations" | "deadline" | "synthesis_failed" | "abort";
  }) | null;
  /** IDs of the agent runs spawned by this research run */
  "run_ids": Array<string>;
  /** ISO 8601 timestamp when the research run was created */
  "created_at": (string) | null;
  /** ISO 8601 timestamp when the research run completed, or null if still running */
  "completed_at": (string) | null;
  /** Terminal outcome from saved status; null otherwise. Not the provider error. */
  "error": ({
    /** Machine-readable error code */
    "code": "MISSING_API_KEY" | "INVALID_API_KEY" | "INVALID_INPUT" | "RATE_LIMIT_EXCEEDED" | "DAILY_LIMIT_EXCEEDED" | "INTERNAL_ERROR" | "RETRY_REQUIRED" | "UNAUTHORIZED" | "VAULT_RECONNECT_REQUIRED" | "FORBIDDEN" | "NOT_FOUND" | "FEATURE_NOT_AVAILABLE" | "SERVICE_BUSY" | "TIMEOUT" | "INSUFFICIENT_CREDITS" | "FREE_ALLOWANCE_EXHAUSTED" | "CONTENT_POLICY_VIOLATION" | "MAX_STEPS_EXCEEDED" | "SITE_BLOCKED" | "TASK_FAILED" | "CANCELLED";
    /** Human-readable error message */
    "message": string;
    /** Additional error details (validation errors, etc.) */
    "details"?: (unknown) | null;
  }) | null;
  /** Subquestions and searches the run planned */
  "research_plan": ({
    "summary": string;
    "subquestions": Array<{
      "id": string;
      "question": string;
      "priority": "high" | "medium" | "low";
    }>;
    "search_queries": Array<string>;
    "done": boolean;
    "review"?: {
      /**  (format uuid) */
      "id": string;
      "status": "pending" | "approve" | "refine" | "timeout";
      /**  (min 0) */
      "expiresAt": number;
      "feedback"?: string;
      /**  (min 0) */
      "resolvedAt"?: number;
    };
  }) | null;
  /** Sources gathered, with the claims they support */
  "evidence": (Array<{
    "url": string;
    "title": string;
    "language"?: (string) | null;
    "published_date"?: (string) | null;
    "fetched_at"?: string;
    "live_fetch"?: boolean;
    "access_method"?: "fetch" | "browser" | "social";
    "discovered_by_queries"?: Array<string>;
    "search_filters"?: {
      "after_date"?: string;
      "before_date"?: string;
      "recency_minutes"?: number;
    };
    "subquestions_covered": Array<string>;
    "claims": Array<{
      "claim": string;
      "snippet": string;
      "subquestion_id": string;
      "confidence": "high" | "medium" | "low";
      "claim_type"?: "fact" | "official_statement" | "reported_claim" | "estimate" | "opinion" | "user_sentiment" | "unverified";
    }>;
    "source_quality": "primary" | "secondary" | "low";
  }>) | null;
  /** Number of plan-search-synthesize iterations the run completed (min 0) */
  "iterations": (number) | null;
};

export type TinyfishCancelResearchRunPath = {
  /** Research run identifier */
  "research_run_id": string;
};

export interface TinyfishCancelResearchRunInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  path: TinyfishCancelResearchRunPath;
  headers?: Readonly<Record<string, string>>;
}

export type TinyfishCancelResearchRunResponse = {
  /** Research run identifier */
  "research_run_id": string;
  /** Status of the run after this request */
  "status": "RUNNING" | "COMPLETED" | "FAILED" | "CANCELLED" | "TIMED_OUT" | "QUEUED";
  /** Whether this request changed the run to CANCELLED */
  "cancelled": boolean;
};

/** Research event names documented by https://docs.tinyfish.ai/research-api/reference.
 * Their data payloads have no published exhaustive schema; preserve SSE data as text.
 */
export type TinyfishResearchEventName = "created" | "session" | "plan_updated" | "sources_searched" |
  "source_fetched" | "partial_summary" | "synthesis_delta" | "synthesis_discarded" | "heartbeat" |
  "evidence_snapshot" | "final_result" | "run_stats" | "error" | "done";

function credential(value: string): string {
  if (typeof value !== "string" || !value.trim() || /[\u0000-\u0020\u007f]/u.test(value)) throw new SearchError("configuration");
  return value;
}

function emptyResult(result: NativeResponse<string>): NativeResponse<null> {
  if (result.data !== "") throw new SearchError("invalid_response");
  return { data: null, metadata: result.metadata };
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

export const tinyfishOperations = Object.freeze({
  runSse: Object.freeze({"id": "runSse", "method": "POST", "path": "/v1/automation/run-sse", "retryable": false, "response": "sse", "headers": Object.freeze({"Accept": "text/event-stream"}) }),
  run: Object.freeze({"id": "run", "method": "POST", "path": "/v1/automation/run", "retryable": false}),
  runAsync: Object.freeze({"id": "runAsync", "method": "POST", "path": "/v1/automation/run-async", "retryable": false}),
  runBatch: Object.freeze({"id": "runBatch", "method": "POST", "path": "/v1/automation/run-batch", "retryable": false}),
  listRuns: Object.freeze({"id": "listRuns", "method": "GET", "path": "/v1/runs", "retryable": true}),
  batchGetRuns: Object.freeze({"id": "batchGetRuns", "method": "POST", "path": "/v1/runs/batch", "retryable": false}),
  batchCancelRuns: Object.freeze({"id": "batchCancelRuns", "method": "POST", "path": "/v1/runs/batch/cancel", "retryable": false}),
  getRunById: Object.freeze({"id": "getRunById", "method": "GET", "path": "/v1/runs/{id}", "retryable": true}),
  cancelRunById: Object.freeze({"id": "cancelRunById", "method": "POST", "path": "/v1/runs/{id}/cancel", "retryable": false}),
  getStepScreenshot: Object.freeze({"id": "getStepScreenshot", "method": "GET", "path": "/v1/runs/{id}/steps/{stepId}/screenshot", "retryable": true, "response": "bytes"}),
  getStepHtml: Object.freeze({"id": "getStepHtml", "method": "GET", "path": "/v1/runs/{id}/steps/{stepId}/html", "retryable": true, "response": "text"}),
  listBrowserContextProfiles: Object.freeze({"id": "listBrowserContextProfiles", "method": "GET", "path": "/v1/profiles", "retryable": true}),
  createBrowserContextProfile: Object.freeze({"id": "createBrowserContextProfile", "method": "POST", "path": "/v1/profiles", "retryable": false}),
  getBrowserContextProfile: Object.freeze({"id": "getBrowserContextProfile", "method": "GET", "path": "/v1/profiles/{profileId}", "retryable": true}),
  updateBrowserContextProfile: Object.freeze({"id": "updateBrowserContextProfile", "method": "PATCH", "path": "/v1/profiles/{profileId}", "retryable": false}),
  deleteBrowserContextProfile: Object.freeze({"id": "deleteBrowserContextProfile", "method": "DELETE", "path": "/v1/profiles/{profileId}", "retryable": false}),
  createBrowserContextProfileSetupSession: Object.freeze({"id": "createBrowserContextProfileSetupSession", "method": "POST", "path": "/v1/profiles/{profileId}/setup-session", "retryable": false}),
  cancelBrowserContextProfileSetupSession: Object.freeze({"id": "cancelBrowserContextProfileSetupSession", "method": "POST", "path": "/v1/profiles/{profileId}/setup-session/cancel", "retryable": false}),
  saveBrowserContextProfileSetupSession: Object.freeze({"id": "saveBrowserContextProfileSetupSession", "method": "POST", "path": "/v1/profiles/{profileId}/save", "retryable": false}),
  uploadBrowserContextProfileState: Object.freeze({"id": "uploadBrowserContextProfileState", "method": "POST", "path": "/v1/profiles/{profileId}/upload", "retryable": false}),
  deleteBrowserContextProfileDomain: Object.freeze({"id": "deleteBrowserContextProfileDomain", "method": "DELETE", "path": "/v1/profiles/{profileId}/domains/{domain}", "retryable": false}),
  connectVault: Object.freeze({"id": "connectVault", "method": "POST", "path": "/v1/vault/connections", "retryable": false}),
  listVaultConnections: Object.freeze({"id": "listVaultConnections", "method": "GET", "path": "/v1/vault/connections", "retryable": true}),
  disconnectVault: Object.freeze({"id": "disconnectVault", "method": "DELETE", "path": "/v1/vault/connections/{connectionId}", "retryable": false}),
  listVaultItems: Object.freeze({"id": "listVaultItems", "method": "GET", "path": "/v1/vault/items", "retryable": true}),
  syncVaultItems: Object.freeze({"id": "syncVaultItems", "method": "POST", "path": "/v1/vault/items/sync", "retryable": false}),
  getWallet: Object.freeze({"id": "getWallet", "method": "GET", "path": "/v1/wallet", "retryable": true}),
  topUpWallet: Object.freeze({"id": "topUpWallet", "method": "POST", "path": "/v1/wallet/top-up", "retryable": false}),
  search: Object.freeze({"id": "search", "method": "GET", "path": "/", "retryable": true}),
  listSearchUsage: Object.freeze({"id": "listSearchUsage", "method": "GET", "path": "/usage", "retryable": true}),
  fetchUrls: Object.freeze({"id": "fetchUrls", "method": "POST", "path": "/", "retryable": false}),
  listFetchUsage: Object.freeze({"id": "listFetchUsage", "method": "GET", "path": "/usage", "retryable": true}),
  createBrowserSession: Object.freeze({"id": "createBrowserSession", "method": "POST", "path": "/", "retryable": false}),
  listBrowserUsage: Object.freeze({"id": "listBrowserUsage", "method": "GET", "path": "/usage", "retryable": true}),
  deleteBrowserSession: Object.freeze({"id": "deleteBrowserSession", "method": "DELETE", "path": "/{sessionId}", "retryable": false, "response": "text"}),
  createMonitor: Object.freeze({"id": "createMonitor", "method": "POST", "path": "/v1/monitors", "retryable": false}),
  listMonitors: Object.freeze({"id": "listMonitors", "method": "GET", "path": "/v1/monitors", "retryable": true}),
  getMonitor: Object.freeze({"id": "getMonitor", "method": "GET", "path": "/v1/monitors/{id}", "retryable": true}),
  updateMonitor: Object.freeze({"id": "updateMonitor", "method": "PATCH", "path": "/v1/monitors/{id}", "retryable": false}),
  deleteMonitor: Object.freeze({"id": "deleteMonitor", "method": "DELETE", "path": "/v1/monitors/{id}", "retryable": false}),
  runMonitor: Object.freeze({"id": "runMonitor", "method": "POST", "path": "/v1/monitors/{id}/runs", "retryable": false}),
  runResearch: Object.freeze({"id": "runResearch", "method": "POST", "path": "/v1/automation/run-research", "retryable": false, "response": "sse", "headers": Object.freeze({"Accept": "text/event-stream"}) }),
  startResearchAsync: Object.freeze({"id": "startResearchAsync", "method": "POST", "path": "/v1/automation/run-research-async", "retryable": false}),
  streamResearchEvents: Object.freeze({"id": "streamResearchEvents", "method": "GET", "path": "/v1/research-run/{research_run_id}/events", "retryable": false, "response": "sse", "headers": Object.freeze({"Accept": "text/event-stream"}) }),
  listResearchRuns: Object.freeze({"id": "listResearchRuns", "method": "GET", "path": "/v1/research-run", "retryable": true}),
  getResearchRun: Object.freeze({"id": "getResearchRun", "method": "GET", "path": "/v1/research-run/{research_run_id}", "retryable": true}),
  cancelResearchRun: Object.freeze({"id": "cancelResearchRun", "method": "POST", "path": "/v1/research-run/{research_run_id}/cancel", "retryable": false}),
} satisfies Readonly<Record<string, NativeOperation>>);

/** Explicit native calls; no auto-pagination, polling, or stream reconnection. */
export function createTinyfishClient(options: TinyfishClientOptions) {
  const { apiKey, ...config } = options;
  const key = credential(apiKey);
  const transport0 = createNativeTransport({ ...config, provider: "tinyfish", baseUrl: "https://agent.tinyfish.ai", headers: { "X-API-Key": key } });
  const transport1 = createNativeTransport({ ...config, provider: "tinyfish", baseUrl: "https://api.search.tinyfish.ai", headers: { "X-API-Key": key } });
  const transport2 = createNativeTransport({ ...config, provider: "tinyfish", baseUrl: "https://api.fetch.tinyfish.ai", headers: { "X-API-Key": key } });
  const transport3 = createNativeTransport({ ...config, provider: "tinyfish", baseUrl: "https://api.browser.tinyfish.ai", headers: { "X-API-Key": key } });
  return Object.freeze({
    operations: tinyfishOperations,
    /** POST https://agent.tinyfish.ai/v1/automation/run-sse — Run browser automation with SSE streaming. */
    async runSse(input: TinyfishRunSseInput): Promise<NativeResponse<AsyncIterable<NativeSSEEvent>>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      if (input.body !== undefined && (!input.body || typeof input.body !== "object" || Array.isArray(input.body))) throw new SearchError("invalid_request");
      return transport0.request(tinyfishOperations.runSse, { ...input, headers: { ...input.headers, Accept: "text/event-stream" } });
    },
    /** POST https://agent.tinyfish.ai/v1/automation/run — Run browser automation synchronously. */
    async run(input: TinyfishRunInput): Promise<NativeResponse<TinyfishRunResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      if (input.body !== undefined && (!input.body || typeof input.body !== "object" || Array.isArray(input.body))) throw new SearchError("invalid_request");
      return transport0.request<TinyfishRunResponse>(tinyfishOperations.run, { ...input });
    },
    /** POST https://agent.tinyfish.ai/v1/automation/run-async — Start automation asynchronously. */
    async runAsync(input: TinyfishRunAsyncInput): Promise<NativeResponse<TinyfishRunAsyncResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      if (input.body !== undefined && (!input.body || typeof input.body !== "object" || Array.isArray(input.body))) throw new SearchError("invalid_request");
      return transport0.request<TinyfishRunAsyncResponse>(tinyfishOperations.runAsync, { ...input });
    },
    /** POST https://agent.tinyfish.ai/v1/automation/run-batch — Start multiple automations asynchronously. */
    async runBatch(input: TinyfishRunBatchInput): Promise<NativeResponse<TinyfishRunBatchResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      if (input.body !== undefined && (!input.body || typeof input.body !== "object" || Array.isArray(input.body))) throw new SearchError("invalid_request");
      return transport0.request<TinyfishRunBatchResponse>(tinyfishOperations.runBatch, { ...input });
    },
    /** GET https://agent.tinyfish.ai/v1/runs — List and search runs. */
    async listRuns(input: TinyfishListRunsInput = {}): Promise<NativeResponse<TinyfishListRunsResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.query !== undefined && (!input.query || typeof input.query !== "object" || Array.isArray(input.query))) throw new SearchError("invalid_request");
      return transport0.request<TinyfishListRunsResponse>(tinyfishOperations.listRuns, { ...input, query: wireQuery(input.query, []) ?? {} });
    },
    /** POST https://agent.tinyfish.ai/v1/runs/batch — Get multiple runs by IDs. */
    async batchGetRuns(input: TinyfishBatchGetRunsInput): Promise<NativeResponse<TinyfishBatchGetRunsResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      if (input.body !== undefined && (!input.body || typeof input.body !== "object" || Array.isArray(input.body))) throw new SearchError("invalid_request");
      return transport0.request<TinyfishBatchGetRunsResponse>(tinyfishOperations.batchGetRuns, { ...input });
    },
    /** POST https://agent.tinyfish.ai/v1/runs/batch/cancel — Cancel multiple runs by IDs. */
    async batchCancelRuns(input: TinyfishBatchCancelRunsInput): Promise<NativeResponse<TinyfishBatchCancelRunsResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      if (input.body !== undefined && (!input.body || typeof input.body !== "object" || Array.isArray(input.body))) throw new SearchError("invalid_request");
      return transport0.request<TinyfishBatchCancelRunsResponse>(tinyfishOperations.batchCancelRuns, { ...input });
    },
    /** GET https://agent.tinyfish.ai/v1/runs/{id} — Get run by ID. */
    async getRunById(input: TinyfishGetRunByIdInput): Promise<NativeResponse<TinyfishGetRunByIdResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.query !== undefined && (!input.query || typeof input.query !== "object" || Array.isArray(input.query))) throw new SearchError("invalid_request");
      return transport0.request<TinyfishGetRunByIdResponse>(tinyfishOperations.getRunById, { ...input, query: wireQuery(input.query, []) ?? {} });
    },
    /** POST https://agent.tinyfish.ai/v1/runs/{id}/cancel — Cancel run by ID. */
    async cancelRunById(input: TinyfishCancelRunByIdInput): Promise<NativeResponse<TinyfishCancelRunByIdResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport0.request<TinyfishCancelRunByIdResponse>(tinyfishOperations.cancelRunById, { ...input });
    },
    /** GET https://agent.tinyfish.ai/v1/runs/{id}/steps/{stepId}/screenshot — Get step screenshot. */
    async getStepScreenshot(input: TinyfishGetStepScreenshotInput): Promise<NativeResponse<Uint8Array>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport0.request(tinyfishOperations.getStepScreenshot, { ...input });
    },
    /** GET https://agent.tinyfish.ai/v1/runs/{id}/steps/{stepId}/html — Get step HTML snapshot. */
    async getStepHtml(input: TinyfishGetStepHtmlInput): Promise<NativeResponse<string>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport0.request<string>(tinyfishOperations.getStepHtml, { ...input });
    },
    /** GET https://agent.tinyfish.ai/v1/profiles — List Browser Context Profiles. */
    async listBrowserContextProfiles(input: TinyfishListBrowserContextProfilesInput = {}): Promise<NativeResponse<TinyfishListBrowserContextProfilesResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport0.request<TinyfishListBrowserContextProfilesResponse>(tinyfishOperations.listBrowserContextProfiles, { ...input });
    },
    /** POST https://agent.tinyfish.ai/v1/profiles — Create a Browser Context Profile. */
    async createBrowserContextProfile(input: TinyfishCreateBrowserContextProfileInput): Promise<NativeResponse<TinyfishCreateBrowserContextProfileResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      if (input.body !== undefined && (!input.body || typeof input.body !== "object" || Array.isArray(input.body))) throw new SearchError("invalid_request");
      return transport0.request<TinyfishCreateBrowserContextProfileResponse>(tinyfishOperations.createBrowserContextProfile, { ...input });
    },
    /** GET https://agent.tinyfish.ai/v1/profiles/{profileId} — Get a Browser Context Profile. */
    async getBrowserContextProfile(input: TinyfishGetBrowserContextProfileInput): Promise<NativeResponse<TinyfishGetBrowserContextProfileResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport0.request<TinyfishGetBrowserContextProfileResponse>(tinyfishOperations.getBrowserContextProfile, { ...input });
    },
    /** PATCH https://agent.tinyfish.ai/v1/profiles/{profileId} — Update a Browser Context Profile. */
    async updateBrowserContextProfile(input: TinyfishUpdateBrowserContextProfileInput): Promise<NativeResponse<TinyfishUpdateBrowserContextProfileResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body !== undefined && (!input.body || typeof input.body !== "object" || Array.isArray(input.body))) throw new SearchError("invalid_request");
      return transport0.request<TinyfishUpdateBrowserContextProfileResponse>(tinyfishOperations.updateBrowserContextProfile, { ...input });
    },
    /** DELETE https://agent.tinyfish.ai/v1/profiles/{profileId} — Delete a Browser Context Profile. */
    async deleteBrowserContextProfile(input: TinyfishDeleteBrowserContextProfileInput): Promise<NativeResponse<TinyfishDeleteBrowserContextProfileResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport0.request<TinyfishDeleteBrowserContextProfileResponse>(tinyfishOperations.deleteBrowserContextProfile, { ...input });
    },
    /** POST https://agent.tinyfish.ai/v1/profiles/{profileId}/setup-session — Create a profile setup session. */
    async createBrowserContextProfileSetupSession(input: TinyfishCreateBrowserContextProfileSetupSessionInput): Promise<NativeResponse<TinyfishCreateBrowserContextProfileSetupSessionResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body !== undefined && (!input.body || typeof input.body !== "object" || Array.isArray(input.body))) throw new SearchError("invalid_request");
      return transport0.request<TinyfishCreateBrowserContextProfileSetupSessionResponse>(tinyfishOperations.createBrowserContextProfileSetupSession, { ...input });
    },
    /** POST https://agent.tinyfish.ai/v1/profiles/{profileId}/setup-session/cancel — Cancel a profile setup session. */
    async cancelBrowserContextProfileSetupSession(input: TinyfishCancelBrowserContextProfileSetupSessionInput): Promise<NativeResponse<TinyfishCancelBrowserContextProfileSetupSessionResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      if (input.body !== undefined && (!input.body || typeof input.body !== "object" || Array.isArray(input.body))) throw new SearchError("invalid_request");
      return transport0.request<TinyfishCancelBrowserContextProfileSetupSessionResponse>(tinyfishOperations.cancelBrowserContextProfileSetupSession, { ...input });
    },
    /** POST https://agent.tinyfish.ai/v1/profiles/{profileId}/save — Save a profile setup session. */
    async saveBrowserContextProfileSetupSession(input: TinyfishSaveBrowserContextProfileSetupSessionInput): Promise<NativeResponse<TinyfishSaveBrowserContextProfileSetupSessionResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      if (input.body !== undefined && (!input.body || typeof input.body !== "object" || Array.isArray(input.body))) throw new SearchError("invalid_request");
      return transport0.request<TinyfishSaveBrowserContextProfileSetupSessionResponse>(tinyfishOperations.saveBrowserContextProfileSetupSession, { ...input });
    },
    /** POST https://agent.tinyfish.ai/v1/profiles/{profileId}/upload — Upload Browser Context Profile state. */
    async uploadBrowserContextProfileState(input: TinyfishUploadBrowserContextProfileStateInput): Promise<NativeResponse<TinyfishUploadBrowserContextProfileStateResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      if (input.body !== undefined && (!input.body || typeof input.body !== "object" || Array.isArray(input.body))) throw new SearchError("invalid_request");
      return transport0.request<TinyfishUploadBrowserContextProfileStateResponse>(tinyfishOperations.uploadBrowserContextProfileState, { ...input });
    },
    /** DELETE https://agent.tinyfish.ai/v1/profiles/{profileId}/domains/{domain} — Delete a saved profile domain. */
    async deleteBrowserContextProfileDomain(input: TinyfishDeleteBrowserContextProfileDomainInput): Promise<NativeResponse<TinyfishDeleteBrowserContextProfileDomainResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport0.request<TinyfishDeleteBrowserContextProfileDomainResponse>(tinyfishOperations.deleteBrowserContextProfileDomain, { ...input });
    },
    /** POST https://agent.tinyfish.ai/v1/vault/connections — Connect a vault provider. */
    async connectVault(input: TinyfishConnectVaultInput): Promise<NativeResponse<TinyfishConnectVaultResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      if (input.body !== undefined && (!input.body || typeof input.body !== "object" || Array.isArray(input.body))) throw new SearchError("invalid_request");
      return transport0.request<TinyfishConnectVaultResponse>(tinyfishOperations.connectVault, { ...input });
    },
    /** GET https://agent.tinyfish.ai/v1/vault/connections — List vault connections. */
    async listVaultConnections(input: TinyfishListVaultConnectionsInput = {}): Promise<NativeResponse<TinyfishListVaultConnectionsResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport0.request<TinyfishListVaultConnectionsResponse>(tinyfishOperations.listVaultConnections, { ...input });
    },
    /** DELETE https://agent.tinyfish.ai/v1/vault/connections/{connectionId} — Disconnect a vault provider. */
    async disconnectVault(input: TinyfishDisconnectVaultInput): Promise<NativeResponse<TinyfishDisconnectVaultResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport0.request<TinyfishDisconnectVaultResponse>(tinyfishOperations.disconnectVault, { ...input });
    },
    /** GET https://agent.tinyfish.ai/v1/vault/items — List vault items. */
    async listVaultItems(input: TinyfishListVaultItemsInput = {}): Promise<NativeResponse<TinyfishListVaultItemsResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport0.request<TinyfishListVaultItemsResponse>(tinyfishOperations.listVaultItems, { ...input });
    },
    /** POST https://agent.tinyfish.ai/v1/vault/items/sync — Sync vault items. */
    async syncVaultItems(input: TinyfishSyncVaultItemsInput = {}): Promise<NativeResponse<TinyfishSyncVaultItemsResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport0.request<TinyfishSyncVaultItemsResponse>(tinyfishOperations.syncVaultItems, { ...input });
    },
    /** GET https://agent.tinyfish.ai/v1/wallet — Get wallet. */
    async getWallet(input: TinyfishGetWalletInput = {}): Promise<NativeResponse<TinyfishGetWalletResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport0.request<TinyfishGetWalletResponse>(tinyfishOperations.getWallet, { ...input });
    },
    /** POST https://agent.tinyfish.ai/v1/wallet/top-up — Top up wallet (agent-paid). */
    async topUpWallet(input: TinyfishTopUpWalletInput): Promise<NativeResponse<TinyfishTopUpWalletResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      if (input.body !== undefined && (!input.body || typeof input.body !== "object" || Array.isArray(input.body))) throw new SearchError("invalid_request");
      return transport0.request<TinyfishTopUpWalletResponse>(tinyfishOperations.topUpWallet, { ...input });
    },
    /** GET https://api.search.tinyfish.ai/ — Search the web. */
    async search(input: TinyfishSearchInput): Promise<NativeResponse<TinyfishSearchResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.query === undefined) throw new SearchError("invalid_request");
      if (input.query !== undefined && (!input.query || typeof input.query !== "object" || Array.isArray(input.query))) throw new SearchError("invalid_request");
      return transport1.request<TinyfishSearchResponse>(tinyfishOperations.search, { ...input, query: wireQuery(input.query, []) ?? {} });
    },
    /** GET https://api.search.tinyfish.ai/usage — List search usage. */
    async listSearchUsage(input: TinyfishListSearchUsageInput = {}): Promise<NativeResponse<TinyfishListSearchUsageResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.query !== undefined && (!input.query || typeof input.query !== "object" || Array.isArray(input.query))) throw new SearchError("invalid_request");
      return transport1.request<TinyfishListSearchUsageResponse>(tinyfishOperations.listSearchUsage, { ...input, query: wireQuery(input.query, []) ?? {} });
    },
    /** POST https://api.fetch.tinyfish.ai/ — Fetch and extract content from URLs. */
    async fetchUrls(input: TinyfishFetchUrlsInput): Promise<NativeResponse<TinyfishFetchUrlsResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      if (input.body !== undefined && (!input.body || typeof input.body !== "object" || Array.isArray(input.body))) throw new SearchError("invalid_request");
      return transport2.request<TinyfishFetchUrlsResponse>(tinyfishOperations.fetchUrls, { ...input });
    },
    /** GET https://api.fetch.tinyfish.ai/usage — List fetch usage. */
    async listFetchUsage(input: TinyfishListFetchUsageInput = {}): Promise<NativeResponse<TinyfishListFetchUsageResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.query !== undefined && (!input.query || typeof input.query !== "object" || Array.isArray(input.query))) throw new SearchError("invalid_request");
      return transport2.request<TinyfishListFetchUsageResponse>(tinyfishOperations.listFetchUsage, { ...input, query: wireQuery(input.query, []) ?? {} });
    },
    /** POST https://api.browser.tinyfish.ai/ — Create a remote browser session. */
    async createBrowserSession(input: TinyfishCreateBrowserSessionInput = {}): Promise<NativeResponse<TinyfishCreateBrowserSessionResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body !== undefined && (!input.body || typeof input.body !== "object" || Array.isArray(input.body))) throw new SearchError("invalid_request");
      return transport3.request<TinyfishCreateBrowserSessionResponse>(tinyfishOperations.createBrowserSession, { ...input });
    },
    /** GET https://api.browser.tinyfish.ai/usage — List browser session usage. */
    async listBrowserUsage(input: TinyfishListBrowserUsageInput = {}): Promise<NativeResponse<TinyfishListBrowserUsageResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.query !== undefined && (!input.query || typeof input.query !== "object" || Array.isArray(input.query))) throw new SearchError("invalid_request");
      return transport3.request<TinyfishListBrowserUsageResponse>(tinyfishOperations.listBrowserUsage, { ...input, query: wireQuery(input.query, []) ?? {} });
    },
    /** DELETE https://api.browser.tinyfish.ai/{sessionId} — Terminate a browser session. */
    async deleteBrowserSession(input: TinyfishDeleteBrowserSessionInput): Promise<NativeResponse<null>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport3.request<string>(tinyfishOperations.deleteBrowserSession, { ...input }).then(emptyResult);
    },
    /** POST https://agent.tinyfish.ai/v1/monitors — Create a Monitor. */
    async createMonitor(input: TinyfishCreateMonitorInput): Promise<NativeResponse<TinyfishCreateMonitorResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      if (input.body !== undefined && (!input.body || typeof input.body !== "object" || Array.isArray(input.body))) throw new SearchError("invalid_request");
      return transport0.request<TinyfishCreateMonitorResponse>(tinyfishOperations.createMonitor, { ...input });
    },
    /** GET https://agent.tinyfish.ai/v1/monitors — List Monitors. */
    async listMonitors(input: TinyfishListMonitorsInput = {}): Promise<NativeResponse<TinyfishListMonitorsResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport0.request<TinyfishListMonitorsResponse>(tinyfishOperations.listMonitors, { ...input });
    },
    /** GET https://agent.tinyfish.ai/v1/monitors/{id} — Get a Monitor. */
    async getMonitor(input: TinyfishGetMonitorInput): Promise<NativeResponse<TinyfishGetMonitorResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport0.request<TinyfishGetMonitorResponse>(tinyfishOperations.getMonitor, { ...input });
    },
    /** PATCH https://agent.tinyfish.ai/v1/monitors/{id} — Update a Monitor. */
    async updateMonitor(input: TinyfishUpdateMonitorInput): Promise<NativeResponse<TinyfishUpdateMonitorResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      if (input.body !== undefined && (!input.body || typeof input.body !== "object" || Array.isArray(input.body))) throw new SearchError("invalid_request");
      return transport0.request<TinyfishUpdateMonitorResponse>(tinyfishOperations.updateMonitor, { ...input });
    },
    /** DELETE https://agent.tinyfish.ai/v1/monitors/{id} — Delete a Monitor. */
    async deleteMonitor(input: TinyfishDeleteMonitorInput): Promise<NativeResponse<TinyfishDeleteMonitorResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport0.request<TinyfishDeleteMonitorResponse>(tinyfishOperations.deleteMonitor, { ...input });
    },
    /** POST https://agent.tinyfish.ai/v1/monitors/{id}/runs — Run a Monitor now. */
    async runMonitor(input: TinyfishRunMonitorInput): Promise<NativeResponse<TinyfishRunMonitorResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport0.request<TinyfishRunMonitorResponse>(tinyfishOperations.runMonitor, { ...input });
    },
    /** POST https://agent.tinyfish.ai/v1/automation/run-research — Run research with SSE streaming. */
    async runResearch(input: TinyfishRunResearchInput): Promise<NativeResponse<AsyncIterable<NativeSSEEvent>>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      if (input.body !== undefined && (!input.body || typeof input.body !== "object" || Array.isArray(input.body))) throw new SearchError("invalid_request");
      return transport0.request(tinyfishOperations.runResearch, { ...input, headers: { ...input.headers, Accept: "text/event-stream" } });
    },
    /** POST https://agent.tinyfish.ai/v1/automation/run-research-async — Start research asynchronously. */
    async startResearchAsync(input: TinyfishStartResearchAsyncInput): Promise<NativeResponse<TinyfishStartResearchAsyncResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      if (input.body !== undefined && (!input.body || typeof input.body !== "object" || Array.isArray(input.body))) throw new SearchError("invalid_request");
      return transport0.request<TinyfishStartResearchAsyncResponse>(tinyfishOperations.startResearchAsync, { ...input });
    },
    /** GET https://agent.tinyfish.ai/v1/research-run/{research_run_id}/events — Attach to research progress. */
    async streamResearchEvents(input: TinyfishStreamResearchEventsInput): Promise<NativeResponse<AsyncIterable<NativeSSEEvent>>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport0.request(tinyfishOperations.streamResearchEvents, { ...input, headers: { ...input.headers, Accept: "text/event-stream" } });
    },
    /** GET https://agent.tinyfish.ai/v1/research-run — List research runs. */
    async listResearchRuns(input: TinyfishListResearchRunsInput = {}): Promise<NativeResponse<TinyfishListResearchRunsResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.query !== undefined && (!input.query || typeof input.query !== "object" || Array.isArray(input.query))) throw new SearchError("invalid_request");
      return transport0.request<TinyfishListResearchRunsResponse>(tinyfishOperations.listResearchRuns, { ...input, query: wireQuery(input.query, []) ?? {} });
    },
    /** GET https://agent.tinyfish.ai/v1/research-run/{research_run_id} — Get research run by ID. */
    async getResearchRun(input: TinyfishGetResearchRunInput): Promise<NativeResponse<TinyfishGetResearchRunResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport0.request<TinyfishGetResearchRunResponse>(tinyfishOperations.getResearchRun, { ...input });
    },
    /** POST https://agent.tinyfish.ai/v1/research-run/{research_run_id}/cancel — Cancel research run by ID. */
    async cancelResearchRun(input: TinyfishCancelResearchRunInput): Promise<NativeResponse<TinyfishCancelResearchRunResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport0.request<TinyfishCancelResearchRunResponse>(tinyfishOperations.cancelResearchRun, { ...input });
    },
  });
}

export type TinyfishClient = ReturnType<typeof createTinyfishClient>;
