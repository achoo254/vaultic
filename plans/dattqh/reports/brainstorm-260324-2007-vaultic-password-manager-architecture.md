# Brainstorm Report: Vaultic Password Manager Architecture

**Date:** 2026-03-24
**Status:** Final
**Participants:** Solo developer (backend-focused, learning Rust)

---

## Problem Statement

Build an open-source password manager (extension-first → desktop → mobile → web) that is:
- Simpler & cheaper than 1Password/Bitwarden for individuals and small teams
- Zero-knowledge, end-to-end encrypted
- Cross-platform with shared codebase

---

## Decisions Made

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Desktop framework | Tauri v2 (Rust) | Small binary (~5MB), native security, memory safe |
| API server | Rust (Axum) | Share crypto crate with desktop, performance |
| Frontend | React + TypeScript | Largest ecosystem, share UI between extension & desktop |
| Extension framework | WXT | Modern, supports Chrome/Firefox/Safari, HMR, React support |
| Crypto model | SRP + AES-256-GCM | Zero-knowledge auth, client-side encryption |
| Database | PostgreSQL | Robust, JSON support, audit log, team features |
| Local storage | SQLite (via sqlx) | Offline cache on desktop/extension |
| Business model | Open-source core | Revenue from managed cloud + enterprise features |
| Monorepo tool | Turborepo (JS) + Cargo workspace (Rust) | Unified builds across both ecosystems |

---

## Architecture Overview

```
vaultic/
├── crates/                        # Rust workspace
│   ├── vaultic-crypto/            # Shared: SRP, AES-256-GCM, Argon2, HKDF
│   ├── vaultic-server/            # Axum API server
│   ├── vaultic-desktop/           # Tauri v2 backend (IPC commands)
│   └── vaultic-types/             # Shared Rust types/models
├── packages/                      # TypeScript workspace
│   ├── ui/                        # Shared React components (shadcn/ui + Tailwind)
│   ├── extension/                 # WXT browser extension (Chrome, Firefox)
│   ├── web/                       # Web app (React + Vite)
│   └── shared/                    # Shared TS types, API client, crypto bridge
├── Cargo.toml                     # Rust workspace root
├── package.json                   # Turborepo root
└── turbo.json
```

### Crypto Architecture (Zero-Knowledge)

```
User Input: master_password + email
                │
                ▼
┌─────────────────────────────────┐
│  Key Derivation (Client-side)   │
│                                 │
│  1. master_key = Argon2id(      │
│       password, email_as_salt,  │
│       m=64MB, t=3, p=4)        │
│                                 │
│  2. encryption_key = HKDF(      │
│       master_key, "enc")        │
│                                 │
│  3. auth_key = HKDF(            │
│       master_key, "auth")       │
│                                 │
│  4. SRP verifier = SRP6a(       │
│       email, auth_key)          │
└─────────────────────────────────┘
                │
     ┌──────────┴──────────┐
     ▼                     ▼
┌──────────┐        ┌──────────────┐
│  Server  │        │    Client    │
│          │        │              │
│ Stores:  │        │ Uses:        │
│ - SRP    │        │ - enc_key to │
│   verif. │        │   AES-GCM    │
│ - encryp │        │   encrypt/   │
│   ted    │        │   decrypt    │
│   vault  │        │   vault data │
│          │        │              │
│ NEVER    │        │ enc_key NEVER│
│ sees     │        │ leaves client│
│ password │        │              │
│ or keys  │        │              │
└──────────┘        └──────────────┘
```

### Data Flow: Save a Password

```
1. User enters credential in extension popup
2. Client encrypts: AES-256-GCM(enc_key, plaintext_credential) → ciphertext
3. Client sends ciphertext + metadata (folder, tags) to server
4. Server stores encrypted blob in PostgreSQL
5. Server pushes sync event to other connected clients
6. Other clients decrypt locally with their enc_key
```

### Extension Architecture (WXT + React) — PRIORITY #1

