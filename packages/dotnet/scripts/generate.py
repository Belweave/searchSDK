#!/usr/bin/env python3
"""Deterministic offline C# native bindings. Writes only this package. See SOURCES.md."""
import pathlib,json,re,hashlib,sys,ast,subprocess,collections,os,shutil
HERE=pathlib.Path(__file__).resolve().parents[1];ROOT=HERE.parents[1];A=ROOT/'scripts/providers-a';B=ROOT/'scripts/providers-b';OUT=HERE/'src/SearchSdk/Generated';CHECK='--check'in sys.argv
inputs={}
def read(p):
 data=p.read_bytes();inputs[str(p.relative_to(ROOT))]=hashlib.sha256(data).hexdigest();return data.decode()
def load(p):return json.loads(read(p))
def pas(s):
 v=''.join(x[:1].upper()+x[1:]for x in re.split('[^A-Za-z0-9]+',s)if x);return ('N'+v)if v[:1].isdigit()else v or 'Value'
def lit(s):return json.dumps(s,ensure_ascii=True)
def write(p,text):
 if CHECK:
  if not p.exists()or p.read_text()!=text:raise SystemExit('Stale generated file: '+str(p))
 else:p.write_text(text)
# Check retained snapshot integrity before deriving anything.
for source in load(A/'provenance.json')['sources']:
 if 'artifact'in source:
  p=A/source['artifact'];read(p)
  if hashlib.sha256(p.read_bytes()).hexdigest()!=source['artifactSha256']:raise SystemExit('Snapshot digest mismatch '+str(p))
for source in load(B/'provenance.json')['sources']:
 p=B/source['file'];read(p)
 if hashlib.sha256(p.read_bytes()).hexdigest()!=source['sha256']:raise SystemExit('Snapshot digest mismatch '+str(p))
# Brave's retained API tables are transformed using the same documented schema adapter,
# evaluated without its import or final generator invocation (which writes the TS package).
brave_source=read(A/'brave.py');tree=ast.parse(brave_source);nodes=[n for n in tree.body if not isinstance(n,(ast.ImportFrom,ast.Expr))];ns={'J':lambda n:load(A/'fixtures'/(n+'.json'))};exec(compile(ast.Module(body=nodes,type_ignores=[]),str(A/'brave.py'),'exec'),ns)
brave={key:spec for key,spec,_ in ns['specs']}
specs={}
for p in sorted((A/'fixtures').glob('*.json')):
 d=load(p)
 if isinstance(d,dict)and 'paths'in d:specs['a:'+p.stem]=d
for k,d in brave.items():specs['a:'+k]=d
for p in sorted((B/'snapshots').iterdir()):
 try:d=load(p)
 except (UnicodeDecodeError,json.JSONDecodeError):continue
 if isinstance(d,dict)and 'paths'in d:specs['b:'+p.name]=d
# Only SerpAPI has no retained OpenAPI. Parse its attributed TypeScript interfaces with TS's AST.
read(ROOT/'packages/sdk/src/native-serpapi.ts');read(HERE/'scripts/serpapi-schema.mjs')
node=os.environ.get('NODE') or shutil.which('node')
if not node:raise SystemExit('Node is required: set NODE or add Node from .nvmrc to PATH')
serp=json.loads(subprocess.check_output([str(node),str(HERE/'scripts/serpapi-schema.mjs')],cwd=ROOT));specs['serpapi']=serp
ops=[]
for o in load(A/'operations.json')['operations']:
 ops.append({**o,'method':o['verb'],'response':o['mode'],'spec':'a:'+o.get('key',''),'requiredBody':o.get('bodyRequired',False)})
for p in sorted((B/'catalogs').glob('*-operations.json')):
 provider=p.name.removesuffix('-operations.json')
 for o in load(p):
  if provider=='serpapi': specname='serpapi'
  else:
   candidates=[(name,d)for name,d in specs.items()if name.startswith('b:')and o['path']in d['paths']and o['method'].lower()in d['paths'][o['path']]and (name.startswith('b:p-')if provider=='perplexity'else name.startswith('b:you-')if provider=='you'else name.startswith('b:'+('wonder'if provider=='wondersearch'else provider)))]
   if len(candidates)!=1:raise SystemExit('Ambiguous schema '+str(o)+' '+str([n for n,d in candidates]))
   specname=candidates[0][0]
  ops.append({**o,'provider':provider,'spec':specname})
