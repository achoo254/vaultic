// PM2 ecosystem config for Vaultic backend
module.exports = {
  apps: [{
    name: 'vaultic',
    script: 'server.js',
    cwd: __dirname,
    instances: 1,
    exec_mode: 'fork',
    max_memory_restart: '256M',
    log_date_format: 'DD-MM-YYYY HH:mm:ss',
    merge_logs: true,
  }],
};
