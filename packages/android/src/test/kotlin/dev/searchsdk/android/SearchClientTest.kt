package dev.searchsdk.android

import java.io.ByteArrayOutputStream
import java.net.InetAddress
import java.net.ServerSocket
import java.net.Socket
import java.net.URI
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicInteger
import java.util.zip.GZIPOutputStream
import kotlinx.coroutines.*
import org.junit.Assert.*
import org.junit.Test

class SearchClientTest {
    private val good = """{"provider":"fixture","results":[{"url":"https://example.com/","title":"Example","snippet":"Fixture","highlights":["x"],"score":0.5,"provenance":{"provider":"fixture","sourceUrl":"https://example.com/","retrievedAt":"2026-10-22T12:00:00Z","requestId":"req-1"}}],"usage":null,"warnings":[],"attempts":[{"provider":"fixture","startedAt":"2026-10-22T12:00:00Z","durationMs":1,"outcome":"success"}]}"""
    private val endpoint = "https://gateway.example/search"
    private fun response(body: String = good, status: Int = 200, protocol: String? = "1") = GatewayResponse(status, body.toByteArray(), protocol)
    private fun client(body: String = good, status: Int = 200, protocol: String? = "1") = SearchClient(endpoint, transport = GatewayTransport { response(body, status, protocol) })
    private suspend fun expect(code: SearchErrorCode, block: suspend () -> Unit): SearchException {
        try { block(); fail("Expected $code") } catch (error: SearchException) { assertEquals(code, error.code); return error }
        error("unreachable")
    }
    @Test fun normalizedRequestAndTypedResponse() = runBlocking<Unit> {
        var calls = 0
        val sdk = SearchClient(endpoint, accessToken = { "application-${++calls}" }, transport = GatewayTransport { r ->
            assertEquals(URI(endpoint), r.endpoint)
            assertEquals("application-$calls", r.bearerToken)
            assertEquals("""{"query":"hello\nworld","limit":5,"includeDomains":["example.com"]}""", r.json)
            assertFalse(r.toString().contains("application-")); assertFalse(r.toString().contains("hello"))
            response()
        })
        repeat(2) {
            val result = sdk.search(SearchRequest("hello\nworld", includeDomains = listOf("EXAMPLE.com", "example.com")))
            assertEquals("fixture", result.provider); assertNull(result.usage); assertEquals("req-1", result.results.single().provenance.requestId)
            assertEquals(0.5, result.results.single().score!!, 0.0)
        }
        assertEquals(2, calls)
    }
    @Test fun urlsSupportCaseInsensitiveSchemesAndInternationalDnsNames() = runBlocking<Unit> {
        SearchClient("HTTPS://bücher.example/search", transport = GatewayTransport { response() }).search(SearchRequest("x"))
        val international = good.replace("https://example.com/", "https://bücher.example/über")
        assertEquals("https://bücher.example/über", client(international).search(SearchRequest("x")).results.single().url)
        expect(SearchErrorCode.CONFIGURATION) { SearchClient("https://secret@bücher.example/") }
        expect(SearchErrorCode.CONFIGURATION) { SearchClient("https://bücher.example:99999/") }
        expect(SearchErrorCode.INVALID_RESPONSE) { client(good.replace("https://example.com/", "https://secret@bücher.example/")).search(SearchRequest("x")) }
    }
    @Test fun configurationRejectsUnsafeEndpointsAndBounds() = runBlocking<Unit> {
        for (url in listOf("http://example.com", "https://u:p@example.com", "https://example.com?", "https://example.com#", "https://", "file:///tmp/a", "https://example.com:99999", "https://example.com:0"))
            expect(SearchErrorCode.CONFIGURATION) { SearchClient(url) }
        expect(SearchErrorCode.CONFIGURATION) { SearchClient(endpoint, timeoutMs = 0) }
        expect(SearchErrorCode.CONFIGURATION) { SearchClient(endpoint, maxConcurrency = 65) }
        expect(SearchErrorCode.CONFIGURATION) { SearchClient(endpoint, maxResponseBytes = 0) }
    }
    @Test fun requestValidationPreventsDispatch() = runBlocking<Unit> {
        var count = 0
        val sdk = SearchClient(endpoint, transport = GatewayTransport { count++; response() })
        for (request in listOf(SearchRequest(" "), SearchRequest("\ufeff"), SearchRequest("x", 0), SearchRequest("x", 21),
            SearchRequest("x", includeDomains = emptyList()), SearchRequest("x", includeDomains = listOf("localhost")),
            SearchRequest("x", includeDomains = listOf("a.com/path")), SearchRequest("x", includeDomains = listOf("*.a.com")),
            SearchRequest("x", includeDomains = listOf("é.com")), SearchRequest("x", includeDomains = listOf("A.COM"), excludeDomains = listOf("a.com")),
            SearchRequest("\ud800"))) expect(SearchErrorCode.INVALID_REQUEST) { sdk.search(request) }
        assertEquals(0, count)
        assertFalse(SearchRequest("private query").toString().contains("private"))
    }
    @Test fun validatesEveryConsumedResponseField() = runBlocking<Unit> {
        val malformed = listOf(
            good.replace("\"provider\":\"fixture\"", "\"provider\":\"unsafe provider\""),
            good.replace("https://example.com/", "https://user:secret@example.com/"),
            good.replace("https://example.com/", "javascript:alert(1)"),
            good.replace("https://example.com/", "https://example.com/\\\\x"),
            good.replace("2026-10-22T12:00:00Z", "private date"),
            good.replace("\"score\":0.5", "\"score\":1e999"),
            good.replace("\"score\":0.5", "\"score\":\"bad\""),
            good.replace("\"highlights\":[\"x\"]", "\"highlights\":[5]"),
            good.replace("\"requestId\":\"req-1\"", "\"requestId\":\"private token!\""),
            good.replace("\"usage\":null", "\"usage\":{\"unit\":\"usd\",\"value\":-1}"),
            good.replace("\"usage\":null", "\"usage\":{\"unit\":\"watts\",\"value\":1}"),
            good.replace("\"usage\":null,", ""),
            good.replace("\"warnings\":[]", "\"warnings\":[{\"code\":\"secret\",\"provider\":\"fixture\"}]"),
            good.replace("\"durationMs\":1", "\"durationMs\":-1"),
            good.replace("\"outcome\":\"success\"", "\"outcome\":\"other\""),
            good.replace("\"outcome\":\"success\"", "\"outcome\":\"error\",\"code\":\"mystery\""),
            good.replace("\"outcome\":\"success\"", "\"outcome\":\"error\",\"status\":200.5"),
            good.replace("\"outcome\":\"success\"", "\"outcome\":\"error\",\"retryAfterMs\":-1"),
            good.dropLast(1) + ",\"reuse\":\"other\"}",
            good.replace("\"provider\":\"fixture\",\"results\"", "\"provider\":\"fixture\",\"provider\":\"fixture\",\"results\""),
            good + " trailing", good.replace("Example", "\\ud800"), "[]", "null", "{", "{\"x\":" + "[".repeat(65) + "0" + "]".repeat(65) + "}")
        for ((index, body) in malformed.withIndex()) {
            try { expect(SearchErrorCode.INVALID_RESPONSE) { client(body).search(SearchRequest("x")) } }
            catch (e: AssertionError) { throw AssertionError("Malformed case $index", e) }
        }
    }
    @Test fun supportedUsageWarningsReuseAndAttempts() = runBlocking<Unit> {
        val body = good.replace("\"usage\":null", "\"usage\":{\"unit\":\"credits\",\"value\":0.25}")
            .replace("\"warnings\":[]", "\"warnings\":[{\"code\":\"fallback_used\",\"provider\":\"fixture\"}]")
            .dropLast(1) + ",\"reuse\":\"inflight\"}"
        val result = client(body).search(SearchRequest("x"))
        assertEquals(Reuse.INFLIGHT, result.reuse); assertEquals(UsageUnit.CREDITS, result.usage!!.unit)
        assertEquals(WarningCode.FALLBACK_USED, result.warnings.single().code)
    }
    @Test fun malformedUtf8AndSuccessfulStatuses() = runBlocking<Unit> {
        val sdk = SearchClient(endpoint, transport = GatewayTransport { GatewayResponse(200, byteArrayOf(0xc3.toByte(), 0x28)) })
        expect(SearchErrorCode.INVALID_RESPONSE) { sdk.search(SearchRequest("x")) }
        for (status in listOf(201, 204, 99, 600)) expect(SearchErrorCode.INVALID_RESPONSE) { client(status = status).search(SearchRequest("x")) }
        expect(SearchErrorCode.INVALID_RESPONSE) { client(protocol = "2").search(SearchRequest("x")) }
        client(protocol = null).search(SearchRequest("x"))
    }
    @Test fun errorsAreSanitizedAndMappedWithoutRetry() = runBlocking<Unit> {
        val groups = mapOf(SearchErrorCode.AUTH to listOf(401,402,403,432,433), SearchErrorCode.RATE_LIMIT to listOf(429),
            SearchErrorCode.UNAVAILABLE to listOf(408,500,503,599), SearchErrorCode.PROVIDER_ERROR to listOf(400,404,302))
        for ((code, statuses) in groups) for (status in statuses) {
            val e = expect(code) { client("private-query SECRET credential", status).search(SearchRequest("private-query")) }
            assertEquals(status, e.status); assertNull(e.cause); assertFalse(e.toString().contains("SECRET"))
        }
        val e = expect(SearchErrorCode.RATE_LIMIT) { client("""{"error":{"code":"rate_limit","attempts":[],"status":429,"retryAfterMs":1500,"message":"SECRET"}}""", 503).search(SearchRequest("x")) }
        assertEquals(1500.0, e.retryAfterMs!!, 0.0); assertEquals(429, e.status)
        expect(SearchErrorCode.UNAVAILABLE) { client("""{"error":{"code":"auth","attempts":[],"retryAfterMs":-1}}""", 503).search(SearchRequest("x")) }
        var calls = 0
        val sdk = SearchClient(endpoint, transport = GatewayTransport { calls++; throw IllegalStateException("SECRET") })
        val failure = expect(SearchErrorCode.NETWORK) { sdk.search(SearchRequest("private-query")) }
        assertEquals(1, calls); assertNull(failure.cause); assertFalse(failure.stackTraceToString().contains("SECRET"))
    }
    @Test fun tokenFailureAndHeaderInjectionNeverDispatch() = runBlocking<Unit> {
        var dispatch = 0
        val transport = GatewayTransport { dispatch++; response() }
        for (token in listOf("", "secret\r\nX: y", "has space", "é")) {
            expect(SearchErrorCode.AUTH) { SearchClient(endpoint, accessToken = { token }, transport = transport).search(SearchRequest("x")) }
        }
        val error = expect(SearchErrorCode.AUTH) { SearchClient(endpoint, accessToken = { throw Exception("SECRET") }, transport = transport).search(SearchRequest("x")) }
        assertFalse(error.stackTraceToString().contains("SECRET")); assertEquals(0, dispatch)
    }
    @Test fun deadlineIncludesTokenAndSemaphoreWait() = runBlocking<Unit> {
        var count = 0
        val sdk = SearchClient(endpoint, timeoutMs = 40, accessToken = { delay(300); "x" }, transport = GatewayTransport { count++; response() })
        expect(SearchErrorCode.TIMEOUT) { sdk.search(SearchRequest("x")) }; assertEquals(0, count)
        val entered = CompletableDeferred<Unit>(); val release = CompletableDeferred<Unit>()
        val gate = SearchClient(endpoint, timeoutMs = 100, maxConcurrency = 1, transport = GatewayTransport { entered.complete(Unit); release.await(); response() })
        val first = async { expect(SearchErrorCode.TIMEOUT) { gate.search(SearchRequest("first")) } }
        entered.await(); expect(SearchErrorCode.TIMEOUT) { gate.search(SearchRequest("queued")) }; first.await()
    }
    @Test fun coroutineCancellationPropagatesAndCancelsTransport() = runBlocking<Unit> {
        val started = CompletableDeferred<Unit>(); val stopped = CompletableDeferred<Unit>()
        val sdk = SearchClient(endpoint, transport = GatewayTransport { started.complete(Unit); try { awaitCancellation() } finally { stopped.complete(Unit) } })
        val call = launch { sdk.search(SearchRequest("x")) }; started.await(); call.cancelAndJoin(); withTimeout(1000) { stopped.await() }
        var sent = false
        val never = SearchClient(endpoint, transport = GatewayTransport { sent = true; response() })
        val pre = launch(start = CoroutineStart.LAZY) { never.search(SearchRequest("x")) }; pre.cancel(); pre.join(); assertFalse(sent)
    }
    @Test fun bytesAndResultLimitsAreEnforced() = runBlocking<Unit> {
        val bytes = good.toByteArray().size
        SearchClient(endpoint, maxResponseBytes = bytes, transport = GatewayTransport { response() }).search(SearchRequest("x"))
        expect(SearchErrorCode.INVALID_RESPONSE) { SearchClient(endpoint, maxResponseBytes = bytes - 1, transport = GatewayTransport { response() }).search(SearchRequest("x")) }
        val row = good.substringAfter("\"results\":[").substringBefore("],\"usage\"")
        val tooMany = good.replace("\"results\":[$row]", "\"results\":[$row,$row]")
        expect(SearchErrorCode.INVALID_RESPONSE) { client(tooMany).search(SearchRequest("x", 1)) }
    }
    @Test fun batchIsBoundedOrderedAndPreservesSiblings() = runBlocking<Unit> {
        val active = AtomicInteger(); val peak = AtomicInteger()
        val sdk = SearchClient(endpoint, maxConcurrency = 2, transport = GatewayTransport { r ->
            peak.accumulateAndGet(active.incrementAndGet(), ::maxOf)
            try { delay(if (r.json.contains("slow")) 50 else 5); if (r.json.contains("fail")) throw Exception("SECRET"); response() }
            finally { active.decrementAndGet() }
        })
        val results = sdk.searchBatch(listOf("slow", "fast", "fail", " ", "last").map(::SearchRequest), 4)
        assertEquals((0..4).toList(), results.map { it.index }); assertEquals(2, peak.get())
        assertTrue(results[0] is BatchOutcome.Success); assertTrue(results[4] is BatchOutcome.Success)
        assertEquals(SearchErrorCode.NETWORK, (results[2] as BatchOutcome.Failure).error.code)
        assertEquals(SearchErrorCode.INVALID_REQUEST, (results[3] as BatchOutcome.Failure).error.code)
        expect(SearchErrorCode.INVALID_REQUEST) { sdk.searchBatch(emptyList(), 0) }
        expect(SearchErrorCode.INVALID_REQUEST) { sdk.searchBatch(List(1001) { SearchRequest("x") }) }
        assertTrue(sdk.searchBatch(emptyList()).isEmpty())
    }
    @Test fun batchDeadlineKeepsCompletedAndExpiresQueued() = runBlocking<Unit> {
        var calls = 0
        val sdk = SearchClient(endpoint, transport = GatewayTransport { if (++calls > 1) delay(1000); response() })
        val results = sdk.searchBatch(List(4) { SearchRequest("x") }, concurrency = 1, timeoutMs = 70)
        assertTrue(results[0] is BatchOutcome.Success); assertEquals(2, calls)
        assertTrue(results.drop(1).all { (it as BatchOutcome.Failure).error.code == SearchErrorCode.TIMEOUT })
    }
    @Test fun batchSnapshotsAndCancellation() = runBlocking<Unit> {
        val started = CompletableDeferred<Unit>(); val release = CompletableDeferred<Unit>(); val seen = arrayListOf<String>()
        val sdk = SearchClient(endpoint, transport = GatewayTransport { r -> seen.add(r.json); if (seen.size == 1) { started.complete(Unit); release.await() }; response() })
        val domains = mutableListOf("original.com"); val inputs = mutableListOf(SearchRequest("first"), SearchRequest("second", includeDomains = domains))
        val batch = async { sdk.searchBatch(inputs, 1) }; started.await(); domains[0] = "changed.com"; inputs.add(SearchRequest("extra")); release.complete(Unit)
        assertEquals(2, batch.await().size); assertTrue(seen[1].contains("original.com"))
        val hanging = SearchClient(endpoint, transport = GatewayTransport { awaitCancellation() })
        val job = launch { hanging.searchBatch(List(10) { SearchRequest("x") }, 2) }; delay(20); job.cancelAndJoin()
    }
    @Test fun closedClientRejectsWorkAndInjectedTransportIsNotClosed() = runBlocking<Unit> {
        val sdk = client(); sdk.close(); sdk.close()
        expect(SearchErrorCode.CONFIGURATION) { sdk.search(SearchRequest("x")) }
        expect(SearchErrorCode.CONFIGURATION) { sdk.searchBatch(emptyList()) }
    }

