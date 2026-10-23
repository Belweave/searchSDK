#include <searchsdk/curl.hpp>
#include <searchsdk/curl.h>
#include <curl/curl.h>
#include "transport-state.hpp"
namespace searchsdk {
namespace {
struct CurlRuntime {
    CurlOptions options;
    ssk_curl_options config{};
    explicit CurlRuntime(CurlOptions value) : options(std::move(value)) {
        if (options.ca_bundle && (options.ca_bundle->empty() || options.ca_bundle->find('\0')!=std::string::npos)) throw Error(Code::configuration);
        ssk_curl_options_init(&config);
        config.ca_bundle=options.ca_bundle?options.ca_bundle->c_str():nullptr;
        if (curl_global_init(CURL_GLOBAL_DEFAULT)!=CURLE_OK) throw Error(Code::configuration);
    }
    ~CurlRuntime() { curl_global_cleanup(); }
    CurlRuntime(const CurlRuntime&)=delete;
    CurlRuntime& operator=(const CurlRuntime&)=delete;
};
}
Transport curl_transport(CurlOptions options) {
    auto runtime=std::make_shared<CurlRuntime>(std::move(options));
    return [runtime=std::move(runtime)](const HttpRequest& request,ResponseWriter writer) {
        const auto code=detail::TransportAccess::run(request,writer,ssk_curl_transport,&runtime->config);
        if (code!=SSK_OK) throw Error(static_cast<Code>(code));
    };
}
}
