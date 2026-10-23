package dev.searchsdk;

import java.util.List;
import java.util.concurrent.CompletionStage;

/** Custom providers must honor the context; callers still race providers that ignore it. */
public interface Provider {
    String id();
    Capabilities capabilities();
    CompletionStage<Response> search(SearchRequest request, RequestContext context);
    record Capabilities(boolean domainFilters, int maxIncludeDomains, int maxExcludeDomains,
                        boolean mutuallyExclusiveDomainFilters, Integer maxQueryLength) {
        public Capabilities {
            if (maxIncludeDomains < 0 || maxExcludeDomains < 0 || maxQueryLength != null && maxQueryLength < 1)
                throw new SearchException(SearchException.Code.CONFIGURATION);
        }
        public void check(SearchRequest r) {
            if ((!domainFilters && (r.includeDomains() != null || r.excludeDomains() != null)) ||
                mutuallyExclusiveDomainFilters && r.includeDomains() != null && r.excludeDomains() != null ||
                r.includeDomains() != null && r.includeDomains().size() > maxIncludeDomains ||
                r.excludeDomains() != null && r.excludeDomains().size() > maxExcludeDomains ||
                maxQueryLength != null && r.query().length() > maxQueryLength)
                throw new SearchException(SearchException.Code.UNSUPPORTED_OPTION);
        }
    }
    record Response(List<SearchResponse.Result> results, SearchResponse.Usage usage, List<SearchResponse.Warning> warnings) {
        public Response { results = List.copyOf(results); warnings = List.copyOf(warnings); }
    }
}
