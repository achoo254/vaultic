# Phase 6: Deploy & Infrastructure

## Context
- [plan.md](./plan.md) | Depends on phase 5
- Current: Docker Compose (Postgres + Rust server), Dockerfile for Rust multi-stage build
- Target: Docker Compose (MongoDB + Node.js), PM2 on CentOS 7/9

## Overview
- **Priority:** P2
- **Status:** completed
- **Description:** Docker Compose for dev, PM2 config for prod, Nginx update, env config, build scripts.

## Files to Create

```
backend/
├── .env.example               # Environment template
├── ecosystem.config.cjs       # PM2 config
docker/
├── docker-compose.yml         # REWRITE: MongoDB + Node.js backend
├── Dockerfile                 # REWRITE: Node.js multi-stage build
├── nginx/
│   └── vaultic.conf           # Nginx reverse proxy config
```

## Files to Modify/Delete

| File | Change |
|------|--------|
| `docker/docker-compose.yml` | Replace Postgres with MongoDB, replace Rust server with Node.js |
| `docker/Dockerfile` | Rewrite for Node.js |

## Implementation Steps

### 1. Environment Config (.env.example)

```env
# backend/.env.example
NODE_ENV=production
SERVER_PORT=8080
MONGODB_URI=mongodb://localhost:27017/vaultic
JWT_SECRET=change-me-in-production
ACCESS_TOKEN_TTL_MIN=15
REFRESH_TOKEN_TTL_DAYS=7
CORS_ORIGIN=*
LOG_LEVEL=info
```

### 2. Docker Compose (dev)

```yaml
# docker/docker-compose.yml
services:
  mongo:
    image: mongo:7
    ports:
      - "27017:27017"
    environment:
      MONGO_INITDB_DATABASE: vaultic
    volumes:
      - mongodata:/data/db
    healthcheck:
      test: ["CMD", "mongosh", "--eval", "db.adminCommand('ping')"]
      interval: 5s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: ..
      dockerfile: docker/Dockerfile
    ports:
      - "8080:8080"
    environment:
      NODE_ENV: development
      MONGODB_URI: mongodb://mongo:27017/vaultic
      JWT_SECRET: ${JWT_SECRET:-dev-secret-change-in-prod}
      LOG_LEVEL: debug
    depends_on:
      mongo:
        condition: service_healthy

volumes:
  mongodata:
```

### 3. Dockerfile (Node.js multi-stage)

```dockerfile
# docker/Dockerfile
FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY backend/package.json backend/
COPY shared/types/package.json shared/types/
RUN pnpm install --frozen-lockfile --filter @vaultic/backend --filter @vaultic/types

# Build
FROM deps AS build
COPY backend/ backend/
COPY shared/types/ shared/types/
RUN pnpm --filter @vaultic/types build
RUN pnpm --filter @vaultic/backend build

# Production
FROM node:22-alpine AS production
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/backend/node_modules ./backend/node_modules
COPY --from=deps /app/shared/types/node_modules ./shared/types/node_modules
COPY --from=build /app/backend/dist ./backend/dist
COPY --from=build /app/backend/package.json ./backend/
COPY --from=build /app/shared/types/dist ./shared/types/dist
COPY --from=build /app/shared/types/package.json ./shared/types/

ENV NODE_ENV=production
EXPOSE 8080
CMD ["node", "backend/dist/server.js"]
```

### 4. PM2 Ecosystem Config

```javascript
// backend/ecosystem.config.cjs
module.exports = {
  apps: [{
    name: 'vaultic-backend',
    script: 'dist/server.js',
    cwd: '/opt/vaultic/backend',
    instances: 1,           // Single instance (in-memory rate limiter)
    exec_mode: 'fork',
    env_production: {
      NODE_ENV: 'production',
      SERVER_PORT: 8080,
    },
    max_memory_restart: '256M',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    error_file: '/var/log/vaultic/error.log',
    out_file: '/var/log/vaultic/out.log',
    merge_logs: true,
  }],
};
```

### 5. Nginx Config

```nginx
# docker/nginx/vaultic.conf
upstream vaultic_backend {
    server 127.0.0.1:8080;
}

server {
    listen 80;
    server_name _;

    # API + share page
    location / {
        proxy_pass http://vaultic_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Body size for sync push
        client_max_body_size 5m;
    }

    # Health check (no logging)
    location = /api/v1/health {
        proxy_pass http://vaultic_backend;
        access_log off;
    }
}
```

### 6. Build & Deploy Script

Add to `backend/package.json` scripts:
```json
{
  "build": "tsc",
  "start": "node dist/server.js",
  "start:pm2": "pm2 start ecosystem.config.cjs --env production"
}
```

### 7. Production Deploy Steps (CentOS 7/9)

1. Install Node.js 22 LTS via nvm or nodesource
2. Install PM2 globally: `npm i -g pm2`
3. Install MongoDB 7 (or use Docker)
4. Clone repo, `pnpm install --frozen-lockfile`
5. Build: `pnpm --filter @vaultic/types build && pnpm --filter @vaultic/backend build`
6. Copy `.env.example` to `.env`, fill secrets
7. Start: `pm2 start ecosystem.config.cjs --env production`
8. Setup PM2 startup: `pm2 startup && pm2 save`

## Todo

- [x] Create `backend/.env.example`
- [x] Rewrite `docker/docker-compose.yml` (MongoDB + Node.js)
- [x] Rewrite `docker/Dockerfile` (Node.js multi-stage)
- [x] Create `backend/ecosystem.config.cjs` (PM2)
- [x] Create `docker/nginx/vaultic.conf`
- [x] Manual test: `docker compose up` starts mongo + backend
- [x] Manual test: health check works via Docker
- [x] Manual test: PM2 starts and restarts on crash
- [x] Document deploy steps in .env.example comments

## Success Criteria
- `docker compose up` starts MongoDB + backend, health check passes
- Dockerfile builds successfully, image < 200MB
- PM2 manages process with auto-restart
- Nginx proxies all routes correctly

## Risk Assessment
- **CentOS 7 EOL**: Docker isolates from OS. Node.js 22 runs fine in container.
- **MongoDB auth**: Dev compose has no auth. Prod should enable auth + create dedicated user. Document in .env.example.
- **Single PM2 instance**: Required by in-memory rate limiter. Scale later with Redis.
