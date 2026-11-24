"""Blocks real network use in tests.

tests/__init__.py imports this module, so the guard is installed before any
test module runs however the tests are started (python -m unittest, pytest,
or one file). Only the loopback address 127.0.0.1 is reachable, for the test
that drives the real standard-library transport against a local server.
"""

from __future__ import annotations

import socket
from typing import Any

LOOPBACK = "127.0.0.1"
_MARK = "_searchsdk_network_guard"


class NetworkBlocked(RuntimeError):
    pass


def _blocked(what: str) -> NetworkBlocked:
    return NetworkBlocked(f"Network access is blocked in tests ({what}). Inject a transport instead.")


def _host(address: Any) -> Any:
    return address[0] if isinstance(address, tuple) and address else address


def install() -> None:
    if getattr(socket, _MARK, False):
        return
    setattr(socket, _MARK, True)
    original_connect = socket.socket.connect
    original_connect_ex = socket.socket.connect_ex
    original_sendto = socket.socket.sendto
    original_getaddrinfo = socket.getaddrinfo

    def connect(self: socket.socket, address: Any) -> None:
        if self.family in (socket.AF_INET, socket.AF_INET6) and _host(address) != LOOPBACK:
            raise _blocked(f"connect {_host(address)!r}")
        original_connect(self, address)

    def connect_ex(self: socket.socket, address: Any) -> int:
        if self.family in (socket.AF_INET, socket.AF_INET6) and _host(address) != LOOPBACK:
            raise _blocked(f"connect_ex {_host(address)!r}")
        return original_connect_ex(self, address)

    def sendto(self: socket.socket, data: Any, *args: Any) -> int:
        address = args[-1] if args else None
        if self.family in (socket.AF_INET, socket.AF_INET6) and _host(address) != LOOPBACK:
            raise _blocked(f"sendto {_host(address)!r}")
        result: int = original_sendto(self, data, *args)
        return result

    def getaddrinfo(host: Any, *args: Any, **kwargs: Any) -> Any:
        if host not in (LOOPBACK, LOOPBACK.encode()):
            raise _blocked(f"getaddrinfo {host!r}")
        return original_getaddrinfo(host, *args, **kwargs)

    def refuse(name: str) -> Any:
        def blocked(*args: Any, **kwargs: Any) -> Any:
            raise _blocked(f"{name} {args[:1]!r}")

        return blocked

    socket.socket.connect = connect  # type: ignore[method-assign, assignment]
    socket.socket.connect_ex = connect_ex  # type: ignore[method-assign, assignment]
    socket.socket.sendto = sendto  # type: ignore[method-assign, assignment]
    socket.getaddrinfo = getaddrinfo
    for name in ("gethostbyname", "gethostbyname_ex", "gethostbyaddr", "getnameinfo"):
        setattr(socket, name, refuse(name))


install()
