import Foundation
import React

@objc(SearchSDKGateway)
final class SearchSDKGateway: NSObject, RCTInvalidating {
    private let lock = NSLock()
    private var operations: [String: GatewayTransfer] = [:]
    @objc static func requiresMainQueueSetup() -> Bool { false }

    @objc(request:endpoint:headers:body:maxBytes:timeoutMs:resolver:rejecter:)
    func request(_ id: String, endpoint: String, headers: [String: String], body: String,
                 maxBytes: Double, timeoutMs: Double, resolver resolve: @escaping RCTPromiseResolveBlock,
                 rejecter reject: @escaping RCTPromiseRejectBlock) {
        guard !id.isEmpty, id.count < 128, maxBytes.isFinite, timeoutMs.isFinite,
              maxBytes.rounded() == maxBytes, timeoutMs.rounded() == timeoutMs,
              maxBytes > 0, maxBytes <= Double(Int32.max), timeoutMs > 0, timeoutMs <= Double(Int32.max),
              let request = try? GatewayTransfer.makeRequest(endpoint: endpoint, headers: headers, body: body, timeoutMs: Int(timeoutMs)) else {
            reject(GatewayFailure.invalidResponse.rawValue, "Invalid gateway request.", nil); return
        }
        let transfer = GatewayTransfer(maxBytes: Int(maxBytes))
        lock.lock()
        guard operations.count < 1024, operations[id] == nil else {
            lock.unlock(); reject(GatewayFailure.unavailable.rawValue, "Gateway capacity exceeded.", nil); return
        }
        operations[id] = transfer
        lock.unlock()
        transfer.start(request) { [weak self] result in
            if let self {
                self.lock.lock()
                self.operations.removeValue(forKey: id)
                self.lock.unlock()
            }
            switch result {
            case .success(let value):
                resolve(["status": value.status, "headers": value.headers, "url": value.url,
                         "bodyBase64": value.bytes.base64EncodedString()])
            case .failure(let error): reject(error.rawValue, "Gateway request failed.", nil)
            }
        }
    }
    @objc func cancel(_ id: String) {
        lock.lock(); let operation = operations[id]; lock.unlock()
        operation?.cancel()
    }
    @objc func invalidate() {
        lock.lock(); let active = Array(operations.values); operations.removeAll(); lock.unlock()
        active.forEach { $0.cancel() }
    }
}