    /** A real loopback socket fixture; production endpoint validation still requires HTTPS. */
    private class Wire(private val handler: (Socket) -> Unit) : AutoCloseable {
        private val server = ServerSocket(0, 10, InetAddress.getLoopbackAddress())
        val accepted = CountDownLatch(1)
        val finished = CountDownLatch(1)
        @Volatile var peer: Socket? = null
        val thread = Thread {
            try { server.accept().use { peer = it; it.soTimeout = 3000; accepted.countDown(); handler(it) } }
            catch (_: Exception) { } finally { finished.countDown() }
        }.apply { isDaemon = true; start() }
        fun loopbackUri() = URI("http://127.0.0.1:${server.localPort}/search")
        fun transport() = OkHttpTransport(1) { loopbackUri() }
        override fun close() { peer?.close(); server.close(); thread.join(3500) }
        companion object {
            fun readRequest(socket: Socket): String {
                val input = socket.getInputStream(); val header = StringBuilder()
                while (!header.endsWith("\r\n\r\n")) { val n = input.read(); if (n < 0) error("EOF"); header.append(n.toChar()) }
                val size = Regex("Content-Length: (\\d+)", RegexOption.IGNORE_CASE).find(header)!!.groupValues[1].toInt()
                val body = ByteArray(size); var offset = 0
                while (offset < size) { val n = input.read(body, offset, size - offset); if (n < 0) error("EOF"); offset += n }
                return header.toString() + body.toString(Charsets.UTF_8)
            }
            fun write(socket: Socket, status: Int = 200, bytes: ByteArray, headers: String = "") {
                socket.getOutputStream().apply {
                    write("HTTP/1.1 $status Test\r\nContent-Length: ${bytes.size}\r\nConnection: close\r\n$headers\r\n".toByteArray())
                    write(bytes); flush()
                }
            }
        }
    }
    @Test fun realTransportPostsTokenAndDecodesGzip() = runBlocking<Unit> {
        val compressed = ByteArrayOutputStream().also { out -> GZIPOutputStream(out).use { it.write(good.toByteArray()) } }.toByteArray()
        var sent = ""
        Wire { socket -> sent = Wire.readRequest(socket); Wire.write(socket, bytes = compressed, headers = "Content-Encoding: gzip\r\nX-SearchSDK-Protocol: 1\r\n") }.use { wire ->
            wire.transport().use { transport ->
                val sdk = SearchClient(endpoint, accessToken = { "application-token" }, transport = transport)
                assertEquals("fixture", sdk.search(SearchRequest("wire query")).provider)
            }
            assertTrue(wire.finished.await(1, TimeUnit.SECONDS)); assertTrue(sent.startsWith("POST /search HTTP/1.1"))
            assertTrue(sent.contains("Authorization: Bearer application-token")); assertTrue(sent.contains("\"query\":\"wire query\""))
        }
    }
    @Test fun realTransportEnforcesDecodedGzipAndStreamingLimits() = runBlocking<Unit> {
        for (gzip in listOf(false, true)) {
            val huge = "a".repeat(100_000).toByteArray()
            val body = if (gzip) ByteArrayOutputStream().also { out -> GZIPOutputStream(out).use { it.write(huge) } }.toByteArray() else huge
            Wire { socket -> Wire.readRequest(socket); Wire.write(socket, bytes = body, headers = if (gzip) "Content-Encoding: gzip\r\n" else "") }.use { wire ->
                wire.transport().use { transport ->
                    expect(SearchErrorCode.INVALID_RESPONSE) { SearchClient(endpoint, maxResponseBytes = 1000, transport = transport).search(SearchRequest("x")) }
                }
            }
        }
    }
    @Test fun realTransportDoesNotFollowRedirectsOrRetry() = runBlocking<Unit> {
        Wire { socket -> Wire.readRequest(socket); Wire.write(socket, 302, ByteArray(0), "Location: http://127.0.0.1:1/leak\r\n") }.use { wire ->
            wire.transport().use { transport -> expect(SearchErrorCode.PROVIDER_ERROR) {
                SearchClient(endpoint, accessToken = { "secret" }, transport = transport).search(SearchRequest("x"))
            } }
        }
    }
    @Test fun realTransportCancellationDisconnectsBlockedBody() = runBlocking<Unit> {
        val headersSent = CompletableDeferred<Unit>(); val disconnected = CountDownLatch(1)
        Wire { socket ->
            Wire.readRequest(socket)
            socket.getOutputStream().apply { write("HTTP/1.1 200 OK\r\nContent-Length: 100\r\n\r\n{".toByteArray()); flush() }
            headersSent.complete(Unit)
            if (socket.getInputStream().read() == -1) disconnected.countDown()
        }.use { wire ->
            wire.transport().use { transport ->
                val sdk = SearchClient(endpoint, timeoutMs = 3000, transport = transport)
                val call = launch { sdk.search(SearchRequest("x")) }
                withTimeout(1000) { headersSent.await() }
                val start = System.nanoTime(); call.cancelAndJoin()
                assertTrue("Cancellation must promptly return", (System.nanoTime() - start) / 1_000_000 < 1000)
                assertTrue("Socket must be closed", disconnected.await(1, TimeUnit.SECONDS))
            }
        }
    }
    @Test fun realTransportWholeDeadlineStopsTricklingResponses() = runBlocking<Unit> {
        Wire { socket ->
            Wire.readRequest(socket)
            socket.getOutputStream().apply {
                write("HTTP/1.1 200 OK\r\nContent-Length: 10000\r\n\r\n".toByteArray()); flush()
                repeat(100) { write(' '.code); flush(); Thread.sleep(10) }
            }
        }.use { wire -> wire.transport().use { transport ->
            val start = System.nanoTime()
            expect(SearchErrorCode.TIMEOUT) { SearchClient(endpoint, timeoutMs = 100, transport = transport).search(SearchRequest("x")) }
            assertTrue((System.nanoTime() - start) / 1_000_000 < 1200)
        } }
    }
    @Test fun realTransportRejectsDuplicateProtocolAndUnsupportedEncoding() = runBlocking<Unit> {
        for (headers in listOf("X-SearchSDK-Protocol: 1\r\nX-SearchSDK-Protocol: 2\r\n", "Content-Encoding: br\r\n")) {
            Wire { socket -> Wire.readRequest(socket); Wire.write(socket, bytes = good.toByteArray(), headers = headers) }.use { wire -> wire.transport().use { transport ->
                expect(SearchErrorCode.INVALID_RESPONSE) { SearchClient(endpoint, transport = transport).search(SearchRequest("x")) }
            } }
        }
    }
    @Test fun isolatedTransportIgnoresGlobalCookiesAuthenticatorAndSetCookie() = runBlocking<Unit> {
        val previousCookies = java.net.CookieHandler.getDefault()
        val previousAuthenticator = java.net.Authenticator::class.java.getMethod("getDefault").invoke(null) as? java.net.Authenticator
        val cookieReads = AtomicInteger(); val cookieWrites = AtomicInteger(); val authCalls = AtomicInteger()
        java.net.CookieHandler.setDefault(object : java.net.CookieHandler() {
            override fun get(uri: URI, headers: MutableMap<String, MutableList<String>>): MutableMap<String, MutableList<String>> {
                cookieReads.incrementAndGet()
                return mutableMapOf("Cookie" to mutableListOf("ambient=PRIVATE"), "Authorization" to mutableListOf("Basic PRIVATE"))
            }
            override fun put(uri: URI, headers: MutableMap<String, MutableList<String>>) { cookieWrites.incrementAndGet() }
        })
        java.net.Authenticator.setDefault(object : java.net.Authenticator() {
            override fun getPasswordAuthentication(): java.net.PasswordAuthentication {
                authCalls.incrementAndGet(); return java.net.PasswordAuthentication("ambient", "PRIVATE".toCharArray())
            }
        })
        try {
            var sent = ""
            Wire { socket ->
                sent = Wire.readRequest(socket)
                Wire.write(socket, 401, "PRIVATE BODY".toByteArray(), "WWW-Authenticate: Basic realm=fixture\r\nSet-Cookie: persisted=PRIVATE\r\n")
            }.use { wire -> wire.transport().use { transport ->
                expect(SearchErrorCode.AUTH) { SearchClient(endpoint, accessToken = { "application-token" }, transport = transport).search(SearchRequest("x")) }
            } }
            assertTrue(sent.contains("Authorization: Bearer application-token"))
            assertFalse(sent.contains("Cookie:")); assertFalse(sent.contains("PRIVATE"))
            assertEquals(0, cookieReads.get()); assertEquals(0, cookieWrites.get()); assertEquals(0, authCalls.get())
            assertTrue(java.net.CookieHandler.getDefault() != null); assertNotNull(java.net.Authenticator::class.java.getMethod("getDefault").invoke(null))
        } finally { java.net.CookieHandler.setDefault(previousCookies); java.net.Authenticator.setDefault(previousAuthenticator) }
    }
    @Test fun isolatedTransportDoesNotRetainSetCookieOrPriorCallToken() = runBlocking<Unit> {
        val destination = java.util.concurrent.atomic.AtomicReference<URI>()
        OkHttpTransport(1) { destination.get() }.use { transport ->
            var captured = ""
            Wire { socket -> Wire.readRequest(socket); Wire.write(socket, bytes = good.toByteArray(), headers = "Set-Cookie: ambient=PRIVATE; Path=/\r\n") }.use { wire ->
                // The internal test-only target mapping never changes production HTTPS validation.
                val field = wire.loopbackUri()
                destination.set(field)
                SearchClient(endpoint, accessToken = { "first-call-token" }, transport = transport).search(SearchRequest("first"))
            }
            Wire { socket -> captured = Wire.readRequest(socket); Wire.write(socket, bytes = good.toByteArray()) }.use { wire ->
                destination.set(wire.loopbackUri())
                SearchClient(endpoint, transport = transport).search(SearchRequest("second"))
            }
            assertFalse(captured.contains("Cookie:")); assertFalse(captured.contains("Authorization:")); assertFalse(captured.contains("first-call-token"))
        }
    }
    @Test fun realTransportDoesNotReplayServiceUnavailableWithRetryAfterZero() = runBlocking<Unit> {
        Wire { socket -> Wire.readRequest(socket); Wire.write(socket, 503, "{}".toByteArray(), "Retry-After: 0\r\n") }.use { wire -> wire.transport().use { transport ->
            expect(SearchErrorCode.UNAVAILABLE) { SearchClient(endpoint, timeoutMs = 1000, transport = transport).search(SearchRequest("x")) }
        } }
    }
    @Test fun realTransportRejectsMalformedGzip() = runBlocking<Unit> {
        Wire { socket -> Wire.readRequest(socket); Wire.write(socket, bytes = byteArrayOf(1,2,3), headers = "Content-Encoding: gzip\r\n") }.use { wire -> wire.transport().use { transport ->
            expect(SearchErrorCode.INVALID_RESPONSE) { SearchClient(endpoint, transport = transport).search(SearchRequest("x")) }
        } }
    }

