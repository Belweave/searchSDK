// Native wire types and operations derived from official provider documentation.
// Sources, access gates, and verification limits: docs/provider-surfaces-a.md.
// Static wire types are not JSON Schema validation: ranges, patterns, and if/then
// constraints remain provider responsibilities; unconstrained source data stays unknown.
import { createNativeTransport } from "./native-transport.js";
import type { NativeOperation, NativeRequestInput, NativeResponse, NativeSSEEvent, NativeTransportConfig } from "./native-transport.js";
import { SearchError } from "./errors.js";

export interface ContextClientOptions extends Omit<NativeTransportConfig, "provider" | "baseUrl" | "headers"> {
  /** Server-side credential. Never embed it in browser bundles. */
  apiKey: string;
}

export type ContextSchemaRequestTags = Array<string>;

export type ContextSchemaSubmitFeedbackResponse = {
  /** ID of the stored feedback. */
  "feedback_id": string;
  /** True when feedback for this request_id was already recorded; the original feedback_id is returned. */
  "already_submitted": boolean;
  "key_metadata"?: ContextSchemaKeyMetadata;
  "request_id": ContextSchemaRequestId;
};

export type ContextSchemaListLogsResponse = {
  /** Log entries, newest first. */
  "data": Array<ContextSchemaLogEntry>;
  /** Current page number. */
  "page": number;
  /** Entries per page. */
  "limit": number;
  /** Whether a next page exists. */
  "has_more": boolean;
  "key_metadata"?: ContextSchemaKeyMetadata;
  "request_id": ContextSchemaRequestId;
};

export type ContextSchemaGetLogResponse = {
  "data": ContextSchemaLogDetail;
  "key_metadata"?: ContextSchemaKeyMetadata;
  "request_id": ContextSchemaRequestId;
};

export type ContextSchemaListProfilesResponse = {
  /** Browser profiles, newest first. */
  "data": Array<ContextSchemaBrowserProfile>;
  /** Whether a next page exists. */
  "has_more": boolean;
  /** Pass as `cursor` to fetch the next page. */
  "next_cursor": string | null;
  "key_metadata"?: ContextSchemaKeyMetadata;
  "request_id": ContextSchemaRequestId;
};

export type ContextSchemaOrgUsageResponse = {
  /** Credits available to your organization right now. */
  "credits_remaining": number;
  /** The current monthly credit period, or null when your organization has no monthly credits or billing is paused. */
  "period": {
    /** When the current credit period started. (format date-time) */
    "start": string;
    /** Credits charged since `start`. */
    "credits_used": number;
  } | null;
  /** The next monthly refill, or null when no refill is scheduled. While billing is paused, this is when billing resumes. */
  "next_refill": {
    /** When your credits next refill. (format date-time) */
    "at": string;
    /** Your balance is reset to this amount at the refill. Unused credits do not carry over. */
    "credits": number;
  } | null;
  /** Auto-Topup settings and spend. */
  "auto_topup": {
    /** Whether credits are added automatically when your balance runs out. */
    "enabled": boolean;
    /** Credits added by Auto-Topup in the current period. */
    "credits_used_this_period": number;
    /** Monthly Auto-Topup budget you are alerted against, or null when none is set. */
    "monthly_budget_credits": number | null;
  };
  "key_metadata"?: ContextSchemaKeyMetadata;
  "request_id": ContextSchemaRequestId;
};

export type ContextSchemaUsageHistoryResponse = {
  /** One bucket per interval, oldest first. Intervals without usage are included with zero totals. */
  "data": Array<ContextSchemaUsageHistoryBucket>;
  /** Credits charged across the range. */
  "total_credits_used": number;
  /** Requests made across the range. */
  "total_request_count": number;
  /** Bucket size used. */
  "interval": "hour" | "day" | "month";
  /** Start of the range. (format date-time) */
  "from": string;
  /** End of the range. (format date-time) */
  "to": string;
  "key_metadata"?: ContextSchemaKeyMetadata;
  "request_id": ContextSchemaRequestId;
};

export type ContextSchemaListWebhookDeliveriesResponse = {
  /** Webhook deliveries. */
  "data": Array<ContextSchemaWebhookDeliverySummary>;
  /** Whether more deliveries are available. */
  "has_more": boolean;
  /** Next page cursor, or null on the last page. */
  "next_cursor": string | null;
  "key_metadata"?: ContextSchemaKeyMetadata;
  "request_id": ContextSchemaRequestId;
};

export type ContextSchemaWebhookDelivery = {
  /** Delivery ID. */
  "id": string;
  /** Webhook event type. */
  "event": "batch.completed" | "batch.failed" | "batch.cancelled" | "change.detected" | "run.completed";
  /** Batch or monitor run that produced the event. */
  "source": (({
    /** Which deliveries to list: `batch` or `monitor`. */
    "type": "batch";
    /** Batch ID. */
    "batch_id": string;
  }) | ({
    /** Which deliveries to list: `batch` or `monitor`. */
    "type": "monitor";
    /** Monitor ID. */
    "monitor_id": string;
    /** Monitor run ID. */
    "run_id": string;
  }));
  /** Webhook destination URL. (format uri) */
  "url": string;
  /** `pending`, `delivering`, `retrying`, `delivered`, `failed`, or `cancelled` (source or its webhook was removed). */
  "status": "pending" | "delivering" | "retrying" | "delivered" | "failed" | "cancelled";
  /** Event creation time. (format date-time) */
  "created_at": string;
  /** Last time you can retry manually (7 days after the event). (format date-time) */
  "retry_expires_at": string;
  /** Last successful delivery time, or null if never delivered. (format date-time) */
  "delivered_at": string | null;
  /** Next scheduled attempt, or null if none. (format date-time) */
  "next_attempt_at": string | null;
  /** Latest delivery error, or null if none. */
  "last_error": {
    /** Error code. */
    "code": string;
    /** Error details. */
    "message": string;
  } | null;
  /** Stable event ID for deduplicating received webhooks. */
  "event_id": string;
  "retry": ((ContextSchemaWebhookRetry));
  /** Latest attempt, or null if none. */
  "last_attempt": ((ContextSchemaWebhookAttempt) | (null));
};

export type ContextSchemaKeyMetadata = {
  /** Credits charged for this request. */
  "credits_consumed": number;
  /** Credits remaining for your organization. */
  "credits_remaining": number;
};

export type ContextSchemaRequestId = string;

export type ContextSchemaListWebhookAttemptsResponse = {
  /** Delivery attempts. */
  "data": Array<ContextSchemaWebhookAttempt>;
  /** Whether more attempts are available. */
  "has_more": boolean;
  /** Next page cursor, or null on the last page. */
  "next_cursor": string | null;
  "key_metadata"?: ContextSchemaKeyMetadata;
  "request_id": ContextSchemaRequestId;
};

export type ContextSchemaRetryWebhookDeliveryResponse = {
  /** Delivery ID. */
  "id": string;
  "key_metadata"?: ContextSchemaKeyMetadata;
  "request_id": ContextSchemaRequestId;
};

export type ContextSchemaScrapeRequest = {
  /** Public HTTP or HTTPS URL to scrape. (format uri) */
  "url": string;
  /** Outputs to return. Set at least one to `true`. */
  "formats": ContextSchemaScrapeFormats;
  /** Markdown options. Requires `formats.markdown`. */
  "markdownParams"?: ContextSchemaScrapeMarkdownParams;
  /** Screenshot options. Requires formats.screenshot: true. */
  "screenshotParams"?: ContextSchemaScrapeScreenshotParams;
  /** Image options. Requires formats.images: true. */
  "imageParams"?: ContextSchemaScrapeImageParams;
  /** Requires `formats.parse: true`; required when it is set. */
  "parseParams"?: ContextSchemaScrapeParseParams;
  /** Requires `formats.highlights: true`; required when it is set. */
  "highlightsParams"?: ContextSchemaScrapeHighlightsParams;
  /** Requires `formats.json: true`; required when it is set. */
  "jsonParams"?: ContextSchemaScrapeJsonParams;
  /** Product options. Requires formats.product: true. */
  "productParams"?: ContextSchemaScrapeProductParams;
  /** Browser and content settings shared by all outputs. */
  "sharedParams"?: ContextSchemaScrapeSharedParams;
  /** Maximum age of a cached output, in milliseconds. `0` fetches fresh. Defaults to 3 days (259200000 ms). Maximum: 1 year (31536000000 ms). (min 0, max 31536000000) */
  "maxAgeMs"?: number;
  /** `enabled` turns on zero data retention. Your organization must have ZDR enabled. */
  "zdr"?: "enabled" | "disabled";
  /** Deadline for the whole request. Defaults to 90000 ms with `fail`. Fixed waits must end before it. */
  "timeoutOpts"?: ContextSchemaScrapeTimeout;
  /** Labels for tracking request usage. Not retained when zdr is enabled. */
  "tags"?: ContextSchemaRequestTags;
};

export type ContextSchemaScrapeResponse = {
  /** Final URL after redirects and browser actions. (format uri) */
  "url": string;
  /** Rendered HTML after content filters. */
  "html": {
    /** Why the output failed. Present only when `success` is `false`. */
    "error_code"?: string;
    /** Explanation of the failure and possible next steps. */
    "message"?: string;
    "requested": boolean;
    /** `true` if returned, `false` if it failed, `null` if not requested. */
    "success": boolean | null;
    "data": string | null;
  };
  /** Markdown after content filters. */
  "markdown": {
    /** Why the output failed. Present only when `success` is `false`. */
    "error_code"?: string;
    /** Explanation of the failure and possible next steps. */
    "message"?: string;
    "requested": boolean;
    /** `true` if returned, `false` if it failed, `null` if not requested. */
    "success": boolean | null;
    "data": string | null;
  };
  /** Screenshot as a base64 image data URL. */
  "screenshot": {
    /** Why the output failed. Present only when `success` is `false`. */
    "error_code"?: string;
    /** Explanation of the failure and possible next steps. */
    "message"?: string;
    "requested": boolean;
    /** `true` if returned, `false` if it failed, `null` if not requested. */
    "success": boolean | null;
    /**  (format uri) */
    "data": string | null;
  };
  /** Images after content filters. `[]` when none are found. */
  "images": {
    /** Why the output failed. Present only when `success` is `false`. */
    "error_code"?: string;
    /** Explanation of the failure and possible next steps. */
    "message"?: string;
    "requested": boolean;
    /** `true` if returned, `false` if it failed, `null` if not requested. */
    "success": boolean | null;
    "data": Array<ContextSchemaScrapeImage> | null;
  };
  /** The original HTTP response body, unchanged by waits, actions, and filters. */
  "bytes": {
    /** Why the output failed. Present only when `success` is `false`. */
    "error_code"?: string;
    /** Explanation of the failure and possible next steps. */
    "message"?: string;
    "requested": boolean;
    /** `true` if returned, `false` if it failed, `null` if not requested. */
    "success": boolean | null;
    "data": {
      "contentType": string;
      /** Body as base64, after HTTP decompression. Up to 50 MiB decoded. */
      "base64": string;
    } | null;
  };
  /** Custom rules return fields after content filters; unmatched fields are null ([] for lists). Prebuilt parsers return source-specific structured data. See https://docs.context.dev/scrape/prebuilt-parsers for output schemas and request options. */
  "parsed": {
    /** Why the output failed. Present only when `success` is `false`. */
    "error_code"?: string;
    /** Explanation of the failure and possible next steps. */
    "message"?: string;
    /** The selected prebuilt parser name, or custom when type is omitted, custom rules are used, or parsing is not requested. */
    "type": "custom" | "google-maps" | "google-maps-reviews" | "google-play" | "google-play-reviews" | "app-store" | "app-store-reviews" | "g2-reviews" | "instagram-profile" | "instagram-post" | "instagram-feed" | "tiktok-profile" | "tiktok-video" | "tiktok-feed" | "tiktok-comments" | "tiktok-followers" | "tiktok-following" | "tiktok-user-search" | "emails" | "phone-numbers" | "links";
    "requested": boolean;
    /** `true` if returned, `false` if it failed, `null` if not requested. */
    "success": boolean | null;
    "data": {
      [key: string]: unknown;
    } | null;
  };
  /** Relevant Markdown excerpts in page order. `[Heading]` adds context; `…` marks omitted text. */
  "highlights": {
    /** Why the output failed. Present only when `success` is `false`. */
    "error_code"?: string;
    /** Explanation of the failure and possible next steps. */
    "message"?: string;
    "requested": boolean;
    /** `true` if returned, `false` if it failed, `null` if not requested. */
    "success": boolean | null;
    "data": Array<string> | null;
  };
  /** Object matching `jsonParams.schema`. */
  "json": {
    /** Why the output failed. Present only when `success` is `false`. */
    "error_code"?: string;
    /** Explanation of the failure and possible next steps. */
    "message"?: string;
    "requested": boolean;
    /** `true` if returned, `false` if it failed, `null` if not requested. */
    "success": boolean | null;
    "data": {
      [key: string]: unknown;
    } | null;
    /** True when the page was too long to read in full, so values found only in the unread parts may be missing. */
    "isTruncated"?: true;
  };
  /** Product details found on the page. */
  "product": {
    /** Why the output failed. Present only when `success` is `false`. */
    "error_code"?: string;
    /** Explanation of the failure and possible next steps. */
    "message"?: string;
    "requested": boolean;
    /** `true` if returned, `false` if it failed, `null` if not requested. */
    "success": boolean | null;
    "data": ((ContextSchemaScrapeProductResult) | (null));
  };
  /** Authenticated browser profile used for this scrape, or null when no profile was requested. New and existing profile requests both return the profile ID. */
  "profile": {
    /** Save this ID after creating a profile, then reuse it as sharedParams.profile.profileId with type "existing". */
    "id": string;
  } | null;
  /** True when at least one requested output succeeds but the response has failed or incomplete outputs. Absent when all requested outputs fail. */
  "isPartial"?: true;
  /** Page metadata. Fields are omitted when not found. */
  "metadata": ContextSchemaScrapeMetadata;
  "cache_metadata": ContextSchemaCacheMetadata;
  "key_metadata"?: ContextSchemaKeyMetadata;
  "request_id": ContextSchemaRequestId;
};

export type ContextSchemaNewsSearchByNaturalLanguage = {
  /** Use `natural_language` to search all news with a plain-language query. */
  "type": "natural_language";
  /** What to search for, in plain language, such as "chip export restrictions to China". (minLength 2, maxLength 1000) */
  "query": string;
};

export type ContextSchemaNewsSearchByEntity = {
  /** Use `entity` to find news about a specific company. */
  "type": "entity";
  /** The company to search news for, identified by name, domain, ticker, or ISIN. */
  "entity": ((ContextSchemaNewsSearchEntityByName) | (ContextSchemaNewsSearchEntityByDomain) | (ContextSchemaNewsSearchEntityByTicker) | (ContextSchemaNewsSearchEntityByIsin));
};

export type ContextSchemaAnswersRequest = {
  /** `fast` prioritizes speed, with extra verification for people and companies; `ultra` supports deeper research (default). */
  "mode"?: "fast" | "ultra";
  /** Research task. The agent selects company/profile lookups, web searches, or page reads. Include domains or URLs to focus the research. (minLength 1, maxLength 2000) */
  "task": string;
  /** Example answer object, not JSON Schema. Up to 8 levels, 500 values, and 16000 characters; unknowns may be null. */
  "json_format"?: {
    [key: string]: unknown;
  };
  "timeoutOpts"?: ContextSchemaPartialTimeout;
  "tags"?: ContextSchemaRequestTags;
  /** `enabled` turns on zero data retention. Returns 403 `ZDR_NOT_ENABLED` unless your organization has ZDR. */
  "zdr"?: "enabled" | "disabled";
};

export type ContextSchemaAnswersResponse = {
  /** True when the request deadline ended research and the answer uses the evidence collected so far. */
  "partial"?: boolean;
  /** The answer, in the shape requested by json_format. */
  "json_content": {
    [key: string]: unknown;
  };
  /** URLs of the pages and company/profile records read for the answer, followed by URLs cited in json_content. */
  "sources": Array<string>;
  "key_metadata"?: ContextSchemaKeyMetadata;
  "request_id": ContextSchemaRequestId;
};

export type ContextSchemaLenientPartialTimeout = {
  /** Deadline in milliseconds. (min 1, max 300000) */
  "milliseconds": number;
  /** "fail" returns 408 at the deadline. "return-partial" returns available results; inspect the response’s partial flag. */
  "behavior"?: "fail" | "return-partial";
};

export type ContextSchemaPartialTimeout = {
  /** Deadline in milliseconds. (min 1000, max 300000) */
  "milliseconds": number;
  /** "fail" returns 408 at the deadline. "return-partial" returns available results; inspect the response’s partial flag. */
  "behavior"?: "fail" | "return-partial";
};

export type ContextSchemaBrowserCountryCode = "ad" | "ae" | "af" | "ag" | "ai" | "al" | "am" | "ao" | "ar" | "at" | "au" | "aw" | "az" | "ba" | "bb" | "bd" | "be" | "bf" | "bg" | "bh" | "bi" | "bj" | "bm" | "bn" | "bo" | "bq" | "br" | "bs" | "bw" | "by" | "bz" | "ca" | "cd" | "cf" | "cg" | "ch" | "ci" | "cl" | "cm" | "cn" | "co" | "cr" | "cv" | "cw" | "cy" | "cz" | "de" | "dj" | "dk" | "dm" | "do" | "dz" | "ec" | "ee" | "eg" | "es" | "et" | "fi" | "fj" | "fr" | "ga" | "gb" | "gd" | "ge" | "gf" | "gg" | "gh" | "gm" | "gn" | "gp" | "gq" | "gr" | "gt" | "gu" | "gw" | "gy" | "hk" | "hn" | "hr" | "ht" | "hu" | "id" | "ie" | "il" | "im" | "in" | "iq" | "ir" | "is" | "it" | "je" | "jm" | "jo" | "jp" | "ke" | "kg" | "kh" | "kn" | "kr" | "kw" | "ky" | "kz" | "la" | "lb" | "lc" | "lk" | "lr" | "ls" | "lt" | "lu" | "lv" | "ly" | "ma" | "mc" | "md" | "me" | "mf" | "mg" | "mk" | "ml" | "mm" | "mn" | "mo" | "mq" | "mr" | "mt" | "mu" | "mv" | "mw" | "mx" | "my" | "mz" | "na" | "nc" | "ne" | "ng" | "ni" | "nl" | "no" | "np" | "nz" | "om" | "pa" | "pe" | "pf" | "pg" | "ph" | "pk" | "pl" | "pr" | "ps" | "pt" | "py" | "qa" | "re" | "ro" | "rs" | "ru" | "rw" | "sa" | "sc" | "sd" | "se" | "sg" | "si" | "sk" | "sl" | "sm" | "sn" | "so" | "sr" | "ss" | "st" | "sv" | "sx" | "sy" | "sz" | "tc" | "td" | "tg" | "th" | "tj" | "tl" | "tm" | "tn" | "tr" | "tt" | "tw" | "tz" | "ua" | "ug" | "us" | "uy" | "uz" | "vc" | "ve" | "vg" | "vi" | "vn" | "ye" | "yt" | "za" | "zm" | "zw";

export type ContextSchemaPageMetadata = {
  /** Original URL requested by the caller. */
  "sourceUrl": string;
  /** Final URL scraped after redirects or scraper fallback, when known. Falls back to sourceUrl when unavailable. */
  "finalUrl": string;
  /** Best title extracted from the page. */
  "title"?: string;
  /** Best description extracted from standard, Open Graph, or Twitter metadata. */
  "description"?: string;
  /** Language extracted from html lang or language meta tags. */
  "language"?: string;
  /** Keywords extracted from the page's keywords meta tag. */
  "keywords"?: Array<string>;
  /** Resolved canonical URL, when present. */
  "canonicalUrl"?: string;
  /** Author metadata, when present. */
  "author"?: string;
  /** Site or application name from page metadata. */
  "siteName"?: string;
  /** Primary resolved preview image from Open Graph, Twitter, or image metadata. */
  "image"?: string;
  /** Resolved favicon URL, when present. */
  "favicon"?: string;
  /** Published timestamp/date from page metadata, when present. */
  "publishedTime"?: string;
  /** Modified timestamp/date from page metadata, when present. */
  "modifiedTime"?: string;
  /** Robots meta directive, when present. */
  "robots"?: string;
  /** Open Graph metadata with the og: prefix removed and keys camel-cased. */
  "openGraph"?: {
    [key: string]: ContextSchemaPageMetadataValue;
  };
  /** Twitter card metadata with the twitter: prefix removed and keys camel-cased. */
  "twitter"?: {
    [key: string]: ContextSchemaPageMetadataValue;
  };
  /** Resolved alternate links from link rel=alternate tags. */
  "alternates"?: Array<ContextSchemaPageMetadataAlternate>;
  /** Page headings (h1–h6) in document order, extracted from the unfiltered document. Capped at the first 500 headings. Omitted when the page has none. */
  "headings"?: Array<ContextSchemaPageMetadataHeading>;
  /** JSON-LD structured data blocks parsed from the page. */
  "jsonLd"?: Array<{
    [key: string]: unknown;
  }>;
  /** Additional non-social meta tags not promoted to top-level metadata fields. */
  "additionalMeta"?: {
    [key: string]: ContextSchemaPageMetadataValue;
  };
};

export type ContextSchemaCacheMetadata = {
  /** Whether the response was served from cache, required fresh work, or honored zero-data-retention cache bypass. */
  "status": "hit" | "miss" | "zdr";
  /** Age of the cached data in milliseconds. Zero for miss and zdr responses. (min 0) */
  "age_ms": number;
};

export type ContextSchemaWebScrapeAction = ((ContextSchemaWebScrapeWaitAction) | (ContextSchemaWebScrapePerformAction) | (ContextSchemaWebScrapeScrollAction));

export type ContextSchemaScrapeTimeout = {
  /** Deadline in milliseconds. (min 1, max 300000) */
  "milliseconds": number;
  /** "fail" returns 408 at the deadline. "return-partial" returns available results; inspect the response’s partial flag. "return-partial" requires at least 5000 ms. */
  "behavior"?: "fail" | "return-partial";
};

export type ContextSchemaPersonEnrichmentRequest = {
  /** Public profile URLs for the person. A person-profile URL can identify the person without a name. (maxItems 20) */
  "social_urls"?: Array<string>;
  /** Person name. Without an email or person-profile URL, provide both first and last name plus company, education, or location. */
  "name"?: {
    /** First or given name. (minLength 1, maxLength 100) */
    "first"?: string;
    /** Last or family name. (minLength 1, maxLength 100) */
    "last"?: string;
  };
  /** Email address of the person to find. (maxLength 320, format email) */
  "email"?: string;
  /** Company context to help identify the person. Provide a name or domain. */
  "company"?: {
    /** Name of a company associated with the person. (minLength 1, maxLength 200) */
    "name"?: string;
    /** Website domain of a company associated with the person. (minLength 1, maxLength 253) */
    "domain"?: string;
  };
  /** Education history to help distinguish people with similar names. (maxItems 10) */
  "education"?: Array<{
    /** School or university, identified by name or domain. */
    "institution"?: {
      /** Name of the school or university. (minLength 1, maxLength 200) */
      "name"?: string;
      /** Website domain of the school or university. (minLength 1, maxLength 253) */
      "domain"?: string;
    };
    /** Degree or qualification earned. (minLength 1, maxLength 200) */
    "degree"?: string;
    /** Subject or major studied. (minLength 1, maxLength 200) */
    "field_of_study"?: string;
    /** Four-digit graduation year. (min 1900, max 2200) */
    "graduation_year"?: number;
  }>;
  /** Location context to help identify the person. Provide a city, region, or country. */
  "location"?: {
    /** City associated with the person. (minLength 1, maxLength 200) */
    "city"?: string;
    /** State, province, or region associated with the person. (minLength 1, maxLength 200) */
    "region"?: string;
    /** Country associated with the person. (minLength 1, maxLength 200) */
    "country"?: string;
  };
  "timeoutOpts"?: ContextSchemaPartialTimeout;
  /** `enabled` turns on zero data retention. Returns 403 `ZDR_NOT_ENABLED` unless your organization has ZDR. */
  "zdr"?: "enabled" | "disabled";
  "tags"?: ContextSchemaRequestTags;
};

export type ContextSchemaPersonEnrichmentResponse = {
  /** True when the timeout ended processing and this response contains the usable data completed so far. Unfinished fields are omitted. */
  "partial"?: boolean;
  "match": ContextSchemaPersonEnrichmentMatch;
  "key_metadata"?: ContextSchemaKeyMetadata;
  "request_id": ContextSchemaRequestId;
};

export type ContextSchemaBrandRetrieveRequest = ((ContextSchemaBrandRetrieveByDomainRequest) | (ContextSchemaBrandRetrieveByNameRequest) | (ContextSchemaBrandRetrieveByEmailRequest) | (ContextSchemaBrandRetrieveByTickerRequest) | (ContextSchemaBrandRetrieveByDirectUrlRequest) | (ContextSchemaBrandRetrieveFromTransactionRequest));

export type ContextSchemaBrandResponse = {
  /** True when the timeout ended processing and this response contains the usable data completed so far. Unfinished fields are omitted. */
  "partial"?: boolean;
  /** Always `ok` on success. */
  "status": string;
  /** Detailed brand information */
  "brand": {
    /** The domain name of the brand */
    "domain"?: string;
    /** The title or name of the brand */
    "title"?: string;
    /** A brief description of the brand */
    "description"?: string;
    /** The brand's slogan */
    "slogan"?: string;
    /** An array of brand colors */
    "colors"?: Array<{
      /** Color in hexadecimal format */
      "hex"?: string;
      /** Name of the color */
      "name"?: string;
      /** Where the color was observed: 'site' colors come from the website's own theme signals (rendered page colors, manifest, theme-color meta), 'logo' colors from logo image pixels. */
      "source"?: "site" | "logo";
    }>;
    /** An array of logos associated with the brand. When a similarly shaped SVG variant exists, it is returned ahead of its raster equivalent; otherwise relevance order is preserved */
    "logos"?: Array<{
      /** Hosted logo URL. */
      "url"?: string;
      /** Indicates when this logo is best used: 'light' = best for light mode, 'dark' = best for dark mode, 'has_opaque_background' = can be used for either as image has its own background */
      "mode"?: "light" | "dark" | "has_opaque_background";
      /** Array of colors in the logo */
      "colors"?: Array<{
        /** Color in hexadecimal format */
        "hex"?: string;
        /** Name of the color */
        "name"?: string;
      }>;
      /** Resolution of the logo image */
      "resolution"?: {
        /** Width of the image in pixels */
        "width"?: number;
        /** Height of the image in pixels */
        "height"?: number;
        /** Aspect ratio of the image (width/height) */
        "aspect_ratio"?: number;
      };
      /** Type of the logo based on resolution (e.g., 'icon', 'logo') */
      "type"?: "icon" | "logo";
    }>;
    /** An array of backdrop images for the brand */
    "backdrops"?: Array<{
      /** URL of the backdrop image */
      "url"?: string;
      /** Array of colors in the backdrop image */
      "colors"?: Array<{
        /** Color in hexadecimal format */
        "hex"?: string;
        /** Name of the color */
        "name"?: string;
      }>;
      /** Resolution of the backdrop image */
      "resolution"?: {
        /** Width of the image in pixels */
        "width"?: number;
        /** Height of the image in pixels */
        "height"?: number;
        /** Aspect ratio of the image (width/height) */
        "aspect_ratio"?: number;
      };
    }>;
    /** An array of social media links for the brand */
    "socials"?: Array<{
      /** Type of social media platform */
      "type"?: "x" | "facebook" | "instagram" | "linkedin" | "youtube" | "pinterest" | "tiktok" | "dribbble" | "github" | "behance" | "snapchat" | "whatsapp" | "telegram" | "line" | "discord" | "twitch" | "vimeo" | "imdb" | "tumblr" | "flickr" | "giphy" | "medium" | "spotify" | "soundcloud" | "tripadvisor" | "yelp" | "producthunt" | "reddit" | "crunchbase" | "appstore" | "playstore";
      /** URL of the social media page */
      "url"?: string;
    }>;
    /** Physical address of the brand */
    "address"?: {
      /** Street address */
      "street"?: string;
      /** City name */
      "city"?: string;
      /** Country name */
      "country"?: string;
      /** Country code */
      "country_code"?: string;
      /** State or province name */
      "state_province"?: string;
      /** State or province code */
      "state_code"?: string;
      /** Postal or ZIP code */
      "postal_code"?: string;
    };
    /** Stock market information for this brand (will be null if not a publicly traded company) */
    "stock"?: {
      /** Stock ticker symbol */
      "ticker"?: string;
      /** Stock exchange name */
      "exchange"?: string;
    };
    /** Employee headcount information for the brand (will be null if unknown) */
    "employees"?: {
      /** Employee count range for the brand (e.g. '11 to 50') */
      "range"?: "1 to 10" | "11 to 50" | "51 to 200" | "201 to 500" | "501 to 1000" | "1001 to 5000" | "5001 to 10000" | "10001+";
      /** Exact employee count when a precise headcount is known */
      "exact"?: number;
    };
    /** Indicates whether the brand content is not safe for work (NSFW) */
    "is_nsfw"?: boolean;
    /** Company email address */
    "email"?: string;
    /** Company phone number */
    "phone"?: string;
    /** Industry classification information for the brand */
    "industries"?: {
      /** Easy Industry Classification - array of industry and subindustry pairs */
      "eic"?: Array<{
        "industry": ContextSchemaIndustry;
        "subindustry": ContextSchemaSubindustry;
      }>;
    };
    /** Important website links for the brand */
    "links"?: {
      /** URL to the brand's careers or job opportunities page */
      "careers"?: string | null;
      /** URL to the brand's privacy policy page */
      "privacy"?: string | null;
      /** URL to the brand's terms of service or terms and conditions page */
      "terms"?: string | null;
      /** URL to the brand's contact or contact us page */
      "contact"?: string | null;
      /** URL to the brand's blog or news page */
      "blog"?: string | null;
      /** URL to the brand's pricing or plans page */
      "pricing"?: string | null;
    };
    /** The primary language of the brand's website content. Detected from the HTML lang tag, page content analysis, or social media descriptions. */
    "primary_language"?: ((((ContextSchemaSupportedLanguage))) | (null));
  };
  /** HTTP status code */
  "code": number;
  "cache_metadata": ContextSchemaCacheMetadata;
  "key_metadata"?: ContextSchemaKeyMetadata;
  "request_id": ContextSchemaRequestId;
};

