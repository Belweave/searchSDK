#!/usr/bin/env python3
"""Offline Go emitter using retained provider source models; never writes upstream.

The existing emitters are evaluated with an in-memory write overlay. Their
operation models (not generated TypeScript parsing) supply names and schemas.
All filesystem mutations are confined to this package, after capture completes.
"""
import contextlib, hashlib, io, json, pathlib, re, runpy, subprocess, sys, types
sys.dont_write_bytecode = True
HERE = pathlib.Path(__file__).resolve().parents[2]
ROOT = HERE.parents[1]
A = ROOT / 'scripts/providers-a'
B = ROOT / 'scripts/providers-b'
CHECK = '--check' in sys.argv
original_argv = sys.argv[:]
captured = []
virtual = {}
read_text, write_text = pathlib.Path.read_text, pathlib.Path.write_text

def overlay_read(p, *args, **kwargs):
    return virtual[str(p)] if str(p) in virtual else read_text(p, *args, **kwargs)
def overlay_write(p, data, *args, **kwargs):
    virtual[str(p)] = data
    return len(data)
def trace(frame, event, arg):
    if event == 'return' and frame.f_code.co_name == 'emit' and frame.f_code.co_filename == str(A/'generate.py'):
        g = frame.f_locals['self']
        for op in g.operations:
            spec = next(d for key, d, src in g.specs if key == op['key'])
            item = spec['paths'][op['path']]
            raw = item[op['verb'].lower()]
            def resolve(s):
                while isinstance(s, dict) and '$ref' in s:
                    cur = spec
                    for part in s['$ref'].lstrip('#/').split('/'):
                        cur = cur[part.replace('~1','/').replace('~0','~')]
                    s = cur
                return s
            raw = resolve(raw)
            params = [resolve(p) for p in item.get('parameters',[]) + raw.get('parameters',[])]
            schemas = []
            for status, r in raw.get('responses',{}).items():
                if str(status).startswith('2'):
                    for media, entry in resolve(r).get('content',{}).items():
                        if media == 'application/json' and entry.get('schema') not in schemas:
                            schemas.append(entry.get('schema',{}))
            response_schema = schemas[0] if len(schemas)==1 else {'oneOf':schemas} if schemas else {'type':'null'}
            comma = [k for k,s,req,p in op['query'] if p.get('explode') is False or g.provider=='context' and resolve(s).get('type')=='array']
            captured.append(dict(provider=g.provider,name=op['name'],base=op['base'],path=op['path'],method=op['verb'],response=op['mode'],source=op['source'],summary=op['summary'],body=op['body'],bodyRequired=op['bodyRequired'],raw=op['raw'],rawContentType='application/octet-stream' if op['raw'] else '',params=params,spec=spec,specKey=op['key'],responseSchema=response_schema,headers=op['headers'],comma=comma,stream=op['streamfield'],streamVariant=op['streamvalue'],retryable=op['verb']=='GET' and op['mode']!='sse'))
    if event == 'return' and frame.f_code.co_name == 'generate' and frame.f_code.co_filename == str(B/'generate.py'):
        for op in frame.f_locals['ops']:
            s=op['spec'];raw=s.j['paths'][op['path']][op['method'].lower()]
            rc={ct:v for status,r in raw.get('responses',{}).items() if str(status).startswith('2') for ct,v in s.resolve(r).get('content',{}).items()}
            schemas=[v.get('schema',{}) for ct,v in rc.items() if ct=='application/json' or ct in ['searchResults','sourcedAnswer','structured']]
            schema=schemas[0] if len(schemas)==1 else {'oneOf':schemas} if schemas else {'type':'null'}
            captured.append(dict(provider=frame.f_locals['provider'],name=op['name'],base=s.j['servers'][0]['url'].rstrip('/'),path=op['path'],method=op['method'],response=('empty' if frame.f_locals['provider']=='perplexity' and op['name']=='revokeAuthToken' else op['response']),source=op['source'],summary=op['summary'],body=op['body'],bodyRequired=op['bodyRequired'],raw=op['raw'],rawContentType=op['rawContentType'] if op['raw'] else '',params=op['params'],spec=s.j,specKey=s.prefix or frame.f_locals['provider'],responseSchema=schema,headers={},comma=[p['name'] for p in op['params'] if p.get('explode') is False],stream=op['stream'],streamVariant=op.get('streamVariant',False),retryable=op['method'] in ['GET','HEAD']))
    return trace

