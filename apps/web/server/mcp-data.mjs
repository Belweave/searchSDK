import { readFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';

// This is a build-time public snapshot, never a caller-selected file or URL.
const defaultArtifact = new URL('../public/mcp-public-data.json', import.meta.url);
export const dataLimits = Object.freeze({ artifactBytes: 16 * 1024 * 1024, recordBytes: 160 * 1024,
  textBytes: 128 * 1024, rows: 5000, pageSize: 50 });
export const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const string = (value, maximum = 2048) => typeof value === 'string' && value.length <= maximum;
const identifier = value => string(value, 240) && /^[a-zA-Z0-9][a-zA-Z0-9._:/-]*$/.test(value) && !value.includes('..');
const publicUrl = value => {
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password; }
  catch { return false; }
};
const canonicalUrl = value => publicUrl(value) && new URL(value).origin === 'https://searchsdk.dev';
function freeze(value) {
  if (object(value) || Array.isArray(value)) { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}

/** Validated once per instance. No imports from the SDK or provider transports. */
export function createMcpCatalog(source) {
  if (!object(source) || source.schemaVersion !== 1) throw new Error('Invalid MCP public artifact.');
  // Clone to prevent mutable injection from changing a published snapshot.
  const data = JSON.parse(JSON.stringify(source));
  for (const kind of ['docs', 'providers', 'examples']) {
    if (!Array.isArray(data[kind]) || data[kind].length > dataLimits.rows) throw new Error('Invalid MCP public artifact.');
    const ids = new Set();
    for (const row of data[kind]) {
      const id = kind === 'docs' ? row?.slug : row?.id;
      if (!object(row) || !(kind === 'docs' && id === '' || identifier(id)) || ids.has(id) ||
          Buffer.byteLength(JSON.stringify(row)) > dataLimits.recordBytes) throw new Error('Invalid MCP public artifact.');
      ids.add(id);
      if (kind === 'docs') {
        if (!string(row.title) || !string(row.description, 8192) || !canonicalUrl(row.url) ||
            !string(row.text, dataLimits.textBytes) || Buffer.byteLength(row.text) > dataLimits.textBytes) throw new Error('Invalid MCP public document.');
      } else if (kind === 'providers') {
        if (!string(row.name) || !string(row.description, 8192) || !string(row.boundary, 8192) ||
            !publicUrl(row.docs) || !string(row.status, 80)) throw new Error('Invalid MCP public provider.');
      } else if (!string(row.title) || !string(row.language, 80) || !string(row.code, dataLimits.textBytes) ||
          row.url !== undefined && !canonicalUrl(row.url)) throw new Error('Invalid MCP public example.');
    }
    data[kind].sort((a, b) => (a.slug ?? a.id).localeCompare(b.slug ?? b.id, 'en'));
  }
  // Exactly one curated skill, authored with two scalar frontmatter fields.
  // This does not parse arbitrary YAML or expose directories from the filesystem.
  if (!Array.isArray(data.skills) || data.skills.length !== 1) throw new Error('Invalid MCP skill catalog.');
  const skill = data.skills[0];
  const skillUri = 'skill://searchsdk/SKILL.md';
  if (!object(skill) || skill.uri !== skillUri || !object(skill.frontmatter) ||
      Object.keys(skill.frontmatter).length !== 2 || skill.frontmatter.name !== 'searchsdk' ||
      !string(skill.frontmatter.description, 1024) || !skill.frontmatter.description.trim() ||
      !Array.isArray(skill.resources) || skill.resources.length !== 1 ||
      !Array.isArray(skill.files) || skill.files.length !== 1) throw new Error('Invalid MCP skill manifest.');
  const file = skill.files[0];
  const manifest = skill.resources[0];
  if (!object(file) || file.uri !== skillUri || file.mimeType !== 'text/markdown' || !string(file.text, 16384) ||
      !object(manifest) || manifest.uri !== skillUri || manifest.size !== Buffer.byteLength(file.text) ||
      manifest.digest !== `sha256:${createHash('sha256').update(file.text, 'utf8').digest('hex')}`) throw new Error('MCP skill integrity mismatch.');
  const frontmatterMatch = /^---\r?\nname: searchsdk\r?\ndescription: ([^\r\n]+)\r?\n---\r?\n/.exec(file.text);
  if (!frontmatterMatch) throw new Error('Invalid curated skill frontmatter.');
  let description = frontmatterMatch[1];
  if (description.startsWith('"')) {
    try { description = JSON.parse(description); } catch { throw new Error('Invalid curated skill frontmatter.'); }
  }
  if (description !== skill.frontmatter.description) throw new Error('MCP skill frontmatter mismatch.');
  const serialized = JSON.stringify(data);
  if (Buffer.byteLength(serialized) > dataLimits.artifactBytes) throw new Error('MCP public artifact is too large.');
  freeze(data);
  const revision = createHash('sha256').update(serialized).digest('hex').slice(0, 20);
  const maps = Object.fromEntries(['docs', 'providers', 'examples'].map(kind =>
    [kind, new Map(data[kind].map(row => [kind === 'docs' ? row.slug : row.id, row]))]));
  const resources = [];
  const resourceContents = new Map();
  for (const kind of ['docs', 'providers', 'examples']) for (const row of data[kind]) {
    const id = kind === 'docs' ? row.slug : row.id;
    const uri = `searchsdk://${kind}/${encodeURIComponent(id || 'index')}`;
    if (resourceContents.has(uri)) throw new Error('Duplicate MCP resource URI.');
    const text = kind === 'docs' ? row.text : JSON.stringify(row, null, 2);
    const mimeType = kind === 'docs' ? 'text/markdown' : 'application/json';
    resources.push({ uri, name: `${kind}/${id || 'index'}`, title: row.title ?? row.name,
      description: row.description ?? row.boundary, mimeType, size: Buffer.byteLength(text) });
    resourceContents.set(uri, { uri, mimeType, text });
  }
  resources.push({ uri: skillUri, name: skill.frontmatter.name, title: 'searchSDK integration workflow',
    description: skill.frontmatter.description, mimeType: file.mimeType, size: manifest.size });
  resourceContents.set(skillUri, { uri: skillUri, mimeType: file.mimeType, text: file.text });
  const search = data.docs.map(row => ({ row, title: `${row.title} ${row.description}`.toLowerCase(), text: row.text.toLowerCase() }));
  return Object.freeze({ revision,
    get(kind, id) { return maps[kind]?.get(id); },
    read(uri) { return resourceContents.get(uri); },
    skills() { return [{ uri: skill.uri, frontmatter: skill.frontmatter, resources: skill.resources }]; },
    skill(uri) { return uri === skillUri ? this.skills()[0] : undefined; },
    page(kind, cursor) {
      const rows = kind === 'resources' ? resources : data[kind];
      let offset = 0;
      if (cursor !== undefined) {
        if (!string(cursor, 256) || !/^[A-Za-z0-9_-]+$/.test(cursor)) throw new Error('Invalid cursor.');
        try {
          const value = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
          if (!Array.isArray(value) || value.length !== 3 || value[0] !== revision || value[1] !== kind ||
              !Number.isSafeInteger(value[2]) || value[2] <= 0 || value[2] >= rows.length || value[2] % dataLimits.pageSize !== 0) throw new Error();
          offset = value[2];
        } catch { throw new Error('Invalid cursor.'); }
      }
      const end = offset + dataLimits.pageSize;
      return { [kind]: rows.slice(offset, end).map(row => {
        if (kind === 'examples') { const { code, ...summary } = row; return summary; }
        return row;
      }), ...(end < rows.length ? { nextCursor: Buffer.from(JSON.stringify([revision, kind, end])).toString('base64url') } : {}) };
    },
    search(query, limit) {
      const terms = [...new Set(query.toLowerCase().trim().split(/\s+/u))].slice(0, 20);
      return search.map(({ row, title, text }) => ({ row, text,
        score: terms.reduce((sum, term) => sum + (title.includes(term) ? 5 : 0) + (text.includes(term) ? 1 : 0), 0) }))
        .filter(item => item.score > 0).sort((a, b) => b.score - a.score || a.row.slug.localeCompare(b.row.slug, 'en'))
        .slice(0, limit).map(({ row, text }) => {
          const at = Math.max(0, text.indexOf(terms.find(term => text.includes(term)) ?? ''));
          const start = Math.max(0, at - 100);
          return { slug: row.slug, title: row.title, description: row.description, url: row.url,
            snippet: row.text.slice(start, start + 600), uri: `searchsdk://docs/${encodeURIComponent(row.slug || 'index')}` };
        });
    },
  });
}

export async function loadMcpCatalog(artifact = defaultArtifact) {
  if ((await stat(artifact)).size > dataLimits.artifactBytes) throw new Error('MCP public artifact is too large.');
  return createMcpCatalog(JSON.parse(await readFile(artifact, 'utf8')));
}

const field = (description, maximum = 240) => ({ type: 'string', description, maxLength: maximum });
const schema = (properties, required = []) => ({ type: 'object', properties, required, additionalProperties: false });
const cursor = field('Opaque nextCursor from the preceding page.', 256);
const definitions = [
  ['search_docs', 'Search public searchSDK documentation', 'Search the bundled documentation using bounded lexical matching. No web or provider search.',
    schema({ query: { ...field('Documentation terms, not a URL to fetch.', 500), minLength: 1 }, limit: { type: 'integer', minimum: 1, maximum: 10, default: 5 } }, ['query'])],
  ['get_doc', 'Read a public documentation article', 'Read a complete bundled article by slug returned by search_docs. Use an empty slug for the documentation index.', schema({ slug: field('Exact article slug; empty for the index.') }, ['slug'])],
  ['list_providers', 'List provider capabilities', 'List public provider descriptions and explicit normalized/native boundaries. Does not contact providers.', schema({ cursor })],
  ['get_provider', 'Read provider capabilities', 'Read one public provider record by ID. This does not invoke any provider endpoint.', schema({ id: field('Provider ID from list_providers.') }, ['id'])],
  ['list_examples', 'List documentation examples', 'List bundled code examples. Returned code is documentation and is never executed.', schema({ cursor })],
  ['get_example', 'Read a documentation example', 'Read one bundled code example by ID. Does not run code, install dependencies, or access a network.', schema({ id: field('Example ID from list_examples.') }, ['id'])],
];
export const mcpTools = freeze(definitions.map(([name, title, description, inputSchema]) => ({ name, title, description, inputSchema,
  annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false } })));

