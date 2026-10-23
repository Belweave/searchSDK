// Local content/SSR/consumer verification. Uses existing dependencies; never calls providers.
import { createServer } from 'vite';
import { mkdtemp, writeFile, rm, readFile, access } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const repository = fileURLToPath(new URL('../../../../', import.meta.url));
const server = await createServer({ configFile: resolve(repository, 'apps/web/vite.config.ts'), server: { middlewareMode: true, watch: null, hmr: false }, appType: 'custom' });
let directory;
try {
  const { docArticles, findArticle, searchArticles } = await server.ssrLoadModule(resolve(repository, 'apps/web/src/docs/content.ts'));
  const { DocsWorkspace } = await server.ssrLoadModule(resolve(repository, 'apps/web/src/docs/DocsWorkspace.tsx'));
  const { renderToString } = await import('react-dom/server');
  const { createElement } = await import('react');
  const routes = new Map(docArticles.map(article => ['/docs' + (article.slug ? '/' + article.slug : ''), article]));
  const errors = [];
  if (routes.size !== docArticles.length) errors.push('Duplicate article routes');
  for (const [path, article] of routes) {
    if (findArticle(path) !== article) errors.push(`Route resolution failed: ${path}`);
    if (new Set(article.sections.map(section => section.id)).size !== article.sections.length) errors.push(`Duplicate section IDs: ${path}`);
    const html = renderToString(createElement(DocsWorkspace, { path }));
    if (!html.includes('<h1>')) errors.push(`Missing server-rendered title: ${path}`);
    // Script failure must leave native content usable without advertising inert controls.
    const controls = html.match(/<(?:button|input)\b[^>]*>/g) ?? [];
    if (controls.some(tag => !/\sdisabled(?:=|\s|>)/.test(tag))) errors.push(`Enabled JavaScript control in server markup: ${path}`);
    for (const section of article.sections) for (const block of section.blocks) {
      const hrefs = block.type === 'links' ? block.items.map(item => item.href) : [...JSON.stringify(block).matchAll(/\]\((\/docs[^)]*)\)/g)].map(match => match[1]);
      for (const href of hrefs) {
        if (!href.startsWith('/docs')) continue;
        const [target, hash] = href.split('#');
        const match = routes.get(target || '/docs');
        if (!match || hash && !match.sections.some(item => item.id === hash)) errors.push(`Broken link: ${path} -> ${href}`);
      }
    }
  }
  if (!renderToString(createElement(DocsWorkspace, { path: '/docs/unknown-article' })).includes('404')) errors.push('Missing 404 state');
  if (findArticle('/docs/quickstart/?search=test')?.slug !== 'quickstart') errors.push('Trailing slash/query route resolution');
  if (searchArticles('TinyFish')[0]?.article.slug !== 'providers/tinyfish') errors.push('TinyFish search ranking');
  for (const term of ['maxRetries', 'Idempotency-Key', 'AbortSignal', 'cache', 'compareAndSet', 'attachDurableRemoteId']) if (!searchArticles(term).length) errors.push(`Missing real search results: ${term}`);
  const { sdks, sdkHref } = await server.ssrLoadModule(resolve(repository, 'apps/web/src/sdk-catalog.ts'));
  if (sdks.length !== 12 || new Set(sdks.map(sdk => sdk.id)).size !== 12) errors.push('Expected twelve unique SDKs');
  if (sdks.filter(sdk => sdk.target === 'server').length !== 8 || sdks.filter(sdk => sdk.target === 'app').length !== 4) errors.push('SDK execution boundary counts');
  for (const sdk of sdks) {
    if (!routes.has(sdkHref(sdk.id))) errors.push(`Missing SDK article: ${sdk.id}`);
    if (!searchArticles(sdk.packageName).some(result => result.article.slug === `sdks/${sdk.id}`)) errors.push(`Package search missing language guide: ${sdk.packageName}`);
    await access(resolve(repository, `packages/${sdk.directory}/README.md`));
    if (!sdk.example || !sdk.install || !sdk.verify || !sdk.limits.length) errors.push(`Incomplete SDK integration: ${sdk.id}`);
    if (['sdk', 'react-native', 'expo'].includes(sdk.directory)) {
      const metadata = JSON.parse(await readFile(resolve(repository, `packages/${sdk.directory}/package.json`), 'utf8'));
      if (metadata.name !== sdk.packageName || metadata.version !== sdk.version) errors.push(`Package identity drift: ${sdk.id}`);
    }
  }
  if (errors.length) throw new Error(errors.join('\n'));

  directory = await mkdtemp(resolve(repository, 'apps/web/src/docs/.consumer-check-'));
  const excluded = new Set(['TypeScript', 'TypeScript · shape', 'TypeScript · abbreviated', 'Configuration', 'credentials.ts · server']);
  const full = docArticles.flatMap(article => article.sections.flatMap(section => section.blocks.filter(block => block.type === 'code' && block.language === 'typescript' && !excluded.has(block.title)).map(block => ({ article, block }))));
  const files = [];
  for (let i = 0; i < full.length; i++) {
    const { article, block } = full[i];
    const file = resolve(directory, `snippet-${i}.tsx`);
    files.push(file);
    await writeFile(file, `// ${article.slug} / ${block.title}\n${block.code}\n`);
  }
  const shim = resolve(directory, 'environment.d.ts');
  await writeFile(shim, "declare const process: { env: Record<string, string | undefined> };\ndeclare module 'node:assert/strict' { const assert: { equal(actual: unknown, expected: unknown): void }; export default assert; }\n");
  await writeFile(resolve(directory, 'tsconfig.json'), JSON.stringify({ compilerOptions: {
    strict: true, exactOptionalPropertyTypes: true, noUncheckedIndexedAccess: true,
    skipLibCheck: true, noEmit: true, module: 'NodeNext', moduleResolution: 'NodeNext',
    target: 'ES2022', jsx: 'react-jsx', lib: ['ES2022', 'DOM', 'DOM.Iterable'],
    paths: { '@belweave/search-sdk-react-native': [resolve(repository, 'packages/react-native/src/index.ts')], '@belweave/search-sdk-expo': [resolve(repository, 'packages/expo/dist/index.d.ts')], '@belweave/search-sdk': [resolve(repository, 'packages/sdk/src/index.ts')], '@belweave/search-sdk/*': [resolve(repository, 'packages/sdk/src/*.ts')] },
  }, files: [shim, ...files] }, null, 2));
  try {
    execFileSync(process.execPath, [resolve(repository, 'node_modules/typescript/bin/tsc'), '-p', resolve(directory, 'tsconfig.json')], { encoding: 'utf8' });
  } catch (error) {
    console.error(error.stdout);
    console.error(full.map((entry, index) => `snippet-${index}: ${entry.article.slug} / ${entry.block.title}`).join('\n'));
    throw new Error('Complete documentation examples failed consumer type checking');
  }
  console.log(`Passed: ${docArticles.length} articles SSR rendered; routes, section links, search, 404; ${full.length} complete examples type checked against SDK source.`);
} finally {
  await server.close();
  if (directory) await rm(directory, { recursive: true, force: true });
}
