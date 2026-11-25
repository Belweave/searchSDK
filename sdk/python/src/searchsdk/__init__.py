"""One interface to many web search providers: ``search`` and ``contents``.

    >>> import searchsdk
    >>> response = searchsdk.search("sqlite wal mode", provider="exa")
    >>> print(response.results[0].title, response.cost.usd)

Provider behaviour lives in the shared registry (``searchsdk.registry``), not
in this package. Nothing here is live-verified.
"""

from __future__ import annotations

from collections.abc import Mapping
from typing import Any

from ._client import (
    AsyncClient,
    Client,
    ContentsInputs,
    ContentsOptions,
    SearchInputs,
    SearchOptions,
    acontents,
    asearch,
    contents,
    search,
)
from ._clock import CancelToken, Clock, SystemClock
from ._cost import CostBound, cost_bound, list_price
from ._engine import HttpRequest
from ._errors import ErrorCode, SearchError
from ._generated import ContentsProviderOptions, ProviderId, SearchProviderOptions
from ._policy import url_key
from ._registry import BUILT_IN, POLICY
from ._transport import AsyncResponse, AsyncStdlibTransport, AsyncTransport, Response, StdlibTransport, Transport
from ._types import (
    Attempt,
    AttemptDiagnostics,
    Billed,
    ContentsResponse,
    Cost,
    CostSource,
    Depth,
    DiagnosticsRequest,
    DiagnosticsResponse,
    Page,
    PageError,
    PathReport,
    Recency,
    ResponseWarning,
    SearchResponse,
    SearchResult,
)

__version__ = "0.0.0"

registry: Mapping[str, Mapping[str, Any]] = BUILT_IN
"""The embedded provider specs, read-only (mappings and tuples). For routers, benchmarks and docs."""

policy: Mapping[str, Any] = POLICY
"""The shared runtime policy, read-only."""

__all__ = [
    "AsyncClient",
    "AsyncResponse",
    "AsyncStdlibTransport",
    "AsyncTransport",
    "Attempt",
    "AttemptDiagnostics",
    "Billed",
    "CancelToken",
    "Client",
    "Clock",
    "ContentsInputs",
    "ContentsOptions",
    "ContentsProviderOptions",
    "ContentsResponse",
    "Cost",
    "CostBound",
    "CostSource",
    "Depth",
    "DiagnosticsRequest",
    "DiagnosticsResponse",
    "ErrorCode",
    "HttpRequest",
    "Page",
    "PageError",
    "PathReport",
    "ProviderId",
    "Recency",
    "Response",
    "ResponseWarning",
    "SearchError",
    "SearchInputs",
    "SearchOptions",
    "SearchProviderOptions",
    "SearchResponse",
    "SearchResult",
    "StdlibTransport",
    "SystemClock",
    "Transport",
    "acontents",
    "asearch",
    "contents",
    "cost_bound",
    "list_price",
    "policy",
    "registry",
    "search",
    "url_key",
]
