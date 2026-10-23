package dev.searchsdk;

/** Additional attempts per provider; retries may repeat remote work and billing. */
public record RetryPolicy(int maxRetries, long baseDelayMs, long maxDelayMs) {
    public static final RetryPolicy NONE=new RetryPolicy(0,250,5000);
    public RetryPolicy {
        if(maxRetries<0 || maxRetries>5 || baseDelayMs<1 || maxDelayMs<baseDelayMs || maxDelayMs>86_400_000)
            throw new SearchException(SearchException.Code.CONFIGURATION);
    }
    long delay(int retry,Double retryAfter) {
        long exponential=Math.min(maxDelayMs,baseDelayMs*(1L<<retry));
        return Math.max(exponential,retryAfter==null ? 0 : (long)Math.ceil(retryAfter));
    }
}
