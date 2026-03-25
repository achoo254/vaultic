---
type: brainstorm
date: 2026-03-25
topic: Staging deployment architecture — detailed discussion
status: agreed
---

# Brainstorm: Staging Deploy Discussion

## VPS Specs
- CentOS 9, 4GB+ RAM, IP 103.72.98.65, SSH port 24700
- Existing Nginx, multiple services running, no Docker yet
- Deploy path: /var/www/vaultic

## Network
- Domain: vaultic.inetdev.io.vn → Cloudflare proxied → VPS
- SSL: Cloudflare Flexible (CF terminates HTTPS, VPS receives HTTP)
- No Certbot needed

## Agreed Architecture
```
Cloudflare (HTTPS) → HTTP → Nginx vhost (existing) → 127.0.0.1:8080
                                                        ↓
                                              Docker: vaultic-server
                                                        ↓
                                              Docker: postgres:16 (internal)
```

## CI/CD Flow
- Shared runner on gitlabs.inet.vn
- Auto deploy on push to main
- Deploy via SSH (CI Variables for credentials)
- Extension .zip uploaded to VPS

## Decisions
| Item | Decision |
|------|----------|
| SSL | Cloudflare Flexible |
| Web server | Existing Nginx — add vhost |
| Docker | Install via CI first-run |
| Git access | Deploy Key (SSH read-only) |
| Deploy trigger | Push to main |
| Secrets | GitLab CI/CD Variables |
| Extension | Upload .zip to VPS |

## CI/CD Variables Required
DEPLOY_HOST, DEPLOY_PORT, DEPLOY_USER, DEPLOY_SSH_KEY (file), DEPLOY_PATH, POSTGRES_PASSWORD, JWT_SECRET

## Implementation Scope
1. docker/docker-compose.staging.yml
2. docker/nginx/vaultic.conf
3. .env.staging.example
4. .gitlab-ci.yml (setup-vps + deploy-staging + upload-extension stages)
