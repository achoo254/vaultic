import { defineConfig } from 'wxt';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';

export default defineConfig({
  srcDir: 'src',
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'Vaultic Password Manager',
    description: 'Open-source, zero-knowledge password manager',
    permissions: ['storage', 'activeTab', 'scripting', 'alarms'],
    host_permissions: ['<all_urls>'],
  },
  vite: () => ({
    plugins: [wasm(), topLevelAwait()],
  }),
});
