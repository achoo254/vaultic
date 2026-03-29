# Vaultic README Technical Claims Verification Report

## Verification Results

### 1. CRYPTO: Encryption Algorithm (AES-256-GCM)
**CLAIM:** "Mã hóa AES-256 trên thiết bị" (AES-256 encryption on device)
**STATUS:** ✓ VERIFIED
**EVIDENCE:** 
- File: `/d/CONG VIEC/vaultic/client/packages/crypto/src/cipher.ts`
- Confirms: `AES-GCM` with 256-bit key
- Comment: "AES-256-GCM encryption/decryption using WebCrypto API"

---

### 2. CRYPTO: Argon2id Parameters
**CLAIM (README.en):** "19MB RAM, 2 iterations"
**CLAIM (README.md):** "19MB RAM, 2 lần lặp"
**STATUS:** ✗ INCORRECT - ACTUAL VALUES DIFFER
**EVIDENCE:**
- File: `/d/CONG VIEC/vaultic/client/packages/crypto/src/kdf.ts` lines 8-10
- Actual code:
  ```
  const ARGON2_M_COST = 65536;  // 64MB in KiB (NOT 19MB)
  const ARGON2_T_COST = 3;      // 3 iterations (NOT 2)
  const ARGON2_P_COST = 4;      // parallelism = 4
  ```
- DISCREPANCY: README claims 19MB + 2 iterations, actual code is 64MB + 3 iterations
- Impact: Code is MORE secure than documented

---

### 3. CRYPTO: HKDF Usage
**CLAIM:** "HKDF - Tách khóa cho từng mục đích" (HKDF - derive keys for each purpose)
**STATUS:** ✓ VERIFIED
**EVIDENCE:**
- File: `/d/CONG VIEC/vaultic/client/packages/crypto/src/kdf.ts` lines 33-57
- Confirmed usage:
  - `deriveEncryptionKey()` uses HKDF-SHA256 with info="vaultic-enc"
  - `deriveAuthHash()` uses HKDF-SHA256 with info="vaultic-auth"

---

### 4. CRYPTO: Nonce Size
**CLAIM:** "nonce ngẫu nhiên 12 bytes" (random 12-byte nonce)
**STATUS:** ✓ VERIFIED
**EVIDENCE:**
- File: `/d/CONG VIEC/vaultic/client/packages/crypto/src/cipher.ts` line 5
- Explicit constant: `const NONCE_SIZE = 12;`

---

### 5. EXTENSION: Build Output Paths
**CLAIM (README.en line 53):** "`client/apps/extension/.output/chrome-mv3`"
**CLAIM (README.en line 58):** "`client/apps/extension/.output/firefox-mv2`"
**STATUS:** ⚠ PARTIALLY VERIFIED - Chrome path exists, Firefox NOT found
**EVIDENCE:**
- Directory exists: `/d/CONG VIEC/vaultic/client/apps/extension/.output/chrome-mv3/`
- Directory NOT found: `/d/CONG VIEC/vaultic/client/apps/extension/.output/firefox-mv2/` (missing)
- WXT config: `/d/CONG VIEC/vaultic/client/apps/extension/wxt.config.ts`
  - No explicit browser targets configured
  - Only generates Chrome MV3 output currently
  - Firefox target mentioned in README but not actually built

---

### 6. EXTENSION: Dev Path (README.en line 154)
**CLAIM:** "`client/apps/extension/.wxt/chrome-mv3`"
**STATUS:** ✗ NOT FOUND
**EVIDENCE:**
- The `.wxt/` directory exists at `/d/CONG VIEC/vaultic/client/apps/extension/.wxt/`
- But NO `chrome-mv3` subdirectory inside it
- Actual structure: only `tsconfig.json`, `wxt.d.ts`, and `types/` folder
- Dev path should be `.output/chrome-mv3` not `.wxt/chrome-mv3`

---

### 7. DOCKER: docker-compose.yml Existence
**CLAIM (README.en line 226):** "`docker compose -f docker/docker-compose.yml up -d`"
**STATUS:** ✗ FILE NOT FOUND
**EVIDENCE:**
- Directory `/d/CONG VIEC/vaultic/docker/` does NOT exist
- Only `.dockerignore` found at project root
- Feature mentioned in README but file missing from repo

---

### 8. BACKEND: Default Port
**CLAIM (README.en line 150):** "Run API server (port 8080)"
**STATUS:** ✓ VERIFIED
**EVIDENCE:**
- File: `/d/CONG VIEC/vaultic/backend/src/config/env-config.ts` line 8
- Code: `serverPort: parseInt(process.env["SERVER_PORT"] ?? "8080", 10),`
- Default is 8080 ✓

---

