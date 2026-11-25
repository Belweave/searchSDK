# Runtime policy

Values live in `policy.json`; this page states the rules that use them. Every
rule has vectors in `conformance/policy/` or `conformance/format/`.

## Validation (before anything is sent)
- **Query:** a string. Code points in `query.blank` are trimmed from both ends;
  nothing may remain. After trimming it may not contain `query.forbidden` code
  points (controls, bidi embeddings, overrides and isolates, tag characters) or
  unpaired surrogates, and may hold at most `query.maxCodePoints` code points
  (not UTF-16 units, not bytes). `blank` covers whitespace, zero-width and
  directional marks, the soft hyphen, Hangul fillers and the braille blank.
- **Domains:** ASCII-lowercased, deduplicated in order; each needs
  `domains.minLabels` labels matching `domains.labelPattern` and at most
  `domains.maxLength` characters. Non-ASCII names must be punycode. An empty
  list means no filter. A domain may not be both included and excluded.
- **Dates:** `startDate` and `endDate` are real `YYYY-MM-DD` dates, inclusive,
  start ≤ end. `recency` cannot be combined with them.
- **Country / language:** two ASCII letters, normalized to `US` / `en`.
- **URLs:** `http` or `https`, no credentials, no whitespace, blank or
  forbidden code points, at most `contents.maxUrlLength` code points, unique
  by URL key.
- **signal:** an object with a boolean `aborted` and `addEventListener` /
  `removeEventListener` functions.
- Integers are JSON numbers with no fractional part; booleans are never
  numbers. A runtime whose language separates integer and float types may
  require its integer type.
- Checks run in this order and the first failure is reported: option names,
  the query (or URLs), the search inputs in the order listed above, call
  settings (`timeoutMs`, `attemptTimeoutMs`, `maxRetries`,
  `maxResponseBytes`, `signal`), `provider`, `fallback`, the
  `providerOptions` keys, then keys.
- Unknown option names fail. Provider limits (result count, query length,
  per-list and combined domain counts, include-or-exclude exclusivity, URL
  count) and options a provider cannot express raise `unsupported` for that
  provider, which is then skipped. Combined and exclusive domain limits report
  `excludeDomains`. An input the spec cannot express names the first such
  input in the order above.
- `field` names the failing input in the spelling above (runtimes in other
  naming conventions spell it as their API does), `providerOptions.<id>` for a
  provider's options that are not an object, and `providerOptions.<id>.<name>`
  for one option.

## Keys
A key is a string of 1 to 512 visible ASCII characters (`!` to `~`, no
space), taken from the client's keys, else the provider's `auth.env` variables
in order (empty values skipped). A client key that is set but unusable is not
replaced by the environment. The call's provider must have one (`configuration`). A fallback
provider without one does not block the call: the response carries a
`fallback_key_missing` warning for it, and if the chain reaches it, it is
skipped with an attempt coded `configuration`.

## Provider options
Looked up among the spec's own `providerOptions` keys only (never inherited
names such as `toString`); the `providerOptions` object itself may only name
registry providers. Each value must match its schema and be JSON that
survives the trip: well-formed strings (no unpaired surrogate, keys included)
and finite numbers. For a query-string request it must be a string, number or
boolean.

## Requests
1. Start from a deep copy of `fixed`.
2. Each param in spec order whose input is set: run its steps; a `null` result
   sends nothing. Write the value at `to`, or with `append`, add it (or each
   element of an array value) to the end of the array at `to`, which starts as
   `[]` when missing or not an array. Writing creates objects along the path
   and replaces anything on the path that is not an object.
3. Each `compose` entry with at least one input set: concatenate its parts in
   order. A text part emits its text. An input part emits its `text` and then
   its value after steps (as in step 6) when the input is set; when it is not,
   it emits nothing, unless `required`, which raises `unsupported` naming that
   input. Write the string at `to`.
4. Provider options, in the caller's order, replace a top-level key whole (a
   replaced key keeps its place). A key that step 2 or 3 wrote is refused.
5. Every `locked` path must still equal its `fixed` value (JSON equality),
   else `invalid_request` for the provider option at that path's first segment.
6. Query-string requests: every top-level value must be a string, number or
   boolean; a param whose value is a list or object makes the request
   `unsupported` for that input. Booleans are `true` / `false`; numbers use ECMAScript
   Number-to-String (`10`, `0.5`, `1e+21`, `1e-7`). Keys and values are
   percent-encoded except RFC 3986 unreserved characters; spaces are `%20`.
