package dev.searchsdk.android

import java.net.URI
import java.time.OffsetDateTime
import java.util.Locale

internal object Protocol {
    private val identifier = Regex("[a-zA-Z0-9_-]{1,64}")
    private val domainLabel = Regex("[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?")
    private fun httpUri(value: String): URI {
        val uri = URI(value)
        val authority = uri.rawAuthority ?: throw IllegalArgumentException()
        if (authority.isEmpty() || '@' in authority || uri.rawUserInfo != null || uri.port > 65535 || uri.port < -1)
            throw IllegalArgumentException()
        if (uri.host == null) {
            // URI.host is null for Unicode DNS authorities. Validate their IDNA form without rewriting the public URL.
            if (authority.startsWith("[")) throw IllegalArgumentException()
            val colon = authority.lastIndexOf(':')
            val hostname = if (colon >= 0) authority.substring(0, colon) else authority
            val port = if (colon >= 0) authority.substring(colon + 1) else null
            if (port != null && (port.isEmpty() || !port.all { it in '0'..'9' } || port.toIntOrNull() !in 0..65535))
                throw IllegalArgumentException()
            val ascii = java.net.IDN.toASCII(hostname, java.net.IDN.USE_STD3_ASCII_RULES)
            if (ascii.isEmpty() || URI("https://$ascii").host.isNullOrEmpty()) throw IllegalArgumentException()
        }
        return uri
    }
    fun endpoint(value: String): URI = try {
        httpUri(value).also {
            if (!it.scheme.equals("https", true) || it.rawQuery != null || it.rawFragment != null || it.port == 0)
                throw IllegalArgumentException()
        }
    } catch (_: Exception) { throw SearchException(SearchErrorCode.CONFIGURATION) }
    fun request(input: SearchRequest, checkpoint: () -> Unit = {}): String {
        checkpoint()
        if (input.limit !in 1..20) invalidRequest()
        var blank = true
        // Invalid Unicode must not be silently replaced by the platform encoder.
        var i = 0
        while (i < input.query.length) {
            if (i and 1023 == 0) checkpoint()
            if (input.query[i] !in "\u0009\u000a\u000b\u000c\u000d\u0020\u00a0\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u2028\u2029\u202f\u205f\u3000\ufeff") blank = false
            if (input.query[i].isHighSurrogate()) { if (++i >= input.query.length || !input.query[i].isLowSurrogate()) invalidRequest() }
            else if (input.query[i].isLowSurrogate()) invalidRequest()
            i++
        }
        if (blank) invalidRequest()
        fun domains(values: List<String>?): List<String>? = values?.let {
            if (it.isEmpty()) invalidRequest()
            it.map { d -> checkpoint(); if (d.length > 253 || d.split('.').size < 2 || !d.split('.').all(domainLabel::matches)) invalidRequest()
                d.lowercase(Locale.ROOT) }.distinct()
        }
        val include = domains(input.includeDomains); val exclude = domains(input.excludeDomains)
        if (include?.any { exclude?.contains(it) == true } == true) invalidRequest()
        return buildString {
            append("{\"query\":${Json.quote(input.query, checkpoint)},\"limit\":${input.limit}")
            fun field(name: String, list: List<String>?) { if (list != null) append(",\"$name\":[${list.joinToString(",") { checkpoint(); Json.quote(it) }}]") }
            field("includeDomains", include); field("excludeDomains", exclude); append('}')
        }
    }
    private fun obj(v: Any?): Map<*, *> = v as? Map<*, *> ?: invalidResponse()
    private fun list(v: Any?): List<*> = v as? List<*> ?: invalidResponse()
    private fun str(v: Any?): String = v as? String ?: invalidResponse()
    private fun id(v: Any?): String = str(v).also { if (!identifier.matches(it)) invalidResponse() }
    private fun num(v: Any?): Double = (v as? Double)?.takeIf { it.isFinite() } ?: invalidResponse()
    private fun nonnegative(v: Any?): Double = num(v).also { if (it < 0) invalidResponse() }
    private fun status(v: Any?): Int = num(v).also { if (it % 1.0 != 0.0 || it !in 100.0..599.0) invalidResponse() }.toInt()
    private fun date(v: Any?): String = str(v).also { try { OffsetDateTime.parse(it) } catch (_: Exception) { invalidResponse() } }
    private fun url(v: Any?): String = str(v).also { s ->
        if (s.any { it.isWhitespace() || it.code < 32 || it.code in 127..159 || it == '\\' }) invalidResponse()
        try { val u = httpUri(s); if (u.scheme?.lowercase(Locale.ROOT) !in listOf("http", "https")) invalidResponse() }
        catch (_: Exception) { invalidResponse() }
    }
    private fun attempts(v: Any?, checkpoint: () -> Unit): List<SearchAttempt> = list(v).map { item -> checkpoint(); val a = obj(item)
        SearchAttempt(id(a["provider"]), date(a["startedAt"]), nonnegative(a["durationMs"]),
            when (a["outcome"]) { "success" -> AttemptOutcome.SUCCESS; "error" -> AttemptOutcome.ERROR; else -> invalidResponse() },
            a["code"]?.let { SearchErrorCode.parse(str(it)) }, a["status"]?.let(::status), a["retryAfterMs"]?.let(::nonnegative))
    }
    fun response(value: Any?, limit: Int, checkpoint: () -> Unit = {}): SearchResponse {
        val root = obj(value)
        val resultRows = list(root["results"])
        if (resultRows.size > limit) invalidResponse()
        val results = resultRows.map { row -> checkpoint(); val r = obj(row); val p = obj(r["provenance"])
            val requestId = p["requestId"]?.let(::str)?.also { if (!Regex("[a-zA-Z0-9_.:/-]{1,256}").matches(it)) invalidResponse() }
            SearchResult(url(r["url"]), Provenance(id(p["provider"]), url(p["sourceUrl"]), date(p["retrievedAt"]), requestId),
                r["title"]?.let(::str), r["snippet"]?.let(::str), r["highlights"]?.let { list(it).map { value -> checkpoint(); str(value) } }, r["score"]?.let(::num))
        }
        if (!root.containsKey("usage")) invalidResponse()
        val usage = root["usage"]?.let { val u = obj(it); SearchUsage(when (u["unit"]) {
            "usd" -> UsageUnit.USD; "credits" -> UsageUnit.CREDITS; else -> invalidResponse()
        }, nonnegative(u["value"])) }
        val warnings = list(root["warnings"]).map { row -> checkpoint(); val w = obj(row); SearchWarning(when (w["code"]) {
            "fallback_used" -> WarningCode.FALLBACK_USED; "provider_warning" -> WarningCode.PROVIDER_WARNING; else -> invalidResponse()
        }, id(w["provider"])) }
        return SearchResponse(id(root["provider"]), results, usage, warnings, attempts(root["attempts"], checkpoint), root["reuse"]?.let {
            when (it) { "cache" -> Reuse.CACHE; "inflight" -> Reuse.INFLIGHT; else -> invalidResponse() }
        })
    }
    fun failure(httpStatus: Int, value: Any?, checkpoint: () -> Unit): SearchException {
        try {
            val error = obj(obj(value)["error"])
            return SearchException(SearchErrorCode.parse(str(error["code"])), attempts(error["attempts"], checkpoint),
                error["status"]?.let(::status), error["retryAfterMs"]?.let(::nonnegative))
        } catch (e: SearchException) {
            if (e.code == SearchErrorCode.TIMEOUT) throw e
            return SearchException(when (httpStatus) {
                401, 402, 403, 432, 433 -> SearchErrorCode.AUTH
                429 -> SearchErrorCode.RATE_LIMIT
                408, in 500..599 -> SearchErrorCode.UNAVAILABLE
                else -> SearchErrorCode.PROVIDER_ERROR
            }, status = httpStatus)
        }
    }
}
