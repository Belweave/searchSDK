"""Fixed-host native clients derived from retained public schemas.

Native payloads preserve provider field names and unknown fields. Schemas are
available for inspection; responses are not asserted to satisfy JSON Schema.
"""

from __future__ import annotations
import asyncio
import codecs
import copy
import json
import math
import re
import secrets
import threading
import time
from dataclasses import dataclass, field
from functools import partial
from importlib.resources import files
from types import MappingProxyType
from typing import Any, AsyncIterator, Generic, Iterator, Mapping, TypeVar, cast
from urllib.parse import quote, urlencode
from .client import RetryPolicy
from .errors import SearchError, TRANSIENT, status_code
from .transport import (
    DEFAULT_LIMIT,
    BoundedRunner,
    CallContext,
    CancellationToken,
    HttpRequest,
    Transport,
    async_call,
    context_for,
    decoded_chunks,
    encode_json,
    headers as response_headers,
    https_transport,
    parse_json,
    read_bytes,
    retry_after,
    send,
    safe_close,
)
from .validation import credential, positive, request_id

T = TypeVar("T")

_CATALOG: dict | None = None
_CATALOG_LOCK = threading.Lock()


def _catalog() -> dict:
    global _CATALOG
    with _CATALOG_LOCK:
        if _CATALOG is None:
            _CATALOG = json.loads(
                files("searchsdk").joinpath("catalog.json").read_text(encoding="utf-8")
            )
        return _CATALOG


def _snake(name: str) -> str:
    return re.sub(r"(?<!^)(?=[A-Z])", "_", name).lower()


class UnsetType:
    """Distinguishes an omitted JSON body from an explicitly supplied JSON null."""

    __slots__ = ()

    def __repr__(self) -> str:
        return "UNSET"


UNSET = UnsetType()


@dataclass(frozen=True)
class NativeAttempt:
    attempt: int
    duration_ms: float
    outcome: str
    status: int | None = None
    code: str | None = None


@dataclass(frozen=True)
class NativeMetadata:
    provider: str
    operation: str
    status: int
    request_id: str | None
    attempts: tuple[NativeAttempt, ...]


@dataclass(frozen=True, repr=False)
class RawResponse:
    status: int
    headers: Mapping[str, str] = field(repr=False)
    body: bytes = field(repr=False)

    def __repr__(self) -> str:
        return f"RawResponse(status={self.status!r}, body=<redacted>)"


@dataclass(frozen=True, repr=False)
class NativeResponse(Generic[T]):
    data: T = field(repr=False)
    metadata: NativeMetadata

    def __repr__(self) -> str:
        return f"NativeResponse(metadata={self.metadata!r}, data=<redacted>)"


@dataclass(frozen=True)
class SSEEvent:
    data: str
    event: str | None = None
    id: str | None = None
    retry: int | None = None


@dataclass(frozen=True, repr=False)
class NativeFile:
    """A multipart file, entirely caller-owned bytes. No filesystem paths are opened."""

    filename: str
    content: bytes
    content_type: str = "application/octet-stream"


@dataclass(frozen=True, repr=False)
class MultipartBody:
    fields: Mapping[str, str | bytes | NativeFile | list[str | bytes | NativeFile]]


