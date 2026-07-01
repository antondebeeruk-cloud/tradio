#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SIGNING_ENV="${TRADIO_ANDROID_SIGNING_ENV:-/root/.config/tradio/android-signing.env}"

if [[ ! -f "$SIGNING_ENV" ]]; then
  echo "Missing Android signing file: $SIGNING_ENV"
  echo "Create it from the example in MOBILE_DEPLOYMENT.md and protect it with chmod 600."
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$SIGNING_ENV"
set +a

required=(
  ANDROID_HOME
  TRADIO_ANDROID_KEYSTORE_PATH
  TRADIO_ANDROID_KEYSTORE_PASSWORD
  TRADIO_ANDROID_KEY_ALIAS
  TRADIO_ANDROID_KEY_PASSWORD
)

for name in "${required[@]}"; do
  if [[ -z "${!name:-}" ]]; then
    echo "Missing $name in $SIGNING_ENV"
    exit 1
  fi
done

if [[ ! -f "$TRADIO_ANDROID_KEYSTORE_PATH" ]]; then
  echo "Keystore not found: $TRADIO_ANDROID_KEYSTORE_PATH"
  exit 1
fi

export PATH="$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$PATH"

cd "$ROOT_DIR"
npm ci
npm run mobile:assets
npm run mobile:sync

cd android
./gradlew clean assembleRelease

APK_SOURCE="$ROOT_DIR/android/app/build/outputs/apk/release/app-release.apk"
APK_DIRECTORY="$ROOT_DIR/public/downloads"
APK_TARGET="$APK_DIRECTORY/tradio-android.apk"

if [[ ! -f "$APK_SOURCE" ]]; then
  echo "Android release build completed without producing $APK_SOURCE"
  exit 1
fi

mkdir -p "$APK_DIRECTORY"
install -m 0644 "$APK_SOURCE" "$APK_TARGET"

echo "Android release ready: $APK_TARGET"
sha256sum "$APK_TARGET"
