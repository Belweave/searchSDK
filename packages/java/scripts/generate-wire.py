"""Java wire models from the same retained OpenAPI/structured reference schemas as the catalogs.

Unknown fields are retained. Object unions expose a conservative merged view plus
named variant views; mixed unions preserve the exact JSON value and typed alternatives.
No network access, source regeneration or dependency installation occurs.
"""
import copy, hashlib, json, pathlib, re
KEYWORDS=set('abstract assert boolean break byte case catch char class const continue default do double else enum extends final finally float for goto if implements import instanceof int interface long native new package private protected public return short static strictfp super switch synchronized this throw throws transient try void volatile while record sealed permits yield var'.split())
RESERVED=KEYWORDS|{'true','false','null'}|set('getClass hashCode equals clone finalize notify notifyAll wait toString toJson additionalFields hasField field builder fromJson self set knownFields buildFields additionalField build'.split())
def pascal(value):
    words=re.findall(r'[A-Z]+(?=[A-Z][a-z]|[^a-zA-Z]|$)|[A-Z]?[a-z]+|[0-9]+',str(value))
    result=''.join(w[:1].upper()+w[1:] for w in words) or 'Value'
    return ('Schema'+result if result[0].isdigit() else result)
def member(value):
    words=re.findall(r'[A-Z]+(?=[A-Z][a-z]|[^a-zA-Z]|$)|[A-Z]?[a-z]+|[0-9]+',str(value))
    if not words:words=['value']
    first=words[0].lower()if words[0].isupper()else words[0][:1].lower()+words[0][1:]
    result=first+''.join(w.title()if w.isupper()else w[:1].upper()+w[1:]for w in words[1:])
    if result[0].isdigit():result='field'+result
    return result+'Value' if result in RESERVED else result

