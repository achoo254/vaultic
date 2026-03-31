// PM2 ecosystem config for Vaultic backend
// Usage: NODE_ENV=staging pm2 start ecosystem.config.cjs
const mode = process.env.NODE_ENV || 'production';

module.exports = {
  apps: [{
    name: `vaultic-${mode}`,
    script: `dist/server-${mode}.js`,
    cwd: __dirname,
    instances: 1,
    exec_mode: 'fork',
    max_memory_restart: '256M',
    log_date_format: 'DD-MM-YYYY HH:mm:ss',
    merge_logs: true,
  }],
};
