import json,re,pathlib,hashlib,copy,sys,runpy
sys.dont_write_bytecode = True
from extensions import extend
ROOT = pathlib.Path(__file__).resolve().parent
R = ROOT / "fixtures"
OUT = ROOT.parents[1] / "packages" / "sdk" / "src"
CHECK = "--check" in sys.argv
CATALOG = []
def write_generated(path, text):
 if CHECK:
  if not path.exists() or path.read_text() != text:raise SystemExit("Generated file is stale: " + str(path))
 else:path.write_text(text)
def verify_snapshots():
 manifest=json.loads((ROOT / "provenance.json").read_text())
 for source in manifest["sources"]:
  if "artifact" not in source:continue
  artifact=ROOT / source["artifact"]
  if hashlib.sha256(artifact.read_bytes()).hexdigest()!=source["artifactSha256"]:raise SystemExit("Snapshot digest mismatch: " + str(artifact))
J=lambda n:json.loads((R/(n+'.json')).read_text())
def pas(s):return ''.join(x[:1].upper()+x[1:] for x in re.split(r'[^a-zA-Z0-9]+',s) if x)
def camel(s):v=pas(s);return v[:1].lower()+v[1:]
def quote(s):return json.dumps(s,ensure_ascii=False)
def descriptor(o):
 value={"id":o["name"],"method":o["verb"],"path":o["path"],"retryable":o["verb"]=="GET" and o["mode"]!="sse"}
 if o["mode"]!="json":value["response"]="text" if o["mode"]=="empty" else o["mode"]
 raw=json.dumps(value)
 if o["headers"]:raw=raw[:-1]+', "headers": Object.freeze('+json.dumps(o["headers"])+') }'
 return 'Object.freeze('+raw+')'
