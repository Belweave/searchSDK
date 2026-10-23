"""Local TLS transport verification. Never connects to provider infrastructure."""
import gzip
import http.server
import json
import os
from pathlib import Path
import ssl
import socketserver
import subprocess
import sys
import tempfile
import threading
import time

executable, fixture = sys.argv[1:]
body = Path(fixture).read_bytes()
errors = []
seen = []


class Handler(http.server.BaseHTTPRequestHandler):
    protocol_version = 'HTTP/1.1'

    def log_message(self, *_):
        pass

    def do_POST(self):
        try:
            self.handle_post()
        except (BrokenPipeError, ConnectionResetError, ssl.SSLError):
            pass  # Expected for cancellation/decoded-byte-limit tests.
        except Exception as error:
            errors.append(type(error).__name__)

    def handle_post(self):
        seen.append(self.path)
        if self.headers.get('Authorization') != 'Bearer local-application-token':
            errors.append('wrong explicit authorization')
        if self.headers.get('Cookie') or self.headers.get('Proxy-Authorization'):
            errors.append('ambient credential forwarding')
        data = self.rfile.read(int(self.headers['Content-Length']))
        if json.loads(data) != {'query': 'loopback & + ü', 'limit': 2}:
            errors.append('request encoding')
        if self.path == '/redirect':
            self.send_response(307)
            self.send_header('Location', f'https://localhost:{self.server.server_port}/stolen')
            self.send_header('Content-Length', '0')
            self.end_headers()
            return
        status = 429 if self.path == '/error' else 200
        payload = (b'{' if self.path == '/malformed' else b'x' * 4096 if self.path in ('/oversized', '/gzip-bomb') else b'{"error":{"code":"rate_limit","attempts":[]}}' if self.path == '/error' else body)
        if self.path in ('/gzip', '/gzip-bomb'):
            payload = gzip.compress(payload)
        self.send_response(status)
        self.send_header('X-SearchSDK-Protocol', '2' if self.path == '/protocol' else '1')
        self.send_header('Content-Type', 'application/json')
        if self.path in ('/gzip', '/gzip-bomb'):
            self.send_header('Content-Encoding', 'gzip')
        if self.path in ('/chunked', '/slow'):
            self.send_header('Transfer-Encoding', 'chunked')
        else:
            self.send_header('Content-Length', str(len(payload)))
        self.end_headers()
        if self.path in ('/chunked', '/slow'):
            for start in range(0, len(payload), 13):
                chunk = payload[start:start + 13]
                self.wfile.write(f'{len(chunk):x}\r\n'.encode() + chunk + b'\r\n')
                self.wfile.flush()
                if self.path == '/slow':
                    time.sleep(0.01)
            self.wfile.write(b'0\r\n\r\n')
        else:
            self.wfile.write(payload)


class LocalHTTPServer(http.server.ThreadingHTTPServer):
    # Avoid HTTPServer's reverse DNS in server_bind: tests must stay local and
    # must not wait for a host resolver before the SDK executable even starts.
    def server_bind(self):
        socketserver.TCPServer.server_bind(self)
        self.server_name = 'localhost'
        self.server_port = self.server_address[1]


build = Path(executable).resolve().parent
with tempfile.TemporaryDirectory(prefix='tls-', dir=build) as tmp:
    tmp = Path(tmp)
    config = tmp / 'openssl.cnf'
    config.write_text('[req]\ndistinguished_name=dn\nx509_extensions=ext\nprompt=no\n[dn]\nCN=localhost\n[ext]\nsubjectAltName=DNS:localhost,IP:127.0.0.1\nbasicConstraints=critical,CA:TRUE\nkeyUsage=critical,digitalSignature,keyEncipherment,keyCertSign\nextendedKeyUsage=serverAuth\n')
    cert, key = tmp / 'cert.pem', tmp / 'key.pem'
    subprocess.run(['openssl', 'req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', str(key), '-out', str(cert), '-days', '1', '-config', str(config)], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    server = LocalHTTPServer(('127.0.0.1', 0), Handler)
    server.daemon_threads = True
    tls = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    tls.load_cert_chain(cert, key)
    server.socket = tls.wrap_socket(server.socket, server_side=True)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    env = dict(os.environ, HTTPS_PROXY='http://127.0.0.1:1', https_proxy='http://127.0.0.1:1', ALL_PROXY='http://127.0.0.1:1')
    try:
        result = subprocess.run([executable, f'https://localhost:{server.server_port}', str(cert)], env=env, timeout=20)
    finally:
        server.shutdown()
        server.server_close()
        thread.join()
    if '/stolen' in seen:
        errors.append('redirect followed')
    if len(seen) != 11:
        errors.append(f'wrong call count: {len(seen)}')
    if errors:
        raise SystemExit('; '.join(errors))
    raise SystemExit(result.returncode)
