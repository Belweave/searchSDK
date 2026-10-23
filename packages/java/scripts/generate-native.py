#!/usr/bin/env python3
"""Derive the Java operation catalog from retained tables/schemas, without writes outside this package."""
import argparse, hashlib, json, pathlib, re, sys
PACKAGE = pathlib.Path(__file__).resolve().parents[1]
ROOT = PACKAGE.parents[1]
OUTPUT = PACKAGE / 'src/main/resources/dev/searchsdk/native-operations.json'
inputs = {}
def read(path):
    data = path.read_bytes()
    inputs[str(path.relative_to(ROOT))] = hashlib.sha256(data).hexdigest()
    return json.loads(data)
def resolve(doc, value):
    seen = set()
    while isinstance(value, dict) and '$ref' in value:
        ref = value['$ref']
        if ref in seen or not ref.startswith('#/'): return {}
        seen.add(ref); value = doc
        for part in ref[2:].split('/'): value = value[part.replace('~1', '/').replace('~0', '~')]
    return value

def details(doc, path, method, provider):
    item = doc.get('paths', {}).get(path, {})
    operation = item.get(method.lower(), {})
    parameters = [resolve(doc,p) for p in item.get('parameters', []) + operation.get('parameters', [])]
    body = resolve(doc, operation.get('requestBody') or {}); content = body.get('content', {})
    schema = resolve(doc, content.get('application/json', {}).get('schema', {}))
    raw = bool(content) and 'application/json' not in content
    return dict(bodyRequired=body.get('required', False), rawBody=raw,
                rawContentType=next(iter(content), None) if raw else None,
                requiredQuery=[p['name'] for p in parameters if p.get('required') and p['in']=='query'],
                requiredHeaders=[p['name'] for p in parameters if p.get('required') and p['in']=='header'],
                commaQuery=[p['name'] for p in parameters if p['in']=='query' and (p.get('explode') is False or provider=='context' and resolve(doc,p.get('schema',{})).get('type')=='array')],
                streamField='stream' in schema.get('properties', {}))

operations=[]
a=ROOT/'scripts/providers-a'
b=ROOT/'scripts/providers-b'
for folder in (a,b):
    manifest=read(folder/'provenance.json')
    for source in manifest['sources']:
        relative=source.get('artifact',source.get('file')); expected=source.get('artifactSha256',source.get('sha256'))
        if relative and expected:
            path=folder/relative; digest=hashlib.sha256(path.read_bytes()).hexdigest()
            if digest!=expected: raise SystemExit('Retained source digest mismatch: '+str(path.relative_to(ROOT)))
            inputs[str(path.relative_to(ROOT))]=digest
for supplemental in ('brave.py','extensions.py'):
    path=a/supplemental; inputs[str(path.relative_to(ROOT))]=hashlib.sha256(path.read_bytes()).hexdigest()
for entry in read(a/'operations.json')['operations']:
    e=dict(provider=entry['provider'],name=entry['name'],base=entry['base'],path=entry['path'],
           method=entry['verb'],response=entry['mode'],source=entry['source'],summary=entry.get('summary',''),
           headers=entry.get('headers',{}),bodyRequired=entry.get('bodyRequired',False),rawBody=entry.get('raw',False),
           streamField=entry.get('streamfield',False),requiredQuery=[],requiredHeaders=[],commaQuery=[])
    key=entry.get('key')
    if key:
        fixture=a/'fixtures'/(key+'.json'); doc=read(fixture)
        if e['provider']=='brave':
            doc={'paths':{doc['path']:{doc['method'].lower():dict(parameters=doc.get('queryParams',[])+doc.get('pathParams',[])+doc.get('headerParams',[]),requestBody=doc.get('requestBody',{}))}},'components':{'schemas':doc['schemas']}}
        extra=details(doc,e['path'],e['method'],e['provider'])
        # Retained operation table preserves required-body intersections resolved by the TS generator.
        extra['bodyRequired']=entry.get('bodyRequired',False)
        extra['rawBody']=entry.get('raw',False)
        extra['streamField']=entry.get('streamfield',False)
        e.update(extra)
    operations.append(e)

snapshots={}
for f in sorted((b/'snapshots').iterdir()):
    try:
        doc=json.loads(f.read_bytes())
        if 'paths' in doc: snapshots[f.name]=read(f)
    except (ValueError,TypeError): pass