METHODS={'get','post','delete','patch','put','head'}
class Gen:
 def __init__(self,provider,prefix,specs):self.provider=provider;self.prefix=prefix;self.specs=specs;self.defs={};self.queue=[];self.current=None;self.names={};self.operations=[];self.aliases=[]
 def resolve(self,s):
  if isinstance(s,dict) and '$ref' in s:
   v=self.current
   for k in s['$ref'].lstrip('#/').split('/'):v=v[k.replace('~1','/').replace('~0','~')]
   return v
  return s
 def refname(self,ref):
  key=(id(self.current),ref)
  if key not in self.names:
   basename=self.prefix+'Schema'+pas(ref.split('/')[-1]);name=basename;i=2
   while name in self.defs and self.defs[name][1]!=self.resolve({'$ref':ref}):name=basename+str(i);i+=1
   self.names[key]=name
   if name not in self.defs:self.defs[name]=(self.current,self.resolve({'$ref':ref}));self.queue.append(name)
  return self.names[key]
 def typ(self,s,depth=0,inherited=None):
  if s is True or s is None:return 'unknown'
  if s is False:return 'never'
  if '$ref' in s:return self.refname(s['$ref'])
  if any(k in s for k in ['allOf','oneOf','anyOf']):
   base={k:v for k,v in s.items() if k not in ['allOf','oneOf','anyOf','nullable']}
   props=base.get('properties',inherited or {})
   parts=[]
   if 'type' in base or 'properties' in base or 'additionalProperties' in base:parts.append(self.typ(base,depth,inherited))
   for combinator in ['allOf','oneOf','anyOf']:
    if combinator not in s:continue
    values=[self.typ(x,depth,props) for x in s[combinator]]
    if combinator=='allOf':values=[x for x in values if x!='unknown']; op=' & '
    else:op=' | '
    if values:parts.append('('+op.join('('+v+')' for v in values)+')')
   result=' & '.join(parts) or 'unknown'
   if s.get('nullable'):result='('+result+') | null'
   return result
  if s.get('required') and not s.get('properties') and inherited:
   return self.typ({'type':'object','properties':{k:inherited.get(k,{}) for k in s['required']},'required':s['required']},depth)
  if 'const' in s:return quote(s['const']) if not isinstance(s['const'],bool) else str(s['const']).lower()
  if 'enum' in s:
   v=' | '.join('null' if x is None else str(x).lower() if isinstance(x,bool) else str(x) if isinstance(x,(int,float)) else quote(x) for x in s['enum']) or 'never'
  elif 'oneOf' in s or 'anyOf' in s:v=' | '.join('('+self.typ(x,depth)+')' for x in s.get('oneOf',s.get('anyOf',[]))) or 'unknown'
  elif 'allOf' in s:v=' & '.join('('+self.typ(x,depth)+')' for x in s['allOf']) or 'unknown'
  elif isinstance(s.get('type'),list):v=' | '.join(self.typ({**s,'type':t,'nullable':False},depth) for t in s['type'])
  elif s.get('type') in ['integer','number']:v='number'
  elif s.get('type')=='boolean':v='boolean'
  elif s.get('type')=='null':v='null'
  elif s.get('type')=='string':v='string'
  elif s.get('type')=='array':v='Array<'+self.typ(s.get('items',{}),depth)+'>'
  elif s.get('type')=='object' or 'properties' in s or 'additionalProperties' in s:
   props=s.get('properties',{});req=s.get('required',[]);lines=[]
   for k,val in props.items():
    desc=val.get('description','') if isinstance(val,dict) else ''
    constraints=[]
    for field,label in [('minimum','min'),('maximum','max'),('minLength','minLength'),('maxLength','maxLength'),('maxItems','maxItems'),('format','format')]:
     if isinstance(val,dict) and field in val:constraints.append(label+' '+str(val[field]))
    if desc or constraints:
     desc=re.sub(r'\s+',' ',desc).replace('*/','* /')[:280]
     lines.append('  '*(depth+1)+'/** '+desc+(' ('+', '.join(constraints)+')' if constraints else '')+' */')
    lines.append('  '*(depth+1)+quote(k)+('' if k in req else '?')+': '+self.typ(val,depth+1)+';')
   ap=s.get('additionalProperties')
   if ap is not None and ap is not False:lines.append('  '*(depth+1)+'[key: string]: '+self.typ(ap,depth+1)+';')
   if not lines:v='{ [key: string]: unknown }' if ap is not False else 'Record<string, never>'
   else:v='{\n'+'\n'.join(lines)+'\n'+'  '*depth+'}'
  else:v='unknown'
  if s.get('nullable') and 'null' not in v.split(' | '):v='('+v+') | null'
  return v
 def alias(self,name,s):
  t=self.typ(s)
  if name != t:self.aliases.append('export type '+name+' = '+t+';\n')
  return name
 def opname(self,key,p,m,o):
  op=o.get('operationId')
  if self.provider=='context':return {('/web/search','post'):'search',('/web/scrape','post'):'scrape',('/web/answers','post'):'answers',('/parse','post'):'parse',('/web/urls','get'):'map',('/web/crawl','post'):'crawl',('/web/extract','post'):'extract',('/brand/retrieve','post'):'retrieveBrand',('/brand/search','get'):'searchBrands',('/web/styleguide','get'):'styleguide',('/web/fonts','get'):'fonts',('/web/naics','get'):'classifyNaics',('/web/sic','get'):'classifySic',('/utility/prefetch','post'):'prefetch',('/company/search','post'):'searchCompanies',('/people/enrich','post'):'enrichPerson',('/news/search','post'):'searchNews'}.get((p,m),op or camel(o['summary']))
  if self.provider=='exa':
   if key=='exa-team':return camel(op)
   ren={'listRuns':'listMonitorRuns','getRun':'getMonitorRun','teams-me-get':'getTeamInfo','websets-create':'createWebset','websets-list':'listWebsets','websets-get':'getWebset','websets-update':'updateWebset','websets-delete':'deleteWebset','websets-cancel':'cancelWebset','websets-preview':'previewWebset'}
   if op in ren:return ren[op]
   if '-' in op:
    parts=op.split('-');verb=parts[-1];resources=parts[:-1]
    # Names preserve Websets distinction for monitoring APIs.
    noun={'websets-searches':'WebsetSearch','websets-enrichments':'WebsetEnrichment','websets-items':'WebsetItem','monitors':'WebsetMonitor','monitors-runs':'WebsetMonitorRun','imports':'Import','webhooks':'Webhook','webhooks-attempts':'WebhookAttempt','events':'Event'}['-'.join(resources)]
    return verb+noun+('s' if verb=='list' else '')
   return op
  if self.provider=='tavily':return {'getResearch':'getResearch','createResearch':'research'}.get(op,op or camel(p.strip('/')))
  return op
 def add(self,key,d,src):
  self.current=d
  for p,ms in d['paths'].items():
   for m,o in ms.items():
    if m not in METHODS:continue
    o=self.resolve(o);name=self.opname(key,p,m,o)
    base=(o.get('servers') or ms.get('servers') or d.get('servers'))[0]['url'].rstrip('/')
    params=[self.resolve(x) for x in ms.get('parameters',[])+o.get('parameters',[])]
    rb=self.resolve(o.get('requestBody',{}));content=rb.get('content',{});body=content.get('application/json',{}).get('schema');raw=bool(content and body is None)
    resp={};success_schemas={}
    for status,v in o.get('responses',{}).items():
     if not str(status).startswith('2'):continue
     for media,definition in self.resolve(v).get('content',{}).items():
      schema=definition.get('schema',{});bucket=success_schemas.setdefault(media,[])
      if schema not in bucket:bucket.append(schema)
    for media,schemas in success_schemas.items():resp[media]={'schema':schemas[0] if len(schemas)==1 else {'oneOf':schemas}}
    mode='empty' if not resp else 'json' if 'application/json' in resp else 'sse' if 'text/event-stream' in resp else 'bytes' if any(x.startswith('image/') for x in resp) else 'text'
    variants=[(name,mode)]
    if mode=='json' and 'text/event-stream' in resp:variants.append((name+'Stream','sse'))
    if self.provider=='tavily' and name=='research':
     variants.append(('researchStream','sse'))
     source={'type':'object','properties':{'url':{'type':'string'},'title':{'type':'string'},'favicon':{'type':'string'}},'required':['url','title','favicon']}
     tool={'type':'object','properties':{'name':{'type':'string'},'id':{'type':'string'},'arguments':{'type':'string'},'queries':{'type':'array','items':{'type':'string'}},'sources':{'type':'array','items':source},'parent_tool_call_id':{'type':'string'}},'required':['name','id','arguments']}
     delta={'type':'object','properties':{'role':{'type':'string'},'content':{'oneOf':[{'type':'string'},{'type':'object'}]},'sources':{'type':'array','items':source},'tool_calls':{'type':'object','properties':{'type':{'enum':['tool_call','tool_response']},'tool_call':{'type':'array','items':tool},'tool_response':{'type':'array','items':tool}},'required':['type']}}}
     resp['text/event-stream']={'schema':{'type':'object','properties':{'id':{'type':'string'},'object':{'const':'chat.completion.chunk'},'model':{'type':'string'},'created':{'type':'integer'},'choices':{'type':'array','items':{'type':'object','properties':{'delta':delta},'required':['delta']}}},'required':['id','object','model','created','choices']}}
    for methodname,mode in variants:
     stem=self.prefix+pas(methodname)
     fields=[];required=False;query=[];headers=[];path=[]
     for par in params:
      loc=par.get('in');s=par.get('schema',{});row=(par['name'],s,par.get('required',False))
      if loc=='path':path.append(row)
      if loc=='query':query.append((par['name'],s,par.get('required',False),par))
      if loc=='header' and par['name'].lower() not in ['authorization','x-api-key','x-subscription-token']:headers.append(row)
     def obj(rows):return {'type':'object','properties':{k:s for k,s,*_ in rows},'required':[k for k,s,req,*_ in rows if req]}
     if path:fields.append('path: '+self.alias(stem+'Path',obj(path))+';');required=True
     if query:
      req=any(x[2] for x in query);fields.append('query'+('' if req else '?')+': '+self.alias(stem+'Query',obj(query))+';');required|=req
     if headers:
      # Required API version/beta/Accept tokens are supplied in operation headers below.
      hs=obj(headers);hs['required']=[]
      fields.append('headers?: '+self.alias(stem+'Headers',hs)+' & Readonly<Record<string, string>>;')
     else:fields.append('headers?: Readonly<Record<string, string>>;')
     if body is not None:
      bname=self.alias(stem+'Body',body);actual=self.resolve(body)
      if self.provider=='exa' and name in ['search','answer'] or self.provider=='tavily' and name=='research' or self.provider=='brave' and name=='answers':
       bname='Omit<'+bname+', "stream"> & { stream?: '+('true' if mode=='sse' else 'false')+' }'
      if self.provider=='exa' and name=='search' and mode=='sse':bname+=' & { outputSchema: NonNullable<ExaSchemaSearchRequest["outputSchema"]> }'
      req=rb.get('required',False) or self.requires_body(actual)
      fields.append('body'+('' if req else '?')+': '+bname+';');required|=req
     if raw:fields.append('rawBody: BodyInit;');required=True
     self.aliases.append('export interface '+stem+'Input extends Pick<NativeRequestInput, "signal" | "timeoutMs"> {\n'+'\n'.join('  '+f for f in fields)+'\n}\n')
     if mode=='json':rtype=self.alias(stem+'Response',resp.get('application/json',{}).get('schema',{'type':'null'}))
     elif mode=='sse':
      self.alias(stem+'Payload',resp.get('text/event-stream',{}).get('schema',{}));rtype='AsyncIterable<NativeSSEEvent>'
     else:rtype='Uint8Array' if mode=='bytes' else 'null' if mode=='empty' else 'string'
     beta={}
     for hn,hs,req in headers:
      if req and hn.lower()=='exa-beta':beta[hn]=hs.get('enum',[None])[0]
     if mode=='sse':beta['Accept']='text/event-stream'
     if raw:beta['Content-Type']='application/octet-stream'
     streamfield=body is not None and (self.provider=='exa' and name in ['search','answer'] or self.provider=='tavily' and name=='research' or self.provider=='brave' and name=='answers')
     self.operations.append(dict(name=methodname,stem=stem,key=key,base=base,path=p,verb=m.upper(),mode=mode,rtype=rtype,required=required,query=query,headers=beta,streamfield=streamfield,streamvalue=mode=='sse',source=o.get('x-doc-source',src),summary=o.get('summary',methodname),body=body,raw=raw,inputType=stem+'Input',bodyType=stem+'Body' if body is not None else None,queryType=stem+'Query' if query else None,pathType=stem+'Path' if path else None,pathParameters=[v[0] for v in path],queryParameters=[v[0] for v in query],headerParameters=[v[0] for v in headers],bodyRequired=bool(body is not None and (rb.get('required',False) or self.requires_body(self.resolve(body)))),queryRequired=any(v[2] for v in query)))
 def requires_body(self,s):
  s=self.resolve(s)
  if s.get('required'):return True
  if 'allOf' in s:return any(self.requires_body(v) for v in s['allOf'])
  for k in ['oneOf','anyOf']:
   if s.get(k):return all(self.requires_body(v) for v in s[k])
  return False
 def emit(self):
  for key,d,src in self.specs:self.add(key,d,src)
  defs=[]
  while self.queue:
   n=self.queue.pop(0);self.current,s=self.defs[n];defs.append('export type '+n+' = '+self.typ(s)+';\n')
  options=f'''export interface {self.prefix}ClientOptions extends Omit<NativeTransportConfig, "provider" | "baseUrl" | "headers"> {{
  /** Server-side credential. Never embed it in browser bundles. */
  apiKey: string;
'''+('  /** Separate service credential for the Team Management API. Required only by API-key management methods. */\n  teamApiKey?: string;\n' if self.provider=='exa' else '')+'}\n'
  code='''// Native wire types and operations derived from official provider documentation.
// Sources, access gates, and verification limits: docs/provider-surfaces-a.md.
// Static wire types are not JSON Schema validation: ranges, patterns, and if/then
// constraints remain provider responsibilities; unconstrained source data stays unknown.
import { createNativeTransport } from "./native-transport.js";
import type { NativeOperation, NativeRequestInput, NativeResponse, NativeSSEEvent, NativeTransportConfig } from "./native-transport.js";
import { SearchError } from "./errors.js";

'''+options+'\n'+'\n'.join(defs+self.aliases)
  code+='''
function credential(value: string): string {
  if (typeof value !== "string" || !value.trim() || /[\\u0000-\\u0020\\u007f]/u.test(value)) throw new SearchError("configuration");
  return value;
}
'''
  if any(o['mode']=='empty' for o in self.operations):code+='''
function emptyResult(result: NativeResponse<string>): NativeResponse<null> {
  if (result.data !== "") throw new SearchError("invalid_response");
  return { data: null, metadata: result.metadata };
}
'''
  if any(o['query'] for o in self.operations):code+='''
// OpenAPI form arrays are repeated; explicit explode:false uses commas.
// Deep object query values use bracket notation, matching the provider reference.
function wireQuery(query: object | undefined, comma: readonly string[] = []): NativeRequestInput["query"] {
  if (query === undefined) return undefined;
  const result: Record<string, string | number | boolean | readonly (string | number | boolean)[] | null | undefined> = {};
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) result[key] = comma.includes(key) ? value.join(",") : value;
    else if (typeof value === "object") {
      for (const [child, entry] of Object.entries(value)) {
        if (entry !== null && entry !== undefined) result[`${key}[${child}]`] = entry as string | number | boolean;
      }
    } else result[key] = value;
  }
  return result;
}
'''
  code+='\nexport const '+self.provider+'Operations = Object.freeze({\n'
  for o in self.operations:code+='  '+o['name']+': '+descriptor(o)+',\n'
  code+='} satisfies Readonly<Record<string, NativeOperation>>);\n'
  bases=list(dict.fromkeys(o['base'] for o in self.operations));trans={b:'transport'+str(i) for i,b in enumerate(bases)}
  code+='\n/** Explicit native calls; no auto-pagination, polling, or stream reconnection. */\nexport function create'+self.prefix+'Client(options: '+self.prefix+'ClientOptions) {\n'
  code+='  const { apiKey, '+('teamApiKey, ' if self.provider=='exa' else '')+'...config } = options;\n  const key = credential(apiKey);\n'
  for b,t in trans.items():
   if 'admin-api.exa.ai' in b:
    code+='  let '+t+'Instance: ReturnType<typeof createNativeTransport> | undefined;\n  const '+t+' = () => '+t+'Instance ??= createNativeTransport({ ...config, provider: "exa", baseUrl: '+quote(b)+', headers: { "x-api-key": credential(teamApiKey as string) } });\n'
   else:code+='  const '+t+' = createNativeTransport({ ...config, provider: '+quote(self.provider)+', baseUrl: '+quote(b)+', headers: { '+('Authorization: `Bearer ${key}`' if self.provider in ['context','tavily'] else '"x-api-key": key' if self.provider=='exa' else '"X-Subscription-Token": key' if self.provider=='brave' else '"X-API-Key": key')+' } });\n'
  code+='  return Object.freeze({\n    operations: '+self.provider+'Operations,\n'
  for o in self.operations:
   inp=o['stem']+'Input';signature='input: '+inp+('' if o['required'] else ' = {}')
   code+='    /** '+o['verb']+' '+o['base']+o['path']+' — '+o['summary'].replace('*/','* /')+'. */\n'
   code+='    async '+o['name']+'('+signature+'): Promise<NativeResponse<'+o['rtype']+'>> {\n'
   code+='      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");\n'
   if o['bodyRequired']:code+='      if (input.body === undefined) throw new SearchError("invalid_request");\n'
   if o['body'] is not None:code+='      if (input.body !== undefined && (!input.body || typeof input.body !== "object" || Array.isArray(input.body))) throw new SearchError("invalid_request");\n'
   if o['raw']:code+='      if (input.rawBody === undefined || input.rawBody === null) throw new SearchError("invalid_request");\n'
   if o['queryRequired']:code+='      if (input.query === undefined) throw new SearchError("invalid_request");\n'
   if o['query']:code+='      if (input.query !== undefined && (!input.query || typeof input.query !== "object" || Array.isArray(input.query))) throw new SearchError("invalid_request");\n'
   if self.provider=='exa' and o['name']=='searchStream':code+='      if (!input.body.outputSchema) throw new SearchError("invalid_request");\n'
   if o['streamfield']:
    code+='      if (input.body?.stream !== undefined && input.body.stream !== '+str(o['streamvalue']).lower()+') throw new SearchError("unsupported_option");\n'
   items=['...input']
   if o['query']:
    comma=[k for k,s,req,par in o['query'] if par.get('explode') is False or self.provider=='context' and self.resolve_for(o['key'],s).get('type')=='array']
    items.append('query: wireQuery(input.query, '+json.dumps(comma)+') ?? {}')
   if o['streamfield']:items.append('body: { ...input.body, stream: '+str(o['streamvalue']).lower()+' }')
   if o['mode']=='sse':items.append('headers: { ...input.headers, Accept: "text/event-stream" }')
   transport=trans[o['base']]+('()' if 'admin-api.exa.ai' in o['base'] else '')
   generic='' if o['mode'] in ['sse','bytes'] else '<'+('string' if o['mode']=='empty' else o['rtype'])+'>'
   code+='      return '+transport+'.request'+generic+'('+self.provider+'Operations.'+o['name']+', { '+', '.join(items)+' })'+('.then(emptyResult)' if o['mode']=='empty' else '')+';\n    },\n'
  code+='  });\n}\n\nexport type '+self.prefix+'Client = ReturnType<typeof create'+self.prefix+'Client>;\n'
  code=extend(self.provider,code)
  write_generated(OUT/('native-'+self.provider+'.ts'),code)
  CATALOG.extend([dict(provider=self.provider,factory='create'+self.prefix+'Client',**{k:v for k,v in o.items() if k not in ['body','query']}) for o in self.operations])
  print(self.provider,len(self.operations),'methods',len(code.splitlines()),'lines')
 def resolve_for(self,key,s):
  old=self.current;self.current=next(d for k,d,src in self.specs if k==key);v=self.resolve(s);self.current=old;return v