```
┌─────────────────────────────────────────────────────────┐
│  WXT Browser Extension                                  │
│                                                         │
│  ┌──────────────┐  ┌────────────────┐  ┌─────────────┐ │
│  │ Popup        │  │ Background     │  │ Options Page│ │
│  │ (React)      │  │ Service Worker │  │ (React)     │ │
│  │ • Login      │  │ • Crypto ops   │  │ • Settings  │ │
│  │ • Search     │  │ • API sync     │  │ • Import/   │ │
│  │ • Suggested  │  │ • Auto-lock    │  │   Export    │ │
│  │ • Generator  │  │ • Session mgmt │  │ • Account   │ │
│  │ • Recent     │  │ • Clipboard    │  │ • Security  │ │
│  │              │  │   clear timer  │  │   health    │ │
│  └──────────────┘  └────────────────┘  └─────────────┘ │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │ Content Script                                    │   │
│  │ • Detect login/signup forms (heuristic + attrs)  │   │
│  │ • Inject 🔑 icon in input fields                 │   │
│  │ • Show autofill dropdown overlay                 │   │
│  │ • Capture credentials on form submit             │   │
│  │ • Show "Save password?" notification bar         │   │
│  │ • Dispatch input events for SPA (React/Angular)  │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

#### Popup Layout (380x520px, compact like Kaspersky PM)
```
┌─────────────────────────────┐
│  Vaultic        🔒  ⚙️  ➕  │  Header: lock, settings, add
│─────────────────────────────│
│  🔍 Search vault...         │  Instant fuzzy search
│─────────────────────────────│
│  📂 Suggested (this site)   │  Context-aware: match current URL
│  ┌─────────────────────┐    │
│  │ 🌐 github.com       │    │
│  │    user@email.com    │    │
│  │    [Fill] [Copy] [👁]│    │  Quick actions per item
│  └─────────────────────┘    │
│─────────────────────────────│
│  📂 Recent (5)              │  Last used credentials
│  📂 All Items (47)    ▶     │
│  📂 Folders            ▶     │
│─────────────────────────────│
│  🔑 Generator  │  🛡️ Health │  Bottom bar
└─────────────────────────────┘
```

#### Core UX Flows

**Autofill:** Content script detects form → shows 🔑 icon in input → user clicks → dropdown with matching credentials → one-click fill (dispatches input events for SPA compat)

**Save new:** Form submit detected → capture username+password → notification bar "Save for site?" → encrypt client-side → sync to server

**Generator:** Accessible from popup bottom bar OR inline when signup form detected → configurable length/chars → "Use this password" auto-fills active form

#### Form Detection Strategy
```
Priority order:
1. input[type="password"]           → 99% login/signup
2. input[autocomplete="username"]   → Browser standard
3. input[name*="user"|"email"]      → Heuristic
4. 1 password field → Login | 2+ → Signup (offer generator)
5. MutationObserver for SPA re-renders (debounce 300ms)
```

#### Extension Security
| Concern | Solution |
|---------|----------|
| Key storage | `chrome.storage.session` (cleared on browser close) |
| Auto-lock | Background timer, 15min idle (configurable) |
| Clipboard | Auto-clear after 30s |
| Phishing | Warn on similar-but-different domains |
| Master password | Only entered in popup (trusted context) |
| Vault cache | `chrome.storage.local` encrypted, for offline |

#### Extension ↔ Server Sync
```
Extension                        Server (Axum)
   │── Login (auth_hash) ────────▶│
   │◀── JWT + encrypted vault ────│
   │── Save item (ciphertext) ──▶│
   │◀── Confirm + sync version ──│
   │── Sync (last_sync_ts) ─────▶│
   │◀── Changed items since ─────│
