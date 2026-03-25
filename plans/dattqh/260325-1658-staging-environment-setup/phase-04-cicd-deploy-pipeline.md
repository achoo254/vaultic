# Phase 4: CI/CD Deploy Pipeline

## Context Links
- [Current .gitlab-ci.yml](../../../.gitlab-ci.yml)
- [Phase 3 — Docker Staging Config](phase-03-docker-staging-config.md)

## Overview
- **Priority**: P1
- **Status**: pending
- **Depends on**: Phase 1, 2, 3
- **Description**: Add deploy stage to GitLab CI that SSHs into VPS, pulls latest code, rebuilds Docker containers. Also add extension build artifacts.

## Current CI State

Existing stages: `test` → `build` → `deploy` (deploy is defined but empty).

Jobs:
- `rust-test` — cargo test + clippy + fmt
- `node-build` — pnpm build + lint
- `docker-build` — build + push to registry (only on main/tags)

## Requirements

### Functional
- Deploy stage triggers on `main` branch push (after tests pass)
- SSH into VPS, git pull, docker compose rebuild
- Extension `.zip` artifact available for download from CI
- Manual deploy option for tags (production-like)
- Rollback documented (git checkout previous commit + rebuild)

### Non-Functional
- Deploy takes < 5 minutes
- Zero-downtime not required for staging (acceptable to have brief downtime during rebuild)
- SSH key stored in GitLab CI Variables (never in repo)

## Architecture

```
GitLab CI Pipeline:
  test stage:    rust-test + node-build (parallel)
  build stage:   extension-build (artifacts)
  deploy stage:  deploy-staging (SSH → git pull → docker compose up --build)
```

## GitLab CI Variables Required

Set these in GitLab → Settings → CI/CD → Variables:

| Variable | Type | Protected | Masked | Description |
|----------|------|-----------|--------|-------------|
| `STAGING_SSH_KEY` | File | Yes | No | SSH private key for deploy user |
| `STAGING_HOST` | Variable | No | No | `103.72.98.65` |
| `STAGING_SSH_PORT` | Variable | No | No | `24700` |
| `STAGING_USER` | Variable | No | No | `deploy` |
| `STAGING_DEPLOY_PATH` | Variable | No | No | `/var/www/vaultic` |
| `POSTGRES_PASSWORD` | Variable | Yes | Yes | DB password |
| `JWT_SECRET` | Variable | Yes | Yes | JWT signing secret |

## Implementation Steps

### 1. Modify `.gitlab-ci.yml` — add extension build job

```yaml
extension-build:
  stage: build
  image: node:22-alpine
  before_script:
    - corepack enable
    - pnpm install --frozen-lockfile
  script:
    - pnpm --filter @vaultic/types build
    - pnpm --filter @vaultic/crypto build
    - pnpm --filter @vaultic/storage build
    - pnpm --filter @vaultic/sync build
    - pnpm --filter @vaultic/api build
    - pnpm --filter @vaultic/ui build
    - pnpm --filter extension build
  artifacts:
    paths:
      - packages/extension/.output/
    expire_in: 30 days
  only:
    - main
    - tags
```

### 2. Modify `.gitlab-ci.yml` — add deploy job

```yaml
deploy-staging:
  stage: deploy
  image: alpine:latest
  only:
    - main
  before_script:
    - apk add --no-cache openssh-client
    - chmod 600 "$STAGING_SSH_KEY"
  script:
    - |
      ssh -o StrictHostKeyChecking=no \
          -i "$STAGING_SSH_KEY" \
          -p "$STAGING_SSH_PORT" \
          "$STAGING_USER@$STAGING_HOST" << 'DEPLOY'
        set -e
        cd /var/www/vaultic

        echo "--- Pulling latest code ---"
        git fetch origin main
        git reset --hard origin/main

        echo "--- Writing .env ---"
        cat > .env << EOF
        POSTGRES_DB=vaultic
        POSTGRES_USER=vaultic
        POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
        JWT_SECRET=${JWT_SECRET}
        RUST_LOG=info
        EOF

        echo "--- Rebuilding containers ---"
        docker compose -f docker/docker-compose.staging.yml up -d --build

        echo "--- Waiting for health check ---"
        sleep 5
        curl -sf http://127.0.0.1:8080/health || echo "WARNING: Health check failed"

        echo "--- Done ---"
        docker compose -f docker/docker-compose.staging.yml ps
      DEPLOY
  environment:
    name: staging
    url: https://vaultic.inetdev.io.vn
```

