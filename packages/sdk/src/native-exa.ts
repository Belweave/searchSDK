// Native wire types and operations derived from official provider documentation.
// Sources, access gates, and verification limits: docs/provider-surfaces-a.md.
// Static wire types are not JSON Schema validation: ranges, patterns, and if/then
// constraints remain provider responsibilities; unconstrained source data stays unknown.
import { createNativeTransport } from "./native-transport.js";
import type { NativeOperation, NativeRequestInput, NativeResponse, NativeSSEEvent, NativeTransportConfig } from "./native-transport.js";
import { SearchError } from "./errors.js";

export interface ExaClientOptions extends Omit<NativeTransportConfig, "provider" | "baseUrl" | "headers"> {
  /** Server-side credential. Never embed it in browser bundles. */
  apiKey: string;
  /** Separate service credential for the Team Management API. Required only by API-key management methods. */
  teamApiKey?: string;
}

export type ExaSchemaSearchRequest = {
  "includeDomains"?: ((Array<string>) | (null));
  "excludeDomains"?: ((Array<string>) | (null));
  "startPublishedDate"?: ((string) | (null));
  "endPublishedDate"?: ((string) | (null));
  "numResults"?: ((number) | (null));
  "moderation"?: ((boolean) | (null));
  "contents"?: ((ExaSchemaContentsOptions) | (null));
  /** The query string for the search. (minLength 1) */
  "query": string;
  "additionalQueries"?: ((Array<string>) | (null));
  /** The search mode to use. Defaults to `auto`, a balanced mode recommended for most applications. - `auto`: The default. A balanced mode that optimizes for both quality and speed and is recommended for most applications. - `lite`: Low-cost, low-latency search for real-time and inter */
  "type"?: (("auto") | ("lite") | ("deep-lite") | ("deep") | ("instant") | ("fast") | ("deep-reasoning") | (string) | (null));
  "category"?: (("company" | "publication" | "news" | "personal site" | "financial report" | "people") | (null));
  "userLocation"?: ((((string) | ({
    /** The two-letter ISO 3166-1 country code of the user, e.g. `US`. */
    "country": string;
  }) | ({
    /** The two-letter ISO 3166-1 country code of the user, e.g. `US`. */
    "country"?: string;
    /** The user's latitude in decimal degrees. (min -90, max 90) */
    "latitude": number;
    /** The user's longitude in decimal degrees. (min -180, max 180) */
    "longitude": number;
  }))) | (null));
  "compliance"?: (("hipaa") | (null));
  "outputSchema"?: (({ [key: string]: unknown } & ((ExaSchemaOutputSchemaText) | (ExaSchemaOutputSchemaObject))) | (null));
  /** The broader goal this search serves: the task the caller is working on, beyond the query itself. When exposing this field to an agent as a tool parameter, describe it as: "Goal for this search turn; say which documents should rank first, which should be excluded, and what specifi */
  "objective"?: ((string) | (null));
  /** An opaque ID your platform assigns to the end user this request is made for, such as a UUID. Lets Exa attribute usage to that end user rather than your whole team. Must not contain personal information such as an email address, phone number, username, or name. Hash such values be */
  "userIdentifier"?: ((string) | (null));
  "systemPrompt"?: ((string) | (null));
  "stream"?: ((boolean) | (null));
  "startCrawlDate"?: ((string) | (null));
  "endCrawlDate"?: ((string) | (null));
  /** Deprecated. List of strings that must be present in the webpage text of results. Matching is approximate (word-level rather than exact phrase), so a multi-word entry can match pages where its words appear separately. Up to 50 strings, each up to 4096 characters. */
  "includeText"?: ((Array<string>) | (null));
  /** Deprecated. List of strings that must not be present in the webpage text of results. Matching is approximate (word-level rather than exact phrase). Up to 50 strings, each up to 4096 characters. */
  "excludeText"?: ((Array<string>) | (null));
  "context"?: ((((boolean) | ({
    /** Maximum character limit for the context string. (min 1, max 1000000) */
    "maxCharacters"?: number;
  }))) | (null));
};

export type ExaSchemaSearchResponse = ((ExaSchemaSearchSynthesisResponse) | (ExaSchemaSearchResultsResponse));

export type ExaSchemaSearchStreamChunk = { [key: string]: unknown } & ((ExaSchemaSearchStreamTextDeltaChunkOutput) | (ExaSchemaSearchStreamGroundingChunkOutput) | (ExaSchemaSearchStreamResultsChunkOutput) | (ExaSchemaSearchStreamResetChunkOutput) | (ExaSchemaSearchStreamDoneChunkOutput) | (ExaSchemaSearchStreamErrorChunkOutput));

export type ExaSchemaContentsRequest = {
  /** Document IDs obtained from searches. (maxItems 100) */
  "ids"?: Array<string>;
  /** URLs to crawl (backwards compatible with the `ids` parameter). (maxItems 100) */
  "urls"?: Array<string>;
  "compliance"?: (("hipaa") | (null));
  /** An opaque ID your platform assigns to the end user this request is made for, such as a UUID. Lets Exa attribute usage to that end user rather than your whole team. Must not contain personal information such as an email address, phone number, username, or name. Hash such values be */
  "userIdentifier"?: ((string) | (null));
  "text"?: ((((boolean) | ({
    "maxCharacters"?: ((number) | (null));
    "includeHtmlTags"?: ((boolean) | (null));
    "verbosity"?: (("compact" | "standard" | "full") | (null));
    "includeSections"?: ((Array<"header" | "navigation" | "banner" | "body" | "sidebar" | "footer" | "metadata">) | (null));
    "excludeSections"?: ((Array<"header" | "navigation" | "banner" | "body" | "sidebar" | "footer" | "metadata">) | (null));
  }))) | (null));
  "highlights"?: ((((boolean) | ({
    "query"?: ((string) | (null));
    "verbosity"?: (("low" | "medium" | "high") | (null));
    "dynamic"?: ((boolean) | (null));
    "maxCharacters"?: ((number) | (null));
    "numSentences"?: ((number) | (null));
    "highlightsPerUrl"?: ((number) | (null));
  }))) | (null));
  "summary"?: (({
    "query"?: ((string) | (null));
    "schema"?: (({
      [key: string]: ExaSchemaJsonValue;
    }) | (null));
  }) | (null));
  "extras"?: (({
    "links"?: ((number) | (null));
    "imageLinks"?: ((number) | (null));
    "richImageLinks"?: ((number) | (null));
    "richLinks"?: ((number) | (null));
    "codeBlocks"?: ((number) | (null));
  }) | (null));
  "livecrawlTimeout"?: ((number) | (null));
  "maxAgeHours"?: ((number) | (null));
  "snapshotAsOf"?: ((((string) | (string))) | (null));
  "subpages"?: ((number) | (null));
  "subpageTarget"?: ((((string) | (Array<string>))) | (null));
  "context"?: ((((boolean) | ({
    /** Maximum character limit for the context string. (min 1, max 1000000) */
    "maxCharacters"?: number;
  }))) | (null));
  "livecrawl"?: (("never" | "always" | "fallback" | "preferred") | (null));
  /** Deprecated. Use `snapshotAsOf` instead. Alias of snapshotAsOf with identical behavior. (format date-time) */
  "crawledBeforeDate"?: ((string) | (null));
} & (({
  /** Document IDs obtained from searches. (maxItems 100) */
  "ids": Array<string>;
}) | ({
  /** URLs to crawl (backwards compatible with the `ids` parameter). (maxItems 100) */
  "urls": Array<string>;
}));

export type ExaSchemaContentsResponse = {
  /** Unique identifier for the request. */
  "requestId"?: string;
  "results"?: Array<ExaSchemaSearchResultOutput>;
  /** Status information for each requested URL or document ID. */
  "statuses"?: Array<{
    /** The URL or document ID that was requested. */
    "id": string;
    /** Status of the content fetch operation. */
    "status": "success" | "error";
    /** Where the returned content was sourced from. */
    "source"?: "cached" | "crawled";
    /** Error details, only present when status is "error". */
    "error"?: (({
      /** Specific error type. */
      "tag"?: string;
      /** The corresponding HTTP status code. */
      "httpStatusCode"?: ((number) | (null));
    }) | (null));
  }>;
  "costDollars"?: ExaSchemaCostDollarsOutput;
  /** Server-side processing time in milliseconds. May exclude output synthesis time, so it can be lower than end-to-end latency. */
  "searchTime"?: number;
  /** Deprecated. Use `results[].highlights` or `results[].text` instead. Combined context string from search results. */
  "context"?: string;
};

export type ExaSchemaAnswerRequest = {
  /** Natural-language question or instructions for the request. (minLength 1) */
  "query": string;
  /** If true, the response is returned as a server-sent events (SSE) stream. */
  "stream"?: boolean;
  /** If true, returns full page text with default settings. If false, disables text return. */
  "text"?: boolean;
  /** The model used to generate the answer. */
  "model"?: "exa" | "exa-pro" | "exa-research" | "exa-fast";
  /** Additional instructions that guide generated output or agent behavior. Use this for source preferences, novelty constraints, duplication constraints, or other behavior guidance. */
  "systemPrompt"?: string;
  "userLocation"?: ((((string) | ({
    /** The two-letter ISO 3166-1 country code of the user, e.g. `US`. */
    "country": string;
  }) | ({
    /** The two-letter ISO 3166-1 country code of the user, e.g. `US`. */
    "country"?: string;
    /** The user's latitude in decimal degrees. (min -90, max 90) */
    "latitude": number;
    /** The user's longitude in decimal degrees. (min -180, max 180) */
    "longitude": number;
  }))) | (null));
  /** A [JSON Schema Draft 7](https://json-schema.org/draft-07) specification for the desired answer structure. When provided, the answer is returned as a structured object matching the schema instead of a plain string. */
  "outputSchema"?: {
    /** The root schema type (typically "object"). */
    "type"?: string;
    /** An object where each key is a property name and each value is a JSON Schema describing that property (with `type`, `description`, etc). */
    "properties"?: {
      [key: string]: ExaSchemaJsonValue;
    };
    /** List of required property names. */
    "required"?: Array<string>;
    /** A description of the schema. */
    "description"?: string;
    /** Whether to allow properties not listed in `properties`. */
    "additionalProperties"?: boolean;
    [key: string]: ExaSchemaJsonValue;
  };
  /** An opaque ID your platform assigns to the end user this request is made for, such as a UUID. Lets Exa attribute usage to that end user rather than your whole team. Must not contain personal information such as an email address, phone number, username, or name. Hash such values be */
  "userIdentifier"?: ((string) | (null));
};

export type ExaSchemaAnswerResponse = {
  /** Unique identifier for the request. */
  "requestId"?: string;
  /** The generated answer based on search results. Returns a string by default, or a structured object matching the provided outputSchema. */
  "answer": ((string) | ({
    [key: string]: ExaSchemaJsonValue;
  }));
  /** Search results used to generate the answer. */
  "citations"?: Array<{
    /** The title of the search result. */
    "title": string;
    /** The URL of the search result. (format uri) */
    "url": string;
    /** An estimate of the creation date, from parsing HTML content. Format is YYYY-MM-DD. (format date-time) */
    "publishedDate"?: string;
    /** If available, the author of the content. */
    "author"?: ((string) | (null));
    /** The temporary ID for the document. Useful for the /contents endpoint. */
    "id"?: string;
    /** The URL of an image associated with the search result, if available. (format uri) */
    "image"?: string;
    /** The URL of the favicon for the search result's domain. (format uri) */
    "favicon"?: string;
    /** The full text content of each source. Only present when text contents are requested. */
    "text"?: string;
  }>;
  "costDollars"?: ExaSchemaCostDollarsOutput;
};

export type ExaSchemaAnswerStreamChunk = ((ExaSchemaAnswerStreamTextDeltaChunk) | (ExaSchemaAnswerStreamCitationsChunkOutput) | (ExaSchemaAnswerStreamCostChunkOutput) | (ExaSchemaAnswerStreamErrorChunkOutput));

export type ExaSchemaFindSimilarRequest = {
  "includeDomains"?: ((Array<string>) | (null));
  "excludeDomains"?: ((Array<string>) | (null));
  "startPublishedDate"?: ((string) | (null));
  "endPublishedDate"?: ((string) | (null));
  "numResults"?: ((number) | (null));
  "contents"?: ((ExaSchemaContentsOptions) | (null));
  /** The url for which you would like to find similar links. (minLength 3) */
  "url": string;
  "category"?: (("company" | "publication" | "news" | "personal site" | "financial report" | "people") | (null));
  "excludeSourceDomain"?: ((boolean) | (null));
  "startCrawlDate"?: ((string) | (null));
  "endCrawlDate"?: ((string) | (null));
  /** Deprecated. List of strings that must be present in the webpage text of results. Matching is approximate (word-level rather than exact phrase), so a multi-word entry can match pages where its words appear separately. Up to 50 strings, each up to 4096 characters. Ignored for the ` */
  "includeText"?: ((Array<string>) | (null));
  /** Deprecated. List of strings that must not be present in the webpage text of results. Matching is approximate (word-level rather than exact phrase). Up to 50 strings, each up to 4096 characters. Ignored for the `company` and `people` categories. */
  "excludeText"?: ((Array<string>) | (null));
};

export type ExaSchemaFindSimilarResponse = {
  /** Unique identifier for the request. */
  "requestId"?: string;
  /** A list of search results containing title, URL, published date, and author. */
  "results"?: Array<ExaSchemaFindSimilarResult>;
  "costDollars"?: ExaSchemaCostDollarsOutput;
  /** Server-side processing time in milliseconds. May exclude output synthesis time, so it can be lower than end-to-end latency. */
  "searchTime"?: number;
  /** Deprecated. Use `results[].highlights` or `results[].text` instead. Combined context string from search results. */
  "context"?: string;
};

export type ExaSchemaCreateSearchMonitorParameters = {
  /** An optional name for the monitor */
  "name"?: string;
  "search": ExaSchemaSearchMonitorSearch;
  "trigger"?: ExaSchemaSearchMonitorTrigger;
  "outputSchema"?: ExaSchemaSearchMonitorOutputSchema;
  /** Optional key-value metadata. Echoed back in webhook deliveries so you can route updates to systems like Slack. */
  "metadata"?: {
    [key: string]: string;
  };
  "webhook": ExaSchemaSearchMonitorWebhook;
};

export type ExaSchemaCreateSearchMonitorResponse = {
  /** The unique identifier for the monitor */
  "id": string;
  /** An optional display name */
  "name": ((string) | (null));
  /** The status of the monitor. `active` monitors run on schedule and can be triggered manually. `paused` monitors can only be triggered manually. `disabled` monitors are auto-disabled after 10 consecutive authentication failures. */
  "status": "active" | "paused" | "disabled";
  "search": ExaSchemaSearchMonitorSearchOutput;
  /** The interval-based schedule for automatic runs. Null if no schedule is set. */
  "trigger": ((ExaSchemaSearchMonitorTriggerOutput) | (null));
  "outputSchema": ExaSchemaSearchMonitorOutputSchemaOutput;
  /** Optional key-value metadata for your own tracking. Echoed back in webhook deliveries so you can route updates to systems like Slack. */
  "metadata": (({
    [key: string]: string;
  }) | (null));
  "webhook": ExaSchemaSearchMonitorWebhookOutput;
  /** When the next scheduled run will occur. Null if no trigger is set. (format date-time) */
  "nextRunAt": ((string) | (null));
  /** When the monitor was created (format date-time) */
  "createdAt": string;
  /** When the monitor was last updated (format date-time) */
  "updatedAt": string;
  /** The secret used to verify webhook signatures. This is only returned once at creation time. Store it securely. */
  "webhookSecret": string;
};

export type ExaSchemaListSearchMonitorsResponse = {
  /** The list of monitors */
  "data": Array<ExaSchemaSearchMonitor>;
  /** Whether there are more results */
  "hasMore": boolean;
  /** Cursor for the next page */
  "nextCursor"?: ((string) | (null));
};

export type ExaSchemaBatchMonitorsRequest = {
  /** The action to perform on matching monitors. `delete` permanently removes them, `pause` sets their status to paused, and `unpause` sets their status to active. */
  "action": "delete" | "pause" | "unpause";
  /** At least one filter field must be provided to prevent accidental bulk operations. */
  "filter": {
    /** Filter by name (case-insensitive substring match) (maxLength 250) */
    "name"?: string;
    /** Filter by monitor status */
    "status"?: "active" | "paused" | "disabled";
    /** Filter by metadata key-value pairs (exact match, AND semantics) */
    "metadata"?: {
      [key: string]: string;
    };
  };
  /** When `true`, returns the monitors that would be affected without performing the action. Defaults to `true`. */
  "dry_run"?: boolean;
  /** Maximum number of monitors to process in a single request. Defaults to 50, maximum 500. (min 1, max 500) */
  "limit"?: number;
};

export type ExaSchemaBatchMonitorsResponse = {
  /** The action that was performed */
  "action": "delete" | "pause" | "unpause";
  /** The number of monitors affected by the action */
  "affected": number;
  /** The IDs of the monitors that were affected */
  "ids": Array<string>;
  /** Whether this was a dry run */
  "dry_run": boolean;
  /** Whether there are more monitors matching the filter. If `true`, repeat the request to process the next batch. */
  "has_more": boolean;
};

export type ExaSchemaSearchMonitor = {
  /** The unique identifier for the monitor */
  "id": string;
  /** An optional display name */
  "name": ((string) | (null));
  /** The status of the monitor. `active` monitors run on schedule and can be triggered manually. `paused` monitors can only be triggered manually. `disabled` monitors are auto-disabled after 10 consecutive authentication failures. */
  "status": "active" | "paused" | "disabled";
  "search": ExaSchemaSearchMonitorSearchOutput;
  /** The interval-based schedule for automatic runs. Null if no schedule is set. */
  "trigger": ((ExaSchemaSearchMonitorTriggerOutput) | (null));
  "outputSchema": ExaSchemaSearchMonitorOutputSchemaOutput;
  /** Optional key-value metadata for your own tracking. Echoed back in webhook deliveries so you can route updates to systems like Slack. */
  "metadata": (({
    [key: string]: string;
  }) | (null));
  "webhook": ExaSchemaSearchMonitorWebhookOutput;
  /** When the next scheduled run will occur. Null if no trigger is set. (format date-time) */
  "nextRunAt": ((string) | (null));
  /** When the monitor was created (format date-time) */
  "createdAt": string;
  /** When the monitor was last updated (format date-time) */
  "updatedAt": string;
};

export type ExaSchemaUpdateSearchMonitorParameters = {
  /** Update the monitor name */
  "name"?: ((string) | (null));
  /** Update the monitor status (can only set to `active` or `paused`) */
  "status"?: "active" | "paused";
  /** Partial search params to merge. All fields are optional for updates. */
  "search"?: {
    /** The query string for the search. (minLength 1) */
    "query"?: string;
    /** Number of results to return. Limits vary by search type. The maximum public limit is 100 results. Contact sales (hello@exa.ai) to discuss higher limits. (min 1, max 100) */
    "numResults"?: number;
    /** Restrict search results to these domains. */
    "includeDomains"?: Array<string>;
    /** Exclude these domains from search results. */
    "excludeDomains"?: Array<string>;
    "contents"?: ExaSchemaSearchMonitorContents;
  };
  /** Update the schedule. Set to null to remove the schedule. */
  "trigger"?: (({
    /** The type of trigger. Currently only `interval` is supported. */
    "type"?: "interval";
    /** A duration string specifying how often the monitor runs (e.g., "1h", "6h", "1d", "7d"). Single-unit only. Minimum interval is 1 hour. */
    "period"?: string;
  }) | (null));
  "outputSchema"?: ExaSchemaSearchMonitorOutputSchema;
  /** Update metadata. Set to null to remove. Echoed back in webhook deliveries so you can route updates to systems like Slack. */
  "metadata"?: (({
    [key: string]: string;
  }) | (null));
  /** Partial webhook params to merge. All fields are optional for updates. */
  "webhook"?: {
    /** The HTTPS URL to receive webhook events. Must not point to localhost or private IP ranges. (format uri) */
    "url"?: string;
    /** Which events to subscribe to. Defaults to all events if not specified. */
    "events"?: Array<"monitor.created" | "monitor.updated" | "monitor.deleted" | "monitor.run.created" | "monitor.run.completed">;
  };
};

export type ExaSchemaTriggerSearchMonitorResponse = {
  /** Whether the monitor was successfully triggered */
  "triggered": boolean;
};

export type ExaSchemaListSearchMonitorRunsResponse = {
  /** The list of runs */
  "data": Array<ExaSchemaSearchMonitorRun>;
  /** Whether there are more results */
  "hasMore": boolean;
  /** Cursor for the next page */
  "nextCursor"?: ((string) | (null));
};

export type ExaSchemaSearchMonitorRun = {
  /** The unique identifier for the run */
  "id": string;
  /** The monitor this run belongs to */
  "monitorId": string;
  /** The status of the run */
  "status": "pending" | "running" | "completed" | "failed" | "cancelled";
  /** The output of the run. Null until the run completes. */
  "output": ((ExaSchemaSearchMonitorRunOutput) | (null));
  /** The reason the run failed. Null unless status is `failed`. `source_not_available` means the search requested a domain Exa cannot return (remove it from the search), and `forbidden` means the request was otherwise not permitted. */
  "failReason": (("api_key_invalid" | "insufficient_credits" | "invalid_params" | "rate_limited" | "source_not_available" | "forbidden" | "search_unavailable" | "search_failed" | "internal_error") | (null));
  /** When the run started executing (format date-time) */
  "startedAt": ((string) | (null));
  /** When the run completed successfully (format date-time) */
  "completedAt": ((string) | (null));
  /** When the run failed (format date-time) */
  "failedAt": ((string) | (null));
  /** When the run was cancelled (format date-time) */
  "cancelledAt": ((string) | (null));
  /** Total execution time in milliseconds */
  "durationMs": ((number) | (null));
  /** When the run was created (format date-time) */
  "createdAt": string;
  /** When the run was last updated (format date-time) */
  "updatedAt": string;
};

export type ExaSchemaCreateAgentRunRequest = {
  /** Natural-language question or instructions for the request. (minLength 1) */
  "query": string;
  /** Additional instructions that guide generated output or agent behavior. Use this for source preferences, novelty constraints, duplication constraints, or other behavior guidance. */
  "systemPrompt"?: string;
  "effort"?: ExaSchemaAgentEffort;
  /** Records to process and records or entities to exclude from the answer. */
  "input"?: {
    /** Records the agent should process or enrich. */
    "data"?: Array<{
      [key: string]: ExaSchemaJsonValue;
    }>;
    /** Records or entities the agent should avoid returning. */
    "exclusion"?: Array<{
      [key: string]: ExaSchemaJsonValue;
    }>;
  };
  "outputSchema"?: (({
    [key: string]: ExaSchemaJsonValue;
  }) | (null));
  /** Completed run ID to continue from. Must belong to the same team. */
  "previousRunId"?: ExaSchemaAgentRunId;
  /** Caller-provided metadata stored with the run. */
  "metadata"?: {
    [key: string]: string;
  };
  /** Exa Connect data providers to enable for the run. Each entry enables all of that provider's tools. (maxItems 5) */
  "dataSources"?: Array<ExaSchemaAgentDataSource>;
  "budget"?: ExaSchemaAgentBudget;
  /** An opaque ID your platform assigns to the end user this request is made for, such as a UUID. Lets Exa attribute usage to that end user rather than your whole team. Must not contain personal information such as an email address, phone number, username, or name. Hash such values be */
  "userIdentifier"?: ((string) | (null));
};

