import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

// Only use on the dedicated generated fixture app, never an existing product app.
const directory = process.argv[2];
if (!directory) throw new Error('Pass the isolated generated iOS application directory containing AppDelegate.swift and Info.plist.');
const delegate = resolve(directory, 'AppDelegate.swift'), plist = resolve(directory, 'Info.plist');
const source = readFileSync(delegate, 'utf8');
if (!source.includes('class SceneDelegate:')) writeFileSync(delegate, source + `
// searchSDK deterministic native fixture scene lifecycle, required by iOS 27.
class SceneDelegate: UIResponder, UIWindowSceneDelegate {
  var window: UIWindow?
  func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
    guard let scene = scene as? UIWindowScene,
          let app = UIApplication.shared.delegate as? AppDelegate else { return }
    window = app.window
    window?.windowScene = scene
    window?.makeKeyAndVisible()
  }
}
`);
const run = command => execFileSync('/usr/libexec/PlistBuddy', ['-c', command, plist], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
let exists = false;
try { run('Print :UIApplicationSceneManifest'); exists = true; } catch { /* The Expo 57 fixture template has no scene manifest. */ }
if (!exists) {
  for (const command of [
    'Add :UIApplicationSceneManifest dict',
    'Add :UIApplicationSceneManifest:UIApplicationSupportsMultipleScenes bool false',
    'Add :UIApplicationSceneManifest:UISceneConfigurations dict',
    'Add :UIApplicationSceneManifest:UISceneConfigurations:UIWindowSceneSessionRoleApplication array',
    'Add :UIApplicationSceneManifest:UISceneConfigurations:UIWindowSceneSessionRoleApplication:0 dict',
    'Add :UIApplicationSceneManifest:UISceneConfigurations:UIWindowSceneSessionRoleApplication:0:UISceneConfigurationName string Default Configuration',
    'Add :UIApplicationSceneManifest:UISceneConfigurations:UIWindowSceneSessionRoleApplication:0:UISceneDelegateClassName string $(PRODUCT_MODULE_NAME).SceneDelegate',
  ]) run(command);
}
console.log('Dedicated fixture app scene lifecycle prepared.');