export type ContextSchemaUtilityPrefetchIdentifier = ((ContextSchemaUtilityPrefetchDomainIdentifier) | (ContextSchemaUtilityPrefetchEmailIdentifier));

export type ContextSchemaTimeout = {
  /** Deadline in milliseconds. (min 1000, max 300000) */
  "milliseconds": number;
  /** Only "fail" is supported: return 408 at the deadline. */
  "behavior"?: "fail";
};

export type ContextSchemaMonitorsCreateMonitorRequest = {
  "mode"?: ContextSchemaMonitorsMode;
  /** Display name for the monitor. (minLength 1, maxLength 200) */
  "name": string;
  /** Labels for filtering monitors, their changes, and their usage. (maxItems 20) */
  "tags"?: Array<string>;
  "target": ContextSchemaMonitorsTarget;
  "change_detection"?: ContextSchemaMonitorsChangeDetection;
  "schedule"?: ContextSchemaMonitorsSchedule;
  "webhook"?: ContextSchemaMonitorsNullableWebhookConfig;
};

export type ContextSchemaMonitorsCreateMonitorResponse = {
  "mode": ContextSchemaMonitorsMode;
  "id": string;
  "name": string;
  "target": ContextSchemaMonitorsTarget;
  "change_detection": ContextSchemaMonitorsChangeDetection;
  "schedule"?: ContextSchemaMonitorsSchedule;
  "webhook"?: ContextSchemaMonitorsNullableWebhookConfig;
  "status": ContextSchemaMonitorsMonitorStatus;
  /**  (format date-time) */
  "last_run_at"?: string | null;
  /**  (format date-time) */
  "last_change_at"?: string | null;
  /** When the next scheduled run is due; null while paused. (format date-time) */
  "next_run_at"?: string | null;
  /** Error from the most recent failed run; null when the last run succeeded. */
  "last_error"?: ((((ContextSchemaMonitorsRunError))) | (null));
  /** Present while webhook deliveries are failing consecutively; null when deliveries are healthy or no webhook is configured. Cleared on the next successful delivery and when the webhook URL changes. */
  "webhook_failure"?: ((ContextSchemaMonitorsWebhookFailure) | (null));
  /**  (format date-time) */
  "created_at": string;
  /**  (format date-time) */
  "updated_at": string;
  /** Labels for filtering monitors, their changes, and their usage. (maxItems 20) */
  "tags"?: Array<string>;
  /** Comparison baseline, included on Retrieve. Null until capture completes or after target changes. */
  "baseline"?: ((ContextSchemaMonitorsPageBaseline) | (ContextSchemaMonitorsSitemapBaseline) | (ContextSchemaMonitorsExtractBaseline) | (null));
  /** ID of the baseline run queued at creation; null if it will start on the next scheduled tick. */
  "initial_run_id": string | null;
  "key_metadata"?: ContextSchemaKeyMetadata;
  "request_id": ContextSchemaRequestId;
};

export type ContextSchemaMonitorsListMonitorsResponse = {
  "data": Array<ContextSchemaMonitorsMonitor>;
  "has_more": boolean;
  "next_cursor": string | null;
  "key_metadata"?: ContextSchemaKeyMetadata;
  "request_id": ContextSchemaRequestId;
};

export type ContextSchemaMonitorsMonitorResponse = {
  "mode": ContextSchemaMonitorsMode;
  "id": string;
  "name": string;
  "target": ContextSchemaMonitorsTarget;
  "change_detection": ContextSchemaMonitorsChangeDetection;
  "schedule"?: ContextSchemaMonitorsSchedule;
  "webhook"?: ContextSchemaMonitorsNullableWebhookConfig;
  "status": ContextSchemaMonitorsMonitorStatus;
  /**  (format date-time) */
  "last_run_at"?: string | null;
  /**  (format date-time) */
  "last_change_at"?: string | null;
  /** When the next scheduled run is due; null while paused. (format date-time) */
  "next_run_at"?: string | null;
  /** Error from the most recent failed run; null when the last run succeeded. */
  "last_error"?: ((((ContextSchemaMonitorsRunError))) | (null));
  /** Present while webhook deliveries are failing consecutively; null when deliveries are healthy or no webhook is configured. Cleared on the next successful delivery and when the webhook URL changes. */
  "webhook_failure"?: ((ContextSchemaMonitorsWebhookFailure) | (null));
  /**  (format date-time) */
  "created_at": string;
  /**  (format date-time) */
  "updated_at": string;
  /** Labels for filtering monitors, their changes, and their usage. (maxItems 20) */
  "tags"?: Array<string>;
  /** Comparison baseline, included on Retrieve. Null until capture completes or after target changes. */
  "baseline"?: ((ContextSchemaMonitorsPageBaseline) | (ContextSchemaMonitorsSitemapBaseline) | (ContextSchemaMonitorsExtractBaseline) | (null));
  "key_metadata"?: ContextSchemaKeyMetadata;
  "request_id": ContextSchemaRequestId;
};

export type ContextSchemaMonitorsUpdateMonitorRequest = {
  /** Display name for the monitor. (minLength 1, maxLength 200) */
  "name"?: string;
  /** Labels for filtering monitors, their changes, and their usage. (maxItems 20) */
  "tags"?: Array<string>;
  /** Set `paused` to stop scheduled runs or `active` to resume them. */
  "status"?: "active" | "paused";
  "target"?: ContextSchemaMonitorsTarget;
  "change_detection"?: ContextSchemaMonitorsChangeDetection;
  "schedule"?: ContextSchemaMonitorsSchedule;
  /** Set to null to remove the webhook. Changing `url` issues a new secret. */
  "webhook"?: ContextSchemaMonitorsNullableWebhookConfig;
};

export type ContextSchemaMonitorsDeleteMonitorResponse = {
  "id": string;
  "deleted": boolean;
  "key_metadata"?: ContextSchemaKeyMetadata;
  "request_id": ContextSchemaRequestId;
};

export type ContextSchemaMonitorsRunStatus = "queued" | "running" | "completed" | "failed" | "skipped";

export type ContextSchemaMonitorsListRunsResponse = {
  "data": Array<ContextSchemaMonitorsRun>;
  "has_more": boolean;
  "next_cursor": string | null;
  "key_metadata"?: ContextSchemaKeyMetadata;
  "request_id": ContextSchemaRequestId;
};

export type ContextSchemaMonitorsRunResponse = {
  /** Webhook delivery IDs for this run. */
  "webhook_delivery_ids"?: Array<string>;
  "id": string;
  "monitor_id": string;
  "status": ContextSchemaMonitorsRunStatus;
  /** A baseline run follows creation or a target or detection change. */
  "run_type": "baseline" | "scheduled";
  "target_type": ContextSchemaMonitorsTargetType;
  "change_detection_type": ContextSchemaMonitorsChangeDetectionType;
  /**  (format date-time) */
  "started_at"?: string | null;
  /**  (format date-time) */
  "completed_at"?: string | null;
  "change_detected": boolean;
  "change_id"?: string | null;
  /** True when this run established the monitor's initial baseline; baseline runs perform no change detection. */
  "baseline_created": boolean;
  /** Credits charged for this run (0 for skipped/failed runs). (min 0) */
  "credits_charged": number;
  /** Why a skipped run never executed; null unless status is `skipped`. */
  "skip_reason"?: "insufficient_credits" | "monitor_paused" | "superseded" | null;
  "error"?: ContextSchemaMonitorsNullableRunError;
  /** Deprecated. Use `webhook_deliveries` for all attempts. */
  "webhook_delivery"?: ContextSchemaMonitorsWebhookDelivery;
  /** All webhook deliveries attempted by this run — one per subscribed event that fired. Omitted when no webhook was attempted, including runs created before event selection was added. */
  "webhook_deliveries"?: Array<ContextSchemaMonitorsWebhookDelivery>;
  "key_metadata"?: ContextSchemaKeyMetadata;
  "request_id": ContextSchemaRequestId;
};

export type ContextSchemaMonitorsListChangesResponse = {
  "data": Array<ContextSchemaMonitorsChange>;
  "has_more": boolean;
  "next_cursor": string | null;
  "key_metadata"?: ContextSchemaKeyMetadata;
  "request_id": ContextSchemaRequestId;
};

export type ContextSchemaMonitorsCreditUsageResponse = {
  "data": Array<ContextSchemaMonitorsCreditUsage>;
  /** Sum of credits across all monitors in the window. */
  "total_credits": number;
  "key_metadata"?: ContextSchemaKeyMetadata;
  "request_id": ContextSchemaRequestId;
};

export type ContextSchemaMonitorsLimitsResponse = {
  /** Number of monitors the account currently has. */
  "monitors_used": number;
  /** Most monitors you can have: your plan's allowance or a custom limit. */
  "monitors_limit": number;
  /** `starter` means Developer; `pro` means Pro or Growth; `scale` means Scale or Enterprise. */
  "plan": "free" | "starter" | "pro" | "scale";
  "key_metadata"?: ContextSchemaKeyMetadata;
  "request_id": ContextSchemaRequestId;
};

export type ContextSchemaMonitorsChangeResponse = {
  "mode": ContextSchemaMonitorsMode;
  "id": string;
  "monitor_id": string;
  /** The run that detected this change. */
  "run_id": string;
  "target_type": ContextSchemaMonitorsTargetType;
  "change_detection_type": ContextSchemaMonitorsChangeDetectionType;
  "title": string;
  "summary": string;
  /**  (format date-time) */
  "detected_at": string;
  /**  (format uri) */
  "url": string;
  "importance"?: ContextSchemaMonitorsImportance;
  /**  (min 0, max 1) */
  "confidence"?: number;
  /** Text diff between the previous and current page baseline (page targets). */
  "diff"?: string;
  "before_text_excerpt"?: string;
  "after_text_excerpt"?: string;
  /** At most 500 URLs are included; the corresponding count field is always exact. */
  "added_urls"?: Array<string>;
  /** At most 500 URLs are included; the corresponding count field is always exact. */
  "removed_urls"?: Array<string>;
  /**  (min 0) */
  "added_url_count"?: number;
  /**  (min 0) */
  "removed_url_count"?: number;
  /** At most 500 URLs are included; the corresponding count field is always exact. */
  "matched_urls"?: Array<string>;
  /**  (min 0) */
  "matched_url_count"?: number;
  "evidence"?: Array<ContextSchemaMonitorsEvidence>;
  /** Labels for filtering monitors, their changes, and their usage. (maxItems 20) */
  "tags": Array<string>;
  "key_metadata"?: ContextSchemaKeyMetadata;
  "request_id": ContextSchemaRequestId;
};

export type ContextSchemaMonitorsRunNowResponse = {
  "monitor_id": string;
  /** ID of the queued run; pass it to Retrieve a monitor run. */
  "run_id": string;
  "queued": boolean;
  "key_metadata"?: ContextSchemaKeyMetadata;
  "request_id": ContextSchemaRequestId;
};

export type ContextSchemaBatchSubmitRequest = {
  /** Choose a URL list or a site crawl. */
  "input": (({
    /** Scrape the pages in `data.urls`. */
    "mode": "scrape";
    "data": ContextSchemaBatchUnifiedScrapeData;
  }) | ({
    /** Discover and scrape pages from `data.source`. */
    "mode": "crawl";
    "data": ContextSchemaBatchUnifiedCrawlData;
  }));
  /** Legacy URL notified when the batch finishes. Preserves one best-effort attempt. Cannot be combined with webhook. (format uri) */
  "webhookUrl"?: string;
  /** Where to send the batch's final-status event. Omit `retry` for one attempt; `{}` uses the default retry schedule. */
  "webhook"?: {
    /** Public HTTP(S) URL that receives batch completion, failure, or cancellation events. (format uri) */
    "url": string;
    "retry"?: ContextSchemaWebhookRetry;
  };
  /** Tags stored on the batch. Filter the batch list by them later. (maxItems 20) */
  "tags"?: Array<string>;
};

export type ContextSchemaBatchAccepted = {
  /** Batch ID. Poll GET /batch/{batch_id} with it. */
  "id": string;
  /** Always `queued`. An accepted batch has not started yet. */
  "status": "queued";
  /** How pages will be selected. */
  "mode": "scrape" | "crawl";
  /** Tags stored on the batch. */
  "tags": Array<string>;
  "crawl": ContextSchemaBatchNullableCrawlControls;
  "input": ContextSchemaBatchIntake;
  /** What accepting this batch cost. */
  "credits": {
    /** Credits held at submission. */
    "reserved": number;
  };
  /** When the batch was created. */
  "created_at": string;
  /** Rejected URLs (first 100). */
  "invalid_urls": Array<{
    /** Rejected URL. */
    "url": string;
    /** Why it was rejected. */
    "reason": string;
  }>;
  "cache_metadata": ContextSchemaCacheMetadata;
  /** Secret for verifying `X-Context-Signature`. Only submit returns it, so store it. */
  "webhook_secret"?: string;
  /** Outputs requested for each page. Matches input.data.formats on submission. */
  "formats": ContextSchemaScrapeFormats;
};

export type ContextSchemaBatch = {
  /** Batch ID. */
  "id": string;
  /** Current state. `completed`, `cancelled`, and `failed` are final. */
  "status": "queued" | "running" | "cancelling" | "completed" | "cancelled" | "failed";
  /** `scrape` (URL list) or `crawl`. */
  "mode": "scrape" | "crawl";
  /** Tags stored on the batch at submission. */
  "tags": Array<string>;
  "crawl": ContextSchemaBatchNullableCrawlControls;
  "input": ContextSchemaBatchIntake;
  /** Pages attempted so far. Use `status` to check completion. */
  "progress": {
    /** Pages scraped successfully. */
    "succeeded": number;
    /** Pages that could not be scraped. */
    "failed": number;
    /** Accepted pages not yet attempted. Unused crawl capacity is excluded after completion. */
    "pending": number;
  };
  /** Batch credit usage and settlement. */
  "credits": {
    /** Credits held when the batch was accepted. */
    "reserved": number;
    /** Credits returned for unsuccessful pages when the batch settles. */
    "refunded": number;
    /** OCR usage charged when the batch settles. */
    "ocr_charged": number;
    /** `reserved` minus `refunded` plus `ocr_charged`. */
    "net": number;
  };
  "timing": {
    /** When the batch was created. */
    "created_at": string;
    /** When processing started. Null while queued. */
    "started_at": string | null;
    /** When processing finished. Null while active. */
    "completed_at": string | null;
  };
  /** Individual page failures grouped by error code, sorted by count. Unrelated to `failure`, which is the batch itself failing. */
  "page_errors": Array<ContextSchemaBatchPageErrorCount>;
  "failure": ContextSchemaBatchNullableFailure;
  /** Result download links; null until the batch finishes. Files are deleted 180 days after the batch finishes. */
  "results": {
    /** When these links expire (24 hours after this response). */
    "expires_at": string;
    /** Result files. Order is not guaranteed. */
    "files": Array<{
      /** Temporary URL for a gzipped NDJSON file. */
      "url": string;
      /** Results in this file. */
      "items": number;
      /** Compressed file size in bytes. */
      "bytes": number;
    }>;
  } | null;
  /** Outputs requested for each page. Matches input.data.formats on submission. */
  "formats": ContextSchemaScrapeFormats;
};

export type ContextSchemaBatchDetail = {
  /** Rejected URLs (first 100). */
  "invalid_urls": Array<{
    /** Rejected URL. */
    "url": string;
    /** Why it was rejected. */
    "reason": string;
  }>;
  /** Batch completion delivery ID, when available. */
  "webhook_delivery_id"?: string;
};

export type ContextSchemaBatchResultRecord = (({
  /** URL as submitted, or as discovered by the crawl. */
  "url": string;
  /** Your `itemId` from submission. */
  "itemId"?: string;
  /** Caller-supplied metadata echoed from submission. */
  "meta"?: {
    [key: string]: unknown;
  };
  "status": "ok";
  "result": ContextSchemaBatchScrapeResponse;
  /** Credits charged for this page, including OCR. Cached outputs use the same pricing as POST /web/scrape. (min 0) */
  "credits_used": number;
  /** PDF pages recovered by OCR. Omitted when OCR did not run. (min 0) */
  "ocr_pages"?: number;
}) | ({
  /** URL as submitted, or as discovered by the crawl. */
  "url": string;
  /** Your `itemId` from submission. */
  "itemId"?: string;
  /** Caller-supplied metadata echoed from submission. */
  "meta"?: {
    [key: string]: unknown;
  };
  /** The page could not be scraped. */
  "status": "error";
  /** Why the page failed. */
  "error_code": string;
  /** Human-readable failure detail. */
  "message": string;
  /** Per-format failures when scraping returned a structured response. Omitted for errors that prevent scraping. */
  "result"?: ContextSchemaBatchScrapeResponse;
  /** Credits charged for this page, including OCR. Cached outputs use the same pricing as POST /web/scrape. (min 0) */
  "credits_used"?: number;
  /** PDF pages recovered by OCR. Omitted when OCR did not run. (min 0) */
  "ocr_pages"?: number;
}));

export type ContextSchemaBatchCancelling = {
  /** Batch ID. */
  "id": string;
  /** Always `cancelling`. Work already in flight finishes; the batch reaches `cancelled` shortly after. */
  "status": "cancelling";
  /** How pages were selected. */
  "mode": "scrape" | "crawl";
  /** Tags stored on the batch at submission. */
  "tags": Array<string>;
  "crawl": ContextSchemaBatchNullableCrawlControls;
  "input": ContextSchemaBatchIntake;
  /** How far the batch got before cancellation. */
  "progress": {
    /** Pages scraped successfully before the request landed. */
    "succeeded": number;
    /** Pages that could not be scraped before the request landed. */
    "failed": number;
    /** Pages that will be skipped. */
    "pending": number;
  };
  /** What this batch cost so far. */
  "credits": {
    /** Credits held at submission; unused credits are refunded when the batch settles. */
    "reserved": number;
  };
  /** Batch timestamps. */
  "timing": {
    /** When the batch was created. */
    "created_at": string;
    /** When processing started. Null if it was cancelled while still queued. */
    "started_at": string | null;
  };
  /** Page failures so far, grouped by error code and sorted by count. */
  "page_errors": Array<ContextSchemaBatchPageErrorCount>;
  /** Outputs requested for each page. Matches input.data.formats on submission. */
  "formats": ContextSchemaScrapeFormats;
};

export type ContextSchemaCompanySearchFilters = {
  /** Headquarters countries as two-letter codes, such as US or GB. */
  "countries"?: Array<string>;
  /** Minimum headcount; includes overlapping employee ranges. (min 0) */
  "employees_min"?: number;
  /** Maximum headcount; includes overlapping employee ranges. (min 0) */
  "employees_max"?: number;
};

export type ContextSchemaLogEntry = {
  /** Request ID of the logged API call. */
  "request_id": string;
  /** When the request completed. (format date-time) */
  "timestamp": string;
  /** HTTP method, or `MONITOR` / `BATCH` for monitor-run and batch-settlement entries. */
  "method": string;
  /** Endpoint path as called. */
  "path": string;
  /** HTTP status code returned. */
  "status_code": number;
  /** The `error_code` from the response, or null on success. */
  "error_code": string | null;
  /** Server-side processing time in milliseconds. */
  "latency_ms": number;
  /** Credits charged for this request. */
  "credits_used": number;
  /** ID of the API key that made the request. */
  "key_id": string | null;
  /** Request tags supplied by the caller. */
  "tags": Array<string>;
  /** Whether the request was made under zero data retention. */
  "zdr": boolean;
};

export type ContextSchemaLogDetail = ((ContextSchemaLogEntry) & ({
  /** What was sent with the request. */
  "input": {
    /** Query parameters as sent. */
    "query": {
      [key: string]: unknown;
    };
    /** Request body with credentials and uploaded content redacted. */
    "body"?: unknown;
  };
  /** The retained JSON response with credentials redacted, or null when unavailable. */
  "response"?: unknown;
  /** User-Agent header of the request. */
  "user_agent": string | null;
}));

export type ContextSchemaBrowserProfile = {
  /** Profile ID to pass as `sharedParams.profile.profileId` on `/web/scrape`. */
  "id": string;
  /** The description supplied when the profile was created, or null. */
  "description": string | null;
  /** When the profile was created. (format date-time) */
  "created_at": string;
};

export type ContextSchemaUsageHistoryBucket = {
  /** Start of the bucket, in UTC. (format date-time) */
  "start": string;
  /** Credits charged. */
  "credits_used": number;
  /** Requests made. */
  "request_count": number;
  /** Per-group totals, highest credits first. Present only when `group_by` is set. */
  "groups"?: Array<{
    /** The endpoint path, API key ID, or status code this group covers. */
    "value": string;
    /** Credits charged. */
    "credits_used": number;
    /** Requests made. */
    "request_count": number;
  }>;
};

export type ContextSchemaWebhookDeliverySummary = {
  /** Delivery ID. */
  "id": string;
  /** Webhook event type. */
  "event": "batch.completed" | "batch.failed" | "batch.cancelled" | "change.detected" | "run.completed";
  /** Batch or monitor run that produced the event. */
  "source": (({
    /** Which deliveries to list: `batch` or `monitor`. */
    "type": "batch";
    /** Batch ID. */
    "batch_id": string;
  }) | ({
    /** Which deliveries to list: `batch` or `monitor`. */
    "type": "monitor";
    /** Monitor ID. */
    "monitor_id": string;
    /** Monitor run ID. */
    "run_id": string;
  }));
  /** Webhook destination URL. (format uri) */
  "url": string;
  /** `pending`, `delivering`, `retrying`, `delivered`, `failed`, or `cancelled` (source or its webhook was removed). */
  "status": "pending" | "delivering" | "retrying" | "delivered" | "failed" | "cancelled";
  /** Event creation time. (format date-time) */
  "created_at": string;
  /** Last time you can retry manually (7 days after the event). (format date-time) */
  "retry_expires_at": string;
  /** Last successful delivery time, or null if never delivered. (format date-time) */
  "delivered_at": string | null;
  /** Next scheduled attempt, or null if none. (format date-time) */
  "next_attempt_at": string | null;
  /** Latest delivery error, or null if none. */
  "last_error": {
    /** Error code. */
    "code": string;
    /** Error details. */
    "message": string;
  } | null;
};

export type ContextSchemaWebhookRetry = {
  /** Retry delays in seconds, totaling at most 72 hours. Use [] to disable automatic retries. (maxItems 10) */
  "delays_seconds"?: Array<number>;
};

export type ContextSchemaWebhookAttempt = {
  /** Attempt number, starting at 1. (min 1) */
  "attempt": number;
  /** `initial`, `automatic` (scheduled retry), or `manual` (Retry endpoint). */
  "trigger": "initial" | "automatic" | "manual";
  /** URL used for this attempt. (format uri) */
  "url": string;
  /** Attempt start time. (format date-time) */
  "started_at": string;
  /** Completion time, or null while in progress. (format date-time) */
  "completed_at": string | null;
  /** HTTP response status, or null if no response was received. */
  "http_status": number | null;
  /** Attempt error, or null if none. */
  "error": {
    /** Error code. */
    "code": string;
    /** Error details. */
    "message": string;
  } | null;
};

export type ContextSchemaScrapeFormats = {
  /** Rendered HTML. */
  "html"?: boolean;
  /** Page content as Markdown. */
  "markdown"?: boolean;
  /** A screenshot of the page. */
  "screenshot"?: boolean;
  /** Images found on the page. */
  "images"?: boolean;
  /** The original HTTP response body. */
  "bytes"?: boolean;
  /** Fields extracted with custom rules or a prebuilt parser, returned as `parsed`. */
  "parse"?: boolean;
  /** Markdown excerpts relevant to `highlightsParams.query`. */
  "highlights"?: boolean;
  /** An object matching `jsonParams.schema`, extracted from the page. */
  "json"?: boolean;
  /** Product details such as name, price, and availability. */
  "product"?: boolean;
};

export type ContextSchemaScrapeMarkdownParams = {
  /** Keep link URLs in the Markdown (`html-conversion` only). */
  "includeLinks"?: boolean;
  /** Include images in the Markdown (`html-conversion` only). */
  "includeImages"?: boolean;
  /** How base64 images appear when `includeImages` is set (`html-conversion` only). */
  "inlineImages"?: "placeholder" | "preserve";
  /** Markdown sources in order of preference: `html-conversion` converts the page HTML, `markdown-direct` uses Markdown the site publishes. */
  "sourcePreference"?: Array<"html-conversion" | "markdown-direct">;
};

export type ContextSchemaScrapeScreenshotParams = {
  /** What to capture: `viewport`, `fullPage`, one element, or a rectangle. Max 40 megapixels. */
  "area"?: (("viewport" | "fullPage") | ({
    /** CSS selector matching exactly one visible element. (maxLength 2048) */
    "selector": string;
  }) | ({
    /** Left edge of the capture, in pixels from the document origin. (min 0, max 100000) */
    "x": number;
    /** Top edge of the capture, in pixels from the document origin. (min 0, max 100000) */
    "y": number;
    /** Width of the capture in pixels. (min 1, max 7680) */
    "width": number;
    /** Height of the capture in pixels. (min 1, max 100000) */
    "height": number;
  }));
  /** Image format for the screenshot. */
  "format"?: "png" | "jpeg" | "webp";
};

export type ContextSchemaScrapeImageParams = {
  /** Extra data per image: `dimensions`, `classification`, or a hosted `file` URL. (maxItems 3) */
  "enrich"?: Array<"dimensions" | "classification" | "file">;
  /** Set `visual` to drop visual duplicates, keeping the largest copy. */
  "dedupe"?: "none" | "visual";
};

