package dev.searchsdk;

import java.util.List;

/** JSON data preserves provider fields and may be sensitive. Metadata excludes inputs, URLs, auth and raw headers. */
public record NativeResponse<T>(T data,Metadata metadata) {
    public record Metadata(String provider,String operation,Integer status,String requestId,List<SearchResponse.Attempt> attempts) {
        public Metadata { attempts=List.copyOf(attempts); }
    }
    @Override public String toString() { return "NativeResponse["+metadata.provider()+"."+metadata.operation()+"]"; }
}
