"""SearchError: the only error the SDK raises."""

from __future__ import annotations

import json
from importlib import resources
from typing import TYPE_CHECKING, Any, Literal

if TYPE_CHECKING:
    from ._types import Attempt

ErrorCode = Literal[
    "invalid_request", "configuration", "unsupported", "auth", "forbidden", "quota",
    "rate_limit", "unavailable", "provider_error", "network", "attempt_timeout",
    "timeout", "aborted", "invalid_response", "spec_mismatch", "response_too_large",
]

# Fixed messages, read from registry/policy.json (embedded copy).
_MESSAGES: dict[str, str] = json.loads(
    resources.files(__package__).joinpath("_data").joinpath("policy.json").read_bytes()
)["errors"]


class SearchError(Exception):
    """A failed call. ``code`` is the shared error code; the message is fixed per code.

    Messages, ``str()`` and ``repr()`` never include keys, URLs or provider
    bodies. ``raw`` holds the body of a successful (paid) response that could
    not be mapped; ``path``, for ``spec_mismatch``, names the spec path the
    response did not have; ``attempts`` records every attempt the call made.
    """

    code: ErrorCode
    provider: str | None
    status: int | None
    provider_code: str | None
    retry_after_ms: int | None
    field: str | None
    path: str | None
    attempts: list[Attempt]
    raw: Any

    def __init__(
        self,
        code: ErrorCode,
        *,
        provider: str | None = None,
        status: int | None = None,
        provider_code: str | None = None,
        retry_after_ms: int | None = None,
        field: str | None = None,
        path: str | None = None,
        raw: Any = None,
    ) -> None:
        super().__init__(_MESSAGES[code])
        self.code = code
        self.provider = provider
        self.status = status
        self.provider_code = provider_code
        self.retry_after_ms = retry_after_ms
        self.field = field
        self.path = path
        self.attempts = []
        self.raw = raw

    @property
    def message(self) -> str:
        return _MESSAGES[self.code]

    def __str__(self) -> str:
        return _MESSAGES[self.code]

    def __repr__(self) -> str:
        parts = [f"code={self.code!r}"]
        for name in ("provider", "status", "field", "path", "provider_code"):
            value = getattr(self, name)
            if value is not None:
                parts.append(f"{name}={value!r}")
        return f"SearchError({', '.join(parts)})"

    def __reduce__(self) -> Any:
        state = dict(self.__dict__)
        return (_rebuild, (self.code,), state)


def _rebuild(code: ErrorCode) -> SearchError:
    return SearchError(code)
