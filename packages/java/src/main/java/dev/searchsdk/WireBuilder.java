package dev.searchsdk;

import java.util.*;

/** Shared immutable-snapshot machinery for generated native model builders. */
public abstract class WireBuilder<B extends WireBuilder<B>> {
    private final Map<String,Object> values=new LinkedHashMap<>();
    protected abstract B self();
    protected final B set(String name,Object value) { values.put(name,WireTypes.snapshot(value));return self(); }
    public final B additionalField(String name,Object value) {
        if(name==null || knownFields().contains(name))throw new SearchException(SearchException.Code.INVALID_REQUEST);
        return set(name,value);
    }
    protected abstract Set<String> knownFields();
    protected final Map<String,Object> buildFields(String... required) { return buildFields(Set.of(),required); }
    protected final Map<String,Object> buildFields(Set<String> nullable,String... required) {
        for(String key:required)if(!values.containsKey(key) || values.get(key)==null && !nullable.contains(key))throw new SearchException(SearchException.Code.INVALID_REQUEST);
        return Collections.unmodifiableMap(new LinkedHashMap<>(values));
    }
    @Override public final String toString() { return "WireBuilder[redacted]"; }
}
