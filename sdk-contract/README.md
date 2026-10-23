# SDK interoperability contract

The TypeScript implementation in `packages/sdk/src` remains the reference for
normalized search semantics. Language packages must explicitly distinguish
normalized providers, provider-native operations, and application gateway clients.
Provider schemas and operation attribution remain in `scripts/providers-a` and
`scripts/providers-b`.

## Application gateway protocol, version 1

Mobile and browser applications call an application-owned HTTPS endpoint. The
endpoint is an exact URL supplied by the application (no automatic path suffix).
It accepts `POST`, `Content-Type: application/json`, and the normalized search
request as the JSON body: `query`, optional `limit` (integer 1–20, default 5),
optional `includeDomains` and `excludeDomains`. Domain values are nonempty arrays
of ASCII hostnames, normalized to lowercase and deduplicated; overlapping lists
are invalid. Unknown request fields are invalid. Query must be nonblank.

The application supplies a short-lived application access token per request, if
authentication is needed: `Authorization: Bearer <token>`. It must never supply
a provider key to a mobile client. Tokens are never persisted or logged by SDKs.
Clients reject URL credentials, fragments, query strings, and non-HTTPS endpoints.
Local tests use injected transports. Redirects must not forward credentials.

Success is HTTP 200 with the `SearchResponse` JSON object defined in
`packages/sdk/src/types.ts`: `provider`, `results`, `usage`, `warnings`, `attempts`,
and optional `reuse`. Result provenance is mandatory. Unknown usage is `null`.
The response header `X-SearchSDK-Protocol: 1` identifies this protocol; clients
may accept its absence, but must reject a different version when present.
Attempt and provenance timestamps use RFC 3339 with four-digit years. The
TypeScript gateway canonicalizes its accepted date values to UTC before sending.

Failure is a non-2xx HTTP status with JSON
`{"error":{"code":"invalid_request","attempts":[]}}`. Optional `status` and
`retryAfterMs` carry sanitized upstream metadata. Error codes match
`SearchErrorCode` in `packages/sdk/src/types.ts`. Never expose upstream bodies,
exception text, authorization headers, request queries, or credentials as errors.
For missing/malformed error envelopes, map 401/402/403/432/433 to `auth`, 429 to
`rate_limit`, 408 and 5xx to `unavailable`, and other statuses to `provider_error`.
Malformed successful responses are `invalid_response`.

Client operations have a whole-call deadline (default 10 seconds), cancellation,
and a decoded response ceiling (default 10 MiB). Validate all consumed fields,
including finite numeric values, HTTP(S) result URLs without credentials,
provenance, warnings, and attempts. Never silently retry gateway POSTs. Backend
retry/fallback policies are selected by the application and remain explicit.
Batch helpers dispatch individual search requests with bounded concurrency and
ordered per-item outcomes; a failed item does not discard successful siblings.

## Packaging and verification

Each package owns its source, tests, license, package metadata, usage examples,
and technical support matrix. Deterministic injected transports and loopback
servers may verify behavior; they do not establish live provider correctness.
Packaged-consumer checks must exercise the distributable artifact. Generated
files must have a deterministic generator/check command and retained attribution.
No automated test may call a paid provider or create remote infrastructure.

`fixtures/request-cases.json` specifies request normalization and rejection cases.
`fixtures/search-success.json` and `fixtures/search-errors.json` are synthetic
gateway protocol examples. `fixtures/providers.json` records each normalized
adapter's capabilities, native request encoding, synthetic upstream response, and
normalized output. Retrieval timestamps are replaced with a fixed fixture time.
It is generated from the TypeScript source, never from a live provider call:

```sh
npm run build:sdk
node scripts/generate-sdk-contract.mjs
node scripts/generate-sdk-contract.mjs --check
```

Language-specific tests should consume these fixtures directly or verify that
their packaged fixture copies match. Passing them establishes consistency with
the reference implementation, not live endpoint compatibility.
