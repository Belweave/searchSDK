package dev.searchsdk.consumer

import dev.searchsdk.android.SearchClient
import dev.searchsdk.android.SearchRequest
import dev.searchsdk.android.SearchResponse

/** Call from an application-owned coroutine scope; cancellation propagates to the network call. */
suspend fun searchDocumentation(
    applicationGateway: String,
    shortLivedApplicationToken: suspend () -> String?,
): SearchResponse = SearchClient(
    endpoint = applicationGateway,
    accessToken = shortLivedApplicationToken,
).use { client ->
    client.search(SearchRequest("Kotlin coroutines", limit = 5, includeDomains = listOf("kotlinlang.org")))
}
