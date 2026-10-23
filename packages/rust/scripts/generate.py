#!/usr/bin/env python3
"""Offline schema-derived Rust generation. Writes only packages/rust.

Operation identities come from retained catalogs, schema definitions from retained
OpenAPI snapshots. Brave's retained apiSpec converter is reused without its emitter.
SerpAPI's hand-maintained TypeScript wire declarations are the retained source.
No Node/runtime dependency or network is used to build or execute this crate.
"""
import sys, pathlib, json, re, hashlib, types, runpy, copy, subprocess
sys.dont_write_bytecode=True
HERE=pathlib.Path(__file__).resolve().parents[1]
ROOT=HERE.parents[1]
CHECK='--check' in sys.argv
A=ROOT/'scripts/providers-a'; B=ROOT/'scripts/providers-b'
outputs={}; inputs={}
def read(p):
    inputs[str(p.relative_to(ROOT))]=hashlib.sha256(p.read_bytes()).hexdigest()
    return json.loads(p.read_text())
def text(p):
    inputs[str(p.relative_to(ROOT))]=hashlib.sha256(p.read_bytes()).hexdigest()
    return p.read_text()
def snake(s):
    s=re.sub(r'([a-z0-9])([A-Z])',r'\1_\2',s)
    s=re.sub(r'([A-Z]+)([A-Z][a-z])',r'\1_\2',s)
    s=re.sub(r'[^A-Za-z0-9]+','_',s).strip('_').lower()
    if not s or s[0].isdigit():s='field_'+s
    return s+'_' if s in {'type','ref','self','super','crate','mod','pub','fn','async','await','in','for','loop','match','move','const','enum','struct','use','where','impl','dyn','trait','return','default','box','as','static','true','false','try','gen','let','mut','union','extern','unsafe','abstract','final','override','priv','typeof','unsized','virtual','yield','do','become'} else s
def pas(s):
    s=''.join(x[:1].upper()+x[1:] for x in re.split('[^A-Za-z0-9]+',s) if x)
    return ('Schema'+s if not s or s[0].isdigit() else s)
def q(s):return json.dumps(s,ensure_ascii=False)
# Audit original snapshot hashes as well as every actual generator input.
for folder in [A,B]:
    manifest=read(folder/'provenance.json')
    for source in manifest.get('sources',[]):
        if 'file' in source and source.get('sha256'):
            p=folder/source['file']
            if hashlib.sha256(p.read_bytes()).hexdigest()!=source['sha256']:raise SystemExit('Snapshot digest mismatch: '+str(p))
        if 'artifact' in source:
            p=folder/source['artifact']
            if p.exists() and source.get('artifactSha256'):
                if hashlib.sha256(p.read_bytes()).hexdigest()!=source['artifactSha256']:raise SystemExit('Snapshot digest mismatch: '+str(p))
# Convert Brave with a capture-only Gen. No writes to the TypeScript package.
brave=[]
class Capture:
    def __init__(self,provider,prefix,specs):brave.extend(specs)
    def emit(self):pass
previous=sys.modules.get('generate')
sys.modules['generate']=types.SimpleNamespace(Gen=Capture,J=lambda n:read(A/'fixtures'/(n+'.json')))
text(A/'brave.py');runpy.run_path(str(A/'brave.py'))
if previous:sys.modules['generate']=previous
else:del sys.modules['generate']
all_a=read(A/'operations.json')['operations']
# Documents retain origin/path and source identity; refs never cross documents.
docs={};adocs={}
for p in sorted((A/'fixtures').glob('*.json')):
    if p.stem.startswith('brave'):continue
    d=read(p)
    if 'paths'in d:docs[p.stem]=d;adocs[p.stem]=d
for key,d,source in brave:docs[key]=d;adocs[key]=d
for p in sorted((B/'snapshots').iterdir()):
    if not p.is_file():continue
    try:d=read(p)
    except (ValueError,UnicodeDecodeError):continue
    if isinstance(d,dict) and 'paths'in d:docs[p.name]=d
# Keep original source artifacts byte-for-byte as well as derived OpenAPI documents.
for folder,subfolder in [(A,'fixtures'),(B,'snapshots')]:
    for p in sorted((folder/subfolder).iterdir()):
        if p.is_file():outputs['retained/original/'+folder.name+'/'+subfolder+'/'+p.name]=text(p)
    outputs['retained/original/'+folder.name+'/provenance.json']=text(folder/'provenance.json')