for path, fields in [(A,('artifact','artifactSha256')),(B,('file','sha256'))]:
    manifest=json.loads((path/'provenance.json').read_text())
    for source in manifest['sources']:
        file, digest=(source.get(k) for k in fields)
        if file and digest and hashlib.sha256((path/file).read_bytes()).hexdigest()!=digest:
            raise SystemExit('Snapshot digest mismatch: '+file)
try:
    # Upstream emitters always target the in-memory overlay; our own check mode
    # must not depend on the state of unrelated generated TypeScript files.
    sys.argv = [str(A/'generate.py')]
    pathlib.Path.read_text, pathlib.Path.write_text = overlay_read, overlay_write
    sys.settrace(trace)
    with contextlib.redirect_stdout(io.StringIO()):
        sys.path.insert(0,str(A))
        runpy.run_path(str(A/'generate.py'),run_name='__main__')
        sys.path.insert(0,str(B))
        namespace=runpy.run_path(str(B/'generate.py'),run_name='__main__')
        module=types.ModuleType('generate');module.__dict__.update(namespace);sys.modules['generate']=module
        runpy.run_path(str(B/'wonder.py'))
        runpy.run_path(str(B/'serper.py'))
finally:
    sys.settrace(None)
    sys.argv = original_argv
    pathlib.Path.read_text,pathlib.Path.write_text=read_text,write_text

# Supplemental operations are retained in attributed catalogs, not endpoint guesses.
for op in json.loads((A/'operations.json').read_text())['operations']:
    if op['name'] not in ['logoUrl','headLogo','getPaymentPricing','paidSearch']:
        continue
    provider=op['provider']
    inherited=next((e for e in captured if e['provider']=='tavily' and e['name']=='search'),None)
    base=dict(provider=provider,name=op['name'],base=op['base'],path=op['path'],method=op['verb'],response=op['mode'],source=op['source'],summary=op['summary'],body=None,bodyRequired=False,raw=False,rawContentType='',params=[],spec={},specKey='supplemental',responseSchema={},headers={},comma=[],stream=False,streamVariant=False,retryable=op['verb'] in ['GET','HEAD'])
    if op['name'] in ['logoUrl','headLogo']:
        base['params']=[dict(name=n,**{'in':'query'},required=n in ['publicClientId','domain'],schema={'type':'string',**({'enum':en} if en else {})}) for n,en in [('publicClientId',None),('domain',None),('theme',['light','dark']),('type',['icon','wordmark'])]]
    if op['name']=='paidSearch':
        base.update(body=inherited['body'],bodyRequired=True,spec=inherited['spec'],specKey=inherited['specKey'],responseSchema=inherited['responseSchema'])
    captured.append(base)

# SerpAPI is a hand-retained family catalog, including explicit engine aliases.
for op in json.loads((B/'catalogs/serpapi-operations.json').read_text()):
    name=op['name'];params=[]
    if '{search_id}' in op['path']:params.append(dict(name='search_id',**{'in':'path'},required=True,schema={'type':'string'}))
    if name in ['search','searchHtml','searchMarkdown','searchPixelPositions']:params.append(dict(name='engine',**{'in':'query'},required=True,schema={'type':'string'}))
    if name=='google':params.append(dict(name='q',**{'in':'query'},required=True,schema={'type':'string'}))
    if name in ['extract','extractMarkdown']:params.append(dict(name='url',**{'in':'query'},required=True,schema={'type':'string'}))
    captured.append(dict(provider='serpapi',name=name,base='https://serpapi.com',path=op['path'],method=op['method'],response=op['response'],source=op['source'],summary='Retained SerpAPI endpoint family',body=None,bodyRequired=False,raw=name=='uploadImage',rawContentType='multipart/form-data' if name=='uploadImage' else '',params=params,spec={},specKey='serpapi',responseSchema={'type':'object','additionalProperties':True},headers={},comma=[],stream=False,streamVariant=False,retryable=name in ['getSearch','getSearchHtml','locations','account']))

