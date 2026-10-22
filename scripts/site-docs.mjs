import { cp, mkdir, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { createServer } from "vite";
import { siteOrigin, writeAgentArtifacts } from "./site-agent-data.mjs";
import "../apps/web/src/docs/refresh-native-index.mjs";
const root = new URL("../", import.meta.url);
const outputFlag = process.argv.indexOf('--out-dir');
const output = outputFlag < 0 ? fileURLToPath(new URL('apps/web/public/', root)) : resolve(process.argv[outputFlag + 1]);
await mkdir(output, { recursive: true });
await cp(
  new URL("docs/sdk-alpha.md", root),
  resolve(output, 'sdk-guide.md'),
);

await cp(new URL("docs/provider-catalog.md", root), resolve(output, 'provider-catalog.md'));

await cp(new URL("docs/priority-adapters.md", root), resolve(output, 'priority-adapters.md'));

// One public source feeds HTML, Markdown, static discovery, and the MCP server.
// This data is loaded separately by the server; do not import it into the client.
const server = await createServer({
  root: fileURLToPath(new URL('apps/web/', root)), configFile: fileURLToPath(new URL('apps/web/vite.config.ts', root)),
  server: { middlewareMode: true, watch: null }, appType: 'custom', logLevel: 'error',
});
const originalFetch = globalThis.fetch;
let requests = 0;
const offlineFetch = async () => { requests++; throw new Error('Network calls are forbidden during agent documentation generation'); };
globalThis.fetch = offlineFetch;
try {
  const { docArticles } = await server.ssrLoadModule('/src/docs/content.ts');
  const { providers } = await server.ssrLoadModule('/src/provider-catalog.ts');
  const { nativeOperationIndex } = await server.ssrLoadModule('/src/docs/native-operation-index.ts');
  const catalog = [];
  for (const provider of providers) {
    const normalizedWebSearch = provider.status === 'alpha' && !provider.corpus;
    let normalizedCapabilities;
    if (normalizedWebSearch) {
      const module = await server.ssrLoadModule(fileURLToPath(new URL(`packages/sdk/src/${provider.id}.ts`, root)));
      const options = provider.id === 'searxng' ? { baseUrl: 'https://documentation-fixture.invalid', fetch: offlineFetch } : { apiKey: 'documentation-fixture-key', fetch: offlineFetch };
      normalizedCapabilities = module[provider.id](options).capabilities;
      if (!normalizedCapabilities) throw new Error(`Missing normalized capabilities: ${provider.id}`);
    }
    const nativeOperations = nativeOperationIndex[provider.id] ?? [];
    if ((provider.nativeClient !== false) !== (nativeOperations.length > 0)) throw new Error(`Native catalog mismatch: ${provider.id}`);
    catalog.push({
      id: provider.id, name: provider.name, description: provider.description, boundary: provider.boundary,
      docs: provider.docs, status: provider.status, nativeClient: nativeOperations.length > 0,
      url: `${siteOrigin}/docs/providers/${provider.id}`, markdownUrl: `${siteOrigin}/docs/providers/${provider.id}.md`,
      corpus: provider.corpus === true, normalizedWebSearch,
      ...(normalizedCapabilities ? { normalizedCapabilities } : {}), nativeOperations,
    });
  }
  if (requests) throw new Error(`Unexpected network requests: ${requests}`);
  const skillBytes = await readFile(new URL('apps/web/public/skills/searchsdk/SKILL.md', root));
  const text = skillBytes.toString('utf8');
  const fields = text.match(/^---\nname: (searchsdk)\ndescription: ([^\n]+)\n---\n/);
  if (!fields || !text.endsWith('\n') || !Buffer.from(text, 'utf8').equals(skillBytes)) throw new Error('Invalid curated skill frontmatter or UTF-8');
  const uri = 'skill://searchsdk/SKILL.md';
  const skills = [{
    uri, frontmatter: { name: fields[1], description: fields[2] },
    resources: [{ uri, digest: `sha256:${createHash('sha256').update(skillBytes).digest('hex')}`, size: skillBytes.length }],
    files: [{ uri, mimeType: 'text/markdown', text }], url: `${siteOrigin}/skills/searchsdk/SKILL.md`,
  }];
  const data = await writeAgentArtifacts(output, docArticles, catalog, skills);
  console.log(`Generated agent documentation: ${data.docs.length} articles, ${data.providers.length} providers, ${data.examples.length} examples.`);
} finally {
  globalThis.fetch = originalFetch;
  await server.close();
}