# Copy the retained public schemas and provenance into the distributable.
for key,d in docs.items():outputs['retained/'+key+'.json']=json.dumps(d,ensure_ascii=False,indent=2)+'\n'
for folder in [A,B]:outputs['retained/'+folder.name+'-provenance.json']=text(folder/'provenance.json')
serp_ts=text(ROOT/'packages/sdk/src/native-serpapi.ts')
outputs['retained/native-serpapi.ts']=serp_ts
for p in sorted((ROOT/'sdk-contract/fixtures').glob('*.json')):outputs['tests/fixtures/'+p.name]=text(p)
class Emitter:
    def __init__(self,provider):self.provider=provider;self.defs={};self.queue=[];self.schemas={};self.aliases={}
    def ref(self,key,ref):
        name=pas(key)+'Schema'+pas(ref.split('/')[-1])
        if name not in self.schemas:
            v=docs[key]
            for x in ref.removeprefix('#/').split('/'):v=v[x.replace('~1','/').replace('~0','~')]
            self.schemas[name]=(key,v);self.queue.append(name)
        return 'Box<'+name+'>'
    def merge(self,key,s,seen=None):
        seen=set() if seen is None else seen
        if not isinstance(s,dict):return s
        if '$ref'in s:
            ref=s['$ref']
            if ref in seen:return s
            v=docs[key]
            for x in ref.removeprefix('#/').split('/'):v=v[x.replace('~1','/').replace('~0','~')]
            return self.merge(key,v,seen|{ref})
        if 'allOf'in s:
            merged={k:v for k,v in s.items()if k!='allOf'};props=dict(merged.get('properties',{}));required=list(merged.get('required',[]));others=[]
            for part in s['allOf']:
                part=self.merge(key,part,seen)
                if isinstance(part,dict) and ('properties'in part or part.get('type')=='object' or 'required'in part):
                    props.update(part.get('properties',{}));required.extend(part.get('required',[]))
                else:others.append(part)
            if props or required:merged.update(type='object',properties=props,required=sorted(set(required)))
            if not others:return merged
            if not props and len(others)==1:return others[0]
            # Preserve fields of common composed object schemas. Unrepresentable
            # intersections retain all original schema data in retained/.
            if props:return merged
            return {}
        return s
    def typ(self,key,s,name):
        if not isinstance(s,dict):return 'Value'
        if '$ref'in s:return self.ref(key,s['$ref'])
        s=self.merge(key,s)
        if not isinstance(s,dict):return 'Value'
        nullable=s.get('nullable',False)
        if nullable:return 'Option<'+self.typ(key,{**s,'nullable':False},name+'Value')+'>'
        if isinstance(s.get('type'),list):
            return self.typ(key,{'anyOf':[{**s,'type':t,'nullable':False}for t in s['type']]},name)
        if 'const'in s:s={**s,'enum':[s['const']]}
        if s.get('enum') and all(isinstance(v,str)for v in s['enum']):
            if name not in self.defs:
                variants=[];used=set()
                for i,v in enumerate(s['enum']):
                    variant=pas(v)
                    if variant in used or variant in {'Self','Unknown'}:variant='Variant'+str(i)
                    used.add(variant);variants.append('#[serde(rename = '+q(v)+')] '+variant+',')
                self.defs[name]='#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Default)]\npub enum '+name+' {\n#[default]\n'+ '\n'.join(variants)+'\n/// Forward-compatible unknown string; original schema is retained.\n#[serde(untagged)] Unknown(String),\n}\n'
            result=name
        elif s.get('oneOf') or s.get('anyOf'):
            items=s.get('oneOf',s.get('anyOf'))
            if s.get('properties'):
                base={k:v for k,v in s.items()if k not in ['oneOf','anyOf']}
                items=[self.merge(key,{'allOf':[base,v]})for v in items]
            non=[v for v in items if v.get('type')!='null']
            if len(non)==1 and len(non)!=len(items):return 'Option<'+self.typ(key,non[0],name+'Value')+'>'
            if name not in self.defs:
                self.defs[name]='' # reserve name for recursive children
                vs=[]
                for i,v in enumerate(non):vs.append('Variant'+str(i)+'('+self.typ(key,v,name+'Variant'+str(i))+'),')
                self.defs[name]='#[derive(Clone, Debug, Serialize, Deserialize)]\n#[serde(untagged)]\npub enum '+name+' {\n'+'\n'.join(vs)+'\n/// Conservative escape hatch for evolving or unrepresentable unions.\nUnknown(Value),\n}\nimpl Default for '+name+' { fn default()->Self { Self::Unknown(Value::Null) } }\n'
            result=name
        elif s.get('type')=='array':result='Vec<'+self.typ(key,s.get('items',{}),name+'Item')+'>'
        elif s.get('type')=='object' or 'properties'in s or 'additionalProperties'in s:
            props=s.get('properties',{})
            if not props:result='BTreeMap<String, '+self.typ(key,s.get('additionalProperties',{}),name+'Value')+'>'
            else:
                if name not in self.defs:
                    self.defs[name]='';fields=[];used=set();required=s.get('required',[])
                    for i,(k,v) in enumerate(props.items()):
                        field=snake(k)
                        if field in used or field=='extra':field+='_'+str(i)
                        used.add(field);t=self.typ(key,v,name+pas(k));optional=k not in required
                        if optional:t='Option<'+t+'>'
                        if t.count('<')>=4:
                            alias=name+pas(k)+'Field';self.aliases[alias]='pub type '+alias+' = '+t+';';t=alias
                        attrs='#[serde(rename = '+q(k)+(', default, deserialize_with = "crate::types::present_option", skip_serializing_if = "Option::is_none"'if optional else ', deserialize_with = "crate::types::required_field"')+')]'
                        desc=re.sub(r'\s+',' ',str(v.get('description',''))).replace('*/','* /')[:400].rstrip()
                        if desc:fields.append('/// '+desc)
                        fields.extend([attrs,'pub '+field+': '+t+','])
                    # Preserve unknown properties from evolving native schemas.
                    fields+=['#[serde(flatten)]','pub extra: BTreeMap<String, Value>,']
                    self.defs[name]='#[derive(Clone, Debug, Default, Serialize, Deserialize)]\npub struct '+name+' {\n'+'\n'.join(fields)+'\n}\n'
                result=name
        else:result={'integer':'i64','number':'f64','boolean':'bool','string':'String','null':'()'}.get(s.get('type'),'Value')
        if nullable and not result.startswith('Option<'):result='Option<'+result+'>'
        return result
    def alias(self,key,s,name):
        t=self.typ(key,s,name)
        if t!=name:self.aliases[name]='pub type '+name+' = '+t+';'
        return name
    def finish(self):
        while self.queue:
            name=self.queue.pop(0);key,s=self.schemas[name];self.alias(key,s,name)
        return '\n'.join(self.defs.values())+'\n'+'\n'.join(self.aliases.values())
