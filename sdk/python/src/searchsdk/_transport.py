"""HTTP transports.

A transport sends one request and streams the response body. The client
enforces deadlines, cancellation, the size limit and redirects policy around
it, so a transport only has to honour the ``timeout`` and ``cancel`` it is
given (the synchronous client cannot interrupt a transport that ignores them).

The default, ``StdlibTransport``, uses http.client from the standard library:
one connection per request, TLS through the ssl module's default context,
HTTPS_PROXY / HTTP_PROXY / NO_PROXY from the environment (CONNECT tunnels for
HTTPS), no redirects. ``AsyncStdlibTransport`` runs it in worker threads.
"""

from __future__ import annotations

import asyncio
import base64
import http.client
import socket
import ssl
import time
import urllib.request
from collections.abc import AsyncIterator, Iterator, Mapping, Sequence
from typing import Protocol
from urllib.parse import unquote, urlsplit

from ._clock import CancelToken
from ._engine import HttpRequest

__all__ = [
    "AsyncResponse",
    "AsyncStdlibTransport",
    "AsyncTransport",
    "HttpRequest",
    "Response",
    "StdlibTransport",
    "Transport",
]

Headers = Sequence[tuple[str, str]]


class Response(Protocol):
    """A response whose body is read in chunks."""

    @property
    def status(self) -> int: ...

    @property
    def headers(self) -> Headers: ...

    def iter_bytes(self) -> Iterator[bytes]: ...

    def close(self) -> None: ...


class Transport(Protocol):
    """Synchronous transport. Must give up by ``timeout`` seconds (connect, headers and body together) and stop promptly when ``cancel`` fires."""

    def send(self, request: HttpRequest, *, timeout: float, cancel: CancelToken) -> Response: ...

    def close(self) -> None: ...


class AsyncResponse(Protocol):
    @property
    def status(self) -> int: ...

    @property
    def headers(self) -> Headers: ...

    def aiter_bytes(self) -> AsyncIterator[bytes]: ...

    async def aclose(self) -> None: ...


class AsyncTransport(Protocol):
    """Asynchronous transport. The client also races it against deadlines and cancellation, so it may be cut off at any await."""

    async def send(self, request: HttpRequest, *, timeout: float, cancel: CancelToken) -> AsyncResponse: ...

    async def aclose(self) -> None: ...


_CHUNK = 65536


def _shutdown(conn: http.client.HTTPConnection) -> None:
    sock = conn.sock
    if sock is not None:
        try:
            sock.shutdown(socket.SHUT_RDWR)
        except OSError:
            pass


class _StdlibResponse:
    def __init__(self, conn: http.client.HTTPConnection, resp: http.client.HTTPResponse, deadline: float, unsubscribe: object) -> None:
        self._conn = conn
        self._resp = resp
        self._deadline = deadline
        self._unsubscribe = unsubscribe
        self.status = resp.status
        self.headers: Headers = [(k.lower(), v) for k, v in resp.getheaders()]

    def iter_bytes(self) -> Iterator[bytes]:
        while True:
            remaining = self._deadline - time.monotonic()
            if remaining <= 0:
                raise TimeoutError("deadline reached while reading the body")
            if self._conn.sock is not None:
                self._conn.sock.settimeout(remaining)
            chunk = self._resp.read1(_CHUNK)
            if not chunk:
                if self._resp.length:  # read1 reports a body cut short of Content-Length as a clean end
                    raise ConnectionResetError("the connection closed before the body was complete")
                return
            yield chunk

    def close(self) -> None:
        try:
            self._resp.close()
        finally:
            self._conn.close()
            unsubscribe = self._unsubscribe
            if callable(unsubscribe):
                unsubscribe()