expected={}
for op in json.loads((A/'operations.json').read_text())['operations']:
    expected[(op['provider'],op['name'])]=op
for p in sorted((B/'catalogs').glob('*-operations.json')):
    for op in json.loads(p.read_text()):expected[(p.name.removesuffix('-operations.json'),op['name'])]=op
actual={(e['provider'],e['name']):e for e in captured}
if set(expected)!=set(actual) or len(captured)!=493:
    raise SystemExit(f'Catalog mismatch: {len(captured)}; missing {set(expected)-set(actual)}; extra {set(actual)-set(expected)}')

def pas(s):
    s=re.sub(r'[^A-Za-z0-9]+',' ',s)
    out=''.join(w[:1].upper()+w[1:] for w in s.split()) or 'Value'
    return ('N'+out) if out[0].isdigit() else out

def lit(v):return json.dumps(v,ensure_ascii=True,separators=(',',':'))

outputs={}
for provider in sorted({e['provider'] for e in captured}):
    ops=[e for e in captured if e['provider']==provider]
    prefix={'wondersearch':'WonderSearch','serpapi':'SerpAPI','tinyfish':'TinyFish'}.get(provider,pas(provider))
    lines=['// Code generated by internal/generate/generate.py; DO NOT EDIT.', '// Native wire types are transport assertions, not JSON Schema validation.', 'package searchsdk', 'import ("context"; "encoding/json"; "net/http")', 'var _ json.RawMessage', 'var _ http.Header']
    definitions={};queue=[];schema_refs={}
    def refname(spec,key,ref):
        rk=(id(spec),ref)
        if rk not in schema_refs:
            name=prefix+'Schema'+pas(key)+pas(ref.split('/')[-1]);base=name;i=2
            while name in definitions:name=base+str(i);i+=1
            cur=spec
            for part in ref.lstrip('#/').split('/'):cur=cur[part.replace('~1','/').replace('~0','~')]
            schema_refs[rk]=name;definitions[name]=None;queue.append((name,cur,spec,key))
        return schema_refs[rk]
    def resolve(s,spec):
        seen=set()
        while isinstance(s,dict) and '$ref' in s:
            if s['$ref'] in seen:return {}
            seen.add(s['$ref']);v=spec
            for p in s['$ref'].lstrip('#/').split('/'):v=v[p.replace('~1','/').replace('~0','~')]
            s=v
        return s
    def typ(s,spec,key,depth=0):
        if not isinstance(s,dict):return 'json.RawMessage'
        if '$ref' in s:return refname(spec,key,s['$ref'])
        if 'allOf' in s:
            merged={k:v for k,v in s.items() if k!='allOf'};props=dict(s.get('properties',{}));req=list(s.get('required',[]))
            for x in s['allOf']:
                x=resolve(x,spec)
                if x.get('oneOf') or x.get('anyOf') or x.get('allOf'):return 'json.RawMessage'
                props.update(x.get('properties',{}));req+=x.get('required',[])
            merged.update(type='object',properties=props,required=req)
            return typ(merged,spec,key,depth)
        if 'oneOf' in s or 'anyOf' in s:return 'json.RawMessage'
        t=s.get('type')
        if isinstance(t,list):
            ts=[x for x in t if x!='null']
            return typ({**s,'type':ts[0]},spec,key,depth) if len(ts)==1 else 'json.RawMessage'
        if 'const' in s:t='boolean' if isinstance(s['const'],bool) else 'number' if isinstance(s['const'],(int,float)) else 'string'
        if s.get('enum') and not t:
            vs=[v for v in s['enum'] if v is not None]
            t='string' if all(isinstance(v,str) for v in vs) else 'number' if all(isinstance(v,(int,float)) for v in vs) else None
        if t=='array':return '[]'+typ(s.get('items',{}),spec,key,depth+1)
        if t=='object' or 'properties' in s:
            props=s.get('properties',{})
            if not props:
                ap=s.get('additionalProperties');return 'map[string]'+typ(ap,spec,key,depth+1) if isinstance(ap,dict) else 'map[string]json.RawMessage'
            fields=[];used=set()
            for k,v in props.items():
                n=pas(k)
                while n in used:n+='Field'
                used.add(n);gt=typ(v,spec,key,depth+1)
                optional=k not in s.get('required',[]) or isinstance(v,dict) and v.get('nullable')
                # Pointers preserve explicit false/zero and break recursive object refs.
                if (optional or isinstance(v,dict) and '$ref' in v) and not gt.startswith(('[]','map[','*')) and gt!='json.RawMessage':gt='*'+gt
                tag=k+(',omitempty' if optional else '')
                desc=re.sub(r'\s+',' ',v.get('description','') if isinstance(v,dict) else '').replace('*/','* /')[:240]
                if desc:fields.append('// '+desc)
                fields.append(n+' '+gt+' `json:'+lit(tag)+'`')
            return 'struct {\n'+'\n'.join(fields)+'\n}'
        return {'string':'string','integer':'int64','number':'float64','boolean':'bool','null':'json.RawMessage'}.get(t,'json.RawMessage')
    def declare(name,s,spec,key):
        if name in definitions:return
        definitions[name]=typ(s,spec,key)
        # Preserve useful variant types when Go cannot express a schema union.
        for union in ['oneOf','anyOf']:
            for i,x in enumerate(s.get(union,[]) if isinstance(s,dict) else []):
                definitions[name+'Variant'+str(i+1)]=typ(x,spec,key)
    for e in ops:
        stem=prefix+pas(e['name']);e['goName']=pas(e['name']);e['inputType']=stem+'Input';e['responseType']=stem+'Response'
        fields=['Headers http.Header','// ExtraQuery supplies open provider parameters. Declared typed parameters take precedence.','ExtraQuery map[string]any']
        native=['Headers: input.Headers','Query: input.ExtraQuery']
        for where in ['path','query','header']:
            params=[p for p in e['params'] if p['in']==where]
            if params:
                name=stem+('Headers' if where=='header' else pas(where));s={'type':'object','properties':{p['name']:p.get('schema',{}) for p in params},'required':[p['name'] for p in params if p.get('required')]}
                declare(name,s,e['spec'],e['specKey']);fields.append(('HeaderParameters' if where=='header' else pas(where))+' *'+name);native = [n for n in native if not n.startswith(('Headers' if where=='header' else pas(where))+':')];native.append(('Headers' if where=='header' else pas(where))+': '+('mergeQuery(input.ExtraQuery,input.Query)' if where=='query' else 'mergeHeaders(input.Headers,input.HeaderParameters)' if where=='header' else 'input.Path'))
        if e['body'] is not None:
            name=stem+'Body';declare(name,e['body'],e['spec'],e['specKey']);fields.append('Body *'+name);native.append('Body: input.Body')
        if e['raw']:fields.append('RawBody []byte');native.append('RawBody: input.RawBody')
        lines.append('type '+stem+'Input struct {\n'+'\n'.join(fields)+'\n}')
        mode=e['response'];response={'sse':'*SSEStream','bytes':'[]byte','text':'string','raw':'RawResponse','empty':'struct{}','embedding-url':'string'}.get(mode)
        if response is None:
            declare(stem+'Response',e['responseSchema'],e['spec'],e['specKey'])
        else:definitions[stem+'Response']=response
        # Distinct methods retain endpoint identity, native request fields and response shapes.
        lines+=['// '+e['goName']+' calls '+e['method']+' '+e['base']+e['path']+'.', '// Source: '+e['source'], 'func (c *'+prefix+'Client) '+e['goName']+'(ctx context.Context, input '+stem+'Input) (NativeResponse['+stem+'Response], error) {', 'return nativeCall['+stem+'Response](ctx,c.client,'+lit(e['name'])+',NativeInput{'+', '.join(native)+'})','}']
    while queue:
        name,s,spec,key=queue.pop(0);definitions[name]=typ(s,spec,key)
        for union in ['oneOf','anyOf']:
            for i,x in enumerate(s.get(union,[]) if isinstance(s,dict) else []):
                definitions[name+'Variant'+str(i+1)]=typ(x,spec,key)
    for name,t in definitions.items():lines.append('type '+name+(' = ' if t in ['*SSEStream','json.RawMessage'] or re.fullmatch('[A-Za-z][A-Za-z0-9]*',t) else ' ')+t)
    lines+=['type '+prefix+'Client struct {client *NativeClient}', 'func New'+prefix+'Client(o NativeOptions)(*'+prefix+'Client,error){ c,e:=NewNativeClient('+lit(provider)+',o);if e!=nil{return nil,e};return &'+prefix+'Client{client:c},nil}', 'func(c *'+prefix+'Client) Operations() []Operation {return c.client.Operations()}', 'func(c *'+prefix+'Client) Call(ctx context.Context, name string,input NativeInput)(NativeResult,error){return c.client.Call(ctx,name,input)}']
    content='\n'.join(lines)+'\n'
    p=subprocess.run(['gofmt'],input=content,text=True,capture_output=True)
    if p.returncode:raise SystemExit(provider+': '+p.stderr)
    outputs['native_'+provider+'_generated.go']=p.stdout