providers=['context','exa','tavily','brave','tinyfish','perplexity','parallel','linkup','firecrawl','you','wondersearch','serper','serpapi']
titles={'wondersearch':'WonderSearch','serpapi':'SerpApi','tinyfish':'Tinyfish'}
manifest=[]
# Every generated binding is exercised against a failing synthetic transport. This
# verifies real dispatch rather than merely counting catalog entries; success and
# independent wire examples are tested separately in tests/native.rs.
binding_tests=['// @generated by scripts/generate.py\nuse searchsdk::{native::*, transport::*, ErrorCode, Result};\nuse serde_json::{json,Value};\nuse std::sync::Arc;\nuse reqwest::header::HeaderMap;\nstruct Check { base: &\'static str, path: &\'static str, method: &\'static str }\nimpl Transport for Check { fn send(&self,r:HttpRequest)->BoxFuture<\'_,Result<HttpResponse>>{Box::pin(async move{assert_eq!(r.url.origin().ascii_serialization(), url::Url::parse(self.base).unwrap().origin().ascii_serialization());assert_eq!(r.url.path(),self.path);assert_eq!(r.method,self.method);Ok(HttpResponse::bytes(503,HeaderMap::new(),b"synthetic-error".to_vec()))})} }\n']
def sample(key,s,depth=0):
    if depth>12:return None
    if not isinstance(s,dict):return None
    if '$ref'in s:
        v=docs[key]
        for x in s['$ref'].removeprefix('#/').split('/'):v=v[x.replace('~1','/').replace('~0','~')]
        return sample(key,v,depth+1)
    if 'const'in s:return s['const']
    if s.get('enum'):return s['enum'][0]
    if s.get('oneOf')or s.get('anyOf'):
        branch=s.get('oneOf',s.get('anyOf'))[0]
        if s.get('properties'):
            base={k:v for k,v in s.items()if k not in ['oneOf','anyOf']}
            branch=Emitter('sample').merge(key,{'allOf':[base,branch]})
        return sample(key,branch,depth+1)
    if s.get('allOf'):
        value={}
        for part in s['allOf']:
            v=sample(key,part,depth+1)
            if isinstance(v,dict):value.update(v)
            elif len(s['allOf'])==1 and not s.get('properties'):return v
        if s.get('properties'):value.update(sample(key,{k:v for k,v in s.items()if k!='allOf'},depth+1))
        return value
    t=s.get('type')
    if isinstance(t,list):t=t[0]
    if t=='object'or 'properties'in s:return {k:sample(key,s.get('properties',{}).get(k,{}),depth+1)for k in s.get('required',[])}
    if t=='array':return []
    if t=='string':return 'fixture'
    if t in ['integer','number']:return 1
    if t=='boolean':return False
    return None

