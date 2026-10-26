#!/usr/bin/env bash
# Reinstalls the Android build toolchain in a fresh cloud session (JDK 21, Node and Gradle are preinstalled).
set -euo pipefail
export ANDROID_HOME=/opt/android-sdk ANDROID_SDK_ROOT=/opt/android-sdk
if [ ! -x "$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager" ]; then
  mkdir -p "$ANDROID_HOME/cmdline-tools" /tmp/dl
  curl -fsSL -o /tmp/dl/cmdtools.zip https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip
  unzip -q -o /tmp/dl/cmdtools.zip -d /tmp/dl/ct
  mv /tmp/dl/ct/cmdline-tools "$ANDROID_HOME/cmdline-tools/latest"
fi
yes | "$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager" --licenses >/dev/null 2>&1 || true
"$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager" "platform-tools" "platforms;android-35" "build-tools;35.0.0"
echo "sdk.dir=$ANDROID_HOME" > "$(dirname "$0")/../app/android/local.properties"
# Maven Central may answer 429 through the proxy; rerun assembleDebug with --max-workers=1 until it passes.