class StdlibTransport:
    """The default transport: http.client, no third-party code."""

    def __init__(self, *, ssl_context: ssl.SSLContext | None = None, proxies: Mapping[str, str] | None = None) -> None:
        self._ssl = ssl_context or ssl.create_default_context()
        self._proxies = dict(urllib.request.getproxies_environment() if proxies is None else proxies)

    def _proxy_for(self, scheme: str, host: str) -> str | None:
        """The proxy for a URL, honouring NO_PROXY: '*', exact hosts and domain suffixes."""
        proxy = self._proxies.get(scheme)
        if not proxy:
            return None
        host = host.lower().rstrip(".")
        for entry in self._proxies.get("no", "").split(","):
            entry = entry.strip().lower().lstrip(".").rstrip(".")
            if entry == "*" or (entry and (host == entry or host.endswith("." + entry))):
                return None
        return proxy

    def send(self, request: HttpRequest, *, timeout: float, cancel: CancelToken) -> Response:
        deadline = time.monotonic() + timeout
        parts = urlsplit(request.url)
        host = parts.hostname or ""
        port = parts.port or (443 if parts.scheme == "https" else 80)
        target = parts.path or "/"
        if parts.query:
            target += "?" + parts.query
        headers = dict(request.headers)
        proxy = self._proxy_for(parts.scheme, host)
        conn: http.client.HTTPConnection
        if proxy:
            p = urlsplit(proxy if "://" in proxy else "http://" + proxy)
            auth = {}
            if p.username is not None:
                token = base64.b64encode(f"{unquote(p.username)}:{unquote(p.password or '')}".encode()).decode()
                auth["Proxy-Authorization"] = "Basic " + token
            if parts.scheme == "https":
                conn = http.client.HTTPSConnection(p.hostname or "", p.port or 80, timeout=max(timeout, 0.001), context=self._ssl)
                conn.set_tunnel(host, port, headers=auth)
            else:
                conn = http.client.HTTPConnection(p.hostname or "", p.port or 80, timeout=max(timeout, 0.001))
                target = request.url
                headers.update(auth)
        elif parts.scheme == "https":
            conn = http.client.HTTPSConnection(host, port, timeout=max(timeout, 0.001), context=self._ssl)
        else:
            conn = http.client.HTTPConnection(host, port, timeout=max(timeout, 0.001))
        unsubscribe = cancel.subscribe(lambda: _shutdown(conn))
        try:
            if cancel.cancelled:
                raise ConnectionAbortedError("cancelled")
            conn.connect()
            if cancel.cancelled:
                raise ConnectionAbortedError("cancelled")
            remaining = deadline - time.monotonic()
            if remaining <= 0:
                raise TimeoutError("deadline reached")
            if conn.sock is not None:
                conn.sock.settimeout(remaining)
            conn.request(request.method, target, body=request.body, headers=headers)
            resp = conn.getresponse()
        except BaseException:
            unsubscribe()
            conn.close()
            raise
        return _StdlibResponse(conn, resp, deadline, unsubscribe)

    def close(self) -> None:
        pass


class _ThreadedResponse:
    def __init__(self, inner: Response) -> None:
        self._inner = inner
        self.status = inner.status
        self.headers = inner.headers

    async def aiter_bytes(self) -> AsyncIterator[bytes]:
        it = self._inner.iter_bytes()
        done = object()
        while True:
            chunk = await asyncio.to_thread(next, it, done)
            if chunk is done:
                return
            assert isinstance(chunk, bytes)
            yield chunk

    async def aclose(self) -> None:
        self._inner.close()


class AsyncStdlibTransport:
    """StdlibTransport for asyncio: each blocking step runs in a worker thread (asyncio.to_thread)."""

    def __init__(self, transport: Transport | None = None) -> None:
        self._sync: Transport = transport or StdlibTransport()

    async def send(self, request: HttpRequest, *, timeout: float, cancel: CancelToken) -> AsyncResponse:
        inner = await asyncio.to_thread(lambda: self._sync.send(request, timeout=timeout, cancel=cancel))
        return _ThreadedResponse(inner)

    async def aclose(self) -> None:
        self._sync.close()