for provider in providers:
    title=titles.get(provider,pas(provider));e=Emitter(provider);methods=[];operations=[];input_defs=[]
    if provider in ['context','exa','tavily','brave','tinyfish']:ops=[dict(o)for o in all_a if o['provider']==provider]
    else:ops=[dict(o,provider=provider)for o in read(B/'catalogs'/(provider+'-operations.json'))]
    for o in ops:
        name=o['name'];stem=title+pas(name);method=o.get('verb',o.get('method','GET'));path=o['path'];mode=o.get('mode',o.get('response','json'));source=o.get('source','');key=o.get('key');d=None;operation={};params=[]
        if key and key in docs:
            d=docs[key];item=d.get('paths',{}).get(path,{});operation=item.get(method.lower(),{});params=item.get('parameters',[])+operation.get('parameters',[])
        elif provider!='serpapi' and not (provider=='context'and name in ['logoUrl','headLogo']) and not(provider=='tavily'and name in ['paidSearch','getPaymentPricing']):
            candidates=[]
            for dk,dd in docs.items():
                if dk in adocs:continue
                item=dd.get('paths',{}).get(path,{})
                if method.lower()in item:
                    bases=[s['url'] for s in dd.get('servers',[])]
                    belongs=(provider=='perplexity'and dk.startswith('p-'))or(provider=='you'and dk.startswith('you-'))or dk.startswith(provider.replace('wondersearch','wonder'))
                    if belongs:candidates.append((dk,dd,item))
            if len(candidates)!=1:raise RuntimeError((provider,name,path,'schema matches',len(candidates)))
            key,d,item=candidates[0];operation=item[method.lower()];params=item.get('parameters',[])+operation.get('parameters',[])
        def resolve(s):
            while isinstance(s,dict) and '$ref'in s:
                v=d
                for x in s['$ref'].removeprefix('#/').split('/'):v=v[x.replace('~1','/').replace('~0','~')]
                s=v
            return s
        params=[resolve(p)for p in params]
        base=o.get('base')or(d.get('servers',[{'url':'https://serpapi.com'}])[0]['url']if d else 'https://serpapi.com')
        rb=resolve(operation.get('requestBody',{}));content=rb.get('content',{});body=content.get('application/json',{}).get('schema');raw=bool(content and body is None)
        body_required=rb.get('required',False)or o.get('bodyRequired',False);query_required=any(p.get('required')for p in params if p.get('in')=='query');headers=o.get('headers',{});comma=[p['name']for p in params if p.get('in')=='query'and(p.get('explode')is False or(provider=='context'and resolve(p.get('schema',{})).get('type')=='array'))]
        if provider=='context'and name in ['logoUrl','headLogo']:
            base='https://logos.context.dev';key='context';query_required=True
            params=[{'in':'query','name':k,'required':k in ['domain','publicClientId'],'schema':v}for k,v in {'publicClientId':{'type':'string'},'domain':{'type':'string'},'theme':{'enum':['light','dark']},'type':{'enum':['icon','wordmark']}}.items()]
        if provider=='tavily'and name=='paidSearch':
            base='https://x402.tavily.com';key='tavily-search';d=docs[key];operation=d['paths']['/search']['post'];body=operation['requestBody']['content']['application/json']['schema'];body_required=True
            body=copy.deepcopy(resolve(body));body.setdefault('properties',{})['search_depth']={'enum':['advanced']}
        if provider=='tavily'and name=='getPaymentPricing':base='https://x402.tavily.com'
        if provider=='serpapi':
            base='https://serpapi.com';key='serpapi';docs.setdefault(key,{'components':{'schemas':{}}})
            # The maintained TS contract explicitly permits engine-specific scalar additions.
            common={'q':{'type':'string'},'engine':{'type':'string'},'location':{'type':'string'},'google_domain':{'type':'string'},'gl':{'type':'string'},'hl':{'type':'string'},'device':{'enum':['desktop','tablet','mobile']},'start':{'type':'number'},'tbm':{'type':'string'},'tbs':{'type':'string'},'safe':{'enum':['active','off']},'no_cache':{'type':'boolean'},'async':{'type':'boolean'},'zero_trace':{'type':'boolean'},'json_restrictor':{'type':'string'}}
            if name in ['search','searchHtml','searchMarkdown','searchPixelPositions','google']:
                params=[{'in':'query','name':k,'schema':s,'required':k==('q'if name=='google'else'engine')}for k,s in common.items()]
            elif name in ['extract','extractMarkdown']:
                # Parse field names from the original maintained interface; retain exact types.
                block=re.search(r'export interface SerpApiExtractQuery \{(.*?)\n\}',serp_ts,re.S)[1]
                params=[]
                for k,opt,t in re.findall(r'\s+(\w+)(\?)?: ([^;]+);',block):
                    schema={'enum':re.findall(r'"([^"]+)"',t)}if '"'in t else {'type':{'number':'number','boolean':'boolean'}.get(t,'string')}
                    params.append({'in':'query','name':k,'required':not opt,'schema':schema})
            elif name.startswith('getSearch'):params=[{'in':'path','name':'search_id','required':True,'schema':{'type':'string'}}]
            elif name=='locations':params=[{'in':'query','name':'q','schema':{'type':'string'}},{'in':'query','name':'limit','schema':{'type':'number'}}]
            elif name=='uploadImage':raw=True;body_required=True
            if name in ['google','extract']:path='/search.json'
            if name=='extractMarkdown':path='/search.md';mode='text'
            # The endpoint-family catalog records conveniences separately.
            if name in ['searchHtml','getSearchHtml','searchMarkdown']:mode='text'
            if name=='google':query_required=True
            query_required=any(p.get('required')for p in params if p['in']=='query')
        query_props={p['name']:p.get('schema',{})for p in params if p.get('in')=='query'}
        path_props={p['name']:p.get('schema',{})for p in params if p.get('in')=='path'}
        fields=[];builder=[]
        for field,props in [('path',path_props),('query',query_props)]:
            if props:
                req=[p['name']for p in params if p.get('in')==field and p.get('required')]
                typ=e.alias(key,{'type':'object','properties':props,'required':req},stem+pas(field));required=bool(req)
                fields.append('pub '+field+': '+(typ if required else 'Option<'+typ+'>')+',')
                builder.append(field+': '+('serde_json::to_value(&self.'+field+').map_err(|_| Error::new(ErrorCode::InvalidRequest))?'if required else 'self.'+field+'.as_ref().map(serde_json::to_value).transpose().map_err(|_| Error::new(ErrorCode::InvalidRequest))?.unwrap_or(Value::Null)')+',')
        if body is not None:
            # Stream selection belongs to the named method, not a caller switch.
            typ=e.alias(key,body,stem+'Body');fields.append('pub body: '+(typ if body_required else 'Option<'+typ+'>')+',');builder.append('body: '+('Some(serde_json::to_value(&self.body).map_err(|_| Error::new(ErrorCode::InvalidRequest))?)'if body_required else 'self.body.as_ref().map(serde_json::to_value).transpose().map_err(|_| Error::new(ErrorCode::InvalidRequest))?')+',')
        if raw:fields.append('pub raw_body: RawBody,');builder.append('raw_body: Some(self.raw_body.clone()),')
        fields.append('pub headers: BTreeMap<String, String>,');builder.append('headers: self.headers.clone(),')
        input_defs.append('#[derive(Clone, Default)]\npub struct '+stem+'Input {\n'+'\n'.join(fields)+'\n}\nimpl '+stem+'Input { fn wire(&self)->Result<NativeInput> { Ok(NativeInput {'+'\n'.join(builder)+'..NativeInput::default()}) } }\n')
        if mode=='embedding-url':
            methods.append('pub fn logo_url(&self,input:&'+stem+'Input)->Result<String> { self.inner.logo_url(&'+str(len(operations))+'usize, input.wire()?) }')
        else:
            response_schemas=[]
            for status,response in operation.get('responses',{}).items():
                if str(status).startswith('2'):
                    for media,entry in resolve(response).get('content',{}).items():
                        if media=='application/json'or media in ['searchResults','sourcedAnswer','structured']:response_schemas.append(entry.get('schema',{}))
            if provider=='serpapi':
                # TS source fields, including nested named interfaces, emitted below.
                out={'locations':'Vec<SerpApiLocation>','account':'SerpApiAccountResponse','uploadImage':'SerpApiUploadImageResponse','extract':'SerpApiExtractResponse','searchPixelPositions':'SerpApiPixelPositionResponse','getSearchPixelPositions':'SerpApiPixelPositionResponse'}.get(name,'SerpApiSearchResponse')
            else:
                schema=response_schemas[0]if len(response_schemas)==1 else {'oneOf':response_schemas}if response_schemas else {'type':'null'}
                out=e.alias(key or 'context',schema,stem+'Response')
            if 'streamfield'in o:
                # Provider A explicitly distinguishes HTTP streaming from fields
                # such as TinyFish's optional synthesis-delta `stream` setting.
                streamfield=bool(o['streamfield'])
            else:
                streamfield=any('stream'in resolve(body).get('properties',{})for _ in [0]if body is not None)
                if name.endswith('Stream'):streamfield=True
            if mode=='sse':
                payloads=[]
                for status,response in operation.get('responses',{}).items():
                    if str(status).startswith('2'):
                        payload=resolve(response).get('content',{}).get('text/event-stream',{}).get('schema')
                        if payload is not None:payloads.append(payload)
                if payloads:e.alias(key,payloads[0]if len(payloads)==1 else {'oneOf':payloads},stem+'Payload')
                out='SseStream';call='sse'
            elif mode=='raw':out='BoundedResponse';call='raw'
            elif mode=='bytes':out='Vec<u8>';call='bytes'
            elif mode=='text':out='String';call='text'
            elif mode=='empty' or(provider=='perplexity'and name=='revokeAuthToken'):out='()';call='empty'
            else:call='json'
            if provider=='serpapi'and name in ['searchHtml','getSearchHtml','searchMarkdown','extractMarkdown']:out='String';call='text'
            methods.append('/// '+re.sub(r'\s+',' ',o.get('summary','')).replace('\n',' ')+'\n/// Source: '+source+'\npub async fn '+snake(name)+'(&self,input:&'+stem+'Input,options:CallOptions)->Result<NativeResponse<'+out+'>> { self.inner.'+call+'(&OPERATIONS['+str(len(operations))+'],input.wire()?,options).await }')
        if mode=='embedding-url':streamfield=False
        streamfield=bool(streamfield)if mode!='embedding-url'else False
        retryable=method in ['GET','HEAD'] and mode!='sse'
        if provider=='serpapi'and name in ['search','google','extract','extractMarkdown','searchHtml','searchMarkdown','searchPixelPositions','getSearchPixelPositions']:retryable=False
        if mode=='sse':headers={**headers,'accept':'text/event-stream'}
        if raw and content and 'multipart/form-data'not in content:headers={**headers,'content-type':next(iter(content))}
        multipart=bool(raw and ('multipart/form-data'in content or provider=='serpapi'))
        if multipart:headers={k:v for k,v in headers.items()if k.lower()!='content-type'}
        if multipart and content:e.alias(key,content['multipart/form-data'].get('schema',{}),stem+'MultipartFields')
        required_headers=[p['name']for p in params if p.get('in')=='header'and p.get('required')and p['name'].lower() not in ['authorization','x-api-key','x-subscription-token']]
        for p in params:
            if p['name']in required_headers:
                s=resolve(p.get('schema',{}))
                if p['name'].lower()in ['exa-beta']and s.get('enum'):headers[p['name']]=s['enum'][0]
        op=dict(provider=provider,name=name,base=base,path=path,method=method,mode=mode,source=source,retryable=retryable,streamfield=streamfield,streamvalue=mode=='sse',headers=headers,comma=comma,required_headers=required_headers,body_required=body_required,raw=raw,query_required=query_required)
        manifest.append(op)
        assignments=[]
        for field,props in [('path',path_props),('query',query_props)]:
            if not props:continue
            req=[p['name']for p in params if p.get('in')==field and p.get('required')]
            if req:
                v={k:sample(key,props[k])for k in req}
                assignments.append(field+':serde_json::from_value(json!('+json.dumps(v,ensure_ascii=False)+')).unwrap(),')
        if body is not None and body_required:
            value=sample(key,body)
            if isinstance(value,dict):
                if streamfield:value['stream']=mode=='sse'
                if provider=='exa'and name=='searchStream':value['outputSchema']={'type':'object'}
            assignments.append('body:serde_json::from_value(json!('+json.dumps(value,ensure_ascii=False)+')).unwrap(),')
        if raw:
            if provider=='serpapi'or 'multipart/form-data'in content:
                assignments.append('raw_body:RawBody::Multipart(vec![MultipartPart{name:"image".into(),bytes:vec![1],filename:Some("fixture.png".into()),content_type:None}]),')
            else:assignments.append('raw_body:RawBody::Bytes(vec![1]),')
        h={k:'fixture'for k in required_headers if k not in headers}
        if h:assignments.append('headers:serde_json::from_value(json!('+json.dumps(h)+')).unwrap(),')
        pathname=base.removeprefix('https://').partition('/')[2]
        pathname=('/'+pathname.rstrip('/')if pathname else '')+path
        for p in params:
            if p.get('in')=='path':
                import urllib.parse
                pathname=pathname.replace('{'+p['name']+'}',urllib.parse.quote(str(sample(key,p.get('schema',{}))),safe=''))
        setup='let transport=Arc::new(Check{base:'+q(base)+',path:'+q(pathname)+',method:'+q(method)+'});let client='+provider+'::'+title+'Client::with_transport("fixture-key",ClientConfig::default(),transport).unwrap();'
        if provider=='exa':setup+='let client=client.with_team_api_key("fixture-team-key").unwrap();'
        input_code='let input='+provider+'::'+stem+'Input {'+''.join(assignments)+('..Default::default()'if len(assignments)<len(fields)else'')+'};'
        if name=='logoUrl':assertion='assert!(client.logo_url(&input).unwrap().starts_with("https://logos.context.dev/"));'
        else:assertion='let error=client.'+snake(name)+'(&input,CallOptions::default()).await.err().expect("synthetic failure");assert_eq!(error.code,ErrorCode::Unavailable);'
        binding_tests.append('#[tokio::test] async fn '+snake(provider+'_'+name)+'(){'+setup+input_code+assertion+'}\n')
        operations.append('Operation { provider:'+q(provider)+', name:'+q(name)+', base:'+q(base)+', path:'+q(path)+', method:'+q(method)+', retryable:'+str(retryable).lower()+', stream_field:'+str(streamfield).lower()+', stream_value:'+str(mode=='sse').lower()+', headers:&['+','.join('('+q(k)+','+q(v)+')'for k,v in headers.items())+'], comma:&['+','.join(q(k)for k in comma)+'], required_headers:&['+','.join(q(k)for k in required_headers)+'], body_required:'+str(body_required).lower()+', raw_required:'+str(raw).lower()+', multipart:'+str(multipart).lower()+', query_required:'+str(query_required).lower()+' },')
    if provider=='serpapi':
        # Parse maintained TS scalar/array fields into schema structs. Complex indexed
        # objects retain Value escape hatches, while named stable fields remain typed.
        for interface in ['SerpApiSearchMetadata','SerpApiOrganicResult','SerpApiSearchResponse','SerpApiExtractResponse','SerpApiPixelPositionResponse','SerpApiLocation','SerpApiAccountResponse','SerpApiUploadImageResponse']:
            match=re.search(r'export interface '+interface+r'[^\{]*\{(.*?)(?:\n\}|\}\n)',serp_ts,re.S)
            props={}
            if match:
                for k,opt,t in re.findall(r'(?:^|[;\n])\s*(\w+)(\?)?: ([^;\n]+)',match[1]):
                    if t=='string':s={'type':'string'}
                    elif t=='number':s={'type':'number'}
                    elif t=='boolean':s={'type':'boolean'}
                    elif t.startswith('readonly ')and t.endswith('[]'):
                        typename=t[9:-2];s={'type':'array','items':{'$ref':'#/components/schemas/'+typename}if typename.startswith('SerpApi')else{}}
                    elif t.startswith('SerpApi'):s={'$ref':'#/components/schemas/'+t}
                    else:s={}
                    props[k]=s
            schema={'type':'object','properties':props,'required':[]};docs['serpapi']['components']['schemas'][interface]=schema
        # Register stable field aliases under their public names.
        for n,schema in docs['serpapi']['components']['schemas'].items():e.alias('serpapi',schema,n)
    generated='// @generated by scripts/generate.py. Do not edit. Original public schemas and attribution: retained/ and SOURCES.json.\nuse super::*;\nuse serde::{Serialize, Deserialize};\n'
    generated+=e.finish()+'\n'+'\n'.join(input_defs)+'\npub static OPERATIONS: &[Operation] = &[\n'+'\n'.join(operations)+'\n];\n'
    generated+='#[derive(Clone)]\npub struct '+title+'Client { inner: NativeClient }\nimpl '+title+'Client {\npub fn new(api_key:impl Into<String>)->Result<Self>{ Ok(Self{inner:NativeClient::new('+q(provider)+',api_key)?}) }\npub fn with_transport(api_key:impl Into<String>,config:ClientConfig,transport:std::sync::Arc<dyn Transport>)->Result<Self>{Ok(Self{inner:NativeClient::with_transport('+q(provider)+',api_key,config,transport)?})}\npub fn with_team_api_key(mut self,key:impl Into<String>)->Result<Self>{self.inner=self.inner.with_team_api_key(key)?;Ok(self)}\n'
    if provider=='tavily':generated+='pub fn keyless(config:ClientConfig,transport:std::sync::Arc<dyn Transport>)->Result<Self>{Ok(Self{inner:NativeClient::keyless(config,transport)?})}\n'
    generated+='\n'.join(methods)+'\n}\n'
    outputs['src/native/'+provider+'.rs']=generated
