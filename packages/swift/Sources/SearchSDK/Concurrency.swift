import Foundation

/// A one-shot race that does not wait for an uncooperative user token callback.
/// Every mutable field is protected by lock; tasks and continuations leave the lock before cancellation/resumption.
private final class Settlement<Value: Sendable>: @unchecked Sendable {
    private let lock = NSLock()
    private var result: Result<Value, any Error>?
    private var continuation: CheckedContinuation<Value, any Error>?
    private var tasks: [Task<Void, Never>] = []

    func install(_ continuation: CheckedContinuation<Value, any Error>) {
        lock.lock()
        if let result { lock.unlock(); continuation.resume(with: result) }
        else { self.continuation = continuation; lock.unlock() }
    }
    func start(_ operation: @escaping @Sendable () async -> Void) {
        lock.lock()
        guard result == nil else { lock.unlock(); return }
        // Register before cancellation can win; never launch work after settlement.
        tasks.append(Task { await operation() })
        lock.unlock()
    }
    func resolve(_ value: Result<Value, any Error>) {
        lock.lock()
        guard result == nil else { lock.unlock(); return }
        result = value
        let continuation = self.continuation
        self.continuation = nil
        let tasks = self.tasks
        self.tasks = []
        lock.unlock()
        tasks.forEach { $0.cancel() }
        continuation?.resume(with: value)
    }
}

internal enum Deadline {
    static func run<Value: Sendable>(until deadline: ContinuousClock.Instant,
                                    operation: @escaping @Sendable () async throws -> Value) async throws -> Value {
        let state = Settlement<Value>()
        return try await withTaskCancellationHandler {
            if Task.isCancelled { throw SearchError(.aborted) }
            guard ContinuousClock.now < deadline else { throw SearchError(.timeout) }
            return try await withCheckedThrowingContinuation { continuation in
                state.install(continuation)
                state.start {
                    do {
                        try Task.checkCancellation()
                        let value = try await operation()
                        try Task.checkCancellation()
                        guard ContinuousClock.now < deadline else { throw SearchError(.timeout) }
                        state.resolve(.success(value))
                    } catch {
                        // A late decoding/transport failure must not outrun the whole-call budget.
                        state.resolve(.failure(ContinuousClock.now >= deadline ? SearchError(.timeout) : error))
                    }
                }
                state.start {
                    do {
                        try await ContinuousClock().sleep(until: deadline)
                        state.resolve(.failure(SearchError(.timeout)))
                    } catch { /* Settlement cancelled its losing timer. */ }
                }
            }
        } onCancel: { state.resolve(.failure(SearchError(.aborted))) }
    }
}

internal actor PermitPool {
    private var available: Int
    private var active = Set<UUID>()
    private var waiters: [(UUID, CheckedContinuation<UUID, any Error>)] = []
    init(_ capacity: Int) { available = capacity }

    func acquire() async throws -> UUID {
        try Task.checkCancellation()
        let id = UUID()
        return try await withTaskCancellationHandler {
            try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<UUID, any Error>) in
                if Task.isCancelled { continuation.resume(throwing: CancellationError()) }
                else if available > 0 { available -= 1; active.insert(id); continuation.resume(returning: id) }
                else { waiters.append((id, continuation)) }
            }
        } onCancel: { Task { await self.cancel(id) } }
    }
    private func cancel(_ id: UUID) {
        if let index = waiters.firstIndex(where: { $0.0 == id }) {
            waiters.remove(at: index).1.resume(throwing: CancellationError())
        } else { release(id) }
    }
    func release(_ id: UUID) {
        guard active.remove(id) != nil else { return }
        if waiters.isEmpty { available += 1 }
        else {
            let (next, continuation) = waiters.removeFirst()
            active.insert(next)
            continuation.resume(returning: next)
        }
    }
}
