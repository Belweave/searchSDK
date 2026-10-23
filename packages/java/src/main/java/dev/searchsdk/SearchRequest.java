package dev.searchsdk;

import java.util.*;
import static dev.searchsdk.SearchException.Code.INVALID_REQUEST;

/** Normalized, immutable search input. Query length is measured in UTF-16 units. */
public record SearchRequest(String query, int limit, List<String> includeDomains, List<String> excludeDomains) {
    public SearchRequest(String query) { this(query, 5, null, null); }
    public SearchRequest(String query, int limit) { this(query, limit, null, null); }
    public SearchRequest {
        if (query == null || Values.blank(query) || limit < 1 || limit > 20) throw new SearchException(INVALID_REQUEST);
        includeDomains = domains(includeDomains); excludeDomains = domains(excludeDomains);
        if (includeDomains != null && excludeDomains != null && !Collections.disjoint(includeDomains, excludeDomains))
            throw new SearchException(INVALID_REQUEST);
    }
    private static List<String> domains(List<String> values) {
        if (values == null) return null;
        if (values.isEmpty()) throw new SearchException(INVALID_REQUEST);
        Set<String> result = new LinkedHashSet<>();
        for (String domain : values) {
            if (domain == null || domain.length() > 253 || !domain.contains(".")) throw new SearchException(INVALID_REQUEST);
            for (String label : domain.split("\\.", -1))
                if (!label.matches("(?i)[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?")) throw new SearchException(INVALID_REQUEST);
            result.add(domain.toLowerCase(Locale.ROOT));
        }
        return List.copyOf(result);
    }
    public Map<String,Object> toJson() {
        Map<String,Object> value = new LinkedHashMap<>(); value.put("query", query); value.put("limit", limit);
        if (includeDomains != null) value.put("includeDomains", includeDomains);
        if (excludeDomains != null) value.put("excludeDomains", excludeDomains);
        return Collections.unmodifiableMap(value);
    }
    public static SearchRequest fromJson(Object value) {
        try {
            Map<String,Object> m = Values.object(value);
            if (!Set.of("query", "limit", "includeDomains", "excludeDomains").containsAll(m.keySet())) throw new SearchException(INVALID_REQUEST);
            return new SearchRequest(Values.string(m.get("query")), m.containsKey("limit") ? Values.integer(m.get("limit"), 1, 20) : 5,
                m.containsKey("includeDomains") ? Values.strings(m.get("includeDomains")) : null,
                m.containsKey("excludeDomains") ? Values.strings(m.get("excludeDomains")) : null);
        } catch (RuntimeException e) { throw new SearchException(INVALID_REQUEST); }
    }
}
