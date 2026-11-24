"""The single code path that executes any provider spec: request building,
response mapping and cost. No provider-specific code lives here.
"""

from __future__ import annotations

import re
from collections.abc import Mapping, Sequence
from dataclasses import dataclass
from typing import Any, Literal, NoReturn
from urllib.parse import quote

from ._errors import SearchError
from ._json import (
    MISSING,
    all_hold,
    dumps,
    get_path,
    is_array,
    is_finite_number,
    is_json_value,
    is_number,
    json_equal,
    thaw,
    well_formed,
)
from ._policy import url_key
from ._schema import validate
from ._steps import StepUnsupported, credits_to_usd, has_content, request_price, run_steps, trim_blank
from ._types import Cost, Page, PageError, ResponseWarning, SearchResult

Kind = Literal["search", "contents"]
Headers = Sequence[tuple[str, str]]


@dataclass(frozen=True)
class HttpRequest:
    """One HTTP request. Its repr leaves out headers and the query string, which can hold a key."""

    method: Literal["GET", "POST"]
    url: str
    headers: Mapping[str, str]
    body: bytes | None = None

    def __repr__(self) -> str:
        return f"HttpRequest(method={self.method!r}, url={self.url.split('?')[0]!r})"


def header(headers: Headers, name: str) -> str | None:
    """A header's value, duplicates joined with ', ' as fetch does; None when absent."""
    values = [v for k, v in headers if k.lower() == name]
    return ", ".join(values) if values else None


def input_name(name: str) -> str:
    """The Python spelling of a normalized input (registry names are camelCase): maxResults -> max_results."""
    return re.sub("[A-Z]", lambda m: "_" + m.group(0).lower(), name)


def _unsupported(provider: str, field: str) -> NoReturn:
    raise SearchError("unsupported", provider=provider, field=input_name(field))


def endpoint(spec: Mapping[str, Any], kind: Kind) -> Mapping[str, Any]:
    ep: Mapping[str, Any] | None = spec.get(kind)
    if ep is None:
        _unsupported(spec["id"], kind)
    return ep


# ---- Query strings ----


def js_number(x: int | float) -> str:
    """ECMAScript Number::toString for a finite number."""
    if isinstance(x, int) and abs(x) < 10**21:
        return str(x)
    f = float(x)
    if f == 0:
        return "0"
    sign = "-" if f < 0 else ""
    mantissa, _, exp_text = repr(abs(f)).partition("e")
    whole, _, frac = mantissa.partition(".")
    digits = whole + frac
    point = len(whole) + (int(exp_text) if exp_text else 0)
    stripped = digits.lstrip("0")
    point -= len(digits) - len(stripped)
    digits = stripped.rstrip("0")
    k, n = len(digits), point
    if k <= n <= 21:
        body = digits + "0" * (n - k)
    elif 0 < n <= 21:
        body = digits[:n] + "." + digits[n:]
    elif -6 < n <= 0:
        body = "0." + "0" * (-n) + digits
    else:
        e = n - 1
        body = digits[0] + ("." + digits[1:] if k > 1 else "") + "e" + ("+" if e >= 0 else "-") + str(abs(e))
    return sign + body


def scalar_text(v: Any) -> str | None:
    """A scalar's query-string form: true/false and ECMAScript numbers. Anything else is None."""
    if isinstance(v, str):
        return v
    if isinstance(v, bool):
        return "true" if v else "false"
    if is_finite_number(v):
        return js_number(v)
    return None


def _encode(s: str) -> str:
    """Percent-encodes everything except RFC 3986 unreserved characters; spaces are %20."""
    return quote(s, safe="")


# ---- Requests ----


def _set_path(target: dict[str, Any], path: str, value: Any) -> None:
    """Writes at a dotted path, creating objects on the way and replacing anything on it that is not an object."""
    keys = path.split(".")
    o = target
    for k in keys[:-1]:
        if not isinstance(o.get(k), dict):
            o[k] = {}
        o = o[k]
    o[keys[-1]] = value


