#pragma once
#include <searchsdk/searchsdk.hpp>
#include <mutex>
namespace searchsdk::detail {
struct TransportState {
    std::recursive_mutex mutex;
    const ssk_http_request* request=nullptr;
    ssk_sink* sink=nullptr;
    bool writing=false;
    void close() noexcept { std::lock_guard<std::recursive_mutex> guard(mutex); request=nullptr; sink=nullptr; }
};
struct TransportAccess {
    static ssk_code run(const HttpRequest&, const ResponseWriter&, ssk_transport_fn, void* context=nullptr);
};
}
