"""The Python check: embedded-registry drift, mypy --strict, then every test.

Run from sdk/python with the dev requirements installed:
    python -m pip install -r requirements-dev.txt
    python scripts/check.py
Tests use synthetic vectors and an injected transport only; a guard fails
any non-loopback network use.
"""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def run(*args: str) -> None:
    env = dict(os.environ, PYTHONPATH=os.pathsep.join(filter(None, [str(ROOT / "src"), os.environ.get("PYTHONPATH")])))
    print("$", " ".join(args), flush=True)
    if subprocess.run(args, cwd=ROOT, env=env).returncode:
        raise SystemExit(1)


if __name__ == "__main__":
    run(sys.executable, "scripts/sync_registry.py", "--check")
    run(sys.executable, "-m", "mypy")
    run(sys.executable, "-W", "error::ResourceWarning", "-m", "unittest", "discover", "-s", "tests", "-t", ".")
