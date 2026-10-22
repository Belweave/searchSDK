import sys,json,pathlib
sys.path.insert(0,str(pathlib.Path(__file__).resolve().parent))
from generate import Spec,generate,camel
TMP=pathlib.Path(__file__).resolve().parent / 'snapshots'
S={'type':'string'};N={'type':'number'};B={'type':'boolean'}
def obj(props,req=[]):return {'type':'object','properties':props,'required':req}
def arr(s):return {'type':'array','items':s}
common={'q':S,'location':S,'gl':S,'hl':S,'num':N,'autocorrect':B,'tbs':S,'page':N}
row=obj({'title':S,'link':S,'snippet':S,'position':N,'date':S,'imageUrl':S,'thumbnailUrl':S,'source':S,'rating':N,'ratingCount':N,'price':S,'cid':S,'placeId':S,'address':S,'phoneNumber':S,'latitude':N,'longitude':N,'sitelinks':arr(obj({'title':S,'link':S}))})
searchResponse=obj({'searchParameters':obj(common),'organic':arr(row),'knowledgeGraph':obj({'title':S,'type':S,'website':S,'description':S,'attributes':obj({})}),'answerBox':obj({'title':S,'url':S,'answer':S,'snippet':S}),'peopleAlsoAsk':arr(row),'relatedSearches':arr(obj({'query':S})),'credits':N})
schemas={'SearchResult':row,'SearchResponse':searchResponse}
paths={}
for endpoint,field in [('search','organic'),('images','images'),('videos','videos'),('places','places'),('maps','places'),('reviews','reviews'),('news','news'),('shopping','shopping'),('scholar','organic'),('patents','organic'),('autocomplete','suggestions'),('lens','organic')]:
 props=common.copy();required=['q']
 if endpoint=='autocomplete':props={k:v for k,v in common.items()if k in ['q','location','gl','hl']}
 if endpoint=='maps':props={k:v for k,v in common.items()if k in ['q','hl','page']};props.update({'ll':S,'placeId':S,'cid':S});required=[]
 if endpoint=='reviews':props={'cid':S,'fid':S,'placeId':S,'gl':S,'hl':S,'sortBy':S,'topicId':S,'nextPageToken':S};required=[]
 if endpoint=='lens':props={'url':S,'location':S,'gl':S,'hl':S,'tbs':S};required=['url']
 if endpoint=='scholar':props.pop('num',None)
 schemaName=camel(endpoint)+'Request';schemas[schemaName]=obj(props,required)
 respName=camel(endpoint)+'Response';schemas[respName]=searchResponse if endpoint=='search'else obj({'searchParameters':obj(props),field:arr(row if endpoint!='autocomplete'else obj({'value':S})),'credits':N})
 # The documented playground batch toggle posts a JSON array; keep its array response intact.
 body={'oneOf':[{'$ref':'#/components/schemas/'+schemaName},arr({'$ref':'#/components/schemas/'+schemaName})]}
 resp={'oneOf':[{'$ref':'#/components/schemas/'+respName},arr({'$ref':'#/components/schemas/'+respName})]}
 paths['/'+endpoint]={'post':{'operationId':endpoint,'summary':endpoint,'requestBody':{'required':True,'content':{'application/json':{'schema':body}}},'responses':{'200':{'content':{'application/json':{'schema':resp}}}}},'get':{'operationId':endpoint+'Get','summary':endpoint+' via GET','parameters':[{'name':k,'in':'query','required':k in required,'schema':v}for k,v in props.items()],'responses':{'200':{'content':{'application/json':{'schema':{'$ref':'#/components/schemas/'+respName}}}}}}}
j={'servers':[{'url':'https://google.serper.dev'}],'paths':paths,'components':{'schemas':schemas}}
(TMP/'serper-openapi').write_text(json.dumps(j))
scrape={'servers':[{'url':'https://scrape.serper.dev'}],'paths':{'/':{'post':{'operationId':'scrape','summary':'Scrape a webpage','requestBody':{'required':True,'content':{'application/json':{'schema':obj({'url':S,'includeMarkdown':B,'includeImages':B,'includeLinks':B,'includeVideos':B},['url'])}}},'responses':{'200':{'content':{'application/json':{'schema':obj({})}}}}}}},'components':{'schemas':{}}}
scrape['paths']['/']['get']={'operationId':'scrapeGet','summary':'Scrape a webpage via GET','parameters':[{'name':n,'in':'query','required':n=='url','schema':v} for n,v in {'url':S,'includeMarkdown':B,'includeImages':B,'includeLinks':B,'includeVideos':B}.items()],'responses':{'200':{'content':{'application/json':{'schema':obj({})}}}}}
(TMP/'serper-scrape').write_text(json.dumps(scrape))
generate('serper','Serper',[Spec('serper-openapi','','https://serper.dev/playground'),Spec('serper-scrape','Scrape','https://serper.dev/playground')])
# GET playground examples put apiKey in query, not header. Pin it after user query, with no caller override.
p=pathlib.Path(__file__).resolve().parents[2] / 'packages/sdk/src/native-serper.ts';s=p.read_text()
for name in [k+'Get'for k in ['search','images','videos','places','maps','reviews','news','shopping','scholar','patents','autocomplete','lens']]+['scrapeGet']:
 s=s.replace('serperOperations.'+name+', input)', 'serperOperations.'+name+', { ...input, query: { ...input.query, apiKey } })')
p.write_text(s)
