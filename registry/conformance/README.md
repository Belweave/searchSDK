# Conformance vectors

Every runtime must pass every vector here with an injected fetch and a virtual
clock. No vector touches the network. All provider bodies are synthetic.

- `providers/<id>.json`: normalized request → HTTP request, synthetic body →
  normalized response, and provider-specific errors.
- `policy/*.json`: validation, status mapping, retries, deadlines,
  cancellation, fallback, billing, contents matching, size limits, empty
  results.
- `format/*.json`: one spec-format feature each, run against invented specs
  given in the file's `providers` (they replace the built-in registry for
  that file). A runtime must therefore accept a registry from its caller.
- `steps.json`: the named-step library.

## Case format

```jsonc
{
  "name": "…",
  "call": "search" | "contents",
  "query": "…",                 // search; or {"$repeat": s, "count": n, "prefix"?, "suffix"?}
  "urls": ["…"] | "…",          // contents; or {"$urls": n} for n generated URLs
  "options": { … },             // merged over the file's defaults.options; null removes a key
  "client": { "keys": …, "env": …, "maxRetries": … },  // client config overrides
  "now": "2026-11-24T12:00:00.000Z",   // default
  "random": [0.5],              // jitter source, last value repeats; default [0.5]
  "abortAt": 100 | "before",    // virtual ms from call start
  "responses": [                // consumed in fetch order
    { "status": 200, "headers": {…} | [[name, value], …],
      "body": {…} | "bodyText": "…" | "bodyBase64": "…" | "bodyFill": {prefix, repeat, count, suffix},
      "delayMs": 0, "bodyDelayMs": 0, "bodyFailAtMs": 50, "ignoreAbort": false, "network": false }
  ],
  "expect": {
    "requestCount": 1,
    "requests": [{ "method", "url", "headers" (exact set), "body" (parsed JSON, null = none), "bodyIncludes" }],
    "response": { … },          // everything except raw; raw must equal the last scripted body
    "responseIncludes": { … },  // listed top-level keys only
    "error": { … },             // listed keys; null means absent
    "secretAbsent": "…"         // must not appear in the error's text
  }
}
```

Default keys are `test-key-<provider id>` for every provider the file can
use; the environment is empty unless a case sets `client.env`. Compare JSON
bodies parsed, not as text. Attempts in an expectation are compared exactly,
including `billed` and `cost`.

## The scripted transport and the virtual clock

Times are virtual milliseconds and must match exactly.

- The clock only moves when no work is pending: the harness lets every
  promise reaction run, then jumps to the earliest timer. Timers due at the
  same time fire in the order they were set.
- A response is delivered by a timer set `delayMs` after the request: it
  rejects with a network error when `network` is true, otherwise resolves with
  the status and headers. Aborting the request before then rejects it at
  once, unless `ignoreAbort`.
- The body is available at once, unless `bodyDelayMs` holds all of it back for
  that long, or `bodyFailAtMs` delivers the first half of the bytes at once
  and fails the stream with a network error at that time. Aborting the
  request fails a pending body stream at once, as a real fetch does, unless
  `ignoreAbort`.
- Status 204, 205 and 304 have no body.
