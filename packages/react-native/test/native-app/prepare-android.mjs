import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Only use on the dedicated generated fixture app; production SDK TLS stays unchanged.
const [consumer, certificate] = process.argv.slice(2);
if (!consumer || !certificate) throw new Error('Pass the isolated consumer root and localhost TLS fixture certificate path.');
const app = resolve(consumer, 'android/app');
mkdirSync(resolve(app, 'src/main/res/raw'), { recursive: true });
mkdirSync(resolve(app, 'src/main/res/xml'), { recursive: true });
copyFileSync(certificate, resolve(app, 'src/main/res/raw/fixture_ca.pem'));
writeFileSync(resolve(app, 'src/main/res/xml/searchsdk_test_network.xml'),
  '<network-security-config><domain-config cleartextTrafficPermitted="false"><domain includeSubdomains="false">127.0.0.1</domain><trust-anchors><certificates src="@raw/fixture_ca" /></trust-anchors></domain-config></network-security-config>\n');
const manifest = resolve(app, 'src/main/AndroidManifest.xml');
let xml = readFileSync(manifest, 'utf8');
if (xml.includes('android:networkSecurityConfig=') && !xml.includes('@xml/searchsdk_test_network')) throw new Error('Refusing to replace an existing application networking policy. Use a dedicated fixture app.');
if (!xml.includes('android:networkSecurityConfig=')) xml = xml.replace(/<application\b/, '<application android:networkSecurityConfig="@xml/searchsdk_test_network"');
writeFileSync(manifest, xml);
const gradle = resolve(app, 'build.gradle'), source = readFileSync(gradle, 'utf8');
if (!source.includes('// searchSDK deterministic native fixture build bounds')) writeFileSync(gradle, source + `
// searchSDK deterministic native fixture build bounds
react { extraPackagerArgs = ["--max-workers", "2"] }
android { defaultConfig { externalNativeBuild { cmake {
  arguments "-DCMAKE_JOB_POOLS=compile=2;link=1", "-DCMAKE_JOB_POOL_COMPILE=compile", "-DCMAKE_JOB_POOL_LINK=link"
} } } }
`);
console.log('Dedicated Android fixture certificate policy and bounded build prepared.');
