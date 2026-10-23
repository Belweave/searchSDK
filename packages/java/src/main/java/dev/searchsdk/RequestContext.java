package dev.searchsdk;

import java.time.Duration;
import java.util.concurrent.*;
import java.util.function.Supplier;

/** Whole operation scope; injected transports must honor cancellation and maxResponseBytes. */
public final class RequestContext implements AutoCloseable {
    private static final ScheduledThreadPoolExecutor TIMER;
    private static final ThreadPoolExecutor WORKERS=new ThreadPoolExecutor(2,2,0,TimeUnit.MILLISECONDS,
        new ArrayBlockingQueue<>(1024),r -> { Thread t=new Thread(r,"searchsdk-dispatch"); t.setDaemon(true); return t; },new ThreadPoolExecutor.AbortPolicy());
    static {
        TIMER=new ScheduledThreadPoolExecutor(1, r -> { Thread t=new Thread(r,"searchsdk-deadlines"); t.setDaemon(true); return t; });
        TIMER.setRemoveOnCancelPolicy(true);
    }
    private final long deadline;
    private final SearchException.Code timeoutCode;
    private final int maximum;
    private final CancellationToken token=new CancellationToken();
    private final ScheduledFuture<?> timer;
    private final CancellationToken.Registration parent;
    private volatile SearchException.Code stopped;
    RequestContext(Duration timeout, int maximum, CancellationToken external, SearchException.Code timeoutCode) {
        long nanos=validDuration(timeout); if(maximum<1) throw new SearchException(SearchException.Code.CONFIGURATION);
        this.timeoutCode=timeoutCode; this.maximum=maximum; deadline=System.nanoTime()+nanos;
        parent=external==null ? () -> {} : external.onCancel(() -> stop(SearchException.Code.ABORTED));
        timer=TIMER.schedule(() -> stop(timeoutCode),nanos,TimeUnit.NANOSECONDS);
    }
    public static RequestContext create(Duration timeout, int maximum, CancellationToken token) {
        return new RequestContext(timeout, maximum, token, SearchException.Code.TIMEOUT);
    }
    static long validDuration(Duration d) {
        if(d==null || d.isNegative() || d.isZero() || d.compareTo(Duration.ofDays(1))>0) throw new SearchException(SearchException.Code.CONFIGURATION);
        return d.toNanos();
    }
    private void stop(SearchException.Code code) { synchronized(this) { if(stopped!=null) return; stopped=code; } token.cancel(); }
    SearchException transportTimeout() {
        stop(timeoutCode);
        return new SearchException(stopped);
    }
    public CancellationToken cancellation() { return token; }
    public int maxResponseBytes() { return maximum; }
    public Duration remaining() { check(); return Duration.ofNanos(Math.max(1,deadline-System.nanoTime())); }
    public void check() {
        if(stopped!=null) throw new SearchException(stopped);
        if(token.isCancelled()) throw new SearchException(SearchException.Code.ABORTED);
        if(System.nanoTime()>=deadline) { stop(timeoutCode); throw new SearchException(stopped); }
    }
    public <T> CompletableFuture<T> race(Supplier<? extends CompletionStage<T>> operation) {
        CompletableFuture<T> result=new CompletableFuture<>();
        CancellationToken.Registration registration=token.onCancel(() -> result.completeExceptionally(new SearchException(stopped==null ? SearchException.Code.ABORTED : stopped)));
        result.whenComplete((v,e) -> registration.close());
        try {
            WORKERS.execute(() -> {
                if(result.isDone()) return;
                CompletionStage<T> stage;
                try { check(); stage=operation.get(); if(stage==null) throw new SearchException(SearchException.Code.INVALID_RESPONSE); }
                catch(Throwable e) { result.completeExceptionally(SearchException.sanitize(e)); return; }
                CompletableFuture<T> source=stage.toCompletableFuture();
                result.whenComplete((v,e) -> { if(!source.isDone()) source.cancel(true); });
                source.whenComplete((v,e) -> {
                    try { check(); if(e!=null) throw SearchException.sanitize(e); result.complete(v); }
                    catch(Throwable error) { result.completeExceptionally(SearchException.sanitize(error)); }
                });
            });
        } catch(RejectedExecutionException e) { result.completeExceptionally(new SearchException(SearchException.Code.UNAVAILABLE)); }
        return result;
    }
    CompletableFuture<Void> delay(long milliseconds) {
        return race(() -> {
            CompletableFuture<Void> f=new CompletableFuture<>();
            ScheduledFuture<?> task=TIMER.schedule(() -> f.complete(null),milliseconds,TimeUnit.MILLISECONDS);
            f.whenComplete((v,e) -> task.cancel(false)); return f;
        });
    }
    @Override public void close() { timer.cancel(false); parent.close(); }
}
