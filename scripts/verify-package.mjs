import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, writeFile, mkdir, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const scratch = path.join(root, ".local");
await mkdir(scratch, { recursive: true });
const consumer = await mkdtemp(path.join(scratch, "package-consumer-"));
const packageRoot = path.join(root, "packages/sdk");
const pkg = JSON.parse(await readFile(path.join(packageRoot, "package.json"), "utf8"));
const command = (name, args, cwd = consumer) => execFileSync(name, args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 60_000 });
try {
  const packOutput = JSON.parse(command("npm", ["pack", "--json", "--ignore-scripts", "--pack-destination", consumer], packageRoot));
  const packed = Array.isArray(packOutput) ? packOutput[0] : packOutput[pkg.name];
  assert(packed?.files?.length, "npm pack did not return a package file manifest");
  assert(packed.files.every(({ path: name }) => !/(?:^|\/)(?:\.env[^/]*|test|src|node_modules|scripts)(?:\/|$)/.test(name)), "Tarball contains development or secret paths");
  await writeFile(path.join(consumer, "package.json"), JSON.stringify({ name: "searchsdk-package-check", version: "0.0.0", private: true, type: "module" }));
  command("npm", ["install", "--offline", "--ignore-scripts", "--no-audit", "--no-fund", "--package-lock=false", path.join(consumer, packed.filename)]);
  const specifiers = Object.keys(pkg.exports).map((entry) => entry === "." ? pkg.name : `${pkg.name}/${entry.slice(2)}`);
  await writeFile(path.join(consumer, "exports.mjs"), `import assert from 'node:assert/strict';\nfor (const name of ${JSON.stringify(specifiers)}) { const mod = await import(name); assert(Object.keys(mod).length > 0, name + ' is empty'); }\nconsole.log('Runtime exports: ${specifiers.length}');\n`);
  const imports = specifiers.map((name, i) => `import * as export${i} from ${JSON.stringify(name)};\nvoid export${i};`).join("\n");
  await writeFile(path.join(consumer, "consumer.ts"), `${imports}\n
import { createSearch, type SearchResponse } from '@belweave/search-sdk';
import { createMockProvider } from '@belweave/search-sdk/testing';
import { createContextClient } from '@belweave/search-sdk/native-context';
import { createTinyfishClient } from '@belweave/search-sdk/native-tinyfish';
import { createFileCheckpointStore } from '@belweave/search-sdk/durable-node';
import { runDurableOperation } from '@belweave/search-sdk/durable';
import { createSearchGateway } from '@belweave/search-sdk/gateway';
const search = createSearch({ provider: createMockProvider(), retry: { maxRetries: 1 }, maxConcurrency: 2, deduplicate: true, cache: { ttlMs: 1000, maxEntries: 4 } });
const result: SearchResponse = await search.web.search({ query: 'fixture' });
void result;
const gateway = createSearchGateway({ search, authorize: () => true });
const gatewayResponse = await gateway(new Request('https://app.example/search', {
  method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query: 'fixture' }),
}));
if (gatewayResponse.status !== 200) throw new Error('Packaged gateway failed');
const context = createContextClient({ apiKey: 'not-a-live-key' });
const tinyfish = createTinyfishClient({ apiKey: 'not-a-live-key' });
void context; void tinyfish; void createFileCheckpointStore; void runDurableOperation;
`);
  const typescript = path.join(root, "node_modules/typescript/bin/tsc");
  for (const [module, moduleResolution] of [["NodeNext", "NodeNext"], ["ESNext", "Bundler"]]) {
    await writeFile(path.join(consumer, "tsconfig.json"), JSON.stringify({ compilerOptions: { target: "ES2022", module, moduleResolution, lib: ["ES2022", "DOM", "DOM.Iterable"], strict: true, exactOptionalPropertyTypes: true, skipLibCheck: false, noEmit: true }, files: ["consumer.ts"] }));
    command(process.execPath, [typescript, "-p", "tsconfig.json"]);
    console.log(`Packed consumer declarations: ${moduleResolution} (skipLibCheck: false)`);
  }
  process.stdout.write(command(process.execPath, ["exports.mjs"]));
  process.stdout.write(command(process.execPath, ["consumer.ts"]));
  console.log(`Package boundary verified: ${packed.files.length} files, ${packed.size} bytes packed.`);
} catch (error) {
  if (error?.stdout) process.stderr.write(String(error.stdout));
  if (error?.stderr) process.stderr.write(String(error.stderr));
  throw error;
} finally {
  await rm(consumer, { recursive: true, force: true });
}