export type ExaSchemaAgentRun = {
  "id": ExaSchemaAgentRunId;
  "object": "agent_run";
  "status": ExaSchemaAgentRunStatus;
  /** Why the run stopped. `null` while the run is queued or running. Every reason except `error` and `cancelled` means the run completed and returned what it found. Clients should accept values not listed here. */
  "stopReason": ((ExaSchemaAgentStopReason) | (null));
  /** When the run was created (format date-time) */
  "createdAt": string;
  /**  (format date-time) */
  "completedAt": ((string) | (null));
  "request": ((ExaSchemaAgentRunRequest) | (null));
  "output": ExaSchemaAgentRunOutput;
  "usage": ExaSchemaAgentUsage;
  "costDollars": ExaSchemaAgentCostDollars;
};

export type ExaSchemaAgentRunEvent = {
  /** Event ID within the run. */
  "id": string;
  "event": "agent_run.created" | "agent_run.started" | "agent_run.completed" | "agent_run.failed" | "agent_run.cancelled";
  "data": ExaSchemaJsonValue;
  /** When the event was created (format date-time) */
  "createdAt": string;
};

export type ExaSchemaAgentRunId = string;

export type ExaSchemaAgentRunList = {
  "object": "list";
  "data": Array<ExaSchemaAgentRun>;
  /** Whether there are more results */
  "hasMore": boolean;
  "nextCursor": ((ExaSchemaAgentRunId) | (null));
};

export type ExaSchemaDeleteAgentRunResponse = {
  "id": ExaSchemaAgentRunId;
  "object": "agent_run.deleted";
  "deleted": true;
};

export type ExaSchemaAgentRunEventList = {
  "object": "list";
  "data": Array<ExaSchemaAgentRunEvent>;
  /** Whether there are more results */
  "hasMore": boolean;
  "nextCursor": ((string) | (null));
};

export type ExaSchemaCreateBatchRequest = {
  /** The requests to enqueue. Each `customId` must be unique within the batch. */
  "requests": Array<ExaSchemaBatchRequestItem>;
  /** Caller-provided metadata stored with the batch. */
  "metadata"?: {
    [key: string]: string;
  };
};

export type ExaSchemaBatch = {
  /** Batch ID. New batch IDs are returned with the `batch_` prefix. */
  "id": string;
  /** The object type, always `batch`. */
  "object": "batch";
  "status": ExaSchemaBatchStatus;
  "requestCounts": ExaSchemaBatchRequestCounts;
  /** When the batch was created. (format date-time) */
  "createdAt": string;
  /** When the batch expires, or `null` if it does not expire. (format date-time) */
  "expiresAt": ((string) | (null));
  /** When the batch reached a terminal status, or `null` while it is still running. (format date-time) */
  "endedAt": ((string) | (null));
  /** Short-lived download URL for the batch results file (JSONL), or `null` until the batch completes. Fetch it directly, without an API key. Retrieve the batch again for a fresh URL after it expires. */
  "resultsUrl": ((string) | (null));
  /** Caller-provided key-value metadata for your own tracking. */
  "metadata": {
    [key: string]: string;
  };
};

export type ExaSchemaBatchList = {
  /** The object type, always `list`. */
  "object": "list";
  /** The page of batches, newest first. */
  "data": Array<ExaSchemaBatch>;
  /** Whether there are more results */
  "hasMore": boolean;
  /** Cursor for the next page */
  "nextCursor": ((string) | (null));
};

export type ExaSchemaDeletedBatch = {
  /** ID of the deleted batch. */
  "id": string;
  /** The object type, always `batch.deleted`. */
  "object": "batch.deleted";
  /** Always `true` for a successful delete. */
  "deleted": true;
};

export type ExaSchemaWebsetsTeamInfo = {
  /** The object type, always `"team"`. */
  "object": "team";
  /** Unique identifier for the team. */
  "id": string;
  /** Name of the team. */
  "name": string;
  /** Current concurrency usage. */
  "concurrency": {
    /** Number of requests currently being processed. */
    "active": number;
    /** Number of requests currently queued. */
    "queued": number;
  };
  /** Concurrency limits for the team. */
  "limits": {
    /** Maximum number of concurrent requests allowed. Null means unlimited. */
    "maxConcurrent": ((number) | (null));
    /** Maximum number of queued requests allowed. Null means unlimited. */
    "maxQueued": ((number) | (null));
  };
};

export type ExaSchemaCreateWebsetParameters = {
  /** Optional name that appears anywhere the Webset is displayed. Leave empty to have Exa generate one automatically. (minLength 1) */
  "title"?: (string) | null;
  /** Create initial search for the Webset. */
  "search"?: {
    /** Natural language search query describing what you are looking for. Be specific and descriptive about your requirements, characteristics, and any constraints that help narrow down the results. Any URLs provided will be crawled and used as additional context for the search. (minLength 1, maxLength 5000) */
    "query": string;
    /** Number of Items the Webset will attempt to find. The actual number of Items found may be less than this number depending on the search complexity. (min 1) */
    "count"?: number;
    /** Entity the Webset returns results for. Detected from the query when omitted. */
    "entity"?: ExaSchemaEntity;
    /** Criteria every Item is evaluated against. Generated from the query when omitted. (maxItems 5) */
    "criteria"?: Array<ExaSchemaCreateCriterionParameters>;
    /** Optional soft cap for people searches. When set, the search will try to include at most this many matching people from the same current employer company. (min 1) */
    "maxPeoplePerCompany"?: number;
    /** Whether to estimate how many relevant results exist for this search. The estimate is returned in the search's `recall` field. */
    "recall"?: boolean;
    /** Imports or Websets whose items are left out of this search's results. */
    "exclude"?: Array<{
      "source": "import" | "webset";
      /** The ID of the source to exclude. (minLength 1) */
      "id": string;
    }>;
    /** Limit the search to specific sources (existing imports or websets). Any results found within these sources matching the search criteria will be included in the Webset. */
    "scope"?: Array<{
      "source": "import" | "webset";
      /** The ID of the source to search. (minLength 1) */
      "id": string;
      "relationship"?: {
        /** What the relationship of the entities you hope to find is relative to the entities contained in the provided source. */
        "definition": string;
        /**  (min 1, max 10) */
        "limit": number;
      };
    }>;
  };
  /** Import data from existing Websets and Imports into this Webset. */
  "import"?: Array<{
    "source": "import" | "webset";
    /** The ID of the source to import. (minLength 1) */
    "id": string;
    /** When true, items from this import will be evaluated against the search criteria. Requires a search to be provided. */
    "evaluate"?: boolean;
  }>;
  /** Enrichments that extract additional data from each Item added to the Webset. */
  "enrichments"?: Array<ExaSchemaCreateEnrichmentParameters>;
  /** Global exclusion sources (existing imports or websets) that apply to all operations within this Webset. Any results found within these sources will be omitted across all search and import operations. */
  "exclude"?: Array<{
    "source": "import" | "webset";
    /** The ID of the source to exclude. (minLength 1) */
    "id": string;
  }>;
  /** The external identifier for the webset. You can use this to reference the Webset by your own internal identifiers. (maxLength 300) */
  "externalId"?: string;
  /** Set of key-value pairs you want to associate with this object. */
  "metadata"?: {
    [key: string]: string;
  };
};

export type ExaSchemaWebset = {
  /** The unique identifier for the webset */
  "id": string;
  /** The type of object */
  "object": "webset";
  /** The status of the webset */
  "status": "idle" | "pending" | "running" | "paused";
  /** The external identifier for the webset */
  "externalId": (string) | null;
  /** The title of the webset */
  "title": (string) | null;
  /** The searches that have been performed on the webset. */
  "searches": Array<ExaSchemaWebsetSearch>;
  /** Imports that have been performed on the webset. */
  "imports": Array<ExaSchemaImport>;
  /** The Enrichments to apply to the Webset Items. */
  "enrichments": Array<ExaSchemaWebsetEnrichment>;
  /** The Monitors for the Webset. */
  "monitors": Array<ExaSchemaMonitor>;
  /** The Excludes sources (existing imports or websets) that apply to all operations within this Webset. Any results found within these sources will be omitted across all search and import operations. */
  "excludes"?: Array<{
    "source": "import" | "webset";
    "id": string;
  }>;
  /** Set of key-value pairs you want to associate with this object. */
  "metadata"?: {
    [key: string]: string;
  };
  /** The URL to view the webset in the Exa dashboard (format uri) */
  "dashboardUrl": string;
  /** The date and time the webset was created (format date-time) */
  "createdAt": string;
  /** The date and time the webset was updated (format date-time) */
  "updatedAt": string;
};

export type ExaSchemaListWebsetsResponse = {
  /** The list of websets */
  "data": Array<ExaSchemaWebset>;
  /** Whether there are more results to paginate through */
  "hasMore": boolean;
  /** The cursor to paginate through the next set of results */
  "nextCursor": (string) | null;
};

export type ExaSchemaGetWebsetResponse = ((ExaSchemaWebset) & ({
  /** When expand query parameter contains `items`, this will contain the items in the webset */
  "items"?: Array<ExaSchemaWebsetItem>;
}));

export type ExaSchemaUpdateWebsetRequest = {
  /** Set of key-value pairs you want to associate with this object. */
  "metadata"?: ({
    [key: string]: string;
  }) | null;
  /** Optional name that appears anywhere the Webset is displayed. (minLength 1) */
  "title"?: string;
};

export type ExaSchemaCreateWebsetSearchParameters = {
  /** Number of Items the Search will attempt to find. The actual number of Items found may be less than this number depending on the query complexity. (min 1) */
  "count": number;
  /** Natural language search query describing what you are looking for. Be specific and descriptive about your requirements, characteristics, and any constraints that help narrow down the results. Any URLs provided will be crawled and used as additional context for the search. (minLength 1, maxLength 5000) */
  "query": string;
  /** Entity the search returns results for. Detected from the query when omitted. */
  "entity"?: ExaSchemaEntity;
  /** Criteria every Item is evaluated against. Generated from the query when omitted. (maxItems 5) */
  "criteria"?: Array<ExaSchemaCreateCriterionParameters>;
  /** Optional soft cap for people searches. When set, the search will try to include at most this many matching people from the same current employer company. (min 1) */
  "maxPeoplePerCompany"?: number;
  /** Imports or Websets whose items are left out of this search's results. */
  "exclude"?: Array<{
    "source": "import" | "webset";
    /** The ID of the source to exclude. (minLength 1) */
    "id": string;
  }>;
  /** Limit the search to specific sources (existing imports). Any results found within these sources matching the search criteria will be included in the Webset. */
  "scope"?: Array<{
    "source": "import" | "webset";
    /** The ID of the source to search. (minLength 1) */
    "id": string;
    "relationship"?: {
      /** What the relationship of the entities you hope to find is relative to the entities contained in the provided source. */
      "definition": string;
      /**  (min 1, max 10) */
      "limit": number;
    };
  }>;
  /** Whether to estimate how many relevant results exist for this search. The estimate is returned in the search's `recall` field. */
  "recall"?: boolean;
  /** How this search interacts with existing items in the Webset: - **override**: Replace existing items and evaluate all items against new criteria - **append**: Add new items to existing ones, keeping items that match the new criteria */
  "behavior"?: ExaSchemaWebsetSearchBehavior;
  /** Set of key-value pairs you want to associate with this object. */
  "metadata"?: {
    [key: string]: string;
  };
};

export type ExaSchemaWebsetSearch = {
  /** The unique identifier for the search */
  "id": string;
  /** The type of object */
  "object": "webset_search";
  /** The unique identifier for the Webset this search belongs to */
  "websetId": string;
  /** The status of the search */
  "status": "created" | "pending" | "running" | "completed" | "canceled";
  /** The query used to create the search. (minLength 1, maxLength 5000) */
  "query": string;
  /** The entity the search will return results for. When no entity is provided during creation, we will automatically select the best entity based on the query. */
  "entity": ExaSchemaEntity;
  /** The criteria the search will use to evaluate the results. If not provided, we will automatically generate them for you. */
  "criteria": Array<{
    /** The description of the criterion (minLength 1, maxLength 1000) */
    "description": string;
    /** Value between 0 and 100 representing the percentage of results that meet the criterion. (min 0, max 100) */
    "successRate": number;
  }>;
  /** The number of results the search will attempt to find. The actual number of results may be less than this number depending on the search complexity. (min 1) */
  "count": number;
  /** The soft cap requested for matching people from the same current employer company, or null when no cap was requested. (min 1) */
  "maxPeoplePerCompany": (number) | null;
  /** The behavior of the search when it is added to a Webset. - `override`: the search will replace the existing Items found in the Webset and evaluate them against the new criteria. Any Items that don't match the new criteria will be discarded. - `append`: the search will add the new */
  "behavior"?: ExaSchemaWebsetSearchBehavior;
  /** Sources (existing imports or websets) used to omit certain results to be found during the search. */
  "exclude": Array<{
    "source": "import" | "webset";
    "id": string;
  }>;
  /** Sources the search is limited to. Empty when the search covers the whole web. */
  "scope": Array<{
    "source": "import" | "webset";
    "id": string;
    "relationship"?: {
      /** What the relationship of the entities you hope to find is relative to the entities contained in the provided source. */
      "definition": string;
      /**  (min 1, max 10) */
      "limit": number;
    };
  }>;
  /** The progress of the search */
  "progress": {
    /** The number of results found so far */
    "found": number;
    /** The number of results analyzed so far */
    "analyzed": number;
    /** The completion percentage of the search (min 0, max 100) */
    "completion": number;
    /** The estimated time remaining in seconds, null if unknown */
    "timeLeft": (number) | null;
  };
  /** Recall metrics for the search, null if not yet computed or requested. */
  "recall": ({
    "expected": {
      /** The estimated total number of potential matches */
      "total": number;
      /** The confidence in the estimate */
      "confidence": "high" | "medium" | "low";
      "bounds": {
        /** The minimum estimated total number of potential matches */
        "min": number;
        /** The maximum estimated total number of potential matches */
        "max": number;
      };
    };
    /** The reasoning for the estimate */
    "reasoning": string;
  }) | null;
  /** Set of key-value pairs you want to associate with this object. */
  "metadata"?: {
    [key: string]: string;
  };
  /** The date and time the search was canceled (format date-time) */
  "canceledAt": (string) | null;
  /** The reason the search was canceled */
  "canceledReason": ExaSchemaWebsetSearchCanceledReason;
  /** The date and time the search was created (format date-time) */
  "createdAt": string;
  /** The date and time the search was updated (format date-time) */
  "updatedAt": string;
};

export type ExaSchemaCreateEnrichmentParameters = {
  /** Provide a description of the enrichment task you want to perform to each Webset Item. (minLength 1, maxLength 5000) */
  "description": string;
  /** Format of the enrichment response. We automatically select the best format based on the description. If you want to explicitly specify the format, you can do so here. */
  "format"?: ExaSchemaWebsetEnrichmentFormat;
  /** When the format is options, the different options for the enrichment agent to choose from. (maxItems 150) */
  "options"?: Array<{
    /** The label of the option */
    "label": string;
  }>;
  /** Set of key-value pairs you want to associate with this object. */
  "metadata"?: {
    [key: string]: string;
  };
};

export type ExaSchemaWebsetEnrichment = {
  /** The unique identifier for the enrichment */
  "id": string;
  /** The type of object */
  "object": "webset_enrichment";
  /** The status of the enrichment */
  "status": "pending" | "canceled" | "completed";
  /** The unique identifier for the Webset this enrichment belongs to. */
  "websetId": string;
  /** The title of the enrichment. This will be automatically generated based on the description and format. */
  "title": (string) | null;
  /** The description of the enrichment task provided during the creation of the enrichment. */
  "description": string;
  /** The format of the enrichment response. */
  "format": ExaSchemaWebsetEnrichmentFormat;
  /** When the format is options, the different options for the enrichment agent to choose from. */
  "options": (Array<{
    /** The label of the option */
    "label": string;
  }>) | null;
  /** The instructions for the enrichment Agent. This will be automatically generated based on the description and format. */
  "instructions": (string) | null;
  /** The metadata of the enrichment */
  "metadata"?: {
    [key: string]: string;
  };
  /** The date and time the enrichment was created (format date-time) */
  "createdAt": string;
  /** The date and time the enrichment was updated (format date-time) */
  "updatedAt": string;
};

export type ExaSchemaUpdateEnrichmentParameters = {
  /** Provide a description of the enrichment task you want to perform to each Webset Item. (minLength 1, maxLength 5000) */
  "description"?: string;
  /** Format of the enrichment response. We automatically select the best format based on the description. If you want to explicitly specify the format, you can do so here. */
  "format"?: ExaSchemaWebsetEnrichmentFormat;
  /** When the format is options, the different options for the enrichment agent to choose from. (maxItems 150) */
  "options"?: Array<{
    /** The label of the option */
    "label": string;
  }>;
  /** Set of key-value pairs you want to associate with this object. */
  "metadata"?: ({
    [key: string]: string;
  }) | null;
};

export type ExaSchemaWebsetItem = {
  /** The unique identifier for the Webset Item */
  "id": string;
  /** The type of object */
  "object": "webset_item";
  /** The source of the Item */
  "source": "search" | "import";
  /** The unique identifier for the source */
  "sourceId": string;
  /** The original identifier used to resolve this item (e.g., email, name, or URL). Only relevant when the source is import. */
  "sourceEntityId"?: string;
  /** The import that sourced this item, when the item came from a scoped search with evaluate enabled on the import. */
  "scopeId"?: string;
  /** The unique identifier for the Webset this Item belongs to. */
  "websetId": string;
  /** The properties of the Item */
  "properties": ((ExaSchemaWebsetItemPersonProperties) | (ExaSchemaWebsetItemCompanyProperties) | (ExaSchemaWebsetItemArticleProperties) | (ExaSchemaWebsetItemResearchPaperProperties) | (ExaSchemaWebsetItemCustomProperties));
  /** The criteria evaluations of the item */
  "evaluations": Array<ExaSchemaWebsetItemEvaluation>;
  /** The enrichments results of the Webset item */
  "enrichments": (Array<ExaSchemaEnrichmentResult>) | null;
  /** The date and time the item was created (format date-time) */
  "createdAt": string;
  /** The date and time the item was last updated (format date-time) */
  "updatedAt": string;
};

export type ExaSchemaListWebsetItemResponse = {
  /** The list of webset items */
  "data": Array<ExaSchemaWebsetItem>;
  /** Whether there are more Items to paginate through */
  "hasMore": boolean;
  /** The cursor to paginate through the next set of Items */
  "nextCursor": (string) | null;
};

export type ExaSchemaPreviewWebsetParameters = {
  "search": {
    /** Natural language search query describing what you are looking for. Be specific and descriptive about your requirements, characteristics, and any constraints that help narrow down the results. (minLength 1, maxLength 5000) */
    "query": string;
    /** Entity to search for. Detected from the query when omitted. */
    "entity"?: ExaSchemaEntity;
    /** When query parameter search=true, the number of preview items to return. (min 1, max 10) */
    "count"?: number;
  };
};

export type ExaSchemaPreviewWebsetResponse = {
  "search": {
    /** Detected entity from the query. */
    "entity": ((ExaSchemaCompanyEntity) | (ExaSchemaPersonEntity) | (ExaSchemaArticleEntity) | (ExaSchemaResearchPaperEntity) | (ExaSchemaCustomEntity));
    /** Detected criteria from the query. */
    "criteria": Array<{
      "description": string;
    }>;
  };
  /** Detected enrichments from the query. */
  "enrichments": Array<{
    /** Description of the enrichment. */
    "description": string;
    /** Format of the enrichment. */
    "format": "text" | "date" | "number" | "options" | "email" | "phone" | "url";
    /** When format is options, the options detected from the query. */
    "options"?: Array<{
      /** Label of the option. */
      "label": string;
    }>;
  }>;
  /** Preview items matching the search criteria. */
  "items": Array<ExaSchemaWebsetItemPreview>;
};

export type ExaSchemaCreateMonitorParameters = {
  /** The id of the Webset */
  "websetId": string;
  /** How often the monitor will run */
  "cadence": ExaSchemaMonitorCadence;
  /** Behavior to perform when monitor runs */
  "behavior": ExaSchemaMonitorBehavior;
  "metadata"?: {
    [key: string]: string;
  };
};

export type ExaSchemaMonitor = {
  /** The unique identifier for the Monitor */
  "id": string;
  /** The type of object */
  "object": "monitor";
  /** The status of the Monitor */
  "status": "enabled" | "disabled";
  /** The id of the Webset the Monitor belongs to */
  "websetId": string;
  /** How often the monitor will run */
  "cadence": ExaSchemaMonitorCadence;
  /** Behavior to perform when monitor runs */
  "behavior": ExaSchemaMonitorBehavior;
  /** The last run of the monitor */
  "lastRun": ExaSchemaMonitorRun;
  /** Date and time when the next run will occur in (format date-time) */
  "nextRunAt": (string) | null;
  /** Set of key-value pairs you want to associate with this object. */
  "metadata": {
    [key: string]: string;
  };
  /** When the monitor was created (format date-time) */
  "createdAt": string;
  /** When the monitor was last updated (format date-time) */
  "updatedAt": string;
};

export type ExaSchemaListMonitorsResponse = {
  /** The list of monitors */
  "data": Array<ExaSchemaMonitor>;
  /** Whether there are more results to paginate through */
  "hasMore": boolean;
  /** The cursor to paginate through the next set of results */
  "nextCursor": (string) | null;
};

export type ExaSchemaUpdateMonitor = {
  "metadata"?: {
    [key: string]: string;
  };
  /** The status of the monitor. */
  "status"?: "enabled" | "disabled";
  "cadence"?: ExaSchemaMonitorCadence;
  "behavior"?: ExaSchemaMonitorBehavior;
};

export type ExaSchemaListMonitorRunsResponse = {
  /** The list of monitor runs */
  "data": Array<ExaSchemaMonitorRun>;
  /** Whether there are more results to paginate through */
  "hasMore": boolean;
  /** The cursor to paginate through the next set of results */
  "nextCursor": (string) | null;
};

export type ExaSchemaMonitorRun = {
  /** The unique identifier for the Monitor Run */
  "id": string;
  /** The type of object */
  "object": "monitor_run";
  /** The monitor that the run is associated with */
  "monitorId": string;
  /** The status of the Monitor Run */
  "status": "created" | "running" | "completed" | "canceled" | "failed";
  /** When the run completed (format date-time) */
  "completedAt": (string) | null;
  /** When the run failed (format date-time) */
  "failedAt": (string) | null;
  /** The reason the run failed */
  "failedReason": (string) | null;
  /** When the run was canceled (format date-time) */
  "canceledAt": (string) | null;
  /** When the run was created (format date-time) */
  "createdAt": string;
  /** When the run was last updated (format date-time) */
  "updatedAt": string;
  /** The type of the Monitor Run */
  "type": "search" | "refresh";
};