assert len(ops)==493,len(ops)

def resolve(s,d):
 seen=set()
 while isinstance(s,dict)and '$ref'in s:
  ref=s['$ref']
  if ref in seen:return {}
  seen.add(ref);cur=d
  for k in ref.lstrip('#/').split('/'):cur=cur[k.replace('~1','/').replace('~0','~')]
  s=cur
 return s if isinstance(s,dict)else {}
def merge(s,d,seen=None):
 s=resolve(s,d)
 if 'allOf'not in s:return s
 props=dict(s.get('properties',{}));required=list(s.get('required',[]));other={k:v for k,v in s.items()if k not in ['allOf','properties','required']}
 for part in s['allOf']:
  r=resolve(part,d)
  # Conservative recursive allOf fallback prevents infinitely recursive models.
  if r is s:continue
  m=merge(r,d)if 'allOf'in r else r
  props.update(m.get('properties',{}));required+=m.get('required',[])
 return {**other,'type':'object','properties':props,'required':list(dict.fromkeys(required))}if props else {}
class Models:
 def __init__(self,provider):self.provider=provider;self.defs={};self.cache={};self.names=set()
 def typ(self,s,d,name,depth=0):
  if not isinstance(s,dict) or depth>12:return 'JsonElement'
  if '$ref'in s:
   component=pas(s['$ref'].split('/')[-1]);prefix='SerpApi'if self.provider=='serpapi'else pas(self.provider);name=component if component.startswith(prefix)else prefix+'Schema'+component;s=resolve(s,d)
  s=merge(s,d)
  union=s.get('oneOf',s.get('anyOf'))
  # Object-level alternatives often express required-field rules over shared properties.
  # Retain that shared typed object instead of erasing its known wire fields.
  if union and s.get('properties'):
   props=dict(s['properties'])
   for branch in union:props.update(resolve(branch,d).get('properties',{}))
   s={k:v for k,v in s.items()if k not in ['oneOf','anyOf']};s['properties']=props;union=None
  if union:
   nonnull=[x for x in union if resolve(x,d).get('type')!='null']
   simple=[resolve(x,d).get('type')for x in nonnull]
   if nonnull and all(x in ['string','number','integer','boolean']for x in simple)and len(set(simple))==1:return {'string':'string','number':'double','integer':'long','boolean':'bool'}[simple[0]]
   branches=list(dict.fromkeys(self.typ(x,d,name+'Variant'+str(i+1),depth+1) for i,x in enumerate(nonnull)))
   if not branches:return 'JsonElement'
   out=branches[-1]
   for branch in reversed(branches[:-1]):out='NativeUnion<'+branch+', '+out+'>'
   return out
  t=s.get('type')
  if isinstance(t,list):
   types=[v for v in t if v!='null'];return self.typ({**s,'type':types[0]},d,name,depth)if len(types)==1 else 'JsonElement'
  if 'const'in s:t='boolean'if isinstance(s['const'],bool)else 'string'if isinstance(s['const'],str)else 'number'
  if s.get('enum')and not t:t='string'if all(isinstance(x,str)or x is None for x in s['enum'])else None
  if t in ['string','integer','number','boolean']:return {'string':'string','integer':'long','number':'double','boolean':'bool'}[t]
  if t=='array':return 'List<'+self.typ(s.get('items',{}),d,name+'Item',depth+1)+'>'
  if t=='object'or 'properties'in s:
   props=s.get('properties',{})
   if not props:return 'Dictionary<string, JsonElement>'
   key=(id(d),json.dumps(s,sort_keys=True))
   if key in self.cache:return self.cache[key]
   base=name;i=2
   while name in self.names:name=base+str(i);i+=1
   self.cache[key]=name;self.names.add(name);self.defs[name]=''
   lines=['/// <summary>Provider wire object; unknown fields are retained in AdditionalProperties.</summary>',f'public sealed class {name} : NativeModel','{']
   used=set()
   for k,v in props.items():
    field=pas(k)
    while field in used or field in [name,'AdditionalProperties']:field+='Field'
    used.add(field);typ=self.typ(v,d,name+field,depth+1);desc=(v.get('description','')if isinstance(v,dict)else '')
    constraints={x:v[x]for x in ['enum','minimum','maximum','minLength','maxLength','format']if isinstance(v,dict)and x in v}
    if desc or constraints:lines.append('    /// <summary>'+re.sub(r'\s+',' ',desc+' '+str(constraints))[:500].replace('&','&amp;').replace('<','&lt;').replace('>','&gt;')+'</summary>')
    lines.append('    [JsonPropertyName('+lit(k)+')]')
    # Required source members are checked by STJ during deserialization, including scalars.
    if k in s.get('required',[]):lines.append('    [JsonRequired]')
    lines.append(f'    public {typ}? {field} {{ get; set; }}')
   lines.append('}');self.defs[name]='\n'.join(lines);return name
  return 'JsonElement'

