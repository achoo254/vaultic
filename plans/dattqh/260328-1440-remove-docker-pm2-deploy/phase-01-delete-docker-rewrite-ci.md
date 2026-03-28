---
phase: 1
status: pending
priority: high
---

# Phase 1: Delete Docker + Rewrite CI/CD

## Delete Files

Remove entire `docker/` directory:
- `docker/Dockerfile`
- `docker/docker-compose.yml`
- `docker/docker-compose.staging.yml`
- `docker/nginx/vaultic.conf`

## Rewrite `.gitlab-ci.yml`

Replace Docker-based pipeline with PM2 deployment.

### New Pipeline Structure

```yaml
stages:
  - test
  - build
  - deploy

# Stage 1: test — existing backend-check + node-build (keep as-is)

# Stage 2: build — existing extension-build (keep as-is)

# Stage 3: deploy — NEW: rsync + PM2 instead of Docker
deploy-staging:
  stage: deploy
  image: alpine:3.20
  only:
    - main
  before_script:
    - apk add --no-cache openssh-client rsync
    - mkdir -p ~/.ssh
    - cp "$DEPLOY_SSH_KEY" ~/.ssh/id_ed25519
    - chmod 600 ~/.ssh/id_ed25519
    - ssh-keyscan -p "$DEPLOY_PORT" "$DEPLOY_HOST" >> ~/.ssh/known_hosts 2>/dev/null
  script:
    # Pull latest code on server
    - SSH_CMD="ssh -p $DEPLOY_PORT $DEPLOY_USER@$DEPLOY_HOST"
    - $SSH_CMD "cd $DEPLOY_PATH && git fetch origin main && git reset --hard origin/main"

    # Write .env from CI variables
    - |
      $SSH_CMD "cat > $DEPLOY_PATH/backend/.env << ENVEOF
      NODE_ENV=production
      SERVER_PORT=8080
      MONGODB_URI=$MONGODB_URI
      JWT_SECRET=$JWT_SECRET
      CORS_ORIGIN=$CORS_ORIGIN
      LOG_LEVEL=info
      ENVEOF"

    # Install deps + build + restart PM2
    - $SSH_CMD "cd $DEPLOY_PATH && pnpm install --frozen-lockfile"
    - $SSH_CMD "cd $DEPLOY_PATH && pnpm --filter @vaultic/types build && pnpm --filter @vaultic/backend build"
    - $SSH_CMD "cd $DEPLOY_PATH/backend && pm2 reload ecosystem.config.cjs --update-env || pm2 start ecosystem.config.cjs"

    # Upload extension artifact
    - scp -P "$DEPLOY_PORT" vaultic-extension.zip "$DEPLOY_USER@$DEPLOY_HOST:$DEPLOY_PATH/extension/vaultic-extension.zip"

    # Health check
    - $SSH_CMD "sleep 2 && curl -sf http://127.0.0.1:8080/api/v1/health || echo 'WARNING: Health check failed'"
  environment:
    name: staging
    url: https://vaultic.inetdev.io.vn
  needs:
    - extension-build
```

### Required GitLab CI Variables (masked)

| Variable | Example | Purpose |
|----------|---------|---------|
| `DEPLOY_SSH_KEY` | (file type) | SSH private key for server |
| `DEPLOY_HOST` | `1.2.3.4` | Server IP |
| `DEPLOY_PORT` | `22` | SSH port |
| `DEPLOY_USER` | `root` | SSH user |
| `DEPLOY_PATH` | `/opt/vaultic` | Deploy directory |
| `MONGODB_URI` | `mongodb://...` | Database connection |
| `JWT_SECRET` | `random-256-bit` | JWT signing secret |
| `CORS_ORIGIN` | `https://vaultic.inetdev.io.vn` | CORS whitelist |

### Create PM2 Ecosystem Config

Create `backend/ecosystem.config.cjs`:

```javascript
module.exports = {
  apps: [{
    name: 'vaultic',
    script: 'dist/server.js',
    cwd: __dirname,
    instances: 1,
    env: { NODE_ENV: 'production' },
    env_file: '.env',
    max_memory_restart: '256M',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
  }],
};
```

## Success Criteria

- [ ] `docker/` directory deleted
- [ ] `.gitlab-ci.yml` rewritten — no Docker references
- [ ] `backend/ecosystem.config.cjs` created
- [ ] test + build stages unchanged
- [ ] deploy stage uses rsync + PM2
