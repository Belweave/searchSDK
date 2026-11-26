# searchSDK errors and warnings

Every failure throws `SearchError` (`code`, `provider`, `status`, `providerCode`, `retryAfterMs`, `field`, `path`, `attempts`, `raw`). Full generated table: https://searchsdk.dev/docs/reference/errors.

| Code | Sent? | Retried | Falls back | Do |
| --- | --- | --- | --- | --- |
| `invalid_request` | no | no | no | Fix the option named by `field` |
| `configuration` | no | no | no | Set the key variable or a valid provider |
| `unsupported` | no | no | yes | Drop the option or use another provider |
| `auth` (401) | yes | no | no | Check the key |
| `forbidden` (403) | yes | no | no | Plan or permission |
| `quota` (402 or provider signal) | yes | no | yes | Top up or fall back |
| `rate_limit` (429) | yes | yes | yes | `maxRetries` honours `Retry-After` |
| `unavailable` (5xx, 408) | yes | yes | yes | Retry or fall back |
| `provider_error` (other 4xx) | yes | no | no | Inspect `providerCode` |
| `network` | yes | yes | yes | May have been billed |
| `attempt_timeout` | yes | yes | yes | Raise `attemptTimeoutMs` |
| `timeout` | yes | no | no | Raise `timeoutMs` |
| `aborted` | if under way | no | no | Your signal fired |
| `invalid_response` | yes | no | no | Not a JSON object; billed for a 2xx |
| `spec_mismatch` | yes | no | no | Registry and provider disagree at `path`; report it |
| `response_too_large` | yes | no | no | Raise `maxResponseBytes` |

Warnings (on success): `fallback_used`, `fallback_key_missing`, `invalid_rows_dropped`, `unmatched_pages`, and from providers `partial_results`, `provider_warning`, `provider_notice`.

```ts
import { createClient, SearchError } from "@searchsdk/sdk";

const client = createClient({ provider: "tavily", fallback: ["exa"] });
try {
  const res = await client.search("eu ai act");
  if (res.warnings.some((w) => w.code === "fallback_used")) console.log("served by", res.provider);
} catch (e) {
  if (!(e instanceof SearchError)) throw e;
  const billed = e.attempts.filter((a) => a.billed !== "no").length;
  console.log(e.code, e.field ?? "", `billed attempts: ${billed}`);
}
```
