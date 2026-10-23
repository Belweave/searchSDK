// Create an actual installed native app consumer with locked framework packages.
// Build both SDKs first: npm run build:mobile (repository root).
import assert from 'node:assert/strict';
import { cpSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const root = fileURLToPath(new URL('../', import.meta.url));
const fixture = resolve(root, 'test/native-app');
const storage = resolve(root, '.local');
mkdirSync(storage, { recursive: true });
const app = mkdtempSync(resolve(storage, 'locked-native-consumer-'));
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const env = { ...process.env, CI: '1', EXPO_NO_TELEMETRY: '1', npm_config_maxsockets: '2',
  npm_config_cache: resolve(storage, 'npm-cache') };
const lock = JSON.parse(readFileSync(resolve(fixture, 'consumer-lock.json'), 'utf8'));
const artifacts = [];
for (const directory of [root, resolve(root, '../expo')]) {
  const metadata = JSON.parse(readFileSync(resolve(directory, 'package.json'), 'utf8'));
  const entry = lock.packages[`node_modules/${metadata.name}`];
  assert.ok(entry, `Missing locked SDK entry: ${metadata.name}`);
  assert.equal(entry.version, metadata.version, 'Update the consumer lock when SDK versions change');
  for (const key of ['dependencies', 'optionalDependencies', 'peerDependencies', 'peerDependenciesMeta']) {
    assert.deepEqual(entry[key] ?? {}, metadata[key] ?? {}, `Update the consumer lock for ${metadata.name}/${key}`);
  }
  const output = JSON.parse(execFileSync(npm, ['pack', '.', '--ignore-scripts', '--workspaces=false',
    '--json', '--pack-destination', app], { cwd: directory, env, encoding: 'utf8', timeout: 60_000 }));
  const packed = Array.isArray(output) ? output[0] : output[metadata.name];
  assert.ok(packed?.integrity && packed?.filename && packed.files.some(file => file.path === 'dist/index.js'));
  assert.equal(entry.resolved, `file:${packed.filename}`);
  // Only the two local SDK hashes change. Every framework/transitive archive stays locked.
  entry.integrity = packed.integrity;
  artifacts.push({ name: metadata.name, filename: packed.filename, integrity: packed.integrity });
}
writeFileSync(resolve(app, 'package.json'), JSON.stringify({ ...lock.packages[''], private: true, main: 'index.js' }, null, 2) + '\n');
writeFileSync(resolve(app, 'package-lock.json'), JSON.stringify(lock, null, 2) + '\n');
writeFileSync(resolve(app, 'app.json'), JSON.stringify({ expo: {
  name: 'SearchSDKNativeVerification', slug: 'searchsdk-native-verification',
  ios: { bundleIdentifier: 'dev.belweave.searchsdkverification' },
  android: { package: 'dev.belweave.searchsdkverification' },
} }, null, 2) + '\n');
for (const filename of ['App.tsx', 'index.js']) cpSync(resolve(fixture, filename), resolve(app, filename));
const output = execFileSync(npm, ['ci', '--ignore-scripts', '--workspaces=false', '--no-audit', '--no-fund'],
  { cwd: app, env, encoding: 'utf8', timeout: 300_000, maxBuffer: 4 * 1024 * 1024 });
writeFileSync(resolve(app, 'install.log'), output);
for (const artifact of artifacts) {
  assert.equal(lstatSync(resolve(app, 'node_modules', artifact.name)).isSymbolicLink(), false,
    'Consumer must install SDK archives, not workspace links');
}
writeFileSync(resolve(app, 'sdk-artifacts.json'), JSON.stringify(artifacts, null, 2) + '\n');
writeFileSync(resolve(storage, 'latest-native-consumer.json'), JSON.stringify({ app, artifacts }, null, 2) + '\n');
console.log(`Locked native consumer installed: ${app}`);
console.log('Continue with test/native-app/README.md for platform build, test certificates, and device execution.');
