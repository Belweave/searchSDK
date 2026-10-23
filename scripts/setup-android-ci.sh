#!/usr/bin/env bash
# Install official Android tools without requiring third-party GitHub Actions.
# Archive and SHA-256: https://developer.android.com/studio#command-line-tools-only
set -euo pipefail

if [[ "$(uname -s)" != Linux || "$(uname -m)" != x86_64 ]]; then
  echo 'This CI installer requires Linux x86_64.' >&2
  exit 1
fi
: "${RUNNER_TEMP:?GitHub Actions runner temporary directory is required}"
: "${GITHUB_ENV:?GitHub Actions environment file is required}"
: "${GITHUB_PATH:?GitHub Actions path file is required}"

android_ci_root="$RUNNER_TEMP/searchsdk-android-sdk"
android_ci_download="$(mktemp -d "$RUNNER_TEMP/searchsdk-android-tools.XXXXXX")"
trap 'rm -rf "$android_ci_download"' EXIT
android_ci_archive='commandlinetools-linux-15859902_latest.zip'
android_ci_sha256='4e4c464f145a7512b57d088ac6c278c03c9eea610886b35a5e0804e74eedf583'
curl --fail --location --retry 3 --proto '=https' --tlsv1.2 \
  "https://dl.google.com/android/repository/$android_ci_archive" \
  --output "$android_ci_download/$android_ci_archive"
printf '%s  %s\n' "$android_ci_sha256" "$android_ci_download/$android_ci_archive" | sha256sum --check
unzip -q "$android_ci_download/$android_ci_archive" -d "$android_ci_download/extracted"
mkdir -p "$android_ci_root/cmdline-tools"
mv "$android_ci_download/extracted/cmdline-tools" "$android_ci_root/cmdline-tools/22.0"
android_ci_manager="$android_ci_root/cmdline-tools/22.0/bin/sdkmanager"

# Finite input avoids a successful sdkmanager exit becoming SIGPIPE under pipefail.
printf 'y\n%.0s' {1..100} > "$android_ci_download/licenses-input"
"$android_ci_manager" --sdk_root="$android_ci_root" --licenses < "$android_ci_download/licenses-input"
"$android_ci_manager" --sdk_root="$android_ci_root" \
  'platform-tools' 'platforms;android-36' 'build-tools;36.0.0'

printf 'ANDROID_HOME=%s\nANDROID_SDK_ROOT=%s\n' "$android_ci_root" "$android_ci_root" >> "$GITHUB_ENV"
printf '%s\n%s\n' "$android_ci_root/cmdline-tools/22.0/bin" "$android_ci_root/platform-tools" >> "$GITHUB_PATH"
"$android_ci_manager" --sdk_root="$android_ci_root" --version
