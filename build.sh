#!/bin/bash
# Builds dist/RaceTime-mac-arm64.zip + RaceTime-mac-x64.zip (unsigned .app), RaceTime-web.zip, and dist/part_NN (20 MB chunks of the arm64 zip)
set -e
ROOT=$(cd "$(dirname "$0")" && pwd); PK=${PACKAGER_DIR:-/tmp/elec}
ST=$(mktemp -d)/RaceTime; mkdir -p "$ST/app"
cp "$ROOT/electron/main.js" "$ROOT/electron/package.json" "$ST/"
cp -r "$ROOT/index.html" "$ROOT/css" "$ROOT/js" "$ROOT/vendor" "$ST/app/"
ZIP() { if command -v zip >/dev/null; then zip -9 -q -r -y "$@"; else python3 "$ROOT/tools/zipy.py" "$@"; fi; }
OUT=$(mktemp -d); cd "$PK"
npx electron-packager "$ST" RaceTime --platform=darwin --arch=arm64,x64 --electron-version=33.4.11 --out="$OUT" --overwrite --app-bundle-id=com.racetime.fsae --app-version=2.2.0 --app-category-type=public.app-category.simulation-games
mkdir -p "$ROOT/dist"; rm -f "$ROOT/dist"/RaceTime-mac*.zip "$ROOT/dist/RaceTime-web.zip" "$ROOT/dist"/part_*
cp "$ROOT/docs/README-mac.txt" "$OUT/"
cd "$OUT"
for A in arm64 x64; do ZIP "$ROOT/dist/RaceTime-mac-$A.zip" "RaceTime-darwin-$A/RaceTime.app" README-mac.txt; done
W=$(mktemp -d)/RaceTime-web; mkdir -p "$W"; cp -r "$ROOT/index.html" "$ROOT/css" "$ROOT/js" "$ROOT/vendor" "$W/"; cd "$(dirname "$W")" && ZIP "$ROOT/dist/RaceTime-web.zip" RaceTime-web
# 20 MB chunks of the arm64 zip for transfer: cat part_* > RaceTime-mac-arm64.zip
cd "$ROOT/dist" && split -b 20m -d -a 2 RaceTime-mac-arm64.zip part_
sha256sum RaceTime-mac-arm64.zip RaceTime-mac-x64.zip RaceTime-web.zip
ls -la "$ROOT/dist"
