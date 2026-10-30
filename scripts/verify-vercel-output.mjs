import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const output = new URL('../.vercel/output/', import.meta.url);
const { routes } = JSON.parse(await readFile(new URL('config.json', output), 'utf8'));
const manifest = JSON.parse(await readFile(new URL('static/route-manifest.json', output), 'utf8'));
const matching = path => routes.filter(route => route.src && new RegExp(route.src).test(path));
const terminal = path => matching(path).find(route => !route.continue);
for (const page of manifest.filter(page => !page.notFound)) {
  const aliases = page.path === '/' ? ['/index.html'] : [`${page.path}/`, `${page.path}/index.html`];
  for (const alias of aliases) {
    const redirect = terminal(alias);
    assert.equal(redirect?.status, 308, `Missing permanent redirect: ${alias}`);
    assert.equal(redirect.headers.Location, page.path, `Incorrect redirect: ${alias}`);
  }
  assert.equal(terminal(page.path)?.dest, `/${page.file}`, `Canonical page must render: ${page.path}`);
  const markdown = page.path === '/' ? '/index.md' : page.path === '/docs' ? '/docs/index.md' : `${page.path}.md`;
  for (const path of page.path === '/docs' ? [markdown, '/docs.md'] : [markdown]) {
    const headers = Object.assign({}, ...matching(path).map(route => route.headers));
    assert.equal(headers['Content-Type'], 'text/markdown; charset=utf-8');
    assert(headers.Link.includes(`<https://searchsdk.dev${page.path}>; rel="canonical"`), `Missing Markdown canonical: ${path}`);
    assert(headers.Link.includes('rel="describedby"'));
  }
}
for (const [path, dest] of [['/mcp', '/api/mcp'], ['/api/mcp', '/api/mcp'], ['/api/playground/search', '/api/playground/search']]) {
  assert.equal(terminal(path)?.dest, dest, `API endpoint changed: ${path}`);
  assert(!terminal(path)?.status, `API endpoint redirects: ${path}`);
}
assert.equal(terminal('/not-a-searchsdk-page')?.status, 404);
assert.equal(terminal('/404.html')?.status, 404);
console.log('Vercel SEO routing passed: canonical pages, permanent aliases, Markdown headers, API routes and 404 fallback.');
