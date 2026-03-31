# Chrome Web Store Listing Content — Vaultic

## Short Description (132 chars max)

```
Open-source, zero-knowledge password manager. Autofill, password generator, encrypted sharing. Your data stays yours.
```

(117 chars)

---

## Full Description (EN)

```
Vaultic is a free, open-source password manager that puts your privacy first. Built with zero-knowledge encryption, your passwords are encrypted on your device before they go anywhere — not even we can read them.

KEY FEATURES

• Secure Vault — Store passwords, credit cards, and secure notes with AES-256-GCM encryption
• Smart Autofill — Automatically detect and fill login forms on any website
• Password Generator — Create strong, unique passwords with customizable length and complexity
• Encrypted Sharing — Share credentials securely via encrypted links with expiry and view limits
• Cloud Sync (Optional) — Sync your encrypted vault across devices. Off by default — your data stays local unless you choose otherwise
• Security Health — Dashboard showing password strength, reuse, and breach exposure
• Offline-First — Full functionality without internet. Your vault is always accessible
• Folder Organization — Organize vault items into folders for easy management

SECURITY MODEL

Vaultic uses a zero-knowledge architecture:
1. Your master password never leaves your device
2. Argon2id key derivation (64 MB memory, 3 iterations) protects against brute-force attacks
3. Each vault item is individually encrypted with AES-256-GCM and a unique random nonce
4. The server stores only encrypted blobs — it has no decryption keys
5. All communication is over HTTPS (TLS 1.2+)

Your master password cannot be recovered or reset. This is by design — true zero-knowledge means only you hold the keys.

OPEN SOURCE

Vaultic is 100% open-source under the MIT License. Audit our code, verify our privacy claims, or contribute:
https://github.com/achoo254/vaultic

PERMISSIONS EXPLAINED

• Storage — Stores your encrypted vault locally using IndexedDB
• Active Tab — Detects login forms on the current page for autofill
• Scripting — Injects autofill scripts using a secure fill-by-ID pattern
• Alarms — Auto-lock timer and optional sync scheduling
• Idle — Locks vault when you're away from your computer
• All URLs — Detects login forms on any website you visit (open-source, auditable)

NO TRACKING. NO ADS. NO ANALYTICS. JUST A PASSWORD MANAGER.
```

---

## Full Description (VI)

```
Vaultic là trình quản lý mật khẩu mã nguồn mở, miễn phí, đặt quyền riêng tư của bạn lên hàng đầu. Được xây dựng với mã hóa zero-knowledge, mật khẩu của bạn được mã hóa ngay trên thiết bị trước khi đi bất cứ đâu — ngay cả chúng tôi cũng không thể đọc được.

TÍNH NĂNG CHÍNH

• Kho Mật Khẩu An Toàn — Lưu trữ mật khẩu, thẻ tín dụng và ghi chú bảo mật với mã hóa AES-256-GCM
• Tự Động Điền — Phát hiện và điền biểu mẫu đăng nhập trên mọi trang web
• Tạo Mật Khẩu — Tạo mật khẩu mạnh, duy nhất với độ dài và độ phức tạp tùy chỉnh
• Chia Sẻ Mã Hóa — Chia sẻ thông tin đăng nhập an toàn qua liên kết mã hóa với thời hạn và giới hạn lượt xem
• Đồng Bộ Đám Mây (Tùy Chọn) — Đồng bộ kho mã hóa giữa các thiết bị. Tắt mặc định — dữ liệu ở trên máy trừ khi bạn chọn khác
• Sức Khỏe Bảo Mật — Bảng điều khiển hiển thị độ mạnh mật khẩu, tái sử dụng và rò rỉ dữ liệu
• Ưu Tiên Offline — Đầy đủ chức năng không cần internet. Kho luôn truy cập được
• Quản Lý Thư Mục — Sắp xếp mục trong kho vào thư mục

MÔ HÌNH BẢO MẬT

Vaultic sử dụng kiến trúc zero-knowledge:
1. Mật khẩu chính không bao giờ rời khỏi thiết bị
2. Argon2id key derivation (64 MB bộ nhớ, 3 vòng lặp) chống tấn công brute-force
3. Mỗi mục được mã hóa riêng với AES-256-GCM và nonce ngẫu nhiên
4. Máy chủ chỉ lưu dữ liệu đã mã hóa — không có khóa giải mã
5. Mọi giao tiếp qua HTTPS (TLS 1.2+)

Mật khẩu chính không thể khôi phục hoặc đặt lại. Đây là thiết kế có chủ đích — zero-knowledge thật sự nghĩa là chỉ bạn giữ chìa khóa.

MÃ NGUỒN MỞ

Vaultic 100% mã nguồn mở theo giấy phép MIT. Kiểm tra code, xác minh tuyên bố bảo mật, hoặc đóng góp:
https://github.com/achoo254/vaultic

KHÔNG THEO DÕI. KHÔNG QUẢNG CÁO. KHÔNG PHÂN TÍCH. CHỈ LÀ TRÌNH QUẢN LÝ MẬT KHẨU.
```

---

## Permission Justifications

| Permission | Justification |
|-----------|---------------|
| `storage` | Stores encrypted vault data locally using IndexedDB for offline-first password management. No plaintext is ever stored. |
| `activeTab` | Detects login forms on the currently active page to offer credential autofill. Only accesses page DOM when the user interacts with the extension. |
| `scripting` | Injects credential autofill scripts into detected login forms using a secure fill-by-ID pattern. The content script never receives plaintext passwords — only element identifiers. |
| `alarms` | Schedules the auto-lock timer after a configurable inactivity period and manages optional cloud sync intervals for background synchronization. |
| `idle` | Detects user inactivity to automatically lock the vault, preventing unauthorized access on unattended devices. |
| `host_permissions (<all_urls>)` | As a password manager, Vaultic must detect and fill login forms on any website the user visits. Content scripts use a secure fill-by-ID pattern where they receive only DOM element identifiers, never plaintext credentials. The extension is fully open-source: https://github.com/achoo254/vaultic |

---

## Privacy Practices Tab

| Question | Answer |
|----------|--------|
| Single purpose description | Password management with autofill, password generation, and encrypted sharing |
| Authentication information | Yes — Functionality |
| Personally identifiable info | Yes (email for optional registration) — Functionality |
| Financial/payment info | Yes (encrypted payment cards in vault) — Functionality |
| Health info | No |
| Personal communications | No |
| Location | No |
| Web history | No |
| User activity | No |
| Encrypted in transit | Yes |
| Encrypted at rest | Yes |
| User can request deletion | Yes |
| No selling to 3rd parties | Yes |
| No unrelated data use | Yes |
| No creditworthiness use | Yes |

---

## Category & Language

- **Category:** Productivity
- **Primary language:** English
- **Additional language:** Vietnamese
- **Visibility:** Public
- **Privacy Policy URL:** https://vaultic.inetdev.io.vn/privacy-policy
