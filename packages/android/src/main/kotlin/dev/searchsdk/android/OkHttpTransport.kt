package dev.searchsdk.android

import java.io.ByteArrayOutputStream
import java.io.Closeable
import java.io.InputStream
import java.net.Proxy
import java.net.SocketTimeoutException
import java.net.URI
import java.util.concurrent.ArrayBlockingQueue
import java.util.concurrent.ThreadPoolExecutor
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.atomic.AtomicReference
import java.util.zip.GZIPInputStream
import kotlinx.coroutines.suspendCancellableCoroutine
import okhttp3.Authenticator
import okhttp3.Call
import okhttp3.ConnectionPool
import okhttp3.CookieJar
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody
import okio.BufferedSink

/** Owns an isolated HTTP client: no global cookies, authenticators, proxies, cache, redirects or retries. */
class OkHttpTransport internal constructor(
    workers: Int,
    private val target: (URI) -> URI,
) : GatewayTransport, Closeable {
    constructor(workers: Int = 4) : this(workers, { it })
    private val executor: ThreadPoolExecutor
    private val http = OkHttpClient.Builder()
        .cookieJar(CookieJar.NO_COOKIES)
        .authenticator(Authenticator.NONE)
        .proxyAuthenticator(Authenticator.NONE)
        .proxy(Proxy.NO_PROXY)
        .cache(null)
        .followRedirects(false)
        .followSslRedirects(false)
        .retryOnConnectionFailure(false)
        .connectionPool(ConnectionPool(0, 1, TimeUnit.NANOSECONDS))
        .build()
    private val active = java.util.concurrent.ConcurrentHashMap.newKeySet<() -> Unit>()
    private val closed = AtomicBoolean(false)
    init {
        if (workers !in 1..64) throw SearchException(SearchErrorCode.CONFIGURATION)
        executor = ThreadPoolExecutor(workers, workers, 30, TimeUnit.SECONDS, ArrayBlockingQueue(workers * 2),
            { runnable -> Thread(runnable, "searchsdk-http").apply { isDaemon = true } }).apply { allowCoreThreadTimeOut(true) }
    }
    override suspend fun exchange(request: GatewayRequest): GatewayResponse = suspendCancellableCoroutine { continuation ->
        val call = AtomicReference<Call?>()
        val future = AtomicReference<java.util.concurrent.Future<*>?>()
        val stopped = AtomicBoolean(false)
        val completed = AtomicBoolean(false)
        fun finish(result: Result<GatewayResponse>) {
            if (completed.compareAndSet(false, true)) continuation.resumeWith(result)
        }
        fun stop() {
            stopped.set(true)
            call.get()?.cancel() // Closes the exchange socket without draining its response body.
            future.get()?.let { it.cancel(true); if (it is Runnable) executor.remove(it) }
        }
        val closeCall: () -> Unit = { stop(); finish(Result.failure(SearchException(SearchErrorCode.UNAVAILABLE))) }
        active.add(closeCall)
        continuation.invokeOnCancellation { completed.set(true); stop(); active.remove(closeCall) }
        if (closed.get()) { active.remove(closeCall); closeCall(); return@suspendCancellableCoroutine }
        try {
            val task = executor.submit {
                try {
                    if (stopped.get()) return@submit
                    val payload = request.json.toByteArray(Charsets.UTF_8)
                    val body = object : RequestBody() {
                        override fun contentType() = "application/json".toMediaType()
                        override fun contentLength() = payload.size.toLong()
                        // Prevent status-driven followups (including 503 Retry-After: 0), as well as replay after I/O failure.
                        override fun isOneShot() = true
                        override fun writeTo(sink: BufferedSink) { sink.write(payload) }
                    }
                    val builder = Request.Builder().url(target(request.endpoint).toString()).post(body)
                        .header("Accept", "application/json").header("Accept-Encoding", "gzip")
                    request.bearerToken?.let { builder.header("Authorization", "Bearer $it") }
                    val pending = http.newCall(builder.build())
                    pending.timeout().timeout(request.timeoutMs, TimeUnit.MILLISECONDS)
                    call.set(pending)
                    if (stopped.get()) { pending.cancel(); return@submit }
                    pending.execute().use { response ->
                        val bytes = if (response.code in 300..399) ByteArray(0) else {
                            val raw = response.body.byteStream()
                            val decoded: InputStream = when (response.header("Content-Encoding")?.lowercase(java.util.Locale.ROOT)) {
                                null, "", "identity" -> raw
                                "gzip" -> GZIPInputStream(raw)
                                else -> invalidResponse()
                            }
                            val output = ByteArrayOutputStream(minOf(request.maxResponseBytes, 8192))
                            val buffer = ByteArray(8192)
                            while (true) {
                                if (stopped.get()) return@submit
                                // Read at most one byte beyond the ceiling; do not consume an unbounded stream.
                                val remaining = request.maxResponseBytes - output.size()
                                val count = decoded.read(buffer, 0, minOf(buffer.size, remaining + 1))
                                if (count == -1) break
                                if (count > remaining) invalidResponse()
                                output.write(buffer, 0, count)
                            }
                            output.toByteArray()
                        }
                        val versions = response.headers.values("X-SearchSDK-Protocol")
                        finish(Result.success(GatewayResponse(response.code, bytes, if (versions.size > 1) "invalid" else versions.singleOrNull())))
                    }
                } catch (error: Exception) {
                    val sanitized = when (error) {
                        is SearchException -> error
                        is java.util.zip.ZipException, is java.io.EOFException -> SearchException(SearchErrorCode.INVALID_RESPONSE)
                        is SocketTimeoutException, is java.io.InterruptedIOException -> SearchException(SearchErrorCode.TIMEOUT)
                        else -> SearchException(SearchErrorCode.NETWORK)
                    }
                    finish(Result.failure(sanitized))
                } finally { call.getAndSet(null)?.cancel(); active.remove(closeCall) }
            }
            future.set(task)
            if (stopped.get()) { task.cancel(true); executor.remove(task as Runnable) }
        } catch (_: Exception) { active.remove(closeCall); finish(Result.failure(SearchException(SearchErrorCode.UNAVAILABLE))) }
    }
    override fun close() {
        if (closed.compareAndSet(false, true)) {
            active.toList().forEach { it() }
            executor.shutdownNow()
            http.dispatcher.executorService.shutdown()
            http.connectionPool.evictAll()
        }
    }
}
