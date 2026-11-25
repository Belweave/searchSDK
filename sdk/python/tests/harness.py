"""Runs registry/conformance vectors against this runtime with a virtual clock
and a scripted transport. Format and clock contract: registry/conformance/README.md.

Each case runs twice: through Client (synchronous driver) and AsyncClient
(asynchronous driver). Vectors spell inputs in camelCase; the Python API uses
snake_case, and calls the cancellation handle ``cancel`` instead of ``signal``.
"""

from __future__ import annotations

import asyncio
import base64
import json
import re
import traceback
from collections.abc import AsyncIterator, Callable, Iterator
from pathlib import Path
from typing import Any, Literal

from searchsdk import AsyncClient, CancelToken, Client, HttpRequest, SearchError
from searchsdk._json import json_equal
from searchsdk._registry import BUILT_IN

from . import guard as _guard  # noqa: F401  (installed by the package too)

CONFORMANCE = Path(__file__).resolve().parents[3] / "registry" / "conformance"
DEFAULT_NOW = "2026-11-24T12:00:00.000Z"
Mode = Literal["sync", "async"]


def load_vectors(sub: str) -> list[tuple[str, Any]]:
    folder = CONFORMANCE / sub
    return [(f"{sub}{p.name}", json.loads(p.read_text(encoding="utf-8"))) for p in sorted(folder.glob("*.json"))]


def python_name(name: str) -> str:
    """The Python spelling of a canonical (camelCase) input name."""
    if name == "signal":
        return "cancel"
    return re.sub("([A-Z])", lambda m: "_" + m.group(1).lower(), name)


def python_field(field: str) -> str:
    """Error fields name an input, then (for provider options) a provider id and an option's wire name."""
    head, sep, rest = field.partition(".")
    return python_name(head) + sep + rest


def parse_iso(text: str) -> int:
    from searchsdk._steps import epoch_ms

    m = re.fullmatch(r"(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})\.(\d{3})Z", text)
    assert m, text
    return epoch_ms(*(int(g) for g in m.groups()))


class VirtualClock:
    """Timers fire in due-time order; equal due times fire in creation order."""

    def __init__(self, t: int) -> None:
        self.t = t
        self._timers: list[tuple[int, int, Callable[[], None]]] = []
        self._seq = 0

    def now(self) -> int:
        return self.t

    def monotonic(self) -> int:
        return self.t

    def call_later(self, ms: int, callback: Callable[[], None]) -> Callable[[], None]:
        self._seq += 1
        entry = (self.t + max(0, ms), self._seq, callback)
        self._timers.append(entry)

        def cancel() -> None:
            if entry in self._timers:
                self._timers.remove(entry)

        return cancel

    def advance(self) -> bool:
        if not self._timers:
            return False
        self._timers.sort(key=lambda e: (e[0], e[1]))
        at, _, callback = self._timers.pop(0)
        self.t = at
        callback()
        return True

    def wait_until(self, t: int, cancel: CancelToken | None = None) -> None:
        """Synchronous waiting: fires due timers in order until ``t``, or until ``cancel`` fires."""
        while not (cancel is not None and cancel.cancelled):
            due = sorted(self._timers, key=lambda e: (e[0], e[1]))
            if not due or due[0][0] > t:
                self.t = max(self.t, t)
                return
            self.advance()

    def sleep(self, ms: int, cancel: CancelToken | None) -> bool:
        self.wait_until(self.t + ms, cancel)
        return not (cancel is not None and cancel.cancelled)


def expand(v: Any) -> Any:
    if isinstance(v, list):
        return [expand(x) for x in v]
    if isinstance(v, dict) and "$repeat" in v:
        return v.get("prefix", "") + str(v["$repeat"]) * v["count"] + v.get("suffix", "")
    if isinstance(v, dict) and "$urls" in v:
        return [f"https://example.com/{i}" for i in range(v["$urls"])]
    return v