export type ContextSchemaScrapeParseParams = (({
  /** Extract fields using custom CSS rules. This is the default when type is omitted. */
  "type"?: "custom";
  "rules": ContextSchemaScrapeParseRules;
}) | ({
  /** Use a prebuilt parser instead of custom rules. */
  "type": "prebuilt";
  /** The prebuilt parser to use. See https://docs.context.dev/scrape/prebuilt-parsers for supported sources, request options, and output schemas. */
  "parser": "google-maps" | "google-maps-reviews" | "google-play" | "google-play-reviews" | "app-store" | "app-store-reviews" | "g2-reviews" | "instagram-profile" | "instagram-post" | "instagram-feed" | "tiktok-profile" | "tiktok-video" | "tiktok-feed" | "tiktok-comments" | "tiktok-followers" | "tiktok-following" | "tiktok-user-search" | "emails" | "phone-numbers" | "links";
  /** google-maps-reviews only. Order of data.reviews. newest, relevant, highest, and lowest follow Google; oldest returns the earliest reviews first, which Google itself does not offer. */
  "sort"?: "newest" | "oldest" | "relevant" | "highest" | "lowest";
  /** google-maps-reviews only. Maximum number of reviews to return. Defaults to 100; maximum 1000. (min 1, max 1000) */
  "limit"?: number;
}));

export type ContextSchemaScrapeHighlightsParams = {
  /** The question or topic to find passages for. (minLength 1, maxLength 2000) */
  "query": string;
  /** Maximum combined length of returned passages. (min 100, max 20000) */
  "maxCharacters"?: number;
};

export type ContextSchemaScrapeJsonParams = {
  /** JSON Schema (not an example object) for a top-level object, up to 50 KB. Use optional or nullable fields for missing facts. */
  "schema": {
    [key: string]: unknown;
  };
  /** Extra guidance, such as which facts to prefer or how to read a field. (maxLength 2000) */
  "instructions"?: string;
};

export type ContextSchemaScrapeProductParams = {
  /** Drop visually duplicate product images, keeping the largest copy. */
  "dedupeImages"?: boolean;
};

export type ContextSchemaScrapeSharedParams = {
  /** Create or reuse an authenticated browser profile. Requires a paid plan and an HTTPS target. Profiles persist session state, bypass shared caches, and cannot be combined with ZDR, custom headers, raw bytes, Google Maps, app store, Instagram, or G2 parsers. The emails, phone-number */
  "profile"?: ContextSchemaScrapeProfile;
  /** Proxy country as a two-letter code, such as `US`. Case-insensitive. */
  "country"?: string;
  /** HTTP headers to send to the target site. Requests with headers skip the cache. */
  "headers"?: {
    [key: string]: string;
  };
  /** Browser size in pixels. Omit for 1920 × 1080. When provided, missing dimensions default to 1440 × 900. */
  "viewport"?: {
    /** Browser viewport width in pixels. (min 240, max 7680) */
    "width"?: number;
    /** Browser viewport height in pixels. (min 240, max 4320) */
    "height"?: number;
  };
  /** Emulate a light or dark color scheme. */
  "theme"?: "light" | "dark";
  /** Accept cookie banners before actions and capture. */
  "dismissCookies"?: boolean;
  /** Close other popups before actions and capture. */
  "dismissPopups"?: boolean;
  /** Browser steps run in order before capture. Requires a paid plan. Skips the cache. (maxItems 5) */
  "actions"?: Array<ContextSchemaScrapeAction>;
  /** Milliseconds, or a CSS selector to wait for, after actions. Defaults to 500 (2000 with frames or XML). */
  "waitFor"?: ((number) | (string));
  /** Wait for CSS animations to finish before capture. Defaults to `true` when `screenshot` is requested. */
  "settleAnimations"?: boolean;
  /** Keep only the main content. Doesn't affect `screenshot`, `bytes`, or `product`. */
  "mainContentOnly"?: boolean;
  /** Keep only elements matching these CSS selectors. (maxItems 50) */
  "includeSelectors"?: Array<string>;
  /** Remove elements matching these CSS selectors. Overrides `includeSelectors`. (maxItems 50) */
  "excludeSelectors"?: Array<string>;
  /** Include iframe content in HTML and text outputs. Screenshots always show visible frames. */
  "includeFrames"?: boolean;
  /** Document parsing options. */
  "parsers"?: {
    /** PDF page range and OCR. */
    "pdf"?: ContextSchemaScrapePdfOptions;
  };
};

export type ContextSchemaScrapeImage = {
  /** Image URL, or a data URI for inline images. (format uri) */
  "url": string;
  /** Alt text, if present. */
  "alt": string | null;
  /**  (min 1) */
  "width"?: number;
  /**  (min 1) */
  "height"?: number;
  "classification"?: "photography" | "illustration" | "logo" | "wordmark" | "icon" | "pattern" | "graphic" | "other";
  /** Hosted image URL, valid for 24 hours after capture. Requires `file` enrichment and ZDR disabled. (format uri) */
  "fileUrl"?: string;
};

export type ContextSchemaScrapeProductResult = {
  /** Whether the page is a product detail page. */
  "isProductPage": boolean;
  /** The extracted product, or null when the page is not a product detail page. */
  "product": ((ContextSchemaScrapeProduct) | (null));
};

export type ContextSchemaScrapeMetadata = {
  /** Best title extracted from the page. */
  "title"?: string;
  /** Best description extracted from standard, Open Graph, or Twitter metadata. */
  "description"?: string;
  /** Language extracted from html lang or language meta tags. */
  "language"?: string;
  /** Keywords extracted from the page's keywords meta tag. */
  "keywords"?: Array<string>;
  /** Resolved canonical URL, when present. */
  "canonicalUrl"?: string;
  /** Author metadata, when present. */
  "author"?: string;
  /** Site or application name from page metadata. */
  "siteName"?: string;
  /** Primary resolved preview image from Open Graph, Twitter, or image metadata. */
  "image"?: string;
  /** Resolved favicon URL, when present. */
  "favicon"?: string;
  /** Published timestamp/date from page metadata, when present. */
  "publishedTime"?: string;
  /** Modified timestamp/date from page metadata, when present. */
  "modifiedTime"?: string;
  /** Robots meta directive, when present. */
  "robots"?: string;
  /** Open Graph metadata with the og: prefix removed and keys camel-cased. */
  "openGraph"?: {
    [key: string]: ContextSchemaPageMetadataValue;
  };
  /** Twitter card metadata with the twitter: prefix removed and keys camel-cased. */
  "twitter"?: {
    [key: string]: ContextSchemaPageMetadataValue;
  };
  /** Resolved alternate links from link rel=alternate tags. */
  "alternates"?: Array<ContextSchemaPageMetadataAlternate>;
  /** Up to 500 h1–h6 headings in document order, before content filtering. */
  "headings"?: Array<ContextSchemaPageMetadataHeading>;
  /** JSON-LD structured data blocks parsed from the page. */
  "jsonLd"?: Array<{
    [key: string]: unknown;
  }>;
  /** Additional non-social meta tags not promoted to top-level metadata fields. */
  "additionalMeta"?: {
    [key: string]: ContextSchemaPageMetadataValue;
  };
};

export type ContextSchemaNewsSearchEntityByName = {
  /** Use `name` to identify the company by name. */
  "type": "name";
  /** Company name. (minLength 2, maxLength 200) */
  "name": string;
};

export type ContextSchemaNewsSearchEntityByDomain = {
  /** Use `domain` to identify the company by website domain. */
  "type": "domain";
  /** Company website domain, such as apple.com. (minLength 1, maxLength 253) */
  "domain": string;
};

export type ContextSchemaNewsSearchEntityByTicker = {
  /** Use `ticker` to identify a publicly traded company. */
  "type": "ticker";
  /** Public-company ticker. (minLength 1, maxLength 20) */
  "ticker": string;
  /** Stock exchange the ticker trades on, used to disambiguate tickers listed on multiple exchanges. */
  "exchange"?: "AMEX" | "AMS" | "AQS" | "ASX" | "ATH" | "BER" | "BME" | "BRU" | "BSE" | "BUD" | "BUE" | "BVC" | "CBOE" | "CNQ" | "CPH" | "DFM" | "DOH" | "DUB" | "DUS" | "DXE" | "EGX" | "FSX" | "HAM" | "HEL" | "HKSE" | "HOSE" | "ICE" | "IOB" | "IST" | "JKT" | "JNB" | "JPX" | "KLS" | "KOE" | "KSC" | "KUW" | "LIS" | "LSE" | "MCX" | "MEX" | "MIL" | "MUN" | "NASDAQ" | "NEO" | "NSE" | "NYSE" | "NZE" | "OSL" | "OTC" | "PAR" | "PNK" | "PRA" | "RIS" | "SAO" | "SAU" | "SES" | "SET" | "SGO" | "SHH" | "SHZ" | "SIX" | "STO" | "STU" | "TAI" | "TAL" | "TLV" | "TSX" | "TSXV" | "TWO" | "VIE" | "WSE" | "XETRA";
};

export type ContextSchemaNewsSearchEntityByIsin = {
  /** Use `isin` to identify the company by its securities identifier. */
  "type": "isin";
  /** International Securities Identification Number. */
  "isin": string;
};

export type ContextSchemaPageMetadataValue = ((string) | (Array<string>));

export type ContextSchemaPageMetadataAlternate = {
  /** Resolved alternate URL. */
  "href": string;
  /** Language or locale for the alternate URL, when present. */
  "hreflang"?: string;
  /** Alternate resource MIME type, when present. */
  "type"?: string;
  /** Alternate resource title, when present. */
  "title"?: string;
};

export type ContextSchemaPageMetadataHeading = {
  /** Heading level, 1–6 (from h1–h6). (min 1, max 6) */
  "level": number;
  /** Heading text with whitespace collapsed, truncated to 1000 characters. */
  "text": string;
};

export type ContextSchemaWebScrapeWaitAction = {
  /** Use `wait` to pause for a fixed duration. */
  "do": "wait";
  /** Time to pause in milliseconds before the next action. (min 0, max 30000) */
  "timeMs": number;
};

export type ContextSchemaWebScrapePerformAction = {
  /** Use `perform` for a plain-language browser instruction. */
  "do": "perform";
  /** One browser instruction, such as clicking a button or entering text. (minLength 1, maxLength 500) */
  "action": string;
};

export type ContextSchemaWebScrapeScrollAction = {
  /** Use `scroll` to move through the page or a container. */
  "do": "scroll";
  /** Direction to scroll. Defaults to down. */
  "direction"?: "up" | "down" | "left" | "right";
  /** Pixels per scroll, one visible viewport, or the current scroll boundary. Defaults to viewport. */
  "amount"?: ((number) | ("viewport" | "max"));
  /** CSS selector for the first matching scroll container. Defaults to the page. (minLength 1, maxLength 2000) */
  "container"?: string;
  /** Maximum scroll iterations. Stops early when scrolling and scrollable extent stop changing. Defaults to 1. (min 1, max 50) */
  "maxScrolls"?: number;
};

export type ContextSchemaPersonEnrichmentMatch = ((ContextSchemaPersonEnrichmentCandidateMatch) | (ContextSchemaPersonEnrichmentNotFoundMatch));

export type ContextSchemaBrandRetrieveByDomainRequest = {
  "force_language"?: ((ContextSchemaSupportedLanguage) & (string | null));
  /** Optional parameter to optimize the API call for maximum speed. When set to true, the API will skip time-consuming operations for faster response at the cost of less comprehensive data. */
  "maxSpeed"?: boolean;
  /** Maximum age of cached brand data in ms. Defaults to 3 months; clamped to 0–1 year. `0` refreshes. */
  "maxAgeMs"?: number;
  "timeoutOpts"?: ContextSchemaPartialTimeout;
  /** Discriminator for domain-based brand retrieval. */
  "type": "by_domain";
  /** Domain name to retrieve brand data for (e.g., 'stripe.com'). (minLength 3) */
  "domain": string;
  "tags"?: ContextSchemaRequestTags;
};

export type ContextSchemaBrandRetrieveByNameRequest = {
  "force_language"?: ((ContextSchemaSupportedLanguage) & (string | null));
  /** Optional parameter to optimize the API call for maximum speed. When set to true, the API will skip time-consuming operations for faster response at the cost of less comprehensive data. */
  "maxSpeed"?: boolean;
  /** Maximum age of cached brand data in ms. Defaults to 3 months; clamped to 0–1 year. `0` refreshes. */
  "maxAgeMs"?: number;
  "timeoutOpts"?: ContextSchemaPartialTimeout;
  /** Discriminator for name-based brand retrieval. */
  "type": "by_name";
  /** Company name to retrieve brand data for (e.g., 'Apple Inc'). (minLength 3, maxLength 30) */
  "name": string;
  "country_gl"?: ((ContextSchemaCountryGL));
  "tags"?: ContextSchemaRequestTags;
};

export type ContextSchemaBrandRetrieveByEmailRequest = {
  "force_language"?: ((ContextSchemaSupportedLanguage) & (string | null));
  /** Optional parameter to optimize the API call for maximum speed. When set to true, the API will skip time-consuming operations for faster response at the cost of less comprehensive data. */
  "maxSpeed"?: boolean;
  /** Maximum age of cached brand data in ms. Defaults to 3 months; clamped to 0–1 year. `0` refreshes. */
  "maxAgeMs"?: number;
  "timeoutOpts"?: ContextSchemaPartialTimeout;
  /** Discriminator for email-based brand retrieval. */
  "type": "by_email";
  /** Email address to retrieve brand data for (e.g., 'jane@stripe.com'). (minLength 1, format email) */
  "email": string;
  "tags"?: ContextSchemaRequestTags;
};

export type ContextSchemaBrandRetrieveByTickerRequest = {
  "force_language"?: ((ContextSchemaSupportedLanguage) & (string | null));
  /** Optional parameter to optimize the API call for maximum speed. When set to true, the API will skip time-consuming operations for faster response at the cost of less comprehensive data. */
  "maxSpeed"?: boolean;
  /** Maximum age of cached brand data in ms. Defaults to 3 months; clamped to 0–1 year. `0` refreshes. */
  "maxAgeMs"?: number;
  "timeoutOpts"?: ContextSchemaPartialTimeout;
  /** Discriminator for ticker-based brand retrieval. */
  "type": "by_ticker";
  /** Stock ticker symbol to retrieve brand data for (e.g., 'AAPL'). (minLength 1, maxLength 15) */
  "ticker": string;
  "ticker_exchange"?: ((ContextSchemaStockExchange));
  "tags"?: ContextSchemaRequestTags;
};

export type ContextSchemaBrandRetrieveByDirectUrlRequest = {
  /** Discriminator for direct-URL-based brand retrieval. */
  "type": "by_direct_url";
  /** Full http(s) URL to fetch brand data from (e.g., 'https://stripe.com/enterprise'). Only this URL is fetched — not the entire internet. (format uri) */
  "direct_url": string;
  "timeoutOpts"?: ContextSchemaPartialTimeout;
  "tags"?: ContextSchemaRequestTags;
};

export type ContextSchemaBrandRetrieveFromTransactionRequest = {
  /** Discriminator for transaction-based brand retrieval. */
  "type": "by_transaction";
  /** Transaction information to identify the brand. (minLength 3, maxLength 500) */
  "transaction_info": string;
  "force_language"?: ((ContextSchemaSupportedLanguage) & (string | null));
  /** Optional parameter to optimize the API call for maximum speed. When set to true, the API will skip time-consuming operations for faster response at the cost of less comprehensive data. */
  "maxSpeed"?: boolean;
  "timeoutOpts"?: ContextSchemaPartialTimeout;
  "country_gl"?: ((ContextSchemaCountryGL));
  /** Optional city name to prioritize when searching for the brand. */
  "city"?: string;
  /** Optional Merchant Category Code (MCC) to help identify the business category or industry. */
  "mcc"?: ((string) | (number));
  /** Optional phone number from the transaction to help verify brand match. */
  "phone"?: ((string) | (number));
  /** When set to true, the API performs additional verification to ensure the identified brand matches the transaction with high confidence. */
  "high_confidence_only"?: boolean;
  "tags"?: ContextSchemaRequestTags;
};

export type ContextSchemaIndustry = "Aerospace & Defense" | "Technology" | "Finance" | "Healthcare" | "Retail & E-commerce" | "Entertainment" | "Education" | "Government & Nonprofit" | "Industrial & Energy" | "Automotive & Transportation" | "Lifestyle & Leisure" | "Luxury & Fashion" | "News & Media" | "Sports" | "Real Estate & PropTech" | "Legal & Compliance" | "Telecommunications" | "Agriculture & Food" | "Professional Services & Agencies" | "Chemicals & Materials" | "Logistics & Supply Chain" | "Hospitality & Tourism" | "Construction & Built Environment" | "Consumer Packaged Goods (CPG)";

export type ContextSchemaSubindustry = "Defense Systems & Military Hardware" | "Aerospace Manufacturing" | "Avionics & Navigation Technology" | "Subsea & Naval Defense Systems" | "Space & Satellite Technology" | "Defense IT & Systems Integration" | "Software (B2B)" | "Software (B2C)" | "Cloud Infrastructure & DevOps" | "Cybersecurity" | "Artificial Intelligence & Machine Learning" | "Data Infrastructure & Analytics" | "Hardware & Semiconductors" | "Fintech Infrastructure" | "eCommerce & Marketplace Platforms" | "Developer Tools & APIs" | "Web3 & Blockchain" | "XR & Spatial Computing" | "Banking & Lending" | "Investment Management & WealthTech" | "Insurance & InsurTech" | "Payments & Money Movement" | "Accounting, Tax & Financial Planning Tools" | "Capital Markets & Trading Platforms" | "Financial Infrastructure & APIs" | "Credit Scoring & Risk Management" | "Cryptocurrency & Digital Assets" | "BNPL & Alternative Financing" | "Healthcare Providers & Services" | "Pharmaceuticals & Drug Development" | "Medical Devices & Diagnostics" | "Biotechnology & Genomics" | "Digital Health & Telemedicine" | "Health Insurance & Benefits Tech" | "Clinical Trials & Research Platforms" | "Mental Health & Wellness" | "Healthcare IT & EHR Systems" | "Consumer Health & Wellness Products" | "Online Marketplaces" | "Direct-to-Consumer (DTC) Brands" | "Retail Tech & Point-of-Sale Systems" | "Omnichannel & In-Store Retail" | "E-commerce Enablement & Infrastructure" | "Subscription & Membership Commerce" | "Social Commerce & Influencer Platforms" | "Fashion & Apparel Retail" | "Food, Beverage & Grocery E-commerce" | "Streaming Platforms (Video, Music, Audio)" | "Gaming & Interactive Entertainment" | "Creator Economy & Influencer Platforms" | "Film, TV & Production Studios" | "Events, Venues & Live Entertainment" | "Virtual Worlds & Metaverse Experiences" | "K-12 Education Platforms & Tools" | "Higher Education & University Tech" | "Online Learning & MOOCs" | "Test Prep & Certification" | "Corporate Training & Upskilling" | "Tutoring & Supplemental Learning" | "Education Management Systems (LMS/SIS)" | "Language Learning" | "Creator-Led & Cohort-Based Courses" | "Special Education & Accessibility Tools" | "Government Technology & Digital Services" | "Civic Engagement & Policy Platforms" | "International Development & Humanitarian Aid" | "Philanthropy & Grantmaking" | "Nonprofit Operations & Fundraising Tools" | "Public Health & Social Services" | "Education & Youth Development Programs" | "Environmental & Climate Action Organizations" | "Legal Aid & Social Justice Advocacy" | "Municipal & Infrastructure Services" | "Manufacturing & Industrial Automation" | "Energy Production (Oil, Gas, Nuclear)" | "Renewable Energy & Cleantech" | "Utilities & Grid Infrastructure" | "Industrial IoT & Monitoring Systems" | "Construction & Heavy Equipment" | "Mining & Natural Resources" | "Environmental Engineering & Sustainability" | "Energy Storage & Battery Technology" | "Automotive OEMs & Vehicle Manufacturing" | "Electric Vehicles (EVs) & Charging Infrastructure" | "Mobility-as-a-Service (MaaS)" | "Fleet Management" | "Public Transit & Urban Mobility" | "Autonomous Vehicles & ADAS" | "Aftermarket Parts & Services" | "Telematics & Vehicle Connectivity" | "Aviation & Aerospace Transport" | "Maritime Shipping" | "Fitness & Wellness" | "Beauty & Personal Care" | "Home & Living" | "Dating & Relationships" | "Hobbies, Crafts & DIY" | "Outdoor & Recreational Gear" | "Events, Experiences & Ticketing Platforms" | "Designer & Luxury Apparel" | "Accessories, Jewelry & Watches" | "Footwear & Leather Goods" | "Beauty, Fragrance & Skincare" | "Fashion Marketplaces & Retail Platforms" | "Sustainable & Ethical Fashion" | "Resale, Vintage & Circular Fashion" | "Fashion Tech & Virtual Try-Ons" | "Streetwear & Emerging Luxury" | "Couture & Made-to-Measure" | "News Publishing & Journalism" | "Advertising, Adtech & Media Buying" | "Digital Media & Content Platforms" | "Broadcasting (TV & Radio)" | "Podcasting & Audio Media" | "News Aggregators & Curation Tools" | "Independent & Creator-Led Media" | "Newsletters & Substack-Style Platforms" | "Political & Investigative Media" | "Trade & Niche Publications" | "Media Monitoring & Analytics" | "Professional Teams & Leagues" | "Sports Media & Broadcasting" | "Sports Betting & Fantasy Sports" | "Fitness & Athletic Training Platforms" | "Sportswear & Equipment" | "Esports & Competitive Gaming" | "Sports Venues & Event Management" | "Athlete Management & Talent Agencies" | "Sports Tech & Performance Analytics" | "Youth, Amateur & Collegiate Sports" | "Real Estate Marketplaces" | "Property Management Software" | "Rental Platforms" | "Mortgage & Lending Tech" | "Real Estate Investment Platforms" | "Law Firms & Legal Services" | "Legal Tech & Automation" | "Regulatory Compliance" | "E-Discovery & Litigation Tools" | "Contract Management" | "Governance, Risk & Compliance (GRC)" | "IP & Trademark Management" | "Legal Research & Intelligence" | "Compliance Training & Certification" | "Whistleblower & Ethics Reporting" | "Mobile & Wireless Networks (3G/4G/5G)" | "Broadband & Fiber Internet" | "Satellite & Space-Based Communications" | "Network Equipment & Infrastructure" | "Telecom Billing & OSS/BSS Systems" | "VoIP & Unified Communications" | "Internet Service Providers (ISPs)" | "Edge Computing & Network Virtualization" | "IoT Connectivity Platforms" | "Precision Agriculture & AgTech" | "Crop & Livestock Production" | "Food & Beverage Manufacturing & Processing" | "Food Distribution" | "Restaurants & Food Service" | "Agricultural Inputs & Equipment" | "Sustainable & Regenerative Agriculture" | "Seafood & Aquaculture" | "Management Consulting" | "Marketing & Advertising Agencies" | "Design, Branding & Creative Studios" | "IT Services & Managed Services" | "Staffing, Recruiting & Talent" | "Accounting & Tax Firms" | "Public Relations & Communications" | "Business Process Outsourcing (BPO)" | "Professional Training & Coaching" | "Specialty Chemicals" | "Commodity & Petrochemicals" | "Polymers, Plastics & Rubber" | "Coatings, Adhesives & Sealants" | "Industrial Gases" | "Advanced Materials & Composites" | "Battery Materials & Energy Storage" | "Electronic Materials & Semiconductor Chemicals" | "Agrochemicals & Fertilizers" | "Freight & Transportation Tech" | "Last-Mile Delivery" | "Warehouse Automation" | "Supply Chain Visibility Platforms" | "Logistics Marketplaces" | "Shipping & Freight Forwarding" | "Cold Chain Logistics" | "Reverse Logistics & Returns" | "Cross-Border Trade Tech" | "Transportation Management Systems (TMS)" | "Hotels & Accommodation" | "Vacation Rentals & Short-Term Stays" | "Restaurant Tech & Management" | "Travel Booking Platforms" | "Tourism Experiences & Activities" | "Cruise Lines & Marine Tourism" | "Hospitality Management Systems" | "Event & Venue Management" | "Corporate Travel Management" | "Travel Insurance & Protection" | "Construction Management Software" | "BIM/CAD & Design Tools" | "Construction Marketplaces" | "Equipment Rental & Management" | "Building Materials & Procurement" | "Construction Workforce Management" | "Project Estimation & Bidding" | "Modular & Prefab Construction" | "Construction Safety & Compliance" | "Smart Building Technology" | "Food & Beverage CPG" | "Home & Personal Care CPG" | "CPG Analytics & Insights" | "Direct-to-Consumer CPG Brands" | "CPG Supply Chain & Distribution" | "Private Label Manufacturing" | "CPG Retail Intelligence" | "Sustainable CPG & Packaging" | "Beauty & Cosmetics CPG" | "Health & Wellness CPG";

export type ContextSchemaSupportedLanguage = "afrikaans" | "albanian" | "amharic" | "arabic" | "armenian" | "assamese" | "aymara" | "azeri" | "basque" | "belarusian" | "bengali" | "bosnian" | "bulgarian" | "burmese" | "cantonese" | "catalan" | "cebuano" | "chinese" | "corsican" | "croatian" | "czech" | "danish" | "dutch" | "english" | "esperanto" | "estonian" | "farsi" | "fijian" | "finnish" | "french" | "galician" | "georgian" | "german" | "greek" | "guarani" | "gujarati" | "haitian-creole" | "hausa" | "hawaiian" | "hebrew" | "hindi" | "hmong" | "hungarian" | "icelandic" | "igbo" | "indonesian" | "irish" | "italian" | "japanese" | "javanese" | "kannada" | "kazakh" | "khmer" | "kinyarwanda" | "korean" | "kurdish" | "kyrgyz" | "lao" | "latin" | "latvian" | "lingala" | "lithuanian" | "luxembourgish" | "macedonian" | "malagasy" | "malay" | "malayalam" | "maltese" | "maori" | "marathi" | "mongolian" | "nepali" | "norwegian" | "odia" | "oromo" | "pashto" | "pidgin" | "polish" | "portuguese" | "punjabi" | "quechua" | "romanian" | "russian" | "samoan" | "scottish-gaelic" | "serbian" | "sesotho" | "shona" | "sindhi" | "sinhala" | "slovak" | "slovene" | "somali" | "spanish" | "sundanese" | "swahili" | "swedish" | "tagalog" | "tajik" | "tamil" | "tatar" | "telugu" | "thai" | "tibetan" | "tigrinya" | "tongan" | "tswana" | "turkish" | "turkmen" | "ukrainian" | "urdu" | "uyghur" | "uzbek" | "vietnamese" | "welsh" | "wolof" | "xhosa" | "yiddish" | "yoruba" | "zulu";

export type ContextSchemaUtilityPrefetchDomainIdentifier = {
  /** Domain, e.g. `stripe.com`. (minLength 3) */
  "domain": string;
};

export type ContextSchemaUtilityPrefetchEmailIdentifier = {
  /** Email address to prefetch data for. The domain will be extracted from the email. Free email providers (gmail.com, yahoo.com, etc.) and disposable email addresses are not allowed. (minLength 1, format email) */
  "email": string;
};

export type ContextSchemaMonitorsMode = "web";

export type ContextSchemaMonitorsTarget = ((ContextSchemaMonitorsPageTarget) | (ContextSchemaMonitorsSitemapTarget) | (((ContextSchemaMonitorsExtractTarget))));

export type ContextSchemaMonitorsChangeDetection = ((ContextSchemaMonitorsExactChangeDetection) | (ContextSchemaMonitorsSemanticChangeDetection));

export type ContextSchemaMonitorsSchedule = ((ContextSchemaMonitorsIntervalSchedule));

export type ContextSchemaMonitorsNullableWebhookConfig = ((((ContextSchemaMonitorsWebhookConfig))) | (null));

export type ContextSchemaMonitorsMonitorStatus = "active" | "paused" | "failed";

export type ContextSchemaMonitorsRunError = {
  "code": string;
  "message": string;
};

export type ContextSchemaMonitorsWebhookFailure = {
  /** Number of consecutive delivery attempts that did not succeed. (min 1) */
  "consecutive_failures": number;
  /** Outcome of the most recent failed delivery. rejected means a non-2xx response; failed means no HTTP response was received; skipped_unsafe_url means the URL failed the public-endpoint safety check. */
  "last_status": "rejected" | "failed" | "skipped_unsafe_url";
  /** Human-readable description of the most recent failure. */
  "last_message": string;
  /**  (format date-time) */
  "last_failed_at": string;
};

