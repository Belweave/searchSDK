"""Sanitized errors. Provider bodies, URLs and exception messages are never retained."""

from __future__ import annotations
import math

CODES = frozenset(
    {
        "invalid_request",
        "unsupported_option",
        "configuration",
        "auth",
        "rate_limit",
        "network",
        "unavailable",
        "attempt_timeout",
        "timeout",
        "aborted",
        "invalid_response",
        "provider_error",
    }
)
TRANSIENT = frozenset({"network", "rate_limit", "unavailable", "attempt_timeout"})


class SearchError(Exception):
    def __init__(
        self,
        code: str,
        *,
        status: int | None = None,
        retry_after_ms: float | None = None,
        attempts: tuple = (),
    ) -> None:
        self.code = code if code in CODES else "provider_error"
        self.status = status if type(status) is int and 100 <= status <= 599 else None
        try:
            self.retry_after_ms = (
                retry_after_ms
                if isinstance(retry_after_ms, (int, float))
                and not isinstance(retry_after_ms, bool)
                and math.isfinite(retry_after_ms)
                and retry_after_ms >= 0
                else None
            )
        except OverflowError:
            self.retry_after_ms = None
        self.attempts = tuple(attempts)
        super().__init__(self.code)

    def __repr__(self) -> str:
        return f"SearchError({self.code!r})"


def status_code(status: int) -> str:
    if status in {401, 402, 403, 432, 433}:
        return "auth"
    if status == 429:
        return "rate_limit"
    if status == 408 or 500 <= status <= 599:
        return "unavailable"
    return "provider_error"
