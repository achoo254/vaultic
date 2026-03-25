# Phase 2: Nginx + SSL Setup

## Context Links
- [Phase 1 — VPS Provisioning](phase-01-vps-provisioning.md)
- [Certbot Nginx plugin](https://certbot.eff.org/instructions?ws=nginx&os=centosrhel9)

## Overview
- **Priority**: P1
- **Status**: pending
- **Depends on**: Phase 1
- **Description**: Configure Nginx as reverse proxy to Docker server container, obtain Let's Encrypt SSL cert

## Requirements

### Functional
- HTTPS on `vaultic.inetdev.io.vn` with valid Let's Encrypt cert
- HTTP → HTTPS redirect
- Reverse proxy to `localhost:8080` (Docker server container)
- WebSocket support (for future sync)
- Proper security headers

### Non-Functional
- Auto-renewal of SSL cert via Certbot timer
- A+ SSL rating on ssllabs.com

## Architecture
```
Client → :443 (Nginx/TLS) → proxy_pass → :8080 (Docker vaultic-server)
Client → :80  (Nginx)      → 301 redirect → :443
```

## Implementation Steps

### 1. Pre-requisite: DNS verification
Ensure `vaultic.inetdev.io.vn` A record points to `103.72.98.65`.
```bash
dig vaultic.inetdev.io.vn +short
# Should return 103.72.98.65
```

### 2. Create Nginx server block
Create `/etc/nginx/conf.d/vaultic.conf`:
```nginx
server {
    listen 80;
    server_name vaultic.inetdev.io.vn;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name vaultic.inetdev.io.vn;

    # SSL certs (managed by Certbot — placeholders until cert obtained)
    ssl_certificate /etc/letsencrypt/live/vaultic.inetdev.io.vn/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/vaultic.inetdev.io.vn/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # Security headers
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Proxy to Vaultic server
    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket support
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

### 3. Obtain SSL certificate
First, temporarily comment out the `ssl` server block (Certbot needs port 80 working first):
```bash
# Start with only the port 80 block active
nginx -t && systemctl reload nginx

# Obtain cert
certbot --nginx -d vaultic.inetdev.io.vn --non-interactive --agree-tos -m ${ADMIN_EMAIL}
```
Certbot will automatically update the Nginx config with cert paths.

### 4. Enable SELinux network connect (if SELinux enforcing)
```bash
setsebool -P httpd_can_network_connect 1
```

### 5. Verify auto-renewal
```bash
certbot renew --dry-run
systemctl enable --now certbot-renew.timer
```

### 6. Test
```bash
curl -I https://vaultic.inetdev.io.vn/health
# Expect 200 OK (once Docker containers are running)
```

## Related File
Save Nginx config to repo for reference:
- `docker/nginx/vaultic.conf` — copy of the production Nginx config

## Todo List
- [ ] Verify DNS A record resolves to VPS IP
- [ ] Create Nginx config at `/etc/nginx/conf.d/vaultic.conf`
- [ ] Test Nginx config with `nginx -t`
- [ ] Obtain Let's Encrypt cert via Certbot
- [ ] Enable SELinux httpd_can_network_connect if needed
- [ ] Verify SSL auto-renewal with dry-run
- [ ] Test HTTPS endpoint
- [ ] Save Nginx config copy to `docker/nginx/vaultic.conf`

## Success Criteria
- `https://vaultic.inetdev.io.vn/health` returns 200 (after Phase 3)
- `http://vaultic.inetdev.io.vn` redirects to HTTPS
- `certbot renew --dry-run` succeeds
- No Nginx errors in `/var/log/nginx/error.log`

## Risk Assessment

| Risk | Mitigation |
|------|-----------|
| DNS not propagated yet | Verify with `dig` before running Certbot |
| Let's Encrypt rate limits | Use `--staging` flag for testing, switch to prod when ready |
| SELinux blocks proxy_pass | `setsebool -P httpd_can_network_connect 1` |
| Port 80 already in use | Check `ss -tlnp | grep :80` before starting |
