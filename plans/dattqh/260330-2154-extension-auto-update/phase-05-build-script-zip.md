# Phase 5: Build Script Auto-Zip + Versioning

## Status: `done`
## Priority: Medium
## Effort: 1 hour

## Overview
Script tự động zip `.output/chrome-mv3/` sau khi build, đặt tên theo version từ package.json. Dùng cho release flow.

## Context
- Build output: `client/apps/extension/.output/chrome-mv3/` (~994kB)
- Version source: `client/apps/extension/package.json` → `version` field
- Build scripts: `pnpm build:ext:production` (root) hoặc `wxt build --mode production`
- VPS deploy: PM2 trên CentOS 7, nginx serve static files

## Related Code Files

### Create
- `scripts/build-extension-release.sh` — build + zip + update metadata

### Modify
- `package.json` (root) — thêm script `release:ext`
- `backend/static/extension-release.json` — updated by script

## Implementation Steps

### 1. Tạo build script
```bash
#!/bin/bash
# scripts/build-extension-release.sh
# 1. Build extension production
# 2. Read version from client/apps/extension/package.json
# 3. Zip .output/chrome-mv3/ → vaultic-ext-v{version}.zip
# 4. Copy zip → backend/static/releases/
# 5. Update backend/static/extension-release.json với version mới
# 6. Also create vaultic-ext-latest.zip (symlink hoặc copy)
```

### 2. Script logic
```bash
VERSION=$(node -p "require('./client/apps/extension/package.json').version")
OUTPUT_DIR="client/apps/extension/.output/chrome-mv3"
RELEASE_DIR="backend/static/releases"
ZIP_NAME="vaultic-ext-v${VERSION}.zip"

# Build
pnpm --filter @vaultic/extension build:production

# Zip
mkdir -p "$RELEASE_DIR"
cd "$OUTPUT_DIR" && zip -r "../../../$RELEASE_DIR/$ZIP_NAME" . && cd -

# Latest symlink
cp "$RELEASE_DIR/$ZIP_NAME" "$RELEASE_DIR/vaultic-ext-latest.zip"

# Update metadata
cat > backend/static/extension-release.json << EOF
{
  "version": "$VERSION",
  "downloadUrl": "/static/releases/vaultic-ext-latest.zip",
  "releaseNotes": "",
  "releasedAt": "$(date +%Y-%m-%d)"
}
EOF

echo "Released extension v$VERSION"
```

### 3. Thêm root script
```json
// package.json (root)
"release:ext": "bash scripts/build-extension-release.sh"
```

### 4. Deployment flow
```bash
# Local: build + zip
pnpm release:ext

# Upload lên VPS
scp backend/static/releases/vaultic-ext-latest.zip user@vps:/var/www/vaultic/releases/
scp backend/static/extension-release.json user@vps:/path/to/backend/static/

# Hoặc git push → PM2 restart tự pick up file mới
```

## Todo
- [x] Tạo `scripts/build-extension-release.sh`
- [x] Tạo `backend/static/releases/` directory (gitignore .zip files)
- [x] Thêm `release:ext` script vào root package.json
- [x] Thêm `.gitignore` entry cho `backend/static/releases/*.zip`
- [x] Test: script build + zip đúng
- [x] Test: metadata file update đúng version
- [x] Document deployment flow

## Success Criteria
- `pnpm release:ext` → build production + tạo .zip + update metadata
- Zip file chứa đúng nội dung `.output/chrome-mv3/`
- `extension-release.json` cập nhật version + date
- .zip files không bị commit vào git

## Notes
- releaseNotes cần edit thủ công trước khi release (hoặc thêm flag `--notes "..."`)
- Có thể mở rộng thành CI/CD action sau (GitHub Actions)
