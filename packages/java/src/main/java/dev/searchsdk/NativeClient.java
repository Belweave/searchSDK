package dev.searchsdk;

import java.io.IOException;
import java.net.URI;
import java.nio.ByteBuffer;
import java.nio.charset.*;
import java.time.*;
import java.util.*;
import java.util.concurrent.*;
import java.util.regex.*;

/** Provider-native transport. Named generated clients delegate to this bounded, dependency-free engine. */
public final class NativeClient {
    private static final List<NativeOperation> CATALOG=loadCatalog();
    private static final Pattern PLACEHOLDER=Pattern.compile("\\{([a-zA-Z][a-zA-Z0-9_]*)}");
    private final String provider,key,teamKey;
    private final boolean keyless;
    private final Transport transport;
    private final Duration timeout;
    private final int maximum,maxRequestBytes;
    private final RetryPolicy retry;
    private final AsyncGate gate;
    private final Map<String,NativeOperation> operations;
    private NativeClient(Builder b) {
        provider=b.provider; keyless=b.keyless;
        operations=new LinkedHashMap<>(); CATALOG.stream().filter(o -> o.provider().equals(provider)).forEach(o -> operations.put(o.name(),o));
        if(operations.isEmpty() || b.transport==null || b.retry==null || b.maximum<1 || b.maxRequestBytes<1 || keyless && !provider.equals("tavily")) throw configuration();
        key=b.key==null && keyless ? null : HttpSupport.key(b.key); teamKey=b.teamKey==null ? null : HttpSupport.key(b.teamKey);
        transport=b.transport; timeout=b.timeout; RequestContext.validDuration(timeout);
        maximum=b.maximum; maxRequestBytes=b.maxRequestBytes; retry=b.retry; gate=new AsyncGate(b.concurrency);
    }
    public static Builder builder(String provider,String apiKey) { return new Builder(provider,apiKey); }
    public static final class Builder {
        final String provider,key; String teamKey; boolean keyless;
        Transport transport=JdkTransport.shared(); Duration timeout=Duration.ofSeconds(10);
        int maximum=HttpSupport.DEFAULT_MAXIMUM,maxRequestBytes=HttpSupport.DEFAULT_MAXIMUM,concurrency=8;
        RetryPolicy retry=RetryPolicy.NONE;
        private Builder(String provider,String apiKey) { this.provider=provider; key=apiKey; }
        public Builder transport(Transport value) { transport=value; return this; }
        public Builder timeout(Duration value) { timeout=value; return this; }
        public Builder maxResponseBytes(int value) { maximum=value; return this; }
        public Builder maxRequestBytes(int value) { maxRequestBytes=value; return this; }
        public Builder maxConcurrency(int value) { concurrency=value; return this; }
        public Builder retry(RetryPolicy value) { retry=value; return this; }
        public Builder teamApiKey(String value) { teamKey=value; return this; }
        public Builder tavilyKeyless(boolean value) { keyless=value; return this; }
        public NativeClient build() { return new NativeClient(this); }
        @Override public String toString() { return "NativeClient.Builder[redacted]"; }
    }
    public String provider() { return provider; }
    public List<NativeOperation> operations() { return List.copyOf(operations.values()); }
    public static List<NativeOperation> catalog() { return CATALOG; }
    private static List<NativeOperation> loadCatalog() {
        try(var stream=NativeClient.class.getResourceAsStream("native-operations.json")) {
            if(stream==null) throw configuration();
            return Values.array(Values.object(Json.parse(stream.readAllBytes())).get("operations")).stream().map(NativeOperation::fromJson).toList();
        } catch(IOException e) { throw configuration(); }
    }
    private static SearchException configuration() { return new SearchException(SearchException.Code.CONFIGURATION); }
    public CompletionStage<NativeResponse<Object>> execute(String operation,NativeInput input) { return execute(operation,input,null); }
    public CompletionStage<NativeResponse<Object>> execute(String operation,NativeInput input,CancellationToken cancellation) {
        NativeOperation descriptor=operations.get(operation);
        if(descriptor==null) throw new SearchException(SearchException.Code.UNSUPPORTED_OPTION);
        if(input==null) throw new SearchException(SearchException.Code.INVALID_REQUEST);
        Transport.Request request;
        try { request=wire(descriptor,input); }
        catch(SearchException e) { if(e.code()==SearchException.Code.INVALID_RESPONSE) throw new SearchException(SearchException.Code.INVALID_REQUEST); throw e; }
        if(cancellation!=null && cancellation.isCancelled())throw new SearchException(SearchException.Code.ABORTED);
        RequestContext context=RequestContext.create(timeout,maximum,cancellation);
        if(descriptor.response().equals("embedding-url")) {
            try { context.check(); return CompletableFuture.completedFuture(new NativeResponse<>(request.uri().toString(),new NativeResponse.Metadata(provider,operation,null,null,List.of()))); }
            finally { context.close(); }
        }
        List<SearchResponse.Attempt> attempts=Collections.synchronizedList(new ArrayList<>());
        CompletableFuture<NativeResponse<Object>> result=new CompletableFuture<>();
        CompletionStage<NativeResponse<Object>> run;
        try { run=gate.acquire(context).thenCompose(permit -> {
            CompletionStage<NativeResponse<Object>> dispatched=attempt(descriptor,request,context,attempts,0,permit);
            return dispatched.whenComplete((value,error) -> {
                if(value==null || !(value.data() instanceof NativeEventStream)) { permit.close(); context.close(); }
            });
        }); } catch(RuntimeException e) { context.close();throw e; }
        run.whenComplete((value,error) -> {
            if(error==null) {
                if(!result.complete(value) && value.data() instanceof NativeEventStream stream) stream.close();
            } else {
                SearchException e=SearchException.sanitize(error); context.close();
                synchronized(attempts) { result.completeExceptionally(new SearchException(e.code(),e.status(),e.retryAfterMs(),attempts)); }
            }
        });
        result.whenComplete((v,e) -> { if(result.isCancelled()) context.cancellation().cancel(); }); return result;
    }
    public <T> CompletionStage<NativeResponse<T>> executeTyped(String operation,NativeInput input,CancellationToken cancellation,Class<T> type) {
        CompletableFuture<NativeResponse<Object>> source=execute(operation,input,cancellation).toCompletableFuture();
        CompletableFuture<NativeResponse<T>> result=new CompletableFuture<>();
        source.whenComplete((value,error) -> {
            if(error!=null) { result.completeExceptionally(SearchException.sanitize(error)); return; }
            Object data=value.data();
            if(data!=null && !type.isInstance(data)) {
                if(data instanceof NativeEventStream stream) stream.close(); result.completeExceptionally(Values.invalid()); return;
            }
            if(!result.complete(new NativeResponse<>(type.cast(data),value.metadata())) && data instanceof NativeEventStream stream) stream.close();
        });
        result.whenComplete((v,e) -> { if(result.isCancelled()) source.cancel(true); }); return result;
    }

