#include <searchsdk/searchsdk.hpp>
#include <searchsdk/curl.hpp>
#include <iostream>
#include <thread>
using namespace searchsdk;
using namespace std::chrono_literals;
namespace {
void run(const std::string& base,const std::string& path,const std::optional<std::string>& ca,Code want,
         std::chrono::milliseconds timeout=1000ms,std::size_t cap=SSK_DEFAULT_MAX_BYTES,bool cancel=false) {
    Config config;config.gateway_url=base+path;config.transport=curl_transport(CurlOptions{ca});
    config.timeout=timeout;config.max_response_bytes=cap;Client client(std::move(config));
    CallOptions call;call.credential="synthetic-loopback-token";
    Cancellation cancellation;if(cancel)call.cancellation=cancellation;
    std::thread controller;
    if(cancel)controller=std::thread([cancellation]{std::this_thread::sleep_for(15ms);cancellation.cancel();});
    struct Join {std::thread& thread;~Join(){if(thread.joinable())thread.join();}} joined{controller};
    Code code=Code::ok;
    std::cout<<"Loopback "<<path<<std::endl;
    try {
        auto result=client.search(SearchRequest{"loopback & + ü",2},call);
        if(result.results.size()!=1 || result.provider!="fixture")throw std::runtime_error("loopback response");
    } catch(const Error& error) {
        code=error.code();if(std::string(error.what()).find("synthetic-loopback-token")!=std::string::npos)throw std::runtime_error("credential disclosed");
    }
    if(code!=want)throw std::runtime_error(path+": actual "+ssk_code_name(static_cast<ssk_code>(code))+", expected "+ssk_code_name(static_cast<ssk_code>(want)));
}
}
int main(int argc,char** argv) {
    try {
        if(argc!=3)return 2;
        const std::string base=argv[1],ca=argv[2];
        run(base,"/ok",ca,Code::ok);run(base,"/gzip",ca,Code::ok);
        run(base,"/redirect",ca,Code::provider_error);run(base,"/bad",ca,Code::invalid_response);
        run(base,"/error",ca,Code::rate_limit);run(base,"/cap",ca,Code::invalid_response,1000ms,128);
        run(base,"/slow",ca,Code::timeout,20ms);run(base,"/slow",ca,Code::aborted,1000ms,SSK_DEFAULT_MAX_BYTES,true);
        run(base,"/ok",{},Code::network);
        try {curl_transport(CurlOptions{std::string{}});return 3;}catch(const Error& e){if(e.code()!=Code::configuration)return 4;}
        std::cout<<"C++ libcurl HTTPS loopback passed: TLS, encoding, gzip, redirect isolation, caps, errors, deadline, cancellation.\n";
        return 0;
    }catch(const std::exception& e){std::cerr<<e.what()<<'\n';return 1;}
}
