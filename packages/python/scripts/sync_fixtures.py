#!/usr/bin/env python3
"""Copy shared conformance fixtures into sdists; --check detects divergence."""

import argparse
from pathlib import Path

package = Path(__file__).resolve().parents[1]
root = package.parents[1]
parser = argparse.ArgumentParser()
parser.add_argument("--check", action="store_true")
args = parser.parse_args()
for name in ("request-cases.json", "search-success.json", "search-errors.json", "providers.json"):
    source = root / "sdk-contract/fixtures" / name
    target = package / "tests/fixtures" / name
    content = source.read_bytes()
    if args.check:
        if not target.exists() or target.read_bytes() != content:
            raise SystemExit("Stale shared Python fixture: " + name)
    else:
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(content)
print("Shared Python fixtures " + ("verified" if args.check else "copied"))
