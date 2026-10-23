#include <searchsdk/searchsdk.hpp>
#include <searchsdk/native.hpp>
#ifdef SEARCHSDK_EXAMPLE_HAS_CURL
#include <searchsdk/curl.hpp>
#endif
#include <iostream>
#include <type_traits>

int main() {
    using namespace searchsdk;
    // Deterministic injected transport: this example makes no network requests.
    Config config;config.provider="exa";
    config.transport=[](const HttpRequest& request,ResponseWriter writer) {
        if(request.check()!=Code::ok) throw Error(request.check());
        const auto body=Json::parse(std::string(request.body.begin(),request.body.end()));
        if(body.at("query").as_string()!="synthetic consumer") throw Error(Code::invalid_request);
        writer.status(200);
        writer.header("Content-Type","application/json");
        writer.write(R"({"requestId":"synthetic-consumer","results":[{"title":"Example","url":"https://example.org/reference","author":null}],"futureField":{"preserved":true}})");
    };
    CallOptions options;options.credential="synthetic-key";
    native::ExaSearchBody body;body.query="synthetic consumer";body.numResults=std::int64_t{1};
    native::ExaSearchInput input;input.body=std::move(body);
    native::Exa client(std::move(config));
    auto response=client.search(input,options);
    static_assert(std::is_same_v<decltype(response.data),native::ExaSearchResponse>);
    if(response.data.results.size()!=1 || response.data.results[0].title!="Example" ||
       response.data.results[0].url!="https://example.org/reference" ||
       response.data.requestId!="synthetic-consumer" ||
       !response.data.extra_fields.at("futureField").at("preserved").as_bool()) return 1;
    // Child JSON remains owned after its parent response leaves scope.
    auto child=response.data.extra_fields.at("futureField");
    auto copy=client.client();auto moved=std::move(copy);
    if(moved.provider()!="exa" || !child.at("preserved").as_bool()) return 2;
#ifdef SEARCHSDK_EXAMPLE_HAS_CURL
    auto transport=curl_transport(); // Owns libcurl initialization; no dispatch.
    if(!transport) return 3;
#endif
    std::cout<<"Installed C++ consumer passed (typed Exa request and response).\n";
}