if __name__=='__main__':
 verify_snapshots()
 for provider,prefix,specs in [
  ('context','Context',[('context',J('context'),'https://docs.context.dev/openapi.json')]),
  ('tinyfish','Tinyfish',[(n,J(n),'https://agent.tinyfish.ai/v1/openapi/'+n.split('-')[1]) for n in ['tinyfish-main','tinyfish-search','tinyfish-fetch','tinyfish-browser','tinyfish-monitor','tinyfish-research']]),
  ('exa','Exa',[(n,J(n),'https://exa.ai/docs/'+('exa-spec.yaml' if n=='exa' else 'team-management-spec.yaml')) for n in ['exa','exa-team']]),
  ('tavily','Tavily',[(f.stem,json.loads(f.read_text()),'https://docs.tavily.com/'+('documentation/enterprise/' if f.stem.split('tavily-')[1] in ['generate-keys','deactivate-keys','key-info','org-usage'] else 'documentation/api-reference/endpoint/')+f.stem.split('tavily-')[1]+'.md') for f in sorted(f for f in R.glob('tavily-*.json') if not f.name.endswith('-operations.json'))]),
 ]:Gen(provider,prefix,specs).emit()

 # Brave publishes tables, not a downloadable OpenAPI spec.
 sys.modules["generate"] = sys.modules[__name__]
 runpy.run_path(str(ROOT / "brave.py"))
 CATALOG.extend([
  {"provider":"context","factory":"createContextClient","name":"logoUrl","inputType":"ContextLogoQuery","verb":"GET","base":"https://logos.context.dev","path":"/","mode":"embedding-url","stem":"ContextLogo","rtype":"string","source":"https://docs.context.dev/brand/logo-link.md","summary":"Build direct image embedding URL; no download"},
  {"provider":"context","factory":"createContextClient","name":"headLogo","inputType":"ContextHeadLogoInput","queryType":"ContextLogoQuery","verb":"HEAD","base":"https://logos.context.dev","path":"/","mode":"raw","stem":"ContextHeadLogo","rtype":"Response","source":"https://docs.context.dev/brand/logo-link.md","summary":"Inspect public image headers"},
  {"provider":"tavily","factory":"createTavilyClient","name":"getPaymentPricing","inputType":"TavilyPaymentPricingInput","verb":"GET","base":"https://x402.tavily.com","path":"/.well-known/pricing","mode":"raw","stem":"TavilyPaymentPricing","rtype":"Response","source":"https://docs.tavily.com/documentation/machine-payments/x402.md","summary":"Read machine-readable payment pricing; no published stable schema"},
  {"provider":"tavily","factory":"createTavilyClient","name":"paidSearch","inputType":"TavilyPaidSearchInput","bodyType":"TavilySearchBody","verb":"POST","base":"https://x402.tavily.com","path":"/search","mode":"json","stem":"TavilyPaidSearch","rtype":"TavilySearchResponse","source":"https://docs.tavily.com/documentation/machine-payments/x402.md","summary":"Search using externally supplied payment authorization"},
 ])
 write_generated(ROOT / "operations.json", json.dumps({"schemaVersion":1,"snapshotDate":"2026-10-22","operations":CATALOG},ensure_ascii=False,indent=2)+"\n")