for catalog in sorted((b/'catalogs').glob('*-operations.json')):
    provider=catalog.name.removesuffix('-operations.json')
    for entry in read(catalog):
        e=dict(provider=provider,**entry)
        candidates=[(name,doc) for name,doc in snapshots.items() if entry['method'].lower() in doc.get('paths',{}).get(entry['path'],{})]
        # Paths such as /v1/search overlap between providers; select only that provider's retained schema family.
        candidates=[(name,doc) for name,doc in candidates if name.startswith({'perplexity':'p-','serper':'serper-','wondersearch':'wonder-','parallel':'parallel-','firecrawl':'firecrawl-','linkup':'linkup-','you':'you-'} .get(provider,'NONE'))]
        if provider=='serpapi':
            e.update(base='https://serpapi.com',bodyRequired=entry['method']=='POST',rawBody=entry['method']=='POST',rawContentType='application/x-www-form-urlencoded',requiredQuery=[],requiredHeaders=[],commaQuery=[],streamField=False)
        else:
            if len(candidates)!=1: raise SystemExit(f'Ambiguous/missing source for {provider}.{entry["name"]}: {[x[0] for x in candidates]}')
            _,doc=candidates[0]; e.update(base=doc['servers'][0]['url'].rstrip('/'),**details(doc,e['path'],e['method'],provider))
        e.setdefault('headers',{})
        operations.append(e)
for e in operations:
    e['retryable']=e['method'] in ('GET','HEAD')
    # The retained Brave reference is amended by scripts/providers-a/brave.py for this comma list.
    if e['provider']=='brave' and e['name']=='search' and 'result_filter' not in e['commaQuery']: e['commaQuery'].append('result_filter')
    e['supported']=True
    if e['provider']=='serpapi':
        e['retryable']=e['name'] in ('getSearch','getSearchHtml','locations','account')
        if e['name']=='uploadImage': e['rawContentType']='multipart/form-data'
    if e['provider']=='tavily' and e['name']=='paidSearch': e['bodyRequired']=True
    e['auth']='none' if e['base'] in ('https://logos.context.dev','https://x402.tavily.com') else 'team' if 'admin-api.exa.ai' in e['base'] else 'api'
    if e['rawBody'] and e.get('rawContentType','').startswith('multipart/'):
        # Encoded multipart can be supplied as raw bytes with a caller-owned boundary.
        e['rawContentType']='multipart/form-data'
    e['requiredHeaders']=[h for h in e['requiredHeaders'] if h.lower() not in ('authorization','x-api-key','x-subscription-token')]
    e['requiredQuery']=[q for q in e['requiredQuery'] if q not in ('api_key','apiKey')]
operations.sort(key=lambda e:(e['provider'],e['name']))
if len(set((e['provider'],e['name']) for e in operations))!=len(operations): raise SystemExit('Duplicate operation')
# Build schema-backed models and typed input groups from retained schemas before serializing the input digest inventory.
import importlib.util
sys.dont_write_bytecode=True
module_spec=importlib.util.spec_from_file_location('java_wire_generator',PACKAGE/'scripts/generate-wire.py')
wire=importlib.util.module_from_spec(module_spec);module_spec.loader.exec_module(wire)
wire_files,wire_operations,wire_counts=wire.generate(PACKAGE,ROOT,operations,read)
for e in operations:
    e['javaResponse']=wire_operations[(e['provider'],e['name'])]['types'].get('response',e['response'])
