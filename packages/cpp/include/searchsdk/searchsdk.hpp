#pragma once

#include <searchsdk/searchsdk.h>
#include <chrono>
#include <cstdint>
#include <functional>
#include <initializer_list>
#include <memory>
#include <optional>
#include <stdexcept>
#include <string>
#include <string_view>
#include <type_traits>
#include <utility>
#include <variant>
#include <vector>

namespace searchsdk {
static_assert(SSK_ABI_VERSION==1u, "Unsupported searchSDK C ABI");
enum class Code : std::int32_t {
    ok=SSK_OK, invalid_request=SSK_INVALID_REQUEST, unsupported_option=SSK_UNSUPPORTED_OPTION,
    configuration=SSK_CONFIGURATION, auth=SSK_AUTH, rate_limit=SSK_RATE_LIMIT,
    network=SSK_NETWORK, unavailable=SSK_UNAVAILABLE, attempt_timeout=SSK_ATTEMPT_TIMEOUT,
    timeout=SSK_TIMEOUT, aborted=SSK_ABORTED, invalid_response=SSK_INVALID_RESPONSE,
    provider_error=SSK_PROVIDER_ERROR
};

// Immutable, shared ownership: children keep the entire original document alive.
class Json {
public:
    enum class Kind { null=SSK_JSON_NULL, boolean=SSK_JSON_BOOL, number=SSK_JSON_NUMBER,
                      string=SSK_JSON_STRING, array=SSK_JSON_ARRAY, object=SSK_JSON_OBJECT };
    Json() noexcept = default;
    Json(const Json&) noexcept = default;
    Json& operator=(const Json&) noexcept = default;
    Json(Json&& other) noexcept : owner_(std::move(other.owner_)), value_(std::exchange(other.value_, nullptr)) {}
    Json& operator=(Json&& other) noexcept {
        if (this != &other) { owner_=std::move(other.owner_); value_=std::exchange(other.value_, nullptr); }
        return *this;
    }
    static Json parse(std::string_view);
    static Json string(std::string_view);
    static Json number(double);
    static Json boolean(bool);
    static Json array(const std::vector<Json>&);
    static Json object(std::initializer_list<std::pair<std::string, Json>>);
    static Json object(const std::vector<std::pair<std::string, Json>>&);
    Kind kind() const noexcept;
    bool is_null() const noexcept { return kind()==Kind::null; }
    std::size_t size() const noexcept;
    Json at(std::size_t) const;
    Json at(std::string_view) const;
    std::optional<Json> find(std::string_view) const;
    std::string key(std::size_t) const;
    std::string as_string() const;
    double as_number() const;
    bool as_bool() const;
    std::string dump() const;
private:
    std::shared_ptr<const void> owner_;
    const ssk_json* value_ = nullptr;
    Json(std::shared_ptr<const void> owner, const ssk_json* value) : owner_(std::move(owner)), value_(value) {}
    friend class Client;
    friend class NativeResponse;
    friend class Error;
};

class Error : public std::runtime_error {
public:
    explicit Error(Code, int status=0, std::optional<std::chrono::milliseconds> retry_after={}, Json attempts=Json::array({}));
    Code code() const noexcept { return code_; }
    int status() const noexcept { return status_; }
    std::optional<std::chrono::milliseconds> retry_after() const noexcept { return retry_after_; }
    const Json& attempts() const noexcept { return attempts_; }
private:
    Code code_;
    int status_;
    std::optional<std::chrono::milliseconds> retry_after_;
    Json attempts_;
    static Error consume(ssk_code, ssk_error*);
    friend class Client;
};

class Cancellation {
public:
    Cancellation();
    void cancel() const noexcept;
    bool cancelled() const noexcept;
private:
    std::shared_ptr<ssk_cancel> value_;
    friend class Client;
};

struct CallOptions {
    // Owned by this per-call value, never retained by Client.
    std::string credential;
    std::optional<Cancellation> cancellation;
    std::optional<std::chrono::milliseconds> timeout;
    std::optional<std::string> retrieved_at;
};

namespace detail { struct TransportState; struct TransportAccess; }
struct HttpRequest {
    std::string url, method;
    std::vector<std::pair<std::string, std::string>> headers;
    std::vector<std::uint8_t> body;
    std::uint64_t deadline_ms=0;
    std::size_t max_response_bytes=0;
    // Safe on a retained copy: returns aborted once callback has returned.
    Code check() const noexcept;
private:
    std::shared_ptr<detail::TransportState> state_;
    friend class Client;
    friend struct detail::TransportAccess;
};
class ResponseWriter {
public:
    void status(int) const;
    void header(std::string_view name, std::string_view value) const;
    void write(std::string_view bytes) const;
    void write(const std::vector<std::uint8_t>& bytes) const;
private:
    std::shared_ptr<detail::TransportState> state_;
    explicit ResponseWriter(std::shared_ptr<detail::TransportState> state) : state_(std::move(state)) {}
    friend class Client;
    friend struct detail::TransportAccess;
};
using Transport = std::function<void(const HttpRequest&, ResponseWriter)>;
struct Config {
    // Exactly one selector. Native-only IDs are accepted for native calls.
    std::string provider, gateway_url;
    std::optional<Json> provider_options;
    Transport transport;
    std::chrono::milliseconds timeout{10000};
    std::optional<std::chrono::milliseconds> attempt_timeout;
    std::size_t max_response_bytes=SSK_DEFAULT_MAX_BYTES;
    std::uint32_t max_retries=0;
    std::chrono::milliseconds retry_delay{100};
};
struct SearchRequest {
    SearchRequest() = default;
    explicit SearchRequest(std::string value, std::optional<int> count={}) : query(std::move(value)), limit(count) {}
    std::string query;
    std::optional<int> limit;
    std::optional<std::vector<std::string>> include_domains, exclude_domains;
    Json json() const;
};
struct Provenance {
    std::string provider, source_url, retrieved_at;
    std::optional<std::string> request_id;
};
struct SearchResult {
    std::string url;
    std::optional<std::string> title, snippet;
    std::optional<std::vector<std::string>> highlights;
    std::optional<double> score;
    Provenance provenance;
};
struct Usage { std::string unit; double value; };
struct Warning { std::string code, provider; };
struct Attempt {
    std::string provider, started_at, outcome;
    double duration_ms=0;
    std::optional<Code> code;
    std::optional<int> status;
    std::optional<std::chrono::milliseconds> retry_after;
};
struct SearchResponse {
    std::string provider;
    std::vector<SearchResult> results;
    std::optional<Usage> usage;
    std::vector<Warning> warnings;
    std::vector<Attempt> attempts;
    std::optional<std::string> reuse;
    Json json;
};
using BatchOutcome = std::variant<SearchResponse, Error>;
struct Capabilities {
    std::string provider;
    bool domain_filters=false, mutually_exclusive_domain_filters=false;
    std::size_t max_include_domains=0, max_exclude_domains=0, max_query_utf16=0;
};
struct Operation {
    std::string provider, name, method, base_url, path, response_mode, source;
    Json metadata;
};
struct NativeInput {
    Json parameters=Json::object({}); // path, query, headers, body envelope
    std::optional<std::vector<std::uint8_t>> raw_body; // distinct from JSON body, including empty bytes
};
struct SseEvent {
    std::optional<std::string> event, id;
    std::string data;
    std::optional<std::chrono::milliseconds> retry;
};
class NativeResponse {
public:
    int status() const noexcept;
    std::optional<std::string> header(std::string_view) const;
    std::vector<std::uint8_t> bytes() const;
    std::string text() const;
    std::optional<Json> json() const;
    // Collected, bounded SSE; callback receives an owning value and may return false to stop.
    void for_each_sse(const std::function<bool(SseEvent)>&) const;
    std::vector<SseEvent> events() const;
private:
    std::shared_ptr<ssk_response> value_;
    explicit NativeResponse(ssk_response* p) : value_(p, ssk_response_free) {}
    friend class Client;
};

class Client {
public:
    explicit Client(Config);
    // Cheap copies share an immutable C client and transport. Moved-from clients reject calls.
    SearchResponse search(const SearchRequest&, const CallOptions& = {}) const;
    SearchResponse search(const Json&, const CallOptions& = {}) const;
    std::vector<BatchOutcome> batch(const std::vector<SearchRequest>&, std::size_t concurrency=4, const CallOptions& = {}) const;
    static SearchResponse fallback(const std::vector<Client>&, const SearchRequest&, const std::vector<CallOptions>&);
    NativeResponse native(std::string_view operation, const NativeInput& = {}, const CallOptions& = {}) const;
    NativeResponse stream(std::string_view operation, const NativeInput&, const std::function<bool(SseEvent)>&, const CallOptions& = {}) const;
    template<class Encode>
    NativeResponse stream_encoded(std::string_view operation, Encode encode, const std::function<bool(SseEvent)>& callback, const CallOptions& call={}) const {
        const auto deadline=deadline_for(call);auto input=encode();
        auto result=stream(operation,input,callback,remaining_options(call,deadline));
        check_budget(call,deadline);return result;
    }
    // Extend the same deadline/cancellation budget through typed encoding and decoding.
    template<class Encode, class Decode>
    auto native_decoded(std::string_view operation, Encode encode, const CallOptions& call, Decode decode) const
        -> std::invoke_result_t<Decode, NativeResponse> {
        const auto deadline=deadline_for(call);
        auto input=encode();
        auto value=decode(native(operation,input,remaining_options(call,deadline)));
        check_budget(call,deadline);
        return value;
    }
    static Json normalize(const Json&);
    static std::vector<Capabilities> providers();
    static std::vector<Operation> operations();
    const std::string& provider() const;
private:
    struct Impl;
    std::shared_ptr<Impl> impl_;
    const Impl& checked() const;
    static ssk_code transport_bridge(void*, const ssk_http_request*, ssk_sink*) noexcept;
    static ssk_call_options options(const CallOptions&);
    static SearchResponse decode(ssk_response*);
    std::uint64_t deadline_for(const CallOptions&) const;
    static void check_budget(const CallOptions&, std::uint64_t);
    static CallOptions remaining_options(const CallOptions&, std::uint64_t);
};
} // namespace searchsdk
