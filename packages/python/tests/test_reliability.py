import asyncio
import gzip
import threading
import time
import traceback
import unittest
from searchsdk import (
    Capabilities,
    CancellationToken,
    GatewayClient,
    HttpResponse,
    ProviderResponse,
    RetryPolicy,
    SearchClient,
    SearchError,
    exa,
)


class Stub:
    capabilities = Capabilities(True, 2000, 2000)

    def __init__(self, name="fixture", action=None):
        self.id = name
        self.calls = 0
        self.action = action

    def search(self, request, context):
        self.calls += 1
        if self.action:
            return self.action(request, context)
        return ProviderResponse(())


def fail(code, **kwargs):
    def action(*_):
        raise SearchError(code, **kwargs)

    return action


class ReliabilityTests(unittest.TestCase):
    def assert_code(self, code, fn):
        with self.assertRaises(SearchError) as got:
            fn()
        self.assertEqual(got.exception.code, code)
        return got.exception

    def test_retry_then_fallback_transient_only(self):
        primary = Stub("primary", fail("unavailable", status=503))
        backup = Stub("backup")
        response = SearchClient(primary, fallback=[backup], retry=RetryPolicy(1, 1, 1)).search("q")
        self.assertEqual(primary.calls, 2)
        self.assertEqual(backup.calls, 1)
        self.assertEqual([a.outcome for a in response.attempts], ["error", "error", "success"])
        self.assertEqual(response.warnings[0].code, "fallback_used")
        for code in ["auth", "invalid_response", "provider_error", "invalid_request"]:
            a, b = Stub("a", fail(code)), Stub("b")
            error = self.assert_code(
                code, lambda: SearchClient(a, fallback=[b], retry=RetryPolicy(2, 1, 1)).search("q")
            )
            self.assertEqual(a.calls, 1)
            self.assertEqual(b.calls, 0)
            self.assertEqual(len(error.attempts), 1)

    def test_retry_after_not_shortened(self):
        primary = Stub(action=fail("rate_limit", retry_after_ms=5000))
        started = time.monotonic()
        self.assert_code(
            "timeout",
            lambda: SearchClient(primary, timeout_ms=30, retry=RetryPolicy(1, 1, 1)).search("q"),
        )
        self.assertLess(time.monotonic() - started, 0.2)
        self.assertEqual(primary.calls, 1)

    def test_attempt_timeout_can_fallback(self):
        gate = threading.Event()
        primary = Stub("a", lambda *_: (gate.wait(1), ProviderResponse(()))[1])
        try:
            response = SearchClient(
                primary,
                fallback=[Stub("b")],
                timeout_ms=300,
                attempt_timeout_ms=20,
                max_concurrency=2,
            ).search("q")
            self.assertEqual(response.provider, "b")
            self.assertEqual(response.attempts[0].code, "attempt_timeout")
        finally:
            gate.set()

    def test_whole_deadline_bounds_uncooperative_work(self):
        gate = threading.Event()
        p = Stub(action=lambda *_: (gate.wait(1), ProviderResponse(()))[1])
        try:
            started = time.monotonic()
            self.assert_code("timeout", lambda: SearchClient(p, timeout_ms=20).search("q"))
            self.assertLess(time.monotonic() - started, 0.3)
        finally:
            gate.set()

    def test_timed_out_worker_retains_concurrency_permit(self):
        gate = threading.Event()
        entered = threading.Event()

        def blocked(*_):
            entered.set()
            gate.wait(1)
            return ProviderResponse(())

        p = Stub(action=blocked)
        client = SearchClient(p, timeout_ms=20, max_concurrency=1)
        try:
            self.assert_code("timeout", lambda: client.search("one"))
            self.assertTrue(entered.is_set())
            self.assert_code("timeout", lambda: client.search("two"))
            self.assertEqual(p.calls, 1)
        finally:
            gate.set()

    def test_cancel_before_and_during_dispatch(self):
        token = CancellationToken()
        token.cancel()
        p = Stub()
        self.assert_code("aborted", lambda: SearchClient(p).search("q", cancellation=token))
        self.assertEqual(p.calls, 0)
        token = CancellationToken()
        gate = threading.Event()
        closed = threading.Event()

        def transport(req, c):
            c.on_close(closed.set)
            gate.set()
            while not token.cancelled:
                time.sleep(0.001)
            c.check()

        timer = threading.Timer(0.02, token.cancel)
        timer.start()
        try:
            self.assert_code(
                "aborted",
                lambda: SearchClient(exa("fixture", transport=transport)).search(
                    "q", cancellation=token
                ),
            )
            self.assertTrue(gate.is_set())
            self.assertTrue(closed.wait(0.1))
        finally:
            timer.cancel()

    def test_batch_order_siblings_bound_and_invalid(self):
        lock = threading.Lock()
        active = 0
        peak = 0

        def action(r, c):
            nonlocal active, peak
            with lock:
                active += 1
                peak = max(active, peak)
            try:
                c.sleep(0.005)
                if r.query == "bad":
                    raise SearchError("auth")
                return ProviderResponse(())
            finally:
                with lock:
                    active -= 1

        client = SearchClient(Stub(action=action), max_concurrency=2)
        out = client.search_batch(["one", "bad", {}, "four", "five"], concurrency=4)
        self.assertEqual([v.index for v in out], list(range(5)))
        self.assertEqual(
            [v.status for v in out], ["fulfilled", "rejected", "rejected", "fulfilled", "fulfilled"]
        )
        self.assertEqual(out[2].error.code, "invalid_request")
        self.assertLessEqual(peak, 2)

    def test_batch_deadline_and_cancellation_include_queue(self):
        p = Stub(action=lambda r, c: (time.sleep(0.04), c.check(), ProviderResponse(()))[2])
        out = SearchClient(p).search_batch(["q"] * 5, concurrency=1, timeout_ms=20)
        self.assertTrue(all(v.error.code == "timeout" for v in out))
        self.assertEqual(p.calls, 1)
        token = CancellationToken()
        token.cancel()
        out = SearchClient(Stub()).search_batch(["q"] * 3, cancellation=token)
        self.assertTrue(all(v.error.code == "aborted" for v in out))

    def test_response_size_compression_json_failures(self):
        for body, h in [
            (b'{"results":', {}),
            (b'{"results":NaN}', {}),
            (b"\xff", {}),
            (b"x" * 65, {}),
            (gzip.compress(b"x" * 10000), {"Content-Encoding": "gzip"}),
            (b"invalid", {"Content-Encoding": "gzip"}),
            (b"ok", {"Content-Encoding": "br"}),
        ]:
            with self.subTest(headers=h):
                closed = threading.Event()
                client = GatewayClient(
                    "https://app.example.com",
                    max_response_bytes=64,
                    transport=lambda r, c: HttpResponse(200, h, body, closed.set),
                )
                self.assert_code("invalid_response", lambda: client.search("q"))
                self.assertTrue(closed.is_set())

    def test_direct_auth_status_retry_after_and_redirect(self):
        for status, code in [
            (401, "auth"),
            (429, "rate_limit"),
            (503, "unavailable"),
            (302, "provider_error"),
        ]:
            calls = []

            def transport(r, c):
                calls.append(r)
                return HttpResponse(status, {"Retry-After": "2"}, b"secret provider body")

            error = self.assert_code(
                code,
                lambda: SearchClient(exa("secret-key", transport=transport)).search("secret query"),
            )
            self.assertEqual(error.retry_after_ms, 2000)
            self.assertEqual(len(calls), 1)
            self.assertNotIn("secret", repr(error))
            self.assertNotIn("secret", repr(calls[0]))
            self.assertNotIn("secret", str(error.attempts))

    def test_exception_text_and_traceback_sanitized(self):
        def transport(*_):
            raise RuntimeError("private-key private-query")

        with self.assertRaises(SearchError) as got:
            SearchClient(exa("private-key", transport=transport)).search("private-query")
        error = got.exception
        self.assertEqual(error.code, "network")
        self.assertNotIn("private-key", str(error))
        self.assertNotIn("private-key", repr(error))
        self.assertNotIn("private-key", "".join(traceback.format_exception(error)))

    def test_custom_provider_contract_is_enforced(self):
        for result in [
            {},
            {"results": [], "warnings": []},
            {"results": [], "warnings": [], "usage": {"unit": "usd", "value": -1}},
        ]:
            self.assert_code(
                "invalid_response", lambda: SearchClient(Stub(action=lambda *_: result)).search("q")
            )

    def test_configuration_and_batch_bounds(self):
        for config in [
            {"timeout_ms": 0},
            {"max_concurrency": 65},
            {"attempt_timeout_ms": True},
            {"retry": {}},
            {"fallback": [Stub()]},
        ]:
            self.assert_code("configuration", lambda: SearchClient(Stub(), **config))
        client = SearchClient(Stub())
        for requests, options in [
            (["q"] * 1001, {}),
            (["q"], {"concurrency": 0}),
            (["q"], {"timeout_ms": False}),
        ]:
            self.assert_code("invalid_request", lambda: client.search_batch(requests, **options))


class AsyncTests(unittest.IsolatedAsyncioTestCase):
    async def test_async_search_and_batch(self):
        client = SearchClient(Stub())
        self.assertEqual((await client.search_async("q")).provider, "fixture")
        out = await client.search_batch_async(["q", {}])
        self.assertEqual([v.status for v in out], ["fulfilled", "rejected"])

    async def test_asyncio_cancellation_closes_transport(self):
        entered = threading.Event()
        closed = threading.Event()

        def transport(r, c):
            c.on_close(closed.set)
            entered.set()
            while not closed.wait(0.005):
                c.check()
            c.check()

        client = SearchClient(exa("fixture", transport=transport))
        task = asyncio.create_task(client.search_async("q"))
        await asyncio.to_thread(entered.wait, 0.3)
        task.cancel()
        with self.assertRaises(asyncio.CancelledError):
            await task
        self.assertTrue(await asyncio.to_thread(closed.wait, 0.3))
