package dev.searchsdk;

import java.net.URI;
import java.time.Duration;
import java.util.*;
import java.util.concurrent.*;

/** Application gateway protocol v1. Tokens are supplied per call; POSTs are never retried. */
public final class GatewayClient {
    private final URI endpoint;
    private final Transport transport;
    private final Duration timeout;
    private final int maximum;
    private final AsyncGate gate;
    public GatewayClient(String endpoint) { this(endpoint,JdkTransport.shared(),Duration.ofSeconds(10),HttpSupport.DEFAULT_MAXIMUM,8); }
    public GatewayClient(String endpoint,Transport transport,Duration timeout,int maxResponseBytes,int maxConcurrency) {
        this.endpoint=Values.endpoint(endpoint);
        RequestContext.validDuration(timeout);
        if(transport==null || maxResponseBytes<1) throw new SearchException(SearchException.Code.CONFIGURATION);
        this.transport=transport; this.timeout=timeout; maximum=maxResponseBytes; gate=new AsyncGate(maxConcurrency);
    }
    public CompletionStage<SearchResponse> search(SearchRequest request) { return search(request,null,null); }
    public CompletionStage<SearchResponse> search(SearchRequest request,String applicationToken,CancellationToken cancellation) {
        if(request==null) throw new SearchException(SearchException.Code.INVALID_REQUEST);
        Map<String,String> headers=new LinkedHashMap<>(); headers.put("Content-Type","application/json"); headers.put("Accept","application/json");
        if(applicationToken!=null) {
            try { HttpSupport.key(applicationToken); } catch(SearchException e) { throw new SearchException(SearchException.Code.INVALID_REQUEST); }
            headers.put("Authorization","Bearer "+applicationToken);
        }
        Transport.Request wire=new Transport.Request(endpoint,"POST",headers,Json.bytes(request.toJson()));
        RequestContext context=RequestContext.create(timeout,maximum,cancellation);
        CompletableFuture<SearchResponse> result=context.race(() -> gate.acquire(context).thenCompose(permit ->
            HttpSupport.send(transport,wire,context).thenApply(response -> {
                String protocol=response.header("x-searchsdk-protocol");
                if(protocol!=null && !protocol.equals("1")) throw Values.invalid();
                if(response.status()!=200) {
                    if(response.status()>=200 && response.status()<300) throw Values.invalid();
                    throw gatewayError(response);
                }
                SearchResponse value=Values.gateway(Json.parse(response.body()));
                context.check();
                return new SearchResponse(value.provider(),value.results().subList(0,Math.min(request.limit(),value.results().size())),value.usage(),value.warnings(),value.attempts(),value.reuse());
            }).whenComplete((v,e) -> permit.close())));
        result.whenComplete((v,e) -> { if(result.isCancelled()) context.cancellation().cancel(); context.close(); }); return result;
    }
    private SearchException gatewayError(Transport.Response response) {
        try {
            Map<String,Object> error=Values.object(Values.object(Json.parse(response.body())).get("error"));
            SearchException.Code code=Values.code(error.get("code"));
            List<SearchResponse.Attempt> attempts=Values.attempts(error.get("attempts"));
            for(String optional:List.of("status","retryAfterMs")) if(error.containsKey(optional) && error.get(optional)==null) throw Values.invalid();
            Integer status=error.get("status")==null ? null : Values.integer(error.get("status"),100,599);
            Double retry=Values.nonnegativeNumber(error.get("retryAfterMs"));
            return new SearchException(code,status,retry,attempts);
        } catch(RuntimeException ignored) { return HttpSupport.error(response); }
    }
    public CompletionStage<List<Batch.Outcome>> searchBatch(List<SearchRequest> requests,int concurrency,Duration batchTimeout,
                                                           String applicationToken,CancellationToken cancellation) {
        return Batch.run(requests,concurrency,batchTimeout,cancellation,(r,t) -> search(r,applicationToken,t));
    }
    public CompletionStage<List<Batch.Outcome>> searchBatch(List<SearchRequest> requests) {
        return searchBatch(requests,4,timeout,null,null);
    }
    @Override public String toString() { return "GatewayClient[redacted]"; }
}
