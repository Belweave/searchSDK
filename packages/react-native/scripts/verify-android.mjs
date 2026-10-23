import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const scratch = resolve(root, '.local/android-consumer');
if (!process.env.GRADLE_BIN || !process.env.JAVA_HOME || !process.env.ANDROID_HOME) {
  throw new Error('Set GRADLE_BIN (Gradle 8.13), JAVA_HOME (JDK 17/21), and ANDROID_HOME (SDK 36) for actual Android/RN dependency verification.');
}
mkdirSync(scratch, { recursive: true });
writeFileSync(resolve(scratch, 'settings.gradle'), `
pluginManagement { repositories { google(); mavenCentral(); gradlePluginPortal() } }
dependencyResolutionManagement { repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS); repositories { google(); mavenCentral() } }
rootProject.name = 'searchsdk-react-native-verification'
include ':searchsdk'
project(':searchsdk').projectDir = file('../../android')
`);
writeFileSync(resolve(scratch, 'build.gradle'), `
plugins { id 'com.android.library' version '8.13.2' apply false }
subprojects {
  layout.buildDirectory.set(new File(rootProject.projectDir, "../android-build/\${project.name}"))
  configurations.configureEach { resolutionStrategy.force 'com.facebook.react:react-android:0.86.3' }
}
`);
writeFileSync(resolve(scratch, 'gradle.properties'), 'android.useAndroidX=true\norg.gradle.workers.max=2\n');
execFileSync(process.env.GRADLE_BIN, ['-p', scratch, '--project-cache-dir', resolve(root, '.local/gradle-cache'),
  '--no-daemon', '--max-workers=2', '-Dorg.gradle.jvmargs=-Xmx768m', ':searchsdk:assembleRelease', ':searchsdk:testReleaseUnitTest'], { stdio: 'inherit' });
console.log('Android release AAR and native HTTPS transport tests passed against actual React Native 0.86.3 dependencies.');
