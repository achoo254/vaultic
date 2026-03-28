---
status: pending
priority: high
estimated_effort: small
---

# Plan: Remove Docker, Deploy via PM2 + CI/CD rsync

**Brainstorm:** `plans/dattqh/reports/brainstorm-260328-1440-remove-docker-pm2-deploy.md`

## Goal

Replace Docker-based deployment with direct PM2 deployment. CI/CD builds backend, rsync to server, PM2 reload. Simpler, fewer moving parts.

## Phases

| # | Phase | Status | File |
|---|-------|--------|------|
| 1 | Delete docker/ directory + rewrite .gitlab-ci.yml | pending | [phase-01](phase-01-delete-docker-rewrite-ci.md) |
| 2 | Update CLAUDE.md + project docs | pending | [phase-02](phase-02-update-docs.md) |

## Server Context

- **OS:** CentOS 7
- **Runtime:** Node.js 22 + PM2 (pre-installed)
- **CI/CD:** GitLab CI on gitlabs.inet.vn (self-hosted)
- **Secrets:** GitLab CI masked variables → `.env` injected during deploy
- **Deploy path:** `$DEPLOY_PATH` (CI variable)
