"""The opt-in diagnostics hook's event parts (registry/policy.md, Diagnostics):
a redacted request, the raw response bounded and redacted, and how the spec's
paths resolved. Nothing here changes a call's outcome."""

from __future__ import annotations

from collections.abc import Mapping, Sequence
from typing import Any

from ._engine import Headers, HttpRequest, Kind, encode
from ._json import MISSING, all_hold, get_path, is_array
from ._registry import POLICY
from ._types import DiagnosticsRequest, DiagnosticsResponse, PathReport

REDACTED: str = POLICY["diagnostics"]["redacted"]
MAX_BODY_BYTES: int = POLICY["diagnostics"]["maxBodyBytes"]
_SEARCH_FIELDS = ("url", "title", "excerpts", "publishedAt", "author")
_PAGE_FIELDS = ("url", "finalUrl", "title", "content", "publishedAt", "author", "errorCode", "errorMessage")


def _present(v: Any) -> bool:
    return v is not MISSING and v is not None


def _path_of(f: Any) -> str:
    return f if isinstance(f, str) else str(f["path"])


def path_report(spec: Mapping[str, Any], kind: Kind, body: Any) -> list[PathReport]:
    """Which spec paths a 2xx body resolved. Empty unless the body is a JSON object."""
    out: list[PathReport] = []
    if not isinstance(body, Mapping):
        return out

    def listed(role: str, path: str, value: Any) -> None:
        found = 1 if is_array(value) else 0
        out.append(PathReport(role, path, found, 1 - found))

    def count(role: str, path: str, items: Sequence[Any]) -> None:
        found = sum(1 for item in items if _present(get_path(item, path)))
        out.append(PathReport(role, path, found, len(items) - found))

    if kind == "search":
        response = spec["search"]["response"]
        rows = get_path(body, response["results"])
        listed("results", response["results"], rows)
        items: Sequence[Any] = rows if is_array(rows) else ()
        for name in _SEARCH_FIELDS:
            if name in response["fields"]:
                count(name, _path_of(response["fields"][name]), items)
        for name, f in (response.get("providerFields") or {}).items():
            count(f"providerFields.{name}", _path_of(f), items)
    else:
        for i, source in enumerate(spec["contents"]["response"]["pages"]):
            value: Any = [body] if source["from"] == "$" else get_path(body, source["from"])
            listed(f"pages.{i}", source["from"], value)
            items = list(value) if is_array(value) else []
            where = source.get("where")
            if where:
                passed = [item for item in items if all_hold(item, where)]
                out.append(PathReport(f"pages.{i}.where", ",".join(p["path"] for p in where), len(passed), len(items) - len(passed)))
                items = passed
            for name in _PAGE_FIELDS:
                if name in source["fields"]:
                    count(f"pages.{i}.{name}", _path_of(source["fields"][name]), items)
    ep = spec[kind]
    reported = (ep.get("cost") or {}).get("reported")
    if reported:
        count("cost", reported["path"], [body])
    for rule in ep["response"].get("requestId") or ():
        if "path" in rule:
            count("requestId", rule["path"], [body])
    return out


def redacted_request(spec: Mapping[str, Any], request: HttpRequest, key: str) -> DiagnosticsRequest:
    """The request as sent, with the key header's value or the query key's value replaced."""
    auth = spec["auth"]
    auth_header = auth["name"].lower() if auth["in"] == "header" else None
    headers = {name.lower(): (REDACTED if name.lower() == auth_header else value) for name, value in request.headers.items()}
    url = request.url
    tail = f"={encode(key)}"
    if auth["in"] == "query" and url.endswith(tail):
        url = f"{url[: len(url) - len(tail)]}={REDACTED}"
    body = None if request.body is None else request.body.decode("utf-8")
    return DiagnosticsRequest(request.method, url, headers, body)


def response_record(status: int, headers: Headers, data: bytes | None, key: str) -> DiagnosticsResponse:
    """The response as received: headers normalized, the body decoded, key-redacted and cut at a character boundary."""
    joined: dict[str, list[str]] = {}
    for name, value in headers:
        lower = name.lower()
        if lower != "set-cookie":
            joined.setdefault(lower, []).append(value)
    h = {name: ", ".join(joined[name]).replace(key, REDACTED) for name in sorted(joined)}
    if data is None:
        return DiagnosticsResponse(status, h, None, None, False)
    text = data.decode("utf-8", errors="replace").replace(key, REDACTED)  # "utf-8", not "utf-8-sig": a BOM is kept
    encoded = text.encode("utf-8")
    if len(encoded) <= MAX_BODY_BYTES:
        return DiagnosticsResponse(status, h, text, len(data), False)
    cut = MAX_BODY_BYTES
    while cut > 0 and encoded[cut] & 0xC0 == 0x80:  # never split a character
        cut -= 1
    return DiagnosticsResponse(status, h, encoded[:cut].decode("utf-8"), len(data), True)
