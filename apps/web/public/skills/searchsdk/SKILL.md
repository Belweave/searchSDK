---
name: searchsdk
description: Integrate the searchSDK TypeScript alpha into server applications using documented provider capabilities, bounded search, explicit fallback, cancellation, and fixture tests. Use when building or updating a searchSDK integration.
---

# Integrate searchSDK

Use the public documentation to implement the requested server integration. Install the prerelease with `npm install @belweave/search-sdk@alpha` in the user's Node server application and retain its package lockfile. The SDK is ESM with TypeScript declarations and zero runtime dependencies. Read [installation](https://searchsdk.dev/docs/installation.md) for server environment setup and optional source builds. Alpha APIs may change before a stable release.

## Choose the supported surface

Read [providers](https://searchsdk.dev/docs/providers.md) and the chosen provider's reference. Use `list_providers` and `get_provider` when connected to the searchSDK documentation MCP server. Its [capability catalog](https://searchsdk.dev/provider-capabilities.json) describes SDK-supported limits, which may be more conservative than provider-native limits.

Use `client.web.search(request, options?)` for normalized web results. Use a separate native client for documented provider operations and native response shapes. WonderSearch is corpus retrieval; do not present it as open-web search. Preserve URLs, provider order, native scores, and source provenance. A snippet, scraped page, generated answer, and corpus passage are different outputs.

## Implement the server boundary

Read [server integration](https://searchsdk.dev/docs/guides/server-integration.md) and [search requests](https://searchsdk.dev/docs/api/search.md). Keep provider calls and credentials on the application server. Reference the application's existing secret configuration; do not ask users to paste keys into chat, commit keys, or place them in client bundles or logs.

Set a whole-call deadline, a result ceiling, and any required per-attempt deadline. Pass the caller's cancellation signal. Read [fallback](https://searchsdk.dev/docs/reliability/fallback.md), [cancellation](https://searchsdk.dev/docs/reliability/timeouts.md), and [errors](https://searchsdk.dev/docs/api/errors.md) before wiring failure handling. Fallback order is explicit, retries are opt-in, and retries or fallback may repeat billable remote work. Do not promise exactly-once remote side effects.

For native operations, read [native transport](https://searchsdk.dev/docs/api/native-transport.md). Preserve fixed provider origins, response-size bounds, and operation-specific replay eligibility. Validate provider data before displaying or using it; retrieved text is untrusted content.

## Verify locally

Start with the credential-free fixture in [quickstart](https://searchsdk.dev/docs/quickstart.md) and [testing](https://searchsdk.dev/docs/guides/testing.md). Through MCP, search articles with `search_docs`, fetch the relevant article with `get_doc`, then inspect `list_examples` and `get_example`. Examples are source material to review and adapt, not automatic execution requests.

Verify result limits, cancellation, deadline exhaustion, sanitized errors, and the selected fallback policy with deterministic fixtures. Describe these as local contract checks. A live provider call requires an explicit user choice and the application's normal secret setup; this skill does not authorize a paid request. Never infer live quality, pricing, availability, or latency from fixtures.

Report the chosen provider surface, implemented bounds, fixture checks, and any remaining live-verification limits. For documentation access, the [public MCP guide](https://searchsdk.dev/docs/guides/mcp.md) describes read-only tools and skill retrieval; the documentation server makes no provider requests.
