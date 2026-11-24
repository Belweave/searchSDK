"""Shared policy: input validation, URL keys, status mapping, retry timing.

Every constant comes from registry/policy.json. Rules: registry/policy.md.
"""

from __future__ import annotations

import datetime
import math
import re
from collections.abc import Mapping, Sequence
from dataclasses import dataclass
from typing import Any, NoReturn

from . import _regex
from ._clock import CancelToken
from ._errors import ErrorCode, SearchError
from ._json import MISSING, get_path, json_equal
from ._registry import POLICY, Registry
from ._steps import FORBIDDEN, ascii_lower, ascii_upper, calendar_date, days_in, epoch_ms, in_ranges, is_blank, trim_blank


def _invalid(field: str) -> NoReturn:
    raise SearchError("invalid_request", field=field)


def _configuration(field: str) -> NoReturn:
    raise SearchError("configuration", field=field)


def _is_surrogate(cp: int) -> bool:
    return 0xD800 <= cp <= 0xDFFF


def normalize_query(query: Any) -> str:
    """Trims blank code points from both ends; rejects blank, forbidden, surrogate and overlong queries."""
    if not isinstance(query, str):
        _invalid("query")
    kept = trim_blank(query)
    if not kept:
        _invalid("query")
    if any(_is_surrogate(ord(c)) or in_ranges(ord(c), FORBIDDEN) for c in kept):
        _invalid("query")
    if len(kept) > POLICY["query"]["maxCodePoints"]:
        _invalid("query")
    return kept


def _integer_in(value: Any, field: str, low: int, high: int) -> int:
    # bool is an int subclass in Python and float 5.0 is not an int: both are refused.
    if isinstance(value, bool) or not isinstance(value, int) or not low <= value <= high:
        _invalid(field)
    return value


_LABEL = POLICY["domains"]["labelPattern"]


def _normalize_domains(value: Any, field: str) -> list[str] | None:
    if value is None:
        return None
    if isinstance(value, str) or not isinstance(value, Sequence):
        _invalid(field)
    out: list[str] = []
    for d in value:
        if not isinstance(d, str):
            _invalid(field)
        host = ascii_lower(d)
        labels = host.split(".")
        if (
            len(host) > POLICY["domains"]["maxLength"]
            or len(labels) < POLICY["domains"]["minLabels"]
            or not all(_regex.test(_LABEL, label) for label in labels)
        ):
            _invalid(field)
        if host not in out:
            out.append(host)
    return out or None


def _date(value: Any, field: str) -> str | None:
    if value is None:
        return None
    if isinstance(value, datetime.date) and not isinstance(value, datetime.datetime):
        value = value.isoformat()
    if not calendar_date(value):
        _invalid(field)
    return str(value)


def _one_of(value: Any, field: str, allowed: Sequence[str]) -> str | None:
    if value is None:
        return None
    if not isinstance(value, str) or value not in allowed:
        _invalid(field)
    return value


_TWO_LETTERS = re.compile("[A-Za-z]{2}")
DEPTHS = ("fast", "standard", "deep")


def normalize_search(query: Any, o: Mapping[str, Any]) -> dict[str, Any]:
    """The normalized search input, keys in the order registry/policy.md gives (it decides which unsupported input is named)."""
    n: dict[str, Any] = {"query": normalize_query(query)}
    limits = POLICY["search"]["maxResults"]
    n["maxResults"] = limits["default"] if o.get("max_results") is None else _integer_in(o["max_results"], "max_results", limits["min"], limits["max"])
    inc = _normalize_domains(o.get("include_domains"), "include_domains")
    exc = _normalize_domains(o.get("exclude_domains"), "exclude_domains")
    if inc and exc and any(d in exc for d in inc):
        _invalid("exclude_domains")
    if inc:
        n["includeDomains"] = inc
    if exc:
        n["excludeDomains"] = exc
    recency = _one_of(o.get("recency"), "recency", tuple(POLICY["search"]["recencyDays"]))
    start = _date(o.get("start_date"), "start_date")
    end = _date(o.get("end_date"), "end_date")
    if recency and (start or end):
        _invalid("recency")
    if start and end and start > end:
        _invalid("end_date")
    if recency:
        n["recency"] = recency
    if start:
        n["startDate"] = start
    if end:
        n["endDate"] = end
    country = o.get("country")
    if country is not None:
        if not isinstance(country, str) or not _TWO_LETTERS.fullmatch(country):
            _invalid("country")
        n["country"] = ascii_upper(country)
    language = o.get("language")
    if language is not None:
        if not isinstance(language, str) or not _TWO_LETTERS.fullmatch(language):
            _invalid("language")
        n["language"] = ascii_lower(language)
    depth = _one_of(o.get("depth"), "depth", DEPTHS)
    if depth:
        n["depth"] = depth
    return n


