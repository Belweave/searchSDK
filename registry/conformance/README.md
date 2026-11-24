# Conformance vectors

Every runtime must pass every vector here with an injected fetch and a virtual
clock. No vector touches the network. All provider bodies are synthetic.

- `providers/<id>.json`: normalized request → HTTP request, synthetic body →
  normalized response, and provider-specific errors.
- `policy/*.json`: validation, status mapping, retries, deadlines,
  cancellation, fallback, size limits, empty results.
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
      "delayMs": 0, "bodyDelayMs": 0, "ignoreAbort": false, "network": false }
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

Default keys are `test-key-<provider id>`; the environment is empty unless a
case sets `client.env`. Times are virtual milliseconds and must match exactly.
Compare JSON bodies parsed, not as text.
