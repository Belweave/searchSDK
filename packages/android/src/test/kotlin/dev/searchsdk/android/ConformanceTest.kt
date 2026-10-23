package dev.searchsdk.android

import kotlinx.coroutines.runBlocking
import org.junit.Assert.*
import org.junit.Test

/** Reads repository-owned fixtures directly: no copied fixtures can drift from the shared contract. */
class ConformanceTest {
    private fun fixture(name: String): ByteArray = javaClass.classLoader!!.getResourceAsStream(name)!!.use { it.readBytes() }
    private fun decode(bytes: ByteArray) = Json.decode(bytes) {}
    private fun encode(value: Any?): String = when (value) {
        null -> "null"
        is String -> Json.quote(value)
        is Map<*, *> -> value.entries.joinToString(",", "{", "}") { Json.quote(it.key as String) + ":" + encode(it.value) }
        is List<*> -> value.joinToString(",", "[", "]", transform = ::encode)
        else -> value.toString()
    }
    private fun request(value: Map<*, *>) = SearchRequest(value["query"] as String,
        (value["limit"] as? Double)?.toInt() ?: 5,
        (value["includeDomains"] as? List<*>)?.map { it as String },
        (value["excludeDomains"] as? List<*>)?.map { it as String })
    @Test fun sharedSuccessAndErrors() = runBlocking<Unit> {
        val success = fixture("search-success.json")
        val sdk = SearchClient("https://gateway.example/search", transport = GatewayTransport { GatewayResponse(200, success) })
        val response = sdk.search(SearchRequest("fixture"))
        assertEquals("fixture-001", response.results.single().provenance.requestId)
        assertEquals(0.75, response.results.single().score!!, 0.0); assertNull(response.usage)
        val errors = decode(fixture("search-errors.json")) as List<*>
        for (row in errors) {
            val case = row as Map<*, *>; val status = (case["httpStatus"] as Double).toInt()
            val body = encode(case["body"]).toByteArray()
            val expected = ((case["body"] as Map<*, *>)["error"] as Map<*, *>)["code"]
            try {
                SearchClient("https://gateway.example/search", transport = GatewayTransport { GatewayResponse(status, body) }).search(SearchRequest("fixture"))
                fail("Expected shared failure")
            } catch (error: SearchException) { assertEquals(expected, error.code.wire) }
        }
    }
    @Test fun sharedRequestCasesAndCompileTimeExclusions() = runBlocking<Unit> {
        val cases = decode(fixture("request-cases.json")) as Map<*, *>
        assertEquals(1.0, cases["protocolVersion"])
        for (row in cases["valid"] as List<*>) {
            val case = row as Map<*, *>
            assertEquals(case["normalized"], decode(Protocol.request(request(case["input"] as Map<*, *>)).toByteArray()))
        }
        // These dynamic JSON values cannot be expressed by SearchRequest's Kotlin constructor.
        val compileTimeExcluded = setOf("missing", "query-type", "limit-null", "limit-fraction", "limit-boolean", "unknown-field", "array", "null")
        val seenExcluded = mutableSetOf<String>()
        for (row in cases["invalid"] as List<*>) {
            val case = row as Map<*, *>; val name = case["name"] as String
            if (name in compileTimeExcluded) { seenExcluded.add(name); continue }
            try { Protocol.request(request(case["input"] as Map<*, *>)); fail("Invalid fixture accepted: $name") }
            catch (error: SearchException) { assertEquals(case["code"], error.code.wire) }
        }
        assertEquals("Keep the typed API exclusions explicit when fixtures change", compileTimeExcluded, seenExcluded)
    }
}
