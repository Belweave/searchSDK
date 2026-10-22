import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { playgroundServer } from './server/vite-plugin.mjs';
export default defineConfig({
  plugins: [react(), tailwindcss(), playgroundServer()],
  resolve: { alias: { '@': new URL('./src', import.meta.url).pathname } },
  build: {
    target: 'es2022',
    sourcemap: false,
    modulePreload: {
      resolveDependencies(filename, dependencies, { hostType }) {
        // WebKit can retain a failed modulepreload across reloads. Let the
        // native lazy import fetch its own workspace; keep CSS/other hints.
        return hostType === 'js' && /(?:^|\/)(?:DocsWorkspace|Benchmarks)-[^/]+\.js$/.test(filename)
          ? dependencies.filter(dependency => dependency !== filename)
          : dependencies;
      },
    },
  },
});
