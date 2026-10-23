import asyncio
import inspect
import json
import threading
import time
import unittest
from unittest.mock import patch
from urllib.parse import parse_qs, urlsplit
from searchsdk import (
    AsyncExaClient,
    BraveClient,
    CancellationToken,
    ContextClient,
    ExaClient,
    FirecrawlClient,
    HttpResponse,
    LinkupClient,
    MultipartBody,
    NativeClient,
    NativeFile,
    ParallelClient,
    PerplexityClient,
    RawResponse,
    RetryPolicy,
    SearchError,
    SerpapiClient,
    SerperClient,
    TavilyClient,
    TinyfishClient,
    WondersearchClient,
    YouClient,
)
from searchsdk.native import _catalog
from searchsdk.transport import CallContext, HttpRequest, https_transport


class Capture:
    def __init__(self, response=None):
        self.calls = []
        self.closed = threading.Event()
        self.response = response

    def __call__(self, request, context):
        self.calls.append(request)
        return self.response or HttpResponse(
            200, {"x-request-id": "fixture-native"}, b'{"native":true}', self.closed.set
        )


class NativeTests(unittest.TestCase):
    def assert_code(self, code, fn):
        with self.assertRaises(SearchError) as got:
            fn()
        self.assertEqual(got.exception.code, code)
        return got.exception

    def test_independent_native_json_wire_contracts(self):
        # These endpoints/headers are independently pinned to TS native fixture expectations.
        cases = [
            (
                ExaClient,
                "search",
                {"body": {"query": "q", "numResults": 3}},
                "POST",
                "https://api.exa.ai/search",
                "x-api-key",
            ),
            (
                TavilyClient,
                "search",
                {"body": {"query": "q"}},
                "POST",
                "https://api.tavily.com/search",
                "Authorization",
            ),
            (
                BraveClient,
                "search",
                {"query": {"q": "q"}},
                "GET",
                "https://api.search.brave.com/res/v1/web/search",
                "X-Subscription-Token",
            ),
            (
                ContextClient,
                "search",
                {"body": {"query": "q"}},
                "POST",
                "https://api.context.dev/v1/web/search",
                "Authorization",
            ),
            (
                TinyfishClient,
                "search",
                {"query": {"query": "q"}},
                "GET",
                "https://api.search.tinyfish.ai/",
                "X-API-Key",
            ),
            (
                PerplexityClient,
                "search",
                {"body": {"query": "q"}},
                "POST",
                "https://api.perplexity.ai/search",
                "Authorization",
            ),
            (
                ParallelClient,
                "search",
                {"body": {"search_queries": ["q"]}},
                "POST",
                "https://api.parallel.ai/v1/search",
                "x-api-key",
            ),
            (
                LinkupClient,
                "search",
                {"body": {"q": "q", "depth": "fast", "outputType": "searchResults"}},
                "POST",
                "https://api.linkup.so/v1/search",
                "Authorization",
            ),
            (
                FirecrawlClient,
                "search",
                {"body": {"query": "q"}},
                "POST",
                "https://api.firecrawl.dev/v2/search",
                "Authorization",
            ),
            (
                YouClient,
                "search",
                {"body": {"query": "q"}},
                "POST",
                "https://ydc-index.io/v1/search",
                "X-API-Key",
            ),
            (
                SerperClient,
                "search",
                {"body": {"q": "q"}},
                "POST",
                "https://google.serper.dev/search",
                "X-API-Key",
            ),
            (
                SerpapiClient,
                "search",
                {"query": {"engine": "google", "q": "q"}},
                "GET",
                "https://serpapi.com/search.json",
                None,
            ),
            (
                WondersearchClient,
                "search_drive",
                {
                    "path": {"drive_id": "d1"},
                    "body": {"query": "q"},
                    "headers": {"Idempotency-Key": "fixture-operation"},
                },
                "POST",
                "https://api.wondersearch.ai/v1/drives/d1/search",
                "X-API-Key",
            ),
        ]
        for factory, method, kwargs, verb, endpoint, header in cases:
            with self.subTest(provider=factory.__name__):
                t = Capture()
                client = factory("fixture", transport=t)
                result = getattr(client, method)(**kwargs)
                self.assertEqual(result.data, {"native": True})
                self.assertEqual(result.metadata.request_id, "fixture-native")
                request = t.calls[0]
                parsed = urlsplit(request.url)
                self.assertEqual(parsed.scheme + "://" + parsed.netloc + parsed.path, endpoint)
                self.assertEqual(request.method, verb)
                if header:
                    self.assertEqual(
                        request.headers[header],
                        "Bearer fixture" if header == "Authorization" else "fixture",
                    )
                if "body" in kwargs:
                    expected = {**kwargs["body"]}
                    if factory == ExaClient:
                        expected["stream"] = False
                    self.assertEqual(json.loads(request.body), expected)
                self.assertTrue(t.closed.is_set())

    def test_catalog_named_surfaces_and_retained_schemas(self):
        classes = {
            "exa": ExaClient,
            "tavily": TavilyClient,
            "brave": BraveClient,
            "context": ContextClient,
            "tinyfish": TinyfishClient,
            "perplexity": PerplexityClient,
            "parallel": ParallelClient,
            "linkup": LinkupClient,
            "firecrawl": FirecrawlClient,
            "you": YouClient,
            "serper": SerperClient,
            "serpapi": SerpapiClient,
            "wondersearch": WondersearchClient,
        }
        expected = {
            "exa": 74,
            "tavily": 16,
            "brave": 17,
            "context": 50,
            "tinyfish": 47,
            "perplexity": 35,
            "parallel": 39,
            "linkup": 15,
            "firecrawl": 57,
            "you": 9,
            "serper": 26,
            "serpapi": 13,
            "wondersearch": 95,
        }
        import re

        self.assertEqual(len(_catalog()["operations"]), sum(expected.values()))
        for p, cls in classes.items():
            client = cls("fixture")
            self.assertEqual(len(client.operations), expected[p])
            for name, operation in client.operations.items():
                self.assertTrue(operation["supported"])
                snake = re.sub(r"(?<!^)(?=[A-Z])", "_", name).lower()
                self.assertIn(snake, cls.__dict__)
                self.assertIn(
                    "return",
                    inspect.signature(getattr(cls, snake)).annotations
                    if hasattr(inspect.signature(getattr(cls, snake)), "annotations")
                    else getattr(cls, snake).__annotations__,
                )
                self.assertTrue(operation["source"].startswith("https://"))
        schema = ExaClient("fixture").schema("search")
        self.assertIn("components", schema["document"])
        schema["operation"]["base"] = "https://evil.example"
        self.assertEqual(
            ExaClient("fixture").schema("search")["operation"]["base"], "https://api.exa.ai"
        )

    def test_path_encoding_and_no_traversal(self):
        t = Capture()
        client = ExaClient("fixture", transport=t)
        client.get_agent_run(path={"id": "a/b ?#"})
        self.assertIn("a%2Fb%20%3F%23", t.calls[0].url)
        for path in [
            {"id": ".."},
            {"id": "%2e%2e"},
            {"id": "."},
            {"id": ""},
            {"id": True},
            {"id": "ok", "extra": "evil"},
            {},
        ]:
            self.assert_code("invalid_request", lambda: client.get_agent_run(path=path))

    def test_query_arrays_deep_object_and_credentials(self):
        t = Capture()
        client = BraveClient("fixture", transport=t)
        client.search(
            query={"q": "a & b", "result_filter": ["web", "news"], "goggles": ["g1", "g2"]}
        )
        query = parse_qs(urlsplit(t.calls[0].url).query)
        self.assertEqual(query["result_filter"], ["web,news"])
        self.assertEqual(query["goggles"], ["g1", "g2"])
        t = Capture()
        SerperClient("fixture", transport=t).search_get(query={"q": "q"})
        self.assertEqual(parse_qs(urlsplit(t.calls[0].url).query)["apiKey"], ["fixture"])
        client = SerpapiClient("fixture", transport=t)
        for q in [
            {"engine": "google", "api_key": "evil"},
            {"engine": "google", "output": "html"},
            {"engine": "google", "async": True, "no_cache": True},
        ]:
            self.assert_code("invalid_request", lambda: client.search(query=q))
        for h in [
            {"authorization": "evil"},
            {"Host": "evil"},
            {"x-api-key": "evil"},
            {"X-Other": "bad\nvalue"},
        ]:
            self.assert_code(
                "invalid_request",
                lambda: BraveClient("fixture", transport=t).search(query={"q": "q"}, headers=h),
            )

    def test_separate_team_credential_and_keyless_access(self):
        t = Capture()
        client = ExaClient("regular", team_api_key="team", transport=t)
        client.list_api_keys()
        self.assertTrue(t.calls[0].url.startswith("https://admin-api.exa.ai/team-management/"))
        self.assertEqual(t.calls[0].headers["x-api-key"], "team")
        self.assert_code("configuration", lambda: ExaClient("regular", transport=t).list_api_keys())
        client = TavilyClient(access_mode="keyless", transport=t)
        client.search(body={"query": "q"})
        self.assertEqual(t.calls[-1].headers["X-Tavily-Access-Mode"], "keyless")
        self.assert_code("configuration", lambda: client.get_usage())

    def test_logo_binding_is_embedding_only_and_head(self):
        t = Capture(HttpResponse(200, {"ETag": "fixture"}, b""))
        client = ContextClient("fixture", transport=t)
        q = {
            "publicClientId": "public-id",
            "domain": "example.com",
            "theme": "dark",
            "type": "icon",
        }
        response = client.logo_url(query=q)
        self.assertEqual(len(t.calls), 0)
        self.assertTrue(response.data.startswith("https://logos.context.dev/?"))
        self.assertEqual(parse_qs(urlsplit(response.data).query)["domain"], ["example.com"])
        raw = client.head_logo(query=q).data
        self.assertIsInstance(raw, RawResponse)
        self.assertEqual(raw.headers["ETag"], "fixture")
        self.assertNotIn("Authorization", t.calls[0].headers)
        self.assertEqual(t.calls[0].method, "HEAD")
        self.assert_code("invalid_request", lambda: client.logo_url(query={**q, "extra": "x"}))

    def test_external_x402_binding_never_signs_or_adds_provider_key(self):
        t = Capture()
        client = TavilyClient("provider-key", transport=t, retry=RetryPolicy(2, 1, 1))
        client.paid_search(
            body={"query": "q", "search_depth": "advanced"},
            headers={"PAYMENT-SIGNATURE": "external-signature"},
        )
        req = t.calls[0]
        self.assertEqual(req.url, "https://x402.tavily.com/search")
        self.assertEqual(req.headers["PAYMENT-SIGNATURE"], "external-signature")
        self.assertNotIn("Authorization", req.headers)
        self.assertNotIn("provider-key", repr(req))
        raw = client.get_payment_pricing().data
        self.assertIsInstance(raw, RawResponse)
        self.assertEqual(t.calls[-1].url, "https://x402.tavily.com/.well-known/pricing")

    def test_text_bytes_empty_and_raw_body(self):
        t = Capture(HttpResponse(200, {}, b"<html>fixture</html>"))
        client = TinyfishClient("fixture", transport=t)
        self.assertEqual(
            client.get_step_html(path={"id": "run", "stepId": "step"}).data, "<html>fixture</html>"
        )
        t.response = HttpResponse(200, {}, b"\x89PNG\x00")
        self.assertEqual(
            client.get_step_screenshot(path={"id": "run", "stepId": "step"}).data, b"\x89PNG\x00"
        )
        t.response = HttpResponse(204, {}, b"")
        self.assertIsNone(client.delete_browser_session(path={"sessionId": "s"}).data)
        t.response = HttpResponse(204, {}, b"invalid")
        self.assert_code(
            "invalid_response", lambda: client.delete_browser_session(path={"sessionId": "s"})
        )
        t = Capture()
        ContextClient("fixture", transport=t).parse(
            raw_body=b"document", headers={"Content-Type": "application/pdf"}
        )
        self.assertEqual(t.calls[0].body, b"document")
        self.assertEqual(t.calls[0].headers["Content-Type"], "application/pdf")

    def test_multipart_is_real_bounded_caller_content(self):
        t = Capture()
        client = FirecrawlClient("fixture", transport=t)
        client.parse_file(
            raw_body=MultipartBody(
                {"file": NativeFile("fixture.txt", b"hello", "text/plain"), "mode": "fast"}
            )
        )
        req = t.calls[0]
        self.assertEqual(req.url, "https://api.firecrawl.dev/v2/parse")
        self.assertTrue(req.headers["Content-Type"].startswith("multipart/form-data; boundary="))
        self.assertIn(b'name="file"; filename="fixture.txt"', req.body)
        self.assertIn(b"\r\nhello\r\n", req.body)
        client = SerpapiClient("fixture-key", transport=t)
        client.upload_image(raw_body=MultipartBody({"image": NativeFile("image.png", b"png")}))
        self.assertIn(b'name="api_key"\r\n\r\nfixture-key', t.calls[-1].body)
        self.assert_code(
            "invalid_request",
            lambda: client.upload_image(raw_body=MultipartBody({"image": b"x", "api_key": "evil"})),
        )
        self.assert_code(
            "invalid_request",
            lambda: client.upload_image(
                raw_body=MultipartBody({"image": NativeFile('bad"\r\nname', b"x")})
            ),
        )

    def test_native_retry_explicit_replay_safety(self):
        calls = []

        def transport(req, c):
            calls.append(req)
            return HttpResponse(503 if len(calls) == 1 else 200, {}, b"{}")

        client = ExaClient("fixture", transport=transport, retry=RetryPolicy(1, 1, 1))
        client.get_agent_run(path={"id": "r"})
        self.assertEqual(len(calls), 2)
        calls.clear()
        self.assert_code("unavailable", lambda: client.search(body={"query": "q"}))
        self.assertEqual(len(calls), 1)

    def test_sse_chunk_boundaries_comments_multiline_and_incomplete_tail(self):
        content = "\ufeff:heartbeat\r\nid: event-1\r\nevent: source\r\ndata: 日本\r\ndata: second\r\nretry: 12\r\n\r\ndata: done\n\ndata: discarded"
        data = content.encode()
        chunks = [data[i : i + 1] for i in range(len(data))]
        t = Capture(HttpResponse(200, {"Content-Type": "text/event-stream"}, chunks))
        response = ExaClient("fixture", transport=t).answer_stream(body={"query": "q"})
        events = list(response.data)
        self.assertEqual(len(events), 2)
        self.assertEqual(events[0].data, "日本\nsecond")
        self.assertEqual(events[0].event, "source")
        self.assertEqual(events[0].id, "event-1")
        self.assertEqual(events[0].retry, 12)
        self.assertEqual(events[1].id, "event-1")
        self.assertIsNone(events[1].retry)
        self.assertTrue(json.loads(t.calls[0].body)["stream"])

    def test_stream_close_timeout_cancel_and_concurrency_release(self):
        closed = threading.Event()

        def transport(req, c):
            return HttpResponse(
                200, {"content-type": "text/event-stream"}, b"data: ok\n\n", closed.set
            )

        client = ExaClient("fixture", transport=transport, timeout_ms=30, max_concurrency=1)
        stream = client.answer_stream(body={"query": "q"}).data
        self.assertTrue(closed.wait(0.2))
        self.assert_code("timeout", lambda: next(stream))
        token = CancellationToken()
        closed.clear()
        stream = client.answer_stream(body={"query": "q"}, timeout_ms=1000, cancellation=token).data
        token.cancel()
        self.assertTrue(closed.wait(0.1))
        self.assert_code("aborted", lambda: next(stream))
        stream = client.answer_stream(body={"query": "q"}, timeout_ms=1000).data
        stream.close()
        stream.close()
        self.assertEqual(list(stream), [])
        with client.answer_stream(body={"query": "q"}, timeout_ms=1000).data as s:
            self.assertEqual(next(s).data, "ok")

    def test_stream_limits_content_type_and_stalled_body(self):
        client = ExaClient("fixture", transport=lambda r, c: HttpResponse(200, {}, b"data: hi\n\n"))
        self.assert_code("invalid_response", lambda: client.answer_stream(body={"query": "q"}))
        client = ExaClient(
            "fixture",
            max_response_bytes=10,
            transport=lambda r, c: HttpResponse(
                200, {"content-type": "text/event-stream"}, b"data: too long\n\n"
            ),
        )
        self.assert_code(
            "invalid_response", lambda: list(client.answer_stream(body={"query": "q"}).data)
        )
        gate = threading.Event()

        def body():
            gate.wait(0.3)
            yield b"data: late\n\n"

        client = ExaClient(
            "fixture",
            timeout_ms=20,
            transport=lambda r, c: HttpResponse(200, {"content-type": "text/event-stream"}, body()),
        )
        try:
            self.assert_code(
                "timeout", lambda: next(client.answer_stream(body={"query": "q"}).data)
            )
        finally:
            gate.set()

    def test_unknown_and_incompatible_native_options_fail_before_dispatch(self):
        t = Capture()
        client = ExaClient("fixture", transport=t)
        self.assert_code("unsupported_option", lambda: client.request("invented"))
        self.assert_code(
            "unsupported_option", lambda: client.search(body={"query": "q", "stream": True})
        )
        self.assert_code("invalid_request", lambda: client.search_stream(body={"query": "q"}))
        self.assert_code(
            "invalid_request", lambda: client.request("search", body={"query": "q"}, raw_body=b"x")
        )
        self.assertEqual(t.calls, [])

    def test_default_https_transport_closes_and_never_redirects(self):
        class Response:
            status = 302

            def getheaders(self):
                return [("Location", "https://evil.example")]

            def read1(self, n):
                return b""

        class Connection:
            def __init__(self, *args, **kwargs):
                self.calls = []
                self.closed = False

            def request(self, *args, **kwargs):
                self.calls.append((args, kwargs))

            def getresponse(self):
                return Response()

            def close(self):
                self.closed = True

        connection = Connection()
        with patch("http.client.HTTPSConnection", return_value=connection) as make:
            c = CallContext(time.monotonic() + 1)
            response = https_transport(
                HttpRequest(
                    "GET", "https://example.com/exact?q=a%20b", {"Authorization": "Bearer fixture"}
                ),
                c,
            )
            self.assertEqual(response.status, 302)
            self.assertEqual(len(connection.calls), 1)
            self.assertEqual(connection.calls[0][0][:2], ("GET", "/exact?q=a%20b"))
            c.close()
            self.assertTrue(connection.closed)
            self.assertEqual(make.call_count, 1)


