package dev.searchsdk;

import java.io.ByteArrayOutputStream;
import java.net.http.*;
import java.net.Proxy;
import java.net.ProxySelector;
import java.net.URI;
import java.net.SocketAddress;
import java.io.IOException;
import java.nio.ByteBuffer;
import java.time.Duration;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.Flow;

/** JDK HttpClient, no redirects, no cookie handler/authenticator, bounded streamed response body. */
public final class JdkTransport implements Transport {
    private static final ProxySelector DIRECT=new ProxySelector() {
        @Override public List<Proxy> select(URI uri) { return List.of(Proxy.NO_PROXY); }
        @Override public void connectFailed(URI uri,SocketAddress address,IOException error) { /* No ambient proxy to report to. */ }
    };
    // HttpClient leaves cookieHandler/authenticator empty when omitted; unlike URLConnection,
    // it does not inherit the JVM's global CookieHandler or Authenticator.
    private final HttpClient client=HttpClient.newBuilder().proxy(DIRECT).followRedirects(HttpClient.Redirect.NEVER)
        .connectTimeout(Duration.ofSeconds(10)).version(HttpClient.Version.HTTP_2).build();
    private static final JdkTransport SHARED=new JdkTransport();
    public static JdkTransport shared() { return SHARED; }
    @Override public CompletionStage<Response> send(Request request, RequestContext context) {
        return context.race(() -> {
            HttpRequest.Builder b=HttpRequest.newBuilder(request.uri()).timeout(context.remaining());
            request.headers().forEach(b::header);
            b.header("Accept-Encoding","identity");
            b.method(request.method(),request.body()==null ? HttpRequest.BodyPublishers.noBody() : HttpRequest.BodyPublishers.ofByteArray(request.body()));
            CompletableFuture<HttpResponse<byte[]>> sent=client.sendAsync(b.build(), info -> {
                String encoding=info.headers().firstValue("content-encoding").orElse("identity");
                // Never decompress unboundedly. Providers are explicitly asked for identity encoding.
                boolean reject=!encoding.equalsIgnoreCase("identity");
                long length=info.headers().firstValueAsLong("content-length").orElse(-1);
                SearchException ceilingFailure=info.statusCode()<200 || info.statusCode()>=300 ? HttpSupport.error(new Transport.Response(info.statusCode(),info.headers().map(),new byte[0])) : Values.invalid();
                return new LimitedSubscriber(context.maxResponseBytes(),context.cancellation(),reject || length>context.maxResponseBytes(),ceilingFailure);
            });
            CompletableFuture<Response> result=new CompletableFuture<>();
            sent.whenComplete((v,e) -> {
                if(e!=null) result.completeExceptionally(SearchException.sanitize(e));
                else result.complete(new Response(v.statusCode(),v.headers().map(),v.body()));
            });
            result.whenComplete((v,e) -> { if(!sent.isDone()) sent.cancel(true); });
            return result;
        });
    }
    @Override public CompletionStage<StreamResponse> stream(Request request,RequestContext context) {
        return context.race(() -> {
            HttpRequest.Builder b=HttpRequest.newBuilder(request.uri()).timeout(context.remaining());
            request.headers().forEach(b::header); b.header("Accept-Encoding","identity");
            b.method(request.method(),request.body()==null ? HttpRequest.BodyPublishers.noBody() : HttpRequest.BodyPublishers.ofByteArray(request.body()));
            CompletableFuture<HttpResponse<Flow.Publisher<List<ByteBuffer>>>> sent=client.sendAsync(b.build(),HttpResponse.BodyHandlers.ofPublisher());
            CompletableFuture<StreamResponse> result=new CompletableFuture<>();
            sent.whenComplete((v,e) -> {
                if(e!=null) result.completeExceptionally(SearchException.sanitize(e));
                else {
                    StreamResponse response=new StreamResponse(v.statusCode(),v.headers().map(),v.body());
                    if(!result.complete(response)) NativeEventStream.discard(response.body());
                }
            });
            result.whenComplete((v,e) -> { if(!sent.isDone()) sent.cancel(true); }); return result;
        });
    }
    private static final class LimitedSubscriber implements HttpResponse.BodySubscriber<byte[]> {
        final CompletableFuture<byte[]> body=new CompletableFuture<>();
        final ByteArrayOutputStream bytes=new ByteArrayOutputStream();
        final int maximum; final boolean reject; final SearchException ceilingFailure;
        final CancellationToken.Registration registration;
        Flow.Subscription subscription;
        LimitedSubscriber(int maximum,CancellationToken token,boolean reject,SearchException ceilingFailure) {
            this.maximum=maximum; this.reject=reject; this.ceilingFailure=ceilingFailure;
            registration=token.onCancel(() -> fail(new SearchException(SearchException.Code.ABORTED)));
            body.whenComplete((v,e) -> registration.close());
        }
        @Override public CompletionStage<byte[]> getBody() { return body; }
        @Override public synchronized void onSubscribe(Flow.Subscription value) {
            if(subscription!=null) { value.cancel(); return; } subscription=value;
            if(reject) fail(ceilingFailure); else if(body.isDone()) value.cancel(); else value.request(1);
        }
        @Override public synchronized void onNext(List<ByteBuffer> buffers) {
            if(body.isDone()) return;
            for(ByteBuffer buffer:buffers) {
                if(buffer.remaining()>maximum-bytes.size()) { fail(ceilingFailure); return; }
                byte[] chunk=new byte[buffer.remaining()]; buffer.get(chunk); bytes.writeBytes(chunk);
            }
            subscription.request(1);
        }
        @Override public void onError(Throwable t) { fail(SearchException.sanitize(t)); }
        @Override public synchronized void onComplete() { body.complete(bytes.toByteArray()); }
        synchronized void fail(SearchException e) { body.completeExceptionally(e); if(subscription!=null) subscription.cancel(); }
    }
}
