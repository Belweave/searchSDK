// Execute before importing Expo so its official web entry captures the fixture
// transport. Every fetch is local deterministic data; no provider can be called.
import './network-fixture';
import { registerRootComponent } from 'expo';
import App from './App';

registerRootComponent(App);
