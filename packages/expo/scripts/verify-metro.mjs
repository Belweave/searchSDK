// Opt-in real consumer check. Installs official dependencies only inside this
// package's ignored .local directory, then exports each target sequentially.
import assert from 'node:assert/strict';
import { cpSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const storage = join(root, '.local');
mkdirSync(storage, { recursive: true });
const reuse = process.argv[2] === '--reuse' ? process.argv[3] : undefined;
if (process.argv.length > 2 && !reuse) throw new Error('Usage: node scripts/verify-metro.mjs [--reuse /absolute/path/to/existing/local/consumer]');
const app = reuse ? resolve(reuse) : mkdtempSync(join(storage, 'metro-'));
assert.ok(app.startsWith(storage + '/'), 'Consumer storage must remain inside packages/expo/.local.');
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const env = { ...process.env, CI: '1', EXPO_NO_TELEMETRY: '1', npm_config_maxsockets: '2', npm_config_cache: join(storage, 'npm-cache') };
function run(command, args, cwd, label, offline = false) {
  console.log(`${label}: ${command} ${args.join(' ')}`);
  const result = spawnSync(command, args, { cwd, env: { ...env, ...(offline ? { EXPO_OFFLINE: '1' } : {}) }, encoding: 'utf8', timeout: 300_000, maxBuffer: 4 * 1024 * 1024 });
  writeFileSync(join(app, `${label}.log`), `${result.stdout ?? ''}\n${result.stderr ?? ''}`);
  assert.equal(result.status, 0, `${label} failed (${result.error?.message ?? result.status}):\n${result.stdout}\n${result.stderr}`);
  return result.stdout;
}
function pack(packageRoot, label) {
  const parsed = JSON.parse(run(npm, ['pack', '.', '--ignore-scripts', '--workspaces=false', '--json', '--pack-destination', app], packageRoot, label));
  const artifacts = Array.isArray(parsed) ? parsed : Object.values(parsed);
  assert.equal(artifacts.length, 1);
  return artifacts[0];
}
const expoSdk = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const nativeRoot = resolve(root, '../react-native');
const nativeSdk = JSON.parse(readFileSync(join(nativeRoot, 'package.json'), 'utf8'));
const expoArtifact = pack(root, 'pack-expo');
const nativeArtifact = pack(nativeRoot, 'pack-react-native');
const dependencyVersions = {
  '@belweave/search-sdk-expo': `file:./${expoArtifact.filename}`,
  '@belweave/search-sdk-react-native': `file:./${nativeArtifact.filename}`,
  expo: '57.0.31', react: '19.2.3', 'react-dom': '19.2.3',
  'react-native': '0.86.3', 'react-native-web': '0.21.2', '@expo/metro-runtime': '57.0.17',
};
writeFileSync(join(app, 'package.json'), JSON.stringify({ name: 'searchsdk-expo-metro-consumer', version: '0.0.0', private: true, main: 'index.js', dependencies: dependencyVersions }, null, 2));
writeFileSync(join(app, 'app.json'), JSON.stringify({ expo: { name: 'searchSDK Expo consumer', slug: 'searchsdk-expo-consumer', platforms: ['web', 'ios', 'android'], web: { bundler: 'metro', output: 'single' } } }, null, 2));
for (const file of ['index.js', 'network-fixture.js', 'App.tsx']) cpSync(join(root, 'test/metro-app', file), join(app, file));
cpSync(resolve(root, '../../sdk-contract/fixtures/search-success.json'), join(app, 'search-success.json'));
if (!reuse) {
  const lock = JSON.parse(readFileSync(join(nativeRoot, 'test/native-app/consumer-lock.json'), 'utf8'));
  assert.deepEqual(lock.packages[''].dependencies, dependencyVersions, 'Update the shared consumer lock when framework versions change.');
  for (const [metadata, artifact] of [[expoSdk, expoArtifact], [nativeSdk, nativeArtifact]]) {
    const entry = lock.packages[`node_modules/${metadata.name}`];
    assert.equal(entry.version, metadata.version);
    assert.equal(entry.resolved, `file:${artifact.filename}`);
    for (const key of ['dependencies', 'optionalDependencies', 'peerDependencies', 'peerDependenciesMeta']) {
      assert.deepEqual(entry[key] ?? {}, metadata[key] ?? {}, `Update the consumer lock for ${metadata.name}/${key}`);
    }
    entry.integrity = artifact.integrity;
  }
  writeFileSync(join(app, 'package-lock.json'), JSON.stringify(lock, null, 2) + '\n');
  run(npm, ['ci', '--ignore-scripts', '--workspaces=false', '--no-audit', '--no-fund'], app, 'install');
}
for (const [name, source] of [[expoSdk.name, root], [nativeSdk.name, nativeRoot]]) {
  const installed = join(app, 'node_modules', name);
  assert.ok(!lstatSync(installed).isSymbolicLink(), `${name} must be installed from its packed artifact, not a workspace symlink.`);
  // Reuse is allowed only if installed distributable JS matches this checkout.
  for (const file of readdirSync(join(source, 'dist')).filter(file => file.endsWith('.js'))) {
    assert.ok(readFileSync(join(installed, 'dist', file), 'utf8') === readFileSync(join(source, 'dist', file), 'utf8'), `${name}/${file} changed; run a fresh consumer instead of --reuse.`);
  }
}
const cli = join(app, 'node_modules/expo/bin/cli');
const outputs = [];
for (const platform of ['web', 'ios', 'android']) {
  const args = [cli, 'export', '--platform', platform, '--max-workers', '2', '--output-dir', `dist-${platform}`];
  if (platform !== 'web') args.push('--no-bytecode');
  run(process.execPath, args, app, `export-${platform}`, true);
  const output = join(app, `dist-${platform}`);
  assert.ok(existsSync(join(output, 'metadata.json')));
  outputs.push({ platform, output, nativeCompilation: false });
}
const report = {
  app, dependencyVersions, artifacts: [expoArtifact.filename, nativeArtifact.filename],
  outputs, maxWorkers: 2, exportOffline: true, providerCalls: 0,
  browserRuntime: 'Serve dist-web locally and inspect globalThis.__searchSDKSmoke; expected passed, five assertions and six deterministic requests.',
  nativeRuntimeVerified: false,
};
writeFileSync(join(storage, 'metro-verification.json'), JSON.stringify(report, null, 2) + '\n');
console.log(`Actual Expo consumer exported all targets: ${app}. No native compilation or device execution. Report: ${join(storage, 'metro-verification.json')}`);
