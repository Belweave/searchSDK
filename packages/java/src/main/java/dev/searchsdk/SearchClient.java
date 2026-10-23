package dev.searchsdk;

import java.time.*;
import java.util.*;
import java.util.concurrent.*;

/** Server-side normalized search with explicit retry/fallback and per-client active-call limits. */
public final class SearchClient {
    private final List<Provider> providers;
    private final Duration timeout,attemptTimeout;
    private final int maximum;
    private final RetryPolicy retry;
    private final AsyncGate gate;
    private SearchClient(Builder b) {
        providers=List.copyOf(b.providers); timeout=b.timeout; attemptTimeout=b.attemptTimeout==null ? timeout : b.attemptTimeout;
        RequestContext.validDuration(timeout); RequestContext.validDuration(attemptTimeout);
        if(b.maximum<1 || b.retry==null) throw new SearchException(SearchException.Code.CONFIGURATION);
        maximum=b.maximum; retry=b.retry; gate=new AsyncGate(b.concurrency);
        Set<String> ids=new HashSet<>();
        for(Provider p:providers) {
            if(p==null || p.capabilities()==null) throw new SearchException(SearchException.Code.CONFIGURATION);
            try { Values.provider(p.id()); } catch(SearchException e) { throw new SearchException(SearchException.Code.CONFIGURATION); }
            if(!ids.add(p.id())) throw new SearchException(SearchException.Code.CONFIGURATION);
        }
    }
    public static Builder builder(Provider provider) { return new Builder(provider); }
    public static final class Builder {
        private final List<Provider> providers=new ArrayList<>();
        private Duration timeout=Duration.ofSeconds(10),attemptTimeout;
        private int maximum=HttpSupport.DEFAULT_MAXIMUM,concurrency=8;
        private RetryPolicy retry=RetryPolicy.NONE;
        private Builder(Provider provider) { providers.add(provider); }
        public Builder fallback(Provider provider) { providers.add(provider); return this; }
        public Builder timeout(Duration value) { timeout=value; return this; }
        public Builder attemptTimeout(Duration value) { attemptTimeout=value; return this; }
        public Builder maxResponseBytes(int value) { maximum=value; return this; }
        public Builder maxConcurrency(int value) { concurrency=value; return this; }
        public Builder retry(RetryPolicy value) { retry=value; return this; }
        public SearchClient build() { return new SearchClient(this); }
    }
    public CompletionStage<SearchResponse> search(SearchRequest request) { return search(request,null); }
    public CompletionStage<SearchResponse> search(SearchRequest request,CancellationToken cancellation) {
        if(request==null) throw new SearchException(SearchException.Code.INVALID_REQUEST);
        for(Provider p:providers) p.capabilities().check(request); // Validate the complete chain before dispatch.
        if(cancellation!=null && cancellation.isCancelled())throw new SearchException(SearchException.Code.ABORTED);
        RequestContext context=RequestContext.create(timeout,maximum,cancellation);
        List<SearchResponse.Attempt> attempts=Collections.synchronizedList(new ArrayList<>());
        CompletionStage<SearchResponse> operation;
        try { operation=gate.acquire(context).thenCompose(permit -> {
            CompletionStage<SearchResponse> run=attempt(request,context,attempts,0,0);
            return run.whenComplete((v,e) -> permit.close());
        }); } catch(RuntimeException e) { context.close();throw e; }
        CompletableFuture<SearchResponse> result=new CompletableFuture<>();
        operation.whenComplete((v,e) -> {
            if(e==null) result.complete(v);
            else {
                SearchException error=SearchException.sanitize(e);
                synchronized(attempts) { result.completeExceptionally(new SearchException(error.code(),error.status(),error.retryAfterMs(),attempts)); }
            }
            context.close();
        });
        result.whenComplete((v,e) -> { if(result.isCancelled()) context.cancellation().cancel(); }); return result;
    }
    private CompletionStage<SearchResponse> attempt(SearchRequest request,RequestContext whole,List<SearchResponse.Attempt> attempts,int providerIndex,int retryIndex) {
        try { whole.check(); } catch(SearchException e) { return CompletableFuture.failedFuture(e); }
        Provider provider=providers.get(providerIndex);
        Duration remaining=whole.remaining(); boolean total=remaining.compareTo(attemptTimeout)<=0;
        RequestContext scope=new RequestContext(total ? remaining : attemptTimeout,maximum,whole.cancellation(),
            total ? SearchException.Code.TIMEOUT : SearchException.Code.ATTEMPT_TIMEOUT);
        Instant started=Instant.now(); long start=System.nanoTime();
        return scope.race(() -> {
            try {
                return provider.search(request,scope).handle((value,error) -> {
                    if(error!=null) throw providerError(error); return value;
                });
            } catch(RuntimeException e) { throw providerError(e); }
        }).handle((response,error) -> {
            scope.close(); SearchException failure=error==null ? null : SearchException.sanitize(error);
            try { whole.check(); } catch(SearchException e) { failure=e; }
            if(failure==null && response==null) failure=Values.invalid();
            if(failure==null) {
                attempts.add(new SearchResponse.Attempt(provider.id(),started,(System.nanoTime()-start)/1e6,"success",null,null,null));
                List<SearchResponse.Warning> warnings=new ArrayList<>(response.warnings());
                if(providerIndex>0) warnings.add(new SearchResponse.Warning("fallback_used",provider.id()));
                SearchResponse result=new SearchResponse(provider.id(),response.results().subList(0,Math.min(request.limit(),response.results().size())),response.usage(),warnings,List.copyOf(attempts),null);
                return CompletableFuture.completedFuture(result);
            }
            attempts.add(new SearchResponse.Attempt(provider.id(),started,(System.nanoTime()-start)/1e6,"error",failure.code(),failure.status(),failure.retryAfterMs()));
            if(HttpSupport.transientFailure(failure.code())) {
                if(retryIndex<retry.maxRetries()) return whole.delay(retry.delay(retryIndex,failure.retryAfterMs()))
                    .thenCompose(v -> attempt(request,whole,attempts,providerIndex,retryIndex+1));
                if(providerIndex+1<providers.size()) return attempt(request,whole,attempts,providerIndex+1,0);
            }
            return CompletableFuture.<SearchResponse>failedFuture(failure);
        }).thenCompose(v -> v);
    }
    private static SearchException providerError(Throwable error) {
        while(error instanceof CompletionException && error.getCause()!=null) error=error.getCause();
        return error instanceof SearchException e ? e : new SearchException(SearchException.Code.PROVIDER_ERROR);
    }
    public CompletionStage<List<Batch.Outcome>> searchBatch(List<SearchRequest> requests,int concurrency,Duration batchTimeout,CancellationToken cancellation) {
        return Batch.run(requests,concurrency,batchTimeout,cancellation,this::search);
    }
    public CompletionStage<List<Batch.Outcome>> searchBatch(List<SearchRequest> requests) {
        return searchBatch(requests,4,timeout,null);
    }
}
