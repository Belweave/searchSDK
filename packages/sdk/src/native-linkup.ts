/** Official public contracts reviewed 2026-10-22. See docs/provider-surfaces-b.md. */
import { createNativeTransport } from "./native-transport.js";
import type { NativeOperation, NativeRequestInput, NativeTransportConfig, NativeSSEEvent } from "./native-transport.js";
import { adapterOptions } from "./http.js";
import { exactFields } from "./validation.js";
import { SearchError } from "./errors.js";
export type LinkupClientOptions = Omit<NativeTransportConfig, "provider" | "baseUrl" | "headers"> & { apiKey: string };
export namespace LinkupSchemas {
  export type CreditOutput_Output = {
    "balance": number;
  };
  export type ExtractTaskInput = {
    "q": string;
    "schema"?: unknown;
    "url": string;
    "verifyUrls"?: boolean;
    [key: string]: unknown;
  };
  export type PostExtractInput = ExtractTaskInput;
  export type ExtractTaskInput_Output = {
    "q": string;
    "schema"?: Record<string, unknown>;
    "url": string;
    "verifyUrls"?: boolean;
  };
  export type ExtractOutput_Output = {
    "creditsUsed": number;
    "resultUrl": string;
    "rowsReturned": number;
  };
  export type ExtractTaskOutput_Output = {
    "createdAt": string;
    "error": (string | null);
    "id": string;
    "status": "completed" | "failed" | "pending" | "processing";
    "updatedAt": string;
    "input": ExtractTaskInput_Output;
    "output": (ExtractOutput_Output | null);
    "type": "extract";
  };
  export type PostExtractOutput_Output = ExtractTaskOutput_Output;
  export type ExtractTaskOutput = {
    "createdAt": string;
    "error": (string | null);
    "id": string;
    "status": "completed" | "failed" | "pending" | "processing";
    "updatedAt": string;
    "input": ExtractTaskInput;
    "output": (ExtractOutput | null);
    "type": "extract";
    [key: string]: unknown;
  };
  export type ExtractOutput = {
    "creditsUsed": number;
    "resultUrl": string;
    "rowsReturned": number;
    [key: string]: unknown;
  };
  export type ListExtractOutput = {
    "metadata": {
      "page": number;
      "pageSize": number;
      "total": number;
      "totalPages": number;
      [key: string]: unknown;
    };
    "data": ReadonlyArray<ExtractTaskOutput>;
    [key: string]: unknown;
  };
  export type FetchImageOutput = {
    "alt": string;
    "url": string;
    [key: string]: unknown;
  };
  export type FetchInput = {
    "extractImages"?: (boolean | string);
    "includeRawContent"?: (boolean | string);
    "includeRawHtml"?: (boolean | string);
    "renderJs"?: (boolean | string);
    "mode"?: "standard" | "pro";
    "instructions"?: string;
    "schema"?: unknown;
    "url": string;
    [key: string]: unknown;
  };
  export type FetchImageOutput_Output = {
    "alt": string;
    "url": string;
  };
  export type FetchOutput_Output = {
    "contentType"?: string;
    "data"?: Record<string, unknown>;
    "favicon": string;
    "images"?: ReadonlyArray<FetchImageOutput_Output>;
    "markdown": string;
    "rawContent"?: string;
    "rawHtml"?: string;
  };
  export type Source = {
    "name": string;
    "url": string;
    "favicon": ("" | string);
    "snippet": string;
    [key: string]: unknown;
  };
  export type SourcedAnswerOutput = {
    "answer": string;
    "sources": ReadonlyArray<Source>;
    [key: string]: unknown;
  };
  export type TextSearchResultOutput = {
    "name": string;
    "url": string;
    "content": string;
    "favicon": ("" | string);
    "type": "text";
    [key: string]: unknown;
  };
  export type ImageSearchResultOutput = {
    "name": string;
    "url": string;
    "type": "image";
    [key: string]: unknown;
  };
  export type SearchResultsOutput = {
    "results": ReadonlyArray<(TextSearchResultOutput | ImageSearchResultOutput)>;
    [key: string]: unknown;
  };
  export type SearchOutput = Record<string, unknown>;
  export type StructuredWithSourcesOutput = {
    "data": Record<string, unknown>;
    "sources": ReadonlyArray<(TextSearchResultOutput | ImageSearchResultOutput)>;
    [key: string]: unknown;
  };
  export type SearchInput = {
    "excludeDomains"?: ReadonlyArray<string>;
    "fromDate"?: (string | null);
    "includeDomains"?: ReadonlyArray<string>;
    "q": string;
    "structuredOutputSchema"?: unknown;
    "toDate"?: (string | null);
    "depth": "deep" | "fast" | "flash" | "standard";
    "includeImages"?: (boolean | string);
    "includeInlineCitations"?: (boolean | string);
    "includeSources"?: (boolean | string);
    "maxResults"?: number;
    "outputType": "searchResults" | "sourcedAnswer" | "structured";
    [key: string]: unknown;
  };
  export type FetchOutput = {
    "contentType"?: string;
    "data"?: Record<string, unknown>;
    "favicon": string;
    "images"?: ReadonlyArray<FetchImageOutput>;
    "markdown": string;
    "rawContent"?: string;
    "rawHtml"?: string;
    [key: string]: unknown;
  };
  export type TaskInput = ({
    "input": SearchTaskInput;
    "type": "search";
    [key: string]: unknown;
  } | {
    "input": FetchTaskInput;
    "type": "fetch";
    [key: string]: unknown;
  } | {
    "input": ResearchTaskInput;
    "type": "research";
    [key: string]: unknown;
  } | {
    "input": ExtractTaskInput;
    "type": "extract";
    [key: string]: unknown;
  });
  export type SearchTaskInput = {
    "excludeDomains"?: ReadonlyArray<string>;
    "fromDate"?: (string | null);
    "includeDomains"?: ReadonlyArray<string>;
    "q": string;
    "structuredOutputSchema"?: unknown;
    "toDate"?: (string | null);
    "depth": "deep" | "fast" | "flash" | "standard";
    "includeImages"?: (boolean | string);
    "includeInlineCitations"?: (boolean | string);
    "includeSources"?: (boolean | string);
    "maxResults"?: number;
    "outputType": "searchResults" | "sourcedAnswer" | "structured";
    [key: string]: unknown;
  };
  export type FetchTaskInput = {
    "extractImages"?: (boolean | string);
    "includeRawContent"?: (boolean | string);
    "includeRawHtml"?: (boolean | string);
    "renderJs"?: (boolean | string);
    "mode"?: "standard" | "pro";
    "instructions"?: string;
    "schema"?: unknown;
    "url": string;
    [key: string]: unknown;
  };
  export type ResearchTaskInput = {
    "excludeDomains"?: ReadonlyArray<string>;
    "fromDate"?: (string | null);
    "includeDomains"?: ReadonlyArray<string>;
    "q": string;
    "structuredOutputSchema"?: unknown;
    "toDate"?: (string | null);
    "mode"?: "answer" | "auto" | "investigate" | "research";
    "outputType": "sourcedAnswer" | "structured";
    "reasoningDepth"?: "L" | "M" | "S" | "XL";
    [key: string]: unknown;
  };
  export type TasksInput = ReadonlyArray<TaskInput>;
  export type TaskOutput_Output = ({
    "createdAt": string;
    "error": (string | null);
    "id": string;
    "status": "completed" | "failed" | "pending" | "processing";
    "updatedAt": string;
    "input": SearchTaskInput_Output;
    "output": ((SourcedAnswerOutput_Output | SearchResultsOutput_Output | StructuredWithSourcesOutput_Output | StructuredOutput_Output) | null);
    "type": "search";
  } | {
    "createdAt": string;
    "error": (string | null);
    "id": string;
    "status": "completed" | "failed" | "pending" | "processing";
    "updatedAt": string;
    "input": FetchTaskInput_Output;
    "output": (FetchOutput_Output | null);
    "type": "fetch";
  } | ResearchTaskOutput_Output | ExtractTaskOutput_Output);
  export type SearchTaskInput_Output = {
    "excludeDomains"?: ReadonlyArray<string>;
    "fromDate"?: string;
    "includeDomains"?: ReadonlyArray<string>;
    "q": string;
    "structuredOutputSchema"?: Record<string, unknown>;
    "toDate": string;
    "depth": "deep" | "fast" | "flash" | "standard";
    "includeImages": boolean;
    "includeInlineCitations": boolean;
    "includeSources": boolean;
    "maxResults"?: number;
    "outputType": "searchResults" | "sourcedAnswer" | "structured";
  };
  export type SourcedAnswerOutput_Output = {
    "answer": string;
    "sources": ReadonlyArray<Source_Output>;
  };
  export type Source_Output = {
    "name": string;
    "url": string;
    "favicon": ("" | string);
    "snippet": string;
  };
  export type SearchResultsOutput_Output = {
    "results": ReadonlyArray<(TextSearchResultOutput_Output | ImageSearchResultOutput_Output)>;
  };
  export type TextSearchResultOutput_Output = {
    "name": string;
    "url": string;
    "content": string;
    "favicon": ("" | string);
    "type": "text";
  };
  export type ImageSearchResultOutput_Output = {
    "name": string;
    "url": string;
    "type": "image";
  };
  export type StructuredWithSourcesOutput_Output = {
    "data": Record<string, unknown>;
    "sources": ReadonlyArray<(TextSearchResultOutput_Output | ImageSearchResultOutput_Output)>;
  };
  export type StructuredOutput_Output = Record<string, unknown>;
  export type FetchTaskInput_Output = {
    "extractImages": boolean;
    "includeRawContent": boolean;
    "includeRawHtml": boolean;
    "renderJs": boolean;
    "mode": "standard" | "pro";
    "instructions"?: string;
    "schema"?: Record<string, unknown>;
    "url": string;
  };
  export type ResearchTaskOutput_Output = {
    "createdAt": string;
    "error": (string | null);
    "id": string;
    "status": "completed" | "failed" | "pending" | "processing";
    "updatedAt": string;
    "input": ResearchTaskInput_Output;
    "output": ((ResearchSourcedAnswerOutput_Output | StructuredOutput_Output) | null);
    "type": "research";
  };
  export type ResearchTaskInput_Output = {
    "excludeDomains"?: ReadonlyArray<string>;
    "fromDate"?: string;
    "includeDomains"?: ReadonlyArray<string>;
    "q": string;
    "structuredOutputSchema"?: Record<string, unknown>;
    "toDate": string;
    "mode": "answer" | "auto" | "investigate" | "research";
    "outputType": "sourcedAnswer" | "structured";
    "reasoningDepth": "L" | "M" | "S" | "XL";
  };
  export type ResearchSourcedAnswerOutput_Output = SourcedAnswerOutput_Output;
  export type PostTasksOutput_Output = ReadonlyArray<TaskOutput_Output>;
  export type TaskOutput = ({
    "createdAt": string;
    "error": (string | null);
    "id": string;
    "status": "completed" | "failed" | "pending" | "processing";
    "updatedAt": string;
    "input": SearchTaskInput;
    "output": ((SourcedAnswerOutput | SearchResultsOutput | StructuredWithSourcesOutput | StructuredOutput) | null);
    "type": "search";
    [key: string]: unknown;
  } | {
    "createdAt": string;
    "error": (string | null);
    "id": string;
    "status": "completed" | "failed" | "pending" | "processing";
    "updatedAt": string;
    "input": FetchTaskInput;
    "output": (FetchOutput | null);
    "type": "fetch";
    [key: string]: unknown;
  } | ResearchTaskOutput | ExtractTaskOutput);
  export type StructuredOutput = Record<string, unknown>;
  export type ResearchTaskOutput = {
    "createdAt": string;
    "error": (string | null);
    "id": string;
    "status": "completed" | "failed" | "pending" | "processing";
    "updatedAt": string;
    "input": ResearchTaskInput;
    "output": ((ResearchSourcedAnswerOutput | StructuredOutput) | null);
    "type": "research";
    [key: string]: unknown;
  };
  export type ResearchSourcedAnswerOutput = SourcedAnswerOutput;
  export type TasksQuota = {
    "inFlight": number;
    "limit": number;
    [key: string]: unknown;
  };
  export type ListTasksOutput = {
    "metadata": {
      "page": number;
      "pageSize": number;
      "total": number;
      "totalPages": number;
      [key: string]: unknown;
    };
    "data": ReadonlyArray<TaskOutput>;
    "quota": TasksQuota;
    [key: string]: unknown;
  };
  export type ResponsesTextFormatInput = {
    "format": (string | Record<string, unknown>);
    [key: string]: unknown;
  };
  export type CreateResponsesInput = {
    "input": (string | ReadonlyArray<{
      "content": string;
      "role": "user" | "assistant" | "developer";
      [key: string]: unknown;
    }>);
    "instructions"?: string;
    "model": "linkup-deep" | "linkup-standard";
    "text"?: ResponsesTextFormatInput;
    [key: string]: unknown;
  };
  export type ResponsesMessageOutput_Output = {
    "content": ReadonlyArray<ResponsesTextOutput_Output>;
    "id": string;
    "role": "assistant";
    "status": "completed";
    "type": "message";
  };
  export type ResponsesTextOutput_Output = {
    "annotations": ReadonlyArray<ResponsesUrlCitationOutput_Output>;
    "text": string;
    "type": "output_text";
  };
  export type ResponsesUrlCitationOutput_Output = {
    "end_index": number;
    "start_index": number;
    "title": string;
    "type": "url_citation";
    "url": string;
  };
  export type ResponsesOutput_Output = {
    "created_at": number;
    "error": (string | null);
    "id": string;
    "incomplete_details": null;
    "instructions": null;
    "metadata": null;
    "model": string;
    "object": "response";
    "output": (ReadonlyArray<ResponsesMessageOutput_Output> | null);
    "output_text": string;
    "parallel_tool_calls": boolean;
    "temperature": null;
    "tool_choice": "auto";
    "tools": ReadonlyArray<unknown>;
    "top_p": null;
  };
  export type PostResearchInput = {
    "excludeDomains"?: ReadonlyArray<string>;
    "fromDate"?: (string | null);
    "includeDomains"?: ReadonlyArray<string>;
    "q": string;
    "structuredOutputSchema"?: unknown;
    "toDate"?: (string | null);
    "mode"?: "answer" | "auto" | "investigate" | "research";
    "outputType": "sourcedAnswer" | "structured";
    "reasoningDepth"?: "L" | "M" | "S" | "XL";
    [key: string]: unknown;
  };
  export type PostResearchOutput_Output = ResearchTaskOutput_Output;
  export type ListResearchOutput = {
    "metadata": {
      "page": number;
      "pageSize": number;
      "total": number;
      "totalPages": number;
      [key: string]: unknown;
    };
    "data": ReadonlyArray<ResearchTaskOutput>;
    [key: string]: unknown;
  };
  export type RewindSearchInput = {
    "asOf": string;
    "q": string;
    [key: string]: unknown;
  };
  export type RewindSearchOutput_Output = {
    "asOf": string;
    "results": ReadonlyArray<{
      "content": string;
      "name": string;
      "url": string;
      "validFrom": string;
      "validTo": (string | null);
    }>;
  };
  export type RewindFetchInput = {
    "asOf": string;
    "url": string;
    [key: string]: unknown;
  };
  export type RewindFetchOutput_Output = {
    "asOf": string;
    "content": string;
    "name": string;
    "url": string;
    "validFrom": string;
    "validTo": (string | null);
  };
}