all_catalog=[];stats={}
for provider,group in __import__('itertools').groupby(sorted(ops,key=lambda o:o['provider']),key=lambda o:o['provider']):
 group=list(group);models=Models(provider);title='SerpApi'if provider=='serpapi'else pas(provider);methods=[];entries=[]
 for o in group:
  name=o['name'];stem=title+pas(name);d=specs.get(o['spec'],{});path=o['path'];verb=o['method'];mode=o['response'];item=d.get('paths',{}).get(path,{});operation=resolve(item.get(verb.lower(),{}),d)
  params=[resolve(x,d)for x in item.get('parameters',[])+operation.get('parameters',[])];rb=resolve(operation.get('requestBody',{}),d);content=rb.get('content',{});body=content.get('application/json',{}).get('schema');rs=[]
  for status,r in operation.get('responses',{}).items():
   if str(status).startswith('2'):
    for ct,v in resolve(r,d).get('content',{}).items():
     if ct=='application/json'or ct in ['searchResults','sourcedAnswer','structured']:
      if v.get('schema',{}) not in rs:rs.append(v.get('schema',{}))
  response=rs[0]if len(rs)==1 else {'oneOf':rs}if rs else {}
  base=o.get('base')or(operation.get('servers')or item.get('servers')or d.get('servers')or[{'url':'https://serpapi.com'}])[0]['url'].rstrip('/')
  if provider=='tavily'and name=='paidSearch':
   search=next(x for x in group if x['name']=='search');sd=specs[search['spec']];sop=sd['paths'][search['path']]['post'];body=sop['requestBody']['content']['application/json']['schema'];rs2=next(iter(sop['responses'].values()))['content']['application/json']['schema'];d=sd;response=rs2
  if provider=='context'and name in ['logoUrl','headLogo']:
   params=[{'in':'query','name':n,'required':n in ['publicClientId','domain'],'schema':{'type':'string'}}for n in ['publicClientId','domain','theme','type']]
  if provider=='serpapi':
   sd=serp['components']['schemas'];ref=lambda n:{'$ref':'#/components/schemas/'+n}
   if name in ['search','searchHtml','searchMarkdown','searchPixelPositions','google']:queryschema=ref('SerpApiCommonSearchQuery'if name=='google'else 'SerpApiSearchQuery')
   elif name in ['extract','extractMarkdown']:queryschema=ref('SerpApiExtractQuery')
   elif name=='locations':queryschema={'type':'object','properties':{'q':{'type':'string'},'limit':{'type':'integer'}}}
   else:queryschema=None
   params=[{'name':n,'in':'path','required':True,'schema':{'type':'string'}}for n in re.findall(r'\{([^{}]+)\}',path)]
   response=ref('SerpApiLocation')if name=='locations'else ref('SerpApiAccountResponse')if name=='account'else ref('SerpApiUploadImageResponse')if name=='uploadImage'else ref('SerpApiPixelPositionResponse')if 'PixelPositions'in name else ref('SerpApiExtractResponse')if name.startswith('extract')else ref('SerpApiSearchResponse')
   if name=='locations':response={'type':'array','items':response}
  else:queryschema=None
  schemas={};requiredQuery=[];requiredHeaders=[];comma=[]
  for loc in ['path','query']:
   rows=[p for p in params if p.get('in')==loc];s={'type':'object','properties':{p['name']:p.get('schema',{})for p in rows},'required':[p['name']for p in rows if p.get('required')]}
   if loc=='query':
    requiredQuery=s['required'];comma=[p['name']for p in rows if p.get('explode')is False or provider=='context'and resolve(p.get('schema',{}),d).get('type')=='array']
    if queryschema:s=queryschema
   schemas[loc]=models.typ(s,d,stem+pas(loc))if rows or loc=='query'and queryschema else None
  requiredHeaders=[p['name']for p in params if p.get('in')=='header'and p.get('required')and p['name'].lower()not in ['authorization','x-api-key','x-subscription-token']and p['name']not in o.get('headers',{})]
  bodytype=models.typ(body,d,stem+'Body')if body is not None else None
  resulttype={'text':'string','empty':'byte[]','bytes':'byte[]','raw':'RawResponse','sse':'ServerSentEvent','embedding-url':'string'}.get(mode)or models.typ(response,d,stem+'Result')
  inputname=stem+'Input';inputlines=[f'public sealed class {inputname}','{']
  for loc in ['path','query']:
   if schemas[loc]:inputlines.append(f'    public {schemas[loc]}? {pas(loc)} {{ get; init; }}')
  if bodytype:inputlines.append(f'    public {bodytype}? Body {{ get; init; }}')
  inputlines+=['    public IReadOnlyDictionary<string,string>? Headers { get; init; }','    public TimeSpan? Timeout { get; init; }']
  raw=bool(content and body is None)or provider=='serpapi'and name=='uploadImage'
  if raw:inputlines+=['    public byte[]? RawBody { get; init; }','    public string? ContentType { get; init; }','    public IReadOnlyList<MultipartPart>? Multipart { get; init; }']
  inputlines+=['}'];models.defs[inputname]='\n'.join(inputlines)
  arg=f'Typed({"input.Path"if schemas["path"]else "null"}, {"input.Query"if schemas["query"]else "null"}, {"input.Body"if bodytype else "null"}, input.Headers, {"input.RawBody"if raw else "null"}, {"input.Multipart"if raw else "null"}, input.Timeout{", input.ContentType"if raw else ""})'
  if mode=='embedding-url':methods.append('    /// <summary>Public embedding URL; no download, storage, or rehosting.</summary>\n    public string LogoUrl('+inputname+' input) => ContextLogo.Url((input ?? throw new SearchException("invalid_request")).Query);')
  else:
   sig=f'IAsyncEnumerable<ServerSentEvent>'if mode=='sse'else f'Task<NativeResponse<{resulttype}>>'
   expr=f'StreamAsync({lit(name)}, {arg}, cancellationToken)'if mode=='sse'else f'CallAsync<{resulttype}>({lit(name)}, {arg}, cancellationToken)'
   methods.append(f'    /// <summary>{verb} {base}{path}. Source: {o["source"].replace("&","&amp;")}</summary>\n    public {sig} {pas(name)}Async({inputname} input, CancellationToken cancellationToken = default) => input is null ? throw new SearchException("invalid_request") : {expr};')
  bodyrequired=o.get('requiredBody',False)or rb.get('required',False)or raw or provider=='tavily'and name=='paidSearch'
  hasstream=o.get('streamfield',False)or 'stream'in resolve(body,d).get('properties',{})if body else o.get('streamfield',False)
  headers=o.get('headers',{});contenttype=next(iter(content),'application/octet-stream')if raw else None
  entry={'Provider':provider,'Name':name,'Method':verb,'BaseUrl':base,'Path':path,'Mode':mode,'Source':o['source'],'BodyRequired':bodyrequired,'RequiredQuery':requiredQuery,'RequiredHeaders':requiredHeaders,'CommaQuery':comma,'Headers':headers,'HasStream':hasstream,'ContentType':contenttype}
  all_catalog.append(entry)
  entries.append('        new('+', '.join(lit(entry[k])for k in ['Provider','Name','Method','BaseUrl','Path','Mode','Source'])+'){ BodyRequired='+str(bool(bodyrequired)).lower()+', RequiredQuery=['+', '.join(lit(x)for x in requiredQuery)+'], RequiredHeaders=['+', '.join(lit(x)for x in requiredHeaders)+'], CommaQuery=['+', '.join(lit(x)for x in comma)+'], HasStream='+str(bool(hasstream)).lower()+', ContentType='+('null'if contenttype is None else lit(contenttype))+', Headers=new Dictionary<string,string>(){'+','.join('['+lit(k)+']='+lit(v)for k,v in headers.items())+'}.ToFrozenDictionary(StringComparer.OrdinalIgnoreCase) },')
 code='// Generated by packages/dotnet/scripts/generate.py; DO NOT EDIT.\n#nullable enable\nusing System.Collections.Frozen;\nusing System.Text.Json;\nusing System.Text.Json.Serialization;\nnamespace SearchSdk;\n\n'+'\n\n'.join(models.defs.values())+'\n\n'+f'public sealed class {title}Client : NativeClient\n{{\n    public {title}Client(string? apiKey, SearchTransport transport, string? teamApiKey=null) : base({lit(provider)},apiKey,transport,teamApiKey) {{ }}\n'+'\n'.join(methods)+'\n}\n\npublic static partial class NativeCatalog\n{\n    internal static readonly NativeOperation[] '+title+'Operations = [\n'+'\n'.join(entries)+'\n    ];\n}\n'
 write(OUT/(title+'.g.cs'),code);stats[provider]={'operations':len(group),'models':len(models.defs)}