7. Headers: `accept`, `content-type` for JSON bodies, and a header key. A query
   key is the last query parameter for every encoding. No other headers;
   redirects are never followed.

## Paths, equality, predicates, patterns
- A path is `$` (the value) or dot-separated segments. Segments read own
  properties only; on an array, a segment of digits is an index and anything
  else is absent. Keys containing `.` cannot be addressed.
- **JSON equality:** same JSON type; numbers by value (`1` equals `1.0`);
  booleans never equal numbers; strings by code points; arrays element by
  element; objects by the same keys with equal values. Absent equals nothing.
- **Predicates:** `equals` and `in` use JSON equality; `range [min, max]` holds
  for a finite number inside it; `present` compares "exists and is not null"
  with its value; `not: true` negates. A `where` list holds when all do.
- Patterns in the schema, specs and `policy.json` are ECMAScript regular
  expressions with the `u` flag in the portable subset (registry/README.md),
  tested as `RegExp.prototype.test` does: a match anywhere, as in JSON Schema.
  `^` and `$` are the ends of the whole string (`$` never matches before a
  trailing newline), `\d` and `\w` are ASCII, `\s` is ECMAScript white space
  and line terminators, and `.` matches anything but a line terminator.
- Schema keywords see an object's own keys only; lengths count code points.

## Responses
- A 2xx body must be a UTF-8 JSON object; a leading byte order mark is ignored.
  The size limit counts bytes as received; `Content-Length` triggers an early
  reject only when it is a single integer.
- Status codes map through provider `errors` rules (status, then JSON equality
  at `bodyPath` when given), then `policy.status`, then `statusDefault`.
