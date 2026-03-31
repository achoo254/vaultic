#!/bin/bash
# Build extension for production, zip output, and update release metadata
# Usage: pnpm release:ext [--notes "Release notes here"]

set -e

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
VERSION=$(node -p "require('$REPO_ROOT/client/apps/extension/package.json').version")
OUTPUT_DIR="$REPO_ROOT/client/apps/extension/.output/chrome-mv3"
RELEASE_DIR="$REPO_ROOT/backend/static/releases"
ZIP_NAME="vaultic-ext-v${VERSION}.zip"
NOTES=""

# Parse --notes flag
while [[ $# -gt 0 ]]; do
  case "$1" in
    --notes) NOTES="$2"; shift 2 ;;
    *) shift ;;
  esac
done

echo "Building Vaultic extension v${VERSION}..."

# Build production
cd "$REPO_ROOT"
pnpm --filter @vaultic/extension build:production

# Create releases directory
mkdir -p "$RELEASE_DIR"

# Zip the build output
cd "$OUTPUT_DIR"
if command -v zip &> /dev/null; then
  zip -r "$RELEASE_DIR/$ZIP_NAME" .
else
  # Windows fallback via PowerShell
  powershell -Command "Compress-Archive -Path './*' -DestinationPath '$RELEASE_DIR/$ZIP_NAME' -Force"
fi
cd "$REPO_ROOT"

# Copy as latest
cp "$RELEASE_DIR/$ZIP_NAME" "$RELEASE_DIR/vaultic-ext-latest.zip"

# Update metadata (use node to safely escape JSON strings)
node -e "
  const fs = require('fs');
  const data = JSON.stringify({
    version: process.argv[1],
    downloadUrl: '/static/releases/vaultic-ext-latest.zip',
    releaseNotes: process.argv[2],
    releasedAt: new Date().toISOString().slice(0, 10)
  }, null, 2);
  fs.writeFileSync(process.argv[3], data + '\n');
" "$VERSION" "$NOTES" "$REPO_ROOT/backend/static/extension-release.json"

echo "Released extension v${VERSION}"
echo "  Zip: $RELEASE_DIR/$ZIP_NAME"
echo "  Metadata: backend/static/extension-release.json"
