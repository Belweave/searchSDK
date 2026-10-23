#include <searchsdk/searchsdk.hpp>
#include <searchsdk/native.hpp>
#include "named-operations.hpp"
#include <algorithm>
#include <atomic>
#include <fstream>
#include <iostream>
#include <limits>
#include <cctype>
#include <map>
#include <set>
#include <sstream>
#include <thread>
#include <type_traits>

using namespace searchsdk;
using namespace std::chrono_literals;
namespace {
std::size_t checks=0;
void expect(bool value,const std::string& label) { ++checks; if (!value) throw std::runtime_error(label); }
template<class F> Error fails(Code expected,F&& action) {
    try { action(); } catch (const Error& error) { expect(error.code()==expected,"wrong error: "+std::string(error.what())); return error; }
    throw std::runtime_error("expected sanitized SDK error");
}
Json fixture(const std::string& name) {
    std::ifstream file(std::string(SEARCHSDK_FIXTURES)+"/"+name);
    expect(file.good(),"fixture readable: "+name); std::ostringstream text; text<<file.rdbuf(); return Json::parse(text.str());
}
bool equal(const Json& a,const Json& b) {
    if (a.kind()!=b.kind()) return false;
    if (a.kind()==Json::Kind::object) {
        if (a.size()!=b.size()) return false;
        for (std::size_t i=0;i<a.size();++i) { auto value=b.find(a.key(i)); if (!value || !equal(a.at(i),*value)) return false; }
        return true;
    }
    if (a.kind()==Json::Kind::array) {
        if (a.size()!=b.size()) return false;
        for (std::size_t i=0;i<a.size();++i) if (!equal(a.at(i),b.at(i))) return false;
        return true;
    }
    if (a.kind()==Json::Kind::number) return a.as_number()==b.as_number();
    return a.dump()==b.dump();
}
std::string header(const HttpRequest& request,std::string name) {
    for (const auto& field:request.headers) { auto key=field.first; std::transform(key.begin(),key.end(),key.begin(),[](unsigned char c){return static_cast<char>(std::tolower(c));}); if (key==name) return field.second; }
    return {};
}
std::string body(const HttpRequest& request) { return {request.body.begin(),request.body.end()}; }
std::string decode_uri(std::string_view encoded) {
    std::string out;
    for (std::size_t i=0;i<encoded.size();++i) {
        if (encoded[i]=='+') out+=' ';
        else if (encoded[i]=='%' && i+2<encoded.size()) { out+=static_cast<char>(std::stoi(std::string(encoded.substr(i+1,2)),nullptr,16)); i+=2; }
        else out+=encoded[i];
    }
    return out;
}
Json form(std::string_view encoded) {
    std::vector<std::pair<std::string,Json>> fields;
    while (!encoded.empty()) {
        const auto end=encoded.find('&'); auto part=encoded.substr(0,end); const auto equals=part.find('=');
        fields.emplace_back(decode_uri(part.substr(0,equals)),Json::string(equals==std::string_view::npos?"":decode_uri(part.substr(equals+1))));
        if (end==std::string_view::npos) break;
        encoded.remove_prefix(end+1);
    }
    return Json::object(fields);
}
Config gateway(Transport transport) { Config config; config.gateway_url="https://gateway.example/search";config.transport=std::move(transport);return config; }
Config provider(std::string id,Transport transport) { Config config;config.provider=std::move(id);config.transport=std::move(transport);return config; }
Transport reply(Json data,int status=200) {
    return [text=data.dump(),status](const HttpRequest&,ResponseWriter writer) { writer.status(status);writer.header("Content-Type","application/json");writer.write(text); };
}
CallOptions credentials() { CallOptions options;options.credential="fixture-key";options.retrieved_at="2026-10-22T00:00:00.000Z";return options; }
void json_ownership() {
    static_assert(std::is_copy_constructible_v<Client> && std::is_move_constructible_v<Client>);
    Json child;
    { auto root=Json::parse("{\"child\":[\"a\\u0000b\",true,2.5,null]}");child=root.at("child"); auto copy=root; expect(equal(copy,root),"copy JSON"); }
    expect(child.at(0).as_string()==std::string("a\0b",3),"embedded NUL string lifetime");
    expect(child.at(1).as_bool() && child.at(2).as_number()==2.5 && child.at(3).is_null(),"typed JSON");
    Json moved=std::move(child);expect(child.is_null() && child.dump()=="null" && moved.size()==4,"moved-from JSON safe");
    child=std::move(moved); expect(moved.is_null() && child.size()==4,"move assignment");
    const auto& alias=child; child=alias; expect(child.size()==4,"self copy");
    expect(Json::string("\n\"\\").as_string()=="\n\"\\","string escaping");
    for (const auto& malformed : {"{\"a\":1,\"a\":2}","[NaN]","{\"a\\u0000b\":1}","\"\\ud800\"","[1,]"}) {
        try { Json::parse(malformed); throw std::runtime_error("accepted malformed JSON"); } catch (const Error&) { ++checks; }
    }
    fails(Code::invalid_response,[&]{child.at(8);});
    fails(Code::invalid_response,[&]{child.as_string();});
    fails(Code::invalid_request,[]{Json::number(std::numeric_limits<double>::infinity());});
    fails(Code::invalid_request,[]{Json::object({{std::string("x\0y",3),Json{}}});});
}
void shared_requests() {
    auto cases=fixture("request-cases.json");
    for (std::size_t i=0;i<cases.at("valid").size();++i) {
        auto item=cases.at("valid").at(i);expect(equal(Client::normalize(item.at("input")),item.at("normalized")),"request normalization: "+item.at("name").as_string());
    }
    for (std::size_t i=0;i<cases.at("invalid").size();++i) {
        auto item=cases.at("invalid").at(i);fails(Code::invalid_request,[&]{Client::normalize(item.at("input"));});
    }
}
void gateway_contract() {
    auto success=fixture("search-success.json");
    std::optional<HttpRequest> retained_request; std::optional<ResponseWriter> retained_writer;
    Client client(gateway([&](const HttpRequest& request,ResponseWriter writer) {
        expect(request.url=="https://gateway.example/search" && request.method=="POST","exact gateway URL");
        expect(header(request,"authorization")=="Bearer fixture-key","per-call token");
        expect(equal(Json::parse(body(request)),Json::parse("{\"query\":\"sample\",\"limit\":5}")),"normalized gateway body");
        expect(request.check()==Code::ok,"active transport check");retained_request=request;retained_writer=writer;
        writer.status(200);writer.header("X-SearchSDK-Protocol","1");writer.write(success.dump());
    }));
    auto copy=client;auto moved=std::move(copy);
    fails(Code::configuration,[&]{copy.search(SearchRequest{"sample"});});
    auto result=moved.search(SearchRequest{"sample"},credentials());
    expect(result.provider=="fixture" && result.results.size()==1 && !result.usage && result.attempts.size()==1,"typed response");
    expect(result.results[0].provenance.request_id=="fixture-001" && result.results[0].score==0.75,"typed provenance");
    expect(equal(result.json,success),"owned response JSON");
    expect(retained_request->check()==Code::aborted,"retained request invalidates safely");
    fails(Code::aborted,[&]{retained_writer->write("late");});
    fails(Code::aborted,[&]{retained_writer->status(200);});
    auto bad_protocol=Client(gateway([&](const HttpRequest&,ResponseWriter w){w.status(200);w.header("X-SearchSDK-Protocol","2");w.write(success.dump());}));
    fails(Code::invalid_response,[&]{bad_protocol.search(SearchRequest{"x"});});
    auto errors=fixture("search-errors.json");
    for (std::size_t i=0;i<errors.size();++i) {
        auto item=errors.at(i); const auto name=item.at("body").at("error").at("code").as_string();
        auto c=Client(gateway(reply(item.at("body"),static_cast<int>(item.at("httpStatus").as_number()))));
        try {c.search(SearchRequest{"x"});throw std::runtime_error("gateway error accepted");}
        catch (const Error& e) {expect(ssk_code_name(static_cast<ssk_code>(e.code()))==name,"gateway error code fixture");expect(e.attempts().size()==0,"owned error attempts");}
    }
    for (const auto& pair:std::vector<std::pair<int,Code>>{{401,Code::auth},{402,Code::auth},{403,Code::auth},{432,Code::auth},{433,Code::auth},{429,Code::rate_limit},{408,Code::unavailable},{503,Code::unavailable},{400,Code::provider_error}}) {
        Client c(gateway(reply(Json::object({}),pair.first)));fails(pair.second,[&]{c.search(SearchRequest{"x"});});
    }
    for (const auto& bad:{"{}","{\"provider\":\"fixture\"}","not-json"}) {
        Client c(gateway([&](const HttpRequest&,ResponseWriter w){w.status(200);w.write(bad);}));
        fails(Code::invalid_response,[&]{c.search(SearchRequest{"x"});});
    }
    std::vector<std::pair<std::string,Json>> mutations{
        {"results",Json::parse("[{\"url\":\"https://user:pass@example.com\",\"provenance\":{}}]")},
        {"usage",Json::parse("{\"unit\":\"usd\",\"value\":-1}")},
        {"warnings",Json::parse("[{\"code\":\"unknown\",\"provider\":\"x\"}]")},
        {"attempts",Json::parse("[{\"provider\":\"x\",\"outcome\":\"success\",\"durationMs\":-1,\"startedAt\":\"invalid\"}]")}
    };
    for (const auto& mutation:mutations) {
        std::vector<std::pair<std::string,Json>> fields;
        for (std::size_t i=0;i<success.size();++i) { auto key=success.key(i);fields.emplace_back(key,key==mutation.first?mutation.second:success.at(i)); }
        Client c(gateway(reply(Json::object(fields))));fails(Code::invalid_response,[&]{c.search(SearchRequest{"x"});});
    }
}
void provider_contract() {
    auto data=fixture("providers.json");auto cases=data.at("cases");std::set<std::string> seen;
    auto capabilities=Client::providers();expect(capabilities.size()==14,"14 normalized providers");
    for (std::size_t i=0;i<cases.size();++i) {
        auto item=cases.at(i);auto id=item.at("provider").as_string();seen.insert(id);std::size_t calls=0;
        std::cout<<"  "<<item.at("name").as_string()<<std::endl;
        auto config=provider(id,[&](const HttpRequest& request,ResponseWriter writer) {
            ++calls;auto expected=item.at("upstreamRequest"); auto query=request.url.find('?');
            expect(request.url.substr(0,query)==expected.at("url").as_string(),"provider URL: "+id);
            expect(request.method==expected.at("method").as_string(),"provider method: "+id);
            const auto headers=expected.at("headers");
            for (std::size_t k=0;k<headers.size();++k) expect(header(request,headers.key(k))==headers.at(k).as_string(),"provider header: "+id+" "+headers.key(k));
            if (auto expected_body=expected.find("body");expected_body && !expected_body->is_null()) {
                const auto parsed=header(request,"content-type")=="application/x-www-form-urlencoded"?form(body(request)):Json::parse(body(request));
                expect(equal(parsed,*expected_body),"provider body: "+item.at("name").as_string());
            } else expect(request.body.empty(),"provider empty request body");
            expect(equal(query==std::string::npos?Json::object({}):form(std::string_view(request.url).substr(query+1)),expected.at("query")),"provider query: "+id);
            writer.status(200);writer.write(item.at("upstreamResponse").dump());
        });
        if (id=="searxng") config.provider_options=Json::parse("{\"baseUrl\":\"https://searxng.example\"}");
        Client client(std::move(config));auto result=client.search(item.at("request"),credentials());auto expected=item.at("response");
        expect(calls==1 && result.provider==id,"one provider dispatch");
        for (const auto* field:{"results","usage","warnings"}) expect(equal(result.json.at(field),expected.at(field)),"provider output: "+id+" "+field);
        auto supported=std::find_if(capabilities.begin(),capabilities.end(),[&](const auto& p){return p.provider==id;});
        expect(supported!=capabilities.end(),"capabilities present");auto cap=item.at("capabilities");
        expect(supported->domain_filters==cap.at("domainFilters").as_bool(),"domain capability");
        expect(supported->max_include_domains==cap.at("maxIncludeDomains").as_number() && supported->max_exclude_domains==cap.at("maxExcludeDomains").as_number(),"domain capacities");
        if (auto max=cap.find("maxQueryLength")) expect(supported->max_query_utf16==max->as_number(),"query capability");
    }
    expect(seen.size()==14,"all normalized fixture providers");
}
void cancellation_limits_errors() {
    auto success=fixture("search-success.json");std::atomic<int> dispatches{0};
    auto config=gateway([&](const HttpRequest&,ResponseWriter w){++dispatches;w.status(200);w.write(success.dump());});Client client(config);
    Cancellation cancellation;auto second=cancellation;CallOptions opts;opts.cancellation=cancellation;second.cancel();
    expect(cancellation.cancelled(),"cancellation shared ownership");fails(Code::aborted,[&]{client.search(SearchRequest{"x"},opts);});expect(dispatches==0,"pre-cancel prevents dispatch");
    Client active(gateway([&](const HttpRequest& request,ResponseWriter w){opts.cancellation->cancel();expect(request.check()==Code::aborted,"in-call cancellation");w.status(200);w.write(success.dump());}));
    opts.cancellation=Cancellation{};fails(Code::aborted,[&]{active.search(SearchRequest{"x"},opts);});
    Client deadline(gateway([](const HttpRequest& request,ResponseWriter){while(request.check()==Code::ok) std::this_thread::sleep_for(1ms);}));
    opts.cancellation.reset();opts.timeout=3ms;fails(Code::timeout,[&]{deadline.search(SearchRequest{"x"},opts);});
    config.max_response_bytes=8;Client limited(config);fails(Code::invalid_response,[&]{limited.search(SearchRequest{"x"});});
    Client failing(gateway([](const HttpRequest&,ResponseWriter){throw std::runtime_error("fixture-secret sensitive upstream query");}));
    auto err=fails(Code::network,[&]{failing.search(SearchRequest{"private query"},credentials());});
    expect(std::string(err.what()).find("fixture-secret")==std::string::npos && err.attempts().dump().find("private query")==std::string::npos,"credential and query nondisclosure");
    auto credential=credentials();credential.credential=std::string("key\0injection",13);fails(Code::invalid_request,[&]{client.search(SearchRequest{"x"},credential);});
    for (const auto& url:{"http://example.com","https://user:pass@example.com","https://example.com/?q=x","https://example.com/#x"}) {
        auto invalid=config;invalid.gateway_url=url;fails(Code::configuration,[&]{Client c(invalid);});
    }
    auto bad=config;bad.timeout=0ms;fails(Code::configuration,[&]{Client c(bad);});
    bad=config;bad.max_response_bytes=0;fails(Code::configuration,[&]{Client c(bad);});
    bad=config;bad.transport={};fails(Code::configuration,[&]{Client c(bad);});
    Client retry_after(gateway([](const HttpRequest&,ResponseWriter w){w.status(429);w.header("Retry-After","2");w.write("{}");}));
    auto delay=fails(Code::rate_limit,[&]{retry_after.search(SearchRequest{"x"});});expect(delay.retry_after()==2000ms,"retry-after typed duration");
}
void fallback_batch() {
    auto success=fixture("search-success.json");std::atomic<int> active{0},maximum{0},calls{0};
    Client batch(gateway([&](const HttpRequest& request,ResponseWriter w) {
        const int count=++active;int old=maximum.load();while(count>old && !maximum.compare_exchange_weak(old,count)){}
        struct Guard {std::atomic<int>& active;~Guard(){--active;}} guard{active};++calls;
        std::this_thread::sleep_for(1ms);
        if (Json::parse(body(request)).at("query").as_string()=="bad") {w.status(401);w.write("{}");}
        else {w.status(200);w.write(success.dump());}
    }));
    auto items=batch.batch({SearchRequest{"a"},SearchRequest{"bad"},SearchRequest{"c"},SearchRequest{"d"}},2);
    expect(items.size()==4 && std::holds_alternative<SearchResponse>(items[0]) && std::get<Error>(items[1]).code()==Code::auth && std::holds_alternative<SearchResponse>(items[2]),"ordered partial batch outcomes");
    expect(calls==4 && maximum<=2 && active==0,"bounded joined batch");
    expect(batch.batch({},2).empty(),"empty batch");fails(Code::configuration,[&]{batch.batch({},65);});
    auto malformed=batch.batch({SearchRequest{"valid"},SearchRequest{std::string(1,static_cast<char>(0x80))},SearchRequest{"valid2"}},2);
    expect(std::holds_alternative<SearchResponse>(malformed[0]) && std::get<Error>(malformed[1]).code()==Code::invalid_request && std::holds_alternative<SearchResponse>(malformed[2]),"malformed encoding preserves valid batch siblings");
    CallOptions cancelled;cancelled.cancellation=Cancellation{};cancelled.cancellation->cancel();const auto count=calls.load();
    auto cancelled_items=batch.batch({SearchRequest{"a"},SearchRequest{"b"}},2,cancelled);
    expect(cancelled_items.size()==2 && std::get<Error>(cancelled_items[0]).code()==Code::aborted && std::get<Error>(cancelled_items[1]).code()==Code::aborted && calls==count,"pre-cancelled batch has ordered outcomes and no I/O");
    expect(batch.batch({},2,cancelled).empty(),"empty cancelled batch");
    Client transient(provider("exa",reply(Json::object({}),503)));
    Client available(provider("tavily",reply(Json::parse("{\"results\":[]}"))));
    auto response=Client::fallback({transient,available},SearchRequest{"x"},{credentials(),credentials()});
    expect(response.provider=="tavily" && response.attempts.size()==2 && response.warnings.size()==1 && response.warnings[0].code=="fallback_used","explicit fallback provenance");
    Client auth(provider("exa",reply(Json::object({}),401)));fails(Code::auth,[&]{Client::fallback({auth,available},SearchRequest{"x"},{credentials(),credentials()});});
    fails(Code::configuration,[&]{Client::fallback({},SearchRequest{"x"},{});});
    std::atomic<int> no_io{0};Client restricted(provider("brave",[&](const HttpRequest&,ResponseWriter){++no_io;}));
    SearchRequest filters{"x"};filters.include_domains=std::vector<std::string>{"example.com"};
    fails(Code::unsupported_option,[&]{Client::fallback({transient,restricted},filters,{credentials(),credentials()});});expect(no_io==0,"chain capability validation before dispatch");
}

NativeInput native_input(const Operation& operation) {
    auto meta=operation.metadata;
    std::map<std::string,std::vector<std::pair<std::string,Json>>> sections;
    auto parameters=meta.at("parameters");
    for (std::size_t k=0;k<parameters.size();++k) {
        auto param=parameters.at(k);
        auto required=param.find("required");if (!required || !required->as_bool()) continue;
        const auto where=param.at("in").as_string();const auto name=param.at("name").as_string();
        auto type=param.find("type");Json value=Json::string(name=="domain"?"example.com":"fixture");
        if (auto values=param.find("enum");values && values->kind()==Json::Kind::array && values->size()) value=values->at(0);
        else if (type && type->kind()==Json::Kind::string) {
            if (type->as_string()=="integer" || type->as_string()=="number") value=Json::number(1);
            if (type->as_string()=="boolean") value=Json::boolean(true);
            if (type->as_string()=="array") value=Json::array({Json::string("fixture")});
        }
        sections[where=="header"?"headers":where].emplace_back(name,value);
    }
    std::vector<std::pair<std::string,Json>> fields;
    NativeInput input;
    if (meta.at("bodyMode").as_string()=="raw") {
        const std::string multipart="--fixture\r\nContent-Disposition: form-data; name=\"image\"; filename=\"fixture.png\"\r\nContent-Type: image/png\r\n\r\nfixture\r\n--fixture--\r\n";
        input.raw_body=std::vector<std::uint8_t>(multipart.begin(),multipart.end());
        sections["headers"].emplace_back("Content-Type",Json::string("multipart/form-data; boundary=fixture"));
    } else if (meta.at("bodyMode").as_string()=="json") {
        fields.emplace_back("body",operation.provider=="exa" && operation.name=="searchStream"?Json::parse("{\"outputSchema\":{}}"):Json::object({}));
    }
    if (operation.provider=="serpapi" && (operation.name=="google" || operation.name=="extract" || operation.name=="extractMarkdown"))
        sections["query"].emplace_back(operation.name=="google"?"q":"url",Json::string("https://example.com"));
    for (const auto& entry:sections) fields.emplace_back(entry.first,Json::object(entry.second));
    input.parameters=Json::object(fields);return input;
}
void all_named_operations() {
    auto operations=Client::operations();expect(operations.size()==493 && native::operation_info.size()==493,"complete native inventory");
    std::size_t tested=0;std::set<std::string> providers;
    for (const auto& named:named_operations) {
        auto op=std::find_if(operations.begin(),operations.end(),[&](const auto& item){return item.provider==named.provider && item.name==named.name;});
        expect(op!=operations.end(),"named wrapper descriptor exists");providers.insert(named.provider);
        const auto info=std::find_if(native::operation_info.begin(),native::operation_info.end(),[&](const auto& item){return item.provider==op->provider && item.name==op->name;});
        expect(info!=native::operation_info.end() && info->method==op->method && info->path==op->path && info->response_mode==op->response_mode && info->source==op->source,"retained source metadata matches C");
        int dispatches=0;std::string stage="before dispatch";
        Client client(provider(named.provider,[&](const HttpRequest& request,ResponseWriter w) {
            stage="transport entered";
            ++dispatches;expect(request.method==op->method,"native method");
            expect(request.url.find(op->base_url)==0,"native fixed host");
            stage="status";w.status(200);stage="header";w.header("X-Fixture","owned");stage="body";
            if (request.method=="HEAD" || op->response_mode=="empty" || op->name=="revokeAuthToken") return;
            if (op->response_mode=="json") w.write("{}");
            else if (op->response_mode=="sse") w.write("event: result\nid: 1\nretry: 50\ndata: {\"ok\":true}\n\n");
            else if (op->response_mode=="bytes" || op->response_mode=="raw") w.write(std::string_view("a\0b",3));
            else w.write("native fixture");
            stage="transport complete";
        }));
        try {
            auto input=native_input(*op);stage="input built";
            auto response=named.call(client,input,credentials());++tested;
            if (std::string(named.name)=="logoUrl") {expect(dispatches==0 && response.text().find("https://")==0,"local logo URL");continue;}
            expect(dispatches==1 && response.status()==200 && response.header("x-fixture")=="owned","named operation response ownership");
            if (op->response_mode=="json" && op->method!="HEAD") expect(response.json()->kind()==Json::Kind::object,"native JSON response");
            if (op->response_mode=="sse") {
                auto events=response.events();expect(events.size()==1 && events[0].event=="result" && events[0].id=="1" && events[0].retry==50ms,"owned SSE event");
                bool called=false;response.for_each_sse([&](SseEvent){called=true;return false;});expect(called,"SSE stop");
            }
            auto copy=response;auto moved=std::move(copy);expect(moved.status()==200 && copy.status()==0,"native copy/move");
        } catch (const Error& error) {throw std::runtime_error(std::string("native ")+named.provider+"."+named.name+" ("+stage+"): "+error.what());}
    }
    expect(tested==493 && providers.size()==13,"all 493 named methods exercised");
    Client c(provider("exa",reply(Json::object({}))));
    fails(Code::configuration,[&]{native::Tavily mismatch(c);});
    fails(Code::unsupported_option,[&]{c.native("notAnOperation");});
    NativeInput input;input.parameters=Json::parse("{\"body\":{}}");input.raw_body=std::vector<std::uint8_t>{1};
    fails(Code::unsupported_option,[&]{native::Exa(c).search(input,credentials());});
}
void typed_wire_contract() {
    native::ExaSearchBody body;
    body.query="synthetic typed search";body.numResults=std::int64_t{3};body.includeDomains=std::vector<std::string>{"example.org"};
    body.startPublishedDate=wire::Nullable<std::string>{nullptr};
    body.extra_fields.emplace("futureOption",Json::boolean(true));
    auto encoded=body.json();
    expect(encoded.at("query").as_string()==body.query && encoded.at("numResults").as_number()==3,"typed Exa request fields");
    expect(encoded.at("startPublishedDate").is_null() && !encoded.find("endPublishedDate"),"nullable distinguishes missing and null");
    auto roundtrip=native::ExaSearchBody::from_json(encoded);expect(equal(roundtrip.json(),encoded),"typed request roundtrip with unknown fields");
    roundtrip.extra_fields.emplace("query",Json::string("collision"));fails(Code::invalid_request,[&]{roundtrip.json();});
    const auto response=Json::parse(R"({"requestId":"fixture-typed","results":[{"title":"Typed result","url":"https://example.org/reference","author":null,"futureResult":{"retained":true}}],"futureEnvelope":[1,2]})");
    int calls=0;
    native::Exa exa(provider("exa",[&](const HttpRequest& request,ResponseWriter writer) {
        ++calls;auto json=Json::parse(::body(request));expect(json.at("query").as_string()=="synthetic typed search" && !json.at("stream").as_bool(),"typed wrapper wire body and stream mode");
        writer.status(200);writer.header("X-Request-Id","owned-typed");writer.write(response.dump());
    }));
    native::ExaSearchInput input;input.body=body;
    auto result=exa.search(input,credentials());
    expect(calls==1 && result.data.results.size()==1 && result.data.results[0].title=="Typed result" && result.data.results[0].url=="https://example.org/reference","typed Exa response fields");
    expect(result.data.requestId=="fixture-typed" && result.data.results[0].author && !result.data.results[0].author->value,"nullable response field");
    expect(result.data.extra_fields.count("futureEnvelope")==1 && result.data.results[0].extra_fields.count("futureResult")==1,"unknown fields preserved recursively");
    expect(equal(result.data.json(),response) && result.raw.header("x-request-id")=="owned-typed","typed native roundtrip and raw response");
    auto owned=result.data.results[0];result.data.results.clear();expect(owned.extra_fields.at("futureResult").at("retained").as_bool(),"typed result copy lifetime");
    fails(Code::invalid_response,[]{native::ExaSearchResponse::from_json(Json::parse("{}"));});
    fails(Code::invalid_response,[]{native::ExaSearchResponse::from_json(Json::parse(R"({"results":[{"url":4,"title":"x"}]})"));});
    fails(Code::invalid_response,[]{native::ExaSearchResponse::from_json(Json::parse(R"({"results":[],"requestId":null})"));});
    fails(Code::invalid_response,[]{wire::decode<std::int64_t>(Json::number(1.5));});
    fails(Code::invalid_response,[]{wire::decode<std::int64_t>(Json::number(9007199254740992.0));});
    fails(Code::invalid_request,[]{wire::encode<std::int64_t>(INT64_MAX);});
    native::ExaGetWebsetInput path;path.path.id="a/b";
    expect(path.native().parameters.at("path").at("id").as_string()=="a/b","natural typed required path fields");
    Client generic(provider("exa",[&](const HttpRequest& request,ResponseWriter w){expect(request.url.find("a%2Fb")!=std::string::npos,"path segment encoding");w.status(200);w.write("{}");}));
    generic.native("getWebset",path.native(),credentials());
    Client raw(provider("exa",reply(Json::object({}))));
    expect(raw.native("search",input.native(),credentials()).json()->kind()==Json::Kind::object,"generic JSON escape hatch");
    fails(Code::invalid_response,[&]{native::Exa(raw).search(input,credentials());});
    auto call=credentials();call.timeout=2ms;
    fails(Code::timeout,[&]{raw.native_decoded("search",[&]{std::this_thread::sleep_for(3ms);return input.native();},call,[](NativeResponse r){return r;});});
    call.timeout=3ms;
    fails(Code::timeout,[&]{raw.native_decoded("search",[&]{return input.native();},call,[](NativeResponse r){std::this_thread::sleep_for(4ms);return r;});});
    std::vector<SseEvent> retained;
    Client stream(provider("exa",[](const HttpRequest&,ResponseWriter w){w.status(200);w.write("id: owned\nevent: delta\ndata: first\ndata: second\n\ndata: third\n\n");}));
    NativeInput sse;sse.parameters=Json::parse("{\"body\":{}}");
    {auto response_stream=stream.native("answerStream",sse,credentials());response_stream.for_each_sse([&](SseEvent event){retained.push_back(std::move(event));return true;});
        bool caught=false;try{response_stream.for_each_sse([](SseEvent)->bool{throw std::runtime_error("caller callback");});}catch(const std::runtime_error& e){caught=std::string(e.what())=="caller callback";}expect(caught,"SSE exception never crosses C ABI");}
    expect(retained.size()==2 && retained[0].data=="first\nsecond" && retained[0].id=="owned","SSE event owns multiline data after response destruction");
}
void incremental_stream() {
    std::optional<HttpRequest> snapshot;std::optional<ResponseWriter> snapshot_writer;
    std::vector<SseEvent> events;bool callback_before_next_write=false;
    Client client(provider("exa",[&](const HttpRequest& request,ResponseWriter writer) {
        snapshot=request;snapshot_writer=writer;writer.status(200);writer.header("Content-Type","text/event-stream");
        for (const auto chunk:{"event: del","ta\r\nid: a\r\ndata: one\r\n\r\n","data: two\n\n"}) {
            writer.write(chunk);
            if(!events.empty())callback_before_next_write=true;
        }
    }));
    native::ExaAnswerStreamInput input;input.body.query="fixture stream";
    auto response=native::Exa(client).answerStream(input,[&](SseEvent event) {
        expect(snapshot->check()==Code::ok,"incremental callback can check transport control without deadlock");
        fails(Code::invalid_request,[&]{snapshot_writer->write("reentrant");});
        events.push_back(std::move(event));return true;
    },credentials());
    expect(callback_before_next_write && events.size()==2 && events[0].event=="delta" && events[0].data=="one" && events[1].data=="two","incremental split SSE events");
    expect(response.bytes().size()>0 && snapshot->check()==Code::aborted,"bounded stream raw response retained and handle closed");
    fails(Code::aborted,[&]{native::Exa(client).answerStream(input,[](SseEvent){return false;},credentials());});
    bool rethrown=false;
    try {native::Exa(client).answerStream(input,[](SseEvent)->bool{throw std::runtime_error("caller stream exception");},credentials());}
    catch(const std::runtime_error& error){rethrown=std::string(error.what())=="caller stream exception";}
    expect(rethrown,"stream exception returned across C boundary safely");
    NativeInput generic;generic.parameters=Json::parse("{\"body\":{}}");
    fails(Code::unsupported_option,[&]{client.stream("search",generic,[](SseEvent){return true;},credentials());});
    auto call=credentials();call.cancellation=Cancellation{};
    fails(Code::aborted,[&]{native::Exa(client).answerStream(input,[&](SseEvent){call.cancellation->cancel();return true;},call);});
}
}
int main() {
    try {
        for (const auto& test:std::vector<std::pair<const char*,void(*)()>>{
            {"json_ownership",json_ownership},{"shared_requests",shared_requests},{"gateway_contract",gateway_contract},
            {"provider_contract",provider_contract},{"cancellation_limits_errors",cancellation_limits_errors},
            {"fallback_batch",fallback_batch},{"all_named_operations",all_named_operations},{"typed_wire_contract",typed_wire_contract},
            {"incremental_stream",incremental_stream}}) {
            std::cout<<"Running "<<test.first<<std::endl;test.second();
        }
        std::cout<<"C++ deterministic checks passed: "<<checks<<" (24 provider fixtures, 493 named operations)\n";return 0;
    } catch (const std::exception& error) {std::cerr<<"C++ test failure after "<<checks<<" checks: "<<error.what()<<'\n';return 1;}
}
