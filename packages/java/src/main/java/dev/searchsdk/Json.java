package dev.searchsdk;

import java.math.BigDecimal;
import java.nio.ByteBuffer;
import java.nio.charset.*;
import java.util.*;

/** Strict RFC 8259 JSON, with duplicate-key, nesting, Unicode and finite-number checks. */
public final class Json {
    private Json() {}
    public static Object parse(byte[] bytes) {
        try {
            String s = StandardCharsets.UTF_8.newDecoder().onMalformedInput(CodingErrorAction.REPORT)
                .onUnmappableCharacter(CodingErrorAction.REPORT).decode(ByteBuffer.wrap(bytes)).toString();
            return parse(s);
        } catch (CharacterCodingException e) { throw Values.invalid(); }
    }
    public static Object parse(String text) {
        try {
            if (text == null) throw Values.invalid();
            Parser p = new Parser(text); Object value = p.value(0); p.ws();
            if (p.pos != text.length()) throw Values.invalid(); return value;
        } catch (SearchException e) { throw e; } catch (RuntimeException e) { throw Values.invalid(); }
    }
    public static String stringify(Object value) {
        try { StringBuilder b = new StringBuilder(); write(value, b, 0); return b.toString(); }
        catch (RuntimeException e) { throw new SearchException(SearchException.Code.INVALID_REQUEST); }
    }
    public static byte[] bytes(Object value) { return stringify(value).getBytes(StandardCharsets.UTF_8); }
    private static void write(Object v, StringBuilder b, int depth) {
        if (depth > 128) throw Values.invalid();
        if (v instanceof WireValue wire) { write(wire.toJson(),b,depth+1); return; }
        if (v == null) { b.append("null"); return; }
        if (v instanceof String s) { quote(s, b); return; }
        if (v instanceof Boolean) { b.append(v); return; }
        if (v instanceof Number n) {
            if (!Double.isFinite(n.doubleValue()) || !(n instanceof Byte || n instanceof Short || n instanceof Integer || n instanceof Long ||
                    n instanceof Float || n instanceof Double || n instanceof BigDecimal || n instanceof java.math.BigInteger)) throw Values.invalid();
            b.append(n); return;
        }
        if (v instanceof Map<?,?> m) {
            b.append('{'); boolean comma = false;
            for (Map.Entry<?,?> e : m.entrySet()) {
                if (!(e.getKey() instanceof String s)) throw Values.invalid();
                if (comma) b.append(','); comma = true; quote(s,b); b.append(':'); write(e.getValue(), b, depth+1);
            }
            b.append('}'); return;
        }
        if (v instanceof List<?> a) {
            b.append('['); boolean comma = false;
            for (Object e : a) { if (comma) b.append(','); comma = true; write(e,b,depth+1); }
            b.append(']'); return;
        }
        throw Values.invalid();
    }
    private static void quote(String s, StringBuilder b) {
        b.append('"');
        for (int i=0; i<s.length(); i++) {
            char c=s.charAt(i);
            switch (c) {
                case '"' -> b.append("\\\""); case '\\' -> b.append("\\\\");
                case '\b' -> b.append("\\b"); case '\f' -> b.append("\\f"); case '\n' -> b.append("\\n");
                case '\r' -> b.append("\\r"); case '\t' -> b.append("\\t");
                default -> {
                    if (c < 32) b.append(String.format(Locale.ROOT, "\\u%04x", (int)c));
                    else if (Character.isHighSurrogate(c)) {
                        if (++i >= s.length() || !Character.isLowSurrogate(s.charAt(i))) throw Values.invalid();
                        b.append(c).append(s.charAt(i));
                    } else if (Character.isLowSurrogate(c)) throw Values.invalid(); else b.append(c);
                }
            }
        }
        b.append('"');
    }
    private static final class Parser {
        final String s; int pos; int nodes;
        Parser(String s) { this.s=s; }
        void ws() { while (pos<s.length() && " \t\n\r".indexOf(s.charAt(pos))>=0) pos++; }
        boolean eat(char c) { if (pos<s.length() && s.charAt(pos)==c) { pos++; return true; } return false; }
        Object value(int depth) {
            ws(); if (depth>128 || ++nodes>1_000_000 || pos>=s.length()) throw Values.invalid();
            char c=s.charAt(pos);
            if (c=='"') return string();
            if (eat('{')) {
                Map<String,Object> m=new LinkedHashMap<>(); ws(); if (eat('}')) return Collections.unmodifiableMap(m);
                do {
                    ws(); if (pos>=s.length() || s.charAt(pos)!='"') throw Values.invalid();
                    String k=string(); ws(); if (!eat(':') || m.containsKey(k)) throw Values.invalid();
                    m.put(k,value(depth+1)); ws(); if (eat('}')) return Collections.unmodifiableMap(m);
                } while (eat(',')); throw Values.invalid();
            }
            if (eat('[')) {
                List<Object> a=new ArrayList<>(); ws(); if (eat(']')) return Collections.unmodifiableList(a);
                do { a.add(value(depth+1)); ws(); if (eat(']')) return Collections.unmodifiableList(a); } while (eat(','));
                throw Values.invalid();
            }
            for (String literal : List.of("true","false","null")) if (s.startsWith(literal,pos)) {
                pos+=literal.length(); return literal.equals("null") ? null : literal.equals("true");
            }
            int start=pos; eat('-');
            if (!eat('0')) { if (pos>=s.length() || s.charAt(pos)<'1' || s.charAt(pos)>'9') throw Values.invalid(); digits(); }
            if (eat('.')) { int n=pos; digits(); if (pos==n) throw Values.invalid(); }
            if (eat('e') || eat('E')) { if (!eat('+')) eat('-'); int n=pos; digits(); if (pos==n) throw Values.invalid(); }
            if (pos-start>1024) throw Values.invalid();
            BigDecimal number=new BigDecimal(s.substring(start,pos)); if (!Double.isFinite(number.doubleValue())) throw Values.invalid(); return number;
        }
        void digits() { while (pos<s.length() && s.charAt(pos)>='0' && s.charAt(pos)<='9') pos++; }
        String string() {
            if (!eat('"')) throw Values.invalid(); StringBuilder b=new StringBuilder();
            while (pos<s.length()) {
                char c=s.charAt(pos++); if (c=='"') { String v=b.toString(); validateUnicode(v); return v; }
                if (c<32) throw Values.invalid();
                if (c!='\\') { b.append(c); continue; }
                if (pos>=s.length()) throw Values.invalid();
                c=s.charAt(pos++);
                switch(c) {
                    case '"','\\','/' -> b.append(c); case 'b' -> b.append('\b'); case 'f' -> b.append('\f');
                    case 'n' -> b.append('\n'); case 'r' -> b.append('\r'); case 't' -> b.append('\t');
                    case 'u' -> {
                        if (pos+4>s.length()) throw Values.invalid();
                        int n=0; for(int j=0;j<4;j++) { char digit=s.charAt(pos++); int h=digit<128 ? Character.digit(digit,16) : -1; if(h<0) throw Values.invalid(); n=n*16+h; }
                        b.append((char)n);
                    }
                    default -> throw Values.invalid();
                }
            }
            throw Values.invalid();
        }
        void validateUnicode(String v) {
            for(int i=0;i<v.length();i++) {
                char c=v.charAt(i);
                if(Character.isHighSurrogate(c)) { if(++i>=v.length() || !Character.isLowSurrogate(v.charAt(i))) throw Values.invalid(); }
                else if(Character.isLowSurrogate(c)) throw Values.invalid();
            }
        }
    }
}
