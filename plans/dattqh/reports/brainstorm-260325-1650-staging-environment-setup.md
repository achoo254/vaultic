---
type: brainstorm
date: 2026-03-25
topic: Staging environment setup
status: agreed
---

# Brainstorm: Staging Environment Setup

## Context
- VPS: CentOS 9, 103.72.98.65:24700 (SSH), fresh
- Deploy path: /var/www/vaultic/
- Domain: vaultic.inetdev.io.vn (80/443 open)
- CI/CD: GitLab Runner on gitlabs.inet.vn (registered)
- Scope: Full stack + extension CI

## Agreed Architecture
- Nginx (host) → reverse proxy → Docker containers (server + postgres)
- CI/CD: Option A — build on VPS (git pull + docker compose build)
- SSL: Let's Encrypt via Certbot
- PostgreSQL internal only

## .env Variables
DATABASE_URL, JWT_SECRET, POSTGRES_*, SERVER_HOST/PORT, DOMAIN, VITE_API_URL, DEPLOY_*

## Setup Steps (for future plan)
1. VPS: Docker + Compose + Nginx + Certbot
2. Nginx reverse proxy + SSL
3. /var/www/vaultic/ deployment folder
4. CI/CD deploy stage in .gitlab-ci.yml
5. Extension build artifacts in CI

## Decision: Fix 4 code review issues first, then implement staging.