    @Test fun isolatedTransportDoesNotInheritPreviouslyCachedUrlConnectionAuthentication() = runBlocking<Unit> {
        val previous = java.net.Authenticator::class.java.getMethod("getDefault").invoke(null) as? java.net.Authenticator
        val previousCookies = java.net.CookieHandler.getDefault()
        val authCalls = AtomicInteger()
        val server = ServerSocket(0, 10, InetAddress.getLoopbackAddress()).apply { soTimeout = 3000 }
        val captured = java.util.Collections.synchronizedList(arrayListOf<String>())
        val failure = java.util.concurrent.atomic.AtomicReference<Throwable?>()
        val finished = CountDownLatch(1)
        val thread = Thread {
            try {
                repeat(3) { index -> server.accept().use { socket ->
                    socket.soTimeout = 2000
                    // The Java warm-up is a GET and has no Content-Length.
                    val input = socket.getInputStream(); val header = StringBuilder()
                    while (!header.endsWith("\r\n\r\n")) { val n = input.read(); if (n < 0) error("EOF"); header.append(n.toChar()) }
                    val length = Regex("Content-Length: (\\d+)", RegexOption.IGNORE_CASE).find(header)?.groupValues?.get(1)?.toInt() ?: 0
                    repeat(length) { if (input.read() < 0) error("EOF") }
                    captured.add(header.toString())
                    if (index == 0) Wire.write(socket, 401, ByteArray(0), "WWW-Authenticate: Basic realm=cache-fixture\r\n")
                    else Wire.write(socket, bytes = good.toByteArray())
                } }
            } catch (error: Throwable) { failure.set(error) } finally { finished.countDown() }
        }.apply { isDaemon = true; start() }
        try {
            java.net.CookieHandler.setDefault(null)
            java.net.Authenticator.setDefault(object : java.net.Authenticator() {
                override fun getPasswordAuthentication(): java.net.PasswordAuthentication {
                    authCalls.incrementAndGet(); return java.net.PasswordAuthentication("cache-fixture", "PRIVATE".toCharArray())
                }
            })
            val local = URI("http://127.0.0.1:${server.localPort}/search")
            val warm = local.toURL().openConnection().apply { connectTimeout = 1000; readTimeout = 1000 }
            warm.getInputStream().use { it.readBytes() }
            assertEquals(1, authCalls.get())
            OkHttpTransport(1) { local }.use { transport ->
                SearchClient(endpoint, transport = transport).search(SearchRequest("isolated"))
            }
            assertTrue(finished.await(2, TimeUnit.SECONDS)); failure.get()?.let { throw AssertionError("Loopback server", it) }
            assertTrue(captured[1].contains("Authorization: Basic"))
            assertFalse(captured[2].contains("Authorization:")); assertEquals(1, authCalls.get())
        } finally {
            server.close(); thread.join(3500)
            java.net.Authenticator.setDefault(previous); java.net.CookieHandler.setDefault(previousCookies)
        }
    }

}
