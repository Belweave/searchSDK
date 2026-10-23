#!/bin/sh
set -eu
package_dir=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
storage=${1:-"$package_dir/.build/consumer-verification"}
mkdir -p "$storage"
storage=$(CDPATH= cd -- "$storage" && pwd)
run_dir=$(mktemp -d "$storage/run.XXXXXX")
xcodebuild -version
python3 "$package_dir/Scripts/pack.py" --output "$run_dir/SearchSDK.tar.gz"
tar -xzf "$run_dir/SearchSDK.tar.gz" -C "$run_dir"
cp -R "$run_dir/SearchSDK/Examples/Consumer" "$run_dir/Consumer"
SEARCHSDK_PACKAGE_PATH="$run_dir/SearchSDK" swift run --package-path "$run_dir/Consumer" --scratch-path "$run_dir/build" --jobs 2 -c release SearchSDKConsumer
printf 'Verified extracted SPM consumer: %s\n' "$run_dir"
