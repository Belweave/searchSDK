package dev.searchsdk;

import java.util.*;

/** Base for generated objects. Known getters are typed; all unknown fields survive round trips. */
public class WireObject extends WireValue {
    protected WireObject(Object value) { super(Values.object(value)); }
    public static WireObject fromJson(Object value) { return value==null ? null : new WireObject(value); }
    @Override public Map<String,Object> toJson() { return Values.object(super.toJson()); }
    protected Object field(String name) { return toJson().get(name); }
    public boolean hasField(String name) { return toJson().containsKey(name); }
    public Map<String,Object> additionalFields() { return toJson(); }
    protected Map<String,Object> additionalFields(Set<String> known) {
        Map<String,Object> extra=new LinkedHashMap<>();toJson().forEach((k,v) -> { if(!known.contains(k))extra.put(k,v); });return Collections.unmodifiableMap(extra);
    }
}
