# Phase 3: Docker Staging Config

## Context Links
- [Current docker-compose.yml](../../../docker/docker-compose.yml)
- [Current Dockerfile](../../../docker/Dockerfile)
- [Phase 2 — Nginx + SSL](phase-02-nginx-ssl-setup.md)

## Overview
- **Priority**: P1
- **Status**: pending
- **Depends on**: Phase 1, Phase 2
- **Description**: Create staging Docker Compose config, env template, and deploy structure at `/var/www/vaultic`

## Key Differences from Dev Compose

| Aspect | Dev | Staging |
|--------|-----|---------|
| Postgres port | Exposed (5432) | Internal only (no ports) |
| Server port | 8080 external | 127.0.0.1:8080 (localhost only, Nginx fronts) |
| Secrets | Hardcoded defaults | Env vars from `.env` file |
| Restart | None | `unless-stopped` |
| Build context | `..` (monorepo root) | `.` (deploy dir is monorepo root) |

## Requirements

### Functional
- PostgreSQL accessible only within Docker network
- Server binds to 127.0.0.1:8080 (only Nginx can reach it)
- All secrets via `.env` file (not in compose file)
- Named volumes for persistent data
- Health checks on both services
- Restart policy: `unless-stopped`

### Non-Functional
- Container logs rotated (Docker daemon-level, Phase 1)
- Database data persists across `docker compose down`

## Implementation Steps

### 1. Create `docker/docker-compose.staging.yml`

```yaml
services:
  postgres:
    image: postgres:16-alpine
    # No ports exposed — internal Docker network only
    environment:
      POSTGRES_DB: ${POSTGRES_DB:-vaultic}
      POSTGRES_USER: ${POSTGRES_USER:-vaultic}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-vaultic}"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped

  server:
    build:
      context: ..
      dockerfile: docker/Dockerfile
    ports:
      - "127.0.0.1:8080:8080"
    environment:
      DATABASE_URL: postgres://${POSTGRES_USER:-vaultic}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB:-vaultic}
      JWT_SECRET: ${JWT_SECRET}
      RUST_LOG: ${RUST_LOG:-info}
      SERVER_ENV: staging
    depends_on:
      postgres:
        condition: service_healthy
    restart: unless-stopped

volumes:
  pgdata:
```

### 2. Create `.env.staging.example`

```env
# Vaultic Staging Environment
# Copy to .env and fill in real values

# PostgreSQL
POSTGRES_DB=vaultic
POSTGRES_USER=vaultic
POSTGRES_PASSWORD=<generate-strong-password>

# Server
JWT_SECRET=<generate-strong-secret>
RUST_LOG=info
```

### 3. Deploy directory structure on VPS

```
/var/www/vaultic/          # Git clone of the repo
├── .env                   # Real secrets (gitignored, created manually or by CI)
├── docker/
│   ├── docker-compose.staging.yml
│   ├── Dockerfile
│   └── ...
├── crates/                # Rust source (needed for Docker build)
└── ...
```

### 4. Initial deploy (manual, first time only)

```bash
# On VPS as deploy user
cd /var/www/vaultic
git clone git@gitlabs.inet.vn:dattqh/vaultic.git .

# Create .env with real secrets
cp .env.staging.example .env
vim .env  # Fill in real values

# Build and start
docker compose -f docker/docker-compose.staging.yml up -d --build

# Verify
docker compose -f docker/docker-compose.staging.yml ps
curl http://127.0.0.1:8080/health
```

### 5. Useful operations

```bash
# View logs
docker compose -f docker/docker-compose.staging.yml logs -f server

# Rebuild after code change
docker compose -f docker/docker-compose.staging.yml up -d --build server

# Full restart
docker compose -f docker/docker-compose.staging.yml down
docker compose -f docker/docker-compose.staging.yml up -d --build

# DB backup
docker compose -f docker/docker-compose.staging.yml exec postgres pg_dump -U vaultic vaultic > backup.sql
```

## Related Code Files

| File | Action |
|------|--------|
| `docker/docker-compose.staging.yml` | **Create** |
| `.env.staging.example` | **Create** |
| `.gitignore` | **Verify** `.env` is ignored |

## Todo List
- [ ] Create `docker/docker-compose.staging.yml`
- [ ] Create `.env.staging.example` (no real secrets)
- [ ] Verify `.env` is in `.gitignore`
- [ ] Clone repo to `/var/www/vaultic` on VPS
- [ ] Create `.env` on VPS with real secrets
- [ ] Run `docker compose up -d --build`
- [ ] Verify health endpoint via curl
- [ ] Verify Postgres is NOT accessible externally

## Success Criteria
- `docker compose -f docker/docker-compose.staging.yml ps` shows both services healthy
- `curl http://127.0.0.1:8080/health` returns "ok"
- `curl https://vaultic.inetdev.io.vn/health` returns "ok" (via Nginx)
- `nc -zv 103.72.98.65 5432` fails (Postgres not exposed)
- Container restarts automatically after `docker restart`

## Risk Assessment

| Risk | Mitigation |
|------|-----------|
| `.env` accidentally committed | Already in `.gitignore`; CI never creates `.env` in repo |
| Postgres data loss on `down -v` | Use `down` without `-v` flag; document backup procedure |
| Disk space from Docker build cache | Schedule `docker system prune -f` weekly via cron |
| Build fails on VPS (low RAM) | VPS should have 2GB+ RAM; can add swap if needed |

## Security Considerations
- Postgres never exposed to internet (no `ports` mapping)
- Server only on 127.0.0.1 (Nginx handles external traffic + TLS)
- All secrets in `.env` (gitignored), sourced from GitLab CI Variables for automated deploys
- No default passwords — `POSTGRES_PASSWORD` and `JWT_SECRET` are required (no fallback)
