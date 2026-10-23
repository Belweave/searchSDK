package dev.belweave.searchsdk;

import static org.junit.Assert.*;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;
import java.util.zip.GZIPOutputStream;
import okhttp3.Call;
import okhttp3.Callback;
import okhttp3.OkHttpClient;
import okhttp3.Response;
import okhttp3.mockwebserver.MockResponse;
import okhttp3.mockwebserver.MockWebServer;
import okhttp3.mockwebserver.RecordedRequest;
import okhttp3.mockwebserver.SocketPolicy;
import okhttp3.tls.HandshakeCertificates;
import okhttp3.tls.HeldCertificate;
import okio.Buffer;
import org.junit.After;
import org.junit.Before;
import org.junit.Test;

public class GatewayTransportTest {
  private MockWebServer server;
  private GatewayTransport transport;
  private final CountDownLatch connectionReleased = new CountDownLatch(1);
  private final Map<String, String> headers = new HashMap<>();
  @Before public void setup() throws Exception {
    HeldCertificate cert = new HeldCertificate.Builder().addSubjectAlternativeName("localhost").build();
    HandshakeCertificates serverTLS = new HandshakeCertificates.Builder().heldCertificate(cert).build();
    HandshakeCertificates clientTLS = new HandshakeCertificates.Builder().addTrustedCertificate(cert.certificate()).build();
    server = new MockWebServer();
    // HTTP/1.1 fixture for transfer-encoding: chunked. MockWebServer otherwise
    // negotiates HTTP/2 and emits the chunk framing as literal HTTP/2 body bytes.
    server.setProtocols(java.util.Collections.singletonList(okhttp3.Protocol.HTTP_1_1));
    server.useHttps(serverTLS.sslSocketFactory(), false);
    server.start();
    transport = new GatewayTransport(new OkHttpClient.Builder()
        .sslSocketFactory(clientTLS.sslSocketFactory(), clientTLS.trustManager())
        .eventListener(new okhttp3.EventListener() {
          @Override public void connectionReleased(Call call, okhttp3.Connection connection) {
            connectionReleased.countDown();
          }
        }));
    headers.put("Content-Type", "application/json"); headers.put("Accept", "application/json"); headers.put("Authorization", "Bearer synthetic-app-token");
  }
  @After public void teardown() throws Exception { transport.close(); server.shutdown(); }
  private Call call(int timeout) throws Exception { return transport.create(server.url("/exact/path").toString(), headers, "{\"query\":\"synthetic\"}", timeout); }
  @Test public void exactPostAndNoCookiePersistence() throws Exception {
    server.enqueue(new MockResponse().setBody("abc").setHeader("X-SearchSDK-Protocol", "1").setHeader("Set-Cookie", "secret=value"));
    server.enqueue(new MockResponse().setBody("def"));
    GatewayTransport.Payload first = GatewayTransport.consume(call(1000).execute(), 3);
    assertEquals("abc", new String(first.bytes, java.nio.charset.StandardCharsets.UTF_8));
    assertEquals("1", first.headers.get("x-searchsdk-protocol"));
    GatewayTransport.consume(call(1000).execute(), 3);
    for (int i = 0; i < 2; i++) {
      RecordedRequest request = server.takeRequest(1, TimeUnit.SECONDS);
      assertEquals("/exact/path", request.getPath()); assertEquals("POST", request.getMethod());
      assertEquals("Bearer synthetic-app-token", request.getHeader("Authorization")); assertNull(request.getHeader("Cookie"));
    }
  }
  @Test public void redirectsNeverDispatchToDestination() throws Exception {
    try (MockWebServer sink = new MockWebServer()) {
      sink.start(); server.enqueue(new MockResponse().setResponseCode(307).setHeader("Location", sink.url("/secret")));
      try { GatewayTransport.consume(call(1000).execute(), 100); fail(); }
      catch (GatewayTransport.Failure error) { assertEquals("SEARCHSDK_INVALID_RESPONSE", error.code); }
      assertEquals(1, server.getRequestCount()); assertNull(sink.takeRequest(100, TimeUnit.MILLISECONDS));
    }
  }
  @Test public void decodedGzipLimitCannotBeBypassedWithCompressedLength() throws Exception {
    byte[] decoded = new byte[10000];
    ByteArrayOutputStream buffer = new ByteArrayOutputStream();
    try (GZIPOutputStream gzip = new GZIPOutputStream(buffer)) { gzip.write(decoded); }
    assertTrue(buffer.size() < 100);
    server.enqueue(new MockResponse().setBody(new Buffer().write(buffer.toByteArray())).setHeader("Content-Encoding", "gzip"));
    try { GatewayTransport.consume(call(1000).execute(), 100); fail(); }
    catch (GatewayTransport.Failure error) { assertEquals("SEARCHSDK_LIMIT", error.code); }
  }
  @Test public void chunkedLimitAndExactBoundary() throws Exception {
    server.enqueue(new MockResponse().setChunkedBody("abcde", 1));
    assertArrayEquals("abcde".getBytes(java.nio.charset.StandardCharsets.UTF_8), GatewayTransport.consume(call(1000).execute(), 5).bytes);
    server.enqueue(new MockResponse().setChunkedBody("abcdef", 1));
    try { GatewayTransport.consume(call(1000).execute(), 5); fail(); }
    catch (GatewayTransport.Failure error) { assertEquals("SEARCHSDK_LIMIT", error.code); }
  }
  @Test public void cancellationStopsHangingSocket() throws Exception {
    server.enqueue(new MockResponse().setSocketPolicy(SocketPolicy.NO_RESPONSE));
    Call call = call(1000); CountDownLatch failed = new CountDownLatch(1);
    call.enqueue(new Callback() {
      @Override public void onFailure(Call call, IOException ignored) { failed.countDown(); }
      @Override public void onResponse(Call call, Response response) { response.close(); fail(); }
    });
    assertNotNull(server.takeRequest(1, TimeUnit.SECONDS)); call.cancel();
    assertTrue(failed.await(1, TimeUnit.SECONDS));
  }
  @Test public void wholeCallDeadlineIncludesConnectionSetup() throws Exception {
    server.enqueue(new MockResponse().setSocketPolicy(SocketPolicy.NO_RESPONSE));
    Call call = call(50);
    long started = System.nanoTime();
    try (Response unexpected = call.execute()) { fail("Expected whole-call timeout"); }
    catch (java.io.InterruptedIOException expected) { /* May expire before TLS or dispatch. */ }
    assertTrue("Whole-call deadline must settle promptly", System.nanoTime() - started < TimeUnit.SECONDS.toNanos(3));
    assertTrue("Deadline cancels the underlying call", call.isCanceled());
  }
  @Test public void deadlineStopsConfirmedHangingResponse() throws Exception {
    server.enqueue(new MockResponse().setSocketPolicy(SocketPolicy.NO_RESPONSE));
    Call call = call(10_000);
    CompletableFuture<IOException> failed = new CompletableFuture<>();
    call.enqueue(new Callback() {
      @Override public void onFailure(Call call, IOException error) { failed.complete(error); }
      @Override public void onResponse(Call call, Response response) {
        response.close();
        failed.completeExceptionally(new AssertionError("Hanging fixture unexpectedly responded"));
      }
    });
    try {
      RecordedRequest request = server.takeRequest(7, TimeUnit.SECONDS);
      assertNotNull("Fixture must receive the HTTPS request before the deadline", request);
      assertEquals("/exact/path", request.getPath());
      assertTrue("Confirmed response must remain pending", !failed.isDone());
      assertTrue("Hanging response ends with timeout", failed.get(12, TimeUnit.SECONDS) instanceof java.io.InterruptedIOException);
      assertTrue("Deadline cancels the underlying call", call.isCanceled());
      assertTrue("Timed-out connection is released", connectionReleased.await(3, TimeUnit.SECONDS));
    } finally {
      call.cancel();
    }
    assertEquals(1, server.getRequestCount());
  }
  @Test public void noAutomaticPostRetryOrAuthenticationRetry() throws Exception {
    server.enqueue(new MockResponse().setResponseCode(401).setHeader("WWW-Authenticate", "Basic realm=private").setBody("denied"));
    assertEquals(401, GatewayTransport.consume(call(1000).execute(), 100).status);
    assertEquals(1, server.getRequestCount());
  }
  @Test public void nativeEntryValidationRejectsUrlsAndAmbientHeaders() throws Exception {
    for (String endpoint : new String[] { "http://example.com/", "https://u:p@example.com/", "https://example.com/?", "https://example.com/#" }) {
      try { transport.create(endpoint, headers, "{}", 1000); fail(); } catch (GatewayTransport.Failure expected) { }
    }
    headers.put("Cookie", "private");
    try { call(1000); fail(); } catch (GatewayTransport.Failure expected) { }
  }
}