export type ExaSchemaCreateImportParameters = (({
  /** The size of the file in bytes. Maximum size is 50 MB. (max 50000000) */
  "size": number;
  /** The number of records to import */
  "count": number;
  /** The title of the import */
  "title"?: string;
  /** The file format. The CSV must include a column that identifies each entity, or the import fails. */
  "format": "csv";
  /** Set of key-value pairs you want to associate with this object. */
  "metadata"?: {
    [key: string]: string;
  };
  /** The type of entity each row describes. */
  "entity": ExaSchemaEntity;
  /** When format is `csv`, these are the specific import parameters. */
  "csv"?: {
    /** Column containing the key identifier for the entity (e.g. URL, Name, etc.). If not provided, we will try to infer it from the file. (min 0) */
    "identifier"?: number;
  };
}));

export type ExaSchemaCreateImportResponse = {
  /** The unique identifier for the Import */
  "id": string;
  /** The type of object */
  "object": "import";
  /** The status of the Import */
  "status": "pending" | "processing" | "completed" | "failed" | "canceled";
  /** The format of the import. */
  "format": "csv" | "webset";
  /** The type of entity the import contains. */
  "entity": ExaSchemaEntity;
  /** The title of the import */
  "title": string;
  /** The number of entities in the import */
  "count": number;
  /** Set of key-value pairs you want to associate with this object. */
  "metadata": {
    [key: string]: string;
  };
  /** The reason the import failed */
  "failedReason": ("invalid_format" | "invalid_file_content" | "missing_identifier") | null;
  /** When the import failed (format date-time) */
  "failedAt": (string) | null;
  /** A human readable message of the import failure */
  "failedMessage": (string) | null;
  /** When the import was created (format date-time) */
  "createdAt": string;
  /** When the import was last updated (format date-time) */
  "updatedAt": string;
  /** The URL to upload the file to */
  "uploadUrl": string;
  /** The date and time until the upload URL is valid. The upload URL will be valid for 1 hour. */
  "uploadValidUntil": string;
};

export type ExaSchemaListImportsResponse = {
  /** The list of imports */
  "data": Array<ExaSchemaImport>;
  /** Whether there are more results to paginate through */
  "hasMore": boolean;
  /** The cursor to paginate through the next set of results */
  "nextCursor": (string) | null;
};

export type ExaSchemaImport = {
  /** The unique identifier for the Import */
  "id": string;
  /** The type of object */
  "object": "import";
  /** The status of the Import */
  "status": "pending" | "processing" | "completed" | "failed" | "canceled";
  /** The format of the import. */
  "format": "csv" | "webset";
  /** The type of entity the import contains. */
  "entity": ExaSchemaEntity;
  /** The title of the import */
  "title": string;
  /** The number of entities in the import */
  "count": number;
  /** Set of key-value pairs you want to associate with this object. */
  "metadata": {
    [key: string]: string;
  };
  /** The reason the import failed */
  "failedReason": ("invalid_format" | "invalid_file_content" | "missing_identifier") | null;
  /** When the import failed (format date-time) */
  "failedAt": (string) | null;
  /** A human readable message of the import failure */
  "failedMessage": (string) | null;
  /** When the import was created (format date-time) */
  "createdAt": string;
  /** When the import was last updated (format date-time) */
  "updatedAt": string;
};

export type ExaSchemaUpdateImport = {
  "metadata"?: {
    [key: string]: string;
  };
  "title"?: string;
};

export type ExaSchemaCreateWebhookParameters = {
  /** The events to trigger the webhook (maxItems 19) */
  "events": Array<ExaSchemaEventType>;
  /** The URL to send the webhook to (format uri) */
  "url": string;
  /** Set of key-value pairs you want to associate with this object. */
  "metadata"?: {
    [key: string]: string;
  };
};

export type ExaSchemaWebhook = {
  /** The unique identifier for the webhook */
  "id": string;
  /** The type of object */
  "object": "webhook";
  /** The status of the webhook */
  "status": "active" | "inactive";
  /** The events to trigger the webhook */
  "events": Array<ExaSchemaEventType>;
  /** The URL to send the webhook to (format uri) */
  "url": string;
  /** The secret to verify the webhook signature. Only returned on Webhook creation. */
  "secret": (string) | null;
  /** The metadata of the webhook */
  "metadata"?: {
    [key: string]: string;
  };
  /** The date and time the webhook was created (format date-time) */
  "createdAt": string;
  /** The date and time the webhook was last updated (format date-time) */
  "updatedAt": string;
};

export type ExaSchemaListWebhooksResponse = {
  /** The list of webhooks */
  "data": Array<ExaSchemaWebhook>;
  /** Whether there are more results to paginate through */
  "hasMore": boolean;
  /** The cursor to paginate through the next set of results */
  "nextCursor": (string) | null;
};

export type ExaSchemaUpdateWebhookParameters = {
  /** The events to trigger the webhook (maxItems 19) */
  "events"?: Array<ExaSchemaEventType>;
  /** The URL to send the webhook to (format uri) */
  "url"?: string;
  /** Set of key-value pairs you want to associate with this object. */
  "metadata"?: {
    [key: string]: string;
  };
};

export type ExaSchemaEventType = "webset.created" | "webset.deleted" | "webset.paused" | "webset.idle" | "webset.search.created" | "webset.search.canceled" | "webset.search.completed" | "webset.search.updated" | "import.created" | "import.completed" | "webset.item.created" | "webset.item.enriched" | "monitor.created" | "monitor.updated" | "monitor.deleted" | "monitor.run.created" | "monitor.run.completed" | "webset.export.created" | "webset.export.completed";

export type ExaSchemaListWebhookAttemptsResponse = {
  /** The list of webhook attempts */
  "data": Array<ExaSchemaWebhookAttempt>;
  /** Whether there are more results to paginate through */
  "hasMore": boolean;
  /** The cursor to paginate through the next set of results */
  "nextCursor": (string) | null;
};

export type ExaSchemaListEventsResponse = {
  /** The list of events */
  "data": Array<ExaSchemaEvent>;
  /** Whether there are more results to paginate through */
  "hasMore": boolean;
  /** The cursor to paginate through the next set of results */
  "nextCursor": (string) | null;
};

export type ExaSchemaEvent = (({
  /** The unique identifier for the event */
  "id": string;
  /** The type of object */
  "object": "event";
  "data": ExaSchemaWebset;
  /** The date and time the event was created (format date-time) */
  "createdAt": string;
  /** The type of event */
  "type": "webset.created";
}) | ({
  /** The unique identifier for the event */
  "id": string;
  /** The type of object */
  "object": "event";
  "data": ExaSchemaWebset;
  /** The date and time the event was created (format date-time) */
  "createdAt": string;
  /** The type of event */
  "type": "webset.deleted";
}) | ({
  /** The unique identifier for the event */
  "id": string;
  /** The type of object */
  "object": "event";
  "data": ExaSchemaWebset;
  /** The date and time the event was created (format date-time) */
  "createdAt": string;
  /** The type of event */
  "type": "webset.idle";
}) | ({
  /** The unique identifier for the event */
  "id": string;
  /** The type of object */
  "object": "event";
  "data": ExaSchemaWebset;
  /** The date and time the event was created (format date-time) */
  "createdAt": string;
  /** The type of event */
  "type": "webset.paused";
}) | ({
  /** The unique identifier for the event */
  "id": string;
  /** The type of object */
  "object": "event";
  "data": ExaSchemaWebsetItem;
  /** The date and time the event was created (format date-time) */
  "createdAt": string;
  /** The type of event */
  "type": "webset.item.created";
}) | ({
  /** The unique identifier for the event */
  "id": string;
  /** The type of object */
  "object": "event";
  "data": ExaSchemaWebsetItem;
  /** The date and time the event was created (format date-time) */
  "createdAt": string;
  /** The type of event */
  "type": "webset.item.enriched";
}) | ({
  /** The unique identifier for the event */
  "id": string;
  /** The type of object */
  "object": "event";
  "data": ExaSchemaWebsetSearch;
  /** The date and time the event was created (format date-time) */
  "createdAt": string;
  /** The type of event */
  "type": "webset.search.created";
}) | ({
  /** The unique identifier for the event */
  "id": string;
  /** The type of object */
  "object": "event";
  "data": ExaSchemaWebsetSearch;
  /** The date and time the event was created (format date-time) */
  "createdAt": string;
  /** The type of event */
  "type": "webset.search.updated";
}) | ({
  /** The unique identifier for the event */
  "id": string;
  /** The type of object */
  "object": "event";
  "data": ExaSchemaWebsetSearch;
  /** The date and time the event was created (format date-time) */
  "createdAt": string;
  /** The type of event */
  "type": "webset.search.canceled";
}) | ({
  /** The unique identifier for the event */
  "id": string;
  /** The type of object */
  "object": "event";
  "data": ExaSchemaWebsetSearch;
  /** The date and time the event was created (format date-time) */
  "createdAt": string;
  /** The type of event */
  "type": "webset.search.completed";
}) | ({
  /** The unique identifier for the event */
  "id": string;
  /** The type of object */
  "object": "event";
  "data": ExaSchemaImport;
  /** The date and time the event was created (format date-time) */
  "createdAt": string;
  /** The type of event */
  "type": "import.created";
}) | ({
  /** The unique identifier for the event */
  "id": string;
  /** The type of object */
  "object": "event";
  "data": ExaSchemaImport;
  /** The date and time the event was created (format date-time) */
  "createdAt": string;
  /** The type of event */
  "type": "import.completed";
}) | ({
  /** The unique identifier for the event */
  "id": string;
  /** The type of object */
  "object": "event";
  "data": ExaSchemaMonitor;
  /** The date and time the event was created (format date-time) */
  "createdAt": string;
  /** The type of event */
  "type": "monitor.created";
}) | ({
  /** The unique identifier for the event */
  "id": string;
  /** The type of object */
  "object": "event";
  "data": ExaSchemaMonitor;
  /** The date and time the event was created (format date-time) */
  "createdAt": string;
  /** The type of event */
  "type": "monitor.updated";
}) | ({
  /** The unique identifier for the event */
  "id": string;
  /** The type of object */
  "object": "event";
  "data": ExaSchemaMonitor;
  /** The date and time the event was created (format date-time) */
  "createdAt": string;
  /** The type of event */
  "type": "monitor.deleted";
}) | ({
  /** The unique identifier for the event */
  "id": string;
  /** The type of object */
  "object": "event";
  "data": ExaSchemaMonitorRun;
  /** The date and time the event was created (format date-time) */
  "createdAt": string;
  /** The type of event */
  "type": "monitor.run.created";
}) | ({
  /** The unique identifier for the event */
  "id": string;
  /** The type of object */
  "object": "event";
  "data": ExaSchemaMonitorRun;
  /** The date and time the event was created (format date-time) */
  "createdAt": string;
  /** The type of event */
  "type": "monitor.run.completed";
}));

export type ExaSchemaContentsOptions = {
  "text"?: ((((boolean) | ({
    "maxCharacters"?: ((number) | (null));
    "includeHtmlTags"?: ((boolean) | (null));
    "verbosity"?: (("compact" | "standard" | "full") | (null));
    "includeSections"?: ((Array<"header" | "navigation" | "banner" | "body" | "sidebar" | "footer" | "metadata">) | (null));
    "excludeSections"?: ((Array<"header" | "navigation" | "banner" | "body" | "sidebar" | "footer" | "metadata">) | (null));
  }))) | (null));
  "highlights"?: ((((boolean) | ({
    "query"?: ((string) | (null));
    "verbosity"?: (("low" | "medium" | "high") | (null));
    "dynamic"?: ((boolean) | (null));
    "maxCharacters"?: ((number) | (null));
    "numSentences"?: ((number) | (null));
    "highlightsPerUrl"?: ((number) | (null));
  }))) | (null));
  "summary"?: (({
    "query"?: ((string) | (null));
    "schema"?: (({
      [key: string]: ExaSchemaJsonValue;
    }) | (null));
  }) | (null));
  "extras"?: (({
    "links"?: ((number) | (null));
    "imageLinks"?: ((number) | (null));
    "richImageLinks"?: ((number) | (null));
    "richLinks"?: ((number) | (null));
    "codeBlocks"?: ((number) | (null));
  }) | (null));
  "livecrawlTimeout"?: ((number) | (null));
  "maxAgeHours"?: ((number) | (null));
  "snapshotAsOf"?: ((((string) | (string))) | (null));
  "context"?: ((((boolean) | ({
    /** Maximum character limit for the context string. (min 1, max 1000000) */
    "maxCharacters"?: number;
  }))) | (null));
  "livecrawl"?: (("never" | "always" | "fallback" | "preferred") | (null));
  /** Deprecated. Use `snapshotAsOf` instead. Alias of snapshotAsOf with identical behavior. (format date-time) */
  "crawledBeforeDate"?: ((string) | (null));
  "subpages"?: ((number) | (null));
  "subpageTarget"?: ((((string) | (Array<string>))) | (null));
};

export type ExaSchemaOutputSchemaText = {
  "type": "text";
  "description"?: string;
};

export type ExaSchemaOutputSchemaObject = {
  "type": "object";
  "description"?: string;
  "properties"?: {
    [key: string]: ExaSchemaJsonValue;
  };
  "required"?: Array<string>;
  "additionalProperties"?: boolean;
  [key: string]: ExaSchemaJsonValue;
};

export type ExaSchemaSearchSynthesisResponse = {
  /** Unique identifier for the request. */
  "requestId"?: string;
  /** A list of search results containing title, URL, published date, and author. */
  "results": Array<ExaSchemaSearchResultOutput>;
  "costDollars"?: ExaSchemaCostDollarsOutput;
  /** Server-side processing time in milliseconds. May exclude output synthesis time, so it can be lower than end-to-end latency. */
  "searchTime"?: number;
  /** Warnings about the request, such as a field that has no effect. Log them; do not pass them to a model. Omitted when there are none. */
  "warnings"?: Array<ExaSchemaSearchWarningOutput>;
  /** Notices about how the results were produced. Pass them to your model with the results. Omitted when there are none. */
  "notices"?: Array<ExaSchemaSearchNoticeOutput>;
  "output": ExaSchemaSearchSynthesisOutputOutput;
  /** Deprecated. May be an empty string. Do not branch on this value. */
  "resolvedSearchType"?: string;
  /** Deprecated. Use `results[].highlights` or `results[].text` instead. Combined context string from search results. */
  "context"?: string;
};

export type ExaSchemaSearchResultsResponse = {
  /** Unique identifier for the request. */
  "requestId"?: string;
  /** A list of search results containing title, URL, published date, and author. */
  "results": Array<ExaSchemaSearchResultOutput>;
  "costDollars"?: ExaSchemaCostDollarsOutput;
  /** Server-side processing time in milliseconds. May exclude output synthesis time, so it can be lower than end-to-end latency. */
  "searchTime"?: number;
  /** Warnings about the request, such as a field that has no effect. Log them; do not pass them to a model. Omitted when there are none. */
  "warnings"?: Array<ExaSchemaSearchWarningOutput>;
  /** Notices about how the results were produced. Pass them to your model with the results. Omitted when there are none. */
  "notices"?: Array<ExaSchemaSearchNoticeOutput>;
  /** Deprecated. May be an empty string. Do not branch on this value. */
  "resolvedSearchType"?: string;
  /** Deprecated. Use `results[].highlights` or `results[].text` instead. Combined context string from search results. */
  "context"?: string;
};

export type ExaSchemaSearchStreamTextDeltaChunkOutput = {
  /** Unique identifier for the request. */
  "requestId"?: string;
  "type": "text-delta";
  "delta": string;
  "choices"?: Array<{
    /**  (min 0) */
    "index": number;
    "delta": {
      "role"?: "assistant";
      "content"?: string;
      "citations"?: Array<{
        /** Source URL. (format uri) */
        "url": string;
        /** Source title. */
        "title": string;
        "id": string;
      }>;
    };
    "finish_reason": (("stop") | (null));
  }>;
};

export type ExaSchemaSearchStreamGroundingChunkOutput = {
  /** Unique identifier for the request. */
  "requestId"?: string;
  "type": "grounding";
  /** Field-level grounding for synthesized output. */
  "grounding": Array<{
    /** Field path in output.content, for example content or companies[0].funding. */
    "field": string;
    /** Sources supporting this output field. */
    "citations": Array<{
      /** Source URL. (format uri) */
      "url": string;
      /** Source title. */
      "title": string;
    }>;
    /** Model-reported reliability for this field. */
    "confidence": "low" | "medium" | "high";
  }>;
  "citations"?: Array<{
    /** Source URL. (format uri) */
    "url": string;
    /** Source title. */
    "title": string;
    "id": string;
  }>;
  "choices"?: Array<{
    /**  (min 0) */
    "index": number;
    "delta": {
      "role"?: "assistant";
      "content"?: string;
      "citations"?: Array<{
        /** Source URL. (format uri) */
        "url": string;
        /** Source title. */
        "title": string;
        "id": string;
      }>;
    };
    "finish_reason": (("stop") | (null));
  }>;
};

export type ExaSchemaSearchStreamResultsChunkOutput = {
  /** Unique identifier for the request. */
  "requestId"?: string;
  "type": "results";
  "results": Array<ExaSchemaSearchResultOutput>;
  /** Warnings about the request, such as a field that has no effect. Log them; do not pass them to a model. Omitted when there are none. */
  "warnings"?: Array<ExaSchemaSearchWarningOutput>;
  /** Notices about how the results were produced. Pass them to your model with the results. Omitted when there are none. */
  "notices"?: Array<ExaSchemaSearchNoticeOutput>;
};

export type ExaSchemaSearchStreamResetChunkOutput = {
  /** Unique identifier for the request. */
  "requestId"?: string;
  "type": "stream-reset";
  "streamReset": true;
};

export type ExaSchemaSearchStreamDoneChunkOutput = {
  /** Unique identifier for the request. */
  "requestId"?: string;
  "type": "done";
  "output": ((ExaSchemaSearchSynthesisOutputOutput) | (null));
  /** Server-side processing time in milliseconds. May exclude output synthesis time, so it can be lower than end-to-end latency. */
  "searchTime": number;
  "costDollars"?: ExaSchemaCostDollarsOutput;
  "choices"?: Array<{
    /**  (min 0) */
    "index": number;
    "delta": {
      "role"?: "assistant";
      "content"?: string;
      "citations"?: Array<{
        /** Source URL. (format uri) */
        "url": string;
        /** Source title. */
        "title": string;
        "id": string;
      }>;
    };
    "finish_reason": (("stop") | (null));
  }>;
};

export type ExaSchemaSearchStreamErrorChunkOutput = {
  /** Unique identifier for the request. */
  "requestId"?: string;
  "type": "error";
  "error": {
    "message": string;
  };
};

export type ExaSchemaJsonValue = ((null) | (boolean) | (number) | (string) | (Array<ExaSchemaJsonValue>) | ({
  [key: string]: ExaSchemaJsonValue;
}));

export type ExaSchemaSearchResultOutput = {
  /** The title of the search result. */
  "title": string;
  /** The URL of the search result. (format uri) */
  "url": string;
  /** An estimate of the creation date, from parsing HTML content. Format is YYYY-MM-DD. (format date-time) */
  "publishedDate"?: string;
  /** If available, the author of the content. */
  "author"?: ((string) | (null));
  /** The temporary ID for the document. Useful for the /contents endpoint. */
  "id"?: string;
  /** The URL of an image associated with the search result, if available. (format uri) */
  "image"?: string;
  /** The URL of the favicon for the search result's domain. (format uri) */
  "favicon"?: string;
  /** The full content text of the search result. */
  "text"?: string;
  /** Array of highlights extracted from the search result content. */
  "highlights"?: Array<string>;
  /** Array of cosine similarity scores for each highlighted snippet. */
  "highlightScores"?: Array<number>;
  /** Summary of the webpage. */
  "summary"?: string;
  /** Array of subpages for the search result. */
  "subpages"?: Array<{
    /** The title of the search result. */
    "title": string;
    /** The URL of the search result. (format uri) */
    "url": string;
    /** An estimate of the creation date, from parsing HTML content. Format is YYYY-MM-DD. (format date-time) */
    "publishedDate"?: string;
    /** If available, the author of the content. */
    "author"?: ((string) | (null));
    /** The temporary ID for the document. Useful for the /contents endpoint. */
    "id"?: string;
    /** The URL of an image associated with the search result, if available. (format uri) */
    "image"?: string;
    /** The URL of the favicon for the search result's domain. (format uri) */
    "favicon"?: string;
  }>;
  /** Structured entity data for company, person, publication, or product search results. Returned for supported entity-backed categories and for product listing pages. */
  "entities"?: Array<{ [key: string]: unknown } & ((ExaSchemaSearchCompanyEntityOutput) | (ExaSchemaSearchPersonEntityOutput) | (ExaSchemaSearchPublicationEntityOutput))>;
  /** Results from extras. Each field is returned only when requested via contents.extras. */
  "extras"?: {
    /** Array of links from the search result. */
    "links"?: Array<string>;
    /** Array of image URLs from the search result. */
    "imageLinks"?: Array<string>;
    /** Array of images with their alt text, in the order the images appear on the page. */
    "richImageLinks"?: Array<{
      /** The URL of the image. */
      "url": string;
      /** The alt text of the image, when the page provides one. */
      "alt"?: string;
    }>;
    /** Array of links with their anchor text, in the order they appear on the page. */
    "richLinks"?: Array<{
      /** The URL of the link. */
      "url": string;
      /** The anchor text of the link, when the page provides one. */
      "anchor"?: string;
    }>;
    /** Array of code blocks from the search result. */
    "codeBlocks"?: Array<{
      /** The contents of the code block. */
      "text": string;
      /** The language the code block is annotated with, if any. */
      "source": string;
    }>;
  };
};

export type ExaSchemaCostDollarsOutput = {
  /** Estimated total dollar cost for the completed request. This response value is not an invoice record. (format float) */
  "total"?: number;
  /** Estimated search cost by retrieval mode. Some search types report their cost only in `total`. */
  "search"?: {
    /** Cost of neural search operations. (format float) */
    "neural"?: number;
    /** Cost of keyword search operations. (format float) */
    "keyword"?: number;
  };
  /** Cost of synthesized summary generation for search requests. (format float) */
  "summary"?: number;
  /** Estimated cost breakdown for standalone content retrieval (text, highlights, and summaries billed outside the bundled search price). */
  "contents"?: {
    /** Cost of text extraction. (format float) */
    "text"?: number;
    /** Cost of highlight extraction. (format float) */
    "highlights"?: number;
    /** Cost of per-result summary generation. (format float) */
    "summary"?: number;
  };
};

export type ExaSchemaAnswerStreamTextDeltaChunk = {
  /** Streamed completion choices in the OpenAI chat completions format. */
  "choices": Array<{
    /** Index of this streamed choice. (min 0) */
    "index": number;
    /** Incremental answer content emitted by the model. */
    "delta": {
      "role"?: "assistant";
      "content"?: string;
      "refusal"?: ((string) | (null));
      [key: string]: ExaSchemaJsonValue;
    };
    /** Reason this streamed choice finished, when present. */
    "finish_reason"?: ((string) | (null));
    [key: string]: ExaSchemaJsonValue;
  }>;
  [key: string]: ExaSchemaJsonValue;
};

