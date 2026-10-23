#!/usr/bin/env python3
"""Build a real Go module proxy zip, then consume it without a replace directive.
No tags, commits, releases, repository installs or network access are performed.
"""
import hashlib, json, os, pathlib, shutil, subprocess, zipfile
ROOT=pathlib.Path(__file__).resolve().parents[1]
WORK=ROOT/'.local/consumer-verification'
MODULE='github.com/Belweave/searchSDK/packages/go'
VERSION='v0.0.0-alpha.0'
ESCAPED=''.join('!'+c.lower() if c.isupper() else c for c in MODULE)
PROXY=WORK/'proxy'
ARTIFACT=PROXY/ESCAPED/'@v'
ARTIFACT.mkdir(parents=True,exist_ok=True)
(ARTIFACT/(VERSION+'.mod')).write_bytes((ROOT/'go.mod').read_bytes())
(ARTIFACT/(VERSION+'.info')).write_text(json.dumps({'Version':VERSION,'Time':'2026-10-22T00:00:00Z'}))
(ARTIFACT/'list').write_text(VERSION+'\n')
with zipfile.ZipFile(ARTIFACT/(VERSION+'.zip'),'w',zipfile.ZIP_DEFLATED) as z:
    files=[]
    for directory,dirs,names in os.walk(ROOT):
        dirs[:]=sorted(d for d in dirs if d!='.local' and d!='__pycache__')
        files.extend(pathlib.Path(directory)/name for name in names)
    for p in sorted(files):
        if not p.is_file():continue
        rel=p.relative_to(ROOT)
        info=zipfile.ZipInfo(MODULE+'@'+VERSION+'/'+rel.as_posix(),(2026,10,22,0,0,0))
        info.compress_type=zipfile.ZIP_DEFLATED
        z.writestr(info,p.read_bytes())
digest=hashlib.sha256((ARTIFACT/(VERSION+'.zip')).read_bytes()).hexdigest()[:20]
RUN=WORK/'runs'/digest
CONSUMER=RUN/'consumer'
CONSUMER.mkdir(parents=True,exist_ok=True)
(CONSUMER/'go.mod').write_text('module searchsdk-consumer\n\ngo 1.23.0\n\nrequire '+MODULE+' '+VERSION+'\n')
shutil.copyfile(ROOT/'examples/fixture/main.go',CONSUMER/'main.go')
(CONSUMER/'consumer_test.go').write_text('''package main
import (
 "context"
 "net/http"
 "net/http/httptest"
 "testing"
 sdk "github.com/Belweave/searchSDK/packages/go"
)
func TestInstalledGatewayAndGeneratedCatalog(t *testing.T) {
 server:=httptest.NewTLSServer(http.HandlerFunc(func(w http.ResponseWriter,r *http.Request){
  w.Header().Set("X-SearchSDK-Protocol","1")
  _,_=w.Write([]byte(`{"provider":"fixture","results":[],"usage":null,"warnings":[],"attempts":[]}`))
 }))
 defer server.Close()
 gateway,e:=sdk.NewGateway(server.URL+"/exact",sdk.HTTPOptions{Transport:server.Client().Transport})
 if e!=nil{t.Fatal(e)}
 if _,e=gateway.Search(context.Background(),sdk.Request{Query:"x"});e!=nil{t.Fatal(e)}
 count:=0
 for _,provider:=range sdk.NativeProviders(){
  c,e:=sdk.NewNativeClient(provider,sdk.NativeOptions{APIKey:"fixture-key"})
  if e!=nil{t.Fatal(e)}
  count+=len(c.Operations())
 }
 if count!=493{t.Fatal(count)}
}
''')
env=os.environ.copy()
(ROOT/'.local/tmp').mkdir(parents=True,exist_ok=True)
env.update(GOMAXPROCS='2',GOCACHE=str(ROOT/'.local/cache'),GOMODCACHE=str(RUN/'modcache'),GOTMPDIR=str(ROOT/'.local/tmp'),GOPROXY=PROXY.as_uri(),GOSUMDB='off',GOTOOLCHAIN='local',GONOSUMDB='*',GOPRIVATE='',GONOPROXY='')
for args in [
 ['go','mod','download',MODULE+'@'+VERSION],
 ['go','test','-mod=mod','-p','2','./...'],
 ['go','test','-mod=mod','-p','2',MODULE],
 ['go','run','-mod=mod','.'],
]:
 print('+ '+' '.join(args),flush=True)
 subprocess.run(args,cwd=CONSUMER,env=env,check=True)
info=json.loads(subprocess.check_output(['go','list','-m','-json',MODULE],cwd=CONSUMER,env=env))
if info.get('Replace') or not pathlib.Path(info['Dir']).is_relative_to(RUN/'modcache'):
 raise SystemExit('Consumer did not use the installed module zip')
print('Verified installed module:',info['Dir'])
print('Local artifact:',ARTIFACT/(VERSION+'.zip'))
