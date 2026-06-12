/**
 * PM2 Ecosystem Configuration
 * Enterprise-grade process management for 60,000+ users
 *
 * Usage:
 *   pm2 start ecosystem.config.js --env production
 *   pm2 start ecosystem.config.js --env staging
 *   pm2 reload ecosystem.config.js --env production   (zero-downtime reload)
 *   pm2 stop all
 *   pm2 logs
 *   pm2 monit
 */

const os = require('os');
const CPU_COUNT = os.cpus().length;
const MAX_BACKEND_WORKERS = Math.min(CPU_COUNT, 8);
const FRONTEND_WORKERS = Math.min(CPU_COUNT, 4);

module.exports = {
  apps: [
    // ── Backend API Server ──────────────────────────────────────────────────
    {
      name: 'mbk-api',
      script: './backend/server.mjs',
      cwd: './backend',
      instances: MAX_BACKEND_WORKERS,
      exec_mode: 'cluster',

      // Auto restart
      watch: false,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 1000,
      min_uptime: '5s',

      // Memory management — restart if worker exceeds 1 GB
      max_memory_restart: '1G',

      // Logs
      log_file: './logs/pm2/api-combined.log',
      error_file: './logs/pm2/api-error.log',
      out_file: './logs/pm2/api-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss.SSS',
      merge_logs: true,
      log_type: 'json',

      // Graceful shutdown
      kill_timeout: 10000,
      wait_ready: true,
      listen_timeout: 30000,
      shutdown_with_message: true,

      env: {
        NODE_ENV: 'development',
        PORT: 5003,
        HOST: 'localhost',
        UV_THREADPOOL_SIZE: 16,
      },
      env_staging: {
        NODE_ENV: 'staging',
        PORT: 5003,
        HOST: '0.0.0.0',
        UV_THREADPOOL_SIZE: 16,
        LOG_LEVEL: 'info',
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 5003,
        HOST: '0.0.0.0',
        UV_THREADPOOL_SIZE: 32,
        LOG_LEVEL: 'warn',
        DISABLE_REDIS: '0',
      },

      // Node.js optimization flags for production
      node_args: [
        '--max-old-space-size=1024',
        '--optimize-for-size',
      ],
    },

    // ── Next.js Frontend Server ────────────────────────────────────────────
    {
      name: 'mbk-frontend',
      script: 'node_modules/.bin/next',
      args: 'start --port 3000',
      cwd: './frontend',
      instances: FRONTEND_WORKERS,
      exec_mode: 'cluster',

      watch: false,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 2000,
      min_uptime: '10s',
      max_memory_restart: '512M',

      log_file: './logs/pm2/frontend-combined.log',
      error_file: './logs/pm2/frontend-error.log',
      out_file: './logs/pm2/frontend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss.SSS',
      merge_logs: true,

      kill_timeout: 10000,
      wait_ready: true,
      listen_timeout: 60000,

      env: {
        NODE_ENV: 'development',
        PORT: 3000,
      },
      env_staging: {
        NODE_ENV: 'staging',
        PORT: 3000,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
        NEXT_TELEMETRY_DISABLED: '1',
      },

      node_args: ['--max-old-space-size=512'],
    },

    // ── Background Workers ─────────────────────────────────────────────────
    {
      name: 'mbk-worker',
      script: './backend/workers/analyticsWorker.js',
      cwd: './backend',
      instances: 1,
      exec_mode: 'fork',

      watch: false,
      autorestart: true,
      max_restarts: 5,
      restart_delay: 5000,
      max_memory_restart: '256M',

      log_file: './logs/pm2/worker-combined.log',
      error_file: './logs/pm2/worker-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss.SSS',

      env: {
        NODE_ENV: 'development',
        WORKER_TYPE: 'analytics',
      },
      env_production: {
        NODE_ENV: 'production',
        WORKER_TYPE: 'analytics',
      },
    },
  ],

  // ── Deployment Configuration ──────────────────────────────────────────────
  deploy: {
    production: {
      user: 'deploy',
      host: [process.env.DEPLOY_HOST || 'your-server-ip'],
      ref: 'origin/main',
      repo: 'git@github.com:your-org/mbk-carrierz.git',
      path: '/var/www/mbk-carrierz',
      'pre-deploy-local': '',
      'post-deploy': [
        'npm install --prefix backend',
        'npm install --prefix frontend',
        'npm run build --prefix frontend',
        'pm2 reload ecosystem.config.js --env production',
        'pm2 save',
      ].join(' && '),
      'pre-setup': '',
    },
    staging: {
      user: 'deploy',
      host: [process.env.STAGING_HOST || 'staging-server-ip'],
      ref: 'origin/develop',
      repo: 'git@github.com:your-org/mbk-carrierz.git',
      path: '/var/www/mbk-carrierz-staging',
      'post-deploy': [
        'npm install --prefix backend',
        'npm install --prefix frontend',
        'npm run build --prefix frontend',
        'pm2 reload ecosystem.config.js --env staging',
      ].join(' && '),
    },
  },
};