export type ExaSchemaAnswerStreamCitationsChunkOutput = {
  /** Search results cited by the final streamed answer. */
  "citations": Array<{
    /** The title of the search result. */
    "title": string;
    /** The URL of the search result. (format uri) */
    "url": string;
    /** An estimate of the creation date, from parsing HTML content. Format is YYYY-MM-DD. (format date-time) */
    "publishedDate"?: string;
    /** If available, the author of the content. */
    "author"?: ((string) | (null));
    /** The temporary ID for the document. Useful for the /contents endpoint. */
    "id"?: string;
    /** The URL of an image associated with the search result, if available. (format uri) */
    "image"?: string;
    /** The URL of the favicon for the search result's domain. (format uri) */
    "favicon"?: string;
    /** The full text content of each source. Only present when text contents are requested. */
    "text"?: string;
  }>;
};

export type ExaSchemaAnswerStreamCostChunkOutput = {
  "costDollars": ExaSchemaCostDollarsOutput;
  /** Unique identifier for the request. */
  "requestId"?: string;
};

export type ExaSchemaAnswerStreamErrorChunkOutput = {
  "tag": "ERROR";
  "payload": {
    "error": {
      "code": number;
      "message": string;
    };
    /** Unique identifier for the request. */
    "requestId"?: string;
  };
};

export type ExaSchemaFindSimilarResult = {
  /** The title of the search result. */
  "title": string;
  /** The URL of the search result. (format uri) */
  "url": string;
  /** An estimate of the creation date, from parsing HTML content. Format is YYYY-MM-DD. (format date-time) */
  "publishedDate"?: string;
  /** If available, the author of the content. */
  "author"?: ((string) | (null));
  /** The temporary ID for the document. Useful for the /contents endpoint. */
  "id"?: string;
  /** The URL of an image associated with the search result, if available. (format uri) */
  "image"?: string;
  /** The URL of the favicon for the search result's domain. (format uri) */
  "favicon"?: string;
  /** The full content text of the search result. */
  "text"?: string;
  /** Array of highlights extracted from the search result content. */
  "highlights"?: Array<string>;
  /** Array of cosine similarity scores for each highlighted snippet. */
  "highlightScores"?: Array<number>;
  /** Summary of the webpage. */
  "summary"?: string;
  /** Array of subpages for the search result. */
  "subpages"?: Array<{
    /** The title of the search result. */
    "title": string;
    /** The URL of the search result. (format uri) */
    "url": string;
    /** An estimate of the creation date, from parsing HTML content. Format is YYYY-MM-DD. (format date-time) */
    "publishedDate"?: string;
    /** If available, the author of the content. */
    "author"?: ((string) | (null));
    /** The temporary ID for the document. Useful for the /contents endpoint. */
    "id"?: string;
    /** The URL of an image associated with the search result, if available. (format uri) */
    "image"?: string;
    /** The URL of the favicon for the search result's domain. (format uri) */
    "favicon"?: string;
  }>;
  /** Structured entity data for company, person, publication, or product search results. Returned for supported entity-backed categories and for product listing pages. */
  "entities"?: Array<{ [key: string]: unknown } & ((ExaSchemaSearchCompanyEntityOutput) | (ExaSchemaSearchPersonEntityOutput) | (ExaSchemaSearchPublicationEntityOutput))>;
  /** Results from extras. Each field is returned only when requested via contents.extras. */
  "extras"?: {
    /** Array of links from the search result. */
    "links"?: Array<string>;
    /** Array of image URLs from the search result. */
    "imageLinks"?: Array<string>;
    /** Array of images with their alt text, in the order the images appear on the page. */
    "richImageLinks"?: Array<{
      /** The URL of the image. */
      "url": string;
      /** The alt text of the image, when the page provides one. */
      "alt"?: string;
    }>;
    /** Array of links with their anchor text, in the order they appear on the page. */
    "richLinks"?: Array<{
      /** The URL of the link. */
      "url": string;
      /** The anchor text of the link, when the page provides one. */
      "anchor"?: string;
    }>;
    /** Array of code blocks from the search result. */
    "codeBlocks"?: Array<{
      /** The contents of the code block. */
      "text": string;
      /** The language the code block is annotated with, if any. */
      "source": string;
    }>;
  };
  /** Similarity score between the source url and the result. Higher values mean more similar; the scale is not normalized, so compare scores only within a single response. (format float) */
  "score"?: number;
};

export type ExaSchemaSearchMonitorSearch = {
  /** The query string for the search. (minLength 1) */
  "query": string;
  /** Number of results to return. Limits vary by search type. The maximum public limit is 100 results. Contact sales (hello@exa.ai) to discuss higher limits. (min 1, max 100) */
  "numResults"?: number;
  /** Restrict search results to these domains. */
  "includeDomains"?: Array<string>;
  /** Exclude these domains from search results. */
  "excludeDomains"?: Array<string>;
  "contents"?: ExaSchemaSearchMonitorContents;
};

export type ExaSchemaSearchMonitorTrigger = {
  /** The type of trigger. Currently only `interval` is supported. */
  "type": "interval";
  /** A duration string specifying how often the monitor runs (e.g., "1h", "6h", "1d", "7d"). Single-unit only. Minimum interval is 1 hour. The schedule is anchored to the monitor's creation time (e.g., a daily monitor created at 2:30 PM runs daily around 2:30 PM). */
  "period": string;
};

export type ExaSchemaSearchMonitorOutputSchema = (({ [key: string]: unknown } & ((ExaSchemaOutputSchemaText) | (ExaSchemaOutputSchemaObject))) | (null));

export type ExaSchemaSearchMonitorWebhook = {
  /** The HTTPS URL to receive webhook events. Must not point to localhost or private IP ranges. (format uri) */
  "url": string;
  /** Which events to subscribe to. Defaults to all events if not specified. */
  "events"?: Array<"monitor.created" | "monitor.updated" | "monitor.deleted" | "monitor.run.created" | "monitor.run.completed">;
};

export type ExaSchemaSearchMonitorSearchOutput = {
  /** The query string for the search. (minLength 1) */
  "query": string;
  /** Number of results to return. Limits vary by search type. The maximum public limit is 100 results. Contact sales (hello@exa.ai) to discuss higher limits. (min 1, max 100) */
  "numResults"?: number;
  /** Restrict search results to these domains. */
  "includeDomains"?: Array<string>;
  /** Exclude these domains from search results. */
  "excludeDomains"?: Array<string>;
  "contents"?: ExaSchemaSearchMonitorContentsOutput;
};

export type ExaSchemaSearchMonitorTriggerOutput = {
  /** The type of trigger. Currently only `interval` is supported. */
  "type": "interval";
  /** A duration string specifying how often the monitor runs (e.g., "1h", "6h", "1d", "7d"). Single-unit only. Minimum interval is 1 hour. The schedule is anchored to the monitor's creation time (e.g., a daily monitor created at 2:30 PM runs daily around 2:30 PM). */
  "period": string;
};

export type ExaSchemaSearchMonitorOutputSchemaOutput = (({ [key: string]: unknown } & ((ExaSchemaOutputSchemaTextOutput) | (ExaSchemaOutputSchemaObject))) | (null));

export type ExaSchemaSearchMonitorWebhookOutput = {
  /** The HTTPS URL to receive webhook events. Must not point to localhost or private IP ranges. (format uri) */
  "url": string;
  /** Which events to subscribe to. Defaults to all events if not specified. */
  "events"?: Array<"monitor.created" | "monitor.updated" | "monitor.deleted" | "monitor.run.created" | "monitor.run.completed">;
};

export type ExaSchemaSearchMonitorContents = {
  /** Text extraction options for each result. */
  "text"?: ((boolean) | ({
    "maxCharacters"?: ((number) | (null));
    "includeHtmlTags"?: ((boolean) | (null));
    "verbosity"?: (("compact" | "standard" | "full") | (null));
    "includeSections"?: ((Array<"header" | "navigation" | "banner" | "body" | "sidebar" | "footer" | "metadata">) | (null));
    "excludeSections"?: ((Array<"header" | "navigation" | "banner" | "body" | "sidebar" | "footer" | "metadata">) | (null));
  }));
  /** Text snippets the LLM identifies as most relevant from each page. */
  "highlights"?: ((boolean) | ({
    "query"?: ((string) | (null));
    "verbosity"?: (("low" | "medium" | "high") | (null));
    "dynamic"?: ((boolean) | (null));
    "maxCharacters"?: ((number) | (null));
    "numSentences"?: ((number) | (null));
    "highlightsPerUrl"?: ((number) | (null));
  }));
  /** Return an LLM-generated summary. Pass `true` for defaults, or an object with `query`. */
  "summary"?: ((boolean) | (ExaSchemaSummaryWithMaxTokensOptions));
  /** Extra parameters to pass. */
  "extras"?: {
    "links"?: ((number) | (null));
    "imageLinks"?: ((number) | (null));
    "richImageLinks"?: ((number) | (null));
    "richLinks"?: ((number) | (null));
    "codeBlocks"?: ((number) | (null));
  };
  /** Crawl strategy for fetching page content */
  "livecrawl"?: (("never" | "always" | "fallback" | "preferred") | ("auto"));
  /** The timeout for livecrawling in milliseconds. (max 90000) */
  "livecrawlTimeout"?: number;
  /** Maximum age of cached content, in hours, up to 720. Cached content younger than this is used, and older pages are fetched fresh. `0` always fetches fresh content and `-1` always uses the cache. When omitted, cached content is used when available and pages without it are fetched l (min -1, max 720) */
  "maxAgeHours"?: number;
  /** Filter out results with no content */
  "filterEmptyResults"?: boolean;
  /** The number of subpages to crawl. The actual number crawled may be limited by system constraints. (min 0, max 100) */
  "subpages"?: number;
  /** Term to find specific subpages of search results. Can be a single string or an array of strings. */
  "subpageTarget"?: ((string) | (Array<string>));
  /** Deprecated. Use `highlights` or `text` instead. Returns page contents as a combined context string. */
  "context"?: ((boolean) | ({
    /** Maximum character limit for the context string. (min 1, max 1000000) */
    "maxCharacters"?: number;
  }));
};

export type ExaSchemaSearchMonitorRunOutput = {
  /** The search results */
  "results"?: ((Array<{
    [key: string]: ExaSchemaJsonValue;
  }>) | (null));
  /** Synthesized content from the search results. Shape depends on `outputSchema.type`. */
  "content"?: ((ExaSchemaJsonValue) | (null));
  /** Field-level citations with confidence levels */
  "grounding"?: ((Array<{
    /** The output field this citation applies to */
    "field": string;
    "citations": Array<{
      /** Source URL. (format uri) */
      "url": string;
      /** Source title. */
      "title": string;
    }>;
    /** Model-reported reliability for this field. */
    "confidence": "low" | "medium" | "high";
  }>) | (null));
};

export type ExaSchemaAgentEffort = "minimal" | "low" | "medium" | "high" | "xhigh" | "auto" | "ultra";

export type ExaSchemaAgentDataSource = {
  /** Exa Connect data provider to enable for the run. All provider tools are available by default. */
  "provider": ExaSchemaAgentDataSourceProvider;
};

export type ExaSchemaAgentBudget = {
  /** Maximum amount this run can spend in US dollars. Accepts $1–$100 and applies only to `auto` and `ultra`; when omitted, the default cap is $5 for `auto` and $20 for `ultra`. */
  "maxCostDollars"?: number;
  /** Soft wall-clock ceiling for the run in seconds. Accepts 300–10,800 (5 minutes to 3 hours) and applies only to `ultra`. As the run approaches the limit, the agent stops starting new work and returns what it has found with `stopReason: "time_limit_reached"`. */
  "maxDurationSeconds"?: number;
};

export type ExaSchemaAgentRunStatus = "queued" | "running" | "completed" | "failed" | "cancelled";

export type ExaSchemaAgentStopReason = (("schema_satisfied") | ("budget_reached") | ("time_limit_reached") | ("iteration_limit_reached") | ("token_limit_reached") | ("stopped") | ("error") | ("cancelled") | (string));

export type ExaSchemaAgentRunRequest = {
  /** Natural-language question or instructions for the request. (minLength 1) */
  "query"?: string;
  /** Additional instructions that guide generated output or agent behavior. Use this for source preferences, novelty constraints, duplication constraints, or other behavior guidance. */
  "systemPrompt"?: string;
  "effort"?: ExaSchemaAgentEffort;
  "input"?: {
    /** Records the agent should process or enrich. */
    "data"?: Array<{
      [key: string]: ExaSchemaJsonValue;
    }>;
    /** Records or entities the agent should avoid returning. */
    "exclusion"?: Array<{
      [key: string]: ExaSchemaJsonValue;
    }>;
  };
  "outputSchema"?: (({
    [key: string]: ExaSchemaJsonValue;
  }) | (null));
  "previousRunId"?: ExaSchemaAgentRunId;
  /** Caller-provided key-value metadata for your own tracking. */
  "metadata"?: {
    [key: string]: string;
  };
  /** Exa Connect data providers configured for the run. */
  "dataSources"?: Array<ExaSchemaAgentDataSourceOutput>;
  "budget"?: ExaSchemaAgentBudgetOutput;
  [key: string]: ExaSchemaJsonValue;
};

export type ExaSchemaAgentRunOutput = {
  /** Natural-language answer or summary. */
  "text": string;
  /** JSON shaped by `outputSchema`; fields unsupported by evidence may be `null`. `null` when no schema was provided. */
  "structured": ((ExaSchemaJsonValue) | (null));
  /** Field-level citations emitted by the run. */
  "grounding": Array<ExaSchemaAgentGrounding>;
};

export type ExaSchemaAgentUsage = {
  /**  (min 0) */
  "agentComputeUnits": number;
  /**  (min 0) */
  "searches": number;
  /**  (min 0) */
  "emails": number;
  /**  (min 0) */
  "phoneNumbers": number;
  "dataSources"?: ExaSchemaAgentDataSourceUsage;
};

export type ExaSchemaAgentCostDollars = {
  /**  (min 0) */
  "total": number;
  /**  (min 0) */
  "agentCompute": number;
  /**  (min 0) */
  "search": number;
  /**  (min 0) */
  "emails": number;
  /**  (min 0) */
  "phoneNumbers": number;
  "dataSources"?: ExaSchemaAgentDataSourceCost;
};

export type ExaSchemaBatchRequestItem = {
  /** Your unique handle for this request; keys the result and must be unique in the batch. (minLength 1, maxLength 64) */
  "customId": string;
  /** HTTP method of the batched request. POST-only in v1. */
  "method": "POST";
  /** Target API route for the request. */
  "url": "/search" | "/agent/runs";
  /** Request body for the target route. Must be a JSON object; `stream: true` is not allowed. */
  "body": {
    [key: string]: ExaSchemaJsonValue;
  };
};

export type ExaSchemaBatchStatus = "in_progress" | "completed" | "cancelling" | "cancelled" | "expired";

export type ExaSchemaBatchRequestCounts = {
  /** Total requests in the batch. (min 0) */
  "total": number;
  /** Requests that have completed successfully. (min 0) */
  "completed": number;
  /** Requests that have failed. (min 0) */
  "failed": number;
};

export type ExaSchemaEntity = ((ExaSchemaCompanyEntity) | (ExaSchemaPersonEntity) | (ExaSchemaArticleEntity) | (ExaSchemaResearchPaperEntity) | (ExaSchemaCustomEntity));

export type ExaSchemaCreateCriterionParameters = {
  /** The description of the criterion (minLength 1, maxLength 1000) */
  "description": string;
};

export type ExaSchemaWebsetSearchBehavior = "override" | "append";

export type ExaSchemaWebsetSearchCanceledReason = "webset_deleted" | "webset_canceled" | "out_of_credits";

export type ExaSchemaWebsetEnrichmentFormat = "text" | "date" | "number" | "options" | "email" | "phone" | "url";

export type ExaSchemaWebsetItemPersonProperties = {
  /** The URL of the person profile (format uri) */
  "url": string;
  /** Short description of the relevance of the person */
  "description": string;
  "person": {
    /** The name of the person */
    "name": string;
    /** The location of the person */
    "location": (string) | null;
    /** The current work position of the person */
    "position": (string) | null;
    "company": ({
      /** The name of the company */
      "name": string;
      /** The location the person is working at the company */
      "location": (string) | null;
    }) | null;
    /** The image URL of the person (format uri) */
    "pictureUrl": (string) | null;
    /** The work history of the person */
    "workHistory": Array<{
      /** Job title or position */
      "title": (string) | null;
      /** Work location */
      "location": (string) | null;
      /** Employment dates */
      "dates": ({
        /** Start date */
        "from": (string) | null;
        /** End date */
        "to": (string) | null;
      }) | null;
      "company": ({
        /** Entity ID of the company */
        "id": (string) | null;
        /** Company name */
        "name": (string) | null;
        /** LinkedIn URL of the company */
        "linkedinUrl": (string) | null;
      }) | null;
    }>;
    /** The education history of the person */
    "educationHistory": Array<{
      /** Degree obtained */
      "degree": (string) | null;
      /** Education dates */
      "dates": ({
        /** Start date */
        "from": (string) | null;
        /** End date */
        "to": (string) | null;
      }) | null;
      "institution": ({
        /** Entity ID of the institution */
        "id": (string) | null;
        /** Institution name */
        "name": (string) | null;
        /** LinkedIn URL of the institution */
        "linkedinUrl": (string) | null;
      }) | null;
    }>;
  };
  "type": "person";
};

export type ExaSchemaWebsetItemCompanyProperties = {
  /** The URL of the company website (format uri) */
  "url": string;
  /** Short description of the relevance of the company */
  "description": string;
  /** The text content of the company website */
  "content": (string) | null;
  "company": {
    /** The name of the company */
    "name": string;
    /** The main location of the company */
    "location": (string) | null;
    /** The number of employees of the company */
    "employees": (number) | null;
    /** The industry of the company */
    "industry": (string) | null;
    /** A short description of the company */
    "about": (string) | null;
    /** The logo URL of the company (format uri) */
    "logoUrl": (string) | null;
    /** The year the company was founded */
    "foundedYear": (number) | null;
    /** The structured headquarters address of the company */
    "headquarters": ({
      /** The street address of the headquarters */
      "address": (string) | null;
      /** The city of the headquarters */
      "city": (string) | null;
      /** The state or region of the headquarters */
      "state": (string) | null;
      /** The postal code of the headquarters */
      "postalCode": (string) | null;
      /** The country of the headquarters */
      "country": (string) | null;
      /** The ISO country code of the headquarters */
      "countryCode": (string) | null;
    }) | null;
    /** Financial information about the company */
    "financials": ({
      /** The annual revenue of the company (USD) */
      "revenueAnnual": (number) | null;
      /** The total funding raised by the company (USD) */
      "fundingTotal": (number) | null;
      /** The latest funding round */
      "fundingLatestRound": ({
        /** The name of the funding round (e.g. Series A) */
        "name": (string) | null;
        /** The date of the funding round */
        "date": (string) | null;
        /** The amount raised in the funding round (USD) */
        "amount": (number) | null;
      }) | null;
    }) | null;
    /** Web traffic metrics for the company */
    "webTraffic": ({
      /** The estimated monthly website visits */
      "visitsMonthly": (number) | null;
      /** The estimated monthly unique visitors */
      "uniqueVisitors": (number) | null;
    }) | null;
  };
  "type": "company";
};

export type ExaSchemaWebsetItemArticleProperties = {
  /** The URL of the article (format uri) */
  "url": string;
  /** Short description of the relevance of the article */
  "description": string;
  /** The text content for the article */
  "content": (string) | null;
  "article": {
    /** The title of the article */
    "title": (string) | null;
    /** The author(s) of the article */
    "author": (string) | null;
    /** The date and time the article was published */
    "publishedAt": (string) | null;
  };
  "type": "article";
};

export type ExaSchemaWebsetItemResearchPaperProperties = {
  /** The URL of the research paper (format uri) */
  "url": string;
  /** Short description of the relevance of the research paper */
  "description": string;
  /** The text content of the research paper */
  "content": (string) | null;
  "researchPaper": {
    /** The title of the research paper */
    "title": (string) | null;
    /** The author(s) of the research paper */
    "author": (string) | null;
    /** The date and time the research paper was published */
    "publishedAt": (string) | null;
  };
  "type": "research_paper";
};

export type ExaSchemaWebsetItemCustomProperties = {
  /** The URL of the Item (format uri) */
  "url": string;
  /** Short description of the Item */
  "description": string;
  /** The text content of the Item */
  "content": (string) | null;
  "custom": {
    /** The title of the website */
    "title": (string) | null;
    /** The author(s) of the website */
    "author": (string) | null;
    /** The date and time the website was published */
    "publishedAt": (string) | null;
  };
  "type": "custom";
};

export type ExaSchemaWebsetItemEvaluation = {
  /** The description of the criterion */
  "criterion": string;
  /** The reasoning for the result of the evaluation */
  "reasoning": string;
  /** The satisfaction of the criterion */
  "satisfied": true | false | "unclear";
  /** The references used to generate the result. */
  "references"?: Array<{
    /** The title of the reference */
    "title": (string) | null;
    /** The relevant snippet of the reference content */
    "snippet": (string) | null;
    /** The URL of the reference (format uri) */
    "url": string;
  }>;
};

export type ExaSchemaEnrichmentResult = {
  /** The type of object */
  "object": "enrichment_result";
  /** The status of the enrichment result. */
  "status": "pending" | "completed" | "canceled";
  "format": ExaSchemaWebsetEnrichmentFormat;
  /** The result of the enrichment. */
  "result": (Array<string>) | null;
  /** The reasoning for the result when an Agent is used. */
  "reasoning": (string) | null;
  /** The references used to generate the result. */
  "references": Array<{
    /** The title of the reference */
    "title": (string) | null;
    /** The relevant snippet of the reference content */
    "snippet": (string) | null;
    /** The URL of the reference (format uri) */
    "url": string;
  }>;
  /** The id of the Enrichment that generated the result */
  "enrichmentId": string;
};

export type ExaSchemaCompanyEntity = {
  "type": "company";
};

export type ExaSchemaPersonEntity = {
  "type": "person";
};

export type ExaSchemaArticleEntity = {
  "type": "article";
};

export type ExaSchemaResearchPaperEntity = {
  "type": "research_paper";
};

export type ExaSchemaCustomEntity = {
  /**  (minLength 2, maxLength 200) */
  "description": string;
  "type": "custom";
};

export type ExaSchemaWebsetItemPreview = {
  /** The unique identifier for the preview item */
  "id": string;
  /** The properties of the preview item */
  "properties": ((ExaSchemaWebsetItemPersonProperties) | (ExaSchemaWebsetItemCompanyProperties) | (ExaSchemaWebsetItemArticleProperties) | (ExaSchemaWebsetItemResearchPaperProperties) | (ExaSchemaWebsetItemCustomProperties));
  /** The date and time the preview was created (format date-time) */
  "createdAt": string;
};

export type ExaSchemaMonitorCadence = {
  /** Cron expression for monitor cadence (must be a valid Unix cron with 5 fields). The schedule must trigger at most once per day. */
  "cron": string;
  /** IANA timezone (e.g., "America/New_York") */
  "timezone"?: string;
};

