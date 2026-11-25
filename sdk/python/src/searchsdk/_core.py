"""Orchestration without I/O: provider chain, keys, retries, deadlines,
fallback and per-attempt billing, written once as a generator.

The generator yields effects (send a request, sleep) and the synchronous or
asynchronous driver performs them, so both APIs run this same code.
"""

from __future__ import annotations

from collections.abc import Callable, Generator, Mapping
from dataclasses import dataclass, field
from typing import Any, Union

from ._clock import CancelToken, Clock
from ._diagnostics import path_report, redacted_request, response_record
from ._engine import HttpRequest, Kind, attempt_cost, build_request, header, map_contents, map_search
from ._errors import SearchError
from ._json import MISSING, JsonError, get_path, parse_json
from ._policy import (
    MAX_RETRY_AFTER_MS,
    CallSettings,
    backoff_ms,
    falls_back,
    is_transient,
    retry_after_ms,
    status_code,
)
from ._registry import POLICY, Registry
from ._types import Attempt, AttemptDiagnostics, Billed, ContentsResponse, Cost, ResponseWarning, SearchResponse

NOT_SENT = Cost(0, False, "none")
REJECTED = Cost(0, True, "none")


@dataclass(frozen=True)
class Send:
    """Perform one HTTP attempt. The driver returns a Reply or raises SearchError (with the status once one arrived)."""

    request: HttpRequest
    provider: str
    call_deadline: int
    attempt_deadline: int
    max_bytes: int
    cancel: CancelToken | None
    head: list[tuple[int, list[tuple[str, str]]]] = field(default_factory=list, compare=False)
    """Filled by the driver with (status, headers) once they arrive, before the body is read."""


@dataclass(frozen=True)
class Sleep:
    """Wait before a retry. The driver raises SearchError('aborted') if cancelled."""

    ms: int
    cancel: CancelToken | None


@dataclass(frozen=True)
class Reply:
    status: int
    headers: list[tuple[str, str]]
    body: bytes | None  # None when a non-2xx body could not be read


Effect = Union[Send, Sleep]
Response = Union[SearchResponse, ContentsResponse]


def billed_for(status: int | None, code: str) -> Billed:
    """policy.billing: a status decides; with no status, the code says whether the request may have been billed."""
    b = POLICY["billing"]
    if status is not None:
        result: Billed = b["success"] if 200 <= status < 300 else b["errorStatus"]
        return result
    if code in b["possible"]:
        return "possible"
    not_sent: Billed = b["notSent"]
    return not_sent


