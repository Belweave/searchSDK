"""Shared interoperability and independently pinned TypeScript fixture semantics."""

import copy
import dataclasses
import json
from pathlib import Path
import unittest
from urllib.parse import parse_qs, urlsplit
from searchsdk import (
    CAPABILITIES,
    GatewayClient,
    HttpResponse,
    SearchClient,
    SearchError,
    searxng,
)
from searchsdk import providers
from searchsdk.validation import validate_request

FIXTURES = Path(__file__).parent / "fixtures"


def fixture(name):
    return json.loads((FIXTURES / name).read_text())


class SharedTests(unittest.TestCase):
    def assert_code(self, code, fn):
        with self.assertRaises(SearchError) as got:
            fn()
        self.assertEqual(got.exception.code, code)
        return got.exception

    def test_shared_requests(self):
        for case in fixture("request-cases.json")["valid"]:
            with self.subTest(case=case["name"]):
                self.assertEqual(validate_request(case["input"]).to_dict(), case["normalized"])
        for case in fixture("request-cases.json")["invalid"]:
            with self.subTest(case=case["name"]):
                self.assert_code(case["code"], lambda: validate_request(case["input"]))

    def test_shared_gateway_success(self):
        success = fixture("search-success.json")
        calls = []

        def transport(req, context):
            calls.append(req)
            return HttpResponse.json(success, headers={"X-SearchSDK-Protocol": "1"})

        response = GatewayClient("https://app.example.com/exact", transport=transport).search(
            "search", token="fixture-app-token"
        )
        self.assertEqual(response.to_dict(), success)
        self.assertEqual(calls[0].url, "https://app.example.com/exact")
        self.assertEqual(calls[0].headers["Authorization"], "Bearer fixture-app-token")
        self.assertEqual(json.loads(calls[0].body), {"query": "search", "limit": 5})

    def test_shared_gateway_errors(self):
        for case in fixture("search-errors.json"):
            with self.subTest(status=case["httpStatus"]):
                client = GatewayClient(
                    "https://app.example.com/search",
                    transport=lambda r, c: HttpResponse.json(case["body"], case["httpStatus"]),
                )
                error = self.assert_code(
                    case["body"]["error"]["code"], lambda: client.search("secret query")
                )
                self.assertEqual(error.attempts, ())

    def test_shared_provider_wire_and_mappings(self):
        shared = fixture("providers.json")
        seen = set()
        for case in shared["cases"]:
            with self.subTest(case=case["name"]):
                calls = []

                def transport(req, context):
                    calls.append(req)
                    return HttpResponse.json(case["upstreamResponse"])

                opts = case.get("options", {})
                if case["provider"] == "searxng":
                    expected_url = case["upstreamRequest"]["url"]
                    provider = searxng(expected_url.removesuffix("/search"), transport=transport)
                else:
                    provider = getattr(providers, case["provider"])(
                        shared["credential"], transport=transport, **opts
                    )
                seen.add(provider.id)
                c = provider.capabilities
                actual_caps = {
                    "domainFilters": c.domain_filters,
                    "maxIncludeDomains": c.max_include_domains,
                    "maxExcludeDomains": c.max_exclude_domains,
                }
                if c.max_query_length is not None:
                    actual_caps["maxQueryLength"] = c.max_query_length
                if c.mutually_exclusive_domain_filters:
                    actual_caps["mutuallyExclusiveDomainFilters"] = True
                self.assertEqual(actual_caps, case["capabilities"])
                response = SearchClient(provider).search(case["request"])
                actual = response.to_dict()
                del actual["provider"]
                del actual["attempts"]
                for row in actual["results"]:
                    row["provenance"]["retrievedAt"] = shared["canonicalRetrievalTime"]
                self.assertEqual(actual, case["response"])
                req = calls[0]
                expected = case["upstreamRequest"]
                parsed = urlsplit(req.url)
                self.assertEqual(
                    parsed.scheme + "://" + parsed.netloc + parsed.path, expected["url"]
                )
                self.assertEqual(
                    {k: v[0] for k, v in parse_qs(parsed.query).items()}, expected["query"]
                )
                self.assertEqual(req.method, expected["method"])
                h = {k.lower(): v for k, v in req.headers.items()}
                for k, v in expected["headers"].items():
                    self.assertEqual(h[k], v)
                if expected.get("body") is not None:
                    payload = (
                        {k: v[0] for k, v in parse_qs(req.body.decode()).items()}
                        if provider.id == "searxng"
                        else json.loads(req.body)
                    )
                    self.assertEqual(payload, expected["body"])
                else:
                    self.assertIsNone(req.body)
        self.assertEqual(seen, set(CAPABILITIES))

    def test_fallback_chain_preflight(self):
        for p in CAPABILITIES:
            provider = (
                searxng("https://search.example.com", transport=lambda *_: self.fail("dispatch"))
                if p == "searxng"
                else getattr(providers, p)("fixture", transport=lambda *_: self.fail("dispatch"))
            )
            primary = (providers.tavily if p == "exa" else providers.exa)(
                "fixture", transport=lambda *_: self.fail("dispatch")
            )
            maximum = provider.capabilities.max_include_domains
            self.assert_code(
                "unsupported_option",
                lambda: SearchClient(primary, fallback=[provider]).search(
                    {"query": "q", "includeDomains": [f"d{i}.com" for i in range(maximum + 1)]}
                ),
            )
            if provider.capabilities.mutually_exclusive_domain_filters:
                self.assert_code(
                    "unsupported_option",
                    lambda: SearchClient(primary, fallback=[provider]).search(
                        {"query": "q", "includeDomains": ["a.com"], "excludeDomains": ["b.com"]}
                    ),
                )

    def test_all_provider_rows_validated_before_truncation(self):
        for case in fixture("providers.json")["cases"]:
            with self.subTest(case=case["name"]):
                data = copy.deepcopy(case["upstreamResponse"])
                if case["provider"] == "brave":
                    target = data["web"]["results"]
                elif case["provider"] == "you":
                    target = data["results"]["web"]
                elif case["provider"] == "firecrawl":
                    target = data["data"]["web"]
                elif case["provider"] == "serper":
                    target = data["organic"]
                elif case["provider"] == "serpapi":
                    target = data["organic_results"]
                else:
                    target = data["results"]
                target.append(
                    {
                        "url": "https://user:secret@example.com",
                        "link": "https://user:secret@example.com",
                    }
                )
                transport = lambda r, c: HttpResponse.json(data)
                provider = (
                    searxng("https://search.example.com", transport=transport)
                    if case["provider"] == "searxng"
                    else getattr(providers, case["provider"])("fixture", transport=transport)
                )
                self.assert_code(
                    "invalid_response",
                    lambda: SearchClient(provider).search({"query": "q", "limit": 1}),
                )

    def test_gateway_mutations(self):
        def mutate(path, value):
            data = fixture("search-success.json")
            node = data
            for key in path[:-1]:
                node = node[key]
            node[path[-1]] = value
            return data

        cases = [
            (("provider",), "bad id"),
            (("results", 0, "url"), "javascript:evil"),
            (("results", 0, "score"), True),
            (("results", 0, "provenance", "retrievedAt"), "bad"),
            (("results", 0, "provenance", "requestId"), "secret\n"),
            (("warnings",), [{"code": "private text", "provider": "exa"}]),
            (("usage",), {"unit": "usd", "value": -1}),
            (("attempts", 0, "durationMs"), -1),
            (("attempts", 0, "status"), True),
            (("reuse",), "bad"),
        ]
        for path, value in cases:
            with self.subTest(path=path):
                client = GatewayClient(
                    "https://app.example.com",
                    transport=lambda r, c: HttpResponse.json(mutate(path, value)),
                )
                self.assert_code("invalid_response", lambda: client.search("q"))

    def test_gateway_protocol_status_and_fallback_errors(self):
        for status in [401, 402, 403, 432, 433, 429, 408, 500, 503, 302, 404]:
            expected = (
                "auth"
                if status in [401, 402, 403, 432, 433]
                else "rate_limit"
                if status == 429
                else "unavailable"
                if status == 408 or status >= 500
                else "provider_error"
            )
            client = GatewayClient(
                "https://app.example.com",
                transport=lambda r, c: HttpResponse(status, {}, b"secret"),
            )
            self.assert_code(expected, lambda: client.search("q"))
        for h, status in [({"x-searchsdk-protocol": "2"}, 200), ({}, 204)]:
            client = GatewayClient(
                "https://app.example.com",
                transport=lambda r, c: HttpResponse.json(fixture("search-success.json"), status, h),
            )
            self.assert_code("invalid_response", lambda: client.search("q"))

    def test_gateway_url_validation(self):
        for endpoint in [
            "http://example.com",
            "https://u:p@example.com",
            "https://example.com?",
            "https://example.com#",
            "https://example.com/a b",
            "https://example.com\\path",
            "https:///example.com",
            "https://example.com:wrong",
        ]:
            self.assert_code("configuration", lambda: GatewayClient(endpoint))

    def test_dataclasses_immutable_and_request_snapshot(self):
        r = validate_request({"query": "q", "includeDomains": ["EXAMPLE.COM"]})
        self.assertIsInstance(r.include_domains, tuple)
        with self.assertRaises(dataclasses.FrozenInstanceError):
            r.limit = 1
