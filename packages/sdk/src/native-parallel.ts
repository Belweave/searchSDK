/** Official public contracts reviewed 2026-10-22. See docs/provider-surfaces-b.md. */
import { createNativeTransport } from "./native-transport.js";
import type { NativeOperation, NativeRequestInput, NativeTransportConfig, NativeSSEEvent } from "./native-transport.js";
import { adapterOptions } from "./http.js";
import { exactFields } from "./validation.js";
import { SearchError } from "./errors.js";
export type ParallelClientOptions = Omit<NativeTransportConfig, "provider" | "baseUrl" | "headers"> & { apiKey: string };
export namespace ParallelSchemas {
  export type ActionOpenPage = {
    "type": "open_page";
    "url"?: (string | null);
    [key: string]: unknown;
  };
  export type ActionSearch = {
    "type": "search";
    "queries"?: (ReadonlyArray<string> | null);
    "query"?: (string | null);
    "sources"?: (ReadonlyArray<ActionSearchSource> | null);
    [key: string]: unknown;
  };
  export type ActionSearchSource = {
    "type": "url";
    "url": string;
    [key: string]: unknown;
  };
  export type AdvancedExtractSettings = {
    "fetch_policy"?: (FetchPolicy | null);
    "excerpt_settings"?: (V1ExcerptSettings | null);
    "full_content"?: (FullContentSettings | boolean);
  };
  export type AdvancedImageSearchSettings = {
    "location"?: (string | null);
    "max_results"?: (number | null);
  };
  export type AdvancedMonitorSettings = {
    "source_policy"?: (SourcePolicy | null);
    "location"?: (string | null);
    [key: string]: unknown;
  };
  export type AdvancedSearchSettings = {
    "source_policy"?: (SourcePolicy | null);
    "fetch_policy"?: (FetchPolicy | null);
    "excerpt_settings"?: (V1ExcerptSettings | null);
    "location"?: (string | null);
    "max_results"?: (number | null);
  };
  export type AutoSchema = {
    "type"?: "auto";
    [key: string]: unknown;
  };
  export type ChatCompletion = {
    "id": string;
    "choices": ReadonlyArray<Choice>;
    "created": number;
    "model": string;
    "object": "chat.completion";
    "moderation"?: (openai__types__chat__chat_completion__Moderation | null);
    "service_tier"?: ("auto" | "default" | "flex" | "scale" | "priority" | null);
    "system_fingerprint"?: (string | null);
    "usage"?: (CompletionUsage | null);
    "basis"?: ReadonlyArray<FieldBasis>;
    "interaction_id"?: (string | null);
    [key: string]: unknown;
  };
  export type ChatCompletionRequest = {
    "model": string;
    "messages": ReadonlyArray<ChatMessage>;
    "stream"?: (boolean | null);
    "response_format"?: (openai__types__shared_params__response_format_text__ResponseFormatText | ResponseFormatJSONSchema | openai__types__shared_params__response_format_json_object__ResponseFormatJSONObject | null);
    "max_tokens"?: (number | null);
    "temperature"?: (number | null);
    "top_p"?: (number | null);
    "n"?: (number | null);
    "presence_penalty"?: (number | null);
    "frequency_penalty"?: (number | null);
    "previous_interaction_id"?: (string | null);
    [key: string]: unknown;
  };
  export type ChatCompletionTokenLogprob = {
    "token": string;
    "bytes"?: (ReadonlyArray<number> | null);
    "logprob": number;
    "top_logprobs": ReadonlyArray<TopLogprob>;
    [key: string]: unknown;
  };
  export type ChatMessage = {
    "role": "system" | "user" | "assistant";
    "content": string;
    "name"?: (string | null);
    [key: string]: unknown;
  };
  export type Choice = {
    "delta": ChoiceDelta;
    "finish_reason"?: ("stop" | "length" | "tool_calls" | "content_filter" | "function_call" | null);
    "index": number;
    "logprobs"?: (ChoiceLogprobs | null);
    [key: string]: unknown;
  };
  export type ChoiceLogprobs = {
    "content"?: (ReadonlyArray<ChatCompletionTokenLogprob> | null);
    "refusal"?: (ReadonlyArray<ChatCompletionTokenLogprob> | null);
    [key: string]: unknown;
  };
  export type Citation = {
    "title"?: (string | null);
    "url": string;
    "excerpts"?: (ReadonlyArray<string> | null);
    [key: string]: unknown;
  };
  export type CompletionTokensDetails = {
    "accepted_prediction_tokens"?: (number | null);
    "audio_tokens"?: (number | null);
    "reasoning_tokens"?: (number | null);
    "rejected_prediction_tokens"?: (number | null);
    [key: string]: unknown;
  };
  export type CompletionUsage = {
    "completion_tokens": number;
    "prompt_tokens": number;
    "total_tokens": number;
    "completion_tokens_details"?: (CompletionTokensDetails | null);
    "prompt_tokens_details"?: (PromptTokensDetails | null);
    [key: string]: unknown;
  };
  export type CreateMonitorRequest = {
    "type": "event_stream" | "snapshot";
    "frequency": string;
    "processor"?: "lite" | "base" | "core";
    "webhook"?: (MonitorWebhook | null);
    "metadata"?: (Record<string, string> | null);
    "memory_scope_key"?: (string | null);
    "settings": (MonitorEventStreamSettings | MonitorSnapshotSettings);
    [key: string]: unknown;
  };
  export type CreateTaskGroupRequest = {
    "metadata"?: (Record<string, (string | number | number | boolean)> | null);
    [key: string]: unknown;
  };
  export type EntityItem = {
    "name": string;
    "url": string;
    "description": string;
    [key: string]: unknown;
  };
  export type Error = {
    "ref_id": string;
    "message": string;
    "detail"?: (Record<string, unknown> | null);
    [key: string]: unknown;
  };
  export type ErrorEvent = {
    "type": "error";
    "error": Error;
    [key: string]: unknown;
  };
  export type ErrorResponse = {
    "type": "error";
    "error": Error;
    [key: string]: unknown;
  };
  export type ExcludeCandidate = {
    "name": string;
    "url": string;
    [key: string]: unknown;
  };
  export type ExtractError = {
    "url": string;
    "error_type": string;
    "http_status_code": (number | null);
    "content": (string | null);
    [key: string]: unknown;
  };
  export type FetchPolicy = {
    "max_age_seconds"?: (number | null);
    "timeout_seconds"?: (number | null);
    "disable_cache_fallback"?: boolean;
    [key: string]: unknown;
  };
  export type FieldBasis = {
    "field": string;
    "citations"?: ReadonlyArray<Citation>;
    "reasoning": string;
    "confidence"?: (string | null);
    [key: string]: unknown;
  };
  export type FindAllCandidate = {
    "candidate_id": string;
    "name": string;
    "url": string;
    "description"?: (string | null);
    "match_status": "generated" | "matched" | "unmatched" | "discarded";
    "output"?: (Record<string, unknown> | null);
    "basis"?: (ReadonlyArray<FieldBasis> | null);
    [key: string]: unknown;
  };
  export type FindAllCandidateMatchStatusEvent = {
    "type": "findall.candidate.generated" | "findall.candidate.matched" | "findall.candidate.unmatched" | "findall.candidate.discarded" | "findall.candidate.enriched";
    "timestamp": string;
    "event_id": string;
    "data": FindAllCandidate;
    [key: string]: unknown;
  };
  export type FindAllCandidateMetrics = {
    "generated_candidates_count"?: number;
    "matched_candidates_count"?: number;
    [key: string]: unknown;
  };
  export type FindAllEnrichInput = {
    "processor"?: string;
    "output_schema": JsonSchema;
    "mcp_servers"?: (ReadonlyArray<McpServer> | null);
    [key: string]: unknown;
  };
  export type FindAllEntitySearchRequest = {
    "entity_type": "people" | "companies";
    "objective": string;
    "match_limit"?: number;
    [key: string]: unknown;
  };
  export type FindAllEntitySearchResponse = {
    "entity_set_id": string;
    "entities": ReadonlyArray<EntityItem>;
    [key: string]: unknown;
  };
  export type FindAllExtendInput = {
    "additional_match_limit": number;
    [key: string]: unknown;
  };
  export type FindAllMemoryResult = {
    "kind"?: "findall";
    "id": string;
    "updated_at": string;
    "input_excerpt": string;
    "matched_count": number;
    [key: string]: unknown;
  };
  export type FindAllRun = {
    "findall_id": string;
    "status": FindAllRunStatus;
    "generator": "base" | "core" | "pro" | "preview";
    "metadata"?: (Record<string, (string | number | number | boolean)> | null);
    "created_at"?: (string | null);
    "modified_at"?: (string | null);
    [key: string]: unknown;
  };
  export type FindAllRunInput = {
    "objective": string;
    "entity_type": string;
    "match_conditions": ReadonlyArray<MatchCondition>;
    "generator": "base" | "core" | "pro" | "preview";
    "match_limit": number;
    "exclude_list"?: (ReadonlyArray<ExcludeCandidate> | null);
    "metadata"?: (Record<string, (string | number | number | boolean)> | null);
    "webhook"?: (Webhook | null);
    "memory_scope_key"?: (string | null);
    [key: string]: unknown;
  };
  export type FindAllRunResult = {
    "run": FindAllRun;
    "candidates": ReadonlyArray<FindAllCandidate>;
    "last_event_id"?: (string | null);
    [key: string]: unknown;
  };
  export type FindAllRunStatus = {
    "status": "queued" | "action_required" | "running" | "completed" | "failed" | "cancelling" | "cancelled";
    "is_active": boolean;
    "metrics": FindAllCandidateMetrics;
    "termination_reason"?: ("low_match_rate" | "match_limit_met" | "candidates_exhausted" | "user_cancelled" | "error_occurred" | "timeout" | "insufficient_funds" | null);
    [key: string]: unknown;
  };
  export type FindAllRunStatusEvent = {
    "type": "findall.status";
    "timestamp": string;
    "event_id": string;
    "data": FindAllRun;
    [key: string]: unknown;
  };
  export type FindAllSchema = {
    "objective": string;
    "entity_type": string;
    "match_conditions": ReadonlyArray<MatchCondition>;
    "enrichments"?: (ReadonlyArray<FindAllEnrichInput> | null);
    "generator"?: "base" | "core" | "pro" | "preview";
    "match_limit"?: (number | null);
    [key: string]: unknown;
  };
  export type FindAllSchemaUpdatedEvent = {
    "type": "findall.schema.updated";
    "timestamp": string;
    "event_id": string;
    "data": FindAllSchema;
    [key: string]: unknown;
  };
  export type FullContentSettings = {
    "max_chars_per_result"?: (number | null);
    [key: string]: unknown;
  };
  export type HTTPValidationError = {
    "detail"?: ReadonlyArray<ValidationError>;
    [key: string]: unknown;
  };
  export type ImageSearchRequest = {
    "objective"?: (string | null);
    "search_queries": ReadonlyArray<string>;
    "mode"?: ("fast" | "advanced" | null);
    "session_id"?: (string | null);
    "client_model"?: (string | null);
    "advanced_settings"?: (AdvancedImageSearchSettings | null);
  };
  export type ImageSearchResponse = {
    "search_id": string;
    "session_id": string;
    "results": ReadonlyArray<ImageSearchResult>;
    "warnings"?: (ReadonlyArray<Warning> | null);
    "usage"?: (ReadonlyArray<UsageItem> | null);
    [key: string]: unknown;
  };
  export type ImageSearchResult = {
    "title": string;
    "image_url": string;
    "source_page_url": string;
    "width"?: (number | null);
    "height"?: (number | null);
    [key: string]: unknown;
  };
  export type IncompleteDetails = {
    "reason"?: ("max_output_tokens" | "content_filter" | null);
    [key: string]: unknown;
  };
  export type IngestInput = {
    "objective": string;
    [key: string]: unknown;
  };
  export type InputTokensDetails = {
    "cached_tokens": number;
    [key: string]: unknown;
  };
  export type JSONSchema = {
    "name": string;
    "description"?: string;
    "schema"?: Record<string, unknown>;
    "strict"?: (boolean | null);
    [key: string]: unknown;
  };
  export type JsonSchema = {
    "json_schema": Record<string, unknown>;
    "type"?: "json";
    [key: string]: unknown;
  };
  export type MatchCondition = {
    "name": string;
    "description": string;
    [key: string]: unknown;
  };
  export type McpListToolsTool = {
    "input_schema": unknown;
    "name": string;
    "annotations"?: (unknown | null);
    "description"?: (string | null);
    [key: string]: unknown;
  };
  export type McpServer = {
    "type"?: "url";
    "url": string;
    "headers"?: (Record<string, string> | null);
    "name": string;
    "allowed_tools"?: (ReadonlyArray<string> | null);
    [key: string]: unknown;
  };
  export type McpToolCall = {
    "tool_call_id": string;
    "server_name": string;
    "tool_name": string;
    "arguments": string;
    "content"?: (string | null);
    "error"?: (string | null);
    [key: string]: unknown;
  };
  export type MemoryClearRequest = {
    "memory_scope_key"?: (string | null);
    [key: string]: unknown;
  };
  export type MemoryEvictRequest = {
    "memory_scope_key"?: (string | null);
    "kind": "task" | "monitor" | "findall";
    "id": string;
    [key: string]: unknown;
  };
  export type MemoryRetrieveRequest = {
    "query"?: (string | null);
    "limit"?: number;
    "kind"?: ("task" | "monitor" | "findall" | null);
    "since"?: (string | null);
    "memory_scope_key"?: (string | null);
    [key: string]: unknown;
  };
  export type MemoryRetrieveResponse = {
    "results": ReadonlyArray<(TaskMemoryResult | MonitorMemoryResult | FindAllMemoryResult)>;
    [key: string]: unknown;
  };
  export type ModerationInputModerationResult = {
    "categories": Record<string, boolean>;
    "category_applied_input_types": Record<string, ReadonlyArray<"text" | "image">>;
    "category_scores": Record<string, number>;
    "flagged": boolean;
    "model": string;
    "type": "moderation_result";
    [key: string]: unknown;
  };
  export type ModerationInputModerationResults = {
    "model": string;
    "results": ReadonlyArray<ModerationInputModerationResultsResult>;
    "type": "moderation_results";
    [key: string]: unknown;
  };
  export type ModerationInputModerationResultsResult = {
    "categories": Record<string, boolean>;
    "category_applied_input_types": Record<string, ReadonlyArray<"text" | "image">>;
    "category_scores": Record<string, number>;
    "flagged": boolean;
    "model": string;
    "type": "moderation_result";
    [key: string]: unknown;
  };
  export type ModerationOutputModerationResult = {
    "categories": Record<string, boolean>;
    "category_applied_input_types": Record<string, ReadonlyArray<"text" | "image">>;
    "category_scores": Record<string, number>;
    "flagged": boolean;
    "model": string;
    "type": "moderation_result";
    [key: string]: unknown;
  };
  export type ModerationOutputModerationResults = {
    "model": string;
    "results": ReadonlyArray<ModerationOutputModerationResultsResult>;
    "type": "moderation_results";
    [key: string]: unknown;
  };
  export type ModerationOutputModerationResultsResult = {
    "categories": Record<string, boolean>;
    "category_applied_input_types": Record<string, ReadonlyArray<"text" | "image">>;
    "category_scores": Record<string, number>;
    "flagged": boolean;
    "model": string;
    "type": "moderation_result";
    [key: string]: unknown;
  };
  export type MonitorCompletionEvent = {
    "event_type"?: "completion";
    "timestamp": string;
    [key: string]: unknown;
  };
  export type MonitorErrorEvent = {
    "event_type"?: "error";
    "error_message": string;
    "timestamp": string;
    [key: string]: unknown;
  };
  export type MonitorEventStreamEvent = {
    "event_id": string;
    "event_group_id": string;
    "event_date": (string | null);
    "event_type"?: "event_stream";
    "output": (TaskRunTextOutput | TaskRunJsonOutput);
    [key: string]: unknown;
  };
  export type MonitorEventStreamResponseSettings = {
    "query": string;
    "output_schema"?: (JsonSchema | null);
    "include_backfill"?: (boolean | null);
    "advanced_settings"?: (AdvancedMonitorSettings | null);
    [key: string]: unknown;
  };
  export type MonitorEventStreamSettings = {
    "query": string;
    "output_schema"?: (JsonSchema | null);
    "include_backfill"?: (boolean | null);
    "advanced_settings"?: (AdvancedMonitorSettings | null);
    [key: string]: unknown;
  };
  export type MonitorMemoryEvent = {
    "event_id": string;
    "event_group_id": string;
    "detected_at": string;
    "excerpt": string;
    [key: string]: unknown;
  };
  export type MonitorMemoryResult = {
    "kind"?: "monitor";
    "id": string;
    "updated_at": string;
    "input_excerpt": string;
    "status": "active" | "cancelled";
    "matched_events"?: ReadonlyArray<MonitorMemoryEvent>;
    [key: string]: unknown;
  };
  export type MonitorResponse = {
    "type": "event_stream" | "snapshot";
    "monitor_id": string;
    "status": "active" | "cancelled";
    "frequency": string;
    "processor": "lite" | "base" | "core";
    "webhook"?: (MonitorWebhook | null);
    "metadata"?: (Record<string, string> | null);
    "created_at": string;
    "last_run_at"?: (string | null);
    "settings": (MonitorEventStreamResponseSettings | MonitorSnapshotResponseSettings);
    "output"?: (MonitorSnapshotOutput | null);
    [key: string]: unknown;
  };
  export type MonitorSnapshotEvent = {
    "event_id": string;
    "event_group_id": string;
    "event_date": (string | null);
    "event_type"?: "snapshot";
    "changed_output": (TaskRunTextOutput | TaskRunJsonOutput);
    "previous_output": (TaskRunTextOutput | TaskRunJsonOutput);
    [key: string]: unknown;
  };
  export type MonitorSnapshotOutput = {
    "latest_snapshot"?: ((TaskRunTextOutput | TaskRunJsonOutput) | null);
    [key: string]: unknown;
  };
  export type MonitorSnapshotResponseSettings = {
    "task_run_id": string;
    "query": string;
    "output_schema"?: (JsonSchema | null);
    [key: string]: unknown;
  };
  export type MonitorSnapshotSettings = {
    "task_run_id": string;
    [key: string]: unknown;
  };
  export type MonitorStatsResponse = {
    "total": number;
    "processor_counts": Record<string, Record<string, Record<string, number>>>;
    [key: string]: unknown;
  };
  export type MonitorWebhook = {
    "url": string;
    "event_types"?: ReadonlyArray<"monitor.event.detected" | "monitor.execution.completed" | "monitor.execution.failed">;
    [key: string]: unknown;
  };
  export type OutputTokensDetails = {
    "reasoning_tokens": number;
    [key: string]: unknown;
  };
  export type PaginatedMonitorEvents = {
    "events": ReadonlyArray<(MonitorEventStreamEvent | MonitorSnapshotEvent | MonitorCompletionEvent | MonitorErrorEvent)>;
    "next_cursor"?: (string | null);
    "warnings"?: (ReadonlyArray<Warning> | null);
    [key: string]: unknown;
  };
  export type PaginatedMonitorResponse = {
    "monitors": ReadonlyArray<MonitorResponse>;
    "next_cursor"?: (string | null);
    [key: string]: unknown;
  };
  export type PromptTokensDetails = {
    "audio_tokens"?: (number | null);
    "cached_tokens"?: (number | null);
    [key: string]: unknown;
  };
  export type Response = {
    "id": string;
    "created_at": number;
    "error"?: (ResponseError | null);
    "incomplete_details"?: (IncompleteDetails | null);
    "instructions"?: (string | null);
    "metadata"?: (Record<string, string> | null);
    "model"?: "parallel";
    "object": "response";
    "output": ReadonlyArray<(ResponseOutputMessage | ResponseFunctionWebSearch | ResponseMcpCall | ResponseMcpListTools)>;
    "parallel_tool_calls": boolean;
    "temperature"?: (number | null);
    "tool_choice"?: string;
    "tools"?: ReadonlyArray<(ResponseWebSearchTool | ResponseMcpTool)>;
    "top_p"?: (number | null);
    "background"?: (boolean | null);
    "completed_at"?: (number | null);
    "conversation"?: null;
    "max_output_tokens"?: (number | null);
    "max_tool_calls"?: (number | null);
    "moderation"?: (Moderation | null);
    "previous_response_id"?: (string | null);
    "prompt"?: null;
    "prompt_cache_key"?: (string | null);
    "prompt_cache_retention"?: ("in_memory" | "24h" | null);
    "reasoning"?: (ResponseReasoningConfig | null);
    "safety_identifier"?: (string | null);
    "service_tier"?: ("auto" | "default" | "flex" | "scale" | "priority" | null);
    "status"?: ("completed" | "failed" | "in_progress" | "cancelled" | "queued" | "incomplete" | null);
    "text"?: (ResponseTextConfig | null);
    "top_logprobs"?: (number | null);
    "truncation"?: ("auto" | "disabled" | null);
    "usage"?: (ResponseUsage | null);
    "user"?: (string | null);
    "effort_used"?: ("low" | "medium" | "high" | null);
    [key: string]: unknown;
  };
  export type ResponseCreateRequest = {
    "model": string;
    "input": (string | ReadonlyArray<ResponseInputMessage>);
    "instructions"?: (string | null);
    "previous_response_id"?: (string | null);
    "stream"?: (boolean | null);
    "text"?: (ResponseTextConfig | null);
    "metadata"?: (Record<string, string> | null);
    "reasoning"?: (ResponseReasoningConfig | null);
    "background"?: (boolean | null);
    "tools"?: (ReadonlyArray<(ResponseWebSearchTool | ResponseMcpTool | Record<string, unknown>)> | null);
    "data_sources"?: (TaskDataSources | null);
    [key: string]: unknown;
  };
  export type ResponseError = {
    "code": "server_error";
    "message": string;
    [key: string]: unknown;
  };
  export type ResponseFormatJSONObject = {
    "type": "json_object";
    [key: string]: unknown;
  };
  export type ResponseFormatJSONSchema = {
    "json_schema": JSONSchema;
    "type": "json_schema";
    [key: string]: unknown;
  };
  export type ResponseFormatText = {
    "type": "text";
    [key: string]: unknown;
  };
  export type ResponseFormatTextJSONSchemaConfig = {
    "name": string;
    "schema": Record<string, unknown>;
    "type": "json_schema";
    "description"?: (string | null);
    "strict"?: (boolean | null);
    [key: string]: unknown;
  };
  export type ResponseFunctionWebSearch = {
    "id": string;
    "action": (ActionSearch | ActionOpenPage);
    "status": "in_progress" | "searching" | "completed" | "failed";
    "type": "web_search_call";
    [key: string]: unknown;
  };
  export type ResponseInputContentPart = {
    "type"?: (string | null);
    "text"?: (string | null);
    [key: string]: unknown;
  };
  export type ResponseInputMessage = {
    "role": "user" | "assistant" | "system" | "developer";
    "content": (string | ReadonlyArray<ResponseInputContentPart>);
    [key: string]: unknown;
  };
  export type ResponseMcpCall = {
    "id": string;
    "arguments": string;
    "name": string;
    "server_label": string;
    "type": "mcp_call";
    "error"?: ((ResponseMcpToolExecutionError | ResponseMcpProtocolError | ResponseMcpHttpError) | null);
    "output"?: (string | null);
    "status": "completed" | "failed";
    [key: string]: unknown;
  };
  export type ResponseMcpHttpError = {
    "type"?: "http_error";
    "code": number;
    "message": string;
    [key: string]: unknown;
  };
  export type ResponseMcpListTools = {
    "id": string;
    "server_label": string;
    "tools": ReadonlyArray<McpListToolsTool>;
    "type": "mcp_list_tools";
    "error"?: (string | null);
    [key: string]: unknown;
  };
  export type ResponseMcpProtocolError = {
    "type"?: "mcp_protocol_error";
    "code": number;
    "message": string;
    [key: string]: unknown;
  };
  export type ResponseMcpTool = {
    "server_label": string;
    "type": "mcp";
    "allowed_tools"?: (ReadonlyArray<string> | null);
    "authorization"?: (string | null);
    "headers"?: (Record<string, string> | null);
    "require_approval": "never";
    "server_description"?: (string | null);
    "server_url": string;
    [key: string]: unknown;
  };
  export type ResponseMcpToolExecutionError = {
    "type"?: "mcp_tool_execution_error";
    "content": unknown;
    [key: string]: unknown;
  };
  export type ResponseOutputMessage = {
    "id": string;
    "content": ReadonlyArray<ResponseOutputText>;
    "role": "assistant";
    "status": "in_progress" | "completed" | "incomplete";
    "type": "message";
    "phase"?: ("commentary" | "final_answer" | null);
    [key: string]: unknown;
  };
  export type ResponseOutputText = {
    "annotations": ReadonlyArray<AnnotationURLCitation>;
    "text": string;
    "type": "output_text";
    "logprobs"?: (ReadonlyArray<openai__types__responses__response_output_text__Logprob> | null);
    [key: string]: unknown;
  };
  export type ResponseReasoningConfig = {
    "effort"?: ("low" | "medium" | "high" | "auto" | null);
    [key: string]: unknown;
  };
  export type ResponseTextConfig = {
    "format"?: (ResponseFormatText | ResponseFormatTextJSONSchemaConfig | ResponseFormatJSONObject | null);
    "verbosity"?: ("low" | "medium" | "high" | null);
    [key: string]: unknown;
  };
  export type ResponseUsage = {
    "input_tokens": number;
    "input_tokens_details": InputTokensDetails;
    "output_tokens": number;
    "output_tokens_details": OutputTokensDetails;
    "total_tokens": number;
    [key: string]: unknown;
  };
  export type ResponseWebSearchTool = {
    "type": "web_search" | "web_search_2025_08_26";
    "filters"?: (ResponseWebSearchToolFilters | null);
    "search_context_size"?: ("low" | "medium" | "high" | null);
    "user_location"?: (UserLocation | null);
    [key: string]: unknown;
  };
  export type ResponseWebSearchToolFilters = {
    "allowed_domains"?: (ReadonlyArray<string> | null);
    "blocked_domains"?: (ReadonlyArray<string> | null);
  };
  export type SourcePolicy = {
    "include_domains"?: ReadonlyArray<string>;
    "exclude_domains"?: ReadonlyArray<string>;
    "after_date"?: (string | null);
    [key: string]: unknown;
  };
  export type TaskAdvancedSettings = {
    "location"?: (string | null);
    "data_sources"?: (TaskDataSources | null);
    [key: string]: unknown;
  };
  export type TaskDataSources = {
    "pay_per_use"?: ReadonlyArray<string>;
    "free"?: ReadonlyArray<string>;
  };
  export type TaskGroupResponse = {
    "taskgroup_id": string;
    "metadata"?: (Record<string, (string | number | number | boolean)> | null);
    "status": TaskGroupStatus;
    "created_at": (string | null);
    [key: string]: unknown;
  };
  export type TaskGroupRunRequest = {
    "default_task_spec"?: (TaskSpec | null);
    "inputs": ReadonlyArray<TaskRunInput>;
    [key: string]: unknown;
  };
  export type TaskGroupRunResponse = {
    "status": TaskGroupStatus;
    "run_ids": ReadonlyArray<string>;
    "run_cursor": (string | null);
    "event_cursor": (string | null);
    [key: string]: unknown;
  };
  export type TaskGroupStatus = {
    "num_task_runs": number;
    "task_run_status_counts": Record<string, number>;
    "is_active": boolean;
    "status_message": (string | null);
    "modified_at": (string | null);
    [key: string]: unknown;
  };
  export type TaskGroupStatusEvent = {
    "type": "task_group_status";
    "event_id": string;
    "status": TaskGroupStatus;
    [key: string]: unknown;
  };
  export type TaskMemoryResult = {
    "kind"?: "task";
    "id": string;
    "updated_at": string;
    "input_excerpt": string;
    "output_excerpt": string;
    [key: string]: unknown;
  };
  export type TaskRun = {
    "run_id": string;
    "interaction_id": string;
    "status": "queued" | "action_required" | "running" | "completed" | "failed" | "cancelling" | "cancelled";
    "is_active": boolean;
    "warnings"?: (ReadonlyArray<Warning> | null);
    "error"?: (Error | null);
    "processor": string;
    "metadata"?: (Record<string, (string | number | number | boolean)> | null);
    "taskgroup_id"?: (string | null);
    "created_at": (string | null);
    "modified_at": (string | null);
    [key: string]: unknown;
  };
  export type TaskRunEvent = {
    "type": "task_run.state";
    "event_id": (string | null);
    "input"?: (TaskRunInput | null);
    "run": TaskRun;
    "output"?: ((TaskRunTextOutput | TaskRunJsonOutput) | null);
    [key: string]: unknown;
  };
  export type TaskRunInput = {
    "processor": string;
    "metadata"?: (Record<string, (string | number | number | boolean)> | null);
    "memory_scope_key"?: (string | null);
    "source_policy"?: (SourcePolicy | null);
    "advanced_settings"?: (TaskAdvancedSettings | null);
    "task_spec"?: (TaskSpec | null);
    "input": (string | Record<string, unknown>);
    "previous_interaction_id"?: (string | null);
    "mcp_servers"?: (ReadonlyArray<McpServer> | null);
    "enable_events"?: (boolean | null);
    "webhook"?: (Webhook | null);
    [key: string]: unknown;
  };
  export type TaskRunJsonOutput = {
    "basis": ReadonlyArray<FieldBasis>;
    "type": "json";
    "mcp_tool_calls"?: (ReadonlyArray<McpToolCall> | null);
    "beta_fields"?: (Record<string, unknown> | null);
    "content": Record<string, unknown>;
    "output_schema"?: (Record<string, unknown> | null);
    [key: string]: unknown;
  };
  export type TaskRunProgressMessageEvent = {
    "type": "task_run.progress_msg.plan" | "task_run.progress_msg.search" | "task_run.progress_msg.result" | "task_run.progress_msg.tool_call" | "task_run.progress_msg.exec_status" | "task_run.progress_msg.extract";
    "message": string;
    "timestamp": (string | null);
    [key: string]: unknown;
  };
  export type TaskRunProgressStatsEvent = {
    "type": "task_run.progress_stats";
    "source_stats": TaskRunSourceStats;
    "progress_meter": number;
    [key: string]: unknown;
  };
  export type TaskRunResult = {
    "run": TaskRun;
    "output": (TaskRunTextOutput | TaskRunJsonOutput);
    [key: string]: unknown;
  };
  export type TaskRunSourceStats = {
    "num_sources_considered": (number | null);
    "num_sources_read": (number | null);
    "sources_read_sample": (ReadonlyArray<string> | null);
    [key: string]: unknown;
  };
  export type TaskRunTextOutput = {
    "basis": ReadonlyArray<FieldBasis>;
    "type": "text";
    "mcp_tool_calls"?: (ReadonlyArray<McpToolCall> | null);
    "beta_fields"?: (Record<string, unknown> | null);
    "content": string;
    [key: string]: unknown;
  };
  export type TaskSpec = {
    "output_schema": (JsonSchema | TextSchema | AutoSchema | string);
    "input_schema"?: (string | JsonSchema | TextSchema | null);
    [key: string]: unknown;
  };
  export type TextSchema = {
    "description"?: (string | null);
    "type"?: "text";
    [key: string]: unknown;
  };
  export type TopLogprob = {
    "token": string;
    "bytes"?: (ReadonlyArray<number> | null);
    "logprob": number;
    [key: string]: unknown;
  };
  export type UpdateMonitorEventStreamSettings = {
    "query"?: (string | null);
    "advanced_settings"?: (AdvancedMonitorSettings | null);
    [key: string]: unknown;
  };
  export type UpdateMonitorRequest = {
    "type"?: ("event_stream" | "snapshot" | null);
    "frequency"?: (string | null);
    "processor"?: ("lite" | "base" | "core" | null);
    "webhook"?: (MonitorWebhook | null);
    "metadata"?: (Record<string, string> | null);
    "settings"?: (UpdateMonitorEventStreamSettings | null);
    [key: string]: unknown;
  };
  export type UsageItem = {
    "name": string;
    "count": number;
    [key: string]: unknown;
  };
  export type UserLocation = {
    "city"?: (string | null);
    "country"?: (string | null);
    "region"?: (string | null);
    "timezone"?: (string | null);
    "type"?: ("approximate" | null);
    [key: string]: unknown;
  };
  export type V1ExcerptSettings = {
    "max_chars_per_result"?: (number | null);
  };
  export type V1ExtractRequest = {
    "urls": ReadonlyArray<string>;
    "objective"?: (string | null);
    "search_queries"?: (ReadonlyArray<string> | null);
    "max_chars_total"?: (number | null);
    "session_id"?: (string | null);
    "client_model"?: (string | null);
    "advanced_settings"?: (AdvancedExtractSettings | null);
  };
  export type V1ExtractResponse = {
    "extract_id": string;
    "results": ReadonlyArray<V1ExtractResult>;
    "errors": ReadonlyArray<ExtractError>;
    "warnings"?: (ReadonlyArray<Warning> | null);
    "usage"?: (ReadonlyArray<UsageItem> | null);
    "session_id": string;
    [key: string]: unknown;
  };
  export type V1ExtractResult = {
    "url": string;
    "title"?: (string | null);
    "publish_date"?: (string | null);
    "excerpts": ReadonlyArray<string>;
    "full_content"?: (string | null);
    [key: string]: unknown;
  };
  export type V1SearchRequest = {
    "objective"?: (string | null);
    "search_queries": ReadonlyArray<string>;
    "mode"?: ("turbo" | "fast" | "basic" | "advanced" | null);
    "max_chars_total"?: (number | null);
    "session_id"?: (string | null);
    "client_model"?: (string | null);
    "advanced_settings"?: (AdvancedSearchSettings | null);
  };
  export type V1SearchResponse = {
    "search_id": string;
    "results": ReadonlyArray<V1WebSearchResult>;
    "warnings"?: (ReadonlyArray<Warning> | null);
    "usage"?: (ReadonlyArray<UsageItem> | null);
    "session_id": string;
    [key: string]: unknown;
  };
  export type V1WebSearchResult = {
    "url": string;
    "title"?: (string | null);
    "publish_date"?: (string | null);
    "excerpts": ReadonlyArray<string>;
    [key: string]: unknown;
  };
  export type ValidationError = {
    "loc": ReadonlyArray<(string | number)>;
    "msg": string;
    "type": string;
    [key: string]: unknown;
  };
  export type Warning = {
    "type": "spec_validation_warning" | "input_validation_warning" | "warning";
    "message": string;
    "detail"?: (Record<string, unknown> | null);
    [key: string]: unknown;
  };
  export type Webhook = {
    "url": string;
    "event_types"?: ReadonlyArray<"task_run.status">;
    [key: string]: unknown;
  };
  export type openai__types__chat__chat_completion__Moderation = {
    "input": (ModerationInputModerationResults | openai__types__chat__chat_completion__ModerationInputError);
    "output": (ModerationOutputModerationResults | openai__types__chat__chat_completion__ModerationOutputError);
    [key: string]: unknown;
  };
  export type openai__types__chat__chat_completion__ModerationInputError = {
    "code": string;
    "message": string;
    "type": "error";
    [key: string]: unknown;
  };
  export type openai__types__chat__chat_completion__ModerationOutputError = {
    "code": string;
    "message": string;
    "type": "error";
    [key: string]: unknown;
  };
  export type openai__types__shared_params__response_format_json_object__ResponseFormatJSONObject = {
    "type": "json_object";
    [key: string]: unknown;
  };
  export type openai__types__shared_params__response_format_text__ResponseFormatText = {
    "type": "text";
    [key: string]: unknown;
  };
  export type ParallelBeta = ("mcp-server-2025-07-17" | "events-sse-2025-07-24" | "webhook-2025-08-12" | "findall-2025-09-15" | "search-extract-2025-10-10" | "field-basis-2025-11-25" | string);
  export type ChoiceDelta = {
    "content"?: (string | null);
    "function_call"?: (ChoiceDeltaFunctionCall | null);
    "refusal"?: (string | null);
    "role"?: ("developer" | "system" | "user" | "assistant" | "tool" | null);
    "tool_calls"?: (ReadonlyArray<ChoiceDeltaToolCall> | null);
    [key: string]: unknown;
  };
  export type ChoiceDeltaFunctionCall = {
    "arguments"?: (string | null);
    "name"?: (string | null);
    [key: string]: unknown;
  };
  export type ChoiceDeltaToolCall = {
    "index": number;
    "id"?: (string | null);
    "function"?: (ChoiceDeltaToolCallFunction | null);
    "type"?: ("function" | null);
    [key: string]: unknown;
  };
  export type ChoiceDeltaToolCallFunction = {
    "arguments"?: (string | null);
    "name"?: (string | null);
    [key: string]: unknown;
  };
  export type Moderation = {
    "input": (ModerationInputModerationResult | ModerationInputError);
    "output": (ModerationOutputModerationResult | ModerationOutputError);
    [key: string]: unknown;
  };
  export type ModerationInputError = {
    "code": string;
    "message": string;
    "type": "error";
    [key: string]: unknown;
  };
  export type ModerationOutputError = {
    "code": string;
    "message": string;
    "type": "error";
    [key: string]: unknown;
  };
  export type ChatCompletionResponseChunk = {
    "id": string;
    "choices": ReadonlyArray<Choice>;
    "created": number;
    "model": string;
    "object": "chat.completion.chunk";
    "moderation"?: (Moderation | null);
    "service_tier"?: ("auto" | "default" | "flex" | "scale" | "priority" | null);
    "system_fingerprint"?: (string | null);
    "usage"?: (CompletionUsage | null);
    "type": "chat.completion.chunk";
    "basis"?: ReadonlyArray<FieldBasis>;
    "interaction_id"?: (string | null);
    [key: string]: unknown;
  };
  export type AnnotationURLCitation = {
    "end_index": number;
    "start_index": number;
    "title": string;
    "type": "url_citation";
    "url": string;
    [key: string]: unknown;
  };
  export type ResponseCompletedEvent = {
    "response": Response;
    "sequence_number": number;
    "type": "response.completed";
    [key: string]: unknown;
  };
  export type ResponseContentPartAddedEvent = {
    "content_index": number;
    "item_id": string;
    "output_index": number;
    "part": ResponseOutputText;
    "sequence_number": number;
    "type": "response.content_part.added";
    [key: string]: unknown;
  };
  export type ResponseContentPartDoneEvent = {
    "content_index": number;
    "item_id": string;
    "output_index": number;
    "part": ResponseOutputText;
    "sequence_number": number;
    "type": "response.content_part.done";
    [key: string]: unknown;
  };
  export type ResponseCreatedEvent = {
    "response": Response;
    "sequence_number": number;
    "type": "response.created";
    [key: string]: unknown;
  };
  export type ResponseFailedEvent = {
    "response": Response;
    "sequence_number": number;
    "type": "response.failed";
    [key: string]: unknown;
  };
  export type ResponseInProgressEvent = {
    "response": Response;
    "sequence_number": number;
    "type": "response.in_progress";
    [key: string]: unknown;
  };
  export type ResponseIncompleteEvent = {
    "response": Response;
    "sequence_number": number;
    "type": "response.incomplete";
    [key: string]: unknown;
  };
  export type ResponseMcpCallCompletedEvent = {
    "item_id": string;
    "output_index": number;
    "sequence_number": number;
    "type": "response.mcp_call.completed";
    [key: string]: unknown;
  };
  export type ResponseMcpCallFailedEvent = {
    "item_id": string;
    "output_index": number;
    "sequence_number": number;
    "type": "response.mcp_call.failed";
    [key: string]: unknown;
  };
  export type ResponseMcpListToolsCompletedEvent = {
    "item_id": string;
    "output_index": number;
    "sequence_number": number;
    "type": "response.mcp_list_tools.completed";
    [key: string]: unknown;
  };
  export type ResponseMcpListToolsFailedEvent = {
    "item_id": string;
    "output_index": number;
    "sequence_number": number;
    "type": "response.mcp_list_tools.failed";
    [key: string]: unknown;
  };
  export type ResponseOutputItemAddedEvent = {
    "item": (ResponseOutputMessage | ResponseFunctionWebSearch | ResponseMcpCall | ResponseMcpListTools);
    "output_index": number;
    "sequence_number": number;
    "type": "response.output_item.added";
    [key: string]: unknown;
  };
  export type ResponseOutputItemDoneEvent = {
    "item": (ResponseOutputMessage | ResponseFunctionWebSearch | ResponseMcpCall | ResponseMcpListTools);
    "output_index": number;
    "sequence_number": number;
    "type": "response.output_item.done";
    [key: string]: unknown;
  };
  export type ResponseOutputTextAnnotationAddedEvent = {
    "annotation": AnnotationURLCitation;
    "annotation_index": number;
    "content_index": number;
    "item_id": string;
    "output_index": number;
    "sequence_number": number;
    "type": "response.output_text.annotation.added";
    [key: string]: unknown;
  };
  export type ResponseTextDeltaEvent = {
    "content_index": number;
    "delta": string;
    "item_id": string;
    "logprobs": ReadonlyArray<openai__types__responses__response_text_delta_event__Logprob>;
    "output_index": number;
    "sequence_number": number;
    "type": "response.output_text.delta";
    [key: string]: unknown;
  };
  export type ResponseTextDoneEvent = {
    "content_index": number;
    "item_id": string;
    "logprobs": ReadonlyArray<openai__types__responses__response_text_done_event__Logprob>;
    "output_index": number;
    "sequence_number": number;
    "text": string;
    "type": "response.output_text.done";
    [key: string]: unknown;
  };
  export type ResponseWebSearchCallCompletedEvent = {
    "item_id": string;
    "output_index": number;
    "sequence_number": number;
    "type": "response.web_search_call.completed";
    [key: string]: unknown;
  };
  export type ResponseWebSearchCallInProgressEvent = {
    "item_id": string;
    "output_index": number;
    "sequence_number": number;
    "type": "response.web_search_call.in_progress";
    [key: string]: unknown;
  };
  export type ResponseWebSearchCallSearchingEvent = {
    "item_id": string;
    "output_index": number;
    "sequence_number": number;
    "type": "response.web_search_call.searching";
    [key: string]: unknown;
  };
  export type openai__types__responses__response_output_text__Logprob = {
    "token": string;
    "bytes": ReadonlyArray<number>;
    "logprob": number;
    "top_logprobs": ReadonlyArray<openai__types__responses__response_output_text__LogprobTopLogprob>;
    [key: string]: unknown;
  };
  export type openai__types__responses__response_output_text__LogprobTopLogprob = {
    "token": string;
    "bytes": ReadonlyArray<number>;
    "logprob": number;
    [key: string]: unknown;
  };
  export type openai__types__responses__response_text_delta_event__Logprob = {
    "token": string;
    "logprob": number;
    "top_logprobs"?: (ReadonlyArray<openai__types__responses__response_text_delta_event__LogprobTopLogprob> | null);
    [key: string]: unknown;
  };
  export type openai__types__responses__response_text_delta_event__LogprobTopLogprob = {
    "token"?: (string | null);
    "logprob"?: (number | null);
    [key: string]: unknown;
  };
  export type openai__types__responses__response_text_done_event__Logprob = {
    "token": string;
    "logprob": number;
    "top_logprobs"?: (ReadonlyArray<openai__types__responses__response_text_done_event__LogprobTopLogprob> | null);
    [key: string]: unknown;
  };
  export type openai__types__responses__response_text_done_event__LogprobTopLogprob = {
    "token"?: (string | null);
    "logprob"?: (number | null);
    [key: string]: unknown;
  };
  export type ResponseStreamEvent = (ResponseCreatedEvent | ResponseInProgressEvent | ResponseOutputItemAddedEvent | ResponseWebSearchCallInProgressEvent | ResponseWebSearchCallSearchingEvent | ResponseWebSearchCallCompletedEvent | ResponseMcpCallCompletedEvent | ResponseMcpCallFailedEvent | ResponseMcpListToolsCompletedEvent | ResponseMcpListToolsFailedEvent | ResponseContentPartAddedEvent | ResponseTextDeltaEvent | ResponseTextDoneEvent | ResponseOutputTextAnnotationAddedEvent | ResponseContentPartDoneEvent | ResponseOutputItemDoneEvent | ResponseCompletedEvent | ResponseFailedEvent | ResponseIncompleteEvent);
}

