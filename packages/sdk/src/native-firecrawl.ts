/** Official public contracts reviewed 2026-10-22. See docs/provider-surfaces-b.md. */
import { createNativeTransport } from "./native-transport.js";
import type { NativeOperation, NativeRequestInput, NativeTransportConfig, NativeSSEEvent } from "./native-transport.js";
import { adapterOptions } from "./http.js";
import { exactFields } from "./validation.js";
import { SearchError } from "./errors.js";
export type FirecrawlClientOptions = Omit<NativeTransportConfig, "provider" | "baseUrl" | "headers"> & { apiKey: string };
export namespace FirecrawlSchemas {
  export type AuditMetadata = {
    "username": string;
  };
  export type AgentTraceAgent = {
    "id": string;
    "role": "orchestrator" | "subagent" | "system";
    "name": string;
    "parentId"?: string;
    [key: string]: unknown;
  };
  export type AgentTraceError = {
    "code": "cancelled" | "credit_limit_reached" | "parent_finished" | "refused" | "internal";
    "source": "agent" | "tool" | "billing" | "system";
    "retryable": boolean;
    "message": string;
    [key: string]: unknown;
  };
  export type AgentTraceArtifact = {
    "kind": "json" | "markdown" | "html" | "screenshot" | "text";
    "artifactId": string;
    "path"?: string;
    "snapshotId": string;
    "change": "init" | "partial" | "append" | "modify" | "update";
    "changedFields"?: ReadonlyArray<string>;
    "itemCount"?: number;
    "sourceToolCallId"?: string;
    [key: string]: unknown;
  };
  export type AgentTraceEvent = ({
    "schemaVersion": 1;
    "eventId": string;
    "runId": string;
    "occurredAt": string;
    "producerSequence": number;
    "agent": AgentTraceAgent;
    "type": "run.started";
    [key: string]: unknown;
  } | {
    "schemaVersion": 1;
    "eventId": string;
    "runId": string;
    "occurredAt": string;
    "producerSequence": number;
    "agent": AgentTraceAgent;
    "type": "run.cancel_requested";
    "reason": "user";
    [key: string]: unknown;
  } | {
    "schemaVersion": 1;
    "eventId": string;
    "runId": string;
    "occurredAt": string;
    "producerSequence": number;
    "agent": AgentTraceAgent;
    "type": "run.finished";
    "outcome": "succeeded" | "failed" | "cancelled" | "refused" | "credit_limit_reached";
    "error": (AgentTraceError) | null;
    [key: string]: unknown;
  } | {
    "schemaVersion": 1;
    "eventId": string;
    "runId": string;
    "occurredAt": string;
    "producerSequence": number;
    "agent": AgentTraceAgent;
    "type": "agent.started";
    [key: string]: unknown;
  } | {
    "schemaVersion": 1;
    "eventId": string;
    "runId": string;
    "occurredAt": string;
    "producerSequence": number;
    "agent": AgentTraceAgent;
    "type": "agent.finished";
    "outcome": "succeeded" | "failed" | "cancelled" | "refused";
    "durationMs": number;
    "error": (AgentTraceError) | null;
    [key: string]: unknown;
  } | {
    "schemaVersion": 1;
    "eventId": string;
    "runId": string;
    "occurredAt": string;
    "producerSequence": number;
    "agent": AgentTraceAgent;
    "type": "browser.session.started";
    "sessionId": string;
    [key: string]: unknown;
  } | {
    "schemaVersion": 1;
    "eventId": string;
    "runId": string;
    "occurredAt": string;
    "producerSequence": number;
    "agent": AgentTraceAgent;
    "type": "browser.session.finished";
    "sessionId": string;
    "durationMs": number;
    [key: string]: unknown;
  } | {
    "schemaVersion": 1;
    "eventId": string;
    "runId": string;
    "occurredAt": string;
    "producerSequence": number;
    "agent": AgentTraceAgent;
    "type": "progress.reported";
    "phase": "planning" | "working" | "finalizing";
    "message": string;
    [key: string]: unknown;
  } | {
    "schemaVersion": 1;
    "eventId": string;
    "runId": string;
    "occurredAt": string;
    "producerSequence": number;
    "agent": AgentTraceAgent;
    "type": "reasoning.summary";
    "text": string;
    [key: string]: unknown;
  } | {
    "schemaVersion": 1;
    "eventId": string;
    "runId": string;
    "occurredAt": string;
    "producerSequence": number;
    "agent": AgentTraceAgent;
    "type": "tool_call.started";
    "toolCallId": string;
    "toolName": string;
    "parameters": unknown;
    [key: string]: unknown;
  } | {
    "schemaVersion": 1;
    "eventId": string;
    "runId": string;
    "occurredAt": string;
    "producerSequence": number;
    "agent": AgentTraceAgent;
    "type": "tool_call.finished";
    "toolCallId": string;
    "toolName": string;
    "result": unknown;
    [key: string]: unknown;
  } | {
    "schemaVersion": 1;
    "eventId": string;
    "runId": string;
    "occurredAt": string;
    "producerSequence": number;
    "agent": AgentTraceAgent;
    "type": "artifact.updated";
    "artifact": AgentTraceArtifact;
    [key: string]: unknown;
  } | {
    "schemaVersion": 1;
    "eventId": string;
    "runId": string;
    "occurredAt": string;
    "producerSequence": number;
    "agent": AgentTraceAgent;
    "type": "error.occurred";
    "error": AgentTraceError;
    [key: string]: unknown;
  });
  export type SuccessResponse = {
    "success"?: boolean;
    [key: string]: unknown;
  };
  export type MonitorSchedule = {
    "cron"?: string;
    "text"?: string;
    "timezone"?: string;
    [key: string]: unknown;
  };
  export type MonitorWebhook = {
    "url": string;
    "headers"?: Record<string, string>;
    "metadata"?: Record<string, unknown>;
    "events"?: ReadonlyArray<"monitor.page" | "monitor.check.completed">;
    [key: string]: unknown;
  };
  export type MonitorNotification = {
    "email"?: {
      "enabled"?: boolean;
      "recipients"?: ReadonlyArray<string>;
      "includeDiffs"?: boolean;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
  export type MonitorTarget = ({
    "id"?: string;
    "type": "scrape";
    "urls": ReadonlyArray<string>;
    "scrapeOptions"?: ScrapeOptions;
    [key: string]: unknown;
  } | {
    "id"?: string;
    "type": "crawl";
    "url": string;
    "crawlOptions"?: Record<string, unknown>;
    "scrapeOptions"?: ScrapeOptions;
    [key: string]: unknown;
  } | {
    "id"?: string;
    "type": "search";
    "queries": ReadonlyArray<string>;
    "searchWindow"?: "5m" | "15m" | "1h" | "6h" | "24h" | "7d";
    "maxResults"?: number;
    "includeDomains"?: ReadonlyArray<string>;
    "excludeDomains"?: ReadonlyArray<string>;
    [key: string]: unknown;
  });
  export type MonitorCreateRequest = {
    "name": string;
    "schedule": MonitorSchedule;
    "webhook"?: MonitorWebhook;
    "notification"?: MonitorNotification;
    "targets": ReadonlyArray<MonitorTarget>;
    "retentionDays"?: number;
    "goal"?: string | null;
    "judgeEnabled"?: boolean;
    [key: string]: unknown;
  };
  export type MonitorUpdateRequest = {
    "name"?: string;
    "schedule"?: MonitorSchedule;
    "webhook"?: MonitorWebhook;
    "notification"?: MonitorNotification;
    "targets"?: ReadonlyArray<MonitorTarget>;
    "retentionDays"?: number;
    "goal"?: string | null;
    "judgeEnabled"?: boolean;
    "status"?: "active" | "paused";
    [key: string]: unknown;
  };
  export type MonitorSummary = {
    "totalPages"?: number;
    "same"?: number;
    "changed"?: number;
    "new"?: number;
    "removed"?: number;
    "error"?: number;
    [key: string]: unknown;
  };
  export type Monitor = {
    "id"?: string;
    "name"?: string;
    "status"?: "active" | "paused" | "deleted";
    "schedule"?: {
      "cron"?: string;
      "timezone"?: string;
      [key: string]: unknown;
    };
    "nextRunAt"?: string | null;
    "lastRunAt"?: string | null;
    "currentCheckId"?: string | null;
    "targets"?: ReadonlyArray<MonitorTarget>;
    "webhook"?: MonitorWebhook;
    "notification"?: MonitorNotification;
    "retentionDays"?: number;
    "estimatedCreditsPerMonth"?: number | null;
    "lastCheckSummary"?: MonitorSummary;
    "goal"?: string | null;
    "judgeEnabled"?: boolean;
    "createdAt"?: string;
    "updatedAt"?: string;
    [key: string]: unknown;
  };
  export type MonitorCheck = {
    "id"?: string;
    "monitorId"?: string;
    "status"?: "queued" | "running" | "completed" | "failed" | "partial" | "skipped_overlap" | "skipped_no_credits";
    "trigger"?: "scheduled" | "manual";
    "scheduledFor"?: string | null;
    "startedAt"?: string | null;
    "finishedAt"?: string | null;
    "estimatedCredits"?: number | null;
    "reservedCredits"?: number | null;
    "actualCredits"?: number | null;
    "billingStatus"?: string;
    "summary"?: MonitorSummary;
    "targetResults"?: ReadonlyArray<unknown> | null;
    "notificationStatus"?: Record<string, unknown> | null;
    "error"?: string | null;
    "createdAt"?: string;
    "updatedAt"?: string;
    [key: string]: unknown;
  };
  export type MonitorCheckPage = {
    "id"?: string;
    "targetId"?: string;
    "url"?: string;
    "status"?: "same" | "new" | "changed" | "removed" | "error";
    "previousScrapeId"?: string | null;
    "currentScrapeId"?: string | null;
    "statusCode"?: number | null;
    "error"?: string | null;
    "metadata"?: Record<string, unknown> | null;
    "judgment"?: MonitorPageJudgment;
    "diff"?: {
      "text"?: string;
      "json"?: Record<string, unknown>;
      [key: string]: unknown;
    } | null;
    "snapshot"?: {
      "json"?: Record<string, unknown>;
      [key: string]: unknown;
    } | null;
    "createdAt"?: string;
    [key: string]: unknown;
  };
  export type MonitorPageJudgment = {
    "meaningful"?: boolean;
    "confidence"?: "high" | "medium" | "low";
    "reason"?: string;
    "meaningfulChanges"?: ReadonlyArray<{
      "type"?: "added" | "removed" | "changed";
      "before"?: string | null;
      "after"?: string | null;
      "reason"?: string;
      [key: string]: unknown;
    }>;
    [key: string]: unknown;
  } | null;
  export type MonitorResponse = {
    "success"?: boolean;
    "data"?: Monitor;
    [key: string]: unknown;
  };
  export type MonitorListResponse = {
    "success"?: boolean;
    "data"?: ReadonlyArray<Monitor>;
    [key: string]: unknown;
  };
  export type MonitorRunResponse = {
    "success"?: boolean;
    "id"?: string;
    "data"?: MonitorCheck;
    [key: string]: unknown;
  };
  export type MonitorCheckListResponse = {
    "success"?: boolean;
    "data"?: ReadonlyArray<MonitorCheck>;
    [key: string]: unknown;
  };
  export type MonitorCheckDetailResponse = {
    "success"?: boolean;
    "next"?: string | null;
    "data"?: (MonitorCheck & {
      "pages"?: ReadonlyArray<MonitorCheckPage>;
      "next"?: string | null;
      [key: string]: unknown;
    });
    [key: string]: unknown;
  };
  export type Formats = ReadonlyArray<({
    "type": "markdown";
    [key: string]: unknown;
  } | {
    "type": "summary";
    [key: string]: unknown;
  } | {
    "type": "html";
    [key: string]: unknown;
  } | {
    "type": "rawHtml";
    [key: string]: unknown;
  } | {
    "type": "rawBase64";
    [key: string]: unknown;
  } | {
    "type": "links";
    [key: string]: unknown;
  } | {
    "type": "images";
    [key: string]: unknown;
  } | {
    "type": "attributes";
    "selectors": ReadonlyArray<{
      "selector": string;
      "attribute": string;
    }>;
    [key: string]: unknown;
  } | {
    "type": "screenshot";
    "fullPage"?: boolean;
    "quality"?: number;
    "viewport"?: {
      "width": number;
      "height": number;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  } | {
    "type": "json";
    "schema"?: Record<string, unknown>;
    "prompt"?: string;
    "checkPromptInjection"?: boolean;
    [key: string]: unknown;
  } | {
    "type": "changeTracking";
    "modes"?: ReadonlyArray<"git-diff" | "json">;
    "schema"?: Record<string, unknown>;
    "prompt"?: string;
    "tag"?: string | null;
    [key: string]: unknown;
  } | {
    "type": "branding";
    [key: string]: unknown;
  } | {
    "type": "product";
    [key: string]: unknown;
  } | {
    "type": "menu";
    [key: string]: unknown;
  } | {
    "type": "audio";
    [key: string]: unknown;
  } | {
    "type": "video";
    [key: string]: unknown;
  } | {
    "type": "question";
    "question": string;
    [key: string]: unknown;
  } | {
    "type": "highlights";
    "query": string;
    [key: string]: unknown;
  })>;
  export type ParseFormats = ReadonlyArray<({
    "type": "markdown";
    [key: string]: unknown;
  } | {
    "type": "summary";
    [key: string]: unknown;
  } | {
    "type": "html";
    [key: string]: unknown;
  } | {
    "type": "rawHtml";
    [key: string]: unknown;
  } | {
    "type": "links";
    [key: string]: unknown;
  } | {
    "type": "images";
    [key: string]: unknown;
  } | {
    "type": "json";
    "schema"?: Record<string, unknown>;
    "prompt"?: string;
    [key: string]: unknown;
  })>;
  export type ParseOptions = {
    "formats"?: ParseFormats;
    "onlyMainContent"?: boolean;
    "includeTags"?: ReadonlyArray<string>;
    "excludeTags"?: ReadonlyArray<string>;
    "headers"?: Record<string, unknown>;
    "timeout"?: number;
    "parsers"?: ReadonlyArray<({
      "type": "pdf";
      "mode"?: "fast" | "auto" | "ocr";
      "maxPages"?: number;
      "pages"?: boolean;
      "blocks"?: boolean;
      "pageMarkers"?: boolean;
    })>;
    "skipTlsVerification"?: boolean;
    "removeBase64Images"?: boolean;
    "blockAds"?: boolean;
    "checkPromptInjection"?: boolean;
    "redactPII"?: (boolean | RedactPIIOptions);
    "proxy"?: "basic" | "auto";
    "origin"?: string;
    "integration"?: string | null;
    "auditMetadata"?: AuditMetadata;
    "zeroDataRetention"?: boolean;
    [key: string]: unknown;
  };
  export type ScrapeOptions = {
    "formats"?: Formats;
    "onlyMainContent"?: boolean;
    "onlyCleanContent"?: boolean;
    "includeTags"?: ReadonlyArray<string>;
    "excludeTags"?: ReadonlyArray<string>;
    "maxAge"?: number;
    "minAge"?: number;
    "headers"?: Record<string, unknown>;
    "waitFor"?: number;
    "mobile"?: boolean;
    "skipTlsVerification"?: boolean;
    "timeout"?: number;
    "parsers"?: ReadonlyArray<("pdf" | "image" | {
      "type": "pdf";
      "mode"?: "fast" | "auto" | "ocr";
      "maxPages"?: number;
      "pages"?: boolean;
      "blocks"?: boolean;
      "pageMarkers"?: boolean;
    } | {
      "type": "image";
    })>;
    "actions"?: ReadonlyArray<(({
      "type": "wait";
      "milliseconds": number;
    } | {
      "type": "wait";
      "selector": string;
    }) | {
      "type": "screenshot";
      "fullPage"?: boolean;
      "quality"?: number;
      "viewport"?: {
        "width": number;
        "height": number;
        [key: string]: unknown;
      };
      [key: string]: unknown;
    } | {
      "type": "click";
      "selector": string;
      "all"?: boolean;
      [key: string]: unknown;
    } | {
      "type": "write";
      "text": string;
      [key: string]: unknown;
    } | {
      "type": "press";
      "key": string;
      [key: string]: unknown;
    } | {
      "type": "scroll";
      "direction"?: "up" | "down";
      "selector"?: string;
      [key: string]: unknown;
    } | {
      "type": "scrape";
      [key: string]: unknown;
    } | {
      "type": "executeJavascript";
      "script": string;
      [key: string]: unknown;
    } | {
      "type": "pdf";
      "format"?: "A0" | "A1" | "A2" | "A3" | "A4" | "A5" | "A6" | "Letter" | "Legal" | "Tabloid" | "Ledger";
      "landscape"?: boolean;
      "scale"?: number;
      [key: string]: unknown;
    })>;
    "location"?: {
      "country"?: string;
      "languages"?: ReadonlyArray<string>;
      [key: string]: unknown;
    };
    "removeBase64Images"?: boolean;
    "blockAds"?: boolean;
    "proxy"?: "basic" | "enhanced" | "auto";
    "storeInCache"?: boolean;
    "lockdown"?: boolean;
    "checkPromptInjection"?: boolean;
    "redactPII"?: (boolean | RedactPIIOptions);
    "profile"?: {
      "name": string;
      "saveChanges"?: boolean;
      [key: string]: unknown;
    };
    "threatProtection"?: ThreatProtectionOverride;
    "auditMetadata"?: AuditMetadata;
    [key: string]: unknown;
  };
  export type ScrapeResponse = {
    "success"?: boolean;
    "data"?: {
      "markdown"?: string;
      "pages"?: ReadonlyArray<{
        "pageNumber"?: number;
        "markdown"?: string;
        [key: string]: unknown;
      }> | null;
      "blocks"?: ReadonlyArray<{
        "pageNumber"?: number;
        "width"?: number | null;
        "height"?: number | null;
        "status"?: string;
        "items"?: ReadonlyArray<{
          "id"?: string;
          "type"?: string;
          "label"?: string | null;
          "bbox"?: ReadonlyArray<number> | null;
          "content"?: string;
          "markdownSpan"?: ReadonlyArray<number> | null;
          "readingOrder"?: number;
          "source"?: string | null;
          "confidence"?: {
            "layout"?: number | null;
            "ocr"?: number | null;
            [key: string]: unknown;
          };
          [key: string]: unknown;
        }>;
        [key: string]: unknown;
      }> | null;
      "summary"?: string | null;
      "html"?: string | null;
      "rawHtml"?: string | null;
      "rawBase64"?: string | null;
      "screenshot"?: string | null;
      "audio"?: string | null;
      "video"?: string | null;
      "answer"?: string | null;
      "highlights"?: string | null;
      "links"?: ReadonlyArray<string>;
      "attributes"?: ReadonlyArray<{
        "selector"?: string;
        "attribute"?: string;
        "values"?: ReadonlyArray<string>;
        [key: string]: unknown;
      }>;
      "actions"?: {
        "screenshots"?: ReadonlyArray<string>;
        "scrapes"?: ReadonlyArray<{
          "url"?: string;
          "html"?: string;
          [key: string]: unknown;
        }>;
        "javascriptReturns"?: ReadonlyArray<{
          "type"?: string;
          "value"?: unknown;
          [key: string]: unknown;
        }>;
        "pdfs"?: ReadonlyArray<string>;
        [key: string]: unknown;
      } | null;
      "metadata"?: {
        "title"?: (string | ReadonlyArray<string>);
        "description"?: (string | ReadonlyArray<string>);
        "language"?: (string | null | ReadonlyArray<string> | null);
        "sourceURL"?: string;
        "url"?: string;
        "keywords"?: (string | ReadonlyArray<string>);
        "ogLocaleAlternate"?: ReadonlyArray<string>;
        "<any other metadata> "?: (string | ReadonlyArray<string>);
        "statusCode"?: number;
        "numPages"?: number;
        "totalPages"?: number;
        "contentType"?: string;
        "error"?: string | null;
        "concurrencyLimited"?: boolean;
        "concurrencyQueueDurationMs"?: number;
        "provider"?: {
          "id"?: string;
          "creditsCost"?: number;
          "steps"?: ReadonlyArray<{
            "provider"?: string;
            "status"?: "matched" | "not_found" | "error";
            "creditsCost"?: number;
            [key: string]: unknown;
          }>;
          [key: string]: unknown;
        };
        [key: string]: unknown;
      };
      "warning"?: string | null;
      "changeTracking"?: {
        "previousScrapeAt"?: string | null;
        "changeStatus"?: "new" | "same" | "changed" | "removed";
        "visibility"?: "visible" | "hidden";
        "diff"?: string | null;
        "json"?: Record<string, unknown> | null;
        [key: string]: unknown;
      } | null;
      "branding"?: {
        "colorScheme"?: "light" | "dark";
        "logo"?: string | null;
        "colors"?: {
          "primary"?: string;
          "secondary"?: string;
          "accent"?: string;
          "background"?: string;
          "textPrimary"?: string;
          "textSecondary"?: string;
          "link"?: string;
          "success"?: string;
          "warning"?: string;
          "error"?: string;
          [key: string]: unknown;
        } | null;
        "fonts"?: ReadonlyArray<{
          "family"?: string;
          [key: string]: unknown;
        }> | null;
        "typography"?: {
          "fontFamilies"?: {
            "primary"?: string;
            "heading"?: string;
            "code"?: string;
            [key: string]: unknown;
          };
          "fontSizes"?: {
            "h1"?: string;
            "h2"?: string;
            "h3"?: string;
            "body"?: string;
            [key: string]: unknown;
          };
          "fontWeights"?: {
            "light"?: number;
            "regular"?: number;
            "medium"?: number;
            "bold"?: number;
            [key: string]: unknown;
          };
          "lineHeights"?: {
            "heading"?: string;
            "body"?: string;
            [key: string]: unknown;
          };
          [key: string]: unknown;
        } | null;
        "spacing"?: {
          "baseUnit"?: number;
          "borderRadius"?: string;
          "padding"?: Record<string, unknown>;
          "margins"?: Record<string, unknown>;
          [key: string]: unknown;
        } | null;
        "components"?: {
          "buttonPrimary"?: {
            "background"?: string;
            "textColor"?: string;
            "borderRadius"?: string;
            [key: string]: unknown;
          };
          "buttonSecondary"?: {
            "background"?: string;
            "textColor"?: string;
            "borderColor"?: string;
            "borderRadius"?: string;
            [key: string]: unknown;
          };
          "input"?: Record<string, unknown>;
          [key: string]: unknown;
        } | null;
        "icons"?: Record<string, unknown> | null;
        "images"?: {
          "logo"?: string;
          "favicon"?: string;
          "ogImage"?: string;
          [key: string]: unknown;
        } | null;
        "animations"?: Record<string, unknown> | null;
        "layout"?: Record<string, unknown> | null;
        "personality"?: Record<string, unknown> | null;
        [key: string]: unknown;
      } | null;
      "product"?: {
        "title": string;
        "brand"?: string;
        "category"?: string;
        "url": string;
        "description"?: string;
        "variants": ReadonlyArray<{
          "id"?: string;
          "sku"?: string;
          "title"?: string;
          "values"?: Record<string, string>;
          "price"?: {
            "amount": number;
            "currency"?: string;
            "formatted"?: string;
            [key: string]: unknown;
          };
          "sale"?: {
            "originalPrice": {
              "amount": number;
              "currency"?: string;
              "formatted"?: string;
              [key: string]: unknown;
            };
            [key: string]: unknown;
          };
          "availability": {
            "inStock": boolean;
            "text"?: string;
            [key: string]: unknown;
          };
          "images"?: ReadonlyArray<{
            "url": string;
            "alt"?: string;
            [key: string]: unknown;
          }>;
          [key: string]: unknown;
        }>;
        [key: string]: unknown;
      } | null;
      "menu"?: {
        "isMenu": boolean;
        "confidence"?: number;
        "merchant"?: {
          "name": string;
          "type"?: string;
          [key: string]: unknown;
        };
        "currency"?: string;
        "sections": ReadonlyArray<{
          "id"?: string;
          "name": string;
          "description"?: string | null;
          "items": ReadonlyArray<{
            "id"?: string;
            "name": string;
            "description"?: string | null;
            "images"?: ReadonlyArray<{
              "url": string;
              "alt"?: string | null;
              [key: string]: unknown;
            }>;
            "price"?: {
              "amount": number;
              "currency"?: string;
              "formatted"?: string;
              [key: string]: unknown;
            };
            "availability"?: {
              "inStock": boolean;
              "text"?: string | null;
              [key: string]: unknown;
            };
            "dietary"?: ReadonlyArray<string>;
            "calories"?: number | null;
            "optionGroups"?: ReadonlyArray<Record<string, unknown>>;
            "identifiers"?: {
              "merchantItemId"?: string;
              [key: string]: unknown;
            };
            "url"?: string | null;
            "sourceUrl"?: string | null;
            [key: string]: unknown;
          }>;
          [key: string]: unknown;
        }>;
        "sourceUrl"?: string | null;
        [key: string]: unknown;
      } | null;
      "tools"?: ReadonlyArray<DiscoveredTool> | null;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
  export type AlexandriaCall = {
    "provider": string;
    "capability": string;
    "options"?: (FindToolsOptions | Record<string, unknown>);
    [key: string]: unknown;
  };
  export type AlexandriaResult = ({
    "provider": string;
    "capability": string;
    "creditsCost": number;
    "data": (FindToolsData | unknown);
    "records"?: number;
    "upstreamStatus"?: number;
    [key: string]: unknown;
  } | {
    "provider"?: string;
    "capability"?: string;
    "creditsCost"?: number;
    "error": {
      "code": string;
      "message": string;
      "status"?: number;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  });
  export type DiscoveredTool = {
    "id"?: string;
    "provider": string;
    "capability": string;
    "name"?: string;
    "description": string;
    "creditsCost"?: number;
    "perRecord"?: boolean;
    "options"?: ReadonlyArray<{
      "name"?: string;
      "type"?: string;
      [key: string]: unknown;
    }>;
    "response"?: {
      "about"?: string;
      "key"?: string;
      "fields"?: ReadonlyArray<Record<string, unknown>>;
      [key: string]: unknown;
    };
    "matchedBy"?: ReadonlyArray<"semantic" | "domain">;
    "matchedUrls"?: ReadonlyArray<string>;
    [key: string]: unknown;
  };
  export type FindToolsOptions = {
    "query"?: string;
    "urls"?: ReadonlyArray<string>;
    "providers"?: ReadonlyArray<string>;
    "categories"?: ReadonlyArray<string>;
    "groups"?: ReadonlyArray<string>;
    "capabilities"?: ReadonlyArray<string>;
    "level"?: "providers" | "groups" | "tools";
    "expand"?: ReadonlyArray<"options" | "response" | "examples">;
    "limit"?: number;
    "offset"?: number;
    [key: string]: unknown;
  };
  export type FindToolsData = {
    "level": "providers" | "groups" | "tools";
    "items": ReadonlyArray<{
      "id": string;
      "name": string;
      "next"?: (AlexandriaCall);
      "execute"?: {
        "provider": string;
        "capability": string;
        [key: string]: unknown;
      };
      [key: string]: unknown;
    }>;
    "total": number;
    "next"?: (AlexandriaCall) | null;
    [key: string]: unknown;
  };
  export type AlexandriaScrapeResponse = {
    "success": boolean;
    "scrape_id": string;
    "data": {
      "alexandria": ReadonlyArray<AlexandriaResult>;
      "creditsCost": number;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
  export type CrawlStatusResponseObj = {
    "status"?: string;
    "total"?: number;
    "completed"?: number;
    "creditsUsed"?: number;
    "expiresAt"?: string;
    "createdAt"?: string;
    "completedAt"?: string;
    "duration"?: number;
    "next"?: string | null;
    "data"?: ReadonlyArray<{
      "markdown"?: string;
      "pages"?: ReadonlyArray<{
        "pageNumber"?: number;
        "markdown"?: string;
        [key: string]: unknown;
      }> | null;
      "blocks"?: ReadonlyArray<{
        "pageNumber"?: number;
        "width"?: number | null;
        "height"?: number | null;
        "status"?: string;
        "items"?: ReadonlyArray<{
          "id"?: string;
          "type"?: string;
          "label"?: string | null;
          "bbox"?: ReadonlyArray<number> | null;
          "content"?: string;
          "markdownSpan"?: ReadonlyArray<number> | null;
          "readingOrder"?: number;
          "source"?: string | null;
          "confidence"?: {
            "layout"?: number | null;
            "ocr"?: number | null;
            [key: string]: unknown;
          };
          [key: string]: unknown;
        }>;
        [key: string]: unknown;
      }> | null;
      "html"?: string | null;
      "rawHtml"?: string | null;
      "rawBase64"?: string | null;
      "links"?: ReadonlyArray<string>;
      "screenshot"?: string | null;
      "metadata"?: {
        "title"?: (string | ReadonlyArray<string>);
        "description"?: (string | ReadonlyArray<string>);
        "language"?: (string | null | ReadonlyArray<string> | null);
        "sourceURL"?: string;
        "url"?: string;
        "keywords"?: (string | ReadonlyArray<string>);
        "ogLocaleAlternate"?: ReadonlyArray<string>;
        "<any other metadata> "?: string;
        "statusCode"?: number;
        "numPages"?: number;
        "totalPages"?: number;
        "error"?: string | null;
        "concurrencyLimited"?: boolean;
        "concurrencyQueueDurationMs"?: number;
        [key: string]: unknown;
      };
      [key: string]: unknown;
    }>;
    [key: string]: unknown;
  };
  export type CrawlErrorsResponseObj = {
    "errors"?: ReadonlyArray<{
      "id"?: string;
      "timestamp"?: string | null;
      "url"?: string;
      "error"?: string;
      [key: string]: unknown;
    }>;
    "robotsBlocked"?: ReadonlyArray<string>;
    [key: string]: unknown;
  };
  export type BatchScrapeStatusResponseObj = {
    "status"?: string;
    "total"?: number;
    "completed"?: number;
    "creditsUsed"?: number;
    "expiresAt"?: string;
    "createdAt"?: string;
    "completedAt"?: string;
    "duration"?: number;
    "next"?: string | null;
    "data"?: ReadonlyArray<{
      "markdown"?: string;
      "pages"?: ReadonlyArray<{
        "pageNumber"?: number;
        "markdown"?: string;
        [key: string]: unknown;
      }> | null;
      "blocks"?: ReadonlyArray<{
        "pageNumber"?: number;
        "width"?: number | null;
        "height"?: number | null;
        "status"?: string;
        "items"?: ReadonlyArray<{
          "id"?: string;
          "type"?: string;
          "label"?: string | null;
          "bbox"?: ReadonlyArray<number> | null;
          "content"?: string;
          "markdownSpan"?: ReadonlyArray<number> | null;
          "readingOrder"?: number;
          "source"?: string | null;
          "confidence"?: {
            "layout"?: number | null;
            "ocr"?: number | null;
            [key: string]: unknown;
          };
          [key: string]: unknown;
        }>;
        [key: string]: unknown;
      }> | null;
      "html"?: string | null;
      "rawHtml"?: string | null;
      "rawBase64"?: string | null;
      "links"?: ReadonlyArray<string>;
      "screenshot"?: string | null;
      "metadata"?: {
        "title"?: (string | ReadonlyArray<string>);
        "description"?: (string | ReadonlyArray<string>);
        "language"?: (string | null | ReadonlyArray<string> | null);
        "sourceURL"?: string;
        "url"?: string;
        "keywords"?: (string | ReadonlyArray<string>);
        "ogLocaleAlternate"?: ReadonlyArray<string>;
        "<any other metadata> "?: string;
        "statusCode"?: number;
        "numPages"?: number;
        "totalPages"?: number;
        "error"?: string | null;
        "concurrencyLimited"?: boolean;
        "concurrencyQueueDurationMs"?: number;
        [key: string]: unknown;
      };
      [key: string]: unknown;
    }>;
    [key: string]: unknown;
  };
  export type CrawlResponse = {
    "success"?: boolean;
    "id"?: string;
    "url"?: string;
    [key: string]: unknown;
  };
  export type BatchScrapeResponseObj = {
    "success"?: boolean;
    "id"?: string;
    "url"?: string;
    "invalidURLs"?: ReadonlyArray<string> | null;
    [key: string]: unknown;
  };
  export type MapResponse = {
    "success"?: boolean;
    "links"?: ReadonlyArray<{
      "url": string;
      "title"?: string;
      "description"?: string;
      [key: string]: unknown;
    }>;
    [key: string]: unknown;
  };
  export type ExtractResponse = {
    "success"?: boolean;
    "id"?: string;
    "invalidURLs"?: ReadonlyArray<string> | null;
    [key: string]: unknown;
  };
  export type ExtractStatusResponse = {
    "success"?: boolean;
    "data"?: Record<string, unknown>;
    "status"?: "completed" | "processing" | "failed" | "cancelled";
    "expiresAt"?: string;
    "tokensUsed"?: number;
    [key: string]: unknown;
  };
  export type SearchFeedbackRequest = {
    "rating": "good" | "partial" | "bad";
    "valuableSources"?: ReadonlyArray<{
      "url": string;
      "reason"?: string;
      [key: string]: unknown;
    }>;
    "valuableResults"?: ReadonlyArray<{
      "source": "web" | "images" | "news";
      "position": number;
      "reason"?: string;
      [key: string]: unknown;
    }>;
    "missingContent"?: ReadonlyArray<{
      "topic": string;
      "description"?: string;
      [key: string]: unknown;
    }>;
    "querySuggestions"?: string;
    "origin"?: string;
    "integration"?: string | null;
    [key: string]: unknown;
  };
  export type SupportAskRequest = {
    "question": string;
    "rationale"?: string;
    [key: string]: unknown;
  };
  export type SupportAskResponse = {
    "answer"?: string;
    "confidence"?: "high" | "medium" | "low";
    "fixParameters"?: Record<string, unknown> | null;
    "validation"?: Record<string, unknown> | null;
    "feedback"?: Record<string, unknown> | null;
    "durationMs"?: number;
    [key: string]: unknown;
  };
  export type SupportDocsSearchRequest = {
    "question": string;
    [key: string]: unknown;
  };
  export type SupportDocsSearchResponse = {
    "requestId"?: string;
    "answer"?: string;
    "evidence"?: ReadonlyArray<{
      "pathOrUrl"?: string;
      "reason"?: string;
      [key: string]: unknown;
    }>;
    "usage"?: {
      "inputTokens"?: number;
      "outputTokens"?: number;
      "totalTokens"?: number;
      [key: string]: unknown;
    };
    "durationMs"?: number;
    [key: string]: unknown;
  };
  export type SupportProxyErrorResponse = {
    "error"?: string;
    [key: string]: unknown;
  };
  export type RedactPIIEntity = "PERSON" | "EMAIL" | "PHONE" | "LOCATION" | "FINANCIAL" | "SECRET";
  export type RedactPIIOptions = {
    "mode"?: "accurate" | "aggressive" | "fast";
    "entities"?: ReadonlyArray<RedactPIIEntity>;
    "replaceStyle"?: "tag" | "mask" | "remove";
  };
  export type ResearchIdMap = Record<string, ReadonlyArray<string>>;
  export type ResearchPaperSignals = {
    "structural": number;
    "semantic": number;
    "articleRank": number;
    "seedOverlap": number;
    [key: string]: unknown;
  };
  export type ResearchPaperResult = {
    "paperId": string;
    "primaryId": string;
    "ids"?: ResearchIdMap;
    "title": string;
    "abstract": string;
    "score": number;
    "signals"?: ResearchPaperSignals;
    [key: string]: unknown;
  };
  export type ResearchPaperMetadata = {
    "paperId": string;
    "ids"?: ResearchIdMap;
    "title": string;
    "abstract": string;
    "authors"?: string;
    "categories"?: ReadonlyArray<string>;
    "createdDate"?: string;
    "updateDate"?: string;
    [key: string]: unknown;
  };
  export type ResearchPassage = {
    "text": string;
    "score": number;
    [key: string]: unknown;
  };
  export type ResearchSearchPapersResponse = {
    "success": boolean;
    "results": ReadonlyArray<ResearchPaperResult>;
    [key: string]: unknown;
  };
  export type ResearchPaperMetadataResponse = {
    "success": boolean;
    "paper": ResearchPaperMetadata;
    [key: string]: unknown;
  };
  export type ResearchReadPaperResponse = {
    "success": boolean;
    "paper": ResearchPaperMetadata;
    "paperId": string;
    "query": string;
    "passages": ReadonlyArray<ResearchPassage>;
    [key: string]: unknown;
  };
  export type ResearchSimilarPapersResponse = {
    "success": boolean;
    "results": ReadonlyArray<ResearchPaperResult>;
    "poolSize": number;
    "truncated": boolean;
    "note"?: string | null;
    [key: string]: unknown;
  };
  export type DeveloperSearchResult = {
    "id"?: string;
    "type"?: "doc" | "issue" | "pull_request" | "readme";
    "url"?: string;
    "title"?: string;
    "passages"?: ReadonlyArray<{
      "text"?: string;
      [key: string]: unknown;
    }>;
    [key: string]: unknown;
  };
  export type DeveloperSearchResponse = {
    "success"?: boolean;
    "results"?: ReadonlyArray<DeveloperSearchResult>;
    "coverage"?: {
      "doc"?: "ok" | "degraded" | "unavailable" | "skipped";
      "issue"?: "ok" | "degraded" | "unavailable" | "skipped";
      "pull_request"?: "ok" | "degraded" | "unavailable" | "skipped";
      "readme"?: "ok" | "degraded" | "unavailable" | "skipped";
      [key: string]: unknown;
    };
    "reranked"?: boolean;
    "repos"?: ReadonlyArray<{
      "repo"?: string;
      "indexed"?: boolean;
      "types"?: {
        "issue"?: boolean;
        "pullRequest"?: boolean;
        "readme"?: boolean;
        [key: string]: unknown;
      };
      [key: string]: unknown;
    }>;
    "sources"?: ReadonlyArray<{
      "source"?: string;
      "indexed"?: boolean;
      [key: string]: unknown;
    }>;
    [key: string]: unknown;
  };
  export type GovSearchResponse = {
    "success"?: boolean;
    "data"?: {
      "web"?: ReadonlyArray<{
        "url"?: string;
        "title"?: string;
        "description"?: string;
        "position"?: number;
        [key: string]: unknown;
      }>;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
  export type EndpointFeedbackRequest = (SearchFeedbackRequest & {
    "endpoint": "search" | "scrape" | "parse" | "map";
    "jobId": string;
    "issues"?: ReadonlyArray<string>;
    "tags"?: ReadonlyArray<string>;
    "note"?: string;
    "url"?: string;
    "pageNumbers"?: ReadonlyArray<number>;
    "metadata"?: Record<string, unknown>;
    "missingContent"?: ReadonlyArray<{
      "topic": string;
      "description"?: string;
      [key: string]: unknown;
    }>;
    [key: string]: unknown;
  });
  export type FeedbackResponse = {
    "success": boolean;
    "feedbackId": string;
    "creditsRefunded": number;
    "alreadySubmitted"?: boolean;
    "dailyCapReached"?: boolean;
    "creditsRefundedToday"?: number;
    "dailyRefundCap"?: number;
    "warning"?: string;
    [key: string]: unknown;
  };
  export type FeedbackErrorResponse = {
    "success": boolean;
    "error": string;
    "feedbackErrorCode"?: string;
    "details"?: ReadonlyArray<Record<string, unknown>>;
    [key: string]: unknown;
  };
  export type ThreatProtectionOverride = {
    "mode"?: "off" | "normal";
    "riskScoreThreshold"?: number;
    "blacklist"?: ReadonlyArray<string>;
    "whitelist"?: ReadonlyArray<string>;
    "blockedTlds"?: ReadonlyArray<string>;
    "failurePolicy"?: "open" | "closed";
    [key: string]: unknown;
  };
  export type AgentPendingApproval = {
    "id"?: string;
    "kind"?: "calls" | "terms";
    "reason"?: string;
    "calls"?: ReadonlyArray<{
      "id"?: string;
      "provider"?: string;
      "capability"?: string;
      "input"?: Record<string, unknown>;
      "more"?: ReadonlyArray<Record<string, unknown>>;
      "creditsEstimate"?: number | null;
      [key: string]: unknown;
    }>;
    "terms"?: ReadonlyArray<{
      "provider"?: string;
      "name"?: string;
      "capability"?: string;
      "adds"?: string;
      "version"?: string;
      "digest"?: string | null;
      "url"?: string;
      [key: string]: unknown;
    }>;
    "resolution"?: {
      "approved"?: boolean;
      "callIds"?: ReadonlyArray<string>;
      "always"?: boolean;
      "byRunId"?: string;
      [key: string]: unknown;
    } | null;
    [key: string]: unknown;
  };
  export type AgentExchangeSummary = {
    "enabled"?: boolean;
    "toolkits"?: ReadonlyArray<string>;
    "requireApproval"?: boolean;
    "onTermsRequired"?: "skip" | "ask";
    "paidCalls"?: number;
    "creditsUsed"?: number | null;
    "skippedProviders"?: ReadonlyArray<{
      "provider"?: string;
      "name"?: string;
      "capability"?: string;
      "adds"?: string;
      "reason"?: "terms_required";
      "version"?: string;
      "termsUrl"?: string;
      [key: string]: unknown;
    }>;
    "requiresAction"?: {
      "type"?: "accept_terms";
      "approvalId"?: string;
      "providers"?: ReadonlyArray<{
        "provider"?: string;
        "name"?: string;
        "capability"?: string;
        "adds"?: string;
        "version"?: string;
        "digest"?: string | null;
        "url"?: string;
        "show"?: Record<string, unknown>;
        "accept"?: Record<string, unknown>;
        [key: string]: unknown;
      }>;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
}

export type FirecrawlCreateMonitorBody = FirecrawlSchemas.MonitorCreateRequest;
export type FirecrawlCreateMonitorInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { body: FirecrawlCreateMonitorBody; };
export type FirecrawlCreateMonitorResponse = FirecrawlSchemas.MonitorResponse;
export type FirecrawlListMonitorsQuery = { "limit"?: number; "offset"?: number; };
export type FirecrawlListMonitorsInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { query?: FirecrawlListMonitorsQuery; };
export type FirecrawlListMonitorsResponse = FirecrawlSchemas.MonitorListResponse;
export type FirecrawlGetMonitorPath = { "monitorId": string; };
export type FirecrawlGetMonitorInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { path: FirecrawlGetMonitorPath; };
export type FirecrawlGetMonitorResponse = FirecrawlSchemas.MonitorResponse;
export type FirecrawlUpdateMonitorPath = { "monitorId": string; };
export type FirecrawlUpdateMonitorBody = FirecrawlSchemas.MonitorUpdateRequest;
export type FirecrawlUpdateMonitorInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { path: FirecrawlUpdateMonitorPath; body: FirecrawlUpdateMonitorBody; };
export type FirecrawlUpdateMonitorResponse = FirecrawlSchemas.MonitorResponse;
export type FirecrawlDeleteMonitorPath = { "monitorId": string; };
export type FirecrawlDeleteMonitorInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { path: FirecrawlDeleteMonitorPath; };
export type FirecrawlDeleteMonitorResponse = FirecrawlSchemas.SuccessResponse;
export type FirecrawlRunMonitorPath = { "monitorId": string; };
export type FirecrawlRunMonitorInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { path: FirecrawlRunMonitorPath; };
export type FirecrawlRunMonitorResponse = FirecrawlSchemas.MonitorRunResponse;
export type FirecrawlListMonitorChecksPath = { "monitorId": string; };
export type FirecrawlListMonitorChecksQuery = { "limit"?: number; "offset"?: number; "status"?: "queued" | "running" | "completed" | "failed" | "partial" | "skipped_overlap" | "skipped_no_credits"; };
export type FirecrawlListMonitorChecksInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { path: FirecrawlListMonitorChecksPath; query?: FirecrawlListMonitorChecksQuery; };
export type FirecrawlListMonitorChecksResponse = FirecrawlSchemas.MonitorCheckListResponse;
export type FirecrawlGetMonitorCheckPath = { "monitorId": string; "checkId": string; };
export type FirecrawlGetMonitorCheckQuery = { "limit"?: number; "skip"?: number; "status"?: "same" | "new" | "changed" | "removed" | "error"; };
export type FirecrawlGetMonitorCheckInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { path: FirecrawlGetMonitorCheckPath; query?: FirecrawlGetMonitorCheckQuery; };
export type FirecrawlGetMonitorCheckResponse = FirecrawlSchemas.MonitorCheckDetailResponse;
export type FirecrawlScrapeBody = ({
  "url": string;
  [key: string]: unknown;
} & FirecrawlSchemas.ScrapeOptions & {
  "zeroDataRetention"?: boolean;
  [key: string]: unknown;
} & {
  "alexandria"?: (FirecrawlSchemas.AlexandriaCall | ReadonlyArray<FirecrawlSchemas.AlexandriaCall>);
  "domainTools"?: boolean;
  "toolDetail"?: "compact" | "summary" | "full";
  [key: string]: unknown;
});
export type FirecrawlScrapeInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { body: FirecrawlScrapeBody; };
export type FirecrawlScrapeResponse = (FirecrawlSchemas.ScrapeResponse | FirecrawlSchemas.AlexandriaScrapeResponse);
export type FirecrawlInteractWithScrapeBrowserSessionPath = { "jobId": string; };
export type FirecrawlInteractWithScrapeBrowserSessionBody = {
  "code": string;
  "language"?: "python" | "node" | "bash";
  "timeout"?: number;
  "origin"?: string;
  [key: string]: unknown;
};
export type FirecrawlInteractWithScrapeBrowserSessionInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { path: FirecrawlInteractWithScrapeBrowserSessionPath; body: FirecrawlInteractWithScrapeBrowserSessionBody; };
export type FirecrawlInteractWithScrapeBrowserSessionResponse = {
  "success"?: boolean;
  "cdpUrl"?: string | null;
  "liveViewUrl"?: string | null;
  "interactiveLiveViewUrl"?: string | null;
  "output"?: string | null;
  "stdout"?: string | null;
  "result"?: string | null;
  "stderr"?: string | null;
  "exitCode"?: number | null;
  "killed"?: boolean;
  "error"?: string | null;
  [key: string]: unknown;
};
export type FirecrawlStopInteractiveScrapeBrowserSessionPath = { "jobId": string; };
export type FirecrawlStopInteractiveScrapeBrowserSessionInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { path: FirecrawlStopInteractiveScrapeBrowserSessionPath; };
export type FirecrawlStopInteractiveScrapeBrowserSessionResponse = {
  "success"?: boolean;
  [key: string]: unknown;
};
export type FirecrawlParseFileInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { rawBody: FormData; };
export type FirecrawlParseFileResponse = FirecrawlSchemas.ScrapeResponse;
export type FirecrawlGetParseFormatsInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & {  };
export type FirecrawlGetParseFormatsResponse = {
  "success"?: boolean;
  "data"?: {
    "formats"?: ReadonlyArray<{
      "format"?: string;
      "kind"?: "document" | "image";
      "extensions"?: ReadonlyArray<string>;
      "mimeTypes"?: ReadonlyArray<string>;
      "available"?: boolean;
      [key: string]: unknown;
    }>;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};
export type FirecrawlBatchScrapeBody = ({
  "urls": ReadonlyArray<string>;
  "webhook"?: {
    "url": string;
    "headers"?: Record<string, string>;
    "metadata"?: Record<string, unknown>;
    "events"?: ReadonlyArray<"completed" | "page" | "failed" | "started">;
    [key: string]: unknown;
  };
  "maxConcurrency"?: number;
  "ignoreInvalidURLs"?: boolean;
  [key: string]: unknown;
} & FirecrawlSchemas.ScrapeOptions & {
  "zeroDataRetention"?: boolean;
  [key: string]: unknown;
});
export type FirecrawlBatchScrapeInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { body: FirecrawlBatchScrapeBody; };
export type FirecrawlBatchScrapeResponse = FirecrawlSchemas.BatchScrapeResponseObj;
export type FirecrawlGetBatchScrapeStatusPath = { "id": string; };
export type FirecrawlGetBatchScrapeStatusInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { path: FirecrawlGetBatchScrapeStatusPath; };
export type FirecrawlGetBatchScrapeStatusResponse = FirecrawlSchemas.BatchScrapeStatusResponseObj;
export type FirecrawlCancelBatchScrapePath = { "id": string; };
export type FirecrawlCancelBatchScrapeInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { path: FirecrawlCancelBatchScrapePath; };
export type FirecrawlCancelBatchScrapeResponse = {
  "status"?: "cancelled";
  [key: string]: unknown;
};
export type FirecrawlGetBatchScrapeErrorsPath = { "id": string; };
export type FirecrawlGetBatchScrapeErrorsInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { path: FirecrawlGetBatchScrapeErrorsPath; };
export type FirecrawlGetBatchScrapeErrorsResponse = FirecrawlSchemas.CrawlErrorsResponseObj;
export type FirecrawlGetCrawlStatusPath = { "id": string; };
export type FirecrawlGetCrawlStatusInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { path: FirecrawlGetCrawlStatusPath; };
export type FirecrawlGetCrawlStatusResponse = FirecrawlSchemas.CrawlStatusResponseObj;
export type FirecrawlCancelCrawlPath = { "id": string; };
export type FirecrawlCancelCrawlInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { path: FirecrawlCancelCrawlPath; };
export type FirecrawlCancelCrawlResponse = {
  "status"?: "cancelled";
  [key: string]: unknown;
};
export type FirecrawlGetCrawlErrorsPath = { "id": string; };
export type FirecrawlGetCrawlErrorsInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { path: FirecrawlGetCrawlErrorsPath; };
export type FirecrawlGetCrawlErrorsResponse = FirecrawlSchemas.CrawlErrorsResponseObj;
export type FirecrawlCrawlBody = {
  "url": string;
  "prompt"?: string;
  "excludePaths"?: ReadonlyArray<string>;
  "includePaths"?: ReadonlyArray<string>;
  "maxDiscoveryDepth"?: number;
  "sitemap"?: "skip" | "include" | "only";
  "ignoreQueryParameters"?: boolean;
  "regexOnFullURL"?: boolean;
  "limit"?: number;
  "crawlEntireDomain"?: boolean;
  "allowExternalLinks"?: boolean;
  "allowSubdomains"?: boolean;
  "ignoreRobotsTxt"?: boolean;
  "robotsUserAgent"?: string;
  "delay"?: number;
  "maxConcurrency"?: number;
  "webhook"?: {
    "url": string;
    "headers"?: Record<string, string>;
    "metadata"?: Record<string, unknown>;
    "events"?: ReadonlyArray<"completed" | "page" | "failed" | "started">;
    [key: string]: unknown;
  };
  "scrapeOptions"?: FirecrawlSchemas.ScrapeOptions;
  "zeroDataRetention"?: boolean;
  [key: string]: unknown;
};
export type FirecrawlCrawlInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { body: FirecrawlCrawlBody; };
export type FirecrawlCrawlResponse = FirecrawlSchemas.CrawlResponse;
export type FirecrawlCrawlParamsPreviewBody = {
  "url": string;
  "prompt": string;
  [key: string]: unknown;
};
export type FirecrawlCrawlParamsPreviewInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { body: FirecrawlCrawlParamsPreviewBody; };
export type FirecrawlCrawlParamsPreviewResponse = {
  "success"?: boolean;
  "data"?: {
    "url"?: string;
    "includePaths"?: ReadonlyArray<string>;
    "excludePaths"?: ReadonlyArray<string>;
    "maxDepth"?: number;
    "maxDiscoveryDepth"?: number;
    "crawlEntireDomain"?: boolean;
    "allowExternalLinks"?: boolean;
    "allowSubdomains"?: boolean;
    "sitemap"?: "skip" | "include";
    "ignoreQueryParameters"?: boolean;
    "ignoreRobotsTxt"?: boolean;
    "robotsUserAgent"?: string;
    "deduplicateSimilarURLs"?: boolean;
    "delay"?: number;
    "limit"?: number;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};
export type FirecrawlMapBody = {
  "url": string;
  "search"?: string;
  "sitemap"?: "skip" | "include" | "only";
  "includeSubdomains"?: boolean;
  "ignoreQueryParameters"?: boolean;
  "ignoreCache"?: boolean;
  "limit"?: number;
  "timeout"?: number;
  "location"?: {
    "country"?: string;
    "languages"?: ReadonlyArray<string>;
    [key: string]: unknown;
  };
  "auditMetadata"?: FirecrawlSchemas.AuditMetadata;
  "threatProtection"?: FirecrawlSchemas.ThreatProtectionOverride;
  [key: string]: unknown;
};
export type FirecrawlMapInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { body: FirecrawlMapBody; };
export type FirecrawlMapResponse = FirecrawlSchemas.MapResponse;
export type FirecrawlExtractBody = {
  "urls": ReadonlyArray<string>;
  "prompt"?: string;
  "schema"?: Record<string, unknown>;
  "enableWebSearch"?: boolean;
  "ignoreSitemap"?: boolean;
  "includeSubdomains"?: boolean;
  "showSources"?: boolean;
  "scrapeOptions"?: FirecrawlSchemas.ScrapeOptions;
  "ignoreInvalidURLs"?: boolean;
  "threatProtection"?: FirecrawlSchemas.ThreatProtectionOverride;
  [key: string]: unknown;
};
export type FirecrawlExtractInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { body: FirecrawlExtractBody; };
export type FirecrawlExtractResponse = FirecrawlSchemas.ExtractResponse;
export type FirecrawlGetExtractStatusPath = { "id": string; };
export type FirecrawlGetExtractStatusInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { path: FirecrawlGetExtractStatusPath; };
export type FirecrawlGetExtractStatusResponse = FirecrawlSchemas.ExtractStatusResponse;
export type FirecrawlListAgentsQuery = { "before"?: number; };
export type FirecrawlListAgentsInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { query?: FirecrawlListAgentsQuery; };
export type FirecrawlListAgentsResponse = {
  "success"?: boolean;
  "agents"?: ReadonlyArray<{
    "id"?: string;
    "createdAt"?: string;
    "targetHint"?: string;
    "origin"?: string;
    "integration"?: string;
    "settings"?: {
      "hidden"?: boolean;
      "starred"?: boolean;
      "label"?: string;
      [key: string]: unknown;
    };
    "status"?: "processing" | "completed" | "failed";
    "options"?: {
      "urls"?: ReadonlyArray<string>;
      "prompt"?: string;
      "schema"?: Record<string, unknown>;
      "model"?: "spark-2" | "spark-1-pro" | "spark-1-mini";
      "effort"?: "low" | "medium" | "high";
      [key: string]: unknown;
    };
    [key: string]: unknown;
  }>;
  "next"?: string;
  [key: string]: unknown;
};
export type FirecrawlStartAgentBody = {
  "urls"?: ReadonlyArray<string>;
  "prompt": string;
  "schema"?: Record<string, unknown>;
  "maxCredits"?: number;
  "strictConstrainToURLs"?: boolean;
  "model"?: "spark-2" | "spark-1-mini" | "spark-1-pro";
  "effort"?: "low" | "medium" | "high";
  "webhook"?: {
    "url": string;
    "headers"?: Record<string, string>;
    "metadata"?: Record<string, string>;
    "events"?: ReadonlyArray<"started" | "action" | "completed" | "failed" | "cancelled">;
    [key: string]: unknown;
  };
  "auditMetadata"?: FirecrawlSchemas.AuditMetadata;
  "threatProtection"?: FirecrawlSchemas.ThreatProtectionOverride;
  "threadId"?: string;
  "mode"?: "extract" | "chat";
  "zeroDataRetention"?: boolean;
  "location"?: {
    "country": string;
  };
  "exchange"?: {
    "enabled"?: boolean;
    "toolkits"?: ReadonlyArray<string>;
    "maxCalls"?: number;
    "requireApproval"?: boolean;
    "approve"?: {
      "approvalId": string;
      "callIds"?: ReadonlyArray<string>;
      "always"?: boolean;
    };
    "decline"?: {
      "approvalId": string;
    };
    "onTermsRequired"?: "skip" | "ask";
  };
  [key: string]: unknown;
};
export type FirecrawlStartAgentInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { body: FirecrawlStartAgentBody; };
export type FirecrawlStartAgentResponse = {
  "success"?: boolean;
  "id"?: string;
  "threadId"?: string;
  "threadTurn"?: number;
  [key: string]: unknown;
};
export type FirecrawlGetAgentStatusPath = { "jobId": string; };
export type FirecrawlGetAgentStatusInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { path: FirecrawlGetAgentStatusPath; };
export type FirecrawlGetAgentStatusResponse = {
  "success"?: boolean;
  "status"?: "processing" | "completed" | "failed";
  "data"?: Record<string, unknown>;
  "partial"?: unknown;
  "partialSchemaValid"?: boolean;
  "stopReason"?: "credit_limit_reached";
  "message"?: string;
  "model"?: "spark-2" | "spark-1-pro" | "spark-1-mini";
  "effort"?: "low" | "medium" | "high";
  "error"?: string;
  "expiresAt"?: string;
  "creditsUsed"?: number;
  "threadId"?: string;
  "threadTurn"?: number;
  "mode"?: "extract" | "chat";
  "suggestions"?: ReadonlyArray<{
    "label"?: string;
    "prompt"?: string;
    [key: string]: unknown;
  }>;
  "pendingApproval"?: FirecrawlSchemas.AgentPendingApproval;
  "exchange"?: FirecrawlSchemas.AgentExchangeSummary;
  [key: string]: unknown;
};
export type FirecrawlCancelAgentPath = { "jobId": string; };
export type FirecrawlCancelAgentInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { path: FirecrawlCancelAgentPath; };
export type FirecrawlCancelAgentResponse = {
  "success"?: boolean;
  [key: string]: unknown;
};
export type FirecrawlGetAgentTracePath = { "jobId": string; };
export type FirecrawlGetAgentTraceQuery = { "liveView"?: "true" | "false"; };
export type FirecrawlGetAgentTraceInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { path: FirecrawlGetAgentTracePath; query?: FirecrawlGetAgentTraceQuery; };
export type FirecrawlGetAgentTraceResponse = {
  "success"?: boolean;
  "id"?: string;
  "events"?: ReadonlyArray<FirecrawlSchemas.AgentTraceEvent>;
  "creditsUsed"?: number;
  "activeBrowserSessions"?: ReadonlyArray<{
    "id"?: string;
    "liveViewUrl"?: string;
    "viewport"?: {
      "width"?: number;
      "height"?: number;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
};
export type FirecrawlGetAgentSnapshotPath = { "jobId": string; "snapshotId": string; };
export type FirecrawlGetAgentSnapshotInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { path: FirecrawlGetAgentSnapshotPath; };
export type FirecrawlGetAgentSnapshotResponse = {
  "success"?: boolean;
  "id"?: string;
  "snapshotId"?: string;
  "snapshot"?: string;
  [key: string]: unknown;
};
export type FirecrawlGetActiveCrawlsInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & {  };
export type FirecrawlGetActiveCrawlsResponse = {
  "success": boolean;
  "crawls"?: ReadonlyArray<{
    "id": string;
    "teamId": string;
    "url": string;
    "options": {
      "scrapeOptions"?: FirecrawlSchemas.ScrapeOptions;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
};
export type FirecrawlGetCreditUsageInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & {  };
export type FirecrawlGetCreditUsageResponse = {
  "success"?: boolean;
  "data"?: {
    "remainingCredits"?: number;
    "planCredits"?: number;
    "billingPeriodStart"?: string | null;
    "billingPeriodEnd"?: string | null;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};
export type FirecrawlGetHistoricalCreditUsageQuery = { "byApiKey"?: boolean; };
export type FirecrawlGetHistoricalCreditUsageInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { query?: FirecrawlGetHistoricalCreditUsageQuery; };
export type FirecrawlGetHistoricalCreditUsageResponse = {
  "success"?: boolean;
  "periods"?: ReadonlyArray<{
    "startDate"?: string;
    "endDate"?: string;
    "apiKey"?: string | null;
    "totalCredits"?: number;
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
};
export type FirecrawlGetTokenUsageInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & {  };
export type FirecrawlGetTokenUsageResponse = {
  "success"?: boolean;
  "data"?: {
    "remainingTokens"?: number;
    "planTokens"?: number;
    "billingPeriodStart"?: string | null;
    "billingPeriodEnd"?: string | null;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};
export type FirecrawlGetHistoricalTokenUsageQuery = { "byApiKey"?: boolean; };
export type FirecrawlGetHistoricalTokenUsageInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { query?: FirecrawlGetHistoricalTokenUsageQuery; };
export type FirecrawlGetHistoricalTokenUsageResponse = {
  "success"?: boolean;
  "periods"?: ReadonlyArray<{
    "startDate"?: string;
    "endDate"?: string;
    "apiKey"?: string | null;
    "totalTokens"?: number;
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
};
export type FirecrawlGetQueueStatusInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & {  };
export type FirecrawlGetQueueStatusResponse = {
  "success"?: boolean;
  "jobsInQueue"?: number;
  "activeJobsInQueue"?: number;
  "waitingJobsInQueue"?: number;
  "maxConcurrency"?: number;
  "mostRecentSuccess"?: string | null;
  [key: string]: unknown;
};
export type FirecrawlGetActivityQuery = { "endpoint"?: "scrape" | "crawl" | "batch_scrape" | "search" | "extract" | "llmstxt" | "deep_research" | "map" | "agent" | "browser" | "interact"; "limit"?: number; "cursor"?: string; };
export type FirecrawlGetActivityInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { query?: FirecrawlGetActivityQuery; };
export type FirecrawlGetActivityResponse = {
  "success"?: boolean;
  "data"?: ReadonlyArray<{
    "id"?: string;
    "endpoint"?: "scrape" | "crawl" | "batch_scrape" | "search" | "extract" | "llmstxt" | "deep_research" | "map" | "agent" | "browser" | "interact";
    "api_version"?: string;
    "created_at"?: string;
    "target"?: string | null;
    [key: string]: unknown;
  }>;
  "cursor"?: string | null;
  "has_more"?: boolean;
  [key: string]: unknown;
};
export type FirecrawlSearchBody = {
  "query": string;
  "limit"?: number;
  "sources"?: ReadonlyArray<({
    "type": "web";
    "tbs"?: string;
    "location"?: string;
    [key: string]: unknown;
  } | {
    "type": "images";
    [key: string]: unknown;
  } | {
    "type": "news";
    [key: string]: unknown;
  } | {
    "type": "alexandria";
  })>;
  "domainTools"?: boolean;
  "toolDetail"?: "compact" | "summary" | "full";
  "categories"?: ReadonlyArray<({
    "type": "developer";
    [key: string]: unknown;
  } | {
    "type": "gov";
    [key: string]: unknown;
  } | {
    "type": "research";
    [key: string]: unknown;
  } | {
    "type": "pdf";
    [key: string]: unknown;
  })>;
  "includeDomains"?: ReadonlyArray<string>;
  "excludeDomains"?: ReadonlyArray<string>;
  "tbs"?: string;
  "location"?: string;
  "country"?: string;
  "safe"?: boolean;
  "timeout"?: number;
  "ignoreInvalidURLs"?: boolean;
  "highlights"?: boolean;
  "enterprise"?: ReadonlyArray<"anon" | "zdr">;
  "scrapeOptions"?: (FirecrawlSchemas.ScrapeOptions);
  "threatProtection"?: FirecrawlSchemas.ThreatProtectionOverride;
  [key: string]: unknown;
};
export type FirecrawlSearchInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { body: FirecrawlSearchBody; };
export type FirecrawlSearchResponse = {
  "success"?: boolean;
  "data"?: {
    "web"?: ReadonlyArray<{
      "title"?: string;
      "description"?: string;
      "url"?: string;
      "markdown"?: string | null;
      "html"?: string | null;
      "rawHtml"?: string | null;
      "links"?: ReadonlyArray<string>;
      "screenshot"?: string | null;
      "audio"?: string | null;
      "video"?: string | null;
      "metadata"?: {
        "title"?: string;
        "description"?: string;
        "sourceURL"?: string;
        "url"?: string;
        "statusCode"?: number;
        "numPages"?: number;
        "totalPages"?: number;
        "error"?: string | null;
        [key: string]: unknown;
      };
      [key: string]: unknown;
    }>;
    "images"?: ReadonlyArray<{
      "title"?: string;
      "imageUrl"?: string;
      "imageWidth"?: number;
      "imageHeight"?: number;
      "url"?: string;
      "position"?: number;
      [key: string]: unknown;
    }>;
    "news"?: ReadonlyArray<{
      "title"?: string;
      "snippet"?: string;
      "url"?: string;
      "date"?: string;
      "imageUrl"?: string;
      "position"?: number;
      "markdown"?: string | null;
      "html"?: string | null;
      "rawHtml"?: string | null;
      "links"?: ReadonlyArray<string>;
      "screenshot"?: string | null;
      "audio"?: string | null;
      "video"?: string | null;
      "metadata"?: {
        "title"?: string;
        "description"?: string;
        "sourceURL"?: string;
        "url"?: string;
        "statusCode"?: number;
        "numPages"?: number;
        "totalPages"?: number;
        "error"?: string | null;
        [key: string]: unknown;
      };
      [key: string]: unknown;
    }>;
    "tools"?: ReadonlyArray<FirecrawlSchemas.DiscoveredTool>;
    [key: string]: unknown;
  };
  "warning"?: string | null;
  "id"?: string;
  "creditsUsed"?: number;
  [key: string]: unknown;
};
export type FirecrawlCreateBrowserSessionBody = {
  "ttl"?: number;
  "activityTtl"?: number;
  "streamWebView"?: boolean;
  "blockAds"?: boolean;
  "profile"?: {
    "name": string;
    "saveChanges"?: boolean;
    [key: string]: unknown;
  };
  "location"?: {
    "country": string;
  };
  [key: string]: unknown;
};
export type FirecrawlCreateBrowserSessionInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { body: FirecrawlCreateBrowserSessionBody; };
export type FirecrawlCreateBrowserSessionResponse = {
  "success"?: boolean;
  "id"?: string;
  "cdpUrl"?: string;
  "liveViewUrl"?: string;
  "interactiveLiveViewUrl"?: string;
  "expiresAt"?: string;
  [key: string]: unknown;
};
export type FirecrawlListBrowserSessionsQuery = { "status"?: "active" | "destroyed"; };
export type FirecrawlListBrowserSessionsInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { query?: FirecrawlListBrowserSessionsQuery; };
export type FirecrawlListBrowserSessionsResponse = {
  "success"?: boolean;
  "sessions"?: ReadonlyArray<{
    "id"?: string;
    "status"?: "active" | "destroyed";
    "cdpUrl"?: string;
    "liveViewUrl"?: string;
    "interactiveLiveViewUrl"?: string;
    "streamWebView"?: boolean;
    "createdAt"?: string;
    "lastActivity"?: string;
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
};
export type FirecrawlExecuteBrowserCodePath = { "sessionId": string; };
export type FirecrawlExecuteBrowserCodeBody = {
  "code": string;
  "language"?: "python" | "node" | "bash";
  "timeout"?: number;
  [key: string]: unknown;
};
export type FirecrawlExecuteBrowserCodeInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { path: FirecrawlExecuteBrowserCodePath; body: FirecrawlExecuteBrowserCodeBody; };
export type FirecrawlExecuteBrowserCodeResponse = {
  "success"?: boolean;
  "stdout"?: string | null;
  "result"?: string | null;
  "stderr"?: string | null;
  "exitCode"?: number | null;
  "killed"?: boolean;
  "error"?: string | null;
  [key: string]: unknown;
};
export type FirecrawlDeleteBrowserSessionPath = { "sessionId": string; };
export type FirecrawlDeleteBrowserSessionInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { path: FirecrawlDeleteBrowserSessionPath; };
export type FirecrawlDeleteBrowserSessionResponse = {
  "success"?: boolean;
  "sessionDurationMs"?: number;
  "creditsBilled"?: number;
  [key: string]: unknown;
};
export type FirecrawlGetScrapeStatusPath = { "jobId": string; };
export type FirecrawlGetScrapeStatusInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { path: FirecrawlGetScrapeStatusPath; };
export type FirecrawlGetScrapeStatusResponse = FirecrawlSchemas.ScrapeResponse;
export type FirecrawlSubmitSearchFeedbackPath = { "jobId": string; };
export type FirecrawlSubmitSearchFeedbackBody = FirecrawlSchemas.SearchFeedbackRequest;
export type FirecrawlSubmitSearchFeedbackInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { path: FirecrawlSubmitSearchFeedbackPath; body: FirecrawlSubmitSearchFeedbackBody; };
export type FirecrawlSubmitSearchFeedbackResponse = FirecrawlSchemas.FeedbackResponse;
export type FirecrawlAskSupportAgentBody = FirecrawlSchemas.SupportAskRequest;
export type FirecrawlAskSupportAgentInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { body: FirecrawlAskSupportAgentBody; };
export type FirecrawlAskSupportAgentResponse = FirecrawlSchemas.SupportAskResponse;
export type FirecrawlSearchSupportDocsBody = FirecrawlSchemas.SupportDocsSearchRequest;
export type FirecrawlSearchSupportDocsInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { body: FirecrawlSearchSupportDocsBody; };
export type FirecrawlSearchSupportDocsResponse = FirecrawlSchemas.SupportDocsSearchResponse;
export type FirecrawlResearchSearchPapersQuery = { "query": string; "k"?: number; "authors"?: string; "categories"?: string; "from"?: string; "to"?: string; };
export type FirecrawlResearchSearchPapersInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { query: FirecrawlResearchSearchPapersQuery; };
export type FirecrawlResearchSearchPapersResponse = FirecrawlSchemas.ResearchSearchPapersResponse;
export type FirecrawlResearchGetPaperPath = { "id": string; };
export type FirecrawlResearchGetPaperQuery = { "query"?: string; "k"?: number; };
export type FirecrawlResearchGetPaperInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { path: FirecrawlResearchGetPaperPath; query?: FirecrawlResearchGetPaperQuery; };
export type FirecrawlResearchGetPaperResponse = (FirecrawlSchemas.ResearchPaperMetadataResponse | FirecrawlSchemas.ResearchReadPaperResponse);
export type FirecrawlResearchRelatedPapersPath = { "id": string; };
export type FirecrawlResearchRelatedPapersQuery = { "intent": string; "mode"?: "similar" | "citers" | "references"; "k"?: number; "rerank"?: boolean; "anchor"?: string; };
export type FirecrawlResearchRelatedPapersInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { path: FirecrawlResearchRelatedPapersPath; query: FirecrawlResearchRelatedPapersQuery; };
export type FirecrawlResearchRelatedPapersResponse = FirecrawlSchemas.ResearchSimilarPapersResponse;
export type FirecrawlDeveloperSearchQuery = { "query": string; "k"?: number; "types"?: ReadonlyArray<"doc" | "issue" | "pull_request" | "readme">; "repos"?: ReadonlyArray<string>; "sources"?: ReadonlyArray<string>; "skills"?: "only"; "passages"?: number; "language"?: string; "topic"?: string; "license"?: string; "min_stars"?: number; "max_stars"?: number; "archived"?: boolean; "fork"?: boolean; };
export type FirecrawlDeveloperSearchInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { query: FirecrawlDeveloperSearchQuery; };
export type FirecrawlDeveloperSearchResponse = FirecrawlSchemas.DeveloperSearchResponse;
export type FirecrawlDeveloperSearchPostBody = {
  "query": string;
  "k"?: number;
  "types"?: ReadonlyArray<"doc" | "issue" | "pull_request" | "readme">;
  "repos"?: ReadonlyArray<string>;
  "sources"?: ReadonlyArray<string>;
  "skills"?: "only";
  "passages"?: number;
  "language"?: string;
  "topic"?: string;
  "license"?: string;
  "min_stars"?: number;
  "max_stars"?: number;
  "archived"?: boolean;
  "fork"?: boolean;
  [key: string]: unknown;
};
export type FirecrawlDeveloperSearchPostInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { body: FirecrawlDeveloperSearchPostBody; };
export type FirecrawlDeveloperSearchPostResponse = FirecrawlSchemas.DeveloperSearchResponse;
export type FirecrawlGovSearchQuery = { "query": string; "k"?: number; };
export type FirecrawlGovSearchInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { query: FirecrawlGovSearchQuery; };
export type FirecrawlGovSearchResponse = FirecrawlSchemas.GovSearchResponse;
export type FirecrawlGovSearchPostBody = {
  "query": string;
  "k"?: number;
};
export type FirecrawlGovSearchPostInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { body: FirecrawlGovSearchPostBody; };
export type FirecrawlGovSearchPostResponse = FirecrawlSchemas.GovSearchResponse;
export type FirecrawlSubmitEndpointFeedbackBody = FirecrawlSchemas.EndpointFeedbackRequest;
export type FirecrawlSubmitEndpointFeedbackInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { body: FirecrawlSubmitEndpointFeedbackBody; };
export type FirecrawlSubmitEndpointFeedbackResponse = FirecrawlSchemas.FeedbackResponse;
export type FirecrawlGetThreatProtectionInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & {  };
export type FirecrawlGetThreatProtectionResponse = {
  "success"?: boolean;
  "data"?: {
    "mode"?: "off" | "normal";
    "riskScoreThreshold"?: number;
    "blacklist"?: ReadonlyArray<string>;
    "whitelist"?: ReadonlyArray<string>;
    "blockedTlds"?: ReadonlyArray<string>;
    "failurePolicy"?: "open" | "closed";
    "allowRequestOverrides"?: boolean;
    "configured"?: boolean;
    "updatedAt"?: string | null;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};
export type FirecrawlUpdateThreatProtectionBody = {
  "mode": "off" | "normal";
  "riskScoreThreshold"?: number;
  "blacklist"?: ReadonlyArray<string>;
  "whitelist"?: ReadonlyArray<string>;
  "blockedTlds"?: ReadonlyArray<string>;
  "failurePolicy"?: "open" | "closed";
  "allowRequestOverrides"?: boolean;
  [key: string]: unknown;
};
export type FirecrawlUpdateThreatProtectionInput = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { body: FirecrawlUpdateThreatProtectionBody; };
export type FirecrawlUpdateThreatProtectionResponse = {
  "success"?: boolean;
  "data"?: {
    "mode"?: "off" | "normal";
    "riskScoreThreshold"?: number;
    "blacklist"?: ReadonlyArray<string>;
    "whitelist"?: ReadonlyArray<string>;
    "blockedTlds"?: ReadonlyArray<string>;
    "failurePolicy"?: "open" | "closed";
    "allowRequestOverrides"?: boolean;
    "configured"?: boolean;
    "updatedAt"?: string | null;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};


export const firecrawlOperations = Object.freeze({
  createMonitor: Object.freeze({"id":"firecrawl.createMonitor","method":"POST","path":"/monitor","retryable":false}),
  listMonitors: Object.freeze({"id":"firecrawl.listMonitors","method":"GET","path":"/monitor","retryable":true}),
  getMonitor: Object.freeze({"id":"firecrawl.getMonitor","method":"GET","path":"/monitor/{monitorId}","retryable":true}),
  updateMonitor: Object.freeze({"id":"firecrawl.updateMonitor","method":"PATCH","path":"/monitor/{monitorId}","retryable":false}),
  deleteMonitor: Object.freeze({"id":"firecrawl.deleteMonitor","method":"DELETE","path":"/monitor/{monitorId}","retryable":false}),
  runMonitor: Object.freeze({"id":"firecrawl.runMonitor","method":"POST","path":"/monitor/{monitorId}/run","retryable":false}),
  listMonitorChecks: Object.freeze({"id":"firecrawl.listMonitorChecks","method":"GET","path":"/monitor/{monitorId}/checks","retryable":true}),
  getMonitorCheck: Object.freeze({"id":"firecrawl.getMonitorCheck","method":"GET","path":"/monitor/{monitorId}/checks/{checkId}","retryable":true}),
  scrape: Object.freeze({"id":"firecrawl.scrape","method":"POST","path":"/scrape","retryable":false}),
  interactWithScrapeBrowserSession: Object.freeze({"id":"firecrawl.interactWithScrapeBrowserSession","method":"POST","path":"/scrape/{jobId}/interact","retryable":false}),
  stopInteractiveScrapeBrowserSession: Object.freeze({"id":"firecrawl.stopInteractiveScrapeBrowserSession","method":"DELETE","path":"/scrape/{jobId}/interact","retryable":false}),
  parseFile: Object.freeze({"id":"firecrawl.parseFile","method":"POST","path":"/parse","retryable":false}),
  getParseFormats: Object.freeze({"id":"firecrawl.getParseFormats","method":"GET","path":"/parse/formats","retryable":true}),
  batchScrape: Object.freeze({"id":"firecrawl.batchScrape","method":"POST","path":"/batch/scrape","retryable":false}),
  getBatchScrapeStatus: Object.freeze({"id":"firecrawl.getBatchScrapeStatus","method":"GET","path":"/batch/scrape/{id}","retryable":true}),
  cancelBatchScrape: Object.freeze({"id":"firecrawl.cancelBatchScrape","method":"DELETE","path":"/batch/scrape/{id}","retryable":false}),
  getBatchScrapeErrors: Object.freeze({"id":"firecrawl.getBatchScrapeErrors","method":"GET","path":"/batch/scrape/{id}/errors","retryable":true}),
  getCrawlStatus: Object.freeze({"id":"firecrawl.getCrawlStatus","method":"GET","path":"/crawl/{id}","retryable":true}),
  cancelCrawl: Object.freeze({"id":"firecrawl.cancelCrawl","method":"DELETE","path":"/crawl/{id}","retryable":false}),
  getCrawlErrors: Object.freeze({"id":"firecrawl.getCrawlErrors","method":"GET","path":"/crawl/{id}/errors","retryable":true}),
  crawl: Object.freeze({"id":"firecrawl.crawl","method":"POST","path":"/crawl","retryable":false}),
  crawlParamsPreview: Object.freeze({"id":"firecrawl.crawlParamsPreview","method":"POST","path":"/crawl/params-preview","retryable":false}),
  map: Object.freeze({"id":"firecrawl.map","method":"POST","path":"/map","retryable":false}),
  extract: Object.freeze({"id":"firecrawl.extract","method":"POST","path":"/extract","retryable":false}),
  getExtractStatus: Object.freeze({"id":"firecrawl.getExtractStatus","method":"GET","path":"/extract/{id}","retryable":true}),
  listAgents: Object.freeze({"id":"firecrawl.listAgents","method":"GET","path":"/agent","retryable":true}),
  startAgent: Object.freeze({"id":"firecrawl.startAgent","method":"POST","path":"/agent","retryable":false}),
  getAgentStatus: Object.freeze({"id":"firecrawl.getAgentStatus","method":"GET","path":"/agent/{jobId}","retryable":true}),
  cancelAgent: Object.freeze({"id":"firecrawl.cancelAgent","method":"DELETE","path":"/agent/{jobId}","retryable":false}),
  getAgentTrace: Object.freeze({"id":"firecrawl.getAgentTrace","method":"GET","path":"/agent/{jobId}/trace","retryable":true}),
  getAgentSnapshot: Object.freeze({"id":"firecrawl.getAgentSnapshot","method":"GET","path":"/agent/{jobId}/snapshots/{snapshotId}","retryable":true}),
  getActiveCrawls: Object.freeze({"id":"firecrawl.getActiveCrawls","method":"GET","path":"/crawl/active","retryable":true}),
  getCreditUsage: Object.freeze({"id":"firecrawl.getCreditUsage","method":"GET","path":"/team/credit-usage","retryable":true}),
  getHistoricalCreditUsage: Object.freeze({"id":"firecrawl.getHistoricalCreditUsage","method":"GET","path":"/team/credit-usage/historical","retryable":true}),
  getTokenUsage: Object.freeze({"id":"firecrawl.getTokenUsage","method":"GET","path":"/team/token-usage","retryable":true}),
  getHistoricalTokenUsage: Object.freeze({"id":"firecrawl.getHistoricalTokenUsage","method":"GET","path":"/team/token-usage/historical","retryable":true}),
  getQueueStatus: Object.freeze({"id":"firecrawl.getQueueStatus","method":"GET","path":"/team/queue-status","retryable":true}),
  getActivity: Object.freeze({"id":"firecrawl.getActivity","method":"GET","path":"/team/activity","retryable":true}),
  search: Object.freeze({"id":"firecrawl.search","method":"POST","path":"/search","retryable":false}),
  createBrowserSession: Object.freeze({"id":"firecrawl.createBrowserSession","method":"POST","path":"/interact","retryable":false}),
  listBrowserSessions: Object.freeze({"id":"firecrawl.listBrowserSessions","method":"GET","path":"/interact","retryable":true}),
  executeBrowserCode: Object.freeze({"id":"firecrawl.executeBrowserCode","method":"POST","path":"/interact/{sessionId}/execute","retryable":false}),
  deleteBrowserSession: Object.freeze({"id":"firecrawl.deleteBrowserSession","method":"DELETE","path":"/interact/{sessionId}","retryable":false}),
  getScrapeStatus: Object.freeze({"id":"firecrawl.getScrapeStatus","method":"GET","path":"/scrape/{jobId}","retryable":true}),
  submitSearchFeedback: Object.freeze({"id":"firecrawl.submitSearchFeedback","method":"POST","path":"/search/{jobId}/feedback","retryable":false}),
  askSupportAgent: Object.freeze({"id":"firecrawl.askSupportAgent","method":"POST","path":"/support/ask","retryable":false}),
  searchSupportDocs: Object.freeze({"id":"firecrawl.searchSupportDocs","method":"POST","path":"/support/docs-search","retryable":false}),
  researchSearchPapers: Object.freeze({"id":"firecrawl.researchSearchPapers","method":"GET","path":"/search/research/papers","retryable":true}),
  researchGetPaper: Object.freeze({"id":"firecrawl.researchGetPaper","method":"GET","path":"/search/research/papers/{id}","retryable":true}),
  researchRelatedPapers: Object.freeze({"id":"firecrawl.researchRelatedPapers","method":"GET","path":"/search/research/papers/{id}/similar","retryable":true}),
  developerSearch: Object.freeze({"id":"firecrawl.developerSearch","method":"GET","path":"/search/developer","retryable":true}),
  developerSearchPost: Object.freeze({"id":"firecrawl.developerSearchPost","method":"POST","path":"/search/developer","retryable":false}),
  govSearch: Object.freeze({"id":"firecrawl.govSearch","method":"GET","path":"/search/gov","retryable":true}),
  govSearchPost: Object.freeze({"id":"firecrawl.govSearchPost","method":"POST","path":"/search/gov","retryable":false}),
  submitEndpointFeedback: Object.freeze({"id":"firecrawl.submitEndpointFeedback","method":"POST","path":"/feedback","retryable":false}),
  getThreatProtection: Object.freeze({"id":"firecrawl.getThreatProtection","method":"GET","path":"/team/threat-protection","retryable":true}),
  updateThreatProtection: Object.freeze({"id":"firecrawl.updateThreatProtection","method":"PUT","path":"/team/threat-protection","retryable":false}),
} satisfies Record<string, NativeOperation>);

export function createFirecrawlClient(options: FirecrawlClientOptions) {
  if (!options || typeof options !== "object" || Array.isArray(options)) throw new SearchError("configuration");
  exactFields(options, ["apiKey", "fetch", "timeoutMs", "retry", "maxResponseBytes", "maxConcurrency"], "configuration");
  const { apiKey, fetch } = adapterOptions({ apiKey: options.apiKey, ...(options.fetch !== undefined ? { fetch: options.fetch } : {}) });
  const { timeoutMs, retry, maxResponseBytes, maxConcurrency } = options;
  const config = { fetch, ...(timeoutMs !== undefined ? { timeoutMs } : {}), ...(retry !== undefined ? { retry } : {}),
    ...(maxResponseBytes !== undefined ? { maxResponseBytes } : {}), ...(maxConcurrency !== undefined ? { maxConcurrency } : {}) };
  const transport0 = createNativeTransport({ ...config, provider: "firecrawl", baseUrl: "https://api.firecrawl.dev/v2", headers: { Authorization: `Bearer ${apiKey}` } });
  return Object.freeze({
    operations: firecrawlOperations,
    /** Create a monitor */
    async createMonitor(input: FirecrawlCreateMonitorInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      return transport0.request<FirecrawlCreateMonitorResponse>(firecrawlOperations.createMonitor, input);
    },
    /** List monitors */
    async listMonitors(input: FirecrawlListMonitorsInput = {}) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport0.request<FirecrawlListMonitorsResponse>(firecrawlOperations.listMonitors, input);
    },
    /** Get a monitor */
    async getMonitor(input: FirecrawlGetMonitorInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport0.request<FirecrawlGetMonitorResponse>(firecrawlOperations.getMonitor, input);
    },
    /** Update a monitor */
    async updateMonitor(input: FirecrawlUpdateMonitorInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      return transport0.request<FirecrawlUpdateMonitorResponse>(firecrawlOperations.updateMonitor, input);
    },
    /** Delete a monitor */
    async deleteMonitor(input: FirecrawlDeleteMonitorInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport0.request<FirecrawlDeleteMonitorResponse>(firecrawlOperations.deleteMonitor, input);
    },
    /** Run a monitor */
    async runMonitor(input: FirecrawlRunMonitorInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport0.request<FirecrawlRunMonitorResponse>(firecrawlOperations.runMonitor, input);
    },
    /** List monitor checks */
    async listMonitorChecks(input: FirecrawlListMonitorChecksInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport0.request<FirecrawlListMonitorChecksResponse>(firecrawlOperations.listMonitorChecks, input);
    },
    /** Get a monitor check */
    async getMonitorCheck(input: FirecrawlGetMonitorCheckInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport0.request<FirecrawlGetMonitorCheckResponse>(firecrawlOperations.getMonitorCheck, input);
    },
    /** Scrape a single URL and optionally extract information using an LLM */
    async scrape(input: FirecrawlScrapeInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      return transport0.request<FirecrawlScrapeResponse>(firecrawlOperations.scrape, input);
    },
    /** Interact with the browser session associated with a scrape job */
    async interactWithScrapeBrowserSession(input: FirecrawlInteractWithScrapeBrowserSessionInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      return transport0.request<FirecrawlInteractWithScrapeBrowserSessionResponse>(firecrawlOperations.interactWithScrapeBrowserSession, input);
    },
    /** Stop the interactive browser session associated with a scrape job */
    async stopInteractiveScrapeBrowserSession(input: FirecrawlStopInteractiveScrapeBrowserSessionInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport0.request<FirecrawlStopInteractiveScrapeBrowserSessionResponse>(firecrawlOperations.stopInteractiveScrapeBrowserSession, input);
    },
    /** Upload and parse a file */
    async parseFile(input: FirecrawlParseFileInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.rawBody === undefined) throw new SearchError("invalid_request");
      return transport0.request<FirecrawlParseFileResponse>(firecrawlOperations.parseFile, input);
    },
    /** List file formats supported by /parse */
    async getParseFormats(input: FirecrawlGetParseFormatsInput = {}) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport0.request<FirecrawlGetParseFormatsResponse>(firecrawlOperations.getParseFormats, input);
    },
    /** Scrape multiple URLs and optionally extract information using an LLM */
    async batchScrape(input: FirecrawlBatchScrapeInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      return transport0.request<FirecrawlBatchScrapeResponse>(firecrawlOperations.batchScrape, input);
    },
    /** Get the status of a batch scrape job */
    async getBatchScrapeStatus(input: FirecrawlGetBatchScrapeStatusInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport0.request<FirecrawlGetBatchScrapeStatusResponse>(firecrawlOperations.getBatchScrapeStatus, input);
    },
    /** Cancel a batch scrape job */
    async cancelBatchScrape(input: FirecrawlCancelBatchScrapeInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport0.request<FirecrawlCancelBatchScrapeResponse>(firecrawlOperations.cancelBatchScrape, input);
    },
    /** Get the errors of a batch scrape job */
    async getBatchScrapeErrors(input: FirecrawlGetBatchScrapeErrorsInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport0.request<FirecrawlGetBatchScrapeErrorsResponse>(firecrawlOperations.getBatchScrapeErrors, input);
    },
    /** Get the status of a crawl job */
    async getCrawlStatus(input: FirecrawlGetCrawlStatusInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport0.request<FirecrawlGetCrawlStatusResponse>(firecrawlOperations.getCrawlStatus, input);
    },
    /** Cancel a crawl job */
    async cancelCrawl(input: FirecrawlCancelCrawlInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport0.request<FirecrawlCancelCrawlResponse>(firecrawlOperations.cancelCrawl, input);
    },
    /** Get the errors of a crawl job */
    async getCrawlErrors(input: FirecrawlGetCrawlErrorsInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport0.request<FirecrawlGetCrawlErrorsResponse>(firecrawlOperations.getCrawlErrors, input);
    },
    /** Crawl multiple URLs based on options */
    async crawl(input: FirecrawlCrawlInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      return transport0.request<FirecrawlCrawlResponse>(firecrawlOperations.crawl, input);
    },
    /** Preview crawl parameters generated from natural language prompt */
    async crawlParamsPreview(input: FirecrawlCrawlParamsPreviewInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      return transport0.request<FirecrawlCrawlParamsPreviewResponse>(firecrawlOperations.crawlParamsPreview, input);
    },
    /** Map multiple URLs based on options */
    async map(input: FirecrawlMapInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      return transport0.request<FirecrawlMapResponse>(firecrawlOperations.map, input);
    },
    /** Extract structured data from pages using LLMs */
    async extract(input: FirecrawlExtractInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      return transport0.request<FirecrawlExtractResponse>(firecrawlOperations.extract, input);
    },
    /** Get the status of an extract job */
    async getExtractStatus(input: FirecrawlGetExtractStatusInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport0.request<FirecrawlGetExtractStatusResponse>(firecrawlOperations.getExtractStatus, input);
    },
    /** List agent runs */
    async listAgents(input: FirecrawlListAgentsInput = {}) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport0.request<FirecrawlListAgentsResponse>(firecrawlOperations.listAgents, input);
    },
    /** Start an agent task for agentic data extraction */
    async startAgent(input: FirecrawlStartAgentInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      return transport0.request<FirecrawlStartAgentResponse>(firecrawlOperations.startAgent, input);
    },
    /** Get the status of an agent job */
    async getAgentStatus(input: FirecrawlGetAgentStatusInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport0.request<FirecrawlGetAgentStatusResponse>(firecrawlOperations.getAgentStatus, input);
    },
    /** Cancel an agent job */
    async cancelAgent(input: FirecrawlCancelAgentInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport0.request<FirecrawlCancelAgentResponse>(firecrawlOperations.cancelAgent, input);
    },
    /** Get the execution trace of an agent job */
    async getAgentTrace(input: FirecrawlGetAgentTraceInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport0.request<FirecrawlGetAgentTraceResponse>(firecrawlOperations.getAgentTrace, input);
    },
    /** Get an output snapshot of an agent job */
    async getAgentSnapshot(input: FirecrawlGetAgentSnapshotInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport0.request<FirecrawlGetAgentSnapshotResponse>(firecrawlOperations.getAgentSnapshot, input);
    },
    /** Get all active crawls for the authenticated team */
    async getActiveCrawls(input: FirecrawlGetActiveCrawlsInput = {}) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport0.request<FirecrawlGetActiveCrawlsResponse>(firecrawlOperations.getActiveCrawls, input);
    },
    /** Get remaining credits for the authenticated team */
    async getCreditUsage(input: FirecrawlGetCreditUsageInput = {}) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport0.request<FirecrawlGetCreditUsageResponse>(firecrawlOperations.getCreditUsage, input);
    },
    /** Get historical credit usage for the authenticated team */
    async getHistoricalCreditUsage(input: FirecrawlGetHistoricalCreditUsageInput = {}) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport0.request<FirecrawlGetHistoricalCreditUsageResponse>(firecrawlOperations.getHistoricalCreditUsage, input);
    },
    /** Get remaining tokens for the authenticated team (Extract only) */
    async getTokenUsage(input: FirecrawlGetTokenUsageInput = {}) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport0.request<FirecrawlGetTokenUsageResponse>(firecrawlOperations.getTokenUsage, input);
    },
    /** Get historical token usage for the authenticated team (Extract only) */
    async getHistoricalTokenUsage(input: FirecrawlGetHistoricalTokenUsageInput = {}) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport0.request<FirecrawlGetHistoricalTokenUsageResponse>(firecrawlOperations.getHistoricalTokenUsage, input);
    },
    /** Metrics about your team's scrape queue */
    async getQueueStatus(input: FirecrawlGetQueueStatusInput = {}) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport0.request<FirecrawlGetQueueStatusResponse>(firecrawlOperations.getQueueStatus, input);
    },
    /** List recent API activity */
    async getActivity(input: FirecrawlGetActivityInput = {}) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport0.request<FirecrawlGetActivityResponse>(firecrawlOperations.getActivity, input);
    },
    /** Search and optionally scrape search results */
    async search(input: FirecrawlSearchInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      return transport0.request<FirecrawlSearchResponse>(firecrawlOperations.search, input);
    },
    /** Create an interact session */
    async createBrowserSession(input: FirecrawlCreateBrowserSessionInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      return transport0.request<FirecrawlCreateBrowserSessionResponse>(firecrawlOperations.createBrowserSession, input);
    },
    /** List interact sessions */
    async listBrowserSessions(input: FirecrawlListBrowserSessionsInput = {}) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport0.request<FirecrawlListBrowserSessionsResponse>(firecrawlOperations.listBrowserSessions, input);
    },
    /** Execute code in an interact session */
    async executeBrowserCode(input: FirecrawlExecuteBrowserCodeInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      return transport0.request<FirecrawlExecuteBrowserCodeResponse>(firecrawlOperations.executeBrowserCode, input);
    },
    /** Delete an interact session */
    async deleteBrowserSession(input: FirecrawlDeleteBrowserSessionInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport0.request<FirecrawlDeleteBrowserSessionResponse>(firecrawlOperations.deleteBrowserSession, input);
    },
    /** Get the status of a scrape job */
    async getScrapeStatus(input: FirecrawlGetScrapeStatusInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport0.request<FirecrawlGetScrapeStatusResponse>(firecrawlOperations.getScrapeStatus, input);
    },
    /** Submit feedback for a search job */
    async submitSearchFeedback(input: FirecrawlSubmitSearchFeedbackInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      return transport0.request<FirecrawlSubmitSearchFeedbackResponse>(firecrawlOperations.submitSearchFeedback, input);
    },
    /** Ask the Firecrawl support agent */
    async askSupportAgent(input: FirecrawlAskSupportAgentInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      return transport0.request<FirecrawlAskSupportAgentResponse>(firecrawlOperations.askSupportAgent, input);
    },
    /** Search Firecrawl docs with citations */
    async searchSupportDocs(input: FirecrawlSearchSupportDocsInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      return transport0.request<FirecrawlSearchSupportDocsResponse>(firecrawlOperations.searchSupportDocs, input);
    },
    /** Search papers */
    async researchSearchPapers(input: FirecrawlResearchSearchPapersInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.query?.["query"] == null) throw new SearchError("invalid_request");
      return transport0.request<FirecrawlResearchSearchPapersResponse>(firecrawlOperations.researchSearchPapers, input);
    },
    /** Inspect or read a paper */
    async researchGetPaper(input: FirecrawlResearchGetPaperInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport0.request<FirecrawlResearchGetPaperResponse>(firecrawlOperations.researchGetPaper, input);
    },
    /** Find related papers */
    async researchRelatedPapers(input: FirecrawlResearchRelatedPapersInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.query?.["intent"] == null) throw new SearchError("invalid_request");
      return transport0.request<FirecrawlResearchRelatedPapersResponse>(firecrawlOperations.researchRelatedPapers, input);
    },
    /** Search the developer index */
    async developerSearch(input: FirecrawlDeveloperSearchInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.query?.["query"] == null) throw new SearchError("invalid_request");
      return transport0.request<FirecrawlDeveloperSearchResponse>(firecrawlOperations.developerSearch, input);
    },
    /** Search the developer index */
    async developerSearchPost(input: FirecrawlDeveloperSearchPostInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      return transport0.request<FirecrawlDeveloperSearchPostResponse>(firecrawlOperations.developerSearchPost, input);
    },
    /** Search the Government Index */
    async govSearch(input: FirecrawlGovSearchInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.query?.["query"] == null) throw new SearchError("invalid_request");
      return transport0.request<FirecrawlGovSearchResponse>(firecrawlOperations.govSearch, input);
    },
    /** Search the Government Index */
    async govSearchPost(input: FirecrawlGovSearchPostInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      return transport0.request<FirecrawlGovSearchPostResponse>(firecrawlOperations.govSearchPost, input);
    },
    /** Submit feedback for a v2 job */
    async submitEndpointFeedback(input: FirecrawlSubmitEndpointFeedbackInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      return transport0.request<FirecrawlSubmitEndpointFeedbackResponse>(firecrawlOperations.submitEndpointFeedback, input);
    },
    /** Get the team's threat protection policy */
    async getThreatProtection(input: FirecrawlGetThreatProtectionInput = {}) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      return transport0.request<FirecrawlGetThreatProtectionResponse>(firecrawlOperations.getThreatProtection, input);
    },
    /** Update the team's threat protection policy */
    async updateThreatProtection(input: FirecrawlUpdateThreatProtectionInput) {
      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");
      if (input.body === undefined) throw new SearchError("invalid_request");
      return transport0.request<FirecrawlUpdateThreatProtectionResponse>(firecrawlOperations.updateThreatProtection, input);
    },
  });
}
export type FirecrawlClient = ReturnType<typeof createFirecrawlClient>;
