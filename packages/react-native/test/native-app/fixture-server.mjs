import { createServer } from 'node:https';
import { readFileSync, writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { resolve } from 'node:path';

const scratch = process.env.NATIVE_FIXTURE_SCRATCH;
if (!scratch) throw new Error('Set NATIVE_FIXTURE_SCRATCH to the package .local directory containing native-tls test certificates.');
const success = readFileSync(new URL('../../../../sdk-contract/fixtures/search-success.json', import.meta.url));
let requests = 0, sinkRequests = 0, ambientCookies = 0, incorrectAuthorization = 0, normalizedDomains = false, closedHangs = 0;
const server = createServer({ key: readFileSync(resolve(scratch, 'native-tls/key.pem')), cert: readFileSync(resolve(scratch, 'native-tls/cert.pem')) }, (request, response) => {
  if (request.url === '/report') {
    let data = ''; request.on('data', chunk => { data += chunk; });
    request.on('end', () => {
      const report = { ...JSON.parse(data), requests, sinkRequests, ambientCookies, incorrectAuthorization, normalizedDomains, closedHangs };
      report.passed &&= sinkRequests === 0 && ambientCookies === 0 && incorrectAuthorization === 0 && normalizedDomains;
      writeFileSync(resolve(scratch, 'native-runtime-report.json'), JSON.stringify(report, null, 2));
      writeFileSync(resolve(scratch, `native-runtime-${report.platform === 'android' ? 'android' : 'ios'}-report.json`), JSON.stringify(report, null, 2));
      response.end('{}'); console.log(JSON.stringify(report));
    }); return;
  }
  requests++;
  if (request.headers.cookie) ambientCookies++;
  if (request.headers.authorization !== 'Bearer synthetic-application-token') incorrectAuthorization++;
  if (request.url === '/sink') sinkRequests++;
  let body = ''; request.on('data', chunk => { body += chunk; });
  request.on('end', () => {
    const input = JSON.parse(body);
    if (input.includeDomains) normalizedDomains ||= JSON.stringify(input.includeDomains) === '["example.com"]';
    if (request.url === '/hang') { response.on('close', () => { closedHangs++; }); return; }
    if (request.url === '/redirect') { response.writeHead(307, { Location: 'https://127.0.0.1:19443/sink' }); response.end(); return; }
    if (request.url === '/oversize') { response.writeHead(200, { 'content-encoding': 'gzip' }); response.end(gzipSync(Buffer.alloc(10000, 65))); return; }
    if (request.url === '/auth') { response.writeHead(401); response.end(JSON.stringify({ error: { code: 'auth', attempts: [], message: 'synthetic-application-token' } })); return; }
    response.writeHead(200, { 'content-type': 'application/json', 'x-searchsdk-protocol': request.url === '/version' ? '2' : '1', 'set-cookie': 'ambient=must-not-persist; Secure' });
    response.end(success);
  });
});
server.listen(19443, '127.0.0.1', () => console.log('Synthetic TLS gateway ready on loopback port 19443.'));
