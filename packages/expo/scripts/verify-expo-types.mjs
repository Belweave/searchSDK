import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const tsc = join(dirname(require.resolve('typescript/package.json')), 'bin/tsc');
let directories = process.argv.slice(2);
if (!directories.length) {
  if (process.env.EXPO_PACKAGE_DIR) directories = [process.env.EXPO_PACKAGE_DIR];
  else {
    try { directories = [dirname(require.resolve('expo/package.json'))]; }
    catch { directories = [join(root, '.local/upstream/package')]; }
  }
}
for (const directory of directories) {
  const expo = resolve(directory);
  const metadata = JSON.parse(readFileSync(join(expo, 'package.json'), 'utf8'));
  assert.equal(metadata.name, 'expo');
  assert.match(metadata.version, /^(55|56|57)\./);
  const storage = join(root, '.local', `types-${metadata.version}`);
  mkdirSync(storage, { recursive: true });
  const config = join(storage, 'tsconfig.json');
  writeFileSync(config, JSON.stringify({
    extends: join(root, 'tsconfig.json'),
    compilerOptions: {
      noEmit: true,
      paths: {
        'expo/fetch': [join(expo, 'fetch.d.ts')],
        '@belweave/search-sdk-react-native': [resolve(root, '../react-native/dist/index.d.ts')],
      },
    },
    include: [join(root, 'src/**/*.ts')],
    exclude: [join(root, 'src/expo-fetch-shim.d.ts')],
  }, null, 2));
  const result = spawnSync(process.execPath, [tsc, '-p', config], { cwd: root, encoding: 'utf8' });
  assert.equal(result.status, 0, `Expo ${metadata.version} declaration compatibility failed:\n${result.stdout}\n${result.stderr}`);
  console.log(`Expo ${metadata.version}: adapter checked against actual upstream declarations, private shim excluded.`);
}
