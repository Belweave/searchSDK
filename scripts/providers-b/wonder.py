import pathlib,re,json,sys
sys.path.insert(0,str(pathlib.Path(__file__).resolve().parent))
from generate import generate,Spec,camel
TMP=pathlib.Path(__file__).resolve().parent / 'snapshots'
def typ(t):
 t=t.strip()
 if t.startswith('array of '):return {'type':'array','items':typ(t[9:])}
 if ' or 'in t:
  if t.startswith('UUID string'):return {'anyOf':[{'type':'string'},{'type':'null'}]}
  return {'anyOf':[typ(x)for x in t.split(' or ')]}
 if ','in t and not 'integer'in t and not 'string'in t:return {'type':'string','enum':[x.strip().strip('"')for x in t.split(',')]}
 if t in ['true','false']:return {'const':t=='true'}
 if t=='object':return {'type':'object','properties':{}}
 if t.startswith('integer'):return {'type':'integer'}
 if t.startswith('number'):return {'type':'number'}
 if t=='null':return {'type':'null'}
 if t.startswith('boolean'):return {'type':'boolean'}
 if t.startswith('string')or 'UUID'in t or t.startswith('UTC date') or 'cursor'in t.lower() or 'key UUID'in t or 'API key'in t:return {'type':'string'}
 if t.startswith('"')and t.endswith('"'):return {'const':t[1:-1]}
 if re.fullmatch(r'[a-z_]+',t):return {'const':t}
 return {}
def fields(rows):
 root={'type':'object','properties':{},'required':[]}
 for row in rows:
  field,t,present,*_=row
  parts=field.split('.');cur=root
  for i,p in enumerate(parts):
   arr=p.endswith('[]');p=p.removesuffix('[]')
   if 'properties'not in cur:cur['type']='object';cur['properties']={};cur['required']=[]
   if p not in cur['properties']:cur['properties'][p]={'type':'array','items':{'type':'object','properties':{},'required':[]}}if arr else {}
   if i==len(parts)-1:
    new=typ(t)
    if cur['properties'][p].get('properties')and new.get('type')=='object':new=cur['properties'][p]
    if cur['properties'][p].get('items',{}).get('properties')and new.get('type')=='array':new=cur['properties'][p]
    cur['properties'][p]=new
    if present in ['Yes','Required']and p not in cur.get('required',[]):cur.setdefault('required',[]).append(p)
   cur=cur['properties'][p]
   if arr:cur=cur.setdefault('items',{'type':'object','properties':{},'required':[]})
 return root
paths={};sources={};methodnames={}
def opname(m,p):
 special={('post','/v1/drives/{drive_id}/search'):'searchDrive',('post','/v1/workspaces/{workspace_id}/search'):'searchWorkspace',('get','/v1/drives/{drive_id}/passages/{passage_id}'):'getPassage',('get','/v1/workspaces/{workspace_id}/capabilities'):'getCapabilities',('post','/v1/account/bootstrap'):'bootstrapAccount',('get','/v1/me'):'getMe'}
 if (m,p)in special:return special[m,p]
 parts=p.removeprefix('/v1/').split('/');words=[]
 for i,s in enumerate(parts):
  if s.startswith('{'):continue
  singular=s[:-1]if s.endswith('s')and s not in ['status','limits','metrics','usage','capabilities']else s
  words.append(camel(singular))
 last=parts[-1];plural=not last.startswith('{')and last.endswith('s')and last not in ['status','limits','metrics','capabilities']
 prefix={'get':'list'if plural else 'get','post':'create'if plural else 'post','put':'put','patch':'update','delete':'delete'}[m]
 name=prefix+''.join(words)
 if prefix=='list':name+='s'
 rename={'postOrganizationInvitationResend':'resendOrganizationInvitation','postInvitationPreview':'previewInvitation','postInvitationAccept':'acceptInvitation','putDriveDocument':'replaceDocument','postDriveUploadBatch':'createUploadBatch','postDriveUploadBatchComplete':'completeUploadBatch','postDriveUploadBatchStatus':'getUploadBatchStatus','putDriveUploadContent':'uploadContent','postDriveUploadTransfer':'createUploadTransfer','postDriveUploadComplete':'completeUpload','postOrganizationBillingLimits':'setBillingLimits','postOrganizationBillingPortal':'createBillingPortal','postWorkspaceStorage':'setWorkspaceStorage','postWorkspaceStorageQuote':'quoteWorkspaceStorage','putWorkspaceDefaultDrive':'setDefaultDrive','listDriveIngestionMetrics':'getIngestionMetrics'}
 return rename.get(name,name)
