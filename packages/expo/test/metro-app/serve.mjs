import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';

const root = resolve(process.argv[2] ?? 'dist-web');
const server = http.createServer(async (request, response) => {
  const pathname = new URL(request.url, 'http://localhost').pathname;
  const path = resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
  if (!path.startsWith(root + '/')) { response.writeHead(403); response.end(); return; }
  try {
    const content = await readFile(path);
    response.setHeader('Content-Type', ({ '.html': 'text/html', '.js': 'application/javascript', '.json': 'application/json', '.css': 'text/css' })[extname(path)] ?? 'application/octet-stream');
    response.end(content);
  } catch { response.writeHead(404); response.end(); }
});
server.listen(0, '127.0.0.1', () => console.log(JSON.stringify({ pid: process.pid, ...server.address() })));
