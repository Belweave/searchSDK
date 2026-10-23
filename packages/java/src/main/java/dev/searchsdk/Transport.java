package dev.searchsdk;

import java.net.URI;
import java.util.*;
import java.util.concurrent.CompletionStage;
import java.util.concurrent.Flow;
import java.nio.ByteBuffer;

/** Injection boundary. The default implementation enforces streaming byte limits and rejects redirects. */
@FunctionalInterface
public interface Transport {
    CompletionStage<Response> send(Request request, RequestContext context);
    /** Default adapts deterministic buffered test transports. Production HttpClient overrides this incrementally. */
    default CompletionStage<StreamResponse> stream(Request request, RequestContext context) {
        return send(request,context).thenApply(response -> new StreamResponse(response.status(),response.headers(), subscriber ->
            subscriber.onSubscribe(new Flow.Subscription() {
                boolean done;
                @Override public synchronized void request(long n) {
                    if(done) return; done=true;
                    if(n<=0) { subscriber.onError(new IllegalArgumentException("Positive demand required")); return; }
                    subscriber.onNext(List.of(ByteBuffer.wrap(response.body()))); subscriber.onComplete();
                }
                @Override public synchronized void cancel() { done=true; }
            })));
    }
    record StreamResponse(int status, Map<String,List<String>> headers, Flow.Publisher<List<ByteBuffer>> body) {
        public StreamResponse {
            Map<String,List<String>> copy=new TreeMap<>(String.CASE_INSENSITIVE_ORDER);
            headers.forEach((k,v) -> copy.put(k,List.copyOf(v))); headers=Collections.unmodifiableMap(copy);
        }
        public String header(String name) { List<String> v=headers.get(name); return v==null || v.isEmpty() ? null : String.join(", ",v); }
        @Override public String toString() { return "Transport.StreamResponse[status="+status+"]"; }
    }
    record Request(URI uri, String method, Map<String,String> headers, byte[] body) {
        public Request { headers=Map.copyOf(headers); body=body==null ? null : body.clone(); }
        @Override public byte[] body() { return body==null ? null : body.clone(); }
        @Override public String toString() { return "Transport.Request[redacted]"; }
    }
    record Response(int status, Map<String,List<String>> headers, byte[] body) {
        public Response {
            Map<String,List<String>> copy=new TreeMap<>(String.CASE_INSENSITIVE_ORDER);
            headers.forEach((k,v) -> copy.put(k,List.copyOf(v))); headers=Collections.unmodifiableMap(copy); body=body.clone();
        }
        public Response(int status, byte[] body) { this(status,Map.of(),body); }
        @Override public byte[] body() { return body.clone(); }
        public String header(String name) { List<String> values=headers.get(name); return values==null || values.isEmpty() ? null : String.join(", ",values); }
        @Override public String toString() { return "Transport.Response[status="+status+"]"; }
    }
}