class NativeAsyncTests(unittest.IsolatedAsyncioTestCase):
    async def test_typed_async_client_and_stream(self):
        client = AsyncExaClient("fixture", transport=Capture())
        self.assertEqual((await client.search(body={"query": "q"})).data, {"native": True})
        client = AsyncExaClient(
            "fixture",
            transport=lambda r, c: HttpResponse(
                200, {"content-type": "text/event-stream"}, b"data: hi\n\n"
            ),
        )
        response = await client.answer_stream(body={"query": "q"})
        async with response.data as stream:
            events = [event async for event in stream]
        self.assertEqual(events[0].data, "hi")

    async def test_cancel_async_stream_read_closes_connection(self):
        gate = threading.Event()
        closed = threading.Event()
        entered = threading.Event()

        def body():
            entered.set()
            gate.wait(0.5)
            yield b"data: late\n\n"

        client = AsyncExaClient(
            "fixture",
            transport=lambda r, c: HttpResponse(
                200, {"content-type": "text/event-stream"}, body(), closed.set
            ),
        )
        stream = (await client.answer_stream(body={"query": "q"})).data
        task = asyncio.create_task(anext(stream))
        await asyncio.to_thread(entered.wait, 0.2)
        task.cancel()
        try:
            with self.assertRaises(asyncio.CancelledError):
                await task
            self.assertTrue(closed.wait(0.1))
        finally:
            gate.set()
            stream.close()


