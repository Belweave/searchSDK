import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Verify shipped bytes and cross-artifact contracts, without running examples or
// contacting providers. Shared by the emitted-site verifier and focused checks.
export async function verifyAgentData(directory) {
  const origin = 'https://searchsdk.dev';
  const text = path => readFile(resolve(directory, `.${path}`), 'utf8');
  const data = JSON.parse(await text('/mcp-public-data.json'));
  const index = JSON.parse(await text('/agent-index.json'));
  const capabilities = JSON.parse(await text('/provider-capabilities.json'));
  assert.equal(data.schemaVersion, 1);
  const sdkCatalog = JSON.parse(await text('/sdk-catalog.json'));
  assert.equal(index.sdkCatalogUrl, `${origin}/sdk-catalog.json`);
  assert.equal(sdkCatalog.availability, 'source-alpha');
  assert.equal(sdkCatalog.sdks.length, 12);
  assert.equal(new Set(sdkCatalog.sdks.map(sdk => sdk.id)).size, 12);
  assert.equal(sdkCatalog.sdks.filter(sdk => sdk.target === 'server').length, 8);
  assert.equal(sdkCatalog.sdks.filter(sdk => sdk.target === 'app').length, 4);
  for (const sdk of sdkCatalog.sdks) {
    assert(data.docs.some(doc => doc.url === sdk.url), `Missing SDK documentation: ${sdk.id}`);
    assert(sdk.runtime && sdk.packageName && sdk.version && sdk.limits.length, `Incomplete SDK catalog entry: ${sdk.id}`);
  }
  assert.deepEqual(capabilities.providers, data.providers, 'Provider capability export diverges from MCP data');
  assert.deepEqual(index.articles, data.docs.map(({ text, ...doc }) => doc), 'Article index diverges from MCP data');
  assert.equal(index.mcp.url, `${origin}/mcp`);
  assert.equal(index.mcp.protocolVersion, '2026-07-28');
  const canonicalPages = new Set(index.pages.map(page => page.url));
  assert.equal(canonicalPages.size, index.pages.length, 'Duplicate canonical pages');
  const unique = (records, key) => assert.equal(new Set(records.map(record => record[key])).size, records.length, `Duplicate ${key}`);
  unique(data.docs, 'slug'); unique(data.providers, 'id'); unique(data.examples, 'id');
  assert(data.docs.length && data.providers.length && data.examples.length, 'Empty public dataset');
  for (const page of index.pages) {
    assert.equal(new URL(page.url).origin, origin);
    assert.equal(new URL(page.markdownUrl).origin, origin);
    const markdown = await text(new URL(page.markdownUrl).pathname);
    assert(markdown.startsWith('# '), `Missing Markdown heading: ${page.url}`);
    assert(markdown.includes(`Canonical: ${page.url}\n`), `Missing canonical source: ${page.url}`);
  }
  const fullText = await text('/llms-full.txt');
  for (const doc of data.docs) {
    assert(canonicalPages.has(doc.url), `Unlisted canonical article: ${doc.slug}`);
    assert(Buffer.byteLength(doc.text, 'utf8') < 128 * 1024, `Oversize MCP article: ${doc.slug}`);
    assert.equal(await text(doc.markdownPath), doc.text, `MCP/Markdown divergence: ${doc.slug}`);
    assert(fullText.includes(doc.text), `Missing full-text article: ${doc.slug}`);
    assert(doc.text.includes(`Markdown: ${doc.markdownUrl}\n`), `Missing Markdown self-link: ${doc.slug}`);
  }
  assert.equal(await text('/docs.md'), await text('/docs/index.md'), 'Legacy root Markdown alias diverged');
  for (const provider of data.providers) {
    assert(data.docs.some(doc => doc.url === provider.url), `Missing provider documentation: ${provider.id}`);
    assert.equal(provider.nativeClient, provider.nativeOperations.length > 0);
    assert.equal(provider.normalizedWebSearch, Boolean(provider.normalizedCapabilities));
    if (provider.corpus) assert.equal(provider.normalizedWebSearch, false, 'Corpus provider advertised as web search');
    if (provider.normalizedWebSearch) {
      const c = provider.normalizedCapabilities;
      assert.equal(typeof c.domainFilters, 'boolean');
      assert(Number.isInteger(c.maxIncludeDomains) && Number.isInteger(c.maxExcludeDomains));
    }
    assert.equal(new URL(provider.docs).protocol, 'https:');
  }
  for (const example of data.examples) {
    const url = new URL(example.url);
    const doc = data.docs.find(doc => doc.url === `${url.origin}${url.pathname}`);
    assert(doc?.text.includes(example.code), `Example detached from source: ${example.id}`);
    assert(doc.text.includes(`<a id="${url.hash.slice(1)}"></a>`), `Missing example anchor: ${example.id}`);
  }
  assert.equal(data.skills.length, 1, 'Expected one curated skill');
  const skill = data.skills[0];
  assert.equal(skill.uri, 'skill://searchsdk/SKILL.md');
  assert.equal(skill.files.length, 1);
  assert.equal(skill.resources.length, 1);
  const bytes = await readFile(resolve(directory, 'skills/searchsdk/SKILL.md'));
  assert.equal(skill.files[0].text, bytes.toString('utf8'), 'Skill public/MCP bytes diverge');
  assert.equal(skill.resources[0].size, bytes.length);
  assert.equal(skill.resources[0].digest, `sha256:${createHash('sha256').update(bytes).digest('hex')}`);
  assert(skill.files[0].text.startsWith(`---\nname: ${skill.frontmatter.name}\ndescription: ${skill.frontmatter.description}\n---\n`));
  assert.match(skill.frontmatter.name, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  assert(skill.frontmatter.description.length > 0 && skill.frontmatter.description.length <= 1024);

  const llms = await text('/llms.txt');
  assert(llms.startsWith('# searchSDK\n\n> '), 'Invalid llms.txt introduction');
  assert(Buffer.byteLength(llms) < 8 * 1024, 'Keep the llms.txt entry point concise');
  const knownPaths = new Set([...canonicalPages].map(url => new URL(url).pathname));
  // Check links in actual Markdown, including the curated skill. Absolute
  // canonical targets must resolve to a shipped page or static file.
  const markdownFiles = [...index.pages.map(page => new URL(page.markdownUrl).pathname), '/llms.txt', '/skills/searchsdk/SKILL.md'];
  let links = 0;
  for (const path of markdownFiles) {
    const markdown = await text(path);
    for (const match of markdown.matchAll(/\]\(([^)\s]+)\)/g)) {
      const url = new URL(match[1], `${origin}${path}`);
      if (url.origin !== origin) continue;
      links++;
      assert(match[1].startsWith(origin + '/'), `Noncanonical relative export link: ${path} → ${match[1]}`);
      if (knownPaths.has(url.pathname)) continue;
      assert((await stat(resolve(directory, `.${decodeURIComponent(url.pathname)}`)).catch(() => null))?.isFile(), `Broken Markdown link: ${path} → ${match[1]}`);
      const destination = data.docs.find(doc => doc.markdownPath === url.pathname);
      if (url.hash && destination) assert(destination.text.includes(`<a id="${url.hash.slice(1)}"></a>`), `Broken Markdown anchor: ${path} → ${match[1]}`);
    }
  }
  const sitemap = await text('/sitemap.xml');
  assert.match(sitemap, /^<\?xml version="1.0" encoding="UTF-8"\?>\n<urlset xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9">\n/);
  const locations = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);
  assert.deepEqual(locations, index.pages.map(page => page.url), 'Sitemap must contain canonical public pages exactly once');
  assert(!sitemap.includes('<lastmod>'), 'Do not infer modification dates from build time');
  assert.equal(await text('/robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${origin}/sitemap.xml\n`);
  return { articles: data.docs.length, providers: data.providers.length, examples: data.examples.length, pages: index.pages.length, links };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const directory = resolve(process.argv[2] ?? 'apps/web/public');
  console.log('Agent artifacts passed:', await verifyAgentData(directory));
}
