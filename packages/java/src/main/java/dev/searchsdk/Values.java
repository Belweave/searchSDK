package dev.searchsdk;

import java.net.URI;
import java.time.Instant;
import java.util.*;

final class Values {
    private Values() {}
    static SearchException invalid() { return new SearchException(SearchException.Code.INVALID_RESPONSE); }
    @SuppressWarnings("unchecked") static Map<String,Object> object(Object value) {
        if (!(value instanceof Map<?,?> m) || m.keySet().stream().anyMatch(k -> !(k instanceof String))) throw invalid();
        return (Map<String,Object>) m;
    }
    static List<?> array(Object v) { if (!(v instanceof List<?> a)) throw invalid(); return a; }
    static String string(Object v) { if (!(v instanceof String s)) throw invalid(); return s; }
    static String optionalString(Object v) { return v == null ? null : string(v); }
    static List<String> strings(Object v) { return array(v).stream().map(Values::string).toList(); }
    static double number(Object v) { if (!(v instanceof Number n) || !Double.isFinite(n.doubleValue())) throw invalid(); return n.doubleValue(); }
    static int integer(Object v, int min, int max) {
        double n = number(v); if (n != Math.rint(n) || n < min || n > max) throw invalid(); return (int)n;
    }
    static Double nonnegativeNumber(Object v) {
        if (v == null) return null;
        double n = number(v); if (n < 0) throw invalid(); return n;
    }
    static String provider(Object v) { String s = string(v); if (!s.matches("[a-zA-Z0-9_-]{1,64}")) throw invalid(); return s; }
    static String requestId(Object v) {
        if (v == null) return null;
        String s = string(v); if (!s.matches("[a-zA-Z0-9_.:/-]{1,256}")) throw invalid(); return s;
    }
    static String url(Object value) {
        String s = string(value);
        try {
            if (s.matches("(?sU).*[\\s\\uFEFF\\p{Cc}\\\\].*")) throw invalid();
            URI u = URI.create(s);
            if (!("https".equalsIgnoreCase(u.getScheme()) || "http".equalsIgnoreCase(u.getScheme())) ||
                    u.getRawAuthority() == null || u.getRawUserInfo() != null) throw invalid();
            host(u);
            return s;
        } catch (IllegalArgumentException e) { throw invalid(); }
    }
    private static String host(URI uri) {
        String authority=uri.getRawAuthority(),rawHost,port="";
        if(authority.startsWith("[")) {
            int end=authority.indexOf(']');
            if(end<0 || uri.getHost()==null || authority.indexOf('%')>=0)throw invalid();
            rawHost=authority.substring(0,end+1);String suffix=authority.substring(end+1);
            if(!suffix.isEmpty()) { if(!suffix.startsWith(":"))throw invalid();port=suffix.substring(1); }
        } else {
            int colon=authority.lastIndexOf(':');
            if(colon>=0) { rawHost=authority.substring(0,colon);port=authority.substring(colon+1); }
            else rawHost=authority;
            String decoded=java.net.URLDecoder.decode(rawHost.replace("+","%2B"),java.nio.charset.StandardCharsets.UTF_8);
            if(decoded.isEmpty() || decoded.matches("(?sU).*[\\s\\p{Cc}#/:<>?@\\[\\]\\\\^|%].*"))throw invalid();
            rawHost=java.net.IDN.toASCII(decoded);
            if(rawHost.isEmpty() || rawHost.matches("(?sU).*[\\s\\p{Cc}#/:<>?@\\[\\]\\\\^|%].*"))throw invalid();
            // WHATWG treats a host ending in a number as an IPv4 address, including short/octal/hex forms.
            String numeric=rawHost.endsWith(".") ? rawHost.substring(0,rawHost.length()-1) : rawHost;
            String[] parts=numeric.split("\\.",-1);String last=parts[parts.length-1];
            if(last.matches("[0-9]+") || ipv4Number(last)!=null) {
                if(parts.length>4)throw invalid();long address=0;
                for(int index=0;index<parts.length;index++) {
                    Long number=ipv4Number(parts[index]);long ceiling=index==parts.length-1 ? 1L<<(8*(5-parts.length)) : 256;
                    if(number==null || number>=ceiling)throw invalid();
                    address+=number<<(index==parts.length-1 ? 0 : 8*(3-index));
                }
                rawHost=((address>>>24)&255)+"."+((address>>>16)&255)+"."+((address>>>8)&255)+"."+(address&255);
            }
        }
        if(!port.isEmpty()) {
            if(!port.matches("[0-9]+"))throw invalid();
            try { if(Long.parseLong(port)>65535)throw invalid(); }catch(NumberFormatException e) { throw invalid(); }
        }
        return rawHost+(port.isEmpty() ? "" : ":"+port);
    }
    private static Long ipv4Number(String text) {
        if(text.isEmpty())return null;int radix=10;
        if(text.length()>=2 && text.substring(0,2).equalsIgnoreCase("0x")) { radix=16;text=text.substring(2); }
        else if(text.length()>=2 && text.startsWith("0")) { radix=8;text=text.substring(1); }
        if(text.isEmpty())return 0L;
        if(!text.matches(radix==16 ? "[0-9a-fA-F]+" : radix==8 ? "[0-7]+" : "[0-9]+"))return null;
        try { return Long.parseLong(text,radix); }catch(NumberFormatException e) { return null; }
    }
    static URI endpoint(String value) {
        try {
            url(value); URI uri = URI.create(value);
            if (!"https".equalsIgnoreCase(uri.getScheme()) || uri.getRawQuery() != null || uri.getRawFragment() != null) throw invalid();
            URI normalized=URI.create("https://"+host(uri)+(uri.getRawPath()==null ? "" : uri.getRawPath()));
            if(normalized.getHost()==null)throw invalid();return normalized;
        } catch (RuntimeException e) { throw new SearchException(SearchException.Code.CONFIGURATION); }
    }
    static boolean blank(String s) {
        return s.codePoints().allMatch(c -> c>=9 && c<=13 || c==32 || c==0xA0 || c==0x1680 || c>=0x2000 && c<=0x200A ||
            c==0x2028 || c==0x2029 || c==0x202F || c==0x205F || c==0x3000 || c==0xFEFF);
    }
    static Instant instant(Object v) { try { return Instant.parse(string(v)); } catch (RuntimeException e) { throw invalid(); } }
    static SearchResponse.Usage usage(Object v, String field, String unit) {
        if (v == null) return null;
        Object amount = object(v).get(field); return amount == null ? null : new SearchResponse.Usage(unit, number(amount));
    }
    static SearchException.Code code(Object v) {
        try { return SearchException.Code.valueOf(string(v).toUpperCase(Locale.ROOT)); } catch (RuntimeException e) { throw invalid(); }
    }
    static SearchResponse gateway(Object value) {
        Map<String,Object> m = object(value);
        if(m.containsKey("reuse") && m.get("reuse")==null) throw invalid();
        List<SearchResponse.Result> results = array(m.get("results")).stream().map(v -> {
            Map<String,Object> r = object(v), p = object(r.get("provenance"));
            return new SearchResponse.Result(url(r.get("url")), optionalString(r.get("title")), optionalString(r.get("snippet")),
                r.get("highlights") == null ? null : strings(r.get("highlights")), r.get("score") == null ? null : number(r.get("score")),
                new SearchResponse.Provenance(provider(p.get("provider")), url(p.get("sourceUrl")), instant(p.get("retrievedAt")), requestId(p.get("requestId"))));
        }).toList();
        if (!m.containsKey("usage")) throw invalid();
        SearchResponse.Usage usage = m.get("usage") == null ? null : new SearchResponse.Usage(string(object(m.get("usage")).get("unit")), number(object(m.get("usage")).get("value")));
        List<SearchResponse.Warning> warnings = array(m.get("warnings")).stream().map(v -> {
            Map<String,Object> w = object(v); return new SearchResponse.Warning(string(w.get("code")), provider(w.get("provider")));
        }).toList();
        return new SearchResponse(provider(m.get("provider")), results, usage, warnings, attempts(m.get("attempts")), optionalString(m.get("reuse")));
    }
    static List<SearchResponse.Attempt> attempts(Object value) {
        List<?> values=array(value); if(values.size()>1024) throw invalid();
        return values.stream().map(v -> {
            Map<String,Object> a = object(v);
            for(String optional:List.of("code","status","retryAfterMs")) if(a.containsKey(optional) && a.get(optional)==null) throw invalid();
            return new SearchResponse.Attempt(provider(a.get("provider")), instant(a.get("startedAt")), number(a.get("durationMs")), string(a.get("outcome")),
                a.get("code") == null ? null : code(a.get("code")), a.get("status") == null ? null : integer(a.get("status"),100,599), nonnegativeNumber(a.get("retryAfterMs")));
        }).toList();
    }
}
