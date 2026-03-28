---
phase: 2
status: pending
priority: medium
---

# Phase 2: Update Docs — Remove Docker References

## Files to Update

### 1. `CLAUDE.md`

**Architecture section:** Remove docker/ from directory tree:
```
├── docker/
│   ├── Dockerfile                # Node.js 22 Alpine multi-stage build
│   ├── docker-compose.yml        # Backend only (MongoDB external)
│   ├── docker-compose.staging.yml
│   └── nginx/
```

**Tech Stack table:** Change Deploy row:
- FROM: `Docker (Node.js 22 Alpine) on CentOS 7`
- TO: `PM2 on CentOS 7 (direct Node.js)`

**Build & Dev Commands:** Remove Docker subsection entirely (lines 134-137).

**Environment section:**
- FROM: `Prod: CentOS 7 — Docker Compose (Node.js backend + nginx), MongoDB external`
- TO: `Prod: CentOS 7 — PM2 (Node.js backend) + nginx, MongoDB external`
- FROM: `Dev: Windows 11 — Node.js 22 + pnpm, MongoDB (external or Docker)`
- TO: `Dev: Windows 11 — Node.js 22 + pnpm, MongoDB (external)`

### 2. `docs/security-policy.md`

**Secrets Management §2:** Remove Docker line:
- DELETE: `Docker: Use --env-file or compose env_file: — NEVER bake secrets into image layers`
- ADD: `Server: .env file on production server, never committed to git`

### 3. `docs/codebase-summary.md`

Remove Docker references:
- Docker configs count in stats table
- docker/ from directory tree
- Docker row from tech stack table
- Docker build commands section
- Health probe Docker reference

### 4. `docs/system-architecture.md`

- Line 465: Remove Docker reference from MongoDB connection note
- Update deployment section if exists

### 5. `docs/project-overview-pdr.md`

Multiple Docker references — update deployment strategy:
- Container Runtime → PM2 process manager
- Orchestration → PM2 on CentOS 7
- Deployment → git pull + pnpm build + pm2 reload

## Success Criteria

- [ ] No Docker/Dockerfile/docker-compose mentions in CLAUDE.md
- [ ] security-policy.md updated
- [ ] codebase-summary.md updated
- [ ] system-architecture.md updated
- [ ] project-overview-pdr.md updated
- [ ] All references now say PM2 instead of Docker
