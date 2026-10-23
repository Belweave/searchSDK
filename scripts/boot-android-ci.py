#!/usr/bin/env python3
"""Boot the CI-only Android emulator with bounded ADB calls and visible logs."""
import os
from pathlib import Path
import signal
import subprocess
import time


def wait_for_boot(process, adb, timeout_seconds=300):
    deadline = time.monotonic() + timeout_seconds
    while time.monotonic() < deadline:
        if process.poll() is not None:
            raise RuntimeError(f"Android emulator exited before boot (status {process.returncode})")
        try:
            remaining = max(0.01, deadline - time.monotonic())
            result = subprocess.run(
                [str(adb), "-s", "emulator-5554", "shell", "getprop", "sys.boot_completed"],
                capture_output=True, text=True, timeout=min(5, remaining), check=False)
            if result.returncode == 0 and result.stdout.strip() == "1":
                return
        except subprocess.TimeoutExpired:
            pass
        remaining = deadline - time.monotonic()
        if remaining > 0:
            time.sleep(min(2, remaining))
    raise TimeoutError(f"Android emulator did not boot within {timeout_seconds} seconds")


def main():
    sdk = Path(os.environ["ANDROID_HOME"])
    emulator = sdk / "emulator/emulator"
    adb = sdk / "platform-tools/adb"
    scratch = Path(".local")
    scratch.mkdir(exist_ok=True)
    # avdmanager and emulator versions can choose different default config roots.
    # Give both the same absolute paths without changing the runner's HOME.
    android_user = (scratch / "android-user").resolve()
    avd_home = android_user / "avd"
    avd_home.mkdir(parents=True, exist_ok=True)
    os.environ.update(ANDROID_USER_HOME=str(android_user),
                      ANDROID_EMULATOR_HOME=str(android_user), ANDROID_AVD_HOME=str(avd_home))
    log = scratch / "android-emulator.log"
    process = None
    try:
        # Detect missing host libraries before spawning a background process.
        subprocess.run([str(emulator), "-version"], check=True, timeout=30)
        subprocess.run(["avdmanager", "create", "avd", "--force", "--name", "searchsdk-ci",
                        "--path", str(avd_home / "searchsdk-ci.avd"),
                        "--package", "system-images;android-36;google_apis;x86_64"],
                       input="no\n", text=True, check=True, timeout=30)
        listed = subprocess.run([str(emulator), "-list-avds"], capture_output=True,
                                text=True, check=True, timeout=15)
        if "searchsdk-ci" not in listed.stdout.splitlines():
            raise RuntimeError(f"AVD registration missing from {avd_home}: {listed.stdout} {listed.stderr}")
        subprocess.run([str(adb), "start-server"], check=True, timeout=15)
        with log.open("w") as output:
            process = subprocess.Popen(
                [str(emulator), "-avd", "searchsdk-ci", "-port", "5554", "-no-window",
                 "-no-audio", "-no-boot-anim", "-no-snapshot", "-gpu", "swiftshader",
                 "-memory", "2048", "-cores", "2"],
                stdout=output, stderr=subprocess.STDOUT, start_new_session=True)
        wait_for_boot(process, adb)
        print("Android emulator booted; HTTPS instrumentation must still pass.", flush=True)
    except Exception:
        if process is not None and process.poll() is None:
            os.killpg(process.pid, signal.SIGTERM)
            try:
                process.wait(timeout=10)
            except subprocess.TimeoutExpired:
                os.killpg(process.pid, signal.SIGKILL)
                process.wait(timeout=5)
        raise
    finally:
        if log.exists():
            print("::group::Android emulator startup log", flush=True)
            print("\n".join(log.read_text(errors="replace").splitlines()[-200:]), flush=True)
            print("::endgroup::", flush=True)


if __name__ == "__main__":
    main()
