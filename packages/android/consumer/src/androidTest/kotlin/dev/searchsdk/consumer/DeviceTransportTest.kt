package dev.searchsdk.consumer

import androidx.test.platform.app.InstrumentationRegistry
import dev.searchsdk.android.*
import kotlinx.coroutines.*
import org.junit.Assert.*
import org.junit.Test

/** Exercises only the installed Maven AAR with the production HTTPS transport. */
class DeviceTransportTest {
    private val endpoint: String
        get() = InstrumentationRegistry.getArguments().getString("fixtureEndpoint")
            ?: error("Run scripts/verify-device.py to supply the local HTTPS fixture")

    @Test fun httpsSearchAndOrderedBatch() = runBlocking<Unit> {
        SearchClient("$endpoint/success", accessToken = { "synthetic-application-token" }).use { client ->
            val response = client.search(SearchRequest("device fixture", includeDomains = listOf("EXAMPLE.COM")))
            assertEquals("fixture", response.provider)
            assertEquals("fixture", response.results.first().provenance.provider)
            val outcomes = client.searchBatch(listOf(SearchRequest("a"), SearchRequest("b")), 2)
            assertEquals(listOf(0, 1), outcomes.map { it.index })
            assertTrue(outcomes.all { it is BatchOutcome.Success })
        }
    }

    @Test fun redirectsAreRejectedAndDecodedBytesBounded() = runBlocking<Unit> {
        suspend fun rejected(path: String, bytes: Int, expected: SearchErrorCode) {
            SearchClient("$endpoint/$path", maxResponseBytes = bytes).use { client ->
                try { client.search(SearchRequest("fixture")); fail("Expected SDK error") }
                catch (error: SearchException) { assertEquals(expected, error.code) }
            }
        }
        rejected("redirect", 1024, SearchErrorCode.PROVIDER_ERROR)
        rejected("oversized", 128, SearchErrorCode.INVALID_RESPONSE)
        rejected("gzip", 128, SearchErrorCode.INVALID_RESPONSE)
    }

    @Test fun deadlineAndCancellationCloseTheExchange() = runBlocking<Unit> {
        SearchClient("$endpoint/slow", timeoutMs = 1500).use { client ->
            try { client.search(SearchRequest("deadline")); fail("Expected timeout") }
            catch (error: SearchException) { assertEquals(SearchErrorCode.TIMEOUT, error.code) }
        }
        SearchClient("$endpoint/slow").use { client ->
            val call = launch { client.search(SearchRequest("cancel")) }
            delay(750)
            withTimeout(1000) { call.cancelAndJoin() }
            assertTrue(call.isCancelled)
        }
    }
}
