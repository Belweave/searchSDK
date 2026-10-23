"""Immutable normalized values. ``to_dict`` emits the shared camelCase wire contract."""

from __future__ import annotations
from dataclasses import dataclass, fields, is_dataclass
from typing import Any, Protocol, TYPE_CHECKING

if TYPE_CHECKING:
    from .transport import CallContext

_ALIASES = {
    "include_domains": "includeDomains",
    "exclude_domains": "excludeDomains",
    "source_url": "sourceUrl",
    "retrieved_at": "retrievedAt",
    "request_id": "requestId",
    "started_at": "startedAt",
    "duration_ms": "durationMs",
    "retry_after_ms": "retryAfterMs",
}


def _wire(value: Any) -> Any:
    if is_dataclass(value):
        return {
            _ALIASES.get(f.name, f.name): _wire(getattr(value, f.name))
            for f in fields(value)
            if getattr(value, f.name) is not None or f.name == "usage"
        }
    if isinstance(value, (list, tuple)):
        return [_wire(v) for v in value]
    return value


class WireValue:
    def to_dict(self) -> dict[str, Any]:
        return _wire(self)


@dataclass(frozen=True)
class SearchRequest(WireValue):
    query: str
    limit: int = 5
    include_domains: tuple[str, ...] | None = None
    exclude_domains: tuple[str, ...] | None = None


@dataclass(frozen=True)
class Capabilities:
    domain_filters: bool
    max_include_domains: int = 0
    max_exclude_domains: int = 0
    mutually_exclusive_domain_filters: bool = False
    max_query_length: int | None = None


@dataclass(frozen=True)
class Provenance(WireValue):
    provider: str
    source_url: str
    retrieved_at: str
    request_id: str | None = None


@dataclass(frozen=True)
class SearchResult(WireValue):
    url: str
    provenance: Provenance
    title: str | None = None
    snippet: str | None = None
    highlights: tuple[str, ...] | None = None
    score: float | None = None


@dataclass(frozen=True)
class SearchUsage(WireValue):
    unit: str
    value: float


@dataclass(frozen=True)
class SearchWarning(WireValue):
    code: str
    provider: str


@dataclass(frozen=True)
class SearchAttempt(WireValue):
    provider: str
    started_at: str
    duration_ms: float
    outcome: str
    code: str | None = None
    status: int | None = None
    retry_after_ms: float | None = None


@dataclass(frozen=True)
class ProviderResponse(WireValue):
    results: tuple[SearchResult, ...]
    usage: SearchUsage | None = None
    warnings: tuple[SearchWarning, ...] = ()


@dataclass(frozen=True)
class SearchResponse(ProviderResponse):
    provider: str = ""
    attempts: tuple[SearchAttempt, ...] = ()
    reuse: str | None = None


@dataclass(frozen=True)
class BatchResult:
    index: int
    status: str
    value: SearchResponse | None = None
    error: Exception | None = None


class SearchProvider(Protocol):
    id: str
    capabilities: Capabilities

    def search(self, request: SearchRequest, context: CallContext) -> ProviderResponse: ...
