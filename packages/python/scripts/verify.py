#!/usr/bin/env python3
"""Single offline verification entrypoint after installing requirements-dev.txt.

Run from any directory: python packages/python/scripts/verify.py
No provider calls, npm installation, publishing, or repository-external writes.
The invoking Python determines wheel/sdist consumer Python versions.
"""

from __future__ import annotations
import os
from pathlib import Path
import shlex
import subprocess
import sys

PACKAGE = Path(__file__).resolve().parents[1]
STORAGE = PACKAGE / ".build"


def run(*args: str, source: bool = False) -> None:
    env = dict(os.environ)
    env.pop("PYTHONPATH", None)
    env.pop("MYPYPATH", None)
    env["PYTHONDONTWRITEBYTECODE"] = "1"
    env["PIP_CACHE_DIR"] = str(STORAGE / "pip-cache")
    env["UV_CACHE_DIR"] = str(STORAGE / "uv-cache")
    if source:
        env["PYTHONPATH"] = str(PACKAGE / "src")
    print("+ " + shlex.join(args), flush=True)
    subprocess.run(args, cwd=PACKAGE, env=env, check=True)


def main() -> None:
    if sys.version_info < (3, 11):
        raise SystemExit("Python 3.11+ required")
    STORAGE.mkdir(exist_ok=True)
    python = sys.executable
    run(python, "-B", "scripts/generate_native.py", "--check")
    run(python, "-B", "scripts/sync_fixtures.py", "--check")
    run(python, "-m", "ruff", "check", "src/searchsdk", "tests", "examples", "scripts")
    run(python, "-m", "ruff", "format", "--check", "src/searchsdk", "tests", "examples", "scripts")
    run(
        python,
        "-m",
        "mypy",
        "--python-version",
        "3.11",
        "--cache-dir",
        ".build/mypy-cache",
        "--follow-imports=silent",
        "src/searchsdk",
    )
    run(python, "-B", "scripts/check_typing.py")
    run(python, "-B", "-m", "unittest", "discover", "-s", "tests", "-v", source=True)
    run(python, "-B", "scripts/verify_package.py")
    suffix = "Scripts/python.exe" if os.name == "nt" else "bin/python"
    for name in ("wheel-consumer", "sdist-consumer"):
        run(
            python,
            "-B",
            "scripts/check_typing.py",
            str(STORAGE / "package-verification" / name / suffix),
        )
    print(
        f"Python {sys.version.split()[0]} verification passed: generated inputs, lint, typing, tests, wheel and sdist consumers."
    )


if __name__ == "__main__":
    main()
