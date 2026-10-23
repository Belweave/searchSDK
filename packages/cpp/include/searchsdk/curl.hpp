#pragma once
#include <searchsdk/searchsdk.hpp>
namespace searchsdk {
// Optional searchsdk::cpp_curl target. Owns global libcurl initialization until
// the final transport/client copy is destroyed, after its synchronous calls return.
struct CurlOptions { std::optional<std::string> ca_bundle; };
Transport curl_transport(CurlOptions = {});
}
