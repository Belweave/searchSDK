from __future__ import annotations
import math
import re
from datetime import datetime
from typing import Any, Mapping
from urllib.parse import urlsplit
from .errors import CODES, SearchError
from .models import (
    Capabilities,
    Provenance,
    ProviderResponse,
    SearchAttempt,
    SearchRequest,
    SearchResponse,
    SearchResult,
    SearchUsage,
    SearchWarning,
)

_ID = re.compile(r"[a-zA-Z0-9_-]{1,64}\Z")
_LABEL = re.compile(r"[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\Z", re.I | re.A)


def obj(v: Any) -> dict:
    if not isinstance(v, dict):
        raise SearchError("invalid_response")
    return v


def rows(v: Any) -> list:
    if not isinstance(v, list):
        raise SearchError("invalid_response")
    return v


def string(v: Any) -> str | None:
    if v is not None and not isinstance(v, str):
        raise SearchError("invalid_response")
    return v


def number(v: Any) -> float | None:
    if v is not None:
        try:
            if type(v) not in (int, float) or not math.isfinite(v):
                raise ValueError()
        except (ValueError, OverflowError):
            raise SearchError("invalid_response") from None
    return v


def strings(v: Any) -> tuple[str, ...] | None:
    if v is None:
        return None
    if not isinstance(v, list) or any(not isinstance(s, str) for s in v):
        raise SearchError("invalid_response")
    return tuple(v)


def identifier(v: Any) -> str:
    if not isinstance(v, str) or not _ID.fullmatch(v):
        raise SearchError("invalid_response")
    return v


def request_id(v: Any) -> str | None:
    v = string(v)
    if v is not None and not re.fullmatch(r"[a-zA-Z0-9_.:/-]{1,256}", v):
        raise SearchError("invalid_response")
    return v


def timestamp(v: Any) -> str:
    if not isinstance(v, str):
        raise SearchError("invalid_response")
    try:
        dt = datetime.fromisoformat(v.replace("Z", "+00:00"))
        if dt.tzinfo is None:
            raise ValueError()
    except (ValueError, OverflowError):
        raise SearchError("invalid_response") from None
    return v


def url(v: Any, *, endpoint: bool = False) -> str:
    code = "configuration" if endpoint else "invalid_response"
    try:
        if not isinstance(v, str) or re.search(r"[\s\x00-\x20\x7f-\x9f\\]", v):
            raise ValueError()
        p = urlsplit(v)
        if (
            p.scheme.lower() not in (("https",) if endpoint else ("http", "https"))
            or not p.hostname
            or p.username is not None
            or p.password is not None
        ):
            raise ValueError()
        if not re.match(r"https?://[^/\\]", v, re.I) or p.port == 0:
            raise ValueError()
        if endpoint and ("?" in v or "#" in v):
            raise ValueError()
    except (ValueError, TypeError):
        raise SearchError(code) from None
    return v


def positive(v: Any, maximum: int = 2_147_483_647, code: str = "configuration") -> int:
    if type(v) is not int or not 1 <= v <= maximum:
        raise SearchError(code)
    return v


def credential(v: Any) -> str:
    if not isinstance(v, str) or not re.fullmatch(r"[\x21-\x7e]+", v):
        raise SearchError("configuration")
    return v


