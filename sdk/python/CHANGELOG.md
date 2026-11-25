# Changelog

## 0.1.0 (unreleased)

First release candidate. Nothing is published to a registry, and no provider
is live-verified: every spec is written from public docs and tested against
synthetic fixtures only.

- `search` and `contents` over a shared, declarative provider registry: Exa,
  Tavily, Context.dev, TinyFish, Brave (search only), Perplexity and
  Firecrawl.
- Honest per-attempt cost: reported, computed from list prices, or unknown
  (never $0 for unknown). Every attempt records whether it was billed (`yes`,
  `possible`, `no`). `cost_bound` give the most one request can
  cost before it is sent.
- Retries (off by default), `Retry-After`, per-attempt and per-call
  deadlines, cancellation, response size limits and explicit fallback.
- Errors carry one fixed `code`. A 2xx body that lacks the list a spec reads
  is `spec_mismatch` with the failing `path`, distinct from `invalid_response`
  (a body that is not a JSON object) and from an empty result.
- Contents items without a URL are dropped with an `invalid_rows_dropped`
  warning instead of silently.
- An opt-in diagnostics hook reports each sent attempt: redacted request,
  status, headers, the raw body (bounded, key redacted) and which spec paths
  resolved.
- Clients reject an unknown provider, fallback or setting when they are
  created, not at their first call.