def check_limits(spec: Mapping[str, Any], kind: Kind, n: Mapping[str, Any]) -> None:
    """Provider limits for a normalized request; failures are 'unsupported' so a fallback can skip the provider."""
    provider = spec["id"]
    if kind == "search":
        limits = endpoint(spec, "search")["limits"]
        inc, exc = len(n.get("includeDomains") or ()), len(n.get("excludeDomains") or ())
        if n["maxResults"] > limits["maxResults"]:
            _unsupported(provider, "maxResults")
        if limits["maxQueryLength"] is not None and len(n["query"]) > limits["maxQueryLength"]:
            _unsupported(provider, "query")
        if inc > limits["maxIncludeDomains"]:
            _unsupported(provider, "includeDomains")
        if exc > limits["maxExcludeDomains"]:
            _unsupported(provider, "excludeDomains")
        if limits.get("includeExcludeExclusive") and inc > 0 and exc > 0:
            _unsupported(provider, "excludeDomains")
        if "maxTotalDomains" in limits and inc + exc > limits["maxTotalDomains"]:
            _unsupported(provider, "excludeDomains")
    elif len(n["urls"]) > endpoint(spec, "contents")["limits"]["maxUrls"]:
        _unsupported(provider, "urls")


def option_field(provider: str, name: str) -> str:
    return f"provider_options.{provider}.{name}"


def build_request(spec: Mapping[str, Any], kind: Kind, n: Mapping[str, Any], options: Any, key: str, now: int) -> HttpRequest:
    provider: str = spec["id"]
    ep = endpoint(spec, kind)
    request = ep["request"]
    check_limits(spec, kind, n)
    out: dict[str, Any] = thaw(request.get("fixed") or {})
    written: dict[str, str] = {}  # top-level key -> the normalized input that wrote it
    params = request["params"]
    composes = request.get("compose") or ()
    composed = {p["input"] for c in composes for p in c["parts"] if "input" in p}
    for name, value in n.items():
        if value is None or name in params or name in composed or name == "maxResults":
            continue  # maxResults without a param: the runtime truncates instead
        _unsupported(provider, name)

    def step(name: str, value: Any, steps: Any) -> Any:
        try:
            return run_steps(value, steps, "request", now)
        except StepUnsupported:
            _unsupported(provider, name)

    for name, param in params.items():
        if n.get(name) is None:
            continue
        value = step(name, n[name], param.get("steps"))
        if value is None:
            continue
        to = param["to"]
        if param.get("append"):
            prev = get_path(out, to)
            items = list(value) if is_array(value) else [value]
            _set_path(out, to, [*(prev if is_array(prev) else ()), *items])
        else:
            _set_path(out, to, value)
        written[to.split(".")[0]] = name
    for c in composes:
        if not any("input" in p and n.get(p["input"]) is not None for p in c["parts"]):
            continue
        text = ""
        for part in c["parts"]:
            if "input" not in part:
                text += part["text"]
                continue
            name = part["input"]
            if n.get(name) is None:
                if part.get("required"):
                    _unsupported(provider, name)
                continue
            s = scalar_text(step(name, n[name], part.get("steps")))
            if s is None:
                _unsupported(provider, name)
            text += part.get("text", "") + str(s)
        _set_path(out, c["to"], text)
        written[c["to"].split(".")[0]] = next(p["input"] for p in c["parts"] if "input" in p and n.get(p["input"]) is not None)
    if options is not None:
        if not isinstance(options, Mapping):
            raise SearchError("invalid_request", provider=provider, field=f"provider_options.{provider}")
        declared = ep["providerOptions"]
        for name, value in options.items():
            field = option_field(provider, str(name))
            schema = declared.get(name) if isinstance(name, str) else None
            query_only = request["encoding"] == "query" and scalar_text(value) is None
            if (
                schema is None
                or name in written
                or not is_json_value(value)
                or not well_formed(value)
                or query_only
                or validate(value, schema)
            ):
                raise SearchError("invalid_request", provider=provider, field=field)
            out[name] = thaw(value)  # a replaced key keeps its place
        fixed = request.get("fixed") or {}
        for path in request.get("locked") or ():
            if not json_equal(get_path(out, path), get_path(fixed, path)):
                raise SearchError("invalid_request", provider=provider, field=option_field(provider, path.split(".")[0]))
    headers = {"accept": "application/json"}
    auth = spec["auth"]
    if auth["in"] == "header":
        headers[auth["name"]] = auth.get("prefix", "") + key
    url: str = request["url"]
    body: bytes | None = None
    pairs: list[str] = []
    if request["encoding"] == "json":
        headers["content-type"] = "application/json"
        body = dumps(out)
    else:
        for k, v in out.items():
            s = scalar_text(v)
            if s is None:  # only a param can write a non-scalar here; fixed values and options are checked earlier
                _unsupported(provider, written.get(k, k))
            pairs.append(f"{_encode(k)}={_encode(str(s))}")
    if auth["in"] == "query":
        pairs.append(f"{_encode(auth['name'])}={_encode(key)}")
    if pairs:
        url += ("&" if "?" in url else "?") + "&".join(pairs)
    return HttpRequest(request["method"], url, headers, body if request["method"] != "GET" else None)