export type ContextSchemaMonitorsPageBaseline = {
  /** The page's visible text as last observed. */
  "text": string;
  /** When this baseline was last captured or replaced. (format date-time) */
  "captured_at": string;
};

export type ContextSchemaMonitorsSitemapBaseline = {
  /** The sitemap URLs as last observed (sorted, normalized). */
  "urls": Array<string>;
  /** Number of URLs in the baseline. */
  "url_count": number;
  /** When this baseline was last captured or replaced. (format date-time) */
  "captured_at": string;
};

export type ContextSchemaMonitorsExtractBaseline = {
  /** Latest structured snapshot matching the extraction schema, refreshed at most daily; `null` before capture. */
  "data": unknown;
  /** The page URLs the monitor tracks and analyzes for changes. */
  "urls_analyzed": Array<string>;
  /** When this baseline was last captured or replaced. (format date-time) */
  "captured_at": string;
};

export type ContextSchemaMonitorsMonitor = {
  "mode": ContextSchemaMonitorsMode;
  "id": string;
  "name": string;
  "target": ContextSchemaMonitorsTarget;
  "change_detection": ContextSchemaMonitorsChangeDetection;
  "schedule": ContextSchemaMonitorsSchedule;
  "webhook"?: ContextSchemaMonitorsNullableWebhookConfig;
  "status": ContextSchemaMonitorsMonitorStatus;
  /**  (format date-time) */
  "last_run_at"?: string | null;
  /**  (format date-time) */
  "last_change_at"?: string | null;
  /** When the next scheduled run is due; null while paused. (format date-time) */
  "next_run_at"?: string | null;
  /** Error from the most recent failed run; null when the last run succeeded. */
  "last_error"?: ((((ContextSchemaMonitorsRunError))) | (null));
  /** Present while webhook deliveries are failing consecutively; null when deliveries are healthy or no webhook is configured. Cleared on the next successful delivery and when the webhook URL changes. */
  "webhook_failure"?: ((ContextSchemaMonitorsWebhookFailure) | (null));
  /**  (format date-time) */
  "created_at": string;
  /**  (format date-time) */
  "updated_at": string;
  /** Labels for filtering monitors, their changes, and their usage. (maxItems 20) */
  "tags"?: Array<string>;
  /** Comparison baseline, included on Retrieve. Null until capture completes or after target changes. */
  "baseline"?: ((ContextSchemaMonitorsPageBaseline) | (ContextSchemaMonitorsSitemapBaseline) | (ContextSchemaMonitorsExtractBaseline) | (null));
};

export type ContextSchemaMonitorsRun = {
  /** Webhook delivery IDs for this run. */
  "webhook_delivery_ids"?: Array<string>;
  "id": string;
  "monitor_id": string;
  "status": ContextSchemaMonitorsRunStatus;
  /** A baseline run follows creation or a target or detection change. */
  "run_type": "baseline" | "scheduled";
  "target_type": ContextSchemaMonitorsTargetType;
  "change_detection_type": ContextSchemaMonitorsChangeDetectionType;
  /**  (format date-time) */
  "started_at"?: string | null;
  /**  (format date-time) */
  "completed_at"?: string | null;
  "change_detected": boolean;
  "change_id"?: string | null;
  /** True when this run established the monitor's initial baseline; baseline runs perform no change detection. */
  "baseline_created": boolean;
  /** Credits charged for this run (0 for skipped/failed runs). (min 0) */
  "credits_charged": number;
  /** Why a skipped run never executed; null unless status is `skipped`. */
  "skip_reason"?: "insufficient_credits" | "monitor_paused" | "superseded" | null;
  "error"?: ContextSchemaMonitorsNullableRunError;
  /** Deprecated. Use `webhook_deliveries` for all attempts. */
  "webhook_delivery"?: ContextSchemaMonitorsWebhookDelivery;
  /** All webhook deliveries attempted by this run — one per subscribed event that fired. Omitted when no webhook was attempted, including runs created before event selection was added. */
  "webhook_deliveries"?: Array<ContextSchemaMonitorsWebhookDelivery>;
};

export type ContextSchemaMonitorsTargetType = "page" | "sitemap" | "extract";

export type ContextSchemaMonitorsChangeDetectionType = "exact" | "semantic";

export type ContextSchemaMonitorsNullableRunError = ((((ContextSchemaMonitorsRunError))) | (null));

export type ContextSchemaMonitorsWebhookDelivery = {
  /** Delivery ID for status checks and retries, when available. */
  "delivery_id"?: string;
  /** Identifier sent in the X-Context-Id header. */
  "event_id": string;
  /** The event this delivery carried. Deliveries recorded before event selection existed report change.detected. */
  "event": "change.detected" | "run.completed";
  /** Outcome of the delivery attempt. Any 2xx response counts as delivered. */
  "status": "delivered" | "rejected" | "failed" | "skipped_unsafe_url";
  /** The endpoint's final HTTP response status, or null when no response was received. (min 100, max 599) */
  "http_status": number | null;
  /**  (format date-time) */
  "attempted_at": string;
  "error": ContextSchemaMonitorsNullableRunError;
};

export type ContextSchemaMonitorsChange = {
  "mode": ContextSchemaMonitorsMode;
  "id": string;
  "monitor_id": string;
  /** The run that detected this change. */
  "run_id": string;
  "target_type": ContextSchemaMonitorsTargetType;
  "change_detection_type": ContextSchemaMonitorsChangeDetectionType;
  "title": string;
  "summary": string;
  /**  (format date-time) */
  "detected_at": string;
  /**  (format uri) */
  "url": string;
  "importance"?: ContextSchemaMonitorsImportance;
  /**  (min 0, max 1) */
  "confidence"?: number;
  /** Text diff between the previous and current page baseline (page targets). */
  "diff"?: string;
  "before_text_excerpt"?: string;
  "after_text_excerpt"?: string;
  /** At most 500 URLs are included; the corresponding count field is always exact. */
  "added_urls"?: Array<string>;
  /** At most 500 URLs are included; the corresponding count field is always exact. */
  "removed_urls"?: Array<string>;
  /**  (min 0) */
  "added_url_count"?: number;
  /**  (min 0) */
  "removed_url_count"?: number;
  /** At most 500 URLs are included; the corresponding count field is always exact. */
  "matched_urls"?: Array<string>;
  /**  (min 0) */
  "matched_url_count"?: number;
  "evidence"?: Array<ContextSchemaMonitorsEvidence>;
  /** Labels for filtering monitors, their changes, and their usage. (maxItems 20) */
  "tags": Array<string>;
};

export type ContextSchemaMonitorsCreditUsage = {
  "monitor_id": string;
  /** Monitor name (falls back to the id when the monitor was deleted). */
  "name": string;
  /** Credits charged to this monitor over the window. */
  "credits": number;
  /** Number of billed runs over the window. */
  "runs": number;
};

export type ContextSchemaMonitorsImportance = "low" | "medium" | "high";

export type ContextSchemaMonitorsEvidence = {
  /** Optional URL the evidence relates to. Absent for whole-target diffs. (format uri) */
  "url"?: string;
  /** Snapshot of the content before the change. */
  "before": string;
  /** Snapshot of the content after the change. */
  "after": string;
};

export type ContextSchemaBatchUnifiedScrapeData = {
  /** Pages to scrape. Maximum 100000. (maxItems 100000) */
  "urls": Array<{
    /** Page URL to scrape. (minLength 1) */
    "url": string;
    /** Your ID for this page, returned with its result. The same URL can use different IDs. (minLength 1, maxLength 200) */
    "itemId"?: string;
    /** Custom JSON returned unchanged with this page result. */
    "meta"?: {
      [key: string]: unknown;
    };
  }>;
  /** Outputs to return. Set at least one to `true`. */
  "formats": ContextSchemaScrapeFormats;
  /** Markdown options. Requires `formats.markdown`. */
  "markdownParams"?: ContextSchemaScrapeMarkdownParams;
  /** Screenshot options. Requires formats.screenshot: true. */
  "screenshotParams"?: ContextSchemaScrapeScreenshotParams;
  /** Image options. Requires formats.images: true. */
  "imageParams"?: ContextSchemaScrapeImageParams;
  /** Requires `formats.parse: true`; required when it is set. */
  "parseParams"?: ContextSchemaScrapeParseParams;
  /** Requires `formats.highlights: true`; required when it is set. */
  "highlightsParams"?: ContextSchemaScrapeHighlightsParams;
  /** Requires `formats.json: true`; required when it is set. */
  "jsonParams"?: ContextSchemaScrapeJsonParams;
  /** Product options. Requires formats.product: true. */
  "productParams"?: ContextSchemaScrapeProductParams;
  /** Browser and content settings shared by all outputs. */
  "sharedParams"?: ContextSchemaScrapeSharedParams;
  /** Maximum age of a cached output, in milliseconds. `0` fetches fresh. Defaults to 3 days (259200000 ms). Maximum: 1 year (31536000000 ms). (min 0, max 31536000000) */
  "maxAgeMs"?: number;
  /** Batches persist their results. Only disabled is supported; enabled returns ZDR_NOT_SUPPORTED. */
  "zdr"?: "disabled";
  /** Deadline for each page, using the same behavior and defaults as POST /web/scrape. */
  "timeoutOpts"?: ContextSchemaScrapeTimeout;
  /** Labels for tracking request usage. Not retained when zdr is enabled. */
  "tags"?: ContextSchemaRequestTags;
};

export type ContextSchemaBatchUnifiedCrawlData = {
  /** How to find pages to crawl. */
  "source": (({
    /** Start from one page. */
    "type": "start_url";
    /** Page where crawling begins. A URL without a scheme is read as https://. (minLength 1) */
    "url": string;
    /** Limits and filters for page discovery. */
    "controls"?: {
      /** Maximum pages to fetch. Unused reserved credits are refunded. Maximum 100000. (min 1, max 100000) */
      "maxUrls"?: number;
      /** Maximum link depth. Source pages are depth 0. No limit when omitted. (min 0, max 50) */
      "maxDepth"?: number;
      /** Follow links to subdomains. */
      "followSubdomains"?: boolean;
      /** Regex pattern for URLs to include. The `start_url` itself is always included. (maxLength 256) */
      "regex"?: string;
      /** Regex pattern for URLs to exclude, even when they match `regex`. The `start_url` itself is always included. (maxLength 256) */
      "excludeRegex"?: string;
      /** Only follow pages in these languages, or `same_as_start_url`; all languages when omitted. */
      "languages"?: (("same_as_start_url") | (Array<"am" | "ar" | "az" | "be" | "bg" | "bn" | "ca" | "ceb" | "cs" | "cy" | "da" | "de" | "el" | "en" | "es" | "et" | "eu" | "fa" | "fi" | "fr" | "gu" | "ha" | "haw" | "he" | "hi" | "hr" | "hu" | "hy" | "id" | "is" | "it" | "ja" | "ka" | "kk" | "kn" | "ko" | "ku" | "ky" | "lo" | "lt" | "lv" | "mk" | "ml" | "mn" | "mr" | "ms" | "ne" | "nl" | "no" | "or" | "pa" | "pl" | "ps" | "pt" | "ro" | "ru" | "sk" | "sl" | "so" | "sq" | "sr" | "sv" | "sw" | "ta" | "te" | "th" | "tl" | "tr" | "uk" | "ur" | "uz" | "vi" | "yo" | "zh">));
    };
  }) | ({
    /** Scrape the URLs in the domain's sitemap. */
    "type": "sitemap";
    /** Domain whose sitemap lists the pages to scrape. A full URL is reduced to its domain. (minLength 3) */
    "domain": string;
    /** Limits and filters for the sitemap URLs. A sitemap batch scrapes exactly those URLs and never follows links off them, so there is no crawl depth here. */
    "controls"?: {
      /** Maximum pages to fetch. Unused reserved credits are refunded. Maximum 100000. (min 1, max 100000) */
      "maxUrls"?: number;
      /** Regex pattern; only sitemap URLs matching it are scraped. (maxLength 256) */
      "regex"?: string;
      /** Regex pattern; sitemap URLs matching it are not scraped, even when they match `regex`. (maxLength 256) */
      "excludeRegex"?: string;
    };
  }));
  /** Outputs to return. Set at least one to `true`. */
  "formats": ContextSchemaScrapeFormats;
  /** Markdown options. Requires `formats.markdown`. */
  "markdownParams"?: ContextSchemaScrapeMarkdownParams;
  /** Screenshot options. Requires formats.screenshot: true. */
  "screenshotParams"?: ContextSchemaScrapeScreenshotParams;
  /** Image options. Requires formats.images: true. */
  "imageParams"?: ContextSchemaScrapeImageParams;
  /** Requires `formats.parse: true`; required when it is set. */
  "parseParams"?: ContextSchemaScrapeParseParams;
  /** Requires `formats.highlights: true`; required when it is set. */
  "highlightsParams"?: ContextSchemaScrapeHighlightsParams;
  /** Requires `formats.json: true`; required when it is set. */
  "jsonParams"?: ContextSchemaScrapeJsonParams;
  /** Product options. Requires formats.product: true. */
  "productParams"?: ContextSchemaScrapeProductParams;
  /** Browser and content settings shared by all outputs. */
  "sharedParams"?: ContextSchemaScrapeSharedParams;
  /** Maximum age of a cached output, in milliseconds. `0` fetches fresh. Defaults to 3 days (259200000 ms). Maximum: 1 year (31536000000 ms). (min 0, max 31536000000) */
  "maxAgeMs"?: number;
  /** Batches persist their results. Only disabled is supported; enabled returns ZDR_NOT_SUPPORTED. */
  "zdr"?: "disabled";
  /** Deadline for each page, using the same behavior and defaults as POST /web/scrape. */
  "timeoutOpts"?: ContextSchemaScrapeTimeout;
  /** Labels for tracking request usage. Not retained when zdr is enabled. */
  "tags"?: ContextSchemaRequestTags;
};

export type ContextSchemaBatchNullableCrawlControls = ((((ContextSchemaBatchCrawlControls))) | (null));

export type ContextSchemaBatchIntake = {
  /** Pages accepted; progress counts toward this total. */
  "reserved": number;
  /** True when `reserved` is a crawl ceiling; false when it is an exact URL count. */
  "reserved_is_ceiling": boolean;
  /** URLs in the list you sent, before validation and de-duplication. Null for a crawl, which is given a source rather than a list. */
  "submitted": number | null;
  /** URLs dropped before reserving because another entry resolved to the same page. Non-zero for sitemap crawls too, whose sitemaps routinely list a page more than once. */
  "duplicates": number;
  /** Rejected input URLs; `null` for a crawl. */
  "invalid": number | null;
};

export type ContextSchemaBatchPageErrorCount = {
  /** Error code for these failures. */
  "code": string;
  /** Pages that failed with this code. */
  "count": number;
};

export type ContextSchemaBatchNullableFailure = ((((ContextSchemaBatchFailure))) | (null));

export type ContextSchemaBatchScrapeResponse = ContextSchemaScrapeResponse;

export type ContextSchemaScrapeParseRules = {
  [key: string]: ((string) | ({
    /** CSS selector to match within the current page or parent rule. (minLength 1, maxLength 2048) */
    "selector": string;
    /** Return the first match with `item` or all matches with `list`. */
    "type"?: "item" | "list";
    /** Return text, HTML, an attribute such as `@href`, or nested field rules. Defaults to text. */
    "output"?: (("text" | "html") | (string) | (ContextSchemaScrapeParseRules));
  }));
};

export type ContextSchemaScrapeProfile = (({
  /** Reuse a saved browser profile. */
  "type": "existing";
  /** The ID returned in profile.id by an earlier scrape. */
  "profileId": string;
}) | ({
  /** Sign in and create a browser profile. */
  "type": "new";
  /** Username or email for the target website. (minLength 1, maxLength 1024) */
  "identifier": string;
  /** Password used to sign in. It is never stored in the profile. (minLength 1, maxLength 4096) */
  "password": string;
  /** Optional label shown when listing profiles with `GET /org/browser/profiles`. (minLength 1, maxLength 500) */
  "description"?: string;
}));

export type ContextSchemaScrapeAction = (({
  /** Use `perform` for a plain-language browser instruction. */
  "type": "perform";
  /** One browser instruction, such as clicking a button or entering text. (minLength 1, maxLength 500) */
  "action": string;
}) | ({
  /** Use `scroll` to move through the page or a container. */
  "type": "scroll";
  /** Direction to scroll. */
  "direction"?: "down" | "up" | "left" | "right";
  /** Distance per scroll: pixels, one `viewport`, or `max` to reach the end. */
  "amount"?: ((number) | ("viewport" | "max"));
  /** Scroll this container. Omit to scroll the page. (maxLength 2000) */
  "selector"?: string;
  /** Maximum number of scroll steps for this action. (min 1, max 50) */
  "maxScrolls"?: number;
}) | ({
  /** Use `wait` to pause for a fixed duration. */
  "type": "wait";
  /** Time to pause in milliseconds before the next action. (min 0, max 30000) */
  "milliseconds": number;
}) | ({
  /** Use `waitFor` to wait for a matching element. */
  "type": "waitFor";
  /** CSS selector to wait for before continuing. (maxLength 2048) */
  "selector": string;
}));

export type ContextSchemaScrapePdfOptions = {
  /** First page to parse, starting at 1. (min 1) */
  "startPage"?: number;
  /** Last page to parse. Must be at least `startPage`. (min 1) */
  "endPage"?: number;
  /** Set `auto` to read scanned pages with OCR. */
  "ocr"?: "off" | "auto";
};

export type ContextSchemaScrapeProduct = {
  /** Product name. */
  "name": string;
  /** Product description. */
  "description": string | null;
  /** Brand or vendor. */
  "brand": string | null;
  /** Product identifier such as a SKU or model number. */
  "sku": string | null;
  /** Current price. */
  "price": number | null;
  /** List price before any discount. */
  "regularPrice": number | null;
  /** ISO 4217 currency code. */
  "currency": string | null;
  /** Stock or ordering availability. */
  "availability": "in_stock" | "out_of_stock" | "limited_availability" | "preorder" | "backorder" | "made_to_order" | "discontinued" | null;
  /** Product category. */
  "category": string | null;
  /** Main product image URL. (format uri) */
  "imageUrl": string | null;
  /** Product image URLs, main image first. */
  "images": Array<string>;
  /** Product dimensions as shown on the page. */
  "dimensions": Array<string>;
  /** Key features and specifications. */
  "features": Array<string>;
  /** Intended audience. */
  "targetAudience": Array<string>;
  /** Product tags. */
  "tags": Array<string>;
  "variants": ContextSchemaProductVariants;
};

export type ContextSchemaPersonEnrichmentCandidateMatch = {
  "status": "candidate";
  /**  (min 0, max 100) */
  "score": number;
  "person": {
    "name"?: {
      "full"?: string;
      "first"?: string;
      "last"?: string;
    };
    /**  (format email) */
    "email"?: string;
    "avatar_url"?: string;
    "bio"?: string;
    "location"?: {
      "display"?: string;
      "city"?: string;
      "region"?: string;
      "country"?: string;
      "country_code"?: string;
    };
    "social_urls": Array<string>;
    "website_urls": Array<string>;
    "current_role"?: {
      "title": string;
      "organization": {
        "name": string;
        "domain"?: string;
      };
      "location"?: string;
      "description"?: string;
      "start_date"?: {
        "year": number;
        /**  (min 1, max 12) */
        "month"?: number;
        /**  (min 1, max 31) */
        "day"?: number;
      };
      "end_date"?: {
        "year": number;
        /**  (min 1, max 12) */
        "month"?: number;
        /**  (min 1, max 31) */
        "day"?: number;
      };
      "is_current"?: boolean;
    };
    /** Whether the person's current role is known. `present` — current_role is populated. `none` — the work history explicitly shows every role has ended. `unknown` — our data sources could not confirm either way; treat a missing current_role as unverified rather than vacant. */
    "current_role_status": "present" | "none" | "unknown";
    "experience": Array<{
      "title": string;
      "organization": {
        "name": string;
        "domain"?: string;
      };
      "location"?: string;
      "description"?: string;
      "start_date"?: {
        "year": number;
        /**  (min 1, max 12) */
        "month"?: number;
        /**  (min 1, max 31) */
        "day"?: number;
      };
      "end_date"?: {
        "year": number;
        /**  (min 1, max 12) */
        "month"?: number;
        /**  (min 1, max 31) */
        "day"?: number;
      };
      "is_current"?: boolean;
    }>;
    "education": Array<{
      "institution": {
        "name": string;
        "domain"?: string;
      };
      "degree"?: string;
      "field_of_study"?: string;
      "description"?: string;
      "start_date"?: {
        "year": number;
        /**  (min 1, max 12) */
        "month"?: number;
        /**  (min 1, max 31) */
        "day"?: number;
      };
      "end_date"?: {
        "year": number;
        /**  (min 1, max 12) */
        "month"?: number;
        /**  (min 1, max 31) */
        "day"?: number;
      };
    }>;
    "skills": Array<string>;
    /** When the underlying profile data last changed in our data sources (ISO 8601). Omitted when unknown. */
    "last_updated"?: string;
    /** When we last refreshed this profile from our data sources (ISO 8601). */
    "checked_at"?: string;
  };
};

export type ContextSchemaPersonEnrichmentNotFoundMatch = {
  "status": "not_found";
  "score": null;
  "person": null;
};

export type ContextSchemaCountryGL = "af" | "al" | "dz" | "as" | "ad" | "ao" | "ai" | "aq" | "ag" | "ar" | "am" | "aw" | "au" | "at" | "az" | "bs" | "bh" | "bd" | "bb" | "by" | "be" | "bz" | "bj" | "bm" | "bt" | "bo" | "ba" | "bw" | "bv" | "br" | "io" | "bn" | "bg" | "bf" | "bi" | "kh" | "cm" | "ca" | "cv" | "ky" | "cf" | "td" | "cl" | "cn" | "cx" | "cc" | "co" | "km" | "cg" | "cd" | "ck" | "cr" | "ci" | "hr" | "cu" | "cy" | "cz" | "dk" | "dj" | "dm" | "do" | "ec" | "eg" | "sv" | "gq" | "er" | "ee" | "et" | "fk" | "fo" | "fj" | "fi" | "fr" | "gf" | "pf" | "tf" | "ga" | "gm" | "ge" | "de" | "gh" | "gi" | "gr" | "gl" | "gd" | "gp" | "gu" | "gt" | "gn" | "gw" | "gy" | "ht" | "hm" | "va" | "hn" | "hk" | "hu" | "is" | "in" | "id" | "ir" | "iq" | "ie" | "il" | "it" | "jm" | "jp" | "jo" | "kz" | "ke" | "ki" | "kp" | "kr" | "kw" | "kg" | "la" | "lv" | "lb" | "ls" | "lr" | "ly" | "li" | "lt" | "lu" | "mo" | "mk" | "mg" | "mw" | "my" | "mv" | "ml" | "mt" | "mh" | "mq" | "mr" | "mu" | "yt" | "mx" | "fm" | "md" | "mc" | "mn" | "ms" | "ma" | "mz" | "mm" | "na" | "nr" | "np" | "nl" | "an" | "nc" | "nz" | "ni" | "ne" | "ng" | "nu" | "nf" | "mp" | "no" | "om" | "pk" | "pw" | "ps" | "pa" | "pg" | "py" | "pe" | "ph" | "pn" | "pl" | "pt" | "pr" | "qa" | "re" | "ro" | "ru" | "rw" | "sh" | "kn" | "lc" | "pm" | "vc" | "ws" | "sm" | "st" | "sa" | "sn" | "rs" | "sc" | "sl" | "sg" | "sk" | "si" | "sb" | "so" | "za" | "gs" | "es" | "lk" | "sd" | "sr" | "sj" | "sz" | "se" | "ch" | "sy" | "tw" | "tj" | "tz" | "th" | "tl" | "tg" | "tk" | "to" | "tt" | "tn" | "tr" | "tm" | "tc" | "tv" | "ug" | "ua" | "ae" | "gb" | "us" | "um" | "uy" | "uz" | "vu" | "ve" | "vn" | "vg" | "vi" | "wf" | "eh" | "ye" | "zm" | "zw";

export type ContextSchemaStockExchange = "AMEX" | "AMS" | "AQS" | "ASX" | "ATH" | "BER" | "BME" | "BRU" | "BSE" | "BUD" | "BUE" | "BVC" | "CBOE" | "CNQ" | "CPH" | "DFM" | "DOH" | "DUB" | "DUS" | "DXE" | "EGX" | "FSX" | "HAM" | "HEL" | "HKSE" | "HOSE" | "ICE" | "IOB" | "IST" | "JKT" | "JNB" | "JPX" | "KLS" | "KOE" | "KSC" | "KUW" | "LIS" | "LSE" | "MCX" | "MEX" | "MIL" | "MUN" | "NASDAQ" | "NEO" | "NSE" | "NYSE" | "NZE" | "OSL" | "OTC" | "PAR" | "PNK" | "PRA" | "RIS" | "SAO" | "SAU" | "SES" | "SET" | "SGO" | "SHH" | "SHZ" | "SIX" | "STO" | "STU" | "TAI" | "TAL" | "TLV" | "TSX" | "TSXV" | "TWO" | "VIE" | "WSE" | "XETRA";

export type ContextSchemaMonitorsPageTarget = {
  /** Use `page` to watch one web page. */
  "type": "page";
  /** Public HTTP(S) page URL to monitor. (format uri) */
  "url": string;
  /** Plain-language goal describing which page changes matter. When provided without change_detection, semantic detection is inferred. (minLength 1, maxLength 2000) */
  "instructions"?: string;
  /** Normalize whitespace before comparing or analyzing text. */
  "normalize_whitespace"?: boolean;
  /** Monitor these CSS-selected regions. Empty or omitted uses main content. Changes create a new baseline. (maxItems 50) */
  "include_selectors"?: Array<string>;
  /** Remove matching regions after inclusions. Changes create a new baseline. (maxItems 50) */
  "exclude_selectors"?: Array<string>;
  /** Optional browser actions executed in array order after the page loads, before content is captured, on every run. Requires a paid plan. Maximum: 5 actions. Changes create a new baseline. (maxItems 5) */
  "actions"?: Array<ContextSchemaWebScrapeAction> | null;
};

export type ContextSchemaMonitorsSitemapTarget = {
  /** Use `sitemap` to watch a site for added or removed URLs. */
  "type": "sitemap";
  /** Sitemap URL to monitor. (format uri) */
  "url": string;
  /** URL path patterns to include (max 50). (maxItems 50) */
  "include"?: Array<string>;
  /** URL path patterns to exclude (max 50). (maxItems 50) */
  "exclude"?: Array<string>;
  /** Maximum number of sitemap URLs to track (capped at 10,000). (min 1, max 10000) */
  "max_urls"?: number;
};

export type ContextSchemaMonitorsExtractTarget = {
  /** Use `extract` to watch structured data across selected pages. */
  "type": "extract";
  /** Root URL to extract structured data from. (format uri) */
  "url": string;
  /** JSON Schema for page selection and the baseline snapshot. Changes return diffs and evidence. */
  "schema"?: {
    [key: string]: unknown;
  };
  /** Natural-language instructions guiding which pages and facts to track and which changes to report. (minLength 1, maxLength 2000) */
  "instructions": string;
  /** Maximum number of pages to track. (min 1, max 50) */
  "max_pages"?: number;
  /** Optional maximum link depth from the starting URL (0 = only the starting page). (min 0, max 10) */
  "max_depth"?: number;
  /** Allow page discovery on subdomains of the target site. */
  "follow_subdomains"?: boolean;
};

export type ContextSchemaMonitorsExactChangeDetection = {
  /** Use `exact` to compare visible text or sitemap URLs. */
  "type": "exact";
};

export type ContextSchemaMonitorsSemanticChangeDetection = {
  /** Use `semantic` to judge changes against the target instructions. */
  "type": "semantic";
  /** Minimum confidence required to report a meaningful change, from 0 to 1. (min 0, max 1) */
  "confidence_threshold"?: number;
};

export type ContextSchemaMonitorsIntervalSchedule = {
  /** Use `interval` to run on a repeating schedule. */
  "type": "interval";
  /** Number of units between runs. The resulting interval (frequency × unit) must be at least 10 minutes and at most 1 year (e.g. minimum 10 when unit is minutes; maximum 365 when unit is days). (min 1, max 525600) */
  "frequency": number;
  "unit": ContextSchemaMonitorsScheduleUnit;
};

