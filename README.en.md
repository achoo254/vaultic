# 🔐 Vaultic

> **[🇻🇳 Tiếng Việt](README.md)**

**Open-source, end-to-end encrypted, offline-first password manager.**

Vaultic is a simple and free alternative to 1Password/Bitwarden — all data is encrypted on your device. The server never sees your plaintext passwords.

---

## Why Vaultic?

| 🔒 Zero-Knowledge | 📴 Offline-First | 🔓 Open Source |
|:---:|:---:|:---:|
| AES-256-GCM encryption on device. Server only stores ciphertext — cannot decrypt. | Works 100% offline after login. Cloud sync is **optional**. | Self-host, self-audit, self-control. |

---

## 📊 Comparison with Other Password Managers

| Feature | Vaultic | Bitwarden | LastPass | Proton Pass |
|---------|:-------:|:---------:|:--------:|:-----------:|
| Passwords | Unlimited | Unlimited | Unlimited | Unlimited |
| Devices | Unlimited | Unlimited | **1 type** · *mobile OR desktop* | Unlimited |
| Offline | **Default** | Yes | Yes | **Paid only** |
| Cloud sync | Optional (opt-in) | Required | Required | Required |
| Encrypted sharing | One-time link | **Paid** · *Send* | **Paid** | **Paid** |
| Password health audit | Yes | **Paid** · *Vault Health* | Basic | Basic |
| Self-host | Yes | Yes | No | No |
| Open source | Yes | Yes (GPLv2) | No | Yes (GPLv3) |
| CSV import | Yes · *Chrome, Bitwarden, 1Password* | Yes | Yes | Yes |
| Vault export | Yes · *Encrypted JSON + CSV* | Yes | Yes | Yes |
| Password generator | Yes · *8–64 chars, customizable* | Yes | Yes | Yes |
| Autofill | Yes | Yes | Yes | Yes |
| Auto-lock | Yes · *15 min default* | Yes | Yes | Yes |
| Price | **Free** | Free / $10/yr | Free / $36/yr | Free / $36/yr |

> **Note:** 1Password and Dashlane do not offer free plans (trial only). Comparison based on each product's free tier.
>
> Sources: [Bitwarden Pricing](https://bitwarden.com/pricing/) · [Proton Pass Pricing](https://proton.me/pass/pricing) · [LastPass Pricing](https://www.lastpass.com/pricing) · [1Password Sign-up](https://1password.com/sign-up/)

---

## ✨ Key Features

### 🗄️ Password Vault
Store and manage logins, secure notes — encrypted and quickly searchable.

### ⚡ Autofill
Extension detects login forms and suggests matching passwords by domain.

### 🔗 Secure Share
Create encrypted share links — customize view count and expiry. The decryption key stays in the URL fragment, the server never receives it.

### 🔄 Optional Sync
Toggle cloud sync in Settings. When off, data stays on device only. When on, delta sync — only changes are sent.

### 🛡️ Security Health Check
Detect weak or duplicate passwords and suggest improvements.

### 📦 Export / Import
Import from CSV files (compatible with other managers). Export vault as encrypted JSON.

---

## 📥 Install Extension

### Chrome / Edge / Brave
> *Coming soon to Chrome Web Store*

Manual install (Developer Mode):
1. Build extension:
   ```bash
   git clone https://github.com/achoo254/vaultic.git && cd vaultic
   pnpm install && pnpm build
   ```
2. Open `chrome://extensions` → enable **Developer mode**
3. Click **Load unpacked** → point to `client/apps/extension/.output/chrome-mv3`

---

## 🚀 Getting Started

### Step 1: Set Your Master Password

Click the Vaultic icon on the toolbar → set your **master password**. The vault works immediately on your device — no account or internet required.

> ⚠️ **Important:** The master password is the only key to decrypt your vault. If forgotten, no one can recover your data — not even the server.

### Step 2: Add Your First Password

**Option 1 — Add manually:**
Click ➕ in vault → enter name, URL, username, password → Save.

**Option 2 — Auto-save:**
Log into any website → Extension shows "Save password?" banner → Click **Save**.

### Step 3: Autofill

Visit a saved website → click the 🔑 icon next to the password field → select account → autofill.

### Step 4: Share (optional)

Go to **Share** tab → select a password → customize view count and expiry → create link → send to recipient.

---

## 🔒 How Security Works

```
Master Password
      │
      ▼
  ┌─────────┐
  │ Argon2id │  ← Anti brute-force hash (64MB RAM, 3 iterations)
  └────┬─────┘
       │
       ▼
  Master Key (32 bytes)
       │
   ┌───┴───┐
   │ HKDF  │  ← Derive per-purpose keys (encryption, authentication)
   └───┬───┘
       │
       ▼
  ┌───────────┐
  │ AES-256   │  ← Encrypt each item individually
  │   -GCM    │     (random 12-byte nonce)
  └───────────┘
       │
       ▼
  Encrypted data → IndexedDB (local) / Server (if sync enabled)
```

**The server never receives the master key or plaintext data.**

---

## ⚙️ Advanced Settings

| Option | Default | Description |
|--------|---------|-------------|
| Auto-lock | 15 min | Auto-lock vault after inactivity |
| Clear clipboard | 30 sec | Auto-clear copied passwords from clipboard |
| Cloud sync | Off | Enable to sync vault across devices |
| Password generator | 20 chars | Customize length and complexity |

---

## 🛠 For Developers

### Requirements
- Node.js 22+, pnpm 9+
- MongoDB

### Quick Start

```bash
# Clone & install
git clone https://github.com/achoo254/vaultic.git && cd vaultic
pnpm install

# Set environment variables
cp backend/.env.example backend/.env
# Edit backend/.env: MONGODB_URI, JWT_SECRET

# Run API server (port 8080)
cd backend && pnpm dev

# Run extension (hot reload) — separate terminal
cd .. && pnpm --filter @vaultic/extension dev
# → Load unpacked from client/apps/extension/.output/chrome-mv3
```

### Project Structure

```
vaultic/
├── backend/                   # Node.js/Express server
│   ├── src/
│   │   ├── server.ts          # Express app + MongoDB connection
│   │   ├── config/            # Environment variables
│   │   ├── routes/            # API routes (auth, sync, share)
│   │   ├── models/            # Mongoose schemas
│   │   ├── services/          # Business logic
│   │   └── middleware/        # Auth, error handling, rate limiting
│   └── package.json
├── client/
│   ├── apps/
│   │   └── extension/         # WXT browser extension (Chrome MV3)
│   └── packages/
│       ├── crypto/            # WebCrypto bridge (AES-256-GCM, Argon2id)
│       ├── storage/           # IndexedDB vault store
│       ├── sync/              # Delta sync engine
│       ├── api/               # Server API client (ofetch)
│       └── ui/                # Shared React components (shadcn/ui)
└── shared/
    └── types/                 # Shared TypeScript types
```

### Common Commands

```bash
# Backend
cd backend
pnpm dev                            # Run dev server (port 8080)
pnpm build                          # Compile TypeScript → dist/
pnpm start                          # Run production server

# Client
pnpm --filter @vaultic/extension dev # Dev extension (hot reload)
pnpm build                          # Build all packages
pnpm lint                           # Lint all
pnpm test                           # Test all
```

---

## 🤝 Contributing

Contributions are welcome! See [docs/](docs/) for architecture and code standards.

1. Fork the repo
2. Create a branch: `git checkout -b feat/new-feature`
3. Commit: `git commit -m "feat: add new feature"`
4. Push & create a Pull Request
