"""Client and AsyncClient: validation, then one generator (_core.run_call)
driven by a synchronous or an asynchronous driver."""

from __future__ import annotations

import asyncio
import datetime
import os
import random as _random
import re
from collections.abc import Awaitable, Callable, Generator, Iterable, Mapping, Sequence
from typing import TYPE_CHECKING, Any, TypedDict, TypeVar

from ._clock import SYSTEM_CLOCK, CancelToken, Clock
from ._core import Effect, Reply, Send, Sleep, run_call
from ._engine import Kind, header
from ._errors import ErrorCode, SearchError
from ._generated import ContentsProviderOptions, ProviderId, SearchProviderOptions
from ._policy import call_settings, normalize_search, normalize_urls, provider_chain
from ._registry import BUILT_IN, Registry, load_registry
from ._transport import AsyncResponse, AsyncStdlibTransport, AsyncTransport, Response, StdlibTransport, Transport
from ._types import ContentsResponse, Depth, Recency, SearchResponse

if TYPE_CHECKING:
    from typing_extensions import Unpack

T = TypeVar("T")


class _CallOptions(TypedDict, total=False):
    fallback: Sequence[ProviderId] | None
    """Providers tried, in order, after a fallback-eligible failure. Overrides the client's list."""
    timeout_ms: int | None
    """Bounds the whole call, retries and body reading included. Default 30 000."""
    attempt_timeout_ms: int | None
    max_retries: int | None
    """Retries of transient failures per provider (0 to 5). Default 0."""
    max_response_bytes: int | None
    cancel: CancelToken | None
    """Cancels the call from any thread (async code may also cancel its task)."""


class SearchInputs(_CallOptions, total=False):
    max_results: int | None
    include_domains: Sequence[str] | None
    exclude_domains: Sequence[str] | None
    recency: Recency | None
    start_date: str | datetime.date | None
    """Inclusive, by publication date: 'YYYY-MM-DD' or a date."""
    end_date: str | datetime.date | None
    country: str | None
    """ISO 3166-1 alpha-2."""
    language: str | None
    """ISO 639-1."""
    depth: Depth | None
    provider_options: SearchProviderOptions | None


class SearchOptions(SearchInputs, total=False):
    provider: ProviderId | None
    """The provider for this call. Overrides the client's provider."""


class ContentsInputs(_CallOptions, total=False):
    provider_options: ContentsProviderOptions | None


class ContentsOptions(ContentsInputs, total=False):
    provider: ProviderId | None


_SEARCH_NAMES = frozenset(SearchOptions.__annotations__) | frozenset(SearchInputs.__annotations__) | frozenset(_CallOptions.__annotations__)
_CONTENTS_NAMES = frozenset(ContentsOptions.__annotations__) | frozenset(ContentsInputs.__annotations__) | frozenset(_CallOptions.__annotations__)
_KEY = re.compile("[\\x21-\\x7e]{1,512}")


class _Keys:
    """Caller keys, kept out of repr()."""

    __slots__ = ("_keys",)

    def __init__(self, keys: Mapping[str, str] | None) -> None:
        self._keys = dict(keys or {})

    def get(self, provider: str) -> str | None:
        return self._keys.get(provider)

    def __repr__(self) -> str:
        return f"<{len(self._keys)} keys>"