export type ContextSchemaMonitorsWebhookConfig = {
  /** Public HTTP(S) URL that receives events. Slack and GovSlack URLs get formatted messages. (format uri) */
  "url": string;
  /** Events to deliver. Defaults to `change.detected`; `run.completed` also includes unchanged runs. (maxItems 2) */
  "events"?: Array<"change.detected" | "run.completed">;
  "retry"?: ContextSchemaWebhookRetry;
  /** API-generated signing secret. Visible only with full access or `monitors:write` permission. */
  "secret"?: string;
};

export type ContextSchemaBatchCrawlControls = {
  /** Where the crawl started. */
  "source": (({
    "type": "start_url";
    /** Page the crawl started from. */
    "url": string;
  }) | ({
    "type": "sitemap";
    /** Domain whose sitemap supplied the pages. */
    "domain": string;
  }));
  /** The `maxUrls` submitted with the crawl. A sitemap crawl scrapes only the URLs its sitemap actually lists, up to this many, so `input.reserved` is often lower. */
  "max_pages": number;
  /** Link depth limit. Always 0 for a sitemap crawl, which never follows links off its URLs; null when a `start_url` crawl set no limit. */
  "max_depth": number | null;
  /** Whether links to subdomains were followed. Always false for a sitemap crawl. */
  "follow_subdomains": boolean;
  /** Regex pattern URLs had to match to be crawled. Null when the crawl set none. */
  "url_pattern": string | null;
  /** Regex pattern URLs must not match to be crawled. Null when the crawl set none. */
  "exclude_url_pattern": string | null;
  /** Languages whose pages were followed; null when all languages were. */
  "languages": (("same_as_start_url") | (Array<"am" | "ar" | "az" | "be" | "bg" | "bn" | "ca" | "ceb" | "cs" | "cy" | "da" | "de" | "el" | "en" | "es" | "et" | "eu" | "fa" | "fi" | "fr" | "gu" | "ha" | "haw" | "he" | "hi" | "hr" | "hu" | "hy" | "id" | "is" | "it" | "ja" | "ka" | "kk" | "kn" | "ko" | "ku" | "ky" | "lo" | "lt" | "lv" | "mk" | "ml" | "mn" | "mr" | "ms" | "ne" | "nl" | "no" | "or" | "pa" | "pl" | "ps" | "pt" | "ro" | "ru" | "sk" | "sl" | "so" | "sq" | "sr" | "sv" | "sw" | "ta" | "te" | "th" | "tl" | "tr" | "uk" | "ur" | "uz" | "vi" | "yo" | "zh">) | (null));
};

export type ContextSchemaBatchFailure = {
  /** Why the batch itself stopped. */
  "code": string;
  /** Human-readable explanation. */
  "message": string;
};

export type ContextSchemaProductVariants = Array<{
  "sku": string | null;
  /** Explicit variant attributes such as color, size, material, pattern and properties declared by page. */
  "attributes": {
    [key: string]: string;
  };
  /** Variant or offer URL when provided by the source. May be shared by variants. */
  "url": string | null;
  /** Original source image URLs explicitly attached to this variant. */
  "images": Array<string>;
}>;

export type ContextSchemaMonitorsScheduleUnit = "minutes" | "hours" | "days";

export type ContextSubmitFeedbackBody = {
  /** The request_id of the API call the feedback is about, from its response body or X-Request-Id header. (format uuid) */
  "request_id"?: string;
  /** Kind of issue. */
  "category": "bug" | "docs_mismatch" | "friction" | "feature_gap" | "quality_degradation" | "other";
  /** What went wrong and what you expected instead. (minLength 1, maxLength 4000) */
  "note": string;
  /** The page the feedback is about, such as one page of a crawl or a docs page. (maxLength 2048, format uri) */
  "url"?: string;
  "tags"?: ContextSchemaRequestTags;
};

export interface ContextSubmitFeedbackInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  headers?: Readonly<Record<string, string>>;
  body: ContextSubmitFeedbackBody;
}

export type ContextSubmitFeedbackResponse = ContextSchemaSubmitFeedbackResponse;

export type ContextListLogsQuery = {
  /** Only include requests at or after this ISO 8601 timestamp. Defaults to 24 hours before `to`. (format date-time) */
  "from"?: string;
  /** Only include requests at or before this ISO 8601 timestamp. Defaults to now. (format date-time) */
  "to"?: string;
  /** Filter by endpoint path, with or without the /v1 prefix. (minLength 1, maxLength 200) */
  "path"?: string;
  /** Filter by the API key that made the request. (minLength 1, maxLength 200) */
  "key_id"?: string;
  /** Filter by exact HTTP status code. (min 100, max 599) */
  "status_code"?: number;
  /** Filter by the `error_code` returned in the response. */
  "error_code"?: string;
  /** Only include requests that returned a 4xx or 5xx status. */
  "errors_only"?: boolean;
  /** Comma-separated request tags. Matches requests carrying any of them. Up to 20 tags, each 1-50 characters. */
  "tags"?: string;
  /** Case-insensitive substring match against the request query and body, e.g. a domain. (minLength 1, maxLength 200) */
  "search"?: string;
  /** Page number, starting at 1. (min 1, max 1000) */
  "page"?: number;
  /** Number of log entries per page. (min 1, max 100) */
  "limit"?: number;
};

export interface ContextListLogsInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  query?: ContextListLogsQuery;
  headers?: Readonly<Record<string, string>>;
}

export type ContextListLogsResponse = ContextSchemaListLogsResponse;

export type ContextGetLogPath = {
  /** The request ID of the logged API call. (format uuid) */
  "request_id": string;
};

export interface ContextGetLogInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  path: ContextGetLogPath;
  headers?: Readonly<Record<string, string>>;
}

export type ContextGetLogResponse = ContextSchemaGetLogResponse;

export type ContextListProfilesQuery = {
  /** Number of profiles per page. (min 1, max 100) */
  "limit"?: number;
  /** The `next_cursor` from the previous page. */
  "cursor"?: string;
};

export interface ContextListProfilesInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  query?: ContextListProfilesQuery;
  headers?: Readonly<Record<string, string>>;
}

export type ContextListProfilesResponse = ContextSchemaListProfilesResponse;

export interface ContextGetUsageInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  headers?: Readonly<Record<string, string>>;
}

export type ContextGetUsageResponse = ContextSchemaOrgUsageResponse;

export type ContextGetUsageHistoryQuery = {
  /** Start of the range, as an ISO 8601 timestamp. Defaults to 24 hours before `to` for `hour`, 30 days for `day`, and 366 days for `month`. (format date-time) */
  "from"?: string;
  /** End of the range, as an ISO 8601 timestamp. Defaults to now. (format date-time) */
  "to"?: string;
  /** Bucket size. `hour` covers up to 7 days; `day` and `month` cover up to 366 days. Buckets start on UTC boundaries. */
  "interval"?: "hour" | "day" | "month";
  /** Split each bucket by endpoint path, API key, or HTTP status code. */
  "group_by"?: "path" | "key_id" | "status_code";
};

export interface ContextGetUsageHistoryInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  query?: ContextGetUsageHistoryQuery;
  headers?: Readonly<Record<string, string>>;
}

export type ContextGetUsageHistoryResponse = ContextSchemaUsageHistoryResponse;

export type ContextListWebhookDeliveriesBody = (({
  /** Delivery source. */
  "type": "batch";
  /** Filter by batch ID. (minLength 1, maxLength 200) */
  "batch_id"?: string;
  /** Filter by delivery status. */
  "status"?: "pending" | "delivering" | "retrying" | "delivered" | "failed" | "cancelled";
  /** Only include events created after this ISO 8601 timestamp. (format date-time) */
  "created_after"?: string;
  /** Number of deliveries to return. (min 1, max 100) */
  "limit"?: number;
  /** The next_cursor from the previous response. */
  "cursor"?: string;
  "tags"?: ContextSchemaRequestTags;
}) | ({
  /** Delivery source. */
  "type": "monitor";
  /** Filter by monitor ID. (minLength 1, maxLength 200) */
  "monitor_id"?: string;
  /** Filter by monitor run ID. (minLength 1, maxLength 200) */
  "run_id"?: string;
  /** Filter by delivery status. */
  "status"?: "pending" | "delivering" | "retrying" | "delivered" | "failed" | "cancelled";
  /** Only include events created after this ISO 8601 timestamp. (format date-time) */
  "created_after"?: string;
  /** Number of deliveries to return. (min 1, max 100) */
  "limit"?: number;
  /** The next_cursor from the previous response. */
  "cursor"?: string;
  "tags"?: ContextSchemaRequestTags;
}));

export interface ContextListWebhookDeliveriesInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  headers?: Readonly<Record<string, string>>;
  body: ContextListWebhookDeliveriesBody;
}

export type ContextListWebhookDeliveriesResponse = ContextSchemaListWebhookDeliveriesResponse;

export type ContextGetWebhookDeliveryPath = {
  /** Delivery ID. */
  "delivery_id": string;
};

export type ContextGetWebhookDeliveryQuery = {
  "tags"?: ContextSchemaRequestTags;
};

export interface ContextGetWebhookDeliveryInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  path: ContextGetWebhookDeliveryPath;
  query?: ContextGetWebhookDeliveryQuery;
  headers?: Readonly<Record<string, string>>;
}

export type ContextGetWebhookDeliveryResponse = ((ContextSchemaWebhookDelivery) & ({
  "key_metadata"?: ContextSchemaKeyMetadata;
  "request_id": ContextSchemaRequestId;
}));

export type ContextListWebhookDeliveryAttemptsPath = {
  /** Delivery ID. */
  "delivery_id": string;
};

export type ContextListWebhookDeliveryAttemptsQuery = {
  /** Number of attempts to return. (min 1, max 100) */
  "limit"?: number;
  /** The next_cursor from the previous response. */
  "cursor"?: string;
  "tags"?: ContextSchemaRequestTags;
};

export interface ContextListWebhookDeliveryAttemptsInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  path: ContextListWebhookDeliveryAttemptsPath;
  query?: ContextListWebhookDeliveryAttemptsQuery;
  headers?: Readonly<Record<string, string>>;
}

export type ContextListWebhookDeliveryAttemptsResponse = ContextSchemaListWebhookAttemptsResponse;

export type ContextRetryWebhookDeliveryPath = {
  /** Delivery ID. */
  "delivery_id": string;
};

export type ContextRetryWebhookDeliveryHeaders = {
  /** Unique key to prevent duplicate retry requests. (maxLength 200) */
  "Idempotency-Key"?: string;
};

export type ContextRetryWebhookDeliveryBody = {
  /** Resend even if the delivery already succeeded. Defaults to false. */
  "force"?: boolean;
  "tags"?: ContextSchemaRequestTags;
};

export interface ContextRetryWebhookDeliveryInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  path: ContextRetryWebhookDeliveryPath;
  headers?: ContextRetryWebhookDeliveryHeaders & Readonly<Record<string, string>>;
  body?: ContextRetryWebhookDeliveryBody;
}

export type ContextRetryWebhookDeliveryResponse = ContextSchemaRetryWebhookDeliveryResponse;

export type ContextScrapeBody = ContextSchemaScrapeRequest;

export interface ContextScrapeInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  headers?: Readonly<Record<string, string>>;
  body: ContextScrapeBody;
}

export type ContextScrapeResponse = ContextSchemaScrapeResponse;

export type ContextSearchNewsBody = {
  /** What to search for: a specific company, or a natural-language query across all news. */
  "searchBy": ((ContextSchemaNewsSearchByNaturalLanguage) | (ContextSchemaNewsSearchByEntity));
  /** Optional result filters. Use at most one of sourceDomain, sourceCountry, articleLanguage, or articleType. A date range may accompany that category; date.from must not exceed date.to. */
  "filterBy"?: {
    /** Publisher domains to include. Up to 3. (maxItems 3) */
    "sourceDomain"?: Array<string>;
    /** Publisher countries to include, as lowercase ISO 3166-1 alpha-2 codes. Up to 3. (maxItems 3) */
    "sourceCountry"?: Array<"ae" | "ar" | "au" | "ca" | "cg" | "ch" | "cl" | "cz" | "de" | "fi" | "fr" | "gb" | "hk" | "il" | "in" | "jp" | "kr" | "mx" | "ng" | "nl" | "pk" | "qa" | "sa" | "se" | "sg" | "us" | "za">;
    /** Article languages to include. Up to 3. (maxItems 3) */
    "articleLanguage"?: Array<"am" | "ar" | "az" | "be" | "bg" | "bn" | "ca" | "ceb" | "cs" | "cy" | "da" | "de" | "el" | "en" | "es" | "et" | "eu" | "fa" | "fi" | "fr" | "gu" | "ha" | "haw" | "he" | "hi" | "hr" | "hu" | "hy" | "id" | "is" | "it" | "ja" | "ka" | "kk" | "kn" | "ko" | "ku" | "ky" | "lo" | "lt" | "lv" | "mk" | "ml" | "mn" | "mr" | "ms" | "ne" | "nl" | "no" | "or" | "pa" | "pl" | "ps" | "pt" | "ro" | "ru" | "sk" | "sl" | "so" | "sq" | "sr" | "sv" | "sw" | "ta" | "te" | "th" | "tl" | "tr" | "uk" | "ur" | "uz" | "vi" | "yo" | "zh">;
    /** Article types to include. Up to 3. (maxItems 3) */
    "articleType"?: Array<"editorial" | "press_release" | "regulatory_filing" | "advisory">;
    /** Published-at window in epoch milliseconds. from must be before or equal to to. */
    "date"?: {
      /** Inclusive start of the published-at window, in epoch milliseconds. */
      "from"?: number;
      /** Inclusive end of the published-at window, in epoch milliseconds. */
      "to"?: number;
    };
  };
  /** Result ordering. Defaults to newest for entity searches. Natural-language searches are always ordered by relevance. */
  "sortBy"?: {
    /** Result ordering. */
    "type": "relevance" | "newest";
  };
  /** Maximum results to return. Defaults to 10. (min 1, max 100) */
  "limit"?: number;
  /** Opaque next_cursor from the previous response, or null for the first page. (maxLength 300) */
  "cursor"?: string | null;
  "tags"?: ContextSchemaRequestTags;
};

export interface ContextSearchNewsInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  headers?: Readonly<Record<string, string>>;
  body: ContextSearchNewsBody;
}

export type ContextSearchNewsResponse = {
  /** Articles matching the search, in the requested order. */
  "data": Array<{
    /** Stable unique identifier for this article. Use it to deduplicate or reference an article across requests. */
    "id": string;
    /** Shared by articles covering the same story on the same day. Use it to group or collapse syndicated copies of one announcement across outlets. */
    "story_id": string;
    /** Link to the article on the publisher site. (format uri) */
    "url": string;
    /** Article headline. */
    "title": string;
    /** Article summary or excerpt. Natural-language search descriptions include matching passages and are capped at 2,000 characters. */
    "description": string | null;
    /** Language the article is written in, as a lowercase ISO 639-1 code such as en. Null when unknown. */
    "language": string | null;
    /** Bylined authors. Empty when no byline is available. */
    "authors": Array<string>;
    /** Lead image for the article, when one is available. */
    "image_url": string | null;
    /** When the article was published, as an ISO 8601 timestamp. Null when the publisher does not state a reliable date. (format date-time) */
    "published_at": string | null;
    /** Kind of coverage. Use it to separate independent reporting (editorial) from company-issued content (press_release, regulatory_filing, advisory). */
    "type": "editorial" | "press_release" | "regulatory_filing" | "advisory";
    /** The publication that published the article. */
    "source": {
      /** Name of the publication, such as Reuters. */
      "name": string;
      /** Website domain of the publication. */
      "domain": string;
      /** True when Context observed this article in the publisher-owned feed. */
      "direct": boolean;
    };
    /** How the article relates to the company you searched for. Null for natural-language searches. */
    "match": {
      /** primary when the article is mainly about the company, secondary when the company is mentioned but is not the main subject. */
      "level": "primary" | "secondary";
      /** How confident the match is, from 0 to 1. Null when a score is unavailable. (min 0, max 1) */
      "confidence": number | null;
    } | null;
  }>;
  /** True when more results are available beyond this page. */
  "has_more": boolean;
  /** Pass as cursor in the next request to fetch the following page. Null when there are no more results. */
  "next_cursor": string | null;
  /** Summary information about this response. */
  "meta": {
    /** Number of articles in this page. (min 0) */
    "count": number;
  };
  "key_metadata"?: ContextSchemaKeyMetadata;
  "request_id": ContextSchemaRequestId;
};

export type ContextAnswersBody = ContextSchemaAnswersRequest;

export interface ContextAnswersInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  headers?: Readonly<Record<string, string>>;
  body: ContextAnswersBody;
}

export type ContextAnswersResponse = ContextSchemaAnswersResponse;

export type ContextParseQuery = {
  /** Optional file extension hint, such as pdf, docx, xlsx, pptx, html, json, csv, md, py, rtf, jpg, png, or txt. */
  "extension"?: "txt" | "text" | "md" | "markdown" | "html" | "htm" | "xhtml" | "xml" | "rss" | "atom" | "csv" | "tsv" | "yaml" | "yml" | "py" | "java" | "js" | "jsx" | "mjs" | "cjs" | "json" | "jsonl" | "ndjson" | "php" | "sh" | "bash" | "zsh" | "fish" | "rb" | "ts" | "tsx" | "rtf" | "srt" | "css" | "scss" | "less" | "styl" | "sass" | "svg" | "pdf" | "docx" | "doc" | "xlsx" | "xlsm" | "xlsb" | "xltx" | "xltm" | "xls" | "pptx" | "pptm" | "ppsx" | "ppsm" | "potx" | "potm" | "ppt" | "pps" | "pot" | "jpg" | "jpeg" | "jpe" | "png" | "gif" | "bmp" | "tiff" | "tif" | "webp" | "ppm" | "pbm" | "pgm" | "pnm";
  /** Preserve hyperlinks in Markdown output */
  "includeLinks"?: boolean;
  /** Include image references in Markdown output */
  "includeImages"?: boolean;
  /** Shorten base64-encoded image data in the Markdown output */
  "shortenBase64Images"?: boolean;
  /** Extract only the main content from HTML-like inputs */
  "useMainContentOnly"?: boolean;
  /** Read text from images and scanned PDF pages. PDF page ranges still apply. */
  "ocr"?: boolean;
  /** PDF page-range options as a JSON object, e.g. {"start": 2, "end": 5}. */
  "pdf"?: {
    /** First 1-based PDF page to parse. (min 1) */
    "start"?: number;
    /** Last PDF page to parse (1-based, inclusive). Defaults to the final page. Must be >= start. (min 1) */
    "end"?: number;
  };
  /** Optional client identifier used for usage attribution. (minLength 1, maxLength 100) */
  "client"?: string;
  /** `enabled` turns on zero data retention. Returns 403 `ZDR_NOT_ENABLED` unless your organization has ZDR. */
  "zdr"?: "enabled" | "disabled";
  "tags"?: ContextSchemaRequestTags;
};

export interface ContextParseInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  query?: ContextParseQuery;
  headers?: Readonly<Record<string, string>>;
  rawBody: BodyInit;
}

export type ContextParseResponse = {
  /** Indicates success */
  "success": true;
  /** Input bytes converted to GitHub Flavored Markdown */
  "markdown": string;
  /** Detected content type used for parsing */
  "type": "html" | "xml" | "json" | "jsonl" | "text" | "csv" | "tsv" | "markdown" | "yaml" | "python" | "java" | "javascript" | "php" | "shell" | "ruby" | "typescript" | "rtf" | "srt" | "css" | "scss" | "less" | "stylus" | "sass" | "svg" | "pdf" | "docx" | "doc" | "xlsx" | "xls" | "pptx" | "ppt" | "jpg" | "png" | "gif" | "bmp" | "tiff" | "webp" | "ppm" | "pbm" | "pgm" | "pnm";
  "key_metadata"?: ContextSchemaKeyMetadata;
  "request_id": ContextSchemaRequestId;
};

export type ContextMapQuery = {
  /** Domain to map, e.g. `stripe.com`. (minLength 3) */
  "domain": string;
  /** Include URLs on subdomains. */
  "includeSubdomains"?: boolean;
  /** Maximum number of URLs to return. (min 1, max 100000) */
  "maxLinks"?: number;
  /** Fetch this sitemap instead of discovering sitemaps. Must belong to the domain or a subdomain. (format uri) */
  "sitemapUrl"?: string;
  /** Regex pattern. Only URLs matching this pattern are returned and counted against maxLinks. (maxLength 256) */
  "urlRegex"?: string;
  /** Regex pattern. URLs matching this pattern are not returned, even when they match urlRegex. (maxLength 256) */
  "excludeUrlRegex"?: string;
  /** Filter URLs by a topic or phrase, most relevant first. (minLength 2, maxLength 200) */
  "search"?: string;
  /** HTTP headers for the target origin. Non-empty headers bypass caching. */
  "headers"?: {
    [key: string]: string;
  };
  "timeoutOpts"?: ContextSchemaLenientPartialTimeout;
  /** `enabled` turns on zero data retention. Returns 403 `ZDR_NOT_ENABLED` unless your organization has ZDR. */
  "zdr"?: "enabled" | "disabled";
  "tags"?: ContextSchemaRequestTags;
};

export interface ContextMapInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  query: ContextMapQuery;
  headers?: Readonly<Record<string, string>>;
}

export type ContextMapResponse = {
  "success": true;
  "domain": string;
  "urls": Array<{
    "url": string;
    "title"?: string;
    "description"?: string;
    "keywords"?: Array<string>;
    "language"?: string;
  }>;
  "partial"?: boolean;
  "key_metadata"?: ContextSchemaKeyMetadata;
  "request_id": ContextSchemaRequestId;
};

export type ContextCrawlBody = {
  /** Start URL, including `http://` or `https://`. (minLength 1, format uri) */
  "url": string;
  /** Maximum pages to crawl. (min 1, max 500) */
  "maxPages"?: number;
  /** Maximum link depth from the starting URL (0 = only the starting page) (min 0) */
  "maxDepth"?: number;
  /** Regex pattern. Only URLs matching this pattern will be followed and scraped. An automatic prefix scope in the form ^<starting URL> follows a redirect of the starting page. (maxLength 256) */
  "urlRegex"?: string;
  /** Regex pattern. URLs matching this pattern are never followed or scraped, even when they match urlRegex. The starting URL is always scraped. (maxLength 256) */
  "excludeUrlRegex"?: string;
  /** Preserve hyperlinks in the Markdown output (`html-conversion` only). */
  "includeLinks"?: boolean;
  /** Include image references in the Markdown output (`html-conversion` only). */
  "includeImages"?: boolean;
  /** Truncate base64-encoded image data in the Markdown output (`html-conversion` only). */
  "shortenBase64Images"?: boolean;
  /** Extract only the main content, stripping headers, footers, sidebars, and navigation */
  "useMainContentOnly"?: boolean;
  /** Markdown sources in order of preference: `html-conversion` converts the page HTML, `markdown-direct` uses Markdown the site publishes. */
  "sourcePreference"?: Array<"html-conversion" | "markdown-direct">;
  /** When true, follow links on subdomains of the starting URL's domain (e.g. docs.example.com when starting from example.com). www and apex are always treated as equivalent. */
  "followSubdomains"?: boolean;
  /** PDF handling. `start`/`end` limit parsing to an inclusive, 1-based page range. */
  "pdf"?: {
    /** When true, PDF pages are fetched and parsed. When false, PDF pages are skipped entirely (not included in results and not counted as failures). */
    "shouldParse"?: boolean;
    /** First 1-based PDF page to parse. (min 1) */
    "start"?: number;
    /** Last PDF page to parse (1-based, inclusive). Defaults to the final page. Must be >= start. (min 1) */
    "end"?: number;
    /** Read scanned PDF pages with OCR; preserve pages that already have text. */
    "ocr"?: boolean;
  };
  /** When true, the contents of iframes are rendered to Markdown for each crawled page. */
  "includeFrames"?: boolean;
  /** Keep matching HTML subtrees before converting each page to Markdown. (maxItems 50) */
  "includeSelectors"?: Array<string> | null;
  /** Remove matching elements after inclusions. Exclusions take precedence. (maxItems 50) */
  "excludeSelectors"?: Array<string> | null;
  /** Maximum cache age in milliseconds. Defaults to 1 day; `0` fetches fresh. (min 0, max 2592000000) */
  "maxAgeMs"?: number | null;
  /** Browser wait time in milliseconds after initial page load for each crawled page. Defaults to 3500 (3.5 seconds). Min: 0. Max: 30000 (30 seconds). (min 0, max 30000) */
  "waitForMs"?: number | null;
  /** Wait briefly for CSS animations and transitions to settle before reading each page. */
  "settleAnimations"?: boolean;
  /** Soft crawl deadline in milliseconds. Returns pages collected before the next deadline check. (min 10000, max 110000) */
  "stopAfterMs"?: number;
  "timeoutOpts"?: ContextSchemaPartialTimeout;
  "country"?: ContextSchemaBrowserCountryCode;
  /** `enabled` turns on zero data retention. Returns 403 `ZDR_NOT_ENABLED` unless your organization has ZDR. */
  "zdr"?: "enabled" | "disabled";
  "tags"?: ContextSchemaRequestTags;
};

export interface ContextCrawlInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  headers?: Readonly<Record<string, string>>;
  body: ContextCrawlBody;
}

export type ContextCrawlResponse = {
  /** True when timeoutOpts.behavior=return-partial returned the usable results collected before the deadline. Partial collections are not cached as complete results. */
  "partial"?: boolean;
  "results": Array<{
    /** Extracted page content as Markdown (empty string on failure) */
    "markdown": string;
    "metadata": ((ContextSchemaPageMetadata) & ({
      /** The crawl URL fetched for this page. */
      "url": string;
      /** Best page title extracted from the page (empty string if unavailable). */
      "title": string;
      /** Depth relative to the start URL. 0 = start URL, 1 = one link away. */
      "crawlDepth": number;
      /** HTTP status code of the response */
      "statusCode": number;
      /** true if the page was fetched and parsed successfully */
      "success": boolean;
    }));
  }>;
  "metadata": {
    /** Total number of URLs crawled */
    "numUrls": number;
    /** Maximum crawl depth reached during the crawl */
    "maxCrawlDepth": number;
    /** Number of pages successfully crawled */
    "numSucceeded": number;
    /** Number of pages that failed to crawl */
    "numFailed": number;
    /** Number of URLs skipped (PDFs when pdf.shouldParse=false, URLs not matching urlRegex, or URLs matching excludeUrlRegex) */
    "numSkipped": number;
  };
  "cache_metadata": ContextSchemaCacheMetadata;
  "key_metadata"?: ContextSchemaKeyMetadata;
  "request_id": ContextSchemaRequestId;
};

export type ContextExtractBody = {
  /** The starting website URL to crawl and extract from. Must include http:// or https://. (minLength 1, format uri) */
  "url": string;
  /** JSON Schema (not an example object) for the returned object. Image fields include relevant page image references. */
  "schema": {
    [key: string]: unknown;
  };
  /** Optional extraction guidance, such as which facts to prioritize or how to interpret fields in the schema. (maxLength 2000) */
  "instructions"?: string;
  /** Require facts stated on the page. Unsupported fields become null or empty. */
  "factCheck"?: boolean;
  /** When true, follow links on subdomains of the starting URL's domain. */
  "followSubdomains"?: boolean;
  /** Maximum number of pages to analyze for extraction. Hard cap: 50. Defaults to 5. (min 1, max 50) */
  "maxPages"?: number;
  /** Optional maximum link depth from the starting URL (0 = only the starting page). If omitted, there is no crawl depth limit. (min 0) */
  "maxDepth"?: number;
  /** PDF handling. `start`/`end` limit parsing to an inclusive, 1-based page range. */
  "pdf"?: {
    /** When true, PDF pages are fetched and parsed. When false, PDF pages are skipped. */
    "shouldParse"?: boolean;
    /** First 1-based PDF page to parse. (min 1) */
    "start"?: number;
    /** Last PDF page to parse (1-based, inclusive). Defaults to the final page. Must be >= start. (min 1) */
    "end"?: number;
  };
  /** When true, iframe contents are included in Markdown before extraction. */
  "includeFrames"?: boolean;
  /** Return cached scrape results if a prior scrape for the same parameters is younger than this many milliseconds. Defaults to 7 days (604800000 ms). (min 0, max 2592000000) */
  "maxAgeMs"?: number | null;
  /** Optional browser wait time in milliseconds after initial page load for each crawled page. (min 0, max 30000) */
  "waitForMs"?: number | null;
  /** Wait briefly for CSS animations and transitions to settle before reading each page. */
  "settleAnimations"?: boolean;
  /** Browser steps before page discovery. Requires a paid plan; defaults the crawl budget to 110000 ms. (maxItems 5) */
  "actions"?: Array<ContextSchemaWebScrapeAction> | null;
  /** Soft time budget for the crawl in milliseconds. Min: 10000 (10s). Max: 110000 (110s). Defaults to 80000 (80s), or 110000 (110s) when browser actions are provided. (min 10000, max 110000) */
  "stopAfterMs"?: number;
  "timeoutOpts"?: ContextSchemaPartialTimeout;
  /** `enabled` turns on zero data retention. Returns 403 `ZDR_NOT_ENABLED` unless your organization has ZDR. */
  "zdr"?: "enabled" | "disabled";
  "tags"?: ContextSchemaRequestTags;
};

