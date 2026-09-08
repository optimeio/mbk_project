# MBK Carrierz Portal — Enterprise Deployment Guide
> Production-ready deployment for 60,000+ users

---

## Quick Start (Development)

```bash
npm install
npm run dev
```

---

## Architecture Overview

```
Internet → Nginx (SSL/Load Balancer)
             ├── /              → Next.js Frontend (PM2 cluster, 4 workers)
             ├── /api/          → Express Backend (PM2 cluster, 8 workers)
             └── /socket.io/    → Socket.io (sticky sessions)

Backend → MongoDB Atlas (primary + 2 replicas)
        → Redis (session + cache)
        → Cloudinary (file storage)
```

---

## 1. Prerequisites

```bash
# Server requirements (minimum)
- Ubuntu 22.04 LTS
- 8 vCPU, 16 GB RAM (production)
- 4 vCPU, 8 GB RAM (staging)
- 50 GB SSD storage

# Software
- Node.js 22.x
- npm 11.x
- MongoDB 7.x (or Atlas)
- Redis 7.x
- Nginx 1.27+
- PM2 5.x
- Docker 25+ (optional)
- Certbot (SSL)
```

---

## 2. Server Setup

```bash
# Update system
sudo apt-get update && sudo apt-get upgrade -y

# Install Node.js 22
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 globally
npm install -g pm2

# Install Nginx
sudo apt-get install -y nginx

# Install Redis
sudo apt-get install -y redis-server
sudo systemctl enable redis-server

# Install Certbot for SSL
sudo apt-get install -y certbot python3-certbot-nginx

# Create app user
sudo useradd -m -s /bin/bash deploy
sudo mkdir -p /var/www/mbk-carrierz
sudo chown -R deploy:deploy /var/www/mbk-carrierz
```

---

## 3. Environment Setup

```bash
# Copy environment files
cp .env.example .env
cp backend/.env.example backend/.env

# Required environment variables:
cat .env
```

```env
# Database
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/mbkcarrierz

# Redis
REDIS_URL=redis://localhost:6379

# Auth
JWT_SECRET=your-super-secret-key-min-64-chars
JWT_REFRESH_SECRET=your-refresh-secret-min-64-chars
SESSION_SECRET=your-session-secret

# App
NODE_ENV=production
PORT=5003
CORS_ALLOWED_ORIGINS=https://trainer.mbktechnologies.info

# Email
GMAIL_USER=mbktechnologies8@gmail.com
GMAIL_APP_PASSWORD=your-app-password

# Cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Metrics (optional)
METRICS_API_KEY=your-secure-metrics-key
```

---

## 4. Build & Deploy

```bash
# Install dependencies
npm install --prefix backend
npm install --prefix frontend

# Build Next.js frontend
NODE_ENV=production npm run build --prefix frontend

# Create MongoDB indexes (run once)
node scripts/create-indexes.mjs

# Start with PM2
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

---

## 5. Nginx Setup

```bash
# Copy Nginx config
sudo cp infra/nginx/nginx.conf /etc/nginx/nginx.conf
sudo cp infra/nginx/conf.d/mbk.conf /etc/nginx/conf.d/mbk.conf
sudo cp infra/nginx/conf.d/proxy-params.conf /etc/nginx/conf.d/proxy-params.conf

# Create cache directories
sudo mkdir -p /var/cache/nginx/api /var/cache/nginx/static
sudo chown -R www-data:www-data /var/cache/nginx

# Test and reload
sudo nginx -t
sudo systemctl reload nginx

# Get SSL certificate
sudo certbot --nginx -d trainer.mbktechnologies.info -d mbktechnologies.info

# Auto-renew SSL
sudo crontab -e
# Add: 0 3 * * * certbot renew --quiet && nginx -s reload
```

---

## 6. Docker Deployment (Alternative)

```bash
# Build and start all services
docker compose up -d --build

