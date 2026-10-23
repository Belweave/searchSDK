#!/usr/bin/env python3
"""Package with Cargo's verification, then run an independent artifact consumer.

All output is restricted to this package's ignored .local directory. No provider
calls, publishing, installation into the workspace, or root manifest edits.
"""
import os, pathlib, subprocess, tarfile, json, shutil
PACKAGE=pathlib.Path(__file__).resolve().parents[1]
LOCAL=PACKAGE/'.local'
TARGET=LOCAL/'target'
env={**os.environ,'CARGO_BUILD_JOBS':'2','CARGO_TARGET_DIR':str(TARGET),'CARGO_PROFILE_DEV_DEBUG':'0','CARGO_INCREMENTAL':'0'}
def run(*args):subprocess.run(args,cwd=PACKAGE,env=env,check=True)
run('cargo','package','--allow-dirty','--locked','--manifest-path',str(PACKAGE/'Cargo.toml'))
artifact=TARGET/'package/searchsdk-0.1.0-alpha.1.crate'
consumer=LOCAL/'packaged-consumer';consumer.mkdir(parents=True,exist_ok=True)
extracted=consumer/'artifact';extracted.mkdir(exist_ok=True)
crate=extracted/'searchsdk-0.1.0-alpha.1'
if crate.exists():shutil.rmtree(crate)
with tarfile.open(artifact)as archive:archive.extractall(extracted,filter='data')
assert (crate/'src/native/generated.rs').exists()
assert not (crate/'.local').exists()
assert not (crate/'target').exists()
(consumer/'src').mkdir(exist_ok=True)
shutil.copyfile(PACKAGE/'examples/consumer.rs',consumer/'src/main.rs')
(consumer/'Cargo.toml').write_text('[package]\nname="searchsdk-packaged-consumer"\nversion="0.0.0"\nedition="2024"\n[workspace]\n[dependencies]\nsearchsdk={path="'+str(crate)+'"}\ntokio={version="=1.53.1",features=["rt","macros"]}\n')
run('cargo','generate-lockfile','--offline','--manifest-path',str(consumer/'Cargo.toml'))
run('cargo','run','--offline','--locked','--manifest-path',str(consumer/'Cargo.toml'))
metadata=subprocess.check_output(['cargo','metadata','--offline','--locked','--no-deps','--format-version','1','--manifest-path',str(consumer/'Cargo.toml')],cwd=PACKAGE,env=env,text=True)
resolved=next(p for p in json.loads(metadata)['packages']if p['name']=='searchsdk-packaged-consumer')
dependency=next(d for d in resolved['dependencies']if d['name']=='searchsdk')
assert dependency['source'] is None
assert pathlib.Path(dependency['path']).resolve()==crate.resolve()
print('Verified independent consumer resolves extracted artifact:',artifact)
