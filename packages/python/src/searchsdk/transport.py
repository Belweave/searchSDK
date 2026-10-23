"""Dependency-free HTTPS with injectable, bounded, synchronous transports."""

from __future__ import annotations
import asyncio
import email.utils
import http.client
import json
import queue
import threading
import time
import zlib
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Callable, Iterable, Iterator, Mapping, Protocol, TypeVar
from urllib.parse import urlsplit
from .errors import SearchError, status_code
from .validation import positive

DEFAULT_LIMIT = 10 * 1024 * 1024
T = TypeVar("T")


def now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")


class CancellationToken:
    """Thread-safe, idempotent cancellation; never stores a caller-supplied reason."""

    def __init__(self) -> None:
        self._event = threading.Event()
        self._lock = threading.Lock()
        self._callbacks: list[Callable[[], None]] = []

    def cancel(self) -> None:
        with self._lock:
            if self._event.is_set():
                return
            self._event.set()
            callbacks, self._callbacks = self._callbacks, []
        for callback in callbacks:
            try:
                callback()
            except Exception:
                pass

    def on_cancel(self, callback: Callable[[], None]) -> Callable[[], None]:
        with self._lock:
            cancelled = self._event.is_set()
            if not cancelled:
                self._callbacks.append(callback)
        if cancelled:
            callback()

        def unsubscribe() -> None:
            with self._lock:
                if callback in self._callbacks:
                    self._callbacks.remove(callback)

        return unsubscribe

    @property
    def cancelled(self) -> bool:
        return self._event.is_set()


class CallContext:
    """Monotonic whole-call budget passed to injected transports and providers."""

    def __init__(
        self,
        deadline: float,
        cancellation: CancellationToken | None = None,
        *,
        parent: CallContext | None = None,
        timeout_code: str = "timeout",
    ) -> None:
        self.deadline = deadline
        self.cancellation = cancellation
        self.parent = parent
        self.timeout_code = timeout_code
        self._closed = threading.Event()
        self._lock = threading.Lock()
        self._callbacks: list[Callable[[], None]] = []
        self._unsubscribe: Callable[[], None] = lambda: None
        if cancellation is not None:
            self._unsubscribe = cancellation.on_cancel(self.close)
        if parent is not None:
            parent.on_close(self.close)

    @property
    def remaining(self) -> float:
        return max(0, self.deadline - time.monotonic())

    def check(self) -> None:
        if self.parent:
            self.parent.check()
        if self.cancellation and self.cancellation.cancelled:
            raise SearchError("aborted")
        if time.monotonic() >= self.deadline:
            raise SearchError(self.timeout_code)
        if self._closed.is_set():
            raise SearchError("aborted")

    def on_close(self, callback: Callable[[], None]) -> None:
        with self._lock:
            if not self._closed.is_set():
                self._callbacks.append(callback)
                return
        try:
            callback()
        except Exception:
            pass

    def close(self) -> None:
        with self._lock:
            if self._closed.is_set():
                return
            self._closed.set()
            callbacks, self._callbacks = self._callbacks, []
        self._unsubscribe()
        for callback in callbacks:
            try:
                callback()
            except Exception:
                pass

    def sleep(self, seconds: float) -> None:
        self.check()
        if seconds >= self.remaining:
            raise SearchError("timeout")
        end = time.monotonic() + seconds
        while time.monotonic() < end:
            self.check()
            self._closed.wait(min(0.01, end - time.monotonic()))
        self.check()


def context_for(timeout_ms: int, cancellation: CancellationToken | None) -> CallContext:
    positive(timeout_ms)
    if cancellation is not None and not isinstance(cancellation, CancellationToken):
        raise SearchError("invalid_request")
    return CallContext(time.monotonic() + timeout_ms / 1000, cancellation)