export type ExaSchemaMonitorBehavior = {
  /** Search parameters for each Monitor run. */
  "config": {
    /** The query to search for. By default, the query from the last search is used. (minLength 2, maxLength 10000) */
    "query"?: string;
    /** The criteria to search for. By default, the criteria from the last search is used. (maxItems 5) */
    "criteria"?: Array<{
      /**  (minLength 2, maxLength 1000) */
      "description": string;
    }>;
    /** The entity to search for. By default, the entity from the last search/import is used. */
    "entity"?: ExaSchemaEntity;
    /** The maximum number of results to find */
    "count": number;
    /** The behaviour of the Search when it is added to a Webset. */
    "behavior"?: ExaSchemaWebsetSearchBehavior;
  };
  /** Configure the Monitor to find new Items matching your search criteria */
  "type": "search";
};

export type ExaSchemaWebhookAttempt = {
  /** The unique identifier for the webhook attempt */
  "id": string;
  /** The type of object */
  "object": "webhook_attempt";
  /** The unique identifier for the event */
  "eventId": string;
  /** The type of event */
  "eventType": ExaSchemaEventType;
  /** The unique identifier for the webhook */
  "webhookId": string;
  /** The URL that was used during the attempt */
  "url": string;
  /** Whether the attempt was successful */
  "successful": boolean;
  /** The headers of the response */
  "responseHeaders": {
    [key: string]: string;
  };
  /** The body of the response */
  "responseBody": (string) | null;
  /** The status code of the response */
  "responseStatusCode": number;
  /** The attempt number of the webhook */
  "attempt": number;
  /** The date and time the webhook attempt was made (format date-time) */
  "attemptedAt": string;
};

export type ExaSchemaSearchWarningOutput = {
  /** Machine-readable warning code, UPPER_SNAKE. `IGNORED_FIELD`: the field at `path` is accepted and has no effect. Codes are an open set: tolerate codes you do not recognize. */
  "code": string;
  /** JSON Pointer to the request field the warning is about. */
  "path": string;
  /** Human-readable and complete on its own: what to change in the request. */
  "message": string;
};

export type ExaSchemaSearchNoticeOutput = {
  /** Machine-readable notice code, UPPER_SNAKE. `RESTRICTIONS_RELAXED`: the `site:` or exact-phrase restrictions written in the query matched nothing, so the results come from a search with them removed; filters set in the request body were kept. Codes are an open set: tolerate codes  */
  "code": string;
  /** JSON Pointer to the request field the notice is about. */
  "path": string;
  /** Human-readable and complete on its own; written to be shown to a model. */
  "message": string;
  /** Optional extra context for a harness or model. An open object: no schema is promised for its keys, and it never carries information that `message` lacks. */
  "details"?: {
    [key: string]: unknown;
  };
};

export type ExaSchemaSearchSynthesisOutputOutput = {
  /** Synthesized content. String by default, or object when outputSchema is provided. */
  "content": ((string) | ({
    [key: string]: ExaSchemaJsonValue;
  }));
  /** Field-level grounding for synthesized output. */
  "grounding": Array<{
    /** Field path in output.content, for example content or companies[0].funding. */
    "field": string;
    /** Sources supporting this output field. */
    "citations": Array<{
      /** Source URL. (format uri) */
      "url": string;
      /** Source title. */
      "title": string;
    }>;
    /** Model-reported reliability for this field. */
    "confidence": "low" | "medium" | "high";
  }>;
};

export type ExaSchemaSearchCompanyEntityOutput = {
  /** Stable company entity identifier. */
  "id": string;
  /** Entity discriminator. */
  "type": "company";
  /** Entity schema version. (min 1) */
  "version": number;
  /** Company-specific entity fields. */
  "properties": {
    /** Company name. */
    "name": ((string) | (null));
    /** Year the company was founded. */
    "foundedYear": ((number) | (null));
    /** Short company description. */
    "description": ((string) | (null));
    /** Company workforce information. */
    "workforce": (({
      /** Total estimated employee count. */
      "total": ((number) | (null));
    }) | (null));
    /** Company headquarters information. */
    "headquarters": (({
      /** Company headquarters street address. */
      "address": ((string) | (null));
      /** Company headquarters city. */
      "city": ((string) | (null));
      /** Company headquarters postal code. */
      "postalCode": ((string) | (null));
      /** Company headquarters country. */
      "country": ((string) | (null));
    }) | (null));
    /** Company financial information. */
    "financials": (({
      /** Estimated annual revenue in USD. */
      "revenueAnnual": ((number) | (null));
      /** Total funding raised in USD. */
      "fundingTotal": ((number) | (null));
      /** Most recent funding round, when available. */
      "fundingLatestRound": (({
        /** Funding round name. */
        "name": ((string) | (null));
        /** Funding round date. */
        "date": ((string) | (null));
        /** Funding round amount in USD. */
        "amount": ((number) | (null));
      }) | (null));
    }) | (null));
    /** Company web traffic information. */
    "webTraffic": (({
      /** Estimated monthly website visits. */
      "visitsMonthly": ((number) | (null));
      /** Estimated website traffic rank within the company's primary country. */
      "countryRank": ((number) | (null));
      /** Estimated average visit duration, in seconds. */
      "avgDurationSeconds": ((number) | (null));
      /** Historical monthly website visits. */
      "history": Array<{
        /** Estimated monthly visits for this period. */
        "value": number;
        /** Start month for this value, formatted as YYYY-MM. */
        "dateFrom": string;
        /** End month for this value, formatted as YYYY-MM. */
        "dateTo": string;
      }>;
    }) | (null));
    /** Company research information. */
    "research": (({
      /** Number of works with an affiliated author. */
      "worksCount": ((number) | (null));
      /** Lifetime citation count. */
      "citationCount": ((number) | (null));
      /** Ranked research areas, most active first. */
      "areas": Array<string>;
      /** Most-cited notable works. */
      "notableWorks": Array<{
        /** Publication title. */
        "title": ((string) | (null));
        /** Publication year. */
        "year": ((number) | (null));
        /** Publication venue. */
        "venue": ((string) | (null));
        /** Number of works citing this publication. */
        "citationCount": ((number) | (null));
        /** Digital Object Identifier. */
        "doi": ((string) | (null));
        /** Resolved publication entity identifier, when available. */
        "id": ((string) | (null));
        /** Publication type. */
        "type": (("article" | "book" | "book-chapter" | "dataset" | "dissertation" | "preprint" | "report" | "review") | (null));
      }>;
      /** Researchers ordered by works produced at the organization. */
      "topResearchers": Array<{
        /** Referenced researcher. */
        "person": (({
          /** Referenced person name. */
          "name": ((string) | (null));
          /** Referenced person entity identifier. */
          "id": ((string) | (null));
        }) | (null));
        /** Number of works produced at the organization. */
        "worksCount": ((number) | (null));
        /** Number of citations for works produced at the organization. */
        "citationCount": ((number) | (null));
      }>;
    }) | (null));
  };
};

export type ExaSchemaSearchPersonEntityOutput = {
  /** Stable person entity identifier. */
  "id": string;
  /** Entity discriminator. */
  "type": "person";
  /** Entity schema version. (min 1) */
  "version": number;
  /** Person-specific entity fields. */
  "properties": {
    /** Person name. */
    "name": ((string) | (null));
    /** Person first name. */
    "firstName": ((string) | (null));
    /** Person last name. */
    "lastName": ((string) | (null));
    /** Person location. */
    "location": ((string) | (null));
    /** Known professional roles for this person. */
    "workHistory": Array<{
      /** Role title. */
      "title": ((string) | (null));
      /** Role location. */
      "location": ((string) | (null));
      /** Role date range. */
      "dates": (({
        /** Start date for the date range. */
        "from": ((string) | (null));
        /** End date for the date range. */
        "to": ((string) | (null));
      }) | (null));
      /** Company for this role. */
      "company": (({
        /** Referenced company identifier. */
        "id": ((string) | (null));
        /** Referenced company name. */
        "name": ((string) | (null));
      }) | (null));
    }>;
    /** Known education history for this person. */
    "educationHistory": Array<{
      /** Degree or credential. */
      "degree": ((string) | (null));
      /** Education date range. */
      "dates": (({
        /** Start date for the date range. */
        "from": ((string) | (null));
        /** End date for the date range. */
        "to": ((string) | (null));
      }) | (null));
      /** Education institution. */
      "institution": (({
        /** Referenced institution identifier. */
        "id": ((string) | (null));
        /** Referenced institution name. */
        "name": ((string) | (null));
      }) | (null));
    }>;
    /** Person research information. */
    "research": (({
      /** Lifetime number of works. */
      "worksCount": ((number) | (null));
      /** Lifetime citation count. */
      "citationCount": ((number) | (null));
      /** Research h-index. */
      "hIndex": ((number) | (null));
      /** Year of the first publication. */
      "firstPublicationYear": ((number) | (null));
      /** Year of the latest publication. */
      "latestPublicationYear": ((number) | (null));
      /** Ranked research areas, most active first. */
      "areas": Array<string>;
      /** Most-cited notable works. */
      "notableWorks": Array<{
        /** Publication title. */
        "title": ((string) | (null));
        /** Publication year. */
        "year": ((number) | (null));
        /** Publication venue. */
        "venue": ((string) | (null));
        /** Number of works citing this publication. */
        "citationCount": ((number) | (null));
        /** Digital Object Identifier. */
        "doi": ((string) | (null));
        /** Resolved publication entity identifier, when available. */
        "id": ((string) | (null));
        /** Publication type. */
        "type": (("article" | "book" | "book-chapter" | "dataset" | "dissertation" | "preprint" | "report" | "review") | (null));
      }>;
    }) | (null));
  };
};

export type ExaSchemaSearchPublicationEntityOutput = {
  /** Stable publication entity identifier. */
  "id": string;
  /** Entity discriminator. */
  "type": "publication";
  /** Entity schema version. (min 1) */
  "version": number;
  /** Publication-specific entity fields. */
  "properties": {
    /** Publication title. */
    "title": ((string) | (null));
    /** Publication year. */
    "year": ((number) | (null));
    /** Publication date. */
    "date": ((string) | (null));
    /** Publication type. */
    "type": (("article" | "book" | "book-chapter" | "dataset" | "dissertation" | "preprint" | "report" | "review") | (null));
    /** Publication language. */
    "language": ((string) | (null));
    /** Number of works citing this publication (incoming references). */
    "citationCount": ((number) | (null));
    /** Ordered list of authors. */
    "authors": Array<{
      /** Author display name. */
      "name": ((string) | (null));
      /** Resolved person entity identifier, when available. */
      "id": ((string) | (null));
    }>;
    /** Number of works this publication cites (outgoing references). */
    "referenceCount": ((number) | (null));
    /** Publication abstract text. */
    "abstract": ((string) | (null));
    /** Bare DOI identifier (e.g. 10.1234/abcd). */
    "doi": ((string) | (null));
  };
};

export type ExaSchemaSearchMonitorContentsOutput = {
  /** Text extraction options for each result. */
  "text"?: ((boolean) | ({
    "maxCharacters"?: ((number) | (null));
    "includeHtmlTags"?: ((boolean) | (null));
    "verbosity"?: (("compact" | "standard" | "full") | (null));
    "includeSections"?: ((Array<"header" | "navigation" | "banner" | "body" | "sidebar" | "footer" | "metadata">) | (null));
    "excludeSections"?: ((Array<"header" | "navigation" | "banner" | "body" | "sidebar" | "footer" | "metadata">) | (null));
  }));
  /** Text snippets the LLM identifies as most relevant from each page. */
  "highlights"?: ((boolean) | ({
    "query"?: ((string) | (null));
    "verbosity"?: (("low" | "medium" | "high") | (null));
    "dynamic"?: ((boolean) | (null));
    "maxCharacters"?: ((number) | (null));
    "numSentences"?: ((number) | (null));
    "highlightsPerUrl"?: ((number) | (null));
  }));
  /** Return an LLM-generated summary. Pass `true` for defaults, or an object with `query`. */
  "summary"?: ((boolean) | (ExaSchemaSummaryWithMaxTokensOptionsOutput));
  /** Extra parameters to pass. */
  "extras"?: {
    "links"?: ((number) | (null));
    "imageLinks"?: ((number) | (null));
    "richImageLinks"?: ((number) | (null));
    "richLinks"?: ((number) | (null));
    "codeBlocks"?: ((number) | (null));
  };
  /** Crawl strategy for fetching page content */
  "livecrawl"?: (("never" | "always" | "fallback" | "preferred") | ("auto"));
  /** The timeout for livecrawling in milliseconds. (max 90000) */
  "livecrawlTimeout"?: number;
  /** Maximum age of cached content, in hours, up to 720. Cached content younger than this is used, and older pages are fetched fresh. `0` always fetches fresh content and `-1` always uses the cache. When omitted, cached content is used when available and pages without it are fetched l (min -1, max 720) */
  "maxAgeHours"?: number;
  /** Filter out results with no content */
  "filterEmptyResults"?: boolean;
  /** The number of subpages to crawl. The actual number crawled may be limited by system constraints. (min 0, max 100) */
  "subpages"?: number;
  /** Term to find specific subpages of search results. Can be a single string or an array of strings. */
  "subpageTarget"?: ((string) | (Array<string>));
  /** Deprecated. Use `highlights` or `text` instead. Returns page contents as a combined context string. */
  "context"?: ((boolean) | ({
    /** Maximum character limit for the context string. (min 1, max 1000000) */
    "maxCharacters"?: number;
  }));
};

export type ExaSchemaOutputSchemaTextOutput = {
  "type": "text";
  "description"?: string;
};

export type ExaSchemaSummaryWithMaxTokensOptions = {
  "query"?: ((string) | (null));
  /** Deprecated. Maximum tokens for the generated summary. (min 1) */
  "maxTokens"?: number;
};

export type ExaSchemaAgentDataSourceProvider = string;

export type ExaSchemaAgentDataSourceOutput = {
  /** Exa Connect data provider to enable for the run. All provider tools are available by default. */
  "provider": ExaSchemaAgentDataSourceProvider;
};

export type ExaSchemaAgentBudgetOutput = {
  /** Maximum amount this run can spend in US dollars. Accepts $1–$100 and applies only to `auto` and `ultra`; when omitted, the default cap is $5 for `auto` and $20 for `ultra`. */
  "maxCostDollars"?: number;
  /** Soft wall-clock ceiling for the run in seconds. Accepts 300–10,800 (5 minutes to 3 hours) and applies only to `ultra`. As the run approaches the limit, the agent stops starting new work and returns what it has found with `stopReason: "time_limit_reached"`. */
  "maxDurationSeconds"?: number;
};

export type ExaSchemaAgentGrounding = {
  /** Output field the citations support. */
  "field": string;
  "citations": Array<ExaSchemaAgentCitation>;
  "confidence"?: (("low" | "medium" | "high") | (null));
};

export type ExaSchemaAgentDataSourceUsage = {
  [key: string]: number;
};

export type ExaSchemaAgentDataSourceCost = {
  [key: string]: number;
};

export type ExaSchemaSummaryWithMaxTokensOptionsOutput = {
  "query"?: ((string) | (null));
  /** Deprecated. Maximum tokens for the generated summary. (min 1) */
  "maxTokens"?: number;
};

export type ExaSchemaAgentCitation = {
  /** Source URL. (format uri) */
  "url": string;
  /** Source title. */
  "title"?: string;
};

export type ExaSearchBody = ExaSchemaSearchRequest;

export interface ExaSearchInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  headers?: Readonly<Record<string, string>>;
  body: Omit<ExaSearchBody, "stream"> & { stream?: false };
}

export type ExaSearchResponse = ExaSchemaSearchResponse;

export type ExaSearchStreamBody = ExaSchemaSearchRequest;

export interface ExaSearchStreamInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  headers?: Readonly<Record<string, string>>;
  body: Omit<ExaSearchStreamBody, "stream"> & { stream?: true } & { outputSchema: NonNullable<ExaSchemaSearchRequest["outputSchema"]> };
}

export type ExaSearchStreamPayload = ExaSchemaSearchStreamChunk;

export type ExaGetContentsBody = ExaSchemaContentsRequest;

export interface ExaGetContentsInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  headers?: Readonly<Record<string, string>>;
  body: ExaGetContentsBody;
}

export type ExaGetContentsResponse = ExaSchemaContentsResponse;

export type ExaAnswerBody = ExaSchemaAnswerRequest;

export interface ExaAnswerInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  headers?: Readonly<Record<string, string>>;
  body: Omit<ExaAnswerBody, "stream"> & { stream?: false };
}

export type ExaAnswerResponse = ExaSchemaAnswerResponse;

export type ExaAnswerStreamBody = ExaSchemaAnswerRequest;

export interface ExaAnswerStreamInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  headers?: Readonly<Record<string, string>>;
  body: Omit<ExaAnswerStreamBody, "stream"> & { stream?: true };
}

export type ExaAnswerStreamPayload = ExaSchemaAnswerStreamChunk;

export type ExaFindSimilarBody = ExaSchemaFindSimilarRequest;

export interface ExaFindSimilarInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  headers?: Readonly<Record<string, string>>;
  body: ExaFindSimilarBody;
}

export type ExaFindSimilarResponse = ExaSchemaFindSimilarResponse;

export type ExaCreateMonitorBody = ExaSchemaCreateSearchMonitorParameters;

export interface ExaCreateMonitorInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  headers?: Readonly<Record<string, string>>;
  body: ExaCreateMonitorBody;
}

export type ExaCreateMonitorResponse = ExaSchemaCreateSearchMonitorResponse;

export type ExaListMonitorsQuery = {
  /** Filter monitors by status */
  "status"?: "active" | "paused" | "disabled";
  /** Pagination cursor from a previous response */
  "cursor"?: string;
  /** Number of results per page (min 1, max 100) */
  "limit"?: number;
  /** Filter monitors by name (case-insensitive substring match) (maxLength 250) */
  "name"?: string;
  /** Filter monitors by metadata key-value pairs (exact match, AND semantics). Use bracket notation: `metadata[key]=value`. */
  "metadata"?: {
    [key: string]: string;
  };
};

export interface ExaListMonitorsInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  query?: ExaListMonitorsQuery;
  headers?: Readonly<Record<string, string>>;
}

export type ExaListMonitorsResponse = ExaSchemaListSearchMonitorsResponse;

export type ExaBatchMonitorsBody = ExaSchemaBatchMonitorsRequest;

export interface ExaBatchMonitorsInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  headers?: Readonly<Record<string, string>>;
  body: ExaBatchMonitorsBody;
}

export type ExaBatchMonitorsResponse = ExaSchemaBatchMonitorsResponse;

export type ExaGetMonitorPath = {
  /** The monitor ID */
  "id": string;
};

export interface ExaGetMonitorInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  path: ExaGetMonitorPath;
  headers?: Readonly<Record<string, string>>;
}

export type ExaGetMonitorResponse = ExaSchemaSearchMonitor;

export type ExaUpdateMonitorPath = {
  /** The monitor ID */
  "id": string;
};

export type ExaUpdateMonitorBody = ExaSchemaUpdateSearchMonitorParameters;

export interface ExaUpdateMonitorInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  path: ExaUpdateMonitorPath;
  headers?: Readonly<Record<string, string>>;
  body: ExaUpdateMonitorBody;
}

export type ExaUpdateMonitorResponse = ExaSchemaSearchMonitor;

export type ExaDeleteMonitorPath = {
  /** The monitor ID */
  "id": string;
};

export interface ExaDeleteMonitorInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  path: ExaDeleteMonitorPath;
  headers?: Readonly<Record<string, string>>;
}

export type ExaDeleteMonitorResponse = ExaSchemaSearchMonitor;

export type ExaTriggerMonitorPath = {
  /** The monitor ID */
  "id": string;
};

export interface ExaTriggerMonitorInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  path: ExaTriggerMonitorPath;
  headers?: Readonly<Record<string, string>>;
}

export type ExaTriggerMonitorResponse = ExaSchemaTriggerSearchMonitorResponse;

export type ExaListMonitorRunsPath = {
  /** The monitor ID */
  "id": string;
};

export type ExaListMonitorRunsQuery = {
  /** Pagination cursor from a previous response */
  "cursor"?: string;
  /** Number of results per page (min 1, max 100) */
  "limit"?: number;
};

export interface ExaListMonitorRunsInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  path: ExaListMonitorRunsPath;
  query?: ExaListMonitorRunsQuery;
  headers?: Readonly<Record<string, string>>;
}

export type ExaListMonitorRunsResponse = ExaSchemaListSearchMonitorRunsResponse;

export type ExaGetMonitorRunPath = {
  /** The monitor ID */
  "id": string;
  /** The run ID */
  "runId": string;
};

export interface ExaGetMonitorRunInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  path: ExaGetMonitorRunPath;
  headers?: Readonly<Record<string, string>>;
}

export type ExaGetMonitorRunResponse = ExaSchemaSearchMonitorRun;

export type ExaCreateAgentRunHeaders = {
  /** Set to `text/event-stream` to receive server-sent events. */
  "Accept"?: "application/json" | "text/event-stream";
  /** Comma-separated beta feature tokens for opting into experimental features. */
  "Exa-Beta"?: string;
};

export type ExaCreateAgentRunBody = ExaSchemaCreateAgentRunRequest;

export interface ExaCreateAgentRunInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  headers?: ExaCreateAgentRunHeaders & Readonly<Record<string, string>>;
  body: ExaCreateAgentRunBody;
}

export type ExaCreateAgentRunResponse = ExaSchemaAgentRun;

export type ExaCreateAgentRunStreamHeaders = {
  /** Set to `text/event-stream` to receive server-sent events. */
  "Accept"?: "application/json" | "text/event-stream";
  /** Comma-separated beta feature tokens for opting into experimental features. */
  "Exa-Beta"?: string;
};

export type ExaCreateAgentRunStreamBody = ExaSchemaCreateAgentRunRequest;

export interface ExaCreateAgentRunStreamInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  headers?: ExaCreateAgentRunStreamHeaders & Readonly<Record<string, string>>;
  body: ExaCreateAgentRunStreamBody;
}

export type ExaCreateAgentRunStreamPayload = ExaSchemaAgentRunEvent;

export type ExaListAgentRunsQuery = {
  /** Number of results per page (min 1, max 100) */
  "limit"?: number;
  /** Cursor for pagination. Use the `nextCursor` value from the previous run list response. */
  "cursor"?: ExaSchemaAgentRunId;
};

export interface ExaListAgentRunsInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  query?: ExaListAgentRunsQuery;
  headers?: Readonly<Record<string, string>>;
}

export type ExaListAgentRunsResponse = ExaSchemaAgentRunList;

export type ExaGetAgentRunPath = {
  /** Agent run ID. */
  "id": ExaSchemaAgentRunId;
};

export interface ExaGetAgentRunInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  path: ExaGetAgentRunPath;
  headers?: Readonly<Record<string, string>>;
}

export type ExaGetAgentRunResponse = ExaSchemaAgentRun;

export type ExaDeleteAgentRunPath = {
  /** Agent run ID. */
  "id": ExaSchemaAgentRunId;
};

export interface ExaDeleteAgentRunInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  path: ExaDeleteAgentRunPath;
  headers?: Readonly<Record<string, string>>;
}

export type ExaDeleteAgentRunResponse = ExaSchemaDeleteAgentRunResponse;

export type ExaCancelAgentRunPath = {
  /** Agent run ID. */
  "id": ExaSchemaAgentRunId;
};

export interface ExaCancelAgentRunInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  path: ExaCancelAgentRunPath;
  headers?: Readonly<Record<string, string>>;
}

export type ExaCancelAgentRunResponse = ExaSchemaAgentRun;

export type ExaStopAgentRunPath = {
  /** Agent run ID. */
  "id": ExaSchemaAgentRunId;
};

export interface ExaStopAgentRunInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  path: ExaStopAgentRunPath;
  headers?: Readonly<Record<string, string>>;
}

export type ExaStopAgentRunResponse = ExaSchemaAgentRun;

export type ExaListAgentRunEventsPath = {
  /** Agent run ID. */
  "id": ExaSchemaAgentRunId;
};

export type ExaListAgentRunEventsQuery = {
  /** Number of results per page (min 1, max 100) */
  "limit"?: number;
  /** Cursor for pagination. Use the `nextCursor` value from the previous event list response. */
  "cursor"?: string;
};

export type ExaListAgentRunEventsHeaders = {
  /** Set to `text/event-stream` to receive server-sent events. */
  "Accept"?: "application/json" | "text/event-stream";
  /** For SSE replay, return only events after this event ID. */
  "Last-Event-ID"?: string;
};

export interface ExaListAgentRunEventsInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  path: ExaListAgentRunEventsPath;
  query?: ExaListAgentRunEventsQuery;
  headers?: ExaListAgentRunEventsHeaders & Readonly<Record<string, string>>;
}

export type ExaListAgentRunEventsResponse = ExaSchemaAgentRunEventList;

export type ExaListAgentRunEventsStreamPath = {
  /** Agent run ID. */
  "id": ExaSchemaAgentRunId;
};

export type ExaListAgentRunEventsStreamQuery = {
  /** Number of results per page (min 1, max 100) */
  "limit"?: number;
  /** Cursor for pagination. Use the `nextCursor` value from the previous event list response. */
  "cursor"?: string;
};

export type ExaListAgentRunEventsStreamHeaders = {
  /** Set to `text/event-stream` to receive server-sent events. */
  "Accept"?: "application/json" | "text/event-stream";
  /** For SSE replay, return only events after this event ID. */
  "Last-Event-ID"?: string;
};

export interface ExaListAgentRunEventsStreamInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  path: ExaListAgentRunEventsStreamPath;
  query?: ExaListAgentRunEventsStreamQuery;
  headers?: ExaListAgentRunEventsStreamHeaders & Readonly<Record<string, string>>;
}

export type ExaListAgentRunEventsStreamPayload = ExaSchemaAgentRunEvent;

export type ExaCreateBatchHeaders = {
  /** Required beta token for the Batch API. */
  "Exa-Beta"?: "batches-2026-06-06";
};

export type ExaCreateBatchBody = ExaSchemaCreateBatchRequest;

export interface ExaCreateBatchInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  headers?: ExaCreateBatchHeaders & Readonly<Record<string, string>>;
  body: ExaCreateBatchBody;
}

export type ExaCreateBatchResponse = ExaSchemaBatch;

export type ExaListBatchesQuery = {
  /** Pagination cursor from a previous response */
  "cursor"?: string;
  /** Maximum number of batches to return per page. Defaults to 100 when omitted; there is no upper bound. (min 1) */
  "limit"?: number;
  /** Return only completed batches, ordered by expiry. Send it on every page request when paginating. */
  "status"?: "completed";
};

export type ExaListBatchesHeaders = {
  /** Required beta token for the Batch API. */
  "Exa-Beta"?: "batches-2026-06-06";
};

export interface ExaListBatchesInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  query?: ExaListBatchesQuery;
  headers?: ExaListBatchesHeaders & Readonly<Record<string, string>>;
}

export type ExaListBatchesResponse = ExaSchemaBatchList;

export type ExaGetBatchPath = {
  /** Batch ID. (minLength 1) */
  "id": string;
};

export type ExaGetBatchHeaders = {
  /** Required beta token for the Batch API. */
  "Exa-Beta"?: "batches-2026-06-06";
};

export interface ExaGetBatchInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  path: ExaGetBatchPath;
  headers?: ExaGetBatchHeaders & Readonly<Record<string, string>>;
}

export type ExaGetBatchResponse = ExaSchemaBatch;

export type ExaDeleteBatchPath = {
  /** Batch ID. (minLength 1) */
  "id": string;
};

export type ExaDeleteBatchHeaders = {
  /** Required beta token for the Batch API. */
  "Exa-Beta"?: "batches-2026-06-06";
};

export interface ExaDeleteBatchInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  path: ExaDeleteBatchPath;
  headers?: ExaDeleteBatchHeaders & Readonly<Record<string, string>>;
}

export type ExaDeleteBatchResponse = ExaSchemaDeletedBatch;

export type ExaCancelBatchPath = {
  /** Batch ID. (minLength 1) */
  "id": string;
};

export type ExaCancelBatchHeaders = {
  /** Required beta token for the Batch API. */
  "Exa-Beta"?: "batches-2026-06-06";
};

export interface ExaCancelBatchInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  path: ExaCancelBatchPath;
  headers?: ExaCancelBatchHeaders & Readonly<Record<string, string>>;
}

export type ExaCancelBatchResponse = ExaSchemaBatch;

export interface ExaGetTeamInfoInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  headers?: Readonly<Record<string, string>>;
}

export type ExaGetTeamInfoResponse = ExaSchemaWebsetsTeamInfo;

export type ExaCreateWebsetBody = ExaSchemaCreateWebsetParameters;

export interface ExaCreateWebsetInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  headers?: Readonly<Record<string, string>>;
  body: ExaCreateWebsetBody;
}

export type ExaCreateWebsetResponse = ExaSchemaWebset;

export type ExaListWebsetsQuery = {
  /**  (minLength 1) */
  "cursor"?: string;
  /**  (min 1, max 100) */
  "limit"?: number;
  /**  (minLength 2, maxLength 50) */
  "search"?: string;
};

export interface ExaListWebsetsInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  query?: ExaListWebsetsQuery;
  headers?: Readonly<Record<string, string>>;
}

export type ExaListWebsetsResponse = ExaSchemaListWebsetsResponse;

export type ExaGetWebsetPath = {
  "id": string;
};

export type ExaGetWebsetQuery = {
  "expand"?: Array<"items">;
};

export interface ExaGetWebsetInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  path: ExaGetWebsetPath;
  query?: ExaGetWebsetQuery;
  headers?: Readonly<Record<string, string>>;
}

export type ExaGetWebsetResponse = ExaSchemaGetWebsetResponse;

export type ExaUpdateWebsetPath = {
  "id": string;
};

export type ExaUpdateWebsetBody = ExaSchemaUpdateWebsetRequest;

export interface ExaUpdateWebsetInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  path: ExaUpdateWebsetPath;
  headers?: Readonly<Record<string, string>>;
  body: ExaUpdateWebsetBody;
}

export type ExaUpdateWebsetResponse = ExaSchemaWebset;

export type ExaDeleteWebsetPath = {
  "id": string;
};

export interface ExaDeleteWebsetInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  path: ExaDeleteWebsetPath;
  headers?: Readonly<Record<string, string>>;
}

export type ExaDeleteWebsetResponse = ExaSchemaWebset;

export type ExaCancelWebsetPath = {
  "id": string;
};

export interface ExaCancelWebsetInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  path: ExaCancelWebsetPath;
  headers?: Readonly<Record<string, string>>;
}

export type ExaCancelWebsetResponse = ExaSchemaWebset;

export type ExaCreateWebsetSearchPath = {
  "webset": string;
};

export type ExaCreateWebsetSearchBody = ExaSchemaCreateWebsetSearchParameters;

export interface ExaCreateWebsetSearchInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  path: ExaCreateWebsetSearchPath;
  headers?: Readonly<Record<string, string>>;
  body: ExaCreateWebsetSearchBody;
}

export type ExaCreateWebsetSearchResponse = ExaSchemaWebsetSearch;

export type ExaGetWebsetSearchPath = {
  "webset": string;
  "id": string;
};

export interface ExaGetWebsetSearchInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  path: ExaGetWebsetSearchPath;
  headers?: Readonly<Record<string, string>>;
}

export type ExaGetWebsetSearchResponse = ExaSchemaWebsetSearch;

export type ExaCancelWebsetSearchPath = {
  "webset": string;
  "id": string;
};

export interface ExaCancelWebsetSearchInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  path: ExaCancelWebsetSearchPath;
  headers?: Readonly<Record<string, string>>;
}

export type ExaCancelWebsetSearchResponse = ExaSchemaWebsetSearch;

export type ExaCreateWebsetEnrichmentPath = {
  "webset": string;
};

export type ExaCreateWebsetEnrichmentBody = ExaSchemaCreateEnrichmentParameters;

export interface ExaCreateWebsetEnrichmentInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  path: ExaCreateWebsetEnrichmentPath;
  headers?: Readonly<Record<string, string>>;
  body: ExaCreateWebsetEnrichmentBody;
}

export type ExaCreateWebsetEnrichmentResponse = ExaSchemaWebsetEnrichment;

export type ExaUpdateWebsetEnrichmentPath = {
  "webset": string;
  "id": string;
};

export type ExaUpdateWebsetEnrichmentBody = ExaSchemaUpdateEnrichmentParameters;

export interface ExaUpdateWebsetEnrichmentInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  path: ExaUpdateWebsetEnrichmentPath;
  headers?: Readonly<Record<string, string>>;
  body: ExaUpdateWebsetEnrichmentBody;
}

export type ExaGetWebsetEnrichmentPath = {
  "webset": string;
  "id": string;
};

export interface ExaGetWebsetEnrichmentInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  path: ExaGetWebsetEnrichmentPath;
  headers?: Readonly<Record<string, string>>;
}

export type ExaGetWebsetEnrichmentResponse = ExaSchemaWebsetEnrichment;

export type ExaDeleteWebsetEnrichmentPath = {
  "webset": string;
  "id": string;
};

export interface ExaDeleteWebsetEnrichmentInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  path: ExaDeleteWebsetEnrichmentPath;
  headers?: Readonly<Record<string, string>>;
}

export type ExaDeleteWebsetEnrichmentResponse = ExaSchemaWebsetEnrichment;

export type ExaCancelWebsetEnrichmentPath = {
  "webset": string;
  "id": string;
};

export interface ExaCancelWebsetEnrichmentInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  path: ExaCancelWebsetEnrichmentPath;
  headers?: Readonly<Record<string, string>>;
}

export type ExaCancelWebsetEnrichmentResponse = ExaSchemaWebsetEnrichment;

export type ExaGetWebsetItemPath = {
  "webset": string;
  "id": string;
};

export interface ExaGetWebsetItemInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  path: ExaGetWebsetItemPath;
  headers?: Readonly<Record<string, string>>;
}

export type ExaGetWebsetItemResponse = ExaSchemaWebsetItem;

export type ExaDeleteWebsetItemPath = {
  "webset": string;
  "id": string;
};

export interface ExaDeleteWebsetItemInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  path: ExaDeleteWebsetItemPath;
  headers?: Readonly<Record<string, string>>;
}

export type ExaDeleteWebsetItemResponse = ExaSchemaWebsetItem;

export type ExaListWebsetItemsPath = {
  "webset": string;
};

export type ExaListWebsetItemsQuery = {
  /**  (minLength 1) */
  "cursor"?: string;
  /**  (min 1, max 100) */
  "limit"?: number;
  "sourceId"?: string;
};

export interface ExaListWebsetItemsInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  path: ExaListWebsetItemsPath;
  query?: ExaListWebsetItemsQuery;
  headers?: Readonly<Record<string, string>>;
}

export type ExaListWebsetItemsResponse = ExaSchemaListWebsetItemResponse;

export type ExaPreviewWebsetQuery = {
  "search"?: boolean;
};

export type ExaPreviewWebsetBody = ExaSchemaPreviewWebsetParameters;

export interface ExaPreviewWebsetInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  query?: ExaPreviewWebsetQuery;
  headers?: Readonly<Record<string, string>>;
  body: ExaPreviewWebsetBody;
}

export type ExaPreviewWebsetResponse = ExaSchemaPreviewWebsetResponse;

export type ExaCreateWebsetMonitorBody = ExaSchemaCreateMonitorParameters;

export interface ExaCreateWebsetMonitorInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  headers?: Readonly<Record<string, string>>;
  body: ExaCreateWebsetMonitorBody;
}

export type ExaCreateWebsetMonitorResponse = ExaSchemaMonitor;

export type ExaListWebsetMonitorsQuery = {
  /**  (minLength 1) */
  "cursor"?: string;
  /**  (min 1, max 200) */
  "limit"?: number;
  "websetId"?: string;
};

export interface ExaListWebsetMonitorsInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  query?: ExaListWebsetMonitorsQuery;
  headers?: Readonly<Record<string, string>>;
}

export type ExaListWebsetMonitorsResponse = ExaSchemaListMonitorsResponse;

export type ExaGetWebsetMonitorPath = {
  "id": string;
};

export interface ExaGetWebsetMonitorInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  path: ExaGetWebsetMonitorPath;
  headers?: Readonly<Record<string, string>>;
}

export type ExaGetWebsetMonitorResponse = ExaSchemaMonitor;

export type ExaUpdateWebsetMonitorPath = {
  "id": string;
};

export type ExaUpdateWebsetMonitorBody = ExaSchemaUpdateMonitor;

export interface ExaUpdateWebsetMonitorInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  path: ExaUpdateWebsetMonitorPath;
  headers?: Readonly<Record<string, string>>;
  body: ExaUpdateWebsetMonitorBody;
}

export type ExaUpdateWebsetMonitorResponse = ExaSchemaMonitor;

export type ExaDeleteWebsetMonitorPath = {
  "id": string;
};

export interface ExaDeleteWebsetMonitorInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  path: ExaDeleteWebsetMonitorPath;
  headers?: Readonly<Record<string, string>>;
}

export type ExaDeleteWebsetMonitorResponse = ExaSchemaMonitor;

export type ExaListWebsetMonitorRunsPath = {
  "monitor": string;
};

export interface ExaListWebsetMonitorRunsInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  path: ExaListWebsetMonitorRunsPath;
  headers?: Readonly<Record<string, string>>;
}

export type ExaListWebsetMonitorRunsResponse = ExaSchemaListMonitorRunsResponse;

export type ExaGetWebsetMonitorRunPath = {
  "monitor": string;
  "id": string;
};

export interface ExaGetWebsetMonitorRunInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  path: ExaGetWebsetMonitorRunPath;
  headers?: Readonly<Record<string, string>>;
}

export type ExaGetWebsetMonitorRunResponse = ExaSchemaMonitorRun;

export type ExaCreateImportBody = ExaSchemaCreateImportParameters;

export interface ExaCreateImportInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  headers?: Readonly<Record<string, string>>;
  body: ExaCreateImportBody;
}

export type ExaCreateImportResponse = ExaSchemaCreateImportResponse;

export type ExaListImportsQuery = {
  /**  (minLength 1) */
  "cursor"?: string;
  /**  (min 1, max 200) */
  "limit"?: number;
};

export interface ExaListImportsInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  query?: ExaListImportsQuery;
  headers?: Readonly<Record<string, string>>;
}

export type ExaListImportsResponse = ExaSchemaListImportsResponse;

export type ExaGetImportPath = {
  "id": string;
};

export interface ExaGetImportInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  path: ExaGetImportPath;
  headers?: Readonly<Record<string, string>>;
}

export type ExaGetImportResponse = ExaSchemaImport;

export type ExaUpdateImportPath = {
  "id": string;
};

export type ExaUpdateImportBody = ExaSchemaUpdateImport;

export interface ExaUpdateImportInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  path: ExaUpdateImportPath;
  headers?: Readonly<Record<string, string>>;
  body: ExaUpdateImportBody;
}

export type ExaUpdateImportResponse = ExaSchemaImport;

export type ExaDeleteImportPath = {
  "id": string;
};

export interface ExaDeleteImportInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  path: ExaDeleteImportPath;
  headers?: Readonly<Record<string, string>>;
}

export type ExaDeleteImportResponse = ExaSchemaImport;

export type ExaCreateWebhookBody = ExaSchemaCreateWebhookParameters;

export interface ExaCreateWebhookInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  headers?: Readonly<Record<string, string>>;
  body: ExaCreateWebhookBody;
}

export type ExaCreateWebhookResponse = ExaSchemaWebhook;

export type ExaListWebhooksQuery = {
  /**  (minLength 1) */
  "cursor"?: string;
  /**  (min 1, max 200) */
  "limit"?: number;
};

export interface ExaListWebhooksInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  query?: ExaListWebhooksQuery;
  headers?: Readonly<Record<string, string>>;
}

export type ExaListWebhooksResponse = ExaSchemaListWebhooksResponse;

export type ExaGetWebhookPath = {
  "id": string;
};

export interface ExaGetWebhookInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  path: ExaGetWebhookPath;
  headers?: Readonly<Record<string, string>>;
}

export type ExaGetWebhookResponse = ExaSchemaWebhook;

export type ExaUpdateWebhookPath = {
  "id": string;
};

export type ExaUpdateWebhookBody = ExaSchemaUpdateWebhookParameters;

export interface ExaUpdateWebhookInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  path: ExaUpdateWebhookPath;
  headers?: Readonly<Record<string, string>>;
  body: ExaUpdateWebhookBody;
}

export type ExaUpdateWebhookResponse = ExaSchemaWebhook;

export type ExaDeleteWebhookPath = {
  "id": string;
};

export interface ExaDeleteWebhookInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  path: ExaDeleteWebhookPath;
  headers?: Readonly<Record<string, string>>;
}

export type ExaDeleteWebhookResponse = ExaSchemaWebhook;

export type ExaListWebhookAttemptsPath = {
  "id": string;
};

export type ExaListWebhookAttemptsQuery = {
  /**  (minLength 1) */
  "cursor"?: string;
  /**  (min 1, max 200) */
  "limit"?: number;
  "eventType"?: ExaSchemaEventType;
  "successful"?: boolean;
};

export interface ExaListWebhookAttemptsInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  path: ExaListWebhookAttemptsPath;
  query?: ExaListWebhookAttemptsQuery;
  headers?: Readonly<Record<string, string>>;
}

export type ExaListWebhookAttemptsResponse = ExaSchemaListWebhookAttemptsResponse;

export type ExaListEventsQuery = {
  /**  (minLength 1) */
  "cursor"?: string;
  /**  (min 1, max 200) */
  "limit"?: number;
  "types"?: Array<"webset.created" | "webset.deleted" | "webset.paused" | "webset.idle" | "webset.search.created" | "webset.search.canceled" | "webset.search.completed" | "webset.search.updated" | "import.created" | "import.completed" | "webset.item.created" | "webset.item.enriched" | "monitor.created" | "monitor.updated" | "monitor.deleted" | "monitor.run.created" | "monitor.run.completed" | "webset.export.created" | "webset.export.completed">;
  /**  (format date-time) */
  "createdBefore"?: string;
  /**  (format date-time) */
  "createdAfter"?: string;
};

export interface ExaListEventsInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  query?: ExaListEventsQuery;
  headers?: Readonly<Record<string, string>>;
}

export type ExaListEventsResponse = ExaSchemaListEventsResponse;

export type ExaGetEventPath = {
  "id": string;
};

export interface ExaGetEventInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  path: ExaGetEventPath;
  headers?: Readonly<Record<string, string>>;
}

export type ExaGetEventResponse = ExaSchemaEvent;

export type ExaCreateApiKeyBody = {
  /** Optional name for the API key */
  "name"?: string;
  /** Optional rate limit for the API key (requests per second) */
  "rateLimit"?: number;
  /** Optional spending budget for the API key in the team's current billing period, in cents. It resets when the next billing period starts. Set to null to remove the budget. (min 0) */
  "budgetCents"?: number | null;
};

export interface ExaCreateApiKeyInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  headers?: Readonly<Record<string, string>>;
  body: ExaCreateApiKeyBody;
}

export type ExaCreateApiKeyResponse = {
  "apiKey"?: {
    /** Unique identifier for the API key (format uuid) */
    "id"?: string;
    /** Name of the API key */
    "name"?: string;
    /** Rate limit in requests per second */
    "rateLimit"?: number | null;
    /** Spending budget for the API key in the team's current billing period, in cents */
    "budgetCents"?: number | null;
    /** Whether the API key is currently over its budget */
    "isOverBudget"?: boolean;
    /** Team ID this key belongs to (format uuid) */
    "teamId"?: string;
    /** User ID who created this key (format uuid) */
    "userId"?: string;
    /** When the key was created (format date-time) */
    "createdAt"?: string;
  };
};

export type ExaListApiKeysQuery = {
  "api_key_id"?: string;
};

export interface ExaListApiKeysInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  query?: ExaListApiKeysQuery;
  headers?: Readonly<Record<string, string>>;
}

export type ExaListApiKeysResponse = (({
  "apiKeys"?: Array<{
    /**  (format uuid) */
    "id"?: string;
    "name"?: string;
    /** Rate limit in requests per second */
    "rateLimit"?: number | null;
    /** Spending budget for the API key in the team's current billing period, in cents */
    "budgetCents"?: number | null;
    /** Whether the API key is currently over its budget */
    "isOverBudget"?: boolean;
  }>;
}) | ({
  "apiKey"?: {
    /**  (format uuid) */
    "id"?: string;
    "name"?: string;
    /** Rate limit in requests per second */
    "rateLimit"?: number | null;
    /** Spending budget for the API key in the team's current billing period, in cents */
    "budgetCents"?: number | null;
    /** Whether the API key is currently over its budget */
    "isOverBudget"?: boolean;
    /**  (format uuid) */
    "teamId"?: string;
    /**  (format date-time) */
    "createdAt"?: string;
  };
}));

export type ExaGetApiKeyPath = {
  "id": string;
};

export interface ExaGetApiKeyInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  path: ExaGetApiKeyPath;
  headers?: Readonly<Record<string, string>>;
}

export type ExaGetApiKeyResponse = {
  "apiKey"?: {
    /**  (format uuid) */
    "id"?: string;
    "name"?: string;
    /** Rate limit in requests per second */
    "rateLimit"?: number | null;
    /** Spending budget for the API key in the team's current billing period, in cents */
    "budgetCents"?: number | null;
    /** Whether the API key is currently over its budget */
    "isOverBudget"?: boolean;
    /**  (format uuid) */
    "teamId"?: string;
    /**  (format date-time) */
    "createdAt"?: string;
  };
};

export type ExaUpdateApiKeyPath = {
  "id": string;
};

export type ExaUpdateApiKeyBody = {
  /** Optional new name for the API key */
  "name"?: string;
  /** Optional new rate limit for the API key (requests per second) */
  "rateLimit"?: number;
  /** Optional new spending budget for the API key in the team's current billing period, in cents. It resets when the next billing period starts. Set to null to remove the budget. (min 0) */
  "budgetCents"?: number | null;
};

export interface ExaUpdateApiKeyInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  path: ExaUpdateApiKeyPath;
  headers?: Readonly<Record<string, string>>;
  body: ExaUpdateApiKeyBody;
}

export type ExaUpdateApiKeyResponse = {
  "apiKey"?: {
    /**  (format uuid) */
    "id"?: string;
    "name"?: string;
    /** Rate limit in requests per second */
    "rateLimit"?: number | null;
    /** Spending budget for the API key in the team's current billing period, in cents */
    "budgetCents"?: number | null;
    /** Whether the API key is currently over its budget */
    "isOverBudget"?: boolean;
    /**  (format uuid) */
    "teamId"?: string;
    /**  (format uuid) */
    "userId"?: string;
    /**  (format date-time) */
    "createdAt"?: string;
    /**  (format date-time) */
    "updatedAt"?: string;
  };
};

export type ExaDeleteApiKeyPath = {
  "id": string;
};

export interface ExaDeleteApiKeyInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  path: ExaDeleteApiKeyPath;
  headers?: Readonly<Record<string, string>>;
}

export type ExaDeleteApiKeyResponse = {
  "success"?: boolean;
};

export type ExaGetApiKeyUsagePath = {
  "id": string;
};

export type ExaGetApiKeyUsageQuery = {
  /**  (format date-time) */
  "start_date"?: string;
  /**  (format date-time) */
  "end_date"?: string;
  "group_by"?: "hour" | "day" | "month";
};

export interface ExaGetApiKeyUsageInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  path: ExaGetApiKeyUsagePath;
  query?: ExaGetApiKeyUsageQuery;
  headers?: Readonly<Record<string, string>>;
}

export type ExaGetApiKeyUsageResponse = {
  /** The unique identifier of the API key. */
  "id"?: string;
  /** The API key ID. (format uuid) */
  "api_key_id"?: string;
  /** The name of the API key */
  "api_key_name"?: string | null;
  /** The team ID this key belongs to (format uuid) */
  "team_id"?: string;
  "period"?: {
    /** Start of the usage period (format date-time) */
    "start"?: string;
    /** End of the usage period (format date-time) */
    "end"?: string;
  };
  /** Total cost in USD for the period */
  "total_cost_usd"?: number;
  /** Breakdown of costs by price type */
  "cost_breakdown"?: Array<{
    /** Unique identifier for the price */
    "price_id"?: string;
    /** Name of the price (e.g., "Neural Search", "Content Retrieval") */
    "price_name"?: string;
    /** Total quantity consumed */
    "quantity"?: number;
    /** Cost in USD for this price type */
    "amount_usd"?: number;
  }>;
  "metadata"?: {
    /** When this report was generated (format date-time) */
    "generated_at"?: string;
  };
};

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

export const exaOperations = Object.freeze({
  search: Object.freeze({"id": "search", "method": "POST", "path": "/search", "retryable": false}),
  searchStream: Object.freeze({"id": "searchStream", "method": "POST", "path": "/search", "retryable": false, "response": "sse", "headers": Object.freeze({"Accept": "text/event-stream"}) }),
  getContents: Object.freeze({"id": "getContents", "method": "POST", "path": "/contents", "retryable": false}),
  answer: Object.freeze({"id": "answer", "method": "POST", "path": "/answer", "retryable": false}),
  answerStream: Object.freeze({"id": "answerStream", "method": "POST", "path": "/answer", "retryable": false, "response": "sse", "headers": Object.freeze({"Accept": "text/event-stream"}) }),
  findSimilar: Object.freeze({"id": "findSimilar", "method": "POST", "path": "/findSimilar", "retryable": false}),
  createMonitor: Object.freeze({"id": "createMonitor", "method": "POST", "path": "/monitors", "retryable": false}),
  listMonitors: Object.freeze({"id": "listMonitors", "method": "GET", "path": "/monitors", "retryable": true}),
  batchMonitors: Object.freeze({"id": "batchMonitors", "method": "POST", "path": "/monitors/batch", "retryable": false}),
  getMonitor: Object.freeze({"id": "getMonitor", "method": "GET", "path": "/monitors/{id}", "retryable": true}),
  updateMonitor: Object.freeze({"id": "updateMonitor", "method": "PATCH", "path": "/monitors/{id}", "retryable": false}),
  deleteMonitor: Object.freeze({"id": "deleteMonitor", "method": "DELETE", "path": "/monitors/{id}", "retryable": false}),
  triggerMonitor: Object.freeze({"id": "triggerMonitor", "method": "POST", "path": "/monitors/{id}/trigger", "retryable": false}),
  listMonitorRuns: Object.freeze({"id": "listMonitorRuns", "method": "GET", "path": "/monitors/{id}/runs", "retryable": true}),
  getMonitorRun: Object.freeze({"id": "getMonitorRun", "method": "GET", "path": "/monitors/{id}/runs/{runId}", "retryable": true}),
  createAgentRun: Object.freeze({"id": "createAgentRun", "method": "POST", "path": "/agent/runs", "retryable": false}),
  createAgentRunStream: Object.freeze({"id": "createAgentRunStream", "method": "POST", "path": "/agent/runs", "retryable": false, "response": "sse", "headers": Object.freeze({"Accept": "text/event-stream"}) }),
  listAgentRuns: Object.freeze({"id": "listAgentRuns", "method": "GET", "path": "/agent/runs", "retryable": true}),
  getAgentRun: Object.freeze({"id": "getAgentRun", "method": "GET", "path": "/agent/runs/{id}", "retryable": true}),
  deleteAgentRun: Object.freeze({"id": "deleteAgentRun", "method": "DELETE", "path": "/agent/runs/{id}", "retryable": false}),
  cancelAgentRun: Object.freeze({"id": "cancelAgentRun", "method": "POST", "path": "/agent/runs/{id}/cancel", "retryable": false}),
  stopAgentRun: Object.freeze({"id": "stopAgentRun", "method": "POST", "path": "/agent/runs/{id}/stop", "retryable": false}),
  listAgentRunEvents: Object.freeze({"id": "listAgentRunEvents", "method": "GET", "path": "/agent/runs/{id}/events", "retryable": true}),
  listAgentRunEventsStream: Object.freeze({"id": "listAgentRunEventsStream", "method": "GET", "path": "/agent/runs/{id}/events", "retryable": false, "response": "sse", "headers": Object.freeze({"Accept": "text/event-stream"}) }),
  createBatch: Object.freeze({"id": "createBatch", "method": "POST", "path": "/batches", "retryable": false, "headers": Object.freeze({"Exa-Beta": "batches-2026-06-06"}) }),
  listBatches: Object.freeze({"id": "listBatches", "method": "GET", "path": "/batches", "retryable": true, "headers": Object.freeze({"Exa-Beta": "batches-2026-06-06"}) }),
  getBatch: Object.freeze({"id": "getBatch", "method": "GET", "path": "/batches/{id}", "retryable": true, "headers": Object.freeze({"Exa-Beta": "batches-2026-06-06"}) }),
  deleteBatch: Object.freeze({"id": "deleteBatch", "method": "DELETE", "path": "/batches/{id}", "retryable": false, "headers": Object.freeze({"Exa-Beta": "batches-2026-06-06"}) }),
  cancelBatch: Object.freeze({"id": "cancelBatch", "method": "POST", "path": "/batches/{id}/cancel", "retryable": false, "headers": Object.freeze({"Exa-Beta": "batches-2026-06-06"}) }),
  getTeamInfo: Object.freeze({"id": "getTeamInfo", "method": "GET", "path": "/v0/teams/me", "retryable": true}),
  createWebset: Object.freeze({"id": "createWebset", "method": "POST", "path": "/v0/websets", "retryable": false}),
  listWebsets: Object.freeze({"id": "listWebsets", "method": "GET", "path": "/v0/websets", "retryable": true}),
  getWebset: Object.freeze({"id": "getWebset", "method": "GET", "path": "/v0/websets/{id}", "retryable": true}),
  updateWebset: Object.freeze({"id": "updateWebset", "method": "POST", "path": "/v0/websets/{id}", "retryable": false}),
  deleteWebset: Object.freeze({"id": "deleteWebset", "method": "DELETE", "path": "/v0/websets/{id}", "retryable": false}),
  cancelWebset: Object.freeze({"id": "cancelWebset", "method": "POST", "path": "/v0/websets/{id}/cancel", "retryable": false}),
  createWebsetSearch: Object.freeze({"id": "createWebsetSearch", "method": "POST", "path": "/v0/websets/{webset}/searches", "retryable": false}),
  getWebsetSearch: Object.freeze({"id": "getWebsetSearch", "method": "GET", "path": "/v0/websets/{webset}/searches/{id}", "retryable": true}),
  cancelWebsetSearch: Object.freeze({"id": "cancelWebsetSearch", "method": "POST", "path": "/v0/websets/{webset}/searches/{id}/cancel", "retryable": false}),
  createWebsetEnrichment: Object.freeze({"id": "createWebsetEnrichment", "method": "POST", "path": "/v0/websets/{webset}/enrichments", "retryable": false}),
  updateWebsetEnrichment: Object.freeze({"id": "updateWebsetEnrichment", "method": "PATCH", "path": "/v0/websets/{webset}/enrichments/{id}", "retryable": false, "response": "text"}),
  getWebsetEnrichment: Object.freeze({"id": "getWebsetEnrichment", "method": "GET", "path": "/v0/websets/{webset}/enrichments/{id}", "retryable": true}),
  deleteWebsetEnrichment: Object.freeze({"id": "deleteWebsetEnrichment", "method": "DELETE", "path": "/v0/websets/{webset}/enrichments/{id}", "retryable": false}),
  cancelWebsetEnrichment: Object.freeze({"id": "cancelWebsetEnrichment", "method": "POST", "path": "/v0/websets/{webset}/enrichments/{id}/cancel", "retryable": false}),
  getWebsetItem: Object.freeze({"id": "getWebsetItem", "method": "GET", "path": "/v0/websets/{webset}/items/{id}", "retryable": true}),
  deleteWebsetItem: Object.freeze({"id": "deleteWebsetItem", "method": "DELETE", "path": "/v0/websets/{webset}/items/{id}", "retryable": false}),
  listWebsetItems: Object.freeze({"id": "listWebsetItems", "method": "GET", "path": "/v0/websets/{webset}/items", "retryable": true}),
  previewWebset: Object.freeze({"id": "previewWebset", "method": "POST", "path": "/v0/websets/preview", "retryable": false}),
  createWebsetMonitor: Object.freeze({"id": "createWebsetMonitor", "method": "POST", "path": "/v0/monitors", "retryable": false}),
  listWebsetMonitors: Object.freeze({"id": "listWebsetMonitors", "method": "GET", "path": "/v0/monitors", "retryable": true}),
  getWebsetMonitor: Object.freeze({"id": "getWebsetMonitor", "method": "GET", "path": "/v0/monitors/{id}", "retryable": true}),
  updateWebsetMonitor: Object.freeze({"id": "updateWebsetMonitor", "method": "PATCH", "path": "/v0/monitors/{id}", "retryable": false}),
  deleteWebsetMonitor: Object.freeze({"id": "deleteWebsetMonitor", "method": "DELETE", "path": "/v0/monitors/{id}", "retryable": false}),
  listWebsetMonitorRuns: Object.freeze({"id": "listWebsetMonitorRuns", "method": "GET", "path": "/v0/monitors/{monitor}/runs", "retryable": true}),
  getWebsetMonitorRun: Object.freeze({"id": "getWebsetMonitorRun", "method": "GET", "path": "/v0/monitors/{monitor}/runs/{id}", "retryable": true}),
  createImport: Object.freeze({"id": "createImport", "method": "POST", "path": "/v0/imports", "retryable": false}),
  listImports: Object.freeze({"id": "listImports", "method": "GET", "path": "/v0/imports", "retryable": true}),
  getImport: Object.freeze({"id": "getImport", "method": "GET", "path": "/v0/imports/{id}", "retryable": true}),
  updateImport: Object.freeze({"id": "updateImport", "method": "PATCH", "path": "/v0/imports/{id}", "retryable": false}),
  deleteImport: Object.freeze({"id": "deleteImport", "method": "DELETE", "path": "/v0/imports/{id}", "retryable": false}),
  createWebhook: Object.freeze({"id": "createWebhook", "method": "POST", "path": "/v0/webhooks", "retryable": false}),
  listWebhooks: Object.freeze({"id": "listWebhooks", "method": "GET", "path": "/v0/webhooks", "retryable": true}),
  getWebhook: Object.freeze({"id": "getWebhook", "method": "GET", "path": "/v0/webhooks/{id}", "retryable": true}),
  updateWebhook: Object.freeze({"id": "updateWebhook", "method": "PATCH", "path": "/v0/webhooks/{id}", "retryable": false}),
  deleteWebhook: Object.freeze({"id": "deleteWebhook", "method": "DELETE", "path": "/v0/webhooks/{id}", "retryable": false}),
  listWebhookAttempts: Object.freeze({"id": "listWebhookAttempts", "method": "GET", "path": "/v0/webhooks/{id}/attempts", "retryable": true}),
  listEvents: Object.freeze({"id": "listEvents", "method": "GET", "path": "/v0/events", "retryable": true}),
  getEvent: Object.freeze({"id": "getEvent", "method": "GET", "path": "/v0/events/{id}", "retryable": true}),
  createApiKey: Object.freeze({"id": "createApiKey", "method": "POST", "path": "/api-keys", "retryable": false}),
  listApiKeys: Object.freeze({"id": "listApiKeys", "method": "GET", "path": "/api-keys", "retryable": true}),
  getApiKey: Object.freeze({"id": "getApiKey", "method": "GET", "path": "/api-keys/{id}", "retryable": true}),
  updateApiKey: Object.freeze({"id": "updateApiKey", "method": "PUT", "path": "/api-keys/{id}", "retryable": false}),
  deleteApiKey: Object.freeze({"id": "deleteApiKey", "method": "DELETE", "path": "/api-keys/{id}", "retryable": false}),
  getApiKeyUsage: Object.freeze({"id": "getApiKeyUsage", "method": "GET", "path": "/api-keys/{id}/usage", "retryable": true}),
} satisfies Readonly<Record<string, NativeOperation>>);