```

---

## Secure Share (Password Push) — Tích hợp trong Vaultic

Tính năng chia sẻ credential qua link tạm thời có TTL (giống pwpush.com).

### 2 Entry Points
1. **From Vault Item** → Share button trên vault item → tạo link từ credential đã lưu
2. **Standalone Quick Share** → Paste bất kỳ text → tạo link, KHÔNG lưu vault

### Zero-Knowledge Encryption (URL Fragment)
```
1. Client tạo random share_key (256-bit)
2. Client encrypt payload bằng share_key (AES-256-GCM)
3. share_key encode vào URL fragment: /s/aX7kM9pQ2#<share_key_base64>
4. Server chỉ lưu encrypted_data (KHÔNG thấy key, KHÔNG thấy plaintext)
5. Recipient browser lấy share_key từ fragment (#) — fragment không gửi lên server
6. Recipient decrypt tại browser
```

### Configurable Options
- **TTL:** 1h, 4h, 24h, 7 days, custom
- **Max views:** 1, 3, 5, 10
- **Passphrase protection** (Phase 2): extra layer, recipient nhập passphrase mới xem được

### DB Schema
```sql
CREATE TABLE secure_shares (
    id VARCHAR(12) PRIMARY KEY,
    vault_item_id UUID REFERENCES vault_items(id),  -- NULL nếu standalone
    encrypted_data TEXT NOT NULL,
    passphrase_hash TEXT,              -- Phase 2
    max_views INT NOT NULL DEFAULT 1,
    current_views INT NOT NULL DEFAULT 0,
    expires_at TIMESTAMPTZ NOT NULL,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    accessed_at TIMESTAMPTZ
);
```

### MVP vs Later
| Feature | MVP | Later |
|---------|-----|-------|
| Share from vault item | Yes | |
| Standalone quick share | Yes | |
| TTL + max views config | Yes | |
| URL fragment encryption | Yes | |
| Passphrase protection | | Phase 2 |
| View/revoke active shares | | Phase 2 |
| Audit log shares | | Phase 3 (Team) |

### Branding Opportunity
Recipient page hiện "Powered by Vaultic" → free marketing mỗi lần share.

---

## MVP Scope (Extension-First, 1-2 Months)

### CRITICAL: Simplify Crypto for MVP

**Recommendation:** Start with **Argon2id + AES-256-GCM** (giống Bitwarden), **delay SRP to Phase 2**.

Why:
- SRP requires complex handshake protocol, multiple round trips, state management
- Argon2 key derivation + hash-based auth đủ secure cho MVP
- Bitwarden dùng approach này và serve hàng triệu users
- Solo developer + learning Rust + 1-2 months = phải simplify

**MVP Auth Flow (Phase 1):**
```
master_password → Argon2id → master_key
master_key → HKDF("enc") → encryption_key (client keeps)
master_key → HKDF("auth") → auth_hash → server stores hash(auth_hash)
```

**Full SRP Flow (Phase 2):** Add SRP6a on top after MVP ships.

### Phase 1: MVP (Week 1-8)

**Week 1-2: Foundation**
- [ ] Rust workspace setup (cargo workspace)
- [ ] `vaultic-crypto` crate: Argon2id, AES-256-GCM, HKDF, password generator
- [ ] `vaultic-server` basic Axum skeleton + PostgreSQL (sqlx)
- [ ] DB schema: users, vaults, vault_items, folders
- [ ] Auth endpoints: register, login (Argon2-based)

**Week 3-4: Core API + Extension Shell**
- [ ] CRUD API: vault items (encrypted blobs)
- [ ] Sync endpoint: pull changes since last sync timestamp
- [ ] WXT extension setup with React + TypeScript
- [ ] Extension popup: login screen, vault list
- [ ] JS/TS crypto bridge (WebCrypto API mirroring Rust crypto logic)

**Week 5-6: Extension Features**
- [ ] Autofill: content script detects login forms
- [ ] Password generator in popup
- [ ] Search/filter vault items
- [ ] Folder/tag organization
- [ ] Copy username/password one-click
- [ ] Auto-lock after timeout
- [ ] Secure Share: share from vault item + standalone quick share
- [ ] Share recipient page (decrypt via URL fragment, zero-knowledge)

**Week 7-8: Polish + Ship**
- [ ] Extension published to Chrome Web Store
- [ ] Basic web landing page
- [ ] Error handling, loading states, edge cases
- [ ] Security audit (basic): no plaintext leaks, proper key handling
- [ ] CI/CD: GitHub Actions for Rust tests + extension build

### Phase 2: Desktop + SRP (Month 3-4)
- [ ] Tauri v2 desktop app (share React UI)
- [ ] SRP6a protocol implementation
- [ ] SQLite local cache for offline access
- [ ] System tray + global hotkey
- [ ] Biometric unlock (Windows Hello, macOS TouchID)

### Phase 3: Team Vault (Month 5-6)
- [ ] Team/organization management
- [ ] Shared vaults with role-based access (viewer/editor/admin)
- [ ] Audit log
- [ ] Invite system

### Phase 4: Mobile + Advanced (Month 7+)
- [ ] React Native or Capacitor mobile app
- [ ] Breach monitoring (Have I Been Pwned API)
- [ ] Security health score
- [ ] TOTP/2FA manager
- [ ] Emergency access

---

## Tech Stack Detail

### Rust Crates
| Purpose | Crate | Why |
|---------|-------|-----|
| HTTP framework | `axum` | Tokio-based, ergonomic, active community |
| Database | `sqlx` | Compile-time checked queries, async, no ORM overhead |
| Crypto: AES | `aes-gcm` | RustCrypto project, audited |
| Crypto: Argon2 | `argon2` | RustCrypto, Argon2id support |
| Crypto: HKDF | `hkdf` + `sha2` | Standard key derivation |
| Crypto: random | `rand` | Cryptographically secure RNG |
| Serialization | `serde` + `serde_json` | De facto standard |
| Auth tokens | `jsonwebtoken` | JWT for session management |
| Desktop | `tauri` v2 | Cross-platform, small binary |
| SRP (Phase 2) | `srp` | SRP6a implementation |

### TypeScript/JS
| Purpose | Package | Why |
|---------|---------|-----|
| Extension framework | `wxt` | Modern, HMR, multi-browser |
| UI framework | `react` + `react-dom` | Shared with desktop webview |
| UI components | `shadcn/ui` + `tailwindcss` | Accessible, customizable |
| State management | `zustand` | Minimal, no boilerplate |
| API client | `ky` or `ofetch` | Lightweight fetch wrapper |
| Crypto (extension) | `WebCrypto API` | Native browser crypto, no deps |
| Build | `vite` | Fast, used by WXT internally |
| Monorepo | `turborepo` | JS workspace orchestration |

### Database Schema (MVP)

```sql
-- Users
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    auth_hash TEXT NOT NULL,          -- hash(HKDF(master_key, "auth"))
    encrypted_symmetric_key TEXT,     -- encrypted with master_key for key rotation
    argon2_params JSONB NOT NULL,     -- {m, t, p, salt} for key derivation
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Vault Items (all data encrypted client-side)
CREATE TABLE vault_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    folder_id UUID REFERENCES folders(id),
    item_type SMALLINT NOT NULL,      -- 1=login, 2=note, 3=card, 4=identity
    encrypted_data TEXT NOT NULL,      -- AES-256-GCM ciphertext
    encrypted_name TEXT NOT NULL,      -- encrypted for search (server-side)
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    deleted_at TIMESTAMPTZ            -- soft delete for sync
);

