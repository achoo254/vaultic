# Brainstorm: Remove Docker, Deploy via PM2 + CI/CD rsync

**Date:** 2026-03-28

## Problem
Docker adds unnecessary complexity for single-server deployment. Need simpler: build local/CI → upload → PM2.

## Decisions
- **Delete Docker entirely** — `docker/` directory, all compose files
- **CI/CD: GitLab CI** — build TS → inject .env from CI vars → rsync to server → pm2 restart
- **Server:** CentOS 7, Node.js + PM2 already installed
- **Secrets:** CI injects `.env` from GitLab masked variables
- **Upload (manual):** SFTP GUI (FileZilla) as fallback

## Solution

### Pipeline: build → deploy
```
build stage:
  - pnpm install
  - pnpm --filter backend build
  - artifact: dist/, package.json, pnpm-lock.yaml

deploy stage:
  - Create .env from CI variables
  - rsync artifact + .env → server via SSH
  - ssh: pnpm install --prod && pm2 reload vaultic
```

### Files to delete
- `docker/Dockerfile`
- `docker/docker-compose.yml`
- `docker/docker-compose.staging.yml`
- `docker/nginx/` (entire dir)

### Files to modify
- `.gitlab-ci.yml` — rewrite pipeline (no Docker, add rsync+SSH)
- `CLAUDE.md` — remove Docker section
- `docs/code-standards.md` — remove Docker references
- `docs/system-architecture.md` — update deployment section
- `docs/security-policy.md` — update secrets management (CI vars instead of Docker env)

## Risks
| Risk | Mitigation |
|------|-----------|
| Bad deploy | Keep previous dist/ as backup |
| Downtime | `pm2 reload` = zero-downtime |
| Secrets leak | GitLab masked vars, never echo |