class CatalogDispatchTests(unittest.TestCase):
    def test_every_retained_operation_dispatches_its_supported_mode(self):
        """Inventory-wide transport smoke, in addition to independent native wire fixtures.

        This establishes reachable bindings and decoding, not provider validation of
        these minimal synthetic bodies or live provider correctness.
        """
        protected = {"authorization", "x-api-key", "x-subscription-token"}
        for entry in _catalog()["operations"]:
            with self.subTest(provider=entry["provider"], operation=entry["name"]):
                mode = entry["response"]
                payload = (
                    b"data: fixture\n\n"
                    if mode == "sse"
                    else b"{}"
                    if mode in ("json", "raw")
                    else b""
                    if mode == "empty" or entry["name"] == "revokeAuthToken"
                    else b"fixture"
                )
                calls = []

                def transport(req, c):
                    calls.append(req)
                    return HttpResponse(
                        200,
                        {
                            "Content-Type": "text/event-stream"
                            if mode == "sse"
                            else "application/json"
                        },
                        payload,
                    )

                client = NativeClient(
                    entry["provider"],
                    "fixture",
                    team_api_key="team" if entry["provider"] == "exa" else None,
                    transport=transport,
                )
                import re

                path = {
                    key: "fixture"
                    for key in re.findall(r"\{([A-Za-z][A-Za-z0-9_]*)\}", entry["path"])
                }
                query = {}
                header = {}
                kwargs = {}
                for param in entry.get("parameters", []):
                    if not param.get("required"):
                        continue
                    where = param.get("in")
                    name = param["name"]
                    if where == "path":
                        path[name] = "fixture"
                    elif where == "query":
                        query[name] = "fixture"
                    elif (
                        where == "header"
                        and name.lower() not in protected
                        and name.lower() not in {k.lower() for k in entry.get("headers", {})}
                    ):
                        header[name] = "fixture"
                if entry.get("bodySchema") is not None or entry.get("bodyRequired"):
                    kwargs["body"] = {}
                if entry["name"] == "searchStream" and entry["provider"] == "exa":
                    kwargs["body"] = {"query": "q", "outputSchema": {"type": "object"}}
                if entry.get("multipart"):
                    kwargs.pop("body", None)
                    kwargs["raw_body"] = MultipartBody(
                        {
                            "file": NativeFile("fixture.txt", b"fixture"),
                            "image": NativeFile("image.png", b"fixture"),
                        }
                    )
                elif entry.get("raw"):
                    kwargs.pop("body", None)
                    kwargs["raw_body"] = b"fixture"
                if entry.get("supplemental") and entry["provider"] == "context":
                    query = {"publicClientId": "public", "domain": "example.com"}
                if entry["provider"] == "serpapi":
                    if entry["name"].startswith("search"):
                        query["engine"] = "google"
                    if entry["name"] == "google":
                        query["q"] = "q"
                    if entry["name"] in ("extract", "extractMarkdown"):
                        query["url"] = "https://example.com"
                response = client.request(
                    entry["name"], path=path, query=query, headers=header, **kwargs
                )
                if mode == "embedding-url":
                    self.assertEqual(calls, [])
                else:
                    self.assertEqual(calls[0].method, entry["method"])
                    self.assertTrue(calls[0].url.startswith(entry["base"] + "/"))
                if mode == "sse":
                    with response.data as stream:
                        self.assertEqual(next(stream).data, "fixture")

    def test_request_and_response_limits_apply_to_native_uploads(self):
        calls = []

        def transport(req, c):
            calls.append(req)
            return HttpResponse(200, {}, b"{}")

        client = ContextClient("fixture", transport=transport, max_request_bytes=8)
        with self.assertRaises(SearchError) as got:
            client.parse(raw_body=b"too much content")
        self.assertEqual(got.exception.code, "invalid_request")
        self.assertEqual(calls, [])
        client = FirecrawlClient("fixture", transport=transport, max_request_bytes=100)
        with self.assertRaises(SearchError) as got:
            client.parse_file(raw_body=MultipartBody({"file": NativeFile("file", b"x" * 200)}))
        self.assertEqual(got.exception.code, "invalid_request")
        self.assertEqual(calls, [])
        client = ExaClient(
            "fixture",
            transport=lambda r, c: HttpResponse(200, {}, b"{}" * 100),
            max_response_bytes=10,
        )
        with self.assertRaises(SearchError) as got:
            client.search(body={"query": "q"})
        self.assertEqual(got.exception.code, "invalid_response")


