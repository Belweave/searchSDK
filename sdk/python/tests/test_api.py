"""The public API: first use, keys, cancellation, immutability, and Python-specific input rules."""

from __future__ import annotations

from . import guard as _guard  # noqa: F401

import asyncio
import datetime
import json
import os
import pickle
import socket
import threading
import time
import traceback
import unittest
import urllib.request
from collections.abc import AsyncIterator, Iterator
from typing import Any
from unittest import mock

import searchsdk
from searchsdk import AsyncClient, CancelToken, Client, HttpRequest, SearchError

from .guard import NetworkBlocked


class _Reply:
    def __init__(self, body: Any, status: int = 200) -> None:
        self.status = status
        self.headers: list[tuple[str, str]] = [("content-type", "application/json")]
        self._data = json.dumps(body).encode()

    def iter_bytes(self) -> Iterator[bytes]:
        yield self._data

    async def aiter_bytes(self) -> AsyncIterator[bytes]:
        yield self._data

    def close(self) -> None:
        pass

    async def aclose(self) -> None:
        pass


class Fixed:
    """A transport that answers every request with the same body (sync and async)."""

    def __init__(self, body: Any, status: int = 200) -> None:
        self.body, self.status = body, status
        self.requests: list[HttpRequest] = []

    def send(self, request: HttpRequest, *, timeout: float, cancel: CancelToken) -> _Reply:
        self.requests.append(request)
        return _Reply(self.body, self.status)

    def close(self) -> None:
        pass


class AsyncFixed(Fixed):
    async def send(self, request: HttpRequest, *, timeout: float, cancel: CancelToken) -> _Reply:  # type: ignore[override]
        self.requests.append(request)
        return _Reply(self.body, self.status)

    async def aclose(self) -> None:
        pass


ONE = {"results": [{"url": "https://a.example/", "title": "A", "publishedDate": "2025-03-01"}]}


class FirstUse(unittest.TestCase):
    def test_four_lines_sync(self) -> None:
        with Client(keys={"exa": "test-key"}, transport=Fixed(ONE)) as client:
            response = client.search("hello", provider="exa")
        self.assertEqual(response.provider, "exa")
        self.assertEqual(response.results[0].title, "A")
        self.assertEqual(response.results[0].published_at, "2025-03-01T00:00:00.000Z")
        self.assertEqual(response.cost.source, "computed")

    def test_four_lines_async(self) -> None:
        async def main() -> searchsdk.SearchResponse:
            async with AsyncClient(keys={"exa": "test-key"}, transport=AsyncFixed(ONE)) as client:
                return await client.search("hello", provider="exa")

        self.assertEqual(asyncio.run(main()).results[0].url, "https://a.example/")

    def test_to_json_is_the_shared_shape(self) -> None:
        response = Client(keys={"exa": "k"}, transport=Fixed(ONE)).search("q", provider="exa")
        shape = response.to_json()
        self.assertEqual(sorted(shape), ["attempts", "cost", "latencyMs", "provider", "raw", "requestId", "results", "warnings"])
        self.assertEqual(shape["results"][0]["publishedAt"], "2025-03-01T00:00:00.000Z")
        self.assertEqual(shape["attempts"][0]["billed"], "yes")
        self.assertNotIn("code", shape["attempts"][0])

    def test_the_module_search_reads_the_documented_variable_and_uses_the_real_transport(self) -> None:
        with mock.patch.dict(os.environ, {"EXA_API_KEY": "test-key-from-env"}):
            with self.assertRaises(SearchError) as caught:
                searchsdk.search("q", provider="exa")
        self.assertEqual(caught.exception.code, "network")  # the guard blocked DNS

    def test_the_module_asearch_uses_the_real_async_transport(self) -> None:
        with mock.patch.dict(os.environ, {"EXA_API_KEY": "test-key-from-env"}):
            with self.assertRaises(SearchError) as caught:
                asyncio.run(searchsdk.asearch("q", provider="exa"))
        self.assertEqual(caught.exception.code, "network")


class Guard(unittest.TestCase):
    def test_the_network_guard_blocks_real_calls(self) -> None:
        with self.assertRaises(NetworkBlocked):
            socket.create_connection(("example.com", 443))
        with self.assertRaises(NetworkBlocked):
            socket.getaddrinfo("example.com", 443)
        with socket.socket() as sock, self.assertRaises(NetworkBlocked):
            sock.connect(("93.184.215.14", 443))
        with self.assertRaises(Exception):
            urllib.request.urlopen("https://example.com", timeout=1)

        async def connect() -> None:
            await asyncio.open_connection("example.com", 443)

        with self.assertRaises(NetworkBlocked):
            asyncio.run(connect())
        udp = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        try:
            with self.assertRaises(NetworkBlocked):
                udp.sendto(b"x", ("8.8.8.8", 53))
        finally:
            udp.close()