export type LinkupBalanceInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & {  };
export type LinkupBalanceResponse = LinkupSchemas.CreditOutput_Output;
export type LinkupCreateExtractBody = LinkupSchemas.PostExtractInput;
export type LinkupCreateExtractInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { body: LinkupCreateExtractBody; };
export type LinkupCreateExtractResponse = LinkupSchemas.PostExtractOutput_Output;
export type LinkupListExtractQuery = { "page"?: number; "pageSize"?: number; "sortBy"?: "createdAt" | "updatedAt"; "sortDirection"?: "asc" | "desc"; };
export type LinkupListExtractInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { query?: LinkupListExtractQuery; };
export type LinkupListExtractResponse = LinkupSchemas.ListExtractOutput;
export type LinkupGetExtractPath = { "id": string; };
export type LinkupGetExtractInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { path: LinkupGetExtractPath; };
export type LinkupGetExtractResponse = LinkupSchemas.ExtractTaskOutput;
export type LinkupFetchPageBody = LinkupSchemas.FetchInput;
export type LinkupFetchPageInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { body: LinkupFetchPageBody; };
export type LinkupFetchPageResponse = LinkupSchemas.FetchOutput_Output;
export type LinkupSearchBody = LinkupSchemas.SearchInput;
export type LinkupSearchInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { body: LinkupSearchBody; };
export type LinkupSearchResponse = (LinkupSchemas.SearchResultsOutput | LinkupSchemas.SourcedAnswerOutput | Record<string, unknown>);
export type LinkupCreateTasksBody = LinkupSchemas.TasksInput;
export type LinkupCreateTasksInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { body: LinkupCreateTasksBody; };
export type LinkupCreateTasksResponse = LinkupSchemas.PostTasksOutput_Output;
export type LinkupListTasksQuery = { "type"?: ReadonlyArray<"extract" | "fetch" | "research" | "search">; "status"?: ReadonlyArray<"completed" | "failed" | "pending" | "processing">; "page"?: number; "pageSize"?: number; "sortBy"?: "createdAt" | "updatedAt"; "sortDirection"?: "asc" | "desc"; };
export type LinkupListTasksInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { query?: LinkupListTasksQuery; };
export type LinkupListTasksResponse = LinkupSchemas.ListTasksOutput;
export type LinkupGetTaskPath = { "id": string; };
export type LinkupGetTaskInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { path: LinkupGetTaskPath; };
export type LinkupGetTaskResponse = LinkupSchemas.TaskOutput;
export type LinkupResponsesBody = LinkupSchemas.CreateResponsesInput;
export type LinkupResponsesInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { body: LinkupResponsesBody; };
export type LinkupResponsesResponse = LinkupSchemas.ResponsesOutput_Output;
export type LinkupCreateResearchBody = LinkupSchemas.PostResearchInput;
export type LinkupCreateResearchInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { body: LinkupCreateResearchBody; };
export type LinkupCreateResearchResponse = LinkupSchemas.PostResearchOutput_Output;
export type LinkupListResearchQuery = { "page"?: number; "pageSize"?: number; "sortBy"?: "createdAt" | "updatedAt"; "sortDirection"?: "asc" | "desc"; };
export type LinkupListResearchInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { query?: LinkupListResearchQuery; };
export type LinkupListResearchResponse = LinkupSchemas.ListResearchOutput;
export type LinkupGetResearchPath = { "id": string; };
export type LinkupGetResearchInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { path: LinkupGetResearchPath; };
export type LinkupGetResearchResponse = LinkupSchemas.ResearchTaskOutput;
export type LinkupRewindSearchBody = LinkupSchemas.RewindSearchInput;
export type LinkupRewindSearchInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { body: LinkupRewindSearchBody; };
export type LinkupRewindSearchResponse = LinkupSchemas.RewindSearchOutput_Output;
export type LinkupRewindFetchBody = LinkupSchemas.RewindFetchInput;
export type LinkupRewindFetchInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { body: LinkupRewindFetchBody; };
export type LinkupRewindFetchResponse = LinkupSchemas.RewindFetchOutput_Output;