outputs['tests/generated_bindings.rs']=''.join(binding_tests).replace('use serde_json::{json,Value};','use serde_json::json;')
# Rustfmt is part of generation, so check mode compares canonical files exactly.
for name,value in list(outputs.items()):
    if name.endswith('.rs'):
        result=subprocess.run(['rustfmt','--edition','2024'],input=value,text=True,capture_output=True)
        if result.returncode:raise SystemExit(result.stderr)
        outputs[name]=result.stdout
outputs['src/native/generated.rs']='// @generated by scripts/generate.py\n'+''.join('pub mod '+p+';\npub use '+p+'::'+titles.get(p,pas(p))+'Client;\n'for p in providers)+'pub const OPERATION_COUNT: usize = '+str(len(manifest))+';\n'
outputs['retained/operations.json']=json.dumps(manifest,indent=2)+'\n'
outputs['SOURCES.json']=json.dumps({'schemaVersion':1,'description':'Public retained schemas and operation tables; no live provider verification. Generated structs preserve supported fields, unions, and forward-compatible unknown data.','inputs':dict(sorted(inputs.items())),'operations':len(manifest)},indent=2)+'\n'
if len(manifest)!=493:raise RuntimeError(('expected 493 operations',len(manifest)))
for name,value in outputs.items():
    p=HERE/name
    if CHECK:
        if not p.exists()or p.read_text()!=value:raise SystemExit('Generated file is stale: '+str(p))
    else:
        p.parent.mkdir(parents=True,exist_ok=True)
        if not p.exists()or p.read_text()!=value:p.write_text(value)
print(('Checked'if CHECK else 'Generated'),len(manifest),'native operations;',len(outputs),'files')
