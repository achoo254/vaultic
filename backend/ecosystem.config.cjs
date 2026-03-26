module.exports = {
  apps: [
    {
      name: "vaultic-backend",
      script: "dist/server.js",
      cwd: "/opt/vaultic/backend",
      instances: 1,
      exec_mode: "fork",
      env_production: {
        NODE_ENV: "production",
        SERVER_PORT: 8080,
      },
      max_memory_restart: "256M",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      error_file: "/var/log/vaultic/error.log",
      out_file: "/var/log/vaultic/out.log",
      merge_logs: true,
    },
  ],
};
