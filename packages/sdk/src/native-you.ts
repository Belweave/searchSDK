/** Official public contracts reviewed 2026-10-22. See docs/provider-surfaces-b.md. */
import { createNativeTransport } from "./native-transport.js";
import type { NativeOperation, NativeRequestInput, NativeTransportConfig, NativeSSEEvent } from "./native-transport.js";
import { adapterOptions } from "./http.js";
import { exactFields } from "./validation.js";
import { SearchError } from "./errors.js";
export type YouClientOptions = Omit<NativeTransportConfig, "provider" | "baseUrl" | "headers"> & { apiKey: string };
export namespace YouSchemas {
  export type WebSearchSearchQuery = string;
  export type WebSearchCount = number;
  export type WebSearchFreshness = "day" | "week" | "month" | "year";
  export type WebSearchFreshnessValue = (WebSearchFreshness | string);
  export type WebSearchOffset = number;
  export type WebSearchCountry = "AR" | "AU" | "AT" | "BE" | "BR" | "CA" | "CL" | "DK" | "FI" | "FR" | "DE" | "HK" | "IN" | "ID" | "IT" | "JP" | "KR" | "MY" | "MX" | "NL" | "NZ" | "NO" | "CN" | "PL" | "PT" | "PH" | "RU" | "SA" | "ZA" | "ES" | "SE" | "CH" | "TW" | "TR" | "GB" | "US";
  export type WebSearchLanguage = "AR" | "EU" | "BN" | "BG" | "CA" | "ZH-HANS" | "ZH-HANT" | "HR" | "CS" | "DA" | "NL" | "EN" | "EN-GB" | "ET" | "FI" | "FR" | "GL" | "DE" | "EL" | "GU" | "HE" | "HI" | "HU" | "IS" | "IT" | "JA" | "KN" | "KO" | "LV" | "LT" | "MS" | "ML" | "MR" | "NB" | "PL" | "PT-BR" | "PT-PT" | "PA" | "RO" | "RU" | "SR" | "SK" | "SL" | "ES" | "SV" | "TA" | "TE" | "TH" | "TR" | "UK" | "VI";
  export type WebSearchSafeSearch = "off" | "moderate" | "strict";
  export type WebSearchKnowledge = "core";
  export type WebSearchIncludeDomains = ReadonlyArray<string>;
  export type WebSearchExcludeDomains = ReadonlyArray<string>;
  export type WebSearchBoostDomains = ReadonlyArray<string>;
  export type WebSearchStrictOperators = boolean;
  export type WebSearchExtractionExtractionMode = "highlights" | "full_page";
  export type WebSearchExtractionExtractionSource = "blend" | "cache" | "fetch";
  export type WebSearchHighlightsConfig = {
    "total_max_tokens"?: number;
    [key: string]: unknown;
  };
  export type WebSearchFullPageConfigExtractionFormatsItems = "html" | "markdown";
  export type WebSearchFullPageConfig = {
    "extraction_formats"?: ReadonlyArray<WebSearchFullPageConfigExtractionFormatsItems>;
    [key: string]: unknown;
  };
  export type WebSearchExtraction = {
    "extraction_mode": WebSearchExtractionExtractionMode;
    "extraction_source"?: WebSearchExtractionExtractionSource;
    "highlights"?: WebSearchHighlightsConfig;
    "full_page"?: WebSearchFullPageConfig;
    [key: string]: unknown;
  };
  export type WebSearchLiveCrawl = "web" | "news" | "all";
  export type WebSearchLiveCrawlFormatsItems = "html" | "markdown";
  export type WebSearchLiveCrawlFormats = ReadonlyArray<WebSearchLiveCrawlFormatsItems>;
  export type WebSearchCrawlTimeout = number;
  export type WebSearchSearchRequestBody = {
    "query": WebSearchSearchQuery;
    "count"?: WebSearchCount;
    "freshness"?: WebSearchFreshnessValue;
    "offset"?: WebSearchOffset;
    "country"?: WebSearchCountry;
    "language"?: WebSearchLanguage;
    "safesearch"?: WebSearchSafeSearch;
    "knowledge"?: WebSearchKnowledge;
    "include_domains"?: WebSearchIncludeDomains;
    "exclude_domains"?: WebSearchExcludeDomains;
    "boost_domains"?: WebSearchBoostDomains;
    "strict_operators"?: WebSearchStrictOperators;
    "extraction"?: WebSearchExtraction;
    "livecrawl"?: WebSearchLiveCrawl;
    "livecrawl_formats"?: WebSearchLiveCrawlFormats;
    "crawl_timeout"?: WebSearchCrawlTimeout;
    [key: string]: unknown;
  };
  export type WebSearchWebContentsPost = {
    "html"?: string;
    "markdown"?: string;
    "highlights"?: ReadonlyArray<string>;
    [key: string]: unknown;
  };
  export type WebSearchWebResultPost = {
    "url"?: string;
    "title"?: string;
    "description"?: string;
    "snippets"?: ReadonlyArray<string>;
    "thumbnail_url"?: string;
    "page_age"?: string;
    "contents"?: WebSearchWebContentsPost;
    "favicon_url"?: string;
    [key: string]: unknown;
  };
  export type WebSearchContents = {
    "html"?: string;
    "markdown"?: string;
    [key: string]: unknown;
  };
  export type WebSearchNewsResult = {
    "title"?: string;
    "description"?: string;
    "page_age"?: string;
    "thumbnail_url"?: string;
    "url"?: string;
    "contents"?: WebSearchContents;
    [key: string]: unknown;
  };
  export type WebSearchKnowledgeAttribution = {
    "name": string;
    "source_description"?: string;
    [key: string]: unknown;
  };
  export type WebSearchKnowledgeResult = {
    "type": string;
    "title": string;
    "attribution": ReadonlyArray<WebSearchKnowledgeAttribution>;
    "description"?: string;
    "as_of"?: string;
    [key: string]: unknown;
  };
  export type WebSearchSearchPostResponseResults = {
    "web"?: ReadonlyArray<WebSearchWebResultPost>;
    "news"?: ReadonlyArray<WebSearchNewsResult>;
    "knowledge"?: ReadonlyArray<WebSearchKnowledgeResult>;
    [key: string]: unknown;
  };
  export type WebSearchSearchMetadata = {
    "search_uuid"?: string;
    "query"?: string;
    "latency"?: number;
    [key: string]: unknown;
  };
  export type WebSearchSearchPostResponse = {
    "results"?: WebSearchSearchPostResponseResults;
    "metadata"?: WebSearchSearchMetadata;
    [key: string]: unknown;
  };
  export type WebSearchSearchPostRequestUnauthorizedError = {
    "detail"?: string;
    [key: string]: unknown;
  };
  export type WebSearchUpgradeRequiredResponse = {
    "error": string;
    "message": string;
    "upgrade_url": string;
    "limit"?: number;
    "used"?: number;
    "period"?: string;
    "reset_at"?: string;
    [key: string]: unknown;
  };
  export type WebSearchSearchPostRequestForbiddenError = {
    "detail"?: string;
    [key: string]: unknown;
  };
  export type WebSearchSearchPostRequestUnprocessableEntityError = {
    "error"?: string;
    [key: string]: unknown;
  };
  export type WebSearchSearchPostRequestInternalServerError = {
    "detail"?: string;
    [key: string]: unknown;
  };
  export type ContentsContentsFormatsItems = "html" | "markdown" | "metadata";
  export type ContentsContentsFormats = ReadonlyArray<ContentsContentsFormatsItems>;
  export type ContentsContentsMetadata = {
    "site_name"?: string | null;
    "favicon_url"?: string;
    [key: string]: unknown;
  };
  export type ContentsV1ContentsPostResponsesContentApplicationJsonSchemaItems = {
    "url"?: string;
    "title"?: string;
    "html"?: string | null;
    "markdown"?: string | null;
    "metadata"?: ContentsContentsMetadata;
    [key: string]: unknown;
  };
  export type ContentsContentsRequestUnauthorizedError = {
    "detail"?: string;
    [key: string]: unknown;
  };
  export type ContentsContentsRequestForbiddenError = {
    "detail"?: string;
    [key: string]: unknown;
  };
  export type ContentsContentsRequestUnprocessableEntityError = {
    "error"?: string;
    "code"?: string;
    [key: string]: unknown;
  };
  export type ContentsContentsRequestInternalServerError = {
    "detail"?: string;
    [key: string]: unknown;
  };
  export type AnswerFreshness0 = "day" | "week" | "month" | "year";
  export type AnswerFreshness = (AnswerFreshness0 | string);
  export type AnswerCountry = "AR" | "AU" | "AT" | "BE" | "BR" | "CA" | "CL" | "DK" | "FI" | "FR" | "DE" | "HK" | "IN" | "ID" | "IT" | "JP" | "KR" | "MY" | "MX" | "NL" | "NZ" | "NO" | "CN" | "PL" | "PT" | "PH" | "RU" | "SA" | "ZA" | "ES" | "SE" | "CH" | "TW" | "TR" | "GB" | "US";
  export type AnswerLanguage = "AR" | "EU" | "BN" | "BG" | "CA" | "HR" | "CS" | "DA" | "NL" | "EN" | "EN-GB" | "ET" | "FI" | "FR" | "GL" | "DE" | "EL" | "GU" | "HE" | "HI" | "HU" | "IS" | "IT" | "KN" | "KO" | "LV" | "LT" | "MS" | "ML" | "MR" | "NB" | "PL" | "PA" | "RO" | "RU" | "SR" | "SK" | "SL" | "ES" | "SV" | "TA" | "TE" | "TH" | "TR" | "UK" | "VI";
  export type AnswerSafeSearch = "off" | "moderate" | "strict";
  export type AnswerIncludeDomains = ReadonlyArray<string>;
  export type AnswerExcludeDomains = ReadonlyArray<string>;
  export type AnswerBoostDomains = ReadonlyArray<string>;
  export type AnswerAnswerCitation = {
    "source": string;
    "excerpts": ReadonlyArray<string>;
    [key: string]: unknown;
  };
  export type AnswerAnswerSearchResult = {
    "url": string;
    "title": string;
    "snippets"?: ReadonlyArray<string>;
    "description"?: string;
    "thumbnail_url"?: string;
    "page_age"?: string;
    [key: string]: unknown;
  };
  export type AnswerV1AnswerPostResponsesContentApplicationJsonSchemaResults = {
    "web": ReadonlyArray<AnswerAnswerSearchResult>;
    [key: string]: unknown;
  };
  export type Answeranswer_Response_200 = {
    "answer": string;
    "citations": ReadonlyArray<AnswerAnswerCitation>;
    "results": AnswerV1AnswerPostResponsesContentApplicationJsonSchemaResults;
    [key: string]: unknown;
  };
  export type AnswerAnswerRequestUnauthorizedError = {
    "detail"?: string;
    [key: string]: unknown;
  };
  export type AnswerUpgradeRequiredResponse = {
    "error": string;
    "message": string;
    "upgrade_url": string;
    "limit"?: number;
    "used"?: number;
    "period"?: string;
    "reset_at"?: string;
    [key: string]: unknown;
  };
  export type AnswerAnswerRequestForbiddenError = {
    "detail"?: string;
    [key: string]: unknown;
  };
  export type AnswerV1AnswerPostResponsesContentApplicationJsonSchemaOneOf0DetailItemsLocItems = (string | number);
  export type AnswerV1AnswerPostResponsesContentApplicationJsonSchemaOneOf0DetailItemsInput = (string | Record<string, unknown>);
  export type AnswerV1AnswerPostResponsesContentApplicationJsonSchemaOneOf0DetailItems = {
    "type": string;
    "loc": ReadonlyArray<AnswerV1AnswerPostResponsesContentApplicationJsonSchemaOneOf0DetailItemsLocItems>;
    "msg": string;
    "input": AnswerV1AnswerPostResponsesContentApplicationJsonSchemaOneOf0DetailItemsInput;
    "ctx"?: Record<string, unknown>;
    [key: string]: unknown;
  };
  export type AnswerAnswerRequestUnprocessableEntityError0 = {
    "detail"?: ReadonlyArray<AnswerV1AnswerPostResponsesContentApplicationJsonSchemaOneOf0DetailItems>;
    [key: string]: unknown;
  };
  export type AnswerAPIError = {
    "status": string;
    "code": string;
    "title": string;
    "detail"?: string;
    [key: string]: unknown;
  };
  export type AnswerAPIErrorResponse = {
    "errors": ReadonlyArray<AnswerAPIError>;
    [key: string]: unknown;
  };
  export type AnswerAnswerRequestUnprocessableEntityError = (AnswerAnswerRequestUnprocessableEntityError0 | AnswerAPIErrorResponse);
  export type AnswerDetailErrorResponse = {
    "detail": string;
    [key: string]: unknown;
  };
  export type AnswerAnswerRequestInternalServerError = (AnswerDetailErrorResponse | AnswerAPIErrorResponse);
  export type ResearchV1ResearchPostRequestBodyContentApplicationJsonSchemaResearchEffort = "lite" | "standard" | "deep" | "exhaustive" | "frontier";
  export type ResearchIncludeDomains = ReadonlyArray<string>;
  export type ResearchExcludeDomains = ReadonlyArray<string>;
  export type ResearchBoostDomains = ReadonlyArray<string>;
  export type ResearchFreshness = "day" | "week" | "month" | "year";
  export type ResearchFreshnessValue = (ResearchFreshness | string);
  export type ResearchCountry = "AR" | "AU" | "AT" | "BE" | "BR" | "CA" | "CL" | "DK" | "FI" | "FR" | "DE" | "HK" | "IN" | "ID" | "IT" | "JP" | "KR" | "MY" | "MX" | "NL" | "NZ" | "NO" | "CN" | "PL" | "PT" | "PH" | "RU" | "SA" | "ZA" | "ES" | "SE" | "CH" | "TW" | "TR" | "GB" | "US";
  export type ResearchV1ResearchPostRequestBodyContentApplicationJsonSchemaSourceControl = {
    "include_domains"?: ResearchIncludeDomains;
    "exclude_domains"?: ResearchExcludeDomains;
    "boost_domains"?: ResearchBoostDomains;
    "freshness"?: ResearchFreshnessValue;
    "country"?: ResearchCountry;
    [key: string]: unknown;
  };
  export type ResearchResearchOutputOutputContent = (string | Record<string, unknown>);
  export type ResearchResearchOutputOutputContentType = "text" | "object";
  export type ResearchResearchOutputOutputSourcesItems = {
    "url": string;
    "title"?: string;
    "snippets"?: ReadonlyArray<string>;
    [key: string]: unknown;
  };
  export type ResearchResearchOutputOutput = {
    "content": ResearchResearchOutputOutputContent;
    "content_type": ResearchResearchOutputOutputContentType;
    "sources": ReadonlyArray<ResearchResearchOutputOutputSourcesItems>;
    [key: string]: unknown;
  };
  export type ResearchResearchOutput = {
    "output": ResearchResearchOutputOutput;
    "warnings": ReadonlyArray<string>;
    [key: string]: unknown;
  };
  export type ResearchResearchTaskType = "research";
  export type ResearchResearchTaskStatus = "queued" | "running" | "completed" | "failed" | "cancelled";
  export type ResearchResearchTask = {
    "task_id": string;
    "type": ResearchResearchTaskType;
    "status": ResearchResearchTaskStatus;
    "stream_url": string;
    "created_at": string;
    [key: string]: unknown;
  };
  export type Researchresearch_Response_200 = (ResearchResearchOutput | ResearchResearchTask);
  export type ResearchResearchRequestUnauthorizedError = {
    "detail"?: string;
    [key: string]: unknown;
  };
  export type ResearchResearchRequestForbiddenError = {
    "detail"?: string;
    [key: string]: unknown;
  };
  export type ResearchV1ResearchPostResponsesContentApplicationJsonSchemaDetailItemsLocItems = (string | number);
  export type ResearchV1ResearchPostResponsesContentApplicationJsonSchemaDetailItemsInput = (string | Record<string, unknown>);
  export type ResearchV1ResearchPostResponsesContentApplicationJsonSchemaDetailItems = {
    "type": string;
    "loc": ReadonlyArray<ResearchV1ResearchPostResponsesContentApplicationJsonSchemaDetailItemsLocItems>;
    "msg": string;
    "input": ResearchV1ResearchPostResponsesContentApplicationJsonSchemaDetailItemsInput;
    "ctx"?: Record<string, unknown>;
    [key: string]: unknown;
  };
  export type ResearchResearchRequestUnprocessableEntityError = {
    "detail"?: ReadonlyArray<ResearchV1ResearchPostResponsesContentApplicationJsonSchemaDetailItems>;
    [key: string]: unknown;
  };
  export type ResearchResearchRequestInternalServerError = {
    "detail"?: string;
    [key: string]: unknown;
  };
  export type ResearchResearchTaskDetailTaskType = "research";
  export type ResearchResearchTaskInputResearchEffort = "lite" | "standard" | "deep" | "exhaustive" | "frontier";
  export type ResearchResearchTaskInputSourceControl = Record<string, unknown>;
  export type ResearchResearchTaskInputType = "research";
  export type ResearchResearchTaskInput = {
    "input": string;
    "research_effort": ResearchResearchTaskInputResearchEffort;
    "background": boolean;
    "output_schema": Record<string, unknown> | null;
    "source_control": (ResearchResearchTaskInputSourceControl | null);
    "type": ResearchResearchTaskInputType;
    [key: string]: unknown;
  };
  export type ResearchResearchTaskDetail = {
    "id": string;
    "task_type": ResearchResearchTaskDetailTaskType;
    "status": ResearchResearchTaskStatus;
    "created_at": string;
    "updated_at": string | null;
    "completed_at": string | null;
    "error": string | null;
    "input": ResearchResearchTaskInput;
    "result": (ResearchResearchOutput | null);
    [key: string]: unknown;
  };
  export type ResearchGetResearchTaskRequestUnauthorizedError = {
    "detail"?: string;
    [key: string]: unknown;
  };
  export type ResearchGetResearchTaskRequestForbiddenError = {
    "detail"?: string;
    [key: string]: unknown;
  };
  export type ResearchGetResearchTaskRequestNotFoundError = {
    "detail"?: string;
    [key: string]: unknown;
  };
  export type ResearchGetResearchTaskRequestInternalServerError = {
    "detail"?: string;
    [key: string]: unknown;
  };
  export type ResearchStreamResearchTaskRequestUnauthorizedError = {
    "detail"?: string;
    [key: string]: unknown;
  };
  export type ResearchStreamResearchTaskRequestForbiddenError = {
    "detail"?: string;
    [key: string]: unknown;
  };
  export type ResearchStreamResearchTaskRequestNotFoundError = {
    "detail"?: string;
    [key: string]: unknown;
  };
  export type ResearchStreamResearchTaskRequestInternalServerError = {
    "detail"?: string;
    [key: string]: unknown;
  };
  export type FinanceResearchV1FinanceResearchPostRequestBodyContentApplicationJsonSchemaResearchEffort = "deep" | "exhaustive";
  export type FinanceResearchV1FinanceResearchPostResponsesContentApplicationJsonSchemaOutputContent = (string | Record<string, unknown>);
  export type FinanceResearchV1FinanceResearchPostResponsesContentApplicationJsonSchemaOutputContentType = "text" | "object";
  export type FinanceResearchV1FinanceResearchPostResponsesContentApplicationJsonSchemaOutputSourcesItems = {
    "url": string;
    "title"?: string;
    "snippets"?: ReadonlyArray<string>;
    [key: string]: unknown;
  };
  export type FinanceResearchV1FinanceResearchPostResponsesContentApplicationJsonSchemaOutput = {
    "content": FinanceResearchV1FinanceResearchPostResponsesContentApplicationJsonSchemaOutputContent;
    "content_type": FinanceResearchV1FinanceResearchPostResponsesContentApplicationJsonSchemaOutputContentType;
    "sources": ReadonlyArray<FinanceResearchV1FinanceResearchPostResponsesContentApplicationJsonSchemaOutputSourcesItems>;
    [key: string]: unknown;
  };
  export type FinanceResearchfinance_research_Response_200 = {
    "output": FinanceResearchV1FinanceResearchPostResponsesContentApplicationJsonSchemaOutput;
    "warnings": ReadonlyArray<string>;
    [key: string]: unknown;
  };
  export type FinanceResearchFinance_researchRequestUnauthorizedError = {
    "detail"?: string;
    [key: string]: unknown;
  };
  export type FinanceResearchFinance_researchRequestForbiddenError = {
    "detail"?: string;
    [key: string]: unknown;
  };
  export type FinanceResearchV1FinanceResearchPostResponsesContentApplicationJsonSchemaDetailItemsLocItems = (string | number);
  export type FinanceResearchV1FinanceResearchPostResponsesContentApplicationJsonSchemaDetailItemsInput = (string | Record<string, unknown>);
  export type FinanceResearchV1FinanceResearchPostResponsesContentApplicationJsonSchemaDetailItems = {
    "type": string;
    "loc": ReadonlyArray<FinanceResearchV1FinanceResearchPostResponsesContentApplicationJsonSchemaDetailItemsLocItems>;
    "msg": string;
    "input": FinanceResearchV1FinanceResearchPostResponsesContentApplicationJsonSchemaDetailItemsInput;
    "ctx"?: Record<string, unknown>;
    [key: string]: unknown;
  };
  export type FinanceResearchFinance_researchRequestUnprocessableEntityError = {
    "detail"?: ReadonlyArray<FinanceResearchV1FinanceResearchPostResponsesContentApplicationJsonSchemaDetailItems>;
    [key: string]: unknown;
  };
  export type FinanceResearchFinance_researchRequestInternalServerError = {
    "detail"?: string;
    [key: string]: unknown;
  };
  export type BillingV1BillingAccountBalanceGetResponsesContentApplicationJsonSchemaDataAttributes = {
    "balance": number;
    [key: string]: unknown;
  };
  export type BillingV1BillingAccountBalanceGetResponsesContentApplicationJsonSchemaData = {
    "type": string;
    "id": string;
    "attributes": BillingV1BillingAccountBalanceGetResponsesContentApplicationJsonSchemaDataAttributes;
    [key: string]: unknown;
  };
  export type BillinggetAccountBalance_Response_200 = {
    "data": BillingV1BillingAccountBalanceGetResponsesContentApplicationJsonSchemaData;
    [key: string]: unknown;
  };
  export type BillingGetAccountBalanceRequestUnauthorizedError = {
    "detail"?: string;
    [key: string]: unknown;
  };
  export type BillingGetAccountBalanceRequestForbiddenError = {
    "detail"?: string;
    [key: string]: unknown;
  };
  export type BillingGetAccountBalanceRequestInternalServerError = {
    "detail"?: string;
    [key: string]: unknown;
  };
  export type ImagesV1ImagesGetResponsesContentApplicationJsonSchemaImagesResultsItems = {
    "title"?: string;
    "page_url"?: string;
    "image_url"?: string;
    "thumbnail"?: string;
    "large_thumbnail"?: string;
    [key: string]: unknown;
  };
  export type ImagesV1ImagesGetResponsesContentApplicationJsonSchemaImages = {
    "results"?: ReadonlyArray<ImagesV1ImagesGetResponsesContentApplicationJsonSchemaImagesResultsItems>;
    [key: string]: unknown;
  };
  export type ImagesV1ImagesGetResponsesContentApplicationJsonSchemaMetadata = {
    "query"?: string;
    "search_uuid"?: string;
    [key: string]: unknown;
  };
  export type ImagesreturnsAListOfImagesHitsForQuery_Response_200 = {
    "images"?: ImagesV1ImagesGetResponsesContentApplicationJsonSchemaImages;
    "metadata"?: ImagesV1ImagesGetResponsesContentApplicationJsonSchemaMetadata;
    [key: string]: unknown;
  };
  export type ImagesReturnsAListOfImagesHitsForQueryRequestUnauthorizedError = {
    "detail"?: string;
    [key: string]: unknown;
  };
  export type ImagesReturnsAListOfImagesHitsForQueryRequestForbiddenError = {
    "detail"?: string;
    [key: string]: unknown;
  };
  export type ImagesReturnsAListOfImagesHitsForQueryRequestUnprocessableEntityError = {
    "error"?: string;
    [key: string]: unknown;
  };
  export type ImagesReturnsAListOfImagesHitsForQueryRequestInternalServerError = {
    "detail"?: string;
    [key: string]: unknown;
  };
}