def body_bytes(r: dict[str, Any]) -> bytes | None:
    if "body" in r:
        return json.dumps(r["body"], ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    if "bodyText" in r:
        return str(r["bodyText"]).encode("utf-8")
    if "bodyBase64" in r:
        return base64.b64decode(str(r["bodyBase64"]))
    if "bodyFill" in r:
        f = r["bodyFill"]
        return str(f["prefix"] + f["repeat"] * f["count"] + f["suffix"]).encode("utf-8")
    return None


def _headers(r: dict[str, Any]) -> list[tuple[str, str]]:
    h = r.get("headers") or {}
    pairs = h if isinstance(h, list) else list(h.items())
    return [(str(k).lower(), str(v)) for k, v in pairs]


def _scripted_body(r: dict[str, Any]) -> bytes | None:
    status = r.get("status", 200)
    return None if status in (204, 205, 304) else body_bytes(r)


class _Script:
    """The scripted responses and the requests seen, shared by both transports."""

    def __init__(self, responses: list[Any], clock: VirtualClock) -> None:
        self.responses = responses
        self.clock = clock
        self.requests: list[dict[str, Any]] = []
        self.next = 0

    def take(self, request: HttpRequest) -> dict[str, Any]:
        self.requests.append(
            {
                "method": request.method,
                "url": request.url,
                "headers": {k.lower(): v for k, v in request.headers.items()},
                "body": json.loads(request.body) if request.body is not None else None,
            }
        )
        if self.next >= len(self.responses):
            raise AssertionError("Unexpected request: no scripted response left")
        r: dict[str, Any] = self.responses[self.next]
        self.next += 1
        return r


# ---- Synchronous scripted transport ----


class _SyncResponse:
    def __init__(self, r: dict[str, Any], clock: VirtualClock, stop_at: int, cancel: CancelToken) -> None:
        self._r, self._clock, self._stop_at, self._cancel = r, clock, stop_at, cancel
        self.status: int = r.get("status", 200)
        self.headers = _headers(r)
        self._start = clock.t

    def _wait(self, until: int) -> None:
        """Waits like a stream that fails on abort (unless ignoreAbort)."""
        if self._r.get("ignoreAbort"):
            self._clock.wait_until(until)
            return
        self._clock.wait_until(min(until, self._stop_at), self._cancel)
        if self._cancel.cancelled:
            raise ConnectionAbortedError("This operation was aborted")
        if self._stop_at <= until and self._clock.t >= self._stop_at:
            raise TimeoutError("deadline")

    def iter_bytes(self) -> Iterator[bytes]:
        data = _scripted_body(self._r)
        if not data:
            return
        if "bodyFailAtMs" in self._r:
            yield data[: len(data) // 2]
            self._wait(self._start + self._r["bodyFailAtMs"])
            raise ConnectionResetError("terminated")
        if self._r.get("bodyDelayMs"):
            self._wait(self._start + self._r["bodyDelayMs"])
        yield data

    def close(self) -> None:
        pass


class SyncScriptedTransport:
    def __init__(self, script: _Script) -> None:
        self.script = script

    def send(self, request: HttpRequest, *, timeout: float, cancel: CancelToken) -> _SyncResponse:
        clock = self.script.clock
        r = self.script.take(request)
        deliver = clock.t + r.get("delayMs", 0)
        stop_at = clock.t + round(timeout * 1000)
        if r.get("ignoreAbort"):
            clock.wait_until(deliver)
        else:
            if cancel.cancelled:
                raise ConnectionAbortedError("This operation was aborted")
            clock.wait_until(min(deliver, stop_at), cancel)
            if cancel.cancelled:
                raise ConnectionAbortedError("This operation was aborted")
            if stop_at <= deliver and clock.t >= stop_at:
                raise TimeoutError("deadline")
        if r.get("network"):
            raise ConnectionError("fetch failed")
        return _SyncResponse(r, clock, stop_at, cancel)

    def close(self) -> None:
        pass


# ---- Asynchronous scripted transport ----


class _AsyncResponse:
    def __init__(self, r: dict[str, Any], clock: VirtualClock, cancel: CancelToken) -> None:
        self._r, self._clock, self._cancel = r, clock, cancel
        self.status: int = r.get("status", 200)
        self.headers = _headers(r)
        self._timers: list[Callable[[], None]] = []
        loop = asyncio.get_running_loop()
        data = _scripted_body(r)
        self._data = data
        self._first: asyncio.Future[bytes | None] = loop.create_future()
        self._second: asyncio.Future[bytes | None] = loop.create_future()
        if not data:
            self._first.set_result(None)
            return
        if "bodyFailAtMs" in r:
            self._first.set_result(data[: len(data) // 2])
            self._timers.append(clock.call_later(r["bodyFailAtMs"], lambda: self._fail(self._second, ConnectionResetError("terminated"))))
        elif r.get("bodyDelayMs"):
            self._timers.append(clock.call_later(r["bodyDelayMs"], lambda: self._settle(self._first, data)))
            self._second.set_result(None)
        else:
            self._first.set_result(data)
            self._second.set_result(None)
        if not r.get("ignoreAbort"):
            cancel.subscribe(self._abort)

    @staticmethod
    def _settle(f: asyncio.Future[bytes | None], value: bytes | None) -> None:
        if not f.done():
            f.set_result(value)

    @staticmethod
    def _fail(f: asyncio.Future[bytes | None], exc: BaseException) -> None:
        if not f.done():
            f.set_exception(exc)

    def _abort(self) -> None:
        for cancel_timer in self._timers:
            cancel_timer()
        for f in (self._first, self._second):
            self._fail(f, ConnectionAbortedError("This operation was aborted"))

    async def aiter_bytes(self) -> AsyncIterator[bytes]:
        for f in (self._first, self._second):
            chunk = await asyncio.shield(f) if self._r.get("ignoreAbort") else await f
            if chunk is None:
                return
            yield chunk

    async def aclose(self) -> None:
        for cancel_timer in self._timers:
            cancel_timer()
        for f in (self._first, self._second):
            if f.done() and not f.cancelled():
                f.exception()


class AsyncScriptedTransport:
    def __init__(self, script: _Script) -> None:
        self.script = script

    async def send(self, request: HttpRequest, *, timeout: float, cancel: CancelToken) -> _AsyncResponse:
        clock = self.script.clock
        r = self.script.take(request)
        loop = asyncio.get_running_loop()
        delivered: asyncio.Future[_AsyncResponse] = loop.create_future()

        def deliver() -> None:
            if delivered.done():
                return
            if r.get("network"):
                delivered.set_exception(ConnectionError("fetch failed"))
            else:
                delivered.set_result(_AsyncResponse(r, clock, cancel))

        cancel_timer = clock.call_later(r.get("delayMs", 0), deliver)
        if not r.get("ignoreAbort"):

            def abort() -> None:
                cancel_timer()
                if not delivered.done():
                    delivered.set_exception(ConnectionAbortedError("This operation was aborted"))

            cancel.subscribe(abort)
            return await delivered
        return await asyncio.shield(delivered)

    async def aclose(self) -> None:
        pass


# ---- Running a case ----


def merge_options(base: Any, over: Any) -> dict[str, Any]:
    """Overlays case options on file defaults; None removes a key."""
    out: dict[str, Any] = {}
    for src in (base or {}, over or {}):
        for k, v in src.items():
            if v is None:
                out.pop(k, None)
            else:
                out[k] = v
    return out


def assert_json(actual: Any, expected: Any, where: str) -> None:
    if not json_equal(actual, expected) and not (actual is None and expected is None):
        raise AssertionError(f"{where}:\n  actual   {json.dumps(actual, ensure_ascii=False, default=repr)}\n  expected {json.dumps(expected, ensure_ascii=False)}")


def check_request(actual: dict[str, Any], expected: dict[str, Any], where: str) -> None:
    for k in ("method", "url", "headers", "body"):
        if k in expected:
            assert_json(actual[k], expected[k], f"{where} {k}")
    for k, v in (expected.get("bodyIncludes") or {}).items():
        body = actual["body"] or {}
        assert_json(body.get(k), v, f"{where} body.{k}")


async def _drive_virtual(make: Callable[[], Any], clock: VirtualClock) -> Any:
    loop = asyncio.get_running_loop()

    async def flush() -> None:
        idle = 0
        for _ in range(100_000):
            await asyncio.sleep(0)
            ready = getattr(loop, "_ready", None)
            idle = idle + 1 if not ready else 0
            if idle >= 3:
                return

    task = asyncio.ensure_future(make())
    while not task.done():
        await flush()
        if task.done():
            break
        if not clock.advance():
            await flush()
            if not task.done():
                task.cancel()
                raise AssertionError("Deadlock: call pending with no timers")
    return task


def run_case(case: dict[str, Any], file: dict[str, Any], mode: Mode) -> None:
    defaults = file.get("defaults") or {}
    clock = VirtualClock(parse_iso(case.get("now", DEFAULT_NOW)))
    responses = case.get("responses", defaults.get("responses", []))
    script = _Script(responses, clock)
    randoms: list[float] = case.get("random", [0.5])
    index = [0]

    def random() -> float:
        value = randoms[min(index[0], len(randoms) - 1)]
        index[0] += 1
        return value

    ids = list(file["providers"]) if "providers" in file else list(BUILT_IN)
    config: dict[str, Any] = {"keys": {i: f"test-key-{i}" for i in ids}, "env": {}}
    if "providers" in file:
        config["registry"] = file["providers"]
    config.update({python_name(k): v for k, v in expand(case.get("client") or {}).items()})
    events: list[Any] = []
    if config.get("diagnostics") is True:
        config["diagnostics"] = lambda event: events.append(event.to_json())
    options = {python_name(k): v for k, v in merge_options(defaults.get("options"), case.get("options")).items()}
    abort_at = case.get("abortAt")
    if abort_at is not None:
        token = CancelToken()
        if abort_at == "before":
            token.cancel()
        else:
            clock.call_later(abort_at, token.cancel)
        options["cancel"] = token

    result: Any = None
    error: BaseException | None = None
    if mode == "sync":
        client = Client(**config, transport=SyncScriptedTransport(script), clock=clock, random=random)
        try:
            result = client.search(expand(case["query"]), **options) if case["call"] == "search" else client.contents(expand(case["urls"]), **options)
        except SearchError as e:
            error = e
    else:
        aclient = AsyncClient(**config, transport=AsyncScriptedTransport(script), clock=clock, random=random)

        def make() -> Any:
            if case["call"] == "search":
                return aclient.search(expand(case["query"]), **options)
            return aclient.contents(expand(case["urls"]), **options)

        task = asyncio.run(_drive_virtual(make, clock))
        if task.exception() is not None:
            error = task.exception()
            if not isinstance(error, SearchError):
                raise error
        else:
            result = task.result()

    expect = case.get("expect") or {}
    if "requestCount" in expect:
        assert_json(len(script.requests), expect["requestCount"], "request count")
    if "requests" in expect:
        assert_json(len(script.requests), len(expect["requests"]), "request count")
        for i, exp in enumerate(expect["requests"]):
            check_request(script.requests[i], exp, f"request {i}")
    if "diagnostics" in expect:
        actual_events = [{**ev, "request": {**ev["request"], "body": None if ev["request"]["body"] is None else json.loads(ev["request"]["body"])}} for ev in events]
        expected_events = [
            {**ev, "response": {**ev["response"], "body": expand(ev["response"]["body"])}} if ev.get("response") else ev for ev in expect["diagnostics"]
        ]
        assert_json(actual_events, expected_events, "diagnostics")
    if "error" in expect:
        if error is None:
            raise AssertionError(f"Expected error {expect['error'].get('code')}, got a response")
        assert isinstance(error, SearchError), repr(error)
        for k, v in expect["error"].items():
            if k == "message":
                actual: Any = str(error)
            elif k == "attempts":
                actual = [a.to_json() for a in error.attempts]
            else:
                actual = getattr(error, python_name(k))
                if k == "field" and isinstance(v, str):
                    v = python_field(v)
            if v is None:
                assert actual is None, f"error.{k}: expected absent, got {actual!r}"
            else:
                assert_json(actual, v, f"error.{k}")
        secret = expect.get("secretAbsent")
        if secret:
            texts = [str(error), repr(error), "".join(traceback.format_exception(type(error), error, error.__traceback__))]
            texts += [repr(error.__dict__), repr(script.requests and None)]
            for text in texts:
                assert secret not in text, "secret leaked"
        return
    if error is not None:
        raise error
    assert result is not None
    if "response" in expect:
        actual_json = result.to_json()
        raw = actual_json.pop("raw")
        assert_json(actual_json, expect["response"], "response")
        last = next((r for r in reversed(responses[: script.next]) if "body" in r), None)
        if last is not None:
            assert_json(raw, last["body"], "raw")
    for k, v in (expect.get("responseIncludes") or {}).items():
        assert_json(result.to_json()[k], v, f"response.{k}")
