package dev.belweave.searchsdk;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.TimeUnit;
import okhttp3.Authenticator;
import okhttp3.Call;
import okhttp3.ConnectionPool;
import okhttp3.CookieJar;
import okhttp3.Dispatcher;
import okhttp3.MediaType;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;
import okhttp3.ResponseBody;

/** Dedicated client: never use React Native's shared cookie/auth/logging interceptors. */
final class GatewayTransport {
  static final class Failure extends IOException {
    final String code;
    Failure(String code) { super("Gateway request failed."); this.code = code; }
  }
  static final class Payload {
    final int status;
    final Map<String, String> headers;
    final String url;
    final byte[] bytes;
    Payload(int status, Map<String, String> headers, String url, byte[] bytes) {
      this.status = status; this.headers = headers; this.url = url; this.bytes = bytes;
    }
  }
  private final OkHttpClient client;
  GatewayTransport() { this(new OkHttpClient.Builder()); }
  // Builder injection is package-private for local TLS fixture tests only.
  GatewayTransport(OkHttpClient.Builder builder) {
    Dispatcher dispatcher = new Dispatcher();
    dispatcher.setMaxRequests(2);
    dispatcher.setMaxRequestsPerHost(2);
    client = builder.dispatcher(dispatcher).connectionPool(new ConnectionPool(2, 30, TimeUnit.SECONDS))
        .cookieJar(CookieJar.NO_COOKIES).authenticator(Authenticator.NONE).proxyAuthenticator(Authenticator.NONE)
        .followRedirects(false).followSslRedirects(false).retryOnConnectionFailure(false).cache(null).build();
  }
  Call create(String endpoint, Map<String, String> headers, String body, int timeoutMs) throws Failure {
    try {
      java.net.URI uri = new java.net.URI(endpoint);
      if (!"https".equalsIgnoreCase(uri.getScheme()) || uri.getHost() == null || uri.getRawUserInfo() != null ||
          uri.getRawQuery() != null || uri.getRawFragment() != null || timeoutMs < 1 || endpoint.contains("\\")) throw new Exception();
      if (!"application/json".equals(headers.get("Content-Type")) || !"application/json".equals(headers.get("Accept")) ||
          headers.keySet().stream().anyMatch(k -> !k.equals("Content-Type") && !k.equals("Accept") && !k.equals("Authorization"))) throw new Exception();
      if (headers.containsKey("Authorization") && !headers.get("Authorization").matches("Bearer [A-Za-z0-9\\-._~+/]+=*")) throw new Exception();
      Request.Builder request = new Request.Builder().url(endpoint).post(RequestBody.create(body, MediaType.get("application/json; charset=utf-8")));
      for (Map.Entry<String, String> header : headers.entrySet()) request.header(header.getKey(), header.getValue());
      Call call = client.newCall(request.build());
      call.timeout().timeout(timeoutMs, TimeUnit.MILLISECONDS);
      return call;
    } catch (Exception ignored) { throw new Failure("SEARCHSDK_INVALID_RESPONSE"); }
  }
  static Payload consume(Response response, int maximum) throws IOException {
    try (Response closed = response) {
      if (maximum < 1 || response.code() >= 300 && response.code() < 400) throw new Failure("SEARCHSDK_INVALID_RESPONSE");
      ResponseBody body = response.body();
      if (body == null) throw new Failure("SEARCHSDK_INVALID_RESPONSE");
      ByteArrayOutputStream output = new ByteArrayOutputStream(Math.min(maximum, 8192));
      byte[] chunk = new byte[Math.min(maximum, 8192)];
      try (InputStream input = body.byteStream()) {
        for (int count; (count = input.read(chunk)) != -1;) {
          // OkHttp transparently decodes gzip before exposing this stream.
          if (count > maximum - output.size()) throw new Failure("SEARCHSDK_LIMIT");
          output.write(chunk, 0, count);
        }
      }
      Map<String, String> headers = new HashMap<>();
      java.util.List<String> versions = response.headers().values("X-SearchSDK-Protocol");
      if (!versions.isEmpty()) headers.put("x-searchsdk-protocol", versions.size() == 1 ? versions.get(0) : "invalid");
      return new Payload(response.code(), headers, response.request().url().toString(), output.toByteArray());
    }
  }
  void close() {
    client.dispatcher().cancelAll();
    client.connectionPool().evictAll();
    client.dispatcher().executorService().shutdown();
  }
}
