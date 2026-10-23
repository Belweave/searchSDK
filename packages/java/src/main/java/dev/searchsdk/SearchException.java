package dev.searchsdk;

import java.util.List;

/** Sanitized failure. Never carries upstream bodies, URLs, queries or exception causes. */
public final class SearchException extends RuntimeException {
    private static final long serialVersionUID = 1L;
    public enum Code {
        INVALID_REQUEST, UNSUPPORTED_OPTION, CONFIGURATION, AUTH, RATE_LIMIT, NETWORK,
        UNAVAILABLE, ATTEMPT_TIMEOUT, TIMEOUT, ABORTED, INVALID_RESPONSE, PROVIDER_ERROR;
        public String wireName() { return name().toLowerCase(java.util.Locale.ROOT); }
    }
    private final Code code;
    private final Integer status;
    private final Double retryAfterMs;
    @SuppressWarnings("serial")
    private final List<SearchResponse.Attempt> attempts;
    public SearchException(Code code) { this(code, null, null, List.of()); }
    public SearchException(Code code, Integer status, Number retryAfterMs, List<SearchResponse.Attempt> attempts) {
        super("Search failed: " + code.wireName(), null, false, true);
        this.code = code; this.status = status; this.retryAfterMs = retryAfterMs==null ? null : retryAfterMs.doubleValue();
        if(status!=null && (status<100 || status>599) || this.retryAfterMs!=null && (!Double.isFinite(this.retryAfterMs) || this.retryAfterMs<0)) throw Values.invalid();
        this.attempts = List.copyOf(attempts);
    }
    public Code code() { return code; }
    public Integer status() { return status; }
    public Double retryAfterMs() { return retryAfterMs; }
    public List<SearchResponse.Attempt> attempts() { return attempts; }
    static SearchException sanitize(Throwable error) {
        // HttpClient may wrap a subscriber's sanitized failure in IOException before completing its future.
        java.util.Set<Throwable> seen=java.util.Collections.newSetFromMap(new java.util.IdentityHashMap<>());
        for(int i=0; error!=null && i<32 && seen.add(error); i++,error=error.getCause())
            if(error instanceof SearchException s) return s;
        return new SearchException(Code.NETWORK);
    }
}