class _Base:
    def __init__(
        self,
        *,
        provider: ProviderId | None = None,
        fallback: Sequence[ProviderId] | None = None,
        keys: Mapping[str, str] | None = None,
        env: Mapping[str, str] | None = None,
        timeout_ms: int | None = None,
        attempt_timeout_ms: int | None = None,
        max_retries: int | None = None,
        max_response_bytes: int | None = None,
        registry: Mapping[str, Any] | None = None,
        clock: Clock | None = None,
        random: Callable[[], float] | None = None,
    ) -> None:
        self._registry: Registry = BUILT_IN if registry is None else load_registry(registry)
        self._config: dict[str, Any] = {
            "provider": provider,
            "fallback": list(fallback) if fallback is not None and not isinstance(fallback, str) else fallback,
            "timeout_ms": timeout_ms,
            "attempt_timeout_ms": attempt_timeout_ms,
            "max_retries": max_retries,
            "max_response_bytes": max_response_bytes,
        }
        self._keys = _Keys(keys)
        self._env = env
        self._clock: Clock = clock or SYSTEM_CLOCK
        self._random = random or _random.random

    def __repr__(self) -> str:
        provider = self._config["provider"]
        return f"{type(self).__name__}(provider={provider!r})"

    def _key(self, provider: str) -> str | None:
        """The provider's key from the client, else its documented environment variables; None when unusable."""
        key = self._keys.get(provider)
        if key is None:  # absent or None: the environment decides
            env = os.environ if self._env is None else self._env
            for name in self._registry[provider]["auth"]["env"]:
                key = env.get(name)
                if key is not None and key != "":
                    break
        return key if isinstance(key, str) and _KEY.fullmatch(key) else None

    def _prepare(self, kind: Kind, subject: Any, options: Mapping[str, Any]) -> Generator[Effect, Any, Any]:
        allowed = _SEARCH_NAMES if kind == "search" else _CONTENTS_NAMES
        for name in options:
            if name not in allowed:
                raise SearchError("invalid_request", field=name)
        n = normalize_search(subject, options) if kind == "search" else {"urls": normalize_urls(subject)}
        settings = call_settings(kind, options, self._config)
        chain = provider_chain(self._registry, options, self._config)
        provider_options = options.get("provider_options")
        if provider_options is None:
            provider_options = {}
        elif not isinstance(provider_options, Mapping) or not all(isinstance(k, str) and k in self._registry for k in provider_options):
            raise SearchError("configuration", field="provider_options")
        keys = {p: self._key(p) for p in chain}
        if keys[chain[0]] is None:
            raise SearchError("configuration", provider=chain[0], field="keys")
        return run_call(
            registry=self._registry,
            kind=kind,
            n=n,
            settings=settings,
            chain=chain,
            provider_options=provider_options,
            keys=keys,
            clock=self._clock,
            random=self._random,
        )


# ---- Shared attempt helpers ----


def _deadline(effect: Send) -> tuple[int, ErrorCode]:
    end = min(effect.call_deadline, effect.attempt_deadline)
    return end, "timeout" if end >= effect.call_deadline else "attempt_timeout"


_LENGTH = re.compile("[0-9]+")


def _too_long(headers: Sequence[tuple[str, str]], limit: int) -> bool:
    """Content-Length triggers an early reject only when it is a single integer."""
    value = header(headers, "content-length")
    return value is not None and _LENGTH.fullmatch(value.strip(" \t")) is not None and int(value.strip(" \t")) > limit


class _TooLarge(Exception):
    pass


def _noop() -> None:
    pass


# ---- Synchronous driver ----


def _send_sync(effect: Send, transport: Transport, clock: Clock) -> Reply:
    end, deadline_code = _deadline(effect)
    provider, cancel = effect.provider, effect.cancel
    attempt = CancelToken()
    unsubscribe = cancel.subscribe(attempt.cancel) if cancel is not None else _noop

    def stopped(exc: BaseException | None = None) -> ErrorCode | None:
        if cancel is not None and cancel.cancelled:
            return "aborted"
        if clock.monotonic() >= end or isinstance(exc, TimeoutError):
            return deadline_code
        return None

    try:
        if cancel is not None and cancel.cancelled:
            raise SearchError("aborted", provider=provider)
        try:
            response: Response = transport.send(effect.request, timeout=max(0, end - clock.monotonic()) / 1000, cancel=attempt)
        except Exception as e:
            raise SearchError(stopped(e) or "network", provider=provider) from None
        try:
            reason = stopped()  # a transport that ignored the deadline or cancellation
            if reason:
                raise SearchError(reason, provider=provider)
            status, headers = response.status, list(response.headers)
            ok = 200 <= status < 300
            try:
                if _too_long(headers, effect.max_bytes):
                    raise _TooLarge()
                chunks: list[bytes] = []
                total = 0
                for chunk in response.iter_bytes():
                    total += len(chunk)
                    if total > effect.max_bytes:
                        raise _TooLarge()
                    chunks.append(chunk)
                    if stopped():
                        break
                reason = stopped()
                if reason:
                    raise SearchError(reason, provider=provider, status=status)
                return Reply(status, headers, b"".join(chunks))
            except SearchError:
                raise
            except _TooLarge:
                if ok:
                    raise SearchError("response_too_large", provider=provider, status=status) from None
                return Reply(status, headers, None)
            except Exception as e:
                reason = stopped(e)
                if ok or reason:
                    raise SearchError(reason or "network", provider=provider, status=status) from None
                return Reply(status, headers, None)
        finally:
            try:
                response.close()
            except Exception:
                pass
    finally:
        unsubscribe()
        attempt.cancel()


