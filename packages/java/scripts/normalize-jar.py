#!/usr/bin/env python3
"""Normalize JAR timestamps without relying on jar --date (unavailable on JDK 17)."""
import pathlib, sys, zipfile
for argument in sys.argv[1:]:
    path=pathlib.Path(argument);temporary=path.with_suffix(path.suffix+'.normalized')
    with zipfile.ZipFile(path)as source,zipfile.ZipFile(temporary,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=9)as target:
        order=sorted(source.namelist(),key=lambda name:(0 if name=='META-INF/' else 1 if name=='META-INF/MANIFEST.MF' else 2,name))
        for name in order:
            info=zipfile.ZipInfo(name,(2026,10,22,0,0,0));info.create_system=3
            info.external_attr=(0o40755 if name.endswith('/')else 0o100644)<<16
            info.compress_type=zipfile.ZIP_DEFLATED
            target.writestr(info,source.read(name))
    temporary.replace(path)