### 9. AUTO-LOCK DEFAULT: 15 minutes
**CLAIM (README.en):** "Auto-lock | 15 min"
**STATUS:** ✓ VERIFIED
**EVIDENCE:**
- File: `/d/CONG VIEC/vaultic/client/apps/extension/src/components/settings/settings-page.tsx` line 30
- Code: `const [autoLockMin, setAutoLockMin] = useState(15);`

---

### 10. CLIPBOARD CLEAR DEFAULT: 30 seconds
**CLAIM (README.en):** "Clear clipboard | 30 sec"
**STATUS:** ✓ VERIFIED
**EVIDENCE:**
- File: `/d/CONG VIEC/vaultic/client/apps/extension/src/components/settings/settings-page.tsx` line 31
- Code: `const [clipboardClearSec, setClipboardClearSec] = useState(30);`

---

### 11. PASSWORD GENERATOR: Default Length
**CLAIM (README.en):** "Password generator | 16 chars"
**STATUS:** ✗ INCORRECT - ACTUAL IS 20 CHARS
**EVIDENCE:**
- File: `/d/CONG VIEC/vaultic/client/apps/extension/src/components/vault/password-generator-view.tsx` line 10
- Code: `const [length, setLength] = useState(20);`
- Also line 16: initial password generated with `length: 20`
- DISCREPANCY: README claims 16, actual default is 20

---

### 12. CSV IMPORT / JSON EXPORT: Feature Exists
**CLAIM (README.en):** "Import from CSV files... Export vault as encrypted JSON"
**STATUS:** ✓ VERIFIED
**EVIDENCE:**
- Import file: `/d/CONG VIEC/vaultic/client/apps/extension/src/components/settings/import-passwords.tsx`
  - Supports: Chrome CSV, Bitwarden CSV/JSON, 1Password CSV/1PUX, generic CSV
  - parseCSV function parses standard CSV format
- Export file: `/d/CONG VIEC/vaultic/client/apps/extension/src/components/settings/export-vault.tsx`
  - Supports: Encrypted JSON format + CSV format
  - Line 34: JSON export with version + timestamp metadata

---

### 13. SECURITY HEALTH CHECK: Feature Exists
**CLAIM (README.en):** "Detect weak or duplicate passwords and suggest improvements"
**STATUS:** ✓ VERIFIED
**EVIDENCE:**
- File: `/d/CONG VIEC/vaultic/client/apps/extension/src/components/settings/security-health.tsx`
- Detects:
  - Weak passwords (< 10 chars) - lines 16-17
  - Reused/duplicate passwords - line 17 (count duplicates)
  - Overall security score calculation - line 19
  - Summary breakdown by strength level - lines 84-87

---

### 14. WXT CONFIG: Browser Targets
**CLAIM (README.en):** Extension supports Chrome and Firefox (implicit from build paths)
**STATUS:** ⚠ INCOMPLETE IMPLEMENTATION
**EVIDENCE:**
- File: `/d/CONG VIEC/vaultic/client/apps/extension/wxt.config.ts`
- Current state: NO explicit browser configuration
- WXT config lacks `buildTargets` or equivalent to specify Chrome + Firefox
- Only Chrome MV3 actually being built currently
- Firefox support mentioned in docs but not implemented in config

---

## Summary

| Item | Status | Notes |
|------|--------|-------|
| AES-256-GCM Encryption | ✓ Verified | Correct algorithm |
| Argon2id Memory (19MB claim) | ✗ Wrong | Actually 64MB, MORE secure |
| Argon2id Iterations (2 claim) | ✗ Wrong | Actually 3 iterations, MORE secure |
| HKDF Usage | ✓ Verified | Correct implementation |
| Nonce Size (12 bytes) | ✓ Verified | Correct |
| Chrome build path | ✓ Verified | Exists: `.output/chrome-mv3` |
| Firefox build path | ✗ Missing | Directory doesn't exist |
| Docker compose file | ✗ Missing | File doesn't exist |
| Backend port (8080) | ✓ Verified | Default correct |
| Auto-lock (15 min) | ✓ Verified | Correct default |
| Clipboard clear (30 sec) | ✓ Verified | Correct default |
| Password generator length | ✗ Wrong | Claims 16, actually 20 |
| CSV Import/JSON Export | ✓ Verified | Both implemented |
| Security Health Check | ✓ Verified | Weak + duplicate detection works |
| WXT Browser Targets | ✗ Incomplete | Config doesn't specify targets |

## Critical Issues to Fix

1. **Argon2id documentation** - Update README to reflect actual 64MB + 3 iterations (more secure)
2. **Password generator default** - Update README from 16 to 20 characters
3. **Missing Firefox output** - Either implement Firefox build or remove from README
4. **Missing docker/ directory** - Either add docker-compose.yml or remove from docs
5. **Dev path error** - Line 154 README.en mentions `.wxt/chrome-mv3` but should be `.output/chrome-mv3`
6. **WXT config** - Add explicit browser target configuration if multi-browser support is intended

