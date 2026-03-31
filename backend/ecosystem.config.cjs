// PM2 ecosystem config for Vaultic backend
// Usage: pm2 start ecosystem.config.cjs
// Reads NODE_ENV from .env file to select the correct build
const fs = require('fs');
const path = require('path');

let mode = process.env.NODE_ENV || 'production';
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const match = fs.readFileSync(envPath, 'utf8').match(/^NODE_ENV=(.+)$/m);
  if (match) mode = match[1].trim();
}

module.exports = {
  apps: [{
    name: 'vaultic',
    script: `server-${mode}.js`,
    cwd: __dirname,
    instances: 1,
    exec_mode: 'fork',
    max_memory_restart: '256M',
    log_date_format: 'DD-MM-YYYY HH:mm:ss',
    merge_logs: true,
  }],
};
