// Exact upstream headers for native bridge compilation; no package scripts run.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const root = fileURLToPath(new URL('../', import.meta.url));
const directory = resolve(root, '.local/upstream');
const archive = resolve(directory, 'react-native-0.86.3.tgz');
mkdirSync(directory, { recursive: true });
if (!existsSync(archive)) {
  execFileSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', [
    'pack', 'react-native@0.86.3', '--registry=https://registry.npmjs.org/',
    '--ignore-scripts', '--workspaces=false', '--json', '--pack-destination', directory,
  ], { cwd: root, stdio: 'pipe', timeout: 120_000 });
}
assert.equal(`sha512-${createHash('sha512').update(readFileSync(archive)).digest('base64')}`,
  'sha512-JR5s3bM9ezud+Mw24GlNXNfthqPIKwrQgPPJcam+L97t2sKjjEavhCzBn+fyqZZRcM5+XlhYxpTxVkK7e1n38Q==',
  'React Native reference archive integrity mismatch');
execFileSync('tar', ['-xzf', archive, '-C', directory], { stdio: 'pipe', timeout: 30_000 });
const metadata = JSON.parse(readFileSync(resolve(directory, 'package/package.json'), 'utf8'));
assert.equal(metadata.name, 'react-native');
assert.equal(metadata.version, '0.86.3');
console.log(`Verified official React Native 0.86.3 reference archive (SHA-512): ${directory}/package`);