# Check status
docker compose ps
docker compose logs -f api

# Zero-downtime update
docker compose pull
docker compose up -d --no-deps --build api
docker compose up -d --no-deps --build frontend
```

---

## 7. Database Index Creation

```bash
# Creates all performance indexes for 1M+ records
node scripts/create-indexes.mjs
```

Indexes created:
- `users`: email (unique), role+active, phone
- `trainers`: userId (unique), status+city, skills
- `attendances`: trainer+schedule, college+date
- `schedules`: trainer+date, college+date, TTL
- `notifications`: userId+read, TTL (90 days)
- `otps`: TTL (10 minutes)
- `activitylogs`: TTL (1 year)
- ... and 40+ more indexes

---

## 8. Load Testing

```bash
# Install k6
sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update && sudo apt-get install k6

# Run load test
k6 run scripts/load-test.js

# With custom target
k6 run --env BASE_URL=https://api.mbktechnologies.info \
       --env AUTH_TOKEN=your-jwt-token \
       scripts/load-test.js
```

Expected results at 60K users:
| Metric | Target | Expected |
|--------|--------|---------|
| p50 response time | < 200ms | ~80ms |
| p95 response time | < 500ms | ~200ms |
| p99 response time | < 1000ms | ~500ms |
| Error rate | < 1% | < 0.1% |
| Throughput | > 1000 rps | ~2000+ rps |

---

## 9. Monitoring

```bash
# PM2 monitoring
pm2 monit
pm2 logs
pm2 status

# Application metrics
curl http://localhost:5003/api/metrics
curl http://localhost:5003/api/metrics/prometheus
curl http://localhost:5003/api/health/deep

# Log files
tail -f backend/logs/combined.log
tail -f backend/logs/error.log
tail -f logs/pm2/api-combined.log
```

---

## 10. Performance Checklist

### Backend
- [x] MongoDB connection pooling (20 connections)
- [x] Redis caching with circuit breaker
- [x] Response compression (gzip)
- [x] Rate limiting (Redis-backed)
- [x] Request correlation IDs
- [x] Slow query logging (>500ms)
- [x] Health check endpoints
- [x] Prometheus metrics

### Frontend
- [x] Next.js 15.3.8 App Router
- [x] Code splitting (dynamic imports)
- [x] Image optimization (AVIF/WebP)
- [x] Static asset immutable caching (1 year)
- [x] Bundle analysis (`npm run analyze`)
- [x] Skeleton loaders
- [x] Virtualized tables (react-window)

### Infrastructure
- [x] PM2 cluster mode (all CPU cores)
- [x] Nginx load balancing + caching
- [x] Redis session store (vs memory)
- [x] Docker multi-stage builds
- [x] SSL/TLS (TLS 1.3)
- [x] Security headers (HSTS, CSP, etc.)
- [x] MongoDB indexes (40+ indexes)

---

## 11. Troubleshooting

```bash
# Frontend not starting
pm2 logs mbk-frontend --lines 50

# Backend errors
pm2 logs mbk-api --lines 100
cat backend/logs/error.log

# Redis not connecting
redis-cli ping
systemctl status redis-server

# MongoDB slow queries
# Check logs: db.adminCommand({ getLog: 'global' })
# Run: node scripts/create-indexes.mjs

# Rate limiting too aggressive
# Set: DISABLE_RATE_LIMITER=1 in .env (dev only)

# High memory usage
pm2 restart all
# Or increase max_memory_restart in ecosystem.config.js
```

---

## 12. Backup Strategy

```bash
# MongoDB backup (add to cron)
mongodump --uri="$MONGODB_URI" --out="/backups/$(date +%Y%m%d)"

# Redis backup
redis-cli BGSAVE

# Automated backup script
# 0 2 * * * /scripts/backup.sh >> /var/log/backup.log 2>&1
```

---

*Generated by MBK Carrierz Engineering Team*
