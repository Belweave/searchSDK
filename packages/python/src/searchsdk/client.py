"""Explicit retries and fallback, bounded batches, and asyncio convenience methods."""

from __future__ import annotations
import random
import threading
import time
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
from typing import Any, Mapping, Sequence
from .errors import SearchError, TRANSIENT
from .models import (
    BatchResult,
    Capabilities,
    ProviderResponse,
    SearchAttempt,
    SearchProvider,
    SearchRequest,
    SearchResponse,
    SearchWarning,
)
from .transport import BoundedRunner, CallContext, CancellationToken, async_call, context_for, now
from .validation import (
    check_capabilities,
    identifier,
    positive,
    validate_request,
    validate_response,
)


@dataclass(frozen=True)
class RetryPolicy:
    """Opt-in additional attempts per provider. Repeated requests can incur repeated billing."""

    max_retries: int = 0
    base_delay_ms: int = 250
    max_delay_ms: int = 5000

    def __post_init__(self) -> None:
        if type(self.max_retries) is not int or not 0 <= self.max_retries <= 5:
            raise SearchError("configuration")
        positive(self.base_delay_ms)
        positive(self.max_delay_ms)
        if self.max_delay_ms < self.base_delay_ms:
            raise SearchError("configuration")

    def delay(self, index: int, retry_after_ms: float | None = None) -> float:
        cap = min(self.max_delay_ms, self.base_delay_ms * 2**index)
        return max(cap / 2 + random.random() * cap / 2, retry_after_ms or 0) / 1000


class BatchMixin:
    _batch_options: frozenset[str] = frozenset()
    timeout_ms: int

    search: Any

    def search_batch(
        self,
        requests: Sequence[SearchRequest | Mapping[str, Any] | str],
        *,
        concurrency: int = 4,
        timeout_ms: int | None = None,
        cancellation: CancellationToken | None = None,
        **search_options: Any,
    ) -> tuple[BatchResult, ...]:
        if not isinstance(requests, (list, tuple)) or len(requests) > 1000:
            raise SearchError("invalid_request")
        if set(search_options) - self._batch_options:
            raise SearchError("invalid_request")
        positive(concurrency, 64, "invalid_request")
        budget = (
            self.timeout_ms if timeout_ms is None else positive(timeout_ms, code="invalid_request")
        )
        c = context_for(budget, cancellation)
        snapshot: list[SearchRequest | SearchError] = []
        for r in requests:
            try:
                snapshot.append(validate_request(r))
            except SearchError:
                snapshot.append(SearchError("invalid_request"))

        def run(index: int) -> BatchResult:
            try:
                c.check()
                item = snapshot[index]
                if isinstance(item, SearchError):
                    raise item
                value = self.search(item, cancellation=cancellation, _parent=c, **search_options)
                c.check()
                return BatchResult(index, "fulfilled", value=value)
            except SearchError as caught:
                error = caught
                try:
                    c.check()
                except SearchError as stopped:
                    error = stopped
                return BatchResult(index, "rejected", error=error)

        try:
            with ThreadPoolExecutor(
                max_workers=concurrency, thread_name_prefix="searchsdk-batch"
            ) as pool:
                return tuple(pool.map(run, range(len(snapshot))))
        finally:
            c.close()

    async def search_async(
        self,
        request: SearchRequest | Mapping[str, Any] | str,
        *,
        cancellation: CancellationToken | None = None,
        **kwargs: Any,
    ) -> SearchResponse:
        return await async_call(self.search, request, cancellation=cancellation, **kwargs)

    async def search_batch_async(
        self,
        requests: Sequence[SearchRequest | Mapping[str, Any] | str],
        *,
        cancellation: CancellationToken | None = None,
        **kwargs: Any,
    ) -> tuple[BatchResult, ...]:
        return await async_call(self.search_batch, requests, cancellation=cancellation, **kwargs)


