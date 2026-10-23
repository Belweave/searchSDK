import { mkdirSync, symlinkSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const root = fileURLToPath(new URL('../', import.meta.url));
const rn = process.env.REACT_NATIVE_SOURCE_PATH;
if (!rn) throw new Error('Set REACT_NATIVE_SOURCE_PATH to the actual unpacked/installed React Native source directory.');
const scratch = resolve(root, '.local/ios-bridge');
mkdirSync(resolve(scratch, 'headers/React'), { recursive: true });
mkdirSync(resolve(scratch, 'headers/RCTDeprecation'), { recursive: true });
for (const name of ['RCTBridgeModule.h', 'RCTDefines.h', 'RCTJSThread.h', 'RCTBundleManager.h', 'RCTInvalidating.h']) {
  try { symlinkSync(resolve(rn, 'React/Base', name), resolve(scratch, 'headers/React', name)); }
  catch (error) { if (error.code !== 'EEXIST') throw error; }
}
try { symlinkSync(resolve(rn, 'ReactApple/Libraries/RCTFoundation/RCTDeprecation/Exported/RCTDeprecation.h'), resolve(scratch, 'headers/RCTDeprecation/RCTDeprecation.h')); }
catch (error) { if (error.code !== 'EEXIST') throw error; }
writeFileSync(resolve(scratch, 'headers/React/module.modulemap'), 'module React { header "RCTBridgeModule.h" header "RCTInvalidating.h" export * }\n');
const run = (binary, args) => execFileSync(binary, args, { stdio: 'inherit', cwd: root });
run('xcodebuild', ['-version']);
const sdk = execFileSync('xcrun', ['--sdk', 'iphonesimulator', '--show-sdk-path'], { encoding: 'utf8' }).trim();
run('xcrun', ['--sdk', 'iphonesimulator', 'clang', '-target', 'arm64-apple-ios15.1-simulator', '-isysroot', sdk,
  '-fobjc-arc', '-fmodules', '-fmodules-cache-path=' + resolve(scratch, 'clang-cache'), '-I', resolve(scratch, 'headers'),
  '-c', resolve(root, 'ios/SearchSDKGateway.m'), '-o', resolve(scratch, 'SearchSDKGateway.o')]);
run('xcrun', ['--sdk', 'iphonesimulator', 'swiftc', '-target', 'arm64-apple-ios15.1-simulator', '-sdk', sdk,
  '-swift-version', '5', '-module-name', 'SearchSDKReactNative', '-I', resolve(scratch, 'headers'),
  '-module-cache-path', resolve(scratch, 'swift-cache'), '-emit-library', '-emit-module',
  '-emit-module-path', resolve(scratch, 'SearchSDKReactNative.swiftmodule'),
  resolve(root, 'ios/GatewayTransport.swift'), resolve(root, 'ios/SearchSDKGateway.swift'),
  '-o', resolve(scratch, 'libSearchSDKReactNative.dylib')]);
console.log('Compiled Objective-C exports and Swift native bridge for generic arm64 iOS Simulator against actual React Native headers.');
