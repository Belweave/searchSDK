// Read unmodified official npm Expo sources; never fetch or execute native code.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { readFileSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
let directories = process.argv.slice(2);
if (!directories.length) {
  if (process.env.EXPO_PACKAGE_DIR) directories = [process.env.EXPO_PACKAGE_DIR];
  else {
    try { directories = [dirname(require.resolve('expo/package.json'))]; }
    catch { directories = [join(root, '.local/upstream/package')]; }
  }
}
const reports = [];
for (const directory of directories) {
  const packageRoot = resolve(directory);
  const metadata = JSON.parse(readFileSync(join(packageRoot, 'package.json'), 'utf8'));
  assert.equal(metadata.name, 'expo');
  assert.match(metadata.version, /^(55|56|57)\./);
  const hashes = {};
  function source(path) {
    const content = readFileSync(join(packageRoot, path), 'utf8');
    hashes[path] = createHash('sha256').update(content).digest('hex');
    return content;
  }
  const js = source('src/winter/fetch/fetch.ts');
  assert.match(js, /const redirect = init\?\.redirect/);
  assert.match(js, /credentials = init\?\.credentials/);
  assert.match(js, /credentials: credentials \?\? 'include'/);
  assert.match(js, /redirect: redirect \?\? 'follow'/);
  assert.match(js, /request\.start\(/);
  assert.match(js, /request\.cancel\(/);
  const android = source('android/src/main/java/expo/modules/fetch/NativeRequest.kt');
  assert.match(android, /if \(requestInit\.credentials != NativeRequestCredentials\.INCLUDE\)\s*\{\s*clientBuilder\.cookieJar\(CookieJar\.NO_COOKIES\)/);
  assert.match(android, /if \(requestInit\.redirect != NativeRequestRedirect\.FOLLOW\)\s*\{\s*clientBuilder\.followRedirects\(false\)\s*clientBuilder\.followSslRedirects\(false\)/);
  assert.match(android, /response\.redirectMode = requestInit\.redirect/);
  const androidResponse = source('android/src/main/java/expo/modules/fetch/NativeResponse.kt');
  assert.match(androidResponse, /response\.isRedirect && redirectMode == NativeRequestRedirect\.ERROR/);
  assert.match(androidResponse, /FetchRedirectException\(\)/);
  const ios = source('ios/Fetch/ExpoURLSessionTask.swift');
  assert.match(ios, /if requestInit\.credentials == \.include\s*\{[\s\S]*?\} else \{\s*request\.httpShouldHandleCookies = false/);
  const iosRequest = source('ios/Fetch/NativeRequest.swift');
  assert.match(iosRequest, /self\.response\.redirectMode = requestInit\.redirect/);
  const iosResponse = source('ios/Fetch/NativeResponse.swift');
  assert.match(iosResponse, /shouldFollowRedirects = self\.redirectMode == \.follow/);
  assert.match(iosResponse, /completionHandler\(shouldFollowRedirects \? request : nil\)/);
  assert.match(iosResponse, /if self\.redirectMode == \.error/);
  assert.match(iosResponse, /FetchRedirectException\(\)/);
  const iosModule = source('ios/Fetch/ExpoFetchModule.swift');
  // Do not turn cookie omission into an unsupported stronger attestation. The
  // upstream default session does not explicitly disable URL credential storage.
  const defaultSession = /URLSessionConfiguration\.default/.test(iosModule);
  const disablesCredentialStore = /(?:urlCredentialStorage|URLCredentialStorage)\s*=\s*nil/.test(iosModule);
  const report = {
    version: metadata.version,
    provenance: `https://registry.npmjs.org/expo/-/expo-${metadata.version}.tgz`,
    sourceChecks: { androidRejectsRedirects: true, androidOmitsCookies: true, iosRejectsRedirects: true, iosOmitsCookies: true },
    nativeRuntimeVerified: false,
    iosDefaultCredentialStoreNotDisabled: defaultSession && !disablesCredentialStore,
    completeAmbientCredentialIsolationVerified: false,
    sha256: hashes,
  };
  reports.push(report);
  console.log(`Expo ${metadata.version}: Android/iOS redirect rejection and cookie omission confirmed in upstream source; complete ambient HTTP credential isolation NOT established; no device execution.`);
}
const local = join(root, '.local');
if (!existsSync(local)) mkdirSync(local, { recursive: true });
writeFileSync(join(local, 'expo-source-checks.json'), JSON.stringify(reports, null, 2) + '\n');