# ---- Responses ----


def _field(row: Any, f: Any, now: int) -> Any:
    if f is None:
        return MISSING
    if isinstance(f, str):
        return get_path(row, f)
    return run_steps(get_path(row, f["path"]), f.get("steps"), "response", now)


def _str(v: Any) -> str | None:
    return v if isinstance(v, str) else None


def _text(v: Any) -> str | None:
    """A string with content; a blank string (policy blank set) becomes None."""
    return v if isinstance(v, str) and has_content(v) else None


_HTTP_URL = re.compile("https?://[^\\t\\n\\x0b\\x0c\\r \\xa0\\u1680\\u2000-\\u200a\\u2028\\u2029\\u202f\\u205f\\u3000\\ufeff/?#]", re.IGNORECASE | re.ASCII)


def _http_url(v: Any) -> bool:
    return isinstance(v, str) and _HTTP_URL.match(v) is not None


def _request_id(rules: Any, body: Any, headers: Headers) -> str | None:
    for rule in rules or ():
        v = get_path(body, rule["path"]) if "path" in rule else header(headers, rule["header"])
        if not isinstance(v, str) or ("header" in rule and "," in v):
            continue
        trimmed = trim_blank(v)
        if trimmed:
            return trimmed
    return None


def _warnings(provider: str, rules: Any, body: Any) -> list[ResponseWarning]:
    out: list[ResponseWarning] = []

    def add(code: str, source: Any, message_field: str | None) -> None:
        message = _text(get_path(source, message_field)) if message_field else None
        out.append(ResponseWarning(code, provider, message))

    for rule in rules or ():
        if "where" in rule:
            if all_hold(body, rule["where"]):
                add(rule["code"], body, rule.get("messageField"))
        else:
            listed = get_path(body, rule["listPath"])
            if is_array(listed):
                for item in listed:
                    add(rule["code"], item, rule.get("messageField"))
    return out


UNKNOWN = Cost(None, True, "unknown")


def _priced_tier(ep: Mapping[str, Any], depth: str | None, options: Any) -> str | None:
    """The tier a request is priced at: the normalized depth unless a cost option decides; None makes the price unknown."""
    tier = depth or "standard"
    cost_options = ep["pricing"].get("costOptions") or {}
    if not isinstance(options, Mapping):
        return tier
    for name, value in options.items():
        if name not in cost_options:
            continue
        effect = cost_options[name]
        if effect == "unknown":
            return None
        t = effect.get(value) if isinstance(value, str) else None
        if t is None:
            return None
        tier = t
    return tier


def computed_cost(ep: Mapping[str, Any], count: int, depth: str | None, options: Any) -> Cost:
    tier = _priced_tier(ep, depth, options)
    usd = None if tier is None else request_price(count, ep["pricing"], tier)
    return UNKNOWN if usd is None else Cost(usd, True, "computed")


def reported_cost(ep: Mapping[str, Any], body: Any) -> Cost | None:
    reported = (ep.get("cost") or {}).get("reported")
    if not reported:
        return None
    v = get_path(body, reported["path"])
    if not is_finite_number(v) or v < 0:
        return None
    if reported["unit"] == "usd":
        return Cost(v, bool(reported.get("isEstimate", False)), "reported")
    usd = credits_to_usd(v, ep["pricing"].get("creditUsd"))
    return None if usd is None else Cost(usd, True, "reported-credits", v)


@dataclass(frozen=True)
class Mapped:
    items: list[Any]
    cost: Cost
    request_id: str | None
    warnings: list[ResponseWarning]


def _invalid(provider: str, body: Any) -> NoReturn:
    raise SearchError("invalid_response", provider=provider, raw=body)