for file in ['wonder-search','wonder-access-api','wonder-content-api','wonder-uploads-api','wonder-usage-and-billing-api']:
 text=(TMP/(file+'.compact')).read_text().splitlines();current=None;table=None;groups=[]
 def save():
  global current,table,groups
  if not current:return
  m,p=current;params=[];bodies=[];response=[]
  for h,rows in groups:
   if h.startswith('Name | Location'):
    for n,loc,t,r in rows:params.append({'name':n,'in':loc,'required':r=='Yes','schema':({'type':'integer' if t.startswith('integer') else 'string'} if loc=='query' else typ(t))})
   elif h.startswith('Field | Type | Presence'):bodies.append(rows)
   elif h.startswith('Field | Type | Present'):response+=rows
  if len(bodies)>1:
   # The second input table expands the preceding array-of-object records.
   for i in range(1,len(bodies)):
    parent=next((r[0]for r in reversed(bodies[0])if r[1]=='array of object'),None)
    if parent:bodies[0]+=[[parent+'[].'+r[0],*r[1:]]for r in bodies[i]]
  body=fields(bodies[0])if bodies else None
  rs=fields(response)if response else {'type':'object','additionalProperties':True}
  op={'operationId':opname(m,p),'summary':opname(m,p),'parameters':params,'responses':{'200':{'content':{'application/json':{'schema':rs}}}}}
  if body:op['requestBody']={'required':True,'content':{'application/json':{'schema':body}}}
  paths.setdefault(p,{})[m]=op;sources[(m,p)]=file
  current=None;groups=[];table=None
 for l in text:
  match=re.match(r'h[23] (GET|POST|PUT|PATCH|DELETE) (/v1/\S+)$',l)
  if l.startswith(('h2 ','h3 ')):
   save()
   if match:current=(match[1].lower(),match[2])
  elif current and ' | 'in l:
   if l.startswith(('Name | Location','Field | Type','Query parameter |')):table=(l,[]);groups.append(table)
   elif table:
    row=l.split(' | ')
    if len(row)>=4:table[1].append(row[:4])
 save()
# All path placeholders are documented identifiers, including prose-only import endpoints.
for p,ops in paths.items():
 for m,op in ops.items():
  for n in re.findall('{([^}]+)}',p):
   if not any(a['in']=='path'and a['name']==n for a in op['parameters']):op['parameters'].append({'name':n,'in':'path','required':True,'schema':{'type':'string'}})

def add(m,p,name,body=None,response=None,headers=[],query=[]):
 op={'operationId':name,'summary':name,'parameters':[{'name':n,'in':'path','required':True,'schema':{'type':'string'}}for n in re.findall('{([^}]+)}',p)]+[{'name':n,'in':'header','required':True,'schema':{'type':'string'}}for n in headers]+query,'responses':{'200':{'content':{'application/json':{'schema':response or {'type':'object'}}}}}}
 if body is not None:op['requestBody']={'required':True,'content':{'application/json':{'schema':body}}}
 paths.setdefault(p,{})[m]=op
 return op
S={'type':'string'};N={'type':'integer'};B={'type':'boolean'};O={'type':'object'}
def obj(props,required=[]):return {'type':'object','properties':props,'required':required}
def arr(items):return {'type':'array','items':items}
fileUpload=paths['/v1/drives/{drive_id}/uploads']['post']['requestBody']['content']['application/json']['schema']
transfer=obj({'transport':{'enum':['proxy','direct']},'url':S,'headers':{'type':'object','additionalProperties':S},'expires_in':N},['transport'])
bulkFile=obj({'key':S,'id':S,'state':S,'transfer':transfer,'document_id':{'type':['string','null']},'operation_id':{'type':['string','null']},'warnings':arr(O),'error_code':{'type':['string','null']},'processing_status':S,'processing_error_code':{'type':['string','null']},'index_snapshot_id':{'type':['string','null']}},[])
for p in ['/v1/drives/{drive_id}/uploads/batch','/v1/drives/{drive_id}/uploads/batch/complete','/v1/drives/{drive_id}/uploads/batch/status']:
 if p.endswith('/batch'):body=obj({'files':arr({'allOf':[fileUpload,obj({'key':S},['key'])]})},['files'])
 elif p.endswith('/complete'):body=obj({'files':arr(obj({'id':S,'transport':{'enum':['direct','proxy']}},['id','transport']))},['files'])
 else:body=obj({'ids':arr(S)},['ids'])
 op=paths[p]['post'];op['requestBody']={'required':True,'content':{'application/json':{'schema':body}}};op['responses']['200']['content']['application/json']['schema']=obj({'files':arr(bulkFile)},['files'])
