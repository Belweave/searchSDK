import json,re,pathlib,copy
ROOT=pathlib.Path(__file__).resolve().parents[2] / 'packages/sdk/src'
TMP=pathlib.Path(__file__).resolve().parent / 'snapshots'
def camel(s):
 words=re.findall(r'[A-Z]?[a-z]+|[A-Z]+(?=[A-Z]|$)|[0-9]+',s.replace('_',' ').replace('-',' '))
 return ''.join(w[:1].upper()+w[1:] for w in words)
def ident(s):return re.sub('[^A-Za-z0-9_$]','_',s)
def literal(v):return json.dumps(v,ensure_ascii=False,separators=(',',':'))
class Spec:
 def __init__(self,file,prefix,source=None):
  self.j=json.loads((TMP/file).read_text());self.prefix=prefix;self.source=source or file;self.schemas=self.j.get('components',{}).get('schemas',{})
 def resolve(self,s):
  while '$ref'in s:
   r=s['$ref'];cur=self.j
   for p in r.removeprefix('#/').split('/'):cur=cur[p.replace('~1','/').replace('~0','~')]
   s=cur
  return s
 def typ(self,s,indent=0):
  if not isinstance(s,dict):return 'unknown'
  if '$ref'in s:
   name=s['$ref'].split('/')[-1]
   if '/schemas/' in s['$ref']:return ident(self.prefix+name)
   return self.typ(self.resolve(s),indent)
  if 'const'in s:return literal(s['const'])
  if s.get('enum'):return ' | '.join(literal(x)for x in s['enum'])
  nullable=s.get('nullable',False)
  for key,sep in [('allOf',' & '),('anyOf',' | '),('oneOf',' | ')]:
   if s.get(key):
    ts=[self.typ(x,indent)for x in s[key]]
    if s.get('properties'):ts.append(self.typ({k:v for k,v in s.items()if k!=key},indent))
    return '('+sep.join(ts)+')'+(' | null'if nullable else '')
  t=s.get('type')
  if isinstance(t,list):return ' | '.join(self.typ({**s,'type':x},indent)for x in t)
  if t=='array':return 'ReadonlyArray<'+self.typ(s.get('items',{}),indent)+'>'+(' | null'if nullable else '')
  if t=='object'or 'properties'in s:
   props=s.get('properties',{});req=s.get('required',[])
   if not props:
    ap=s.get('additionalProperties',True)
    out='Record<string, '+(self.typ(ap,indent)if isinstance(ap,dict)else 'unknown')+'>'
   else:
    rows=[]
    for k,v in props.items():rows.append('  '*(indent+1)+literal(k)+(''if k in req else '?')+': '+self.typ(v,indent+1)+';')
    # Forward-compatible response fields stay intact at runtime; open native objects stay open in types.
    if s.get('additionalProperties',True)is not False:rows.append('  '*(indent+1)+'[key: string]: unknown;')
    out='{\n'+'\n'.join(rows)+'\n'+'  '*indent+'}'
   return out+(' | null'if nullable else '')
  return {'string':'string','integer':'number','number':'number','boolean':'boolean','null':'null'}.get(t,'unknown')+(' | null'if nullable and t!='null'else '')

