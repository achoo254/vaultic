import { defineConfig } from 'wxt';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';

export default defineConfig({
  srcDir: 'src',
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'Vaultic Password Manager',
    description: 'Open-source, zero-knowledge password manager',
    permissions: ['storage', 'activeTab', 'scripting', 'alarms', 'idle'],
    host_permissions: ['<all_urls>'],
    content_security_policy: {
      extension_pages:
        "script-src 'self' 'wasm-unsafe-eval'; object-src 'self';",
    },
  },
  vite: () => ({
    plugins: [wasm(), topLevelAwait()],
    server: {
      port: 3000,
      allowedHosts: true,
    },
  }),
});