class Keys(unittest.TestCase):
    SECRET = "sk-test-secret-never-printed"

    def test_keys_never_appear_in_responses_errors_or_the_client(self) -> None:
        client = Client(keys={"exa": self.SECRET}, transport=Fixed({"results": []}))
        response = client.search("q", provider="exa")
        for text in (repr(response), json.dumps(response.to_json()), repr(client), repr(vars(client)), repr(Fixed(1).requests)):
            self.assertNotIn(self.SECRET, text)
        failing = Client(keys={"exa": self.SECRET}, transport=Fixed({"error": f"bad key {self.SECRET}"}, status=401))
        with self.assertRaises(SearchError) as caught:
            failing.search("q", provider="exa")
        err = caught.exception
        for text in (str(err), repr(err), "".join(traceback.format_exception(type(err), err, err.__traceback__)), repr(vars(err)), repr(pickle.loads(pickle.dumps(err)))):
            self.assertNotIn(self.SECRET, text)
        self.assertEqual(pickle.loads(pickle.dumps(err)).code, "auth")

    def test_a_request_repr_hides_headers_and_query(self) -> None:
        request = HttpRequest("GET", f"https://api.example.com/s?key={self.SECRET}", {"x-api-key": self.SECRET})
        self.assertNotIn(self.SECRET, repr(request))

    def test_caller_keys_are_copied(self) -> None:
        keys = {"exa": "test-key"}
        client = Client(keys=keys, transport=Fixed({"results": []}))
        keys["exa"] = "bad key with spaces"
        client.search("q", provider="exa")


class Registry(unittest.TestCase):
    def test_the_exported_registry_and_policy_are_read_only(self) -> None:
        exa: Any = searchsdk.registry["exa"]
        with self.assertRaises(TypeError):
            exa["search"]["request"]["url"] = "https://attacker.example/collect"
        with self.assertRaises(TypeError):
            searchsdk.registry["evil"] = exa  # type: ignore[index]
        with self.assertRaises(TypeError):
            searchsdk.policy["retry"]["maxRetries"] = 99
        with self.assertRaises(AttributeError):
            searchsdk.policy["fallbackOn"].append("auth")
        self.assertEqual(searchsdk.registry["exa"]["search"]["request"]["url"], "https://api.exa.ai/search")

    def test_a_custom_registry_is_copied(self) -> None:
        from searchsdk._json import thaw

        custom = {"exa": thaw(searchsdk.registry["exa"])}
        transport = Fixed({"results": []})
        client = Client(registry=custom, keys={"exa": "k"}, transport=transport)
        custom["exa"]["search"]["request"]["url"] = "https://attacker.example/collect"
        client.search("q", provider="exa")
        self.assertEqual(transport.requests[0].url, "https://api.exa.ai/search")

    def test_a_custom_registry_is_validated(self) -> None:
        from searchsdk._json import thaw

        bad = {"exa": thaw(searchsdk.registry["exa"])}
        bad["exa"]["search"]["request"]["url"] = "http://insecure.example/search"
        registries: list[Any] = [bad, {"other": thaw(searchsdk.registry["exa"])}, {"exa": {"id": "exa", "x": float("nan")}}, []]
        for registry in registries:
            with self.assertRaises(SearchError) as caught:
                Client(registry=registry)
            self.assertEqual((caught.exception.code, caught.exception.field), ("configuration", "registry"))


class PythonInputs(unittest.TestCase):
    def client(self) -> tuple[Client, Fixed]:
        transport = Fixed({"results": []})
        return Client(keys={"exa": "k"}, transport=transport, provider="exa"), transport

    def rejects(self, field: str, **options: Any) -> None:
        client, transport = self.client()
        with self.assertRaises(SearchError) as caught:
            client.search("q", **options)
        self.assertEqual((caught.exception.code, caught.exception.field), ("invalid_request", field))
        self.assertEqual(transport.requests, [])

    def test_unknown_keyword_arguments_raise_search_error(self) -> None:
        self.rejects("max_result", max_result=5)

    def test_bool_and_float_are_not_integers(self) -> None:
        self.rejects("max_results", max_results=True)
        self.rejects("max_results", max_results=5.0)
        self.rejects("timeout_ms", timeout_ms=1000.0)

    def test_dates_accept_date_objects_but_not_datetimes(self) -> None:
        client, transport = self.client()
        client.search("q", start_date=datetime.date(2024, 2, 29))
        self.assertIn(b'"startPublishedDate":"2024-02-29T00:00:00.000Z"', transport.requests[0].body or b"")
        self.rejects("start_date", start_date=datetime.datetime(2024, 2, 29, 12))

    def test_tuples_are_lists_and_none_means_unset(self) -> None:
        client, transport = self.client()
        client.search("q", include_domains=("a.example",), max_results=None, recency=None)
        self.assertIn(b'"includeDomains":["a.example"]', transport.requests[0].body or b"")

    def test_provider_options_must_be_json(self) -> None:
        for value in (float("nan"), float("inf"), {1: "x"}, {"a": {1, 2}}, b"x"):
            self.rejects("provider_options.exa.contents", provider_options={"exa": {"contents": value}})

    def test_the_kelvin_sign_is_not_a_k(self) -> None:
        self.rejects("include_domains", include_domains=["\u212aexample.com"])

    def test_a_cancel_that_is_not_a_token(self) -> None:
        self.rejects("cancel", cancel=threading.Event())


