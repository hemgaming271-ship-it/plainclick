#!/usr/bin/env bash
# Builds PlainClick and wraps it in an .app bundle so macOS can attribute the Accessibility grant to a stable
# bundle identity. Run on a Mac (or a GitHub macOS runner) with Xcode 16+.
#
#   ./scripts/build-app.sh                      # prototype bundle, ad-hoc signature (local testing only)
#   CODESIGN_IDENTITY="Apple Development: …" ./scripts/build-app.sh   # stable identity: grant survives rebuilds
#
# Release builds (used by .github/workflows/release.yml):
#   APP_NAME=PlainClick BUNDLE_ID=com.example.plainclick VERSION=1.0.0 BUILD_NUMBER=42 UNIVERSAL=1 \
#   CODESIGN_IDENTITY="Developer ID Application: <Name> (<TEAMID>)" ./scripts/build-app.sh
set -euo pipefail
cd "$(dirname "$0")/.."

APP_NAME="${APP_NAME:-PlainClick Prototype}"
BUNDLE_ID="${BUNDLE_ID:-}"
VERSION="${VERSION:-}"
BUILD_NUMBER="${BUILD_NUMBER:-}"

ARCH_FLAGS=()
if [ "${UNIVERSAL:-0}" = "1" ]; then
  # One binary for Apple silicon and Intel Macs.
  ARCH_FLAGS=(--arch arm64 --arch x86_64)
fi

swift build -c release ${ARCH_FLAGS[@]+"${ARCH_FLAGS[@]}"}
BIN_DIR="$(swift build -c release ${ARCH_FLAGS[@]+"${ARCH_FLAGS[@]}"} --show-bin-path)"
APP="build/${APP_NAME}.app"

rm -rf "$APP"
mkdir -p "$APP/Contents/MacOS"
cp "$BIN_DIR/PlainClickPrototype" "$APP/Contents/MacOS/PlainClickPrototype"
cp Resources/Info.plist "$APP/Contents/Info.plist"

PLIST="$APP/Contents/Info.plist"
set_plist() { /usr/libexec/PlistBuddy -c "Set :$1 $2" "$PLIST"; }
if [ "$APP_NAME" != "PlainClick Prototype" ]; then
  set_plist CFBundleName "$APP_NAME"
  set_plist CFBundleDisplayName "$APP_NAME"
fi
[ -n "$BUNDLE_ID" ] && set_plist CFBundleIdentifier "$BUNDLE_ID"
[ -n "$VERSION" ] && set_plist CFBundleShortVersionString "$VERSION"
[ -n "$BUILD_NUMBER" ] && set_plist CFBundleVersion "$BUILD_NUMBER"

echo "Architectures: $(lipo -archs "$APP/Contents/MacOS/PlainClickPrototype")"

IDENTITY="${CODESIGN_IDENTITY:--}"
SIGN_ARGS=(--force --options runtime --sign "$IDENTITY")
# A secure timestamp is required for notarization; ad-hoc signatures can't have one.
[ "$IDENTITY" != "-" ] && SIGN_ARGS+=(--timestamp)
[ -n "${KEYCHAIN:-}" ] && SIGN_ARGS+=(--keychain "$KEYCHAIN")
codesign "${SIGN_ARGS[@]}" "$APP"
codesign --verify --strict --verbose=2 "$APP"

echo
echo "Built: $APP"
echo "Run:   open \"$APP\""
if [ "$IDENTITY" = "-" ]; then
  echo "Note: ad-hoc signed. After each rebuild macOS may keep showing the old Accessibility grant but not honour it."
  echo "      Fix: tccutil reset Accessibility $( /usr/libexec/PlistBuddy -c 'Print :CFBundleIdentifier' "$PLIST" )   (then grant again)"
fi
