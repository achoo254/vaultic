---
title: "Staging Environment Setup"
description: "Deploy Vaultic to CentOS 9 VPS via GitLab CI/CD"
status: in-progress
priority: P1
effort: 2h
branch: main
tags: [devops, staging, deployment, ci-cd]
created: 2026-03-25
updated: 2026-03-25
---

# Staging Environment Setup

Deploy Vaultic server + PostgreSQL to `vaultic.inetdev.io.vn` via GitLab CI/CD pipeline.

## Architecture

```
Cloudflare (HTTPS, Flexible) → HTTP → Nginx vhost (existing on VPS)
                                            ↓ proxy_pass
                                  Docker: vaultic-server (:8080, localhost only)
                                            ↓ internal network
                                  Docker: postgres:16 (not exposed)
```

## VPS: 103.72.98.65 (CentOS 9, 4GB+ RAM, SSH port 24700)
- Existing Nginx, multiple services
- Docker: not yet installed (CI auto-installs)
- Domain: vaultic.inetdev.io.vn → Cloudflare proxied

## Phases

| # | Phase | Status | Notes |
|---|-------|--------|-------|
| 1 | Config files in repo | complete | docker-compose.staging.yml, nginx vhost, .env.example |
| 2 | GitLab CI/CD pipeline | complete | .gitlab-ci.yml with deploy-staging stage |
| 3 | GitLab CI Variables | pending | User must set variables in GitLab UI |
| 4 | Deploy Key setup | pending | User must add SSH deploy key on VPS + GitLab |

## Files Created/Modified

| File | Action | Status |
|------|--------|--------|
| `docker/docker-compose.staging.yml` | Created | done |
| `docker/nginx/vaultic.conf` | Created | done |
| `.env.staging.example` | Created | done |
| `.gitlab-ci.yml` | Modified | done |

## User Manual Steps Required

### 1. GitLab CI/CD Variables (Settings → CI/CD → Variables)
| Variable | Type | Value |
|----------|------|-------|
| `DEPLOY_HOST` | Variable | `103.72.98.65` |
| `DEPLOY_PORT` | Variable | `24700` |
| `DEPLOY_USER` | Variable | `root` |
| `DEPLOY_SSH_KEY` | File | SSH private key for VPS |
| `DEPLOY_PATH` | Variable | `/var/www/vaultic` |
| `POSTGRES_PASSWORD` | Variable, masked | Strong random password |
| `JWT_SECRET` | Variable, masked | 64-char random string |

### 2. Deploy Key (VPS → GitLab)
```bash
# On VPS:
ssh-keygen -t ed25519 -C "vaultic-deploy" -f ~/.ssh/vaultic-deploy
cat ~/.ssh/vaultic-deploy.pub
# Add public key to GitLab: repo → Settings → Repository → Deploy Keys
# Add private key to GitLab CI Variable: DEPLOY_SSH_KEY (File type)
```

### 3. First Push to Main
Pipeline runs → auto-installs Docker → clones repo → builds → deploys.
