# Runtime policy

Values live in `policy.json`; this page states the rules that use them. Every
rule has vectors in `conformance/policy/`.

## Validation (before anything is sent)
- **Query:** a string. Code points in `query.blank` are trimmed from both ends;
  nothing may remain blank. After trimming it may not contain `query.forbidden`
  code points or unpaired surrogates, and may hold at most `query.maxCodePoints`
  code points (not UTF-16 units, not bytes).
- **Domains:** ASCII-lowercased, deduplicated in order; each needs
  `domains.minLabels` labels matching `domains.labelPattern` and at most
  `domains.maxLength` characters. Non-ASCII names must be punycode. An empty
  list means no filter. A domain may not be both included and excluded.
- **Dates:** `startDate` and `endDate` are real `YYYY-MM-DD` dates, inclusive,
  start ≤ end. `recency` cannot be combined with them.
- **Country / language:** two ASCII letters, normalized to `US` / `en`.
- **URLs:** `http` or `https`, no credentials, no whitespace or controls, at
  most `contents.maxUrlLength` characters, unique by URL key.
- **URL key:** lowercase scheme and host, drop `:80`/`:443` for their scheme,
  and an empty path becomes `/`. Pages are matched to requested URLs by key.
- Unknown option names fail. Provider limits (result count, domain count,
  query length, URL count) and options a provider cannot express raise
  `unsupported` for that provider, which is then skipped.

## Requests
- Spec `fixed` values first, then mapped options in spec order, then provider
  options, which may replace a fixed top-level key but not one an option set.
- Query strings percent-encode everything except RFC 3986 unreserved
  characters; spaces are `%20`.
- Headers: `accept`, `content-type` for JSON bodies, and the auth header. No
  others. Redirects are never followed.

## Responses
- 2xx bodies must be UTF-8 JSON; a leading byte order mark is ignored. The
  size limit counts bytes as received; `Content-Length` triggers an early
  reject only when it is a single integer.
- Status codes map through provider `errors` rules, then `policy.status`,
  then `statusDefault`.
- Search rows without an `http(s)` URL are dropped with an
  `invalid_rows_dropped` warning. Blank titles and authors become `null`.
- A header value containing a comma (duplicates joined) is ignored.
- `Retry-After` is delta-seconds or an IMF-fixdate; anything else is ignored.

## Retries, deadlines, fallback
- Only `transient` codes are retried, up to `maxRetries` (default
  `retry.defaultMaxRetries`). Delay for retry *i*: `e = min(maxDelayMs,
  baseDelayMs × 2^i)`, `floor(e/2 + r × e/2)`, at least `Retry-After`. A
  `Retry-After` above `retry.maxRetryAfterMs`, or a wait that would reach the
  call deadline, ends retrying.
- `timeoutMs` bounds the whole call, including body reading. When it fires the
  code is `timeout`; when only `attemptTimeoutMs` fires it is
  `attempt_timeout`. There is no other ceiling.
- The chain is the call's provider, then its fallback list; each provider is
  tried once. After retries, the next provider runs only for codes in
  `fallbackOn`.
  `aborted`, `timeout`, `invalid_response` and `response_too_large` never
  retry or fall back: the provider may already have billed.
- A successful response is never discarded for being slow.
