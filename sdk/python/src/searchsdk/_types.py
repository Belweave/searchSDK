"""Response types.

Attributes use Python names. ``to_json()`` gives the language-neutral JSON
form every searchSDK runtime shares (camelCase keys, optional keys left out),
for logging, storage and cross-language comparison.
"""

from __future__ import annotations

import dataclasses
from collections.abc import Mapping, Sequence
from dataclasses import dataclass, field
from typing import Any, Literal

from ._errors import ErrorCode

Recency = Literal["day", "week", "month", "year"]
Depth = Literal["fast", "standard", "deep"]
CostSource = Literal["reported", "reported-credits", "computed", "unknown", "none"]
Billed = Literal["yes", "possible", "no"]


def _json_name(name: str) -> str:
    head, *rest = name.split("_")
    return head + "".join(w[:1].upper() + w[1:] for w in rest)


def _omit(**kwargs: Any) -> Any:
    """A field left out of to_json() when it is None."""
    return field(metadata={"omit_none": True}, **kwargs)


def to_json(value: Any) -> Any:
    """The shared JSON form of a response value."""
    if dataclasses.is_dataclass(value) and not isinstance(value, type):
        out: dict[str, Any] = {}
        for f in dataclasses.fields(value):
            v = getattr(value, f.name)
            if v is None and f.metadata.get("omit_none"):
                continue
            if f.metadata.get("verbatim"):
                out[_json_name(f.name)] = v
            else:
                out[_json_name(f.name)] = to_json(v)
        return out
    if isinstance(value, Mapping):
        return {k: to_json(v) for k, v in value.items()}
    if isinstance(value, Sequence) and not isinstance(value, str):
        return [to_json(v) for v in value]
    return value


class _Json:
    def to_json(self) -> Any:
        """The language-neutral JSON form shared by every searchSDK runtime."""
        return to_json(self)


@dataclass(frozen=True)
class Cost(_Json):
    """USD cost. ``usd`` is None when the price is not known; ``estimated`` is False only for an exact reported figure or nothing sent."""

    usd: float | None
    estimated: bool
    source: CostSource
    credits: float | None = _omit(default=None)


@dataclass(frozen=True)
class Attempt(_Json):
    """One provider attempt. ``billed`` is "yes" (a 2xx arrived), "possible" (may have reached the provider) or "no"."""

    provider: str
    outcome: Literal["ok", "error", "skipped"]
    code: ErrorCode | None = _omit(default=None)
    status: int | None = _omit(default=None)
    start_ms: int = 0
    duration_ms: int = 0
    retry_after_ms: int | None = _omit(default=None)
    billed: Billed = "no"
    cost: Cost = field(default_factory=lambda: Cost(0, False, "none"))


@dataclass(frozen=True)
class ResponseWarning(_Json):
    code: str
    provider: str
    message: str | None = _omit(default=None)
    count: int | None = _omit(default=None)


@dataclass(frozen=True)
class SearchResult(_Json):
    url: str
    title: str | None
    excerpts: list[str]
    published_at: str | None
    author: str | None
    rank: int
    provider_fields: dict[str, Any] = field(metadata={"verbatim": True})
    """Provider-scoped values such as scores, under the spec's names. Not comparable across providers."""


@dataclass(frozen=True)
class PageError(_Json):
    code: str | None
    message: str | None


@dataclass(frozen=True)
class Page(_Json):
    url: str
    status: Literal["ok", "failed"]
    final_url: str | None
    title: str | None
    content: str | None
    published_at: str | None
    author: str | None
    error: PageError | None


@dataclass(frozen=True)
class _Response(_Json):
    provider: str
    cost: Cost
    request_id: str | None
    latency_ms: int
    warnings: list[ResponseWarning]
    attempts: list[Attempt]


@dataclass(frozen=True)
class SearchResponse(_Response):
    results: list[SearchResult]
    raw: Any = field(default=None, repr=False, metadata={"verbatim": True})
    """The provider's parsed JSON body."""


@dataclass(frozen=True)
class ContentsResponse(_Response):
    pages: list[Page]
    raw: Any = field(default=None, repr=False, metadata={"verbatim": True})
    """The provider's parsed JSON body."""