-- Folders
CREATE TABLE folders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    encrypted_name TEXT NOT NULL,
    parent_id UUID REFERENCES folders(id),
    created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## Environment: Dev Windows + Production CentOS 7

### Constraints
- **Dev:** Windows 11 (native Rust + Node.js)
- **Prod:** CentOS 7 (EOL since 06/2024, glibc 2.17, OpenSSL 1.0.2)
- **Solution:** Docker on both environments

### Critical Changes to Stack
| Change | Reason |
|--------|--------|
| Use `rustls` everywhere (not `openssl-sys`) | CentOS 7 OpenSSL 1.0.2 is outdated + CVEs. `rustls` = pure Rust, no system dependency |
| Docker multi-stage build for server | Isolate from CentOS 7 glibc 2.17 limitation. Build in CI, run anywhere |
| Docker Compose for dev + prod | Same PostgreSQL 16 version, same environment |
| GitHub Actions builds Linux image | No need to compile Rust on CentOS directly |
| Plan migration to Rocky Linux 9 | CentOS 7 EOL = no security patches. Medium-term must migrate |

### Dockerfile (multi-stage)
```dockerfile
# Build stage
FROM rust:1.77-bookworm AS builder
WORKDIR /app
COPY crates/ crates/
COPY Cargo.toml Cargo.lock ./
RUN cargo build --release --bin vaultic-server

# Runtime stage
FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*
COPY --from=builder /app/target/release/vaultic-server /usr/local/bin/
EXPOSE 8080
CMD ["vaultic-server"]
```