def generate(package,root,operations,read):
    files={}; contexts={}; inventory={}; a=root/'scripts/providers-a';b=root/'scripts/providers-b'
    aops={(e['provider'],e['name']):e for e in read(a/'operations.json')['operations']}
    snapshots={}
    for path in sorted((b/'snapshots').iterdir()):
        try:
            doc=json.loads(path.read_bytes())
            if isinstance(doc,dict) and 'paths'in doc:snapshots[path.name]=read(path)
        except (ValueError,TypeError):pass
    def context(provider,key,doc):
        identity=(provider,key)
        if identity not in contexts:contexts[identity]=dict(provider=provider,key=key,doc=doc)
        return contexts[identity]
    def resolve(ctx,schema,seen=None):
        seen=set() if seen is None else set(seen)
        while isinstance(schema,dict) and '$ref'in schema:
            ref=schema['$ref']
            if ref in seen:return {}
            seen.add(ref)
            if not ref.startswith('#/'):return {}
            value=ctx['doc']
            for part in ref[2:].split('/'):value=value[part.replace('~1','/').replace('~0','~')]
            # JSON Schema siblings are retained, including property constraints alongside refs.
            schema={**value,**{k:v for k,v in schema.items()if k!='$ref'}}
        return schema if isinstance(schema,dict) else {}
    def nullable(ctx,schema):
        s=resolve(ctx,schema)
        return s.get('nullable',False)or s.get('type')=='null'or isinstance(s.get('type'),list)and'null'in s['type']or None in s.get('enum',[])or any(nullable(ctx,v)for v in s.get('anyOf',[])+s.get('oneOf',[]))
    def locate(op):
        p=op['provider'];entry=aops.get((p,op['name']))
        if entry and entry.get('key'):
            key=entry['key'];doc=read(a/'fixtures'/(key+'.json'))
            if p=='brave':
                source=doc;response_map={r['statusCode']:dict(content={'application/json':dict(schema=r.get('schema',{}))})for r in source.get('responses',[])}
                rb=source.get('requestBody');request_body=dict(required=rb.get('required',False),content={'application/json':dict(schema=rb.get('schema',{}))})if rb else{}
                if key=='brave-ai-answers':
                    ref=response_map['200']['content']['application/json']['schema'];shape=copy.deepcopy(source['schemas'][ref['$ref'].split('/')[-1]])
                    choice=shape['properties']['choices']['items']
                    if '$ref'in choice:choice=copy.deepcopy(source['schemas'][choice['$ref'].split('/')[-1]]);shape['properties']['choices']['items']=choice
                    choice['properties']['message']={'type':'object','properties':{'role':{'type':'string'},'content':{'type':'string'}},'required':['content']}
                    choice['required']=[k for k in choice.get('required',[])if k!='delta']+['message'];response_map['200']['content']['application/json']['schema']=shape
                doc={'components':{'schemas':source['schemas']},'paths':{source['path']:{source['method'].lower():dict(parameters=source.get('queryParams',[])+source.get('pathParams',[])+source.get('headerParams',[]),requestBody=request_body,responses=response_map)}}}
            return context(p,key,doc)
        if p=='tavily'and op['name']=='paidSearch':return context(p,'tavily-search',read(a/'fixtures/tavily-search.json'))
        if p=='context'and op['base']=='https://logos.context.dev':
            params=[dict(name=n,**{'in':'query'},required=n in ('publicClientId','domain'),schema={'type':'string',**({'enum':['light','dark']}if n=='theme'else {'enum':['icon','wordmark']}if n=='type'else {})})for n in ['publicClientId','domain','theme','type']]
            return context(p,'context-logo',{'paths':{'/':{'get':{'parameters':params},'head':{'parameters':params}}}})
        if entry:return context(p,p+'-supplemental',{'paths':{}})
        if p=='serpapi':
            derived=read(package/'scripts/serpapi-wire-schema.json');attribution=derived['x-attribution']
            actual=hashlib.sha256((root/attribution['typescriptReference']).read_bytes()).hexdigest()
            if actual!=attribution['typescriptSha256']:raise ValueError('SerpAPI retained wire interface changed; review scripts/serpapi-wire-schema.json before regenerating')
            return context(p,'serpapi-derived',derived)
        prefix={'perplexity':'p-','serper':'serper-','wondersearch':'wonder-','parallel':'parallel-','firecrawl':'firecrawl-','linkup':'linkup-','you':'you-'}[p]
        matches=[(key,doc)for key,doc in snapshots.items()if key.startswith(prefix)and op['method'].lower()in doc.get('paths',{}).get(op['path'],{})]
        if len(matches)!=1:raise ValueError('Wire source mismatch: '+p+'.'+op['name'])
        return context(p,*matches[0])
    titles={'serpapi':'SerpApi','tinyfish':'Tinyfish','wondersearch':'WonderSearch'}
    generators={}
    class Models:
        def __init__(self,provider):
            self.provider=provider;self.title=titles.get(provider,provider[:1].upper()+provider[1:])+'Models';self.queue=[];self.used={};self.aliases={};self.defs=[];self.fields=0
        def prefix(self,ctx):
            k=ctx['key'];p=ctx['provider']
            primary={'exa':'exa','context':'context','tavily':'tavily-search','serper':'serper-openapi','serpapi':'serpapi-derived','wondersearch':'wonder-openapi','parallel':'parallel-openapi','firecrawl':'firecrawl-openapi','linkup':'linkup-openapi','perplexity':'p-openapi','you':'you-web-search','tinyfish':'tinyfish-main','brave':'brave-web-search-get'}.get(p)
            if k==primary:return ''
            return pascal(re.sub(r'^(?:'+re.escape(p)+r'|p)[-_]','',k))
        def unique(self,wanted,ctx,schema,kind):
            def shape(value):
                if isinstance(value,dict):
                    result={k:shape(v)for k,v in value.items()if k not in ('description','title','default','example','examples','deprecated','nullable')}
                    if value.get('type')=='object'or'properties'in value:result.setdefault('additionalProperties',True)
                    if result.get('additionalProperties')=={}:result['additionalProperties']=True
                    return result
                if isinstance(value,list):return[shape(v)for v in value]
                return value
            signature=(ctx['key'],pascal(wanted),json.dumps(shape(schema),sort_keys=True,separators=(',',':')),kind)
            if signature in self.aliases:return self.aliases[signature]
            wanted=pascal(wanted);name=wanted;i=2
            while any(k.casefold()==name.casefold()and v!=signature for k,v in self.used.items()):name=wanted+str(i);i+=1
            self.used[name]=signature;self.aliases[signature]=name;self.queue.append((name,ctx,schema,kind));return name
        def nonnull(self,schema):
            return not(schema.get('type')=='null'or schema.get('enum')==[None]or 'const'in schema and schema['const']is None)
        def merged(self,ctx,schema,seen=None):
            seen=set()if seen is None else set(seen)
            if '$ref'in schema:
                if schema['$ref']in seen:return None
                seen.add(schema['$ref'])
            schema=resolve(ctx,schema)
            props=dict(schema.get('properties',{}));required=set(schema.get('required',[]));isobject=schema.get('type')=='object'or bool(props)or bool(required)
            for composition in ['allOf','anyOf','oneOf']:
                branches=[self.merged(ctx,s,seen)for s in schema.get(composition,[])if self.nonnull(resolve(ctx,s))]
                if not branches:continue
                if any(branch is None for branch in branches):
                    if composition=='allOf'and isobject:branches=[branch for branch in branches if branch is not None]
                    else:return None
                isobject=True
                req=[branch[1]for branch in branches]
                required|=(set.union(*req)if composition=='allOf'else set.intersection(*req))if req else set()
                for fields,_ in branches:
                    for key,value in fields.items():
                        if key not in props:props[key]=value
                        elif props[key]!=value:
                            choices=props[key].get('anyOf')if isinstance(props[key],dict)and set(props[key])=={'anyOf'}else[props[key]]
                            if value not in choices:props[key]={'anyOf':choices+[value]}
            return (props,required)if isobject else None
        def type(self,ctx,schema,hint):
            if not isinstance(schema,dict):schema={}
            if '$ref'in schema:
                ref=schema['$ref'];target=resolve(ctx,schema);name=self.prefix(ctx)+pascal(ref.split('/')[-1]);return self.type_resolved(ctx,target,name)
            return self.type_resolved(ctx,schema,hint)
        def type_resolved(self,ctx,schema,hint):
            variants=schema.get('oneOf',schema.get('anyOf'))
            if isinstance(schema.get('type'),list):variants=[{**schema,'type':t}for t in schema['type']if t!='null']
            if variants:
                nonnull=[s for s in variants if self.nonnull(resolve(ctx,s))]
                if len(nonnull)==1:return self.type(ctx,nonnull[0],hint)
                merged=self.merged(ctx,schema)
                if merged is not None and merged[0]:return self.title+'.'+self.unique(hint,ctx,schema,'object')
                kinds=[resolve(ctx,s).get('type')for s in nonnull]
                if kinds and all(k==kinds[0]for k in kinds)and isinstance(kinds[0],str)and kinds[0]in ('string','boolean','integer','number'):
                    return {'string':'java.lang.String','boolean':'java.lang.Boolean','integer':'java.lang.Long','number':'java.lang.Double'}[kinds[0]]
                # Literal-only alternatives are still ordinary string fields, retaining future enum values.
                if nonnull and all(isinstance(resolve(ctx,s).get('const'),str)or resolve(ctx,s).get('enum')and all(isinstance(x,str)for x in resolve(ctx,s)['enum'])for s in nonnull):return 'java.lang.String'
                return self.title+'.'+self.unique(hint,ctx,schema,'union')
            merged=self.merged(ctx,schema)
            if merged is not None:
                if merged[0]:return self.title+'.'+self.unique(hint,ctx,schema,'object')
                extra=schema.get('additionalProperties',{})
                return 'java.util.Map<java.lang.String, '+self.type(ctx,extra if isinstance(extra,dict)else{},hint+'Value')+'>'
            t=schema.get('type')
            if t=='array':return 'java.util.List<'+self.type(ctx,schema.get('items',{}),hint+'Item')+'>'
            if t in ('string','boolean','integer','number'):return {'string':'java.lang.String','boolean':'java.lang.Boolean','integer':'java.lang.Long','number':'java.lang.Double'}[t]
            if 'const'in schema:
                v=schema['const'];return 'java.lang.String'if isinstance(v,str)else'java.lang.Boolean'if isinstance(v,bool)else'java.lang.Long'if isinstance(v,int)else'WireValue'
            return 'WireValue'
        def convert(self,typ,expr,level=0):
            if typ=='java.lang.String':return 'WireTypes.string('+expr+')'
            if typ=='java.lang.Boolean':return 'WireTypes.bool('+expr+')'
            if typ=='java.lang.Long':return 'WireTypes.integer('+expr+')'
            if typ=='java.lang.Double':return 'WireTypes.number('+expr+')'
            if typ=='WireValue':return 'WireValue.fromJson('+expr+')'
            if typ.startswith('java.util.List<'):
                v='item'+str(level);return 'WireTypes.list('+expr+', '+v+' -> '+self.convert(typ[15:-1],v,level+1)+')'
            if typ.startswith('java.util.Map<java.lang.String, '):
                v='item'+str(level);return 'WireTypes.map('+expr+', '+v+' -> '+self.convert(typ[32:-1],v,level+1)+')'
            return typ+'.fromJson('+expr+')'
        def emit(self):
            while self.queue:
                name,ctx,schema,kind=self.queue.pop(0)
                lines=['    public static final class '+name+' extends '+('WireObject'if kind=='object'else'WireValue')+' {',
                       '        private '+name+'(java.lang.Object value) { super(value); }',
                       '        public static '+name+' fromJson(java.lang.Object value) { return value==null ? null : new '+name+'(value); }']
                if kind=='object':
                    props,required=self.merged(ctx,schema);names={};used=set();types={}
                    for key,value in props.items():
                        method=member(key);base=method;i=2
                        while method in used:method=base+str(i);i+=1
                        used.add(method);names[key]=method;types[key]=self.type(ctx,value,name+pascal(key));self.fields+=1
                    known='java.util.Set.of('+','.join(json.dumps(k)for k in props)+')'
                    lines+=['        private static final java.util.Set<java.lang.String> KNOWN='+known+';',
                            '        @Override public java.util.Map<java.lang.String,java.lang.Object> additionalFields() { return additionalFields(KNOWN); }']
                    for key,value in props.items():
                        description=resolve(ctx,value).get('description','').replace('*/','* /').replace('&','&amp;').replace('<','&lt;').replace('>','&gt;').replace('\r',' ').replace('\n',' ')
                        if description:lines.append('        /** '+description+' */')
                        lines.append('        public '+types[key]+' '+names[key]+'() { return '+self.convert(types[key],'field('+json.dumps(key)+')')+'; }')
                    lines+=['        public static Builder builder() { return new Builder(); }']
                    ordered=[k for k in props if k in required]
                    if ordered and len(ordered)<=12:
                        args=', '.join(types[k]+' '+names[k]for k in ordered)
                        setters=''.join('.'+names[k]+'('+names[k]+')'for k in ordered)
                        lines+=['        public static Builder builder('+args+') { return new Builder()'+setters+'; }']
                    lines+=['        public static final class Builder extends WireBuilder<Builder> {',
                            '            @Override protected Builder self() { return this; }',
                            '            @Override protected java.util.Set<java.lang.String> knownFields() { return KNOWN; }']
                    for key in props:
                        typ=types[key];lines.append('            public Builder '+names[key]+'('+typ+' value) { return set('+json.dumps(key)+',value); }')
                        if typ in ('java.lang.Long','java.lang.Double'):
                            primitive='long'if typ=='java.lang.Long'else'double';lines.append('            public Builder '+names[key]+'('+primitive+' value) { return set('+json.dumps(key)+',value); }')
                    req=','.join(json.dumps(k)for k in sorted(required))
                    nulls=[k for k in sorted(required)if k in props and nullable(ctx,props[k])]
                    if nulls:req='java.util.Set.of('+','.join(json.dumps(k)for k in nulls)+')'+(','+req if req else'')
                    lines+=['            public '+name+' build() { return new '+name+'(buildFields('+req+')); }','        }']
                    variants=schema.get('oneOf',schema.get('anyOf',[]))
                    for i,variant in enumerate(variants):
                        if not self.nonnull(resolve(ctx,variant)):continue
                        typ=self.type(ctx,variant,name+'Variant'+str(i+1))
                        if typ!=self.title+'.'+name:lines.append('        public '+typ+' asVariant'+str(i+1)+'() { return '+self.convert(typ,'toJson()')+'; }')
                else:
                    variants=schema.get('oneOf',schema.get('anyOf',[]))
                    if isinstance(schema.get('type'),list):variants=[{**schema,'type':t}for t in schema['type']if t!='null']
                    for i,variant in enumerate(variants):
                        if not self.nonnull(resolve(ctx,variant)):continue
                        typ=self.type(ctx,variant,name+'Variant'+str(i+1))
                        lines+=['        public static '+name+' ofVariant'+str(i+1)+'('+typ+' value) { return new '+name+'(WireTypes.unwrap(value)); }',
                                '        public '+typ+' asVariant'+str(i+1)+'() { return '+self.convert(typ,'toJson()')+'; }']
                lines+=['    }'];self.defs+=lines
            header=['// Generated by scripts/generate-native.py from retained public schemas; do not edit.',
                    'package dev.searchsdk;','',
                    '/** Native wire models. Unknown fields and union variants are retained. Getters validate consumed field types. */',
                    'public final class '+self.title+' {','    private '+self.title+'() {}']
            return '\n'.join(header+self.defs+['}',''])
    def group(parameters,where,ctx):
        chosen=[resolve(ctx,p)for p in parameters if resolve(ctx,p).get('in')==where]
        if where=='header':chosen=[p for p in chosen if p['name'].lower()not in ('authorization','x-api-key','x-subscription-token')]
        if not chosen:return None
        return {'type':'object','properties':{p['name']:p.get('schema',{})for p in chosen},'required':[p['name']for p in chosen if p.get('required')]}
    # Reserve official component names before operation-local aliases; preserve semantic names even for structurally identical schemas.
    for op in operations:
        ctx=locate(op);model=generators.setdefault(op['provider'],Models(op['provider']))
        for schema_name in ctx['doc'].get('components',{}).get('schemas',{}):
            model.type(ctx,{'$ref':'#/components/schemas/'+schema_name},model.prefix(ctx)+pascal(schema_name))
    for op in operations:
        provider=op['provider'];model=generators.setdefault(provider,Models(provider));ctx=locate(op)
        item=ctx['doc'].get('paths',{}).get(op['path'],{});operation=item.get(op['method'].lower(),{})
        if provider=='serpapi'and op['name']in ctx['doc'].get('x-operation-overrides',{}):operation=ctx['doc']['x-operation-overrides'][op['name']]
        params=item.get('parameters',[])+operation.get('parameters',[])
        # Supplemental aliases inherit the retained normal search schema.
        if provider=='tavily'and op['name']=='paidSearch':
            operation=ctx['doc']['paths']['/search']['post']
            params=params+[dict(name='PAYMENT-SIGNATURE',**{'in':'header'},schema={'type':'string','description':'Externally acquired x402 payment authorization. The SDK never signs payments.'})]
        body=resolve(ctx,operation.get('requestBody')or{}).get('content',{}).get('application/json',{}).get('schema')
        stem=pascal(op['name']);types={};schemas={}
        for where in ['path','query','header']:
            schema=group(params,where,ctx)
            if where=='path'and schema is None:
                names=re.findall(r'\{([^}]+)}',op['path'])
                if names:schema={'type':'object','properties':{n:{'type':'string'}for n in names},'required':names}
            if schema is not None:
                schema=copy.deepcopy(schema)
                if where=='header':schema['required']=[k for k in schema['required']if k not in op.get('headers',{})]
                if provider=='serpapi'and where=='query'and(op['name']=='google'or op['name'].startswith('extract')):
                    schema['required']=['q'if op['name']=='google'else'url']
                types[where]=model.type(ctx,schema,stem+pascal(where));schemas[where]=schema
        if body is not None:types['body']=model.type(ctx,body,stem+'Body');schemas['body']=body
        if op['response']=='json':
            choices=[]
            for status,response in operation.get('responses',{}).items():
                if not str(status).startswith('2'):continue
                response=resolve(ctx,response)
                for media,content in response.get('content',{}).items():
                    if media=='application/json'or media in ('searchResults','sourcedAnswer','structured'):
                        schema=content.get('schema',{})
                        if schema not in choices:choices.append(schema)
            if not choices:output='WireValue';schema={}
            else:
                schema=choices[0]if len(choices)==1 else{'oneOf':choices};output=model.type(ctx,schema,stem+'Response')
            # Some schemas intentionally publish no JSON response shape: keep a lossless WireValue.
            types['response']=output
        inventory[(provider,op['name'])]=dict(types=types,schemas=schemas,convert=lambda typ,expr,m=model:m.convert(typ,expr),stem=stem)
    for provider,model in generators.items():
        files[package/'src/main/java/dev/searchsdk'/(model.title+'.java')]=model.emit()
    counts={p:dict(models=len(m.used),fields=m.fields)for p,m in generators.items()}
    return files,inventory,counts
