package dev.searchsdk;

import java.math.BigDecimal;
import java.util.*;
import java.util.function.Function;

final class WireTypes {
    private WireTypes() {}
    static Object snapshot(Object value) { return Json.parse(Json.bytes(value)); }
    static Object unwrap(Object value) {
        if(value instanceof WireValue v)return v.toJson();
        return value;
    }
    static String string(Object value) { return value==null ? null : Values.string(value); }
    static Boolean bool(Object value) { if(value==null)return null;if(!(value instanceof Boolean b))throw Values.invalid();return b; }
    static Double number(Object value) { return value==null ? null : Values.number(value); }
    static Long integer(Object value) {
        if(value==null)return null;
        try { Values.number(value);return new BigDecimal(value.toString()).longValueExact(); }
        catch(RuntimeException e) { throw Values.invalid(); }
    }
    static <T> List<T> list(Object value,Function<Object,T> convert) {
        if(value==null)return null;
        List<T> output=new ArrayList<>();for(Object item:Values.array(value))output.add(convert.apply(item));return Collections.unmodifiableList(output);
    }
    static <T> Map<String,T> map(Object value,Function<Object,T> convert) {
        if(value==null)return null;
        Map<String,T> output=new LinkedHashMap<>();Values.object(value).forEach((k,v) -> output.put(k,convert.apply(v)));return Collections.unmodifiableMap(output);
    }
    static NativeInput input(WireObject path,WireObject query,WireObject headers,Object body,NativeInput extra) {
        NativeInput.Builder b=extra.toBuilder();
        if(path!=null)path.toJson().forEach((k,v) -> { if(v!=null)b.path(k,HttpSupport.scalar(v)); });
        if(query!=null)query.toJson().forEach(b::query);
        if(headers!=null)headers.toJson().forEach((k,v) -> { if(v!=null)b.header(k,HttpSupport.scalar(v)); });
        if(body!=null)b.body(unwrap(body));return b.build();
    }
}
