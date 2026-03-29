# 🔐 Vaultic

> **[🇬🇧 English](README.en.md)**

**Trình quản lý mật khẩu mã nguồn mở, mã hóa đầu-cuối, ưu tiên offline.**

Vaultic là giải pháp thay thế đơn giản và miễn phí cho 1Password/Bitwarden — toàn bộ dữ liệu được mã hóa ngay trên thiết bị của bạn. Server không bao giờ nhìn thấy mật khẩu gốc.

---

## Tại sao chọn Vaultic?

| 🔒 Zero-Knowledge | 📴 Offline-First | 🔓 Mã nguồn mở |
|:---:|:---:|:---:|
| Mã hóa AES-256-GCM trên thiết bị. Server chỉ lưu dữ liệu đã mã hóa — không thể giải mã. | Hoạt động 100% offline sau đăng nhập. Đồng bộ cloud là **tùy chọn**. | Tự host, tự kiểm tra, tự kiểm soát. |

---

## 📊 So sánh với các trình quản lý mật khẩu khác

| Tính năng | Vaultic | Bitwarden | LastPass | Proton Pass |
|-----------|:-------:|:---------:|:--------:|:-----------:|
| Mật khẩu | Không giới hạn | Không giới hạn | Không giới hạn | Không giới hạn |
| Thiết bị | Không giới hạn | Không giới hạn | **1 loại** · *mobile HOẶC desktop* | Không giới hạn |
| Offline | **Mặc định** | Có | Có | **Trả phí** |
| Cloud sync | Tùy chọn (opt-in) | Bắt buộc | Bắt buộc | Bắt buộc |
| Chia sẻ mã hóa | Link 1 lần | **Trả phí** · *Send* | **Trả phí** | **Trả phí** |
| Kiểm tra mật khẩu yếu | Có | **Trả phí** · *Vault Health* | Cơ bản | Cơ bản |
| Tự host | Có | Có | Không | Không |
| Mã nguồn mở | Có | Có (GPLv2) | Không | Có (GPLv3) |
| Nhập CSV | Có · *Chrome, Bitwarden, 1Password* | Có | Có | Có |
| Xuất vault | Có · *JSON mã hóa + CSV* | Có | Có | Có |
| Tạo mật khẩu | Có · *8–64 ký tự, tùy chỉnh* | Có | Có | Có |
| Tự động điền | Có | Có | Có | Có |
| Tự khóa | Có · *15 phút mặc định* | Có | Có | Có |
| Giá | **Miễn phí** | Free / $10/năm | Free / $36/năm | Free / $36/năm |

