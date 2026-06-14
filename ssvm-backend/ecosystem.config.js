module.exports = {
  apps: [{
    name: 'ssvm-backend',
    script: 'dist/index.js',
    instances: 'max',  // uses all CPU cores
    exec_mode: 'cluster',
    max_memory_restart: '1G',
    env_production: {
      NODE_ENV: 'production',
    },
    error_file: '/var/log/ssvm/error.log',
    out_file: '/var/log/ssvm/out.log',
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
  }]
};
