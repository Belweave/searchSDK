package dev.searchsdk;

import java.time.Instant;
import java.util.List;

/** Validated normalized output. Unknown usage is null, never an invented zero. */
public record SearchResponse(String provider, List<Result> results, Usage usage, List<Warning> warnings,
                             List<Attempt> attempts, String reuse) {
    public SearchResponse {
        Values.provider(provider); results = List.copyOf(results); warnings = List.copyOf(warnings); attempts = List.copyOf(attempts);
        if (reuse != null && !reuse.equals("cache") && !reuse.equals("inflight")) throw Values.invalid();
    }
    public record Provenance(String provider, String sourceUrl, Instant retrievedAt, String requestId) {
        public Provenance { Values.provider(provider); Values.url(sourceUrl); if (retrievedAt == null) throw Values.invalid(); Values.requestId(requestId); }
    }
    public record Result(String url, String title, String snippet, List<String> highlights, Double score, Provenance provenance) {
        public Result {
            Values.url(url); if (highlights != null) highlights = List.copyOf(highlights);
            if (score != null && !Double.isFinite(score) || provenance == null) throw Values.invalid();
        }
    }
    public record Usage(String unit, double value) {
        public Usage { if (!("usd".equals(unit) || "credits".equals(unit)) || !Double.isFinite(value) || value < 0) throw Values.invalid(); }
    }
    public record Warning(String code, String provider) {
        public Warning { Values.provider(provider); if (!("fallback_used".equals(code) || "provider_warning".equals(code))) throw Values.invalid(); }
    }
    public record Attempt(String provider, Instant startedAt, double durationMs, String outcome,
                          SearchException.Code code, Integer status, Double retryAfterMs) {
        public Attempt {
            Values.provider(provider);
            if (startedAt == null || !Double.isFinite(durationMs) || durationMs < 0 ||
                !("success".equals(outcome) || "error".equals(outcome)) ||
                status != null && (status < 100 || status > 599) || retryAfterMs != null && (!Double.isFinite(retryAfterMs) || retryAfterMs < 0)) throw Values.invalid();
        }
    }
}