catalog=[]
for e in captured:
    params=e['params'];required=[{'location':p['in'],'name':p['name']} for p in params if p.get('required') and p['in'] in ['query','path','header']]
    # A supplies default exa-beta headers itself.
    required=[p for p in required if p['name'].lower() not in [h.lower() for h in e['headers']]]
    catalog.append(dict(provider=e['provider'],name=e['name'],baseURL=e['base'],path=e['path'],method=e['method'],response=e['response'],sourceURL=e['source'],summary=e['summary'],retryable=e['retryable'],headers=e['headers'],required=required,bodyRequired=e['bodyRequired'],raw=e['raw'],rawContentType=e['rawContentType'],commaQuery=e['comma'],streamField=e['stream'],stream=e['streamVariant']))
outputs['native_catalog.json']=json.dumps(catalog,indent=2,ensure_ascii=True)+'\n'
# Attribution and exact inputs are shipped with the module for offline auditing.
manifest={}
for directory in [A,B]:
    for p in sorted(directory.rglob('*')):
        if p.is_file() and p.suffix not in ['.pyc']:
            manifest[str(p.relative_to(ROOT))]=hashlib.sha256(p.read_bytes()).hexdigest()
outputs['native_sources.json']=json.dumps({'reviewedAt':'2026-10-22','inputs':manifest},indent=2)+'\n'
for fixture in sorted((ROOT/'sdk-contract/fixtures').glob('*.json')):
    outputs['testdata/'+fixture.name]=fixture.read_text()
for name,content in outputs.items():
    path=HERE/name
    if CHECK:
        if not path.exists() or path.read_text()!=content:raise SystemExit('Generated file is stale: '+str(path))
    else:
        path.parent.mkdir(parents=True,exist_ok=True)
        path.write_text(content)
print(('Checked' if CHECK else 'Generated')+f' {len(captured)} native operations for 13 providers; {len(outputs)} files.')