export const linkupOperations = Object.freeze({
  balance: Object.freeze({"id":"linkup.balance","method":"GET","path":"/v1/credits/balance","retryable":true}),
  createExtract: Object.freeze({"id":"linkup.createExtract","method":"POST","path":"/v1/extract","retryable":false}),
  listExtract: Object.freeze({"id":"linkup.listExtract","method":"GET","path":"/v1/extract","retryable":true}),
  getExtract: Object.freeze({"id":"linkup.getExtract","method":"GET","path":"/v1/extract/{id}","retryable":true}),
  fetchPage: Object.freeze({"id":"linkup.fetchPage","method":"POST","path":"/v1/fetch","retryable":false}),
  search: Object.freeze({"id":"linkup.search","method":"POST","path":"/v1/search","retryable":false}),
  createTasks: Object.freeze({"id":"linkup.createTasks","method":"POST","path":"/v1/tasks","retryable":false}),
  listTasks: Object.freeze({"id":"linkup.listTasks","method":"GET","path":"/v1/tasks","retryable":true}),
  getTask: Object.freeze({"id":"linkup.getTask","method":"GET","path":"/v1/tasks/{id}","retryable":true}),
  responses: Object.freeze({"id":"linkup.responses","method":"POST","path":"/v1/responses","retryable":false}),
  createResearch: Object.freeze({"id":"linkup.createResearch","method":"POST","path":"/v1/research","retryable":false}),
  listResearch: Object.freeze({"id":"linkup.listResearch","method":"GET","path":"/v1/research","retryable":true}),
  getResearch: Object.freeze({"id":"linkup.getResearch","method":"GET","path":"/v1/research/{id}","retryable":true}),
  rewindSearch: Object.freeze({"id":"linkup.rewindSearch","method":"POST","path":"/v1/rewind/search","retryable":false}),
  rewindFetch: Object.freeze({"id":"linkup.rewindFetch","method":"POST","path":"/v1/rewind/fetch","retryable":false}),
} satisfies Record<string, NativeOperation>);