def _multipart(
    body: MultipartBody, extra: Mapping[str, str] | None = None, *, maximum: int = DEFAULT_LIMIT
) -> tuple[bytes, str]:
    if not isinstance(body.fields, Mapping):
        raise SearchError("invalid_request")
    values = dict(body.fields)
    if extra:
        if set(values) & set(extra):
            raise SearchError("invalid_request")
        values.update(extra)
    boundary = "searchsdk-" + secrets.token_hex(24)
    output: list[bytes] = []
    total = 0

    def token(s: Any) -> str:
        if not isinstance(s, str) or not s or re.search(r'[\x00-\x1f\x7f"\\]', s):
            raise SearchError("invalid_request")
        return s

    for name, entries in values.items():
        name = token(name)
        for value in entries if isinstance(entries, list) else [entries]:
            disposition = f'Content-Disposition: form-data; name="{name}"'
            if isinstance(value, NativeFile):
                disposition += f'; filename="{token(value.filename)}"'
                content_type = token(value.content_type)
                if not isinstance(value.content, bytes):
                    raise SearchError("invalid_request")
                data = value.content
                disposition += "\r\nContent-Type: " + content_type
            elif isinstance(value, str):
                data = value.encode("utf-8")
            elif isinstance(value, bytes):
                data = value
            else:
                raise SearchError("invalid_request")
            header = ("--" + boundary + "\r\n" + disposition + "\r\n\r\n").encode()
            total += len(header) + len(data) + 2
            if total > maximum:
                raise SearchError("invalid_request")
            output.extend([header, data, b"\r\n"])
    output.append(("--" + boundary + "--\r\n").encode())
    if sum(map(len, output)) > maximum:
        raise SearchError("invalid_request")
    return b"".join(output), "multipart/form-data; boundary=" + boundary


def _sse_parse(chunks: Iterator[bytes]) -> Iterator[SSEEvent]:
    decoder = codecs.getincrementaldecoder("utf-8-sig")("replace")
    pending: list[str] = []
    fragments: list[str] = []

    def append(fragment: str) -> None:
        if fragment:
            pending.append(fragment)
        if len(pending) >= 1024:
            fragments.append("".join(pending))
            pending.clear()

    data: list[str] = []
    event = None
    last_id = None
    retry = None
    skip_lf = False

    def line(value: str) -> SSEEvent | None:
        nonlocal data, event, last_id, retry
        if value == "":
            output = SSEEvent("\n".join(data), event or None, last_id, retry) if data else None
            data = []
            event = None
            retry = None
            return output
        if value.startswith(":"):
            return None
        name, colon, value = value.partition(":")
        if not colon:
            value = ""
        if value.startswith(" "):
            value = value[1:]
        if name == "data":
            data.append(value)
        elif name == "event":
            event = value
        elif name == "id" and "\0" not in value:
            last_id = value
        elif name == "retry" and re.fullmatch(r"[0-9]{1,16}", value) and int(value) <= 2**53 - 1:
            retry = int(value)
        return None

    for chunk in chunks:
        text = decoder.decode(chunk)
        start = 0
        for index, char in enumerate(text):
            if skip_lf:
                skip_lf = False
                if char == "\n":
                    start = index + 1
                    continue
            if char not in "\r\n":
                continue
            append(text[start:index])
            output = line("".join(fragments) + "".join(pending))
            fragments.clear()
            pending.clear()
            skip_lf = char == "\r"
            start = index + 1
            if output is not None:
                yield output
        if start < len(text):
            append(text[start:])
    # SSE discards an unterminated final event. Decoded replacement tail is also incomplete.
    decoder.decode(b"", final=True)