export type ParallelSearchBody = ParallelSchemas.V1SearchRequest;
export type ParallelSearchInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { body: ParallelSearchBody; };
export type ParallelSearchResponse = ParallelSchemas.V1SearchResponse;
export type ParallelImageSearchBody = ParallelSchemas.ImageSearchRequest;
export type ParallelImageSearchInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { body: ParallelImageSearchBody; };
export type ParallelImageSearchResponse = ParallelSchemas.ImageSearchResponse;
export type ParallelExtractBody = ParallelSchemas.V1ExtractRequest;
export type ParallelExtractInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { body: ParallelExtractBody; };
export type ParallelExtractResponse = ParallelSchemas.V1ExtractResponse;
export type ParallelCreateTaskGroupBody = ParallelSchemas.CreateTaskGroupRequest;
export type ParallelCreateTaskGroupInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { body: ParallelCreateTaskGroupBody; };
export type ParallelCreateTaskGroupResponse = ParallelSchemas.TaskGroupResponse;
export type ParallelRetrieveTaskGroupPath = { "taskgroup_id": string; };
export type ParallelRetrieveTaskGroupInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { path: ParallelRetrieveTaskGroupPath; };
export type ParallelRetrieveTaskGroupResponse = ParallelSchemas.TaskGroupResponse;
export type ParallelStreamTaskGroupEventsPath = { "taskgroup_id": string; };
export type ParallelStreamTaskGroupEventsQuery = { "last_event_id"?: (string | null); "timeout"?: (number | null); };
export type ParallelStreamTaskGroupEventsInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { path: ParallelStreamTaskGroupEventsPath; query?: ParallelStreamTaskGroupEventsQuery; };
export type ParallelStreamTaskGroupEventsResponse = AsyncIterable<NativeSSEEvent>;
export type ParallelAddRunsToTaskGroupPath = { "taskgroup_id": string; };
export type ParallelAddRunsToTaskGroupQuery = { "refresh_status"?: boolean; };
export type ParallelAddRunsToTaskGroupHeaders = { "parallel-beta"?: (string | null); };
export type ParallelAddRunsToTaskGroupBody = ParallelSchemas.TaskGroupRunRequest;
export type ParallelAddRunsToTaskGroupInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { path: ParallelAddRunsToTaskGroupPath; query?: ParallelAddRunsToTaskGroupQuery; headers?: ParallelAddRunsToTaskGroupHeaders; body: ParallelAddRunsToTaskGroupBody; };
export type ParallelAddRunsToTaskGroupResponse = ParallelSchemas.TaskGroupRunResponse;
export type ParallelFetchTaskGroupRunsPath = { "taskgroup_id": string; };
export type ParallelFetchTaskGroupRunsQuery = { "last_event_id"?: (string | null); "status"?: ("queued" | "action_required" | "running" | "completed" | "failed" | "cancelling" | "cancelled" | null); "include_input"?: boolean; "include_output"?: boolean; };
export type ParallelFetchTaskGroupRunsInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { path: ParallelFetchTaskGroupRunsPath; query?: ParallelFetchTaskGroupRunsQuery; };
export type ParallelFetchTaskGroupRunsResponse = AsyncIterable<NativeSSEEvent>;
export type ParallelRetrieveTaskGroupRunPath = { "taskgroup_id": string; "run_id": string; };
export type ParallelRetrieveTaskGroupRunInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { path: ParallelRetrieveTaskGroupRunPath; };
export type ParallelRetrieveTaskGroupRunResponse = ParallelSchemas.TaskRun;
export type ParallelCreateTaskRunHeaders = { "parallel-beta"?: (string | null); };
export type ParallelCreateTaskRunBody = ParallelSchemas.TaskRunInput;
export type ParallelCreateTaskRunInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { headers?: ParallelCreateTaskRunHeaders; body: ParallelCreateTaskRunBody; };
export type ParallelCreateTaskRunResponse = ParallelSchemas.TaskRun;
export type ParallelRetrieveTaskRunPath = { "run_id": string; };
export type ParallelRetrieveTaskRunInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { path: ParallelRetrieveTaskRunPath; };
export type ParallelRetrieveTaskRunResponse = ParallelSchemas.TaskRun;
export type ParallelStreamTaskRunEventsPath = { "run_id": string; };
export type ParallelStreamTaskRunEventsInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { path: ParallelStreamTaskRunEventsPath; };
export type ParallelStreamTaskRunEventsResponse = AsyncIterable<NativeSSEEvent>;
export type ParallelRetrieveTaskRunInputPath = { "run_id": string; };
export type ParallelRetrieveTaskRunInputInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { path: ParallelRetrieveTaskRunInputPath; };
export type ParallelRetrieveTaskRunInputResponse = ParallelSchemas.TaskRunInput;
export type ParallelRetrieveTaskRunResultPath = { "run_id": string; };
export type ParallelRetrieveTaskRunResultQuery = { "timeout"?: number; };
export type ParallelRetrieveTaskRunResultHeaders = { "parallel-beta"?: (string | null); };
export type ParallelRetrieveTaskRunResultInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { path: ParallelRetrieveTaskRunResultPath; query?: ParallelRetrieveTaskRunResultQuery; headers?: ParallelRetrieveTaskRunResultHeaders; };
export type ParallelRetrieveTaskRunResultResponse = ParallelSchemas.TaskRunResult;
export type ParallelFastEntitySearchBody = ParallelSchemas.FindAllEntitySearchRequest;
export type ParallelFastEntitySearchInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { body: ParallelFastEntitySearchBody; };
export type ParallelFastEntitySearchResponse = ParallelSchemas.FindAllEntitySearchResponse;
export type ParallelIngestFindAllRunHeaders = { "parallel-beta"?: (string | null); };
export type ParallelIngestFindAllRunBody = ParallelSchemas.IngestInput;
export type ParallelIngestFindAllRunInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { headers?: ParallelIngestFindAllRunHeaders; body: ParallelIngestFindAllRunBody; };
export type ParallelIngestFindAllRunResponse = ParallelSchemas.FindAllSchema;
export type ParallelCreateFindAllRunHeaders = { "parallel-beta"?: (string | null); };
export type ParallelCreateFindAllRunBody = ParallelSchemas.FindAllRunInput;
export type ParallelCreateFindAllRunInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { headers?: ParallelCreateFindAllRunHeaders; body: ParallelCreateFindAllRunBody; };
export type ParallelCreateFindAllRunResponse = ParallelSchemas.FindAllRun;
export type ParallelRetrieveFindAllRunStatusPath = { "findall_id": string; };
export type ParallelRetrieveFindAllRunStatusHeaders = { "parallel-beta"?: (string | null); };
export type ParallelRetrieveFindAllRunStatusInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { path: ParallelRetrieveFindAllRunStatusPath; headers?: ParallelRetrieveFindAllRunStatusHeaders; };
export type ParallelRetrieveFindAllRunStatusResponse = ParallelSchemas.FindAllRun;
export type ParallelCancelFindAllRunPath = { "findall_id": string; };
export type ParallelCancelFindAllRunHeaders = { "parallel-beta"?: (string | null); };
export type ParallelCancelFindAllRunInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { path: ParallelCancelFindAllRunPath; headers?: ParallelCancelFindAllRunHeaders; };
export type ParallelCancelFindAllRunResponse = null;
export type ParallelAddEnrichmentToFindAllRunPath = { "findall_id": string; };
export type ParallelAddEnrichmentToFindAllRunHeaders = { "parallel-beta"?: (string | null); };
export type ParallelAddEnrichmentToFindAllRunBody = ParallelSchemas.FindAllEnrichInput;
export type ParallelAddEnrichmentToFindAllRunInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { path: ParallelAddEnrichmentToFindAllRunPath; headers?: ParallelAddEnrichmentToFindAllRunHeaders; body: ParallelAddEnrichmentToFindAllRunBody; };
export type ParallelAddEnrichmentToFindAllRunResponse = ParallelSchemas.FindAllSchema;
export type ParallelStreamFindAllEventsPath = { "findall_id": string; };
export type ParallelStreamFindAllEventsQuery = { "last_event_id"?: (string | null); "timeout"?: (number | null); };
export type ParallelStreamFindAllEventsHeaders = { "parallel-beta"?: (string | null); };
export type ParallelStreamFindAllEventsInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { path: ParallelStreamFindAllEventsPath; query?: ParallelStreamFindAllEventsQuery; headers?: ParallelStreamFindAllEventsHeaders; };
export type ParallelStreamFindAllEventsResponse = AsyncIterable<NativeSSEEvent>;
export type ParallelExtendFindAllRunPath = { "findall_id": string; };
export type ParallelExtendFindAllRunHeaders = { "parallel-beta"?: (string | null); };
export type ParallelExtendFindAllRunBody = ParallelSchemas.FindAllExtendInput;
export type ParallelExtendFindAllRunInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { path: ParallelExtendFindAllRunPath; headers?: ParallelExtendFindAllRunHeaders; body: ParallelExtendFindAllRunBody; };
export type ParallelExtendFindAllRunResponse = ParallelSchemas.FindAllSchema;
export type ParallelFindAllRunResultPath = { "findall_id": string; };
export type ParallelFindAllRunResultHeaders = { "parallel-beta"?: (string | null); };
export type ParallelFindAllRunResultInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { path: ParallelFindAllRunResultPath; headers?: ParallelFindAllRunResultHeaders; };
export type ParallelFindAllRunResultResponse = ParallelSchemas.FindAllRunResult;
export type ParallelGetFindAllRunSchemaPath = { "findall_id": string; };
export type ParallelGetFindAllRunSchemaHeaders = { "parallel-beta"?: (string | null); };
export type ParallelGetFindAllRunSchemaInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { path: ParallelGetFindAllRunSchemaPath; headers?: ParallelGetFindAllRunSchemaHeaders; };
export type ParallelGetFindAllRunSchemaResponse = ParallelSchemas.FindAllSchema;
export type ParallelCreateMonitorBody = ParallelSchemas.CreateMonitorRequest;
export type ParallelCreateMonitorInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { body: ParallelCreateMonitorBody; };
export type ParallelCreateMonitorResponse = ParallelSchemas.MonitorResponse;
export type ParallelListMonitorsQuery = { "cursor"?: (string | null); "limit"?: (number | null); "type"?: (ReadonlyArray<"event_stream" | "snapshot"> | null); "status"?: (ReadonlyArray<"active" | "cancelled"> | null); };
export type ParallelListMonitorsInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { query?: ParallelListMonitorsQuery; };
export type ParallelListMonitorsResponse = ParallelSchemas.PaginatedMonitorResponse;
export type ParallelMonitorStatsInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & {  };
export type ParallelMonitorStatsResponse = ParallelSchemas.MonitorStatsResponse;
export type ParallelRetrieveMonitorPath = { "monitor_id": string; };
export type ParallelRetrieveMonitorInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { path: ParallelRetrieveMonitorPath; };
export type ParallelRetrieveMonitorResponse = ParallelSchemas.MonitorResponse;
export type ParallelCancelMonitorPath = { "monitor_id": string; };
export type ParallelCancelMonitorInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { path: ParallelCancelMonitorPath; };
export type ParallelCancelMonitorResponse = ParallelSchemas.MonitorResponse;
export type ParallelListMonitorEventsPath = { "monitor_id": string; };
export type ParallelListMonitorEventsQuery = { "event_group_id"?: (string | null); "cursor"?: (string | null); "limit"?: (number | null); "include_completions"?: boolean; };
export type ParallelListMonitorEventsInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { path: ParallelListMonitorEventsPath; query?: ParallelListMonitorEventsQuery; };
export type ParallelListMonitorEventsResponse = ParallelSchemas.PaginatedMonitorEvents;
export type ParallelTriggerMonitorRunPath = { "monitor_id": string; };
export type ParallelTriggerMonitorRunInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { path: ParallelTriggerMonitorRunPath; };
export type ParallelTriggerMonitorRunResponse = null;
export type ParallelUpdateMonitorPath = { "monitor_id": string; };
export type ParallelUpdateMonitorBody = ParallelSchemas.UpdateMonitorRequest;
export type ParallelUpdateMonitorInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { path: ParallelUpdateMonitorPath; body: ParallelUpdateMonitorBody; };
export type ParallelUpdateMonitorResponse = ParallelSchemas.MonitorResponse;
export type ParallelClearMemoryBody = ParallelSchemas.MemoryClearRequest;
export type ParallelClearMemoryInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { body: ParallelClearMemoryBody; };
export type ParallelClearMemoryResponse = null;
export type ParallelEvictFromMemoryBody = ParallelSchemas.MemoryEvictRequest;
export type ParallelEvictFromMemoryInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { body: ParallelEvictFromMemoryBody; };
export type ParallelEvictFromMemoryResponse = null;
export type ParallelRetrieveMemoryBody = ParallelSchemas.MemoryRetrieveRequest;
export type ParallelRetrieveMemoryInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { body: ParallelRetrieveMemoryBody; };
export type ParallelRetrieveMemoryResponse = ParallelSchemas.MemoryRetrieveResponse;
export type ParallelChatCompletionsBody = ParallelSchemas.ChatCompletionRequest & { stream?: false };
export type ParallelChatCompletionsInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { body: ParallelChatCompletionsBody; };
export type ParallelChatCompletionsResponse = ParallelSchemas.ChatCompletion;
export type ParallelChatCompletionsStreamBody = ParallelSchemas.ChatCompletionRequest & { stream?: true };
export type ParallelChatCompletionsStreamInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { body: ParallelChatCompletionsStreamBody; };
export type ParallelChatCompletionsStreamResponse = AsyncIterable<NativeSSEEvent>;
export type ParallelCreateResponseBody = ParallelSchemas.ResponseCreateRequest & { stream?: false };
export type ParallelCreateResponseInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { body: ParallelCreateResponseBody; };
export type ParallelCreateResponseResponse = ParallelSchemas.Response;
export type ParallelCreateResponseStreamBody = ParallelSchemas.ResponseCreateRequest & { stream?: true };
export type ParallelCreateResponseStreamInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { body: ParallelCreateResponseStreamBody; };
export type ParallelCreateResponseStreamResponse = AsyncIterable<NativeSSEEvent>;

