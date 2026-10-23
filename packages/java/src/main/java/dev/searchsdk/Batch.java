package dev.searchsdk;

import java.time.Duration;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.function.BiFunction;

/** Ordered per-item outcomes; a failed query never discards successful siblings. */
public final class Batch {
    private Batch() {}
    public record Outcome(int index,SearchResponse value,SearchException error) {
        public Outcome { if((value==null)==(error==null)) throw new IllegalArgumentException("One outcome is required"); }
        public boolean fulfilled() { return error==null; }
    }
    static CompletionStage<List<Outcome>> run(List<SearchRequest> inputs,int concurrency,Duration timeout,CancellationToken token,
            BiFunction<SearchRequest,CancellationToken,CompletionStage<SearchResponse>> search) {
        if(inputs==null || inputs.size()>1000 || concurrency<1 || concurrency>64) throw new SearchException(SearchException.Code.INVALID_REQUEST);
        List<SearchRequest> requests=Collections.unmodifiableList(new ArrayList<>(inputs));
        RequestContext context=RequestContext.create(timeout,HttpSupport.DEFAULT_MAXIMUM,token);
        Outcome[] outcomes=new Outcome[requests.size()]; AtomicInteger next=new AtomicInteger();
        class Worker {
            CompletionStage<Void> run() {
                int index=next.getAndIncrement(); if(index>=requests.size()) return CompletableFuture.completedFuture(null);
                CompletionStage<SearchResponse> item;
                try { context.check(); if(requests.get(index)==null) throw new SearchException(SearchException.Code.INVALID_REQUEST);
                    item=context.race(() -> search.apply(requests.get(index),context.cancellation())); }
                catch(SearchException e) { item=CompletableFuture.failedFuture(e); }
                return item.handle((value,error) -> {
                    if(error==null) outcomes[index]=new Outcome(index,value,null);
                    else {
                        SearchException e=SearchException.sanitize(error);
                        try { context.check(); } catch(SearchException stopped) { e=new SearchException(stopped.code(),e.status(),e.retryAfterMs(),e.attempts()); }
                        outcomes[index]=new Outcome(index,null,e);
                    }
                    return null;
                }).thenComposeAsync(v -> run());
            }
        }
        List<CompletableFuture<Void>> workers=new ArrayList<>();
        // Trampoline on the common pool prevents synchronous custom providers from growing the Java stack.
        for(int i=0;i<Math.min(concurrency,requests.size());i++) workers.add(CompletableFuture.runAsync(() -> {}).thenCompose(v -> new Worker().run()).toCompletableFuture());
        CompletableFuture<List<Outcome>> result=CompletableFuture.allOf(workers.toArray(CompletableFuture[]::new))
            .thenApply(v -> List.copyOf(Arrays.asList(outcomes)));
        result.whenComplete((v,e) -> { if(result.isCancelled()) context.cancellation().cancel(); context.close(); }); return result;
    }
}
