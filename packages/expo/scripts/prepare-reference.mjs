// Fetch exact official Expo source archives for the build-only peer checks.
// No package scripts are run and no native/runtime dependencies are installed.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const references = [
  { version: '55.0.0', directory: '55', integrity: 'sha512-7/vIhW/gEa23r+BWMe81e2HnNFOp/gNhkkP7sFOoRhG7llcl85GJXgyxmvaapTTlzXY5u5RWqTKyXH5v6YD0QQ==' },
  { version: '56.0.0', directory: '56', integrity: 'sha512-hquSJvw5KWycDAgGumFRV+LHyvDDyWKKFvPJTEfjoyvVZit3P6vHTGJCgN/Stlzni9kGjwSiwxXsr2sCgosGTg==' },
  { version: '57.0.31', directory: '', integrity: 'sha512-+9AJvHZMLIY/Tv6r5Tpu84vWfI75FBTnineYqjjlHAU138IPg2gYQKn9FQFetCB9YScwyc7STk7WGHSCHAdTiQ==' },
];
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
for (const reference of references) {
  const storage = join(root, '.local/upstream', reference.directory);
  mkdirSync(storage, { recursive: true });
  const filename = `expo-${reference.version}.tgz`;
  const archive = join(storage, filename);
  if (!existsSync(archive)) {
    execFileSync(npm, ['pack', `expo@${reference.version}`, '--registry=https://registry.npmjs.org/', '--ignore-scripts', '--workspaces=false',
      '--json', '--pack-destination', storage], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'], timeout: 120_000,
      env: { ...process.env, npm_config_cache: join(root, '.local/npm-cache'), npm_config_maxsockets: '2' } });
  }
  const actual = `sha512-${createHash('sha512').update(readFileSync(archive)).digest('base64')}`;
  assert.equal(actual, reference.integrity, `Expo ${reference.version} source archive integrity mismatch`);
  execFileSync('tar', ['-xzf', archive, '-C', storage], { stdio: 'pipe', timeout: 30_000 });
  const metadata = JSON.parse(readFileSync(join(storage, 'package/package.json'), 'utf8'));
  assert.equal(metadata.name, 'expo');
  assert.equal(metadata.version, reference.version);
  console.log(`Verified official Expo ${reference.version} reference archive (SHA-512).`);
}