def map_search(spec: Mapping[str, Any], n: Mapping[str, Any], body: Any, headers: Headers, now: int, options: Any) -> Mapped:
    provider: str = spec["id"]
    ep = endpoint(spec, "search")
    response = ep["response"]
    if not isinstance(body, Mapping):
        _invalid(provider, body)
    found = get_path(body, response["results"])
    rows = [] if found in (MISSING, None) and response.get("resultsOptional") else found
    if not is_array(rows):
        _invalid(provider, body)
    f = response["fields"]
    results: list[SearchResult] = []
    dropped = 0
    for row in rows:
        if len(results) >= n["maxResults"]:
            break
        url = _field(row, f["url"], now)
        if not _http_url(url):
            dropped += 1
            continue
        provider_fields: dict[str, Any] = {}
        for name, pf in (response.get("providerFields") or {}).items():
            v = _field(row, pf, now)
            if v is not MISSING and v is not None:
                provider_fields[name] = thaw(v)
        excerpts = _field(row, f["excerpts"], now) if "excerpts" in f else []
        results.append(
            SearchResult(
                url=url,
                title=_text(_field(row, f.get("title"), now)),
                excerpts=[e for e in excerpts if isinstance(e, str)] if is_array(excerpts) else [],
                published_at=_str(_field(row, f.get("publishedAt"), now)),
                author=_text(_field(row, f.get("author"), now)),
                rank=len(results) + 1,
                provider_fields=provider_fields,
            )
        )
    warnings = _warnings(provider, response.get("warnings"), body)
    if dropped:
        warnings.append(ResponseWarning("invalid_rows_dropped", provider, count=dropped))
    cost = reported_cost(ep, body) or computed_cost(ep, len(rows), n.get("depth"), options)
    return Mapped(results, cost, _request_id(response.get("requestId"), body, headers), warnings)


def _missing_page(url: str) -> Page:
    return Page(url, "failed", None, None, None, None, None, PageError("missing", None))


def map_contents(spec: Mapping[str, Any], urls: list[str], body: Any, headers: Headers, now: int, options: Any) -> Mapped:
    provider: str = spec["id"]
    ep = endpoint(spec, "contents")
    response = ep["response"]
    if not isinstance(body, Mapping):
        _invalid(provider, body)
    candidates: list[tuple[str, Page, bool]] = []
    for source in response["pages"]:
        if source["from"] == "$":
            items: Any = [body]
        else:
            found = get_path(body, source["from"])
            items = [] if found in (MISSING, None) and source.get("optional") else found
        if not is_array(items):
            _invalid(provider, body)
        f = source["fields"]
        ok = source["status"] == "ok"
        for item in items:
            if not all_hold(item, source.get("where")):
                continue
            url = _field(item, f["url"], now)
            if not isinstance(url, str):
                continue
            page = Page(
                url=url,
                status=source["status"],
                final_url=_text(_field(item, f.get("finalUrl"), now)),
                title=_text(_field(item, f.get("title"), now)),
                content=_str(_field(item, f.get("content"), now)) if ok else None,
                published_at=_str(_field(item, f.get("publishedAt"), now)),
                author=_text(_field(item, f.get("author"), now)),
                error=None if ok else PageError(_text(_field(item, f.get("errorCode"), now)), _text(_field(item, f.get("errorMessage"), now))),
            )
            candidates.append((url_key(url), page, ok or source.get("billable") is True))
    billable = sum(1 for _, _, b in candidates if b)
    pages: list[Page] = []
    for requested in urls:
        key = url_key(requested)
        index = next((i for i, (k, _, _) in enumerate(candidates) if k == key), -1)
        if index < 0:
            pages.append(_missing_page(requested))
            continue
        _, hit, _ = candidates.pop(index)
        pages.append(Page(requested, hit.status, hit.final_url, hit.title, hit.content, hit.published_at, hit.author, hit.error))
    warnings = _warnings(provider, response.get("warnings"), body)
    if candidates:
        warnings.append(ResponseWarning("unmatched_pages", provider, count=len(candidates)))
    cost = reported_cost(ep, body) or computed_cost(ep, billable, None, options)
    return Mapped(pages, cost, _request_id(response.get("requestId"), body, headers), warnings)


def attempt_cost(spec: Mapping[str, Any], kind: Kind, n: Mapping[str, Any], body: Any, options: Any) -> Cost:
    """An attempt without a mapped response: a reported cost from the body if any, else the computed price for the requested count."""
    ep = endpoint(spec, kind)
    reported = None if body is MISSING else reported_cost(ep, body)
    if reported:
        return reported
    count = n["maxResults"] if kind == "search" else len(n["urls"])
    return computed_cost(ep, count, n.get("depth") if kind == "search" else None, options)


def is_scalar(v: Any) -> bool:
    return isinstance(v, (str, bool)) or is_number(v)