class BoundedRunner:
    """A timed-out uncooperative worker keeps its permit until it actually exits."""

    def __init__(self, concurrency: int) -> None:
        self._slots = threading.BoundedSemaphore(positive(concurrency, 64))

    def run(self, fn: Callable[[], T], context: CallContext) -> T:
        while True:
            context.check()
            if self._slots.acquire(timeout=min(0.01, context.remaining)):
                break
        output: queue.Queue[tuple[bool, Any]] = queue.Queue(1)

        def worker() -> None:
            try:
                context.check()
                output.put((True, fn()))
            except Exception as error:
                # Retain only SDK errors, never transport exception strings/tracebacks.
                clean = (
                    SearchError(
                        error.code,
                        status=error.status,
                        retry_after_ms=error.retry_after_ms,
                        attempts=error.attempts,
                    )
                    if isinstance(error, SearchError)
                    else SearchError("provider_error")
                )
                output.put((False, clean))
            finally:
                self._slots.release()

        thread = threading.Thread(target=worker, name="searchsdk-call", daemon=True)
        try:
            thread.start()
        except Exception:
            self._slots.release()
            raise SearchError("unavailable") from None
        try:
            while True:
                context.check()
                try:
                    ok, value = output.get(timeout=min(0.01, context.remaining))
                except queue.Empty:
                    continue
                context.check()
                if ok:
                    return value
                raise value from None
        except SearchError as error:
            if error.code in {"timeout", "attempt_timeout", "aborted"}:
                context.close()
            raise
        except BaseException:
            context.close()
            raise


@dataclass(frozen=True, repr=False)
class HttpRequest:
    method: str
    url: str
    headers: Mapping[str, str] = field(default_factory=dict, repr=False)
    body: bytes | None = field(default=None, repr=False)

    def __repr__(self) -> str:
        return f"HttpRequest(method={self.method!r}, url=<redacted>)"


@dataclass(repr=False)
class HttpResponse:
    status: int
    headers: Mapping[str, str] = field(default_factory=dict, repr=False)
    body: bytes | Iterable[bytes] = field(default=b"", repr=False)
    close: Callable[[], None] = field(default=lambda: None, repr=False)

    def __repr__(self) -> str:
        return f"HttpResponse(status={self.status!r}, body=<redacted>)"

    @classmethod
    def json(
        cls, value: Any, status: int = 200, headers: Mapping[str, str] | None = None
    ) -> HttpResponse:
        return cls(status, headers or {}, json.dumps(value, allow_nan=False).encode())


class Transport(Protocol):
    def __call__(self, request: HttpRequest, context: CallContext) -> HttpResponse: ...


def https_transport(request: HttpRequest, context: CallContext) -> HttpResponse:
    """No redirects, proxy discovery, cookies, credential persistence or automatic retries."""
    p = urlsplit(request.url)
    if (
        p.scheme != "https"
        or p.username is not None
        or p.password is not None
        or not p.hostname
        or p.fragment
    ):
        raise SearchError("configuration")
    connection = http.client.HTTPSConnection(
        p.hostname, p.port, timeout=max(0.001, context.remaining)
    )
    context.on_close(connection.close)
    try:
        context.check()
        target = (p.path or "/") + (("?" + p.query) if p.query else "")
        connection.request(
            request.method,
            target,
            body=request.body,
            headers={"Accept-Encoding": "identity", **request.headers},
        )
        response = connection.getresponse()
    except Exception:
        connection.close()
        context.check()
        raise SearchError("network") from None

    def chunks() -> Iterator[bytes]:
        try:
            while True:
                context.check()
                part = response.read1(65536)
                context.check()
                if not part:
                    break
                yield part
        except SearchError:
            raise
        except Exception:
            context.check()
            raise SearchError("network") from None
        finally:
            connection.close()

    return HttpResponse(response.status, dict(response.getheaders()), chunks(), connection.close)


def safe_close(response: HttpResponse) -> None:
    """Cleanup must not replace a sanitized operation error with transport details."""
    try:
        response.close()
    except Exception:
        pass


def headers(response: HttpResponse) -> dict[str, str]:
    if type(response.status) is not int or not 100 <= response.status <= 599:
        raise SearchError("invalid_response")
    if not isinstance(response.headers, Mapping) or any(
        not isinstance(k, str) or not isinstance(v, str) for k, v in response.headers.items()
    ):
        raise SearchError("invalid_response")
    return {k.lower(): v for k, v in response.headers.items()}


