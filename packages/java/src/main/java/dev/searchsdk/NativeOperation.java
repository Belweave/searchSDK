package dev.searchsdk;

import java.util.*;

/** Generated operation descriptor. Fixed HTTPS base/path prevent arbitrary-origin credential forwarding. */
public record NativeOperation(String provider,String name,String base,String path,String method,String response,
                              boolean retryable,String source,String summary,Map<String,Object> contract) {
    public NativeOperation { contract=Collections.unmodifiableMap(new LinkedHashMap<>(contract)); }
    boolean flag(String name) { return Boolean.TRUE.equals(contract.get(name)); }
    List<String> list(String name) { Object v=contract.get(name); return v==null ? List.of() : Values.strings(v); }
    String text(String name) { return Values.optionalString(contract.get(name)); }
    static NativeOperation fromJson(Object v) {
        Map<String,Object> m=Values.object(v);
        return new NativeOperation(Values.string(m.get("provider")),Values.string(m.get("name")),Values.string(m.get("base")),
            Values.string(m.get("path")),Values.string(m.get("method")),Values.string(m.get("response")),Boolean.TRUE.equals(m.get("retryable")),
            Values.string(m.get("source")),Values.optionalString(m.get("summary")),m);
    }
}