function withoutNullHeaders(input: Omit<NativeRequestInput, "headers"> & { headers?: Readonly<Record<string, string | null | undefined>> }): NativeRequestInput {
  const { headers, ...rest } = input;
  return { ...rest, ...(headers ? { headers: Object.fromEntries(Object.entries(headers).filter((entry): entry is [string, string] => entry[1] !== null && entry[1] !== undefined)) } : {}) };
}

export const parallelOperations = Object.freeze({
  search: Object.freeze({"id":"parallel.search","method":"POST","path":"/v1/search","retryable":false}),
  imageSearch: Object.freeze({"id":"parallel.imageSearch","method":"POST","path":"/v1/images/search","retryable":false}),
  extract: Object.freeze({"id":"parallel.extract","method":"POST","path":"/v1/extract","retryable":false}),
  createTaskGroup: Object.freeze({"id":"parallel.createTaskGroup","method":"POST","path":"/v1/tasks/groups","retryable":false}),
  retrieveTaskGroup: Object.freeze({"id":"parallel.retrieveTaskGroup","method":"GET","path":"/v1/tasks/groups/{taskgroup_id}","retryable":true}),
  streamTaskGroupEvents: Object.freeze({"id":"parallel.streamTaskGroupEvents","method":"GET","path":"/v1/tasks/groups/{taskgroup_id}/events","retryable":true,"response":"sse"}),
  addRunsToTaskGroup: Object.freeze({"id":"parallel.addRunsToTaskGroup","method":"POST","path":"/v1/tasks/groups/{taskgroup_id}/runs","retryable":false}),
  fetchTaskGroupRuns: Object.freeze({"id":"parallel.fetchTaskGroupRuns","method":"GET","path":"/v1/tasks/groups/{taskgroup_id}/runs","retryable":true,"response":"sse"}),
  retrieveTaskGroupRun: Object.freeze({"id":"parallel.retrieveTaskGroupRun","method":"GET","path":"/v1/tasks/groups/{taskgroup_id}/runs/{run_id}","retryable":true}),
  createTaskRun: Object.freeze({"id":"parallel.createTaskRun","method":"POST","path":"/v1/tasks/runs","retryable":false}),
  retrieveTaskRun: Object.freeze({"id":"parallel.retrieveTaskRun","method":"GET","path":"/v1/tasks/runs/{run_id}","retryable":true}),
  streamTaskRunEvents: Object.freeze({"id":"parallel.streamTaskRunEvents","method":"GET","path":"/v1/tasks/runs/{run_id}/events","retryable":true,"response":"sse"}),
  retrieveTaskRunInput: Object.freeze({"id":"parallel.retrieveTaskRunInput","method":"GET","path":"/v1/tasks/runs/{run_id}/input","retryable":true}),
  retrieveTaskRunResult: Object.freeze({"id":"parallel.retrieveTaskRunResult","method":"GET","path":"/v1/tasks/runs/{run_id}/result","retryable":true}),
  fastEntitySearch: Object.freeze({"id":"parallel.fastEntitySearch","method":"POST","path":"/v1beta/findall/entity-search","retryable":false}),
  ingestFindAllRun: Object.freeze({"id":"parallel.ingestFindAllRun","method":"POST","path":"/v1beta/findall/ingest","retryable":false}),
  createFindAllRun: Object.freeze({"id":"parallel.createFindAllRun","method":"POST","path":"/v1beta/findall/runs","retryable":false}),
  retrieveFindAllRunStatus: Object.freeze({"id":"parallel.retrieveFindAllRunStatus","method":"GET","path":"/v1beta/findall/runs/{findall_id}","retryable":true}),
  cancelFindAllRun: Object.freeze({"id":"parallel.cancelFindAllRun","method":"POST","path":"/v1beta/findall/runs/{findall_id}/cancel","retryable":false}),
  addEnrichmentToFindAllRun: Object.freeze({"id":"parallel.addEnrichmentToFindAllRun","method":"POST","path":"/v1beta/findall/runs/{findall_id}/enrich","retryable":false}),
  streamFindAllEvents: Object.freeze({"id":"parallel.streamFindAllEvents","method":"GET","path":"/v1beta/findall/runs/{findall_id}/events","retryable":true,"response":"sse"}),
  extendFindAllRun: Object.freeze({"id":"parallel.extendFindAllRun","method":"POST","path":"/v1beta/findall/runs/{findall_id}/extend","retryable":false}),
  findAllRunResult: Object.freeze({"id":"parallel.findAllRunResult","method":"GET","path":"/v1beta/findall/runs/{findall_id}/result","retryable":true}),
  getFindAllRunSchema: Object.freeze({"id":"parallel.getFindAllRunSchema","method":"GET","path":"/v1beta/findall/runs/{findall_id}/schema","retryable":true}),
  createMonitor: Object.freeze({"id":"parallel.createMonitor","method":"POST","path":"/v1/monitors","retryable":false}),
  listMonitors: Object.freeze({"id":"parallel.listMonitors","method":"GET","path":"/v1/monitors","retryable":true}),
  monitorStats: Object.freeze({"id":"parallel.monitorStats","method":"GET","path":"/v1/monitors/stats","retryable":true}),
  retrieveMonitor: Object.freeze({"id":"parallel.retrieveMonitor","method":"GET","path":"/v1/monitors/{monitor_id}","retryable":true}),
  cancelMonitor: Object.freeze({"id":"parallel.cancelMonitor","method":"POST","path":"/v1/monitors/{monitor_id}/cancel","retryable":false}),
  listMonitorEvents: Object.freeze({"id":"parallel.listMonitorEvents","method":"GET","path":"/v1/monitors/{monitor_id}/events","retryable":true}),
  triggerMonitorRun: Object.freeze({"id":"parallel.triggerMonitorRun","method":"POST","path":"/v1/monitors/{monitor_id}/trigger","retryable":false}),
  updateMonitor: Object.freeze({"id":"parallel.updateMonitor","method":"POST","path":"/v1/monitors/{monitor_id}/update","retryable":false}),
  clearMemory: Object.freeze({"id":"parallel.clearMemory","method":"POST","path":"/v1beta/memory/clear","retryable":false}),
  evictFromMemory: Object.freeze({"id":"parallel.evictFromMemory","method":"POST","path":"/v1beta/memory/evict","retryable":false}),
  retrieveMemory: Object.freeze({"id":"parallel.retrieveMemory","method":"POST","path":"/v1beta/memory/retrieve","retryable":false}),
  chatCompletions: Object.freeze({"id":"parallel.chatCompletions","method":"POST","path":"/v1beta/chat/completions","retryable":false}),
  chatCompletionsStream: Object.freeze({"id":"parallel.chatCompletionsStream","method":"POST","path":"/v1beta/chat/completions","retryable":false,"response":"sse"}),
  createResponse: Object.freeze({"id":"parallel.createResponse","method":"POST","path":"/v1/responses","retryable":false}),
  createResponseStream: Object.freeze({"id":"parallel.createResponseStream","method":"POST","path":"/v1/responses","retryable":false,"response":"sse"}),
} satisfies Record<string, NativeOperation>);

