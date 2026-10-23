package dev.searchsdk.android

import java.io.Closeable
import java.util.concurrent.atomic.AtomicBoolean
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.currentCoroutineContext
import kotlinx.coroutines.ensureActive
import kotlinx.coroutines.sync.Semaphore
import kotlinx.coroutines.sync.withPermit
import kotlinx.coroutines.withContext
import kotlinx.coroutines.withTimeoutOrNull

/** Protocol v1 client. No retries, provider execution, key storage, cache, or implicit fallback. */
class SearchClient(
    endpoint: String,
    private val accessToken: suspend () -> String? = { null },
    val timeoutMs: Long = 10_000,
    val maxResponseBytes: Int = 10 * 1024 * 1024,
    maxConcurrency: Int = 4,
    transport: GatewayTransport? = null,
) : Closeable {
    private val endpoint = Protocol.endpoint(endpoint)
    private val closed = AtomicBoolean(false)
    private val gate: Semaphore
    private val ownedTransport: OkHttpTransport?
    private val transport: GatewayTransport
    init {
        if (timeoutMs !in 1..Int.MAX_VALUE.toLong() || maxResponseBytes !in 1..100 * 1024 * 1024 || maxConcurrency !in 1..64)
            throw SearchException(SearchErrorCode.CONFIGURATION)
        gate = Semaphore(maxConcurrency)
        ownedTransport = if (transport == null) OkHttpTransport(maxConcurrency) else null
        this.transport = transport ?: ownedTransport!!
    }
    suspend fun search(request: SearchRequest): SearchResponse {
        checkOpen()
        val deadline = System.nanoTime() + timeoutMs * 1_000_000
        return bounded {
            val json = withContext(Dispatchers.Default) {
                val context = currentCoroutineContext()
                Protocol.request(request) { context.ensureActive(); checkDeadline(deadline) }
            }
            execute(json, request.limit, deadline)
        } ?: throw SearchException(SearchErrorCode.TIMEOUT)
    }
    private suspend fun execute(json: String, limit: Int, deadline: Long): SearchResponse {
        return gate.withPermit {
            checkOpen()
            checkDeadline(deadline)
            val token = try { accessToken() } catch (_: CancellationException) { throw CancellationException("Search cancelled.") }
                catch (_: Exception) { throw SearchException(SearchErrorCode.AUTH) }
            if (token != null && (token.isEmpty() || token.any { it.code !in 33..126 })) throw SearchException(SearchErrorCode.AUTH)
            currentCoroutineContext().ensureActive()
            val remaining = ((deadline - System.nanoTime()) / 1_000_000).coerceAtLeast(1)
            val raw = try { transport.exchange(GatewayRequest(endpoint, json, token, remaining, maxResponseBytes)) }
                catch (e: SearchException) { throw e }
                catch (_: CancellationException) { throw CancellationException("Search cancelled.") }
                catch (_: Exception) { throw SearchException(SearchErrorCode.NETWORK) }
            withContext(Dispatchers.Default) {
                val context = currentCoroutineContext()
                fun checkpoint() { context.ensureActive(); if (System.nanoTime() >= deadline) throw SearchException(SearchErrorCode.TIMEOUT) }
                checkpoint()
                if (raw.status !in 100..599 || raw.body.size > maxResponseBytes || (raw.protocolVersion != null && raw.protocolVersion != "1")) invalidResponse()
                val value = try { Json.decode(raw.body, ::checkpoint) } catch (e: SearchException) {
                    if (e.code == SearchErrorCode.TIMEOUT || raw.status == 200) throw e else null
                }
                val result = if (raw.status == 200) Protocol.response(value, limit, ::checkpoint) else {
                    if (raw.status in 200..299) invalidResponse()
                    throw Protocol.failure(raw.status, value, ::checkpoint)
                }
                checkpoint(); result
            }
        }
    }
    private suspend fun <T> bounded(block: suspend () -> T): T? = try {
        withTimeoutOrNull(timeoutMs) { block() }
    } catch (_: CancellationException) { throw CancellationException("Search cancelled.") }

    /** Whole-batch deadline includes queued items. External coroutine cancellation cancels the batch. */
    suspend fun searchBatch(requests: List<SearchRequest>, concurrency: Int = 4, timeoutMs: Long = this.timeoutMs): List<BatchOutcome> {
        checkOpen()
        if (requests.size > 1000 || concurrency !in 1..64 || timeoutMs !in 1..Int.MAX_VALUE.toLong()) invalidRequest()
        val deadline = System.nanoTime() + timeoutMs * 1_000_000
        // Copy caller-owned lists before the first suspension, including queued domain filters.
        val inputs = requests.map { it.copy(includeDomains = it.includeDomains?.toList(), excludeDomains = it.excludeDomains?.toList()) }
        val outcomes = arrayOfNulls<BatchOutcome>(inputs.size)
        val workers = Semaphore(concurrency)
        try {
            withTimeoutOrNull(timeoutMs) {
                val snapshots = withContext(Dispatchers.Default) {
                    val context = currentCoroutineContext()
                    inputs.map { r ->
                        try { Result.success(Protocol.request(r) { context.ensureActive(); checkDeadline(deadline) } to r.limit) }
                        catch (e: SearchException) { Result.failure<Pair<String, Int>>(e) }
                    }
                }
                coroutineScope {
                    snapshots.mapIndexed { index, snapshot -> async {
                        workers.withPermit {
                            outcomes[index] = try {
                                val (json, limit) = snapshot.getOrThrow()
                                val itemDeadline = minOf(deadline, System.nanoTime() + this@SearchClient.timeoutMs * 1_000_000)
                                val response = bounded { execute(json, limit, itemDeadline) } ?: throw SearchException(SearchErrorCode.TIMEOUT)
                                BatchOutcome.Success(index, response)
                            } catch (e: SearchException) { BatchOutcome.Failure(index, e) }
                        }
                    } }.awaitAll()
                }
            }
        } catch (_: CancellationException) { throw CancellationException("Search cancelled.") }
        return outcomes.mapIndexed { index, outcome -> outcome ?: BatchOutcome.Failure(index, SearchException(SearchErrorCode.TIMEOUT)) }
    }
    private fun checkDeadline(deadline: Long) { if (System.nanoTime() >= deadline) throw SearchException(SearchErrorCode.TIMEOUT) }
    private fun checkOpen() { if (closed.get()) throw SearchException(SearchErrorCode.CONFIGURATION) }
    /** Closes only the owned default transport. Application-supplied transports remain application-owned. */
    override fun close() { if (closed.compareAndSet(false, true)) ownedTransport?.close() }
}
