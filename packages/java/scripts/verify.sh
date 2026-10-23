#!/usr/bin/env bash
set -euo pipefail
package_root=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
repository_root=$(cd "$package_root/../.." && pwd)
cd "$package_root"
python3 -B scripts/generate-native.py --check
javac -version
mkdir -p target
build_dir=$(mktemp -d "$package_root/target/verify.XXXXXX")
trap 'rm -rf -- "$build_dir"' EXIT
mkdir -p "$build_dir/classes" "$build_dir/tests" "$build_dir/consumer" "$build_dir/classes/META-INF"
printf '%s\n' src/main/java/dev/searchsdk/*.java > "$build_dir/sources"
javac -J-XX:ActiveProcessorCount=2 -J-Xmx768m --release 17 -Xlint:all -Werror -d "$build_dir/classes" @"$build_dir/sources"
cp -R src/main/resources/. "$build_dir/classes/"
cp LICENSE NOTICE.md "$build_dir/classes/META-INF/"
printf '%s\n' src/test/java/dev/searchsdk/*.java > "$build_dir/test-sources"
javac -J-XX:ActiveProcessorCount=2 -J-Xmx768m --release 17 --add-modules jdk.httpserver -Xlint:all -Werror -cp "$build_dir/classes" -d "$build_dir/tests" @"$build_dir/test-sources"
java -XX:ActiveProcessorCount=2 --add-modules jdk.httpserver -cp "$build_dir/classes:$build_dir/tests" dev.searchsdk.SdkTest "$repository_root"
printf 'Manifest-Version: 1.0\nAutomatic-Module-Name: dev.searchsdk\n\n' > "$build_dir/MANIFEST.MF"
jar --create --file target/search-sdk-0.1.0-alpha.0.jar --manifest "$build_dir/MANIFEST.MF" -C "$build_dir/classes" .
javac -J-XX:ActiveProcessorCount=2 -J-Xmx768m --release 17 -Xlint:all -Werror -cp target/search-sdk-0.1.0-alpha.0.jar -d "$build_dir/consumer" examples/Consumer.java
java -XX:ActiveProcessorCount=2 -cp "target/search-sdk-0.1.0-alpha.0.jar:$build_dir/consumer" Consumer
java -XX:ActiveProcessorCount=2 --module-path target/search-sdk-0.1.0-alpha.0.jar --add-modules dev.searchsdk -cp "$build_dir/consumer" Consumer
jar --create --file target/search-sdk-0.1.0-alpha.0-sources.jar -C src/main/java . -C src/main/resources . -C "$build_dir/classes" META-INF/LICENSE -C "$build_dir/classes" META-INF/NOTICE.md
python3 -B scripts/normalize-jar.py target/search-sdk-0.1.0-alpha.0.jar target/search-sdk-0.1.0-alpha.0-sources.jar
printf 'Java artifact verification complete.\n'