export function createLinkupClient(options: LinkupClientOptions) {
  if (!options || typeof options !== "object" || Array.isArray(options)) throw new SearchError("configuration");
  exactFields(options, ["apiKey", "fetch", "timeoutMs", "retry", "maxResponseBytes", "maxConcurrency"], "configuration");
  const { apiKey, fetch } = adapterOptions({ apiKey: options.apiKey, ...(options.fetch !== undefined ? { fetch: options.fetch } : {}) });
  const { timeoutMs, retry, maxResponseBytes, maxConcurrency } = options;
  const config = { fetch, ...(timeoutMs !== undefined ? { timeoutMs } : {}), ...(retry !== undefined ? { retry } : {}),
    ...(maxResponseBytes !== undefined ? { maxResponseBytes } : {}), ...(maxConcurrency !== undefined ? { maxConcurrency } : {}) };
  const transport0 = createNativeTransport({ ...config, provider: "linkup", baseUrl: "https://api.linkup.so", headers: { Authorization: `Bearer ${apiKey}` } });
  return Object.freeze({
    operations: linkupOperations,
    /** /credits/balance */
    async balance(input: LinkupBalanceInput = {}) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport0.request<LinkupBalanceResponse>(linkupOperations.balance, input);
    },
    /** /extract */
    async createExtract(input: LinkupCreateExtractInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      return transport0.request<LinkupCreateExtractResponse>(linkupOperations.createExtract, input);
    },
    /** /extract */
    async listExtract(input: LinkupListExtractInput = {}) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport0.request<LinkupListExtractResponse>(linkupOperations.listExtract, input);
    },
    /** /extract/:id */
    async getExtract(input: LinkupGetExtractInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport0.request<LinkupGetExtractResponse>(linkupOperations.getExtract, input);
    },
    /** /fetch */
    async fetchPage(input: LinkupFetchPageInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      return transport0.request<LinkupFetchPageResponse>(linkupOperations.fetchPage, input);
    },
    /** /search */
    async search(input: LinkupSearchInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      return transport0.request<LinkupSearchResponse>(linkupOperations.search, input);
    },
    /** /tasks */
    async createTasks(input: LinkupCreateTasksInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      return transport0.request<LinkupCreateTasksResponse>(linkupOperations.createTasks, input);
    },
    /** /tasks */
    async listTasks(input: LinkupListTasksInput = {}) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport0.request<LinkupListTasksResponse>(linkupOperations.listTasks, input);
    },
    /** /tasks/:id */
    async getTask(input: LinkupGetTaskInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport0.request<LinkupGetTaskResponse>(linkupOperations.getTask, input);
    },
    /** /responses */
    async responses(input: LinkupResponsesInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      return transport0.request<LinkupResponsesResponse>(linkupOperations.responses, input);
    },
    /** /research */
    async createResearch(input: LinkupCreateResearchInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      return transport0.request<LinkupCreateResearchResponse>(linkupOperations.createResearch, input);
    },
    /** /research */
    async listResearch(input: LinkupListResearchInput = {}) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport0.request<LinkupListResearchResponse>(linkupOperations.listResearch, input);
    },
    /** /research/:id */
    async getResearch(input: LinkupGetResearchInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport0.request<LinkupGetResearchResponse>(linkupOperations.getResearch, input);
    },
    /** /rewind/search */
    async rewindSearch(input: LinkupRewindSearchInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      return transport0.request<LinkupRewindSearchResponse>(linkupOperations.rewindSearch, input);
    },
    /** /rewind/fetch */
    async rewindFetch(input: LinkupRewindFetchInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      return transport0.request<LinkupRewindFetchResponse>(linkupOperations.rewindFetch, input);
    },
  });
}
export type LinkupClient = ReturnType<typeof createLinkupClient>;
