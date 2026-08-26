#!/usr/bin/env bash
#
# One-time setup: creates a "Macro & Market.app" on your Desktop. It's a
# toggle: double-click it when the app isn't running to start the backend +
# frontend (in a visible Terminal window, via ./scripts/dev.sh start) and
# open the app in your browser once it's up; double-click it again while
# running to stop both (./scripts/dev.sh stop) — the same icon does both,
# based on whether anything is currently listening on ports 8000/3000.
#
#   ./scripts/install-desktop-launcher.sh
#
# Safe to re-run — it removes and rebuilds the app bundle from scratch each
# time, so it also fixes a previously "damaged" launcher (see the ad-hoc
# codesign step below) or a stale icon.
#
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_NAME="Macro & Market"
# Info.plist is XML — a bare "&" in a string value makes the file invalid
# XML, which is exactly what produces macOS's "... is damaged" dialog.
APP_NAME_XML="${APP_NAME//&/&amp;}"
APP_DIR="$HOME/Desktop/${APP_NAME}.app"
ICON_SRC="$ROOT_DIR/scripts/assets/AppIcon.icns"

rm -rf "$APP_DIR"
mkdir -p "$APP_DIR/Contents/MacOS" "$APP_DIR/Contents/Resources"

cp "$ICON_SRC" "$APP_DIR/Contents/Resources/AppIcon.icns"

cat > "$APP_DIR/Contents/Info.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleName</key>
    <string>${APP_NAME_XML}</string>
    <key>CFBundleIdentifier</key>
    <string>com.local.macro-and-market-launcher</string>
    <key>CFBundleVersion</key>
    <string>1.0</string>
    <key>CFBundleShortVersionString</key>
    <string>1.0</string>
    <key>CFBundleExecutable</key>
    <string>launch</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>CFBundleSignature</key>
    <string>????</string>
    <key>CFBundleIconFile</key>
    <string>AppIcon</string>
    <key>CFBundleIconName</key>
    <string>AppIcon</string>
    <key>LSMinimumSystemVersion</key>
    <string>10.13</string>
</dict>
</plist>
PLIST

printf 'APPL????' > "$APP_DIR/Contents/PkgInfo"

cat > "$APP_DIR/Contents/MacOS/launch" <<LAUNCH
#!/bin/bash
osascript <<'OSA'
tell application "Terminal"
  activate
  do script "cd '${ROOT_DIR}' && if lsof -ti :8000 -sTCP:LISTEN >/dev/null 2>&1 || lsof -ti :3000 -sTCP:LISTEN >/dev/null 2>&1; then ./scripts/dev.sh stop; else ./scripts/dev.sh start && open http://localhost:3000; fi"
end tell
OSA
LAUNCH

chmod +x "$APP_DIR/Contents/MacOS/launch"

# Newly-created unsigned app bundles are rejected by Gatekeeper on modern
# macOS ("... is damaged and can't be opened") unless they carry at least an
# ad-hoc signature. Clearing any quarantine attribute first, then ad-hoc
# signing (no paid developer certificate needed, since this app never
# leaves your machine) fixes that.
/usr/bin/xattr -cr "$APP_DIR" 2>/dev/null || true
codesign --force --deep --sign - "$APP_DIR"

# Make Finder pick up the new bundle/icon instead of a cached version
# (restarts Finder — windows reopen automatically, nothing is lost).
touch "$APP_DIR"
killall Finder >/dev/null 2>&1 || true

echo "Created \"$APP_DIR\""
echo "Double-click it from your Desktop to start Macro & Market — double-click again to stop it."
