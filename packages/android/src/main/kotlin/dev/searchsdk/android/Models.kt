package dev.searchsdk.android

/** Only normalized gateway search is supported. Provider keys and native operations belong on the server. */
data class SearchRequest(
    val query: String,
    val limit: Int = 5,
    val includeDomains: List<String>? = null,
    val excludeDomains: List<String>? = null,
) {
    override fun toString(): String = "SearchRequest(<redacted>)"
}

enum class SearchErrorCode(val wire: String) {
    INVALID_REQUEST("invalid_request"), UNSUPPORTED_OPTION("unsupported_option"), CONFIGURATION("configuration"),
    AUTH("auth"), RATE_LIMIT("rate_limit"), NETWORK("network"), UNAVAILABLE("unavailable"),
    ATTEMPT_TIMEOUT("attempt_timeout"), TIMEOUT("timeout"), ABORTED("aborted"),
    INVALID_RESPONSE("invalid_response"), PROVIDER_ERROR("provider_error");
    companion object { internal fun parse(wire: String) = entries.firstOrNull { it.wire == wire } ?: invalidResponse() }
}

/** Contains only sanitized, validated metadata; never retains a transport exception as its cause. */
class SearchException(
    val code: SearchErrorCode,
    val attempts: List<SearchAttempt> = emptyList(),
    val status: Int? = null,
    val retryAfterMs: Double? = null,
) : Exception("Search failed: ${code.wire}.")

data class SearchAttempt(val provider: String, val startedAt: String, val durationMs: Double,
    val outcome: AttemptOutcome, val code: SearchErrorCode? = null, val status: Int? = null,
    val retryAfterMs: Double? = null)
enum class AttemptOutcome { SUCCESS, ERROR }
data class Provenance(val provider: String, val sourceUrl: String, val retrievedAt: String, val requestId: String? = null)
data class SearchResult(val url: String, val provenance: Provenance, val title: String? = null,
    val snippet: String? = null, val highlights: List<String>? = null, val score: Double? = null)
enum class UsageUnit { USD, CREDITS }
data class SearchUsage(val unit: UsageUnit, val value: Double)
enum class WarningCode { FALLBACK_USED, PROVIDER_WARNING }
data class SearchWarning(val code: WarningCode, val provider: String)
enum class Reuse { CACHE, INFLIGHT }
data class SearchResponse(val provider: String, val results: List<SearchResult>, val usage: SearchUsage?,
    val warnings: List<SearchWarning>, val attempts: List<SearchAttempt>, val reuse: Reuse? = null)
sealed class BatchOutcome {
    abstract val index: Int
    data class Success(override val index: Int, val value: SearchResponse) : BatchOutcome()
    data class Failure(override val index: Int, val error: SearchException) : BatchOutcome()
}
internal fun invalidResponse(): Nothing = throw SearchException(SearchErrorCode.INVALID_RESPONSE)
internal fun invalidRequest(): Nothing = throw SearchException(SearchErrorCode.INVALID_REQUEST)