def generate(provider,title,specs,name_overrides={},extra_ops=[]):
 ns=title+'Schemas';ops=[]
 for spec in specs:
  for path,item in spec.j['paths'].items():
   for method,op in item.items():
    if method not in ['get','post','put','patch','delete','head']:continue
    key=(spec.prefix,method,path)
    name=name_overrides.get(key)
    if not name:
     oid=op.get('operationId','')
     if oid and re.fullmatch('[a-zA-Z][a-zA-Z0-9]*',oid):name=oid
     else:
      cap=camel(op.get('summary',oid or method+' '+path));name=cap[:1].lower()+cap[1:]
    if any(x['name']==name for x in ops):raise Exception('Duplicate '+name)
    params=[spec.resolve(p)for p in item.get('parameters',[])+op.get('parameters',[])]
    rb=spec.resolve(op.get('requestBody',{}));content=rb.get('content',{})
    body=content.get('application/json',{}).get('schema')
    raw=bool(content)and body is None
    rawType='FormData' if 'multipart/form-data'in content else 'BodyInit'
    responses=[spec.resolve(r)for status,r in op.get('responses',{}).items()if str(status).startswith('2')]
    rc={ct:val for r in responses for ct,val in r.get('content',{}).items()}
    response='json';rs=[v.get('schema',{})for ct,v in rc.items()if ct=='application/json'or ct in ['searchResults','sourcedAnswer','structured']]
    if not rs:
     if not rc and provider=='perplexity' and name=='revokeAuthToken':response='text'
     elif 'text/event-stream'in rc:response='sse'
     elif any('octet-stream'in ct or v.get('schema',{}).get('format')=='binary'for ct,v in rc.items()):response='bytes'
     elif any(ct.startswith('text/')for ct in rc):response='text'
    out='null'if not rc else spec.typ(rs[0]if len(rs)==1 else {'oneOf':rs})if rs else 'unknown'
    # Treat documented JSON+SSE operations and explicit stream fields as separate named methods.
    bs=spec.resolve(body)if body else {}
    stream='text/event-stream'in rc and bool(rs) or 'stream'in bs.get('properties',{})
    entry=dict(name=name,path=path,method=method.upper(),params=params,body=body,bodyRequired=rb.get('required',False),raw=raw,rawType=rawType,rawContentType=next(iter(content),'application/octet-stream'),response=response,out=out,spec=spec,summary=op.get('summary',''),stream=stream,source=spec.source)
    ops.append(entry)
    if provider=='wondersearch' and method=='get' and path in ['/v1/organizations/{organization_id}', '/v1/workspaces/{workspace_id}', '/v1/drives/{drive_id}', '/v1/drives/{drive_id}/folders/{folder_id}', '/v1/organizations/{organization_id}/invitations/{invitation_id}', '/v1/workspaces/{workspace_id}/default-drive']:
     ops.append({**entry,'name':name+'Raw','response':'raw','summary':entry['summary']+' with response headers'})
    if stream:
     st={**entry,'name':name+'Stream','response':'sse','streamVariant':True};ops.append(st)
 # Generate standalone named aliases plus namespaces with the official fields.
 lines=['/** Official public contracts reviewed 2026-10-22. See docs/provider-surfaces-b.md. */',
 'import { createNativeTransport } from "./native-transport.js";',
 'import type { NativeOperation, NativeRequestInput, NativeTransportConfig, NativeSSEEvent } from "./native-transport.js";',
 'import { adapterOptions } from "./http.js";',
 'import { exactFields } from "./validation.js";',
 'import { SearchError } from "./errors.js";',
 f'export type {title}ClientOptions = Omit<NativeTransportConfig, "provider" | "baseUrl" | "headers"> & {{ apiKey: string }};',
 f'export namespace {ns} {{']
 for s in specs:
  for name,schema in s.schemas.items():lines.append('  export type '+ident(s.prefix+name)+' = '+s.typ(schema,1)+';')
 lines+=['}','']
 def qualify(t):
  # Types emitted outside namespaces refer to native schemas by their exact generated names.
  for s in specs:
   for k in sorted(s.schemas,key=len,reverse=True):
    n=ident(s.prefix+k);t=re.sub(r'(?<![.\w])'+re.escape(n)+r'\b',ns+'.'+n,t)
  return t
 for e in ops:
  n=title+camel(e['name']);e['alias']=n
  req=[];required=False
  for where in ['path','query','header']:
   p=[p for p in e['params']if p['in']==where]
   if not p:continue
   fields=[]
   for v in p:fields.append(literal(v['name'])+(''if v.get('required')else '?')+': '+qualify(e['spec'].typ(v.get('schema',{})))+';')
   a=n+{'path':'Path','query':'Query','header':'Headers'}[where]
   lines.append('export type '+a+' = { '+' '.join(fields)+' };')
   r=any(v.get('required')for v in p);required|=r;field={'header':'headers'}.get(where,where)
   req.append(field+(''if r else '?')+': '+a+';')
  if e['body']is not None:
   typ=qualify(e['spec'].typ(e['body']))
   if e['stream']:
    typ=typ+' & { stream?: '+('true'if e.get('streamVariant')else 'false')+' }'
   lines.append('export type '+n+'Body = '+typ+';')
   req.append('body'+(''if e['bodyRequired']else '?')+': '+n+'Body;');required|=e['bodyRequired']
  if e['raw']:req.append('rawBody: '+e['rawType']+';');required=True
  lines.append('export type '+n+'Input = Pick<NativeRequestInput, "signal" | "timeoutMs"> & { '+' '.join(req)+' };')
  out={'sse':'AsyncIterable<NativeSSEEvent>','bytes':'Uint8Array','text':'string','raw':'Response'}.get(e['response'],qualify(e['out']))
  if provider=='perplexity'and e['name']=='revokeAuthToken':out='null'
  lines.append('export type '+n+'Response = '+out+';')
  e['required']=required
 if not any(any(p['in']=='header'for p in e['params'])for e in ops):
  headerHelper=[]
 else:
  headerHelper=['function withoutNullHeaders(input: Omit<NativeRequestInput, "headers"> & { headers?: Readonly<Record<string, string | null | undefined>> }): NativeRequestInput {', '  const { headers, ...rest } = input;', '  return { ...rest, ...(headers ? { headers: Object.fromEntries(Object.entries(headers).filter((entry): entry is [string, string] => entry[1] !== null && entry[1] !== undefined)) } : {}) };', '}']
 lines+=['', *headerHelper, '',f'export const {provider}Operations = Object.freeze({{']
 for e in ops:
  desc={'id':provider+'.'+e['name'],'method':e['method'],'path':e['path'],'retryable':e['method'] in ['GET','HEAD']}
  if e['response']!='json':desc['response']=e['response']
  if e['raw'] and e['rawType']=='BodyInit':desc['headers']={'Content-Type':e['rawContentType']}
  lines.append('  '+e['name']+': Object.freeze('+literal(desc)+'),')
 lines+=['} satisfies Record<string, NativeOperation>);','',f'export function create{title}Client(options: {title}ClientOptions) {{',
 '  if (!options || typeof options !== "object" || Array.isArray(options)) throw new SearchError("configuration");',
 '  exactFields(options, ["apiKey", "fetch", "timeoutMs", "retry", "maxResponseBytes", "maxConcurrency"], "configuration");',
 '  const { apiKey, fetch } = adapterOptions({ apiKey: options.apiKey, ...(options.fetch !== undefined ? { fetch: options.fetch } : {}) });',
 '  const { timeoutMs, retry, maxResponseBytes, maxConcurrency } = options;',
 '  const config = { fetch, ...(timeoutMs !== undefined ? { timeoutMs } : {}), ...(retry !== undefined ? { retry } : {}),',
 '    ...(maxResponseBytes !== undefined ? { maxResponseBytes } : {}), ...(maxConcurrency !== undefined ? { maxConcurrency } : {}) };']
 bases=list(dict.fromkeys(s.j.get('servers',[{'url':''}])[0]['url'].rstrip('/')for s in specs))
 for i,base in enumerate(bases):
  auth='Authorization: `Bearer ${apiKey}`'if provider in ['perplexity','linkup','firecrawl'] else '"x-api-key": apiKey' if provider=='parallel' else '"X-API-Key": apiKey'
  lines.append(f'  const transport{i} = createNativeTransport({{ ...config, provider: "{provider}", baseUrl: "{base}", headers: {{ {auth} }} }});')
 lines+=['  return Object.freeze({',f'    operations: {provider}Operations,']
 for e in ops:
  a=e['alias'];default=''if e['required']else ' = {}';i=bases.index(e['spec'].j.get('servers',[{'url':''}])[0]['url'].rstrip('/'))
  lines+=['    /** '+e['summary'].replace('*/','')+' */',f'    async {e["name"]}(input: {a}Input{default}) {{']
  lines.append('      if (!input || typeof input !== "object" || Array.isArray(input)) throw new SearchError("invalid_request");')
  if e['bodyRequired'] or e['raw']:lines.append('      if (input.'+('rawBody' if e['raw'] else 'body')+' === undefined) throw new SearchError("invalid_request");')
  for p in e['params']:
   if p['in'] in ['query','header'] and p.get('required'):
    field='headers' if p['in']=='header' else 'query'
    lines.append('      if (input.'+field+'?.['+literal(p['name'])+'] == null) throw new SearchError("invalid_request");')
  hasHeaders=any(p['in']=='header'for p in e['params'])
  if e.get('streamVariant'):arg='{ ...'+('withoutNullHeaders(input)'if hasHeaders else 'input')+', body: { ...input.body, stream: true } }'
  else:
   arg='withoutNullHeaders(input)'if hasHeaders else 'input'
   if e['stream']:lines.append('      if (input.body && (input.body as { stream?: unknown }).stream === true) throw new SearchError("unsupported_option");')
  if provider=='perplexity'and e['name']=='revokeAuthToken':
   lines.append(f'      const response = await transport{i}.request<string>({provider}Operations.{e["name"]}, {arg});')
   lines.append('      if (response.data.length !== 0) throw new SearchError("invalid_response");')
   lines.append('      return { ...response, data: null };')
  else:lines.append(f'      return transport{i}.request<{a}Response>({provider}Operations.{e["name"]}, {arg});')
  lines.append('    },')
 lines+=['  });','}',f'export type {title}Client = ReturnType<typeof create{title}Client>;','']
 (ROOT/('native-'+provider+'.ts')).write_text('\n'.join(lines))
 (pathlib.Path(__file__).resolve().parent/'catalogs'/(provider+'-operations.json')).write_text(json.dumps([{k:v for k,v in e.items()if k in ['name','path','method','response','source','summary']}for e in ops],indent=2))
 print(provider,len(ops),'named operations',len('\n'.join(lines)),'bytes')