def _drive_sync(gen: Generator[Effect, Any, T], transport: Transport, clock: Clock) -> T:
    value: Any = None
    error: SearchError | None = None
    while True:
        try:
            effect = gen.throw(error) if error is not None else gen.send(value)
        except StopIteration as done:
            result: T = done.value
            return result
        value, error = None, None
        try:
            if isinstance(effect, Send):
                value = _send_sync(effect, transport, clock)
            elif not clock.sleep(effect.ms, effect.cancel):
                raise SearchError("aborted")
        except SearchError as e:
            error = e


# ---- Asynchronous driver ----

_END = object()


async def _next_chunk(it: Any) -> Any:
    try:
        return await it.__anext__()
    except StopAsyncIteration:
        return _END


class _Stopped(Exception):
    def __init__(self, code: ErrorCode) -> None:
        super().__init__(code)
        self.code: ErrorCode = code


def _detach(task: asyncio.Future[Any], on_result: Callable[[Any], Awaitable[None]] | None) -> None:
    """Abandons a task: its late result is closed and its exception retrieved, so nothing leaks or warns."""

    def done(t: asyncio.Future[Any]) -> None:
        if t.cancelled():
            return
        if t.exception() is None and on_result is not None:
            asyncio.ensure_future(on_result(t.result())).add_done_callback(lambda f: f.cancelled() or f.exception())

    task.add_done_callback(done)


async def _race(aw: Awaitable[T], stop: asyncio.Future[ErrorCode], on_late: Callable[[Any], Awaitable[None]] | None = None) -> T:
    """Awaits ``aw`` unless ``stop`` resolves first. A result that has arrived wins over a stop."""
    task = asyncio.ensure_future(aw)
    try:
        await asyncio.wait((task, stop), return_when=asyncio.FIRST_COMPLETED)
    except asyncio.CancelledError:
        task.cancel()
        _detach(task, on_late)
        raise
    if task.done() and not task.cancelled() and task.exception() is None:
        return task.result()
    if stop.done():
        task.cancel()
        _detach(task, on_late)
        raise _Stopped(stop.result())
    exc = task.exception()
    assert exc is not None
    raise exc


async def _close_async(response: AsyncResponse) -> None:
    try:
        await response.aclose()
    except Exception:
        pass


