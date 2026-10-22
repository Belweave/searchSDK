// Generated from public source clients and their immutable operation catalogs.
// Run refresh-native-index.mjs after client changes; no live endpoint verification is implied.
export interface NativeOperationEntry { name: string; method: string; path: string; retryable: boolean; response: string }
export const nativeOperationIndex: Readonly<Record<string, readonly NativeOperationEntry[]>> = {
  "context": [
    {
      "name": "headLogo",
      "method": "HEAD",
      "path": "/",
      "retryable": true,
      "response": "raw"
    },
    {
      "name": "submitFeedback",
      "method": "POST",
      "path": "/feedback",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "listLogs",
      "method": "GET",
      "path": "/org/logs",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "getLog",
      "method": "GET",
      "path": "/org/logs/{request_id}",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "listProfiles",
      "method": "GET",
      "path": "/org/browser/profiles",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "getUsage",
      "method": "GET",
      "path": "/org/usage",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "getUsageHistory",
      "method": "GET",
      "path": "/org/usage/history",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "listWebhookDeliveries",
      "method": "POST",
      "path": "/webhooks/deliveries",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "getWebhookDelivery",
      "method": "GET",
      "path": "/webhooks/deliveries/{delivery_id}",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "listWebhookDeliveryAttempts",
      "method": "GET",
      "path": "/webhooks/deliveries/{delivery_id}/attempts",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "retryWebhookDelivery",
      "method": "POST",
      "path": "/webhooks/deliveries/{delivery_id}/retry",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "scrape",
      "method": "POST",
      "path": "/web/scrape",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "searchNews",
      "method": "POST",
      "path": "/news/search",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "answers",
      "method": "POST",
      "path": "/web/answers",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "parse",
      "method": "POST",
      "path": "/parse",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "map",
      "method": "GET",
      "path": "/web/urls",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "crawl",
      "method": "POST",
      "path": "/web/crawl",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "extract",
      "method": "POST",
      "path": "/web/extract",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "search",
      "method": "POST",
      "path": "/web/search",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "enrichPerson",
      "method": "POST",
      "path": "/people/enrich",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "retrieveBrand",
      "method": "POST",
      "path": "/brand/retrieve",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "searchBrands",
      "method": "GET",
      "path": "/brand/search",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "styleguide",
      "method": "GET",
      "path": "/web/styleguide",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "fonts",
      "method": "GET",
      "path": "/web/fonts",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "classifyNaics",
      "method": "GET",
      "path": "/web/naics",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "classifySic",
      "method": "GET",
      "path": "/web/sic",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "prefetch",
      "method": "POST",
      "path": "/utility/prefetch",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "createMonitor",
      "method": "POST",
      "path": "/monitors",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "listMonitors",
      "method": "GET",
      "path": "/monitors",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "getMonitor",
      "method": "GET",
      "path": "/monitors/{monitor_id}",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "updateMonitor",
      "method": "PATCH",
      "path": "/monitors/{monitor_id}",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "deleteMonitor",
      "method": "DELETE",
      "path": "/monitors/{monitor_id}",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "listMonitorRuns",
      "method": "GET",
      "path": "/monitors/{monitor_id}/runs",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "getMonitorRun",
      "method": "GET",
      "path": "/monitors/{monitor_id}/runs/{run_id}",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "listMonitorChanges",
      "method": "GET",
      "path": "/monitors/{monitor_id}/changes",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "listAccountRuns",
      "method": "GET",
      "path": "/monitors/runs",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "listMonitorCreditUsage",
      "method": "GET",
      "path": "/monitors/credit-usage",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "getMonitorLimits",
      "method": "GET",
      "path": "/monitors/limits",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "listChanges",
      "method": "GET",
      "path": "/monitors/changes",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "getChange",
      "method": "GET",
      "path": "/monitors/changes/{change_id}",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "runMonitorNow",
      "method": "POST",
      "path": "/monitors/{monitor_id}/run",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "rotateMonitorWebhookSecret",
      "method": "POST",
      "path": "/monitors/{monitor_id}/webhook/rotate-secret",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "submitBatch",
      "method": "POST",
      "path": "/batch/submit",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "listBatches",
      "method": "GET",
      "path": "/batch/list",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "getBatch",
      "method": "GET",
      "path": "/batch/{batch_id}",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "deleteBatch",
      "method": "DELETE",
      "path": "/batch/{batch_id}",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "getBatchResults",
      "method": "GET",
      "path": "/batch/{batch_id}/results",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "cancelBatch",
      "method": "POST",
      "path": "/batch/{batch_id}/cancel",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "searchCompanies",
      "method": "POST",
      "path": "/company/search",
      "retryable": false,
      "response": "json"
    }
  ],
  "tinyfish": [
    {
      "name": "runSse",
      "method": "POST",
      "path": "/v1/automation/run-sse",
      "retryable": false,
      "response": "sse"
    },
    {
      "name": "run",
      "method": "POST",
      "path": "/v1/automation/run",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "runAsync",
      "method": "POST",
      "path": "/v1/automation/run-async",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "runBatch",
      "method": "POST",
      "path": "/v1/automation/run-batch",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "listRuns",
      "method": "GET",
      "path": "/v1/runs",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "batchGetRuns",
      "method": "POST",
      "path": "/v1/runs/batch",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "batchCancelRuns",
      "method": "POST",
      "path": "/v1/runs/batch/cancel",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "getRunById",
      "method": "GET",
      "path": "/v1/runs/{id}",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "cancelRunById",
      "method": "POST",
      "path": "/v1/runs/{id}/cancel",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "getStepScreenshot",
      "method": "GET",
      "path": "/v1/runs/{id}/steps/{stepId}/screenshot",
      "retryable": true,
      "response": "bytes"
    },
    {
      "name": "getStepHtml",
      "method": "GET",
      "path": "/v1/runs/{id}/steps/{stepId}/html",
      "retryable": true,
      "response": "text"
    },
    {
      "name": "listBrowserContextProfiles",
      "method": "GET",
      "path": "/v1/profiles",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "createBrowserContextProfile",
      "method": "POST",
      "path": "/v1/profiles",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "getBrowserContextProfile",
      "method": "GET",
      "path": "/v1/profiles/{profileId}",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "updateBrowserContextProfile",
      "method": "PATCH",
      "path": "/v1/profiles/{profileId}",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "deleteBrowserContextProfile",
      "method": "DELETE",
      "path": "/v1/profiles/{profileId}",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "createBrowserContextProfileSetupSession",
      "method": "POST",
      "path": "/v1/profiles/{profileId}/setup-session",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "cancelBrowserContextProfileSetupSession",
      "method": "POST",
      "path": "/v1/profiles/{profileId}/setup-session/cancel",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "saveBrowserContextProfileSetupSession",
      "method": "POST",
      "path": "/v1/profiles/{profileId}/save",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "uploadBrowserContextProfileState",
      "method": "POST",
      "path": "/v1/profiles/{profileId}/upload",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "deleteBrowserContextProfileDomain",
      "method": "DELETE",
      "path": "/v1/profiles/{profileId}/domains/{domain}",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "connectVault",
      "method": "POST",
      "path": "/v1/vault/connections",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "listVaultConnections",
      "method": "GET",
      "path": "/v1/vault/connections",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "disconnectVault",
      "method": "DELETE",
      "path": "/v1/vault/connections/{connectionId}",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "listVaultItems",
      "method": "GET",
      "path": "/v1/vault/items",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "syncVaultItems",
      "method": "POST",
      "path": "/v1/vault/items/sync",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "getWallet",
      "method": "GET",
      "path": "/v1/wallet",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "topUpWallet",
      "method": "POST",
      "path": "/v1/wallet/top-up",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "search",
      "method": "GET",
      "path": "/",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "listSearchUsage",
      "method": "GET",
      "path": "/usage",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "fetchUrls",
      "method": "POST",
      "path": "/",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "listFetchUsage",
      "method": "GET",
      "path": "/usage",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "createBrowserSession",
      "method": "POST",
      "path": "/",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "listBrowserUsage",
      "method": "GET",
      "path": "/usage",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "deleteBrowserSession",
      "method": "DELETE",
      "path": "/{sessionId}",
      "retryable": false,
      "response": "text"
    },
    {
      "name": "createMonitor",
      "method": "POST",
      "path": "/v1/monitors",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "listMonitors",
      "method": "GET",
      "path": "/v1/monitors",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "getMonitor",
      "method": "GET",
      "path": "/v1/monitors/{id}",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "updateMonitor",
      "method": "PATCH",
      "path": "/v1/monitors/{id}",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "deleteMonitor",
      "method": "DELETE",
      "path": "/v1/monitors/{id}",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "runMonitor",
      "method": "POST",
      "path": "/v1/monitors/{id}/runs",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "runResearch",
      "method": "POST",
      "path": "/v1/automation/run-research",
      "retryable": false,
      "response": "sse"
    },
    {
      "name": "startResearchAsync",
      "method": "POST",
      "path": "/v1/automation/run-research-async",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "streamResearchEvents",
      "method": "GET",
      "path": "/v1/research-run/{research_run_id}/events",
      "retryable": false,
      "response": "sse"
    },
    {
      "name": "listResearchRuns",
      "method": "GET",
      "path": "/v1/research-run",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "getResearchRun",
      "method": "GET",
      "path": "/v1/research-run/{research_run_id}",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "cancelResearchRun",
      "method": "POST",
      "path": "/v1/research-run/{research_run_id}/cancel",
      "retryable": false,
      "response": "json"
    }
  ],
  "exa": [
    {
      "name": "search",
      "method": "POST",
      "path": "/search",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "searchStream",
      "method": "POST",
      "path": "/search",
      "retryable": false,
      "response": "sse"
    },
    {
      "name": "getContents",
      "method": "POST",
      "path": "/contents",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "answer",
      "method": "POST",
      "path": "/answer",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "answerStream",
      "method": "POST",
      "path": "/answer",
      "retryable": false,
      "response": "sse"
    },
    {
      "name": "findSimilar",
      "method": "POST",
      "path": "/findSimilar",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "createMonitor",
      "method": "POST",
      "path": "/monitors",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "listMonitors",
      "method": "GET",
      "path": "/monitors",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "batchMonitors",
      "method": "POST",
      "path": "/monitors/batch",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "getMonitor",
      "method": "GET",
      "path": "/monitors/{id}",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "updateMonitor",
      "method": "PATCH",
      "path": "/monitors/{id}",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "deleteMonitor",
      "method": "DELETE",
      "path": "/monitors/{id}",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "triggerMonitor",
      "method": "POST",
      "path": "/monitors/{id}/trigger",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "listMonitorRuns",
      "method": "GET",
      "path": "/monitors/{id}/runs",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "getMonitorRun",
      "method": "GET",
      "path": "/monitors/{id}/runs/{runId}",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "createAgentRun",
      "method": "POST",
      "path": "/agent/runs",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "createAgentRunStream",
      "method": "POST",
      "path": "/agent/runs",
      "retryable": false,
      "response": "sse"
    },
    {
      "name": "listAgentRuns",
      "method": "GET",
      "path": "/agent/runs",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "getAgentRun",
      "method": "GET",
      "path": "/agent/runs/{id}",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "deleteAgentRun",
      "method": "DELETE",
      "path": "/agent/runs/{id}",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "cancelAgentRun",
      "method": "POST",
      "path": "/agent/runs/{id}/cancel",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "stopAgentRun",
      "method": "POST",
      "path": "/agent/runs/{id}/stop",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "listAgentRunEvents",
      "method": "GET",
      "path": "/agent/runs/{id}/events",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "listAgentRunEventsStream",
      "method": "GET",
      "path": "/agent/runs/{id}/events",
      "retryable": false,
      "response": "sse"
    },
    {
      "name": "createBatch",
      "method": "POST",
      "path": "/batches",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "listBatches",
      "method": "GET",
      "path": "/batches",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "getBatch",
      "method": "GET",
      "path": "/batches/{id}",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "deleteBatch",
      "method": "DELETE",
      "path": "/batches/{id}",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "cancelBatch",
      "method": "POST",
      "path": "/batches/{id}/cancel",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "getTeamInfo",
      "method": "GET",
      "path": "/v0/teams/me",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "createWebset",
      "method": "POST",
      "path": "/v0/websets",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "listWebsets",
      "method": "GET",
      "path": "/v0/websets",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "getWebset",
      "method": "GET",
      "path": "/v0/websets/{id}",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "updateWebset",
      "method": "POST",
      "path": "/v0/websets/{id}",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "deleteWebset",
      "method": "DELETE",
      "path": "/v0/websets/{id}",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "cancelWebset",
      "method": "POST",
      "path": "/v0/websets/{id}/cancel",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "createWebsetSearch",
      "method": "POST",
      "path": "/v0/websets/{webset}/searches",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "getWebsetSearch",
      "method": "GET",
      "path": "/v0/websets/{webset}/searches/{id}",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "cancelWebsetSearch",
      "method": "POST",
      "path": "/v0/websets/{webset}/searches/{id}/cancel",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "createWebsetEnrichment",
      "method": "POST",
      "path": "/v0/websets/{webset}/enrichments",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "updateWebsetEnrichment",
      "method": "PATCH",
      "path": "/v0/websets/{webset}/enrichments/{id}",
      "retryable": false,
      "response": "text"
    },
    {
      "name": "getWebsetEnrichment",
      "method": "GET",
      "path": "/v0/websets/{webset}/enrichments/{id}",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "deleteWebsetEnrichment",
      "method": "DELETE",
      "path": "/v0/websets/{webset}/enrichments/{id}",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "cancelWebsetEnrichment",
      "method": "POST",
      "path": "/v0/websets/{webset}/enrichments/{id}/cancel",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "getWebsetItem",
      "method": "GET",
      "path": "/v0/websets/{webset}/items/{id}",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "deleteWebsetItem",
      "method": "DELETE",
      "path": "/v0/websets/{webset}/items/{id}",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "listWebsetItems",
      "method": "GET",
      "path": "/v0/websets/{webset}/items",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "previewWebset",
      "method": "POST",
      "path": "/v0/websets/preview",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "createWebsetMonitor",
      "method": "POST",
      "path": "/v0/monitors",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "listWebsetMonitors",
      "method": "GET",
      "path": "/v0/monitors",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "getWebsetMonitor",
      "method": "GET",
      "path": "/v0/monitors/{id}",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "updateWebsetMonitor",
      "method": "PATCH",
      "path": "/v0/monitors/{id}",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "deleteWebsetMonitor",
      "method": "DELETE",
      "path": "/v0/monitors/{id}",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "listWebsetMonitorRuns",
      "method": "GET",
      "path": "/v0/monitors/{monitor}/runs",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "getWebsetMonitorRun",
      "method": "GET",
      "path": "/v0/monitors/{monitor}/runs/{id}",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "createImport",
      "method": "POST",
      "path": "/v0/imports",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "listImports",
      "method": "GET",
      "path": "/v0/imports",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "getImport",
      "method": "GET",
      "path": "/v0/imports/{id}",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "updateImport",
      "method": "PATCH",
      "path": "/v0/imports/{id}",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "deleteImport",
      "method": "DELETE",
      "path": "/v0/imports/{id}",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "createWebhook",
      "method": "POST",
      "path": "/v0/webhooks",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "listWebhooks",
      "method": "GET",
      "path": "/v0/webhooks",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "getWebhook",
      "method": "GET",
      "path": "/v0/webhooks/{id}",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "updateWebhook",
      "method": "PATCH",
      "path": "/v0/webhooks/{id}",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "deleteWebhook",
      "method": "DELETE",
      "path": "/v0/webhooks/{id}",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "listWebhookAttempts",
      "method": "GET",
      "path": "/v0/webhooks/{id}/attempts",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "listEvents",
      "method": "GET",
      "path": "/v0/events",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "getEvent",
      "method": "GET",
      "path": "/v0/events/{id}",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "createApiKey",
      "method": "POST",
      "path": "/api-keys",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "listApiKeys",
      "method": "GET",
      "path": "/api-keys",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "getApiKey",
      "method": "GET",
      "path": "/api-keys/{id}",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "updateApiKey",
      "method": "PUT",
      "path": "/api-keys/{id}",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "deleteApiKey",
      "method": "DELETE",
      "path": "/api-keys/{id}",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "getApiKeyUsage",
      "method": "GET",
      "path": "/api-keys/{id}/usage",
      "retryable": true,
      "response": "json"
    }
  ],
  "tavily": [
    {
      "name": "getPaymentPricing",
      "method": "GET",
      "path": "/.well-known/pricing",
      "retryable": true,
      "response": "raw"
    },
    {
      "name": "paidSearch",
      "method": "POST",
      "path": "/search",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "crawl",
      "method": "POST",
      "path": "/crawl",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "deactivateKeys",
      "method": "POST",
      "path": "/deactivate-keys",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "extract",
      "method": "POST",
      "path": "/extract",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "feedback",
      "method": "POST",
      "path": "/feedback",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "generateKeys",
      "method": "POST",
      "path": "/generate-keys",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "keyInfo",
      "method": "GET",
      "path": "/key-info",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "logs",
      "method": "POST",
      "path": "/logs",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "map",
      "method": "POST",
      "path": "/map",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "orgUsage",
      "method": "POST",
      "path": "/org-usage",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "getResearch",
      "method": "GET",
      "path": "/research/{request_id}",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "research",
      "method": "POST",
      "path": "/research",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "researchStream",
      "method": "POST",
      "path": "/research",
      "retryable": false,
      "response": "sse"
    },
    {
      "name": "search",
      "method": "POST",
      "path": "/search",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "getUsage",
      "method": "GET",
      "path": "/usage",
      "retryable": true,
      "response": "json"
    }
  ],
  "brave": [
    {
      "name": "llmContext",
      "method": "GET",
      "path": "/v1/llm/context",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "llmContextPost",
      "method": "POST",
      "path": "/v1/llm/context",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "answers",
      "method": "POST",
      "path": "/v1/chat/completions",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "answersStream",
      "method": "POST",
      "path": "/v1/chat/completions",
      "retryable": false,
      "response": "sse"
    },
    {
      "name": "search",
      "method": "GET",
      "path": "/v1/web/search",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "searchPost",
      "method": "POST",
      "path": "/v1/web/search",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "localPois",
      "method": "GET",
      "path": "/v1/local/pois",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "poiDescriptions",
      "method": "GET",
      "path": "/v1/local/descriptions",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "rich",
      "method": "GET",
      "path": "/v1/web/rich",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "news",
      "method": "GET",
      "path": "/v1/news/search",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "newsPost",
      "method": "POST",
      "path": "/v1/news/search",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "videos",
      "method": "GET",
      "path": "/v1/videos/search",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "videosPost",
      "method": "POST",
      "path": "/v1/videos/search",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "images",
      "method": "GET",
      "path": "/v1/images/search",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "places",
      "method": "GET",
      "path": "/v1/local/place_search",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "suggest",
      "method": "GET",
      "path": "/v1/suggest/search",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "spellcheck",
      "method": "GET",
      "path": "/v1/spellcheck/search",
      "retryable": true,
      "response": "json"
    }
  ],
  "perplexity": [
    {
      "name": "chatCompletions",
      "method": "POST",
      "path": "/v1/sonar",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "chatCompletionsStream",
      "method": "POST",
      "path": "/v1/sonar",
      "retryable": false,
      "response": "sse"
    },
    {
      "name": "search",
      "method": "POST",
      "path": "/search",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "createEmbeddings",
      "method": "POST",
      "path": "/v1/embeddings",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "createContextualizedEmbeddings",
      "method": "POST",
      "path": "/v1/contextualizedembeddings",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "getAsyncChatCompletion",
      "method": "GET",
      "path": "/v1/async/sonar/{api_request}",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "listAsyncChatCompletions",
      "method": "GET",
      "path": "/v1/async/sonar",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "createAsyncChatCompletion",
      "method": "POST",
      "path": "/v1/async/sonar",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "createAgent",
      "method": "POST",
      "path": "/v1/agent",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "createAgentStream",
      "method": "POST",
      "path": "/v1/agent",
      "retryable": false,
      "response": "sse"
    },
    {
      "name": "retrieveAgent",
      "method": "GET",
      "path": "/v1/agent/{id}",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "listAgentFiles",
      "method": "GET",
      "path": "/v1/agent/{id}/files",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "downloadAgentFile",
      "method": "GET",
      "path": "/v1/agent/{id}/files/{file_id}/content",
      "retryable": true,
      "response": "bytes"
    },
    {
      "name": "cancelAgentResponse",
      "method": "POST",
      "path": "/v1/agent/{id}/cancel",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "listModels",
      "method": "GET",
      "path": "/v1/models",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "getComputerUsageAnalytics",
      "method": "GET",
      "path": "/v1/analytics/computer/usage",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "getComputerUsageAnalyticsV2",
      "method": "GET",
      "path": "/v2/analytics/computer/usage",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "listSkills",
      "method": "GET",
      "path": "/v1/skills",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "createSkill",
      "method": "POST",
      "path": "/v1/skills",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "getSkill",
      "method": "GET",
      "path": "/v1/skills/{skill_id}",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "updateSkill",
      "method": "PUT",
      "path": "/v1/skills/{skill_id}",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "deleteSkill",
      "method": "DELETE",
      "path": "/v1/skills/{skill_id}",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "listSkillRevisions",
      "method": "GET",
      "path": "/v1/skills/{skill_id}/revisions",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "downloadSkill",
      "method": "GET",
      "path": "/v1/skills/{skill_id}/download",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "answerQuestions",
      "method": "POST",
      "path": "/v1/decisions",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "routerChatCompletions",
      "method": "POST",
      "path": "/router/v1/chat/completions",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "routerChatCompletionsStream",
      "method": "POST",
      "path": "/router/v1/chat/completions",
      "retryable": false,
      "response": "sse"
    },
    {
      "name": "routerResponses",
      "method": "POST",
      "path": "/router/v1/responses",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "routerResponsesStream",
      "method": "POST",
      "path": "/router/v1/responses",
      "retryable": false,
      "response": "sse"
    },
    {
      "name": "routerMessages",
      "method": "POST",
      "path": "/router/v1/messages",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "routerMessagesStream",
      "method": "POST",
      "path": "/router/v1/messages",
      "retryable": false,
      "response": "sse"
    },
    {
      "name": "listRouterModels",
      "method": "GET",
      "path": "/router/v1/models",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "getRouterModel",
      "method": "GET",
      "path": "/router/v1/models/{model}",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "generateAuthToken",
      "method": "POST",
      "path": "/generate_auth_token",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "revokeAuthToken",
      "method": "POST",
      "path": "/revoke_auth_token",
      "retryable": false,
      "response": "text"
    }
  ],
  "parallel": [
    {
      "name": "search",
      "method": "POST",
      "path": "/v1/search",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "imageSearch",
      "method": "POST",
      "path": "/v1/images/search",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "extract",
      "method": "POST",
      "path": "/v1/extract",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "createTaskGroup",
      "method": "POST",
      "path": "/v1/tasks/groups",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "retrieveTaskGroup",
      "method": "GET",
      "path": "/v1/tasks/groups/{taskgroup_id}",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "streamTaskGroupEvents",
      "method": "GET",
      "path": "/v1/tasks/groups/{taskgroup_id}/events",
      "retryable": true,
      "response": "sse"
    },
    {
      "name": "addRunsToTaskGroup",
      "method": "POST",
      "path": "/v1/tasks/groups/{taskgroup_id}/runs",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "fetchTaskGroupRuns",
      "method": "GET",
      "path": "/v1/tasks/groups/{taskgroup_id}/runs",
      "retryable": true,
      "response": "sse"
    },
    {
      "name": "retrieveTaskGroupRun",
      "method": "GET",
      "path": "/v1/tasks/groups/{taskgroup_id}/runs/{run_id}",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "createTaskRun",
      "method": "POST",
      "path": "/v1/tasks/runs",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "retrieveTaskRun",
      "method": "GET",
      "path": "/v1/tasks/runs/{run_id}",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "streamTaskRunEvents",
      "method": "GET",
      "path": "/v1/tasks/runs/{run_id}/events",
      "retryable": true,
      "response": "sse"
    },
    {
      "name": "retrieveTaskRunInput",
      "method": "GET",
      "path": "/v1/tasks/runs/{run_id}/input",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "retrieveTaskRunResult",
      "method": "GET",
      "path": "/v1/tasks/runs/{run_id}/result",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "fastEntitySearch",
      "method": "POST",
      "path": "/v1beta/findall/entity-search",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "ingestFindAllRun",
      "method": "POST",
      "path": "/v1beta/findall/ingest",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "createFindAllRun",
      "method": "POST",
      "path": "/v1beta/findall/runs",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "retrieveFindAllRunStatus",
      "method": "GET",
      "path": "/v1beta/findall/runs/{findall_id}",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "cancelFindAllRun",
      "method": "POST",
      "path": "/v1beta/findall/runs/{findall_id}/cancel",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "addEnrichmentToFindAllRun",
      "method": "POST",
      "path": "/v1beta/findall/runs/{findall_id}/enrich",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "streamFindAllEvents",
      "method": "GET",
      "path": "/v1beta/findall/runs/{findall_id}/events",
      "retryable": true,
      "response": "sse"
    },
    {
      "name": "extendFindAllRun",
      "method": "POST",
      "path": "/v1beta/findall/runs/{findall_id}/extend",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "findAllRunResult",
      "method": "GET",
      "path": "/v1beta/findall/runs/{findall_id}/result",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "getFindAllRunSchema",
      "method": "GET",
      "path": "/v1beta/findall/runs/{findall_id}/schema",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "createMonitor",
      "method": "POST",
      "path": "/v1/monitors",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "listMonitors",
      "method": "GET",
      "path": "/v1/monitors",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "monitorStats",
      "method": "GET",
      "path": "/v1/monitors/stats",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "retrieveMonitor",
      "method": "GET",
      "path": "/v1/monitors/{monitor_id}",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "cancelMonitor",
      "method": "POST",
      "path": "/v1/monitors/{monitor_id}/cancel",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "listMonitorEvents",
      "method": "GET",
      "path": "/v1/monitors/{monitor_id}/events",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "triggerMonitorRun",
      "method": "POST",
      "path": "/v1/monitors/{monitor_id}/trigger",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "updateMonitor",
      "method": "POST",
      "path": "/v1/monitors/{monitor_id}/update",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "clearMemory",
      "method": "POST",
      "path": "/v1beta/memory/clear",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "evictFromMemory",
      "method": "POST",
      "path": "/v1beta/memory/evict",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "retrieveMemory",
      "method": "POST",
      "path": "/v1beta/memory/retrieve",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "chatCompletions",
      "method": "POST",
      "path": "/v1beta/chat/completions",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "chatCompletionsStream",
      "method": "POST",
      "path": "/v1beta/chat/completions",
      "retryable": false,
      "response": "sse"
    },
    {
      "name": "createResponse",
      "method": "POST",
      "path": "/v1/responses",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "createResponseStream",
      "method": "POST",
      "path": "/v1/responses",
      "retryable": false,
      "response": "sse"
    }
  ],
  "linkup": [
    {
      "name": "balance",
      "method": "GET",
      "path": "/v1/credits/balance",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "createExtract",
      "method": "POST",
      "path": "/v1/extract",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "listExtract",
      "method": "GET",
      "path": "/v1/extract",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "getExtract",
      "method": "GET",
      "path": "/v1/extract/{id}",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "fetchPage",
      "method": "POST",
      "path": "/v1/fetch",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "search",
      "method": "POST",
      "path": "/v1/search",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "createTasks",
      "method": "POST",
      "path": "/v1/tasks",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "listTasks",
      "method": "GET",
      "path": "/v1/tasks",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "getTask",
      "method": "GET",
      "path": "/v1/tasks/{id}",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "responses",
      "method": "POST",
      "path": "/v1/responses",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "createResearch",
      "method": "POST",
      "path": "/v1/research",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "listResearch",
      "method": "GET",
      "path": "/v1/research",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "getResearch",
      "method": "GET",
      "path": "/v1/research/{id}",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "rewindSearch",
      "method": "POST",
      "path": "/v1/rewind/search",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "rewindFetch",
      "method": "POST",
      "path": "/v1/rewind/fetch",
      "retryable": false,
      "response": "json"
    }
  ],
  "firecrawl": [
    {
      "name": "createMonitor",
      "method": "POST",
      "path": "/monitor",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "listMonitors",
      "method": "GET",
      "path": "/monitor",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "getMonitor",
      "method": "GET",
      "path": "/monitor/{monitorId}",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "updateMonitor",
      "method": "PATCH",
      "path": "/monitor/{monitorId}",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "deleteMonitor",
      "method": "DELETE",
      "path": "/monitor/{monitorId}",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "runMonitor",
      "method": "POST",
      "path": "/monitor/{monitorId}/run",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "listMonitorChecks",
      "method": "GET",
      "path": "/monitor/{monitorId}/checks",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "getMonitorCheck",
      "method": "GET",
      "path": "/monitor/{monitorId}/checks/{checkId}",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "scrape",
      "method": "POST",
      "path": "/scrape",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "interactWithScrapeBrowserSession",
      "method": "POST",
      "path": "/scrape/{jobId}/interact",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "stopInteractiveScrapeBrowserSession",
      "method": "DELETE",
      "path": "/scrape/{jobId}/interact",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "parseFile",
      "method": "POST",
      "path": "/parse",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "getParseFormats",
      "method": "GET",
      "path": "/parse/formats",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "batchScrape",
      "method": "POST",
      "path": "/batch/scrape",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "getBatchScrapeStatus",
      "method": "GET",
      "path": "/batch/scrape/{id}",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "cancelBatchScrape",
      "method": "DELETE",
      "path": "/batch/scrape/{id}",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "getBatchScrapeErrors",
      "method": "GET",
      "path": "/batch/scrape/{id}/errors",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "getCrawlStatus",
      "method": "GET",
      "path": "/crawl/{id}",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "cancelCrawl",
      "method": "DELETE",
      "path": "/crawl/{id}",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "getCrawlErrors",
      "method": "GET",
      "path": "/crawl/{id}/errors",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "crawl",
      "method": "POST",
      "path": "/crawl",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "crawlParamsPreview",
      "method": "POST",
      "path": "/crawl/params-preview",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "map",
      "method": "POST",
      "path": "/map",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "extract",
      "method": "POST",
      "path": "/extract",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "getExtractStatus",
      "method": "GET",
      "path": "/extract/{id}",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "listAgents",
      "method": "GET",
      "path": "/agent",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "startAgent",
      "method": "POST",
      "path": "/agent",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "getAgentStatus",
      "method": "GET",
      "path": "/agent/{jobId}",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "cancelAgent",
      "method": "DELETE",
      "path": "/agent/{jobId}",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "getAgentTrace",
      "method": "GET",
      "path": "/agent/{jobId}/trace",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "getAgentSnapshot",
      "method": "GET",
      "path": "/agent/{jobId}/snapshots/{snapshotId}",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "getActiveCrawls",
      "method": "GET",
      "path": "/crawl/active",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "getCreditUsage",
      "method": "GET",
      "path": "/team/credit-usage",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "getHistoricalCreditUsage",
      "method": "GET",
      "path": "/team/credit-usage/historical",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "getTokenUsage",
      "method": "GET",
      "path": "/team/token-usage",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "getHistoricalTokenUsage",
      "method": "GET",
      "path": "/team/token-usage/historical",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "getQueueStatus",
      "method": "GET",
      "path": "/team/queue-status",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "getActivity",
      "method": "GET",
      "path": "/team/activity",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "search",
      "method": "POST",
      "path": "/search",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "createBrowserSession",
      "method": "POST",
      "path": "/interact",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "listBrowserSessions",
      "method": "GET",
      "path": "/interact",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "executeBrowserCode",
      "method": "POST",
      "path": "/interact/{sessionId}/execute",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "deleteBrowserSession",
      "method": "DELETE",
      "path": "/interact/{sessionId}",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "getScrapeStatus",
      "method": "GET",
      "path": "/scrape/{jobId}",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "submitSearchFeedback",
      "method": "POST",
      "path": "/search/{jobId}/feedback",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "askSupportAgent",
      "method": "POST",
      "path": "/support/ask",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "searchSupportDocs",
      "method": "POST",
      "path": "/support/docs-search",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "researchSearchPapers",
      "method": "GET",
      "path": "/search/research/papers",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "researchGetPaper",
      "method": "GET",
      "path": "/search/research/papers/{id}",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "researchRelatedPapers",
      "method": "GET",
      "path": "/search/research/papers/{id}/similar",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "developerSearch",
      "method": "GET",
      "path": "/search/developer",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "developerSearchPost",
      "method": "POST",
      "path": "/search/developer",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "govSearch",
      "method": "GET",
      "path": "/search/gov",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "govSearchPost",
      "method": "POST",
      "path": "/search/gov",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "submitEndpointFeedback",
      "method": "POST",
      "path": "/feedback",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "getThreatProtection",
      "method": "GET",
      "path": "/team/threat-protection",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "updateThreatProtection",
      "method": "PUT",
      "path": "/team/threat-protection",
      "retryable": false,
      "response": "json"
    }
  ],
  "you": [
    {
      "name": "search",
      "method": "POST",
      "path": "/v1/search",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "contents",
      "method": "POST",
      "path": "/v1/contents",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "answer",
      "method": "POST",
      "path": "/v1/answer",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "research",
      "method": "POST",
      "path": "/v1/research",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "getResearchTask",
      "method": "GET",
      "path": "/v1/research/{task_id}",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "streamResearchTask",
      "method": "GET",
      "path": "/v1/research/{task_id}/stream",
      "retryable": true,
      "response": "sse"
    },
    {
      "name": "financeResearch",
      "method": "POST",
      "path": "/v1/finance_research",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "getAccountBalance",
      "method": "GET",
      "path": "/v1/billing/account_balance",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "images",
      "method": "GET",
      "path": "/v1/images",
      "retryable": true,
      "response": "json"
    }
  ],
  "serper": [
    {
      "name": "search",
      "method": "POST",
      "path": "/search",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "searchGet",
      "method": "GET",
      "path": "/search",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "images",
      "method": "POST",
      "path": "/images",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "imagesGet",
      "method": "GET",
      "path": "/images",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "videos",
      "method": "POST",
      "path": "/videos",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "videosGet",
      "method": "GET",
      "path": "/videos",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "places",
      "method": "POST",
      "path": "/places",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "placesGet",
      "method": "GET",
      "path": "/places",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "maps",
      "method": "POST",
      "path": "/maps",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "mapsGet",
      "method": "GET",
      "path": "/maps",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "reviews",
      "method": "POST",
      "path": "/reviews",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "reviewsGet",
      "method": "GET",
      "path": "/reviews",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "news",
      "method": "POST",
      "path": "/news",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "newsGet",
      "method": "GET",
      "path": "/news",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "shopping",
      "method": "POST",
      "path": "/shopping",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "shoppingGet",
      "method": "GET",
      "path": "/shopping",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "scholar",
      "method": "POST",
      "path": "/scholar",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "scholarGet",
      "method": "GET",
      "path": "/scholar",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "patents",
      "method": "POST",
      "path": "/patents",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "patentsGet",
      "method": "GET",
      "path": "/patents",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "autocomplete",
      "method": "POST",
      "path": "/autocomplete",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "autocompleteGet",
      "method": "GET",
      "path": "/autocomplete",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "lens",
      "method": "POST",
      "path": "/lens",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "lensGet",
      "method": "GET",
      "path": "/lens",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "scrape",
      "method": "POST",
      "path": "/",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "scrapeGet",
      "method": "GET",
      "path": "/",
      "retryable": true,
      "response": "json"
    }
  ],
  "serpapi": [
    {
      "name": "search",
      "method": "GET",
      "path": "/search.json",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "searchHtml",
      "method": "GET",
      "path": "/search.html",
      "retryable": false,
      "response": "text"
    },
    {
      "name": "searchMarkdown",
      "method": "GET",
      "path": "/search.md",
      "retryable": false,
      "response": "text"
    },
    {
      "name": "searchPixelPositions",
      "method": "GET",
      "path": "/search.json_with_pixel_position",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "getSearch",
      "method": "GET",
      "path": "/searches/{search_id}.json",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "getSearchHtml",
      "method": "GET",
      "path": "/searches/{search_id}.html",
      "retryable": true,
      "response": "text"
    },
    {
      "name": "getSearchPixelPositions",
      "method": "GET",
      "path": "/searches/{search_id}.json_with_pixel_position",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "locations",
      "method": "GET",
      "path": "/locations.json",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "account",
      "method": "GET",
      "path": "/account.json",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "uploadImage",
      "method": "POST",
      "path": "/image",
      "retryable": false,
      "response": "json"
    }
  ],
  "wondersearch": [
    {
      "name": "searchDrive",
      "method": "POST",
      "path": "/v1/drives/{drive_id}/search",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "getPassage",
      "method": "GET",
      "path": "/v1/drives/{drive_id}/passages/{passage_id}",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "getCapabilities",
      "method": "GET",
      "path": "/v1/workspaces/{workspace_id}/capabilities",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "searchWorkspace",
      "method": "POST",
      "path": "/v1/workspaces/{workspace_id}/search",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "bootstrapAccount",
      "method": "POST",
      "path": "/v1/account/bootstrap",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "getMe",
      "method": "GET",
      "path": "/v1/me",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "listOrganizations",
      "method": "GET",
      "path": "/v1/organizations",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "getOrganization",
      "method": "GET",
      "path": "/v1/organizations/{organization_id}",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "getOrganizationRaw",
      "method": "GET",
      "path": "/v1/organizations/{organization_id}",
      "retryable": true,
      "response": "raw"
    },
    {
      "name": "updateOrganization",
      "method": "PATCH",
      "path": "/v1/organizations/{organization_id}",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "listOrganizationMembers",
      "method": "GET",
      "path": "/v1/organizations/{organization_id}/members",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "updateOrganizationMember",
      "method": "PATCH",
      "path": "/v1/organizations/{organization_id}/members/{user_id}",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "deleteOrganizationMember",
      "method": "DELETE",
      "path": "/v1/organizations/{organization_id}/members/{user_id}",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "listOrganizationWorkspaces",
      "method": "GET",
      "path": "/v1/organizations/{organization_id}/workspaces",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "createOrganizationWorkspace",
      "method": "POST",
      "path": "/v1/organizations/{organization_id}/workspaces",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "getWorkspace",
      "method": "GET",
      "path": "/v1/workspaces/{workspace_id}",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "getWorkspaceRaw",
      "method": "GET",
      "path": "/v1/workspaces/{workspace_id}",
      "retryable": true,
      "response": "raw"
    },
    {
      "name": "updateWorkspace",
      "method": "PATCH",
      "path": "/v1/workspaces/{workspace_id}",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "listWorkspaceInheritedMembers",
      "method": "GET",
      "path": "/v1/workspaces/{workspace_id}/inherited-members",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "listWorkspaceMembers",
      "method": "GET",
      "path": "/v1/workspaces/{workspace_id}/members",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "createWorkspaceMember",
      "method": "POST",
      "path": "/v1/workspaces/{workspace_id}/members",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "updateWorkspaceMember",
      "method": "PATCH",
      "path": "/v1/workspaces/{workspace_id}/members/{user_id}",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "deleteWorkspaceMember",
      "method": "DELETE",
      "path": "/v1/workspaces/{workspace_id}/members/{user_id}",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "listOrganizationInvitations",
      "method": "GET",
      "path": "/v1/organizations/{organization_id}/invitations",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "createOrganizationInvitation",
      "method": "POST",
      "path": "/v1/organizations/{organization_id}/invitations",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "getOrganizationInvitation",
      "method": "GET",
      "path": "/v1/organizations/{organization_id}/invitations/{invitation_id}",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "getOrganizationInvitationRaw",
      "method": "GET",
      "path": "/v1/organizations/{organization_id}/invitations/{invitation_id}",
      "retryable": true,
      "response": "raw"
    },
    {
      "name": "deleteOrganizationInvitation",
      "method": "DELETE",
      "path": "/v1/organizations/{organization_id}/invitations/{invitation_id}",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "resendOrganizationInvitation",
      "method": "POST",
      "path": "/v1/organizations/{organization_id}/invitations/{invitation_id}/resend",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "previewInvitation",
      "method": "POST",
      "path": "/v1/invitations/preview",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "acceptInvitation",
      "method": "POST",
      "path": "/v1/invitations/accept",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "listWorkspaceApiKeys",
      "method": "GET",
      "path": "/v1/workspaces/{workspace_id}/api-keys",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "createWorkspaceApiKey",
      "method": "POST",
      "path": "/v1/workspaces/{workspace_id}/api-keys",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "deleteWorkspaceApiKey",
      "method": "DELETE",
      "path": "/v1/workspaces/{workspace_id}/api-keys/{key_id}",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "getWorkspaceOverview",
      "method": "GET",
      "path": "/v1/workspaces/{workspace_id}/overview",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "getOrganizationUsage",
      "method": "GET",
      "path": "/v1/organizations/{organization_id}/usage",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "listWorkspaceDrives",
      "method": "GET",
      "path": "/v1/workspaces/{workspace_id}/drives",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "createWorkspaceDrive",
      "method": "POST",
      "path": "/v1/workspaces/{workspace_id}/drives",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "getDrive",
      "method": "GET",
      "path": "/v1/drives/{drive_id}",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "getDriveRaw",
      "method": "GET",
      "path": "/v1/drives/{drive_id}",
      "retryable": true,
      "response": "raw"
    },
    {
      "name": "updateDrive",
      "method": "PATCH",
      "path": "/v1/drives/{drive_id}",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "deleteDrive",
      "method": "DELETE",
      "path": "/v1/drives/{drive_id}",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "listDriveFolders",
      "method": "GET",
      "path": "/v1/drives/{drive_id}/folders",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "createDriveFolder",
      "method": "POST",
      "path": "/v1/drives/{drive_id}/folders",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "getDriveFolder",
      "method": "GET",
      "path": "/v1/drives/{drive_id}/folders/{folder_id}",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "getDriveFolderRaw",
      "method": "GET",
      "path": "/v1/drives/{drive_id}/folders/{folder_id}",
      "retryable": true,
      "response": "raw"
    },
    {
      "name": "updateDriveFolder",
      "method": "PATCH",
      "path": "/v1/drives/{drive_id}/folders/{folder_id}",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "deleteDriveFolder",
      "method": "DELETE",
      "path": "/v1/drives/{drive_id}/folders/{folder_id}",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "createDriveDocument",
      "method": "POST",
      "path": "/v1/drives/{drive_id}/documents",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "listDriveDocuments",
      "method": "GET",
      "path": "/v1/drives/{drive_id}/documents",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "getDriveDocument",
      "method": "GET",
      "path": "/v1/drives/{drive_id}/documents/{document_id}",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "replaceDocument",
      "method": "PUT",
      "path": "/v1/drives/{drive_id}/documents/{document_id}",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "deleteDriveDocument",
      "method": "DELETE",
      "path": "/v1/drives/{drive_id}/documents/{document_id}",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "getDriveDocumentSource",
      "method": "GET",
      "path": "/v1/drives/{drive_id}/documents/{document_id}/source",
      "retryable": true,
      "response": "bytes"
    },
    {
      "name": "getWorkspaceDefaultDrive",
      "method": "GET",
      "path": "/v1/workspaces/{workspace_id}/default-drive",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "getWorkspaceDefaultDriveRaw",
      "method": "GET",
      "path": "/v1/workspaces/{workspace_id}/default-drive",
      "retryable": true,
      "response": "raw"
    },
    {
      "name": "setDefaultDrive",
      "method": "PUT",
      "path": "/v1/workspaces/{workspace_id}/default-drive",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "getSdkContext",
      "method": "GET",
      "path": "/v1/sdk/context",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "getDriveUploadCapabilities",
      "method": "GET",
      "path": "/v1/drives/{drive_id}/uploads/capabilities",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "createUploadBatch",
      "method": "POST",
      "path": "/v1/drives/{drive_id}/uploads/batch",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "completeUploadBatch",
      "method": "POST",
      "path": "/v1/drives/{drive_id}/uploads/batch/complete",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "getUploadBatchStatus",
      "method": "POST",
      "path": "/v1/drives/{drive_id}/uploads/batch/status",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "createDriveUpload",
      "method": "POST",
      "path": "/v1/drives/{drive_id}/uploads",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "getDriveUpload",
      "method": "GET",
      "path": "/v1/drives/{drive_id}/uploads/{upload_id}",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "uploadContent",
      "method": "PUT",
      "path": "/v1/drives/{drive_id}/uploads/{upload_id}/content",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "createUploadTransfer",
      "method": "POST",
      "path": "/v1/drives/{drive_id}/uploads/{upload_id}/transfer",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "completeUpload",
      "method": "POST",
      "path": "/v1/drives/{drive_id}/uploads/{upload_id}/complete",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "getWorkspaceOperation",
      "method": "GET",
      "path": "/v1/workspaces/{workspace_id}/operations/{operation_id}",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "createImport",
      "method": "PUT",
      "path": "/v1/drives/{drive_id}/imports/{import_id}",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "getImport",
      "method": "GET",
      "path": "/v1/drives/{drive_id}/imports/{import_id}",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "declareImportChunks",
      "method": "POST",
      "path": "/v1/drives/{drive_id}/imports/{import_id}/chunks",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "acknowledgeImportChunk",
      "method": "POST",
      "path": "/v1/drives/{drive_id}/imports/{import_id}/chunks/{sequence}/acknowledge",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "sealImport",
      "method": "POST",
      "path": "/v1/drives/{drive_id}/imports/{import_id}/seal",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "getIngestionMetrics",
      "method": "GET",
      "path": "/v1/drives/{drive_id}/ingestion-metrics",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "getOrganizationBilling",
      "method": "GET",
      "path": "/v1/organizations/{organization_id}/billing",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "setBillingLimits",
      "method": "POST",
      "path": "/v1/organizations/{organization_id}/billing/limits",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "getOrganizationBillingLimits",
      "method": "GET",
      "path": "/v1/organizations/{organization_id}/billing/limits",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "getOrganizationBillingUsage",
      "method": "GET",
      "path": "/v1/organizations/{organization_id}/billing/usage",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "createBillingPortal",
      "method": "POST",
      "path": "/v1/organizations/{organization_id}/billing/portal",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "getOrganizationBillingWallet",
      "method": "GET",
      "path": "/v1/organizations/{organization_id}/billing/wallet",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "getOrganizationBillingActivity",
      "method": "GET",
      "path": "/v1/organizations/{organization_id}/billing/activity",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "createOrganizationBillingPurchase",
      "method": "POST",
      "path": "/v1/organizations/{organization_id}/billing/purchases",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "getOrganizationBillingPurchase",
      "method": "GET",
      "path": "/v1/organizations/{organization_id}/billing/purchases/{purchase_id}",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "listOrganizationBillingInvoices",
      "method": "GET",
      "path": "/v1/organizations/{organization_id}/billing/invoices",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "getWorkspaceStorage",
      "method": "GET",
      "path": "/v1/workspaces/{workspace_id}/storage",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "setWorkspaceStorage",
      "method": "POST",
      "path": "/v1/workspaces/{workspace_id}/storage",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "quoteWorkspaceStorage",
      "method": "POST",
      "path": "/v1/workspaces/{workspace_id}/storage/quote",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "closeImport",
      "method": "POST",
      "path": "/v1/drives/{drive_id}/imports/{import_id}/close",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "recoverImport",
      "method": "POST",
      "path": "/v1/drives/{drive_id}/imports/{import_id}/recover",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "retryImportOperation",
      "method": "POST",
      "path": "/v1/drives/{drive_id}/imports/{import_id}/operations/{operation_id}/retry",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "getAutoTopup",
      "method": "GET",
      "path": "/v1/organizations/{organization_id}/billing/auto-topup",
      "retryable": true,
      "response": "json"
    },
    {
      "name": "checkoutAutoTopup",
      "method": "POST",
      "path": "/v1/organizations/{organization_id}/billing/auto-topup/checkout",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "amountAutoTopup",
      "method": "POST",
      "path": "/v1/organizations/{organization_id}/billing/auto-topup/amount",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "cancelAutoTopup",
      "method": "POST",
      "path": "/v1/organizations/{organization_id}/billing/auto-topup/cancel",
      "retryable": false,
      "response": "json"
    },
    {
      "name": "resumeAutoTopup",
      "method": "POST",
      "path": "/v1/organizations/{organization_id}/billing/auto-topup/resume",
      "retryable": false,
      "response": "json"
    }
  ]
};
export const nativeHelperIndex: Readonly<Record<string, readonly string[]>> = {
  "context": [
    "logoUrl"
  ],
  "tinyfish": [],
  "exa": [],
  "tavily": [],
  "brave": [],
  "perplexity": [],
  "parallel": [],
  "linkup": [],
  "firecrawl": [],
  "you": [],
  "serper": [],
  "serpapi": [
    "google",
    "extract",
    "extractMarkdown"
  ],
  "wondersearch": []
};