def validate_request(v: SearchRequest | Mapping[str, Any] | str) -> SearchRequest:
    if isinstance(v, str):
        v = {"query": v}
    if isinstance(v, SearchRequest):
        positive(v.limit, 20, "invalid_request")
        v = v.to_dict()
    if not isinstance(v, Mapping) or set(v) - {
        "query",
        "limit",
        "includeDomains",
        "excludeDomains",
    }:
        raise SearchError("invalid_request")
    q, n = v.get("query"), v.get("limit", 5)
    if not isinstance(q, str) or not q.strip():
        raise SearchError("invalid_request")
    positive(n, 20, "invalid_request")

    def domains(key: str) -> tuple[str, ...] | None:
        if key not in v:
            return None
        values = v[key]
        if not isinstance(values, (list, tuple)) or not values:
            raise SearchError("invalid_request")
        for d in values:
            if (
                not isinstance(d, str)
                or len(d) > 253
                or len(d.split(".")) < 2
                or any(not _LABEL.fullmatch(label) for label in d.split("."))
            ):
                raise SearchError("invalid_request")
        return tuple(dict.fromkeys(d.lower() for d in values))

    include, exclude = domains("includeDomains"), domains("excludeDomains")
    if set(include or ()) & set(exclude or ()):
        raise SearchError("invalid_request")
    return SearchRequest(q, n, include, exclude)


def check_capabilities(c: Capabilities, r: SearchRequest) -> None:
    if (
        (r.include_domains or r.exclude_domains)
        and not c.domain_filters
        or len(r.include_domains or ()) > c.max_include_domains
        or len(r.exclude_domains or ()) > c.max_exclude_domains
        or c.mutually_exclusive_domain_filters
        and r.include_domains
        and r.exclude_domains
        or c.max_query_length
        and len(r.query.encode("utf-16-le", errors="surrogatepass")) // 2 > c.max_query_length
    ):
        raise SearchError("unsupported_option")


def validate_response(value: Any, *, gateway: bool = False) -> ProviderResponse | SearchResponse:
    if isinstance(value, ProviderResponse):
        value = value.to_dict()
    v = obj(value)
    results = []
    for row in rows(v.get("results")):
        r = obj(row)
        p = obj(r.get("provenance"))
        results.append(
            SearchResult(
                url(r.get("url")),
                Provenance(
                    identifier(p.get("provider")),
                    url(p.get("sourceUrl")),
                    timestamp(p.get("retrievedAt")),
                    request_id(p.get("requestId")),
                ),
                string(r.get("title")),
                string(r.get("snippet")),
                strings(r.get("highlights")),
                number(r.get("score")),
            )
        )
    usage = None
    if "usage" not in v:
        raise SearchError("invalid_response")
    if v["usage"] is not None:
        u = obj(v["usage"])
        amount = number(u.get("value"))
        if u.get("unit") not in ("usd", "credits") or amount is None or amount < 0:
            raise SearchError("invalid_response")
        usage = SearchUsage(u["unit"], amount)
    warnings = []
    for row in rows(v.get("warnings")):
        w = obj(row)
        if w.get("code") not in ("fallback_used", "provider_warning"):
            raise SearchError("invalid_response")
        warnings.append(SearchWarning(w["code"], identifier(w.get("provider"))))
    if not gateway:
        return ProviderResponse(tuple(results), usage, tuple(warnings))
    reuse = v.get("reuse")
    if "reuse" in v and reuse not in ("cache", "inflight"):
        raise SearchError("invalid_response")
    return SearchResponse(
        tuple(results),
        usage,
        tuple(warnings),
        identifier(v.get("provider")),
        validate_attempts(v.get("attempts")),
        reuse,
    )


def validate_attempts(value: Any) -> tuple[SearchAttempt, ...]:
    result = []
    for item in rows(value):
        a = obj(item)
        duration = number(a.get("durationMs"))
        status = a.get("status")
        delay = number(a.get("retryAfterMs"))
        if (
            duration is None
            or duration < 0
            or a.get("outcome") not in ("success", "error")
            or ("code" in a and a["code"] not in CODES)
            or (status is not None and (type(status) is not int or not 100 <= status <= 599))
            or (delay is not None and delay < 0)
        ):
            raise SearchError("invalid_response")
        if a["outcome"] == "error" and a.get("code") not in CODES:
            raise SearchError("invalid_response")
        result.append(
            SearchAttempt(
                identifier(a.get("provider")),
                timestamp(a.get("startedAt")),
                duration,
                a["outcome"],
                a.get("code"),
                status,
                delay,
            )
        )
    return tuple(result)
