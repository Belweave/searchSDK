package dev.belweave.searchsdk;

import android.util.Base64;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.WritableMap;
import java.io.IOException;
import java.io.InterruptedIOException;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicBoolean;
import okhttp3.Call;
import okhttp3.Callback;
import okhttp3.Response;

public final class SearchSDKGatewayModule extends ReactContextBaseJavaModule {
  private final GatewayTransport transport = new GatewayTransport();
  private final Map<String, Call> active = new ConcurrentHashMap<>();
  private final AtomicBoolean closed = new AtomicBoolean();
  public SearchSDKGatewayModule(ReactApplicationContext context) { super(context); }
  @Override public String getName() { return "SearchSDKGateway"; }

  @ReactMethod public void request(String id, String endpoint, ReadableMap rawHeaders, String body,
      double maxBytes, double timeoutMs, Promise promise) {
    if (closed.get() || active.size() >= 1024) { reject(promise, "SEARCHSDK_UNAVAILABLE"); return; }
    if (id == null || id.isEmpty() || id.length() > 128 || !Double.isFinite(maxBytes) || !Double.isFinite(timeoutMs) ||
        maxBytes != Math.rint(maxBytes) || timeoutMs != Math.rint(timeoutMs) || maxBytes < 1 || maxBytes > Integer.MAX_VALUE ||
        timeoutMs < 1 || timeoutMs > Integer.MAX_VALUE) { reject(promise, "SEARCHSDK_INVALID_RESPONSE"); return; }
    final Call call;
    try {
      Map<String, String> headers = new HashMap<>();
      for (Map.Entry<String, Object> entry : rawHeaders.toHashMap().entrySet()) {
        if (!(entry.getValue() instanceof String)) throw new Exception();
        headers.put(entry.getKey(), (String)entry.getValue());
      }
      call = transport.create(endpoint, headers, body, (int)timeoutMs);
      if (active.putIfAbsent(id, call) != null) { reject(promise, "SEARCHSDK_INVALID_RESPONSE"); return; }
      if (closed.get()) call.cancel();
    } catch (Exception ignored) { reject(promise, "SEARCHSDK_INVALID_RESPONSE"); return; }
    call.enqueue(new Callback() {
      @Override public void onFailure(Call failed, IOException error) {
        active.remove(id, call);
        reject(promise, error instanceof InterruptedIOException ? "SEARCHSDK_TIMEOUT" : failed.isCanceled() ? "SEARCHSDK_ABORTED" : "SEARCHSDK_NETWORK");
      }
      @Override public void onResponse(Call completed, Response response) {
        try {
          GatewayTransport.Payload payload = GatewayTransport.consume(response, (int)maxBytes);
          if (completed.isCanceled() || closed.get()) { reject(promise, "SEARCHSDK_ABORTED"); return; }
          WritableMap result = Arguments.createMap(), headers = Arguments.createMap();
          for (Map.Entry<String, String> entry : payload.headers.entrySet()) headers.putString(entry.getKey(), entry.getValue());
          result.putInt("status", payload.status); result.putString("url", payload.url); result.putMap("headers", headers);
          result.putString("bodyBase64", Base64.encodeToString(payload.bytes, Base64.NO_WRAP));
          promise.resolve(result);
        } catch (GatewayTransport.Failure error) { reject(promise, error.code); }
        catch (Exception error) { reject(promise, error instanceof InterruptedIOException ? "SEARCHSDK_TIMEOUT" : completed.isCanceled() ? "SEARCHSDK_ABORTED" : "SEARCHSDK_NETWORK"); }
        finally { active.remove(id, call); }
      }
    });
  }
  @ReactMethod public void cancel(String id) { Call call = active.get(id); if (call != null) call.cancel(); }
  @Override public void invalidate() {
    if (closed.compareAndSet(false, true)) {
      for (Call call : active.values()) call.cancel();
      active.clear(); transport.close();
    }
    super.invalidate();
  }
  private static void reject(Promise promise, String code) { promise.reject(code, "Gateway request failed."); }
}
