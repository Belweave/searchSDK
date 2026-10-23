package dev.searchsdk;

import java.net.URI;
import java.time.*;
import java.util.*;
import java.util.concurrent.CompletionStage;

/** The 14 normalized provider adapters. Native APIs are a separate surface. */
public final class Providers {
    private Providers() {}
    public static final Set<String> IDS=Set.of("tavily","exa","brave","context","tinyfish","firecrawl","you","perplexity","serper","serpapi","linkup","parallel","valyu","searxng");
    public static Provider direct(String provider,String apiKey) { return direct(provider,apiKey,JdkTransport.shared()); }
    public static Provider direct(String provider,String apiKey,Transport transport) {
        if(!IDS.contains(provider) || provider.equals("searxng") || transport==null) throw configuration();
        return new Adapter(provider,HttpSupport.key(apiKey),transport,null,Map.of());
    }
    public static Provider searxng(String baseUrl) { return searxng(new SearxngOptions(baseUrl,Map.of(),null,null,null,List.of("general")),JdkTransport.shared()); }
    public static Provider searxng(SearxngOptions options,Transport transport) {
        if(options==null || transport==null) throw configuration();
        return new Adapter("searxng",null,transport,options,Map.of());
    }
    public static Provider valyu(String apiKey,ValyuSettings settings,Transport transport) {
        if(settings==null || transport==null) throw configuration();
        return new Adapter("valyu",HttpSupport.key(apiKey),transport,null,settings.wire());
    }
    public record SearxngOptions(String baseUrl,Map<String,String> headers,String language,Integer safeSearch,String timeRange,List<String> categories) {
        public SearxngOptions {
            baseUrl=Values.endpoint(baseUrl).toString(); headers=HttpSupport.headers(headers==null ? Map.of() : headers,SearchException.Code.CONFIGURATION);
            if(headers.keySet().stream().anyMatch(k -> k.equalsIgnoreCase("accept") || k.equalsIgnoreCase("content-type")) ||
                language!=null && !language.matches("[a-zA-Z][a-zA-Z0-9_-]{0,34}") ||
                safeSearch!=null && (safeSearch<0 || safeSearch>2) || timeRange!=null && !Set.of("day","month","year").contains(timeRange)) throw configuration();
            categories=categories==null ? List.of("general") : List.copyOf(categories);
            if(categories.isEmpty() || categories.size()>20 || categories.stream().anyMatch(s -> !s.matches("[a-zA-Z][a-zA-Z0-9 _-]{0,63}"))) throw configuration();
        }
        @Override public String toString() { return "SearxngOptions[redacted]"; }
    }
    public record ValyuSettings(Double maxPrice,Double relevanceThreshold,Object responseLength,Boolean fastMode,
                                LocalDate startDate,LocalDate endDate,String instructions) {
        public ValyuSettings {
            if(maxPrice!=null && (!Double.isFinite(maxPrice) || maxPrice<=0) ||
                relevanceThreshold!=null && (!Double.isFinite(relevanceThreshold) || relevanceThreshold<0 || relevanceThreshold>1) ||
                responseLength!=null && !(responseLength instanceof String s && Set.of("short","medium","large","max").contains(s) ||
                    responseLength instanceof Number n && Double.isFinite(n.doubleValue()) && n.doubleValue()>0 && n.doubleValue()==Math.rint(n.doubleValue()) && n.doubleValue()<=9007199254740991d) ||
                startDate!=null && endDate!=null && startDate.isAfter(endDate) ||
                instructions!=null && (instructions.isBlank() || instructions.length()>500)) throw configuration();
        }
        Map<String,Object> wire() {
            Map<String,Object> m=new LinkedHashMap<>();
            put(m,"max_price",maxPrice); put(m,"relevance_threshold",relevanceThreshold); put(m,"response_length",responseLength);
            put(m,"fast_mode",fastMode); put(m,"start_date",startDate==null ? null : startDate.toString());
            put(m,"end_date",endDate==null ? null : endDate.toString()); put(m,"instructions",instructions); return Map.copyOf(m);
        }
    }
    private static SearchException configuration() { return new SearchException(SearchException.Code.CONFIGURATION); }
    private static void put(Map<String,Object> m,String k,Object v) { if(v!=null) m.put(k,v); }
    private static Provider.Capabilities capabilities(String id) {
        return switch(id) {
            case "tavily" -> cap(300,150,false,null); case "exa" -> cap(1200,1200,false,null);
            case "context" -> cap(100,100,false,500); case "tinyfish","valyu" -> cap(100,100,false,null);
            case "firecrawl" -> cap(100,100,true,500); case "you" -> cap(500,5000,true,null);
            case "perplexity" -> cap(20,20,true,null); case "parallel" -> cap(200,200,true,null);
            case "linkup" -> cap(100,50,false,null); default -> cap(0,0,false,null);
        };
    }
    private static Provider.Capabilities cap(int include,int exclude,boolean exclusive,Integer maxQuery) {
        return new Provider.Capabilities(include>0,include,exclude,exclusive,maxQuery);
    }
    private static final class Adapter implements Provider {
        final String id,key; final Transport transport; final SearxngOptions searx; final Map<String,Object> settings;
        Adapter(String id,String key,Transport transport,SearxngOptions searx,Map<String,Object> settings) {
            this.id=id; this.key=key; this.transport=transport; this.searx=searx; this.settings=settings;
        }
        @Override public String id() { return id; }
        @Override public Capabilities capabilities() { return Providers.capabilities(id); }
        @Override public CompletionStage<Response> search(SearchRequest r,RequestContext context) {
            capabilities().check(r); context.check();
            return HttpSupport.json(transport,request(r),context).thenApply(body -> { Response result=normalize(body); context.check(); return result; });
        }
        Transport.Request request(SearchRequest r) {
            String url,method="POST",auth="Authorization",secret="Bearer "+key;
            Map<String,Object> body=new LinkedHashMap<>(),query=new LinkedHashMap<>();
            Map<String,String> headers=new LinkedHashMap<>(); headers.put("Content-Type","application/json");
            switch(id) {
                case "tavily" -> { url="https://api.tavily.com/search"; body.putAll(Map.of("query",r.query(),"max_results",r.limit(),"search_depth","basic","include_usage",true,"auto_parameters",false,"include_answer",false,"include_raw_content",false));
                    filters(body,r,"include_domains","exclude_domains"); if(r.includeDomains()!=null) body.put("include_domains_mode","restrict"); }
                case "exa" -> { url="https://api.exa.ai/search"; auth="x-api-key"; secret=key;
                    body.putAll(Map.of("query",r.query(),"numResults",r.limit(),"type","auto","contents",Map.of("highlights",true))); filters(body,r,"includeDomains","excludeDomains"); }
                case "brave" -> { url="https://api.search.brave.com/res/v1/web/search"; method="GET"; auth="X-Subscription-Token"; secret=key;
                    query.putAll(Map.of("q",r.query(),"count",r.limit(),"extra_snippets",true)); }
                case "context" -> { url="https://api.context.dev/v1/web/search"; body.putAll(Map.of("query",r.query(),"numResults",Math.max(10,r.limit()))); filters(body,r,"includeDomains","excludeDomains"); }
                case "tinyfish" -> { url="https://api.search.tinyfish.ai/"; method="GET"; auth="X-API-Key"; secret=key;
                    query.putAll(Map.of("query",r.query(),"domain_type","web","page",0));
                    if(r.includeDomains()!=null) query.put("include_domains",String.join(",",r.includeDomains()));
                    if(r.excludeDomains()!=null) query.put("exclude_domains",String.join(",",r.excludeDomains())); }
                case "firecrawl" -> { url="https://api.firecrawl.dev/v2/search"; body.putAll(Map.of("query",r.query(),"limit",r.limit(),"sources",List.of(Map.of("type","web")),"highlights",false)); filters(body,r,"includeDomains","excludeDomains"); }
                case "you" -> { url="https://ydc-index.io/v1/search"; auth="X-API-Key"; secret=key;
                    body.putAll(Map.of("query",r.query(),"count",r.limit())); filters(body,r,"include_domains","exclude_domains"); }
                case "perplexity" -> { url="https://api.perplexity.ai/search"; body.putAll(Map.of("query",r.query(),"max_results",r.limit(),"search_type","web"));
                    if(r.includeDomains()!=null) body.put("search_domain_filter",r.includeDomains());
                    if(r.excludeDomains()!=null) body.put("search_domain_filter",r.excludeDomains().stream().map(d -> "-"+d).toList()); }
                case "serper" -> { url="https://google.serper.dev/search"; auth="X-API-KEY"; secret=key; body.putAll(Map.of("q",r.query(),"num",r.limit())); }
                case "serpapi" -> { url="https://serpapi.com/search.json"; method="GET"; auth=null; query.putAll(Map.of("engine","google","q",r.query(),"api_key",key)); }
                case "linkup" -> { url="https://api.linkup.so/v1/search"; body.putAll(Map.of("q",r.query(),"depth","fast","outputType","searchResults","includeImages",false,"maxResults",r.limit())); filters(body,r,"includeDomains","excludeDomains"); }
                case "parallel" -> { url="https://api.parallel.ai/v1/search"; auth="x-api-key"; secret=key;
                    Map<String,Object> advanced=new LinkedHashMap<>(); advanced.put("max_results",r.limit());
                    if(r.includeDomains()!=null || r.excludeDomains()!=null) { Map<String,Object> policy=new LinkedHashMap<>(); filters(policy,r,"include_domains","exclude_domains"); advanced.put("source_policy",policy); }
                    body.putAll(Map.of("search_queries",List.of(r.query()),"mode","basic","advanced_settings",advanced)); }
                case "valyu" -> { url="https://api.valyu.ai/v1/search"; auth="X-API-Key"; secret=key; headers.put("Accept","application/json"); body.putAll(settings);
                    body.putAll(Map.of("query",r.query(),"search_type","web","max_num_results",r.limit())); filters(body,r,"included_sources","excluded_sources"); }
                case "searxng" -> { url=searx.baseUrl().replaceAll("/+$","")+"/search"; auth=null;
                    headers.putAll(searx.headers()); headers.put("Accept","application/json"); headers.put("Content-Type","application/x-www-form-urlencoded");
                    body.putAll(Map.of("format","json","pageno","1","q",r.query(),"categories",String.join(",",searx.categories())));
                    put(body,"language",searx.language()); put(body,"safesearch",searx.safeSearch()); put(body,"time_range",searx.timeRange()); }
                default -> throw configuration();
            }
            if(method.equals("GET")) { headers.remove("Content-Type"); headers.put("Accept","application/json"); }
            if(auth!=null) headers.put(auth,secret);
            byte[] bytes=method.equals("GET") ? null : id.equals("searxng") ? HttpSupport.query(body).getBytes(java.nio.charset.StandardCharsets.UTF_8) : Json.bytes(body);
            return new Transport.Request(HttpSupport.withQuery(url,query),method,headers,bytes);
        }
        Response normalize(Map<String,Object> body) {
            Object rows=body.get("results"); String snippet=null,highlights=null,score=null,requestId=null;
            SearchResponse.Usage usage=null; boolean warning=false;
            switch(id) {
                case "tavily" -> { snippet="content"; score="score"; requestId=Values.requestId(body.get("request_id")); usage=Values.usage(body.get("usage"),"credits","credits"); }
                case "exa" -> { highlights="highlights"; score="score"; requestId=Values.requestId(body.get("requestId")); usage=Values.usage(body.get("costDollars"),"total","usd"); warning=nonempty(body.get("warnings")) || nonempty(body.get("notices")); }
                case "brave" -> {
                    if(body.containsKey("web")) rows=Values.object(body.get("web")).get("results");
                    else { Values.string(Values.object(body.get("query")).get("original")); rows=List.of(); }
                    snippet="description"; highlights="extra_snippets";
                }
                case "context" -> {
                    requestId=Values.requestId(body.get("request_id")); snippet="description"; usage=Values.usage(body.get("key_metadata"),"credits_consumed","credits");
                    if(body.containsKey("partial") && !(body.get("partial") instanceof Boolean)) throw Values.invalid(); warning=Boolean.TRUE.equals(body.get("partial"));
                }
                case "tinyfish","perplexity" -> { snippet="snippet"; if(id.equals("perplexity")) requestId=Values.requestId(body.get("id")); }
                case "firecrawl" -> {
                    if(!Boolean.TRUE.equals(body.get("success"))) throw new SearchException(Boolean.FALSE.equals(body.get("success")) ? SearchException.Code.PROVIDER_ERROR : SearchException.Code.INVALID_RESPONSE);
                    requestId=Values.requestId(body.get("id")); rows=Values.object(body.get("data")).get("web"); snippet="description";
                    if(body.get("creditsUsed")!=null) { double n=Values.number(body.get("creditsUsed")); if(n!=Math.rint(n)) throw Values.invalid(); usage=new SearchResponse.Usage("credits",n); }
                    warning=nonblank(Values.optionalString(body.get("warning")));
                }
                case "you" -> {
                    requestId=!body.containsKey("metadata") ? null : Values.requestId(Values.object(body.get("metadata")).get("search_uuid"));
                    Map<String,Object> sections=Values.object(body.get("results"));
                    if(!sections.containsKey("web")) { Values.array(sections.get("news")); rows=List.of(); } else rows=sections.get("web"); snippet="description";
                }
                case "serper" -> {
                    if(body.containsKey("error") || body.containsKey("message") && !body.containsKey("organic")) throw new SearchException(SearchException.Code.PROVIDER_ERROR);
                    rows=body.get("organic"); snippet="snippet";
                    if(body.get("credits")!=null) usage=new SearchResponse.Usage("credits",Values.number(body.get("credits")));
                }
                case "serpapi" -> {
                    Map<String,Object> metadata=Values.object(body.get("search_metadata")); Object infoValue=body.get("search_information");
                    Map<String,Object> info=infoValue instanceof Map<?,?> ? Values.object(infoValue) : Map.of();
                    boolean empty="Success".equals(metadata.get("status")) && "Google hasn't returned any results for this query.".equals(body.get("error")) &&
                        info.get("total_results") instanceof Number n && n.doubleValue()==0 && "Fully empty".equals(info.get("organic_results_state")) &&
                        (!body.containsKey("organic_results") || body.get("organic_results") instanceof List<?> l && l.isEmpty());
                    if(body.containsKey("error") && !empty || "Error".equals(metadata.get("status"))) throw new SearchException(SearchException.Code.PROVIDER_ERROR);
                    if(!"Success".equals(metadata.get("status"))) throw Values.invalid();
                    rows=empty ? List.of() : body.get("organic_results"); snippet="snippet"; requestId=Values.requestId(metadata.get("id"));
                }
                case "linkup" -> snippet="content";
                case "parallel" -> {
                    highlights="excerpts"; requestId=Values.requestId(body.get("search_id"));
                    if(body.get("warnings")!=null) warning=!Values.array(body.get("warnings")).isEmpty();
                }
                case "valyu" -> {
                    if(!(body.get("success") instanceof Boolean)) throw Values.invalid();
                    if(Boolean.FALSE.equals(body.get("success"))) throw new SearchException(SearchException.Code.PROVIDER_ERROR);
                    requestId=Values.requestId(body.get("tx_id")); snippet="content"; score="relevance_score"; usage=Values.usage(body,"total_deduction_dollars","usd");
                    String errorMessage=Values.optionalString(body.get("error"));
                    List<String> providerWarnings=body.get("warnings")==null ? null : Values.strings(body.get("warnings"));
                    warning=nonblank(errorMessage) || providerWarnings!=null && !providerWarnings.isEmpty();
                }
                case "searxng" -> {
                    if(body.containsKey("error")) throw new SearchException(SearchException.Code.PROVIDER_ERROR);
                    if(body.containsKey("unresponsive_engines")) warning=!Values.array(body.get("unresponsive_engines")).isEmpty(); snippet="content"; score="score";
                }
                default -> throw configuration();
            }
            Instant retrievedAt=Instant.now(); List<SearchResponse.Result> normalized=new ArrayList<>();
            for(Object value:Values.array(rows)) {
                Map<String,Object> row=Values.object(value);
                String url=Values.url(row.get(id.equals("serper") || id.equals("serpapi") ? "link" : "url"));
                String title=Values.optionalString(row.get(id.equals("linkup") ? "name" : "title"));
                String text=snippet==null ? null : Values.optionalString(row.get(snippet));
                if(id.equals("linkup") && row.containsKey("type") && !"text".equals(row.get("type"))) throw Values.invalid();
                if(id.equals("you")) { List<String> snippets=row.get("snippets")==null ? null : Values.strings(row.get("snippets")); if(text==null && snippets!=null) text=String.join("\n",snippets); }
                List<String> h=highlights==null || row.get(highlights)==null ? null : Values.strings(row.get(highlights));
                Double s=score==null || row.get(score)==null ? null : Values.number(row.get(score));
                normalized.add(new SearchResponse.Result(url,title,text,h,s,new SearchResponse.Provenance(id,url,retrievedAt,requestId)));
            }
            return new Response(normalized,usage,warning ? List.of(new SearchResponse.Warning("provider_warning",id)) : List.of());
        }
        boolean nonempty(Object v) { return v instanceof List<?> a && !a.isEmpty(); }
        boolean nonblank(String s) { return s!=null && !s.isEmpty(); }
        @Override public String toString() { return "Provider["+id+"]"; }
    }
    private static void filters(Map<String,Object> m,SearchRequest r,String include,String exclude) { put(m,include,r.includeDomains()); put(m,exclude,r.excludeDomains()); }
    public static Provider tavily(String apiKey) { return direct("tavily",apiKey); }
    public static Provider tavily(String apiKey,Transport transport) { return direct("tavily",apiKey,transport); }
    public static Provider exa(String apiKey) { return direct("exa",apiKey); }
    public static Provider exa(String apiKey,Transport transport) { return direct("exa",apiKey,transport); }
    public static Provider brave(String apiKey) { return direct("brave",apiKey); }
    public static Provider brave(String apiKey,Transport transport) { return direct("brave",apiKey,transport); }
    public static Provider context(String apiKey) { return direct("context",apiKey); }
    public static Provider context(String apiKey,Transport transport) { return direct("context",apiKey,transport); }
    public static Provider tinyfish(String apiKey) { return direct("tinyfish",apiKey); }
    public static Provider tinyfish(String apiKey,Transport transport) { return direct("tinyfish",apiKey,transport); }
    public static Provider firecrawl(String apiKey) { return direct("firecrawl",apiKey); }
    public static Provider firecrawl(String apiKey,Transport transport) { return direct("firecrawl",apiKey,transport); }
    public static Provider you(String apiKey) { return direct("you",apiKey); }
    public static Provider you(String apiKey,Transport transport) { return direct("you",apiKey,transport); }
    public static Provider perplexity(String apiKey) { return direct("perplexity",apiKey); }
    public static Provider perplexity(String apiKey,Transport transport) { return direct("perplexity",apiKey,transport); }
    public static Provider serper(String apiKey) { return direct("serper",apiKey); }
    public static Provider serper(String apiKey,Transport transport) { return direct("serper",apiKey,transport); }
    public static Provider serpapi(String apiKey) { return direct("serpapi",apiKey); }
    public static Provider serpapi(String apiKey,Transport transport) { return direct("serpapi",apiKey,transport); }
    public static Provider linkup(String apiKey) { return direct("linkup",apiKey); }
    public static Provider linkup(String apiKey,Transport transport) { return direct("linkup",apiKey,transport); }
    public static Provider parallel(String apiKey) { return direct("parallel",apiKey); }
    public static Provider parallel(String apiKey,Transport transport) { return direct("parallel",apiKey,transport); }
    public static Provider valyu(String apiKey) { return direct("valyu",apiKey); }
    public static Provider valyu(String apiKey,Transport transport) { return direct("valyu",apiKey,transport); }
}
