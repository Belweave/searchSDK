package dev.searchsdk;

import java.net.*;
import java.nio.charset.StandardCharsets;
import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.*;

final class HttpSupport {
    static final int DEFAULT_MAXIMUM=10*1024*1024;
    private HttpSupport() {}
    static String key(String key) {
        if(key==null || !key.matches("[\\x21-\\x7e]+")) throw new SearchException(SearchException.Code.CONFIGURATION); return key;
    }
    static String encode(String s) { return URLEncoder.encode(s,StandardCharsets.UTF_8).replace("+","%20"); }
    static String query(Map<String,?> values) {
        List<String> parts=new ArrayList<>();
        for(var e:values.entrySet()) {
            if(e.getValue()==null) continue;
            List<?> all=e.getValue() instanceof List<?> a ? a : List.of(e.getValue());
            for(Object v:all) {
                if(!(v instanceof String || v instanceof Boolean || v instanceof Number) || v instanceof Number n && !Double.isFinite(n.doubleValue()))
                    throw new SearchException(SearchException.Code.INVALID_REQUEST);
                parts.add(encode(e.getKey())+"="+encode(scalar(v)));
            }
        }
        return String.join("&",parts);
    }
    static String scalar(Object value) {
        if(value instanceof Number number) {
            if(!Double.isFinite(number.doubleValue()))throw new SearchException(SearchException.Code.INVALID_REQUEST);
            java.math.BigDecimal decimal=new java.math.BigDecimal(number.toString()).stripTrailingZeros();
            // Avoid enormous expansions for valid scientific notation while keeping integral query values idiomatic.
            return decimal.scale()>=-20 && decimal.scale()<=20 ? decimal.toPlainString() : decimal.toString();
        }
        return String.valueOf(value);
    }
    static URI withQuery(String url,Map<String,?> query) { String q=query(query); return URI.create(url+(q.isEmpty()?"":"?"+q)); }
    static Map<String,String> headers(Map<String,String> input,SearchException.Code code) {
        Map<String,String> result=new TreeMap<>(String.CASE_INSENSITIVE_ORDER);
        if(input.size()>32) throw new SearchException(code);
        for(var e:input.entrySet()) {
            String k=e.getKey(),v=e.getValue();
            if(k==null || !k.matches("[!#$%&'*+.^_`|~0-9A-Za-z-]+") || v==null || v.length()>8192 || v.matches("(?s).*[\\r\\n\\x00].*") ||
                Set.of("host","cookie","connection","content-length","transfer-encoding","accept-encoding","upgrade","expect").contains(k.toLowerCase(Locale.ROOT)) || result.containsKey(k)) throw new SearchException(code);
            result.put(k,v);
        }
        return Collections.unmodifiableMap(result);
    }
    static CompletionStage<Transport.Response> send(Transport transport,Transport.Request request,RequestContext context) {
        return context.race(() -> transport.send(request,context)).thenApply(response -> {
            context.check(); if(response==null || response.status()<100 || response.status()>599) throw Values.invalid();
            if(response.body().length>context.maxResponseBytes()) { if(response.status()<200 || response.status()>=300)throw error(response);throw Values.invalid(); }
            String encoding=response.header("content-encoding");
            if(encoding!=null && !encoding.equalsIgnoreCase("identity")) { if(response.status()<200 || response.status()>=300)throw error(response);throw Values.invalid(); }
            return response;
        });
    }
    static CompletionStage<Map<String,Object>> json(Transport transport,Transport.Request request,RequestContext context) {
        return send(transport,request,context).thenApply(response -> {
            if(response.status()<200 || response.status()>=300) throw error(response);
            Map<String,Object> value=Values.object(Json.parse(response.body())); context.check(); return value;
        });
    }
    static SearchException error(Transport.Response response) {
        int s=response.status(); SearchException.Code c=Set.of(401,402,403,432,433).contains(s) ? SearchException.Code.AUTH :
            s==429 ? SearchException.Code.RATE_LIMIT : s==408 || s>=500 && s<=599 ? SearchException.Code.UNAVAILABLE : SearchException.Code.PROVIDER_ERROR;
        return new SearchException(c,s,retryAfter(response.header("retry-after")),List.of());
    }
    static Double retryAfter(String value) {
        if(value==null) return null;
        try {
            if(value.trim().matches("[0-9]+(?:\\.[0-9]+)?")) {
                java.math.BigDecimal n=new java.math.BigDecimal(value.trim()).multiply(java.math.BigDecimal.valueOf(1000));
                double milliseconds=n.doubleValue(); return Double.isFinite(milliseconds) ? milliseconds : null;
            }
            return (double)Math.max(0,Duration.between(Instant.now(),ZonedDateTime.parse(value,DateTimeFormatter.RFC_1123_DATE_TIME).toInstant()).toMillis());
        } catch(RuntimeException e) { return null; }
    }
    static boolean transientFailure(SearchException.Code c) {
        return Set.of(SearchException.Code.NETWORK,SearchException.Code.UNAVAILABLE,SearchException.Code.RATE_LIMIT,SearchException.Code.ATTEMPT_TIMEOUT).contains(c);
    }
}