    /** Typed schema conversion with cancellation propagated to the underlying operation. */
    public <T> CompletionStage<NativeResponse<T>> executeMapped(String operation,NativeInput input,CancellationToken cancellation,
                                                               java.util.function.Function<Object,T> mapper) {
        RequestContext conversion=RequestContext.create(timeout,maximum,cancellation);
        CompletionStage<NativeResponse<Object>> source;
        try { source=execute(operation,input,conversion.cancellation()); }
        catch(RuntimeException e) { conversion.close();throw e; }
        CompletableFuture<NativeResponse<T>> result=conversion.race(() -> source.thenApply(value -> {
            T mapped=mapper.apply(value.data());conversion.check();return new NativeResponse<>(mapped,value.metadata());
        }));
        result.whenComplete((v,e) -> { if(result.isCancelled())conversion.cancellation().cancel();conversion.close(); });return result;
    }

    private CompletionStage<NativeResponse<Object>> attempt(NativeOperation op,Transport.Request request,RequestContext context,
            List<SearchResponse.Attempt> attempts,int index,AsyncGate.Permit permit) {
        Instant started=Instant.now(); long start=System.nanoTime();
        CompletionStage<NativeResponse<Object>> response;
        if(op.response().equals("sse")) {
            response=context.race(() -> transport.stream(request,context)).thenApply(value -> {
                if(value==null || value.body()==null || value.status()<100 || value.status()>599)throw Values.invalid();
                String encoding=value.header("content-encoding"),contentType=value.header("content-type");
                if(value.status()<200 || value.status()>=300) {
                    NativeEventStream.discard(value.body()); throw HttpSupport.error(new Transport.Response(value.status(),value.headers(),new byte[0]));
                }
                if(encoding!=null && !encoding.equalsIgnoreCase("identity") || contentType==null || !contentType.split(";",2)[0].trim().equalsIgnoreCase("text/event-stream")) {
                    NativeEventStream.discard(value.body()); throw Values.invalid();
                }
                attempts.add(new SearchResponse.Attempt(provider,started,(System.nanoTime()-start)/1e6,"success",null,value.status(),null));
                NativeEventStream events=new NativeEventStream(value.body(),context,permit::close);
                return new NativeResponse<Object>(events,metadata(op,value.status(),value.header("x-request-id"),attempts));
            });
        } else {
            response=HttpSupport.send(transport,request,context).thenApply(value -> {
                if(value.status()<200 || value.status()>=300) throw HttpSupport.error(value);
                byte[] bytes=value.body(); Object data;
                switch(op.response()) {
                    case "empty" -> { if(bytes.length!=0) throw Values.invalid(); data=null; }
                    case "bytes" -> data=bytes;
                    case "text" -> data=text(bytes);
                    case "raw" -> data=value;
                    default -> data=bytes.length==0 && (value.status()==204 || op.method().equals("HEAD")) ? null : Json.parse(bytes);
                }
                if(provider.equals("perplexity") && op.name().equals("revokeAuthToken")) { if(bytes.length!=0) throw Values.invalid(); data=null; }
                context.check(); attempts.add(new SearchResponse.Attempt(provider,started,(System.nanoTime()-start)/1e6,"success",null,value.status(),null));
                return new NativeResponse<>(data,metadata(op,value.status(),value.header("x-request-id"),attempts));
            });
        }
        return context.race(() -> response).handle((value,error) -> {
            if(error==null) return CompletableFuture.completedFuture(value);
            SearchException failure=SearchException.sanitize(error);
            try { context.check(); } catch(SearchException e) { failure=e; }
            attempts.add(new SearchResponse.Attempt(provider,started,(System.nanoTime()-start)/1e6,"error",failure.code(),failure.status(),failure.retryAfterMs()));
            if(op.retryable() && index<retry.maxRetries() && HttpSupport.transientFailure(failure.code())) {
                return context.delay(retry.delay(index,failure.retryAfterMs())).thenCompose(v -> attempt(op,request,context,attempts,index+1,permit));
            }
            return CompletableFuture.<NativeResponse<Object>>failedFuture(failure);
        }).thenCompose(v -> v);
    }
    private NativeResponse.Metadata metadata(NativeOperation op,int status,String requestId,List<SearchResponse.Attempt> attempts) {
        try { Values.requestId(requestId); } catch(SearchException e) { requestId=null; }
        return new NativeResponse.Metadata(provider,op.name(),status,requestId,List.copyOf(attempts));
    }
    private static String text(byte[] bytes) {
        try { return StandardCharsets.UTF_8.newDecoder().onMalformedInput(CodingErrorAction.REPORT).onUnmappableCharacter(CodingErrorAction.REPORT).decode(ByteBuffer.wrap(bytes)).toString(); }
        catch(CharacterCodingException e) { throw Values.invalid(); }
    }
    private Transport.Request wire(NativeOperation op,NativeInput input) {
        if(key==null && keyless && !Set.of("search","paidSearch","getPaymentPricing").contains(op.name())) throw configuration();
        Map<String,String> headers=new TreeMap<>(String.CASE_INSENSITIVE_ORDER);
        if(op.contract().get("headers") instanceof Map<?,?> h) Values.object(h).forEach((k,v) -> headers.put(k,Values.string(v)));
        String auth=op.text("auth");
        if(!"none".equals(auth)) {
            String credential="team".equals(auth) ? teamKey : key;
            if("team".equals(auth) && credential==null) throw configuration();
            if(credential==null) headers.put("X-Tavily-Access-Mode","keyless");
            else if(!provider.equals("serpapi")) {
                String name=switch(provider) { case "context","tavily","perplexity","linkup","firecrawl" -> "Authorization"; case "brave" -> "X-Subscription-Token"; default -> "X-API-Key"; };
                headers.put(name,name.equals("Authorization") ? "Bearer "+credential : credential);
            }
        }
        for(var entry:input.headers.entrySet()) {
            String lower=entry.getKey().toLowerCase(Locale.ROOT);
            if(Set.of("authorization","x-api-key","x-subscription-token","x-tavily-access-mode").contains(lower) ||
                headers.containsKey(entry.getKey()) && !entry.getKey().equalsIgnoreCase("content-type")) throw new SearchException(SearchException.Code.INVALID_REQUEST);
            headers.put(entry.getKey(),entry.getValue());
        }
        for(String required:op.list("requiredHeaders")) if(!headers.containsKey(required)) throw new SearchException(SearchException.Code.INVALID_REQUEST);
        Map<String,Object> query=new LinkedHashMap<>(input.query);
        for(String required:op.list("requiredQuery")) if(query.get(required)==null) throw new SearchException(SearchException.Code.INVALID_REQUEST);
        Object body=input.body; byte[] bytes=input.rawBody;
        if(op.flag("bodyRequired") && body==null && bytes==null && input.multipart==null) throw new SearchException(SearchException.Code.INVALID_REQUEST);
        if(op.flag("rawBody") && bytes==null && input.multipart==null) throw new SearchException(SearchException.Code.INVALID_REQUEST);
        if(!op.flag("rawBody") && (bytes!=null || input.multipart!=null)) throw new SearchException(SearchException.Code.UNSUPPORTED_OPTION);
        if(op.response().equals("sse")) headers.put("Accept","text/event-stream");
        else if(headers.getOrDefault("Accept","").contains("text/event-stream")) throw new SearchException(SearchException.Code.UNSUPPORTED_OPTION);
        if(op.flag("streamField")) {
            Map<String,Object> m=new LinkedHashMap<>(body==null ? Map.of() : Values.object(body)); boolean stream=op.response().equals("sse");
            if(m.containsKey("stream") && !Boolean.valueOf(stream).equals(m.get("stream"))) throw new SearchException(SearchException.Code.UNSUPPORTED_OPTION);
            m.put("stream",stream); body=m;
        }
        if(provider.equals("exa") && op.name().equals("searchStream") && (body==null || Values.object(body).get("outputSchema")==null)) throw new SearchException(SearchException.Code.INVALID_REQUEST);
        if(provider.equals("tavily") && op.name().equals("paidSearch")) {
            Map<String,Object> m=Values.object(body);
            if(m.containsKey("search_depth") && !"advanced".equals(m.get("search_depth"))) throw new SearchException(SearchException.Code.UNSUPPORTED_OPTION);
        }
        MultipartBody multipart=input.multipart;
        if(provider.equals("serpapi")) {
            if(query.containsKey("api_key") || query.containsKey("output")) throw new SearchException(SearchException.Code.INVALID_REQUEST);
            if(op.name().equals("uploadImage")) {
                if(multipart==null || multipart.parts().stream().noneMatch(p -> p.name().equals("image"))) throw new SearchException(SearchException.Code.INVALID_REQUEST);
                multipart=multipart.withCredential("api_key",key);
            } else if(!op.name().equals("locations")) {
                if(op.name().equals("google")) { requireNonblank(query.get("q")); query.put("engine","google"); }
                else if(op.name().startsWith("extract")) { requireNonblank(query.get("url")); query.put("engine","extract"); }
                else if(op.name().startsWith("search")) requireNonblank(query.get("engine"));
                if(Boolean.TRUE.equals(query.get("async")) && Boolean.TRUE.equals(query.get("no_cache"))) throw new SearchException(SearchException.Code.INVALID_REQUEST);
                query.put("api_key",key);
            }
        }
        if(provider.equals("serper") && op.method().equals("GET")) {
            if(query.containsKey("apiKey")) throw new SearchException(SearchException.Code.INVALID_REQUEST); query.put("apiKey",key);
        }
        if(provider.equals("context") && op.base().equals("https://logos.context.dev")) validateLogo(query);
        if(multipart!=null) { MultipartBody.Encoded encoded=multipart.encode(maxRequestBytes); headers.put("Content-Type",encoded.contentType()); bytes=encoded.bytes(); }
        else if(bytes!=null) {
            String type=headers.get("Content-Type"); if(type==null) { type=op.text("rawContentType"); if(type==null) type="application/octet-stream"; headers.put("Content-Type",type); }
            if(type.equalsIgnoreCase("multipart/form-data")) throw new SearchException(SearchException.Code.INVALID_REQUEST); // Caller bytes require the boundary.
        } else if(body!=null) { bytes=Json.bytes(body); headers.putIfAbsent("Content-Type","application/json"); }
        if(bytes!=null && bytes.length>maxRequestBytes) throw new SearchException(SearchException.Code.INVALID_REQUEST);
        Matcher matcher=PLACEHOLDER.matcher(op.path()); StringBuffer path=new StringBuffer(); Set<String> used=new HashSet<>();
        while(matcher.find()) {
            String name=matcher.group(1),value=input.path.get(name); used.add(name);
            if(value==null || value.isEmpty() || value.equals(".") || value.equals("..")) throw new SearchException(SearchException.Code.INVALID_REQUEST);
            matcher.appendReplacement(path,Matcher.quoteReplacement(HttpSupport.encode(value)));
        }
        matcher.appendTail(path);
        if(!used.equals(input.path.keySet()) || path.indexOf("{")>=0 || path.indexOf("}")>=0) throw new SearchException(SearchException.Code.INVALID_REQUEST);
        Map<String,Object> wireQuery=new LinkedHashMap<>();
        for(var e:query.entrySet()) {
            Object value=e.getValue();
            if(value instanceof List<?> list && op.list("commaQuery").contains(e.getKey())) value=list.stream().map(HttpSupport::scalar).collect(java.util.stream.Collectors.joining(","));
            if(value instanceof Map<?,?> map) Values.object(map).forEach((child,v) -> wireQuery.put(e.getKey()+"["+child+"]",v));
            else wireQuery.put(e.getKey(),value);
        }
        String endpoint=op.base().replaceAll("/+$","")+path;
        URI uri=HttpSupport.withQuery(endpoint,wireQuery);
        if(!Objects.equals(uri.getHost(),Values.endpoint(op.base()).getHost())) throw new SearchException(SearchException.Code.INVALID_REQUEST);
        return new Transport.Request(uri,op.method(),HttpSupport.headers(headers,SearchException.Code.INVALID_REQUEST),bytes);
    }
    private static void requireNonblank(Object v) { if(!(v instanceof String s) || s.isBlank()) throw new SearchException(SearchException.Code.INVALID_REQUEST); }
    private static void validateLogo(Map<String,Object> query) {
        if(!Set.of("publicClientId","domain","theme","type").containsAll(query.keySet())) throw new SearchException(SearchException.Code.INVALID_REQUEST);
        requireNonblank(query.get("publicClientId")); requireNonblank(query.get("domain"));
        if(query.values().stream().anyMatch(v -> !(v instanceof String)) || query.containsKey("theme") && !Set.of("light","dark").contains(query.get("theme")) ||
            query.containsKey("type") && !Set.of("icon","wordmark").contains(query.get("type"))) throw new SearchException(SearchException.Code.INVALID_REQUEST);
    }
    @Override public String toString() { return "NativeClient["+provider+"]"; }
}
