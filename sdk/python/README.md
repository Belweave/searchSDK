# searchsdk for Python

One interface to many web search providers, for AI apps and agents. Two
calls: `search` and `contents`. Python 3.10 or newer, no dependencies.

**Nothing here is live-verified.** Providers are mapped from their public
docs and tested against synthetic fixtures only.

## Install from source

Nothing is published to PyPI yet. Install from the repository; pip fetches
the `flit_core` build backend:

```sh
git clone https://github.com/Belweave/searchSDK
python -m pip install ./searchSDK/sdk/python
```

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