result=json.dumps(dict(schemaVersion=1,snapshotDate='2026-10-22',inputs=dict(sorted(inputs.items())),wireModels=wire_counts,operations=operations),indent=2,ensure_ascii=False)+'\n'
files={OUTPUT:result,**wire_files}
titles={'serpapi':'SerpApi','tinyfish':'Tinyfish','wondersearch':'WonderSearch','searxng':'Searxng'}
keywords=wire.KEYWORDS
for provider in sorted(set(e['provider'] for e in operations)):
    title=titles.get(provider,provider[0].upper()+provider[1:])+'Client'
    lines=['// Generated by scripts/generate-native.py; do not edit. Retained source attribution is in each operation.',
           'package dev.searchsdk;', '', 'import java.util.List;', 'import java.util.concurrent.CompletionStage;', '',
           '/** Schema-backed named operations with conservative typed union views and a generic NativeInput escape hatch. */',
           'public final class '+title+' {', '    private final NativeClient client;',
           '    public '+title+'(String apiKey) { this(NativeClient.builder("'+provider+'",apiKey).build()); }',
           '    public '+title+'(NativeClient client) {',
           '        if(client==null || !client.provider().equals("'+provider+'")) throw new SearchException(SearchException.Code.CONFIGURATION);',
           '        this.client=client;', '    }',
           '    public List<NativeOperation> operations() { return client.operations(); }']
    for e in (e for e in operations if e['provider']==provider):
        info=wire_operations[(provider,e['name'])];types=info['types'];schemas=info['schemas'];stem=info['stem'];input_name=stem+'Input'
        name=e['name']+('Operation'if e['name']in keywords else'')
        mode=e['response'];typ={'sse':'NativeEventStream','text':'String','bytes':'byte[]','raw':'Transport.Response','empty':'Void','embedding-url':'String'}.get(mode,types.get('response','WireValue'))
        summary=e.get('summary',e['name']).replace('*/','* /').replace('&','&amp;').replace('<','&lt;').replace('>','&gt;')
        required='Required query: '+', '.join(e.get('requiredQuery',[]))+'. Required headers: '+', '.join(e.get('requiredHeaders',[]))+'.'
        expression=('client.executeMapped("'+e['name']+'",input,cancellation,value -> '+info['convert'](typ,'value')+')')if mode=='json'else('client.executeTyped("'+e['name']+'",input,cancellation,'+typ+'.class)')
        lines+=['    /** '+summary+' '+required+' Source: '+e['source']+' */',
                '    public CompletionStage<NativeResponse<'+typ+'>> '+name+'(NativeInput input, CancellationToken cancellation) {',
                '        return '+expression+';', '    }',
                '    public CompletionStage<NativeResponse<'+typ+'>> '+name+'(NativeInput input) { return '+name+'(input,null); }',
                '    public CompletionStage<NativeResponse<'+typ+'>> '+name+'('+input_name+' input, CancellationToken cancellation) { return '+name+'(input.toNative(),cancellation); }',
                '    public CompletionStage<NativeResponse<'+typ+'>> '+name+'('+input_name+' input) { return '+name+'(input.toNative()); }']
        placeholders=re.findall(r'\{([a-zA-Z][a-zA-Z0-9_]*)}',e['path'])
        if placeholders:
            params=', '.join('String '+(p+'Value')for p in placeholders);values=''.join('.path("'+p+'",'+p+'Value)'for p in placeholders)
            lines+=['    public CompletionStage<NativeResponse<'+typ+'>> '+name+'('+params+', NativeInput input) {',
                    '        return '+name+'(input.toBuilder()'+values+'.build());', '    }']
        # Native input groups are generated as typed path/query/header/body schemas, including required-group factories.
        groups=[g for g in ['path','query','header','body']if g in types];fields={g:'headers'if g=='header'else g for g in groups}
        mandatory=[g for g in groups if (g=='body'and e.get('bodyRequired'))or(g!='body'and bool(schemas[g].get('required')))]
        lines+=['    public static final class '+input_name+' {','        private final NativeInput input;',
                '        private '+input_name+'(NativeInput input) { this.input=input; }','        public NativeInput toNative() { return input; }',
                '        public static Builder builder() { return new Builder(); }']
        if mandatory:
            args=', '.join(types[g]+' '+fields[g]for g in mandatory);setters=''.join('.'+fields[g]+'('+fields[g]+')'for g in mandatory)
            lines+=['        public static Builder builder('+args+') { return new Builder()'+setters+'; }']
        lines+=['        public static final class Builder {','            private NativeInput extra=NativeInput.empty();']
        for g in groups:lines+=['            private '+types[g]+' '+fields[g]+';',
            '            public Builder '+fields[g]+'('+types[g]+' value) { '+fields[g]+'=value;return this; }']
        lines+=['            public Builder options(NativeInput value) { extra=value;return this; }']
        if e.get('rawBody'):
            lines+=['            public Builder rawBody(byte[] bytes,String contentType) { extra=extra.toBuilder().rawBody(bytes,contentType).build();return this; }',
                    '            public Builder multipart(MultipartBody body) { extra=extra.toBuilder().multipart(body).build();return this; }']
        lines+=['            public '+input_name+' build() {']
        if mandatory:lines+=['                if('+ ' || '.join(fields[g]+'==null'for g in mandatory)+') throw new SearchException(SearchException.Code.INVALID_REQUEST);']
        if e.get('rawBody'):lines+=['                if(extra.rawBody==null && extra.multipart==null) throw new SearchException(SearchException.Code.INVALID_REQUEST);']
        args=','.join(fields[g]if g in groups else'null'for g in ['path','query','header','body'])
        lines+=['                return new '+input_name+'(WireTypes.input('+args+',extra));','            }','        }','    }']
        if list(groups)==['body']and not e.get('rawBody'):
            lines+=['    public CompletionStage<NativeResponse<'+typ+'>> '+name+'('+types['body']+' body) { return '+name+'('+input_name+'.builder().body(body).build()); }']
        if not mandatory and not e.get('rawBody')and not placeholders and mode!='embedding-url':
            lines+=['    public CompletionStage<NativeResponse<'+typ+'>> '+name+'() { return '+name+'('+input_name+'.builder().build()); }']
    lines+=['}', ''];files[PACKAGE/'src/main/java/dev/searchsdk'/(title+'.java')]='\n'.join(lines)
parser=argparse.ArgumentParser();parser.add_argument('--check',action='store_true');args=parser.parse_args()
if args.check:
    stale=[str(path.relative_to(PACKAGE)) for path,content in files.items() if not path.exists() or path.read_text()!=content]
    if stale: raise SystemExit('Java generated files are stale: '+', '.join(stale))
    print(f'Java native catalog and named clients checked: {len(operations)} operations')
else:
    for path,content in files.items():
        path.parent.mkdir(parents=True,exist_ok=True);path.write_text(content)
    print(f'Generated {len(operations)} operations, 13 named clients, '+str(sum(c['models']for c in wire_counts.values()))+' wire models and '+str(sum(c['fields']for c in wire_counts.values()))+' typed fields')