class NativeBodyTests(unittest.TestCase):
    def test_json_arrays_and_explicit_null_are_preserved(self):
        t = Capture(HttpResponse.json(None))
        client = SerperClient("fixture", transport=t)
        self.assertIsNone(client.request("search", body=None).data)
        self.assertEqual(t.calls[0].body, b"null")
        client.search(body=[{"q": "first"}, {"q": "second"}])
        self.assertEqual(json.loads(t.calls[1].body), [{"q": "first"}, {"q": "second"}])
        t = Capture()
        PerplexityClient("fixture", transport=t).generate_auth_token()
        self.assertIsNone(t.calls[0].body)

    def test_cleanup_exception_does_not_replace_sanitized_error(self):
        def close():
            raise RuntimeError("private cleanup exception")

        client = ExaClient(
            "fixture", transport=lambda r, c: HttpResponse(401, {}, b"private", close)
        )
        with self.assertRaises(SearchError) as got:
            client.search(body={"query": "q"})
        self.assertEqual(got.exception.code, "auth")
        self.assertNotIn("private", repr(got.exception))

    def test_nonfinite_or_huge_native_query_rejected_before_dispatch(self):
        t = Capture()
        client = SerpapiClient("fixture", transport=t)
        for value in [float("inf"), 10**1000]:
            with self.assertRaises(SearchError) as got:
                client.search(query={"engine": "google", "start": value})
            self.assertEqual(got.exception.code, "invalid_request")
        self.assertEqual(t.calls, [])

    def test_large_sse_line_split_across_tiny_chunks(self):
        content = b"data: " + b"x" * 100000 + b"\n\n"
        chunks = (content[index : index + 7] for index in range(0, len(content), 7))
        client = ExaClient(
            "fixture",
            transport=lambda r, c: HttpResponse(200, {"Content-Type": "text/event-stream"}, chunks),
        )
        with client.answer_stream(body={"query": "q"}).data as stream:
            self.assertEqual(len(next(stream).data), 100000)
            self.assertEqual(list(stream), [])
