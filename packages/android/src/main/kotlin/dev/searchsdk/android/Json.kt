package dev.searchsdk.android

import java.nio.ByteBuffer
import java.nio.charset.CodingErrorAction

/** Small strict JSON codec: bounded nesting, duplicate-key rejection, strict UTF-8 and finite numbers. */
internal object Json {
    fun decode(bytes: ByteArray, checkpoint: () -> Unit): Any? {
        val text = try { Charsets.UTF_8.newDecoder().onMalformedInput(CodingErrorAction.REPORT)
            .onUnmappableCharacter(CodingErrorAction.REPORT).decode(ByteBuffer.wrap(bytes)).toString() }
            catch (_: Exception) { invalidResponse() }
        return Parser(text, checkpoint).parse()
    }
    fun quote(text: String): String = quote(text) {}
    fun quote(text: String, checkpoint: () -> Unit): String = buildString {
        append('"')
        text.forEachIndexed { index, c -> if (index and 1023 == 0) checkpoint(); when (c) {
            '"' -> append("\\\""); '\\' -> append("\\\\"); '\n' -> append("\\n"); '\r' -> append("\\r"); '\t' -> append("\\t")
            else -> if (c < ' ' || c.isSurrogate()) append("\\u" + c.code.toString(16).padStart(4, '0')) else append(c)
        } }
        append('"')
    }
    private class Parser(val text: String, val checkpoint: () -> Unit) {
        var i = 0
        fun check() { if (i and 1023 == 0) checkpoint() }
        fun white() { while (i < text.length && text[i] in " \r\n\t") { i++; check() } }
        fun parse(): Any? { checkpoint(); val v = value(0); white(); if (i != text.length) invalidResponse(); checkpoint(); return v }
        fun value(depth: Int): Any? {
            if (depth > 64) invalidResponse()
            white(); check(); if (i >= text.length) invalidResponse()
            return when (text[i]) {
                '{' -> {
                    i++; white(); val m = linkedMapOf<String, Any?>()
                    if (take('}')) m else {
                        do { white(); if (i >= text.length || text[i] != '"') invalidResponse()
                            val k = string(); white(); if (!take(':') || m.containsKey(k)) invalidResponse()
                            m[k] = value(depth + 1); white()
                        } while (take(','))
                        if (!take('}')) invalidResponse(); m
                    }
                }
                '[' -> {
                    i++; white(); val list = arrayListOf<Any?>()
                    if (take(']')) list else {
                        do { list.add(value(depth + 1)); white() } while (take(','))
                        if (!take(']')) invalidResponse(); list
                    }
                }
                '"' -> string()
                't' -> literal("true", true)
                'f' -> literal("false", false)
                'n' -> literal("null", null)
                else -> number()
            }
        }
        fun take(c: Char): Boolean { if (i < text.length && text[i] == c) { i++; return true }; return false }
        fun literal(s: String, v: Any?): Any? { if (!text.startsWith(s, i)) invalidResponse(); i += s.length; return v }
        fun string(): String {
            i++; val out = StringBuilder()
            while (i < text.length) {
                check(); val c = text[i++]
                if (c == '"') {
                    val result = out.toString()
                    var p = 0
                    while (p < result.length) {
                        if (result[p].isHighSurrogate()) { if (++p >= result.length || !result[p].isLowSurrogate()) invalidResponse() }
                        else if (result[p].isLowSurrogate()) invalidResponse()
                        p++
                    }
                    return result
                }
                if (c < ' ') invalidResponse()
                if (c != '\\') { out.append(c); continue }
                if (i >= text.length) invalidResponse()
                out.append(when (val escape = text[i++]) {
                    '"', '\\', '/' -> escape
                    'b' -> '\b'; 'f' -> '\u000c'; 'n' -> '\n'; 'r' -> '\r'; 't' -> '\t'
                    'u' -> {
                        if (i + 4 > text.length) invalidResponse()
                        val hex = text.substring(i, i + 4)
                        if (!hex.all { it in '0'..'9' || it in 'a'..'f' || it in 'A'..'F' }) invalidResponse()
                        i += 4; hex.toInt(16).toChar()
                    }
                    else -> invalidResponse()
                })
            }
            invalidResponse()
        }
        fun number(): Double {
            val start = i
            take('-')
            if (!take('0')) { if (i >= text.length || text[i] !in '1'..'9') invalidResponse(); while (i < text.length && text[i].isDigit()) { i++; check() } }
            if (take('.')) { val p = i; while (i < text.length && text[i] in '0'..'9') { i++; check() }; if (i == p) invalidResponse() }
            if (take('e') || take('E')) { if (!take('+')) take('-'); val p = i
                while (i < text.length && text[i] in '0'..'9') { i++; check() }; if (i == p) invalidResponse() }
            return text.substring(start, i).toDoubleOrNull()?.takeIf { it.isFinite() } ?: invalidResponse()
        }
    }
}
