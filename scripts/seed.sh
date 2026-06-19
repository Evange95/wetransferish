#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-http://localhost}"
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

echo "=== Seeding Wetransferish ==="
echo ""

# --- Transfer 1: Design assets (3 files) ---
echo "Creating transfer 1: Design Assets..."
RES=$(curl -s -X POST "$BASE_URL/api/transfers")
T1_ID=$(echo "$RES" | grep -o '"transferId":"[^"]*"' | cut -d'"' -f4)
T1_LINK=$(echo "$RES" | grep -o '"shareLink":"[^"]*"' | cut -d'"' -f4)

# Generate dummy files with realistic names and sizes
dd if=/dev/urandom of="$TMP/brand-guidelines-v3.pdf" bs=1024 count=420 2>/dev/null
dd if=/dev/urandom of="$TMP/hero-banner-4k.png" bs=1024 count=1800 2>/dev/null
dd if=/dev/urandom of="$TMP/icon-set-final.svg" bs=1024 count=85 2>/dev/null

for f in brand-guidelines-v3.pdf hero-banner-4k.png icon-set-final.svg; do
  curl -s -X POST "$BASE_URL/api/transfers/$T1_ID/attachments" \
    -F "file=@$TMP/$f" > /dev/null
  echo "  uploaded $f"
done

curl -s -X POST "$BASE_URL/api/transfers/$T1_ID/finalize" > /dev/null
echo "  finalized"
echo ""

# --- Transfer 2: Single large file ---
echo "Creating transfer 2: Project Archive..."
RES=$(curl -s -X POST "$BASE_URL/api/transfers")
T2_ID=$(echo "$RES" | grep -o '"transferId":"[^"]*"' | cut -d'"' -f4)
T2_LINK=$(echo "$RES" | grep -o '"shareLink":"[^"]*"' | cut -d'"' -f4)

dd if=/dev/urandom of="$TMP/project-backup-2026.zip" bs=1024 count=3200 2>/dev/null
curl -s -X POST "$BASE_URL/api/transfers/$T2_ID/attachments" \
  -F "file=@$TMP/project-backup-2026.zip" > /dev/null
echo "  uploaded project-backup-2026.zip"

curl -s -X POST "$BASE_URL/api/transfers/$T2_ID/finalize" > /dev/null
echo "  finalized"
echo ""

# --- Transfer 3: Code review bundle (5 files) ---
echo "Creating transfer 3: Code Review..."
RES=$(curl -s -X POST "$BASE_URL/api/transfers")
T3_ID=$(echo "$RES" | grep -o '"transferId":"[^"]*"' | cut -d'"' -f4)
T3_LINK=$(echo "$RES" | grep -o '"shareLink":"[^"]*"' | cut -d'"' -f4)

for f in "architecture-diagram.drawio:120" "api-spec-openapi.yaml:45" "load-test-results.html:380" "coverage-report.json:92" "review-notes.md:12"; do
  name="${f%%:*}"
  size="${f##*:}"
  dd if=/dev/urandom of="$TMP/$name" bs=1024 count="$size" 2>/dev/null
  curl -s -X POST "$BASE_URL/api/transfers/$T3_ID/attachments" \
    -F "file=@$TMP/$name" > /dev/null
  echo "  uploaded $name"
done

curl -s -X POST "$BASE_URL/api/transfers/$T3_ID/finalize" > /dev/null
echo "  finalized"
echo ""

echo "=== Done! ==="
echo ""
echo "Download pages:"
echo "  Transfer 1 (3 files):  $BASE_URL/d/$T1_LINK"
echo "  Transfer 2 (1 file):   $BASE_URL/d/$T2_LINK"
echo "  Transfer 3 (5 files):  $BASE_URL/d/$T3_LINK"
echo ""
echo "Upload page: $BASE_URL"
