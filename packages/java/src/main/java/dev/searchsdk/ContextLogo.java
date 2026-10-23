package dev.searchsdk;

import java.util.*;

/** Key-free direct Logo Link URL construction. Images must not be downloaded, persisted or rehosted. */
public final class ContextLogo {
    private ContextLogo() {}
    public record Query(String publicClientId,String domain,String theme,String type) {
        public Query {
            if(publicClientId==null || Values.blank(publicClientId) || domain==null || Values.blank(domain) ||
                theme!=null && !Set.of("light","dark").contains(theme) || type!=null && !Set.of("icon","wordmark").contains(type))
                throw new SearchException(SearchException.Code.INVALID_REQUEST);
        }
        Map<String,Object> wire() {
            Map<String,Object> result=new LinkedHashMap<>();result.put("publicClientId",publicClientId);result.put("domain",domain);
            if(theme!=null)result.put("theme",theme);if(type!=null)result.put("type",type);return result;
        }
    }
    public static String url(Query query) {
        if(query==null)throw new SearchException(SearchException.Code.INVALID_REQUEST);
        return HttpSupport.withQuery("https://logos.context.dev/",query.wire()).toString();
    }
}