/** Explicit native calls; no auto-pagination, polling, or stream reconnection. */
export function createExaClient(options: ExaClientOptions) {
  const { apiKey, teamApiKey, ...config } = options;
  const key = credential(apiKey);
  const transport0 = createNativeTransport({ ...config, provider: "exa", baseUrl: "https://api.exa.ai", headers: { "x-api-key": key } });
  const transport1 = createNativeTransport({ ...config, provider: "exa", baseUrl: "https://api.exa.ai/websets", headers: { "x-api-key": key } });
  let transport2Instance: ReturnType<typeof createNativeTransport> | undefined;
  const transport2 = () => transport2Instance ??= createNativeTransport({ ...config, provider: "exa", baseUrl: "https://admin-api.exa.ai/team-management", headers: { "x-api-key": credential(teamApiKey as string) } });
  return Object.freeze({
    operations: exaOperations,
    /** POST https://api.exa.ai/search — Search. */
    async search(input: ExaSearchInput): Promise<NativeResponse<ExaSearchResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      if (input.body !== undefined && (!input.body || typeof input.body !== "object" || Array.isArray(input.body))) throw new SearchError("invalid_request");
      if (input.body?.stream !== undefined && input.body.stream !== false) throw new SearchError("unsupported_option");
      return transport0.request<ExaSearchResponse>(exaOperations.search, { ...input, body: { ...input.body, stream: false } });
    },
    /** POST https://api.exa.ai/search — Search. */
    async searchStream(input: ExaSearchStreamInput): Promise<NativeResponse<AsyncIterable<NativeSSEEvent>>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      if (input.body !== undefined && (!input.body || typeof input.body !== "object" || Array.isArray(input.body))) throw new SearchError("invalid_request");
      if (!input.body.outputSchema) throw new SearchError("invalid_request");
      if (input.body?.stream !== undefined && input.body.stream !== true) throw new SearchError("unsupported_option");
      return transport0.request(exaOperations.searchStream, { ...input, body: { ...input.body, stream: true }, headers: { ...input.headers, Accept: "text/event-stream" } });
    },
    /** POST https://api.exa.ai/contents — Contents. */
    async getContents(input: ExaGetContentsInput): Promise<NativeResponse<ExaGetContentsResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      if (input.body !== undefined && (!input.body || typeof input.body !== "object" || Array.isArray(input.body))) throw new SearchError("invalid_request");
      return transport0.request<ExaGetContentsResponse>(exaOperations.getContents, { ...input });
    },
    /** POST https://api.exa.ai/answer — Answer. */
    async answer(input: ExaAnswerInput): Promise<NativeResponse<ExaAnswerResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      if (input.body !== undefined && (!input.body || typeof input.body !== "object" || Array.isArray(input.body))) throw new SearchError("invalid_request");
      if (input.body?.stream !== undefined && input.body.stream !== false) throw new SearchError("unsupported_option");
      return transport0.request<ExaAnswerResponse>(exaOperations.answer, { ...input, body: { ...input.body, stream: false } });
    },
    /** POST https://api.exa.ai/answer — Answer. */
    async answerStream(input: ExaAnswerStreamInput): Promise<NativeResponse<AsyncIterable<NativeSSEEvent>>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      if (input.body !== undefined && (!input.body || typeof input.body !== "object" || Array.isArray(input.body))) throw new SearchError("invalid_request");
      if (input.body?.stream !== undefined && input.body.stream !== true) throw new SearchError("unsupported_option");
      return transport0.request(exaOperations.answerStream, { ...input, body: { ...input.body, stream: true }, headers: { ...input.headers, Accept: "text/event-stream" } });
    },
    /** POST https://api.exa.ai/findSimilar — Find similar links. */
    async findSimilar(input: ExaFindSimilarInput): Promise<NativeResponse<ExaFindSimilarResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      if (input.body !== undefined && (!input.body || typeof input.body !== "object" || Array.isArray(input.body))) throw new SearchError("invalid_request");
      return transport0.request<ExaFindSimilarResponse>(exaOperations.findSimilar, { ...input });
    },
    /** POST https://api.exa.ai/monitors — Create a monitor. */
    async createMonitor(input: ExaCreateMonitorInput): Promise<NativeResponse<ExaCreateMonitorResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      if (input.body !== undefined && (!input.body || typeof input.body !== "object" || Array.isArray(input.body))) throw new SearchError("invalid_request");
      return transport0.request<ExaCreateMonitorResponse>(exaOperations.createMonitor, { ...input });
    },
    /** GET https://api.exa.ai/monitors — List monitors. */
    async listMonitors(input: ExaListMonitorsInput = {}): Promise<NativeResponse<ExaListMonitorsResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.query !== undefined && (!input.query || typeof input.query !== "object" || Array.isArray(input.query))) throw new SearchError("invalid_request");
      return transport0.request<ExaListMonitorsResponse>(exaOperations.listMonitors, { ...input, query: wireQuery(input.query, []) ?? {} });
    },
    /** POST https://api.exa.ai/monitors/batch — Batch action on monitors. */
    async batchMonitors(input: ExaBatchMonitorsInput): Promise<NativeResponse<ExaBatchMonitorsResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      if (input.body !== undefined && (!input.body || typeof input.body !== "object" || Array.isArray(input.body))) throw new SearchError("invalid_request");
      return transport0.request<ExaBatchMonitorsResponse>(exaOperations.batchMonitors, { ...input });
    },
    /** GET https://api.exa.ai/monitors/{id} — Get a monitor. */
    async getMonitor(input: ExaGetMonitorInput): Promise<NativeResponse<ExaGetMonitorResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport0.request<ExaGetMonitorResponse>(exaOperations.getMonitor, { ...input });
    },
    /** PATCH https://api.exa.ai/monitors/{id} — Update a monitor. */
    async updateMonitor(input: ExaUpdateMonitorInput): Promise<NativeResponse<ExaUpdateMonitorResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      if (input.body !== undefined && (!input.body || typeof input.body !== "object" || Array.isArray(input.body))) throw new SearchError("invalid_request");
      return transport0.request<ExaUpdateMonitorResponse>(exaOperations.updateMonitor, { ...input });
    },
    /** DELETE https://api.exa.ai/monitors/{id} — Delete a monitor. */
    async deleteMonitor(input: ExaDeleteMonitorInput): Promise<NativeResponse<ExaDeleteMonitorResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport0.request<ExaDeleteMonitorResponse>(exaOperations.deleteMonitor, { ...input });
    },
    /** POST https://api.exa.ai/monitors/{id}/trigger — Trigger a monitor. */
    async triggerMonitor(input: ExaTriggerMonitorInput): Promise<NativeResponse<ExaTriggerMonitorResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport0.request<ExaTriggerMonitorResponse>(exaOperations.triggerMonitor, { ...input });
    },
    /** GET https://api.exa.ai/monitors/{id}/runs — List runs. */
    async listMonitorRuns(input: ExaListMonitorRunsInput): Promise<NativeResponse<ExaListMonitorRunsResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.query !== undefined && (!input.query || typeof input.query !== "object" || Array.isArray(input.query))) throw new SearchError("invalid_request");
      return transport0.request<ExaListMonitorRunsResponse>(exaOperations.listMonitorRuns, { ...input, query: wireQuery(input.query, []) ?? {} });
    },
    /** GET https://api.exa.ai/monitors/{id}/runs/{runId} — Get a run. */
    async getMonitorRun(input: ExaGetMonitorRunInput): Promise<NativeResponse<ExaGetMonitorRunResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport0.request<ExaGetMonitorRunResponse>(exaOperations.getMonitorRun, { ...input });
    },
    /** POST https://api.exa.ai/agent/runs — Create a run. */
    async createAgentRun(input: ExaCreateAgentRunInput): Promise<NativeResponse<ExaCreateAgentRunResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      if (input.body !== undefined && (!input.body || typeof input.body !== "object" || Array.isArray(input.body))) throw new SearchError("invalid_request");
      return transport0.request<ExaCreateAgentRunResponse>(exaOperations.createAgentRun, { ...input });
    },
    /** POST https://api.exa.ai/agent/runs — Create a run. */
    async createAgentRunStream(input: ExaCreateAgentRunStreamInput): Promise<NativeResponse<AsyncIterable<NativeSSEEvent>>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      if (input.body !== undefined && (!input.body || typeof input.body !== "object" || Array.isArray(input.body))) throw new SearchError("invalid_request");
      return transport0.request(exaOperations.createAgentRunStream, { ...input, headers: { ...input.headers, Accept: "text/event-stream" } });
    },
    /** GET https://api.exa.ai/agent/runs — List runs. */
    async listAgentRuns(input: ExaListAgentRunsInput = {}): Promise<NativeResponse<ExaListAgentRunsResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.query !== undefined && (!input.query || typeof input.query !== "object" || Array.isArray(input.query))) throw new SearchError("invalid_request");
      return transport0.request<ExaListAgentRunsResponse>(exaOperations.listAgentRuns, { ...input, query: wireQuery(input.query, []) ?? {} });
    },
    /** GET https://api.exa.ai/agent/runs/{id} — Get a run. */
    async getAgentRun(input: ExaGetAgentRunInput): Promise<NativeResponse<ExaGetAgentRunResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport0.request<ExaGetAgentRunResponse>(exaOperations.getAgentRun, { ...input });
    },
    /** DELETE https://api.exa.ai/agent/runs/{id} — Delete a run. */
    async deleteAgentRun(input: ExaDeleteAgentRunInput): Promise<NativeResponse<ExaDeleteAgentRunResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport0.request<ExaDeleteAgentRunResponse>(exaOperations.deleteAgentRun, { ...input });
    },
    /** POST https://api.exa.ai/agent/runs/{id}/cancel — Cancel a run. */
    async cancelAgentRun(input: ExaCancelAgentRunInput): Promise<NativeResponse<ExaCancelAgentRunResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport0.request<ExaCancelAgentRunResponse>(exaOperations.cancelAgentRun, { ...input });
    },
    /** POST https://api.exa.ai/agent/runs/{id}/stop — Stop a run. */
    async stopAgentRun(input: ExaStopAgentRunInput): Promise<NativeResponse<ExaStopAgentRunResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport0.request<ExaStopAgentRunResponse>(exaOperations.stopAgentRun, { ...input });
    },
    /** GET https://api.exa.ai/agent/runs/{id}/events — List run events. */
    async listAgentRunEvents(input: ExaListAgentRunEventsInput): Promise<NativeResponse<ExaListAgentRunEventsResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.query !== undefined && (!input.query || typeof input.query !== "object" || Array.isArray(input.query))) throw new SearchError("invalid_request");
      return transport0.request<ExaListAgentRunEventsResponse>(exaOperations.listAgentRunEvents, { ...input, query: wireQuery(input.query, []) ?? {} });
    },
    /** GET https://api.exa.ai/agent/runs/{id}/events — List run events. */
    async listAgentRunEventsStream(input: ExaListAgentRunEventsStreamInput): Promise<NativeResponse<AsyncIterable<NativeSSEEvent>>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.query !== undefined && (!input.query || typeof input.query !== "object" || Array.isArray(input.query))) throw new SearchError("invalid_request");
      return transport0.request(exaOperations.listAgentRunEventsStream, { ...input, query: wireQuery(input.query, []) ?? {}, headers: { ...input.headers, Accept: "text/event-stream" } });
    },
    /** POST https://api.exa.ai/batches — Create a batch. */
    async createBatch(input: ExaCreateBatchInput): Promise<NativeResponse<ExaCreateBatchResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      if (input.body !== undefined && (!input.body || typeof input.body !== "object" || Array.isArray(input.body))) throw new SearchError("invalid_request");
      return transport0.request<ExaCreateBatchResponse>(exaOperations.createBatch, { ...input });
    },
    /** GET https://api.exa.ai/batches — List batches. */
    async listBatches(input: ExaListBatchesInput = {}): Promise<NativeResponse<ExaListBatchesResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.query !== undefined && (!input.query || typeof input.query !== "object" || Array.isArray(input.query))) throw new SearchError("invalid_request");
      return transport0.request<ExaListBatchesResponse>(exaOperations.listBatches, { ...input, query: wireQuery(input.query, []) ?? {} });
    },
    /** GET https://api.exa.ai/batches/{id} — Get a batch. */
    async getBatch(input: ExaGetBatchInput): Promise<NativeResponse<ExaGetBatchResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport0.request<ExaGetBatchResponse>(exaOperations.getBatch, { ...input });
    },
    /** DELETE https://api.exa.ai/batches/{id} — Delete a batch. */
    async deleteBatch(input: ExaDeleteBatchInput): Promise<NativeResponse<ExaDeleteBatchResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport0.request<ExaDeleteBatchResponse>(exaOperations.deleteBatch, { ...input });
    },
    /** POST https://api.exa.ai/batches/{id}/cancel — Cancel a batch. */
    async cancelBatch(input: ExaCancelBatchInput): Promise<NativeResponse<ExaCancelBatchResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport0.request<ExaCancelBatchResponse>(exaOperations.cancelBatch, { ...input });
    },
    /** GET https://api.exa.ai/v0/teams/me — Get team info. */
    async getTeamInfo(input: ExaGetTeamInfoInput = {}): Promise<NativeResponse<ExaGetTeamInfoResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport0.request<ExaGetTeamInfoResponse>(exaOperations.getTeamInfo, { ...input });
    },
    /** POST https://api.exa.ai/websets/v0/websets — Create a Webset. */
    async createWebset(input: ExaCreateWebsetInput): Promise<NativeResponse<ExaCreateWebsetResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      if (input.body !== undefined && (!input.body || typeof input.body !== "object" || Array.isArray(input.body))) throw new SearchError("invalid_request");
      return transport1.request<ExaCreateWebsetResponse>(exaOperations.createWebset, { ...input });
    },
    /** GET https://api.exa.ai/websets/v0/websets — List all Websets. */
    async listWebsets(input: ExaListWebsetsInput = {}): Promise<NativeResponse<ExaListWebsetsResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.query !== undefined && (!input.query || typeof input.query !== "object" || Array.isArray(input.query))) throw new SearchError("invalid_request");
      return transport1.request<ExaListWebsetsResponse>(exaOperations.listWebsets, { ...input, query: wireQuery(input.query, []) ?? {} });
    },
    /** GET https://api.exa.ai/websets/v0/websets/{id} — Get a Webset. */
    async getWebset(input: ExaGetWebsetInput): Promise<NativeResponse<ExaGetWebsetResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.query !== undefined && (!input.query || typeof input.query !== "object" || Array.isArray(input.query))) throw new SearchError("invalid_request");
      return transport1.request<ExaGetWebsetResponse>(exaOperations.getWebset, { ...input, query: wireQuery(input.query, []) ?? {} });
    },
    /** POST https://api.exa.ai/websets/v0/websets/{id} — Update a Webset. */
    async updateWebset(input: ExaUpdateWebsetInput): Promise<NativeResponse<ExaUpdateWebsetResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      if (input.body !== undefined && (!input.body || typeof input.body !== "object" || Array.isArray(input.body))) throw new SearchError("invalid_request");
      return transport1.request<ExaUpdateWebsetResponse>(exaOperations.updateWebset, { ...input });
    },
    /** DELETE https://api.exa.ai/websets/v0/websets/{id} — Delete a Webset. */
    async deleteWebset(input: ExaDeleteWebsetInput): Promise<NativeResponse<ExaDeleteWebsetResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport1.request<ExaDeleteWebsetResponse>(exaOperations.deleteWebset, { ...input });
    },
    /** POST https://api.exa.ai/websets/v0/websets/{id}/cancel — Cancel a running Webset. */
    async cancelWebset(input: ExaCancelWebsetInput): Promise<NativeResponse<ExaCancelWebsetResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport1.request<ExaCancelWebsetResponse>(exaOperations.cancelWebset, { ...input });
    },
    /** POST https://api.exa.ai/websets/v0/websets/{webset}/searches — Create a Search. */
    async createWebsetSearch(input: ExaCreateWebsetSearchInput): Promise<NativeResponse<ExaCreateWebsetSearchResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      if (input.body !== undefined && (!input.body || typeof input.body !== "object" || Array.isArray(input.body))) throw new SearchError("invalid_request");
      return transport1.request<ExaCreateWebsetSearchResponse>(exaOperations.createWebsetSearch, { ...input });
    },
    /** GET https://api.exa.ai/websets/v0/websets/{webset}/searches/{id} — Get a Search. */
    async getWebsetSearch(input: ExaGetWebsetSearchInput): Promise<NativeResponse<ExaGetWebsetSearchResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport1.request<ExaGetWebsetSearchResponse>(exaOperations.getWebsetSearch, { ...input });
    },
    /** POST https://api.exa.ai/websets/v0/websets/{webset}/searches/{id}/cancel — Cancel a running Search. */
    async cancelWebsetSearch(input: ExaCancelWebsetSearchInput): Promise<NativeResponse<ExaCancelWebsetSearchResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport1.request<ExaCancelWebsetSearchResponse>(exaOperations.cancelWebsetSearch, { ...input });
    },
    /** POST https://api.exa.ai/websets/v0/websets/{webset}/enrichments — Create an Enrichment. */
    async createWebsetEnrichment(input: ExaCreateWebsetEnrichmentInput): Promise<NativeResponse<ExaCreateWebsetEnrichmentResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      if (input.body !== undefined && (!input.body || typeof input.body !== "object" || Array.isArray(input.body))) throw new SearchError("invalid_request");
      return transport1.request<ExaCreateWebsetEnrichmentResponse>(exaOperations.createWebsetEnrichment, { ...input });
    },
    /** PATCH https://api.exa.ai/websets/v0/websets/{webset}/enrichments/{id} — Update an Enrichment. */
    async updateWebsetEnrichment(input: ExaUpdateWebsetEnrichmentInput): Promise<NativeResponse<null>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      if (input.body !== undefined && (!input.body || typeof input.body !== "object" || Array.isArray(input.body))) throw new SearchError("invalid_request");
      return transport1.request<string>(exaOperations.updateWebsetEnrichment, { ...input }).then(emptyResult);
    },
    /** GET https://api.exa.ai/websets/v0/websets/{webset}/enrichments/{id} — Get an Enrichment. */
    async getWebsetEnrichment(input: ExaGetWebsetEnrichmentInput): Promise<NativeResponse<ExaGetWebsetEnrichmentResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport1.request<ExaGetWebsetEnrichmentResponse>(exaOperations.getWebsetEnrichment, { ...input });
    },
    /** DELETE https://api.exa.ai/websets/v0/websets/{webset}/enrichments/{id} — Delete an Enrichment. */
    async deleteWebsetEnrichment(input: ExaDeleteWebsetEnrichmentInput): Promise<NativeResponse<ExaDeleteWebsetEnrichmentResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport1.request<ExaDeleteWebsetEnrichmentResponse>(exaOperations.deleteWebsetEnrichment, { ...input });
    },
    /** POST https://api.exa.ai/websets/v0/websets/{webset}/enrichments/{id}/cancel — Cancel a running Enrichment. */
    async cancelWebsetEnrichment(input: ExaCancelWebsetEnrichmentInput): Promise<NativeResponse<ExaCancelWebsetEnrichmentResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport1.request<ExaCancelWebsetEnrichmentResponse>(exaOperations.cancelWebsetEnrichment, { ...input });
    },
    /** GET https://api.exa.ai/websets/v0/websets/{webset}/items/{id} — Get an Item. */
    async getWebsetItem(input: ExaGetWebsetItemInput): Promise<NativeResponse<ExaGetWebsetItemResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport1.request<ExaGetWebsetItemResponse>(exaOperations.getWebsetItem, { ...input });
    },
    /** DELETE https://api.exa.ai/websets/v0/websets/{webset}/items/{id} — Delete an Item. */
    async deleteWebsetItem(input: ExaDeleteWebsetItemInput): Promise<NativeResponse<ExaDeleteWebsetItemResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport1.request<ExaDeleteWebsetItemResponse>(exaOperations.deleteWebsetItem, { ...input });
    },
    /** GET https://api.exa.ai/websets/v0/websets/{webset}/items — List all Items for a Webset. */
    async listWebsetItems(input: ExaListWebsetItemsInput): Promise<NativeResponse<ExaListWebsetItemsResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.query !== undefined && (!input.query || typeof input.query !== "object" || Array.isArray(input.query))) throw new SearchError("invalid_request");
      return transport1.request<ExaListWebsetItemsResponse>(exaOperations.listWebsetItems, { ...input, query: wireQuery(input.query, []) ?? {} });
    },
    /** POST https://api.exa.ai/websets/v0/websets/preview — Preview a webset. */
    async previewWebset(input: ExaPreviewWebsetInput): Promise<NativeResponse<ExaPreviewWebsetResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      if (input.body !== undefined && (!input.body || typeof input.body !== "object" || Array.isArray(input.body))) throw new SearchError("invalid_request");
      if (input.query !== undefined && (!input.query || typeof input.query !== "object" || Array.isArray(input.query))) throw new SearchError("invalid_request");
      return transport1.request<ExaPreviewWebsetResponse>(exaOperations.previewWebset, { ...input, query: wireQuery(input.query, []) ?? {} });
    },
    /** POST https://api.exa.ai/websets/v0/monitors — Create a Monitor. */
    async createWebsetMonitor(input: ExaCreateWebsetMonitorInput): Promise<NativeResponse<ExaCreateWebsetMonitorResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      if (input.body !== undefined && (!input.body || typeof input.body !== "object" || Array.isArray(input.body))) throw new SearchError("invalid_request");
      return transport1.request<ExaCreateWebsetMonitorResponse>(exaOperations.createWebsetMonitor, { ...input });
    },
    /** GET https://api.exa.ai/websets/v0/monitors — List Monitors. */
    async listWebsetMonitors(input: ExaListWebsetMonitorsInput = {}): Promise<NativeResponse<ExaListWebsetMonitorsResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.query !== undefined && (!input.query || typeof input.query !== "object" || Array.isArray(input.query))) throw new SearchError("invalid_request");
      return transport1.request<ExaListWebsetMonitorsResponse>(exaOperations.listWebsetMonitors, { ...input, query: wireQuery(input.query, []) ?? {} });
    },
    /** GET https://api.exa.ai/websets/v0/monitors/{id} — Get Monitor. */
    async getWebsetMonitor(input: ExaGetWebsetMonitorInput): Promise<NativeResponse<ExaGetWebsetMonitorResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport1.request<ExaGetWebsetMonitorResponse>(exaOperations.getWebsetMonitor, { ...input });
    },
    /** PATCH https://api.exa.ai/websets/v0/monitors/{id} — Update Monitor. */
    async updateWebsetMonitor(input: ExaUpdateWebsetMonitorInput): Promise<NativeResponse<ExaUpdateWebsetMonitorResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      if (input.body !== undefined && (!input.body || typeof input.body !== "object" || Array.isArray(input.body))) throw new SearchError("invalid_request");
      return transport1.request<ExaUpdateWebsetMonitorResponse>(exaOperations.updateWebsetMonitor, { ...input });
    },
    /** DELETE https://api.exa.ai/websets/v0/monitors/{id} — Delete Monitor. */
    async deleteWebsetMonitor(input: ExaDeleteWebsetMonitorInput): Promise<NativeResponse<ExaDeleteWebsetMonitorResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport1.request<ExaDeleteWebsetMonitorResponse>(exaOperations.deleteWebsetMonitor, { ...input });
    },
    /** GET https://api.exa.ai/websets/v0/monitors/{monitor}/runs — List Monitor Runs. */
    async listWebsetMonitorRuns(input: ExaListWebsetMonitorRunsInput): Promise<NativeResponse<ExaListWebsetMonitorRunsResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport1.request<ExaListWebsetMonitorRunsResponse>(exaOperations.listWebsetMonitorRuns, { ...input });
    },
    /** GET https://api.exa.ai/websets/v0/monitors/{monitor}/runs/{id} — Get Monitor Run. */
    async getWebsetMonitorRun(input: ExaGetWebsetMonitorRunInput): Promise<NativeResponse<ExaGetWebsetMonitorRunResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport1.request<ExaGetWebsetMonitorRunResponse>(exaOperations.getWebsetMonitorRun, { ...input });
    },
    /** POST https://api.exa.ai/websets/v0/imports — Create an Import. */
    async createImport(input: ExaCreateImportInput): Promise<NativeResponse<ExaCreateImportResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      if (input.body !== undefined && (!input.body || typeof input.body !== "object" || Array.isArray(input.body))) throw new SearchError("invalid_request");
      return transport1.request<ExaCreateImportResponse>(exaOperations.createImport, { ...input });
    },
    /** GET https://api.exa.ai/websets/v0/imports — List Imports. */
    async listImports(input: ExaListImportsInput = {}): Promise<NativeResponse<ExaListImportsResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.query !== undefined && (!input.query || typeof input.query !== "object" || Array.isArray(input.query))) throw new SearchError("invalid_request");
      return transport1.request<ExaListImportsResponse>(exaOperations.listImports, { ...input, query: wireQuery(input.query, []) ?? {} });
    },
    /** GET https://api.exa.ai/websets/v0/imports/{id} — Get Import. */
    async getImport(input: ExaGetImportInput): Promise<NativeResponse<ExaGetImportResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport1.request<ExaGetImportResponse>(exaOperations.getImport, { ...input });
    },
    /** PATCH https://api.exa.ai/websets/v0/imports/{id} — Update Import. */
    async updateImport(input: ExaUpdateImportInput): Promise<NativeResponse<ExaUpdateImportResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      if (input.body !== undefined && (!input.body || typeof input.body !== "object" || Array.isArray(input.body))) throw new SearchError("invalid_request");
      return transport1.request<ExaUpdateImportResponse>(exaOperations.updateImport, { ...input });
    },
    /** DELETE https://api.exa.ai/websets/v0/imports/{id} — Delete Import. */
    async deleteImport(input: ExaDeleteImportInput): Promise<NativeResponse<ExaDeleteImportResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport1.request<ExaDeleteImportResponse>(exaOperations.deleteImport, { ...input });
    },
    /** POST https://api.exa.ai/websets/v0/webhooks — Create a Webhook. */
    async createWebhook(input: ExaCreateWebhookInput): Promise<NativeResponse<ExaCreateWebhookResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      if (input.body !== undefined && (!input.body || typeof input.body !== "object" || Array.isArray(input.body))) throw new SearchError("invalid_request");
      return transport1.request<ExaCreateWebhookResponse>(exaOperations.createWebhook, { ...input });
    },
    /** GET https://api.exa.ai/websets/v0/webhooks — List webhooks. */
    async listWebhooks(input: ExaListWebhooksInput = {}): Promise<NativeResponse<ExaListWebhooksResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.query !== undefined && (!input.query || typeof input.query !== "object" || Array.isArray(input.query))) throw new SearchError("invalid_request");
      return transport1.request<ExaListWebhooksResponse>(exaOperations.listWebhooks, { ...input, query: wireQuery(input.query, []) ?? {} });
    },
    /** GET https://api.exa.ai/websets/v0/webhooks/{id} — Get a Webhook. */
    async getWebhook(input: ExaGetWebhookInput): Promise<NativeResponse<ExaGetWebhookResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport1.request<ExaGetWebhookResponse>(exaOperations.getWebhook, { ...input });
    },
    /** PATCH https://api.exa.ai/websets/v0/webhooks/{id} — Update a Webhook. */
    async updateWebhook(input: ExaUpdateWebhookInput): Promise<NativeResponse<ExaUpdateWebhookResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      if (input.body !== undefined && (!input.body || typeof input.body !== "object" || Array.isArray(input.body))) throw new SearchError("invalid_request");
      return transport1.request<ExaUpdateWebhookResponse>(exaOperations.updateWebhook, { ...input });
    },
    /** DELETE https://api.exa.ai/websets/v0/webhooks/{id} — Delete a Webhook. */
    async deleteWebhook(input: ExaDeleteWebhookInput): Promise<NativeResponse<ExaDeleteWebhookResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport1.request<ExaDeleteWebhookResponse>(exaOperations.deleteWebhook, { ...input });
    },
    /** GET https://api.exa.ai/websets/v0/webhooks/{id}/attempts — List webhook attempts. */
    async listWebhookAttempts(input: ExaListWebhookAttemptsInput): Promise<NativeResponse<ExaListWebhookAttemptsResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.query !== undefined && (!input.query || typeof input.query !== "object" || Array.isArray(input.query))) throw new SearchError("invalid_request");
      return transport1.request<ExaListWebhookAttemptsResponse>(exaOperations.listWebhookAttempts, { ...input, query: wireQuery(input.query, []) ?? {} });
    },
    /** GET https://api.exa.ai/websets/v0/events — List all Events. */
    async listEvents(input: ExaListEventsInput = {}): Promise<NativeResponse<ExaListEventsResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.query !== undefined && (!input.query || typeof input.query !== "object" || Array.isArray(input.query))) throw new SearchError("invalid_request");
      return transport1.request<ExaListEventsResponse>(exaOperations.listEvents, { ...input, query: wireQuery(input.query, []) ?? {} });
    },
    /** GET https://api.exa.ai/websets/v0/events/{id} — Get an Event. */
    async getEvent(input: ExaGetEventInput): Promise<NativeResponse<ExaGetEventResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport1.request<ExaGetEventResponse>(exaOperations.getEvent, { ...input });
    },
    /** POST https://admin-api.exa.ai/team-management/api-keys — Create API key. */
    async createApiKey(input: ExaCreateApiKeyInput): Promise<NativeResponse<ExaCreateApiKeyResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      if (input.body !== undefined && (!input.body || typeof input.body !== "object" || Array.isArray(input.body))) throw new SearchError("invalid_request");
      return transport2().request<ExaCreateApiKeyResponse>(exaOperations.createApiKey, { ...input });
    },
    /** GET https://admin-api.exa.ai/team-management/api-keys — List API keys. */
    async listApiKeys(input: ExaListApiKeysInput = {}): Promise<NativeResponse<ExaListApiKeysResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.query !== undefined && (!input.query || typeof input.query !== "object" || Array.isArray(input.query))) throw new SearchError("invalid_request");
      return transport2().request<ExaListApiKeysResponse>(exaOperations.listApiKeys, { ...input, query: wireQuery(input.query, []) ?? {} });
    },
    /** GET https://admin-api.exa.ai/team-management/api-keys/{id} — Get API key. */
    async getApiKey(input: ExaGetApiKeyInput): Promise<NativeResponse<ExaGetApiKeyResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport2().request<ExaGetApiKeyResponse>(exaOperations.getApiKey, { ...input });
    },
    /** PUT https://admin-api.exa.ai/team-management/api-keys/{id} — Update API key. */
    async updateApiKey(input: ExaUpdateApiKeyInput): Promise<NativeResponse<ExaUpdateApiKeyResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      if (input.body !== undefined && (!input.body || typeof input.body !== "object" || Array.isArray(input.body))) throw new SearchError("invalid_request");
      return transport2().request<ExaUpdateApiKeyResponse>(exaOperations.updateApiKey, { ...input });
    },
    /** DELETE https://admin-api.exa.ai/team-management/api-keys/{id} — Delete API key. */
    async deleteApiKey(input: ExaDeleteApiKeyInput): Promise<NativeResponse<ExaDeleteApiKeyResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport2().request<ExaDeleteApiKeyResponse>(exaOperations.deleteApiKey, { ...input });
    },
    /** GET https://admin-api.exa.ai/team-management/api-keys/{id}/usage — Get API key usage. */
    async getApiKeyUsage(input: ExaGetApiKeyUsageInput): Promise<NativeResponse<ExaGetApiKeyUsageResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.query !== undefined && (!input.query || typeof input.query !== "object" || Array.isArray(input.query))) throw new SearchError("invalid_request");
      return transport2().request<ExaGetApiKeyUsageResponse>(exaOperations.getApiKeyUsage, { ...input, query: wireQuery(input.query, []) ?? {} });
    },
  });
}

export type ExaClient = ReturnType<typeof createExaClient>;
