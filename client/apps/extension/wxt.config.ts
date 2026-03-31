import { defineConfig } from 'wxt';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';

export default defineConfig({
  srcDir: 'src',
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'Vaultic Password Manager',
    description:
      'Open-source, zero-knowledge password manager with autofill',
    version: '1.0.0',
    icons: {
      '16': 'assets/icons/icon-16.png',
      '32': 'assets/icons/icon-32.png',
      '48': 'assets/icons/icon-48.png',
      '128': 'assets/icons/icon-128.png',
    },
    homepage_url: 'https://vaultic.inetdev.io.vn',
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