# The logo helper intentionally never downloads provider images.

# Query schema is deduplicated; discover its actual type from generated text.
ctx=(OUT/'Context.g.cs').read_text();logo_type=re.search(r'class ContextLogoUrlInput\s*\{\s*public ([\w]+)\? Query',ctx).group(1)
helper=f'''// Generated; see generate.py and SOURCES.md.
#nullable enable
namespace SearchSdk;
internal static class ContextLogo
{{
    internal static string Url({logo_type}? query)
    {{
        if(query is null || string.IsNullOrWhiteSpace(query.PublicClientId) || string.IsNullOrWhiteSpace(query.Domain) || query.Theme is not null and not ("light" or "dark") || query.Type is not null and not ("icon" or "wordmark") || query.AdditionalProperties?.Count > 0) throw new SearchException("invalid_request");
        return "https://logos.context.dev/?" + NativeClient.QueryString(System.Text.Json.JsonSerializer.SerializeToNode(query,Wire.Json)!.AsObject(),[]);
    }}
}}
public static partial class NativeCatalog
{{
    private static readonly Lazy<IReadOnlyList<NativeOperation>> All = new(() => System.Array.AsReadOnly(new NativeOperation[][] {{ {', '.join(('SerpApi'if p=='serpapi'else pas(p))+'Operations!'for p in stats)} }}.SelectMany(x=>x).ToArray()));
    public static IReadOnlyList<NativeOperation> Operations => All.Value;
}}
'''
write(OUT/'Catalog.g.cs',helper)
manifest={'schemaVersion':1,'snapshotDate':'2026-10-22','generators':['scripts/providers-a','scripts/providers-b'],'inputs':dict(sorted(inputs.items())),'providers':stats,'operations':all_catalog}
write(HERE/'native-manifest.json',json.dumps(manifest,indent=2,sort_keys=True)+'\n')
print(('Checked'if CHECK else 'Generated')+f' {len(ops)} operations across {len(stats)} providers; '+str(sum(s['models']for s in stats.values()))+' typed models/inputs.')