export interface ContextExtractInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  headers?: Readonly<Record<string, string>>;
  body: ContextExtractBody;
}

export type ContextExtractResponse = {
  /** True when the timeout ended processing and this response contains only usable results completed so far. Unfinished results are omitted. */
  "partial"?: boolean;
  /** Always `ok` on success. */
  "status": string;
  /** The starting URL that was analyzed */
  "url": string;
  /** List of URLs whose Markdown was used for extraction */
  "urls_analyzed": Array<string>;
  /** Extracted data matching the request schema */
  "data": {
    [key: string]: unknown;
  };
  "metadata": {
    "numUrls": number;
    "maxCrawlDepth": number;
    "numSucceeded": number;
    "numFailed": number;
    "numSkipped": number;
    /** Number of crawled pages excluded because they were anti-bot challenges, error pages, or parked-domain placeholders. */
    "numBlocked": number;
    /** One verified outcome per requested browser action, in request order. */
    "actionsApplied"?: Array<{
      "instruction": string;
      /** Applied means the requested page state was visibly verified. Failed means it was not verified. Skipped means it was not attempted. */
      "status": "applied" | "failed" | "skipped";
      "method"?: string;
      "targetDescription"?: string;
      /** Visible page evidence used to verify an applied action. */
      "completionEvidence"?: string;
      "error"?: string;
      "durationMs"?: number;
    }>;
  };
  "cache_metadata": ContextSchemaCacheMetadata;
  "key_metadata"?: ContextSchemaKeyMetadata;
  "request_id": ContextSchemaRequestId;
};

export type ContextSearchBody = {
  /** Search query. Accepts natural language as well as Google-style search operators such as `site:`, `-site:`, `inurl:`, `intitle:`, quoted phrases, and `OR`. (minLength 1, maxLength 500) */
  "query": string;
  /** Number of results to request and return (1–100). Defaults to 10. (min 1, max 100) */
  "numResults"?: number;
  /** Allowlist — only return results from these domains. Up to 100 domains. Example: ["arxiv.org", "github.com"]. (maxItems 100) */
  "includeDomains"?: Array<string>;
  /** Blocklist — drop results from these domains. Up to 100 domains. Example: ["pinterest.com", "reddit.com"]. (maxItems 100) */
  "excludeDomains"?: Array<string>;
  /** Restrict results to content published within this window. */
  "freshness"?: "last_24_hours" | "last_week" | "last_month" | "last_year";
  /** Two-letter ISO 3166-1 alpha-2 country code to localize results to a specific country (maps to Google's `gl` parameter). Example: "us", "gb", "de". */
  "country"?: "af" | "al" | "dz" | "as" | "ad" | "ao" | "ai" | "aq" | "ag" | "ar" | "am" | "aw" | "au" | "at" | "az" | "bs" | "bh" | "bd" | "bb" | "by" | "be" | "bz" | "bj" | "bm" | "bt" | "bo" | "ba" | "bw" | "bv" | "br" | "io" | "bn" | "bg" | "bf" | "bi" | "kh" | "cm" | "ca" | "cv" | "ky" | "cf" | "td" | "cl" | "cn" | "cx" | "cc" | "co" | "km" | "cg" | "cd" | "ck" | "cr" | "ci" | "hr" | "cu" | "cy" | "cz" | "dk" | "dj" | "dm" | "do" | "ec" | "eg" | "sv" | "gq" | "er" | "ee" | "et" | "fk" | "fo" | "fj" | "fi" | "fr" | "gf" | "pf" | "tf" | "ga" | "gm" | "ge" | "de" | "gh" | "gi" | "gr" | "gl" | "gd" | "gp" | "gu" | "gt" | "gn" | "gw" | "gy" | "ht" | "hm" | "va" | "hn" | "hk" | "hu" | "is" | "in" | "id" | "ir" | "iq" | "ie" | "il" | "it" | "jm" | "jp" | "jo" | "kz" | "ke" | "ki" | "kp" | "kr" | "kw" | "kg" | "la" | "lv" | "lb" | "ls" | "lr" | "ly" | "li" | "lt" | "lu" | "mo" | "mk" | "mg" | "mw" | "my" | "mv" | "ml" | "mt" | "mh" | "mq" | "mr" | "mu" | "yt" | "mx" | "fm" | "md" | "mc" | "mn" | "ms" | "ma" | "mz" | "mm" | "na" | "nr" | "np" | "nl" | "an" | "nc" | "nz" | "ni" | "ne" | "ng" | "nu" | "nf" | "mp" | "no" | "om" | "pk" | "pw" | "ps" | "pa" | "pg" | "py" | "pe" | "ph" | "pn" | "pl" | "pt" | "pr" | "qa" | "re" | "ro" | "ru" | "rw" | "sh" | "kn" | "lc" | "pm" | "vc" | "ws" | "sm" | "st" | "sa" | "sn" | "rs" | "sc" | "sl" | "sg" | "sk" | "si" | "sb" | "so" | "za" | "gs" | "es" | "lk" | "sd" | "sr" | "sj" | "sz" | "se" | "ch" | "sy" | "tw" | "tj" | "tz" | "th" | "tl" | "tg" | "tk" | "to" | "tt" | "tn" | "tr" | "tm" | "tc" | "tv" | "ug" | "ua" | "ae" | "gb" | "us" | "um" | "uy" | "uz" | "vu" | "ve" | "vn" | "vg" | "vi" | "wf" | "eh" | "ye" | "zm" | "zw";
  /** Languages to return results in, as BCP 47 language codes such as `en` or `de`, or "all" for any language. Defaults to "all". Example: ["en", "de"]. */
  "languages"?: (("all") | (Array<"am" | "ar" | "az" | "be" | "bg" | "bn" | "ca" | "ceb" | "cs" | "cy" | "da" | "de" | "el" | "en" | "es" | "et" | "eu" | "fa" | "fi" | "fr" | "gu" | "ha" | "haw" | "he" | "hi" | "hr" | "hu" | "hy" | "id" | "is" | "it" | "ja" | "ka" | "kk" | "kn" | "ko" | "ku" | "ky" | "lo" | "lt" | "lv" | "mk" | "ml" | "mn" | "mr" | "ms" | "ne" | "nl" | "no" | "or" | "pa" | "pl" | "ps" | "pt" | "ro" | "ru" | "sk" | "sl" | "so" | "sq" | "sr" | "sv" | "sw" | "ta" | "te" | "th" | "tl" | "tr" | "uk" | "ur" | "uz" | "vi" | "yo" | "zh">));
  /** Currently has no effect. */
  "queryFanout"?: boolean;
  /** Inline Markdown scraping for each result. Set `enabled: true` to activate. */
  "markdownOptions"?: {
    /** Scrape each result to Markdown. Adds 1 credit per result with Markdown. */
    "enabled"?: boolean;
    /** Keep hyperlinks in the Markdown. */
    "includeLinks"?: boolean;
    /** Emit image references in the Markdown. */
    "includeImages"?: boolean;
    /** Truncate inline base64 image payloads to keep responses small. */
    "shortenBase64Images"?: boolean;
    /** Strip nav, header, footer, and sidebar — keep only the primary article content. */
    "useMainContentOnly"?: boolean;
    /** PDF handling. `start`/`end` limit parsing to an inclusive, 1-based page range. */
    "pdf"?: {
      /** Parse PDF URLs. When false, PDF results are skipped with WEBSITE_ACCESS_ERROR. */
      "shouldParse"?: boolean;
      /** First 1-based PDF page to parse. (min 1) */
      "start"?: number;
      /** Last PDF page to parse (1-based, inclusive). Defaults to the final page. Must be >= start. (min 1) */
      "end"?: number;
    };
    /** Render iframe contents into the Markdown. */
    "includeFrames"?: boolean;
    /** Maximum cache age in milliseconds for result page content. Defaults to 180 days (15552000000 ms) when Markdown is requested, or 365 days (31536000000 ms) when only highlights are requested. Explicit values override either default. Maximum: 365 days. Set to 0 to force a fresh scra (min 0, max 31536000000) */
    "maxAgeMs"?: number | null;
    /** Extra wait after page load before rendering, in ms (0–30000). Useful for JS-heavy pages. (min 0, max 30000) */
    "waitForMs"?: number | null;
    "timeoutOpts"?: ContextSchemaScrapeTimeout;
  } | null;
  /** Passages from each result page that are relevant to the query. Pages are read with the `markdownOptions` settings. */
  "highlightsOptions"?: {
    /** Return relevant passages for each result. Adds 1 credit per 10 results. */
    "enabled"?: boolean;
    /** Maximum combined length of passages per result. (min 100, max 20000) */
    "maxCharacters"?: number;
  } | null;
  /** Maximum length of each result's `description`, in characters. (min 0) */
  "descriptionMaxCharacters"?: number | null;
  "timeoutOpts"?: ContextSchemaPartialTimeout;
  /** `enabled` turns on zero data retention. Returns 403 `ZDR_NOT_ENABLED` unless your organization has ZDR. */
  "zdr"?: "enabled" | "disabled";
  "tags"?: ContextSchemaRequestTags;
};

export interface ContextSearchInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  headers?: Readonly<Record<string, string>>;
  body: ContextSearchBody;
}

export type ContextSearchResponse = {
  /** True when timeoutOpts.behavior=return-partial returned the usable results collected before the deadline. Partial collections are not cached as complete results. */
  "partial"?: boolean;
  "results": Array<{
    /** Canonical result URL. */
    "url": string;
    /** Page title. */
    "title": string;
    /** Snippet excerpt from the page. Empty string when the search provider does not supply a snippet. */
    "description": string;
    /** Relevance to the original query. */
    "relevance": "high" | "medium" | "low";
    /** Markdown scrape status and content for this result. */
    "markdown": {
      /** `loaded`, or `still-loading` when capture ended before the page finished loading. */
      "finalDOMState"?: "loaded" | "still-loading";
      /** GFM Markdown of the page. Null unless markdownOptions.enabled is true and scraping succeeded. */
      "markdown": string | null;
      /** Per-result scrape outcome. Inspect this before reading `markdown`. */
      "code": "SUCCESS" | "NOT_REQUESTED" | "TIMEOUT" | "CONTENT_TOO_LARGE" | "WEBSITE_ACCESS_ERROR" | "WEBSITE_BLOCKED" | "ERROR";
    };
    /** Highlights status and passages for this result. */
    "highlights": {
      /** Passages relevant to the query, in page order. Null unless highlightsOptions.enabled is true and the page was read. */
      "highlights": Array<string> | null;
      /** Per-result highlights outcome. Inspect this before reading `highlights`. */
      "code": "SUCCESS" | "NOT_REQUESTED" | "TIMEOUT" | "CONTENT_TOO_LARGE" | "WEBSITE_ACCESS_ERROR" | "WEBSITE_BLOCKED" | "ERROR";
    };
  }>;
  /** Echo of the original query (useful when fanout was enabled). */
  "query": string;
  "cache_metadata": ContextSchemaCacheMetadata;
  "key_metadata"?: ContextSchemaKeyMetadata;
  "request_id": ContextSchemaRequestId;
};

export type ContextEnrichPersonBody = ContextSchemaPersonEnrichmentRequest;

export interface ContextEnrichPersonInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  headers?: Readonly<Record<string, string>>;
  body: ContextEnrichPersonBody;
}

export type ContextEnrichPersonResponse = ContextSchemaPersonEnrichmentResponse;

export type ContextRetrieveBrandBody = ContextSchemaBrandRetrieveRequest;

export interface ContextRetrieveBrandInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  headers?: Readonly<Record<string, string>>;
  body: ContextRetrieveBrandBody;
}

export type ContextRetrieveBrandResponse = ContextSchemaBrandResponse;

export type ContextSearchBrandsQuery = {
  /** Search term, matched against the fields selected by queryBy (e.g. 'stripe', 'stripe.com', 'stri'). (minLength 1, maxLength 100) */
  "query": string;
  /** Only return brands in this country, as an uppercase ISO 3166-1 alpha-2 code such as US or GB. */
  "country"?: "AD" | "AE" | "AF" | "AG" | "AI" | "AL" | "AM" | "AO" | "AQ" | "AR" | "AS" | "AT" | "AU" | "AW" | "AX" | "AZ" | "BA" | "BB" | "BD" | "BE" | "BF" | "BG" | "BH" | "BI" | "BJ" | "BL" | "BM" | "BN" | "BO" | "BQ" | "BR" | "BS" | "BT" | "BV" | "BW" | "BY" | "BZ" | "CA" | "CC" | "CD" | "CF" | "CG" | "CH" | "CI" | "CK" | "CL" | "CM" | "CN" | "CO" | "CR" | "CU" | "CV" | "CW" | "CX" | "CY" | "CZ" | "DE" | "DJ" | "DK" | "DM" | "DO" | "DZ" | "EC" | "EE" | "EG" | "EH" | "ER" | "ES" | "ET" | "FI" | "FJ" | "FK" | "FM" | "FO" | "FR" | "GA" | "GB" | "GD" | "GE" | "GF" | "GG" | "GH" | "GI" | "GL" | "GM" | "GN" | "GP" | "GQ" | "GR" | "GS" | "GT" | "GU" | "GW" | "GY" | "HK" | "HM" | "HN" | "HR" | "HT" | "HU" | "ID" | "IE" | "IL" | "IM" | "IN" | "IO" | "IQ" | "IR" | "IS" | "IT" | "JE" | "JM" | "JO" | "JP" | "KE" | "KG" | "KH" | "KI" | "KM" | "KN" | "KP" | "KR" | "KW" | "KY" | "KZ" | "LA" | "LB" | "LC" | "LI" | "LK" | "LR" | "LS" | "LT" | "LU" | "LV" | "LY" | "MA" | "MC" | "MD" | "ME" | "MF" | "MG" | "MH" | "MK" | "ML" | "MM" | "MN" | "MO" | "MP" | "MQ" | "MR" | "MS" | "MT" | "MU" | "MV" | "MW" | "MX" | "MY" | "MZ" | "NA" | "NC" | "NE" | "NF" | "NG" | "NI" | "NL" | "NO" | "NP" | "NR" | "NU" | "NZ" | "OM" | "PA" | "PE" | "PF" | "PG" | "PH" | "PK" | "PL" | "PM" | "PN" | "PR" | "PS" | "PT" | "PW" | "PY" | "QA" | "RE" | "RO" | "RS" | "RU" | "RW" | "SA" | "SB" | "SC" | "SD" | "SE" | "SG" | "SH" | "SI" | "SJ" | "SK" | "SL" | "SM" | "SN" | "SO" | "SR" | "SS" | "ST" | "SV" | "SX" | "SY" | "SZ" | "TC" | "TD" | "TF" | "TG" | "TH" | "TJ" | "TK" | "TL" | "TM" | "TN" | "TO" | "TR" | "TT" | "TV" | "TW" | "TZ" | "UA" | "UG" | "UM" | "US" | "UY" | "UZ" | "VA" | "VC" | "VE" | "VG" | "VI" | "VN" | "VU" | "WF" | "WS" | "YE" | "YT" | "ZA" | "ZM" | "ZW";
  /** Only return brands with this primary language, such as english or french. */
  "language"?: "afrikaans" | "albanian" | "amharic" | "arabic" | "armenian" | "assamese" | "aymara" | "azeri" | "basque" | "belarusian" | "bengali" | "bosnian" | "bulgarian" | "burmese" | "cantonese" | "catalan" | "cebuano" | "chinese" | "corsican" | "croatian" | "czech" | "danish" | "dutch" | "english" | "esperanto" | "estonian" | "farsi" | "fijian" | "finnish" | "french" | "galician" | "georgian" | "german" | "greek" | "guarani" | "gujarati" | "haitian-creole" | "hausa" | "hawaiian" | "hebrew" | "hindi" | "hmong" | "hungarian" | "icelandic" | "igbo" | "indonesian" | "irish" | "italian" | "japanese" | "javanese" | "kannada" | "kazakh" | "khmer" | "kinyarwanda" | "korean" | "kurdish" | "kyrgyz" | "lao" | "latin" | "latvian" | "lingala" | "lithuanian" | "luxembourgish" | "macedonian" | "malagasy" | "malay" | "malayalam" | "maltese" | "maori" | "marathi" | "mongolian" | "nepali" | "norwegian" | "odia" | "oromo" | "pashto" | "pidgin" | "polish" | "portuguese" | "punjabi" | "quechua" | "romanian" | "russian" | "samoan" | "scottish-gaelic" | "serbian" | "sesotho" | "shona" | "sindhi" | "sinhala" | "slovak" | "slovene" | "somali" | "spanish" | "sundanese" | "swahili" | "swedish" | "tagalog" | "tajik" | "tamil" | "tatar" | "telugu" | "thai" | "tibetan" | "tigrinya" | "tongan" | "tswana" | "turkish" | "turkmen" | "ukrainian" | "urdu" | "uyghur" | "uzbek" | "vietnamese" | "welsh" | "wolof" | "xhosa" | "yiddish" | "yoruba" | "zulu";
  /** Whether the search term matches by prefix, so partial words match as they are typed (e.g. 'stri' matches Stripe). Set to false to match whole words only. */
  "autocomplete"?: boolean;
  /** Fields to match the search term against, as a comma-separated list or repeated parameter: 'name', 'domain', or both. Defaults to both. */
  "queryBy"?: Array<"name" | "domain">;
  /** Maximum number of typos tolerated when matching, from 0 to 2. Defaults to 0 (no typo tolerance). (min 0, max 2) */
  "typoTolerance"?: number;
  "tags"?: ContextSchemaRequestTags;
};

export interface ContextSearchBrandsInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  query: ContextSearchBrandsQuery;
  headers?: Readonly<Record<string, string>>;
}

export type ContextSearchBrandsResponse = {
  /** Up to 10 matching brands, name matches first, then domain matches, most popular first within each group. Empty when nothing matches. (maxItems 10) */
  "results": Array<{
    /** The brand's domain. */
    "domain": string;
    /** The brand's name. Empty string when unknown. */
    "name": string;
    /** The brand's description, when available. */
    "description"?: string;
    /** The brand's country, when available, as an uppercase ISO 3166-1 alpha-2 code. */
    "country"?: "AD" | "AE" | "AF" | "AG" | "AI" | "AL" | "AM" | "AO" | "AQ" | "AR" | "AS" | "AT" | "AU" | "AW" | "AX" | "AZ" | "BA" | "BB" | "BD" | "BE" | "BF" | "BG" | "BH" | "BI" | "BJ" | "BL" | "BM" | "BN" | "BO" | "BQ" | "BR" | "BS" | "BT" | "BV" | "BW" | "BY" | "BZ" | "CA" | "CC" | "CD" | "CF" | "CG" | "CH" | "CI" | "CK" | "CL" | "CM" | "CN" | "CO" | "CR" | "CU" | "CV" | "CW" | "CX" | "CY" | "CZ" | "DE" | "DJ" | "DK" | "DM" | "DO" | "DZ" | "EC" | "EE" | "EG" | "EH" | "ER" | "ES" | "ET" | "FI" | "FJ" | "FK" | "FM" | "FO" | "FR" | "GA" | "GB" | "GD" | "GE" | "GF" | "GG" | "GH" | "GI" | "GL" | "GM" | "GN" | "GP" | "GQ" | "GR" | "GS" | "GT" | "GU" | "GW" | "GY" | "HK" | "HM" | "HN" | "HR" | "HT" | "HU" | "ID" | "IE" | "IL" | "IM" | "IN" | "IO" | "IQ" | "IR" | "IS" | "IT" | "JE" | "JM" | "JO" | "JP" | "KE" | "KG" | "KH" | "KI" | "KM" | "KN" | "KP" | "KR" | "KW" | "KY" | "KZ" | "LA" | "LB" | "LC" | "LI" | "LK" | "LR" | "LS" | "LT" | "LU" | "LV" | "LY" | "MA" | "MC" | "MD" | "ME" | "MF" | "MG" | "MH" | "MK" | "ML" | "MM" | "MN" | "MO" | "MP" | "MQ" | "MR" | "MS" | "MT" | "MU" | "MV" | "MW" | "MX" | "MY" | "MZ" | "NA" | "NC" | "NE" | "NF" | "NG" | "NI" | "NL" | "NO" | "NP" | "NR" | "NU" | "NZ" | "OM" | "PA" | "PE" | "PF" | "PG" | "PH" | "PK" | "PL" | "PM" | "PN" | "PR" | "PS" | "PT" | "PW" | "PY" | "QA" | "RE" | "RO" | "RS" | "RU" | "RW" | "SA" | "SB" | "SC" | "SD" | "SE" | "SG" | "SH" | "SI" | "SJ" | "SK" | "SL" | "SM" | "SN" | "SO" | "SR" | "SS" | "ST" | "SV" | "SX" | "SY" | "SZ" | "TC" | "TD" | "TF" | "TG" | "TH" | "TJ" | "TK" | "TL" | "TM" | "TN" | "TO" | "TR" | "TT" | "TV" | "TW" | "TZ" | "UA" | "UG" | "UM" | "US" | "UY" | "UZ" | "VA" | "VC" | "VE" | "VG" | "VI" | "VN" | "VU" | "WF" | "WS" | "YE" | "YT" | "ZA" | "ZM" | "ZW";
    /** The brand's primary language, when available. */
    "language"?: "afrikaans" | "albanian" | "amharic" | "arabic" | "armenian" | "assamese" | "aymara" | "azeri" | "basque" | "belarusian" | "bengali" | "bosnian" | "bulgarian" | "burmese" | "cantonese" | "catalan" | "cebuano" | "chinese" | "corsican" | "croatian" | "czech" | "danish" | "dutch" | "english" | "esperanto" | "estonian" | "farsi" | "fijian" | "finnish" | "french" | "galician" | "georgian" | "german" | "greek" | "guarani" | "gujarati" | "haitian-creole" | "hausa" | "hawaiian" | "hebrew" | "hindi" | "hmong" | "hungarian" | "icelandic" | "igbo" | "indonesian" | "irish" | "italian" | "japanese" | "javanese" | "kannada" | "kazakh" | "khmer" | "kinyarwanda" | "korean" | "kurdish" | "kyrgyz" | "lao" | "latin" | "latvian" | "lingala" | "lithuanian" | "luxembourgish" | "macedonian" | "malagasy" | "malay" | "malayalam" | "maltese" | "maori" | "marathi" | "mongolian" | "nepali" | "norwegian" | "odia" | "oromo" | "pashto" | "pidgin" | "polish" | "portuguese" | "punjabi" | "quechua" | "romanian" | "russian" | "samoan" | "scottish-gaelic" | "serbian" | "sesotho" | "shona" | "sindhi" | "sinhala" | "slovak" | "slovene" | "somali" | "spanish" | "sundanese" | "swahili" | "swedish" | "tagalog" | "tajik" | "tamil" | "tatar" | "telugu" | "thai" | "tibetan" | "tigrinya" | "tongan" | "tswana" | "turkish" | "turkmen" | "ukrainian" | "urdu" | "uyghur" | "uzbek" | "vietnamese" | "welsh" | "wolof" | "xhosa" | "yiddish" | "yoruba" | "zulu";
    /** Logo link URL that serves the brand's logo, generated per request for the calling organization. */
    "logo": string;
  }>;
  "key_metadata"?: ContextSchemaKeyMetadata;
  "request_id": ContextSchemaRequestId;
};

export type ContextStyleguideQuery = {
  /** Domain name to extract styleguide from (e.g., 'example.com', 'google.com'). The domain will be automatically normalized and validated. You must provide either 'domain' or 'directUrl', but not both. (minLength 3) */
  "domain"?: string;
  /** Exact URL to inspect. Provide either `domain` or `directUrl`, not both. (format uri) */
  "directUrl"?: string;
  /** Maximum age of cached brand data in ms. Defaults to 3 months; clamped to 0–1 year. `0` refreshes. */
  "maxAgeMs"?: number | null;
  "timeoutOpts"?: ContextSchemaScrapeTimeout;
  /** Optional browser color scheme to emulate for websites that respond to prefers-color-scheme. This value is part of the styleguide cache key. */
  "colorScheme"?: "light" | "dark";
  /** `enabled` turns on zero data retention. Returns 403 `ZDR_NOT_ENABLED` unless your organization has ZDR. */
  "zdr"?: "enabled" | "disabled";
  "tags"?: ContextSchemaRequestTags;
};

export interface ContextStyleguideInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  query?: ContextStyleguideQuery;
  headers?: Readonly<Record<string, string>>;
}

