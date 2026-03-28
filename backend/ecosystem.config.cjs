// PM2 ecosystem config for Vaultic backend
module.exports = {
  apps: [{
    name: 'vaultic',
    script: 'dist/server.js',
    cwd: __dirname,
    instances: 1,
    exec_mode: 'fork',
    env_file: '.env',
    max_memory_restart: '256M',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    merge_logs: true,
  }],
};