def run_call(
    *,
    registry: Registry,
    kind: Kind,
    n: Mapping[str, Any],
    settings: CallSettings,
    chain: list[str],
    provider_options: Mapping[str, Any],
    keys: Mapping[str, str | None],
    clock: Clock,
    random: Callable[[], float],
    diagnostics: Callable[[AttemptDiagnostics], Any] | None = None,
) -> Generator[Effect, Any, Response]:
    t0 = clock.monotonic()
    deadline = t0 + settings.timeout_ms
    cancel = settings.cancel
    attempts: list[Attempt] = []
    last_sent: SearchError | None = None
    last_skip: SearchError | None = None
    key_warnings = [ResponseWarning("fallback_key_missing", p) for p in chain[1:] if keys[p] is None]

    def fail(e: SearchError) -> SearchError:
        e.attempts = list(attempts)
        return e

    def report(send: Send, key: str, status: int | None, data: bytes | None, body: Any) -> None:
        """Calls the diagnostics hook for the attempt just recorded; whatever it raises is ignored."""
        if diagnostics is None:
            return
        spec = registry[send.provider]
        head = send.head[0] if send.head and status is not None else None
        event = AttemptDiagnostics(
            index=len(attempts) - 1,
            kind=kind,
            attempt=attempts[-1],
            request=redacted_request(spec, send.request, key),
            response=None if head is None else response_record(head[0], head[1], data, key),
            paths=path_report(spec, kind, body) if status is not None and 200 <= status < 300 and body is not MISSING else [],
        )
        try:
            diagnostics(event)
        except Exception:
            pass

    def skip(provider: str, e: SearchError) -> None:
        nonlocal last_skip
        attempts.append(Attempt(provider, "skipped", e.code, None, clock.monotonic() - t0, 0, None, "no", NOT_SENT))
        last_skip = e

    for provider in chain:
        if cancel is not None and cancel.cancelled:
            raise fail(SearchError("aborted", provider=provider))
        spec = registry[provider]
        key = keys[provider]
        if key is None:
            skip(provider, SearchError("configuration", provider=provider, field="keys"))
            continue
        po = provider_options.get(provider)
        try:
            if spec.get(kind) is None:
                raise SearchError("unsupported", provider=provider, field=kind)
            request = build_request(spec, kind, n, po, key, clock.now())
        except SearchError as e:
            if e.code != "unsupported":
                raise fail(e) from None
            skip(provider, e)
            continue
        retry = 0
        while True:
            start = clock.monotonic()
            if start >= deadline:
                raise fail(SearchError("timeout", provider=provider))
            status: int | None = None
            body: Any = MISSING
            data: bytes | None = None
            retry_after: int | None = None
            send = Send(request, provider, deadline, start + settings.attempt_timeout_ms, settings.max_response_bytes, cancel)
            try:
                reply: Reply = yield send
            except SearchError as e:
                err = e
                status = e.status
            else:
                status = reply.status
                data = reply.body
                if 200 <= reply.status < 300:
                    try:
                        body = parse_json(reply.body or b"")
                    except JsonError:
                        err = SearchError("invalid_response", provider=provider, status=status)
                    else:
                        now = clock.now()
                        try:
                            if kind == "search":
                                mapped = map_search(spec, n, body, reply.headers, now, po)
                            else:
                                mapped = map_contents(spec, list(n["urls"]), body, reply.headers, now, po)
                        except Exception as e:
                            # A paid reply that cannot be mapped is never resent; the body is kept for the caller.
                            known = e if isinstance(e, SearchError) else None
                            err = SearchError(
                                known.code if known else "invalid_response", provider=provider, status=status, raw=body, path=known.path if known else None
                            )
                        else:
                            billed = billed_for(status, "invalid_response")
                            attempts.append(Attempt(provider, "ok", None, status, start - t0, clock.monotonic() - start, None, billed, mapped.cost))
                            report(send, key, status, data, body)
                            warnings = ([] if provider == chain[0] else [ResponseWarning("fallback_used", provider)]) + key_warnings + mapped.warnings
                            common: dict[str, Any] = dict(
                                provider=provider,
                                cost=mapped.cost,
                                request_id=mapped.request_id,
                                latency_ms=clock.monotonic() - t0,
                                warnings=warnings,
                                attempts=list(attempts),
                                raw=body,
                            )
                            if kind == "search":
                                return SearchResponse(results=mapped.items, **common)
                            return ContentsResponse(pages=mapped.items, **common)
                else:
                    try:
                        body = parse_json(reply.body) if reply.body is not None else MISSING
                    except JsonError:
                        body = MISSING
                    code = status_code(registry, provider, reply.status, None if body is MISSING else body)
                    provider_code = get_path(body, spec["errorCodePath"]) if "errorCodePath" in spec else None
                    retry_after = retry_after_ms(header(reply.headers, "retry-after"), clock.now())
                    err = SearchError(
                        code,
                        provider=provider,
                        status=status,
                        provider_code=provider_code if isinstance(provider_code, str) else None,
                        retry_after_ms=retry_after,
                    )
            if err.raw is not None:
                body = err.raw
            billed = billed_for(status, err.code)
            cost = REJECTED if billed == "no" else attempt_cost(spec, kind, n, body if 200 <= (status or 0) < 300 else MISSING, po)
            attempts.append(Attempt(provider, "error", err.code, status, start - t0, clock.monotonic() - start, retry_after, billed, cost))
            report(send, key, status, data, body)
            last_sent = err
            if err.code in ("aborted", "timeout"):
                raise fail(err)
            if not is_transient(err.code) or retry >= settings.max_retries:
                break
            if (err.retry_after_ms or 0) > MAX_RETRY_AFTER_MS:
                break
            delay = backoff_ms(retry, random(), err.retry_after_ms)
            if clock.monotonic() + delay >= deadline:
                break
            try:
                yield Sleep(delay, cancel)
            except SearchError as e:
                raise fail(e) from None
            retry += 1
        assert last_sent is not None
        if not falls_back(last_sent.code):
            raise fail(last_sent)
    raise fail(last_sent or last_skip or SearchError("unsupported"))
