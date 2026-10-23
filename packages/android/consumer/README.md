This independent Android module resolves `dev.searchsdk:searchsdk-android:0.1.0-alpha.1`
from `../build/repository`, produced by the package's local Maven publication task.
It does not depend on SDK project sources. `SearchExample.kt` demonstrates the
application gateway API; its endpoint and short-lived application token are supplied
by the app. The deterministic consumer test uses the shared success fixture and
exercises the installed AAR's search, batch, token callback and cancellation APIs.

From `packages/android`, after publishing to the verification repository:

```sh
./gradlew -p consumer testReleaseUnitTest assembleRelease --no-daemon --max-workers=2
```

This compiles an Android consumer and executes local JVM tests. It does not launch
an emulator, install an APK, or contact a search provider.

The separate device check uses the installed AAR's production HTTPS transport:

```sh
python3 -B scripts/verify-device.py --serial emulator-5554
```

Run it from `packages/android` with an already booted test device and its explicit
`adb` serial. It installs an instrumentation APK, uses a temporary local TLS
fixture, and checks search/batch, redirects, decoded limits, deadlines, and socket
cancellation. Test trust configuration exists only in the instrumentation APK.
