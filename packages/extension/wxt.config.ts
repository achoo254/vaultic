import { defineConfig } from 'wxt';

export default defineConfig({
  srcDir: 'src',
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'Vaultic Password Manager',
    description: 'Open-source, zero-knowledge password manager',
    permissions: ['storage', 'activeTab', 'scripting', 'alarms'],
    host_permissions: ['<all_urls>'],
  },
});
