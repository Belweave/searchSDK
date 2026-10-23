#!/usr/bin/env python3
"""Build a deterministic, self-contained SPM source archive without build products."""
import argparse
import gzip
from pathlib import Path
import tarfile

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--output', type=Path)
args = parser.parse_args()
package = Path(__file__).resolve().parents[1]
version = (package / 'VERSION').read_text().strip()
output = args.output or package / '.build' / 'distributions' / f'SearchSDK-{version}.tar.gz'
output.parent.mkdir(parents=True, exist_ok=True)
files = [package / name for name in ('Package.swift', 'VERSION', 'LICENSE', 'README.md', '.gitignore')]
for directory in ('Sources', 'Tests', 'Examples', 'Scripts'):
    files.extend(p for p in (package / directory).rglob('*') if p.is_file()
                 and not any(part in ('.build', '.swiftpm', '__pycache__') for part in p.relative_to(package).parts)
                 and p.name not in ('Package.resolved', '.DS_Store'))
with output.open('wb') as raw, gzip.GzipFile(fileobj=raw, filename='', mode='wb', mtime=0, compresslevel=9) as compressed:
    with tarfile.open(fileobj=compressed, mode='w') as archive:
        for path in sorted(files):
            info = archive.gettarinfo(str(path), arcname=str(Path('SearchSDK') / path.relative_to(package)))
            info.uid = info.gid = 0
            info.uname = info.gname = ''
            info.mtime = 0
            info.mode = 0o644
            with path.open('rb') as source:
                archive.addfile(info, source)
print(output)