export type YouSearchBody = YouSchemas.WebSearchSearchRequestBody;
export type YouSearchInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { body?: YouSearchBody; };
export type YouSearchResponse = YouSchemas.WebSearchSearchPostResponse;
export type YouContentsBody = {
  "urls"?: ReadonlyArray<string>;
  "formats"?: YouSchemas.ContentsContentsFormats;
  "crawl_timeout"?: number;
  "max_age"?: number | null;
  [key: string]: unknown;
};
export type YouContentsInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { body?: YouContentsBody; };
export type YouContentsResponse = ReadonlyArray<YouSchemas.ContentsV1ContentsPostResponsesContentApplicationJsonSchemaItems>;
export type YouAnswerBody = {
  "query": string;
  "freshness"?: YouSchemas.AnswerFreshness;
  "country"?: YouSchemas.AnswerCountry;
  "language"?: YouSchemas.AnswerLanguage;
  "safesearch"?: YouSchemas.AnswerSafeSearch;
  "include_domains"?: YouSchemas.AnswerIncludeDomains;
  "exclude_domains"?: YouSchemas.AnswerExcludeDomains;
  "boost_domains"?: YouSchemas.AnswerBoostDomains;
  [key: string]: unknown;
};
export type YouAnswerInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { body?: YouAnswerBody; };
export type YouAnswerResponse = YouSchemas.Answeranswer_Response_200;
export type YouResearchBody = {
  "input": string;
  "research_effort"?: YouSchemas.ResearchV1ResearchPostRequestBodyContentApplicationJsonSchemaResearchEffort;
  "source_control"?: YouSchemas.ResearchV1ResearchPostRequestBodyContentApplicationJsonSchemaSourceControl;
  "output_schema"?: Record<string, unknown>;
  "background"?: boolean;
  [key: string]: unknown;
};
export type YouResearchInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { body?: YouResearchBody; };
export type YouResearchResponse = YouSchemas.Researchresearch_Response_200;
export type YouGetResearchTaskPath = { "task_id": string; };
export type YouGetResearchTaskInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { path: YouGetResearchTaskPath; };
export type YouGetResearchTaskResponse = YouSchemas.ResearchResearchTaskDetail;
export type YouStreamResearchTaskPath = { "task_id": string; };
export type YouStreamResearchTaskQuery = { "from_id"?: number; };
export type YouStreamResearchTaskInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { path: YouStreamResearchTaskPath; query?: YouStreamResearchTaskQuery; };
export type YouStreamResearchTaskResponse = AsyncIterable<NativeSSEEvent>;
export type YouFinanceResearchBody = {
  "input": string;
  "research_effort"?: YouSchemas.FinanceResearchV1FinanceResearchPostRequestBodyContentApplicationJsonSchemaResearchEffort;
  "output_schema"?: Record<string, unknown>;
  [key: string]: unknown;
};
export type YouFinanceResearchInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { body?: YouFinanceResearchBody; };
export type YouFinanceResearchResponse = YouSchemas.FinanceResearchfinance_research_Response_200;
export type YouGetAccountBalanceInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & {  };
export type YouGetAccountBalanceResponse = YouSchemas.BillinggetAccountBalance_Response_200;
export type YouImagesQuery = { "q": string; "count"?: number; };
export type YouImagesInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { query: YouImagesQuery; };
export type YouImagesResponse = YouSchemas.ImagesreturnsAListOfImagesHitsForQuery_Response_200;