paths['/v1/drives/{drive_id}/uploads/capabilities']['get']['responses']['200']['content']['application/json']['schema']=obj({'version':N,'max_items':N,'max_body_bytes':N},['version','max_items','max_body_bytes'])
# Prose documents these exact import actions and bodies. Feature availability is organization-dependent.
importRoot='/v1/drives/{drive_id}/imports/{import_id}'
progress=obj({'state':{'enum':['open','sealed','closed']},'complete':B,'chunks':arr(obj({'sequence':N,'state':S,'attempts':N,'last_error':{},'failed_operations':arr(O)},[]))},[])
add('put',importRoot,'createImport',obj({'source_bytes':N,'documents':N},['source_bytes','documents']),progress)
add('get',importRoot,'getImport',response=progress,query=[{'name':'after','in':'query','schema':N},{'name':'limit','in':'query','schema':N}])
add('post',importRoot+'/chunks','declareImportChunks',obj({'chunks':arr(obj({'sequence':N,'sha256':S,'encoded_bytes':N,'source_bytes':N,'documents':N},['sequence','sha256','encoded_bytes','source_bytes','documents']))},['chunks']),obj({'chunks':arr(obj({'sequence':N,'transfer':transfer},[]))},[]))
add('post',importRoot+'/chunks/{sequence}/acknowledge','acknowledgeImportChunk',obj({}),O)
add('post',importRoot+'/seal','sealImport',obj({'chunks':N,'source_bytes':N,'documents':N},['chunks','source_bytes','documents']),progress)
add('post',importRoot+'/close','closeImport',obj({}),progress)
add('post',importRoot+'/recover','recoverImport',obj({}),progress)
add('post',importRoot+'/operations/{operation_id}/retry','retryImportOperation',obj({'request_id':S},['request_id']),O)
# Prose-only auto-topup operation table, with mandatory idempotency on every POST.
autoRoot='/v1/organizations/{organization_id}/billing/auto-topup'
auto=obj({'organization_id':S,'name':S,'monthly_usd':S,'monthly_credits_usd':S,'credits_expire':B,'next_charge_at':{'type':['string','null']},'status':S,'eligible':B,'cancel_at_period_end':B,'period_start':{'type':['string','null']},'period_end':{'type':['string','null']},'paid_until':{'type':['string','null']},'checkout_url':{'type':['string','null']}},[])
add('get',autoRoot,'getAutoTopup',response=auto)
for action,body in [('checkout',obj({'amount_usd':N,'workspace_id':S,'selected_gb':N})),('amount',obj({'amount_usd':N},['amount_usd'])),('cancel',obj({})),('resume',obj({}))]:add('post',autoRoot+'/'+action,action+'AutoTopup',body,auto,['Idempotency-Key'])
# Raw source is a documented URL response (JSON signed destination), not source bytes.
# Requesting proxy bytes uses the exact content route and an octet-stream raw body.
content=paths['/v1/drives/{drive_id}/uploads/{upload_id}/content']['put']
content['requestBody']={'required':True,'content':{'application/octet-stream':{'schema':{'type':'string','format':'binary'}}}}
transferOp=paths['/v1/drives/{drive_id}/uploads/{upload_id}/transfer']['post'];transferOp['requestBody']={'required':True,'content':{'application/json':{'schema':obj({})}}};transferOp['responses']['200']['content']['application/json']['schema']=transfer
# Tables omit the body of these resource responses; use only fields shown in the documented examples.
drive=obj({'id':S,'name':S,'version':S,'status':S,'document_count':N,'indexed_document_count':N,'index_snapshot_id':{'type':['string','null']}},[])
folder=obj({'id':S,'name':S,'parent_folder_id':{'type':['string','null']},'version':S},[])
for p,ops in paths.items():
 if p in ['/v1/drives/{drive_id}','/v1/workspaces/{workspace_id}/drives']:
  for m,op in ops.items():
   if m in ['get','post','patch']and not (m=='get'and p.endswith('/drives')):op['responses']['200']['content']['application/json']['schema']=drive
 if p in ['/v1/drives/{drive_id}/folders','/v1/drives/{drive_id}/folders/{folder_id}']:
  for m,op in ops.items():
   if m in ['get','post','patch']and not(m=='get'and p.endswith('/folders')):op['responses']['200']['content']['application/json']['schema']=folder
# Progressive mode is documented as an optional endpoint header.
paths['/v1/drives/{drive_id}/documents']['post']['parameters'].append({'name':'X-Ingestion-Mode','in':'header','schema':{'enum':['progressive']}})
# The source route explicitly downloads the latest original file.
paths['/v1/drives/{drive_id}/documents/{document_id}/source']['get']['responses']={'200':{'content':{'application/octet-stream':{'schema':{'type':'string','format':'binary'}}}}}
j={'servers':[{'url':'https://api.wondersearch.ai'}],'paths':paths,'components':{'schemas':{}}}
(TMP/'wonder-openapi').write_text(json.dumps(j))
generate('wondersearch','WonderSearch',[Spec('wonder-openapi','','https://docs.evokoa.com/wondersearch/reference/')])
