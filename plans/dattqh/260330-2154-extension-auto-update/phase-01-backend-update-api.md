# Phase 1: Backend Update API + Static Hosting

## Status: `pending`
## Priority: High
## Effort: 2-3 hours

## Overview
Tạo public API endpoint trả version info + setup nginx serve static .zip files.

## Context
- Existing route pattern: `backend/src/routes/share-route.ts` (static file serving)
- Route mounting: `backend/src/server.ts` lines 34-38
- No auth required — public endpoint

## Related Code Files

### Create
- `backend/src/routes/extension-update-route.ts` — route handler
- `backend/static/extension-release.json` — version metadata file

### Modify
- `backend/src/server.ts` — mount new route

## Implementation Steps

### 1. Tạo version metadata file
```json
// backend/static/extension-release.json
{
  "version": "0.1.0",
  "downloadUrl": "/static/releases/vaultic-ext-latest.zip",
  "releaseNotes": "Initial release",
  "releasedAt": "2026-03-30"
}
```

### 2. Tạo route `extension-update-route.ts`
```typescript
// GET /api/v1/extension/latest
// Đọc extension-release.json, trả về JSON
// No auth middleware
```

### 3. Mount route trong server.ts
```typescript
app.use("/api/v1/extension", extensionUpdateRouter);
```

### 4. Setup nginx static serving
```nginx
# Thêm vào nginx config
location /static/releases/ {
    alias /path/to/releases/;
    autoindex off;
}
```

### 5. Tạo thư mục releases trên server
```bash
mkdir -p /var/www/vaultic/releases
```

## Todo
- [ ] Tạo `backend/static/extension-release.json`
- [ ] Tạo `backend/src/routes/extension-update-route.ts`
- [ ] Mount route trong `server.ts`
- [ ] Cấu hình nginx cho static releases
- [ ] Test endpoint trả đúng JSON

## Success Criteria
- `GET /api/v1/extension/latest` trả `{ version, downloadUrl, releaseNotes, releasedAt }`
- Static .zip file downloadable từ `downloadUrl`
- No auth required
- Response time < 50ms (đọc file JSON)
