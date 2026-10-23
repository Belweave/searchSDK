"""Application-owned gateway protocol v1. No implicit POST retries or provider credentials."""

from __future__ import annotations
from typing import Any, Mapping, cast
from .client import BatchMixin
from .errors import CODES, SearchError, status_code
from .models import SearchAttempt, SearchRequest, SearchResponse
from .transport import (
    DEFAULT_LIMIT,
    BoundedRunner,
    CallContext,
    CancellationToken,
    HttpRequest,
    Transport,
    context_for,
    encode_json,
    headers,
    https_transport,
    parse_json,
    read_bytes,
    retry_after,
    send,
    safe_close,
)
from .validation import (
    credential,
    number,
    obj,
    positive,
    url,
    validate_attempts,
    validate_request,
    validate_response,
)


class GatewayClient(BatchMixin):
    _batch_options = frozenset({"token"})

    def __init__(
        self,
        endpoint: str,
        *,
        transport: Transport | None = None,
        timeout_ms: int = 10000,
        max_response_bytes: int = DEFAULT_LIMIT,
        max_concurrency: int = 4,
    ) -> None:
        self._endpoint = url(endpoint, endpoint=True)
        if transport is not None and not callable(transport):
            raise SearchError("configuration")
        self._transport = transport or https_transport
        self.timeout_ms = positive(timeout_ms)
        self._maximum = positive(max_response_bytes)
        self._runner = BoundedRunner(max_concurrency)

    def __repr__(self) -> str:
        return "GatewayClient(endpoint=<redacted>)"

    def search(
        self,
        request: SearchRequest | Mapping[str, Any] | str,
        *,
        token: str | None = None,
        cancellation: CancellationToken | None = None,
        timeout_ms: int | None = None,
        _parent: CallContext | None = None,
    ) -> SearchResponse:
        r = validate_request(request)
        if token is not None:
            credential(token)
        c = context_for(self.timeout_ms if timeout_ms is None else timeout_ms, cancellation)
        if _parent:
            c.parent = _parent
            c.deadline = min(c.deadline, _parent.deadline)

        def run() -> SearchResponse:
            h = {"Content-Type": "application/json", "Accept": "application/json"}
            if token is not None:
                h["Authorization"] = "Bearer " + token
            response = send(
                self._transport, HttpRequest("POST", self._endpoint, h, encode_json(r.to_dict())), c
            )
            meta = headers(response)
            if "x-searchsdk-protocol" in meta and meta["x-searchsdk-protocol"] != "1":
                safe_close(response)
                raise SearchError("invalid_response")
            if response.status == 200:
                value = cast(
                    SearchResponse,
                    validate_response(
                        parse_json(read_bytes(response, c, self._maximum)), gateway=True
                    ),
                )
                c.check()
                # Gateway result limits are an output ceiling too; all rows have been validated.
                return SearchResponse(
                    value.results[: r.limit],
                    value.usage,
                    value.warnings,
                    value.provider,
                    value.attempts,
                    value.reuse,
                )
            if 200 <= response.status < 300:
                safe_close(response)
                raise SearchError("invalid_response")
            code = status_code(response.status)
            status = response.status
            attempts: tuple[SearchAttempt, ...] = ()
            delay = retry_after(meta.get("retry-after"))
            try:
                e = obj(obj(parse_json(read_bytes(response, c, self._maximum))).get("error"))
                if e.get("code") not in CODES:
                    raise SearchError("invalid_response")
                candidate_attempts = validate_attempts(e.get("attempts"))
                candidate_status = e.get("status", status)
                candidate_delay = number(e.get("retryAfterMs", delay))
                if (
                    type(candidate_status) is not int
                    or not 100 <= candidate_status <= 599
                    or candidate_delay is not None
                    and candidate_delay < 0
                ):
                    raise SearchError("invalid_response")
                code, status, delay, attempts = (
                    e["code"],
                    candidate_status,
                    candidate_delay,
                    candidate_attempts,
                )
            except SearchError:
                c.check()
            c.check()
            raise SearchError(code, status=status, retry_after_ms=delay, attempts=attempts)

        try:
            return self._runner.run(run, c)
        finally:
            c.close()
