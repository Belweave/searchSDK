package dev.searchsdk;

import java.util.*;

/** Immutable provider-native input; builders snapshot JSON structures immediately. */
public final class NativeInput {
    final Map<String,String> path;
    final Map<String,Object> query;
    final Map<String,String> headers;
    final Object body;
    final byte[] rawBody;
    final MultipartBody multipart;
    private NativeInput(Builder b) {
        path=Map.copyOf(b.path); query=snapshot(b.query); headers=HttpSupport.headers(b.headers,SearchException.Code.INVALID_REQUEST);
        body=b.body==null ? null : Json.parse(Json.bytes(b.body)); rawBody=b.rawBody==null ? null : b.rawBody.clone(); multipart=b.multipart;
        if((body==null ? 0 : 1)+(rawBody==null ? 0 : 1)+(multipart==null ? 0 : 1)>1) throw new SearchException(SearchException.Code.INVALID_REQUEST);
    }
    private static Map<String,Object> snapshot(Map<String,Object> value) { return Values.object(Json.parse(Json.bytes(value))); }
    public static Builder builder() { return new Builder(); }
    public static NativeInput empty() { return builder().build(); }
    public Builder toBuilder() {
        Builder b=new Builder(); b.path.putAll(path); b.query.putAll(query); b.headers.putAll(headers); b.body=body; b.rawBody=rawBody; b.multipart=multipart; return b;
    }
    public static final class Builder {
        final Map<String,String> path=new LinkedHashMap<>(); final Map<String,Object> query=new LinkedHashMap<>(); final Map<String,String> headers=new LinkedHashMap<>();
        Object body; byte[] rawBody; MultipartBody multipart;
        public Builder path(String name,String value) { path.put(name,value); return this; }
        public Builder query(String name,Object value) { query.put(name,value); return this; }
        public Builder body(Object value) { body=value; return this; }
        public Builder rawBody(byte[] value,String contentType) { rawBody=value==null ? null : value.clone(); if(contentType!=null) headers.put("Content-Type",contentType); return this; }
        public Builder multipart(MultipartBody value) { multipart=value; return this; }
        public Builder header(String name,String value) { headers.put(name,value); return this; }
        public NativeInput build() { return new NativeInput(this); }
        @Override public String toString() { return "NativeInput.Builder[redacted]"; }
    }
    @Override public String toString() { return "NativeInput[redacted]"; }
}
