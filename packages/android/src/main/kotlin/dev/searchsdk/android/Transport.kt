package dev.searchsdk.android

import java.net.URI

/** Custom transports must honor cancellation, remaining timeout, decoded byte limit, and never follow redirects. */
fun interface GatewayTransport {
    suspend fun exchange(request: GatewayRequest): GatewayResponse
}
class GatewayRequest internal constructor(val endpoint: URI, val json: String, val bearerToken: String?,
    val timeoutMs: Long, val maxResponseBytes: Int) {
    override fun toString() = "GatewayRequest(<redacted>)"
}
class GatewayResponse(val status: Int, val body: ByteArray, val protocolVersion: String? = null) {
    override fun toString() = "GatewayResponse(status=$status, <redacted>)"
}
