"""Time and cancellation.

The SDK reads time only through a Clock, so tests can run every deadline and
backoff on a virtual clock. CancelToken cancels a call from any thread; in
async code, cancelling the task works as well and raises CancelledError.
"""

from __future__ import annotations

import asyncio
import threading
import time
from collections.abc import Callable
from typing import Protocol


class CancelToken:
    """Cancels the calls it is passed to, from any thread.

    >>> token = CancelToken()
    >>> # in another thread: token.cancel()

    A cancelled call raises ``SearchError`` with code ``"aborted"``.
    """

    __slots__ = ("_lock", "_cancelled", "_callbacks")

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._cancelled = False
        self._callbacks: list[Callable[[], None]] = []

    @property
    def cancelled(self) -> bool:
        return self._cancelled

    def cancel(self) -> None:
        """Cancels every call using this token. Later calls with it fail at once."""
        with self._lock:
            if self._cancelled:
                return
            self._cancelled = True
            callbacks, self._callbacks = self._callbacks, []
        for callback in callbacks:
            try:
                callback()
            except Exception:  # a failing listener must not stop the others
                pass

    def subscribe(self, callback: Callable[[], None]) -> Callable[[], None]:
        """Runs ``callback`` once on cancellation (at once if already cancelled). Returns an unsubscribe function."""
        with self._lock:
            if not self._cancelled:
                self._callbacks.append(callback)

                def unsubscribe() -> None:
                    with self._lock:
                        if callback in self._callbacks:
                            self._callbacks.remove(callback)

                return unsubscribe
        callback()
        return lambda: None

    def __repr__(self) -> str:
        return f"CancelToken(cancelled={self._cancelled})"


class Clock(Protocol):
    """Time source. Every value is an integer number of milliseconds."""

    def now(self) -> int:
        """Wall-clock time since the Unix epoch, for dates (recency, Retry-After)."""
        ...

    def monotonic(self) -> int:
        """Never goes back; used for deadlines, durations and latency."""
        ...

    def sleep(self, ms: int, cancel: CancelToken | None) -> bool:
        """Blocks for ``ms`` (synchronous API). Returns False early when ``cancel`` fires."""
        ...

    def call_later(self, ms: int, callback: Callable[[], None]) -> Callable[[], None]:
        """Runs ``callback`` after ``ms`` on the running event loop (async API). Returns a function that cancels it."""
        ...


class SystemClock:
    """The real clock: time.time_ns, time.monotonic_ns, threading and the running asyncio loop."""

    def now(self) -> int:
        return time.time_ns() // 1_000_000

    def monotonic(self) -> int:
        return time.monotonic_ns() // 1_000_000

    def sleep(self, ms: int, cancel: CancelToken | None) -> bool:
        if cancel is None:
            time.sleep(ms / 1000)
            return True
        woken = threading.Event()
        unsubscribe = cancel.subscribe(woken.set)
        try:
            woken.wait(ms / 1000)
        finally:
            unsubscribe()
        return not cancel.cancelled

    def call_later(self, ms: int, callback: Callable[[], None]) -> Callable[[], None]:
        handle = asyncio.get_running_loop().call_later(ms / 1000, callback)
        return handle.cancel


SYSTEM_CLOCK = SystemClock()
