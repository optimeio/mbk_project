# ─── Backend Dockerfile ───────────────────────────────────────────────────────
# Multi-stage build for minimal production image
# Stage 1: Dependencies
FROM node:22-alpine AS deps
WORKDIR /app

# Install build dependencies for native modules
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Stage 2: Production image
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5003

# Create non-root user
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 mbkapi

# Copy production dependencies
COPY --from=deps --chown=mbkapi:nodejs /app/node_modules ./node_modules

# Copy application source
COPY --chown=mbkapi:nodejs . .

# Create required directories
RUN mkdir -p /app/uploads/trainer-documents \
             /app/uploads/temp \
             /app/logs \
    && chown -R mbkapi:nodejs /app/uploads /app/logs

USER mbkapi

EXPOSE 5003

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5003/api/health', r => r.statusCode === 200 ? process.exit(0) : process.exit(1)).on('error', () => process.exit(1))"

CMD ["node", "server.mjs"]
