"""Private loopback TLS server for the optional C++ transport. No provider I/O."""
import gzip
import http.server
import json
import os
import pathlib
import ssl
import socketserver
import subprocess
import sys
import tempfile
import threading
import time

executable, fixture=sys.argv[1:]
success=pathlib.Path(fixture).read_bytes()
errors=[]
seen=[]


class Handler(http.server.BaseHTTPRequestHandler):
    protocol_version='HTTP/1.1'

    def log_message(self,*args):
        pass

    def do_POST(self):
        self.close_connection=True
        try:
            seen.append(self.path)
            if self.headers.get('Authorization')!='Bearer synthetic-loopback-token':
                errors.append('wrong authorization')
            if self.headers.get('Cookie') or self.headers.get('Proxy-Authorization'):
                errors.append('ambient credentials')
            body=self.rfile.read(int(self.headers.get('Content-Length','0')))
            if json.loads(body)!={'query':'loopback & + ü','limit':2}:
                errors.append('wrong normalized body')
            if self.path=='/redirect':
                self.send_response(307)
                self.send_header('Location',f'https://localhost:{self.server.server_port}/stolen')
                self.send_header('Content-Length','0')
                self.end_headers()
                return
            payload=(b'{' if self.path=='/bad' else b'x'*4096 if self.path=='/cap' else
                     b'{"error":{"code":"rate_limit","attempts":[]}}' if self.path=='/error' else success)
            if self.path=='/gzip':
                payload=gzip.compress(payload)
            self.send_response(429 if self.path=='/error' else 200)
            self.send_header('Content-Type','application/json')
            self.send_header('X-SearchSDK-Protocol','1')
            if self.path=='/gzip':
                self.send_header('Content-Encoding','gzip')
            self.send_header('Content-Length',str(len(payload)))
            self.end_headers()
            if self.path=='/slow':
                for start in range(0,len(payload),11):
                    self.wfile.write(payload[start:start+11]);self.wfile.flush();time.sleep(0.01)
            else:
                self.wfile.write(payload)
        except (BrokenPipeError,ConnectionResetError,ssl.SSLError):
            pass
        except Exception as error:
            errors.append(type(error).__name__)


class LoopbackServer(http.server.ThreadingHTTPServer):
    def server_bind(self):
        # HTTPServer.server_bind calls getfqdn even for 127.0.0.1. Keep these
        # tests independent of the host's reverse-DNS resolver and network.
        socketserver.TCPServer.server_bind(self)
        self.server_name='localhost'
        self.server_port=self.server_address[1]


storage=pathlib.Path(executable).resolve().parent
with tempfile.TemporaryDirectory(prefix='cpp-tls-',dir=storage) as work:
    work=pathlib.Path(work)
    config=work/'openssl.cnf'
    config.write_text('[req]\ndistinguished_name=dn\nx509_extensions=ext\nprompt=no\n[dn]\nCN=localhost\n[ext]\nsubjectAltName=DNS:localhost,IP:127.0.0.1\nbasicConstraints=critical,CA:TRUE\nkeyUsage=critical,digitalSignature,keyEncipherment,keyCertSign\nextendedKeyUsage=serverAuth\n')
    cert,key=work/'cert.pem',work/'key.pem'
    subprocess.run(['openssl','req','-x509','-newkey','rsa:2048','-nodes','-keyout',str(key),'-out',str(cert),'-days','1','-config',str(config)],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,timeout=10)
    server=LoopbackServer(('127.0.0.1',0),Handler);server.daemon_threads=True
    tls=ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER);tls.load_cert_chain(cert,key)
    server.socket=tls.wrap_socket(server.socket,server_side=True)
    # Bound incomplete TLS handshakes too, so shutdown cannot wait forever.
    server.socket.settimeout(2)
    worker=threading.Thread(target=server.serve_forever);worker.start()
    try:
        result=subprocess.run([executable,f'https://localhost:{server.server_port}',str(cert)],timeout=20,
            env=dict(os.environ,HTTPS_PROXY='http://127.0.0.1:1',https_proxy='http://127.0.0.1:1',ALL_PROXY='http://127.0.0.1:1'))
    finally:
        server.shutdown();server.server_close();worker.join()
    if '/stolen' in seen:
        errors.append('redirect followed')
    if len(seen)!=8:
        errors.append(f'wrong request count: {len(seen)}')
    if errors:
        raise SystemExit('; '.join(errors))
    raise SystemExit(result.returncode)
