#!/usr/bin/env python3
"""Build wheel/sdist and test isolated consumers. Requires build/setuptools/wheel.

No provider calls or runtime dependency downloads. Uses the invoking Python.
All temporary environments, logs, artifacts and extraction stay under .build.
"""

from __future__ import annotations
import os
from pathlib import Path
import subprocess
import shutil
import sys
import tarfile
import venv
import zipfile

PACKAGE = Path(__file__).resolve().parents[1]
STORAGE = PACKAGE / ".build/package-verification"


def run(*args: str, cwd: Path = PACKAGE) -> None:
    env = dict(os.environ)
    env.pop("PYTHONPATH", None)
    env["PYTHONDONTWRITEBYTECODE"] = "1"
    subprocess.run(args, cwd=cwd, env=env, check=True)


def consumer(wheel: Path, name: str) -> None:
    home = STORAGE / name
    venv.EnvBuilder(with_pip=True, clear=True).create(home)
    python = home / ("Scripts/python.exe" if os.name == "nt" else "bin/python")
    run(
        str(python),
        "-m",
        "pip",
        "--disable-pip-version-check",
        "install",
        "--no-index",
        "--no-deps",
        str(wheel),
    )
    run(
        str(python),
        "-I",
        "-c",
        "import searchsdk,sys,importlib.metadata; assert sys.prefix in searchsdk.__file__; assert not importlib.metadata.requires('searchsdk'); print(searchsdk.__version__)",
    )
    run(str(python), "-I", str(PACKAGE / "examples/offline_consumer.py"))
    # Exercise the complete deterministic test suite against the installed artifact.
    run(str(python), "-I", "-m", "unittest", "discover", "-s", str(PACKAGE / "tests"), "-q")


def main() -> None:
    STORAGE.mkdir(parents=True, exist_ok=True)
    output = STORAGE / "dist"
    output.mkdir(exist_ok=True)
    for artifact in [*output.glob("*.whl"), *output.glob("*.tar.gz")]:
        artifact.unlink()
    run(
        sys.executable,
        "-m",
        "build",
        "--no-isolation",
        "--sdist",
        "--wheel",
        "--outdir",
        str(output),
        str(PACKAGE),
    )
    wheel = next(output.glob("*.whl"))
    sdist = next(output.glob("*.tar.gz"))
    with zipfile.ZipFile(wheel) as archive:
        names = archive.namelist()
        assert "searchsdk/py.typed" in names
        assert "searchsdk/catalog.json" in names
        assert any(n.endswith("/licenses/LICENSE") for n in names)
        assert all(".build/" not in n and "__pycache__" not in n for n in names)
    consumer(wheel, "wheel-consumer")
    source = STORAGE / "sdist-source"
    if source.exists():
        shutil.rmtree(source)
    source.mkdir()
    with tarfile.open(sdist) as archive:
        for member in archive.getmembers():
            target = (source / member.name).resolve()
            if not target.is_relative_to(source.resolve()) or member.issym() or member.islnk():
                raise RuntimeError("Unsafe sdist member")
        archive.extractall(source, filter="data")
    unpacked = next(p for p in source.iterdir() if p.is_dir())
    rebuilt = STORAGE / "sdist-wheel"
    rebuilt.mkdir(exist_ok=True)
    for artifact in rebuilt.glob("*.whl"):
        artifact.unlink()
    run(
        sys.executable,
        "-m",
        "build",
        "--no-isolation",
        "--wheel",
        "--outdir",
        str(rebuilt),
        str(unpacked),
    )
    consumer(next(rebuilt.glob("*.whl")), "sdist-consumer")
    print("Wheel, sdist rebuild, and both isolated installed consumers passed.")


if __name__ == "__main__":
    main()
