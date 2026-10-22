import type { DocArticle } from './model.js';
import { callout, code, links, paragraph as p, section as s, table } from './model.js';

export const agentArticles: readonly DocArticle[] = [{
  slug: 'guides/mcp', title: 'Use the documentation MCP server', label: 'MCP and agent access', group: 'Guides',
  description: 'Read documentation, provider capabilities, examples, and one integration skill through the public, unauthenticated MCP endpoint.',
  keywords: ['MCP', '2026-07-28', 'server/discover', 'llms.txt', 'Markdown', 'skills', 'agents'],
  sections: [
    s('connect', 'Connect to the public endpoint',
      p('Configure an MCP client that supports protocol revision `2026-07-28` with the Streamable HTTP URL `https://searchsdk.dev/mcp`. `/api/mcp` is an alias. No API key or account is required; send no cookies or Authorization header. The endpoint serves public documentation only; it does not accept provider keys, run live searches, execute examples, or create remote infrastructure.'),
      p('This revision uses stateless requests. Every request includes protocol version and client capabilities in `params._meta`; HTTP mirrors the version and method in headers. It does not use the older `initialize` handshake or a session ID. A client that only supports older handshake-based revisions needs a compatible update.'),
      code('Discover the server · terminal', `curl --fail-with-body https://searchsdk.dev/mcp \\
  -H 'Content-Type: application/json' \\
  -H 'Accept: application/json, text/event-stream' \\
  -H 'MCP-Protocol-Version: 2026-07-28' \\
  -H 'Mcp-Method: server/discover' \\
  --data '{"jsonrpc":"2.0","id":1,"method":"server/discover","params":{"_meta":{"io.modelcontextprotocol/protocolVersion":"2026-07-28","io.modelcontextprotocol/clientInfo":{"name":"docs-reader","version":"1.0.0"},"io.modelcontextprotocol/clientCapabilities":{}}}}'`, 'bash'),
      p('Read `supportedVersions` and `capabilities` from the discovery response, then call `tools/list` to inspect the current tool schemas. `Mcp-Name` is also required for `tools/call` and `resources/read`, matching the tool name or resource URI in the body. Skill discovery uses `Mcp-Method` and the version header; `skills/get` does not require `Mcp-Name`.'),
      links({ label: 'Official July 2026 MCP introduction', href: 'https://modelcontextprotocol.io/docs/2026-07-28/getting-started/intro' }, { label: 'Discovery specification', href: 'https://modelcontextprotocol.io/specification/2026-07-28/server/discover' }, { label: 'Streamable HTTP requirements', href: 'https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/streamable-http' })),
    s('tools', 'Documentation, providers, and examples',
      table(['Tool', 'Arguments', 'Result'], [
        ['`search_docs`', '`query`, optional `limit` (1–10)', 'Local lexical search with bounded article snippets; no web-provider request.'],
        ['`get_doc`', '`slug`', 'Complete article text. Use an empty slug for the introduction.'],
        ['`list_providers`', 'Optional opaque `cursor`', 'Public provider metadata, up to 50 entries per page.'],
        ['`get_provider`', '`id`', 'One provider, including its supported boundary.'],
        ['`list_examples`', 'Optional opaque `cursor`', 'Documented code examples, up to 50 entries per page.'],
        ['`get_example`', '`id` from the listing', 'One example with language, source URL, and code.'],
      ]),
      p('Use returned cursors unchanged to fetch later pages. Choose example IDs from `list_examples`; IDs are generated from the article, section, and block position. Titles such as “shape” or “abbreviated” identify examples that are not standalone applications. Review environment requirements before using any code.'),
      code('mcp-docs.ts · read public data', `const endpoint = 'https://searchsdk.dev/mcp';
const metadata = {
  'io.modelcontextprotocol/protocolVersion': '2026-07-28',
  'io.modelcontextprotocol/clientInfo': { name: 'docs-reader', version: '1.0.0' },
  'io.modelcontextprotocol/clientCapabilities': {},
};
let requestId = 0;
async function rpc(method: string, params: Record<string, unknown> = {}) {
  const name = method === 'tools/call' ? params.name
    : method === 'resources/read' ? params.uri : undefined;
  const headers = new Headers({
    'Content-Type': 'application/json',
    Accept: 'application/json, text/event-stream',
    'MCP-Protocol-Version': '2026-07-28',
    'Mcp-Method': method,
  });
  if (typeof name === 'string') headers.set('Mcp-Name', name);
  const response = await fetch(endpoint, {
    method: 'POST', headers, credentials: 'omit', signal: AbortSignal.timeout(10_000),
    body: JSON.stringify({ jsonrpc: '2.0', id: ++requestId, method,
      params: { ...params, _meta: metadata } }),
  });
  // This endpoint returns JSON. Other MCP servers can return an SSE stream.
  const message = await response.json();
  if (!response.ok || message.error) throw new Error('MCP request failed');
  return message.result;
}

console.log(await rpc('server/discover'));
console.log(await rpc('tools/list'));
console.log(await rpc('tools/call', {
  name: 'search_docs', arguments: { query: 'fallback cancellation', limit: 3 },
}));
console.log(await rpc('tools/call', {
  name: 'get_doc', arguments: { slug: 'quickstart' },
}));
console.log(await rpc('tools/call', { name: 'list_providers', arguments: {} }));
console.log(await rpc('tools/call', {
  name: 'get_provider', arguments: { id: 'context' },
}));
console.log(await rpc('tools/call', { name: 'list_examples', arguments: {} }));
// Pass a returned example ID to get_example; do not infer an ID or execute it.
export {};`),
      callout('Verification boundary', 'The tools read generated, public source material. Fixture tests and documented operation mappings do not establish live provider availability, account permissions, retrieval quality, pricing, or latency. Provider capabilities distinguish normalized web adapters from native clients and corpus retrieval.')),
    s('limits', 'Handle request limits',
      p('Keep request bodies below 16 KiB. The server allows three seconds to receive the body, a five-second total request deadline, and responses up to 512 KiB. Article text stays below 128 KiB per record. Prefer search snippets and individual articles over fetching the entire catalog.'),
      p('Rate limits apply per server instance: a client socket address has a burst of 30 requests and refills at 60 per minute; the aggregate burst is 120 and refills at 240 per minute. Up to 12 requests run concurrently. Forwarded-address headers are ignored, so clients behind a reverse proxy can share one address bucket. On HTTP 429, respect `Retry-After` before retrying. These limits are local protective bounds, not a guaranteed service quota or availability promise.')),
    s('resources', 'Read exact resources',
      p('Clients can enumerate the exact resource catalog with `resources/list`. There are no resource templates. Read an enumerated URI with `resources/read`. The introduction is `searchsdk://docs/index`; other documentation uses `searchsdk://docs/` followed by `encodeURIComponent(slug)`. Provider and example resources use `searchsdk://providers/` or `searchsdk://examples/` followed by `encodeURIComponent(id)`.'),
      code('Resource request · params', `{
  "uri": "searchsdk://docs/reliability%2Ffallback",
  "_meta": {
    "io.modelcontextprotocol/protocolVersion": "2026-07-28",
    "io.modelcontextprotocol/clientInfo": { "name": "docs-reader", "version": "1.0.0" },
    "io.modelcontextprotocol/clientCapabilities": {}
  }
}`, 'json'),
      p('Send these params with JSON-RPC method `resources/read`, header `Mcp-Method: resources/read`, and matching header `Mcp-Name: searchsdk://docs/reliability%2Ffallback`. Documentation text is bounded below 128 KiB per article. The endpoint serves exact resources from its generated catalog rather than reading arbitrary filesystem paths.')),
    s('skill', 'Load the searchSDK integration skill',
      p('The server publishes one curated skill through the official `io.modelcontextprotocol/skills` extension: `skill://searchsdk/SKILL.md`. It guides provider selection, server integration, fallback, cancellation, errors, and local fixture checks. It does not authorize live provider calls. Directory reads are not supported.'),
      p('After `server/discover` advertises the extension, use `skills/list` or `skills/get` with `{ "uri": "skill://searchsdk/SKILL.md" }`, including the same required per-request metadata. Read that URI with `resources/read`. The manifest contains the SHA-256 digest and exact UTF-8 byte size of the single file. Skill-capable hosts verify the manifest and frontmatter and apply their skill-loading and approval rules before activation; an ordinary resource read does not activate the skill.'),
      links({ label: 'Read the public searchSDK skill', href: '/skills/searchsdk/SKILL.md' }, { label: 'Official Skills over MCP extension', href: 'https://modelcontextprotocol.io/extensions/skills/overview' }, { label: 'Agent Skills format', href: 'https://agentskills.io/specification' })),
    s('static-access', 'Read without an MCP client',
      p('Every public page has a Markdown export discoverable through an HTML `rel="alternate"` link with `type="text/markdown"`. `rel="describedby"` points to `/llms.txt`. The short index links to the main references; `/llms-full.txt` is an optional full-text concatenation, not a required part of the llms.txt proposal. Generated JSON indexes are searchSDK-specific formats, not new MCP or web standards.'),
      links({ label: 'Agent entry point', href: '/llms.txt' }, { label: 'All canonical articles and Markdown URLs', href: '/agent-index.json' }, { label: 'Machine-readable provider capabilities', href: '/provider-capabilities.json' }, { label: 'Full public MCP dataset', href: '/mcp-public-data.json' }, { label: 'Canonical sitemap', href: '/sitemap.xml' }, { label: 'llms.txt proposal', href: 'https://llmstxt.org/' })),
  ],
}];