class _Blocking:
    """A transport that waits until it is cancelled or its timeout passes, as a real socket would."""

    def __init__(self) -> None:
        self.started = threading.Event()

    def send(self, request: HttpRequest, *, timeout: float, cancel: CancelToken) -> _Reply:
        woke = threading.Event()
        cancel.subscribe(woke.set)
        self.started.set()
        if woke.wait(timeout):
            raise ConnectionAbortedError("cancelled")
        raise TimeoutError("timed out")

    def close(self) -> None:
        pass


class _Hanging:
    async def send(self, request: HttpRequest, *, timeout: float, cancel: CancelToken) -> _Reply:
        await asyncio.sleep(3600)
        raise AssertionError("unreachable")

    async def aclose(self) -> None:
        pass


class Cancellation(unittest.TestCase):
    def test_a_token_cancels_a_sync_call_from_another_thread(self) -> None:
        transport = _Blocking()
        token = CancelToken()
        client = Client(keys={"exa": "k"}, transport=transport)

        def cancel_when_started() -> None:
            transport.started.wait(5)
            token.cancel()

        threading.Thread(target=cancel_when_started).start()
        started = time.monotonic()
        with self.assertRaises(SearchError) as caught:
            client.search("q", provider="exa", cancel=token, timeout_ms=10_000)
        self.assertLess(time.monotonic() - started, 5)
        self.assertEqual(caught.exception.code, "aborted")
        self.assertEqual(caught.exception.attempts[0].billed, "possible")

    def test_a_real_deadline_ends_a_sync_call(self) -> None:
        client = Client(keys={"exa": "k"}, transport=_Blocking())
        with self.assertRaises(SearchError) as caught:
            client.search("q", provider="exa", timeout_ms=100)
        self.assertEqual(caught.exception.code, "timeout")

    def test_cancelling_the_task_raises_cancelled_error_promptly(self) -> None:
        async def main() -> None:
            client = AsyncClient(keys={"exa": "k"}, transport=_Hanging())
            task = asyncio.create_task(client.search("q", provider="exa"))
            await asyncio.sleep(0.05)
            task.cancel()
            with self.assertRaises(asyncio.CancelledError):
                await task

        asyncio.run(asyncio.wait_for(main(), 5))

    def test_asyncio_timeout_composes(self) -> None:
        async def main() -> None:
            client = AsyncClient(keys={"exa": "k"}, transport=_Hanging())
            with self.assertRaises(asyncio.TimeoutError):
                await asyncio.wait_for(client.search("q", provider="exa"), 0.05)

        asyncio.run(main())

    def test_a_token_cancels_an_async_call_with_aborted(self) -> None:
        async def main() -> None:
            token = CancelToken()
            client = AsyncClient(keys={"exa": "k"}, transport=_Hanging())
            asyncio.get_running_loop().call_later(0.05, token.cancel)
            with self.assertRaises(SearchError) as caught:
                await client.search("q", provider="exa", cancel=token)
            self.assertEqual(caught.exception.code, "aborted")

        asyncio.run(asyncio.wait_for(main(), 5))

    def test_a_real_deadline_ends_an_async_call(self) -> None:
        async def main() -> None:
            client = AsyncClient(keys={"exa": "k"}, transport=_Hanging())
            with self.assertRaises(SearchError) as caught:
                await client.search("q", provider="exa", timeout_ms=50)
            self.assertEqual(caught.exception.code, "timeout")

        asyncio.run(asyncio.wait_for(main(), 5))


class Concurrency(unittest.TestCase):
    def test_threads_share_a_client_and_keep_their_own_attempts(self) -> None:
        client = Client(keys={"exa": "k"}, transport=Fixed({"results": []}))
        out: list[int] = []
        threads = [threading.Thread(target=lambda: out.append(len(client.search("q", provider="exa").attempts))) for _ in range(8)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()
        self.assertEqual(out, [1] * 8)

    def test_gathered_async_calls_keep_their_own_attempts(self) -> None:
        async def main() -> list[int]:
            client = AsyncClient(keys={"exa": "k"}, transport=AsyncFixed({"results": []}))
            responses = await asyncio.gather(*(client.search(str(i), provider="exa") for i in range(8)))
            return [len(r.attempts) for r in responses]

        self.assertEqual(asyncio.run(main()), [1] * 8)


class Errors(unittest.TestCase):
    def test_a_transport_that_raises_is_a_network_error(self) -> None:
        class Broken:
            def send(self, request: HttpRequest, *, timeout: float, cancel: CancelToken) -> Any:
                raise TypeError("boom")

            def close(self) -> None:
                pass

        with self.assertRaises(SearchError) as caught:
            Client(keys={"exa": "k"}, transport=Broken()).search("q", provider="exa")
        self.assertEqual(caught.exception.code, "network")
        self.assertIsNone(caught.exception.__cause__)


if __name__ == "__main__":
    unittest.main()
