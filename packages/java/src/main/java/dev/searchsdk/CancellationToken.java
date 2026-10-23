package dev.searchsdk;

import java.util.*;

/** Thread-safe cancellation without an application-provided reason in public errors. */
public final class CancellationToken {
    public interface Registration extends AutoCloseable { @Override void close(); }
    private boolean cancelled;
    private final Set<Runnable> listeners = new LinkedHashSet<>();
    public synchronized boolean isCancelled() { return cancelled; }
    public void cancel() {
        List<Runnable> copy;
        synchronized(this) { if(cancelled) return; cancelled=true; copy=new ArrayList<>(listeners); listeners.clear(); }
        for(Runnable r:copy) { try { r.run(); } catch(RuntimeException ignored) { /* One listener cannot prevent cancellation. */ } }
    }
    public Registration onCancel(Runnable listener) {
        Objects.requireNonNull(listener);
        synchronized(this) { if(!cancelled) { listeners.add(listener); return () -> { synchronized(this) { listeners.remove(listener); } }; } }
        listener.run(); return () -> {};
    }
}