def retry_after(value: str | None) -> float | None:
    if not value:
        return None
    try:
        delay = (
            float(value) * 1000
            if __import__("re").fullmatch(r"\d+(?:\.\d+)?", value.strip())
            else max(0, (email.utils.parsedate_to_datetime(value).timestamp() - time.time()) * 1000)
        )
        return delay if __import__("math").isfinite(delay) and delay >= 0 else None
    except (ValueError, TypeError, OverflowError):
        return None


def decoded_chunks(response: HttpResponse, context: CallContext, maximum: int) -> Iterator[bytes]:
    h = headers(response)
    encoding = h.get("content-encoding", "identity").lower().strip()
    if encoding not in ("identity", "gzip", "deflate"):
        raise SearchError("invalid_response")
    decoder = (
        zlib.decompressobj(31 if encoding == "gzip" else 15) if encoding != "identity" else None
    )
    body = (response.body,) if isinstance(response.body, bytes) else response.body
    count = wire_count = 0
    try:
        for part in body:
            context.check()
            if not isinstance(part, bytes):
                raise SearchError("invalid_response")
            wire_count += len(part)
            if wire_count > maximum:
                raise SearchError("invalid_response")
            part = decoder.decompress(part, maximum - count + 1) if decoder else part
            count += len(part)
            if count > maximum or decoder and (decoder.unconsumed_tail or decoder.unused_data):
                raise SearchError("invalid_response")
            yield part
        if decoder:
            if not decoder.eof:
                raise SearchError("invalid_response")
            tail = decoder.flush(maximum - count + 1)
            if count + len(tail) > maximum:
                raise SearchError("invalid_response")
            yield tail
        context.check()
    except SearchError:
        raise
    except (zlib.error, TypeError):
        raise SearchError("invalid_response") from None
    except Exception:
        context.check()
        raise SearchError("network") from None
    finally:
        safe_close(response)


def read_bytes(response: HttpResponse, context: CallContext, maximum: int) -> bytes:
    buffer = bytearray()
    for part in decoded_chunks(response, context, maximum):
        buffer.extend(part)
    return bytes(buffer)


def parse_json(data: bytes) -> Any:
    try:
        return json.loads(
            data.decode("utf-8-sig"), parse_constant=lambda _: (_ for _ in ()).throw(ValueError())
        )
    except (UnicodeError, ValueError, RecursionError):
        raise SearchError("invalid_response") from None


def encode_json(value: Any) -> bytes:
    try:
        return json.dumps(value, ensure_ascii=True, allow_nan=False, separators=(",", ":")).encode()
    except (ValueError, TypeError, RecursionError):
        raise SearchError("invalid_request") from None


def send(transport: Transport, request: HttpRequest, context: CallContext) -> HttpResponse:
    context.check()
    try:
        response = transport(request, context)
    except SearchError:
        raise
    except Exception:
        context.check()
        raise SearchError("network") from None
    if not isinstance(response, HttpResponse):
        raise SearchError("invalid_response")
    context.on_close(lambda: safe_close(response))
    context.check()
    return response


def request_json(
    transport: Transport, request: HttpRequest, context: CallContext, maximum: int = DEFAULT_LIMIT
) -> Any:
    response = send(transport, request, context)
    h = headers(response)
    if not 200 <= response.status < 300:
        safe_close(response)
        raise SearchError(
            status_code(response.status),
            status=response.status,
            retry_after_ms=retry_after(h.get("retry-after")),
        )
    data = parse_json(read_bytes(response, context, maximum))
    context.check()
    return data


async def async_call(
    fn: Callable[..., T], *args: Any, cancellation: CancellationToken | None = None, **kwargs: Any
) -> T:
    """Cancel the SDK operation when its asyncio task is cancelled; retain CancelledError."""
    token = CancellationToken()
    # A linked token observes caller cancellation without a polling task on the event loop.
    if cancellation is not None:
        if not isinstance(cancellation, CancellationToken):
            raise SearchError("invalid_request")
        parent = cancellation

        class Linked(CancellationToken):
            @property
            def cancelled(self) -> bool:
                return super().cancelled or parent.cancelled

        token = Linked()
        unsubscribe = parent.on_cancel(token.cancel)
    else:

        def unsubscribe() -> None:
            return None

    try:
        return await asyncio.to_thread(fn, *args, cancellation=token, **kwargs)
    except asyncio.CancelledError:
        token.cancel()
        raise
    finally:
        unsubscribe()
