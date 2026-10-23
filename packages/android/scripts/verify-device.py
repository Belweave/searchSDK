#!/usr/bin/env python3
"""Build/install the local Maven consumer and test its HTTPS transport on Android.

Requires an already booted device, adb, OpenSSL, JDK 21 and Android SDK 36.
Certificates and keys are ephemeral test material under ignored .local storage.
No provider access or external infrastructure is used.
"""
import argparse
import gzip
import http.server
import json
import os
from pathlib import Path
import socket
import socketserver
import ssl
import subprocess
import threading
import time


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--serial", required=True, help="Explicit adb device serial")
    args = parser.parse_args()
    package = Path(__file__).resolve().parents[1]
    consumer = package / "consumer"
    repo = package.parents[1]
    scratch = consumer / ".local" / "device"
    resources = consumer / ".local" / "device-res"
    scratch.mkdir(parents=True, exist_ok=True)
    (resources / "raw").mkdir(parents=True, exist_ok=True)
    (resources / "xml").mkdir(parents=True, exist_ok=True)
    key, cert = scratch / "fixture.key", resources / "raw" / "fixture_ca.pem"
    subprocess.run(["openssl", "req", "-x509", "-newkey", "rsa:2048", "-nodes",
                    "-keyout", str(key), "-out", str(cert), "-days", "1",
                    "-subj", "/CN=localhost", "-addext", "subjectAltName=DNS:localhost",
                    "-addext", "basicConstraints=critical,CA:TRUE"],
                   check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
    os.chmod(key, 0o600)
    (resources / "xml" / "searchsdk_test_network.xml").write_text(
        '<network-security-config><domain-config cleartextTrafficPermitted="false">'
        '<domain>localhost</domain><trust-anchors><certificates src="@raw/fixture_ca" />'
        '</trust-anchors></domain-config></network-security-config>\n')
    fixture = (repo / "sdk-contract/fixtures/search-success.json").read_bytes()
    counts = {}
    lock = threading.Lock()

    class Handler(http.server.BaseHTTPRequestHandler):
        def log_message(self, *_):
            pass  # Never log request data or credentials.

        def do_POST(self):
            with lock:
                counts[self.path] = counts.get(self.path, 0) + 1
            size = int(self.headers.get("Content-Length", "0"))
            if size > 65536:
                self.send_error(413)
                return
            data = json.loads(self.rfile.read(size))
            assert isinstance(data.get("query"), str)
            if self.path == "/success":
                assert self.headers.get("Authorization") == "Bearer synthetic-application-token"
                assert self.headers.get("Cookie") is None
                status, body = 200, fixture
            elif self.path == "/redirect":
                status, body = 302, b""
            elif self.path in ("/oversized", "/gzip"):
                status, body = 200, b"x" * 4096
                if self.path == "/gzip":
                    body = gzip.compress(body)
            elif self.path == "/slow":
                status, body = 200, fixture
            else:
                status, body = 500, b""
            try:
                self.send_response(status)
                self.send_header("Content-Type", "application/json")
                self.send_header("X-SearchSDK-Protocol", "1")
                self.send_header("Content-Length", str(len(body)))
                if self.path == "/redirect":
                    self.send_header("Location", "/must-not-follow")
                if self.path == "/gzip":
                    self.send_header("Content-Encoding", "gzip")
                self.end_headers()
                if self.path == "/slow":
                    # Wait for peer close so cancellation really proves socket cleanup.
                    self.connection.settimeout(2)
                    try:
                        if self.connection.recv(1) == b"":
                            with lock:
                                counts["closedSlow"] = counts.get("closedSlow", 0) + 1
                    except (socket.timeout, OSError):
                        pass
                else:
                    self.wfile.write(body)
            except (BrokenPipeError, ConnectionResetError, ssl.SSLError):
                pass

    class Server(http.server.ThreadingHTTPServer):
        def server_bind(self):
            socketserver.TCPServer.server_bind(self)
            self.server_name = "localhost"
            self.server_port = self.server_address[1]

    server = Server(("127.0.0.1", 0), Handler)
    tls = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    tls.load_cert_chain(cert, key)
    server.socket = tls.wrap_socket(server.socket, server_side=True)
    port = server.server_port
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    sdk = os.environ.get("ANDROID_HOME") or os.environ.get("ANDROID_SDK_ROOT")
    adb = str(Path(sdk) / "platform-tools/adb") if sdk else "adb"
    target = [adb, "-s", args.serial]
    runner = "dev.searchsdk.consumer.test/androidx.test.runner.AndroidJUnitRunner"
    try:
        subprocess.run([str(package / "gradlew"), "-p", str(consumer),
                        "assembleDebugAndroidTest", "--no-daemon", "--max-workers=2"], check=True)
        apk = consumer / "build/outputs/apk/androidTest/debug/searchsdk-android-consumer-debug-androidTest.apk"
        subprocess.run(target + ["install", "-r", str(apk)], check=True)
        subprocess.run(target + ["reverse", f"tcp:{port}", f"tcp:{port}"], check=True)
        result = subprocess.run(target + ["shell", "am", "instrument", "-w", "-r",
                                "-e", "class", "dev.searchsdk.consumer.DeviceTransportTest",
                                "-e", "fixtureEndpoint", f"https://localhost:{port}", runner],
                                check=True, capture_output=True, text=True, timeout=90)
        print(result.stdout)
        if "OK (3 tests)" not in result.stdout:
            raise RuntimeError("Android instrumentation did not pass all three tests")
        time.sleep(0.25)
        with lock:
            assert counts.get("/success") == 3, counts
            assert counts.get("/redirect") == 1 and not counts.get("/must-not-follow"), counts
            assert counts.get("closedSlow") == 2, counts
            (scratch / "verification.json").write_text(json.dumps({
                "tests": 3, "transport": "installed AAR / production HTTPS", "requests": counts,
            }, indent=2) + "\n")
        print("Android installed-AAR HTTPS, no-redirect, decoded limits, deadline and socket cancellation checks passed.")
    finally:
        subprocess.run(target + ["reverse", "--remove", f"tcp:{port}"],
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        server.shutdown()
        server.server_close()
        key.unlink(missing_ok=True)


if __name__ == "__main__":
    main()
