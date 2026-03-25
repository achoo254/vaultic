# Phase 1: VPS Provisioning

## Context Links
- [Docker Install Docs (CentOS)](https://docs.docker.com/engine/install/centos/)
- [Current Dockerfile](../../../docker/Dockerfile)

## Overview
- **Priority**: P1 (blocking all other phases)
- **Status**: pending
- **Description**: Install Docker, Docker Compose, Nginx, and Certbot on fresh CentOS 9 VPS

## Requirements

### Functional
- Docker Engine + Docker Compose plugin installed and running
- Nginx installed and running as reverse proxy host
- Certbot installed for SSL certificate management
- Firewall allows ports 22 (SSH on 24700), 80, 443 only
- Deploy directory `/var/www/vaultic` created with proper permissions

### Non-Functional
- All services start on boot (systemd enabled)
- Docker daemon configured with log rotation

## Implementation Steps

### 1. Connect to VPS
```bash
ssh -p 24700 root@103.72.98.65
```

### 2. System update
```bash
dnf update -y
dnf install -y git curl wget vim
```

### 3. Install Docker
```bash
dnf config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
dnf install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
systemctl enable --now docker
```

### 4. Configure Docker log rotation
Create `/etc/docker/daemon.json`:
```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
```
Then `systemctl restart docker`.

### 5. Install Nginx
```bash
dnf install -y nginx
systemctl enable --now nginx
```

### 6. Install Certbot
```bash
dnf install -y epel-release
dnf install -y certbot python3-certbot-nginx
```

### 7. Configure firewall
```bash
firewall-cmd --permanent --add-service=http
firewall-cmd --permanent --add-service=https
firewall-cmd --permanent --add-port=24700/tcp
firewall-cmd --reload
```

### 8. Create deploy directory
```bash
mkdir -p /var/www/vaultic
```

### 9. Create deploy user (optional but recommended)
```bash
useradd -m -s /bin/bash deploy
usermod -aG docker deploy
mkdir -p /home/deploy/.ssh
# Add CI/CD public key to /home/deploy/.ssh/authorized_keys
chmod 700 /home/deploy/.ssh
chmod 600 /home/deploy/.ssh/authorized_keys
chown -R deploy:deploy /home/deploy/.ssh
chown -R deploy:deploy /var/www/vaultic
```

### 10. Verify installations
```bash
docker --version
docker compose version
nginx -v
certbot --version
```

## Todo List
- [ ] SSH into VPS
- [ ] Update system packages
- [ ] Install Docker + Compose plugin
- [ ] Configure Docker log rotation
- [ ] Install Nginx
- [ ] Install Certbot
- [ ] Configure firewall (80, 443, 24700)
- [ ] Create /var/www/vaultic directory
- [ ] Create deploy user with Docker group access
- [ ] Add CI/CD SSH public key to deploy user
- [ ] Verify all installations

## Success Criteria
- `docker compose version` returns v2.x+
- `nginx -t` passes config check
- `certbot --version` returns valid version
- Firewall only allows 80, 443, 24700
- Deploy user can run `docker ps` without sudo

## Risk Assessment

| Risk | Mitigation |
|------|-----------|
| CentOS 9 repo issues with Docker CE | Use official Docker repo, not distro packages |
| SELinux blocking Docker/Nginx | Check `sestatus`, use `setsebool` for httpd_can_network_connect if needed |
| SSH lockout after firewall changes | Ensure port 24700 is added BEFORE reloading firewall |
