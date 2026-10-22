/** Official public contracts reviewed 2026-10-22. See docs/provider-surfaces-b.md. */
import { createNativeTransport } from "./native-transport.js";
import type { NativeOperation, NativeRequestInput, NativeTransportConfig, NativeSSEEvent } from "./native-transport.js";
import { adapterOptions } from "./http.js";
import { exactFields } from "./validation.js";
import { SearchError } from "./errors.js";
export type PerplexityClientOptions = Omit<NativeTransportConfig, "provider" | "baseUrl" | "headers"> & { apiKey: string };
export namespace PerplexitySchemas {
  export type CoreApiChatCompletionsRequest = {
    "max_tokens"?: (number | null);
    "model": "sonar" | "sonar-pro" | "sonar-deep-research" | "sonar-reasoning-pro";
    "stream"?: (boolean | null);
    "stop"?: (string | ReadonlyArray<string> | null);
    "temperature"?: (number | null);
    "top_p"?: (number | null);
    "response_format"?: (CoreResponseFormatText | CoreResponseFormatJSONSchema | null);
    "messages": ReadonlyArray<CoreChatMessage_Input>;
    "web_search_options"?: CoreWebSearchOptions;
    "search_mode"?: ("web" | "academic" | "sec" | null);
    "return_images"?: (boolean | null);
    "return_related_questions"?: (boolean | null);
    "enable_search_classifier"?: (boolean | null);
    "disable_search"?: (boolean | null);
    "search_domain_filter"?: (ReadonlyArray<string> | null);
    "search_language_filter"?: (ReadonlyArray<string> | null);
    "search_recency_filter"?: ("hour" | "day" | "week" | "month" | "year" | null);
    "search_after_date_filter"?: (string | null);
    "search_before_date_filter"?: (string | null);
    "last_updated_before_filter"?: (string | null);
    "last_updated_after_filter"?: (string | null);
    "image_format_filter"?: (ReadonlyArray<string> | null);
    "image_domain_filter"?: (ReadonlyArray<string> | null);
    "stream_mode"?: "full" | "concise";
    "reasoning_effort"?: ("minimal" | "low" | "medium" | "high" | null);
    "language_preference"?: (string | null);
    [key: string]: unknown;
  };
  export type CoreApiPublicSearchResult = {
    "title": string;
    "url": string;
    "date"?: (string | null);
    "last_updated"?: (string | null);
    "snippet"?: string;
    "source"?: "web" | "attachment";
    [key: string]: unknown;
  };
  export type CoreImageResult = {
    "image_url": string;
    "origin_url": string;
    "height": number;
    "width": number;
    "title"?: string;
    [key: string]: unknown;
  };
  export type CoreApiSearchPage = {
    "title": string;
    "url": string;
    "snippet": string;
    "date"?: (string | null);
    "last_updated"?: (string | null);
    [key: string]: unknown;
  };
  export type CoreApiSearchRequest = ({
    "country"?: string;
    "max_results"?: number;
    "search_type"?: "web" | "fast" | "people";
    "max_tokens"?: number;
    "max_tokens_per_page"?: number;
    "query": (string | ReadonlyArray<string>);
    "search_language_filter"?: ReadonlyArray<string>;
    [key: string]: unknown;
  } & CoreSearchDomainFilter & CoreDateFilters);
  export type CoreApiSearchResponse = {
    "results": ReadonlyArray<CoreApiSearchPage>;
    "id": string;
    "server_time"?: (string | null);
    [key: string]: unknown;
  };
  export type CoreAsyncApiChatCompletionsRequest = {
    "request": CoreApiChatCompletionsRequest;
    "idempotency_key"?: (string | null);
    [key: string]: unknown;
  };
  export type CoreAsyncApiChatCompletionsResponse = {
    "id": string;
    "model": string;
    "created_at": number;
    "started_at"?: (number | null);
    "completed_at"?: (number | null);
    "response"?: (CoreCompletionResponse | null);
    "failed_at"?: (number | null);
    "error_message"?: (string | null);
    "status": CoreAsyncProcessingStatus;
    [key: string]: unknown;
  };
  export type CoreAsyncApiChatCompletionsResponseSummary = {
    "id": string;
    "created_at": number;
    "started_at"?: (number | null);
    "completed_at"?: (number | null);
    "failed_at"?: (number | null);
    "model": string;
    "status": CoreAsyncProcessingStatus;
    [key: string]: unknown;
  };
  export type CoreAsyncProcessingStatus = "CREATED" | "IN_PROGRESS" | "COMPLETED" | "FAILED";
  export type CoreChatMessage_Input = {
    "role": CoreChatMessageRole;
    "content": (string | ReadonlyArray<(CoreChatMessageContentTextChunk | CoreChatMessageContentImageChunk | CoreChatMessageContentFileChunk | CoreChatMessageContentPDFChunk | CoreChatMessageContentVideoChunk)> | null);
    [key: string]: unknown;
  };
  export type CoreChatMessage_Output = {
    "role": CoreChatMessageRole;
    "content": (string | ReadonlyArray<(CoreChatMessageContentTextChunk | CoreChatMessageContentImageChunk | CoreChatMessageContentFileChunk | CoreChatMessageContentPDFChunk | CoreChatMessageContentVideoChunk)> | null);
    [key: string]: unknown;
  };
  export type CoreChatMessageContentFileChunk = {
    "type": "file_url";
    "file_url": (CoreURL | string);
    "file_name"?: (string | null);
    [key: string]: unknown;
  };
  export type CoreChatMessageContentImageChunk = {
    "type": "image_url";
    "image_url": (CoreURL | string);
    [key: string]: unknown;
  };
  export type CoreChatMessageContentPDFChunk = {
    "type": "pdf_url";
    "pdf_url": (CoreURL | string);
    [key: string]: unknown;
  };
  export type CoreChatMessageContentTextChunk = {
    "type": "text";
    "text": string;
    [key: string]: unknown;
  };
  export type CoreChatMessageContentVideoChunk = {
    "type": "video_url";
    "video_url": (CoreVideoURL | string);
    [key: string]: unknown;
  };
  export type CoreChatMessageRole = "system" | "user" | "assistant" | "tool";
  export type CoreChoice = {
    "index": number;
    "finish_reason"?: ("stop" | "length" | null);
    "message": CoreChatMessage_Output;
    "delta": CoreChatMessage_Output;
    [key: string]: unknown;
  };
  export type CoreCompletionResponse = {
    "id": string;
    "model": string;
    "created": number;
    "usage"?: (CoreUsageInfo | null);
    "object"?: string;
    "choices": ReadonlyArray<CoreChoice>;
    "citations"?: (ReadonlyArray<string> | null);
    "search_results"?: (ReadonlyArray<CoreApiPublicSearchResult> | null);
    "images"?: (ReadonlyArray<CoreImageResult> | null);
    "related_questions"?: (ReadonlyArray<string> | null);
    [key: string]: unknown;
  };
  export type CoreCompletionResponseStatus = "PENDING" | "COMPLETED";
  export type CoreCompletionResponseType = "message" | "info" | "end_of_stream";
  export type CoreCost = {
    "input_tokens_cost": number;
    "output_tokens_cost": number;
    "reasoning_tokens_cost"?: (number | null);
    "request_cost"?: (number | null);
    "citation_tokens_cost"?: (number | null);
    "search_queries_cost"?: (number | null);
    "total_cost": number;
    [key: string]: unknown;
  };
  export type CoreCurrency = "USD";
  export type CoreExecutePythonStepDetails = {
    "code": string;
    "result": string;
    [key: string]: unknown;
  };
  export type CoreFetchUrlContentStepDetails = {
    "contents": ReadonlyArray<CoreApiPublicSearchResult>;
    [key: string]: unknown;
  };
  export type CoreHTTPValidationError = {
    "detail"?: ReadonlyArray<CoreValidationError>;
    [key: string]: unknown;
  };
  export type CoreJSONSchema = {
    "schema": Record<string, unknown>;
    "name"?: (string | null);
    "description"?: (string | null);
    "strict"?: (boolean | null);
    [key: string]: unknown;
  };
  export type CoreListAsyncApiChatCompletionsResponse = {
    "next_token"?: (string | null);
    "requests": ReadonlyArray<CoreAsyncApiChatCompletionsResponseSummary>;
    [key: string]: unknown;
  };
  export type CoreReasoningStep_Output = {
    "thought": string;
    "type"?: (string | null);
    "web_search"?: (CoreWebSearchStepDetails | null);
    "finance_search"?: (CoreFinanceSearchStepDetails | null);
    "people_search"?: (CorePeopleSearchStepDetails | null);
    "fetch_url_content"?: (CoreFetchUrlContentStepDetails | null);
    "execute_python"?: (CoreExecutePythonStepDetails | null);
    [key: string]: unknown;
  };
  export type CoreResponseFormatJSONSchema = {
    "type": "json_schema";
    "json_schema": CoreJSONSchema;
    [key: string]: unknown;
  };
  export type CoreResponseFormatText = {
    "type": "text";
    [key: string]: unknown;
  };
  export type CoreToolCall = {
    "id"?: (string | null);
    "type"?: ("function" | null);
    "function"?: (CoreToolCallFunction | null);
    [key: string]: unknown;
  };
  export type CoreToolCallFunction = {
    "name"?: (string | null);
    "arguments"?: (string | null);
    [key: string]: unknown;
  };
  export type CoreURL = {
    "url": string;
    [key: string]: unknown;
  };
  export type CoreUsageInfo = {
    "prompt_tokens": number;
    "completion_tokens": number;
    "total_tokens": number;
    "search_context_size"?: (string | null);
    "citation_tokens"?: (number | null);
    "num_search_queries"?: (number | null);
    "reasoning_tokens"?: (number | null);
    "cost": CoreCost;
    [key: string]: unknown;
  };
  export type CoreUserLocation = {
    "latitude"?: (number | null);
    "longitude"?: (number | null);
    "country"?: (string | null);
    "city"?: (string | null);
    "region"?: (string | null);
    [key: string]: unknown;
  };
  export type CoreValidationError = {
    "loc": ReadonlyArray<(string | number)>;
    "msg": string;
    "type": string;
    [key: string]: unknown;
  };
  export type CoreVideoURL = {
    "url": string;
    "frame_interval"?: (string | number);
    [key: string]: unknown;
  };
  export type CoreWebSearchOptions = {
    "search_context_size"?: "low" | "medium" | "high";
    "search_type"?: ("fast" | "pro" | "auto" | null);
    "user_location"?: (CoreUserLocation | null);
    "image_results_enhanced_relevance"?: boolean;
    [key: string]: unknown;
  };
  export type CoreResponsesRequest = {
    "input": CoreInput;
    "background"?: boolean;
    "instructions"?: string;
    "language_preference"?: string;
    "max_output_tokens"?: number;
    "max_steps"?: number;
    "model"?: string;
    "models"?: ReadonlyArray<string>;
    "preset"?: string;
    "profile"?: (CoreProfileReference);
    "previous_response_id"?: string;
    "reasoning"?: CoreReasoningConfig;
    "response_format"?: CoreResponseFormat;
    "store"?: boolean;
    "stream"?: boolean;
    "tools"?: ReadonlyArray<CoreTool>;
    "tool_choice"?: (CoreToolChoice);
    "skills"?: ReadonlyArray<CoreSkill>;
    "temperature"?: number;
    "top_p"?: number;
    [key: string]: unknown;
  };
  export type CoreResponseFile = {
    "id": string;
    "object": string;
    "filename": string;
    "bytes": number;
    "created_at": number;
    [key: string]: unknown;
  };
  export type CoreResponseFileList = {
    "object": string;
    "data": ReadonlyArray<CoreResponseFile>;
    [key: string]: unknown;
  };
  export type CoreResponsesResponse = {
    "created_at": number;
    "error"?: CoreErrorInfo;
    "id": string;
    "model": string;
    "preset"?: string;
    "object": CoreResponsesObjectType;
    "output": ReadonlyArray<CoreOutputItem>;
    "status": CoreStatus;
    "usage"?: CoreResponsesUsage;
    [key: string]: unknown;
  };
  export type CoreResponsesObjectType = "response";
  export type CoreResponsesUsage = {
    "cost"?: CoreResponsesCost;
    "input_tokens": number;
    "input_tokens_details"?: {
      "cache_creation_input_tokens"?: number;
      "cache_read_input_tokens"?: number;
      [key: string]: unknown;
    };
    "output_tokens": number;
    "tool_calls_details"?: Record<string, CoreToolCallDetails>;
    "total_tokens": number;
    [key: string]: unknown;
  };
  export type CoreResponsesCost = {
    "cache_creation_cost"?: number;
    "cache_read_cost"?: number;
    "currency": CoreCurrency;
    "input_cost": number;
    "output_cost": number;
    "tool_calls_cost"?: number;
    "tool_calls_cost_details"?: Record<string, number>;
    "total_cost": number;
    [key: string]: unknown;
  };
  export type CoreInput = (string | ReadonlyArray<CoreInputItem>);
  export type CoreInputItem = (CoreInputMessage | CoreFunctionCallOutputInput | CoreFunctionCallInput | CoreMcpApprovalResponseInput | CoreMcpApprovalRequestInput | CoreMcpCallInput | CoreMcpListToolsInput);
  export type CoreInputMessage = {
    "content": CoreInputContent;
    "role": "user" | "assistant" | "system" | "developer";
    "type": "message";
    [key: string]: unknown;
  };
  export type CoreInputContent = (string | ReadonlyArray<CoreInputContentPart>);
  export type CoreInputContentPart = {
    "image_url"?: string;
    "text"?: string;
    "type": "input_text" | "input_image" | "input_file";
    "filename"?: string;
    "file_data"?: string;
    "file_url"?: string;
    [key: string]: unknown;
  };
  export type CoreOutputItem = (CoreMessageOutputItem | CoreSearchResultsOutputItem | CoreImageSearchResultsOutputItem | CoreFetchUrlResultsOutputItem | CoreFinanceResultsOutputItem | CorePeopleSearchResultsOutputItem | CoreFunctionCallOutputItem | CoreSandboxResultsOutputItem | CoreMcpListToolsOutputItem | CoreMcpCallOutputItem | CoreMcpApprovalRequestOutputItem | CoreToolSearchOutputItem);
  export type CoreMessageOutputItem = {
    "content": ReadonlyArray<CoreContentPart>;
    "id": string;
    "role": CoreRoleType;
    "status": CoreStatus;
    "type": "message";
    [key: string]: unknown;
  };
  export type CoreSearchResultsOutputItem = {
    "queries"?: ReadonlyArray<string>;
    "results": ReadonlyArray<CoreSearchResult>;
    "type": "search_results";
    [key: string]: unknown;
  };
  export type CoreImageSearchResultsOutputItem = {
    "error"?: string;
    "queries"?: ReadonlyArray<string>;
    "results": ReadonlyArray<CoreImageResult>;
    "type": "image_search_results";
    [key: string]: unknown;
  };
  export type CoreFetchUrlResultsOutputItem = {
    "contents": ReadonlyArray<CoreUrlContent>;
    "type": "fetch_url_results";
    [key: string]: unknown;
  };
  export type CoreSandboxResultsOutputItem = {
    "type": "sandbox_results";
    "code"?: string;
    "stdout"?: string;
    "stderr"?: string;
    "exit_code"?: number;
    "duration_ms"?: number;
    "status": "completed" | "timed_out" | "failed";
    [key: string]: unknown;
  };
  export type CoreFinanceResultsOutputItem = {
    "categories"?: ReadonlyArray<string>;
    "results": ReadonlyArray<CoreFinanceResult>;
    "tickers"?: ReadonlyArray<string>;
    "type": "finance_results";
    [key: string]: unknown;
  };
  export type CorePeopleSearchResultsOutputItem = {
    "queries"?: ReadonlyArray<string>;
    "results": ReadonlyArray<CoreSearchResult>;
    "type": "people_search_results";
    [key: string]: unknown;
  };
  export type CoreContentPart = {
    "annotations"?: ReadonlyArray<CoreAnnotation>;
    "text": string;
    "type": CoreContentPartType;
    [key: string]: unknown;
  };
  export type CoreContentPartType = "output_text";
  export type CoreAnnotation = {
    "end_index"?: number;
    "start_index"?: number;
    "title"?: string;
    "type"?: string;
    "url"?: string;
    [key: string]: unknown;
  };
  export type CoreSearchResult = {
    "date"?: string;
    "id": number;
    "last_updated"?: string;
    "snippet": string;
    "source"?: CoreSearchSource;
    "title": string;
    "url": string;
    [key: string]: unknown;
  };
  export type CoreSearchSource = "web";
  export type CoreFinanceResult = {
    "category": string;
    "content": string;
    "sources"?: ReadonlyArray<string>;
    "tickers"?: ReadonlyArray<string>;
    [key: string]: unknown;
  };
  export type CoreUrlContent = {
    "snippet": string;
    "title": string;
    "url": string;
    [key: string]: unknown;
  };
  export type CoreRoleType = "assistant";
  export type CoreStatus = "completed" | "failed" | "incomplete" | "in_progress" | "queued" | "cancelled";
  export type CoreErrorInfo = {
    "code"?: string;
    "message": string;
    "type"?: string;
    [key: string]: unknown;
  };
  export type CoreProfileReference = {
    "id": string;
    "type": "custom";
    "version"?: string;
  };
  export type CoreReasoningConfig = {
    "effort"?: "minimal" | "low" | "medium" | "high" | "xhigh" | "max";
    [key: string]: unknown;
  };
  export type CoreResponseFormat = {
    "json_schema"?: CoreJSONSchemaFormat;
    "type": "json_schema";
    [key: string]: unknown;
  };
  export type CoreJSONSchemaFormat = {
    "description"?: string;
    "name": string;
    "schema": Record<string, unknown>;
    "strict"?: boolean;
    [key: string]: unknown;
  };
  export type CoreFunctionCallInput = {
    "arguments": string;
    "call_id": string;
    "name": string;
    "thought_signature"?: string;
    "type": "function_call";
    [key: string]: unknown;
  };
  export type CoreFunctionCallOutputInput = {
    "id"?: string | null;
    "call_id": string;
    "name"?: string;
    "output": (string | ReadonlyArray<(CoreFunctionCallOutputTextPart | CoreFunctionCallOutputImagePart)>);
    "status"?: "in_progress" | "completed" | "incomplete";
    "thought_signature"?: string;
    "type": "function_call_output";
  };
  export type CoreFunctionCallOutputTextPart = {
    "text": string;
    "type": "input_text";
  };
  export type CoreFunctionCallOutputImagePart = {
    "detail"?: "low" | "high" | "auto";
    "image_url": string;
    "type": "input_image";
  };
  export type CoreFunctionCallOutputItem = {
    "arguments": string;
    "call_id": string;
    "id": string;
    "name": string;
    "status": CoreStatus;
    "thought_signature"?: string;
    "type": "function_call";
    [key: string]: unknown;
  };
  export type CoreFunctionTool = {
    "description"?: string;
    "name": string;
    "parameters"?: Record<string, unknown>;
    "strict"?: boolean;
    "type": "function";
    [key: string]: unknown;
  };
  export type CoreTool = (CoreWebSearchTool | CoreImageSearchTool | CoreFinanceSearchTool | CorePeopleSearchTool | CoreFetchUrlTool | CoreFunctionTool | CoreSandboxTool | CoreMcpTool | CoreConnectorTool);
  export type CoreSkill = (CoreBuiltinSkill | CoreInlineSkill | CoreCustomSkill);
  export type CoreBuiltinSkill = {
    "type": "builtin";
    "name": "office" | "office/docx" | "office/pdf" | "office/pptx" | "office/xlsx";
  };
  export type CoreInlineSkill = {
    "type": "inline";
    "name": string;
    "description": string;
    "instructions": string;
  };
  export type CoreCustomSkill = {
    "type": "custom";
    "id": string;
    "version"?: string;
  };
  export type CoreWebSearchTool = {
    "filters"?: CoreWebSearchFilters;
    "search_type"?: "web" | "fast";
    "max_results"?: number;
    "max_tokens"?: number;
    "max_tokens_per_page"?: number;
    "type": "web_search";
    "user_location"?: CoreToolUserLocation;
    [key: string]: unknown;
  };
  export type CoreToolChoice = ("none" | "auto" | "required" | Record<string, unknown>);
  export type CoreImageSearchFilters = {
    "domain_filter"?: ReadonlyArray<string>;
    "format_filter"?: ReadonlyArray<"bmp" | "gif" | "jpeg" | "png" | "webp" | "svg">;
    "safe_search"?: boolean;
    [key: string]: unknown;
  };
  export type CoreImageSearchTool = {
    "type": "image_search";
    "max_results"?: number;
    "filters"?: CoreImageSearchFilters;
    [key: string]: unknown;
  };
  export type CoreFinanceSearchTool = {
    "type": "finance_search";
    [key: string]: unknown;
  };
  export type CoreFetchUrlTool = {
    "max_urls"?: number;
    "type": "fetch_url";
    [key: string]: unknown;
  };
  export type CorePeopleSearchTool = {
    "type": "people_search";
    [key: string]: unknown;
  };
  export type CoreSandboxTool = {
    "type": "sandbox";
    [key: string]: unknown;
  };
  export type CoreWebSearchFilters = (CoreSearchDomainFilter & CoreDateFilters);
  export type CoreSearchDomainFilter = {
    "search_domain_filter"?: ReadonlyArray<string>;
    [key: string]: unknown;
  };
  export type CoreDateFilters = {
    "last_updated_after_filter"?: CoreDate;
    "last_updated_before_filter"?: CoreDate;
    "search_after_date_filter"?: CoreDate;
    "search_before_date_filter"?: CoreDate;
    "search_recency_filter"?: CoreSearchRecencyFilter;
    [key: string]: unknown;
  };
  export type CoreDate = string;
  export type CoreSearchRecencyFilter = "hour" | "day" | "week" | "month" | "year";
  export type CoreToolUserLocation = {
    "city"?: string;
    "country"?: string;
    "latitude"?: number;
    "longitude"?: number;
    "region"?: string;
    [key: string]: unknown;
  };
  export type CoreToolCallDetails = {
    "invocation"?: number;
    "cost_usd"?: number;
    "token_usage"?: ReadonlyArray<CoreToolCallTokenUsage>;
    [key: string]: unknown;
  };
  export type CoreInputTokensDetails = {
    "cached_tokens": number;
    "cache_creation_input_tokens"?: number;
    "cache_read_input_tokens"?: number;
    [key: string]: unknown;
  };
  export type CoreOutputTokensDetails = {
    "reasoning_tokens": number;
    [key: string]: unknown;
  };
  export type CoreToolCallTokenUsage = {
    "model"?: string;
    "input_tokens": number;
    "output_tokens": number;
    "input_tokens_details": CoreInputTokensDetails;
    "output_tokens_details": CoreOutputTokensDetails;
    [key: string]: unknown;
  };
  export type CoreResponseStreamEvent = (CoreResponseCreatedEvent | CoreResponseInProgressEvent | CoreResponseCompletedEvent | CoreResponseFailedEvent | CoreOutputItemAddedEvent | CoreOutputItemDoneEvent | CoreTextDeltaEvent | CoreTextDoneEvent | CoreReasoningStartedEvent | CoreSearchQueriesEvent | CoreSearchResultsEvent | CoreImageSearchQueriesEvent | CoreImageSearchResultsEvent | CoreFetchUrlQueriesEvent | CoreFetchUrlResultsEvent | CoreReasoningStoppedEvent);
  export type CoreEventType = "response.created" | "response.in_progress" | "response.completed" | "response.failed" | "response.output_item.added" | "response.output_item.done" | "response.output_text.delta" | "response.output_text.done" | "response.reasoning.started" | "response.reasoning.search_queries" | "response.reasoning.search_results" | "response.reasoning.image_search_queries" | "response.reasoning.image_search_results" | "response.reasoning.fetch_url_queries" | "response.reasoning.fetch_url_results" | "response.reasoning.stopped";
  export type CoreResponseCreatedEvent = {
    "response"?: CoreResponsesResponse;
    "sequence_number": number;
    "type": CoreEventType;
    [key: string]: unknown;
  };
  export type CoreResponseInProgressEvent = {
    "response"?: CoreResponsesResponse;
    "sequence_number": number;
    "type": CoreEventType;
    [key: string]: unknown;
  };
  export type CoreResponseCompletedEvent = {
    "response"?: CoreResponsesResponse;
    "sequence_number": number;
    "type": CoreEventType;
    [key: string]: unknown;
  };
  export type CoreResponseFailedEvent = {
    "error": CoreErrorInfo;
    "sequence_number": number;
    "type": CoreEventType;
    [key: string]: unknown;
  };
  export type CoreOutputItemAddedEvent = {
    "item": CoreOutputItem;
    "output_index": number;
    "sequence_number": number;
    "type": CoreEventType;
    [key: string]: unknown;
  };
  export type CoreOutputItemDoneEvent = {
    "item": CoreOutputItem;
    "output_index": number;
    "sequence_number": number;
    "type": CoreEventType;
    [key: string]: unknown;
  };
  export type CoreTextDeltaEvent = {
    "content_index": number;
    "delta": string;
    "item_id": string;
    "output_index": number;
    "sequence_number": number;
    "type": CoreEventType;
    [key: string]: unknown;
  };
  export type CoreTextDoneEvent = {
    "content_index": number;
    "item_id": string;
    "output_index": number;
    "sequence_number": number;
    "text": string;
    "type": CoreEventType;
    [key: string]: unknown;
  };
  export type CoreReasoningStartedEvent = {
    "sequence_number": number;
    "thought"?: string;
    "type": CoreEventType;
    [key: string]: unknown;
  };
  export type CoreSearchQueriesEvent = {
    "queries": ReadonlyArray<string>;
    "sequence_number": number;
    "thought"?: string;
    "type": CoreEventType;
    [key: string]: unknown;
  };
  export type CoreSearchResultsEvent = {
    "results": ReadonlyArray<CoreSearchResult>;
    "sequence_number": number;
    "thought"?: string;
    "type": CoreEventType;
    "usage"?: CoreResponsesUsage;
    [key: string]: unknown;
  };
  export type CoreImageSearchQueriesEvent = {
    "call_id": string;
    "queries": ReadonlyArray<string>;
    "sequence_number": number;
    "thought"?: string;
    "type": CoreEventType;
    [key: string]: unknown;
  };
  export type CoreImageSearchResultsEvent = {
    "call_id": string;
    "results": ReadonlyArray<CoreImageResult>;
    "sequence_number": number;
    "thought"?: string;
    "type": CoreEventType;
    "usage"?: CoreResponsesUsage;
    [key: string]: unknown;
  };
  export type CoreFetchUrlQueriesEvent = {
    "sequence_number": number;
    "thought"?: string;
    "type": CoreEventType;
    "urls": ReadonlyArray<string>;
    [key: string]: unknown;
  };
  export type CoreFetchUrlResultsEvent = {
    "contents": ReadonlyArray<CoreUrlContent>;
    "sequence_number": number;
    "thought"?: string;
    "type": CoreEventType;
    [key: string]: unknown;
  };
  export type CoreReasoningStoppedEvent = {
    "sequence_number": number;
    "thought"?: string;
    "type": CoreEventType;
    [key: string]: unknown;
  };
  export type CoreWebSearchStepDetails = {
    "search_results": ReadonlyArray<CoreApiPublicSearchResult>;
    "search_keywords": ReadonlyArray<string>;
    [key: string]: unknown;
  };
  export type CoreFinanceSearchStepDetails = {
    "search_results": ReadonlyArray<CoreApiPublicSearchResult>;
    "search_keywords": ReadonlyArray<string>;
    [key: string]: unknown;
  };
  export type CorePeopleSearchStepDetails = {
    "search_results": ReadonlyArray<CoreApiPublicSearchResult>;
    "search_keywords": ReadonlyArray<string>;
    [key: string]: unknown;
  };
  export type CoreEmbeddingsRequest = {
    "input": (string | ReadonlyArray<string>);
    "model": "pplx-embed-v1-0.6b" | "pplx-embed-v1-4b";
    "dimensions"?: number;
    "encoding_format"?: "base64_int8" | "base64_binary";
    [key: string]: unknown;
  };
  export type CoreEmbeddingsResponse = {
    "object"?: string;
    "data"?: ReadonlyArray<CoreEmbeddingObject>;
    "model"?: string;
    "usage"?: CoreEmbeddingsUsage;
    [key: string]: unknown;
  };
  export type CoreEmbeddingObject = {
    "object"?: string;
    "index"?: number;
    "embedding"?: string;
    [key: string]: unknown;
  };
  export type CoreEmbeddingsUsage = {
    "prompt_tokens"?: number;
    "total_tokens"?: number;
    "cost"?: {
      "input_cost"?: number;
      "total_cost"?: number;
      "currency"?: "USD";
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
  export type CoreContextualizedEmbeddingsRequest = {
    "input": ReadonlyArray<ReadonlyArray<string>>;
    "model": "pplx-embed-context-v1-0.6b" | "pplx-embed-context-v1-4b";
    "dimensions"?: number;
    "encoding_format"?: "base64_int8" | "base64_binary";
    [key: string]: unknown;
  };
  export type CoreContextualizedEmbeddingsResponse = {
    "object"?: string;
    "data"?: ReadonlyArray<CoreContextualizedEmbeddingObject>;
    "model"?: string;
    "usage"?: CoreEmbeddingsUsage;
    [key: string]: unknown;
  };
  export type CoreContextualizedEmbeddingObject = {
    "object"?: string;
    "index"?: number;
    "data"?: ReadonlyArray<CoreEmbeddingObject>;
    [key: string]: unknown;
  };
  export type CoreModel = {
    "id": string;
    "object": "model";
    "created": number;
    "owned_by": string;
    [key: string]: unknown;
  };
  export type CoreListModelsResponse = {
    "object": "list";
    "data": ReadonlyArray<CoreModel>;
    [key: string]: unknown;
  };
  export type CoreComputerUsageCategoryCount = {
    "category": string;
    "count": number;
    [key: string]: unknown;
  };
  export type CoreComputerUsageBucket = {
    "start_time": number;
    "end_time": number;
    "count": number;
    "by_categories": Record<string, ReadonlyArray<CoreComputerUsageCategoryCount>>;
    [key: string]: unknown;
  };
  export type CoreComputerUsageResponse = {
    "categories": ReadonlyArray<string>;
    "data": ReadonlyArray<CoreComputerUsageBucket>;
    "has_more": boolean;
    "next_page"?: string | null;
    [key: string]: unknown;
  };
  export type CoreComputerUsageV2Result = {
    "user_email": string;
    "count": number;
    "by_categories": Record<string, ReadonlyArray<CoreComputerUsageCategoryCount>>;
    [key: string]: unknown;
  };
  export type CoreComputerUsageV2Bucket = {
    "start_time": number;
    "end_time": number;
    "results": ReadonlyArray<CoreComputerUsageV2Result>;
    [key: string]: unknown;
  };
  export type CoreComputerUsageV2Response = {
    "categories": ReadonlyArray<string>;
    "data": ReadonlyArray<CoreComputerUsageV2Bucket>;
    "has_more": boolean;
    "next_page"?: string | null;
    [key: string]: unknown;
  };
  export type CoreAnalyticsErrorResponse = {
    "error": {
      "message": string;
      "type": string;
      "code": number;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
  export type CoreMcpToolDef = {
    "name": string;
    "description"?: string;
    "input_schema": Record<string, unknown>;
    "annotations"?: {
      "read_only"?: boolean;
      [key: string]: unknown;
    } | {
      "read_only"?: boolean;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
  export type CoreMcpListToolsOutputItem = {
    "type": "mcp_list_tools";
    "id": string;
    "server_label": string;
    "connector_id"?: string;
    "tools": ReadonlyArray<CoreMcpToolDef>;
    "error"?: string;
    [key: string]: unknown;
  };
  export type CoreMcpCallOutputItem = {
    "type": "mcp_call";
    "id": string;
    "server_label": string;
    "connector_id"?: string;
    "name": string;
    "arguments": string;
    "output"?: string;
    "error"?: string | null;
    "approval_request_id"?: string | null;
    [key: string]: unknown;
  };
  export type CoreMcpTool = {
    "type": "mcp";
    "server_label": string;
    "server_url": string;
    "authorization"?: string;
    "headers"?: Record<string, string>;
    "allowed_tools"?: ReadonlyArray<string>;
    "defer_loading"?: boolean;
    "require_approval"?: CoreRequireApproval;
    [key: string]: unknown;
  };
  export type CoreNamespaceToolDef = {
    "type": "function";
    "name": string;
    "description"?: string;
    "parameters"?: Record<string, unknown>;
    [key: string]: unknown;
  };
  export type CoreNamespaceTool = {
    "type": "namespace";
    "name": string;
    "description": string;
    "tools": ReadonlyArray<CoreNamespaceToolDef>;
    [key: string]: unknown;
  };
  export type CoreToolSearchOutputItem = {
    "type": "tool_search_output";
    "id": string;
    "call_id": string | null;
    "execution": string;
    "arguments"?: string;
    "tools": ReadonlyArray<CoreNamespaceTool>;
    "status": string;
    [key: string]: unknown;
  };
  export type CoreConnectorTool = {
    "type": "connector";
    "id": string;
    "server_label": string;
    "server_description"?: string;
    "allowed_tools"?: ReadonlyArray<string>;
    "require_approval"?: CoreRequireApproval;
    [key: string]: unknown;
  };
  export type CoreSkillSummary = {
    "skill_id": string;
    "name"?: string;
    "revision"?: string;
    "created_at"?: string;
    "updated_at"?: string;
    [key: string]: unknown;
  };
  export type CoreSkillList = {
    "skills": ReadonlyArray<CoreSkillSummary>;
    "next_page_token"?: string;
    [key: string]: unknown;
  };
  export type CoreSkillRevision = {
    "revision": string;
    "name"?: string;
    "created_at"?: string;
    [key: string]: unknown;
  };
  export type CoreSkillRevisionList = {
    "revisions": ReadonlyArray<CoreSkillRevision>;
    "next_page_token"?: string;
    [key: string]: unknown;
  };
  export type CoreSkillDownload = {
    "revision"?: string;
    "name"?: string;
    "download_url": string;
    [key: string]: unknown;
  };
  export type CoreApiError = {
    "error"?: {
      "message": string;
      "type": string;
      "code": number;
      "param"?: string | null;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
  export type CoreManagedSkill = {
    "skill_id": string;
    "name"?: string;
    "description"?: string;
    "revision"?: string;
    "latest_revision"?: string;
    "created_at"?: string;
    "updated_at"?: string;
    [key: string]: unknown;
  };
  export type CoreRequireApproval = ("always" | "never" | CoreApprovalFilters | null);
  export type CoreApprovalFilters = {
    "always"?: (CoreApprovalFilter | null);
    "never"?: (CoreApprovalFilter | null);
  };
  export type CoreApprovalFilter = {
    "tool_names"?: ReadonlyArray<string> | null;
    "read_only"?: boolean | null;
  };
  export type CoreMcpApprovalResponseInput = {
    "type": "mcp_approval_response";
    "approval_request_id": string;
    "approve": boolean;
    "reason"?: string | null;
    "id"?: string | null;
  };
  export type CoreMcpApprovalRequestInput = {
    "type": "mcp_approval_request";
    "id": string;
    "server_label": string;
    "connector_id"?: string;
    "name": string;
    "arguments": string;
    "thought_signature"?: string;
    [key: string]: unknown;
  };
  export type CoreMcpCallInput = {
    "type": "mcp_call";
    "id": string;
    "server_label": string;
    "connector_id"?: string;
    "name": string;
    "arguments": string;
    "output"?: string;
    "error"?: string | null;
    "approval_request_id"?: string | null;
    [key: string]: unknown;
  };
  export type CoreMcpListToolsInput = {
    "type": "mcp_list_tools";
    "id"?: string;
    "server_label"?: string;
    "tools"?: ReadonlyArray<CoreMcpToolDef>;
    "error"?: string | null;
    [key: string]: unknown;
  };
  export type CoreMcpApprovalRequestOutputItem = {
    "type": "mcp_approval_request";
    "id": string;
    "server_label": string;
    "connector_id"?: string;
    "name": string;
    "arguments": string;
    "thought_signature"?: string;
    [key: string]: unknown;
  };
  export type CoreAnswer = (CoreNoulAnswer | CoreScoreAnswer | CoreChoiceAnswer);
  export type CoreChoiceAnswer = {
    "type": "choice";
    "choice": string;
    "confidence": number;
    "probabilities": Record<string, number>;
    [key: string]: unknown;
  };
  export type CoreChoiceQuestion = {
    "type": "choice";
    "instructions"?: (string | Record<string, unknown> | ReadonlyArray<unknown> | null);
    "criteria": Record<string, (string | Record<string, unknown> | ReadonlyArray<unknown> | null)>;
    [key: string]: unknown;
  };
  export type CoreNoulAnswer = {
    "type": "noul";
    "noul": number;
    [key: string]: unknown;
  };
  export type CoreNoulCriteria = {
    "true"?: (string | Record<string, unknown> | ReadonlyArray<unknown> | null);
    "false"?: (string | Record<string, unknown> | ReadonlyArray<unknown> | null);
    [key: string]: unknown;
  } | {
    "true"?: (string | Record<string, unknown> | ReadonlyArray<unknown> | null);
    "false"?: (string | Record<string, unknown> | ReadonlyArray<unknown> | null);
    [key: string]: unknown;
  };
  export type CoreNoulQuestion = {
    "type": "noul";
    "instructions"?: (string | Record<string, unknown> | ReadonlyArray<unknown> | null);
    "criteria"?: (CoreNoulCriteria);
    [key: string]: unknown;
  };
  export type CoreQuestion = (CoreNoulQuestion | CoreChoiceQuestion | CoreScoreQuestion);
  export type CoreScoreAnswer = {
    "type": "score";
    "score": number;
    "confidence": number;
    "legend": Record<string, (string | Record<string, unknown> | ReadonlyArray<unknown>)>;
    "probabilities": Record<string, number>;
    [key: string]: unknown;
  };
  export type CoreScoreQuestion = {
    "type": "score";
    "instructions"?: (string | Record<string, unknown> | ReadonlyArray<unknown> | null);
    "criteria": ReadonlyArray<(string | Record<string, unknown> | ReadonlyArray<unknown>)>;
    [key: string]: unknown;
  };
  export type CoreDecisionsRequest = {
    "model": string;
    "state": (string | Record<string, unknown> | ReadonlyArray<unknown>);
    "questions": Record<string, CoreQuestion>;
  };
  export type CoreDecisionsResponse = {
    "model": string;
    "answers": Record<string, CoreAnswer>;
    "usage": (CoreUsage);
    [key: string]: unknown;
  };
  export type CoreUsage = {
    "input_tokens": number;
    "output_tokens": number;
    [key: string]: unknown;
  };
  export type CoreError = {
    "message": string;
    "type": string;
    "code"?: (string | number | null);
    "param"?: string | null;
    [key: string]: unknown;
  };
  export type CoreErrorResponse = {
    "error": CoreError;
    [key: string]: unknown;
  };
  export type GatewayChatCreateChatCompletionRequest = (GatewayChatCreateModelResponseProperties & {
    "messages": ReadonlyArray<GatewayChatChatCompletionRequestMessage>;
    "model": (GatewayChatModelIdsShared);
    "reasoning_effort"?: (GatewayChatReasoningEffort);
    "max_completion_tokens"?: number | null;
    "response_format"?: (GatewayChatResponseFormatText | GatewayChatResponseFormatJsonSchema | GatewayChatResponseFormatJsonObject);
    "stream"?: boolean | null;
    "stop"?: (GatewayChatStopConfiguration);
    "max_tokens"?: number | null;
    "stream_options"?: (GatewayChatChatCompletionStreamOptions);
    "tools"?: ReadonlyArray<(GatewayChatChatCompletionTool | GatewayChatCustomToolChatCompletions)>;
    "tool_choice"?: (GatewayChatChatCompletionToolChoiceOption);
    "parallel_tool_calls"?: (GatewayChatParallelToolCalls);
    [key: string]: unknown;
  });
  export type GatewayChatCreateChatCompletionResponse = {
    "id": string;
    "choices": ReadonlyArray<{
      "finish_reason": "stop" | "length" | "tool_calls" | "content_filter" | "function_call";
      "index": number;
      "message": GatewayChatChatCompletionResponseMessage;
      "logprobs": {
        "content": ReadonlyArray<GatewayChatChatCompletionTokenLogprob> | null;
        "refusal": ReadonlyArray<GatewayChatChatCompletionTokenLogprob> | null;
        [key: string]: unknown;
      } | null;
      [key: string]: unknown;
    }>;
    "created": number;
    "model": string;
    "service_tier"?: (GatewayChatServiceTier);
    "system_fingerprint"?: string;
    "object": "chat.completion";
    "usage"?: (GatewayChatCompletionUsage);
    "moderation"?: (GatewayChatChatCompletionModeration);
    [key: string]: unknown;
  };
  export type GatewayChatCreateChatCompletionStreamResponse = {
    "id": string;
    "choices": ReadonlyArray<{
      "delta": GatewayChatChatCompletionStreamResponseDelta;
      "logprobs"?: {
        "content": ReadonlyArray<GatewayChatChatCompletionTokenLogprob> | null;
        "refusal": ReadonlyArray<GatewayChatChatCompletionTokenLogprob> | null;
        [key: string]: unknown;
      } | null;
      "finish_reason": "stop" | "length" | "tool_calls" | "content_filter" | "function_call";
      "index": number;
      [key: string]: unknown;
    }>;
    "created": number;
    "model": string;
    "service_tier"?: string;
    "system_fingerprint"?: string;
    "object": "chat.completion.chunk";
    "usage"?: Record<string, unknown>;
    "moderation"?: (GatewayChatChatCompletionModeration);
    [key: string]: unknown;
  };
  export type GatewayChatErrorResponse = {
    "error": GatewayChatError;
    [key: string]: unknown;
  };
  export type GatewayChatCreateModelResponseProperties = (GatewayChatModelResponseProperties & {
    "prompt_cache_options"?: (GatewayChatPromptCacheOptionsParam);
    [key: string]: unknown;
  });
  export type GatewayChatChatCompletionRequestMessage = (GatewayChatChatCompletionRequestDeveloperMessage | GatewayChatChatCompletionRequestSystemMessage | GatewayChatChatCompletionRequestUserMessage | GatewayChatChatCompletionRequestAssistantMessage | GatewayChatChatCompletionRequestToolMessage | GatewayChatChatCompletionRequestFunctionMessage);
  export type GatewayChatModelIdsShared = string;
  export type GatewayChatReasoningEffort = "none" | "minimal" | "low" | "medium" | "high" | "xhigh" | "max";
  export type GatewayChatResponseFormatText = {
    "type": "text";
    [key: string]: unknown;
  };
  export type GatewayChatResponseFormatJsonSchema = {
    "type": "json_schema";
    "json_schema": {
      "name": string;
      "schema"?: GatewayChatResponseFormatJsonSchemaSchema;
      "strict"?: boolean | null;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
  export type GatewayChatResponseFormatJsonObject = {
    "type": "json_object";
    [key: string]: unknown;
  };
  export type GatewayChatStopConfiguration = (string | null | ReadonlyArray<string>) | null;
  export type GatewayChatChatCompletionStreamOptions = {
    "include_usage"?: boolean;
    [key: string]: unknown;
  } | null;
  export type GatewayChatChatCompletionTool = {
    "type": "function";
    "function": GatewayChatFunctionObject;
    [key: string]: unknown;
  };
  export type GatewayChatCustomToolChatCompletions = {
    "type": "custom";
    "custom": {
      "name": string;
      "format"?: ({
        "type": "text";
      } | {
        "type": "grammar";
        "grammar": {
          "definition": string;
          "syntax": "lark" | "regex";
          [key: string]: unknown;
        };
      });
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
  export type GatewayChatChatCompletionToolChoiceOption = ("none" | "auto" | "required" | GatewayChatChatCompletionAllowedToolsChoice | GatewayChatChatCompletionNamedToolChoice | GatewayChatChatCompletionNamedToolChoiceCustom);
  export type GatewayChatParallelToolCalls = boolean;
  export type GatewayChatChatCompletionResponseMessage = {
    "content": string | null;
    "reasoning_content"?: string;
    "refusal": string | null;
    "tool_calls"?: GatewayChatChatCompletionMessageToolCalls;
    "annotations"?: ReadonlyArray<{
      "type": "url_citation";
      "url_citation": {
        "end_index": number;
        "start_index": number;
        "url": string;
        "title": string;
        [key: string]: unknown;
      };
      [key: string]: unknown;
    }>;
    "role": "assistant";
    "function_call"?: {
      "arguments": string;
      "name": string;
      [key: string]: unknown;
    };
    "audio"?: {
      "id": string;
      "expires_at": number;
      "data": string;
      "transcript": string;
      [key: string]: unknown;
    } | null;
    [key: string]: unknown;
  };
  export type GatewayChatChatCompletionTokenLogprob = {
    "token": string;
    "logprob": number;
    "bytes": ReadonlyArray<number> | null;
    "top_logprobs": ReadonlyArray<{
      "token": string;
      "logprob": number;
      "bytes": ReadonlyArray<number> | null;
      [key: string]: unknown;
    }>;
    [key: string]: unknown;
  };
  export type GatewayChatServiceTier = "auto" | "default" | "flex" | "scale" | "priority";
  export type GatewayChatCompletionUsage = {
    "completion_tokens": number;
    "prompt_tokens": number;
    "total_tokens": number;
    "completion_tokens_details"?: {
      "accepted_prediction_tokens"?: number;
      "audio_tokens"?: number;
      "reasoning_tokens"?: number;
      "rejected_prediction_tokens"?: number;
      [key: string]: unknown;
    };
    "prompt_tokens_details"?: {
      "audio_tokens"?: number;
      "cached_tokens"?: number;
      "cache_write_tokens"?: number;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
  export type GatewayChatChatCompletionModeration = {
    "input": (GatewayChatChatCompletionModerationResults | GatewayChatChatCompletionModerationError);
    "output": (GatewayChatChatCompletionModerationResults | GatewayChatChatCompletionModerationError);
    [key: string]: unknown;
  };
  export type GatewayChatChatCompletionStreamResponseDelta = {
    "content"?: string;
    "reasoning_content"?: string;
    "function_call"?: {
      "arguments"?: string;
      "name"?: string;
      [key: string]: unknown;
    };
    "tool_calls"?: ReadonlyArray<GatewayChatChatCompletionMessageToolCallChunk>;
    "role"?: "developer" | "system" | "user" | "assistant" | "tool";
    "refusal"?: string;
    [key: string]: unknown;
  };
  export type GatewayChatError = {
    "code": string | null;
    "message": string;
    "param": string | null;
    "type": string;
    [key: string]: unknown;
  };
  export type GatewayChatModelResponseProperties = {
    "metadata"?: (GatewayChatMetadata);
    "temperature"?: number | null;
    "top_p"?: number | null;
    "user"?: string;
    "safety_identifier"?: string | null;
    "prompt_cache_key"?: string | null;
    "service_tier"?: (GatewayChatServiceTier);
    "prompt_cache_retention"?: "in_memory" | "24h";
    [key: string]: unknown;
  };
  export type GatewayChatPromptCacheOptionsParam = {
    "ttl"?: GatewayChatPromptCacheTTLEnum;
    "mode"?: GatewayChatPromptCacheModeEnum;
    [key: string]: unknown;
  };
  export type GatewayChatChatCompletionRequestDeveloperMessage = {
    "content": (string | ReadonlyArray<GatewayChatChatCompletionRequestMessageContentPartText>);
    "role": "developer";
    "name"?: string;
    [key: string]: unknown;
  };
  export type GatewayChatChatCompletionRequestSystemMessage = {
    "content": (string | ReadonlyArray<GatewayChatChatCompletionRequestSystemMessageContentPart>);
    "role": "system";
    "name"?: string;
    [key: string]: unknown;
  };
  export type GatewayChatChatCompletionRequestUserMessage = {
    "content": (string | ReadonlyArray<GatewayChatChatCompletionRequestUserMessageContentPart>);
    "role": "user";
    "name"?: string;
    [key: string]: unknown;
  };
  export type GatewayChatChatCompletionRequestAssistantMessage = {
    "content"?: (string | ReadonlyArray<GatewayChatChatCompletionRequestAssistantMessageContentPart>) | null;
    "reasoning_content"?: string;
    "refusal"?: string | null;
    "role": "assistant";
    "name"?: string;
    "audio"?: {
      "id": string;
      [key: string]: unknown;
    } | null;
    "tool_calls"?: GatewayChatChatCompletionMessageToolCalls;
    "function_call"?: {
      "arguments": string;
      "name": string;
      [key: string]: unknown;
    } | null;
    [key: string]: unknown;
  };
  export type GatewayChatChatCompletionRequestToolMessage = {
    "role": "tool";
    "content": (string | ReadonlyArray<GatewayChatChatCompletionRequestToolMessageContentPart>);
    "tool_call_id": string;
    [key: string]: unknown;
  };
  export type GatewayChatChatCompletionRequestFunctionMessage = {
    "role": "function";
    "content": string | null;
    "name": string;
    [key: string]: unknown;
  };
  export type GatewayChatResponseFormatJsonSchemaSchema = Record<string, unknown>;
  export type GatewayChatFunctionObject = {
    "name": string;
    "parameters"?: GatewayChatFunctionParameters;
    "strict"?: boolean | null;
    [key: string]: unknown;
  };
  export type GatewayChatChatCompletionAllowedToolsChoice = {
    "type": "allowed_tools";
    "allowed_tools": GatewayChatChatCompletionAllowedTools;
    [key: string]: unknown;
  };
  export type GatewayChatChatCompletionNamedToolChoice = {
    "type": "function";
    "function": {
      "name": string;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
  export type GatewayChatChatCompletionNamedToolChoiceCustom = {
    "type": "custom";
    "custom": {
      "name": string;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
  export type GatewayChatChatCompletionMessageToolCalls = ReadonlyArray<(GatewayChatChatCompletionMessageToolCall | GatewayChatChatCompletionMessageCustomToolCall)>;
  export type GatewayChatChatCompletionModerationResults = {
    "type": "moderation_results";
    "model": string;
    "results": ReadonlyArray<GatewayChatModerationResultBody>;
    [key: string]: unknown;
  };
  export type GatewayChatChatCompletionModerationError = {
    "type": "error";
    "code": string;
    "message": string;
    [key: string]: unknown;
  };
  export type GatewayChatChatCompletionMessageToolCallChunk = {
    "index": number;
    "id"?: string;
    "type"?: "function";
    "function"?: {
      "name"?: string;
      "arguments"?: string;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
  export type GatewayChatMetadata = Record<string, string> | null;
  export type GatewayChatPromptCacheTTLEnum = "30m";
  export type GatewayChatPromptCacheModeEnum = "implicit" | "explicit";
  export type GatewayChatChatCompletionRequestMessageContentPartText = {
    "type": "text";
    "text": string;
    "prompt_cache_breakpoint"?: GatewayChatPromptCacheBreakpointParam;
    [key: string]: unknown;
  };
  export type GatewayChatChatCompletionRequestSystemMessageContentPart = (GatewayChatChatCompletionRequestMessageContentPartText);
  export type GatewayChatChatCompletionRequestUserMessageContentPart = (GatewayChatChatCompletionRequestMessageContentPartText | GatewayChatChatCompletionRequestMessageContentPartImage | GatewayChatChatCompletionRequestMessageContentPartAudio | GatewayChatChatCompletionRequestMessageContentPartFile);
  export type GatewayChatChatCompletionRequestAssistantMessageContentPart = (GatewayChatChatCompletionRequestMessageContentPartText | GatewayChatChatCompletionRequestMessageContentPartRefusal);
  export type GatewayChatChatCompletionRequestToolMessageContentPart = (GatewayChatChatCompletionRequestMessageContentPartText);
  export type GatewayChatFunctionParameters = Record<string, unknown>;
  export type GatewayChatChatCompletionAllowedTools = {
    "mode": "auto" | "required";
    "tools": ReadonlyArray<Record<string, unknown>>;
    [key: string]: unknown;
  };
  export type GatewayChatChatCompletionMessageToolCall = {
    "id": string;
    "type": "function";
    "function": {
      "name": string;
      "arguments": string;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
  export type GatewayChatChatCompletionMessageCustomToolCall = {
    "id": string;
    "type": "custom";
    "custom": {
      "name": string;
      "input": string;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
  export type GatewayChatModerationResultBody = {
    "type": "moderation_result";
    "model": string;
    "flagged": boolean;
    "categories": Record<string, boolean>;
    "category_scores": Record<string, number>;
    "category_applied_input_types": Record<string, ReadonlyArray<GatewayChatModerationInputType>>;
    [key: string]: unknown;
  };
  export type GatewayChatPromptCacheBreakpointParam = {
    "mode": "explicit";
    [key: string]: unknown;
  };
  export type GatewayChatChatCompletionRequestMessageContentPartImage = {
    "type": "image_url";
    "image_url": {
      "url": string;
      "detail"?: "auto" | "low" | "high";
      [key: string]: unknown;
    };
    "prompt_cache_breakpoint"?: GatewayChatPromptCacheBreakpointParam;
    [key: string]: unknown;
  };
  export type GatewayChatChatCompletionRequestMessageContentPartAudio = {
    "type": "input_audio";
    "input_audio": {
      "data": string;
      "format": "wav" | "mp3";
      [key: string]: unknown;
    };
    "prompt_cache_breakpoint"?: GatewayChatPromptCacheBreakpointParam;
    [key: string]: unknown;
  };
  export type GatewayChatChatCompletionRequestMessageContentPartFile = {
    "type": "file";
    "file": {
      "filename"?: string;
      "file_data"?: string;
      "file_id"?: string;
      [key: string]: unknown;
    };
    "prompt_cache_breakpoint"?: GatewayChatPromptCacheBreakpointParam;
    [key: string]: unknown;
  };
  export type GatewayChatChatCompletionRequestMessageContentPartRefusal = {
    "type": "refusal";
    "refusal": string;
    [key: string]: unknown;
  };
  export type GatewayChatModerationInputType = "text" | "image";
  export type GatewayResponsesCreateResponseBody = {
    "model": string;
    "input": (string | ReadonlyArray<GatewayResponsesItemParam>);
    "include"?: ReadonlyArray<GatewayResponsesIncludeEnum>;
    "tools"?: ReadonlyArray<GatewayResponsesResponsesToolParam> | null;
    "tool_choice"?: GatewayResponsesToolChoiceParam;
    "metadata"?: GatewayResponsesMetadataParam;
    "text"?: GatewayResponsesTextParam;
    "temperature"?: number | null;
    "top_p"?: number | null;
    "parallel_tool_calls"?: boolean | null;
    "stream"?: boolean;
    "max_output_tokens"?: number | null;
    "reasoning"?: GatewayResponsesReasoningParam;
    "safety_identifier"?: string | null;
    "prompt_cache_key"?: string | null;
    "truncation"?: GatewayResponsesTruncationEnum;
    "instructions"?: string | null;
    "service_tier"?: GatewayResponsesServiceTierEnum;
    [key: string]: unknown;
  };
  export type GatewayResponsesResponseResource = {
    "id": string;
    "object": "response";
    "created_at": number;
    "completed_at": number | null;
    "status": string;
    "incomplete_details": (GatewayResponsesIncompleteDetails) | null;
    "model": string;
    "previous_response_id": string | null;
    "instructions": (string) | null;
    "output": ReadonlyArray<GatewayResponsesItemField>;
    "error": (GatewayResponsesError) | null;
    "tools": ReadonlyArray<GatewayResponsesTool>;
    "tool_choice": (GatewayResponsesFunctionToolChoice | GatewayResponsesToolChoiceValueEnum | GatewayResponsesAllowedToolChoice);
    "truncation": GatewayResponsesTruncationEnum;
    "parallel_tool_calls": boolean;
    "text": Record<string, unknown>;
    "top_p": number;
    "presence_penalty": number;
    "frequency_penalty": number;
    "top_logprobs": number;
    "temperature": number;
    "reasoning": Record<string, unknown> | null;
    "usage": (GatewayResponsesUsage) | null;
    "max_output_tokens": number | null;
    "max_tool_calls": number | null;
    "store": boolean;
    "background": boolean;
    "service_tier": string;
    "metadata": unknown;
    "safety_identifier": string | null;
    "prompt_cache_key": string | null;
    [key: string]: unknown;
  };
  export type GatewayResponsesResponseStreamEvent = (GatewayResponsesResponseCreatedStreamingEvent | GatewayResponsesResponseQueuedStreamingEvent | GatewayResponsesResponseInProgressStreamingEvent | GatewayResponsesResponseCompletedStreamingEvent | GatewayResponsesResponseFailedStreamingEvent | GatewayResponsesResponseIncompleteStreamingEvent | GatewayResponsesResponseOutputItemAddedStreamingEvent | GatewayResponsesResponseOutputItemDoneStreamingEvent | GatewayResponsesResponseReasoningSummaryPartAddedStreamingEvent | GatewayResponsesResponseReasoningSummaryPartDoneStreamingEvent | GatewayResponsesResponseContentPartAddedStreamingEvent | GatewayResponsesResponseContentPartDoneStreamingEvent | GatewayResponsesResponseOutputTextDeltaStreamingEvent | GatewayResponsesResponseOutputTextDoneStreamingEvent | GatewayResponsesResponseRefusalDeltaStreamingEvent | GatewayResponsesResponseRefusalDoneStreamingEvent | GatewayResponsesResponseReasoningDeltaStreamingEvent | GatewayResponsesResponseReasoningDoneStreamingEvent | GatewayResponsesResponseReasoningSummaryDeltaStreamingEvent | GatewayResponsesResponseReasoningSummaryDoneStreamingEvent | GatewayResponsesResponseOutputTextAnnotationAddedStreamingEvent | GatewayResponsesResponseFunctionCallArgumentsDeltaStreamingEvent | GatewayResponsesResponseFunctionCallArgumentsDoneStreamingEvent | GatewayResponsesResponseCustomToolCallInputDeltaStreamingEvent | GatewayResponsesResponseCustomToolCallInputDoneStreamingEvent | GatewayResponsesErrorStreamingEvent);
  export type GatewayResponsesErrorResponse = {
    "error": GatewayResponsesErrorPayload;
    [key: string]: unknown;
  };
  export type GatewayResponsesItemParam = (GatewayResponsesAdditionalToolsItemParam | GatewayResponsesReasoningItemParam | GatewayResponsesUserMessageItemParam | GatewayResponsesSystemMessageItemParam | GatewayResponsesDeveloperMessageItemParam | GatewayResponsesAssistantMessageItemParam | GatewayResponsesFunctionCallItemParam | GatewayResponsesFunctionCallOutputItemParam | GatewayResponsesCustomToolCallItemParam | GatewayResponsesCustomToolCallOutputItemParam);
  export type GatewayResponsesIncludeEnum = "reasoning.encrypted_content";
  export type GatewayResponsesResponsesToolParam = (GatewayResponsesFunctionToolParam | GatewayResponsesCustomToolParam | GatewayResponsesNamespaceToolParam);
  export type GatewayResponsesToolChoiceParam = (GatewayResponsesSpecificToolChoiceParam | GatewayResponsesToolChoiceValueEnum);
  export type GatewayResponsesMetadataParam = Record<string, string>;
  export type GatewayResponsesTextParam = {
    "format"?: GatewayResponsesTextFormatParam;
    "verbosity"?: GatewayResponsesVerbosityEnum;
    [key: string]: unknown;
  };
  export type GatewayResponsesReasoningParam = {
    "effort"?: (GatewayResponsesReasoningEffortEnum) | null;
    "summary"?: GatewayResponsesReasoningSummaryEnum;
    [key: string]: unknown;
  };
  export type GatewayResponsesTruncationEnum = "disabled";
  export type GatewayResponsesServiceTierEnum = "auto" | "default" | "flex" | "priority";
  export type GatewayResponsesIncompleteDetails = {
    "reason": string;
    [key: string]: unknown;
  };
  export type GatewayResponsesItemField = (GatewayResponsesMessage | GatewayResponsesFunctionCall | GatewayResponsesFunctionCallOutput | GatewayResponsesCustomToolCall | GatewayResponsesReasoningBody);
  export type GatewayResponsesError = {
    "code": string;
    "message": string;
    [key: string]: unknown;
  };
  export type GatewayResponsesTool = (GatewayResponsesFunctionTool);
  export type GatewayResponsesFunctionToolChoice = {
    "type": "function";
    "name"?: string;
    [key: string]: unknown;
  };
  export type GatewayResponsesToolChoiceValueEnum = "none" | "auto" | "required";
  export type GatewayResponsesAllowedToolChoice = {
    "type": "allowed_tools";
    "tools": ReadonlyArray<(GatewayResponsesFunctionToolChoice)>;
    "mode": GatewayResponsesToolChoiceValueEnum;
    [key: string]: unknown;
  };
  export type GatewayResponsesUsage = {
    "input_tokens": number;
    "output_tokens": number;
    "total_tokens": number;
    "input_tokens_details": GatewayResponsesInputTokensDetails;
    "output_tokens_details": GatewayResponsesOutputTokensDetails;
    [key: string]: unknown;
  };
  export type GatewayResponsesResponseCreatedStreamingEvent = {
    "type": "response.created";
    "sequence_number": number;
    "response": GatewayResponsesResponseResource;
    [key: string]: unknown;
  };
  export type GatewayResponsesResponseQueuedStreamingEvent = {
    "type": "response.queued";
    "sequence_number": number;
    "response": GatewayResponsesResponseResource;
    [key: string]: unknown;
  };
  export type GatewayResponsesResponseInProgressStreamingEvent = {
    "type": "response.in_progress";
    "sequence_number": number;
    "response": GatewayResponsesResponseResource;
    [key: string]: unknown;
  };
  export type GatewayResponsesResponseCompletedStreamingEvent = {
    "type": "response.completed";
    "sequence_number": number;
    "response": GatewayResponsesResponseResource;
    [key: string]: unknown;
  };
  export type GatewayResponsesResponseFailedStreamingEvent = {
    "type": "response.failed";
    "sequence_number": number;
    "response": GatewayResponsesResponseResource;
    [key: string]: unknown;
  };
  export type GatewayResponsesResponseIncompleteStreamingEvent = {
    "type": "response.incomplete";
    "sequence_number": number;
    "response": GatewayResponsesResponseResource;
    [key: string]: unknown;
  };
  export type GatewayResponsesResponseOutputItemAddedStreamingEvent = {
    "type": "response.output_item.added";
    "sequence_number": number;
    "output_index": number;
    "item": GatewayResponsesItemField;
    [key: string]: unknown;
  };
  export type GatewayResponsesResponseOutputItemDoneStreamingEvent = {
    "type": "response.output_item.done";
    "sequence_number": number;
    "output_index": number;
    "item": GatewayResponsesItemField;
    [key: string]: unknown;
  };
  export type GatewayResponsesResponseReasoningSummaryPartAddedStreamingEvent = {
    "type": "response.reasoning_summary_part.added";
    "sequence_number": number;
    "item_id": string;
    "output_index": number;
    "summary_index": number;
    "part": (GatewayResponsesInputTextContent | GatewayResponsesOutputTextContent | GatewayResponsesTextContent | GatewayResponsesSummaryTextContent | GatewayResponsesReasoningTextContent | GatewayResponsesRefusalContent | GatewayResponsesInputImageContent | GatewayResponsesInputFileContent);
    [key: string]: unknown;
  };
  export type GatewayResponsesResponseReasoningSummaryPartDoneStreamingEvent = {
    "type": "response.reasoning_summary_part.done";
    "sequence_number": number;
    "item_id": string;
    "output_index": number;
    "summary_index": number;
    "part": (GatewayResponsesInputTextContent | GatewayResponsesOutputTextContent | GatewayResponsesTextContent | GatewayResponsesSummaryTextContent | GatewayResponsesReasoningTextContent | GatewayResponsesRefusalContent | GatewayResponsesInputImageContent | GatewayResponsesInputFileContent);
    [key: string]: unknown;
  };
  export type GatewayResponsesResponseContentPartAddedStreamingEvent = {
    "type": "response.content_part.added";
    "sequence_number": number;
    "item_id": string;
    "output_index": number;
    "content_index": number;
    "part": (GatewayResponsesInputTextContent | GatewayResponsesOutputTextContent | GatewayResponsesTextContent | GatewayResponsesSummaryTextContent | GatewayResponsesReasoningTextContent | GatewayResponsesRefusalContent | GatewayResponsesInputImageContent | GatewayResponsesInputFileContent);
    [key: string]: unknown;
  };
  export type GatewayResponsesResponseContentPartDoneStreamingEvent = {
    "type": "response.content_part.done";
    "sequence_number": number;
    "item_id": string;
    "output_index": number;
    "content_index": number;
    "part": (GatewayResponsesInputTextContent | GatewayResponsesOutputTextContent | GatewayResponsesTextContent | GatewayResponsesSummaryTextContent | GatewayResponsesReasoningTextContent | GatewayResponsesRefusalContent | GatewayResponsesInputImageContent | GatewayResponsesInputFileContent);
    [key: string]: unknown;
  };
  export type GatewayResponsesResponseOutputTextDeltaStreamingEvent = {
    "type": "response.output_text.delta";
    "sequence_number": number;
    "item_id": string;
    "output_index": number;
    "content_index": number;
    "delta": string;
    "logprobs"?: ReadonlyArray<GatewayResponsesLogProb>;
    "obfuscation"?: string;
    [key: string]: unknown;
  };
  export type GatewayResponsesResponseOutputTextDoneStreamingEvent = {
    "type": "response.output_text.done";
    "sequence_number": number;
    "item_id": string;
    "output_index": number;
    "content_index": number;
    "text": string;
    "logprobs"?: ReadonlyArray<GatewayResponsesLogProb>;
    [key: string]: unknown;
  };
  export type GatewayResponsesResponseRefusalDeltaStreamingEvent = {
    "type": "response.refusal.delta";
    "sequence_number": number;
    "item_id": string;
    "output_index": number;
    "content_index": number;
    "delta": string;
    [key: string]: unknown;
  };
  export type GatewayResponsesResponseRefusalDoneStreamingEvent = {
    "type": "response.refusal.done";
    "sequence_number": number;
    "item_id": string;
    "output_index": number;
    "content_index": number;
    "refusal": string;
    [key: string]: unknown;
  };
  export type GatewayResponsesResponseReasoningDeltaStreamingEvent = {
    "type": "response.reasoning.delta";
    "sequence_number": number;
    "item_id": string;
    "output_index": number;
    "content_index": number;
    "delta": string;
    "obfuscation"?: string;
    [key: string]: unknown;
  };
  export type GatewayResponsesResponseReasoningDoneStreamingEvent = {
    "type": "response.reasoning.done";
    "sequence_number": number;
    "item_id": string;
    "output_index": number;
    "content_index": number;
    "text": string;
    [key: string]: unknown;
  };
  export type GatewayResponsesResponseReasoningSummaryDeltaStreamingEvent = {
    "type": "response.reasoning_summary_text.delta";
    "sequence_number": number;
    "item_id": string;
    "output_index": number;
    "summary_index": number;
    "delta": string;
    "obfuscation"?: string;
    [key: string]: unknown;
  };
  export type GatewayResponsesResponseReasoningSummaryDoneStreamingEvent = {
    "type": "response.reasoning_summary_text.done";
    "sequence_number": number;
    "item_id": string;
    "output_index": number;
    "summary_index": number;
    "text": string;
    [key: string]: unknown;
  };
  export type GatewayResponsesResponseOutputTextAnnotationAddedStreamingEvent = {
    "type": "response.output_text.annotation.added";
    "sequence_number": number;
    "item_id": string;
    "output_index": number;
    "content_index": number;
    "annotation_index": number;
    "annotation": GatewayResponsesAnnotation;
    [key: string]: unknown;
  };
  export type GatewayResponsesResponseFunctionCallArgumentsDeltaStreamingEvent = {
    "type": "response.function_call_arguments.delta";
    "sequence_number": number;
    "item_id": string;
    "output_index": number;
    "delta": string;
    "obfuscation"?: string;
    [key: string]: unknown;
  };
  export type GatewayResponsesResponseFunctionCallArgumentsDoneStreamingEvent = {
    "type": "response.function_call_arguments.done";
    "sequence_number": number;
    "item_id": string;
    "output_index": number;
    "arguments": string;
    [key: string]: unknown;
  };
  export type GatewayResponsesResponseCustomToolCallInputDeltaStreamingEvent = {
    "type": "response.custom_tool_call_input.delta";
    "sequence_number": number;
    "item_id": string;
    "output_index": number;
    "delta": string;
    [key: string]: unknown;
  };
  export type GatewayResponsesResponseCustomToolCallInputDoneStreamingEvent = {
    "type": "response.custom_tool_call_input.done";
    "sequence_number": number;
    "item_id": string;
    "output_index": number;
    "input": string;
    [key: string]: unknown;
  };
  export type GatewayResponsesErrorStreamingEvent = {
    "type": "error";
    "sequence_number": number;
    "error": GatewayResponsesErrorPayload;
    [key: string]: unknown;
  };
  export type GatewayResponsesErrorPayload = {
    "type": string;
    "code": string | null;
    "message": string;
    "param": string | null;
    "headers"?: Record<string, string>;
    [key: string]: unknown;
  };
  export type GatewayResponsesAdditionalToolsItemParam = {
    "type": "additional_tools";
    "role"?: string;
    "tools": ReadonlyArray<GatewayResponsesResponsesToolParam>;
    [key: string]: unknown;
  };
  export type GatewayResponsesReasoningItemParam = {
    "id"?: string | null;
    "type": "reasoning";
    "summary": ReadonlyArray<GatewayResponsesReasoningSummaryContentParam>;
    "content"?: unknown | null;
    "encrypted_content"?: string | null;
    [key: string]: unknown;
  };
  export type GatewayResponsesUserMessageItemParam = {
    "id"?: string | null;
    "type": "message";
    "role": "user";
    "content": (ReadonlyArray<(GatewayResponsesInputTextContentParam | GatewayResponsesInputImageContentParamAutoParam)> | string);
    "status"?: string | null;
    [key: string]: unknown;
  };
  export type GatewayResponsesSystemMessageItemParam = {
    "id"?: string | null;
    "type": "message";
    "role": "system";
    "content": (ReadonlyArray<(GatewayResponsesInputTextContentParam)> | string);
    "status"?: string | null;
    [key: string]: unknown;
  };
  export type GatewayResponsesDeveloperMessageItemParam = {
    "id"?: string | null;
    "type": "message";
    "role": "developer";
    "content": (ReadonlyArray<(GatewayResponsesInputTextContentParam)> | string);
    "status"?: string | null;
    [key: string]: unknown;
  };
  export type GatewayResponsesAssistantMessageItemParam = {
    "id"?: string | null;
    "type": "message";
    "role": "assistant";
    "content": (ReadonlyArray<(GatewayResponsesOutputTextContentParam | GatewayResponsesRefusalContentParam)> | string);
    "phase"?: "commentary" | "final_answer";
    "status"?: string | null;
    [key: string]: unknown;
  };
  export type GatewayResponsesFunctionCallItemParam = {
    "id"?: string | null;
    "call_id": string;
    "type": "function_call";
    "name": string;
    "arguments": string;
    "namespace"?: string;
    "status"?: GatewayResponsesFunctionCallStatus;
    [key: string]: unknown;
  };
  export type GatewayResponsesFunctionCallOutputItemParam = {
    "id"?: string | null;
    "call_id": string;
    "type": "function_call_output";
    "output": (string | ReadonlyArray<(GatewayResponsesInputTextContentParam | GatewayResponsesInputImageContentParamAutoParam)>);
    "status"?: GatewayResponsesFunctionCallStatus;
    [key: string]: unknown;
  };
  export type GatewayResponsesCustomToolCallItemParam = {
    "id"?: string | null;
    "call_id": string;
    "type": "custom_tool_call";
    "name": string;
    "input": string;
    "namespace"?: string;
    "status"?: GatewayResponsesFunctionCallStatus;
    [key: string]: unknown;
  };
  export type GatewayResponsesCustomToolCallOutputItemParam = {
    "id"?: string | null;
    "call_id": string;
    "type": "custom_tool_call_output";
    "output": (string | ReadonlyArray<(GatewayResponsesInputTextContentParam | GatewayResponsesInputImageContentParamAutoParam)>);
    "status"?: GatewayResponsesFunctionCallStatus;
    [key: string]: unknown;
  };
  export type GatewayResponsesFunctionToolParam = {
    "name": string;
    "description": string;
    "parameters"?: Record<string, unknown> | null;
    "strict"?: boolean;
    "type": "function";
    [key: string]: unknown;
  };
  export type GatewayResponsesCustomToolParam = {
    "name": string;
    "description"?: string | null;
    "format"?: Record<string, unknown> | null;
    "type": "custom";
    [key: string]: unknown;
  };
  export type GatewayResponsesNamespaceToolParam = {
    "name": string;
    "description"?: string | null;
    "tools": ReadonlyArray<GatewayResponsesFunctionToolParam>;
    "type": "namespace";
    [key: string]: unknown;
  };
  export type GatewayResponsesSpecificToolChoiceParam = (GatewayResponsesSpecificFunctionParam);
  export type GatewayResponsesTextFormatParam = (GatewayResponsesTextResponseFormat | GatewayResponsesJsonSchemaResponseFormatParam);
  export type GatewayResponsesVerbosityEnum = "low" | "medium" | "high";
  export type GatewayResponsesReasoningEffortEnum = "none" | "low" | "medium" | "high" | "xhigh";
  export type GatewayResponsesReasoningSummaryEnum = "concise" | "detailed" | "auto";
  export type GatewayResponsesMessage = {
    "type": "message";
    "id": string;
    "status": GatewayResponsesMessageStatus;
    "role": GatewayResponsesMessageRole;
    "content": ReadonlyArray<(GatewayResponsesInputTextContent | GatewayResponsesOutputTextContent | GatewayResponsesTextContent | GatewayResponsesSummaryTextContent | GatewayResponsesReasoningTextContent | GatewayResponsesRefusalContent | GatewayResponsesInputImageContent | GatewayResponsesInputFileContent | GatewayResponsesInputVideoContent)>;
    "phase"?: "commentary" | "final_answer";
    [key: string]: unknown;
  };
  export type GatewayResponsesFunctionCall = {
    "type": "function_call";
    "id": string;
    "call_id": string;
    "name": string;
    "arguments": string;
    "namespace"?: string;
    "status": GatewayResponsesFunctionCallStatus;
    [key: string]: unknown;
  };
  export type GatewayResponsesFunctionCallOutput = {
    "type": "function_call_output";
    "id": string;
    "call_id": string;
    "output": (string | ReadonlyArray<(GatewayResponsesInputTextContent | GatewayResponsesInputImageContent | GatewayResponsesInputFileContent)>);
    "status": GatewayResponsesFunctionCallOutputStatusEnum;
    [key: string]: unknown;
  };
  export type GatewayResponsesCustomToolCall = {
    "type": "custom_tool_call";
    "id": string;
    "call_id": string;
    "name": string;
    "input": string;
    "namespace"?: string;
    "status": GatewayResponsesFunctionCallStatus;
    [key: string]: unknown;
  };
  export type GatewayResponsesReasoningBody = {
    "type": "reasoning";
    "id": string;
    "content"?: ReadonlyArray<(GatewayResponsesInputTextContent | GatewayResponsesOutputTextContent | GatewayResponsesTextContent | GatewayResponsesSummaryTextContent | GatewayResponsesReasoningTextContent | GatewayResponsesRefusalContent | GatewayResponsesInputImageContent | GatewayResponsesInputFileContent)>;
    "summary": ReadonlyArray<(GatewayResponsesInputTextContent | GatewayResponsesOutputTextContent | GatewayResponsesTextContent | GatewayResponsesSummaryTextContent | GatewayResponsesReasoningTextContent | GatewayResponsesRefusalContent | GatewayResponsesInputImageContent | GatewayResponsesInputFileContent)>;
    "encrypted_content"?: string;
    "status"?: GatewayResponsesMessageStatus;
    [key: string]: unknown;
  };
  export type GatewayResponsesFunctionTool = {
    "type": "function";
    "name": string;
    "description": string | null;
    "parameters": Record<string, unknown> | null;
    "strict": boolean | null;
    [key: string]: unknown;
  };
  export type GatewayResponsesInputTokensDetails = {
    "cached_tokens": number;
    "cache_write_tokens"?: number;
    [key: string]: unknown;
  };
  export type GatewayResponsesOutputTokensDetails = {
    "reasoning_tokens": number;
    [key: string]: unknown;
  };
  export type GatewayResponsesInputTextContent = {
    "type": "input_text";
    "text": string;
    [key: string]: unknown;
  };
  export type GatewayResponsesOutputTextContent = {
    "type": "output_text";
    "text": string;
    "annotations": ReadonlyArray<GatewayResponsesAnnotation>;
    "logprobs"?: ReadonlyArray<GatewayResponsesLogProb>;
    [key: string]: unknown;
  };
  export type GatewayResponsesTextContent = {
    "type": "text";
    "text": string;
    [key: string]: unknown;
  };
  export type GatewayResponsesSummaryTextContent = {
    "type": "summary_text";
    "text": string;
    [key: string]: unknown;
  };
  export type GatewayResponsesReasoningTextContent = {
    "type": "reasoning_text";
    "text": string;
    [key: string]: unknown;
  };
  export type GatewayResponsesRefusalContent = {
    "type": "refusal";
    "refusal": string;
    [key: string]: unknown;
  };
  export type GatewayResponsesInputImageContent = {
    "type": "input_image";
    "image_url": string | null;
    "detail": GatewayResponsesImageDetail;
    [key: string]: unknown;
  };
  export type GatewayResponsesInputFileContent = {
    "type": "input_file";
    "filename"?: string;
    "file_url"?: string;
    [key: string]: unknown;
  };
  export type GatewayResponsesLogProb = {
    "token": string;
    "logprob": number;
    "bytes": ReadonlyArray<number>;
    "top_logprobs": ReadonlyArray<GatewayResponsesTopLogProb>;
    [key: string]: unknown;
  };
  export type GatewayResponsesAnnotation = (GatewayResponsesUrlCitationBody);
  export type GatewayResponsesReasoningSummaryContentParam = {
    "type": "summary_text";
    "text": string;
    [key: string]: unknown;
  };
  export type GatewayResponsesInputTextContentParam = {
    "type": "input_text";
    "text": string;
    [key: string]: unknown;
  };
  export type GatewayResponsesInputImageContentParamAutoParam = {
    "type": "input_image";
    "image_url"?: string | null;
    "detail"?: GatewayResponsesImageDetail;
    [key: string]: unknown;
  };
  export type GatewayResponsesOutputTextContentParam = {
    "type": "output_text";
    "text": string;
    "annotations"?: (ReadonlyArray<GatewayResponsesUrlCitationParam>);
    [key: string]: unknown;
  };
  export type GatewayResponsesRefusalContentParam = {
    "type": "refusal";
    "refusal": string;
    [key: string]: unknown;
  };
  export type GatewayResponsesFunctionCallStatus = "in_progress" | "completed" | "incomplete";
  export type GatewayResponsesSpecificFunctionParam = {
    "type": "function";
    "name": string;
    [key: string]: unknown;
  };
  export type GatewayResponsesTextResponseFormat = {
    "type": "text";
    [key: string]: unknown;
  };
  export type GatewayResponsesJsonSchemaResponseFormatParam = {
    "type": "json_schema";
    "description"?: string;
    "name": string;
    "schema": Record<string, unknown>;
    "strict"?: true;
    [key: string]: unknown;
  };
  export type GatewayResponsesMessageStatus = "in_progress" | "completed" | "incomplete";
  export type GatewayResponsesMessageRole = "user" | "assistant" | "system" | "developer";
  export type GatewayResponsesInputVideoContent = {
    "type": "input_video";
    "video_url": string;
    [key: string]: unknown;
  };
  export type GatewayResponsesFunctionCallOutputStatusEnum = "in_progress" | "completed" | "incomplete";
  export type GatewayResponsesImageDetail = "low" | "high" | "auto";
  export type GatewayResponsesTopLogProb = {
    "token": string;
    "logprob": number;
    "bytes": ReadonlyArray<number>;
    [key: string]: unknown;
  };
  export type GatewayResponsesUrlCitationBody = {
    "type": "url_citation";
    "url": string;
    "start_index": number;
    "end_index": number;
    "title": string;
    [key: string]: unknown;
  };
  export type GatewayResponsesUrlCitationParam = {
    "type": "url_citation";
    "start_index": number;
    "end_index": number;
    "url": string;
    "title": string;
    [key: string]: unknown;
  };
  export type GatewayMessagesCreateMessageRequest = {
    "model": string;
    "max_tokens": number;
    "messages": ReadonlyArray<GatewayMessagesInputMessage>;
    "system"?: (string | ReadonlyArray<GatewayMessagesTextBlock>);
    "temperature"?: number;
    "top_p"?: number;
    "top_k"?: number;
    "stop_sequences"?: ReadonlyArray<string>;
    "stream"?: boolean;
    "tools"?: ReadonlyArray<GatewayMessagesTool>;
    "tool_choice"?: GatewayMessagesToolChoice;
    "metadata"?: GatewayMessagesRequestMetadata;
    "thinking"?: GatewayMessagesThinkingConfig;
    "service_tier"?: "auto" | "standard_only";
    "cache_control"?: GatewayMessagesCacheControl;
    "output_config"?: GatewayMessagesOutputConfig;
    "context_management"?: Record<string, unknown>;
    "container"?: unknown;
    "inference_geo"?: string;
    "mcp_servers"?: unknown;
    "speed"?: "standard" | "fast";
    "fallbacks"?: unknown;
    "fallback_credit_token"?: string;
    [key: string]: unknown;
  };
  export type GatewayMessagesMessage = {
    "id": string;
    "type": "message";
    "role": "assistant";
    "model": string;
    "content": ReadonlyArray<GatewayMessagesContentBlock>;
    "stop_reason": "end_turn" | "max_tokens" | "stop_sequence" | "tool_use" | "pause_turn" | "refusal" | "model_context_window_exceeded";
    "stop_sequence": string | null;
    "usage": GatewayMessagesUsage;
    [key: string]: unknown;
  };
  export type GatewayMessagesErrorResponse = {
    "type": "error";
    "error": GatewayMessagesErrorObject;
    [key: string]: unknown;
  };
  export type GatewayMessagesInputMessage = {
    "role": "user" | "assistant" | "system";
    "content": (string | ReadonlyArray<GatewayMessagesInputContentBlock>);
    [key: string]: unknown;
  };
  export type GatewayMessagesTextBlock = {
    "type": "text";
    "text": string;
    "cache_control"?: GatewayMessagesCacheControl;
    [key: string]: unknown;
  };
  export type GatewayMessagesTool = {
    "type"?: "custom";
    "name": string;
    "description"?: string;
    "input_schema": Record<string, unknown>;
    "cache_control"?: GatewayMessagesCacheControl;
    "strict"?: boolean;
    "defer_loading"?: boolean;
    "input_examples"?: unknown;
    "eager_input_streaming"?: boolean;
    "allowed_callers"?: unknown;
    [key: string]: unknown;
  };
  export type GatewayMessagesToolChoice = (GatewayMessagesToolChoiceAuto | GatewayMessagesToolChoiceAny | GatewayMessagesToolChoiceTool | GatewayMessagesToolChoiceNone);
  export type GatewayMessagesRequestMetadata = {
    "user_id"?: string | null;
    [key: string]: unknown;
  };
  export type GatewayMessagesThinkingConfig = (GatewayMessagesThinkingConfigEnabled | GatewayMessagesThinkingConfigAdaptive | GatewayMessagesThinkingConfigDisabled);
  export type GatewayMessagesCacheControl = {
    "type": "ephemeral";
    "ttl"?: "5m" | "1h";
    [key: string]: unknown;
  };
  export type GatewayMessagesOutputConfig = {
    "format"?: GatewayMessagesOutputConfigFormat;
    "effort"?: "low" | "medium" | "high" | "xhigh" | "max";
    "task_budget"?: unknown;
    [key: string]: unknown;
  };
  export type GatewayMessagesContentBlock = (GatewayMessagesTextBlock | GatewayMessagesToolUseBlock | GatewayMessagesThinkingBlock);
  export type GatewayMessagesUsage = {
    "input_tokens": number;
    "output_tokens": number;
    "cache_creation_input_tokens": number | null;
    "cache_read_input_tokens": number | null;
    "cache_creation"?: GatewayMessagesCacheCreation;
    "service_tier"?: string;
    [key: string]: unknown;
  };
  export type GatewayMessagesErrorObject = {
    "type": "invalid_request_error" | "authentication_error" | "permission_error" | "not_found_error" | "request_too_large" | "rate_limit_error" | "api_error" | "timeout_error" | "overloaded_error";
    "message": string;
    [key: string]: unknown;
  };
  export type GatewayMessagesInputContentBlock = (GatewayMessagesTextBlock | GatewayMessagesImageBlock | GatewayMessagesDocumentBlock | GatewayMessagesSearchResultBlock | GatewayMessagesToolUseBlock | GatewayMessagesToolResultBlock | GatewayMessagesThinkingBlock | GatewayMessagesRedactedThinkingBlock);
  export type GatewayMessagesToolChoiceAuto = {
    "type": "auto";
    "disable_parallel_tool_use"?: boolean;
    [key: string]: unknown;
  };
  export type GatewayMessagesToolChoiceAny = {
    "type": "any";
    "disable_parallel_tool_use"?: boolean;
    [key: string]: unknown;
  };
  export type GatewayMessagesToolChoiceTool = {
    "type": "tool";
    "name": string;
    "disable_parallel_tool_use"?: boolean;
    [key: string]: unknown;
  };
  export type GatewayMessagesToolChoiceNone = {
    "type": "none";
    [key: string]: unknown;
  };
  export type GatewayMessagesThinkingConfigEnabled = {
    "type": "enabled";
    "budget_tokens": number;
    "display"?: GatewayMessagesThinkingDisplay;
    [key: string]: unknown;
  };
  export type GatewayMessagesThinkingConfigAdaptive = {
    "type": "adaptive";
    "display"?: GatewayMessagesThinkingDisplay;
    [key: string]: unknown;
  };
  export type GatewayMessagesThinkingConfigDisabled = {
    "type": "disabled";
    [key: string]: unknown;
  };
  export type GatewayMessagesOutputConfigFormat = {
    "type": "json_schema";
    "schema": Record<string, unknown>;
    [key: string]: unknown;
  };
  export type GatewayMessagesToolUseBlock = {
    "type": "tool_use";
    "id": string;
    "name": string;
    "input": Record<string, unknown>;
    "cache_control"?: GatewayMessagesCacheControl;
    [key: string]: unknown;
  };
  export type GatewayMessagesThinkingBlock = {
    "type": "thinking";
    "thinking": string;
    "signature": string;
    [key: string]: unknown;
  };
  export type GatewayMessagesCacheCreation = {
    "ephemeral_5m_input_tokens": number;
    "ephemeral_1h_input_tokens": number;
    [key: string]: unknown;
  };
  export type GatewayMessagesImageBlock = {
    "type": "image";
    "source": GatewayMessagesImageSource;
    "cache_control"?: GatewayMessagesCacheControl;
    [key: string]: unknown;
  };
  export type GatewayMessagesDocumentBlock = {
    "type": "document";
    "source": GatewayMessagesDocumentSource;
    "title"?: string | null;
    "context"?: string | null;
    "citations"?: unknown;
    "cache_control"?: GatewayMessagesCacheControl;
    [key: string]: unknown;
  };
  export type GatewayMessagesSearchResultBlock = {
    "type": "search_result";
    "source": string;
    "title": string;
    "content": ReadonlyArray<GatewayMessagesSearchResultTextBlock>;
    "citations"?: unknown;
    "cache_control"?: GatewayMessagesCacheControl;
    [key: string]: unknown;
  };
  export type GatewayMessagesToolResultBlock = {
    "type": "tool_result";
    "tool_use_id": string;
    "content"?: (string | ReadonlyArray<GatewayMessagesToolResultContentBlock>);
    "is_error"?: boolean;
    "cache_control"?: GatewayMessagesCacheControl;
    [key: string]: unknown;
  };
  export type GatewayMessagesRedactedThinkingBlock = {
    "type": "redacted_thinking";
    "data": string;
    [key: string]: unknown;
  };
  export type GatewayMessagesThinkingDisplay = "summarized" | "omitted";
  export type GatewayMessagesImageSource = (GatewayMessagesBase64ImageSource | GatewayMessagesURLImageSource);
  export type GatewayMessagesDocumentSource = (GatewayMessagesBase64DocumentSource | GatewayMessagesPlainTextDocumentSource | GatewayMessagesURLDocumentSource);
  export type GatewayMessagesSearchResultTextBlock = {
    "type": "text";
    "text": string;
    [key: string]: unknown;
  };
  export type GatewayMessagesToolResultContentBlock = (GatewayMessagesTextBlock | GatewayMessagesImageBlock | GatewayMessagesDocumentBlock | GatewayMessagesSearchResultBlock);
  export type GatewayMessagesBase64ImageSource = {
    "type": "base64";
    "media_type": "image/jpeg" | "image/png" | "image/gif" | "image/webp";
    "data": string;
    [key: string]: unknown;
  };
  export type GatewayMessagesURLImageSource = {
    "type": "url";
    "url": string;
    [key: string]: unknown;
  };
  export type GatewayMessagesBase64DocumentSource = {
    "type": "base64";
    "media_type": "application/pdf";
    "data": string;
    [key: string]: unknown;
  };
  export type GatewayMessagesPlainTextDocumentSource = {
    "type": "text";
    "media_type": "text/plain";
    "data": string;
    [key: string]: unknown;
  };
  export type GatewayMessagesURLDocumentSource = {
    "type": "url";
    "url": string;
    [key: string]: unknown;
  };
  export type GatewayModelsModelList = {
    "object": string;
    "data": ReadonlyArray<GatewayModelsModel>;
    [key: string]: unknown;
  };
  export type GatewayModelsModel = {
    "id": string;
    "object": string;
    "created": number;
    "owned_by": string;
    "pricing": GatewayModelsModelPricing;
    [key: string]: unknown;
  };
  export type GatewayModelsModelPricing = {
    "input": number;
    "output": number;
    "cache_write"?: number;
    "cache_read"?: number;
    "unit": "usd_per_1m_tokens";
    [key: string]: unknown;
  };
  export type GatewayModelModel = {
    "id": string;
    "object": string;
    "created": number;
    "owned_by": string;
    "pricing": GatewayModelModelPricing;
    [key: string]: unknown;
  };
  export type GatewayModelErrorResponse = {
    "error": GatewayModelError;
    [key: string]: unknown;
  };
  export type GatewayModelModelPricing = {
    "input": number;
    "output": number;
    "cache_write"?: number;
    "cache_read"?: number;
    "unit": "usd_per_1m_tokens";
    [key: string]: unknown;
  };
  export type GatewayModelError = {
    "code": string | null;
    "message": string;
    "param": string | null;
    "type": string;
    [key: string]: unknown;
  };
  export type AuthGenerateGenerateAuthTokenRequest = {
    "token_name"?: string;
    [key: string]: unknown;
  };
  export type AuthGenerateGenerateAuthTokenResponse = {
    "auth_token": string;
    "created_at_epoch_seconds": number;
    "token_name"?: string;
    [key: string]: unknown;
  };
  export type AuthRevokeRevokeAuthTokenRequest = {
    "auth_token": string;
    [key: string]: unknown;
  };
}

export type PerplexityChatCompletionsBody = PerplexitySchemas.CoreApiChatCompletionsRequest & { stream?: false };
export type PerplexityChatCompletionsInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { body: PerplexityChatCompletionsBody; };
export type PerplexityChatCompletionsResponse = PerplexitySchemas.CoreCompletionResponse;
export type PerplexityChatCompletionsStreamBody = PerplexitySchemas.CoreApiChatCompletionsRequest & { stream?: true };
export type PerplexityChatCompletionsStreamInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { body: PerplexityChatCompletionsStreamBody; };
export type PerplexityChatCompletionsStreamResponse = AsyncIterable<NativeSSEEvent>;
export type PerplexitySearchBody = PerplexitySchemas.CoreApiSearchRequest;
export type PerplexitySearchInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { body: PerplexitySearchBody; };
export type PerplexitySearchResponse = PerplexitySchemas.CoreApiSearchResponse;
export type PerplexityCreateEmbeddingsBody = PerplexitySchemas.CoreEmbeddingsRequest;
export type PerplexityCreateEmbeddingsInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { body: PerplexityCreateEmbeddingsBody; };
export type PerplexityCreateEmbeddingsResponse = PerplexitySchemas.CoreEmbeddingsResponse;
export type PerplexityCreateContextualizedEmbeddingsBody = PerplexitySchemas.CoreContextualizedEmbeddingsRequest;
export type PerplexityCreateContextualizedEmbeddingsInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { body: PerplexityCreateContextualizedEmbeddingsBody; };
export type PerplexityCreateContextualizedEmbeddingsResponse = PerplexitySchemas.CoreContextualizedEmbeddingsResponse;
export type PerplexityGetAsyncChatCompletionPath = { "api_request": string; };
export type PerplexityGetAsyncChatCompletionInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { path: PerplexityGetAsyncChatCompletionPath; };
export type PerplexityGetAsyncChatCompletionResponse = PerplexitySchemas.CoreAsyncApiChatCompletionsResponse;
export type PerplexityListAsyncChatCompletionsInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & {  };
export type PerplexityListAsyncChatCompletionsResponse = PerplexitySchemas.CoreListAsyncApiChatCompletionsResponse;
export type PerplexityCreateAsyncChatCompletionBody = PerplexitySchemas.CoreAsyncApiChatCompletionsRequest;
export type PerplexityCreateAsyncChatCompletionInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { body: PerplexityCreateAsyncChatCompletionBody; };
export type PerplexityCreateAsyncChatCompletionResponse = PerplexitySchemas.CoreAsyncApiChatCompletionsResponse;
export type PerplexityCreateAgentBody = PerplexitySchemas.CoreResponsesRequest & { stream?: false };
export type PerplexityCreateAgentInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { body: PerplexityCreateAgentBody; };
export type PerplexityCreateAgentResponse = PerplexitySchemas.CoreResponsesResponse;
export type PerplexityCreateAgentStreamBody = PerplexitySchemas.CoreResponsesRequest & { stream?: true };
export type PerplexityCreateAgentStreamInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { body: PerplexityCreateAgentStreamBody; };
export type PerplexityCreateAgentStreamResponse = AsyncIterable<NativeSSEEvent>;
export type PerplexityRetrieveAgentPath = { "id": string; };
export type PerplexityRetrieveAgentInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { path: PerplexityRetrieveAgentPath; };
export type PerplexityRetrieveAgentResponse = PerplexitySchemas.CoreResponsesResponse;
export type PerplexityListAgentFilesPath = { "id": string; };
export type PerplexityListAgentFilesInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { path: PerplexityListAgentFilesPath; };
export type PerplexityListAgentFilesResponse = PerplexitySchemas.CoreResponseFileList;
export type PerplexityDownloadAgentFilePath = { "id": string; "file_id": string; };
export type PerplexityDownloadAgentFileInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { path: PerplexityDownloadAgentFilePath; };
export type PerplexityDownloadAgentFileResponse = Uint8Array;
export type PerplexityCancelAgentResponsePath = { "id": string; };
export type PerplexityCancelAgentResponseInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { path: PerplexityCancelAgentResponsePath; };
export type PerplexityCancelAgentResponseResponse = {
  "response_id": string;
  "status": "cancelling";
  [key: string]: unknown;
};
export type PerplexityListModelsInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & {  };
export type PerplexityListModelsResponse = PerplexitySchemas.CoreListModelsResponse;
export type PerplexityGetComputerUsageAnalyticsQuery = { "dataset": "credit_usage" | "connectors" | "artifacts" | "skills" | "spaces" | "workflows" | "task_durations" | "query_volume" | "daily_active_users"; "start_time": number; "end_time"?: number; "bucket_width"?: "1d" | "1h"; "limit"?: number; "page"?: string; "user_email"?: string; };
export type PerplexityGetComputerUsageAnalyticsInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { query: PerplexityGetComputerUsageAnalyticsQuery; };
export type PerplexityGetComputerUsageAnalyticsResponse = PerplexitySchemas.CoreComputerUsageResponse;
export type PerplexityGetComputerUsageAnalytics2Query = { "dataset": "credit_usage" | "query_volume"; "group_by": "user_email"; "start_time": number; "end_time"?: number; "limit"?: number; "page"?: string; };
export type PerplexityGetComputerUsageAnalytics2Input = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { query: PerplexityGetComputerUsageAnalytics2Query; };
export type PerplexityGetComputerUsageAnalytics2Response = PerplexitySchemas.CoreComputerUsageV2Response;
export type PerplexityListSkillsQuery = { "limit"?: number; "page_token"?: string; };
export type PerplexityListSkillsInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { query?: PerplexityListSkillsQuery; };
export type PerplexityListSkillsResponse = PerplexitySchemas.CoreSkillList;
export type PerplexityCreateSkillInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { rawBody: FormData; };
export type PerplexityCreateSkillResponse = PerplexitySchemas.CoreManagedSkill;
export type PerplexityGetSkillPath = { "skill_id": string; };
export type PerplexityGetSkillQuery = { "revision"?: string; };
export type PerplexityGetSkillInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { path: PerplexityGetSkillPath; query?: PerplexityGetSkillQuery; };
export type PerplexityGetSkillResponse = PerplexitySchemas.CoreManagedSkill;
export type PerplexityUpdateSkillPath = { "skill_id": string; };
export type PerplexityUpdateSkillQuery = { "expected_revision": string; };
export type PerplexityUpdateSkillInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { path: PerplexityUpdateSkillPath; query: PerplexityUpdateSkillQuery; rawBody: FormData; };
export type PerplexityUpdateSkillResponse = PerplexitySchemas.CoreManagedSkill;
export type PerplexityDeleteSkillPath = { "skill_id": string; };
export type PerplexityDeleteSkillQuery = { "expected_revision": string; };
export type PerplexityDeleteSkillInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { path: PerplexityDeleteSkillPath; query: PerplexityDeleteSkillQuery; };
export type PerplexityDeleteSkillResponse = null;
export type PerplexityListSkillRevisionsPath = { "skill_id": string; };
export type PerplexityListSkillRevisionsQuery = { "limit"?: number; "page_token"?: string; };
export type PerplexityListSkillRevisionsInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { path: PerplexityListSkillRevisionsPath; query?: PerplexityListSkillRevisionsQuery; };
export type PerplexityListSkillRevisionsResponse = PerplexitySchemas.CoreSkillRevisionList;
export type PerplexityDownloadSkillPath = { "skill_id": string; };
export type PerplexityDownloadSkillQuery = { "revision"?: string; };
export type PerplexityDownloadSkillInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { path: PerplexityDownloadSkillPath; query?: PerplexityDownloadSkillQuery; };
export type PerplexityDownloadSkillResponse = PerplexitySchemas.CoreSkillDownload;
export type PerplexityAnswerQuestionsBody = PerplexitySchemas.CoreDecisionsRequest;
export type PerplexityAnswerQuestionsInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { body: PerplexityAnswerQuestionsBody; };
export type PerplexityAnswerQuestionsResponse = PerplexitySchemas.CoreDecisionsResponse;
export type PerplexityRouterChatCompletionsBody = PerplexitySchemas.GatewayChatCreateChatCompletionRequest & { stream?: false };
export type PerplexityRouterChatCompletionsInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { body: PerplexityRouterChatCompletionsBody; };
export type PerplexityRouterChatCompletionsResponse = PerplexitySchemas.GatewayChatCreateChatCompletionResponse;
export type PerplexityRouterChatCompletionsStreamBody = PerplexitySchemas.GatewayChatCreateChatCompletionRequest & { stream?: true };
export type PerplexityRouterChatCompletionsStreamInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { body: PerplexityRouterChatCompletionsStreamBody; };
export type PerplexityRouterChatCompletionsStreamResponse = AsyncIterable<NativeSSEEvent>;
export type PerplexityRouterResponsesBody = PerplexitySchemas.GatewayResponsesCreateResponseBody & { stream?: false };
export type PerplexityRouterResponsesInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { body: PerplexityRouterResponsesBody; };
export type PerplexityRouterResponsesResponse = PerplexitySchemas.GatewayResponsesResponseResource;
export type PerplexityRouterResponsesStreamBody = PerplexitySchemas.GatewayResponsesCreateResponseBody & { stream?: true };
export type PerplexityRouterResponsesStreamInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { body: PerplexityRouterResponsesStreamBody; };
export type PerplexityRouterResponsesStreamResponse = AsyncIterable<NativeSSEEvent>;
export type PerplexityRouterMessagesBody = PerplexitySchemas.GatewayMessagesCreateMessageRequest & { stream?: false };
export type PerplexityRouterMessagesInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { body: PerplexityRouterMessagesBody; };
export type PerplexityRouterMessagesResponse = PerplexitySchemas.GatewayMessagesMessage;
export type PerplexityRouterMessagesStreamBody = PerplexitySchemas.GatewayMessagesCreateMessageRequest & { stream?: true };
export type PerplexityRouterMessagesStreamInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { body: PerplexityRouterMessagesStreamBody; };
export type PerplexityRouterMessagesStreamResponse = AsyncIterable<NativeSSEEvent>;
export type PerplexityListRouterModelsInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & {  };
export type PerplexityListRouterModelsResponse = PerplexitySchemas.GatewayModelsModelList;
export type PerplexityGetRouterModelPath = { "model": string; };
export type PerplexityGetRouterModelInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { path: PerplexityGetRouterModelPath; };
export type PerplexityGetRouterModelResponse = PerplexitySchemas.GatewayModelModel;
export type PerplexityGenerateAuthTokenBody = PerplexitySchemas.AuthGenerateGenerateAuthTokenRequest;
export type PerplexityGenerateAuthTokenInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { body?: PerplexityGenerateAuthTokenBody; };
export type PerplexityGenerateAuthTokenResponse = PerplexitySchemas.AuthGenerateGenerateAuthTokenResponse;
export type PerplexityRevokeAuthTokenBody = PerplexitySchemas.AuthRevokeRevokeAuthTokenRequest;
export type PerplexityRevokeAuthTokenInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { body: PerplexityRevokeAuthTokenBody; };
export type PerplexityRevokeAuthTokenResponse = null;


export const perplexityOperations = Object.freeze({
  chatCompletions: Object.freeze({"id":"perplexity.chatCompletions","method":"POST","path":"/v1/sonar","retryable":false}),
  chatCompletionsStream: Object.freeze({"id":"perplexity.chatCompletionsStream","method":"POST","path":"/v1/sonar","retryable":false,"response":"sse"}),
  search: Object.freeze({"id":"perplexity.search","method":"POST","path":"/search","retryable":false}),
  createEmbeddings: Object.freeze({"id":"perplexity.createEmbeddings","method":"POST","path":"/v1/embeddings","retryable":false}),
  createContextualizedEmbeddings: Object.freeze({"id":"perplexity.createContextualizedEmbeddings","method":"POST","path":"/v1/contextualizedembeddings","retryable":false}),
  getAsyncChatCompletion: Object.freeze({"id":"perplexity.getAsyncChatCompletion","method":"GET","path":"/v1/async/sonar/{api_request}","retryable":true}),
  listAsyncChatCompletions: Object.freeze({"id":"perplexity.listAsyncChatCompletions","method":"GET","path":"/v1/async/sonar","retryable":true}),
  createAsyncChatCompletion: Object.freeze({"id":"perplexity.createAsyncChatCompletion","method":"POST","path":"/v1/async/sonar","retryable":false}),
  createAgent: Object.freeze({"id":"perplexity.createAgent","method":"POST","path":"/v1/agent","retryable":false}),
  createAgentStream: Object.freeze({"id":"perplexity.createAgentStream","method":"POST","path":"/v1/agent","retryable":false,"response":"sse"}),
  retrieveAgent: Object.freeze({"id":"perplexity.retrieveAgent","method":"GET","path":"/v1/agent/{id}","retryable":true}),
  listAgentFiles: Object.freeze({"id":"perplexity.listAgentFiles","method":"GET","path":"/v1/agent/{id}/files","retryable":true}),
  downloadAgentFile: Object.freeze({"id":"perplexity.downloadAgentFile","method":"GET","path":"/v1/agent/{id}/files/{file_id}/content","retryable":true,"response":"bytes"}),
  cancelAgentResponse: Object.freeze({"id":"perplexity.cancelAgentResponse","method":"POST","path":"/v1/agent/{id}/cancel","retryable":false}),
  listModels: Object.freeze({"id":"perplexity.listModels","method":"GET","path":"/v1/models","retryable":true}),
  getComputerUsageAnalytics: Object.freeze({"id":"perplexity.getComputerUsageAnalytics","method":"GET","path":"/v1/analytics/computer/usage","retryable":true}),
  getComputerUsageAnalyticsV2: Object.freeze({"id":"perplexity.getComputerUsageAnalyticsV2","method":"GET","path":"/v2/analytics/computer/usage","retryable":true}),
  listSkills: Object.freeze({"id":"perplexity.listSkills","method":"GET","path":"/v1/skills","retryable":true}),
  createSkill: Object.freeze({"id":"perplexity.createSkill","method":"POST","path":"/v1/skills","retryable":false}),
  getSkill: Object.freeze({"id":"perplexity.getSkill","method":"GET","path":"/v1/skills/{skill_id}","retryable":true}),
  updateSkill: Object.freeze({"id":"perplexity.updateSkill","method":"PUT","path":"/v1/skills/{skill_id}","retryable":false}),
  deleteSkill: Object.freeze({"id":"perplexity.deleteSkill","method":"DELETE","path":"/v1/skills/{skill_id}","retryable":false}),
  listSkillRevisions: Object.freeze({"id":"perplexity.listSkillRevisions","method":"GET","path":"/v1/skills/{skill_id}/revisions","retryable":true}),
  downloadSkill: Object.freeze({"id":"perplexity.downloadSkill","method":"GET","path":"/v1/skills/{skill_id}/download","retryable":true}),
  answerQuestions: Object.freeze({"id":"perplexity.answerQuestions","method":"POST","path":"/v1/decisions","retryable":false}),
  routerChatCompletions: Object.freeze({"id":"perplexity.routerChatCompletions","method":"POST","path":"/router/v1/chat/completions","retryable":false}),
  routerChatCompletionsStream: Object.freeze({"id":"perplexity.routerChatCompletionsStream","method":"POST","path":"/router/v1/chat/completions","retryable":false,"response":"sse"}),
  routerResponses: Object.freeze({"id":"perplexity.routerResponses","method":"POST","path":"/router/v1/responses","retryable":false}),
  routerResponsesStream: Object.freeze({"id":"perplexity.routerResponsesStream","method":"POST","path":"/router/v1/responses","retryable":false,"response":"sse"}),
  routerMessages: Object.freeze({"id":"perplexity.routerMessages","method":"POST","path":"/router/v1/messages","retryable":false}),
  routerMessagesStream: Object.freeze({"id":"perplexity.routerMessagesStream","method":"POST","path":"/router/v1/messages","retryable":false,"response":"sse"}),
  listRouterModels: Object.freeze({"id":"perplexity.listRouterModels","method":"GET","path":"/router/v1/models","retryable":true}),
  getRouterModel: Object.freeze({"id":"perplexity.getRouterModel","method":"GET","path":"/router/v1/models/{model}","retryable":true}),
  generateAuthToken: Object.freeze({"id":"perplexity.generateAuthToken","method":"POST","path":"/generate_auth_token","retryable":false}),
  revokeAuthToken: Object.freeze({"id":"perplexity.revokeAuthToken","method":"POST","path":"/revoke_auth_token","retryable":false,"response":"text"}),
} satisfies Record<string, NativeOperation>);

export function createPerplexityClient(options: PerplexityClientOptions) {
  if (!options || typeof options !== "object" || Array.isArray(options)) throw new SearchError("configuration");
  exactFields(options, ["apiKey", "fetch", "timeoutMs", "retry", "maxResponseBytes", "maxConcurrency"], "configuration");
  const { apiKey, fetch } = adapterOptions({ apiKey: options.apiKey, ...(options.fetch !== undefined ? { fetch: options.fetch } : {}) });
  const { timeoutMs, retry, maxResponseBytes, maxConcurrency } = options;
  const config = { fetch, ...(timeoutMs !== undefined ? { timeoutMs } : {}), ...(retry !== undefined ? { retry } : {}),
    ...(maxResponseBytes !== undefined ? { maxResponseBytes } : {}), ...(maxConcurrency !== undefined ? { maxConcurrency } : {}) };
  const transport0 = createNativeTransport({ ...config, provider: "perplexity", baseUrl: "https://api.perplexity.ai", headers: { Authorization: `Bearer ${apiKey}` } });
  return Object.freeze({
    operations: perplexityOperations,
    /** Create Chat Completion */
    async chatCompletions(input: PerplexityChatCompletionsInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      if (input.body && (input.body as { stream?: unknown }).stream === true) throw new SearchError("unsupported_option");
      return transport0.request<PerplexityChatCompletionsResponse>(perplexityOperations.chatCompletions, input);
    },
    /** Create Chat Completion */
    async chatCompletionsStream(input: PerplexityChatCompletionsStreamInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      return transport0.request<PerplexityChatCompletionsStreamResponse>(perplexityOperations.chatCompletionsStream, { ...input, body: { ...input.body, stream: true } });
    },
    /** Search the Web */
    async search(input: PerplexitySearchInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      return transport0.request<PerplexitySearchResponse>(perplexityOperations.search, input);
    },
    /** Create Embeddings */
    async createEmbeddings(input: PerplexityCreateEmbeddingsInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      return transport0.request<PerplexityCreateEmbeddingsResponse>(perplexityOperations.createEmbeddings, input);
    },
    /** Create Contextualized Embeddings */
    async createContextualizedEmbeddings(input: PerplexityCreateContextualizedEmbeddingsInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      return transport0.request<PerplexityCreateContextualizedEmbeddingsResponse>(perplexityOperations.createContextualizedEmbeddings, input);
    },
    /** Get Async Chat Completion */
    async getAsyncChatCompletion(input: PerplexityGetAsyncChatCompletionInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport0.request<PerplexityGetAsyncChatCompletionResponse>(perplexityOperations.getAsyncChatCompletion, input);
    },
    /** List Async Chat Completions */
    async listAsyncChatCompletions(input: PerplexityListAsyncChatCompletionsInput = {}) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport0.request<PerplexityListAsyncChatCompletionsResponse>(perplexityOperations.listAsyncChatCompletions, input);
    },
    /** Create Async Chat Completion */
    async createAsyncChatCompletion(input: PerplexityCreateAsyncChatCompletionInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      return transport0.request<PerplexityCreateAsyncChatCompletionResponse>(perplexityOperations.createAsyncChatCompletion, input);
    },
    /** Create Agent Response */
    async createAgent(input: PerplexityCreateAgentInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      if (input.body && (input.body as { stream?: unknown }).stream === true) throw new SearchError("unsupported_option");
      return transport0.request<PerplexityCreateAgentResponse>(perplexityOperations.createAgent, input);
    },
    /** Create Agent Response */
    async createAgentStream(input: PerplexityCreateAgentStreamInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      return transport0.request<PerplexityCreateAgentStreamResponse>(perplexityOperations.createAgentStream, { ...input, body: { ...input.body, stream: true } });
    },
    /** Retrieve Agent Response */
    async retrieveAgent(input: PerplexityRetrieveAgentInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport0.request<PerplexityRetrieveAgentResponse>(perplexityOperations.retrieveAgent, input);
    },
    /** List Agent Response Files */
    async listAgentFiles(input: PerplexityListAgentFilesInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport0.request<PerplexityListAgentFilesResponse>(perplexityOperations.listAgentFiles, input);
    },
    /** Download Agent Response File */
    async downloadAgentFile(input: PerplexityDownloadAgentFileInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport0.request<PerplexityDownloadAgentFileResponse>(perplexityOperations.downloadAgentFile, input);
    },
    /** Cancel Agent Response */
    async cancelAgentResponse(input: PerplexityCancelAgentResponseInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport0.request<PerplexityCancelAgentResponseResponse>(perplexityOperations.cancelAgentResponse, input);
    },
    /** List Models */
    async listModels(input: PerplexityListModelsInput = {}) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport0.request<PerplexityListModelsResponse>(perplexityOperations.listModels, input);
    },
    /** Usage Analytics */
    async getComputerUsageAnalytics(input: PerplexityGetComputerUsageAnalyticsInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.query?.["dataset"] == null) throw new SearchError("invalid_request");
      if (input.query?.["start_time"] == null) throw new SearchError("invalid_request");
      return transport0.request<PerplexityGetComputerUsageAnalyticsResponse>(perplexityOperations.getComputerUsageAnalytics, input);
    },
    /** Usage Analytics per Member */
    async getComputerUsageAnalyticsV2(input: PerplexityGetComputerUsageAnalytics2Input) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.query?.["dataset"] == null) throw new SearchError("invalid_request");
      if (input.query?.["group_by"] == null) throw new SearchError("invalid_request");
      if (input.query?.["start_time"] == null) throw new SearchError("invalid_request");
      return transport0.request<PerplexityGetComputerUsageAnalytics2Response>(perplexityOperations.getComputerUsageAnalyticsV2, input);
    },
    /** List skills */
    async listSkills(input: PerplexityListSkillsInput = {}) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport0.request<PerplexityListSkillsResponse>(perplexityOperations.listSkills, input);
    },
    /** Create a skill */
    async createSkill(input: PerplexityCreateSkillInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.rawBody === undefined) throw new SearchError("invalid_request");
      return transport0.request<PerplexityCreateSkillResponse>(perplexityOperations.createSkill, input);
    },
    /** Get a skill */
    async getSkill(input: PerplexityGetSkillInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport0.request<PerplexityGetSkillResponse>(perplexityOperations.getSkill, input);
    },
    /** Add a skill revision */
    async updateSkill(input: PerplexityUpdateSkillInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.rawBody === undefined) throw new SearchError("invalid_request");
      if (input.query?.["expected_revision"] == null) throw new SearchError("invalid_request");
      return transport0.request<PerplexityUpdateSkillResponse>(perplexityOperations.updateSkill, input);
    },
    /** Delete a skill */
    async deleteSkill(input: PerplexityDeleteSkillInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.query?.["expected_revision"] == null) throw new SearchError("invalid_request");
      return transport0.request<PerplexityDeleteSkillResponse>(perplexityOperations.deleteSkill, input);
    },
    /** List skill revisions */
    async listSkillRevisions(input: PerplexityListSkillRevisionsInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport0.request<PerplexityListSkillRevisionsResponse>(perplexityOperations.listSkillRevisions, input);
    },
    /** Get a skill download URL */
    async downloadSkill(input: PerplexityDownloadSkillInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport0.request<PerplexityDownloadSkillResponse>(perplexityOperations.downloadSkill, input);
    },
    /** Answer questions */
    async answerQuestions(input: PerplexityAnswerQuestionsInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      return transport0.request<PerplexityAnswerQuestionsResponse>(perplexityOperations.answerQuestions, input);
    },
    /** Create Chat Completion */
    async routerChatCompletions(input: PerplexityRouterChatCompletionsInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      if (input.body && (input.body as { stream?: unknown }).stream === true) throw new SearchError("unsupported_option");
      return transport0.request<PerplexityRouterChatCompletionsResponse>(perplexityOperations.routerChatCompletions, input);
    },
    /** Create Chat Completion */
    async routerChatCompletionsStream(input: PerplexityRouterChatCompletionsStreamInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      return transport0.request<PerplexityRouterChatCompletionsStreamResponse>(perplexityOperations.routerChatCompletionsStream, { ...input, body: { ...input.body, stream: true } });
    },
    /** Create Response */
    async routerResponses(input: PerplexityRouterResponsesInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      if (input.body && (input.body as { stream?: unknown }).stream === true) throw new SearchError("unsupported_option");
      return transport0.request<PerplexityRouterResponsesResponse>(perplexityOperations.routerResponses, input);
    },
    /** Create Response */
    async routerResponsesStream(input: PerplexityRouterResponsesStreamInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      return transport0.request<PerplexityRouterResponsesStreamResponse>(perplexityOperations.routerResponsesStream, { ...input, body: { ...input.body, stream: true } });
    },
    /** Create Message */
    async routerMessages(input: PerplexityRouterMessagesInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      if (input.body && (input.body as { stream?: unknown }).stream === true) throw new SearchError("unsupported_option");
      return transport0.request<PerplexityRouterMessagesResponse>(perplexityOperations.routerMessages, input);
    },
    /** Create Message */
    async routerMessagesStream(input: PerplexityRouterMessagesStreamInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      return transport0.request<PerplexityRouterMessagesStreamResponse>(perplexityOperations.routerMessagesStream, { ...input, body: { ...input.body, stream: true } });
    },
    /** List Models */
    async listRouterModels(input: PerplexityListRouterModelsInput = {}) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport0.request<PerplexityListRouterModelsResponse>(perplexityOperations.listRouterModels, input);
    },
    /** Retrieve Model */
    async getRouterModel(input: PerplexityGetRouterModelInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport0.request<PerplexityGetRouterModelResponse>(perplexityOperations.getRouterModel, input);
    },
    /** Generate Auth Token */
    async generateAuthToken(input: PerplexityGenerateAuthTokenInput = {}) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport0.request<PerplexityGenerateAuthTokenResponse>(perplexityOperations.generateAuthToken, input);
    },
    /** Revoke Auth Token */
    async revokeAuthToken(input: PerplexityRevokeAuthTokenInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      const response = await transport0.request<string>(perplexityOperations.revokeAuthToken, input);
      if (response.data.length !== 0) throw new SearchError("invalid_response");
      return { ...response, data: null };
    },
  });
}
export type PerplexityClient = ReturnType<typeof createPerplexityClient>;