if __name__=='__main__':
 p=[Spec('p-openapi','Core','https://docs.perplexity.ai/openapi.json')]+[Spec('p-'+n+'.json',camel(n),'https://docs.perplexity.ai/api-reference/'+{'gateway-chat':'gateway-chat-completions-post','gateway-responses':'gateway-responses-post','gateway-messages':'gateway-messages-post','gateway-models':'gateway-models-get','gateway-model':'gateway-model-get','auth-generate':'generate-auth-token-post','auth-revoke':'revoke-auth-token-post'}[n]+'.md')for n in ['gateway-chat','gateway-responses','gateway-messages','gateway-models','gateway-model','auth-generate','auth-revoke']]
 override={('Core','post','/search'):'search',('Core','post','/v1/sonar'):'chatCompletions',('Core','get','/v1/async/sonar/{api_request}'):'getAsyncChatCompletion',('Core','get','/v1/async/sonar'):'listAsyncChatCompletions',('Core','post','/v1/async/sonar'):'createAsyncChatCompletion',('GatewayModels','get','/router/v1/models'):'listRouterModels',('GatewayModel','get','/router/v1/models/{model}'):'getRouterModel',('GatewayChat','post','/router/v1/chat/completions'):'routerChatCompletions',('GatewayResponses','post','/router/v1/responses'):'routerResponses',('GatewayMessages','post','/router/v1/messages'):'routerMessages'}
 generate('perplexity','Perplexity',p,override)
 generate('parallel','Parallel',[Spec('parallel-openapi','', 'https://docs.parallel.ai/public-openapi.json')],{('','post','/v1/search'):'search',('','post','/v1/images/search'):'imageSearch',('','post','/v1/extract'):'extract'})
 generate('linkup','Linkup',[Spec('linkup-openapi','','https://api.linkup.so/v1/openapi.json')],{('','post','/v1/fetch'):'fetchPage'})
 generate('firecrawl','Firecrawl',[Spec('firecrawl-openapi','','https://docs.firecrawl.dev/api-reference/v2-openapi.json')],{('','post','/search'):'search',('','post','/scrape'):'scrape',('','post','/batch/scrape'):'batchScrape',('','post','/crawl'):'crawl',('','post','/map'):'map',('','post','/extract'):'extract'})
 y=[Spec('you-'+n,camel(n),'https://you.com/docs/openapi/'+n+'.json')for n in ['web-search','contents','answer','research','finance-research','billing','images']]
 generate('you','You',y,{('WebSearch','post','/v1/search'):'search',('FinanceResearch','post','/v1/finance_research'):'financeResearch',('Images','get','/v1/images'):'images'})