- A 2xx body that is not UTF-8 JSON, or not a JSON object, is
  `invalid_response`. A JSON object without the list the spec reads (search
  `results`, a contents page source's `from`) is `spec_mismatch`, and the
  error's `path` names that list's path: the body is not the shape the spec
  expects, which differs from a provider that found nothing. Both keep the
  parsed body in the error's `raw`.
- Search: the result list must be an array; with `resultsOptional`, absent or
  `null` counts as `[]`. Rows are read in order until `maxResults` results are
  kept; rows after that are not inspected. Rows without an `http(s)` URL are
  dropped with an `invalid_rows_dropped` warning. Blank titles, authors and
  warning messages become `null` or are left out.
- Request ids: the first rule giving a string that is not blank wins, with
  blank code points removed from both ends.
- Warnings, in order: `fallback_used`, `fallback_key_missing`, the spec's
  rules in order, then `invalid_rows_dropped`, then `unmatched_pages`.
- `latencyMs` and each attempt's `startMs` count from the call start;
  `durationMs` is the attempt's own time (0 when skipped).
- Contents: each page source reads its list (`$` is the body as one item). An
  absent or `null` list is `[]` when the source is `optional`, else
  `spec_mismatch`. Items pass when the source's `where` holds. An item that
  passes without a string URL is dropped and counted in an
  `invalid_rows_dropped` warning; one from a billable source still counts
  toward the computed cost. Pages match
  requested URLs by URL key, first unused candidate wins; the rest are counted
  in an `unmatched_pages` warning. Unmatched URLs are `failed` with code
  `missing`.
- **URL key:** lowercase scheme; lowercase ASCII host, and each host label with
  non-ASCII is Unicode-lowercased and becomes `xn--` plus RFC 3492 punycode;
  drop `:80` for http and `:443` for https; drop the fragment; in path and
  query, decode `%XX` escapes of unreserved characters, uppercase the rest,
  and encode non-ASCII as UTF-8 escapes (an unpaired surrogate as U+FFFD); an
  empty path becomes `/` and a longer path loses one trailing `/`. A string
  that is not `scheme://…` is its own key. Runtimes export this rule as
  `urlKey` (Python `url_key`) for callers that match or deduplicate URLs.
- A header value containing a comma (duplicates joined) is ignored.
- `Retry-After`, after removing spaces and tabs around it, is delta-seconds
  or an IMF-fixdate naming a real date and time (no rollover); anything else is
  ignored.

## Billing
Every attempt carries `billed` and its own `cost` (`policy.billing`):
- not sent (skipped): `no`, `{usd: 0, estimated: false, source: "none"}`;
- a 2xx arrived: `yes`, even when its body is then unusable, too large or
  breaks off; its cost is the reported cost in the body if any, else the
  computed price (steps.md, Cost);
- any other status: `no`, `{usd: 0, estimated: true, source: "none"}`
  (assumed: providers do not bill requests they reject);
- no status, with a code in `billing.possible` (`network`, `attempt_timeout`,
  `timeout`, `aborted`): `possible`, costed as the computed price for the
  requested count (`maxResults`, or URLs sent).

The response's `cost` is its successful attempt's; spend across a call is the
sum over attempts billed `yes` or `possible`.

## Retries, deadlines, fallback
- Only `transient` codes are retried, up to `maxRetries` (default
  `retry.defaultMaxRetries`, which is 0). Delay for retry *i*: `e =
  min(maxDelayMs, baseDelayMs × 2^i)`, `floor(e/2 + r × e/2)`, at least
  `Retry-After`. A `Retry-After` above `retry.maxRetryAfterMs`, or a wait that
  would reach the call deadline, ends retrying.
- `timeoutMs` bounds the whole call, including body reading. When it fires the
  code is `timeout`; when only `attemptTimeoutMs` fires it is
  `attempt_timeout`. There is no other ceiling.
- The chain is the call's provider, then its fallback list (empty by default);
  each provider is tried once. After retries, the next provider runs only for
  codes in `fallbackOn`.
- **Ambiguous failures** (`network`, `attempt_timeout`, `timeout`) may have
  been billed. One rule covers all three: they are recorded as billed
  `possible` (or `yes` when a 2xx arrived), and they proceed to another attempt
  only when the caller configured retries or a fallback and budget remains.
  `timeout` never proceeds because the call's budget is spent; `aborted` never
  proceeds. A search is a read, so a configured resilient result is preferred
  over avoiding a possible second charge, and the charge stays visible.
- A 2xx that is unusable (`invalid_response`, `spec_mismatch`) or too large
  (`response_too_large`) is never retried or sent to fallback.
- The error thrown when the chain runs out is the last error from a provider
  that was sent a request, or, when none was, the last skip reason.
- A successful response is never discarded for being slow. A stop (deadline
  or cancellation) and an arrival at the same moment: the stop wins.

## Diagnostics
A client may install a diagnostics hook (TypeScript `diagnostics`, Python
`diagnostics=`). It is off by default and changes nothing about the call. It
receives one event for every attempt that was sent, after the attempt is
final and before any retry wait, fallback, return or throw; skipped attempts
send no event. An exception or rejected promise from the hook is ignored.
- `index` is the attempt's position in `attempts`; `kind` is `search` or
  `contents`; `attempt` is a copy of that attempt.
- `request`: `method`, `url`, `headers` (lowercase names) and `body` (the
  text sent, or `null`). The key header's value and a query key's value are
  replaced by `diagnostics.redacted`.
- `response` is `null` when no status arrived. Otherwise `status`, `headers`
  (lowercase names, sorted, duplicates joined with `, `, `set-cookie` left
  out), `body`, `bodyBytes` and `bodyTruncated`. `body` is the bytes as
  received decoded as UTF-8 (a byte order mark is kept; invalid sequences
  become U+FFFD), with every occurrence of the key replaced by
  `diagnostics.redacted`, then cut to at most `diagnostics.maxBodyBytes`
  UTF-8 bytes at a character boundary (`bodyTruncated` says whether it was).
  `bodyBytes` counts the bytes received. When the body was not read whole
  (too large, broken off, stopped), `body` and `bodyBytes` are `null`.
- `paths` reports, for a 2xx JSON object only (otherwise `[]`), how the
  spec's paths resolved, in this order. Each entry is `{role, path, found,
  missing}`.
  - Search: `results` (found when the value is an array); then `url`,
    `title`, `excerpts`, `publishedAt`, `author` and each
    `providerFields.<name>`, as the spec defines them, over every row of the
    list (found when the path, before steps, gives a value that is not null).
  - Contents, for each page source *i*: `pages.i` (found when the list is an
    array; `$` always is), `pages.i.where` when the source has one (the
    paths of its predicates joined with `,`; found counts items that pass),
    then `pages.i.url`, `finalUrl`, `title`, `content`, `publishedAt`,
    `author`, `errorCode`, `errorMessage` as defined, over items that pass.
  - Then `cost` for a reported cost path and `requestId` for each body-path
    rule, each over the body.
- No event carries a key; nothing else is redacted.
