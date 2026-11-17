#!/usr/bin/env bash
# Builds the Phase 0 prototype and wraps it in an .app bundle so macOS can attribute the Accessibility grant to a
# stable bundle identity. Run on a Mac with Xcode 16+ (or matching Command Line Tools).
#
#   ./scripts/build-app.sh                      # ad-hoc signature (local testing only)
#   CODESIGN_IDENTITY="Apple Development: …" ./scripts/build-app.sh   # stable identity: grant survives rebuilds
set -euo pipefail
cd "$(dirname "$0")/.."

swift build -c release
BIN_DIR="$(swift build -c release --show-bin-path)"
APP="build/PlainClick Prototype.app"

rm -rf "$APP"
mkdir -p "$APP/Contents/MacOS"
cp "$BIN_DIR/PlainClickPrototype" "$APP/Contents/MacOS/PlainClickPrototype"
cp Resources/Info.plist "$APP/Contents/Info.plist"

IDENTITY="${CODESIGN_IDENTITY:--}"
codesign --force --options runtime --sign "$IDENTITY" "$APP"
codesign --verify --verbose=2 "$APP"

echo
echo "Built: $APP"
echo "Run:   open \"$APP\""
if [ "$IDENTITY" = "-" ]; then
  echo "Note: ad-hoc signed. After each rebuild macOS may keep showing the old Accessibility grant but not honour it."
  echo "      Fix: tccutil reset Accessibility local.plainclick.prototype   (then grant again)"
fi
