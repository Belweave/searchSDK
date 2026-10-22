import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { verifyAgentData } from './verify-agent-data.mjs';

// Validate the emitted site, not only the source content. This catches broken
// exported links, partial SSR, CSP-incompatible output and missing local assets.
const root = process.argv[2] ? resolve(process.argv[2]) : fileURLToPath(new URL('../apps/web/dist/', import.meta.url));
const origin = 'https://searchsdk.dev';
const socialImagePath = '/social/searchsdk-card-v2.jpg';
const socialImage = origin + socialImagePath;
const socialImageAlt = 'searchSDK centered among its 15 provider logos on a dithered background.';
const manifest = JSON.parse(await readFile(resolve(root, 'route-manifest.json'), 'utf8'));
assert(Array.isArray(manifest) && manifest.length > 0, 'Missing route manifest');
const routes = new Map();
const decode = value => value.replace(/&(amp|quot|apos|lt|gt|#39|#x27);/gi, entity => ({
  '&amp;': '&', '&quot;': '"', '&apos;': "'", '&lt;': '<', '&gt;': '>', '&#39;': "'", '&#x27;': "'",
})[entity.toLowerCase()]);
const localFile = path => {
  const target = resolve(root, `.${path.startsWith('/') ? path : `/${path}`}`);
  assert(target.startsWith(root.endsWith(sep) ? root : root + sep), `Path escapes the static site: ${path}`);
  return target;
};

function verifyMetadata(html, route) {
  const label = route.path;
  const head = html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i)?.[1];
  assert(head, `Missing document head: ${label}`);
  assert(typeof route.title === 'string' && route.title.trim(), `Missing manifest title: ${label}`);
  assert(typeof route.description === 'string' && route.description.trim(), `Missing manifest description: ${label}`);
  const titles = [...head.matchAll(/<title>([^<]*)<\/title>/gi)];
  assert.equal(titles.length, 1, `Expected one title: ${label}`);
  assert.equal(decode(titles[0][1]), route.title, `Incorrect title: ${label}`);
  const attributes = tag => Object.fromEntries([...tag.matchAll(/\b([a-z][\w:-]*)="([^"]*)"/gi)]
    .map(([, name, value]) => [name.toLowerCase(), decode(value)]));
  const tags = [...head.matchAll(/<meta\b[^>]*>/gi)].map(([tag]) => attributes(tag));
  const expected = {
    description: ['name', route.description],
    'og:type': ['property', 'website'],
    'og:site_name': ['property', 'searchSDK'],
    'og:title': ['property', route.title],
    'og:description': ['property', route.description],
    'og:url': ['property', origin + route.path],
    'og:image': ['property', socialImage],
    'og:image:secure_url': ['property', socialImage],
    'og:image:type': ['property', 'image/jpeg'],
    'og:image:width': ['property', '1200'],
    'og:image:height': ['property', '630'],
    'og:image:alt': ['property', socialImageAlt],
    'twitter:card': ['name', 'summary_large_image'],
    'twitter:title': ['name', route.title],
    'twitter:description': ['name', route.description],
    'twitter:image': ['name', socialImage],
    'twitter:image:alt': ['name', socialImageAlt],
  };
  for (const [key, [attribute, value]] of Object.entries(expected)) {
    const matches = tags.filter(tag => tag.name === key || tag.property === key);
    assert.equal(matches.length, 1, `Expected exactly one ${key}: ${label}`);
    assert.equal(matches[0][attribute], key, `Incorrect attribute for ${key}: ${label}`);
    assert.equal(matches[0].content, value, `Incorrect ${key}: ${label}`);
  }
  for (const tag of tags) {
    const key = tag.name ?? tag.property ?? '';
    if (/^(?:og|twitter):/.test(key)) assert(Object.hasOwn(expected, key), `Unexpected social tag ${key}: ${label}`);
  }
  const canonicals = [...head.matchAll(/<link\b[^>]*>/gi)].map(([tag]) => attributes(tag)).filter(tag => tag.rel === 'canonical');
  assert.equal(canonicals.length, 1, `Expected one canonical: ${label}`);
  assert.equal(canonicals[0].href, origin + route.path, `Incorrect canonical URL: ${label}`);
  const robots = tags.filter(tag => /^(?:robots|twitterbot|facebookexternalhit)$/i.test(tag.name ?? ''));
  if (route.notFound) assert(robots.some(tag => tag.name === 'robots' && tag.content === 'noindex'), '404 must remain noindex');
  else assert(!robots.some(tag => /\b(?:noindex|none|noimageindex)\b/i.test(tag.content ?? '')), `Public route blocks indexing or images: ${label}`);
}

