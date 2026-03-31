# Privacy Policy — Vaultic Password Manager

**Effective Date:** April 2025
**Last Updated:** April 2025

---

## 1. Introduction

Vaultic is an open-source, zero-knowledge password manager. Your vault data is encrypted on your device before it ever leaves your browser. We cannot read, access, or decrypt your passwords.

Source code: [https://github.com/achoo254/vaultic](https://github.com/achoo254/vaultic)

---

## 2. Data We Collect

### Data You Provide (Optional)

| Data | When | Purpose |
|------|------|---------|
| Email address | When you create an account (optional) | Authentication for Cloud Sync and Secure Share |
| Encrypted vault data | When you enable Cloud Sync (opt-in) | Sync encrypted data across devices |

### Data We Never Collect

- Your master password (never stored or transmitted)
- Plaintext vault data (passwords, notes, card numbers)
- Browsing history or website visits
- Analytics, telemetry, or usage data
- Third-party cookies or tracking pixels
- Device fingerprints or advertising identifiers

---

## 3. How Your Data Is Protected

### Zero-Knowledge Architecture

1. Your master password is processed **only on your device** using Argon2id key derivation (64 MB memory, 3 iterations)
2. HKDF-SHA256 derives per-purpose encryption and authentication keys
3. Each vault item is individually encrypted with **AES-256-GCM** (random 12-byte nonce per operation)
4. Only encrypted ciphertext is transmitted to our server (when Cloud Sync is enabled)
5. The server has **no decryption keys** — it stores and relays encrypted blobs only

### Local Storage

Vault data is stored locally in IndexedDB within your browser, encrypted at rest. No plaintext passwords are stored on disk.

### Transport Security

All network communication uses **HTTPS (TLS 1.2+)** exclusively.

---

## 4. How Your Data Is Used

| Purpose | Data Used |
|---------|-----------|
| Authentication | Email + hashed password (bcrypt) |
| Cloud Sync (opt-in) | Encrypted vault blobs |
| Secure Share | Encrypted share data with configurable expiry and view limits |

We do **not** use your data for advertising, profiling, analytics, or any purpose other than providing the password management service.

---

## 5. Data Sharing

**We do not share your data with any third parties.** Period.

- No advertising partners
- No analytics providers
- No data brokers
- No government agencies (unless compelled by valid legal process — and even then, we can only provide encrypted blobs we cannot decrypt)

---

## 6. Cloud Sync (Opt-In)

Cloud Sync is **disabled by default**. Your vault data stays entirely on your device unless you explicitly enable sync in Settings.

When enabled:
- Encrypted vault items are pushed to our server for cross-device sync
- The server stores only ciphertext — it cannot decrypt your data
- Delta sync minimizes data transfer (only changed items)

When disabled:
- You can choose to **delete all server data** (default) or keep a frozen encrypted copy
- No vault data remains on our server if you choose to purge

---

## 7. Secure Share

Secure Share allows you to create encrypted links to share credentials. This feature works independently of Cloud Sync.

- Share data is encrypted client-side before upload
- The decryption key is in the URL fragment (`#key`) — never sent to the server
- Shares auto-expire via MongoDB TTL index after the configured time period
- View limits are enforced server-side

---

## 8. User Rights

You have the right to:

- **Export your data**: Export your vault as decrypted JSON or CSV (requires unlocked vault)
- **Delete server data**: Purge all encrypted data from our server via Settings > Cloud Sync > Disable
- **Delete your account**: Remove your account and all associated server data permanently
- **Access your data**: Your vault is always accessible locally, even offline

### Master Password Non-Recovery Disclaimer

**Your master password cannot be recovered or reset.** Due to our zero-knowledge architecture, we have no way to decrypt your vault without your master password. If you lose your master password, your vault data is permanently inaccessible. We strongly recommend keeping a secure backup of your master password.

---

## 9. Data Retention

| Data | Retention |
|------|-----------|
| Local vault (IndexedDB) | Until you delete it or uninstall the extension |
| Server vault data (sync) | Until you disable sync (with purge) or delete your account |
| Shared links | Auto-deleted after expiry via MongoDB TTL index |
| Account data | Until you request account deletion |

---

## 10. Server Infrastructure

- Backend: Node.js/Express on dedicated server
- Database: MongoDB (stores encrypted blobs only)
- Server-side encryption at rest depends on infrastructure provider configuration
- All API communication over HTTPS

---

## 11. Children's Privacy

Vaultic is not directed at children under the age of 13. We do not knowingly collect personal information from children under 13.

---

## 12. Changes to This Policy

We may update this Privacy Policy from time to time. Changes will be reflected by updating the "Last Updated" date at the top. For significant changes, we will notify users through the extension or our website.

---

## 13. Open Source

Vaultic is open-source software licensed under the MIT License. You can audit our code, verify our privacy claims, and contribute at:

[https://github.com/achoo254/vaultic](https://github.com/achoo254/vaultic)

---

## 14. Contact

For privacy-related questions or requests:

- GitHub Issues: [https://github.com/achoo254/vaultic/issues](https://github.com/achoo254/vaultic/issues)
- Email: vaultic@inetdev.io.vn
