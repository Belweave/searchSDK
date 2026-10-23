package dev.searchsdk;

import java.util.*;
import java.util.concurrent.*;

/** Nonblocking FIFO permits. Both queued and granted permits are released by cancellation. */
final class AsyncGate {
    private int active;
    private final int maximum;
    private final Deque<Waiter> waiters=new ArrayDeque<>();
    private record Waiter(RequestContext context,CompletableFuture<Permit> future) {}
    AsyncGate(int maximum) {
        if(maximum<1 || maximum>1024) throw new SearchException(SearchException.Code.CONFIGURATION); this.maximum=maximum;
    }
    final class Permit implements AutoCloseable {
        private boolean closed;
        private CancellationToken.Registration registration;
        Permit(RequestContext context) {
            registration=context.cancellation().onCancel(this::close);
            if(closed) registration.close();
        }
        @Override public void close() {
            synchronized(AsyncGate.this) {
                if(closed) return; closed=true;
                if(registration!=null) registration.close(); active--; drain();
            }
        }
    }
    private void drain() {
        while(active<maximum && !waiters.isEmpty()) {
            Waiter next=waiters.removeFirst();
            try { next.context().check(); }
            catch(SearchException e) { next.future().completeExceptionally(e); continue; }
            active++; Permit permit=new Permit(next.context());
            if(!next.future().complete(permit)) permit.close();
        }
    }
    CompletionStage<Permit> acquire(RequestContext context) {
        CompletableFuture<Permit> waiting=new CompletableFuture<>(); Waiter entry=new Waiter(context,waiting);
        synchronized(this) { context.check(); waiters.addLast(entry); drain(); }
        CancellationToken.Registration registration=context.cancellation().onCancel(() -> {
            synchronized(this) {
                if(waiters.remove(entry)) {
                    try { context.check(); waiting.completeExceptionally(new SearchException(SearchException.Code.ABORTED)); }
                    catch(SearchException e) { waiting.completeExceptionally(e); }
                }
            }
        });
        waiting.whenComplete((v,e) -> registration.close()); return waiting;
    }
}