// The source index is also a usable homepage fallback without prerendering.
const homepage = manifest.find(route => route.path === '/');
assert(homepage, 'Missing homepage');
verifyMetadata(await readFile(new URL('../apps/web/index.html', import.meta.url), 'utf8'), homepage);
const image = await readFile(localFile(socialImagePath));
assert(image.length >= 4 && image.readUInt16BE(0) === 0xffd8 && image.readUInt16BE(image.length - 2) === 0xffd9, 'Social card must be a complete JPEG');
let imageDimensions;
for (let offset = 2; offset + 4 <= image.length;) {
  assert.equal(image[offset], 0xff, 'Invalid JPEG marker');
  while (image[offset] === 0xff) offset++;
  const marker = image[offset++];
  if (marker === 0xda || marker === 0xd9) break;
  assert(offset + 2 <= image.length, 'Truncated JPEG segment');
  const length = image.readUInt16BE(offset);
  assert(length >= 2 && offset + length <= image.length, 'Invalid JPEG segment length');
  if (marker === 0xc0 || marker === 0xc2) {
    assert(length >= 8, 'Truncated JPEG frame');
    imageDimensions = { width: image.readUInt16BE(offset + 5), height: image.readUInt16BE(offset + 3) };
    break;
  }
  offset += length;
}
assert.deepEqual(imageDimensions, { width: 1200, height: 630 }, 'Social card must be a 1200 × 630 baseline or progressive JPEG');
assert(image.length < 300_000, 'Keep the social card below the 300 kB project download budget');
const robotsText = await readFile(resolve(root, 'robots.txt'), 'utf8');
assert(!/^[ \t]*Disallow:[ \t]*\S/im.test(robotsText), 'Static robots.txt must allow public pages and the social image');
for (const route of manifest) {
  assert(!routes.has(route.path), `Duplicate route: ${route.path}`);
  const html = await readFile(localFile(route.file), 'utf8');
  assert(html.includes(`<div id="root" data-route="${route.path}">`), `Missing hydration route: ${route.path}`);
  assert(!/<!--\$(?:!|\?)-->/.test(html), `Unfinished server-rendered Suspense boundary: ${route.path}`);
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => decode(match[1]));
  assert.equal(ids.length, new Set(ids).size, `Duplicate HTML IDs: ${route.path}`);
  assert.equal((html.match(/<h1(?:\s|>)/g) ?? []).length, 1, `Expected one page heading: ${route.path}`);
  assert(!html.includes('Loading workspace…') && !/\bid="[SB]:\d/.test(html), `Unresolved streamed content: ${route.path}`);
  for (const script of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    const src = script[1].match(/\bsrc="([^"]+)"/)?.[1];
    assert(src && src.startsWith('/') && new URL(decode(src), origin).origin === origin && !script[2].trim(), `Inline or remote script: ${route.path}`);
  }
  verifyMetadata(html, route);
  if (!route.notFound) {
    const markdownPath = route.path === '/' ? '/index.md' : route.path === '/docs' ? '/docs/index.md' : `${route.path}.md`;
    assert(html.includes(`<link rel="alternate" type="text/markdown" href="${origin}${markdownPath}" />`), `Missing Markdown discovery: ${route.path}`);
    assert(html.includes(`<link rel="describedby" href="${origin}/llms.txt" />`), `Missing llms.txt discovery: ${route.path}`);
  }
  routes.set(route.path, { ...route, html, ids: new Set(ids) });
}
assert(routes.has('/') && routes.has('/docs') && routes.has('/benchmarks'), 'Missing main routes');
assert([...routes.values()].some(route => route.notFound), 'Missing 404 document');
let checked = 0;
for (const [path, route] of routes) {
  for (const match of route.html.matchAll(/\b(?:href|src)="([^"]+)"/g)) {
    const href = decode(match[1]);
    const target = new URL(href, `${origin}${path}`);
    if (target.origin !== origin) continue;
    checked++;
    const pathname = decodeURIComponent(target.pathname).replace(/\/$/, '') || '/';
    const destination = routes.get(pathname);
    if (destination) {
      if (target.hash) assert(destination.ids.has(decodeURIComponent(target.hash.slice(1))), `Missing anchor: ${path} → ${href}`);
    } else {
      assert((await stat(localFile(pathname)).catch(() => null))?.isFile(), `Missing asset or export: ${path} → ${href}`);
    }
  }
}
for (const path of ['/.env.local', '/docs/vision-workshop.html', '/packages/sdk/src/index.ts']) {
  assert.equal(await stat(localFile(path)).catch(() => null), null, `Private artifact in static output: ${path}`);
}
const agent = await verifyAgentData(root);
assert.equal(agent.pages, manifest.filter(route => !route.notFound).length, 'Agent index must cover all canonical routes');
console.log(`Agent discovery passed: ${agent.articles} Markdown articles, ${agent.providers} providers, ${agent.examples} examples, exact skill manifest, ${agent.links} canonical links.`);
console.log(`Static site passed: ${routes.size} complete documents with unique route-specific social metadata, 1200×630 JPEG card, ${checked} local links/assets, one heading per page, no inline scripts or private artifacts.`);