class SSEStream(Iterator[SSEEvent]):
    """Single-consumer, deadline-bounded SSE iterator; use with/close on early exit.

    The same object implements asynchronous iteration without blocking the loop.
    No reconnection or implicit event JSON parsing is performed.
    """

    def __init__(
        self, response, context: CallContext, runner: BoundedRunner, maximum: int, finish
    ) -> None:
        self._context, self._runner, self._finish = context, runner, finish
        self._iterator = _sse_parse(decoded_chunks(response, context, maximum))
        self._closed = False
        self._terminal: SearchError | None = None
        self._lock = threading.Lock()
        self._reading = threading.Lock()
        self._timer = threading.Timer(context.remaining, self._expire)
        self._timer.daemon = True
        self._timer.start()
        context.on_close(self.close)

    def _expire(self) -> None:
        self._terminal = SearchError("timeout")
        self.close()

    def close(self) -> None:
        with self._lock:
            if self._closed:
                return
            self._closed = True
        self._timer.cancel()
        self._context.close()
        self._finish()

    def __iter__(self) -> SSEStream:
        return self

    def __next__(self) -> SSEEvent:
        if self._terminal:
            raise self._terminal
        if self._closed:
            token = self._context.cancellation
            if token is not None and token.cancelled:
                raise SearchError("aborted")
            if self._context.remaining <= 0:
                raise SearchError("timeout")
            raise StopIteration
        if not self._reading.acquire(blocking=False):
            raise SearchError("invalid_request")
        sentinel = object()
        try:
            value = self._runner.run(lambda: next(self._iterator, sentinel), self._context)
            if value is sentinel:
                self.close()
                raise StopIteration
            return cast(SSEEvent, value)
        except SearchError:
            self.close()
            raise
        finally:
            self._reading.release()

    def __enter__(self) -> SSEStream:
        return self

    def __exit__(self, *args: Any) -> None:
        self.close()

    def __aiter__(self) -> AsyncIterator[SSEEvent]:
        return self

    async def __anext__(self) -> SSEEvent:
        sentinel = object()
        try:
            value = await asyncio.to_thread(lambda: next(self, sentinel))
        except asyncio.CancelledError:
            self.close()
            raise
        if value is sentinel:
            raise StopAsyncIteration
        return cast(SSEEvent, value)

    async def __aenter__(self) -> SSEStream:
        return self

    async def __aexit__(self, *args: Any) -> None:
        self.close()


