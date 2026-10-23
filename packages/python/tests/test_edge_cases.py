import unittest
from searchsdk import (
    GatewayClient,
    HttpResponse,
    SearchClient,
    SearchError,
    brave,
    context,
    exa,
    searxng,
    serpapi,
    valyu,
    you,
)


class EdgeTests(unittest.TestCase):
    def assert_code(self, code, fn):
        with self.assertRaises(SearchError) as got:
            fn()
        self.assertEqual(got.exception.code, code)

    def test_provider_empty_result_special_cases(self):
        cases = [
            (brave, {"query": {"original": "q"}}),
            (you, {"results": {"news": []}}),
            (
                serpapi,
                {
                    "search_metadata": {"status": "Success"},
                    "error": "Google hasn't returned any results for this query.",
                    "search_information": {
                        "total_results": 0,
                        "organic_results_state": "Fully empty",
                    },
                },
            ),
        ]
        for factory, payload in cases:
            response = SearchClient(
                factory("fixture", transport=lambda r, c: HttpResponse.json(payload))
            ).search("q")
            self.assertEqual(response.results, ())
            self.assertIsNone(response.usage)
        self.assert_code(
            "provider_error",
            lambda: SearchClient(
                serpapi(
                    "fixture",
                    transport=lambda r, c: HttpResponse.json(
                        {"search_metadata": {"status": "Success"}, "error": "secret"}
                    ),
                )
            ).search("q"),
        )

    def test_provider_query_limit_counts_utf16_units(self):
        calls = []

        def transport(r, c):
            calls.append(r)
            return HttpResponse.json({"results": []})

        client = SearchClient(context("fixture", transport=transport))
        client.search("😀" * 250)
        self.assert_code("unsupported_option", lambda: client.search("😀" * 251))
        self.assertEqual(len(calls), 1)

    def test_valyu_settings_and_sanitized_warnings(self):
        for settings in [
            {"max_price": 0},
            {"max_price": True},
            {"relevance_threshold": float("nan")},
            {"response_length": True},
            {"response_length": 0},
            {"start_date": "2024-02-30"},
            {"start_date": "2024-06-01", "end_date": "2024-01-01"},
            {"instructions": " "},
            {"fast_mode": 1},
            {"dataset": "invented"},
        ]:
            self.assert_code("configuration", lambda: valyu("fixture", search=settings))
        response = SearchClient(
            valyu(
                "fixture",
                transport=lambda r, c: HttpResponse.json(
                    {
                        "success": True,
                        "results": [],
                        "error": "sensitive warning",
                        "warnings": ["private text"],
                        "total_deduction_dollars": 0,
                    }
                ),
            )
        ).search("q")
        self.assertEqual(response.usage.value, 0)
        self.assertEqual(response.warnings[0].code, "provider_warning")
        self.assertNotIn("sensitive", str(response.to_dict()))
        self.assertNotIn("private", str(response.to_dict()))
        self.assert_code(
            "invalid_response",
            lambda: SearchClient(
                valyu(
                    "fixture",
                    transport=lambda r, c: HttpResponse.json({"success": 1, "results": []}),
                )
            ).search("q"),
        )

    def test_searxng_captures_configuration_and_rejects_invalid_settings(self):
        for kwargs in [
            {"headers": {"Cookie": "private"}},
            {"headers": {"Host": "evil"}},
            {"headers": {"Authorization": "bad\nvalue"}},
            {"safe_search": True},
            {"time_range": "week"},
            {"categories": []},
            {"language": "bad language"},
        ]:
            self.assert_code(
                "configuration", lambda: searxng("https://search.example.com", **kwargs)
            )
        categories = ["general", "science"]
        headers = {"Authorization": "Bearer original"}
        calls = []

        def transport(r, c):
            calls.append(r)
            return HttpResponse.json(
                {"results": [], "unresponsive_engines": [["engine", "private"]]}
            )

        p = searxng(
            "https://search.example.com/base/",
            categories=categories,
            headers=headers,
            transport=transport,
        )
        categories.append("news")
        headers["Authorization"] = "changed"
        response = SearchClient(p).search("q")
        self.assertEqual(calls[0].headers["Authorization"], "Bearer original")
        self.assertIn(b"general%2Cscience", calls[0].body)
        self.assertNotIn(b"news", calls[0].body)
        self.assertEqual(response.warnings[0].code, "provider_warning")

    def test_finite_numeric_values_and_credential_url_validation(self):
        for score in [True, float("nan"), float("inf"), 10**1000]:
            payload = {
                "results": [{"url": "https://example.com", "score": score}],
                "costDollars": None,
            }
            # Hand-injected bytes permit malformed nonfinite wire examples.
            import json

            client = SearchClient(
                exa(
                    "fixture",
                    transport=lambda r, c: HttpResponse(200, {}, json.dumps(payload).encode()),
                )
            )
            self.assert_code("invalid_response", lambda: client.search("q"))
        for key in ["", "has space", "secret\n", "秘密"]:
            self.assert_code("configuration", lambda: exa(key))
        error = SearchError("auth", status="private", retry_after_ms=float("nan"))
        self.assertIsNone(error.status)
        self.assertIsNone(error.retry_after_ms)

    def test_gateway_never_retries_post(self):
        calls = []

        def transport(r, c):
            calls.append(r)
            return HttpResponse(503, {}, b"secret")

        self.assert_code(
            "unavailable",
            lambda: GatewayClient("https://app.example.com", transport=transport).search("q"),
        )
        self.assertEqual(len(calls), 1)