async def _send_async(effect: Send, transport: AsyncTransport, clock: Clock) -> Reply:
    loop = asyncio.get_running_loop()
    end, deadline_code = _deadline(effect)
    provider, cancel = effect.provider, effect.cancel
    stop: asyncio.Future[ErrorCode] = loop.create_future()
    attempt = CancelToken()

    def fire(code: ErrorCode) -> None:
        if not stop.done():
            stop.set_result(code)
        attempt.cancel()

    if cancel is not None and cancel.cancelled:
        raise SearchError("aborted", provider=provider)
    cancel_timer = clock.call_later(max(0, end - clock.monotonic()), lambda: fire(deadline_code))
    def on_cancel() -> None:
        loop.call_soon_threadsafe(fire, "aborted")

    unsubscribe = cancel.subscribe(on_cancel) if cancel is not None else _noop
    response: AsyncResponse | None = None
    try:
        try:
            response = await _race(transport.send(effect.request, timeout=max(0, end - clock.monotonic()) / 1000, cancel=attempt), stop, _close_async)
        except _Stopped as s:
            raise SearchError(s.code, provider=provider) from None
        except Exception as e:
            raise SearchError(deadline_code if isinstance(e, TimeoutError) else "network", provider=provider) from None
        status, headers = response.status, list(response.headers)
        ok = 200 <= status < 300
        try:
            if _too_long(headers, effect.max_bytes):
                raise _TooLarge()
            chunks: list[bytes] = []
            total = 0
            it = response.aiter_bytes().__aiter__()
            while True:
                chunk = await _race(_next_chunk(it), stop)
                if chunk is _END:
                    break
                total += len(chunk)
                if total > effect.max_bytes:
                    raise _TooLarge()
                chunks.append(chunk)
            reply = Reply(status, headers, b"".join(chunks))
        except _TooLarge:
            if ok:
                raise SearchError("response_too_large", provider=provider, status=status) from None
            reply = Reply(status, headers, None)
        except _Stopped as s:
            raise SearchError(s.code, provider=provider, status=status) from None
        except Exception as e:
            if ok:
                raise SearchError(deadline_code if isinstance(e, TimeoutError) else "network", provider=provider, status=status) from None
            reply = Reply(status, headers, None)
    except BaseException:
        if response is not None:  # closing must not delay an error or a cancellation
            _detach(asyncio.ensure_future(_close_async(response)), None)
        raise
    finally:
        cancel_timer()
        unsubscribe()
        attempt.cancel()
    await _close_async(response)
    return reply


async def _sleep_async(ms: int, cancel: CancelToken | None, clock: Clock) -> None:
    loop = asyncio.get_running_loop()
    woke: asyncio.Future[bool] = loop.create_future()

    def settle(value: bool) -> None:
        if not woke.done():
            woke.set_result(value)

    cancel_timer = clock.call_later(ms, lambda: settle(True))
    def on_cancel() -> None:
        loop.call_soon_threadsafe(settle, False)

    unsubscribe = cancel.subscribe(on_cancel) if cancel is not None else _noop
    try:
        completed = await woke
    finally:
        cancel_timer()
        unsubscribe()
    if not completed:
        raise SearchError("aborted")


async def _drive_async(gen: Generator[Effect, Any, T], transport: AsyncTransport, clock: Clock) -> T:
    value: Any = None
    error: SearchError | None = None
    try:
        while True:
            try:
                effect = gen.throw(error) if error is not None else gen.send(value)
            except StopIteration as done:
                result: T = done.value
                return result
            value, error = None, None
            try:
                if isinstance(effect, Send):
                    value = await _send_async(effect, transport, clock)
                else:
                    await _sleep_async(effect.ms, effect.cancel, clock)
            except SearchError as e:
                error = e
    finally:
        gen.close()


# ---- Public clients ----


class Client(_Base):
    """A synchronous client. Thread-safe; reuse one per application.

    >>> with Client(provider="exa", fallback=["tavily"], max_retries=1) as client:
    ...     response = client.search("sqlite wal mode", recency="month")

    Keys come from ``keys`` or each provider's documented environment
    variables (``EXA_API_KEY`` and so on). ``registry`` replaces the built-in
    provider specs; it is validated and copied. ``clock`` and ``random`` are
    for tests.
    """

    def __init__(
        self,
        *,
        provider: ProviderId | None = None,
        fallback: Sequence[ProviderId] | None = None,
        keys: Mapping[str, str] | None = None,
        env: Mapping[str, str] | None = None,
        timeout_ms: int | None = None,
        attempt_timeout_ms: int | None = None,
        max_retries: int | None = None,
        max_response_bytes: int | None = None,
        transport: Transport | None = None,
        registry: Mapping[str, Any] | None = None,
        clock: Clock | None = None,
        random: Callable[[], float] | None = None,
    ) -> None:
        super().__init__(
            provider=provider, fallback=fallback, keys=keys, env=env, timeout_ms=timeout_ms,
            attempt_timeout_ms=attempt_timeout_ms, max_retries=max_retries, max_response_bytes=max_response_bytes,
            registry=registry, clock=clock, random=random,
        )
        self._transport: Transport = transport or StdlibTransport()

    def search(self, query: str, **options: Unpack[SearchOptions]) -> SearchResponse:
        """Searches the web. Raises SearchError."""
        result: SearchResponse = _drive_sync(self._prepare("search", query, options), self._transport, self._clock)
        return result

    def contents(self, urls: str | Iterable[str], **options: Unpack[ContentsOptions]) -> ContentsResponse:
        """Fetches clean page text for one URL or a list of URLs. Raises SearchError."""
        subject = urls if isinstance(urls, (str, Sequence)) else list(urls)
        result: ContentsResponse = _drive_sync(self._prepare("contents", subject, options), self._transport, self._clock)
        return result

    def close(self) -> None:
        self._transport.close()

    def __enter__(self) -> Client:
        return self

    def __exit__(self, *exc: object) -> None:
        self.close()