class SearchClient(BatchMixin):
    def __init__(
        self,
        provider: SearchProvider,
        *,
        fallback: Sequence[SearchProvider] = (),
        timeout_ms: int = 10000,
        attempt_timeout_ms: int | None = None,
        retry: RetryPolicy | None = None,
        max_concurrency: int = 4,
    ) -> None:
        if (
            not isinstance(fallback, (tuple, list))
            or retry is not None
            and not isinstance(retry, RetryPolicy)
        ):
            raise SearchError("configuration")
        self.timeout_ms = positive(timeout_ms)
        self.attempt_timeout_ms = positive(
            timeout_ms if attempt_timeout_ms is None else attempt_timeout_ms
        )
        self.retry = retry or RetryPolicy()
        self._providers = (provider, *fallback)
        ids: set[str] = set()
        for p in self._providers:
            try:
                identifier(p.id)
                c = p.capabilities
                if (
                    p.id in ids
                    or not callable(p.search)
                    or not isinstance(c, Capabilities)
                    or type(c.domain_filters) is not bool
                    or type(c.mutually_exclusive_domain_filters) is not bool
                    or any(
                        type(v) is not int or v < 0
                        for v in (c.max_include_domains, c.max_exclude_domains)
                    )
                    or c.max_query_length is not None
                    and (type(c.max_query_length) is not int or c.max_query_length < 1)
                ):
                    raise ValueError()
                ids.add(p.id)
            except (SearchError, ValueError, AttributeError):
                raise SearchError("configuration") from None
        self._runner = BoundedRunner(max_concurrency)
        self._operations = threading.BoundedSemaphore(positive(max_concurrency, 64))

    def search(
        self,
        request: SearchRequest | Mapping[str, Any] | str,
        *,
        cancellation: CancellationToken | None = None,
        timeout_ms: int | None = None,
        _parent: CallContext | None = None,
    ) -> SearchResponse:
        c = context_for(self.timeout_ms if timeout_ms is None else timeout_ms, cancellation)
        if _parent is not None:
            c.parent = _parent
            c.deadline = min(c.deadline, _parent.deadline)
        attempts: list[SearchAttempt] = []
        acquired = False
        try:
            r = validate_request(request)
            for p in self._providers:
                check_capabilities(p.capabilities, r)
            while True:
                c.check()
                if self._operations.acquire(timeout=min(0.01, c.remaining)):
                    acquired = True
                    break
            for index, provider in enumerate(self._providers):
                for retry_index in range(self.retry.max_retries + 1):
                    c.check()
                    started = time.monotonic()
                    started_at = now()
                    attempt_deadline = min(c.deadline, started + self.attempt_timeout_ms / 1000)
                    attempt = CallContext(
                        attempt_deadline,
                        parent=c,
                        timeout_code="attempt_timeout"
                        if attempt_deadline < c.deadline
                        else "timeout",
                    )
                    try:

                        def run_provider(
                            provider: SearchProvider = provider, attempt: CallContext = attempt
                        ) -> ProviderResponse:
                            return validate_response(provider.search(r, attempt))

                        value = self._runner.run(run_provider, attempt)
                        c.check()
                        attempt.check()
                        attempts.append(
                            SearchAttempt(
                                provider.id,
                                started_at,
                                (time.monotonic() - started) * 1000,
                                "success",
                            )
                        )
                        warnings = value.warnings + (
                            (SearchWarning("fallback_used", provider.id),) if index else ()
                        )
                        return SearchResponse(
                            value.results[: r.limit],
                            value.usage,
                            warnings,
                            provider.id,
                            tuple(attempts),
                        )
                    except SearchError as caught:
                        error = caught
                        try:
                            c.check()
                        except SearchError as stopped:
                            error = stopped
                        attempts.append(
                            SearchAttempt(
                                provider.id,
                                started_at,
                                (time.monotonic() - started) * 1000,
                                "error",
                                error.code,
                                error.status,
                                error.retry_after_ms,
                            )
                        )
                        if error.code not in TRANSIENT:
                            raise error from None
                        if retry_index < self.retry.max_retries:
                            c.sleep(self.retry.delay(retry_index, error.retry_after_ms))
                            continue
                        if index == len(self._providers) - 1:
                            raise error from None
                        break
                    finally:
                        attempt.close()
            raise SearchError("configuration")
        except SearchError as error:
            raise SearchError(
                error.code,
                status=error.status,
                retry_after_ms=error.retry_after_ms,
                attempts=tuple(attempts),
            ) from None
        finally:
            if acquired:
                self._operations.release()
            c.close()