export const youOperations = Object.freeze({
  search: Object.freeze({"id":"you.search","method":"POST","path":"/v1/search","retryable":false}),
  contents: Object.freeze({"id":"you.contents","method":"POST","path":"/v1/contents","retryable":false}),
  answer: Object.freeze({"id":"you.answer","method":"POST","path":"/v1/answer","retryable":false}),
  research: Object.freeze({"id":"you.research","method":"POST","path":"/v1/research","retryable":false}),
  getResearchTask: Object.freeze({"id":"you.getResearchTask","method":"GET","path":"/v1/research/{task_id}","retryable":true}),
  streamResearchTask: Object.freeze({"id":"you.streamResearchTask","method":"GET","path":"/v1/research/{task_id}/stream","retryable":true,"response":"sse"}),
  financeResearch: Object.freeze({"id":"you.financeResearch","method":"POST","path":"/v1/finance_research","retryable":false}),
  getAccountBalance: Object.freeze({"id":"you.getAccountBalance","method":"GET","path":"/v1/billing/account_balance","retryable":true}),
  images: Object.freeze({"id":"you.images","method":"GET","path":"/v1/images","retryable":true}),
} satisfies Record<string, NativeOperation>);

export function createYouClient(options: YouClientOptions) {
  if (!options || typeof options !== "object" || Array.isArray(options)) throw new SearchError("configuration");
  exactFields(options, ["apiKey", "fetch", "timeoutMs", "retry", "maxResponseBytes", "maxConcurrency"], "configuration");
  const { apiKey, fetch } = adapterOptions({ apiKey: options.apiKey, ...(options.fetch !== undefined ? { fetch: options.fetch } : {}) });
  const { timeoutMs, retry, maxResponseBytes, maxConcurrency } = options;
  const config = { fetch, ...(timeoutMs !== undefined ? { timeoutMs } : {}), ...(retry !== undefined ? { retry } : {}),
    ...(maxResponseBytes !== undefined ? { maxResponseBytes } : {}), ...(maxConcurrency !== undefined ? { maxConcurrency } : {}) };
  const transport0 = createNativeTransport({ ...config, provider: "you", baseUrl: "https://ydc-index.io", headers: { "X-API-Key": apiKey } });
  const transport1 = createNativeTransport({ ...config, provider: "you", baseUrl: "https://api.you.com", headers: { "X-API-Key": apiKey } });
  return Object.freeze({
    operations: youOperations,
    /** Returns a list of unified search results from web and news sources */
    async search(input: YouSearchInput = {}) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport0.request<YouSearchResponse>(youOperations.search, input);
    },
    /** Returns the content of the web pages */
    async contents(input: YouContentsInput = {}) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport0.request<YouContentsResponse>(youOperations.contents, input);
    },
    /** Returns a synthesized answer with citations from web search results */
    async answer(input: YouAnswerInput = {}) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport1.request<YouAnswerResponse>(youOperations.answer, input);
    },
    /** Returns comprehensive research-grade answers with multi-step reasoning */
    async research(input: YouResearchInput = {}) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport1.request<YouResearchResponse>(youOperations.research, input);
    },
    /** Get the status or result of a background research task */
    async getResearchTask(input: YouGetResearchTaskInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport1.request<YouGetResearchTaskResponse>(youOperations.getResearchTask, input);
    },
    /** Stream progress for a background research task */
    async streamResearchTask(input: YouStreamResearchTaskInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport1.request<YouStreamResearchTaskResponse>(youOperations.streamResearchTask, input);
    },
    /** Returns comprehensive finance-grade research answers with multi-step reasoning */
    async financeResearch(input: YouFinanceResearchInput = {}) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport1.request<YouFinanceResearchResponse>(youOperations.financeResearch, input);
    },
    /** Returns the current credit balance for the billing entity */
    async getAccountBalance(input: YouGetAccountBalanceInput = {}) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport1.request<YouGetAccountBalanceResponse>(youOperations.getAccountBalance, input);
    },
    /** Returns a list of images hits for query */
    async images(input: YouImagesInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.query?.["q"] == null) throw new SearchError("invalid_request");
      return transport1.request<YouImagesResponse>(youOperations.images, input);
    },
  });
}
export type YouClient = ReturnType<typeof createYouClient>;
