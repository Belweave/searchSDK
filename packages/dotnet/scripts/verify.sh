#!/usr/bin/env bash
# From any directory. Uses only local SDK/framework packs and the packed local NuGet feed.
set -euo pipefail
package_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
repo_dir="$(cd "$package_dir/../.." && pwd)"
if [[ -n "${DOTNET:-}" ]]; then dotnet_bin="$DOTNET";
elif command -v dotnet >/dev/null 2>&1; then dotnet_bin="$(command -v dotnet)";
else dotnet_bin="$repo_dir/.local/toolchains/dotnet/dotnet"; fi
export DOTNET_CLI_HOME="$package_dir/.local/cli"
export NUGET_PACKAGES="$package_dir/.local/nuget"
export DOTNET_CLI_TELEMETRY_OPTOUT=1 DOTNET_NOLOGO=1 DOTNET_SKIP_FIRST_TIME_EXPERIENCE=1
export DOTNET_CLI_WORKLOAD_UPDATE_NOTIFY_DISABLE=true
mkdir -p "$package_dir/.local"
"$dotnet_bin" --version
python3 -B "$package_dir/scripts/generate.py" --check
"$dotnet_bin" restore "$package_dir/tests/SearchSdk.Tests.csproj" --locked-mode --configfile "$package_dir/NuGet.Config" /m:2
"$dotnet_bin" build "$package_dir/tests/SearchSdk.Tests.csproj" -c Release --no-restore /m:2
"$dotnet_bin" run --project "$package_dir/tests/SearchSdk.Tests.csproj" -c Release --no-build --no-restore
verify_dir="$(mktemp -d "$package_dir/.local/verify.XXXXXX")"
mkdir -p "$verify_dir/feed" "$verify_dir/consumer" "$verify_dir/packages"
"$dotnet_bin" pack "$package_dir/src/SearchSdk/SearchSdk.csproj" -c Release --no-build --no-restore -o "$verify_dir/feed" /m:2
python3 - "$verify_dir/feed" <<'PY'
import pathlib,zipfile,sys,xml.etree.ElementTree as ET
p=next(pathlib.Path(sys.argv[1]).glob('*.nupkg'))
with zipfile.ZipFile(p)as z:
 for n in ['LICENSE','README.md','SOURCES.md','native-manifest.json','lib/net10.0/SearchSdk.dll','lib/net10.0/SearchSdk.xml']:assert n in z.namelist(),n
 doc=ET.fromstring(z.read('SearchSdk.nuspec')); elements=list(doc.iter())
 assert next(x for x in elements if x.tag.split('}')[-1]=='license').attrib['type']=='file'
 assert not any(x.tag.split('}')[-1]=='dependency'for x in elements),'No runtime NuGet dependencies'
print('NuGet metadata, license, README, XML docs, and zero dependencies verified.')
PY
cp "$package_dir/examples/Consumer/Consumer.csproj" "$package_dir/examples/Consumer/Program.cs" "$verify_dir/consumer/"
# Each run creates a fresh package cache and consumer; no preinstalled package or project reference.
# This first restore creates the fresh consumer's content-hash lock from this exact local artifact.
"$dotnet_bin" restore "$verify_dir/consumer/Consumer.csproj" --source "$verify_dir/feed" --packages "$verify_dir/packages" /m:2
"$dotnet_bin" restore "$verify_dir/consumer/Consumer.csproj" --locked-mode --source "$verify_dir/feed" --packages "$verify_dir/packages" /m:2
python3 - "$verify_dir/consumer/obj/project.assets.json" "$verify_dir/packages" <<'PY2'
import json,pathlib,sys
assets=json.load(open(sys.argv[1]));package=assets['libraries']['SearchSdk/0.1.0-alpha.1']
assert package['type']=='package','Consumer resolved a project reference'
assert str(pathlib.Path(sys.argv[2])) in assets['packageFolders'],'Consumer did not use its isolated cache'
print('Consumer asset graph resolves the packed NuGet package from the fresh isolated cache.')
PY2
"$dotnet_bin" build "$verify_dir/consumer/Consumer.csproj" -c Release --no-restore /m:2
"$dotnet_bin" run --project "$verify_dir/consumer/Consumer.csproj" -c Release --no-build --no-restore
printf 'Verified package artifacts: %s\n' "$verify_dir"
