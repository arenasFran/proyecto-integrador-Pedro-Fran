module.exports = {
  apps: [
    {
      name: 'barber-api',
      script: 'dist/index.js',
      cwd: '.',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
      },
      error_file: 'logs/error.log',
      out_file: 'logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      kill_timeout: 10000,
      wait_ready: false,
      listen_timeout: 10000,
    },
  ],
};
