import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { legalPages } from '../apps/web/src/legal-content.ts';

export const siteOrigin = 'https://searchsdk.dev';
export const mcpProtocolVersion = '2026-07-28';
export const docPath = article => `/docs${article.slug ? `/${article.slug}` : ''}`;
export const markdownPath = article => article.slug ? `${docPath(article)}.md` : '/docs/index.md';
export const pageMarkdownPath = path => path === '/' ? '/index.md' : path === '/docs' ? '/docs/index.md' : `${path}.md`;
const absolute = href => new URL(href, siteOrigin).href;
const inline = text => text.replace(/\]\((\/[^)]*)\)/g, (_, href) => `](${absolute(href)})`);
const xml = text => text.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]));

export function articleMarkdown(article) {
  const tableCell = value => inline(value).replace(/\|/g, '\\|').replace(/\n/g, '<br>');
  const block = item => {
    switch (item.type) {
      case 'paragraph': return inline(item.text);
      case 'code': {
        // A longer fence preserves examples that themselves contain fenced text.
        const fence = '`'.repeat(Math.max(3, ...[...item.code.matchAll(/`+/g)].map(match => match[0].length + 1)));
        return `**${item.title}**\n\n${fence}${item.language}\n${item.code}\n${fence}`;
      }
      case 'list': return item.items.map((text, index) => `${item.ordered ? `${index + 1}.` : '-'} ${inline(text)}`).join('\n');
      case 'callout': return `> **${item.title}**\n> ${inline(item.text).replace(/\n/g, '\n> ')}`;
      case 'links': return item.items.map(link => `- [${link.label}](${absolute(link.href)})${link.description ? `: ${link.description}` : ''}`).join('\n');
      case 'table': return [item.columns, item.columns.map(() => '---'), ...item.rows].map(row => `| ${row.map(tableCell).join(' | ')} |`).join('\n');
      default: throw new Error(`Unknown documentation block: ${item.type}`);
    }
  };
  return `# ${article.title}\n\n${article.description}\n\nCanonical: ${absolute(docPath(article))}\nMarkdown: ${absolute(markdownPath(article))}\n\n${article.sections.map(section => `<a id="${section.id}"></a>\n\n## ${section.title}\n\n${section.blocks.map(block).join('\n\n')}`).join('\n\n')}\n`;
}

export function siteRoutes(docArticles) {
  return [
    { path: '/', title: 'searchSDK · Web search for TypeScript apps.', description: 'Choose your sources. Set your fallback. Get typed web-search results and a record of every attempt, with 15 provider integrations.' },
    { path: '/providers', title: 'Providers · searchSDK', description: 'Compare 15 provider integrations, explore their search and native API capabilities, and find the TypeScript reference for each.' },
    { path: '/playground', title: 'Playground · searchSDK', description: 'Run live server-side searches with your own provider keys. Inspect real sources, fallback attempts, JSON, and a TypeScript example.' },
    { path: '/benchmarks', title: 'Search provider benchmarks · searchSDK', description: 'In development: reproducible comparisons of search relevance, latency, cost, and reliability. No benchmark scores published yet.' },
    ...legalPages.map(page => ({ path: page.path, title: `${page.title} · searchSDK`, description: page.description, legal: page })),
    ...docArticles.map(article => ({ path: docPath(article), title: `${article.label ?? article.title} · searchSDK Docs`, description: article.description, article })),
    { path: '/404', title: 'Page not found · searchSDK', description: 'Find your next step in the searchSDK documentation.', notFound: true },
  ];
}

export function buildAgentArtifacts(docArticles, providers, skills = []) {
  const docs = docArticles.map(article => ({
    slug: article.slug, title: article.title, description: article.description,
    url: absolute(docPath(article)), markdownPath: markdownPath(article), markdownUrl: absolute(markdownPath(article)),
    text: articleMarkdown(article),
  }));
  const examples = docArticles.flatMap(article => article.sections.flatMap(section => section.blocks.flatMap((block, index) => block.type === 'code' ? [{
    id: `${article.slug || 'index'}/${section.id}/${index + 1}`, title: block.title,
    description: `${article.title}: ${section.title}. Documentation example; execute only after reviewing its environment and verification limits.`,
    language: block.language, code: block.code, url: `${absolute(docPath(article))}#${section.id}`,
  }] : [])));
  for (const [label, records, key] of [['docs', docs, 'slug'], ['providers', providers, 'id'], ['examples', examples, 'id']]) {
    if (new Set(records.map(record => record[key])).size !== records.length) throw new Error(`Duplicate ${label} identifiers`);
  }
  for (const doc of docs) if (Buffer.byteLength(doc.text, 'utf8') >= 128 * 1024) throw new Error(`Documentation exceeds MCP record bound: ${doc.slug}`);
  return {
    schemaVersion: 1, origin: siteOrigin,
    description: 'Generated public documentation data. This searchSDK schema is not an MCP discovery standard. No credentials, live search results, or benchmark measurements.',
    mcp: { url: `${siteOrigin}/mcp`, aliasUrl: `${siteOrigin}/api/mcp`, protocolVersion: mcpProtocolVersion, guideUrl: `${siteOrigin}/docs/guides/mcp`, authentication: 'none', readOnly: true },
    docs, providers, examples, skills,
  };
}

export async function writeAgentArtifacts(directory, docArticles, providers, skills = []) {
  const data = buildAgentArtifacts(docArticles, providers, skills);
  const files = new Map();
  const json = value => JSON.stringify(value, null, 2) + '\n';
  for (const skill of skills) {
    // Curated skills currently contain only SKILL.md; preserve its exact bytes
    // in isolated generation output as well as in the checked-in public source.
    files.set(new URL(skill.url).pathname, skill.files.find(file => file.uri === skill.uri).text);
  }
  for (const doc of data.docs) files.set(doc.markdownPath, doc.text);
  // Preserve the previous root export URL for existing consumers.
  files.set('/docs.md', data.docs.find(doc => doc.slug === '').text);
  files.set('/mcp-public-data.json', json(data));
  files.set('/provider-capabilities.json', json({ schemaVersion: 1, origin: siteOrigin, description: 'SDK-supported capabilities and public operation catalogs; not live-provider verification. Numeric limits describe SDK policy, not necessarily native provider maxima.', providers }));
  files.set('/agent-index.json', json({
    schemaVersion: 1, origin: siteOrigin, description: 'searchSDK-specific public content index; not a protocol standard.',
    llmsUrl: `${siteOrigin}/llms.txt`, fullTextUrl: `${siteOrigin}/llms-full.txt`, providerCapabilitiesUrl: `${siteOrigin}/provider-capabilities.json`, mcp: data.mcp,
    skills: skills.map(({ files, ...skill }) => skill), articles: data.docs.map(({ text, ...doc }) => doc),
    pages: siteRoutes(docArticles).filter(route => !route.notFound).map(route => ({ url: absolute(route.path), markdownUrl: absolute(pageMarkdownPath(route.path)), title: route.title, description: route.description })),
  }));
  const link = slug => {
    const article = docArticles.find(article => article.slug === slug);
    if (!article) throw new Error(`Missing llms.txt entry: ${slug}`);
    return `- [${article.label ?? article.title}](${absolute(markdownPath(article))}): ${article.description}`;
  };
  files.set('/llms.txt', `# searchSDK\n\n> Alpha TypeScript search SDK with explicit normalized web-search adapters and separate native clients. Install the prerelease in your Node server with \`npm install @belweave/search-sdk@alpha\`; alpha APIs may change before a stable release.\n\nProvider requests belong on your server. Documentation and deterministic fixtures establish local contracts, not live availability, quality, latency, or pricing. WonderSearch retrieves a private corpus rather than the open web.\n\n## Start here\n\n${['', 'installation', 'quickstart', 'guides/mcp', 'providers', 'api/search', 'api/native-transport', 'reliability/verification'].map(link).join('\n')}\n\n## Catalogs\n\n- [All articles and canonical Markdown URLs](${siteOrigin}/agent-index.json): Small searchSDK-specific content index, including MCP endpoint details.\n- [Provider capabilities](${siteOrigin}/provider-capabilities.json): SDK limits and native operation catalogs, generated from source.\n- [Documentation, providers, and examples](${siteOrigin}/mcp-public-data.json): Full searchSDK-specific dataset used by the read-only MCP tools.\n\n## Optional\n\n- [Integration workflow skill](${siteOrigin}/skills/searchsdk/SKILL.md): One curated Agent Skill, also available through the official MCP Skills extension.\n- [All documentation in one file](${siteOrigin}/llms-full.txt): Convenience concatenation; fetch individual articles when possible.\n- [Website overview](${siteOrigin}/index.md): Public routes and entry points.\n- [Benchmark methodology draft](${siteOrigin}/benchmark-methodology.json): No measured scores are published.\n`);
  files.set('/llms-full.txt', `# searchSDK documentation\n\nGenerated from the same article data as the website and MCP tools. This full-text convenience file is not required by the llms.txt proposal.\n\n${data.docs.map(doc => doc.text).join('\n---\n\n')}`);
  const publicRoutes = siteRoutes(docArticles).filter(route => !route.notFound);
  files.set('/sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${publicRoutes.map(route => `  <url><loc>${xml(absolute(route.path))}</loc></url>`).join('\n')}\n</urlset>\n`);
  files.set('/robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${siteOrigin}/sitemap.xml\n`);
  for (const route of publicRoutes.filter(route => !route.article)) {
    const body = route.legal
      ? `Effective ${route.legal.updated}\n\n${route.legal.sections.map(section => `## ${section.title}\n\n${section.paragraphs.join('\n\n')}`).join('\n\n')}\n\nContact: [info@belweave.com](mailto:info@belweave.com)\n\n${route.legal.links.map(link => `- [${link.label}](${absolute(link.href)})`).join('\n')}`
      : route.path === '/providers'
      ? providers.map(provider => `## ${provider.name}\n\n${provider.description}\n\n${provider.boundary}\n\n- [SDK reference](${provider.url})\n- [Provider reference](${provider.docs})`).join('\n\n')
      : route.path === '/playground'
        ? `The live playground uses visitor-supplied provider keys for request-scoped, server-side calls. Keys are not persisted or logged. The key-free fixture demo is separate from live provider verification. Review the interface before submitting a billable request.\n\n- [Server integration](${siteOrigin}/docs/guides/server-integration.md)\n- [Deterministic testing](${siteOrigin}/docs/guides/testing.md)`
        : route.path === '/benchmarks'
          ? `No provider scores, ratings, or measured latencies are published. Live benchmark runs require explicit opt-in; automated checks use deterministic fixtures.\n\n- [Methodology draft](${siteOrigin}/benchmark-methodology.json)\n- [Verification limits](${siteOrigin}/docs/reliability/verification.md)`
          : `searchSDK preserves source identity, cancellation, deadlines, response bounds, and explicit fallback. Normalized search and provider-native APIs have separate contracts.\n\n- [Installation](${siteOrigin}/docs/installation.md)\n- [Quickstart](${siteOrigin}/docs/quickstart.md)\n- [Provider catalog](${siteOrigin}/providers.md)\n- [Playground](${siteOrigin}/playground.md)\n- [Benchmarks](${siteOrigin}/benchmarks.md)\n- [MCP documentation server](${siteOrigin}/docs/guides/mcp.md)\n- [Full article index](${siteOrigin}/agent-index.json)`;
    files.set(pageMarkdownPath(route.path), `# ${route.title}\n\n${route.description}\n\nCanonical: ${absolute(route.path)}\nMarkdown: ${absolute(pageMarkdownPath(route.path))}\n\n${body}\n`);
  }
  for (const [path, content] of files) {
    const target = resolve(directory, `.${path}`);
    await mkdir(resolve(target, '..'), { recursive: true });
    await writeFile(target, content);
  }
  return data;
}