### Docker Compose (production on CentOS 7)
```yaml
services:
  vaultic-server:
    image: vaultic/server:latest
    ports: ["8080:8080"]
    environment:
      DATABASE_URL: postgres://vaultic:${DB_PASS}@postgres:5432/vaultic
    restart: always
    depends_on: [postgres]

  postgres:
    image: postgres:16-alpine
    volumes: ["pgdata:/var/lib/postgresql/data"]
    environment:
      POSTGRES_DB: vaultic
      POSTGRES_USER: vaultic
      POSTGRES_PASSWORD: ${DB_PASS}
    restart: always

  nginx:
    image: nginx:alpine
    ports: ["443:443", "80:80"]
    volumes: ["./nginx.conf:/etc/nginx/nginx.conf", "./certs:/etc/nginx/certs"]
    restart: always
    depends_on: [vaultic-server]

volumes:
  pgdata:
```

### Dev Environment (Windows)
```bash
# PostgreSQL via Docker
docker run -d --name vaultic-pg -p 5432:5432 \
  -e POSTGRES_DB=vaultic -e POSTGRES_PASSWORD=dev \
  postgres:16-alpine

# Rust server (native, faster iteration)
cargo run --bin vaultic-server

# Extension dev (WXT hot reload)
cd packages/extension && pnpm dev
```

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Rust learning curve delays MVP | High | Use AI extensively, focus on simple Rust patterns. Start with crypto crate (isolated, testable) |
| Crypto implementation bugs | Critical | Use audited crates only (RustCrypto). Never write custom crypto. Extensive unit tests |
| Extension autofill complexity | Medium | Start with basic form detection, iterate. Study Bitwarden's content script approach |
| Solo developer burnout | High | Strict MVP scope. Ship extension first, desktop later. No feature creep |
| WebCrypto ≠ Rust crypto compat | Medium | Standardize on same algorithms (AES-256-GCM, Argon2id). Test cross-platform encrypt/decrypt |
| CentOS 7 EOL security risk | High | Docker isolates app from host OS. Plan migration to Rocky Linux 9 within 6 months |
| glibc incompatibility | Medium | Never deploy native binary to CentOS. Always use Docker container with modern base image |

---

## Key Recommendations

1. **Start with `vaultic-crypto` crate** — isolated, heavily unit-tested. This is the foundation. Get it right first.
2. **Delay SRP to Phase 2** — Argon2 + hash-based auth is battle-tested and sufficient for MVP.
3. **Extension popup first, autofill second** — Autofill is complex (form detection, iframe handling). Ship basic vault access first.
4. **Use WebCrypto API in extension**, NOT Rust WASM — simpler, no WASM bundle size. Same algorithms, test interop.
5. **Don't build web app for MVP** — Extension IS the web app for now. Web app comes with desktop in Phase 2.
6. **PostgreSQL from day 1** — Don't start with SQLite server and migrate later. SQLite only for local desktop cache.
7. **Open-source from day 1** — Build trust early. License: AGPLv3 (like Bitwarden) to protect against cloud competitors.

---

## Success Metrics (MVP)

- [ ] Extension installable on Chrome + Firefox
- [ ] Register/login with master password
- [ ] CRUD vault items (login credentials)
- [ ] Client-side encryption verified (server stores only ciphertext)
- [ ] Autofill works on top 20 popular sites
- [ ] Password generator with customizable rules
- [ ] Sync between multiple browser instances
- [ ] <200ms vault unlock time
- [ ] Zero plaintext data in network requests or server DB

---

## Competitive Positioning

| Feature | Bitwarden | 1Password | Vaultic |
|---------|-----------|-----------|---------|
| Open-source | Yes (AGPL) | No | Yes (AGPL) |
| Self-host | Yes | No | Yes (planned) |
| Free tier | Generous | No | Unlimited personal |
| Extension UX | Functional | Polished | Modern, minimal |
| Desktop tech | Electron (heavy) | Electron | Tauri (lightweight) |
| Crypto | PBKDF2/Argon2 | SRP + AES | SRP + AES (Phase 2) |
| Target | Everyone | Teams/Enterprise | Devs & small teams |

**Differentiator:** Tauri-based (lightest desktop app), developer-friendly, modern UX, open-source with generous free tier.

---

## Next Steps

1. **Create implementation plan** with detailed phases and file-level tasks
2. **Setup monorepo** (Cargo workspace + Turborepo)
3. **Start `vaultic-crypto` crate** — learn Rust through crypto implementation
4. **Build Axum server skeleton** with auth endpoints
5. **WXT extension shell** with React + login screen