// The public schemas above use a deliberately small JSON Schema 2020-12 subset.
// Validation is local and never resolves remote references.
export function validToolArguments(name, args) {
  const definition = mcpTools.find(tool => tool.name === name);
  if (!definition || !object(args)) return false;
  const { properties, required } = definition.inputSchema;
  if (!required.every(key => Object.hasOwn(args, key)) || !Object.keys(args).every(key => Object.hasOwn(properties, key))) return false;
  return Object.entries(args).every(([key, value]) => {
    const rule = properties[key];
    return rule.type === 'integer' ? Number.isSafeInteger(value) && value >= rule.minimum && value <= rule.maximum :
      string(value, rule.maxLength) && value.length >= (rule.minLength ?? 0) && !/[\u0000-\u001f\u007f-\u009f\uD800-\uDFFF]/u.test(value);
  }) && (name !== 'search_docs' || args.query.trim().length > 0);
}

export function callMcpTool(catalog, name, args) {
  if (name === 'search_docs') return { results: catalog.search(args.query, args.limit ?? 5) };
  if (name === 'list_providers') return catalog.page('providers', args.cursor);
  if (name === 'list_examples') return catalog.page('examples', args.cursor);
  const kind = name === 'get_doc' ? 'docs' : name === 'get_provider' ? 'providers' : 'examples';
  const value = catalog.get(kind, name === 'get_doc' ? args.slug : args.id);
  if (!value) throw new Error('No matching public record. Use the search or list tool to find an exact identifier.');
  return value;
}
