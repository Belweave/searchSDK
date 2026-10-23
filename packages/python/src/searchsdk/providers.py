"""Fourteen direct normalized adapters, matching the retained TypeScript wire mappings."""

from __future__ import annotations
import re
from datetime import date
from types import MappingProxyType
from typing import Any, Mapping
from urllib.parse import urlencode
from .errors import SearchError
from .models import (
    Capabilities,
    Provenance,
    ProviderResponse,
    SearchRequest,
    SearchResult,
    SearchUsage,
    SearchWarning,
)
from .transport import (
    BoundedRunner,
    CallContext,
    CancellationToken,
    HttpRequest,
    Transport,
    context_for,
    encode_json,
    https_transport,
    now,
    request_json,
)
from .validation import (
    check_capabilities,
    credential,
    number,
    obj,
    request_id,
    rows,
    string,
    strings,
    url,
    validate_request,
)

CAPABILITIES = MappingProxyType(
    {
        "exa": Capabilities(True, 1200, 1200),
        "tavily": Capabilities(True, 300, 150),
        "brave": Capabilities(False),
        "context": Capabilities(True, 100, 100, max_query_length=500),
        "tinyfish": Capabilities(True, 100, 100),
        "perplexity": Capabilities(True, 20, 20, True),
        "parallel": Capabilities(True, 200, 200, True),
        "linkup": Capabilities(True, 100, 50),
        "firecrawl": Capabilities(True, 100, 100, True, 500),
        "you": Capabilities(True, 500, 5000, True),
        "serper": Capabilities(False),
        "serpapi": Capabilities(False),
        "valyu": Capabilities(True, 100, 100),
        "searxng": Capabilities(False),
    }
)
_ENDPOINTS = {
    "exa": "https://api.exa.ai/search",
    "tavily": "https://api.tavily.com/search",
    "brave": "https://api.search.brave.com/res/v1/web/search",
    "context": "https://api.context.dev/v1/web/search",
    "tinyfish": "https://api.search.tinyfish.ai/",
    "perplexity": "https://api.perplexity.ai/search",
    "parallel": "https://api.parallel.ai/v1/search",
    "linkup": "https://api.linkup.so/v1/search",
    "firecrawl": "https://api.firecrawl.dev/v2/search",
    "you": "https://ydc-index.io/v1/search",
    "serper": "https://google.serper.dev/search",
    "serpapi": "https://serpapi.com/search.json",
    "valyu": "https://api.valyu.ai/v1/search",
}
_AUTH = {
    "exa": "x-api-key",
    "brave": "X-Subscription-Token",
    "tinyfish": "X-API-Key",
    "parallel": "x-api-key",
    "you": "X-API-Key",
    "serper": "X-API-KEY",
    "valyu": "X-API-Key",
}


def _usage(value: Any, field: str, unit: str) -> SearchUsage | None:
    if value is None:
        return None
    amount = number(obj(value).get(field))
    if amount is None:
        return None
    if amount < 0:
        raise SearchError("invalid_response")
    return SearchUsage(unit, amount)


def _valyu_settings(settings: Mapping[str, Any] | None) -> dict:
    if settings is None:
        return {}
    names = {
        "max_price",
        "relevance_threshold",
        "response_length",
        "fast_mode",
        "start_date",
        "end_date",
        "instructions",
    }
    if not isinstance(settings, Mapping) or set(settings) - names:
        raise SearchError("configuration")
    v = dict(settings)
    try:
        if "max_price" in v and (number(v["max_price"]) is None or v["max_price"] <= 0):
            raise ValueError()
        if "relevance_threshold" in v and (
            number(v["relevance_threshold"]) is None or not 0 <= v["relevance_threshold"] <= 1
        ):
            raise ValueError()
        if "response_length" in v and not (
            type(v["response_length"]) is int
            and 0 < v["response_length"] <= 2**53 - 1
            or isinstance(v["response_length"], str)
            and v["response_length"] in {"short", "medium", "large", "max"}
        ):
            raise ValueError()
        if "fast_mode" in v and type(v["fast_mode"]) is not bool:
            raise ValueError()
        for key in ("start_date", "end_date"):
            if key in v and (
                not isinstance(v[key], str)
                or not re.fullmatch(r"\d{4}-\d{2}-\d{2}", v[key])
                or date.fromisoformat(v[key]).isoformat() != v[key]
            ):
                raise ValueError()
        if "start_date" in v and "end_date" in v and v["start_date"] > v["end_date"]:
            raise ValueError()
        if "instructions" in v and (
            not isinstance(v["instructions"], str)
            or not v["instructions"].strip()
            or len(v["instructions"].encode("utf-16-le")) // 2 > 500
        ):
            raise ValueError()
    except (ValueError, TypeError, SearchError):
        raise SearchError("configuration") from None
    return v


