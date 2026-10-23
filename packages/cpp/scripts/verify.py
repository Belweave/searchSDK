#!/usr/bin/env python3
"""Bounded local build, contract tests, install, archive, and independent consumers."""
import argparse
import os
import pathlib
import shlex
import shutil
import subprocess
import tarfile

PACKAGE=pathlib.Path(__file__).resolve().parents[1]
ROOT=PACKAGE.parents[1]


def run(*args, cwd=ROOT, env=None):
    print('+ '+' '.join(str(arg) for arg in args),flush=True)
    subprocess.run([str(arg) for arg in args],cwd=cwd,env=env,check=True)


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--sanitizers',action='store_true')
    parser.add_argument('--curl',action='store_true')
    parser.add_argument('--libdir',default='lib',help='Relative install library directory; also tests multiarch layouts')
    args=parser.parse_args()
    if pathlib.Path(args.libdir).is_absolute() or '..' in pathlib.Path(args.libdir).parts:
        parser.error('--libdir must be a relative directory without parent traversal')
    name='asan' if args.sanitizers else 'curl' if args.curl else 'verify'
    if args.libdir!='lib':
        name+='-multiarch'
    storage=ROOT/'.local/cpp'/name
    storage.mkdir(parents=True,exist_ok=True)
    if (PACKAGE/'LICENSE').read_bytes()!=(ROOT/'LICENSE').read_bytes():
        raise RuntimeError('Package LICENSE differs from root')
    build=storage/'build'
    prefix=storage/'prefix'
    run('python3','-B',PACKAGE/'scripts/generate.py','--check')
    run('cmake','-S',PACKAGE,'-B',build,'-DCMAKE_BUILD_TYPE=Debug',
        f'-DCMAKE_INSTALL_PREFIX={prefix}',
        f'-DCMAKE_INSTALL_LIBDIR={args.libdir}',
        '-DSEARCHSDK_CPP_CURL='+('ON' if args.curl else 'OFF'),
        '-DSEARCHSDK_CPP_SANITIZERS='+('ON' if args.sanitizers else 'OFF'))
    run('cmake','--build',build,'--parallel','2')
    run('ctest','--test-dir',build,'--output-on-failure')
    run('cmake','--install',build)
    run('cpack','--config',build/'CPackConfig.cmake','-B',storage)
    archives=list(storage.glob('searchsdk-cpp-0.1.0-alpha.1-*.tar.gz'))
    if len(archives)!=1:
        raise RuntimeError('Expected exactly one C++ binary archive')
    unpack=storage/'unpacked'
    unpack.mkdir(exist_ok=True)
    with tarfile.open(archives[0]) as archive:
        # All paths must remain within the isolated destination.
        for entry in archive.getmembers():
            if entry.issym() or entry.islnk():
                continue # CMake shared-library symlinks are relative; tar filter validates them.
            if not (unpack/entry.name).resolve().is_relative_to(unpack.resolve()):
                raise RuntimeError('Unsafe archive path')
        archive.extractall(unpack,filter='data')
    # CPack uses system-specific root names; find the actual installed config.
    configs=list(unpack.rglob('searchsdk_cppConfig.cmake'))
    if len(configs)!=1:
        raise RuntimeError('Expected one installed C++ config in archive')
    archive_roots=[path for path in unpack.iterdir() if path.is_dir()]
    if len(archive_roots)!=1 or not configs[0].is_relative_to(archive_roots[0]):
        raise RuntimeError('Expected one archive installation root')
    archive_prefix=archive_roots[0]
    run('cmake','-S',PACKAGE/'examples','-B',storage/'consumer',
        f'-DCMAKE_PREFIX_PATH={archive_prefix};{archive_prefix/args.libdir/"cmake"}',
        '-DCMAKE_BUILD_TYPE=Debug')
    run('cmake','--build',storage/'consumer','--parallel','2')
    run('ctest','--test-dir',storage/'consumer','--output-on-failure')
    # Check relocatable metadata using the extracted archive, including nested libdirs.
    # Sanitizer flags are conveyed by CMake targets; pkg-config describes release linkage.
    if not args.sanitizers and shutil.which('pkg-config'):
        env=dict(os.environ,PKG_CONFIG_PATH=str(archive_prefix/args.libdir/'pkgconfig'))
        flags=shlex.split(subprocess.check_output(
            ['pkg-config','--cflags','--libs','--static','searchsdk-cpp'],env=env,text=True))
        compiler=shlex.split(os.environ.get('CXX','c++'))
        run(*compiler,'-std=c++17',PACKAGE/'examples/consumer.cpp',*flags,
            '-o',storage/'pkgconfig-consumer')
        run(storage/'pkgconfig-consumer')
    # Build the facade a second way: find only the installed sibling C target.
    installed_build=storage/'installed-c-build'
    run('cmake','-S',PACKAGE,'-B',installed_build,'-DSEARCHSDK_CPP_USE_INSTALLED_C=ON',
        '-DSEARCHSDK_CPP_BUILD_TESTS=OFF',f'-DCMAKE_PREFIX_PATH={prefix};{prefix/args.libdir/"cmake"}',
        '-DSEARCHSDK_CPP_CURL='+('ON' if args.curl else 'OFF'),
        '-DSEARCHSDK_CPP_SANITIZERS='+('ON' if args.sanitizers else 'OFF'))
    run('cmake','--build',installed_build,'--parallel','2')
    print('C++ source composition, installed-C composition, archive consumer, and tests passed.',flush=True)


if __name__=='__main__':
    main()