class AsyncClient(_Base):
    """An asynchronous client with the same shape as Client.

    Cancelling the awaiting task stops the call at once and raises
    CancelledError; a CancelToken stops it with SearchError('aborted').
    """

    def __init__(
        self,
        *,
        provider: ProviderId | None = None,
        fallback: Sequence[ProviderId] | None = None,
        keys: Mapping[str, str] | None = None,
        env: Mapping[str, str] | None = None,
        timeout_ms: int | None = None,
        attempt_timeout_ms: int | None = None,
        max_retries: int | None = None,
        max_response_bytes: int | None = None,
        transport: AsyncTransport | None = None,
        registry: Mapping[str, Any] | None = None,
        clock: Clock | None = None,
        random: Callable[[], float] | None = None,
    ) -> None:
        super().__init__(
            provider=provider, fallback=fallback, keys=keys, env=env, timeout_ms=timeout_ms,
            attempt_timeout_ms=attempt_timeout_ms, max_retries=max_retries, max_response_bytes=max_response_bytes,
            registry=registry, clock=clock, random=random,
        )
        self._transport: AsyncTransport = transport or AsyncStdlibTransport()

    async def search(self, query: str, **options: Unpack[SearchOptions]) -> SearchResponse:
        """Searches the web. Raises SearchError."""
        result: SearchResponse = await _drive_async(self._prepare("search", query, options), self._transport, self._clock)
        return result

    async def contents(self, urls: str | Iterable[str], **options: Unpack[ContentsOptions]) -> ContentsResponse:
        """Fetches clean page text for one URL or a list of URLs. Raises SearchError."""
        subject = urls if isinstance(urls, (str, Sequence)) else list(urls)
        result: ContentsResponse = await _drive_async(self._prepare("contents", subject, options), self._transport, self._clock)
        return result

    async def aclose(self) -> None:
        await self._transport.aclose()

    async def __aenter__(self) -> AsyncClient:
        return self

    async def __aexit__(self, *exc: object) -> None:
        await self.aclose()


_default: Client | None = None
_default_async: AsyncClient | None = None


def _client() -> Client:
    global _default
    if _default is None:
        _default = Client()
    return _default


def _async_client() -> AsyncClient:
    global _default_async
    if _default_async is None:
        _default_async = AsyncClient()
    return _default_async


def search(query: str, *, provider: ProviderId, **options: Unpack[SearchInputs]) -> SearchResponse:
    """Searches with the provider's key from its environment variable."""
    return _client().search(query, provider=provider, **options)


def contents(urls: str | Iterable[str], *, provider: ProviderId, **options: Unpack[ContentsInputs]) -> ContentsResponse:
    """Fetches clean page text with the provider's key from its environment variable."""
    return _client().contents(urls, provider=provider, **options)


async def asearch(query: str, *, provider: ProviderId, **options: Unpack[SearchInputs]) -> SearchResponse:
    """The asynchronous search."""
    return await _async_client().search(query, provider=provider, **options)


async def acontents(urls: str | Iterable[str], *, provider: ProviderId, **options: Unpack[ContentsInputs]) -> ContentsResponse:
    """The asynchronous contents."""
    return await _async_client().contents(urls, provider=provider, **options)

