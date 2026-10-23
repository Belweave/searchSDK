#!/bin/sh
set -eu
package_dir=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
mkdir -p "$package_dir/localbuild"
work_dir=$(mktemp -d "$package_dir/localbuild/package-check.XXXXXX")
build_dir="$work_dir/build"
prefix_dir="$work_dir/installed"
consumer_dir="$work_dir/consumer"
python3 -B "$package_dir/scripts/generate.py" --check
cmake -S "$package_dir" -B "$build_dir" -DCMAKE_BUILD_TYPE=Release -DSEARCHSDK_TESTS=OFF -DCMAKE_INSTALL_LIBDIR=lib -DCMAKE_INSTALL_PREFIX="$prefix_dir"
cmake --build "$build_dir" -j2
cmake --install "$build_dir"
cmake -S "$package_dir/examples" -B "$consumer_dir" -DCMAKE_BUILD_TYPE=Release -DCMAKE_PREFIX_PATH="$prefix_dir"
cmake --build "$consumer_dir" -j2
"$consumer_dir/searchsdk_consumer" "$package_dir/../../sdk-contract/fixtures"
(cd "$build_dir" && cpack -G TGZ)
archive=$(find "$build_dir" -maxdepth 1 -name 'searchsdk-c-*.tar.gz' -print)
test -n "$archive"
# Verify the distributed archive, not only the install staging prefix.
unpack_dir="$work_dir/unpacked"
mkdir -p "$unpack_dir"
tar -xzf "$archive" -C "$unpack_dir"
archive_prefix=$(find "$unpack_dir" -mindepth 1 -maxdepth 1 -type d -name 'searchsdk-c-*' -print)
cmake -S "$package_dir/examples" -B "$work_dir/archive-consumer" -DCMAKE_BUILD_TYPE=Release -DCMAKE_PREFIX_PATH="$archive_prefix"
cmake --build "$work_dir/archive-consumer" -j2
"$work_dir/archive-consumer/searchsdk_consumer" "$package_dir/../../sdk-contract/fixtures"
if command -v pkg-config >/dev/null 2>&1; then
 export PKG_CONFIG_PATH="$prefix_dir/lib/pkgconfig"
 # All flags come from our local package metadata and system libcurl metadata.
 cc "$package_dir/examples/consumer.c" $(pkg-config --cflags searchsdk-curl) -L"$prefix_dir/lib" -lsearchsdk_curl $(pkg-config --libs --static searchsdk) $(pkg-config --libs libcurl) -DSSK_HAS_CURL=1 -o "$work_dir/pkgconfig-consumer"
 "$work_dir/pkgconfig-consumer" "$package_dir/../../sdk-contract/fixtures"
fi

printf "Verified package: %s\n" "$archive"
