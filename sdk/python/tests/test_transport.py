"""Drives the real standard-library transports against a loopback server, so
deadlines, cancellation and broken connections are exercised on real sockets,
not only in the scripted harness."""

from __future__ import annotations

from . import guard as _guard  # noqa: F401

import asyncio
import socketserver
import threading
import unittest
from http.server import BaseHTTPRequestHandler
from typing import Any

from searchsdk import AsyncClient, AsyncStdlibTransport, CancelToken, Client, HttpRequest, SearchError, StdlibTransport
from searchsdk._transport import Response

RELEASE = threading.Event()
SEEN: list[dict[str, Any]] = []


class Handler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def log_message(self, *args: Any) -> None:
        pass

    def do_POST(self) -> None:
        body = self.rfile.read(int(self.headers.get("content-length", "0")))
        SEEN.append({"path": self.path, "headers": dict(self.headers), "body": body})
        if self.path.startswith("/whole"):
            data = b'{"results":[{"url":"https://a.example/","title":"A"}]}'
            self.send_response(200)
            self.send_header("content-type", "application/json")
            self.send_header("content-length", str(len(data)))
            self.end_headers()
            self.wfile.write(data)
            return
        if self.path.startswith("/redirect"):
            self.send_response(302)
            self.send_header("location", "https://elsewhere.example/")
            self.send_header("content-length", "0")
            self.end_headers()
            return
        self.send_response(200)
        self.send_header("content-type", "application/json")
        self.send_header("content-length", "1000")
        self.end_headers()
        self.wfile.write(b'{"results":[')
        self.wfile.flush()
        if self.path.startswith("/reset"):
            RELEASE.wait(0.05)
            self.close_connection = True
            return
        RELEASE.wait(10)


class Server(socketserver.ThreadingMixIn, socketserver.TCPServer):
    """An HTTP server without HTTPServer's reverse DNS lookup of its own address, which the guard blocks."""

    daemon_threads = True
    allow_reuse_address = True


class Loopback(StdlibTransport):
    """Sends every request to the loopback server instead, at the given path."""

    def __init__(self, origin: str, path: str) -> None:
        super().__init__(proxies={})
        self.origin, self.path = origin, path

    def send(self, request: HttpRequest, *, timeout: float, cancel: CancelToken) -> Response:
        local = HttpRequest(request.method, self.origin + self.path, request.headers, request.body)
        return super().send(local, timeout=timeout, cancel=cancel)


class RealTransport(unittest.TestCase):
    server: Server
    origin: str

    @classmethod
    def setUpClass(cls) -> None:
        RELEASE.clear()
        cls.server = Server(("127.0.0.1", 0), Handler)
        threading.Thread(target=cls.server.serve_forever, daemon=True).start()
        cls.origin = f"http://127.0.0.1:{cls.server.server_address[1]}"

    @classmethod
    def tearDownClass(cls) -> None:
        RELEASE.set()
        cls.server.shutdown()
        cls.server.server_close()

    def sync(self, path: str) -> Client:
        return Client(keys={"exa": "test-key"}, transport=Loopback(self.origin, path))

    def run_async(self, path: str, **options: Any) -> Any:
        async def main() -> Any:
            async with AsyncClient(keys={"exa": "test-key"}, transport=AsyncStdlibTransport(Loopback(self.origin, path))) as client:
                return await client.search("q", provider="exa", **options)

        return asyncio.run(asyncio.wait_for(main(), 10))

    def fails(self, code: str, status: int | None, call: Any) -> SearchError:
        with self.assertRaises(SearchError) as caught:
            call()
        e = caught.exception
        self.assertEqual((e.code, len(e.attempts), e.attempts[0].code, e.attempts[0].status), (code, 1, code, status))
        return e

    def test_a_complete_response_is_mapped_and_sent_as_specified(self) -> None:
        SEEN.clear()
        response = self.sync("/whole").search("q", provider="exa")
        self.assertEqual(response.results[0].url, "https://a.example/")
        self.assertEqual(SEEN[0]["headers"]["x-api-key"], "test-key")
        self.assertEqual(SEEN[0]["headers"]["content-type"], "application/json")
        self.assertNotIn("User-Agent", SEEN[0]["headers"])
        self.assertEqual(self.run_async("/whole").results[0].title, "A")

    def test_redirects_are_not_followed(self) -> None:
        self.fails("invalid_response", 302, lambda: self.sync("/redirect").search("q", provider="exa"))

    def test_the_call_deadline_during_a_stalled_body(self) -> None:
        self.fails("timeout", 200, lambda: self.sync("/stall").search("q", provider="exa", timeout_ms=150))
        self.fails("timeout", 200, lambda: self.run_async("/stall", timeout_ms=150))

    def test_the_attempt_deadline_during_a_stalled_body(self) -> None:
        self.fails("attempt_timeout", 200, lambda: self.sync("/stall").search("q", provider="exa", timeout_ms=5000, attempt_timeout_ms=150))
        self.fails("attempt_timeout", 200, lambda: self.run_async("/stall", timeout_ms=5000, attempt_timeout_ms=150))

    def test_cancellation_during_a_stalled_body(self) -> None:
        token = CancelToken()
        threading.Timer(0.1, token.cancel).start()
        self.fails("aborted", 200, lambda: self.sync("/stall").search("q", provider="exa", cancel=token, timeout_ms=5000))
        token2 = CancelToken()
        threading.Timer(0.1, token2.cancel).start()
        self.fails("aborted", 200, lambda: self.run_async("/stall", cancel=token2, timeout_ms=5000))

    def test_a_connection_that_breaks_during_a_2xx_body_is_network_billed_yes(self) -> None:
        e = self.fails("network", 200, lambda: self.sync("/reset").search("q", provider="exa", timeout_ms=5000))
        self.assertEqual(e.attempts[0].billed, "yes")
        e = self.fails("network", 200, lambda: self.run_async("/reset", timeout_ms=5000))
        self.assertEqual(e.attempts[0].billed, "yes")


if __name__ == "__main__":
    unittest.main()