export type ContextStyleguideResponse = {
  /** `loaded`, or `still-loading` when capture ended before the page finished loading. */
  "finalDOMState"?: "loaded" | "still-loading";
  /** Always `ok` on success. */
  "status"?: string;
  /** The normalized domain that was processed */
  "domain"?: string;
  /** Comprehensive styleguide data extracted from the website */
  "styleguide"?: {
    /** The primary color mode of the website design */
    "mode": "light" | "dark";
    /** Primary colors used on the website */
    "colors": {
      /** Accent color (hex format) */
      "accent": string;
      /** Background color (hex format) */
      "background": string;
      /** Text color (hex format) */
      "text": string;
    };
    /** Typography styles used on the website */
    "typography": {
      /** Heading styles */
      "headings": {
        "h1"?: {
          /** First font in the stack. */
          "fontFamily": string;
          /** Full ordered font list from resolved computed font-family */
          "fontFallbacks": Array<string>;
          "fontSize": string;
          "fontWeight": number;
          "lineHeight": string;
          "letterSpacing": string;
        };
        "h2"?: {
          /** First font in the stack. */
          "fontFamily": string;
          /** Full ordered font list from resolved computed font-family */
          "fontFallbacks": Array<string>;
          "fontSize": string;
          "fontWeight": number;
          "lineHeight": string;
          "letterSpacing": string;
        };
        "h3"?: {
          /** First font in the stack. */
          "fontFamily": string;
          /** Full ordered font list from resolved computed font-family */
          "fontFallbacks": Array<string>;
          "fontSize": string;
          "fontWeight": number;
          "lineHeight": string;
          "letterSpacing": string;
        };
        "h4"?: {
          /** First font in the stack. */
          "fontFamily": string;
          /** Full ordered font list from resolved computed font-family */
          "fontFallbacks": Array<string>;
          "fontSize": string;
          "fontWeight": number;
          "lineHeight": string;
          "letterSpacing": string;
        };
      };
      "p"?: {
        /** First font in the stack. */
        "fontFamily": string;
        /** Full ordered font list from resolved computed font-family */
        "fontFallbacks": Array<string>;
        "fontSize": string;
        "fontWeight": number;
        "lineHeight": string;
        "letterSpacing": string;
      };
    };
    /** Spacing system used on the website */
    "elementSpacing": {
      "xs": string;
      "sm": string;
      "md": string;
      "lg": string;
      "xl": string;
    };
    /** Shadow styles used on the website */
    "shadows": {
      "sm": string;
      "md": string;
      "lg": string;
      "xl": string;
      "inner": string;
    };
    /** Font assets keyed by family name as it appears in fontFamily/fontFallbacks (non-generic names only). Clients match typography.fontFamily / fontWeight or button styles to pick a file URL from files. */
    "fontLinks": {
      [key: string]: {
        "type": "google" | "custom";
        /** Upright font files keyed by weight string (e.g. "400" for regular, "500", "700"). Values are absolute URLs. */
        "files": {
          [key: string]: string;
        };
        /** Google Fonts category when type is google (e.g. sans-serif, serif, monospace, display, handwriting). Omitted for custom fonts when unknown. */
        "category"?: string;
        /** Present when type is custom: human-readable name derived from the fontLinks key (strip build/hash suffixes, split camelCase / PascalCase, normalize separators). Google entries omit this. */
        "displayName"?: string;
      };
    };
    /** UI component styles */
    "components": {
      /** Button component styles */
      "button": {
        "primary"?: {
          "backgroundColor": string;
          "color": string;
          /** Border color as CSS hex (#RRGGBB or #RRGGBBAA when computed border-color has alpha) */
          "borderColor": string;
          "borderRadius": string;
          "borderWidth": string;
          "borderStyle": string;
          "padding": string;
          /** Minimum width (usually px). */
          "minWidth": string;
          /** Sampled minimum height of the button box (typically px) */
          "minHeight": string;
          "fontSize": string;
          "fontWeight": number;
          /** Primary button typeface (first in fontFallbacks) */
          "fontFamily"?: string;
          /** Full ordered font list from computed font-family */
          "fontFallbacks"?: Array<string>;
          "textDecoration": string;
          /** Hex color of the underline when it differs from the text color */
          "textDecorationColor"?: string;
          /** Computed box-shadow (comma-separated layers when present) */
          "boxShadow": string;
          /** Ready-to-use CSS declaration block for this component style */
          "css": string;
        };
        "secondary"?: {
          "backgroundColor": string;
          "color": string;
          /** Border color as CSS hex (#RRGGBB or #RRGGBBAA when computed border-color has alpha) */
          "borderColor": string;
          "borderRadius": string;
          "borderWidth": string;
          "borderStyle": string;
          "padding": string;
          /** Minimum width (usually px). */
          "minWidth": string;
          /** Sampled minimum height of the button box (typically px) */
          "minHeight": string;
          "fontSize": string;
          "fontWeight": number;
          /** Primary button typeface (first in fontFallbacks) */
          "fontFamily"?: string;
          /** Full ordered font list from computed font-family */
          "fontFallbacks"?: Array<string>;
          "textDecoration": string;
          /** Hex color of the underline when it differs from the text color */
          "textDecorationColor"?: string;
          /** Computed box-shadow (comma-separated layers when present) */
          "boxShadow": string;
          /** Ready-to-use CSS declaration block for this component style */
          "css": string;
        };
        "link"?: {
          "backgroundColor": string;
          "color": string;
          /** Border color as CSS hex (#RRGGBB or #RRGGBBAA when computed border-color has alpha) */
          "borderColor": string;
          "borderRadius": string;
          "borderWidth": string;
          "borderStyle": string;
          "padding": string;
          /** Minimum width (usually px). */
          "minWidth": string;
          /** Sampled minimum height of the button box (typically px) */
          "minHeight": string;
          "fontSize": string;
          "fontWeight": number;
          /** Primary button typeface (first in fontFallbacks) */
          "fontFamily"?: string;
          /** Full ordered font list from computed font-family */
          "fontFallbacks"?: Array<string>;
          "textDecoration": string;
          /** Hex color of the underline when it differs from the text color */
          "textDecorationColor"?: string;
          /** Computed box-shadow (comma-separated layers when present) */
          "boxShadow": string;
          /** Ready-to-use CSS declaration block for this component style */
          "css": string;
        };
      };
      /** Card component style */
      "card"?: {
        "backgroundColor": string;
        /** Border color as CSS hex (#RRGGBB or #RRGGBBAA when computed border-color has alpha) */
        "borderColor": string;
        "borderRadius": string;
        "borderWidth": string;
        "borderStyle": string;
        "padding": string;
        "boxShadow": string;
        "textColor": string;
        /** Ready-to-use CSS declaration block for this component style */
        "css": string;
      };
    };
  };
  /** HTTP status code */
  "code"?: number;
  "cache_metadata": ContextSchemaCacheMetadata;
  "key_metadata"?: ContextSchemaKeyMetadata;
  "request_id": ContextSchemaRequestId;
};

export type ContextFontsQuery = {
  /** Exact page to inspect. Provide either `domain` or `directUrl`. (format uri) */
  "directUrl"?: string;
  /** Domain name to extract fonts from (e.g., 'example.com', 'google.com'). The domain will be automatically normalized and validated. You must provide either 'domain' or 'directUrl', but not both. (minLength 3) */
  "domain"?: string;
  /** Maximum age of cached brand data in ms. Defaults to 3 months; clamped to 0–1 year. `0` refreshes. */
  "maxAgeMs"?: number | null;
  "timeoutOpts"?: ContextSchemaScrapeTimeout;
  "tags"?: ContextSchemaRequestTags;
};

export interface ContextFontsInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  query?: ContextFontsQuery;
  headers?: Readonly<Record<string, string>>;
}

export type ContextFontsResponse = {
  /** `loaded`, or `still-loading` when capture ended before the page finished loading. */
  "finalDOMState"?: "loaded" | "still-loading";
  /** Always `ok` on success. */
  "status": string;
  /** The normalized domain that was processed */
  "domain": string;
  /** Array of font usage information */
  "fonts": Array<{
    /** Font family name */
    "font": string;
    /** Array of CSS selectors or element types where this font is used */
    "uses": Array<string>;
    /** Array of fallback font families */
    "fallbacks": Array<string>;
    /** Number of elements using this font */
    "num_elements": number;
    /** Number of words using this font */
    "num_words": number;
    /** Percentage of words using this font */
    "percent_words": number;
    /** Percentage of elements using this font */
    "percent_elements": number;
  }>;
  /** Available font files keyed by family name. Omitted when no downloadable fonts are found. */
  "fontLinks"?: {
    [key: string]: {
      "type": "google" | "custom";
      /** Upright font files keyed by weight string (e.g. "400" for regular, "500", "700"). Values are absolute URLs. */
      "files": {
        [key: string]: string;
      };
      /** Google Fonts category when type is google (e.g. sans-serif, serif, monospace, display, handwriting). Omitted for custom fonts when unknown. */
      "category"?: string;
      /** Present when type is custom: human-readable name derived from the fontLinks key (strip build/hash suffixes, split camelCase / PascalCase, normalize separators). Google entries omit this. */
      "displayName"?: string;
    };
  };
  /** HTTP status code, e.g., 200 */
  "code": number;
  "cache_metadata": ContextSchemaCacheMetadata;
  "key_metadata"?: ContextSchemaKeyMetadata;
  "request_id": ContextSchemaRequestId;
};

export type ContextClassifyNaicsQuery = {
  /** Brand domain or title to retrieve NAICS code for. If a valid domain is provided, it will be used for classification, otherwise, we will search for the brand using the provided title. (minLength 4) */
  "input": string;
  /** Minimum number of NAICS codes to return. Must be at least 1. Defaults to 1. (min 1, max 10) */
  "minResults"?: number;
  /** Maximum number of NAICS codes to return. Must be between 1 and 10. Defaults to 5. (min 1, max 10) */
  "maxResults"?: number;
  "timeoutOpts"?: ContextSchemaPartialTimeout;
  /** `enabled` turns on zero data retention. Returns 403 `ZDR_NOT_ENABLED` unless your organization has ZDR. */
  "zdr"?: "enabled" | "disabled";
  "tags"?: ContextSchemaRequestTags;
};

export interface ContextClassifyNaicsInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  query: ContextClassifyNaicsQuery;
  headers?: Readonly<Record<string, string>>;
}

export type ContextClassifyNaicsResponse = {
  /** True when the timeout ended processing and this response contains only usable results completed so far. Unfinished results are omitted. */
  "partial"?: boolean;
  /** Always `ok` on success. */
  "status"?: string;
  /** Domain found for the brand */
  "domain"?: string;
  /** Industry classification type, for naics api it will be `naics` */
  "type"?: string;
  /** Array of NAICS codes and titles. */
  "codes"?: Array<{
    /** NAICS code */
    "code": string;
    /** NAICS title */
    "name": string;
    /** Confidence level for how well this NAICS code matches the company description */
    "confidence": "high" | "medium" | "low";
  }>;
  "key_metadata"?: ContextSchemaKeyMetadata;
  "request_id": ContextSchemaRequestId;
};

export type ContextClassifySicQuery = {
  /** Brand domain or title to retrieve SIC code for. If a valid domain is provided, it will be used for classification, otherwise, we will search for the brand using the provided title. (minLength 4) */
  "input": string;
  /** SIC dataset: `original_sic` (1987) or `latest_sec` (current SEC list). */
  "type"?: "original_sic" | "latest_sec";
  /** Minimum number of SIC codes to return. Must be at least 1. Defaults to 1. (min 1, max 10) */
  "minResults"?: number;
  /** Maximum number of SIC codes to return. Must be between 1 and 10. Defaults to 5. (min 1, max 10) */
  "maxResults"?: number;
  "timeoutOpts"?: ContextSchemaPartialTimeout;
  /** `enabled` turns on zero data retention. Returns 403 `ZDR_NOT_ENABLED` unless your organization has ZDR. */
  "zdr"?: "enabled" | "disabled";
  "tags"?: ContextSchemaRequestTags;
};

export interface ContextClassifySicInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  query: ContextClassifySicQuery;
  headers?: Readonly<Record<string, string>>;
}

export type ContextClassifySicResponse = {
  /** True when the timeout ended processing and this response contains only usable results completed so far. Unfinished results are omitted. */
  "partial"?: boolean;
  /** Always `ok` on success. */
  "status"?: string;
  /** Domain found for the brand */
  "domain"?: string;
  /** Industry classification type, for sic api it will be `sic` */
  "type"?: string;
  /** Echoes back which SIC dataset was used to classify the brand. */
  "classification"?: "original_sic" | "latest_sec";
  /** Array of SIC codes with confidence scores. Extra fields depend on the requested classification: `original_sic` results include `majorGroup` and `majorGroupName`; `latest_sec` results include `office`. */
  "codes"?: Array<{
    /** SIC code (4-digit). */
    "code": string;
    /** SIC industry title. */
    "name": string;
    /** Confidence level for how well this SIC code matches the company description. */
    "confidence": "high" | "medium" | "low";
    /** 2-digit major group identifier (the leading two digits of the code). Only present when `classification` is `original_sic`. */
    "majorGroup"?: string;
    /** Description of the 2-digit major group. Only present when `classification` is `original_sic`. */
    "majorGroupName"?: string;
    /** SEC review office responsible for filings under this code. Only present when `classification` is `latest_sec`. */
    "office"?: string;
  }>;
  "key_metadata"?: ContextSchemaKeyMetadata;
  "request_id": ContextSchemaRequestId;
};

export type ContextPrefetchBody = {
  /** Data to prefetch. */
  "type": "brand" | "styleguide";
  "identifier": ContextSchemaUtilityPrefetchIdentifier;
  "timeoutOpts"?: ContextSchemaTimeout;
  "tags"?: ContextSchemaRequestTags;
};

export interface ContextPrefetchInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  headers?: Readonly<Record<string, string>>;
  body: ContextPrefetchBody;
}

export type ContextPrefetchResponse = {
  /** Always `ok` on success. */
  "status"?: string;
  /** Success message */
  "message"?: string;
  /** The type of prefetch that was queued, echoed from the request */
  "type"?: "brand" | "styleguide";
  /** The domain that was queued for prefetching */
  "domain"?: string;
  "key_metadata"?: ContextSchemaKeyMetadata;
  "request_id": ContextSchemaRequestId;
};

export type ContextCreateMonitorBody = ContextSchemaMonitorsCreateMonitorRequest;

export interface ContextCreateMonitorInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  headers?: Readonly<Record<string, string>>;
  body: ContextCreateMonitorBody;
}

export type ContextCreateMonitorResponse = ContextSchemaMonitorsCreateMonitorResponse;

export type ContextListMonitorsQuery = {
  /** Free-text search term, matched against the fields named in `search_by`. (maxLength 200) */
  "q"?: string;
  /** Fields to search with `q`. Defaults to all fields; page and extract targets can have instructions. */
  "search_by"?: Array<"name" | "url" | "instructions" | "tags"> | null;
  /** `prefix` for as-you-type prefix matching (default), `exact` for full-token matching. */
  "search_type"?: "exact" | "prefix";
  /** Filter monitors by lifecycle status. */
  "status"?: "active" | "paused" | "failed";
  /** Filter by target type. */
  "target_type"?: "page" | "sitemap" | "extract";
  /** Filter by change detection type. */
  "change_detection_type"?: "exact" | "semantic";
  /** Comma-separated list of tags to filter by (matches monitors having any of them). (maxItems 20) */
  "tags"?: Array<string> | null;
  /** Filter to items that have this tag. */
  "tag"?: string;
  /** Maximum number of items to return per page (1-100). Defaults to 25. (min 1, max 100) */
  "limit"?: number;
  /** Opaque pagination cursor from a previous response. */
  "cursor"?: string;
};

export interface ContextListMonitorsInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  query?: ContextListMonitorsQuery;
  headers?: Readonly<Record<string, string>>;
}

export type ContextListMonitorsResponse = ContextSchemaMonitorsListMonitorsResponse;

export type ContextGetMonitorPath = {
  /** ID of the monitor. */
  "monitor_id": string;
};

export interface ContextGetMonitorInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  path: ContextGetMonitorPath;
  headers?: Readonly<Record<string, string>>;
}

export type ContextGetMonitorResponse = ContextSchemaMonitorsMonitorResponse;

export type ContextUpdateMonitorPath = {
  /** ID of the monitor. */
  "monitor_id": string;
};

export type ContextUpdateMonitorBody = ContextSchemaMonitorsUpdateMonitorRequest;

export interface ContextUpdateMonitorInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  path: ContextUpdateMonitorPath;
  headers?: Readonly<Record<string, string>>;
  body: ContextUpdateMonitorBody;
}

export type ContextUpdateMonitorResponse = ContextSchemaMonitorsMonitorResponse;

export type ContextDeleteMonitorPath = {
  /** ID of the monitor. */
  "monitor_id": string;
};

export interface ContextDeleteMonitorInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  path: ContextDeleteMonitorPath;
  headers?: Readonly<Record<string, string>>;
}

export type ContextDeleteMonitorResponse = ContextSchemaMonitorsDeleteMonitorResponse;

export type ContextListMonitorRunsPath = {
  /** ID of the monitor. */
  "monitor_id": string;
};

export type ContextListMonitorRunsQuery = {
  "status"?: ((ContextSchemaMonitorsRunStatus));
  /** Maximum number of items to return per page (1-100). Defaults to 25. (min 1, max 100) */
  "limit"?: number;
  /** Opaque pagination cursor from a previous response. */
  "cursor"?: string;
};

export interface ContextListMonitorRunsInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  path: ContextListMonitorRunsPath;
  query?: ContextListMonitorRunsQuery;
  headers?: Readonly<Record<string, string>>;
}

export type ContextListMonitorRunsResponse = ContextSchemaMonitorsListRunsResponse;

export type ContextGetMonitorRunPath = {
  /** ID of the monitor. */
  "monitor_id": string;
  /** ID of the monitor run. */
  "run_id": string;
};

export interface ContextGetMonitorRunInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  path: ContextGetMonitorRunPath;
  headers?: Readonly<Record<string, string>>;
}

export type ContextGetMonitorRunResponse = ContextSchemaMonitorsRunResponse;

export type ContextListMonitorChangesPath = {
  /** ID of the monitor. */
  "monitor_id": string;
};

export type ContextListMonitorChangesQuery = {
  /** Filter to items that have this tag. */
  "tag"?: string;
  /** Only include items at or after this ISO 8601 timestamp. (format date-time) */
  "since"?: string;
  /** Only include items before this ISO 8601 timestamp. (format date-time) */
  "until"?: string;
  /** Maximum number of items to return per page (1-100). Defaults to 25. (min 1, max 100) */
  "limit"?: number;
  /** Opaque pagination cursor from a previous response. */
  "cursor"?: string;
};

export interface ContextListMonitorChangesInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  path: ContextListMonitorChangesPath;
  query?: ContextListMonitorChangesQuery;
  headers?: Readonly<Record<string, string>>;
}

export type ContextListMonitorChangesResponse = ContextSchemaMonitorsListChangesResponse;

export type ContextListAccountRunsQuery = {
  "status"?: ((ContextSchemaMonitorsRunStatus));
  /** Maximum number of items to return per page (1-100). Defaults to 25. (min 1, max 100) */
  "limit"?: number;
  /** Opaque pagination cursor from a previous response. */
  "cursor"?: string;
};

export interface ContextListAccountRunsInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  query?: ContextListAccountRunsQuery;
  headers?: Readonly<Record<string, string>>;
}

export type ContextListAccountRunsResponse = ContextSchemaMonitorsListRunsResponse;

export type ContextListMonitorCreditUsageQuery = {
  /** Only include items at or after this ISO 8601 timestamp. (format date-time) */
  "since"?: string;
  /** Only include items before this ISO 8601 timestamp. (format date-time) */
  "until"?: string;
};

export interface ContextListMonitorCreditUsageInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  query?: ContextListMonitorCreditUsageQuery;
  headers?: Readonly<Record<string, string>>;
}

export type ContextListMonitorCreditUsageResponse = ContextSchemaMonitorsCreditUsageResponse;

export interface ContextGetMonitorLimitsInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  headers?: Readonly<Record<string, string>>;
}

export type ContextGetMonitorLimitsResponse = ContextSchemaMonitorsLimitsResponse;

export type ContextListChangesQuery = {
  /** Filter changes to a single monitor. */
  "monitor_id"?: string;
  /** Filter by target type. */
  "target_type"?: "page" | "sitemap" | "extract";
  /** Filter by change detection type. */
  "change_detection_type"?: "exact" | "semantic";
  /** Filter to items that have this tag. */
  "tag"?: string;
  /** Only include items at or after this ISO 8601 timestamp. (format date-time) */
  "since"?: string;
  /** Only include items before this ISO 8601 timestamp. (format date-time) */
  "until"?: string;
  /** Maximum number of items to return per page (1-100). Defaults to 25. (min 1, max 100) */
  "limit"?: number;
  /** Opaque pagination cursor from a previous response. */
  "cursor"?: string;
};

export interface ContextListChangesInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  query?: ContextListChangesQuery;
  headers?: Readonly<Record<string, string>>;
}

export type ContextListChangesResponse = ContextSchemaMonitorsListChangesResponse;

export type ContextGetChangePath = {
  /** ID of the detected change. */
  "change_id": string;
};

export interface ContextGetChangeInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  path: ContextGetChangePath;
  headers?: Readonly<Record<string, string>>;
}

export type ContextGetChangeResponse = ContextSchemaMonitorsChangeResponse;

export type ContextRunMonitorNowPath = {
  /** ID of the monitor. */
  "monitor_id": string;
};

export interface ContextRunMonitorNowInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  path: ContextRunMonitorNowPath;
  headers?: Readonly<Record<string, string>>;
}

export type ContextRunMonitorNowResponse = ContextSchemaMonitorsRunNowResponse;

export type ContextRotateMonitorWebhookSecretPath = {
  /** ID of the monitor. */
  "monitor_id": string;
};

export interface ContextRotateMonitorWebhookSecretInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  path: ContextRotateMonitorWebhookSecretPath;
  headers?: Readonly<Record<string, string>>;
}

export type ContextRotateMonitorWebhookSecretResponse = ContextSchemaMonitorsMonitorResponse;

export type ContextSubmitBatchHeaders = {
  /** Unique key per submission. Retrying with the same key and body returns the original batch; a different body returns `409`. (maxLength 200) */
  "Idempotency-Key"?: string;
};

export type ContextSubmitBatchBody = ContextSchemaBatchSubmitRequest;

export interface ContextSubmitBatchInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  headers?: ContextSubmitBatchHeaders & Readonly<Record<string, string>>;
  body: ContextSubmitBatchBody;
}

export type ContextSubmitBatchResponse = ((ContextSchemaBatchAccepted) & ({
  "key_metadata"?: ContextSchemaKeyMetadata;
  "request_id": ContextSchemaRequestId;
}));

export type ContextListBatchesQuery = {
  /** Include batches submitted with Scrape Anything formats. Defaults to false. */
  "shouldIncludeUnified"?: boolean;
  /** Batches per page. Defaults to 25. (min 1, max 100) */
  "limit"?: number;
  /** Cursor from the previous page. */
  "cursor"?: string;
  /** Filter by status. */
  "status"?: "queued" | "running" | "cancelling" | "completed" | "cancelled" | "failed";
  /** Free-text search term, matched against the batch id, crawl source (start URL or sitemap domain), and tags. (maxLength 200) */
  "q"?: string;
  /** `prefix` for as-you-type prefix matching (default), `exact` for full-token matching. */
  "search_type"?: "exact" | "prefix";
  /** Tags to filter by (matches batches having any of them). Pass repeated `tags` params or one comma-separated list, e.g. `tags=docs,competitor`. */
  "tags"?: ((string) | (Array<string>));
};

export interface ContextListBatchesInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  query?: ContextListBatchesQuery;
  headers?: Readonly<Record<string, string>>;
}

export type ContextListBatchesResponse = {
  /** Batches on this page. */
  "data"?: Array<ContextSchemaBatch>;
  /** Whether another page is available. */
  "has_more"?: boolean;
  /** Cursor for the next page. */
  "next_cursor"?: string | null;
  "key_metadata"?: ContextSchemaKeyMetadata;
  "request_id": ContextSchemaRequestId;
};

export type ContextGetBatchPath = {
  /** Batch ID. */
  "batch_id": string;
};

export interface ContextGetBatchInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  path: ContextGetBatchPath;
  headers?: Readonly<Record<string, string>>;
}

export type ContextGetBatchResponse = ((ContextSchemaBatch) & (ContextSchemaBatchDetail) & ({
  "key_metadata"?: ContextSchemaKeyMetadata;
  "request_id": ContextSchemaRequestId;
}));

export type ContextDeleteBatchPath = {
  /** Batch ID. */
  "batch_id": string;
};

export interface ContextDeleteBatchInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  path: ContextDeleteBatchPath;
  headers?: Readonly<Record<string, string>>;
}

export type ContextDeleteBatchResponse = {
  /** ID of the deleted batch. */
  "id"?: string;
  /** Always true on success. */
  "deleted"?: boolean;
  "key_metadata"?: ContextSchemaKeyMetadata;
  "request_id": ContextSchemaRequestId;
};

export type ContextGetBatchResultsPath = {
  /** Batch ID. */
  "batch_id": string;
};

export type ContextGetBatchResultsQuery = {
  /** Records per page. Defaults to 25. A page can close early so its payload stays under ~8 MB; rely on next_cursor rather than counting records. (min 1, max 100) */
  "limit"?: number;
  /** next_cursor from the previous page. */
  "cursor"?: string;
};

export interface ContextGetBatchResultsInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  path: ContextGetBatchResultsPath;
  query?: ContextGetBatchResultsQuery;
  headers?: Readonly<Record<string, string>>;
}

export type ContextGetBatchResultsResponse = {
  /** Result records on this page. */
  "data"?: Array<ContextSchemaBatchResultRecord>;
  /** Whether another page is available. */
  "has_more"?: boolean;
  /** Cursor for the next page. */
  "next_cursor"?: string | null;
  "key_metadata"?: ContextSchemaKeyMetadata;
  "request_id": ContextSchemaRequestId;
};

export type ContextCancelBatchPath = {
  /** Batch ID. */
  "batch_id": string;
};

export interface ContextCancelBatchInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  path: ContextCancelBatchPath;
  headers?: Readonly<Record<string, string>>;
}

export type ContextCancelBatchResponse = ((ContextSchemaBatchCancelling) & ({
  "key_metadata"?: ContextSchemaKeyMetadata;
  "request_id": ContextSchemaRequestId;
}));

export type ContextSearchCompaniesBody = {
  /** Describe the companies to find. (minLength 1, maxLength 500) */
  "query": string;
  "filters"?: ContextSchemaCompanySearchFilters;
  /** Maximum number of results to return (1-100). (min 1, max 100) */
  "limit"?: number;
  /** Use next_cursor to fetch the next page. (maxLength 64) */
  "cursor"?: string;
  "tags"?: ContextSchemaRequestTags;
};

export interface ContextSearchCompaniesInput extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {
  headers?: Readonly<Record<string, string>>;
  body: ContextSearchCompaniesBody;
}

export type ContextSearchCompaniesResponse = {
  /** Matching companies, most relevant first by default. */
  "results": Array<{
    /** Company name. */
    "name": string;
    /** The company's website domain. */
    "domain": string;
    /** What the company does. */
    "description"?: string | null;
    /** Industries the company operates in. */
    "industries": Array<string>;
    /** Year the company was founded. */
    "founded_year"?: number | null;
    /** Where the company is headquartered. */
    "headquarters": {
      /** ISO 3166-1 alpha-2 country code. */
      "country_code"?: string | null;
      /** State or region. */
      "region"?: string | null;
      /** City. */
      "city"?: string | null;
      /** Street address. */
      "street_address"?: string | null;
      /** Postal code. */
      "postal_code"?: string | null;
    };
    /** How many people the company employs. */
    "employees": {
      /** Employee count, when known. */
      "count"?: number | null;
      /** Lower bound of the headcount range. */
      "min"?: number | null;
      /** Upper headcount bound; null for open-ended ranges. */
      "max"?: number | null;
    };
    /** Known funding history. */
    "funding": {
      /** Total disclosed funding in US dollars. */
      "total_usd"?: number | null;
      /** Number of known funding rounds. */
      "round_count": number;
      /** The most recent known funding round; null when none is known. */
      "latest_round"?: {
        /** Round type, such as seed or series_b. */
        "type": string;
        /** Announcement date (YYYY-MM-DD). */
        "date": string;
        /** Round size in US dollars, when disclosed. */
        "amount_usd"?: number | null;
      } | null;
    };
  }>;
  /** Pass as cursor to fetch the next page; null when there are no more results. */
  "next_cursor"?: string | null;
  "key_metadata"?: ContextSchemaKeyMetadata;
  "request_id": ContextSchemaRequestId;
};

/** Public Logo Link parameters: https://docs.context.dev/brand/logo-link */
export interface ContextLogoQuery {
  publicClientId: string;
  domain: string;
  theme?: "light" | "dark";
  type?: "icon" | "wordmark";
}
export interface ContextHeadLogoInput extends Pick<NativeRequestInput, "signal" | "timeoutMs" | "headers"> {
  query: ContextLogoQuery;
}
/** Direct embedding URL. The provider prohibits downloading, persisting, or rehosting Logo Link images. */
export function contextLogoUrl(query: ContextLogoQuery): string {
  if (!query || typeof query.publicClientId !== "string" || !query.publicClientId.trim() ||
    typeof query.domain !== "string" || !query.domain.trim()) throw new SearchError("invalid_request");
  const url = new URL("https://logos.context.dev/");
  for (const [key, value] of Object.entries(query)) {
    if (!["publicClientId", "domain", "theme", "type"].includes(key) || typeof value !== "string") throw new SearchError("invalid_request");
    url.searchParams.set(key, value);
  }
  if (query.theme !== undefined && !["light", "dark"].includes(query.theme) ||
    query.type !== undefined && !["icon", "wordmark"].includes(query.type)) throw new SearchError("invalid_request");
  return url.href;
}

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