### 3. Remove or update existing `docker-build` job

The `docker-build` job pushes to the container registry, which is not needed for the "build on VPS" approach. Options:
- **Keep it** for future production use (registry-based deploys)
- **Scope it** to tags only (not `main`)

Recommended: keep for tags only:
```yaml
docker-build:
  only:
    - tags  # Remove 'main' — staging builds on VPS directly
```

### 4. SSH key setup on VPS

```bash
# On local machine or CI:
ssh-keygen -t ed25519 -C "gitlab-ci-deploy" -f gitlab-deploy-key -N ""

# Copy public key to VPS
ssh -p 24700 root@103.72.98.65 \
  "echo '$(cat gitlab-deploy-key.pub)' >> /home/deploy/.ssh/authorized_keys"

# Add private key to GitLab CI Variables as STAGING_SSH_KEY (type: File)
```

### 5. Git clone setup on VPS

```bash
# As deploy user on VPS
cd /var/www/vaultic
git clone git@gitlabs.inet.vn:dattqh/vaultic.git .
git config pull.rebase false
```

Note: Deploy user needs read access to the GitLab repo. Either:
- Add deploy key to GitLab project (Settings → Repository → Deploy Keys)
- Or use HTTPS clone with token

## Rollback Procedure

```bash
# SSH into VPS
cd /var/www/vaultic
git log --oneline -5                                    # Find previous good commit
git checkout <previous-commit-sha>                       # Switch to it
docker compose -f docker/docker-compose.staging.yml up -d --build
```

## Related Code Files

| File | Action |
|------|--------|
| `.gitlab-ci.yml` | **Modify** — add extension-build + deploy-staging jobs |

## Full Updated `.gitlab-ci.yml` (reference)

The final file should have this structure:
```
stages: test, build, deploy

rust-test          (stage: test)      — unchanged
node-build         (stage: test)      — unchanged
extension-build    (stage: build)     — NEW
docker-build       (stage: build)     — modify: tags only
deploy-staging     (stage: deploy)    — NEW
```

## Todo List
- [ ] Generate SSH keypair for CI deploy
- [ ] Add public key to VPS deploy user's authorized_keys
- [ ] Add private key as `STAGING_SSH_KEY` (File type) in GitLab CI Variables
- [ ] Add all other CI variables (STAGING_HOST, STAGING_SSH_PORT, etc.)
- [ ] Add `POSTGRES_PASSWORD` and `JWT_SECRET` as masked variables
- [ ] Setup deploy key or token for git clone on VPS
- [ ] Clone repo to `/var/www/vaultic` on VPS as deploy user
- [ ] Add `extension-build` job to `.gitlab-ci.yml`
- [ ] Add `deploy-staging` job to `.gitlab-ci.yml`
- [ ] Scope `docker-build` to tags only
- [ ] Push to main and verify full pipeline runs
- [ ] Verify `https://vaultic.inetdev.io.vn/health` returns 200 after deploy
- [ ] Download extension artifact from CI and verify it works

## Success Criteria
- Pipeline: test → build → deploy completes successfully on main push
- `https://vaultic.inetdev.io.vn/health` returns "ok" after deploy
- Extension `.zip` downloadable from GitLab CI artifacts
- Subsequent pushes to main trigger redeploy automatically
- Rollback procedure tested and documented

## Risk Assessment

| Risk | Mitigation |
|------|-----------|
| SSH connection timeout in CI | Set `ServerAliveInterval 60` in SSH config |
| Build OOM on VPS | Monitor with `docker stats`; add swap if < 2GB RAM |
| Git pull conflicts | Use `git reset --hard origin/main` (staging is disposable) |
| Secrets leaked in CI logs | All sensitive vars are masked in GitLab CI |
| Deploy during active use | Staging — acceptable; add manual trigger for prod later |

## Security Considerations
- SSH key is Ed25519, stored as GitLab CI File variable (protected + masked)
- Deploy user has minimal permissions (Docker group only, owns only /var/www/vaultic)
- Secrets written to `.env` on VPS via heredoc (not committed)
- `POSTGRES_PASSWORD` and `JWT_SECRET` are masked in CI logs
- No root SSH access used in CI pipeline

## Next Steps
- After staging is stable, plan production deploy (separate VPS, registry-based)
- Add health check monitoring (uptime robot or similar)
- Add database migration step to deploy script when SeaORM migrations are ready
