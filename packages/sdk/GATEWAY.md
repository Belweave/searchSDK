# Application gateway

`@belweave/search-sdk/gateway` exposes a Fetch-compatible server handler for
application clients. Mount it at an exact route in your server framework. It
uses the server's configured `createSearch` instance, including its explicit
retry and fallback policies. It does not add a public endpoint to searchsdk.dev.

```ts
import { createSearch } from '@belweave/search-sdk';
import { createSearchGateway } from '@belweave/search-sdk/gateway';
import { exa } from '@belweave/search-sdk/exa';

// Server-side setup. validateApplicationToken is your authentication service.
export function makeHandler(providerKey: string,
  validateApplicationToken: (authorization: string | null, signal: AbortSignal) => Promise<boolean>) {
  return createSearchGateway({
    search: createSearch({ provider: exa({ apiKey: providerKey }) }),
    authorize: ({ headers, signal }) => validateApplicationToken(headers.get('authorization'), signal),
    timeoutMs: 10_000,
    maxConcurrency: 32,
    // Include only when serving a browser application from this origin:
    allowedOrigins: ['https://app.example.com'],
  });
}
```

The client posts `{ "query": "SQLite concurrency", "limit": 3 }` to your
application's exact HTTPS URL. The successful JSON body is `SearchResponse`;
errors are `{ "error": { "code": "auth", "attempts": [] } }`, optionally with
sanitized `status` and `retryAfterMs`. Responses carry `X-SearchSDK-Protocol: 1`
and `Cache-Control: no-store`. A gateway error never includes raw exception
messages or provider bodies.

Authorization is required in configuration and runs before reading the body or
dispatching search. The application callback must validate its own session or
access token and enforce per-user access and spending policy. The gateway does
not mint tokens or implement an identity service. An explicit callback returning
`true` is suitable only for a deliberately public or separately protected route.
Provider credentials belong exclusively in the server-side provider configuration.

Only `query`, `limit`, `includeDomains`, and `excludeDomains` are accepted. Provider
selection, keys, URLs, retry settings, and native operations cannot be supplied
through the request. Native mutation APIs are deliberately outside this normalized
search endpoint. Browser origins require explicit HTTPS allowlisting; requests
without an Origin header, including native applications, still require authorization.

The default request cap is 64 KiB, decoded response cap 10 MiB, total handler
deadline 10 seconds, and concurrency ceiling 32. Overload returns 429 immediately.
The deadline includes authorization, body reading, provider work, validation, and
serialization. The handler signals cancellation and settles even if application
callbacks ignore it; it cannot terminate arbitrary application work that ignores
the signal. Bound underlying resources in those callbacks too. Successful SDK
responses are validated and copied to known public fields before serialization.
Attempt and provenance timestamps are serialized as UTC RFC 3339 timestamps with
four-digit years, so custom provider metadata is readable across language runtimes.

The host must map connection disconnects to the Fetch Request's signal and mount
this handler only on the intended route. It owns TLS, deployment, token issuance,
per-user quotas, and any logging policy. Never log authorization headers or provider
keys. No gateway, SDK, or package is deployed by building this repository.
