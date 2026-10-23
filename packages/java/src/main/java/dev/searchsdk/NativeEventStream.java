package dev.searchsdk;

import java.io.ByteArrayOutputStream;
import java.nio.ByteBuffer;
import java.nio.charset.*;
import java.util.*;
import java.util.concurrent.Flow;

/** Single-subscriber incremental SSE. Close when abandoning a response; no reconnect or event replay. */
public final class NativeEventStream implements Flow.Publisher<NativeEventStream.Event>,AutoCloseable {
    public record Event(String event,String data,String id,Long retry) {}
    private final Flow.Publisher<List<ByteBuffer>> upstream;
    private final RequestContext context;
    private final Runnable cleanup;
    private final CancellationToken.Registration registration;
    private Flow.Subscriber<? super Event> downstream;
    private Flow.Subscription subscription;
    private final Deque<Event> queued=new ArrayDeque<>();
    private final ByteArrayOutputStream line=new ByteArrayOutputStream();
    private final StringBuilder data=new StringBuilder();
    private String event,id;
    private Long retry;
    private long demand,received;
    private boolean hasData,skipLf,firstLine=true,subscribed,upstreamClaimed,inFlight,upstreamDone,closed,draining;
    private SearchException failure;
    NativeEventStream(Flow.Publisher<List<ByteBuffer>> upstream,RequestContext context,Runnable cleanup) {
        this.upstream=upstream; this.context=context; this.cleanup=cleanup;
        registration=context.cancellation().onCancel(() -> {
            SearchException e;
            try { context.check(); e=new SearchException(SearchException.Code.ABORTED); } catch(SearchException stopped) { e=stopped; }
            fail(e);
        });
        // An already-cancelled context can invoke the listener before registration is assigned.
        if(closed) registration.close();
    }
    @Override public synchronized void subscribe(Flow.Subscriber<? super Event> subscriber) {
        Objects.requireNonNull(subscriber);
        if(subscribed) { subscriber.onSubscribe(new Flow.Subscription() { public void request(long n) {} public void cancel() {} }); subscriber.onError(new IllegalStateException("Stream accepts one subscriber")); return; }
        subscribed=true; downstream=subscriber;
        if(closed) {
            subscriber.onSubscribe(new Flow.Subscription() { public void request(long n) {} public void cancel() {} });
            if(failure!=null) subscriber.onError(failure); else subscriber.onComplete(); return;
        }
        subscriber.onSubscribe(new Flow.Subscription() {
            @Override public void request(long n) {
                synchronized(NativeEventStream.this) {
                    if(n<=0) { fail(new SearchException(SearchException.Code.INVALID_REQUEST)); return; }
                    demand=demand>Long.MAX_VALUE-n ? Long.MAX_VALUE : demand+n; drain();
                }
            }
            @Override public void cancel() { NativeEventStream.this.close(); }
        });
        if(closed) return;
        upstreamClaimed=true;
        try { upstream.subscribe(new Flow.Subscriber<>() {
            @Override public void onSubscribe(Flow.Subscription value) {
                synchronized(NativeEventStream.this) { subscription=value; if(closed) value.cancel(); else drain(); }
            }
            @Override public void onNext(List<ByteBuffer> buffers) {
                synchronized(NativeEventStream.this) {
                    inFlight=false; if(closed) return;
                    try {
                        context.check();
                        for(ByteBuffer b:buffers) {
                            received+=b.remaining(); if(received>context.maxResponseBytes()) throw Values.invalid();
                            while(b.hasRemaining()) byteValue(b.get()&255);
                        }
                        drain();
                    } catch(RuntimeException e) { fail(SearchException.sanitize(e)); }
                }
            }
            @Override public void onError(Throwable error) { synchronized(NativeEventStream.this) { fail(SearchException.sanitize(error)); } }
            @Override public void onComplete() {
                synchronized(NativeEventStream.this) {
                    // EOF does not dispatch an unterminated event, but malformed trailing UTF-8 still fails.
                    try { if(line.size()>0) decode(line.toByteArray()); upstreamDone=true; inFlight=false; drain(); }
                    catch(RuntimeException e) { fail(SearchException.sanitize(e)); }
                }
            }
        }); } catch(RuntimeException e) { fail(SearchException.sanitize(e)); }
    }
    private void byteValue(int value) {
        if(skipLf) { skipLf=false; if(value==10) return; }
        if(value==13 || value==10) { parseLine(); if(value==13) skipLf=true; }
        else line.write(value);
    }
    private String decode(byte[] bytes) {
        try { return StandardCharsets.UTF_8.newDecoder().onMalformedInput(CodingErrorAction.REPORT).onUnmappableCharacter(CodingErrorAction.REPORT).decode(ByteBuffer.wrap(bytes)).toString(); }
        catch(CharacterCodingException e) { throw Values.invalid(); }
    }
    private void parseLine() {
        String text=decode(line.toByteArray()); line.reset();
        if(firstLine) { firstLine=false; if(text.startsWith("\ufeff")) text=text.substring(1); }
        if(text.isEmpty()) {
            if(hasData) { queued.addLast(new Event(event,data.substring(0,data.length()-1),id,retry)); }
            data.setLength(0); event=null; retry=null; hasData=false; return;
        }
        int colon=text.indexOf(':'); if(colon==0) return;
        String field=colon<0 ? text : text.substring(0,colon),value=colon<0 ? "" : text.substring(colon+1);
        if(value.startsWith(" ")) value=value.substring(1);
        switch(field) {
            case "event" -> event=value;
            case "data" -> { data.append(value).append('\n'); hasData=true; }
            case "id" -> { if(value.indexOf('\0')<0) id=value; }
            case "retry" -> { if(value.matches("[0-9]+")) try { retry=Long.parseLong(value); } catch(NumberFormatException ignored) { /* Unrepresentable hints are ignored. */ } }
            default -> { /* Unknown SSE extension fields are ignored. */ }
        }
    }
    private void drain() {
        if(draining || downstream==null || closed) return; draining=true;
        try {
            while(!closed) {
                while(demand>0 && !queued.isEmpty()) {
                    Event e=queued.removeFirst(); demand--;
                    try { downstream.onNext(e); } catch(RuntimeException ignored) { close(); return; }
                    if(closed) return;
                }
                if(upstreamDone && queued.isEmpty()) { finish(); try { downstream.onComplete(); } catch(RuntimeException ignored) {} return; }
                if(demand>0 && queued.isEmpty() && subscription!=null && !inFlight && !upstreamDone) {
                    inFlight=true; subscription.request(1);
                    // Synchronous fixture publishers can fill the queue reentrantly; continue draining it.
                    if(!inFlight || !queued.isEmpty() || upstreamDone) continue;
                }
                return;
            }
        } finally { draining=false; }
    }
    private synchronized void fail(SearchException e) {
        if(closed) return; failure=e; queued.clear(); finish();
        if(downstream!=null) try { downstream.onError(e); } catch(RuntimeException ignored) {}
    }
    private void finish() {
        if(closed) return; closed=true;
        if(subscription!=null) subscription.cancel();
        else if(!upstreamClaimed) { upstreamClaimed=true; discard(upstream); }
        if(registration!=null) registration.close(); context.close(); cleanup.run();
    }
    @Override public synchronized void close() {
        if(closed) return;
        // Claim the underlying publisher even when no subscriber was attached, so its connection is released.
        queued.clear(); finish();
    }
    static void discard(Flow.Publisher<List<ByteBuffer>> body) {
        try { body.subscribe(new Flow.Subscriber<>() {
            public void onSubscribe(Flow.Subscription s) { s.cancel(); }
            public void onNext(List<ByteBuffer> b) {} public void onError(Throwable e) {} public void onComplete() {}
        }); } catch(RuntimeException ignored) { /* Cleanup never exposes a transport exception. */ }
    }
    @Override public String toString() { return "NativeEventStream[redacted]"; }
}
