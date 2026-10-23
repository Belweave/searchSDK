package dev.searchsdk.consumer

import dev.searchsdk.android.*
import kotlinx.coroutines.*
import org.junit.Assert.*
import org.junit.Test

/** Uses only the published Maven AAR and its declared transitive dependencies. */
class InstalledArtifactTest {
    @Test fun artifactCanExecuteAndCancel() = runBlocking<Unit> {
        SearchClient("https://gateway.example/search").use { /* Resolve and construct the packaged default transport without network I/O. */ }
        val fixture = javaClass.classLoader!!.getResourceAsStream("search-success.json")!!.use { it.readBytes() }
        var calls = 0
        SearchClient("https://gateway.example/search", accessToken = { "application-token" }, transport = GatewayTransport { r ->
            calls++; assertEquals("application-token", r.bearerToken); GatewayResponse(200, fixture, "1")
        }).use { client ->
            assertEquals("fixture", client.search(SearchRequest("consumer")).provider)
            assertEquals(2, client.searchBatch(listOf(SearchRequest("a"), SearchRequest("b")), 1).size)
        }
        assertEquals(3, calls)
        val entered = CompletableDeferred<Unit>(); val stopped = CompletableDeferred<Unit>()
        SearchClient("https://gateway.example/search", transport = GatewayTransport {
            entered.complete(Unit); try { awaitCancellation() } finally { stopped.complete(Unit) }
        }).use { client ->
            val call = launch { client.search(SearchRequest("cancel")) }
            entered.await(); call.cancelAndJoin(); withTimeout(1000) { stopped.await() }
        }
    }
}