class NativeClient:
    def __init__(
        self,
        provider: str,
        api_key: str | None = None,
        *,
        team_api_key: str | None = None,
        access_mode: str = "keyed",
        transport: Transport | None = None,
        timeout_ms: int = 10000,
        max_response_bytes: int = DEFAULT_LIMIT,
        max_request_bytes: int = DEFAULT_LIMIT,
        max_concurrency: int = 4,
        retry: RetryPolicy | None = None,
    ) -> None:
        ops = [e for e in _catalog()["operations"] if e["provider"] == provider]
        if (
            not ops
            or transport is not None
            and not callable(transport)
            or retry is not None
            and not isinstance(retry, RetryPolicy)
        ):
            raise SearchError("configuration")
        if (
            access_mode not in ("keyed", "keyless")
            or access_mode == "keyless"
            and provider != "tavily"
            or team_api_key is not None
            and provider != "exa"
        ):
            raise SearchError("configuration")
        self.provider = provider
        self._key = None if api_key is None and access_mode == "keyless" else credential(api_key)
        self._team_key = credential(team_api_key) if team_api_key is not None else None
        self._transport = transport or https_transport
        self._timeout = positive(timeout_ms)
        self._maximum = positive(max_response_bytes)
        self._request_maximum = positive(max_request_bytes)
        self._runner = BoundedRunner(max_concurrency)
        self._slots = threading.BoundedSemaphore(positive(max_concurrency, 64))
        self._retry = retry or RetryPolicy()
        self._ops = {e["name"]: e for e in ops}
        self._names = {_snake(e["name"]): e["name"] for e in ops}

    def __repr__(self) -> str:
        return f"NativeClient({self.provider!r})"

    @property
    def operations(self) -> Mapping[str, Mapping[str, Any]]:
        return MappingProxyType(
            {name: MappingProxyType(copy.deepcopy(e)) for name, e in self._ops.items()}
        )

    def schema(self, operation: str) -> dict:
        e = self._operation(operation)
        return {
            "operation": copy.deepcopy(e),
            "document": copy.deepcopy(_catalog()["documents"].get(e.get("document"), {})),
        }

    def _operation(self, operation: str) -> dict:
        if not isinstance(operation, str):
            raise SearchError("unsupported_option")
        e = self._ops.get(self._names.get(operation, operation))
        if e is None or not e["supported"]:
            raise SearchError("unsupported_option")
        return e

    def __getattr__(self, name: str):
        if name.startswith("_"):
            raise AttributeError(name)
        if name in self._names or name in self._ops:
            return partial(self.request, self._names.get(name, name))
        raise AttributeError(name)

    def _prepare(
        self,
        e: dict,
        path: Mapping | None,
        query: Mapping | None,
        body: Any,
        raw_body: bytes | MultipartBody | None,
        extra_headers: Mapping | None,
    ) -> HttpRequest:
        if any(v is not None and not isinstance(v, Mapping) for v in (path, query, extra_headers)):
            raise SearchError("invalid_request")
        path, query = dict(path or {}), dict(query or {})
        provider, name = self.provider, e["name"]
        p = e["path"]
        expected = set(re.findall(r"\{([a-zA-Z][a-zA-Z0-9_]*)\}", p))
        if set(path) != expected:
            raise SearchError("invalid_request")

        def scalar(v: Any) -> str:
            if isinstance(v, str):
                return v
            if type(v) in (int, float):
                try:
                    if math.isfinite(v):
                        return str(v)
                except OverflowError:
                    pass
            if type(v) is bool:
                return "true" if v else "false"
            raise SearchError("invalid_request")

        for key, value in path.items():
            if type(value) is bool:
                raise SearchError("invalid_request")
            text = scalar(value)
            if not text or text in (".", "..") or re.fullmatch(r"(?:\.|%2e){1,2}", text, re.I):
                raise SearchError("invalid_request")
            p = p.replace("{" + key + "}", quote(text, safe=""))
        if (
            body is not UNSET
            and raw_body is not None
            or e.get("bodyRequired")
            and body is UNSET
            and raw_body is None
        ):
            raise SearchError("invalid_request")
        if (
            body is not UNSET
            and e.get("bodySchema") is not None
            and provider in {"exa", "tavily", "brave", "context", "tinyfish"}
            and not isinstance(body, dict)
        ):
            raise SearchError("invalid_request")
        if e.get("raw") and raw_body is None:
            raise SearchError("invalid_request")
        if body is not UNSET and e["method"] in ("GET", "HEAD"):
            raise SearchError("invalid_request")
        h: dict[str, str] = {}
        no_key = e.get("supplemental")
        if not no_key and provider != "serpapi":
            key = self._team_key if "admin-api.exa.ai" in e["base"] else self._key
            if key is None:
                if provider != "tavily" or name not in ("search", "extract"):
                    raise SearchError("configuration")
                h["X-Tavily-Access-Mode"] = "keyless"
            else:
                auth = {
                    "exa": "x-api-key",
                    "brave": "X-Subscription-Token",
                    "tinyfish": "X-API-Key",
                    "parallel": "x-api-key",
                    "you": "X-API-Key",
                    "serper": "X-API-Key",
                    "wondersearch": "X-API-Key",
                }.get(provider, "Authorization")
                h[auth] = "Bearer " + key if auth == "Authorization" else key
        protected = {k.lower() for k in h} | {
            "authorization",
            "x-api-key",
            "x-subscription-token",
            "host",
            "cookie",
            "connection",
            "content-length",
            "transfer-encoding",
        }
        h.update(e.get("headers", {}))
        for k, v in (extra_headers or {}).items():
            if v is None:
                continue
            if (
                not isinstance(k, str)
                or not re.fullmatch(r"[!#$%&'*+.^_`|~0-9a-zA-Z-]+", k)
                or k.lower() in protected
                or not isinstance(v, str)
                or re.search(r"[\r\n\x00]", v)
            ):
                raise SearchError("invalid_request")
            for existing in list(h):
                if existing.lower() == k.lower():
                    del h[existing]
            h[k] = v
        if provider == "serpapi":
            if (
                "api_key" in query
                or "output" in query
                or query.get("async")
                and query.get("no_cache")
            ):
                raise SearchError("invalid_request")
            if name in ("google", "extract", "extractMarkdown"):
                if (
                    not isinstance(query.get("q" if name == "google" else "url"), str)
                    or not query["q" if name == "google" else "url"].strip()
                ):
                    raise SearchError("invalid_request")
                query["engine"] = "google" if name == "google" else "extract"
            if name.startswith("search") and (
                not isinstance(query.get("engine"), str) or not query["engine"].strip()
            ):
                raise SearchError("invalid_request")
            if name != "locations" and name != "uploadImage":
                query["api_key"] = self._key
        if provider == "serper" and e["method"] == "GET":
            if "apiKey" in query:
                raise SearchError("invalid_request")
            query["apiKey"] = self._key
        if e.get("supplemental") and name in ("logoUrl", "headLogo"):
            if (
                set(query) - {"publicClientId", "domain", "theme", "type"}
                or any(
                    not isinstance(query.get(k), str) or not query[k].strip()
                    for k in ("publicClientId", "domain")
                )
                or "theme" in query
                and query["theme"] not in ("light", "dark")
                or "type" in query
                and query["type"] not in ("icon", "wordmark")
            ):
                raise SearchError("invalid_request")
        if e.get("streamField"):
            if body is UNSET:
                body = {}
            if not isinstance(body, dict):
                raise SearchError("invalid_request")
            if "stream" in body and body["stream"] is not e["streamValue"]:
                raise SearchError("unsupported_option")
            if e.get("setStreamField"):
                body = {**body, "stream": e["streamValue"]}
        if (
            provider == "exa"
            and name == "searchStream"
            and (not isinstance(body, dict) or not body.get("outputSchema"))
        ):
            raise SearchError("invalid_request")
        for par in e.get("parameters", []):
            if par.get("required"):
                location = par.get("in")
                key = par["name"]
                supplied = (
                    path
                    if location == "path"
                    else query
                    if location == "query"
                    else {k.lower(): v for k, v in h.items()}
                    if location == "header"
                    else {}
                )
                if location == "header":
                    key = key.lower()
                if key not in supplied or supplied[key] is None:
                    raise SearchError("invalid_request")
        pairs = []
        for key, value in query.items():
            if not isinstance(key, str):
                raise SearchError("invalid_request")
            if value is None:
                continue
            if isinstance(value, Mapping):
                for child, val in value.items():
                    if not isinstance(child, str):
                        raise SearchError("invalid_request")
                    if val is not None:
                        pairs.append((key + "[" + child + "]", scalar(val)))
            elif isinstance(value, (tuple, list)):
                vs = [scalar(v) for v in value]
                if key in e.get("commaQuery", []):
                    pairs.append((key, ",".join(vs)))
                else:
                    pairs.extend((key, v) for v in vs)
            else:
                pairs.append((key, scalar(value)))
        endpoint = e["base"] + p + (("?" + urlencode(pairs)) if pairs else "")
        payload = None
        if isinstance(raw_body, MultipartBody):
            if not e.get("multipart"):
                raise SearchError("unsupported_option")
            if provider == "serpapi" and "image" not in raw_body.fields:
                raise SearchError("invalid_request")
            payload, content_type = _multipart(
                raw_body,
                {"api_key": cast(str, self._key)} if provider == "serpapi" else None,
                maximum=self._request_maximum,
            )
            for key in list(h):
                if key.lower() == "content-type":
                    del h[key]
            h["Content-Type"] = content_type
        elif raw_body is not None:
            if not isinstance(raw_body, bytes) or e.get("multipart"):
                raise SearchError("invalid_request")
            payload = raw_body
        elif body is not UNSET:
            if e.get("multipart"):
                raise SearchError("invalid_request")
            payload = encode_json(body)
            h.setdefault("Content-Type", "application/json")
        elif e.get("multipart"):
            raise SearchError("invalid_request")
        if payload is not None and len(payload) > self._request_maximum:
            raise SearchError("invalid_request")
        if e["response"] == "sse":
            h["Accept"] = "text/event-stream"
        else:
            h.setdefault("Accept", "application/json" if e["response"] == "json" else "*/*")
        return HttpRequest(e["method"], endpoint, h, payload)

    def request(
        self,
        operation: str,
        *,
        path: Mapping | None = None,
        query: Mapping | None = None,
        body: Any = UNSET,
        raw_body: bytes | MultipartBody | None = None,
        headers: Mapping[str, str] | None = None,
        timeout_ms: int | None = None,
        cancellation: CancellationToken | None = None,
    ) -> NativeResponse:
        c = context_for(self._timeout if timeout_ms is None else timeout_ms, cancellation)
        acquired = False
        streaming = False
        attempts: list[NativeAttempt] = []
        try:
            e = self._operation(operation)
            request = self._prepare(e, path, query, body, raw_body, headers)
            if e["response"] == "embedding-url":
                c.check()
                return NativeResponse(
                    request.url, NativeMetadata(self.provider, e["name"], 0, None, ())
                )
            while True:
                c.check()
                if self._slots.acquire(timeout=min(0.01, c.remaining)):
                    acquired = True
                    break
            for index in range(self._retry.max_retries + 1):
                started = time.monotonic()
                status = None

                def execute():
                    nonlocal status
                    response = send(self._transport, request, c)
                    status = response.status
                    meta = response_headers(response)
                    if not 200 <= response.status < 300:
                        safe_close(response)
                        raise SearchError(
                            status_code(response.status),
                            status=response.status,
                            retry_after_ms=retry_after(meta.get("retry-after")),
                        )
                    if e["response"] == "sse":
                        if (
                            meta.get("content-type", "").split(";", 1)[0].strip().lower()
                            != "text/event-stream"
                        ):
                            safe_close(response)
                            raise SearchError("invalid_response")
                        return response, meta
                    payload = read_bytes(response, c, self._maximum)
                    if e["response"] == "json":
                        value = parse_json(payload)
                    elif e["response"] == "bytes":
                        value = payload
                    elif e["response"] == "raw":
                        value = RawResponse(
                            status, MappingProxyType(dict(response.headers)), payload
                        )
                    elif (
                        e["response"] == "empty"
                        or self.provider == "perplexity"
                        and e["name"] == "revokeAuthToken"
                    ):
                        if payload:
                            raise SearchError("invalid_response")
                        value = None
                    else:
                        try:
                            value = payload.decode("utf-8-sig")
                        except UnicodeError:
                            raise SearchError("invalid_response") from None
                    c.check()
                    return value, meta

                try:
                    value, meta = self._runner.run(execute, c)
                    attempts.append(
                        NativeAttempt(
                            index + 1, (time.monotonic() - started) * 1000, "success", status
                        )
                    )
                    rid = meta.get("x-request-id", meta.get("request-id"))
                    try:
                        rid = request_id(rid)
                    except SearchError:
                        rid = None
                    metadata = NativeMetadata(
                        self.provider, e["name"], cast(int, status), rid, tuple(attempts)
                    )
                    if e["response"] == "sse":
                        value = SSEStream(
                            value, c, self._runner, self._maximum, self._slots.release
                        )
                        streaming = True
                    return NativeResponse(value, metadata)
                except SearchError as error:
                    attempts.append(
                        NativeAttempt(
                            index + 1,
                            (time.monotonic() - started) * 1000,
                            "error",
                            error.status or status,
                            error.code,
                        )
                    )
                    if (
                        e.get("retryable")
                        and error.code in TRANSIENT
                        and index < self._retry.max_retries
                    ):
                        c.sleep(self._retry.delay(index, error.retry_after_ms))
                        continue
                    raise SearchError(
                        error.code,
                        status=error.status,
                        retry_after_ms=error.retry_after_ms,
                        attempts=tuple(attempts),
                    ) from None
            raise SearchError("configuration")
        finally:
            if not streaming:
                if acquired:
                    self._slots.release()
                c.close()

    async def request_async(
        self, operation: str, *, cancellation: CancellationToken | None = None, **kwargs: Any
    ) -> NativeResponse:
        result = await async_call(self.request, operation, cancellation=cancellation, **kwargs)
        if isinstance(result.data, SSEStream) and cancellation is not None:
            unsubscribe = cancellation.on_cancel(result.data.close)
            result.data._context.on_close(unsubscribe)
        return result
