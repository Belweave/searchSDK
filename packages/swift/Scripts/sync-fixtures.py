#!/usr/bin/env python3
"""Copy retained protocol fixtures; --check fails if package copies drift. No network."""
import argparse
from pathlib import Path
import sys

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--check', action='store_true')
args = parser.parse_args()
package = Path(__file__).resolve().parents[1]
source = package.parents[1] / 'sdk-contract' / 'fixtures'
target = package / 'Tests' / 'SearchSDKTests' / 'Fixtures'
names = ('request-cases.json', 'search-success.json', 'search-errors.json')
for name in names:
    original = source / name
    copied = target / name
    if not original.is_file():
        sys.exit(f'Missing retained contract fixture: {name}; run this check in the repository.')
    if args.check:
        if not copied.is_file() or copied.read_bytes() != original.read_bytes():
            sys.exit(f'Fixture differs: {name}; run Scripts/sync-fixtures.py')
    else:
        copied.write_bytes(original.read_bytes())
print('Shared protocol fixtures match.' if args.check else 'Shared protocol fixtures copied.')
