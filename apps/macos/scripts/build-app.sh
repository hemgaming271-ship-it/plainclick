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
# Sparkle (in-app updates) is a dynamic framework: embed it and let the binary find it in Contents/Frameworks.
mkdir -p "$APP/Contents/Frameworks"
ditto "$BIN_DIR/Sparkle.framework" "$APP/Contents/Frameworks/Sparkle.framework"
install_name_tool -add_rpath "@executable_path/../Frameworks" "$APP/Contents/MacOS/PlainClickPrototype"

PLIST="$APP/Contents/Info.plist"
set_plist() { /usr/libexec/PlistBuddy -c "Set :$1 $2" "$PLIST"; }
if [ "$APP_NAME" != "PlainClick Prototype" ]; then
  set_plist CFBundleName "$APP_NAME"
  set_plist CFBundleDisplayName "$APP_NAME"
fi
[ -n "$BUNDLE_ID" ] && set_plist CFBundleIdentifier "$BUNDLE_ID"
[ -n "$VERSION" ] && set_plist CFBundleShortVersionString "$VERSION"
[ -n "$BUILD_NUMBER" ] && set_plist CFBundleVersion "$BUILD_NUMBER"
# Licensing: Dodo "test" or "live", and the product whose keys unlock the app.
[ -n "${DODO_ENV:-}" ] && set_plist PCDodoEnvironment "$DODO_ENV"
[ -n "${DODO_PRODUCT_ID:-}" ] && set_plist PCDodoProductID "$DODO_PRODUCT_ID"
# In-app updates are on only when both are set (release builds); otherwise "Check for Updates…" is hidden.
if [ -n "${SPARKLE_FEED_URL:-}" ] && [ -n "${SPARKLE_PUBLIC_KEY:-}" ]; then
  /usr/libexec/PlistBuddy -c "Add :SUFeedURL string $SPARKLE_FEED_URL" "$PLIST"
  /usr/libexec/PlistBuddy -c "Add :SUPublicEDKey string $SPARKLE_PUBLIC_KEY" "$PLIST"
  /usr/libexec/PlistBuddy -c "Add :SUVerifyUpdateBeforeExtraction bool true" "$PLIST"
  echo "Updates: $SPARKLE_FEED_URL"
else
  echo "Updates: off (SPARKLE_FEED_URL / SPARKLE_PUBLIC_KEY not set)"
fi
echo "Licensing: Dodo $(/usr/libexec/PlistBuddy -c 'Print :PCDodoEnvironment' "$PLIST"), product '$(/usr/libexec/PlistBuddy -c 'Print :PCDodoProductID' "$PLIST")'"

echo "Architectures: $(lipo -archs "$APP/Contents/MacOS/PlainClickPrototype")"

IDENTITY="${CODESIGN_IDENTITY:--}"
SIGN_ARGS=(--force --options runtime --sign "$IDENTITY")
# A secure timestamp is required for notarization; ad-hoc and self-signed signatures don't use Apple's timestamp server.
[ "$IDENTITY" != "-" ] && [ -z "${NO_TIMESTAMP:-}" ] && SIGN_ARGS+=(--timestamp)
[ -n "${KEYCHAIN:-}" ] && SIGN_ARGS+=(--keychain "$KEYCHAIN")
# Sign nested code inside-out (Sparkle's documented order), then the app itself. No --deep.
SPARKLE="$APP/Contents/Frameworks/Sparkle.framework/Versions/B"
codesign "${SIGN_ARGS[@]}" "$SPARKLE/XPCServices/Installer.xpc"
codesign "${SIGN_ARGS[@]}" --preserve-metadata=entitlements "$SPARKLE/XPCServices/Downloader.xpc"
codesign "${SIGN_ARGS[@]}" "$SPARKLE/Autoupdate"
codesign "${SIGN_ARGS[@]}" "$SPARKLE/Updater.app"
codesign "${SIGN_ARGS[@]}" "$APP/Contents/Frameworks/Sparkle.framework"
codesign "${SIGN_ARGS[@]}" "$APP"
if codesign -dv "$APP" 2>&1 | grep -q '^TeamIdentifier=not set'; then
  codesign "${SIGN_ARGS[@]}" --entitlements Resources/NoTeamID.entitlements "$APP"
  echo "No Team ID (ad-hoc/self-signed): library validation off so Sparkle.framework can load."
fi
codesign --verify --strict --verbose=2 "$APP"

echo
echo "Built: $APP"
echo "Run:   open \"$APP\""
if [ "$IDENTITY" = "-" ]; then
  echo "Note: ad-hoc signed. After each rebuild macOS may keep showing the old Accessibility grant but not honour it."
  echo "      Fix: tccutil reset Accessibility $( /usr/libexec/PlistBuddy -c 'Print :CFBundleIdentifier' "$PLIST" )   (then grant again)"
fi
