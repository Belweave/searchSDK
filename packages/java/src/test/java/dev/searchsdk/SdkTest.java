package dev.searchsdk;

import com.sun.net.httpserver.HttpServer;
import java.net.*;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.time.*;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.*;
import java.util.function.*;
import java.util.regex.*;
import static dev.searchsdk.SearchException.Code.*;

/** Dependency-free deterministic suite. Every HTTP call targets a loopback server or an injected transport. */
public final class SdkTest {
    private static Path root;
    private static int assertions,groups;
    private static final SearchRequest QUERY=new SearchRequest("synthetic query");
    private static final String KEY="fixture-secret-key",CANONICAL="2026-10-22T00:00:00.000Z";
    private SdkTest() {}
    public static void main(String[] args) throws Exception {
        root=Path.of(args.length==0 ? "../.." : args[0]).toAbsolutePath().normalize();
        test("shared request conformance",SdkTest::requests);
        test("strict JSON and immutable public values",SdkTest::json);
        test("all shared normalized adapter fixtures",SdkTest::adapterFixtures);
        test("normalized malformed responses and sanitized provider failures",SdkTest::adapterFailures);
        test("gateway shared success/errors and strict response validation",SdkTest::gateway);
        test("explicit retries/fallback and complete-chain capability checks",SdkTest::reliability);
        test("cancellation, deadlines, queue bounds and batch outcomes",SdkTest::cancellationAndBatch);
        test("generated schema-backed Java wire models",SdkTest::wireModels);
        test("native independent wire fixtures and supplemental bindings",SdkTest::nativeWire);
        test("complete generated operation dispatch and mode coverage",SdkTest::nativeCatalog);
        test("incremental SSE decoding, backpressure, cancellation and limits",SdkTest::sse);
        test("JDK deadline error classification before context timer",SdkTest::transportTimeout);
        test("JDK HttpClient loopback integration",SdkTest::loopback);
        System.out.println("PASS: "+groups+" groups, "+assertions+" assertions; synthetic/injected/loopback only");
    }
    @FunctionalInterface interface Checked { void run() throws Exception; }
    static void test(String name,Checked work) throws Exception { work.run(); groups++; System.out.println("PASS "+name); }
    static void check(boolean condition,String message) { assertions++; if(!condition) throw new AssertionError(message); }
    static void equal(Object actual,Object expected,String message) { check(Objects.equals(actual,expected),message+" [values omitted]"); }
    static void sameJson(Object actual,Object expected,String message) { equal(canonical(Json.parse(Json.bytes(actual))),canonical(Json.parse(Json.bytes(expected))),message); }
    static Object canonical(Object value) {
        if(value instanceof java.math.BigDecimal n) return n.stripTrailingZeros();
        if(value instanceof Map<?,?> map) { Map<Object,Object> result=new LinkedHashMap<>(); map.forEach((k,v) -> result.put(k,canonical(v))); return result; }
        if(value instanceof List<?> list) return list.stream().map(SdkTest::canonical).toList(); return value;
    }
    static Object fixture(String file) throws Exception { return Json.parse(Files.readAllBytes(root.resolve("sdk-contract/fixtures/"+file))); }
    static <T> T await(CompletionStage<T> stage) throws Exception { return stage.toCompletableFuture().get(8,TimeUnit.SECONDS); }
    static SearchException error(Checked action,SearchException.Code code) throws Exception {
        try { action.run(); } catch(Exception e) {
            SearchException s=SearchException.sanitize(e); equal(s.code(),code,"error code");
            check(s.getCause()==null,"failure excludes raw cause");
            check(!s.toString().contains(KEY) && !s.getMessage().contains(QUERY.query()),"failure excludes credential and query"); return s;
        }
        throw new AssertionError("Expected "+code);
    }
    static Transport.Response response(Object body) { return new Transport.Response(200,Json.bytes(body)); }
    static Provider provider(String id,BiFunction<SearchRequest,RequestContext,CompletionStage<Provider.Response>> call) {
        return new Provider() {
            public String id() { return id; }
            public Capabilities capabilities() { return new Capabilities(true,100,100,false,null); }
            public CompletionStage<Response> search(SearchRequest r,RequestContext c) { return call.apply(r,c); }
        };
    }
    static Provider.Response empty() { return new Provider.Response(List.of(),null,List.of()); }
    static Provider success(String id) { return provider(id,(r,c) -> CompletableFuture.completedFuture(empty())); }
    static void requests() throws Exception {
        Map<String,Object> cases=Values.object(fixture("request-cases.json"));
        for(Object v:Values.array(cases.get("valid"))) { Map<String,Object> c=Values.object(v); sameJson(SearchRequest.fromJson(c.get("input")).toJson(),c.get("normalized"),"shared normalized request"); }
        for(Object v:Values.array(cases.get("invalid"))) error(() -> SearchRequest.fromJson(Values.object(v).get("input")),INVALID_REQUEST);
        for(String domain:List.of("localhost","a..com","_a.com","-a.com","a-.com","a.com/","a.com:80","*.a.com","é.com"))
            error(() -> new SearchRequest("q",5,List.of(domain),null),INVALID_REQUEST);
        error(() -> SearchRequest.fromJson(Json.parse("{\"query\":\"q\",\"includeDomains\":null}")),INVALID_REQUEST);
        error(() -> new SearchRequest("\u00a0\ufeff\u3000"),INVALID_REQUEST);
        List<String> mutable=new ArrayList<>(List.of("A.COM")); SearchRequest r=new SearchRequest(" q ",2,mutable,null); mutable.clear();
        equal(r.includeDomains(),List.of("a.com"),"request snapshots domain arrays"); equal(r.query()," q ","query preserved");
    }
    static void json() throws Exception {
        for(String bad:List.of("","null null","[1,]","{\"x\":1,\"x\":2}","{\"x\":null,\"x\":2}","01","+1",".2","1.","1e","1e999999999","NaN","[true false]","\"\\uD800\"","\"\\uDC00\"","\"a\n\"","\"\\x00\""))
            error(() -> Json.parse(bad),INVALID_RESPONSE);
        error(() -> Json.parse(new byte[]{(byte)0xc3,0x28}),INVALID_RESPONSE);
        error(() -> Json.parse("[".repeat(130)+"0"+"]".repeat(130)),INVALID_RESPONSE);
        error(() -> Json.stringify(Double.NaN),INVALID_REQUEST);
        error(() -> Json.stringify("\ud800"),INVALID_REQUEST);
        List<Object> cycle=new ArrayList<>();cycle.add(cycle);error(() -> Json.stringify(cycle),INVALID_REQUEST);
        Object value=Json.parse("{\"array\":[null,true,false,1.25,-4e2],\"text\":\"é😀\\n\\t\\u0000\"}");
        equal(Json.parse(Json.stringify(value)),value,"strict JSON Unicode roundtrip");
        for(String url:List.of("https://例え.テスト/検索","https://exa_mple.test/a","https://127.1","https://[::1]:443/"))equal(Values.url(url),url,"valid international/HTTP URL retained");
        equal(Values.endpoint("https://例え.テスト/検索").getHost(),"xn--r8jz45g.xn--zckzah","gateway IDN hostname normalized without changing path");
        error(() -> new SearchResponse.Usage("credits",Double.POSITIVE_INFINITY),INVALID_RESPONSE);
        error(() -> new SearchResponse.Usage("usd",-1),INVALID_RESPONSE);
        error(() -> new SearchResponse.Provenance("bad provider","https://example.com",Instant.now(),null),INVALID_RESPONSE);
        for(String url:List.of("https://u:p@example.com","file:///etc/passwd","https://example.com/a b","https://example.com\\x","javascript:alert(1)","https:///example.com","https://example.com:65536","https://example.com:-1","https://256.256.256.256","https://%40example.com","https://[fe80::1%25eth0]/","https://example.com/\u00a0"))
            error(() -> Values.url(url),INVALID_RESPONSE);
    }
    static Provider fixtureProvider(String id,Transport transport) {
        if(id.equals("searxng")) return Providers.searxng(new Providers.SearxngOptions("https://searxng.example",Map.of(),null,null,null,null),transport);
        return Providers.direct(id,"fixture-key",transport);
    }
    static Map<String,Object> query(URI uri) {
        Map<String,Object> q=new LinkedHashMap<>();
        if(uri.getRawQuery()!=null) for(String part:uri.getRawQuery().split("&")) {
            String[] v=part.split("=",2);String k=URLDecoder.decode(v[0],StandardCharsets.UTF_8),value=URLDecoder.decode(v.length>1 ? v[1] : "",StandardCharsets.UTF_8);
            if(q.containsKey(k)) { Object old=q.get(k);List<Object> all=old instanceof List<?> list ? new ArrayList<>(list) : new ArrayList<>(List.of(old)); all.add(value); q.put(k,all); }
            else q.put(k,value);
        }
        return q;
    }
    static Map<String,Object> normalized(Provider.Response response) {
        Map<String,Object> result=new LinkedHashMap<>(); List<Object> rows=new ArrayList<>();
        for(SearchResponse.Result r:response.results()) {
            Map<String,Object> row=new LinkedHashMap<>(),p=new LinkedHashMap<>(); row.put("url",r.url()); put(row,"title",r.title()); put(row,"snippet",r.snippet());put(row,"highlights",r.highlights());put(row,"score",r.score());
            p.putAll(Map.of("provider",r.provenance().provider(),"sourceUrl",r.provenance().sourceUrl(),"retrievedAt",CANONICAL));put(p,"requestId",r.provenance().requestId());row.put("provenance",p);rows.add(row);
        }
        result.put("results",rows);result.put("usage",response.usage()==null ? null : Map.of("unit",response.usage().unit(),"value",response.usage().value()));
        result.put("warnings",response.warnings().stream().map(w -> Map.of("code",w.code(),"provider",w.provider())).toList());return result;
    }
    static void put(Map<String,Object> map,String name,Object value) { if(value!=null) map.put(name,value); }
    static void adapterFixtures() throws Exception {
        Map<String,Object> fixtures=Values.object(fixture("providers.json"));Set<String> tested=new HashSet<>();
        for(Object v:Values.array(fixtures.get("cases"))) {
            Map<String,Object> c=Values.object(v),expected=Values.object(c.get("upstreamRequest"));String id=Values.string(c.get("provider")); tested.add(id);
            AtomicInteger calls=new AtomicInteger();
            Transport t=(wire,context) -> {
                calls.incrementAndGet();String base=wire.uri().toString().split("\\?",2)[0];
                // Fixture uses the reference instance selected by the shared generator.
                equal(base,expected.get("url"),"adapter URL "+id); equal(wire.method(),expected.get("method"),"adapter HTTP method "+id);
                sameJson(query(wire.uri()),expected.get("query"),"adapter query "+id);
                Map<String,String> headers=new TreeMap<>();wire.headers().forEach((k,x) -> headers.put(k.toLowerCase(Locale.ROOT),x));
                sameJson(headers,expected.get("headers"),"adapter headers "+id);
                Object body=wire.body()==null ? null : wire.headers().getOrDefault("Content-Type","").contains("x-www-form-urlencoded") ? query(URI.create("https://fixture.test/?"+new String(wire.body(),StandardCharsets.UTF_8))) : Json.parse(wire.body());
                sameJson(body,expected.get("body"),"adapter body "+id); return CompletableFuture.completedFuture(response(c.get("upstreamResponse")));
            };
            Provider p=fixtureProvider(id,t); Map<String,Object> cap=Values.object(c.get("capabilities"));
            equal(p.capabilities().domainFilters(),cap.get("domainFilters"),"domain capability");
            equal(p.capabilities().maxIncludeDomains(),Values.integer(cap.get("maxIncludeDomains"),0,10000),"include capacity");
            equal(p.capabilities().maxExcludeDomains(),Values.integer(cap.get("maxExcludeDomains"),0,10000),"exclude capacity");
            equal(p.capabilities().mutuallyExclusiveDomainFilters(),Boolean.TRUE.equals(cap.get("mutuallyExclusiveDomainFilters")),"filter exclusivity");
            equal(p.capabilities().maxQueryLength(),cap.get("maxQueryLength")==null ? null : Values.integer(cap.get("maxQueryLength"),1,100000),"query capacity");
            try(RequestContext context=RequestContext.create(Duration.ofSeconds(3),100000,null)) {
                Provider.Response r=await(p.search(SearchRequest.fromJson(c.get("request")),context));sameJson(normalized(r),c.get("response"),"adapter output "+id);
            }
            equal(calls.get(),1,"one page/no pagination");
        }
        equal(tested,Providers.IDS,"all 14 normalized providers covered");
    }
    static void adapterFailures() throws Exception {
        List<?> cases=Values.array(Values.object(fixture("providers.json")).get("cases"));Set<String> tested=new HashSet<>();
        for(Object value:cases) {
            Map<String,Object> c=Values.object(value);String id=Values.string(c.get("provider"));if(!tested.add(id))continue;
            Provider malformed=fixtureProvider(id,(r,ctx) -> CompletableFuture.completedFuture(response(Map.of())));
            error(() -> await(SearchClient.builder(malformed).build().search(QUERY)),INVALID_RESPONSE);
            for(int status:new int[]{401,402,403,432,433,429,408,500,503,400,302}) {
                Provider failing=fixtureProvider(id,(r,ctx) -> CompletableFuture.completedFuture(new Transport.Response(status,Map.of("Retry-After",List.of("0.125")),("upstream "+KEY+QUERY.query()).getBytes(StandardCharsets.UTF_8))));
                SearchException.Code code=Set.of(401,402,403,432,433).contains(status) ? AUTH : status==429 ? RATE_LIMIT : status==408 || status>=500 ? UNAVAILABLE : PROVIDER_ERROR;
                SearchException e=error(() -> await(SearchClient.builder(failing).build().search(QUERY)),code);
                equal(e.status(),status,"sanitized status preserved");equal(e.retryAfterMs(),125.0,"retry-after milliseconds");equal(e.attempts().size(),1,"failure attempt retained");
            }
            Provider broken=fixtureProvider(id,(r,ctx) -> CompletableFuture.failedFuture(new RuntimeException(KEY+QUERY.query())));
            error(() -> await(SearchClient.builder(broken).build().search(QUERY)),NETWORK);
            check(!broken.toString().contains("fixture-key"),"provider identity redacts credentials");
            // A malformed consumed result URL must not be filtered away, even beyond the requested output ceiling.
            Map<String,Object> body=new LinkedHashMap<>(Values.object(c.get("upstreamResponse")));
            corruptRows(body);
            Provider invalid=fixtureProvider(id,(r,ctx) -> CompletableFuture.completedFuture(response(body)));
            error(() -> await(SearchClient.builder(invalid).build().search(new SearchRequest("q",1))),INVALID_RESPONSE);
        }
        Provider capped=Providers.tavily(KEY,(r,c) -> CompletableFuture.completedFuture(response(Map.of("results",List.of(),"padding","x".repeat(1000)))));
        error(() -> await(SearchClient.builder(capped).maxResponseBytes(50).build().search(QUERY)),INVALID_RESPONSE);
        Provider oversizedError=Providers.tavily(KEY,(r,c) -> CompletableFuture.completedFuture(new Transport.Response(401,(KEY+"x".repeat(1000)).getBytes(StandardCharsets.UTF_8))));
        equal(error(() -> await(SearchClient.builder(oversizedError).maxResponseBytes(50).build().search(QUERY)),AUTH).status(),401,"HTTP error precedence survives oversized private body");
        AtomicReference<Transport.Request> captured=new AtomicReference<>();
        Providers.ValyuSettings settings=new Providers.ValyuSettings(1.0,0.7,"short",true,LocalDate.of(2026,1,1),LocalDate.of(2026,2,1),"fixture");
        Provider valyu=Providers.valyu(KEY,settings,(r,c) -> { captured.set(r); return CompletableFuture.completedFuture(response(Map.of("success",true,"results",List.of()))); });
        await(SearchClient.builder(valyu).build().search(QUERY));Map<String,Object> body=Values.object(Json.parse(captured.get().body()));equal(body.get("start_date"),"2026-01-01","Valyu settings serialized");
        error(() -> new Providers.ValyuSettings(-1.0,null,null,null,null,null,null),CONFIGURATION);
        error(() -> new Providers.SearxngOptions("http://unsafe.test",null,null,null,null,null),CONFIGURATION);
    }
    static void corruptRows(Map<String,Object> body) {
        Object row=Map.of("url","https://user:password@example.com","link","https://user:password@example.com");
        if(body.containsKey("organic"))body.put("organic",List.of(row));
        else if(body.containsKey("organic_results"))body.put("organic_results",List.of(row));
        else if(body.get("data") instanceof Map<?,?>)body.put("data",Map.of("web",List.of(row)));
        else if(body.get("web") instanceof Map<?,?>)body.put("web",Map.of("results",List.of(row)));
        else if(body.get("results") instanceof Map<?,?>)body.put("results",Map.of("web",List.of(row)));
        else body.put("results",List.of(row));
    }
    static void gateway() throws Exception {
        Object success=fixture("search-success.json");AtomicInteger calls=new AtomicInteger();
        GatewayClient client=new GatewayClient("https://gateway.example/exact",(r,c) -> {
            calls.incrementAndGet();equal(r.uri().toString(),"https://gateway.example/exact","gateway URL is exact");
            equal(r.headers().get("Authorization"),"Bearer "+KEY,"per-call gateway token");sameJson(Json.parse(r.body()),QUERY.toJson(),"gateway request envelope");
            check(!r.toString().contains(KEY),"wire request toString is redacted");
            return CompletableFuture.completedFuture(new Transport.Response(200,Map.of("X-SearchSDK-Protocol",List.of("1")),Json.bytes(success)));
        },Duration.ofSeconds(2),100000,2);
        SearchResponse value=await(client.search(QUERY,KEY,null));equal(value.provider(),"fixture","gateway success provider");equal(value.results().get(0).provenance().requestId(),"fixture-001","gateway provenance");
        equal(calls.get(),1,"gateway exactly one dispatch");
        for(Object v:Values.array(fixture("search-errors.json"))) {
            Map<String,Object> c=Values.object(v),envelope=Values.object(c.get("body"));int status=Values.integer(c.get("httpStatus"),100,599);
            GatewayClient failing=new GatewayClient("https://gateway.example/",(r,ctx) -> CompletableFuture.completedFuture(new Transport.Response(status,Json.bytes(envelope))),Duration.ofSeconds(1),10000,1);
            error(() -> await(failing.search(QUERY)),Values.code(Values.object(envelope.get("error")).get("code")));
        }
        for(int status:new int[]{401,402,403,432,433,429,408,500,404,302}) {
            GatewayClient failing=gatewayResponse(new Transport.Response(status,("malformed "+KEY).getBytes(StandardCharsets.UTF_8)));
            error(() -> await(failing.search(QUERY)),HttpSupport.error(new Transport.Response(status,new byte[0])).code());
        }
        GatewayClient version=gatewayResponse(new Transport.Response(200,Map.of("X-SearchSDK-Protocol",List.of("2")),Json.bytes(success)));
        error(() -> await(version.search(QUERY)),INVALID_RESPONSE);
        error(() -> await(gatewayResponse(new Transport.Response(200,Map.of("X-SearchSDK-Protocol",List.of("1","2")),Json.bytes(success))).search(QUERY)),INVALID_RESPONSE);
        error(() -> await(gatewayResponse(new Transport.Response(201,Json.bytes(success))).search(QUERY)),INVALID_RESPONSE);
        List<Consumer<Map<String,Object>>> invalid=new ArrayList<>();
        invalid.add(m -> m.remove("usage")); invalid.add(m -> m.put("usage",Map.of("unit","usd","value",-1)));
        invalid.add(m -> m.put("warnings",List.of(Map.of("code","arbitrary","provider","fixture"))));
        invalid.add(m -> m.put("attempts",List.of(Map.of("provider","fixture","startedAt",CANONICAL,"durationMs",-1,"outcome","success"))));
        invalid.add(m -> m.put("attempts",List.of(Map.of("provider","fixture","startedAt","garbage","durationMs",1,"outcome","success"))));
        invalid.add(m -> m.put("reuse",null)); invalid.add(m -> m.put("reuse","unknown")); invalid.add(m -> m.put("provider","unsafe name"));
        invalid.add(m -> m.put("results",List.of(Map.of("url","https://example.com"))));
        invalid.add(m -> { Map<String,Object> row=Values.object(Values.array(m.get("results")).get(0));row.put("highlights",List.of(1)); });
        invalid.add(m -> { Map<String,Object> row=Values.object(Values.array(m.get("results")).get(0));row.put("url","https://u:p@example.com"); });
        invalid.add(m -> { Map<String,Object> row=Values.object(Values.array(m.get("results")).get(0));Values.object(row.get("provenance")).put("requestId",KEY+"\n"); });
        invalid.add(m -> Values.object(Values.array(m.get("attempts")).get(0)).put("status",null));
        invalid.add(m -> Values.object(Values.array(m.get("attempts")).get(0)).put("code",null));
        Map<String,Object> fractional=Values.object(mutable(success));Values.object(Values.array(fractional.get("attempts")).get(0)).put("retryAfterMs",0.5);
        equal(await(gatewayResponse(response(fractional)).search(QUERY)).attempts().get(0).retryAfterMs(),0.5,"fractional finite retry-after metadata");
        for(Consumer<Map<String,Object>> mutate:invalid) {
            Map<String,Object> body=Values.object(mutable(success));mutate.accept(body);error(() -> await(gatewayResponse(response(body)).search(QUERY)),INVALID_RESPONSE);
        }
        for(String url:List.of("http://gateway.example/","https://user:pass@gateway.example/","https://gateway.example/?q=x","https://gateway.example/#x","https://gateway.example/?","https://gateway.example/#"))
            error(() -> new GatewayClient(url),CONFIGURATION);
        error(() -> client.search(QUERY,"invalid\nkey",null),INVALID_REQUEST);
    }
    static Object mutable(Object v) {
        if(v instanceof Map<?,?> map) { Map<String,Object> copy=new LinkedHashMap<>();map.forEach((k,x) -> copy.put((String)k,mutable(x)));return copy; }
        if(v instanceof List<?> list) return new ArrayList<>(list.stream().map(SdkTest::mutable).toList()); return v;
    }
    static GatewayClient gatewayResponse(Transport.Response response) { return new GatewayClient("https://gateway.example/",(r,c) -> CompletableFuture.completedFuture(response),Duration.ofSeconds(2),100000,2); }
    static void reliability() throws Exception {
        AtomicInteger calls=new AtomicInteger();
        Provider flaky=provider("flaky",(r,c) -> calls.getAndIncrement()==0 ? CompletableFuture.failedFuture(new SearchException(RATE_LIMIT,429,10L,List.of())) : CompletableFuture.completedFuture(empty()));
        long start=System.nanoTime();SearchResponse result=await(SearchClient.builder(flaky).retry(new RetryPolicy(1,1,5)).build().search(QUERY));
        equal(calls.get(),2,"opt-in retry");equal(result.attempts().size(),2,"all retry attempts recorded");check((System.nanoTime()-start)/1e6>=9,"retry-after not shortened");
        AtomicInteger fallbackCalls=new AtomicInteger();
        Provider failed=provider("first",(r,c) -> CompletableFuture.failedFuture(new SearchException(UNAVAILABLE)));
        Provider fallback=provider("second",(r,c) -> { fallbackCalls.incrementAndGet();return CompletableFuture.completedFuture(empty()); });
        result=await(SearchClient.builder(failed).fallback(fallback).build().search(QUERY));
        equal(result.provider(),"second","explicit fallback provider");equal(result.attempts().size(),2,"fallback attempts");equal(result.warnings(),List.of(new SearchResponse.Warning("fallback_used","second")),"fallback provenance warning");
        Provider auth=provider("auth",(r,c) -> CompletableFuture.failedFuture(new SearchException(AUTH)));
        error(() -> await(SearchClient.builder(auth).fallback(fallback).retry(new RetryPolicy(2,1,5)).build().search(QUERY)),AUTH);
        equal(fallbackCalls.get(),1,"terminal auth never falls back");
        AtomicInteger dispatches=new AtomicInteger();
        Provider broad=provider("broad",(r,c) -> { dispatches.incrementAndGet();return CompletableFuture.completedFuture(empty()); });
        Provider narrow=Providers.brave(KEY,(r,c) -> { dispatches.incrementAndGet();return CompletableFuture.completedFuture(response(Map.of())); });
        error(() -> SearchClient.builder(broad).fallback(narrow).build().search(new SearchRequest("q",5,List.of("example.com"),null)),UNSUPPORTED_OPTION);
        equal(dispatches.get(),0,"entire chain checked before paid dispatch");
        error(() -> SearchClient.builder(broad).fallback(broad).build(),CONFIGURATION);
        error(() -> SearchClient.builder(broad).maxConcurrency(0).build(),CONFIGURATION);
        error(() -> SearchClient.builder(broad).timeout(Duration.ZERO).build(),CONFIGURATION);
        Provider throwing=provider("throwing",(r,c) -> { throw new RuntimeException(KEY); });
        error(() -> await(SearchClient.builder(throwing).fallback(fallback).build().search(QUERY)),PROVIDER_ERROR);
        SearchResponse.Result row=new SearchResponse.Result("https://example.com",null,null,null,null,new SearchResponse.Provenance("fixture","https://example.com",Instant.now(),null));
        result=await(SearchClient.builder(provider("many",(r,c) -> CompletableFuture.completedFuture(new Provider.Response(List.of(row,row,row),null,List.of())))).build().search(new SearchRequest("q",1)));
        equal(result.results().size(),1,"client output ceiling");
    }
    static void cancellationAndBatch() throws Exception {
        AtomicInteger dispatched=new AtomicInteger();
        Provider idle=provider("idle",(r,c) -> { dispatched.incrementAndGet();return new CompletableFuture<>(); });
        CancellationToken preCancelled=new CancellationToken();preCancelled.cancel();
        SearchClient client=SearchClient.builder(idle).timeout(Duration.ofMillis(120)).maxConcurrency(1).build();
        error(() -> await(client.search(QUERY,preCancelled)),ABORTED);equal(dispatched.get(),0,"pre-cancelled search never dispatches");
        CancellationToken token=new CancellationToken();CompletionStage<SearchResponse> pending=client.search(QUERY,token);Thread.sleep(15);token.cancel();error(() -> await(pending),ABORTED);
        equal(error(() -> await(client.search(QUERY)),TIMEOUT).attempts().size(),1,"deadline failure retains active attempt");
        SearchResponse fallback=await(SearchClient.builder(idle).fallback(success("backup")).timeout(Duration.ofSeconds(2)).attemptTimeout(Duration.ofMillis(30)).build().search(QUERY));
        equal(fallback.attempts().get(0).code(),ATTEMPT_TIMEOUT,"attempt deadline preserves whole budget for fallback");
        // Synchronous custom code cannot prevent the public call from returning a cancellable future.
        Provider slow=provider("sync",(r,c) -> { try { Thread.sleep(120); } catch(InterruptedException e) { Thread.currentThread().interrupt(); } return CompletableFuture.completedFuture(empty()); });
        long begin=System.nanoTime();CompletionStage<SearchResponse> bounded=SearchClient.builder(slow).timeout(Duration.ofMillis(25)).build().search(QUERY);
        check((System.nanoTime()-begin)/1e6<80,"custom provider invocation is deferred");error(() -> await(bounded),TIMEOUT);
        Thread.sleep(130);
        AtomicInteger active=new AtomicInteger(),peak=new AtomicInteger(),done=new AtomicInteger();
        Provider batchProvider=provider("batch",(r,c) -> {
            int n=active.incrementAndGet();peak.accumulateAndGet(n,Math::max);
            CompletableFuture<Provider.Response> future=new CompletableFuture<>();
            CompletableFuture.delayedExecutor(5,TimeUnit.MILLISECONDS).execute(() -> {
                active.decrementAndGet();done.incrementAndGet();if(r.query().equals("bad"))future.completeExceptionally(new SearchException(AUTH));else future.complete(empty());
            });return future;
        });
        SearchClient batch=SearchClient.builder(batchProvider).maxConcurrency(2).timeout(Duration.ofSeconds(4)).build();
        List<SearchRequest> inputs=new ArrayList<>();for(int i=0;i<20;i++)inputs.add(new SearchRequest(i==7 ? "bad" : "q"+i));
        List<Batch.Outcome> outcomes=await(batch.searchBatch(inputs,4,Duration.ofSeconds(4),null));equal(outcomes.size(),20,"batch output length");
        for(int i=0;i<20;i++) { equal(outcomes.get(i).index(),i,"ordered batch index");equal(outcomes.get(i).fulfilled(),i!=7,"sibling success retained"); }
        check(peak.get()<=2,"client concurrency bounds batch workers");equal(done.get(),20,"each item dispatched once");
        List<SearchRequest> thousand=new ArrayList<>();for(int i=0;i<1000;i++)thousand.add(QUERY);
        equal(await(SearchClient.builder(success("fast")).timeout(Duration.ofSeconds(5)).build().searchBatch(thousand,4,Duration.ofSeconds(5),null)).size(),1000,"batch maximum has no recursive stack growth");
        List<Batch.Outcome> stopped=await(client.searchBatch(List.of(QUERY,QUERY,QUERY),1,Duration.ofMillis(30),null));
        for(Batch.Outcome o:stopped) equal(o.error().code(),TIMEOUT,"batch deadline includes undispatched items");
        CancellationToken cancelled=new CancellationToken();cancelled.cancel();
        stopped=await(client.searchBatch(List.of(QUERY,QUERY),1,Duration.ofSeconds(1),cancelled));for(Batch.Outcome o:stopped)equal(o.error().code(),ABORTED,"batch cancellation includes queued items");
        List<Batch.Outcome> invalid=await(batch.searchBatch(Arrays.asList(QUERY,null,QUERY)));equal(invalid.get(1).error().code(),INVALID_REQUEST,"per-item invalid request");
    }
    static void wireModels() throws Exception {
        ExaModels.SearchRequest body=ExaModels.SearchRequest.builder("typed fixture").numResults(3).type("auto")
            .additionalField("future_option",Map.of("flag",true)).build();
        equal(body.query(),"typed fixture","typed known request string");equal(body.numResults(),3L,"typed known request integer");
        check(body.additionalFields().containsKey("future_option"),"unknown request fields retained");
        error(() -> ExaModels.SearchRequest.builder().build(),INVALID_REQUEST);
        error(() -> ExaModels.SearchRequest.builder().query(null).build(),INVALID_REQUEST);
        error(() -> ExaClient.SearchInput.builder().build(),INVALID_REQUEST);
        error(() -> ExaModels.SearchRequest.builder("q").additionalField("query","bypass"),INVALID_REQUEST);
        Map<String,Object> upstream=new LinkedHashMap<>();upstream.put("requestId","typed-request");
        upstream.put("results",List.of(Map.of("url","https://example.com/typed","title","Typed fixture","future_result",List.of(1,2))));
        upstream.put("future_response",Map.of("flag",true));
        AtomicReference<Transport.Request> sent=new AtomicReference<>();
        ExaClient client=new ExaClient(nativeClient("exa",(r,c) -> { sent.set(r);return CompletableFuture.completedFuture(response(upstream)); }));
        NativeResponse<ExaModels.SearchResponse> output=await(client.search(body));
        String title=output.data().results().get(0).title();String url=output.data().results().get(0).url();
        equal(title,"Typed fixture","typed response title without Object casts");equal(url,"https://example.com/typed","typed response URL without Object casts");
        sameJson(output.data().toJson(),upstream,"typed response preserves unknown fields losslessly");
        check(output.data().results().get(0).additionalFields().containsKey("future_result"),"nested unknown fields retained");
        sameJson(Json.parse(sent.get().body()),Map.of("query","typed fixture","numResults",3,"type","auto","future_option",Map.of("flag",true),"stream",false),"typed builder maps native wire request");
        Map<String,Object> mutable=new LinkedHashMap<>();mutable.put("query","original");
        ExaModels.SearchRequest snapshot=ExaModels.SearchRequest.fromJson(mutable);mutable.put("query","changed");equal(snapshot.query(),"original","wire models snapshot caller maps");
        error(() -> ExaModels.SearchRequest.fromJson(Map.of("query",1)).query(),INVALID_RESPONSE);
        check(!body.toString().contains("typed fixture"),"wire model toString redacts content");
        SerperModels.SearchRequest item=SerperModels.SearchRequest.builder("batch fixture").num(2).build();
        SerperModels.SearchBody batch=SerperModels.SearchBody.ofVariant2(List.of(item));
        equal(batch.asVariant2().get(0).q(),"batch fixture","typed array union request variant");
        sameJson(batch.toJson(),List.of(Map.of("q","batch fixture","num",2)),"mixed union retains native array representation");
        SerperModels.SearchBody future=SerperModels.SearchBody.fromJson(Map.of("future_variant",List.of(1,true)));
        sameJson(future.toJson(),Map.of("future_variant",List.of(1,true)),"unknown union alternatives survive roundtrip");
        error(() -> ContextClient.GetLogInput.builder().build(),INVALID_REQUEST);
        ContextModels.GetLogPath path=ContextModels.GetLogPath.builder().requestId("typed-id").build();
        ContextClient.GetLogInput input=ContextClient.GetLogInput.builder(path).build();
        equal(input.toNative().path.get("request_id"),"typed-id","required typed path group");
        equal(TavilyModels.PaidSearchHeader.builder().paymentSignature("external").build().paymentSignature(),"external","idiomatic typed payment-signature header");
        SerpApiModels.ExtractQuery extractQuery=SerpApiModels.ExtractQuery.builder("https://example.com").mode("crawl").maxPages(3).build();
        SerpApiClient extracts=new SerpApiClient(nativeClient("serpapi",(r,c) -> {
            equal(query(r.uri()).get("engine"),"extract","typed extraction alias engine");equal(query(r.uri()).get("max_pages"),"3","typed extraction query field");
            return CompletableFuture.completedFuture(response(Map.of("text_content",Map.of("markdown","# Synthetic fixture"),"future",true)));
        }));
        NativeResponse<SerpApiModels.ExtractResponse> extracted=await(extracts.extract(SerpApiClient.ExtractInput.builder(extractQuery).build()));
        equal(extracted.data().textContent().markdown(),"# Synthetic fixture","typed SerpAPI extraction response");
        SerpApiClient locations=new SerpApiClient(nativeClient("serpapi",(r,c) -> CompletableFuture.completedFuture(response(List.of(Map.of("id","fixture","name","Synthetic place"))))));
        List<SerpApiModels.Location> places=await(locations.locations()).data();equal(places.get(0).name(),"Synthetic place","typed top-level array response");
        java.math.BigDecimal exact=new java.math.BigDecimal("9223372036854775807");equal(WireTypes.integer(exact),Long.MAX_VALUE,"integer getters preserve int64 precision");
        error(() -> WireTypes.integer(new java.math.BigDecimal("0.00000000000000000000000001")),INVALID_RESPONSE);
    }
    static NativeClient nativeClient(String provider,Transport transport) { return NativeClient.builder(provider,KEY).transport(transport).teamApiKey("fixture-team-key").build(); }
    static void nativeWire() throws Exception {
        AtomicReference<Transport.Request> sent=new AtomicReference<>();
        Transport t=(r,c) -> { sent.set(r);return CompletableFuture.completedFuture(response(Map.of("fixture",true))); };
        ExaClient exa=new ExaClient(nativeClient("exa",t));await(exa.search(NativeInput.builder().body(Map.of("query","q")).build()));
        equal(sent.get().uri().toString(),"https://api.exa.ai/search","native Exa route");equal(sent.get().headers().get("X-API-Key"),KEY,"native Exa authentication");
        sameJson(Json.parse(sent.get().body()),Map.of("query","q","stream",false),"native JSON stream negotiation");
        BraveClient brave=new BraveClient(nativeClient("brave",t));
        await(brave.search(NativeInput.builder().query("q","q").query("result_filter",List.of("web","news")).build()));
        equal(query(sent.get().uri()).get("result_filter"),"web,news","retained comma-separated query convention");
        ContextClient context=new ContextClient(nativeClient("context",t));
        await(context.getLog("a/b ?#",NativeInput.empty()));equal(sent.get().uri().getRawPath(),"/v1/org/logs/a%2Fb%20%3F%23","path substitution is one encoded segment");
        error(() -> context.getLog("..",NativeInput.empty()),INVALID_REQUEST);
        error(() -> context.getLog(NativeInput.builder().path("request_id","ok").path("extra","bad").build()),INVALID_REQUEST);
        error(() -> context.getLog(NativeInput.empty()),INVALID_REQUEST);
        error(() -> exa.search(NativeInput.builder().body(Map.of("query","q")).header("aUtHoRiZaTiOn",KEY).build()),INVALID_REQUEST);
        error(() -> exa.search(NativeInput.builder().body(Map.of("query","q","stream",true)).build()),UNSUPPORTED_OPTION);
        error(() -> exa.search(NativeInput.builder().body(Map.of("query","q")).header("Host","other.example").build()),INVALID_REQUEST);
        NativeClient team=NativeClient.builder("exa",KEY).transport(t).build();
        error(() -> team.execute("listApiKeys",NativeInput.empty()),CONFIGURATION);
        await(nativeClient("exa",t).execute("listApiKeys",NativeInput.empty()));equal(sent.get().headers().get("X-API-Key"),"fixture-team-key","separate Exa team credential");
        String logo=await(context.logoUrl(NativeInput.builder().query("publicClientId","public").query("domain","example.com").query("theme","dark").build())).data();
        equal(URI.create(logo).getHost(),"logos.context.dev","logo embedding fixed origin");
        await(context.headLogo(NativeInput.builder().query("publicClientId","public").query("domain","example.com").build()));
        check(!sent.get().headers().containsKey("Authorization"),"logo HEAD never forwards provider credentials");
        TavilyClient tavily=new TavilyClient(nativeClient("tavily",t));
        await(tavily.paidSearch(NativeInput.builder().body(Map.of("query","q","search_depth","advanced")).header("PAYMENT-SIGNATURE","synthetic-signature").build()));
        equal(sent.get().uri().toString(),"https://x402.tavily.com/search","x402 fixed endpoint");
        check(!sent.get().headers().containsKey("Authorization"),"x402 never receives provider API key");
        equal(sent.get().headers().get("PAYMENT-SIGNATURE"),"synthetic-signature","external payment authorization bound unchanged");
        error(() -> tavily.paidSearch(NativeInput.builder().body(Map.of("query","q","search_depth","basic")).build()),UNSUPPORTED_OPTION);
        TavilyClient keyless=new TavilyClient(NativeClient.builder("tavily",null).tavilyKeyless(true).transport(t).build());
        await(keyless.search(NativeInput.builder().body(Map.of("query","q")).build()));equal(sent.get().headers().get("X-Tavily-Access-Mode"),"keyless","explicit Tavily keyless mode");
        error(keyless::getUsage,CONFIGURATION);
        SerpApiClient serp=new SerpApiClient(nativeClient("serpapi",t));
        await(serp.google(NativeInput.builder().query("q","q").build()));equal(query(sent.get().uri()).get("engine"),"google","native engine alias");equal(query(sent.get().uri()).get("api_key"),KEY,"SerpAPI query credential");
        error(() -> serp.search(NativeInput.builder().query("engine","google").query("api_key","other").build()),INVALID_REQUEST);
        List<MultipartBody.Part> parts=List.of(new MultipartBody.Part("image","fixture.png","image/png",new byte[]{1,2,3}));
        await(serp.uploadImage(NativeInput.builder().multipart(new MultipartBody(parts)).build()));
        String multipart=new String(sent.get().body(),StandardCharsets.ISO_8859_1);
        check(sent.get().headers().get("Content-Type").startsWith("multipart/form-data; boundary="),"multipart boundary automatic");
        check(multipart.contains("name=\"api_key\"") && multipart.contains(KEY),"SerpAPI multipart credential injected");
        equal(parts.size(),1,"caller multipart fields not mutated");
        error(() -> serp.uploadImage(NativeInput.builder().multipart(new MultipartBody(List.of(MultipartBody.Part.text("image","fixture"),MultipartBody.Part.text("api_key","other")))).build()),INVALID_REQUEST);
        error(() -> new MultipartBody.Part("bad\r\nheader",null,null,new byte[0]),INVALID_REQUEST);
        MultipartBody extended=new MultipartBody(List.of(new MultipartBody.Part("files[]","é \"quoted\".txt","text/plain",new byte[]{1})));
        MultipartBody.Encoded encoded=extended.encode(1000);String framed=new String(encoded.bytes(),StandardCharsets.UTF_8);
        check(framed.contains("name=\"files[]\"") && framed.contains("é \\\"quoted\\\".txt"),"multipart preserves Unicode filenames and safely quotes field names");
        NativeClient small=NativeClient.builder("context",KEY).transport(t).maxRequestBytes(5).build();
        error(() -> small.execute("parse",NativeInput.builder().rawBody(new byte[6],"application/octet-stream").build()),INVALID_REQUEST);
        AtomicInteger retries=new AtomicInteger();
        Transport flaky=(r,c) -> CompletableFuture.completedFuture(retries.getAndIncrement()==0 ? new Transport.Response(503,new byte[0]) : response(Map.of()));
        NativeClient read=NativeClient.builder("exa",KEY).transport(flaky).retry(new RetryPolicy(1,1,1)).build();
        await(read.execute("getWebset",NativeInput.builder().path("id","fixture").build()));equal(retries.get(),2,"explicit safe native read retry");
        retries.set(0);error(() -> await(read.execute("search",NativeInput.builder().body(Map.of("query","q")).build())),UNAVAILABLE);equal(retries.get(),1,"native POST never retries");
        AtomicBoolean nativeCancelled=new AtomicBoolean();CountDownLatch started=new CountDownLatch(1);
        Transport idle=(r,c) -> { c.cancellation().onCancel(() -> nativeCancelled.set(true));started.countDown();return new CompletableFuture<>(); };
        ExaClient cancelClient=new ExaClient(NativeClient.builder("exa",KEY).transport(idle).timeout(Duration.ofSeconds(2)).build());
        CompletableFuture<?> cancelled=cancelClient.search(NativeInput.builder().body(Map.of("query","q")).build()).toCompletableFuture();
        check(started.await(1,TimeUnit.SECONDS),"native named operation dispatched");cancelled.cancel(true);Thread.sleep(10);check(nativeCancelled.get(),"named native future cancellation propagates to transport");
        NativeClient expired=NativeClient.builder("exa",KEY).transport(idle).timeout(Duration.ofMillis(30)).build();
        equal(error(() -> await(expired.execute("search",NativeInput.builder().body(Map.of("query","q")).build())),TIMEOUT).attempts().size(),1,"native deadline retains active attempt");
        equal(ContextLogo.url(new ContextLogo.Query("public","example.com",null,null)),"https://logos.context.dev/?publicClientId=public&domain=example.com","key-free typed logo helper");
        error(() -> nativeClient("exa",t).execute("notAnOperation",NativeInput.empty()),UNSUPPORTED_OPTION);
        for(String id:List.of("valyu","searxng","unknown")) error(() -> NativeClient.builder(id,KEY).build(),CONFIGURATION);
    }
    static void nativeCatalog() throws Exception {
        equal(NativeClient.catalog().size(),493,"retained operation inventory");Set<String> modes=new HashSet<>(),providers=new HashSet<>();
        AtomicInteger dispatched=new AtomicInteger();
        Transport transport=new Transport() {
            public CompletionStage<Response> send(Request r,RequestContext c) {
                dispatched.incrementAndGet();
                String name=r.headers().get("X-Fixture-Operation");
                NativeOperation op=NativeClient.catalog().stream().filter(o -> (o.provider()+"."+o.name()).equals(name)).findFirst().orElseThrow();
                byte[] bytes=switch(op.response()) { case "empty" -> new byte[0]; case "text" -> op.name().equals("revokeAuthToken") ? new byte[0] : "fixture".getBytes(StandardCharsets.UTF_8); case "bytes","raw" -> new byte[]{1,2,3}; default -> Json.bytes(Map.of("fixture",true)); };
                return CompletableFuture.completedFuture(new Response(200,bytes));
            }
            @Override public CompletionStage<StreamResponse> stream(Request r,RequestContext c) {
                dispatched.incrementAndGet();return CompletableFuture.completedFuture(streamResponse("data: fixture\n\n".getBytes(StandardCharsets.UTF_8),1,new AtomicBoolean()));
            }
        };
        for(NativeOperation op:NativeClient.catalog()) {
            modes.add(op.response());providers.add(op.provider());NativeInput.Builder input=NativeInput.builder().header("X-Fixture-Operation",op.provider()+"."+op.name());
            Matcher m=Pattern.compile("\\{([^}]+)}").matcher(op.path());while(m.find())input.path(m.group(1),"fixture/id");
            for(String q:op.list("requiredQuery"))input.query(q,"fixture");
            for(String h:op.list("requiredHeaders")) if(!Values.object(op.contract().get("headers")).containsKey(h)) input.header(h,h.equalsIgnoreCase("Content-Type") ? "application/octet-stream" : "fixture");
            if(op.flag("rawBody")) {
                if(op.name().equals("uploadImage") || "multipart/form-data".equals(op.text("rawContentType")))input.multipart(new MultipartBody(List.of(MultipartBody.Part.text(op.name().equals("uploadImage") ? "image" : "file","fixture"))));
                else input.rawBody(new byte[]{1,2,3},op.text("rawContentType"));
            } else if(op.flag("bodyRequired") || op.flag("streamField")) input.body(op.provider().equals("exa") && op.name().equals("searchStream") ? Map.of("query","q","outputSchema",Map.of("type","object")) : Map.of("query","q"));
            if(op.provider().equals("serpapi")) {
                if(op.name().equals("google"))input.query("q","q");
                else if(op.name().startsWith("extract"))input.query("url","https://example.com");
                else if(op.name().startsWith("search"))input.query("engine","google");
            }
            if(op.base().equals("https://logos.context.dev"))input.query("publicClientId","public").query("domain","example.com");
            NativeResponse<Object> result;
            try { result=await(nativeClient(op.provider(),transport).execute(op.name(),input.build())); }
            catch(Exception e) { throw new AssertionError("Catalog dispatch: "+op.provider()+"."+op.name(),e); }
            equal(result.metadata().operation(),op.name(),"native operation metadata");
            check(op.source().startsWith("https://"),"native source attribution");
            if(result.data() instanceof NativeEventStream events) { equal(await(collect(events)).size(),1,"catalog SSE dispatch");events.close(); }
        }
        equal(providers.size(),13,"13 retained native provider families");equal(modes,Set.of("json","sse","empty","text","bytes","raw","embedding-url"),"all native modes dispatched");
        equal(dispatched.get(),492,"all operations dispatched except local embedding URL");
    }
    static Transport.StreamResponse streamResponse(byte[] bytes,int chunkSize,AtomicBoolean cancelled) {
        Flow.Publisher<List<ByteBuffer>> publisher=subscriber -> subscriber.onSubscribe(new Flow.Subscription() {
            int index; boolean ended,emitting; long demand;
            @Override public synchronized void request(long n) {
                if(ended)return;if(n<=0){ended=true;subscriber.onError(new IllegalArgumentException("invalid demand"));return;}
                demand=demand>Long.MAX_VALUE-n ? Long.MAX_VALUE : demand+n;if(emitting)return;emitting=true;
                try {
                    while(!ended && demand>0 && index<bytes.length) {
                        demand--;int end=Math.min(bytes.length,index+chunkSize);byte[] chunk=Arrays.copyOfRange(bytes,index,end);index=end;subscriber.onNext(List.of(ByteBuffer.wrap(chunk)));
                    }
                    if(!ended && index==bytes.length) { ended=true;subscriber.onComplete(); }
                } finally { emitting=false; }
            }
            @Override public synchronized void cancel() { ended=true;cancelled.set(true); }
        });
        return new Transport.StreamResponse(200,Map.of("Content-Type",List.of("text/event-stream; charset=utf-8")),publisher);
    }
    static CompletionStage<List<NativeEventStream.Event>> collect(NativeEventStream events) {
        CompletableFuture<List<NativeEventStream.Event>> result=new CompletableFuture<>();List<NativeEventStream.Event> rows=new ArrayList<>();
        events.subscribe(new Flow.Subscriber<>() {
            public void onSubscribe(Flow.Subscription s) { s.request(Long.MAX_VALUE); }
            public void onNext(NativeEventStream.Event e) { rows.add(e); }
            public void onError(Throwable e) { result.completeExceptionally(e); }
            public void onComplete() { result.complete(List.copyOf(rows)); }
        });return result;
    }
    static void sse() throws Exception {
        String content="\ufeff: comment\r\nid: request-1\r\nevent: update\r\nretry: 100\r\ndata: é😀\r\ndata: second\r\n\r\ndata:\n\nid: \nretry: nope\ndata: last\n\n";
        AtomicBoolean cancelled=new AtomicBoolean();
        RequestContext context=RequestContext.create(Duration.ofSeconds(2),10000,null);
        NativeEventStream stream=new NativeEventStream(streamResponse(content.getBytes(StandardCharsets.UTF_8),1,cancelled).body(),context,() -> {});
        List<NativeEventStream.Event> events=await(collect(stream));equal(events.size(),3,"SSE split UTF-8/CRLF parser");
        equal(events.get(0),new NativeEventStream.Event("update","é😀\nsecond","request-1",100L),"SSE event fields");
        equal(events.get(1).data(),"","SSE empty data");equal(events.get(1).id(),"request-1","SSE event id persistence");equal(events.get(2).id(),"","SSE empty id reset");check(cancelled.get(),"completed stream releases transport");
        AtomicReference<Flow.Subscription> sub=new AtomicReference<>();AtomicInteger count=new AtomicInteger();
        NativeEventStream demand=new NativeEventStream(streamResponse("data: one\n\ndata: two\n\n".getBytes(StandardCharsets.UTF_8),1,new AtomicBoolean()).body(),RequestContext.create(Duration.ofSeconds(2),1000,null),() -> {});
        demand.subscribe(new Flow.Subscriber<>() { public void onSubscribe(Flow.Subscription s){sub.set(s);}public void onNext(NativeEventStream.Event e){count.incrementAndGet();}public void onError(Throwable e){}public void onComplete(){} });
        equal(count.get(),0,"SSE applies backpressure");sub.get().request(1);equal(count.get(),1,"one requested event delivered");sub.get().cancel();
        AtomicBoolean released=new AtomicBoolean();
        NativeEventStream over=new NativeEventStream(streamResponse("data: over-limit\n\n".getBytes(StandardCharsets.UTF_8),1,released).body(),RequestContext.create(Duration.ofSeconds(1),5,null),() -> {});
        error(() -> await(collect(over)),INVALID_RESPONSE);check(released.get(),"over-limit SSE cancels body");
        byte[] invalid={'d','a','t','a',':',' ',(byte)0xc3,0x28,'\n','\n'};
        NativeEventStream malformed=new NativeEventStream(streamResponse(invalid,1,new AtomicBoolean()).body(),RequestContext.create(Duration.ofSeconds(1),1000,null),() -> {});
        error(() -> await(collect(malformed)),INVALID_RESPONSE);
        AtomicBoolean abandoned=new AtomicBoolean();
        NativeEventStream notConsumed=new NativeEventStream(streamResponse(new byte[0],1,abandoned).body(),RequestContext.create(Duration.ofMillis(25),1000,null),() -> {});
        Thread.sleep(45);check(abandoned.get(),"unsubscribed SSE deadline cancels publisher");notConsumed.close();
        AtomicBoolean idleCancelled=new AtomicBoolean();
        Flow.Publisher<List<ByteBuffer>> idle=subscriber -> subscriber.onSubscribe(new Flow.Subscription() { public void request(long n) {} public void cancel() { idleCancelled.set(true); } });
        NativeEventStream timeout=new NativeEventStream(idle,RequestContext.create(Duration.ofMillis(30),1000,null),() -> {});
        error(() -> await(collect(timeout)),TIMEOUT);check(idleCancelled.get(),"idle SSE deadline cancels upstream");
        CancellationToken token=new CancellationToken();
        NativeEventStream abort=new NativeEventStream(idle,RequestContext.create(Duration.ofSeconds(2),1000,token),() -> {});
        CompletionStage<List<NativeEventStream.Event>> active=collect(abort);token.cancel();error(() -> await(active),ABORTED);
        AtomicBoolean invalidDemandCancelled=new AtomicBoolean();AtomicInteger terminalErrors=new AtomicInteger();
        NativeEventStream invalidDemand=new NativeEventStream(streamResponse(new byte[]{1},1,invalidDemandCancelled).body(),RequestContext.create(Duration.ofSeconds(1),1000,null),() -> {});
        invalidDemand.subscribe(new Flow.Subscriber<>() { public void onSubscribe(Flow.Subscription s) { s.request(0); } public void onNext(NativeEventStream.Event e) {} public void onError(Throwable e) { terminalErrors.incrementAndGet(); } public void onComplete() { throw new AssertionError("Unexpected completion"); } });
        equal(terminalErrors.get(),1,"invalid demand emits one terminal error");check(invalidDemandCancelled.get(),"invalid demand before upstream attachment cancels body");
        Flow.Publisher<List<ByteBuffer>> throwing=subscriber -> { throw new RuntimeException(KEY); };
        NativeEventStream failedPublisher=new NativeEventStream(throwing,RequestContext.create(Duration.ofSeconds(1),1000,null),() -> {});
        error(() -> await(collect(failedPublisher)),NETWORK);
        NativeEventStream closedPublisher=new NativeEventStream(throwing,RequestContext.create(Duration.ofSeconds(1),1000,null),() -> {});
        closedPublisher.close();
        NativeEventStream eof=new NativeEventStream(streamResponse("data: no-dispatch".getBytes(StandardCharsets.UTF_8),1,new AtomicBoolean()).body(),RequestContext.create(Duration.ofSeconds(1),1000,null),() -> {});
        equal(await(collect(eof)).size(),0,"EOF does not dispatch an unterminated SSE event");
    }
    static void transportTimeout() throws Exception {
        for(SearchException.Code code:List.of(TIMEOUT,ATTEMPT_TIMEOUT)) {
            try(RequestContext context=new RequestContext(Duration.ofSeconds(30),1000,null,code)) {
                Throwable wrapped=new CompletionException(new java.net.http.HttpTimeoutException(KEY));
                error(() -> { throw JdkTransport.failure(wrapped,context); },code);
                error(context::check,code);
                check(context.cancellation().isCancelled(),"JDK timeout cancels pending context work");
            }
        }
        CancellationToken cancelled=new CancellationToken();cancelled.cancel();
        try(RequestContext context=RequestContext.create(Duration.ofSeconds(30),1000,cancelled)) {
            error(() -> { throw JdkTransport.failure(new java.net.http.HttpTimeoutException(KEY),context); },ABORTED);
        }
        try(RequestContext context=RequestContext.create(Duration.ofSeconds(30),1000,null)) {
            error(() -> { throw JdkTransport.failure(new java.io.IOException(KEY),context); },NETWORK);
            context.check();
            check(!context.cancellation().isCancelled(),"network errors do not expire the context");
        }
    }
    static void loopback() throws Exception {
        Object gateway=fixture("search-success.json");AtomicInteger redirected=new AtomicInteger(),requests=new AtomicInteger();
        HttpServer server=HttpServer.create(new InetSocketAddress(InetAddress.getLoopbackAddress(),0),0);
        ExecutorService executor=Executors.newFixedThreadPool(2);server.setExecutor(executor);
        server.createContext("/search",exchange -> {
            requests.incrementAndGet();byte[] incoming=exchange.getRequestBody().readAllBytes();
            check(exchange.getRequestMethod().equals("POST"),"real HTTP POST");check(exchange.getRequestHeaders().getFirst("Authorization").equals("Bearer "+KEY),"real HTTP auth");
            check(Values.object(Json.parse(incoming)).containsKey("query"),"real HTTP JSON body");
            byte[] body=Json.bytes(Map.of("request_id","loopback-001","results",List.of(Map.of("url","https://example.com","content","fixture","score",0.7)),"usage",Map.of("credits",1)));
            exchange.getResponseHeaders().add("Content-Type","application/json");exchange.sendResponseHeaders(200,body.length);exchange.getResponseBody().write(body);exchange.close();
        });
        server.createContext("/challenge",exchange -> { exchange.getResponseHeaders().add("WWW-Authenticate","Basic realm=fixture");exchange.sendResponseHeaders(401,-1);exchange.close(); });
        server.createContext("/gateway",exchange -> { exchange.getRequestBody().readAllBytes();byte[] body=Json.bytes(gateway);exchange.getResponseHeaders().add("X-SearchSDK-Protocol","1");exchange.sendResponseHeaders(200,body.length);exchange.getResponseBody().write(body);exchange.close(); });
        server.createContext("/redirect",exchange -> { exchange.getResponseHeaders().add("Location","/capture");exchange.sendResponseHeaders(302,-1);exchange.close(); });
        server.createContext("/capture",exchange -> { redirected.incrementAndGet();exchange.sendResponseHeaders(200,-1);exchange.close(); });
        server.createContext("/oversize",exchange -> { try { exchange.sendResponseHeaders(200,1000);exchange.getResponseBody().write(new byte[1000]); } catch(java.io.IOException ignored) {} finally { exchange.close(); } });
        server.createContext("/oversizeauth",exchange -> { try { exchange.sendResponseHeaders(401,1000);exchange.getResponseBody().write(new byte[1000]); } catch(java.io.IOException ignored) {} finally { exchange.close(); } });
        server.createContext("/chunked",exchange -> { try { exchange.sendResponseHeaders(200,0);for(int i=0;i<30;i++) { exchange.getResponseBody().write("0123456789".getBytes(StandardCharsets.UTF_8));exchange.getResponseBody().flush(); } } catch(java.io.IOException ignored) {} finally { exchange.close(); } });
        server.createContext("/slow",exchange -> { try { Thread.sleep(150);exchange.sendResponseHeaders(200,2);exchange.getResponseBody().write("{}".getBytes(StandardCharsets.UTF_8)); } catch(InterruptedException e) { Thread.currentThread().interrupt(); } catch(java.io.IOException ignored) {} finally { exchange.close(); } });
        server.createContext("/sse",exchange -> {
            exchange.getResponseHeaders().add("Content-Type","text/event-stream");exchange.sendResponseHeaders(200,0);
            try { for(byte b:"data: é😀\r\n\r\nevent: done\ndata: {}\n\n".getBytes(StandardCharsets.UTF_8)) { exchange.getResponseBody().write(new byte[]{b});exchange.getResponseBody().flush(); } }
            catch(java.io.IOException ignored) {} finally { exchange.close(); }
        });
        server.createContext("/compressed",exchange -> { exchange.getResponseHeaders().add("Content-Encoding","gzip");exchange.sendResponseHeaders(200,2);exchange.getResponseBody().write(new byte[]{1,2});exchange.close(); });
        server.start();String base="http://"+(server.getAddress().getAddress() instanceof java.net.Inet6Address ? "[::1]" : "127.0.0.1")+":"+server.getAddress().getPort();
        CookieHandler previousCookies=CookieHandler.getDefault();Authenticator previousAuth=Authenticator.getDefault();ProxySelector previousProxy=ProxySelector.getDefault();
        AtomicInteger ambient=new AtomicInteger();
        CookieHandler.setDefault(new CookieHandler() {
            @Override public Map<String,List<String>> get(URI uri,Map<String,List<String>> headers) { ambient.incrementAndGet();return Map.of("Cookie",List.of("private="+KEY)); }
            @Override public void put(URI uri,Map<String,List<String>> headers) { ambient.incrementAndGet(); }
        });
        Authenticator.setDefault(new Authenticator() { @Override protected PasswordAuthentication getPasswordAuthentication() { ambient.incrementAndGet();return new PasswordAuthentication("fixture",KEY.toCharArray()); } });
        ProxySelector.setDefault(new ProxySelector() {
            @Override public List<Proxy> select(URI uri) { ambient.incrementAndGet();return List.of(new Proxy(Proxy.Type.HTTP,new InetSocketAddress("127.0.0.1",9))); }
            @Override public void connectFailed(URI uri,SocketAddress address,java.io.IOException e) { ambient.incrementAndGet(); }
        });
        JdkTransport jdk=new JdkTransport();
        try {
            Transport local=(r,c) -> jdk.send(new Transport.Request(URI.create(base+"/search"),r.method(),r.headers(),r.body()),c);
            SearchResponse result=await(SearchClient.builder(Providers.tavily(KEY,local)).build().search(QUERY));
            equal(result.results().get(0).provenance().requestId(),"loopback-001","real HttpClient normalized response");equal(requests.get(),1,"one real local request");
            GatewayClient client=new GatewayClient("https://application.example/exact",(r,c) -> jdk.send(new Transport.Request(URI.create(base+"/gateway"),r.method(),r.headers(),r.body()),c),Duration.ofSeconds(2),100000,2);
            equal(await(client.search(QUERY,KEY,null)).provider(),"fixture","real gateway transport");
            try(RequestContext context=RequestContext.create(Duration.ofSeconds(2),1000,null)) {
                Transport.Response challenge=await(jdk.send(new Transport.Request(URI.create(base+"/challenge"),"GET",Map.of(),null),context));
                equal(challenge.status(),401,"global authenticator is never invoked for a challenge");
            }
            equal(ambient.get(),0,"global authenticator, cookie handler and proxy selector are isolated");
            for(String endpoint:List.of("oversize","chunked","compressed")) {
                Transport capped=(r,c) -> jdk.send(new Transport.Request(URI.create(base+"/"+endpoint),"GET",r.headers(),null),c);
                error(() -> await(SearchClient.builder(Providers.tavily(KEY,capped)).maxResponseBytes(64).build().search(QUERY)),INVALID_RESPONSE);
            }
            Transport oversizedAuth=(r,c) -> jdk.send(new Transport.Request(URI.create(base+"/oversizeauth"),"GET",r.headers(),null),c);
            equal(error(() -> await(SearchClient.builder(Providers.tavily(KEY,oversizedAuth)).maxResponseBytes(64).build().search(QUERY)),AUTH).status(),401,"real HTTP status preserved when private error body is oversized");
            Transport redirect=(r,c) -> jdk.send(new Transport.Request(URI.create(base+"/redirect"),"GET",r.headers(),null),c);
            error(() -> await(SearchClient.builder(Providers.tavily(KEY,redirect)).build().search(QUERY)),PROVIDER_ERROR);equal(redirected.get(),0,"redirects never forward credentials");
            Transport slow=(r,c) -> jdk.send(new Transport.Request(URI.create(base+"/slow"),"GET",r.headers(),null),c);
            error(() -> await(SearchClient.builder(Providers.tavily(KEY,slow)).timeout(Duration.ofMillis(25)).build().search(QUERY)),TIMEOUT);
            Transport sse=new Transport() {
                public CompletionStage<Response> send(Request r,RequestContext c) { throw new AssertionError("Expected streaming transport"); }
                @Override public CompletionStage<StreamResponse> stream(Request r,RequestContext c) { return jdk.stream(new Request(URI.create(base+"/sse"),r.method(),r.headers(),r.body()),c); }
            };
            NativeResponse<NativeEventStream> stream=await(new TavilyClient(nativeClient("tavily",sse)).researchStream(NativeInput.builder().body(Map.of("input","fixture")).build()));
            List<NativeEventStream.Event> events=await(collect(stream.data()));equal(events.size(),2,"real incremental HTTP SSE");equal(events.get(0).data(),"é😀","real SSE split Unicode");
        } finally {
            CookieHandler.setDefault(previousCookies);Authenticator.setDefault(previousAuth);ProxySelector.setDefault(previousProxy);
            server.stop(0);executor.shutdownNow();executor.awaitTermination(3,TimeUnit.SECONDS);
        }
    }
}
