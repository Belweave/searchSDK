#!/usr/bin/env python3
"""Exercise the boot wait's process-exit and hung-ADB failure paths offline."""
import importlib.util
from pathlib import Path
import subprocess
import sys
import tempfile
import time
import unittest

spec = importlib.util.spec_from_file_location("boot_android", Path(__file__).with_name("boot-android-ci.py"))
boot = importlib.util.module_from_spec(spec)
spec.loader.exec_module(boot)


class BootWaitTest(unittest.TestCase):
    def test_process_exit_is_reported_without_waiting_for_adb(self):
        process = subprocess.Popen([sys.executable, "-c", "raise SystemExit(23)"])
        process.wait(timeout=5)
        with self.assertRaisesRegex(RuntimeError, "status 23"):
            boot.wait_for_boot(process, "/missing/adb", timeout_seconds=1)

    def exercise_adb(self, script, success):
        with tempfile.TemporaryDirectory() as directory:
            adb = Path(directory) / "adb"
            adb.write_text(f"#!{sys.executable}\n" + script)
            adb.chmod(0o755)
            process = subprocess.Popen([sys.executable, "-c", "import time; time.sleep(30)"])
            try:
                started = time.monotonic()
                if success:
                    boot.wait_for_boot(process, adb, timeout_seconds=1)
                else:
                    with self.assertRaises(TimeoutError):
                        boot.wait_for_boot(process, adb, timeout_seconds=0.2)
                self.assertLess(time.monotonic() - started, 3)
            finally:
                process.terminate()
                process.wait(timeout=5)

    def test_hung_adb_is_bounded(self):
        self.exercise_adb("import time; time.sleep(30)\n", False)

    def test_boot_property_is_required(self):
        self.exercise_adb("print('0')\n", False)

    def test_booted_device_passes(self):
        self.exercise_adb("print('1')\n", True)


if __name__ == "__main__":
    unittest.main()
