# 🔐 Vaultic

**Trình quản lý mật khẩu mã nguồn mở, mã hóa đầu-cuối, ưu tiên offline.**

Vaultic là giải pháp thay thế đơn giản và miễn phí cho 1Password/Bitwarden — toàn bộ dữ liệu được mã hóa ngay trên thiết bị, server không bao giờ nhìn thấy mật khẩu của bạn.

---

## Tại sao chọn Vaultic?

| 🔒 Zero-Knowledge | 📴 Offline-First | 🔓 Mã nguồn mở |
|:---:|:---:|:---:|
| Mã hóa AES-256 trên thiết bị. Server chỉ lưu dữ liệu đã mã hóa — không thể giải mã. | Hoạt động 100% offline sau đăng nhập. Đồng bộ cloud là **tùy chọn**. | AGPL-3.0. Tự host, tự kiểm tra, tự kiểm soát. |

---

## ✨ Tính năng chính

### 🗄️ Kho mật khẩu
Lưu trữ và quản lý tất cả thông tin đăng nhập, ghi chú bảo mật, thẻ ngân hàng — được mã hóa và tìm kiếm nhanh.

<!-- TODO: Thêm screenshot vault list -->
<!-- ![Vault List](docs/images/vault-list.png) -->

### ⚡ Tự động điền
Extension phát hiện form đăng nhập và tự động gợi ý điền mật khẩu phù hợp theo tên miền.

<!-- TODO: Thêm screenshot autofill -->
<!-- ![Autofill](docs/images/autofill.png) -->

### 🔗 Chia sẻ an toàn
Tạo link chia sẻ mã hóa 1 lần — khóa giải mã nằm trong URL fragment, server không bao giờ nhận được.

<!-- TODO: Thêm screenshot share -->
<!-- ![Share](docs/images/share.png) -->

### 🔄 Đồng bộ tùy chọn
Bật/tắt đồng bộ cloud trong Cài đặt. Khi tắt, dữ liệu chỉ ở trên thiết bị. Khi bật, đồng bộ delta (chỉ gửi thay đổi).

### 🛡️ Kiểm tra sức khỏe bảo mật
Phát hiện mật khẩu yếu, trùng lặp và đề xuất cải thiện.

<!-- TODO: Thêm screenshot security health -->
<!-- ![Security Health](docs/images/security-health.png) -->

### 📦 Xuất / Nhập
Nhập từ file CSV (tương thích các trình quản lý khác). Xuất vault dưới dạng JSON mã hóa.

---

## 📥 Cài đặt Extension

### Chrome / Edge / Brave
> *Sắp có trên Chrome Web Store*

Cài thủ công (Developer Mode):
1. Build extension:
   ```bash
   git clone https://gitlabs.inet.vn/dattqh/vaultic.git && cd vaultic
   pnpm install && pnpm build
   ```
2. Mở `chrome://extensions` → bật **Developer mode**
3. Chọn **Load unpacked** → trỏ tới `packages/extension/.output/chrome-mv3`

### Firefox
> *Sắp có trên Firefox Add-ons*

Build tương tự, chọn `packages/extension/.output/firefox-mv2`.

---

## 🚀 Bắt đầu sử dụng

### Bước 1: Đăng ký tài khoản

Click icon Vaultic trên thanh công cụ → nhập email và **mật khẩu chính** (master password).

> ⚠️ **Quan trọng:** Mật khẩu chính là chìa khóa giải mã vault. Nếu quên, không ai có thể khôi phục dữ liệu — kể cả server.

<!-- TODO: Thêm screenshot register -->
<!-- ![Register](docs/images/register.png) -->

### Bước 2: Thêm mật khẩu đầu tiên

Có 2 cách:

**Cách 1 — Thêm thủ công:**
Click ➕ trong vault → nhập tên, URL, username, password → Lưu.

**Cách 2 — Tự động lưu:**
Đăng nhập vào website bất kỳ → Extension hiện banner "Lưu mật khẩu?" → Click **Lưu**.

### Bước 3: Tự động điền

Truy cập website đã lưu → click icon 🔑 bên cạnh ô mật khẩu → chọn tài khoản → điền tự động.

