import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

// Run through release:prepare for the complete checks. The parent release flow
// may invoke this after an already successful build:vercel of the same source.
const root = fileURLToPath(new URL('../', import.meta.url));
const directory = join(root, 'packages/sdk');
const pkg = JSON.parse(await readFile(join(directory, 'package.json'), 'utf8'));
assert.equal(pkg.name, '@belweave/search-sdk');
assert.notEqual(pkg.private, true, 'SDK package is private');
assert.equal(pkg.publishConfig.access, 'public');
assert.equal(pkg.publishConfig.registry, 'https://registry.npmjs.org/');
assert.equal(pkg.publishConfig.tag, 'alpha');
assert.match(pkg.version, /^\d+\.\d+\.\d+-alpha\.\d+$/);
const destination = join(root, '.local/releases', pkg.version);
await mkdir(destination, { recursive: true });
const packOutput = JSON.parse(execFileSync('npm', ['pack', '--json', '--ignore-scripts', '--pack-destination', destination], {
  cwd: directory, encoding: 'utf8', timeout: 60000, stdio: ['ignore', 'pipe', 'pipe'],
}));
const packed = Array.isArray(packOutput) ? packOutput[0] : packOutput[pkg.name];
assert(packed?.files?.length, 'npm pack did not return a package manifest');
assert(packed.files.every(file => /^(?:dist\/|README\.md$|GATEWAY\.md$|LICENSE$|package\.json$)/.test(file.path)), 'Unexpected release file');
const tarball = join(destination, packed.filename);
const sha256 = createHash('sha256').update(await readFile(tarball)).digest('hex');
await writeFile(join(destination, 'SHA256SUMS'), `${sha256}  ${packed.filename}\n`);
await writeFile(join(destination, 'manifest.json'), JSON.stringify({ name: pkg.name, version: pkg.version, tag: pkg.publishConfig.tag,
  filename: packed.filename, sha256, integrity: packed.integrity, size: packed.size, files: packed.files }, null, 2) + '\n');
console.log(`Prepared ${tarball}\nSHA-256 ${sha256}\n${packed.files.length} files; ${packed.size} packed bytes. Nothing published.`);