def _proxy_headers(values: Mapping[str, str] | None) -> dict:
    out = {"Accept": "application/json", "Content-Type": "application/x-www-form-urlencoded"}
    if values is not None:
        if not isinstance(values, Mapping) or len(values) > 32:
            raise SearchError("configuration")
        for key, value in values.items():
            if (
                not isinstance(key, str)
                or not re.fullmatch(r"[!#$%&'*+.^_`|~0-9a-zA-Z-]+", key)
                or key.lower()
                in {
                    "host",
                    "cookie",
                    "connection",
                    "content-length",
                    "transfer-encoding",
                    "accept",
                    "content-type",
                }
                or not isinstance(value, str)
                or len(value) > 8192
                or re.search(r"[\r\n\x00]", value)
            ):
                raise SearchError("configuration")
            out[key] = value
    return out


class DirectProvider:
    def __init__(
        self,
        provider: str,
        api_key: str | None = None,
        *,
        transport: Transport | None = None,
        search: Mapping[str, Any] | None = None,
        base_url: str | None = None,
        headers: Mapping[str, str] | None = None,
        language: str | None = None,
        safe_search: int | None = None,
        time_range: str | None = None,
        categories: tuple[str, ...] | list[str] | None = None,
    ) -> None:
        if provider not in CAPABILITIES or transport is not None and not callable(transport):
            raise SearchError("configuration")
        self.id = provider
        self.capabilities = CAPABILITIES[provider]
        self._transport = transport or https_transport
        self._runner = BoundedRunner(4)
        self._key: str | None
        self._settings: dict = {}
        self._parameters: dict = {}
        self._headers: dict = {}
        if provider != "searxng":
            if (
                any(
                    v is not None
                    for v in (base_url, headers, language, safe_search, time_range, categories)
                )
                or search is not None
                and provider != "valyu"
            ):
                raise SearchError("unsupported_option")
            self._key = credential(api_key)
            self._endpoint = _ENDPOINTS[provider]
            if provider == "valyu":
                self._settings = _valyu_settings(search)
        else:
            if api_key is not None or search is not None:
                raise SearchError("unsupported_option")
            self._key = None
            self._endpoint = url(base_url, endpoint=True).rstrip("/") + "/search"
            self._headers = _proxy_headers(headers)
            self._parameters = {"format": "json", "pageno": "1"}
            if language is not None:
                if not isinstance(language, str) or not re.fullmatch(
                    r"[a-zA-Z][a-zA-Z0-9_-]{0,34}", language
                ):
                    raise SearchError("configuration")
                self._parameters["language"] = language
            if safe_search is not None:
                if type(safe_search) is not int or safe_search not in (0, 1, 2):
                    raise SearchError("configuration")
                self._parameters["safesearch"] = str(safe_search)
            if time_range is not None:
                if time_range not in ("day", "month", "year"):
                    raise SearchError("configuration")
                self._parameters["time_range"] = time_range
            categories = ["general"] if categories is None else categories
            if (
                not isinstance(categories, (tuple, list))
                or not 1 <= len(categories) <= 20
                or any(
                    not isinstance(c, str) or not re.fullmatch(r"[a-zA-Z][a-zA-Z0-9 _-]{0,63}", c)
                    for c in categories
                )
            ):
                raise SearchError("configuration")
            self._parameters["categories"] = ",".join(categories)

    def __repr__(self) -> str:
        return f"DirectProvider({self.id!r})"

    def _request(self, r: SearchRequest) -> HttpRequest:
        p, q, n = self.id, r.query, r.limit
        include, exclude = list(r.include_domains or ()), list(r.exclude_domains or ())
        auth = _AUTH.get(p, "Authorization")
        h = {"Accept": "application/json", "Content-Type": "application/json"}
        if p not in ("serpapi", "searxng"):
            h[auth] = str(self._key) if auth != "Authorization" else f"Bearer {self._key}"
        body: dict[str, Any] = {}
        if p in ("brave", "tinyfish", "serpapi"):
            params: dict = (
                {"q": q, "count": str(n), "extra_snippets": "true"}
                if p == "brave"
                else {"query": q, "domain_type": "web", "page": "0"}
                if p == "tinyfish"
                else {"engine": "google", "q": q, "api_key": self._key}
            )
            if p == "tinyfish":
                if include:
                    params["include_domains"] = ",".join(include)
                if exclude:
                    params["exclude_domains"] = ",".join(exclude)
            h.pop("Content-Type")
            return HttpRequest("GET", self._endpoint + "?" + urlencode(params), h)
        if p == "searxng":
            return HttpRequest(
                "POST",
                self._endpoint,
                dict(self._headers),
                urlencode({**self._parameters, "q": q}).encode(),
            )
        if p == "exa":
            body = {"query": q, "numResults": n, "type": "auto", "contents": {"highlights": True}}
        elif p == "tavily":
            body = {
                "query": q,
                "max_results": n,
                "search_depth": "basic",
                "include_usage": True,
                "auto_parameters": False,
                "include_answer": False,
                "include_raw_content": False,
            }
        elif p == "context":
            body = {"query": q, "numResults": max(10, n)}
        elif p == "perplexity":
            body = {"query": q, "max_results": n, "search_type": "web"}
        elif p == "parallel":
            body = {"search_queries": [q], "mode": "basic", "advanced_settings": {"max_results": n}}
        elif p == "linkup":
            body = {
                "q": q,
                "depth": "fast",
                "outputType": "searchResults",
                "includeImages": False,
                "maxResults": n,
            }
        elif p == "firecrawl":
            body = {"query": q, "limit": n, "sources": [{"type": "web"}], "highlights": False}
        elif p == "you":
            body = {"query": q, "count": n}
        elif p == "serper":
            body = {"q": q, "num": n}
        elif p == "valyu":
            body = {**self._settings, "query": q, "search_type": "web", "max_num_results": n}
        if p in ("exa", "context", "linkup", "firecrawl"):
            if include:
                body["includeDomains"] = include
            if exclude:
                body["excludeDomains"] = exclude
        elif p in ("tavily", "you"):
            if include:
                body["include_domains"] = include
            if exclude:
                body["exclude_domains"] = exclude
            if p == "tavily" and include:
                body["include_domains_mode"] = "restrict"
        elif p == "perplexity":
            if include or exclude:
                body["search_domain_filter"] = include or ["-" + d for d in exclude]
        elif p == "parallel" and (include or exclude):
            policy = {}
            if include:
                policy["include_domains"] = include
            if exclude:
                policy["exclude_domains"] = exclude
            body["advanced_settings"]["source_policy"] = policy
        elif p == "valyu":
            if include:
                body["included_sources"] = include
            if exclude:
                body["excluded_sources"] = exclude
        return HttpRequest("POST", self._endpoint, h, encode_json(body))

    def _normalize(self, b: dict) -> ProviderResponse:
        p = self.id
        data = b.get("results")
        rid = None
        usage = None
        warning = False
        snippet = None
        highlights = None
        score = None
        if p == "exa":
            rid = request_id(b.get("requestId"))
            highlights = "highlights"
            score = "score"
            usage = _usage(b.get("costDollars"), "total", "usd")
            warning = any(isinstance(b.get(k), list) and b[k] for k in ("warnings", "notices"))
        elif p == "tavily":
            rid = request_id(b.get("request_id"))
            snippet = "content"
            score = "score"
            usage = _usage(b.get("usage"), "credits", "credits")
        elif p == "brave":
            if "web" not in b:
                if not isinstance(obj(b.get("query")).get("original"), str):
                    raise SearchError("invalid_response")
                data = []
            else:
                data = obj(b["web"]).get("results")
            snippet = "description"
            highlights = "extra_snippets"
        elif p == "context":
            rid = request_id(b.get("request_id"))
            snippet = "description"
            if "partial" in b and type(b["partial"]) is not bool:
                raise SearchError("invalid_response")
            warning = b.get("partial") is True
            usage = _usage(b.get("key_metadata"), "credits_consumed", "credits")
        elif p == "tinyfish":
            snippet = "snippet"
        elif p == "perplexity":
            rid = request_id(b.get("id"))
            snippet = "snippet"
        elif p == "parallel":
            rid = request_id(b.get("search_id"))
            highlights = "excerpts"
            if b.get("warnings") is not None:
                rows(b["warnings"])
            warning = bool(b.get("warnings"))
        elif p == "linkup":
            snippet = "content"
        elif p == "firecrawl":
            if b.get("success") is not True:
                raise SearchError(
                    "provider_error" if b.get("success") is False else "invalid_response"
                )
            rid = request_id(b.get("id"))
            data = obj(b.get("data")).get("web")
            snippet = "description"
            credits = number(b.get("creditsUsed"))
            if credits is not None and (credits < 0 or credits % 1):
                raise SearchError("invalid_response")
            usage = SearchUsage("credits", credits) if credits is not None else None
            warning = bool(string(b.get("warning")))
        elif p == "you":
            if "metadata" in b:
                rid = request_id(obj(b["metadata"]).get("search_uuid"))
            sections = obj(b.get("results"))
            if "web" not in sections:
                rows(sections.get("news"))
                data = []
            else:
                data = sections["web"]
            snippet = "description"
        elif p == "serper":
            if "error" in b or "message" in b and "organic" not in b:
                raise SearchError("provider_error")
            data = b.get("organic")
            snippet = "snippet"
            usage = _usage(b, "credits", "credits")
        elif p == "serpapi":
            m = obj(b.get("search_metadata"))
            info = b.get("search_information")
            empty = (
                m.get("status") == "Success"
                and b.get("error") == "Google hasn't returned any results for this query."
                and isinstance(info, dict)
                and type(info.get("total_results")) is int
                and info["total_results"] == 0
                and info.get("organic_results_state") == "Fully empty"
                and ("organic_results" not in b or b["organic_results"] == [])
            )
            if "error" in b and not empty or m.get("status") == "Error":
                raise SearchError("provider_error")
            if m.get("status") != "Success":
                raise SearchError("invalid_response")
            rid = request_id(m.get("id"))
            data = [] if empty else b.get("organic_results")
            snippet = "snippet"
        elif p == "valyu":
            if type(b.get("success")) is not bool:
                raise SearchError("invalid_response")
            if not b["success"]:
                raise SearchError("provider_error")
            rid = request_id(b.get("tx_id"))
            snippet = "content"
            score = "relevance_score"
            warning = bool(string(b.get("error"))) | bool(strings(b.get("warnings")))
            usage = _usage(b, "total_deduction_dollars", "usd")
        elif p == "searxng":
            if "error" in b:
                raise SearchError("provider_error")
            if "unresponsive_engines" in b:
                rows(b["unresponsive_engines"])
            warning = bool(b.get("unresponsive_engines"))
            snippet = "content"
            score = "score"
        retrieved = now()
        result = []
        # Validate every row before truncation, including rows beyond the requested ceiling.
        for value in rows(data):
            r = obj(value)
            title = r.get("title")
            link = r.get("url")
            if p == "linkup":
                if "type" in r and r["type"] != "text":
                    raise SearchError("invalid_response")
                title = r.get("name")
            if p in ("serper", "serpapi"):
                link = r.get("link")
            link = url(link)
            text = string(r.get(snippet)) if snippet else None
            if p == "you":
                excerpts = strings(r.get("snippets"))
                if text is None and excerpts is not None:
                    text = "\n".join(excerpts)
            result.append(
                SearchResult(
                    link,
                    Provenance(p, link, retrieved, rid),
                    string(title),
                    text,
                    strings(r.get(highlights)) if highlights else None,
                    number(r.get(score)) if score else None,
                )
            )
        return ProviderResponse(
            tuple(result), usage, (SearchWarning("provider_warning", p),) if warning else ()
        )

    def search(self, request: SearchRequest, context: CallContext) -> ProviderResponse:
        request = validate_request(request)
        check_capabilities(self.capabilities, request)
        result = self._normalize(
            obj(request_json(self._transport, self._request(request), context))
        )
        context.check()
        return result

    def search_raw(
        self,
        request: SearchRequest | Mapping[str, Any] | str,
        *,
        timeout_ms: int = 10000,
        cancellation: CancellationToken | None = None,
    ) -> dict[str, Any]:
        if self.id not in ("valyu", "searxng"):
            raise SearchError("unsupported_option")
        r = validate_request(request)
        check_capabilities(self.capabilities, r)
        c = context_for(timeout_ms, cancellation)

        def run() -> dict:
            body = obj(request_json(self._transport, self._request(r), c))
            self._normalize(body)
            return {"provider": self.id, "retrievedAt": now(), "data": body}

        try:
            return self._runner.run(run, c)
        finally:
            c.close()


