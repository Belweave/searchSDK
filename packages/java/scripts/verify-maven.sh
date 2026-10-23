#!/usr/bin/env bash
set -euo pipefail
package_root=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
cd "$package_root"
python3 -B scripts/generate-native.py --check
maven_command=${MAVEN:-mvn}
export MAVEN_OPTS="${MAVEN_OPTS:-} -XX:ActiveProcessorCount=2 -Xmx768m"
"$maven_command" -B -T 2 -Dmaven.repo.local="$package_root/.local/m2" clean install
"$maven_command" -B -T 2 -Dmaven.repo.local="$package_root/.local/m2" -f examples/maven-consumer/pom.xml verify
