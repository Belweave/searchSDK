#!/usr/bin/env python3
"""Check real consumer typing, including expected negative diagnostics.

Requires mypy in the invoking environment. Optional first argument selects an
installed-consumer Python, proving wheel py.typed/type imports work without src.
"""

from pathlib import Path
import os
import subprocess
import sys

package = Path(__file__).resolve().parents[1]
storage = package / ".build/typing"
storage.mkdir(parents=True, exist_ok=True)
base = [
    sys.executable,
    "-m",
    "mypy",
    "--python-version",
    "3.11",
    "--cache-dir",
    str(storage / "cache"),
]
env = dict(os.environ)
if len(sys.argv) > 1:
    base += ["--python-executable", sys.argv[1]]
    env.pop("MYPYPATH", None)
else:
    env["MYPYPATH"] = str(package / "src")
subprocess.run([*base, str(package / "examples/typed_consumer.py")], env=env, check=True)
negative = storage / "negative.py"
negative.write_text(
    "from searchsdk import BraveClient, ExaClient, SerpapiClient\n"
    'BraveClient("fixture").search(query={"q": 7})\n'
    'ExaClient("fixture").search(body={"query": 7})\n'
    'SerpapiClient("fixture").search(query={"q": "missing engine"})\n'
)
result = subprocess.run([*base, str(negative)], env=env, capture_output=True, text=True)
if result.returncode != 1 or result.stdout.count("error:") != 3:
    raise SystemExit(
        "Expected three native consumer typing failures:\n" + result.stdout + result.stderr
    )
print("Typed consumer passed; all three invalid native requests rejected statically.")