def exa(api_key: str, *, transport: Transport | None = None) -> DirectProvider:
    return DirectProvider("exa", api_key, transport=transport)


def tavily(api_key: str, *, transport: Transport | None = None) -> DirectProvider:
    return DirectProvider("tavily", api_key, transport=transport)


def brave(api_key: str, *, transport: Transport | None = None) -> DirectProvider:
    return DirectProvider("brave", api_key, transport=transport)


def context(api_key: str, *, transport: Transport | None = None) -> DirectProvider:
    return DirectProvider("context", api_key, transport=transport)


def tinyfish(api_key: str, *, transport: Transport | None = None) -> DirectProvider:
    return DirectProvider("tinyfish", api_key, transport=transport)


def perplexity(api_key: str, *, transport: Transport | None = None) -> DirectProvider:
    return DirectProvider("perplexity", api_key, transport=transport)


def parallel(api_key: str, *, transport: Transport | None = None) -> DirectProvider:
    return DirectProvider("parallel", api_key, transport=transport)


def linkup(api_key: str, *, transport: Transport | None = None) -> DirectProvider:
    return DirectProvider("linkup", api_key, transport=transport)


def firecrawl(api_key: str, *, transport: Transport | None = None) -> DirectProvider:
    return DirectProvider("firecrawl", api_key, transport=transport)


def you(api_key: str, *, transport: Transport | None = None) -> DirectProvider:
    return DirectProvider("you", api_key, transport=transport)


def serper(api_key: str, *, transport: Transport | None = None) -> DirectProvider:
    return DirectProvider("serper", api_key, transport=transport)


def serpapi(api_key: str, *, transport: Transport | None = None) -> DirectProvider:
    return DirectProvider("serpapi", api_key, transport=transport)


def valyu(
    api_key: str, *, transport: Transport | None = None, search: Mapping[str, Any] | None = None
) -> DirectProvider:
    return DirectProvider("valyu", api_key, transport=transport, search=search)


def searxng(
    base_url: str,
    *,
    transport: Transport | None = None,
    headers: Mapping[str, str] | None = None,
    language: str | None = None,
    safe_search: int | None = None,
    time_range: str | None = None,
    categories: tuple[str, ...] | list[str] | None = None,
) -> DirectProvider:
    return DirectProvider(
        "searxng",
        transport=transport,
        base_url=base_url,
        headers=headers,
        language=language,
        safe_search=safe_search,
        time_range=time_range,
        categories=categories,
    )