export const contextOperations = Object.freeze({
  headLogo: Object.freeze({ id: "headLogo", method: "HEAD", path: "/", response: "raw", retryable: true }),
  submitFeedback: Object.freeze({"id": "submitFeedback", "method": "POST", "path": "/feedback", "retryable": false}),
  listLogs: Object.freeze({"id": "listLogs", "method": "GET", "path": "/org/logs", "retryable": true}),
  getLog: Object.freeze({"id": "getLog", "method": "GET", "path": "/org/logs/{request_id}", "retryable": true}),
  listProfiles: Object.freeze({"id": "listProfiles", "method": "GET", "path": "/org/browser/profiles", "retryable": true}),
  getUsage: Object.freeze({"id": "getUsage", "method": "GET", "path": "/org/usage", "retryable": true}),
  getUsageHistory: Object.freeze({"id": "getUsageHistory", "method": "GET", "path": "/org/usage/history", "retryable": true}),
  listWebhookDeliveries: Object.freeze({"id": "listWebhookDeliveries", "method": "POST", "path": "/webhooks/deliveries", "retryable": false}),
  getWebhookDelivery: Object.freeze({"id": "getWebhookDelivery", "method": "GET", "path": "/webhooks/deliveries/{delivery_id}", "retryable": true}),
  listWebhookDeliveryAttempts: Object.freeze({"id": "listWebhookDeliveryAttempts", "method": "GET", "path": "/webhooks/deliveries/{delivery_id}/attempts", "retryable": true}),
  retryWebhookDelivery: Object.freeze({"id": "retryWebhookDelivery", "method": "POST", "path": "/webhooks/deliveries/{delivery_id}/retry", "retryable": false}),
  scrape: Object.freeze({"id": "scrape", "method": "POST", "path": "/web/scrape", "retryable": false}),
  searchNews: Object.freeze({"id": "searchNews", "method": "POST", "path": "/news/search", "retryable": false}),
  answers: Object.freeze({"id": "answers", "method": "POST", "path": "/web/answers", "retryable": false}),
  parse: Object.freeze({"id": "parse", "method": "POST", "path": "/parse", "retryable": false, "headers": Object.freeze({"Content-Type": "application/octet-stream"}) }),
  map: Object.freeze({"id": "map", "method": "GET", "path": "/web/urls", "retryable": true}),
  crawl: Object.freeze({"id": "crawl", "method": "POST", "path": "/web/crawl", "retryable": false}),
  extract: Object.freeze({"id": "extract", "method": "POST", "path": "/web/extract", "retryable": false}),
  search: Object.freeze({"id": "search", "method": "POST", "path": "/web/search", "retryable": false}),
  enrichPerson: Object.freeze({"id": "enrichPerson", "method": "POST", "path": "/people/enrich", "retryable": false}),
  retrieveBrand: Object.freeze({"id": "retrieveBrand", "method": "POST", "path": "/brand/retrieve", "retryable": false}),
  searchBrands: Object.freeze({"id": "searchBrands", "method": "GET", "path": "/brand/search", "retryable": true}),
  styleguide: Object.freeze({"id": "styleguide", "method": "GET", "path": "/web/styleguide", "retryable": true}),
  fonts: Object.freeze({"id": "fonts", "method": "GET", "path": "/web/fonts", "retryable": true}),
  classifyNaics: Object.freeze({"id": "classifyNaics", "method": "GET", "path": "/web/naics", "retryable": true}),
  classifySic: Object.freeze({"id": "classifySic", "method": "GET", "path": "/web/sic", "retryable": true}),
  prefetch: Object.freeze({"id": "prefetch", "method": "POST", "path": "/utility/prefetch", "retryable": false}),
  createMonitor: Object.freeze({"id": "createMonitor", "method": "POST", "path": "/monitors", "retryable": false}),
  listMonitors: Object.freeze({"id": "listMonitors", "method": "GET", "path": "/monitors", "retryable": true}),
  getMonitor: Object.freeze({"id": "getMonitor", "method": "GET", "path": "/monitors/{monitor_id}", "retryable": true}),
  updateMonitor: Object.freeze({"id": "updateMonitor", "method": "PATCH", "path": "/monitors/{monitor_id}", "retryable": false}),
  deleteMonitor: Object.freeze({"id": "deleteMonitor", "method": "DELETE", "path": "/monitors/{monitor_id}", "retryable": false}),
  listMonitorRuns: Object.freeze({"id": "listMonitorRuns", "method": "GET", "path": "/monitors/{monitor_id}/runs", "retryable": true}),
  getMonitorRun: Object.freeze({"id": "getMonitorRun", "method": "GET", "path": "/monitors/{monitor_id}/runs/{run_id}", "retryable": true}),
  listMonitorChanges: Object.freeze({"id": "listMonitorChanges", "method": "GET", "path": "/monitors/{monitor_id}/changes", "retryable": true}),
  listAccountRuns: Object.freeze({"id": "listAccountRuns", "method": "GET", "path": "/monitors/runs", "retryable": true}),
  listMonitorCreditUsage: Object.freeze({"id": "listMonitorCreditUsage", "method": "GET", "path": "/monitors/credit-usage", "retryable": true}),
  getMonitorLimits: Object.freeze({"id": "getMonitorLimits", "method": "GET", "path": "/monitors/limits", "retryable": true}),
  listChanges: Object.freeze({"id": "listChanges", "method": "GET", "path": "/monitors/changes", "retryable": true}),
  getChange: Object.freeze({"id": "getChange", "method": "GET", "path": "/monitors/changes/{change_id}", "retryable": true}),
  runMonitorNow: Object.freeze({"id": "runMonitorNow", "method": "POST", "path": "/monitors/{monitor_id}/run", "retryable": false}),
  rotateMonitorWebhookSecret: Object.freeze({"id": "rotateMonitorWebhookSecret", "method": "POST", "path": "/monitors/{monitor_id}/webhook/rotate-secret", "retryable": false}),
  submitBatch: Object.freeze({"id": "submitBatch", "method": "POST", "path": "/batch/submit", "retryable": false}),
  listBatches: Object.freeze({"id": "listBatches", "method": "GET", "path": "/batch/list", "retryable": true}),
  getBatch: Object.freeze({"id": "getBatch", "method": "GET", "path": "/batch/{batch_id}", "retryable": true}),
  deleteBatch: Object.freeze({"id": "deleteBatch", "method": "DELETE", "path": "/batch/{batch_id}", "retryable": false}),
  getBatchResults: Object.freeze({"id": "getBatchResults", "method": "GET", "path": "/batch/{batch_id}/results", "retryable": true}),
  cancelBatch: Object.freeze({"id": "cancelBatch", "method": "POST", "path": "/batch/{batch_id}/cancel", "retryable": false}),
  searchCompanies: Object.freeze({"id": "searchCompanies", "method": "POST", "path": "/company/search", "retryable": false}),
} satisfies Readonly<Record<string, NativeOperation>>);

/** Explicit native calls; no auto-pagination, polling, or stream reconnection. */
export function createContextClient(options: ContextClientOptions) {
  const { apiKey, ...config } = options;
  const key = credential(apiKey);
  const transport0 = createNativeTransport({ ...config, provider: "context", baseUrl: "https://api.context.dev/v1", headers: { Authorization: `Bearer ${key}` } });
  const logoTransport = createNativeTransport({ ...config, provider: "context", baseUrl: "https://logos.context.dev" });
  return Object.freeze({
    /** Build a public embedding URL without fetching or storing image bytes. */
    logoUrl: contextLogoUrl,
    /** HEAD https://logos.context.dev/ — inspect public image headers without downloading the image. */
    async headLogo(input: ContextHeadLogoInput): Promise<NativeResponse<Response>> {
      if (!input || typeof input !== "object") throw new SearchError("invalid_request");
      contextLogoUrl(input.query);
      return logoTransport.request(contextOperations.headLogo,
        { ...input, query: { ...input.query } });
    },
    operations: contextOperations,
    /** POST https://api.context.dev/v1/feedback — Submit agent feedback. */
    async submitFeedback(input: ContextSubmitFeedbackInput): Promise<NativeResponse<ContextSubmitFeedbackResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      if (input.body !== undefined && (!input.body || typeof input.body !== "object" || Array.isArray(input.body))) throw new SearchError("invalid_request");
      return transport0.request<ContextSubmitFeedbackResponse>(contextOperations.submitFeedback, { ...input });
    },
    /** GET https://api.context.dev/v1/org/logs — List request logs. */
    async listLogs(input: ContextListLogsInput = {}): Promise<NativeResponse<ContextListLogsResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.query !== undefined && (!input.query || typeof input.query !== "object" || Array.isArray(input.query))) throw new SearchError("invalid_request");
      return transport0.request<ContextListLogsResponse>(contextOperations.listLogs, { ...input, query: wireQuery(input.query, []) ?? {} });
    },
    /** GET https://api.context.dev/v1/org/logs/{request_id} — Retrieve a request log. */
    async getLog(input: ContextGetLogInput): Promise<NativeResponse<ContextGetLogResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport0.request<ContextGetLogResponse>(contextOperations.getLog, { ...input });
    },
    /** GET https://api.context.dev/v1/org/browser/profiles — List browser profiles. */
    async listProfiles(input: ContextListProfilesInput = {}): Promise<NativeResponse<ContextListProfilesResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.query !== undefined && (!input.query || typeof input.query !== "object" || Array.isArray(input.query))) throw new SearchError("invalid_request");
      return transport0.request<ContextListProfilesResponse>(contextOperations.listProfiles, { ...input, query: wireQuery(input.query, []) ?? {} });
    },
    /** GET https://api.context.dev/v1/org/usage — Retrieve credit usage. */
    async getUsage(input: ContextGetUsageInput = {}): Promise<NativeResponse<ContextGetUsageResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport0.request<ContextGetUsageResponse>(contextOperations.getUsage, { ...input });
    },
    /** GET https://api.context.dev/v1/org/usage/history — Retrieve usage history. */
    async getUsageHistory(input: ContextGetUsageHistoryInput = {}): Promise<NativeResponse<ContextGetUsageHistoryResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.query !== undefined && (!input.query || typeof input.query !== "object" || Array.isArray(input.query))) throw new SearchError("invalid_request");
      return transport0.request<ContextGetUsageHistoryResponse>(contextOperations.getUsageHistory, { ...input, query: wireQuery(input.query, []) ?? {} });
    },
    /** POST https://api.context.dev/v1/webhooks/deliveries — List webhook deliveries. */
    async listWebhookDeliveries(input: ContextListWebhookDeliveriesInput): Promise<NativeResponse<ContextListWebhookDeliveriesResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      if (input.body !== undefined && (!input.body || typeof input.body !== "object" || Array.isArray(input.body))) throw new SearchError("invalid_request");
      return transport0.request<ContextListWebhookDeliveriesResponse>(contextOperations.listWebhookDeliveries, { ...input });
    },
    /** GET https://api.context.dev/v1/webhooks/deliveries/{delivery_id} — Retrieve a webhook delivery. */
    async getWebhookDelivery(input: ContextGetWebhookDeliveryInput): Promise<NativeResponse<ContextGetWebhookDeliveryResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.query !== undefined && (!input.query || typeof input.query !== "object" || Array.isArray(input.query))) throw new SearchError("invalid_request");
      return transport0.request<ContextGetWebhookDeliveryResponse>(contextOperations.getWebhookDelivery, { ...input, query: wireQuery(input.query, ["tags"]) ?? {} });
    },
    /** GET https://api.context.dev/v1/webhooks/deliveries/{delivery_id}/attempts — List webhook delivery attempts. */
    async listWebhookDeliveryAttempts(input: ContextListWebhookDeliveryAttemptsInput): Promise<NativeResponse<ContextListWebhookDeliveryAttemptsResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.query !== undefined && (!input.query || typeof input.query !== "object" || Array.isArray(input.query))) throw new SearchError("invalid_request");
      return transport0.request<ContextListWebhookDeliveryAttemptsResponse>(contextOperations.listWebhookDeliveryAttempts, { ...input, query: wireQuery(input.query, ["tags"]) ?? {} });
    },
    /** POST https://api.context.dev/v1/webhooks/deliveries/{delivery_id}/retry — Retry a webhook delivery. */
    async retryWebhookDelivery(input: ContextRetryWebhookDeliveryInput): Promise<NativeResponse<ContextRetryWebhookDeliveryResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body !== undefined && (!input.body || typeof input.body !== "object" || Array.isArray(input.body))) throw new SearchError("invalid_request");
      return transport0.request<ContextRetryWebhookDeliveryResponse>(contextOperations.retryWebhookDelivery, { ...input });
    },
    /** POST https://api.context.dev/v1/web/scrape — Scrape Anything. */
    async scrape(input: ContextScrapeInput): Promise<NativeResponse<ContextScrapeResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      if (input.body !== undefined && (!input.body || typeof input.body !== "object" || Array.isArray(input.body))) throw new SearchError("invalid_request");
      return transport0.request<ContextScrapeResponse>(contextOperations.scrape, { ...input });
    },
    /** POST https://api.context.dev/v1/news/search — Search news. */
    async searchNews(input: ContextSearchNewsInput): Promise<NativeResponse<ContextSearchNewsResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      if (input.body !== undefined && (!input.body || typeof input.body !== "object" || Array.isArray(input.body))) throw new SearchError("invalid_request");
      return transport0.request<ContextSearchNewsResponse>(contextOperations.searchNews, { ...input });
    },
    /** POST https://api.context.dev/v1/web/answers — Answer a research task. */
    async answers(input: ContextAnswersInput): Promise<NativeResponse<ContextAnswersResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      if (input.body !== undefined && (!input.body || typeof input.body !== "object" || Array.isArray(input.body))) throw new SearchError("invalid_request");
      return transport0.request<ContextAnswersResponse>(contextOperations.answers, { ...input });
    },
    /** POST https://api.context.dev/v1/parse — Parse a file. */
    async parse(input: ContextParseInput): Promise<NativeResponse<ContextParseResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.rawBody === undefined || input.rawBody === null) throw new SearchError("invalid_request");
      if (input.query !== undefined && (!input.query || typeof input.query !== "object" || Array.isArray(input.query))) throw new SearchError("invalid_request");
      return transport0.request<ContextParseResponse>(contextOperations.parse, { ...input, query: wireQuery(input.query, ["tags"]) ?? {} });
    },
    /** GET https://api.context.dev/v1/web/urls — Map URLs. */
    async map(input: ContextMapInput): Promise<NativeResponse<ContextMapResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.query === undefined) throw new SearchError("invalid_request");
      if (input.query !== undefined && (!input.query || typeof input.query !== "object" || Array.isArray(input.query))) throw new SearchError("invalid_request");
      return transport0.request<ContextMapResponse>(contextOperations.map, { ...input, query: wireQuery(input.query, ["tags"]) ?? {} });
    },
    /** POST https://api.context.dev/v1/web/crawl — Crawl a website. */
    async crawl(input: ContextCrawlInput): Promise<NativeResponse<ContextCrawlResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      if (input.body !== undefined && (!input.body || typeof input.body !== "object" || Array.isArray(input.body))) throw new SearchError("invalid_request");
      return transport0.request<ContextCrawlResponse>(contextOperations.crawl, { ...input });
    },
    /** POST https://api.context.dev/v1/web/extract — Extract structured data. */
    async extract(input: ContextExtractInput): Promise<NativeResponse<ContextExtractResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      if (input.body !== undefined && (!input.body || typeof input.body !== "object" || Array.isArray(input.body))) throw new SearchError("invalid_request");
      return transport0.request<ContextExtractResponse>(contextOperations.extract, { ...input });
    },
    /** POST https://api.context.dev/v1/web/search — Search the web. */
    async search(input: ContextSearchInput): Promise<NativeResponse<ContextSearchResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      if (input.body !== undefined && (!input.body || typeof input.body !== "object" || Array.isArray(input.body))) throw new SearchError("invalid_request");
      return transport0.request<ContextSearchResponse>(contextOperations.search, { ...input });
    },
    /** POST https://api.context.dev/v1/people/enrich — Enrich a person. */
    async enrichPerson(input: ContextEnrichPersonInput): Promise<NativeResponse<ContextEnrichPersonResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      if (input.body !== undefined && (!input.body || typeof input.body !== "object" || Array.isArray(input.body))) throw new SearchError("invalid_request");
      return transport0.request<ContextEnrichPersonResponse>(contextOperations.enrichPerson, { ...input });
    },
    /** POST https://api.context.dev/v1/brand/retrieve — Retrieve a brand. */
    async retrieveBrand(input: ContextRetrieveBrandInput): Promise<NativeResponse<ContextRetrieveBrandResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      if (input.body !== undefined && (!input.body || typeof input.body !== "object" || Array.isArray(input.body))) throw new SearchError("invalid_request");
      return transport0.request<ContextRetrieveBrandResponse>(contextOperations.retrieveBrand, { ...input });
    },
    /** GET https://api.context.dev/v1/brand/search — Auto-complete Brand. */
    async searchBrands(input: ContextSearchBrandsInput): Promise<NativeResponse<ContextSearchBrandsResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.query === undefined) throw new SearchError("invalid_request");
      if (input.query !== undefined && (!input.query || typeof input.query !== "object" || Array.isArray(input.query))) throw new SearchError("invalid_request");
      return transport0.request<ContextSearchBrandsResponse>(contextOperations.searchBrands, { ...input, query: wireQuery(input.query, ["queryBy", "tags"]) ?? {} });
    },
    /** GET https://api.context.dev/v1/web/styleguide — Extract a styleguide. */
    async styleguide(input: ContextStyleguideInput = {}): Promise<NativeResponse<ContextStyleguideResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.query !== undefined && (!input.query || typeof input.query !== "object" || Array.isArray(input.query))) throw new SearchError("invalid_request");
      return transport0.request<ContextStyleguideResponse>(contextOperations.styleguide, { ...input, query: wireQuery(input.query, ["tags"]) ?? {} });
    },
    /** GET https://api.context.dev/v1/web/fonts — Extract fonts. */
    async fonts(input: ContextFontsInput = {}): Promise<NativeResponse<ContextFontsResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.query !== undefined && (!input.query || typeof input.query !== "object" || Array.isArray(input.query))) throw new SearchError("invalid_request");
      return transport0.request<ContextFontsResponse>(contextOperations.fonts, { ...input, query: wireQuery(input.query, ["tags"]) ?? {} });
    },
    /** GET https://api.context.dev/v1/web/naics — Classify NAICS codes. */
    async classifyNaics(input: ContextClassifyNaicsInput): Promise<NativeResponse<ContextClassifyNaicsResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.query === undefined) throw new SearchError("invalid_request");
      if (input.query !== undefined && (!input.query || typeof input.query !== "object" || Array.isArray(input.query))) throw new SearchError("invalid_request");
      return transport0.request<ContextClassifyNaicsResponse>(contextOperations.classifyNaics, { ...input, query: wireQuery(input.query, ["tags"]) ?? {} });
    },
    /** GET https://api.context.dev/v1/web/sic — Classify SIC codes. */
    async classifySic(input: ContextClassifySicInput): Promise<NativeResponse<ContextClassifySicResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.query === undefined) throw new SearchError("invalid_request");
      if (input.query !== undefined && (!input.query || typeof input.query !== "object" || Array.isArray(input.query))) throw new SearchError("invalid_request");
      return transport0.request<ContextClassifySicResponse>(contextOperations.classifySic, { ...input, query: wireQuery(input.query, ["tags"]) ?? {} });
    },
    /** POST https://api.context.dev/v1/utility/prefetch — Prefetch brand data. */
    async prefetch(input: ContextPrefetchInput): Promise<NativeResponse<ContextPrefetchResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      if (input.body !== undefined && (!input.body || typeof input.body !== "object" || Array.isArray(input.body))) throw new SearchError("invalid_request");
      return transport0.request<ContextPrefetchResponse>(contextOperations.prefetch, { ...input });
    },
    /** POST https://api.context.dev/v1/monitors — Create a monitor. */
    async createMonitor(input: ContextCreateMonitorInput): Promise<NativeResponse<ContextCreateMonitorResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      if (input.body !== undefined && (!input.body || typeof input.body !== "object" || Array.isArray(input.body))) throw new SearchError("invalid_request");
      return transport0.request<ContextCreateMonitorResponse>(contextOperations.createMonitor, { ...input });
    },
    /** GET https://api.context.dev/v1/monitors — List monitors. */
    async listMonitors(input: ContextListMonitorsInput = {}): Promise<NativeResponse<ContextListMonitorsResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.query !== undefined && (!input.query || typeof input.query !== "object" || Array.isArray(input.query))) throw new SearchError("invalid_request");
      return transport0.request<ContextListMonitorsResponse>(contextOperations.listMonitors, { ...input, query: wireQuery(input.query, []) ?? {} });
    },
    /** GET https://api.context.dev/v1/monitors/{monitor_id} — Retrieve a monitor. */
    async getMonitor(input: ContextGetMonitorInput): Promise<NativeResponse<ContextGetMonitorResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport0.request<ContextGetMonitorResponse>(contextOperations.getMonitor, { ...input });
    },
    /** PATCH https://api.context.dev/v1/monitors/{monitor_id} — Update a monitor. */
    async updateMonitor(input: ContextUpdateMonitorInput): Promise<NativeResponse<ContextUpdateMonitorResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      if (input.body !== undefined && (!input.body || typeof input.body !== "object" || Array.isArray(input.body))) throw new SearchError("invalid_request");
      return transport0.request<ContextUpdateMonitorResponse>(contextOperations.updateMonitor, { ...input });
    },
    /** DELETE https://api.context.dev/v1/monitors/{monitor_id} — Delete a monitor. */
    async deleteMonitor(input: ContextDeleteMonitorInput): Promise<NativeResponse<ContextDeleteMonitorResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport0.request<ContextDeleteMonitorResponse>(contextOperations.deleteMonitor, { ...input });
    },
    /** GET https://api.context.dev/v1/monitors/{monitor_id}/runs — List monitor runs. */
    async listMonitorRuns(input: ContextListMonitorRunsInput): Promise<NativeResponse<ContextListMonitorRunsResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.query !== undefined && (!input.query || typeof input.query !== "object" || Array.isArray(input.query))) throw new SearchError("invalid_request");
      return transport0.request<ContextListMonitorRunsResponse>(contextOperations.listMonitorRuns, { ...input, query: wireQuery(input.query, []) ?? {} });
    },
    /** GET https://api.context.dev/v1/monitors/{monitor_id}/runs/{run_id} — Retrieve a monitor run. */
    async getMonitorRun(input: ContextGetMonitorRunInput): Promise<NativeResponse<ContextGetMonitorRunResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport0.request<ContextGetMonitorRunResponse>(contextOperations.getMonitorRun, { ...input });
    },
    /** GET https://api.context.dev/v1/monitors/{monitor_id}/changes — List monitor changes. */
    async listMonitorChanges(input: ContextListMonitorChangesInput): Promise<NativeResponse<ContextListMonitorChangesResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.query !== undefined && (!input.query || typeof input.query !== "object" || Array.isArray(input.query))) throw new SearchError("invalid_request");
      return transport0.request<ContextListMonitorChangesResponse>(contextOperations.listMonitorChanges, { ...input, query: wireQuery(input.query, []) ?? {} });
    },
    /** GET https://api.context.dev/v1/monitors/runs — List runs for all monitors. */
    async listAccountRuns(input: ContextListAccountRunsInput = {}): Promise<NativeResponse<ContextListAccountRunsResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.query !== undefined && (!input.query || typeof input.query !== "object" || Array.isArray(input.query))) throw new SearchError("invalid_request");
      return transport0.request<ContextListAccountRunsResponse>(contextOperations.listAccountRuns, { ...input, query: wireQuery(input.query, []) ?? {} });
    },
    /** GET https://api.context.dev/v1/monitors/credit-usage — Retrieve monitor credit usage. */
    async listMonitorCreditUsage(input: ContextListMonitorCreditUsageInput = {}): Promise<NativeResponse<ContextListMonitorCreditUsageResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.query !== undefined && (!input.query || typeof input.query !== "object" || Array.isArray(input.query))) throw new SearchError("invalid_request");
      return transport0.request<ContextListMonitorCreditUsageResponse>(contextOperations.listMonitorCreditUsage, { ...input, query: wireQuery(input.query, []) ?? {} });
    },
    /** GET https://api.context.dev/v1/monitors/limits — Retrieve monitor limits. */
    async getMonitorLimits(input: ContextGetMonitorLimitsInput = {}): Promise<NativeResponse<ContextGetMonitorLimitsResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport0.request<ContextGetMonitorLimitsResponse>(contextOperations.getMonitorLimits, { ...input });
    },
    /** GET https://api.context.dev/v1/monitors/changes — List changes for all monitors. */
    async listChanges(input: ContextListChangesInput = {}): Promise<NativeResponse<ContextListChangesResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.query !== undefined && (!input.query || typeof input.query !== "object" || Array.isArray(input.query))) throw new SearchError("invalid_request");
      return transport0.request<ContextListChangesResponse>(contextOperations.listChanges, { ...input, query: wireQuery(input.query, []) ?? {} });
    },
    /** GET https://api.context.dev/v1/monitors/changes/{change_id} — Retrieve a monitor change. */
    async getChange(input: ContextGetChangeInput): Promise<NativeResponse<ContextGetChangeResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport0.request<ContextGetChangeResponse>(contextOperations.getChange, { ...input });
    },
    /** POST https://api.context.dev/v1/monitors/{monitor_id}/run — Run a monitor now. */
    async runMonitorNow(input: ContextRunMonitorNowInput): Promise<NativeResponse<ContextRunMonitorNowResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport0.request<ContextRunMonitorNowResponse>(contextOperations.runMonitorNow, { ...input });
    },
    /** POST https://api.context.dev/v1/monitors/{monitor_id}/webhook/rotate-secret — Rotate a monitor webhook secret. */
    async rotateMonitorWebhookSecret(input: ContextRotateMonitorWebhookSecretInput): Promise<NativeResponse<ContextRotateMonitorWebhookSecretResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport0.request<ContextRotateMonitorWebhookSecretResponse>(contextOperations.rotateMonitorWebhookSecret, { ...input });
    },
    /** POST https://api.context.dev/v1/batch/submit — Submit a batch. */
    async submitBatch(input: ContextSubmitBatchInput): Promise<NativeResponse<ContextSubmitBatchResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      if (input.body !== undefined && (!input.body || typeof input.body !== "object" || Array.isArray(input.body))) throw new SearchError("invalid_request");
      return transport0.request<ContextSubmitBatchResponse>(contextOperations.submitBatch, { ...input });
    },
    /** GET https://api.context.dev/v1/batch/list — List batches. */
    async listBatches(input: ContextListBatchesInput = {}): Promise<NativeResponse<ContextListBatchesResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.query !== undefined && (!input.query || typeof input.query !== "object" || Array.isArray(input.query))) throw new SearchError("invalid_request");
      return transport0.request<ContextListBatchesResponse>(contextOperations.listBatches, { ...input, query: wireQuery(input.query, []) ?? {} });
    },
    /** GET https://api.context.dev/v1/batch/{batch_id} — Retrieve a batch. */
    async getBatch(input: ContextGetBatchInput): Promise<NativeResponse<ContextGetBatchResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport0.request<ContextGetBatchResponse>(contextOperations.getBatch, { ...input });
    },
    /** DELETE https://api.context.dev/v1/batch/{batch_id} — Delete a batch. */
    async deleteBatch(input: ContextDeleteBatchInput): Promise<NativeResponse<ContextDeleteBatchResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport0.request<ContextDeleteBatchResponse>(contextOperations.deleteBatch, { ...input });
    },
    /** GET https://api.context.dev/v1/batch/{batch_id}/results — List batch results. */
    async getBatchResults(input: ContextGetBatchResultsInput): Promise<NativeResponse<ContextGetBatchResultsResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.query !== undefined && (!input.query || typeof input.query !== "object" || Array.isArray(input.query))) throw new SearchError("invalid_request");
      return transport0.request<ContextGetBatchResultsResponse>(contextOperations.getBatchResults, { ...input, query: wireQuery(input.query, []) ?? {} });
    },
    /** POST https://api.context.dev/v1/batch/{batch_id}/cancel — Cancel a batch. */
    async cancelBatch(input: ContextCancelBatchInput): Promise<NativeResponse<ContextCancelBatchResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport0.request<ContextCancelBatchResponse>(contextOperations.cancelBatch, { ...input });
    },
    /** POST https://api.context.dev/v1/company/search — Search companies. */
    async searchCompanies(input: ContextSearchCompaniesInput): Promise<NativeResponse<ContextSearchCompaniesResponse>> {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      if (input.body !== undefined && (!input.body || typeof input.body !== "object" || Array.isArray(input.body))) throw new SearchError("invalid_request");
      return transport0.request<ContextSearchCompaniesResponse>(contextOperations.searchCompanies, { ...input });
    },
  });
}

export type ContextClient = ReturnType<typeof createContextClient>;