export function createParallelClient(options: ParallelClientOptions) {
  if (!options || typeof options !== "object" || Array.isArray(options)) throw new SearchError("configuration");
  exactFields(options, ["apiKey", "fetch", "timeoutMs", "retry", "maxResponseBytes", "maxConcurrency"], "configuration");
  const { apiKey, fetch } = adapterOptions({ apiKey: options.apiKey, ...(options.fetch !== undefined ? { fetch: options.fetch } : {}) });
  const { timeoutMs, retry, maxResponseBytes, maxConcurrency } = options;
  const config = { fetch, ...(timeoutMs !== undefined ? { timeoutMs } : {}), ...(retry !== undefined ? { retry } : {}),
    ...(maxResponseBytes !== undefined ? { maxResponseBytes } : {}), ...(maxConcurrency !== undefined ? { maxConcurrency } : {}) };
  const transport0 = createNativeTransport({ ...config, provider: "parallel", baseUrl: "https://api.parallel.ai", headers: { "x-api-key": apiKey } });
  return Object.freeze({
    operations: parallelOperations,
    /** Search */
    async search(input: ParallelSearchInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      return transport0.request<ParallelSearchResponse>(parallelOperations.search, input);
    },
    /** Image search */
    async imageSearch(input: ParallelImageSearchInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      return transport0.request<ParallelImageSearchResponse>(parallelOperations.imageSearch, input);
    },
    /** Extract */
    async extract(input: ParallelExtractInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      return transport0.request<ParallelExtractResponse>(parallelOperations.extract, input);
    },
    /** Create Task Group */
    async createTaskGroup(input: ParallelCreateTaskGroupInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      return transport0.request<ParallelCreateTaskGroupResponse>(parallelOperations.createTaskGroup, input);
    },
    /** Retrieve Task Group */
    async retrieveTaskGroup(input: ParallelRetrieveTaskGroupInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport0.request<ParallelRetrieveTaskGroupResponse>(parallelOperations.retrieveTaskGroup, input);
    },
    /** Stream Task Group Events */
    async streamTaskGroupEvents(input: ParallelStreamTaskGroupEventsInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport0.request<ParallelStreamTaskGroupEventsResponse>(parallelOperations.streamTaskGroupEvents, input);
    },
    /** Add Runs to Task Group */
    async addRunsToTaskGroup(input: ParallelAddRunsToTaskGroupInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      return transport0.request<ParallelAddRunsToTaskGroupResponse>(parallelOperations.addRunsToTaskGroup, withoutNullHeaders(input));
    },
    /** Fetch Task Group Runs */
    async fetchTaskGroupRuns(input: ParallelFetchTaskGroupRunsInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport0.request<ParallelFetchTaskGroupRunsResponse>(parallelOperations.fetchTaskGroupRuns, input);
    },
    /** Retrieve Task Group Run */
    async retrieveTaskGroupRun(input: ParallelRetrieveTaskGroupRunInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport0.request<ParallelRetrieveTaskGroupRunResponse>(parallelOperations.retrieveTaskGroupRun, input);
    },
    /** Create Task Run */
    async createTaskRun(input: ParallelCreateTaskRunInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      return transport0.request<ParallelCreateTaskRunResponse>(parallelOperations.createTaskRun, withoutNullHeaders(input));
    },
    /** Retrieve Task Run */
    async retrieveTaskRun(input: ParallelRetrieveTaskRunInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport0.request<ParallelRetrieveTaskRunResponse>(parallelOperations.retrieveTaskRun, input);
    },
    /** Stream Task Run Events */
    async streamTaskRunEvents(input: ParallelStreamTaskRunEventsInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport0.request<ParallelStreamTaskRunEventsResponse>(parallelOperations.streamTaskRunEvents, input);
    },
    /** Retrieve Task Run Input */
    async retrieveTaskRunInput(input: ParallelRetrieveTaskRunInputInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport0.request<ParallelRetrieveTaskRunInputResponse>(parallelOperations.retrieveTaskRunInput, input);
    },
    /** Retrieve Task Run Result */
    async retrieveTaskRunResult(input: ParallelRetrieveTaskRunResultInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport0.request<ParallelRetrieveTaskRunResultResponse>(parallelOperations.retrieveTaskRunResult, withoutNullHeaders(input));
    },
    /** Fast Entity Search */
    async fastEntitySearch(input: ParallelFastEntitySearchInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      return transport0.request<ParallelFastEntitySearchResponse>(parallelOperations.fastEntitySearch, input);
    },
    /** Ingest FindAll Run */
    async ingestFindAllRun(input: ParallelIngestFindAllRunInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      return transport0.request<ParallelIngestFindAllRunResponse>(parallelOperations.ingestFindAllRun, withoutNullHeaders(input));
    },
    /** Create FindAll Run */
    async createFindAllRun(input: ParallelCreateFindAllRunInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      return transport0.request<ParallelCreateFindAllRunResponse>(parallelOperations.createFindAllRun, withoutNullHeaders(input));
    },
    /** Retrieve FindAll Run Status */
    async retrieveFindAllRunStatus(input: ParallelRetrieveFindAllRunStatusInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport0.request<ParallelRetrieveFindAllRunStatusResponse>(parallelOperations.retrieveFindAllRunStatus, withoutNullHeaders(input));
    },
    /** Cancel FindAll Run */
    async cancelFindAllRun(input: ParallelCancelFindAllRunInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport0.request<ParallelCancelFindAllRunResponse>(parallelOperations.cancelFindAllRun, withoutNullHeaders(input));
    },
    /** Add Enrichment to FindAll Run */
    async addEnrichmentToFindAllRun(input: ParallelAddEnrichmentToFindAllRunInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      return transport0.request<ParallelAddEnrichmentToFindAllRunResponse>(parallelOperations.addEnrichmentToFindAllRun, withoutNullHeaders(input));
    },
    /** Stream FindAll Events */
    async streamFindAllEvents(input: ParallelStreamFindAllEventsInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport0.request<ParallelStreamFindAllEventsResponse>(parallelOperations.streamFindAllEvents, withoutNullHeaders(input));
    },
    /** Extend FindAll Run */
    async extendFindAllRun(input: ParallelExtendFindAllRunInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      return transport0.request<ParallelExtendFindAllRunResponse>(parallelOperations.extendFindAllRun, withoutNullHeaders(input));
    },
    /** FindAll Run Result */
    async findAllRunResult(input: ParallelFindAllRunResultInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport0.request<ParallelFindAllRunResultResponse>(parallelOperations.findAllRunResult, withoutNullHeaders(input));
    },
    /** Get FindAll Run Schema */
    async getFindAllRunSchema(input: ParallelGetFindAllRunSchemaInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport0.request<ParallelGetFindAllRunSchemaResponse>(parallelOperations.getFindAllRunSchema, withoutNullHeaders(input));
    },
    /** Create Monitor */
    async createMonitor(input: ParallelCreateMonitorInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      return transport0.request<ParallelCreateMonitorResponse>(parallelOperations.createMonitor, input);
    },
    /** List Monitors */
    async listMonitors(input: ParallelListMonitorsInput = {}) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport0.request<ParallelListMonitorsResponse>(parallelOperations.listMonitors, input);
    },
    /** Monitor Stats */
    async monitorStats(input: ParallelMonitorStatsInput = {}) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport0.request<ParallelMonitorStatsResponse>(parallelOperations.monitorStats, input);
    },
    /** Retrieve Monitor */
    async retrieveMonitor(input: ParallelRetrieveMonitorInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport0.request<ParallelRetrieveMonitorResponse>(parallelOperations.retrieveMonitor, input);
    },
    /** Cancel Monitor */
    async cancelMonitor(input: ParallelCancelMonitorInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport0.request<ParallelCancelMonitorResponse>(parallelOperations.cancelMonitor, input);
    },
    /** List Monitor Events */
    async listMonitorEvents(input: ParallelListMonitorEventsInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport0.request<ParallelListMonitorEventsResponse>(parallelOperations.listMonitorEvents, input);
    },
    /** Trigger Monitor Run */
    async triggerMonitorRun(input: ParallelTriggerMonitorRunInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport0.request<ParallelTriggerMonitorRunResponse>(parallelOperations.triggerMonitorRun, input);
    },
    /** Update Monitor */
    async updateMonitor(input: ParallelUpdateMonitorInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      return transport0.request<ParallelUpdateMonitorResponse>(parallelOperations.updateMonitor, input);
    },
    /** Clear Memory */
    async clearMemory(input: ParallelClearMemoryInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      return transport0.request<ParallelClearMemoryResponse>(parallelOperations.clearMemory, input);
    },
    /** Evict from Memory */
    async evictFromMemory(input: ParallelEvictFromMemoryInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      return transport0.request<ParallelEvictFromMemoryResponse>(parallelOperations.evictFromMemory, input);
    },
    /** Retrieve Memory */
    async retrieveMemory(input: ParallelRetrieveMemoryInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      return transport0.request<ParallelRetrieveMemoryResponse>(parallelOperations.retrieveMemory, input);
    },
    /** Chat Completions */
    async chatCompletions(input: ParallelChatCompletionsInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      if (input.body && (input.body as { stream?: unknown }).stream === true) throw new SearchError("unsupported_option");
      return transport0.request<ParallelChatCompletionsResponse>(parallelOperations.chatCompletions, input);
    },
    /** Chat Completions */
    async chatCompletionsStream(input: ParallelChatCompletionsStreamInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      return transport0.request<ParallelChatCompletionsStreamResponse>(parallelOperations.chatCompletionsStream, { ...input, body: { ...input.body, stream: true } });
    },
    /** Create Response */
    async createResponse(input: ParallelCreateResponseInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      if (input.body && (input.body as { stream?: unknown }).stream === true) throw new SearchError("unsupported_option");
      return transport0.request<ParallelCreateResponseResponse>(parallelOperations.createResponse, input);
    },
    /** Create Response */
    async createResponseStream(input: ParallelCreateResponseStreamInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      return transport0.request<ParallelCreateResponseStreamResponse>(parallelOperations.createResponseStream, { ...input, body: { ...input.body, stream: true } });
    },
  });
}
export type ParallelClient = ReturnType<typeof createParallelClient>;