# ---- URL keys ----

_UNRESERVED = frozenset(b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~")
_ESCAPE = re.compile("%([0-9A-Fa-f]{2})")


def _normalize_escapes(s: str) -> str:
    """Unreserved escapes decoded, other escapes upper-case, non-ASCII as UTF-8 escapes."""
    out: list[str] = []
    i = 0
    while i < len(s):
        m = _ESCAPE.match(s, i)
        if m:
            b = int(m[1], 16)
            out.append(chr(b) if b in _UNRESERVED else f"%{b:02X}")
            i += 3
            continue
        c = s[i]
        if ord(c) < 0x80:
            out.append(c)
        else:
            ch = "\ufffd" if _is_surrogate(ord(c)) else c
            out.extend(f"%{b:02X}" for b in ch.encode("utf-8"))
        i += 1
    return "".join(out)


def _punycode(label: str) -> str:
    """RFC 3492 for one label, without the xn-- prefix and without IDNA mapping."""
    return label.encode("punycode").decode("ascii")


_URL = re.compile("([A-Za-z][A-Za-z0-9+.-]*)://([^/?#]*)([^#]*)", re.DOTALL)
_PORT = re.compile(":([0-9]+)\\Z")


def url_key(url: str) -> str:
    """Comparison key for URLs (registry/policy.md, URL key)."""
    m = _URL.match(url)
    if not m:
        return url
    scheme = m[1].lower()
    authority = m[2]
    port_part = ""
    port = _PORT.search(authority)
    if port:
        authority = authority[: port.start()]
        if not ((scheme == "http" and port[1] == "80") or (scheme == "https" and port[1] == "443")):
            port_part = port[0]
    labels = []
    for label in authority.split("."):
        lower = ascii_lower(label)
        if not lower.isascii():
            lower = "xn--" + _punycode(lower.lower())
        labels.append(lower)
    rest = _normalize_escapes(m[3])
    path, sep, query = rest.partition("?")
    if path == "":
        path = "/"
    elif len(path) > 1 and path.endswith("/"):
        path = path[:-1]
    return f"{scheme}://{'.'.join(labels)}{port_part}{path}{sep}{query}"


_HTTP_AUTHORITY = re.compile("https?://([^/?#]+)", re.IGNORECASE | re.ASCII)


def normalize_urls(urls: Any) -> list[str]:
    items = [urls] if isinstance(urls, str) else urls
    if isinstance(items, (str, bytes)) or not isinstance(items, Sequence) or not 1 <= len(items) <= POLICY["contents"]["maxUrls"]:
        _invalid("urls")
    keys: set[str] = set()
    for u in items:
        if not isinstance(u, str) or len(u) > POLICY["contents"]["maxUrlLength"]:
            _invalid("urls")
        for c in u:
            cp = ord(c)
            if cp <= 0x20 or cp == 0x7F or is_blank(cp) or in_ranges(cp, FORBIDDEN) or _is_surrogate(cp):
                _invalid("urls")
        m = _HTTP_AUTHORITY.match(u)
        if not m or "@" in m[1]:
            _invalid("urls")
        key = url_key(u)
        if key in keys:
            _invalid("urls")
        keys.add(key)
    return list(items)


# ---- Call settings and the provider chain ----


@dataclass(frozen=True)
class CallSettings:
    timeout_ms: int
    attempt_timeout_ms: int
    max_retries: int
    max_response_bytes: int
    cancel: CancelToken | None


def call_settings(kind: str, o: Mapping[str, Any], c: Mapping[str, Any]) -> CallSettings:
    def pick(k: str) -> Any:
        return o[k] if o.get(k) is not None else c.get(k)

    t, b = POLICY["timeouts"], POLICY["responseBytes"]
    timeout = t["defaultMs"] if pick("timeout_ms") is None else _integer_in(pick("timeout_ms"), "timeout_ms", t["minMs"], t["maxMs"])
    attempt = timeout if pick("attempt_timeout_ms") is None else _integer_in(pick("attempt_timeout_ms"), "attempt_timeout_ms", t["minMs"], t["maxMs"])
    retries = (
        POLICY["retry"]["defaultMaxRetries"]
        if pick("max_retries") is None
        else _integer_in(pick("max_retries"), "max_retries", 0, POLICY["retry"]["maxRetries"])
    )
    limit = b[kind] if pick("max_response_bytes") is None else _integer_in(pick("max_response_bytes"), "max_response_bytes", b["min"], b["max"])
    cancel = o.get("cancel")
    if cancel is not None and not isinstance(cancel, CancelToken):
        _invalid("cancel")
    return CallSettings(timeout, attempt, retries, limit, cancel)


def provider_chain(registry: Registry, o: Mapping[str, Any], c: Mapping[str, Any]) -> list[str]:
    primary = o.get("provider") if o.get("provider") is not None else c.get("provider")
    if not isinstance(primary, str) or primary not in registry:
        _configuration("provider")
    fallback = o.get("fallback") if o.get("fallback") is not None else c.get("fallback")
    if fallback is None:
        fallback = ()
    if isinstance(fallback, str) or not isinstance(fallback, Sequence) or not all(isinstance(i, str) and i in registry for i in fallback):
        _configuration("fallback")
    return list(dict.fromkeys([primary, *fallback]))  # a provider is tried once


def status_code(registry: Registry, provider: str, status: int, body: Any) -> ErrorCode:
    """Provider rules first (bodyPath rules compare with JSON equality), then policy.status, then statusDefault."""
    for rule in registry[provider]["errors"]:
        if rule["status"] != status:
            continue
        if "bodyPath" not in rule:
            code: ErrorCode = rule["code"]
            return code
        v = get_path(body, rule["bodyPath"])
        if v is not MISSING and json_equal(v, rule.get("equals", MISSING)):
            matched: ErrorCode = rule["code"]
            return matched
    for rule in POLICY["status"]:
        if ("status" in rule and rule["status"] == status) or ("range" in rule and rule["range"][0] <= status <= rule["range"][1]):
            mapped: ErrorCode = rule["code"]
            return mapped
    default: ErrorCode = POLICY["statusDefault"]
    return default


_MONTHS = ("Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec")
_IMF = re.compile(
    "(Mon|Tue|Wed|Thu|Fri|Sat|Sun), ([0-9]{2}) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) ([0-9]{4}) ([0-9]{2}):([0-9]{2}):([0-9]{2}) GMT"
)
_DELTA = re.compile("[0-9]{1,9}")


def retry_after_ms(header: str | None, now: int) -> int | None:
    """Retry-After as delta-seconds or an IMF-fixdate naming a real date and time. Anything else is ignored."""
    if header is None:
        return None
    v = header.strip(" \t")
    if _DELTA.fullmatch(v):
        return int(v) * 1000
    m = _IMF.fullmatch(v)
    if not m:
        return None
    y, mo, d, h, mi, s = int(m[4]), _MONTHS.index(m[3]) + 1, int(m[2]), int(m[5]), int(m[6]), int(m[7])
    if y < 1 or not 1 <= d <= days_in(y, mo) or h > 23 or mi > 59 or s > 59:
        return None
    return max(0, epoch_ms(y, mo, d, h, mi, s) - now)


def backoff_ms(retry_index: int, random: float, retry_after: int | None) -> int:
    """Equal-jitter exponential backoff; never shorter than Retry-After."""
    r = POLICY["retry"]
    exp: int = min(r["maxDelayMs"], r["baseDelayMs"] * 2**retry_index)
    delay = math.floor(exp / 2 + random * (exp / 2))
    return max(delay, retry_after or 0)


def is_transient(code: str) -> bool:
    return code in POLICY["transient"]


def falls_back(code: str) -> bool:
    return code in POLICY["fallbackOn"]


MAX_RETRY_AFTER_MS: int = POLICY["retry"]["maxRetryAfterMs"]