### Bước 4: Chia sẻ (tùy chọn)

Vào tab **Share** → chọn mật khẩu → tạo link → gửi cho người nhận. Link chỉ dùng được 1 lần.

---

## 🔒 Cách bảo mật hoạt động

```
Mật khẩu chính
      │
      ▼
  ┌─────────┐
  │ Argon2id │  ← Hàm băm chống brute-force (19MB RAM, 2 lần lặp)
  └────┬─────┘
       │
       ▼
  Master Key (32 bytes)
       │
   ┌───┴───┐
   │ HKDF  │  ← Tách khóa cho từng mục đích
   └───┬───┘
       │
       ▼
  ┌───────────┐
  │ AES-256   │  ← Mã hóa từng mục riêng biệt
  │   -GCM    │     (nonce ngẫu nhiên 12 bytes)
  └───────────┘
       │
       ▼
  Dữ liệu mã hóa → IndexedDB (local) / Server (nếu bật sync)
```

**Server không bao giờ nhận được master key hay dữ liệu gốc.**

---

## ⚙️ Cài đặt nâng cao

| Tùy chọn | Mặc định | Mô tả |
|-----------|----------|-------|
| Tự khóa | 15 phút | Tự động khóa vault sau thời gian không hoạt động |
| Xóa clipboard | 30 giây | Tự xóa mật khẩu đã copy khỏi clipboard |
| Đồng bộ cloud | Tắt | Bật để đồng bộ vault giữa các thiết bị |
| Tạo mật khẩu | 16 ký tự | Tùy chỉnh độ dài và độ phức tạp |

---

## 🛠 Dành cho nhà phát triển

### Yêu cầu
- Node.js 18+, pnpm 9+
- Rust 1.82+, Cargo
- PostgreSQL 16 (hoặc Docker)

### Khởi chạy nhanh

```bash
# Clone & cài đặt
git clone https://gitlabs.inet.vn/dattqh/vaultic.git && cd vaultic
pnpm install

# Khởi động database
docker compose -f docker/docker-compose.yml up -d postgres

# Chạy server API (port 8080)
cargo run -p vaultic-server

# Chạy extension (hot reload)
pnpm --filter extension dev
# → Load unpacked từ packages/extension/.wxt/chrome-mv3
```

### Cấu trúc dự án

```
vaultic/
├── crates/                    # Rust
│   ├── vaultic-crypto/        # Argon2id, AES-256-GCM, HKDF
│   ├── vaultic-server/        # Axum API server
│   ├── vaultic-types/         # Shared types
│   └── vaultic-migration/     # Database migrations
├── packages/                  # TypeScript
│   ├── types/                 # Shared TS types
│   ├── crypto/                # WebCrypto bridge
│   ├── storage/               # IndexedDB vault store
│   ├── sync/                  # Delta sync engine
│   ├── api/                   # Server API client
│   ├── ui/                    # Shared React components
│   └── extension/             # WXT browser extension
└── docker/                    # Docker configs
```

### Lệnh phổ biến

```bash
# Rust
cargo test                           # Chạy tất cả test
cargo clippy --all-targets           # Lint
cargo fmt --check                    # Kiểm tra format

# TypeScript
pnpm build                           # Build tất cả packages
pnpm lint                            # Lint tất cả
pnpm test                            # Test tất cả
pnpm --filter @vaultic/crypto build  # Build 1 package
```

### Self-host server

```bash
# Copy & chỉnh sửa biến môi trường
cp .env.example .env
# Sửa DATABASE_URL, JWT_SECRET trong .env

# Chạy với Docker Compose
docker compose -f docker/docker-compose.yml up -d
```

---

## 📄 Giấy phép

[AGPL-3.0](LICENSE) — Mã nguồn mở, tự do sử dụng và phân phối.

---

## 🤝 Đóng góp

Mọi đóng góp đều được hoan nghênh! Xem [docs/](docs/) để hiểu kiến trúc và quy chuẩn code.

1. Fork repo
2. Tạo branch: `git checkout -b feat/tinh-nang-moi`
3. Commit: `git commit -m "feat: thêm tính năng mới"`
4. Push & tạo Merge Request
