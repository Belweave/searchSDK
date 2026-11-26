# searchsdk for Python

searchSDK is an open-source, MIT-licensed SDK by Belweave that gives AI apps
and agents one interface to many web search APIs, with explicit fallback,
per-attempt cost and open benchmarks. This is the Python runtime: two calls,
`search` and `contents`. Python 3.10 or newer, no dependencies.

**Nothing here is live-verified.** Providers are mapped from their public
docs and tested against synthetic fixtures only.

## Install from source

Nothing is published to PyPI yet. Install from the repository; pip fetches
the `flit_core` build backend:

```sh
git clone https://github.com/Belweave/searchSDK
python -m pip install ./searchSDK/sdk/python
```

Docs: [searchsdk.dev/docs](https://searchsdk.dev/docs). The TypeScript
runtime is on npm as
[`@searchsdk/sdk`](https://www.npmjs.com/package/@searchsdk/sdk).

## Providers

Brave Search (`brave`, search only), Context.dev (`context`), Exa (`exa`),
Firecrawl (`firecrawl`), Perplexity (`perplexity`), Tavily (`tavily`) and
TinyFish (`tinyfish`). Each is described in `../../registry` and embedded in
this package; every endpoint is unverified against its live API today.
Provider names are trademarks of their owners; searchSDK is not affiliated
with any provider.

## Use

```python
import searchsdk

response = searchsdk.search("sqlite wal mode", provider="exa")
print(response.results[0].title, response.cost.usd)
```

Keys come from each provider's documented variable (`EXA_API_KEY`,
`TAVILY_API_KEY` and so on) or from `Client(keys=...)`. They are sent in
headers and never appear in errors or reprs.

```python
from searchsdk import AsyncClient, Client

with Client(provider="tavily", fallback=["exa"], max_retries=1) as client:
    res = client.search("eu ai act", recency="month", country="DE", depth="deep",
                        provider_options={"tavily": {"topic": "news"}}, timeout_ms=10_000)
    pages = client.contents([r.url for r in res.results], provider="exa")

async with AsyncClient(provider="exa") as client:
    res = await client.search("eu ai act")
```

Every response carries `results` or `pages`, `cost` (USD, `estimated`, its
`source`; `None` when the price is unknown), `request_id`, `warnings`,
`attempts` (each billed `yes`, `possible` or `no`, with its own cost) and
`raw`, the provider's body. `to_json()` gives the JSON shape every searchSDK
runtime shares. Failures raise `SearchError` with a fixed `code`. Cancelling
the asyncio task raises `CancelledError`; a `CancelToken` cancels from any
thread. Times are integer milliseconds.

## Errors

Every failure raises `SearchError` with one of these codes, the `provider`,
the HTTP `status` when one arrived, and `attempts`. Retries happen only when
`max_retries` is set; fallback only through `fallback`.

| `code` | What happened | Sent? | Billed | Retried | Falls back |
| --- | --- | --- | --- | --- | --- |
| `invalid_request` | an input or option failed validation | no | no | no | no |
| `configuration` | missing or unusable key, unknown provider, bad client setting | no | no | no | no |
| `unsupported` | the provider cannot express this request | no (skipped) | no | no | yes |
| `auth` | 401 | yes | no | no | no |
| `forbidden` | 403 | yes | no | no | no |
| `quota` | 402, or a provider's out-of-credits signal | yes | no | no | yes |
| `rate_limit` | 429 (`Retry-After` honoured) | yes | no | yes | yes |
| `unavailable` | 5xx or 408 | yes | no | yes | yes |
| `provider_error` | any other 4xx | yes | no | no | no |
| `network` | no answer: connection failed or broke off | yes | possible | yes | yes |
| `attempt_timeout` | the attempt's own deadline passed | yes | possible | yes | yes |
| `timeout` | the call's deadline passed | yes | possible | no | no |
| `aborted` | the caller cancelled | if under way | possible if under way | no | no |
| `invalid_response` | a 2xx that is not a UTF-8 JSON object, or an unmapped status (3xx) | yes | yes for a 2xx | no | no |
| `spec_mismatch` | a 2xx JSON object without the list the spec reads; `path` names it | yes | yes | no | no |
| `response_too_large` | a 2xx over the size limit | yes | yes | no | no |

An empty result list is a success (`results == []`), never an error. A
`spec_mismatch` means our spec and the provider's body disagree, not that the
provider found nothing; its `raw` holds the body. Rows without a URL are
dropped with an `invalid_rows_dropped` warning. A 2xx is billed even when it
cannot be read, so it is never retried.

## Diagnostics

`Client(diagnostics=hook)` (and `AsyncClient`) is an opt-in hook for smoke
checks and spec debugging. It is called once per sent attempt with an
`AttemptDiagnostics`:

- `index`, `kind` and the `attempt` (status, timing, billed, cost);
- `request`: method, URL, headers and body as sent, with the key replaced by
  `[redacted]`;
- `response` (`None` when no status arrived): status, headers (`set-cookie`
  dropped), the raw body as text (key redacted, at most 64 KiB, cut on a
  character boundary), `body_bytes` and `body_truncated`;
- `paths`: for a 2xx JSON object, how each spec path resolved
  (`PathReport(role, path, found, missing)`), so a smoke check can tell an
  empty answer from a field the spec reads in the wrong place.

`event.to_json()` gives the same JSON as the TypeScript hook. The hook cannot
change the call; exceptions it raises are ignored. Exact rules:
`registry/policy.md`, Diagnostics.

## Transport

`StdlibTransport` uses `http.client` and the `ssl` default context: one
connection per request, `HTTPS_PROXY`, `HTTP_PROXY` and `NO_PROXY` honoured,
redirects never followed. `AsyncClient` runs it in worker threads. A
synchronous call relies on its transport to honour the timeout and
cancellation it is given; this one does, except that a DNS lookup cannot be
interrupted. Pass your own with `transport=`.

Provider behaviour lives in `../../registry`, embedded at build time.
`Client(registry=...)` accepts edited specs and their ids without casts.
`cost_bound` gives the most one request can cost, `list_price` its computed
price, and `url_key` the URL matching rule.

## Development

```sh
python -m pip install -r requirements-dev.txt   # mypy, for development only
python scripts/check.py                         # registry drift, mypy --strict, all tests
python scripts/sync_registry.py                 # after changing ../../registry
```

Tests run every vector in `registry/conformance` through both clients on a
virtual clock, plus the real transport against a loopback server. A guard
fails any other network use.

## License

[MIT](LICENSE). Provider services, their content and their terms remain the
providers' own.