> **Ghi chú:** 1Password và Dashlane không có gói miễn phí (chỉ dùng thử). So sánh dựa trên gói miễn phí của từng sản phẩm.
>
> Nguồn: [Bitwarden Pricing](https://bitwarden.com/pricing/) · [Proton Pass Pricing](https://proton.me/pass/pricing) · [LastPass Pricing](https://www.lastpass.com/pricing) · [1Password Sign-up](https://1password.com/sign-up/)

---

## ✨ Tính năng chính

### 🗄️ Kho mật khẩu
Lưu trữ và quản lý thông tin đăng nhập, ghi chú bảo mật — được mã hóa và tìm kiếm nhanh.

### ⚡ Tự động điền
Extension phát hiện form đăng nhập và gợi ý điền mật khẩu phù hợp theo tên miền.

### 🔗 Chia sẻ an toàn
Tạo link chia sẻ mã hóa — tùy chỉnh số lần xem và thời hạn. Khóa giải mã nằm trong URL fragment, server không bao giờ nhận được.

### 🔄 Đồng bộ tùy chọn
Bật/tắt đồng bộ cloud trong Cài đặt. Khi tắt, dữ liệu chỉ ở trên thiết bị. Khi bật, đồng bộ delta — chỉ gửi thay đổi.

### 🛡️ Kiểm tra sức khỏe bảo mật
Phát hiện mật khẩu yếu, trùng lặp và đề xuất cải thiện.

### 📦 Xuất / Nhập
Nhập từ file CSV (tương thích các trình quản lý khác). Xuất vault dưới dạng JSON mã hóa.

---

## 📥 Cài đặt Extension

### Chrome / Edge / Brave
> *Sắp có trên Chrome Web Store*

Cài thủ công (Developer Mode):
1. Build extension:
   ```bash
   git clone https://github.com/achoo254/vaultic.git && cd vaultic
   pnpm install && pnpm build
   ```
2. Mở `chrome://extensions` → bật **Developer mode**
3. Chọn **Load unpacked** → trỏ tới `client/apps/extension/.output/chrome-mv3`

---

## 🚀 Bắt đầu sử dụng

### Bước 1: Tạo mật khẩu chính

Click icon Vaultic trên thanh công cụ → đặt **mật khẩu chính** (master password). Vault hoạt động ngay trên thiết bị, không cần tài khoản hay kết nối mạng.

> ⚠️ **Quan trọng:** Mật khẩu chính là chìa khóa duy nhất để giải mã vault. Nếu quên, không ai có thể khôi phục dữ liệu — kể cả server.

### Bước 2: Thêm mật khẩu đầu tiên

**Cách 1 — Thêm thủ công:**
Click ➕ trong vault → nhập tên, URL, username, password → Lưu.

**Cách 2 — Tự động lưu:**
Đăng nhập vào website bất kỳ → Extension hiện banner "Lưu mật khẩu?" → Click **Lưu**.

### Bước 3: Tự động điền

Truy cập website đã lưu → click icon 🔑 bên cạnh ô mật khẩu → chọn tài khoản → điền tự động.

### Bước 4: Chia sẻ (tùy chọn)

Vào tab **Share** → chọn mật khẩu → tùy chỉnh số lần xem và thời hạn → tạo link → gửi cho người nhận.

---

## 🔒 Cách bảo mật hoạt động

```
Mật khẩu chính
      │
      ▼
  ┌─────────┐
  │ Argon2id │  ← Hàm băm chống brute-force (64MB RAM, 3 lần lặp)
  └────┬─────┘
       │
       ▼
  Master Key (32 bytes)
       │
   ┌───┴───┐
   │ HKDF  │  ← Tách khóa cho từng mục đích (mã hóa, xác thực)
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
| Tạo mật khẩu | 20 ký tự | Tùy chỉnh độ dài và độ phức tạp |

---

## 🛠 Dành cho nhà phát triển

### Yêu cầu
- Node.js 22+, pnpm 9+
- MongoDB

### Khởi chạy nhanh

```bash
# Clone & cài đặt
git clone https://github.com/achoo254/vaultic.git && cd vaultic
pnpm install

# Đặt biến môi trường
cp backend/.env.example backend/.env
# Sửa backend/.env: MONGODB_URI, JWT_SECRET

# Chạy server API (port 8080)
cd backend && pnpm dev

# Chạy extension (hot reload) — terminal khác
cd .. && pnpm --filter @vaultic/extension dev
# → Load unpacked từ client/apps/extension/.output/chrome-mv3
```

### Cấu trúc dự án

```
vaultic/
├── backend/                   # Node.js/Express server
│   ├── src/
│   │   ├── server.ts          # Express app + MongoDB connection
│   │   ├── config/            # Biến môi trường
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

### Lệnh phổ biến

```bash
# Backend
cd backend
pnpm dev                            # Chạy dev server (port 8080)
pnpm build                          # Compile TypeScript → dist/
pnpm start                          # Chạy production server

# Client
pnpm --filter @vaultic/extension dev # Dev extension (hot reload)
pnpm build                          # Build tất cả packages
pnpm lint                           # Lint tất cả
pnpm test                           # Test tất cả
```

---

## 🤝 Đóng góp

Mọi đóng góp đều được hoan nghênh! Xem [docs/](docs/) để hiểu kiến trúc và quy chuẩn code.

1. Fork repo
2. Tạo branch: `git checkout -b feat/tinh-nang-moi`
3. Commit: `git commit -m "feat: thêm tính năng mới"`
4. Push & tạo Pull Request
